/*global YUI*/


YUI.add( 'InPacsAdminMojit', function( Y, NAME ) {

    Y.namespace( 'mojito.controllers' )[NAME] = {

        inPacsAdminMojit: function( ac ) {

            if( !Y.doccirrus.auth.hasModuleAccess( ac.http.getRequest() && ac.http.getRequest().user, NAME ) ) {
                Y.log( 'No license "inPacs" ... aborting' );
                Y.doccirrus.utils.redirect( `/license?licenseType=${Y.doccirrus.auth.getRequiredLicense( NAME )}`, ac );
                return;
            }

            ac.assets.addJs( './js/prism.js', 'bottom' );
            ac.assets.addJs( './js/codeflask.min.js', 'bottom' );

            ac.assets.addCss( './css/prism.min.css' );
            ac.assets.addCss( './css/codeflask.min.css' );
            ac.assets.addCss( './css/InPacsAdminMojit.css' );

            ac.done( {
                status: 'ok',
                data: null
            }, { http: {} } );
        }

    };
}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-assets-addon',
        'mojito-http-addon',
        'mojito-models-addon'
    ]
} );
