/**
 * User: pi
 * Date: 11/10/2017  10:20
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

function mockCommunication( Y ) {
    const
        mochaUtils = require( '../server/mochaUtils' )( Y ),
        EventEmitter = require( 'events' ).EventEmitter,
        original = Y.doccirrus.communication;
    Y.doccirrus.communication = {
        mocked: true,
        event: new EventEmitter(),
        emitWebHookEvent: original.emitWebHookEvent,
        setPUCListener: function() {
        },
        getOnlineUsersPRC: function() {
            //TODO: added this because sometimes this method is called
        },
        emitNamespaceEvent( params ) {
            this.event.emit( 'onEmitNamespaceEvent', params );
            if( params.callback ) {
                params.callback();
            }
        },
        getPRCId( callback = () => {
        } ) {
            this.event.emit( 'onGetPRCId' );
            setImmediate( callback, null, 'mochaTest!' );
        },
        emitPUC( params ) {
            this.event.emit( 'onEmitPUC', params );
            if( params.callback ) {
                params.callback();
            }
        },
        callPUCAction( params, callback ) {
            this.event.emit( 'onCallPUCAction', params );

            if( callback ) {
                callback();
            }
        },
        isPucOnline( callback ) {
            callback( true );
        },
        onPUCConnection: function() {
        },
        onPUCDisconnected: function() {
        },
        initWebSocket: function() {
        },
        setListenerForNamespace: function() {
        },
        setListenerForNamespaceOnce: function() {
        },
        disconnectUserSockets: function() {
        },
        emitEventForUser( params ) {
            this.event.emit( 'onEmitEventForUser', params );
        },
        emitEventForSession( params ) {
            this.event.emit( 'onEmitEventForSession', params );
        },
        emitEventForAll( params ) {
            this.event.emit( 'onEmitEventForAll', params );
        },
        callExternalApiBySystemType( params ) {
            this.event.emit( 'onCallExternalApiBySystemType', params );
        },
        sendMessagesForEvents() {
            this.event.emit( 'onSendMessagesForEvents' );
        },
        /**
         * !!! LIMITED to 2 practices!
         * @param params
         */
        callExternalApiByCustomerNo( params ) {
            const
                {callback} = params;
            Y.doccirrus.socketIOController.handleRequest( {
                sourceDcCustomerNo: params.dcCustomerNo === mochaUtils.getPracticeNo() ? mochaUtils.getSecondPracticeNo() : mochaUtils.getPracticeNo(),
                user: params.user,
                api: params.api,
                options: params.options,
                data: JSON.parse( JSON.stringify( params.data ) ),
                query: params.query
            }, ( err, response ) => {
                if( err ) {
                    return callback( {
                        code: 99999,
                        message: 'mocked communication could not get result from "handleRequest".'
                    } );
                }
                Y.doccirrus.socketIOController.handleResponse( response, params.callback );
            } );

        }
    };
    return original;
}

module.exports = mockCommunication;
