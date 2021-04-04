/*global YUI */
YUI.add( 'mirrorcasefolder-schema', function( Y, NAME ) {

        'use strict';

        /**
         * The CaseFolder_T entry schema,
         *
         * @module 'casefolder-schema'
         */

        var
            i18n = Y.doccirrus.i18n,
            types = {},
            additionalTypes = Object.freeze( {
                QUOTATION: 'QUOTATION',
                INCARE: 'INCARE',
                FROM_PATIENT: 'FROM_PATIENT',
                DM1: 'DM1',
                DM2: 'DM2',
                //BRK: 'BRK',
                KHK: 'KHK',
                ASTHMA: 'ASTHMA',
                COPD: 'COPD',
                ASV: 'ASV',
                CARDIO: 'CARDIO',
                DOQUVIDE: 'DOQUVIDE',
                DQS: 'DQS',
                CARDIACFAILURE: 'CARDIACFAILURE',
                STROKE: 'STROKE'
            } );

        function createAdditionalTypeList() {
            var
                result = [];
            Object.keys( additionalTypes ).forEach( function( type ) {
                result.push( {
                    val: additionalTypes[type],
                    i18n: i18n( 'casefolder-schema.Additional_E.' + additionalTypes[type] + '.i18n' ),
                    '-en': type,
                    '-de': type
                } );
            } );

            return result;
        }

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "CaseFolder_T",
                        "lib": types
                    }
                },
                "CaseFolder_T": {
                    "title": {
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.title.i18n' ),
                        "-en": "title",
                        "-de": "Titel"
                    },
                    "start": {
                        "type": "Date",
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.start.i18n' ),
                        "-en": "start",
                        "-de": "start"
                    },
                    "end": {
                        "type": "Date",
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.end.i18n' ),
                        "-en": "end",
                        "-de": "end"
                    },
                    patientId: {
                        "type": "String",
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.patientId.i18n' ),
                        "-en": "patientId",
                        "-de": "patientId"
                    },
                    sourceCustomerNo: {
                        "type": "String",
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.sourceCustomerNo.i18n' ),
                        "-en": "sourceCustomerNo",
                        "-de": "sourceCustomerNo"
                    },
                    "type": {
                        "complex": "eq",
                        "type": "Insurance_E",
                        "lib": "person"
                    },
                    additionalType: {
                        "complex": "eq",
                        "type": "Additional_E",
                        "lib": types
                    },
                    "fromPatient": {
                        "type": "Boolean",
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.fromPatient.i18n' ),
                        "-en": "fromPatient",
                        "-de": "fromPatient"
                    },
                    "imported": {
                        "type": "Boolean",
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.imported.i18n' ),
                        "-en": "imported",
                        "-de": "imported"
                    },
                    "ruleErrors": {
                        "type": "Number",
                        "default": 0,
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.errors.i18n' ),
                        "-en": "Fehler",
                        "-de": "Errors"
                    },
                    "ruleWarnings": {
                        "type": "Number",
                        "default": 0,
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.warnings.i18n' ),
                        "-en": "Warnungen",
                        "-de": "Warnings"
                    }
                },
                Additional_E: {
                    "type": "string",
                    "list": createAdditionalTypeList,
                    i18n: i18n( 'casefolder-schema.Additional_E.i18n' ),
                    "-en": "Type",
                    "-de": "Typ"
                }
            }
        );

        function creationAllowed( actType, casefolder ) {
            var type = casefolder.type,
                additionalType = casefolder.additionalType;
            if( additionalTypes.QUOTATION !== additionalType && Y.doccirrus.schemas.activity.isScheinActType( actType ) ) {
                if( 'SCHEIN' === actType ) {
                    return 'PUBLIC' === type;
                }

                if( 'PKVSCHEIN' === actType ) {
                    return 'PRIVATE' === type || 'SELFPAYER' === type;
                }

                if( 'BGSCHEIN' === actType ) {
                    return 'BG' === type;
                }
            } else {
                return true;
            }

        }

        function movementAllowed( activities, casefolder ) {
            var
                success = true,
                country = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[casefolder.type || 'ANY'],
                allowedShortNames = Y.doccirrus.schemas.catalog.getShortNameByInsuranceType(
                    country, casefolder.type
                ),
                additionalType = casefolder.additionalType;

            activities.some( function( activity ) {

                if( 'VALID' !== activity.status ) {
                    success = false;
                    return true;
                }
                if( !creationAllowed( activity.actType, casefolder ) ) {
                    success = false;
                    return true;
                }

                if( additionalTypes.QUOTATION !== additionalType && 'TREATMENT' === activity.actType && -1 === allowedShortNames.indexOf( activity.catalogShort ) ) {
                    success = false;
                    return true;
                }

            } );

            return success;
        }

        function caseFolderTypeForSchein( actType ) {
            if( 'SCHEIN' === actType ) {
                return 'PUBLIC';
            }
            if( 'PKVSCHEIN' === actType ) {
                return 'PRIVATE';
            }
            if( 'BGSCHEIN' === actType ) {
                return 'BG';
            }
            return null;
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            indexes: [
                {
                    "key": {
                        "patientId": 1
                    }
                }],
            /* OPTIONAL default items to be written to the DB on startup */
            name: NAME,
            caseFolderTypeForSchein: caseFolderTypeForSchein,
            creationAllowed: creationAllowed,
            movementAllowed: movementAllowed,
            additionalTypes: additionalTypes
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'dcauth'
        ]
    }
);
