/**
 * User: jm
 * Date: 2014-07-24  08:04
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */


/**
 * Sends SMS.
 */




/*global YUI*/

'use strict';

YUI.add( 'dcsms', function( Y, NAME ) {

        var
            dcUtil = require( '../../middleware/dc-util.js' ),
            serverCommunications = dcUtil.getServerCommunications(),
            mySMS = serverCommunications.sms( Y, NAME );

        Y.namespace( 'doccirrus' ).sms = mySMS;
    },
    '0.0.1', {requires: []}
);