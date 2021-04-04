/**
 * User: pi
 * Date: 10/03/16  15:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

'use strict';

YUI.add( 'SocketIOController', function( Y, NAME ) {

    var
        dcUtil = require( '../../middleware/dc-util.js' ),
        serverCommunications = dcUtil.getServerCommunications(),
        socketIOController = serverCommunications.socketIOController( Y, NAME );

    Y.namespace( 'doccirrus' ).socketIOController = socketIOController;
}, '0.0.1', {
    requires: [ 'dcutils', 'RestHandlerClass', 'dccommonerrors' ]
} );
