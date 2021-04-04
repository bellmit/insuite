/**
 * User: nicolas.pettican
 * Date: 24.03.21  11:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI */

YUI.add( 'appLicenseSerials-api', function( Y, NAME ) {

        /** @module appLicenseSerials-api */

        const
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            permissionDenied = new Y.doccirrus.commonerrors.DCError( 403, {message: 'Access forbidden'} );

        /**
         * Handles the query-related assertions
         * @param {Object} args
         * @param {Object} args.query
         * @param {Object} args.query.token
         * @returns {Promise<DCError|undefined>}
         */
        async function validateRequest( args ) {
            const error = validateQueryParams( args );

            if( error ) {
                Y.log( `validateRequest: query params not valid: ${error.stack || error}`, 'warn', NAME );
                return handleResult( error, undefined );
            }

            if( await isAllowedToQuery( args ) ) {
                return handleResult( undefined, undefined );
            }

            return handleResult( permissionDenied, undefined );
        }

        /**
         * Validates the URL query params
         * @param {Object} args
         * @param {Object} args.query
         * @param {Object} args.query.token
         * @returns {DCError|null}
         */
        function validateQueryParams( args ) {
            const {query: {token}} = args;

            if( !token ) {
                return new Y.doccirrus.commonerrors.DCError( 400, {
                    message: `Missing required param "token"`
                } );
            }

            return null;
        }

        /**
         * Validates of the given token is valid
         * @param {Object} args
         * @param {Object} args.query
         * @param {Object} args.query.token
         * @returns {Boolean}
         */
        async function isAllowedToQuery( args ) {
            const
                {query: {token}, user = Y.doccirrus.auth.getSUForLocal()} = args,
                adminId = Y.doccirrus.schemas.admin.getDCPRCAppLicenseSerialsId(),

                [error, count] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'admin',
                        action: 'count',
                        query: {
                            _id: adminId,
                            appLicenseSerialsToken: token
                        }
                    } )
                );

            if( error ) {
                Y.log( `isAllowedToQuery: could not get admin entry: ${error.stack || error}`, 'error', NAME );
                return false;
            }

            if( !count ) {
                Y.log( `No match for token ${token}`, 'info', NAME );
                return false;
            }

            return true;
        }

        /**
         * Returns an object with Sol names as keys and an array of serial numbers as values
         * @param {Object} args
         * @param {Object} args.query
         * @param {Object} args.query.token
         * @param {Function} [args.query.callback]
         * @returns {Promise<Object|*>}
         */
        async function getAppLicenseSerials( args ) {
            Y.log( 'Entering Y.doccirrus.api.appLicenseSerials.getAppLicenseSerials', 'info', NAME );

            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.appLicenseSerials.getAppLicenseSerials' );
            }

            const {callback, user = Y.doccirrus.auth.getSUForLocal()} = args;
            let error, companies;

            [error, companies] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'company',
                    action: 'get',
                    query: {
                        'licenseScope.solutions.0': {$exists: true}
                    },
                    options: {
                        select: {
                            systemId: 1,
                            licenseScope: 1
                        }
                    }
                } )
            );

            if( error ) {
                Y.log( `getAppLicenseSerials: could not get companies: ${error.stack || error}`, 'error', NAME );
                return handleResult( error, undefined, callback );
            }

            if( !companies || !companies[0] ) {
                error = new Error( 'No companies found' );
                Y.log( `getAppLicenseSerials: ${error.stack || error}`, 'info', NAME );
                return handleResult( undefined, [], callback );
            }

            const result = {};

            for( const company of companies ) {
                company.licenseScope[0].solutions.forEach( ( appName ) => {
                    if( !company.systemId ) {
                        return;
                    }

                    if( !result.hasOwnProperty( appName ) ) {
                        result[appName] = [company.systemId];
                        return;
                    }

                    result[appName].push( company.systemId );
                } );
            }

            return handleResult( undefined, result, callback );
        }

        async function get( args ) {
            Y.log( 'Entering Y.doccirrus.api.appLicenseSerials.get', 'info', NAME );

            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.appLicenseSerials.get' );
            }

            if( !Y.doccirrus.auth.isDCPRC() ) {
                return handleResult( undefined, [], args.callback );
            }

            const [error] = await formatPromiseResult(
                validateRequest( args )
            );

            if( error ) {
                return handleResult( error, undefined, args.callback );
            }

            return getAppLicenseSerials( args );
        }

        Y.namespace( 'doccirrus.api' ).appLicenseSerials = {
            name: NAME,
            get
        };
    },

    '0.0.1', {
        requires: [
            'doccirrus',
            'dcauth',
            'dccommonerrors'
        ]
    }
);