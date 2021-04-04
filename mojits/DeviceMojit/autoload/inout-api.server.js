/*
 @user: jm
 @date: 2015-11-05
 */


/*global YUI */
YUI.add('inout',
    function( Y, NAME ) {

        /**
         * @module pcsc
         */
        
        //var util = require( 'util' );
        
        function assignCardInfoToIdentity( args ) {
            Y.log('Entering Y.doccirrus.api.inout.assignCardInfoToIdentity', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.inout.assignCardInfoToIdentity');
            }
            var ip = args.user.ip;
            var identity = args.originalParams.identityId;
            Y.doccirrus.ipc.sendAsync( "getPCSCReaderDataByIp", {ip: ip}, function(err,res){
                if (err) {
                    args.callback(err);
                } else if (res) {
                    var user = Y.doccirrus.auth.getSUForTenant( args.user.tenantId );//eslint-disable-line no-inner-declarations
                    var uid = res.uid;//eslint-disable-line no-inner-declarations
                    //check if key is alredy used
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: "identity",
                        action: "get",
                        query: {
                            cardKey: uid
                        }
                    }, function( err, res ) {
                        if (err) {
                            args.callback(err);
                        } else {
                            if (res.length > 0) {
                                args.callback(Y.doccirrus.errors.rest(13210));
                            } else {
                                var cardKeyData = {//eslint-disable-line no-inner-declarations
                                    cardKey: uid
                                };
                                Y.doccirrus.filters.cleanDbObject( cardKeyData );
                                Y.doccirrus.mongodb.runDb({
                                    user: user,
                                    model: "identity",
                                    action: "put",
                                    query: {
                                        _id: identity
                                    },
                                    fields: ["cardKey"],
                                    data: cardKeyData
                                }, function(err) {
                                    if (err) {
                                        args.callback(err);
                                    } else {
                                        args.callback(null, {identity: identity});
                                    }
                                    
                                });
                            }
                        }
                    } );
                } else {
                    args.callback(Y.doccirrus.errors.rest(13200));
                }
                
            } );
        }
        
        Y.namespace( 'doccirrus.api' ).inout = {
            /**
             * @property name
             * @type {String}
             * @default pcsc
             * @protected
             */
            name: NAME,
            assignCardInfoToIdentity: assignCardInfoToIdentity
        };
    },
    '0.0.1', {requires: []}
);
