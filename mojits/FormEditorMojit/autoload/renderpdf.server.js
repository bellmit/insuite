/**
 *  Object to load, map and render a form to PDF on the server
 *
 *  @author: strix
 *  @date: 2015-01-23
 */


/*eslint-disable no-unused-vars */
/*global YUI*/

YUI.add( 'dcforms-renderpdf', function( Y, NAME ) {

        const
            moment = require( 'moment' ),
            async = require( 'async' ),
            util = require( 'util' ),

            {logEnter, logExit} = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME ),

            {formatPromiseResult} = require( 'dc-core' ).utils,

            LABDATA_CHART_SCALE_WIDTH = 10;

        /**
         *  Make a PDF from a form and a mapped object
         *
         *  TODO: allow the user to pass activity as object
         *
         *  @param  {Object}    options
         *  @param  {Object}    options.user            Rest User or equivalent
         *  @param  {String}    options.formId          Canonical / formtemplate _id
         *  @param  {String}    options.formVersionId   Revision / formtemplateversion _id
         *  @param  {String}    options.mapperName      InCase_T should be default
         *  @param  {String}    options.mapCollection   Name of database collection to map from (usually 'activity')
         *  @param  {String}    options.mapObject       Database _id of object to be mapped, if any
         *  @param  {Object}    options.mapFields       Dict of literal strings to map
         *  @param  {Mixed}     options.saveTo          Location ('db'||'zip'||'cache'||'temp')
         *  @param  {String}    options.zipId           Archive to add PDF to if saving to zip
         *  @param  {String}    options.preferName      Preferred filename if saving to zip
         *  @param  {Object}    options.useCache        Optional cache object used in batch operations
         *  @param  {Boolean}   options.useCopyMask     Add transparency over each page of generated PDF marking it 'COPY'
         *  @param  {Function}  options.onProgress      Progress event for PDF generation
         *  @param  {Function}  options.callback        Of the form fn( err, mediaId, documentId )
         */

        async function renderToPDF( options ) {

            const
                timer = logEnter( `Y.doccirrus.forms.renderOnServer.renderToPDF ${options.formId} ${options.saveTo} ${options.mapCollection} ${options.mapObject}` ),

                checkBFBSettingP = util.promisify( Y.dcforms.checkBFBSetting ),
                reloadFontListP = util.promisify( Y.doccirrus.media.fonts.reloadFontList ),
                createTemplateOnServerP = util.promisify( Y.dcforms.template.createOnServer ),
                compileFromFormP = util.promisify( Y.doccirrus.media.hpdf.compileFromForm ),

                initializeFormForActivityP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity ),

                attachments = Y.dcforms.AttachmentsModel(),
                loadFromActivityP = util.promisify( attachments.loadFromActivity ),
                updatePdfDocP = util.promisify( attachments.updatePdfDoc ),
                updateFormDocP = util.promisify( attachments.updateFormDoc ),

                mapFields = options.mapFields || {},

                user = options.user;

            let
                activity,
                template,
                formDoc,            //  existing form state, if any
                formPdfDoc,         //  existing PDF, if any
                newMediaId,
                newFormDocId,
                mapperContext = {},
                startTime = new Date().getTime(),
                appendAdditionalPdfs = [];

            //  TODO: remove this runInSeries, async/await everything
            Y.dcforms.runInSeries(
                [
                    loadActivityAndDocs,
                    checkBFBCert,
                    checkFonts,
                    createFormTemplate,
                    loadForm,
                    updateRescanBarcode,
                    renderForm,
                    getAdditionalPdfAttachments,
                    renderHpdf,
                    updateAttachments
                ],
                onAllDone
            );

            //  0.  Load the activity and its attached documents
            //  TODO: allow use of a reporting cache here
            async function loadActivityAndDocs( itcb ) {
                if( 'activity' !== options.mapCollection ) {
                    return itcb( null );
                }

                let
                    err, activities, activitySettings,
                    noMapData = (0 === Object.keys( mapFields ).length);

                if( options.activity ) {
                    activity = options.activity;
                    [err, activitySettings] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activitysettings',
                            action: 'get',
                            query: {}
                        } )
                    );

                    if( err ) {
                        Y.log( `Could not load activity settings: ${err.stack || err}`, 'error', NAME );
                        return itcb( err );
                    }

                    if( activitySettings && activitySettings.length ) {
                        const lessThanApprovedActivityStatuses = ['EXT_IMPORT', 'DISPATCHED', 'CREATED', 'INVALID', 'VALID', 'PREPARED'];
                        const currentSettings = activitySettings[0].settings.find( setting => setting.actType === options.activity.actType );

                        if( currentSettings && currentSettings.quickPrintInvoice ) {
                            if( lessThanApprovedActivityStatuses.includes( options.activity.status ) ) {
                                Y.log( `Could not create pdf. Activity ${options.activity._id} has unsuitable status ${options.activity.status} for quick print.`, 'error' );
                                return itcb(
                                    new Error( `Could not create pdf. Activity ${options.activity._id} has unsuitable status ${options.activity.status} for quick print.` )
                                );
                            }
                        }
                    }
                } else {
                    // in case of old code
                    if( options.mapId ) {
                        options.mapObject = options.mapId;
                    }

                    [err, activities] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            query: {_id: options.mapObject}
                        } )
                    );

                    if( !err && !activities[0] ) {
                        err = new Error( `Could not find activity ${options.mapObject}` );
                    }

                    if( !err && !activities[0].formId ) {
                        err = new Error( `Activity ${options.mapObject} does not specify a form.` );
                    }

                    if( err ) {
                        Y.log( `Could not load activity to map form: ${err.stack || err}`, 'error', NAME );
                        return itcb( err );
                    }

                    activity = activities[0];
                }

                [err] = await formatPromiseResult( loadFromActivityP( user, activity ) );

                if( err ) {
                    Y.log( 'Error initializing attachment set: ' + JSON.stringify( err ), 'warn', NAME );
                }

                formDoc = attachments.findDocument( '_hasFormData' );
                formPdfDoc = attachments.findDocument( 'FORMPDF' );

                //  Shortcut: if there is already a FORMPDF with a content hash matching FORM state, we can skip
                //  generating an identical PDF.  When printing copies we need to make new ones to use the mask.
                //  If forcing fields such as invoiceNo on approval then we can't skip the map.

                if( formDoc && formPdfDoc && formDoc.formStateHash === formPdfDoc.formStateHash && !options.useCopyMask && noMapData ) {
                    let endTime = new Date().getTime();
                    //  event lets client know print job is no longer pending, clear task from queue
                    onOwnProgress( {
                        label: ('<!- pdf matched ->'),
                        percent: 100,
                        startTime: startTime,
                        endTime: endTime,
                        totalTime: (endTime - startTime),
                        mediaId: formPdfDoc.mediaId,
                        formDocId: formDoc._id
                    } );

                    return options.callback( null, formPdfDoc.mediaId, formDoc._id );
                }

                //  no form has been created for this activity, try to initialize it, should generally not happen
                if(
                    (!formDoc && activity.formId) ||                                                      //   no form
                    (formDoc && formDoc.formData && 'remap' === formDoc.formData && activity.formId)      //   expired form
                ) {
                    Y.log( `PDF requested for activity which does not have a form: ${options.mapObject}`, 'warn', NAME );
                    [err] = await formatPromiseResult( initializeFormForActivityP( user, options.mapObject, mapFields, null ) );

                    if( err ) {
                        Y.log( `Could not initialize form: ${activity.formId}: ${err.stack || err}`, 'warn', NAME );
                        return itcb( err );
                    }

                    [err] = await formatPromiseResult( loadFromActivityP( user, activity ) );

                    if( err ) {
                        Y.log( 'Error reloading attachment set: ' + JSON.stringify( err ), 'warn', NAME );
                    }

                    formDoc = attachments.findDocument( 'FORM' );
                }

                itcb( null );
            }

            //  1. Check whether this client has BFB certification (affects form choice / element visibility)
            async function checkBFBCert( itcb ) {
                let err;
                onOwnProgress( {percent: 0, label: '<!- pdf start ->'} );
                [err] = await formatPromiseResult( checkBFBSettingP( user ) );
                itcb( err );
            }

            //  1.1 Check whether the form needs to be initialized or remapped before use, should generally not be the case

            //  1.5 Experimental, issue with load order of custom TTFs
            async function checkFonts( itcb ) {
                let err;
                [err] = await formatPromiseResult( reloadFontListP( user ) );

                if( err ) {
                    //  non-fatal, custom fonts directory may not be configured or needed
                    Y.log( 'Could not reload custom fonts list: ' + JSON.stringify( err ), 'warn', NAME );
                }

                //  make a new temp canvas (update currents fonts in node canvas)
                Y.dcforms.makeTempCanvas();
                itcb( err );
            }

            //  2. Create an empty form template object
            async function createFormTemplate( itcb ) {
                let err, newTemplate;
                Y.log( 'Creating new formTemplate object...', 'debug', NAME );
                [err, newTemplate] = await formatPromiseResult( createTemplateOnServerP( user, '', '', '', '', {}, true ) );

                if( err ) {
                    Y.log( 'Could not create formtemplate: ' + err, 'warn', NAME );
                    return itcb( err );
                }

                Y.log( 'created formTemplate object, loading form ' + options.formId + '-v-' + options.formVersionId, 'debug', NAME );
                //Y.dcforms.raisePdfProgressEvent( 35 );

                newTemplate.ownerCollection = options.mapCollection;
                newTemplate.ownerId = options.mapObject;
                newTemplate.user = user;

                if( 'zip' === options.saveTo ) {
                    newTemplate._isServerZip = true;
                }

                //  we need to generate these when serializing the form, to match FORMPDF formStateHash against FORM doc.
                newTemplate.backmappingFields = Y.doccirrus.schemas.activity.actTypeHasBackmapping( activity.actType );

                template = newTemplate;

                //  MOJ-10953 Allow caller to prevent slow activity post-processes on update of activity
                template._skipTriggerRules = options.skipTriggerRules || false;
                template._skipTriggerSecondary = options.skipTriggerSecondary || false;

                itcb( null );
            }

            //  3. Load the requested form into the template
            async function loadForm( itcb ) {
                const
                    loadTemplateP = util.promisify( template.load ),
                    loadFromDictP = util.promisify( template.fromDict ),
                    mapTemplateP = util.promisify( template.map );

                let err;

                [err] = await formatPromiseResult( loadTemplateP( options.formId, options.formVersionId ) );

                if( err ) {
                    Y.log( `Could not load form: ${err.stack || err}`, 'warn', NAME );
                    return itcb( err );
                }

                Y.log( `Loaded form ${options.formId}-v-${options.formVersionId}`, 'debug', NAME );
                //Y.dcforms.raisePdfProgressEvent( 40 );

                //  if we have a formDoc then load it into the template

                if( formDoc ) {
                    [err] = await formatPromiseResult( loadFromDictP( formDoc.formState ) );

                    if( err ) {
                        Y.log( `Problem loading form template from dictionary: ${err.stack || err}`, 'warn', NAME );
                        return itcb( err );
                    }
                }

                //  if we have special fields to map then do that and update the formDoc
                if( mapFields ) {
                    [err] = await formatPromiseResult( mapTemplateP( mapFields, false ) );

                    if( err ) {
                        Y.log( `Problem loading mapping additional fields into formtemplate: ${err.stack || err}`, 'warn', NAME );
                        return itcb( err );
                    }

                    if( formDoc ) {

                        if( formDoc.mapData ) {
                            //  prevent this update from wiping out stored mapper values
                            template.mapData = {...template.mapData, ...formDoc.mapData};
                        }

                        [err] = await formatPromiseResult( updateFormDocP( {activity}, template ) );

                        if( err ) {
                            Y.log( `Problem updating form doc after additional mapping: ${err.stack || err}`, 'warn', NAME );
                        } else {
                            Y.log( `Mapped additional fields into form doc: ${JSON.stringify( mapFields )}`, 'warn', NAME );
                        }
                    }
                }

                itcb( null );
            }

            //  4. Add special barcode data for sol rescan

            async function updateRescanBarcode( itcb ) {
                let
                    schemaReferences = template.getSchemaReferences(),
                    hasQrMeta = false;

                schemaReferences.map( function( refItem ) {
                    if( 'documentMetaDataQrCode' === refItem.name ) {
                        hasQrMeta = true;
                    }
                } );

                if( !hasQrMeta ) {
                    return itcb( null );
                }

                //  will need to construct a whole mapping context for the barcodes, slow

                const
                    setupMapperP = util.promisify( Y.doccirrus.forms.mappinghelper.setupMapperForActivity ),
                    mapperName = template.reducedSchema || 'InCase_T';

                let err;

                [err, mapperContext] = await formatPromiseResult( setupMapperP( user, mapperName, template, options.mapObject, {}, options.onProgress ) );

                if( err ) {
                    //  this is subtle, so make failures obvious
                    Y.log( `Could not update rescan barcode: ${err.stack || err}`, 'error', NAME );
                    return itcb( err );
                }

                itcb( null );
            }

            //  5. Render the form to subelements for use by PDF
            //  This has the effect of applying stored FORM documents to the form elements
            async function renderForm( itcb ) {
                const renderFormP = util.promisify( template.render );
                let err;

                [err] = await formatPromiseResult( renderFormP() );

                //  TODO: handle options.mapFields here

                if( err ) {
                    Y.log( 'Could not rerender form: ' + JSON.stringify( err ), 'warn', NAME );
                    return itcb( err );
                }

                itcb( null );
            }

            //  X. Experimental - if template uses isPdfAttached, list PDFs attached to activity

            function getAdditionalPdfAttachments( itcb ) {
                //  if option is not enabled then we can skip this step
                if( !template.isPdfAttached ) {
                    return itcb( null );
                }

                //  if no activity or attached media then we can skip this step
                if( !activity || !activity.attachedMedia ) {
                    return itcb( null );
                }

                let mediaStub;

                for( mediaStub of activity.attachedMedia ) {
                    if( mediaStub.contentType === 'application/pdf' && mediaStub.mediaId !== activity.formPdf ) {
                        appendAdditionalPdfs.push( mediaStub.mediaId );
                    }
                }

                itcb( null );
            }

            //  6. Render the form into PDF
            async function renderHpdf( itcb ) {
                const
                    renderPdfServerP = util.promisify( template.renderPdfServer );

                let
                    err, docForHPDF, mediaId;

                Y.log( 'Mapper is initialized, template is rendered, ready to create PDF...', 'info', NAME );

                [err, docForHPDF] = await formatPromiseResult( renderPdfServerP( options.saveTo, options.zipId, options.preferName ) );

                if( err ) {
                    Y.log( `Could not serialize PDF for HPDF.js: ${err.stack || err}`, 'error', NAME );
                    return itcb( err );
                }

                Y.log( 'Passing serialized form into HPDF.js', 'debug', NAME );

                docForHPDF.useCopyMask = options.useCopyMask || false;
                docForHPDF.appendAdditionalPdfs = appendAdditionalPdfs;

                [err, mediaId] = await formatPromiseResult( compileFromFormP( options.user, docForHPDF, onHpdfProgress ) );

                if( '{}' === JSON.stringify( err ) ) {
                    Y.log( `Null error on exporting form, stack trace follows: ${new Error().stack}` );
                    err = null;
                }

                if( !err && !mediaId ) {
                    err = new Error( 'Media not created.' );
                }

                if( err ) {
                    Y.log( `Could not render PDF: ${err.stack || err}`, 'error', NAME );
                    return itcb( err );
                }

                Y.log( `Created new PDF with media _id: ${mediaId.toString()}, linking to activity via document`, 'info', NAME );
                newMediaId = mediaId && mediaId._id ? mediaId._id : mediaId;
                itcb( null );
            }

            //  7. Update activity attachments, if necessary
            //  TODO: rewrite this with document API
            async function updateAttachments( itcb ) {
                let err, formDoc;

                //  in practice this is always used for activity objects, skip if not an activity
                if( 'activity' !== options.mapCollection ) {
                    Y.log( 'No activity, not updating form document', 'debug', NAME );
                    return itcb( null );
                }

                //  if saving to zip or temp, we don't need to update the form document, skip this step
                if( 'zip' === options.saveTo || 'temp' === options.saveTo ) {
                    Y.log( 'Rendering to zip, not updating form document', 'debug', NAME );
                    return itcb( null );
                }

                if( !attachments ) {
                    return itcb( Y.doccirrus.errors.rest( 404, 'Missing attachments for activity, could not update.', true ) );
                }

                [err, formDoc] = await formatPromiseResult( updatePdfDocP( activity, template, newMediaId ) );

                if( err ) {
                    Y.log( 'Create / update form document: ' + JSON.stringify( err ), 'warn', NAME );
                    return itcb( err );
                }

                if( formDoc && formDoc._id ) {
                    newFormDocId = formDoc._id;
                }

                Y.log( 'New PDF linked from activity attachment: ' + newFormDocId, 'debug', NAME );
                itcb( null );
            }

            //  Finally
            function onAllDone( err ) {
                var
                    endTime = new Date().getTime(),
                    totalTime = (endTime - startTime),
                    evt = {
                        label: (err ? '<!- pdf error ->' : '<!- pdf regenerated ->'),
                        percent: 100,
                        startTime: startTime,
                        endTime: endTime,
                        totalTime: totalTime,
                        mediaId: newMediaId,
                        formDocId: newFormDocId
                    };

                if( err ) {
                    Y.log( 'Could not generate PDF from activity: ' + JSON.stringify( err ), 'warn', NAME );
                    evt.err = err;
                    onOwnProgress( evt );
                    logExit( timer );
                    return options.callback( err );
                }

                onOwnProgress( evt );
                Y.log( `toPDF calls back with newMediaId, newFormDocId: ${newMediaId} ${newFormDocId}`, 'info', NAME );
                logExit( timer );
                options.callback( err, newMediaId, newFormDocId );
            }

            //  Progress reported by mapper
            function onMapProgress( evt ) {
                evt.percent = evt.percent / 2;
                onOwnProgress( evt );
            }

            //  Progress reported by HPDF.js
            function onHpdfProgress( evt ) {
                evt.percent = (evt.percent / 2) + 50;
                onOwnProgress( evt );
            }

            //  Progress reported by own steps
            function onOwnProgress( evt ) {
                evt.mapId = options.mapObject ? options.mapObject : '';
                if( options.onProgress ) {
                    options.onProgress( evt );
                } else {
                    evt.targetId = user.identityId;
                    Y.dcforms.raisePdfProgressEvent( evt );
                }
            }
        }

        /**
         *  PDF renderer using the instock mapper to create PDFs on server - not saved as form documents
         *
         *  Split from renderToPDF since this does not use common activity functionality such as BFB certs, secondary
         *  PDF attachments, multiple mappers, etc.
         *
         *  @param  {Object}    options
         *  @param  {Object}    options.user            Rest User or equivalent
         *  @param  {String}    options.formId          Canonical / formtemplate _id
         *  @param  {String}    options.formVersionId   Revision / formtemplateversion _id
         *  @param  {String}    options.mapperName      InCase_T should be default
         *  @param  {String}    options.mapCollection   Name of database collection to map from (always 'instock')
         *  @param  {String}    options.mapObject       Database _id of object to be mapped, if any
         *  @param  {Object}    options.mapFields       Dict of literal strings to map
         *  @param  {Mixed}     options.saveTo          Location ('db'||'zip'||'cache'||'temp')
         *  @param  {String}    options.zipId           Archive to add PDF to if saving to zip
         *  @param  {String}    options.preferName      Preferred filename if saving to zip
         *  @param  {Object}    options.useCache        Optional cache object used in batch operations
         *  @param  {Boolean}   options.useCopyMask     Add transparency over each page of generated PDF marking it 'COPY'
         *  @param  {Function}  options.onProgress      Progress event for PDF generation
         *  @param  {Function}  options.callback        Of the form fn( err, mediaId, documentId )
         */

        function renderStockOrderToPDF( options ) {
            const
                timer = logEnter( `Y.doccirrus.forms.renderOnServer.renderTableToPDF ${options.formId} ${options.mapCollection} ${options.mapObject}` ),
                createInStockMapperP = util.promisify( Y.doccirrus.forms.mappinghelper.inStockOrderContext ),
                user = options.user;

            let
                template,
                newMediaId,
                newFormDocId,
                singleMapEvent = true,
                mapperContext = {},
                startTime = new Date().getTime();

            Y.dcforms.runInSeries(
                [
                    checkFonts,
                    createFormTemplate,
                    loadForm,
                    setupMapper,
                    renderForm,
                    renderHpdf
                ],
                onAllDone
            );

            //  1.5 Experimental, issue with load order of custom TTFs
            function checkFonts( itcb ) {
                Y.doccirrus.media.fonts.reloadFontList( user, onFontsReloaded );

                function onFontsReloaded( err ) {
                    if( err ) {
                        //  non-fatal, custom fonts directory may not be configured or needed
                        Y.log( 'Could not reload custom fonts list: ' + JSON.stringify( err ), 'warn', NAME );
                    }

                    //  make a new temp canvas (update currents fonts in node canvas)
                    Y.dcforms.makeTempCanvas();
                    itcb( null );
                }
            }

            //  2. Create an empty form template object
            function createFormTemplate( itcb ) {
                function onTemplateCreated( err, newTemplate ) {
                    if( err ) {
                        Y.log( 'Could not create formtemplate: ' + err, 'warn', NAME );
                        return itcb( err );
                    }

                    Y.log( 'created formTemplate object, loading form ' + options.formId + '-v-' + options.formVersionId, 'debug', NAME );

                    newTemplate.ownerCollection = options.mapCollection;
                    newTemplate.ownerId = options.mapObject;
                    newTemplate.user = user;

                    template = newTemplate;
                    itcb( null );
                }

                Y.log( 'Creating new formTemplate object...', 'debug', NAME );
                Y.dcforms.template.createOnServer( user, '', '', '', '', {}, true, onTemplateCreated );
            }

            //  3. Load the requested form into the template
            async function loadForm( itcb ) {
                const loadFormP = util.promisify( template.load );
                let err;

                Y.log( 'Loading form ' + options.formId + '-v-' + options.formVersionId, 'debug', NAME );
                [err] = await formatPromiseResult( loadFormP( options.formId, options.formVersionId ) );
                itcb( err );
            }

            //  4. Attach a mapper to the form and instantiate its context
            async function setupMapper( itcb ) {
                let err, newMapper;

                //  mapper should always be instock for this
                if( '' === options.mapperName ) {
                    options.mapperName = 'instock';
                }

                Y.log( 'Loading form mapper: ' + options.mapperName + ' on collection: ' + options.mapCollection, 'debug', NAME );

                if( 'stockorder' !== options.mapCollection ) {
                    //  should not happen
                    return itcb( null );
                }

                [err, newMapper] = await formatPromiseResult( createInStockMapperP( user, template, options.mapObject, onMapProgress ) );

                if( false === singleMapEvent ) {
                    Y.log( 'Spurious mapcomplete event', 'warn', NAME );
                    return;
                }

                singleMapEvent = false;

                if( err ) {
                    Y.log( 'Could not map form: ' + JSON.stringify( err ), 'warn', NAME );
                    return itcb( err );
                }

                Y.log( 'Mapped data: ' + JSON.stringify( template.unmap() ), 'debug', NAME );
                mapperContext = newMapper.context;
                itcb( null );
            }

            //  5. Render the form to subelements for use by PDF
            //  This has the effect of applying stored FORM documents to the form elements
            async function renderForm( itcb ) {
                const rerenderP = util.promisify( template.render );
                let err;
                [err] = await formatPromiseResult( rerenderP() );
                if( err ) {
                    Y.log( 'Could not rerender form: ' + JSON.stringify( err ), 'warn', NAME );
                    return itcb( err );
                }
                itcb( null );
            }

            //  6. Render the form into PDF
            function renderHpdf( itcb ) {
                Y.log( 'Mapper is initialized, template is rendered, ready to create PDF...', 'info', NAME );
                template.renderPdfServer( options.saveTo, options.zipId, options.preferName, onFormExported );

                function onFormExported( err, docForHPDF ) {
                    if( err ) {
                        return itcb( err );
                    }
                    Y.log( 'Passing serialized form into HPDF.js', 'debug', NAME );
                    docForHPDF.useCopyMask = options.useCopyMask || false;
                    Y.doccirrus.media.hpdf.compileFromForm( options.user, docForHPDF, onHpdfProgress, onPdfCreated );
                }

                function onPdfCreated( err, mediaId ) {
                    if( '{}' === JSON.stringify( err ) ) {
                        console.log( 'Null error, stack trace follows: ', new Error().stack );  //  eslint-disable-line no-console
                        err = null;
                    }

                    if( err ) {
                        Y.log( 'Could not render PDF: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    Y.log( 'Created new PDF with media _id: ' + mediaId + ', linking to activity via document', 'info', NAME );
                    newMediaId = mediaId._id ? mediaId._id : mediaId;
                    itcb( null );
                }
            }

            //  Finally
            function onAllDone( err ) {
                var
                    endTime = new Date().getTime(),
                    totalTime = (endTime - startTime),
                    evt = {
                        label: (err ? '<!- pdf error ->' : '<!- pdf regenerated ->'),
                        percent: 100,
                        startTime: startTime,
                        endTime: endTime,
                        totalTime: totalTime,
                        mediaId: newMediaId,
                        formDocId: newFormDocId
                    };

                if( err ) {
                    Y.log( 'Could not generate PDF from activity: ' + JSON.stringify( err ), 'warn', NAME );
                    evt.err = err;
                    onOwnProgress( evt );
                    logExit( timer );
                    return options.callback( err );
                }

                onOwnProgress( evt );
                logExit( timer );
                options.callback( err, newMediaId, newFormDocId );
            }

            //  Progress reported by mapper
            function onMapProgress( evt ) {
                evt.percent = evt.percent / 2;
                onOwnProgress( evt );
            }

            //  Progress reported by HPDF.js
            function onHpdfProgress( evt ) {
                evt.percent = (evt.percent / 2) + 50;
                onOwnProgress( evt );
            }

            //  Progress reported by own steps
            function onOwnProgress( evt ) {
                evt.mapId = options.mapObject ? options.mapObject : '';
                if( options.onProgress ) {
                    options.onProgress( evt );
                } else {
                    evt.targetId = user.identityId;
                    Y.dcforms.raisePdfProgressEvent( evt );
                }
            }

        }

        /**
         *  Add any labdata charts, as sent by LabadataTableEditorModel
         *
         *  TODO: add a special option to enable this, we don't need it most of the time
         *
         *  @param {Object}      docForHPDF      Form es exported for PDF rendering
         *  @param {Function}    callback        Of the for fn( err, tempImageFiles )
         */

        function replaceLabdataCharts( docForHPDF, callback ) {
            let
                tempImageFiles = [],
                toReplace = [],
                stackCounter = 0,
                page, subElem;

            for( page of docForHPDF.pages ) {
                for( subElem of page.subElements ) {
                    if( 'CHARTMINMAX' === subElem.text.substr( 0, 11 ) ) {
                        toReplace.push( subElem );
                    }
                }
            }

            if( 0 === toReplace.length ) {
                return onProcessedAllLabdataCharts( null );
            }

            async.eachSeries( toReplace, handleDocSubElement, onProcessedAllLabdataCharts );

            function handleDocSubElement( docSubElem, _cb ) {
                //if ( !docSubElem.cloneInputGroup || '' === docSubElem.cloneInputGroup ) { return _cb( null ); }

                stackCounter = stackCounter + 1;

                var
                    parts = docSubElem.text.split( '|' ),
                    minVal = parseFloat( parts[1] || 0 ),
                    maxVal = parseFloat( parts[2] || 0 ),
                    showVal = parseFloat( parts[3] || 0 );
                //isPathological = parts[4] || '';

                if( !parts[1] || '' === parts[1] || !parts[2] || '' === parts[2] || !parts[3] || '' === parts[3] ) {
                    Y.log( 'Invalid chart, not displaying: ' + docSubElem.text, 'warn', NAME );
                    return callback( null );
                }

                Y.doccirrus.labdata.utils.createColorBar2OnDisk( 400, 50, minVal, maxVal, showVal, onChartSaved );

                //  chart saved to temp directory on disk
                function onChartSaved( err, tempFile ) {
                    if( err ) {
                        return _cb( err );
                    }
                    docSubElem.imgId = '%' + tempFile;
                    docSubElem.text = '';

                    tempImageFiles.push( tempFile );

                    //  adjust adjust size of graphic relative to font size on paper
                    docSubElem.width = LABDATA_CHART_SCALE_WIDTH * docSubElem.lineHeight;
                    return _cb( null );
                }
            }

            function onProcessedAllLabdataCharts( err ) {
                if( err ) {
                    return callback( err );
                }
                callback( null, tempImageFiles );
            }
        }

        /**
         *  The activity loaded on the server does not have available all of the context available on the client
         *  This method loads these additional linked objects:
         *
         *  @param  user        {object}    REST user or equivalent
         *  @param  activityId  {string}    Database _id
         *  @param  useCache    {boolean}   Use reporting cache to share objects
         *  @param  onProgress  {Function}  Progress event, of the form fn( { percentage, mapId, label } )
         *  @param  callback    {function}  Of the form fn(err, fullActivity)
         */

        function createActivityMapperContext( user, activityId, useCache, onProgress, callback ) {
            Y.log( 'DEPRECATED renderOnServer.createActivityMapperContext, plase user mappingherlper.server.js', 'warn', NAME );
            Y.doccirrus.forms.mappinghelper.createActivityMapperContext( user, activityId, useCache, onProgress, callback );
        }

        /**
         *  Used by FSM to relate activities to the mapper/reduced schema which should be used
         *
         *  @param actType
         *  @returns {string}
         */

        function mapperForActType( actType ) {
            Y.log( 'DEPRECATED renderOnServer.mapperForActType, plase user mappingherlper.getMapperForActType', 'warn', NAME );
            return Y.doccirrus.forms.mappinghelper.getMapperForActType( actType );
        }

        /**
         *  Load an inSight2 preset report from the database and map it into a form
         *
         *  @param  config              {Object}
         *  @param  config.user         {Object}    REST user or equivalent
         *  @param  config.presetId     {String}    Database _id of a reporting preset
         *
         *  @param  config.onProgress   {Function}  Optional event handler to report PDF generation progress
         *
         *  @param  config.formId       {String}    Optional, dev/test only
         *  @param  config.fileName     {String}    Optional, dev/test only
         *  @param  config.filePath     {String}    Not used, dev/test
         */

        function renderReportToPDF( config ) {
            const
                timer = logEnter( `Y.doccirrus.forms.renderOnServer.renderTableToPDF ${config.renderReportToPDF}` );

            var
                defaultFormRole = 'insight-custom-report',
                saveTo = 'temp',
                preset,
                template,
                context = {},
                mapper,
                tempFileId;

            //  TODO: check config

            async.series(
                [
                    loadPreset,
                    lookupFormRole,
                    createTemplate,
                    createMapperContext,
                    mapForm,
                    saveToPdf,
                    renameFile
                ],
                onAllDone
            );

            //  load inSight preset object
            function loadPreset( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': config.user,
                    'model': 'insight2',
                    'query': {'_id': config.presetId},
                    'callback': onPresetLoaded
                } );

                function onPresetLoaded( err, response ) {

                    if( !err && !response[0] ) {
                        err = Y.doccirrus.errors.rest( 404, 'Preset report not found: ' + config.presetId, true );
                    }

                    if( err ) {
                        Y.log( 'Could not load preset ' + config.presetId + ' : ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    preset = response[0];

                    if( preset.formId ) {
                        config.formId = preset.formId;  // fallback, development only
                    }

                    if( !config.fileName ) {
                        config.fileName = preset.csvFilename + '_' + moment().format( 'YYYYMMDD_HHMM' ) + '.pdf';
                        config.fileName = config.fileName.replace( new RegExp( ' ', 'g' ), '_' );
                        config.fileName = Y.doccirrus.media.cleanFileName( config.fileName );
                        config.filePath = Y.doccirrus.media.getCacheDir() + config.fileName;
                    }

                    Y.log( 'Using form: ' + config.formId + ' mapping: ' + config.presetId, 'debug', NAME );
                    itcb( null );
                }
            }

            //  lookup form to use if none was passed by clients (own reports may fall back to default form role)
            function lookupFormRole( itcb ) {
                //  If we already have a form id then skip this step
                if( config.formId ) {
                    return itcb( null );
                }

                Y.doccirrus.formsconfig.getFormByRole( config.user, defaultFormRole, onFormLookup );

                function onFormLookup( err, result ) {
                    if( err ) {
                        return itcb( err );
                    }
                    if( !result ) {
                        return itcb( Y.doccirrus.errors.rest( 500, 'Preset does not have a formId or insight2 default form', true ) );
                    }

                    config.formId = result.canonicalId;  // fallback, development only

                    itcb( null );
                }
            }

            //  create and load the form template
            function createTemplate( itcb ) {
                Y.dcforms.template.createOnServer( config.user, '', '', '', '', {}, true, onTemplateCreated );

                function onTemplateCreated( err, newTemplate ) {
                    if( err ) {
                        Y.log( 'Could not create formtemplate: ' + err, 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    Y.log( 'created formTemplate object, loading form ' + config.formId + ' (latest)', 'debug', NAME );

                    newTemplate.ownerCollection = 'insight2';
                    newTemplate.ownerId = config.presetId;
                    newTemplate.report = config;
                    newTemplate.user = config.user;
                    newTemplate.noCanvas = true;

                    //  experimental - add kotable state for reporting API
                    newTemplate.reportTableParams = config.tableParams || {};

                    template = newTemplate;
                    template.load( config.formId, '', onFormLoaded );
                }

                function onFormLoaded( err ) {
                    if( err ) {
                        Y.log( 'Could not load form: ' + err, 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    //  hack - report forms should never be fixed, messes up the table on subsequent pages
                    template.isFixed = false;

                    Y.log( 'Loaded form ' + config.formId + ' (latest)', 'debug', NAME );
                    //Y.dcforms.raisePdfProgressEvent( 40 );
                    itcb( null );
                }
            }

            //  load other objects from database which will be used by the mapper
            function createMapperContext( itcb ) {
                Y.doccirrus.forms.mappinghelper.createReportMapperContext( config.user, onContextCreated );

                function onContextCreated( err, newContext ) {
                    if( err ) {
                        Y.log( 'Error creating mapper context for current employee: ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    context = newContext;
                    context.report = config;
                    context.bindCollection = 'insight2';
                    context.bindId = config.presetId;
                    context.preset = preset;

                    itcb( null );
                }
            }

            //  flatten the context into the form and load reports
            function mapForm( itcb ) {
                template.on( 'mapperinitialized', NAME, onMapComplete );
                mapper = Y.dcforms.mapper.insuite( template, context );

                function onMapComplete() {
                    //  unhook event, in case of duplicate callbacks making spurious events
                    template.off( '*', NAME );
                    template.render( onReRender );
                }

                function onReRender( err ) {
                    if( err ) {
                        Y.log( 'Could not rerender form: ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }
                    itcb( null );
                }
            }

            //  pass to HPDF.js and save to temp directory on disk
            function saveToPdf( itcb ) {
                template.renderPdfServer( saveTo, '', preset.csvFilename, onDocumentReady );

                function onDocumentReady( err, docForHPDF ) {
                    if( err ) {
                        return itcb( err );
                    }
                    Y.doccirrus.media.hpdf.compileFromForm( config.user, docForHPDF, onPdfProgress, onPdfCreated );
                }

                function onPdfProgress( evt ) {
                    Y.log( 'Generating report PDF: ' + JSON.stringify( evt ), 'debug', NAME );
                    if( config.onProgress ) {
                        config.onProgress( evt );
                    }
                }

                function onPdfCreated( err, result ) {
                    if( err ) {
                        Y.log( 'Could not render PDF: ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    Y.log( 'Created new report PDF: ' + JSON.stringify( result ), 'info', NAME );

                    tempFileId = result.tempId || '';
                    itcb( null );
                }
            }

            //  Give file a better name
            function renameFile( itcb ) {
                var fs = require( 'fs' );
                Y.log( 'moving file from: ' + tempFileId + ' to ' + config.filePath, 'debug', NAME );
                fs.rename( tempFileId, config.filePath, itcb );
            }

            //  end of the line
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Error generating report PDF: ' + JSON.stringify( err ), 'error', NAME );
                    logExit( timer );
                    config.callback( err );
                    return;
                }

                var
                    response = {
                        'tempId': tempFileId,
                        'tempFile': config.fileName,
                        'tempUrl': '/pdf/' + config.fileName,
                        'canonicalId': template.canonicalId
                    };

                //  clean up
                template.destroy();

                logExit( timer );
                config.callback( err, response );
            }
        }

        /**
         *  Load KO table data and map into an InSight _T form
         *
         *  This is an initial implementation made before more general requirements are known
         *  Initially re-using InSuite schema and mapper for convenience, this may need its own schema, mapper and
         *  mapper utils to work with a wider selection of tables and associated objects.
         *
         *  @param  config
         *  @param  config.user             {Object}    REST user or equivalent
         *  @param  config.options          {Object}    See activity-api (Future, sorting, etc)
         *  @param  config.query            {Object}    From table in browser (filtering, etc)
         *  @param  config.patientId        {String}    Patient to list activities for
         *  @param  config.mapFields        {Object}    Optional formData fields passed by client
         *
         *  @param  config.fileName         {String}    Generated / sanitized on server
         *  @param  config.filePath         {String}    Generated / sanitized on server
         *
         *  @param  config.onProgress       {Function}  Fired on PDF progress events (optional)
         *  @param  config.callback         {Function}  Of the form fn ( err, pdfFileDetails )
         */

        function renderTableToPDF( config ) {

            const
                timer = logEnter( `Y.doccirrus.forms.renderOnServer.renderTableToPDF ${config.patientId}` );

            let
                formRole = 'casefile-patient-folder',
                formId = null,
                //mapperName = 'insuite',
                patientId = config.patientId || null,
                dataTable = [],
                saveTo = 'temp',
                template,
                context = {},
                mapper,
                tempFileId;

            async.series(
                [
                    loadTableData,
                    lookupForm,
                    createTemplate,
                    createMapperContext,
                    mapForm,
                    saveToPdf,
                    renameFile
                ],
                onAllDone
            );

            //  load casefolder table data (browser uses Y.doccirrus.jsonrpc.api.activity.getCaseFileLight)
            //  Future: this may be extended to load other tables, or moved to the generic form mappers
            function loadTableData( itcb ) {

                Y.doccirrus.api.activity.getCaseFileLight( {
                    'user': config.user,
                    'options': config.options || {sort: {timestamp: -1}},
                    'query': config.query,
                    'callback': onCaseFolderLoaded
                } );

                function onCaseFolderLoaded( err, result ) {
                    if( err ) {
                        return itcb( err );
                    }

                    result = result.data ? result.data : result;
                    dataTable = result;
                    itcb( null );
                }

            }

            //  Find the currently assigned form for the casefile table role
            function lookupForm( itcb ) {
                function onFormMetaLoaded( err, formRoleMeta ) {
                    if( err || !formRoleMeta || '' === formRoleMeta ) {
                        Y.log( 'No form assigned to this role: ' + formRole, 'warn', NAME );
                        return itcb( Y.doccirrus.errors.rest( 500, 'No form assigned to this role: ' + JSON.stringify( formRole ), true ) );
                    }
                    Y.log( 'Found form assigned to casefolder role: ' + formRoleMeta, 'debug', NAME );
                    formId = formRoleMeta;
                    itcb( null );
                }

                Y.dcforms.getConfigVar( config.user, formRole, true, onFormMetaLoaded );
            }

            //  create and load the form template
            function createTemplate( itcb ) {
                Y.dcforms.template.createOnServer( config.user, '', '', '', '', {}, true, onTemplateCreated );

                function onTemplateCreated( err, newTemplate ) {
                    if( err ) {
                        Y.log( 'Could not create formtemplate: ' + err, 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    Y.log( 'created formTemplate object, loading form ' + config.formId + ' (latest)', 'debug', NAME );

                    newTemplate.ownerCollection = 'patient';
                    newTemplate.ownerId = patientId;
                    newTemplate.user = config.user;
                    newTemplate.noCanvas = true;

                    if( !config.formId ) {
                        config.formId = formId;
                    }

                    template = newTemplate;
                    template.load( config.formId, '', onFormLoaded );
                }

                function onFormLoaded( err ) {
                    if( err ) {
                        Y.log( 'Could not load form: ' + err, 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    //  hack - report forms should never be fixed, messes up the table on subsequent pages
                    template.isFixed = false;

                    Y.log( 'Loaded form ' + config.formId + ' (latest)', 'debug', NAME );
                    itcb( null );
                }
            }

            //  load other objects from database which will be used by the mapper
            function createMapperContext( itcb ) {
                createTableMapperContext( config.user, dataTable, onContextCreated );

                function onContextCreated( err, newContext ) {
                    if( err ) {
                        Y.log( 'Error creating mapper context for current employee: ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    context = newContext;
                    context.report = config;

                    //  owner fo the PDF
                    context.bindCollection = 'patient';
                    context.bindId = patientId;

                    //  major content of the PDF
                    context.dataTableField = 'caseFolderTable';
                    context.dataTable = dataTable;

                    context.mapLiteral = config.mapFields || {};

                    //  dummy to re-use report mapper
                    context.preset = {
                        '_id': patientId,
                        'csvFileName': 'Patientenakte_Untitiled'
                    };

                    itcb( null );
                }
            }

            //  flatten the context into the form and load reports
            function mapForm( itcb ) {
                template.on( 'mapperinitialized', NAME, onMapComplete );
                mapper = Y.dcforms.mapper.insuite( template, context );

                function onMapComplete() {
                    //  unhook event, in case of duplicate callbacks making spurious events
                    template.off( '*', NAME );
                    template.render( onReRender );
                }

                function onReRender( err ) {
                    if( err ) {
                        Y.log( 'Could not rerender form: ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }
                    itcb( null );
                }
            }

            //  pass to HPDF.js and save to temp directory on disk
            function saveToPdf( itcb ) {
                template.renderPdfServer( saveTo, '', context.preset.csvFilename, onDocumentReady );

                function onDocumentReady( err, docForHPDF ) {
                    if( err ) {
                        return itcb( err );
                    }
                    Y.doccirrus.media.hpdf.compileFromForm( config.user, docForHPDF, onPdfProgress, onPdfCreated );
                }

                function onPdfProgress( evt ) {
                    Y.log( 'Generating report PDF: ' + JSON.stringify( evt ), 'debug', NAME );
                    if( config.onProgress ) {
                        config.onProgress( evt );
                    }
                }

                function onPdfCreated( err, result ) {
                    if( err ) {
                        Y.log( 'Could not render PDF: ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    Y.log( 'Created new report PDF: ' + JSON.stringify( result ), 'info', NAME );

                    tempFileId = result.tempId || '';
                    itcb( null );
                }
            }

            //  Give file a better name
            function renameFile( itcb ) {
                var fs = require( 'fs' );
                Y.log( 'moving file from: ' + tempFileId + ' to ' + config.filePath, 'debug', NAME );
                fs.rename( tempFileId, config.filePath, itcb );
            }

            //  end of the line
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Error generating report PDF: ' + JSON.stringify( err ), 'error', NAME );
                    logExit( timer );
                    return config.callback( err );
                }

                var
                    response = {
                        'tempId': tempFileId,
                        'tempFile': config.fileName,
                        'tempUrl': '/pdf/' + config.fileName
                    };

                //  clean up
                template.destroy();
                logExit( timer );
                config.callback( err, response );
            }
        }

        /**
         *  Create mapper context to render a CaseFolder table to PDF
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  dataTable       {Object}    Casefolder
         *  @param  callback        {Function}  Of the form fn( err, context )
         */

        function createTableMapperContext( user, dataTable, callback ) {
            Y.log( 'DEPRECATED: createTableMapperContext, please user mappinghelper.createCaseFolderTableMapperContext ', 'warn', NAME );
            Y.doccirrus.forms.mappinghelper.createCaseFolderTableMapperContext( user, dataTable, callback );
        }

        /**
         *  Load employee, location and other data for embedding in a report
         *
         *  @param  user
         *  @param  callback
         */

        function createReportMapperContext( user, callback ) {
            Y.log( 'DEPRECATED: createReportMapperContext, please user mappinghelper.createReportMapperContext ', 'warn', NAME );
            Y.doccirrus.forms.mappinghelper.createReportMapperContext( user, callback );
        }

        /**
         *  Create a temporary PDF to display tables of data (LABDATA activities)
         *
         *  Overall process
         *
         *      1.  Look up form to render to
         *      2.  Create and load the form template
         *      3.  Populate data table from requested API
         *      4.  Apply form column names and widths
         *      5.  Flatten the context into the form and load reports
         *      6.  Export form template for HPDF.server.js
         *      7.  Add any labdata charts, as sent by LabadataTableEditorModel
         *      8.  Pass to HPDF.js and save to temp directory on disk
         *      9.  Move file to cache and rename
         *      X.  Finally, clean up and format response
         *
         *  @param  config                  {Object}    See formtemplate-api.server.js
         *  @param  config.user             {Object}    REST user or equivalent
         *  @param  config.formData         {Object}    keys and values to be mapped / expanded
         *  @param  config.tableDataSource  {String}    See datatables.server.js
         *  @param  config.role             {String}    form role to render to
         *  @param  config.fileName         {String}    preferred file name
         *  @param  config.callback         {Function}  Of the form fn( err, pdfInfo )
         */

        function koTableToPDF( config ) {
            const
                timer = logEnter( `Y.doccirrus.forms.renderOnServer.koTableToPDF ${config.role}` );

            let
                saveTo = 'temp',
                formId = '',
                tempImageFiles = [],
                template,
                tempFileId,
                docForHPDF;

            //  TODO: check config

            async.series(
                [
                    lookupFormRole,
                    createTemplate,
                    loadTableData,
                    applyColumnSettings,
                    mapForm,
                    formatForHPDF,
                    generateLabdataCharts,
                    saveToPdf,
                    renameFile
                ],
                onAllDone
            );

            //  1.  Look up form to render to
            function lookupFormRole( itcb ) {
                Y.dcforms.getConfigVar( config.user, config.role, true, onFormLookup );

                function onFormLookup( err, configValue ) {
                    if( err ) {
                        return itcb( err );
                    }

                    if( !configValue || '' === configValue ) {
                        return itcb( Y.doccirrus.errors.rest( 404, 'Form not found: ' + config.role, true ) );
                    }

                    Y.log( 'Requested form for labdata: ' + config.role + ' resolves: ' + configValue, 'debug', NAME );
                    formId = configValue;
                    itcb( null );
                }
            }

            //  2.  Create and load the form template
            function createTemplate( itcb ) {
                Y.dcforms.template.createOnServer( config.user, '', '', '', '', {}, true, onTemplateCreated );

                function onTemplateCreated( err, newTemplate ) {
                    if( err ) {
                        Y.log( 'Could not create formtemplate: ' + err, 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    Y.log( 'created formTemplate object, loading form ' + formId + ' (latest)', 'debug', NAME );

                    newTemplate.ownerCollection = 'activity';
                    newTemplate.ownerId = config.activityId;
                    newTemplate.user = config.user;
                    newTemplate.noCanvas = true;

                    template = newTemplate;
                    template.load( formId, '', onFormLoaded );
                }

                function onFormLoaded( err ) {
                    if( err ) {
                        Y.log( 'Could not load form: ' + err, 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    //  hack - report forms should never be fixed, messes up the table on subsequent pages
                    template.isFixed = false;

                    Y.log( 'Loaded form ' + formId + ' (latest)', 'debug', NAME );
                    //Y.dcforms.raisePdfProgressEvent( 40 );
                    itcb( null );
                }
            }

            //  3.  Populate data table from requested API
            function loadTableData( itcb ) {
                switch( config.tableDataSource ) {
                    //  load labdata table values and arrange dates into a single vertical column
                    case 'casefolder':
                        return Y.dcforms.datatables.getCasefolderTable( config, itcb );
                    case 'medicationplan':
                        return Y.dcforms.datatables.getMedicationPlanTable( config, itcb );
                    case 'client':
                        return itcb( null );    //  literal data passed by client

                    default:
                        return itcb( Y.doccirrus.errors.rest( '404', 'Unknown data source: ' + config.tableDataSource, true ) );
                }
            }

            //  4.  Apply form column names and widths
            async function applyColumnSettings( itcb ) {
                if( !config.formData.creationDate ) {
                    config.formData.creationDate = moment().format( 'YYYY.MM.DD HH.mm.ss' );
                }

                if( !config.formData || !config.formData.dataTableCols ) {
                    return itcb( null );
                }

                let
                    tableElement = template.getBoundElement( 'dataTable' ),
                    err;

                if( !tableElement ) {
                    Y.log( 'No element bound to dataTable in form: ' + formId, 'warn', NAME );
                    return itcb( null );
                }

                //  if table already has more than two columns, do not replace them, but copy dynamic columns
                let
                    currentVal = tableElement.getValue() || '',
                    currentValLines = currentVal.split( '\n' ),
                    newValLines = config.formData.dataTableCols.split( '\n' ),
                    dynamicLines = newValLines.filter( isDynamicTableLine );

                function isDynamicTableLine( line ) {
                    const DYNAMIC_MARKER = '*|_dynamic_';
                    return (DYNAMIC_MARKER === line.substr( 0, DYNAMIC_MARKER.length ));
                }

                if( currentValLines.length > 3 ) {
                    //  add any dynamic columns from the LABDATA / MEDDATA tables
                    config.formData.dataTableCols = currentValLines
                        .concat( dynamicLines )
                        .join( '\n' )
                        .replace( '\n\n', '\n' );
                }

                //MOJ-12689
                //handling of multiple dataTables with each of them having its own filters applied to it
                for( let i = 0; i < template.pages.length; i++ ) {
                    for( let j = 0; j < template.pages[i].elements.length; j++ ) {
                        tableElement = template.pages[i].elements[j] || {};
                        if( tableElement.schemaMember === 'dataTable' ) {
                            //get filters
                            let columnsAndFilters = tableElement.renderer.getCols();

                            let setValueP = util.promisify( tableElement.setValue );
                            [err] = await formatPromiseResult( setValueP( config.formData.dataTableCols ) );
                            if( err ) {
                                Y.log( `Could not set value of tableElement: ${util.inspect( tableElement )}`, 'warn', NAME );
                            }

                            // set old filters
                            if( columnsAndFilters.filters && columnsAndFilters.filters.length ) {
                                let newColumnsAndFilters = tableElement.renderer.getCols();
                                newColumnsAndFilters.filters = columnsAndFilters.filters;
                            }

                            //re-mapping
                            const tmp = tableElement.renderer.unmap();
                            let mapP = util.promisify( tableElement.renderer.map );
                            [err] = await formatPromiseResult( mapP( tmp ) );
                            if( err ) {
                                Y.log( `Could not map values of tableElement: ${util.inspect( tableElement )} into template`, 'warn', NAME );
                            }
                        }
                    }
                }

                itcb( null );
            }

            //  5.  Flatten the context into the form and load reports
            function mapForm( itcb ) {
                template.map( config.formData, true, onMapComplete );

                function onMapComplete() {
                    //  unhook event, in case of duplicate callbacks making spurious events
                    template.off( '*', NAME );
                    template.render( onReRender );
                }

                function onReRender( err ) {
                    if( err ) {
                        Y.log( 'Could not rerender form: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }
                    itcb( null );
                }
            }

            //  6.  Export form template for HPDF.server.js
            function formatForHPDF( itcb ) {
                template.renderPdfServer( saveTo, '', config.fileName, onDocumentReady );

                function onDocumentReady( err, inHpdfFormat ) {
                    if( err ) {
                        return itcb( err );
                    }
                    docForHPDF = inHpdfFormat;
                    itcb( null );
                }
            }

            //  7.  Add any labdata charts, as sent by LabadataTableEditorModel

            function generateLabdataCharts( itcb ) {
                replaceLabdataCharts( docForHPDF, onReplacedCharts );

                function onReplacedCharts( err, tempChartFiles ) {
                    if( err ) {
                        return itcb( err );
                    }
                    tempImageFiles = tempChartFiles;
                    itcb( null );
                }
            }

            //  8.  Pass to HPDF.js and save to temp directory on disk
            function saveToPdf( itcb ) {
                Y.doccirrus.media.hpdf.compileFromForm( config.user, docForHPDF, onPdfProgress, onPdfCreated );

                function onPdfProgress( evt ) {
                    Y.log( 'Generating report PDF: ' + JSON.stringify( evt ), 'debug', NAME );
                    if( config.onProgress ) {
                        config.onProgress( evt );
                    }
                }

                function onPdfCreated( err, result ) {
                    if( err ) {
                        Y.log( 'Could not render PDF: ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    Y.log( 'Created new report PDF: ' + JSON.stringify( result ), 'info', NAME );

                    tempFileId = result.tempId || '';
                    itcb( null );
                }
            }

            //  9.  Move file to cache and rename
            function renameFile( itcb ) {
                var fs = require( 'fs' );
                Y.log( 'moving file from: ' + tempFileId + ' to ' + config.filePath, 'debug', NAME );
                fs.rename( tempFileId, config.filePath, itcb );
            }

            //  X.  Finally, clean up and format response
            function onAllDone( err ) {
                if( err ) {
                    Y.log( 'Error generating Ko Table PDF: ' + JSON.stringify( err ), 'error', NAME );
                    logExit( timer );
                    return config.callback( err );
                }

                var
                    response = {
                        'tempId': tempFileId,
                        'tempFile': config.fileName,
                        'tempUrl': '/pdf/' + config.fileName,
                        'canonicalId': formId
                    };

                //  clean up
                template.destroy();
                Y.doccirrus.media.cleanTempFiles( {'_tempFiles': tempImageFiles} );

                logExit( timer );
                config.callback( err, response );
            }
        }

        /*
         *  Share this with the rest of YUI
         */

        Y.namespace( 'doccirrus.forms' ).renderOnServer = {
            toPDF: renderToPDF,
            stockOrderToPDF: renderStockOrderToPDF,
            reportToPDF: renderReportToPDF,
            tableToPDF: renderTableToPDF,
            koTableToPDF: koTableToPDF,
            mapperForActType: mapperForActType,
            createActivityMapperContext: createActivityMapperContext
        };

    },
    '0.0.1', {
        requires: [
            'dcmedia-store',
            'dcforms-template',
            'activity-api',
            'dcforms-map-casefile',
            'dcforms-map-docletter',
            'dcforms-map-invoice',
            'dcforms-map-pubreceipt',
            'dcforms-map-prescription',
            'dcforms-map-patient',
            'dcforms-map-infotree',
            'dcforms-map-incase',
            'dcforms-attachmentsmodel',
            'reporting-cache',
            'dcforms-mappinghelper',
            'labdata-finding-utils'
        ]
    }
);