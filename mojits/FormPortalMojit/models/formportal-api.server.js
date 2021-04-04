/**
 * User: pi
 * Date: 17/08/16  14:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'formportal-api', function( Y, NAME ) {

        /**
         * Returns array of active form portals of user tenant
         * @method getActivePortalList
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function getActivePortalList( args ) {
            let
                { user, callback } = args;
            Y.doccirrus.communication.getConnectedRoomSockets( { room: Y.doccirrus.socketIOPRC.ROOMS.FORM_PORTAL_ROOM }, function( err, sockets ) {
                if( err ) {
                    return callback( err );
                }

                callback( null, sockets.filter( socket => socket.user.tenantId === user.tenantId ).map( socket => {
                    return {
                        name: socket.formPortalId
                    };
                } ) );
            } );

        }

        /**
         * Generates portal token
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Object} args.data.formPortalId
         * @param {Function} args.callback
         */
        function generatePortalToken( args ) {
            let
                jwt = require( 'jsonwebtoken' ),
                { user, data:{ formPortalId } = {}, callback } = args,
                _user = {
                    formPortalId,
                    tenantId: user.tenantId,
                    username: user.id
                };

            Y.doccirrus.auth.getKeyPair( user, function( err, keys ) {
                if( err ) {
                    return callback( err );
                }
                jwt.sign( _user, keys.privateKey, {
                    expiresIn: '8h',
                    algorithm: 'HS256'
                }, callback );
            } );
        }

        /**
         * Checks restricted portal by portal id, if found update activityItem and emits socket event for client
         * @method sentToFormPortal
         * @param {Object} args
         * @param {Object} args.data
         * @param {String} args.data.portalId portal Id
         * @param {String} args.data.activityId activity id
         * @param {Boolean} [args.data.force] will override active item if it is set.
         * @param {Function} args.callback
         */
        function sentToFormPortal( args ) {
            let
                { user, data:{ portalId, activityId, force = false } = {}, callback } = args,
                activeUrl,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.restrictedportal.get( {
                        user,
                        query: {
                            portalId: portalId
                        },
                        options: {
                            lean: true
                        }, callback( err, results ){
                            if( err ) {
                                return next( err );
                            }
                            if( !results.length ) {
                                Y.log( `sentToFormPortal. Invalid portalId: ${portalId}`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid portalId' } ) );
                            }
                            if( results[ 0 ].activeItem && !force || results[ 0 ].activeUrl && !force ) {
                                return next( new Y.doccirrus.commonerrors.DCError( 30000 ) );
                            }

                            if ( results[ 0 ].activeUrl ) {
                                activeUrl = results[ 0 ].activeUrl;
                            }
                            next( null, results[ 0 ]._id );
                        }
                    } );
                },
                function( portalEntryId, next ) {
                    getDataByActiveItem( {
                        user,
                        data: {
                            activeItem: activityId
                        },
                        callback( err, portalData ){
                            if( err ) {
                                next( err );
                                return;
                            }
                            next( null, portalEntryId, portalData );
                        }
                    } );
                },
                function( portalEntryId, portalData, next ) {
                    let
                        data = {
                            $set: {
                                activeItem: activityId
                            }
                        };

                    if ( activeUrl ) {
                        data.$unset = {
                            activeUrl: 1
                        };
                    }

                    Y.doccirrus.api.restrictedportal.update( {
                        user,
                        query: {
                            _id: portalEntryId
                        },
                        fields: ['activeItem', 'activeUrl'],
                        data: data,
                        callback( err ){
                            if( err ) {
                                return next( err );
                            }
                            next( null, portalData );
                        }
                    } );
                }
            ], function( err, portalData ) {
                if( err ) {
                    return callback( err );
                }
                emitEvent( {
                    data: portalData,
                    portalId
                } );
                callback();
            } );

        }

        /**
         * helper
         * Emits "system.NEW_FORM_FOR_FORM_PORTAL" event to form portal
         * @param {Object} config
         * @param {Object} [config.error] error to display on form portal
         * @param {Object} [config.data] data object
         * @param {String} config.portalId form portal id
         */
        function emitEvent( config = {} ) {
            let
                { error, data, portalId } = config;
            Y.doccirrus.communication.emitEventForRoom( {
                event: 'system.NEW_FORM_FOR_FORM_PORTAL',
                room: portalId,
                doNotChangeData: true,
                msg: {
                    data: data,
                    error: error
                }
            } );
        }

        /**
         * helper
         * Emits "system.NEW_IFRAME_URL_FOR_FORM_PORTAL" event to form portal
         * @param {Object} config
         * @param {Object} [config.data] data object
         * @param {String} config.portalId form portal id
         */
        function emitIframeUrlEvent( config = {} ) {
            let
                { data, portalId } = config;
            Y.doccirrus.communication.emitEventForRoom( {
                event: 'system.NEW_IFRAME_URL_FOR_FORM_PORTAL',
                room: portalId,
                doNotChangeData: true,
                msg: {
                    data: data
                }
            } );
        }

        /**
         * Prepares data for form portal
         * @param {Object} args
         * @param {Object} args.data
         * @param {String} args.data.activeItem
         * @param {Function} args.callback
         */
        function getDataByActiveItem( args ){
            let
                { user, data: {activeItem} = {}, callback } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    if( activeItem ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            action: 'get',
                            query: {
                                _id: activeItem
                            },
                            options: {
                                lean: true,
                                select: {
                                    formId: 1,
                                    attachments: 1
                                }
                            }
                        }, function( err, results ) {
                            let
                                [ activity ] = results || [];
                            if( err ) {
                                return next( err );
                            }
                            if( !activity ) {
                                Y.log( `sendActiveItem. Activity not found, activity id: ${activeItem}`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Activity not found' } ) );
                            }
                            if( !activity.formId || !activity.attachments.length ) {
                                Y.log( `sendActiveItem. Activity does not have form, activity id: ${activeItem}`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 30001 ) );
                            }
                            next( null, activity );
                        } );
                    } else {
                        setImmediate( next, null, null );
                    }
                },
                function( activity, next ) {
                    if( !activity ) {
                        setImmediate( next, null, null ); // active item should be dropped
                        return;
                    }
                    async.parallel( {
                        document( done ){
                            let
                                query = {
                                    _id: { $in: activity.attachments },
                                    type: 'FORM'
                                };
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'document',
                                query: query,
                                action: 'get',
                                options: {
                                    lean: true,
                                    select: {
                                        formState: 1,
                                        formData: 1
                                    }
                                }

                            }, function( err, results ) {
                                let
                                    [document] = results || [];
                                if( err ) {
                                    return done( err );
                                }
                                if( !document ) {
                                    Y.log( `sendActiveItem. Document not found, query: ${JSON.stringify( query )}`, 'error', NAME );
                                    return done( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Document not found' } ) );
                                }
                                if( Boolean( document.formData ) || !Boolean( document.formState ) ) {
                                    Y.log( `sendActiveItem. Form is invalid. formData: ${Boolean( document.formData )}, formState: ${Boolean( document.formState )}`, 'error', NAME );
                                    return done( new Y.doccirrus.commonerrors.DCError( 30005 ) );
                                }
                                done( null, results[ 0 ] );
                            } );
                        },
                        packageData( done ){
                            Y.doccirrus.forms.package.toJSON( user, activity.formId, '', done );
                        }
                    }, next );
                }
            ], callback );
        }

        /**
         * Helper.
         * Sends active item to form portal. Using "system.NEW_FORM_FOR_FORM_PORTAL" event.
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.error] immediately emits event with error
         * @param {Object} [args.portalId] can be skipped only in case of error is present
         * @param {Object} [args.activeItem] if not present, emits event to drop form
         * @param {Object} [args.doNotEmitError=false] if set true, only callback will be called. Socket event won't be emitted.
         * @param {Function} [args.callback]
         */
        function sendActiveItem( args ) {
            let
                { user, portalId, error, activeItem, callback = () => {}, doNotEmitError } = args;

            function finalCallback( error, data ) {
                if( error && doNotEmitError ) {
                    callback( error, data );
                    return;
                }
                emitEvent( {
                    data,
                    error,
                    portalId
                } );
                callback( error, data );
            }

            if( error ) {
                finalCallback( error );
                return;
            }
            getDataByActiveItem( {
                user,
                data: {
                    activeItem
                },
                callback: finalCallback
            } );

        }

        /**
         * Helper.
         * Checks active item of form portal and send it to form portal via socket.
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.portalId form portal Id
         */
        function checkActiveItem( args ) {
            let
                { user, portalId } = args;
            Y.doccirrus.api.restrictedportal.get( {
                user: user,
                query: {
                    portalId: portalId
                },
                options: {
                    lean: true
                },
                callback( error, results ){
                    let
                        activeItem = results && results[ 0 ] && results[ 0 ].activeItem;
                    if( error ) {
                        Y.log( `checkActiveItem. Can not get restricted portal entry. portalId: ${portalId}. Error: ${JSON.stringify( error )}`, 'error', NAME );
                    } else if( !results[ 0 ] ) {
                        Y.log( `checkActiveItem. Portal is not registered. portalId: ${portalId}.`, 'error', NAME );
                        error = new Y.doccirrus.commonerrors.DCError( 30004 );
                    }
                    sendActiveItem( {
                        user,
                        portalId,
                        activeItem,
                        error
                    } );
                }
            } );
        }

        /**
         * Helper.
         * Checks active item of form portal and send it to form portal via socket.
         * @param {Object} args
         * @param {Object} args.user
         * @param {String} args.portalId form portal Id
         */
        function dropActiveItem( args ) {
            let
                { user, portalId } = args,
                data = { activeItem: '' };

            Y.doccirrus.api.restrictedportal.put( {
                user: user,
                query: {
                    portalId
                },
                fields: [ 'activeItem' ],
                data: data,
                callback( error ){
                    if( error ) {
                        Y.log( `dropActiveItem. Can not update restricted portal entry. portalId: ${portalId}. Error: ${JSON.stringify( error )}`, 'error', NAME );
                    }
                    sendActiveItem( {
                        user,
                        portalId,
                        error
                    } );

                }
            } );
        }

        /**
         * @method saveForm
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.formState
         * @param {String} args.documentId
         * @param {String} args.portalId
         */
        function saveForm( args ) {
            let
                { user, formState, documentId, portalId } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.restrictedportal.get( {
                        user: user,
                        query: {
                            portalId
                        },
                        options: {
                            lean: true
                        },
                        callback( err, results ){
                            if( err ) {
                                Y.log( `saveForm. Can not get restricted portal entry. portalId: ${portalId}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                                return next( err );
                            }
                            if( !results.length ) {
                                Y.log( `saveForm. Restricted portal not found. portalId: ${portalId}.`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Restricted portal not found' } ) );
                            }
                            if( !results[ 0 ].activeItem ) {
                                Y.log( `saveForm. Restricted portal does not have active item. portalId: ${portalId}.`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 30003 ) );
                            }
                            next( null, results[ 0 ].activeItem );
                        }
                    } );
                },
                function( activeItem, next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            _id: activeItem
                        },
                        options: {
                            lean: true,
                            select: {
                                attachments: 1
                            }
                        }
                    }, function( err, results ) {
                        let
                            [ activity ] = results || [],
                            hasDocument;
                        if( err ) {
                            return next( err );
                        }
                        if( !activity ) {
                            Y.log( `saveForm. Activity not found, activity id: ${activeItem}`, 'error', NAME );
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Activity not found' } ) );
                        }
                        if( !activity.attachments.length ) {
                            Y.log( `saveForm. Activity does not have form, activity id: ${activeItem}`, 'error', NAME );
                            return next( new Y.doccirrus.commonerrors.DCError( 30001 ) );
                        }
                        hasDocument = activity.attachments.some( attachmentId => attachmentId === documentId );
                        if( !hasDocument ) {
                            Y.log( `saveForm. Activity does not have specified document id: ${documentId}. activity id: ${activeItem}. User tries to update document which is belong to another activity.`, 'error', NAME );
                            return next( new Y.doccirrus.commonerrors.DCError( 30002 ) );
                        }
                        next( null );
                    } );
                },
                function( next ) {
                    let
                        data = {
                            formState
                        };
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'document',
                        action: 'put',
                        query: {
                            _id: documentId
                        },
                        fields: [ 'formState' ],
                        data: Y.doccirrus.filters.cleanDbObject( data )
                    }, next );
                }
            ], function( err ) {
                if( err ) {
                    emitEvent( {
                        portalId,
                        error: err
                    } );
                    return;
                }
                dropActiveItem( {
                    user,
                    portalId
                } );
            } );
        }

        /**
         * Initializes web socket listeners for form portal
         * Can not be called via /1/
         * @method initSocketListeners
         * @param {Object} args
         * @param {Object} args.socket
         */
        function initSocketListeners( args ) {
            let
                { socket } = args,
                { user } = socket;
            if( socket ) {
                Y.doccirrus.communication.setListenerForSocket( {
                    socket,
                    event: 'formportal.checkActiveItem',
                    reduced: true,
                    callback: function() {
                        checkActiveItem( {
                            portalId: socket.formPortalId,
                            user
                        } );
                    }
                } );
                Y.doccirrus.communication.setListenerForSocket( {
                    socket,
                    event: 'formportal.dropActiveItem',
                    reduced: true,
                    callback: function() {
                        dropActiveItem( {
                            portalId: socket.formPortalId,
                            user
                        } );
                    }
                } );
                Y.doccirrus.communication.setListenerForSocket( {
                    socket,
                    event: 'formportal.saveForm',
                    reduced: true,
                    callback: function( message ) {
                        saveForm( {
                            formState: message.formState,
                            documentId: message.documentId,
                            portalId: socket.formPortalId,
                            user
                        } );
                    }
                } );
            }
        }

        /**
         * Registers an new portal
         * 1. If there is entry with same remoteAddress - deletes it
         * 2. create new entry
         * @param {Object} args
         * @param {Object} args.data
         * @param {Function} args.callback
         *
         * @return {Function} args.callback
         */
        function registerPortal( args ) {
            let
                async = require( 'async' ),
                { user, data = {}, callback } = args;
            if( !data.remoteAddress ) {
                Y.log( `registerPortal. remoteAddress is missing. data: ${data}`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'remoteAddress is missing' } ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'restrictedportal',
                        user,
                        query: {
                            remoteAddress: data.remoteAddress
                        },
                        options: {
                            lean: true,
                            limit: 1
                        }
                    }, function( err, results ) {
                        if( err ) {
                            return next( err );
                        }
                        next( err, results[ 0 ] );
                    } );
                }, function( entry, next ) {
                    if( entry ) {
                        Y.doccirrus.mongodb.runDb( {
                            action: 'delete',
                            model: 'restrictedportal',
                            user,
                            query: {
                                _id: entry._id
                            }
                        }, function( err ) {
                            if( !err ) {
                                Y.doccirrus.communication.emitEventForRoom( {
                                    event: 'system.CLOSE_FORM_PORTAL',
                                    room: entry.portalId
                                } );
                            }
                            next( err );
                        } );
                    } else {
                        setImmediate( next );
                    }
                }, function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        action: 'post',
                        model: 'restrictedportal',
                        user,
                        data: Y.doccirrus.filters.cleanDbObject( data )
                    }, next );
                }
            ], callback );
        }

        /**
         * Checks restricted portal by portal id, if found update activeUrl and emits socket event for client
         * @public
         * @method sentToFormPortal
         * @async
         *
         * 1. Find the portalId in the restricted portals, but return error forced flag is not true, and it already has an activeUrl/activeitem set
         * 2. update the DB entry with the activeUrl passed and remove the activeItem it there was any
         * 3. Emit proper socket event to the client
         *
         * @param {Object} args
         * @param {Object} args.data
         * @param {String} args.data.portalId portal Id
         * @param {String} args.data.activeUrl url to render in client iframe
         * @param {Boolean} [args.data.force] will override activeUrl if it is set.
         * @param {Function} args.callback
         */
        function sendUrl( args ) {
            let
                { user, data:{ portalId, activeUrl, force = false } = {}, callback } = args,
                activeItem,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.restrictedportal.get( {
                        user,
                        query: {
                            portalId: portalId
                        },
                        options: {
                            lean: true
                        }, callback( err, results ){
                            if( err ) {
                                return next( err );
                            }
                            if( !results.length ) {
                                Y.log( `sentToFormPortal. Invalid portalId: ${portalId}`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid portalId' } ) );
                            }
                            if( results[ 0 ].activeItem && !force || results[ 0 ].activeUrl && !force ) {
                                return next( new Y.doccirrus.commonerrors.DCError( 30000 ) );
                            }

                            if ( results[ 0 ].activeItem ) {
                                activeItem = results[ 0 ].activeItem;
                            }
                            next( null, results[ 0 ]._id );
                        }
                    } );
                },
                function( portalEntryId, next ) {
                    let
                        data = {
                            $set: {
                                activeUrl
                            }
                        };

                    if ( activeItem ) {
                        data.$unset = {
                            activeItem: 1
                        };
                    }

                    Y.doccirrus.api.restrictedportal.update( {
                        user,
                        query: {
                            _id: portalEntryId
                        },
                        fields: ['activeItem', 'activeUrl'],
                        data: data,
                        callback( err ){
                            if( err ) {
                                return next( err );
                            }
                            next( null, activeUrl);
                        }
                    } );
                }
            ], function( err, activeUrl ) {
                if( err ) {
                    return callback( err );
                }
                emitIframeUrlEvent( {
                    data: {
                        activeUrl
                    },
                    portalId
                } );
                callback();
            } );
        }

        Y.namespace( 'doccirrus.api' ).formportal = {

            name: NAME,

            getActivePortalList: function( args ) {
                Y.log('Entering Y.doccirrus.api.formportal.getActivePortalList', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formportal.getActivePortalList');
                }
                getActivePortalList( args );
            },
            generatePortalToken: function( args ) {
                Y.log('Entering Y.doccirrus.api.formportal.generatePortalToken', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formportal.generatePortalToken');
                }
                generatePortalToken( args );
            },
            sentToFormPortal: function( args ) {
                Y.log('Entering Y.doccirrus.api.formportal.sentToFormPortal', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formportal.sentToFormPortal');
                }
                sentToFormPortal( args );
            },
            initSocketListeners: function( args ) {
                Y.log('Entering Y.doccirrus.api.formportal.initSocketListeners', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formportal.initSocketListeners');
                }
                initSocketListeners( args );
            },
            registerPortal: function( args ) {
                Y.log('Entering Y.doccirrus.api.formportal.registerPortal', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formportal.registerPortal');
                }
                registerPortal( args );
            },
            sendUrl: function( args ) {
                Y.log('Entering Y.doccirrus.api.formportal.sendUrl', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formportal.sendUrl');
                }
                sendUrl( args );
            }

        };
    },
    '0.0.1', {
        requires: [ 'dccommonerrors', 'dccommunication', 'v_formportal-schema' ]
    }
);
