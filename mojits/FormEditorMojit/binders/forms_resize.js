/**
 *  jadeLoaded panel for modal to rescale forms to new papoer size
 *
 *  @author: strix
 *
 *  Copyright (c) 2015 Doc Cirrus GmbH all rights reserved.
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*exported _fn */
/*global $, ko */

function _fn(Y, NAME) {                                 //  eslint-disable-line
    'use strict';

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            //  PRIVATE VARS

            var
                myNode = node,                          //  YUI / DOM node this is rendered into
            //  userLang = Y.dcforms.getUserLang(),     //  user's language, may be overridden by template
                jqCache = {},                           //  cached jQuery selectors
                template = {},                          //  current form template
                i18n = Y.doccirrus.i18n;

            /*
             *  Cache Query selectors for controls
             */

            //  INITIALIZATION

            /**
             *  Set up event listeners and request forms list from server
             */

            function initResizePanel() {

                var
                    i,
                    paperSize;

                jqCache = {                                          //%  pre-cached cached DOM queries [object]
                    'txtNewFormHeight': $('#txtNewFormHeight'),
                    'txtNewFormWidth': $('#txtNewFormWidth'),
                    'txtGroupFormHeight': $('#txtGroupFormHeight'),
                    'txtGroupFormWidth': $('#txtGroupFormWidth'),
                    'spnPaperSizes': $('#spnPaperSizesTo')
                };

                //  read any configuration passed by parent binder

                if (myNode.passToBinder) {
                    if (myNode.passToBinder.hasOwnProperty('template')) {
                        template = node.passToBinder.template;
                    }
                }

                //  add preset paper sizes

                for (i = 0; i < Y.dcforms.paperSizes.length; i++) {
                    paperSize = Y.dcforms.paperSizes[i];
                    addPreset(paperSize.name, paperSize.width, paperSize.height);
                    $('#divTest').html(paperSize.name + ' ' + paperSize.width + 'x' + paperSize.height);
                }

                //  set event handlers

                jqCache.txtNewFormWidth.off('keyup.forms').on('keyup.forms', onChangeWidth);
                jqCache.txtNewFormHeight.off('keyup.forms').on('keyup.forms', onChangeHeight);

                //  fill with current form size

                setDefaultValue();
            }

            initResizePanel();

            //  PRIVATE METHODS

            /**
             *  Updates the select box value according to currently loaded form
             */

            function setDefaultValue() {
                jqCache.txtNewFormWidth.val(template.paper.width);
                jqCache.txtNewFormHeight.val(template.paper.height);
            }

            /*  Helper function to add preset paper size buttons
             *  @param  name    {String}    Name of a paper size
             *  @param  width   {Number}    Millimeters
             *  @param  height  {Number}    Millimeters
             */

            function addPreset(name, width, height) {
                var btnHtml = '<button class="btn btn-sm" id="btnPreset' + name + '">' + name + '</button>&nbsp;';
                jqCache.spnPaperSizes.append(btnHtml);
                $('#btnPreset' + name ).off('click.newform' ).on('click.newform', function() {
                    jqCache.txtNewFormWidth.val(width);
                    jqCache.txtNewFormHeight.val(height);
                    onChangeWidth();
                    onChangeHeight();
                });
            }

            //  EVENT HANDLERS

            function onChangeWidth() {
                var newWidth = parseFloat(jqCache.txtNewFormWidth.val());
                jqCache.txtGroupFormWidth.removeClass('has-error');
                if (isNaN(newWidth) || newWidth < 10) {
                    jqCache.txtGroupFormWidth.addClass('has-error');
                }
            }

            function onChangeHeight() {
                var newHeight = parseFloat(jqCache.txtNewFormHeight.val());
                jqCache.txtGroupFormHeight.removeClass('has-error');
                if (isNaN(newHeight) || newHeight < 10) {
                    jqCache.txtGroupFormHeight.addClass('has-error');
                }
            }

            function FormResizeVM() {
                var
                    self = this;

                self.lblWidthI18n = i18n('FormEditorMojit.generic.LBL_WIDTH');
                self.lblHeightI18n = i18n('FormEditorMojit.generic.LBL_HEIGHT');
                self.lblPresetsI18n = i18n('FormEditorMojit.generic.LBL_PRESETS');

            }

            ko.applyBindings( new FormResizeVM(), document.querySelector( '#divFormsResize' ) );


        },

        deregisterNode: function( node ) {
            Y.log('deregister node for forms_assign.js - ' + node.getAttribute('id'), 'debug', NAME);

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screws up future use of this DOM node, which we might need
            //node.destroy();
        }
    };

}