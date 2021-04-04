/**
 * User: do
 * Date: 16/02/15  14:21
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*globals YUI */
'use strict';

YUI.add( 'dcgridfs', function( Y, NAME ) {

        var
            dbConfig,
            gridfs,
            mongo = require( 'mongodb' ),
            ObjectID = mongo.ObjectID,
            GridStore = mongo.GridStore,
            dbUtils = require( 'dc-core' ).utils;

        /**
         * Constructor for the module class.
         *
         * @class DCGridFS
         */
        function DCGridFS() {
            var configFile = require( 'dc-core' ).db.loadDbConfig();
            dbConfig = configFile && configFile.mongoDb;
        }

        /**
         * function to check if auth is necessary
         * @param db database object
         * @param cb callback
         */
        function authCheck( db, cb ) {
            db.command( {connectionStatus : 1} ).then( () => {
                cb();
            }).catch( err => {
                Y.log("gridfs db auth failed: "+err, 'warn', NAME);
            });
        }

        /**
         * Creates database connection and GridStore instance.
         * Callback receives closeFn that should be called after GridStore instance is not needed anymore
         * to close db connection and GridStore.
         *
         *  @param  tenantId    {String}    Tenant of current user
         *  @param  objId       {String}    Database _id of gridfs meta object
         *  @param  mode        {String}    One of ['r','w','w+']
         *  @param  filename    {String}    Filename in GridFS for current operation
         *  @param  options     {Object}    see: https://mongodb.github.io/node-mongodb-native/api-generated/gridstore.html
         *  @param  callback    {Function}  Of the form fn( err, gridStore, cleanupFunction )
         */
        DCGridFS.prototype.getGridStore = function( tenantId, objId, filename, options, mode, callback ) {

            var gridStore,
                db, client,
                dbOptions = Object.assign({}, dbConfig.server),
                uri = dbUtils.getDBUri( tenantId , dbConfig );

            function done( cb ) {
                function dbClosedCb( err ) {
                    if( err ) {
                        Y.log( 'DCGridFS: could not close db: ' + err, 'error', NAME );
                        return cb( err );
                    }
                    cb();
                }

                function gridStoreClosedCb( err ) {
                    if( err ) {
                        Y.log( 'DCGridFS: could not close gridstore: ' + err, 'error', NAME );
                        return cb( err );
                    }
                    client.close( dbClosedCb );
                }

                gridStore.close( gridStoreClosedCb );
            }

            function gridStoreOpenCb( err ) {

                if( err ) {
                    Y.log( 'DCGridFS: could not gridstore: ' + err, 'error', NAME );
                    return callback( err );
                }
                callback( null, gridStore, done );
            }

            function openGridstore() {
                gridStore = new GridStore( db, objId, filename, mode, options );
                gridStore.open( gridStoreOpenCb );
            }

            mongo.MongoClient.connect(uri , dbOptions, (err, mongoClient) => {
                if( err ) {
                    Y.log( 'DCGridFS: could not open db (getGridStore): ' + err, 'error', NAME );
                    return callback( err );
                }
                client = mongoClient;
                db = mongoClient.db(tenantId);

                authCheck( db, openGridstore );
            } );

        };

        /**
         * Stores specified buffer in GridFS.
         * Calls back with ObjectID to access the newly stored file.
         *
         *  @param  user        {Object}        REST user or equivalent
         *  @param  filename    {String}        Name of file in grid store
         *  @param  options     {Options}       Passed to gridStore constructor
         *  @param  buffer      {Object}        File contents to save
         *  @param  callback    {Function}      Of the form fn( err, gridFsMetaObjId )
         */
        DCGridFS.prototype.store = function( user, filename, options, buffer, callback ) {
            var oId = new ObjectID();

            if( !user || !user.tenantId ) {
                Y.log( 'DCGridFS: could not store file - missing parameter user.tenantId', 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 500, 'Missing paramter: user.tenantId', true ) );
            }

            if( !buffer || !(buffer instanceof Buffer) ) {
                Y.log( 'DCGridFS: could not store file - missing file content buffer', 'error', NAME );
                return callback( Y.doccirrus.errors.rest( 500, 'Missing parameter: buffer', true ) );
            }

            if( !callback || 'function' !== typeof callback ) {
                Y.log( 'DCGridFS: could not store file - missing callback', 'error', NAME );
                return callback(Y.doccirrus.errors.rest( 500, 'Missing paramter: callback', true ) );
            }

            function finalCb( err ) {
                if( err ) {
                    Y.log( 'DCGridFS: could not close gridstore: ' + err, 'error', NAME );
                    return callback( err );
                }
                callback( null, oId );
            }

            function gridStoreCb( err, gridStore, closeFn ) {

                function writeCb( err ) {
                    if( err ) {
                        Y.log( 'DCGridFS: could not write file to gridstore: ' + err, 'error', NAME );
                        return callback( err );
                    }

                    closeFn( finalCb );
                }

                if( err ) {
                    Y.log( 'DCGridFS: could not get gridstore to gridstore: ' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                gridStore.write( buffer, writeCb );
            }

            this.getGridStore( user.tenantId, oId, filename, options, 'w', gridStoreCb );

        };

        DCGridFS.prototype.getMediportXML = function( user, id, callback ) {
            this.get( user, id, callback );
        };

        DCGridFS.prototype.getMediportXMLs = async function( user, invoiceXMLs, callback ) {
            const {formatPromiseResult} = require( 'dc-core' ).utils;
            let err, res;
            let result = [];
            let fsFiles = [];

            for( let xml of invoiceXMLs ) {
                [ err, res ] = await formatPromiseResult(
                    new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.gridfs.getFsFiles( {
                            user: user,
                            query: { filename: xml },
                            callback: function( err, fsFile ) {
                                if ( err ) {
                                    reject( err );
                                }
                                resolve( fsFile );
                            }
                        } );
                    } ) );
                if ( err ) {
                    callback( err, null );
                }
                if ( res ) {
                    fsFiles.push( res[ 0 ] );
                }
            }

            for ( let file of fsFiles ) {
                [ err, res ] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                    this.get( user, file._id, function( err, gFile ) {
                        if ( err ) {
                            reject( err );
                        }
                        resolve( gFile );
                    } );
                } ) );
                if ( err ) {
                    callback( err, null );
                }
                if ( res ) {
                    result.push( {
                        filename: file.filename,
                        dataObj: res
                    } );
                }
            }
            callback( null, result );
        };

        /**
         * Calls back with buffer of requested file.
         * File id and user.tenantId is needed to get the file buffer.
         *
         * @param user
         * @param id
         * @param callback
         */
        DCGridFS.prototype.get = function( user, id, callback ) {

            if( !user || !user.tenantId || !id || 'function' !== typeof callback ) {
                Y.log( 'DCGridFS: could not get file - missing parameter', 'error', NAME );
                return callback( new Error( 'Missing Paramter' ) );
            }

            if( 'string' === typeof id ) {
                id = new ObjectID( id );
            }

            function gridStoreCb( err, gridStore, closeFn ) {

                if( err ) {
                    Y.log( 'DCGridFS: could not get gridstore: ' + err, 'error', NAME );
                    return callback( err );
                }

                function readCb( err, data ) {

                    if( err ) {
                        Y.log( 'DCGridFS: could not read file from gridstore: ' + err, 'error', NAME );
                        return callback( err );
                    }

                    function finalCb( err ) {

                        if( err ) {
                            Y.log( 'DCGridFS: could not close gridstore: ' + err, 'error', NAME );
                            return callback( err );
                        }

                        callback( null, {data: data, filename: gridStore.filename, contentType: gridStore.contentType, metadata: gridStore.metadata} );
                    }

                    closeFn( finalCb );
                }

                gridStore.read( readCb );
            }

            this.getGridStore( user.tenantId, id, undefined, undefined, 'r', gridStoreCb );
        };

        /**
         * Deletes file that matches user.tenantId and ObjectID.
         *
         * @param user
         * @param id
         * @param callback
         */
        DCGridFS.prototype.delete = function( user, id, callback ) {

            if( !user || !user.tenantId || !id || 'function' !== typeof callback ) {
                Y.log( 'DCGridFS: could not get file - missing parameter', 'error', NAME );
                return callback( new Error( 'Missing Paramter' ) );
            }

            var db, client,
                dbOptions = Object.assign({}, dbConfig.server),
                uri = dbUtils.getDBUri( user.tenantId , dbConfig );

            if( 'string' === typeof id ) {
                id = new ObjectID( id );
            }

            function dbClosedCb( err ) {
                if( err ) {
                    Y.log( 'DCGridFS: could not close db: ' + err, 'error', NAME );
                    return callback( err );
                }
                callback();
            }

            function unlinkedCb( err ) {
                if( err ) {
                    Y.log( 'DCGridFS: could not unlink file: ' + err, 'error', NAME );
                    return callback( err );
                }
                client.close( dbClosedCb );
            }

            mongo.MongoClient.connect(uri , dbOptions, (err, mongoClient) => {
                if( err ) {
                    Y.log( 'DCGridFS: could not open db (delete): ' + err, 'error', NAME );
                    return callback( err );
                }
                client = mongoClient;
                db = mongoClient.db( user.tenantId );
                authCheck( db, GridStore.unlink.bind(null, db, id, unlinkedCb ) );
            } );



        };

        gridfs = new DCGridFS();

        Y.namespace( 'doccirrus' ).gridfs = gridfs;

    },
    '0.0.1', {requires: [] }
);
