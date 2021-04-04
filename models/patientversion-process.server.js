/**
 * User: do
 * Date: 02/09/14  18:05
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'patientversion-process', function( Y, NAME ) {
        /**
         * The DC PatientVersion data schema definition
         *
         * @module DCPatientProcess
         */
        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );
        const
            edmpcommonutils = Y.doccirrus.edmpcommonutils,
            moment = require( 'moment' ),
            {formatPromiseResult} = require( 'dc-core' ).utils;



        /**
         * Class Patient Processes --
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         */

        /**
         * update patientShort references of patientversion
         * @param {Object} user
         * @param {module:patientversionSchema.patientversion} patientVersion
         * @param {Function} callback
         */
        function updatePatientVersionRefs( user, patientVersion, callback ) {
            const patientShort = edmpcommonutils.getPatientShort( patientVersion );

            if( typeof patientShort.patientVersionId !== 'string' ) {
                patientShort.patientVersionId = patientShort.patientVersionId.toString();
            }

            Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'activity',
                migrate: true,
                query: {'patientId': patientVersion.patientId, 'patientShort.patientVersionId': patientVersion._id.toString()},
                data: {patientShort: patientShort},
                options: {
                    multi: true
                }
            }, function( err ) {
                if( err ) {
                    return callback( err );
                }
                callback();
            } );
        }

        /**
         * @method Called from WRITE post process
         * @see KUN-239
         *
         * Update references of patientVersion for schein reporting entries.
         *
         * patientVersion context is only created during generation of the reporting entry.
         * Hence, when a new patientVersion is created, the reporting entries of certain scheins need to be regenerated:
         * - All public scheins of the current quarter for that patient
         * - All non-public scheins of that patient
         *
         * @param {Object} user
         * @param {module:patientversionSchema.patientversion} patientVersion
         * @param {Function} callback
         */
        async function updatePatientVersionRefsInReporting( user, patientVersion, callback ) {
            const
                patientId = patientVersion.patientId,
                patientVersionDate = moment( patientVersion.timestamp ),
                patientVersionQuarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( patientVersionDate.quarter(), patientVersionDate.year() ),
                nonPublicScheinTypes = Y.doccirrus.schemas.v_contract.scheinActTypes.filter( actType => actType !== 'SCHEIN' );

            let err, activitiesToRegenerate;

            [err, activitiesToRegenerate] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        query: {
                            $or: [
                                {
                                    patientId: patientId,
                                    timestamp: {
                                        $gte: patientVersionQuarterRange.start,
                                        $lte: patientVersionQuarterRange.end
                                    },
                                    actType: "SCHEIN"
                                },
                                {
                                    patientId: patientId,
                                    actType: {$in: nonPublicScheinTypes}
                                }
                            ]
                        },
                        options: {
                            select: {
                                _id: 1
                            }
                        }
                    }
                )
            );

            if( err ) {
                Y.log( `updatePatientVersionRefsInReporting: Error while getting activities for which reporting needs to be updated ${err.stack || err}.`, 'error', NAME );
                return callback( null, patientVersion );
            }

            if( !activitiesToRegenerate || !Array.isArray( activitiesToRegenerate ) || !activitiesToRegenerate.length ) {
                Y.log( 'updatePatientVersionRefsInReporting: Found no activities for which reporting needs to be updated.', 'debug', NAME );
                return callback( null, patientVersion );
            }

            activitiesToRegenerate.forEach( activity => {
                Y.doccirrus.insight2.utils.requestReporting( user, 'ACTIVITY', activity._id );
            } );

            callback( null, patientVersion );
        }

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                // reuse patient process
                {run: [], forAction: 'write'}
            ],
            post: [
                {
                    run: [
                        updatePatientVersionRefs,
                        updatePatientVersionRefsInReporting
                    ], forAction: 'write'
                }
            ],
            name: NAME
        };

    },
    '0.0.1', {requires: ['patient-schema', 'patient-api', 'patient-process']}
);
