/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Maps a prescription activity into a form along with a table of linked medications
 *
 *  Note that prescriptions were previously mapped on every load, are now mapped on creation and the form state saved
 *  to a FORM type document attachment.  The form is partially remapped on change of linked activities.
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*jshint latedef:false */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-map-prescription',

    /* Module code */
    function( Y, NAME ) {
        'use strict';

        /**
         *  Factory for mapper objects
         *
         *  @param  template    {Object}    Form template
         *  @param  context     {Object}    Set of viewmodels providing values for prescription forms
         */

        Y.namespace( 'dcforms.mapper').prescription = function( template, context ) {
            //  PRIVATE MEMBERS

            var
                currentActivity = context.activity,
                currentPatient = context.patient,

                formData = {},                      //  created from viewModel [object]
                medications = [],                   //  array of linked activities
                koSubscriptions = [],               //  listeners for changes to viewmode
                formDoc = null,

                _moment = Y.dcforms.mapper.objUtils.getMoment(),
                _k = Y.dcforms.mapper.koUtils.getKo();


            if (false === Y.dcforms.isOnServer) {

                //  subscribe to observables which may change outside of this mapped form (ie, datatable changes)
                koSubscriptions.push(currentActivity._activitiesObj.subscribe(onActivitiesChanged));
                koSubscriptions.push(currentActivity.status.subscribe(onStateChanged));

                //  subscribe to user-driven changes in form values
                template.on( 'valueChanged', 'dcforms-map-prescription', onFormValueChanged );
                //  subscribe to changes in form mode, to dispose of events on shutdown
                template.on( 'modeSet', 'dcforms-map-prescription', onModeSet );
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

                Y.log( 'Loading saved data: ' + JSON.stringify(Y.doccirrus.api.document.formDocToDict(formDoc)), 'warn', NAME );
                template.fromDict( Y.doccirrus.api.document.formDocToDict( formDoc ), onLoadFromDict );

                function onLoadFromDict( err ) {
                    if ( err ) {
                        Y.log( 'Problem loading form from formDoc: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
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
                        return;
                    }

                    Y.log('Form state initialized, redrawing in mode: ' + template.mode, 'debug', NAME);
                    template.render( onTemplateRendered );
                }

                //  called when form is displayed (client) or ready for export to PDF (server)

                function onTemplateRendered() {

                    if (!Y.dcforms.isOnServer && currentActivity._isEditable()) {
                        // init KO
                        Y.dcforms.mapper.koUtils.initKoForMapper( map, context, template );
                        // set up active docblock
                        Y.dcforms.mapper.koUtils.activateKoForMapper();
                    }

                    template.raise( 'formDocumentLoaded', formDoc );
                    template.raise( 'mapcomplete', unmap() );
                }
            }

            /**
             *  Fill a form the the contents of this passed object (public)
             *
             *  @param  callback        {Function}  Of the form fn(err)
             */

            function map( callback ) {
                callback = callback || Y.dcforms.nullCallback;

                var
                //  for now will assume this was invoked from CaseFile, rather than reload this VIA rest
                    insuranceArray = _k.unwrap( currentPatient.insuranceStatus ),   //  set of all insurance records
                    insurance,                                                      //  applicable insurance details
                    policy = {},                                                    //  applicable insurance policy
                    oAddr = currentPatient.getAddressByKind( 'OFFICIAL' ),         //  if available
                    postAddr = currentPatient.getAddressByKind( 'POSTAL' ),        //  postal preferred
                    pobAddr = currentPatient.getAddressByKind( 'POSTBOX' ),        //  po box

                    i;

                //  callback from form template
                function onMapComplete( err ) {
                    if ( err ) {
                        Y.log( 'Error mapping prescription form: ' + err, 'warn', NAME );
                        return callback( err );
                    }

                    template.raise( 'mapcomplete', formData );
                    callback( null );
                }

                //  noisy, but sometimes necessary for debugging
                //Y.log( 'Loading viewModel: ' + JSON.stringify( currentActivity, undefined, 2 ), 'debug', NAME );

                //  get insurance details from current patient

                if( insuranceArray && 0 < insuranceArray.length ) {
                    if( 1 === insuranceArray.length ) {
                        insurance = insuranceArray[0];
                    } else {
                        // loop
                        for( i = 0; i < insuranceArray.length; i++ ) {
                            if( !insurance && !_k.unwrap( insuranceArray[i].policyHolder ) ) {
                                // tke the first non-policyholder as patient
                                insurance = insuranceArray[i];
                            } else if( _k.unwrap( insuranceArray[i].policyHolder ) ) {
                                policy = insuranceArray[i];
                            }
                        }
                    }
                } else {
                    insurance = {};
                }

                // get Dob standard
                //policyHolderDob = Y.dcforms.mapper.objUtils.getDob( currentPatient );

                //  adds address from patient object, insurance info
                Y.dcforms.mapper.objUtils.setup1(formData, context.activity, context.patient, oAddr, postAddr, pobAddr, onSetup1Done );

                function onSetup1Done( err ) {

                    if(err) {
                        Y.log('Error occured while mapping docletter into form: ' + err, 'warn', NAME );
                        return;
                    }

                    function onSetup3Complete() {
                        //  add personalienfeld
                        Y.dcforms.mapper.objUtils.setup2(formData, oAddr, postAddr, pobAddr );
                        // add docBlock
                        formData.docBlock = Y.dcforms.mapper.objUtils.docBlock( formData );

                        var extendBy = {
                            'activityId': '',
                            'patientName': _k.unwrap(currentPatient.fullname),
                            'firstName': _k.unwrap(currentPatient.firstname),
                            'lastName': _k.unwrap(currentPatient.lastname),
                            'gender': _k.unwrap(currentPatient.gender) || '',
                            'civilStatus': _k.unwrap(currentPatient.civilStatus) || '',
                            'lang': _k.unwrap(currentPatient.lang) || '',
                            'jobTitle': _k.unwrap(currentPatient.jobTitle) || '',
                            'workingAt': _k.unwrap(currentPatient.workingAt) || '',
                            'addresses': _k.unwrap(currentPatient.addresses) || '',
                            'comment': _k.unwrap(currentPatient.comment) || '',
                            'dobD': _moment.utc( _k.unwrap(currentPatient.dob) ).local().format( 'DD' ),
                            'dobM': _moment.utc( _k.unwrap(currentPatient.dob) ).local().format( 'MM' ),
                            'dobY': _moment.utc( _k.unwrap(currentPatient.dob) ).local().format( 'YY' ),
                            'medicationStr': '' + "\n" + '' + "\n" + '' + "\n",
                            'patientDOB': _moment.utc( _k.unwrap( currentPatient.dob ) ).local().format( 'DD.MM.YYYY' ),
                            'insured': _k.unwrap( policy.policyHolder ) || '',
                            'insuredDob': formData.dob || '',
                            'insuranceName': _k.unwrap( insurance.insuranceName ) || '',
                            'insuranceNumber': _k.unwrap( insurance.insuranceNo ) || '',
                            'date': _moment.utc( Date.now() ).local().format( 'DD.MM.YYYY' )
                        };

                        //  add medications table
                        formData.medications = [];

                        //  fill flat details into plain object matching reduced schema
                        formData = Y.clone((formData || {}), true);
                        formData = Y.merge(formData, extendBy);

                        //  linked activities are now available synchronously and managed by the activity viewModel and schema
                        //onMedicationsLoaded( null, Y.dcforms.mapper.objUtils.getAllLinkedActivities( viewModel ) );

                        Y.dcforms.mapper.objUtils.setBarcodeData( formData );

                        formData = processLinkedActivities( formData, context.activity );

                        template.map( formData, true, onMapComplete );
                    }

                    // adds additional data: location info, employee info
                    Y.dcforms.mapper.objUtils.setup3(formData, context.activity, context.patient, onSetup3Complete);

                }


            }

            /**
             *  Returns the current contents of a form as a plain javascript object
             *
             *  @returns {Object}
             */

            function unmap() {
                return template.unmap();
            }

            //  EVENT HANDLERS

            /**
             *  Make plain javacript object for mapped table - checks validity as it goes
             *
             *  @param  formData            {Object}    Any bound fields which are already set
             *  @param  viewModel           {Object}    The object we are mapping into a form
             *  @return                     {Object}    formData with values set from linked activities
             */

            function processLinkedActivities(formData, viewModel) {
                
                medications = Y.dcforms.mapper.objUtils.getAllLinkedActivities( viewModel );

                Y.log( 'Number of rows in medication table, filtered: ' + medications.length, 'debug', NAME );

                var
                    aryComment = [],
                    validIds = [],                  //  to compare with current selection [array]
                    tableRows = [],                 //  exported to form [array]
                    medication,                     //  current item [object]

                    medicationStr = '',             //  description, quantity and code
                    counter = 1,
                    i;                              //  loop counter [int]

                formData.medicationTable = [];
                formData.medication1 = '';
                formData.medication2 = '';
                formData.medication3 = '';
                formData.dosis1 = '';
                formData.dosis2 = '';
                formData.dosis3 = '';

                //  add items
                for( i = 0; i < medications.length; i++ ) {

                    medication = _k.unwrap(medications[i]);

                    if(
                        (medication._id) &&
                        (medication.actType) &&
                        ('MEDICATION' === _k.unwrap(medication.actType))
                    ) {

                        //  Add first three medications as fixed fields MOJ-2451
                        medicationStr = (_k.unwrap(medication.phNLabel) || '');
                        medicationStr = medicationStr.replace('  ', ' ');

                        switch(counter) {
                            case 1: formData.medication1 = medicationStr;
                                formData.dosis1 = _k.unwrap( medication.dosis ) || '';
                                formData.pzn1 = _k.unwrap( medication.phPZN || '' );
                                break;
                            case 2: formData.medication2 = medicationStr;
                                formData.dosis2 = _k.unwrap( medication.dosis ) || '';
                                formData.pzn2 = _k.unwrap( medication.phPZN || '' );
                                break;
                            case 3: formData.medication3 = medicationStr;
                                formData.dosis3 = _k.unwrap( medication.dosis ) || '';
                                formData.pzn3 = _k.unwrap( medication.phPZN || '' );
                                break;
                        }

                        counter = counter + 1;


                        //  Add medications as table rows in Medication_T format
                        formData.medicationTable.push({
                            'activityId': medication._id,

                            'code': _k.unwrap( medication.code ),
                            "pharmaId": _k.unwrap( medication.pharmaId ),
                            "pharmaCompany": _k.unwrap( medication.pharmaCompany ),
                            "format": _k.unwrap( medication.format ),
                            "packSize": _k.unwrap( medication.packSize ),
                            "comment": _k.unwrap( medication.comment ),

                            "description": medicationStr,
                            'unit': _k.unwrap(medication.unit),
                            'dosis': _k.unwrap(medication.dosis)
                        });

                        //  Must match Prescription_T.reduced.json
                        tableRows.push( {
                            'activityId': medication._id,
                            'description': _k.unwrap(medication.content),
                            'code': _k.unwrap(medication.code),
                            'comment': _k.unwrap(medication.comment),
                            'unit': _k.unwrap(medication.unit)
                        } );

                        aryComment.push(medication.content);
                        validIds.push(medication._id);

                    }  else {
                        Y.log( 'Invalid item(s) in medications table: ' + _k.unwrap(medication.actType), 'warn', NAME );
                    }
                }

                //  add three null entries to end of medication table
                //  Add medications as table rows in Medication_T format
                for (i = 0; i < 3; i++) {
                    formData.medicationTable.push({
                        'activityId': '',

                        'code': '',
                        "pharmaId": '',
                        "pharmaCompany": '',
                        "format": '',
                        "packSize": '',
                        "comment": '',

                        //  example, to distinguish from medication1
                        "description": 'x-x-x-x-x-x',
                        'unit': ''
                    });
                }

                // similarly to the invoice, the prescription mapper must write back to the
                // the activity, if it is editable.  This is currently an unresolved problem on
                // the server. MOJ-3662
                if( false === Y.dcforms.isOnServer ) {
                    if( _k.isObservable( viewModel.content ) && _k.unwrap( viewModel._isEditable ) ) {
                        // for prescriptions, we need to set the
                        // usercontent now.
                        // Perhaps a good idea to do this in all mappers, now that we have a feedback channel.
                        if( !_k.unwrap( viewModel.userContent ) ) {
                            viewModel.userContent( template.name[Y.dcforms.getUserLang()] );
                        }

                        //  This is currently unreliable on the client, may fail with:
                        //
                        //      InvalidStateError: Failed to read the 'selectionStart' property from 'HTMLInputElement':
                        //      The input element's type ('hidden') does not support selection.

                        try {
                            viewModel.content( Y.doccirrus.schemas.activity.generateContent( viewModel.toJSON() ) );
                        } catch (visbilityError) {
                            Y.log('Could not set content from viewModel: ' + JSON.stringify(visbilityError), 'warn', NAME);
                        }
                    }
                }

                formData.medicationStr = formData.medication1 + "\n" + formData.medication2 + "\n" + formData.medication3 + "\n";

                formData.items = tableRows;

                if( Y.config.debug ) {
                    Y.log( 'Mapping MEDICATION activities to ' + JSON.stringify( tableRows ), 'debug', NAME );
                }

                return formData;
            }

            /**
             *  Template events are passed by the parent
             *
             *  @param  eventName   {String}
             *  @param  eventData   {Object}
             */

            function onTemplateEvent( eventName, eventData ) {

                switch( eventName ) {

                    case 'onModeSet':
                        onModeSet( eventData );
                        break;

                    case 'onSchemaSet':
                        Y.log( 'Schema has been set.', 'debug', NAME );
                        break;

                    case 'onTableValueChanged':
                        onTableValueChanged( eventData );
                        break;

                    case 'beforeUnload':
                        onUnload(eventData);
                        break;

                    //  temp, testing
                    //case 'onPageSelected':                                                  //  fallthrough
                    //    break;


                    default:
                        //  Noisy, used when debugging subforms
                        //Y.log( 'Unhandled template event: ' + eventName, 'warn', NAME );
                        break;
                }

            }


            /**
             *  Raised in response to user changing the value of form elements
             */

            function onFormValueChanged( /* element */ ) {

                function onResetToStoredData() {
                    Y.log( 'Form reset to state before edit.', 'debug', NAME );
                }

                function onUpdatedFormData() {
                    Y.log( 'Saved form state has been updated.', 'debug', NAME );
                }

                if( false === context.activity._isEditable() ) {
                    //  not editable, reassert previous state of forms over user changes
                    if (formDoc && formDoc.type) {
                        try {
                            template.fromDict( Y.doccirrus.api.document.formDocToDict(formDoc) );
                            template.render( onResetToStoredData );
                        } catch( parseErr ) {
                            Y.log( 'Could not parse saved form state.', 'warn', NAME );
                        }
                    }
                    return;
                }

                //  update the form document
                context.attachments.updateFormDoc( context, template, onUpdatedFormData );
            }

            /**
             *  Clear and knockout dependencies for a clean close
             *  @/param formUID
             */

            function onUnload(/* formUID */) {
                var i;
                for (i = 0; i < koSubscriptions.length; i++) {
                    koSubscriptions[i].dispose();
                }
                koSubscriptions = [];

                Y.dcforms.mapper.koUtils.resetKoForMapper();
                Y.log('Unsubscribed from activity', 'debug', NAME);

                template.off( '*', 'dcforms-map-prescription');
            }

            function onTableValueChanged( detail ) {

                if( Y.config.debug ) {
                    Y.log( 'Table format not enforced: ' + JSON.stringify( detail ), 'debug', NAME );
                }

            }

            /**
             * Called by knockout when the set of linked activities changes
             *
             * This is used to check/filter the set of linked activities, and update the display
             *
             * @param newSelection
             */

            function onActivitiesChanged( newSelection ) {

                function onPartialRemap(err) {
                    if (err) {
                        Y.log('Problem mapping linked medications: ' + JSON.stringify(err), 'warn', NAME);
                    }

                    template.raise('mapcomplete', template.unmap());
                    context.attachments.updateFormDoc( context, template, onFormDocUpdated );
                }

                function onFormDocUpdated(err) {
                    if (err) {
                        Y.log('Problem updating saved form state: ' + JSON.stringify(err), 'warn', NAME);
                    }
                }

                if (currentActivity.inTransition()) {
                    Y.log('Activity is in transition, not remapping form.', 'info', NAME);
                    return;
                }

                if (!currentActivity._isEditable()) {
                    Y.log('Activity is not editable in current state, not attaching activity.', 'info', NAME);
                    return;
                }

                Y.log('Selection changed to ' + newSelection.length, 'debug', NAME);
                map( onPartialRemap );
            }

            /**
             *  Change form editable state according to activity status
             *  @param   newState    {String}    A member of ActStatus_E
             */

            function onStateChanged(newState) {

                function onNewModeSet() {
                    Y.log('Form mode changed to: ' + template.mode, 'debug', NAME);
                }

                var editable = false;

                switch(newState) {
                    case 'CREATED':         editable = true;    break;
                    case 'VALID':           editable = true;    break;
                }

                if (editable) {
                    Y.log('set form editable for state ' + newState, 'info', NAME);
                    template.setMode('fill', onNewModeSet);
                } else {
                    Y.log('set form uneditable for state ' + newState, 'info', NAME);
                    template.setMode('locked', onNewModeSet);
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
            'dcforms-map-casefile',
            'dcformmap-util',
            'dcformmap-ko-util',
            'document-api'
        ]
    }
);