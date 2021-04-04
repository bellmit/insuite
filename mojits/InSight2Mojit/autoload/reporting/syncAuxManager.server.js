/*global YUI*/



YUI.add( 'syncAuxManager', function( Y ) {

    var SyncAux = Y.doccirrus.insight2.SyncAux;

    /***
     * Manager for SyncAux
     * @type {{auxHook: syncAuxManager.auxHook}}
     */
    var syncAuxManager = {
        auxHook: function( auxObj, modelName, user ) {
            var sync = new SyncAux( auxObj, modelName, user );

            if( 'document' !== modelName ) {
                sync.queueInsert();
            } else {
                sync.run();
            }

        }
    };

    Y.namespace( 'doccirrus.insight2' ).syncAuxManager = syncAuxManager;

}, '0.0.1', {
    requires: [
        'SyncAux'
    ]
} );