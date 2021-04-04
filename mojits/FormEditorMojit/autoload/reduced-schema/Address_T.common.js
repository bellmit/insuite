/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-Address-T',

    /* Module code */
    function( Y /* , NAME */ ) {
        'use strict';


        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }

        Y.dcforms.schema.Address_T = {
            street: {
                default: "",
                type: "String",
                label: {
                    "en": "street",
                    "de": "Strasse"
                }
            },
            houseno: {
                default: "",
                type: "String",
                label: {
                    "en": "House No.",
                    "de": "Hausnummer"
                }
            },
            zip: {
                "default": "",
                "type": "String",
                label: {
                    "en": "Zip",
                    "de": "PLZ"
                }
            },
            city: {
                "default": "",
                "type": "String",
                label: {
                    "en": "City",
                    "de": "Stadt"
                }
            },
            postbo: {
                type: "String",
                label : {
                    "en": "Postbox",
                    "de": "Postfach"
                }
            },
            kind: {
                complex: "eq",
                type: "String",
                label: {
                    "en": "Address type",
                    "de": "Adresstyp"
                }

            },
            country: {
                "default": "Deutschland",
                "type": "String",
                label: {
                    "en": "Country",
                    "de": "Land"
                }
            },
            countryCode: {
                "default": "D",
                "type": "String",
                label: {
                    "en": "Country code",
                    "de": "Ländercode"
                }
            },
            receiver:  {
                "type": "String",
                label: {
                    "en": "Addressee",
                    "de": "Empfänger"
                }
            },
            addon: {
                "default": "",
                "type": "String",
                label: {
                    "en": "Address addition",
                    "de": "Anschriftenzusatz"
                }
            }
        };

        //  replace mapper
     /*   Y.dcforms.schema.Address_T.mapper = 'add';*/

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ ]
    }
);