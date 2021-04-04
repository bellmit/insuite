/**
 * User: do
 * Date: 27/07/17  17:44
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DeliverySettingsModel', function( Y, NAME ) {

        /**
         * @module DeliverySettingsModel
         */

        var
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,

            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel; // 5min

        function DeliverySettingsModel( config ) {
            DeliverySettingsModel.superclass.constructor.call( this, config );
        }

        DeliverySettingsModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( DeliverySettingsModel, KoViewModel.getBase(), {
                initializer: function DeliverySettingsModel_initializer() {
                    var
                        self = this,
                        kvcAccounts = self.initialConfig.kvcAccounts;

                    self.kvcaEntry = ko.observable( null );

                    self.labelDestinationI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.DESTINATION' );
                    self.labelKVTextI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.KV' );
                    self.labelAddressTextI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.ADDRESS' );
                    self.labelFunctionsTextI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.FUNCTIONS' );

                    self.kvcAccountAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var kvcUsername = unwrap( self.kvcUsername );
                                if( !kvcUsername ) {
                                    return null;
                                }
                                return {
                                    id: kvcUsername,
                                    text: kvcUsername
                                };
                            },
                            write: function( $event ) {
                                var data = $event && $event.added;
                                self.kvcUsername( data && data.id || null );
                            }
                        } ) ),
                        select2: {
                            dropdownAutoWidth: true,
                            data: kvcAccounts.map( self.kvcAccountSelect2Mapper )
                        }
                    };

                    self.locationAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var mainLocationId = unwrap( self.mainLocationId ),
                                    locname = unwrap( self.locname ),
                                    kv = unwrap( self.kv ),
                                    commercialNo = unwrap( self.commercialNo );
                                if( !mainLocationId ) {
                                    return null;
                                }
                                return {
                                    id: mainLocationId,
                                    text: locname,
                                    data: {_id: mainLocationId, locname: locname, kv: kv, commercialNo: commercialNo}
                                };
                            },
                            write: function( $event ) {
                                var data = $event && $event.added;
                                self.mainLocationId( data && data.id || null );
                                self.locname( data && data.data && data.data.locname || null );
                                self.kv( data && data.data && data.data.kv || null );
                                self.commercialNo( data && data.data && data.data.commercialNo || null );
                            }
                        } ) ),
                        select2: {
                            allowClear: false,
                            dropdownAutoWidth: true,
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.gkv_deliverysettings.getUnusedLocations( {
                                    deliverySettingId: peek( self._id ),
                                    query: {
                                        $or: [
                                            {mainLocationId: null},
                                            {mainLocationId: ''}
                                        ],
                                        $and: [
                                            {commercialNo: {$ne: null}},
                                            {commercialNo: {$ne: ''}}
                                        ],
                                        kv: {$ne: null},
                                        locname: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    }
                                } ).done( function( response ) {

                                    var data = response.data;
                                    query.callback( {
                                        results: data.map( self.locationSelect2Mapper )
                                    } );
                                } );
                            }
                        }
                    };

                    self.addDisposable( ko.computed( function() {
                        self.deliveryType();
                        self.kvPortalUrl.validate();
                        self.kvcUsername.validate();
                    } ) );

                    self.manualFieldsDisabled = ko.computed( function() {
                        return 'MANUAL' !== self.deliveryType();
                    } );

                    self.addDisposable( ko.computed( function() {
                        var kv = self.kv();
                        Y.doccirrus.jsonrpc.api.gkv_deliverysettings.getKvcaEntry( {
                            kv: kv
                        } ).done( function( response ) {
                            self.kvcaEntry( response && response.data || null );
                        } ).fail( function( err ) {
                            Y.log( 'could not get kvca entry ' + err, 'error', NAME );
                            self.kvcaEntry( null );
                        } );
                    } ).extend( {rateLimit: {timeout: 2000, method: "notifyWhenChangesStop"}} ) );

                    self.usernameHelpText = ko.observable();

                    self.errorMessages = ko.observableArray();

                    self.addDisposable( ko.computed( function() {
                        var mainLocationId = self.mainLocationId();
                        if( mainLocationId ) {
                            kvcAccounts.some( function( kvcAccount ) {
                                if( -1 < kvcAccount.locationIds.indexOf( mainLocationId ) ) {
                                    self.kvcUsername( kvcAccount.username );
                                    return true;
                                }
                            } );
                        }
                    } ) );

                },
                locationSelect2Mapper: function( location ) {
                    return {id: location._id, text: location.locname, data: location, disabled: location._alreadyUsed};
                },
                kvcAccountSelect2Mapper: function( kvcaccount ) {
                    return {id: kvcaccount.username, text: kvcaccount.username};
                },
                destructor: function DeliverySettingsModel_destructor() {
                    var
                        self = this;
                    if( self.kvConnectClientPollingInterval ) {
                        window.clearInterval( self.kvConnectClientPollingInterval );
                    }
                }
            },
            {
                schemaName: 'gkv_deliverysettings',
                NAME: 'DeliverySettingsModel'
            } );

        KoViewModel.registerConstructor( DeliverySettingsModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'gkv_deliverysettings-schema'
        ]
    }
);