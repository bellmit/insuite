/**
 * User: do
 * Date: 14/09/16  22:16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'edmpdelivery-process', function( Y, NAME ) {
        const
            Promise = require( 'bluebird' ),
            removeFile = Y.doccirrus.edocutils.removeFile;

        function updateDocs( user, delivery, callback ) {
            if( -1 !== [ 'SENT', 'ARCHIVED' ].indexOf( delivery.edmpDeliveryStatus ) ) {
                return callback( Error( 'you can not delete sent or archived edmpdelivery' ) );
            }
            Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'activity',
                migrate: true,
                query: { dmpDeliveryRef: delivery._id.toString() },
                data: { dmpDeliveryRef: null },
                options: { multi: true }
            } )
                .then( () => {

                    const fileIds = [];

                    if( delivery.contentFormId ) {
                        fileIds.push( delivery.contentFormId );
                    }

                    if( delivery.labelFormId ) {
                        fileIds.push( delivery.labelFormId );
                    }

                    if( Array.isArray( delivery.content ) ) {
                        delivery.content.forEach( c => {
                            if( c.archiveFileId ) {
                                fileIds.push( c.archiveFileId );
                            }

                            if( c.encryptedArchiveFileId ) {
                                fileIds.push( c.archiveFileId );
                            }

                            if( c.indexFileId ) {
                                fileIds.push( c.indexFileId );
                            }
                        } );
                    }

                    // remove referenced files lazily
                    Promise.map( fileIds, id => removeFile( user, id ) );

                    callback( null, delivery );
                } )
                .catch( err => {
                    Y.log( 'could not update activitie`s edmpdelivery refs before deleting: ' + err && err.stack || err, 'error', NAME );
                    callback( err );
                } );
        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class DeliverysettingsProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        // TODOOO find out which rules apply and implement here
                        //Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'kbvlog' )
                        Y.doccirrus.filtering.models.edmpdelivery.resultFilters[0]

                    ], forAction: 'write'
                },
                {
                    run: [
                        //Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'kbvlog' )
                        Y.doccirrus.filtering.models.edmpdelivery.resultFilters[0],
                        updateDocs
                    ], forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [], forAction: 'write'
                },
                {
                    run: [], forAction: 'delete'
                }
            ],
            audit: {
                // descrFn: function( data ) {
                //     var
                //         tmp,
                //         res = '';
                //     if( data.year && data.quarter ) {
                //         res += data.quarter + '/' + data.year;
                //     }
                //     if( data.commercialNo ) {
                //         res += res.length ? ' ' + data.commercialNo : data.commercialNo;
                //     }
                //     if( data.status ) {
                //         tmp = Y.doccirrus.schemaloader.getEnumListTranslation( 'kbvlog', 'Status_E', data.status, '-de', '' );
                //         res += res.length ? ' ' + tmp : tmp;
                //     }
                //
                //     return res || data._id;
                // }

            },

            processQuery: Y.doccirrus.filtering.models.edmpdelivery.processQuery,
            processAggregation: Y.doccirrus.filtering.models.edmpdelivery.processAggregation,


            name: NAME
        };

    },
    '0.0.1', {requires: ['edmp-utils']}
);
