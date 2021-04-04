/*global YUI */

YUI.add( 'admin-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function updateLanguage( user, admin, callback ) {
            if ( Y.doccirrus.schemas.admin.getLanguageId() === admin._id.toString() ) {
                Y.doccirrus.i18n.language = admin.language;
            }
            callback( null, admin );
        }

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            post: [{
                run: [ updateLanguage ],
                forAction: 'write'
            }],
            name: NAME
        };
    },
    '0.0.1',
    {
        requires: [
            'doccirrus'
        ]
    }
);
