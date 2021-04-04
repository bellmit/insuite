/**
 * User: do
 * Date: 03/04/17  17:59
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'kbvutilityprice-process', function( Y, NAME ) {
        /**
         * The DC kbvutilityprice data schema definition
         *
         * @class DCkbvutilitypriceProcess
         */

        function checkIfUtilityKvCombinationIsUnique( user, kbvutilityprice, callback ) {
            const
                query = {
                    utilityName: kbvutilityprice.utilityName,
                    insuranceType: kbvutilityprice.insuranceType,
                    utilityPositionNo: kbvutilityprice.utilityPositionNo,
                    kv: kbvutilityprice.kv
                };

            if( kbvutilityprice._id ) {
                query._id = {$ne: kbvutilityprice._id};
            }

            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'kbvutilityprice',
                query: query,
                callback: ( err, results ) => {
                    if( err ) {
                        callback( err );
                    } else if( 0 < results.length ) {
                        let result = results[0];
                        err = new Y.doccirrus.commonerrors.DCError( 30300, {
                            data: {
                                kbvUtilityId: result._id,
                                $kv: result.kv,
                                $insuranceType: Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', result.insuranceType, 'i18n', '' ),
                                $utilityName: result.utilityName,
                                $price: Y.doccirrus.comctl.numberToLocalString( result.price )
                            }
                        } );
                        callback( err );
                    } else {
                        callback( null, kbvutilityprice );
                    }
                }
            } );

        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            pre: [
                {
                    run: [
                        checkIfUtilityKvCombinationIsUnique
                    ], forAction: 'write'
                },
                {run: [], forAction: 'delete'}
            ],
            post: [
                {run: [], forAction: 'write'}
            ],
            name: NAME
        };

    },
    '0.0.1', {
        requires: [
            'kbvutilityprice-schema',
            'kbvutilityprice-api',
            'dccommonerrors',
            'dc-comctl'
        ]
    }
);
