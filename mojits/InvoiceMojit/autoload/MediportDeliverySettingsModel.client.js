/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'MediportDeliverySettingsModel', function( Y /*NAME*/ ) {

        /**
         * @module MediportDeliverySettingsModel
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel;

        function MediportDeliverySettingsModel( config ) {
            MediportDeliverySettingsModel.superclass.constructor.call( this, config );
        }

        MediportDeliverySettingsModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( MediportDeliverySettingsModel, KoViewModel.getBase(), {
                initializer: function MediportDeliverySettingsModel_initializer() {
                    var
                        self = this;

                    self.mediportBaseInfoI18n = i18n( 'InvoiceMojit.kvg_delivery_settings.MEDIPORT_BASE_INFO' );
                    self.mediportBaseI18n = i18n( 'InvoiceMojit.kvg_delivery_settings.MEDIPORT_BASE' );
                    self.zsnrNumber = i18n( 'physician-schema.Physician_T.zsrNumber.i18n' );
                    self.deviceServerI18n = i18n( 'file-schema.base_File_T.deviceServer.i18n' );
                    self.buttonDeleteTextI18n = i18n( 'general.button.DELETE' );

                    self.locationAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var mainLocationId = unwrap( self.mainLocationId ),
                                    locname = unwrap( self.locname ),
                                    zsrNumber = unwrap( self.zsrNumber );
                                if( !mainLocationId ) {
                                    return null;
                                }
                                return {
                                    id: mainLocationId,
                                    text: locname,
                                    data: {_id: mainLocationId, locname: locname, zsrNumber: zsrNumber}
                                };
                            },
                            write: function( $event ) {
                                var data = $event && $event.added;
                                self.mainLocationId( data && data.id || null );
                                self.locname( data && data.data && data.data.locname || null );
                                self.zsrNumber( data && data.data && data.data.zsrNumber || null );
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
                                            {zsrNumber: {$ne: null}},
                                            {zsrNumber: {$ne: ''}}
                                        ],
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
                    self.select2DeviceServers = {
                        data: ko.computed( {
                            read: function() {
                                var deviceServer = ko.unwrap( self.deviceServer );
                                return deviceServer ? {id: deviceServer, text: deviceServer} : '';
                            },
                            write: function( $event ) {
                                self.deviceServer( $event.val );
                            }
                        }, self ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            allowClear: true,
                            multiple: false,
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.device.getS2eClients().done( function( res ) {
                                    let devices = res.data;
                                    if( Array.isArray( devices ) && devices.length > 0 ) {
                                        devices = devices.map( self.stringToSelect2Object );
                                    } else {
                                        devices = [];
                                    }
                                    query.callback( {results: devices} );
                                } );
                            }
                        }
                    };

                    self.errorMessages = ko.observableArray();
                },
                stringToSelect2Object: function( text ) {
                    if( !text ) {
                        return text;
                    }
                    return {
                        id: text,
                        text: text
                    };
                },
                locationSelect2Mapper: function( location ) {
                    return {id: location._id, text: location.locname, data: location, disabled: location._alreadyUsed};
                },
                destructor: function DeliverySettingsModel_destructor() {
                    var
                        self = this;
                    if( self.kvConnectClientPollingInterval ) {
                        window.clearInterval( self.kvConnectClientPollingInterval );
                    }
                },
                deleteMediportSetting: function( data, item ) {
                    data.mediportDeliverySettings.remove( function( setting ) {
                        return setting.clientId === item.clientId;
                    } );
                }
            },
            {
                schemaName: 'invoiceconfiguration.mediportDeliverySettings',
                NAME: 'MediportDeliverySettingsModel'
            } );

        KoViewModel.registerConstructor( MediportDeliverySettingsModel );

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