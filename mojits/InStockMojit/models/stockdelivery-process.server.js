
/*global YUI */


YUI.add( 'stockdelivery-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class AuthProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            audit: {
                /**
                 * optional:  true = in addition to regular auditing note down actions
                 * on this model that were attempted as well as ones that failed.
                 * Descr. in this case will always be "Versuch".
                 *
                 * false = note down only things that actually took place,
                 * not attempts that failed
                 */
                noteAttempt: false,

                /**
                 * optional: here we can override what is shown in the audit log description
                 * only used when the action succeeds (see noteAttempt)
                 *
                 * @param {Object} data
                 * @returns {*|string|string}
                 */
                descrFn: function(data) {
                    return 'StockDelivery item _id=' + data._id;
                }

            },

            name: NAME
        };

    },
    '0.0.1', {requires: ['stockdelivery-schema']}
);

