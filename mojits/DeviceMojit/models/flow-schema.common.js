/**
 * User: pi
 * Date: 13/08/2015  10:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'flow-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module flow-schema
         */

        var

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n,
            regions = Object.freeze( {
                'Schä': 'Schädel',
                'HWS': 'Halswirbelsäule',
                'BWS': 'Brustwirbelsäule',
                'HTh': 'knöcherne Thoraxhälfte',
                'BLÜ': 'BWS-LWS-Übergang',
                'LWS': 'Lendenwirbelsäule',
                'Sac': 'Kreuzbein',
                'StB': 'Steißbein',
                'BÜS': 'Becken Übersicht',
                'Sch': 'Schultergelenk',
                'ACG': 'Acromioclaviculargelenk',
                'Cla': 'Clavicula',
                'OA': 'Oberarm',
                'EB': 'Ellbogengelenk',
                'UA': 'Unterarm',
                'HG': 'Handgelenk',
                'Ha': 'Hand',
                'D1': 'Daumen',
                'D2': 'Zeigefinger',
                'D3': 'Mittelfinger',
                'D4': 'Ringfinger',
                'D5': 'Kleinfinger',
                'Hü': 'Hüftgelenk',
                'OS': 'Oberschenkel',
                'KG': 'Kniegelenk',
                'Pa': 'Patella',
                'US': 'Unterschenkel',
                'OSG': 'Oberes Sprunggelenk',
                'Fu': 'Fuß',
                'MRF': 'Mittel-Rückfuß',
                'Cal': 'Calcaneus',
                'VF': 'Vorfuß',
                'Z1': 'Großzeh',
                'Z2': '2. Zeh',
                'Z3': '3. Zeh',
                'Z4': '4. Zeh',
                'Z5': '5. Zeh'
            } ),
            sides = Object.freeze( {
                'r': 'Rechts',
                'l': 'Links',
                'b': 'Beidseits'
            } ),
            methods = Object.freeze( {
                '2': 'in 2 Ebenen',
                '3': 'in 3 Ebenen',
                'ap': 'ap',
                'apE': 'pa im Einbeinstand',
                'IR': 'ap in Innenrotation (Sch)',
                'AR': 'ap in Außenrotation (Sch)',
                'View': 'Schulter V-View',
                's': 'seitlich',
                'VN': 'Aufnahme in Vorneige',
                'RN': 'Aufnahme in Rückneige',
                'sä': 'schräg',
                'Lau': 'LAUENSTEIN Aufn. Hüfte',
                'sär': 'schräg rechts anliegend',
                'säl': 'schräg links anliegend',
                'ta': 'tangential',
                'Def': 'Defilée Aufnah. 30/60/90°',
                'ax': 'axial',
                'Fri': 'Tunnelaufnahme n FRICK',
                '20°': '20° gekippte Röhre',
                'geh': 'gehaltene Aufnahme',
                'UD': 'ap in Ulnarduktion (HG)',
                'RD': 'ap in Radialduktion (HG)',
                'Zug': 'Aufnahme unter Zug',
                'lA': 'Lange Aufnahme',
                'Gew': 'mit Gewicht',
                'ttho': 'transthorakal',
                'Ste': 'im Stehen'
            } ),
            resourceTypes = Y.doccirrus.schemas.v_flowsource.resourceTypes,
            transformerTypes = Object.freeze( {
                DICOM: 'DICOM',
                JSON_BDT: 'JSON_BDT',
                GDT_JSON: 'GDT_JSON',
                GDTSTUDY: 'GDTSTUDY',
                GDTPATIENT: 'GDTPATIENT',
                GDTVIEW: 'GDTVIEW',
                MEDIA_IMPORT: 'MEDIA_IMPORT',
                LDT_UPLOAD: 'LDT_UPLOAD',
                LDT_TRANSACTION: 'LDT_TRANSACTION',
                LDT_TRANSACTION_EXTENDED: 'LDT_TRANSACTION_EXTENDED',
                OSIRIX: 'OSIRIX',
                BESR: 'BESR',
                HL7_LDT_JSON: 'HL7_LDT_JSON',
                MEDIPORT_RES: 'MEDIPORT_RES',
                OPHTHALMOLOGY_TMP_IMPORT: 'OPHTHALMOLOGY_TMP_IMPORT'
            } ),
            flowTypes = Object.freeze( {
                US: 'US',
                GDT: 'GDT',
                LDT: 'LDT',
                HL7: 'HL7',
                XDTSERIAL: 'XDTSERIAL',
                XRAY: 'XRAY',
                MEDIA_IMPORT: 'MEDIA_IMPORT',
                LAUNCHER: 'LAUNCHER',
                KVG: 'KVG',
                OT_TMP_IMPORT: 'OT_TMP_IMPORT'
            } );

        function createSchemaFlowTypeList() {
            var
                result = [];
            Object.keys( flowTypes ).forEach( function( type ) {
                result.push( {
                    val: flowTypes[type],
                    i18n: i18n( 'flow-schema.FlowType_E.' + flowTypes[type] + '.i18n' ),
                    '-en': type,
                    '-de': type
                } );
            } );

            return result;
        }

        function createSchemaTransformerList() {
            var
                result = [];
            Object.keys( transformerTypes ).forEach( function( type ) {
                result.push( {
                    val: transformerTypes[type],
                    i18n: i18n( 'flow-schema.TransformerType_E.' + transformerTypes[type] + '.i18n' ),
                    '-en': type,
                    '-de': type
                } );
            } );
            return result;
        }

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'Flow_T',
                        lib: types
                    }
                },
                Flow_T: {
                    title: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Flow_T.title.i18n' ),
                        trim: true
                    },
                    flowType: {
                        complex: 'eq',
                        type: 'FlowType_E',
                        lib: types
                    },
                    sources: {
                        complex: 'inc',
                        type: 'Source_T',
                        lib: types,
                        i18n: i18n( 'flow-schema.Flow_T.sources.i18n' )
                    },
                    transformers: {
                        complex: 'inc',
                        type: 'Transformer_T',
                        lib: types,
                        i18n: i18n( 'flow-schema.Flow_T.transformers.i18n' )
                    },
                    sinks: {
                        complex: 'inc',
                        type: 'Sink_T',
                        lib: types,
                        i18n: i18n( 'flow-schema.Flow_T.sinks.i18n' )
                    }
                },
                FlowType_E: {
                    type: 'String',
                    required: true,
                    list: createSchemaFlowTypeList(),
                    i18n: i18n( 'flow-schema.FlowType_E.i18n' )
                },
                TransformerType_E: {
                    type: 'String',
                    required: true,
                    list: createSchemaTransformerList(),
                    i18n: i18n( 'flow-schema.TransformerType_E.i18n' )
                },
                OpTmpFileRow_T: {
                    rowNumber: {
                        type: 'Number',
                        i18n: i18n( 'flow-schema.OpTmpFileRow_T.rowNumber' )
                    },
                    label: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.OpTmpFileRow_T.label' )
                    }
                },
                GDTMappingRow_T: {
                    gdtFieldNumber: {
                        type: 'String',
                        default: '',
                        validate: 'GDTMappingRow_T_gdtFieldNumber',
                        i18n: i18n( 'flow-schema.GDTMappingRow_T.gdtFieldNumber' )
                    },
                    gdtMappingRegexString: {
                        type: 'String',
                        default: '',
                        validate: 'mandatory',
                        i18n: i18n( 'flow-schema.GDTMappingRow_T.gdtMappingRegexString' )
                    },
                    gdtMappingAction: {
                        complex: 'eq',
                        type: 'GdtMappingAction_E',
                        lib: types,
                        i18n: i18n( 'flow-schema.GdtMappingAction_E.gdtMappingAction' )
                    }
                },
                GdtMappingAction_E: {
                    type: "String",
                    default: "createTreatment",
                    list: [
                        {
                            val: "createTreatment",
                            i18n: i18n( 'InCaseMojit.casefile_browser.new.menuitem.SERVICE' )
                        },
                        {
                            val: "createDiagnosis",
                            i18n: i18n( 'InCaseMojit.casefile_browser.new.menuitem.DIAGNOSIS' )
                        }
                    ]
                },
                InternalExternalLabTreatmentsConfig_T: {
                    labName: {
                        type: 'String',
                        default: '',
                        validate: 'mandatory',
                        i18n: i18n( 'flow-schema.InternalExternalLabTreatmentsConfig_T.labName' )
                    },
                    type: {
                        complex: 'eq',
                        type: 'InternalExternalLabTreatmentsMapping_E',
                        lib: types,
                        i18n: i18n( 'flow-schema.InternalExternalLabTreatmentsMapping_E.type' )
                    }
                },
                InternalExternalLabTreatmentsMapping_E: {
                    type: 'String',
                    default: 'internal',
                    list: [
                        {
                            val: 'internal',
                            i18n: i18n( 'flow-schema.InternalExternalLabTreatmentsMapping_E.internal' )
                        },
                        {
                            val: 'external',
                            i18n: i18n( 'flow-schema.InternalExternalLabTreatmentsMapping_E.external' )
                        }
                    ]
                },
                Transformer_T: {
                    transformerType: {
                        complex: 'eq',
                        type: 'TransformerType_E',
                        lib: types
                    },
                    name: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.name' )
                    },
                    base_GDT_JSON_T: {
                        complex: 'ext',
                        type: 'GDT_JSON_T',
                        lib: types
                    },
                    base_DICOM_T: {
                        complex: 'ext',
                        type: 'DICOM_T',
                        lib: types
                    },
                    base_JSON_BDT_T: {
                        complex: 'ext',
                        type: 'JSON_BDT_T',
                        lib: types
                    },
                    base_GDTSTUDY_T: {
                        complex: 'ext',
                        type: 'GDTSTUDY_T',
                        lib: types
                    },
                    base_GDTPATIENT_T: {
                        complex: 'ext',
                        type: 'GDTPATIENT_T',
                        lib: types
                    },
                    base_GDTVIEW_T: {
                        complex: 'ext',
                        type: 'GDTVIEW_T',
                        lib: types
                    },
                    base_MEDIA_IMPORT_T: {
                        complex: 'ext',
                        type: 'MEDIA_IMPORT_T',
                        lib: types
                    },
                    base_LDT_UPLOAD_T: {
                        complex: 'ext',
                        type: 'LDT_UPLOAD_T',
                        lib: types
                    },
                    base_LDT_TRANSACTION_T: {
                        complex: 'ext',
                        type: 'LDT_TRANSACTION_T',
                        lib: types
                    },
                    base_LDT_TRANSACTION_EXTENDED_T: {
                        complex: 'ext',
                        type: 'LDT_TRANSACTION_EXTENDED_T',
                        lib: types
                    },
                    base_OSIRIX_T: {
                        complex: 'ext',
                        type: 'OSIRIX_T',
                        lib: types
                    },
                    base_BESR_T: {
                        complex: 'ext',
                        type: 'BESR_T',
                        lib: types
                    },
                    base_HL7_LDT_JSON_T: {
                        complex: 'ext',
                        type: 'HL7_LDT_JSON_T',
                        lib: types
                    },
                    base_MEDIPORT_RES_T: {
                        complex: 'ext',
                        type: 'MEDIPORT_RES_T',
                        lib: types
                    },
                    base_OPHTHALMOLOGY_TMP_IMPORT_T: {
                        complex: 'ext',
                        type: 'OPHTHALMOLOGY_TMP_IMPORT_T',
                        lib: types
                    }
                },
                SourceSink_T: {
                    base_Source_T: {
                        complex: 'ext',
                        type: 'base_Source_T',
                        lib: 'v_flowsource'
                    },
                    base_SerialDevice_T: {
                        complex: 'ext',
                        type: 'base_SerialDevice_T',
                        lib: 'serialdevice'
                    },
                    base_File_T: {
                        complex: 'ext',
                        type: 'base_File_T',
                        lib: 'file'
                    },
                    base_Database_T: {
                        complex: 'ext',
                        type: 'base_Database_T',
                        lib: 'database'
                    },
                    base_Mediport_T: {
                        complex: 'ext',
                        type: 'base_Mediport_T',
                        lib: 'mediport'
                    },
                    base_Event_T: {
                        complex: 'ext',
                        type: 'base_Event_T',
                        lib: 'v_event'
                    }
                },
                Sink_T: {
                    base: {
                        complex: 'ext',
                        type: 'SourceSink_T',
                        lib: types
                    }
                },
                Source_T: {
                    base: {
                        complex: 'ext',
                        type: 'SourceSink_T',
                        lib: types
                    }

                },
                GDT_JSON_T: {
                    softValidation: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.subType' )
                    },
                    gdtVersion: {
                        type: String,
                        i18n: i18n( 'flow-schema.Transformer_T.gdtVersion' )
                    },
                    mapSubtype: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.mapSubtype' )
                    },
                    subtypeToMap: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.mapSubtype.placeholder' )
                    },
                    deleteAttachments: {
                        type: Boolean,
                        i18n: i18n( 'flow-schema.Transformer_T.mapSubtype' )
                    },
                    forceCreateNewActivity: {
                        type: Boolean,
                        i18n: i18n( 'flow-schema.Transformer_T.forceCreateNewActivityMsg' )
                    },
                    gdtMappingsForUnknownFields: {
                        complex: 'inc',
                        type: 'GDTMappingRow_T',
                        lib: types,
                        i18n: i18n( 'flow-schema.Transformer_T.gdtMappingsForUnknownFields' )
                    },
                    gdtUseLastChangedActivity: {
                        type: Boolean,
                        default: true,
                        i18n: i18n( 'flow-schema.GDT_JSON_T.gdtUseLastChangedActivity' )
                    }
                },
                JSON_BDT_T: {
                    showOriginalId: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.removeZerosFromIdMsg' )
                    }
                },
                GDTSTUDY_T: {
                    showOriginalId: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.removeZerosFromIdMsg' )
                    },
                    gdtVersion: {
                        type: String,
                        i18n: i18n( 'flow-schema.Transformer_T.gdtVersion' )
                    },
                    gdtEncoding: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.gdtEncoding' )
                    },
                    gdtSender: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.gdtSender' )
                    },
                    gdtReceiver: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.gdtReceiver' )
                    },
                    procedure: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.procedure' )
                    },
                    exportMedData: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.exportMedData' ),
                        default: false
                    },
                    exportDiagnosis: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.exportDiagnosis' ),
                        default: false
                    }
                },
                GDTPATIENT_T: {
                    showOriginalId: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.removeZerosFromIdMsg' )
                    },
                    gdtVersion: {
                        type: String,
                        i18n: i18n( 'flow-schema.Transformer_T.gdtVersion' )
                    },
                    gdtEncoding: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.gdtEncoding' )
                    },
                    gdtSender: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.gdtSender' )
                    },
                    gdtReceiver: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.gdtReceiver' )
                    },
                    exportMedData: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.exportMedData' ),
                        default: false
                    },
                    mapBSNR: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.mapBSNR' ),
                        default: false
                    },
                    mapBSNRTo: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.mapBSNRTo' ),
                        default: '0201'
                    },
                    mapCaseFolderId: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.mapCaseFolderId' ),
                        default: false
                    },
                    mapCaseFolderIdTo: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.mapCaseFolderIdTo' ),
                        default: '8310'
                    },
                    mapEmployeeId: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.mapEmployeeId' ),
                        default: false
                    },
                    mapEmployeeIdTo: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.mapEmployeeIdTo' ),
                        default: '8990'
                    },
                    mapResponsibleDoctor: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.mapResponsibleDoctor' ),
                        default: false
                    },
                    mapResponsibleDoctorTo: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.mapResponsibleDoctorTo' ),
                        default: '8491'
                    },
                    mapPatientLocationAddon: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.mapPatientLocationAddon' ),
                        default: false
                    },
                    mapPatientLocationAddonTo: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.mapPatientLocationAddonTo' ),
                        default: '3115'
                    }
                },
                GDTVIEW_T: {
                    showOriginalId: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.removeZerosFromIdMsg' )
                    },
                    gdtEncoding: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.gdtEncoding' )
                    }
                },
                MEDIA_IMPORT_T: {
                    hours: {
                        type: 'Number',
                        default: 4,
                        i18n: i18n( 'flow-schema.Transformer_T.hours' )
                    },
                    subType: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.subType' )
                    },
                    fileNameMap: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.fileNameMap' )
                    }
                },
                LDT_UPLOAD_T: {
                    softValidation: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.subType' )
                    },
                    checkFileWithLdkPm: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.checkFileWithLdkPm' )
                    },
                    timeRange: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.timeRange' )
                    },
                    timeRangeDays: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.timeRangeDays' ),
                        default: '30'
                    },
                    useAddInfoForId: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.useAddInfoForId' )
                    },
                    useAddInfoForIdFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.useAddInfoForId' ),
                        default: '8310'
                    },
                    billingFlag: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.billingFlag' )
                    },
                    disallowGkvBilling: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.disallowGkvBilling' ),
                        default: false
                    },
                    allowGkvBilling: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.allowGkvBilling' )
                    },
                    useDataFromLabrequestIfPresent: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.useDataFromLabrequestIfPresent' ),
                        default: false
                    },
                    specialMatchSource: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.subType' )
                    },
                    specialMatchActivityField: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.subType' )
                    },
                    specialMatchDays: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.subType' )
                    },
                    specialMatchActivityType: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.subType' )
                    }
                },
                LDT_TRANSACTION_T: {
                    ldtVersion: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.ldtVersion' )
                    }
                },
                LDT_TRANSACTION_EXTENDED_T: {
                    ldtVersion: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.ldtVersion' )
                    },
                    treatmentType: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.treatmentType' ),
                        default: '1'
                    },
                    treatmentTypeSel: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.treatmentTypeSel' ),
                        default: true
                    },
                    treatmentTypeFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.treatmentTypeFK' ),
                        default: '4221'
                    },
                    patientHeightInCm: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.patientHeightInCm' ),
                        default: true
                    },
                    patientHeightInCmFK: {
                        default: '3622',
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.patientHeightInCm' )
                    },
                    patientWeightInKg: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.patientWeightInKg' ),
                        default: true
                    },
                    patientWeightInKgFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.patientWeightInKg' ),
                        default: '3623'
                    },
                    patientPregnancy: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.patientPregnancy' ),
                        default: true
                    },
                    patientPregnancyFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.patientPregnancy' ),
                        default: '8510'
                    },
                    patientPregnancyGestationLength: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.patientPregnancyGestationLength' ),
                        default: true
                    },
                    patientPregnancyGestationLengthFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.patientPregnancyGestationLength' ),
                        default: '8511'
                    },
                    diagnosisSuspected: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.diagnosisSuspected.label' ),
                        default: true
                    },
                    diagnosisSuspectedFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.diagnosisSuspected' ),
                        default: '4207'
                    },
                    ICDCode: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.ICDCode' ),
                        default: true
                    },
                    ICDCodeFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.ICDCode' ),
                        default: '6001'
                    },
                    diagnosisCertainty: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.diagnosisCertainty' ),
                        default: true
                    },
                    diagnosisCertaintyFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.diagnosisCertainty' ),
                        default: '6003'
                    },
                    diagnosisLoc: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.diagnosisLoc' ),
                        default: true
                    },
                    diagnosisLocFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.diagnosisLoc' ),
                        default: '6004'
                    },
                    diagnosisDesc: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.diagnosisDesc' ),
                        default: true
                    },
                    diagnosisDescFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.diagnosisDesc' ),
                        default: '6006'
                    },
                    diagnosisExceptionDesc: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.diagnosisExceptionDesc' ),
                        default: true
                    },
                    diagnosisExceptionDescFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.diagnosisExceptionDesc' ),
                        default: '6008'
                    },
                    initiatorBSNR: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.initiatorBSNR' ),
                        default: true
                    },
                    initiatorBSNRFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.initiatorBSNR' ),
                        default: '4217'
                    },
                    initiatorLANR: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.initiatorLANR' ),
                        default: true
                    },
                    initiatorLANRFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.initiatorLANR' ),
                        default: '4241'
                    },
                    refBSNR: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.refBSNR' ),
                        default: true
                    },
                    refBSNRFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.refBSNR' ),
                        default: '4218'
                    },
                    selectedRefBSNR: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.ldtVersion' ),
                        default: 'Kein'
                    },
                    refLANR: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.refLANR' ),
                        default: true
                    },
                    refLANRFK: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.refLANR' ),
                        default: '4242'
                    },
                    selectedRefLANR: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.ldtVersion' ),
                        default: 'Kein'
                    }
                },
                OSIRIX_T: {
                    modality: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.modality' )
                    }
                },
                BESR_T: {

                },
                HL7_LDT_JSON_T: {
                    hl7CreateTreatments: {
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.hl7CreateTreatments' ),
                        default: true
                    },
                    internalExternalLabTreatments: {
                        complex: 'inc',
                        type: 'InternalExternalLabTreatmentsConfig_T',
                        lib: types,
                        i18n: i18n( 'flow-schema.InternalExternalLabTreatmentsConfig_T.headerText' )
                    }
                },
                MEDIPORT_RES_T: {

                },
                OPHTHALMOLOGY_TMP_IMPORT_T: {
                    mappingTmpFileRows: {
                        complex: 'inc',
                        type: ['OpTmpFileRow_T'],
                        lib: types,
                        i18n: i18n( 'flow-schema.Transformer_T.mappingTmpFileRows' )
                    },
                    tmpFileType: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.tmpFileType' )
                    },
                    tmpFileTypeDescription: {
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.tmpFileTypeDescription' )
                    }
                },
                DICOM_T: {}
            }
        );

        function getSources() {
            var sources = [
                {
                    name: i18n( 'flow-schema.ResourceType_E.' + resourceTypes.FILE + '.i18n' ),
                    resourceType: resourceTypes.FILE,
                    __polytype: 'file'
                },
                {
                    name: i18n( 'flow-schema.ResourceType_E.' + resourceTypes.DATABASE + '.i18n' ),
                    resourceType: resourceTypes.DATABASE,
                    __polytype: 'database'
                },
                {
                    name: i18n( 'flow-schema.ResourceType_E.' + resourceTypes.XDTSERIAL + '.i18n' ),
                    resourceType: resourceTypes.XDTSERIAL,
                    __polytype: 'serialdevice'
                }
            ];
            return sources;
        }

        function getSinks() {
            var
                sinks = [
                    {
                        name: i18n( 'flow-schema.ResourceType_E.' + resourceTypes.FILE + '.i18n' ),
                        resourceType: resourceTypes.FILE,
                        __polytype: 'file'
                    },
                    {
                        name: i18n( 'flow-schema.ResourceType_E.' + resourceTypes.DATABASE + '.i18n' ),
                        resourceType: resourceTypes.DATABASE,
                        __polytype: 'database'
                    },
                    {
                        name: 'Mediport',
                        resourceType: resourceTypes.MEDIPORT,
                        __polytype: 'mediport'

                    },
                    {
                        name: i18n( 'flow-schema.ResourceType_E.' + resourceTypes.XDTSERIAL + '.i18n' ),
                        resourceType: resourceTypes.XDTSERIAL,
                        __polytype: 'serialdevice'
                    },
                    {
                        name: i18n( 'flow-schema.ResourceType_E.' + resourceTypes.EVENT + '.i18n' ),
                        resourceType: resourceTypes.EVENT,
                        __polytype: 'v_event'
                    }
                ];
            return sinks;
        }

        function getTransformers() {
            var
                transformers = [],
                blackList = [transformerTypes.DICOM];
            Object.keys( transformerTypes ).forEach( function( type ) {
                if( -1 !== blackList.indexOf( type ) ) {
                    return;
                }
                transformers.push( {
                    name: i18n( 'flow-schema.TransformerType_E.' + type + '.i18n' ),
                    transformerType: type
                } );
            } );
            return transformers;
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );
        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            /**
             * @property name
             * @type {String}
             * @default flow
             * @protected
             */
            name: NAME,

            /**
             * @property transformerTypes
             * @type {Object}
             */
            transformerTypes: transformerTypes,
            /**
             * @property flowTypes
             * @type {Object}
             */
            flowTypes: flowTypes,
            /**
             * @property regions
             * @type {Object}
             */
            regions: regions,
            /**
             * @property sides
             * @type {Object}
             */
            sides: sides,
            /**
             * @property methods
             * @type {Object}
             */
            methods: methods,

            getSources: getSources,
            getSinks: getSinks,
            getTransformers: getTransformers
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'v_flowsource-schema',
            'serialdevice-schema',
            'file-schema',
            'database-schema',
            'mediport-schema',
            'v_event-schema'
        ]
    }
);
