/**
 * User: oliversieweke
 * Date: 24.01.19  17:14
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko, jQuery */

'use strict';
YUI.add( 'AddressModel_CH', function( Y/*, NAME */ ) {
        /**
         * @module AddressModel_CH
         */

        var KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            PLEASE_SELECT = i18n( 'general.message.PLEASE_SELECT' );

        /**
         * @class AddressModel_CH
         * @constructor
         * @extends KoViewModel
         */
        function AddressModel_CH( config ) {
            AddressModel_CH.superclass.constructor.call( this, config );
        }

        AddressModel_CH.ATTRS = {
            useSelect2CantonCode: {
                /**
                 * Determines if a select2-binding config for "cantonCode" should be initialised
                 * @attribute useSelect2CantonCode
                 * @type {boolean}
                 * @default false
                 */
                value: false,
                lazyAdd: false
            },
            select2CantonCodeConfig: {
                /**
                 * Function which should return an appropriate select2-binding config for "cantonCode"
                 * @attribute select2CantonCodeConfig
                 * @type {function}
                 * @see ko.bindingHandlers.select2
                 */
                value: function select2CantonCodeConfig() {
                    var self = this;

                    self.cantonWithText = self.cantonWithText || ko.observable();

                    if( ko.unwrap( self.cantonCode ) ) {
                        Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.getTarmedCantonsByCode( {
                            code: ko.unwrap( self.cantonCode ),
                            options: {
                                limit: 1
                            }
                        } ) ).then( function( response ) {
                            var entry = response && response.data && response.data[0];
                            var text = entry && entry.text || ko.unwrap( self.cantonCode );

                            self.cantonWithText( {
                                id: ko.unwrap( self.cantonCode ),
                                text: text
                            } );

                            if( !entry || !entry.text ) { // No text was found (text defaulted to the code)
                                throw new Y.doccirrus.commonerrors.DCError( 'canton_01' );
                            }
                        } )
                            .catch( function( err ) {
                                self.cantonWithText( {
                                    id: ko.unwrap( self.cantonCode ),
                                    text: ko.unwrap( self.cantonCode ) // default text to code
                                } );

                                return Y.doccirrus.DCWindow.notice( {
                                    message: Y.doccirrus.errorTable.getMessage( err )
                                } );
                            } );
                    }

                    return {
                        data: self.addDisposable( ko.computed( {
                            read: self.select2CantonCodeComputedRead,
                            write: self.select2CantonCodeComputedWrite
                        }, self ) ),
                        select2: {
                            width: '100%',
                            placeholder: PLEASE_SELECT,
                            query: function( search ) {
                                Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.searchTarmedCantonsByCodeOrName( {
                                    searchTerm: search.term
                                } ) ).then( function( response ) {
                                    var results = response.data.map( function( item ) {
                                        return {
                                            id: item.code,
                                            text: item.text
                                        };
                                    } );
                                    search.callback( {results: results} );
                                } ).catch( function( err ) {
                                    return Y.doccirrus.DCWindow.notice( {
                                        message: Y.doccirrus.errorTable.getMessage( err )
                                    } );
                                } );
                            },
                            formatSelection: function( result ) {
                                return result.text;
                            },
                            allowClear: true,
                            init: function( element ) {
                                jQuery( element ).on( 'select2-selected', function( $event ) {
                                    self.select2CantonCodeOnSelect( $event );
                                } );
                            }
                        }
                    };
                }
            }
        };

        Y.extend( AddressModel_CH, KoViewModel.getBase(), {
            initializer: function AddressModel_CH_initializer() {
                var self = this;
                self.initAddress();
            },
            destructor: function AddressModel_CH_destructor() {},
            initAddress: function AddressModelCH_initAddress() {
                var self = this;
                self.initSelect2CantonCode( self.get( 'useSelect2CantonCode' ) );
            },

            /**
             * Read computed handler of select2-binding config for "cantonCode"
             * @method select2CantonCodeComputedRead
             * @protected
             */
            select2CantonCodeComputedRead: function AddressModel_CH_select2CantonCodeComputedRead() {
                // no canton if country not CH
                if( this.countryCode && 'CH' !== ko.unwrap( this.countryCode ) ) {
                    this.cantonWithText( null );
                }
                return ko.unwrap( this.cantonWithText );
            },
            /**
             * Write computed handler of select2-binding config for "cantonCode"
             * @method select2CantonCodeComputedWrite
             * @param {object} $event
             * @protected
             */
            select2CantonCodeComputedWrite: function AddressModel_CH_select2CantonCodeComputedWrite( $event ) {
                var self = this;

                self.cantonCode( $event.val );
                if( $event.added ) {
                    self.cantonWithText( $event.added );
                } else {
                  if( $event.removed ) {
                    self.cantonWithText( null );
                  }
                }

            },
            /**
             * Callback for the select2 event "select2-selected"
             * @param $event
             */
            select2CantonCodeOnSelect: function AddressModel_CH_select2CantonCodeOnSelect( /*$event*/ ) {},
            /**
             * May hold select2-binding config for "cantonCode"
             */
            select2CantonCode: null,
            /**
             * Initialises select2-binding config for "cantonCode"
             * @method initSelect2CantonCode
             * @param {boolean} mode determines initialisation
             * @protected
             */
            initSelect2CantonCode: function AddressModel_CH_initSelect2CantonCode( mode ) {
                var self = this;
                var select2CantonCodeConfig;

                if( !mode ) {
                    return;
                }

                select2CantonCodeConfig = self.get( 'select2CantonCodeConfig' );

                self.select2CantonCode = select2CantonCodeConfig.call( this );
            }
        }, {
            NAME: 'AddressModel_CH'
        } );

        KoViewModel.registerConstructor( AddressModel_CH );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'doccirrus'
        ]
    }
);