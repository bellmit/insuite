/*
 * Copyright (c) 2015 Doc Cirrus GmbH
 * all rights reserved.
 *
 * jadeLoaded view for setting an alternative form for BFB forms, used when clicent does not have a BFB registration
 */

/*jshint latedef:false */
/*exported _fn */
/*global $, ko */

function _fn(Y, NAME) {
    'use strict';

    var
        myNode,                                 //  YUI/DOM node this was jadeLoaded into
        template,                               //  reference to the currently loaded template

        isInitialized = false,

        eventHandlers = {
            'loaded': onTemplateLoaded
        },

        jq = {};                                //  cached jQuery selectors

    /**
     *  Configure this form to loaded page and (re)bind events
     */

    function initPanel() {
        Y.log('initializing BFB alt selection', 'debug', NAME);

        if(!isInitialized) {
            registerEventHandlers();
        }

        if (template && template.isBFB) {
            jq.container.show();
        } else {
            jq.container.hide();
        }

        Y.dcforms.getFormList('', false, onFormListLoaded);
        jq.me = $('#divBFBAlt');
    }

    /**
     *  Register all event handlers
     */

    function registerEventHandlers() {
        var k;
        for (k in eventHandlers) {
            if (eventHandlers.hasOwnProperty(k)) {
                template.on(k, 'edit_bfb_properties', eventHandlers[k]);
            }
        }
    }

    /**
     *  Unhook event listeners for this panel from template
     */

    function deregisterEventHandlers() {
        if (!template) { return; }
        template.event.off('*', 'edit_bfb_properties');
    }

    /**
     *  Fill this form with values from dcforms-page object
     */

    function updatePanelFromTemplate() {
        if (!isInitialized) {
            return;
        }
        Y.log('Setting bfb controls from dcforms-template');
        jq.sel.val(template.bfbAlternative);
    }

    /**
     *  Update dcforms-page object when this form changes
     */

    function updateTemplateFromPanel() {

        if (!template) {
            Y.log('No form selected, cannot edit pdf options.', 'debug', NAME);
            return;
        }

        template.bfbAlternative = jq.sel.val();
        template.render(Y.dcforms.nullCallback);
        template.autosave(Y.dcforms.nullCallback);

    }

    /**
     *  Raised by the template when user clicks on an abstract page or creates a new one
     *
     *  @param  newTemplate     {Object}    A dcforms-template object
     */

    function onTemplateLoaded(newTemplate) {

        if (!newTemplate || '' === newTemplate) {
            Y.log('No template selected, hiding print options.', 'warn', NAME);
            myNode.hide();
            return;
        }

        //Y.log('Page Selected: ' + selPage.name, 'debug', NAME);
        template = newTemplate;

        initPanel();
        updatePanelFromTemplate();
    }


    //  EVENT HANDLERS

    function onFormListLoaded(err, formsList) {

        if (err) {
            Y.log('Could not load list of forms: ' + JSON.stringify(err), 'warn', NAME);
            return;
        }

        var
            userLang = Y.dcforms.getUserLang(),
            kvPairs = [],
            html = '<option value=""></option>',
            i;

        for (i = 0; i < formsList.length; i++) {
            //  allowing subforms in the list for now, as some forms are incorrectly assigned that way
            //if (false === formsList[i].isSubform) {
                kvPairs.push(
                    {
                        'formId': formsList[i].formId,
                        'formTitle': formsList[i].title[userLang]
                    }
                );
            //}
        }

        kvPairs.sort(function sortFormsAlphabetically(a, b) {
            var cmp = 0;
            if(a.formTitle < b.formTitle) { cmp = -1; }
            if(a.formTitle > b.formTitle) { cmp = 1; }
            return cmp;
        });

        for (i = 0; i < kvPairs.length; i++) {

            html = html +
                '<option ' +
                    'value="' + kvPairs[i].formId + '"' +
                    ((template.bfbAlternative === kvPairs[i].formId) ? ' selected="selected"' : '') +
                '>' +
                    kvPairs[i].formTitle +
                '</option>';

        }

        html = '<select id="selChangeAltForm' + template.UID + '" class="form-control">' + html + '</select>';
        jq.me = $('#divBFBAlt');

        jq.me.html(html);
        jq.sel = $('#selChangeAltForm' + template.UID);
        jq.sel.off('change.element');
        jq.sel.on('change.element', updateTemplateFromPanel);

        isInitialized = true;
    }

    //  BINDER API

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            var
                i18n = Y.doccirrus.i18n;

            myNode = node;

            /*
             *  Cache Query selectors for controls
             */

            jq = {                                          //%  pre-cached cached DOM queries [object]\
                'divBFBAlt': $('#divBFBAlt')
            };

            /*
             *  recover any dcforms-element reference which was passed to this
             */

            if (node.passToBinder && node.passToBinder.template) {
                template = node.passToBinder.template;
            } else {
                Y.log('Please pass a dcforms-teplate object to this binder', 'warn', NAME);
                myNode.hide();
                return;
            }

            /*
             *  not visible unless BFB form
             */

            jq.container = $('#divAgBFB');

            if (template && template.isBFB) {
                jq.container.show();
            } else {
                jq.container.hide();
            }

            /*
             *  load values from them element
             */

            //  remove any previous or duplicate events
            deregisterEventHandlers();
            //  listen for template events
            registerEventHandlers();

            //  jQuery init, etc
            initPanel();

            function EditBFBPropertiesVM() {
                var
                    self = this;

                self.lblAlternativeI18n = i18n('FormEditorMojit.BFB_properties.LBL_ALTERNATE');
            }

            ko.applyBindings( new EditBFBPropertiesVM(), document.querySelector( '#divEditBfb' ) );

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for edit_pdf_properties.js - ' + node.getAttribute('id'), 'debug', NAME);

            /*
             *  De-register update event on the element
             */

            deregisterEventHandlers();
        }
    };

}