/**
 * User: pi
 * Date: 22/05/15  16:18
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery */

'use strict';

YUI.add( 'AddressModel', function( Y/*, NAME */ ) {
        /**
         * @module AddressModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            PLEASE_SELECT = i18n( 'general.message.PLEASE_SELECT' ),
            cities = [],
            peek = ko.utils.peekObservable;


        function setCities( data ) {
            cities.length = 0;
            data.forEach( function( cityData ) {
                cities.push( {id: cityData.city, text: cityData.city} );
            } );
        }

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class AddressModel
         * @constructor
         * @extends KoViewModel
         */
        function AddressModel( config ) {
            AddressModel.superclass.constructor.call( this, config );
        }

        AddressModel.ATTRS = {
            /**
             * @attribute availableKindList
             * @type {Array}
             * @default Y.doccirrus.schemas.person.types.AddressKind_E.list
             */
            availableKindList: {
                value: Y.doccirrus.schemas.person.types.AddressKind_E.list,
                lazyAdd: false
            },

            useSelect2CountryCode: {
                /**
                 * Determines if a select2-binding config for "country" should be initialised
                 * @attribute useSelect2CountryCode
                 * @type {boolean}
                 * @default false
                 */
                value: false,
                lazyAdd: false
            },

            select2CountryCodeConfig: {
                /**
                 * Function which should return an appropriate select2-binding config for "country"
                 * @attribute select2CountryCodeConfig
                 * @type {function}
                 * @see ko.bindingHandlers.select2
                 */
                value: function() {
                    var
                        self = this;

                    return {
                        data: self.addDisposable( ko.computed( {
                            read: self.select2CountryCodeComputedRead,
                            write: self.select2CountryCodeComputedWrite
                        }, self ).extend( {rateLimit: 0} ) ),
                        select2: {
                            minimumInputLength: 1,
                            width: '100%',
                            placeholder: PLEASE_SELECT,
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
                            jQuery( element ).on( 'select2-selected', function( $event ) {
                                self.select2CountryCodeOnSelect( $event );
                            } );
                        }
                    };
                }
            },

            useSelect2Zip: {
                /**
                 * Determines if a select2-binding config for "zip" should be initialised
                 * @attribute useSelect2Zip
                 * @type {boolean}
                 * @default false
                 */
                value: false,
                lazyAdd: false
            },

            select2ZipConfig: {
                /**
                 * Function which should return an appropriate select2-binding config for "zip"
                 * @attribute select2ZipConfig
                 * @type {function}
                 * @see ko.bindingHandlers.select2
                 */
                value: function() {
                    var
                        self = this;

                    return {
                        data: self.addDisposable( ko.computed( {
                            read: self.select2ZipComputedRead,
                            write: self.select2ZipComputedWrite
                        }, self ) ),
                        placeholder: ko.observable( "\u00A0" ),
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            maximumInputLength: 10,
                            query: function( query ) {
                                var
                                    code = self.countryCode();
                                function done( data ) {
                                    var
                                        results = [].concat( data );

                                    if( 0 === results.length ) {
                                        if( 'D' !== code ) {
                                            results[0] = {zip: query.term};
                                        } else {
                                            results[0] = {plz: query.term};
                                        }
                                    }
                                    // map to select2
                                    results = results.map( function( item ) {
                                        if( 'D' !== code ) {
                                            return {id: item.zip, text: item.zip};
                                        } else {
                                            return {id: item.plz, text: item.plz};
                                        }
                                    } );
                                    // publish results
                                    query.callback( {
                                        results: results
                                    } );
                                }

                                // handle not having a catalog
                                if( ( 'D' !== code && null === Y.doccirrus.catalogmap.getCatalogZip( code ) ) ||
                                    ( 'D' === code && null === Y.doccirrus.catalogmap.getCatalogSDPLZ() ) ) {
                                    done( [] );
                                }
                                else {
                                    jQuery
                                        .ajax( {
                                            type: 'GET', xhrFields: {withCredentials: true},
                                            url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                                            data: {
                                                action: 'catsearch',
                                                catalog: 'D' !== code ? Y.doccirrus.catalogmap.getCatalogZip( code ).filename: Y.doccirrus.catalogmap.getCatalogSDPLZ().filename,
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
                            jQuery( element ).on( 'select2-selected', function( $event ) {
                                self.select2ZipOnSelect( $event );
                            } );
                        }
                    };
                }
            },

            useSelect2City: {
                /**
                 * Determines if a select2-binding config for "city" should be initialised
                 * @attribute useSelect2City
                 * @type {boolean}
                 * @default false
                 */
                value: false,
                lazyAdd: false
            },

            select2CityConfig: {
                /**
                 * Function which should return an appropriate select2-binding config for "city"
                 * @attribute select2CityConfig
                 * @type {function}
                 * @see ko.bindingHandlers.select2
                 */
                value: function() {
                    var
                        self = this;

                    return {
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
                        placeholder: ko.observable( "\u00A0" ),
                        select2: {
                            allowClear: true,
                            maximumInputLength: 30,
                            data: function() {
                                return {
                                    results: self.get( '_cities' ).map( function( cityData ) {
                                        return {id: cityData.city, text: cityData.city};
                                    } )
                                };
                            },
                            createSearchChoice: function( term ) {
                                return {
                                    id: term,
                                    text: term
                                };
                            }
                        }
                    };
                }
            },

            _cities: {
                value: [],
                validator: Array.isArray,
                cloneDefaultValue: true,
                lazyAdd: false
            }

        };
        Y.extend( AddressModel, KoViewModel.getBase(), {
            initializer: function AddressModel_initializer() {
                var self = this;
                self.initAddress();
            },
            destructor: function AddressModel_destructor() {
            },
            /**
             * @property availableKindList
             * @type {Array}
             */
            availableKindList: null,
            /**
             * @property showDeleteButton
             * @type {ko.observable}
             */
            showDeleteButton: null,
            /**
             * @property showPostBox
             * @type {ko.computed}
             */
            showPostBox: null,
            /**
             * kind select2 auto complete configuration
             * @property select2Kind
             * @type {Object}
             */
            select2Kind: null,
            /**
             * initializes kind select2 autocompleter
             * @method initSelect2Kind
             */
            initSelect2Kind: function AddressModel_initSelect2Kind() {
                var self = this;
                self.select2Kind = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var kind = ko.unwrap( self.kind );
                            return kind;
                        },
                        write: function( $event ) {
                            self.kind( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        placeholder: PLEASE_SELECT,
                        data: (function() {
                            return self.availableKindList.map( function( kind ) {
                                return {
                                    id: kind.val,
                                    text: kind.i18n
                                };
                            } );
                        })()
                    }
                };
            },
            /**
             * Read computed handler of select2-binding config for "country"
             * @method select2CountryCodeComputedRead
             * @protected
             */
            select2CountryCodeComputedRead: function AddressModel_select2CountryCodeComputedRead() {
                var
                    self = this,
                    countryCode = ko.unwrap( self.countryCode ),
                    country = ko.unwrap( self.country );

                if( countryCode && country ) {
                    return {id: countryCode, text: country};
                }
                else {
                    return null;
                }
            },
            /**
             * Write computed handler of select2-binding config for "country"
             * @method select2CountryCodeComputedWrite
             * @param {object} $event
             * @protected
             */
            select2CountryCodeComputedWrite: function AddressModel_select2CountryCodeComputedWrite( $event ) {
                var
                    self = this,
                    choice;

                if( $event.added && $event.added._data ) {

                    choice = $event.added._data;

                    self.countryCode( choice.sign );
                    self.country( choice.country );

                }

                if( !$event.added && $event.removed ) {

                    self.countryCode( '' );
                    self.country( '' );

                }

            },
            /**
             * Callback for the select2 event "select2-selected"
             * @param $event
             */
            select2CountryCodeOnSelect: function AddressModel_select2CountryCodeOnSelect( /*$event*/ ) {

            },
            /**
             * May hold select2-binding config for "country"
             */
            select2CountryCode: null,
            /**
             * Initialises select2-binding config for "country"
             * @method initSelect2CountryCode
             * @param {boolean} mode determines initialisation
             * @protected
             */
            initSelect2CountryCode: function AddressModel_initSelect2CountryCode( mode ) {
                var
                    self = this,
                    select2CountryCodeConfig;

                if( !mode ) {
                    return;
                }

                select2CountryCodeConfig = self.get( 'select2CountryCodeConfig' );

                self.select2CountryCode = select2CountryCodeConfig.call( this );
            },
            /**
             * Read computed handler of select2-binding config for "zip"
             * @method select2ZipComputedRead
             * @protected
             */
            select2ZipComputedRead: function AddressModel_select2ZipComputedRead() {
                var
                    self = this,
                    zip = self.zip();

                if( zip ) {
                    return {id: zip, text: zip};
                }
                else {
                    return null;
                }
            },
            /**
             * Write computed handler of select2-binding config for "zip"
             * @method select2ZipComputedWrite
             * @param {object} $event
             * @protected
             */
            select2ZipComputedWrite: function AddressModel_select2ZipComputedWrite( $event ) {
                var
                    self = this,
                    catalogZip;
                if( self.get( 'useSelect2City' ) ) {
                    catalogZip = Y.doccirrus.catalogmap.getCatalogZip();
                    if( $event.val && null !== catalogZip ) {
                        Y.doccirrus.jsonrpc.api.catalog.read( {
                            query: {
                                catalog: catalogZip.filename,
                                zip: $event.val,
                                sign: ko.utils.peekObservable( self.countryCode )
                            },
                            options: {
                                limit: 1
                            }
                        } )
                            .done( function( response ) {
                                self.set( '_cities', response.data );
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

                            } );
                    }
                }

                self.zip( $event.val );
            },
            /**
             * Callback for the select2 event "select2-selected"
             * @param $event
             */
            select2ZipOnSelect: function AddressModel_select2ZipOnSelect( /*$event*/ ) {

            },
            /**
             * May hold select2-binding config for "zip"
             * @type {null|object}
             */
            select2Zip: null,
            /**
             * determines if zip auto-complete is disabled
             * @type {null|ko.computed}
             */
            select2ZipDisabled: null,
            /**
             * Read computed handler of select2-binding config for "zip" when should be disabled
             * @method select2ZipComputedRead
             * @protected
             */
            select2ZipDisabledComputedRead: function AddressModel_select2ZipDisabledComputedRead() {
                var
                    self = this;

                return !self.countryCode();
            },
            /**
             * Initialises select2-binding config for "zip"
             * @method initSelect2Zip
             * @param {boolean} mode determines initialisation
             * @protected
             */
            initSelect2Zip: function AddressModel_initSelect2Zip( mode ) {
                var
                    self = this,
                    select2ZipConfig;

                if( !mode ) {
                    return;
                }

                self.cantonWithText = self.cantonWithText || ko.observable();
                select2ZipConfig = self.get( 'select2ZipConfig' );

                self.select2ZipDisabled = ko.computed( self.select2ZipDisabledComputedRead, self );
                self.select2Zip = select2ZipConfig.call( this );
            },
            select2City: null,
            /**
             * Initialises select2-binding config for "city"
             * @method initSelect2City
             * @param {boolean} mode determines initialisation
             * @protected
             */
            initSelect2City: function AddressModel_initSelect2City( mode ) {
                var
                    self = this,
                    select2CityConfig;

                if( !mode ) {
                    return;
                }

                select2CityConfig = self.get( 'select2CityConfig' );

                self.select2City = select2CityConfig.call( this );
            },
            /**
             * Computes "showPostBox"
             * @return {boolean}
             */
            showPostBoxComputedRead: function AddressModel_showPostBoxComputedRead() {
                var self = this,
                    kind = self.kind();
                return 'POSTBOX' === kind;
            },
            /**
             * Handle write of "showPostBox" computed
             * @param {*} value
             */
            showPostBoxComputedWrite: function AddressModel_showPostBoxComputedWrite( /*value*/ ) {
            },
            /**
             * initializes address model
             */
            initAddress: function AddressModel_initAddress() {
                var self = this;

                self.buttonDeleteI18n = i18n('general.button.DELETE');
                self.addressPostboxI18n = i18n( 'person-schema.Address_T.postbox' );
                self.showDeleteButton = ko.observable( true );
                self.availableKindList = self.get( 'availableKindList' );
                self.initSelect2Kind();
                self.initSelect2CountryCode( self.get( 'useSelect2CountryCode' ) );
                self.initSelect2Zip( self.get( 'useSelect2Zip' ) );
                self.initSelect2City( self.get( 'useSelect2City' ) );

                self.showPostBox = ko.computed( {
                    read: self.showPostBoxComputedRead,
                    write: self.showPostBoxComputedWrite
                }, self );

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
                                            jQuery( '#cityCfgAutoComplete' ).select2( 'open' );
                                            self.city( response.data[0].city );
                                        } else {
                                            self.city( '' );
                                        }

                                        if( response.data.length && response.data[0].regionCode ) {
                                            self.getCantonBySelectedZip( response.data[0].regionCode );
                                        } else {
                                            if( self.cantonWithText ) {
                                                self.cantonWithText( {} );
                                            }
                                        }

                                    } );
                            }
                            self.zip( $event.val );
                        }
                    } ) ),
                    placeholder: ko.observable( "\u00A0" ),
                    select2: {
                        minimumInputLength: 1,
                        allowClear: true,
                        maximumInputLength: 10,
                        query: function( query ) {
                            var
                                code = self.countryCode();
                            function done( data ) {
                                var
                                    results = [].concat( data );

                                if( 0 === results.length ) {
                                    if( 'D' !== code ) {
                                        results[0] = {zip: query.term};
                                    } else {
                                        results[0] = {plz: query.term};
                                    }
                                }
                                // map to select2
                                results = results.map( function( item ) {
                                    if( 'D' !== code ) {
                                        return {id: item.zip, text: item.zip};
                                    } else {
                                        return {id: item.plz, text: item.plz};
                                    }
                                } );
                                // publish results
                                query.callback( {
                                    results: results
                                } );
                            }

                            // handle not having a catalog
                            if( ( 'D' !== code && null === Y.doccirrus.catalogmap.getCatalogZip( code ) ) ||
                                ( 'D' === code && null === Y.doccirrus.catalogmap.getCatalogSDPLZ() ) ) {
                                done( [] );
                            }
                            else {
                                jQuery
                                    .ajax( {
                                        type: 'GET', xhrFields: {withCredentials: true},
                                        url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                                        data: {
                                            action: 'catsearch',
                                            catalog: 'D' !== code ? Y.doccirrus.catalogmap.getCatalogZip( code ).filename: Y.doccirrus.catalogmap.getCatalogSDPLZ().filename,
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

                        $element.on( 'select2-blur', self._onZipBlur );
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
                    placeholder: ko.observable( "\u00A0" ),
                    select2: {
                        minimumInputLength: 1,
                        allowClear: true,
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
                    var isSwiss = false;
                    if( peek( self.countryCode ) === 'CH' ) {
                        isSwiss = true;
                    }
                    Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.searchTarmedCantonsByCodeOrName( {
                        searchTerm: cantonText,
                        isSwiss: isSwiss
                    } ) ).then( function( response ) {
                        var results = response.data.map( function( item ) {
                            return {
                                id: item.code,
                                text: item.text
                            };
                        } );
                        self.cantonWithText( results[0] );
                        self.cantonCode( results[0] && results[0].id || null );
                    } ).catch( function( err ) {
                        return Y.doccirrus.DCWindow.notice( {
                            message: Y.doccirrus.errorTable.getMessage( err )
                        } );
                    } );
                };
            },
            /**
             *  Export this address as a string for forms, etc
             */
            toString: function() {
                var
                    self = this,
                    addon = ko.unwrap( self.addon );

                return '' +
                    ( addon ? addon + '\n' : '') +
                    ko.unwrap( self.street ) + ' ' +
                    ko.unwrap( self.houseno ) + '\n' +
                    ko.unwrap( self.zip ) + ' ' +
                    ko.unwrap( self.city );
            }

        }, {
            schemaName: 'address',
            NAME: 'AddressModel'
        } );
        KoViewModel.registerConstructor( AddressModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'person-schema'
        ]
    }
);