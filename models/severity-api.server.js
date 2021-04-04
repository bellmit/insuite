/*global YUI */
YUI.add( 'severity-api', function( Y, NAME ) {
    'use strict';

    const
        {formatPromiseResult} = require( 'dc-core' ).utils;

    /**
     * @method getSeveritySorted
     * @public
     *
     * return severity collection sorted by predefined _ids
     *
     * @param {Object} user
     * @param {Object} query
     * @param {Object} options
     * @param {Function} callback
     *
     * @returns {Function} callback  - array or severity records
     */
    async function getSeveritySorted( args ) {
        Y.log('Entering Y.doccirrus.api.severity.getSeveritySorted', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.severity.getSeveritySorted');
        }
        const { user, query, options, callback } = args;
        let [err, results] = await formatPromiseResult(
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'severity',
                query,
                options: {...options, sort: {_id: 1 } }
            } )
        );
        if( err ){
            Y.log( `getSeveritySorted: Error on getting severity sorted ${err.stack || err}`, 'error', NAME );
            return callback( err );
        }
        callback( null, results );
    }

    Y.namespace( 'doccirrus.api' ).severity = {

        name: NAME,
        get: getSeveritySorted
    };

}, '0.0.1', {
    requires: [
    ]
} );
