/**
 * User: do
 * Date: 20/02/18  16:51
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'crlog-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        // workaround @MOJ-6625
        function setIsModified( user, crlog, callback ) {
            crlog.wasNew = crlog.isNew;
            crlog.statusIsModified = !crlog.isNew && crlog.isModified( 'status' );
            callback( null, crlog );
        }

        function notifyClient( user, crlog, callback ) {
            if( crlog.statusIsModified ) {
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: user.identityId,
                    event: 'crLogStatusChange',
                    msg: {
                        data: crlog
                    }
                } );
            }
            callback();
        }

        function startProcessing( user, crlog, callback ) {
            callback();
            if( crlog.wasNew ) {
                Y.doccirrus.api.crlog.server.processCardRead( ({user, crLogId: crlog._id}) ).catch( err => {
                    Y.log( `could not start initial card data process ${err && err.stack}`, 'error', NAME );
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: user.identityId,
                        event: 'crLogStatusChange',
                        msg: {
                            data: crlog
                        }
                    } );
                } );
            }
        }

        /**
         * @class crlogProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            name: NAME,

            pre: [
                {
                    run: [
                        setIsModified
                    ], forAction: 'write'
                }],
            post: [
                {
                    run: [
                        startProcessing,
                        notifyClient
                    ], forAction: 'write'
                }
            ]
        };

    },
    '0.0.1', {requires: []}
);
