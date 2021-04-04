/**
 * User: ad
 * Date: 22.03.13  03:04
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * This is a library of communication methods that are available throughout mojito without
 * having to dynamically boot the action context into including them.
 *
 * Uses the YUI namespace.
 */




/*global YUI*/

'use strict';

YUI.add( 'dccommunication', function( Y, NAME ) {

        var
            dcUtil = require( '../../middleware/dc-util.js' ),
            serverCommunications = dcUtil.getServerCommunications(),
            myCom = serverCommunications.communication( Y, NAME );

        Y.namespace( 'doccirrus' ).communication = myCom;
    },
    '0.0.1', { requires: [ 'dckronnd', 'dcauth', 'DCSocketIOPRC', 'DCSocketIOPUC', 'DCSocketIO', 'socketioevent-api' ] }
);
