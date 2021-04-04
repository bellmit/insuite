/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true,ko, moment */
/*exported fun */

fun = function _fn( Y/*,NAME*/ ) {
    'use strict';

    return {

        registerNode: function() {
            var
                i18n = Y.doccirrus.i18n,
                KEY_GEN_WARN = i18n( 'UserMgmtMojit.security_settings.KEY_GEN_WARN' );

            function MyVM() {
                var
                    self = this;

                self.keyI18n = i18n('UserMgmtMojit.security_settings.KEY');
                self.keyPhI18n = i18n('UserMgmtMojit.security_settings.KEY_PH');
                self.validUpToI18n = i18n('UserMgmtMojit.security_settings.VALID_UPTO');
                self.generateKeysI18n = i18n('UserMgmtMojit.security_settings.GENERATE_KEYS');
                self.generateKeys = function() {

                    Y.doccirrus.DCWindow.confirm( {
                        type: 'warn',
                        icon: Y.doccirrus.DCWindow.ICON_INFO,
                        title: i18n( 'DCWindow.notice.title.info' ),
                        message: KEY_GEN_WARN,
                        callback: function( dialog ) {
                            if( dialog.success ) {
                                Y.doccirrus.ajax.send( {
                                    type: 'GET',
                                    xhrFields: { withCredentials: true },
                                    url: Y.doccirrus.infras.getPrivateURL( '/1/admin/:generateKeys' ),
                                    success: function( result ) {
                                        var data = result.data;
                                        self.fingerprint( data.fingerprint );
                                        self.expireDate( moment( data.expireDate ).format( 'DD.MM.YYYY' ) );
                                    },
                                    error: function( err ) {
                                        Y.log( 'error in getFingerPrint' + err, 'error' );
                                    }
                                } );
                            }
                        }
                    } );
                };

                self.fingerprint = ko.observable();
                self.expireDate = ko.observable();

                Y.doccirrus.ajax.send( {
                    type: 'GET',
                    xhrFields: { withCredentials: true },
                    url: Y.doccirrus.infras.getPrivateURL( '/1/admin/:getFingerPrint' ),
                    success: function( body ) {
                        var
                            data = body.data,
                            errors = Y.doccirrus.errorTable.getErrorsFromResponse( body );

                        if( errors && errors[0] ) {
                            Y.Array.invoke( errors, 'display', 'info' );
                        } else {
                            self.fingerprint( data.fingerprint );
                            self.expireDate( moment( data.expireDate ).format( 'DD.MM.YYYY' ) );
                        }

                    },
                    error: function( err ) {
                        Y.log( 'error in getFingerPrint' + err, 'error' );
                    }
                } );
            }

            ko.applyBindings( new MyVM(), document.querySelector( '#keySettings' ) );
        },

        deregisterNode: function() {

        }
    };
};
