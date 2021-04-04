/*
 @author: mp
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery */

'use strict';

YUI.add( 'dcaddressmodel', function( Y ) {

        var AddressModel;

        AddressModel = function AddressModel( address ) {
            var
                self = this,
                cities = [];
            function setCities( data ) {
                cities.length = 0;
                data.forEach( function( cityData ) {
                    cities.push( {id: cityData.city, text: cityData.city} );
                } );
            }

            self.cantonWithText = self.cantonWithText || ko.observable();
            self._modelName = 'AddressModel';
            Y.doccirrus.uam.ViewModel.call( self );
            Y.doccirrus.uam.SubViewModel.call( self, address );

            self._runBoilerplate( address );

            /**
             * list of available kinds determined by parent model
             * @type ko.computed
             * @returns {Array}
             */
            self._availableKindList = ko.computed( function() {
                var
                    resultList = [].concat( self._parent._possibleAddressKindList() ),
                    kind = self.kind(),
                    list = self._kindList;

                // although address kind might not be available we need it in the current list to have it selected
                if( !self._parent._isAddressesKindAvailable( kind ) ) {
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

                return resultList;
            } );

            /**
             * determines if zip auto-complete is disabled
             */
            self._zipAutoCompleteDisabled = ko.computed(function(){
                return !self.countryCode();
            });

            /**
             * @see ko.bindingHandlers.select2
             * @type {Object}
             * @private
             */
            self._zipCfgAutoComplete = {
                data: self._addDisposable( ko.computed( {
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
                            Y.doccirrus.jsonrpc.api.catalog.read({
                                query: {
                                    catalog: Y.doccirrus.catalogmap.getCatalogZip( self.countryCode() ).filename,
                                    zip: $event.val,
                                    sign: ko.utils.peekObservable( self.countryCode )
                                },
                                options: {
                                    limit: 1
                                }
                            })
                                .done( function(response) {
                                    setCities( response.data );
                                    if( response.data.length && response.data[0].city ) {
                                        jQuery('#cityCfgAutoComplete' ).select2('open');
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
                data: self._addDisposable( ko.computed( {
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
                    createSearchChoice: function( term ){
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
                data: self._addDisposable( ko.computed( function() {
                    var
                        countryCode = self.countryCode(),
                        country = self.country();

                    if( countryCode && country ) {
                        return {id: countryCode, text: country};
                    }
                    else {
                        return null;
                    }
                } ).extend( { rateLimit: 0 } ) ),
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

            self._onZipBlur = function() {

                var params,
                    currentPatient = Y.doccirrus.uam.loadhelper.get( 'currentPatient' ),
                    // MOJ-14319: [OK] [CARDREAD]
                    publicInsurance = currentPatient.getMainPublicInsurance(),
                    hasCardSwiped = currentPatient._hasCardSwiped(),
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

                        Y.doccirrus.jsonrpc.api.catalog.catsearch(params).done( done );

                    }
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

            /**
             * validate those dependencies
             */
            self._addDisposable( ko.computed( function() {
                self.country();
                self.countryCode();
                self.zip.validate();
            } ).extend({ rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT }) );

        };

        Y.namespace( 'doccirrus.uam' ).AddressModel = AddressModel;
    },
    '0.0.1', {requires: [ 'dcviewmodel' ] }
);