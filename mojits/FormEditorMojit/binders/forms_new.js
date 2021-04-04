/*
 * JadeLoaded form to create a new user FEM template
 *
 * Requires the following YUI modules to have been loaded by the parent binder:
 *
 *  'dcforms-papersizes',
 *  'dcforms-reducedschema',
 *  'dcforms-categories'
 *
 * Copyright (c) 2012 Doc Cirrus GmbH
 * all rights reserved.
 */

/*exported _fn */
/*global $, ko */

function _fn(Y, NAME) {                             // eslint-disable-line
    'use strict';

    var
        jq = {},                                    //  cached jQuery selectors
        randId = '',                                //  randId replaces userId used in previous versions of FEM

        formFolderId = '000000000000000000000699',  //  default to recovery folder

    //  overwritten by parent binder to allow it to respond to form creation
        onFormCreated = function(newInstanceId) {
            Y.log('No parent binder: ' + newInstanceId, 'info', NAME);
        };

    /**
     *  Configure this form to loaded page and (re)bind events
     */

    function initForm() {

        var
            i,
            paperSize;

        //  add preset paper sizes
        for (i = 0; i < Y.dcforms.paperSizes.length; i++) {
            paperSize = Y.dcforms.paperSizes[i];
            addPreset(paperSize.name, paperSize.width, paperSize.height);
        }

        //  subscribe to button events, OK/Add button is external to this form
        Y.dcforms.event.on('onNewFormButtonClick', NAME, onNewFormOKClick);

        //  add category selection box
        Y.dcforms.categoriesselect.renderSelectBoxSync('formcategory', 'selCategory', function(html) {
            jq.spanSelCat.html(html);
        });
        jq.selCategory = $('#selCategory');

        //  add schema selection box
        jq.spnSelectSchema.html(Y.dcforms.reducedschema.renderSelectBoxSync('selectSchema', 'selReducedSchema'));
        jq.selReducedSchema = $('#selReducedSchema');
        jq.selReducedSchema.addClass('form-control');

        jq.btnNewFormOk.off('click.newform').on('click.newform', onNewFormOKClick);

        jq.btnNewFormCancel.off('click.newform' ).on('click.newform', function() {
            Y.dcforms.clearModal();
        });

    }

    /*  Helper function to add preset paper size buttons
     *  @param  name    {String}    Name of a paper size
     *  @param  width   {Number}    Millimeters
     *  @param  height  {Number}    Millimeters
     */

    function addPreset(name, width, height) {
        jq.spnPaperSizes.append('<button class="btn btn-mini" id="btnPreset' + name + '">' + name + '</button>');
        $('#btnPreset' + name ).off('click.newform' ).on('click.newform', function() {
            //  jq cache doesn't work in this context
            jq.txtNewFormWidth.val(width);
            jq.txtNewFormHeight.val(height);
        });
    }

    /**
     *  Validate entered data
     *
     *  @param  formName        {String}    Name of new form, no special chars
     *  @param  width           {Number}    Millimeters
     *  @param  height          {Number}    Millimeters
     *  @param  callback        {Function}  Of the form fn(errMsg)
     */

    function validateNewForm(formName, width, height, callback) {

        var
            msg = '';               //  error message [string]

        //  this should be expanded
        if (
            (formName.indexOf('.') >= 0) ||
                (formName.indexOf('/') >= 0) ||
                (formName.indexOf('\\') >= 0)
            ) {
            Y.log('Could not create form: Bad char in name', 'info', NAME);
            msg = msg + Y.doccirrus.i18n('FormEditorMojit.error_messages.ERR_BAD_NAME_CHAR') + ' "\"<br/>';
        }

        if ('' === formName) {
            Y.log('Could not create form: No name given', 'info', NAME);
            msg = msg + Y.doccirrus.i18n('FormEditorMojit.error_messages.ERR_NO_FORM_NAME') +'<br/>';
        }

        //  TODO: make this a config var
        if (formName.length > 50) {
            msg = msg + Y.doccirrus.i18n('FormEditorMojit.te.ERR_NAME_TOO_LONG') +'<br/>';
        }

        if (isNaN(width)) {
            Y.log('Could not create form: Invalid paper width', 'info', NAME);
            msg = msg + Y.doccirrus.i18n('FormEditorMojit.error_messages.ERR_INVALID_PAPER_WIDTH') + '<br/>';
        } else {
            if (width < 10) {
                Y.log('Could not create form: Invalid paper width', 'info', NAME);
                msg = msg + Y.doccirrus.i18n('FormEditorMojit.error_messages.ERR_INVALID_PAPER_WIDTH') + '<br/>';
            }
        }
        if (isNaN(height)) {
            Y.log('Could not create form: Invalid paper height', 'info', NAME);
            msg = msg + Y.doccirrus.i18n('FormEditorMojit.error_messages.ERR_INVALID_PAPER_HEIGHT') + '<br/>';
        } else {
            if (height < 10) {
                Y.log('Could not create form: Invalid paper height', 'info', NAME);
                msg = msg + Y.doccirrus.i18n('FormEditorMojit.error_messages.ERR_INVALID_PAPER_HEIGHT') + '<br/>';
            }
        }

        //  No longer need to check for file name collission, now forms now stored by database _id
        callback(msg);
    }

    /**
     *  Make a new form template stub based on this form
     */

    function createFormTemplate() {

        var
            formName = $('#txtNewFormName').val(),
            width = parseFloat($('#txtNewFormWidth').val()),
            height = parseFloat($('#txtNewFormHeight').val()),

            //  reduced schema ropdown is deprecated and has been moved to debug options

            reducedSchema = ( $('#chkNewInSight2').prop( 'checked') ? 'InSuite_T' : 'InCase_T' ),

            category = $('#selCategory').val(),
            orientation = $('#selOrientation').val(),
            tempSide,
            serialized,
            formFile = formName + '.form',
            instanceId = randId + '_' + formName + '.form';

        if ('landscape' === orientation) {
            tempSide = width;
            width = height;
            height = tempSide;
            Y.log('Setting landscape mode for this form: ' + width + 'x' + height, 'info', NAME);
        }

        formName = $.trim(formName);

        /*
         *  Basic panel template
         */

        serialized = {
            "name": {
                "en": formName,
                "de": formName
            },
            "formFolderId": formFolderId,
            "instanceId": instanceId,
            "reducedSchema": reducedSchema,
            "formId": formName + '.form',
            "version": 0,
            "revision": 0,
            "category": category,
            "templateFile": formFile,
            "width": width,
            "height": height,
            "resolution": "11.811",
            "orientation": orientation,
            "pages": [
                {
                    "name": "page0",
                    "elements": [],
                    "bgColor": "#ffffff",
                    "bgImg": ""
                }
            ]
        };

        Y.log('Creating form template with schema: ' + reducedSchema, 'info', NAME);
        Y.log('Creating form template with category: ' + category, 'info', NAME);

        return serialized;
    }

    /**
     *  Store the new template on the server (method moved to utils-yui.js)
     *
     *  @param  newTemplate {Object}    A completed dcforms-template object
     *  @param  callback    {Function}  of the form fn(err, newInstanceId)
     */

    function saveNewTemplate(newTemplate, callback) {

        Y.dcforms.saveNewTemplate(newTemplate, callback);

    }

    //  event handlers

    /**
     *  Called when 'OK' button is clicked
     *  check the form and submit to server
     */

    function onNewFormOKClick() {
        var
            formName = $('#txtNewFormName').val(),
            width = parseFloat($('#txtNewFormWidth').val()),
            height = parseFloat($('#txtNewFormHeight').val());

        validateNewForm(formName, width, height, function onNewFormValidated(err) {
            if (err) {
                jq.divValidateMsg.html('<div class="alert">' + err + '</div>');
                return;
            }

            var
                newTemplate = createFormTemplate();

            saveNewTemplate(newTemplate, function onSavedNewForm(err, newIdentifiers) {
                if (err) {
                    jq.divValidateMsg(err);
                    return;
                }

                newIdentifiers = newIdentifiers.data ? newIdentifiers.data : newIdentifiers;
                
                if( Y.config.debug ) {
                    Y.log('Saved new template: ' + JSON.stringify(newIdentifiers), 'info', NAME);
                }
                
                Y.doccirrus.comctl.clearModal();

                Y.dcforms.event.raise('onNewFormCreated', newIdentifiers);
                onFormCreated(newIdentifiers);
            });
        });
    }

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            var
                i18n = Y.doccirrus.i18n;

            //  hat tip: http://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
            randId = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

            /*
             *  Check if there is a parent binder which wants to be notified when a form is created
             */

            if (node.hasOwnProperty('passToBinder') && node.passToBinder.hasOwnProperty('onFormCreated')) {
                onFormCreated = node.passToBinder.onFormCreated;
            }

            if (node.hasOwnProperty('passToBinder') && node.passToBinder.hasOwnProperty('formFolderId')) {
                formFolderId = node.passToBinder.formFolderId;
            }

            /*
             *  Cache Query selectors for controls
             */

            jq = {                                          //%  pre-cached cached DOM queries [object]
                'divValidateMsg': $('#divValidateMsg'),

                'txtNewFormName': $('#txtNewFormName'),
                'txtNewFormWidth': $('#txtNewFormWidth'),
                'txtNewFormHeight': $('#txtNewFormHeight'),

                'spnPaperSizes': $('#spnPaperSizes'),
                'spanSelCat': $('#spanSelCat'),
                'spnSelectSchema': $('#spnSelectSchema'),

                'btnNewFormOk': $('#btnNewFormOk'),
                'btnNewFormCancel': $('#btnNewFormCancel')
            };

            //  disabled until child elements loaded
            jq.btnNewFormOk.attr('disabled', 'disabled');

            /*
             *  load values from them element
             */

            initForm();

            function FormsNewVM() {
                var
                    self = this;

                self.lblFormNameI18n = i18n('FormEditorMojit.generic.LBL_FORM_NAME');
                self.lblFormCategoryI18n = i18n('FormEditorMojit.new_el_form.LBL_FORM_CATEGORY');
                self.lblPaperSizeI18n = i18n('FormEditorMojit.generic.LBL_PAPER_SIZE');
                self.lblWidthI18n = i18n('FormEditorMojit.generic.LBL_WIDTH');
                self.lblHeightI18n = i18n('FormEditorMojit.generic.LBL_HEIGHT');
                self.lblPresentsI18n = i18n('FormEditorMojit.generic.LBL_PRESETS');
                self.lblOrientationI18n = i18n('FormEditorMojit.generic.LBL_ORIENTATION');
                self.lblPortraitI18n = i18n('FormEditorMojit.generic.LBL_PORTRAIT');
                self.lblLandscapeI18n = i18n('FormEditorMojit.generic.LBL_LANDSCAPE');
                self.lblInsight2I18n = i18n('FormEditorMojit.form_properties.LBL_INSIGHT2');
                self.lblFormSchemaI18n = i18n('FormEditorMojit.new_el_form.LBL_FORM_SCHEMA');
                self.btnCancelI18n = i18n('FormEditorMojit.generic.BTN_CANCEL');
                self.btnOkI18n = i18n('FormEditorMojit.generic.BTN_OK');
            }

            ko.applyBindings( new FormsNewVM(), document.querySelector( '#divNewFormTemplate' ) );

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for forms_new.js - ' + node.getAttribute('id'), 'debug', NAME);

            Y.dcforms.event.off('*', NAME);

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screw up future use of this DOM node, which we might need
            //node.destroy();
        }
    };

}
