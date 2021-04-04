/**
 * User: mp
 * Date: 03.12.15
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*global YUI */
YUI.add('dcmongoutils', function (Y, NAME) {

        /**
         * DC Mongoutils for restoring collections
         *
         * @Module DCUtils
         */

        var
            dbConfig,
            mongoUtilsInterface,
            mongoRestorePath,
            // eslint-disable-next-line no-unused-vars
            mongoDumpPath,
            // eslint-disable-next-line no-unused-vars
            mongoPath,
            //MongoClient = require('mongodb').MongoClient,
            spawn = require('child_process').spawn,
            exec = require('child_process').exec;

        /**
         * Mongo Restore
         * Used to restore mongodumps for any collection
         *
         * @class DCMongoUtils
         */
        function DCMongoUtils() {
            dbConfig = Y.doccirrus.utils.getMongoDBConfig();

            try {
                mongoRestorePath = Y.doccirrus.binutilsapi.getPathToBinUtil( 'mongorestore' );
                // mongoDumpPath = Y.doccirrus.binutilsapi.getPathToBinUtil( 'mongodump' );
                // mongoPath = Y.doccirrus.binutilsapi.getPathToBinUtil( 'mongo' );
            } catch( e ) {
                throw e;
            }
        }


        // check if restore is running return pid
        function mongorestoreCheck( collectionName, callback ) {
            var
                cmdPS = 'ps -ef | grep "mongorestore.*--collection.*' + collectionName + '" | grep -v "grep" | awk \'{print $2}\'',
                exec = require( 'child_process' ).exec;

            exec( cmdPS, function( error, stdout ) {
                if( error ) {
                    return callback( error );
                }
                var
                    pid = stdout && parseInt( stdout, 10 );
                if( pid && 'number' === typeof pid ) {
                    callback( null, pid );
                } else {
                    Y.log( 'mongorestoreCheck passed', 'debug', NAME );
                    callback();
                }
            } );
        }

        // kill any mongorestore process for any collection
        function killMongorestore( collectionName, callback ) {
            var
                cmdKILL = 'kill ',
                exec = require( 'child_process' ).exec;

            mongorestoreCheck( collectionName, function( err, pid ) {
                if( err ) {
                    return callback( err );
                }
                if( pid ) {
                    Y.log( 'killMongorestore: mongorestore is running, killing the process ' + pid, 'debug', NAME );
                    exec( cmdKILL + pid, callback );
                } else {
                    callback();
                }
            } );
        }

        DCMongoUtils.prototype.getMongoDbArgs = function getMongoDbArgs(dbId, flag) {

            if( !dbId ) {
                return undefined; //Promise.reject( 'No db id specified.' );
            }

            var mongoDbArgs = [];

            if ( dbConfig.user && dbConfig.pass ) {
                mongoDbArgs.push("--username", dbConfig.user);
                mongoDbArgs.push("--password", dbConfig.pass);
                if (dbConfig.auth && dbConfig.auth.authdb) {
                    mongoDbArgs.push("--authenticationDatabase", dbConfig.auth.authdb);
                }
            }

            mongoDbArgs.push('--host', dbConfig.host);
            mongoDbArgs.push('--port', dbConfig.port);

            if (dbConfig.server && dbConfig.server.ssl) {
                mongoDbArgs.push('--ssl');

                if (dbConfig.server.sslCert && dbConfig.server.sslKey) {
                    require('fs').writeFileSync(Y.doccirrus.auth.getTmpDir()+"/temp_db.pem",dbConfig.server.sslCert+"\n"+dbConfig.server.sslKey);
                    mongoDbArgs.push('--sslPEMKeyFile', Y.doccirrus.auth.getTmpDir()+"/temp_db.pem");
                }
                if (dbConfig.server.sslValidate === false) { //this comparison is important since it usually is null or false
                    mongoDbArgs.push('--sslAllowInvalidCertificates');
                }

            }

            if(flag === true) {
                mongoDbArgs.push(dbId);
            }

            return mongoDbArgs;
        };
        DCMongoUtils.prototype.getMongoDbDumpArgs = function getMongoDbDumpArgs(dbId, collectionName, sourceDbId, isDump, restorePath) {

            if( !dbId ) {
                return undefined; //Promise.reject( 'No db id specified.' );
            }

            var mongoDbArgs = Y.doccirrus.mongoutils.getMongoDbArgs(dbId, collectionName) || [];

            mongoDbArgs.push('--db', dbId);

            if ( collectionName ) {
                mongoDbArgs.push( '--collection', collectionName );
            }

            if ( isDump ) {
                mongoDbArgs.push('--out');
            }

            Y.log( 'tmp dir: ' + Y.doccirrus.auth.getTmpDir() + '/dbdump','debug', NAME );
            var path;
            if ( restorePath ) {
                mongoDbArgs.push( restorePath );
            } else {
                path = Y.doccirrus.auth.getTmpDir() + '/dbdump' +
                    ( isDump ? '' : collectionName ? '/' + sourceDbId + '/' + collectionName + '.bson' : '/' + sourceDbId );
                mongoDbArgs.push( path );
            }

            return mongoDbArgs;
        };

        DCMongoUtils.prototype.getMongoUrl = function getMongoUrl(db, user, pass, authDb, host, port) {
            var dbConfig = Y.doccirrus.utils.getMongoDBConfig(),
                uriArgs = [];

            var uri = (host || dbConfig.host) + ':' + (port || dbConfig.port) + '/' + db;
            if (user && pass || dbConfig.user && dbConfig.pass) {
                uri = (user || dbConfig.user) + ":" + (pass || dbConfig.pass) + "@" + uri;
                if (authDb || dbConfig.auth && dbConfig.auth.authdb) {
                    uriArgs.push("authSource="+(authDb || dbConfig.auth.authdb));
                }
            }

            uri = 'mongodb://' + uri + (uriArgs.length > 0?"?"+uriArgs.join("&"):"");

            return uri;
        };

        DCMongoUtils.prototype.dump = function( collectionName, dbId, callback ) {
            var err;
            Y.log( 'starting dump...', 'debug', NAME );

            if( !Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isPRC() ) {
                err = new Error( 'tenant is a vprc or prc' );
                callback( err );
                return; // Promise.reject( err );
            }

            function dump() {
                var args = Y.doccirrus.mongoutils.getMongoDbDumpArgs( dbId, collectionName, dbId, true ).join( ' ' );
                Y.log( 'dumping', 'debug', NAME );
                exec( 'mongodump ' + args, function( error, stdout ) {
                    Y.log( 'dump ' + dbId + ' finished with ' + stdout, 'debug', NAME );
                    if ( error ) {
                        return callback( error );
                    }
                    callback();
                });
            }

            dump();

        };

        /**
         *
         * @param collectionName optional collection to be restored
         * @param targetDbId target db id
         * @param restorePath optional path to restore from
         * @param callback
         * @param doNotDrop ( Boolean ) if true, does not drop the collection before restore
         * @param indexRestore ( Boolean ) if true, restores with index
         */
        DCMongoUtils.prototype.restore = function( collectionName, targetDbId, sourceDbId, restorePath, callback, doNotDrop, indexRestore ) {

            var
                mongoRestoreArgs;
            if( !Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isPRC() && !Y.doccirrus.auth.isDCPRC() && !Y.doccirrus.auth.isISD() ) {
                callback();
                return;
            }

            if( !mongoRestorePath ) {
                callback( new Error( 'mongorestore path not found' ) );
                return;
            }

            Y.log( `mongoutils.restore: dump restore being prepared for ${collectionName}`, 'info', NAME );

            function dbReady() {

                Y.log( 'getting mongorestore lock', 'debug', NAME );
                Y.doccirrus.schemas.sysnum.getMongorestoreLock( Y.doccirrus.auth.getSUForLocal(), function( err, lock ) {
                    if( err ) {
                        Y.log( `Restore. Could not get mongorestore lock: ${JSON.stringify( err )}`, 'error', NAME );
                        return callback( err );
                    } else if( !lock ) {
                        Y.log( 'Restore. mongorestore is locked', 'warn', NAME );
                        return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'mongorestore is busy' } ) );
                    } else {
                        Y.log( 'Restore. mongorestore has been successfully locked by current process. Start restoring dump.', 'info', NAME );
                        restore( callback );
                    }
                } );
            }

            function restore() {
                var mongoRestore;
                mongoRestoreArgs = Y.doccirrus.mongoutils.getMongoDbDumpArgs( targetDbId, collectionName, sourceDbId, false, restorePath );
                if( ! doNotDrop ) {
                    mongoRestoreArgs.push( '--drop' );
                }
                if (! indexRestore ){
                    mongoRestoreArgs.push( '--noIndexRestore' );
                }
                Y.log( 'restoring dump', 'debug', NAME );
                mongoRestore = spawn( mongoRestorePath, mongoRestoreArgs );

                mongoRestore.stderr.on('data', () => {
                    // without this listener 'exit' may not be fired on mac.
                });
                mongoRestore.on( 'exit', function( code ) {
                    Y.log( 'restoring dump finished with ' + code, 'debug', NAME );
                    // always release the lock
                    Y.doccirrus.schemas.sysnum.releaseMongorestoreLock( Y.doccirrus.auth.getSUForLocal(), function() {});
                    if( code === 0 ) {
                        if ( collectionName ) {
                            Y.log( 'restored collection: ' + collectionName, 'debug', NAME );
                        } else {
                            Y.log( 'restored successfully...', 'debug', NAME );
                        }
                        setImmediate( callback );
                    } else {
                        Y.log( 'Error restoring: exit code ' + code, 'error', NAME );
                        callback( 'Error restoring: exit code: ' + code );
                    }
                } );
            }

            // terminate any current process
            killMongorestore( collectionName, function( err ) {
                if( err ) {
                    Y.log( 'mongorestore killed or ps failed: ' + err, 'warn', NAME );
                    callback( err );
                } else {
                    Y.log( 'mongorestore killed or not running - ready to be used', 'debug', NAME );
                    //MongoClient.connect( 'mongodb://' + dbConfig.host + ':' + dbConfig.port + '/0', dbReady );
                    setImmediate( dbReady );
                }
            } );

        };

        mongoUtilsInterface = new DCMongoUtils();

        Y.namespace( 'doccirrus' ).mongoutils = mongoUtilsInterface;

    },
    '0.0.1', {
        requires: [
            'dcauth',
            'dccommonutils',
            'binutils-api'
        ]
    }
);
