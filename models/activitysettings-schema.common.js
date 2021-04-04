/*globals YUI, _ */

YUI.add( 'activitysettings-schema', function( Y, NAME ) {

        'use strict';

        var
            MAIN_ID = '000000000000000000000001',
            i18n = Y.doccirrus.i18n,
            types = {};

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "ActivitySettings_T",
                        "lib": types
                    }
                },
                "ActivitySetting_T": {
                    "actType": {
                        "complex": "eq",
                        "type": "Activity_E",
                        "lib": "activity"
                    },
                    "color": {
                        "type": "String",
                        i18n: i18n( 'activitysettings-schema.ActivitySetting_T.color.i18n' ),
                        "-en": "activity color",
                        "-de": "activity color"
                    },
                    "isVisible": {
                        "type": "Boolean",
                        i18n: i18n( 'activitysettings-schema.ActivitySetting_T.isVisible.i18n' ),
                        "-en": "activity visiblity",
                        "-de": "activity visibility"
                    },
                    "functionality": {
                        "type": "String",
                        i18n: i18n( 'activitysettings-schema.ActivitySetting_T.functionality.i18n' ),
                        "-en": "functionality",
                        "-de": "functionality"
                    },
                    "userContent": {
                        "type": "String",
                        i18n: i18n( 'activitysettings-schema.ActivitySetting_T.userContent.i18n' ),
                        "-en": i18n( 'activitysettings-schema.ActivitySetting_T.userContent.i18n' ),
                        "-de": i18n( 'activitysettings-schema.ActivitySetting_T.userContent.i18n' )
                    },
                    "maxMedicationAmount": {
                        "type": "Number",
                        i18n: i18n( 'activitysettings-schema.ActivitySetting_T.maxMedicationAmount.i18n' )
                    },
                    "schein": {
                        "type": "Boolean",
                        i18n: i18n( 'activitysettings-schema.ActivitySetting_T.schein.i18n' ),
                        "-en": i18n( 'activitysettings-schema.ActivitySetting_T.schein.i18n' ),
                        "-de": i18n( 'activitysettings-schema.ActivitySetting_T.schein.i18n' )
                    },
                    "showPrintCount": {
                        "type": "Boolean",
                        i18n: i18n( 'activitysettings-schema.ActivitySetting_T.showPrintCount.i18n' ),
                        "-en": i18n( 'activitysettings-schema.ActivitySetting_T.showPrintCount.i18n' ),
                        "-de": i18n( 'activitysettings-schema.ActivitySetting_T.showPrintCount.i18n' )
                    },
                    "subTypes": {
                        "type": [String],
                        i18n: i18n( 'activitysettings-schema.ActivitySetting_T.subTypes.i18n' ),
                        "-en": i18n( 'activitysettings-schema.ActivitySetting_T.subTypes.i18n' ),
                        "-de": i18n( 'activitysettings-schema.ActivitySetting_T.subTypes.i18n' )
                    },
                    "useWYSWYG": {
                        "type": "Boolean",
                        i18n: i18n( 'activitysettings-schema.ActivitySetting_T.useWYSWYG.i18n' ),
                        "-en": i18n( 'activitysettings-schema.ActivitySetting_T.useWYSWYG.i18n' ),
                        "-de": i18n( 'activitysettings-schema.ActivitySetting_T.useWYSWYG.i18n' )
                    },
                    "quickPrintInvoice": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.quickPrint.i18n' )
                    },
                    "quickPrintInvoiceBill": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.quickPrintBill.i18n' )
                    },
                    "quickPrintPrescription": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.quickPrintBill.i18n' )
                    },
                    "hideLinksOfPrintedPDF": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'activitysettings-schema.ActivitySetting_T.hideLinksOfPrintedPDF.i18n' )
                    }
                },
                "ActivitySettings_T": {
                    "settings": {
                        "complex": "inc",
                        "type": "ActivitySetting_T",
                        "lib": types,
                        i18n: i18n( 'activitysettings-schema.ActivitySettings_T.settings.i18n' ),
                        "-en": "activty settings",
                        "-de": "activity settings"
                    }
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            defaultItems: [
                {
                    "_id": MAIN_ID,
                    "settings": Y.doccirrus.schemas.activity.types.Activity_E.list.map( function( item ) {
                        const isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();
                        let
                            val = item.val,
                            result = {
                                'actType': val,
                                'color': '#ffffff',
                                'isVisible': true,
                                'schein': true
                            };

                        switch( val ) {
                            case 'SCHEIN':
                            case 'PKVSCHEIN':
                            case 'AMTSSCHEIN':
                            case 'BGSCHEIN':
                                result.color = '#ffffe4';
                                break;
                            case 'LONGPRESCR':
                            case 'PRIVPRESCR':
                                if( isSwiss ) {
                                    result.maxMedicationAmount = 99;
                                } else {
                                    result.maxMedicationAmount = 3;
                                }
                                break;
                            case 'PRESCRBTM':
                                if( isSwiss ) {
                                    result.maxMedicationAmount = 99;
                                } else {
                                    result.maxMedicationAmount = 2;
                                }
                                break;
                        }

                        if( item && item.functionality ) {
                            result.functionality = item.functionality;
                        }

                        return result;
                    } )
                }
            ],
            name: NAME,
            getId: function getId() {
                return MAIN_ID;
            },
            /**
             * @param {String} actType
             * @return {module:activitysettingsSchema.settingsObj}
             */
            getDefaultForActType: function getDefaultForActType( actType ) {
                return this.defaultItems[0].settings.find( elem => elem.actType === actType );
            },
            /**
             * @param {module:activitysettingsSchema.settingsObj} actSettings
             * @return {Boolean}
             */
            hasAdditionalParametersChanged: function hasAdditionalParametersChanged( actSettings ) {
                const
                    additionalParameters = [
                        'quickPrintInvoice',
                        'quickPrintInvoiceBill',
                        'quickPrintPrescription'
                    ],
                    additionalParametersNotInSchema = [
                        'maxMedicationAmount'
                    ];

                for( const additionalParameter of additionalParameters ) {
                    const tmpVal = _.get( this.schema.settings[0], `${additionalParameter}.default` );
                    if( _.get( actSettings, additionalParameter ) !== tmpVal ) {
                        return true;
                    }
                }

                const defaultValue = this.getDefaultForActType( actSettings.actType );
                for( const additionalParameterNotInSchema of additionalParametersNotInSchema ) {
                    const tmpVal = _.get( defaultValue, `${additionalParameterNotInSchema}` );
                    if( _.get( actSettings, additionalParameterNotInSchema ) !== tmpVal ) {
                        return true;
                    }
                }
                return false;
            }
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'activity-schema',
            'dcschemaloader',
            'dccommonutils'
        ]
    }
);

