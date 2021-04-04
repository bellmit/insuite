/**
 * User: oliversieweke
 * Date: 30.01.19  14:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'biller-api', function( Y, NAME ) {
        /**
         * @module biller-api
         */
        const {formatPromiseResult} = require('dc-core').utils;
        const {promisify} = require( 'util' );

        function dcPromisify( functionToPromisify ) {
            functionToPromisify[promisify.custom] = args => {
                return new Promise( ( resolve, reject ) => {
                    functionToPromisify( {
                        ...args, callback: ( err, result ) => err ? reject( err ) : resolve( result )
                    } );
                } );
            };

            return promisify( functionToPromisify );
        }

        function handleResult( error, response, callback ) {
            if( callback ) {
                return callback( error, response );
            } else {
                if( error ) {
                    throw error;
                }
                return response;
            }
        }

        async function get( args ) {
            const {callback} = args;

            let err, result;

            [err, result] = await formatPromiseResult( Promise.all( [
                dcPromisify( Y.doccirrus.api.employee.get )( {...args, query: {...args.query, type: "PHYSICIAN"}} ).then( response => response.result ),
                dcPromisify( Y.doccirrus.api.location.get )( {...args} )
            ] ) );

            if( err ) {
                Y.log( `get(): error in getting billers:\n ${err.stack || err}`, 'error', NAME );
                err = Y.doccirrus.errors.rest( `biller_00` );
            }

            result = result.reduce( ( results, currentResult ) => {
                return [...results, ...currentResult];
            }, [] );

            return handleResult( err, result, callback );
        }

        /**
         * @class biller
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).biller = {
            name: NAME,
            get
        };
    },
    '0.0.1', {
        requires: [
            'employee-api',
            'location-api'
        ]
    }
);

