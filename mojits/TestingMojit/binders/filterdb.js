/*jslint anon:true, sloppy:true, nomen:true*/

/*global alert, console, Y, YUI, $, document, html2canvas, atob, XMLHttpRequest, FormTemplate, node, jQuery, prompt,
 FormEditorMojit_FormTemplate */

YUI.add('TestingMojitBinderFilterDb', function(Y, NAME) {

        /**
         * The TestingMojitBinderFilterDb module.
         *
         * @module TestingMojitBinderFilterDb
         */

        'use strict';

        /**
         * @class FormEditorMojitBinderIndex
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */

            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {
                Y.log('Binding FilterDb page');
                this.node = node;

                function onReportLoaded(report) {
                    $('#divReport').html('<pre>' + report + '</pre>');
                }

                $('#btnFilterDatabase').on('click', function onFilterDbClick() {

                    $.ajax(
                        {
                            type: 'GET',
                            xhrFields: {
                                withCredentials: true
                            },
                            url: Y.doccirrus.infras.getPrivateURL( '/r/none/?action=applyfiltertodb' ),
                            success: onReportLoaded,
                            error: onReportLoaded
                        }
                    );

                });

            }
        };

    },
    '0.0.1',
    {
        requires: [
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',
            'dcforms-treeview',
            'dcforms-template'
        ]
    }
);
