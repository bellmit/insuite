/**
 * User: dcdev
 * Date: 4/26/19  11:50 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */



YUI.add( 'gridfs-api', function( Y, NAME ) {
    const { formatPromiseResult } = require( 'dc-core' ).utils;

    const GET = async ( args ) => {
        Y.log('Entering Y.doccirrus.api.gridfs.GET', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.gridfs.GET');
        }
        let err, result;
        const { user, query, callback } = args;
        [ err, result ] = await formatPromiseResult(
            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'fs.files',
                'query': query
            } )
        );
        if ( err ) {
            Y.log( `Error while tried to get fs.files via query ${JSON.stringify( query )}. Err: ${err}`, 'error', NAME );
            return callback( err );
        }
        return callback( null, result );
    };

    Y.namespace( 'doccirrus.api' ).gridfs = {
        name: NAME,
        getFsFiles: GET
    };
}, '0.0.1', { requires: [] } );
