/**
 * User: mahmoud
 * Date: 20/03/15  16:32
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';
// eslint-disable-next-line no-redeclare
/*global YUI, JSON */

/**
 * transfer of patient data
 */
YUI.add( 'patienttransfer-api', function( Y, NAME ) {
        const
            YDC = Y.doccirrus,
            ObjectID = require( 'mongodb' ).ObjectID,
            util = require('util'),
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require('dc-core').utils;

        /**
         * on source PRC
         * prepare and send data to PUC to be delivered to target PRCs
         * @param args
         */
        async function dispatchPatientData( args ) {
            const
                messageToPRC = util.promisify( Y.doccirrus.communication.messageToPRC ),
                patientsPopulated = util.promisify( Y.doccirrus.api.patient.patientsPopulated ),
                getKeyPair = util.promisify( Y.doccirrus.auth.getKeyPair ),
                updatePartnerStatus = promisifyArgsCallback( Y.doccirrus.api.partner.updatePartnerStatus );

            Y.log('Entering Y.doccirrus.api.patientTransfer.dispatchPatientData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientTransfer.dispatchPatientData');
            }
            Y.log( 'entered dispatchPatientData, params:' + require('util').inspect( args.params ), 'debug', NAME );

            const { user, data: {patientId, activityIds, partners}, callback } = args;
            let deliveries = [];

            if( !activityIds || !activityIds.length || !patientId || !partners || !partners.length ) {
                return callback( Y.doccirrus.errors.rest( 400, 'insufficient parameters' ) );
            }

            if( !partners.every( function( p ) {
                return p.publicKey && 'string' === typeof p.publicKey;
            } ) ) {
                return callback( 'no public key' );
            }

            // if there ia any partner not confirmed then halt with error
            if( partners.some( function( p ) {
                return 'CONFIRMED' !== p.status;
            } ) ) {
                callback( Y.doccirrus.errors.rest( 7302, 'invalid partners' ) );
                return;
            }
            let err, updatedPartners;
            [ err, updatedPartners ] = await formatPromiseResult(
                updatePartnerStatus( { user, data: { partners } } )
            );
            if( err ) {
                return callback( err );
            }
            if( updatedPartners && updatedPartners[0] ) { // then at least one partner had changed their keys and we have just updated their status
                return callback( Y.doccirrus.errors.rest( 7302, 'invalid partners' ) );
            }

            let allResults;
            [ err, allResults ] = await formatPromiseResult( Promise.all( [
                patientsPopulated( user, {_id: patientId}, {show: 'activities', activityQuery: {_id: {$in: activityIds}}} ),
                getKeyPair( user ),
                Y.doccirrus.api.activityTransfer.createPayload( {
                    user,
                    activityIds,
                    anonymizePatientImages: false,
                    teleconsil: true
                } )
            ] ) );
            if( err ){
                Y.log( `collectTransferData: error parallel getting data: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }

            let
                patientData = allResults[0] && allResults[0][0],
                mySecret = allResults[1] && allResults[1].privateKey,
                activitiesData = allResults[2];

            if( !mySecret ) {
                Y.log( `collectTransferData: key pair not obtained`, 'error', NAME );
                return callback( 'no secret' );
            }

            if( activitiesData ) {
                if( activitiesData.documents ) {
                    patientData._documents = activitiesData.documents;
                }
                if( activitiesData.media ) {
                    patientData._media = activitiesData.media;
                }
            }

            let patientDataAfterSend;
            [ err, patientDataAfterSend ] = await formatPromiseResult(
                sendToPUC( partners, patientData, mySecret, deliveries )
            );

            for( let fileMeta of ( activitiesData.fileMetas || [] ) ){
                let sendData = {};
                sendData._fileMetas = [fileMeta];
                let [ localError ] = await formatPromiseResult(
                    sendToPUC( partners, sendData, mySecret, [] )
                );
                if( localError ) {
                    Y.log( `dispatchPatientData: error on sending fileMeta: ${err.stack || err}`, 'debug', NAME );
                }
            }

            for( let fileChunk of ( activitiesData.fileChunks || [] ) ){
                let sendData = {};
                sendData._fileChunks = [fileChunk];

                let [ localError ] = await formatPromiseResult(
                    sendToPUC( partners, sendData, mySecret, [] )
                );
                if( localError ) {
                    Y.log( `dispatchPatientData: error on sending fileChunk: ${err.stack || err}`, 'debug', NAME );
                }
            }

            // create an audit entry and call back
            if( err ) {
                Y.log( `dispatchPatientData: error on transfering: ${err.stack || err}`, 'debug', NAME );
                return callback( err );
            }
            Y.log( `dispatchPatientData: transfer message was sent: ${JSON.stringify( deliveries )}`, 'debug', NAME );
            YDC.api.audit.auditPatientTransfer( user, patientDataAfterSend, partners, ( err ) => { callback( err, deliveries ); } );


            async function sendToPUC( partners, sendData, mySecret, deliveries ) {
                if(sendData.activities && sendData.activities.length ){
                    sendData.activities = sendData.activities.filter( function( item ) {
                        return 'APPROVED' === item.status && 'TELECONSULT' === item.actType;
                    } );
                    sendData.activities = sendData.activities.map( function( item ) {
                        item = item.toObject ? item.toObject() : item;
                        item.employeeId = null; // TODO from presence list
                        item.locationId = null; // TODO
                        return item;
                    } );
                }

                sendData.patientNumber = sendData.patientNo = null;

                let
                    transferData = JSON.stringify( { patient: sendData } );
                Y.log( `sendToPUC: exporting patient data to partners: ${JSON.stringify( partners )}`, 'info', NAME );

                // for each partner, send a transfer request and retrieve host address from the response

                const
                    targetURL = '/1/patientTransfer/:importPatientData';
                for( let partner of partners ){
                    let
                        key = Y.doccirrus.authpub.getSharedSecret( mySecret, partner.publicKey ),
                        encryptedStr = Y.doccirrus.authpub.encPRCMsg( key, transferData );

                    // send the transfer as a message via PUC to the target PRC
                    let [err, data] = await formatPromiseResult(
                        messageToPRC( user, {data: encryptedStr, targetUrl: targetURL, targetId: partner.dcId} )
                    );
                    partner.host = data && data.targetHost;
                    deliveries.push( data );
                    if( err ){
                        Y.log( `sendToPUC: error in sending transfer data to PUC: ${err.stack || err}`, 'error', NAME );
                        throw( err );
                    }
                }
                return sendData;
            }

        }

        /**
         * on target PRC, receive and handle transfer data
         */
        async function importPatientData( args ) {
            Y.log('Entering Y.doccirrus.api.patientTransfer.importPatientData', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientTransfer.importPatientData');
            }
            const
                { user, data, callback } = args,
                encryptedStr = Y.doccirrus.communication.getMessageContent( data ),
                senderPracId = data.practiceId,
                getKeyPair = util.promisify( Y.doccirrus.auth.getKeyPair ),
                addPatient = util.promisify( Y.doccirrus.api.patient.addPatient ),
                getLastPhysicianId = util.promisify( Y.doccirrus.api.employee.getLastPhysicianId ),
                saveFileMeta = util.promisify( Y.doccirrus.media.gridfs.saveFileMeta ),
                saveChunk= util.promisify( Y.doccirrus.media.gridfs.saveChunk );

            Y.log( `importPatientData from: ${senderPracId}`, 'debug', NAME );

            let [err, result] = await formatPromiseResult(
                getKeyPair( user )
            );

            if( err ){
                Y.log( `importPatientData: error on getting keyPair: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            if( !result || !result.privateKey ){
                Y.log( `importPatientData: keyPair not obtained`, 'error', NAME );
                return callback( new Error( 'no secret' ) );
            }
            let mySecret = result.privateKey;

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'partner',
                    query: {dcId: senderPracId}
                } )
            );
            if( err ){
                Y.log( `importPatientData: error on getting partner key: ${err.stack || err}`, 'error', NAME );
                return callback( err );
            }
            if( !result || !result[0] || !result[0].publicKey ){
                Y.log( `importPatientData: partner/publicKey not obtained`, 'error', NAME );
                return callback( new Error( 'no partner/publicKey found for the sender of transfer message' ) );
            }

            let key = Y.doccirrus.authpub.getSharedSecret( mySecret, result[0].publicKey ),
                pData = Y.doccirrus.authpub.decPRCMsg( key, encryptedStr );

            Y.log( `decrypted transfer data: ${pData}`, 'debug', NAME );
            if( 'string' === typeof pData ) {
                try {
                    pData = JSON.parse( pData );
                } catch (err){
                    Y.log( `importPatientData: error on parsing decrypted data ${err.stack || err}`, 'error', NAME );
                    return callback( new Error( 'error parsing payload' ) );
                }
            }

            let
                patientData = pData && pData.patient,
                receivedData = patientData;

            if( !patientData ) {
                Y.log( `importPatientData: parsed data is wrong`, 'error', NAME );
                return callback( new Error( 'error in data' ) );
            }

            if( patientData._id ){
                let patients;
                [err, patients] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'patient',
                        query: {_id: patientData._id}
                    } )
                );
                if( err ) {
                    Y.log( `importPatientData: error on getting patient _id:${patientData._id} : ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                if( !patients || !patients[0] ){
                    patientData.isNew = true;
                    patientData = Y.doccirrus.filters.cleanDbObject( patientData );

                    let patientIds;
                    [ err, patientIds] = await formatPromiseResult(
                        addPatient( user, patientData )
                    );
                    if( err ) {
                        Y.log( `importPatientData: error on adding patient: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                    patientData._id = patientIds && patientIds[0];
                } else {
                    Y.log( 'patient is already imported', 'debug', NAME );
                }

                let actIds = [];
                if( patientData.activities && patientData.activities.length ) {
                    actIds = patientData.activities.map( el => el._id );

                    let activitiesExists;
                    [err, activitiesExists] =await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'activity',
                            query: {_id: {$in: actIds}}
                        } )
                    );
                    if( err ) {
                        Y.log( `importPatientData: error on getting activities: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                    actIds = (activitiesExists || []).map( el => el._id && el._id.toString() );
                    // exclude those that already exist
                    patientData.activities = patientData.activities.filter( el => actIds.indexOf( el._id && el._id.toString() ) < 0 );

                    let activities = patientData.activities;

                    if( activities.length){
                        // set employeeId and locationId
                        let employeeId,
                            mainLocationId = Y.doccirrus.schemas.location.getMainLocationId();
                        [err, employeeId] = await formatPromiseResult( getLastPhysicianId( user ) );
                        if( err ) {
                            Y.log( `importPatientData: error on getting last patient: ${err.stack || err}`, 'error', NAME );
                            return callback( err );
                        }

                        for( let activityObj of activities ){

                            activityObj.locationId = mainLocationId;

                            if( activityObj.participants ) {
                                [err, activityObj] = await formatPromiseResult( assignEmployee( activityObj ) ); // assign to one of the participants
                                if( err ) {
                                    Y.log( `importPatientData: error on processing participants: ${err.stack || err}`, 'error', NAME );
                                    return callback( err );
                                }
                            } else {
                                activityObj.employeeId = employeeId; // the default employee
                            }

                            [err, activityObj] = await formatPromiseResult( setEditor (activityObj) );
                            if( err ) {
                                Y.log( `importPatientData: error on setting editor: ${err.stack || err}`, 'error', NAME );
                                return callback( err );
                            }

                        }

                        if( receivedData._media && receivedData._media.length ) {
                            for( let media of receivedData._media ) {
                                let data = Y.doccirrus.filters.cleanDbObject( media );
                                [err] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user,
                                        action: 'upsert',
                                        model: 'media',
                                        fields: Object.keys( data ),
                                        data
                                    } )
                                );
                                if( err ) {
                                    Y.log( `importPatientData: error on upserting media: ${err.stack || err}`, 'error', NAME );
                                    return callback( err );
                                }
                            }
                            Y.log( 'importPatientData: Done upserting medias', 'debug', NAME );
                        }

                        if( receivedData._documents && receivedData._documents.length){
                            for( let document of receivedData._documents){
                                let data = Y.doccirrus.filters.cleanDbObject( document );
                                [err] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user,
                                        action: 'upsert',
                                        model: 'document',
                                        fields: Object.keys( data ),
                                        data
                                    } )
                                );
                                if( err ) {
                                    Y.log( `importPatientData: error on upserting document: ${err.stack || err}`, 'error', NAME );
                                    return callback( err );
                                }
                            }
                            Y.log( 'importPatientData: Done upserting document', 'debug', NAME );
                        }

                        Y.log( 'posting imported activities: ' + activities.length, 'debug', NAME );
                        for( let activity of activities ){
                            delete activity.caseFolderId;
                            [ err ] = await formatPromiseResult(
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    action: 'post',
                                    model: 'activity',
                                    data: Y.doccirrus.filters.cleanDbObject( activity ),
                                    context: { keepOriginalContent: true }
                                } )
                            );
                            if( err ) {
                                Y.log( `importPatientData: error on posting activity: ${err.stack || err}`, 'error', NAME );
                                return callback( err );
                            }
                        }
                    }
                }
            }

            if( receivedData._fileMetas && receivedData._fileMetas.length ){
                for( let _fileMeta of receivedData._fileMetas){
                    [err] = await formatPromiseResult(
                        saveFileMeta( user, _fileMeta, false, true )
                    );
                    if( err ) {
                        Y.log( `importPatientData: error on saving file meta: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                }
                Y.log( 'importPatientData: Done saving filemetas', 'debug', NAME );
            }

            if( receivedData._fileChunks && receivedData._fileChunks.length){
                for( let _fileChunk of receivedData._fileChunks){
                    const chunkCopy = Object.assign( _fileChunk, {files_id: new ObjectID( _fileChunk.files_id )} );
                    [err] = await formatPromiseResult(
                        saveChunk( user, chunkCopy, false, true )
                    );
                    if( err ) {
                        Y.log( `importPatientData: error on saving file chunks: ${err.stack || err}`, 'error', NAME );
                        return callback( err );
                    }
                }
                Y.log( 'importPatientData: Done saving filechunks', 'debug', NAME );
            }

            return callback();


            async function assignEmployee( activity ) {
                if( !activity.participants || !activity.participants.length) {
                    return activity;
                }

                // for the case of tele-consult, assign the first participant who is an employee on this PRC
                let idList = activity.participants.map( el => el.identityId );

                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'identity',
                        query: {_id: {$in: idList}}
                    } )
                );
                if( err ) {
                    Y.log( `assignEmployee: error in getting identities: ${err.stack || err}`, 'error', NAME );
                    throw( err );
                }
                if( !result || !result.length){
                    Y.log( 'non of participants exists on this PRC ', 'debug', NAME );
                    return activity;
                }
                activity.employeeId = result[0].specifiedBy;
                return activity;
            }

            async function setEditor( activity ) {
                // for the case of tele-consult, assign the first participant who is an employee on this PRC
                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'employee',
                        query: {_id: activity.employeeId}
                    } )
                );
                if( err ) {
                    Y.log( `setEditor: error in getting employees: ${err.stack || err}`, 'error', NAME );
                    throw( err );
                }
                let employee = result && result[0];
                if( employee ) {
                    activity.editor = [
                        {
                            name: employee.firstname + ' ' + employee.lastname,
                            employeeNo: employee.employeeNo
                        }
                    ];
                } else {
                    activity.editor = [];

                }
                return activity;
            }

        }

        /**
         * transfer the activity to all participants who are registered as partners
         * @param args
         */
        function transferTeleConsult( args ) {
            Y.log('Entering Y.doccirrus.api.patientTransfer.transferTeleConsult', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientTransfer.transferTeleConsult');
            }
            var
                user = args.user,
                callback = args.callback,
                params = args.data,
                async = require( 'async' ),
                custNoList = [];

            if( !params.activityId || !params.patientId ) {
                callback( YDC.errors.rest( 409, 'missing params' ) );
                return;
            }

            function transferCb( err ) {
                if( err ) {
                    Y.log( 'error in transfer Tele-Consult: ' + JSON.stringify( err.message || err ), 'error', NAME );
                    return callback( err );
                }
                callback();

            }

            async.parallel( {
                // if there is no non-guest external participant then transfer is not needed
                practice: function( cb ) {
                    Y.doccirrus.api.practice.getMyPractice( user, cb );
                },
                activity: function( cb ) {
                    YDC.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        query: { _id: params.activityId },
                        callback: cb
                    } );
                },
                partners: function( cb ) {
                    YDC.mongodb.runDb( {
                        user: user,
                        model: 'partner',
                        query: {},
                        callback: cb
                    } );
                }
            }, function( err, myData ) {
                if( !err && myData.activity && myData.activity.length ) {
                    Y.log('Remove this log in 3.7\nActivities: ' + JSON.stringify(myData.activity.length),'info',NAME);
                    let activity = myData.activity[0];
                    if( !Array.isArray( activity.participants ) ) {
                        return callback( YDC.errors.rest( 409, 'missing partner reference' ) );
                    }
                    activity.participants.forEach( function( item ) {
                        if( item.dcCustomerNo ) {
                            custNoList.push( item.dcCustomerNo );
                        }
                    } );

                    Y.log('Remove this log in 3.7\ncustNoList: ' + JSON.stringify(custNoList),'info',NAME);
                    if( !custNoList.length ) {
                        return callback( YDC.errors.rest( 409, 'missing partner reference' ) );
                    }
                }

                if( !err && myData.practice && myData.practice.dcCustomerNo ) {

                    custNoList = custNoList.filter( function( dcCustomerNo ) {
                        return dcCustomerNo !== myData.practice.dcCustomerNo;
                    } );
                    Y.log('Remove this log in 3.7\ncustNoList filtered: ' + JSON.stringify(custNoList),'info',NAME);
                }

                if( err || !myData.partners || !myData.partners.length ) {
                    Y.log('Remove this log in 3.7\nno Partner ','info',NAME);
                    return transferCb( err || YDC.errors.rest( 409, 'no partner' ) );
                } else {
                    myData.partners = myData.partners.filter( function( partner ) {
                        return custNoList.indexOf(partner.dcId) > -1;
                    } );
                }

                Y.log('Remove this log in 3.7\ndispatching patient Data ' + JSON.stringify({
                        patientId: params.patientId,
                        activityIds: [params.activityId],
                        partners: myData.partners
                    }),'info',NAME);

                dispatchPatientData( {
                    user: user,
                    data: {
                        patientId: params.patientId,
                        activityIds: [params.activityId],
                        partners: myData.partners
                    },
                    callback: transferCb
                } );

            } );
        }

        function getSentTransfer( args ) {
            Y.log('Entering Y.doccirrus.api.patientTransfer.getSentTransfer', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientTransfer.getSentTransfer');
            }
            let
                { user, query = {}, options, callback } = args;
            if( !query.status ) {
                query.status = { $in: [ Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENT, Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENDING, Y.doccirrus.schemas.patienttransfer.patientTransferTypes.CANCELED ] };
            }
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patienttransfer',
                action: 'get',
                query,
                options
            }, callback );
        }

        /**
         * Get KIM emails only for user that are authorised for this KIM account.
         * @param {Object} args: default parameter.
         * @returns {Promise<Object|undefined>}
         */
        async function getEmailsOnlyForAuthorisedUsers(args) {
            Y.log('Entering Y.doccirrus.api.patientTransfer.getEmailsOnlyForAuthorisedUsers', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.patientTransfer.getEmailsOnlyForAuthorisedUsers');
            }

            let
                {user, options, callback} = args,
                kimAccounts,
                result,
                err;

            [err, kimAccounts] = await formatPromiseResult( Y.doccirrus.mongodb.runDb({
                user: user,
                model: 'kimaccount',
                action: 'get',
                query: {
                    authorisedUsers: {
                        $in: [user.specifiedBy]
                    }
                }
            }));

            if( err ) {
                Y.log( `#getEmailsOnlyForAuthorisedUsers() Unable to get KIM accounts from database. : ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, kimAccounts, callback );
            }

            kimAccounts = kimAccounts.map(function(account){
                return account._id.toString();
            });

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb({
                user: user,
                model: 'patienttransfer',
                action: 'get',
                query: {
                    $or: [
                        {
                            kimAccount: {$exists:false},
                            status:
                                {
                                    $nin: [
                                        Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENT,
                                        Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENDING,
                                        Y.doccirrus.schemas.patienttransfer.patientTransferTypes.CANCELED
                                    ]
                                }
                        },
                        {
                            kimAccount:
                                {
                                    $in: kimAccounts
                                }
                        }
                    ]
                },
                options: options
            }));

            if( err ) {
                Y.log( `#getEmailsOnlyForAuthorisedUsers() Unable to get patienttransfers from database. : ${err && err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            return handleResult( err, result, callback );
        }

        Y.namespace( 'doccirrus.api' ).patientTransfer = {
            dispatchPatientData,
            importPatientData,
            transferTeleConsult,
            getSentTransfer,
            getEmailsOnlyForAuthorisedUsers
        };
    },
    '0.0.1', {requires: []}
);


