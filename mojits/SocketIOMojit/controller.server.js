/**
 * User: oliversieweke
 * Date: 11.10.18  16:43
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/

YUI.add( 'SocketIOMojit', function( Y, NAME ) {

        Y.namespace( 'mojito.controllers' )[NAME] = {
            socketIO: function( ac ) {
                if( !Y.doccirrus.auth.hasSectionAccess( ac.http.getRequest() && ac.http.getRequest().user, 'SocketIOMojit.socketIO' ) ) {
                    Y.log( 'No support account... aborting' );
                    Y.doccirrus.utils.redirect( '/', ac );
                } else {
                    ac.done( {}, {http: {}, title: "Socket IO"} );
                }
            }
        };

    },
    '0.0.1', {
        requires: [
            'mojito',
            'mojito-assets-addon',
            'mojito-params-addon',
            'mojito-intl-addon',
            'mojito-http-addon',
            'mojito-data-addon',
            'dcauth'
        ]
    }
);
