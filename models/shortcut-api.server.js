/*global YUI */
YUI.add( 'shortcut-api', function( Y, NAME ) {
    'use strict';

    var
        async = require( 'async' );

    function saveShortcuts( args ) {
        Y.log('Entering Y.doccirrus.api.shortcut.saveShortcuts', 'info', NAME);
        if (args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.shortcut.saveShortcuts');
        }
        async.each( args.data, function( shortcut, callback ) {
            Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: 'shortcut',
                query: { _id: shortcut._id },
                user: args.user,
                fields: args.fields,
                data: Y.doccirrus.filters.cleanDbObject( shortcut )
            }, callback );
        }, args.callback );
    }

    Y.namespace( 'doccirrus.api' ).shortcut = {

        name: NAME,
        saveShortcuts: saveShortcuts
    };

}, '0.0.1', {
    requires: [
        'settings-api',
        'dashboard-schema',
        'dcerror'
    ]
} );
