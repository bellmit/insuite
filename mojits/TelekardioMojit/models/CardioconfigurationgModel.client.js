/**
 * User: pi
 * Date: 22/01/16  11:05
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

YUI.add( 'CardioconfigurationgModel', function( Y/*, NAME */ ) {

        'use strict';

        /**
         * @module CardioconfigurationgModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n;

        /**
         * @class CardioconfigurationgModel
         * @constructor
         */
        function CardioconfigurationgModel( config ) {
            CardioconfigurationgModel.superclass.constructor.call( this, config );
        }

        CardioconfigurationgModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( CardioconfigurationgModel, KoViewModel.getBase(), {

                initializer: function() {
                    var
                        self = this;
                    self.initCardioconfigurationgModel();
                },
                destructor: function() {
                },
                initCardioconfigurationgModel: function() {
                    var self = this;

                    self.configExportClientI18n = i18n( 'TelekardioMojit.labels.ConfigExportClient' );
                    self.configCertI18n = i18n( 'TelekardioMojit.labels.ConfigCert' );
                    self.configCertPassI18n = i18n( 'TelekardioMojit.labels.ConfigCertPass' );
                    self.configIdI18n = i18n( 'TelekardioMojit.labels.ConfigId' );
                    self.configSecretI18n = i18n( 'TelekardioMojit.labels.ConfigSecret' );
                    self.configServerURLI18n = i18n( 'TelekardioMojit.labels.ConfigServerURL' );
                    self.configPortI18n = i18n( 'TelekardioMojit.labels.ConfigPort' );
                    self.configTitleI18n = i18n( 'TelekardioMojit.labels.ConfigTitle' );
                    self.configButtonTestI18n = i18n( 'TelekardioMojit.labels.ConfigButtonTest' );
                    self.configButtonDeleteI18n = i18n( 'TelekardioMojit.labels.configButtonDelete' );

                    self.testButtonDisabled = ko.computed( function() {
                        return !unwrap( self._isValid );
                    } );
                },
                testButtonDisabled: null,
                testButtonClickHandler: function() {
                    var self = this;
                    var data = self.toJSON();
                    Y.doccirrus.jsonrpc.api.cardioconfiguration.testConfig( data ).done( function( res ) {
                        if( res.data ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'info',
                                message: i18n( 'TelekardioMojit.labels.ConfigTestSuccess' ),
                                window: {
                                    width: 'medium'
                                }
                            } );
                        }
                    } ).fail( function( err ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: ( err && err.message ) || i18n( 'TelekardioMojit.labels.ConfigTestFailure' ),
                            window: {
                                width: 'medium'
                            }
                        } );
                    } );
                },
                deleteButtonClickHandler: function( data, item ) {
                    if( item && item._id() ) {
                        Y.doccirrus.jsonrpc.api.cardioconfiguration.deleteConfig( {query: item._id()} ).done( function( res ) {
                            if( res && res.data ) {
                                data.configs.remove( function( config ) {
                                    return config.clientId === item.clientId;
                                } );
                            }
                        } ).fail( function( err ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: i18n( 'general.message.AN_ERROR_OCCURRED' ) + '</br>' + ( err && err.message ),
                                window: {
                                    width: 'medium'
                                }
                            } );
                        } );
                    } else {
                        data.configs.remove( function( config ) {
                            return config.clientId === item.clientId;
                        } );
                    }
                },
                configCertChangeHandler: function( model, event ) {
                    var
                        self = this,
                        file,
                        reader;
                    if( event.originalEvent.target.files.length > 0 ) {
                        file = event.originalEvent.target.files[0];
                        reader = new FileReader();
                        reader.addEventListener( "loadend", function() {
                            self.cert( reader.result.split( "," )[1] );
                        } );
                        reader.readAsDataURL( file );
                    }
                }
            },
            {
                schemaName: 'cardioconfiguration',
                NAME: 'CardioconfigurationgModel'
            }
        );

        KoViewModel.registerConstructor( CardioconfigurationgModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'cardioconfiguration-schema'
        ]
    }
);