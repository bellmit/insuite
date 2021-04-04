/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, $, ko */

YUI.add('FormEditorMojitBinderFormsTest', function(Y, NAME) {
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

        bind: function(node) {
            var i18n = Y.doccirrus.i18n;
            Y.log('Binding test form');
            this.node = node;
            Y.Intl.setLang('FormEditorMojit', $('#YUI_SERVER_LANG').val());
            Y.log('Set language from hidden element: ' + Y.Intl.getLang('FormEditorMojit'), 'info', NAME);

            //  some definitions

            var
                userId = Y.doccirrus.auth.getUserId(),
                //instanceId = userId + '_forms_Test_Test2.form',
                instanceId = userId + '_forms_Test_Start.form',
                il8nDict = Y.Intl.get('FormEditorMojit'),
                myNode = node.one('#divFormsEmbed');

            Y.dcforms.il8nDict = il8nDict;                  //  used by various components

            myNode.passToBinder = {
                'instanceId': instanceId
            };

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'forms_embed',
                'FormEditorMojit',
                { },
                myNode,
                function() {
                    Y.log('Editor loaded', 'info', NAME);
                }
            );

            function FormsTestVM() {
                var
                    self = this;

                self.loadingI18n =  i18n('FormEditorMojit.title.status.LOADING');
                self.pleaseWaitI18n = i18n('FormEditorMojit.title.status.PLEASE_WAIT');
            }
            ko.applyBindings( new FormsTestVM(), document.querySelector( '#divModalPopup' ) );
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
        'dcauth',

        'event-mouseenter',
        'mojito-client',
        'intl',
        'mojito-intl-addon',
        'mojito-rest-lib'
    ]
}
);
