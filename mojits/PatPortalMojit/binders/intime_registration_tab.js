/**
 * User: pi
 * Date: 08.12.15   15:20
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global fun: true, ko */
fun = function _fn( Y ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        SUCCESS_REGISTRATION = i18n( 'PatPortalMojit.intime_registration_tab.text.SUCCESS_REGISTRATION' ),
        PASSWORDS_NOT_IDENTICAL = i18n( 'PatPortalMojit.intime_registration_tab.text.PASSWORDS_NOT_IDENTICAL' ),
        KoViewModel = Y.doccirrus.KoViewModel;

    function RegistrationModel( config ) {
        RegistrationModel.superclass.constructor.call( this, config );
    }

    Y.extend( RegistrationModel, KoViewModel.getDisposable(), {
        initializer: function RegistrationModel_initializer( config ) {
            var
                self = this;
            self.mainNode = config.node;
            self.patientregId = config.patientregId;
            self.initRegistrationModel();
        },
        initRegistrationModel: function() {
            var
                self = this,
                mandatoryValidation = Y.doccirrus.validations.common.mandatory[ 0 ];
            self.password = ko.observable();
            self.password.hasError = ko.observable();
            self.password.validationMessages = ko.observableArray( [ mandatoryValidation.msg ] );

            self.password2 = ko.observable();
            self.password2.hasError = ko.observable();
            self.password2.validationMessages = ko.observableArray( [ PASSWORDS_NOT_IDENTICAL ] );

            self.privacy = ko.observable();
            self.privacy.hasError = ko.observable();
            self.intimesla = ko.observable();
            self.intimesla.hasError = ko.observable();

            self._isValid = ko.computed( function() {
                var
                    password = self.password(),
                    password2 = self.password2(),
                    privacy = self.privacy(),
                    intimesla = self.intimesla();

                self.password.hasError( !password );

                self.password2.hasError( password !== password2 );
                self.privacy.hasError( !privacy );
                self.intimesla.hasError( !intimesla );

                return password && password === password2 && privacy && intimesla;
            } );

            self.register = function() {
                var
                    self = this,
                    data = self.toJSON();
                Y.doccirrus.ajax.send( {
                    type: 'POST',
                    url: '/1/patientportal/:registerPatient',
                    data: {
                        pwHash: data.pwHash,
                        patientregId: self.patientregId
                    },
                    success: function( body ) {
                        var
                            errors = Y.doccirrus.errorTable.getErrorsFromResponse( body ),
                            data = body && body.data || {};
                        if( errors.length ) {
                            if( 22003 === errors[0].name ){
                                Y.doccirrus.DCWindow.notice( {
                                    message: errors[0].message,
                                    type: 'success',
                                    window: {
                                        width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                        buttons: {
                                            footer: [
                                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                                    isDefault: true,
                                                    action: function() {
                                                        this.close();
                                                        if( data.patientPortalUrl ) {
                                                            window.location = data.patientPortalUrl;
                                                            return;
                                                        }
                                                        Y.doccirrus.nav.router.save( '/login' );
                                                    }
                                                } )
                                            ]
                                        }
                                    }
                                } );
                            }
                            else {
                                Y.Array.invoke( errors, 'display', 'error' );
                            }
                            return;
                        }
                        Y.doccirrus.DCWindow.notice( {
                            message: SUCCESS_REGISTRATION,
                            type: 'success',
                            window: {
                                width: Y.doccirrus.DCWindow.SIZE_SMALL,
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            action: function() {
                                                this.close();
                                                if( data.patientPortalUrl ) {
                                                    window.location = data.patientPortalUrl;
                                                    return;
                                                }
                                                Y.doccirrus.nav.router.save( '/login' );
                                            }
                                        } )
                                    ]
                                }
                            }
                        } );
                    }
                } );
            };
        },
        toJSON: function() {
            var
                self = this,
                password = self.password();
            return {
                password: password,
                pwHash: Y.doccirrus.authpub.getPasswordHash( password )
            };
        }
    } );

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node   NB: The node MUST have an   id   attribute.
         */
        registerNode: function( node, key, options ) {
            var
                registerModel = new RegistrationModel( { node: node, patientregId: options.patientregId } );
            ko.applyBindings( registerModel, document.querySelector( '#intimeRegistration' ) );
        },
        deregisterNode: function() {

        }
    };
};