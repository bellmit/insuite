/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Used by CaseFile to map general activity and patient data into custom and KBV forms
 *
 *  Important detail: after mapping the 'mapcomplete' event is raised - this is also raised when restoring the
 *  form state from a 'FORM' document attached to an activity, since this signal is used on the server to indicate
 *  that the form is mapped and ready for PDF render (ie, mapping was done previously and saved, and is complete).
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*jshint latedef:false */
/*global YUI, moment */

YUI.add(
    /* YUI module name */
    'dcforms-map-casefile',

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
        Y.namespace( 'dcforms.mapper' ).casefile = function( template, context ) {

            Y.log( 'Create CaseFile mapper', 'debug', NAME );

            //  PRIVATE MEMBERS

            var
                currentActivity = context.activity,
                currentPatient = context.patient,

                koSubscriptions = [],   //  holds KO subscriptions so they can be removed on unload [array]
            //  formMode = 'fill',      //  will usually be 'fill' or 'pdf', may be 'shutdown' as page closed
                formDoc = null,
                _k = Y.dcforms.mapper.koUtils.getKo();

            //  INITIALIZATION

            // init KO
            Y.dcforms.mapper.koUtils.initKoForMapper( map, context, template );
            // set up active docblock
            Y.dcforms.mapper.koUtils.activateKoForMapper();

            if (false === Y.dcforms.isOnServer) {

                //  subscribe to the set of linked activities
                //koSubscriptions.push( currentActivity.activities.subscribe( onSelectionChanged ) );
                koSubscriptions.push( currentActivity._activitiesObj.subscribe( onSelectionChanged ) );
                koSubscriptions.push( currentActivity.timestamp.subscribe( onSelectionChanged ) );

                //  subscribe to state changes
                koSubscriptions.push( currentActivity.status.subscribe( onStateChanged ) );

                if ('UTILITY' === _k.unwrap(currentActivity.actType)) {
                    //  lock the form to editing
                    template.setMode('locked', Y.dcforms.nullCallback);
                    subscribeToUtilityActivity();

                } else if('LABREQUEST' === _k.unwrap(currentActivity.actType) || 'REFERRAL' === _k.unwrap(currentActivity.actType)){
                    template.setMode('locked', Y.dcforms.nullCallback);
                    subscribeToLabRequestActivity();
                } else if('AU' === _k.unwrap(currentActivity.actType)) {
                    template.setMode('locked', Y.dcforms.nullCallback);
                    subscribeToAUActivity();
                } else {
                    //  subscribe to user-driven changes in form values
                    template.on( 'valueChanged', 'dcforms-map-casefile', onFormValueChanged );
                }

                template.on( 'modeSet', 'dcforms-map-casefile', onModeSet );
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
                        Y.log( 'Problem loading from dict: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    if ('UTILITY' === _k.unwrap(currentActivity.actType)) {
                        needsRemap = true;
                    }

                    if (true === needsRemap) {
                        Y.log('remapping / no form document was present on load', 'debug', NAME);
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
                        template.raise( 'mapperinitialized', {} );
                        return;
                    }

                    template.render( onTemplateRendered );
                }

                //  called when form is displayed (client) or ready for export to PDF (server)

                function onTemplateRendered() {
                    var unmapData = unmap();
                    template.raise( 'formDocumentLoaded', formDoc );
                    template.raise( 'mapcomplete', unmapData );
                    template.raise( 'mapperinitialized', unmapData );
                }
            }

            //  PUBLIC METHODS

            /**
             *  Fill a form with the contents of this passed object
             *
             *  @param  callback        {Function}  Optional, called when form mapped.
             */

            function map( callback ) {

                Y.log( 'Mapping CaseFile into form: ' + context.bindCollection + '::' + context.bindId, 'debug', NAME );

                var

                    childMapFns = [],
                    formData = {},               //  created from viewModel, matches CaseFile_T, is mapped [object]
                    subTypes = template.getSubTypes(),
                    getAddressByKind = Y.doccirrus.schemas.patient.getAddressByKind,
                    officialAddress = getAddressByKind( currentPatient, 'OFFICIAL' ),   //  if available
                    postalAddress = getAddressByKind( currentPatient, 'POSTAL' ),       //  postal preferred
                    poboxAddress = getAddressByKind( currentPatient, 'POSTBOX' );       // po box

                if( !callback ) {
                    callback = function( err ) {
                        if( err ) {
                            Y.doccirrus.comctl.setModal( 'Could not map form', err, true );
                            Y.log( 'Error while mapping form: ' + err, 'warn', NAME );
                        }
                    };
                }

                // one of the first things to do is decide which childMappers to employ for this data
                // currently hardwired to subTypes and UT
                childMapFns.push( addChildSubType, addChildUT );

                if ('UTILITY' === _k.unwrap( context.activity.actType )) {
                    // must also clear these fields.
                    Y.dcforms.mapper.objUtils.getUtilityTherapies( formData, context.activity );

                } else {
                    // must also clear these fields.
                    Y.dcforms.mapper.objUtils.getUtilityTherapies( formData, {} );
                }

                /**
                 *
                 * This is the only loop in the mapper over child activities.
                 *
                 * Depending on the template and data, different mapFns will steer
                 * what is mapped into formData.
                 *
                 */
                function mapChildActivities( formData, activities, mapFns ) {
                    var i, j;

                    for( i = 0; i < activities.length; i++ ) {
                        for( j=0; j < mapFns.length ; j++ ) {
                            mapFns[j]( formData, activities[i] );
                        }
                    }
                }

                /**
                 *  Given an activity, add it (filter it) into the relevant lists of
                 *  subtypes
                 *
                 *  This is provisional/experimental, the set of mapped fields will probably be expanded in future
                 *
                 *  @param  formData  {Object}
                 *  @param  activity  {Object}
                 */

                function addChildSubType(formData, activity) {
                    var
                        filtered;          //  return value

                    function processSubType(subType) {
                        if (activity.subType && _k.unwrap( activity.subType ) === subType) {
                            filtered = {
                                'activityId': activity._id,
                                'date': moment.utc( _k.unwrap( activity.timestamp ) ).local().format( 'DD.MM.YYYY' ),
                                'code': _k.unwrap( activity.catalogRef ) || '',
                                'content': removeTag(subType, (_k.unwrap( activity.content ) || ''))
                            };
                        }

                        if( !Array.isArray(formData['selectedActsTable:' + subType]) ) {
                            formData['selectedActsTable:' + subType] = [];
                        }
                        formData['selectedActsTable:' + subType].push( filtered );
                        //console.log('filtering subtype ' + subType + ': ');
                        //console.log(activity);
                    }
                    subTypes.forEach( processSubType );
                }

                /**
                 * Given an activity, add the UT fields to the formData.
                 *
                 *  NOTE:  this is a new Pattern in which all child adding
                 *  from all mappers needs to be refactored to. (within the scope of MOJ-1985)
                 *
                 * @param formData
                 * @param activity
                 */
                function addChildUT(formData, activity) {
                    if(
                        (activity._id) &&
                        (activity.actType) &&
                        ('UTILITY' === _k.unwrap(activity.actType) )
                    ) {
                        Y.dcforms.mapper.objUtils.getUtilityTherapies( formData, activity );
                    }

                }

                function removeTag(tagName, content) {
                    return content.replace(tagName + ':', '');
                }

                /**
                 *  Represent an array of linked activities of some subType as a string, for mapping into text type
                 *  form elements.
                 *
                 *  This is provisional/experimental, the format may change in future
                 *
                 *  @param actArray
                 *  @returns {string}
                 */

                function flattenSubType(actArray) {
                    var actString = '', i;
                    for (i = 0; i < actArray.length; i++) {
                        actString = actString + actArray[i].content + "\n\n";
                    }
                    return actString;
                }

                /**
                 *  Called when all linked activities have been loaded
                 *
                 *  Note: now also allowing diagnosis types, not used in table but to use in ICDs string
                 *
                 *  @param  err                 {String}    Error message or null
                 *  @param  newActivitySet      {Object}    Array of plain activity objects
                 */

                function onActivitiesLoaded( err, newActivitySet ) {

                    if( err ) {
                        callback( 'Could not load activities' + err );
                        return;
                    }

                    Y.log( 'Loaded ' + newActivitySet.length + ' linked activities.', 'debug', NAME );

                    //  map any subType sets used by the current form

                    var
                        i;

                    mapChildActivities( formData, newActivitySet, childMapFns );

                    for (i = 0; i < subTypes.length; i++) {
                        formData['selectedActsString:' + subTypes[i]] = flattenSubType(formData['selectedActsTable:' + subTypes[i]]);
                    }

                    //  count linked activities

                    formData.numLinkedActivities = newActivitySet.length;

                    //  late change to query full employee record after loading activities

                    formData.employeeId = _k.unwrap( currentActivity.employeeId );

                    Y.dcforms.mapper.objUtils.setup3( formData, currentActivity, currentPatient, onFormDataComplete );

                }

                /**
                 *  Called when all sub-tasks and linked data has been loaded and mapped
                 */

                function onFormDataComplete() {

                    function onMapComplete( err ) {

                        if( err ) {
                            Y.log( 'Error mapping values into form: ' + err, 'warn', NAME );
                            callback( err );
                            return;
                        }

                        //  parent binder and other listeners may need to know when object has
                        //  been loaded, raise event through template

                        template.raise('mapcomplete', formData);
                        callback( null, formData );

                    }

                    Y.dcforms.mapper.objUtils.setup2( formData, officialAddress, postalAddress, poboxAddress );
                    Y.dcforms.mapper.objUtils.setupFindingMedicationDiagnoses( formData, currentActivity );
                    Y.dcforms.mapper.objUtils.setQuarter( formData, currentActivity );
                    Y.dcforms.mapper.objUtils.getLabRequest( formData, currentActivity );
                    Y.dcforms.mapper.objUtils.getAU( formData, currentActivity );
                    Y.dcforms.mapper.objUtils.setBarcodeData( formData );

                    formData.docBlock = Y.dcforms.mapper.objUtils.docBlock( formData );

                    //console.log('mapping:', formData);

                    originalFormData = JSON.parse( JSON.stringify( formData ) );

                    //  map values into form

                    template.map( formData, true, onMapComplete );
                }

                function onSetup1Done( err ) {
                    if( err ) {
                        Y.log( 'Could not do setup1', 'error', NAME );
                        return callback( err );
                    }

                    //  now synchronous, linked activities are on viewModel
                    onActivitiesLoaded( null, _k.unwrap( context.activity._activitiesObj ) );
                }

                //  add patient bio
                Y.dcforms.mapper.objUtils.setup1( formData, currentActivity, currentPatient, officialAddress, postalAddress, poboxAddress, onSetup1Done );
            }

            /**
             *  Returns the current contents of a form as a plain javascript object
             *
             *  @returns    {Object}    Returned object will mmatch Innvoice_T
             */

            function unmap() {
                return template.unmap();
            }

            /**
             *  UTILITY type activities are mapped live - updates to the activity should reflect immedately in the
             *  form, which is locked to manual editing
             */

            function subscribeToUtilityActivity() {

                function onUtilActChanged() {
                    if (!currentActivity._isEditable()) {
                        return;
                    }

                    map( onFormMapped );
                }

                function onFormMapped(err) {
                    if (err) {
                        Y.log( 'Could not map the form from current utility activity: ' + err, 'warn', NAME );
                        return;
                    }

                    context.attachments.updateFormDoc( context, template, onFormDocUpdateLive );
                }

                function onFormDocUpdateLive(err) {
                    if (err) {
                        //  form event with empty response prevents server zombie on error
                        Y.log( 'Could update utility form document: ' + err, 'warn', NAME );
                    }
                }

                var
                    utilActFields = [
                        "timestamp",
                        "locationId",
                        "employeeId",
                        'userContent',
                        'catalogShort',
                        'utPrescriptionType',
                        'utNoNormalCase',
                        'utHomeVisit',
                        'utGroupTherapy',
                        'utTherapyReport',
                        'utMedicalJustification',
                        'utTherapyGoals',
                        'utRemedy1Name',
                        'utRemedy1Explanation',
                        'utRemedy1PerWeek',
                        'utRemedy1Seasons',
                        'utRemedy2Name',
                        'utRemedy2Explanation',
                        'utRemedy2PerWeek',
                        'utRemedy2Seasons',
                        'utTherapyGoals',
                        'utLatestStartOfTreatment',
                        'utVocalTherapy',
                        'utSpeakTherapy',
                        'utSpeechTherapy',
                        'utDurationOfSeason',
                        'utDiagnosisName',
                        'utUnfall',
                        'utBvg'
                    ],
                    i;

                for (i = 0; i < utilActFields.length; i++) {
                    if (currentActivity[utilActFields[i]]) {
                        Y.log('Subscribing mapper to UTILITY property: ' + utilActFields[i], 'debug', NAME);
                        koSubscriptions.push(currentActivity[utilActFields[i]].subscribe(onUtilActChanged));
                    } else {
                        Y.log('Could not subscribe to UTILITY property, missing: ' + utilActFields[i], 'debug', NAME);
                    }
                }
            }

            function subscribeToLabRequestActivity() {
                function onActChanged() {
                    if( !currentActivity._isEditable() ) {
                        return;
                    }

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
                        "timestamp", "locationId", "employeeId", "kontrollunters", "abnDatumZeit", "befEilt", "befEiltTel", "befEiltFax", "edtaGrBlutbild", "edtaKlBlutbild", "edtaHbA1c", "edtaReti", "edtaBlutsenkung", "citratQu", "citratQuMarcumar", "citratThrombin", "citratPTT", "citratFibri", "svbAlkPhos", "svbAmylase", "svbASL", "svbBiliD", "svbBiliG", "svbCalc", "svbCholesterin", "svbCholin", "svbCK", "svbCKMB", "svbCRP", "svbEisen", "svbEiwE", "svbEiwG", "svbGammaGT", "svbGlukose", "svbGOT", "svbGPT", "svbHarnsäure", "svbHarnstoff", "svbHBDH", "svbHDL", "svbLgA", "svbLgG", "svbLgM", "svbKali", "svbKrea", "svbKreaC", "svbLDH", "svbLDL", "svbLipase", "svbNatrium", "svbOPVorb", "svbPhos", "svbTransf", "svbTrigl", "svbTSHBasal", "svbTSHTRH", "glu1", "glu2", "glu3", "glu4", "urinStatus", "urinMikroalb", "urinSchwTest", "urinGlukose", "urinAmylase", "urinSediment", "sonstiges", "sonstigesText", "labRequestType", "ggfKennziffer", "behandlungGemaess", "auftrag", "scheinSlipMedicalTreatment", "fk4202", "fk4204", "scheinRemittor", "scheinEstablishment", "untersArt", "auBis", "datumOP", "ueberwAn", "harnStreifenTest", "nuechternPlasmaGlukose", "lipidprofil"],
                    i;

                for( i = 0; i < actFields.length; i++ ) {
                    if (currentActivity[actFields[i]]) {
                        Y.log( 'Subscribing mapper to LABREQUEST property: ' + actFields[i], 'debug', NAME );
                        koSubscriptions.push( currentActivity[actFields[i]].subscribe( onActChanged ) );
                    } else {
                        Y.log( 'Could not subscribe mapper to LABREQUEST property, missing: ' + actFields[i], 'warn', NAME );
                    }
                }

            }

            function subscribeToAUActivity() {
                function onActChanged() {
                    if( !currentActivity._isEditable() ) {
                        return;
                    }

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
                        Y.log( 'Could update utility form document: ' + err, 'warn', NAME );
                    }
                }

                var
                    actFields = [
                        "timestamp","locationId","employeeId","auType","erstBesch","folgeBesc","arbeitsunfall",
                        "durchgangsarzt","auVon","auVorraussichtlichBis","festgestelltAm","sonstigerUnf","bvg","rehab",
                        "reintegration","massnahmen","diagnosesAdd", "krankengeld", "endBesch"
                    ],
                    i;

                for( i = 0; i < actFields.length; i++ ) {
                    if (currentActivity[actFields[i]]) {
                        Y.log( 'Subscribing mapper to AU property: ' + actFields[i], 'debug', NAME );
                        koSubscriptions.push( currentActivity[actFields[i]].subscribe( onActChanged ) );
                    } else {
                        Y.log( 'Could not subscribe to AU property, missing: ' + actFields[i], 'warn', NAME );
                    }
                }

            }


            //  EVENT HANDLING - update currentActivity in response to changes by user

            /**
             *  Template events are passed by the parent
             *
             *  @param  eventName   {String}
             *  @param  eventData   {Object}
             */

            function onTemplateEvent( eventName, eventData ) {

                Y.log( 'CaseFile mapper received event: ' + eventName, 'debug', NAME );

                switch( eventName ) {

                    case 'onElementValueSet':                                               //  fallthrough
                    case 'onElementValueChanged':
                        onElementValueChanged( eventData );
                        break;

                    case 'sfonFormValueChanged':
                    case 'onFormValueChanged':
                        onFormValueChanged( eventData );
                        break;

                    case 'onSchemaSet':
                        Y.log( 'Schema has been set.', 'debug', NAME );
                        break;

                    case 'onSubformLoaded':
                        //  previous map operation may have completed before this did, we might have
                        //  to map again to get subform fields correct

                        //  note that we only map when creating the form - values should be saved in a
                        //  document after this to allow viewing on the patient portal (foundDoc will be
                        //  null until one is created)

                        //  this is a hack to allow CaseFile operation until new event listeners have
                        //  been added throughout form components

                        if( formDoc && formDoc._id ) {
                            Y.log( 'Loading previously saved form state, not remapping as that may overwrite it.', 'debug', NAME );
                        } else {
                            map(Y.dcforms.nullCallback );
                        }

                        break;

                    case 'onMappedObjectLoaded':
                        //  if there is a document holding the state of this form, it needs to be updated to
                        //  reflect the mapped values

                        if( ('object' === typeof formDoc) && (null !== formDoc) ) {
                            onFormValueChanged( { 'elemId': template.formId } );
                        } else {
                            Y.log( 'Cannot save mapped values, no document to keep them in.', 'debug', NAME );
                        }

                        break;

                    case 'beforeUnload':
                        onUnload( eventData );
                        break;

                    //case 'onPageSelected':                                                  //  fallthrough
                    //    break;

                    //default:
                    //    //noisy, used when debugging subforms
                    //    Y.log( 'Unhandled template event: ' + eventName, 'warn', NAME );
                    //    break;
                }

            }

            function updateBarCode( data ) {
                var keys = Object.keys( data ),
                    updated = false,
                    orgData = JSON.parse( JSON.stringify( originalFormData ) ),
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
             *
             *  TODO: tidy and reorder with async
             */

            function onFormValueChanged( element ) {
                if( 'barcode' === element.elemType ) {
                    return;
                }

                var data = template.unmap();
                if( originalFormData && updateBarCode( data ) ) {
                    template.map( data, true, onRemapForBarcode );
                }

                function onRemapForBarcode( err ) {
                    if( err ) {
                        Y.log( 'could not remap form on form value change', 'error', NAME );
                    }
                    Y.log( 'remapped form on form value change', 'info', NAME );
                }

                function onUpdatedFormData() {
                    Y.log( 'Saved form state has been updated.', 'debug', NAME );
                }

                function onResetFromDict( err ) {
                    if ( err ) { Y.log( 'Error unserializing formDoc: ' + JSON.stringify( err ), 'warn', NAME ); }
                    template.render( onResetRerender );
                }

                function onResetRerender() {
                    Y.log( 'Form reset to state before edit.', 'debug', NAME );
                }

                if( currentActivity._isEditable() ) {

                    context.attachments.updateFormDoc( context, template, onUpdatedFormData );

                } else  {

                    if ( formDoc && formDoc.type ) {
                        try {
                            template.fromDict( Y.doccirrus.api.document.formDocToDict( formDoc ), onResetFromDict );
                        } catch( parseErr ) {
                            Y.log( 'Could not parse saved form state.', 'warn', NAME );
                        }
                    }
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

                Y.dcforms.mapper.koUtils.resetKoForMapper();
                //
                // TODO: the following must all be moved out to Y.dcforms.mapper.koUtils MOJ-2945
                var i;
                for( i = 0; i < koSubscriptions.length; i++ ) {
                    koSubscriptions[i].dispose();
                }
                koSubscriptions = [];

                template.off( '*', 'dcforms-map-casefile');
            }

            /**
             *  Raised when the user changes the value of a form element
             *
             *  This includes all elements and types (checking a box, entering text in an input. etc)
             *
             *  @/param  element {Object}    The dcforms-element object which changed
             */

            function onElementValueChanged( /* element */ ) {

                /*   - development only
                if( ('debugdebug' === element.exportValue) || ('debugdebug<br>' === element.exportValue) ) {
                    Y.doccirrus.comctl.setModal( 'Debug', '<pre>' + JSON.stringify( lastFormData, undefined, 2 ) + '</pre>' );
                }
                */

                context.attachments.updateFormDoc( context, template, onUpdatedFormDoc );

                function onUpdatedFormDoc() {
                    Y.log( 'Updated form document in response to user event in form.', 'info', NAME );
                }
            }

            /**
             *  Called when the user selects or deselects items in the datatable
             *
             *  This is used by invoice and prescription mappers, currently only a stub in this mapper.
             *
             *  @param  newSelection    {String}    Set of _ids of selected items
             */

            function onSelectionChanged( newSelection ) {
                if( Y.config.debug ) {
                    Y.log( 'Selection changed to: ' + JSON.stringify(newSelection) + ', updating mapping...', 'debug', NAME );
                }

                function onReMapped(err) {
                    if (err) {
                        Y.log('Could not map new selection into form: ' + JSON.stringify(err), 'warn', NAME);
                        return;
                    }

                    context.attachments.updateFormDoc( context, template, onUpdatedFormData );
                    template.raise('mapcomplete', template.unmap());
                }

                function onUpdatedFormData(err) {
                    if (err) {
                        Y.log('Problem updating saved form state: ' + JSON.stringify(err), 'warn', NAME);
                    }
                }

                if (!currentActivity._isEditable()) {
                    Y.log('Activity is not in editable state, not linking to selected activity.', 'info', NAME);
                    return;
                }

                if (currentActivity.inTransition()) {
                    Y.log('Activity is in transition, not remapping form.', 'info', NAME);
                    return;
                }

                //  full remap is performed until it can be determined which childMapFn need linked activities
                map( onReMapped );
            }

            /**
             *  Raised by template when mode is changed, allowss immediate disposal of KO events when destroying a form
             *  (cause by parent view being destroyed or before replacing the form linked from an activity)
             *
             *  @param mode
             */

            function onModeSet(mode) {
                Y.log( 'Form mode changed to: ' + template.mode, 'debug', NAME );
                if ('shutdown' === mode) {
                    //  dispose of all KO and template events
                    Y.log('Form ' + template.canonicalId + ' is being shut down, disposing events', 'debug', NAME);
                    onUnload();
                }
            }

            /**
             *  Change form editable state according to activity status
             *  @param   newState    {String}    A member of ActStatus_E
             */

            function onStateChanged( newState ) {

                if( currentActivity._isEditable() ) {
                    Y.log( 'set form editable for CaseFile state ' + newState, 'info', NAME );
                    template.setMode( 'fill', Y.dcforms.nullCallback );
                } else {
                    Y.log( 'set form uneditable for CaseFile state ' + newState, 'info', NAME );
                    template.setMode( 'locked', Y.dcforms.nullCallback );
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
            'document-api'
        ]
    }
);