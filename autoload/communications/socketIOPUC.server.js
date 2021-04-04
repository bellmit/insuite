/**
 * User: pi
 * Date: 07/03/16  10:15
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

'use strict';

YUI.add( 'DCSocketIOPUC', function( Y, NAME ) {

        var
            dcUtil = require( '../../middleware/dc-util.js' ),
            serverCommunications = dcUtil.getServerCommunications(),
            mySocketIOPUC = serverCommunications.socketIOPUC( Y, NAME );

        Y.namespace( 'doccirrus' ).socketIOPUC = mySocketIOPUC;

    },
    '0.0.1', {
        requires: [
            'DCSocketIO',
            'dcauth'
        ]
    }
);
