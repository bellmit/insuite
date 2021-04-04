/**
 * User: dcdev
 * Date: 5/9/19  11:44 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


/**
 * Api functions created in order to work with MediPort configurations.
 * Currently now, contains code for creating SendControl.xml file which is needed for sending *.xml via communicator.
 */
YUI.add( 'mediport-api', function( Y, NAME ) {

    const { formatPromiseResult, handleResult } = require('dc-core').utils,
        Prom = require("bluebird");
    /**
     * Create and prepare SendControl.xml content.
     * File should contains detailed information about name, size of each xml file.
     * @param {Array} xmlFiles - xml files that will be added to mediport
     * @param {Object} user
     * @param {Boolean} docPrinted
     * @returns {string} - content of SendControl.xml
     */
    async function createSendControlXML( xmlFiles, user) {
        let controlSample = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><DocumentsToSend xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="./data/send/SendControl10.xsd">DOCUMENTS</DocumentsToSend>';

        let [err, result] = await formatPromiseResult(
            Prom.map(xmlFiles, async function ( file ) {
                let err, invoiceentries, tiersMode, senderDocId, docPrinted;
                let filename = file.filename;
                let size = file.dataObj.data.length;
                let invoiceId = filename.slice(filename.indexOf('-') + 1, filename.indexOf('.'));
                [err, invoiceentries] = await formatPromiseResult(Y.doccirrus.mongodb.runDb({
                    user: user,
                    model: 'invoiceentry',
                    action: 'get',
                    query: { _id: invoiceId }
                }));

                if(err || !invoiceentries || !invoiceentries.length) {
                    Y.log( `createSendControlXML(): Error in getting invoiceentry ${invoiceId}`, 'error', 'mediport-api.server' );
                }
                tiersMode = invoiceentries[0].data.isTiersPayant ? 'Tiers_Payant' : 'Tiers_Garant_Manuell';
                senderDocId = invoiceentries[0].data.referenceNo;
                docPrinted = !invoiceentries[0].data.docPrinted;

                return `<Document SenderDocId="${senderDocId}" FileName="${filename}" DocAttr="${tiersMode}" DocPrinted="${docPrinted}" DistType="0" Subject="Betrifftvermerk" DocSize="${size}" PrintLanguage="D" Role="productive"/>`;
            })
        );
        if(err || !result || !result.length) {
            Y.log( `createSendControlXML(): Error in creating documentSamples`, 'error', 'mediport-api.server' );
        }
        return controlSample.replace( 'DOCUMENTS', result.join( '' ) );
    }

    /**
     * Send SendControl.xml to appropriate folder via dc-device server.
     * @param {Object} args
     *  1. xmlFiles - files to send;
     *  2. path - path where SendControl.xml should be added;
     *  3. deviceServer - device server that will be used for transferring file;
     *  4. callback - function
     */
    async function putSendControlToMediportDir( args ) {
        const FILE_NAME = 'SendControl10.xml';
        const { xmlFiles, path, deviceServer, callback, user } = args;
        let err, content;

        [err, content] = await formatPromiseResult(Promise.resolve(createSendControlXML( xmlFiles, user )));

        if(err || !content) {
            Y.log( "putSendControlToMediportDir(): Failed to create SendControl.xml", 'error', 'mediport-api.server' );
        }

        let fullPath = path + FILE_NAME;
            Y.doccirrus.api.device.writeFileDeviceServer( {
                query: {
                    deviceServer,
                    path: fullPath,
                    createFullPath: false,
                    overwrite: true
                },
                data: content,
                callback: err => {
                    if( err ) {
                        return handleResult(err, undefined, callback);
                    }
                    handleResult(null, true, callback);
                }
            } );
    }

    Y.namespace( 'doccirrus.api' ).mediport = {
        name: NAME,
        putSendControlToMediportDir: putSendControlToMediportDir
    };
}, '0.0.1', {
    requires: []
} );
