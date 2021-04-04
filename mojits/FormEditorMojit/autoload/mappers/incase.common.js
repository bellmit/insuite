/*
 *  Copyright DocCirrus GmbH 2013
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*jshint latedef:false */
/*global YUI */

YUI.add(
    'dcforms-map-incase',

    /* Module code */
    function( Y, NAME ) {
        'use strict';

        // used to remap barcodes on form changes
        var originalFormData,
            moment = Y.doccirrus.commonutils.getMoment(),
            _k = Y.dcforms.mapper.koUtils.getKo(0);

        /**
         *  Factory for mapper objects
         *
         *  Context should have:
         *
         *      patient
         *      activity
         *      location
         *      employee
         *
         *  @param  template    {Object}    Form template
         *  @param  context     {Object}    Set of objects from which mapped fields are draw
         */
        Y.namespace( 'dcforms.mapper' ).incase = function( template, context ) {

            //  PRIVATE MEMBERS

            var
                currentActivity = context.activity,
            //  currentPatient = context.patient,
            //  bindCollection = context.bindCollection,
            //  bindId = context.bindId,

                koSubscriptions = [],   //  holds KO subscriptions so they can be removed on unload [array]
            //  formMode = 'fill',      //  will usually be 'fill', 'locked' or 'pdf', may be 'shutdown' as page closed
                formDoc = null,
                actType = _k.unwrap( currentActivity.actType ),
                isLocked = false,
                lockLinkedActivities = alwaysMapLinkedActivites(),
                kbvUtilityFields = [
                    'utIndicationCode', 'utIcdCode', 'utSecondIcdCode', 'utIcdText', 'utSecondIcdText', 'utRemedy1List', 'utRemedy2List', 'paidFreeStatus', 'utTherapyGoalsList'
                ],
                utilityFields = [
                    'timestamp', 'locationId', 'employeeId', 'userContent', 'catalogShort', 'utPrescriptionType',
                    'utNoNormalCase', 'utHomeVisit', 'utGroupTherapy', 'utTherapyReport', 'utMedicalJustification',
                    'utRemedy1Name', 'utRemedy1Item', 'utRemedy1Explanation', 'utRemedy1PerWeek',
                    'utRemedy1Seasons', 'utRemedy2Name', 'utRemedy2Item', 'utRemedy2Explanation', 'utRemedy2PerWeek',
                    'utRemedy2Seasons', 'utTherapyGoals', 'utLatestStartOfTreatment', 'utVocalTherapy',
                    'utSpeakTherapy', 'utSpeechTherapy', 'utDurationOfSeason', 'utDiagnosisName', 'utUnfall',
                    'utBvg', 'utNeuroFinding', 'utAudioDiagDate', 'utAudioDiagReact', 'utAudioDiagCond', 'utAudioDiagOwn',
                    'utLupenlaryngoskopie', 'utLupenstroboskopieRight', 'utLupenstroboskopieLeft', 'utAmplitudeRight',
                    'utAmplitudeLeft', 'utRandkantenverschiebungRight', 'utRandkantenverschiebungLeft', 'utRegular',
                    'utGlottisschluss', 'utEarDrumFindingRight','utEarDrumFindingLeft'
                ],
                //  deprecated - should be moved to client-side activity models
                actTypeSubMap = {
                    UTILITY: utilityFields,
                    KBVUTILITY: kbvUtilityFields.concat( utilityFields ),
                    KBVUTILITY2: [
                        'ut2Chapter', 'utIcdCode', 'utSecondIcdCode', 'utIcdText', 'utSecondIcdText', 'ut2TreatmentRelevantDiagnosisText',
                        'ut2DiagnosisGroupCode', 'ut2ConductionSymptoms', 'ut2PatientSpecificConductionSymptoms', 'ut2PatientSpecificConductionSymptomsFreeText',
                        'ut2Remedy1List', 'ut2Remedy2List', 'ut2TherapyFrequencyType', 'ut2TherapyFrequencyMin', 'ut2TherapyFrequencyMax', 'ut2UrgentNeedForAction',
                        'utTherapyReport', 'utHomeVisit', 'utTherapyGoals', 'utUnfall', 'utBvg', 'paidFreeStatus', 'nestedFieldsSubscription'
                    ],
                    LABREQUEST: [
                        'timestamp', 'locationId', 'employeeId', 'kontrollunters', 'abnDatumZeit', 'befEilt',
                        'befEiltTel', 'befEiltFax', 'edtaGrBlutbild', 'edtaKlBlutbild', 'edtaHbA1c', 'edtaReti',
                        'edtaBlutsenkung', 'edtaDiffBlutbild', 'citratQu', 'citratQuMarcumar', 'citratThrombin',
                        'citratPTT', 'citratFibri', 'svbAlkPhos', 'svbAmylase', 'svbASL', 'svbBiliD', 'svbBiliG',
                        'svbCalc', 'svbCholesterin', 'svbCholin', 'svbCK', 'svbCKMB', 'svbCRP', 'svbEisen', 'svbEiwE',
                        'svbEiwG', 'svbGammaGT', 'svbGlukose', 'svbGOT', 'svbGPT', 'svbHarnsäure', 'svbHarnstoff',
                        'svbHBDH', 'svbHDL', 'svbLgA', 'svbLgG', 'svbLgM', 'svbKali', 'svbKrea', 'svbKreaC', 'svbLDH',
                        'svbLDL', 'svbLipase', 'svbNatrium', 'svbOPVorb', 'svbPhos', 'svbTransf', 'svbTrigl',
                        'svbTSHBasal', 'svbTSHTRH', 'glu1', 'glu2', 'glu3', 'glu4', 'urinStatus', 'urinMikroalb',
                        'urinSchwTest', 'urinGlukose', 'urinAmylase', 'urinSediment', 'sonstiges', 'sonstigesText',
                        'labRequestType', 'ggfKennziffer', 'behandlungGemaess', 'scheinSlipMedicalTreatment',
                        'fk4202', 'fk4204', 'scheinRemittor', 'scheinEstablishment', 'untersArt', 'auBis', 'datumOP',
                        'ueberwAn','asvTeamReferral', 'auftrag', 'labRequestId', 'knappschaftskennzeichen',
                        'befEiltTelBool', 'befEiltFaxBool', 'befEiltNr', 'ssw', 'zuAngaben'
                    ],
                    // same as LABREQUEST...
                    REFERRAL: [
                        'timestamp', 'locationId', 'employeeId', 'kontrollunters', 'abnDatumZeit', 'befEilt',
                        'befEiltTel', 'befEiltFax', 'edtaGrBlutbild', 'edtaKlBlutbild', 'edtaHbA1c', 'edtaReti',
                        'edtaBlutsenkung', 'edtaDiffBlutbild', 'citratQu', 'citratQuMarcumar', 'citratThrombin',
                        'citratPTT', 'citratFibri', 'svbAlkPhos', 'svbAmylase', 'svbASL', 'svbBiliD', 'svbBiliG',
                        'svbCalc', 'svbCholesterin', 'svbCholin', 'svbCK', 'svbCKMB', 'svbCRP', 'svbEisen',
                        'svbEiwE', 'svbEiwG', 'svbGammaGT', 'svbGlukose', 'svbGOT', 'svbGPT', 'svbHarnsäure',
                        'svbHarnstoff', 'svbHBDH', 'svbHDL', 'svbLgA', 'svbLgG', 'svbLgM', 'svbKali', 'svbKrea',
                        'svbKreaC', 'svbLDH', 'svbLDL', 'svbLipase', 'svbNatrium', 'svbOPVorb', 'svbPhos',
                        'svbTransf', 'svbTrigl', 'svbTSHBasal', 'svbTSHTRH', 'glu1', 'glu2', 'glu3', 'glu4',
                        'urinStatus', 'urinMikroalb', 'urinSchwTest', 'urinGlukose', 'urinAmylase', 'urinSediment',
                        'sonstiges', 'sonstigesText', 'labRequestType', 'ggfKennziffer', 'behandlungGemaess',
                        'scheinSlipMedicalTreatment', 'fk4202', 'fk4204', 'scheinRemittor',
                        'scheinEstablishment', 'untersArt', 'auBis', 'datumOP', 'ueberwAn', 'asvTeamReferral', 'auftrag',
                        'medicationsText', 'diagnosesText', 'findingsText'
                    ],
                    AU: [
                        'timestamp', 'locationId', 'employeeId', 'auType', 'erstBesch', 'folgeBesc', 'arbeitsunfall',
                        'durchgangsarzt', 'auVon', 'auVorraussichtlichBis', 'festgestelltAm', 'sonstigerUnf', 'bvg',
                        'massnahmen','rehab','reintegration','diagnosesAdd','krankengeld','endBesch'
                    ],
                    RECEIPT: [
                        'invoiceNo', 'invoiceText', 'content'
                    ],
                    REMINDER: [
                        'invoiceNo', 'invoiceText', 'content'
                    ],
                    WARNING1: [
                        'invoiceNo', 'invoiceText', 'content'
                    ],
                    WARNING2: [
                        'invoiceNo', 'invoiceText', 'content'
                    ],
                    CREDITNOTE: [
                        'invoiceNo', 'invoiceText', 'content'
                    ],
                    BADDEBT: [
                        'invoiceNo', 'invoiceText', 'content', 'amount'
                    ],
                    HEALTHSURVEY: [
                        'BFB30insurance_AOK', 'BFB30insurance_BKK',
                        'BFB30insurance_IKK', 'BFB30insurance_LKK', 'BFB30insurance_VDeK', 'BFB30insurance_BKnapp',
                        'BFB30_age_lt35', 'BFB30_age_35-39', 'BFB30_age_40-44', 'BFB30_age_45-49', 'BFB30_age_50-54',
                        'BFB30_age_55-59', 'BFB30_age_60-64', 'BFB30_age_65-69', 'BFB30_age_70-74', 'BFB30_age_75-79',
                        'BFB30_age_gt80', 'BFB30_sex_male', 'BFB30_sex_female', 'BFB30_Wiederholung',
                        'BFB30_hypertonia_eigen', 'BFB30_hypertonia_fam', 'BFB30_coronalHeartDisease_eigen',
                        'BFB30_coronalHeartDisease_fam', 'BFB30_otherArterialClosure_eigen',
                        'BFB30_otherArterialClosure_fam', 'BFB30_diabetesMellitus_eigen', 'BFB30_diabetesMellitus_fam',
                        'BFB30_hyperlipidemia_eigen', 'BFB30_hyperlipidemia_fam', 'BFB30_kidneyDiseases_eigen',
                        'BFB30_kidneyDiseases_fam', 'BFB30_lungDiseases_eigen', 'BFB30_lungDiseases_fam',
                        'BFB30_nicotineAbuse', 'BFB30_adipositas', 'BFB30_chronicEmotionalStressFactor',
                        'BFB30_alcoholAbuse', 'BFB30_sedentaryLifestyle'
                    ],
                    GRAVIDOGRAMM: [
                        'antibody1', 'antibody2', 'hiv', 'syphillis', 'toxoplasmosis', 'rubellaTiter', 'chlamidia', 'HBsAg'
                    ],
                    MEDICATION: [
                        'dosis',
                        "phDosisMorning",
                        "phDosisAfternoon",
                        "phDosisEvening",
                        "phDosisNight",
                        "phDosisType",
                        "phUnit",
                        "phReason",
                        "explanations",
                        "phPriceSale",
                        "phPackSize",
                        "phNLabel",
                        "phPZN",
                        "phContinuousMed",
                        "phContinuousMedDate"
                    ],
                    FORM: [
                        'timestamp',
                        'naehereAngabenZuDenEmpfehlungen',
                        'tiefenpsychologischFundiertePsychotherapie',
                        'unfall',
                        'notwendig'
                    ],
                    INGREDIENTPLAN: [ 'changeCounter' ],
                    PUBPRESCR: ['substitutePrescription'],
                    PRESCRT: ['substitutePrescription'],
                    PRESCRBTM: ['substitutePrescription']
                },
                writeBackFnMap = {
                    bb: function( value, activity ) {
                        activity.scheinSlipMedicalTreatment( value ? '4' : '' );
                    },
                    fk4202: function( value, activity ) {
                        if ( activity.fk4202 ) {
                            activity.fk4202( value );
                        }
                    }
                };

            function writeBack( element, activity ) {
                if( writeBackFnMap[ element.schemaMember ] ) {
                    writeBackFnMap[ element.schemaMember ]( element.unmap(), activity );
                }

                //  TODO: move all activities to this pattern
                if ( activity._writeBack && activity._isEditable() ) {
                    if ( '_id' !== element.schemaMember && 'actType' !== element.schemaMember ) {
                        activity._writeBack( template, element );
                    }
                }
            }

            //  Activities with mask generally have locked forms, exceptions for MOJ-7071, MOJ-7139
            function isActivityWithMask() {
                var caseFolder = _k.unwrap( context.caseFolder );
                return Y.doccirrus.schemas.activity.isMaskType( actType, caseFolder && caseFolder.type || 'ANY' );

            }

            //  INITIALIZATION

            // init KO
            Y.dcforms.mapper.koUtils.initKoForMapper( map, context, template );
            // set up active docblock
            Y.dcforms.mapper.koUtils.activateKoForMapper();

            if( false === Y.dcforms.isOnServer ) {

                //  subscribe to the set of linked activities
                //koSubscriptions.push( currentActivity.activities.subscribe( onSelectionChanged ) );
                if ( currentActivity._activitiesObj ) {
                    koSubscriptions.push( currentActivity._activitiesObj.subscribe( onSelectionChanged ) );
                    koSubscriptions.push( currentActivity._icdsObj.subscribe( onSelectionChanged ) );
                    koSubscriptions.push( currentActivity.timestamp.subscribe( onSelectionChanged ) );
                }

                //  subscribe to state changes
                koSubscriptions.push( currentActivity.status.subscribe( onStateChanged ) );
                template.on( 'modeSet', 'dcforms-map-incase', onModeSet );

                //  models may request barcode updates, used for BFB25, 39
                template.on( 'remapBarcode', 'dcforms-map-incase', onRemapBarcode );

                //  make fields depending on linked activities read-only (MOJ-6052)
                if ( lockLinkedActivities ) {
                    Y.dcforms.mapper.genericUtils.lockLinkedActivityElements( template );
                }

                if( isActivityWithMask() ) {
                    //  lock the form to editing
                    if ( lockLinkedActivities ) {
                        template.setMode('locked', Y.dcforms.nullCallback);
                        isLocked = true;
                    } else {
                        //  subscribe to user-driven changes in form values
                        template.on( 'valueChanged', 'dcforms-map-incase', onFormValueChanged );
                        template.on( 'editorLostFocus', 'dcforms-map-incase', onFormFocusChanged );
                        template.on( 'removeTableRow', 'dcforms-map-incase', onTableRowRemoved );
                    }
                    subscribeToActivity();
                    // in future this could be moved to koUtils, but first old mappers must be removed
                } else {
                    //  subscribe to user-driven changes in form values
                    template.on( 'valueChanged', 'dcforms-map-incase', onFormValueChanged );
                    template.on( 'editorLostFocus', 'dcforms-map-incase', onFormFocusChanged );
                    template.on( 'removeTableRow', 'dcforms-map-incase', onTableRowRemoved );
                    subscribeToActivity(); // TODO: MOJ-11206: also remap if specified FORM fields change; needs to be checked by strix
                }

            }

            context.attachments.getOrCreateFormDocument( context, template, onFormDocumentLoaded );

            /**
             *  Called after searching activity for saved form state to be loaded
             *
             *  @param  err                 {Object}    If failure of getOrCreateFormDocument
             *  @param  foundFormDoc        {Object}    A document viewModel (client) or object (server)
             *  @param  needsRemap          {Boolean}   If true then bound fields on the form should be updated from activity
             *  @param  needsRemapLinked    {Boolean}   If true then linked activity fields should be updated
             */

            function onFormDocumentLoaded( err, foundFormDoc, needsRemap, needsRemapLinked ) {

                if( err ) {
                    //  form event with empty response prevents server zombie on error (PDF code waits for this event)
                    Y.log( 'Could not load or create form document: ' + err, 'warn', NAME );
                    template.raise( 'mapcomplete', {} );
                    return;
                }

                formDoc = foundFormDoc;

                Y.dcforms.runInSeries(
                    [
                        //handleScaling,
                        applyStateFromDocument,
                        handleSerialLetterModifications,
                        handleMapping,
                        handleLinkedActivities,
                        handleBarcodes,
                        updateFormDocument,
                        reRender
                    ],
                    onFormRestored
                );

                /**
                 *  When loading from dictionary the form state may be different on next save due to newer versions
                 *  of form elements serializing additional data.  In this case we need to mark the document clean.
                 *
                 *  @param itcb
                 */

                function applyStateFromDocument( itcb ) {
                    var storedDict = Y.doccirrus.api.document.formDocToDict( formDoc );

                    template.mapData = _k.unwrap( formDoc.mapData || {} ) || {};
                    template.fromDict( storedDict, onLoadFromDict );

                    function onLoadFromDict( err ) {
                        if ( err ) { return itcb( err ); }

                        var
                            newDict = template.toDict(),
                            wasModified;

                        if ( JSON.stringify( newDict ) !== JSON.stringify( storedDict ) ) {
                            Y.log( 'Stored dictionary is an from an older version, updating...', 'debug', NAME );

                            if ( Y.dcforms.isOnServer ) {
                                formDoc.formState = newDict;
                            } else {
                                wasModified = formDoc.isModified();
                                formDoc.formState( newDict );
                                if ( !wasModified ) {
                                    Y.log( 'Marking modified form document as clean...', 'debug', NAME );
                                    formDoc.setNotModified();
                                }
                            }

                        }

                        itcb( null );
                    }
                }

                function handleSerialLetterModifications(itcb ) {
                    //  skip this step if we're not processing a serial letter
                    if ( !Y.dcforms.isOnServer || 'bake' !== formDoc.formData ) { return itcb( null ); }
                    var i, j, currPage, currElem;

                    Y.log( 'Applying user modifications to template for serial letter.', 'debug', NAME );

                    for ( i = 0; i < template.pages.length; i++ ) {
                        currPage = template.pages[0];
                        for ( j = 0; j < currPage.elements.length; j++) {
                            currElem = currPage.elements[j];
                            //  initially hardcoded to German to start
                            //  TODO: figure out how this should work with internationalization and gender
                            currElem.defaultValue.de = currElem.value;
                            currElem.defaultValue.en = currElem.value;
                        }
                    }

                    needsRemap = true;
                    itcb( null );
                }

                function handleMapping( itcb ) {
                    if( isActivityWithMask() ) {
                        if ( 'CREATED' === _k.unwrap( currentActivity.status )  ) {
                            //  activity is new or has changed, form needs to be updated with values from mask
                            needsRemap = true;
                        }
                        if ( 'VALID' === _k.unwrap( currentActivity.status ) /* && Y.dcforms.isOnServer */ ) {
                            //  activity may have changed, update form with values from mask
                            //  (if no change since form was last loaded then this will not dirty the document)
                            needsRemap = true;
                        }
                    }

                    //  special case of REFERRAL activities, map will usually *also* map linked activities
                    if ( true === needsRemap && true === needsRemapLinked ) {
                        Y.log( 'Performing initial map of form from placeholder document.', 'debug', NAME );
                        context.isFromPlaceholder = true;
                    }

                    //  skip this step if not necessary
                    if( !needsRemap ) {
                        return template.map({ 'status': currentActivity.status }, false, itcb );
                    }

                    Y.log( 'remapping / no form document was present on load', 'debug', NAME );
                    map( itcb );
                }

                function handleLinkedActivities( itcb ) {
                    //  MOJ-6052 - we may need need to remap linked activites on the server after approval or on the client before approval
                    if ( lockLinkedActivities && ( Y.dcforms.isOnServer || currentActivity._isEditable() ) ) {
                        needsRemapLinked = true;
                    }

                    //  skip this step if not necessary
                    if ( !needsRemapLinked ) {
                        return itcb( null );
                    }
                    mapLinkedActivities( itcb );
                }

                function handleBarcodes( itcb ) {
                    //  may skip this step on the client in future
                    if ( Y.dcforms.isOnServer || currentActivity._isEditable() ) {
                        return mapBarcodesServer( itcb );
                    }
                    itcb( null );
                }

                function updateFormDocument( itcb ) {
                    if ( needsRemap ) {
                        if ( Y.dcforms.isOnServer ) {
                            formDoc.formInitialState = template.toDict();
                            formDoc.formData = '';
                        } else {
                            formDoc.formData( '' );
                            formDoc.formInitialState( template.toDict() );
                        }
                    }

                    context.attachments.updateFormDoc( context, template, itcb );
                }

                function reRender( itcb ) {
                    template.render( itcb );
                }

                function onFormRestored( err ) {

                    if ( err ) {
                        Y.log( 'Error while restoring or mapping form: ' + JSON.stringify( err ), 'warn', NAME );
                    } else {
                        template.raise( 'formDocumentLoaded', formDoc );
                    }

                    //  called when form is displayed (client) or ready for export to PDF (server)
                    //  Must be called regardless of success, since PDF queue waits on this signal
                    var unmappedData = unmap();

                    template.raise( 'mapcomplete', unmappedData );
                    template.raise( 'mapperinitialized', unmappedData );
                }

            }

            //  PUBLIC METHODS

            /**
             *  Fill a form with values extracted from the current context
             *
             *  @param  [callback]  {Function}  Optional, called when form mapped.
             */

            function map( callback ) {
                //Y.log( 'Mapping into form: ' + objCollection + '::' + objId + '::' + (viewModel._id ? viewModel._id : 'new' ), 'debug', NAME );

                //  disable save buttons on casefile UI
                incFormBusy();

                /**
                 *  Called when all sub-tasks and linked data has been loaded and marshaled into a flat object
                 */

                function onFormDataComplete( err, formData ) {

                    function onMapComplete( err ) {

                        if( err ) {
                            Y.log( 'Error mapping values into form: ' + err, 'warn', NAME );
                            callback( err );
                            return;
                        }

                        //  parent binder and other listeners may need to know when object has
                        //  been loaded, raise event through template

                        template.raise( 'mapcomplete', formData );
                        decFormBusy();
                        callback( null, formData );
                    }

                    if( err ) {
                        Y.log( 'Could not get formData from template ' + JSON.stringify( err ), 'error', NAME );
                        decFormBusy();     //   done
                        return callback( err );
                    }

                    //  map values into form
                    template.map( formData, true, onMapComplete );
                }

                if( !callback ) { callback = Y.dcforms.nullCallback; }

                Y.dcforms.mapper.genericUtils.getFormDataByTemplate( template, context, onFormDataComplete );
            }

            //  MANAGE KO OBSERVABLE TO BLOCK SAVE BUTTONS DURING MAP / UPDATE OPERATIONS

            function incFormBusy() {
                if ( Y.dcforms.isOnServer || !context.activity._formBusy ) { return; }
                context.activity._incFormBusy();
            }

            function decFormBusy() {
                if ( Y.dcforms.isOnServer || !context.activity._formBusy ) { return; }
                context.activity._decFormBusy();
            }

            //  PUBLIC METHODS

            /**
             *  Fill a form with the contents of this passed object
             *
             *  @param  callback        {Function}  Optional, called when form mapped.
             */

            function mapLinkedActivities( callback ) {
                //Y.log('invoking incase mapper, stack trace follows: ', new Error().stack, 'debug', NAME);
                //Y.log( 'Mapping into form: ' + objCollection + '::' + objId + '::' + (viewModel._id ? viewModel._id : 'new' ), 'debug', NAME );

                /**
                 *  Called when all sub-tasks and linked data has been loaded and mapped
                 */

                //  add an extra map operation in the counter to block save during this action
                incFormBusy();

                function onFormDataComplete( err, formData ) {

                    function onMapComplete( err ) {
                        //  mark operation complete for save buttons
                        decFormBusy();

                        if( err ) {
                            Y.log( 'Error mapping values into form: ' + err, 'warn', NAME );
                            return callback( err );
                        }

                        //  if the formDoc was marked a needed a remap of linked activities we can clear it
                        if ( formDoc &&  _k.unwrap( formDoc.formData ) === 'remaplinked' ) {
                            if ( Y.dcforms.isOnServer ) {
                                formDoc.formData = '';
                            } else {
                                formDoc.formData( '' );
                            }
                        }

                        //  parent binder and other listeners may need to know when object has
                        //  been loaded, raise event through template
                        template.raise( 'mapcomplete', formData );
                        callback( null, formData );
                    }

                    if( err ) {
                        Y.log( 'Could not get formData from template ' + JSON.stringify( err ), 'error', NAME );
                        decFormBusy();  //   done
                        return callback( err );
                    }

                    //originalFormData = JSON.parse( JSON.stringify( formData ) );

                    //  map values into form
                    template.map( formData, true, onMapComplete );
                }

                if( !callback ) {
                    callback = function( err ) {
                        if( err ) {
                            Y.doccirrus.comctl.setModal( 'Could not map form', err, true );
                            Y.log( 'Error while mapping form: ' + err, 'warn', NAME );
                        }
                    };
                }

                Y.dcforms.mapper.genericUtils.getFormDataForLinkedActivities(
                    template,
                    {
                    user: context.user || null,
                    activity: context.activity,
                    patient: context.patient,
                    locations: context.locations || [],
                    caseFolder: context.caseFolder,
                    invoiceconfiguration: context.invoiceconfiguration || {}
                    },
                    onFormDataComplete
                );
            }

            /**
             *  Do a complete map of barcodes when rendered on the server
             *
             *  @param  [callback]  {Function}  Optional, called when form mapped.
             */

            function mapBarcodesServer( callback ) {

                /**
                 *  Called when all sub-tasks and linked data has been loaded and marshaled into a flat object
                 */

                function onFormDataComplete( err, formData ) {

                    function onMapBarcodesComplete( err ) {

                        if( err ) {
                            Y.log( 'Error mapping values into form: ' + err, 'warn', NAME );
                            callback( err );
                            return;
                        }

                        //  parent binder and other listeners may need to know when object has
                        //  been loaded, raise event through template

                        template.raise( 'mapcomplete', formData );
                        callback( null, formData );
                    }

                    if( err ) {
                        Y.log( 'Could not get formData from template: ' + JSON.stringify( err ), 'error', NAME );
                        return callback( err );
                    }

                    var
                        additionalFromForm = template.unmap(),
                        bcFormFields = {},
                        hasBarcode = false,
                        k;

                    //  add any values which are bound in the form but not mapped (MOJ-7218, unmapped checkboxes)
                    for ( k in additionalFromForm ) {
                        if ( additionalFromForm.hasOwnProperty( k ) ) {
                            formData[k] = additionalFromForm[k];
                        }
                    }

                    //  regenerate the barcode value

                    updateBarCode( formData );

                    //  filter mapped values to only those required by barcodes
                    //  (we require a full mapping to generate barcodes, but do not want to overwrite all fields)

                    for ( k in formData ) {
                        if ( formData.hasOwnProperty( k ) ) {
                            if ( 'barcode' === k.substr( 0, 7 ) ) {
                                bcFormFields[k] = formData[k];
                                hasBarcode = true;
                            }
                        }
                    }

                    if ( !hasBarcode ) {
                        return callback( null );
                    }

                    //  map values into form
                    template.map( bcFormFields, true, onMapBarcodesComplete );
                }

                Y.log( 'Updating barcodes on server.', 'debug', NAME );

                if( !callback ) { callback = Y.dcforms.nullCallback; }
                Y.dcforms.mapper.genericUtils.getFormDataByTemplate( template, context, onFormDataComplete );
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
             *  Non FORM type activities are mapped live - updates to the activity should reflect immediately in the
             *  form, which is locked to manual editing
             */

            function subscribeToActivity() {

                function onActChanged( /* evt */ ) {
                    //  there seems to be a race condition on the computed _isEditable in some cases, returning true
                    //  immediately after status is set to APPROVED
                    if( !currentActivity._isEditable() ) {
                        return;
                    }
                    map( onFormMapped );
                }

                //  special case for content updated from backmappings or text tab, do nto remap whole form, LAM-2145
                function onContentChanged() {
                    if( !currentActivity._isEditable() ) { return; }
                    template.map( {
                        'content': _k.unwrap( currentActivity.content ),
                        'userContent': _k.unwrap( currentActivity.userContent )
                    }, true, onFormMapped );
                }

                function onFormMapped( err ) {
                    if( err ) {
                        Y.log( 'Could not map the form from current activity: ' + err, 'warn', NAME );
                        return;
                    }

                    if ( currentActivity.inTransition() ) { return; }

                    formDoc.formData( '' );
                    context.attachments.updateFormDoc( context, template, onFormDocUpdateLive );
                }

                function onFormDocUpdateLive( err ) {
                    if( err ) {
                        //  form event with empty response prevents server zombie on error
                        Y.log( 'Could update activity form document: ' + err, 'warn', NAME );
                    }
                }

                var
                    fields = actTypeSubMap[actType] || [],
                    i;

                fields.push( 'userContent' );
                fields.push( 'content' );

                if( !fields ) {
                    Y.log( 'could not get fields to subscribe', 'warn', NAME );
                    return;
                }

                for( i = 0; i < fields.length; i++ ) {
                    Y.log( 'Subscribing mapper to ' + actType + ' property: ' + fields[i], 'debug', NAME );
                    if (currentActivity[fields[i]]) {
                        if ( 'content' === fields[i] || 'userContent' === fields[i] ) {
                            koSubscriptions.push( currentActivity[fields[i]].subscribe( onContentChanged ) );
                        } else {
                            koSubscriptions.push( currentActivity[fields[i]].subscribe( onActChanged ) );
                        }
                    } else {
                        Y.log('Could not subscribe to currentActivity: ' + fields[i], 'warn', NAME);
                    }

                }
            }

            /**
             *  Update the invoice total from the items table in response to user action
             *
             *  LEGACY: not longer used for new invoices, kept for archival activities only.
             *
             *  @param tableElement
             */

            function onRecalculateTotal( tableElement ) {
                var
                    ds = tableElement.dataSet,
                    row,
                    total = 0;

                for( row = 0; row < ds.length; row++ ) {

                    if( ds[row].hasOwnProperty( 'cost' ) && !isNaN( ds[row].cost ) ) {
                        total = total + parseFloat( ds[row].cost );
                    }
                }

                Y.log( 'Grand total: ' + total, 'debug', NAME );

                //total = total.toFixed(2);
                //currentActivity.content('EUR ' + total.toFixed( 2 ) + ' (' + ds.length + ')');
                template.map( {'total': Y.doccirrus.comctl.numberToLocalCurrency( total )}, true, onReMapComplete );

                function onReMapComplete( err ) {
                    if( err ) {
                        Y.log( 'Problem mapping invoice: ' + err, 'warn', NAME );
                        return;
                    }

                    template.raise( 'mapcomplete', {} );
                    context.attachments.updateFormDoc( context, template, onTotalUpdated );
                }

                function onTotalUpdated( err ) {
                    if( err ) {
                        Y.log( 'Problem updating linked form document: ' + JSON.stringify( err ), 'warn', NAME );
                    }
                }
            }

            /**
             *  Now redundant code to allow change in table.
             *  For now, it is not possible to change values in tables dynamically, this is planned to change soon.
             *
             *  @param detail
             */

            function onTableValueChanged( detail ) {

                var
                    row = detail.row,
                    col = detail.col,
                    value = detail.text,
                    element = detail.element,
                    ds = element.dataSet;

                if( 'object' !== typeof element.dataSet ) {
                    return;
                }

                Y.log( 'Changed - cellId: ' + detail.id + ' row: ' + row + ' col:' + col + ' value: ' + value, 'debug', NAME );

                if(
                    (ds[row].hasOwnProperty( 'costperitem' )) &&
                    (ds[row].hasOwnProperty( 'quantity' )) &&
                    (ds[row].hasOwnProperty( 'cost' )) &&
                    (!isNaN( ds[row].quantity )) &&
                    (!isNaN( ds[row].costperitem )) &&
                    (('costperitem' === col) || ('quantity' === col))
                ) {
                    ds[row].cost = (parseFloat( ds[row].quantity ) * parseFloat( ds[row].costperitem ));
                    element.setTableCell(
                        row,
                        'cost',
                        Y.doccirrus.comctl.numberToLocalCurrency( ds[row].cost ) +
                        ''
                    );

                } else {
                    if( Y.config.debug ) {
                        Y.log( 'Not changed ' + JSON.stringify( ds[row] ), 'debug', NAME );
                    }
                }

                onRecalculateTotal( element );

            }

            function updateBarCode( data ) {
                var keys = Object.keys( data ),
                    updated = false,
                    orgData = JSON.parse( JSON.stringify( originalFormData || {} ) ),
                    mergedData,
                    barcode;

                try {
                    mergedData = Y.aggregate( orgData, data, true );
                } catch( err ) {
                    Y.log( 'Could not merge barcode data: ' + JSON.stringify( err ), 'warn', NAME );
                    mergedData = data;
                }

                keys.forEach( function( key ) {
                    if( 0 === key.indexOf( 'barcode' ) ) {
                        barcode = Y.dcforms.mapper.objUtils.getBarcode( key, mergedData, { context: context } );
                        if( barcode ) {
                            data[key] = barcode;
                            updated = true;
                        }
                    }
                } );

                return updated;
            }

            /**
             *  Check if the linked activities need to be remapped due to revision security settings MOJ-6052
             *
             *  @returns    {Boolean}   True if there is a config option to disallow edit of linked activities
             */

            function alwaysMapLinkedActivites() {
                var
                    mappableStates = [ 'VALID', 'CREATED' ],
                    inCaseConfig = context.incaseconfiguration || {},
                    configKey = 'validate' + _k.unwrap( currentActivity.actType ),
                    configVal = inCaseConfig[configKey] || false;

                Y.log( 'inCaseConfig ( ' + _k.unwrap( currentActivity.status )  + ' / ' + _k.unwrap( currentActivity.actType ) + '): ' + JSON.stringify( inCaseConfig ), 'debug', NAME );

                //  only map if the user could have edited the form
                if ( -1 === mappableStates.indexOf( _k.unwrap( currentActivity.status ) ) ) {
                    return false;
                }

                return configVal;
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
                            map( Y.dcforms.nullCallback );
                        }

                        break;

                    case 'onMappedObjectLoaded':
                        //  if there is a document holding the state of this form, it needs to be updated to
                        //  reflect the mapped values

                        if( ('object' === typeof formDoc) && (null !== formDoc) ) {
                            onFormValueChanged( {'elemId': template.formId} );
                        } else {
                            Y.log( 'Cannot save mapped values, no document to keep them in.', 'debug', NAME );
                        }

                        break;

                    case 'beforeUnload':
                        onUnload( eventData );
                        break;
                    case 'onTableValueChanged':
                        onTableValueChanged( eventData ); // TODOOO check if this can run everytime( or only for invoices)?
                        break;

                    //case 'onPageSelected':                                                  //  fallthrough
                    //    break;

                    //default:
                    //    //noisy, used when debugging subforms
                    //    Y.log( 'Unhandled template event: ' + eventName, 'warn', NAME );
                    //    break;
                }

            }

            /**
             *  Raised in response to user changing the value of form elements
             */

            function onFormValueChanged( element ) {
                //Y.log( 'onFormValueChanged: ' + ( ( element && element.elemId ) ? element.elemId : 'no element specified' ), 'debug', NAME );
                //  prevent feedback from KO remapping barcodes
                if( 'barcode' === element.elemType ) {
                    return;
                }

                if ( 'lock' === template.mode || 'locked' === template.mode || !currentActivity._isEditable() ) {

                    //  exception for contacts mapping
                    if ( !element.force ) {
                        enforceLock();
                        return;
                    }

                }

                //  lock the save button while this happens
                incFormBusy();

                //  prevent
                Y.dcforms.runInSeries(
                    [
                        doWriteBack,
                        updateFormDocument
                    ],
                    onAllDone
                );

                //  1. Update activity with user data entered into the form
                function doWriteBack( itcb ) {
                    if( Y.doccirrus.commonutils.isClientSide() && currentActivity._isEditable() && element.schemaMember && '' !== element.schemaMember ) {
                        template.mapData[ element.schemaMember ] = element.unmap();
                        writeBack( element, currentActivity );
                    }
                    itcb( null );
                }

                //  2. Update form document with current form state (may change dirty state, trigger UI events)
                function updateFormDocument( itcb ) {
                    function onUpdatedFormData( err ) {
                        if (!err ) { Y.log( 'Saved form state has been updated.', 'debug', NAME ); }
                        itcb( err );
                    }

                    if( currentActivity._isEditable() ) {
                        context.attachments.updateFormDoc( context, template, onUpdatedFormData );
                        return;
                    }

                    itcb( null );
                }

                function onAllDone( err ) {
                    decFormBusy();
                    if ( err ) { Y.log( 'Error handling form value change: ' + JSON.stringify( err ), 'debug', NAME ); }
                }

                function enforceLock() {
                    
                    function onResetToStoredData() {
                        Y.log( 'Form reset to state before edit.', 'debug', NAME );
                    }
                    function onResetFromDict( err ) {
                        if ( err ) {
                            Y.log( 'Problem enforcing lock on form: ' + JSON.stringify( err ), 'warn', NAME );
                            //  continue with rerender anyway
                        }
                        template.render( onResetToStoredData );
                    }
                    if( formDoc && formDoc.type ) {
                        try {
                            template.fromDict( Y.doccirrus.api.document.formDocToDict( formDoc ), onResetFromDict );
                        } catch( parseErr ) {
                            Y.log( 'Could not parse saved form state.', 'warn', NAME );
                        }
                    }
                }

            }

            function onFormFocusChanged( fromElement ) {
                if ( !currentActivity._isEditable() || 'fill' !== template.mode ) { return; }
                //  prevent save while previously selected element updates the form document
                incFormBusy();

                Y.dcforms.runInSeries( [ updateInherited, updateMapped, updateInFormDoc ], onEventHandled );

                function updateInherited( itcb ) {
                    //  if this element inherits from another then skip this step
                    if ( fromElement.inheritFrom && '' !== fromElement.inheritFrom ) { return itcb( null ); }
                    template.updateInheritedFields( itcb );
                }

                function updateMapped( itcb ) {
                    //  if not bound then nothing to remap
                    if (!fromElement.schemaMember || '' === fromElement.schemaMember) { return itcb( null ); }

                    var mapObj = {};
                    mapObj[fromElement.schemaMember] = fromElement.unmap();
                    template.map( mapObj, true, itcb );
                }

                function updateInFormDoc( itcb ) {
                    context.attachments.updateFormDoc( context, template, itcb );
                }

                function onEventHandled( err ) {
                    if ( err ) {
                        Y.log( 'Problem updating other form elements which may use this value: ' + JSON.stringify( err ), 'debug', NAME );
                    }

                    //  handle barcodes, update to document, etc which may follow from changes made above
                    onFormValueChanged( fromElement );

                    decFormBusy();
                }
            }

            function onTableRowRemoved( eventData ) {
                if ( !eventData || !eventData.activityId || !currentActivity._isEditable() ) {
                    Y.log( 'table row removed, but no change to be made to linked activities.', 'debug', NAME );
                    return;
                }

                Y.log( 'Remove linked activity corresponding to table row: ' + eventData.activityId, 'debug', NAME );
                currentActivity._unlinkActivity( eventData.activityId );
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

                //  dispose all form template events subscribed from this mapper
                template.off( '*', 'dcforms-map-incase' );
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
                    Y.log( 'Updated form document in response to user event in form.', 'debug', NAME );
                }
            }

            /**
             *  Called when the user selects or deselects items in the datatable
             *
             *  This is used by invoice and prescription mappers, currently only a stub in this mapper.
             *
             *  @/param  newSelection    {String}    Set of _ids of selected items
             */

            function onSelectionChanged( /* newSelection */ ) {
                if( Y.config.debug ) {
                    Y.log( 'Linked activities have changed, updating mapped fields...', 'debug', NAME );
                }

                function onReMapped( err ) {
                    if( err ) {
                        Y.log( 'Could not map new selection into form: ' + JSON.stringify( err ), 'error', NAME );
                        return;
                    }
                    context.attachments.updateFormDoc( context, template, onUpdatedFormData );
                    template.raise( 'mapcomplete', template.unmap() );
                }

                function onUpdatedFormData( err ) {
                    if( err ) {
                        Y.log( 'Problem updating saved form state: ' + JSON.stringify( err ), 'warn', NAME );
                    }
                }

                if (currentActivity.inTransition && currentActivity.inTransition()) {
                    Y.log( 'Activity is in transition, not remapping form.', 'info', NAME );
                    return;
                }

                if( !currentActivity._isEditable() ) {
                    Y.log( 'Activity is not in editable state, not linking to selected activity.', 'info', NAME );
                    return;
                }

                //  on editable mask we need to remap everything to update the barcode correctly
                mapLinkedActivities( function editableMaskMap( err ) {
                    if ( err ) { return onReMapped( err ); }
                    if ( !isActivityWithMask( ) ) {
                        return onReMapped( null );
                    }
                    map( function ( err ) {
                        if ( err ) { return onReMapped( err ); }
                        onReMapped( null );
                    } );
                } );
            }

            /**
             *  Update the form without making the formDoc dirty
             *  @param  {Object}    mapData
             */

            function cleanMapOnApproval( mapData ) {
                template.map( mapData, true, onMapNewStatus );

                function onMapNewStatus( err ) {
                    if ( err ) {
                        Y.log( 'Could not map receipt number: ' + JSON.stringify( err ), 'error', NAME );
                        return;
                    }
                    template.raise( 'mapcomplete', template.toDict() );
                    context.attachments.updateFormDoc( context, template, onUpdateFormDoc );
                }

                function onUpdateFormDoc( err ) {
                    if ( err ) {
                        Y.log( 'Could not update form document: ' + JSON.stringify( err ), 'error', NAME );
                        return;
                    }
                    var plainDoc = formDoc.get('dataUnModified');
                    formDoc.set( 'dataUnModified', plainDoc );
                }
            }

            /**
             *  Raised when form changes mode (fill|pdf|edit|shutdown)
             *  @param mode
             */

            function onModeSet(mode) {
                if ('shudown' === mode) {
                    onUnload();
                }
            }

            /**
             *  Change form editable state according to activity status
             *  @param   newState    {String}    A member of ActStatus_E
             */

            function onStateChanged( newState ) {
                if( !isLocked && currentActivity._isEditable() ) {
                    Y.log( 'set form editable for CaseFile state ' + newState, 'info', NAME );
                    template.setMode( 'fill', onModeSet );
                } else {
                    Y.log( 'set form uneditable for CaseFile state ' + newState, 'info', NAME );
                    template.setMode( 'locked', onModeSet );
                }
            }

            /**
             *  Called by ActivityDetailsViewModel after activity is approved
             *  @param  {Object}    activityData    From transition
             */

            function onActivityApproved( activityData ) {

                Y.log( 'Activity approved, updating form.', 'info', NAME );

                if( 'INVOICE' === activityData.actType ) {
                    cleanMapOnApproval( {
                        'invoiceNo': activityData.invoiceNo ,
                        'date': moment( activityData.timestamp ).format( 'DD.MM.YYYY' )
                    } );
                }

                if( Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( activityData.actType ) ) {
                    cleanMapOnApproval( {
                        'receiptNo': activityData.receiptNo ,
                        'content': activityData.userContent,
                        'date': moment( activityData.timestamp ).format( 'DD.MM.YYYY' )
                    } );
                }

                cleanMapOnApproval( {
                    'status': 'APPROVED',
                    'employeeInitials': activityData.employeeInitials,
                    'employeeId': activityData.employeeId
                } );
            }

            /**
             *  Make barcode updates directly, rather than remapping the whole form (performance on writeback, MOJ-13317)
             *
             *  @param  {Object}    passedData  Changes to mapped states
             */

            function onRemapBarcode( passedData ) {
                var
                    mapData = _k.unwrap( formDoc.mapData ) || {},
                    barcodes = {},
                    updated = false,
                    page, elem,
                    i, j, k;

                for ( k in passedData ) {
                    if ( passedData.hasOwnProperty( k ) ) {
                        mapData[k] = passedData[k];
                    }
                }

                updateBarCode( mapData );

                for ( k in mapData ) {
                    if ( mapData.hasOwnProperty( k ) ) {
                        if ( 'barcode' === k.substr( 0, 7 ) ) {
                            barcodes[k] = mapData[k];
                            updated = true;
                        }
                    }
                }

                if ( !updated ) { return; }

                for ( i = 0; i < template.pages.length; i++ ) {
                    page = template.pages[i];
                    for ( j = 0; j < page.elements.length; j++ ) {
                        elem = page.elements[j];
                        if ( elem.schemaMember && barcodes.hasOwnProperty( elem.schemaMember ) ) {
                            elem.setValue( barcodes[ elem.schemaMember ], Y.dcforms.nullCallback );
                        }
                    }
                }
            }

            //  RETURN MAPPER INTERFACE  / API

            return {
                'map': map,
                'unmap': unmap,
                'handleEvent': onTemplateEvent,
                'onActivityApproved': onActivityApproved,
                'destroy': onUnload,
                'context': context
            };

        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [
            'oop',
            'dcforms-utils',
            'document-api',
            'dcgenericformmappers',
            'dcgenericmapper-util',
            'dcforms-schema-AMTSFormMapper-T'
        ]
    }
);