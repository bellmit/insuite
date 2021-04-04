/**
 * Handles top menu and login form
 * Author: Richard Strickland
 * Copright Doc Cirrus GmbH
 */

/*global JSON, YUI, $, io, ko, moment */

YUI.add( 'DocCirrusBinderIndex', function( Y, NAME ) {

    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        TASK_DOES_NOT_EXIST = i18n( 'DocCirrus.dcplianframe_JS.TASK_DOES_NOT_EXIST' ),
        CLOSE_MESSAGE_ACTION = 'closeMessage',
        timer,
        peek = ko.utils.peekObservable;

    // set moment to use specific lang in all client files
    moment.locale( Y.doccirrus.i18n.language );

    window.addEventListener( 'error', Y.doccirrus.errorhandler.handler );

    Y.on( 'logoutRedirect', function() {
        clearTimeout( timer );
    } );

    /**
     * show a warning message and wait for user action
     * on click or focus the dialog hides and a request will refresh
     */
    function informUser() {
        var
            warningModal,
            renewSession = function() {
                Y.doccirrus.jsonrpc.api.calendar.gettime();
            };

        warningModal = new Y.doccirrus.DCWindow( {
            className: 'DCWindow-warningMessage',
            bodyContent: i18n( 'DocCirrus.dcplianframe_JS.message.YOU_WILL_BE' ),
            title: i18n( 'DocCirrus.dcplianframe_JS.message.SECURITY' ),
            centered: true,
            modal: true,
            render: document.body,
            buttons: {
                header: [ 'close' ],
                footer: []
            },
            hideOn: [
                { eventName: 'clickoutside' },
                { eventName: 'focusoutside' }
            ],
            after: {
                visibleChange: function() {
                    var self = this,
                        visible = self.get( 'visible' );
                    if( !visible ) {
                        clearTimeout( timer );
                        Y.doccirrus.communication.sendMessageToMySession( { data: { what: 'CLEAR_TIMER' } } );
                        renewSession();
                    }
                }
            }
        } );
        timer = setTimeout( function() {
            Y.doccirrus.utils.logoutRedirect();
        }, 60000 );

        Y.doccirrus.communication.onceMessageToMe( {
            done: function( msg ) {
                var
                    data = msg && msg.data && msg.data[ 0 ];
                if( data && 'CLEAR_TIMER' === data.what ) {
                    clearTimeout( timer );
                    warningModal.close();
                }
            }
        } );

    }

    function renderOnlineStatus( onlineStatuses ) {
        var status = '-',
            statuses = [];
        onlineStatuses = onlineStatuses || {};
        if( onlineStatuses.onlineEmp ) {
            statuses.push( onlineStatuses.onlineEmp );
        }
        if( onlineStatuses.onlinePat ) {
            if( !onlineStatuses.pucStatus ) {
                onlineStatuses.onlinePat = '<span style="color: #f66a76">' + onlineStatuses.onlinePat + '<span>';
            }
            statuses.push( onlineStatuses.onlinePat );
        }
        if( onlineStatuses.onlinePartner ) {
            if( !onlineStatuses.pucStatus ) {
                onlineStatuses.onlinePartner = '<span style="color: #F66A76">' + onlineStatuses.onlinePartner + '<span>';
            }
            statuses.push( onlineStatuses.onlinePartner );
        }
        if( statuses.length ) {
            status = statuses.join( '' );
        }
        return status;

    }

    function updateOnlineStatus() {
        if( !Y.doccirrus.NavBarHeader ) {
            return;
        }
        Y.doccirrus.jsonrpc.api.identity.getOnlineStatus()
            .done( function( response ) {
                var onlineStatuses = response && response.data && response.data[ 0 ];
                Y.doccirrus.NavBarHeader.onlineStatus( renderOnlineStatus( onlineStatuses ) );
            } )
            .fail( function() {
                Y.doccirrus.NavBarHeader.onlineStatus( renderOnlineStatus() );
            } );
    }

    // setup incomming call listener and handler
    function setupCallHandler() {
        var
            RINGTIMEOUT = 60000;

        function callPicked( callData ) {
            var
                conferenceUrl = callData.conferenceUrl;
            window.open( conferenceUrl, '_blank' );
        }

        function callRejected( callData ) {

            Promise.resolve( Y.doccirrus.jsonrpc.api.telecommunication.rejectCall( {
                data: {
                    callData: callData
                }
            } ) )
                .catch( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        }

        function showInboundCallModal( callData ) {
            var
                node = Y.Node.create( '<div></div>' ),
                myModal,
                jadeData = Y.merge( {}, callData, callData.caller ),
                audio = new Audio( '/static/DocCirrus/assets/audio/phone_call.wav' ),
                rejected = true;

            audio.loop = true;
            audio.play();

            function getTemplate( node, data, callback ) {
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'inboundcall_modal',
                    'IntouchPrivateMojit',
                    data,
                    node,
                    callback
                );
            }

            jadeData.type = Y.doccirrus.schemaloader.getEnumListTranslation( 'employee', 'Employee_E', jadeData.type, '-de' );

            getTemplate( node, jadeData, function( callback ) {
                myModal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-inboundCall',
                    title: "Doc Cirrus inTouch - Eingehender Anruf",
                    bodyContent: node,
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_LARGE,
                    //                        height: 600,
                    minHeight: 250,
                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                    centered: true,
                    modal: true,
                    dragable: true,
                    maximizable: false,
                    resizeable: true,
                    render: document.body,
                    buttons: {
                        header: [ 'close' ],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                label: 'Ablehnen',
                                classNames: 'btn btn-danger',
                                action: function() {
                                    this.close();
                                }
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                classNames: 'btn btn-success',
                                label: 'Annehmen',
                                action: function( event ) {
                                    var okBtn = event.currentTarget.getDOMNode();
                                    okBtn.disabled = true;

                                    callPicked( callData );
                                    rejected = false;
                                    this.close();
                                }
                            } )
                        ]
                    }
                } );

                setTimeout( function autoReject() {
                    rejected = true;
                    myModal.close();
                }, RINGTIMEOUT );

                myModal.on( 'visibleChange', function( event ) {
                    if( false === event.newVal ) {
                        audio.pause();
                        if( rejected ) {
                            callRejected( callData );
                        }
                        Y.doccirrus.communication.sendMessageTo( {
                            targetId: callData.identityId,
                            data: { what: 'MODAL_CLOSED' }
                        } );
                    }
                } );

                Y.doccirrus.communication.onceMessageToMe( {
                    done: function( msg ) {
                        var
                            data = msg && msg.data && msg.data[ 0 ];
                        if( data && 'MODAL_CLOSED' === data.what ) {
                            rejected = false;
                            myModal.close();
                        }
                    }
                } );

                if( callback ) {
                    return callback( myModal );
                }
            } );

            $( node.getDOMNode() ).on( 'click.phoneCall', '.dcPhoneCall img', function() {
                audio.pause();
            } );
            // handle the case the caller cancels the call
            Y.doccirrus.communication.once( {
                event: 'CALL_CANCELLED',
                done: function( response ) {
                    var
                        data = response.data && response.data[ 0 ];
                    rejected = false;
                    Y.log( 'CALL_CANCELED: ' + JSON.stringify( data ), 'debug', NAME );
                    myModal.close();
                }
            } );
        }

        Y.doccirrus.communication.on( {
            event: 'INCOMING_CALL',
            done: function handleCall( response ) {
                var
                    callData = response.data && response.data[ 0 ];

                Y.log( 'INCOMING_CALL' + JSON.stringify( callData ), 'debug', NAME );
                if( !Y.doccirrus.utils.supportsWebRTC() ) {
                    callRejected( callData );
                    return;
                }
                showInboundCallModal( callData );
            }
        } );
    }

    function addItemsToMenu( params ) {
        var
            items = params && params.items,
            targetMenu = params && params.targetMenu,
            rootPath = params && params.rootPath,
            keepVisible = params && params.keepVisible;
        targetMenu.menu.clearItems();
        targetMenu.menu.addItems( items.map( function( item ) {
            var
                url = item.url,
                elem;

            if( Y.doccirrus.schemas.apptoken.appTokenTypes.LOCAL === item.type || Y.doccirrus.schemas.apptoken.appTokenTypes.BUILTIN === item.type ) {
                elem = document.createElement( "a" );
                elem.href = url;
                url = Y.doccirrus.infras.getPrivateURL( elem.pathname + (elem.hash || '') );
            }
            return {
                text: item.title,
                name: item.appName,
                href: rootPath + '#/' + item.appName
            };
        } ) );
        if( targetMenu.menu.items().length ) {
            targetMenu.visible( true );
        } else {
            targetMenu.visible( keepVisible || false );
        }
    }

    function handleAppRegs( params ) {
        var
            appRegs = params && params.appRegs || [],
            appMenuItems = [],
            appAccessManagerItems = [],
            serviceMenu,
            adminMenu,
            appMenu,
            appAccessManager,
            hasSolsConfig = Y.doccirrus.auth.hasSolsConfig();

        if ( Y.doccirrus.NavBarHeader ) {
            serviceMenu = Y.doccirrus.NavBarHeader.mainMenu.getItemByName( 'drop-services' );
            adminMenu = Y.doccirrus.NavBarHeader.mainMenu.getItemByName( 'drop-admin' );
            appMenu = serviceMenu && serviceMenu.menu && serviceMenu.menu.getItemByName( 'appMenu' );
            appAccessManager = adminMenu && adminMenu.menu && adminMenu.menu.getItemByName( 'appAccessManager' );
        }

        Y.doccirrus.auth.setAppRegs( appRegs );
        appRegs.forEach( function( appReg ) {
            if( appReg.uiConfiguration && appReg.hasAccess ) {
                appReg.uiConfiguration.forEach( function( config ) {
                    switch( config.type ) {
                        case Y.doccirrus.schemas.appreg.uiConfigurationTypes.MAIN:
                            appMenuItems.push( {
                                appName: appReg.appName,
                                title: appReg.title || appReg.appName,
                                url: config.targetUrl,
                                type: appReg.type
                            } );
                            break;
                        case Y.doccirrus.schemas.appreg.uiConfigurationTypes.CONFIGURATION:
                            appAccessManagerItems.push( {
                                appName: appReg.appName,
                                title: appReg.title || appReg.appName,
                                url: config.targetUrl,
                                type: appReg.type
                            } );
                            break;
                    }
                } );
            }
        } );

        if( appMenu ) {
            addItemsToMenu( {
                rootPath: peek( appMenu.href ),
                items: appMenuItems,
                targetMenu: appMenu
            } );
        }
        if( appAccessManager ) {
            addItemsToMenu( {
                rootPath: peek( appAccessManager.href ),
                items: appAccessManagerItems,
                targetMenu: appAccessManager,
                keepVisible: hasSolsConfig
            } );
        }
    }

    function checkMasterTabPage(){
        var pathname,
            elem;
        if( document.referrer ){
            elem = document.createElement( "a" );
            elem.href = document.referrer;
            pathname = elem.pathname;
            if( pathname === '/login'){
                Y.doccirrus.communication.emit( 'masterTab.handleLogin' );
            }
        }
        return pathname;
    }

    // function getAppRegs() {
    //     Promise.resolve( Y.doccirrus.jsonrpc.api.appreg.getPopulated( {
    //         query: {
    //             hasAccess: true
    //         }
    //     } ) )
    //         .then( function( response ) {
    //             handleAppRegs( {
    //                 appRegs: response.data || []
    //             } );
    //         } )
    //         .catch( function( error ) {
    //             handleAppRegs( {
    //                 appRegs: []
    //             } );
    //             Y.log( 'Could not get appRegs. Error: ' + JSON.stringify( error ), 'error', NAME );
    //         } );
    // }

    /**
     * The DocCirrusBinderIndex module.
     *
     * @module DocCirrusBinderIndex
     */

    Y.namespace( 'mojito.binders' )[ NAME ] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         * @param {Object} mojitProxy
         */
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
            Y.doccirrus.schemas.activity.runOnStart();
        },

        /**
         * This is a common entry point for all HTML based pages in
         * the Doc Cirrus application world, regardless of which HTMLFrame
         * you are using, this code will get executed.
         *
         * (See also MOJ-1153 / HTML Frame refactoring -- affects parent mojits)
         *
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */

        bind: function( /*node*/ ) {
            var
                self = this,
                ioOptions = self.mojitProxy.pageData.get( 'ioOptions' ) || {},
                onlyIOInit = self.mojitProxy.pageData.get( 'onlyIOInit' ),
                messagesOnly = ioOptions.messagesOnly;
            Y.doccirrus.time.init();
            Y.log( 'Binding DocCirrusBinderIndex', 'debug', NAME );

            // global cache disable
            $.ajaxSetup( { cache: false } );
            if( (typeof io) !== 'undefined' ) {
                Y.doccirrus.communication.openConnection();

            // This code does not seem to be used anymore --------------------------------------------------------------
                Y.doccirrus.communication.onMessageToMe( {
                    handlerId: 'removeMessage',
                    done: function( response ) {
                        var
                            data = response.data;
                        if( data && CLOSE_MESSAGE_ACTION === data.action ) {
                            Y.doccirrus.DCSystemMessages.removeMessage( data.messageId );
                        }
                    }
                } );
            // ---------------------------------------------------------------------------------------------------------
                Y.doccirrus.communication.on( {
                    event: 'closeMessage',
                    done: function( response ) {
                        var
                            meta = response.meta;

                        if( meta && meta.messageId ) {
                            Y.doccirrus.DCSystemMessages.removeMessage( 'socket-message-' + meta.messageId );
                        }

                    }
                } );

                Y.doccirrus.communication.on( {
                    event: 'sendEventHandlers',
                    done: function() {
                        var socket = Y.doccirrus.communication.getSocket();

                        var callbackStrings = {};

                        Object.getOwnPropertyNames( socket && socket._callbacks ).forEach( function( callback ) {
                            callbackStrings[callback.substr( 1 )] = socket._callbacks[callback].map( function( callback ) {
                                return callback.toString().substring( 0, 400 );
                            } );
                        } );

                        Y.doccirrus.communication.emit( 'eventHandlers', {
                            socketId: socket && socket.id,
                            clientEventHandlers: callbackStrings
                        } );
                    }
                } );

                Y.doccirrus.communication.on( {
                    event: 'emitEventForRoom-Test',
                    done: function( response ) {
                        var socket = Y.doccirrus.communication.getSocket();
                        Y.doccirrus.communication.emit( 'testEventRecieved', {
                            activeSocketId: response && response.data && response.data[0] && response.data[0].activeSocketId || response && response.data && response.data.activeSocketId,
                            socketId: socket && socket.id,
                            method: 'emitEventForRoom'
                        } );
                    }
                } );
                Y.doccirrus.communication.on( {
                    event: 'emitEventForUser-Test',
                    done: function( response ) {
                        var socket = Y.doccirrus.communication.getSocket();
                        Y.doccirrus.communication.emit( 'testEventRecieved', {
                            activeSocketId: response && response.data && response.data[0] && response.data[0].activeSocketId || response && response.data && response.data.activeSocketId,
                            socketId: socket && socket.id,
                            method: 'emitEventForUser'
                        } );
                    }
                } );
                Y.doccirrus.communication.on( {
                    event: 'emitEventForSession-Test',
                    done: function( response ) {
                        var socket = Y.doccirrus.communication.getSocket();
                        Y.doccirrus.communication.emit( 'testEventRecieved', {
                            activeSocketId: response && response.data && response.data[0] && response.data[0].activeSocketId || response && response.data && response.data.activeSocketId,
                            socketId: socket && socket.id,
                            method: 'emitEventForSession'
                        } );
                    }
                } );
                Y.doccirrus.communication.on( {
                    event: 'emitEventForAll-Test',
                    done: function( response ) {
                        var socket = Y.doccirrus.communication.getSocket();
                        Y.doccirrus.communication.emit( 'testEventRecieved', {
                            activeSocketId: response && response.data && response.data[0] && response.data[0].activeSocketId || response && response.data && response.data.activeSocketId,
                            socketId: socket && socket.id,
                            method: 'emitEventForAll'
                        } );
                    }
                } );
                Y.doccirrus.communication.on( {
                    event: 'emitNamespaceEvent-Test',
                    done: function( response ) {
                        var socket = Y.doccirrus.communication.getSocket();
                        Y.doccirrus.communication.emit( 'testEventRecieved', {
                            activeSocketId: response && response.data && response.data[0] && response.data[0].activeSocketId || response && response.data && response.data.activeSocketId,
                            socketId: socket && socket.id,
                            method: 'emitNamespaceEvent'
                        } );
                    }
                } );

                Y.doccirrus.communication.on( {
                    event: 'message',
                    done: function( response ) {
                        if( Y.config.debug ) {
                            Y.log( 'Client got a message through socketIO: ' + JSON.stringify( response ), 'debug', NAME );
                        }
                        $( 'body' ).off( 'click.socketIO' );
                        if( response.meta && Y.doccirrus.schemas.socketioevent.eventTypes.CONFIRM === response.meta.eventType ) {
                            Y.doccirrus.DCSystemMessages.removeMessage( 'socket-message-' + (response.meta && response.meta.messageId) );
                            response.data = response.data.toString().replace( 'class="removeSocketIOEvent"', 'class="removeSocketIOEvent" data-messageId=""' );
                            response.data = response.data.toString().replace( 'data-messageId=""', 'data-messageId="' + (response.meta && response.meta.messageId) + '"' );
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'socket-message-' + (response.meta && response.meta.messageId),
                                content: response.data,
                                level: 'WARNING',
                                onClose: function() {
                                    var message = this,
                                        messageId = message.messageId;
                                    if( messageId ) {
                                        messageId = messageId.replace( 'socket-message-', '' );
                                        Y.log( 'Message will be removed from socketevent collection, id: ' + messageId, 'debug', NAME );
                                        Y.doccirrus.communication.confirmMessage( {
                                            messageId: messageId
                                        } );
                                        Y.doccirrus.communication.sendMessageTo( {
                                            data: {
                                                action: CLOSE_MESSAGE_ACTION,
                                                messageId: message.messageId
                                            }
                                        } );
                                    }

                                }
                            } );
                            $( 'body' ).on( 'click.socketIO', '.dc-SystemMessages .removeSocketIOEvent', function() {
                                var link = $( this );
                                Y.doccirrus.communication.confirmMessage( {
                                    messageId: link.attr( 'data-messageId' )
                                } );
                            } );
                        } else {
                            response.data = response.data.toString().replace( 'data-messageId=""', 'data-messageId="' + (response.meta && response.meta.messageId) + '"' );
                            Y.doccirrus.DCSystemMessages.removeMessage( 'socket-message-' + (response.meta && response.meta.messageId) );
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'socket-message-' + (response.meta && response.meta.messageId),
                                content: response.data,
                                _removeTimeout: response.meta && response.meta.removeTimeout || null,
                                level: response.meta && response.meta.level || 'WARNING',
                                onClose: function() {
                                    var message = this,
                                        messageId = message.messageId;
                                    Y.doccirrus.communication.sendMessageTo( {
                                        data: {
                                            action: CLOSE_MESSAGE_ACTION,
                                            messageId: messageId
                                        }
                                    } );
                                }
                            } );

                        }
                        $( 'body' ).on( 'click.socketIO', '.dc-SystemMessages .showDCTask', function( e ) {
                            var link = $( this ),
                                messageId = link.attr( 'data-messageId' ),
                                taskId = link.attr( 'data-taskId' );
                            e.preventDefault();
                            Y.doccirrus.jsonrpc.api.task.getPopulatedTask( {
                                query: {
                                    _id: taskId
                                }
                            } )
                                .done( function( response ) {
                                    var
                                        data = response.data && response.data[ 0 ];
                                    Y.doccirrus.communication.sendMessageTo( {
                                        data: {
                                            action: CLOSE_MESSAGE_ACTION,
                                            messageId: 'socket-message-' + messageId
                                        }
                                    } );

                                    if( !data ) {
                                        Y.doccirrus.DCWindow.notice( {
                                            type: 'info',
                                            message: TASK_DOES_NOT_EXIST
                                        } );
                                        Y.doccirrus.communication.confirmMessage( {
                                            messageId: messageId
                                        } );
                                    } else {
                                        if( ko ) {
                                            Y.use( 'DCTaskModal', function() {
                                                Y.doccirrus.modals.taskModal.showDialog( data, function() {
                                                    Y.doccirrus.communication.confirmMessage( {
                                                        messageId: messageId
                                                    } );
                                                } );
                                            } );
                                        }
                                    }
                                } )
                                .fail( function( error ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                } );
                        } );
                    }
                } );

                Y.doccirrus.communication.on( {
                    event: 'languageChange',
                    done: function( response ) {
                        if( response && response.data && response.data[0] && response.data[0].language ) {
                            // set moment to use specific lang in all client files on language change
                            moment.locale( response.data[0].language );
                        }
                    }
                } );

                Y.doccirrus.communication.on( {
                    event: 'login.updateError',
                    done: function( response ) {
                        var
                            data = response.data[ 0 ] && response.data[ 0 ],
                            content;

                        if( data && data.error ) {
                            content = Y.Lang.sub( i18n( 'DocCirrus.dcplianframe_JS.LDAP_LOGIN' ), {details: data.error} );
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: 'login.updateError',
                                content: content,
                                level: 'ERROR'
                            } );
                        }
                    }
                } );

                // event triggered after the user has been inactive for a certain time
                // timeLeft in milliseconds
                Y.doccirrus.communication.on( {
                    event: 'timeoutWarn',
                    done: function( response ) {
                        var timeLeft = response.data;
                        if( timeLeft && timeLeft > 0 ) {
                            informUser();
                        } else {
                            Y.doccirrus.utils.logoutRedirect();
                        }
                    }
                } );
                Y.doccirrus.communication.on( {
                    event: 'masterTab.openMasterTab',
                    done: function( response ) {
                        var data = response.data || {},
                            systemNumber = data.systemNumber,
                            title = data.title;
                        Y.doccirrus.DCSystemMessages.removeMessage( 'master-tab-message-' + systemNumber );
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'master-tab-message-' + systemNumber,
                            content: '<div>' + i18n( 'DocCirrus.dcplianframe_JS.OPEN_MASTER_TAB', { data: { title: title } } ) + '</div>' +
                                     '<div class="text-right">' +
                                     '<a role="button" class="btn btn-primary closeAfterClick completeMessageId" data-messageId="master-tab-message-' + systemNumber + '" target="_blank" href="/system?systemNumber=' + systemNumber + '">' +
                                     '<i class="glyphicon glyphicon-ok"></i></a>' +
                                     '<button class="btn btn-default closeAfterClick completeMessageId" data-messageId="master-tab-message-' + systemNumber + '"><i class="glyphicon glyphicon-remove"></i></button></div>',
                            _removeTimeout: 10000,
                            level: 'INFO'
                        } );
                    }
                } );
                if( !Y.doccirrus.auth.isPatientPortal() ) {
                    Y.doccirrus.communication.on( {
                        event: 'system.changedAppReg',
                        done: function( response ) {
                            var
                                data = response.data,
                                appRegs = Y.doccirrus.auth.getAppRegs() || [];
                            appRegs.forEach( function( appReg ) {
                                if( data.appName === appReg.appName ) {
                                    appReg.uiConfiguration = data.uiConfiguration;
                                    appReg.hasAccess = data.hasAccess;
                                }
                            } );

                            handleAppRegs( {
                                appRegs: appRegs
                            } );
                        }
                    } );

                    Y.doccirrus.communication.on( {
                        event: 'system.showAppRegConfigString',
                        done: function( response ) {
                            var
                                configStringText,
                                messageContent,
                                data = response.data ? (response.data.length ? response.data[0] : response.data) : {};

                            if( data.configString ) {
                                configStringText = '# ' + data.appName + ' Sol config file\n#\n'
                                                   + data.configString
                                                       .replace( /ISHOST=.*/, 'ISHOST=' + window.location.origin
                                                   + '\n# if running inside a container in the same network as inSuite, use:'
                                                   + '\n# for macOS'
                                                   + '\n#ISHOST=http://host.docker.internal'
                                                   + '\n# for linux'
                                                   + '\n#ISHOST=http://172.17.0.1' )
                                                       .replace( /ISPORT=.*/, 'ISPORT=80' )
                                                   + '\n# SOLHOST is used when running remote Sol (outside of Datensafe)\n#'
                                                   + '\n#SOLHOST=http://&lt;REMOTE_SOL_ADDRESS&gt';
                                messageContent = '<textarea id="configString" style="width: 100%; border: none;" rows="14">' + configStringText + '</textarea>';

                                Y.doccirrus.DCWindow.notice( {
                                    title: i18n( 'AppTokenMojit.AppAccessManager.title.SOL_CONFIG' ),
                                    message: messageContent,
                                    type: 'info',
                                    window: {
                                        width: 'medium',
                                        buttons: {
                                            footer: [
                                                Y.doccirrus.DCWindow.getButton( 'SELECT_COPY', {
                                                    action: function() {
                                                        var content = document.querySelector( '#configString' );
                                                        content.select();
                                                        content.setSelectionRange( 0, 99999 ); // for mobile phones
                                                        document.execCommand( 'copy' );
                                                    }
                                                } )]
                                        }
                                    }
                                } );
                            }

                        }
                    } );
                }

                if( !messagesOnly ) {
                    Y.doccirrus.communication.on( {
                        event: 'system.refreshOnlineStatus',
                        done: function() {
                            updateOnlineStatus();
                        }
                    } );
                    if( Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.ADMIN ) || Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.SUPPORT ) ) {
                        Y.doccirrus.communication.on( {
                            event: 'cli.reboot',
                            done: function( response ) {
                                Y.doccirrus.DCSystemMessages.removeMessage( 'socket-message-' + (response.meta && response.meta.messageId) );
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'socket-message-' + (response.meta && response.meta.messageId),
                                    content: response.data,
                                    level: 'WARNING'
                                } );
                            }
                        } );
                    }

                    // MOJ-3453: There must be a modal question notifying the user that to change the country setting all users must be logged out
                    Y.doccirrus.communication.on( {
                        event: 'system.ALL_USERS_HAVE_TO_LOGOUT_TO_APPLY_COUNTRY_CHANGES',
                        done: function( response ) {
                            var
                                data = response.data[ 0 ] && response.data[ 0 ];

                            if( data && data.i18n ) {
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'ALL_USERS_HAVE_TO_LOGOUT_TO_APPLY_COUNTRY_CHANGES',
                                    content: i18n( data.i18n ),
                                    level: 'WARNING'
                                } );
                            }
                        }
                    } );

                    //socket.emit('test');
                    Y.doccirrus.communication.on( {
                        event: 'disconnected',
                        done: function() {
                            Y.log( 'socket hang up', 'debug', NAME );
                        }
                    } );

                    Y.doccirrus.communication.on( {
                        event: 'invoicelogAction',
                        done: function( message ) {
                            // MOJ-4424: disable "validate" action system messages for now
                            if( message.data && message.data[ 0 ] && message.data[ 0 ].state && 'finished' === message.data[ 0 ].state &&
                                ( ('validate' !== message.data[ 0 ].action && 'approve' !== message.data[ 0 ].action && 'invoicing' !== message.data[ 0 ].action) ||
                                  ( message.data[ 0 ].errors && message.data[ 0 ].errors.length )
                                )
                            ) {
                                Y.doccirrus.invoicelogutils.showSystemMessage( message );
                            }
                        }
                    } );

                    Y.doccirrus.communication.on( {
                        event: 'rulelogUpdated',
                        done: function( message ) {
                            var data = message && message.data && message.data[ 0 ] && message.data[ 0 ].entries;
                            (Array.isArray( data ) && data || []).forEach( function( data ) {
                                Y.doccirrus.rulelogutils.showSystemMessage( data );
                            } );
                        }
                    } );

                    Y.doccirrus.communication.on( {
                        event: 'insuranceReregionalized',
                        done: function( message ) {
                            var data;
                            if( message.data && message.data[ 0 ] ) {
                                data = message.data[ 0 ];
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'insuranceReregionalized' + data.patientId,
                                    content: 'Die Ersatzkasse des Patienten ' + data.patientName + ' wurde neu "regionalisiert".<br/><a onclick="location.reload(true)" href="/incase#/patient/' + data.patientId + '/section/insurance">Kostenträger ansehen</a>',
                                    level: 'INFO'
                                } );
                            }
                        }
                    } );
                }
                $( 'body' ).on( 'click.general', '.dc-SystemMessages .closeAfterClick', function() {
                    var link = $( this );
                    if( link.hasClass('completeMessageId') ){
                        Y.doccirrus.DCSystemMessages.removeMessage( link.attr( 'data-messageId' ) );
                    } else {
                        Y.doccirrus.DCSystemMessages.removeMessage( 'socket-message-' + link.attr( 'data-messageId' ) );
                    }
                } );
            } // if IO
            if( !Y.doccirrus.auth.isPatientPortal() ) {
                // getAppRegs();
                handleAppRegs( {
                    appRegs: Y.doccirrus.auth.getAppRegs() || []
                } );
                checkMasterTabPage();
            }
            if( !Y.doccirrus.auth.isPatientPortal() && !onlyIOInit ) {
                updateOnlineStatus();
                setupCallHandler();
            }

        }

    };

}, '0.0.1', {
    requires: [
        'dcerrorhandler',
        'doccirrus',
        'JsonRpc',
        'dcutils',
        'dcschemaloader',
        'dcJadeRepository',
        'dcauth',
        'dctime',
        'identity-schema',
        'NavBarHeader',
        'NavBarFooter',
        'DCSystemMessages',
        'DCWindow',
        'dccommunication-client',
        'dcinvoicelogutils',
        'DCSpeedTestModal',
        'dcrulelogutils',
        'appreg-schema',
        'apptoken-schema',
        'dcinfrastructs'
    ]
} );
