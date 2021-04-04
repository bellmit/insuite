/**
 * User: pi
 * Date: 25/02/16  17:15
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'DCSocketIOClient', function( Y, NAME ) {
        /**
         * @module DCSocketIOClient
         */

        var
            dcUtil = require( '../../middleware/dc-util.js' ),
            serverCommunications = dcUtil.getServerCommunications(),
            SocketIOClient = serverCommunications.SocketIOClient( Y, NAME );

        Y.namespace( 'doccirrus' ).SocketIOClient = SocketIOClient;

    },
    '0.0.1',
    {
        requires: [
            'dcauth',
            'dc-comctl'
        ]
    }
);


