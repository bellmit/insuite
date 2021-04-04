/**
 * User: do
 * Date: 14/03/18  18:13
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */




/*global YUI */

/**
 * @module kvconnect ldt
 */
YUI.add( 'kvconnect-service-ldt', function( Y, NAME ) {

    const
        TEST_ADDRESSEE = 'LDT-Befund.audit@kv-safenet.de',

        FINDING_TRIGGER_KVC_SERVICE_ID = 'LDT-Befund;Trigger;V1.0',
        FINDING_TRIGGER_SUBJECT = 'LDT-Laborbefund-Befundabruf',

        FINDING_MDN_KVC_SERVICE_ID = 'LDT-Befund;Eingangsbestaetigung;V1.0',
        FINDING_MDN_SUBJECT = 'LDT-Laborbefund-Eingangsbestaetigung';

    function triggerFindings( args ) {

        Y.log( `triggerFinding`, 'debug', NAME );

        return Y.doccirrus.kvconnect.send( {
            user: args.user,
            username: args.username,
            addressee: args.addressree || TEST_ADDRESSEE,
            kvcServiceId: FINDING_TRIGGER_KVC_SERVICE_ID,
            subject: FINDING_TRIGGER_SUBJECT,
            messageType: 'LDT_FINDING_TRIGGER'
        } );
    }

    function sendFindingMDN( args ) {
        Y.log( `sendFindingMDN`, 'debug', NAME );
        return Y.doccirrus.kvconnect.send( {
            user: args.user,
            username: args.username,
            addressee: args.to || TEST_ADDRESSEE,
            inReplyTo: args.messageId,
            kvcServiceId: FINDING_MDN_KVC_SERVICE_ID,
            subject: FINDING_MDN_SUBJECT,
            messageType: 'MDN'
        } );

    }

    /**
     * @class kvconnect
     * @namespace doccirrus
     */
    Y.namespace( 'doccirrus.kvconnect.service' ).ldt = {
        triggerFindings,
        sendFindingMDN
    };
}, '0.0.1', {
    requires: [
        'dc_kvconnect'
    ]
} );
