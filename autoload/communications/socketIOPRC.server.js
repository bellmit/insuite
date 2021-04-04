/**
 * User: pi
 * Date: 07/03/16  10:15
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

'use strict';

YUI.add( 'DCSocketIOPRC', function( Y, NAME ) {

        var
            dcUtil = require( '../../middleware/dc-util.js' ),
            serverCommunications = dcUtil.getServerCommunications(),
            mySocketIOPRC = serverCommunications.socketIOPRC( Y, NAME );

        Y.namespace( 'doccirrus' ).socketIOPRC = mySocketIOPRC;

    },
    '0.0.1', {
        requires: [
            'DCMongoWatcher',
            'DCSocketIO',
            'dcerrortable'
        ]
    }
);
