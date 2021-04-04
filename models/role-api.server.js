/**
 * User: rrrw
 * Date: 17/02/2017  13:12
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */


/*global YUI */
'use strict';

YUI.add( 'role-api', function( Y, NAME ) {
        const  { formatPromiseResult, handleResult } = require( 'dc-core' ).utils;
        function checkAndAddRole( user, roleString, callback ) {
            user = user || Y.doccirrus.auth.getSUForLocal();
            callback = callback || (() => {});

            function roleFindCb( err, result ) {
                if( err ) {
                    Y.log( 'checkAndAddRole: DB Error finding role.', 'error', NAME );
                    Y.log( err.stack, 'error', NAME );
                    // issue task?
                    return callback( err );
                }

                if( result && result.length > 0 ) {
                    // already have the role.
                    return callback();
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'role',
                    action: 'post',
                    data: {value: roleString, description: '', skipcheck_: true}
                }, ( err, result ) => {
                    if( err ) {
                        Y.log( `checkAndAddRole: failed POST role ${JSON.stringify(err)}`, 'error', NAME );
                        Y.log( err.stack );
                        return callback( err );
                    }
                    Y.log( `checkAndAddRole: success ${roleString}`, 'info', NAME );
                    callback( null, result );
                } );

            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'role',
                query: {
                    value: roleString
                },
                options: {
                    lean: true,
                    limit: 1
                },
                callback: roleFindCb
            } );
        }

        /**
         * default get method
         * @method get
         * @param {Object} args
         */
        async function get( args ) {
            Y.log( 'Entering Y.doccirrus.api.role.get', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.role.get' );
            }
            const
                {user, query = {}, callback, options = {}} = args;
            let err, roles;

            [err, roles] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'role',
                user,
                options,
                query
            } ) );

            if( err ) {
                Y.log( `get: failed to get roles: ${err.stack || err}`, 'error', NAME );
            }
            roles = roles.result ? roles.result : roles;

            if( !Y.doccirrus.licmgr.hasAdditionalService( args.user.tenantId, 'inStock' ) ) {
                roles = roles.filter( r => r.value !== Y.doccirrus.schemas.role.DEFAULT_ROLE.INSTOCK );
            }

            return handleResult( err, roles, callback );
        }

        Y.namespace( 'doccirrus.api' ).role = {

            name: NAME,
            get,
            checkAndAddRole: checkAndAddRole

        };

    },
    '0.0.1', {requires: ['role-schema']}
);
