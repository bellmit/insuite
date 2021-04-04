/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'PatientModel', function( Y, NAME ) {
        /**
         * @module PatientModel
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,

            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled;

        function getYears( mustContain ) {
            var years = [],
                range = 4,
                diff,
                currentYear = moment().year(),
                i;

            if( mustContain ) {
                mustContain = +mustContain;
                if( mustContain < currentYear ) {
                    diff = currentYear - mustContain;
                    currentYear = mustContain;
                    range = range + diff;
                } else if( mustContain > (currentYear + range) ) {
                    diff = mustContain - (currentYear + range);
                    range = diff + range;
                }
            }

            for( i = currentYear; i <= currentYear + range; i++ ) {
                years.push( i );
            }

            return years;
        }

        function getMonths() {
            var months = [],
                i;
            for( i = 1; i <= 12; i++ ) {
                months.push( ('00' + i).slice( -2 ) );
            }
            return months;
        }

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class PatientModel
         * @constructor
         * @extends KoViewModel
         */
        function PatientModel( config ) {
            PatientModel.superclass.constructor.call( this, config );
        }

        Y.extend( PatientModel, KoViewModel.getBase(), {
            initializer: function() {
                var
                    self = this;

                self.initPatientModel();
            },
            destructor: function() {
                var
                    self = this;
                self.destroySocketListeners();
            },
            hasPublicInsurance: null,
            getPublicInsurance: null,
            hasCardSwiped: null,
            age: null,
            initPatientModel: function() {
                var
                    self = this;

                self.initCaseFolders();
                self.initAutoSetTalkDependOnGender();
                self.initCrm();
                self.initReadOnly();
                self.initPatientSince();

                self.telekardioSerialEditedOption = ko.observable();
                self.telekardioSerialOldSerial = ko.observable();

                self.hasPublicInsurance = ko.computed( function() {
                    return Y.Array.some( self.insuranceStatus(), function( status ) {
                        return 'PUBLIC' === status.type();
                    } );
                } );

                // MOJ-14319: [OK]
                self.getMainPublicInsurance = ko.computed( function() {
                    return self.getInsuranceByType( 'PUBLIC' );
                } );
                self.getPublicInsurance = function( caseFolderType ) {
                    return caseFolderType && self.getInsuranceByType( caseFolderType.indexOf( caseFolderType ) !== -1 ? caseFolderType : 'PUBLIC' );
                };
                self.getMainPrivateInsurance = ko.computed( function() {
                    return self.getInsuranceByType( 'PRIVATE' );
                } );
                self.getPrivateInsurance = function( caseFolderType ) {
                    return caseFolderType && self.getInsuranceByType( caseFolderType.indexOf( caseFolderType ) !== -1 ? caseFolderType : 'PRIVATE' );
                };

                /**
                 * [KP7-90] proof of insurance
                 */
                self.hasCardSwiped = ko.computed( function() {
                    var today = moment(),
                        swiped,
                        quarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( today.quarter(), today.year() ),
                        // MOJ-14319: [OK] [CARDREAD]
                        insurance = self.getMainPublicInsurance(),
                        hasValidSwipe, isSameOrBefore, isSameOrAfter;

                    if( !insurance || !insurance.cardSwipe() ) {
                        Y.log( '_hasCardSwiped invalid 1', 'debug', NAME );
                        return false;
                    }
                    swiped = moment( insurance.cardSwipe() );

                    hasValidSwipe = swiped && swiped.isValid();
                    isSameOrAfter = hasValidSwipe && (swiped.isSame( quarterRange.start ) || swiped.isAfter( quarterRange.start ));
                    isSameOrBefore = hasValidSwipe && (swiped.isSame( quarterRange.end ) || swiped.isBefore( quarterRange.end ));

                    return hasValidSwipe && isSameOrAfter && isSameOrBefore;
                } );

                self.age = ko.computed( function() {
                    var dob = self.dob(),
                        dod = self.dateOfDeath();
                    return Y.doccirrus.schemas.patient.ageFromDob( dob, dod );
                } );

                self._getNameSimple = function() {
                    return unwrap( self.firstname ) + ' ' + unwrap( self.lastname );
                };

                self.addDisposable( self.kbvDob.subscribe( function( val ) {
                    var kbvObj;

                    if( 10 === val.length ) {
                        kbvObj = new Y.doccirrus.KBVDateValidator( val );
                        self.dob( kbvObj.getISOString() );
                        self.dob_DD( val.slice( 0, 2 ) );
                        self.dob_MM( val.slice( 3, 5 ) );
                    }
                } ) );

                //  needed to link media before patient is saved MOJ-6224
                self._randomId = ko.observable( Y.doccirrus.comctl.getRandId() );

                self.initSocketListeners();

                self.initHelpers();
                self.initAdditionalValidations();
            },
            initPatientSince: function() {
                var self = this;

                if( !peek( self._id ) && !peek( self.patientSince ) ) {
                    self.patientSince( new Date().toJSON() );
                }
            },
            initReadOnly: function() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    currentUser = binder && binder.getInitialData( 'currentUser' ),
                    tenantSettings = binder && binder.getInitialData( 'tenantSettings' );

                /**
                 * sets readOnly fields based on _validatable
                 */
                self.addDisposable( ko.computed( function() {
                    var
                        json,
                        paths,
                        insuranceStatus,
                        checkForNoCrossLocationReadOnly;

                    if( self._validatable() ) {
                        unwrap( self.patientNo );
                        insuranceStatus = unwrap( self.insuranceStatus );
                        if( Array.isArray( insuranceStatus ) ) {
                            insuranceStatus.forEach( function( insurance ) {
                                unwrap( insurance.cardSwipe );
                            } );
                        }
                        json = self.toJSON();
                        json._initialConfigPatientModel = self.get( 'data' );
                        checkForNoCrossLocationReadOnly = tenantSettings &&
                            (
                                (   tenantSettings.noCrossLocationAccess &&
                                    !tenantSettings.noCrossLocationPatientAccess &&
                                    !tenantSettings.crossLocationPatientEditingAllowed ) ||
                                tenantSettings.noCrossLocationPatientAccess
                            );
                        paths = Y.doccirrus.schemas.patient.getReadOnlyFields( json, {
                            userLocationIds: checkForNoCrossLocationReadOnly ? (currentUser.locations || []).map( function( uLoc ) {
                                return uLoc._id;
                            } ) : null
                        } );
                        self.getModuleViewModelReadOnly()._makeReadOnly( {
                            paths: paths
                        } );
                    }
                } ) ).extend( {rateLimit: 0} );
            },
            initAutoSetTalkDependOnGender: function() {
                var
                    self = this;

                /**
                 * MOJ-2224 automatically set 'talk' with 'gender'
                 */
                self.addDisposable( ko.computed( function() {
                    var
                        gender = unwrap( self.gender );

                    switch( gender ) {
                        case'FEMALE':
                            self.talk( 'MS' );
                            break;
                        case'MALE':
                            self.talk( 'MR' );
                            break;
                        default:
                            self.talk( 'NONE' );
                            break;
                    }
                } ) );
            },
            _monthList: null,
            _yearList: null,
            _quarterList: null,
            _monthDisabled: null,
            _quarterDisabled: null,
            initCrm: function() {
                var
                    self = this;

                // TODO: schema default ?
                if( !self.crmCatalogShort() ) {
                    self.crmCatalogShort( 'GOÄ' );
                }

                self._monthList = getMonths();
                self._yearList = getYears( self.crmAppointmentYear() || moment().year() );
                self._quarterList = [1, 2, 3, 4];

                self._monthDisabled = ko.observable( false );
                self._quarterDisabled = ko.observable( false );

                self.addDisposable( ko.computed( function() {
                    var
                        date, start, end,
                        month = self.crmAppointmentMonth(),
                        quarter = self.crmAppointmentQuarter(),
                        year = self.crmAppointmentYear();

                    if( month ) {
                        date = moment( month + '' + year, 'MMYYYY' );
                        start = date.clone().startOf( 'month' ).toDate();
                        end = date.clone().endOf( 'month' ).toDate();
                        self.crmAppointmentRangeStart( start );
                        self.crmAppointmentRangeEnd( end );
                        self._monthDisabled( false );
                        self._quarterDisabled( true );
                    } else if( quarter ) {
                        date = moment( quarter + '' + year, 'QYYYY' );
                        start = date.clone().startOf( 'quarter' ).toDate();
                        end = date.clone().endOf( 'quarter' ).toDate();
                        self.crmAppointmentRangeStart( start );
                        self.crmAppointmentRangeEnd( end );
                        self._monthDisabled( true );
                        self._quarterDisabled( false );
                    } else {
                        self.crmAppointmentRangeStart( undefined );
                        self.crmAppointmentRangeEnd( undefined );
                        self._monthDisabled( false );
                        self._quarterDisabled( false );
                    }
                } ) );

            },
            getInsuranceByType: function( type ) {
                var
                    self = this,
                    insurance;
                Y.Array.some( self.insuranceStatus(), function( status ) {
                    if( type === status.type() ) {
                        insurance = status;
                        return true;
                    }
                } );
                return insurance;
            },
            caseFolderCollection: null,
            initCaseFolders: function() {
                var
                    self = this;

                self.caseFolderCollection = new (KoViewModel.getConstructor( 'CaseFolderCollection' ))( {
                    items: self.get( 'caseFolders' )
                } );
            },
            /***
             * get an address by kind from "addresses" if it exists
             * @method getAddressByKind
             * @param {String} kind
             * @return {Object|null}
             */
            getAddressByKind: function( kind ) {
                var
                    self = this,
                    addresses = unwrap( self.addresses ),
                    result = Y.Array.find( addresses, function( address ) {
                        return kind === unwrap( address.kind );
                    } );
                return result;
            },
            /**
             * Gets all insurance types of patient
             */
            getInsuranceTypes: function() {
                var
                    self = this,
                    publicIns,
                    publicAIns,
                    privateIns,
                    privateAIns,
                    selfIns,
                    KVGIns,
                    IVGIns,
                    UVGIns,
                    MVGIns,
                    VVGIns,
                    bgIns,
                    result = [];

                Y.Array.some( unwrap( self.insuranceStatus ), function( status ) {
                    switch( status.type() ) {
                        case 'PUBLIC':
                            if( !publicIns ) {
                                publicIns = true;
                                result.push( 'PUBLIC' );
                            }
                            break;
                        case 'PRIVATE':
                            if( !privateIns ) {
                                privateIns = true;
                                result.push( 'PRIVATE' );
                            }
                            break;
                        case 'PUBLIC_A':
                            if( !publicAIns ) {
                                publicAIns = true;
                                result.push( 'PUBLIC_A' );
                            }
                            break;
                        case 'PRIVATE_A':
                            if( !privateAIns ) {
                                privateAIns = true;
                                result.push( 'PRIVATE_A' );
                            }
                            break;

                        case 'PRIVATE_CH':
                            if( !KVGIns ) {
                                KVGIns = true;
                                result.push( 'PRIVATE_CH' );
                            }
                            break;
                        case 'PRIVATE_CH_IVG':
                            if( !IVGIns ) {
                                IVGIns = true;
                                result.push( 'PRIVATE_CH_IVG' );
                            }
                            break;
                        case 'PRIVATE_CH_UVG':
                            if( !UVGIns ) {
                                UVGIns = true;
                                result.push( 'PRIVATE_CH_UVG' );
                            }
                            break;
                        case 'PRIVATE_CH_MVG':
                            if( !MVGIns ) {
                                MVGIns = true;
                                result.push( 'PRIVATE_CH_MVG' );
                            }
                            break;
                        case 'PRIVATE_CH_VVG':
                            if( !VVGIns ) {
                                VVGIns = true;
                                result.push( 'PRIVATE_CH_VVG' );
                            }
                            break;
                        case 'SELFPAYER':
                            if( !selfIns ) {
                                selfIns = true;
                                result.push( 'SELFPAYER' );
                            }
                            break;
                        case 'BG':
                            if( !bgIns ) {
                                bgIns = true;
                                result.push( 'BG' );
                            }
                            break;
                    }
                    return publicIns && publicAIns && privateAIns && privateIns && selfIns && bgIns && IVGIns && MVGIns && UVGIns && VVGIns && KVGIns;
                } );
                return result;
            },
            /**
             *  Make a string containing brief insurance information, used when making PDFs from tables, eg, Patientenakte
             */
            getInsuranceNames: function() {
                var
                    self = this,
                    insurances = unwrap( self.insuranceStatus || [] ),
                    insuranceNames = [],
                    tempInsuranceName,
                    i;

                //  collect insurance names
                if( insurances && insurances.length ) {
                    for( i = 0; i < insurances.length; i++ ) {
                        tempInsuranceName = '';

                        if(
                            insurances[i].insuranceName &&
                            unwrap( insurances[i].insuranceName )
                        ) {
                            tempInsuranceName = unwrap( insurances[i].insuranceName );
                        }
                        if(
                            '' === tempInsuranceName &&
                            insurances[i].insurancePrintName &&
                            unwrap( insurances[i].insurancePrintName )
                        ) {
                            tempInsuranceName = unwrap( insurances[i].insurancePrintName );
                        }

                        if( insurances[i].insuranceNo && unwrap( insurances[i].insuranceNo ) ) {
                            tempInsuranceName = tempInsuranceName + ' (Nr: ' + unwrap( insurances[i].insuranceNo ) + ')';
                        }

                        if( tempInsuranceName && '' !== tempInsuranceName ) {
                            insuranceNames.push( tempInsuranceName );
                        }
                    }
                }
                return insuranceNames.join( ', ' ) + ' ';
            },
            _hasInsurance: null,
            _email: null,
            _phone: null,
            _fax: null,
            initHelpers: function() {
                var
                    self = this;

                /**
                 * Computes if there is an insurance
                 * @method _hasInsurance
                 * @returns {Boolean}
                 */
                self._hasInsurance = ko.computed( function() {
                    var
                        insuranceStatus = ko.unwrap( self.insuranceStatus );

                    return Boolean( Array.isArray( insuranceStatus ) && insuranceStatus.length );

                } );

                self._email = ko.computed( function() {
                    var communications = self.communications(),
                        // filter relevant entries
                        communicationsFiltered = Y.Array.filter( communications, function( communication ) {
                            var type = ko.unwrap( communication.type );
                            return 'EMAILPRIV' === type || 'EMAILJOB' === type;
                        } ),
                        // find correct entry via preferred flag
                        find = Y.Array.find( communicationsFiltered, function( communication ) {
                            var preferred = ko.unwrap( communication.preferred );
                            return Boolean( preferred );
                        } );
                    // if none is preferred take the first entry
                    if( null === find && communicationsFiltered.length ) {
                        find = communicationsFiltered[0];
                    }
                    return find;
                } );

                self._phone = ko.computed( function() {
                    var communications = self.communications(),
                        // filter relevant entries
                        communicationsFiltered = Y.Array.filter( communications, function( communication ) {
                            var type = ko.unwrap( communication.type );
                            return type === 'PHONEPRIV' || type === 'PHONEJOB' || type === 'PHONEEMERGENCY';
                        } ),
                        // find correct entry via preferred flag
                        find = Y.Array.find( communicationsFiltered, function( communication ) {
                            var preferred = ko.unwrap( communication.preferred );
                            return Boolean( preferred );
                        } );
                    // if none is preferred take the first entry
                    if( null === find && communicationsFiltered.length ) {
                        find = communicationsFiltered[0];
                    }
                    return find;
                } );

                self._fax = ko.computed( function() {
                    var communications = self.communications(),
                        // filter relevant entries
                        communicationsFiltered = Y.Array.filter( communications, function( communication ) {
                            var type = ko.unwrap( communication.type );
                            return 'FAXPRIV' === type || 'FAXJOB' === type;
                        } ),
                        // find correct entry via preferred flag
                        find = Y.Array.find( communicationsFiltered, function( communication ) {
                            var preferred = ko.unwrap( communication.preferred );
                            return Boolean( preferred );
                        } );
                    // if none is preferred take the first entry
                    if( null === find && communicationsFiltered.length ) {
                        find = communicationsFiltered[0];
                    }
                    return find;
                } );
            },
            initAdditionalValidations: function() {
                var
                    self = this;

                self.patientNo.hasError = ko.observable( false );
                self.partnerIds.hasError = ko.observable( false );
                self.patientNo.validationMessages = ko.observableArray();
                self.addDisposable( self.patientNo.subscribe( function( newValue ) {
                    if( !self.isNew() ) {
                        return;
                    }
                    if( newValue ) {
                        if( self.patientNo.promise ) {
                            Y.log( 'rejecting previous patientNo check', 'debug', NAME );
                            self.patientNo.promise.reject( new Error( 'Request aborted' ) );
                        }
                        self.patientNo.promise = Y.doccirrus.jsonrpc.api.patient.checkPatientNo( {
                            query: {
                                patientNo: newValue,
                                patientId: self._id
                            }
                        } );
                        self.patientNo.promise.done( function() {
                            self.patientNo.hasError( false );
                            self.patientNo.validationMessages.removeAll();
                        } );
                        self.patientNo.promise.fail( function() {
                            self.patientNo.hasError( true );
                            self.patientNo.validationMessages.push( i18n( 'InCaseMojit.patient_detailJS.message.PATIENT_NO_ERROR_MESSAGE' ) );
                        } );

                        self.patientNo.promise.always( function() {
                            delete self.patientNo.promise;
                        } );
                    } else {
                        self.patientNo.hasError( false );
                        self.patientNo.validationMessages.removeAll();
                    }
                } ) );
            },
            addPartnerIds: function PatientModel_addPartnerIds( obj ) {
                var
                    self = this;
                obj = obj || {};
                self.partnerIds.push( obj );
            },
            removePartnerIds: function PatientModel_removePartnerIds( obj ) {
                var
                    self = this;
                self.partnerIds.remove( obj );
            },
            save: function( options ) {
                var self = this,
                    binder = this.get( 'binder' ),
                    locations = binder.getAllLocations();
                return Promise
                    .resolve( Y.doccirrus.kbvcommonutils.patientPreSaveValidation( this, locations ) )
                    .then( function() {
                        var data = self.toJSON();
                        data.telekardioSerialEditedOption = options && options.telekardioSerialEditedOption;
                        data.telekardioSerialOldSerial = options && options.telekardioSerialOldSerial;

                        // Either dateOfInActive or dateOfDeath must be saved based on selected "isDeceased" or "inActive" flag
                        if( data && data.isDeceased && data.dateOfInActive){
                            delete data.dateOfInActive;
                        }

                        if( data && data.inActive && data.dateOfDeath){
                            delete data.dateOfDeath;
                        }

                        // Delete both dates ( if previously set ) when both the flags are de-selected
                        if( data && !data.isDeceased && !data.inActive ){
                            delete data.dateOfDeath;
                            delete data.dateOfInActive;
                        }

                        return Promise.resolve( Y.doccirrus.jsonrpc.api.patient.savePatient( {
                            query: {
                                patientData: data
                            },
                            fields: Object.keys( self._boilerplate )
                        } ) );
                    } )
                    .catch( function( err ) {
                        err.code = err.code || err.status;
                        switch( err.code ) {
                            case 4001:
                                // saved patient version
                                Y.log( 'Saved patient version', 'info', NAME );
                                // resolve with actual patient data
                                return Promise.resolve( { data: err.data } );
                            case 4002:
                                // reset insurance data and rethrow to show error later
                                self.set( 'data.insuranceStatus', self.get( 'data.insuranceStatus' ) );
                        }
                        throw err;
                    } )
                    .then( function( response ) {
                        var data = Array.isArray( response.data ) ? response.data[0] : response.data;

                        if( data && data._id ) {
                            self.set( 'data', data );
                        }

                        self.setNotModified();
                        return self;
                    } );
            },
            'delete': function() {
                var self = this,
                    id = unwrap( self._id );

                if( !id ) {
                    return Promise.resolve();
                }

                return Promise.resolve( Y.doccirrus.jsonrpc.api.patient.delete( {
                    query: {
                        _id: id
                    }
                } ) );
            },
            attachActivity: function( activityId, content, severity ) {
                var
                    self = this;
                self.attachedContent( content );
                self.attachedSeverity( severity );
                return Promise.resolve( Y.doccirrus.jsonrpc.api.patient.attachActivity( {
                    query: {
                        patientId: peek( self._id ),
                        activityId: activityId,
                        content: content,
                        severity: severity
                    }
                } ) );
            },
            detachActivity: function() {
                var
                    self = this;
                self.attachedContent( '' );
                self.attachedSeverity( '' );
                return Promise.resolve( Y.doccirrus.jsonrpc.api.patient.detachActivity( {
                    query: {
                        patientId: peek( self._id )
                    }
                } ) );
            },
            initSocketListeners: function() {
                var
                    self = this;
                Y.doccirrus.communication.on( {
                    event: 'system.NEW_PATIENT_ATTACHED_CONTENT',
                    handlerId: 'PatientModel',
                    done: function( response ) {
                        var
                            data = response.data && response.data[0] || {};
                        self.attachedContent( data.content || '' );
                        self.attachedSeverity( data.severity || '' );
                    }
                } );

                Y.doccirrus.communication.on( {
                    event: 'system.UPDATE_CASEFOLDER_LIST',
                    handlerId: 'PatientModel',
                    done: function( response ) {
                        var
                            data = response.data && response.data[0] || response.data;
                        if( data && peek( self._id ) === data.patientId && self.caseFolderCollection ) {
                            self.caseFolderCollection.load( { patientId: data.patientId } );
                        }
                    }
                } );

                Y.doccirrus.communication.on( {
                    event: 'system.UPDATE_ACTIVE_CASEFOLDER',
                    handlerId: 'PatientModel',
                    done: function( response ) {
                        var
                            data = response.data && response.data[0] || {};
                        if( data && peek( self._id ) === data.patientId ) {
                            self.activeCaseFolderId( data.activeCaseFolderId );
                        }
                    }
                } );

            },
            destroySocketListeners: function() {
                Y.doccirrus.communication.off( 'system.NEW_PATIENT_ATTACHED_CONTENT', 'PatientModel' );
                Y.doccirrus.communication.off( 'system.UPDATE_CASEFOLDER_LIST', 'PatientModel' );
                Y.doccirrus.communication.off( 'system.UPDATE_ACTIVE_CASEFOLDER', 'PatientModel' );
            },
            deleteDeviceKeyByIds: function( deviceIds ) {
                var
                    self = this;
                self.devices.remove( function( device ) {
                    return -1 !== deviceIds.indexOf( peek( device._id ) );
                } );
            },
            //  Check whether the patient is pregnanct according to their most recent MEDDATA entries
            isPregnant: function() {
                var
                    self = this,
                    latestMedData = self.latestMedData() || [],
                    lastPeriodDate = null,
                    lastPregnancyDate = null,
                    i;

                for ( i = 0; i < latestMedData.length; i++ ) {
                    if ( ko.unwrap( latestMedData[i].type ) === 'END_OF_PREGNANCY' ) {
                        lastPregnancyDate = ko.unwrap( latestMedData[i].measurementDate );
                    }
                    if ( ko.unwrap( latestMedData[i].type ) === 'LAST_MENSTRUATION_P' ) {
                        lastPeriodDate = ko.unwrap( latestMedData[i].measurementDate );
                    }
                }

                if ( !lastPregnancyDate && lastPeriodDate ) {
                    //  first pregnancy
                    return true;
                }
                if ( lastPregnancyDate && lastPeriodDate && moment( lastPeriodDate ).isAfter( lastPregnancyDate ) ) {
                    //  new pregnancy, last period date is after last pregnancy date
                    return true;
                }

                return false;
            },

            /**
             *  Return latest recorded MEDDATA value of the given type
             *
             *  @param  {String} type to be loaded defined in v_meddata-schema or dynamically by the user through MedData-Tags
             *  @param  {"textValue"|"value"|"boolValue"|"dateValue"} medDataItemKey key of the medDataItem to be loaded
             *  @return {string|boolean|Date|number|null}
             */
            getLatestMedDataValue: function( type, medDataItemKey ) {
                var
                    self = this,
                    latestMedData = self.latestMedData() || [],
                    keyToBeLoaded = (typeof medDataItemKey === "string") ? medDataItemKey : "textValue",
                    i;

                for( i = 0; i < latestMedData.length; i++ ) {
                    if( type === unwrap( latestMedData[i].type ) ) {
                        return unwrap( latestMedData[i][keyToBeLoaded] );
                    }
                }

                return null;
            },
            /**Return true if meddata contains type
             *
             *  @param  {String}    type        Custom type, or as defined in v_meddata-schema
             */
            hasMedDataType: function( type ) {
                var
                    self = this,
                    latestMedData = self.latestMedData() || [];

                return Boolean(latestMedData.find(function( meddata ) {
                    return unwrap( meddata.type ) === type;
                }));
            },

            updateEdmpNotifiedAboutStatementOfParticipationTypes: function( actType ) {
                var self = this,
                    newValue;
                if( -1 === self.edmpNotifiedAboutStatementOfParticipationTypes.indexOf( actType ) ) {
                    self.edmpNotifiedAboutStatementOfParticipationTypes.push( actType );
                    newValue = peek( self.edmpNotifiedAboutStatementOfParticipationTypes );
                    Promise.resolve( Y.doccirrus.jsonrpc.api.patient.update( {
                        query: {
                            _id: peek( self._id )
                        },
                        data: {
                            edmpNotifiedAboutStatementOfParticipationTypes: newValue
                        },
                        fields: ['edmpNotifiedAboutStatementOfParticipationTypes']
                    } ) ).catch( function( err ) {
                        Y.log( 'could not update edmpNotifiedAboutStatementOfParticipationTypes: reset data' + err, 'error', NAME );
                        self.edmpNotifiedAboutStatementOfParticipationTypes.remove( actType );
                    } );
                }
            },

            /**
             * Swiss: Get Medplan template for documedis service
             */
            getSwissMedplanTemplate: function( employeeId ) {
                var
                    self = this,
                    genderMap = {
                        UNKNOWN: 0,
                        MALE: 1,
                        FEMALE: 2,
                        VARIOUS: 0,
                        UNDEFINED: 0
                    },
                    address = (unwrap( self.addresses ) || [])[0],
                    phoneModel = unwrap( self._phone ),
                    latestMedData = unwrap( self.latestMedData ) || [],
                    height = "", meas = [], key, _rc,
                    Rc = [], rcs = {
                        2: null,
                        4: null,
                        5: null,
                        6: null
                    };

                latestMedData.forEach( function( medData ) {
                    switch ( unwrap(medData.type)) {
                        case "WEIGHT":
                            meas.push( {
                                "Type": 1, //Weight
                                "Val":  unwrap( medData.value ).toString(), //Val
                                "Unit": 2 //Unit - kilograms
                            } );
                            break;
                        case "HEIGHT":
                            if( unwrap( medData.unit ) === 'm' ) {
                                height = unwrap( medData.value ) * 100;
                            } else {
                                height = unwrap( medData.value );
                            }
                            meas.push( {
                                "Type": 2, //Height
                                "Val": height.toString(), //Val
                                "Unit": 1 //Unit - centimetre
                            } );
                            break;
                        case "ATHLETE":
                            handleRc(4, unwrap(medData.cchKey));
                            break;
                        case "DRIVER":
                            handleRc(5, unwrap(medData.cchKey));
                            break;
                        case "HEPATIC_INSUFFICIENCY":
                            handleRc(2, unwrap(medData.cchKey));
                            break;
                        case "RENAL_FAILURE":
                            handleRc(1, unwrap(medData.cchKey));
                            break;

                    }

                    if (unwrap(medData.category) === "ALLERGIES" && unwrap(medData.cchKey)) {
                       if (!rcs[6]) {
                           rcs[6] = [];
                       }
                       rcs[6].push(Number( unwrap(medData.cchKey)));
                    }
                } );
                function handleRc( Id, cchKey ) {
                    if (!cchKey) {
                        return;
                    } else {
                        if (Number(cchKey) === -1) {
                            if (!rcs[Id]) {
                                rcs[Id] = [];
                            }
                        } else {
                            if (!rcs[Id]) {
                                rcs[Id] = [];
                            }
                            rcs[Id].push(cchKey);
                        }
                    }
                }


                for ( key in rcs) {
                    if (Array.isArray(rcs[key])) {
                         _rc = {Id: key};
                        if (rcs[key].length) {
                            _rc.R = rcs[key];
                        }
                        Rc.push(_rc);
                    }
                }

                var data = {
                    "Patient": {
                        "BDt": moment.utc( self.dob() ).format( 'YYYY-MM-DD' ),
                        "City": address ? unwrap( address.city ) : null,
                        "FName": unwrap( self.firstname ),
                        "Gender": genderMap[unwrap( self.gender )],
                        "LName": unwrap( self.lastname ),
                        "Lng": "DE",
                        "Med": {
                            "Meas": meas,
                            "DLstMen": '',
                            "Prem": 0,
                            "Rc": Rc
                        },
                        "Phone": phoneModel ? unwrap( phoneModel.value ) : null,
                        "Street": address ? unwrap( address.street ) : null,
                        "Zip": address ? unwrap( address.zip ) : null
                    },
                    "Medicaments": [],
                    "Dt": moment().utcOffset( 120 ).format(),
                    "MedType": 1,
                    "Auth": employeeId || ""
                };
                var currentCaseFolder,
                    caseFolderCollectionArray = unwrap( self.caseFolderCollection.items ) || [],
                    insuranceStatusArray = unwrap( self.insuranceStatus ) || [],
                    i;
                for( i = 0; i < caseFolderCollectionArray.length; i++ ) {
                    if( unwrap( caseFolderCollectionArray[i] )._id === unwrap( self.activeCaseFolderId ) ) {
                        currentCaseFolder = caseFolderCollectionArray[i];
                    }
                }
                if( !unwrap( self.insuranceCardNumber ) ) {
                    for( i = 0; i < insuranceStatusArray.length; i++ ) {
                        if( unwrap( insuranceStatusArray[i].type ) === currentCaseFolder.type ) {
                            self.insuranceCardNumber = unwrap( insuranceStatusArray[i].vekaCardNo );
                            break;
                        }
                    }
                }
                if( self.insuranceCardNumber ) {
                    data.Patient.Ids = [
                        {
                            "Type": "1",
                            "Val": unwrap( self.insuranceCardNumber )
                        }];
                }
                return data;
            }

        }, {
            schemaName: 'patient',
            NAME: 'PatientModel',
            ATTRS: {
                binder: {
                    valueFn: function() {
                        return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                    },
                    lazyAdd: false
                },
                validatable: {
                    value: true,
                    lazyAdd: false
                },
                ignoreModificationsOn: {
                    value: [
                        'activeCaseFolderId',
                        'markers',
                        'comment',
                        'edmpNotifiedAboutStatementOfParticipationTypes'
                    ],
                    cloneDefaultValue: true,
                    lazyAdd: false
                },
                /**
                 * @attribute caseFolders
                 * @type {Array}
                 * @default []
                 */
                caseFolders: {
                    value: [],
                    cloneDefaultValue: true,
                    lazyAdd: false,
                    setter: function( value ) {
                        var self = this;
                        if( self.caseFolderCollection ) {
                            self.caseFolderCollection.items( value );
                        }
                        return value;
                    }
                },
                supportCountryExtensions: {
                    value: true,
                    lazyAdd: false
                }
            }
        } );

        /**
         * @method getDataFromPatientId
         * @for PatientModel
         * @param {String} patientId
         * @returns {Promise}
         * @static
         */
        PatientModel.getDataFromPatientId = function( patientId ) {
            return new Promise( function( resolve, reject ) {
                Y.doccirrus.jsonrpc.api.patient
                    .read( { query: { _id: patientId } } )
                    .then( function( response ) {
                        return Array.isArray( response.data ) && response.data[0] || null;
                    } )
                    .done( function( patient ) {
                        if( patient ) {
                            resolve( patient );
                        }
                        else {
                            reject( 'patient not found' );
                        }
                    } )
                    .fail( function() {
                        reject( 'patient not found' );
                    } );
            } );
        };

        /**
         * @method getDataFromPatientId
         * @for PatientModel
         * @param {String} patientId
         * @returns {Promise}
         * @static
         */
        PatientModel.getMirrorDataFromPatientId = function( patientId ) {
            return new Promise( function( resolve, reject ) {
                Y.doccirrus.jsonrpc.api.mirrorpatient
                    .read( { query: { _id: patientId } } )
                    .then( function( response ) {
                        return Array.isArray( response.data ) && response.data[0] || null;
                    } )
                    .done( function( patient ) {
                        if( patient ) {
                            resolve( patient );
                        }
                        else {
                            reject( 'mirrorpatient not found' );
                        }
                    } )
                    .fail( function() {
                        reject( 'mirrorpatient not found' );
                    } );
            } );
        };

        /**
         * @method getCaseFoldersFromPatientId
         * @for PatientModel
         * @param {String} patientId
         * @returns {Promise}
         * @static
         */
        PatientModel.getCaseFoldersFromPatientId = function( patientId ) {
            var
                binder = this.ATTRS.binder.valueFn();

            return new Promise( function( resolve, reject ) {
                var apiMethod = binder.casefolderApiFn.getCaseFolderForCurrentEmployee ? 'getCaseFolderForCurrentEmployee' : 'read',
                    incaseconfiguration = binder.getInitialData( 'incaseconfiguration' );
                binder.casefolderApiFn[ apiMethod ]( {
                        query: { patientId: patientId }
                    } )
                    .then( function( response ) {
                        var
                            preparedCaseFolder,
                            data = Array.isArray( response.data ) && response.data || [],
                            activitiesPrepared;

                        if( apiMethod === 'getCaseFolderForCurrentEmployee' ){
                            activitiesPrepared = data.pop();
                            if( ( incaseconfiguration && incaseconfiguration.applyPreparedCaseFolder ) || ( activitiesPrepared && activitiesPrepared.activitiesCount ) ) {
                                preparedCaseFolder = {_id: Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId(), title: i18n('casefolder-api.PREPARED'), type: 'PREPARED' };
                                data.push( preparedCaseFolder );
                            }
                        }
                        return data;
                    } )
                    .done( resolve )
                    .fail( function() {
                        reject( 'caseFolders not found' );
                    } );
            } );
        };

        /**
         * @method createModelFromPatientId
         * @for PatientModel
         * @param {String} patientId
         * @returns {Promise}
         * @static
         */
        PatientModel.createModelFromPatientId = function( patientId ) {
            return Promise
                .props( {
                    patient: PatientModel.getDataFromPatientId( patientId ),
                    caseFolders: PatientModel.getCaseFoldersFromPatientId( patientId )
                } )
                .then( function( props ) {
                    return new PatientModel( {
                        data: props.patient,
                        caseFolders: props.caseFolders
                    } );
                } )
                .catch( catchUnhandled );
        };

        /**
         * @method createModelFromPatientId
         * @for PatientModel
         * @param {String} patientId
         * @returns {Promise}
         * @static
         */
        PatientModel.createMirrorModelFromPatientId = function( patientId ) {
            return Promise
                .props( {
                    patient: PatientModel.getMirrorDataFromPatientId( patientId ),
                    caseFolders: PatientModel.getCaseFoldersFromPatientId( patientId )
                } )
                .then( function( props ) {
                    return new PatientModel( {
                        data: props.patient,
                        caseFolders: props.caseFolders
                    } );
                } )
                .catch( catchUnhandled );
        };

        KoViewModel.registerConstructor( PatientModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'promise',
            'KoViewModel',
            'CaseFolderCollection',
            'patient-schema',
            'dccommonutils'
        ]
    }
);
