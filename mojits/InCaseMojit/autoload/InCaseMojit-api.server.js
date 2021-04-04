/*global YUI */
YUI.add(
    'InCaseMojit-api',
    function( Y, NAME ) {
        
        const zlib = require('zlib');
        const  { handleResult, formatPromiseResult } = require( 'dc-core' ).utils;
        /**
         * Gets vat list from config file
         * @param {Object} args
         * @param {Function} args.callback
         */
        function getVatList( args ) {
            var
                callback = args.callback;
            callback( null, Y.doccirrus.vat.getList() );
        }
        /**
         * Zip patient data and convert into CHMED16A1
         * docs : https://confluence.intra.doc-cirrus.com/display/SD/HCI+integration
         *
         * @param {Object} args
         * @param {string} args.data.medplan
         */
        function getCHMED( args ) {
            let buffer = new Buffer.from(JSON.stringify(args.data.medplan));
                 zlib.gzip(buffer, (err, buff) => {
                      args.callback(err, `CHMED16A1${buff.toString('base64')}`);
                  });
        }

        /**
         * Unzip CHMED string
         * docs : https://confluence.intra.doc-cirrus.com/display/SD/HCI+integration
         * @param {Object} args
         * @param {string} args.data.chmed  -chmed string
         * @returns {Promise<Object|*>}
         */
        async  function  unzipCHMED (args) {
            const {callback} = args;
            let err, result, medplan, {chmed} = args.data;

            if (!chmed || chmed.indexOf( "CHMED16A1") === -1 ) {
                return handleResult(
                    new Y.doccirrus.commonerrors.DCError( 400, {message: 'Invalid CHMED format'} ),
                    null,
                    callback
                );
            }

            chmed = chmed.replace( "CHMED16A1", "" );

            medplan = new Buffer.from( chmed, 'base64' );
            [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                        zlib.gunzip( medplan, (err, res) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve(res);
                        }
                     );
                }));

            if( err ) {
                Y.log( `Failed to unzip CHMED ${err.stack || err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            result = result ? JSON.parse( result.toString( 'utf8' ) ) : result;
         
            return handleResult( null, result, callback );
        }

        Y.namespace( 'doccirrus.api' ).InCaseMojit = {
            name: NAME,
            getVatList: function( args ) {
                Y.log('Entering Y.doccirrus.api.InCaseMojit.getVatList', 'info', NAME);
                if( args.callback ) {
                    args.callback = require( require( 'path' ).resolve( __dirname, '../../../server/utils/logWrapping.js' ) )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.InCaseMojit.getVatList' );
                }
                getVatList( args );
            },
            getCHMED,
            unzipCHMED
        };

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'dcerror',
            'activity-api',
            'patient-api',
            'casefolder-api'
        ]
    }
);
