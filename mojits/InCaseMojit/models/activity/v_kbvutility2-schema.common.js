/**
 * User: do
 * Date: 13/07/16  09:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'v_kbvutility2-schema', function( Y, NAME ) {

        'use strict';

        var
            _ = Y.doccirrus.commonutils.getLodash(),
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            types = {};

        Y.log( 'Loading Schema ' + NAME, 'debug', NAME );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * MOJ-5065 this is a virtual schema and
         * does not actually have a collection related
         * to it in the DB.
         */
        types = Y.mix( types,
            {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "VKBVUtility2_T",
                        "lib": types
                    }
                },
                "KBVUtilityActType_E": {
                    "type": "String",
                    "default": "KBVUTILITY",
                    "apiv": {v: 2, queryParam: false},
                    "list": [
                        {
                            "val": "KBVUTILITY2",
                            "-de": "Heilmittel",
                            i18n: i18n( 'activity-schema.Activity_E.KBVUTILITY2' ),
                            "-en": "Utility"
                        }
                    ]
                },
                "VKBVUtility2_T": {
                    "activityBase": {
                        "complex": "ext",
                        "type": "Activity_T",
                        "lib": "activity"
                    },
                    "Base": {
                        "complex": "ext",
                        "type": "KBVUtility2_T",
                        "lib": "activity"
                    },
                    "BaseKBVUtility2Base_T": {
                        "complex": "ext",
                        "type": "KBVUtility2Base_T",
                        "lib": "activity"
                    }
                }
            }
        );

        function mapChapterToNumber( chapter ) {
            switch( chapter ) {
                case 'PHYSIO':
                    return 'I';
                case 'PODO':
                    return 'II';
                case 'LOGO':
                    return 'III';
                case 'ERGO':
                    return 'IV';
                case 'ET':
                    return 'V';
            }
        }

        function mapTherapyFrequenceTypeToCatalogType( therapyFrequenceType ) {
            switch( therapyFrequenceType ) {
                case 'UNITS_PER_DAY':
                    return 'einheiten_pro_tag';
                case 'UNITS_PER_WEEK':
                    return 'einheiten_pro_woche';
                case 'WEEKS_BETWEEN_UNITS':
                    return 'wochen_zwischen_einheiten';
            }
        }

        function mapTherapyFrequenceTypeFromCatalogType( catalogType ) {
            switch( catalogType ) {
                case 'einheiten_pro_tag':
                    return 'UNITS_PER_DAY';
                case 'einheiten_pro_woche':
                    return 'UNITS_PER_WEEK';
                case 'wochen_zwischen_einheiten':
                    return 'WEEKS_BETWEEN_UNITS';
            }
        }

        function renderTherapyFrequencyCatalogEntry( catalogEntryType, catalogEntry ) {

            var result = [],
                DAILY = ' tägl.',
                WEEKLY = ' wöch.',
                WEEKS_A = 'alle ',
                WEEKS_B = ' Wochen',
                renderedTypeEnd;

            switch( catalogEntryType ) {
                case 'einheiten_pro_tag':
                    renderedTypeEnd = DAILY;
                    break;
                case 'einheiten_pro_woche':
                    renderedTypeEnd = WEEKLY;
                    break;
                case 'wochen_zwischen_einheiten':
                    renderedTypeEnd = WEEKS_B;
                    break;
            }
            if( renderedTypeEnd === WEEKS_B && (catalogEntry.minimale_anzahl || catalogEntry.maximale_anzahl) ) {
                result.push( WEEKS_A );
            }
            if( catalogEntry.minimale_anzahl ) {
                result.push( catalogEntry.minimale_anzahl );
            }
            if( catalogEntry.maximale_anzahl ) {
                result.push( '-' );
                result.push( catalogEntry.maximale_anzahl );
            }
            if( ['einheiten_pro_tag', 'einheiten_pro_woche'].indexOf( catalogEntryType ) !== -1 ) {
                result.push( 'x' );
            }
            if( result.length ) {
                result.push( renderedTypeEnd );
            }

            return result.join( '' );
        }

        function sdhm2aHmListEntryHasDiagnosisGroupCode( diagnosisGroupCode, sdhm2aHmListEntry ) {
            return (sdhm2aHmListEntry.kapitel_liste || []).some( function( kapitel ) {
                return (kapitel.diagnosegruppe_liste || []).some( function( diagnosegruppe ) {
                    return diagnosegruppe.diagnosegruppe_value === diagnosisGroupCode;
                } );
            } );
        }

        function sdhm2aHmListEntryMatchesPatientAge( patientAge, sdhm2aHmListEntry ) {
            var _ = Y.doccirrus.commonutils.getLodash(),
                patientIsTooYoung = _.isFinite( sdhm2aHmListEntry.untere_altersgrenze_value ) && patientAge < sdhm2aHmListEntry.untere_altersgrenze_value,
                patientIsToOld = _.isFinite( sdhm2aHmListEntry.obere_altersgrenze_value ) && patientAge > sdhm2aHmListEntry.obere_altersgrenze_value;

            return !(patientIsTooYoung || patientIsToOld);
        }

        function validateRemedyLists( kbvutility2 ) {
            var
                remedy1List = kbvutility2.ut2Remedy1List,
                remedy2List = kbvutility2.ut2Remedy2List,
                nRemedies = remedy2List.length + remedy1List.length,
                hasStandardizedCombinationsOfRemedies = remedy1List.some( function( entry ) {
                    return entry.type === 'STANDARDIZED_COMBINATIONS_OF_REMEDIES';
                } ),
                canHaveMultplePrimaryRemedies = ['PHYSIO', 'LOGO', 'LOGO', 'ERGO'].indexOf( kbvutility2.ut2Chapter ) !== -1,
                allowListForList2Only = ['Elektrotherapie', 'Elektrostimulation', 'Wärmetherapie mittels Ultraschall'];

            // Standardized combinations must have at least 3 primary or additional remedies
            if( hasStandardizedCombinationsOfRemedies ) {
                return nRemedies === 1 || nRemedies >= 4;
            } else {
                // multiple primary not allowed
                if( !canHaveMultplePrimaryRemedies && remedy1List.length > 1 ) {
                    return false;
                }
                // not more then 3 primary
                if( remedy1List.length > 3 ) {
                    return false;
                }
                // never more than 1 additional
                if( remedy2List.length > 1 ) {
                    return false;
                }
                // need some
                if( !remedy1List.length && !remedy2List.length ) {
                    return false;
                }
                // only allow one additional for items in the allow list
                if( !remedy1List.length && remedy2List.length && allowListForList2Only.indexOf( remedy2List[0].name ) === -1 ) {
                    return false;
                }
            }

            return true;
        }

        function getCatalogMaxRemedyUnits( u_extra ) {
            var heilmittelverordnung = u_extra && u_extra.heilmittelverordnung,
                verordnungsmenge = heilmittelverordnung && heilmittelverordnung.verordnungsmenge,
                hoechstmenge_verordnung = verordnungsmenge && verordnungsmenge.hoechstmenge_verordnung;

            return hoechstmenge_verordnung && hoechstmenge_verordnung.value;
        }

        function getCatalogMaxCaseRemedyUnits( u_extra, icdCodes, type, patientAge ) {
            // types: orientierende_behandlungsmenge, orientierende_behandlungsmenge_standardisiert, orientierende_behandlungsmenge_massage
            var heilmittelverordnung = u_extra && u_extra.heilmittelverordnung,
                verordnungsmenge = heilmittelverordnung && heilmittelverordnung.verordnungsmenge,
                orientierungs_menge = verordnungsmenge && verordnungsmenge[type],
                icd_code_liste = orientierungs_menge && orientierungs_menge.icd_code_liste;

            /*

                ERGO M47.03 G99.2 EN2
                PHYSIO Z96.64

                'M47.0- G99.2'
                "Z98.8 Z96.64"


                PHYSIO - AT:

                "orientierende_behandlungsmenge" : {
                    "value" : 18,
                    "orientierende_behandlungsmenge_icd_code" : 50, // dieser weit gilt wenn eine der folgenden ICD code passt! sonst value
                    "icd_code_liste" : [
                        "J47",
                        "Q33.4",
                        "Q34.8",
                        "Q33.2",
                        "Q33.3",
                        "Q33.6",
                        "Q33.8",
                        "Q33.9",
                        "Q34.0",
                        "Q34.1",
                        "Q34.9"
                    ]
                }


                PHYSIO - ZN

                "verordnungsmenge" : {
                    "hoechstmenge_verordnung" : {
                        "value" : 10,
                        "icd_code_liste" : [ ]
                    },
                    "orientierende_behandlungsmenge" : {
                        "value" : 30,
                        "orientierende_behandlungsmenge_hoechstalter" : "50",
                        "hoechstalter_jahre" : "50",
                        "icd_code_liste" : [ ]
                    }
                }


                PHYSIO - WS

                "verordnungsmenge" : {
                    "hoechstmenge_verordnung" : {
                        "value" : 6,
                        "icd_code_liste" : [ ]
                    },
                    "orientierende_behandlungsmenge" : {
                        "value" : 18,
                        "icd_code_liste" : [ ]
                    },
                    "orientierende_behandlungsmenge_standardisiert" : {
                        "value" : 12,
                        "icd_code_liste" : [ ]
                    },
                    "orientierende_behandlungsmenge_massage" : {
                        "value" : 12,
                        "icd_code_liste" : [ ]
                    }
                }
             */

            if( !orientierungs_menge ) {
                return;
            }

            if(
                _.isFinite( orientierungs_menge.orientierende_behandlungsmenge_hoechstalter ) &&
                _.isFinite( orientierungs_menge.hoechstalter_jahre ) &&
                _.isFinite( patientAge ) &&
                patientAge > orientierungs_menge.hoechstalter_jahre
            ) {
                return orientierungs_menge.orientierende_behandlungsmenge_hoechstalter;
            }

            if(
                _.isFinite( orientierungs_menge.orientierende_behandlungsmenge_icd_code ) &&
                icd_code_liste && icd_code_liste.length && _.intersection( icdCodes, icd_code_liste ).length > 0
            ) {
                return orientierungs_menge.orientierende_behandlungsmenge_icd_code;
            }

            return orientierungs_menge && orientierungs_menge.value;
        }

        function makeContent( data, options ) {
            function makeIcdContent( icd, text ) {
                var str = '';
                if( icd && text ) {
                    str = '(' + icd + ')' + (text ? (' ' + text) : '');
                } else if( icd ) {
                    str = icd;
                }
                return str;
            }

            options = options || {};

            var
                MAX_CHARS_BEFORE_ADD_CUSTOM_FOLD = 255,
                CUSTOM_FOLD = '{{...}}',
                renderedUtilities = data.ut2Remedy1List.concat( data.ut2Remedy2List ).map( function( entry ) {
                    return entry.name + (entry.units ? (' (' + entry.units + ')') : '');
                } ).join( ', ' ),
                fullContent = [
                    makeIcdContent( data.utIcdCode, options.noTexts ? '' : data.utIcdText ),
                    makeIcdContent( data.utSecondIcdCode, options.noTexts ? '' : data.utSecondIcdText ),
                    renderedUtilities
                ].filter( Boolean ).join( ', ' ),

                content = fullContent.length > MAX_CHARS_BEFORE_ADD_CUSTOM_FOLD ?
                    (fullContent.substr( 0, MAX_CHARS_BEFORE_ADD_CUSTOM_FOLD ) + CUSTOM_FOLD + fullContent.substr( MAX_CHARS_BEFORE_ADD_CUSTOM_FOLD )) :
                    fullContent;

            return content;
        }

        function makeApprovalContent( data ) {
            var moment = Y.doccirrus.commonutils.getMoment(),
                content = 'Gültig bis: ';
            if( data.unlimitedApproval ) {
                content += 'unbefristet';
            } else if( data.approvalValidTo ) {
                content += moment( data.approvalValidTo ).format( TIMESTAMP_FORMAT );
            }
            content += (' Diagnosegruppe: ' + data.ut2DiagnosisGroupCode);
            content += (' IKNR: ' + data.insuranceId);

            return content + ': ' + makeContent( data, {noTexts: true} );
        }

        function getPatientAgeAt( kbvDob, timestamp ) {
            var moment = Y.doccirrus.commonutils.getMoment();
            var firstDate, secondDate, diff;
            if( !timestamp || !kbvDob || kbvDob.match( /00\./gm ) ) {
                return null;
            }
            firstDate = moment( timestamp ).startOf( 'day' );
            secondDate = moment( kbvDob, 'DD.MM.YYYY' ).startOf( 'day' );
            diff = firstDate.diff( secondDate, 'years' );
            return diff;
        }

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,

            mapChapterToNumber: mapChapterToNumber,
            mapTherapyFrequenceTypeFromCatalogType: mapTherapyFrequenceTypeFromCatalogType,
            mapTherapyFrequenceTypeToCatalogType: mapTherapyFrequenceTypeToCatalogType,
            renderTherapyFrequencyCatalogEntry: renderTherapyFrequencyCatalogEntry,
            sdhm2aHmListEntryHasDiagnosisGroupCode: sdhm2aHmListEntryHasDiagnosisGroupCode,
            sdhm2aHmListEntryMatchesPatientAge: sdhm2aHmListEntryMatchesPatientAge,
            validateRemedyLists: validateRemedyLists,
            getCatalogMaxRemedyUnits: getCatalogMaxRemedyUnits,
            getCatalogMaxCaseRemedyUnits: getCatalogMaxCaseRemedyUnits,
            makeContent: makeContent,
            makeApprovalContent: makeApprovalContent,
            getPatientAgeAt: getPatientAgeAt,

            ramlConfig: {
                // REST API v2. parameters
                "2": {
                    description: "Utility type activities represent 'Heilmittel'. These are prescriptions from three particular catalogs. The REST API currently does not allow access to these catalogs, and it is up to the caller to enter the correct courses of treatment."
                }
            }

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );

    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'activity-schema'
        ]
    }
);
