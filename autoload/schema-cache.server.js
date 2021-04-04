/*global YUI*/
YUI.add( 'schema-cache', function( Y ) {
        // Currently we just use in memory caching on the server
        Y.namespace( 'doccirrus.schema' ).Cache = false;
    },
    '0.0.1',
    {
        requires: []
    }
);