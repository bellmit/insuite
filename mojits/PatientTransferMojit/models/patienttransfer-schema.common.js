/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';
/*global YUI*/
YUI.add( 'patienttransfer-schema', function( Y, NAME ) {

        var
            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n,
            patientTransferTypes = Object.freeze( {
                SENT: 'SENT',
                SENDING: 'SENDING',
                CANCELED: 'CANCELED',
                NEW: 'NEW',
                IMPORTED: 'IMPORTED',
                READ: 'READ'
            } );

        function createSchemaPatientTransferTypesList() {
            var
                result = [];
            Object.keys( patientTransferTypes ).forEach( function( type ) {
                result.push( {
                    val: patientTransferTypes[ type ],
                    i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.Status_E.' + patientTransferTypes[ type ] ),
                    '-en': i18n( 'patienttransfer-schema.PatientTransfer_T.Status_E.' + patientTransferTypes[ type ] ),
                    '-de': i18n( 'patienttransfer-schema.PatientTransfer_T.Status_E.' + patientTransferTypes[ type ] )
                } );
            } );

            return result;
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                'root': {
                    base: {
                        complex: 'ext',
                        type: 'PatientTransfer_T',
                        lib: types
                    }
                },
                'PatientTransfer_T': {
                    timestamp: {
                        'type': 'Date',
                        '-en': i18n( 'patienttransfer-schema.PatientTransfer_T.timestamp.i18n' ),
                        '-de': i18n( 'patienttransfer-schema.PatientTransfer_T.timestamp.i18n' ),
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.timestamp.i18n' )
                    },
                    created: {
                        'required': true,
                        'type': 'Date',
                        default: Date.now,
                        '-en': i18n( 'patienttransfer-schema.PatientTransfer_T.created.i18n' ),
                        '-de': i18n( 'patienttransfer-schema.PatientTransfer_T.created.i18n' ),
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.created.i18n' )
                    },
                    mirrorActivitiesIds: {
                        type: [ 'String' ],
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.mirrorActivitiesIds.i18n' ),
                        '-en': 'activitiesIds',
                        '-de': 'activitiesIds'
                    },
                    mirrorActivitiesActTypes: {
                        type: [ 'String' ],
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.mirrorActivitiesActTypes.i18n' ),
                        '-en': 'activitiesActTypes',
                        '-de': 'activitiesActTypes'
                    },
                    practiceName: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.practiceName.i18n' ),
                        '-en': 'practiceName',
                        '-de': 'practiceName'
                    },
                    practiceCity: {
                        "type": "String",
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.city.i18n' )
                    },
                    doctorName: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.doctorName.i18n' ),
                        '-en': 'doctorName',
                        '-de': 'doctorName'
                    },
                    patientId: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.patientId.i18n' ),
                        '-en': 'patientId',
                        '-de': 'patientId'
                    },
                    mirrorPatientName: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.mirrorPatientName.i18n' ),
                        '-en': 'mirrorPatientName',
                        '-de': 'mirrorPatientName'
                    },
                    mirrorPatientId: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.mirrorPatientId.i18n' ),
                        '-en': 'mirrorPatientId',
                        '-de': 'mirrorPatientId'
                    },
                    patientName: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.patientName.i18n' ),
                        '-en': 'patientName',
                        '-de': 'patientName'
                    },
                    patientPseudonym: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.patientPseudonym.i18n' )
                    },
                    status: {
                        complex: 'eq',
                        type: 'Status_E',
                        lib: types
                    },
                    user: {
                        'complex': 'inc',
                        'type': 'EmployeeShort_T',
                        'lib': 'employee',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.user.i18n' ),
                        '-en': i18n( 'patienttransfer-schema.PatientTransfer_T.user.i18n' ),
                        '-de': i18n( 'patienttransfer-schema.PatientTransfer_T.user.i18n' )
                    },
                    textContent: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.textContent.i18n' ),
                        '-en': i18n( 'patienttransfer-schema.PatientTransfer_T.textContent.i18n' ),
                        '-de': i18n( 'patienttransfer-schema.PatientTransfer_T.textContent.i18n' )
                    },
                    subject: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.subject.i18n' ),
                        '-en': i18n( 'patienttransfer-schema.PatientTransfer_T.subject.i18n' ),
                        '-de': i18n( 'patienttransfer-schema.PatientTransfer_T.subject.i18n' )
                    },
                    attachedMedia: {
                        "complex": "inc",
                        "type": "AttachedMedia_T",
                        "lib": "activity",
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.attachedMedia.i18n' )
                    },
                    partners: {
                        "complex": "inc",
                        "type": "Partners_T",
                        "lib": types,
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.partners.i18n' )
                    },
                    preservedCaseFolders: {
                        type: 'Boolean',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.preservedCaseFolders.i18n' ),
                        '-en': 'preservedCaseFolders',
                        '-de': 'preservedCaseFolders'
                    },
                    unlock: {
                        "type": "Boolean",
                        "-en": "Unlock activity",
                        "-de": "Aktivität freischalten",
                        i18n: i18n( 'partner-schema.Partner_T.unlock.i18n' )
                    },
                    requestId: {
                        type: 'String',
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.requestId.i18n' ),
                        '-en': 'requestId',
                        '-de': 'requestId'
                    },
                    kimRecipient: {
                        "complex": "inc",
                        "type": "KimRecipient_T",
                        "lib": types,
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.kimRecipient.i18n' )
                    },
                    kimSender: {
                        "type": "String",
                        "-en": "id",
                        "-de": "id",
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.kimSender.i18n' )
                    },
                    senderKimAccounts: {
                        "complex": "inc",
                        "type": "SenderKimAccounts_T",
                        "lib": types,
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.senderKimAccounts.i18n' )
                    },
                    receiverKimAccounts: {
                        "complex": "inc",
                        "type": "ReceiverKimAccounts_T",
                        "lib": types,
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.receiverKimAccounts.i18n' )
                    },
                    emailType: {
                        "type": "String",
                        "-en": "email type",
                        "-de": "Email Typ",
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.emailType.i18n' )
                    },
                    messageID: {
                        "type": "String",
                        "-en": "message Id",
                        "-de": "Nachrichten Id",
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.messageID.i18n' )
                    },
                    kimReceiverEmail: {
                        "type": "String",
                        "-en": "email receiver",
                        "-de": "Email Empfänger",
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.kimReceiverEmail.i18n' )
                    },
                    kimAccount: {
                        "type": "String",
                        "-en": "KIM account",
                        "-de": "KIM account",
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.kimAccount.i18n' )
                    },
                    parsedKIMPatient: {
                        type: 'any'
                    },
                    activityIds: {
                        "type": ["String"],
                        "-en": "activity id",
                        "-de": "Activity-ID",
                        i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.activityId.i18n' )
                    }
                },
                SenderKimAccounts_T: {
                    "id": {
                        "type": "String",
                        "-en": "id",
                        "-de": "id",
                        i18n: i18n( 'patienttransfer-schema.SenderKimAccounts_T.id.i18n' )
                    },
                    "username": {
                        "type": "String",
                        "-en": "user name",
                        "-de": "Benutzername",
                        i18n: i18n( 'patienttransfer-schema.SenderKimAccounts_T.username.i18n' )
                    },
                    "authorisedUsers": {
                        "type": ["String"],
                        "-en": "authorised Users",
                        "-de": "authorisierte Benutzer",
                        i18n: i18n( 'patienttransfer-schema.SenderKimAccounts_T.authorisedUsers.i18n' )
                    }
                },
                ReceiverKimAccounts_T: {
                    "id": {
                        "type": "String",
                        "-en": "id",
                        "-de": "id",
                        i18n: i18n( 'patienttransfer-schema.SenderKimAccounts_T.id.i18n' )
                    },
                    "displayName": {
                        "type": "String",
                        "-en": "display name",
                        "-de": "Anzeigenname",
                        i18n: i18n( 'patienttransfer-schema.SenderKimAccounts_T.displayName.i18n' )
                    },
                    "mail": {
                        "type": "String",
                        "-en": "email",
                        "-de": "Email",
                        i18n: i18n( 'patienttransfer-schema.SenderKimAccounts_T.mail.i18n' )
                    },
                    "accountType": {
                        "type": "String",
                        "-en": "type",
                        "-de": "Typ",
                        i18n: i18n( 'patienttransfer-schema.SenderKimAccounts_T.accountType.i18n' )
                    }
                },
                KimRecipient_T: {
                    "id": {
                        "type": "String",
                        "-en": "id",
                        "-de": "id",
                        i18n: i18n( 'patienttransfer-schema.KimRecipient_T.id.i18n' )
                    },
                    "displayName": {
                        "type": "String",
                        "-en": "display name",
                        "-de": "Anzeigenname",
                        i18n: i18n( 'patienttransfer-schema.SenderKimAccounts_T.displayName.i18n' )
                    },
                    "mail": {
                        "type": ["String"],
                        "-en": "email",
                        "-de": "Email",
                        i18n: i18n( 'patienttransfer-schema.KimRecipient_T.mail.i18n' )
                    },
                    "accountType": {
                        "type": "String",
                        "-en": "account type",
                        "-de": "Accounttyp",
                        i18n: i18n( 'patienttransfer-schema.KimRecipient_T.accountType.i18n' )
                    }
                },
                Partners_T: {
                    "name": {
                        "type": "String",
                        "-en": "Name",
                        "-de": "Name",
                        i18n: i18n( 'partner-schema.Partner_T.NAME' )
                    },
                    "dcId": {
                        "type": "String",
                        "-en": "DC ID",
                        "-de": "DC ID",
                        i18n: i18n( 'partner-schema.Partner_T.DCID' )
                    },
                    "partnerType": {
                        "complex": "eq",
                        "type": "PartnerType_E",
                        "lib": 'partner'
                    },
                    "comment": {
                        "type": "String",
                        "-en": "Comment",
                        "-de": "Kommentar",
                        i18n: i18n( 'partner-schema.Partner_T.COMMENT' )
                    }
                },
                Status_E: {
                    type: 'String',
                    'default': 'NEW',
                    i18n: i18n( 'patienttransfer-schema.PatientTransfer_T.status.i18n' ),
                    '-en': 'Status',
                    '-de': 'Status',
                    'list': createSchemaPatientTransferTypesList()
                }
            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,
            patientTransferTypes: patientTransferTypes

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'dcvalidations', 'dcschemaloader', 'activity-schema', 'partner-schema' ] }
);
