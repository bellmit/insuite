/**
 * User: do
 * Date: 07/04/17  15:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'omimchain-api', function( Y, NAME ) {

        /**
         * @module omimchain-api
         */

        const
            Promise = require( 'bluebird' ),
            runDb = Promise.promisify( Y.doccirrus.mongodb.runDb );

        function getOmimChains( args ) {
            Y.log('Entering Y.doccirrus.api.omimchain.getOmimChains', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.omimchain.getOmimChains');
            }
            const
                {user, query, options, callback} = args;

            if( query.chain ) {
                let term = query.chain;
                query.$or = [
                    {'chain.omimG': term},
                    {'chain.genName': term},
                    {'chain.omimP': term},
                    {'chain.desc': term}
                ];
                delete query.chain;
            }

            runDb( {
                user,
                model: 'omimchain',
                query,
                options
            } )
                .then( results => callback( null, results ) )
                .catch( err => callback( err ) );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class omimchain
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).omimchain = {

            name: NAME,
            getOmimChains: getOmimChains

        };

    },
    '0.0.1', {requires: []}
);
