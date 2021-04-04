/*global YUI */


YUI.add( 'contact-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            audit: {},
            name: NAME
        };
    },
    '0.0.1',
    {
        requires: []
    }
);
