/*global YUI */


YUI.add( 'inpacsluascript-api', function( Y, NAME ) {

    const
        Prom = require( 'bluebird' ),
        _ = require( 'lodash' ),
        async = require( 'async' ),
        LUA_SCRIPT_MODEL = 'inpacsluascript',
        fs = require( 'fs' ),
        path = require( 'path' ),
        PRESET_VERSION_STORE_ID = Y.doccirrus.schemas.admin.getLuaScriptPresetsId();

    // This file is imported in dcdb, so don't forget
    // to initialize with every api call method
    let
        runDb = null;

    /**
     * Get mongoose model
     * @param {Object} user User
     * @param {String} modelName Model name
     * @returns {Promise}
     */
    function getModel( user, modelName ) {
        return new Prom( ( resolve, reject ) => {
            Y.doccirrus.mongodb.getModel( user, modelName, true, ( err, model ) => {
                if( err ) {
                    Y.log( `Error, can't get model ${modelName}`, 'error', NAME );
                    reject();
                } else {
                    resolve( model );
                }
            } );
        } );
    }

    /**
     * Get lua presets version from admin collection
     * @param {Object} model inpacsluascript mongoose model
     * @returns {Promise}
     */
    function getPresetsVersion( model ) {
        return model.mongoose.findOne( {
            _id: PRESET_VERSION_STORE_ID
        } ).exec().then( ( res ) => {
            return (res && res.presetsVersion) || null;
        }, ( err ) => {
            Y.log( 'Get preset version error ' + JSON.stringify( err ), 'error', NAME );
        } );
    }

    /**
     * Save lua presets version into admin collection
     * @param {Object} model admin mongoose model
     * @param {String} version to set
     * @returns {Promise|Query|*}
     */
    function savePresetsVersion( model, version ) {
        return model.mongoose.findOneAndUpdate( {
            _id: PRESET_VERSION_STORE_ID
        }, {
            presetsVersion: version
        }, {
            upsert: true
        } );
    }

    /**
     * Read file with predefined lua scripts and it's current version
     * @returns {Promise}
     */
    function readLuaScriptConfig() {
        return new Promise( function( resolve, reject ) {
            fs.readFile( './mojits/InPacsAdminMojit/config/predefinedLuaScripts.json', 'utf8', function( err, file ) {
                if( err ) {
                    reject( err );
                    Y.log( 'Cannot find predefinedLuaScripts.json file.', 'warn', NAME );
                } else {
                    let fileJson = JSON.parse( file );

                    if( fileJson.luaScriptsVersion && fileJson.luaScripts ) {
                        resolve( fileJson );
                    } else {
                        Y.log( 'Incorrect predefinedLuaScripts.json file.', 'warn', NAME );
                        reject();
                    }

                }
            } );
        } );
    }

    /**
     * Flow - verify versions, delete old lua scripts and update with new
     * @param {Object} user object
     * @param {Object} config object
     * @param {Function} callback function
     * @returns {*}
     */
    function importLuaScriptsProcess( user, config, callback ) {

        let adminModel,
            luascriptModel,
            presetsLength = config.presets ? config.presets.length : 0;

        if( !presetsLength ) {
            return callback();
        }

        getModel( user, 'admin' )
            .then( ( model ) => {
                adminModel = model;
                return getPresetsVersion( adminModel );
            } )
            .then( ( currentVersion ) => {
                if( !currentVersion || (currentVersion && Y.doccirrus.api.insight2.cmpVersions( currentVersion, config.version ) < 0 ) ) {
                    Y.log( 'Import ' + presetsLength + ' presets (v' + config.version + ') for db ' + user.tenantId, 'info', NAME );
                    return getModel( user, 'inpacsluascript' );
                }
            } )
            .then( ( model ) => {
                if( model ) {
                    luascriptModel = model;
                    return model.mongoose.remove( {
                        predefined: true
                    } ).exec();
                }
            } )
            .then( () => {
                if( luascriptModel ) {
                    return luascriptModel.mongoose.collection.insert( config.presets.map( preset => Object.assign( preset, { predefined: true } ) ) );
                }
                return Promise.resolve();
            } )
            .then( () => savePresetsVersion( adminModel, config.version ) )
            .then( () => writeScriptToFile( { user: user, callback: callback } ) )
            .catch( err => {
                Y.log( 'Save preset luascript version error ' + JSON.stringify( err ), 'error', NAME );
                callback( err );
            } );
    }

    /**
     * Create new lua script object
     * @param {Object} user User
     * @param {InPacsLuaScript_T} luaScriptData LuaScript Object
     * @returns {Promise}
     */
    function createLuaScript( user, luaScriptData ) {
        return runDb( {
            'user': user,
            'model': LUA_SCRIPT_MODEL,
            'action': 'post',
            'data': Y.doccirrus.filters.cleanDbObject( luaScriptData )
        } );
    }

    /**
     * Update lua script object by id
     * @protected
     * @param {Object} user User
     * @param {InPacsLuaScript_T} luaScriptData LuaScript Object
     * @returns {Promise}
     */
    function updateLuaScript( user, luaScriptData ) {
        return runDb( {
            'user': user,
            'model': LUA_SCRIPT_MODEL,
            'action': 'put',
            'query': { '_id': (luaScriptData._id + '') },
            'data': Y.doccirrus.filters.cleanDbObject( _.omit( luaScriptData, '_id' ) ),
            'fields': ['content', 'description', 'predefined']
        } );
    }

    /**
     * Device update or create lua script object
     * @protected
     * @param {Object} user User
     * @param {InPacsLuaScript_T} luaScriptData LuaScript Object
     * @returns {Promise}
     */
    function saveOrUpdateLuaScript( user, luaScriptData ) {
        if( luaScriptData._id ) {
            return updateLuaScript( user, luaScriptData );
        } else if( luaScriptData ) {
            return createLuaScript( user, luaScriptData );
        }
        return Prom.resolve( true );
    }

    /**
     * Delete only predefined lua script objects
     * @protected
     * @param {Object} user User
     * @param {String[]} luaScriptIds Ids to delete
     * @returns {Promise}
     */
    function deleteLuaScriptsPromise( user, luaScriptIds ) {
        return runDb( {
            'user': user,
            'model': LUA_SCRIPT_MODEL,
            'action': 'delete',
            'query': {
                _id: { $in: luaScriptIds },
                predefined: false
            }
        } );
    }

    /**
     * Receives lua scripts to update or create and ids that should be deleted
     *
     * @param {Object} args Arguments
     * @param {InPacsLuaScript_T[]} args.scriptsToCreateOrUpdate Lua scripts to update or delete
     * @param {String[]} args.luaScriptsToBeDeleted Ids of objects to delete
     * @returns {function}
     *
     */
    function createOrUpdateLuaScripts( args ) {
        Y.log('Entering Y.doccirrus.api.inpacsluascript.createOrUpdateLuaScripts', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inpacsluascript.createOrUpdateLuaScripts');
        }
        runDb = Prom.promisify( Y.doccirrus.mongodb.runDb );

        if( !Y.doccirrus.licmgr.hasAdditionalService( args.user.tenantId, 'inPacs' ) ) {
            Y.log( "Failed to createOrUpdateLuaScripts, no inPacs licence.", "error", NAME );
            return args.callback();
        }

        const
            { user, callback, data } = args,
            { scriptsToCreateOrUpdate, luaScriptsToBeDeleted } = data,
            saveOrUpdateLiaScriptPromises = () => scriptsToCreateOrUpdate.map( luaScriptData => saveOrUpdateLuaScript( user, luaScriptData ) );

        function onWriteFileComplete(err) {
            if(err) {
                return callback(err);
            }
            Y.doccirrus.api.inpacsconfiguration.restartOrthanc({callback, user});
        }

        Prom.all( [
            ...saveOrUpdateLiaScriptPromises( user, scriptsToCreateOrUpdate ),
            deleteLuaScriptsPromise( user, luaScriptsToBeDeleted )
        ] ).then( () => {
            args.callback = onWriteFileComplete;
            args.skipGenerateInPacsExtraConf = true;

            writeScriptToFile( args );
        } )
            .catch( err => {
                return callback( err );
            } );
    }

    /**
     * @protected
     * @param {Object} args object
     * @returns {function}
     */
    function writeScriptToFile( args ) {
        const
            { user, callback } = args,
            LUA = '.lua';

        let
            inpacsConfiguration;

        if( !Y.doccirrus.licmgr.hasAdditionalService( args.user.tenantId, 'inPacs' ) ) {
            return args.callback("inPacs License not active");
        }
        async.waterfall( [
            //get lua scripts from db
            ( next ) => {
                Y.doccirrus.mongodb.getModel( user, 'inpacsluascript', true, next );
            },
            ( model, next ) => {
                model.mongoose.find( {} )
                    .then( function( scripts ) {
                        Y.doccirrus.api.inpacsconfiguration.getInPacsConfig( ( err, inpacsConfig ) => {
                            if( err ) {
                                return next( err );
                            }
                            inpacsConfiguration = inpacsConfig;
                            return next( null, inpacsConfig.orthancDirectory, scripts );
                        } );
                    } );
            },
            //clean lua directory
            ( luaPath, scripts, next ) => {
                fs.readdir( luaPath, ( err, files ) => {
                    if( err ) {
                        return next( err );
                    }
                    if( files ) {
                        Y.log( " Cleaning luascripts' directory. ", "info", NAME );

                        for(let fileIndex=0; fileIndex < files.length; fileIndex++) {
                            if( LUA === files[fileIndex].substring( files[fileIndex].length - 4, files[fileIndex].length ) ) {
                                try{
                                    fs.unlinkSync( path.join(luaPath, files[fileIndex]) );
                                } catch(luaFileException) {
                                    Y.log( "Failed to empty lua directory. Error: " + luaFileException, "error", NAME );
                                    return next( luaFileException );
                                }
                            }
                        }
                    }
                    return next( null, luaPath, scripts );
                } );
            },

            //writing scripts to files and to extra conf
            ( luaPath, scripts, next ) => {
                let tmpRoot;

                for(let scriptIndex=0; scriptIndex < scripts.length; scriptIndex++) {
                    tmpRoot = path.join( luaPath, scripts[scriptIndex]._id + LUA );
                    try{
                        fs.writeFileSync( tmpRoot, scripts[scriptIndex].content );
                    } catch(luaWriteFileError) {
                        Y.log( `Failed to write lua script with ID: ${scripts[scriptIndex]._id}. Error: ${luaWriteFileError.stack}`, "error", NAME );
                        return next( luaWriteFileError );
                    }

                    Y.log( "Lua script id: " + scripts[scriptIndex]._id + " is written to file.", "info", NAME );
                }

                next( null, {} );
            },
            //rewrite extra conf
            ( empty, next ) => {

                if(args.skipGenerateInPacsExtraConf) {
                    return next();
                } else {
                    Y.doccirrus.api.inpacsconfiguration.generateInPacsExtraConf( inpacsConfiguration, user )
                        .then( () => {
                            next();
                        } )
                        .catch( next );
                }
            }

        ], ( err ) => {
            if( err ) {
                Y.log( " Error while writing lua script to file. Error: " + JSON.stringify( err ), "error", NAME );
                return callback( err );
            }
            return callback();
        } );

    }

    /**
     * Update presets on start
     * @param {Object} user User
     * @param {Function} callback function
     * @returns {Function}
     */
    function runOnStart( user, callback ) {
        if( !Y.doccirrus.auth.isPRC() && !Y.doccirrus.licmgr.hasAdditionalService( user.tenantId, 'inPacs' ) ) {
            return callback();
        }

        readLuaScriptConfig()
            .then( config => importLuaScriptsProcess( user, {
                version: config && config.luaScriptsVersion,
                presets: config && config.luaScripts
            }, callback ) )
            .catch( ( err ) => callback( err ) );
    }

    Y.namespace( 'doccirrus.api' ).inpacsluascript = {
        name: NAME,
        createOrUpdateLuaScripts,
        runOnStart
    };

}, '0.0.1', {
    requires: [
        'inpacsluascript-schema',
        'admin-schema',
        'insight2-api'
    ]
} );
