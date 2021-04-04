/**
 * User: maximilian.kramp
 * Date: 12/15/20  12:46 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

// noinspection JSNonASCIINames

YUI.add( 'okfe_export-api', function( Y, NAME ) {

        const
            {mkdir, readFile, readdir} = require( 'fs' ).promises,
            {basename, join} = require( 'path' ),
            getTmpDir = Y.doccirrus.tempFileManager.get,
            ObjectId = require( 'mongodb' ).ObjectID,
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            createFileWriter = Y.doccirrus.edocFileWriter.createFileWriter,
            exportFileName = 'export.zip';

        function storeFile( user, fileName, buff ) {
            return new Promise( function( resolve, reject ) {
                Y.doccirrus.gridfs.store( user, fileName, {
                    content_type: 'application/zip'
                }, buff, ( err, id ) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( id );
                } );
            } );
        }

        function getFile( user, id ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.gridfs.get( user, id, ( err, result ) => {
                    if( err ) {
                        reject( err );
                    } else {
                        resolve( result );
                    }
                } );
            } );
        }

        async function getLocationsWithDocuments( {user, formName, data} ) {
            return await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'document',
                action: 'aggregate',
                pipeline: [
                    {
                        $match: {
                            'formState.formName': formName,
                            type: 'FORM',
                            activityId: {$exists: true},
                            patientId: {$exists: true},
                            caseFolderId: {$exists: true},
                            formId: {$exists: true}
                        }
                    },
                    {
                        $addFields: {
                            activityIdObj: {$toObjectId: '$activityId'}
                        }
                    },
                    {
                        $lookup: {
                            from: 'activities',
                            localField: 'activityIdObj',
                            foreignField: '_id',
                            as: 'activity'
                        }
                    },
                    {
                        $match: {
                            'activity.timestamp': {
                                $gte: new Date( data.timestamp.$gte ),
                                $lte: new Date( data.timestamp.$lte )
                            }
                        }

                    },
                    {
                        $group: {
                            _id: {
                                locationId: '$locationId'
                            },
                            documents: {$addToSet: '$$ROOT'}
                        }
                    },
                    {
                        $project: {
                            locationId: '$_id.locationId',
                            documents: '$documents'
                        }
                    }
                ]
            } );
        }

        async function getActivitiesByIds( {user, activityIds} ) {
            return await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'activity',
                query: {
                    _id: {
                        $in: activityIds
                    }
                },
                options: {
                    lean: true
                }
            } );
        }

        async function getPatientsByIds( {user, patientIds} ) {
            return await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'patient',
                query: {
                    _id: {
                        $in: patientIds
                    }
                },
                options: {
                    lean: true
                }
            } );
        }

        async function getEmployeesByIds( {user, employeeIds} ) {
            return await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'employee',
                query: {
                    _id: {
                        $in: employeeIds
                    }
                },
                options: {
                    lean: true
                }
            } );
        }

        async function getLocation( {user, locationId} ) {
            return await Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'location',
                query: {
                    _id: ObjectId( locationId )
                },
                options: {
                    lean: true
                }
            } );
        }

        function notify( user, message, type ) {
            Y.doccirrus.communication.emitEventForUser( {
                targetId: user.identityId,
                event: 'okfeFormsExportFinished',
                eventType: Y.doccirrus.schemas.socketioevent.eventTypes.NODB,
                msg: {
                    data: {
                        message,
                        type: type || 'ok'
                    }
                }
            } );
        }

        async function processForms( args ) {
            const {user, inputDir, tmpDir, data} = args;
            const exportDate = new Date();
            const formNames = [
                'ZKA',
                'ZKH',
                'ZKP',
                'ZKZ'
            ];
            const inputFiles = [];
            let err;

            for( let formName of formNames ) {
                let results;
                [err, results] = await formatPromiseResult( getLocationsWithDocuments( {user, formName, data} ) );
                if( err ) {
                    Y.log( `processForms: could not get locations with documents for zervix form name ${formName}: ${err.stack || err}}`, 'warn', NAME );
                    continue;
                }
                if( !results || !results.result || !Array.isArray( results.result ) || !results.result.length ) {
                    Y.log( `processForms: no valid documents for ${formName}`, 'warn', NAME );
                    continue;
                }
                for( let locationIdWithDocuments of results.result ) {
                    const activityIds = locationIdWithDocuments.documents.map( document => ObjectId( document.activityId ) );
                    let activities;
                    [err, activities] = await formatPromiseResult( getActivitiesByIds( {user, activityIds} ) );
                    if( err ) {
                        Y.log( `processForms: could not get activities by ids ${activityIds}: ${err.stack || err}}`, 'warn', NAME );
                        continue;
                    }

                    const patientIds = activities.map( activity => ObjectId( activity.patientId ) );
                    const employeeIds = activities.map( activity => ObjectId( activity.employeeId ) );

                    let patients;
                    [err, patients] = await formatPromiseResult( getPatientsByIds( {user, patientIds} ) );
                    if( err ) {
                        Y.log( `processForms: could not get patients by ids ${patientIds}: ${err.stack || err}}`, 'warn', NAME );
                        continue;
                    }

                    let employees;
                    [err, employees] = await formatPromiseResult( getEmployeesByIds( {user, employeeIds} ) );
                    if( err ) {
                        Y.log( `processForms: could not get employees by ids ${employeeIds}: ${err.stack || err}}`, 'warn', NAME );
                        continue;
                    }

                    let location;
                    [err, location] = await formatPromiseResult( getLocation( {
                        user,
                        locationId: locationIdWithDocuments.locationId
                    } ) );
                    if( err ) {
                        Y.log( `processForms: could not get location by id ${locationIdWithDocuments.locationId}: ${err.stack || err}}`, 'warn', NAME );
                        continue;
                    }
                    if( !location || !Array.isArray( location ) || !location.length ) {
                        continue;
                    }
                    location = location[0];

                    const destination = join( inputDir, `${formName}_${locationIdWithDocuments.locationId}.xml` );

                    const context = {
                        formName,
                        activities: activities,
                        documents: locationIdWithDocuments.documents,
                        employees: employees,
                        location: location,
                        patients: patients
                    };

                    const writer = createFileWriter( {
                        destination,
                        isUTF8: true,
                        user
                    } );

                    [err] = await formatPromiseResult( Y.doccirrus.okfeFileBuilder.buildDocXml( {context, writer} ) );

                    if( err ) {
                        Y.log( `could not create zervix docs: ${err.stack || err}`, 'warn', NAME );
                        continue;
                    }
                    inputFiles.push( destination );
                }
            }

            const pm = Y.doccirrus.okfe.dpp.getPm( {
                quarter: 'latest',
                year: 'latest',
                type: 'OKFE'
            } );

            let validationResults;
            [err, validationResults] = await formatPromiseResult( pm.execute( {tmpDir, inputDir} ) );
            if( err ) {
                let message = `could not validate zervix docs: ${err.stack || err}`;
                Y.log( message, 'warn', NAME );
                return;
            }
            Y.log( `processForms: create zervix docs`, 'info', NAME );

            Y.log( `processForms: write docs to ${inputFiles} with results ${validationResults}`, 'info', NAME );

            [err] = await formatPromiseResult( Y.doccirrus.edmputils.makeZip( exportFileName, 'output/*', tmpDir ) );

            if( err ) {
                let message = `processForms: could not zip exported docs: ${err.stack || err}`;
                Y.log( message, 'warn', NAME );
                return;
            }

            Y.log( `processForms: created export archive`, 'info', NAME );

            let buffer;
            const exportZipFilePath = readFile( join( tmpDir, exportFileName ) );
            [err, buffer] = await formatPromiseResult( exportZipFilePath );

            if( err ) {
                const msg = `could not read zip export from ${exportZipFilePath}: ${err.stack || err}`;
                Y.log( msg, 'warn', NAME );
                return;
            }

            let exportZipId;
            [err, exportZipId] = await formatPromiseResult( storeFile( user, exportFileName, buffer ) );
            if( err ) {
                const msg = `processForms: could not store zip export: ${err.stack || err}`;
                Y.log( msg, 'warn', NAME );
                return;
            }

            const htmlDirPath = join( tmpDir, 'output', 'html', 'files' );
            let htmlDirContents;
            [err, htmlDirContents] = await formatPromiseResult( readdir( htmlDirPath ) );
            if( err ) {
                const msg = `processForms: could not read exported html dir ${htmlDirPath}: ${err.stack || err}`;
                Y.log( msg, 'warn', NAME );
                return;
            }

            const htmlFiles = [];

            for( let htmlFileName of htmlDirContents ) {
                const htmlFilePath = join( htmlDirPath, htmlFileName );
                let htmlFileBuffer;
                [err, htmlFileBuffer] = await formatPromiseResult( readFile( htmlFilePath ) );
                if( err ) {
                    const msg = `processForms: could not read exported html file at ${htmlFilePath}: ${err.stack || err}`;
                    Y.log( msg, 'warn', NAME );
                    return;
                }

                let htmlFileId;
                [err, htmlFileId] = await formatPromiseResult( storeFile( user, htmlFileName, htmlFileBuffer ) );
                if( err ) {
                    const msg = `processForms: could not store exported html file: ${err.stack || err}`;
                    Y.log( msg, 'warn', NAME );
                    return;
                }

                htmlFiles.push( {fileId: htmlFileId, fileName: htmlFileName} );
            }

            const fileNames = inputFiles.map( inputFile => basename( inputFile ) ).join( ', ' );
            const okfeExport = {
                exportZipId,
                exportDate,
                nDocs: inputFiles.length,
                htmlFiles,
                fileNames,
                skipcheck_: true
            };

            let results;
            [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'post',
                model: 'okfe_export',
                data: okfeExport
            } ) );

            if( err ) {
                const msg = `processForms: could post okfe_export: ${err.stack || err}`;
                Y.log( msg, 'warn', NAME );
                return;
            }

            Y.log( `processForms: finished export: ${results}`, 'info', NAME );
            notify( user );
        }

        /**
         * function to generate zervix XMLs
         * @method exportXMLs
         * @param {Object} args
         * @param {Object} args.data - data params.
         * @param {Object} args.data.timestamp - Datetimestamp.
         * @param {Function} args.callback - callback.
         * @param {module:authSchema.auth} args.user - User Object.
         *
         * @return {Function} returns Frontend Callback.
         */
        async function exportXMLs( args ) {
            const {user, callback} = args;

            let [err, tmpDir] = await formatPromiseResult( getTmpDir( user, 'okfe' ) );
            if( err ) {
                Y.log( `could not get temp dir to create zervix docs: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            const inputDir = join( tmpDir.path, 'input' );

            [err] = await formatPromiseResult( mkdir( inputDir ) );
            if( err ) {
                Y.log( `could not create directory for xml files at ${inputDir}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            setTimeout( () => {
                processForms( {...args, inputDir, tmpDir: tmpDir.path} );
            } );
            return handleResult( null, {tmpDir: tmpDir.path, processing: true}, callback );

        }

        async function getHTML( args ) {
            const {user, query, callback} = args;

            if( !query.fileId ) {
                return handleResult( Error( 'missing params' ), undefined, callback );
            }
            let [err, file] = await formatPromiseResult( getFile( user, query.fileId ) );
            if( err ) {
                Y.log( `could not get html for file id ${query.fileId}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( null, file.data.toString( 'base64' ), callback );
        }

        async function getLastExport( args ) {
            const {user, callback} = args;

            let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                action: 'get',
                model: 'okfe_export',
                query: {},
                options: {
                    sort: {_id: -1},
                    limit: 1
                }
            } ) );
            if( err ) {
                Y.log( `getLastExport: could not fetch last export: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            return handleResult( null, results, callback );
        }

        Y.namespace( 'doccirrus.api' ).okfe_export = {
            name: NAME,
            exportXMLs,
            getHTML,
            getLastExport
        };

    },
    '0.0.1', {
        requires: [
            'dcmongodb',
            'dcerror',
            'activity-api',
            'okfe-dpp',
            'okfe-filebuilder',
            'okfe_export-schema'
        ]
    }
);
