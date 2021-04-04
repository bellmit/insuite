/**
 * User: pi
 * Date: 30/05/16  11:20
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */

YUI.add( 'SettingsModel', function( Y ) {
        'use strict';
        /**
         * @module SettingsModel
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            DEFAULT_SENDER = i18n( 'InSuiteAdminMojit.tab_locations.text.DEFAULT' );

        /**
         * @class SettingsModel
         * @constructor
         */
        function SettingsModel( config ) {
            SettingsModel.superclass.constructor.call( this, config );
        }

        SettingsModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( SettingsModel, KoViewModel.getBase(), {

                initializer: function SettingsModel_initializer() {
                    var self = this;

                    self.initSettingsModel();
                },
                destructor: function SettingsModel_destructor() {
                },
                initSettingsModel: function SettingsModel_initSettingsModel() {
                    var
                        self = this;
                    self._getDCAvwgCertNumber = function() {
                        Y.doccirrus.jsonrpc.api.kbv.certNumbers().done( function( result ) {
                            var avwgCertNumber = result && result.data && result.data.avwgCertNumber;
                            if( avwgCertNumber ) {
                                self.avwgNo( avwgCertNumber );
                            }
                        } );
                    };

                    self.canSetNoCrossLocationAccessSubSettings = ko.computed( function() {
                        var
                            noCrossLocationAccess = unwrap( self.noCrossLocationAccess );
                        return noCrossLocationAccess;

                    } );

                    self.addDisposable( ko.computed( function() {
                        unwrap( self.smtpPassword );
                        unwrap( self.smtpUserName );
                        unwrap( self.smtpSsl );
                        unwrap( self.smtpHost );
                        unwrap( self.smtpPort );
                        self.smtpEmailFrom.validate();
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        unwrap( self.useExternalPrescriptionSoftware );
                        self.externalPrescriptionSoftwareUrl.validate();
                    } ) );
                },
                save: function() {
                    var
                        self = this,
                        data = self.toJSON(),
                        promise,
                        fields = [];

                    if( data._id ) {
                        fields = Object.getOwnPropertyNames( data );
                        promise = Y.doccirrus.jsonrpc.api.settings.update( {
                            query: {
                                _id: data._id
                            },
                            data: data,
                            fields: fields
                        } );
                    } else {
                        promise = Y.doccirrus.jsonrpc.api.settings.create( {
                            data: data
                        } );

                    }
                    return promise;
                }
            },
            {
                schemaName: 'settings',
                NAME: 'SettingsModel',
                clearSmtpConfiguration: function( model ) {
                    var self = this;

                    function clear() {
                        model.smtpHost( "" );
                        model.smtpPort( null );
                        model.smtpUserName( "" );
                        model.smtpPassword( "" );
                        model.smtpEmailFrom( "" );
                        model.smtpSsl( false );
                    }

                    if( !self.checkIfSmtpSettingsAreRemoved( model ) || peek( model.smtpEmailFrom ) ) {
                        self.showConfirmBox( null, i18n( 'InSuiteAdminMojit.tab_settings.email_settings.SETTINGS_CLEAR_CONFIRM' ), clear );
                    }
                },
                checkIfSmtpSettingsAreRemoved: function( model ) {
                    return !model.smtpHost() && !model.smtpPort() && !model.smtpSsl() && !model.smtpUserName() && !model.smtpPassword() && !model.smtpEmailFrom();
                },
                /**
                 * Build string as smtpHost+smtpPort+smtpSsl+smtpUserName+smtpPassword to
                 * check if user has changed any/all inputs
                 * */
                buildSmtpDirtyCheckString: function( model, checkKoVariables ) {
                    var smtpDirtyCheckString = "";
                    if( !checkKoVariables ) {
                        if( model.smtpHost ) {
                            smtpDirtyCheckString = smtpDirtyCheckString + model.smtpHost();
                        }

                        if( model.smtpPort ) {
                            smtpDirtyCheckString = smtpDirtyCheckString + (model.smtpPort() == null ? "" : model.smtpPort()); //eslint-disable-line eqeqeq
                        }

                        if( model.smtpSsl ) {
                            smtpDirtyCheckString = smtpDirtyCheckString + (model.smtpSsl() ? model.smtpSsl() : "");
                        }

                        if( model.smtpUserName ) {
                            smtpDirtyCheckString = smtpDirtyCheckString + model.smtpUserName();
                        }

                        if( model.smtpPassword ) {
                            smtpDirtyCheckString = smtpDirtyCheckString + model.smtpPassword();
                        }

                        if (model.smtpEmailFrom) {
                            smtpDirtyCheckString = smtpDirtyCheckString + model.smtpEmailFrom();
                        }
                        return smtpDirtyCheckString;
                    } else {
                        return model.smtpHost() + (model.smtpPort() == null ? "" : model.smtpPort()) + (model.smtpSsl() ? model.smtpSsl() : "") + model.smtpUserName() + model.smtpPassword() + model.smtpEmailFrom(); //eslint-disable-line eqeqeq
                    }
                },
                verifySmtpConfiguration: function( model, onCheckSuccess ) {
                    var self = this,
                        testInitiator,
                        smtpConfigObj = {};

                    if( model.locname && model.locname() ) {
                        testInitiator = model.locname();
                    } else {
                        testInitiator = DEFAULT_SENDER;
                    }

                    if( this.checkIfSmtpSettingsAreRemoved( model ) ) {
                        self.notice( i18n( 'InSuiteAdminMojit.tab_settings.email_settings.SETTINGS_EMPTY' ), 'error' );
                    } else {
                        smtpConfigObj.smtpHost = model.smtpHost();
                        smtpConfigObj.smtpPort = model.smtpPort();
                        smtpConfigObj.smtpSsl = model.smtpSsl();
                        smtpConfigObj.smtpUserName = model.smtpUserName();
                        smtpConfigObj.smtpPassword = model.smtpPassword();
                        smtpConfigObj.testInitiator = testInitiator;

                        Y.doccirrus.jsonrpc.api.settings
                            .verifySmtpConfiguration( { data: smtpConfigObj } )
                            .done( function( response ) {
                                onCheckSuccess();
                                self.notice( Y.Lang.sub( i18n( 'InSuiteAdminMojit.tab_settings.email_settings.SETTINGS_CORRECT' ) + '.' +
                                                         '<br/>' +
                                                         '<br/>From: {from}' +
                                                         '<br/>To: {to}', {
                                    from: response && response.data && response.data.from,
                                    to: response && response.data && response.data.to
                                } ), 'info' );
                            } )
                            .fail( function( response ) {
                                var errorMessage = '';
                                if( response.error && response.error.code ) {
                                    switch( response.error.code ) {
                                        case 'ECONNECTION':
                                        case 'ETIMEDOUT':
                                            errorMessage = i18n( 'InSuiteAdminMojit.tab_settings.email_error_messages.CONNECTION_ERR' );
                                            break;
                                        case 'EAUTH':
                                            errorMessage = i18n( 'InSuiteAdminMojit.tab_settings.email_error_messages.AUTH_ERR' );
                                            break;
                                        default:
                                            errorMessage = JSON.stringify( response.error );
                                    }
                                }
                                self.notice( Y.Lang.sub( i18n( 'InSuiteAdminMojit.tab_settings.email_settings.SETTINGS_INCORRECT' ) + '.<br/>' + errorMessage + '<br/><br/>From: ' + response.from + '<br/>To: ' + response.to, 'info' ) );
                            } );
                    }
                },
                showConfirmBox: function( model, message, method ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'warn',
                        message: message,
                        window: {
                            width: 'medium',
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        action: function() {
                                            this.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                            method( model );
                                        }
                                    } )
                                ]
                            }
                        }
                    } );
                },
                notice: function( msg, type ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: type,
                        message: msg,
                        window: { width: 'medium' }
                    } );
                }
            }
        );
        KoViewModel.registerConstructor( SettingsModel );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'settings-schema',

            'JsonRpcReflection-doccirrus',
            'JsonRpc'
        ]
    } );