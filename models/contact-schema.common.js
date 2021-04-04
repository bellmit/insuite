/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'contact-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {};

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "root": {
                    base: {
                        "complex": "ext",
                        "type": "Contact_T",
                        "lib": types
                    }
                },
                "Contact_T": {
                    "optIn": {
                        "type": "string",
                        "future": "URL",
                        i18n: i18n( 'contact-schema.Contact_T.optIn.i18n' ),
                        "-en": "optIn",
                        "-de": "optIn"
                    },
                    "confirmed": {
                        "type": "boolean",
                        i18n: i18n( 'contact-schema.Contact_T.confirmed.i18n' ),
                        "-en": "confirmed",
                        "-de": "confirmed"
                    },
                    "patient": {
                        "type": "boolean",
                        i18n: i18n( 'contact-schema.Contact_T.patient.i18n' ),
                        "-en": "patient",
                        "-de": "patient"
                    },
                    /* override firstname */
                    "firstname": {
                        "default": "",
                        "type": "String",
                        "required": true,
                        i18n: i18n( 'contact-schema.Contact_T.firstname.i18n' ),
                        "-en": "First Name",
                        "-de": "Vorname"
                    },
                    "dob": {
                        /* optional dob */
                        "type": "Date",
                        "validate": "Patient_T_dob",
                        i18n: i18n( 'contact-schema.Contact_T.dob.i18n' ),
                        "-en": "Date of Birth",
                        "-de": "Geburtsdatum"
                    },
                    "centralContact": {
                        "type": "String",
                        "future": "foreignkey.Customer_T",
                        i18n: i18n( 'contact-schema.Contact_T.centralContact.i18n' ),
                        "-en": "centralContact",
                        "-de": "centralContact"
                    },
                    "person": {
                        "complex": "ext",
                        "type": "Person_T",
                        "lib": "person"
                    },
                    "persServices": {
                        "complex": "ext",
                        "type": "PersService_T",
                        "lib": types
                    },
                    communications: {
                        "complex": "inc",
                        "type": "Communication_T",
                        "lib": 'person',
                        "override": true,
                        "validate": "Contact_T_communications",
                        i18n: i18n( 'person-schema.JuristicPerson_T.communications' ),
                        "-en": "communications",
                        "-de": "communications"
                    },
                    "partnerIds": {
                        "complex": "inc",
                        "type": "PartnerIds_T",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'patient-schema.Patient_T.partnerIds.i18n' ),
                        "lib": 'identity'
                    }
                },
                "PersService_E": {
                    "type": "string",
                    "list": [
                        {
                            "val": "NEWSLETTER",
                            i18n: i18n( 'contact-schema.PersService_E.NEWSLETTER' ),
                            "-en": "newsletter",
                            "-de": "newsletter"
                        },
                        {
                            "val": "COMMUNITYACCESS",
                            i18n: i18n( 'contact-schema.PersService_E.COMMUNITYACCESS' ),
                            "-en": "communityaccess",
                            "-de": "communityaccess"
                        },
                        {
                            "val": "XMASCARD",
                            i18n: i18n( 'contact-schema.PersService_E.XMASCARD' ),
                            "-en": "xmascard",
                            "-de": "xmascard"
                        },
                        {
                            "val": "XMASGIFT",
                            i18n: i18n( 'contact-schema.PersService_E.XMASGIFT' ),
                            "-en": "xmasgift",
                            "-de": "xmasgift"
                        },
                        {
                            "val": "TRAININGOFFERS",
                            i18n: i18n( 'contact-schema.PersService_E.TRAININGOFFERS' ),
                            "-en": "trainingoffers",
                            "-de": "trainingoffers"
                        }
                    ]
                },
                "PersService_T": {
                    "talk": {
                        "default": "",
                        "required": true,
                        "type": "String",
                        i18n: i18n( 'contact-schema.PersService_T.talk.i18n' ),
                        "-en": "Talk",
                        "-de": "Anrede"
                    },
                    "from": {
                        "type": "Date",
                        i18n: i18n( 'contact-schema.PersService_T.from.i18n' ),
                        "-en": "from",
                        "-de": "from"
                    },
                    "to": {
                        "type": "Date",
                        i18n: i18n( 'contact-schema.PersService_T.to.i18n' ),
                        "-en": "to",
                        "-de": "to"
                    },
                    "persService": {
                        "complex": "eq",
                        "type": "PersService_E",
                        "lib": types,
                        i18n: i18n( 'contact-schema.PersService_T.persService.i18n' ),
                        "-en": "persService",
                        "-de": "persService"
                    },
                    "attribute": {
                        "type": "String",
                        i18n: i18n( 'contact-schema.PersService_T.attribute.i18n' ),
                        "-en": "attribute",
                        "-de": "attribute"
                    }
                }
            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,

            //
            //
            /*   Custom Functions     */
            /**
             * Gets the front-end portal patient info from contact info.
             * @param contacts  Array
             * @return {Object}
             */
            getPatientsFromContacts: function getPatientsFromContacts( contacts, callback ) {
                var
                    results = [],
                    result,
                    contact, j;

                if( !contacts || !contacts[0] ) {
                    callback( null, results );
                    return results;
                }
                for( j = 0; j < contacts.length; j++ ) {
                    contact = JSON.parse( JSON.stringify( contacts[j] ) );
                    if( contact && contact.communications && contact.communications[0] ) {
                        contact.optIn = undefined;
                        contact.__v = undefined;
                        result = {};
                        result = Y.merge( result, contact );
                        result.email = Y.doccirrus.schemas.simpleperson.getEmail( contact.communications );
                        result.phone = Y.doccirrus.schemas.simpleperson.getPhone( contact.communications );
                        result.email = result.email && result.email.value || '';
                        result.phone = result.phone && result.phone.value || '';
                        results.push( result );
                    }
                }
                if( Y.config.debug ) {
                    Y.log( 'Transformed Contacts -- ' + JSON.stringify( results ), 'info', NAME );
                }
                callback( null, results );
                return results;
            }

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcvalidations',
            'dcschemaloader',
            'person-schema',
            'identity-schema'
        ]
    }
);
