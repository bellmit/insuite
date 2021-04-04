/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'DmpEditorModel', function( Y, NAME ) {
    'use strict';
    /**
     * @module DmpEditorModel
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        eDmpHelpers = Y.doccirrus.edmpcommonutils,
        PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER = eDmpHelpers.PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER,

        arrayFirst = ko.utils.arrayFirst,

        getConcomitantDiseaseIdByActType = Y.doccirrus.edmpcommonutils.getConcomitantDiseaseIdByActType,
        edmpcommonutils = Y.doccirrus.edmpcommonutils,

        gerErr = Y.doccirrus.errorTable.getMessage,

        i18n = Y.doccirrus.i18n,
        NOTIFY_PATIENT_ABOUT_STATEMENT_OF_PARTICIPATION = i18n( 'InCaseMojit.DmpEditorModel.messages.NOTIFY_PATIENT_ABOUT_STATEMENT_OF_PARTICIPATION' ),
        PATIENT_HAS_FIRST_DOC = i18n( 'InCaseMojit.DmpEditorModel.messages.PATIENT_HAS_FIRST_DOC' ),
        PATIENT_HAS_NO_DOC = i18n( 'InCaseMojit.DmpEditorModel.messages.PATIENT_HAS_NO_DOC' ),
        PATIENT_HAS_NO_PREOPERATIVE_FIRST_DOC = i18n( 'InCaseMojit.DmpEditorModel.messages.PATIENT_HAS_NO_PREOPERATIVE_FIRST_DOC' ),
        PATIENT_HAS_ALREADY_POSTOPERATIVE_FIRST_DOC = i18n( 'InCaseMojit.DmpEditorModel.messages.PATIENT_HAS_ALREADY_POSTOPERATIVE_FIRST_DOC' ),

        KoViewModel = Y.doccirrus.KoViewModel,
        ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' );

    /**
     * @class DmpEditorModel
     * @constructor
     * @extends ActivityEditorModel
     */
    function DmpEditorModel( config ) {
        DmpEditorModel.superclass.constructor.call( this, config );
    }

    DmpEditorModel.ATTRS = {
        whiteList: {
            value: [
                'actType',
                'dmpHeadDate',
                'dmpSignatureDate',
                'dmpScheinRef',
                'dmpQuarter',
                'dmpYear',
                'dmpType',
                'dmpCreatedInRepresentation',
                'dmpPhsicianChanged',
                'dmpSmoker',
                'dmpWeight',
                'dmpHeight',
                'dmpConcomitantDisease',
                'dmpBloodPressureSystolic',
                'dmpBloodPressureDiastolic',
                'dmpPatientWantsInfos',
                'dmpDocumentationInterval',
                'patientId',
                'caseFolderId',
                'status',
                'timestamp',
                'patientShort',
                'actType',
                'dmpGender',
                'dmpNeedsMergeAcknowledgment',
                'dmpSmoker'
            ],
            lazyAdd: false
        }
    };

    function generateYearListFrom( year ) {
        var i,
            list = [];
        for(i = year; i > year - 10; i--){
            list.push(i);
        }
        return list;
    }

    Y.extend( DmpEditorModel, ActivityEditorModel, {
        initializer: function DmpDmEditor_initializer() {
            var
                self = this;

            self.initDmpEditorModel();
        },
        destructor: function DmpDmEditor_destructor() {
        },
        /**
         * Computes if this Dm is a PNP documentation
         */
        isFirst: null,/**
         * Computes if this Dm is a PNP documentation
         */
        isPnp: null,
        /**  * Computes if this Dm is a following documentation
         */
        isFollowing: null,
        /**
         * allow the dmpDocumentationInterval to be "EVERY_FOURTH_QUARTER"
         */
        allowDocumentationIntervalEveryFourthQuarter : null,
        /**
         * contains all available scheins of same quarter as dmp activity
         */
        scheinRefList: null,
        /**
         * computed to validate and set patient's kbvDob
         */
        edmpDob: null,
        /**
         * Initializes DMP editor model
         * @method initDmpEditorModel
         */
        initDmpEditorModel: function DmpEditorModel_initDmpEditorModel() {
            var
                self = this,
                binder = self.get('binder'),
                incaseconfiguration = binder.getInitialData('incaseconfiguration'),
                currentActivity = peek( self.get( 'currentActivity' ) ),
                currentPatient = peek( self.get( 'currentPatient' ) ),
                lastSignatureDate,
                status = self.status();

            self.dmpAllowHeadDateChange = incaseconfiguration && !!incaseconfiguration.dmpAllowHeadDateChange;

            self.dmpHeadDateReadOnly = ko.computed( function() {
                return !incaseconfiguration.dmpAllowHeadDateChange || self.dmpHeadDate.readOnly();
            } );

            self.isFirst = ko.computed( function() {
                return 'FIRST' === unwrap( self.dmpType );
            } );
            self.isPnp = ko.computed( function() {
                return 'PNP' === unwrap( self.dmpType );
            } );
            self.isFollowing = ko.computed( function() {
                return 'FOLLOWING' === unwrap( self.dmpType );
            } );

            // [MOJ-10727] EVERY_FOURTH_QUARTER as option for the documentationInterval is just allowed for "BK" right now
            self.allowDocumentationIntervalEveryFourthQuarter = (self.actType() === 'BK');

            self.diagnosisChainInfo = ko.observable( null );

            /**
             * [MOJ-10727] rewritten and optimized
             * Fixes also a bug with the for post-operation first-time documentations:
             * There was a race condition which resulted in a hint that no first-time documentation exists,
             * although there was one, but which was not yet fetched
             */
            self.collectDiagnosisChainInfo()
                .then(
                    function () {
                        self.initFirstLastDoc();
                    }
                );
            self.initBloodPressureValidators();
            self.setDefaultConcomitantDiseases();

            // this is static data and must only set once
            self.shortEdmpCaseNo = peek( currentPatient.edmpCaseNo );
            self.shortEdmpTypes = peek( currentPatient.edmpTypes );
            self.shortEdmpParticipationChronicHeartFailure = peek( currentPatient.edmpParticipationChronicHeartFailure );

            self.availableQuarters = [1, 2, 3, 4];
            self.availableYears = generateYearListFrom( moment().year() + 1 );

            self.addDisposable( ko.computed( function() {
                self.dmpQuarter();
                self.dmpYear();
                self.dmpSignatureDate.validate();
            } ) );

            self.initEdmpDobValidator();

            // reset "Erstelldatum" on modification [eDMP Anforderungskatalog P1-15]

            if( status === 'VALID' || status === 'CREATED' || status === 'INVALID' ) {
                self.addDisposable( ko.computed( function() {
                    var isModified = currentActivity.isModified();

                    Object.keys( self ).forEach( function( key ) {

                        if( ['attachments', 'dmpSignatureDate', 'dmpQuarter', 'dmpYear', 'status', 'templateName', 'patientShort', 'patientShortFilled', 'shortOfficialNo', 'shortCommercialNo', 'shortEdmpCaseNo', 'shortEdmpTypes', 'shortEdmpParticipationChronicHeartFailure', '_shortDmpConcomitantDiseaseConfig'].indexOf( key ) !== -1 ) {
                            return;
                        }

                        if( ko.isObservable( self[key] ) ) {
                            self[key]();
                        }

                    } );

                    if( isModified ) {
                        resetSignatureDatum();
                    }

                } ) );
            }

            self.addDisposable( ko.computed( function() {
                // revalidate because of quarter specific validations
                self.dmpQuarter();
                self.dmpYear();
                currentActivity.revalidate();
            } ) );

            function resetSignatureDatum() {
                var dmpSignatureDate = currentActivity.dmpSignatureDate();

                if( !lastSignatureDate || lastSignatureDate !== dmpSignatureDate ) {
                    lastSignatureDate = dmpSignatureDate;
                } else {
                    self.dmpSignatureDate( null );
                }

            }

            self.initHeight();
            self.initWeight();
            self.initBloodPressure();
            self.initScheinRef();
            self.initShortPatient();

            if( peek( self.dmpNeedsMergeAcknowledgment ) ) {
                Y.log( 'DmpEditorModel_initDmpEditorModel: show merge diff', 'info', NAME );
                Y.doccirrus.modals.mergeModal.showMergeDialog(self);
            }

            self.isAfterQ22017 = ko.computed( function() {
                const
                    afterDate = moment( '2/2017', 'Q/YYYY' ),
                    contextDate = moment( self.dmpQuarter() + '/' + self.dmpYear(), 'Q/YYYY' );
                return contextDate.isAfter( afterDate );
            } );

            self.isAfterQ12018 = ko.computed( function() {
                const
                    afterDate = moment( PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER, 'Q/YYYY' ),
                    contextDate = moment( self.dmpQuarter() + '/' + self.dmpYear(), 'Q/YYYY' );
                return contextDate.isAfter( afterDate );
            } );

            self.scheinRefList = ko.observableArray();

            self.addDisposable( ko.computed( function() {
                var dmpSignatureDate,
                    isValid,
                    isFirstDoc;

                if( -1 === currentPatient.edmpNotifiedAboutStatementOfParticipationTypes.indexOf( peek( self.actType ) ) ) {
                    dmpSignatureDate = self.dmpSignatureDate();
                    isValid = currentActivity.isValid();
                    isFirstDoc = 'FIRST' === self.dmpType();

                    if( dmpSignatureDate && isValid && isFirstDoc ) {
                        Y.doccirrus.DCWindow.confirm( {
                            message: NOTIFY_PATIENT_ABOUT_STATEMENT_OF_PARTICIPATION,
                            callback: function( dialog ) {
                                if( dialog.success ) {
                                    currentPatient.updateEdmpNotifiedAboutStatementOfParticipationTypes( peek( self.actType ) );
                                }
                            },
                            window: {
                                width: 'medium'
                            }
                        } );
                    }
                }
            } ) );
        },
        initFirstLastDoc: function() {
            var self = this;

            self.addDisposable( ko.computed( function() {
                var
                    // get information about the diagnosis chain
                    diagnosisChainInfo = self.diagnosisChainInfo(),
                    firstDocumentationExists = diagnosisChainInfo && diagnosisChainInfo.firstDocumentationExists,
                    firstDocumentationIsPreOperative = diagnosisChainInfo && diagnosisChainInfo.firstDocumentationIsPreOperative,
                    postOperativeDocumentationExists = diagnosisChainInfo && diagnosisChainInfo.postOperativeDocumentationExists,
                    physicianChangedOnce = diagnosisChainInfo && diagnosisChainInfo.physicianChangedOnce,

                    // get values of the current case, to compare and validate it with the history
                    dmpType = self.dmpType(),
                    isFirst = (dmpType === "FIRST"),
                    isPnp = (dmpType === "PNP"),
                    isFollowing = (dmpType === "FOLLOWING"),

                    // get parameters of the current activity
                    dmpPhsicianChanged = self.dmpPhsicianChanged(),
                    dmpCreatedInRepresentation = self.dmpCreatedInRepresentation(),
                    activityIsReadOnly = self.dmpPhsicianChanged.readOnly();

                /**
                 * Show a hint, if some conditions match. (see below)
                 * JUST show the hint if the activity is writable, else,
                 * the user may anyhow not change the activity.
                 */
                if( !activityIsReadOnly ) {
                    // Show a hint, if: trying to create two initial documentations
                    if( firstDocumentationExists && isFirst ) {
                        self.showHint( PATIENT_HAS_FIRST_DOC );
                    }
                    // Show a hint, if: trying to create a post-operative first-time doc without a pre-operative existing first-time-doc
                    else if( !firstDocumentationIsPreOperative && isPnp ) {
                        self.showHint( PATIENT_HAS_NO_PREOPERATIVE_FIRST_DOC );
                    }
                    // Show a hint, if: trying to create a second post-operative first-time doc
                    else if( firstDocumentationIsPreOperative && postOperativeDocumentationExists && isPnp ) {
                        self.showHint( PATIENT_HAS_ALREADY_POSTOPERATIVE_FIRST_DOC );
                    }
                    // Show a hint, if: no initial documentation exists, without a change of the physician, or a substitute physician.
                    else if( !firstDocumentationExists && isFollowing && !dmpPhsicianChanged && !physicianChangedOnce && !dmpCreatedInRepresentation ) {
                        self.showHint( PATIENT_HAS_NO_DOC );
                    }
                }
            } ) );

        },
        initShortPatient: function() {
            var self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( self.get( 'currentPatient' ) ),
                currentActivity = peek( self.get( 'currentActivity' ) ),
                locationList = binder.getInitialData( 'location' ),
                currentLocation,
                employeeList = [],
                currentEmployee,
                edmpTypes,
                patientShort = peek( self.patientShort );

            self.shortOfficialNo = ko.observable();
            self.shortCommercialNo = ko.observable();
            self.shortPatientAddress = ko.observable();
            self.shortGender = ko.observable();
            self.shortFk4133 = ko.observable();
            self.shortFk4110 = ko.observable();
            self.shortEmployeeName = ko.observable();
            self.shortEmployeeAddress = ko.observable();

            self.addDisposable( ko.computed( function() {
                var locationId = currentActivity.locationId();
                if( !locationId ) {
                    return;
                }
                currentLocation = locationList.find( function( loc ) {
                    return loc._id === locationId;
                } );
                if( !currentLocation ) {
                    return;
                }
                employeeList = currentLocation.employees || [];
                setAdditionalShortFields();
            } ) );

            self.addDisposable( ko.computed( function() {
                var employeeId = currentActivity.employeeId();
                if( !employeeId ) {
                    return;
                }
                currentEmployee = employeeList.find( function( emp ) {
                    return emp._id === employeeId;
                } );
                setAdditionalShortFields();
            } ) );

            if( patientShort && Object.keys( patientShort ).length > 0 ) {
                self.patientShortFilled = ko.observable( true );
            } else {
                self.patientShortFilled = ko.observable( false );
            }

            self.addDisposable( ko.computed( function() {
                var dmpScheinRefId = self.dmpScheinRef();

                if( !dmpScheinRefId ) {
                    self.patientShortFilled( false );
                    return;
                }

                if( ko.computedContext.isInitial() ) {
                    return;
                }
                Y.doccirrus.jsonrpc.api.kbv.scheinRelatedPatientVersion( {scheinId: dmpScheinRefId} )
                    .then( function( res ) {
                        setPatientShort( res.data );
                    } )
                    .fail( function( err ) {
                        if( err && '4052' === err.code ) {
                            Y.doccirrus.jsonrpc.api.patient.read( {
                                query: {
                                    _id: peek( currentActivity.patientId )
                                }
                            } ).then( function( res ) {
                                setPatientShort( res && res.data && res.data[0] );
                            } ).fail( Y.doccirrus.promise.catchUnhandled );

                            return;
                        }
                        Y.doccirrus.promise.catchUnhandled.call( null, err );
                    } );
            } ) );

            edmpTypes = peek( currentPatient.edmpTypes ).map( function( item ) {
                return {id: item, text: item};
            } );

            var filteredEdmpTypes = edmpTypes.filter(function(e) {
                return e.id !== "BK";
            });
            self._shortDmpConcomitantDiseaseConfig = {
                data: filteredEdmpTypes,
                select2: {
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    multiple: true,
                    data: filteredEdmpTypes
                }
            };

            self.addDisposable( ko.computed( function() {
                var patientShort = unwrap( self.patientShort ),
                    fk4133 = patientShort && patientShort.insuranceStatus && patientShort.insuranceStatus.fk4133,
                    fk4110 = patientShort && patientShort.insuranceStatus && patientShort.insuranceStatus.fk4110,
                    shortFk4133 = fk4133 ? moment( fk4133 ).format( 'DD.MM.YYYY' ) : '',
                    shortFk4110 = fk4110 ? moment( fk4110 ).format( 'DD.MM.YYYY' ) : '';

                self.shortFk4133( shortFk4133 );
                self.shortFk4110( shortFk4110 );
                self.shortGender( (patientShort && patientShort.gender) ? Y.doccirrus.kbvcommonutils.mapGender( patientShort.gender ) : '' );
                self.shortPatientAddress( patientShort ? Y.doccirrus.schemas.person.addressDisplay( patientShort.addresses ) : '' );
            } ) );

            function setPatientShort( patient ) {
                var short = peek( self.patientShort ) || {};

                short = edmpcommonutils.getPatientShort( patient, short );
                setAdditionalShortFields();
                if( patient && patient.gender ) {
                    self.dmpGender( 'UNKNOWN' === patient.gender ? 'UNDEFINED' : patient.gender );
                }
                self.patientShort( short );
                self.patientShortFilled( short && Object.keys( short ).length > 0 );
            }

            function setAdditionalShortFields() {
                if( !employeeList || !currentEmployee || !currentEmployee._id ) {
                    return;
                }

                self.shortOfficialNo( currentEmployee.officialNo || '' );
                self.shortCommercialNo( currentLocation.commercialNo || currentLocation.institutionCode || '' );
                self.shortEmployeeName( Y.doccirrus.schemas.person.personDisplay( currentEmployee ) || '' );
                self.shortEmployeeAddress( currentLocation ? Y.doccirrus.schemas.person.addressDisplay( [currentLocation] ) : '' );
            }

        },
        initScheinRef: function() {
            var self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                caseFolderCollection = currentPatient.caseFolderCollection,
                dmpScheinRef = unwrap( self.dmpScheinRef ),
                fourMonthAgo = moment().subtract( 4, 'quarter' ).toDate(),
                query = {
                    actType: 'SCHEIN',
                    status: {$in: ['VALID', 'APPROVED', 'BILLED']},
                    patientId: unwrap( currentPatient._id ),
                    timestamp: {
                        $gt: fourMonthAgo
                    }
                };

            if( self.scheinIsPending ) {
                return;
            }
            self.scheinIsPending = true;

            Promise.resolve( Y.doccirrus.jsonrpc.api.activity.read( {
                query: query,
                fields: {
                    _id: 1,
                    content: 1,
                    caseFolderId: 1,
                    timestamp: 1
                }
            } ) ).then( function( response ) {

                var newListContainsSchein = null,
                    status = unwrap( self.status ),
                    newList = (response && response.data || []).map( function( schein ) {

                        var caseFolder = caseFolderCollection.find( function( cf ) {
                                return cf._id === schein.caseFolderId;
                            } ),
                            text = [
                                moment( schein.timestamp ).format( 'DD.MM.YYYY' ),
                                caseFolder && caseFolder.title || '',
                                schein.content
                            ].join( ' ' );
                        return {
                            id: schein._id,
                            text: text
                        };
                    } );

                self.scheinRefList( newList );

                if( -1 !== ['CREATED', 'VALID'].indexOf( status ) && dmpScheinRef ) {
                    newListContainsSchein = newList.some( function( entry ) {
                        return entry.id === dmpScheinRef;
                    } );
                    if( !newListContainsSchein ) {
                        Y.log( 'reset dmpScheinRef because current list does not contain saved dmpScheinRef', 'debug', NAME );
                        self.dmpScheinRef( null );
                    }
                } else if( -1 !== ['CREATED', 'VALID'].indexOf( status ) && !dmpScheinRef && 1 === newList.length ) {
                    self.dmpScheinRef( newList[0].id );
                }
                self.scheinIsPending = false;
            } ).catch( function( err ) {
                self.scheinIsPending = false;
                Y.log( 'could not get current scheins: ' + err, 'error', NAME );
            } );

        },
        initBloodPressureValidators: function() {

            var
                self = this,
                activity = peek( self.get( 'currentActivity' ) ),
                errStr = activity.clientId + '.dmpBloodPressure';

            activity.dmpBloodPressureSystolic.hasError = ko.observable( false );
            activity.dmpBloodPressureDiastolic.hasError = ko.observable( false );
            activity.dmpBloodPressureSystolic.validationMessages = ko.observableArray();
            activity.dmpBloodPressureDiastolic.validationMessages = ko.observableArray();

            self.addDisposable( ko.computed( function() {

                var activity = peek( self.get( 'currentActivity' ) ),
                    patient = activity && activity.patientShort ? activity.patientShort() : null,
                    bloodPressure;

                if( !patient ) {
                    return;
                }

                activity.dmpBloodPressureSystolic();
                activity.dmpBloodPressureDiastolic();

                activity.dmpBloodPressureSystolic.validationMessages.removeAll();
                activity.dmpBloodPressureDiastolic.validationMessages.removeAll();

                bloodPressure = eDmpHelpers.validateBloodPressure( patient, activity.toJSON() );

                self.setValidationState( bloodPressure, activity, errStr );

                activity.dmpBloodPressureSystolic.hasError( !bloodPressure.isValid );
                activity.dmpBloodPressureDiastolic.hasError( !bloodPressure.isValid );

                if( bloodPressure.err && bloodPressure.err.code ) {
                    activity.dmpBloodPressureSystolic.validationMessages.push( gerErr( {code: bloodPressure.err.code} ) );
                    activity.dmpBloodPressureDiastolic.validationMessages.push( gerErr( {code: bloodPressure.err.code} ) );
                }

            } ) );

        },
        initEdmpDobValidator: function() {

            var
                self = this,
                activity = peek( self.get( 'currentActivity' ) ),
                patient = peek( self.get( 'currentPatient' ) ),
                errStr = activity.clientId + '.edmpDob',
                errStrDmpSmoker = activity.clientId + '.dmpSmoker';

            self.edmpDob = ko.observable();
            self.edmpDob.hasError = ko.observable( false );
            self.edmpDob.validationMessages = ko.observableArray();
            self.edmpDob.readOnly = ko.computed( function() {
                var patientShort = self.patientShort();
                if( patientShort && patientShort.insuranceStatus ) {
                    return Boolean( patientShort.insuranceStatus.cardSwipe );
                }

                return false;
            } );

            self.edmpDob.subscribe( function( val ) {
                var patientShort = peek( self.patientShort );
                if( patientShort ) {
                    patientShort.kbvDob = val;
                }
            } );

            self.addDisposable( ko.computed( function() {
                var patient = activity && activity.patientShort ? activity.patientShort() : null,
                    dateArr;
                if( patient && 'string' === typeof patient.kbvDob ) {
                    dateArr = patient.kbvDob.split( '.' );
                    if( '00' === dateArr[0] ) {
                        dateArr[0] = '01';
                    }
                    if( '00' === dateArr[1] ) {
                        dateArr[1] = '01';
                    }
                    self.edmpDob( dateArr.join( '.' ) );
                }
            } ) );

            self.addDisposable( ko.computed( function() {

                var
                    result,
                    edmpDob = self.edmpDob();

                self.edmpDob.validationMessages.removeAll();

                result = eDmpHelpers.validateEdmpDob( edmpDob );
                self.setValidationState( result, activity, errStr );
                self.edmpDob.hasError( !result.isValid );

                if( !result.isValid ) {
                    self.edmpDob.validationMessages.push( result.err );
                }

            } ) );

            self.dmpSmoker.hasError = ko.observable();
            self.dmpSmoker.validationMessages = ko.observableArray();

            self.addDisposable( ko.computed( function() {

                function validateDmpSmoker() {
                    var isValid = true,
                        isMandatory = false,
                        ageAtCreation,
                        DMP_BASE_T_MANDATORY_ERR = i18n( 'validations.kbv.message.DMP_BASE_T_MANDATORY_ERR' );

                    if( !isBK && dmpSignatureDate ) {
                        ageAtCreation = moment( dmpSignatureDate ).diff( patientDob, 'years' );
                        isMandatory = ageAtCreation >= 12;
                    }

                    if( isMandatory ) {
                        isValid = Boolean( dmpSmoker );
                    }

                    return {isValid: isValid, err: isValid ? null : DMP_BASE_T_MANDATORY_ERR};
                }

                var
                    result,
                    isBK = self.actType() === 'BK',
                    patientDob = patient.dob(),
                    dmpSignatureDate = self.dmpSignatureDate(),
                    dmpSmoker = self.dmpSmoker();

                self.dmpSmoker.validationMessages.removeAll();

                result = validateDmpSmoker();

                self.setValidationState( result, activity, errStrDmpSmoker );
                self.dmpSmoker.hasError( !result.isValid );

                if( !result.isValid ) {
                    self.edmpDob.validationMessages.push( result.err );
                }

            } ) );

        },
        /**
         * Computes conversion for "dmpHeight" between number and string
         */
        dmpHeightString: null,
        initHeight: function() {
            var
                self = this;

            self.dmpHeightString = ko.computed( {
                read: function() {
                    var
                        dmpHeight = unwrap( self.dmpHeight );

                    if( Y.Lang.isNumber( dmpHeight ) ) {
                        dmpHeight = Y.doccirrus.comctl.numberToLocalString( dmpHeight, {
                            decimals: 2
                        } );
                    }

                    return dmpHeight;
                },
                write: function( value ) {
                    var
                        dmpHeightPrev = peek( self.dmpHeight );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 2 decimal also for "dmpHeight" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 2 decimal transformed as for read is done
                            decimals: 2
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpHeight" needs it
                    }
                    self.dmpHeight( value );
                    if( value === dmpHeightPrev ) {
                        self.dmpHeight.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );
        },
        /**
         * Computes conversion for "dmpWeight" between number and string
         */
        dmpWeightString: null,
        initWeight: function() {
            var
                self = this;

            self.dmpWeightString = ko.computed( {
                read: function() {
                    var
                        dmpWeight = unwrap( self.dmpWeight );

                    if( Y.Lang.isNumber( dmpWeight ) ) {
                        dmpWeight = Y.doccirrus.comctl.numberToLocalString( dmpWeight, {decimals: 0} );
                    }

                    return dmpWeight;
                },
                write: function( value ) {
                    var
                        dmpWeightPrev = peek( self.dmpWeight );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 1 decimal also for "dmpWeight" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                            decimals: 0
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpWeight" needs it
                    }
                    self.dmpWeight( value );
                    if( value === dmpWeightPrev ) {
                        self.dmpWeight.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );
        },
        /**
         * Computes conversion for "dmpBloodPressureSystolic" between number and string
         */
        dmpBloodPressureSystolicString: null,
        /**
         * Computes conversion for "dmpBloodPressureDiastolic" between number and string
         */
        dmpBloodPressureDiastolicString: null,
        initBloodPressure: function() {
            var
                self = this,
                actType = peek( self.actType ),
                patient = peek( self.get( 'currentPatient' ) ).toJSON();

            var isBloodPressureOptional = edmpcommonutils
                .isBloodPressureOptional( patient, peek( self.dmpHeadDate ), 18, actType );
            var hintLevel = isBloodPressureOptional ? 'OPTIONAL' : null;

            self.dmpBloodPressureSystolic.hintLevel = hintLevel;
            self.dmpBloodPressureDiastolic.hintLevel = hintLevel;

            self.dmpBloodPressureSystolicString = ko.computed( {
                read: function() {
                    var
                        dmpBloodPressureSystolic = unwrap( self.dmpBloodPressureSystolic );

                    if( Y.Lang.isNumber( dmpBloodPressureSystolic ) ) {
                        dmpBloodPressureSystolic = Y.doccirrus.comctl.numberToLocalString( dmpBloodPressureSystolic, {
                            decimals: 0
                        } );
                    }

                    return dmpBloodPressureSystolic;
                },
                write: function( value ) {
                    var
                        dmpBloodPressureSystolicPrev = peek( self.dmpBloodPressureSystolic );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 0 decimal also for "dmpBloodPressureSystolic" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                            decimals: 0
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpBloodPressureSystolic" needs it
                    }
                    self.dmpBloodPressureSystolic( value );
                    if( value === dmpBloodPressureSystolicPrev ) {
                        self.dmpBloodPressureSystolic.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );

            self.dmpBloodPressureDiastolicString = ko.computed( {
                read: function() {
                    var
                        dmpBloodPressureDiastolic = unwrap( self.dmpBloodPressureDiastolic );

                    if( Y.Lang.isNumber( dmpBloodPressureDiastolic ) ) {
                        dmpBloodPressureDiastolic = Y.doccirrus.comctl.numberToLocalString( dmpBloodPressureDiastolic, {
                            decimals: 0
                        } );
                    }

                    return dmpBloodPressureDiastolic;
                },
                write: function( value ) {
                    var
                        dmpBloodPressureDiastolicPrev = peek( self.dmpBloodPressureDiastolic );

                    if( Y.Lang.isString( value ) && value ) {
                        /** ensure max 0 decimal also for "dmpBloodPressureDiastolic" by: **/
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert to number, because of "numberToLocalString"
                        value = Y.doccirrus.comctl.numberToLocalString( value, { // get a max 0 decimal transformed as for read is done
                            decimals: 0
                        } );
                        value = Y.doccirrus.comctl.localStringToNumber( value ); // convert again to number as "dmpBloodPressureDiastolic" needs it
                    }
                    self.dmpBloodPressureDiastolic( value );
                    if( value === dmpBloodPressureDiastolicPrev ) {
                        self.dmpBloodPressureDiastolic.valueHasMutated();
                    }
                }
            } ).extend( {notify: 'always'} );

        },
        diagnosisChainInfo : null,
        /**
         * Collects a set of statistical information about the history of documentations on the server-side.
         * @returns {Promise<*>}
         */
        collectDiagnosisChainInfo: function() {
            var self = this;
            return Promise.resolve( Y.doccirrus.jsonrpc.api.edmp.collectDiagnosisChainInfo( {
                patientId: peek( self.patientId ),
                caseFolderId: peek( self.caseFolderId ),
                timestamp: peek( self.timestamp ),
                actType: peek( self.actType )
            } ) ).then( function( result ) {
                self.diagnosisChainInfo( result.data );
            } ).catch( function( err ) {
                Y.log( 'could not get diagnosis chain information: ' + err, 'error', NAME );
            } );
        },
        showHint: function( msg ) {
            Y.doccirrus.DCWindow.notice( {
                type: 'info',
                message: msg,
                window: {width: 'medium'}
            } );
        },
        setDefaultConcomitantDiseases: function() {
            var self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                edmpSubscriptions;
            self.edmpSubscriptions = edmpSubscriptions = currentPatient.edmpTypes().filter(function (edmpType) {
                return edmpType !== 'BK';
            });

            if( self.dmpConcomitantDisease.readOnly() ) {
                return;
            }

            edmpSubscriptions.forEach( function( type ) {
                if( type !== self.actType() && -1 === self.dmpConcomitantDisease.indexOf( getConcomitantDiseaseIdByActType( type ) ) ) {
                    self.dmpConcomitantDisease.remove( 'NONE_OF_THESE_DISEASES' );
                    self.dmpConcomitantDisease.push( getConcomitantDiseaseIdByActType( type ) );
                }
            } );
        },
        setValidationState: function( prop, activity, errStr ) {
            var exists;
            if( !prop.isValid ) {

                exists = arrayFirst( activity._validStateMap(), function( item ) {
                    return item === errStr;
                } );

                if( !exists ) {
                    activity._validStateMap.push( errStr );
                }

            } else {
                activity._validStateMap.remove( errStr );
            }
        },
        resetDmpSmoker: function() {
            var self = this;
            self.dmpSmoker( null );
        }
    }, {
        NAME: 'DmpEditorModel'
    } );

    KoViewModel.registerConstructor( DmpEditorModel );

}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'ActivityEditorModel',
        'dc-comctl',
        'edmp-commonutils',
        'merge-modal',
        'dckbvutils'
    ]
} );
