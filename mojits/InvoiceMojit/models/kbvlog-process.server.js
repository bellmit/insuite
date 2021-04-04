/*global YUI */


// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

YUI.add( 'kbvlog-process', function( Y, NAME ) {

        const
            DCError = Y.doccirrus.commonerrors.DCError,
            Promise = require( 'bluebird' ),
            {formatPromiseResult} = require('dc-core').utils,
            cleanFiles = Promise.promisify( Y.doccirrus.invoicelogutils.cleanFiles );

        async function updateActivitiesOnAcceptedState( user, log, callback ) {

            Y.log( 'kbvlog-process updateActivitiesOnStateChange status: ' + log.status, 'info', NAME );

            //in addition move all sub location of super location to state of super location
            if( log.slType === 'super' && ['ACCEPTED', 'REPLACED'].includes(log.status) && !log.test ){
                let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'update',
                    model: 'kbvlog',
                    data: { $set: {status: log.status}},
                    query: {
                        slLogId: log._id.toString()
                    },
                    options: {
                        multi: true
                    }
                } ) );
                if( err ) {
                    Y.log( `updateActivitiesOnAcceptedState: Error accepting sub location: ${err.stack || err}`, 'warn', NAME );
                }
            }

            if( 'ACCEPTED' !== log.status || log.test ) {
                callback( null, log );
                return;
            }

            Y.doccirrus.invoicelogutils.billInvoiceLog( user, log, true ).then( function() {
                return new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.kbvlog.createLogs( {
                        user: user,
                        originalParams: log.slType === 'super' ? {
                            fromSuperLocationId: log.mainLocationId
                        } : {
                            mainLocationId: log.mainLocationId
                        },
                        callback: ( err, result ) => {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result );
                            }
                        }
                    } );
                } );
            } ).then( () => {
                callback( null, log );
            } ).catch( err => {
                Y.log( 'could not bill invoicelog' + (err && err.stack || err), 'error', NAME );
                callback( null, log );
            } );
        }

        function deleteDeps( user, log, callback ) {

            Y.doccirrus.invoicelogutils.cleanInvoiceEntries( user, log._id && log._id.toString(), true ).then( () => {
                const fileIds = Y.doccirrus.invoicelogutils.collectFileIds( log );

                if( !fileIds.length ) {
                    return;
                }

                Y.log( 'attempting to delete ' + fileIds.length + ' invoice log file ids', 'debug', NAME );
                return cleanFiles( user, fileIds );
            } ).then( () => callback( null ) ).catch( err => callback( err ) );

        }

        function checkIfDeletionAllowed( user, log, callback ) {
            const deletionAllowed = -1 !== ['CREATED', 'VALID', 'VALIDATION_ERR', 'CRYPT_ERR', 'ENCRYPTED', 'INVALID', 'MERGING_ERR', 'MERGED'].indexOf( log.status );
            if( !deletionAllowed ) {
                return callback( DCError( 2034 ) );
            }
            callback();
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
                        Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'kbvlog' ),
                        Y.doccirrus.filtering.models.kbvlog.resultFilters[0]
                    ], forAction: 'write'
                },
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'kbvlog' ),
                        checkIfDeletionAllowed,
                        Y.doccirrus.filtering.models.kbvlog.resultFilters[0]
                    ], forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [
                        updateActivitiesOnAcceptedState
                    ], forAction: 'write'
                },
                {
                    run: [
                        deleteDeps
                    ], forAction: 'delete'
                }
            ],
            audit: {
                descrFn: function( data ) {
                    var
                        tmp,
                        res = '';
                    if( data.year && data.quarter ) {
                        res += data.quarter + '/' + data.year;
                    }
                    if( data.commercialNo ) {
                        res += res.length ? ' ' + data.commercialNo : data.commercialNo;
                    }
                    if( data.status ) {
                        tmp = Y.doccirrus.schemaloader.getEnumListTranslation( 'kbvlog', 'Status_E', data.status, '-de', '' );
                        res += res.length ? ' ' + tmp : tmp;
                    }

                    return res || data._id;
                }

            },

            deleteDeps: deleteDeps,

            processQuery: Y.doccirrus.filtering.models.kbvlog.processQuery,
            processAggregation: Y.doccirrus.filtering.models.kbvlog.processAggregation,

            name: NAME
        };

    },
    '0.0.1', {requires: ['kbvlog-schema', 'activity-api', 'dcinvoicelogutils', 'kbvlog-api']}
);
