/**
 * User: oliversieweke
 * Date: 23.11.18  15:34
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'tarmedlog-process', function( Y, NAME ) {
        const DCError = Y.doccirrus.commonerrors.DCError;

        function updateActivitiesOnAcceptedState( user, log, callback ) {
            Y.log( `tarmedlog-process updateActivitiesOnStateChange status: ${log.status}`, 'info', NAME );

            if( 'ACCEPTED' !== log.status ) {
                return callback( null, log );
            }
            Y.doccirrus.invoicelogutils.billInvoiceLog( user, log, false )
                .then( function() {
                    return callback( null, log );
                } )
                .catch( function( err ) {
                    Y.log( `could not bill invoicelog ${(err && err.stack || err)}`, 'error', NAME );
                    return callback( null, log );
                } );
        }

        function checkIfDeletionAllowed( user, log, callback ) {
            const DELETION_ALLOWED_STATES = new Set( ['CREATED', 'CANCELED', 'VALID', 'VALIDATION_ERR', 'CRYPT_ERR', 'ENCRYPTED', 'INVALID', 'INVOICED_APPROVED'] );
            return DELETION_ALLOWED_STATES.has( log.status ) ? callback() : callback( DCError( 2034 ) );
        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        Y.doccirrus.filtering.models.tarmedlog.resultFilters[0]
                    ],
                    forAction: 'write'
                },
                {
                    run: [
                        checkIfDeletionAllowed,
                        Y.doccirrus.filtering.models.tarmedlog.resultFilters[0]
                    ],
                    forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [
                        updateActivitiesOnAcceptedState
                    ],
                    forAction: 'write'
                },
                {
                    run: [
                        Y.doccirrus.schemaprocess.kbvlog.deleteDeps
                    ],
                    forAction: 'delete'
                }
            ],
            audit: {
                descrFn: function( data ) {
                    var tmp;
                    var res = '';

                    if( data.commercialNo ) {
                        res += data.commercialNo;
                    }
                    if( data.status ) {
                        tmp = Y.doccirrus.schemaloader.getEnumListTranslation( 'tarmedlog', 'Status_E', data.status, '-de', '' );
                        res += res.length ? ` ${tmp}` : tmp;
                    }

                    return res || data._id;
                }

            },

            processQuery: Y.doccirrus.filtering.models.tarmedlog.processQuery,
            processAggregation: Y.doccirrus.filtering.models.tarmedlog.processAggregation,

            name: NAME
        };

    },
    '0.0.1', {requires: ['tarmedlog-schema', 'activity-api', 'kbvlog-process', 'dcinvoicelogutils']}
);

