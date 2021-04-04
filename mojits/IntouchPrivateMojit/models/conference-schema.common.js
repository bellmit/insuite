/**
 * User: pi
 * Date: 29/09/2017  14:40
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'conference-schema', function( Y, NAME ) {
        /**
         *
         * @module conference
         */

        var
            types = {},
            i18n = Y.doccirrus.i18n,
            conferenceStatuses = Object.freeze( {
                NEW: 'NEW',
                INITIALIZED: 'INITIALIZED',
                UNCONFIRMED: 'UNCONFIRMED'
            } ),
            conferenceTypes = Object.freeze({
                CONFERENCE: 'CONFERENCE',
                ONLINE_CONSULTATION: 'ONLINE_CONSULTATION'
            });
        function createSchemaConferenceStatusList() {
            var
                result = [];
            Object.keys( conferenceStatuses ).forEach( function( type ) {
                result.push( {
                    val: conferenceStatuses[ type ],
                    i18n: i18n( 'conference-schema.Status_E.' + conferenceStatuses[ type ] )
                } );
            } );

            return result;
        }
        types = Y.mix( types, {
                root: {
                    base: {
                        complex: "ext",
                        type: "Conference_T",
                        lib: types
                    }
                },
                Conference_T: {
                    callerId: {
                        type: 'ObjectId',
                        i18n: i18n( 'conference-schema.Conference_T.callerId.i18n' )
                    },
                    participants: {
                        complex: "inc",
                        type: "Participant_T",
                        lib: types,
                        i18n: i18n( 'conference-schema.Conference_T.participants.i18n' )
                    },
                    employees: {
                        validate: "notEmptyArray",
                        type: ["ObjectId"],
                        i18n: i18n( 'conference-schema.Conference_T.employees.i18n' )
                    },
                    patients: {
                        validate: "notEmptyArray",
                        type: ["ObjectId"],
                        i18n: i18n( 'conference-schema.Conference_T.patients.i18n' )
                    },
                    startDate: {
                        "required": true,
                        type: "Date",
                        i18n: i18n( 'conference-schema.Conference_T.startDate.i18n' )
                    },
                    status: {
                        complex: 'eq',
                        type: 'Status_E',
                        lib: types
                    },
                    conferenceType: {
                        complex: 'eq',
                        type: 'ConferenceType_E',
                        lib: types
                    },
                    isForUnregistered: {
                        type: "Boolean",
                        i18n: i18n( 'conference-schema.Conference_T.isForUnregistered.i18n' )
                    }
                },
                ConferenceType_E: {
                    "default": conferenceTypes.CONFERENCE,
                    i18n: i18n( 'conference-schema.ConferenceType_E.i18n' ),
                    "type": "String",
                    "list": Object.keys( conferenceTypes ).map( function( type ) {
                        return {
                            val: type,
                            i18n: i18n( 'conference-schema.ConferenceType_E' + type +'.i18n' )
                        };
                    } )
                },
                Status_E: {
                    type: 'String',
                    'default': 'NEW',
                    i18n: i18n( 'conference-schema.Status_E.i18n' ),
                    list: createSchemaConferenceStatusList()
                },
                Participant_T: {
                    firstname: {
                        type: "String",
                        i18n: i18n( 'identity-schema.Identity_T.firstname' )
                    },
                    lastname: {
                        type: "String",
                        i18n: i18n( 'identity-schema.Identity_T.lastname' )
                    },
                    email: {
                        "required": true,
                        "validate": "email",
                        type: "String",
                        i18n: i18n( 'general.title.EMAIL' )
                    },
                    copyEmailCreate: {
                        type: "String",
                        i18n: i18n( 'conference-schema.Participant_T.copyEmailCreate' )
                    },
                    copyEmailUpdate: {
                        type: "String",
                        i18n: i18n( 'conference-schema.Participant_T.copyEmailUpdate' )
                    },
                    copyEmailDelete: {
                        type: "String",
                        i18n: i18n( 'conference-schema.Participant_T.copyEmailDelete' )
                    },
                    talk: {
                        type: "String",
                        i18n: i18n( 'patient-schema.Talk_E.i18n' )
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {
            types: types,
            name: NAME,
            conferenceStatuses: conferenceStatuses,
            conferenceTypes: conferenceTypes
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'dcvalidations', 'dcschemaloader' ] }
);
