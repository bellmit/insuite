/*
 *  Copyright DocCirrus GmbH 2016
 *
 *  YUI module to manage custom fonts for forms and PDFs
 *
 *  This requires the 'otfinfo' utility to examine font files
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */


YUI.add(
    /* YUI module name */
    'dcmedia-fonts',

    /* Module code */
    function( Y, NAME ) {

        var
            Canvas = require('canvas'),
            Font = Canvas.Font,
            fs = require( 'fs' ),
            async = require( 'async' ),
            shellexec = require( 'child_process' ).exec,

            i18n = Y.doccirrus.i18n,

            PDF_ENCODING = 'ISO8859-15', //'CP1257',

            //  TTF glyphs necessary for German text in forms
            requireGlyphs = [
                'dieresis',
                'adieresis',
                'edieresis',
                'idieresis',
                'odieresis',
                'udieresis',
                'ydieresis',
                'Edieresis',
                'Odieresis',
                'Ydieresis',
                'Adieresis',
                'Idieresis',
                'Udieresis',
                'germandbls',   //  Eszett
                'Euro'
            ],

            requireTables = [
                'OS/2',
                'cmap',
                'cvt',
                'fpgm',
                'glyf',
                'head',
                'hhea',
                'hmtx',
                'loca',
                'maxp',
                'name',
                'post',
                'prep'
            ];

        const {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         *  Read available fonts on system start (master only, for each tenant)
         */

        function init( user, callback ) {
            if ( !Y.doccirrus.ipc.isMaster() ) {
                return callback( null );
            }

            reloadFontList( user, onFontsLoaded );
            function onFontsLoaded( err, fontSet ) {
                if ( err ) {
                    Y.log( 'Could not load fonts listing: ' + JSON.stringify( err ), 'warn', NAME );
                    callback( err );
                    return;
                }

                Y.log( 'Loaded ' + fontSet.length + ' custom fonts:\n' + JSON.stringify( fontSet, undefined, 2 ), 'debug', NAME );
                callback( null );
            }
        }

        /**
         *  Check that an uploaded font has features and codepoints required by HPDF.js, node canvas and our forms
         *
         *  See libharu source: https://github.com/libharu/libharu/blob/master/src/hpdf_fontdef_tt.c
         *
         *  @param  font            {Object}    TTF media object
         *  @param  font._diskFile  {String}    Location of uploaded file on disk
         *  @param  callback        {Function}  Of the form fn( err, normalizedFont )
         */

        function normalize( font, callback ) {

            var
                fontFile = font._diskFile,
                fontTables,
                fontGlyphs,
                allOk = true,
                errMsg;

            async.series(
                [
                    getFontTables,
                    getGlyphs,
                    getFontEmbedFlag,
                    checkValidity
                ],
                onAllDone
            );

            //  1. First get the set of tables from the TTF
            function getFontTables( itcb ) {
                Y.doccirrus.media.fonts.listFontFeatures( fontFile, 'tables', onFontTablesListed );
                function onFontTablesListed( err, foundTables ) {
                    if ( err ) { return itcb( err ); }
                    fontTables = foundTables;
                    itcb( null );
                }
            }

            //  2. Get the list of glyphs, if we have a glyf table
            function getGlyphs( itcb ) {
                Y.doccirrus.media.fonts.listFontFeatures( fontFile, 'glyphs', onFontTablesListed );
                function onFontTablesListed( err, foundGlyphs ) {
                    if ( err ) { return itcb( err ); }
                    fontGlyphs = foundGlyphs;
                    itcb( null );
                }
            }

            //  3. Check whether this font allows embedding in PDF
            function getFontEmbedFlag( itcb ) {
                //  if font has not OS/2 table then we don't need to worry about this
                if ( -1 === fontTables.indexOf( 'OS/2' ) ) {
                    Y.log( 'This font does not have an OS/2 table, assume embed in PDF.', 'debug', NAME );
                    return itcb( null );
                }

                Y.doccirrus.media.fonts.checkFontEmbedFlag( fontFile, onCheckFlag );

                function onCheckFlag( err, flagOk, rawTable ) {
                    if ( err ) {
                        Y.log( 'Could not check font embed flag: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    var
                        hexTable = rawTable.toString( 'hex' ),
                        flagStr = hexTable.substr( 16, 4 );

                    Y.log( 'TF Font OS/2 table embed flag: ' + flagStr, 'debug', NAME );

                    if ( flagOk ) {
                        Y.log( 'This font has an OS/2 table, PDF embedding is explicitly allowed.', 'debug', NAME ) ;
                    } else {
                        Y.log( 'This font does not allow PDF embedding, not compatible with our system.', 'warn', NAME ) ;
                        //err = Y.doccirrus.errors.rest( 500, 'This font does not allow PDF embedding, not compatible with our system.', true );
                        errMsg = i18n( 'InSuiteAdminMojit.custom_font_settings.ERR_INCOMPATIBLE' ) + '<br/>' + i18n( 'InSuiteAdminMojit.custom_font_settings.ERR_LICENCE' );
                        err = Y.doccirrus.errors.rest( 500, errMsg, true );
                        allOk = false;
                    }

                    itcb( err );
                }
            }

            function checkValidity( itcb ) {

                var
                    missingTables = [],
                    err = null,
                    i;

                for ( i = 0; i < requireTables.length; i++ ) {
                    if ( -1 === fontTables.indexOf( requireTables[i] ) ) {
                        missingTables.push( requireTables[i] );
                    } else {
                        Y.log( 'Required table "glyf" is present.', 'debug', NAME );
                    }
                }

                if ( missingTables.length > 0 ) {
                    Y.log( 'Font is missing required tables, is not compatible with HPDF.js.  Needed: ' + missingTables.join( ', ' ) , 'warn', NAME );
                    //err = Y.doccirrus.errors.rest( 500, 'Font file is not compatible with HPDF.js, missing required tables: ' + JSON.stringify( missingTables ), true );
                    errMsg = i18n( 'InSuiteAdminMojit.custom_font_settings.ERR_INCOMPATIBLE' ) + '<br/>' + i18n( 'InSuiteAdminMojit.custom_font_settings.ERR_TABLES' );
                    err = Y.doccirrus.errors.rest( 500, errMsg, true );

                    allOk = false;
                }

                for (i = 0; i < requireGlyphs.length; i++ ) {
                    if ( -1 === fontGlyphs.indexOf( requireGlyphs[i] ) ) {
                        Y.log( 'Font is missing required glyph: ' + requireGlyphs[i], 'warn', NAME );
                        //err = Y.doccirrus.errors.rest( 500, 'Font is missing required glyph: ' + requireGlyphs[i], true );
                        errMsg = i18n( 'InSuiteAdminMojit.custom_font_settings.ERR_INCOMPATIBLE' ) + '<br/>' + i18n( 'InSuiteAdminMojit.custom_font_settings.ERR_GLYPHS' );
                        err = Y.doccirrus.errors.rest( 500, errMsg, true );
                        allOk = false;
                    } else {
                        Y.log( 'Font has required glyph: ' + requireGlyphs[i], 'debug', NAME );
                    }
                }

                if ( allOk ) {
                    Y.log( 'Font ' + fontFile + ' is compatible with our system.', 'debug', NAME );
                } else {
                    Y.log( 'Font ' + fontFile + ' is not compatible with our system.', 'debug', NAME );
                }

                itcb( err );
            }
            //  Finally
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not validate font file: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                callback( null, font );
            }
        }

        /**
         *  List TTF font file tables, glyphs, etc
         *
         *  @param  fileName    {String}    Location of TTF file on disk
         *  @param  feature     {String}    May be 'tables', 'glyphs'
         *  @param  callback    {Function}  Of the form fn( err, arrayOfTableNames )
         */

        async function listFontFeatures( fileName, feature, callback ) {
            let shellArgs = [];

            switch( feature ) {
                case 'tables':
                    shellArgs = ['-t', `"${fileName}"`];
                    break;

                case 'glyphs':
                    shellArgs = ['-g', `"${fileName}"`];
                    break;

                default:
                    return callback( Y.doccirrus.errors.rest( 500, 'Invalid font feature requested', true ) );
            }

            let [err, shellCmd] = await formatPromiseResult(
                Y.doccirrus.binutilsapi.constructShellCommand( {
                    bin: 'otfinfo',
                    shellArgs: shellArgs
                } )
            );

            if( err ) {
                return callback( err );
            }

            Y.log( 'Listing TTF font features: ' + shellCmd, 'debug', NAME );
            shellexec( shellCmd, onListFontTables );

            function onListFontTables( err, stdout, stderr ) {
                if( !err && stderr ) {
                    err = Y.doccirrus.errors.rest( '500', 'Could not read font: ' + stderr, true );
                }

                if( err ) {
                    Y.log( 'Error reading font tables: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                //  Parse the results
                var
                    lines = stdout.split( '\n' ),
                    parts,
                    result = [],
                    i;

                for( i = 0; i < lines.length; i++ ) {
                    switch( feature ) {
                        case 'tables':
                            parts = lines[i].trim().split( ' ' );
                            if( parts && parts[1] ) {
                                result.push( parts[1] );
                            }
                            break;

                        case 'glyphs':
                            result.push( lines[i] );
                            break;
                    }
                }

                //console.log( 'extracted font ' + feature +  ' from ' + fileName + ': ' + JSON.stringify( result ) );
                callback( null, result );
            }

        }

        /**
         *  Check whether font blocks embedding in PDF (HPDF.js will reject it)
         *
         *  This assumes that the font as an OS/2 table, caller should check for that first
         *
         *  @param  fontFile    {String}    Location of TTF file on disk
         *  @param  callback    {Function}  Of the form fn( err, canEmbed )
         */

        function checkFontEmbedFlag( fontFile, callback ) {
            var
                tempFile = Y.doccirrus.media.getTempFileName( { 'mime': 'APPLICATION_BINARY', 'transform': 'carve' } ),
                rawTable,
                hexTable,
                flagStr,
                canEmbed = false;

            Y.log( 'Checking if TTF font can be embedded in PDF: ' + fontFile, 'debug', NAME );

            async.series(
                [
                    extractOS2Table,
                    checkForEmbedFlag
                ],
                onAllDone
            );

            //  1. Carve the OS/2 table from the TTF file
            async function extractOS2Table( itcb ) {
                let [err, shellCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'otfinfo',
                        shellArgs: [
                            '--dump-table',
                            '"OS/2"',
                            `"${fontFile}"`,
                            '>',
                            `"${tempFile}"`
                        ]
                    } )
                );

                if( err ) {
                    return itcb( err );
                }

                shellexec( shellCmd, onExtractTable );

                function onExtractTable( err, stdout, stderr ) {
                    if( !err && stderr ) {
                        err = Y.doccirrus.errors.rest( 500, 'Problem running otfinfo: ' + stderr, true );
                    }

                    if( err ) {
                        Y.log( 'Could not carve TTF OS/2 table: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    Y.log( 'Extracted OS/2 table to file: ' + tempFile, 'debug', NAME );
                    Y.log( 'stdout: ' + stdout, 'debug', NAME );
                    itcb( null );
                }
            }

            function checkForEmbedFlag( itcb ) {
                Y.doccirrus.media.readFile( tempFile, Y.doccirrus.media.getTempDir(), onFileRead );

                function onFileRead( err, binContents ) {
                    if ( err ) {
                        Y.log( 'Could not read OS/2 TTF table from disk: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    rawTable = binContents;

                    hexTable = rawTable.toString( 'hex' );
                    Y.log( 'OS/2 table: ' + hexTable, 'debug', NAME );

                    flagStr = hexTable.substr( 16, 4 );
                    Y.log( 'OS/2 flag string: ' + flagStr, 'debug', NAME );

                    //  the following values indicate that embedding is not allowed
                    var badLicence = ( '0100' === flagStr ) || ( '0200' === flagStr ) ||( '0002' === flagStr );
                    canEmbed = !badLicence;
                    itcb( null );
                }

            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not examine TTF OS/2 table for embedding permission: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                //  temporary, test
                //canEmbed = true;

                callback( null, canEmbed, rawTable );
            }
        }

        /**
         *  Reload custom TTF fonts from GridFS
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  callback    {Function}  Of the form fn( err, fontSet )
         */

        function reloadFontList( user, callback ) {
            var
                fontDir = Y.doccirrus.media.getFontDir(),
                fontSet = [],
                fontFiles,
                fontName;

            Y.log( '(Re)loading TTF fonts from GridFS', 'debug', NAME );

            async.series(
                [
                    checkDirExists,
                    listDbFonts,
                    listDiskFonts,
                    loadDbFonts
                ],
                onAllDone
            );

            //  1. Ensure that we have a font directory on disk
            function checkDirExists( itcb ) {
                Y.doccirrus.media.mkdirIfMissing( fontDir, itcb );
            }

            //  2. List font entries in media collection
            function listDbFonts( itcb ) {

                function onMediaQuery( err, result ) {
                    if ( err ) {
                        Y.log( 'Could not list TTF fonts from database.', 'debug', NAME );
                        return itcb( null );
                    }

                    var i;
                    for ( i = 0; i < result.length; i++ ) {
                        fontName = result[i].name.replace( '.ttf', '' );
                        fontSet.push( {
                            'name': fontName,
                            '_id': result[i]._id,
                            'file': fontDir + fontName + '.ttf'
                        } );
                    }

                    //console.log( 'recorded fonts owned by settings: ', fontSet );
                    itcb( null );
                }

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'media',
                    'query': {
                        ownerCollection: 'settings',
                        mime: { $in: [ 'APPLICATION_X-FONT-TTF', 'APPLICATION_FONT-SFNT' ] }
                    },
                    callback: onMediaQuery
                } );
            }

            //  3. List fonts already on disk
            function listDiskFonts( itcb ) {
                fs.readdir( fontDir, onListFiles );
                function onListFiles( err, fileNames ) {
                    if ( err ) { return itcb( err ); }
                    fontFiles = fileNames;
                    itcb( null );
                }
            }

            //  4. Read font files from GridFS to disk
            function loadDbFonts( itcb ) {
                async.eachSeries( fontSet, loadSingleFont, itcb );
            }

            //  4.5 Read a single font from GridFS to disk
            function loadSingleFont( fontInfo, itcb ) {
                if ( -1 !== fontFiles.indexOf( fontInfo.name + '.ttf' ) ) {
                    //  Font file has already been exported to disk
                    return itcb( null );
                }
                Y.doccirrus.media.gridfs.exportFile( user, fontInfo._id, fontInfo.file, false, itcb );
            }

            //  Finally
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Error reloading default font list: ' + JSON.stringify( err ), 'warn', NAME );
                    Y.doccirrus.media.fonts.ttf = [];
                    return callback( err );
                }

                Y.log('Reloaded default font list.', 'debug', NAME);
                Y.doccirrus.media.fonts.ttf = fontSet;
                callback( null, fontSet );
            }
        }

        /**
         *  Given a font name, return true if this is ont of the default PostScript type2 fonts, or a TTF we must load
         *
         *  @param  fontName    {String}
         *  @return             {Boolean}
         */

        function isType2( fontName ) {
            var type2 = Y.doccirrus.media.fonts.type2, i;
            for ( i = 0; i < type2.length; i++ ) {
                if ( fontName.toLowerCase() === type2[i].toLowerCase() ) {
                    return true;
                }
            }
            return false;
        }

        /**
         *  Get a reference to a PDF font or embedded TTF font, adding to PDF if necessary
         *
         *  @param  subElem     {Object}    dcforms subelement serialized for PDF
         *  @param  pdf         {Object}    HPDF.js document
         *  @param  utf8        {Number}    0 - latin1; 1 - utf-8
         *  @returns            {Object}    HPDF.js font object
         */

        function getPdfElementFont( subElem, libharu, pdfHandle, utf8 ) {

            var
                useFont,
                encoding = PDF_ENCODING,
                fontName = 'Helvetica',
                fontStyle = (subElem.isBold ? 'Bold' : '') + (subElem.isItalic ? ( utf8 ? 'Italic' : 'Oblique' ) : '');

            subElem.font = subElem.font || '';

            switch(subElem.font.toLowerCase()) {

                //  default Type2 fonts
                case "'courier new', courier, monospace":
                case 'george williams monospace':
                case 'courier new':
                case 'courier':
                case 'monospace':
                    fontName = utf8 ? 'LiberationMono-Regular' : 'Courier';
                    break;

                case 'times-roman':
                case 'times new roman':
                case 'serif':
                case 'times':
                    fontName = utf8 ? 'LiberationSerif-Regular' : 'Times-Roman';
                    break;

                case '':                                            //  use Helvetica as default
                case 'arial':
                case 'sans':
                case 'helvetica':
                    fontName = utf8 ? 'LiberationSans-Regular' : 'Helvetica';
                    break;

                //  custom TTF fonts
                default:
                    if ( libharu.customFonts.hasOwnProperty( subElem.font ) ) {
                        subElem.encoding = 'UTF-8';
                        useFont = libharu.customFonts[ subElem.font ];
                        return useFont;
                    }
            }

            if ('' !== fontStyle) {
                fontName = utf8 ? fontName.replace('Regular', fontStyle) : ( fontName + '-' + fontStyle );
                fontName = fontName.replace('Times-Roman-Bold','Times-Bold');
                fontName = fontName.replace('Times-Roman-Oblique','Times-Italic');
                fontName = fontName.replace('Times-Roman-BoldOblique','Times-BoldItalic');
                fontName = fontName.replace('Times-Oblique','Times-Italic');
                fontName = fontName.replace('Times-BoldOblique','Times-BoldItalic');
            }

            //Y.log('Setting font: ' + fontName + ' style: ' + fontStyle + ' encoding: ' + encoding + ' height (mm): ' + subElem.lineHeight, 'debug', NAME);

            if ( utf8 ) {
                if ( !libharu.customFonts[ fontName ] ) {
                    libharu.customFonts[ fontName ] = libharu.getUTFFont( pdfHandle, fontName, encoding);
                }
                useFont = libharu.customFonts[ fontName ];
            } else {
                useFont = libharu.getFont( pdfHandle, fontName, encoding);
            }
            
            return useFont;
        }

        /**
         *  Embed a font in a PDF document with HPDF.js
         *
         *  Notable LibHaru errors
         *
         *  4189    0x105D  HPDF_TTF_CANNOT_EMBEDDING_FONT	This font cannot be embedded. (restricted by license)
         *  4192    0x1060  HPDF_TTF_MISSING_TABLE	        Unsupported ttf format. (cannot find a necessary table)
         *
         *  For others, see: http://libharu.sourceforge.net/error_handling.html
         *
         *  @param  pdf         {Object}    HPDF.js document object
         *  @param  fontName    {String}
         *  @param  callback    {Function}  Of the form fn( err )
         */

        function embedPdfFont( libharu, pdfHandle, fontName, callback ) {
            var
                fontDir = Y.doccirrus.media.getFontDir(),
                fileName = fontDir + fontName + '.ttf';

            Y.log( 'Loading TTF font: ' + fontName + ' / ' + fileName, 'debug', NAME );
            fs.stat( fileName, onFileStat );

            function onFileStat( err ) {
                if ( err ) {
                    Y.log( 'Could not find custom TTF font: ' + fileName, 'warn', NAME );
                    return callback( err );
                }

                try {
                    libharu.customFonts[ fontName ] = libharu.loadTTFontFromFile( pdfHandle, fileName, true, PDF_ENCODING );
                    return callback( null );
                } catch (fontErr) {
                    Y.log( 'Could not embed custom font in TTF: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( fontErr );
                }
            }
        }

        /**
         *  Add a TTF font to the context of a node canvas
         *
         *  @param  cnv         {Object}    Node canvas
         *  @param  fontName    {String}    One of Y.doccirrus.media.fonts.ttf
         */

        function addToCanvas( cnv, fontName ) {
            const
                fontDir = Y.doccirrus.media.getFontDir(),
                ctx = cnv.getContext( '2d' ),
                fontFile = fontDir + fontName + '.ttf';

            let
                //  TODO: prevent directory traversal here
                fontRef;

            if ( !cnv.dcFontList ) {
                cnv.dcFontList = [];
            }

            if ( -1 !== cnv.dcFontList.indexOf( fontName ) ) {
                //  Already loaded this one, do not repeat, memory issue with node canvas
                return;
            }

            cnv.dcFontList.push( fontName );

            try {
                fontRef = new Font( fontName, fontFile, 0 );
                cnv.customFonts[ fontName ] = fontRef;
                ctx.addFont( fontRef );
            } catch ( fontErr ) {
                Y.log( 'Error loading font: ' + JSON.stringify( fontErr ), 'warn', NAME );
            }

        }

        /**
         * Return the list of TTF glyphs we need for German text
         * @return {string[]}
         */

        function getRequiredGlyphs() {
            return requireGlyphs;
        }

        /**
         *  Absolute location of middleware css helper
         *
         *  @param  ac  {Object}    Mojito action context
         */

        function getCssUrl( ac ) {
            var
                meta = {},
                cssUrl = '/fonts/ttf.css';

            //  we can use a relative URL on PRC, since fonts are stored on the same server
            if ( Y.doccirrus.auth.isPRC() ) { return cssUrl; }

            Y.mojito.controllers.DocCirrus.setInfrastructureInfo( ac, meta );

            //  on PUC, this will be the VPRC:
            cssUrl = meta.infrastructure.prc + cssUrl;

            //  ac.addCss will prepend a '/', so use a second single '/' to get an absolute URL
            cssUrl = cssUrl.replace('http://', '//');
            cssUrl = cssUrl.replace('https://', '//');

            return cssUrl;
        }

        /**
         *  Check whether we have kerning information for this font
         */

        function hasFontMetrics( fontName ) {
            return Y.doccirrus.media.fontmetrics.hasOwnProperty( fontName );
        }

        /**
         *  Extend YUI object with a method to instantiate these
         */

        Y.namespace( 'doccirrus.media' ).fonts = {
            type2: [ 'Courier', 'Times New Roman', 'Helvetica' ],
            ttf: [],

            PDF_ENCODING: PDF_ENCODING,

            //  public methods
            runOnStart: init,
            normalize: normalize,
            reloadFontList: reloadFontList,
            isType2: isType2,
            listFontFeatures: listFontFeatures,
            checkFontEmbedFlag: checkFontEmbedFlag,
            getPdfElementFont: getPdfElementFont,
            embedPdfFont: embedPdfFont,
            addToCanvas: addToCanvas,
            getRequiredGlyphs: getRequiredGlyphs,
            getCssUrl: getCssUrl,
            hasFontMetrics: hasFontMetrics
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [
            'dcmedia-fontmetrics'
        ]
    }
);