/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI*/

'use strict';

YUI.add( 'insight2-schema', function( Y, NAME ) {

        var
            // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {},
            visibilityTypes = Object.freeze( {
                USER: 'USER',
                SUPERUSER: 'SUPERUSER',
                PHYSICIAN: 'PHYSICIAN',
                CONTROLLER: 'CONTROLLER',
                ADMIN: 'ADMIN'
            } ),
            containers = Object.freeze( {
                IN_SIGHT_MY_REPORTS_TAB: 'inSightMyReportsTab',
                // PATIENT_GADGET: 'patientGadget',
                INVOICE_REPORTS: 'invoiceReports',
                CALENDAR_REPORTS: 'calendarReports',
                IN_CASE_REPORTS: 'inCaseReports'
            } );

        function createSchemaVisibilityList() {
            var
                result = [];
            Object.keys( visibilityTypes ).forEach( function( type ) {
                result.push( {
                    val: visibilityTypes[type],
                    i18n: i18n( 'insight2-schema.VisibilityType_E.' + visibilityTypes[type] + '.i18n' ),
                    '-en': i18n( 'insight2-schema.VisibilityType_E.' + visibilityTypes[type] + '.i18n' ),
                    '-de': i18n( 'insight2-schema.VisibilityType_E.' + visibilityTypes[type] + '.i18n' )
                } );
            } );

            return result;
        }

        types = Y.mix( types, {
                "root": {
                    base: {
                        "complex": "ext",
                        "type": "inSight2_T",
                        "lib": types
                    }
                },
                "inSight2_T": {
                    "hideSummaryRow": {
                        "type": "Boolean",
                        i18n: i18n( 'insight2-schema.inSight2_T.notVisibleAtSummaryRow.i18n' ),
                        "-en": "notVisibleAtSummaryRow",
                        "-de": "notVisibleAtSummaryRow"
                    },
                    "displayFields": {
                        "type": "any",
                        validate: "serialport_T_path",
                        i18n: i18n( 'insight2-schema.inSight2_T.displayFields.i18n' ),
                        "-en": "displayFields",
                        "-de": "displayFields"
                    },
                    "filterElements": {
                        "default": false,
                        "type": "any",
                        i18n: i18n( 'insight2-schema.inSight2_T.query.i18n' ),
                        "-en": "query",
                        "-de": "query"
                    },
                    "filterNotElements": {
                        "default": false,
                        "type": "any",
                        i18n: i18n( 'insight2-schema.inSight2_T.query.i18n' ),
                        "-en": "query",
                        "-de": "query"
                    },
                    "csvFilename": {
                        "default": "Table",
                        "type": "String",
                        i18n: i18n( 'insight2-schema.inSight2_T.name.i18n' ),
                        "-en": "csvFilename",
                        "-de": "csvFilename"
                    },
                    "country": {
                        "default": [],
                        "type": [String],
                        i18n: i18n( 'insight2-schema.inSight2_T.country.i18n' ),
                        "-en": "country",
                        "-de": "country"
                    },
                    "aggregatePipeline": {
                        "type": "String",
                        i18n: i18n( 'insight2-schema.inSight2_T.aggregatePipeline.i18n' ),
                        "-en": "aggregatePipeline",
                        "-de": "aggregatePipeline"
                    },
                    "isExpertModeActive": {
                        "default": false,
                        "type": "Boolean",
                        i18n: i18n( 'insight2-schema.inSight2_T.isExpertModeActive.i18n' ),
                        "-en": "isExpertModeActive",
                        "-de": "isExpertModeActive"
                    },
                    "visibility": {
                        complex: 'eq',
                        type: 'Group_E',
                        lib: 'employee'
                    },
                    "groupBy": {
                        "type": "object",
                        i18n: i18n( 'insight2-schema.inSight2_T.groupBy.i18n' ),
                        "-en": "Group by",
                        "-de": "Group by"
                    },
                    "formId": {
                        "type": "String",
                        i18n: i18n( 'insight2-schema.inSight2_T.formId.i18n' ),
                        "-en": "Form ID",
                        "-de": "Formular ID"
                    },
                    "container": {
                        "type": "Any",
                        i18n: i18n( 'insight2-schema.inSight2_T.container.i18n' ),
                        "-en": "container",
                        "-de": "container"
                    },
                    "predefined": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'insight2-schema.inSight2_T.predefined.i18n' ),
                        "-en": "Predefined",
                        "-de": "Predefined"
                    },
                    "forContainer": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'insight2-schema.inSight2_T.forContainer.i18n' ),
                        "-en": "forContainer",
                        "-de": "forContainer"
                    },
                    "groupVisibility": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'insight2-schema.inSight2_T.groupVisibility.i18n' ),
                        "-en": "groupVisibility",
                        "-de": "groupVisibility"
                    },
                    "pipeline": {
                        "type": "Any",
                        i18n: i18n( 'insight2-schema.inSight2_T.pipeline.i18n' ),
                        "-en": "Pipeline",
                        "-de": "Pipeline"
                    },
                    "sideTables": {
                        "type": "Any",
                        i18n: i18n( 'insight2-schema.inSight2_T.sideTables.i18n' ),
                        "-en": "sideTables",
                        "-de": "sideTables"
                    },
                    "dateSettings": {
                        "type": "Any",
                        i18n: i18n( 'insight2-schema.inSight2_T.dateSettings.i18n' ),
                        "-en": "dateSettings",
                        "-de": "dateSettings"
                    },
                    "countryMode": {
                        "complex": "eq",
                        "type": "CountryMode_E",
                        "validate": "Company_T_countryMode",
                        "lib": types
                    },
                    "serialLetter": {
                        "type": "Boolean",
                        i18n: i18n( 'insight2-schema.inSight2_T.notVisibleAtSummaryRow.i18n' ),
                        "-en": "notVisibleAtSummaryRow",
                        "-de": "notVisibleAtSummaryRow"
                    },
                    "serialEmail": {
                        "type": "Boolean",
                        i18n: i18n( 'insight2-schema.inSight2_T.notVisibleAtSummaryRow.i18n' ),
                        "-en": "notVisibleAtSummaryRow",
                        "-de": "notVisibleAtSummaryRow"
                    }
                },
                Visibility_E: {
                    type: 'String',
                    "default": visibilityTypes.USER,
                    list: createSchemaVisibilityList(),
                    i18n: i18n( 'insight2-schema.VisibilityType_E.i18n' ),
                    '-en': i18n( 'insight2-schema.VisibilityType_E.i18n' ),
                    '-de': i18n( 'insight2-schema.VisibilityType_E.i18n' )
                },
                Container_E: {
                    type: 'String',
                    list: [
                        {
                            val: containers.IN_SIGHT_MY_REPORTS_TAB,
                            '-de': 'inSightMyReportsTab',
                            i18n: i18n( 'insight2-schema.Container_E.IN_SIGHT_MY_REPORTS_TAB.i18n' ),
                            '-en': 'inSightMyReportsTab'
                        },
                        /*{
                            val: containers.PATIENT_GADGET,
                            '-de': 'Komponente',
                            i18n: i18n( 'GadgetBase.gadget' ),
                            '-en': 'Component'
                        },*/
                        {
                            val: containers.INVOICE_REPORTS,
                            '-de': 'Abrechnung',
                            i18n: i18n( 'top_menu.LBL_MENU_INVOICE' ),
                            '-en': 'Invoice'
                        },
                        {
                            val: containers.CALENDAR_REPORTS,
                            '-de': 'Kalender',
                            i18n: i18n( 'top_menu.LBL_MENU_CALENDAR' ),
                            '-en': 'Calendar'
                        },
                        {
                            val: containers.IN_CASE_REPORTS,
                            '-de': 'Patienten',
                            i18n: i18n( 'top_menu.LBL_MENU_PATIENTS' ),
                            '-en': 'Patients'
                        }
                    ],
                    i18n: i18n( 'insight2-schema.Container_E.i18n' ),
                    '-en': i18n( 'insight2-schema.Container_E.i18n' ),
                    '-de': i18n( 'insight2-schema.Container_E.i18n' )
                },
                "CountryMode_E": {
                    "type": ["String"],
                    "default": ["D"],
                    i18n: i18n( 'customer-schema.base.countryMode.i18n' ),
                    "-en": "Länder Modus",
                    "-de": "Country Mode",
                    "list": [
                        {
                            "val": "D",
                            i18n: i18n( 'customer-schema.CountryMode_E.D' )
                        },
                        {
                            "val": "CH",
                            i18n: i18n( 'customer-schema.CountryMode_E.CH' )
                        }
                    ]
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        Y.namespace( 'doccirrus.schemas' )[NAME] = {
            types: types,
            visibilityTypes: visibilityTypes,
            defaultItems: [],
            name: NAME
        };
        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'countrymode-schema'
        ]
    } );