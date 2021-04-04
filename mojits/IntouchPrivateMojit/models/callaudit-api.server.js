/**
 * User: mahmoud
 * Date: 06/03/15  17:22
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'callaudit-api', function( Y, NAME ) {
        /**
         * @module callaudit-api
         */
        const
            {formatPromiseResult} = require( 'dc-core' ).utils;

        async function get( args ) {
            Y.log('Entering Y.doccirrus.api.callaudit.get', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.callaudit.get');
            }
            const {user, query} = args;
            let
                err,
                dcCustomerNo,
                employeeId = user.specifiedBy;

            [err, dcCustomerNo] = await formatPromiseResult(
                Y.doccirrus.api.practice.getDCCustomerNo( user )
            );
            if( err ) {
                Y.log(`search: Error getting dcCustomerNo: ${err.stack || err}`, 'error', NAME);
            }

            query.employeeId = employeeId;
            if( true !== query.picked ) {
                query.$or = {};
                query.$or = [
                    {'caller.identityId': {$ne: user.identityId}}
                ];
                if( dcCustomerNo ) {
                    query.$or.push( {'caller.dcCustomerNo': {$ne: dcCustomerNo}} ); // identityId could be duplicated across PRCs
                }
            }
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'callaudit',
                action: 'get',
                options: args.options,
                query: query,
                callback: args.callback
            } );
        }

        Y.namespace( 'doccirrus.api' ).callaudit = {
            /**
             * @property name
             * @type {String}
             * @default telecommunication-api
             * @protected
             */
            name: NAME,

            get: get
        };

    },
    '0.0.1', { requires: ['dccommunication', 'doccirrus', 'dchttps', 'dcauth'] }
);
