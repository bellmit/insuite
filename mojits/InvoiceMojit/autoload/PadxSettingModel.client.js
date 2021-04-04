/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery*/

'use strict';

YUI.add( 'PadxSettingModel', function( Y/*, NAME*/ ) {

        /**
         * @module PadxSettingModel
         */

        var
            cid = 0,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel;

        function showError( response ) {
            var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                window: {width: 'small'},
                message: errors.join( '<br>' )
            } );
        }

        /**
         * @class PadxContactsModel
         * @constructor
         * @param {Object} config
         * @extends KoViewModel
         */
        function PadxContactsModel( config ) {
            PadxContactsModel.superclass.constructor.call( this, config );
        }

        PadxContactsModel.ATTRS = {
            availableTypeList: {
                /**
                 * @attribute availableTypeList
                 * @type {Array}
                 */
                value: Y.doccirrus.schemas.person.types.Communication_E.list,
                lazyAdd: false
            },
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( PadxContactsModel, KoViewModel.getBase(), {
                initializer: function PadxContactsModel_initializer() {
                    var
                        self = this,
                        validTypes = [
                            'PHONEJOB',
                            'PHONEPRIV',
                            'MOBILEJOB',
                            'MOBILEPRIV',
                            'FAXJOB',
                            'FAXPRIV',
                            'EMAILJOB',
                            'EMAILPRIV'
                        ];

                    self.contactTypeI18n = i18n( 'person-schema.Communication_T.type' );
                    self.valueTextI18n = i18n( 'person-schema.Communication_T.value.i18n' );
                    self.preferredTextI18n = i18n( 'person-schema.Communication_T.preferred' );
                    self.buttonDeleteTextI18n = i18n( 'general.button.DELETE' );
                    self._typeList = self.get( 'availableTypeList' ) || [];
                    self._typeList = self._typeList.filter( function( item ) {
                        return -1 !== validTypes.indexOf( item.val );
                    } );
                },
                /**
                 * Handles click on delete button - removes selected contact item
                 * @method deleteContactItem
                 * @param {Object} data
                 * @param {Object} item
                 */
                deleteContactItem: function( data, item ) {
                    data.contacts.remove( function( contact ) {
                        return contact.clientId === item.clientId;
                    } );
                }
            },
            {
                schemaName: 'invoiceconfiguration.padxSettings.contacts',
                NAME: 'PadxContactsModel'
            } );

        KoViewModel.registerConstructor( PadxContactsModel );

        /**
         * @class PadxSettingModel
         * @constructor
         * @param {Object} config
         * @extends KoViewModel
         */
        function PadxSettingModel( config ) {
            PadxSettingModel.superclass.constructor.call( this, config );
        }

        PadxSettingModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            availableKindList: {
                /**
                 * @attribute availableKindList
                 * @type {Array}
                 */
                value: Y.doccirrus.schemas.person.types.AddressKind_E.list,
                lazyAdd: false
            }
        };

        Y.extend( PadxSettingModel, KoViewModel.getBase(), {
                initializer: function PadxSettingModel_initializer() {
                    var
                        self = this,
                        validKinds = [
                            'OFFICIAL',
                            'POSTBOX'
                        ],
                        lastKind = null,
                        cities = [],
                        contacts = []; // used by reset

                    function setCities( data ) {
                        cities.length = 0;
                        data.forEach( function( cityData ) {
                            cities.push( {id: cityData.city, text: cityData.city} );
                        } );
                    }

                    self.cantonWithText = self.cantonWithText || ko.observable();

                    self.cid = ++cid;
                    self._kindList = self.get( 'availableKindList' ) || [];

                    self.groupedByReceipientI18n = i18n( 'InvoiceMojit.padxSettings.grouped-by-recipient.heading' );
                    self.groupedByProxyI18n = i18n( 'InvoiceMojit.padxSettings.grouped-by-proxy.heading' );
                    self.groupedBySenderI18n = i18n( 'InvoiceMojit.padxSettings.grouped-by-sender.heading' );
                    self.groupedByParticipantI18n = i18n( 'InvoiceMojit.padxSettings.grouped-by-participant.heading' );
                    self.participantTypeTotalI18n = i18n( 'InvoiceMojit.padxSettings.grouped-by-participant.total' );
                    self.participantTypePercentI18n = i18n( 'InvoiceMojit.padxSettings.grouped-by-participant.percent' );
                    self.oneClickHeadingI18n = i18n( 'InvoiceMojit.padxSettings.1click.heading' );
                    self.senderAddressTextI18n = i18n( 'invoiceconfiguration-schema.PadxSetting_T.senderAddress' );
                    self.optionalFieldsTextI18n = i18n( 'InvoiceMojit.padxSettings.optionalFields.heading' );
                    self.buttonDeleteTextI18n = i18n( 'general.button.DELETE' );
                    self.pleaseSelectI18n = i18n( 'general.message.PLEASE_SELECT' );
                    self.physiciansI18n = i18n( 'invoiceconfiguration-schema.PadxSetting_T.physicians' );
                    self.locationsI18n = i18n( 'invoiceconfiguration-schema.PadxSetting_T.locations' );

                    ko.computed( function() {
                        self.encryption();
                        self.recipientRZID.validate();
                    } );

                    self.locationsList = ko.observableArray();
                    self.physiciansList = ko.observableArray();

                    self.select2Physicians = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    value = self.employees() || [];

                                return value.map( function( physician ) {

                                    return {
                                        id: peek( physician._id ),
                                        text: peek( physician.lastname ) + ', ' + peek( physician.firstname )
                                    };
                                } );
                            },
                            write: function( $event ) {
                                var
                                    value = $event.val;

                                self.employees( self.physiciansList().filter( function( physician ) {
                                    return value.indexOf( peek( physician._id ) ) > -1;
                                } ) );
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            multiple: true,
                            query: function( query ) {
                                var
                                    results;
                                Y.doccirrus.jsonrpc.api.employee.read( {query: {type: 'PHYSICIAN'}} ).done( function( response ) {
                                        if( response && response.data && response.data[0] ) {
                                            self.physiciansList( response.data );
                                            results = [].concat( response.data );
                                            results = results.map( function( item ) {
                                                return {id: item._id, text: item.lastname + ', ' + item.firstname};
                                            } );
                                            query.callback( {results: results} );
                                        }
                                    }
                                ).fail( function( response ) {
                                    showError( response );
                                } );
                            }
                        }
                    };
                    self.select2Locations = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    value = self.locations() || [];

                                return value.map( function( location ) {
                                    return {
                                        id: peek( location._id ),
                                        text: peek( location.locname )
                                    };
                                } );
                            },
                            write: function( $event ) {
                                var
                                    value = $event.val;

                                self.locations( self.locationsList().filter( function( location ) {
                                    return value.indexOf( peek( location._id ) ) > -1;
                                } ) );
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            allowEmpty: true,
                            multiple: true,
                            query: function( query ) {
                                var
                                    results;
                                Y.doccirrus.jsonrpc.api.location.read().done( function( response ) {
                                        if( response && response.data && response.data[0] ) {
                                            self.locationsList( response.data );

                                            results = [].concat( response.data );

                                            results = results.map( function( item ) {
                                                return {id: item._id, text: item.locname};
                                            } );
                                            query.callback( {results: results} );
                                        }
                                    }
                                ).fail( function( response ) {
                                    showError( response );
                                } );
                            }
                        }
                    };

                    // adjustments

                    /**
                     * list of available kinds
                     */
                    self._kindList = self._kindList.filter( function( item ) {
                        return -1 !== validKinds.indexOf( item.val );
                    } );

                    /**
                     * return an appropriate template-name for the provided Model
                     * @method _templatePadxAddressModel
                     * @param {Model} model
                     * @return {String}
                     * @protected
                     */
                    self._templatePadxAddressModel = function( model ) {
                        var
                            kind = model.kind();

                        switch( kind ) {
                            case 'POSTBOX':
                                return 'template-PadxAddressModel-POSTBOX';
                            default:
                                return 'template-PadxAddressModel-default';
                        }
                    };

                    /**
                     * handle reset of kind changes
                     */
                    self.addDisposable( ko.computed( function() {
                        var kind = self.kind();
                        if( -1 !== validKinds.indexOf( kind ) && kind !== lastKind ) {
                            switch( kind ) {
                                case 'OFFICIAL':
                                    // clear postbox
                                    self.postbox( undefined );
                                    break;
                                case 'POSTBOX':
                                    // clear street, houseno, & addon
                                    self.street( undefined );
                                    self.houseno( undefined );
                                    self.addon( undefined );
                                    break;
                            }
                            lastKind = kind;
                        }
                    } ) );

                    /**
                     * determines if zip auto-complete is disabled
                     */
                    self._zipAutoCompleteDisabled = ko.computed( function() {
                        return !self.countryCode();
                    } );

                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    self._zipCfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    zip = self.zip();

                                if( zip ) {
                                    return {id: zip, text: zip};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                if( $event.val && null !== Y.doccirrus.catalogmap.getCatalogZip( self.countryCode() ) ) {
                                    Y.doccirrus.jsonrpc.api.catalog.read( {
                                        query: {
                                            catalog: Y.doccirrus.catalogmap.getCatalogZip( self.countryCode() ).filename,
                                            zip: $event.val,
                                            sign: ko.utils.peekObservable( self.countryCode )
                                        },
                                        options: {
                                            limit: 1
                                        }
                                    } )
                                        .done( function( response ) {
                                            setCities( response.data );
                                            if( response.data.length && response.data[0].city ) {
                                                self.city( response.data[0].city );
                                            } else {
                                                self.city( '' );
                                            }

                                            if( response.data.length && response.data[0].regionCode ) {
                                                self.getCantonBySelectedZip( response.data[0].regionCode );
                                            } else {
                                                self.cantonWithText( {} );
                                            }

                                        } ).fail( function( response ) {
                                        showError( response );
                                    } );
                                }
                                self.zip( $event.val );
                            }
                        } ) ),
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            maximumInputLength: 10,
                            placeholder: "\u00A0",
                            query: function( query ) {

                                function done( data ) {
                                    var
                                        results = [].concat( data );

                                    if( 0 === results.length ) {
                                        results[0] = {plz: query.term};
                                    }
                                    // map to select2
                                    results = results.map( function( item ) {
                                        return {id: item.plz, text: item.plz};
                                    } );
                                    // publish results
                                    query.callback( {
                                        results: results
                                    } );
                                }

                                // handle not having a catalog
                                if( null === Y.doccirrus.catalogmap.getCatalogSDPLZ() ) {
                                    done( [] );
                                }
                                else {
                                    jQuery
                                        .ajax( {
                                            type: 'GET', xhrFields: {withCredentials: true},
                                            url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                                            data: {
                                                action: 'catsearch',
                                                catalog: Y.doccirrus.catalogmap.getCatalogSDPLZ().filename,
                                                itemsPerPage: 10,
                                                term: query.term
                                            }
                                        } )
                                        .done( done )
                                        .fail( function() {
                                            done( [] );
                                        } );
                                }

                            }
                        }
                    };

                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    self._cityCfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    city = self.city();

                                if( city ) {
                                    return {id: city, text: city};
                                }
                                else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.city( $event.val );
                            }
                        } ) ),
                        select2: {
                            allowClear: true,
                            maximumInputLength: 15,
                            data: cities,
                            createSearchChoice: function( term ) {
                                return {
                                    id: term,
                                    text: term
                                };
                            }
                        }
                    };

                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    self._countryCfgAutoComplete = {
                        data: self.addDisposable( ko.computed( function() {
                            var
                                countryCode = self.countryCode(),
                                country = self.country();

                            if( countryCode && country ) {
                                return {id: countryCode, text: country};
                            }
                            else {
                                return null;
                            }
                        } ).extend( {rateLimit: 0} ) ),
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            placeholder: "\u00A0",
                            query: function( query ) {

                                function done( data ) {
                                    var
                                        results = [].concat( data );

                                    // map to select2
                                    results = results.map( function( item ) {
                                        return {id: item.sign, text: item.country, _data: item};
                                    } );
                                    // publish results
                                    query.callback( {
                                        results: results
                                    } );
                                }

                                // handle not having a catalog
                                if( null === Y.doccirrus.catalogmap.getCatalogSDCOUNTRIES() ) {
                                    done( [] );
                                }
                                else {
                                    jQuery
                                        .ajax( {
                                            type: 'GET', xhrFields: {withCredentials: true},
                                            url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                                            data: {
                                                action: 'catsearch',
                                                catalog: Y.doccirrus.catalogmap.getCatalogSDCOUNTRIES().filename,
                                                itemsPerPage: 10,
                                                term: query.term
                                            }
                                        } )
                                        .done( done )
                                        .fail( function() {
                                            done( [] );
                                        } );
                                }

                            }
                        },
                        init: function( element ) {
                            var
                                $element = jQuery( element );

                            $element.on( 'select2-selected', function( $event ) {
                                var
                                    choiceData = $event.choice._data;

                                self.country( choiceData.country );
                                self.countryCode( choiceData.sign );
                            } );
                        }
                    };

                    self.getCantonBySelectedZip = function( cantonText ) {
                        Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.searchTarmedCantonsByCodeOrName( {
                            searchTerm: cantonText
                        } ) ).then( function( response ) {
                            var results = response.data.map( function( item ) {
                                return {
                                    id: item.code,
                                    text: item.text
                                };
                            } );
                            self.cantonWithText( results[0] );
                        } ).catch( function( err ) {
                            return Y.doccirrus.DCWindow.notice( {
                                message: Y.doccirrus.errorTable.getMessage( err )
                            } );
                        } );
                    };

                    /** validate those dependencies */
                    self.addDisposable( ko.computed( function() {
                        var
                            isInitial = ko.computedContext.isInitial();

                        self.contacts();
                        self.kind();
                        self.country();
                        self.countryCode();
                        self.zip.validate();

                        if( !isInitial ) {
                            self.revalidate();
                        }

                    } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );

                    /** validate those dependencies */
                    self.addDisposable( ko.computed( function() {
                        var
                            isInitial = ko.computedContext.isInitial();

                        self.oneClickServer();
                        self.oneClickName();
                        self.oneClickPass();

                        if( !isInitial ) {
                            self.revalidate();
                        }

                    } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );

                    // additional validation visualization for grouping
                    self.hasErrorGrouped = function( items ) {
                        return items.some( function( name ) {
                            return ko.unwrap( self[name].hasError );
                        } );
                    };

                    // animation callbacks
                    self._animateRemove = function( elem ) {
                        if( elem.nodeType === 1 ) {
                            jQuery( elem ).slideUp( function() {
                                jQuery( elem ).remove();
                            } );
                        }
                    };
                    self._animateAdd = function( elem ) {
                        if( elem.nodeType === 1 ) {
                            jQuery( elem ).hide().slideDown();
                        }
                    };

                    self.contacts().forEach( function( item ) {
                        contacts.push( KoViewModel.createViewModel( {
                            NAME: 'PadxContactsModel',
                            config: {data: item.toJSON()}
                        } ) );
                    } );
                    self.contacts( contacts );

                    self._displayParticipantValue = ko.computed( {
                        read: function() {
                            var participantValue = ko.unwrap( self.participantValue );
                            if( !participantValue ) {
                                return '';
                            }
                            return Y.doccirrus.comctl.numberToLocalString( participantValue );
                        },
                        write: function( val ) {
                            val = Y.doccirrus.comctl.localStringToNumber( val );
                            self.participantValue( val );
                        }
                    } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} );

                },
                /**
                 * Handles click on delete button - removes selected padxSetting item
                 * @method deletePadxSetting
                 * @param {Object} data
                 * @param {Object} item
                 */
                deletePadxSetting: function( data, item ) {
                    data.padxSettings.remove( function( padxSetting ) {
                        return padxSetting.clientId === item.clientId;
                    } );
                },
                /**
                 * Adds new contact item
                 * @method addContact
                 */
                addContact: function() {
                    var
                        self = this,
                        model = KoViewModel.createViewModel( {
                            NAME: 'PadxContactsModel',
                            config: {}
                        } );
                    self.contacts.push( model );
                },
                /**
                 * Adds new senderName item
                 * @method addSenderName
                 */
                addSenderName: function() {
                    var
                        self = this,
                        model = KoViewModel.createViewModel( {
                            schemaName: 'invoiceconfiguration.padxSettings.senderNameAdd',
                            config: {validatable: true, data: {name: null}}
                        } );
                    self.senderNameAdd.push( model );
                },
                /**
                 * Handles click on delete button - removes selected senderName item
                 * @method deleteSenderName
                 * @param {Object} data
                 * @param {Object} item
                 */
                deleteSenderName: function( data, item ) {
                    data.senderNameAdd.remove( function( senderName ) {
                        return senderName.clientId === item.clientId;
                    } );
                }
            },
            {
                schemaName: 'invoiceconfiguration.padxSettings',
                NAME: 'PadxSettingModel'
            } );

        KoViewModel.registerConstructor( PadxSettingModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'invoiceconfiguration-schema'
        ]
    }
);