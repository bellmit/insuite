/*global YUI */


YUI.add( 'devicelog-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        let Promise = require( 'bluebird' ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

        function getUserIdentity( user ) {
            return runDb( {
                user: user,
                model: 'identity',
                action: 'get',
                query: {
                    _id: user.identityId
                }
            } );
        }

        function getEmployeeFromIdentity( user, identity ) {
            return runDb( {
                user: user,
                model: 'employee',
                action: 'get',
                query: {
                    _id: identity.specifiedBy
                }
            } );
        }

        function getPatientById( user, patientId ) {
            return runDb( {
                model: 'patient',
                user: user,
                action: 'get',
                query: {
                    _id: patientId
                },
                options: {
                    lean: true,
                    limit: 1
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
                callback( null, transfer );
            }
        }

        function createTaskIfUnmatched( user, transfer, callback ) {

            if( transfer.status === 'UNPROCESSED' || !transfer.patientId ) {

                const taskData = {
                    allDay: true,
                    alertTime: (new Date()).toISOString(),
                    title: 'Neuer Eintrag im Mediabuch',
                    urgency: 2,
                    details: 'Neuer nicht zuordenbarer Eintrag im Mediabuch',
                    group: false,
                    roles: [Y.doccirrus.schemas.role.DEFAULT_ROLE.EMPFANG],
                    deviceLogEntryId: transfer._id
                };

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'task',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( taskData )
                }, ( err ) => {//, result
                    if( err ) {
                        Y.log( 'Failed to add task: ' + 'New device log entry' + '\n\t' + err.message, 'error', NAME );
                    }
                } );
            }

            callback( null, transfer );
        }

        function setPatientName( user, transfer, callback ) {

            if( transfer.status !== 'UNPROCESSED' && transfer.patientId ) {
                getPatientById( user, transfer.patientId )
                    .then( ( patientResults ) => {
                        if( patientResults.length ) {
                            let patient = patientResults[0];
                            transfer.patientName = Y.doccirrus.schemas.person.getFullName( patient.firstname, patient.lastname, patient.talk );
                        }
                        callback( null, transfer );
                    } )
                    .catch( ( err ) => callback( err ) );
            } else {
                callback( null, transfer );
            }
        }

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [setLastAccessInfo, setPatientName], forAction: 'write'}
            ],

            post: [
                {run: [createTaskIfUnmatched], forAction: 'write'}
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
