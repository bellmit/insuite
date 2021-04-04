/*jslint node:true, nomen:true*/
/*global YUI */
YUI.add( 'InStockMojit', function( Y, NAME ) {
        Y.namespace( 'mojito.controllers' )[NAME] = {

            inStockMojit: function( ac ) {
                ac.assets.addCss( './css/InStockMojit.css' );

                var
                    request = ac.http.getRequest();

                if( !Y.doccirrus.auth.hasSectionAccess( request && request.user, 'InStockMojit.inStock' ) ) {
                    Y.log( 'No admin/controller account... aborting' );
                    Y.doccirrus.utils.redirect( '/', ac );
                }
                else {
                    ac.done( {}, {} );
                }

            }
        };
    },
    '0.0.1', {
        requires: [
            'mojito',
            'mojito-http-addon',
            'mojito-assets-addon',
            'mojito-params-addon',
            'mojito-intl-addon',
            'dcmedia-fonts',
            'dcauth'
        ]
    }
);
