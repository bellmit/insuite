/**
 * User: oliversieweke
 * Date: 13.06.18  15:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'opscode-api', function( Y, NAME ) {
        /**
         * @module opscode-api
         */
        const runDb = Y.doccirrus.mongodb.runDb;
        const _ = require( 'lodash' );


        function searchByCodeOrName( params ) {
            Y.log('Entering Y.doccirrus.api.opscode.searchByCodeOrName', 'info', NAME);
            if (params.callback) {
                params.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(params.callback, 'Exiting Y.doccirrus.api.opscode.searchByCodeOrName');
            }
            const {model, query, options, callback} = params;

            const literalQuery = _.escapeRegExp( query.replace( /[^a-zA-Z\s]|(?<=[^a-zA-Z\s])([a-zA-Z]*)|([a-zA-Z]*)(?=[^a-zA-Z\s])/g, "" ) ); // Removes everything that is not a letter or whitespace as well as letters that are surrounded by other non-letter characters.

            const regExpQuery = {
                $or: [
                    {
                        code: {
                            $regex: _.escapeRegExp( query ).trim().split(/(?![.-])/g).join("[-\.]?"),
                            $options: 'i'
                        }
                    },
                    {
                        name: {
                            $regex: literalQuery.replace(/\s/g, "") ? `^(?=.*${literalQuery.trim().split( " " ).join( ")(?=.*" )})` : 'a^', // 'a^' does not match anything
                            $options: 'i'
                        }

                    }
                ]
            };

            return runDb( {
                model,
                user: Y.doccirrus.auth.getSUForLocal(),
                action: 'get',
                query: regExpQuery,
                options
            } )
                .then( res => {
                    if( callback ) {
                        return callback( null, res.result );
                    } else {
                        return res.result;
                    }
                } )
                .catch( err => {
                    Y.log( `Error in looking up OPS Codes. ${err.message}`, 'error', NAME );
                    if( callback ) {
                        return callback( err );
                    } else {
                        return err;
                    }
                } );
        }

        /**
         * @class opscode
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).opscode = {
            name: NAME,
            searchByCodeOrName
        };
    },
    '0.0.1', {
        requires: []
    }
);