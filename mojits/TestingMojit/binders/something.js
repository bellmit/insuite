/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
/*global console, YUI, ko */

YUI.add('TestingMojitBinderSomething', function(Y, NAME) {
/**
 * The FormEditorMojitBinderIndex module.
 *
 * @module FormEditorMojitBinderIndex
 */

    'use strict';

	Y.log('YUI.add FormEditorMojitBinderFormsTest with NAMEs ' + NAME, 'info');

    /**
     * Constructor for the FormEditorMojitBinderIndex class.
     *
     * @class FormEditorMojitBinderIndex
     * @constructor
     */

    Y.namespace('mojito.binders')[NAME] = {


        /*
         *  Public properties
         */

        template: {},

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */

        init: function(mojitProxy) {
            //Y.log('FormEditorMojitBinderForms::Init');
            this.mojitProxy = mojitProxy;
        },

        /**
         *	The binder method, invoked to allow the mojit to attach DOM event
         *	handlers.
         *
         *	@param node {Node} The DOM node to which this mojit is attached.
         */

        bind: function() {
            Y.log('Binding test form');
            console.log( ko );
        }
    };

},
'0.0.1',
{
    requires: [
        'dcforms-utils',
        'dcforms-reducedschema',
        'dcforms-template',
        'dcforms-formstree',
        'dcforms-categories',

        'event-mouseenter',
        'mojito-client',
        'intl',
        'mojito-intl-addon',
        'mojito-rest-lib'
    ]
}
);
