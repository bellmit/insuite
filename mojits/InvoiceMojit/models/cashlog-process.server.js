/*global YUI */


YUI.add( 'cashlog-process', function( Y, NAME ) {

        function updateInvoiceOnChange( user, log, callback ) {
            Y.doccirrus.invoicelogutils.getInvoiceActivities( user, log, (err, activityIDs) => {
                if (err) {
                    //it is correct for the log entry that was no validated yet
                    if( err.message !== 'no invoice entry of type header found' ){
                        Y.log( 'could not get activities for invoicelog ' + err, 'error', NAME );
                    }
                    return callback( null, log );
                }
                if (!activityIDs || activityIDs.length === 0 ) {
                    return callback( null, log );
                }

                Y.doccirrus.invoicelogutils.validateInvoicesForActivities( user, activityIDs, (err) => {
                    if ( err ) {
                        Y.log( 'Error updating Invoices on cashlog ' + err.message, 'err', NAME );
                    }
                    callback( null, log );
                });

            } );
        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'cashlog' ),
                    Y.doccirrus.filtering.models.pvslog.resultFilters[0]
                    ], forAction: 'write'},
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'cashlog' ),
                        Y.doccirrus.filtering.models.pvslog.resultFilters[0]
                    ], forAction: 'delete'}
            ],
            post: [
                {run: [
                    updateInvoiceOnChange
                ], forAction: 'write'},
                {
                    run: [
                        Y.doccirrus.schemaprocess.kbvlog.deleteDeps
                    ], forAction: 'delete'
                }
            ],
            audit: {
                descrFn: function( data ) {
                    var
                        tmp,
                        res = '';
                    if( data.commercialNo ) {
                        res += res.length ? ' ' + data.commercialNo : data.commercialNo;
                    }
                    if( data.status ) {
                        tmp = Y.doccirrus.schemaloader.getEnumListTranslation( 'pvslog', 'Status_E', data.status, '-de', '' );
                        res += res.length ? ' ' + tmp : tmp;
                    }

                    return res || data._id;
                }

            },

            processQuery: Y.doccirrus.filtering.models.pvslog.processQuery,
            processAggregation: Y.doccirrus.filtering.models.pvslog.processAggregation,

            name: NAME
        };

    },
    '0.0.1', {requires: ['pvslog-schema', 'activity-api', 'dcinvoicelogutils', 'kbvlog-process', 'cashlog-api']}
);
