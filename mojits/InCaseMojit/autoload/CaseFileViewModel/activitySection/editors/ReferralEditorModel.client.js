/**
 * User: pi
 * Date: 21/01/16  14:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'ReferralEditorModel', function( Y, NAME ) {
        /**
         * @module ReferralEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' ),
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            REQUEST_ETS_ARRANGEMENT_CODE = i18n( 'InCaseMojit.ReferralEditorModelJS.button.REQUEST_ETS_ARRANGEMENT_CODE' ),
            REQUEST_IS_PENDING = i18n( 'InCaseMojit.ReferralEditorModelJS.message.REQUEST_IS_PENDING' ),
            ADDITIONAL_ERROR_HINT = i18n( 'InCaseMojit.ReferralEditorModelJS.message.ADDITIONAL_ERROR_HINT' ),
            ADDITIONAL_ERROR_HINT_ALT = i18n( 'InCaseMojit.ReferralEditorModelJS.message.ADDITIONAL_ERROR_HINT_ALT' ),
            PRINT_ON_ERROR = i18n( 'InCaseMojit.ReferralEditorModelJS.message.PRINT_ON_ERROR' ),
            INVALID_ETS_REFERRAL_REQUEST = i18n( 'InCaseMojit.ReferralEditorModelJS.message.INVALID_ETS_REFERRAL_REQUEST' ),
            MAX_TEXT_LEN = 60;

        function handleError( err ) {
            var code = err.code || err.statusCode;
            if( code ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: Y.doccirrus.errorTable.getMessage( {code: code} ) + '<br><br>' +
                             ADDITIONAL_ERROR_HINT
                } );
            }
            Y.log( 'error: ' + err.message, 'warn', NAME );
        }


        /**
         * @class ReferralEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function ReferralEditorModel( config ) {
            ReferralEditorModel.superclass.constructor.call( this, config );
        }

        ReferralEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'status',
                    'timestamp',
                    'locationId',
                    'employeeId',
                    'urgency',
                    'eTSArrangementCode',
                    'eTSArrangementCodeRequestMessageId',
                    'eTSAErrorMessage',
                    'eTSAdditionalQualifications',
                    'scheinSlipMedicalTreatment',
                    'behandlungGemaess',
                    'asvTeamReferral',
                    'fk4204',
                    'fk4202',
                    'untersArt',
                    'auBis',
                    'datumOP',
                    'labRequestId',
                    'auftrag',
                    'ueberwAn',
                    'ueberwAnCodeSystem',
                    'diagnosesText',
                    'medicationsText',
                    'findingsText'
                ],
                lazyAdd: false
            }
        };

        function mapSpecialitiesSelect2( item ) {
            if( !item ) {
                return null;
            }
            item.system = (peek( item.code ) + ' ' + peek( item.url ));
            return {
                id: peek( item.code ),
                text: peek( item.display ),
                system: item.system,
                _data: item
            };
        }

        Y.extend( ReferralEditorModel, ActivityEditorModel, {
                initializer: function ReferralEditorModel_initializer() {

                    var
                        self = this;

                    self.initReferralEditorModel();
                    self.initSelect2Specialities();
                    self.initSelect2AdditionalQualifications();

                },
                destructor: function ReferralEditorModel_destructor() {
                },

                select2Specialities: null,

                /**
                 * Initialises specialities autoComplete
                 */
                initSelect2Specialities: function EmployeeEditModel_initSelect2Specialities() {
                    var
                        self = this;

                    self.select2Specialities = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                return self.ueberwAn();
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.ueberwAn( $event.added.text );
                                    self.ueberwAnCodeSystem( $event.added.system || null );
                                } else {
                                    self.ueberwAn( null );
                                    self.ueberwAnCodeSystem( null );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            allowClear: true,
                            multiple: false,
                            query: function( query ) {
                                Promise.resolve( Y.doccirrus.jsonrpc.api.fhir_codesystem.searchCodeSystems( {
                                    term: query.term,
                                    systems: ['74_CS_SFHIR_BAR2_WBO', '74_CS_SFHIR_BPL_ARZTGRUPPE']
                                } ) ).then( function( response ) {
                                    query.callback( {results: (response.data || []).map( mapSpecialitiesSelect2 )} );
                                } ).catch( function( err ) {
                                    Y.log( 'could not get specialities fhir_codesystems ' + err, 'warn', NAME );
                                } );
                            },
                            initSelection: function( element, callback ) {
                                callback( {
                                    id: self.ueberwAn(),
                                    text: self.ueberwAn()
                                } );
                            },
                            createSearchChoice: function( term ) {
                                return {
                                    id: term,
                                    text: term
                                };
                            }
                        }
                    };
                },

                select2AdditionalQualifications: null,

                /**
                 * Initialises specialities autoComplete
                 */
                initSelect2AdditionalQualifications: function EmployeeEditModel_initSelect2AdditionalQualifications() {
                    var
                        self = this;

                    self.select2AdditionalQualifications = { // self.select2Candidates = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return self.eTSAdditionalQualifications().map( mapSpecialitiesSelect2 );
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.eTSAdditionalQualifications.push( $event.added._data );
                                }
                                if( $event.removed ) {
                                    self.eTSAdditionalQualifications.remove( $event.removed._data );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            allowClear: true,
                            multiple: true,
                            query: function( query ) {
                                Promise.resolve( Y.doccirrus.jsonrpc.api.fhir_codesystem.searchCodeSystems( {
                                    term: query.term,
                                    systems: ['74_CS_SFHIR_BAR_ZUSATZBEZEICHNUNG']
                                } ) ).then( function( response ) {
                                    query.callback( {results: (response.data || []).map( mapSpecialitiesSelect2 )} );
                                } ).catch( function( err ) {
                                    Y.log( 'could not get specialities fhir_codesystems ' + err, 'warn', NAME );
                                } );
                            }
                        }
                    };
                },
                /**
                 * Initializes assistive editor model
                 * @method initReferralEditorModel
                 */
                initReferralEditorModel: function ReferralEditorModel_initReferralEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        incaseConfig = binder.getInitialData( 'incaseconfiguration' ),
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        currentPatient = ko.unwrap( binder.currentPatient );

                    self.scheinSlipMedicalTreatment1I18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.1' );
                    self.scheinSlipMedicalTreatment2I18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.2' );
                    self.scheinSlipMedicalTreatment4I18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.4' );
                    self.auftragsleistungenI18n = i18n( 'activity-schema.UntersArt_E.auftragsleistungen.i18n' );
                    self.konsiliaruntersuchungI18n = i18n( 'activity-schema.UntersArt_E.konsiliaruntersuchung.i18n' );
                    self.mitWeiterBehandlungI18n = i18n( 'activity-schema.UntersArt_E.mitWeiterBehandlung.i18n' );
                    self.auBisI18n = i18n( 'activity-schema.Referral_T.auBis.i18n' );
                    self.ueberwAnI18n = i18n( 'activity-schema.Referral_T.ueberwAn.i18n' );
                    self.requestIsPendingI18n = REQUEST_IS_PENDING;

                    self.additionalErrorHintI18n = ko.computed( function() {
                        var eTSAErrorMessage = self.eTSAErrorMessage();
                        if( eTSAErrorMessage && eTSAErrorMessage.length && eTSAErrorMessage.toString().match( /\(2115\)/ ) ) {
                            return ADDITIONAL_ERROR_HINT_ALT;
                        }
                        return ADDITIONAL_ERROR_HINT;
                    } );

                    self.isPublicCaseFolder = ko.computed( function() {
                        var currentCaseFolder;
                        if( currentPatient ) {
                            currentCaseFolder = currentPatient.caseFolderCollection.getActiveTab();
                            return currentCaseFolder && currentCaseFolder.type === 'PUBLIC';
                        }
                        return false;
                    } );

                    self.isSwissCaseFolder = ko.computed( function() {
                        var currentCaseFolder;
                        if( !currentPatient ) { return false; }
                        currentCaseFolder = currentPatient.caseFolderCollection.getActiveTab();
                        if ( !currentCaseFolder ) { return false; }
                        return Y.doccirrus.schemas.casefolder.isSwissCaseFolderType( currentCaseFolder.type );
                    } );

                    self.ueberwAnI18n = i18n('activity-schema.Referral_T.ueberwAn.i18n');
                    self.showReferralIdInput = incaseConfig && incaseConfig.showReferralIdInput; // [MOJ-11912] show the ReferralId by config option, if configured

                    self._asvContext = currentActivity._asvContext;

                    Y.doccirrus.inCaseUtils.injectPopulatedObjs.call( self, {
                        dataModel: currentActivity,
                        fields: ['icdsObj', 'activitiesObj']
                    } );

                    //self._activitiesObj = ko.observableArray( currentActivity.get( 'data._activitiesObj' ) || [] );

                    /*
                     self._diagnosesCharsRemaining = ko.computed( function() {
                     return ( ( MAX_TEXT_LEN * 2 )  - currentActivity.diagnosesText().length );
                     } );
                     */

                    self._medicationsCharsRemaining = ko.computed( function() {
                        return (MAX_TEXT_LEN - currentActivity.medicationsText().length);
                    } );

                    self._findingsCharsRemaining = ko.computed( function() {
                        return (MAX_TEXT_LEN - currentActivity.findingsText().length);
                    } );

                    self._auftragCharsRemaining = ko.computed( function() {
                        var eTSArrangementCode = self.eTSArrangementCode(),
                            eTSAErrorMessage = self.eTSAErrorMessage(),
                            timestamp = self.timestamp(),
                            // "auftrag" is prefixed with arrangement code print line, if available, so there is less
                            // space. See renderAuftrag in genericformmappers.common.js.
                            eTSArrangementCodeLineLength = moment( timestamp ).year() > 2019 ? 69 : 32,
                            eTSAErrorMessageLength = 35;

                        return ((MAX_TEXT_LEN * 4) - currentActivity.auftrag().length -
                                (eTSArrangementCode ? eTSArrangementCodeLineLength : 0) -
                                (eTSAErrorMessage ? eTSAErrorMessageLength : 0));
                    } );

                    /*
                     self._diagnosesTextInvalid = ko.computed( function() {
                     return ( self._diagnosesCharsRemaining() < 0 ) ? 'has-error' : '';
                     } );
                     */

                    self._findingsTextInvalid = ko.computed( function() {
                        if ( self.isSwissCaseFolder() ) { return ''; }
                        return (self._findingsCharsRemaining() < 0) ? 'has-error' : '';
                    } );

                    self._medicationsTextInvalid = ko.computed( function() {
                        if ( self.isSwissCaseFolder() ) { return ''; }
                        return (self._medicationsCharsRemaining() < 0) ? 'has-error' : '';
                    } );

                    self._auftragTextInvalid = ko.computed( function() {
                        if ( self.isSwissCaseFolder() ) { return ''; }
                        return (self._auftragCharsRemaining() < 0) ? 'has-error' : '';
                    } );

                    self.kvcAccountStatus = ko.observable();

                    self.pendingRequest = ko.observable( false );

                    self.eTSAlertClass = ko.computed( function() {
                        var eTSAErrorMessage = self.eTSAErrorMessage(),
                            eTSArrangementCode = self.eTSArrangementCode();

                        if( eTSAErrorMessage ) {
                            return 'alert alert-warning';
                        } else if( eTSArrangementCode ) {
                            return 'alert alert-success';
                        }

                        return 'alert alert-info';
                    } );

                    Y.doccirrus.communication.on( {
                        event: 'eTS-ARRANGEMENT-CODE-DELIVERY',
                        done: function( message ) {
                            var data = message.data && message.data[0];

                            if( data.eTSArrangementCodeDeliveryOriginalMessageId &&
                                data.eTSArrangementCodeDeliveryOriginalMessageId === self.eTSArrangementCodeRequestMessageId() ) {
                                self.isModifiedObserver.setUnModified();
                                if(data.eTSArrangementCode){
                                    self.eTSArrangementCode( data.eTSArrangementCode );
                                }
                                self.lastETSArrangementCode = null;
                                self.eTSAErrorMessage( data.eTSAErrorMessage || null );
                                self.pendingRequest( false );
                            } else {
                                Y.log( 'received eTS-ARRANGEMENT-CODE-DELIVERY replyToId message does not match current messageId' );
                            }
                        },
                        handlerId: 'updateGkvTable'
                    } );

                    self.requestArrangementCodeButton = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'requestArrangementCodeButton',
                            title: REQUEST_ETS_ARRANGEMENT_CODE,
                            text: REQUEST_ETS_ARRANGEMENT_CODE,
                            option: 'PRIMARY',
                            disabled: ko.computed( function() {
                                var isPending = self.pendingRequest(),
                                    notEditable = -1 === ['CREATED', 'VALID'].indexOf( self.status() );

                                return isPending || notEditable;
                            } ),
                            click: function() {
                                self.requestArrangementCode();
                            }
                        }
                    } );

                    self.requestArrangementCodeButton.css()['btn-block'] = true;

                    self.isModifiedObserver = new Y.doccirrus.utils.IsModifiedObserver( [
                        self.locationId,
                        self.employeeId,
                        self.ueberwAn,
                        self.eTSAdditionalQualifications,
                        self.urgency
                    ] );

                    self.isModifiedObserver.isModified.subscribe( function( val ) {
                        var status = peek( self.status );
                        var eTSArrangementCode = peek( self.eTSArrangementCode );
                        if( eTSArrangementCode && -1 < ['VALID', 'CREATED'].indexOf( status ) && val === true ) {
                            self.lastETSArrangementCode = eTSArrangementCode;
                            self.eTSArrangementCode( null );
                        } else if( self.lastETSArrangementCode && !eTSArrangementCode && -1 < ['VALID', 'CREATED'].indexOf( status ) && val === false ) {
                            self.eTSArrangementCode( self.lastETSArrangementCode );
                            self.lastETSArrangementCode = null;
                        }
                    } );

                    self.addDisposable( ko.computed( function() {
                        var locationId = self.locationId();
                        Promise.resolve( Y.doccirrus.jsonrpc.api.kvcaccount.accountStatus( {
                            locationId: locationId
                        } ) ).then( function( response ) {
                            self.kvcAccountStatus( response.data );
                        } ).catch( function( err ) {
                            Y.log( 'could not get kvcaccount status: ' + err, 'warn', NAME );
                        } );
                    } ) );

                    self.displayETSPanel = ko.computed( function() {
                        var kvcAccountStatus = self.kvcAccountStatus();
                        return kvcAccountStatus && kvcAccountStatus.exists && kvcAccountStatus.certificateStatus === 'VALID';
                    } );

                    self.eTSErrorMessage = ko.computed( function() {
                        var kvcAccountStatus = self.kvcAccountStatus();
                        return kvcAccountStatus && kvcAccountStatus.message || '';
                    } );

                    //  used for inserting text fragments from documentation tree
                    self.diagnosesText.caretPosition = { current: ko.observable(), extent: ko.observable( -1 )  };
                    self.findingsText.caretPosition = { current: ko.observable(), extent: ko.observable( -1 )  };
                    self.medicationsText.caretPosition = { current: ko.observable(), extent: ko.observable( -1 )  };
                    self.auftrag.caretPosition = { current: ko.observable(), extent: ko.observable( -1 )  };
                },
                requestArrangementCode: function() {
                    var self = this,
                        locationId = self.locationId(),
                        employeeId = self.employeeId(),
                        binder = self.get( 'binder' ),
                        location = binder.getInitialData( 'location' ).find( function( location ) {
                            return location._id === locationId;
                        } ),
                        bsnr,
                        lanr, employee,
                        urgency = self.urgency(),
                        specialities = self.ueberwAn(),
                        specialitiesCodeSystem = self.ueberwAnCodeSystem(),
                        additionalQualifications = self.eTSAdditionalQualifications();

                    if( !specialities.length ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'warn',
                            message: INVALID_ETS_REFERRAL_REQUEST
                        } );
                        return;
                    }

                    bsnr = location && location.commercialNo;
                    if( location && location.employees.length ) {
                        employee = location.employees.find( function( employee ) {
                            return employee._id === employeeId;
                        } );
                        lanr = employee && employee.officialNo;
                    }

                    // TODO: eTS mask everything?
                    // TODO: eTS    - if values changes new request code must be requested or data is reset!!!

                    self.pendingRequest( true );

                    Promise.resolve( Y.doccirrus.jsonrpc.api.activity.requestETSArrangementCode( {
                        formType: 'M06',
                        locationId: locationId,
                        bsnr: bsnr,
                        lanr: lanr,
                        urgency: (urgency || '').toLowerCase(),
                        specialities: specialities,
                        specialitiesCodeSystem: specialitiesCodeSystem,
                        additionalQualifications: additionalQualifications
                    } ) ).then( function( response ) {
                        if( response && response.data && response.data.eTSArrangementCodeRequestMessageId ) {
                            // seet message id to be checked in sio handler for event "eTS-ARRANGEMENT-CODE-DELIVERY"
                            self.eTSArrangementCodeRequestMessageId( response.data.eTSArrangementCodeRequestMessageId );
                        } else {
                            Y.log( 'could not send message: ' + response, 'debug', NAME );
                            self.pendingRequest( false );
                        }
                    } ).catch( function( err ) {
                        Y.log( 'could not request arrangement code: ' + err, 'warn', NAME );
                        handleError( err );
                        self.pendingRequest( false );
                        self.eTSAErrorMessage( PRINT_ON_ERROR );
                    } );

                }
            },
            {
                NAME: 'ReferralEditorModel'
            }
        );

        KoViewModel.registerConstructor( ReferralEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'dckbvutils',
            'inCaseUtils',
            'dcutils'
        ]
    }
);
