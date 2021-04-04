/*global YUI */
'use strict';

YUI.add( 'casefolder-schema', function( Y, NAME ) {

        /**
         * The CaseFolder_T entry schema,
         *
         * @module 'casefolder-schema'
         */

        var
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Collection of available casefolders via REST /2. <br><br>" +
                                 "The endpoint exposes special POST methods <ul>" +
                                 "<li>Copy activities to specific casefolder in scope of the same patient." +
                                 "It requires to hand over a activitiesIds and target casefolderId. " +
                                 "Other query parameters are free to choose. E.g.<br>" +
                                 "<pre>/2/casefolder/:copyActivitiesToCaseFolder <br>" +
                                 "POST { activityIds:[\"5dfd3210b832a21249999234\", \"5dfd3210b832a21249999432\"], caseFolderId:\"5afd4c40b83294c249999999\" }</pre></li>" +
                                 "</ul>"
                }
            },
            i18n = Y.doccirrus.i18n,
            types = {},
            eDmpTypes = ['DM1', 'DM2', 'BK', 'KHK', 'ASTHMA', 'COPD'],
            eHksTypes = ['HKS'],
            HgvTypes = ['HGV'],
            ZervixZytologieTypes = ['ZERVIX_ZYTOLOGIE'],
            eDocTypes = eDmpTypes.concat( eHksTypes, HgvTypes, ZervixZytologieTypes),
            PREPAREDCASEFOLDER_ID = '000000000000000000000001',
            additionalTypes = Object.freeze( {
                QUOTATION: 'QUOTATION',
                INCARE: 'INCARE',
                FROM_PATIENT: 'FROM_PATIENT',
                DM1: 'DM1',
                DM2: 'DM2',
                BK: 'BK',
                HGV: 'HGV',
                KHK: 'KHK',
                ASTHMA: 'ASTHMA',
                COPD: 'COPD',
                HKS: 'HKS',
                ASV: 'ASV',
                CARDIO: 'CARDIO',
                DOQUVIDE: 'DOQUVIDE',
                DQS: 'DQS',
                CARDIACFAILURE: 'CARDIACFAILURE',
                STROKE: 'STROKE',
                CHD: 'CHD',
                PREGNANCY: 'PREGNANCY',
                ERROR: 'ERROR',
                AMTS: 'AMTS',
                ZERVIX_ZYTOLOGIE: 'ZERVIX_ZYTOLOGIE'
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
                        required: true,
                        apiv: { v: 2, queryParam: false },
                        type: String,
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.title.i18n' ),
                        trim: true
                    },
                    "start": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
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
                        "required": true,
                        "apiv": { v: 2, queryParam: true },
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
                        "apiv": { v: 2, queryParam: true },
                        "type": "Insurance_E",
                        "lib": "person"
                    },
                    "additionalType": {
                        "complex": "eq",
                        "apiv": { v: 2, queryParam: true },
                        "type": "Additional_E",
                        "lib": types
                    },
                    "caseNumber": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'casefolder-schema.Schein_T.caseNumber.i18n' )
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
                    },
                    "ruleActivities": {
                        "type": "Number",
                        "default": 0,
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.activities.i18n' ),
                        "-en": "Activities",
                        "-de": "Akten"
                    },
                    "disabled": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "default": false,
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.disabled.i18n' ),
                        "-en": "deactivated",
                        "-de": "deaktiviert"
                    },
                    "merged": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "default": false,
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.merged.i18n' ),
                        "-en": "merged",
                        "-de": "zusammengeführt"
                    },
                    "identity": {
                        "apiv": { v: 2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.identity.i18n' ),
                        "-en": "type identity",
                        "-de": "type identity"
                    },
                    "lastChanged": {
                        "type": "Date",
                        i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                        "-en": "last changed",
                        "-de": "zuletzt geändert"
                    },
                    "caseFolder_CH_T": {
                        "complex": "ext",
                        "type": "CaseFolder_CH_T",
                        "lib": types
                    }
                },
                CaseFolder_CH_T: {
                    "sumexErrors": {
                        "type": "any",
                        "default": [],
                        i18n: i18n( 'casefolder-schema.CaseFolder_T.errors.i18n' ),
                        "-en": "Fehler",
                        "-de": "Errors"
                    }
                },
                Additional_E: {
                    "type": "String",
                    "list": createAdditionalTypeList(),
                    i18n: i18n( 'casefolder-schema.Additional_E.i18n' ),
                    "-en": "Type",
                    "-de": "zusätzl. Typ"
                }
            }
        );

        function creationAllowed( actType, casefolder ) {
            var type = casefolder.type,
                additionalType = casefolder.additionalType,
                // MOJ-14319: [OK] [CASEFOLDER]
                privateCF = ['PRIVATE', 'PRIVATE_A', 'SELFPAYER', 'PRIVATE_CH', 'PRIVATE_CH_IVG', 'PRIVATE_CH_UVG', 'PRIVATE_CH_MVG'];
            //  MOJ-8551
            //  TODO: allow creation of GRAVIDOGRAMM and GRAVIDOGRAMMDATA only in PRGNANCY casefolders

            if( additionalTypes.QUOTATION !== additionalType && Y.doccirrus.schemas.activity.isScheinActType( actType ) ) {
                if( 'SCHEIN' === actType ) {
                    // MOJ-14319: [OK] [CASEFOLDER]
                    return Y.doccirrus.schemas.patient.isPublicInsurance( {type: type} );
                }

                if( 'PKVSCHEIN' === actType ) {
                    return privateCF.indexOf(type) !== -1;
                }

                if( 'BGSCHEIN' === actType ) {
                    return 'BG' === type;
                }

                /**
                 * Allow creation of an AMTSSCHEIN
                 * only in AMTS casefolders.
                 */
                if( 'AMTSSCHEIN' === actType ) {
                    return 'SELFPAYER' === type;
                }
            } else {
                return true;
            }

        }

        function movementAllowed( activities, casefolder ) {
            var
                success = true,
                country = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[casefolder.type||'ANY'],
                allowedShortNames = Y.doccirrus.schemas.catalog.getShortNameByInsuranceType(
                    country, casefolder.type
                ),
                additionalType = casefolder.additionalType,
                privateCF = ['SELFPAYER', 'PRIVATE', 'PRIVATE_A', 'PRIVATE_CH', 'PRIVATE_CH_IVG',  'PRIVATE_CH_UVG',  'PRIVATE_CH_MVG'],
                bgCF = ['BG'];

            //  MOJ-8551
            //  TODO: entries may not be moved from PREGNANCY casefolders, there should only be one active at a time

            activities.some( function( activity ) {

                if( !creationAllowed( activity.actType, casefolder ) ) {
                    success = false;
                    return true;
                }
                if( 'TREATMENT' === activity.actType ) {
                    if( activity.mirrorCaseFolderType ) {
                        if( !( activity.mirrorCaseFolderType === 'ERROR' ||
                              ( privateCF.includes(activity.mirrorCaseFolderType ) && privateCF.includes( casefolder.type ) ) ||
                               // MOJ-14319:[OK]
                               (Y.doccirrus.schemas.patient.isPublicInsurance( {type: activity.mirrorCaseFolderType} ) &&
                                Y.doccirrus.schemas.patient.isPublicInsurance( {type: casefolder.type} )) ||
                              ( bgCF.includes(activity.mirrorCaseFolderType ) && bgCF.includes( casefolder.type ) )) ) {
                            success = false;
                            return true;
                        }
                    }
                }

                if( additionalTypes.QUOTATION !== additionalType && 'TREATMENT' === activity.actType && -1 === allowedShortNames.indexOf( activity.catalogShort ) ) {
                    success = false;
                    return true;
                }

            } );

            return success;
        }

        function checkOldActivitiesOnCopy( activities ) {
            var
                success = true;

            activities.some( function( activity ) {
                if( 'TREATMENT' === activity.actType ) {
                    success = Boolean( activity.mirrorCaseFolderType );
                    return true;
                }
            } );

            return success;
        }

        function caseFolderTypeForSchein( actType ) {
            // MOJ-14319: [OK] - only used in contract api; ignore ..._A because target unknown
            if( 'SCHEIN' === actType ) {
                return 'PUBLIC';
            }
            if( 'PKVSCHEIN' === actType ) {
                // quick fix: correct fix is via patient, but not needed in consumers of this function
                if( Y.doccirrus.commonutils.getCountryModeFromConfigs().includes('CH')){
                    return 'PRIVATE_CH';
                }
                return 'PRIVATE';
            }
            if( 'BGSCHEIN' === actType ) {
                return 'BG';
            }
            return null;
        }

        function caseFolderTypeToLaw( caseFolderType ) {
            switch( caseFolderType ) {
                case'PRIVATE_CH':
                    return 'KVG';
                case 'PRIVATE_CH_UVG':
                    return 'UVG';
                case 'PRIVATE_CH_IVG':
                    return 'IVG';
                case 'PRIVATE_CH_MVG':
                    return 'MVG';
                case 'PRIVATE_CH_VVG':
                    return 'VVG';
            }
            return null;
        }

        function isSwissCaseFolderType( caseFolderType ) {
            return caseFolderType && caseFolderType.startsWith('PRIVATE_CH');
        }

        function getEdmpTypes() {
            var list = Y.doccirrus.schemas.casefolder.types.Additional_E.list;
            return list.filter( function( entry ) {
                return -1 !== eDmpTypes.indexOf( entry.val );
            } );
        }

        function getHgvTypes() {
            var list = Y.doccirrus.schemas.casefolder.types.Additional_E.list;
            return list.filter( function( entry ) {
                return -1 !== HgvTypes.indexOf( entry.val );
            } );
        }

        function getZervixZytologieTypes() {
            var list = Y.doccirrus.schemas.casefolder.types.Additional_E.list;
            return list.filter( function( entry ) {
                return -1 !== ZervixZytologieTypes.indexOf( entry.val );
            } );
        }

        function isEDMP( casefolder ) {
            var edmpTypes = getEdmpTypes();
            return edmpTypes.some( function( entry ) {
                if(entry.val === 'HGV') {
                    return false;
                }
                return entry.val === casefolder.additionalType;
            } );
        }

        function isHGV( casefolder ) {
            if(casefolder.additionalType === 'HGV') {
                return true;
            }
        }

        function isZervixZytologie( casefolder ) {
            if(casefolder.additionalType === 'ZERVIX_ZYTOLOGIE') {
                return true;
            }
        }

        function isEHKS( casefolder ) {
            return eHksTypes.some( function( aType ) {
                return aType === casefolder.additionalType;
            } );
        }

        function isEDOC( casefolder ) {
            return eDocTypes.some( function( aType ) {
                return aType === casefolder.additionalType;
            } );
        }

        function isError( casefolder ) {
            return additionalTypes.ERROR === casefolder.additionalType;
        }

        function isAMTS( casefolder ) {
            return additionalTypes.AMTS === casefolder.additionalType;
        }

        function renderCasefolderName( casefolder, useHTML ) {
            if ( useHTML ) {
                return casefolder.title + ( casefolder.merged ? " <span data-toggle='popover' data-content='Zusammengefügt' rel='popover' data-placement='auto top' data-trigger='hover'>(Z)</span>" : "" );
            } else {
                return casefolder.title + ( casefolder.merged ? " (Z)" : "" );
            }
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
                }
            ],
            /* OPTIONAL default items to be written to the DB on startup */
            name: NAME,
            ramlConfig: ramlConfig,
            getPreparedCaseFolderId: function getPreparedCaseFolderId() {
                return PREPAREDCASEFOLDER_ID;
            },
            caseFolderTypeForSchein: caseFolderTypeForSchein,
            caseFolderTypeToLaw: caseFolderTypeToLaw,
            isSwissCaseFolderType: isSwissCaseFolderType,
            creationAllowed: creationAllowed,
            movementAllowed: movementAllowed,
            checkOldActivitiesOnCopy: checkOldActivitiesOnCopy,
            additionalTypes: additionalTypes,
            getEdmpTypes: getEdmpTypes,
            getHgvTypes: getHgvTypes,
            getZervixZytologieTypes: getZervixZytologieTypes,
            isEDMP: isEDMP,
            isHGV: isHGV,
            isZervixZytologie: isZervixZytologie,
            isEDOC: isEDOC,
            isEHKS: isEHKS,
            isError: isError,
            isAMTS: isAMTS,
            renderCasefolderName: renderCasefolderName,
            eDmpTypes: eDmpTypes,
            eDocTypes: eDocTypes
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
