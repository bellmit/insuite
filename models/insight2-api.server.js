/*global YUI */
'use strict';

/*global Promise */

YUI.add( 'insight2-api', function( Y, NAME ) {

    var
        fs = require( 'fs' ),
        path = require( 'path' ),
        async = require( 'async' ),
        mongoose = require( 'mongoose' ),

        PRESET_VERSION_STORE_ID = Y.doccirrus.schemas.admin.getReportingPresetsId();

    function updatePresets( user, callback ) {
        readConfig().then( function( config ) {
            setTimeout( function() {
                importProcess( user, config, callback );

            }, 5 );
        } ).catch( function( err ) {
            Y.log( 'Error: ' + err, 'error', NAME );
            callback();
        } );
    }

    class PromiseCancelled extends Error {}

    function importProcess( user, config, callback ) {
        var inSight2Model, adminModel,
            presetsLength = config.presets ? config.presets.length : 0;

        getModel( user, 'admin' )
            .then( function( model ) {
                adminModel = model;
                return getPresetsVersion( adminModel );
            } )
            .then( function( currentVersion ) {
                if( !currentVersion || cmpVersions( currentVersion, config.version ) < 0 ) {
                    Y.log( 'Import ' + presetsLength + ' presets (v' + config.version + ') for db ' + user.tenantId, 'info', NAME );
                    return getModel( user, 'insight2' );
                } else {
                    throw new PromiseCancelled();
                }
            } )
            .then( function( model ) {
                inSight2Model = model;
                return removePredefined( inSight2Model );
            } )
            .then( function() {
                return insertPresets( inSight2Model, config.presets );
            } )
            .then( function() {
                return savePresetsVersion( adminModel, config.version );
            } )
            .then( function() {
                callback();
            } )
            .catch( function( err ) {
                if( err instanceof PromiseCancelled ) {
                    return callback();
                }
                Y.log( `importProcess error ${JSON.stringify( err )}`, 'error', NAME );
                callback( err );
            } );

    }

    function readConfig() {
        return new Promise( function( resolve, reject ) {
            fs.readFile( path.resolve( __dirname, '../mojits/InSight2Mojit/reportsConfig/config.json' ), 'utf8', function( err, file ) {
                if( err ) {
                    reject( err );
                    Y.log( 'Cannot find config.json file for presets', 'warn', NAME );
                } else {
                    let fileJson = JSON.parse( file );

                    if( fileJson.version && fileJson.presets ) {
                        resolve( fileJson );
                    } else {
                        Y.log( 'Incorrect config.json file for presets', 'warn', NAME );
                        reject();
                    }

                }
            } );
        } );
    }

    function removePredefined( model ) {
        return model.mongoose.remove( {
            predefined: true
        } ).exec();
    }

    function insertPresets( model, presets ) {
        var
            ObjectId = mongoose.Types.ObjectId,
            i;

        for( i = 0; i < presets.length; i++ ) {
            if( presets[i]._id && 'string' === typeof presets[i]._id ) {
                presets[i]._id = new ObjectId( presets[i]._id );
            }

            presets[i].pipeline = convertPipeline( presets[i].pipeline );

        }
        return model.mongoose.collection.insert( presets );
    }

    function convertPipeline( pipeline ) {
        return JSON.stringify( pipeline );
    }

    function getPresetsVersion( model ) {
        return model.mongoose.findOne( {
            _id: PRESET_VERSION_STORE_ID
        } ).exec().then( function( res ) {
            return (res && res.presetsVersion) || null;
        }, function( err ) {
            Y.log( 'Get preset version error ' + JSON.stringify( err ), 'error', NAME );
        } );
    }

    function savePresetsVersion( model, version ) {
        return model.mongoose.findOneAndUpdate( {
            _id: PRESET_VERSION_STORE_ID
        }, {
            presetsVersion: version
        }, {
            upsert: true
        } );
    }

    function getModel( user, modelName ) {
        return new Promise( function( resolve, reject ) {
            Y.doccirrus.mongodb.getModel( user, modelName, true, function( err, model ) {
                if( err ) {
                    Y.log( 'ERR CANT GET ' + modelName + ' MODEL', 'error', NAME );
                    reject();
                } else {
                    resolve( model );
                }
            } );
        } );
    }

    function cmpVersions( a, b ) {
        var i, diff;
        var regExStrip0 = /(\.0+)+$/;
        var segmentsA = a.replace( regExStrip0, '' ).split( '.' );
        var segmentsB = b.replace( regExStrip0, '' ).split( '.' );
        var l = Math.min( segmentsA.length, segmentsB.length );

        for( i = 0; i < l; i++ ) {
            diff = parseInt( segmentsA[i], 10 ) - parseInt( segmentsB[i], 10 );
            if( diff ) {
                return diff;
            }
        }
        return segmentsA.length - segmentsB.length;
    }

    // --------

    function getOne( args ) {
        Y.log(`Entering Y.doccirrus.api.insight2.getOne insightConfigId: ${args.originalParams.insightConfigId}`, 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insight2.getOne');
        }
        var callback = args.callback,
            insightId = args.originalParams.insightConfigId;

        if( !insightId ) {
            callback( null, {} );
            return;
        }

        Y.doccirrus.mongodb.runDb( {
            model: 'insight2',
            action: 'get',
            user: args.user,
            query: {
                _id: insightId
            },
            callback: function( err, res ) {
                if( err ) {
                    Y.log( err, 'error', NAME );
                    return callback( err );
                } else if( !res.length ) {
                    let errObj = new Y.doccirrus.errors.rest( '25002' );
                    Y.log( errObj.message, 'error', NAME );
                    return callback( errObj );
                } else {
                    return callback( null, res[0] );
                }
            }
        } );
    }

    /**
     *  Utility / development REST route to reset the inSight2 presets from disk
     *  Clears the database and then runs the import process
     *
     *  @param  args    {Object}    REST args
     */

    function replacePresets( args ) {
        Y.log('Entering Y.doccirrus.api.insight2.replacePresets', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insight2.replacePresets');
        }
        var
            report = 'Deleting all presets from insight2 collection...\n',
            allPresets;

        Y.log( 'Clearing inSight2 presets.', 'debug', NAME );
        async.series( [loadAllPresets, deleteAllPresets, reImportAllPresets], onAllDone );

        function loadAllPresets( itcb ) {
            report = report + 'Checking database for existing presets...\n';
            Y.doccirrus.mongodb.runDb( {
                'user': args.user,
                'model': 'insight2',
                'action': 'get',
                'query': { 'predefined': true },
                'options': { 'multi': true },
                'callback': onAllPresetsLoaded
            } );
            function onAllPresetsLoaded( err, result ) {
                report = report + 'Loaded ' + ( err ? 'ERR: ' + JSON.stringify( err ) : result.length ) + ' presets\n';
                allPresets = result || [];
                itcb( err );
            }
        }

        function deleteAllPresets( itcb ) {
            async.eachSeries( allPresets, deleteSinglePreset, onAllPresetsDeleted );
            function onAllPresetsDeleted( err ) {
                if( err ) {
                    report = report + 'Problem clearing presets table: ' + JSON.stringify( err );
                } else {
                    report = report + 'All ' + allPresets.length + ' presets deleted\n';
                }
                itcb( err );
            }
        }

        function deleteSinglePreset( preset, itcb ) {
            report = report + 'Deleting single preset: ' + preset._id + '\n';
            Y.doccirrus.mongodb.runDb( {
                'user': args.user,
                'model': 'insight2',
                'action': 'delete',
                'query': { '_id': preset._id + '' },
                'callback': onSinglePresetsDeleted
            } );
            function onSinglePresetsDeleted( err, result ) {
                if( !err && ( !result || !result[0] ) ) {
                    err = Y.doccirrus.errors.rest( 404, 'Preset not found: ' + preset._id, true );
                }
                report = report + ( err ? 'Error: ' + JSON.stringify( err ) : 'Deleted: ' + result[0]._id ) + '\n';
                itcb( err );
            }
        }

        function reImportAllPresets( itcb ) {
            var inSight2Model;
            report = report + 'Reimporting all presets from JSON file...\n';

            function onModelLoaded( newModel ) {
                report = report + 'Created new inSight2 model.\n';
                inSight2Model = newModel;
                return Promise.resolve( true );
            }

            function onConfigLoaded( config ) {
                report = report + 'Loaded reports config from disk, ' + config.presets.length + ' presets.\n';
                insertPresets( inSight2Model, config.presets );
                itcb();
                return Promise.resolve( true );
            }

            getModel( args.user, 'insight2' )
                .then( onModelLoaded )
                .then( readConfig )
                .then( onConfigLoaded )
                .catch( itcb );
        }

        function onAllDone( err ) {
            if( err ) {
                Y.log( 'Problem reimporting inSight2 presets: ' + JSON.stringify( err ), 'warn', NAME );
                report = report + 'Error during import process form disk: ' + JSON.stringify( err ) + '\n';
            } else {
                report = report + 'Import from disk complete.\n';
            }
            args.callback( null, { 'report': report } );
        }

    }

    /**
     * Overrides get method. Filters inSight2 documents by visibility of the user group.
     * @method getFilteredByVisibility
     * @param {Object} args
     * @param {Object} args.user
     * @param {Object} args.query
     * @param {Object} args.options
     * @param {Function} args.callback
     */
    function getFilteredByVisibility( args ) {
        let
            user = args.user,
            query = args.query,
            options = args.options,
            callback = args.callback,
            userAllGroups = Y.doccirrus.schemas.employee.getIncludedGroupsRights( user && user.groups.map( groupDesc => groupDesc.group ) || [] );

        query = query || {};
        query.$or = [{ visibility: { $in: userAllGroups } }, { visibility: { $exists: false } }];
        Y.doccirrus.mongodb.runDb( {
            action: 'get',
            model: 'insight2',
            user: user,
            query: query,
            options: options
        }, callback );
    }

    /**
     * Class case Schemas -- gathers all the schemas that the case Schema works with.
     */
    /**
     * @class insight2
     * @namespace doccirrus.api
     */
    Y.namespace( 'doccirrus.api' ).insight2 = {
        get: function( args ) {
            Y.log('Entering Y.doccirrus.api.insight2.get', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.insight2.get');
            }
            getFilteredByVisibility( args );
        },
        name: NAME,
        updatePresets: updatePresets,
        replacePresets: replacePresets,
        getOne: getOne,
        cmpVersions
    };

}, '0.0.1', {
    requires: [
        'dclicmgr',
        'admin-schema',
        'employee-schema'
    ]
} );
