/*
 * Author: rw
 * Date: 20.02.14  09:34
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

/**
 * Ruleset for BVA. and MG.
 *
 * fields entries may have the following values:
 *
 * "schema": e.g. "patient", the schema name that we are referring to (mixed, i.e. with all possible children included)
 * "st": e.g. "Patient_T", the type name (not sure if this will make it into the final version of the definition)
 * "path": e.g. "dob", the field name as in the UML data model
 *              For nested paths (e.g. addresses.houseno ),  you can either use the short-hand  'houseno'  , or
 *              a fully qualified path (where array index is ignored), i.e.  'addresses.houseno'  (NOT including index.
 *              Do NOT do this: 'addresses[x].houseno'  will NOT work)
 * "type": e.g. "Date",  the content type (not sure if this will make it into the final version of the definition)
 * "validate":  a validate function that must succeed in order to write data (hard validation)
 * "recommend": a validate function that need not succeed in order to write data (soft validation)
 * "fieldCode": e.g. "4103", the BVA code for this field
 * "ruleId": e.g. [573,872,678] the BVA rules
 *
 */

YUI.add( 'bva-ruleset', function( Y, NAME ) {

        var
            rules = {
                "_version": 1.0,
                "_name": "BVA",
                "_meta": "Some more machine readable metadata.",
                "_country": "D",
                "fields": {
                }
            };
        NAME = Y.doccirrus.schemaloader.deriveRuleSetName( NAME );

        function appliesTo( data, callback ) {
            // logic that inspects the data and
            // any other information (also async)
            // then returns an answer, whether this
            // is the right model for this data or
            // not.
            if( callback ) {
                callback( null, false );
            }
            return false;
        }

        Y.namespace( 'doccirrus.ruleset' )[NAME] = {

            definition: rules,

            appliesTo: appliesTo,

            name: NAME
        };
    },
    '0.0.1', {requires: ['dcschemaloader']}
);
