/**
 *  Common component used by FEM and CaseFile to store form roles (forms which have a special use defined in software)
 *  @author: strix
 */

/*jslint anon:true, nomen:true*/
/*global YUI, _*/

'use strict';

YUI.add( 'dcforms-roles', function( Y /*, NAME */ ) {
        var ObjectAssign =  Y.doccirrus.commonutils.isClientSide() ? _.assign : Object.assign;
        var formRolesCommon = [
            { name: 'startform', '-en': 'inForm Start Page', '-de': 'inForm Startmaske' },
            { name: 'missing-subform', '-en': 'subform placeholder', '-de': 'Platzhalter' },

            { name: 'casefile-invoice', '-en': 'inCase Invoice', '-de': 'inCase Rechnung' },
            { name: 'casefile-docletter', '-en': 'inCase Doctors Letter', '-de': 'inCase Arztbrief' },

            { name: 'casefile-terminliste', '-en': 'inCase Appointment List', '-de': 'inCase Terminliste' },

            { name: 'casefile-receipt', '-en': 'inCase Receipt', '-de': 'inCase Quittung' },
            { name: 'casefile-quote', '-en': 'inCase Cost estimate', '-de': 'inCase Kostenplan' },
            { name: 'casefile-reminder', '-en': 'inCase Reminder', '-de': 'inCase Erinnerung' },
            { name: 'casefile-warning-1', '-en': 'inCase Warning 1', '-de': 'inCase Mahnung 1' },
            { name: 'casefile-warning-2', '-en': 'inCase Warning 2', '-de': 'inCase Mahnung 2' },
            { name: 'casefile-credit-note', '-en': 'inCase Credit note', '-de': 'inCase Gutschrift' },
            { name: 'casefile-bad-debt', '-en': 'inCase Bad debt', '-de': 'inCase Ausbuchen' },
            { name: 'casefile-structured-history', '-en': 'inCase Structured History', '-de': 'inCase Strukturierte Anamnese' },

            { name: 'casefile-patient-folder', '-en': 'inCase CaseFolder', '-de': 'inCase Patientenakte' },
            { name: 'casefile-labdata-table', '-en': 'inCase Labadata Table (Landscape)', '-de': 'inCase Labordaten Tabelle (Querformat)' },
            { name: 'casefile-labdata-portrait-table', '-en': 'inCase Labadata Table (Portrait)', '-de': 'inCase Labordaten Tabelle (Hochformat)' },
            { name: 'casefile-medicationplan-table', '-en': 'inCase Medication Plan', '-de': 'inCase Medicationsplan' },
            { name: 'casefile-healthsurvey', '-en': 'inCase Health Exam', '-de': 'inCase Gesundheitsuntersuchung' },
            { name: 'casefile-surgery', '-en': 'inCase Surgery', '-de': 'inCase Chirurgie' },
            { name: 'casefile-meddata', '-en': 'inCase med data', '-de': 'inCase Medizindaten' },

            { name: 'casefile-gravidogram', '-en': 'inCase Gravidogram', '-de': 'inCase Gravidogramm' },
            { name: 'casefile-checkupplan', '-en': 'inCase Checkup Plan', '-de': 'inCase Vorsorgeplan' },

            { name: 'casefile-docletterdiagnosis', '-en': 'inCase Diagnosis Letter', '-de': 'inCase Briefdiagnose' },
            { name: 'casefile-therapy', '-en': 'inCase Therapy', '-de': 'inCase Therapie' },

            { name: 'casefile-ko-generic-table', '-en': 'KoUI Generic Table', '-de': 'generisches Tabellenformular' },
            { name: 'casefile-ko-intime-table', '-en': 'KoUI inTime Table', '-de': 'inTime Tabellenformular' },
            { name: 'casefile-ko-insight-table', '-en': 'KoUI inSight Table', '-de': 'inSight Tabellenformular' },
            { name: 'casefile-ko-incase-table', '-en': 'KoUI inCase Table', '-de': 'inCase Tabellenformular' },
            { name: 'casefile-ko-insuite-table', '-en': 'KoUI inSuite Table', '-de': 'inSuite Tabellenformular' },
            { name: 'casefile-ko-invoice-table', '-en': 'KoUI inVoice Table', '-de': 'inVoice Tabellenformular' },
            { name: 'casefile-ko-intouch-table', '-en': 'KoUI inTouch Table', '-de': 'inTouch Tabellenformular' },

            { name: 'casefile-telekardio-measurement', '-en': 'Telekardio measurement', '-de': 'Telekardio Messung' },
            { name: 'casefile-telekardio-process', '-en': 'Telekardio process', '-de': 'Telekardio Vorgang' },

            { name: 'labdata-chart', '-en': 'Labdata Chart', '-de': 'Labordaten Diagramm' },
            { name: 'insight-custom-report', '-en': 'inSight Custom Reports', '-de': 'inSight2 Eigene Reports' },

            { name: 'envelope-c6', '-en': 'C6 Envelope', '-de': 'C6 Umschlag' },
            { name: 'envelope-c5', '-en': 'C5 Envelope', '-de': 'C5 Umschlag' },
            { name: 'envelope-c4', '-en': 'C4 Envelope', '-de': 'C4 Umschlag' },
            { name: 'envelope-dl', '-en': 'DL Envelope', '-de': 'DL Umschlag' },

            { name: 'copy-cover-page', '-en': 'Copy cover page', '-de': 'Kopie Seite' },

            { name: 'inbackup-secret-key', '-en': 'inBackup Secret Key', '-de': 'inBackup Geheimer Schlüssel' },
            { name: 'instock-order', '-en': 'inStock Order', '-de': 'inStock Bestellung'},

            { name: 'medication-label', '-en': 'inCase Medication Label', '-de': 'inCase Medikamentenetikett' },
            { name: 'medication-info-tree', '-en': 'Medication information tree', '-de': 'Informationsbaum für Medikamente' }

        ];

        var formRolesDE = [

            { name: 'casefile-utility2', '-en': 'inCase Utility2 Form', '-de': 'inCase Heilmittel' },

            { name: 'casefile-logo', '-en': 'inCase Logo Form', '-de': 'inCase Logopädie' },
            { name: 'casefile-ergo', '-en': 'inCase Ergo Form', '-de': 'inCase Ergotherapie' },
            { name: 'casefile-physio', '-en': 'inCase Physio Form', '-de': 'inCase Physiotherapie' },

            { name: 'casefile-disability', '-en': 'inCase Disability Form', '-de': 'inCase Arbeitsunfähigkeit' },
            { name: 'casefile-referral', '-en': 'inCase Referral Form', '-de': 'inCase Überweisung' },

            { name: 'casefile-personalienfeld', '-en': 'inCase Person Record', '-de': 'inCase Personalienfeld' },
            { name: 'casefile-patientreciept', '-en': 'inCase Patient Recipt', '-de': 'inCase Patientquittung' },
            { name: 'casefile-patientreciept-daily', '-en': 'inCase Patient Receipt, single day', '-de': 'inCase Tagesbezogene Patientenquittung' },

            { name: 'casefile-kbvlogo', '-en': 'inCase KBV Heilmittel Logo Form', '-de': 'inCase KBV Heilmittel Logopädie' },
            { name: 'casefile-kbvergo', '-en': 'inCase KBV Heilmittel Ergo Form', '-de': 'inCase KBV Heilmittel Ergotherapie' },
            { name: 'casefile-kbvphysio', '-en': 'inCase KBV Heilmittel Physio Form', '-de': 'inCase KBV Heilmittel Physiotherapie' },

            { name: 'casefile-prescription-p', '-en': 'inCase P Prescription', '-de': 'inCase Privatrezept' },
            { name: 'casefile-prescription-kbv', '-en': 'inCase KBV Prescription', '-de': 'inCase Kassenrezept' },
            { name: 'casefile-prescription-hmv', '-en': 'inCase Prescription H', '-de': 'inCase Hilfsmittelrezept' },
            { name: 'casefile-prescription-g', '-en': 'inCase G Prescription', '-de': 'inCase Rezept G' },
            { name: 'casefile-prescription-t', '-en': 'inCase T Prescription', '-de': 'inCase Rezept T' },
            { name: 'casefile-prescription-btm', '-en': 'inCase BTM Prescription', '-de': 'inCase Rezept BTM' },

            { name: 'casefile-labrequest', '-en': 'inCase labrequest', '-de': 'inCase Laborschein' },
            { name: 'casefile-labrequest-l', '-en': 'inCase labrequest (L)', '-de': 'inCase Laborschein (L)' },
            { name: 'casefile-labrequest-a', '-en': 'inCase labrequest (A)', '-de': 'inCase Laborschein (A)' },

            { name: 'casefile-au', '-en': 'inCase AU', '-de': 'inCase AU' },
            { name: 'casefile-au-privat', '-en': 'inCase AU private', '-de': 'inCase AU privat' },

            { name: 'casefile-ingredientplan', '-en': 'inCase Ingredient Plan', '-de': 'inCase Wirkstoffplan' },

            { name: 'casefile-kbv-form-4', '-en': 'inCase KBV (4) Krankenbeförderung', '-de': 'inCase KBV (4) Krankenbeförderung' },
            { name: 'casefile-kbv-form-4-bfb', '-en': 'inCase KBV (4) Krankenbeförderung (BFB)', '-de': 'inCase KBV (4) Krankenbeförderung (BFB)' },

            { name: 'etermineservice-ptv11', '-en': 'eTermineservice PTV11', '-de': 'eTermineservice PTV11' },
            { name: 'etiquette', '-en': 'Etiquette', '-de': 'Etikett'}


        ];

        var formRolesCH = [
            //Swiss
            { name: 'casefile-au-privat-ch', '-en': 'inCase AUF private', '-de': 'inCase AUF privat' },
            { name: 'casefile-prescription-p-ch', '-en': 'inCase P Prescription', '-de': 'inCase Privatrezept' },
            { name: 'casefile-long-prescription', '-en': 'inCase Long prescription', '-de': 'inCase Dauerrezept' },
            { name: 'casefile-physio-ch', '-en': 'inCase Physio Form', '-de': 'inCase Physiotherapie' },
            { name: 'casefile-referral-ch', '-en': 'inCase Referral Form', '-de': 'inCase Überweisung' },
            { name: 'etiquette-ch', '-en': 'Etiquette', '-de': 'Etikett '}
        ];

        function displayCountryInTitle( formRoles, country ) {
            return formRoles.map(function( role ) {
                return {
                    name: role.name,
                    '-en': role['-en'] + " (" + country + ")",
                    '-de': role['-de'] + " (" + country + ")"
                };
            });
        }

        Object.defineProperty( Y.namespace( 'doccirrus' ), "formRoles", {
            get: function() {
                if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                    return formRolesCommon.concat( displayCountryInTitle(formRolesCH, 'CH'), formRolesDE );
                } else if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                    return formRolesCommon.concat( formRolesCH );
                } else {
                    return formRolesCommon.concat( formRolesDE );
                }
            }
        } );

        Y.namespace( 'doccirrus' ).getFormRole = function( actType, caseFolderType ) {
            var country = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderType || "ANY"];

            if( country === "CH" ) {
                return getKey( ObjectAssign( {}, formAssocCommon, formAssocCH, additionalForms ), actType );
            }

            return getKey( ObjectAssign( {}, formAssocCommon, formAssocDe, additionalForms ), actType );

            function getKey( map, value ) {
                var key;
                for( key in map ) {
                    if( map.hasOwnProperty( key ) ) {
                        if( map[key] === value ) {
                            return key;
                        }
                    }
                }
                return "";
            }
        };

        var formAssocCommon = {
            'casefile-invoice': 'INVOICE',
            'casefile-quote': 'QUOTATION',
            'casefile-docletter': 'DOCLETTER',
            'casefile-receipt': 'RECEIPT',
            'casefile-reminder': 'REMINDER',
            'casefile-warning-1': 'WARNING1',
            'casefile-warning-2': 'WARNING2',
            'casefile-credit-note': 'CREDITNOTE',
            'casefile-bad-debt': 'BADDEBT',
            'casefile-healthsurvey': 'HEALTHSURVEY',
            'casefile-gravidogram': 'GRAVIDOGRAMM',
            'casefile-meddata': 'MEDDATA',
            'casefile-checkupplan': 'CHECKUPPLAN',
            'casefile-structured-history': 'HISTORY',
            'casefile-surgery': 'SURGERY',
            'casefile-docletterdiagnosis': 'DOCLETTERDIAGNOSIS',
            'casefile-therapy': 'THERAPY',
            'casefile-medicationplan-table': 'MEDICATIONPLAN',
            'casefile-telekardio-measurement': 'MEASUREMENT',
            'casefile-telekardio-process': 'PROCESS'
        };

        var formAssocDe = {
            'casefile-utility2': 'KBVUTILITY2',
            'casefile-physio': 'UTILITY',
            'casefile-logo': 'UTILITY',
            'casefile-ergo': 'UTILITY',
            'casefile-kbvphysio': 'KBVUTILITY',
            'casefile-kbvlogo': 'KBVUTILITY',
            'casefile-kbvergo': 'KBVUTILITY',
            'casefile-referral': 'REFERRAL',
            'casefile-patientreciept': 'PUBRECEIPT',
            'casefile-patientreciept-daily': 'PUBRECEIPT',
            'casefile-prescription-p': 'PRIVPRESCR',
            'casefile-prescription-kbv': 'PUBPRESCR',
            'casefile-prescription-hmv': 'PRESASSISTIVE',
            'casefile-prescription-btm': 'PRESCRBTM',
            'casefile-prescription-g': 'PRESCRG',
            'casefile-prescription-t': 'PRESCRT',
            'casefile-labrequest': 'LABREQUEST',
            'casefile-labrequest-l': 'LABREQUEST',
            'casefile-labrequest-a': 'LABREQUEST',
            'casefile-au': 'AU',
            'casefile-au-privat': 'AU',
            'casefile-ingredientplan': 'INGREDIENTPLAN',
            'casefile-medicationplan-table': 'KBVMEDICATIONPLAN'
        };

        var formAssocCH = {
            //Swiss
            'casefile-au-privat-ch': 'AU',
            'casefile-prescription-p-ch': 'PRIVPRESCR',
            'casefile-physio-ch': 'UTILITY',
            'casefile-referral-ch': 'REFERRAL',
            'casefile-long-prescription': 'LONGPRESCR'
        };

        var additionalForms = {};
        //  map activity types to form roles

        Y.namespace( 'doccirrus' ).formAssoc = Object.assign( {}, formAssocCommon, formAssocDe, formAssocCH);

        if( !Y.doccirrus.auth.isPatientPortal() && Y.doccirrus.auth.hasModuleAccess( 'InStockMojit' ) ) {
            additionalForms['medication-label'] = "MEDICATION";
            Y.namespace( 'doccirrus' ).formAssoc = Object.assign(Y.namespace( 'doccirrus' ).formAssoc, additionalForms );
        }

    },
    '0.0.1',
    {
        requires: []
    }
);