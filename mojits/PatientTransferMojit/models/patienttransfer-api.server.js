/*global YUI */



YUI.add( 'transfer-api', function( Y, NAME ) {

        const
            async = require( 'async' ),
            ObjectID = require( 'mongodb' ).ObjectID;

        function doTransfer( args ) {
            Y.log('Entering Y.doccirrus.api.transfer.doTransfer', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.transfer.doTransfer');
            }
            const
                { user, data, callback } = args,
                { partners } = data;

            Y.log( 'entered transfer dispatch, params:' + require( 'util' ).inspect( data ), 'debug', NAME );

            if( !partners || !partners.length ) {
                return callback( Y.doccirrus.errors.rest( 400, 'insufficient parameters' ) );
            }

            let
                payload = data;
            delete payload.partners;

            async.waterfall( [
                ( next ) => setCustomerNo( user, payload, next ),
                ( data, next ) => getGridFSFiles( user, payload.attachedMedia.map( media => media.mediaId ), next ),
                ( data, next ) => {
                    payload.fileMetas = data.fileMetas;
                    payload.fileChunks = data.fileChunks;
                    next( null, {} );
                },
                ( data, next ) => getMedia( user, payload, next )
            ], ( err ) => {
                if( err ) {
                    return callback( err );
                }
                Y.log( 'transfer data to source, payload:' + JSON.stringify( {
                    dcCustomerNo: payload.dcCustomerNo,
                    payload: payload.attachedMedia.map( media => media.mediaId )
                } ), 'debug', NAME );
                sendPayload( { callback, partners, user, payload } );
            } );
        }

        function receive( args ) {
            Y.log('Entering Y.doccirrus.api.transfer.receive', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.transfer.receive');
            }
            const
                data = JSON.parse( args.data.payload ),
                payload = data.payload,
                { user, callback } = args;

            Y.log( 'Receive start....', 'debug', NAME );

            Y.log( 'transfer data to source received, payload:' + JSON.stringify( {
                dcCustomerNo: payload.dcCustomerNo,
                payload: payload.attachedMedia.map( media => media.mediaId )
            } ), 'debug' );
            payload.status = 'NEW';
            payload.partners = [
                {
                    dcId: payload.dcCustomerNo,
                    name: payload.practiceName
                }
            ];
            Promise.all( [
                ...payload.media.map( ( media ) => upsertMedia( user, media ) ),
                ...payload.fileMetas.map( ( fmeta ) => upsertFileMeta( user, fmeta ) ),
                ...payload.fileChunks.map( ( fchunk ) => upsertFileChunks( user, fchunk ) ),
                createTransferLogEntry( user, payload, true ),
                createLogEntry( { payload, user, action: 'received', who: { U: 'System' }, partners: [ { name: payload.practiceName } ] } )
            ] ).then( () => {
                callback( null );
            } );

        }

        function sendPayload( config ) {
            let
                { callback, partners, user, payload } = config,
                isReSend = payload && Y.doccirrus.schemas.patienttransfer.patientTransferTypes.CANCELED === payload.status;

            async.eachSeries( partners, function iteratee( partner, cb ) {
                let
                    transferLogId = new ObjectID().toString();
                if( isReSend ) {
                    transferLogId = payload._id;
                    delete payload._id;
                }
                Y.doccirrus.communication.callExternalApiByCustomerNo( {
                    api: 'transfer.receive',
                    user: user,
                    useQueue: true,
                    data: { payload: JSON.stringify( { payload: payload } ) },
                    query: {},
                    dcCustomerNo: partner.dcId,
                    options: {
                        transferLogId
                    },
                    callback: function( err ) {
                        if( err ) {
                            Y.log( `Sending data to source failed, error: ${err && err.stack || err}`, 'error' );
                        }
                        if( isReSend ) {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'patienttransfer',
                                action: 'put',
                                query: {
                                    _id: transferLogId
                                },
                                fields: [ 'status' ],
                                data: {
                                    status: err ? Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENDING : Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENT,
                                    skipcheck_: true
                                }
                            }, err => cb( err ) );
                            return;
                        }
                        createTransferLogEntry( user, {
                            _id: transferLogId,
                            status: err ? Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENDING : Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENT,
                            textContent: payload.textContent,
                            doctorName: payload.doctorName,
                            practiceName: payload.practiceName,
                            practiceCity: payload.practiceCity,
                            subject: payload.subject,
                            attachedMedia: payload.attachedMedia,
                            created: payload.created,
                            partners: [partner]
                        }, false )
                            .then( () => {
                                cb( null );
                            } )
                            .catch( cb );

                    }
                } );
            }, function done( err ) {
                if( err ) {
                    Y.log( `Patient transfer. Could not send payload: ${err.toString()}.`, 'error', NAME );
                }
                createLogEntry( { who: user, action: 'sent', payload, user, partners } )
                    .then( () => {
                        callback( null );
                    } )
                    .catch( callback );
            } );
        }

        function getMedia( user, payload, next ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'media',
                query: { _id: { $in: payload.attachedMedia.map( media => media.mediaId ) } },
                options: { lean: true },
                callback: function( err, result ) {
                    if( err ) {
                        Y.log( 'Error media documents: ' + JSON.stringify( err ), 'error' );
                        return next( err );
                    }
                    payload.media = result;
                    next( err, payload );
                }
            } );
        }

        function setCustomerNo( user, payload, next ) {
            Y.doccirrus.api.practice.getMyPractice( {
                user: user,
                callback: function( err, myPrac ) {

                    if( err || !myPrac ) {
                        return next( err );
                    }

                    payload.dcCustomerNo = myPrac.dcCustomerNo;
                    payload.commercialNo = myPrac.commercialNo;
                    payload.coname = myPrac.coname;
                    payload.practiceName = myPrac.coname;
                    payload.practiceCity = Array.isArray(myPrac.addresses) && myPrac.addresses[0] ? myPrac.addresses[0].city : '';

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        action: 'get',
                        query: {
                            _id: user.identityId
                        },
                        callback: ( error, result ) => {

                            if( error || !(result && result.length) ) {
                                return next( error );
                            }

                            let userIdentity = result[ 0 ];

                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                action: 'get',
                                model: 'employee',
                                query: {
                                    _id: userIdentity.specifiedBy
                                },
                                options: {
                                    limit: 1,
                                    lean: true
                                }
                            }, function( err, result ) {
                                if( err ) {
                                    return next( err );
                                }
                                if( result && result[ 0 ] ) {
                                    payload.doctorName = Y.doccirrus.schemas.person.personDisplay( {
                                        firstname: result[ 0 ].firstname,
                                        lastname: result[ 0 ].lastname,
                                        title: result[ 0 ].title
                                    } );
                                    return next( null, payload );
                                }
                            } );
                        }
                    } );
                }
            } );
        }

        function getGridFSFiles( user, mediaIds, next ) {

            Y.log( `Getting gridfs files for: ${JSON.stringify( mediaIds )}`, 'debug', NAME );

            let payload = {
                fileMetas: [],
                fileChunks: []
            };

            async.each( Array.from( mediaIds ), ( mediaId, done ) => {
                Promise.all([
                    Y.doccirrus.api.activityTransfer.getFsFiles( user, mediaId ),
                    Y.doccirrus.api.activityTransfer.getFsChunks( user, mediaId )
                ]).then( result => {
                    payload.fileMetas = [ ...payload.fileMetas, result[0] ];
                    payload.fileChunks = [ ...payload.fileChunks, ...result[1] ];
                    return done();
                }).catch( err => {
                    Y.log( `getGridFSFiles: failed to get files from gridfs while transfer: ${err.stack || err}`, 'error', NAME );
                    return done( err );
                });
            }, ( err ) => {
                if( err ) {
                    Y.log( 'failed to get media while transfer: ' + err, 'error', NAME );
                    return next( err );
                }
                return next( null, payload );
            } );
        }

        function upsertMedia( user, data ) {

            Y.log( 'Start upsert media', 'debug', NAME );

            delete data.__v;

            data.ownerId = '*';
            data.ownerCollection = '*';

            data = Y.doccirrus.filters.cleanDbObject( data );

            return Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'upsert',
                model: 'media',
                fields: Object.keys( data ),
                data: data
            } );
        }

        function upsertFileMeta( user, data ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.media.gridfs.saveFileMeta( user, data, false, true, ( err, data ) => {
                    if( err ) {
                        Y.log( 'inCare Failed to add filemeta: ' + err.message, 'error', NAME );
                        reject( err );
                    } else {
                        resolve( data );
                    }
                } );
            } );
        }

        function upsertFileChunks( user, data ) {
            return new Promise( ( resolve, reject ) => {
                const chunkCopy = Object.assign( data, { files_id: new ObjectID( data.files_id ) } );
                Y.doccirrus.media.gridfs.saveChunk( user, chunkCopy, false, true, ( err, data ) => {
                    if( err ) {
                        Y.log( 'inCare Failed to save chunk: ' + err.message, 'error', NAME );
                        reject( err );
                    } else {
                        resolve( data );
                    }
                } );
            } );
        }

        /**
         * Create a transfer entry at the receiving side
         * @param {Object}          user user
         * @param {Object}          payload object
         * @param {Boolean}         receiver
         * @returns {Promise}
         */
        function createTransferLogEntry( user, payload, receiver ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'post',
                    model: 'patienttransfer',
                    data: Y.doccirrus.filters.cleanDbObject( payload ),
                    fields: ['practiceName', 'practiceCity', 'textContent', 'attachedMedia', 'subject']
                }, (err, entryIds) => {
                    if( err ) {
                        Y.log( 'Error on writing new patientTransfer ' + err.message, 'err', NAME );
                        return reject( err );
                    }
                    resolve( entryIds );
                    if( receiver && entryIds && entryIds.length ){
                        createTaskForNewLogEntry( user, payload, entryIds[0] );
                    }
                } );
            } );
        }

        function createTaskForNewLogEntry( user, payload, entryId ) {
            const
                transferEntryId = entryId,
                taskData = {
                    allDay: true,
                    alertTime: (new Date()).toISOString(),
                    title: Y.doccirrus.i18n( 'PatientTransferMojit.message.document_received_title' ),
                    urgency: 2,
                    details: Y.Lang.sub( Y.doccirrus.i18n( 'PatientTransferMojit.message.document_received_details' ),
                        { facility: payload.coname } ),
                    group: false,
                    roles: [ Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG ],
                    creatorName: payload.coname,
                    type: 'NEW_TRANSFER',
                    transferEntryId: transferEntryId
                };

            writeTask( user, taskData );
        }

        function writeTask( user, taskData ) {
            const cleanData = Y.doccirrus.filters.cleanDbObject( taskData );

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'post',
                data: cleanData
            }, function( err ) {//, result
                if( err ) {
                    Y.log( 'Failed to add task: ' + err.message, 'error', NAME );
                }
            } );
        }

        function generateAuditDescription( data ) {
            let
                description = `${data.subject} ` || '';

            return description;
        }

        /**
         * Log at the sender side
         * @param {Object} params
         * @param {Object} params.user
         * @param {Object} params.payload original payload data
         * @param {Object} params.who user
         * @param {Array} params.partners partners
         * @returns {Promise}
         */
        function createLogEntry( params ) {

            const
                { user, payload, who, partners, action } = params,
                entry = Y.doccirrus.api.audit.getBasicEntry( who, action, 'transfer', `${partners.map( p => p.name ).join( ',' )}: ${generateAuditDescription( payload )}` );

            return Y.doccirrus.api.audit.post( {
                user,
                data: Object.assign( {}, entry, {
                    skipcheck_: true
                } )
            } );
        }

        Y.namespace( 'doccirrus.api' ).transfer = {
            name: NAME,

            doTransfer: doTransfer,
            receive: receive
        };
    },
    '0.0.1', {
        requires: []
    }
);


