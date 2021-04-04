/*
 *  Copyright DocCirrus GmbH 2016
 *
 *  Defines flat list of properties bound into forms
 *
 *  This reduced schema is a direct copy of InCase_T
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-InSuite-T',

    /* Module code */
    function( Y /* , NAME */ ) {
        'use strict';

        var
            inCase_T = Y.dcforms.schema.InCase_T,
            k;
        
        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        //  copy subset of properties from InCase_T
        Y.dcforms.schema.InSuite_T = {
            'csvFilename': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Preset Name",
                    "de": "Berichtsname"
                }
            },
            'startDate': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Start Date",
                    "de": "Anfangsdatum"
                }
            },
            'endDate': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "End Date",
                    "de": "Enddatum"
                }
            },
            'creationDate': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "End Date",
                    "de": "Erstelldatum"
                }
            },
            'startDateTime': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Start Date and Time",
                    "de": "Anfangsdatum und Zeit"
                }
            },
            'endDateTime': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "End Date and Time",
                    "de": "Enddatum und Zeit"
                }
            },
            'creationDateTime': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Creation Date and Time",
                    "de": "Erstelldatum and Zeit"
                }
            },
            'labdataTable': {
                "type": "Labdata_T",
                "insight2": true,
                "label": {
                    "en": "Labdata table",
                    "de": "Labordaten Tabelle"
                }
            },
            'dataTable': {
                "type": "Activity_T",
                "insight2": true,
                "label": {
                    "en": "Data table (dynamic)",
                    "de": "Datatabelle"
                }
            },
            'patientName': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Patient name",
                    "de": "Patientenname"
                }
            },
            'patientTalk': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Patient title",
                    "de": "Patientenanrede"
                }
            },
            'dob': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "DOB",
                    "de": "DOB"
                }
            },
            'insuranceNames': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Insurance names",
                    "de": "Versicherungsdaten"
                }
            },
            'backupSecret': {
                "type": "String",
                "insight2": true,
                "label": {
                    "en": "Backup secret key",
                    "de": "Backup Geheimer Schlüssel"
                }
            },
            'postAddress': {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Postal address",
                    "de": "Anschrift"
                }
            },
            'senderAddress': {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Sender address",
                    "de": "Absenderadresse"
                }
            },
            'senderName': {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Sender name",
                    "de": "Absendername"
                }
            },
            'senderTalk': {
                "type": "String",
                "insight2": false,
                "label": {
                    "en": "Sender title",
                    "de": "Absenderanrede"
                }
            }
        };

        for (k in inCase_T) {
            if ( inCase_T.hasOwnProperty( k ) ) {
                if ( inCase_T[k].hasOwnProperty( 'insuite_t' ) && inCase_T[k].insuite_t ) {
                    //Y.log( 'InSuite_T reduced schema inherits property: ' + k, 'debug', NAME );
                    Y.dcforms.schema.InSuite_T[k] = inCase_T[k];
                } // else {
                    //Y.log( 'InSuite_T reduced schema does not inherit property: ' + k, 'debug', NAME );
                // }
            }
        }

        //  replace mapper
        Y.dcforms.schema.InSuite_T.mapper = 'insuite';

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'dcforms-schema-InSuite-T' ]
    }
);