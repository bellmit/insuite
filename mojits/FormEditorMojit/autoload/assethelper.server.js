/**
 *  A central place to put FEM helper methods which may be used by other mojits
 *
 *  Motivation for writing this is to keep the list of client-side components in a single tidy place, may extend
 *  to get some of the cruft out of the top of ../controller.server.js
 *
 *  Uses the YUI namespace.
 *
 *  @author: strix
 *  @date: 2013 December
 */



/*jslint anon:true, nomen:true*/
/*global YUI*/



YUI.add( 'dcforms-assethelper', function( Y /*, NAME */ ) {

        var

        //  Set of CSS accessory files used by Form Editor and 3rd party components

            editorCssFiles = [
                //  for editor layout / affix
                '/static/FormEditorMojit/assets/css/formeditor.css',

                //  for Templates tree
                '/static/FormEditorMojit/assets/css/treeview.css',

                //  for color picker
                '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.css'
            ],

        //  Set of Javascript/YUI components used by editor

            editorJsFiles = [
                '/static/FormEditorMojit/assets/js/translation-yui.js',     //  <- DEPRECATED - to be replaced

                //  helper objects and views
                '/static/FormEditorMojit/assets/js/pdf-yui.js',

                //  extended controls for editor
                '/static/FormEditorMojit/assets/js/reorderdialog-yui.js',

                //  new version of minicolors used by all mojits, no longer specific to form editor
                '/static/dcbaseapp/assets/lib/jquery/minicolors/2.2.6/jquery.minicolors.js',

                //  data mappers (may be dynamically loaded in future)
                '/static/FormEditorMojit/assets/mappers/dcforms-map-plain.js'
            ];

        /**
         *  Add form editor components to current action context
         *
         *  @method addFormEditorAssets
         *  @param  ac  {Object}    A direct mojito frame ac, not a REST ac
         */

        function addFormEditorAssets(ac) {
            var i;

            for (i = 0; i < editorCssFiles.length; i++) {
                ac.assets.addCss( editorCssFiles[i] );
            }

            for (i = 0; i < editorJsFiles.length; i++) {
                ac.assets.addJs( editorJsFiles[i] );
            }
        }
        /*
         *  Share this with the rest of mojito
         */

        Y.namespace( 'doccirrus.forms' ).assethelper = addFormEditorAssets;

    },
    '0.0.1', {requires: [ 'dctempmodeller' ]}
);