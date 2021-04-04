/**
 * User: do
 * Date: 07/04/15  16:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'mirrorcasefolder-api', function( Y, NAME ) {

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class casefolder
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).mirrorcasefolder = {

            name: NAME,

            setActiveTab: function( args ) {
                Y.log('Entering Y.doccirrus.api.mirrorcasefolder.setActiveTab', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mirrorcasefolder.setActiveTab');
                }
                var user = args.user,
                    params = args.originalParams,
                    callback = args.callback;

                function modelCb( err, patientModel ) {
                    if( err ) {
                        Y.log( 'could not get patientModel to set active tab for patient ' + params.patientId + ' and casefolder ' + params.caseFolderId, 'error', NAME );
                        return callback( err );
                    }

                    patientModel.mongoose.update( {
                        _id: params.patientId
                    }, {
                        activeCaseFolderId: params.caseFolderId
                    }, callback );

                }

                if( !params.patientId || !params.caseFolderId ) {
                    callback( new Error( 'insufficient arguments' ) );
                    return;
                }

                Y.doccirrus.mongodb.getModel( user, 'mirrorpatient', true, modelCb );
            }
        };

    },
    '0.0.1', {requires: ['dcauth', 'admin-schema', 'activity-schema']}
);
