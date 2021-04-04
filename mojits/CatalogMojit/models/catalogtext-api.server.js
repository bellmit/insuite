/**
 * User: pi
 * Date: 03/09/2014  15:13
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'catalogtext-api', function( Y, NAME ) {

        function getCatalogText( args ) {
            Y.log('Entering Y.doccirrus.api.catalogtext.getCatalogText', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.catalogtext.getCatalogText');
            }
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'catalogtext',
                user: args.user,
                query: args.query,
                options: args.options
            }, args.callback );
        }

        Y.namespace( 'doccirrus.api' ).catalogtext = {
            name: NAME,
            get: getCatalogText
        };

    },
    '0.0.1', { requires: [] }
);
