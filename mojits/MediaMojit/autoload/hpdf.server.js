/*
 * Copyright (c) 2014 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 */

/**
 *  Generate PDF documents using emscripten version of libharu
 */

/*global YUI */
/*eslint prefer-template: 0 */



YUI.add( 'dcmedia-hpdf', function( Y, NAME ) {

        var
            hpdfErrorState = false,

        //  temporary PDFs expire after this much time (milliseconds)
            TEMP_EXPIRY = (60 * 60 * 1000),

        //  scale resolution of images, in pixels per postscript point
            IMAGE_RESOLUTION = 2,
            MM_TO_POINTS = 2.83464567,

        //  node modules
            async = require( 'async' ),
            fs = require( 'fs' );

        /**
         *  For unit testing mostly, return true if this object initialized right
         *  @returns    {Boolean}   Which isn't wildly informative.
         */

        function getPageSize( size ){
            let s;
            switch (size.toLowerCase()) {
                case 'letter':
                    s = 0;
                    break;
                case 'legal':
                    s = 1;
                    break;
                case 'a3':
                    s = 2;
                    break;
                case 'a4':
                    s = 3;
                    break;
                case 'a5':
                case 'a6':  //will be corrected wit setting with and height for page
                    s = 4;
                    break;
                // case 'a6': there no such size
                //     s = 5;
                //     break;
                case 'b4':
                    s = 5;
                    break;
                case 'b5':
                    s = 6;
                    break;
                case 'executive':
                    s = 7;
                    break;
                case 'us4x6':
                    s = 8;
                    break;
                case 'us4x8':
                    s = 9;
                    break;
                case 'us5x7':
                    s = 10;
                    break;
                // in addon exists also; 12: HPDF_PAGE_SIZE_COMM10; 13: HPDF_PAGE_SIZE_EOF;
            }
            return s;
        }

        function getPageOrientation( orientation ){
            let o;
            switch (orientation.toLowerCase()) {
                case 'landscape':
                case 'l':
                    o = 1;
                    break;
                default:
                    o = 0;
                    break;
            }
            return o;
        }

        function initialized() {
            return Y.doccirrus.media.initialized();
        }

        /**
         *  Stub for function to normalize uploaded PDF documents
         *
         *  @param document
         *  @param callback
         */

        function normalize(document, callback) {
            //  TODO: strip out any scripting, embeds or remote assets from uploaded PDFs, these format features are a
            //  security risk and not used by documents we generate or serve.

            if (!document.tempFile) {
                callback(null, document);
                return;
            }

            Y.doccirrus.media.images.identify(document.tempFile, onReadMeta);

            function onReadMeta(err, metadata) {
                if (err) {
                    callback('Could not read document metadata: ' + err);
                    return;
                }

                document.widthPx = metadata.widthPx;
                document.heightPx = metadata.heightPx;

                callback(null, document);
            }

        }
    
        /**
         *  Used to convert UTF-8 strings to be used in PDF documents
         *
         *  @param txt
         *  @returns {string}
         */

        function utf8ToPdfEncoding(txt, utf8 = false) {
            //  strip any &nbsp; escapes
            txt = txt.replace(new RegExp('&nbsp;', 'g'), ' ');

            if( utf8 ){
                txt = txt.replace(new RegExp('ₜₘ', 'g'), 'tm');

                return txt;
            }

            switch( Y.doccirrus.media.fonts.PDF_ENCODING ) {
                case 'CP1257':
                    //  The CP1257 character set keeps the euro symbol at codepoint 128
                    txt = txt.replace(new RegExp('€', 'g'), String.fromCharCode(128));
                    txt = txt.replace(new RegExp('™', 'g'), String.fromCharCode(153));
                    txt = txt.replace(new RegExp('ₜₘ', 'g'), String.fromCharCode(153));

                    break;

                case 'ISO8859-15':
                    txt = txt.replace( new RegExp('€', 'g'), String.fromCharCode(164) );

                    //  fancy quotes from MS Word, etc
                    txt = txt.replace( new RegExp('“', 'g'), '"' );
                    txt = txt.replace( new RegExp('”', 'g'), '"' );

                    txt = txt.replace( new RegExp('„', 'g'), '"' );
                    txt = txt.replace( new RegExp('“', 'g'), '"' );

                    txt = txt.replace( new RegExp('‚', 'g'), '\'' );
                    txt = txt.replace( new RegExp('‘', 'g'), '\'' );

                    txt = txt.replace( new RegExp('‘', 'g'), '\'' );
                    txt = txt.replace( new RegExp('’', 'g'), '\'' );

                    txt = txt.replace( new RegExp('´', 'g'), '\'' );
                    txt = txt.replace( new RegExp('`', 'g'), '\'' );

                    //  long dash not supported in Latin9
                    txt = txt.replace( new RegExp('—', 'g'), '-' );

                    // 169 - copyright symbol
                    // 164 - pound sterling symbol
                    // 174 - rights reserved symbol

                    break;
            }


            //  further charset corrections may be added here in future

            return txt;
        }

        /**
         *  Server-side compilation of PDF documents given client-side state
         *
         *  This method works on a representation of an instance of a form template as rendered on the client,
         *  where fields have been mapped to form elements, positions adjusted for overflow and then broken into
         *  fixed size pages.
         *
         *  Some libharu quirks: the positioning is from the bottom left of the document, in PostScript points.
         *  Font sizes are specified in typographic points (1/72 of an inch) and not PostScript points.
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  documentState   {Object}    Representation of client state as drawn on canvas
         *  @param  onProgress      {Function}  Of the form fn( { percent, label } )
         *  @param  callback        {Function}  Of the form fn(err, tempFileName)
         */

        function compileFromForm(user, documentState, onProgress, callback) {
            Y.log('Compiling PDF from form', 'debug', NAME);

            var
            //  move within this context to force creation of new virtual heap each time
                tempDir = Y.doccirrus.media.getTempDir(),

            //  cleanUpCache = [],          //  image transforms already generated on disk (per-instance)
                tempFilesToCleanUp = [],    //  charts, barcodes, other images generated on the fly

                stackCounter = 0,           //  count number of elements rendered in current stack
                stackMaxOps = 100,          //  limit to prevent stack exhaustion

                tempPdfFile,                //  location when serialized to disk
                mediaObj,                   //  metadata for new PDF file
                finalValue = null,          //  callback value

            //  sub-elements (content boxes) to be added to the page are queued and processed on order, asynchrounsly
            //  this is to allow for async loading of image from the cache or database

                toAdd = [],
                pages = [],
                subElem,
                utf8 = documentState && documentState.utf8 && 1 || 0;

            //  Re-initialize HPDF.js if this is the first PDF, or the previous PDF left HPDF.js in an error state
            const hpdf = require(`${__dirname}/../../../node_modules/hpdf/build/Release/hpdf`);

            const pdfHandle = hpdf.hpdf();

            hpdf.customFonts = {};
            hpdf.reuseImages = {};

            Y.dcforms.runInSeries(
                [
                    enqueueAllElements,
                    loadTTFFonts,
                    renderAllElements,
                    renderCopyNotice,
                    savePdfToDisk,
                    addAttachedPdfs,
                    saveToDb,
                    saveToZip,
                    saveToCache,
                    cleanUp
                ],
                onAllDone
            );

            //  1. Create pages and enqueue all sub-elements to be rendered
            function enqueueAllElements( itcb ) {
                var i, j;

                for (i = 0; i < documentState.pages.length; i++) {

                    let page = hpdf.addPage( pdfHandle );

                    documentState.pages[i].pageRef = page;

                    if ( '' !== documentState.paper.name ) {
                        hpdf.page_SetSize( page, getPageSize(documentState.paper.name), getPageOrientation(documentState.paper.orientation));
                    }

                    hpdf.page_SetHeight( page, documentState.paper.height * MM_TO_POINTS);    //  one mm = 2.83464567 points
                    hpdf.page_SetWidth( page, documentState.paper.width * MM_TO_POINTS);      //  one mm = 2.83464567 points

                    //pages[i].svgFontAdjust = documentState.pages[i].svgFontAdjust;

                    Y.log('Added page to PDF ' + documentState.paper.width + 'x' + documentState.paper.height + ': ' + i + ' / ' + JSON.stringify( pages[i] ), 'debug', NAME);

                    if (documentState.pages[i].pdfRotate && parseInt(documentState.pages[i].pdfRotate, 10) !== 0) {
                        hpdf.page_SetRotate( page, parseInt(documentState.pages[i].pdfRotate, 10));
                    }

                    for (j = 0; j < documentState.pages[i].subElements.length; j++) {
                        subElem = documentState.pages[i].subElements[j];
                        //Y.log('Adding element to PDF page ' + i + ': ' + j + ': ' + subElem.text + subElem.imgId, 'debug', NAME);
                        subElem.pageIdx = i;
                        toAdd.push(subElem);
                    }

                }
                itcb( null );
            }

            //  2. Load any TTF fonts required by this form
            function loadTTFFonts( itcb ) {

                var i, j, toLoad = [];


                for (i = 0; i < documentState.pages.length; i++) {
                    for (j = 0; j < documentState.pages[i].subElements.length; j++) {
                        subElem = documentState.pages[i].subElements[j];

                        if ( subElem.font && !Y.doccirrus.media.fonts.isType2( subElem.font ) ) {
                            if ( -1 === toLoad.indexOf( subElem.font ) ) {
                                toLoad.push( subElem.font );
                            }
                        }

                    }

                }

                if ( 0 === toLoad.length ) {
                    Y.log( 'This form does not require any custom fonts.', 'debug', NAME );
                    return itcb( null );
                }

                Y.log( 'Loading ' + toLoad.length + ' custom fonts', 'debug', NAME );
                async.eachSeries( toLoad, loadSingleFont, itcb );
            }

            //  2.5 Load / embed a TTF font into the PDF
            function loadSingleFont( fontName, itcb ) {
                Y.doccirrus.media.fonts.embedPdfFont( hpdf, pdfHandle, fontName, itcb );
            }

            //  3. Add all text spans, images, etc from the form and render them into HPDF.js pages
            //  Also updates progress on the client, a little hacky, would like a better way to do this
            function renderAllElements( itcb ) {

                function forEachElement( subElem, _cb ) {
                    var progressPercent;

                    //console.log( '(****) rendering single form element: ', subElem.text, ( subElem.img ? 'IMAGE' : '' ), ( subElem.barcode ? 'BARCODE' : '' ) );

                    function onElementRendered( err ) {
                        if ( err ) {
                            Y.log( 'Error while rendering element: ' + JSON.stringify( err ), 'warn', NAME );
                            //  continue / best effort
                        }

                        if ( subElem.toCleanUp ) {
                            //  subelement may have a temporary image to be cleaned up (barcode, chart, etc)
                            tempFilesToCleanUp.push( subElem.toCleanUp.replace( tempDir, '' ) );
                        }

                        _cb( null );
                    }

                    //  Websocket event to update progress bar on client, only fire every 10%
                    progressCount = progressCount + 1;
                    progressPercent = ( 100 * (progressCount / progressTotal) );
                    if ( progressPercent > progressStep ) {
                        progressStep = progressStep + 10;
                        Y.log('HPDF render progress: ' + progressStep + ' overall: ' + progressCount + ' / ' + progressTotal, 'debug', NAME );
                        onProgress( { percent: progressStep, label: progressCount + ' / ' + progressTotal } );
                    }

                    //  stack protection
                    if ( stackCounter > stackMaxOps ) {
                        Y.log( 'Rendered ' + stackMaxOps + ' elements, deferring to new stack to prevent exhaustion', 'deubg', NAME );
                        process.nextTick( function deferToNewStack() { renderSingleElement( user, subElem, hpdf, pdfHandle, documentState.pages, utf8, _cb ); } );
                        stackCounter = 0;
                        return;
                    }

                    //Y.log( 'Rendering ' + stackCounter + ' of ' + stackMaxOps + ' in batch of' + toAdd.length + ' elements', 'debug', NAME );
                    stackCounter = stackCounter + 1;

                    try {
                        renderSingleElement(user, subElem, hpdf, pdfHandle, documentState.pages, utf8, Y.dcforms.checkSingleCB( onElementRendered, 'onElementRendered renderSingleElement'));
                    } catch ( elemErr ) {
                        Y.log( `Error adding single element: ${JSON.stringify( subElem )} : ${elemErr.stack || elemErr}`, 'warn', NAME );
                        return _cb( null );
                    }
                }

                function onAllElementsRendered( err ) {
                    if ( err ) {
                        return itcb( err );
                    }
                    Y.log( 'Finished adding elements to PDF.', 'debug', NAME );
                    itcb( null );
                }

                var
                    progressTotal = toAdd.length,       //  used to update progress bar on the client
                    progressCount = 0,                  //  ...
                    progressStep = 0;                   //  ...

                async.eachSeries( toAdd, forEachElement, Y.dcforms.checkSingleCB( onAllElementsRendered, 'onAllElementsRendered' ) );
            }

            //  3.5 Add 'COPY" notice over the page
            function renderCopyNotice( itcb ) {
                //  only used for 'print copy' workflows, skip if not needed
                if ( !documentState.useCopyMask ) { return itcb( null ); }

                function forEachPage( page, _cb ) {
                    renderCopyNoticeOnPage( user, hpdf, pdfHandle, page.pageRef, utf8, _cb );
                }

                async.eachSeries( documentState.pages, forEachPage, itcb );
            }

            //  4. Write the new PDF document to temp directory
            function savePdfToDisk( itcb ) {
                var
                    mediaMeta = { 'mime': 'APPLICATION_PDF', 'transform': 'original' };

                tempPdfFile = Y.doccirrus.media.getTempFileName( mediaMeta );
                tempPdfFile = tempPdfFile.replace( Y.doccirrus.fileutils.tmpName, '');

                Y.log( 'Writing new PDF to disk: ' + tempPdfFile, 'info', NAME );

                try {
                    hpdf.saveToFile( pdfHandle, tempPdfFile );
                } catch( saveErr ) {
                    if ( '{}' !== JSON.stringify( saveErr ) ) {
                        Y.log( 'Could not save PDF to file: ' + JSON.stringify( saveErr ), 'warn', NAME );
                        return itcb( saveErr );
                    }
                }

                finalValue = tempPdfFile;
                itcb( null );
            }

            //  X. Concatenate existing PDF attachments onto the end of the new PDF made from the form
            function addAttachedPdfs( itcb ) {
                let
                    mediaMeta = { 'mime': 'APPLICATION_PDF', 'transform': 'concat' },
                    concatTempFile = Y.doccirrus.media.getTempFileName( mediaMeta ),
                    pdfMediaIds = documentState.appendAdditionalPdfs || [];

                //  if no attached PDFs then we can skip this step
                if ( 0 === pdfMediaIds.length ) { return itcb( null ); }

                Y.doccirrus.media.pdf.exportBatchToCache( user, pdfMediaIds, onExportedAttachments );

                function onExportedAttachments( err, cacheFileNames ) {

                    if ( err ) {
                        Y.log( `Problem exporting additional PDFs to media cache ${err.stack||err}`, 'warn', NAME );
                        return itcb( err  );
                    }

                    let
                        concatSettings = {
                            user: user,
                            fileNames: cacheFileNames,
                            newFileName: concatTempFile
                        };

                    concatSettings.fileNames.unshift( tempPdfFile );

                    Y.doccirrus.media.pdf.concatenatePDFsSejda( concatSettings, onPdfConcat );
                }

                function onPdfConcat( err /*, result */ ) {
                    if ( err ) {
                        //  probably a broken attachment, log the error but do not stop processing, best effort
                        Y.log( `Problem while concatenating attached PDFs onto formPdf: ${err.stack||err}`, 'warn', NAME );
                        return itcb( null );
                    }

                    Y.log( `Concatenated ${pdfMediaIds.length} attached PDFs onto form pdf: ${concatTempFile}`, 'info', NAME );

                    //  treat this concatenated file as the form PDF from here on
                    tempPdfFile = concatTempFile;
                    itcb( null );
                }
            }

            //  5. Add PDF as a new media item in the database,if target
            function saveToDb( itcb ) {
                if ( 'db' !== documentState.save ) { return itcb( null ); }

                Y.doccirrus.media.mediaFromFile( tempPdfFile, 'temp', 'original', onNewPDFLoaded );

                function onNewPDFLoaded(err, newMediaObj) {
                    if (err) {
                        Y.log('Could not create new PDF Media object from PDF file.', 'warn', NAME);
                        callback(err);
                        return;
                    }

                    mediaObj = newMediaObj;
                    delete mediaObj._id;        //  is 'temp'
                    mediaObj.ownerCollection = documentState.hasOwnProperty('ownerCollection') ? documentState.ownerCollection : '';
                    mediaObj.ownerId = documentState.hasOwnProperty('ownerId') ? documentState.ownerId : '';
                    Y.doccirrus.media.mediaToDB( user, mediaObj, onAddedToDB );
                }

                function onAddedToDB(err, result) {

                    if (err) {
                        Y.log('Could not save new PDF to database: ' + JSON.stringify(err), 'warn', NAME);
                        Y.log('result: ' + JSON.stringify(result), 'warn', NAME);
                        return itcb(err);
                    }

                    if (!result || !result.length || 0 === result.length) {
                        Y.log('no result from POST, calling back', 'warn', NAME);
                        return itcb( Y.doccirrus.errors.rest( 500, 'Could not save new PDF to database, no _id returned', true ) );
                    }

                    mediaObj._id = `${result[0]}`;
                    Y.doccirrus.media.gridfs.importFile( user, mediaObj._id, mediaObj._diskFile, false, onAddedToGridFs );
                }

                function onAddedToGridFs( err ) {
                    if ( err ) {
                        Y.log( 'Could not add PDF to GridFS: ' + JSON.stringify( err ) );
                        return callback( err );
                    }

                    //  clean up temp file on disk
                    Y.doccirrus.media.tempRemove( mediaObj._diskFile );

                    finalValue = {'_id': mediaObj._id } ;
                    itcb( null );
                }
            }

            //  6. Add PDF to ZIP archive dir, if target
            // used for batch reporting oprations
            function saveToZip( itcb ) {
                if ( 'zip' !== documentState.save ) { return itcb( null ); }

                if ( !documentState.preferName || '' === documentState.preferName ) {
                    documentState.preferName = (new Date.getTime()) + '.pdf';
                }

                Y.doccirrus.media.zip.addFile(
                    documentState.zipId,
                    tempPdfFile,
                    Y.doccirrus.media.getTempDir(),
                    documentState.preferName,
                    true,
                    onAddedToZip
                );

                function onAddedToZip(err) {
                    if (err) {
                        Y.log('Could not add PDF to zip: ' + documentState.zipId, 'warn', NAME);
                        callback(err);
                        return;
                    }

                    finalValue = { 'zipId': documentState.zipId };
                    itcb( null );
                }
            }

            //  7. Move to media cache if not other destination given
            function saveToCache( itcb ) {
                if ( 'db' === documentState.save || 'zip' === documentState.save ) { return itcb( null ); }
                moveTempFileToCache( tempPdfFile, tempDir, onMovedToCache );
                function onMovedToCache( err, response ) {
                    if ( err ) { return itcb( err ); }

                    //  set the temp file to expire (links are currently valid for an hour)
                    setTimeout(function() { cleanTempFile( tempPdfFile, tempDir ); }, TEMP_EXPIRY);

                    finalValue = response;
                    itcb( null );
                }
            }

            //  8. Free resources and remove temp files
            function cleanUp( itcb ) {
                // release some resources
                pages = null;
                hpdf.freePdf( pdfHandle );

                /*
                cleanUpCache.forEach( function ( key ) {
                    if ( !require.cache[key] ) {
                        //console.log( 'Can no longer resolve require cache key: ' + key );
                        return;
                    }
                    //console.log( 'Removing from require cache: ' + key );
                    delete require.cache[key];
                } );
                */

                //  remove temp / intermediate files - we don't need to wait for the filesystem

                if ( tempFilesToCleanUp.length > 0 ) {
                    Y.doccirrus.media.cleanTempFiles( { '_tempFiles': tempFilesToCleanUp } );
                    tempFilesToCleanUp = [];
                }

                itcb( null );
            }

            //  Finally
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Problem generating PDF from form: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                Y.log( 'PDF render process complete: ' + JSON.stringify( finalValue), 'debug', NAME );
                callback( null, finalValue );
            }

        }

        /**
         *  Render a single form subelement into the given HPDF.js document
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  subElem     {Object}    dcforms subelement object serialized for use in PDF
         *  @param  hpdf        {Object}    HPDF binding object
         *  @param  pdfHandle   {Object}    HPDF document handle
         *  @param  pages       {Object}    Array of handles HPDF page objects
         *  @param  utf8        {Number}    type of encoding text*
         *  @param  callback    {Function}  Of the form fn( err )
         */

        function renderSingleElement( user, subElem, hpdf, pdfHandle, pages, utf8, callback ) {
            //Y.log('Rendering next element (' + toAdd.length + ' to go)', 'debug', NAME);

            if ( true === hpdfErrorState ) {
                Y.log( 'HPDF.js has failed, will reinitialize on next invocation.', 'warn', NAME );
                return callback( Y.doccirrus.errors.rest( 500, 'HPDF.js is locked in error state' ) );
            }

            var
                result,
                align,
                bgColorRGB,
                fgColorRGB,
                borderColorRGB,
                onPage = pages[ subElem.pageIdx ].pageRef,
                encodedText;

            async.series(
                [
                    convertColors,
                    drawBackground,
                    drawUnderline,
                    drawText,
                    drawBorder,
                    drawImage,
                    drawBarcode,
                    drawChartLine
                ],
                singleElementDone
            );

            //  1. Read HTML/CSS colors of subelement into format used by HPDF.js
            function convertColors( itcb ) {
                if (subElem.fgColor && '' !== subElem.fgColor) {
                    fgColorRGB = cssColorToRGB(subElem.fgColor);
                    //Y.log('Setting foreground color: ' + (colorRGB[0] / 255) + ', ' + (colorRGB[1] / 255) + ', ' + (colorRGB[2] / 255), 'debug', NAME);
                } else {
                    fgColorRGB = [0, 0, 0];
                }

                if (subElem.bgColor && '' !== subElem.bgColor) {
                    bgColorRGB = cssColorToRGB(subElem.bgColor);
                    if (-1 === bgColorRGB[3]) {
                        //  transparent background, default to white
                        bgColorRGB = [255, 255, 255, -1];
                    }
                } else {
                    bgColorRGB = [255, 255, 255, -1];
                }

                if (subElem.borderColor && '' !== subElem.borderColor) {
                    borderColorRGB = cssColorToRGB(subElem.borderColor);
                } else {
                    borderColorRGB = bgColorRGB;
                }

                itcb( null );
            }

            //  2. Draw subelement background box, if any
            function drawBackground( itcb ) {
                const pageH = hpdf.page_GetHeight( onPage );
                //Y.log('Drawing background rect: ' + JSON.stringify(bgColorRGB), 'debug', NAME);
                try {
                    hpdf.page_SetRGBFill( onPage, (bgColorRGB[0] / 255), (bgColorRGB[1] / 255), (bgColorRGB[2] / 255) );
                    hpdf.page_SetRGBStroke( onPage, (borderColorRGB[0] / 255), (borderColorRGB[1] / 255), (borderColorRGB[2] / 255) );
                } catch ( colorErr ) {
                    Y.log('Could not set background color of PDF region: ' + JSON.stringify( colorErr ), 'warn', NAME);
                    return itcb( colorErr );
                }

                //  hpdf.js does not support alpha channel, omit background if more than half transparent
                //Y.log('Element background color: ' + JSON.stringify(bgColorRGB), 'debug', NAME);

                if (-1 !== bgColorRGB[3]) {
                    try {

                        //Y.log( 'Drawing element background: ' + JSON.stringify( bgColorRGB ), 'debug', NAME );

                        hpdf.page_Rectangle(
                            onPage,
                            subElem.left,
                            pageH - (subElem.top + subElem.height),
                            subElem.width,
                            subElem.height
                        );

                        // Borders currently misaligned by one point, omitting
                        hpdf.page_Fill( onPage );

                    } catch (drawErr) {
                        Y.log('Could not draw background rect on PDF: ' + drawErr, 'warn', NAME);
                        return itcb( drawErr );
                    }
                }

                //  add background link, if any, MOJ-9530
                if ( subElem.linkUrl && '' !== subElem.linkUrl ) {
                    hpdf.page_CreateURILinkAnnot(
                        onPage,
                        subElem.left,
                        ( subElem.left + subElem.width ),
                        ( pageH - (subElem.top + subElem.height )),
                        ( pageH - subElem.top ),
                        subElem.linkUrl
                    );
                }

                itcb( null );
            }

            //  3. Draw subelement underline, if any
            function drawUnderline( itcb ) {
                const pageH = hpdf.page_GetHeight( onPage );
                if ( !subElem.isUnderline) { return itcb( null ); }
                //Y.log('Drawing text underline', 'debug', NAME);

                var vFactor = 0.8;  // distance of underline from bottom of row

                //  for custom TTF fonts the underline needs to be slightly lower down (MOJ-5487)
                if ( false === Y.doccirrus.media.fonts.isType2( subElem.font ) ) {
                    vFactor = 0.95;
                }

                try {
                    hpdf.page_SetLineWidth( onPage, 0.1 );
                    hpdf.page_SetRGBStroke(onPage, (fgColorRGB[0] / 255), (fgColorRGB[1] / 255), (fgColorRGB[2] / 255));
                    hpdf.page_MoveTo(onPage, subElem.left, pageH - (subElem.top + (subElem.height * vFactor)));
                    hpdf.page_LineTo(onPage, subElem.left + subElem.width + 1, pageH - (subElem.top + (subElem.height * vFactor)));
                    hpdf.page_FillStroke( onPage );
                } catch ( lineError ) {
                    Y.log('Could not draw text underline: ' + JSON.stringify( lineError ), 'warn', NAME);
                    return itcb( lineError );
                }

                itcb( null );
            }

            //  4. Draw subelement text, if any
            function drawText( itcb ) {
                if ( !subElem.text || '' === subElem.text.trimRight() ) { return itcb( null ); }

                let useFont;
                try {
                    useFont = Y.doccirrus.media.fonts.getPdfElementFont( subElem, hpdf, pdfHandle, utf8 );
                    hpdf.page_SetFontAndSize( onPage, useFont, subElem.lineHeight * 0.75);
                } catch (fontError) {
                     Y.log('Could not set font on PDF, ' + subElem.font + ': ' + JSON.stringify(fontError), 'warn', NAME);
                     return itcb( fontError );
                }

                try {
                    const pageH = hpdf.page_GetHeight( onPage );
                    hpdf.page_BeginText( onPage );
                    hpdf.page_MoveTextPos( onPage, subElem.left, pageH - (subElem.top + subElem.height));

                    //Y.log('Setting stroke color for element: ' + JSON.stringify(bgColorRGB), 'debug', NAME);
                    try {
                        hpdf.page_SetRGBStroke( onPage, (bgColorRGB[0] / 255), (bgColorRGB[1] / 255), (bgColorRGB[2] / 255));
                    } catch (colorErr) {
                        Y.log('Could not set background color of PDF region: ' + JSON.stringify(colorErr), 'warn', NAME);
                        return itcb( colorErr );
                    }

                    //Y.log('Setting fill color for element: ' + JSON.stringify(fgColorRGB), 'debug', NAME);
                    try {
                        hpdf.page_SetRGBFill( onPage, (fgColorRGB[0] / 255), (fgColorRGB[1] / 255), (fgColorRGB[2] / 255));
                    } catch (colorErr) {
                        Y.log('Could not set foreground color of PDF region: ' + JSON.stringify(colorErr), 'warn', NAME);
                        return itcb( colorErr );
                    }

                    //Y.log('original text: ' + subElem.text, 'warn', NAME);
                    //Y.log('latin 9: ' + utf8ToPdfEncoding(subElem.text), 'warn', NAME);

                    // Note that text alignment is now handled by the markdown parser
                    align = 0;  //l          //subElem.align.substr(0, 1) || 'l';
                    //encodedText = ( ( subElem.encoding && 'UTF-8' === subElem.encoding ) ? subElem.text : utf8ToPdfEncoding( subElem.text ) );
                    encodedText = utf8ToPdfEncoding( subElem.text, utf8 );

                    //console.log( 'Encoding: ' + ( subElem.encoding && 'UTF-8' === subElem.encoding ) ? 'UTF-8' : 'utf8ToPdfEncoding' );
                    //console.log( 'Encoded text: ' + encodedText );

                    result = hpdf.page_TextRect(
                        onPage,
                        utf8,
                        subElem.left,                                       //  left, points
                        pageH - subElem.top,                      //  top, from base of page, points
                        subElem.left + subElem.width,                       //  right, points
                        pageH - (subElem.top + subElem.height),   //  bottom, from base of page, points
                        encodedText,                                        //  may be UTF-8 or CP1257 depending on font
                        align                                               //  ('l'|'r'|'c'|'j')
                    );

                    subElem.originalText = subElem.text;

                    //  Check if creation of text rect failed because text was too long.  This would typically happen
                    //  on fixed size fields where the input overflows the field (MOJ-3502).  Will be trimmed to
                    //  match the text shown on the client

                    if (subElem.clipOverflow) {
                        while ( 0 === result && subElem.text.length > 0 ) {

                            result = hpdf.page_TextRect(
                                onPage,
                                utf8,
                                subElem.left,                                       //  left, points
                                pageH - subElem.top,                      //  top, from base of page, points
                                subElem.left + ((subElem.width * 1.1) + 30),        //  right, points
                                pageH - (subElem.top + (subElem.height * 1.1) + 30),   //  bottom, from base of page, points
                                utf8ToPdfEncoding( subElem.text, utf8 ),                       //
                                align                                               //  ('l'|'r'\'c'|'j')
                            );

                            subElem.text = subElem.text.substr(0, subElem.text.length - 1);
                            //Y.log('Text is too long, reducing to: ' + subElem.text, 'debug', NAME);

                            /*
                            if (0 !== result) {
                                Y.log('width: ' + subElem.width + ' with slack: ' + (subElem.left + ((subElem.width * 1.1) + 60)),'debug', NAME );
                                Y.log('height: ' + subElem.height + ' with slack: ' + ((subElem.height * 1.1) + 30),'debug', NAME );
                                Y.log('Text was too long to fit element bounds, reduced to: ' + subElem.text, 'debug', NAME);
                            }
                            */
                        }
                    } else {
                        while ( 0 === result && subElem.text.length > 0 ) {

                            //  expand the bounds to accomodate text
                            subElem.width = subElem.width + 1;
                            subElem.height = subElem.height + 0.5;

                            //subElem.text = subElem.text.substr(0, subElem.text.length - 1);
                            //Y.log('Text is too long, reducing to: ' + subElem.text, 'debug', NAME);

                            result = hpdf.page_TextRect(
                                onPage,
                                utf8,
                                subElem.left,                                       //  left, points
                                pageH - subElem.top,                      //  top, from base of page, points
                                subElem.left + subElem.width + 5,                   //  right, points
                                pageH - (subElem.top + subElem.height),   //  bottom, from base of page, points
                                utf8ToPdfEncoding( subElem.text, utf8 ),                       //
                                align                                               //  ('l'|'r'\'c'|'j')
                            );

                            /*
                            if (0 !== result) {
                                Y.log('Text was too long to fit element bounds, expanded bounds to: ' + subElem.width + 'x' + subElem.height, 'debug', NAME);
                            }
                            */
                        }
                    }

                    if (0 === result) {
                        Y.log('HPDF Rendering:  Discarding text, as does not fit in rectangle! (width: ' + subElem.width + ' height: ' + subElem.height + ' text:' + subElem.originalText + ')', 'warn', NAME);
                    }

                    hpdf.page_EndText( onPage );

                } catch ( txtError ) {
                    Y.log( 'Could not add text to PDF, "' + subElem.text + '": ' + JSON.stringify(txtError), 'warn', NAME );
                    return itcb( txtError );
                }
                itcb( null );
            }

            //  5. Draw subelement border, if any
            function drawBorder( itcb ) {
                const pageH = hpdf.page_GetHeight( onPage );
                if ( !subElem.borderColor || '' === subElem.borderColor) {
                    return itcb( null );
                }

                borderColorRGB = cssColorToRGB(subElem.borderColor);

                //  hpdf.js does not support alpha channel, omit border if more than half transparent
                if ( -1 !== borderColorRGB[3] ) {
                    //Y.log('Setting border color: ' + (borderColorRGB[0] / 255) + ', ' + (borderColorRGB[1] / 255) + ', ' + (borderColorRGB[2] / 255), 'debug', NAME);

                    try {
                        hpdf.page_SetRGBStroke( onPage, (borderColorRGB[0] / 255), (borderColorRGB[1] / 255), (borderColorRGB[2] / 255));
                    } catch (colorErr) {
                        Y.log('Could not set border color of PDF region: ' + JSON.stringify(colorErr), 'warn', NAME);
                        return itcb( colorErr );
                    }

                    try {
                        hpdf.page_Rectangle(
                            onPage,
                            subElem.left,
                            pageH - (subElem.top + subElem.height),
                            subElem.width,
                            subElem.height
                        );
                        hpdf.page_Stroke( onPage );
                    } catch ( drawErr ) {
                        Y.log('Could not draw rect outline on PDF: ' + drawErr, 'warn', NAME);
                        return itcb( drawErr );
                    }
                }

                itcb( null );
            }

            //  6. Draw mediamojit image or sprite, if any
            //  NB: may return an SVG which will be passed to svgutils
            //  MOJ-8655 will treat sprite images as masks for fgColor
            function drawImage( itcb ) {
                // temporarily disable images
                if ( !subElem.imgId || '' === subElem.imgId ) { return itcb( null ); }

                var imgKey = Y.doccirrus.media.images.getPdfImageKey( subElem );

                Y.log('Preparing image to embed in PDF: ' + subElem.imgId + ' in-document cache: ' + imgKey, 'debug', NAME);
                const pageH = hpdf.page_GetHeight( onPage );

                if ( hpdf.reuseImages.hasOwnProperty( imgKey ) ) {

                    Y.log( 'PDF image transform exists reusing: ' + imgKey, 'debug', NAME );

                    try {
                        //Y.log('Adding image at scale: ' + subElem.width + 'x' + subElem.height, 'debug', NAME);
                        //Y.log('Page size: ' + onPage.width() + 'x' + onPage.height(), 'debug', NAME);
                        hpdf.page_DrawImage( onPage, hpdf.reuseImages[imgKey] , subElem.left, pageH - (subElem.top + subElem.height), subElem.width, subElem.height);
                    } catch ( drawErr ) {
                        Y.log('Could not draw image to PDF: ' + JSON.stringify( drawErr ), 'warn', NAME);
                        return itcb( null );
                    }

                    itcb( null );
                    return;
                }

                Y.log( 'PDF image transform does not exists in document, generating: ' + imgKey, 'debug', NAME );

                Y.doccirrus.media.images.preparePdfImage( user, subElem, Y.dcforms.checkSingleCB( onImageReady, 'onImageReady') );

                function onImageReady( err, imgFile, mime ) {

                    if (err) {
                        //  we don't abort PDF on this error - continue with best effort despite missing image
                        Y.log('Could not prepare image for PDF: ' + JSON.stringify(err), 'warn', NAME);
                        return itcb( null );
                    }

                    Y.log( 'Adding image to PDF: ' + imgFile.substr(0, 512) + ' ... (' + mime  + ')', 'debug', NAME );

                    var imgObj = null;

                    switch(mime) {
                        case 'IMAGE_JPG':       //  should not happen
                        case 'IMAGE_JPEG':
                            try {
                                imgObj = hpdf.loadJpegImageFromFile( pdfHandle, imgFile );
                                //hpdf.reuseImages[imgKey] = imgObj;

                            } catch ( imgErr ) {
                                Y.log( 'Could not load JPEG image, '  + imgFile + ': ' + JSON.stringify(imgErr), 'warn', NAME );
                            }

                            break;

                        case 'IMAGE_PNG':
                            try {
                                imgObj = hpdf.loadPngImageFromFile( pdfHandle, imgFile );
                                //hpdf.reuseImages[imgKey] = imgObj;
                            } catch ( imgErr ) {
                                Y.log( 'Could not load PNG image, '  + imgFile + ': ' + JSON.stringify(imgErr), 'warn', NAME );
                            }
                            break;

                        case 'IMAGE_SVG':
                            //  we don't imageCache SVGs, since they are drawn as paths not as embedded files
                            imgObj = Y.doccirrus.svg.svgToObj( imgFile );
                            Y.doccirrus.svg.svgPathsToHpdf( imgObj, hpdf, pdfHandle, onPage, subElem.width, subElem.height, utf8, onSvgTraced );
                            return;

                        default:
                            //  media type cannot be added to PDF (audio, video, etc)
                            return itcb(null);
                    }

                    if ( !imgObj ) {
                        Y.log('Could not load image for PDF', 'warn', NAME);
                        return itcb(null);
                    }

                    //Y.log( 'Inserting image from cache: ' + imgFile, 'debug', NAME );

                    try {
                        //Y.log('Adding image at scale: ' + subElem.width + 'x' + subElem.height, 'debug', NAME);
                        //Y.log('Page size: ' + onPage.width() + 'x' + onPage.height(), 'debug', NAME);
                        hpdf.page_DrawImage( onPage, imgObj, subElem.left, pageH - (subElem.top + subElem.height), subElem.width, subElem.height);
                    } catch ( drawErr ) {
                        Y.log('Could not draw image to PDF: ' + JSON.stringify( drawErr ), 'warn', NAME);
                        return itcb( null );
                    }

                    itcb( null );
                }

                function onSvgTraced(err) {
                    if (err) {
                        //  we don't abort PDF on this error - continue with best effort despite missing image
                        Y.log('Problem tracing SVG: ' + JSON.stringify(err), 'debug', NAME);
                    }
                    itcb (null);
                }
            }

            //  7. Draw barcode image, if any
            function drawBarcode( itcb ) {
                if ( !subElem.barcode || '' === subElem.barcode) { return itcb( null ); }
                Y.log('Preparing barcode to embed in PDF: ' + subElem.barcode + ' ' + subElem.width + 'x' + subElem.height, 'debug', NAME);
                Y.doccirrus.media.barcode.embed( subElem, hpdf, pdfHandle, onPage, onBarcodeImageReady );

                function onBarcodeImageReady( err ) {
                    if (err) {
                        Y.log( 'Error rendering barcode: ' + JSON.stringify(err), 'warn', NAME );
                        //  continue with the PDF despite error
                    } else {
                        Y.log( 'Barcode added to PDF', 'debug', NAME );
                    }
                    itcb( null );
                }
            }

            //  8.  Draw chart/plot line
            function drawChartLine( itcb ) {
                //  so far only chartmd elements can use this, other element can skip this step
                if ( !subElem.chartOpts ) { return itcb( null ); }
                plotChartLineAsPath( subElem, hpdf, onPage, fgColorRGB );
                itcb( null );
            }

            //  Finished with this element
            function singleElementDone( err ) {
                if ( err ) {
                    Y.log( 'Could not render PDF element: ' + JSON.stringify( err ), 'warn', NAME );
                    //hpdfErrorState = true;
                    return callback( err );
                }

                callback( null );
            }

        }

        /**
         *  Draw 'COPY' mask over a page, MOJ-9709
         *
         *  @param  {Object}    user
         *  @param  {Object}    hpdf
         *  @param  {Object}    pdfHandle   HPDF document object
         *  @param  {Object}    pageHandle  HPDF page object
         *  @param  {Number}    utf8        type of encoding text
         *  @param  {Function}  callback    Of the form fn( err )
         */

        function renderCopyNoticeOnPage( user, hpdf, pdfHandle, pageHandle, utf8, callback ) {
            const
                DEFAULT_TEXT = 'KOPIE',                     //  TODO: needs configuration
                DEFAULT_TEXT_SIZE = 16,                     //  TODO: needs configuration
                ALPHA_VALUE = 0.3,                          //  TODO: needs configuration
                COPY_FORM_ROLE = 'copy-cover-page',
                pageH = hpdf.page_GetHeight( pageHandle ),
                pageW = hpdf.page_GetWidth( pageHandle );
            let
                mediaId,
                copyMedia,
                canUseMedia = false;

            async.series(
                [
                    loadCopyForm,
                    loadCopyMedia,
                    applyCopyNoticePng,
                    applyCopyNoticeSvg,
                    applyDefaultText
                ],
                onAllDone
            );

            function loadCopyForm( itcb ) {

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'formtemplate',
                    'query': { 'jsonTemplate.defaultFor': COPY_FORM_ROLE },
                    'callback': onFormLoaded
                } );

                function onFormLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    if ( 0 === result.length ) { return itcb( null ); }

                    let
                        copyForm = result[0],
                        jT = copyForm.jsonTemplate || { 'pages': [] };

                    Y.log( `Loaded copyForm ${COPY_FORM_ROLE}: ${copyForm._id}`, 'debug', NAME );

                    if ( !jT.pages[0] || !jT.pages[0].bgImg ) { return itcb( null ); }
                    mediaId = jT.pages[0].bgImg;
                    itcb( null );
                }

            }

            function loadCopyMedia( itcb ) {
                if ( !mediaId ) { return itcb( null ); }

                Y.log( `Loading transparent overlay for copied forms: ${mediaId}`, 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'media',
                    'query': { '_id': mediaId },
                    'callback': onMediaLoaded
                } );

                function onMediaLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    if ( !result[0] ) { return itcb( null ); }
                    copyMedia = result[0];
                    canUseMedia = ( 'IMAGE_PNG' === copyMedia.mime || 'IMAGE_SVG' !== copyMedia.mime );
                    itcb( null );
                }

            }

            function applyCopyNoticePng( itcb ) {
                //  if not a PNG then skip this step
                if ( !canUseMedia || 'IMAGE_PNG' !== copyMedia.mime ) { return itcb( null ); }

                let fileName = Y.doccirrus.media.getTempDir() + '/copypage.png';

                Y.doccirrus.media.gridfs.exportFile( user, mediaId, fileName, false, onFileCopied );

                function onFileCopied( err ) {
                    if ( err ) { return itcb( err ); }

                    let hpdfImgObj, gstate;

                    hpdf.page_GSave( pageHandle );                      //  save current HPDF graphics state
                    gstate = hpdf.createNewExtGState( pdfHandle );      //  create new HPDF graphics state
                    hpdf.gstate_SetAlphaFill( gstate, ALPHA_VALUE );    //  set transparency on new graphics state
                    hpdf.page_SetExtGState( pageHandle, gstate );       //  apply new graphics state to this page

                    hpdfImgObj = hpdf.loadPngImageFromFile( pdfHandle, fileName );

                    //draw_circles( "COPY / KOPIE", 420.0, PAGE_HEIGHT - 170);
                    hpdf.page_DrawImage( pageHandle, hpdfImgObj, 0, 0, pageW, pageH );

                    hpdf.page_GRestore( pageHandle );       //  restore previous graphics state (without transparency)

                    itcb( null );
                }
            }


            function applyCopyNoticeSvg( itcb ) {
                //  if not an SVG then skip this step
                if ( !canUseMedia || 'IMAGE_SVG' !== copyMedia.mime ) { return itcb( null ); }

                let gstate;

                Y.doccirrus.media.gridfs.exportBuffer( user, mediaId, false, onSvgLoaded );

                function onSvgLoaded( err, svgBuffer ) {
                    if ( err ) { return itcb( err ); }

                    hpdf.page_GSave( pageHandle );                      //  save current HPDF graphics state
                    gstate = hpdf.createNewExtGState( pdfHandle );      //  create new HPDF graphics state
                    hpdf.gstate_SetAlphaFill( gstate, ALPHA_VALUE );    //  set transparency on new graphics state
                    hpdf.page_SetExtGState( pageHandle, gstate );       //  apply new graphics state to this page

                    let hpdfImgObj = Y.doccirrus.svg.svgToObj( svgBuffer );

                    //draw_circles( "COPY / KOPIE", 420.0, PAGE_HEIGHT - 170);
                    //  TODO: addon here
                    Y.doccirrus.svg.svgPathsToHpdf( hpdfImgObj, hpdf, pdfHandle, pageHandle, pageW, pageH, utf8, onSvgTraced );
                }


                function onSvgTraced( err ) {
                    hpdf.page_GRestore( pageHandle );       //  restore previous graphics state (without transparency)

                    if ( err ) {
                        Y.log( 'Could not trace SVG on copy page: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    itcb( null );
                }
            }

            function applyDefaultText( itcb ) {
                //  if we have a configured background then we can skip this step
                if ( canUseMedia ) { return itcb( null ); }

                let
                    stub = { 'font': 'Helvetica', 'isBold': true },
                    useFont =  Y.doccirrus.media.fonts.getPdfElementFont( stub, hpdf, pdfHandle, utf8 ),
                    gstate = hpdf.createNewExtGState( pdfHandle );      //  create new HPDF graphics state

                hpdf.page_GSave( pageHandle );                          //  save current HPDF graphics state
                hpdf.gstate_SetAlphaFill( gstate, ALPHA_VALUE );        //  set transparency on new graphics state
                hpdf.page_SetExtGState( pageHandle, gstate );           //  apply new graphics state to this page

                hpdf.page_SetRGBFill( pageHandle, 1.0, 0.0, 0.0 );
                hpdf.page_SetRGBStroke( pageHandle, 1.0, 0.0, 0.0 );

                hpdf.page_SetFontAndSize( pageHandle, useFont, DEFAULT_TEXT_SIZE );
                hpdf.page_BeginText( pageHandle );
                hpdf.page_TextOut( pageHandle, utf8, pageW * 0.75, pageH * 0.9, DEFAULT_TEXT );
                hpdf.page_EndText( pageHandle );

                hpdf.page_GRestore( pageHandle );       //  restore previous graphics state (without transparency)

                itcb( null );
            }

            /* used for testing
            function draw_circles( description, x, y) {
                page.setLineWidth(1.0);
                page.setRGBStroke(0.0, 0.0, 0.0);
                page.setRGBFill(1.0, 0.0, 0.0);
                page.circle(x + 40, y + 40, 40);
                page.closePathFillStroke();
                page.setRGBFill(0.0, 1.0, 0.0);
                page.circle(x + 100, y + 40, 40);
                page.closePathFillStroke();
                page.setRGBFill(0.0, 0.0, 1.0);
                page.circle(x + 70, y + 74.64, 40);
                page.closePathFillStroke();

                page.setRGBFill(0.0, 0.0, 0.0);
                page.beginText();
                page.textOut(x + 0.0, y + 130.0, description);
                page.endText();
            }
            */

            function onAllDone( err ) {

                if ( err ) {
                    Y.log( 'Could not render copy notice on page: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                callback( null );
            }
        }

        function moveTempFileToCache( tempFile, tempDir, callback ) {
            var
                cacheDir = Y.doccirrus.media.getCacheDir(),
                cacheFile = tempFile.replace( tempDir, cacheDir );

            function onWriteFile( err ) {
                if ( err ) {
                    callback( err );
                    return;
                }

                //  download link will be available for this long
                setTimeout(function() { cleanTempFile(cacheFile); }, TEMP_EXPIRY);
                cleanTempFile( tempFile, tempDir );

                Y.log('Saved PDF to cache and set expiry: ' + cacheFile, 'info', NAME);
                //cacheFile = cacheFile.replace(Y.doccirrus.media.getTempDir(), '');
                //cacheFile = cacheFile.replace(Y.doccirrus.media.getCacheDir(), '');
                callback(null, {'tempId': cacheFile });
            }

            function onReadFile( err, fileData ) {
                if (err) {
                    callback( err );
                    return;
                }
                fs.writeFile( cacheFile, fileData, onWriteFile );
            }

            fs.readFile( tempFile, onReadFile );
        }

        /**
         *  Delete a file from the temp directory, we don't need to wait for this to complete
         *
         *  TODO: use Y.doccirrus.media.cleanTempFiles
         *
         *  @param  fileName    {String}
         *  @param  tempDir     {String}
         */

        function cleanTempFile( fileName, tempDir ) {
            function onDeleted( err ) {
                if( err ) {
                    Y.log( 'Could not delete temp file: ' + JSON.stringify( err ), 'warn', NAME );
                }
            }

            if( -1 !== fileName.indexOf( tempDir ) ) {
                fs.unlink( fileName, onDeleted );
            }
        }

        /**
         *  Convert a color of the form rgba(R, G, B, a), rgb(R, G, B), #RRGGBB or #RGB
         *  @param cssColor
         *  @returns {number[]}
         */

        function cssColorToRGB(cssColor) {
            var
                parts,
                rgb = [0, 0, 0];

            cssColor = cssColor.replace('rgba', '').replace('rgb', '').replace('(', '').replace(')', '');
            cssColor = cssColor.replace(' ', '').replace("\t", '').replace(';', '').replace("\n", '');
            cssColor = cssColor.replace(' ', '').replace(' ', '').replace(' ', '').replace(' ', '');
            parts = cssColor.split(',');

            if (1 === parts.length || '#' === cssColor.substring(0, 1)) {
                return hexColorToRGB(cssColor);
            }

            if (parts.length < 3) {
                return rgb;
            }

            parts = cssColor.split(',');
            rgb[0] = parseInt(parts[0], 10);
            rgb[1] = parseInt(parts[1], 10);
            rgb[2] = parseInt(parts[2], 10);
            rgb[3] = 1;

            //  HPDF doesn't support alpha channel, use -1 if transparent
            if (parts[3] && 0.5 > parseFloat(parts[3])) {
                rgb[3] = -1;
            }

            return rgb;
        }

        /**
         *  Convert hex color to integer color representation needed by HPDF.js
         *
         *  @param hexColor {String}    Of the form #RRGGBB or #RGB
         */

        function hexColorToRGB(hexColor) {
            var rgb = [0, 0, 0];

            hexColor = hexColor.replace('#', '').replace(' ', '').replace(';', '');

            if (3 === hexColor.length) {
                rgb[0] = parseInt(hexColor.substr(0, 1), 16);
                rgb[1] = parseInt(hexColor.substr(1, 1), 16);
                rgb[2] = parseInt(hexColor.substr(2, 1), 16);
            }

            if (6 === hexColor.length) {
                rgb[0] = parseInt(hexColor.substr(0, 2), 16);
                rgb[1] = parseInt(hexColor.substr(2, 2), 16);
                rgb[2] = parseInt(hexColor.substr(4, 2), 16);
            }

            return rgb;
        }

        /**
         *  Draw a charting line on the page a HPDF.js path
         *
         *  @param  {Object}    subElem
         *  @param  {Object}    hpdf            HPDF binding
         *  @param  {Object}    pageHandle      HPDF page handle
         *  @param  {String]    fgColorRGB
         */

        function plotChartLineAsPath( subElem, hpdf, pageHandle, fgColorRGB ) {
            const pageH = hpdf.page_GetHeight( pageHandle );
            var
                SCALE_POINTS_TO_LINE_SIZE = 0.1,                   //  scale points of font size to line width
                chartOpts = subElem.chartOpts,
                chartPoints = subElem.chartPoints,
                xRange = ( chartOpts.xMax - chartOpts.xMin ),
                yRange = ( chartOpts.yMax - chartOpts.yMin ),
                sorted = chartPoints.sort( sortByX ),
                xPoint, yPoint,
                pdfPoints = [],
                lastPoint,
                i;

            function sortByX( a, b ) {
                if ( a.x > b.x ) { return 1; }
                if ( a.x < b.x ) { return -1; }
                return 0;
            }

            //  convert form co-ordinates to PDF points
            for ( i = 0; i < sorted.length; i++ ) {
                pdfPoints.push( {
                    'x': ( ( ( sorted[i].x - chartOpts.xMin ) / xRange ) * subElem.width ),
                    'y': ( ( ( sorted[i].y - chartOpts.yMin ) / yRange ) * subElem.height )
                } );

            }

            // draw border
            /*
            onPage.setRGBStroke((fgColorRGB[0] / 255), (fgColorRGB[1] / 255), (fgColorRGB[2] / 255));
            onPage.rectangle(
                subElem.left,
                onPage.height() - (subElem.top + subElem.height),
                subElem.width,
                subElem.height
            );
            onPage.stroke();
            */

            //  draw nodes at the points
            for ( i = 0; i < pdfPoints.length; i++ ) {
                //  TODO: make this a circle

                xPoint = subElem.left + pdfPoints[i].x;
                yPoint = pageH - ( subElem.top + subElem.height - pdfPoints[i].y );

                hpdf.page_SetRGBFill(pageHandle, (fgColorRGB[0] / 255), (fgColorRGB[1] / 255), (fgColorRGB[2] / 255));

                hpdf.page_Arc(
                    pageHandle,
                    xPoint,
                    yPoint,
                    ( SCALE_POINTS_TO_LINE_SIZE * subElem.lineHeight * 2 ),
                    1,
                    359
                );

                hpdf.page_Fill( pageHandle );
            }

            //  draw line segments
            for ( i = 0; i < pdfPoints.length; i++ ) {
                if ( i > 0 ) {

                    try {

                        hpdf.page_SetLineWidth( pageHandle, SCALE_POINTS_TO_LINE_SIZE * subElem.lineHeight );
                        hpdf.page_SetRGBStroke( pageHandle, (fgColorRGB[0] / 255), (fgColorRGB[1] / 255), (fgColorRGB[2] / 255));

                        hpdf.page_MoveTo(
                            pageHandle,
                            subElem.left + pdfPoints[i].x,
                            pageH - ( subElem.top + ( subElem.height - pdfPoints[i].y ) )
                        );

                        hpdf.page_LineTo(
                            pageHandle,
                            subElem.left + lastPoint.x,
                            pageH - ( subElem.top + ( subElem.height - lastPoint.y ) )
                        );

                        hpdf.page_Stroke( pageHandle );

                    } catch ( lineError ) {
                        Y.log('Could not draw chart line segment: ' + JSON.stringify( lineError ), 'warn', NAME);
                        return lineError;
                    }

                }

                lastPoint = pdfPoints[i];
            }

            return null;
        }

        /**
         *  Share with other components
         *  @returns {number}
         */

        function getImageResolution() {
            return IMAGE_RESOLUTION;
        }

        /**
         *  Method to create a PDF from a set of JPEG images
         *
         *  Used when creating PDFs from scanned pages - currently produces A4 pdfs
         *  Create as separate PDFs and then concatenate in order mitigate memory issue, EXTMOJ-1495
         *
         *  @param  user       {Object}    REST user or equivalent
         *  @param  imageFiles  {String[]}  File names, should all be JPEG and in temp directory
         *  @param  callback    {Function}  Of the form fn( err, newPdfFile )
         */

        function compileFromImagesSerial( user, imageFiles, callback ) {
            let
                mediaMeta = {
                    'mime': 'APPLICATION_PDF',
                    'transform': 'original'
                },
                outPdfFile = Y.doccirrus.media.getTempFileName( mediaMeta ),
                tempDir = Y.doccirrus.media.getTempDir(),
                pagesAsPDF = [];

            if ( !imageFiles || 0 === imageFiles.length ) {
                return callback( Y.doccirrus.errors.rest( 500, 'No images to compile to PDF' ) );
            }

            //  Re-initialize HPDF.js if this is the first PDF, or the previous PDF left HPDF.js in an error state
            const
                hpdf = require(`${__dirname}/../../../node_modules/hpdf/build/Release/hpdf`);

            Y.log( 'Generating new PDF from set of ' + imageFiles.length + ' images.', 'info', NAME );


            async.series(
                [
                    convertAllPages,
                    joinAllPages
                ],
                onAllDone
            );

            function convertAllPages( itcb ) {
                async.eachSeries( imageFiles, addImageAsPDF, itcb );
            }

            function addImageAsPDF( imageFile, itcb ) {

                //  temp PDF file for this page
                const pdfHandle = hpdf.hpdf();


                let
                    pageObj = hpdf.addPage( pdfHandle ),
                    imgObj = hpdf.loadJpegImageFromFile( pdfHandle, tempDir + imageFile ),
                    tempPdfFile = Y.doccirrus.media.getTempFileName( mediaMeta ),
                    paperSize = getPageSize( 'a4' ),
                    paperOrientation = getPageOrientation( 'p' ),
                    pageH = 297 * MM_TO_POINTS,
                    pageW =  210 * MM_TO_POINTS;

                hpdf.page_SetSize( pageObj, paperSize, paperOrientation );
                hpdf.page_SetHeight( pageObj, pageH );                    //  1 mm = 2.83464567 points
                hpdf.page_SetWidth( pageObj, pageW );                     //  1 mm = 2.83464567 points

                Y.log( `Adding page to PDF, ${pageW}x${pageH}: ${tempDir}${imageFile}`, 'debug', NAME );

                //  NB: HPDF uses an unusual co-ordinate system, [0,0] is bottom left of page
                hpdf.page_DrawImage( pageObj, imgObj, 0, 0, pageW, pageH );

                try {
                    Y.log( `Writing new PDF to disk: ${tempPdfFile}`, 'info', NAME );
                    hpdf.saveToFile( pdfHandle, tempPdfFile );
                } catch(saveErr) {
                    Y.log(`Could not save PDF to file: ${JSON.stringify( saveErr )}`, 'error', NAME);
                    return itcb( saveErr );
                }

                hpdf.freePdf( pdfHandle );
                pagesAsPDF.push( tempPdfFile );

                itcb( null );
            }

            function joinAllPages( itcb ) {
                //  if only one page then we can skip this step
                if (1 === pagesAsPDF.length) {
                    outPdfFile = pagesAsPDF[0];
                    return itcb(null);
                }

                let
                    sejdaConfig = {
                        'user': user,
                        'fileNames': pagesAsPDF,
                        'newFileName': outPdfFile,
                        'compileOnly': true             //  compile PDF but do not move to cache or send events
                    };

                Y.doccirrus.media.pdf.concatenatePDFs(sejdaConfig, itcb );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not compile PDF from images: ' + JSON.stringify( err ), 'error', NAME );
                    return callback( err );
                }

                Y.log( `Joined all pages into a single PDF: ${outPdfFile}`, 'info', NAME );
                callback( null, outPdfFile );
            }
        }

        /*
         *  Export interface for use by mojits
         */

        Y.namespace( 'doccirrus.media' ).hpdf = {
            initialized,
            compileFromForm,
            compileFromImagesSerial,
            normalize,
            utf8ToPdfEncoding,
            getImageResolution
        };

    },
    '0.0.1', {requires: [ 'dcfileutils', 'dcmedia-fonts' ]}
);