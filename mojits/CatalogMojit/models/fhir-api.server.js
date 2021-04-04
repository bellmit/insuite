/**
 * User: do
 * Date: 23.10.19  14:44
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
/*jshint esnext:true */


YUI.add( 'fhir-api', function( Y, NAME ) {
        /**
         * Basic lookup of CodeSystems for now.
         *
         * @module fhir
         */

        var {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;

        async function searchCodeSystems( args ) {
            const SU = Y.doccirrus.auth.getSUForLocal();
            const {originalParams, callback} = args;
            const term = originalParams.term;
            const query = {
                $or: [
                    {code: {$regex: term, $options: 'i'}},
                    {display: {$regex: term, $options: 'i'}}
                ],
                display: {$not: /obsolet/i},
                'property.code': {$ne: 'obsolet'}

            };

            if( Array.isArray( originalParams.systems ) ) {
                query.name = {$in: originalParams.systems};
            }

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: SU,
                model: 'fhir_codesystem',
                query,
                options: {
                    limit: 200,
                    sort: {
                        display: 1
                    }
                }
            } ) );

            if( err ) {
                Y.log( `searchCodeSystems: could not get fhir code systems by term ${term}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            return handleResult( null, result, callback );
        }

        async function codeLookUp( args ) {
            const SU = Y.doccirrus.auth.getSUForLocal();
            const {originalParams, callback} = args;
            const code = originalParams.code;
            const system = originalParams.system;
            const query = {
                code,
                name: system,
                display: {$not: /obsolet/i},
                'property.code': {$ne: 'obsolet'}

            };

            if( !code || !system ) {
                return handleResult( null, null, callback );
            }

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: SU,
                model: 'fhir_codesystem',
                query,
                options: {
                    limit: 1
                }
            } ) );

            if( err ) {
                Y.log( `searchCodeSystems: could not get fhir code systems code ${code}: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }
            return handleResult( null, result && result[0], callback );
        }

        Y.namespace( 'doccirrus.api' ).fhir_codesystem = {
            name: NAME,
            searchCodeSystems,
            codeLookUp
        };

    },
    '0.0.1', {
        requires: ['fhir_codesystem-schema']
    }
);
