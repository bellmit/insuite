/**
 * User: pi
 * Date: 16/08/16  10:55
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'asvlog-api', function( Y, NAME ) {

        function _post( { user, data, callback } ) {
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'asvlog',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( data ),
                callback
            } );
        }

        /**
         * @method post
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} [args.data.conFileContent] if passed - con file will saved. base64
         * @param {String} [args.data.pdfFileContent] if passed - pdf file will saved. base64
         * @param {Function} args.callback
         * @return {Function} callback
         */
        function post( args ) {
            let 
                { user, data, callback } = args,
                async = require( 'async' ),
                ownerCollection = 'asvlog', 
                ownerId = (new require('mongoose').Types.ObjectId()).toString();
            if( !data ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid data' } ) );
            }
            async.parallel({
                conFile(done){
                    if( data.conFileContent ){
                        Y.doccirrus.media.pdf.importDocumentFromBase64({
                            user,
                            data: {
                                base64: data.conFileContent,
                                fileName: data.conFileName,
                                ownerCollection,
                                ownerId
                            },
                            callback: done
                        });
                    } else {
                        setImmediate( done );
                    }
                },
                pdfFile(done){
                    if( data.pdfFileContent ){
                        Y.doccirrus.media.pdf.importDocumentFromBase64({
                            user,
                            data: {
                                base64: data.pdfFileContent,
                                fileName: data.pdfFileName,
                                ownerCollection,
                                ownerId
                            },
                            callback: done
                        });
                    } else {
                        setImmediate( done );
                    }
                }
            }, function(err, result){
                if(err){
                    return callback(err);
                }
                data.conFileId = result.conFile && result.conFile._id.toString();
                data.pdfFileId = result.pdfFile && result.pdfFile._id.toString();
                data._id = ownerId;
                _post({
                    user,
                    data,
                    callback
                });
            });
            
        }

        Y.namespace( 'doccirrus.api' ).asvlog = {

            name: NAME,

            post: function( args ) {
                Y.log('Entering Y.doccirrus.api.asvlog.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.asvlog.post');
                }
                post( args );
            }

        };
    },
    '0.0.1', { requires: [

    ] }
);
