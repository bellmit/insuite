/**
 * User: martinpaul
 * Date: 23.05.13  12:32
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global $, YUI */
'use strict';

YUI.add( 'LoginMojitBinderFirstLogin', function( Y, NAME ) {

    /**
     * The LoginMojitBinderLogin module.
     *
     * @module LoginMojitBinderLogin
     */

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
        bind: function() {

            function changeProgressBar( progressBar, width, cssClass) {
                progressBar
                    .attr( 'style', 'width:' + width + '%' )
                    .removeClass('progress-bar-danger')
                    .removeClass('progress-bar-warning')
                    .removeClass('progress-bar-success')
                    .addClass( cssClass );
            }

            function checkPwStrength() {
                var
                    pwField = $( '#newPw' ),
                    pwStrengthProgress = $( 'div.progress-bar', '#frmFirstLogin' ),
                    pwStrength;

                    pwStrength = Y.doccirrus.authpub.checkPwStrength( pwField.val() );
                    switch( pwStrength ) {
                        case 0:
                            changeProgressBar( pwStrengthProgress, 5, 'progress-bar-danger' );
                            break;
                        case 1:
                            changeProgressBar( pwStrengthProgress, 33, 'progress-bar-warning' );
                            break;
                        case 2:
                            changeProgressBar( pwStrengthProgress, 66, 'progress-bar-success' );
                            break;
                        case 3:
                            changeProgressBar( pwStrengthProgress, 100, 'progress-bar-success' );
                            break;
                    }

                return pwStrength;
            }

            function submitForm() {
                var
                    pinField = $( '#pin' ),
                    newPwField = $( '#newPw' ),
                    newPwField2 = $( '#newPw2' ),
                    firstLoginForm = $( '#frmFirstLogin' ),
                    pwStrenth = Y.doccirrus.authpub.checkPwStrength( newPwField.val() ),
                    pwHash;

                if( newPwField.val() === newPwField2.val() &&
                    pinField.val().length > 3 &&
                    pwStrenth > 0 ) {
                    pwHash = Y.doccirrus.authpub.getPasswordHash( newPwField.val() );

                    newPwField.val( pwHash );
                    newPwField2.val( '' );

                    firstLoginForm.submit();
                } else {
                    // input fields are not ok
                    newPwField.parent().addClass( 'has-error' );
                    newPwField2.parent().addClass( 'has-error' );
                    pinField.parent().addClass( 'has-error' );

                    return false;
                }
            }

            $( 'body' ).on( 'change keyup', 'input', '#newPw', function( e ) {
                checkPwStrength( e );
            } );

            $( 'body' ).on( 'click', 'input', '#frmFirstLogin',
                function(){
                    $( 'div', '#frmFirstLogin' ).removeClass( 'has-error' );
                }
            );
            $( 'body' ).on( 'submit', '#frmFirstLogin', submitForm );
            $( '#btnSubmit', 'body', 'form' ).submit( function() {
                return false;
            } );
        }

    };

}, '0.0.1', {requires: ['event-mouseenter', 'mojito-client', 'dcauthpub' ]} );