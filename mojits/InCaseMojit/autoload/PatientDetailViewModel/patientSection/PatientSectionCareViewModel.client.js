/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _ */

'use strict';

YUI.add( 'PatientSectionCareViewModel', function( Y, NAME ) {

    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        SubEditorModel = KoViewModel.getConstructor( 'SubEditorModel' ),
        PatientSectionViewModel = KoViewModel.getConstructor( 'PatientSectionViewModel' ),
        GHD_PARTNER_ID = Y.doccirrus.schemas.patient.DISPATCHER.INCARE,
        ASV_ID = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.ASV,
        CARDIO_PARTNER_ID = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIO,
        DOQUVIDE_PARTNER_ID = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DOQUVIDE,
        DQS_PARTNER_ID = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DQS,
        CARDIORULE_PARTNER_ID = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.CARDIORULE,
        DYNAMIC_PARTNER_ID = Y.doccirrus.schemas.patient.PartnerIdsPartnerId.DYNAMIC,
        MISSING_MANDATORY_VALUE = i18n( 'validations.message.MISSING_MANDATORY_VALUE' ),
        ASV_TEXT = i18n( 'InCaseMojit.care.confirm_dialog.ASV_TEXT' );

    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }
    }

    /**
     * @class PartnerIdsEditorModel
     * @constructor
     * @extends
     * @param {object} config Configuration object
     */
    function PartnerIdsEditorModel( config ) {
        PartnerIdsEditorModel.superclass.constructor.call( this, config );
    }

    PartnerIdsEditorModel.ATTRS = {
        whiteList: {
            value: [
                'asvTeamNumbers',
                'careType',
                'extra',
                'patientId',
                'insuranceType',
                'partnerId',
                'patientNotes',
                'isDisabled'
            ],
            lazyAdd: false
        }
    };

    Y.extend( PartnerIdsEditorModel, SubEditorModel, {

            initializer: function PartnerIdsEditorModel_initializer() {
                var
                    self = this;
                self.initPartnerIdsEditorModel();
            },
            destructor: function PartnerIdsEditorModel_destructor() {
            },
            initPartnerIdsEditorModel: function PartnerIdsEditorModel_initPartnerIdsEditorModel() {
            }
        },
        {
            NAME: 'PartnerIdsEditorModel'
        }
    );
    KoViewModel.registerConstructor( PartnerIdsEditorModel );

    /**
     * @constructor
     * @class PatientSectionCareViewModel
     * @extends PatientSectionViewModel
     */
    function PatientSectionCareViewModel() {
        PatientSectionCareViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientSectionCareViewModel, PatientSectionViewModel, {

        isChanged: null,
        isAmtsChanged: null,
        isShowInsuranceSelect: null,

        edmpTypesList: null,

        isEdmpCaseNoReadOnly: null,
        hasPatientNo: null,

        templateName: 'PatientSectionCareViewModel',
        /** @protected */
        initializer: function PatientSectionCareViewModel_initializer() {
            var
                self = this;

            self.initPatientSectionCareViewModel();
        },
        /** @protected */
        destructor: function PatientSectionCareViewModel_destructor() {
            var
                self = this;

            self.destroyPostMessageConnection();
        },

        initPatientSectionCareViewModel: function PatientSectionCareViewModel_initPatientSectionCareViewModel() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.initPostMessageConnection();
            self.setSerialNumberFromQuery( currentPatient );
            self.mixWhiteListFromDataModel( currentPatient );
            self.initSubModels( currentPatient );
            self.initObservables();
            self.initGHDPartners();
            self.initInsuranceSelector();
            self.initCareTypeSelector();
            self.initDmpFields();

            self.onPatientModelChange();

            self.countryMode = ko.computed( function() {
                return currentPatient.countryMode();
            } );

            self.telekardioSerialEditedOption = null;
            self.telekardioSerialOldSerial = null;

            // MOJ-14319: [OK]
            self.hasPublicInsurance = self.addDisposable( ko.computed( function() {
                var patientId = unwrap( currentPatient._id ),
                    insuranceStatus = unwrap( currentPatient.insuranceStatus );
                return Boolean( patientId ) && insuranceStatus.some( function( insurance ) {
                    return 'PUBLIC' === unwrap( insurance.type );
                } );
            } ) );

            self.edmpTypesList = Y.doccirrus.schemas.casefolder.getEdmpTypes().map( function( entry ) {
                return Object.assign( {}, entry, {
                    i18n: Y.doccirrus.edmpcommonutils.getLongName( entry.val ) + ' (' + entry.val + ')'
                } );
            } ).filter( function(edmpType) {
                if (edmpType.val === "BK" && currentPatient.gender() === "MALE") {
                    return false;
                }
                return true;
            } );

            self.hgvTypesList = Y.doccirrus.schemas.casefolder.getEdmpTypes().map( function( entry ) {
                return Object.assign( {}, entry, {
                    i18n: Y.doccirrus.edmpcommonutils.getLongName( entry.val ) + ' (' + entry.val + ')'
                } );
            } ).filter( function(edmpType) {
                if (edmpType.val === "BK" && currentPatient.gender() === "MALE") {
                    return false;
                }
                return true;
            } );

            self.isEdmpCaseNoReadOnly = ko.observable( false );
            self.isEhksPatientNoReadOnly = ko.observable( false );
            self.isEdmpCaseNoLocked = ko.observable( false );
            self.isEhksPatientNoLocked = ko.observable( false );
            self.isHGVPatientNoReadOnly = ko.observable( false );
            self.isHGVPatientNoLocked = ko.observable( false );
            self.checkEdmpCaseNo();
            self.checkEhksPatientNo();
            self.checkHgvPatientNo();
            self.localPracticeId = ko.observable( currentPatient.localPracticeId() );
            self.addDisposable( ko.computed( function() {
                self.edmpTypes();
                self.edmpCaseNo.validate();
                self.isEdmpCaseNoReadOnly( self.isEdmpCaseNoLocked() || Boolean( !self.edmpTypes().length ) );
            } ) );
            self.addDisposable( ko.computed( function() {
                self.ehksActivated();
                self.ehksPatientNo.validate();
                self.isEhksPatientNoReadOnly( self.isEhksPatientNoLocked() || !self.ehksActivated() );
            } ) );
            self.addDisposable( ko.computed( function() {
                self.HGVActivated();
                self.HGVPatientNo.validate();
                self.isHGVPatientNoReadOnly( self.isHGVPatientNoLocked() || !self.HGVActivated() );
            } ) );

            self.titleSubnavCareI18n = i18n( 'InCaseMojit.patient_detailJS.subnav.CARE' );
            self.labelCareI18n = i18n( 'InCaseMojit.care.label.CARE' );
            self.labelCareGHDI18n = i18n( 'InCaseMojit.care.label.CARE_GHD' );
            self.labelCardioI18n = i18n( 'InCaseMojit.cardio.label.headline' );
            self.labelCardioCheckI18n = i18n( 'InCaseMojit.cardio.label.check' );
            self.labelCardioSerialPlaceI18n = i18n( 'InCaseMojit.cardio.label.serialPlace' );
            self.labelCardioImplantI18n = i18n( 'InCaseMojit.cardio.label.implant' );
            self.labelCardioDoquvidePatientI18n = i18n( 'InCaseMojit.cardio.label.doquvidePatient' );
            self.labelCardioDoquvideIDI18n = i18n( 'InCaseMojit.cardio.label.doquvideId' );
            self.labelCareEDocumentationI18n = i18n( 'InCaseMojit.care.label.CARE_E_DOCUMENATION' );
            self.labelCareEDMPI18n = i18n( 'InCaseMojit.care.label.CARE_EDMP' );
            self.labelCareEDMPProgramsI18n = i18n( 'InCaseMojit.care.label.CARE_EDMP_PROGRAMS' );
            self.labelCareEDMPAutoGenI18n = i18n( 'InCaseMojit.care.buttons.CARE_EDMP_AUTO_GEN' );
            self.labelCareEDMPTakePAtientNoI18n = i18n( 'InCaseMojit.care.buttons.CARE_EDMP_TAKE_PATIENTNO' );
            self.labelCareEHKSI18n = i18n( 'InCaseMojit.care.label.CARE_EHKS' );
            self.labelHKSMustBe35I18n = i18n( 'InCaseMojit.care.text.HKS_PATIENT_MUST_BE_AT_LEAST_35' );
            self.dqsPatientI18n = i18n( 'InCaseMojit.dqs.label.dqsPatient' );
            self.dqsIdLabelI18n = i18n( 'InCaseMojit.dqs.label.dqsIdLabel' );
            self.dqsIdPlaceholderI18n = i18n( 'InCaseMojit.dqs.label.dqsId' );
            self.labelCareAmtsI18n = i18n( 'InCaseMojit.amts.label' );
            self.labelRequirePublicInsuranceI18n = i18n( 'InCaseMojit.amts.text.AMTS_REQUIRES_PUBLIC_HEALTH_INSURANCE' );

            self.titleDynamicI18n = i18n( 'InCaseMojit.dynamic.title.i18n' );
            self.labelDynamicI18n = i18n( 'InCaseMojit.dynamic.label.i18n' );
            self.labelDynamicCodeI18n = i18n( 'InCaseMojit.dynamic.label.Code' );
            self.labelDynamicNotesI18n = i18n( 'InCaseMojit.dynamic.label.Notes' );

            self.dynamicPartners = ko.observableArray([]);

            Y.doccirrus.jsonrpc.api.partneridcatalog.getAll( {
                query: {}
            } ).done( function( response ) {
                if(!response || !response.data || !response.data.length){
                    return;
                }
                var appRegs = Y.doccirrus.auth.getAppRegs()
                    .filter( function( el){ return el.hasAccess === true; } )
                    .map( function( el ){ return el.appName.toUpperCase(); });
                self.dynamicPartners(
                    response.data.filter(function( el ){
                        return -1 !== appRegs.indexOf(el.code.toUpperCase());
                    }).map( function( el ){
                        var
                            partner = peek( self.partnerIds ).find( function( item ) {
                                return DYNAMIC_PARTNER_ID === peek( item.partnerId ) && el.code === peek( item.extra );
                            } ),
                            patientCode = ko.observable( partner && peek( partner.patientId) ),
                            notes = ko.observable( partner && peek( partner.patientNotes) ),
                            checked = ko.observable(partner ? !peek( partner.isDisabled ) : false);

                        patientCode.hasError = ko.observable();
                        patientCode.validationMessages = ko.observableArray( [] );
                        return {
                            code: el.code,
                            name: el.name,
                            patientCode: patientCode,
                            notes: notes,
                            checked: checked
                        };
                    })
                );
            } ).fail( fail );

            self.addDisposable( ko.computed( function(){
                var dynamic = unwrap( self.dynamicPartners );

                dynamic.map(function(el){
                    var patientCode = (unwrap(el.patientCode) || '').trim(),
                        notes = unwrap(el.notes),
                        checked = unwrap(el.checked);
                    if(!patientCode && checked){
                        el.patientCode.hasError( true );
                        el.patientCode.validationMessages( [ MISSING_MANDATORY_VALUE ] );
                    } else {
                        el.patientCode.hasError( false );
                        el.patientCode.validationMessages( [] );
                    }

                    var partner = peek( self.partnerIds ).find( function( item ) {
                        return DYNAMIC_PARTNER_ID === peek( item.partnerId ) && el.code === peek( item.extra );
                    } );
                    if(partner){
                        partner.patientId( patientCode );
                        partner.patientId.valueHasMutated();
                        partner.patientNotes( notes );
                    }
                });
            }) );
        },

        setSerialNumberFromQuery: function PatientSectionCareViewModel_setSerialNumberFromQuery( currentPatient ) {
            var query = Y.QueryString.parse( window.location.href.split( '?' )[1] || '' ),
                telekardioPartner = Y.Array.find( currentPatient.partnerIds(), function( partner ) {
                    return partner.partnerId() === CARDIO_PARTNER_ID;
                } );

            // Set serial number from query string, if not exist
            if( query.serialNumber ) {
                if( !telekardioPartner ) {
                    currentPatient.partnerIds.push( {
                        partnerId: CARDIO_PARTNER_ID,
                        patientId: query.serialNumber + '',
                        insuranceType: null,
                        careType: null,
                        isDisabled: false
                    } );
                } else if( unwrap( telekardioPartner.isDisabled ) ) {
                    telekardioPartner.isDisabled( false );
                    telekardioPartner.patientId( query.serialNumber + '' );
                }
            }
        },

        initObservables: function PatientSectionCareViewModel_initObservables() {
            var
                self = this,
                roles = Y.doccirrus.auth.getUserRoles();

            self.isPatientGHD = ko.observable( false );

            self.isUserAdmin = ko.observable( Y.doccirrus.auth.isAdmin() );

            self.isUserCardio = ko.observable( false );

            self.isUserCardio( _.includes( roles, Y.doccirrus.schemas.role.ROLES.CARDIO ) );

            self.isChanged = ko.observable( false );
            self.isAmtsChanged = ko.observable( false );
            self.appIFrames = ko.observableArray( [] );
            self.initASV();
            self.initTelekardio();
            self.initUIforSols();
        },

        initPostMessageConnection: function() {
            var
                self = this;

            self.PostMessageConnection = Y.doccirrus.utils.getPostMessageConnectionInstance();

            self.PostMessageConnection
                .onGetDataModel(self.onDataModelRequest.bind(this))
                .onDataModelUpdate(self.onDataModelUpdate.bind(this));
        },

        destroyPostMessageConnection: function() {
            var
                self = this;

            if( self.PostMessageConnection ) {
                self.PostMessageConnection.clean();
            }
        },

        onDataModelRequest: function () {
            var
                self = this;

            return peek( self.get( 'currentPatient' ) ).toJSON();
        },

        onDataModelUpdate: function (event) {
            var
                self = this,
                dataModelUpdate = event && event.data && event.data.payload,
                currentPatientBeforeUpdate = peek( self.get( 'currentPatient' ) );

            if ( dataModelUpdate ) {
                Object.keys(dataModelUpdate).forEach(function (key) {
                    currentPatientBeforeUpdate[key](dataModelUpdate[key]);
                });
            }

            return peek( self.get( 'currentPatient' ) ).toJSON(); // send back the update confirmation
        },

        onPatientModelChange: function () {
            var
                self = this,
                ignoreModificationsOn = self.get( 'ignoreModificationsOn' );

            self.addDisposable( ko.computed( {
                read: function() {
                    var
                        currentPatient = unwrap( self.get( 'currentPatient' ) ),
                        modifiedObject = currentPatient.readBoilerplate( true ),
                        dataUnModified = currentPatient.get('dataUnModified'),
                        amtsChanged = Object.keys(dataUnModified).some(function (key) {
                            if (
                                [
                                    'amtsActivated',
                                    'amtsApprovalForDataEvaluation',
                                    'amtsApprovalForReleaseFromConfidentiality',
                                    'amtsSelectiveContractInsuranceId',
                                    'amtsParticipationInSelectiveContract',
                                    'partnerIds'
                                ].includes(key)
                            ) {
                                if (key === 'partnerIds') {
                                    /**
                                     * Check if SELECTIVE_CARE changed, added/updated/deleted
                                     *
                                     * All other just return false
                                     */
                                    return modifiedObject[key].some(function(partner) {
                                        var unmodifiedPartnerId = dataUnModified[key].find(function (unmodifiedPartner) {
                                            return unmodifiedPartner.partnerId === Y.doccirrus.schemas.patient.PartnerIdsPartnerId.SELECTIVE_CARE;
                                        });

                                        if (
                                            partner.partnerId === Y.doccirrus.schemas.patient.PartnerIdsPartnerId.SELECTIVE_CARE
                                        ) {
                                            return !_.isEqual(partner, unmodifiedPartnerId);
                                        }

                                        return false;
                                    });
                                } else {
                                    return !_.isEqual(dataUnModified[key], modifiedObject[key]);
                                }
                            }

                            return false;
                        });

                    if ( ignoreModificationsOn ) {
                        ignoreModificationsOn.forEach( function( key ) {
                            delete modifiedObject[key];
                        } );
                    }


                    self.setAmtsChanged(amtsChanged);

                    self.PostMessageConnection.emitDataModelUpdate( { payload: modifiedObject } );
                },
                owner: self
            } ).extend( {
                rateLimit: { timeout: 100, method: "notifyWhenChangesStop" }
            } ) );
        },

        initTelekardio: function() {

            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.cardioSerial = ko.observable( null );
            self.cardioImplant = ko.observable( null );
            self.doquvideSerial = ko.observable( null );
            self.cardioSerialValidation = ko.observable( null );
            self.cardioImplantValidation = ko.observable( null );
            self.doquvideSerialValidation = ko.observable( null );
            self.isTelekardioFieldsVisible = ko.observable( false );
            self.isDoquvideFieldsVisible = ko.observable( false );
            self.cardioSerialExists = ko.observable( false );
            self.doquvideSerialExists = ko.observable( false );
            self.cardioRule = ko.observable( false );
            self.isDisabled = ko.observable( false );
            self.innerCardioChanged = ko.observable( false );

            self.dqsSerial = ko.observable( null );
            self.dqsSerialValidation = ko.observable( null );
            self.isTelekardioFieldsVisible = ko.observable( false );
            self.isDQSFieldsVisible = ko.observable( false );
            self.dqsSerialExists = ko.observable( false );
            self.dqsDisable = ko.observable( true ); //false - field is always disabled
            self.dqsFirst = ko.observable( true );
            self.licenseModifier = ko.observable();

            currentPatient.partnerIds().forEach( function( partner ) {
                var
                    disabled;

                if( partner.partnerId() === CARDIO_PARTNER_ID ) {
                    self.cardioSerial( unwrap( partner.patientId ) );
                    self.cardioImplant( unwrap( partner.selectedType ) );
                    self.cardioSerialExists( self.cardioSerial().trim() !== '' );
                    self.isTelekardioFieldsVisible( !unwrap( partner.isDisabled ) );

                    self.addDisposable( self.cardioSerial.subscribe( function( newValue ) {
                        partner.patientId( newValue );
                    } ) );
                    self.addDisposable( self.cardioImplant.subscribe( function( newValue ) {
                        partner.selectedType( newValue );
                    } ) );
                }
                if( partner.partnerId() === DOQUVIDE_PARTNER_ID ) {
                    self.doquvideSerial( unwrap( partner.patientId ) );
                    self.doquvideSerialExists( ( self.doquvideSerial() || '' ).trim() !== '' );
                    self.isDoquvideFieldsVisible( !unwrap( partner.isDisabled ) );

                    self.addDisposable( self.doquvideSerial.subscribe( function( newValue ) {
                        partner.patientId( newValue );
                    } ) );
                }
                if( partner.partnerId() === DQS_PARTNER_ID ) {
                    self.dqsFirst( false );
                    self.dqsSerial( unwrap( partner.patientId ) );
                    self.licenseModifier( peek( partner.licenseModifier ) );
                    self.dqsSerialExists( ( self.dqsSerial() || '' ).trim() !== '' );
                    disabled = unwrap( partner.isDisabled );
                    self.isDQSFieldsVisible( !disabled );
                    //self.dqsDisable( disabled );
                    self.addDisposable( self.dqsSerial.subscribe( function( newValue ) {
                        partner.patientId( newValue );
                    } ) );
                    self.addDisposable( self.licenseModifier.subscribe( function( newValue ) {
                        partner.licenseModifier( newValue );
                    } ) );
                }
                if( partner.partnerId() === CARDIORULE_PARTNER_ID ) {
                    self.cardioRule( true );
                }
            } );

            self.cardioSerialValidation.hasError = ko.pureComputed( function() {
                var
                    visible = unwrap( self.isTelekardioFieldsVisible ),
                    isSerial = unwrap( self.cardioSerial ),
                    isNotValid = visible && !isSerial;
                currentPatient.partnerIds.hasError( isNotValid || self.doquvideSerialValidation.hasError() || self.dqsSerialValidation.hasError() || self.licenseModifier.hasError() || self.cardioImplantValidation.hasError() );
                return isNotValid;
            } );
            self.cardioImplantValidation.hasError = ko.pureComputed( function() {
                var
                    visible = unwrap( self.isTelekardioFieldsVisible ),
                    isSelected = unwrap( self.cardioImplant ),
                    isNotValid = visible && !isSelected;
                currentPatient.partnerIds.hasError( isNotValid || self.doquvideSerialValidation.hasError() || self.dqsSerialValidation.hasError() || self.licenseModifier.hasError() || self.cardioSerialValidation.hasError() );
                return isNotValid;
            } );
            self.cardioImplantValidation.i18n = i18n( 'InCaseMojit.cardio.label.implant' );
            self.cardioImplantValidation.validationMessages = ko.observableArray( [Y.doccirrus.validations.common.getMongooseMandatoryMessage()] );
            self.cardioSerialValidation.i18n = i18n( 'InCaseMojit.cardio.label.serial' );
            self.cardioSerialValidation.validationMessages = ko.observableArray( [Y.doccirrus.validations.common.getMongooseMandatoryMessage()] );

            self.doquvideSerialValidation.hasError = ko.pureComputed( function() {
                currentPatient.partnerIds.hasError( self.cardioSerialValidation.hasError() || self.cardioImplantValidation.hasError() );
                return false;
            } );
            self.doquvideSerialValidation.i18n = i18n( 'InCaseMojit.cardio.label.doquvideIdLabel' );
            self.doquvideSerialValidation.validationMessages = ko.observableArray( [Y.doccirrus.validations.common.getMongooseMandatoryMessage()] );

            self.dqsSerialValidation.hasError = ko.pureComputed( function() {
                currentPatient.partnerIds.hasError( self.cardioSerialValidation.hasError() || self.cardioImplantValidation.hasError() );
                return false;
            } );

            self.dqsSerialValidation.i18n = i18n( 'InCaseMojit.dqs.label.dqsIdLabel' );
            self.dqsSerialValidation.validationMessages = ko.observableArray( [Y.doccirrus.validations.common.getMongooseMandatoryMessage()] );

            self.licenseModifier.hasError = ko.pureComputed( function() {
                var
                    selected = unwrap( self.licenseModifier ),
                    isDQSFieldsVisible = unwrap( self.isDQSFieldsVisible ),
                    isTelekardioFieldsVisible = unwrap( self.isTelekardioFieldsVisible ),
                    hasError = isTelekardioFieldsVisible && isDQSFieldsVisible && !selected;
                currentPatient.partnerIds.hasError( hasError || self.cardioSerialValidation.hasError() || self.cardioImplantValidation.hasError());
                return hasError;
            } );
            self.licenseModifier.i18n = i18n( 'patient-schema.PartnerIds_T.licenseModifier.i18n' );
            self.licenseModifier.validationMessages = ko.observableArray( [Y.doccirrus.validations.common.getMongooseMandatoryMessage()] );

        },

        initUIforSols: function() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                appRegs = Y.doccirrus.auth.getAppRegs() || [];

            appRegs.forEach( function( appReg ) {
                // Do not add any of this appReg CARETYPE_UI's if no access granted
                if( !appReg.hasAccess ) {
                    return;
                }

                if( appReg.uiConfiguration ) {
                    appReg.uiConfiguration.forEach( function( config ) {
                        if( Y.doccirrus.schemas.appreg.uiConfigurationTypes.CARETYPE_UI === config.type && config.targetUrl ) {
                            self.appIFrames.push( {
                                title: appReg.title || appReg.appName,
                                url: config.targetUrl + '?patientId=' + currentPatient._id()
                            } );
                        }
                    } );
                }
            } );
        },

        notifyAppIframeBind: function ($data, $element) {
            this.PostMessageConnection.setIframeWindow($data.url, $element.contentWindow);
        },

        initDmpFields: function PatientSectionCareViewModel_initDmpFields() {

            var self = this,
                fields = ['edmpCaseNo', 'edmpTypes', 'edmpParticipationChronicHeartFailure'],
                schema = Y.doccirrus.schemas.patient.schema;

            self.hasPatientNo = ko.pureComputed( function() {
                var
                    patientNo = self.patientNo();
                return Boolean( patientNo );
            } );

            fields.forEach( function( key ) {
                var propertyName = key,
                    property = schema[key];

                if( !self[propertyName] || !property ) {
                    return;
                }

                if( property && property.hint ) {
                    self[propertyName].hint = property.hint;
                    self[propertyName].hintLevel = property.hintLevel;
                }
            } );

        },
        toggleIsPatientASV: function PatientSectionCareViewModel_toggleIsPatientASV() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                isPatientASV = peek( self.isPatientASV );

            self.isChanged( true );

            if( isPatientASV ) {
                peek( self.partnerIds ).some( function( item ) {
                    if( ASV_ID === peek( item.partnerId ) ) {
                        currentPatient.removePartnerIds( item.get( 'dataModelParent' ) );
                        return true;
                    }
                    return false;
                } );
                return true;
            } else {
                Y.doccirrus.DCWindow.confirm( {
                    message: ASV_TEXT,
                    callback: function( dialog ) {
                        if( dialog.success ) {
                            currentPatient.addPartnerIds( {
                                partnerId: ASV_ID
                            } );
                        }
                    },
                    window: {
                        width: 'medium'
                    }
                } );
            }

        },
        initASV: function PatientSectionCareViewModel_initASV() {
            var
                self = this;
            self.isPatientASV = ko.pureComputed( function() {
                var
                    partnerIds = unwrap( self.partnerIds );
                return partnerIds.some( function( item ) {
                    return ASV_ID === peek( item.partnerId );
                } );
            } );
            self.asvTeamNumbers = ko.pureComputed( {
                read: function() {
                    var
                        partnerIds = unwrap( self.partnerIds ),
                        result = [];
                    partnerIds.some( function( item ) {
                        if( ASV_ID === peek( item.partnerId ) ) {
                            result = unwrap( item.asvTeamNumbers );
                            return true;
                        }
                        return false;
                    } );
                    return result;
                },
                write: function( val ) {
                    var
                        partnerIds = unwrap( self.partnerIds );
                    partnerIds.some( function( item ) {
                        if( ASV_ID === peek( item.partnerId ) ) {
                            item.asvTeamNumbers( val );
                            return true;
                        }
                        return false;
                    } );
                }
            } );
            self.asvTeamNumbers.hasError = ko.pureComputed( function() {
                var
                    partnerIds = unwrap( self.partnerIds ),
                    result = '';
                partnerIds.some( function( item ) {
                    if( ASV_ID === peek( item.partnerId ) ) {
                        result = unwrap( item.asvTeamNumbers.hasError );
                        return true;
                    }
                    return false;
                } );
                return result;
            } );
            self.asvTeamNumbers.i18n = i18n( 'patient-schema.Patient_T.asvTeamNumbers.i18n' );
            self.asvTeamNumbers.validationMessages = ko.pureComputed( function() {
                var
                    partnerIds = unwrap( self.partnerIds ),
                    result = [];
                partnerIds.some( function( item ) {
                    if( ASV_ID === peek( item.partnerId ) ) {
                        result = unwrap( item.asvTeamNumbers.validationMessages );
                        return true;
                    }
                    return false;
                } );
                return result;
            } );
            self.initSelect2AsvTeamNumbers();

            self.titleASVText = ko.observable();
            self.titleASVText.i18n = i18n( 'InCaseMojit.care.title.ASV' );
            self.labelASV = ko.observable();
            self.labelASV.i18n = i18n( 'InCaseMojit.care.label.ASV' );
        },

        initGHDPartners: function PatientSectionCareViewModel_initGHDPartnersfunction() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.isPatientGHD = ko.pureComputed( function() {
                var
                    partnerIds = unwrap( currentPatient.partnerIds );

                return partnerIds.some( function( item ) {
                    return GHD_PARTNER_ID === peek( item.partnerId );
                } );
            } );

            self.insuranceType = ko.pureComputed( {
                read: function() {
                    var partnerIds = unwrap( currentPatient.partnerIds ),
                        result = [];
                    partnerIds.some( function( item ) {
                        if( GHD_PARTNER_ID === peek( item.partnerId ) ) {
                            result = unwrap( item.insuranceType );
                            return true;
                        }
                        return false;
                    } );
                    return result;
                },
                write: function( val ) {
                    var
                        partnerIds = unwrap( currentPatient.partnerIds );
                    partnerIds.some( function( item ) {
                        if( GHD_PARTNER_ID === peek( item.partnerId ) ) {
                            item.insuranceType( val );
                            self.isChanged( true );
                            return true;
                        }
                        return false;
                    } );
                }
            } );

            self.insuranceType.hasError = ko.pureComputed( function() {
                var
                    partnerIds = unwrap( currentPatient.partnerIds ),
                    result = '';
                partnerIds.some( function( item ) {
                    if( GHD_PARTNER_ID === peek( item.partnerId ) ) {
                        result = unwrap( item.insuranceType.hasError );
                        return true;
                    }
                    return false;
                } );
                return result;
            } );

            self.insuranceType.validationMessages = ko.pureComputed( function() {
                var
                    partnerIds = unwrap( currentPatient.partnerIds ),
                    result = [];
                partnerIds.some( function( item ) {
                    if( GHD_PARTNER_ID === peek( item.partnerId ) ) {
                        result = unwrap( item.insuranceType.validationMessages );
                        return true;
                    }
                    return false;
                } );
                return result;
            } );

            self.insuranceType.i18n = i18n( 'person-schema.Insurance_E.i18n' );

            self.careType = self.addDisposable( ko.computed( {
                read: function() {
                    var partnerIds = unwrap( currentPatient.partnerIds ),
                        result = [];
                    partnerIds.some( function( item ) {
                        if( GHD_PARTNER_ID === peek( item.partnerId ) ) {
                            result = unwrap( item.careType );
                            return true;
                        }
                        return false;
                    } );
                    return result;
                },
                write: function( val ) {
                    var
                        partnerIds = unwrap( currentPatient.partnerIds );
                    partnerIds.some( function( item ) {
                        if( GHD_PARTNER_ID === peek( item.partnerId ) ) {
                            item.careType( val );
                            self.isChanged( true );
                            return true;
                        }
                        return false;
                    } );
                }
            } ) );

            self.careType.hasError = ko.pureComputed( function() {
                var
                    partnerIds = unwrap( currentPatient.partnerIds ),
                    result = '';
                partnerIds.some( function( item ) {
                    if( GHD_PARTNER_ID === peek( item.partnerId ) ) {
                        result = unwrap( item.careType.hasError );
                        return true;
                    }
                    return false;
                } );
                return result;
            } );

            self.careType.validationMessages = ko.pureComputed( function() {
                var
                    partnerIds = unwrap( currentPatient.partnerIds ),
                    result = [];
                partnerIds.some( function( item ) {
                    if( GHD_PARTNER_ID === peek( item.partnerId ) ) {
                        result = unwrap( item.careType.validationMessages );
                        return true;
                    }
                    return false;
                } );
                return result;
            } );

            self.careType.i18n = i18n( 'InCaseMojit.care.label.CARE_TYPE' );
        },

        toggleTelekardio: function PatientSectionCareViewModel_toggleTelekardio( model, event ) {

            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                telekardioPartner = Y.Array.find( currentPatient.partnerIds(), function( partner ) {
                    return partner.partnerId() === CARDIO_PARTNER_ID;
                } ),
                isTelekardioFieldsVisible = unwrap( self.isTelekardioFieldsVisible );

            function toggleTelekardioInnerFn() {
                if( self.isTelekardioFieldsVisible() ) {
                    if( !telekardioPartner ) {
                        telekardioPartner = {
                            partnerId: CARDIO_PARTNER_ID,
                            patientId: "",
                            selectedType: "",
                            insuranceType: null,
                            careType: null,
                            isDisabled: false
                        };
                        currentPatient.partnerIds.push( telekardioPartner );
                        telekardioPartner = Y.Array.find( currentPatient.partnerIds(), function( partner ) {
                            return partner.partnerId() === CARDIO_PARTNER_ID;
                        } );
                    }

                    self.cardioSerial( unwrap( telekardioPartner.patientId ) );
                    self.addDisposable( self.cardioSerial.subscribe( function( newValue ) {
                        telekardioPartner.patientId( newValue );
                    } ) );
                    self.addDisposable( self.cardioImplant.subscribe( function( newValue ) {
                        telekardioPartner.selectedType( newValue );
                    } ) );
                    telekardioPartner.isDisabled( !self.isTelekardioFieldsVisible() );
                } else {
                    if( !self.cardioSerial() ) {
                        currentPatient.partnerIds.hasError( false );
                        currentPatient.partnerIds.remove( function( partner ) {
                            return partner.partnerId() === CARDIO_PARTNER_ID;
                        } );
                    } else {
                        telekardioPartner.isDisabled( !self.isTelekardioFieldsVisible() );
                    }
                }

                self.isChanged( true );
            }

            if( !isTelekardioFieldsVisible ) {

                if( currentPatient.isNew() && '' === telekardioPartner.patientId() && '' === self.cardioImplant() && '' === self.cardioSerial() && !self.innerCardioChanged() ) {
                    currentPatient.partnerIds.hasError( false );
                    return true;
                }

                event.preventDefault();
                Y.doccirrus.DCWindow.confirm( {
                    title: i18n( 'InCaseMojit.cardio.telecardioConfirmDisableDlg.title' ),
                    message: i18n( 'InCaseMojit.cardio.telecardioConfirmDisableDlg.content' ),
                    callback: function( dialog ) {
                        if( dialog.success ) {
                            toggleTelekardioInnerFn();
                            self.isTelekardioFieldsVisible( false );
                            self.isTelekardioFieldsVisible.valueHasMutated();
                        } else {
                            self.isTelekardioFieldsVisible( true );
                            self.isTelekardioFieldsVisible.valueHasMutated();
                        }
                    },
                    window: {
                        width: 'medium'
                    }
                } );
                return false;
            } else {
                toggleTelekardioInnerFn();
                return true;
            }
        },

        showTelekardioEditDialog: function() {

            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            Y.doccirrus.modals.telekardioEditDialog.show( currentPatient, function( selectedOption ) {
                if( !self.telekardioSerialOldSerial ) {
                    self.telekardioSerialOldSerial = self.cardioSerial(); //do it only ones
                }
                self.cardioSerial( '' );
                self.cardioSerialExists( false );
                self.isChanged( true );
                self.telekardioSerialEditedOption = selectedOption;
            } );
        },

        showDoquvide: function PatientSectionCareViewModel_showDoquvide() {
            var
                self = this;

            return self.isDoquvideFieldsVisible() || self.doquvideSerialExists();
        },

        doquvideSerialReadOnly: function PatientSectionCareViewModel_doquvideSerialReadOnly() {
            return true;
        },

        doquvideNew: function() {
            return i18n( 'InCaseMojit.cardio.label.doquvideIdNew' );
        },

        toggleDoquvide: function PatientSectionCareViewModel_toggleDoquvide() {

            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            function pushAndSubscribe( currentPatient, doquvideSerial ) {
                currentPatient.partnerIds.push( {
                    partnerId: DOQUVIDE_PARTNER_ID,
                    patientId: doquvideSerial,
                    insuranceType: null,
                    careType: null,
                    isDisable: false
                } );

                currentPatient.partnerIds().forEach( function( partner ) {
                    if( partner.partnerId() === DOQUVIDE_PARTNER_ID ) {
                        self.doquvideSerial( unwrap( partner.patientId ) );
                        self.doquvideSerialExists( self.doquvideSerial().trim() !== '' );
                        partner.isDisabled( false );
                        self.addDisposable( self.doquvideSerial.subscribe( function( newValue ) {
                            partner.patientId( newValue );
                        } ) );
                    }
                } );
            }

            function toogleDoquvideInnerFn() {
                self.isChanged( true );
                self.innerCardioChanged( true );
                var doquvideSerial, doquvidePartner;
                if( self.isDoquvideFieldsVisible() ) {
                    if( !self.doquvideSerialExists() ) {
                        doquvideSerial = unwrap( currentPatient.localPracticeId ) || '';
                        pushAndSubscribe( currentPatient, doquvideSerial );
                    } else {
                        currentPatient.partnerIds().forEach( function( partner ) {
                            if( partner.partnerId() === DOQUVIDE_PARTNER_ID ) {
                                self.doquvideSerial( unwrap( partner.patientId ) );
                                self.doquvideSerialExists( self.doquvideSerial().trim() !== '' );
                                partner.isDisabled( false );
                                self.addDisposable( self.doquvideSerial.subscribe( function( newValue ) {
                                    partner.patientId( newValue );
                                } ) );
                            }
                        } );
                    }
                } else {
                    if( !self.doquvideSerial() ) {
                        currentPatient.partnerIds.hasError( false );
                        currentPatient.partnerIds.remove( function( partner ) {
                            return partner.partnerId() === DOQUVIDE_PARTNER_ID;
                        } );
                    } else {
                        doquvidePartner = Y.Array.find( currentPatient.partnerIds(), function( partner ) {
                            return partner.partnerId() === DOQUVIDE_PARTNER_ID;
                        } );
                        doquvidePartner.isDisabled( !self.isDoquvideFieldsVisible() );
                    }
                    self.doquvideSerialExists( self.doquvideSerial().trim() !== '' );
                }
            }

            if( !self.isDoquvideFieldsVisible() ) {
                Y.doccirrus.DCWindow.confirm( {
                    title: i18n( 'InCaseMojit.cardio.doqVideConfirmDisableDlg.title' ),
                    message: i18n( 'InCaseMojit.cardio.doqVideConfirmDisableDlg.content' ),
                    callback: function( dialog ) {
                        if( dialog.success ) {
                            toogleDoquvideInnerFn();
                            self.isDoquvideFieldsVisible( false );
                            self.isDoquvideFieldsVisible.valueHasMutated();
                        } else {
                            self.isDoquvideFieldsVisible( true );
                            self.isDoquvideFieldsVisible.valueHasMutated();
                        }
                    },
                    window: {
                        width: 'medium'
                    }
                } );
                return false;
            } else {
                toogleDoquvideInnerFn();
                return true;
            }

        },

        dqsNew: function() {
            return i18n( 'InCaseMojit.dqs.label.dqsIdNew' );
        },

        toggleDQS: function PatientSectionCareViewModel_toggleDQS() {

            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            function pushAndSubscribe( currentPatient, dqsSerial, licenseModifier ) {
                currentPatient.partnerIds.push( {
                    partnerId: DQS_PARTNER_ID,
                    patientId: dqsSerial,
                    licenseModifier: licenseModifier,
                    insuranceType: null,
                    careType: null,
                    isDisable: false
                } );

                currentPatient.partnerIds().forEach( function( partner ) {
                    if( partner.partnerId() === DQS_PARTNER_ID ) {
                        self.dqsSerial( unwrap( partner.patientId ) );
                        self.dqsSerialExists( self.dqsSerial().trim() !== '' );
                        self.licenseModifier( peek( partner.licenseModifier ) );
                        partner.isDisabled( false );
                        self.addDisposable( self.dqsSerial.subscribe( function( newValue ) {
                            partner.patientId( newValue );
                        } ) );
                        self.addDisposable( self.licenseModifier.subscribe( function( newValue ) {
                            partner.licenseModifier( newValue );
                        } ) );
                    }
                } );

            }

            function toggleDQSInnerFn() {
                self.isChanged( true );
                self.innerCardioChanged( true );
                var dqsSerial, dqsPartner;
                if( self.isDQSFieldsVisible() ) {
                    //self.dqsDisable( false )
                    if( !self.dqsSerialExists() ) {
                        dqsSerial = '';
                        pushAndSubscribe( currentPatient, dqsSerial, null );
                    } else {
                        currentPatient.partnerIds().forEach( function( partner ) {
                            if( partner.partnerId() === DQS_PARTNER_ID ) {
                                self.dqsSerial( unwrap( partner.patientId ) );
                                self.dqsSerialExists( self.dqsSerial().trim() !== '' );
                                self.licenseModifier( unwrap( partner.licenseModifier ) );
                                partner.isDisabled( false );
                                self.addDisposable( self.dqsSerial.subscribe( function( newValue ) {
                                    partner.patientId( newValue );
                                } ) );
                                self.addDisposable( self.licenseModifier.subscribe( function( newValue ) {
                                    partner.licenseModifier( newValue );
                                } ) );
                            }
                        } );
                    }
                } else {
                    if( !self.dqsSerial() ) {
                        currentPatient.partnerIds.hasError( false );
                        currentPatient.partnerIds.remove( function( partner ) {
                            return partner.partnerId() === DQS_PARTNER_ID;
                        } );
                    } else {
                        dqsPartner = Y.Array.find( currentPatient.partnerIds(), function( partner ) {
                            return partner.partnerId() === DQS_PARTNER_ID;
                        } );
                        dqsPartner.isDisabled( !self.isDQSFieldsVisible() );
                        //self.dqsDisable( true );
                    }
                    self.dqsSerialExists( self.dqsSerial().trim() !== '' );
                }
            }

            if( !self.isDQSFieldsVisible() ) {
                Y.doccirrus.DCWindow.confirm( {
                    title: i18n( 'InCaseMojit.dqs.dqsConfirmDisableDlg.title' ),
                    message: i18n( 'InCaseMojit.dqs.dqsConfirmDisableDlg.content' ),
                    callback: function( dialog ) {
                        if( dialog.success ) {
                            toggleDQSInnerFn();
                            self.isDQSFieldsVisible( false );
                            self.isDQSFieldsVisible.valueHasMutated();
                        } else {
                            self.isDQSFieldsVisible( true );
                            self.isDQSFieldsVisible.valueHasMutated();
                        }
                    },
                    window: {
                        width: 'medium'
                    }
                } );
                return false;
            } else {
                toggleDQSInnerFn();
                return true;
            }

        },

        toggleCardioRule: function PatientSectionCareViewModel_toggleCardioRule() {
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self.isChanged( true );
            self.innerCardioChanged( true );

            if( self.cardioRule() ) {
                currentPatient.partnerIds.push( {
                    partnerId: CARDIORULE_PARTNER_ID,
                    patientId: "",
                    insuranceType: null,
                    careType: null
                } );
                return true;
            } else {
                currentPatient.partnerIds.remove( function( partner ) {
                    return partner.partnerId() === CARDIORULE_PARTNER_ID;
                } );
                return true;
            }

        },

        markAsChanged: function() {
            this.isChanged( true );
        },

        toggleIsPatientGHD: function PatientSectionCareViewModel_toggleIsPatientGHD() {

            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                isPatientGHD = peek( self.isPatientGHD );

            self.isChanged( true );

            if( isPatientGHD ) {
                currentPatient.partnerIds.remove( function( item ) {
                    return GHD_PARTNER_ID === peek( item.partnerId );
                } );
                return true;
            } else {
                Y.doccirrus.DCWindow.confirm( {
                    title: i18n( 'InCaseMojit.patient_detailJS.title.CONFIRMATION' ),
                    message: i18n( 'InCaseMojit.care.confirm_dialog.TEXT' ),
                    callback: function( dialog ) {
                        if( dialog.success ) {
                            currentPatient.partnerIds.push( {
                                partnerId: GHD_PARTNER_ID
                            } );
                        }
                    },
                    window: {
                        width: 'medium'
                    }
                } );
            }
        },
        toggleDynamicPartner: function(data){
            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                checked = data.checked();
            self.isChanged( true );
            var partner = peek( self.partnerIds ).find( function( item ) {
                return DYNAMIC_PARTNER_ID === peek( item.partnerId ) && data.code === peek( item.extra );
            } );
            if(!partner){
                //add new partnerId entry
                currentPatient.addPartnerIds( {
                    partnerId: DYNAMIC_PARTNER_ID,
                    extra: data.code,
                    isDisabled: !checked
                } );
            } else {
                partner.isDisabled( !checked );
            }

            return true;
        },
        initInsuranceSelector: function PatientSectionCareViewModel_initInsuranceSelector() {

            var
                self = this,
                currentPatient = peek( self.get( 'currentPatient' ) );

            self._filteredTypeList = ko.observableArray();

            currentPatient.insuranceStatus().map( function( patientInsurance ) {
                Y.doccirrus.schemas.person.types.Insurance_E.list.forEach( function( insuranceEntry ) {
                    if( insuranceEntry.val === patientInsurance.type() ) {
                        self._filteredTypeList.push( {type: patientInsurance.type(), text: insuranceEntry['-de']} );
                    }
                } );
            } );
        },

        initSelect2AsvTeamNumbers: function PatientSectionCareViewModel_initSelect2AsvTeamNumbers() {
            var
                self = this;
            self.select2AsvTeamNumbers = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            asvTeamNumbers = self.asvTeamNumbers();
                        return asvTeamNumbers.map( function( number ) {
                            return {
                                id: number,
                                text: number
                            };
                        } );
                    },
                    write: function( $event ) {
                        self.asvTeamNumbers( $event.val );
                    }
                }, self ) ),
                select2: {
                    multiple: true,
                    allowClear: true,
                    placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.employee.getASVTeamNumbers( {
                                query: {
                                    term: query.term
                                }
                            }
                        )
                            .done( function( response ) {
                                var
                                    data = response.data;
                                query.callback( {
                                    results: data.map( function( teamNumber ) {
                                        return {
                                            id: teamNumber,
                                            text: teamNumber
                                        };
                                    } )
                                } );
                            } )
                            .fail( function( error ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                query.callback( {
                                    results: []
                                } );
                            } );
                    }
                }
            };

        },

        initCareTypeSelector: function PatientSectionCareViewModel_initCareTypeSelector() {
            this._careTypeList = ko.observableArray( Y.doccirrus.careTypeLists.INCARE );
        },

        selectEdmpType: function( data, event ) {
            var self = this,
                type = data.val,
                edmpTypes = self.edmpTypes(),
                idx = edmpTypes.indexOf( type );

            self.isChanged( true );

            if( event.currentTarget.checked && -1 === idx ) {
                edmpTypes.push( type );
                self.edmpTypes( edmpTypes );
            } else if( !event.currentTarget.checked && 0 <= idx ) {
                edmpTypes.splice( idx, 1 );
                self.edmpTypes( edmpTypes );
            }
            return true;
        },

        setEdocCaseNo: function( type, propName, maxLen ) {
            var self = this;

            self.isChanged( true );

            switch( type ) {
                case 'patientNo':
                    self[propName]( self.patientNo() );
                    break;
                case 'auto':
                    self[propName]( ('' + Math.random()).split( '.' )[1].substring( 0, maxLen ) ); // TODOOO replace this hack
                    break;
            }
        },

        checkEdmpCaseNo: function() {
            var self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                patientId = currentPatient._id();

            self.isChanged( true );

            Y.log( 'checkEdmpCaseNo', 'debug', NAME );

            if( patientId && self.isEdmpSectionVisible ) {
                Promise.resolve( Y.doccirrus.jsonrpc.api.edmp.isEdmpCaseNoLocked( {
                    patientId: patientId
                } ) ).then( function( response ) {
                    self.isEdmpCaseNoLocked( Boolean( response && response.data && response.data.isLocked ) );
                } ).catch( function( err ) {
                    Y.log( 'could not check if edmpCaseNo is locked...' + err, 'error', NAME );
                } );
            }
        },

        checkEhksPatientNo: function() {
            var self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                patientId = currentPatient._id();

            self.isChanged( true );

            Y.log( 'checkEhksPatientNo', 'debug', NAME );

            if( patientId && self.isEhksSectionVisible ) {
                Promise.resolve( Y.doccirrus.jsonrpc.api.ehks.isEhksPatientNoLocked( {
                    patientId: patientId
                } ) ).then( function( response ) {
                    self.isEhksPatientNoLocked( Boolean( response && response.data && response.data.isLocked ) );
                } ).catch( function( err ) {
                    Y.log( 'could not check if ehksPatientNo is locked...' + err, 'error', NAME );
                } );
            }
        },
        checkHgvPatientNo: function() {
            var self = this,
                currentPatient = peek( self.get( 'currentPatient' ) ),
                patientId = currentPatient._id();

            self.isChanged( true );

            Y.log( 'checkHgvPatientNo', 'debug', NAME );

            if( patientId && self.isHgvSectionVisible ) {
                Promise.resolve( Y.doccirrus.jsonrpc.api.edoc.isHgvCaseNoLocked( {
                    patientId: patientId
                } ) ).then( function( response ) {
                    self.isHGVPatientNoLocked( Boolean( response && response.data && response.data.isLocked ) );
                } ).catch( function( err ) {
                    Y.log( 'could not check if HGVPatientNo is locked...' + err, 'error', NAME );
                } );
            }
        },

        /**
         *
         * @param {boolean} amtsChanged
         */
        setAmtsChanged: function PatientSectionCareViewModel_setAmtsChanged(amtsChanged) {
            var
                self = this;

            self.isChanged( amtsChanged );
            self.isAmtsChanged( amtsChanged );
        },

        isGHDAllowed: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.CARE ),
        isTelekardioSectionVisible: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ) ||
                                    Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ) ||
                                    Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DQS ),
        hasDQSlicense: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DQS ),
        hasDoquvidelicense: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ),
        hasCardiolicense: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ),
        isAsvSectionVisible: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.ASV ),
        isEdmpSectionVisible: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.EDMP ),
        isEhksSectionVisible: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.EHKS ),
        isHgvSectionVisible: Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.HGV )
    }, {
        NAME: 'PatientSectionCareViewModel',
        ATTRS: {
            whiteList: {
                value: [
                    'edmpTypes',
                    'edmpCaseNo',
                    'edmpParticipationChronicHeartFailure',
                    'ehksPatientNo',
                    'ehksActivated',
                    'ehksDocType',
                    'HGVActivated',
                    'HGVPatientNo',
                    'patientNo',
                    'cardioHeartFailure',
                    'cardioCryptogenicStroke',
                    'cardioCHD',
                    'amtsActivated',
                    'amtsApprovalForDataEvaluation',
                    'amtsApprovalForReleaseFromConfidentiality',
                    'amtsParticipationInSelectiveContract',
                    'amtsSelectiveContractInsuranceId',
                    'partnerIds',
                    'zervixZytologieActivated'
                ],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'partnerIds',
                        editorName: 'PartnerIdsEditorModel'
                    }
                ],
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( PatientSectionCareViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientSectionViewModel',
        'patient-schema',
        'caretypes',
        'dcauth',
        'settings-schema',
        'edmp-commonutils',
        'dctelekardioeditdialog',
        'role-schema'
    ]
} );
