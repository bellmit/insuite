/**
 * User: do
 * Date: 02/03/15  13:27
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'partner-schema', function( Y, NAME ) {

        var types = {},
            i18n = Y.doccirrus.i18n,
            conditionsType = Object.freeze( {
                AmtsApprovalForDataEvaluation: "AmtsApprovalForDataEvaluation",
                AmtsParticipationInSelectiveContract: "AmtsParticipationInSelectiveContract"
            } );

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Partner_T",
                        "lib": types
                    }
                },
                "PartnerType_E": {
                    "type": "String",
                    i18n: i18n( 'partner-schema.Partner_T.partnerType.i18n' ),
                    "-en": "Partner Type",
                    "-de": "Partnertyp",
                    "list": [
                        {
                            "val": "REFERRER",
                            "-en": "Referrer",
                            "-de": "Zuweiser",
                            i18n: i18n( 'partner-schema.PartnerType_E.REFERRER' )
                        },
                        {
                            "val": "PRACTICE",
                            "-en": "Practice",
                            "-de": "Praxis",
                            i18n: i18n( 'partner-schema.PartnerType_E.PRACTICE' )
                        },
                        {
                            "val": "CLINIC",
                            "-en": "Clinic",
                            "-de": "Klinik",
                            i18n: i18n( 'partner-schema.PartnerType_E.CLINIC' )
                        },
                        {
                            "val": "INSURANCE",
                            "-en": "Insurance",
                            "-de": "Kostenträger",
                            i18n: i18n( 'partner-schema.PartnerType_E.INSURANCE' )
                        },
                        {
                            "val": "PHARMACY",
                            "-en": "Pharmacy",
                            "-de": "Apotheke",
                            i18n: i18n( 'partner-schema.PartnerType_E.PHARMACY' )
                        },
                        {
                            "val": "OTHER",
                            "-en": "Other",
                            "-de": "Sonstige",
                            i18n: i18n( 'partner-schema.PartnerType_E.OTHER' )
                        }
                    ]
                },
                "Status_E": {
                    "type": "String",
                    "list": [
                        {
                            "val": "INVITED",
                            i18n: i18n( 'partner-schema.Status_E.INVITED' ),
                            "-en": "Invited",
                            "-de": "Eingeladen"
                        },
                        {
                            "val": "CONFIRMED",
                            i18n: i18n( 'partner-schema.Status_E.CONFIRMED' ),
                            "-en": "Confirmed",
                            "-de": "Bestätigt"
                        },
                        {
                            "val": "UNCONFIRMED",
                            i18n: i18n( 'partner-schema.Status_E.UNCONFIRMED' ),
                            "-en": "Unconfirmed",
                            "-de": "Unbestätigt"
                        },
                        {
                            "val": "LICENSED",
                            i18n: i18n( 'partner-schema.Status_E.LICENSED' ),
                            "-en": "Licensed",
                            "-de": "Lizenziert"
                        }
                    ]
                },
                "Condition_E": {
                    "type": "String",
                    "list": createSchemaConditionTypeList()
                },
                "Partner_T": {
                    "name": {
                        "required": true,
                        "type": "String",
                        "-en": "Name",
                        "-de": "Name",
                        i18n: i18n( 'partner-schema.Partner_T.NAME' )
                    },
                    "city": {
                        "type": "String",
                        "-en": "City",
                        "-de": "Ort",
                        i18n: i18n( 'partner-schema.Partner_T.CITY' )
                    },
                    "dcId": {
                        "required": true,
                        "type": "String",
                        "-en": "DC ID",
                        "-de": "DC ID",
                        i18n: i18n( 'partner-schema.Partner_T.DCID' )
                    },
                    "pin": {
                        "index": "unique",
                        "type": "String",
                        "validate": "Partner_T_PIN",
                        i18n: i18n( 'partner-schema.Partner_T.pin.i18n' ),
                        "-en": "PIN",
                        "-de": "PIN"
                    },
                    publicKey: {
                        type: 'String',
                        i18n: i18n( 'partner-schema.Partner_T.publicKey.i18n' ),
                        "-en": "publicKey",
                        "-de": "publicKey"
                    },
                    "partnerType": {
                        "required": true,
                        "complex": "eq",
                        "type": "PartnerType_E",
                        "lib": types
                    },
                    "comment": {
                        "type": "String",
                        "-en": "Comment",
                        "-de": "Kommentar",
                        i18n: i18n( 'partner-schema.Partner_T.COMMENT' )
                    },
                    "phone": {
                        "type": "String",
                        "-en": "phone",
                        "-de": "phone",
                        i18n: i18n( 'partner-schema.Partner_T.PHONE' )
                    },
                    "email": {
                        "type": "String",
                        "validate": "email",
                        i18n: i18n( 'partner-schema.Partner_T.email.i18n' ),
                        "-en": "E-Mail",
                        "-de": "E-Mail"
                    },
                    "fingerprint": {
                        "type": "String",
                        i18n: i18n( 'partner-schema.Partner_T.fingerprint.i18n' ),
                        "-en": "phone",
                        "-de": "phone"
                    },
                    "status": {
                        "default": "UNCONFIRMED",
                        "complex": "eq",
                        "type": "Status_E",
                        "lib": types,
                        i18n: i18n( 'partner-schema.Partner_T.status.i18n' ),
                        "-en": "Status",
                        "-de": "Status"
                    },
                    "systemType": {
                        "type": "String",
                        "-en": "systemType",
                        "-de": "systemType",
                        i18n: i18n( 'partner-schema.Partner_T.systemType.i18n' )
                    },
                    "anonymizing": {
                        "type": "Boolean",
                        "-en": "Anonymizing",
                        "-de": "Anonymisierung",
                        i18n: i18n( 'partner-schema.Partner_T.anonymizing.i18n' )
                    },
                    "noTransferOfLinkedActivities": {
                        "type": "Boolean",
                        "-en": "No transfer of linked activities",
                        "-de": "Keine Übertragung verknüpfter Aktivitäten",
                        i18n: i18n( 'partner-schema.Partner_T.noTransferOfLinkedActivities.i18n' )
                    },
                    "preserveCaseFolder": {
                        "type": "Boolean",
                        "-en": "Preserve case folder",
                        "-de": "Fallordner übernehmen",
                        i18n: i18n( 'partner-schema.Partner_T.preserveCaseFolder.i18n' )
                    },
                    "configuration": {
                        "complex": "inc",
                        "type": "DispatchConfiguration_T",
                        "lib": types,
                        i18n: i18n( 'partner-schema.Partner_T.configuration.i18n' ),
                        "-en": "configuration",
                        "-de": "configuration"
                    },
                    "bidirectional": {
                        "type": "Boolean",
                        "-en": "Bidirectional",
                        "-de": "Bidirektional",
                        i18n: i18n( 'partner-schema.Partner_T.bidirectional.i18n' )
                    },
                    "anonymizeKeepFields": {
                        "type": ["String"],
                        "-en": "Keep Fields",
                        "-de": "Felder behalten",
                        i18n: i18n( 'partner-schema.Partner_T.anonymizeKeepFields.i18n' )
                    },
                    "pseudonym": {
                        "complex": "inc",
                        "type": "Pseudonym_T",
                        "lib": types,
                        i18n: i18n( 'partner-schema.Partner_T.pseudonym.i18n' ),
                        "-en": "Pseudonym",
                        "-de": "Pseudonym"
                    },
                    "unlock": {
                        "type": "Boolean",
                        "-en": "Unlock activity",
                        "-de": "Aktivität freischalten",
                        i18n: i18n( 'partner-schema.Partner_T.unlock.i18n' )
                    },
                    "activeActive": {
                        "type": "Boolean",
                        "-en": "Active-Active",
                        "-de": "Aktiv-Aktiv",
                        i18n: i18n( 'partner-schema.Partner_T.activeActive.i18n' )
                    }
                },
                "DispatchConfiguration_T": {
                    "actTypes": {
                        "type": ["String"],
                        "-en": "ActTypes",
                        "-de": "ActTypes",
                        i18n: i18n( 'partner-schema.DispatchConfiguration_T.actTypes' )
                    },
                    "actStatuses": {
                        "type": ["String"],
                        "-en": "ActStatuses",
                        "-de": "ActStatuses",
                        i18n: i18n( 'partner-schema.DispatchConfiguration_T.actStatuses' )
                    },
                    "caseFolders": {
                        "type": ["String"],
                        "-en": "caseFolders",
                        "-de": "caseFolders",
                        i18n: i18n( 'partner-schema.DispatchConfiguration_T.caseFolders' )
                    },
                    "subTypes": {
                        "type": ["String"],
                        "-en": "subTypes",
                        "-de": "subTypes",
                        i18n: i18n( 'partner-schema.DispatchConfiguration_T.subTypes' )
                    },
                    "condition": {
                        "default": "",
                        "type": "String",
                        i18n: i18n( 'partner-schema.DispatchConfiguration_T.condition' ),
                        "-en": "Condition",
                        "-de": "Bedingung"
                    },
                    "automaticProcessing": {
                        "type": "Boolean",
                        "-en": "automaticProcessing",
                        "-de": "automaticProcessing",
                        i18n: i18n( 'partner-schema.DispatchConfiguration_T.automaticProcessing' )
                    }
                },
                "Pseudonym_T": {
                    "pseudonymType": {
                        "type": "String",
                        "-en": "Pseudonym type",
                        "-de": "Pseudonym Typ",
                        i18n: i18n( 'partner-schema.Pseudonym_T.pseudonymType' )
                    },
                    "pseudonymIdentifier": {
                        "type": "String",
                        "-en": "pseudonym identifier",
                        "-de": "pseudonym Id",
                        i18n: i18n( 'partner-schema.Pseudonym_T.pseudonymIdentifier' )
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Returns array of conditons for filtering partners in query for AMTS systems
         * @param patient
         * @returns {Array}
         */
        function getPartnerQueryForAmts(patient) {
            var query = [];

            if( !patient || !patient.amtsApprovalForDataEvaluation ) {
                query.push( {
                    condition: {
                        $ne: conditionsType.AmtsApprovalForDataEvaluation
                    }
                } );
            }

            if( !patient || !patient.amtsParticipationInSelectiveContract ) {
                query.push( {
                    condition: {
                        $ne: conditionsType.AmtsParticipationInSelectiveContract
                    }
                } );
            }

            return query;
        }

        function createSchemaConditionTypeList() {
            var
                result = [];
            Object.keys( conditionsType ).forEach( function( type ) {
                result.push( {
                    val: conditionsType[type],
                    i18n: i18n( 'partner-schema.Condition_E.' + conditionsType[type] )
                } );
            } );

            return result;
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            conditionsType: conditionsType,
            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [],
            name: NAME,
            getPartnerQueryForAmts: getPartnerQueryForAmts
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: ['dcschemaloader','dcvalidations']
    }
);
