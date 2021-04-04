/**
 * User: MA
 * Date: 02/10/14  16:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI */
YUI.add( 'trial-checker', function( Y, NAME ) {
        "use strict";

        Y.namespace( 'doccirrus' ).trialChecker = {
            /**
             * periodically check for expired tenants and deactivate them
             */
            doTrials: function doTrials() {
                if( !Y.doccirrus.auth.isDCPRC() && !Y.doccirrus.auth.isVPRC() ) {
                    return;
                }
                Y.doccirrus.api.company.terminateExpiredTrials( {
                    user: Y.doccirrus.auth.getSUForLocal(),  // MOJ-5443
                    callback: function( err, count ) {
                        if( err ) {
                            Y.log( 'error in terminateExpiredTrials on CloseDay: ' + JSON.stringify( err ), 'error', NAME );
                        } else {
                            Y.log( 'terminateExpiredTrials is done: ' + count + ' trial tenant(s) were deactivated.', 'info', NAME );
                        }
                    }
                } );
            }
        };

        if (Y.doccirrus.auth.isDCPRC() || Y.doccirrus.auth.isVPRC()) {
            Y.doccirrus.kronnd.on( 'CloseDay', Y.doccirrus.trialChecker.doTrials );
        }
    },
    '0.0.1', { requires: [ 'dckronnd'] }
);


