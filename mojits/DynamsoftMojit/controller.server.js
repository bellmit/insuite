/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'DynamsoftMojit', function( Y, NAME ) {

    Y.namespace( 'mojito.controllers' )[NAME] = {

        dynamsoftIframe: function( ac ) {

            ac.done( {}, {
                noTopMenu: true,
                http: {}
            } );

        }
    };
}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-http-addon',
        'mojito-config-addon',
        'mojito-assets-addon',
        'mojito-params-addon',
        'mojito-intl-addon'
    ]
} );
