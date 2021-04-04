/**
 * User: pi
 * Date: 11/10/2017  10:20
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'conference-process', function( Y, NAME ) {
        const
            async = require( 'async' );
        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function deleteRelatedEntries( user, conference, callback ) {
            if( Y.doccirrus.schemas.conference.conferenceStatuses.UNCONFIRMED === conference.status ) {
                return callback( null, conference );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'schedule',
                        action: 'delete',
                        query: {
                            conferenceId: conference._id
                        }
                    }, err => next( err ) );
                },
                function( next ) {
                    if( Y.doccirrus.schemas.conference.conferenceStatuses.NEW === conference.status ) {
                        if( conference.participants ) {
                            Y.doccirrus.api.telecommunication.cancelEmailInvitations( {
                                user,
                                data: {
                                    participants: conference.participants,
                                    conference: {
                                        conferenceType: conference.conferenceType,
                                        isForUnregistered: conference.isForUnregistered,
                                        startDate: conference.startDate,
                                        conferenceId: conference._id.toString()
                                    }
                                },
                                callback: next
                            } );
                        } else {
                            setImmediate( next );
                        }
                        return;
                    }
                    Y.doccirrus.api.conference.cancelConference( {
                        user,
                        data: conference,
                        callback: next
                    } );
                }
            ], callback );

        }

        function itemToString( item ) {
            return item && item.toString();
        }

        /**
         * Sends cancel email to new participants
         * @param {Object} user
         * @param {Object} conference
         * @param {Function} callback
         * @return {Function}
         */
        function checkDeletedParticipants( user, conference, callback ) {
            let
                oldData = this && this.dbData || {},
                oldParticipants = oldData.participants || [],
                deletedParticipants,
                currentParticipantsEmail;
            if( conference.wasNew ) {
                return callback();
            }
            currentParticipantsEmail = conference.participants.map( item => item.email );
            deletedParticipants = oldParticipants.filter( item => {
                return !currentParticipantsEmail.includes( item.email );
            } );
            if( !deletedParticipants.length ) {
                return callback();
            }

            Y.doccirrus.api.telecommunication.cancelEmailInvitations( {
                user,
                data: {
                    participants: deletedParticipants,
                    conference: {
                        startDate: conference.startDate,
                        isForUnregistered: conference.isForUnregistered,
                        conferenceId: conference._id.toString()
                    }
                },
                callback
            } );
        }

        /**
         * Prevents cases when status has been set back to "NEW"
         * @param {Object} user
         * @param {Object} conference
         * @param {Function} callback
         * @return {Function} callback
         */
        function checkStatus( user, conference, callback ) {
            const
                oldData = this && this.dbData || {};
            if( !conference.isNew && Y.doccirrus.schemas.conference.conferenceStatuses.NEW === conference.status && oldData && oldData.status !== conference.status ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 403 ) );
            }
            callback();
        }

        /**
         * Sends invitation/notification email to new participants
         * @param {Object} user
         * @param {Object} conference
         * @param {Function} callback
         * @return {Fuction}
         */
        function checkAddedParticipants( user, conference, callback ) {
            let
                oldData = this && this.dbData || {},
                oldParticipants = oldData.participants && oldData.participants.map( item => item.email ) || [],
                addedParticipants;
            if( conference.wasNew ) {
                addedParticipants = conference.participants;
            } else {
                addedParticipants = conference.participants.filter( item => {
                    return !oldParticipants.includes( item.email );
                } );
            }

            if( !addedParticipants.length ) {
                return callback();
            }
            switch( conference.status ) {
                case Y.doccirrus.schemas.conference.conferenceStatuses.NEW:
                    Y.doccirrus.api.conference.notifyParticipants( {
                        user,
                        data: {
                            participants: addedParticipants.map( item => item.toObject() ),
                            startDate: conference.startDate,
                            conferenceType: conference.conferenceType
                        },
                        callback
                    } );
                    break;
                case Y.doccirrus.schemas.conference.conferenceStatuses.INITIALIZED:
                    Y.doccirrus.api.telecommunication.inviteExternalParticipants( {
                        user,
                        data: {
                            participants: addedParticipants.map( item => item.toObject() ),
                            conferenceId: conference._id.toString(),
                            startDate: conference.startDate,
                            conferenceType: conference.conferenceType
                        },
                        callback
                    } );
                    break;
            }

        }

        /**
         * Checks changes in employees of INITIALIZED conference
         * @param {Object} user
         * @param {Object} conference
         * @param {Function} callback
         *
         * @return {Function}
         */
        function checkEmployees( user, conference, callback ) {
            let
                oldData = this && this.dbData || {},
                oldEmployees = oldData.employees && oldData.employees.map( itemToString ) || [],
                addedEmployees,
                deletedEmployees,
                employees,
                _conference,
                callerId;
            if( conference.wasNew || Y.doccirrus.schemas.conference.conferenceStatuses.NEW === conference.status || Y.doccirrus.schemas.conference.conferenceStatuses.NEW === oldData.status ) {
                return callback();
            }
            employees = conference.employees.map( itemToString );
            addedEmployees = employees.filter( item => {
                return !oldEmployees.includes( item );
            } );
            deletedEmployees = oldEmployees.filter( item => {
                return !employees.includes( item );
            } );
            if( !addedEmployees.length && !deletedEmployees.length ) {
                return callback();
            }
            _conference = conference.toObject();
            _conference._id = _conference._id.toString();
            if( conference.employees[ 0 ] !== oldEmployees[ 0 ] ) {
                callerId = conference.employees[ 0 ] && conference.employees[ 0 ].toString();
            }
            Y.doccirrus.api.conference.updateEmployees( {
                user,
                data: {
                    conference: _conference,
                    addedEmployees: addedEmployees.filter( employeeId => employeeId !== callerId ),
                    deletedEmployees,
                    callerId
                },
                callback
            } );
        }

        /**
         * Updates patient list in call audit notes
         * @param {Object} user
         * @param {Object} conference
         * @param {Function} callback
         * @return {Function}
         */
        function checkPatients( user, conference, callback ) {
            let
                oldData = this && this.dbData || {},
                oldPatients = oldData.patients && oldData.patients.map( itemToString ) || [],
                patientsChanged;
            if( Y.doccirrus.schemas.conference.conferenceStatuses.INITIALIZED !== oldData.status ) {
                return callback();
            }
            patientsChanged = conference.patients.length !== oldPatients.length || conference.patients.some( patientId => !oldPatients.includes( patientId.toString() ) );
            if( patientsChanged ) {
                return Y.doccirrus.api.conference.updatePatientList( {
                    user,
                    data: {
                        patients: conference.patients.map( itemToString ),
                        conferenceId: conference._id.toString()
                    },
                    callback
                } );
            }
            callback();
        }

        /**
         * @class conferenceProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[ NAME ] = {

            name: NAME,
            pre: [
                {
                    run: [
                        checkStatus
                    ], forAction: 'write'
                }
            ],
            post: [
                {
                    run: [
                        checkEmployees,
                        checkAddedParticipants,
                        checkDeletedParticipants,
                        checkPatients
                    ], forAction: 'write'
                },
                {
                    run: [
                        deleteRelatedEntries
                    ], forAction: 'delete'
                }
            ]
        };

    },
    '0.0.1', { requires: [ 'conference-schema' ] }
);
