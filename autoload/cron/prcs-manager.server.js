/**
 * User: MA
 * Date: 02/10/14  16:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI */
"use strict";
YUI.add( 'DCPRCSMgr', function( Y, NAME ) {
        function checkStatusCb( err, response ) {
            var reboot = false,
                message = 'Ihr Datensafe benötigt bei Gelegenheit einen Neustart (wegen erfolgter Updates). Bitte stecken sie einen USB Schlüssel in den Datensafe und starten Sie ihn neu. Verwaltung -> inSuite -> System -> Neustart';
            if( err ) {
                Y.log( 'Error checking status of prc:' + err, 'error', NAME );
                return err;
            }
            if( response && 0 < response.length && response[0].os ) {
                reboot = response[0].os.reboot;
                Y.log( 'The status of prc: ' + reboot, 'info', NAME );
                if (reboot){
                    Y.doccirrus.communication.emitNamespaceEvent( {
                        nsp: '/',
                        event: 'cli.reboot',
                        msg: {data:message}
                    } );
                }
            }

        }

        function checkStatus() {
            if( Y.doccirrus.auth.isPRC() ) {
                Y.doccirrus.api.cli.getStatus( {callback: checkStatusCb} );
            }
        }

        /**
         * MOJ-10242:
         * Linked-activity-api accidentally set treatments to 'CREATED' where diagnosis are assigned which were later changed.
         * Treatments in status 'CREATED' can usually never happen. So we hard update all treatments after 01.01.2018 in
         * status 'CREATED' to status 'VALID'.
         */
        function fixMOJ_10242() {
            const moment = require( 'moment' );
            const migrate = require( 'dc-core' ).migrate;

            if( !Y.doccirrus.ipc.isMaster() ) {
                return;
            }

            Y.log( `fixMOJ_10242: executed: iterate all tenants`, 'debug', NAME );
            migrate.eachTenantParallelLimit( ( user, callback ) => {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'mongoUpdate',
                    model: 'activity',
                    query: {
                        actType: 'TREATMENT',
                        status: 'CREATED',
                        timestamp: {
                            $gt: moment( '01.01.2018', 'DD.MM.YYYY' ).toDate()
                        }
                    },
                    data: {
                        $set: {status: 'VALID'}
                    },
                    options: {
                        multi: true
                    }
                }, ( err, result ) => {
                    if( err ) {
                        Y.log( `fixMOJ_10242: could not fix on ${user.tenantId}: ${err && err.stack || err}`, 'error', NAME );
                        callback( err );
                        return;
                    }
                    Y.log( `fixMOJ_10242: executed fix on ${user.tenantId}: ${JSON.stringify( result )}`, 'debug', NAME );
                    callback();
                } );

            }, 1, ( err ) => {
                if( err ) {
                    Y.log( `fixMOJ_10242: final error: ${err}`, 'error', NAME );
                    return;
                }

                Y.log( `fixMOJ_10242: fixed on all tenants`, 'debug', NAME );
            } );
        }

        Y.namespace( 'doccirrus' ).prcsmgr = {
            /**
             * periodically check for expired tenants and deactivate them
             */
            checkStatus: function() {
                checkStatus();
            }
        };
        if( Y.doccirrus.auth.isPRC() ) {
            Y.doccirrus.kronnd.on( 'Noon', Y.doccirrus.prcsmgr.checkStatus );
        }
        if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() ) {
            Y.doccirrus.kronnd.on( 'Noon', fixMOJ_10242 );
            setTimeout( fixMOJ_10242, 10000 );
        }

    },
    '0.0.1', { requires: [ 'dckronnd', 'cli-api', 'dccommunication','dcauth'] }
);


