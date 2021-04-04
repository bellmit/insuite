/**
 * User: do
 * Date: 21/03/17  14:39
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'omimchain-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function checkChainNameIsUnique( user, omimChain, callback ) {
            if( !omimChain.isModified( 'chainName' ) ) {
                callback( null, omimChain );
                return;
            }
            const
                query = {
                    chainName: omimChain.chainName
                };

            if( omimChain._id ) {
                query._id = {$ne: omimChain._id};
            }
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'omimchain',
                action: 'count',
                query: query
            }, function( err, count ) {
                if( err ) {
                    callback( err );
                } else if( 0 < count ) {
                    callback( new Y.doccirrus.commonerrors.DCError( 30200 ) );
                } else {
                    callback( null, omimChain );
                }
            } );
        }

        /**
         * Class Task Processes
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            name: NAME,

            pre: [
                {
                    run: [
                        checkChainNameIsUnique
                    ],
                    forAction: 'write'
                }
            ]
        };

    },
    '0.0.1', {requires: ['omimchain-schema', 'dccommonerrors']}
);
