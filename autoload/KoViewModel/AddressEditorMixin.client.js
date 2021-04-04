/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery */
YUI.add( 'AddressEditorMixin', function( Y/*, NAME*/ ) {
        'use strict';
        /**
         * @module AddressEditorMixin
         */

        var
        // unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            ignoreDependencies = ko.ignoreDependencies,

            KoViewModel = Y.doccirrus.KoViewModel,
            AddressModel = KoViewModel.getConstructor( 'AddressModel' );

        // mixAvailableKindList
        (function() {
            var
                mixin = {
                    /**
                     * list of available kinds determined by parent model
                     * @type ko.computed
                     * @returns {Array}
                     */
                    _availableKindList: null,
                    initEditAvailableKindList: function() {
                        var self = this;

                        self._availableKindList = ko.computed( function() {
                            var
                                resultList = [].concat( self.get( 'editorModelParent' ).possibleAddressKindList() ),
                                kind = self.kind();

                            return ignoreDependencies( function() {
                                var
                                    list = peek( self.kind.list );
                                // although address kind might not be available we need it in the current list to have it selected
                                if( !self.get( 'editorModelParent' ).isAddressesKindAvailable( kind ) ) {
                                    if( 'POSTBOX' === kind ) {
                                        resultList.unshift( Y.Array.find( list, function( item ) {
                                            return item.val === kind;
                                        } ) );
                                    }
                                    if( 'OFFICIAL' === kind ) {
                                        resultList.unshift( Y.Array.find( list, function( item ) {
                                            return item.val === kind;
                                        } ) );
                                    }
                                }
                                // MOJ-5630: do not display types if they are not allowed
                                if( 'OFFICIAL' === kind || 'POSTBOX' === kind ) {
                                    resultList = Y.Array.filter( resultList, function( item ) {
                                        return ['OFFICIAL', 'POSTBOX'].indexOf( item.val ) > -1;
                                    } );
                                }

                                return resultList;
                            } );
                        } );
                    }
                };

            /**
             * @method mixAvailableKindList
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            AddressModel.mixAvailableKindList = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

    // mixDefaultReceiverValue
        (function() {
            var
                mixin = {
                    initEditReceiver: function() {
                        var self = this,
                            editorModelParent = self.get( 'editorModelParent' ),
                            dataModelParent = self.get( 'dataModelParent' );

                        self.addDisposable(
                            ko.computed( function() {
                                var isNew = dataModelParent.isNew(),
                                    kind = ko.unwrap( dataModelParent.kind );

                                if( 'BILLING' === kind && isNew ) {
                                    editorModelParent.setDefaultBillingReceiverValue( self );
                                }

                            } ).extend( {rateLimit: 0} )
                        );

                    }
                };

            /**
             * @method mixDefaultReceiverValue
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            AddressModel.mixDefaultReceiverValue = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixCities
        (function() {
            var
                mixin = {
                    initEditCities: function() {
                        var self = this;

                        if( !self.cities ) {
                            self.cities = [];
                        }
                    }
                };

            /**
             * @method mixCities
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            AddressModel.mixCities = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixZip
        (function() {
            var
                mixin = {
                    _zipAutoCompleteDisabled: null,
                    _zipCfgAutoComplete: null,
                    _onZipBlur: null,
                    initEditZip: function() {
                        var self = this,
                            cities = self.cities;

                        function setCities( data ) {
                            cities.length = 0;
                            data.forEach( function( cityData ) {
                                cities.push( {id: cityData.city, text: cityData.city} );
                            } );
                        }

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

                        self._onZipBlur = function() {

                            var params,
                                currentPatient = peek( self.get( 'currentPatient' ) ),
                                // MOJ-14319: [OK] [CARDREAD]
                                publicInsurance = currentPatient.getMainPublicInsurance(),
                                hasCardSwiped = currentPatient.hasCardSwiped(),
                                catalog = Y.doccirrus.catalogmap.getCatalogSDPLZ();

                            function done( response ) {
                                var
                                    result = response.data,
                                    mid = self._id + 'zip-warning';
                                if( !result || !result.length ) {
                                    // remove invalid zip message, if there is one for this vm
                                    Y.doccirrus.DCSystemMessages.removeMessage( mid );
                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        messageId: mid,
                                        content: 'Vorliegende PLZ des Patienten existiert nicht in PLZ-Stammdatei und muss geändert werden.',
                                        level: 'WARNING'
                                    } );
                                } else {
                                    Y.doccirrus.DCSystemMessages.removeMessage( mid );
                                }
                            }

                            // handle not having a catalog
                            if( null === catalog ) {
                                done( {data: []} );
                            }
                            else {
                                if( !hasCardSwiped && publicInsurance && '00' === publicInsurance.costCarrierBillingSection.peek() ) {
                                    params = {
                                        exactMatch: true,
                                        term: self.zip(),
                                        catalog: catalog.filename
                                    };

                                    Y.doccirrus.jsonrpc.api.catalog.catsearch( params ).done( done );

                                }
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

                        // TODO: should be part of dataModel? ([Improvement] MOJ-5545: older viewModel approach conflicts with newer dataModel approach)
                        self.addDisposable( ko.computed( function() {
                            self.country();
                            self.countryCode();
                            self.zip.validate();
                        } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );
                    }
                };

            /**
             * @method mixZip
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            AddressModel.mixZip = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixCity
        (function() {
            var
                mixin = {
                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    _cityCfgAutoComplete: null,
                    initEditCity: function() {
                        var self = this;
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
                            placeholder: ko.observable( "\u00A0" ),
                            select2: {
                                allowClear: true,
                                maximumInputLength: 30,
                                data: self.cities,
                                createSearchChoice: function( term ) {
                                    return {
                                        id: term,
                                        text: term
                                    };
                                }
                            }
                        };
                    }
                };

            /**
             * @method mixCity
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            AddressModel.mixCity = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixCountry
        (function() {
            var
                mixin = {
                    _countryCfgAutoComplete: null,
                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    initEditCountry: function() {
                        var self = this;

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
                    }
                };

            /**
             * @method mixCountry
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            AddressModel.mixCountry = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixRemoveItem
        (function() {
            var
                mixin = {
                    removeItem: function() {
                        var
                            self = this,
                            dataModelParent = self.get( 'dataModelParent' ),
                            currentPatient = peek( self.get( 'currentPatient' ) );

                        currentPatient.addresses.remove( dataModelParent );
                        // make active last added address
                        jQuery( '.address-tabs li.component-tab' ).first().addClass( "active" );
                        jQuery( '.address-tabs div.component-content' ).first().addClass( "active" );
                    }
                };

            /**
             * @method mixRemoveItem
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            AddressModel.mixRemoveItem = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

    },
    '0.0.1',
    {
        requires: [
            'KoViewModel',
            'AddressModel',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'dccatalogmap',
            'dcinfrastructs',
            'DCSystemMessages'
        ]
    }
);