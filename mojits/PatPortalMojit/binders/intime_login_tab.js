/*global $, window, fun:true */
//TRANSLATION INCOMPLETE!! MOJ-3201
/*exported fun */
fun = function _fn( Y, NAME ) {
    'use strict';

    return {
        registerNode: function( node, key, options ) {
            var
            // FIXME improve spam detection here
                pwResetAttempts = 100,
                pwField = $( '#passwordField' ),
                userField = $( '#usernameField' ),
                commonData = options.binder.commonData;

            function changeInputClass( cssClass ) {
                pwField.parent().removeClass( 'has-success' ).removeClass( 'has-error' ).addClass( cssClass );
                userField.parent().removeClass( 'has-success' ).removeClass( 'has-error' ).addClass( cssClass );
            }

            function doLogin() {
                var
                    redirectTo = Y.doccirrus.utils.getQueryParams( window.location.search ).redirectTo || '/intime',
                    hash;

                if( '' !== pwField.val() && '' !== userField.val() ) {
                    hash = Y.doccirrus.authpub.getPasswordHash( pwField.val() ) || '';
                    pwField.val( '' );
                    Y.doccirrus.ajax.send( {
                        url: '/dologin?intime=1&redirectTo=' + redirectTo,
                        method: 'post',
                        dataType: 'json',
                        data: {
                            username: userField.val(),
                            password: hash,
                            loginAttempt: true
                        },
                        successRedirect: function( redirect, data ) {
                            var code = data.error,
                                prac = commonData.prac,
                                prevPage = commonData.getPrevPage() || '',
                                dropPracticeCheckedFlag = commonData.dropPracticeCheckedFlag;

                            if( data && data.loggedIn ) {
                                /**
                                 * Set some LS data for logged in user
                                 */
                                if( prac ) {
                                    commonData.setPrac( prac, userField.val() );
                                }
                                if( dropPracticeCheckedFlag ){
                                    commonData.setPracticeIsChecked( false, userField.val() );
                                }
                                /**
                                 * We need to drop local storage value, because of this value is related to UNAUTHORIZED user.
                                 */
                                commonData.drop();
                                if( '#' === prevPage.slice( 0, 1 ) ) {
                                    prevPage = prevPage.slice( 1 );
                                }
                                //FIXME when redirectTo will have correct value
                                //redirect( '/intime?redirectTo=' + encodeURIComponent( data.redirectUrl || ( '/practices/' + commonData.prac ) ) );
                                redirect( '/intime?redirectTo=' + encodeURIComponent( (prevPage || '/practices') ));
                                return;
                            } else {
                                data.loginDelay = Math.ceil( data.loginDelay / 1000 );
                                Y.doccirrus.DCWindow.notice({
                                    type: 'info',
                                    message: Y.doccirrus.errorTable.getMessage( {code: code, data: {$loginDelay: data.loginDelay}} )
                                });
                                changeInputClass( 'has-error' );
                            }
                        },
                        error: function( xhr, status, error ) {
                            Y.log( 'login status: ' + status + ': ' + error, 'error', NAME );
                            changeInputClass( 'has-error' );
                            Y.doccirrus.DCWindow.notice({
                                type: 'error',
                                message: 'Verbindung fehlgeschlagen. Versuchen Sie es erneut.'
                            });
                        }
                    } );
                } else {
                    changeInputClass( 'has-error' );
                }

            }

            function passwordReset() {

                if( !userField.val() ) {
                    userField.parent().addClass( 'has-error' );
                    return;
                }

                if( --pwResetAttempts ) {
                    Y.doccirrus.comctl.pucGet( '/1/patientportal/:resetPassword', { username: userField.val() }, function( err ) {
                        if(err){
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            return;
                        }
                        Y.doccirrus.DCWindow.notice( {
                            type: 'success',
                            message: 'Aus Sicherheitsgründen erhalten Sie keine Rückmeldung, ob der Benutzername korrekt eingegeben wurde. Bei korrekter Eingabe erhalten Sie in Kürze eine E-Mail mit weiteren Anweisungen.'
                        } );
                        pwResetAttempts++;
                    } );
                } else {
                    Y.doccirrus.DCWindow.notice({
                        type: 'error',
                        message: 'Bitte kontaktieren Sie den Doc Cirrus Support.'
                    });
                }
            }

            // Read a page's GET URL variables and return them as an associative array.
            function getUrlVars() {
                var vars = {}, hash;
                var hashes = window.location.href.slice( window.location.href.indexOf( '?' ) + 1 ).split( '&' ),
                    i;
                for( i = 0; i < hashes.length; i++ ) {
                    hash = hashes[i].split( '=' );
                    vars[hash[0]] = hash[1];
                }
                return vars;
            }

            function getCustomerIdFromURL() {
                var
                    customerId = commonData.prac;
                if( Y.config.debug ) {
                    Y.log( JSON.stringify( getUrlVars( document.location ) ), 'debug', NAME );
                }
                if( customerId && /\d+$/.exec( customerId ) ) {
                    return customerId;
                }
                else {
                    return -1;
                }
            }

            $( '#passwordField' ).keyup( function( event ) {
                if( 13 === event.keyCode || 10 === event.keyCode ) {
                    doLogin();
                }
            } );
            $( '#doPatLoginBtn' ).on( 'click', doLogin );
            $( '#forgotPatPwBtn' ).on( 'click', passwordReset );

            // the registration link is currently only provided when patportal is embedded in customer website
            if( getCustomerIdFromURL() === -1 ) {
                $( '#registerBtn' ).hide();
            }
            $( '#registerBtn' ).on( 'click', function( event ) { // registration link
                var customerId = getCustomerIdFromURL();
                if( customerId !== -1 && 'false' !== commonData.registrationSupport ) {
                    event.view.document.location = '/intime/register?customerId=' + customerId;
                }
                else {
                    Y.log( "registration is only supported if this portal is embed into customer's webpage", "error" );
                }
            } );
            if( 'false' === commonData.adhocSupport ) {
                $( '#WaitingRoomWithoutAppointment' ).hide();
            }
            if( 'false' === commonData.registrationSupport ) {
                $( '#registerBtn' ).hide();
            }
            if( node.one( '#usernameField' ) ) {
                node.one( '#usernameField' ).focus();
            }

        }
    };
};
