/*global YUI */

YUI.add( 'patienttransfer-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        const {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils;

        function getUserIdentity( user ) {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'get',
                query: {
                    _id: user.identityId
                }
            } );
        }

        function getEmployeeFromIdentity( user, identity ) {
            return Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'get',
                query: {
                    _id: identity.specifiedBy
                }
            } );
        }

        function setLastAccessInfo( user, transfer, callback ) {

            transfer.timestamp = new Date();

            if( 'su' !== user.id ) {
                getUserIdentity( user )
                    .then( ( result ) => getEmployeeFromIdentity( user, result[0] ) )
                    .then( ( currentUser ) => {

                        let employee = currentUser[0];

                        transfer.user = {
                            name: Y.doccirrus.schemas.person.personDisplay( employee ),
                            employeeNo: user.identityId
                        };

                        callback( null, transfer );
                    } )
                    .catch( ( err ) => callback( err, transfer ) );
            } else {
                return callback( null, transfer );
            }
        }
        async function informAllKimAccountSubscribers(message, data,  kimID, user) {

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'kimaccount',
                user: user,
                query: {
                    _id: kimID
                },
                options: {}
            } ) );

            if( err ) {
                Y.log( `patienttransfer-process: informAllKimAccountSubscribers: could not get kimaccount for kimID: ${kimID} Error: ${err.stack || err}`, 'warn', NAME );
                return;
            }
            if( !result || !result[0] || !result[0].authorisedUsers || !result[0].authorisedUsers.length ){
                Y.log( `patienttransfer-process: informAllKimAccountSubscribers: result empty for kimID: ${kimID}`, 'warn', NAME );
                return;
            }

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                query: {
                    specifiedBy: {
                        $in: result[0].authorisedUsers
                    }
                },
                options: {
                    lean: true
                } } ) );

            if( err ) {
                Y.log( `patienttransfer-process: informAllKimAccountSubscribers: Error in getting identities for employee id's ${result[0].authorisedUsers}.  Error: ${err.stack || err}`, 'warn', NAME );
                return 0;
            }
            if (!result || !result.length){
                Y.log( `patienttransfer-process: informAllKimAccountSubscribers: Could not find matching identities. result: ${result}.`, 'warn', NAME );
                return 0;
            }

            result.forEach(function (kimAccountUser) {
            Y.doccirrus.communication.emitEventForUser( {
                    targetId: kimAccountUser._id,
                    event: 'message',
                    msg: {
                        data: Y.doccirrus.i18n( message,  {
                            data: {
                                firstname: data.firstname,
                                lastname:  data.lastname
                            }
                        } )
                    }

                } );
            });

        }

        async function parsePatientDataKIM( user, transfer, callback ) {
            if( transfer.emailType !== 'KIM' || transfer.status !== 'NEW' ) {
                Y.log( `parsePatientDataKIM: skip ...`, 'info', NAME );
                return callback( null, transfer );
            }
            let err, patientData;

            switch( transfer.subject ) {
                case 'Arztbrief':
                    [err, patientData] = await formatPromiseResult( Y.doccirrus.api.edocletter.getPatientFromDocLetterTransfer( {
                        user,
                        transfer
                    } ) );

                    if( err ) {
                        Y.log( `parsePatientDataKIM: could not get patient from docletter: ${err.stack || err}`, 'warn', NAME );
                    }
                    break;
            }

            transfer.parsedKIMPatient = [patientData].filter( Boolean );
            callback( null, transfer );
        }

        async function hasPatientDiff( {user, patient, patientFromXml} ) {
            const getPatientDiff = promisifyArgsCallback( Y.doccirrus.api.patient.getPatientDiff );
            const patientId = patient._id.toString();
            let [err, result] = await formatPromiseResult( getPatientDiff( {
                user,
                data: {
                    patientId,
                    patientData: patientFromXml
                }
            } ) );
            if( err ) {
                Y.log( `hasPatientDiff: could not compare patient ${patientId} with data ${JSON.stringify( patientFromXml )}: ${err.stack || err}`, 'warn', NAME );
                return false;
            }

            return result && result.nDiffs > 0;
        }

        async function assignKIM( user, transfer, callback ) {
            if( transfer.emailType !== 'KIM' || !transfer.parsedKIMPatient || !transfer.parsedKIMPatient[0] || transfer.patientId ) {
                Y.log( `assignKIM: skip ...`, 'info', NAME );
                return callback( null, transfer );
            }

            const patientData = transfer.parsedKIMPatient[0] || {};
            let [err, result] = await formatPromiseResult( Y.doccirrus.api.crlog.matchPatient( user, patientData ) );

            if( err ) {
                Y.log( `assignKIM: could not match parsed patient ${JSON.stringify( patientData )}: ${err.stack || err}`, 'warn', NAME );
            }

            if( result && result.length ) {

                informAllKimAccountSubscribers('PatientTransferMojit.message.new_edocletter_assiged_to' , result[0], transfer.kimAccount, user);

                let hasDiff;
                [err, hasDiff] = await formatPromiseResult( hasPatientDiff( {
                    user,
                    patient: result[0],
                    patientFromXml: patientData
                } ) );

                if( err ) {
                    Y.log( `assignKIM: could not get patient diff for parsed patient ${JSON.stringify( patientData )}: ${err.stack || err}`, 'warn', NAME );
                } else {
                    Y.log( `assignKIM: diff for patient ${result[0]._id} detected`, 'info', NAME );
                }

                if( hasDiff ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'message',
                        msg: {
                            data: Y.doccirrus.i18n( 'PatientTransferMojit.message.patient_diff_detected', {
                                data: {
                                    firstname: result[0].firstname || patientData.firstname,
                                    lastname: result[0].lastname || patientData.lastname
                                }
                            } )
                        },
                        meta: {
                            level: 'INFO'
                        }
                    } );
                }

                Y.doccirrus.api.activity.createKIMActivity( {
                    user,
                    data: {
                        patient: result[0],
                        logEntry: transfer
                    },
                    callback: ( err, result ) => {
                        if( err ) {
                            Y.log( `assignKIM: error creating activity for found patient ${result[0]._id}: ${err.stack || err}`, 'error', NAME );
                        } else {
                            Y.log( `assignKIM: DocLetter ${result.activityId} created for patient ${result.patientId} in casefolder ${result.caseFolderId}`, 'info', NAME );
                        }
                    }
                } );
            } else {
                if (!transfer.kimAccount){
                    Y.log( `assignKIM: No transfer.kimAccount found ${transfer}`, 'info', NAME );
                } else {
                    informAllKimAccountSubscribers('PatientTransferMojit.message.new_edocletter_assign_manually' , patientData,  transfer.kimAccount, user);
                }

            }
            return callback( null, transfer );
        }

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [setLastAccessInfo, parsePatientDataKIM], forAction: 'write'}
            ],
            post: [
                {run: [assignKIM], forAction: 'write'}
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: ['edocletter-api']}
);
