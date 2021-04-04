/**
 * User: jm
 * Date: 2014-07-24  08:04
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */


/**
 * Sends message via Socket.IO.
 */




/*global YUI*/

'use strict';

YUI.add( 'DCSocketIO', function( Y, NAME ) {

        var
            dcUtil = require( '../../middleware/dc-util.js' ),
            serverCommunications = dcUtil.getServerCommunications(),
            SocketIO = serverCommunications.SocketIO( Y, NAME ),
            socketIO = serverCommunications.socketIO( Y, NAME );

        Y.namespace( 'doccirrus' ).SocketIO = SocketIO;
        Y.namespace( 'doccirrus' ).socketIO = socketIO; //ext socketIO is instance already
    },
    '0.0.1', {
        requires: [
            'dcipc',
            'socketioevent-schema',
            'dcauth',
            'dc-comctl',
            'DCSocketIOClient',
            'DCMongoWatcher'
        ]
    }
);