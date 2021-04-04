/*global $, document, fun: true */
//TRANSLATION INCOMPLETE!! MOJ-3201
fun = function _fn( Y, NAME ) {
    'use strict';

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node   NB: The node MUST have an   id   attribute.
         */
        registerNode: function( node ) {

            var
                params = Y.doccirrus.utils.getQueryParams( document.location.search ),
                patientId = params.id,
                prcKey = params.spub, // PRC pk
                pinField, privacyField, intimeSlaField;

            function handleSubmit() {
                var
                    myKP = Y.doccirrus.utils.setKeysForDevice( patientId ), // store key pair on browser
                    sharedSecret, prcPackage,
                    data;

                if( !Y.doccirrus.utils.isNodeDCValid( node ) ) {
                    return;
                }

                if( !privacyField[0].checked || !intimeSlaField[0].checked ) {
                    privacyField.parents( '.control-group:first' ).addClass( 'has-error' );
                    return;
                }

                if( !patientId || !prcKey || !pinField.val() ) {
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
                    prcKey: prcKey,
                    browser: Y.doccirrus.comctl.getBrowser()
                };

                // send stuff to custom function
                Y.doccirrus.ajax.send( {
                    type: 'POST',
                    url: '/1/patientreg/:updatePatient',
                    data: data,
                    success: function( body ) {
                        var
                            errors = Y.doccirrus.errorTable.getErrorsFromResponse( body );

                        if( errors && errors[0] ) {
                            Y.Array.invoke( errors, 'display', 'error' );
                            return;
                        }

                        Y.doccirrus.utils.loadingDialog( 'success', 'Erfolg! Sie haben eine neue Arztpraxis hinzugefügt.' );
                        $( '#upperDiv' ).html( '' );
                        setTimeout( function() {
                            $( '#schedules' ).click();
                        }, 3000 );
                    },
                    error: function() {
                        Y.doccirrus.utils.loadingDialog( 'error', 'Ihre Anfrage kann zur Zeit nicht bearbeitet werden. Bitte versuchen Sie es später erneut.' );
                        $( '#upperDiv' ).html( '' );
                    }
                } );
            }

            function handleInputFocus( e ) {
                var currentTarget = $( e.currentTarget ),
                    tooltipLink;

                if( !Y.UA.ios ) {
                    tooltipLink = $( '.tooltip', currentTarget.parent() );
                    switch( e.type ) {
                        case 'focusin':
                        case 'change':
                        case 'keyup':
                            //if( $( 'div.tooltip', tooltipLink.parents( 'div:first' ) ).length === 0 ) {
                            tooltipLink.tooltip( 'show' );
                            break;
                        case 'blur':
                        case 'focusout':
                            tooltipLink.tooltip( 'hide' );
                            break;
                        default:
                            break;
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

            $( 'body' ).on( 'focusin change keyup blur focusout', 'input', handleInputFocus )
                .on( 'click', 'input[type="checkbox"]', function( event ) {
                    $( event.currentTarget ).parents( '.control-group' ).removeClass( 'has-error' );
                } );

            $( '#btnSendReg' ).on( 'click', handleSubmit );

            pinField = $( '#pin1' );
            privacyField = $( '#privacy' );
            intimeSlaField = $( '#intimesla' );

            // Y.mojito.binders.PatientAlertBinderMain.bind( node );

        },
        deregisterNode: function() {
            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //node.destroy();
        }
    };
};