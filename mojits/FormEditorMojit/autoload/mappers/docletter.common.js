/*
 *  Copyright DocCirrus GmbH 2013
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*jshint latedef:false */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-map-docletter',

    /* Module code */
    function( Y, NAME ) {
        'use strict';

        // used to remap barcodes on form changes
        var originalFormData;

        /**
         *  Factory for mapper objects
         *
         *  @param  template    {Object}    Form template
         *  @param  context     {Object}    Set of viewmodels providing values for docletter forms
         */

        Y.namespace( 'dcforms.mapper' ).docletter = function( template, context ) {

            //  PRIVATE MEMBERS

            var
                bindCollection = context.bindCollection,
                bindId = context.bindId,
                currentActivity = context.activity,
                currentPatient = context.patient,

                activities = [],        //  cache of linked activities for table rows
                koSubscriptions = [],   //  holds KO subscriptions so they can be removed on unload [array]
                //formMode = 'fill',    //  will usually be 'fill' or 'pdf', may be 'shutdown' as page closed
                formDoc = null,

                subscribedToActivity = false,       //  prevent duplicate events

                _moment = Y.dcforms.mapper.objUtils.getMoment(),
                _k = Y.dcforms.mapper.koUtils.getKo();

            //  called after form is initialized to avoid race conditions between form load events and ko events
            //  as activity loads in other panel.

            function subscribeToKOEvents() {
                //  no user interaction on the server
                if (true === Y.dcforms.isOnServer) {
                    return;
                }

                //  already subscribed to KO, do not duplicated
                if (true === subscribedToActivity) {
                    return;
                }

                subscribedToActivity = true;

                //  subscribe to the set of linked activities
                koSubscriptions.push( currentActivity._activitiesObj.subscribe( onSelectionChanged ) );
                koSubscriptions.push( currentActivity._icdsObj.subscribe( onSelectionChanged ) );

                //  subscribe to state changes
                koSubscriptions.push( currentActivity.status.subscribe( onStateChanged ) );

                template.on('modeSet', 'dcforms-map-docletter', onModeSet);

                if('LABREQUEST' === _k.unwrap(currentActivity.actType) || 'REFERRAL' === _k.unwrap(currentActivity.actType)){
                    template.setMode('locked', Y.dcforms.nullCallback);
                    subscribeToLabRequestActivity();
                } else if('AU' === _k.unwrap(currentActivity.actType)) {
                    template.setMode('locked', Y.dcforms.nullCallback);
                    subscribeToAUActivity();
                } else {
                    //  subscribe to user-driven changes in form values
                    template.on( 'valueChanged', 'dcforms-map-docletter', onFormValueChanged );
                }

                if (!Y.dcforms.isOnServer && currentActivity._isEditable()) {
                    // init KO
                    Y.dcforms.mapper.koUtils.initKoForMapper( map, context, template );
                    // set up active elements
                    Y.dcforms.mapper.koUtils.activateKoForMapper();
                }

            }

            function subscribeToLabRequestActivity() {
                function onActChanged(propertyName) {
                    if( !currentActivity._isEditable() ) {
                        return;
                    }

                    Y.log('property changed on LABREQUEST activity: ' + propertyName, 'debug', NAME);

                    map( onFormMapped );
                }

                function onFormMapped( err ) {
                    if( err ) {
                        Y.log( 'Could not map the form from current labrequest activity: ' + err, 'warn', NAME );
                        return;
                    }

                    context.attachments.updateFormDoc( context, template, onFormDocUpdateLive );
                }

                function onFormDocUpdateLive( err ) {
                    if( err ) {
                        //  form event with empty response prevents server zombie on error
                        Y.log( 'Could update labrequest form document: ' + err, 'warn', NAME );
                    }
                }

                var
                    actFields = [
                        "timestamp", "locationId", "employeeId", "kontrollunters", "abnDatumZeit", "befEilt",
                        "befEiltTel", "befEiltFax", "edtaGrBlutbild", "edtaKlBlutbild", "edtaHbA1c", "edtaReti",
                        "edtaBlutsenkung", "edtaDiffBlutbild", "citratQu", "citratQuMarcumar", "citratThrombin",
                        "citratPTT", "citratFibri", "svbAlkPhos", "svbAmylase", "svbASL", "svbBiliD", "svbBiliG",
                        "svbCalc", "svbCholesterin", "svbCholin", "svbCK", "svbCKMB", "svbCRP", "svbEisen", "svbEiwE",
                        "svbEiwG", "svbGammaGT", "svbGlukose", "svbGOT", "svbGPT", "svbHarnsäure", "svbHarnstoff",
                        "svbHBDH", "svbHDL", "svbLgA", "svbLgG", "svbLgM", "svbKali", "svbKrea", "svbKreaC", "svbLDH",
                        "svbLDL", "svbLipase", "svbNatrium", "svbOPVorb", "svbPhos", "svbTransf", "svbTrigl",
                        "svbTSHBasal", "svbTSHTRH", "glu1", "glu2", "glu3", "glu4", "urinStatus", "urinMikroalb",
                        "urinSchwTest", "urinGlukose", "urinAmylase", "urinSediment", "sonstiges", "sonstigesText",
                        "labRequestType", "ggfKennziffer", "behandlungGemaess", "auftrag",
                        "scheinSlipMedicalTreatment", "fk4202", "fk4204", "scheinRemittor", "scheinEstablishment",
                        "untersArt", "auBis", "datumOP", "ueberwAn"],
                    i;

                function makeActChangedHandler(propertyName) {
                    return function() {
                        onActChanged(propertyName);
                    };
                }

                for( i = 0; i < actFields.length; i++ ) {
                    if (currentActivity[actFields[i]]) {
                        Y.log( 'Subscribing mapper to LABREQUEST property: ' + actFields[i], 'debug', NAME );
                        koSubscriptions.push( currentActivity[actFields[i]].subscribe( makeActChangedHandler(actFields[i]) ) );
                    } else {
                        Y.log( 'Could not subscribe to missing LABREQUEST property: ' + actFields[i], 'warn', NAME );
                    }
                }

            }

            function subscribeToAUActivity() {
                Y.log('Subscribing form to AU/LABREQUEST activity form.', 'debug', NAME);
                function onActChanged(propertyName) {
                    if( !currentActivity._isEditable() ) {
                        return;
                    }

                    Y.log('property changed on AU activity, updating form: ' + propertyName, 'debug', NAME);

                    map( onFormMapped );
                }

                function onFormMapped( err ) {
                    if( err ) {
                        Y.log( 'Could not map the form from current au activity: ' + err, 'warn', NAME );
                        return;
                    }

                    context.attachments.updateFormDoc( context, template, onFormDocUpdateLive );
                }

                function onFormDocUpdateLive( err ) {
                    if( err ) {
                        //  form event with empty response prevents server zombie on error
                        Y.log( 'Could not update au form document: ' + err, 'warn', NAME );
                    }
                }

                var
                    actFields = [
                        "timestamp", "locationId", "employeeId", "auType","erstBesch","folgeBesc","arbeitsunfall",
                        "durchgangsarzt","auVon","auVorraussichtlichBis","festgestelltAm","sonstigerUnf","bvg",
                        "massnahmen","rehab","reintegration","diagnosesAdd","diagnosesAdd",'krankengeld','endBesch'
                    ],
                    i;

                function makeActChangedHandler(propertyName) {
                    return function() {
                        onActChanged(propertyName);
                    };
                }

                for( i = 0; i < actFields.length; i++ ) {
                    if (currentActivity[actFields[i]]) {
                        Y.log( 'Subscribing mapper to AU property: ' + actFields[i], 'debug', NAME );
                        koSubscriptions.push( currentActivity[actFields[i]].subscribe( makeActChangedHandler(actFields[i]) ) );
                    } else {
                        Y.log( 'Could not subscribe to missing AU property: ' + actFields[i], 'warn', NAME );
                    }
                }

            }

            context.attachments.getOrCreateFormDocument(context, template, onFormDocumentLoaded);

            /**
             *  Called after searching activity for saved form state to be loaded
             *
             *  @param  err         {Object}    If failure of getOrCreateFormDocument
             *  @param  myDoc       {Object}    A document viewModel (client) or object (server)
             *  @param  needsRemap  {Boolean}   If true then bound fields on the form should be updated from activity
             */

            function onFormDocumentLoaded( err, myDoc, needsRemap ) {

                if( err ) {
                    //  form event with empty response prevents server zombie on error
                    Y.log( 'Could not load or create form document: ' + err, 'warn', NAME );
                    template.raise( 'mapcomplete', {} );
                    return;
                }

                formDoc = myDoc;

                //Y.log( 'Loading saved data: ' + JSON.stringify(Y.doccirrus.api.document.formDocToDict(formDoc)), 'warn', NAME );
                template.fromDict( Y.doccirrus.api.document.formDocToDict( formDoc ), onLoadFromDict );

                function onLoadFromDict( err ) {
                    if ( err ) {
                        Y.log( 'Problem loading docletter from dict: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    if (true === needsRemap) {
                        Y.log('(re)mapping Docletter from Activity, no form document was present on load', 'debug', NAME);
                        map( onFormMapped );
                    } else {
                        //Y.log('form document loaded, not remapping', 'debug', NAME);
                        onFormRestored(null);
                    }
                }

                //  after mapping the form document should be updated

                function onFormMapped(err) {
                    if (err) {
                        //  form event with empty response prevents server zombie on error
                        Y.log( 'Could not map the form from current activity: ' + err, 'warn', NAME );
                        template.raise( 'mapcomplete', {} );
                        return;
                    }

                    context.attachments.updateFormDoc( context, template, onFormRestored );
                }

                //  called when form values restored from save or copied from activity

                function onFormRestored(err) {
                    if (err) {
                        //  form event with empty response prevents server zombie on error
                        Y.log( 'Could not load or create form document: ' + err, 'warn', NAME );
                        template.raise( 'mapcomplete', {} );
                        return;
                    }

                    template.render( onTemplateRendered );
                }

                //  called when form is displayed (client) or ready for export to PDF (server)

                function onTemplateRendered() {
                    template.raise( 'formDocumentLoaded', formDoc );
                    template.raise( 'mapcomplete', unmap() );
                    subscribeToKOEvents();

                    var actType;

                    if (Y.dcforms.isOnServer) {
                        return;
                    }

                    actType = _k.unwrap(currentActivity.actType);

                    //  Show the form tab unless a UTILITY
                    if(
                        'UTILITY' === actType ||
                        'LABREQUEST' === actType ||
                        'REFERRAL' === actType ||
                        'AU' === actType
                    ) {

                        //  These activity types require the 'text' tab to be shown to the user, but form must be shown
                        //  briefly on load in order to have a visible div to render into

                        Y.log('Form is ready, switching to text form for this activity type: ' + actType, 'debug', NAME);
                        //Y.doccirrus.nav.router.save( '/activity/' + (currentActivity._id ? currentActivity._id : 'new') + '/section/textform' );
                        //--
                    }
                }
            }

            //  PUBLIC METHODS

            /**
             *  Fill a form with the contents of this passed object
             *
             *  @param  callback        {Function}  Of the form fn(err)
             */

            function map( callback ) {

                Y.log( 'Mapping docletter into form: ' + bindCollection + '::' + bindId, 'debug', NAME );

                var
                    officialAddress = currentPatient.getAddressByKind( 'OFFICIAL' ),    //  if available
                    postalAddress = currentPatient.getAddressByKind( 'POSTAL' ),        //  postal preferred
                    poboxAddress = currentPatient.getAddressByKind( 'POSTBOX' ),        //  po box
                    validTreatments = [],

                    formData = {},               //  created from viewModel, matches docletter_T, is mapped [object]

                    allLinkedItems = Y.dcforms.mapper.objUtils.getAllLinkedActivities( currentActivity );

                function onSetup1Done( err ) {
                    if( err ) {
                        Y.log( 'Could not do setup1', 'error', NAME );
                    }
                    // adds additional data: location info, employee info
                    Y.dcforms.mapper.objUtils.setup3(formData, currentActivity, currentPatient, function( err ) {
                        if(err) {
                            Y.log('Error occured while mapping docletter into form: ' + err, 'warn', NAME );
                        } else {
                            //  add personalienfeld
                            Y.dcforms.mapper.objUtils.setup2(formData, officialAddress, postalAddress, poboxAddress );

                            // add docBlock
                            formData.docBlock = Y.dcforms.mapper.objUtils.docBlock( formData );

                            Y.dcforms.mapper.objUtils.setupFindingMedicationDiagnoses( formData, currentActivity );
                            Y.dcforms.mapper.objUtils.setQuarter( formData, currentActivity );
                            Y.dcforms.mapper.objUtils.getLabRequest( formData, currentActivity );
                            Y.dcforms.mapper.objUtils.getAU( formData, currentActivity );
                            Y.dcforms.mapper.objUtils.setBarcodeData( formData );

                            onTreatmentsLoaded( null, allLinkedItems );
                        }
                    });
                }

                //  adds address from patient object, insurance info
                Y.dcforms.mapper.objUtils.setup1(formData, currentActivity, currentPatient, officialAddress, postalAddress, poboxAddress, onSetup1Done );

                /**
                 * Helper function to add an activity's common fields to an array.
                 *
                 * Implicitly, this is the mapper for Activity_T reduced schema!
                 *
                 * @param array
                 * @param activity
                 */
                function addItem( array, activity ) {

                    array.push( {
                        'activityId': activity._id,
                        'content': _k.unwrap( activity.content ),
                        'codePlain': _k.unwrap( activity.code ),
                        'codeDisplay': _k.unwrap( activity._codeDisplay ),
                        'timestamp': _k.unwrap( activity.timestamp ),
                        'date': _moment.utc( _k.unwrap( activity.timestamp ) ).local().format( 'DD.MM.YYYY' )
                    } );

                }


                function addDiagnoses( formData, arr ) {
                    var
                        additional,
                        i, diag,
                        content,
                        site;
                    if( arr && arr.length ) {
                        formData.diagnosesShort = '';
                        formData.diagnosesText = '';
                        formData.diagnoses = '';
                        // add diagnoses
                        for( i = 0; i < arr.length; i++ ) {
                            if( 'DIAGNOSIS' === _k.unwrap( arr[i].actType ) &&
                                // MOJ-11762: exclude invalidated, and invalidating DIAGNOSES
                                !Y.doccirrus.schemas.activity.isInvalidatedOrInvalidatingDiagnosis( arr[i] ) ) {

                                additional = arr[i].diagnosisCert ? ' ' + Y.doccirrus.kbvcommonutils.mapDiagnosisCert( _k.unwrap( arr[i].diagnosisCert ) ) : '';
                                site = arr[i].diagnosisSite ? _k.unwrap( arr[i].diagnosisSite ) : '';
                                site = site.length ? ' ' + site[0] : '';  // just take the first letter
                                additional += site;
                                diag = _k.unwrap( arr[i].code ) + additional;
                                content = _k.unwrap( arr[i].content );

                                formData.diagnoses = formData.diagnoses + '**' +
                                                     diag + '**: ' +
                                                     content + "\n";
                                formData.diagnosesShort = ( formData.diagnosesShort ?
                                    formData.diagnosesShort += ', ' + diag :
                                    formData.diagnosesShort += diag
                                    );
                                formData.diagnosesText = formData.diagnosesText + content +
                                                         (_k.unwrap( arr[i].explanations ) ?
                                                         ' B: ' + _k.unwrap( arr[i].explanations ) :
                                                             '') +
                                                         "\n";
                                Y.log( 'DIAG /// Adding ' + diag + '  /// ' + content, 'debug', NAME );
                            }
                        }
                    }

                }

                /**
                 *  Called when all linked treatments have been loaded, ready to make table
                 *
                 *  Note: now also allowing diagnosis types, not used in table but to use in ICDs string
                 *
                 *  @param  err                 {String}    Error message or null
                 *  @param  newActivitiesSet    {Object}    Array of plain activity objects
                 */

                function onTreatmentsLoaded( err, newActivitiesSet ) {

                    if( err ) {
                        Y.log( err, 'error', NAME );
                        Y.doccirrus.comctl.setModal( 'Behandlungen konnten nicht geladen werden.', err );
                        return;
                    }

                    activities = newActivitiesSet;

                    var
                        ok,
                        activity,
                        i;

                    // setup tables bindings
                    formData.findingsTable = [];
                    formData.historiesTable = [];
                    formData.medicationsTable = [];
                    formData.treatmentsTable = [];
                    formData.diagnosesTable = [];
                    formData.proceduresTable = [];
                    formData.formsTable = [];
                    formData.tonometryAll = '';
                    formData.refractionAll = '';

                    addDiagnoses( formData, activities );

                    //  add items
                    for( i = 0; i < activities.length; i++ ) {

                        activity = activities[i];
                        ok = true;

                        Y.log( 'Adding activity: ' + _k.unwrap( activity.actType ), 'info', NAME );

                        if(
                            (activity._id) &&
                            (activity.actType)
                            ) {

                            switch( _k.unwrap( activity.actType ) ) {
                                case 'FINDING': /* nobreak */
                                case 'OBSERVATION':
                                    addItem( formData.findingsTable, activity );
                                    break;
                                case 'HISTORY':
                                case 'EXTERNAL':
                                case 'FROMPATIENT':
                                    addItem( formData.historiesTable, activity );
                                    break;
                                case 'DIAGNOSIS':
                                    // MOJ-11762: exclude invalidated, and invalidating DIAGNOSES
                                    if( !Y.doccirrus.schemas.activity.isInvalidatedOrInvalidatingDiagnosis( activity ) ) {
                                        addItem( formData.diagnosesTable, activity );
                                    }
                                    break;
                                case 'PROCEDERE':
                                    addItem( formData.proceduresTable, activity );
                                    break;
                                case 'MEDICATION':
                                    addItem( formData.medicationsTable, activity );
                                    break;
                                case 'TREATMENT':
                                    addItem( formData.treatmentsTable, activity );
                                    break;
                                case 'FORM':
                                    addItem( formData.formsTable, activity );
                                    break;
                                case 'OPHTHALMOLOGY_TONOMETRY':
                                    formData.tonometryAll = _k.unwrap( activity.content );
                                    break;
                                case 'OPHTHALMOLOGY_REFRACTION':
                                    formData.refractionAll = _k.unwrap( activity.content );
                                    // add ophthalmology
                                    Y.dcforms.mapper.objUtils.getOpthalmology( formData, activity );

                                    break;
                                default:
                                    ok = false;
                            }

                            if( ok ) {
                                validTreatments.push( activity );
                            }

                        } else {
                            Y.log( 'Invalid item(s) in activity table: ' + _k.unwrap( activity.actType ), 'warn', NAME );
                        }
                    }

                    Y.log( 'Mapping allowed DocLetter activities: ' +
                           JSON.stringify( formData.findingsTable ) + ' \n' +
                           JSON.stringify( formData.historiesTable ) + ' \n' +
                           JSON.stringify( formData.medicationsTable ) + ' \n' +
                           JSON.stringify( formData.treatmentsTable ) + ' \n' +
                           JSON.stringify( formData.proceduresTable ) + ' \n' +
                           JSON.stringify( formData.diagnosesTable ) + ' \n' +
                           JSON.stringify( formData.formsTable ) + ' \n',
                        'debug', NAME );
                    //Y.log( 'Number of rows, filtered: ' + mArray.length, 'debug', NAME );

                    //  add date ranges for treatment
                    addDateRange();

                    //  map to form
                    onFormDataComplete();

                }

                /**
                 *  Add date range for treatments
                 */

                function addDateRange() {

                    var
                        i;

                    if( 0 === validTreatments.length ) {
                        formData.from = '';
                        formData.to = '';
                        return;
                    }

                    formData.from = -1;
                    formData.to = -1;

                    for( i = 0; i < validTreatments.length; i++ ) {
                        formData.from = (-1 === formData.from) ? _k.unwrap( validTreatments[i].timestamp ) : formData.from;
                        formData.to = (-1 === formData.to) ? _k.unwrap( validTreatments[i].timestamp ) : formData.to;

                        formData.from = (_k.unwrap( validTreatments[i].timestamp < formData.from) ? _k.unwrap( validTreatments[i].timestamp ) : formData.from );
                        formData.to = (_k.unwrap( validTreatments[i].timestamp > formData.to) ? _k.unwrap( validTreatments[i].timestamp ) : formData.to );
                    }

                    formData.from = _moment.utc( formData.from ).local().format( 'DD.MM.YYYY' );
                    formData.to = _moment.utc( formData.to ).local().format( 'DD.MM.YYYY' );

                }

                /**
                 *  Called when all sub-tasks and linked data has been loaded and mapped
                 */

                function onFormDataComplete() {
                    //Y.doccirrus.nav.activateElement( 'activityDetailMenu', 'prescriptionform' );

                    //  after mapping the form document should be updated

                    function onFormMapped(err) {
                        if (err) {
                            //  form event with empty response prevents server zombie on error
                            Y.log( 'Could not map the form from current activity: ' + err, 'warn', NAME );
                            template.raise( 'mapcomplete', {} );
                            callback(err);
                            return;
                        }

                        //alert('update formDoc after map: ' + JSON.stringify(template.toDict()));

                        context.attachments.updateFormDoc( context, template, onFormRestored );
                    }

                    //  called when form values restored from save or copied from activity

                    function onFormRestored(err) {
                        if (err) {
                            //  form event with empty response prevents server zombie on error
                            Y.log( 'Could not load or create form document: ' + err, 'warn', NAME );
                            template.raise( 'mapcomplete', {} );
                            callback(err);
                            return;
                        }

                        template.render( onTemplateRendered );
                    }

                    //  called when form is displayed (client) or ready for export to PDF (server)

                    function onTemplateRendered() {
                        template.raise( 'formDocumentLoaded', formDoc );
                        template.raise( 'mapcomplete', unmap() );
                        callback(null);
                    }

                    if (!formData.diagnosesShort || '' === formData.diagnosesShort) {
                        formData.diagnosesShort = ' ';
                    }

                    //  map values into form
                    //Y.log('Mapping values into docletter: ' + JSON.stringify(formData, 'undefined', 2), 'debug', NAME);
                    originalFormData = JSON.parse( JSON.stringify( formData ) );
                    //alert('mapping data: ' + JSON.stringify(originalFormData));
                    template.map( formData, true, onFormMapped );

                }

            }

            /**
             *  Returns the current contents of a form as a plain javascript object
             *
             *  @returns    {Object}    Returned object will mmatch Innvoice_T
             */

            function unmap() {
                return template.unmap();
            }

            //  EVENT HANDLING - update currentActivity in response to changes by user

            /**
             *  Template events are passed by the parent
             *
             *  LEGACY: to be removed
             *
             *  @param  eventName   {String}
             *  @param  eventData   {Object}
             */

            function onTemplateEvent( eventName, eventData ) {

                Y.log( 'docletter mapper received event: ' + eventName, 'debug', NAME );

                switch( eventName ) {

                    case 'onElementValueSet':                                               //  fallthrough
                    case 'onElementValueChanged':
                        onElementValueChanged( eventData );
                        break;
                    case 'onModeSet':
                        onModeSet( eventData );
                        break;

                    case 'onSchemaSet':
                        Y.log( 'Schema has been set.', 'debug', NAME );
                        break;

                    case 'onTableValueChanged':
                        // cannot type in table.
                        break;

                    case 'beforeUnload':
                        onUnload( eventData );
                        break;

                    default:
                        //  noisy, used when debuggiong subforms
                        //Y.log( 'Unhandled template event: ' + eventName, 'warn', NAME );
                        break;
                }

            }

            /**
             *  Clear and knockout dependencies for a clean close
             *  @/param formUID
             */

            function onUnload( /* formUID */ ) {

                if (Y.dcforms.isOnServer) {
                    return;
                }

                var i;
                // all these subscriptions must be moved into the
                // koUtils (MOJ-1985)
                for( i = 0; i < koSubscriptions.length; i++ ) {
                    koSubscriptions[i].dispose();
                }
                koSubscriptions = [];
                // reset ko mapper
                Y.dcforms.mapper.koUtils.resetKoForMapper();

                // dispose all template events subscribed from this mapper
                template.off( '*', 'dcforms-map-docletter' );
            }

            /**
             *  Raised when the user changes the value of a form element
             *
             *  This includes all elements and types (checking a box, entering text in an input. etc)
             *
             *  DEPRECATED: previous event system, will be removed after testing of server-side form doc loading
             *
             *  @param  element {Object}    The dcforms-element object which changed
             */

            function onElementValueChanged( element ) {

                //Y.log( 'CHANGED! ' + element.schemaMember, 'debug', NAME );

                switch( element.schemaMember ) {

                    default:
                        //  not bound to anything, or not relevant to docletter
                        Y.log( 'Form element is not bound to mapped object, or not handled ' + element.domId, 'debug', NAME );
                        break;
                }

            }

            function updateBarCode( data ) {
                var keys = Object.keys( data ),
                    updated = false,
                    orgData = originalFormData ? JSON.parse( JSON.stringify( originalFormData ) ) : {},
                    mergedData = Y.aggregate( orgData, data, true ),
                    barcode;

                keys.forEach( function( key ) {
                    if( 0 === key.indexOf( 'barcode' ) ) {
                        barcode = Y.dcforms.mapper.objUtils.getBarcode( key, mergedData );
                        if( barcode ) {
                            data[key] = barcode;
                            updated = true;
                        }
                    }
                } );

                return updated;
            }

            /**
             *  Raised in response to user changing the value of form elements
             */

            function onFormValueChanged( element ) {

                //  prevent any changes to the activity if not editable / after approval
                if( !currentActivity._isEditable() ) {

                    if (formDoc && formDoc.type) {
                        try {
                            template.fromDict( Y.doccirrus.api.document.formDocToDict(formDoc), onRestoreFromDict );
                        } catch( parseErr ) {
                            Y.log( 'Could not parse saved form state.', 'warn', NAME );
                        }
                    }

                    return;
                }

                function onRestoreFromDict( err ) {
                    if ( err ) {
                        Y.log( 'Problem restoring form from dict: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    template.render( onResetToStoredData );
                }

                // prevent barcode from dirtying approved activity
                if( 'barcode' === element.elemType && false === currentActivity._isEditable() ) {
                    return;
                }

                //  user actions may need to be passed back into the forms
                if (currentActivity._isEditable() && element.schemaMember && '' !== element.schemaMember) {
                    switch (currentActivity.actType()) {
                        case 'AU':
                            updateAUFromForm(element);
                            break;

                        case 'FORM':                //  deliberate fallthrough
                        case 'LABREQUEST':
                            updateLABREQUESTFromForm(element);
                            break;
                    }
                }

                //  add change to the mapped values
                var data = template.unmap();

                if( data && updateBarCode( data ) ) {

                    Y.log('remap data, refreshing', 'debug', NAME);
                    template.map( data, false, function( err ) {
                        if( err ) {
                            Y.log( 'could not remap form on form value change', 'error', NAME );
                        }
                        template.render(Y.dcforms.nullCallback);
                        Y.log( 'remapped form on form value change', 'info', NAME );
                    } );
                }

                function onResetToStoredData() {
                    Y.log( 'Form reset to state before edit.', 'debug', NAME );
                }

                function onUpdatedFormData() {
                    Y.log( 'Saved form state has been updated.', 'debug', NAME );
                }

                //alert('update formDoc onFormValueChanged');
                context.attachments.updateFormDoc( context, template, onUpdatedFormData );
            }

            /**
             *  Raised when an editable AU form is changed by uiser
             */

            function updateAUFromForm() {
                //  AU forms should be locked, nothing to do gere at present
                Y.log('AU form should be locked.', 'warn', NAME);
            }

            /**
             *  Raised when an editable LABREQUEST form is changed by uiser
             *  @param  element     {Object}    dcforms element which has been changed
             */

            function updateLABREQUESTFromForm(element) {

                Y.log('User edit to LABREQUEST ' + element.elemId + ' (' + element.schemaMember + ')', 'debug', NAME);

                //switch (element.schemaMember) {
                    //case 'bb':
                    //case 'fk4202':  currentActivity.fk4202(element.unmap());        break;
                    //case 'notfall': currentActivity.notfall(element.unmap());       break;
                    //case 'unfall': currentActivity.unfall(element.unmap());       break;
                    //case 'isBVG':   currentActivity.insurance.costCarrierBillingSection(element.unmap());         break;
                //}
            }

            /**
             *  Called by kockout when the user selects or deselects items in the datatable
             *
             *  Re-maps activity into form
             *
             *  @/param  newSelection    {String}    Set of _ids of selected items
             */

            function onSelectionChanged( /*newSelection*/ ) {
                // uncommenting the following line will crash, because of mixed objects and observableObjects.
                //Y.log( 'Selection changed to: ' + JSON.stringify( newSelection, undefined, 2 ), 'debug', NAME );

                function onReMapped(err) {
                    if (err) {
                        Y.log( 'Could not map new selection into form: ' + JSON.stringify(err), 'warn', NAME );
                        return;
                    }

                    context.attachments.updateFormDoc( context, template, onUpdatedFormData );
                    template.raise( 'mapcomplete', template.unmap() );
                }

                function onUpdatedFormData(err) {
                    if (err) {
                        Y.log( 'Problem updating saved form state: ' + JSON.stringify(err), 'warn', NAME );
                    }
                }

                if( currentActivity.inTransition() ) {
                    Y.log( 'Activity is in transition, not remapping form.', 'info', NAME );
                    return;
                }

                if( false === currentActivity._isEditable() ) {
                    Y.log( 'docletter is not in an editable state, not remapping', 'warn', NAME );
                    return;
                }

                //  note that this will check the validity of treatments as they are added
                map( onReMapped );
            }

            /**
             *  Change form editable state according to activity status
             *  @param   newState    {String}    A member of ActStatus_E
             */

            function onStateChanged( newState ) {

                function onNewModeSet() {
                    Y.log( 'Form mode changed to: ' + template.mode, 'debug', NAME );
                }

                var editable = false;

                switch( newState ) {
                    case 'CREATED':     editable = true;    break;
                    case 'VALID':       editable = true;    break;
                }

                switch (_k.unwrap(currentActivity.actType)) {
                    case 'AU':          editable = false;   break;
                    case 'LABREQUEST':  editable = false;   break;
                }

                if( editable ) {
                    Y.log( 'set form editable for docletter state ' + newState, 'info', NAME );
                    if ('fill' !== template.mode) {
                        template.setMode( 'fill', onNewModeSet );
                    }
                } else {
                    Y.log( 'set form uneditable for docletter state ' + newState, 'info', NAME );
                    if ('locked' !== template.mode) {
                        template.setMode( 'locked', onNewModeSet );
                    }
                }
            }

            /**
             *  Prevent changes cased by PDF rendering or other mode changes from being saved
             *
             *  Note that this view should only see 'fill' and 'pdf' modes, and require no action at present
             *
             *  @param  mode    {String}    Name of a template mode
             */

            function onModeSet( mode ) {
                if ('shutdown' === mode) {
                    onUnload();
                }
            }

            //  RETURN MAPPER INTERFACE  / API

            return {
                'map': map,
                'unmap': unmap,
                'destroy': onUnload,
                'handleEvent': onTemplateEvent
            };

        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [
            'oop',
            'dc-comctl',
            'dcforms-map-casefile',
            'dcformmap-util',
            'dcformmap-ko-util',
            'document-api'
        ]
    }
);