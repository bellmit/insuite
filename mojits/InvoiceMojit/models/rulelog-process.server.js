/*global YUI */


YUI.add( 'rulelog-process', function( Y, NAME ) {

        function updateInvoicesOnChange( user, log, callback ) {

            if (!log.factId) {
                return callback( null, log );
            }

            Y.log( 'rulelog-process updateInvoicesOnChange ' + log.factId, 'debug', NAME );


            Y.doccirrus.invoicelogutils.validateInvoicesForActivities( user, log.factId, (err) => {
                if ( err ) {
                    Y.log( 'Error updating Invoices ' + err.message, 'err', NAME );
                }
                callback( null, log );
            });

        }

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            post: [
                {run: [
                    updateInvoicesOnChange
                ], forAction: 'write'},
                {
                    run: [
                        updateInvoicesOnChange
                    ], forAction: 'delete'
                }
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: ['rulelog-schema', 'activity-api']}
);
