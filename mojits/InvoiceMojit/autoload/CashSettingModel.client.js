/*jslint anon:true, nomen:true*/
/*global YUI, ko*/

'use strict';

YUI.add( 'CashSettingModel', function( Y/*, NAME*/ ) {

        /**
         * @module CashSettingModel
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
         * @class CashSettingModel
         * @constructor
         * @param {Object} config
         * @extends KoViewModel
         */
        function CashSettingModel( config ) {
            CashSettingModel.superclass.constructor.call( this, config );
        }

        CashSettingModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( CashSettingModel, KoViewModel.getBase(), {
                initializer: function DeliverySettingsModel_initializer() {
                    var
                        self = this;

                    self.cid = ++cid;

                    self.buttonDeleteTextI18n = i18n( 'general.button.DELETE' );
                    self.physiciansI18n = i18n( 'invoiceconfiguration-schema.PadxSetting_T.physicians' );
                    self.locationsI18n = i18n( 'invoiceconfiguration-schema.PadxSetting_T.locations' );

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


                },
                /**
                 * Handles click on delete button - removes selected cashSetting item
                 * @method deleteCashSetting
                 * @param {Object} data - an instance of general InvoiceConfigurationModel
                 * @param {Object} item - an instance of CashSettingModel which we are trying to delete
                 */
                deleteCashSetting: function( data, item ) {
                    data.cashSettings.remove( function( cashSetting ) {
                        return cashSetting.clientId === item.clientId;
                    } );
                }
            },
            {
                schemaName: 'invoiceconfiguration.cashSettings',
                NAME: 'CashSettingModel'
            } );

        KoViewModel.registerConstructor( CashSettingModel );

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