/*
 * User: rrrw
 * Date: 01.01.13  09:50
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global $, YUI */
'use strict';

YUI.add( 'LoginMojitBinderLogin', function( Y, NAME ) {

    var i18n = Y.doccirrus.i18n,
        NOTE = i18n( 'LoginMojit.loginJS.title.NOTE' ),
        CHECK_EMAIL = i18n( 'LoginMojit.loginJS.message.CHECK_EMAIL' ),
        msgKey, timerHandle;

    /**
     * The LoginMojitBinderLogin module.
     *
     * @module LoginMojitBinderLogin
     */

    function validateCredentials( node, hashPW ) {
        var
            hash,
            userField = $( '#usernameField' ),
            tenantField = $( '#tenantField' ),
            pwField = $( '#passwordField' ),
            formContainer = $( '#frmLoginContainer' ),
            loginDelayMessage = $( '#loginDelayMessage' ),
            ldap = $( '#ldapField' );

        ldap = ldap && ldap[0] && ldap[0].checked || false;
        hash = ldap ? pwField.val() : ( hashPW ? Y.doccirrus.authpub.getPasswordHash( pwField.val() ) || '' : pwField.val() );
        pwField.val( '' );

        function err( where, off ) {
            where = where || $( 'div', formContainer );

            if( off ) {
                where.removeClass( 'has-error' );
            } else {
                where.addClass( 'has-error' );
            }

            //spinner.spin( false );
            userField.attr( 'disabled', null );
            pwField.attr( 'disabled', null );
        }

        function displayCountDown( response ) {
            var msg;
            if( response.loginDelay > 0 ) {
                msg = Y.doccirrus.errorTable.getMessage( {code: response.error, data: {$loginDelay: response.loginDelay}} );
                loginDelayMessage.text( msg );
            } else {
                loginDelayMessage.addClass( 'hidden' );
                clearInterval( timerHandle );
            }
        }

        function submitCode( code, callback ) {

            Y.doccirrus.ajax.send( {
                url: '/1/auth/:unlockLogin',
                method: 'post',
                dataType: 'json',
                data: {
                    tenantId: tenantField.val(),
                    accessCode: code
                },
                success: function( response ) {
                    var
                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                    if( errors[0] ) {
                        if( errors[0].config.code === 106 ) { // account was locked
                            Y.Array.invoke( errors, 'display', 'info' );
                        } else {
                            callback( errors[0].config.data.attempts );
                        }
                    } else {
                        callback();
                    }
                }} );
        }

        // access code modal
        function showPinModal( attempts, callback ) {
            var
                modalContent = node.one( '#pinModal' ).cloneNode( true ),
                TEXT1 = modalContent.one( '#TEXT1' ),
                TEXT2 = modalContent.one( '#TEXT2' ),
                codeField = modalContent.one( '#accessCode' ),
                pinModal;

            if( attempts ) { // display number of allowed attempts left
                TEXT1.set( 'text', i18n( 'LoginMojit.pinModal.TEXT3', {data: {attempts: attempts}} ) );
                TEXT2.set( 'text', '' );
            }

            modalContent.removeClass( 'hidden' );
            pinModal = new Y.doccirrus.DCWindow( {
                className: 'DCWindow-LoginPinModal',
                bodyContent: modalContent,
                icon: Y.doccirrus.DCWindow.ICON_INFO,
                title: i18n( 'DCWindow.notice.title.info' ),
                width: 400,
                centered: true,
                modal: true,
                render: document.body,
                visible: true,
                buttons: {
                    header: ['close'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                        {
                            name: 'OK',
                            disabled: true,
                            isDefault: true,
                            label: 'Weiter',
                            action: function() {
                                var
                                    code = codeField.get( 'value' ),
                                    thisButton = pinModal.getButton( 'OK' );

                                if( code ) {
                                    thisButton.set( 'disabled', true );
                                    submitCode( code, function( count ) {
                                        thisButton.set( 'disabled', false );
                                        if( count ) {
                                            showPinModal( count, callback );
                                        } else {
                                            callback();
                                        }
                                    } );
                                    this.close();
                                }
                            }
                        }
                    ]
                }
            } );

            // code field validation
            codeField.on( 'keyup', function() {
                var
                    value = codeField.get( 'value' );

                if( value && /^[\d]{6}$/.test( value ) ) {
                    pinModal.getButton( 'OK' ).set( 'disabled', false );
                    codeField.ancestor().removeClass( 'has-error' );
                } else {
                    pinModal.getButton( 'OK' ).set( 'disabled', true );
                    codeField.ancestor().addClass( 'has-error' );
                }
            } );
        }

        function submitCredentials() {

            clearInterval( timerHandle );

            Y.doccirrus.ajax.send( {
                url: formContainer.attr( 'data-url' ),
                method: 'post',
                dataType: 'json',
                data: {
                    username: userField.val(),
                    tenantId: tenantField.val(),
                    password: hash,
                    loginAttempt: true,
                    ldap: ldap
                },
                completeRedirect: function( redirect, data ) {
                    var response, redir;
                    try {
                        response = $.parseJSON( data.responseText );
                        if( true === response.loggedIn ) {
                            redirect( response.redirectUrl );

                        } else if( true === response.authForward ) {
                            if( response.username && response.password ) {
                                redir = response.redirectUrl;
                                redir += (redir.match( /\?/ ) ? '&' : '?') +
                                         '_dca=' + Y.doccirrus.authpub.b64_encode( Y.doccirrus.authpub.encPRCMsg( msgKey, response.username + ';' + response.password ) );
                                redirect( redir );
                                return;
                            } else {
                                err();
                            }

                        } else if( 0 < response.loginDelay ) {
                            response.loginDelay = Math.ceil( response.loginDelay / 1000 );
                            displayCountDown( response );
                            timerHandle = setInterval( function() {
                                response.loginDelay -= 1;
                                displayCountDown( response );
                            }, 1000 );
                            loginDelayMessage.removeClass( 'hidden' );

                        } else if( 0 < response.needAccessCode ) {
                            showPinModal( null, function() {
                                submitCredentials(); // repeat the login
                            } );

                        } else {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'warn',
                                title: NOTE,
                                message: Y.doccirrus.errorTable.getMessage( {code: response.error} ),
                                render: document.body,
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'Bestätigen', { isDefault: true } )
                                    ]
                                }
                            } );
                            err();
                        }
                    } catch( parseException ) {
                        err();
                    }
                }
            } );
        }

        submitCredentials();
    }

    /**
     * Constructor for the LoginMojitBinderLogin class.
     *
     * @class LoginMojitBinderLogin
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         */
        bind: function( node ) {
            var inOutActivated = this.mojitProxy.pageData.get( 'inOutActivated' );
            // the daily secret
            // FIXME midnight issue
            msgKey = new Date().toISOString( 'dd' ).substr( 5, 5 );

            var pwModal = $( document.getElementById( 'myModal' ) );
            var error = $( '.resetpwwarning' ).hide();
            $( '#sendpwdlink' ).click( function() {
                $.ajax( {
                    url: '/1/employee/:doResetEmployeePw',
                    xhrFields: {
                        withCredentials: true
                    },
                    method: 'get',
                    dataType: 'json',
                    data: {
                        username: $( '#pwforgotten_username' ).val(),
                        tenantId: $( 'input[name=tenantId]' ).val()
                    },
                    success: function() {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            title: NOTE,
                            message: CHECK_EMAIL,
                            render: document.body,
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'Bestätigen', { isDefault: true } )
                                ]
                            },
                            callback: function() {
                                pwModal.modal( 'hide' );
                            }
                        } );
                    }
                } ).fail( function() {
                    error.show();
                } );
            } );

            function openPwForgottenModal( e ) {
                e.preventDefault();
                pwModal.modal();
            }

            // forward to login if credentials are already in url
            function possiblyForward() {
                var
                    str,
                    userF = $( '#usernameField' ),
                    passF = $( '#passwordField' );

                function warn( msg ) {
                    if( msg ) {
                        Y.log( msg, 'warn', NAME );
                    }
                    //spinner.spin( false );
                    userF.attr( 'disabled', null );
                    passF.attr( 'disabled', null );
                }

                //spinner.spin( true );
                userF.attr( 'disabled', 'disabled' );
                passF.attr( 'disabled', 'disabled' );

                if( document.location.search.match( /[\?&]_dca=/ ) ) {
                    str = /.*[\?&]_dca=([^&]*)/.exec( document.location.search );
                    if( str && Array.isArray( str ) && 2 === str.length ) {
                        str = Y.doccirrus.authpub.b64_decode( decodeURIComponent( str[1] ) );
                        if( str ) {
                            str = Y.doccirrus.authpub.decPRCMsg( msgKey, str );
                            if( str ) {
                                str = str.split( ';' );
                                if( (Array.isArray( str )) && (2 === str.length) ) {
                                    userF.val( str[0] );
                                    passF.val( str[1] );
                                    validateCredentials( node );
                                } else {
                                    warn( '_dca value malformed: ' + str );
                                }
                            } else {
                                warn( '_dca value: decrypted empty' );
                            }
                        } else {
                            warn( '_dca value: unable to decrypt ' + str );
                        }
                    } else {
                        warn( '_dca value missing' );
                    }
                } else {
                    warn();
                }
            }
            
            function tryLoginDevice() {
                var
                    url = window.document.location;

                url = url && encodeURIComponent( encodeURIComponent( url ) );
                Y.doccirrus.ajax.send( {
                    url: '/1/auth/:loginDevicePoll?url=' + url,
                    xhrFields: {
                        withCredentials: true
                    },
                    method: 'GET',
                    dataType: 'json',
                    data: {
                        deviceName: 'ddd', // TODO
                        tenantId: $( 'input[name=tenantId]' ).val()
                    },
                    noBlocking: true,
                    success: function( body ) {
                        var
                            redirectUrl = body && body.data && body.data.redirectUrl;

                        if( redirectUrl ) { //if user logged in redirect
                            redirectUrl = redirectUrl === '#/' ? '/' : redirectUrl;
                            document.location.href = redirectUrl;
                        } else { //if user didn't log in
                            if ( body.meta.errors && body.meta.errors.length > 0 ) {
                                if (body.meta.errors[0].code === 80000) { //if device server is not running
                                    $('#nfcNotReady').show();
                                    $('#nfcReady').hide();
                                }
                            } else if ( body.data === "no card" ){ //if device server is online but no card is scanned
                                $('#nfcNotReady').hide();
                                $('#nfcReady').show();
                            }
                            setTimeout( tryLoginDevice, 1500 ); //try again after 1.5 seconds
                        }
                    },
                    error: function( err ) {
                        if (err.statusText && "INACTIVE" === err.statusText) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'warn',
                                title: i18n( 'LoginMojit.login.inactiveUserWarning.TITLE' ),
                                message: i18n( 'LoginMojit.login.inactiveUserWarning.MESSAGE' ),
                                render: document.body,
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'Bestätigen', { isDefault: true } )
                                    ]
                                },
                                callback: function() {
                                    pwModal.modal( 'hide' );
                                }
                            } );
                        } else { //if connection to the data safe is not established
                            $('#nfcNotReady').show();
                            $('#nfcReady').hide();
                        }
                        setTimeout( tryLoginDevice, 1500 );
                    }
                } );
            }

            function checkConnectionStatus() {
                var
                    url = window.document.location;

                url = url && encodeURIComponent( encodeURIComponent( url ) );
                Y.doccirrus.ajax.send( {
                    url: '/1/auth/:testConnection?url=' + url,
                    xhrFields: {
                        withCredentials: true
                    },
                    method: 'GET',
                    dataType: 'json',
                    data: {
                        deviceName: 'ddd', // TODO
                        tenantId: $( 'input[name=tenantId]' ).val()
                    },
                    noBlocking: true,
                    success: function() {
                        window.location.reload( false );
                    },
                    error: function() {
                        setTimeout( checkConnectionStatus, 500 );
                    }
                } );
            }

            $( 'body' ).
                on( 'click', 'input', '#frmLoginContainer',
                function() {
                    $( 'div', '#frmLoginContainer' ).removeClass( 'has-error' );
                }
            ).on( 'click', '#doLoginBtn',function() {
                    validateCredentials( node, true );
                }
            ).on( 'click', '#pwforgotten', openPwForgottenModal ).
                keyup( function( e ) {
                    if( (e.keyCode === 13) && ($( '#passwordField' ).val()) ) {
                        validateCredentials( node, true );
                    }
                }
            );

            possiblyForward();
            var lastTime,
                inter;

            if( inOutActivated ) {
                $('#nfcReady').show();
                tryLoginDevice();

                lastTime = (new Date()).getTime();

                inter = setInterval(function() {
                    var currentTime = (new Date()).getTime();
                    if (currentTime > (lastTime + 2000*2)) {  // ignore small delays
                        $('#nfcNotReady').show();
                        $('#nfcReady').hide();
                        clearInterval(inter);
                        checkConnectionStatus();
                    }
                    lastTime = currentTime;
                }, 2000);
            } else {
                $('#nfcNotReady').hide();
                $('#nfcReady').hide();
            }
            if( node.one( '#usernameField' ) ) {
                node.one( '#usernameField' ).focus();
            }

        }
    };

}, '0.0.2', {
    requires: [
        'event-mouseenter',
        'mojito-client',
        'dcauthpub',
        'DCWindow',
        'dcajax',
        'dc-comctl',
        'dcerrortable'
    ]
} );
