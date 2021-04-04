/**
 * User: pi
 * Date: 08/09/16  15:39
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'SocketUtils', function( Y, NAME ) {

        let
            communication = Y.doccirrus.communication,
            canReplicateACData = true,
            canReplicateFormData = true,
            i18n = Y.doccirrus.i18n,
            START = i18n( 'socketUtils-serverJS.message.START' ),
            DONE = i18n( 'socketUtils-serverJS.message.DONE' ),
            ERROR = i18n( 'socketUtils-serverJS.message.ERROR' ),
            activeExcDocumentIPs = {};

        function setReplicateACDataListener() {
            function emitCanReplicateACData( user ) {
                communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'crm.canReplicateACData',
                    msg: {
                        data: canReplicateACData
                    },
                    doNotChangeData: true
                } );
            }

            if( Y.doccirrus.auth.isVPRC() ) {
                communication.setListenerForNamespace( '/', 'crm.canReplicateACData', function( message ) {
                    let
                        user = message.user;
                    if( user && Y.doccirrus.auth.getLocalTenantId() === user.tenantId ) {
                        emitCanReplicateACData( user );
                    } else {
                        Y.log( 'Received crm.canReplicateACData, but host in not valid MVPRC admin', 'warn', NAME );
                    }
                } );
                communication.setListenerForNamespace( '/', 'crm.replicateACData', function( message ) {
                    let
                        user = message.user;
                    if( user && Y.doccirrus.auth.getLocalTenantId() === user.tenantId && canReplicateACData ) {
                        let
                            async = require( 'async' );

                        canReplicateACData = false;
                        Y.log( 'Starting activitysequence and catalogusage replication process.', 'debug', NAME );
                        Y.doccirrus.communication.emitNamespaceEvent( {
                            event: 'message',
                            nsp: 'default',
                            tenantId: user.tenantId,
                            messageId: 'crm.replicateACData',
                            msg: { data: START }
                        } );

                        async.parallel( {
                            replicateActivitySequence( done ){
                                Y.doccirrus.api.activitysequence.replicateEntries( {
                                    user,
                                    callback: done
                                } );
                            },
                            replicateCatalogUsage( done ){
                                Y.doccirrus.api.catalogusage.replicateEntries( {
                                    user,
                                    callback: done
                                } );
                            }
                        }, function( err ) {
                            if( err ) {
                                Y.log( `Activitysequence and catalogusage replication process finished with error: ${JSON.stringify( err )}`, 'debug', NAME );
                                Y.doccirrus.communication.emitNamespaceEvent( {
                                    event: 'message',
                                    nsp: 'default',
                                    tenantId: user.tenantId,
                                    messageId: 'crm.replicateACData',
                                    msg: { data: ERROR },
                                    meta: {
                                        level: 'ERROR'
                                    }
                                } );
                                return;
                            }
                            canReplicateACData = true;
                            emitCanReplicateACData( user );
                            Y.log( 'Activitysequence and catalogusage replication process finished successfully', 'debug', NAME );
                            Y.doccirrus.communication.emitNamespaceEvent( {
                                event: 'message',
                                nsp: 'default',
                                tenantId: user.tenantId,
                                messageId: 'crm.replicateACData',
                                msg: { data: DONE },
                                meta: {
                                    level: 'SUCCESS'
                                }
                            } );
                        } );

                    }
                } );
            }

        }

        /**
         *  Replicate master form set to all tenants
         */

        function setReplicateFormDataListener() {

            if( !Y.doccirrus.auth.isVPRC() ) {
                return;
            }

            //  listen for events from UI
            communication.setListenerForNamespace( '/', 'crm.canReplicateFormData', onCanReplicateFormData );
            communication.setListenerForNamespace( '/', 'crm.replicateFormData', onReplicateFormData );

            //  send response to UI when checking permission / server type
            function emitCanReplicateFormData( user ) {
                communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'crm.canReplicateFormData',
                    msg: {
                        data: canReplicateFormData
                    },
                    doNotChangeData: true
                } );
            }

            /**
             *  CRM UI calls this to enable/disable the 'replicate forms' button
             *  @param  message
             *  @param  message.user    {Object}    REST user or equivalent
             */

            function onCanReplicateFormData( message ) {
                var user = message.user;
                if( user && Y.doccirrus.auth.getLocalTenantId() === user.tenantId ) {
                    emitCanReplicateFormData( user );
                }
            }

            /**
             *  User has requested replication of form data to all tenants in CRM UI
             *
             *  @param  message             {Object}
             *  @param  message.user        {Object}    REST user or equivalent
             *  @param  message.tenatIds    {Object}    Array of tenant id strings
             */

            function onReplicateFormData( message ) {
                var
                    user = message.user;

                Y.log( 'Received request to replicate form to tenants: ' + JSON.stringify( message.tenantIds ), 'warn', NAME );

                if( !user || !canReplicateFormData || Y.doccirrus.auth.getLocalTenantId() !== user.tenantId ) {
                    Y.log( 'Can not replicate forms, not MVPRC or missing permissions.', 'warn', NAME );
                    return;
                }

                if( !message || !message.tenantIds ) {
                    Y.log( 'Client did not pass tenantIds to rpelicate to: ' + JSON.stringify( message ), 'warn', NAME );
                    return;
                }

                //  block concurrent replication
                canReplicateFormData = false;

                Y.log( 'Starting forms replication process.', 'debug', NAME );
                Y.doccirrus.communication.emitNamespaceEvent( {
                    event: 'message',
                    nsp: 'default',
                    tenantId: user.tenantId,
                    messageId: 'crm.replicateFormData',
                    msg: { data: START }
                } );

                Y.doccirrus.forms.replicate.allTenants( user, message.tenantIds, onReplicatedAll );

                function onReplicatedAll( err ) {
                    canReplicateFormData = true;

                    if( err ) {
                        Y.log( 'Form replication process finished with error: ' + JSON.stringify( err ), 'debug', NAME );
                        Y.doccirrus.communication.emitNamespaceEvent( {
                            event: 'message',
                            nsp: 'default',
                            tenantId: user.tenantId,
                            messageId: 'crm.replicateFormData',
                            msg: { data: ERROR },
                            meta: {
                                level: 'ERROR'
                            }
                        } );
                        return;
                    }

                    Y.doccirrus.communication.emitNamespaceEvent( {
                        event: 'message',
                        nsp: 'default',
                        tenantId: user.tenantId,
                        messageId: 'crm.replicateFormData',
                        msg: { data: DONE },
                        meta: {
                            level: 'SUCCESS'
                        }
                    } );

                    Y.log( 'Completed replication of form data to selected tenants.', 'debug', NAME );
                }

            }
        }

        function setActivateCustomerListener() {
            if( Y.doccirrus.auth.isVPRC() ) {
                communication.setListenerForNamespace( '/', 'crm.activateTenant', function( message ) {
                    let
                        socket = this,
                        { data, user } = message;
                    if( user && data && Y.doccirrus.auth.isVPRCAdmin( user ) ) {
                        Y.doccirrus.api.company.activateTenant( {
                            user,
                            data,
                            callback( err, result ){
                                communication.emitEventForSocket( {
                                    socket,
                                    event: 'crm.activateTenant',
                                    msg: {
                                        error: err,
                                        data: result
                                    },
                                    doNotChangeData: true
                                } );
                            }

                        } );
                    }
                } );

                communication.setListenerForNamespace( '/', 'crm.deactivateTenant', function( message ) {
                    let
                        socket = this,
                        { data, user } = message;
                    if( user && data && Y.doccirrus.auth.isVPRCAdmin( user ) ) {
                        Y.doccirrus.api.company.deactivateTenant( {
                            user,
                            data,
                            callback( err, result ){
                                communication.emitEventForSocket( {
                                    socket,
                                    event: 'crm.deactivateTenant',
                                    msg: {
                                        error: err,
                                        data: result
                                    },
                                    doNotChangeData: true
                                } );
                            }
                        } );
                    }
                } );
            }
        }

        function setExtDocumentTabOpenListener() {
            function onExtDocumentTabClosed( socket ) {
                let
                    socketIP = communication.getIpOfSocketConnection( socket );
                if( socketIP && activeExcDocumentIPs[ socketIP ] ) {
                    activeExcDocumentIPs[ socketIP ] = activeExcDocumentIPs[ socketIP ].filter( obj => obj.socketId !== socket.id );
                    if( 0 === activeExcDocumentIPs[ socketIP ].length ) {
                        delete activeExcDocumentIPs[ socketIP ];
                    }
                }
            }

            if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() ) {
                communication.setListenerForNamespace( '/', 'incase.extDocumentTabOpened', function( message ) {
                    let
                        socket = this,
                        socketIP = communication.getIpOfSocketConnection( socket ),
                        activityId = message.activityId,
                        isNew = message.isNew;
                    if( socketIP && activityId ) {
                        activeExcDocumentIPs[ socketIP ] = activeExcDocumentIPs[ socketIP ] || [];
                        activeExcDocumentIPs[ socketIP ] = activeExcDocumentIPs[ socketIP ].filter( item => item.socketId !== socket.id );
                        activeExcDocumentIPs[ socketIP ].push( {
                            socketId: socket.id,
                            user: socket.user,
                            activityId,
                            isNew,
                            socket
                        } );
                    }

                } );

                communication.setListenerForNamespace( '/', 'incase.extDocumentTabClosed', function() {
                    onExtDocumentTabClosed( this );

                } );

                communication.onSocketDisconnect( onExtDocumentTabClosed );
            }
        }

        function setGetCatalogTextListener() {
            if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() ) {
                communication.setListenerForNamespace( '/', 'incase.getCatalogText', function( message, callback ) {
                    let
                        user = message.user,
                        query = message.query;
                    Y.doccirrus.api.catalogtext.get( {
                        user,
                        query,
                        callback
                    } );
                } );

            }
        }

        function setJSONRPCListener() {
            if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isISD() ) {
                communication.setListenerForNamespace( '/', 'apiCall', function( message, callback ) {
                    const
                        socket = this,
                        req = socket.request,
                        params = {
                            id: 'id',
                            jsonrpc: '2.0',
                            method: message.method,
                            params: {
                                query: message.query,
                                data: message.data,
                                options: message.options
                            }
                        };
                    Y.doccirrus.JSONRPCController.handleRequest( {
                        test: true,
                        doNotStringify: true,
                        params,
                        req
                    }, ( err, data ) => {
                        callback( err, data.data );
                    } );
                } );
            }
        }

        function setMessageToClientsListener() {
            if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isISD() ) {
                communication.setListenerForNamespace( '/', 'messageToClients', function( message ) {
                    const
                        { user, event, data = {} } = message;

                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        nsp: 'default',
                        event,
                        msg: { data }
                    } );

                } );
            }
        }

        function initListeners() {
            setReplicateACDataListener();
            setReplicateFormDataListener();
            setActivateCustomerListener();
            setExtDocumentTabOpenListener();
            setGetCatalogTextListener();
            setJSONRPCListener();
            setMessageToClientsListener();
            Y.doccirrus.api.masterTab.initSocketListeners();
        }

        function getActiveExtDocumentActivityIdByIP( ip ) {
            return activeExcDocumentIPs[ ip ];
        }

        Y.namespace( 'doccirrus' ).socketUtils = {
            initListeners(){
                initListeners();
            },
            getActiveExtDocumentActivityIdByIP
        };
    },
    '0.0.1', {
        requires: [
            'dccommunication',
            'dcauth',
            'masterTab-api'
        ]
    }
);
