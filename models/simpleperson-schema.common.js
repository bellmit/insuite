/**
 * User: rrrw
 * Date: 27/12/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

// NBB:  the file name and the schema name are linked by Mojito and must match!

YUI.add( 'simpleperson-schema', function( Y, NAME ) {
        /**
         * The DC Simple Person data schema definition
         *
         * Locations and patients in the Pat Portal are simple persons.
         *
         * This is a virtual schema, containing some helper functions.
         *
         * @module simpleperson
         */

        var

        // ------- Schema definitions  -------

            types = {};

        // this is ignored, but we need it in a valid schema
        types.root = {};

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        var helperEmail = function( communications ) {
                var
                // filter relevant entries
                    communicationsFiltered = Y.Array.filter( communications, function( communication ) {
                        var type = communication.type;
                        return 'EMAILPRIV' === type || 'EMAILJOB' === type;
                    } ),
                    found;

                // bring confirmed entries to the top of list
                communicationsFiltered = communicationsFiltered.sort( function( a, b ) {
                    return b.confirmed && !a.confirmed;
                } );

                // find correct entry via preferred flag
                found = Y.Array.find( communicationsFiltered, function( communication ) {
                    return Boolean( communication.preferred );
                } );
                // if none is preferred take the first entry
                if( null === found && communicationsFiltered.length ) {
                    found = communicationsFiltered[0];
                }
                return found;
            },
            helperPhone = function( communications ) {
                var
                // filter relevant entries
                    communicationsFiltered = Y.Array.filter( communications, function( communication ) {
                        var type = communication.type;
                        return type === 'PHONEPRIV' || type === 'PHONEJOB' || type === 'PHONEEMERGENCY';
                    } ),
                // find correct entry via preferred flag
                    find = Y.Array.find( communicationsFiltered, function( communication ) {
                        var preferred = communication.preferred;
                        return Boolean( preferred );
                    } );
                // if none is preferred take the first entry
                if( null === find && communicationsFiltered.length ) {
                    find = communicationsFiltered[0];
                }
                return find;
            },
            helperMobile = function( communications ) {
                var
                // filter relevant entries
                    communicationsFiltered = Y.Array.filter( communications, function( communication ) {
                        var type = communication.type;
                        return 'MOBILEPRIV' === type || 'MOBILEJOB' === type;
                    } ),
                // find correct entry via preferred flag
                    find = Y.Array.find( communicationsFiltered, function( communication ) {
                        var preferred = communication.preferred;
                        return Boolean( preferred );
                    } );
                // if none is preferred take the first entry
                if( null === find && communicationsFiltered.length ) {
                    find = communicationsFiltered[0];
                }
                return find;
            },
            helperFax = function( communications ) {
                var
                // filter relevant entries
                    communicationsFiltered = Y.Array.filter( communications, function( communication ) {
                        var type = communication.type;
                        return 'FAXPRIV' === type || 'FAXJOB' === type;
                    } ),
                // find correct entry via preferred flag
                    find = Y.Array.find( communicationsFiltered, function( communication ) {
                        var preferred = communication.preferred;
                        return Boolean( preferred );
                    } );
                // if none is preferred take the first entry
                if( null === find && communicationsFiltered.length ) {
                    find = communicationsFiltered[0];
                }
                return find;
            };

        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME,

            /**
             * Public helper functions to get a preferred email from the user
             *
             * @method getEmail
             * @param communications {Array}
             * @return {Object} of type person.Communications_T
             */
            getEmail: helperEmail,
            /**
             * Public helper functions to get a preferred fax number from the user
             *
             * @method getFax
             * @param communications {Array}
             * @return {Object} of type person.Communications_T
             */
            getFax: helperFax,
            /**
             * Public helper functions to get a preferred phone from the user
             *
             * @method getPhone
             * @param communications {Array}
             * @return {Object} of type person.Communications_T
             */
            getPhone: helperPhone,

            /**
             * Public helper functions to get a preferred mobile from the user
             *
             * @method getMobile
             * @param communications {Array}
             * @return {Object} of type person.Communications_T
             */
            getMobile: helperMobile,

            /**
             * Simply writes the single address and contact info into the first
             * position in the array of communications and addresses.
             *
             * @method getPersonFromSimplePerson
             * @param simpleperson {Object} SimplePerson
             * @return {Object} Person
             */
            getPersonFromSimplePerson: function( simpleperson ) {
                var result = [],
                    item,
                    cleanPerson;
                cleanPerson = JSON.parse( JSON.stringify( simpleperson ) );
                if( cleanPerson.email ) {
                    item = {};
                    item.type = 'EMAILJOB';
                    item.value = cleanPerson.email;
                    delete cleanPerson.email;
                    result.push( item );
                }
                if( cleanPerson.phone ) {
                    item = {};
                    item.type = 'PHONEJOB';
                    item.value = cleanPerson.phone;
                    delete cleanPerson.phone;
                    result.push( item );
                }
                if( cleanPerson.fax ) {
                    item = {};
                    item.type = 'FAXJOB';
                    item.value = cleanPerson.fax;
                    delete cleanPerson.fax;
                    result.push( item );
                }
                cleanPerson.communications = result;
                return cleanPerson;

            },
            /**
             * Callback is optional, for use with runDb.
             * This function also returns the result directly.
             *
             * @method getSimplePersonFromPerson
             * @param person {Object} can be a mongoose object
             * @param [callback] {Function} optional, (err, simplePerson)
             * @return {Object} SimplePerson
             */
            getSimplePersonFromPerson: function( person, callback ) {
                var result,
                    cleanPerson,
                    email, phone, fax, mobile;
                cleanPerson = JSON.parse( JSON.stringify( person ) );
                if( cleanPerson && cleanPerson.communications && cleanPerson.communications[0] ) {
                    result = {};
                    email = helperEmail( cleanPerson.communications );
                    phone = helperPhone( cleanPerson.communications );
                    mobile = helperMobile( cleanPerson.communications );
                    fax = helperFax( cleanPerson.communications );
                    if( null !== email ) {
                        result.email = email.value;
                    }
                    if( null !== phone ) {
                        result.phone = phone.value;
                    }
                    if( null !== fax ) {
                        result.fax = fax.value;
                    }
                    if( null !== mobile ) {
                        result.mobile = mobile.value;
                    }
                }
                if( callback ) {
                    callback( null, result );
                }
                return result;
            }
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {requires: ['dcschemaloader']}
);
