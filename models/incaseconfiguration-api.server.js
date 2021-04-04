/*global YUI */
YUI.add( 'incaseconfiguration-api', function( Y, NAME ) {
        /** @module incaseconfiguration-api */

        /**
         * compute the value for nextPatientNo and return along with other fields
         * @param parameters
         */

        const
            { formatPromiseResult, handleResult } = require( 'dc-core' ).utils,
            ObjectId = require( 'mongoose' ).Types.ObjectId;

        /**
         *  Load the incase configuration from the database and optionally add nextPatientNo
         *
         *  @param  {Object}    args                        REST route
         *  @param  {Object}    args.user
         *  @param  {Object}    args.checkPatientNumber     Only if called by getConfigs
         *  @param  {Object}    args.callback
         *  @returns {Promise<*>}
         */

        async function readConfig( args ) {
            Y.log('Entering Y.doccirrus.api.incaseconfiguration.readConfig', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.incaseconfiguration.readConfig');
            }

            const
                { user, callback, checkPatientNumber } = args;

            let
                err, result, nextNumber, incaseconfiguration;

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'incaseconfiguration',
                    options: { limit: 1 }
                } )
            );

            if( err || !result || !result[0] ) {
                return callback( err || new Error( 'No Incase Configuration' ) );
            }

            incaseconfiguration = result[0];

            if ( !checkPatientNumber ) {
                //  in most cases it is not necessary to check the next patient number
                //  only used when calling from InCaseAdmin Settings tab
                return callback( null, incaseconfiguration );
            }

            //  load the next patient number for InCaseAdmin Settings tab
            [ err, nextNumber ] = await formatPromiseResult( Y.doccirrus.api.patient.getNextPatientNumber( user, null ) );

            if( err ) {
                Y.log( `readConfig: Could not check next patient number: ${err.stack||err}`, 'error', NAME );
                return callback( err );
            }

            incaseconfiguration.nextPatientNo = nextNumber;
            callback( null, incaseconfiguration );
        }

        /**
         * Updates incase configuration and creates/updates mastertabconfig
         *
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.inCaseConfig - incase config to save
         * @param {Array} args.data.masterTabConfigs - mastertab configs to save
         * @param {Boolean} [args.data.allowAdHoc] - flag which indicates should we set allowPRCAdhoc in current practice to true
         * @param {Function} args.callback
         * @returns {Function} callback
         */
        async function saveConfig( args ) {
            Y.log( 'Entering Y.doccirrus.api.incaseconfiguration.saveConfig', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.incaseconfiguration.saveConfig' );
            }
            const
                {data: {inCaseConfig, masterTabConfigs = [], allowAdHoc} = {}, user, callback} = args;

            function runDbCb( error, result ) {
                if( error ) {
                    return callback( error || 'Error Configuration Updating' );
                } else {
                    return callback( null, result );
                }
            }

            let err, newIncaseConfig, updatedMasterTabConfig = [], record;

            [err, newIncaseConfig] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'put',
                    model: 'incaseconfiguration',
                    fields: Object.keys( inCaseConfig ),
                    migrate: true,
                    query: {_id: Y.doccirrus.schemas.incaseconfiguration.getDefaultData()._id},
                    data: Y.doccirrus.filters.cleanDbObject( inCaseConfig )
                } )
            );

            if( err ) {
                Y.log( `saveConfig. Error while updating incaseconfiguration. Error: ${err.stack || err}`, 'warn', NAME );
                return runDbCb( err );
            }

            for( const masterTabConfig of masterTabConfigs.filter( item => item ) ) {
                if( masterTabConfig._id ) {
                    [err, record] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'put',
                            model: 'mastertabconfig',
                            query: {_id: masterTabConfig._id},
                            fields: Object.keys( masterTabConfig ),
                            data: Y.doccirrus.filters.cleanDbObject( masterTabConfig )
                        } )
                    );
                    if( err ) {
                        Y.log( `saveConfig. Error while updating mastertabconfig. Error: ${err.stack || err}`, 'warn', NAME );
                        return runDbCb( err );
                    }
                    updatedMasterTabConfig.push( record );
                } else {
                    [err, record] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            action: 'post',
                            model: 'mastertabconfig',
                            data: Y.doccirrus.filters.cleanDbObject( masterTabConfig ),
                            user: user,
                            options: {
                                entireRec: true
                            }
                        } ) );
                    if( err ) {
                        Y.log( `saveConfig. Error while creating mastertabconfig. Error: ${err.stack || err}`, 'warn', NAME );
                        return runDbCb( err );
                    }
                    updatedMasterTabConfig.push( record );
                }
            }

            if( allowAdHoc ) {
                // activate allowPRCAdhoc setting for current practice
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'put',
                            model: 'practice',
                            fields: ['allowPRCAdhoc'],
                            query: {},
                            data: Y.doccirrus.filters.cleanDbObject( {allowPRCAdhoc: true} )
                        }
                    )
                );
                if( err ) {
                    Y.log( `saveConfig. Error while updating allowPRCAdhoc field. Error: ${err.stack || err}`, 'warn', NAME );
                    return runDbCb( err );
                }
            }

            return runDbCb( null, {
                inCaseConfig: newIncaseConfig,
                masterTabConfigs: updatedMasterTabConfig
            } );
        }

        /**
         * Checks if this prc allows transfer or not
         * @method isTransferAllowed
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function isTransferAllowed( args ) {
            var
                user = args.user,
                callback = args.callback;

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'incaseconfiguration',
                options: {
                    limit: 1,
                    select: {
                        allowTransfer: 1
                    }
                }
            }, function( err, results ) {
                if( err ) {
                    return callback( err );
                }
                callback( err, results && results[0] && [results[0].allowTransfer] );
            } );

        }

        /**
         *  Get incaseconfiguration and mastertabconfigs
         *
         *  Legacy, only called from incase_tab_configuration.js
         *
         *  This is the only situation where we need to update the nextPatientNo on the incaseconfiguration
         *
         *  @param args
         */

        function getConfigs( args ){
            Y.log('Entering Y.doccirrus.api.incaseconfiguration.getConfigs', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.incaseconfiguration.getConfigs');
            }
            const
                { user, callback } = args,
                async = require( 'async' );
            async.series({
                inCaseConfig( next ){
                    Y.doccirrus.api.incaseconfiguration.readConfig({
                        user,
                        checkPatientNumber: true,
                        callback: next
                    });
                },
                masterTabConfigs( next ){
                    Y.doccirrus.mongodb.runDb({
                        user,
                        model: 'mastertabconfig',
                        action: 'get',
                        query: {},
                        options: {
                            sort: {
                                _id: -1
                            },
                            limit: 2
                        }
                    }, next );
                }
            }, callback );
        }

        /**
         * Returns a list of patient IDs older than 10 years
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} [args.callback]
         * @returns {Promise<Array>}
         */
        async function getOldPatientIds( args ) {
            Y.log('Entering Y.doccirrus.api.incaseconfiguration.getOldPatients', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.incaseconfiguration.getOldPatients');
            }
            const
                { user, callback } = args,
                moment = require('moment');

            let
                err,
                result,
                targetDate = moment().subtract(10, 'years').toDate(),
                patientIds,
                excludedActivityIds,
                recentPatientIds,
                oldPatientIds,
                floorDate,
                ceilDate,
                birthDate = moment().subtract(28, 'years').toDate(),
                ageLocBlacklist = [],
                ageGroup = [],
                markersBlacklist = [];

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'activity',
                    query: {
                        i_extra: {
                            $exists: true
                        }
                    },
                    options: {
                        lean: true,
                        limit: 1,
                        sort: {
                            _id: 1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `getOldPatients: Could not find descending imported activities: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            if( !result || !result[0] ) {
                err = new Error( 'No imported activities' );
                Y.log( `getOldPatients: Could not find descending imported activities: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            floorDate = getFloorExclusionDate( result[0]._id.toString() );

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'activity',
                    query: {
                        i_extra: {
                            $exists: true
                        }
                    },
                    options: {
                        lean: true,
                        limit: 1,
                        sort: {
                            _id: -1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `getOldPatients: Could not find ascending imported activities: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            if( !result || !result[0] ) {
                err = new Error( 'No imported activities' );
                Y.log( `getOldPatients: Could not find ascending imported activities: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            ceilDate = getCeilExclusionDate( result[0]._id.toString() );

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'aggregate',
                    pipeline: [
                        {
                            $match: {
                                timestamp: {$lt: targetDate}
                            }
                        },
                        {
                            $group: {_id:"$patientId"}
                        }
                    ],
                    model: 'activity'
                } )
            );

            if( err ) {
                Y.log( `getOldPatients: Could not find old activities: ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            if( !result.result || !result.result[0] ) {
                err = new Error( 'No old activities' );
                Y.log( `getOldPatients: Could not find old activities: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            patientIds = result.result.map( patient => patient._id ).filter( Y.doccirrus.commonutils.isObjectId );

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'patient',
                    query: {
                        _id: {$in: patientIds.map( ( _idStr ) => new ObjectId( _idStr ) )},
                        dob: {$gt: birthDate}
                    },
                    options: {
                        lean: true,
                        select: {
                            _id: 1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `getOldPatients: Could not query young patients ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            if ( result && result.length ) {
                ageGroup = result.map( patient => patient._id.toString() ).filter( Y.doccirrus.commonutils.isObjectId );
            }

            if ( ageGroup && ageGroup.length ) {

                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'aggregate',
                        pipeline: [
                            {
                                $match: {
                                    timestamp: {
                                        $lt: targetDate
                                    },
                                    $and: [
                                        {
                                            patientId: {$in: ageGroup}
                                        }, {
                                            // This is a hack for AOK to exclude the radiology. radiologists may have to keep information longer
                                            // than the GDPR time line for forgetting, so it's unclear which ruling wins.
                                            // Other rediologists need a better solution of course.
                                            locationId: {$eq: ObjectId( "5f4d40ab2256f73d1930e38d" )}
                                        }]
                                }
                            },
                            {
                                $group: {_id: "$patientId"}
                            }
                        ],
                        model: 'activity'
                    } )
                );

                if( err ) {
                    Y.log( `getOldPatients: Could not find old activities belonging to young patients: ${err.stack || err}`, 'error', NAME );
                    return handleResult( err, undefined, callback );
                }

                if( result.result && result.result.length ) {
                    ageLocBlacklist = result.result.map( patient => patient._id ).filter( Y.doccirrus.commonutils.isObjectId );
                }

                if( ageLocBlacklist && ageLocBlacklist.length ) {
                    patientIds = patientIds.filter( id => !ageLocBlacklist.includes( id ) );
                }
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'patient',
                    query: {
                        _id: {$in: patientIds.map( ( _idStr ) => new ObjectId( _idStr ) )},
                        // This is a hack for AOK to exclude the rhesus positive marker.
                        markers: {$eq: '60537bfc24b2cef7f675f5b9'}
                    },
                    options: {
                        lean: true,
                        select: {
                            _id: 1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `getOldPatients: Could not query markers ${err.stack || err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            if ( result && result.length ) {
                markersBlacklist = result.map( patient => patient._id.toString() ).filter( Y.doccirrus.commonutils.isObjectId );
            }

            if ( markersBlacklist && markersBlacklist.length ) {
                patientIds = patientIds.filter( id => !markersBlacklist.includes( id ) );
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'activity',
                    query: {
                        patientId: {$in: patientIds},
                        timestamp: {$gt: floorDate, $lt: ceilDate}
                    },
                    options: {
                        lean: true
                    }
                } )
            );

            if( err ) {
                Y.log( `getOldPatients: Could not find excluded activities: ${err.stack||err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            excludedActivityIds = result.map( activity => activity._id );

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'aggregate',
                    pipeline: [
                        {
                            $match: {
                                patientId: {$in: patientIds},
                                timestamp: {$gt: targetDate},
                                _id:{$nin: excludedActivityIds}
                            }
                        },
                        {
                            $group: {_id: "$patientId"}
                        }
                    ],
                    model: 'activity'
                } )
            );

            if( err ) {
                Y.log( `getOldPatients: Could not find recent activities: ${err.stack||err}`, 'error', NAME );
                return handleResult( err, undefined, callback );
            }

            recentPatientIds = result.result.map( patient => patient._id );

            oldPatientIds = patientIds.filter( id => !recentPatientIds.includes( id ) );
            oldPatientIds = oldPatientIds.filter( Y.doccirrus.commonutils.isObjectId );

            return handleResult( null, oldPatientIds, callback);

            function dateFromObjectId( objectId ) {
                return moment( new Date( parseInt( objectId.substring( 0, 8 ), 16 ) * 1000 ) );
            }

            function getFloorExclusionDate( id ) {
                let
                    date = dateFromObjectId( id );

                return date.subtract( 6, 'hours' ).toDate();
            }

            function getCeilExclusionDate( id ) {
                let
                    date = dateFromObjectId( id );

                return date.add( 6, 'hours' ).toDate();
            }
        }

        /**
         * Returns a list of patients older than 10 years with
         * lastname, firstname, kbvDob, _id and patientNo
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} [args.callback]
         * @returns {Promise<Array>}
         */
        async function getOldPatientList( args ) {
            Y.log( 'Entering Y.doccirrus.api.incaseconfiguration.getOldPatientList', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.incaseconfiguration.getOldPatientList' );
            }
            const {callback, user} = args;
            let error, patientIds, patients;

            [error, patientIds] = await formatPromiseResult(
                getOldPatientIds( {user} )
            );

            if( error ) {
                Y.log( `getOldPatientList: could not get patient IDs: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            if( !patientIds || !patientIds[0]) {
                error = new Error( 'No patient IDs found' );
                Y.log( `getOldPatientList: could not get patient IDs: ${error.stack || error}`, 'warn', NAME );
                return handleResult( undefined, [], callback );
            }

            [error, patients] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'patient',
                    query: {
                        _id: {$in: patientIds.map( ( _idStr ) => new ObjectId( _idStr ) )}
                    },
                    options: {
                        lean: true,
                        select: {
                            _id: 1,
                            firstname: 1,
                            lastname: 1,
                            kbvDob: 1,
                            patientNo: 1
                        }
                    }
                } )
            );

            if( error ) {
                Y.log( `getOldPatientList: could not get patients: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            Y.log( `getOldPatientList: found ${patients.length} patients`, 'debug', NAME );

            return handleResult( undefined, patients, callback );
        }

        async function deleteOldPatientsInBatches( args ) {
            Y.log( 'Entering Y.doccirrus.api.incaseconfiguration.deleteOldPatients', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.incaseconfiguration.deleteOldPatients' );
            }
            const {callback, user, data} = args;
            let
                error,
                patientIds = Y.doccirrus.commonutils.chunkArray( data.patientIdList, 100 );

            for( const batch of patientIds ) {
                [error] = await formatPromiseResult(
                    deleteOldPatients( {
                        user,
                        data: {
                            patientIdList: batch
                        }
                    } )
                );

                if( error ) {
                    Y.log( `deleteOldPatientsInBatches: error while deleting old patients: ${error.stack || error}`, 'error', NAME );
                    return handleResult( error, undefined, callback );
                }

                await Y.doccirrus.commonutils.delay( 1000 );
            }

            return handleResult( undefined, undefined, callback );
        }

        /**
         * Deletes the patients given by the patient IDs in data.patientList
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.data.patientIdList
         * @param {Object} args.user
         * @param {Function} [args.callback]
         * @returns {Promise<Object|*>}
         */
        async function deleteOldPatients( args ) {
            Y.log( 'Entering Y.doccirrus.api.incaseconfiguration.deleteOldPatients', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.incaseconfiguration.deleteOldPatients' );
            }
            const {callback, user, data} = args;
            let
                error,
                patientIds = data.patientIdList,
                patientIdObjs = patientIds.map((id)=>ObjectId(id));

            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                action: 'delete',
                query: {
                    _id: {$in: patientIdObjs}
                },
                options: {
                    override: true,
                    noAudit: true,
                    multi: true,
                    fast: true
                }
            } ) );

            if( error ) {
                Y.log( `deleteOldPatients: could not delete old patients: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patientversion',
                action: 'delete',
                query: {
                    patientId: {$in: patientIds}
                },
                options: {
                    override: true,
                    noAudit: true,
                    multi: true,
                    fast: true
                }
            } ) );

            if( error ) {
                Y.log( `deleteOldPatients: could not delete old patientVersions: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'delete',
                query: {
                    patientId: {$in: patientIds}
                },
                options: {
                    override: true,
                    noAudit: true,
                    multi: true,
                    fast: true
                }
            } ) );

            if( error ) {
                Y.log( `deleteOldPatients: could not delete old activities: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'reporting',
                action: 'delete',
                query: {
                    patientDbId: {$in: patientIds}
                },
                options: {
                    override: true,
                    noAudit: true,
                    multi: true,
                    fast: true
                }
            } ) );

            if( error ) {
                Y.log( `deleteOldPatients: could not delete old reportings: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                action: 'delete',
                query: {
                    patientId: {$in: patientIds}
                },
                options: {
                    override: true,
                    noAudit: true,
                    multi: true,
                    fast: true
                }
            } ) );

            if( error ) {
                Y.log( `deleteOldPatients: could not delete old casefolders: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'invoiceentry',
                action: 'delete',
                query: {
                    type: 'schein',
                    patientId: {$in: patientIds}
                },
                options: {
                    override: true,
                    noAudit: true,
                    multi: true,
                    fast: true
                }
            } ) );

            if( error ) {
                Y.log( `deleteOldPatients: could not delete old invoiceentries: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            return handleResult( undefined, undefined, callback );
        }

        Y.namespace( 'doccirrus.api' ).incaseconfiguration = {
            name: NAME,
            readConfig: readConfig,
            getConfigs,
            saveConfig: saveConfig,

            isTransferAllowed: function( args ) {
                Y.log('Entering Y.doccirrus.api.incaseconfiguration.isTransferAllowed', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.incaseconfiguration.isTransferAllowed');
                }
                isTransferAllowed( args );
            },

            getOldPatientIds,
            getOldPatientList,
            deleteOldPatients,
            deleteOldPatientsInBatches
        };

    },
    '0.0.1', { requires: [] }
);
