/**
 * User: do
 * Date: 14.08.19  13:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */




/*global YUI */

/**
 * @module kvconnect ldt
 */
YUI.add( 'kvconnect-service-1click', function( Y, NAME ) {

    const ONE_CLICK_KVC_SERVICE_ID = '1ClickAbrechnung;Lieferung;V2.0';

    function getMessageType( params ) {
        if( params.replacement ) {
            return 'INVOICE';
        }

        if( params.test ) {
            return 'TEST_INVOICE';
        }

        if( params.complete ) {
            return 'INVOICE';
        }

        return 'PARTIAL_INVOICE';
    }

    /**
     * Creates a KVTA envelope.
     *
     * @param {Object}  args
     *
     * @return {String}
     */
    function makeEnvelope( args ) {
        if( args && args.guid && args.quarter && args.year && args.xkmFileName && args.commercialNo ) {
            return `<?xml version="1.0" encoding="UTF-8"?>
<einlieferung
        xsi:schemaLocation="http://www.kv-telematik.de/1-Click/Meldung_Einlieferung/2.0.0 ../Schema/KVTA_Einliefung_Abrechnung_2_0_0.xsd"
        xmlns="http://www.kv-telematik.de/1-Click/Meldung_Einlieferung/2.0.0"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <version V="${args.version}"/>
    <guid V="${args.guid}"/>
    <bsnr V="${args.commercialNo}"/>
    <testdaten V="${!!args.test}"/>
    <lieferungs_zeitpunkt V="${require( 'moment' )().format()}"/>
    <dokumenten_typ V="ABRECHNUNG"/>
    <quartal V="${args.year + '-' + args.quarter}"/>
    <vollstaendig V="${!!args.complete}"/>
    <anhang V="${args.xkmFileName}"/>
</einlieferung>`;
        } else {
            Y.log( `makeEnvelope: missing arguments: args: ${args}`, 'warn', NAME );
            throw Error( 'Missing Arguments' );
        }
    }

    /**
     * Creates constructs email object and calls kvconnect send method for actually sending mail via rest to kvconnect
     * server.
     *
     * @param {Object} args
     * @param {Object} args.query
     * @param {String} args.query.username
     * @param {String} args.query.addressee
     * @param {String} args.query.envelope
     * @param {String} args.query.xkmFileName
     * @param {Buffer} args.query.xkmFileBinary
     * @param {Function} args.callback
     */
    async function send( args ) {
        Y.log( `send 1click delivery for kbvlog ${args.kbvlogId} from ${args.username} to ${args.addressee}`, 'info', NAME );
        return Y.doccirrus.kvconnect.send( {
            user: args.user,
            username: args.username,
            addressee: args.addressee,
            kvcServiceId: ONE_CLICK_KVC_SERVICE_ID,
            messageType: getMessageType( args ),
            kbvlogId: args.kbvlogId,
            subject: `Abrechung: Quartal ${args.year}-${args.quarter}`,
            attachments: [
                {
                    content: makeEnvelope( args ),
                    contentType: 'application/xml; charset=utf-8',
                    filename: 'begleitdatei.xml'
                },
                {
                    content: args.xkmFileBinary,
                    contentType: 'application/octet-stream',
                    filename: args.xkmFileName
                }
            ]
        } );
    }

    /**
     * @class kvconnect-1click
     * @namespace doccirrus
     */
    Y.namespace( 'doccirrus.kvconnect.service' ).oneClick = {send};
}, '0.0.1', {
    requires: [
        'dc_kvconnect'
    ]
} );
