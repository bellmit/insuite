/**
 * User: pi
 * Date: 22/05/15  16:18
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'CompanyModel', function( Y, NAME  ) {
        /**
         * @module CompanyModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            PLEASE_SELECT = i18n( 'general.message.PLEASE_SELECT' ),
            ZIP_ERR = i18n( 'validations.message.zip' ),
            ZIP_ERR_CH = i18n( 'validations.message.zip_CH' ),
            SWISS = i18n( 'customer-schema.CountryMode_E.CH' ),
            GERMANY = i18n( 'customer-schema.CountryMode_E.D' );

        /**
         * @class CompanyModel
         * @constructor
         * @extends KoViewModel
         */
        function CompanyModel( config ) {
            CompanyModel.superclass.constructor.call( this, config );
        }

        CompanyModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            /**
             * If true, model will require at least one address.
             *  also user can not remove first address.
             * @attribute isAddressRequired
             * @type {Boolean}
             * @default true
             */
            isAddressRequired: {
                value: true,
                lazyAdd: false
            },
            appTokens: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( CompanyModel, KoViewModel.getBase(), {

            initializer: function CompanyModel_initializer() {
                var self = this;
                self.initCompany();
            },
            destructor: function CompanyModel_destructor() {
            },
            /**
             * cotype select2 autocompleter configuration
             * @property select2CoType
             * @type {Object}
             */
            select2CoType: null,
            /**
             * initializes cotype select2 autocompleter
             * @method initSelect2Kind
             */
            initCoTypeSelect2: function CompanyModel_initCoTypeSelect2() {
                var self = this,
                    _select2coTypeVal = ko.computed( {
                        read: function() {
                            return ko.unwrap( self.cotype );
                        },
                        write: function( $event ) {
                            self.cotype( $event.val );
                        }
                    } );

                self.addDisposable( _select2coTypeVal );
                self.select2CoType = {
                    val: _select2coTypeVal,
                    placeholder: PLEASE_SELECT,
                    select2: {
                        data: (function() {
                            return Y.doccirrus.schemas.company.types.CompanyType_E.list.map( function( cotype ) {
                                return {
                                    id: cotype.val,
                                    text: cotype.i18n
                                };
                            } );
                        })()
                    }
                };
            },

            /**
             * releaseGroup select2 autocompleter configuration
             * @property select2Groups
             * @type {Object}
             */
            select2Groups: null,
            /**
             * initializes cotype select2 autocompleter
             * @method initSelect2Kind
             */
            initGroups: function CompanyModel_initGroups() {
                var
                    self = this,
                    groupMap = [],
                    _select2GroupVal;

                for( let i = 1; i < 11; i++ ) {
                    groupMap.push( {
                        id: i,
                        text: i.toString()
                    } );
                }

                _select2GroupVal = ko.computed( {
                    read: function() {
                        return ko.unwrap( self.releaseGroup );
                    },
                    write: function( $event ) {
                        self.releaseGroup( $event.val );
                    }
                } );

                self.addDisposable( _select2GroupVal );

                self.select2Groups = {
                    val: _select2GroupVal,
                    placeholder: PLEASE_SELECT,
                    select2: {
                        width: '100%',
                        allowClear: true,
                        data: groupMap
                    }
                };
            },
            /**
             * systemType select2 autocompleter configuration
             * @property select2SystemType
             * @type {Object}
             */
            select2SystemType: null,
            hasSupportLevel: function( supportLevel, licenseScope ) {
                var
                    self = this;
                licenseScope = licenseScope || peek( self.licenseScope );
                return licenseScope && licenseScope.some( function( license ) {
                    return peek( license.supportLevel ) === supportLevel;
                } );
            },
            initSystemType: function() {
                var
                    self = this;
                self.addDisposable( ko.computed( function() {
                    var
                        license = unwrap( self.licenseScope )[ 0 ];
                    if( license ) {
                        unwrap( license.supportLevel );
                        if( !ko.computedContext.isInitial() ) {
                            self.checkSystemType();
                        }
                    }
                } ) );
            },
            checkSystemType: function() {
                var
                    self = this,
                    systemType = peek( self.systemType );
                if( Y.doccirrus.schemas.company.serverTypes.ISD === peek( self.serverType ) && -1 !== self.usedSystemTypes.indexOf( systemType ) ) {
                    self.systemType( null );
                }
            },
            /**
             * initializes systemType select2 autocompleter
             * @method initSelect2Kind
             */
            initSystemTypeSelect2: function CompanyModel_initSystemTypeSelect2() {
                var self = this,
                    query = {
                        deleted: { $ne: true },
                        serverType: peek( self.serverType )
                    },
                    _select2SystemTypeVal = ko.computed( {
                        read: function() {
                            return ko.unwrap( self.systemType );
                        },
                        write: function( $event ) {
                            self.systemType( $event.val );
                        }
                    } );
                self.usedSystemTypes = [];
                if( peek( self._id ) ) {
                    query._id = { $ne: peek( self._id ) };
                }
                Y.doccirrus.jsonrpc.api.company.read( {
                    query: query,
                    options: {
                        fields: {
                            licenseScope: 1,
                            systemType: 1
                        }
                    }
                } ).done( function( response ) {
                        var
                            data = response.data;

                        self.usedSystemTypes = data.filter( function( item ) {
                            return !self.hasSupportLevel( Y.doccirrus.schemas.settings.supportLevels.TEST, item.licenseScope );
                        } ).map( function( company ) {
                            return company.systemType;
                        } );
                    }
                );
                self.select2SystemType = {
                    val: self.addDisposable( _select2SystemTypeVal ),
                    placeholder: PLEASE_SELECT,
                    select2: {
                        data: function() {
                            return {
                                results: Y.doccirrus.schemas.company.types.systemType_E.list.filter( function( type ) {
                                    return -1 === self.usedSystemTypes.indexOf( type.val ) || self.hasSupportLevel( Y.doccirrus.schemas.settings.supportLevels.TEST );
                                } ).map( function( type ) {
                                    return {
                                        id: type.val,
                                        text: type.i18n
                                    };
                                } )
                            };
                        }
                    }
                };
            },
            /**
             * @property vprcHost
             * @type {String}
             */
            vprcHost: null,
            /**
             * @property isTemplate
             * @type {ko.observable}
             */
            isTemplate: null,
            /**
             * @property newsLetter
             * @type {Object} link to KoViewModel of 'NEWSLETTER' service
             */
            newsLetter: null,
            /**
             * Checks if there is at least one address.
             *  If not, will add it. After that, locks first address.
             * @method setAddressRequired
             */
            setAddressRequired: function CompanyModel_setAddressRequired() {
                var self = this;
                if( !self.addresses().length ) {
                    self.addresses.push( {} );
                }
                self.addresses()[ 0 ].showDeleteButton( false );
            },
            /**
             * initializes company model
             */
            initCompany: function CompanyModel_initCompany() {
                var
                    self = this,
                    isTemplateObject = {
                        key: 'isTemplate',
                        value: false
                    },
                    newsletterObject = {
                        ps: "NEWSLETTER",
                        config: []
                    },
                    vprcObject = {
                        ps: "VPRC",
                        config: [ isTemplateObject ]
                    };
                self.initDefaultLicenseScope();
                self.initCoTypeSelect2();
                self.initGroups();

                self.initSystemTypeSelect2();
                self.initSystemType();

                self.systemId.subscribe(function(newValue) {
                   self.systemId( newValue.toUpperCase() );
                });

                self.vprcHost = ' - ';
                if( self.prodServices() ) {
                    self.prodServices().forEach( function( service ) {
                        if( 'VPRC' === service.ps() ) {
                            vprcObject = service;
                            service.config().forEach( function( configModel ) {
                                if( 'isTemplate' === configModel.key() ) {
                                    isTemplateObject = configModel;

                                }
                            } );
                            if( !isTemplateObject._id ) {
                                service.config.push( isTemplateObject );
                            }
                        }
                        if( 'NEWSLETTER' === service.ps() ) {
                            newsletterObject = service;
                        }
                    } );
                }

                if( !newsletterObject._id ) {
                    self.prodServices.push( newsletterObject );
                }
                if( !vprcObject._id ) {
                    self.prodServices.push( vprcObject );
                }

                self.isTemplate = ko.observable();
                //set links for specific prodServices
                if( self.prodServices() ) {
                    self.prodServices().forEach( function( service ) {
                        if( 'VPRC' === service.ps() ) {
                            service.config().forEach( function( config ) {
                                if( 'isTemplate' === config.key() ) {
                                    self.isTemplate( 'true' === ko.utils.peekObservable( isTemplateObject.value ) );
                                }
                                if( 'hostname' === config.key() ) {
                                    self.vprcHost = config.value;
                                }
                            } );
                        }
                        if( 'NEWSLETTER' === service.ps() ) {
                            self.newsLetter = service;

                        }
                    } );
                }

                self.addDisposable( self.isTemplate.subscribe( function( newValue ) {
                    isTemplateObject.value( (true === newValue) ? 'true' : 'false' );
                } ) );

                //company should have at least one address
                if( self.get( 'isAddressRequired' ) ) {
                    self.setAddressRequired();
                }

                self.commissionKeyMinutesLeft = ko.observable( '' );
                self.commissionKeyIsValid = ko.observable( false );

                function invalidateMinutesLeft() {
                    var commissionKeyCreatedAt = self.commissionKeyCreatedAt();
                    self.commissionKeyMinutesLeft( commissionKeyCreatedAt ?
                        moment( commissionKeyCreatedAt ).from( moment().subtract( 30, 'minutes' ), true ) : '' );
                    self.commissionKeyIsValid( commissionKeyCreatedAt ? moment( commissionKeyCreatedAt ).isAfter( moment().subtract( 30, 'minutes' ) ) : false );
                }

                self.commissionKeyMinutesLeftIntervalID = setInterval( invalidateMinutesLeft, 1000 * 60 );
                invalidateMinutesLeft();

                self.commissionKeyCreatedAtDisplay = ko.computed( function() {
                    var commissionKeyCreatedAt = self.commissionKeyCreatedAt(),
                        minutesLeft = self.commissionKeyMinutesLeft(),
                        isValid = self.commissionKeyIsValid(),
                        dateOfCreation = '';

                    if( !commissionKeyCreatedAt ) {
                        return '';
                    }

                    if( !isValid ) {
                        return i18n( 'CRMMojit.CompanyModelJS.helpBlock.commissionKeyInvalid' );
                    }
                    if( commissionKeyCreatedAt ) {
                        dateOfCreation = moment( commissionKeyCreatedAt ).format( i18n( 'general.TIMESTAMP_FORMAT_LONG' ) );
                    }

                    return i18n( 'CRMMojit.CompanyModelJS.helpBlock.commissionKeyCreatedAtDisplay', {
                        data: {
                            dateOfCreation: dateOfCreation,
                            duration: minutesLeft
                        }
                    } );
                } );

                self.createCommissionKey = function() {
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.company.createCommissionKey( {
                        companyId: self._id(),
                        systemId: self.systemId()
                    } ) ).then( function( response ) {
                        Y.log( 'created commission key: ' + response, 'info', NAME );
                        if( response && response.data ) {
                            self.set( 'data', response.data );
                            self.setNotModified();
                            invalidateMinutesLeft();
                        }
                    } ).catch( function( err ) {
                        Y.log( 'could not create commission key: ' + err, 'warn', NAME );
                    } );

                };

                self.createCommissionKeyBtnDisabled = ko.computed( function() {
                    var _id = self._id(),
                        systemId = self.systemId();
                    return !_id || !systemId;
                } );

                self.removeCommissionKey = function() {
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.company.removeCommissionKey( {
                        companyId: self._id()
                    } ) ).then( function( response ) {
                        Y.log( 'removed commission key: ' + response, 'info', NAME );
                        if( response && response.data ) {
                            self.set( 'data', response.data );
                            self.setNotModified();
                        }
                    } ).catch( function( err ) {
                        Y.log( 'could not remove commission key: ' + err, 'warn', NAME );
                    } );
                };

                self.removeCommissionKeyBtnDisabled = ko.computed( function() {
                    var _id = self._id(),
                        commissionKey = self.commissionKey();
                    return !_id || !commissionKey;
                } );

                self.initTrial();

            },
            initDefaultLicenseScope: function CompanyModel_initDefaultLicenseScope() {
                var
                    self = this,
                    licenseScope = peek( self.licenseScope );
                if( licenseScope.length ) {
                    return;
                }
                self.licenseScope.push( Y.doccirrus.schemas.settings.getCleanLicenseData() );
            },

            initTrial: function CompanyModel_initTrial() {
                var
                    self = this;
                self.trialExpire = ko.computed( {
                    read: function() {
                        var
                            licenseScope = unwrap( self.licenseScope ),
                            trialExpireValue = unwrap( licenseScope[ 0 ].trialExpire );
                        return trialExpireValue;
                    },
                    write: function( val ) {
                        var
                            licenseScope = peek( self.licenseScope ),
                            trialExpire = licenseScope[ 0 ].trialExpire;
                        trialExpire( val );
                    }
                } );

                self.trialBegin = ko.computed( {
                    read: function() {
                        var
                            licenseScope = unwrap( self.licenseScope ),
                            trialBeginValue = unwrap( licenseScope[ 0 ].trialBegin );
                        return trialBeginValue;
                    },
                    write: function( val ) {
                        var
                            licenseScope = peek( self.licenseScope ),
                            trialBegin = licenseScope[ 0 ].trialBegin;
                        trialBegin( val );
                    }
                } );
            },
            /**
             * see {{#crossLink "KoViewModel/getTypeName:method"}}{{/crossLink}}
             * @method getTypeName
             */
            getTypeName: function() {
                var result = CompanyModel.superclass.getTypeName.apply( this, arguments );
                switch( result ) {
                    case 'AddressModel':
                        result = 'CompanyAddressModel';
                        break;
                    case 'CommunicationModel':
                        result = 'CompanyCommunicationModel';
                        break;
                }
                return result;
            }
        }, {
            schemaName: 'company',
            NAME: 'CompanyModel'
        } );

        KoViewModel.registerConstructor( CompanyModel );

        /**
         * @class CommunicationCompanyModel
         * @constructor
         * @extends CommunicationModel
         */
        function CompanyCommunicationModel( config ) {
            CompanyCommunicationModel.superclass.constructor.call( this, config );
        }

        Y.extend( CompanyCommunicationModel, KoViewModel.constructors.CommunicationModel, {
            initializer: function CompanyCommunicationModel_initializer() {
            },
            destructor: function CompanyCommunicationModel_destructor() {
            }
        }, {
            schemaName: 'company.communications',
            NAME: 'CompanyCommunicationModel'
        } );
        KoViewModel.registerConstructor( CompanyCommunicationModel );

        /**
         * @class AddressCompanyModel
         * @constructor
         * @extends AddressModel
         */
        function CompanyAddressModel( config ) {
            CompanyAddressModel.superclass.constructor.call( this, config );
        }

        CompanyAddressModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( CompanyAddressModel, KoViewModel.constructors.AddressModel, {
            initializer: function CompanyAddressModel_initializer() {
                var
                    self = this,
                    parent = self.get( 'parent' ),
                    select2coTypeVal = ko.computed( {
                        read: function() {
                            return ko.unwrap( self.cotype );
                        },
                        write: function( $event ) {
                            self.cotype( $event.val );
                        }
                    } ),
                    countriesList = [{id: 'CH', text: 'Schweiz'}, {id: 'D', text: 'Deutschland'}];
                self.cantonWithText = self.cantonWithText || ko.observable();
                self.cantonI18n = i18n( 'person-schema.Address_CH_T.cantonCode' );
                self.select2Country = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                countryCode = self.countryCode(),
                                country = self.country();

                            if( countryCode && country ) {
                                return {id: countryCode, text: country};
                            }
                            else {
                                return null;
                            }
                        },
                        write: function( $event ) {
                            var choice;
                            if( $event.added ) {
                                choice = $event.added;
                                self.countryCode( choice.id );
                                self.country( choice.text );

                            }

                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        data: function() {
                            return {
                                // list of available days to choose from
                                results: countriesList
                            };
                        }
                    }
                };

                self.displayZip = ko.observable();
                self.displayZip.validationMessages = ko.observableArray( [i18n( 'validations.message.INVALID_VALUE' )] );

                self.addDisposable( ko.computed( function() {
                    var countryCode = self.countryCode();

                    if( 'D' === countryCode ) {
                        self.displayZip.validationMessages( [ZIP_ERR] );
                    } else {
                        self.displayZip.validationMessages( [ZIP_ERR_CH] );
                    }

                    self.country();
                    self.zip.validate();
                } ).extend({ rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT }) );

                self.addDisposable( ko.computed( function() {
                    var
                        countryMode = ko.unwrap( parent.countryMode );

                        if( countryMode ) {
                            self.countryCode( countryMode.includes( 'CH' ) ? 'CH' : 'D' );
                            self.country( countryMode.includes( 'CH' ) ? SWISS : GERMANY  );
                        }
                } ) );

                self.addDisposable( select2coTypeVal );

                self.select2CoType = {
                    val: select2coTypeVal,
                    placeholder: PLEASE_SELECT,
                    select2: {
                        data: (function() {
                            return Y.doccirrus.schemas.company.types.CompanyType_E.list.map( function( cotype ) {
                                return {
                                    id: cotype.val,
                                    text: cotype.i18n
                                };
                            } );
                        })()
                    }
                };

                self.countryModeIncludesSwitzerland = ko.computed( function() {
                    return Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                } );

            },
            destructor: function CompanyAddressModel_destructor() {
            }
        }, {
            schemaName: 'company.addresses',
            NAME: 'CompanyAddressModel'
        } );
        KoViewModel.registerConstructor( CompanyAddressModel );

        /**
         * @class LicenseScopeModel
         * @constructor
         * @extends KoViewModel
         */
        function LicenseScopeModel( config ) {
            LicenseScopeModel.superclass.constructor.call( this, config );
        }

        Y.extend( LicenseScopeModel, KoViewModel.getBase(), {
            initializer: function() {
                var
                    self = this;

                self.displayDoctorsAmount = ko.observable( '' );

                self.initSelect2();
                self.convertBaseSystemLevel();

                self.addDisposable( ko.computed( function() {
                    var
                        displayAmount = unwrap( self.displayDoctorsAmount );

                    if( ['', undefined].includes( displayAmount ) ) {
                        self.doctorsAmount( '0' );
                    } else {
                        self.doctorsAmount( displayAmount );
                    }
                } ) );

                self.hasNotInTiLicence = ko.computed( function() {
                        var additionalSevices = unwrap( self.additionalServices),
                            hasInTi = additionalSevices.includes('inTi');
                        if (!hasInTi){
                            self.telematikServices([]);
                        }
                        return !hasInTi;
                });

                //Can only be enabled, if KIM and QES are enabled
                self.eDocletterReadOnly = ko.computed(function() {
                    var
                        telematikServices = unwrap( self.telematikServices ),
                        hasNotInTiLicence = unwrap(self.hasNotInTiLicence),
                        hasEDocletter = telematikServices.includes( 'eDocletter' ),
                        index,
                        neededModules = ['KIM', 'QES'],
                        hasKimQes = neededModules.every(function(val) {return telematikServices.includes( val );});

                    if (hasNotInTiLicence === true){
                        return true;
                    }

                    // uncheck eDocletter if kim or Qes not granted
                    if( hasEDocletter && !hasKimQes ) {
                        index = telematikServices.indexOf( 'eDocletter' );

                        if( index > -1 ) {
                            telematikServices.splice( index, 1 );
                        }
                        self.telematikServices( telematikServices );
                    }
                    return !hasKimQes;
                });
                },
            initSelect2: function() {
                var
                    self = this;

                self.select2Solutions = {
                    val: ko.computed( {
                        read: function() {
                            return unwrap( self.solutions );
                        },
                        write: function( $event ) {
                            self.solutions( $event.val );
                        }
                    } ),
                    placeholder: '',
                    select2: {
                        multiple: true,
                        data: (self.get( 'parent' ).get( 'appTokens' ) || []).map( function( item ) {
                            return { id: item.appName, text: item.title || '' };
                        } )
                    }
                };
            },
            convertBaseSystemLevel: function() {
                var
                    self = this,
                    baseSystemLevel = unwrap( self.baseSystemLevel ),
                    amount = unwrap( self.doctorsAmount );

                if( amount ) {
                    if( '0' === amount ) {
                        self.displayDoctorsAmount( '' );
                    } else {
                        self.displayDoctorsAmount( amount );
                    }
                    return;
                }

                amount = Y.doccirrus.commonutils.baseSystemLevelToDoctorsAmount( baseSystemLevel );

                if( '0' === amount ) {
                    self.displayDoctorsAmount( '' );
                } else {
                    self.displayDoctorsAmount( amount );
                }
            },
            destructor: function() {
            }
        }, {
            schemaName: 'company.licenseScope',
            NAME: 'LicenseScopeModel'
        } );
        KoViewModel.registerConstructor( LicenseScopeModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CommunicationModel',
            'AddressModel',
            'company-schema'
        ]
    }
);