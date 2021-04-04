/*global YUI */

YUI.add( 'reportingjob-api', function( Y, NAME ) {

        const
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            permissionDenied = new Y.doccirrus.commonerrors.DCError( 403, {message: 'Access forbidden'} );


        Y.namespace( 'doccirrus.api' ).reportingjob = {

            name: NAME,

            /**
             * @method outputCsv
             *
             * @param {Object}      args
             * @param {Object}      args.req
             * @param {Object}      args.req.body
             * @param {String}      args.req.body.insightConfigId
             * @param {Function}    args.callback
             * @returns {Promise<Object>}
             */
            outputCsv: async function( args ) {

                Y.log( 'Entering Y.doccirrus.api.reportingjob.outputCsv', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.reportingjob.outputCsv' );
                }

                const
                    params = args.req && args.req.body,
                    hasLicense = await Y.doccirrus.licmgr.hasSolLicense( 'csvexport' );

                let
                    err,
                    response;

                if( !hasLicense ) {
                    Y.log( 'outputCsv: No license found for csvexport, aborting request', 'warn', NAME );
                    return handleResult( permissionDenied, undefined, args.callback );
                }

                if( !params.insightConfigId ) {
                    Y.log( 'outputCsv: Missing required parameter: insightConfigId', 'warn', NAME );
                    err = new Y.doccirrus.errors.rest( 400, 'Missing required parameter: insightConfigId' );
                    return handleResult( err, null, args.callback );
                }

                [err, response] = await formatPromiseResult( Y.doccirrus.insight2.csv.createCSVFromCursor( args ) );

                if( err ) {

                    // In case the error is not a standard http error, convert it to one and hide irrelevant message details.
                    if( 'string' === typeof err.code ) {
                        switch( err.code ) {
                            case '25006':
                                err = new Y.doccirrus.commonerrors.DCError( 404, {
                                    message: 'Unable to find matching report for requested insightConfigId.',
                                    data: {error: err}
                                } );
                                break;
                            case '27000':
                                err = new Y.doccirrus.commonerrors.DCError( 400, {
                                    message: 'Invalid value for insightConfigId.',
                                    data: {error: err}
                                } );
                                break;
                            case 'EACCES':
                                err = new Y.doccirrus.commonerrors.DCError( 403, {
                                    message: 'No permission to write file.',
                                    data: {error: err}
                                } );
                                break;
                            case 'ENOENT':
                                err = new Y.doccirrus.commonerrors.DCError( 400, {
                                    message: 'Filename leads to non existing path.',
                                    data: {error: err}
                                } );
                                break;
                            default:
                                err = new Y.doccirrus.commonerrors.DCError( 500, {
                                    message: 'Something went wrong.',
                                    data: {error: err}
                                } );
                        }
                    }

                    return handleResult( err, null, args.callback );
                }

                return handleResult( null, [response], args.callback );
            }

        };
    },
    '0.0.1', {
        requires: [
            'csv-utils',
            'v_reportingjob-schema',
            'dclicmgr'
        ]
    }
);
