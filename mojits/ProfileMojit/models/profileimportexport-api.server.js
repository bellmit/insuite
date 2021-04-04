/*global YUI */


YUI.add( 'profileimportexport-api', function( Y, NAME ) {

        const
            { formatPromiseResult } = require( 'dc-core' ).utils,
            async = require( 'async' ),
            _ = require( 'lodash' ),
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            exportDir = Y.doccirrus.auth.getTmpDir() + '/export/',
            metaFileName = 'profiles_meta.json',
            NOT_PROVIDED = 'Eigene Einträge';

        function makeExportDir( user, callback ) {
            let
                tenantDir = exportDir + (user.tenantId ? user.tenantId : '') + '/';

            tenantDir = tenantDir.replace( '//', '/0/' );

            function onMkDir( err ) {
                if( err ) {
                    callback( err );
                    return;
                }
                callback( null, tenantDir );
            }

            Y.doccirrus.media.mkdirIfMissing( tenantDir, onMkDir );
        }

        function getExportData( user, model, pipeline, callback ) {
            Promise.resolve(
                Y.doccirrus.mongodb.runDb( {
                    user, model,
                    action: 'aggregate',
                    pipeline
                })
            )
                .then( res => {
                    if( res.result.length ) {
                        res.result.forEach( profile => {
                            profile.lastWorkStationName = profile.lastWorkStationName.name;
                        } );
                    }
                    return callback( null, res.result );
                } )
                .catch( err => {
                    return callback( err );
                } );
        }

        function loadMetadata( path, filename, next ) {
            Y.doccirrus.media.readFile( path + filename, path, ( err, result ) => {
                if( !err && result.length ) {
                    result = JSON.parse( result );
                }
                if( err && -2 === err.errno ) {
                    err = null;
                }
                next( err, result || [] );
            } );
        }

        function listSetOnDB( args ) {
            Y.log('Entering Y.doccirrus.api.profileimportexport.listSetOnDB', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.profileimportexport.listSetOnDB');
            }
            const
                { query, user } = args,
                { workStation } = args.originalParams,
                model = 'profile',
                Prom = require( 'bluebird' ),
                runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );

            let
                promise;

            if( null === workStation ) {
                promise = runDb( {
                    action: 'aggregate',
                    pipeline: [
                        {$match: query},
                        {$project: {workStation: {$ifNull: ['$workStation', '']}, userId: 1}},
                        {$group: {_id: '$workStation', totalCount: {$sum: 1}, userId: {$first: '$userId'}}},
                        {
                            $project: {
                                workStation: {$cond: [{$eq: ['$_id', '']}, NOT_PROVIDED, '$_id']},
                                totalCount: 1,
                                userId: 1
                            }
                        },
                        {$sort: {workStation: 1}}
                    ],
                    model: model,
                    user: user,
                    options: Object.assign( args.options, {lean: true} )
                } );
            } else {
                promise = runDb( {
                    action: 'get',
                    model: model,
                    user: user,
                    query: query,
                    options: Object.assign( args.options, {lean: true} )
                } );
            }

            promise.then( results => {
                return args.callback( null, results );
            } ).catch( err => {
                return args.callback( err );
            } );
        }

        function listSetOnDisk( args ) {
            Y.log('Entering Y.doccirrus.api.profileimportexport.listSetOnDisk', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.profileimportexport.listSetOnDisk');
            }
            const
                { user, callback } = args,
                { workStation } = args.originalParams;

            let
                dir = null,
                metaDataFromDisk = [],
                metaDataFromDisk_oldProfiles = [],
                metaDataFromDisk_newProfiles = [];

            async.waterfall( [
                ( next ) => makeExportDir( user, next ),
                ( expDir, next ) => {
                    dir = expDir;
                    loadMetadata( dir, metaFileName, next );
                },
                ( loadedMetadata, next ) => {
                    metaDataFromDisk = loadedMetadata;

                    metaDataFromDisk.forEach( item => {
                        item.oldProfile = !!item.profileHost; // if  there is a profileHost field, it is an old profile.
                    });

                    metaDataFromDisk_oldProfiles = metaDataFromDisk.filter( item => item.oldProfile );
                    metaDataFromDisk_newProfiles = metaDataFromDisk.filter( item => !item.oldProfile );

                    if( null === workStation ) {
                        let groupsObj_oldProfiles =  _.groupBy( metaDataFromDisk_oldProfiles, 'profileHost' ) || {};
                        let groupsObj_newProfiles =  _.groupBy( metaDataFromDisk_newProfiles, 'workStation' ) || {};
                        let groupsObj = { ...groupsObj_oldProfiles, ...groupsObj_newProfiles };

                        metaDataFromDisk = Object.keys( groupsObj ).map( key => {
                            return {
                                workStation: ( '' === key ) ? NOT_PROVIDED : key,
                                totalCount: (groupsObj[key] || []).length,
                                userId: groupsObj[key] && groupsObj[key].length && groupsObj[key][0].userId,
                                _id: key,
                                oldProfile: !!(groupsObj[key] && groupsObj[key].length && groupsObj[key][0].profileHost),
                                lastWorkStationName: groupsObj[key] && groupsObj[key].length && groupsObj[key][0].lastWorkStationName
                            };
                        } );
                        metaDataFromDisk = _.sortBy( metaDataFromDisk, 'workStation' );
                    } else {
                        metaDataFromDisk = metaDataFromDisk.filter( el => {
                            return ( el.profileHost && el.profileHost === workStation ) || ( el.workStation && el.workStation === workStation );
                        });
                        metaDataFromDisk = _.sortByAll( metaDataFromDisk, [ 'profileLabel'] );
                    }

                    next();
                }
            ], ( err ) => {
                if( err ) {
                    Y.log( 'Error during listing of profile import/export directory: ' + JSON.stringify( err ) + 'error' );
                }
                callback( err, metaDataFromDisk );
            } );
        }

        function exportSet( args ) {
            Y.log('Entering Y.doccirrus.api.profileimportexport.exportSet', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.profileimportexport.exportSet');
            }
            const
                {user, callback, data} = args;


            let
                dir = null,
                exportData = [],
                metaDataFromDisk = [],
                metaData = [],
                entry = data && data.entry || {},
                queryPipeline,
                queryPipelineMatch;

            if ( data.ruleId || '' === data.ruleId ) {
                if ( data.leaf ) {
                    queryPipelineMatch = {
                        $match: { _id: ObjectId(data.ruleId) }
                    };
                } else {
                    queryPipelineMatch ={
                        $match: {
                            workStation: ObjectId(data.ruleId),
                            $or: [ {userId: entry.userId}, {commonProfile: true} ]
                        }
                    };
                }
            } else {
                queryPipelineMatch = {
                    $match: { $or: [ {userId: entry.userId},  {commonProfile: true} ] }
                };
            }

            queryPipeline = [
                queryPipelineMatch,
                {
                    $lookup: {
                        from: "workstations",
                        localField: "workStation",
                        foreignField: "_id",
                        as: "lastWorkStationName"
                    }
                },
                {$unwind: "$lastWorkStationName"}
            ];

            Y.log( `Exporting profile ${data.ruleId}`, 'info', NAME );

            async.waterfall( [
                ( next ) => {
                    makeExportDir( user, next );
                },
                ( expDir, next ) => {
                    dir = expDir;
                    loadMetadata( dir, metaFileName, next );
                },
                ( loadedMetadata, next ) => {
                    metaDataFromDisk = loadedMetadata;
                    getExportData( user, 'profile', queryPipeline, next );
                },
                ( expData, next ) => {
                    exportData = expData;
                    function iterator( profile, cb ) {
                        let profileId = profile._id.toString(),
                            filtered = metaData.filter( mtd => {
                                return mtd._id === profileId && (!entry.userId || mtd.userId === entry.userId);
                            } );

                        if( !filtered.length ) {
                            metaData.push( {
                                _id: profileId,
                                userId: profile.userId,
                                profileLabel: profile.profileLabel,
                                workStation: profile.workStation,
                                commonProfile: profile.commonProfile,
                                lastWorkStationName: profile.lastWorkStationName
                            } );

                        }
                        Y.doccirrus.media.writeFile( dir + 'profile_' + profileId + '.json', dir, JSON.stringify( _.omit( profile, ["__v", "user_"] ) ), cb );
                    }

                    async.eachLimit( exportData, 200, iterator, ( err ) => {
                        next( err );
                    } );

                },
                ( next ) => {
                    //merge loaded array of metadata with newly exported
                    metaData.forEach( ( el ) => {
                        let filtered = metaDataFromDisk.filter( mdt => mdt._id === el._id.toString() && (!entry.userId || mdt.userId === entry.userId));
                        if( !filtered.length ) {
                            metaDataFromDisk.push( el );
                        }
                    } );

                    Y.doccirrus.media.writeFile( dir + metaFileName, dir, JSON.stringify( metaDataFromDisk ), next );
                },
                ( next ) => {
                    Y.log( 'Successfully exported ' + exportData.length.toString() + ' profiles.', 'info' );
                    next();
                }
            ], ( err ) => {

                if( err ) {
                    Y.log( 'Error during profiles export: ' + JSON.stringify( err ) + 'error' );
                }

                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: args.user.sessionId,
                    event: 'ruleExportDone',
                    msg: {
                        data: {
                            error: err
                        }
                    }
                } );
            } );

            callback( null );
        }


        function importSet( args ) {
            Y.log('Entering Y.doccirrus.api.profileimportexport.importSet', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.profileimportexport.importSet');
            }
            const
                {user, callback, data} = args,
                isImport = args.import || false,
                model = 'profile';

            let
                dir = null,
                metaDataFromDisk = [],
                dataFromDisk = [];

            Y.log( `Importing profiles with id ${data.ruleId}`, 'info', NAME );

            async.waterfall( [
                ( next ) => {
                    makeExportDir( user, next );
                },
                ( expDir, next ) => {
                    dir = expDir;
                    loadMetadata( dir, metaFileName, next );
                },
                ( loadedMetadata, next ) => {
                    metaDataFromDisk = loadedMetadata;

                    let
                        filtered = metaDataFromDisk.filter( el => ( !data.ruleId && '' !== data.ruleId ) || ( data.leaf && el._id === data.ruleId ) || ( !data.leaf && !data.entry.oldProfile && el.workStation === data.ruleId ) || ( !data.leaf && data.entry.oldProfile && el.profileHost === data.ruleId ) );

                    if( !filtered.length ) {
                        return next();
                    }

                    async.eachLimit( filtered, 200, iterator, ( err ) => {
                        next( err );
                    } );

                    function iterator( profileMeta, cb ) {
                        Y.doccirrus.media.readFile( dir + 'profile_' + profileMeta._id + '.json', dir, ( err, result ) => {
                            if( !err && result ) {
                                dataFromDisk.push( JSON.parse( result ) );
                            }
                            cb( err );
                        } );
                    }
                },
                ( next ) => {
                    if( !dataFromDisk.length ) {
                        return next();
                    }

                    async.eachLimit( dataFromDisk, 1, iterator, ( err ) => {
                        next( err );
                    } );

                    function escapeRegExp(text) { //https://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
                        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                    }

                    async function iterator( profile, cb ) {
                        let
                            err,
                            result;
                        //if importExport is started from admin setting then all imported profiles treated as common
                        if( true === data.fromSettings ){
                            profile.commonProfile = true;
                        } else { //it activated from profile, so all imports become user profiles
                            profile.commonProfile = false;
                        }

                        function checkForMatchingWorkStation( workStationName ) {
                            return formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'workstation',
                                    action: 'get',
                                    query: {
                                        $or: [
                                            {humanId: workStationName.replace( /\s+/g, '' )},
                                            {name: workStationName}
                                        ]
                                    }
                                } )
                            );
                        }

                        function createNewWorkStation( workStation ) {
                            return formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    model: 'workstation',
                                    action: 'post',
                                    data: Y.doccirrus.filters.cleanDbObject( workStation )
                                } )
                            );
                        }
                // Dealing with old profiles (for transition to inSuite 4.0) -------------------------------------------
                    // Old profiles are recognized by the presence of the 'profileHost' field
                    // If the profile is an old profile:
                    // 1) either it needs to be linked to an existing work station with the appropriate name.
                    // 2) or a work station needs to be created for it.
                        if( profile.profileHost ) {
                        // 1) Checking for a work station with  the profileHost value as name ••••••••••••••••••••••••••
                            [err, result] = await checkForMatchingWorkStation( profile.profileHost );

                            if( err ) {
                                Y.log( `Error on looking for matching work stations for old profile type ${err.message}`, 'error', NAME );
                                return next( err );
                            }

                        // 2) Creating new work station document if no matching name was found •••••••••••••••••••••••••
                            if( !(result && Array.isArray( result ) && result.length) ) {

                                const workStation = {
                                    humanId: profile.profileHost.replace( /\s+/g, '' ), // removing spaces
                                    name: profile.profileHost
                                };

                                [err, result] = await createNewWorkStation( workStation );

                                if( err ) {
                                    Y.log( `Error on creating new work station for old profile type ${err.message}`, 'error', NAME );
                                    return next( err );
                                }
                            }

                            if( result && Array.isArray( result ) && result.length ) {
                                profile.workStation = result[0]._id || result [0];
                            }
                        }
                // END: Dealing with old profiles (for transition to inSuite 4.0) --------------------------------------

                // Dealing with new profiles ---------------------------------------------------------------------------
                    // New profiles are recognized by the absence of the 'profileHost' field
                        // If the profile is a new profile type:
                        // 1) it will keep the linked to its work station if it still exists.
                        // 2) else if a work station with the same name exists it is used, otherwise a new work station is created.
                    if ( !profile.profileHost ) {
                        // 1) Checking for the work station reference ••••••••••••••••••••••••••••••••••••••••••••••••••
                        [err, result] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'workstation',
                                action: 'get',
                                query: { _id: profile.workStation }
                            } )
                        );

                        if ( err ) {
                            Y.log( `Error on looking for work station reference for new profile type ${err.message}`, 'error', NAME );
                            return next( err );
                        }
                        // 2) Getting a new reference ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                        if ( !(result && Array.isArray(result) && result.length) ) {
                            // i) Checking if a work station with the same name exists..................................
                            [err, result] = await checkForMatchingWorkStation( profile.lastWorkStationName );

                            if ( err ) {
                                Y.log( `Error on looking for matching work stations for old profile type ${err.message}`, 'error', NAME );
                                return next( err );
                            }
                            // ii) Create a new work station if no match was found......................................
                            if ( !(result && Array.isArray(result) && result.length) ) {
                                const workStation = {
                                    humanId: profile.lastWorkStationName.replace( /\s+/g, '' ), // removing spaces
                                    name: profile.lastWorkStationName
                                };

                                [err, result] = await createNewWorkStation( workStation );

                                if( err ) {
                                    Y.log( `Error on creating new work station for new profile type with missing reference ${err.message}`, 'error', NAME );
                                    return next( err );
                                }
                            }

                            if ( result && Array.isArray(result) && result.length ) {
                                profile.workStation = result[0]._id || result [0];
                            }
                        }
                    }
                // END: Dealing with new profiles ----------------------------------------------------------------------

                        let labelLike = new RegExp( '^' + escapeRegExp(profile.profileLabel) + '(?: \\([0-9]+\\)){0,1}$' ),
                            importId = new ObjectId( profile._id );
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: model,
                            action: 'get',
                            query: {
                                _id: {$ne: importId },
                                userId: user.id,
                                profileLabel: labelLike,
                                workStation: profile.workStation
                            },
                            options: {
                                select: {profileLabel: 1}
                            }
                        }, (err, result) => {
                            delete profile._id;
                            let cnt = result.length;
                            (result || []).forEach( el => {
                                let match = / \(([0-9]+)\)$/.exec(el.profileLabel),
                                    copyNumber = match && match[1] && Number.parseInt(match[1]); //  eslint-disable-line radix
                                cnt = ( copyNumber && cnt <= copyNumber ) ? copyNumber + 1 : cnt;
                            } );
                            if( err ){
                                Y.log( 'Error on looking for same profile names ' + err.message, 'error', NAME );
                            }
                            if( cnt > 0 ){
                                profile.profileLabel = profile.profileLabel + ' (' + cnt.toString() + ')';
                            }

                            profile.userId = user.id;

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: model,
                                action: 'upsert',
                                query: {
                                    userId: profile.userId,
                                    profileLabel: profile.profileLabel,
                                    workStation: profile.workStation
                                },
                                fields: Object.keys( profile ),
                                options: {omitQueryId: true},
                                data: Y.doccirrus.filters.cleanDbObject( profile )
                            }, cb );
                        } );

                    }
                },
                ( next ) => {
                    Y.log( 'Successfully imported ' + dataFromDisk.length.toString() + ' profiles.', 'info' );
                    next();
                }
            ], ( err ) => {
                if( err ) {
                    Y.log( 'Error during profiles import: ' + JSON.stringify( err ) + 'error' );
                }

                Y.doccirrus.communication.emitEventForSession( {
                    sessionId: args.user.sessionId,
                    event: 'ruleImportDone',
                    msg: {
                        data: {
                            error: err
                        }
                    }
                } );

                if( isImport ) {
                    return callback( err );
                }

            } );

            if( !isImport ) {
                return callback( null );
            }
        }


        function clearByMetadata( args ) {
            Y.log('Entering Y.doccirrus.api.profileimportexport.clearByMetadata', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.profileimportexport.clearByMetadata');
            }
            const
                {user, data, callback} = args;

            let exportDir = '',
                metaDataFileName = data.metaDataFileName;

            async.waterfall( [
                ( next ) => makeExportDir( user, next ),
                ( expDir, next ) => {
                    exportDir = expDir;
                    loadMetadata( expDir, metaDataFileName, next );
                },
                ( loadedMetadata, next ) => {
                    let
                        ids = _.chain( loadedMetadata )
                            .filter()
                            .uniq()
                            .map( v => (v._id) )
                            .value();

                    async.each( ids, ( id, cb ) => Y.doccirrus.media.tempRemove( `${exportDir}profile_${id}.json`, ( err ) => {
                        if( err ){
                            Y.log(`profile:clearByMetadata error on deleting profile_${id}.json : ${err.stack || err}`, 'debug', NAME);
                        }
                        cb();
                    } ), ( err, result ) => next( err, result ) );
                },
                ( result, next ) => {
                    Y.doccirrus.media.tempRemove( `${exportDir}${metaDataFileName}`, () => next() );
                }
            ], ( err, result ) => {
                callback( err, result );
            } );
        }

        function clearExportDir( user, callback ) {

            let tenantDir;

            function onExportDirCleared( err ) {
                if( err ) {
                    callback( 'Could not clear tenant form export dir: ' + err );
                    return;
                }
                callback( null, tenantDir );
            }

            function onExportDirCreated( err, useTenantDir ) {

                if( err ) {
                    callback( err );
                    return;
                }

                tenantDir = useTenantDir;

                Y.log( 'Clearing profile import/export directory: ' + tenantDir, 'info', NAME );
                Y.doccirrus.media.deleteRecursive( tenantDir, '', onExportDirCleared );
            }

            makeExportDir( user, onExportDirCreated );
        }

        function uploadbackup( args ) {
            Y.log('Entering Y.doccirrus.api.profileimportexport.uploadbackup', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.profileimportexport.uploadbackup');
            }

            const
                {callback} = args,
                newId = 'profile_' + new Date().getTime(), //% temporary identifier
                files = args.originalfiles;

            let
                lastFile = {},
                k;

            Y.log( 'Called /1/profileimportexport/:uploadbackup', 'info', NAME );

            if( 'object' !== (typeof files) ) {
                callback( Y.doccirrus.errors.rest( 500, 'Please upload a single file.', true ) );
                return;
            }

            for( k in files ) {
                if( files.hasOwnProperty( k ) ) {
                    if( files[k].hasOwnProperty( 'path' ) ) {
                        lastFile = files[k];
                    }
                }
            }
            if( false === lastFile.hasOwnProperty( 'path' ) ) {
                return callback( Y.doccirrus.errors.rest( 500, 'Invalid file upload.', true ) );
            }
            Y.doccirrus.forms.importutils.handleArchiveUpload( args.user, lastFile, newId, onExtractArchive, clearExportDir );

            function onExtractArchive( err ) {

                if( err ) {
                    callback( Y.doccirrus.errors.rest( 500, 'Could not extract archive.', 500 ) );
                    return;
                }

                callback( null, {'status': 'ok'} );
            }

        }

        Y.namespace( 'doccirrus.api' ).profileimportexport = {
            name: NAME,
            listSetOnDB: listSetOnDB,
            listSetOnDisk: listSetOnDisk,
            exportSet: exportSet,
            importSet: importSet,
            clearByMetadata: clearByMetadata,
            uploadbackup: uploadbackup

        };
    },
    '0.0.1',
    {
        requires: [
            'dccommunication',
            'exportutils'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcauth',
            // 'dccommunication',
            // 'dcerror',
            // 'dcfilters',
            // 'dcforms-importutils',
            // 'dcmedia-store',
            // 'dcmongodb'
        ]
    }
);