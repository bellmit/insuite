/**
 * User: ma
 * Date: 26/06/2014  09:45
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'dummy-api', function( Y, NAME ) {

        Y.namespace( 'doccirrus.api' ).dummy = {

            name: NAME,

            /**
             * a custom action called via /1/dummy/:myCustomAction?...
             * @param   {Object}            args
             * @param   {Object}            args.user
             * @param   {Function}          args.callback
             */
            testSubDocValidation: function( args ) {
                Y.log('Entering Y.doccirrus.api.dummy.testSubDocValidation', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.dummy.testSubDocValidation');
                }
                var
                    callback = args.callback,
                    dummyData = {skipcheck_: true};
                dummyData.firstname = dummyData.lastname = 'kooni';
                dummyData.age = 30;
                dummyData.emails = [
                    {
                        email: 'ma@doc-cirrus.com'
                    },
                    {
                        email: 'ma@doc-cirrus.com'
                    }
                ];

                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    action: 'post',
                    model: 'dummy',
                    data: dummyData,
                    callback: function( err, result ) {
                        callback( err.message || err, result );
                    }
                } );
            }

        };

    },
    '0.0.1', {requires: ['dummy-schema']}
);
