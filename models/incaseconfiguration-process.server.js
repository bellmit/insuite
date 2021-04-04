/*global YUI */
'use strict';

// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

YUI.add( 'incaseconfiguration-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        const
            { formatPromiseResult } = require( 'dc-core' ).utils;

        /**
         * Is call on pre update the incase configuration. And controls if it is modified.
         * @param {Object} user: inSuite user.
         * @param {Object} incaseConfiguration: inCase configuration.
         * @param {Error|Object} callback: inCase configuration with flag if modified.
         */
        function setIsModified( user, incaseConfiguration, callback ) {
            incaseConfiguration.kimMessagePollingIsModified = incaseConfiguration.isModified( 'kimMessagePollingIntervalHours' ) ||
                                                             incaseConfiguration.isModified( 'kimMessagePollingIntervalEnabled' );

            callback( null, incaseConfiguration );
        }

        /**
         * Is called after inCase config save and checks if its modified. If true call the cronjob config to change the
         * polling time for emails.
         * @param {Object} user: inSuite user.
         * @param {Object} incaseconfiguration: inCase configuration.
         * @param {Function} callback: callback function.
         */
        function setKimPollingIntervalCronJobs( user, incaseconfiguration, callback ) {
            if( incaseconfiguration.kimMessagePollingIsModified ) {
                Y.doccirrus.kimManager.setAutomatedEmailCollect( user, incaseconfiguration );
            }
            callback();
        }

        /**
         * check if the new number greater than all assigned numbers then
         * update patient counter with the new number
         * this should always be the last pre-process
         *
         * @param user
         * @param incaseConfiguration
         * @param callback
         */
        async function UpdatePatientCounter( user, incaseConfiguration, callback ) {

            if( !user ) {   // inserting default data
                callback( null, incaseConfiguration );
                return;
            }

            if( !incaseConfiguration.nextPatientNo ) {
                callback( null, incaseConfiguration );
                return;
            }

            let err, nextNumber;

            [ err, nextNumber ] = await formatPromiseResult(
                Y.doccirrus.api.patient.getNextPatientNumber( user, incaseConfiguration.nextPatientNo )
            );

            if( err ) {
                Y.log( `UpdatePatientCounter: Could not get next patient number: ${err.stack||err}`, 'error', NAME );
                return callback( err );
            }

            if( incaseConfiguration.nextPatientNo === nextNumber ) { // the number is available
                Y.doccirrus.schemas.sysnum.updatePatientCounter( user, incaseConfiguration.nextPatientNo, function( err1 ) {
                    incaseConfiguration.nextPatientNo = undefined; // this is a computed field, therefore readonly
                    callback( err1, incaseConfiguration );
                } );
            } else {
                callback( Y.doccirrus.errors.rest( 7100, {$suggestedNumber: nextNumber }, true ) );
            }

        }

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class IncaseConfigurationProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'incaseconfiguration' ),
                    setIsModified,
                    UpdatePatientCounter
                ], forAction: 'write'},
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'incaseconfiguration' ),
                    UpdatePatientCounter
                ], forAction: 'delete'}
            ],
            post: [
                {run: [
                    setKimPollingIntervalCronJobs
                ], forAction: 'write'}
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: ['incaseconfiguration-schema', 'kimManager']}
);
