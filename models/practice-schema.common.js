/**
 * User: rrrw
 * Date: 27/12/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'practice-schema', function( Y, NAME ) {
        /**
         * The DC Practice data schema definition
         *
         * @module DCPractice
         */

        var

            // ------- Schema definitions  -------

            i18n = Y.doccirrus.i18n,
            types = {};

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Practice_T",
                        "lib": types
                    }
                },
                "Practice_T": {
                    "commercialNo": {
                        "type": "String",
                        i18n: i18n( 'practice-schema.Practice_T.commercialNo.i18n' ),
                        "-en": "commercialNo",
                        "-de": "commercialNo"
                    },
                    "company": {
                        "complex": "ext",
                        "type": "Company_T",
                        "lib": "company"
                    },
                    "notifications": {
                        "complex": "ext",
                        "type": "Notifications_T",
                        "lib": types,
                        i18n: i18n( 'practice-schema.Practice_T.notifications.i18n' ),
                        "-en": "notifications",
                        "-de": "notifications"
                    },
                    "intimeConfiguration": {
                        "complex": "ext",
                        "type": "IntimeConfiguration_T",
                        "lib": types,
                        i18n: i18n( 'practice-schema.Practice_T.intimeConfiguration.i18n' ),
                        "-en": "intimeConfiguration",
                        "-de": "intimeConfiguration"
                    },
                    "centralContact": {
                        "type": "any",
                        i18n: i18n( 'practice-schema.Practice_T.centralContact.i18n' ),
                        "override": true,
                        "lib": types
                    },
                    "supportContact": {
                        "type": "any",
                        i18n: i18n( 'practice-schema.Practice_T.supportContact.i18n' ),
                        "override": true,
                        "lib": types
                    }
                },
                "Notifications_T": {
                    "createAlert": {
                        "complex": "inc",
                        "type": "Alert_T",
                        "lib": types,
                        i18n: i18n( 'practice-schema.Notifications_T.createAlert.i18n' ),
                        "-en": "createAlert",
                        "-de": "createAlert"
                    },
                    "updateAlert": {
                        "complex": "inc",
                        "type": "Alert_T",
                        "lib": types,
                        i18n: i18n( 'practice-schema.Notifications_T.updateAlert.i18n' ),
                        "-en": "updateAlert",
                        "-de": "updateAlert"
                    },
                    "deleteAlert": {
                        "complex": "inc",
                        "type": "Alert_T",
                        "lib": types,
                        i18n: i18n( 'practice-schema.Notifications_T.deleteAlert.i18n' ),
                        "-en": "deleteAlert",
                        "-de": "deleteAlert"
                    },
                    "reminderAlert1": {
                        "complex": "inc",
                        "type": "Alert_T",
                        "lib": types,
                        i18n: i18n( 'practice-schema.Notifications_T.reminderAlert1.i18n' ),
                        "-en": "reminderAlert1",
                        "-de": "reminderAlert1"
                    },
                    "reminderAlert2": {
                        "complex": "inc",
                        "type": "Alert_T",
                        "lib": types,
                        i18n: i18n( 'practice-schema.Notifications_T.reminderAlert2.i18n' ),
                        "-en": "reminderAlert2",
                        "-de": "reminderAlert2"
                    },
                    "reminderAlert3": {
                        "complex": "inc",
                        "type": "Alert_T",
                        "lib": types,
                        i18n: i18n( 'practice-schema.Notifications_T.reminderAlert3.i18n' ),
                        "-en": "reminderAlert3",
                        "-de": "reminderAlert3"
                    }
                },
                "Alert_T": {
                    "type": {
                        "type": "String",
                        i18n: i18n( 'practice-schema.Alert_T.type.i18n' ),
                        "-en": "type",
                        "-de": "type"
                    },
                    "receiver": {
                        "type": "String",
                        i18n: i18n( 'practice-schema.Alert_T.receiver.i18n' ),
                        "-en": "receiver",
                        "-de": "receiver"
                    },
                    "minutesinadvance": {
                        "type": "Number",
                        i18n: i18n( 'practice-schema.Alert_T.minutesinadvance.i18n' ),
                        "-en": "Before",
                        "-de": "Vorher"
                    },
                    "active": {
                        "type": "Boolean",
                        i18n: i18n( 'practice-schema.Alert_T.active.i18n' ),
                        "-en": "active",
                        "-de": "active"
                    }
                },
                "IntimeConfiguration_T": {
                    "allowAdhoc": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'practice-schema.IntimeConfiguration_T.allowAdhoc.i18n' ),
                        "-en": "allowAdhoc",
                        "-de": "allowAdhoc"
                    },
                    "allowPRCAdhoc": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'practice-schema.IntimeConfiguration_T.allowPRCAdhoc.i18n' ),
                        "-en": "allowPRCAdhoc",
                        "-de": "allowPRCAdhoc"
                    },
                    "autoShift": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'practice-schema.IntimeConfiguration_T.autoShift.i18n' ),
                        "-en": "autoShift",
                        "-de": "autoShift"
                    },
                    "autoEnd": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'practice-schema.IntimeConfiguration_T.autoEnd.i18n' ),
                        "-en": "practice-schema.IntimeConfiguration_T.autoEnd.i18n",
                        "-de": "practice-schema.IntimeConfiguration_T.autoEnd.i18n"
                    },
                    updateNoShowAtEod: {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'practice-schema.IntimeConfiguration_T.updateNoShowAtEod.i18n' ),
                        "-en": i18n( 'practice-schema.IntimeConfiguration_T.updateNoShowAtEod.i18n' ),
                        "-de": i18n( 'practice-schema.IntimeConfiguration_T.updateNoShowAtEod.i18n' )
                    },
                    "autoMutateOff": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'practice-schema.IntimeConfiguration_T.autoMutateOff.i18n' ),
                        "-en": "practice-schema.IntimeConfiguration_T.autoMutateOff.i18n",
                        "-de": "practice-schema.IntimeConfiguration_T.autoMutateOff.i18n"
                    },
                    "allowBookingsOutsideOpeningHours": {
                        "type": "Boolean",
                        "default": true,
                        i18n: i18n( 'practice-schema.IntimeConfiguration_T.allowBookingsOutsideOpeningHours.i18n' ),
                        "-en": i18n( 'practice-schema.IntimeConfiguration_T.allowBookingsOutsideOpeningHours.i18n' ),
                        "-de": i18n( 'practice-schema.IntimeConfiguration_T.allowBookingsOutsideOpeningHours.i18n' )
                    },
                    "hiddenDays": {
                        "type": Array,
                        i18n: i18n( 'practice-schema.IntimeConfiguration_T.hideDays.i18n' ),
                        "default": [ "6", "0" ]
                    },
                    "onlyPracticesPatientsCanBook": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'InTimeAdminMojit.tab_settings.onlyPracticesPatientsCanBook.label' ),
                        "-en": i18n( 'InTimeAdminMojit.tab_settings.onlyPracticesPatientsCanBook.label' ),
                        "-de": i18n( 'InTimeAdminMojit.tab_settings.onlyPracticesPatientsCanBook.label' )
                    },
                    "calendarViewDayStart": {
                        "type": "String",
                        "default": "07:00",
                        validate: 'IntimeConfiguration_T_calendarViewDayStart',
                        i18n: i18n( 'practice-schema.IntimeConfiguration_T.calendarViewDayStart.i18n' ),
                        "-en": i18n( 'practice-schema.IntimeConfiguration_T.calendarViewDayStart.i18n' ),
                        "-de": i18n( 'practice-schema.IntimeConfiguration_T.calendarViewDayStart.i18n' )
                    },
                    "calendarViewDayEnd": {
                        "type": "String",
                        "default": "19:59",
                        validate: "IntimeConfiguration_T_calendarViewDayEnd",
                        i18n: i18n( 'practice-schema.IntimeConfiguration_T.calendarViewDayEnd.i18n' ),
                        "-en": i18n( 'practice-schema.IntimeConfiguration_T.calendarViewDayEnd.i18n' ),
                        "-de": i18n( 'practice-schema.IntimeConfiguration_T.calendarViewDayEnd.i18n' )
                    },
                    "colorMode": {
                        "complex": "eq",
                        "required": true,
                        "type": "ColorMode_E",
                        "lib": types
                    },
                    "activateOverview": {
                        "type": "Boolean",
                        "default": false,
                        i18n: i18n( 'practice-schema.IntimeConfiguration_T.activateOverview.i18n' ),
                        "-en": i18n( 'practice-schema.IntimeConfiguration_T.activateOverview.i18n' ),
                        "-de": i18n( 'practice-schema.IntimeConfiguration_T.activateOverview.i18n' )
                    }
                },
                ColorMode_E: {
                    "type": "String",
                    "default": "CALENDAR",
                    "list": [
                        {
                            "val": "CALENDAR",
                            i18n: i18n( 'practice-schema.ColorMode_E.CALENDAR' ),
                            "-en": "Kalender",
                            "-de": "Kalender"
                        },
                        {
                            "val": "MEETING",
                            i18n: i18n( 'practice-schema.ColorMode_E.MEETING' ),
                            "-en": "Terminarten",
                            "-de": "Terminarten"
                        }
                    ]
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        var minutesinadvance = [
            {
                val: 2160,
                i18n: i18n( 'practice-schema.minutesinadvanceList.H36' )
            },
            {
                val: 1440,
                i18n: i18n( 'practice-schema.minutesinadvanceList.H24' )
            },
            {
                val: 120,
                i18n: i18n( 'practice-schema.minutesinadvanceList.H2' )
            },
            {
                val: 60,
                i18n: i18n( 'practice-schema.minutesinadvanceList.H1' )
            },
            {
                val: 30,
                i18n: i18n( 'practice-schema.minutesinadvanceList.M30' )
            }
        ];

        /**
         * Class Practice Schemas -- gathers all the schemas that the Practice Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            name: NAME,

            /**
             * retrieve the alert base on the simple query
             * @param alerts    array of alerts
             * @param receiver  either patient or location
             * @param type      either sms or email
             * @returns {Object}
             */
            getAlert: function( alerts, receiver, type ) {
                var
                    myAlert;
                myAlert = alerts.find( function( a ) {
                    return a.receiver === receiver && a.type === type;
                } );
                return myAlert || {};
            },

            /**
             * @param receiver  either patient or location
             * @param type      either sms or email
             * @param active {Boolean}
             * @param minutesinadvance {Number} number if minutes in advance the alert should be triggered
             * @returns {Object}
             */
            createAlert: function( type, receiver, active, minutesinadvance ) {
                var
                    myAlert = {};
                myAlert.type = type;
                myAlert.receiver = receiver;
                myAlert.active = active || false;
                if( minutesinadvance ) {
                    myAlert.minutesinadvance = minutesinadvance;
                }
                return myAlert;
            },

            /**
             * Default value list for "minutesinadvance"
             * @method minutesinadvanceList
             * @return {Array}
             */
            minutesinadvanceList: function() {
                return minutesinadvance;
            },

            getMaxMinutesInAdvance: function() {
                var list = minutesinadvance;
                list.sort( function( a, b ) {
                    return b.val - a.val;
                } );
                return list[0].val;
            },
            cacheQuery: true

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations',
            'company-schema'
        ]
    }
);
