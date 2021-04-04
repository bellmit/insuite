/**
 * User: rrrw
 * Date: 27/12/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

YUI.add( 'practice-process', function( Y, NAME ) {
        /**
         * The DC Practice data schema definition
         *
         * @module DCPracticeProcess
         */

        const
            i18n = Y.doccirrus.i18n;


        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * Class Practice Processes --
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         *
         *      TODO:  this collection may only be written by the DCPRC (it's a copy)
         *             containing license info etc.
         *             An exception, is the notifications setting. Here it would
         *             be interesting to get the Info on the DCPRC.
         *             Needs audit logging for notifications: MOJ-9054
         */


        function setOnlyPracticesPatientsCanBookOnPUC( user, practice, callback ) {
            const originalData = practice.originalData_ || {};

            if( originalData.onlyPracticesPatientsCanBook !== practice.onlyPracticesPatientsCanBook ||
                originalData.vprcFQHostName !== practice.vprcFQHostName
            ) {
                Y.doccirrus.communication.callPUCAction( {
                    ensureDelivery: true,
                    action: 'setBookFlag',
                    params: {
                        customerIdPrac: practice.dcCustomerNo,
                        onlyPracticesPatientsCanBook: practice.onlyPracticesPatientsCanBook
                    }
                }, ( err ) => {
                    if( err ) {
                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: user.identityId,
                            event: 'message',
                            msg: {
                                data: i18n( 'practice-process.text.PUC_UNAVAILABLE' )
                            },
                            meta: {
                                level: 'ERROR'
                            }
                        } );
                    }
                    return callback( null, practice );
                } );
            } else {
                return callback( null, practice );
            }
        }


        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'practice' )
                ], forAction: 'write'},
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'practice' )
                ], forAction: 'delete'}
            ],

            post: [
                {run: [
                    setOnlyPracticesPatientsCanBookOnPUC
                ], forAction: 'write'},
                {run: [], forAction: 'delete'}
            ],
            audit: {},

            name: NAME
        };

    },
    '0.0.1', {requires: ['practice-schema']}
);
