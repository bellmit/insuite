/**
 * User: mahmoud
 * Date: 12/03/14  15:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';
/*CONSTANTS*/

/*jshint latedef:false */
/*global YUI, $ */
YUI.add( 'dcajax', function( Y, NAME ) {

        var
            BAD_A_UPPER_LETTER = String.fromCharCode( 65, 776 ),
            BAD_O_UPPER_LETTER = String.fromCharCode( 79, 776 ),
            BAD_U_UPPER_LETTER = String.fromCharCode( 85, 776 ),
            BAD_A_LOWER_LETTER = String.fromCharCode( 97, 776 ),
            BAD_O_LOWER_LETTER = String.fromCharCode( 111, 776 ),
            BAD_U_LOWER_LETTER = String.fromCharCode( 117, 776 ),
            chars = [
                {
                    bad: BAD_A_UPPER_LETTER,
                    good: 'Ä'
                }, {
                    bad: BAD_O_UPPER_LETTER,
                    good: 'Ö'
                }, {
                    bad: BAD_U_UPPER_LETTER,
                    good: 'Ü'
                }, {
                    bad: BAD_A_LOWER_LETTER,
                    good: 'ä'
                }, {
                    bad: BAD_O_LOWER_LETTER,
                    good: 'ö'
                }, {
                    bad: BAD_U_LOWER_LETTER,
                    good: 'ü'
                }];

        function replaceBadChars( str ) {
            var re = new RegExp( chars.map(function( i ) {return i.bad;}).join( '|' ), 'gm' );
            return str.replace(re, function( matched ) {
                var char = chars.find( function( i ) {return i.bad === matched;} );
                return char.good || '';
            } );
        }

        function isSelect2KeyEvent( event ) {
            var className = event.target && event.target.className;
            return (event instanceof window.KeyboardEvent) && className && (-1 !== className.indexOf( 'select2-input' ));
        }

        function blockEvent( event ) {
            if( blockingIsEnabled && !isSelect2KeyEvent( event ) ) {
                event.preventDefault();
                event.stopPropagation();
            }
        }

        var $body = $( 'body' ),
            blockingIsEnabled = true,
            counter = 0,
            totalCounter = 0,
            ppThrobber = '/static/DocCirrus/assets/images/ajax-loader.gif',
            prcThrobber = '/static/DocCirrus/assets/images/ajax-loader-menu.gif',
            useThrobber = Y.doccirrus.auth.isPatientPortal() ? ppThrobber : prcThrobber,
            originalAjaxFn = $.ajax,
        //  was previously: <i class="fa fa-spinner fa-spin"></i>
            $blocker = $( '' +
                          '<div id="dc-screen-lock"><div id="dc-screen-lock-icon" title="Bildschirm freigeben">' +
                          '<img src="' + useThrobber + '" id="dc-screen-lock-img" />' +
                          '</div></div>'
            ),
            $icon = $blocker.find( '#dc-screen-lock-icon' );

        //  position throbber image

        $blocker.css( 'position', 'absolute' ).css( 'z-index', 2000 ).css( 'top', '13px' ).css( 'opacity', '0.55' );
        //        if( $( '.navbar-brand' ).length ) {
        //            $blocker.css( 'left', ($( '.navbar-brand' ).offset().left - 35) + 'px' );
        //        }
        //
        //        $( window ).off( 'resize.navthrobber' ).on( 'resize.navthrobber', function() {
        //            if( $( '.navbar-brand' ).length ) {
        //                $blocker.css( 'left', ($( '.navbar-brand' ).offset().left - 35) + 'px' );
        //            }
        //        } );

        $icon.click( unblock );

        Y.publish( 'userActionStart', {preventable: false} );
        Y.publish( 'userActionEnd', {preventable: false} );
        Y.publish( 'userActionRequest', {preventable: false} );
        Y.publish( 'UserActionResponse', {preventable: false} );
        Y.publish( 'activityTransitioned', {preventable: false} );
        Y.publish( 'userActionProgress', {preventable: false} );

        function block() {
            //  don't block in inForm, or other places where it is explicitly disabled
            if ( !blockingIsEnabled ) { return; }

            $blocker.prependTo( $body );
            document.onclick = blockEvent;
            document.onkeydown = blockEvent;
            document.onkeypress = blockEvent;
            document.onkeyup = blockEvent;
            document.onpaste = blockEvent;
            if( Y.doccirrus.HotKeysHandler ) {
                Y.doccirrus.HotKeysHandler.bypass = true;
            }
        }

        function unblock() {
            $blocker.detach();
            document.onclick = null;
            document.onkeydown = null;
            document.onkeypress = null;
            document.onkeyup = null;
            document.onpaste = function(event) {

                var target = event.target;

                if (['TEXTAREA', 'INPUT'].indexOf(target.nodeName) === -1) {
                    return;
                }

                if (target.nodeName === 'INPUT') {
                    if(['text', 'password'].indexOf(target.type) === -1) {
                        return;
                    }
                }

                // data in onpaste event is readonly, so i can't just change string in clipboardData
                // https://www.w3.org/TR/clipboard-apis/#the-paste-action
                // i can't just set clipboardData in target.value, because the field may already contain some text
                setTimeout( function() {
                    target.value = replaceBadChars(target.value);
                }, 200 );

            };
            if( Y.doccirrus.HotKeysHandler ) {
                Y.doccirrus.HotKeysHandler.bypass = false;
            }
        }

        function incrementCounter() {
            counter++;
            totalCounter++;
            if( counter === 1 ) {
                block();
                Y.fire( 'userActionStart' );
            } else {
                Y.fire( 'userActionRequest', {counter: counter, totalCounter: totalCounter} );
            }
            Y.fire( 'userActionProgress', {
                value: ((totalCounter - counter) / totalCounter) * 100,
                counter: counter,
                totalCounter: totalCounter
            } );
        }

        function decrementCounter() {
            counter--;
            Y.fire( 'UserActionResponse', {counter: counter} );
            if( counter < 1 ) {
                unblock();
                Y.fire( 'userActionProgress', {
                    value: ((totalCounter - counter) / totalCounter) * 100,
                    counter: counter,
                    totalCounter: totalCounter
                } );
                totalCounter = 0;
                Y.fire( 'userActionEnd' );
            } else {
                Y.fire( 'userActionProgress', {
                    value: ((totalCounter - counter) / totalCounter) * 100,
                    counter: counter,
                    totalCounter: totalCounter
                } );
            }
        }

        $.ajax = function( params ) {
            if( params && params.noBlocking ) {
                return originalAjaxFn.apply( $, arguments );
            }
            incrementCounter();
            var deferred = originalAjaxFn.apply( $, arguments );
            deferred.always( function() {
                decrementCounter();
            } );
            return deferred;
        };

        var unload = false,
            pending = false;

        /**
         * Provides wrapper for ajax calls.
         *  Central and global ajax event handling is implemented here.
         *
         * @module utils
         * @class DCAjax
         * @constructor
         */
        function DCAjax() {
            // this is a static class
        }

        function dialog( e ) {

            if( e ) { // For IE and Firefox prior to version 4
                e.returnValue = 'The page is not done yet!';
            }
            return 'The page is not done yet!'; // for other browsers
        }

        /**
         * Initialize and manage events for tracking ajax requests.
         * Shows a confirm dialog when the user tries to leave a page that is waiting for response.
         * @method init
         */
        DCAjax.init = function() {
            this.loggedInUser = Y.doccirrus.auth.getUserId();
            Y.log( 'Init DCAjax with current id: ' + this.loggedInUser, 'debug', NAME );

            if( typeof window.addEventListener === 'undefined' ) {
                window.addEventListener = function( e, callback ) {
                    return window.attachEvent( 'on' + e, callback );
                };
            }
            if( typeof window.removeEventListener === 'undefined' ) {
                window.removeEventListener = function( e, callback ) {
                    return window.detachEvent( 'on' + e, callback );
                };
            }

            window.addEventListener( 'beforeunload', function() {
                // this is a hack, mainly for firefox.
                // At the time the dialog shows up, the browser has already terminated pending ajax reqs
                // and this triggers error method of that ajax req and so unwanted error messages
                unload = true;
            }, true );

            $( document ).ajaxStop( function() {
                window.removeEventListener( 'beforeunload', dialog );
                pending = false;
                unload = false;
                //                Y.log( 'ajaxStop ,pendings=' + $.active, 'error' );
            } );
        };

        /**
         * central handling of some common http errors
         * @param xhr
         * @param status
         * @param err
         */
        function defaultErrorHandler( event, jqXHR /*,ajaxSettings, thrownError*/ ) {
            var
                isKo = window.hasOwnProperty( 'ko' );

            function modalCallback() {
                if( /^\/intime/.test(document.location.pathname ) ){
                    document.location.hash = '#/login';
                } else {
                    document.location = document.location.pathname + 'logout';
                }

            }

            if( 401 === jqXHR.status ) {   // unauthorized access
                if( isKo ) {
                    if( /^\/intime/.test(document.location.pathname ) ){
                        Y.doccirrus.utils.localValueSet( 'portalPrevPage',  document.location.hash);
                        modalCallback();
                    } else {
                        Y.doccirrus.utils.loadingDialog( 'error', 'Sie wurden aus Sicherheitsgründen ausgeloggt. Bitte loggen Sie sich erneut ein.', modalCallback );
                    }
                } else {
                    Y.doccirrus.utils.informationDialog( true, 'Sie wurden aus Sicherheitsgründen ausgeloggt. Bitte loggen Sie sich erneut ein.', 'Zeitüberschreitung', modalCallback );
                }

            } else if( 503 === jqXHR.status ) { // request timeout/service unavailable
                // timeout on the PUC is trouble and we cannot count on the jade loading to work
                // for now use an alert MOJ-679  TODO
                if( isKo ) {
                    Y.doccirrus.utils.loadingDialog( 'error', 'Die Kommunikation mit dem Server ist gestört. Bitte überprüfen Sie Ihre Netzwerkverbindung.', function(){} );
                } else {
                    Y.doccirrus.utils.informationDialog( true, 'Die Kommunikation mit dem Server ist gestört. Bitte überprüfen Sie Ihre Netzwerkverbindung.', 'Fehler', function(){} );
                }
            }
        }

        $( document ).ajaxError( defaultErrorHandler ); // global error listener

        /**
         * Wrapper for $.ajax().
         * Controls ajax event handling.
         *
         * @param {JSON} settings
         * @returns {jqXHR} the same as $.ajax()
         */
        DCAjax.send = function( settings ) {
            var origSuccess,
                origError,
                origComplete;
            // if we are going to redirect then disable the event listener and call both success() and successRedirect().
            if( settings.successRedirect ) {
                origSuccess = settings.success;

                settings.success = function( data, status, xhr ) { // override success method

                    function redirect( location ) {
                        if( location ) {
                            window.removeEventListener( 'beforeunload', dialog ); // prevent the confirm dialog
                            if( origSuccess ) {
                                origSuccess( data, status, xhr ); // call the overridden method too
                            }

                            document.location = location; // do the redirect
                        }
                    }

                    settings.successRedirect( redirect, data, status, xhr );
                };

            } else if( !settings.success && !settings.complete && !settings.completeRedirect ) { // oops! no callback method defined for a successful request.
                Y.log( 'Programmer error! No success method defined.', 'error', NAME );
            }

            // if we are going to redirect then disable the event listener and call both complete() and completeRedirect().
            if( settings.completeRedirect ) {
                origComplete = settings.complete;

                settings.complete = function( xhr, status ) { // override complete method

                    function redirect( location ) {
                        if( location ) {
                            window.removeEventListener( 'beforeunload', dialog ); // prevent the confirm dialog
                            if( origComplete ) {
                                origComplete( xhr, status ); // call the overridden method too
                            }

                            window.document.location = location; // do the redirect
                        }
                    }

                    settings.completeRedirect( redirect, xhr, status );
                };
            }

            if( settings.error ) {
                origError = settings.error;

                settings.error = function( xhr, status, err ) {

                    if( unload ) {  // we are about to leave a page, therefore the error does not matter anymore
                        Y.log( 'DCAjax Error: Ajax terminated due to page refresh', 'warn' );
                        return;
                    }
                    origError( xhr, status, err );
                };

            } else if( settings.errorRedirect ) {

                settings.error = function( xhr, status, err ) { // override complete method

                    function redirect( location ) {
                        if( location ) {
                            window.removeEventListener( 'beforeunload', dialog ); // prevent the confirm dialog
                            window.document.location = location; // do the redirect
                        }
                    }

                    settings.errorRedirect( redirect, xhr, status, err );
                };

            } else {
                settings.error = function( jqXHR ) {
                    console.warn( 'Unhandled ajax error. Please define an error handler, status code: ', jqXHR.status );  //eslint-disable-line no-console
                };
            }

            if( !pending && settings.method && 'GET' !== settings.method.toUpperCase() ) {
                window.addEventListener( 'beforeunload', dialog ); // add only for the first non-GET request
            }

            var postData = settings.data,
                reqType = settings.type;

            // let jquery know that this is json data and doesn't need further processing
            //moreover by setting contentType mojito knows what we are sending
            if( postData && ('PUT' === reqType || 'POST' === reqType) ) {
                if( 'object' === typeof postData ) {
                    settings.data = JSON.stringify( postData );
                    settings.contentType = "application/json; charset=utf-8";
                    settings.processData = false;
                    settings.dataType = 'json';
                }
            }

            return $.ajax( settings );
        };

        //  Allow blocking behavior to be turned on and off
        //  Used by FEM for MOJ-3615 and in the calendar for Warteliste, Aufrufliste

        DCAjax.enableBlocking = function() {
            blockingIsEnabled = true;
        };

        DCAjax.disableBlocking = function() {
            blockingIsEnabled = false;
        };

        DCAjax.uiBlockingEnabled = function() {
            return blockingIsEnabled;
        };

        DCAjax.init();
        Y.namespace( 'doccirrus' ).ajax = DCAjax;

    },
    '0.0.1', {requires: ['dcauth', 'dcutils']}
);
