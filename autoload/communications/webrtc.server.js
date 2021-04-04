/**
 * User: pi
 * Date: 06/03/15  10:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/

'use strict';

YUI.add( 'DCWebRTC', function( Y, NAME ) {
        var
            dcUtil = require( '../../middleware/dc-util.js' ),
            serverCommunications = dcUtil.getServerCommunications(),
            myDCWebRTC = serverCommunications.webrtc( Y, NAME );

        Y.namespace( 'doccirrus' ).dcWebRTC = myDCWebRTC;
    },
    '0.0.1', {requires: [
        'dcipc',
        'socketioevent-schema',
        'dcauth'
    ]}
);