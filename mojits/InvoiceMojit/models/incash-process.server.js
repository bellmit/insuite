/**
 * User: md
 * Date: 08/10/2019  14:13
 * (c) 2019, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


const
    {formatPromiseResult} = require('dc-core').utils;

YUI.add( 'incash-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        async function setNo( user, incash, callback ) {
            if(!incash.incashNo){
                let [err, nextNo] = await formatPromiseResult(
                    Y.doccirrus.api.incash.getNextIncashNo( user, incash.locationId.toString(), incash.cashbookId.toString() )
                );
                if( err ){
                    Y.log( `incash.setNo: Error getting next number ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }
                incash.incashNo = nextNo;
            }
            callback( null, incash );
        }

        /**
         * @class incashProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            name: NAME,
            pre: [ {
                run: [ setNo ],
                forAction: 'write'
            } ],
            post: [],
            audit: {}
        };

    },
    '0.0.1', {requires: []}
);