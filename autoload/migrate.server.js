/**
 * User: rw
 * Date: 12.08.2013
 * (c) 2013, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
/*jshint latedef:false */

'use strict'; //eslint-disable-line

YUI.add( 'dcmigrate', function( Y, NAME ) {
        const
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            util = require( 'util' ),
            ObjectId = require( 'mongoose' ).Types.ObjectId;

        let
            migrating = false,
            moment = require( 'moment' ),
            semver = require( 'semver' ),
            i18n = Y.doccirrus.i18n, // 1 mins
            vprcMongoMigrateTo_3_4_called = false;

        // --------------------------------------------------------  MIGRATE FNS

        // DECLARE THEM HERE

        //  THEY MUST BE IDEMPOTENT -- CALL MANY TIMES = SAME RESULT, GIVEN UNCHANGED DB.
        // e.g. for multiple restart, or "branching versions problem"

        /**
         * The signature of all Migrate functions that act on a tenant
         * must be as described here.   function( user, callback)
         *
         * @param {Object} user
         * @param {Function} callback  the procedure to call after all changes have
         *                 been made in the db.
         */



        function migrateVirtualRepetitionToSchedule_3_0( user, callback ) {
            let
                async = require( 'async' );

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'schedule', true, ( err, scheduleModel ) => {
                        next( err, scheduleModel );
                    } );
                },
                function( scheduleModel, next ) {
                    let error,
                        now = moment().format(),
                        stream = scheduleModel.mongoose.find( {until: {$gt: now}}, {}, {timeout: true} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function migrationMaster( results ) {
                        if( results ) {
                            Y.log( `Datasafe contains not migrated series (repetitions).  Requires a conversion or the customer will lose calendar entries.`, 'error', NAME );
                        }
                        stream.destroy();
                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', migrationMaster ).on( 'error', onError ).on( 'close', finalCb );

                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateVirtualRepetitionToSchedule_3_0 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateVirtualRepetitionToSchedule_3_0 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );

        }

        function migratePatientCareLevel_3_0( user, callback ) {
            const async = require( 'async' );

            function finalCb( err, results ) {
                if( err ) {
                    Y.log( `migratePatientCareLevel_3_0 migrated for tenant ${user.tenantId} with error: ${err}`, 'error', NAME );
                    callback( err );
                    return;
                }
                Y.log( `migratePatientCareLevel_3_0 migrated for tenant ${user.tenantId} results: ${results.join( ', ' )}`, 'debug', NAME );
                callback();
            }

            function modelCb( err, model ) {

                if( err ) {
                    Y.log( `migratePatientCareLevel_3_0 migrating for tenant ${user.tenantId} could not get model error: ${err}`, 'error', NAME );
                    callback( err );
                    return;
                }

                const seriesSteps = [
                    ['NO', 'NO'],
                    ['ZERO', 'ONE'],
                    ['ONE', 'TWO'],
                    ['TWO', 'THREE'],
                    ['THREE', 'FOUR']
                ].map( config => {
                    return ( cb ) => {
                        Y.log( `migratePatientCareLevel_3_0 migrating for tenant ${user.tenantId} updating ${config[0]} with ${config[1]}`, 'debug', NAME );
                        model.mongoose.collection.update( {careLevel: config[0]}, {
                            $set: {careDegree: config[1]},
                            $unset: {careLevel: 1}
                        }, {multi: true}, cb );
                    };
                } );

                async.series( seriesSteps, finalCb );
            }

            Y.log( `migratePatientCareLevel_3_0 migrating for tenant ${user.tenantId}`, 'debug', NAME );

            Y.doccirrus.mongodb.getModel( user, 'patient', true, modelCb );
        }

        function migrateFlows_3_3( user, callback ) {
            function modelCb( err, model ) {

                if( err ) {
                    Y.log( `migratePatientCareLevel_3_0 migrating for tenant ${user.tenantId} could not get model error: ${err}`, 'error', NAME );
                    callback( err );
                    return;
                }

                model.mongoose.collection.find( {"sources.0.fileType": "DEVICE_SERVER"} ).forEach(
                    function( doc ) {
                        if( !doc.sources[0].deviceServers ) {
                            doc.sources[0].deviceServers = [doc.sources[0].deviceServer];
                        } else if( doc.sources[0].deviceServers.indexOf( doc.sources[0].deviceServer ) > -1 ) {
                            doc.sources[0].deviceServers.push( doc.sources[0].deviceServer );
                        }
                        delete doc.sources[0].deviceServer;
                        model.mongoose.collection.save( doc );
                    }
                );
                model.mongoose.collection.find( {"sinks.0.fileType": "DEVICE_SERVER"} ).forEach(
                    function( doc ) {
                        if( !doc.sinks[0].deviceServers ) {
                            doc.sinks[0].deviceServers = [doc.sinks[0].deviceServer];
                        } else if( doc.sinks[0].deviceServers.indexOf( doc.sinks[0].deviceServer ) > -1 ) {
                            doc.sinks[0].deviceServers.push( doc.sinks[0].deviceServer );
                        }
                        delete doc.sinks[0].deviceServer;
                        model.mongoose.collection.save( doc );
                    }
                );
                callback( null, true );
            }

            Y.doccirrus.mongodb.getModel( user, 'flow', true, modelCb );
        }

        /**
         * cahnge cardio-schema.exportDate type from String to Date
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateCardioExportDate_3_0( user, callback ) {
            let
                async = require( 'async' );
            Y.log( `migrateCardioExportDate_3_0 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'cardio', true, ( err, cardioModel ) => {
                        next( err, cardioModel );
                    } );
                },
                function( cardioModel, next ) {
                    let error,
                        stream = cardioModel.mongoose.find( {
                            exportDate: {$type: 2}
                        }, {exportDate: 1}, {timeout: true} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function setCode( cardio ) {
                        let
                            exportDate;
                        stream.pause();
                        exportDate = new Date( cardio.exportDate );

                        cardioModel.mongoose.update( {
                            _id: cardio._id
                        }, {
                            $set: {
                                exportDate: exportDate
                            }
                        }, function( err ) {
                            if( err ) {
                                return stream.destroy( err );
                            }
                            stream.resume();
                        } );
                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', setCode ).on( 'error', onError ).on( 'close', finalCb );
                }

            ], function( err ) {
                if( err ) {
                    Y.log( `migrateCardioExportDate_3_0 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateCardioExportDate_3_0 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * Migrates patient medication data into activity "MEDDATA"
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateMedicationData_3_0( user, callback ) {
            let
                async = require( 'async' );
            Y.log( `migrateMedicationData_3_0 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'patient', true, ( err, patientModel ) => {
                        next( err, patientModel );
                    } );
                }, function( patientModel, next ) {
                    let error,
                        stream = patientModel.mongoose.find( {
                            $or: [
                                {
                                    height: {$exists: true}
                                }, {
                                    weight: {$exists: true}
                                }, {
                                    smoker: {$exists: true}
                                }, {
                                    gender: 'FEMALE',
                                    cycleDaysMenorrhoea: {$exists: true}
                                }, {
                                    gender: 'FEMALE',
                                    dayOfLastMenorrhoea: {$exists: true}
                                }]
                        }, {}, {timeout: true, lean: true} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function migrateData( patient ) {
                        stream.pause();
                        async.waterfall( [

                            function( next ) {

                                Y.doccirrus.api.activity.getActivityDataForPatient( {
                                    user,
                                    data: {
                                        patient,
                                        useFirstSuitableInsurance: true
                                    },
                                    migrate: true,
                                    callback: next
                                } );
                            }, function( activity, next ) {
                                let
                                    moment = require( 'moment' );

                                activity.timestamp = moment().toISOString();
                                activity.actType = 'MEDDATA';
                                activity.status = 'CREATED';
                                activity.medData = [];
                                if( patient.height ) {
                                    activity.medData.push( {
                                        type: Y.doccirrus.schemas.v_meddata.medDataTypes.HEIGHT,
                                        value: patient.height,
                                        unit: 'm'
                                    } );
                                }
                                if( patient.weight ) {
                                    activity.medData.push( {
                                        type: Y.doccirrus.schemas.v_meddata.medDataTypes.WEIGHT,
                                        value: patient.weight,
                                        unit: 'kg'
                                    } );
                                }
                                if( patient.smoker ) {
                                    activity.medData.push( {
                                        type: Y.doccirrus.schemas.v_meddata.medDataTypes.SMOKER,
                                        textValue: i18n( 'InCaseMojit.MedDataEditorModel_clientJS.title.HEAVY_SMOKER' )
                                    } );
                                }
                                if( 'FEMALE' === patient.gender && patient.cycleDaysMenorrhoea ) {
                                    activity.medData.push( {
                                        type: Y.doccirrus.schemas.v_meddata.medDataTypes.CYCLE_LENGTH,
                                        value: patient.cycleDaysMenorrhoea,
                                        unit: i18n( 'v_meddata-schema.unit.CYCLE_LENGTH' )
                                    } );
                                }
                                if( 'FEMALE' === patient.gender && patient.dayOfLastMenorrhoea ) {
                                    activity.medData.push( {
                                        type: Y.doccirrus.schemas.v_meddata.medDataTypes.LAST_MENSTRUATION,
                                        textValue: moment( patient.dayOfLastMenorrhoea ).format( i18n( 'general.TIMESTAMP_FORMAT' ) )
                                    } );
                                }
                                if( 1 === activity.medData.length && Y.doccirrus.schemas.v_meddata.medDataTypes.CYCLE_LENGTH === activity.medData[0].type && 28 === activity.medData[0].value ) {
                                    Y.log( `migrateMedicationData_3_0. Patient with id ${patient._id.toString()} was no migrated. only cycleDaysMenorrhoea was set to 28.`, 'info', NAME );
                                    return setImmediate( next );
                                }
                                Y.doccirrus.api.activity.createActivitySafe( {
                                    user,
                                    skipPrePostProcesses: true,
                                    data: Object.assign( {}, activity ),
                                    migrate: true,
                                    plainObjectFormatter( _activity, callback ) {
                                        async.series( [
                                            function( next ) {
                                                if( 'VALID' === _activity.status ) {
                                                    return setImmediate( next );
                                                }
                                                Y.doccirrus.api.casefolder.checkCaseFolder( {
                                                    user: user,
                                                    query: {
                                                        patientId: patient._id.toString(),
                                                        additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR
                                                    },
                                                    data: {
                                                        patientId: _activity.patientId,
                                                        additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR,
                                                        start: new Date(),
                                                        title: Y.doccirrus.i18n( 'casefolder-schema.additionalCaseFolderTypes.ERROR' )
                                                    },
                                                    callback( err, caseFolder ) {
                                                        if( err ) {
                                                            return next( err );
                                                        }
                                                        _activity.caseFolderId = caseFolder._id.toString();
                                                        next();
                                                    }
                                                } );
                                            },
                                            function( next ) {
                                                if( 'VALID' !== _activity.status ) {
                                                    return setImmediate( next );
                                                }
                                                Y.doccirrus.api.activity.checkTransition( {
                                                    data: _activity,
                                                    callback: next
                                                } );
                                            },
                                            function( next ) {
                                                if( 'VALID' !== _activity.status ) {
                                                    return setImmediate( next );
                                                }

                                                Y.doccirrus.api.activity.setEmployeeName( {
                                                    user,
                                                    data: _activity,
                                                    callback: next
                                                } );
                                            },
                                            function( next ) {
                                                if( 'VALID' !== _activity.status ) {
                                                    return setImmediate( next );
                                                }
                                                Y.doccirrus.api.activity.updateEditor( {
                                                    user,
                                                    data: _activity,
                                                    callback: next
                                                } );
                                            },
                                            function( next ) {
                                                if( 'VALID' !== _activity.status ) {
                                                    return setImmediate( next );
                                                }
                                                Y.doccirrus.api.activity.generateContent( {
                                                    user,
                                                    data: {
                                                        activity: _activity
                                                    },
                                                    callback: next
                                                } );
                                            }
                                        ], function( err ) {
                                            callback( err );
                                        } );

                                    },
                                    callback: next
                                } );
                            }
                        ], function( err ) {
                            if( err ) {
                                Y.log( `migrateMedicationData_3_0. Error in patient migration. patientId: ${patient._id.toString()}`, 'error', NAME );
                            } else {
                                patientModel.mongoose.collection.update( {_id: patient._id}, {
                                    $unset: {
                                        height: 1,
                                        weight: 1,
                                        smoker: 1,
                                        cycleDaysMenorrhoea: 1,
                                        dayOfLastMenorrhoea: 1
                                    }
                                } );
                            }
                            stream.resume();
                        } );
                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', migrateData ).on( 'error', onError ).on( 'close', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateMedicationData_3_0 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateMedicationData_3_0 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         *  Fix act activities which are missing their content field, but have userContent or code
         *  Will also update reporting entries for any affected activities
         *
         *  @param {Object} user
         *  @param {Function} callback
         */

        function migrateLabdataContent_3_0( user, callback ) {
            Y.doccirrus.insight2.migrationhelper.fixMissingActContent( user, true, onStepComplete );

            function onStepComplete( err ) {
                if( err ) {
                    Y.log( "migrateLabdataContent_3_0 error: " + err, 'error', NAME );
                    return callback( err );
                }
                Y.log( "migrateLabdataContent_3_0 complete", 'debug', NAME );
                callback( null );
            }
        }

        /**
         *  Fix reportings, particularly LABDATA, which actType has been set to empty string
         *
         *  @param {Object} user
         *  @param {Function} callback
         */

        function migrateReportingActType_3_0( user, callback ) {
            Y.doccirrus.insight2.migrationhelper.fixMissingActType( user, true, callback );
        }

        /**
         *  Fix reportings, age.
         *
         *  @param {Object} user
         *  @param {Function} callback
         */
        function migrateAge_3_0( user, callback ) {
            let async = require( 'async' );
            Y.log( "migrateAge_3_0: start...", 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'reporting', true, ( err, repModel ) => {
                        next( err, repModel );
                    } );
                }, function( repModel, next ) {
                    let cur = repModel.mongoose.collection.find( {age: {$exists: true}} ).stream();
                    let updates = 0;
                    let notApplicable = 0;

                    cur.on( "error", err => {
                        Y.log( "migrateAge_3_0 error: " + err, 'error', NAME );
                    } );

                    cur.on( "data", reporting => {
                        let age = reporting.age;
                        if( !age ) {
                            notApplicable++;
                            return;
                        }

                        if( "string" === typeof age ) {
                            updates++;
                            repModel.mongoose.collection.update( {_id: reporting._id}, {$set: {age: Number( age )}} );
                        } else {
                            notApplicable++;
                        }
                    } );

                    cur.on( "end", () => {
                        Y.log( "migrateAge_3_0: updated " + updates + " entries.(" + notApplicable + " age was not a string)" );
                        next();
                    } );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( "migrateAge_3_0 error: " + err, 'error', NAME );
                }
                callback();
            } );
        }

        /**
         *  EXTMOJ-576
         *  Unset arrival time if not set (getNotArrivedTime)
         *
         *  @param {object} user
         *  @param {function} callback
         */
        function migrateArrivalTime_3_0( user, callback ) {
            Y.log( "migrateArrivalTime_3_0: start...", 'debug', NAME );

            Y.doccirrus.api.reporting.reportingDBaction( {
                mongoose: true,
                user,
                action: 'update',
                query: {
                    scheduleId: {$exists: true},
                    arrivalTime: Y.doccirrus.schemas.calendar.getNotArrivedTime()
                },
                data: {$unset: {arrivalTime: 1}},
                options: {multi: true},
                callback: ( err ) => {

                    if( err ) {
                        Y.log( "migrateArrivalTime_3_0 error: " + err, 'error', NAME );
                    } else {
                        Y.log( "migrateArrivalTime_3_0 completed..." );
                    }
                    callback();
                }
            } );
        }

        /**
         *  Change "icon" field in marker
         *
         *  @param {Object} user
         *  @param {Function} callback
         */

        function migrateMarkersIcon_3_1( user, callback ) {
            let async = require( 'async' );
            Y.log( "migrateMarkersIcon_3_1: start...", 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'marker', true, ( err, markerModel ) => {
                        next( err, markerModel );
                    } );
                }, function( markerModel, next ) {
                    let cur = markerModel.mongoose.collection.find( {icon: {$nin: [/^glyphicon /, /^fa /]}} ).stream();

                    cur.on( "error", err => {
                        Y.log( "migrateMarkersIcon_3_1 error: " + err, 'error', NAME );
                    } );

                    cur.on( "data", marker => {
                        let icon = marker.icon;
                        if( icon === 'deaf' ) {
                            markerModel.mongoose.collection.update( {_id: marker._id}, {$set: {icon: "fa fa-" + icon}} );
                        } else {
                            markerModel.mongoose.collection.update( {_id: marker._id}, {$set: {icon: "glyphicon glyphicon-" + icon}} );
                        }
                    } );

                    cur.on( "end", () => {
                        Y.log( "migrateMarkersIcon_3_1 completed..." );
                        next();
                    } );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( "migrateMarkersIcon_3_1 error: " + err, 'error', NAME );
                }
                callback();
            } );
        }

        /**
         * Set status value for status text
         *   @param {Object} user object
         *   @param {Function} callback function
         */
        function migrateActivityStatusReport_3_1( user, callback ) {
            let async = require( 'async' ),
                actStatusList = Y.doccirrus.schemas.activity.types.ActStatus_E.list;
            Y.log( 'migrateActivityStatusReport_3_1: start...', 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'reporting', true, ( err, repModel ) => {
                        next( err, repModel );
                    } );
                }, function( repModel, next ) {
                    let cur = repModel.mongoose.collection.find( {activityStatus: {$exists: true}} ).stream(),
                        updates = 0;

                    cur.on( 'error', err => Y.log( `migrateActivityStatusReport_3_1 error:  ${err}`, 'error', NAME ) );

                    cur.on( 'data', reporting => {
                        let status = actStatusList.find( ( item ) => item.i18n === reporting.activityStatus );
                        status = status ? status.val : null;
                        if( status ) {
                            updates++;
                            repModel.mongoose.collection.update( {_id: reporting._id}, {$set: {status: status}} );
                        }
                    } );

                    cur.on( 'end', () => {
                        Y.log( `migrateActivityStatusReport_3_1: updated  ${updates}`, 'debug', NAME );
                        next();
                    } );
                }
            ], ( err ) => {
                if( err ) {
                    Y.log( `migrateActivityStatusReport_3_1 error:  ${err}`, 'error', NAME );
                }
                callback();
            } );
        }

        /**
         *  Add latest MEDDATA entries to patient objects so that these can be mapped into forms, MOJ-7587
         *  @param {Object} user
         *  @param {Function} callback
         */

        function migrateSetLatestMedData_3_1( user, callback ) {
            Y.log( 'Starting migration to set latestMedData on patient obejcts, tenant: ' + user.tenantId, 'debug', NAME );
            Y.doccirrus.inCaseUtils.migrationhelper.setLatestMedDataOnPatients( user, true, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( 'Error during setLatestMedDataOnPatients migration: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                Y.log( 'Completed migration to set latestMedData on patient objects, ternant: ' + user.tenantId, 'debug', NAME );
                callback( null );
            }
        }

        /**
         * Moves omim fields to first element of omimCode array.
         *
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateOmimCodes_3_1( user, callback ) {
            Y.log( 'Starting migration migrateOmimCodes_3_1, tenant: ' + user.tenantId, 'debug', NAME );

            const
                query = {
                    actType: 'TREATMENT',
                    $or: [
                        {
                            $and: [
                                {fk5070: {$ne: null}},
                                {fk5070: {$ne: ''}}
                            ]
                        },
                        {
                            $and: [
                                {fk5071: {$ne: null}},
                                {fk5071: {$ne: ''}}
                            ]
                        },
                        {
                            $and: [
                                {fk5072: {$ne: null}},
                                {fk5072: {$ne: ''}}
                            ]
                        },
                        {
                            $and: [
                                {fk5073: {$ne: null}},
                                {fk5073: {$ne: ''}}
                            ]
                        }
                    ]
                };

            let stream, error;

            function modelCb( err, activityModel ) {
                if( err ) {
                    return callback( err );
                }
                stream = activityModel.mongoose.collection.find( query, {}, {timeout: true} ).stream();
                stream.on( 'data', function( activity ) {
                    stream.pause();
                    if( activity.omimCodes && 0 < activity.omimCodes.length ) {
                        stream.resume();
                        return;
                    }
                    activityModel.mongoose.collection.update( {
                        _id: activity._id
                    }, {
                        $set: {
                            omimCodes: [
                                {
                                    fk5070ValidAt: activity.fk5070ValidAt || null,
                                    fk5071ValidAt: activity.fk5071ValidAt || null,
                                    fk5073: activity.fk5073 || null,
                                    fk5072: activity.fk5072 || null,
                                    fk5071: activity.fk5071 || null,
                                    fk5070: activity.fk5070 || null
                                }
                            ]
                        }, $unset: {
                            fk5070ValidAt: '',
                            fk5071ValidAt: '',
                            fk5073: '',
                            fk5072: '',
                            fk5071: '',
                            fk5070: ''
                        }
                    }, ( err ) => {
                        if( err ) {
                            stream.destroy( err );
                            return;
                        }
                        stream.resume();
                    } );
                } ).on( 'error', function( err ) {
                    Y.log( 'migrating migrateOmimCodes_3_1 stream error' + err + ' tenant: ' + user.tenantId, 'error', NAME );
                    error = err;
                } ).on( 'end', function() {
                    Y.log( 'migrating migrateOmimCodes_3_1 stream end, tenant: ' + user.tenantId, 'info', NAME );
                    callback( error );
                } );
            }

            Y.doccirrus.mongodb.getModel( user, 'activity', true, modelCb );
        }

        /**
         * checks all media imports for mismatched activity associations
         *
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateMisassignedMediaImports_3_1( user, callback ) {
            Y.log( 'Starting migration migrateMisassignedMediaImports_3_1, tenant: ' + user.tenantId, 'debug', NAME );
            let mongoose = require( 'mongoose' );
            let objectId = mongoose.Types.ObjectId;

            let activityModel;
            let devicelogModel;
            let practiceModel;

            function modelCb( err ) {
                if( err ) {
                    return callback( err );
                }

                const query = {
                    status: "PROCESSED",
                    activityId: {$exists: true}
                };

                let error;
                let count = 0;
                let errornous = 0;

                let stream = devicelogModel.mongoose.collection.find( query, {}, {timeout: true} ).stream();

                stream.on( 'data', logEntry => {
                    stream.pause();
                    count++;
                    activityModel.mongoose.collection.findOne( {_id: objectId( logEntry.activityId )} ).then( loggedActivity => {
                        if( logEntry.patientId !== loggedActivity.patientId ) {
                            errornous++;
                        }
                        stream.resume();
                    } ).catch( callback );

                } ).on( 'error', err => {
                    Y.log( 'migrating migrateMisassignedMediaImports_3_1 stream error' + err + ' tenant: ' + user.tenantId, 'error', NAME );
                    error = err;
                } ).on( 'end', () => {
                    if( errornous > 0 ) {
                        practiceModel.mongoose.collection.findOne( {} ).then( praxis => {
                            // Warning: this code will not work for some dataasafes from v. 4.2. bcs of email settings!!!
                            Y.doccirrus.email.sendEmail( {
                                user,
                                to: 'support@doc-cirrus.com',
                                from: 'cc@doc-cirrus.com',
                                subject: 'Attachments in falschen Aktivitäten: ' + praxis.coname,
                                text: errornous + " Einträge im Mediabuch sind mit einer Aktivität verlinkt,\ndie nicht zu dem gelisteten Patient im Mediabuch gehören.\nGesamt Anzahl geprüfter Einträge die einer aktivität zugeordnet sind: " + count + " (" + Math.round( errornous / count * 100 ) + "% fehlerhaft)"
                            }, () => {
                            } );
                        } ).catch( callback );
                    }
                    Y.log( 'migrating migrateMisassignedMediaImports_3_1 stream end, tenant: ' + user.tenantId, 'info', NAME );
                    callback( error );
                } );
            }

            require( 'async' ).parallel( [
                function( done ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, ( err, model ) => {
                        activityModel = model;
                        done( err );
                    } );
                },
                function( done ) {
                    Y.doccirrus.mongodb.getModel( user, 'devicelog', true, ( err, model ) => {
                        devicelogModel = model;
                        done( err );
                    } );
                },
                function( done ) {
                    Y.doccirrus.mongodb.getModel( user, 'practice', true, ( err, model ) => {
                        practiceModel = model;
                        done( err );
                    } );
                }
            ], function( err ) {
                if( err ) {
                    return callback( err );
                } else {
                    modelCb();
                }
            } );
        }

        /**
         *  Change all glyphicons in markers to fa icons
         *
         *  @param {Object} user
         *  @param {Function} callback
         */

        function migrateMarkerIcons_3_2( user, callback ) {
            let async = require( 'async' );
            Y.log( "migrateMarkerIcons_3_2: start...", 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'marker', true, ( err, markerModel ) => {
                        next( err, markerModel );
                    } );
                }, function( markerModel, next ) {
                    let cur = markerModel.mongoose.collection.find( {icon: /glyphicon /} ).stream();

                    cur.on( "error", err => {
                        Y.log( "migrateMarkerIcons_3_2 error: " + err, 'error', NAME );
                    } );

                    cur.on( "data", marker => {
                        let icon = marker.icon.substring( 20 );
                        switch( icon ) {
                            case 'record':
                                return markerModel.mongoose.collection.update( {_id: marker._id}, {$set: {icon: "fa fa-dot-circle-o"}} );
                            case 'eye-open':
                                return markerModel.mongoose.collection.update( {_id: marker._id}, {$set: {icon: "fa fa-eye"}} );
                            case 'eye-close':
                                return markerModel.mongoose.collection.update( {_id: marker._id}, {$set: {icon: "fa fa-eye-slash"}} );
                            case 'repeat':
                                return markerModel.mongoose.collection.update( {_id: marker._id}, {$set: {icon: "fa fa-rotate-right"}} );
                            default:
                                return markerModel.mongoose.collection.update( {_id: marker._id}, {$set: {icon: "fa fa-" + icon}} );
                        }
                    } );

                    cur.on( "end", () => {
                        Y.log( "migrateMarkerIcons_3_2 completed..." );
                        next();
                    } );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( "migrateMarkerIcons_3_2 error: " + err, 'error', NAME );
                }
                callback();
            } );
        }

        function migrateCheckReceiptTotalsOnInvoices_3_2( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.checkReceiptTotalsOnInvoices( user, true, callback );
        }

        /**
         *  gives every activity lacking a casefolder the standard inBox/error casefolder
         *
         *  @param {Object} user
         *  @param {Function} callback
         */
        function migrateCasefolderless_3_2( user, callback ) {
            let activityModel;

            function findCasefolderLess( err ) {
                if( err ) {
                    return callback( err );
                }

                const query = {
                    $or: [
                        {caseFolderId: {$exists: false}},
                        {caseFolderId: ""}
                    ]
                };

                let error;
                let count = 0;

                let stream = activityModel.mongoose.collection.find( query, {}, {timeout: true} ).stream();

                stream.on( 'data', activity => {
                    stream.pause();
                    count++;

                    Y.doccirrus.api.casefolder.checkCaseFolder( {
                        user: user,
                        query: {
                            patientId: activity.patientId,
                            additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR
                        },
                        data: {
                            patientId: activity.patientId,
                            additionalType: Y.doccirrus.schemas.casefolder.additionalTypes.ERROR,
                            start: new Date(),
                            title: Y.doccirrus.i18n( 'casefolder-schema.additionalCaseFolderTypes.ERROR' ),
                            skipcheck_: true
                        },
                        callback: ( err, res ) => {
                            if( err || !res ) {
                                return callback( err || "err_no_error_casefolder" );
                            }
                            activityModel.mongoose.collection.update( {
                                _id: activity._id
                            }, {
                                $set: {
                                    caseFolderId: res._id.toString(),
                                    status: "VALID"
                                }
                            }, ( err ) => {
                                if( err ) {
                                    stream.destroy( err );
                                    return;
                                }
                                stream.resume();
                            } );
                        }
                    } );
                } ).on( 'error', err => {
                    Y.log( 'migrating migrateCasefolderless_3_2 stream error' + err + ' tenant: ' + user.tenantId, 'error', NAME );
                    error = err;
                } ).on( 'end', () => {
                    Y.log( 'migrating migrateCasefolderless_3_2 stream end, tenant: ' + user.tenantId + ', fixed ' + count + ' activities', 'info', NAME );
                    callback( error );
                } );
            }

            Y.doccirrus.mongodb.getModel( user, 'activity', true, ( err, model ) => {
                if( err ) {
                    Y.log( 'error on geting model' + err.message, 'error', NAME );
                }
                activityModel = model;
                findCasefolderLess();
            } );

            callback();
        }

        function migrateErrorCaseFolderApproved_3_2( user, callback ) {
            let activityModel, caseFolderModel;
            let error;

            function updateActivities( caseFolders ) {
                let activities = activityModel.mongoose.collection.find( {
                    caseFolderId: {$in: caseFolders},
                    status: 'APPROVED'
                }, {}, {timeout: true} ).stream();

                let count = 0;

                activities.on( 'data', activity => {
                    activities.pause();
                    count++;
                    activityModel.mongoose.collection.update( {
                        _id: activity._id
                    }, {
                        $set: {
                            status: 'CREATED'
                        }
                    }, ( err ) => {
                        if( err ) {
                            activities.destroy( err );
                            return;
                        }
                        activities.resume();
                    } );
                } ).on( 'error', err => {
                    Y.log( 'migrating migrateErrorCaseFolderApproved_3_2 stream error' + err + ' tenant: ' + user.tenantId, 'error', NAME );
                    error = err;
                } ).on( 'end', () => {
                    Y.log( 'migrating migrateErrorCaseFolderApproved_3_2 stream end, tenant: ' + user.tenantId + ', fixed ' + count + ' activities', 'info', NAME );
                    callback();
                } );

            }

            function findErrorCaseFolder( err ) {
                if( err ) {
                    return callback( err );
                }

                const query = {
                    additionalType: "ERROR"
                };

                let errorIds = [];
                let errorCaseFolders = caseFolderModel.mongoose.collection.find( query, {_id: true}, {timeout: true} ).stream();

                errorCaseFolders.on( 'data', casefolder => {
                    errorIds.push( casefolder._id.toString() );
                } ).on( 'error', err => {
                    Y.log( 'migrating migrateErrorCaseFolderApproved_3_2 stream error' + err + ' tenant: ' + user.tenantId, 'error', NAME );
                    error = err;
                } ).on( 'end', () => {
                    if( error ) {
                        return callback( error );
                    }
                    updateActivities( errorIds );
                } );
            }

            require( 'async' ).parallel( [
                function( done ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, ( err, model ) => {
                        activityModel = model;
                        done( err );
                    } );
                },
                function( done ) {
                    Y.doccirrus.mongodb.getModel( user, 'casefolder', true, ( err, model ) => {
                        caseFolderModel = model;
                        done( err );
                    } );
                }
            ], function( err ) {
                if( err ) {
                    return callback( err );
                } else {
                    findErrorCaseFolder();
                }
            } );

            callback();
        }

        /**
         *  Unset all English translations in forms to remove bad/legacy data
         *
         *  This is intended to only be run manually in order to produce a clean forms export
         *  This can optionally replace all English translations with German ones is the 'replaceTranslations' option is passed
         *
         *  @param {Object} user
         *  @param {Function} callback
         */

        function migrateSetFormTranslationsToGerman_3_2( user, callback ) {
            Y.doccirrus.forms.migrationhelper.setAllToGerman( user, {}, true, callback );
        }

        function migrateWorkListDobTemplate_3_3( user, callback ) {

            Y.doccirrus.mongodb.getModel( user, 'inpacsworklist', true, ( err, inpacsWorklistModel ) => {

                if( err ) {
                    Y.log( `migrating migrateWorkListDobTemplate_3_3 error ${err} tenant: ${user.tenantId}`, 'error', NAME );
                    return callback( err );
                }

                inpacsWorklistModel.mongoose.collection.update(
                    {'workListData.dicomTag': '0010,0030'},
                    {$set: {'workListData.$.template': "{{ moment(dob, 'DD.MM.YYYY').format('YYYYMMDD') }}"}}, {multi: true}, ( err ) => {
                        if( err ) {
                            Y.log( `migrating migrateWorkListDobTemplate_3_3 error ${err} tenant: ${user.tenantId}`, 'error', NAME );
                            return callback( err );
                        }
                        callback();
                    } );
            } );

        }

        /**
         * group activities by request Ids in labIds; then merge their l_extra and labText into the most recent entry,
         * with Endbefund/Teilbefund sorted to the top.
         *
         *  @param {Object} user
         *  @param {Function} callback
         */
        function migrateMergeLabdata_3_3( user, callback ) {
            let async = require( 'async' );
            let activityModel, lablogModel;
            let findingPrio = ["E", "T", "A", "N", "V"];
            let labIds = {};
            let initialCount = 0;
            let finalCount = 0;
            let error;

            function mergeLabdata() {
                function cont() {
                    delete labIds[keys[0]];
                    mergeLabdata();
                }

                let keys = Object.keys( labIds );
                if( keys.length < 1 ) {
                    Y.log( 'migrating migrateMergeLabdata_3_3 stream end, tenant: ' + user.tenantId + ', merged ' + initialCount + ' labdata activities into ' + finalCount, 'info', NAME );
                    return callback();
                }
                let labdataSet = labIds[keys[0]];
                let targetId = labdataSet[0]._id;
                let collectiveL_extra = [];
                let collectiveLabText = [];

                labdataSet.sort( ( a, b ) => findingPrio.indexOf( a.findingKind ) - findingPrio.indexOf( b.findingKind ) );

                async.each( labdataSet, ( labEntry, cb ) => {
                    activityModel.mongoose.collection.findOne( {_id: labEntry._id} ).then( labActivity => {

                        if( Array.isArray( labActivity.l_extra ) ) {
                            Array.prototype.push.apply( collectiveL_extra, labActivity.l_extra );
                        } else {
                            collectiveL_extra.push( labActivity.l_extra );
                        }
                        collectiveLabText.push( labActivity.labText );

                        if( targetId.toString() !== labActivity._id.toString() ) {
                            //update ref in lablog
                            lablogModel.mongoose.collection.update(
                                {flags: labActivity._id.toString()},
                                {$set: {"flags.$": targetId.toString()}}
                            ).then( () => {
                                //delete entry
                                activityModel.mongoose.collection.remove( {_id: labActivity._id} ).then( () => {
                                    cb();
                                } ).catch( callback );
                            } ).catch( callback );
                        } else {
                            return cb();
                        }
                    } ).catch( callback );
                }, err => {
                    if( err ) {
                        Y.log( 'migrating migrateMergeLabdata_3_3 error in set ' + keys[0] + ': ' + err, 'info', NAME );
                    } else {
                        //merge entry
                        activityModel.mongoose.collection.update( {_id: targetId}, {
                            $set: {
                                l_extra: collectiveL_extra,
                                labText: collectiveLabText.join( "\n" )
                            }
                        } ).then( () => {
                            cont();
                        } ).catch( callback );
                    }
                } );
            }

            function findLabdataWithId( err ) {
                if( err ) {
                    return callback( err );
                }

                const query = {
                    labRequestId: {$exists: 1},
                    l_extra: {$exists: 1},
                    "l_extra.findingKind": {$exists: 1}
                };

                let labdata = activityModel.mongoose.collection.find( query, {}, {timeout: true} ).stream();

                labdata.on( 'data', activity => {
                    initialCount++;
                    let entry = {
                        _id: activity._id,
                        timestamp: activity.timestamp,
                        findingKind: activity.l_extra.findingKind || activity.l_extra[0].findingKind
                    };
                    if( labIds[activity.labRequestId] ) {
                        labIds[activity.labRequestId].push( entry );
                    } else {
                        labIds[activity.labRequestId] = [entry];
                    }
                } ).on( 'error', err => {
                    Y.log( 'migrating migrateMergeLabdata_3_3 stream error' + err + ' tenant: ' + user.tenantId, 'error', NAME );
                    error = err;
                } ).on( 'end', () => {
                    if( error ) {
                        return callback( error );
                    }
                    Object.keys( labIds ).forEach( labId => labIds[labId].sort( ( a, b ) => b.timestamp - a.timestamp ) );
                    finalCount = Object.keys( labIds ).length;
                    mergeLabdata();
                } );
            }

            async.parallel( [
                function( done ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, ( err, model ) => {
                        activityModel = model;
                        done( err );
                    } );
                },
                function( done ) {
                    Y.doccirrus.mongodb.getModel( user, 'lablog', true, ( err, model ) => {
                        lablogModel = model;
                        done( err );
                    } );
                }
            ], function( err ) {
                if( err ) {
                    return callback( err );
                } else {
                    findLabdataWithId();
                }
            } );
        }

        function migratePatientLocalPracticeID_3_3( user, callback ) {
            let
                async = require( 'async' );
            Y.log( `migratePatientLocalPracticeID_3_3 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'patient', true, ( err, patientModel ) => {
                        next( err, patientModel );
                    } );
                },
                function( patientModel, next ) {
                    let error,
                        stream = patientModel.mongoose.find( {
                            localPracticeId: {$exists: false}
                        }, {timeout: true} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function setLocalId( patient ) {
                        stream.pause();
                        Y.doccirrus.api.sysnum.getNextDQNo( {
                            user: user,
                            callback: ( err, localId ) => {
                                if( err ) {
                                    return stream.destroy( err );
                                }
                                patientModel.mongoose.update( {
                                    _id: patient._id
                                }, {
                                    $set: {
                                        localPracticeId: localId
                                    }
                                }, function( err ) {
                                    if( err ) {
                                        return stream.destroy( err );
                                    }
                                    stream.resume();
                                } );

                            }
                        } );
                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', setLocalId ).on( 'error', onError ).on( 'close', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migratePatientLocalPracticeID_3_3 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migratePatientLocalPracticeID_3_3 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * Migrates medication activity: set strength for each phIngr, delete phStrength.
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateMedicationActivityIngr_3_3( user, callback ) {
            let
                async = require( 'async' ),
                mmiCache = {};
            Y.log( `migrateMedicationActivityIngr_3_3 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, ( err, activityModel ) => {
                        next( err, activityModel );
                    } );
                }, function( activityModel, next ) {
                    let error,
                        stream = activityModel.mongoose.collection.find( {
                            actType: 'MEDICATION',
                            'phIngr.strength': {$exists: false},
                            phIngr: {$exists: true}
                        }, {phIngr: 1, phStrength: 1, phPZN: 1} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function updateIngr( activity ) {
                        stream.pause();
                        async.waterfall( [
                            function( next ) {
                                if( !activity.phPZN ) {
                                    return setImmediate( next, null, null );
                                }
                                if( mmiCache[activity.phPZN] ) {
                                    return setImmediate( next, null, mmiCache[activity.phPZN] );
                                }
                                Y.doccirrus.api.mmi.getProductsDetails( {
                                    user,
                                    query: {
                                        pznList: [activity.phPZN]
                                    },
                                    callback( err, data ) {
                                        let
                                            mmiData;
                                        if( err ) {
                                            return next( err );
                                        }
                                        if( data && data[0] ) {
                                            mmiData = data[0];
                                            mmiCache[activity.phPZN] = mmiData;
                                        }
                                        next( null, mmiData );
                                    }
                                } );
                            },
                            function( mmiData, next ) {
                                if( mmiData && mmiData.phIngr ) {
                                    activity.phIngr = mmiData.phIngr;
                                } else {
                                    activity.phIngr.forEach( item => {
                                        item.strength = activity.phStrength;
                                    } );
                                }
                                activityModel.mongoose.collection.update( {
                                    _id: activity._id
                                }, {
                                    $set: {
                                        phIngr: activity.phIngr
                                    },
                                    $unset: {
                                        phStrength: 1
                                    }
                                }, next );
                            }
                        ], function( err ) {
                            if( err ) {
                                Y.log( `Could not migrate medication activity: ${activity._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            stream.resume();
                        } );

                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', updateIngr ).on( 'error', onError ).on( 'end', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateMedicationActivityIngr_3_3 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateMedicationActivityIngr_3_3 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * Migrates medication catalog usage: set strength for each phIngr, delete phStrength.
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateMedicationCatalogUsageIngr_3_3( user, callback ) {
            let
                async = require( 'async' ),
                mmiCache = {};
            Y.log( `migrateMedicationCatalogUsageIngr_3_3 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'catalogusage', true, ( err, catalogusageModel ) => {
                        next( err, catalogusageModel );
                    } );
                }, function( catalogusageModel, next ) {
                    let error,
                        stream = catalogusageModel.mongoose.collection.find( {
                            catalogShort: 'MMI',
                            'phIngr.strength': {$exists: false},
                            phIngr: {$exists: true}
                        }, {phIngr: 1, phStrength: 1, phPZN: 1} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function updateIngr( catalogusage ) {
                        stream.pause();
                        async.waterfall( [
                            function( next ) {
                                if( !catalogusage.phPZN ) {
                                    return setImmediate( next, null, null );
                                }
                                if( mmiCache[catalogusage.phPZN] ) {
                                    return setImmediate( next, null, mmiCache[catalogusage.phPZN] );
                                }
                                Y.doccirrus.api.mmi.getProductsDetails( {
                                    user,
                                    query: {
                                        pznList: [catalogusage.phPZN]
                                    },
                                    callback( err, data ) {
                                        let
                                            mmiData;
                                        if( err ) {
                                            return next( err );
                                        }
                                        if( data && data[0] ) {
                                            mmiData = data[0];
                                            mmiCache[catalogusage.phPZN] = mmiData;
                                        }
                                        next( null, mmiData );
                                    }
                                } );
                            },
                            function( mmiData, next ) {
                                if( mmiData && mmiData.phIngr ) {
                                    catalogusage.phIngr = mmiData.phIngr;
                                } else {
                                    catalogusage.phIngr.forEach( item => {
                                        item.strength = catalogusage.phStrength;
                                    } );
                                }
                                catalogusageModel.mongoose.collection.update( {
                                    _id: catalogusage._id
                                }, {
                                    $set: {
                                        phIngr: catalogusage.phIngr
                                    },
                                    $unset: {
                                        phStrength: 1
                                    }
                                }, next );
                            }
                        ], function( err ) {
                            if( err ) {
                                Y.log( `Could not migrate medication catalogusage: ${catalogusage._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            stream.resume();
                        } );

                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', updateIngr ).on( 'error', onError ).on( 'end', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateMedicationCatalogUsageIngr_3_3 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateMedicationCatalogUsageIngr_3_3 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * Migrates medication activity: set strength for each phIngr, delete phStrength.
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateMedicationActivitySequenceIngr_3_3( user, callback ) {
            let
                async = require( 'async' ),
                mmiCache = {};
            Y.log( `migrateMedicationActivitySequenceIngr_3_3 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'activitysequence', true, ( err, activitySequenceModel ) => {
                        next( err, activitySequenceModel );
                    } );
                }, function( activitySequenceModel, next ) {
                    let error,
                        stream = activitySequenceModel.mongoose.collection.find( {
                            'activities.actType': 'MEDICATION'
                        }, {activities: 1} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function updateIngr( activitySequence ) {
                        let
                            medicationActivities = activitySequence.activities.filter( item => 'MEDICATION' === item.actType ),
                            hasStrength = medicationActivities && medicationActivities.every( activity => activity.phIngr && activity.phIngr.every( item => {
                                let
                                    keys = Object.keys( item );
                                return keys.includes( 'strength' );
                            } ) );
                        if( hasStrength ) {
                            Y.log( `activitySequence: ${activitySequence._id.toString()} has already been migrated on tenant: ${user.tenantId}`, 'info', NAME );
                            return;
                        }

                        stream.pause();
                        async.waterfall( [
                            function( next ) {
                                let
                                    pznList = medicationActivities.map( item => item.phPZN ).filter( item => Boolean( item ) );
                                async.eachSeries( pznList, function( pzn, done ) {
                                    if( mmiCache[pzn] ) {
                                        return setImmediate( done );
                                    }
                                    Y.doccirrus.api.mmi.getProductsDetails( {
                                        user,
                                        query: {
                                            pznList: [pzn]
                                        },
                                        callback( err, data ) {
                                            if( err ) {
                                                return done( err );
                                            }
                                            if( data && data[0] ) {
                                                mmiCache[pzn] = data[0];
                                            }
                                            done();
                                        }
                                    } );
                                }, ( err ) => next( err ) );

                            },
                            function( next ) {
                                medicationActivities.forEach( activity => {
                                    if( !activity.phIngr ) {
                                        return;
                                    }
                                    if( activity.phPZN && mmiCache[activity.phPZN] ) {
                                        let
                                            original = mmiCache[activity.phPZN];
                                        activity.phIngr = original.phIngr;
                                    } else {
                                        activity.phIngr.forEach( item => {
                                            item.strength = activity.phStrength;
                                        } );
                                    }
                                    delete activity.phStrength;
                                } );

                                activitySequenceModel.mongoose.collection.update( {
                                    _id: activitySequence._id
                                }, {
                                    $set: {
                                        activities: activitySequence.activities
                                    }
                                }, next );
                            }
                        ], function( err ) {
                            if( err ) {
                                Y.log( `Could not migrate medication activity in activity sequence: ${activitySequence._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            stream.resume();
                        } );

                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', updateIngr ).on( 'error', onError ).on( 'end', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateMedicationActivitySequenceIngr_3_3 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateMedicationActivitySequenceIngr_3_3 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * Migrates activity: set patient last and first name.
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateActivityPatientName_3_3( user, callback ) {
            let
                async = require( 'async' );
            Y.log( `migrateActivityPatientName_3_3 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'patient', true, next );
                },
                function( patientModel, next ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, ( err, activityModel ) => {
                        next( err, patientModel, activityModel );
                    } );
                },
                function( patientModel, activityModel, next ) {
                    let error,
                        stream = patientModel.mongoose.collection.find( {}, {lastname: 1, firstname: 1} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function updatePatientActivities( patient ) {

                        stream.pause();

                        activityModel.mongoose.collection.update( {
                            patientId: patient._id.toString(),
                            patientLastName: {$exists: false},
                            patientFirstName: {$exists: false}
                        }, {
                            $set: {
                                patientLastName: patient.lastname,
                                patientFirstName: patient.firstname
                            }
                        }, {multi: true}, ( err ) => {
                            if( err ) {
                                Y.log( `Could not migrate activity for patient: ${patient._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            stream.resume();
                        } );
                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', updatePatientActivities ).on( 'error', onError ).on( 'end', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateActivityPatientName_3_3 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateActivityPatientName_3_3 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         *  MOJ-6698 Make existing tables read-only in forms
         */

        function makeTablesReadOnly_3_3( user, callback ) {
            Y.log( 'Starting migration to mark tables read-only in all forms (including previous form versions), tenant: ' + user.tenantId, 'debug', NAME );
            Y.doccirrus.forms.migrationhelper.makeTablesReadOnly( user, true, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( 'Error during makeTablesReadOnly migration: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                Y.log( 'Completed migration to make tables read-only in forms, ternant: ' + user.tenantId, 'debug', NAME );
                callback( null );
            }
        }

        /**
         * Migrates catalogusage: set unified seq.
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateCatalogUsageUnifiedSeq_3_4( user, callback ) {
            let
                async = require( 'async' );
            Y.log( `migrateCatalogUsageUnifiedSeq_3_4 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'catalogusage', true, next );
                },
                function( catalogUsageModel, next ) {
                    let error,
                        stream = catalogUsageModel.mongoose.collection.find( {unifiedSeq: {$exists: false}}, {seq: 1} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function updateCatalogUsage( catalogUsage ) {
                        let
                            unifiedSeq = Y.doccirrus.schemas.catalog.unifySeq( catalogUsage.seq );
                        stream.pause();

                        catalogUsageModel.mongoose.collection.update( {
                            _id: catalogUsage._id
                        }, {
                            $set: {
                                unifiedSeq: unifiedSeq
                            }
                        }, ( err ) => {
                            if( err ) {
                                Y.log( `Could not migrate catalogusage: ${catalogUsage._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            stream.resume();
                        } );
                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', updateCatalogUsage ).on( 'error', onError ).on( 'end', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateCatalogUsageUnifiedSeq_3_4 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateCatalogUsageUnifiedSeq_3_4 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * Migrates activities: set __t (used by discriminator).
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateActivityDiscriminator_3_4( user, callback ) {
            let
                async = require( 'async' );
            Y.log( `migrateActivityDiscriminator_3_4 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, next );
                },
                function( activityModel, next ) {
                    let error,
                        stream = activityModel.mongoose.collection.find( {__t: {$exists: false}}, {actType: 1} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function updateActivity( activity ) {
                        stream.pause();

                        activityModel.mongoose.collection.update( {
                            _id: activity._id
                        }, {
                            $set: {
                                __t: activity.actType
                            }
                        }, ( err ) => {
                            if( err ) {
                                Y.log( `Could not migrate activity: ${activity._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            stream.resume();
                        } );
                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', updateActivity ).on( 'error', onError ).on( 'end', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateActivityDiscriminator_3_4 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateActivityDiscriminator_3_4 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * Migrates MongoDB to 3.4
         * @param {Object} user
         * @param {Function} callback
         * @returns {Object}
         */
        function migrateMongoDbTo_3_4( user, callback ) {
            let tenantId = user && user.tenantId || '',
                isVprc = Y.doccirrus.auth.isVPRC();

            if( !isVprc || !vprcMongoMigrateTo_3_4_called ) {
                let db = require( 'dc-core' ).db;

                if( isVprc ) {
                    vprcMongoMigrateTo_3_4_called = true;
                }

                db.getAdminDbConn( ( error, nativeDbConn ) => {
                    if( error ) {
                        return callback( error );
                    }
                    nativeDbConn.db.admin().command( {setFeatureCompatibilityVersion: "3.4"}, ( err, result ) => {
                        if( err ) {
                            Y.log( `migrateMongoDbTo_3_4 failed to migrate to MongoDB 3.4 ${err} on ${tenantId}`, 'error', NAME );
                            return callback( err );
                        }
                        Y.log( `migrateMongoDbTo_3_4 migrated to MongoDB 3.4 ${JSON.stringify( result )}`, 'debug', NAME );
                        callback();
                    } );
                } );
            } else {
                Y.log( `Already migrated migrateMongoDbTo_3_4`, 'debug', NAME );
                return callback();
            }
        }

        /**
         * Migrates patients: set dob_DD, dob_MM, patientSince
         * @param {Object} user
         * @param {Function} callback
         */
        function migratePatientsDDAndMM_3_4( user, callback ) {
            let
                async = require( 'async' );
            Y.log( `migratePatientsDDAndMM_3_4 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'patient', true, ( err, patientModel ) => {
                        next( err, patientModel );
                    } );
                }, function( patientModel, next ) {
                    let error,
                        stream = patientModel.mongoose.find( {
                            dob_DD: {$exists: false},
                            dob_MM: {$exists: false}
                        }, {kbvDob: 1, patientSince: 1} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function migrateData( patient ) {
                        let dataToSet = {};

                        stream.pause();
                        async.series( [
                            /*function setPatientSince( done ) {
                                if( patient.patientSince && moment().diff( patient.patientSince, 'minute' ) > 2 ) {
                                    return done();
                                } else {
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'activity',
                                        query: {
                                            patientId: patient._id,
                                            actType: {$in: ['SCHEIN', 'PKVSCHEIN', 'BGSCHEIN']}
                                        },
                                        options: {sort: {timestamp: 1}}
                                    }, function( err, result ) {
                                        if( err ) {
                                            return done( err );
                                        }
                                        if( result && result[0] ) {
                                            dataToSet.patientSince = result[0].timestamp;
                                        }
                                        return done();
                                    } );
                                }
                            },*/
                            function( done ) { //setDDAndMM
                                if( !patient.kbvDob ) {
                                    return done();
                                }
                                let dobString = patient.kbvDob;

                                dataToSet.dob_DD = dobString.slice( 0, 2 );
                                dataToSet.dob_MM = dobString.slice( 3, 5 );

                                return done();

                            }
                        ], function allDone( err ) {
                            if( err ) {
                                Y.log( `migratePatientsDDAndMM_3_4. Error in patient migration. patientId: ${patient._id.toString()}`, 'error', NAME );
                            }
                            if( Object.keys( dataToSet ).length === 0 && dataToSet.constructor === Object ) {
                                stream.resume();
                            } else {
                                Y.doccirrus.mongodb.runDb( {
                                        user: user,
                                        model: 'patient',
                                        action: 'mongoUpdate',
                                        query: {_id: patient._id},
                                        data: {
                                            $set: dataToSet
                                        }
                                    },
                                    function( err ) {
                                        if( err ) {
                                            Y.log( `migratePatientsDDAndMM_3_4. Error in patient migration. patientId: ${patient._id.toString()}`, 'error', NAME );
                                        }
                                        stream.resume();
                                    } );
                            }

                        } );
                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', migrateData ).on( 'error', onError ).on( 'close', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migratePatientsDDAndMM_3_4 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migratePatientsDDAndMM_3_4 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * Migrates baseContacts: convert items in contacts from String to ObjectId
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateBaseContactContactsToObjectId_3_4( user, callback ) {
            let
                async = require( 'async' );
            Y.log( `migrateBaseContactContactsToObjectId_3_4 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'basecontact', true, ( err, basecontactModel ) => {
                        next( err, basecontactModel );
                    } );
                }, function( basecontactModel, next ) {
                    let error,
                        stream = basecontactModel.mongoose.find( {}, {contacts: 1} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function migrateData( basecontact ) {
                        let convertedContacts = [];

                        stream.pause();
                        if( !Array.isArray( basecontact.contacts ) ) {
                            stream.resume();
                            return;
                        }
                        basecontact.contacts.forEach( contact => {
                            if( 'string' === typeof contact ) {
                                contact = new require( 'mongoose' ).Types.ObjectId( contact );
                                convertedContacts.push( contact );
                            }
                        } );
                        if( convertedContacts.length > 0 ) {
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'basecontact',
                                action: 'mongoUpdate',
                                query: {_id: basecontact._id},
                                data: {
                                    $set: {contacts: convertedContacts}
                                }
                            }, function( err ) {
                                if( err ) {
                                    Y.log( `migrateBaseContactContactsToObjectId_3_4. Error in basecontacts migration. baseContactId: ${basecontact._id.toString()}`, 'error', NAME );
                                }
                                stream.resume();
                            } );
                        } else {
                            stream.resume();
                        }
                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', migrateData ).on( 'error', onError ).on( 'close', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateBaseContactContactsToObjectId_3_4 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateBaseContactContactsToObjectId_3_4 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * Migrates custom catalog usage: creates entries for "missing" locations.
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateCatalogUsage_3_4( user, callback ) {
            let
                async = require( 'async' );
            Y.log( `migrateActivityDiscriminator_3_4 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'location',
                        action: 'get',
                        migrate: true,
                        query: {},
                        options: {
                            select: {
                                _id: 1
                            }
                        }
                    }, ( err, result ) => {
                        if( err ) {
                            return next( err );
                        }
                        next( null, result.map( item => item._id.toString() ) );
                    } );
                },
                function( locationList, next ) {
                    Y.doccirrus.mongodb.getModel( user, 'catalogusage', true, ( err, model ) => next( err, locationList, model ) );
                },
                function( locationList, catalogUsageModel, next ) {
                    let error,
                        stream = catalogUsageModel.mongoose.collection.find( {catalog: false} ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function duplicateCatalogUsage( catalogUsage ) {
                        let
                            data = Object.assign( {}, catalogUsage );
                        delete data._id;
                        stream.pause();
                        async.eachSeries( locationList, ( location, next ) => {
                            data.locationId = location;
                            catalogUsageModel.mongoose.collection.findOneAndUpdate( {
                                seq: catalogUsage.seq,
                                catalogShort: catalogUsage.catalogShort,
                                locationId: location
                            }, {
                                $setOnInsert: data
                            }, {
                                upsert: true
                            }, next );
                        }, ( err ) => {
                            if( err ) {
                                Y.log( `Could not migrate catalogUsage: ${catalogUsage._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            stream.resume();
                        } );
                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', duplicateCatalogUsage ).on( 'error', onError ).on( 'end', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateActivityDiscriminator_3_4 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateActivityDiscriminator_3_4 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * Drops indexes from patient collection to support v:2 index for mongodb 3.4 with enhanced facilities
         * such as collation in this case
         * @param {Object} user
         * @param {Function} callback
         */
        function migratePatientIndexes_3_4( user, callback ) {
            let async = require( 'async' );

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'patient', true, next );
                },

                function( patientModel, next ) {
                    patientModel.mongoose.collection.dropIndexes( ( err, result ) => {
                        if( err ) {
                            return next( err );
                        }
                        Y.log( `migratePatientIndexes_3_4: Successfully deleted patient index for tenant: ${user.tenantId} result ${result}`, 'debug', NAME );
                        next();
                    } );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migratePatientIndexes_3_4: Error deleting patient index for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migratePatientIndexes_3_4: migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * If settings are set properly, then try to set location data from last kbvlog in existing default document.
         * If properly settings exist, but no kbvlog then do nothing.
         * Otherwise delete existing default document.
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateDeliverySettings_3_5( user, callback ) {

            Y.log( `migrateDeliverySettings_3_5 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );

            const
                defaultDeliverySettingsId = '000000000000000000000001';

            function setDataOfMainLocation() {

                Y.log( `migrateDeliverySettings_3_5: ${user.tenantId} try to update existing delivery settings with main location data of last kbvlog`, 'debug', NAME );

                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'kbvlog',
                    query: {},
                    options: {
                        sort: {
                            _id: -1
                        },
                        limit: 1,
                        select: {
                            destination: 1,
                            locname: 1,
                            commercialNo: 1,
                            mainLocationId: 1
                        }
                    },
                    migrate: true
                } ).then( kbvlogs => {
                    const
                        kbvlog = kbvlogs && kbvlogs[0];
                    if( !kbvlog ) {
                        Y.log( `migrateDeliverySettings_3_5: ${user.tenantId} no last kbvlog found: skip update`, 'debug', NAME );
                        return;
                    }

                    let data = {
                            mainLocationId: kbvlog.mainLocationId,
                            commercialNo: kbvlog.commercialNo,
                            locname: kbvlog.locname,
                            kv: kbvlog.destination
                        },
                        fields = Object.keys( data );

                    data.skipcheck_ = true;

                    return Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'gkv_deliverysettings',
                        action: 'put',
                        query: {
                            _id: defaultDeliverySettingsId
                        },
                        data,
                        fields,
                        migrate: true
                    } );
                } );

            }

            function removeDeliverySettings() {

                Y.log( `migrateDeliverySettings_3_5: ${user.tenantId} removing unused delivery settings`, 'debug', NAME );

                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'gkv_deliverysettings',
                    action: 'delete',
                    query: {
                        _id: defaultDeliverySettingsId
                    },
                    options: {override: true},
                    migrate: true
                } );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'deliverysettings',
                query: {
                    _id: defaultDeliverySettingsId,
                    mainLocationId: null
                },
                options: {
                    sort: {
                        _id: -1
                    },
                    limit: 1,
                    select: {
                        deliveryType: 1,
                        kvPortalUrl: 1,
                        username: 1,
                        password: 1
                    }
                },
                migrate: true
            } ).then( deliverySettings => {
                deliverySettings = deliverySettings && deliverySettings[0];
                const
                    manualButUnset = deliverySettings && ('MANUAL' === deliverySettings.deliveryType && !deliverySettings.kvPortalUrl),
                    oneClickButUnset = deliverySettings && ('1CLICK' === deliverySettings.deliveryType && (!deliverySettings.username || !deliverySettings.password));

                if( manualButUnset || oneClickButUnset ) {
                    return removeDeliverySettings();
                } else if( deliverySettings ) {
                    return setDataOfMainLocation();
                }
            } ).then( () => {
                Y.log( `migrateDeliverySettings_3_5: ${user.tenantId} finished`, 'debug', NAME );
                callback();
            } ).catch( err => {
                Y.log( `migrateDeliverySettings_3_5: ${user.tenantId} failed: ${err}`, 'debug', NAME );
                callback( err );
            } );
        }

        /**
         * Migrates support users: set SUPPORT group.
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateSupportUsers_3_5( user, callback ) {
            let
                async = require( 'async' );
            Y.log( `migrateSupportUsers_3_5 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'employee', true, next );
                },
                function( employeeCollection, next ) {
                    let error,
                        stream = employeeCollection.mongoose.collection.find( {
                            isSupport: true,
                            memberOf: {$not: {$elemMatch: {group: Y.doccirrus.schemas.employee.userGroups.SUPPORT}}}
                        } ).stream();

                    function finalCb() {
                        if( error ) {
                            return next( error );
                        }
                        next();
                    }

                    function updateEmployeeAndIdentity( employee ) {
                        const
                            employeeId = employee._id.toString();
                        stream.pause();

                        async.series( [
                            function( next ) {
                                employeeCollection.mongoose.update( {_id: employeeId}, {
                                    memberOf: [
                                        {group: Y.doccirrus.schemas.employee.userGroups.SUPPORT},
                                        {group: Y.doccirrus.schemas.employee.userGroups.ADMIN}
                                    ]
                                }, next );
                            },
                            function( next ) {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'identity',
                                    migrate: true,
                                    action: 'update',
                                    query: {
                                        specifiedBy: employeeId
                                    },
                                    data: {
                                        memberOf: [
                                            {group: Y.doccirrus.schemas.identity.userGroups.SUPPORT},
                                            {group: Y.doccirrus.schemas.identity.userGroups.ADMIN}
                                        ]
                                    }
                                }, next );
                            }
                        ], err => {
                            if( err ) {
                                Y.log( `Could not migrate employee: ${employee._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            stream.resume();
                        } );
                    }

                    function onError( err ) {
                        error = err;
                    }

                    stream.on( 'data', updateEmployeeAndIdentity ).on( 'error', onError ).on( 'end', finalCb );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateSupportUsers_3_5 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migrateSupportUsers_3_5 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        /**
         * Migrates rules to use array for CaseFoldeType field: set SUPPORT group.
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateRulesMultiCaseFolderTypes_3_5( user, callback ) {
            const
                async = require( 'async' );
            Y.log( `migrateRulesMultiCaseFolderTypes_3_5 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'rule', true, next );
                    },
                    function( rulesCollection, next ) {
                        const cursor = rulesCollection.mongoose.find( {
                            isDirectory: false,
                            "caseFolderType.0": {$exists: false}
                        } ).cursor();
                        let updated = 0;
                        cursor.eachAsync( doc => {
                            return new Promise( ( resolve, reject ) => {
                                let setData = Array.isArray( doc.caseFolderType ) ? doc.caseFolderType : [doc.caseFolderType];
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'rule',
                                    migrate: true,
                                    action: 'mongoUpdate',
                                    query: {_id: doc._id},
                                    data: {$set: {caseFolderType: setData}}
                                }, ( err ) => {
                                    if( err ) {
                                        reject( err );
                                    } else {
                                        updated++;
                                        resolve();
                                    }
                                } );
                            } );
                        } ).then( () => {
                            Y.log( `migrateRulesMultiCaseFolderTypes_3_5 updates ${updated} documents`, 'debug', NAME );
                            next();
                        } ).catch( err => {
                            next( err );
                        } );
                    }], (err => {
                    if( err ) {
                        Y.log( 'migrateRulesMultiCaseFolderTypes_3_5 failed ' + err.message, 'error', NAME );
                        return callback( err );
                    }
                    Y.log( `migrateRulesMultiCaseFolderTypes_3_5 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                    callback();
                })
            );
        }

        function migrateActivitySettings_3_5( user, callback ) {
            if( Y.doccirrus.auth.isVPRC() && user.tenantId === '0' ) {
                callback();
                return;
            }

            const
                async = require( 'async' ),
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                queryId = ObjectId( Y.doccirrus.schemas.activitysettings.getId() );

            Y.log( `migrateActivitySettings_3_5: starting migration for tenant: ${user.tenantId} and Id ${Y.doccirrus.schemas.activitysettings.getId()}`, 'info', NAME );

            async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'activitysettings', true, next );
                    },
                    function( activitySettingsModel, next ) {
                        activitySettingsModel.mongoose.collection.findOne( {_id: queryId} )
                            .then( ( doc ) => {
                                if( !doc ) {
                                    return "no_doc_found";
                                } else if( !doc.settings || !Array.isArray( doc.settings ) || !doc.settings.length ) {
                                    Y.log( `migrateActivitySettings_3_5: No settings array inside document for tenant: ${user.tenantId} and Id ${Y.doccirrus.schemas.activitysettings.getId()}. Dropping and recreating...`, 'info', NAME );
                                    return activitySettingsModel.mongoose.collection.deleteOne( {_id: queryId} )
                                        .then( ( res ) => {
                                            if( res && res.result && res.result.n === 1 ) {
                                                let defaultDoc = Y.doccirrus.schemas.activitysettings.defaultItems[0];
                                                defaultDoc._id = ObjectId( defaultDoc._id );

                                                return activitySettingsModel.mongoose.collection.insertOne( defaultDoc );
                                            } else {
                                                throw `Failed to delete activitysettings record for tenant: ${user.tenantId} and Id ${Y.doccirrus.schemas.activitysettings.getId()}`;
                                            }
                                        } )
                                        .then( ( res ) => {
                                            //So that we do not mutate the inmemory object incase it affects at other places
                                            Y.doccirrus.schemas.activitysettings.defaultItems[0]._id = Y.doccirrus.schemas.activitysettings.getId();
                                            if( res && res.insertedCount === 1 ) {
                                                return "no_settings_found";
                                            } else {
                                                throw `Failed to insert default activitysettings record for tenant: ${user.tenantId} and Id ${Y.doccirrus.schemas.activitysettings.getId()}`;
                                            }
                                        } );

                                } else {
                                    let hasChanged = false;

                                    doc.settings.forEach( ( setting ) => {
                                        if( typeof setting.schein !== "boolean" ) {
                                            setting.schein = true;
                                            hasChanged = true;
                                        }
                                    } );

                                    if( hasChanged ) {
                                        return activitySettingsModel.mongoose.collection.updateOne( {_id: queryId}, {$set: {'settings': doc.settings}} );
                                    } else {
                                        return "no_changes";
                                    }
                                }
                            } )
                            .then( ( result ) => {
                                next( null, result );
                            } )
                            .catch( ( error ) => {
                                next( error );
                            } );
                    }], ( err, result ) => {
                    if( err ) {
                        Y.log( `migrateActivitySettings_3_5 failed. Error: ${err} `, 'error', NAME );
                        return callback( err );
                    } else if( result === "no_changes" ) {
                        Y.log( `migrateActivitySettings_3_5: Nothing to update for tenant: ${user.tenantId}`, 'info', NAME );
                        return callback();
                    } else if( result === "no_doc_found" ) {
                        Y.log( `migrateActivitySettings_3_5: Activity Settings document not found for tenant: ${user.tenantId} and Id: ${Y.doccirrus.schemas.activitysettings.getId()}`, 'info', NAME );
                        return callback();
                    } else if( result === "no_settings_found" ) {
                        Y.log( `migrateActivitySettings_3_5: No settings array found inside doc. Recreated default one for tenant: ${user.tenantId} and Id: ${Y.doccirrus.schemas.activitysettings.getId()}`, 'info', NAME );
                        return callback();
                    } else if( result && result.result && result.result.n === 1 ) {
                        Y.log( `migrateActivitySettings_3_5: successfully migrated for tenant ${user.tenantId} and Id: ${Y.doccirrus.schemas.activitysettings.getId()}`, 'info', NAME );
                        return callback();
                    } else {
                        Y.log( `migrateActivitySettings_3_5: failed to update for tenant ${user.tenantId} and Id: ${Y.doccirrus.schemas.activitysettings.getId()}`, 'error', NAME );
                        return callback( `migrateActivitySettings_3_5: failed to update for tenant ${user.tenantId} and Id: ${Y.doccirrus.schemas.activitysettings.getId()}` );
                    }
                }
            );
        }

        /**
         * Migrates employee to use signaling for PHONEJOB communications
         * @param {Object} user
         * @param {Function} callback
         */
        function migratePhoneSignaling_3_6( user, callback ) {
            let
                async = require( 'async' );
            Y.log( `migratePhoneSignaling_3_6 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'employee', true, next );
                },
                function( employeeCollection, next ) {
                    const cursor = employeeCollection.mongoose.find( {
                        communications: {
                            $elemMatch: {
                                type: 'PHONEJOB',
                                signaling: {$exists: false}
                            }
                        }
                    } ).cursor();
                    let updated = 0;
                    cursor.eachAsync( doc => {
                        return new Promise( ( resolve, reject ) => {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'employee',
                                migrate: true,
                                action: 'mongoUpdate',
                                query: {
                                    _id: doc._id,
                                    'communications.type': 'PHONEJOB'
                                },
                                data: {$set: {'communications.$.signaling': true}}
                            }, ( err ) => {
                                if( err ) {
                                    reject( err );
                                } else {
                                    updated++;
                                    resolve();
                                }
                            } );
                        } );
                    } ).then( () => {
                        Y.log( `migratePhoneSignaling_3_6 updates ${updated} documents`, 'debug', NAME );
                        next();
                    } ).catch( err => {
                        next( err );
                    } );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migratePhoneSignaling_3_6 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migratePhoneSignaling_3_6 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );

        }

        /**
         * Migrates phone numbers from base-contact, patient, employee collections to homogenised format
         * @param {Object} user
         * @param {Function} callback
         */
        function migratePhoneNumbersToHomogenisedFormat_3_6( user, callback ) {
            let
                async = require( 'async' ),
                voipIndDocs = [];

            Y.log( `migratePhoneNumbersToHomogenisedFormat_3_6 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );

            function processingCollection( collection, next ) {

                let cursor = collection.mongoose.find( {
                    'communications.type': {$in: ['PHONEJOB', 'PHONEPRIV', 'MOBILEPRIV']}
                } ).cursor();

                cursor.eachAsync( doc => {
                    return new Promise( ( resolve, reject ) => {

                        async.eachSeries( doc.communications, ( item, done ) => {
                            if( 'PHONEJOB' === item.type || 'PHONEPRIV' === item.type || 'MOBILEPRIV' === item.type ) {
                                voipIndDocs.push( {
                                    model: collection && collection._name.toUpperCase(),
                                    personId: doc._id,
                                    homogenisednumber: Y.doccirrus.commonutils.homogenisePhoneNumber( item.value )
                                } );
                            }
                            done();
                        }, ( err ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve();
                            }
                        } );
                    } );
                } ).then( () => {
                    next();
                } ).catch( err => {
                    next( err );
                } );
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'employee', true, next );
                },
                processingCollection,
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'patient', true, next );
                },
                processingCollection,
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'basecontact', true, next );
                },
                processingCollection,
                function( next ) {
                    async.waterfall( [
                        function( next ) {
                            Y.doccirrus.mongodb.getModel( user, 'voipindex', true, next );
                        },
                        function( voipIndexCollection, innerNext ) {

                            voipIndexCollection.mongoose.collection.remove( {} ).then( () => {
                                innerNext();
                            } ).catch( innerNext );
                        },
                        function( innerNext ) {
                            if( 0 === voipIndDocs.length ) {
                                return innerNext();
                            } else {
                                Y.doccirrus.mongodb.runDb( {
                                    action: 'post',
                                    user: user,
                                    migrate: true,
                                    model: 'voipindex',
                                    data: Y.doccirrus.filters.cleanDbObject( voipIndDocs )
                                }, ( err ) => {
                                    if( err ) {
                                        return innerNext( err );
                                    }
                                    return innerNext();
                                } );
                            }
                        }
                    ], next );

                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migratePhoneNumbersToHomogenisedFormat_3_6 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                    return callback( err );
                }
                Y.log( `migratePhoneNumbersToHomogenisedFormat_3_6 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                return callback();
            } );
        }

        /**
         * Migrates identity to add roles from 'specifiedBy' employee
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateIdentityRoles_3_7( user, callback ) {
            {
                let
                    async = require( 'async' );
                Y.log( `migrateIdentityRoles_3_7 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );

                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'employee', true, next );
                    },
                    function( employeeCollection, next ) {
                        const cursor = employeeCollection.mongoose.find( {} ).cursor();
                        let updated = 0;
                        cursor.eachAsync( doc => {
                            return new Promise( ( resolve, reject ) => {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'identity',
                                    migrate: true,
                                    action: 'mongoUpdate',
                                    query: {
                                        specifiedBy: doc._id.toString()
                                    },
                                    data: {$set: {roles: doc.roles || []}}
                                }, ( err ) => {
                                    if( err ) {
                                        reject( err );
                                    } else {
                                        updated++;
                                        resolve();
                                    }
                                } );
                            } );
                        } ).then( () => {
                            Y.log( `migrateIdentityRoles_3_7 updates ${updated} documents`, 'debug', NAME );
                            next();
                        } ).catch( err => {
                            next( err );
                        } );
                    }
                ], function( err ) {
                    if( err ) {
                        Y.log( `migrateIdentityRoles_3_7 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                        return callback( err );
                    }
                    Y.log( `migrateIdentityRoles_3_7 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                    callback();
                } );

            }

        }

        /**
         * Delete redundant records from calendarRefs for STANDARD activity type
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateCalendarRefsForStandardActType_3_8( user, callback ) {
            {
                let
                    async = require( 'async' );
                Y.log( `migrateCalendarRefsForStandardActType_3_8 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );

                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'scheduletype',
                            migrate: true,
                            action: 'get',
                            query: {_id: Y.doccirrus.schemas.scheduletype.getStandardId()},
                            fields: {calendarRefs: 1}
                        }, next );
                    },
                    function( scheduletype, next ) {
                        var resultRefs = [];
                        if( scheduletype && scheduletype[0] && scheduletype[0].calendarRefs ) {
                            async.eachSeries( scheduletype[0].calendarRefs, ( item, done ) => {
                                if( resultRefs.indexOf( item.calendarId ) >= 0 ) {
                                    //  need to break stack to prevent migration from crashing under node 9.3.0
                                    return process.nextTick( function() {
                                        done();
                                    } );
                                } else {
                                    resultRefs.push( item.calendarId );
                                    return process.nextTick( function() {
                                        done();
                                    } );
                                    //return done();
                                }
                            }, ( err ) => {
                                if( err ) {
                                    return next( err );
                                } else {
                                    Y.doccirrus.mongodb.runDb( {
                                        user,
                                        model: 'scheduletype',
                                        migrate: true,
                                        action: 'update',
                                        query: {_id: Y.doccirrus.schemas.scheduletype.getStandardId()},
                                        data: {
                                            calendarRefs: resultRefs.map( ( i ) => {
                                                return {calendarId: i};
                                            } ), skipcheck_: true
                                        }
                                    }, next );
                                }
                            } );
                        } else {
                            return next();
                        }
                    }
                ], function( err ) {
                    if( err ) {
                        Y.log( `migrateCalendarRefsForStandardActType_3_8 error for tenant ${user.tenantId}. Error: ${JSON.stringify( err )}`, 'debug', NAME );
                        return callback( err );
                    }
                    Y.log( `migrateCalendarRefsForStandardActType_3_8 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                    callback();
                } );

            }

        }

        function addInvoiceFactor2018Q1_3_8( user, callback ) {

            function updatedCb( err, result ) {
                if( err ) {
                    Y.log( 'addInvoiceFactor2018Q1: could not update invoice configuration: ' + err + ' for tenant ' + user.tenantId, 'error', NAME );
                    return callback( err );
                }
                Y.log( 'addInvoiceFactor2018Q1: successfully updated invoice configuration for tenant ' + user.tenantId + ' result: ' + JSON.stringify( result ), 'debug', NAME );
                callback();
            }

            function modelCb( err, model ) {
                if( err ) {
                    return callback( err );
                }

                model.mongoose.update( {_id: '000000000000000000000001'}, {
                    $addToSet: {
                        invoicefactors: {
                            "_id": "000000000000000000000008",
                            "year": "2018",
                            "quarter": "1",
                            "factor": 0.106543,
                            "isDefault": true
                        }
                    }
                }, updatedCb );
            }

            Y.doccirrus.mongodb.getModel( user, 'invoiceconfiguration', true, modelCb );
        }

        function migrateInpacsConfiguration_3_8( user, callback ) {
            if( !Y.doccirrus.auth.isPRC() ) {
                callback();
                return;
            }

            const
                async = require( 'async' ),
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                queryId = ObjectId( Y.doccirrus.schemas.inpacsconfiguration.getId() );

            Y.log( `migrateInpacsConfiguration_3_8: starting migration for tenant: ${user.tenantId} and inpacsConfigurationId ${Y.doccirrus.schemas.inpacsconfiguration.getId()}`, 'info', NAME );

            async.waterfall( [
                function( waterfallCb ) { //getInpacsConfigurationModel
                    Y.doccirrus.mongodb.getModel( user, 'inpacsconfiguration', true, waterfallCb );
                },

                function( inpacsconfigurationModel, waterfallCb ) { //checkIfDefaultEncodingIsSet
                    inpacsconfigurationModel.mongoose.collection.findOne( {_id: queryId} )
                        .then( ( inpacsConfiguration ) => {
                            if( inpacsConfiguration ) {
                                if( !inpacsConfiguration.defaultEncoding ) {
                                    waterfallCb( null, inpacsconfigurationModel, "SET_DEFAULT_ENCODING" );
                                } else {
                                    waterfallCb( null, inpacsconfigurationModel, "DEFAULT_ENCODING_ALREADY_SET" );
                                }
                            } else {
                                waterfallCb( null, inpacsconfigurationModel, "NOT_FOUND" ); //Should ideally never come here
                            }
                        } )
                        .catch( ( error ) => {
                            Y.log( `migrateInpacsConfiguration_3_8: Error querying inpacsconfiguration collection. Error: ${error}`, 'error', NAME );
                            waterfallCb( error );
                        } );
                },

                function( inpacsconfigurationModel, defaultEncodingStr, waterfallCb ) { //setDefaultEncodingIfNeeded
                    if( defaultEncodingStr === "SET_DEFAULT_ENCODING" ) {
                        inpacsconfigurationModel.mongoose.collection.updateOne( {_id: queryId}, {$set: {'defaultEncoding': Y.doccirrus.schemas.inpacsconfiguration.getDefaultData().defaultEncoding}} )
                            .then( ( result ) => {
                                if( result && result.result && result.result.n === 1 ) {
                                    waterfallCb( null, "SUCCESSFUL" );
                                } else {
                                    waterfallCb( null, "FAILED_TO_UPDATE" );
                                }
                            } )
                            .catch( ( error ) => {
                                Y.log( `migrateInpacsConfiguration_3_8: Error updating inpacsconfiguration collection. Error: ${error}`, 'error', NAME );
                                waterfallCb( error );
                            } );
                    } else {
                        waterfallCb( null, defaultEncodingStr );
                    }
                }

            ], function finalCallback( err, result ) {
                if( err ) {
                    Y.log( `migrateInpacsConfiguration_3_8: Error in operation. Error: ${err}`, 'error', NAME );
                    return callback( err );
                } else if( result === "SUCCESSFUL" ) {
                    Y.log( `migrateInpacsConfiguration_3_8: Successfully set defaultEncoding`, 'info', NAME );
                    return callback();
                } else if( result === "FAILED_TO_UPDATE" ) {
                    Y.log( `migrateInpacsConfiguration_3_8: Failed to set defaultEncoding`, 'error', NAME );
                    return callback( `migrateInpacsConfiguration_3_9: Failed to set defaultEncoding` );
                } else if( result === "DEFAULT_ENCODING_ALREADY_SET" ) {
                    Y.log( `migrateInpacsConfiguration_3_8: defaultEncoding already set. No need to do anything...`, 'info', NAME );
                    return callback();
                } else if( result === "NOT_FOUND" ) {
                    Y.log( `migrateInpacsConfiguration_3_8: Inpacsconfiguration NOT FOUND`, 'error', NAME );
                    return callback();
                }
            } );
        }

        /**
         *  MOJ-9099 initialize scheinEmployeeIds field on patients, used for quick lookup of employee name column in
         *  patient tables.
         */

        // function setPatientScheinEmployeeIds_3_9( user, callback ) {
        //     Y.log('Starting migration to add scheinEmployeeIds, tenant: ' + user.tenantId, 'debug', NAME);
        //
        //     Y.doccirrus.inCaseUtils.migrationhelper.setPatientScheinEmployeeIds(user, true, onMigrationComplete);
        //
        //     function onMigrationComplete(err) {
        //         if (err) {
        //             Y.log('Error during setPatientScheinEmployeeIds migration: ' + JSON.stringify(err), 'warn', NAME);
        //             return callback(err);
        //         }
        //         Y.log('Completed migration to initialize scheinEmployeeIds, tenant: ' + user.tenantId, 'debug', NAME);
        //         callback(null);
        //     }
        // }

        function migratePatientsPatientNo_3_9( user, callback ) {
            const
                async = require( 'async' );
            Y.log( `migratePatientsPatientNo_3_9 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'patient', true, next );
                    },
                    function( patientsCollection, next ) {
                        const cursor = patientsCollection.mongoose.find( {patientNo: /^0{1,5}/} ).cursor();
                        let updated = 0;
                        cursor.eachAsync( doc => {
                            return new Promise( ( resolve ) => {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'patient',
                                    migrate: true,
                                    action: 'mongoUpdate',
                                    query: {_id: doc._id},
                                    data: {$set: {patientNo: doc.patientNo.replace( /^0{1,5}/, '' )}}
                                }, ( err ) => {
                                    if( err ) {
                                        Y.log( `migratePatientsPatientNo_3_9 could not update patient: ${doc._id && doc._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                        resolve();
                                    } else {
                                        updated++;
                                        resolve();
                                    }
                                } );
                            } );
                        } ).then( () => {
                            Y.log( `migratePatientsPatientNo_3_9 updates ${updated} documents`, 'debug', NAME );
                            next();
                        } ).catch( err => {
                            next( err );
                        } );
                    }], (err => {
                    if( err ) {
                        Y.log( 'migratePatientsPatientNo_3_9 failed ' + err.message, 'error', NAME );
                        return callback( err );
                    }
                    Y.log( `migratePatientsPatientNo_3_9 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                    callback();
                })
            );
        }

        function migrateReportingsPatientId_3_9( user, callback ) {
            const
                async = require( 'async' );
            Y.log( `migrateReportingsPatientId_3_9 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'reporting', true, next );
                    },
                    function( reportingsCollection, next ) {
                        const cursor = reportingsCollection.mongoose.find( {patientId: /^0{1,5}/}, {}, {lean: true} ).cursor();
                        let updated = 0;
                        cursor.eachAsync( doc => {
                            return new Promise( ( resolve ) => {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'reporting',
                                    migrate: true,
                                    action: 'mongoUpdate',
                                    query: {_id: doc._id},
                                    data: {$set: {patientId: doc.patientId.replace( /^0{1,5}/, '' )}}
                                }, ( err ) => {
                                    if( err ) {
                                        Y.log( `migrateReportingsPatientId_3_9 could not update reporting: ${doc._id && doc._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                        resolve();
                                    } else {
                                        updated++;
                                        resolve();
                                    }
                                } );
                            } );
                        } ).then( () => {
                            Y.log( `migrateReportingsPatientId_3_9 updates ${updated} documents`, 'debug', NAME );
                            next();
                        } ).catch( err => {
                            next( err );
                        } );
                    }], (err => {
                    if( err ) {
                        Y.log( 'migrateReportingsPatientId_3_9 failed ' + err.message, 'error', NAME );
                        return callback( err );
                    }
                    Y.log( `migrateReportingsPatientId_3_9 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                    callback();
                })
            );
        }

        /**
         * Migrates identity to add locations from 'specifiedBy' employee
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateIdentityLocations_3_9( user, callback ) {
            {
                let
                    async = require( 'async' );
                Y.log( `migrateIdentityLocations_3_9 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );

                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'employee', true, next );
                    },
                    function( employeeCollection, next ) {
                        const cursor = employeeCollection.mongoose.find( {"locations._id": {$exists: true}} ).cursor();
                        let updated = 0;
                        cursor.eachAsync( doc => {
                            return new Promise( ( resolve ) => {
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'identity',
                                    migrate: true,
                                    action: 'mongoUpdate',
                                    query: {
                                        specifiedBy: doc._id.toString()
                                    },
                                    data: {$set: {locations: doc.locations || []}}
                                }, ( err ) => {
                                    if( err ) {
                                        Y.log( `migrateIdentityLocations_3_9 could not update identity: ${doc._id && doc._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                        resolve();
                                    } else {
                                        updated++;
                                        resolve();
                                    }
                                } );
                            } );
                        } ).then( () => {
                            Y.log( `migrateIdentityLocations_3_9 updates ${updated} documents`, 'debug', NAME );
                            next();
                        } ).catch( err => {
                            next( err );
                        } );
                    }
                ], function( err ) {
                    if( err ) {
                        Y.log( `migrateIdentityLocations_3_9 error for tenant ${user.tenantId}. Error: ${err}`, 'debug', NAME );
                        return callback( err );
                    }
                    Y.log( `migrateIdentityLocations_3_9 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                    callback();
                } );
            }
        }

        function migrateActivityRuleStatus_3_9( user, callback ) {
            const
                async = require( 'async' );
            Y.log( `migrateActivityRuleStatus_3_9 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, next );
                },
                function( activityModel, next ) {
                    const cursor = activityModel.mongoose.find( {
                        actType: 'INVOICE',
                        ruleStatus: {$exists: false}
                    } ).cursor();
                    let updated = 0;
                    cursor.eachAsync( doc => {
                        return Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            migrate: true,
                            action: 'mongoUpdate',
                            query: {_id: doc._id},
                            data: {$set: {ruleStatus: 'NOT_VALIDATED'}}
                        } )
                            .then( () => {
                                updated++;
                            } )
                            .catch( ( err ) => {
                                Y.log( `migrateActivityRuleStatus_3_9 could not update activity: ${doc._id && doc._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            } );
                    } )
                        .then( () => {
                            Y.log( `migrateActivityRuleStatus_3_9 updates ${updated} activities`, 'debug', NAME );
                            next();
                        } )
                        .catch( err => {
                            next( err );
                        } );
                }], err => {
                if( err ) {
                    Y.log( `migrateActivityRuleStatus_3_9 failed ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }
                Y.log( `migrateActivityRuleStatus_3_9 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );
        }

        function migrateGkvInvoiceReceiver_3_10( user, callback ) {
            const async = require( 'async' );
            Y.log( `migrateGkvInvoiceReceiver_3_10 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            Y.doccirrus.mongodb.getModel( user, 'location', true, ( err, locationModel ) => {
                if( err ) {
                    Y.log( `migrateGkvInvoiceReceiver_3_10 failed: could not get location model ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }

                locationModel.mongoose.collection.find( {
                    commercialNo: {$ne: null},
                    gkvInvoiceReceiver: null
                } ).toArray( ( err, locations ) => {
                    if( err ) {
                        Y.log( `migrateGkvInvoiceReceiver_3_10 failed: could not get locations ${JSON.stringify( err )}`, 'error', NAME );
                        callback( err );
                        return;
                    }

                    async.each( locations, ( location, done ) => {
                        const newGkvInvoiceReceiver = Y.doccirrus.schemas.location.getGkvInvoiceReceiverFromCommercialNo( location.commercialNo );
                        if( !newGkvInvoiceReceiver ) {
                            return done();
                        }
                        locationModel.mongoose.collection.update( {_id: location._id}, {$set: {gkvInvoiceReceiver: newGkvInvoiceReceiver}}, done );
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `migrateGkvInvoiceReceiver_3_10 failed ${JSON.stringify( err )}`, 'error', NAME );
                            callback( err );
                            return;
                        }
                        Y.log( `migrateGkvInvoiceReceiver_3_10 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                        callback();
                    } );
                } );
            } );

        }

        function migrateDeleteOldBrokenTasks_3_10( user, callback ) {
            const
                async = require( 'async' );
            Y.log( `migrateDeleteOldBrokenTasks_3_10 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'task', true, next );
                },
                function( taskModel, next ) {
                    taskModel.mongoose.collection.remove( {
                        roles: {$exists: false},
                        candidates: {$exists: false},
                        callTime: {$exists: false}
                    } ).then( () => {
                        next();
                    } ).catch( next );
                }], err => {
                if( err ) {
                    Y.log( `migrateDeleteOldBrokenTasks_3_10 failed ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }
                Y.log( `migrateDeleteOldBrokenTasks_3_10 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );

        }

        function migratePartnerConfiguration_3_10( user, callback ) {
            Y.log( `migratePartnerConfiguration_3_10 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            const
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                predefinedId = new ObjectId( "000000000000000000000001" ),
                async = require( 'async' ),
                query = {
                    $and: [
                        {status: {$ne: 'LICENSED'}},

                        {
                            $or: [
                                {configuration: {$exists: false}},
                                {configuration: {$size: 0}},
                                {"configuration._id": {$ne: predefinedId}}
                            ]
                        }

                    ]
                },
                data = {
                    '_id': predefinedId,
                    'automaticProcessing': false,
                    'subTypes': [],
                    'caseFolders': ['ALL'],
                    'actStatuses': ['APPROVED'],
                    'actTypes': ['ALL']
                };

            async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'partner', true, next );
                    },
                    function( partnerModel, next ) {
                        const cursor = partnerModel.mongoose.find( query ).cursor();
                        let updated = 0;
                        cursor.eachAsync( doc => {
                            return new Promise( ( resolve ) => {
                                let conf = doc.configuration || [];
                                conf = [data, ...conf];

                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'partner',
                                    migrate: true,
                                    action: 'mongoUpdate',
                                    query: {_id: doc._id},
                                    data: {$set: {configuration: conf}}
                                }, ( err ) => {
                                    if( err ) {
                                        Y.log( `migratePartnerConfiguration_3_10 could not update reporting: ${doc._id && doc._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                        resolve(); //continue updating
                                    } else {
                                        updated++;
                                        resolve();
                                    }
                                } );
                            } );
                        } ).then( () => {
                            Y.log( `migratePartnerConfiguration_3_10 updates ${updated} documents`, 'debug', NAME );
                            next();
                        } ).catch( err => {
                            next( err );
                        } );
                    }], (err => {
                    if( err ) {
                        Y.log( 'migratePartnerConfiguration_3_10 failed ' + err.message, 'error', NAME );
                        return callback( err );
                    }
                    Y.log( `migratePartnerConfiguration_3_10 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                    callback();
                })
            );
        }

        /*
        * With EXTMOJ-1123, targeted for sprint 3.11, for 'labtest' collection we have added a new key "userGenerated": <boolean> in schema.
        * The purpose of this migration is to delete all the records from 'labtest' collection and repopulate it with updated data which would
        * include the newly added "userGenerated" key in the schema and also populate tags collection with the corresponding "LABDATA" tags.
        *
        * This method does below:
        * 1] Delete all records from labtest collection so that we can repopulate it at a later step with updated data
        * 2] Just for extra safety, delete all the tags record with type = "LABDATA"
        * 3] Re-populate the the 'labtest' collection with updated record and also generate corresponding records
        *    in tags collection with type = "LABDATA"
        * */
        async function cleanAndBuildLabTestsAndTagscollection_3_10( user, callback ) { // eslint-disable-line
            let
                err,
                result,
                labtestModel,
                tagModel;

            Y.log( `cleanAndBuildLabTestsAndTagscollection_3_10: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            // ----------------- 1. Get the 'labtest' collection DB model -------------------------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'labtest', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `cleanAndBuildLabTestsAndTagscollection_3_10: Error getting labtest collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `cleanAndBuildLabTestsAndTagscollection_3_10: Failed to fetch labtest collection model`, "error", NAME );
                return callback( `cleanAndBuildLabTestsAndTagscollection_3_10: Failed to fetch labtest collection model` );
            }

            labtestModel = result;
            // -------------------- 1. END --------------------------

            // --------------------------- 2. Get 'tag' collection DB model ------------------------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'tag', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `cleanAndBuildLabTestsAndTagscollection_3_10: Error getting tag collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `cleanAndBuildLabTestsAndTagscollection_3_10: Failed to fetch tag collection model`, "error", NAME );
                return callback( `cleanAndBuildLabTestsAndTagscollection_3_10: Failed to fetch tag collection model` );
            }

            tagModel = result;
            // ---------------------- 2. END --------------------------------

            // ---------------------- 3. Delete all records from labtest collection because we want to re-populate it with data containing schema changes --------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                labtestModel.mongoose.collection.deleteMany( {} )
            );

            if( err ) {
                Y.log( `cleanAndBuildLabTestsAndTagscollection_3_10: Error while dropping labtest collection. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // ----------------------- 3. END ----------------------------------------------

            // ----------------------- 4. Delete all records, just for safety, in tags with "type" = "LABDATA"
            [err, result] = await formatPromiseResult( //jshint ignore:line
                tagModel.mongoose.collection.deleteMany( {type: "LABDATA"} )
            );

            if( err ) {
                Y.log( `cleanAndBuildLabTestsAndTagscollection_3_10: Error while deleting LABDATA tags from tag collection. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // ----------------------------- 4. END -------------------

            // -------------------- 5. Populate labtest collection and create corresponding LABDATA tags with updated data which includes schema changes -----------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.labtest.generateTestsIfEmpty( {
                        user,
                        migrate: true,
                        callback( genErr, genRes ) {
                            if( genErr ) {
                                reject( genErr );
                            } else {
                                resolve( genRes );
                            }
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `cleanAndBuildLabTestsAndTagscollection_3_10: Error while populating records in labtest collection and creating corresponding LABDATA tags. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // --------------------- 5. END --------------------------------------------------

            Y.log( `cleanAndBuildLabTestsAndTagscollection_3_10: Successfully ended migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        /*
        * For MOJ-9493
        * */
        async function migratePatientDobToKbvDobInInpacsWorklist_3_10( user, callback ) { //jshint ignore:line
            if( !Y.doccirrus.auth.isPRC() ) {
                callback();
                return;
            }

            let
                err,
                result,
                inpacsworklistModel,
                inpacsWorklistsArr,
                oldDobTemplate = "{{ moment(dob, 'DD.MM.YYYY').format('YYYYMMDD') }}",
                newDobTemplate = "{{ moment(kbvDob, 'DD.MM.YYYY').format('YYYYMMDD') }}";

            Y.log( `migratePatientDobToKbvDobInInpacsWorklist: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            // --------------------------------- 1. Get inpacsworklist DB model ------------------------------------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'inpacsworklist', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `migratePatientDobToKbvDobInInpacsWorklist: Error getting inpacsworklist collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `migratePatientDobToKbvDobInInpacsWorklist: Failed to fetch inpacsworklist collection model`, "error", NAME );
                return callback( `migratePatientDobToKbvDobInInpacsWorklist: Failed to fetch inpacsworklist collection model` );
            }

            inpacsworklistModel = result;
            // ------------------------------ 1. END --------------------------------------------

            // --------------------------- 2. Get all the records from inpacsworklists collection ------------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                inpacsworklistModel.mongoose.collection.find().toArray()
            );

            if( err ) {
                Y.log( `migratePatientDobToKbvDobInInpacsWorklist: Error fetching all records from inpacsworklists collection. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result || !Array.isArray( result ) || !result.length ) {
                Y.log( `migratePatientDobToKbvDobInInpacsWorklist: No records found in inpacsworklists. Expected entries for modalities`, "warn", NAME );
                return callback();
            }

            inpacsWorklistsArr = result;
            // --------------------------------- 2. END ------------------------------------------

            // -------------------------------- 3. For each worklist record update PatientBirthDate template from oldDobTemplate to newDobTemplate --------
            /* jshint -W083, -W030 */
            for( let worklistRecord of inpacsWorklistsArr ) {
                let
                    hasChanged = false,
                    alreadyChanged = false;

                if( worklistRecord.workListData ) {
                    worklistRecord.workListData.forEach( ( worklistDataItem ) => {
                        if( worklistDataItem.comment === "PatientBirthDate" ) {
                            if( worklistDataItem.template === oldDobTemplate ) {
                                worklistDataItem.template = newDobTemplate;
                                hasChanged = true;
                            } else if( worklistDataItem.template === newDobTemplate ) {
                                alreadyChanged = true;
                                Y.log( `migratePatientDobToKbvDobInInpacsWorklist: Template already changed to new i.e. ${newDobTemplate} for inpacsworklists Id: ${worklistRecord._id.toString()}`, "info", NAME );
                            } else {
                                Y.log( `migratePatientDobToKbvDobInInpacsWorklist: PatientBirthDate template did not match: ${oldDobTemplate} for inpacsworklists Id: ${worklistRecord._id.toString()}. Current template is: ${worklistDataItem.template}. Not changing anything for this record...`, "warn", NAME );
                            }
                        }
                    } );
                }

                if( alreadyChanged ) {
                    continue;
                }

                if( !hasChanged ) {
                    Y.log( `migratePatientDobToKbvDobInInpacsWorklist: Template mismatch for inpacsworklists Id: ${worklistRecord._id.toString()}. Expected template change for PatientBirthDate. Skipping this record...`, "warn", NAME );
                    continue;
                }

                [err, result] = await formatPromiseResult( //jshint ignore:line
                    inpacsworklistModel.mongoose.collection.updateOne( {_id: worklistRecord._id}, {$set: {workListData: worklistRecord.workListData}} )
                );

                if( err ) {
                    Y.log( `migratePatientDobToKbvDobInInpacsWorklist: Error updating workListData for inpacsworklists ID: ${worklistRecord._id.toString()}. Error: ${err.stack || err}`, "error", NAME );
                    return callback( err );
                }

                if( !result || !result.result || result.result.n !== 1 ) {
                    Y.log( `migratePatientDobToKbvDobInInpacsWorklist: Failed to update workListData for inpacsworklists ID: ${worklistRecord._id.toString()}`, "error", NAME );
                    return callback( `migratePatientDobToKbvDobInInpacsWorklist: Failed to update workListData for inpacsworklists ID: ${worklistRecord._id.toString()}` );
                }
            }
            // ----------------------------- 3. END -----------------------------------------------------

            Y.log( `migratePatientDobToKbvDobInInpacsWorklist: Successfully completed migration`, "info", NAME );
            callback();
        }

        /*
        * With MOJ-7985, we have added one more document in admins collection. The document is as below:
        * {
        *   _id: "000000000000000000000015",
        *   cronJobName: "datasafeBackup",
        *   cronTimeHoursInDay: [Number]
        * }
        *
        * This migration just checks whether there is any document at _id = "000000000000000000000015". If not then it inserts
        * the default document else it does nothing
        * */
        async function checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10( user, callback ) { //jshint ignore:line
            if( !Y.doccirrus.auth.isPRC() && !Y.doccirrus.auth.isISD() && !Y.doccirrus.auth.isMTSAndMasterUser( user ) ) {
                callback();
                return;
            }

            let
                err,
                result,
                adminModel,
                datasafeJobDetails = Y.doccirrus.schemas.admin.getDatasafeDefaultBackupJobDetails(),
                ObjectId = require( 'mongoose' ).Types.ObjectId;

            Y.log( `checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            // --------------------------------- 1. Get 'admin' DB model ----------------------------------------------------------------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'admin', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10: Error getting 'admin' collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10: Failed to fetch 'admin' collection model`, "error", NAME );
                return callback( `checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10: Failed to fetch 'admin' collection model` );
            }

            adminModel = result;
            // ------------------------------ 1. END -------------------------------------------------------------------------------------

            // ------------ 2. Query 'admins' collection for _id = '000000000000000000000015' to check if there is a record already-------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                adminModel.mongoose.collection.findOne( {_id: ObjectId( datasafeJobDetails._id )} )
            );

            if( err ) {
                Y.log( `checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10: Error querying 'admins' collection for _id: ${datasafeJobDetails._id}. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( result ) {
                Y.log( `checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10: Found job details for: ${datasafeJobDetails.cronJobName} in the DB. All good, nothing to do...`, "info", NAME );
                return callback();
            }
            // ------------ 2. END -------------------------------------------------------------------------------------------------------

            // ---- 3. At this point it is clear that that we need to insert "datasafeBackup" CronJob details in Admins collection --------
            [err, result] = await formatPromiseResult( //jshint ignore:line
                adminModel.mongoose.collection.insertOne( {
                    _id: ObjectId( datasafeJobDetails._id ),
                    cronJobName: datasafeJobDetails.cronJobName,
                    cronTimeHoursInDay: datasafeJobDetails.cronTimeHoursInDay
                } )
            );

            if( err ) {
                Y.log( `checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10: Error while inserting ${datasafeJobDetails.cronJobName} cron job details in 'admins' collection. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result || result.insertedCount !== 1 ) {
                Y.log( `checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10: Failed to insert ${datasafeJobDetails.cronJobName} cron job details in 'admins' collection.`, "error", NAME );
                return callback( `checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10: Failed to insert ${datasafeJobDetails.cronJobName} cron job details in 'admins' collection.` );
            }
            // ----------------------------------- 3. END ----------------------------------------------------------------------------------

            Y.log( `checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        /**
         * Sets the DOQUVIDE systemType to DSCK in the DCPRC.
         * From there it is automatically propagated to the systems.
         *
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateDSCK( user, callback ) {
            const
                async = require( 'async' );
            Y.log( `migrateDSCK starting migration`, 'debug', NAME );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.getModel( user, 'company', true, next );
                },
                function( companyModel, next ) {
                    companyModel.mongoose.collection.update( {systemType: "DOQUVIDE"}, {
                        $set: {systemType: "DSCK"}
                    }, {multi: true} ).then( () => {
                        next();
                    } ).catch( next );
                }], err => {
                if( err ) {
                    Y.log( `migrateDSCK failed ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }
                Y.log( `migrateDSCK migrated for tenant ${user.tenantId}`, 'debug', NAME );
                callback();
            } );

        }

        /**
         *  Special case, run on patch version outside of normal migrate process, MOJ-9662
         *
         *  @param  {Object}    user
         *  @param  {Function}  callback
         */

        function migrateSpecialTreatmentInvoiceId( user, callback ) {
            Y.log( 'Checking if we should run migration for treatment invoiceIds, tenant: ' + user.tenantId, 'debug', NAME );
            Y.doccirrus.inCaseUtils.migrationhelper.checkInvoiceIdOnTreatments( user, true, callback );
        }

        /**
         * Sets allowPRCAdhoc for practices with allowAdhoc === true.
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateAllowAdhoc_3_11( user, callback ) {
            Y.log( `migrateAllowAdhoc_3_11 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            const
                async = require( 'async' );
            async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'practice', true, next );
                    },
                    function( practiceModel, next ) {
                        practiceModel.mongoose.update( {allowAdhoc: true}, {$set: {'allowPRCAdhoc': true}} )
                            .then( () => {
                                return next();
                            } )
                            .catch( ( error ) => {
                                next( error );
                            } );
                    }], (err => {
                    if( err ) {
                        Y.log( 'migrateAllowAdhoc_3_11 failed ' + err.message, 'error', NAME );
                        return callback( err );
                    }
                    Y.log( `migrateAllowAdhoc_3_11 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                    callback();
                })
            );
        }

        function migratePatientEmployees_3_11( user, callback ) {
            Y.log( `migratePatientEmployees_3_11 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            let
                async = require( 'async' ),
                patientModel;

            async.waterfall( [
                ( next ) => {
                    Y.doccirrus.mongodb.getModel( user, 'patient', true, next );
                },
                ( model, next ) => {
                    patientModel = model;
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, next );
                },
                ( activityModel, next ) => {
                    let cursor = activityModel.mongoose.aggregate( {
                        $group: {
                            _id: '$patientId',
                            employees: {$addToSet: '$employeeId'}
                        }
                    } ).cursor( {batchSize: 10} ).exec();
                    next( null, cursor );
                },
                ( cursor, next ) => {
                    cursor.eachAsync( result => {
                        return new Promise( ( resolve, reject ) => {
                            patientModel.mongoose.update( {
                                _id: result._id,
                                employees: {$exists: false}
                            }, {
                                $set: {
                                    employees: result.employees
                                }
                            }, function( err ) {
                                if( err ) {
                                    return reject( err );
                                }
                                resolve();
                            } );
                        } );
                    } ).then( () => {
                        next();
                    } ).catch( err => {
                        next( err );
                    } );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( 'migratePatientEmployees_3_11 failed ' + err.message, 'error', NAME );
                    return callback( err );
                }
                Y.log( `migratePatientEmployees_3_11 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                return callback();
            } );
        }

        async function migratePatientsPVSapprove_3_11( user, callback ) {
            Y.log( `migratePatientsPVSapprove_3_11 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            let
                err;

            [err] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {dataTransmissionToPVSApproved: {$exists: false}},
                    data: {
                        $set: {dataTransmissionToPVSApproved: true}
                    },
                    options: {
                        multi: true
                    }
                } )
            );
            if( err ) {
                Y.log( `migratePatientsPVSapprove_3_11 error updating patients ${err.message}`, 'debug', NAME );
            }

            [err] = await formatPromiseResult( //jshint ignore:line
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patientversion',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {dataTransmissionToPVSApproved: {$exists: false}},
                    data: {
                        $set: {dataTransmissionToPVSApproved: true}
                    },
                    options: {
                        multi: true
                    }
                } )
            );
            if( err ) {
                Y.log( `migratePatientsPVSapprove_3_11 error updating patients ${err.message}`, 'debug', NAME );
            }

            Y.log( `migratePatientsPVSapprove_3_11: completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        /**
         * MOJ-9395
         * @param {Object} user
         * @param {Function} callback
         */
        function migrateBrokenScheinChains_3_11( user, callback ) {
            Y.log( `migrateBrokenScheinChains_3_11 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            Y.doccirrus.api.activity.fixBilledScheinChains( {
                user,
                options: {
                    migrate: true
                },
                callback( err ) {
                    if( err ) {
                        Y.log( `migrateBrokenScheinChains_3_11 failed  ${err.message} for tenant ${user.tenantId}`, 'error', NAME );
                        return callback( err );
                    }
                    Y.log( `migrateBrokenScheinChains_3_11 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                    return callback();
                }
            } );
        }

        function migrateActivityttypeToScheduletype_3_11( user, callback ) {
            Y.log( `migrateActivityttypeToScheduletype_3_11 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            var
                async = require( 'async' ),
                syncreportingModel,
                syncReportingEntries = [],
                now = new Date();

            async.waterfall( [
                ( next ) => {
                    Y.doccirrus.mongodb.getModel( user, 'activitytype', true, next );
                },
                ( activitytypeModel, next ) => {
                    activitytypeModel.mongoose.collection.rename( 'scheduletypes' ).then( () => {
                        next();
                    } ).catch( error => {
                        if( error ) {
                            Y.log( `migrateActivityttypeToScheduletype_3_11 could not rename activitytype for tenant ${user.tenantId}. Error:  ${error.message}`, 'error', NAME );
                        }
                        next();
                    } );
                },
                ( next ) => {
                    Y.doccirrus.mongodb.getModel( user, 'syncreporting', true, next );
                },
                ( model, next ) => {
                    syncreportingModel = model;
                    Y.doccirrus.mongodb.getModel( user, 'schedule', true, next );
                },
                ( scheduleModel, next ) => {
                    let cursor = scheduleModel.mongoose.find( {
                        scheduletype: {$exists: false}
                    } ).cursor();
                    next( null, scheduleModel, cursor );
                },
                ( scheduleModel, cursor, next ) => {
                    cursor.eachAsync( result => {
                        return Promise.all( [
                            new Promise( ( resolve, reject ) => {
                                if( result.toJSON().activitytype ) {
                                    scheduleModel.mongoose.update( {
                                            _id: result._id
                                        },
                                        {
                                            scheduletype: result.toJSON().activitytype,
                                            $unset: {'activitytype': 1}
                                        }, {strict: false},
                                        function( err ) {
                                            if( err ) {
                                                return reject( err );
                                            }
                                            resolve();
                                        } );
                                } else {
                                    resolve();
                                }
                            } ),
                            new Promise( ( resolve, reject ) => {
                                syncreportingModel.mongoose.findOne( {entryId: result.toJSON()._id} ).then( syncreport => {
                                    if( syncreport ) {
                                        resolve();
                                    } else {
                                        syncReportingEntries.push( {
                                            entityName: "schedule",
                                            entryId: result._id.toString(),
                                            timestamp: now
                                        } );
                                        resolve();
                                    }

                                } ).catch( reject );
                            } )
                        ] );
                    } ).then( () => {
                        next();
                    } ).catch( err => {
                        next( err );
                    } );
                },
                ( next ) => {
                    Y.doccirrus.api.reporting.reportingDBaction( {
                        mongoose: true,
                        user,
                        action: 'remove',
                        query: {scheduleId: {$exists: true}},
                        callback: next
                    } );
                },
                ( next ) => {
                    if( syncReportingEntries.length ) {
                        syncreportingModel.mongoose.collection.insert( syncReportingEntries ).then( () => {
                            next();
                        } ).catch( next );
                    } else {
                        return next();
                    }
                },
                ( next ) => {
                    Y.doccirrus.api.reporting.generateScheduleReportings( {
                        'user': user,
                        'data': {'fullGeneration': true},
                        'callback': next
                    } );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `migrateActivityttypeToScheduletype_3_11 failed  ${err.message} for tenant ${user.tenantId}`, 'error', NAME );
                    return callback( err );
                }
                Y.log( `migrateActivityttypeToScheduletype_3_11 migrated for tenant ${user.tenantId}`, 'debug', NAME );
                return callback();
            } );
        }

        /**
         * MOJ-9407:
         * Work Stations are not simply a label anymore. They have their own collection and can be linked to
         * TI - Card Terminals.
         *
         * This change affects the profile-schema and the identity-schema:
         * - the "profileHost" values are copied to documents on the workstations collection.
         * - the "profileHost" String field becomes a Object-Id field referencing a workstation.
         *
         * @param {Object} user
         * @param {Function} callback
         */
        async function migrateProfileHost_3_11( user, callback ) {

            Y.log( `migrateProfileHost_3_11 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );

            let
                err,
                result,
                profileModel,
                identityModel,
                workStations;

            // ---------------------------------------------- 1. Get Profiles ----------------------------------------------
            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'profile',
                    action: 'get',
                    migrate: true,
                    options: {
                        select: {
                            _id: 1,
                            profileHost: 1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `migrateProfileHost_3_11 error retrieving profiles ${err.message}`, 'debug', NAME );
                return callback( err );
            }
            if( !result || !Array.isArray( result ) ) {
                Y.log( `migrateProfileHost_3_11 No profiles. All good, nothing to do...`, 'debug', NAME );
                return callback();
            }
            result = result.filter( profile => profile.profileHost );
            if( !result.length ) {
                Y.log( `migrateProfileHost_3_11 No profiles with profileHost fields. All good, nothing to do...`, 'debug', NAME );
                return callback();
            }
            // -------------------------------------------------- 1. End ---------------------------------------------------

            // ------------------------------ 2. Create Work Stations from profileHost fields ------------------------------
            let
                notNamedCount = 1;
            for( const profile of result ) {
                const workStation = {
                    humanId: profile.profileHost && profile.profileHost.replace( /\s+|[^A-Za-z0-9]*/g, '' ) || `OhneNamen${notNamedCount}`, // removing spaces and special characters
                    name: profile.profileHost
                };
                if( !profile.profileHost.replace( /\s+|[^A-Za-z0-9]*/g, '' ) ) {
                    notNamedCount += 1;
                }

                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'workstation',
                        action: 'upsert',
                        query: {name: workStation.name},
                        data: Y.doccirrus.filters.cleanDbObject( workStation ),
                        migrate: true
                    } )
                );

                if( err ) {
                    Y.log( `migrateProfileHost_3_11 error saving work stations ${err.message}`, 'debug', NAME );
                    return callback( err );
                }
            }
            // -------------------------------------------------- 2. End ---------------------------------------------------

            // ------------------------------------------- 3. Get Work Stations --------------------------------------------
            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'workstation',
                    action: 'get',
                    migrate: true
                } )
            );

            if( err ) {
                Y.log( `migrateProfileHost_3_11 error getting work stations ${err.message}`, 'debug', NAME );
                return callback( err );
            }
            if( !result || !Array.isArray( result ) || !result.length ) {
                Y.log( `migrateProfileHost_3_11 No workstations. All good, nothing to do...`, 'debug', NAME );
                return callback();
            }

            workStations = result;
            // -------------------------------------------------- 3. End ---------------------------------------------------

            // ------------------------------------ 4. Get profile and identity models ------------------------------------
            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'profile', true, ( err, profileModel ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( profileModel );
                        }
                    } );
                } )
            );
            if( err ) {
                Y.log( `migrateProfileHost_3_11 error getting profile model ${err.message}`, 'debug', NAME );
                return callback( err );
            }
            profileModel = result;

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'identity', true, ( err, identityModel ) => {
                        if( err ) {
                            reject( err );
                        } else {
                            resolve( identityModel );
                        }
                    } );
                } )
            );
            if( err ) {
                Y.log( `migrateProfileHost_3_11 error getting identity model ${err.message}`, 'debug', NAME );
                return callback( err );
            }
            identityModel = result;
            // -------------------------------------------------- 4. End ---------------------------------------------------

            // ------------------------------------- 5. Update profiles and identities -------------------------------------
            for( const workStation of workStations ) {

                [err, result] = await formatPromiseResult(
                    profileModel.mongoose.collection.update( {profileHost: workStation.name}, {
                        $set: {workStation: workStation._id},
                        $unset: {profileHost: 1}
                    }, {multi: true} )
                );
                if( err ) {
                    Y.log( `migrateProfileHost_3_11 error updating profiles ${err.message}`, 'debug', NAME );
                    return callback( err );
                }

                [err, result] = await formatPromiseResult(
                    identityModel.mongoose.collection.update( {"profileLastActivated.profileHost": workStation.name}, {
                        $set: {"profileLastActivated.workStation": workStation._id},
                        $unset: {"profileLastActivated.profileHost": 1}
                    }, {multi: true} )
                );
                if( err ) {
                    Y.log( `migrateProfileHost_3_11 error updating identities ${err.message}`, 'debug', NAME );
                    return callback( err );
                }
            }
            // -------------------------------------------------- 5. End ---------------------------------------------------

            Y.log( `migrateProfileHost_3_11: completed migration for tenant: ${user.tenantId}`, "info", NAME );
            return callback();
        }

        /*
        * This migration adds attributes "sampleNormalValueText", "unit" and "testLabel" to existing LABDATA tags (Previously it only had "title" and "type" keys) in
        * tags collection.
        *
        * The method does below:
        *   1] Get tag collection model
        *   2] Get activity collection model
        *   3] Get labtest collection model
        *   4] Get all LABDATA tags from tags collection
        *   5] For each LABDATA tag does below:
        *       5a] Check if corresponding labtest record exists. If yes then goes to (5b) else deletes LABDATA tag (because no corresponding labtest exists) and
        *           continue to next LABDATA tag skipping next steps
        *       5b] Check if there is ATLEAST one user-generated activity which is still using the tag. If yes go to (5c) else deletes labtest and LABDATA tag records
        *           and continues to next LABDATA tag skipping next steps
        *       5c] By this point we are certain that for the LABDATA tag there exists a corresponding labtest and atleast one user-generated activity (which uses the tag)
        *           and so we add "sampleNormalValueText", "unit" and "testLabel" to current LABDATA tag and save it in DB
        * */
        async function addLabDataAttributesInTagsCollection_3_11( user, callback ) {
            let
                err,
                result,
                activityModel,
                tagModel,
                labTestmodel,
                labDataTagsArr;

            Y.log( `addLabDataAttributesInTagsCollection_3_11: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            // ------------------------- 1. Get 'tag' collection DB model ---------------------------------------
            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'tag', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `addLabDataAttributesInTagsCollection_3_11: Error getting tag collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `addLabDataAttributesInTagsCollection_3_11: Failed to fetch tag collection model`, "error", NAME );
                return callback( `addLabDataAttributesInTagsCollection_3_11: Failed to fetch tag collection model` );
            }

            tagModel = result;
            // ------------------------- 1. END ---------------------------------------------------------------------

            // ------------------------- 2. Get 'activity' collection DB model ---------------------------------------
            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `addLabDataAttributesInTagsCollection_3_11: Error getting activity collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `addLabDataAttributesInTagsCollection_3_11: Failed to fetch activity collection model`, "error", NAME );
                return callback( `addLabDataAttributesInTagsCollection_3_11: Failed to fetch activity collection model` );
            }

            activityModel = result;
            // ------------------------- 2. END ---------------------------------------------------------------------

            // ------------------------- 3. Get 'labtest' collection DB model ---------------------------------------
            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'labtest', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `addLabDataAttributesInTagsCollection_3_11: Error getting 'labtest' collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `addLabDataAttributesInTagsCollection_3_11: Failed to fetch 'labtest' collection model`, "error", NAME );
                return callback( `addLabDataAttributesInTagsCollection_3_11: Failed to fetch 'labtest' collection model` );
            }

            labTestmodel = result;
            // ------------------------- 3. END -------------------------------------------------------------------------------

            // ---------------------- 4. Get all 'LABDATA' tags from tags collection -----------------------------------------
            [err, result] = await formatPromiseResult(
                tagModel.mongoose.collection.find( {type: Y.doccirrus.schemas.tag.tagTypes.LABDATA} ).toArray()
            );

            if( err ) {
                Y.log( `addLabDataAttributesInTagsCollection_3_11: Error fetching LABDATA tags from tags collection. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result || !Array.isArray( result ) || !result.length ) {
                Y.log( `addLabDataAttributesInTagsCollection_3_11: No LABDATA tags found in tags collection. All good, nothing to do...`, "info", NAME );
                return callback();
            }

            labDataTagsArr = result;
            // ------------------------ 4. END --------------------------------------------------------------------------------

            // ------- 5. For each LABDATA tag, fetch attribute details from corresponding labtest record and add those attributes in LABDATA tag in DB --------
            for( let labDataTag of labDataTagsArr ) {

                // ------ 5a. Fetch corresponding labtest record using labDataTag.title and userGenerated = true -------------
                [err, result] = await formatPromiseResult(
                    labTestmodel.mongoose.collection.findOne( {
                        userGenerated: true,
                        head: labDataTag.title
                    } )
                );

                if( err ) {
                    Y.log( `addLabDataAttributesInTagsCollection_3_11: Error while querying labtest record for query: ${JSON.stringify( {
                        userGenerated: true,
                        head: labDataTag.title
                    } )}. Error: ${err.stack || err}`, "error", NAME );
                    return callback( err );
                }

                if( !result ) {
                    // ----- If there is NOT A SINGLE labtest record for the LABDATA tag then delete the LABDATA tag as well ----------------------
                    Y.log( `addLabDataAttributesInTagsCollection_3_11: No labtest record found for query: ${JSON.stringify( {
                        userGenerated: true,
                        head: labDataTag.title
                    } )}. Expected 1 record. Tag title: ${labDataTag.title} is obsolete and will be deleted from tags collection`, "warn", NAME );

                    [err, result] = await formatPromiseResult(
                        tagModel.mongoose.collection.deleteOne( {_id: labDataTag._id} )
                    );

                    if( err ) {
                        Y.log( `addLabDataAttributesInTagsCollection_3_11: Error while deleting orphan LABDATA tag with _id = ${labDataTag._id.toString()} and title = ${labDataTag.title} from tags collection. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }

                    if( !result || !result.result || result.result.n !== 1 ) {
                        Y.log( `addLabDataAttributesInTagsCollection_3_11: Failed to delete orphan LABDATA tag with _id = ${labDataTag._id.toString()} and title = ${labDataTag.title} from tags collection`, "error", NAME );
                        return callback( `addLabDataAttributesInTagsCollection_3_11: Failed to delete orphan LABDATA tag with _id = ${labDataTag._id.toString()} and title = ${labDataTag.title} from tags collection` );
                    }

                    Y.log( `addLabDataAttributesInTagsCollection_3_11: Deleted orphan LABDATA tag with _id = ${labDataTag._id.toString()} and title = ${labDataTag.title} from tags collection`, "info", NAME );
                    continue;
                    // ------------ Delete END ---------------------------------------------------------------------------------------------------
                }
                // ----------------------------------------- 5a. END ------------------------------------------------------------------------------

                let
                    updatedLabDataRecord = {},
                    labTestObj = result;

                // ---- 5b. Check if there is atleast one LABDATA activity which still has l_extra.testId.head === labDataTag.title, if not delete labtest and LABDATA tag from DB ------
                [err, result] = await formatPromiseResult(
                    activityModel.mongoose.collection.findOne( {
                        actType: 'LABDATA',
                        'l_extra.testId.head': labDataTag.title,
                        labText: {$exists: false},
                        "l_extra.0": {"$exists": false}
                    } )
                );

                if( err ) {
                    Y.log( `addLabDataAttributesInTagsCollection_3_11: Error while querying LABDATA activity for l_extra.testId.head = ${labDataTag.title}. Error: ${err.stack || err}`, "error", NAME );
                    return callback( err );
                }

                if( !result ) {
                    // Means labTestObj and labDataTag are orphan records without any activity. We can delete those
                    Y.log( `addLabDataAttributesInTagsCollection_3_11: LABDATA tag with title = ${labDataTag.title} is not found in activity. Deleting associated labtest with _id = ${labTestObj._id.toString()} and LABDATA tag with _id = ${labDataTag._id.toString()}`, "warn", NAME );

                    // ------------- Delete labtest record ----------------------------
                    [err, result] = await formatPromiseResult(
                        labTestmodel.mongoose.collection.deleteOne( {_id: labTestObj._id} )
                    );

                    if( err ) {
                        Y.log( `addLabDataAttributesInTagsCollection_3_11: Error while deleting orphan (because of no activity) labtest with _id = ${labTestObj._id.toString()} and head = ${labTestObj.head}. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }

                    if( !result || !result.result || result.result.n !== 1 ) {
                        Y.log( `addLabDataAttributesInTagsCollection_3_11: Failed to delete orphan (because of no activity) labtest with _id = ${labTestObj._id.toString()} and head = ${labTestObj.head}`, "error", NAME );
                        return callback( `addLabDataAttributesInTagsCollection_3_11: Failed to delete orphan (because of no activity) labtest with _id = ${labTestObj._id.toString()} and head = ${labTestObj.head}` );
                    }
                    // ------------ END --------------------------------------------

                    // ---------------- Delete LABDATA tag -------------------------
                    [err, result] = await formatPromiseResult(
                        tagModel.mongoose.collection.deleteOne( {_id: labDataTag._id} )
                    );

                    if( err ) {
                        Y.log( `addLabDataAttributesInTagsCollection_3_11: Error while deleting orphan (because of no activity) LABDATA tag with _id = ${labDataTag._id.toString()} and title = ${labDataTag.title}. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }

                    if( !result || !result.result || result.result.n !== 1 ) {
                        Y.log( `addLabDataAttributesInTagsCollection_3_11: Failed to delete orphan (because of no activity) LABDATA tag with _id = ${labDataTag._id.toString()} and title = ${labDataTag.title}`, "error", NAME );
                        return callback( `addLabDataAttributesInTagsCollection_3_11: Failed to delete orphan (because of no activity) LABDATA tag with _id = ${labDataTag._id.toString()} and title = ${labDataTag.title}` );
                    }
                    // ------------------- END --------------------------------------
                    continue;
                }
                // ------------------------------ 5b. END ----------------------------------------------------------------------------

                // ---------------------------------- 5c. Update LABDATA tag ------------------------------------------------------------
                if( typeof labTestObj.testLabel === "string" ) {
                    updatedLabDataRecord.testLabel = labTestObj.testLabel;
                }

                if( typeof labTestObj.TestResultUnit === "string" ) {
                    updatedLabDataRecord.unit = labTestObj.TestResultUnit; // We are mapping TestResultUnit to unit
                }

                if( labTestObj.sampleNormalValueText ) {
                    updatedLabDataRecord.sampleNormalValueText = labTestObj.sampleNormalValueText;
                }

                [err, result] = await formatPromiseResult(
                    tagModel.mongoose.collection.updateOne( {_id: labDataTag._id}, {$set: updatedLabDataRecord} )
                );

                if( err ) {
                    Y.log( `addLabDataAttributesInTagsCollection_3_11: Error while updating LABDATA tag having title = ${labDataTag.title} and _id = ${labDataTag._id.toString()} with attributes = ${JSON.stringify( updatedLabDataRecord )}. Error: ${err.stack || err}`, "error", NAME );
                    return callback( err );
                }

                if( !result || !result.result || result.result.n !== 1 ) {
                    Y.log( `addLabDataAttributesInTagsCollection_3_11: Failed to add attributes = ${JSON.stringify( updatedLabDataRecord )} to LABDATA tag with tag ID: ${labDataTag._id.toString()} and title = ${labDataTag.title}`, "error", NAME );
                    return callback( `addLabDataAttributesInTagsCollection_3_11: Failed to add attributes = ${JSON.stringify( updatedLabDataRecord )} to LABDATA tag with tag ID: ${labDataTag._id.toString()} and title = ${labDataTag.title}` );
                }
                // -------------------------------- 5c. END --------------------------------------------------------------------------------

                Y.log( `addLabDataAttributesInTagsCollection_3_11: Successfully updated LABDATA tag title = ${labDataTag.title} with attributes = ${JSON.stringify( updatedLabDataRecord )}`, "info", NAME );
            }
            // ---------------------------- 5. END --------------------------------------------------------------------------------------

            Y.log( `addLabDataAttributesInTagsCollection_3_11: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        /*
        * This migration adds "unit" attribute to existing MEDDATA tags (Previously it only had "title" and "type" keys) in tags collection.
        *
        * This method does below:
        *   1] Get tag collection model
        *   2] Get activity collection model
        *   3] Get all MEDDATA tags from tags collection
        *   4] For each MEDDATA tag does below:
        *       4a] If MEDDATA tag does not have title set (which should never happen), then delete the MEDDATA tag from tags collection, skip the next step, and
        *           process next MEDDATA tag else go to (4b)
        *       4b] Query all the activities which are using the MEDDATA tag. If there is not a single activity using the tag then delete the MEDDATA tag, skip the
        *           next step, and process the next MEDDATA tag else go to (4c)
        *       4c] Add "unit" attribute from the latest activity using the tag to the MEDDATA tag and save it in tags collection
        * */
        async function addMedDataAttributesInTagsCollection_3_11( user, callback ) {
            let
                err,
                result,
                activityModel,
                tagModel,
                medDataTagsArr;

            Y.log( `addMedDataAttributesInTagsCollection_3_11: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            // ------------------------- 1. Get 'tag' collection DB model ---------------------------------------
            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'tag', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `addMedDataAttributesInTagsCollection_3_11: Error getting tag collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `addMedDataAttributesInTagsCollection_3_11: Failed to fetch tag collection model`, "error", NAME );
                return callback( `addMedDataAttributesInTagsCollection_3_11: Failed to fetch tag collection model` );
            }

            tagModel = result;
            // ------------------------- 1. END ---------------------------------------------------------------------

            // ------------------------- 2. Get 'activity' collection DB model ---------------------------------------
            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `addMedDataAttributesInTagsCollection_3_11: Error getting activity collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `addMedDataAttributesInTagsCollection_3_11: Failed to fetch activity collection model`, "error", NAME );
                return callback( `addMedDataAttributesInTagsCollection_3_11: Failed to fetch activity collection model` );
            }

            activityModel = result;
            // ------------------------- 2. END ---------------------------------------------------------------------

            // --------------------- 3. Get all 'MEDDATA' tags from tags collection --------------------------------------
            [err, result] = await formatPromiseResult(
                tagModel.mongoose.collection.find( {type: Y.doccirrus.schemas.tag.tagTypes.MEDDATA} ).toArray()
            );

            if( err ) {
                Y.log( `addMedDataAttributesInTagsCollection_3_11: Error fetching MEDDATA tags from tags collection. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result || !Array.isArray( result ) || !result.length ) {
                Y.log( `addMedDataAttributesInTagsCollection_3_11: No MEDDATA tags found in tags collection. All good, nothing to do...`, "info", NAME );
                return callback();
            }

            medDataTagsArr = result;
            // ------------------------ 3. END ----------------------------------------------------------------------------

            // -------- 4. For each MEDDATA item in medDataTagsArr, get 'unit' value from the latest activity and add it to the MEDDATA tag in tags collection -----
            for( let medDataTag of medDataTagsArr ) {

                // ----------- 4a. If MEDDATA tag does not have any title (or empty title) then delete that MEDDATA tag entry from tags collection and continue -------
                if( !medDataTag.title ) {
                    // this case should never happen but still keeping it for extra safety
                    Y.log( `addMedDataAttributesInTagsCollection_3_11: No title found on MEDDATA tag for tag _id = ${medDataTag._id.toString()}. Expected title. Deleting this MEDDATA record from tags collection`, "warn", NAME );

                    [err, result] = await formatPromiseResult(
                        tagModel.mongoose.collection.deleteOne( {_id: medDataTag._id} )
                    );

                    if( err ) {
                        Y.log( `addMedDataAttributesInTagsCollection_3_11: Error while deleting empty MEDDATA tag with _id = ${medDataTag._id.toString()}. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }

                    if( !result || !result.result || result.result.n !== 1 ) {
                        Y.log( `addMedDataAttributesInTagsCollection_3_11: Failed to delete empty MEDDATA tag with _id = ${medDataTag._id.toString()}`, "error", NAME );
                        return callback( `addMedDataAttributesInTagsCollection_3_11: Failed to delete empty MEDDATA tag with _id = ${medDataTag._id.toString()}` );
                    }

                    Y.log( `addMedDataAttributesInTagsCollection_3_11: Deleted empty MEDDATA tag with _id = ${medDataTag._id.toString()}`, "info", NAME );
                    continue;
                }
                // --------------------------- 4a. END ------------------------------------------------------------------------------------------------------------

                // ----------------------- 4b. Fetch the latest MEDDATA activity with 'medData.type' = medDataTag.title ------------------------------------------
                [err, result] = await formatPromiseResult(
                    activityModel.mongoose.collection.find( {
                        actType: 'MEDDATA',
                        'medData.type': medDataTag.title
                    }, {
                        fields: {medData: 1},
                        sort: {_id: -1}
                    } ).toArray()
                );

                if( err ) {
                    Y.log( `addMedDataAttributesInTagsCollection_3_11: Error querying 'activities' collection for query: ${JSON.stringify( {
                        'medData.type': medDataTag.title,
                        actType: 'MEDDATA'
                    } )}. Error: ${err.stack || err}`, "error", NAME );
                    return callback( err );
                }

                if( !result || !Array.isArray( result ) || !result.length ) {
                    // ----------------- If there is NOT a single MEDDATA activity with 'medData.type' = medDataTag.title then delete the orphan MEDDATA tag and continue -----------
                    Y.log( `addMedDataAttributesInTagsCollection_3_11: No activity found for query: ${JSON.stringify( {
                        'medData.type': medDataTag.title,
                        actType: 'MEDDATA'
                    } )}. Expected atleast 1 activity entry. Tag title: ${medDataTag.title} is obsolete and will be deleted from tags collection`, "warn", NAME );

                    [err, result] = await formatPromiseResult(
                        tagModel.mongoose.collection.deleteOne( {_id: medDataTag._id} )
                    );

                    if( err ) {
                        Y.log( `addMedDataAttributesInTagsCollection_3_11: Error while deleting orphan MEDDATA tag with _id = ${medDataTag._id.toString()} and title = ${medDataTag.title} from tags collection. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }

                    if( !result || !result.result || result.result.n !== 1 ) {
                        Y.log( `addMedDataAttributesInTagsCollection_3_11: Failed to delete orphan MEDDATA tag with _id = ${medDataTag._id.toString()} and title = ${medDataTag.title} from tags collection`, "error", NAME );
                        return callback( `addMedDataAttributesInTagsCollection_3_11: Failed to delete orphan MEDDATA tag with _id = ${medDataTag._id.toString()} and title = ${medDataTag.title} from tags collection` );
                    }

                    Y.log( `addMedDataAttributesInTagsCollection_3_11: Deleted orphan MEDDATA tag with _id = ${medDataTag._id.toString()} and title = ${medDataTag.title} from tags collection`, "info", NAME );
                    continue;
                    // ------------------- END -------------------------------------------------------------------------------------------------------------------------------
                }
                // --------------------------- 4b. END ---------------------------------------------------------------------------------------

                // ---------- 4c. add "unit" attribute from the queried activity to MEDDATA tag in tags collection --------------------------------------------
                let
                    unit = "";

                for( let activity of result ) {
                    for( let medDataObj of activity.medData ) {
                        if( medDataObj.type === medDataTag.title && medDataObj.unit ) {
                            unit = medDataObj.unit;
                            break;
                        }
                    }

                    if( unit ) {
                        break;
                    }
                }

                [err, result] = await formatPromiseResult(
                    tagModel.mongoose.collection.updateOne( {_id: medDataTag._id}, {$set: {unit: unit}} )
                );

                if( err ) {
                    Y.log( `addMedDataAttributesInTagsCollection_3_11: Error adding unit = ${unit} to MEDDATA tag with tag ID: ${medDataTag._id.toString()} and title = ${medDataTag.title}. Error: ${err.stack || err}`, "error", NAME );
                    return callback( err );
                }

                if( !result || !result.result || result.result.n !== 1 ) {
                    Y.log( `addMedDataAttributesInTagsCollection_3_11: Failed to add unit = ${unit} to MEDDATA tag with tag ID: ${medDataTag._id.toString()} and title = ${medDataTag.title}`, "error", NAME );
                    return callback( `addMedDataAttributesInTagsCollection_3_11: Failed to add unit = ${unit} to MEDDATA tag with tag ID: ${medDataTag._id.toString()} and title = ${medDataTag.title}` );
                }
                // -------------- 4c. END ---------------------------------------------------------------------------------------------------------------------

                Y.log( `addMedDataAttributesInTagsCollection_3_11: Successfully updated MEDDATA tag title = ${medDataTag.title} with unit = ${unit}`, "info", NAME );
            }
            // ---------------------------------------- 4. END ------------------------------------------------------------------------------------

            Y.log( `addMedDataAttributesInTagsCollection_3_11: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        /*
        * For MOJ-8491, we need this migration to do below:
        * For those datasafe (PRC) if 'inPacs' and/or 'inScribe' license is disabled then kill 'Orthanc' and 'MMI' process on the PRC
        * as those processes are not needed anymore and consume un-necessary memory
        *
        * This migration does below:
        *
        * 1] Fetches license information from 'admins' collection
        * 2] Checks if 'inPacs' license is active. If it is then do nothing else kill 'Orthanc' process
        * 3] Checks if 'inScribe' license is active. If it is then do nothing else kill 'MMI' process
        * */
        async function killOrthancAndMMIProcessIfLicenseIsDisabled_3_11( user, callback ) {
            let
                err,
                result,
                adminModel,
                ObjectId = require( 'mongoose' ).Types.ObjectId;

            if( Y.doccirrus.auth.isDevServer() || !Y.doccirrus.auth.isPRC() ) {
                return callback();
            }

            Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            // --------------------------------- 1. Get 'admin' DB model ----------------------------------------------------------------
            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'admin', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: Error getting 'admin' collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: Failed to fetch 'admin' collection model`, "error", NAME );
                return callback( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: Failed to fetch 'admin' collection model` );
            }

            adminModel = result;
            // ------------------------------ 1. END -------------------------------------------------------------------------------------

            // ------------------------------ 2. Query license information from admins collection ----------------------------------------------------
            [err, result] = await formatPromiseResult(
                adminModel.mongoose.collection.findOne( {_id: ObjectId( Y.doccirrus.schemas.admin.getLicenseId() )} )
            );

            if( err ) {
                Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: Error while fetching license information from admins collection for _id: ${Y.doccirrus.schemas.admin.getLicenseId()}. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result || !result.licenseScope || !result.licenseScope["0"] ) {
                Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: Failed to fetch license information from admins collection for _id: ${Y.doccirrus.schemas.admin.getLicenseId()}`, "error", NAME );
                return callback( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: Failed to fetch license information from admins collection for _id: ${Y.doccirrus.schemas.admin.getLicenseId()}` );
            }

            if( !result.licenseScope["0"].additionalServices || !Array.isArray( result.licenseScope["0"].additionalServices ) ) {
                Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: No 'additionalServices' array found in license information. Expected array`, "error", NAME );
                return callback( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: No 'additionalServices' array found in license information. Expected array` );
            }
            // ----------------------------- 2. END ------------------------------------------------------------------------------------------------------

            // ----------------------------- 3. If 'inPacs' license is not active then disable Orthanc process -------------------------------------------
            if( result.licenseScope["0"].additionalServices.indexOf( "inPacs" ) === -1 ) {
                Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: 'inPacs' license is not active. Disabling any unnecessary 'Orthanc' process`, "info", NAME );

                [err] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.inpacsconfiguration.disableOrthancService( ( err ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve();
                            }
                        } );
                    } )
                );

                if( err ) {
                    Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: Error while disabling 'Orthanc' process. Error: ${JSON.stringify( err )}`, "error", NAME );
                } else {
                    Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: 'Orthanc' process disabled`, "info", NAME );
                }
            } else {
                Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: 'inPacs' license is active. Nothing to do here....`, "info", NAME );
            }
            // -------------------------- 3. END ------------------------------------------------------------------------------------------------------------

            // --------------------------- 4. If 'inScribe' license is not active then disable MMI process --------------------------------------------------
            if( result.licenseScope["0"].additionalServices.indexOf( "inScribe" ) === -1 ) {
                Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: 'inScribe' license is not active. Disabling any unnecessary 'MMI' process`, "info", NAME );

                [err] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.mmi.disableMMIService( ( err ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve();
                            }
                        } );
                    } )
                );

                if( err ) {
                    Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: Error while disabling 'MMI' process. Error: ${JSON.stringify( err )}`, "error", NAME );
                } else {
                    Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: 'MMI' process disabled`, "info", NAME );
                }
            } else {
                Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: 'inScribe' license is active. Nothing to do here...`, "info", NAME );
            }
            // -------------------------------- 4. END ------------------------------------------------------------------------------------------------------

            Y.log( `killOrthancAndMMIProcessIfLicenseIsDisabled_3_11: Migration successfully completed for tenantId = ${user.tenantId}`, "info", NAME );
            callback();
        }

        /**
         *  Add referencedBy and correct reciprocal links on activities, MOJ-8169
         *
         *  @param {Object}     user
         *  @param {Function}   callback
         */

        function setAllReciprocalLinks_3_11( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.setAllReciprocalLinks( user, true, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( `Problem while running migration to set recieprocal activity links: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }
                Y.log( `Completed migration to set reciprocal links on tenant: ${user.tenantId}`, 'debug', NAME );
                callback( null );
            }
        }

        async function migrateLabDeviceDefaultLocation_3_11( user, callback ) {
            Y.log( `migrateLabDeviceDefaultLocation_3_11 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            let mainLocationId = Y.doccirrus.schemas.location.getMainLocationId(),
                err,
                result;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'labdevice',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {locationId: {$exists: false}},
                    data: {
                        $set: {locationId: mainLocationId}
                    },
                    options: {
                        multi: true
                    }
                } )
            );
            if( err ) {
                Y.log( `migrateLabDeviceDefaultLocation_3_11 error set locationId to labdevice ${err.message}`, 'debug', NAME );
            }
            if( !result || !result.result ) {
                Y.log( 'migrateLabDeviceDefaultLocation_3_11: unknown command result for labdevice update', 'debug', NAME );
            }

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'labdevicetest',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {locationId: {$exists: false}},
                    data: {
                        $set: {locationId: mainLocationId}
                    },
                    options: {
                        multi: true
                    }
                } )
            );
            if( err ) {
                Y.log( `migrateLabDeviceDefaultLocation_3_11 error set locationId to labdevicetest ${err.message}`, 'debug', NAME );
            }

            if( !result || !result.result ) {
                Y.log( 'migrateLabDeviceDefaultLocation_3_11: unknown command result for labdevicetest update', 'debug', NAME );
            }

            Y.log( `migrateLabDeviceDefaultLocation_3_11: completed migration for tenant: ${user.tenantId}`, 'info', NAME );
            callback();
        }

        async function migrateMeasurementAddMDC_4_0( user, callback ) {
            let
                err,
                result,
                activityModel,
                measuremetsToProcess;

            Y.log( `migrateMeasurementAddMDC_4_0: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `migrateMeasurementAddMDC_4_0: Error getting activity model. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `migrateMeasurementAddMDC_4_0: Failed to fetch activity model`, "error", NAME );
                return callback( `migrateMeasurementAddMDC_4_0: Failed to fetch activity model` );
            }

            activityModel = result;

            [err, result] = await formatPromiseResult(
                activityModel.mongoose.collection.find(
                    {actType: 'MEASUREMENT', 'd_extra.IDC': {$exists: true}, 'd_extra.MDC': {$exists: false}},
                    {fields: {d_extra: 1}}
                ).addCursorFlag( 'noCursorTimeout', true ).toArray()
            );

            if( err ) {
                Y.log( `migrateMeasurementAddMDC_4_0: Error fetching unprocessed Measurements. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !result || !Array.isArray( result ) || !result.length ) {
                Y.log( `migrateMeasurementAddMDC_4_0: No more unprocessed MEASUREMENTs. All good, nothing to do...`, "info", NAME );
                return callback();
            }

            measuremetsToProcess = result;

            for( let measurement of measuremetsToProcess ) {
                let obj = {}, color, userContent;
                color = measurement.d_extra && measurement.d_extra.color;
                if( color ) {
                    delete measurement.d_extra.color;
                    obj.color = color;
                }
                obj.MDC = measurement.d_extra;
                userContent = Y.doccirrus.api.cardio.getPrettyJson( obj );
                [err, result] = await formatPromiseResult(
                    activityModel.mongoose.collection.updateOne( {_id: measurement._id}, {
                        $set: {
                            d_extra: obj,
                            userContent: userContent
                        }
                    } )
                );

                if( err ) {
                    Y.log( `migrateMeasurementAddMDC_4_0: Error updating ${measurement._id.toString()}. Error: ${err.message || err}`, "error", NAME );
                }

                if( !result || !result.result || result.result.n !== 1 ) {
                    Y.log( `migrateMeasurementAddMDC_4_0: Failed to rewrite d_extra and userContent in ${measurement._id.toString()}`, "error", NAME );
                }
            }

            Y.log( `migrateMeasurementAddMDC_4_0: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        async function migrateInPacsLanguage_4_0( user, callback ) {
            Y.log( `migrateInPacsLanguage_4_0 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            let mainTitle = 'InPacsAdminMojit.inpacsmodality_T.label.main_title',
                err,
                result;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'inpacsmodality',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {
                        $or: [{title: 'Basic settings'}, {title: 'Grundeinstellungen'}]
                    },
                    data: {
                        $set: {title: mainTitle}
                    },
                    options: {
                        multi: true
                    }
                } )
            );
            if( err ) {
                Y.log( `migrateInPacsLanguage_4_0: error set data to inpacsmodalities ${err.message}`, 'debug', NAME );
            }
            if( !result || !result.result ) {
                Y.log( 'migrateInPacsLanguage_4_0: unknown command result for inpacsmodalities update', 'debug', NAME );
            }

            Y.log( `migrateInPacsLanguage_4_0: completed migration for tenant: ${user.tenantId}`, 'info', NAME );
            callback();
        }

        async function migrateSetPartnersBidirectional_4_0( user, callback ) {
            let
                err;

            Y.log( `migrateSetPartnersBidirectional_4_0: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'partner',
                    action: 'update',
                    migrate: true,
                    query: {
                        bidirectional: {$exists: false},
                        $or: [
                            {configuration: {exists: false}},
                            {configuration: {$size: 0}}
                        ]
                    },
                    data: {
                        $set: {bidirectional: false}
                    },
                    options: {
                        multi: true
                    }
                } )
            );

            if( err ) {
                Y.log( `migrateSetPartnersBidirectional_4_0: Error setting bidirectional FALSE: ${err.message || err}`, "error", NAME );
            }

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'partner',
                    action: 'update',
                    migrate: true,
                    query: {
                        bidirectional: {$exists: false},
                        configuration: {$exists: true, $not: {$size: 0}}
                    },
                    data: {
                        $set: {bidirectional: true}
                    },
                    options: {
                        multi: true
                    }
                } )
            );

            if( err ) {
                Y.log( `migrateSetPartnersBidirectional_4_0: Error setting bidirectional TRUE: ${err.message || err}`, "error", NAME );
            }

            Y.log( `migrateSetPartnersBidirectional_4_0: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        async function migratePatientDob_4_0( user, callback ) {
            let
                err,
                result,
                patientModel,
                cursor;

            Y.log( `migratePatientDob_4_0: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'patient', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `migratePatientDob_4_0: Error getting patient collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `migratePatientDob_4_0: Failed to fetch patient collection model`, "error", NAME );
                return callback( `migratePatientDob_4_0: Failed to fetch patient collection model` );
            }

            patientModel = result;

            cursor = patientModel.mongoose.find( {}, {kbvDob: 1, dob: 1} ).cursor();

            [err, result] = await formatPromiseResult(
                cursor.eachAsync( ( patient ) => {
                    new Promise( ( resolve ) => { //eslint-disable-line no-new
                        let dob,
                            dateFromDob;
                        if( patient.kbvDob ) {
                            dob = moment( patient.kbvDob + ' 10', "DD.MM.YYYY HH" ).toISOString();
                        } else if( patient.dob ) {
                            dateFromDob = moment( patient.dob ).format( 'YYYY-MM-DD' ).toString();
                            dob = moment( dateFromDob + ' 10', "YYYY-MM-DD HH" ).toISOString();
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'patient',
                            migrate: true,
                            action: 'update',
                            query: {_id: patient._id},
                            data: {$set: {dob: dob}}
                        }, ( err ) => {
                            if( err ) {
                                Y.log( `migratePatientDob_4_0 could not update patient: ${patient._id && patient._id.toString()}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                resolve();
                            } else {
                                resolve();
                            }
                        } );
                    } );
                } )
            );

            Y.log( `migratePatientDob_4_0: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        function migrateSetSimplifiedLabdata_4_0( user, callback ) {
            Y.log( `migrateSetSimplifiedLabdata_4_0, Migrating LABDATA activities to set simplified labEntries property, tenant: ${user.tenantId}`, 'info', NAME );
            Y.doccirrus.inCaseUtils.migrationhelper.updateLabEntries( user, true, true, onAllUpdated );

            function onAllUpdated( err ) {
                if( err ) {
                    Y.log( `Problem in migrateSetSimplifiedLabdata_4_0 on tenant ${user.tenantId}: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }
                Y.log( `migrateSetSimplifiedLabdata_4_0, Completed regeneration of labEntries for LABDATA activities on tenant ${user.tenantId}.`, 'info', NAME );
                callback( null );
            }
        }

        function migrateInCaseConfiguration_4_0( user, callback ) {
            Y.log( `migrateInCaseConfiguration_4_0, Migrating incaseconfiguration: adding new configuration allowCustomCodeFor with default values, tenant: ${user.tenantId}`, 'debug', NAME );
            const ObjectId = require( 'mongoose' ).Types.ObjectId;
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'incaseconfiguration',
                action: 'mongoUpdate',
                query: {
                    _id: ObjectId( '000000000000000000000001' ),
                    allowCustomCodeFor: {$exists: false}
                },
                migrate: true,
                data: {
                    $set: {allowCustomCodeFor: ['TREATMENT', 'DIAGNOSIS', 'MEDICATION']}
                }
            }, function( err, result ) {
                if( err ) {
                    Y.log( `migrateInCaseConfiguration_4_0: could not add allowCustomCodeFor: ${err} on tenant ${user.tenantId}`, 'error', NAME );
                    callback( err );
                    return;
                }
                Y.log( `migrateInCaseConfiguration_4_0: finished on tenant ${user.tenantId} modified ${result && result.result && result.result.nModified} configs`, 'debug', NAME );
                callback();
            } );
        }

        async function migrateDeleteOldSocketIOEvents_4_0( user, callback ) {
            let
                err,
                result,
                socketioeventModel;

            Y.log( `migrateDeleteOldSocketIOEvents_4_0: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'socketioevent', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `migrateDeleteOldSocketIOEvents_4_0: Error getting socketioevent collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `migrateDeleteOldSocketIOEvents_4_0: Failed to fetch socketioevent collection model`, "error", NAME );
                return callback( `migrateDeleteOldSocketIOEvents_4_0: Failed to fetch socketioevent collection model` );
            }

            socketioeventModel = result;

            [err, result] = await formatPromiseResult(
                socketioeventModel.mongoose.collection.remove( {
                    eventType: Y.doccirrus.schemas.socketioevent.eventTypes.CONFIRM,
                    timestamp: {$lt: new Date( moment().startOf( 'd' ).toISOString() )}
                } )
            );

            Y.log( `migrateDeleteOldSocketIOEvents_4_0: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        async function migrateSetBMIUnit_4_1( user, callback ) {
            let
                err,
                result,
                activityModel,
                medDataToProcess;

            Y.log( `migrateSetBMIUnit_4_1: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `migrateSetBMIUnit_4_1: Error getting activity model. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `migrateSetBMIUnit_4_1: Failed to fetch activity model`, "error", NAME );
                return callback( `migrateSetBMIUnit_4_1: Failed to fetch activity model` );
            }

            activityModel = result;

            [err, result] = await formatPromiseResult(
                activityModel.mongoose.collection.find(
                    {actType: 'MEDDATA', 'medData.type': 'BMI'}
                ).addCursorFlag( 'noCursorTimeout', true ).toArray()
            );

            if( err ) {
                Y.log( `migrateSetBMIUnit_4_1: Error fetching unprocessed MEDDATA. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !result || !Array.isArray( result ) || !result.length ) {
                Y.log( `migrateSetBMIUnit_4_1: No more unprocessed MEDDATAs. All good, nothing to do...`, "info", NAME );
                return callback();
            }

            medDataToProcess = result;

            for( let medDataEntry of medDataToProcess ) {
                medDataEntry.medData.forEach( function( item ) {
                    if( 'BMI' === item.type ) {
                        item.unit = 'kg/m2';
                    }
                } );

                [err, result] = await formatPromiseResult(
                    activityModel.mongoose.collection.updateOne( {
                        _id: medDataEntry._id,
                        'medData.type': 'BMI'
                    }, {
                        $set: {
                            'medData.$[elem].unit': 'kg/m2',
                            content: Y.doccirrus.schemas.activity.generateContent( medDataEntry )
                        }
                    }, {
                        "arrayFilters": [{'elem.type': 'BMI'}],
                        "multi": true
                    } )
                );

                if( err ) {
                    Y.log( `migrateSetBMIUnit_4_1: Error updating ${medDataEntry._id.toString()}. Error: ${err.message || err}`, "error", NAME );
                }

                if( !result || !result.result || result.result.n !== 1 ) {
                    Y.log( `migrateSetBMIUnit_4_1: Failed to add unit for BMI in ${medDataEntry._id.toString()}`, "error", NAME );
                }
            }

            Y.log( `migrateSetBMIUnit_4_1: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        async function migrateSetTaskTypeFieldForTask_4_1( user, callback ) {
            let
                err,
                result,
                taskModel,
                tasksToProcess;

            Y.log( `migrateSetTaskTypeFieldForTask_4_1: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'task', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `migrateSetTaskTypeFieldForTask_4_1: Error getting task model. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `migrateSetTaskTypeFieldForTask_4_1: Failed to fetch task model`, "error", NAME );
                return callback( `migrateSetTaskTypeFieldForTask_4_1: Failed to fetch task model` );
            }

            taskModel = result;

            [err, result] = await formatPromiseResult(
                taskModel.mongoose.collection.find(
                    {taskType: {$exists: false}}
                ).addCursorFlag( 'noCursorTimeout', true ).toArray()
            );

            if( err ) {
                Y.log( `migrateSetTaskTypeFieldForTask_4_1: Error fetching unprocessed tasks. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !result || !Array.isArray( result ) || !result.length ) {
                Y.log( `migrateSetTaskTypeFieldForTask_4_1: No more unprocessed tasks. All good, nothing to do...`, "info", NAME );
                return callback();
            }

            tasksToProcess = result;

            for( let task of tasksToProcess ) {
                let tasktype = Y.doccirrus.schemas.tasktype.getTaskTypeFromType( task.type );

                [err, result] = await formatPromiseResult(
                    taskModel.mongoose.collection.updateOne( {
                        _id: task._id
                    }, {$set: {'taskType': tasktype}} )
                );

                if( err ) {
                    Y.log( `migrateSetTaskTypeFieldForTask_4_1: Error updating ${task._id.toString()}. Error: ${err.message || err}`, "error", NAME );
                }

                if( !result || !result.result || result.result.n !== 1 ) {
                    Y.log( `migrateSetTaskTypeFieldForTask_4_1: Failed to set taskType for task ${task._id.toString()}`, "error", NAME );
                }
            }

            Y.log( `migrateSetTaskTypeFieldForTask_4_1: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        function migrateSetKbvFocusFunctionalityKRWToFalse_4_1( user, callback ) {

            function updatedCb( err, result ) {
                if( err ) {
                    Y.log( 'migrateSetKbvFocusFunctionalityKRWToFalse_4_1: could not update invoice configuration: ' + err + ' for tenant ' + user.tenantId, 'error', NAME );
                    return callback( err );
                }
                Y.log( 'migrateSetKbvFocusFunctionalityKRWToFalse_4_1: successfully updated invoice configuration for tenant ' + user.tenantId + ' result: ' + JSON.stringify( result ), 'debug', NAME );
                callback();
            }

            function modelCb( err, model ) {
                if( err ) {
                    return callback( err );
                }

                model.mongoose.update( {_id: '000000000000000000000001'}, {
                    $set: {kbvFocusFunctionalityKRW: false}
                }, updatedCb );
            }

            Y.doccirrus.mongodb.getModel( user, 'invoiceconfiguration', true, modelCb );
        }

        async function migrateCreateCardioConfiguration_4_1( user, callback ) {
            const
                _ = require( 'lodash' );

            let
                err,
                result,
                practiceModel,
                practice,
                cardioConfigModel,
                configsToAdd = [],
                configTypes = [],
                configTemplate = Y.doccirrus.schemas.cardioconfiguration.getDefaultData();

            Y.log( `migrateCreateCardioConfiguration_4_1: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'practice', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `migrateCreateCardioConfiguration_4_1: Error getting practice model. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `migrateCreateCardioConfiguration_4_1: Failed to fetch practice model`, "error", NAME );
                return callback( `migrateCreateCardioConfiguration_4_1: Failed to fetch practice model` );
            }

            practiceModel = result;

            // get practice to check specialModules license
            [err, result] = await formatPromiseResult(
                practiceModel.mongoose.collection.findOne( {} )
            );

            if( err ) {
                Y.log( `migrateCreateCardioConfiguration_4_1: Error fetching practice entry. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `migrateCreateCardioConfiguration_4_1: No practice. Cannot analyse license info`, "error", NAME );
                return callback();
            }

            practice = result;

            if( practice.licenseScope && practice.licenseScope[0] && practice.licenseScope[0].specialModules && practice.licenseScope[0].specialModules[0] ) {
                if( practice.licenseScope[0].specialModules.includes( Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ) ) {
                    configTypes.push( Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO );
                }
                if( practice.licenseScope[0].specialModules.includes( Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ) ) {
                    configTypes.push( Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE );
                }
                if( practice.licenseScope[0].specialModules.includes( Y.doccirrus.schemas.settings.specialModuleKinds.DQS ) ) {
                    configTypes.push( Y.doccirrus.schemas.settings.specialModuleKinds.DQS );
                }
            }

            if( !configTypes.length ) {
                Y.log( `migrateCreateCardioConfiguration_4_1: No required licenses is ON for tenant: ${user.tenantId}. Skip migration.`, "info", NAME );
                return callback();
            }

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'cardioconfiguration', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `migrateCreateCardioConfiguration_4_1: Error getting cardioconfiguration model. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `migrateCreateCardioConfiguration_4_1: Failed to fetch cardioconfiguration model`, "error", NAME );
                return callback( `migrateCreateCardioConfiguration_4_1: Failed to fetch cardioconfiguration model` );
            }

            cardioConfigModel = result;

            //  get cardioconfiguration for using it as template
            //  here we assume that there is only one cardioconfiguration in non-migrated collection
            [err, result] = await formatPromiseResult(
                cardioConfigModel.mongoose.collection.findOne( {} )
            );

            if( err ) {
                Y.log( `migrateCreateCardioConfiguration_4_1: Error getting cardioconfiguration. Error: ${err.message || err}`, "error", NAME );
                return callback( err );
            }

            if( result && result.serviceType ) {
                Y.log( `migrateCreateCardioConfiguration_4_1: Cardioconfiguration already has serviceType. Skip migration.`, "info", NAME );
                return callback();
            }

            if( !result ) {
                Y.log( `migrateCreateCardioConfiguration_4_1: No cardioconfiguration in db. Default template will be used.`, "info", NAME );
                delete configTemplate.serviceType;
            } else {
                configTemplate = JSON.parse( JSON.stringify( result ) );

                [err, result] = await formatPromiseResult(
                    cardioConfigModel.mongoose.collection.updateOne( {
                        _id: result._id
                    }, {$set: {'serviceType': Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO}} )
                );
                if( err ) {
                    Y.log( `migrateCreateCardioConfiguration_4_1: Cannot set serviceType for ${result._id} config. Error: ${err.message || err}`, "error", NAME );
                }

                _.remove( configTypes, ( item ) => {
                    //remove 'cardio' from types to insert
                    return Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO === item;
                } );
            }

            delete configTemplate._id;

            configTypes.forEach( ( type ) => {
                configsToAdd.push( _.assign( {serviceType: type}, configTemplate ) );
            } );

            [err, result] = await formatPromiseResult(
                cardioConfigModel.mongoose.collection.insert( configsToAdd )
            );

            if( err ) {
                Y.log( `migrateCreateCardioConfiguration_4_1: Error inserting  cardioconfigurations. Error: ${err.message || err}`, "error", NAME );
            }

            Y.log( `migrateCreateCardioConfiguration_4_1: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        async function migrateAddNewFieldsToInvoices_4_2( user, callback ) {
            const
                ObjectId = require( 'mongoose' ).Types.ObjectId;
            let
                err,
                result,
                activityModel,
                invoicesToProcess = [];

            Y.log( `migrateAddNewFieldsToInvoices_4_2: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'activity', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `migrateAddNewFieldsToInvoices_4_2: Error getting activity model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `migrateAddNewFieldsToInvoices_4_2: Failed to fetch activity model`, "error", NAME );
                return callback( `migrateAddNewFieldsToInvoices_4_2: Failed to fetch activity model` );
            }

            activityModel = result;

            [err, result] = await formatPromiseResult(
                activityModel.mongoose.collection.find(
                    {
                        actType: 'INVOICE',
                        importId: {$exists: false},
                        timestamp: {$gt: new Date( moment( '2017-07-01', 'YYYY-MM-DD' ).toISOString() )},
                        receipts: {$ne: [], $exists: true}
                    }
                ).addCursorFlag( 'noCursorTimeout', true ).toArray()
            );

            if( err ) {
                Y.log( `migrateAddNewFieldsToInvoices_4_2: Error fetching invoices. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result || !result.length ) {
                Y.log( `migrateAddNewFieldsToInvoices_4_2: No invoices. Skip migration`, "warn", NAME );
                return callback();
            }

            invoicesToProcess = result;

            for( let invoice of invoicesToProcess ) {
                let receiptsToProcess = [];

                invoice.linkedEmployees = [];
                invoice.linkedTimestamps = [];
                invoice.linkedContents = [];

                [err, result] = await formatPromiseResult(
                    activityModel.mongoose.collection.find(
                        {
                            _id: {
                                $in: invoice.receipts.map( ( item ) => {
                                    return ObjectId( item );
                                } )
                            }
                        }
                    ).addCursorFlag( 'noCursorTimeout', true ).toArray()
                );

                if( err ) {
                    Y.log( `migrateAddNewFieldsToInvoices_4_2: Error fetching receipts. Error: ${err.stack || err}`, "error", NAME );
                    return callback( err );
                }

                if( !result || !result.length ) {
                    Y.log( `migrateAddNewFieldsToInvoices_4_2: No receipts. Skip processing of ${invoice._id.toString()} invoice.`, "warn", NAME );
                    return callback();
                }
                receiptsToProcess = result;

                receiptsToProcess.forEach( ( receipt ) => {
                    invoice.linkedEmployees.push( {
                        name: receipt.employeeName,
                        initials: receipt.employeeInitials,
                        receiptId: receipt._id.toString()
                    } );
                    invoice.linkedContents.push( {
                        content: receipt.content,
                        receiptId: receipt._id.toString()
                    } );
                    invoice.linkedTimestamps.push( {
                        timestamp: receipt.timestamp,
                        receiptId: receipt._id.toString()
                    } );

                } );

                [err, result] = await formatPromiseResult(
                    activityModel.mongoose.collection.updateOne( {
                        _id: invoice._id
                    }, {
                        $set: {
                            'linkedTimestamps': invoice.linkedTimestamps,
                            'linkedContents': invoice.linkedContents,
                            'linkedEmployees': invoice.linkedEmployees
                        }
                    } )
                );

                if( err ) {
                    Y.log( `migrateAddNewFieldsToInvoices_4_2: Error updating ${invoice._id.toString()} invoice. Error: ${err.stack || err}`, "error", NAME );
                    return callback( err );
                }

                if( !result || !result.result || result.result.n !== 1 ) {
                    Y.log( `migrateAddNewFieldsToInvoices_4_2: Failed to update invoice ${invoice._id.toString()}`, "error", NAME );
                }
            }

            Y.log( `migrateAddNewFieldsToInvoices_4_2: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        async function migrateBudegts_4_2( user, callback ) {
            let
                err,
                locations;

            Y.log( `migrateBudegts_4_2: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            // collect not yet processed budgets
            [err, locations] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    migrate: true,
                    model: 'location',
                    action: 'get',
                    query: {
                        $and: [
                            {
                                $or: [
                                    {budgets: {$exists: false}},
                                    {budgets: {$size: 0}}
                                ]
                            }
                        ]
                    },
                    options: {
                        fields: {
                            'medStartBudget': 1,
                            'medStartDate': 1,
                            'medPatientAgeRange1': 1,
                            'medPatientAgeRange2': 1,
                            'medPatientAgeRange3': 1,
                            'medPatientAgeRange4': 1,
                            'utStartBudget': 1,
                            'utStartDate': 1,
                            'utPatientAgeRange1': 1,
                            'utPatientAgeRange2': 1,
                            'utPatientAgeRange3': 1,
                            'utPatientAgeRange4': 1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `migrateBudegts_4_2: Error getting unprocessed yet locations model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            for( let location of locations ) {
                let budgets = [];
                if( location.medStartDate || location.medStartBudget || location.medPatientAgeRange1 ||
                    location.medPatientAgeRange2 || location.medPatientAgeRange3 || location.medPatientAgeRange4 ) {
                    budgets = [
                        ...budgets, {
                            type: 'MEDICATION',
                            specialities: [],
                            startBudget: location.medStartBudget,
                            startDate: location.medStartDate,
                            ...(location.medPatientAgeRange1 && {patientAgeRange1: location.medPatientAgeRange1}),
                            ...(location.medPatientAgeRange2 && {patientAgeRange2: location.medPatientAgeRange2}),
                            ...(location.medPatientAgeRange3 && {patientAgeRange3: location.medPatientAgeRange3}),
                            ...(location.medPatientAgeRange4 && {patientAgeRange4: location.medPatientAgeRange4})
                        }];
                }
                if( location.utStartBudget || location.utStartDate || location.utPatientAgeRange1 ||
                    location.utPatientAgeRange2 || location.utPatientAgeRange3 || location.utPatientAgeRange4 ) {
                    budgets = [
                        ...budgets, {
                            type: 'KBVUTILITY',
                            specialities: [],
                            startBudget: location.utStartBudget,
                            startDate: location.utStartDate,
                            ...(location.medPatientAgeRange1 && {patientAgeRange1: location.utPatientAgeRange1}),
                            ...(location.medPatientAgeRange2 && {patientAgeRange2: location.utPatientAgeRange2}),
                            ...(location.medPatientAgeRange3 && {patientAgeRange3: location.utPatientAgeRange3}),
                            ...(location.medPatientAgeRange4 && {patientAgeRange4: location.utPatientAgeRange4})
                        }];
                }
                if( budgets.length ) {
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            migrate: true,
                            model: 'location',
                            action: 'update',
                            query: {
                                _id: location._id
                            },
                            data: {
                                $set: {budgets},
                                $unset: {
                                    medStartBudget: 1,
                                    medStartDate: 1,
                                    medPatientAgeRange1: 1,
                                    medPatientAgeRange2: 1,
                                    medPatientAgeRange3: 1,
                                    medPatientAgeRange4: 1,
                                    utStartBudget: 1,
                                    utStartDate: 1,
                                    utPatientAgeRange1: 1,
                                    utPatientAgeRange2: 1,
                                    utPatientAgeRange3: 1,
                                    utPatientAgeRange4: 1
                                }
                            },
                            options: {
                                strict: false
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `migrateBudegts_4_2: Error updatin location with new budgets. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }
                }
            }

            Y.log( `migrateBudegts_4_2: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        function migratePatientDobHours_4_2( user, callback ) {
            Y.log( `migratePatientDobHours_4_2: migrating patient dob. Add 10 hours to dob if currently has 0 hours for tenant ${user.tenantId}`, 'debug' );

            Y.doccirrus.mongodb.getModel( user, 'patient', true, ( err, patientModel ) => {
                if( err ) {
                    Y.log( `migratePatientDobHours_4_2: error while getting patient model on tenant ${user.tenantId}`, 'debug' );
                    callback( err );
                    return;
                }

                const cursor = patientModel.mongoose.find( {
                    dob: {$exists: true}
                } ).cursor().addCursorFlag( 'noCursorTimeout', true );

                cursor.eachAsync( patient => {
                    const dob = patient.dob && moment( patient.dob );
                    if( dob && 0 === dob.hours() ) {
                        dob.add( 10, 'hours' );
                        Y.log( `migratePatientDobHours_4_2: migrating patient dob of patient ${patient._id} on tenant ${user.tenantId}`, 'debug' );
                        return Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'patient',
                            migrate: true,
                            action: 'update',
                            query: {_id: patient._id},
                            data: {$set: {dob: dob.toDate()}}
                        } );
                    }
                } ).then( () => {
                    Y.log( `migratePatientDobHours_4_2: successfully migrated patient dob on tenant ${user.tenantId}`, 'debug' );
                    callback();
                } ).catch( err => {
                    Y.log( `migratePatientDobHours_4_2: error migrating patient dob on tenant ${user.tenantId}`, 'error' );
                    callback( err );
                } );
            } );
        }

        async function migrateCheckCopiedImports_4_2( user, callback ) {
            Y.log( `migrateCheckCopiedImports_4_2: Starting migration for tenant: ${user.tenantId}`, "info", NAME );
            let
                err,
                casefolders;

            [err, casefolders] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    migrate: true,
                    model: 'casefolder',
                    action: 'get',
                    query: {
                        imported: true
                    },
                    options: {
                        fields: {
                            _id: 1
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `migrateCheckCopiedImports_4_2: Error getting imported casefolders. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            casefolders = (casefolders || []).map( cs => cs._id );

            let pipeline = [
                {
                    $match: {
                        $and: [
                            {
                                $or: [
                                    {i_extra: {$exists: true}},
                                    {patImportId: {$exists: true}},
                                    {empImportId: {$exists: true}},
                                    {locImportId: {$exists: true}}
                                ]
                            }
                        ]
                    }
                },
                {$group: {"_id": "$actType", "count": {$sum: 1}}}
            ];
            if( casefolders.length ) {
                pipeline[0].$match.$and.push( {caseFolderId: {$nin: casefolders}} );
            }

            let aggregation;
            [err, aggregation] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    migrate: true,
                    model: 'activity',
                    action: 'aggregate',
                    pipeline
                } )
            );

            if( err ) {
                Y.log( `migrateCheckCopiedImports_4_2: Error aggregating imported activities. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            let results = aggregation && aggregation.result;

            if( results.length ) {
                Y.log( `migrateCheckCopiedImports_4_2: Found statistic: ${JSON.stringify( results )}`, "info", NAME );
                const email = Y.doccirrus.email.createHtmlEmailMessage( {
                    subject: 'Statistic of copied imported activities',
                    serviceName: 'migration',
                    to: 'rw@doc-cirrus.com',
                    text: results.map( el => `${el._id}:    ${el.count}` ).join( '<br/>' ) + `<br/><br/>JSON: ${JSON.stringify( results )}`,
                    attachments: []
                } );

                Y.doccirrus.email.sendEmail( {...email, user}, err => {
                    if( err ) {
                        Y.log( `migrateCheckCopiedImports_4_2: Error sending result. Error: ${err.stack || err}`, "error", NAME );
                        return callback( err );
                    }
                    Y.log( `migrateCheckCopiedImports_4_2: Successfully completed migration for tenant: ${user.tenantId} - sent statistic`, "info", NAME );
                    callback();
                } );
            } else {
                Y.log( `migrateCheckCopiedImports_4_2: Successfully completed migration for tenant: ${user.tenantId} - not found copied imported activities`, "info", NAME );
                callback();
            }
        }

        async function migrateActivitySequencesDiagnose_4_2( user, callback ) {
            Y.log( `migrateActivitySequencesDiagnose_4_2: migrating activity sequences with activities diagnose for tenant ${user.tenantId}`, 'debug' );
            let
                err,
                sequences;

            [err, sequences] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activitysequence',
                    migrate: true,
                    action: 'get',
                    query: {
                        activities:
                            {
                                "$elemMatch":
                                    {
                                        actType: {$in: ['DIAGNOSIS']},
                                        diagnosisCert: {$in: ['']}
                                    }
                            }
                    }
                } )
            );

            if( err ) {
                Y.log( `migrateActivitySequencesDiagnose_4_2: Error getting sequences. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !sequences || !sequences.length ) {
                Y.log( `migrateActivitySequencesDiagnose_4_2: No sequences. Skip migration`, "warn", NAME );
                return callback();
            }

            for( let sequence of sequences ) {
                sequence.activities.forEach( function( activity ) {
                    if( "DIAGNOSIS" === activity.actType ) {
                        activity.diagnosisCert = "NONE";
                    }
                } );
                let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activitysequence',
                    action: 'update',
                    query: {_id: sequence._id},
                    data: {
                        $set: {"activities": sequence.activities}
                    }
                } ) );

                if( err ) {
                    Y.log( `migrateActivitySequencesDiagnose_4_2: Error in updating activitysequence activities. ${err.message}`, 'error', NAME );
                }
            }
            callback();
        }

        /**
         * Function to add the default insurance group to existing records and maintain the existing prices.
         * @param user
         * @param callback
         * @returns {Promise<*>}
         */
        async function migrateKbvUtilityPrices_4_2( user, callback ) {
            const
                /*ObjectId = require('mongoose').Types.ObjectId,*/
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `migrateKbvUtilityPrices_4_2: migrating old kbv kbvutilityprices tenant ${user.tenantId}`, 'debug' );

            let err, result, kbvUtilityModel, kbvUtilityPriceArray, kbvUtilityPrice;

            // 1. set up the groups by instantiating the model

            [err, kbvUtilityModel] = await formatPromiseResult( getModelProm( user, 'insurancegroup', true ) );

            if( err ) {
                Y.log( `migrateKbvUtilityPrices_4_2: Error while getting 'insurancegroup' collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            // 2. get kbvutilityprices model and update all records

            [err, kbvUtilityModel] = await formatPromiseResult( getModelProm( user, 'kbvutilityprice', true ) );

            if( err ) {
                Y.log( `migrateKbvUtilityPrices_4_2: Error while getting 'kbvUtilityPrice' collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            [err, kbvUtilityPriceArray] = await formatPromiseResult( kbvUtilityModel.mongoose.collection.find( {prices: {$exists: false}} ).toArray() );

            if( err ) {
                Y.log( `migrateKbvUtilityPrices_4_2: Error finding kbvUtilityPrices. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !kbvUtilityPriceArray ) {
                Y.log( `migrateKbvUtilityPrices_4_2: No kbvUtilityPrices found. Nothing to do, all good...`, "info", NAME );
                return callback();
            }

            for( kbvUtilityPrice of kbvUtilityPriceArray ) {

                [err, result] = await formatPromiseResult( kbvUtilityModel.mongoose.updateOne( {_id: kbvUtilityPrice._id}, {
                    $set: {
                        insuranceType: 'PUBLIC',
                        prices: [
                            {
                                "insuranceGroupId": "000000000000000000000222", // set the default group to all existing prices
                                "name": "Standard",
                                "price": kbvUtilityPrice.price // recycle the price
                            }]
                    }
                } ) );
                if( err ) {
                    Y.log( `migrateKbvUtilityPrices_4_2: Error updating kbvUtilityPrices. Error: ${err.stack || err}`, "error", NAME );
                    return callback( err );
                }

                if( !(result && result.result && result.result.n === 1) ) {
                    Y.log( `migrateKbvUtilityPrices_4_2: kbvUtilityPrices not modified...${result} ${kbvUtilityPrice}`, "info", NAME );
                }
            }

            Y.log( `migrateKbvUtilityPrices_4_2: Successfully ended migration for tenant: ${user.tenantId}.`, "info", NAME );
            return callback();

        }

        async function migrateInCaseConfigurationValues_4_2( user, callback ) {
            Y.log( `migrateInCaseConfigurationValues_4_2 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            let err,
                result;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'incaseconfiguration',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {},
                    data: {
                        $set: {
                            patientDataPhoneNumberMandatory: false,
                            patientDataEmailMandatory: false,
                            patientDataAddressMandatory: true
                        }
                    },
                    options: {
                        multi: true
                    }
                } )
            );
            if( err ) {
                Y.log( `migrateInCaseConfigurationValues_4_2: error set data phone mandatory to incaseconfiguration ${err.message}`, 'debug', NAME );
            }
            if( !result || !result.result ) {
                Y.log( 'migrateInCaseConfigurationValues_4_2: unknown command result for incaseconfiguration update', 'debug', NAME );
            }

            Y.log( `migrateInCaseConfigurationValues_4_2: completed migration for tenant: ${user.tenantId}`, 'info', NAME );
            callback();
        }

        /**
         * @ticket MOJ-6954 (Migration to delete invalid media book entries under UI Dienste -> Bücher -> Mediabuch)
         *
         * This method, for each deviceLog document in devicelogs collection, does below:
         * 1] Checks if deviceLog document itself is valid
         * 2] Checks if document _id = deviceLog.attachments[0] exists in the DB
         * 3] Checks if media _id = deviceLog.attachedMedia[0].mediaId exists in the DB
         * 4] If deviceLog.activityId key exists then checks if activityId exists in the DB
         *    and activity.attachments as well as activity.attachedMedia contains deviceLog.attachment[0] and deviceLog.attachedMedia[0]
         *
         * If any of the above mentioned step is returns false then DELETES deviceLog from the DB else moves to next deviceLog.
         *
         * @param {Object} user
         * @param {Function} callback
         * @returns {Promise<Void>}
         */
        async function deleteDanglingDeviceLogs_4_2( user, callback ) {
            const
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            let
                err,
                result,
                streamError,
                totalDeviceLogsDeleted = 0,
                deviceLogModel,
                activityModel,
                documentModel,
                mediaModel,
                deviceLogStream,
                callbackCalled = false;

            Y.log( `deleteDanglingDeviceLogs_4_2: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            /**
             * 1] Validate if deviceLog is correct
             * 2] If deviceLog.activityId key is present then check if activity exists and has attachment and attachedMedia of deviceLog
             * 3] Check if of document _id = deviceLog.attachments[0] exists in DB
             * 4] Check if media _id = deviceLog.attachedMedia[0].mediaId exists in DB
             *
             * If all of the above conditions are satisfied then returns 'false' else returns true
             * @param {Object} deviceLog
             * @returns {Promise<boolean>}
             */
            async function shouldDeleteDeviceLog( deviceLog ) {
                let
                    error,
                    activityObj,
                    documentObj,
                    mediaObj;

                // ----------------------------- 1. Validate if deviceLog is correct. ------------------------------------------------------------------
                if( !deviceLog.attachments || !deviceLog.attachments.length || !deviceLog.attachedMedia || !deviceLog.attachedMedia.length ) {
                    return true;
                }

                if( deviceLog.attachments.length > 1 || deviceLog.attachedMedia.length > 1 ) {
                    // Will never be posible but still keeping
                    return true;
                }

                if( !deviceLog.attachments[0] || !deviceLog.attachedMedia[0] || !deviceLog.attachedMedia[0].mediaId ) {
                    return true;
                }
                // -------------------------------------------------- 1. END ----------------------------------------------------------------------------

                // -------- 2. If deviceLog.activityId key is present then check if activity exists and has attachment and attachedMedia of deviceLog ----------
                if( deviceLog.activityId ) {
                    [error, activityObj] = await formatPromiseResult( activityModel.mongoose.collection.findOne( {_id: ObjectId( deviceLog.activityId )} ) );

                    if( error ) {
                        Y.log( `shouldDeleteDeviceLog: Error while querying activityId: ${deviceLog.activityId} referred by deviceLogId: ${deviceLog._id.toString()}. Error: ${error.stack || error}`, "error", NAME );
                        throw error;
                    }

                    if( !activityObj ) {
                        return true;
                    }

                    if( !activityObj.attachments || !activityObj.attachments.length || !activityObj.attachedMedia || !activityObj.attachedMedia.length ) {
                        return true;
                    }

                    if( activityObj.attachments.indexOf( deviceLog.attachments[0] ) === -1 ) {
                        return true;
                    }

                    if(
                        !activityObj.attachedMedia.find( ( mediaObj ) => {
                            return mediaObj.mediaId === deviceLog.attachedMedia[0].mediaId;
                        } )
                    ) {
                        return true;
                    }
                }
                // -------------------------------------------------- 2. END ------------------------------------------------------------------------------------

                // -------------------------------- 3. Check if of document _id = deviceLog.attachments[0] exists in DB -------------------------------------------
                [error, documentObj] = await formatPromiseResult( documentModel.mongoose.collection.findOne( {_id: ObjectId( deviceLog.attachments[0] )} ) );

                if( error ) {
                    Y.log( `shouldDeleteDeviceLog: Error while querying documentId: ${deviceLog.attachments[0]} referred by deviceLogId: ${deviceLog._id.toString()}. Error: ${error.stack || error}`, "error", NAME );
                    throw error;
                }

                if( !documentObj ) {
                    return true;
                }
                // --------------------------------------------------------- 3. END -----------------------------------------------------------------------------

                // -------------------------------- 4. Check if media _id = deviceLog.attachedMedia[0].mediaId exists in DB -------------------------------------
                [error, mediaObj] = await formatPromiseResult( mediaModel.mongoose.collection.findOne( {_id: ObjectId( deviceLog.attachedMedia[0].mediaId )} ) );

                if( error ) {
                    Y.log( `shouldDeleteDeviceLog: Error while querying mediaId: ${deviceLog.attachedMedia[0].mediaId} referred by deviceLogId: ${deviceLog._id.toString()}. Error: ${error.stack || error}`, "error", NAME );
                    throw error;
                }

                if( !mediaObj ) {
                    return true;
                }
                // -------------------------------------------------------- 4. END ------------------------------------------------------------------------------

                return false;
            }

            // -------------------------- 1. Get 'activity' model --------------------------------------------------------------------------------
            [err, activityModel] = await formatPromiseResult( getModelProm( user, 'activity', true ) );

            if( err ) {
                Y.log( `deleteDanglingDeviceLogs_4_2: Error while getting 'activity' collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // ----------------------------------- 1. END ----------------------------------------------------------------------------------------

            // ---------------------------- 2. Get 'devicelog' model -----------------------------------------------------------------------------
            [err, deviceLogModel] = await formatPromiseResult( getModelProm( user, 'devicelog', true ) );

            if( err ) {
                Y.log( `deleteDanglingDeviceLogs_4_2: Error while getting 'devicelog' collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // ----------------------------------- 2. END ----------------------------------------------------------------------------------------

            // --------------------------- 3. Get 'document' model -------------------------------------------------------------------------------
            [err, documentModel] = await formatPromiseResult( getModelProm( user, 'document', true ) );

            if( err ) {
                Y.log( `deleteDanglingDeviceLogs_4_2: Error while getting 'document' collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // ----------------------------------- 3. END ----------------------------------------------------------------------------------------

            // ---------------------------- 4. Get 'media' model ---------------------------------------------------------------------------------
            [err, mediaModel] = await formatPromiseResult( getModelProm( user, 'media', true ) );

            if( err ) {
                Y.log( `deleteDanglingDeviceLogs_4_2: Error while getting 'media' collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // ------------------------------------- 4. END --------------------------------------------------------------------------------------

            // -------------------------- 5. Check if 'deviceLogs' collection has any record -------------------------------------------------
            [err, result] = await formatPromiseResult( deviceLogModel.mongoose.collection.estimatedDocumentCount() );

            if( err ) {
                Y.log( `deleteDanglingDeviceLogs_4_2: Error getting total count of deviceLogs. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `deleteDanglingDeviceLogs_4_2: No deviceLogs found. Nothing to do, all good...`, "info", NAME );
                return callback();
            }
            // ------------------------------------------ 5. END ------------------------------------------------------------------------------

            // ----------------------------- 6. For each deviceLog, if deviceLog is obsolete then delete it -----------------------------------------------------
            deviceLogStream = deviceLogModel.mongoose.collection.find().stream();

            deviceLogStream
                .on( 'data', async ( deviceLog ) => {
                    deviceLogStream.pause();

                    let
                        deletedResult,
                        deleteDeviceLog;

                    // ---------------------------- 6a. Check if deviceLog is valid ------------------------------------------------------------------
                    [err, deleteDeviceLog] = await formatPromiseResult( shouldDeleteDeviceLog( deviceLog ) );

                    if( err ) {
                        Y.log( `deleteDanglingDeviceLogs_4_2: Error in method 'shouldDeleteDeviceLog' for deviceLogId: ${deviceLog._id.toString()}. Error: ${err.stack || err}`, "error", NAME );
                        return deviceLogStream.destroy( err );
                    }
                    // ------------------------------------ 6a. END ----------------------------------------------------------------------------------

                    // ---------------------------- 6b. If 'deleteDeviceLog' is 'true' then delete deviceLog from the DB -----------------------------
                    if( deleteDeviceLog ) {
                        [err, deletedResult] = await formatPromiseResult( deviceLogModel.mongoose.collection.deleteOne( {_id: deviceLog._id} ) );

                        if( err ) {
                            Y.log( `deleteDanglingDeviceLogs_4_2: Error while deleting obsolete deviceLog with _id = ${deviceLog._id.toString()}. Error: ${err.stack || err}`, "error", NAME );
                            return deviceLogStream.destroy( err );
                        }

                        if( !deletedResult || !deletedResult.result || deletedResult.result.n !== 1 ) {
                            Y.log( `deleteDanglingDeviceLogs_4_2: Failed to delete obsolete deviceLog with _id = ${deviceLog._id.toString()}`, "error", NAME );
                            return deviceLogStream.destroy( `deleteDanglingDeviceLogs_4_2: Failed to delete obsolete deviceLog with _id = ${deviceLog._id.toString()}` );
                        }

                        totalDeviceLogsDeleted++;
                        Y.log( `deleteDanglingDeviceLogs_4_2: Successfully deleted obsolete deviceLog with _id = ${deviceLog._id.toString()}`, "info", NAME );
                    }
                    // --------------------------------------------- 6b. END ------------------------------------------------------------------------

                    deviceLogStream.resume();
                } )
                .on( 'error', ( error ) => {
                    streamError = error;
                } )
                .on( 'close', () => {
                    if( streamError ) {
                        if( callbackCalled ) {
                            Y.log( `deleteDanglingDeviceLogs_4_2: Stream error for last record in DB for tenant: '${user.tenantId}' but callback is already called with success. Error: ${streamError.stack || streamError}`, "error", NAME );
                        } else {
                            Y.log( `deleteDanglingDeviceLogs_4_2: Stream Error in migration for tenant: '${user.tenantId}' Total device log(s) deleted = ${totalDeviceLogsDeleted}. Error: ${streamError.stack || streamError}`, "error", NAME );
                        }
                    } else {
                        Y.log( `deleteDanglingDeviceLogs_4_2: Successfully ended migration for tenant: ${user.tenantId}. Total device log(s) deleted = ${totalDeviceLogsDeleted}`, "info", NAME );
                    }

                    if( !callbackCalled ) {
                        callbackCalled = true;
                        callback( streamError );
                    }
                } );
            // ----------------------------------------------------- 6. END ---------------------------------------------------------------------------------------------------
        }

        /**
         * Method to reset ttlIndex on auths checkinTime, so that auths are not automatically deleted.
         * @ticket MOJ-10378, MOJ-10498
         *
         * @param {Object} user
         * @param {Function} callback
         * @returns {Promise<void>}
         */
        async function disableTTLIndex_4_2( user, callback ) {
            const
                DCDB = require( 'dc-core' ).db;

            let
                ttlOptions = {
                    expireAfterSeconds: 99999999999,
                    background: true,
                    name: 'checkinTime'
                };

            Y.log( `disableTTLIndex_4_2: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            DCDB.updateIndex( user.tenantId, 'auths', {checkinTime: 1}, ttlOptions, function( err ) {
                if( err ) {
                    Y.log( `could not update the index checkinTime for  ${user.tenantId}.auths: ${err.stack || err}`, 'error', NAME );
                }
                Y.log( `disableTTLIndex_4_2: Ended migration for tenant: ${user.tenantId}`, "info", NAME );
                callback( err );
            } );

        }

        async function migrateActivitySequencesNonDiagnose_4_2( user, callback ) {
            Y.log( `migrateActivitySequencesNonDiagnose_4_2: migrating activity sequences with activities not diagnose has fields to remove for tenant ${user.tenantId}`, 'debug' );
            let
                err,
                sequences;

            [err, sequences] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activitysequence',
                    migrate: true,
                    action: 'get',
                    query: {
                        activities: {
                            "$elemMatch": {
                                actType: {$nin: ['DIAGNOSIS']},
                                $or: [
                                    {diagnosisCert: {$exists: true}},
                                    {diagnosisSite: {$exists: true}}
                                ]
                            }
                        }
                    }
                } )
            );

            if( err ) {
                Y.log( `migrateActivitySequencesNonDiagnose_4_2: Error getting sequences. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !sequences || !sequences.length ) {
                Y.log( `migrateActivitySequencesNonDiagnose_4_2: No sequences. Skip migration`, "warn", NAME );
                return callback();
            }

            for( let sequence of sequences ) {
                sequence.activities.forEach( function( activity ) {
                    if( activity.hasOwnProperty( 'diagnosisCert' ) ) {
                        delete activity.diagnosisCert;
                    }
                    if( activity.hasOwnProperty( 'diagnosisSite' ) ) {
                        delete activity.diagnosisSite;
                    }
                } );
                let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activitysequence',
                    action: 'update',
                    migrate: true,
                    query: {_id: sequence._id},
                    data: {
                        $set: {"activities": sequence.activities}
                    },
                    options: {
                        strict: false
                    }
                } ) );

                if( err ) {
                    Y.log( `migrateActivitySequencesNonDiagnose_4_2: Error in updating activitysequence activities. ${err.message}`, 'error', NAME );
                }
            }
            callback();
        }

        /**
         * Function to set the default value of new field paidFreeStatus on CREATED and VALID KBVUTILITIES.
         * @param user
         * @param callback
         * @returns {Promise<*>}
         */
        async function migrateKbvUtilityPaidFreeStatus_4_3( user, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `migrateKbvUtilityPaidFreeStatus_4_3: migrating paidFreeStatus on tenant ${user.tenantId}`, 'debug' );

            let err, result, activityModel;

            [err, activityModel] = await formatPromiseResult( getModelProm( user, 'activity', true ) );

            if( err ) {
                Y.log( `migrateKbvUtilityPaidFreeStatus_4_3: Error while getting 'activity' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err, result] = await formatPromiseResult( activityModel.mongoose.collection.update( {
                actType: 'KBVUTILITY',
                status: {$in: ['CREATED', 'VALID']},
                paidFreeStatus: {$exists: false}
            }, {
                $set: {
                    paidFreeStatus: 'AUTO'
                }
            }, {multi: true} ) );

            if( err ) {
                Y.log( `migrateKbvUtilityPaidFreeStatus_4_3: Error while setting default value of paidFreeStatus on kbvutility. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `migrateKbvUtilityPaidFreeStatus_4_3: Successfully ended migration for tenant: ${user.tenantId}: ${JSON.stringify( result )}`, "info", NAME );
            return callback();

        }

        /**
         * Function to calculate totals on invoice.
         * @param user
         * @param callback
         * @returns {Promise<*>}
         */
        async function migrateInvoices_4_3( user, callback ) {
            const
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `migrateInvoices_4_3: on tenant ${user.tenantId}`, 'debug' );

            let err, result, activityModel;

            [err, activityModel] = await formatPromiseResult( getModelProm( user, 'activity', true ) );

            if( err ) {
                Y.log( `migrateInvoices_4_3: Error while getting 'activity' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err, result] = await formatPromiseResult( activityModel.mongoose.find( {
                actType: 'INVOICE',
                status: 'VALID',
                totalWithoutExpenses: {$exists: false}
            }, {}, {lean: true} ).cursor().eachAsync( invoice => {
                let
                    invoiceHasErr = null,
                    lastSchein;

                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.patient.lastSchein( {
                        user: user,
                        query: {
                            patientId: invoice.patientId,
                            caseFolderId: invoice.caseFolderId,
                            timestamp: invoice.timestamp,
                            locationId: invoice.locationId
                        },
                        callback: ( err, schein ) => {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( schein && schein[0] );
                        }
                    } );

                } ).catch( err => {
                    Y.log( `Could not get last schein for invoice ${invoice._id}: ${err.stack || err}`, 'error', NAME );
                    invoiceHasErr = err;
                    //  continue migration, best effort

                } ).then( _lastSchein => {
                    if( invoiceHasErr ) {
                        return Promise.resolve( false );
                    }
                    lastSchein = _lastSchein;

                    return activityModel.mongoose.collection.find( {
                        _id: {$in: invoice.activities.map( id => ObjectId( id ) )},
                        actType: 'TREATMENT'
                    } ).toArray();
                } ).catch( err => {

                    //throw Error( `could not get linked treatments: ${err.stack || err}` );
                    Y.log( `Could not get linked treatments for invoice ${invoice._id}: ${err.stack || err}`, 'error', NAME );
                    invoiceHasErr = err;
                    //  continue migration, best effort

                } ).then( treatments => {
                    if( invoiceHasErr ) {
                        return Promise.resolve( false );
                    }

                    treatments.forEach( Y.doccirrus.invoiceutils.calcTreatment );
                    Y.doccirrus.invoiceutils.calcInvoice( invoice, lastSchein || {}, treatments );

                    return activityModel.mongoose.collection.update( {_id: invoice._id}, {
                        $set: {
                            totalWithoutExpenses: invoice.totalWithoutExpenses,
                            totalDoc: invoice.totalDoc,
                            total75: invoice.total75,
                            total25: invoice.total25,
                            total15: invoice.total15,
                            totalOwing: invoice.totalOwing,
                            hasOP: invoice.hasOP,
                            beforetax: invoice.beforetax,
                            totalVat: invoice.totalVat,
                            total: invoice.total,
                            totalASK: invoice.totalASK,
                            totalBSK: invoice.totalBSK,
                            totalAHB: invoice.totalAHB,
                            totalBHB: invoice.totalBHB,
                            price: invoice.price,
                            totalExpense: invoice.totalExpense
                        }
                    } );

                } ).catch( err => {

                    Y.log( `Could not recalculate invoice ${invoice._id}: ${err.stack || err}`, 'error', NAME );
                    invoiceHasErr = err;
                    //  continue migration, best effort

                } );

            } ) );

            if( err ) {
                Y.log( `migrateInvoices_4_3: Error while setting default value of paidFreeStatus on kbvutility. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `migrateInvoices_4_3: Successfully ended migration for tenant: ${user.tenantId}: ${JSON.stringify( result )}`, "info", NAME );
            return callback();
        }

        function migrateCorrectTotalReceipts_4_3( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.checkInvoiceBalance( user, true, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( `migrateCorrectTotalReceipts_4_3: Problem generating report for totalReceipts migration: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }

                Y.log( `migrateCorrectTotalReceipts_4_3: Completed migration to correct rounding error on invoice totals for tenant ${user.tenantId}`, 'debug', NAME );
                callback( null );
            }

        }

        async function migrateOwnRulesMeta_4_3( user, callback ) {
            const
                ObjectId = require( 'mongodb' ).ObjectID;

            Y.log( `migrateOwnRulesMeta_4_3: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            let ruleSets = [],
                parentId = Y.doccirrus.schemas.rule.getPracticeDirId();

            let [err] = await formatPromiseResult(
                Y.doccirrus.ruleutils.walkDownFrom( user, parentId, async ( ruleSet ) => {
                    if( !ruleSet.rules || !ruleSet.rules.length || ruleSet.rules.some( rule => rule.metaCodes || rule.metaActTypes ) ) {
                        //already has rule level matadata
                        return;
                    }
                    ruleSets = [...ruleSets, ruleSet];
                } )
            );
            if( err ) {
                Y.log( `migrateOwnRulesMeta_4_3: Error collecting praxis rules: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            for( let ruleSet of ruleSets ) {
                let meta = Y.doccirrus.ruleutils.getMeta( ruleSet.rules, ruleSet );

                //write back only if any metadata collected
                if( meta.actTypes.length || meta.actCodes.length ) {
                    ruleSet.rules = ruleSet.rules.map( rule => {
                        if( rule.ruleId ) {
                            return rule;
                        }
                        rule.ruleId = (new ObjectId()).toString();
                        return rule;
                    } );

                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'rule',
                            migrate: true,
                            action: 'update',
                            query: {_id: ruleSet._id},
                            data: {
                                $set: {
                                    rules: ruleSet.rules,
                                    metaActTypes: meta.actTypes,
                                    metaActCodes: meta.actCodes,
                                    metaFuzzy: meta.metaFuzzy
                                }
                            }
                        } )
                    );
                    if( err ) {
                        Y.log( `migrateOwnRulesMeta_4_3: Error updating ruleSet ${ruleSet._id}: ${err.stack || err}`, 'warn', NAME );
                        //continue with other ruleSets
                    }
                }
            }

            Y.log( `migrateOwnRulesMeta_4_3: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback( null );
        }

        function addInvoiceFactor2019Q1_4_4( user, callback ) {

            function updatedCb( err, result ) {
                if( err ) {
                    Y.log( 'addInvoiceFactor2019Q1_4_4: could not update invoice configuration: ' + err + ' for tenant ' + user.tenantId, 'error', NAME );
                    return callback( err );
                }
                Y.log( 'addInvoiceFactor2019Q1_4_4: successfully updated invoice configuration for tenant ' + user.tenantId + ' result: ' + JSON.stringify( result ), 'debug', NAME );
                callback();
            }

            function modelCb( err, model ) {
                if( err ) {
                    return callback( err );
                }

                model.mongoose.update( {_id: '000000000000000000000001'}, {
                    $addToSet: {
                        invoicefactors: {
                            "_id": "000000000000000000000009",
                            "year": "2019",
                            "quarter": "1",
                            "factor": 0.108226,
                            "isDefault": true
                        }
                    }
                }, updatedCb );
            }

            Y.doccirrus.mongodb.getModel( user, 'invoiceconfiguration', true, modelCb );
        }

        /**
         * @Ticket MOJ-9320
         *
         * This migration deletes the proxy configuration saved in 'admins' collection and moves it to dc-cli.
         * If a proxy is alreadyset in admins collection and dc-cli then we do not override dc-cli proxy with db proxy.
         *
         * NOTE: This method restarts the insuite server and so must be executes as the last method in migration
         *
         * @param {Object} user
         * @param {Function} callback
         * @return {Promise<*>}
         */
        async function moveProxyConfigFromDbToDcCli_4_3( user, callback ) {
            const
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                proxyId = "000000000000000000000009"; // We are using hardcode ID because this ID is removed from the schema and will be deleted from DB by this method

            let
                err,
                result,
                adminModel,
                dbProxy;

            Y.log( `moveProxyConfigFromDbToDcCli_4_3: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            // --------------------------------- 1. Get 'admin' DB model ----------------------------------------------------------------
            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel( user, 'admin', true, ( modelErr, model ) => {
                        if( modelErr ) {
                            reject( modelErr );
                        } else {
                            resolve( model );
                        }
                    } );
                } )
            );

            if( err ) {
                Y.log( `moveProxyConfigFromDbToDcCli_4_3: Error getting 'admin' collection model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !result ) {
                Y.log( `moveProxyConfigFromDbToDcCli_4_3: Failed to fetch 'admin' collection model`, "error", NAME );
                return callback( `moveProxyConfigFromDbToDcCli_4_3: Failed to fetch 'admin' collection model` );
            }

            adminModel = result;
            // ------------------------------ 1. END -------------------------------------------------------------------------------------

            // --------------------------------------- 2. Query existing proxy configuration from DB -------------------------------------------------
            [err, result] = await formatPromiseResult(
                adminModel.mongoose.collection.findOne( {_id: ObjectId( proxyId )} )
            );

            if( err ) {
                Y.log( `moveProxyConfigFromDbToDcCli_4_3: Error while fetching proxy config from 'admins' collection with _id: ${proxyId}. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            dbProxy = result && result.proxy;
            // ------------------------------------------ 2. END -------------------------------------------------------------------------------------------

            // ------------------------------------- 3. Delete proxy configuration from the DB (if any) ---------------------------------------------------
            [err, result] = await formatPromiseResult(
                adminModel.mongoose.collection.deleteOne( {_id: ObjectId( proxyId )} )
            );

            if( err ) {
                Y.log( `moveProxyConfigFromDbToDcCli_4_3: Error while deleting proxy config with _id = ${proxyId} from DB. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            // ------------------------------------------------------ 3. END ------------------------------------------------------------------------------

            // ------------- 4. Fetch any existing proxy configuration from dc-cli and if present then nothing to do -------------------
            [err, result] = await formatPromiseResult( Y.doccirrus.api.cli.getProxyConfig() );

            if( err ) {
                if( err.code === "userMgmtMojit_01" ) {
                    // Means dc-cli itself is not present so proxy is not supported.
                    Y.log( `moveProxyConfigFromDbToDcCli_4_3: dc-cli is not present. Ignoring dbProxy: ${dbProxy}. Nothing to do all good...`, "info", NAME );
                    return callback();
                }

                Y.log( `moveProxyConfigFromDbToDcCli_4_3: Error while fetching proxy configuration from dc-cli. DbProxy is: ${dbProxy}. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( result.proxy ) {
                Y.log( `moveProxyConfigFromDbToDcCli_4_3: Proxy: ${result.proxy} is already set at dc-cli level. Ignoring dbProxy: ${dbProxy}. No need to set anything. All good...`, "info", NAME );
                return callback();
            }

            if( !dbProxy && (typeof result.proxy === "undefined") ) {
                Y.log( `moveProxyConfigFromDbToDcCli_4_3: No proxy is set in DB and dc-cli. Nothing to do all good...`, "info", NAME );
                return callback();
            }
            // ---------------------------------------------------- 4. END ---------------------------------------------------------------------------

            // ----------------------------------- 5. Set and apply proxy configuration to datensafe and restart insuite -----------------------------
            [err, result] = await formatPromiseResult(
                Y.doccirrus.api.cli.setProxyConfig( {
                    data: {
                        proxy: dbProxy
                    }
                } )
            );

            if( err ) {
                Y.log( `moveProxyConfigFromDbToDcCli_4_3: Error while setting dbProxy: ${dbProxy} via dc-cli. Error: ${err.stack || err}` );
                return callback( err );
            }
            // ------------------------------------------------------ 5. END -------------------------------------------------------------------------

            Y.log( `moveProxyConfigFromDbToDcCli_4_3: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        /**
         *  Migration to clean up __placeholder__ markers in patients EXTMOJ-1841
         *
         *  @param  {Object}    args.user
         *  @param  {Object}    args.callback
         */

        function removePlaceholderMarkers_4_3( user, callback ) {

            Y.doccirrus.inCaseUtils.migrationhelper.removePlaceholderMarkers( user, true, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( `Problem running migration to clean up __placeholder__ markers: ${err.stack || err}`, 'warn', NAME );
                }
                callback( null );
            }
        }

        /**
         *  Migration to correct prices of EBM treatments in inCase and activitySequences, MOJ-10729
         *
         *  @param  {Object}    args.user
         *  @param  {Object}    args.callback
         */


        function correctEBMPrices_4_3( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.correctEBMPrices( user, true, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( `Problem running migration to correct EBM prices from catalogs: ${err.stack || err}`, 'warn', NAME );
                }
                callback( null );
            }
        }

        function correctEBMKettePrices_4_3( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.correctEBMKettePrices( user, true, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( `Problem running migration to correct EBM prices from catalogs: ${err.stack || err}`, 'warn', NAME );
                }
                callback( null );
            }
        }

        function migrateActivitySettings_4_4( user, callback ) {
            if( Y.doccirrus.auth.isVPRC() && user.tenantId === '0' ) {
                callback();
                return;
            }

            const
                async = require( 'async' ),
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                queryId = ObjectId( Y.doccirrus.schemas.activitysettings.getId() );

            Y.log( `migrateActivitySettings_4_4: starting migration for tenant: ${user.tenantId} and Id ${Y.doccirrus.schemas.activitysettings.getId()}`, 'info', NAME );

            async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.getModel( user, 'activitysettings', true, next );
                    },
                    function( activitySettingsModel, next ) {
                        activitySettingsModel.mongoose.collection.findOne( {_id: queryId} )
                            .then( ( doc ) => {
                                if( !doc ) {
                                    return "no_doc_found";
                                } else {
                                    let hasChanged = false;

                                    doc.settings.forEach( ( setting ) => {
                                        if( setting.actType === "PRESCRBTM" ) {
                                            setting.maxMedicationAmount = 2;
                                            hasChanged = true;
                                        }
                                    } );

                                    if( hasChanged ) {
                                        return activitySettingsModel.mongoose.collection.updateOne( {_id: queryId}, {$set: {'settings': doc.settings}} );
                                    } else {
                                        return "no_changes";
                                    }
                                }
                            } )
                            .then( ( result ) => {
                                next( null, result );
                            } )
                            .catch( ( error ) => {
                                next( error );
                            } );
                    }], ( err, result ) => {
                    if( err ) {
                        Y.log( `migrateActivitySettings_4_4 failed. Error: ${err} `, 'error', NAME );
                        return callback( err );
                    } else if( result === "no_changes" ) {
                        Y.log( `migrateActivitySettings_4_4: Nothing to update for tenant: ${user.tenantId}`, 'info', NAME );
                        return callback();
                    } else if( result === "no_doc_found" ) {
                        Y.log( `migrateActivitySettings_4_4: Activity Settings document not found for tenant: ${user.tenantId} and Id: ${Y.doccirrus.schemas.activitysettings.getId()}`, 'info', NAME );
                        return callback();
                    } else if( result && result.result && result.result.n === 1 ) {
                        Y.log( `migrateActivitySettings_4_4: successfully migrated for tenant ${user.tenantId} and Id: ${Y.doccirrus.schemas.activitysettings.getId()}`, 'info', NAME );
                        return callback();
                    } else {
                        Y.log( `migrateActivitySettings_4_4: failed to update for tenant ${user.tenantId} and Id: ${Y.doccirrus.schemas.activitysettings.getId()}`, 'error', NAME );
                        return callback( `migrateActivitySettings_4_4: failed to update for tenant ${user.tenantId} and Id: ${Y.doccirrus.schemas.activitysettings.getId()}` );
                    }
                }
            );
        }

        /**
         * Migration to add _id in insuranceStatus of imported patients MOJ-10695
         * @param user
         * @param callback
         */
        async function migrateImportedInsuranceStatus_4_4( user, callback ) {

            if( Y.doccirrus.auth.isVPRC() && user.tenantId === '0' ) {
                return callback();
            }

            const
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                getModel = require( 'util' ).promisify( Y.doccirrus.mongodb.getModel );

            let
                err,
                result,
                patient,
                patientModel,
                patientCursor;

            Y.log( `migrateImportedInsuranceStatus_4_4: migrating insuranceStatus of imported patients for tenant: ${user.tenantId}`, 'info', NAME );

            // 1. Instantiate the 'patient 'model
            [err, patientModel] = await formatPromiseResult( getModel( user, 'patient', true ) );

            if( err ) {
                Y.log( `migrateImportedInsuranceStatus_4_4: Error while getting patient collection model, for tenant: ${user.tenantId}. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            // 2. Get Patient Stream
            try {

                patientCursor = patientModel.mongoose.find( {
                    'importId': {$exists: true},
                    'insuranceStatus': {$ne: []}
                }, {'insuranceStatus': 1} ).cursor();

                // Iterate patientCursor
                while( (patient = await patientCursor.next()) ) { // eslint-disable-line no-cond-assign
                    let
                        isChanged = false;

                    patient.insuranceStatus.filter( Boolean ).map( insuranceObj => {
                        if( insuranceObj && insuranceObj.type && !insuranceObj._id ) {
                            insuranceObj._id = new ObjectId();
                            isChanged = true;
                        }
                    } );

                    //3. Update patient only if insuranceStatus is changed
                    if( isChanged ) {
                        [err, {result = {}}] = await formatPromiseResult( patientModel.mongoose.collection.updateOne( {_id: patient._id}, {$set: {insuranceStatus: patient.insuranceStatus}} ) );

                        if( err ) {
                            Y.log( `migrateImportedInsuranceStatus_4_4: Error occurred while updating patient: ${patient._id.toString()} with insuranceStatus, for tenant: ${user.tenantId}. Error: ${err.stack || err}`, "error", NAME );
                            return callback( err );
                        }

                        if( !result || !result.nModified || result.nModified !== 1 ) {
                            Y.log( `migrateImportedInsuranceStatus_4_4: Failed to update the patient: '${patient._id.toString()}' with insuranceStatus, for tenant: ${user.tenantId}`, "error", NAME );
                            return callback( `migrateImportedInsuranceStatus_4_4: Failed to update the patient: '${patient._id.toString()}' with insuranceStatus, for tenant: ${user.tenantId}` );
                        }
                        Y.log( `migrateImportedInsuranceStatus_4_4: Successfully updated the patient: '${patient._id.toString()}' with insuranceStatus for tenant: ${user.tenantId}`, "debug", NAME );
                    }
                }

                Y.log( `migrateImportedInsuranceStatus_4_4: Successfully completed migration of imported patient's insuranceStatus for tenant: ${user.tenantId}`, "info", NAME );

                return callback();

            } catch( error ) {
                Y.log( `migrateImportedInsuranceStatus_4_4: Error occurred in migration for tenant: ${user.tenantId}. Error: ${error.stack || error}`, "error", NAME );
                return callback( error );
            }
        }

        /**
         * @Ticket EXTMOJ-1995
         *
         * This migration convert string to number for fields marked as Number in Y.doccirrus.schemas.cardio.xmlTypes
         * in activities and cardios collections
         *
         * @param {Object} user
         * @param {Function} callback
         * @return {Promise<*>}
         */
        async function fixNumericFieldsFromXML_4_4( user, callback ) {
            const
                getModel = util.promisify( Y.doccirrus.mongodb.getModel ),
                xmlTypes = Y.doccirrus.schemas.cardio.xmlTypes;

            let err, cardioModel;
            [err, cardioModel] = await formatPromiseResult( getModel( user, 'cardio', true ) );
            if( err ) {
                Y.log( `fixNumericFieldsFromXML_4_4: Error getting cardio model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            let
                cardioQuery = {$or: []},
                activityQuery = {
                    actType: {$in: ["PROCESS", "MEASUREMENT"]},
                    $or: []
                };

            Object.keys( xmlTypes ).filter( el => xmlTypes[el] === 'Number' ).forEach( el => {
                let objActivity = {}, objCardio = {};
                objCardio[`data.dataset.${el}`] = {$exists: true, $type: 2};
                cardioQuery.$or.push( objCardio );

                objActivity[`d_extra.${el}`] = {$exists: true, $type: 2};
                activityQuery.$or.push( objActivity );
            } );

            let cardioCursor = cardioModel.mongoose.find( cardioQuery, {
                _id: 1,
                data: 1
            }, {lean: true} ).cursor().addCursorFlag( 'noCursorTimeout', true );

            let cardio;
            while( cardio = await cardioCursor.next() ) { // eslint-disable-line no-cond-assign
                Y.doccirrus.cardioutils.traverse( cardio.data.dataset, [], cardio.data.dataset, Y.doccirrus.cardioutils.convertNumeric );
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'cardio',
                        migrate: true,
                        action: 'update',
                        query: {_id: cardio._id},
                        data: {$set: {data: cardio.data}}
                    } )
                );
                if( err ) {
                    Y.log( `fixNumericFieldsFromXML_4_4: Error updating cardio ${cardio._id}: ${err.stack || err}`, 'warn', NAME );
                }
            }

            let activityModel;
            [err, activityModel] = await formatPromiseResult( getModel( user, 'activity', true ) );
            if( err ) {
                Y.log( `fixNumericFieldsFromXML_4_4: Error getting activity model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            let activityCursor = activityModel.mongoose.find( activityQuery, {
                _id: 1,
                d_extra: 1
            }, {lean: true} ).cursor().addCursorFlag( 'noCursorTimeout', true );

            let activity;
            while( activity = await activityCursor.next() ) { // eslint-disable-line no-cond-assign
                Y.doccirrus.cardioutils.traverse( activity.d_extra, [], activity.d_extra, Y.doccirrus.cardioutils.convertNumeric );
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        migrate: true,
                        action: 'update',
                        query: {_id: activity._id},
                        data: {$set: {d_extra: activity.d_extra}}
                    } )
                );
                if( err ) {
                    Y.log( `fixNumericFieldsFromXML_4_4: Error updating activity ${activity._id}: ${err.stack || err}`, 'warn', NAME );
                }
            }

            Y.log( `fixNumericFieldsFromXML_4_4: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        /**
         * Migration to update linked activities of invoices EXTMOJ-1975
         * @param user
         * @param callback
         */

        async function migrateInvoicesLinkedActivities_4_4( user, callback ) {
            const
                getModel = util.promisify( Y.doccirrus.mongodb.getModel );
            let
                err,
                activityQuery = {
                    actType: "INVOICE"
                },
                activityModel;

            Y.log( `migrateInvoicesLinkedActivities_4_4: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, activityModel] = await formatPromiseResult( getModel( user, 'activity', true ) );
            if( err ) {
                Y.log( `migrateInvoicesLinkedActivities_4_4: Error getting activity model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            let activityCursor = activityModel.mongoose.find( activityQuery, {
                _id: 1,
                receipts: 1,
                referencedBy: 1
            }, {lean: true} ).cursor().addCursorFlag( 'noCursorTimeout', true );

            let activity;
            while( activity = await activityCursor.next() ) {  // eslint-disable-line no-cond-assign
                if( activity && activity._id ) {
                    let invoiceToProcess = activity,
                        i,
                        linkedActivities = [],
                        linkedIds = Y.doccirrus.api.linkedactivities.getAllReferences( invoiceToProcess );

                    for( i = 0; i < linkedIds.length; i++ ) {
                        if( linkedIds[i] && -1 === linkedActivities.indexOf( linkedIds[i] ) ) {
                            linkedActivities.push( linkedIds[i] );
                        }
                    }

                    if( 0 < linkedActivities.length ) {
                        let [err, receipts] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                migrate: true,
                                query: {
                                    //  set of receipts linked from the invoice
                                    _id: {$in: linkedActivities}
                                }
                            } )
                        );

                        if( err ) {
                            Y.log( `migrateInvoicesLinkedActivities_4_4: Error while getting related activities of with ID: ${invoiceToProcess._id}. Error: ${err.stack || err}`, "error", NAME );
                        }

                        if( receipts && 0 < receipts.length ) {
                            invoiceToProcess.linkedEmployees = [];
                            invoiceToProcess.linkedContents = [];
                            invoiceToProcess.linkedTimestamps = [];
                            invoiceToProcess.totalReceipts = 0;
                            for( let i = 0; i < receipts.length; i++ ) {
                                if( receipts[i].actType === 'RECEIPT' || receipts[i].actType === 'WARNING1' || receipts[i].actType === 'WARNING2' || receipts[i].actType === 'CREDITNOTE' || receipts[i].actType === 'REMINDER' || receipts[i].actType === 'BADDEBT' ) {
                                    invoiceToProcess.totalReceipts = invoiceToProcess.totalReceipts + parseFloat( receipts[i].amount || 0 );
                                    invoiceToProcess.linkedEmployees.push( {
                                        name: receipts[i].employeeName,
                                        initials: receipts[i].employeeInitials,
                                        receiptId: receipts[i]._id.toString()
                                    } );
                                    invoiceToProcess.linkedContents.push( {
                                        content: receipts[i].content ? receipts[i].content : Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', receipts[i].actType, '-de', 'k.A.' ),
                                        receiptId: receipts[i]._id.toString(),
                                        actType: receipts[i].actType,
                                        caseFolderId: receipts[i].caseFolderId,
                                        patientId: receipts[i].patientId
                                    } );
                                    invoiceToProcess.linkedTimestamps.push( {
                                        timestamp: receipts[i].timestamp,
                                        receiptId: receipts[i]._id.toString()
                                    } );
                                }
                            }

                            [err] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'activity',
                                    action: 'update',
                                    migrate: true,
                                    query: {
                                        _id: invoiceToProcess._id
                                    },
                                    data: {
                                        $set: {
                                            linkedContents: invoiceToProcess.linkedContents,
                                            linkedEmployees: invoiceToProcess.linkedEmployees,
                                            linkedTimestamps: invoiceToProcess.linkedTimestamps,
                                            totalReceipts: invoiceToProcess.totalReceipts
                                        }
                                    }
                                } )
                            );

                            if( err ) {
                                Y.log( `migrateInvoicesLinkedActivities_4_4: Error while updating activity with ID: ${invoiceToProcess._id}. Error: ${err.stack || err}`, "error", NAME );
                            }
                        }
                    }
                }
            }

            Y.log( `migrateInvoicesLinkedActivities_4_4: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        /**
         * Migration to update cardio partnerIds
         * @param user
         * @param callback
         */

        async function migrateCardioPartnerIds_4_4( user, callback ) {
            const
                getModel = util.promisify( Y.doccirrus.mongodb.getModel );
            let
                err,
                patientQuery = {
                    partnerIds: {$exists: true}
                },
                patientModel;

            Y.log( `migrateCardioPartnerIds_4_4: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, patientModel] = await formatPromiseResult( getModel( user, 'patient', true ) );
            if( err ) {
                Y.log( `migrateCardioPartnerIds_4_4: Error getting patient model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            let patientCursor = patientModel.mongoose.find( patientQuery, {
                _id: 1,
                partnerIds: 1
            }, {lean: true} ).cursor().addCursorFlag( 'noCursorTimeout', true );

            let patient;
            while( patient = await patientCursor.next() ) {  // eslint-disable-line no-cond-assign
                if( patient && patient._id && 0 < patient.partnerIds.length ) {
                    // check if has cardio item
                    let hasCardio = patient.partnerIds.some( item => {
                        return 'CARDIO' === item.partnerId;
                    } );

                    if( hasCardio ) {
                        patient.partnerIds.forEach( ( item ) => {
                            if( 'CARDIO' === item.partnerId && !item.selectedType ) {
                                item.selectedType = 'BIOTRONIK';
                            }
                        } );

                        [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'patient',
                                action: 'update',
                                migrate: true,
                                query: {
                                    _id: patient._id
                                },
                                data: {
                                    $set: {
                                        partnerIds: patient.partnerIds
                                    }
                                }
                            } )
                        );

                        if( err ) {
                            Y.log( `migrateCardioPartnerIds_4_4: Error while updating partnerIds of patient with ID: ${patient._id}. Error: ${err.stack || err}`, "error", NAME );
                        }
                    }
                }
            }

            Y.log( `migrateCardioPartnerIds_4_4: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        /**
         * Migration to update renamed field
         * @param user
         * @param callback
         */

        async function migrateInvoicesBilledDate_4_4( user, callback ) {
            const
                getModel = util.promisify( Y.doccirrus.mongodb.getModel );
            let
                err,
                activityQuery = {
                    actType: "INVOICE",
                    dueDate: {$exists: true}
                },
                activityModel;

            Y.log( `migrateInvoicesBilledDate_4_4: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, activityModel] = await formatPromiseResult( getModel( user, 'activity', true ) );
            if( err ) {
                Y.log( `migrateInvoicesBilledDate_4_4: Error getting activity model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            let activityCursor = activityModel.mongoose.find( activityQuery, {
                _id: 1,
                dueDate: 1
            }, {lean: true} ).cursor().addCursorFlag( 'noCursorTimeout', true );

            let activity;
            while( activity = await activityCursor.next() ) {  // eslint-disable-line no-cond-assign
                if( activity && activity._id ) {
                    activity.invoiceBilledDate = activity.dueDate;
                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'update',
                            migrate: true,
                            query: {
                                _id: activity._id
                            },
                            data: {$set: {invoiceBilledDate: activity.invoiceBilledDate}, $unset: {dueDate: ''}},
                            options: {strict: false}
                        } )
                    );

                    if( err ) {
                        Y.log( `migrateInvoicesBilledDate_4_4: Error while updating activity with ID: ${activity._id}. Error: ${err.stack || err}`, "error", NAME );
                    }
                }
            }

            Y.log( `migrateInvoicesBilledDate_4_4: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        // ----------------------------------------------------------------------

        /**
         * This is to add a default ['D'] countryMode to existing patients
         *
         * @param {Object} user
         * @param {Function} callback
         * @return {Promise}
         */
        async function migratePatientsCountryMode_4_5( user, callback ) {
            Y.log( `migratePatientsCountryMode_4_5: Starting migration for tenant: ${user.tenantId}`, "info", NAME );
            let err, result, patientModel;

            // 1. Get the 'patient' collection DB model --------------------------------------------------------------------
            [err, patientModel] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel(
                        user,
                        'patient',
                        true,
                        ( err, result ) => err ? reject( err ) : resolve( result )
                    );
                } )
            );

            if( err ) {
                Y.log( `migratePatientsCountryMode_4_5: Error getting patient collection model. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !patientModel ) {
                Y.log( `migratePatientsCountryMode_4_5: Failed to fetch patient collection model`, "error", NAME );
                return callback( `migratePatientsCountryMode_4_5: Failed to fetch patient collection model` );
            }

            // 2. Make sure the countryMode field is set on all patients ---------------------------------------------------
            [err, result] = await formatPromiseResult(
                patientModel.mongoose.update(
                    {countryMode: {$exists: false}},
                    {$set: {countryMode: ['D']}},
                    {multi: true}
                )
            );

            if( err ) {
                Y.log( `migratePatientsCountryMode_4_5: Error updating patients. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `migratePatientsCountryMode_4_5: Successfully migrated ${result && result.nModified} patients for tenant: ${user.tenantId}`, "info", NAME );

            return callback();
        }

        /**
         * This is to add a default ['D'] countryMode to existing physicians
         *
         * @param {Object} user
         * @param {Function} callback
         * @return {Promise}
         */
        async function migrateEmployeesCountryMode_4_5( user, callback ) {
            Y.log( `migrateEmployeesCountryMode_4_5: Starting migration for tenant: ${user.tenantId}`, "info", NAME );
            let err, result, employeeModel;

            // 1. Get the 'employee' collection DB model -------------------------------------------------------------------
            [err, employeeModel] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel(
                        user,
                        'employee',
                        true,
                        ( err, result ) => err ? reject( err ) : resolve( result )
                    );
                } )
            );

            if( err ) {
                Y.log( `migrateEmployeesCountryMode_4_5: Error getting employee collection model. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !employeeModel ) {
                Y.log( `migrateEmployeesCountryMode_4_5: Failed to fetch employee collection model`, "error", NAME );
                return callback( `migrateEmployeesCountryMode_4_5: Failed to fetch employee collection model` );
            }

            // 2. Make sure the countryMode field is set on all physicians -------------------------------------------------
            [err, result] = await formatPromiseResult(
                employeeModel.mongoose.update(
                    {
                        countryMode: {$exists: false}
                    },
                    {$set: {countryMode: ['D']}},
                    {multi: true}
                )
            );

            if( err ) {
                Y.log( `migrateEmployeesCountryMode_4_5: Error updating physicians. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `migrateEmployeesCountryMode_4_5: Successfully migrated ${result && result.nModified} physicians for tenant: ${user.tenantId}`, "info", NAME );

            return callback();
        }

        /**
         * This is to add a default ['D'] countryMode to existing companies
         *
         * @param {Object} user
         * @param {Function} callback
         * @return {Promise}
         */
        async function migrateCompaniesCountryMode_4_5( user, callback ) {
            Y.log( `migrateCompaniesCountryMode_4_5: Starting migration for tenant: ${user.tenantId}`, "info", NAME );
            let err, result, companyModel;

            // 1. Get the 'company' collection DB model --------------------------------------------------------------------
            [err, companyModel] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel(
                        user,
                        'company',
                        true,
                        ( err, result ) => err ? reject( err ) : resolve( result )
                    );
                } )
            );

            if( err ) {
                Y.log( `migrateCompaniesCountryMode_4_5: Error getting company collection model. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !companyModel ) {
                Y.log( `migrateCompaniesCountryMode_4_5: Failed to fetch company collection model`, "error", NAME );
                return callback( `migrateCompaniesCountryMode_4_5: Failed to fetch company collection model` );
            }

            // 2. Make sure the countryMode field is set on all companies --------------------------------------------------
            [err, result] = await formatPromiseResult(
                companyModel.mongoose.update(
                    {countryMode: {$exists: false}},
                    {$set: {countryMode: ['D']}},
                    {multi: true}
                )
            );

            if( err ) {
                Y.log( `migrateCompaniesCountryMode_4_5: Error updating companies. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            // 3. Make sure the countryMode field is set on all tenants for a given company --------------------------------
            [err] = await formatPromiseResult(
                companyModel.mongoose.update(
                    {'tenants.countryMode': {$exists: false}},
                    {$set: {"tenants.$[elem].countryMode": ['D']}},
                    {
                        arrayFilters: [{"elem.countryMode": {$exists: false}}],
                        multi: true
                    }
                )
            );

            if( err ) {
                Y.log( `migrateCompaniesCountryMode_4_5: Error updating companies. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `migrateCompaniesCountryMode_4_5: Successfully migrated ${result && result.nModified} companies for tenant: ${user.tenantId}`, "info", NAME );

            return callback();
        }

        /**
         * This is to add a default ['D'] countryMode to existing locations
         *
         * @param {Object} user
         * @param {Function} callback
         * @return {Promise}
         */
        async function migrateLocationsCountryMode_4_5( user, callback ) {
            Y.log( `migrateLocationsCountryMode_4_5: Starting migration for tenant: ${user.tenantId}`, "info", NAME );
            let err, result, locationModel;

            // 1. Get the 'location' collection DB model --------------------------------------------------------------------
            [err, locationModel] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel(
                        user,
                        'location',
                        true,
                        ( err, result ) => err ? reject( err ) : resolve( result )
                    );
                } )
            );

            if( err ) {
                Y.log( `migrateLocationsCountryMode_4_5: Error getting location collection model. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !locationModel ) {
                Y.log( `migrateLocationsCountryMode_4_5: Failed to fetch location collection model`, "error", NAME );
                return callback( `migrateLocationsCountryMode_4_5: Failed to fetch location collection model` );
            }

            // 2. Make sure the countryMode field is set on all locations --------------------------------------------------
            [err, result] = await formatPromiseResult(
                locationModel.mongoose.update(
                    {countryMode: {$exists: false}},
                    {$set: {countryMode: ['D']}},
                    {multi: true}
                )
            );

            if( err ) {
                Y.log( `migrateLocationsCountryMode_4_5: Error updating locations. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `migrateLocationsCountryMode_4_5: Successfully migrated ${result && result.nModified} locations for tenant: ${user.tenantId}`, "info", NAME );

            return callback();
        }

        /**
         * This is to add TARMED tax point values to invoice configurations
         *
         * @param {Object} user
         * @param {Function} callback
         * @return {Promise}
         */
        async function migrateTarmedTaxPointValues_4_5( user, callback ) {
            Y.log( `migrateTarmedTaxPointValues_4_5: Starting migration for tenant: ${user.tenantId}`, "info", NAME );
            let err, invoiceConfigurationModel;
            const defaultInvoiceConfigurationId = Y.doccirrus.schemas.invoiceconfiguration.getDefaultData()._id;

            // 1. Get the 'invoiceconfiguration' collection DB model -------------------------------------------------------
            [err, invoiceConfigurationModel] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel(
                        user,
                        'invoiceconfiguration',
                        true,
                        ( err, result ) => err ? reject( err ) : resolve( result )
                    );
                } )
            );

            if( err ) {
                Y.log( `migrateTarmedTaxPointValues_4_5: Error getting invoiceconfiguration collection model. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !invoiceConfigurationModel ) {
                Y.log( `migrateTarmedTaxPointValues_4_5: Failed to fetch invoiceconfiguration collection model`, "error", NAME );
                return callback( `migrateTarmedTaxPointValues_4_5: Failed to fetch invoiceconfiguration collection model` );
            }

            // 2. Import the tarmned tax point values --===============-----------------------------------------------------
            const tarmedTaxPointValues = require( '../mojits/InvoiceMojit/CountryConfiguration/CH/tarmed-tax-point-values/tarmedTaxPointValues.js' );

            // 3. Make sure the tarmed tax point values are set  -----------------------------------------------------------
            [err] = await formatPromiseResult(
                invoiceConfigurationModel.mongoose.update(
                    {
                        _id: defaultInvoiceConfigurationId,
                        tarmedTaxPointValues: {$exists: false}
                    },
                    {$set: {tarmedTaxPointValues}}
                )
            );

            if( err ) {
                Y.log( `migrateTarmedTaxPointValues_4_5: Error updating invoice configurations. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `migrateTarmedTaxPointValues_4_5: Successfully migrated invoice configurations for tenant: ${user.tenantId}`, "info", NAME );

            return callback();
        }

        async function migrateTaxPointValues_4_9( user, callback ) {
            Y.log( `migrateTaxPointValues_4_9: Starting migration for tenant: ${user.tenantId}`, "info", NAME );
            let err, invoiceConfigurationModel;
            const defaultInvoiceConfigurationId = Y.doccirrus.schemas.invoiceconfiguration.getDefaultData()._id;

            // 1. Get the 'invoiceconfiguration' collection DB model -------------------------------------------------------
            [err, invoiceConfigurationModel] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel(
                        user,
                        'invoiceconfiguration',
                        true,
                        ( err, result ) => err ? reject( err ) : resolve( result )
                    );
                } )
            );

            if( err ) {
                Y.log( `migrateTaxPointValues_4_9: Error getting invoiceconfiguration collection model. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !invoiceConfigurationModel ) {
                Y.log( `migrateTaxPointValues_4_9: Failed to fetch invoiceconfiguration collection model`, "error", NAME );
                return callback( `migrateTaxPointValues_4_9: Failed to fetch invoiceconfiguration collection model` );
            }
            // 2. Import the tarmned tax point values --===============-----------------------------------------------------
            const tarmedTaxPointValues = require( '../mojits/InvoiceMojit/CountryConfiguration/CH/tarmed-tax-point-values/tarmedTaxPointValues.js' );
            // 3. Make sure the tarmed tax point values are set  -----------------------------------------------------------
            [err] = await formatPromiseResult(
                invoiceConfigurationModel.mongoose.update(
                    {
                        _id: defaultInvoiceConfigurationId
                    },
                    {$set: {tarmedTaxPointValues}}
                )
            );

            if( err ) {
                Y.log( `migrateTaxPointValues_4_9: Error updating invoice configurations. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `migrateTaxPointValues_4_9: Successfully migrated invoice configurations for tenant: ${user.tenantId}`, "info", NAME );

            return callback();
        }

        /**
         * Modify title for deliverysettings collection to gkv_deliverysettings.
         * @param {Object} user
         * @param {Function} callback
         * @returns {Promise}
         */
        async function migrateDeliverysettingsToGKVDeliverySettings_4_6( user, callback ) {
            Y.log( `migrateDeliverysettingsToGKVDeliverySettings_4_6 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            const getModelProm = util.promisify( Y.doccirrus.mongodb.getModel ),
                model = 'deliverysettings';
            let err,
                deliverySettingsModel;

            [err, deliverySettingsModel] = await formatPromiseResult( getModelProm( user, model, true ) );
            if( err ) {
                Y.log( `migrateDeliverysettingsToGKVDeliverySettings_4_6: error while getting collection model [${model}]. Error ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err] = await formatPromiseResult( deliverySettingsModel.mongoose.collection.rename( 'gkv_deliverysettings' ) );
            if( err ) {
                Y.log( `migrateDeliverysettingsToGKVDeliverySettings_4_6: error during renaming collection to [gkv_deliverysettings]. Error ${err.stack || err}`, 'error', NAME );
            }
            Y.log( `migrateDeliverysettingsToGKVDeliverySettings_4_6: done, collection [${model}] was renamed to [gkv_deliverysettings]`, 'debug', NAME );
            return callback();
        }

        function addMissingFormVersions_4_5( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.addMissingFormVersions( user, true, callback );
        }

        function correctDocumentsInSequences_4_5( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.correctDocumentsInSequences( user, true, callback );
        }

        async function migrateMediaImportErrorField_4_5( user, callback ) {

            if( Y.doccirrus.auth.isVPRC() && user.tenantId === '0' ) {
                return callback();
            }

            let
                err,
                result;

            Y.log( `migrateMediaImportErrorField_4_5: Migrating 'mediaImportError' in activity collection for tenant: ${user.tenantId}`, 'info', NAME );

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {
                        'userContent': /BRIEFE/,
                        'patImportId': {$exists: true},
                        'mediaImportError': {$exists: false}
                    },
                    data: {
                        $set: {mediaImportError: false}
                    },
                    options: {
                        multi: true
                    }
                } )
            );

            if( err ) {
                Y.log( `migrateMediaImportErrorField_4_5: Migrating 'mediaImportError' in activity collection for tenant: ${user.tenantId}. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `migrateMediaImportErrorField_4_5: Migrated 'mediaImportError' in activity collection for tenant: ${user.tenantId}, No of activities updated: ${JSON.stringify( result.result )}`, "info", NAME );
            callback();
        }

        async function unsetGenerateAndPrintButtonOnInvoiceConfiguration_4_5( user, callback ) {

            Y.log( `unsetGenerateAndPrintButtonOnInvoiceConfiguration_4_5 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );
            let err,
                result;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'invoiceconfiguration',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {},
                    data: {
                        $unset: {
                            generateAndPrintButton: 1
                        }
                    },
                    options: {
                        multi: true
                    }
                } )
            );
            if( err ) {
                Y.log( `unsetGenerateAndPrintButtonOnInvoiceConfiguration_4_5: error unset generateAndPrintButton ${err.stack || err}`, 'warn', NAME );
            }
            if( result && result.result && result.result.nModified ) {
                Y.log( 'unsetGenerateAndPrintButtonOnInvoiceConfiguration_4_5: unset generateAndPrintButton', 'debug', NAME );
            }

            Y.log( `unsetGenerateAndPrintButtonOnInvoiceConfiguration_4_5: completed migration for tenant: ${user.tenantId}`, 'info', NAME );
            callback();
        }

        /**
         * @Ticket EXTMOJ-2180
         *
         * This migration fixes group members appointments created from master in repetition serie.
         * It searches such appointments and deletes redundant fields - linkSeries and dtstart.
         *
         * @param {Object} user
         * @param {Function} callback
         * @return {Promise<*>}
         */
        async function fixGroupedRepetitionMembers_4_5( user, callback ) {
            if( Y.doccirrus.auth.isVPRC() && user.tenantId === '0' ) {
                return callback();
            }

            let
                err,
                result;

            Y.log( `fixGroupedRepetitionMembers_4_5: Migrating group member in schedule collection for tenant: ${user.tenantId}`, 'info', NAME );

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'schedule',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {
                        'groupId': {$exists: true},
                        $or: [
                            {'linkSeries': {$exists: true}},
                            {'repetition': {$ne: 'NONE'}}
                        ]
                    },
                    data: {
                        $unset: {linkSeries: 1, dtstart: 1, until: 1},
                        $set: {repetition: 'NONE', byweekday: []}
                    },
                    options: {
                        multi: true
                    }
                } )
            );

            if( err ) {
                Y.log( `fixGroupedRepetitionMembers_4_5: Migrating group members in schedule collection for tenant: ${user.tenantId}. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `fixGroupedRepetitionMembers_4_5: Migrated group members in schedule collection for tenant: ${user.tenantId}, % of schedules updated: ${JSON.stringify( result.result )}`, "info", NAME );
            callback();
        }

        async function setDefaultCountryToMyReports_4_6( user, callback ) {

            Y.log( `setDefaultCountryToMyReports_4_6 starting migration for tenant: ${user.tenantId}`, 'debug', NAME );

            let err;
            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'insight2',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {
                        'country': {$exists: false}
                    },
                    data: {
                        $set: {country: ['D']}
                    },
                    options: {
                        multi: true
                    }
                } )
            );

            if( err ) {
                Y.log( `setDefaultCountryToMyReports_4_6: Migrating set default country for insight2 collection for tenant: ${user.tenantId}. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'insight2',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {
                        'countryMode': {$exists: false}
                    },
                    data: {
                        $set: {countryMode: ['D']}
                    },
                    options: {
                        multi: true
                    }
                } )
            );

            if( err ) {
                Y.log( `setDefaultCountryToMyReports_4_6: Migrating set default countryMode for insight2 collection for tenant: ${user.tenantId}. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `setDefaultCountryToMyReports_4_6: Migrated insight2 collection for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        /**
         * Set a value for new field doctorsAmount in the licenseScope
         * for each company and its inner tenants (if they exist) regarding its baseSystemLevel value
         * Applied for DCPRC/VPRC
         *
         * @param {Object} user
         * @param {Function} callback
         * @return {Promise}
         */
        async function migrateCompaniesDoctorsAmount_4_6( user, callback ) {

            //company collection has documents in 0 db of DCPRC/VPRC only
            if( '0' !== user.tenantId ) {
                return callback();
            }

            Y.log( `migrateCompaniesDoctorsAmount_4_6: Starting migration for tenant: ${user.tenantId}`, "info", NAME );
            let err, companyModel, companies, companiesWithTenants;

            [err, companyModel] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    Y.doccirrus.mongodb.getModel(
                        user,
                        'company',
                        true,
                        ( err, result ) => err ? reject( err ) : resolve( result )
                    );
                } )
            );

            if( err ) {
                Y.log( `migrateCompaniesDoctorsAmount_4_6: Error getting company collection model. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( !companyModel ) {
                Y.log( `migrateCompaniesDoctorsAmount_4_6: Failed to fetch company collection model`, "error", NAME );
                return callback( `migrateCompaniesDoctorsAmount_4_6: Failed to fetch company collection model` );
            }

            [err, companies] = await formatPromiseResult(
                companyModel.mongoose.collection.find(
                    {"licenseScope.doctorsAmount": {$exists: false}} ).toArray()
            );

            if( err ) {
                Y.log( `migrateCompaniesDoctorsAmount_4_6: Error getting companies to migrate. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            for( let company of companies ) {
                let baseSystemLevel = company.licenseScope && company.licenseScope[0] && company.licenseScope[0].baseSystemLevel ||
                                      Y.doccirrus.schemas.settings.baseSystemLevels.ENTRY,
                    amount = Y.doccirrus.commonutils.baseSystemLevelToDoctorsAmount( baseSystemLevel );

                [err] = await formatPromiseResult(
                    companyModel.mongoose.update(
                        {_id: company._id},
                        {$set: {"licenseScope.0.doctorsAmount": amount}}
                    )
                );

                if( err ) {
                    Y.log( `migrateCompaniesDoctorsAmount_4_6: Error updating companies. Error:\n${err.stack || err}`, "error", NAME );
                    return callback( err );
                }
            }

            [err, companiesWithTenants] = await formatPromiseResult(
                companyModel.mongoose.collection.find(
                    {
                        tenants: {
                            $exists: true, $ne: [],
                            $elemMatch: {"licenseScope.doctorsAmount": {$exists: false}}
                        }
                    } ).toArray()
            );

            if( err ) {
                Y.log( `migrateCompaniesDoctorsAmount_4_6: Error getting companies with tenants to migrate. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            if( (!companiesWithTenants || !companiesWithTenants[0]) && (!companies || !companies[0]) ) {
                Y.log( `migrateCompaniesDoctorsAmount_4_6: There are no companies to migrate.`, "info", NAME );
                return callback();
            }

            for( let company of companiesWithTenants ) {
                for( let tenant of company.tenants ) {
                    if( tenant.licenseScope && tenant.licenseScope[0] && !tenant.licenseScope[0].doctorsAmount ) {
                        let baseSystemLevel = tenant.licenseScope && tenant.licenseScope[0] && tenant.licenseScope[0].baseSystemLevel ||
                                              Y.doccirrus.schemas.settings.baseSystemLevels.ENTRY,
                            amount = Y.doccirrus.commonutils.baseSystemLevelToDoctorsAmount( baseSystemLevel );

                        [err] = await formatPromiseResult(
                            companyModel.mongoose.update(
                                {_id: company._id},
                                {$set: {"tenants.$[elem].licenseScope.0.doctorsAmount": amount}},
                                {
                                    arrayFilters: [{"elem._id": tenant._id}]
                                }
                            )
                        );
                        if( err ) {
                            Y.log( `migrateCompaniesDoctorsAmount_4_6: Error updating tenants in companies. Error:\n${err.stack || err}`, "error", NAME );
                            return callback( err );
                        }
                    }
                }
            }

            if( err ) {
                Y.log( `migrateCompaniesDoctorsAmount_4_6: Error updating companies. Error:\n${err.stack || err}`, "error", NAME );
                return callback( err );
            }
            Y.log( `migrateCompaniesDoctorsAmount_4_6: Successfully migrated companies for tenant: ${user.tenantId}`, "info", NAME );

            return callback();
        }

        function addInsuranceNamesToInvoices_4_6( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.addInsuranceNamesToInvoices( user, true, callback );
        }

        function migrateSetSimplifiedLabdata_4_7( user, callback ) {
            Y.log( `migrateSetSimplifiedLabdata_4_7, Migrating LABDATA activities to set simplified labEntries property, tenant: ${user.tenantId}`, 'info', NAME );
            Y.doccirrus.inCaseUtils.migrationhelper.updateLabEntries( user, true, true, onAllUpdated );

            function onAllUpdated( err ) {
                if( err ) {
                    Y.log( `Problem in migrateSetSimplifiedLabdata_4_7 on tenant ${user.tenantId}: ${JSON.stringify( err )}`, 'warn', NAME );
                    return callback( err );
                }
                Y.log( `migrateSetSimplifiedLabdata_4_7, Completed regeneration of labEntries for LABDATA activities on tenant ${user.tenantId}.`, 'info', NAME );
                callback( null );
            }
        }

        /**
         *  Add latest LABDATA entries to patient objects to display in patientGadgetLatestLabData (EXTMOJ-2272)
         *  @param {Object} user
         *  @param {Function} callback
         */

        function migrateSetLatestLabData_4_7( user, callback ) {
            Y.log( 'Starting migration to set latestLabData on patient obejcts, tenant: ' + user.tenantId, 'debug', NAME );
            Y.doccirrus.inCaseUtils.migrationhelper.setLatestLabDataOnPatients( user, true, onMigrationComplete );

            function onMigrationComplete( err ) {
                if( err ) {
                    Y.log( 'Error during setLatestLabDataOnPatients migration: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                Y.log( 'Completed migration to set latestLabData on patient objects, ternant: ' + user.tenantId, 'debug', NAME );
                callback( null );
            }
        }

        async function migrateSetFormFolderIds_4_7( user, callback ) {
            let
                err;

            [err] = await formatPromiseResult( Y.doccirrus.forms.migrationhelper.setFormFolderIds( user, true ) );

            if( err ) {
                Y.log( `Problem running migration to set form folder ids tenant ${user.tenantId}: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            //  re-run the dependencies migration to add the formfolder to list of objects to export
            [err] = await formatPromiseResult( Y.doccirrus.forms.migrationhelper.addFormDeps( user ) );

            if( err ) {
                Y.log( `Problem running migration to set form folder ids on tenant ${user.tenantId}: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            Y.log( `migrateSetFormFolderIds_4_7: successfully migrated form folder ids on tenant ${user.tenantId}`, 'info', NAME );

            callback();
        }

        async function migrateSetFormFolderLicenses_4_8( user, callback ) {
            let
                err;

            [err] = await formatPromiseResult( Y.doccirrus.forms.migrationhelper.setFormFolderLicence( user, true ) );

            if( err ) {
                Y.log( `Problem running migration to set form folder licence ids tenant ${user.tenantId}: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            Y.log( `migrateSetFormFolderIds_4_8: successfully migrated form folders licence on tenant ${user.tenantId}`, 'info', NAME );

            callback();
        }

        async function migrateSetFormFolderCountryMode_4_8( user, callback ) {
            let
                err;

            [err] = await formatPromiseResult( Y.doccirrus.forms.migrationhelper.setFormFolderCountryMode( user, true ) );

            if( err ) {
                Y.log( `Problem running migration to set form folder countryMode ids tenant ${user.tenantId}: ${err.stack || err}`, 'warn', NAME );
                callback( err );
                return;
            }

            Y.log( `migrateSetFormFolderCountryMode_4_8: successfully migrated form folders countyMode on tenant ${user.tenantId}`, 'info', NAME );

            callback();
        }

        async function migrateSetAppRegData_4_9( user, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `migrateSetAppRegData_4_9: migrating AppReg on tenant ${user.tenantId}`, 'debug' );

            let err, result, appregModel;

            [err, appregModel] = await formatPromiseResult( getModelProm( user, 'appreg', true ) );

            if( err ) {
                Y.log( `migrateSetAppRegData_4_9: Error while getting 'appreg' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err, result] = await formatPromiseResult(
                appregModel.mongoose.collection.update( {}, {
                    $set: {
                        appHostType: 'LOCAL'
                    }
                }, {multi: true} )
            );

            if( err ) {
                Y.log( `migrateSetAppRegData_4_9: Error while setting default value of appHostType on AppReg. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `migrateSetAppRegData_4_9: Successfully ended migration for tenant: ${user.tenantId}: ${JSON.stringify( result )}`, "info", NAME );
            return callback();
        }

        async function migrateSetAppRegData_4_10( user, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `migrateSetAppRegData_4_10: migrating AppReg on tenant ${user.tenantId}`, 'debug' );

            let err, result, appregModel;

            [err, appregModel] = await formatPromiseResult( getModelProm( user, 'appreg', true ) );

            if( err ) {
                Y.log( `migrateSetAppRegData_4_10: Error while getting 'appreg' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err, result] = await formatPromiseResult(
                appregModel.mongoose.collection.update( {}, {
                    $set: {
                        webHooksConfiguration: []
                    }
                }, {multi: true} )
            );

            if( err ) {
                Y.log( `migrateSetAppRegData_4_10: Error while setting default value of appHostType on AppReg. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `migrateSetAppRegData_4_10: Successfully ended migration for tenant: ${user.tenantId}: ${JSON.stringify( result )}`, "info", NAME );
            return callback();
        }

        async function migrateSetAppRegData_4_11( user, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `migrateSetAppRegData_4_11: migrating AppReg on tenant ${user.tenantId}`, 'debug' );

            let err, result, appregModel;

            [err, appregModel] = await formatPromiseResult( getModelProm( user, 'appreg', true ) );

            if( err ) {
                Y.log( `migrateSetAppRegData_4_11: Error while getting 'appreg' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err, result] = await formatPromiseResult(
                appregModel.mongoose.collection.update( {}, {
                    $set: {
                        inSuiteToken: '',
                        solToken: '',
                        description: ''
                    }
                }, {multi: true} )
            );

            if( err ) {
                Y.log( `migrateSetAppRegData_4_11: Error while setting default values of inSuiteToken and solToken on AppReg. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `migrateSetAppRegData_4_11: Successfully ended migration for tenant: ${user.tenantId}: ${JSON.stringify( result )}`, "info", NAME );
            return callback();
        }

        async function migrateCompanyData_4_11( user, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `migrateCompanyData_4_11: migrating company on tenant ${user.tenantId}`, 'debug' );

            let err, result, companyModel;

            [err, companyModel] = await formatPromiseResult( getModelProm( user, 'company', true ) );

            if( err ) {
                Y.log( `migrateCompanyData_4_11: Error while getting 'company' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err, result] = await formatPromiseResult(
                companyModel.mongoose.collection.update( {}, {
                    $set: {
                        appsMetaData: []
                    }
                }, {multi: true} )
            );

            if( err ) {
                Y.log( `migrateCompanyData_4_11: Error while setting default value of appsMetaData on company. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `migrateCompanyData_4_11: Successfully ended migration for tenant: ${user.tenantId}: ${JSON.stringify( result )}`, "info", NAME );
            return callback();
        }

        async function migrateMedLabDataCategories_4_10( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.migrateMedLabDataCategories( user, true, callback );
        }

        /**
         * The badge system in the CaseFileView has been improved.
         * Before, specific properties of activities were rendered by adding a badge to the activity.content via
         * as customer-specific tag (TAG::) prepended to the content. E.g. "DD::" for continuous diagnosis.
         * This led to the side-effects that these tags appeared all over the software.
         * However, the new types of badges, are rendered dynamically, and are not written into the content.
         * To avoid double-tagging, the old tags have to be removed from the front of the content.
         *
         * This is the case for actType=DIAGNOSIS and actType=MEDICATION,
         * as this was the only place, where it played a role.
         */
        async function migrateActivityContentTagsToBadgeSystem_4_9( user, callback ) {
            const
                getModel = util.promisify( Y.doccirrus.mongodb.getModel );
            let
                err,

                // two types of activities are affected: diagnosis, and medication
                ACUTE_DOK = /^dok\.::\s?/,
                CONT_DIAGNOSES = /^DD::\s?/,
                CONT_DIAGNOSES_DOK = /^DD\.d::\s?/,
                A_CONT_DIAGNOSES = /^ADD::\s?/,
                A_CONT_DIAGNOSES_DOK = /^ADD\.d::\s?/,
                CONTINUOUS_MEDICATION = /^DM::\s?/,
                SAMPLE_MEDICATION = /^MM::\s?/,
                queryObjects = [

                    // diagnoses
                    {
                        query: {
                            actType: 'DIAGNOSIS',
                            diagnosisType: 'ACUTE',
                            diagnosisTreatmentRelevance: 'DOKUMENTATIV',
                            $or: [
                                {content: {$regex: ACUTE_DOK}},
                                {userContent: {$regex: ACUTE_DOK}}
                            ]
                        },
                        replaceRegex: ACUTE_DOK
                    },
                    {
                        query: {
                            actType: 'DIAGNOSIS',
                            diagnosisType: 'ANAMNESTIC',
                            diagnosisTreatmentRelevance: {$ne: 'DOKUMENTATIV'},
                            $or: [
                                {content: {$regex: A_CONT_DIAGNOSES}},
                                {userContent: {$regex: A_CONT_DIAGNOSES}}
                            ]
                        },
                        replaceRegex: A_CONT_DIAGNOSES
                    },
                    {
                        query: {
                            actType: 'DIAGNOSIS',
                            diagnosisType: 'ANAMNESTIC',
                            diagnosisTreatmentRelevance: 'DOKUMENTATIV',
                            $or: [
                                {content: {$regex: A_CONT_DIAGNOSES_DOK}},
                                {userContent: {$regex: A_CONT_DIAGNOSES_DOK}}
                            ]
                        },
                        replaceRegex: A_CONT_DIAGNOSES_DOK
                    },
                    {
                        query: {
                            actType: 'DIAGNOSIS',
                            diagnosisType: 'CONTINUOUS',
                            diagnosisTreatmentRelevance: {$ne: 'DOKUMENTATIV'},
                            $or: [
                                {content: {$regex: CONT_DIAGNOSES}},
                                {userContent: {$regex: CONT_DIAGNOSES}}
                            ]
                        },
                        replaceRegex: CONT_DIAGNOSES
                    },
                    {
                        query: {
                            actType: 'DIAGNOSIS',
                            diagnosisType: 'CONTINUOUS',
                            diagnosisTreatmentRelevance: 'DOKUMENTATIV',
                            $or: [
                                {content: {$regex: CONT_DIAGNOSES_DOK}},
                                {userContent: {$regex: CONT_DIAGNOSES_DOK}}
                            ]
                        },
                        replaceRegex: CONT_DIAGNOSES_DOK
                    },

                    // medications
                    {
                        query: {
                            actType: 'MEDICATION',
                            phContinuousMed: true,
                            $or: [
                                {content: {$regex: CONTINUOUS_MEDICATION}},
                                {userContent: {$regex: CONTINUOUS_MEDICATION}},
                                {phNLabel: {$regex: CONTINUOUS_MEDICATION}}
                            ]
                        },
                        replaceRegex: CONTINUOUS_MEDICATION
                    },
                    {
                        query: {
                            actType: 'MEDICATION',
                            phSampleMed: true,
                            $or: [
                                {content: {$regex: SAMPLE_MEDICATION}},
                                {userContent: {$regex: SAMPLE_MEDICATION}},
                                {phNLabel: {$regex: SAMPLE_MEDICATION}}
                            ]
                        },
                        replaceRegex: SAMPLE_MEDICATION
                    }
                ],
                queryObject,
                activityCursor,
                activityModel,
                activity,
                setObject,
                activityTypeCounter = {};

            Y.log( `migrateActivityContentTagsToBadgeSystem_4_9: Starting migration for tenant: ${user.tenantId}`, "info", NAME );

            [err, activityModel] = await formatPromiseResult( getModel( user, 'activity', true ) );
            if( err ) {
                Y.log( `migrateActivityContentTagsToBadgeSystem_4_9: Error getting activity model. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            // no query all matching activities, and replace their tags
            for( queryObject of queryObjects ) {
                activityCursor = activityModel.mongoose.find(
                    queryObject.query,
                    {_id: 1, actType: 1, content: 1, userContent: 1, phNLabel: 1},
                    {lean: true}
                ).cursor().addCursorFlag( 'noCursorTimeout', true );

                activity = await activityCursor.next();
                while( activity ) {
                    if( activity && activity._id ) {

                        // strip the tags from the content, and the userContent
                        setObject = {
                            content: activity.content ? activity.content.replace( queryObject.replaceRegex, "" ) : activity.content,
                            userContent: activity.userContent ? activity.userContent.replace( queryObject.replaceRegex, "" ) : activity.userContent
                        };

                        // medication specific replacement values
                        if( activity.actType === "MEDICATION" && activity.phNLabel ) {
                            setObject.phNLabel = activity.phNLabel.replace( queryObject.replaceRegex, "" );
                        }

                        // save the activity content
                        [err] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'activity',
                                action: 'update',
                                migrate: true,
                                query: {
                                    _id: activity._id
                                },
                                data: {
                                    $set: setObject
                                }
                            } )
                        );

                        if( err ) {
                            Y.log( `migrateActivityContentTagsToBadgeSystem_4_9: Error while updating activity with ID: ${activity._id}. Error: ${err.stack || err}`, "error", NAME );
                        }

                        // statistics counter
                        if( !activityTypeCounter.hasOwnProperty( activity.actType ) ) {
                            activityTypeCounter[activity.actType] = 0;
                        }
                        activityTypeCounter[activity.actType] += 1;
                    }

                    activity = await activityCursor.next();
                }
            }

            // echo statistics
            for( let actType in activityTypeCounter ) {
                if( activityTypeCounter.hasOwnProperty( actType ) ) {
                    Y.log( `migrateActivityContentTagsToBadgeSystem_4_9: ${actType} => ${activityTypeCounter[actType]}`, "info", NAME );
                }
            }

            Y.log( `migrateActivityContentTagsToBadgeSystem_4_9: Successfully completed migration for tenant: ${user.tenantId}`, "info", NAME );
            callback();
        }

        async function migrateDynamsoftProductKey_4_9( user, callback ) {
            const ObjectId = require( 'mongoose' ).Types.ObjectId;
            Y.log( `migrateDynamsoftProductKey_4_9: Attempt to update dynamsoft settings on tenant ${user.tenantId}`, 'info', NAME );
            let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'settings',
                migrate: true,
                action: 'mongoUpdate',
                query: {
                    'dynamsoft.useWebTwain': true,
                    'dynamsoft.productKey': '9601DB57494555E7F89B826AB63176456C6A11A5E5A279554236AB5FA051B829BB6DC482BE8044B0C0E7ED48D77C544C5C299951DD607D22CE97ACE6EF1A96902E56D23D63A1DEB64F2604ACAB9796C435D586C29ED3E98CF019CC184E3802046E53D7D3C9BB8E055C76548897A4DB293C3E196CCD2A151B87EF808D522AE9691CEE07A3CC16A0'
                },
                data: {
                    $set: {
                        dynamsoft: [
                            {
                                "_id": ObjectId( "000000000000000000000001" ),
                                "productKey": "f0068WQAAAG88xXgUE60ER4ZMrwNrFNxE+gCaspBSMp98KXrXBbDXAlwBXqdqtKyEWgcuGNmV9KtLb3Nke4j9JFuVT8I4RgI=",
                                "useWebTwain": true
                            }
                        ]
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migrateDynamsoftProductKey_4_9: Error while updating dynamsoft settings on tenant ${user.tenantId}. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            Y.log( `migrateDynamsoftProductKey_4_9: Updated dynamsoft settings on tenant ${user.tenantId}: ${JSON.stringify( results )}`, 'info', NAME );
            callback();
        }

        async function addIsDeceasedAndInactiveFlag_4_9( user, callback ) {

            if( Y.doccirrus.auth.isVPRC() && user.tenantId === '0' ) {
                return callback();
            }

            const
                getModel = require( 'util' ).promisify( Y.doccirrus.mongodb.getModel );

            let
                err,
                result,
                patient,
                patientModel,
                patientCursor;

            Y.log( `addIsDeceasedAndInactiveFlag_4_9: migrating insuranceStatus of imported patients for tenant: ${user.tenantId}`, 'info', NAME );

            // 1. Instantiate the 'patient 'model
            [err, patientModel] = await formatPromiseResult( getModel( user, 'patient', true ) );

            if( err ) {
                Y.log( `addIsDeceasedAndInactiveFlag_4_9: Error while getting patient collection model, for tenant: ${user.tenantId}. Error: ${err.stack || err}`, "error", NAME );
                return callback( err );
            }

            // 2. Get Patient Stream
            try {

                patientCursor = patientModel.mongoose.find( {
                    dateOfDeath: {
                        $exists: true,
                        $ne: null
                    }
                }, {'dateOfDeath': 1} ).cursor();

                // Iterate patientCursor
                while( (patient = await patientCursor.next()) ) { // eslint-disable-line no-cond-assign

                    //3. Update patient only if dateOfDeath is present
                    if( patient && patient.dateOfDeath ) {

                        [err, {result = {}}] = await formatPromiseResult( patientModel.mongoose.collection.updateOne( {_id: patient._id}, {
                            $set: {
                                isDeceased: true,
                                inActive: false
                            }
                        } ) );

                        if( err ) {
                            Y.log( `addIsDeceasedAndInactiveFlag_4_9: Error occurred while updating patient: ${patient._id.toString()} with isDeceased & inActive flag, for tenant: ${user.tenantId}. Error: ${err.stack || err}`, "error", NAME );
                            return callback( err );
                        }

                        if( !result || !result.nModified || result.nModified !== 1 ) {
                            Y.log( `addIsDeceasedAndInactiveFlag_4_9: Failed to update the patient: '${patient._id.toString()}' with isDeceased & inActive flag, for tenant: ${user.tenantId}`, "error", NAME );
                            return callback( `addIsDeceasedAndInactiveFlag_4_9: Failed to update the patient: '${patient._id.toString()}' with isDeceased & inActive flag, for tenant: ${user.tenantId}` );
                        }
                        Y.log( `addIsDeceasedAndInactiveFlag_4_9: Successfully updated the patient: '${patient._id.toString()}' with isDeceased & inActive flag for tenant: ${user.tenantId}`, "debug", NAME );
                    }
                }

                Y.log( `addIsDeceasedAndInactiveFlag_4_9: Successfully completed adding isDeceased & inActive flag for tenant: ${user.tenantId}`, "info", NAME );

                return callback();

            } catch( error ) {
                Y.log( `addIsDeceasedAndInactiveFlag_4_9: Error occurred in migration for tenant: ${user.tenantId}. Error: ${error.stack || error}`, "error", NAME );
                return callback( error );
            }
        }

        async function migrateMedicationPlan_4_10( user, callback ) {
            if( !Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                return callback();
            }
            const
                _ = require( 'lodash' ),
                getModel = util.promisify( Y.doccirrus.mongodb.getModel );

            let [err, activityModel] = await formatPromiseResult( getModel( user, 'activity', true ) );

            if( err ) {
                Y.log( `migrateMedicationPlan_4_10: Error getting activity model on tenant ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            const activityCursor = activityModel.mongoose.find(
                {
                    actType: 'MEDICATIONPLAN'
                },
                {activities: 1},
                {lean: true}
            ).cursor().addCursorFlag( 'noCursorTimeout', true );

            let medicationPlan = await activityCursor.next();

            while( medicationPlan ) {
                let linkedActivities = [];
                if( medicationPlan.activities && medicationPlan.activities.length ) {
                    [err, linkedActivities] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        migrate: true,
                        query: {
                            _id: {$in: medicationPlan.activities}
                        }
                    } ) );

                    if( err ) {
                        Y.log( `migrateMedicationPlan_4_10: could not get linked of activities of MP ${medicationPlan._id} on tenant ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                }

                const medications = linkedActivities.filter( linkedActivity => {
                    if( linkedActivity.actType !== 'MEDICATION' ) {
                        return false;
                    }
                    linkedActivity.type = 'MEDICATION';
                    linkedActivity.medicationRef = linkedActivity._id.toString();
                    return true;
                } );

                let medicationPlanEntries = [];
                const groupedMedications = _.groupBy( medications.reverse(), 'phHeader' );

                // add ungroup first
                if( Array.isArray( groupedMedications[''] ) ) {
                    medicationPlanEntries = medicationPlanEntries.concat( groupedMedications[''] );
                }
                Object.keys( groupedMedications ).forEach( groupName => {
                    if( !groupName || !Array.isArray( groupedMedications[groupName] ) ) {
                        return;
                    }
                    medicationPlanEntries.push( {type: 'SUB_HEADING', subHeadingText: groupName} );
                    medicationPlanEntries = medicationPlanEntries.concat( groupedMedications[groupName] );
                } );

                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'mongoUpdate',
                        migrate: true,
                        query: {
                            _id: medicationPlan._id
                        },
                        data: {
                            $set: {
                                actType: 'KBVMEDICATIONPLAN',
                                __t: 'KBVMEDICATIONPLAN',
                                medicationPlanEntries
                            }
                        }
                    } )
                );

                if( err ) {
                    Y.log( `migrateMedicationPlan_4_10: could not update MP ${medicationPlan._id} on tenant ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                medicationPlan = await activityCursor.next();
            }

            callback();
        }

        async function migrateScheduleTitle_4_10( user, callback ) {

            Y.log( `migrateScheduleTitle_4_10: migrating company on tenant ${user.tenantId}`, 'debug' );

            let [err] = await formatPromiseResult( Y.doccirrus.utils.updateScheduleTitle( user, {}, true ) );
            if( err ) {
                Y.log( `migrateScheduleTitle_4_10. Error while updating schedules: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            Y.log( `migrateScheduleTitle_4_10: Successfully ended migration for tenant: ${user.tenantId}`, "info", NAME );
            return callback();
        }

        async function invalidateUpcomingEdmpDocs_4_10( user, callback ) {
            Y.log( `invalidateUpcomingEdmpDocs_4_10: migrating on tenant ${user.tenantId}`, 'debug' );
            const getModel = util.promisify( Y.doccirrus.mongodb.getModel );

            function invalidate( patientId ) {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.upcomingedmpdoc.invalidatePatient( {
                        user: user,
                        originalParams: {
                            patientId: patientId
                        },
                        callback: ( err, result ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result );
                            }
                        }
                    } );
                } );
            }

            let [err, patientModel] = await formatPromiseResult( getModel( user, 'patient', true ) );
            if( err ) {
                Y.log( `invalidateUpcomingEdmpDocs_4_10: Error getting patient model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            let patientCursor = patientModel.mongoose.find( {
                edmpCaseNo: {$ne: null}
            }, {
                _id: 1
            }, {lean: true} ).cursor().addCursorFlag( 'noCursorTimeout', true );

            let patient = await patientCursor.next();
            while( patient ) {
                [err] = await formatPromiseResult( invalidate( patient._id.toString() ) );
                if( err ) {
                    Y.log( `invalidateUpcomingEdmpDocs_4_10: Could not invalidate upcoming edocs of patient: ${patient._id.toString()} . Error: ${err.stack || err}`, 'error', NAME );
                }

                patient = await patientCursor.next();
            }

            Y.log( `invalidateUpcomingEdmpDocs_4_10: Successfully ended migration for tenant: ${user.tenantId}`, "info", NAME );
            return callback();
        }

        function addActTypeToAttachments_4_10( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.addActTypeToAttachments( user, true, callback );
        }

        async function migrateMedicationPlanActivitySettings_4_10( user, callback ) {
            if( Y.doccirrus.auth.isVPRC() && user.tenantId === '0' || !Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                callback();
                return;
            }

            const getModel = require( 'util' ).promisify( Y.doccirrus.mongodb.getModel );
            const ObjectId = require( 'mongoose' ).Types.ObjectId;
            const queryId = ObjectId( Y.doccirrus.schemas.activitysettings.getId() );

            Y.log( `migrateMedicationPlanActivitySettings_4_10: starting migration for tenant: ${user.tenantId} and Id ${queryId}`, 'info', NAME );

            let [err, activitySettingsModel] = await formatPromiseResult( getModel( user, 'activitysettings', true ) );

            if( err ) {
                Y.log( `migrateMedicationPlanActivitySettings_4_10: could not get activitySettingsModel: ${err.stack || err}`, 'error', NAME );
                callback( err );
            }

            let results;
            [err, results] = await formatPromiseResult( activitySettingsModel.mongoose.collection.update( {
                _id: queryId
            }, {
                $push: {
                    settings: {
                        _id: new ObjectId(),
                        "actType": "KBVMEDICATIONPLAN",
                        "color": "#ffffff",
                        "isVisible": true,
                        "functionality": "sd18",
                        "schein": false,
                        "userContent": "",
                        "useWYSWYG": false
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migrateMedicationPlanActivitySettings_4_10: for tenant: ${user.tenantId} could not push KBVMEDICATIONPLAN activity setting: ${err.stack || err}`, 'error', NAME );
                callback( err );
                return;
            }
            Y.log( `migrateMedicationPlanActivitySettings_4_10: for tenant: ${user.tenantId} pushed KBVMEDICATIONPLAN  activity setting: ${results}`, 'info', NAME );

            [err, results] = await formatPromiseResult( activitySettingsModel.mongoose.collection.update( {
                _id: queryId
            }, {
                $pull: {
                    settings: {
                        actType: 'MEDICATIONPLAN'
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migrateMedicationPlanActivitySettings_4_10: for tenant: ${user.tenantId} could not pull MEDICATIONPLAN activity setting: ${err.stack || err}`, 'error', NAME );
                callback( err );
                return;
            }
            Y.log( `migrateMedicationPlanActivitySettings_4_10: for tenant: ${user.tenantId} pulled MEDICATIONPLAN  activity setting: ${results}`, 'info', NAME );

            callback();
        }

        async function migrateMeddataFromIncaseConfiguration_4_10( user, callback ) {
            if( Y.doccirrus.auth.isVPRC() && user.tenantId === '0' ) {
                return callback();
            }

            Y.log( `migrateMeddataFromIncaseConfiguration_4_10: started migration on tenant ${user.tenantId}`, 'info', NAME );

            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'incaseconfiguration',
                    action: 'update',
                    query: {
                        _id: Y.doccirrus.schemas.incaseconfiguration.getDefaultData()._id,
                        allowCustomCodeFor: 'MEDDATA'
                    },
                    migrate: true,
                    data: {
                        $set: {allowCustomValueFor: ['MEDDATA']},
                        $pull: {allowCustomCodeFor: 'MEDDATA'}
                    }
                } )
            );
            if( err ) {
                Y.log( `migrateMeddataFromIncaseConfiguration_4_10: could not update 'MEDDATA' value: ${err} on tenant ${user.tenantId}`, 'error', NAME );
                return callback( err );
            }
            return callback();
        }

        async function migrateSalesStatusAndNormSize_4_11( user, callback ) {

            Y.log( `migrateSalesStatusAndNormSize_4_11: migrating catalogusages on tenant ${user.tenantId}`, 'info', NAME );

            const phSalesStatusAllowedValues = ["UNKNOWN", "DISCONTINUE", "OFFMARKET", "ONMARKET", "RECALL", "OFFTAKE"];
            const phNormSizeAllowedValues = ["UNKNOWN", "0", "1", "2", "3", "A", "K", "N"];
            const phSalesStatusQuery = {phSalesStatus: {$nin: phSalesStatusAllowedValues}};
            const phNormSizeQuery = {phNormSize: {$nin: phNormSizeAllowedValues}};
            const defaultValue = 'UNKNOWN';

            const updateModel = ( modelName, query, data ) => formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: modelName,
                action: 'update',
                query,
                migrate: true,
                data,
                options: {
                    multi: true
                }
            } ) );

            // Update catalogusages

            Y.log( `migrateSalesStatusAndNormSize_4_11: update catalogusage -> phSalesStatus on tenant ${user.tenantId}`, 'info', NAME );
            let [err, results] = await updateModel( 'catalogusage', {
                'seqId.actType': 'MEDICATION',
                ...phSalesStatusQuery
            }, {phSalesStatus: defaultValue} );
            if( err ) {
                Y.log( `migrateSalesStatusAndNormSize_4_11. Error while updating catalogusage -> phSalesStatus on tenant ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            Y.log( `migrateSalesStatusAndNormSize_4_11: updated on catalogusages -> phSalesStatus: ${JSON.stringify( results )} on tenant ${user.tenantId}`, 'info', NAME );

            Y.log( `migrateSalesStatusAndNormSize_4_11: update catalogusage -> phNormSize on tenant ${user.tenantId}`, 'info', NAME );
            [err, results] = await updateModel( 'catalogusage', {
                'seqId.actType': 'MEDICATION',
                ...phNormSizeQuery
            }, {phNormSize: defaultValue} );
            if( err ) {
                Y.log( `migrateSalesStatusAndNormSize_4_11. Error while updating catalogusage -> phNormSize on tenant ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            Y.log( `migrateSalesStatusAndNormSize_4_11: updated on catalogusages -> phNormSize: ${JSON.stringify( results )} on tenant ${user.tenantId}`, 'info', NAME );

            // Update activities

            Y.log( `migrateSalesStatusAndNormSize_4_11: update activity -> phSalesStatus on tenant ${user.tenantId}`, 'info', NAME );
            [err, results] = await updateModel( 'activity', {
                actType: 'MEDICATION',
                ...phSalesStatusQuery
            }, {phSalesStatus: defaultValue} );
            if( err ) {
                Y.log( `migrateSalesStatusAndNormSize_4_11. Error while updating activity -> phSalesStatus on tenant ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            Y.log( `migrateSalesStatusAndNormSize_4_11: updated on activity -> phSalesStatus: ${JSON.stringify( results )} on tenant ${user.tenantId}`, 'info', NAME );

            Y.log( `migrateSalesStatusAndNormSize_4_11: update activity -> phNormSize on tenant ${user.tenantId}`, 'info', NAME );
            [err, results] = await updateModel( 'activity', {
                actType: 'MEDICATION',
                ...phNormSizeQuery
            }, {phNormSize: defaultValue} );
            if( err ) {
                Y.log( `migrateSalesStatusAndNormSize_4_11. Error while updating activity -> phNormSize on tenant ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            Y.log( `migrateSalesStatusAndNormSize_4_11: updated on activitys -> phNormSize: ${JSON.stringify( results )} on tenant ${user.tenantId}`, 'info', NAME );

            // Update activitysequences

            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activitysequence',
                query: {
                    $or: [
                        {
                            'activities.actType': 'MEDICATION',
                            'activities.phSalesStatus': phSalesStatusQuery.phSalesStatus
                        },
                        {
                            'activities.actType': 'MEDICATION',
                            'activities.phNormSize': phNormSizeQuery.phNormSize
                        }
                    ]
                },
                migrate: true
            } ) );

            if( err ) {
                Y.log( `migrateSalesStatusAndNormSize_4_11. Error while getting activitysequences on tenant ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            Y.log( `migrateSalesStatusAndNormSize_4_11. found ${results.length} activitysequences to update on tenant ${user.tenantId}`, 'info', NAME );
            for( let activitySequence of results ) {
                Y.log( `migrateSalesStatusAndNormSize_4_11. try to update activitysequence: ${activitySequence._id} on tenant ${user.tenantId}`, 'info', NAME );
                let activitySequenceChanged = false;
                activitySequence.activities
                    .filter( activity => activity.actType === 'MEDICATION' )
                    .forEach( medication => {
                        if( !medication.phSalesStatus || !phSalesStatusAllowedValues.includes( medication.phSalesStatus ) ) {
                            medication.phSalesStatus = defaultValue;
                            activitySequenceChanged = true;
                        }
                        if( !medication.phNormSize || !phNormSizeAllowedValues.includes( medication.phNormSize ) ) {
                            medication.phNormSize = defaultValue;
                            activitySequenceChanged = true;
                        }
                    } );

                if( activitySequenceChanged ) {
                    let updateActivitySequenceResults;
                    [err, updateActivitySequenceResults] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activitysequence',
                        action: 'update',
                        query: {_id: activitySequence._id},
                        migrate: true,
                        data: {
                            activities: activitySequence.activities
                        }
                    } ) );

                    if( err ) {
                        Y.log( `migrateSalesStatusAndNormSize_4_11. Error while updating activitysequence: ${activitySequence._id} on tenant ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    } else {
                        Y.log( `migrateSalesStatusAndNormSize_4_11. updated activitysequence: ${activitySequence._id} on tenant ${user.tenantId}: ${JSON.stringify( updateActivitySequenceResults )}`, 'info', NAME );
                    }
                }
            }

            Y.log( `migrateSalesStatusAndNormSize_4_11: Successfully ended migration for tenant: ${user.tenantId}`, 'info', NAME );
            return callback();
        }

        /**
         *  Migration to add attachedMediaTags and captions to attachedMedia for media search modal MOJ-13111
         *  @param user
         *  @param callback
         */

        function addAttachedMediaTags_4_11( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.addAttachedMediaTags( user, true, callback );
        }

        async function migrateActivityPatientNoAndKbvDob_4_11( user, callback ) {
            Y.log( `migrateActivityPatientNoAndKbvDob_4_11: migrating on tenant ${user.tenantId}`, 'debug' );
            const getModel = util.promisify( Y.doccirrus.mongodb.getModel );
            let [err, patientModel] = await formatPromiseResult( getModel( user, 'patient', true ) );
            if( err ) {
                Y.log( `migrateActivityPatientNoAndKbvDob_4_11: Error getting patient model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            let patientCursor = patientModel.mongoose.find( {}, {
                patientNo: 1,
                kbvDob: 1
            }, {lean: true} ).cursor().addCursorFlag( 'noCursorTimeout', true );

            let patient = await patientCursor.next();
            let result;
            while( patient ) {
                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'mongoUpdate',
                    migrate: true,
                    query: {
                        patientId: patient._id.toString(),
                        patientNo: {$ne: false},
                        patientKbvDob: {$exists: false}
                    },
                    data: {
                        $set: {
                            patientNo: patient.patientNo,
                            patientKbvDob: patient.kbvDob
                        }
                    },
                    options: {
                        multi: true
                    }
                } ) );

                if( err ) {
                    Y.log( `migrateActivityPatientNoAndKbvDob_4_11: Could not update activities of patient: ${patient._id.toString()} . Error: ${err.stack || err}`, 'error', NAME );
                }

                Y.log( `migrateActivityPatientNoAndKbvDob_4_11: updated activities of ${patient._id.toString()}: ${result}`, 'info' );

                patient = await patientCursor.next();
            }

            Y.log( `migrateActivityPatientNoAndKbvDob_4_11: Successfully ended migration for tenant: ${user.tenantId}`, "info", NAME );
            return callback();
        }

        async function migrateCalendarReports_4_11( user, callback ) {
            Y.log( `migrateCalendarReports_4_11: migrating on tenant ${user.tenantId}`, 'debug', NAME );

            const generateScheduleReportings = promisifyArgsCallback( Y.doccirrus.insight2.regenerate.generateScheduleReportings );

            const [error] = await formatPromiseResult( generateScheduleReportings( {user: user, migrate: true} ) );

            if( error ) {
                Y.log( `migrateCalendarReports_4_11: Failed to migrate schedule reportings for tenant: ${user.tenantId}`, 'error', NAME );
                return callback();
            }

            Y.log( `migrateCalendarReports_4_11: Successfully ended migration for tenant: ${user.tenantId}`, 'info', NAME );

            return callback();
        }

        async function migrateMedicationSourceType_4_12( user, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `migrateMedicationSourceType_4_12: migrating MEDICATIONS to contain a sourceType on tenant ${user.tenantId}`, 'debug' );

            let err, result, activityModel;

            [err, activityModel] = await formatPromiseResult( getModelProm( user, 'activity', true ) );

            if( err ) {
                Y.log( `migrateMedicationSourceType_4_12: Error while getting 'activity' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err, result] = await formatPromiseResult(
                activityModel.mongoose.collection.update( {
                    actType: 'MEDICATION',
                    sourceType: {$exists: false}
                }, {
                    $set: {
                        'sourceType': ''
                    }
                }, {multi: true} )
            );

            if( err ) {
                Y.log( `migrateMedicationSourceType_4_12: Error while setting default value '' for sourceType. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `migrateMedicationSourceType_4_12: Successfully ended migration for tenant: ${user.tenantId}: ${JSON.stringify( result )}`, "info", NAME );
            return callback();
        }

        async function migrateCancelledActivityReports_4_13( user, callback ) {
            Y.log( `migrateCancelledActivityReports_4_13: migrating on tenant ${user.tenantId}`, 'debug' );

            const activities = await util.promisify( Y.doccirrus.mongodb.getModel )( user, 'activity', true );
            const reporting = await util.promisify( Y.doccirrus.mongodb.getModel )( user, 'reporting', true );
            const queue = await util.promisify( Y.doccirrus.mongodb.getModel )( user, 'syncreporting', true );

            const
                mongoose = require( 'mongoose' ),
                objectId = mongoose.Types.ObjectId;

            let tasks = [], temp;

            async function buffer( activity ) {
                let useObjectId = objectId();

                if( activity ) {
                    tasks.push( {
                        '_id': useObjectId,
                        'entityName': 'ACTIVITY',
                        'entryId': activity._id.toString(),
                        'timestamp': moment().subtract( 1, 'hour' ).toISOString()
                    } );
                }

                if( activity && tasks.length < 500 ) {
                    return;
                }

                try {

                    temp = tasks;
                    tasks = [];
                    await queue.mongoose.collection.insertMany( temp );

                } catch( error ) {
                    Y.log( `migrateCancelledActivityReports_4_13: Could not queue cancelled activities for report generating: ${error.stack || error}`, 'error', NAME );
                    this.destroy();
                    return callback( error );
                }

                if( !activity ) {
                    Y.log( `migrateCancelledActivityReports_4_13: Successfully ended migration for tenant: ${user.tenantId}`, 'info', NAME );
                    callback();
                }
            }

            try {


                await reporting.mongoose.collection.deleteMany( {status: 'CANCELLED', entityName: 'ACTIVITY'} );

                if (await activities.mongoose.collection.find( { status: 'CANCELLED' }, '_id patientId caseFolderId' ).limit( 1 ).count() < 1) {
                    Y.log( `migrateCancelledActivityReports_4_13: Successfully ended migration without any work for tenant: ${user.tenantId}`, 'info', NAME );
                    return callback();
                }

                activities.mongoose.find( { status: 'CANCELLED' }, '_id patientId caseFolderId' ).cursor().on(
                    'data', buffer
                ).on(
                    'end', buffer
                ).on(
                    'error', (error) => callback( error )
                );

            } catch ( error ) {
                Y.log( `migrateCancelledActivityReports_4_13: Could not delete cancelled activities in report collection: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }
        }

        async function migrateBasecontactStatus_4_13( user, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );
            let err,
                basecontactModel;

            Y.log( `migrateBasecontactStatus_4_13: migrating on tenant ${user.tenantId}`, 'debug' );

            [err, basecontactModel] = await formatPromiseResult( getModelProm( user, 'basecontact', true ) );

            if( err ) {
                Y.log( `migrateBasecontactStatus_4_13: Error while getting 'activity' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err] = await formatPromiseResult(
                basecontactModel.mongoose.collection.update( {
                    status: {$exists: false}
                }, {
                    $set: {'status': 'ACTIVE'}
                }, {
                    multi: true
                } )
            );

            if( err ) {
                Y.log( `migrateBasecontactStatus_4_13: Could not update status of basecontacts . Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `migrateBasecontactStatus_4_13: Successfully ended migration for tenant: ${user.tenantId}`, "info", NAME );
            return callback();
        }

        async function migrateStockDeliveriesStatus_4_13( user, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );
            let err, stockDeliveryModel;

            Y.log( `migrateStockDeliveriesStatus_4_13: migrating on tenant ${user.tenantId}`, 'debug' );

            [err, stockDeliveryModel] = await formatPromiseResult( getModelProm( user, 'stockdelivery', true ) );

            if( err ) {
                Y.log( `migrateStockDeliveriesStatus_4_13: Error while getting 'stockdelivery' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err] = await formatPromiseResult(
                stockDeliveryModel.mongoose.collection.update( {
                    status: 'open'
                }, {
                    $set: {'status': 'closed'}
                }, {
                    multi: true
                } )
            );

            if( err ) {
                Y.log( `migrateStockDeliveriesStatus_4_13: Could not update status of stockdeliveries . Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `migrateStockDeliveriesStatus_4_13: Successfully ended migration for tenant: ${user.tenantId}`, "info", NAME );
            return callback();
        }

    async function migrateActivityGtinVat_4_13( user, callback ) {
        let err,
            results,
            item;

        if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
            Y.log( 'migrateActivityGtinVat_4_13: Is not Swiss System. Exit migration.', 'debug', NAME );
            return callback();
        }

        // Get all activities of type Medication if on Swiss System
        // And check there reference in medicationscatalogs
        // Get the GTIN, vatType, vat if does not exist, set hasVat to true if vat

        [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'get',
            query: {
                $and: [
                    {actType: "MEDICATION"},
                    {
                        $or: [
                            {
                                phGTIN: {$exists: false}
                            },
                            {
                                vat: {$nin: [1001, 1002, 1003]}
                            }
                        ]
                    }
                ]
            },
            options: {
                select: {
                    _id: 1,
                    phPZN: 1
                }
            }
        } ) );

        if( err ) {
            Y.log( `migrateActivityGtinVat_4_13: Could not get activities. Error: ${err.stack || err}`, 'error', NAME );
            return callback( err );
        }

        if( !results.length ) {
            return callback();
        }

        const arrayOfPhPZN = [];
        results.forEach( result => {
            if( !arrayOfPhPZN.find( phPZN => phPZN === result.phPZN ) ) {
                arrayOfPhPZN.push( result.phPZN );
            }
        } );

        for( const phPZN of arrayOfPhPZN ) {
            let phGTIN,
                vat,
                hasVat;
            [err, item] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                query: {
                    phPZN: phPZN
                }
            } ) );

            if( err ) {
                Y.log( `migrateActivityGtinVat_4_13: Could not get medication from catalog . Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( item && item[0] ) {
                if( item[0].phGTIN ) {
                    phGTIN = item[0].phGTIN;
                }
                if( item[0].vatType ) {
                    if( item[0].vatType === 1 || item[0].vatType === 2 || item[0].vatType === 3 ) {
                        vat = 1000 + item[0].vatType;
                        hasVat = true;
                    }
                }

                const activityIds = results.filter( a => a.phPZN === phPZN ).map( a => a._id );

                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update',
                    migrate: true,
                    query: {
                        _id: {$in: activityIds}
                    },
                    data: {
                        $set: {
                            phGTIN: phGTIN,
                            vat: vat,
                            hasVat: hasVat
                        }
                    },
                    multi: true
                } ) );

                if( err ) {
                    Y.log( `migrateBasecontactStatus_4_13: Could not update activity. Error: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
            }

        }
    }

    async function migratePartnersCondition_4_13( user, callback ) {
        const
            getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

        Y.log( `migratePartnersCondition_4_13: migrating partners to contain a condition on tenant ${user.tenantId}`, 'debug' );

        let err, result, partnersModel;

        [err, partnersModel] = await formatPromiseResult( getModelProm( user, 'partner', true ) );

        if( err ) {
            Y.log( `migratePartnersCondition_4_13: Error while getting 'partners' model. Error: ${err.stack || err}`, 'error', NAME );
            return callback( err );
        }

        [err, result] = await formatPromiseResult(
            partnersModel.mongoose.collection.update( {
                'configuration.$[].condition': {$exists: false}
            }, {
                $set: {
                    'configuration.$[].condition': ''
                }
            }, {multi: true} )
        );

        if( err ) {
            Y.log( `migratePartnersCondition_4_13: Error while setting default value '' for condition. Error: ${err.stack || err}`, 'error', NAME );
            return callback( err );
        }

        Y.log( `migratePartnersCondition_4_13: Successfully ended migration for tenant: ${user.tenantId}: ${JSON.stringify( result )}`, "info", NAME );
        return callback();
    }

        async function migratePhSaleStatusActivitiesCh_4_14( user, callback ) {
            let err,
                actIds,
                activityResults,
                processed = 0,
                catalogItems;

            if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                Y.log( 'migratePhSaleStatusActivitiesCh_4_14: Is not Swiss System. Exit migration.', 'debug', NAME );
                return callback();
            }

            [err, activityResults] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'get',
                query: {
                    actType: "MEDICATION",
                    phPZN: {$exists: true}
                },
                options: {
                    select: {
                        _id: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusActivitiesCh_4_14: Could not get activities. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !activityResults.length ) {
                return callback();
            }

            // Filter items: phPZN must contain numbers only
            let validActivities = activityResults.filter( item => /^\d+$/.test( item.phPZN ) );

            // Restructure array: Group objects by phPZN and add ids for each
            let activityItems = validActivities.reduce( ( acc, obj ) => {
                let objExists = acc.find( item => item.phPZN === obj.phPZN );
                if( objExists ) {
                    objExists.ids.push( obj._id );
                } else {
                    acc.push( {ids: [obj._id], phPZN: obj.phPZN} );
                }
                return acc;
            }, [] );

            [err, catalogItems] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                migrate: true,
                query: {},
                options: {
                    select: {
                        phSalesStatus: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusActivitiesCh_4_14: Could not get medications from catalog . Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !catalogItems.length ) {
                return callback();
            }

            // Add phSaleStatus from catalog
            for( let item of activityItems ) {
                for( let catalogItem of catalogItems ) {
                    if( item.phPZN === catalogItem.phPZN ) {
                        let salesStatus;
                        switch( catalogItem.phSalesStatus ) {
                            case 'R':
                            case 'PREVIEW':
                                salesStatus = 'PREVIEW';
                                break;
                            case 'N':
                            case 'ONMARKET':
                                salesStatus = 'ONMARKET';
                                break;
                            case 'H':
                            case 'OFFMARKET':
                                salesStatus = 'OFFMARKET';
                                break;
                            case 'P':
                            case 'PROVISIONAL':
                                salesStatus = 'PROVISIONAL';
                                break;
                        }
                        item.phSalesStatus = salesStatus;
                    }
                }
            }


            let result;
            // Update
            for( let activity of activityItems ) {
                actIds = activity.ids;
                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update',
                    migrate: true,
                    query: {
                        _id: {$in: activity.ids}
                    },
                    data: {
                        $set: {
                            phSalesStatus: activity.phSalesStatus
                        }
                    },
                    fields: ['phSalesStatus'],
                    options: { multi: true }
                } ) );

                if( err ) {
                    Y.log( `migratePhSaleStatusActivitiesCh_4_14: Could not update activities. Error: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( !result ) {
                    Y.log( `migratePhSaleStatusActivitiesCh_4_14: Failed to update instock document in ${ actIds }`, "error", NAME );
                } else {
                    processed += result.n;
                }
            }

            Y.log( `migratePhSaleStatusActivitiesCh_4_14: Successfully executed for tenant: ${user.tenantId} updated ${processed} activities`, "info", NAME );
            callback();

        }

        async function migratePhSaleStatusInstockCh_4_14( user, callback ) {
            let err,
                instockResults,
                result,
                processed = 0,
                catalogItems;

            if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                Y.log( 'migratePhSaleStatusInstockCh_4_14: Is not Swiss System. Exit migration.', 'debug', NAME );
                return callback();
            }

            // Get all activities of type Medication if on Swiss System
            // And check there reference in medicationscatalogs

            [err, instockResults] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'instock',
                action: 'get',
                migrate: true,
                query: {},
                options: {
                    select: {
                        _id: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusInstockCh_4_14: Could not get instocks. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !instockResults.length ) {
                return callback();
            }

            // Filter: phPZN must contain numbers only
            let validInstocks = instockResults.filter( item => /^\d+$/.test( item.phPZN ) );

            // Restructure array: each object to contain ids with same phPZN
            let instockItems = validInstocks.reduce((acc, obj) => {
                let objExists = acc.find(item => item.phPZN === obj.phPZN);
                if(objExists){
                    objExists.ids.push(obj._id);
                } else {
                    acc.push({ids: [obj._id], phPZN: obj.phPZN});
                }
                return acc;
            }, []);

            [err, catalogItems] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                migrate: true,
                query: {},
                options: {
                    select: {
                        phSalesStatus: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusInstockCh_4_14: Could not get medication from catalog . Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !catalogItems.length ) {
                return callback();
            }

            // Add phSaleStatus to each object
            for( let item of instockItems ) {
                for( let catalogItem of catalogItems ) {
                    if( item.phPZN === catalogItem.phPZN ) {
                        let salesStatus;
                        switch( catalogItem.phSalesStatus ) {
                            case 'R':
                            case 'PREVIEW':
                                salesStatus = 'PREVIEW';
                                break;
                            case 'N':
                            case 'ONMARKET':
                                salesStatus = 'ONMARKET';
                                break;
                            case 'H':
                            case 'OFFMARKET':
                                salesStatus = 'OFFMARKET';
                                break;
                            case 'P':
                            case 'PROVISIONAL':
                                salesStatus = 'PROVISIONAL';
                                break;
                        }

                        item.phSalesStatus = salesStatus;
                    }
                }
            }


            // Update
            for(let instockItem of instockItems) {
                let inStockIds = instockItem.ids;

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'instock',
                    action: 'update',
                    migrate: true,
                    query: {
                        _id: {$in: instockItem.ids}
                    },
                    data: {
                        $set: {
                            phSalesStatus: instockItem.phSalesStatus
                        }
                    },
                    fields: ['phSalesStatus'],
                    options: {multi: true}
                } ) );

                if( err ) {
                    Y.log( `migratePhSaleStatusInstockCh_4_14: Could not update instock document. Error: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( !result ) {
                    Y.log( `migratePhSaleStatusInstockCh_4_14: Failed to update instock document in ${ inStockIds }`, "error", NAME );
                } else {
                    processed += result.n;
                }

            }

            Y.log( `migratePhSaleStatusInstockCh_4_14: Successfully executed for tenant: ${user.tenantId} updated ${processed} instock documents`, "info", NAME );
            callback();

        }

        async function migratePhSaleStatusCatalogueUsagesCh_4_14( user, callback ) {
            let err,
                catalogResults,
                result,
                processed = 0,
                catalogItems;

            if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                Y.log( 'migratePhSaleStatusCatalogueUsagesCh_4_14: Is not Swiss System. Exit migration.', 'debug', NAME );
                return callback();
            }

            // Get all activities of type Medication if on Swiss System
            // And check there reference in medicationscatalogs

            [err, catalogResults] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalogusage',
                action: 'get',
                migrate: true,
                query: {
                    catalogShort: "HCI",
                    phPZN: {$exists: true}
                },
                options: {
                    select: {
                        _id: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusCatalogueUsagesCh_4_14: Could not get catalogusages. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !catalogResults.length ) {
                return callback();
            }

            // Filter: phPZN must contain numbers only
            let validCatalogItems = catalogResults.filter( item => /^\d+$/.test( item.phPZN ) );

            // Restructure array: each object to contain ids with same phPZN
            let houseCatItems = validCatalogItems.reduce((acc, obj) => {
                let objExists = acc.find(item => item.phPZN === obj.phPZN);
                if(objExists){
                    objExists.ids.push(obj._id);
                } else {
                    acc.push({ids: [obj._id], phPZN: obj.phPZN});
                }
                return acc;
            }, []);

            [err, catalogItems] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                migrate: true,
                query: {},
                options: {
                    select: {
                        phSalesStatus: 1,
                        phPZN: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migratePhSaleStatusCatalogueUsagesCh_4_14: Could not get medication from catalog . Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !catalogItems.length ) {
                return callback();
            }

            // Add phSaleStatus to each object
            for( let item of houseCatItems ) {
                for( let catalogItem of catalogItems ) {
                    if( item.phPZN === catalogItem.phPZN ) {
                        let salesStatus;
                        switch( catalogItem.phSalesStatus ) {
                            case 'R':
                            case 'PREVIEW':
                                salesStatus = 'PREVIEW';
                                break;
                            case 'N':
                            case 'ONMARKET':
                                salesStatus = 'ONMARKET';
                                break;
                            case 'H':
                            case 'OFFMARKET':
                                salesStatus = 'OFFMARKET';
                                break;
                            case 'P':
                            case 'PROVISIONAL':
                                salesStatus = 'PROVISIONAL';
                                break;
                        }

                        item.phSalesStatus = salesStatus;
                    }
                }
            }

            // Update
            for(let houseCatItem of houseCatItems) {
                let ids = houseCatItem.ids;

                [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'catalogusage',
                    action: 'update',
                    migrate: true,
                    query: {
                        _id: {$in: ids }
                    },
                    data: {
                        $set: {
                            phSalesStatus: houseCatItem.phSalesStatus
                        }
                    },
                    fields: ['phSalesStatus'],
                    options: {multi: true}
                } ) );

                if( err ) {
                    Y.log( `migratePhSaleStatusCatalogueUsagesCh_4_14: Could not update Hauskatalog document. Error: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( !result ) {
                    Y.log( `migratePhSaleStatusCatalogueUsagesCh_4_14: Failed to update Hauskatalog document in ${ ids }`, "error", NAME );
                } else {
                    processed += result.n;
                }

            }

            Y.log( `migratePhSaleStatusCatalogueUsagesCh_4_14: Successfully executed for tenant: ${user.tenantId} updated ${processed} Hauskatalog documents`, "info", NAME );
            callback();

        }
        async function migrateStockLocations_4_14( user, callback ) {
            let error, locations, countryMode, locationModel, result;
            const getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );
            Y.log( `migrateStockLocations_4_14: migrate storing stocklocations on tenant ${user.tenantId}`, 'info' );

            [error, countryMode] = await formatPromiseResult( Y.doccirrus.api.practice.getCountryMode() );

            if( error ) {
                Y.log( `migrateStockLocations_4_14: Error getting country mode:\n${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            if( !countryMode || !countryMode.includes( 'CH' ) ) {
                Y.log( 'migrateStockLocations_4_14: Is not Swiss System. Exit migration.', 'info', NAME );
                return callback();
            }

            [error, locationModel] = await formatPromiseResult( getModelProm( user, 'location', true ) );

            if( error ) {
                Y.log( `migrateStockLocations_4_14: Error while getting 'location' model. Error: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            // 1. Get all locations with stocklocations
            [error, locations] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'get',
                migrate: true,
                query: {
                    stockLocations: {$gt: []}
                }
            } ) );

            if( error ) {
                Y.log( `migrateStockLocations_4_14: Error while getting locations with stocklocations. Error: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            if( !Array.isArray( locations ) || !locations.length ) {
                Y.log( `migrateStockLocations_4_14: No locations with stocklocations. Exiting migration`, 'warn', NAME );
                return callback();
            }

            if( Y.doccirrus.comctl.isObjectId( locations[0].stockLocations[0] ) ) {
                Y.log( `migrateStockLocations_4_14: No need for migration. Exiting migration`, 'warn', NAME );
                return callback();
            }

            const stockLocations = locations.map( loc => loc.stockLocations )
                .reduce( ( result, array ) => result.concat( array ), [] );

            // 2. Post them to stocklocations collections keeping the same id
            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'post',
                model: 'stocklocation',
                migrate: true,
                data: Y.doccirrus.filters.cleanDbObject( stockLocations )
            } ) );

            Y.log(`successfully updated stocklocations ${result}`, 'info', NAME);

            if( error ) {
                Y.log( `migrateStockLocations_4_14: Failed to save stocklocations to new collection. Error: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            // 3. Update location.stockLocations with ids
            for( let location of locations ) { //eslint-disable-line
                [error] = await formatPromiseResult(
                    locationModel.mongoose.collection.update( {
                        _id: location._id
                    }, {
                        $set: {stockLocations: location.stockLocations.map( sl => new ObjectId( sl._id ) )}
                    } )
                );
            }

            Y.log( `migrateStockLocations_4_14: Successfully ended migration for tenant: ${user.tenantId}`, "info", NAME );
            return callback();
        }

        function updateMedDataItemsWithBoolInTextValueToBoolValue_4_15( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.updateMedDataItemsWithBoolInTextValueToBoolValue( user, true, callback );
        }

        function updateMedDataItemsInBooleanCategoriesWithoutAnyValue_4_15( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.updateMedDataItemsInBooleanCategoriesWithoutAnyValue( user, true, callback );
        }

        function updateMedDataItemsWithDateInTextValueToDateValue_4_15( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.updateMedDataItemsWithDateInTextValueToDateValue( user, true, callback );
        }

        function removeAllAMTSTags_4_15( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.removeAllAMTSTags( user, true, callback );
        }

        function updateBoolCategoryMedDataTags_4_15( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.updateBoolCategoryMedDataTags( user, true, callback );
        }

        function migrateSetLatestMedData_4_15( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.setLatestMedDataOnPatients( user, true, callback );
        }

        function migrateMedDataItemsVACCINATIONFromNumberToStringEnum_4_15( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.migrateMedDataItemsVACCINATIONFromNumberToStringEnum( user, true, callback );
        }

        function migrateMedDataItemsWithPureNumericTextValueToNumberValue_4_15( user, callback ) {
            Y.doccirrus.inCaseUtils.migrationhelper.migrateMedDataItemsWithPureNumericTextValueToNumberValue( user, true, callback );
        }

        async function migrateInvoiceRefLinkedActivities_4_14( user, callback ) {
            let error, result, countryMode;
            Y.log( `migrateInvoiceRefLinkedActivities_4_14: migrate INVOICEREF linked activities ${user.tenantId}`, 'info' );

            [error, countryMode] = await formatPromiseResult( Y.doccirrus.api.practice.getCountryMode() );

            if( error ) {
                Y.log( `migrateInvoiceRefLinkedActivities_4_14: Error getting country mode:\n${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            if( !countryMode || !countryMode.includes( 'CH' ) ) {
                Y.log( 'migrateInvoiceRefLinkedActivities_4_14: Is not Swiss System. Exit migration.', 'info', NAME );
                return callback();
            }

            const util = require( 'util' ),
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            let activitiesModel, invoiceRefCount = 0;
            [error, activitiesModel] = await formatPromiseResult( getModelProm( user, 'activity', true ) );

            if( error ) {
                Y.log( `migrateInvoiceRefLinkedActivities_4_14: Error while getting 'activity' model. Error: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

        // ----- Check if migration needed -----
        /*
        * Algorythm for check:
        * 1. Get all InvoiceRefs with links to tarmedlogs
        * 2. Get all Treatments with links to these invoices and tarmedlogs
        * 3. Get all Invoiceenties which contain these treatments
        * 4. Collect diagnoses and medication ids from invoiceentries
        * 5. If all of them have invoieId - no need for migration. Otherwise - run migration
        * */

            [error, result] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                user,
                model: 'activity',
                query: {
                    actType: 'INVOICEREF',
                    invoiceLogId: {$exists: true}
                },
                options: {
                    fields: {
                        _id: 1,
                        invoiceLogId: 1
                    }
                }
            }));

            if( error || !Array.isArray( result ) || !result.length ) {
                error = error || new Y.doccirrus.commonerrors.DCError( 404, {message: 'INVOICEREFs not found'} );
                Y.log( `migrateInvoiceRefLinkedActivities_4_14: Failed to get INVOICEREFs with existing invoiceLogId. Error: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            const invoiceIds = (result || []).map(r => r._id.toString() ) || [],
                invoceLogIds = (result || []).map( r => r.invoiceLogId ) || [];

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                migrate: true,
                query: {
                    invoiceId: {
                        $in: invoiceIds
                    },
                    invoiceLogId: {
                        $in: invoceLogIds
                    },
                    actType: 'TREATMENT'
                }
            } ) );

            if( error || !Array.isArray( result ) || !result.length ) {
                error = error || new Y.doccirrus.commonerrors.DCError( 404, {message: 'Treatments not found'} );
                Y.log( `migrateInvoiceRefLinkedActivities_4_14: Failed to get treatments connectd to invoices by invoiceId and to tarmedlogs by invoiceLogIds.\nError: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            const treatmentIds = (result || []).map(r => r._id.toString() ) || [];

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'invoiceentry',
                migrate: true,
                query: {
                    type: 'schein',
                    invoiceLogId: {
                        $in: invoceLogIds
                    },
                    'data.treatments._id': {
                        $in: treatmentIds
                    }
                }
            } ) );

            if( error || !Array.isArray( result ) || !result.length ) {
                error = error || new Y.doccirrus.commonerrors.DCError( 404, {message: 'Invoiceentries not found'} );
                Y.log( `migrateInvoiceRefLinkedActivities_4_14: Failed to get Invoiceentries with treatments.\nError: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            const checkDiagnosesIds = result.reduce( ( acc, invoiceentry ) => acc.concat( (invoiceentry.data.medications || []).map( m => m._id ) ), [] ) || [],
                checkMedicationsIds = result.reduce( ( acc, invoiceentry ) => acc.concat( (invoiceentry.data.diagnoses || [] ).map( d => d._id ) ), [] ) || [],
                checkContDiagnosesIds = result.reduce( ( acc, invoiceentry ) => acc.concat( (invoiceentry.data.continuousDiagnoses || []).map( c => c._id ) ), [] ) || [],
                checkMissingActivitiesIds = checkDiagnosesIds.concat( checkMedicationsIds ).concat( checkContDiagnosesIds );

            let count = 0;
            [error, count] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'count',
                migrate: true,
                query: {
                    _id: {
                        $in: checkMissingActivitiesIds
                    },
                    invoiceId: {$exists: false}
                }
            } ) );

            if( error ) {
                Y.log( `migrateInvoiceRefLinkedActivities_4_14: Failed to get diagnoses and medications.\nError: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            if( !count ) {
                Y.log( `migrateInvoiceRefLinkedActivities_4_14: All medications and diagnoses related to INVOICEREFs have invoiceIds, no need for migration.`, 'info', NAME );
                return callback( null );
            }

        // ----- Start migration -----

            const cursor = activitiesModel.mongoose.find( {
                actType: 'INVOICEREF',
                invoiceLogId: {$exists: true}
            } ).lean().cursor();

            /* Algorythm for each INVOICEREF:
             * 1. Find invoiceentry with missing medications and diagnoses
             * 2. Get missing medications and diagnoses
             * 3. Link missing medications and diagnoses to INVOICEREF
             * 4. link INVOICEREF to missing medications and diagnoses
            */

            let invoiceRef;
            while( invoiceRef = await cursor.next() ) {        // eslint-disable-line no-cond-assign
                let treatments, invoiceentries;
                const tarmedlogId = invoiceRef.invoiceLogId;

                // ------------- 1. Find invoiceentry with missing medications and diagnoses -------------

                [error, treatments] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    migrate: true,
                    query: {
                        invoiceId: invoiceRef._id.toString(),
                        invoiceLogId: tarmedlogId,
                        actType: 'TREATMENT'
                    }
                } ) );

                if( error || !Array.isArray( treatments ) || !treatments.length ) {
                    Y.log( `migrateInvoiceRefLinkedActivities_4_14: Failed to get treatments by invoiceId: ${invoiceRef._id.toString()}.\nError: ${error && error.stack || error}`, 'error', NAME );
                    continue;
                }

                const treatmentId = (treatments[0] || {})._id;

                if( !treatmentId ) {
                    Y.log( `migrateInvoiceRefLinkedActivities_4_14: No treatmentId. continue...`, 'error', NAME );
                    continue;
                }

                [error, invoiceentries] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'invoiceentry',
                    migrate: true,
                    query: {
                        type: 'schein',
                        invoiceLogId: tarmedlogId,
                        'data.treatments._id': treatmentId.toString()
                    }
                } ) );

                if( error || !Array.isArray( invoiceentries ) || !invoiceentries.length ) {
                    Y.log( `migrateInvoiceRefLinkedActivities_4_14: Failed to get invoiceentries by invoiceLogId: ${tarmedlogId} and having treatment ${treatments[0]._id.toString()}.\nError: ${error && error.stack || error}`, 'error', NAME );
                    continue;
                }

                // ---- 2. Get missing medications and diagnoses ----

                const scheinInvoiceEntry = (invoiceentries[0] || {}).data || {},
                    diagnosesIds = (scheinInvoiceEntry.diagnoses || []).map( d => d._id ) || [],
                    medicationIds = (scheinInvoiceEntry.medications || []).map( m => m._id ) || [],
                    continuousDiagnosesIds = (scheinInvoiceEntry.continuousDiagnoses || []).map( c => c._id ) || [],
                    missingActivitiesIds = medicationIds.concat( diagnosesIds ).concat( continuousDiagnosesIds );

                if( !missingActivitiesIds.length ) {
                    Y.log( `migrateInvoiceRefLinkedActivities_4_14: There are no medications or diagnosis for invoiceRef ${invoiceRef._id.toString()}`, 'info', NAME );
                    continue;
                }

                const activitiesCursor = activitiesModel.mongoose.find( {
                    _id: {
                        $in: missingActivitiesIds
                    },
                    invoiceId: {$exists: false}
                }, {referencedBy: 1, actType: 1, invoiceLogId: 1, invoiceId: 1} ).lean().cursor();

                // ------- 3. Link missing medications and diagnoses to INVOICEREF -------

                let activity;
                while( activity = await activitiesCursor.next() ) {                            // eslint-disable-line no-cond-assign
                    if( activity.actType === 'MEDICATION' && activity.invoiceLogId !== tarmedlogId ) {
                        Y.log( `migrateInvoiceRefLinkedActivities_4_14: medication ${activity._id.toString()} no longer belongs to tarmedlog ${tarmedlogId}, but belongs to ${activity.invoiceLogId}`, 'info', NAME );
                        continue;
                    }
                    activity.referencedBy.push( invoiceRef._id.toString() );
                    [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        migrate: true,
                        action: 'update',
                        query: {
                            _id: activity._id
                        },
                        data: {
                            $set: {
                                invoiceId: invoiceRef._id.toString(),
                                referencedBy: activity.referencedBy
                            }
                        }
                    } ) );
                    if( error ) {
                        Y.log( `migrateInvoiceRefLinkedActivities_4_14(): Failed to link ${activity.actType} to invoiceRef ${invoiceRef._id.toString()}.\nError: ${error.stack || error}`, 'error', NAME );
                    }
                }

                // -------------- 4. link INVOICEREF to missing medications and diagnoses --------------
                [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    migrate: true,
                    action: 'update',
                    query: {
                        _id: invoiceRef._id
                    },
                    data: {
                        $set: {
                            activities: (invoiceRef.activities || []).concat( medicationIds ),
                            icds: diagnosesIds,
                            icdsExtra: continuousDiagnosesIds
                        }
                    }
                } ) );
                if( error ) {
                    Y.log( `migrateInvoiceRefLinkedActivities_4_14(): Failed to link invoiceRef ${invoiceRef._id.toString()} to medications/diagnoses.\nError: ${error.stack || error}`, 'error', NAME );
                }
                invoiceRefCount++;
            }

            Y.log( `migrateInvoiceRefLinkedActivities_4_14: Finished migration for ${invoiceRefCount} invoiceRefs`, 'info', NAME );
            return callback();
        }

        async function migrateMedicalScalingFactor_4_14( user, callback ) {
            let error, result, countryMode, activitiesModel;
            const util = require( 'util' ),
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );
            Y.log( `migrateMedicalScalingFactor_4_14: migrate medicalScalcingFactor on tenant ${user.tenantId}`, 'info' );

            [error, countryMode] = await formatPromiseResult( Y.doccirrus.api.practice.getCountryMode() );

            if( error ) {
                Y.log( `migrateMedicalScalingFactor_4_14: Error getting country mode:\n${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            if( !countryMode || !countryMode.includes( 'CH' ) ) {
                Y.log( 'migrateMedicalScalingFactor_4_14: Is not Swiss System. Exit migration.', 'info', NAME );
                return callback();
            }

            [error, activitiesModel] = await formatPromiseResult( getModelProm( user, 'activity', true ) );

            if( error ) {
                Y.log( `migrateMedicalScalingFactor_4_14: Error while getting 'activity' model. Error: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            // Put internalMedicalScalingFactor value into medicalScalingFactor field
            [error, result] = await formatPromiseResult(
                activitiesModel.mongoose.collection.update( {
                    catalogShort: {
                        $in: ['TARMED', 'TARMED_UVG_IVG_MVG']
                    },
                    medicalScalingFactor: 1,
                    internalMedicalScalingFactor: 0.93
                }, {
                    $set: {medicalScalingFactor: 0.93},
                    $unset: {internalMedicalScalingFactor: 1}
                }, {multi: true} )
            );

            if( error || !result ) {
                Y.log( `migrateMedicalScalingFactor_4_14: Failed to update activities. Error: ${error.stack || error}`, 'error', NAME );
                return callback( error || new Error( 'No result returned!' ) );
            }

            const nModified = (result.result || {}).nModified || 0;

            Y.log( `migrateMedicalScalingFactor_4_14: Successfully updated ${nModified} activities. Ended migration for tenant: ${user.tenantId}`, "info", NAME );
            return callback();
        }

        async function migrateMedidataRejectedInvoices_4_14( user, callback ) {
            let error, result, countryMode;
            Y.log( `migrateMedidataRejectedInvoices_4_14: migrate invoices rejected by medidata on tenant ${user.tenantId}`, 'info' );

            [error, countryMode] = await formatPromiseResult( Y.doccirrus.api.practice.getCountryMode() );

            if( error ) {
                Y.log( `migrateMedidataRejectedInvoices_4_14: Error getting country mode:\n${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            if( !countryMode || !countryMode.includes( 'CH' ) ) {
                Y.log( 'migrateMedidataRejectedInvoices_4_14: Is not Swiss System. Exit migration.', 'info', NAME );
                return callback();
            }

            const fsmName = Y.doccirrus.schemas.activity.getFSMName( 'INVOICEREF' ),
                fsmStateChangePromise = function( user, options, activity, isTest, stateChangeFn ) {
                    return new Promise( function( resolve, reject ) {
                        const callback = function( err, result ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve( result );
                        };
                        stateChangeFn( user, options, activity, isTest, callback );
                    } );
                };

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                migrate: true,
                query: {
                    actType: 'COMMUNICATION',
                    subType: "Mediport"
                }
            } ) );

            if( error || !Array.isArray( result ) || !result.length ) {
                Y.log( `migrateMedidataRejectedInvoices_4_14: Failed to get communication activities.\nError: ${error && error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            const invoiceRefIds = result.reduce( ( allInvoiceRefs, communication ) => allInvoiceRefs.concat( communication.referencedBy || [] ), [] );
            const util = require( 'util' ),
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            let activitiesModel;
            [error, activitiesModel] = await formatPromiseResult( getModelProm( user, 'activity', true ) );

            if( error ) {
                Y.log( `migrateMedidataRejectedInvoices_4_14: Error while getting 'activity' model. Error: ${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            let count = 0;
            [error, count] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                migrate: true,
                query: {
                    _id: {
                        $in: invoiceRefIds
                    },
                    actType: 'INVOICEREF',
                    status: 'CANCELLED'
                },
                action: 'count'
            } ) );

            if( !count ) {
                Y.log( `migrateMedidataRejectedInvoices_4_14: No CANCELLED InvoiceRefs which supposed to be Medidata Rejected. No need for migration`, 'info', NAME );
                return callback();
            }
            count = 0;

            const cursor = activitiesModel.mongoose.find( {
                _id: {
                    $in: invoiceRefIds
                },
                actType: 'INVOICEREF',
                status: 'CANCELLED'
            } ).lean().cursor();

            let invoiceRef;
            while( invoiceRef = await cursor.next() ) {        // eslint-disable-line no-cond-assign
                let treatments, invoiceentries;
                const tarmedlogId = invoiceRef.invoiceLogId;

                // ------------- 1. Change INVOICEREF status through fsm server to MEDIDATAREJECTED -------------

                [error] = await formatPromiseResult( fsmStateChangePromise( user, {
                    fast: true,
                    medidata: true
                }, invoiceRef, false, Y.doccirrus.fsm[fsmName].reject ) );

                if( error ) {
                    Y.log( `migrateMedidataRejectedInvoices_4_14: Failed to reject invoiceRef ${invoiceRef._id.toString()}. \nError: ${error.stack || error}`, 'error', NAME );
                    continue;
                }
                count++;

                // ------------- 2. Get invoiceentry which contains schein ID --------------------

                [error, treatments] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    migrate: true,
                    query: {
                        invoiceId: invoiceRef._id.toString(),
                        invoiceLogId: tarmedlogId,
                        actType: 'TREATMENT'
                    }
                } ) );

                if( error || !Array.isArray( treatments ) || !treatments.length ) {
                    Y.log( `migrateMedidataRejectedInvoices_4_14: Failed to get treatments by invoiceId: ${invoiceRef._id.toString()}.\nError: ${error && error.stack || error}`, 'error', NAME );
                    continue;
                }

                [error, invoiceentries] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'invoiceentry',
                    migrate: true,
                    query: {
                        type: 'schein',
                        invoiceLogId: tarmedlogId,
                        'data.treatments._id': treatments[0]._id.toString()
                    }
                } ) );

                if( error || !Array.isArray( invoiceentries ) || !invoiceentries.length ) {
                    Y.log( `migrateMedidataRejectedInvoices_4_14: Failed to get invoiceentries by invoiceLogId: ${tarmedlogId} and having treatment ${treatments[0]._id.toString()}.\nError: ${error && error.stack || error}`, 'error', NAME );
                    continue;
                }

                const scheinInvoiceEntry = (invoiceentries[0] || {}).data || {},
                    scheinId = scheinInvoiceEntry._id;

                // ---- 3. Update schein status ----

                [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    migrate: true,
                    action: 'update',
                    query: {
                        _id: scheinId,
                        invoiceLogId: tarmedlogId
                    },
                    data: {$set: {status: "VALID"}}
                } ) );

                if( error ) {
                    Y.log( `migrateMedidataRejectedInvoices_4_14(): Failed to set schein ${scheinId} to VALID state. \nError: ${error.stack || error}`, 'error', NAME );
                }
            }

            Y.log( `migrateMedidataRejectedInvoices_4_14: Finished migration for ${count} invoiceRefs`, 'info', NAME );
            return callback();
        }

        async function migrateCatalogTexts_4_15( user, callback ) {
            let err,
                catalogTexts = [],
                catalogUsages = [],
                deleteResult,
                deleted = 0;

            if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                Y.log( 'migrateCatalogTexts_4_15: Is not Swiss System. Exit migration.', 'debug', NAME );
                return callback();
            }

            // Get all items from catalogtexts collection
            // Get all items from catalogUsages
            // If an item from catalogusages is found that matches catalogtext item do nothing
            // If no match found delete the catalogtext

            [err, catalogTexts] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalogtext',
                action: 'get',
                migrate: true,
                query: {},
                options: {
                    select: {
                        _id: 1,
                        catalogShort: 1,
                        locationId: 1,
                        code: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migrateCatalogTexts_4_15: Could not get catalogtexts. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !catalogTexts.length ) {
                Y.log( 'migrateCatalogTexts_4_15: No catalogtexts found. Nothing to be migrated.', 'info', NAME );
                return callback();
            }

            let codes = [ ... new Set(...catalogTexts.map(entry => entry.code))];
            let locationIds = [ ... new Set(...catalogTexts.map(entry => entry.locationId))];
            let catalogShorts = [ ... new Set(...catalogTexts.map(entry => entry.catalogShort))];

            [err, catalogUsages] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalogusage',
                action: 'get',
                migrate: true,
                query: {
                    seq: {$in: codes},
                    locationId: {$in: locationIds},
                    catalogShort: {$in: catalogShorts}
                },
                options: {
                    select: {
                        catalogShort: 1,
                        locationId: 1,
                        seq: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `migrateCatalogTexts_4_15: Could not get catalogusages. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            // Return array of Ids that have no match
            let toBeDeletedIds = catalogTexts.reduce((acc, obj) => {
                if( !acc.includes( obj._id.toString() ) ) { // prevent duplicates
                    let itemNotFound = !catalogUsages.find( cuItem => cuItem.seq === obj.code && cuItem.locationId === obj.locationId && cuItem.catalogShort === obj.catalogShort );
                    if( itemNotFound ) {
                        acc.push( obj._id.toString() );
                    }
                }
                return acc;
            }, []);

            [err, deleteResult] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'catalogtext',
                action: 'delete',
                migrate: true,
                query: {_id: {$in: toBeDeletedIds }},
                options: {override: true}
            } ) );


            if( err ) {
                Y.log( `migrateCatalogTexts_4_15: Could not delete catalogtext documents. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            if( !deleteResult ) {
                Y.log( `migrateCatalogTexts_4_15: Failed to delete catalogtext documents with ids: ${ toBeDeletedIds }`, "error", NAME );
            } else {
                deleted += deleteResult.length || 0;
            }

            Y.log( `migrateCatalogTexts_4_15: Successfully executed for tenant: ${user.tenantId} deleted ${deleted} catalogtexts documents`, "info", NAME );
            callback();
        }

        async function migrateSetActionButtons_4_16( user, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `migrateSetActionButtons_4_16: migrating actionbutton on tenant ${user.tenantId}`, 'debug' );

            let err, result, actionbuttonModel;

            [err, actionbuttonModel] = await formatPromiseResult( getModelProm( user, 'actionbutton', true ) );

            if( err ) {
                Y.log( `migrateSetActionButtons_4_16: Error while getting 'actionbutton' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err, result] = await formatPromiseResult(
                actionbuttonModel.mongoose.collection.update(
                    {subType: {$exists: false}},
                    {$set: {subType: ''}},
                    {multi: true}
                )
            );

            if( err ) {
                Y.log( `migrateSetActionButtons_4_16: Error while setting default subType value on actionbutton. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `migrateSetActionButtons_4_16: Successfully ended migration for tenant: ${user.tenantId}: ${JSON.stringify( result )}`, "info", NAME );
            return callback();
        }

        async function migrateSetMirrorActivityActTypes_4_16( user, callback ) {
            Y.log( `migrateSetMirrorActivityActTypes_4_16: migrating patienttransfer mirrorActivitiesActTypes on tenant ${user.tenantId}`, 'debug', NAME );

            const
                getModel = util.promisify( Y.doccirrus.mongodb.getModel );

            let err, patientTransferModel;

            [err, patientTransferModel] = await formatPromiseResult( getModel( user, 'patienttransfer', true ) );

            if( err ) {
                Y.log( `migrateSetMirrorActivityActTypes_4_16: Error getting patienttransfer model on tenant ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            const patientTransferCursor = patientTransferModel.mongoose.find(
                {
                    mirrorActivitiesActTypes: {$exists: false}
                },
                {
                    _id: 1,
                    mirrorPatientId: 1,
                    mirrorActivitiesIds: 1
                },
                {lean: true}
            ).cursor().addCursorFlag( 'noCursorTimeout', true );

            patientTransferCursor.eachAsync( async ( patientTransfer ) => {
                if( patientTransfer.mirrorPatientId ) {
                    let
                        mirrorActivities = [],
                        updateResult;

                    [err, mirrorActivities] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'mirroractivity',
                        action: 'get',
                        migrate: true,
                        query: {
                            _id: {$in: patientTransfer.mirrorActivitiesIds}
                        },
                        options: {
                            select: {
                                actType: 1
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `migrateSetMirrorActivityActTypes_4_16: Error while getting mirrorActivitiesActTypes. Error: ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    [err, updateResult] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patienttransfer',
                        action: 'update',
                        migrate: true,
                        query: {
                            _id: patientTransfer._id
                        },
                        data: {
                            $set: {
                                mirrorActivitiesActTypes: mirrorActivities.map(activity => activity.actType)
                            }
                        }
                    } ) );

                    if( err ) {
                        Y.log( `migrateSetMirrorActivityActTypes_4_16: Error while updating mirrorActivitiesActTypes for patienttransfer ${user.tenantId}. Error: ${err.stack || err}`, 'error', NAME );
                        throw err;
                    }

                    return updateResult;
                }
            } ).then( () => {
                Y.log( `migrateSetMirrorActivityActTypes_4_16: Successfully ended migration for tenant ${user.tenantId}`, 'info', NAME );
                callback();
            } ).catch( err => {
                Y.log( `migrateSetMirrorActivityActTypes_4_16: Error while updating mirrorActivitiesActTypes for patienttransfer ${user.tenantId}`, 'error', NAME );
                callback( err );
            } );
        }

        async function migrateMedicationRefInMedicationPlanEntries_4_16( user, callback ) {
            if( !Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                return callback();
            }
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            let err, activityModel;

            Y.log( `migrateMedicationRefInMedicationPlanEntries_4_16: migrating medicationRef on tenant ${user.tenantId}`, 'debug' );

            [err, activityModel] = await formatPromiseResult( getModelProm( user, 'activity', true ) );

            if( err ) {
                Y.log( `migrateMedicationRefInMedicationPlanEntries_4_16: Error while getting 'activity' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            const fixSingleMedicationPlanEntry = async function( medicationPlan, medicationPlanEntry ) {
                let [err, correctMedication] = await formatPromiseResult( activityModel.mongoose.collection.findOne( {
                    _id: {$in: medicationPlan.activities.map( id => ObjectId( id ) )},
                    $or: [{phPZN: medicationPlanEntry.phPZN}, {phNLabel: medicationPlanEntry.phNLabel}]
                } ) );

                if( err ) {
                    Y.log( `migrateMedicationRefInMedicationPlanEntries_4_16. Error while getting correct medication: ${err.stack || err}.`, 'error', NAME );
                    throw err;
                }

                if( !correctMedication ) {
                    // could not find correct medication to assign it's id as medicationRef for medicationPlanEntry
                    Y.log( `migrateMedicationRefInMedicationPlanEntries_4_16. Could not find correct medication ${medicationPlanEntry.phPZN || medicationPlanEntry.phNLabel} for ${medicationPlan._id} medication plan to fix medicationRef`, 'error', NAME );
                    return;
                }
                [err] = await formatPromiseResult(
                    activityModel.mongoose.collection.update(
                        {
                            _id: medicationPlan._id,
                            'medicationPlanEntries.medicationRef': medicationPlanEntry.medicationRef
                        },
                        {$set: {'medicationPlanEntries.$.medicationRef': correctMedication._id.toString()}}
                    )
                );

                if( err ) {
                    Y.log( `migrateMedicationRefInMedicationPlanEntries_4_16. Error while updating ${medicationPlan._id} activity with correct medicationRef: ${err.stack || err}.`, 'error', NAME );
                    throw err;
                }

                Y.log( `migrateMedicationRefInMedicationPlanEntries_4_16: Successfully updated ${medicationPlan._id} activity' medicationPlanEntry ${medicationPlanEntry._id} with correct ${correctMedication._id.toString()} medicationRef.`, 'info', NAME );
                return;
            };

            const cursor = activityModel.mongoose.find( {
                medicationPlanEntries: {$exists: true, $ne: []},
                'medicationPlanEntries.medicationRef': {$exists: true},
                activities: {$exists: true, $ne: []}
            }, {
                _id: 1,
                activities: 1,
                medicationPlanEntries: 1
            } ).lean().cursor().addCursorFlag( 'noCursorTimeout', true );

            let medicationPlan = await cursor.next();
            while( medicationPlan ) {
                // check if medicationPlanEntries medicationRef value is included in medicationPlan activities field
                for( let medPlanEntry of medicationPlan.medicationPlanEntries ) {
                    if( 0 > medicationPlan.activities.indexOf( medPlanEntry.medicationRef ) ) {
                        try {
                            await fixSingleMedicationPlanEntry( medicationPlan, medPlanEntry );
                        } catch( error ) {
                            Y.log( `migrateMedicationRefInMedicationPlanEntries_4_16: Error while fixing medicationPlanEntry ${medPlanEntry._id} of medication plan ${medicationPlan._id}: ${error.stack || error}`, 'error', NAME );
                        }
                    }
                }
                medicationPlan = await cursor.next();
            }
            Y.log( `migrateMedicationRefInMedicationPlanEntries_4_16: Successfully executed for tenant: ${user.tenantId}.`, "info", NAME );
            return callback();
        }

        async function addKimConfigDefaults_4_17( user, callback ) {
            if( !Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                return callback();
            }
            Y.log( `addKimConfigDefaults_4_17: migrating KIM config for tenant: ${user.tenantId}`, 'info', NAME );

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'incaseconfiguration',
                action: 'mongoUpdate',
                migrate: true,
                query: {
                    _id: ObjectId( '000000000000000000000001' ),
                    kimMessagePollingIntervalEnabled: {$exists: false},
                    kimMessagePollingIntervalHours: {$exists: false}
                },
                data: {
                    $set: {
                        kimMessagePollingIntervalEnabled: true,
                        kimMessagePollingIntervalHours: 2
                    }
                }
            } ) );

            if( err ) {
                Y.log( `addKimConfigDefaults_4_17. Error in KIM incaseconfiguration migration. for tenant: ${user.tenantId}: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `addKimConfigDefaults_4_17: Successfully executed for tenant: ${user.tenantId}: ${result}`, 'info', NAME );
            callback();
        }

        async function addinTiLicensePatternTo_4_17( user, callback ) {
            if( !Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                return callback();
            }
            Y.log( `addinTiLicensePatternTo_4_17: migrating inTi config for dcprc: `, 'info', NAME );

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'company',
                action: 'mongoUpdate',
                migrate: true,
                query: {
                    "licenseScope.telematikServices": {$exists: false},
                    "licenseScope.additionalServices": {$all: ["inTi"]}
                },
                data: {
                    $set: {
                        "licenseScope.0.telematikServices": ["VSDM", "KIM", "QES"]
                    }
                },
                options: {
                    multi: true
                }
            }));

            if( err ) {
                Y.log( `addinTiLicensePatternTo_4_17. Error in inTi license migration.  ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `addinTiLicensePatternTo_4_17: Successfully executed: ${result}`, 'info', NAME );
            callback();
        }
        async function migrateSetAppRegData_4_18( user, callback ) {
            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            Y.log( `migrateSetAppRegData_4_18: migrating AppReg on tenant ${user.tenantId}`, 'debug' );

            let err, result, appregModel;

            [err, appregModel] = await formatPromiseResult( getModelProm( user, 'appreg', true ) );

            if( err ) {
                Y.log( `migrateSetAppRegData_4_18: Error while getting 'appreg' model. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            [err, result] = await formatPromiseResult(
                appregModel.mongoose.collection.update( {}, {
                    $set: {
                        appVersion: '',
                        storeVersion: '',
                        versionIsOutdated: false
                    }
                }, {multi: true} )
            );

            if( err ) {
                Y.log( `migrateSetAppRegData_4_18: Error while setting default values of appVersion, storeVersion and versionIsOutdated on AppReg. Error: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            Y.log( `migrateSetAppRegData_4_18: Successfully ended migration for tenant: ${user.tenantId}: ${JSON.stringify( result )}`, "info", NAME );
            return callback();
        }

        async function addCoverCardAndInstockConfigs_4_18( user, callback ) {
            let error, countryMode;

            Y.log( `Entering addCoverCardAndInstockConfigs_4_18 on ${user.tenantId}`, 'info', NAME );

            [error, countryMode] = await formatPromiseResult( Y.doccirrus.api.practice.getCountryMode() );

            if( error ) {
                Y.log( `addCoverCardAndInstockConfigs_4_18: Error getting country mode:\n${error.stack || error}`, 'error', NAME );
                return callback( error );
            }

            if( !countryMode || !countryMode.includes( 'CH' ) ) {
                Y.log( 'addCoverCardAndInstockConfigs_4_18: Is not Swiss System. Exit migration.', 'info', NAME );
                return callback();
            }

            let
                ofacConnect, galexisConfig;
            try {
                ofacConnect = require( process.cwd() + '/ofac-connect.json' );
            } catch( e ) {
                Y.log( `addCoverCardAndInstockConfigs_4_18: ofac-connect configuration file not found.`, 'error', NAME );
            }

            if( ofacConnect ) {
                const saveIncaseConfigP = promisifyArgsCallback( Y.doccirrus.api.incaseconfiguration.saveConfig );
                [error] = await formatPromiseResult( saveIncaseConfigP( {
                    user: user,
                    data: {
                        inCaseConfig: {
                            coverCardOfacId: ofacConnect.ofacId,
                            coverCardZsrNo: ofacConnect.zsrNr,
                            coverCardSoftwareId: ofacConnect.softwareId,
                            coverCardSoftwareZsrNo: ofacConnect.softwareZsrNr,
                            coverCardUser: ofacConnect.ofacUser,
                            coverCardPass: ofacConnect.ofacPass,
                            coverCardCertPass: ofacConnect.certPass
                        }
                    }
                } ) );

                if( error ) {
                    Y.log( `addCoverCardAndInstockConfigs_4_18: Error updating incase configuration:\n${error.stack || error}`, 'error', NAME );
                }
            }

            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: 'instockconfiguration',
                migrate: true,
                data: Y.doccirrus.filters.cleanDbObject( Y.doccirrus.schemas.instockconfiguration.getDefaultData() )
            } ) );

            if( error ) {
                Y.log( `addCoverCardAndInstockConfigs_4_18: Failed to create new instockconfiguration.\nError: ${error}`, 'error', NAME );
            }

            try {
                galexisConfig = require( process.cwd() + '/galexis.json' );
            } catch( err ) {
                Y.log( `addCoverCardAndInstockConfigs_4_18: galexis.json configuration file not found.`, 'error', NAME );
            }

            if( galexisConfig ) {
                const saveInstockConfigP = promisifyArgsCallback( Y.doccirrus.api.instockconfiguration.saveConfig );
                [error] = await formatPromiseResult( saveInstockConfigP( {
                    user: user,
                    data: {
                        suppliersConfig: [{
                            supplier: 'galexis',
                            host: galexisConfig.host,
                            path: galexisConfig.path,
                            number: galexisConfig.number,
                            password: galexisConfig.password
                        }]
                    }
                } ) );

                if( error ) {
                    Y.log( `addCoverCardAndInstockConfigs_4_18: Error updating instock configuration:\n${error.stack || error}`, 'error', NAME );
                }
            }

            Y.log('Exiting addCoverCardAndInstockConfigs_4_18', 'info', NAME);
            return callback();
        }

        /**
         * Adds a scheinDate (fk4102) for old activities because now its a mandatory field. It also checks "Activity-Ketten".
         * @param user: inSuite user.
         * @returns {Promise<void>}
         */
        async function addActivityTimestampAsScheinDate_4_18( user, callback ) {
            Y.log( `Entering addActivityTimestampAsScheinDate_4_18 on ${user.tenantId}`, 'info', NAME );

            const
                getModelProm = util.promisify( Y.doccirrus.mongodb.getModel );

            let
                sequences = [],
                activityModel,
                err;

            [err, activityModel] = await formatPromiseResult( getModelProm( user, 'activity', true ) );

            if( err ) {
                Y.log( `addActivityTimestampAsScheinDate_4_18: Error while getting 'activity' model. Error: ${err.stack || err}`, 'error', NAME );
            }

            [err] = await formatPromiseResult( activityModel.mongoose.find( {
                scheinDate: null,
                actType: "SCHEIN",
                scheinSubgroup: {$in: ["27", "28"]}
            }, {}, {lean: true} ).cursor().eachAsync( async schein => {

                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'update',
                    migrate: true,
                    query: {
                        _id: schein._id
                    },
                    data: {scheinDate: schein.timestamp.toISOString()}
                } ) );

                if( err ) {
                    Y.log( `addActivityTimestampAsScheinDate_4_18: Error while updating activity. Error: ${err.stack || err}`, 'error', NAME );
                }

            } ) );

            if( err ) {
                Y.log( `addActivityTimestampAsScheinDate_4_18: Error while find schein activities by filter. Error: ${err.stack || err}`, 'error', NAME );
            }

            [err, sequences] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activitysequence',
                    migrate: true,
                    action: 'get',
                    query: {
                        activities:
                            {
                                "$elemMatch":
                                    {
                                        scheinDate: null,
                                        actType: "SCHEIN",
                                        scheinSubgroup: {$in: ["27", "28"]}
                                    }
                            }
                    }
                } )
            );

            if( err ) {
                Y.log( `addActivityTimestampAsScheinDate_4_18: Error while getting 'activitysequences'. Error: ${err.stack || err}`, 'error', NAME );
                return callback(err);
            }

            for( let sequence of sequences ) {
                sequence.activities.forEach( function( activity ) {
                    if( !activity.scheinDate && "SCHEIN" === activity.actType ) {
                        if( "27" === activity.scheinSubgroup || "28" === activity.scheinSubgroup ) {
                            activity.scheinDate = activity.timestamp.toISOString();
                        }
                    }
                } );
                [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activitysequence',
                    action: 'update',
                    query: {_id: sequence._id},
                    data: {
                        $set: {"activities": sequence.activities}
                    }
                } ) );

                if( err ) {
                    Y.log( `addActivityTimestampAsScheinDate_4_18: Error in updating activitysequence activities. ${err.message}`, 'error', NAME );
                    return callback(err);
                }
            }
        }

        function DCMigrate() {
        }

        let
            Migrate = require( 'dc-core' ).migrate,
            modMigrate = new DCMigrate(),

            // ----------------------------------------------------------------------

            // ----------------  Cumulative Migration Paths. ------------------------

            // -----------------------------------------------------------------begin

            /**
             *  These steps are guaranteed to be called up in order
             *  within each server type. The ordering of server types
             *  is
             *      PUC
             *      VPRC
             *      PRC
             *      DCPRC
             *  If a particular system is both DCPRC and VPRC  (VDCPRC),
             *  then certain steps may not be carried out.
             *
             *  NB: within VPRC, the migration steps defined here are carried
             *  out for EACH TENANT!  Admin VPRC info in db '0' should be
             *  migrated specially in the relevant mojit, as the VPRC can also
             *  act as DCPRC (NBB).
             *
             *  NBB:
             *        read as migrate FROM version  'x.x'
             *
             */

            migrationPathSteps = {
                '3.0': {
                    prc: [
                        migrateVirtualRepetitionToSchedule_3_0,
                        migratePatientCareLevel_3_0,
                        migrateCardioExportDate_3_0,
                        migrateMedicationData_3_0,
                        migrateLabdataContent_3_0,
                        migrateAge_3_0,
                        migrateReportingActType_3_0,
                        migrateArrivalTime_3_0
                    ],
                    vprc: [
                        migrateVirtualRepetitionToSchedule_3_0,
                        migratePatientCareLevel_3_0,
                        migrateCardioExportDate_3_0,
                        migrateMedicationData_3_0,
                        migrateLabdataContent_3_0,
                        migrateAge_3_0,
                        migrateReportingActType_3_0,
                        migrateArrivalTime_3_0
                    ]
                },
                '3.1': {
                    prc: [
                        migrateMarkersIcon_3_1,
                        migrateActivityStatusReport_3_1,
                        migrateSetLatestMedData_3_1,
                        migrateOmimCodes_3_1,
                        migrateMisassignedMediaImports_3_1,
                        migrateSpecialTreatmentInvoiceId
                    ],
                    vprc: [
                        migrateMarkersIcon_3_1,
                        migrateActivityStatusReport_3_1,
                        migrateSetLatestMedData_3_1,
                        migrateOmimCodes_3_1,
                        migrateSpecialTreatmentInvoiceId
                    ]
                },
                '3.2': {
                    prc: [
                        migrateMarkerIcons_3_2,
                        migrateAge_3_0,
                        migrateCasefolderless_3_2,
                        migrateErrorCaseFolderApproved_3_2,
                        migrateCheckReceiptTotalsOnInvoices_3_2,
                        migrateSetFormTranslationsToGerman_3_2
                    ],
                    vprc: [
                        migrateMarkerIcons_3_2,
                        migrateAge_3_0,
                        migrateCasefolderless_3_2,
                        migrateErrorCaseFolderApproved_3_2,
                        migrateCheckReceiptTotalsOnInvoices_3_2,
                        migrateSetFormTranslationsToGerman_3_2
                    ],
                    isd: [
                        migrateMarkerIcons_3_2,
                        migrateAge_3_0
                    ]
                },
                '3.3': {
                    prc: [
                        migratePatientLocalPracticeID_3_3,
                        migrateWorkListDobTemplate_3_3,
                        migrateMergeLabdata_3_3,
                        migrateMedicationActivityIngr_3_3,
                        migrateMedicationActivitySequenceIngr_3_3,
                        migrateMedicationCatalogUsageIngr_3_3,
                        migrateActivityPatientName_3_3,
                        migrateFlows_3_3,
                        makeTablesReadOnly_3_3
                    ],
                    vprc: [
                        migratePatientLocalPracticeID_3_3,
                        migrateWorkListDobTemplate_3_3,
                        migrateMergeLabdata_3_3,
                        migrateMedicationActivityIngr_3_3,
                        migrateMedicationActivitySequenceIngr_3_3,
                        migrateMedicationCatalogUsageIngr_3_3,
                        migrateActivityPatientName_3_3,
                        migrateFlows_3_3,
                        makeTablesReadOnly_3_3
                    ]
                },
                '3.4': {
                    prc: [
                        migrateCatalogUsageUnifiedSeq_3_4,
                        migrateActivityDiscriminator_3_4,
                        migrateMongoDbTo_3_4,
                        migratePatientsDDAndMM_3_4,
                        migrateBaseContactContactsToObjectId_3_4,
                        migratePatientsDDAndMM_3_4,
                        migrateCatalogUsage_3_4,
                        migratePatientIndexes_3_4
                    ],
                    vprc: [
                        migrateCatalogUsageUnifiedSeq_3_4,
                        migrateActivityDiscriminator_3_4,
                        migrateMongoDbTo_3_4,
                        migratePatientsDDAndMM_3_4,
                        migrateBaseContactContactsToObjectId_3_4,
                        migratePatientsDDAndMM_3_4,
                        migrateCatalogUsage_3_4,
                        migratePatientIndexes_3_4
                    ]
                },
                '3.5': {
                    prc: [
                        migrateSupportUsers_3_5,
                        migrateDeliverySettings_3_5,
                        migrateRulesMultiCaseFolderTypes_3_5,
                        migrateActivitySettings_3_5
                    ],
                    vprc: [
                        migrateSupportUsers_3_5,
                        migrateDeliverySettings_3_5,
                        migrateRulesMultiCaseFolderTypes_3_5,
                        migrateActivitySettings_3_5
                    ]
                },
                '3.6': {
                    prc: [
                        migratePhoneSignaling_3_6,
                        migratePhoneNumbersToHomogenisedFormat_3_6
                    ],
                    vprc: [
                        migratePhoneSignaling_3_6,
                        migratePhoneNumbersToHomogenisedFormat_3_6
                    ]
                },
                '3.7': {
                    prc: [
                        migrateIdentityRoles_3_7
                    ],
                    vprc: [
                        migrateIdentityRoles_3_7
                    ]
                },
                '3.8': {
                    prc: [
                        migrateCalendarRefsForStandardActType_3_8,
                        addInvoiceFactor2018Q1_3_8,
                        migrateInpacsConfiguration_3_8
                    ],
                    vprc: [
                        migrateCalendarRefsForStandardActType_3_8,
                        addInvoiceFactor2018Q1_3_8
                    ]
                },
                '3.9': {
                    prc: [
                        //setPatientScheinEmployeeIds_3_9,
                        migratePatientsPatientNo_3_9,
                        migrateReportingsPatientId_3_9,
                        migrateIdentityLocations_3_9,
                        migrateActivityRuleStatus_3_9
                    ],
                    vprc: [
                        //setPatientScheinEmployeeIds_3_9,
                        migratePatientsPatientNo_3_9,
                        migrateReportingsPatientId_3_9,
                        migrateIdentityLocations_3_9,
                        migrateActivityRuleStatus_3_9
                    ]

                },
                '3.10': {
                    dcprc: [migrateDSCK],
                    prc: [
                        migrateGkvInvoiceReceiver_3_10,
                        migratePatientsDDAndMM_3_4,
                        migrateCheckReceiptTotalsOnInvoices_3_2, // again, MOJ-9057,
                        migrateDeleteOldBrokenTasks_3_10,
                        migratePartnerConfiguration_3_10,
                        cleanAndBuildLabTestsAndTagscollection_3_10,
                        migratePatientDobToKbvDobInInpacsWorklist_3_10,
                        checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10
                    ],
                    vprc: [
                        migrateGkvInvoiceReceiver_3_10,
                        migratePatientsDDAndMM_3_4,
                        migrateCheckReceiptTotalsOnInvoices_3_2,
                        migrateDeleteOldBrokenTasks_3_10,
                        migratePartnerConfiguration_3_10,
                        cleanAndBuildLabTestsAndTagscollection_3_10,
                        checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10
                    ],
                    isd: [
                        checkAndCreateDatasafeBackupJobEntryInAdminsCollection_3_10
                    ]
                },
                '3.11': {
                    prc: [
                        migrateAllowAdhoc_3_11,
                        migratePatientEmployees_3_11,
                        migratePatientsPVSapprove_3_11,
                        migrateActivityttypeToScheduletype_3_11,
                        migrateProfileHost_3_11,
                        addLabDataAttributesInTagsCollection_3_11,
                        addMedDataAttributesInTagsCollection_3_11,
                        migrateLabDeviceDefaultLocation_3_11,
                        migrateBrokenScheinChains_3_11,
                        setAllReciprocalLinks_3_11,
                        killOrthancAndMMIProcessIfLicenseIsDisabled_3_11
                    ],
                    vprc: [
                        migrateAllowAdhoc_3_11,
                        migratePatientEmployees_3_11,
                        migratePatientsPVSapprove_3_11,
                        migrateActivityttypeToScheduletype_3_11,
                        migrateProfileHost_3_11,
                        addLabDataAttributesInTagsCollection_3_11,
                        addMedDataAttributesInTagsCollection_3_11,
                        migrateLabDeviceDefaultLocation_3_11,
                        migrateBrokenScheinChains_3_11,
                        setAllReciprocalLinks_3_11
                    ]
                },
                '4.0': {
                    prc: [
                        migrateMeasurementAddMDC_4_0,
                        migrateInPacsLanguage_4_0,
                        migratePatientDob_4_0,
                        migrateSetSimplifiedLabdata_4_0,
                        migrateInCaseConfiguration_4_0,
                        migrateSetPartnersBidirectional_4_0,
                        migrateDeleteOldSocketIOEvents_4_0
                    ],
                    vprc: [
                        migrateMeasurementAddMDC_4_0,
                        migrateInPacsLanguage_4_0,
                        migratePatientDob_4_0,
                        migrateSetSimplifiedLabdata_4_0,
                        migrateInCaseConfiguration_4_0,
                        migrateSetPartnersBidirectional_4_0,
                        migrateDeleteOldSocketIOEvents_4_0
                    ]
                },
                /*migrate 4.1 -> 4.2*/
                '4.1': {
                    prc: [
                        migrateSetBMIUnit_4_1,
                        migrateSetTaskTypeFieldForTask_4_1,
                        migrateSetKbvFocusFunctionalityKRWToFalse_4_1,
                        migrateCreateCardioConfiguration_4_1
                    ],
                    vprc: [
                        migrateSetBMIUnit_4_1,
                        migrateSetTaskTypeFieldForTask_4_1,
                        migrateSetKbvFocusFunctionalityKRWToFalse_4_1,
                        migrateCreateCardioConfiguration_4_1
                    ],
                    isd: [
                        migrateSetKbvFocusFunctionalityKRWToFalse_4_1,
                        migrateCreateCardioConfiguration_4_1
                    ]
                },
                /*migrate 4.2 -> 4.3*/
                '4.2': {
                    prc: [
                        migrateAddNewFieldsToInvoices_4_2,
                        migrateBudegts_4_2,
                        migratePatientDobHours_4_2,
                        migrateCheckCopiedImports_4_2,
                        migrateActivitySequencesDiagnose_4_2,
                        migrateKbvUtilityPrices_4_2,
                        migrateInCaseConfigurationValues_4_2,
                        deleteDanglingDeviceLogs_4_2,
                        disableTTLIndex_4_2,
                        migrateActivitySequencesNonDiagnose_4_2
                    ],
                    vprc: [
                        migrateAddNewFieldsToInvoices_4_2,
                        migrateBudegts_4_2,
                        migratePatientDobHours_4_2,
                        migrateCheckCopiedImports_4_2,
                        migrateActivitySequencesDiagnose_4_2,
                        migrateKbvUtilityPrices_4_2,
                        migrateInCaseConfigurationValues_4_2,
                        deleteDanglingDeviceLogs_4_2,
                        disableTTLIndex_4_2,
                        migrateActivitySequencesNonDiagnose_4_2
                    ]
                },
                /*migrate 4.3 -> 4.4*/
                '4.3': {
                    prc: [
                        migrateKbvUtilityPaidFreeStatus_4_3,
                        migrateInvoices_4_3,
                        migrateCorrectTotalReceipts_4_3,
                        addInvoiceFactor2019Q1_4_4,
                        migrateOwnRulesMeta_4_3,
                        removePlaceholderMarkers_4_3,
                        correctEBMPrices_4_3,
                        correctEBMKettePrices_4_3,
                        moveProxyConfigFromDbToDcCli_4_3 // This method restarts insuite and so MUST be placed as last method in the array
                    ],
                    vprc: [
                        migrateKbvUtilityPaidFreeStatus_4_3,
                        migrateInvoices_4_3,
                        migrateCorrectTotalReceipts_4_3,
                        addInvoiceFactor2019Q1_4_4,
                        migrateOwnRulesMeta_4_3,
                        removePlaceholderMarkers_4_3,
                        correctEBMPrices_4_3,
                        correctEBMKettePrices_4_3
                    ]
                },
                '4.4': {
                    prc: [
                        migrateImportedInsuranceStatus_4_4,
                        migrateActivitySettings_4_4,
                        migrateSetSimplifiedLabdata_4_0,        // Re-run this migration to add limit indicator / Grenzwert-Indikator for MOJ-10824
                        fixNumericFieldsFromXML_4_4,
                        migrateInvoicesLinkedActivities_4_4,
                        migrateCardioPartnerIds_4_4,
                        migrateInvoicesBilledDate_4_4,
                        moveProxyConfigFromDbToDcCli_4_3       // This method restarts insuite and so MUST be placed as last method in the array
                    ],
                    vprc: [
                        migrateImportedInsuranceStatus_4_4,
                        migrateActivitySettings_4_4,
                        migrateSetSimplifiedLabdata_4_0,
                        fixNumericFieldsFromXML_4_4,
                        migrateInvoicesLinkedActivities_4_4,
                        migrateCardioPartnerIds_4_4,
                        migrateInvoicesBilledDate_4_4,
                        moveProxyConfigFromDbToDcCli_4_3       // This method restarts insuite and so MUST be placed as last method in the array
                    ]
                },
                /*migrate 4.5 -> 4.6*/
                '4.5': {
                    prc: [
                        migrateMediaImportErrorField_4_5,
                        migratePatientsCountryMode_4_5,
                        migrateEmployeesCountryMode_4_5,
                        migrateLocationsCountryMode_4_5,
                        migrateTarmedTaxPointValues_4_5,
                        addMissingFormVersions_4_5,
                        correctDocumentsInSequences_4_5,
                        unsetGenerateAndPrintButtonOnInvoiceConfiguration_4_5,
                        fixGroupedRepetitionMembers_4_5
                    ],
                    vprc: [
                        migrateMediaImportErrorField_4_5,
                        migratePatientsCountryMode_4_5,
                        migrateEmployeesCountryMode_4_5,
                        migrateLocationsCountryMode_4_5,
                        migrateCompaniesCountryMode_4_5,
                        migrateTarmedTaxPointValues_4_5,
                        addMissingFormVersions_4_5,
                        correctDocumentsInSequences_4_5,
                        unsetGenerateAndPrintButtonOnInvoiceConfiguration_4_5,
                        fixGroupedRepetitionMembers_4_5
                    ],
                    dcprc: [
                        migrateCompaniesCountryMode_4_5
                    ]
                },
                /*migrate 4.6 -> 4.7*/
                '4.6': {
                    prc: [
                        setDefaultCountryToMyReports_4_6,
                        migrateDeliverysettingsToGKVDeliverySettings_4_6,
                        addInsuranceNamesToInvoices_4_6
                    ],
                    vprc: [
                        setDefaultCountryToMyReports_4_6,
                        migrateCompaniesDoctorsAmount_4_6,
                        migrateDeliverysettingsToGKVDeliverySettings_4_6,
                        addInsuranceNamesToInvoices_4_6
                    ],
                    dcprc: [
                        migrateCompaniesDoctorsAmount_4_6,
                        setDefaultCountryToMyReports_4_6
                    ]
                },
                /*migrate 4.7 -> 4.8*/
                '4.7': {
                    prc: [
                        migrateSetSimplifiedLabdata_4_7,
                        migrateSetLatestLabData_4_7,
                        migrateSetFormFolderIds_4_7
                    ],
                    vprc: [
                        migrateSetSimplifiedLabdata_4_7,
                        migrateSetLatestLabData_4_7,
                        migrateSetFormFolderIds_4_7
                    ]
                },
                /*migrate 4.8 -> 4.9*/
                '4.8': {
                    prc: [
                        migrateSetFormFolderLicenses_4_8,
                        migrateSetSimplifiedLabdata_4_0,
                        migrateSetLatestLabData_4_7,
                        migrateSetFormFolderCountryMode_4_8,
                        migrateSetAppRegData_4_9
                    ],
                    vprc: [
                        migrateSetFormFolderLicenses_4_8,
                        migrateSetSimplifiedLabdata_4_0,
                        migrateSetLatestLabData_4_7,
                        migrateSetFormFolderCountryMode_4_8
                    ],
                    isd: [
                        migrateSetFormFolderIds_4_7,
                        migrateSetFormFolderLicenses_4_8,
                        migrateSetFormFolderCountryMode_4_8
                    ]
                },
                /*migrate 4.9 -> 4.10*/
                '4.9': {
                    prc: [
                        migrateActivityContentTagsToBadgeSystem_4_9,
                        migrateTaxPointValues_4_9,
                        migrateSetAppRegData_4_10,
                        migrateDynamsoftProductKey_4_9,
                        addIsDeceasedAndInactiveFlag_4_9
                    ],
                    vprc: [
                        migrateActivityContentTagsToBadgeSystem_4_9,
                        migrateTaxPointValues_4_9,
                        migrateDynamsoftProductKey_4_9
                    ]
                },
                /*migrate 4.10 -> 4.11*/
                '4.10': {
                    prc: [
                        invalidateUpcomingEdmpDocs_4_10,
                        migrateMedLabDataCategories_4_10,
                        migrateSetAppRegData_4_11,
                        migrateMedicationPlan_4_10,
                        migrateScheduleTitle_4_10,
                        addActTypeToAttachments_4_10,
                        migrateMedicationPlanActivitySettings_4_10,
                        migrateMeddataFromIncaseConfiguration_4_10
                    ],
                    vprc: [
                        invalidateUpcomingEdmpDocs_4_10,
                        migrateMedLabDataCategories_4_10,
                        migrateMedicationPlan_4_10,
                        migrateScheduleTitle_4_10,
                        addActTypeToAttachments_4_10,
                        migrateMedicationPlanActivitySettings_4_10,
                        migrateMeddataFromIncaseConfiguration_4_10
                    ],
                    dcprc: [
                        migrateCompanyData_4_11
                    ]
                },
                /*migrate 4.11 -> 4.12*/
                '4.11': {
                    prc: [
                        migrateScheduleTitle_4_10,
                        migrateSalesStatusAndNormSize_4_11,
                        addAttachedMediaTags_4_11,
                        migrateActivityPatientNoAndKbvDob_4_11,
                        migrateCalendarReports_4_11
                    ],
                    vprc: [
                        migrateScheduleTitle_4_10,
                        migrateSalesStatusAndNormSize_4_11,
                        addAttachedMediaTags_4_11,
                        migrateActivityPatientNoAndKbvDob_4_11,
                        migrateCalendarReports_4_11
                    ]
                },
                /*migrate 4.12 -> 4.13*/
                '4.12': {
                    prc: [
                        migratePhSaleStatusActivitiesCh_4_14,
                        migrateMedicationSourceType_4_12
                    ],
                    vprc: [
                        migratePhSaleStatusActivitiesCh_4_14,
                        migrateMedicationSourceType_4_12
                    ]
                },
                /*migrate 4.13 -> 4.14*/
                '4.13': {
                    prc: [
                        migrateCancelledActivityReports_4_13,
                        migrateBasecontactStatus_4_13,
                        migrateStockDeliveriesStatus_4_13,
                        migrateActivityGtinVat_4_13,
                        migratePartnersCondition_4_13
                    ],
                    vprc: [
                        migrateCancelledActivityReports_4_13,
                        migrateBasecontactStatus_4_13,
                        migrateStockDeliveriesStatus_4_13,
                        migrateActivityGtinVat_4_13,
                        migratePartnersCondition_4_13
                    ]
                },
                /*migrate 4.14 -> 4.15*/
                '4.14': {
                    prc: [
                        migratePhSaleStatusInstockCh_4_14,
                        migratePhSaleStatusActivitiesCh_4_14,
                        migratePhSaleStatusCatalogueUsagesCh_4_14,
                        migrateStockLocations_4_14,
                        migrateMedicalScalingFactor_4_14,
                        migrateInvoiceRefLinkedActivities_4_14,
                        migrateMedidataRejectedInvoices_4_14
                    ],
                    vprc: [
                        migratePhSaleStatusInstockCh_4_14,
                        migratePhSaleStatusActivitiesCh_4_14,
                        migratePhSaleStatusCatalogueUsagesCh_4_14,
                        migrateStockLocations_4_14,
                        migrateMedicalScalingFactor_4_14,
                        migrateInvoiceRefLinkedActivities_4_14,
                        migrateMedidataRejectedInvoices_4_14
                    ]
                },
                /*migrate 4.15 -> 4.16*/
                '4.15': {
                    prc: [
                        migrateMedLabDataCategories_4_10, // run them again as there was an error before
                        updateMedDataItemsWithBoolInTextValueToBoolValue_4_15,
                        updateMedDataItemsInBooleanCategoriesWithoutAnyValue_4_15,
                        updateMedDataItemsWithDateInTextValueToDateValue_4_15,
                        migrateMedDataItemsVACCINATIONFromNumberToStringEnum_4_15,
                        migrateMedDataItemsWithPureNumericTextValueToNumberValue_4_15,
                        removeAllAMTSTags_4_15,
                        updateBoolCategoryMedDataTags_4_15,
                        migrateCatalogTexts_4_15,
                        migrateSetLatestMedData_4_15 // should come last, as it pushed changed values from above
                    ],
                    vprc: [
                        migrateMedLabDataCategories_4_10, // run them again as there was an error before
                        updateMedDataItemsWithBoolInTextValueToBoolValue_4_15,
                        updateMedDataItemsInBooleanCategoriesWithoutAnyValue_4_15,
                        updateMedDataItemsWithDateInTextValueToDateValue_4_15,
                        migrateMedDataItemsVACCINATIONFromNumberToStringEnum_4_15,
                        migrateMedDataItemsWithPureNumericTextValueToNumberValue_4_15,
                        removeAllAMTSTags_4_15,
                        updateBoolCategoryMedDataTags_4_15,
                        migrateCatalogTexts_4_15,
                        migrateSetLatestMedData_4_15 // should come last, as it pushed changed values from above
                    ]
                },
                /* migrate 4.16 -> 4.17 */
                '4.16': {
                    prc: [
                        migrateSetActionButtons_4_16,
                        migrateSetMirrorActivityActTypes_4_16,
                        migrateMedicationRefInMedicationPlanEntries_4_16
                    ],
                    vprc: [
                        migrateSetMirrorActivityActTypes_4_16,
                        migrateMedicationRefInMedicationPlanEntries_4_16
                    ]
                },
                /* migrate 4.17 -> 4.18 */
                '4.17': {
                    prc: [
                        addKimConfigDefaults_4_17
                    ],
                    vprc: [
                        addKimConfigDefaults_4_17
                    ],
                    dcprc: [
                        addinTiLicensePatternTo_4_17
                    ]
                },
                /* migrate 4.18 -> 4.19 */
                '4.18': {
                    prc: [
                        migrateSetAppRegData_4_18,
                        addCoverCardAndInstockConfigs_4_18,
                        addActivityTimestampAsScheinDate_4_18
                    ],
                    vprc: [
                        addCoverCardAndInstockConfigs_4_18,
                        addActivityTimestampAsScheinDate_4_18
                    ]
                }
            };

        // -------------------------------------------------------------------end

        // ----------------------------------------------------------------------

        // ----------------------------------------------------------------------

        DCMigrate.prototype.getMigrateFnChainExecutor = function( ver, sType, customPathSteps ) {
            let
                strId = 'v:' + ver + ' ' + sType + ': ',
                steps,
                async = require( 'async' ),
                totalSteps = 0;

            // an array of steps to carry out
            steps = customPathSteps && customPathSteps[ver] && customPathSteps[ver][sType] ||
                    migrationPathSteps[ver][sType];
            // In future we want to be able to carry out several of these in order
            // in case a PRC missed an update (this is currently not a requirement though)
            // PRC MUST always be up to date.
            if( Array.isArray( steps ) ) {
                totalSteps = steps.length;
            } else {
                steps = [];
            }

            Y.log( strId + 'migration steps: ' + totalSteps, 'debug', NAME );

            return function( user, callback ) {
                let
                    seriesSteps = steps.map( function( step, index ) {
                        return function( _cb ) {
                            Y.log( '>>> Migrating <<< Step ' + index + ' :' + user.tenantId, 'info', NAME );
                            step( user, ( err ) => {
                                if( err ) {
                                    Y.log( 'Error in Migration (continuing)! Step ' + index + ' :' + user.tenantId, 'error', NAME );
                                    Y.log( err, 'info', NAME );
                                    if( err.stack ) {
                                        Y.log( err.stack, 'debug', NAME );
                                    }
                                }
                                _cb();
                            } );
                        };
                    } );
                async.series( seriesSteps, callback );
            };
        };
        DCMigrate.prototype.doMigrate = function( callback ) {
            let
                path,
                chain = [],
                sTypePriority = ["puc", "vprc", "prc", "isd", "dcprc"],
                isUpdate = false,
                migrateFn,
                auth = Y.doccirrus.auth,
                util = require( 'util' ),
                user = Y.doccirrus.auth.getSUForLocal();

            function endMigrate( err ) {
                //path = getNextPath();
                if( err ) {
                    Y.log( 'Ending migrate with error ' + JSON.stringify( err ), 'error', NAME );
                }
                Y.log( 'Ending migrate DB process for ' + path.to, 'info', NAME );
                Y.log( "\n*** CHAIN MIGRATION DONE ***\n", 'info', NAME );
                migrating = false;

                // finalised migration
                Migrate.finishedMigratePath( path, isUpdate, callback );
            }

            function updatePath() {
                Y.log( "\n-- Done with " + path.from + ", continuing with v" + chain[0].ver + " --\n", 'info', NAME );
                path.from = chain[0].ver;
                modMigrate.bumpDbVersion( chain[0].ver, user, subMigrate );
            }

            function subMigrate() {
                if( chain.length > 0 ) {
                    if( path.from !== chain[0].ver ) {
                        updatePath();
                    } else if( chain[0].sTypes.length > 0 ) {
                        Y.log( "\n- Migrating " + chain[0].sTypes[0] + " to v" + chain[0].ver + " -\n", 'info', NAME );
                        let sType = chain[0].sTypes.shift();
                        migrateSType[sType]();
                    } else {
                        chain.shift();
                        if( chain.length > 0 ) {
                            updatePath();
                        } else {
                            endMigrate();
                        }
                    }
                } else {
                    endMigrate();
                }
            }

            let migrateSType = {

                "dcprc": function() {
                    if( auth.isDCPRC() ) {
                        Y.log( 'Migrate DCPRC DB process.', 'info', NAME );
                        migrateFn = modMigrate.getMigrateFnChainExecutor( path.from, 'dcprc' );
                        migrateFn( auth.getSUForLocal(), subMigrate );
                    } else {
                        subMigrate();
                    }
                },

                "prc": function() {
                    if( auth.isPRC() ) {
                        Y.log( 'Migrate PRC DB process.', 'info', NAME );
                        migrateFn = modMigrate.getMigrateFnChainExecutor( path.from, 'prc' );
                        migrateFn( auth.getSUForLocal(), subMigrate );
                    } else {
                        subMigrate();
                    }
                },

                "vprc": function() {
                    function final( err ) {
                        if( err ) {
                            console.error( err ); //eslint-disable-line no-console
                            // panic migration failure.
                            console.error( 'Migration failed: ' + err ); // eslint-disable-line no-console
                            process.exit( 44 );
                        }
                        subMigrate();
                    }

                    if( auth.isVPRC() ) {
                        Y.log( 'Migrate VPRC DB process.', 'info', NAME );
                        Migrate.eachTenantParallelLimit(
                            modMigrate.getMigrateFnChainExecutor( path.from, 'vprc' ),
                            null,
                            final );
                    } else {
                        subMigrate();
                    }
                },

                "puc": function() {
                    if( auth.isPUC() ) {
                        Y.log( 'Migrate PUC DB process.', 'info', NAME );
                        migrateFn = modMigrate.getMigrateFnChainExecutor( path.from, 'puc' );
                        migrateFn( auth.getSUForLocal(), subMigrate );
                    } else {
                        subMigrate();
                    }
                },

                "isd": function() {
                    if( auth.isISD() ) {
                        Y.log( 'Migrate ISD DB process.', 'info', NAME );
                        migrateFn = modMigrate.getMigrateFnChainExecutor( path.from, 'isd' );
                        migrateFn( auth.getSUForLocal(), subMigrate );
                    } else {
                        subMigrate();
                    }
                }

            };

            function printMigrateTree( chain ) {
                for( let i = 0; i < chain.length; i++ ) {
                    let a;
                    if( i < chain.length - 1 ) {
                        Y.log( "├─┬ " + "v" + chain[i].ver, 'info', NAME );
                        a = "│ ";
                    } else {
                        Y.log( "└─┬ " + "v" + chain[i].ver, 'info', NAME );
                        a = "  ";
                    }
                    for( let j = 0; j < chain[i].sTypes.length; j++ ) {
                        Y.log( a + (j < chain[i].sTypes.length - 1 ? "├── " : "└── ") + chain[i].sTypes[j], 'info', NAME );
                    }
                }
            }

            function beginMigrate( err, migratePath ) {
                path = migratePath;
                if( semver.gt( path.from + ".0", path.to + ".0" ) ) {
                    Y.log( 'Tried to migrate from ' + path.from + ' to ' + path.to + '. Stopping Process.', 'error', NAME );
                    Y.log( 'See beginMigrate in migrate.server.js to bypass this check during development.', 'info', NAME );

                    //  uncomment these next two lines when checking out a previous version in order to run your instances
                    //console.log( 'DO NOT COMMIT!' );
                    //return endMigrate();

                    process.exit( 44 );
                }

                chain = modMigrate.initChain( path, migrationPathSteps, sTypePriority );

                Y.log( "\n\n*** CHAIN MIGRATION ***\n", 'info', NAME );
                Y.log( "path: " + util.inspect( path ) + "\n", 'info', NAME );
                Y.log( "with resulting chain: ", 'info', NAME );
                printMigrateTree( chain );

                if( !migratePath || err ) {
                    // could be disastrous! therefore error.
                    Y.log( 'Invalid migration path returned, not Migrating. ' + err, 'error', NAME );
                    endMigrate();
                } else if( migratePath.from === migratePath.to && !migratePath.forceMigrate ) {
                    Y.log( 'No Migration required. ', 'info', NAME );
                    endMigrate();

                } else {
                    migrating = true;
                    isUpdate = true;
                    Y.log( 'Starting migrate DB process, from  ' + migratePath.from + ' to ' + migratePath.to, 'info', NAME );

                    // very simple first workflow: check which server type
                    // we are and do the TENANT migration steps for that.
                    // if a specific step requires per MODEL callup (auditing / facades)
                    // all asynchronously threaded together...
                    process.nextTick( subMigrate );
                }
            }

            Migrate.getMigratePath( beginMigrate );

        };

        /**
         * This call is coordinated by the DCDB.
         * @param {Function} callback
         */
        DCMigrate.prototype.init = function runMigrateService( callback ) {
            Y.log( 'init migration on ' + Y.doccirrus.ipc.whoAmI(), 'info', NAME );

            if( Y.doccirrus.ipc.isMaster() ) {
                Y.log( '**Starting DCMigrate**', 'info', NAME );
                Migrate.init( Y ); // give access to logging, schemas
                modMigrate.doMigrate( callback );

            } else {
                Migrate.finishedMigratePath( null, null, callback ); // workers do not enter the migrate stage.
            }
        };

        DCMigrate.prototype.bumpDbVersion = function( ver, user, cb ) {
            let data = {dbVersion: ver};
            Y.doccirrus.filters.setSkipCheck( data, true );
            Y.doccirrus.mongodb.runDb( {
                migrate: true,
                user: user || Y.doccirrus.auth.getSUForLocal(),
                model: 'admin',
                action: 'put',
                fields: 'dbVersion',
                query: {_id: Y.doccirrus.schemas.admin.getId()},
                data: data,
                callback: cb
            } );
        };

        DCMigrate.prototype.initChain = function( path, migrationPathSteps, sTypePriority ) {
            let _chain = [];
            //go through all migration steps and pick those which are new for the db
            for( let ver in migrationPathSteps ) {
                if( migrationPathSteps.hasOwnProperty( ver ) ) {
                    if( semver.gte( ver + ".0", path.from + ".0" ) && semver.lt( ver + ".0", path.to + ".0" ) ) {
                        _chain.push( {ver: ver, sTypes: []} );
                        for( let sType in migrationPathSteps[ver] ) {
                            if( migrationPathSteps[ver].hasOwnProperty( sType ) ) {
                                _chain[_chain.length - 1].sTypes.push( sType );
                            }
                        }
                        //sort sTypes by sTypePriority order
                        _chain[_chain.length - 1].sTypes.sort( ( a, b ) => sTypePriority.indexOf( a ) - sTypePriority.indexOf( b ) ); // jshint ignore:line
                    }
                }
            }
            //sort versions, just to be sure
            _chain.sort( ( a, b ) => semver.compare( a.ver + ".0", b.ver + ".0" ) );
            return _chain;
        };

        DCMigrate.prototype.isMigrating = function() {
            return migrating;
        };

        Y.namespace( 'doccirrus' ).migrate = modMigrate;

    },
    '0.0.1', {
        requires: [
            'oop',
            'dcforms-assethelper',
            'dcforms-migrationhelper',
            'document-migrate-2-8',
            'dc-comctl',
            'dccommonutils',
            'dccommonerrors',
            'dcregexp',
            'dckbvdate',
            'casefolder-api',
            'scheduletype-api',
            'person-schema',
            'patientportal-api',
            'dcmedia-store',
            'role-schema',
            'casefolder-schema',
            'activitysettings-schema',
            'catalogusage-api',
            'incasemojit-migrationhelper',
            'insight2-migrationhelper',
            'schemautils',
            'location-schema',
            'invoiceconfiguration-schema',
            'v_meddata-schema'
        ]
    }
);
