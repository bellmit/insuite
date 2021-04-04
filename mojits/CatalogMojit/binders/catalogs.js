/**
 * User: do
 * Date: 18/12/17  16:35
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'CatalogMojitBinder', function( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n;

    Y.namespace( 'mojito.binders' )[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function CatalogMojitBinder_init( mojitProxy ) {
            var self = this;
            self.mojitProxy = mojitProxy;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function CatalogMojitBinder_bind( node ) {
            var
                model = {};

            //change active tab in toplevel menu
            Y.doccirrus.NavBarHeader.setActiveEntry( 'catalogs' );

            model.catalogViewer = ko.observable();
            model.titleCatalogViewerI18n = i18n( 'general.PAGE_TITLE.CATALOG_VIEWER' );

            Y.doccirrus.catalogViewer.create( {catalogShort: 'ICD-10'} ).then( function( catalogViewer ) {
                model.catalogViewer( catalogViewer );
            } );

            ko.applyBindings( model, node.getDOMNode() );
        }
    };

}, '0.0.1', {
    requires: [
        'oop',
        'NavBarHeader',
        'DCRouter',
        'mojito-client',
        'doccirrus',
        'dccommonutils',
        'dcutils',
        'dcutils-uam',
        'dcauth',
        'dcerrortable',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'DCSystemMessages',
        'KoViewModel',
        'KoUI-all',
        'dcschemaloader',
        'catalogViewer'
    ]
} );
