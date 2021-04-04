/*global YUI, $ */

YUI.add( 'PatPRCRegBinder', function( Y, NAME ) {

        "use strict";

        /**
         * Constructor for the patientBinderIndex class.
         *
         * @class patientBinderIndex
         * @constructor
         */
        Y.namespace( 'mojito.binders' )[NAME] = {

            /** using client side Jade so we need to announce who we are. */
            jaderef: 'PatPortalMojit',

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
             * @param node {Node} The DOM node to which this mojit is attached.
             */
            bind: function( node ) {
                var
                    params = Y.doccirrus.utils.getQueryParams( document.location.search ),
                    patientId = params.pid,
                    prcKey = params.spub,
                    coname = params.coname,
                    i18n = Y.doccirrus.i18n,
                    PIN_SUCCESS = Y.Lang.sub(i18n('patientRegistration.patientprcregister.PIN_SUCCESS'), {practiceName: coname}),
                    PIN_FAIL = Y.Lang.sub(i18n('patientRegistration.patientprcregister.PIN_FAIL'), {practiceName: coname}),
                    pinField;

                function handleSubmitResponse( xhr ) {

                    if( undefined !== xhr ) {
                        switch( xhr.status ) {
                            case 200:
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'success',
                                    message: PIN_SUCCESS,
                                    window: {
                                        width: Y.doccirrus.DCWindow.SIZE_SMALL
                                    }
                                } )
                                    .on( 'visibleChange', function( event ) {
                                        if( false === event.newVal ) {
                                            document.location = '/intime#/login';
                                        }
                                    } );
                                break;
                            case 400:
                            case 404:
                            case 409:
                            case 302:
                            case 500:
                                Y.doccirrus.DCWindow.notice({
                                    type: 'error',
                                    message: PIN_FAIL
                                });
                                break;
                        }
                    }
                    // add additional code handling  TODO MOJ-413
                    // this has to be tested
                }

                function handleSubmit() {
                    var
                        myKP = Y.doccirrus.utils.setKeysForDevice( patientId ), // browser key pair
                        sharedSecret, prcPackage,
                        data;

                    if( !Y.doccirrus.utils.isNodeDCValid( node ) ) {
                        return;
                    }
                    if( !prcKey || !patientId ) {
                        Y.log( 'missing params', 'error', NAME );
                        return;
                    }

                    sharedSecret = Y.doccirrus.authpub.getSharedSecret( myKP.secret, prcKey );
                    prcPackage = {patientPin: pinField.val()};
                    prcPackage = Y.doccirrus.authpub.encJSON( sharedSecret, prcPackage );

                    data = {
                        prcPackage: prcPackage,
                        patientId: patientId,
                        patientPublicKey: myKP.publicKey,
                        pinHash: Y.doccirrus.authpub.generateHash( pinField.val() ),
                        prcKey: prcKey
                    };

                    Y.doccirrus.ajax.send( {
                        type: 'POST',
                        url: '/1/patientreg/:patientPRCRegister',
                        data: data,
                        success: function( body, status, xhr ) {
                            var
                                errors = Y.doccirrus.errorTable.getErrorsFromResponse( body );

                            if( errors && errors[0] ) {
                                Y.log( 'patientPRCRegister error: ' + JSON.stringify( errors ), 'debug', NAME );
                                Y.doccirrus.DCWindow.notice({
                                    type: 'error',
                                    message: PIN_FAIL,
                                    window: {
                                        width: Y.doccirrus.DCWindow.SIZE_SMALL
                                    }
                                });
                            } else {
                                handleSubmitResponse( xhr );
                            }
                        },
                        error: function( xhr ) {
                            handleSubmitResponse( xhr );
                        }
                    } );
                }

                function handleInputFocus( e ) {
                    var
                        target = $( e.currentTarget ),
                        tooltip,
                        debug = function( what ) {
                            Y.log( '-> ' + target.attr( 'id' ) + ': ' + what + ' tooltip on ' + e.type, 'debug', NAME );
                        };

                    if( !Y.UA.ios ) {
                        tooltip = $( '.tooltip', target.parent() );
                        switch( e.type ) {
                            case 'focusin':
                            case 'keyup':
                            case 'change':
                                if( target.closest( '.control-group' ).hasClass( 'has-error' ) ) {
                                    tooltip.tooltip( 'show' );
                                    $( '.tooltip-inner', tooltip ).css( 'max-width', '' );
                                    debug( 'showing' );
                                }
                                break;
                            default:
                                tooltip.tooltip( 'hide' );
                                debug( 'hiding' );
                        }
                    }
                }

                function validStatusChanged( valid ) {
                    Y.log( 'Valid status now: ' + valid, 'info', NAME );
                    if( valid ) {
                        $( '#btnSendReg' ).removeClass( 'disabled' );
                    } else {
                        $( '#btnSendReg' ).addClass( 'disabled' );
                    }
                }

                Y.doccirrus.utils.registerDCValidationAtNode( node, validStatusChanged );
                Y.doccirrus.utils.isNodeDCValid( node );

                $( 'body' ).
                    on( 'focusin change keyup blur focusout', 'input', handleInputFocus ).
                    on( 'click', 'input[type="checkbox"]', function( event ) {
                        $( event.currentTarget ).parents( '.control-group' ).removeClass( 'has-error' );
                    }
                );

                pinField = $( '#pin' );
                $( '#btnSendReg' ).on( 'click', handleSubmit );
            }
        };
    }, '0.0.1',
    {requires: [
        'mojito-client',
        'patientalert-schema',
        'dcutils'
    ]}
);
