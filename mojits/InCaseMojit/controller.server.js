/*global YUI*/

YUI.add( 'InCaseMojit', function( Y, NAME ) {

        Y.namespace( 'mojito.controllers' )[NAME] = {

            inCaseMojit: function( ac ) {
                ac.assets.addJs( '/static/InvoiceMojit/assets/js/knockout_dragdrop.js' );
                ac.assets.addCss( './css/InCaseMojit.css' );
                ac.assets.addCss( '/static/FormEditorMojit/assets/css/treeview.css' );
                ac.assets.addCss( '/static/InvoiceMojit/assets/css/InvoiceMojit.css' );
                //ac.assets.addCss( Y.doccirrus.media.fonts.getCssUrl( ac ) );

                //  MOJ-8938 Add minicolors statically, current build process is breaking this component
                ac.assets.addCss( '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.css' );
                ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.js', 'bottom' );

                ac.assets.addJs( Y.doccirrus.utils.getWorkaroundPath(), 'bottom' );
                ac.assets.addJs( '/static/dcbaseapp/assets/lib/mathjs/mathjs.min.js', 'bottom'  );

                // resizableGrid
                ac.assets.addCss( '/static/dcbaseapp/assets/lib/jquery/resizableGrid/jquery.resizableGrid.css' );
                ac.assets.addJs( '/static/dcbaseapp/assets/lib/jquery/resizableGrid/jquery.resizableGrid.js', 'bottom' );

                ac.done( {
                    status: 'ok',
                    mvprc: Y.doccirrus.auth.isMVPRC() && ( Y.doccirrus.schemas.company.systemTypes.MEDNEO === Y.doccirrus.auth.getSystemType() ),
                    data: null
                }, { http: {}, view: {id: 'inCaseMojitBinder'} } );
            }

        };
    },
    '0.0.1', {
        requires: [
            'mojito',
            'mojito-assets-addon',
            'mojito-params-addon',
            'mojito-intl-addon',
            'dcmedia-fonts',
            'dcauth'
        ]
    }
);
