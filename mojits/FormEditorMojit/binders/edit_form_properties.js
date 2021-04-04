/*
 * Copyright (c) 2013 Doc Cirrus GmbH
 * all rights reserved.
 *
 * TODO: migrate UI from jQuery to bindings in viewmodel
 */

/*jslint latedef:false */
/*exported _fn */
/*global $, async, ko */

function _fn(Y, NAME) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,

        editFormPropertiesVM,
        template,                               //  reference to dcforms-template object
        formLang,                               //  language of current template (might not match page)
        jq = {};                                //  cached jQuery selectors

    /**
     *  ViewModel for form properties
     *  @constructor
     */

    function EditFormPropertiesVM() {
        var
            self = this;

        function init() {
            initTranslations();
        }

        function initTranslations() {
            self.lblPaperI18n = i18n('FormEditorMojit.form_properties.LBL_PAPER');
            self.lblNameI18n = i18n('FormEditorMojit.form_properties.LBL_NAME');
            self.lblShortnameI18n = i18n('FormEditorMojit.form_properties.LBL_SHORTNAME');
            self.lblLanguageI18n = i18n('FormEditorMojit.form_properties.LBL_LANGUAGE');
            self.lblGridI18n = i18n('FormEditorMojit.form_properties.LBL_GRID');
            self.lblSchemaI18n = i18n('FormEditorMojit.fe.view.LBL_SCHEMA');
            self.lblDefaultForI18n = i18n('FormEditorMojit.form_properties.LBL_DEFAULTFOR');
            self.lblInsuranceI18n = i18n('FormEditorMojit.form_assignment.LBL_INSURANCE');
            self.lblDisabilityI18n = i18n('FormEditorMojit.form_assignment.LBL_DISABILITY');
            self.lblTransferI18n = i18n('FormEditorMojit.form_assignment.LBL_TRANSFER');
            self.lblPrivateBillI18n = i18n('FormEditorMojit.form_assignment.LBL_PRIVATEBILL');
            self.lblDKGBillI18n = i18n('FormEditorMojit.form_assignment.LBL_DKGBILL');
            self.lblActTypeI18n = i18n('FormEditorMojit.form_properties.LBL_ACTTYPE');
            self.lblSubFormI18n = i18n('FormEditorMojit.form_properties.LBL_SUBFORM');
            self.lblElasticI18n = i18n('FormEditorMojit.form_properties.LBL_ELASTIC');
            self.lblReadonlyI18n = i18n('FormEditorMojit.form_properties.LBL_READONLY');
            self.lblBFbI18n = i18n('FormEditorMojit.fe.view.LBL_BFB');
            self.lblInsight2I18n = i18n('FormEditorMojit.form_properties.LBL_INSIGHT2');
            self.lblUseReportingI18n = i18n('FormEditorMojit.form_properties.LBL_USE_REPORTING');
            self.btnUpdateI18n = i18n('FormEditorMojit.form_properties.BTN_UPDATE');
            self.btnDeleteFormI18n = i18n('FormEditorMojit.form_properties.BTN_DELETE_FORM');
            self.btnCopyFormI18n = i18n('FormEditorMojit.form_properties.BTN_COPY_FORM');
            self.btnNewVersionI18n = i18n('FormEditorMojit.form_properties.BTN_NEW_VERSION');
            self.lblConfirmDeleteI18n = i18n('FormEditorMojit.form_properties.LBL_CONFIRM_DELETE');
            self.lblConfirmNewVersionI18n = i18n('FormEditorMojit.form_properties.LBL_CONFIRM_NEW_VERSION');
            self.lblRevisionCommentI18n = i18n('FormEditorMojit.form_properties.LBL_REVISIONCOMMENT');
            self.lblIsPdfAttachedI18n = i18n('FormEditorMojit.form_properties.LBL_SHOW_ATTACHED_PDFS');
            self.lblIsLetter = i18n('FormEditorMojit.form_properties.LBL_IS_LETTER');
            self.lblUtf8 = i18n('FormEditorMojit.form_properties.LBL_UTF');
        }

        init();
    }

    /**
     *  Configure this form to loaded element type and (re)bind events
     */

    function initForm() {

        // bind UI events and load schema select box

        var orientation = ('portrait' === template.orientation) ? Y.doccirrus.i18n('FormEditorMojit.generic.LBL_PORTRAIT') : Y.doccirrus.i18n('FormEditorMojit.generic.LBL_LANDSCAPE');

        formLang = template.userLang;

        //  load reduced schema into select box
        jq.divSelFormSchema.html(Y.dcforms.reducedschema.renderSelectBoxSync('selectSchema', 'selSelectSchema'));

        jq.selSelectSchema = $('#selSelectSchema');
        jq.selSelectSchema.val(template.reducedSchema);
        jq.selSelectSchema.addClass('form-control');

        //  set user language in this form to match page/template
        jq.selFormLang
            .val(formLang)
            .off('change.form')
            .on('change.form', onLangChanged);

        //  set form template
        jq.txtFormName
            .val(template.name[formLang])
            .off('change.form')
            .on('change.form', onFormChanged);

        jq.txtFormShortName
            .val(template.shortName)
            .off('change.form')
            .on('change.form', onFormChanged);

        //  set form grid size
        jq.txtFormGrid.val(template.gridSize);

        //  boolean form properties
        jq.chkSubform.prop('checked', template.isSubform);
        jq.chkFixed.prop('checked', template.isFixed);
        jq.chkReadOnly.prop('checked', template.isReadOnly);
        jq.chkBFB.prop('checked', template.isBFB);
        updateInSight2();
        jq.chkInSight2.off( 'click' ).on( 'click', onClickInSight2 );
        jq.chkUseReporting.prop('checked', template.useReporting);
        jq.chkIsPdfAttached.prop('checked', template.isPdfAttached);
        jq.chkIsLetter.prop('checked', template.isLetter);
        jq.chkUtf8.prop('checked', template.utf8);

        jq.spanPaperSize.html(template.paper.width + 'x' + template.paper.height + ' mm ' + orientation);

        jq.btnUpdateFormProperties.off('click.forms').on('click.forms', function onUpdateClicked(){
            onFormChanged();
        });

        jq.btnCopyForm.off('click.forms').on('click.forms', copyForm);
        jq.btnDeleteForm.off('click.forms').on('click.forms', deleteForm);
        jq.btnBumpVersion.off('click.forms').on('click.forms', bumpVersion);
        jq.btnResizePaper.off('click.forms').on('click.forms', onResizePaper);

        jq.chkBFB.off('change.forms').on('change.forms', onBFBStateChange);
        jq.chkBFB.off('click.forms').on('click.forms', onBFBStateChange);

        jq.chkUseReporting.off('change.forms').on('change.forms', onUseReportingChange);
        jq.chkUseReporting.off('click.forms').on('click.forms', onUseReportingChange);

        jq.chkIsPdfAttached.off('change.forms').on('click.forms', onIsPdfAttachedChange);
        jq.chkIsPdfAttached.off('click.forms').on('click.forms', onIsPdfAttachedChange);

        jq.chkIsLetter.off('change.forms').on('click.forms', onIsLetterChange);
        jq.chkIsLetter.off('click.forms').on('click.forms', onIsLetterChange);

        jq.chkUtf8.off('change.forms').on('click.forms', onUtf8Change);
        jq.chkUtf8.off('click.forms').on('click.forms', onUtf8Change);

        addFormRoles();
        addActivityTypes();

        jq.selActType.off('change.forms').on('change.forms', onActTypeChange);

        if ('casefile-prescription' === template.defaultFor) {
            template.defaultFor = 'casefile-prescription-kbv';
        }

        jq.selDefaultFor.val(template.defaultFor);

        jq.txtFormFile.val(template.templateFile);

        //  add listeners for form events which affect this panel

        Y.dcforms.event.on('formLangChanged', NAME, onFormLangChanged);

        template.on( 'schemaSet', NAME, onReducedSchemaChanged );

        setDevMode();
    }

    function getModalDelete(modalTitle, modalContent) {
        if( getModalDelete.instance ) {
            getModalDelete.instance.setAttrs( { title: modalTitle, bodyContent: modalContent } );
            return getModalDelete.instance;
        }
        getModalDelete.instance = new Y.doccirrus.DCWindow( {
            title: modalTitle,
            bodyContent: Y.Node.create( modalContent ),
            render: document.body,
            width: Y.doccirrus.DCWindow.SIZE_LARGE,
            centered: true,
            modal: true,
            resizeable: false,
            buttons: {
                header: ['close'],
                footer: [
                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                    {
                        label: Y.doccirrus.i18n('FormEditorMojit.modals.LBL_CONFIRM'),
                        name: 'btnConfirmDelete',
                        classNames: 'btn-primary',
                        action: function( e ) {
                            e.target.button.disable();
                            onDeleteConfirm();
                        }
                    }
                ]
            }
        } );
        getModalDelete.instance.close = function() {
            getModalDelete.instance = null;
            Y.doccirrus.DCWindow.prototype.close.apply( this, arguments );
        };
        getModalDelete.instance.getButton( 'close', 'header' ).hide();
        return getModalDelete.instance;
    }

    function addFormRoles() {
        if (!template) { return; }

        var
            options = '<option value=""></option>',
            dashLang = '-' + template.userLang,
            copyRoles = [],
            role,
            i;


        function sortByNameAndLang( a, b ) {
            var
                nameA = a[dashLang].toLowerCase(),
                nameB = b[dashLang].toLowerCase();

            if ( nameA > nameB ) { return 1; }
            if ( nameB > nameA ) { return -1; }
            return 0;
        }

        for (i = 0; i < Y.doccirrus.formRoles.length; i++) {
            copyRoles.push( Y.doccirrus.formRoles[i] );
        }

        copyRoles.sort( sortByNameAndLang );

        for (i = 0; i < copyRoles.length; i++) {
            role = copyRoles[i];
            options = options + '<option value="' + role.name + '">' + role[dashLang] + '</option>';
        }

        jq.selDefaultFor.html(options);
    }

    /**
     *  Update this panel from form template object
     */

    function updateForm() {
        //  set form template
        jq.txtFormName.val(template.name[formLang]);
        jq.txtFormFile.val(template.templateFile);
        jq.txtFormShortName.val(template.shortName);
        jq.txtFormGrid.val(template.gridSize);
        jq.selDefaultFor.val(template.defaultFor);
        jq.chkSubform.prop('checked', template.isSubform);
        jq.chkFixed.prop('checked', template.isFixed);
        jq.chkReadOnly.prop('checked', template.isReadOnly);
        jq.chkBFB.prop('checked', template.isBFB);
        jq.chkUseReporting.prop('checked', template.useReporting);
        jq.chkIsLetter.prop('checked', template.isLetter);
        jq.chkUtf8.prop('checked', template.utf8);
        setDevMode();
    }

    function setDevMode() {
        var jqDevMode = $('#chkFormDevOptions');

        if (jqDevMode.length && jqDevMode.prop('checked')) {
            jq.tdFormSchema.show();
            jq.tdReadOnly.show();
            jq.tdFormFileName.show();
        } else {
            jq.tdFormSchema.hide();
            jq.tdReadOnly.hide();
            jq.tdFormFileName.hide();
        }
    }


    /**
     *  Form language changed
     */

    function onLangChanged() {
        formLang = jq.selFormLang.val();
        Y.dcforms.setUserLang(formLang);
        template.setUserLang(formLang);
        updateForm();
    }

    /**
     *  Form template has notified that it's interface language was changed
     *
     *  @param  evt     {Object}    Has properties for form UID and language
     */

    function onFormLangChanged(evt) {

        if (evt.source !== template.UID) {
            //  does not apply to this panel
            return;
        }

        if( Y.config.debug ) {
            Y.log('Received formLangChanged event: ' + JSON.stringify(evt));
        }
        formLang = evt.lang;
        jq.txtFormName.val(template.name[formLang]);
        jq.selFormLang.val(formLang);
    }

    /**
     *  Make a copy of this form
     */

    function copyForm() {
        var html = Y.doccirrus.i18n('FormEditorMojit.generic.LBL_NEW_FORM_NAME') + ': ' +
            '<input ' +
                'id="txtNewFormName" ' +
                'type="text" ' +
                'class="form-control" ' +
                'value="' + template.name[formLang] + '" />';

        Y.doccirrus.comctl.setModal( Y.doccirrus.i18n('FormEditorMojit.generic.LBL_CREATE_A_NEW_FORM'), html, true, onCopyConfirm);
    }

    /**
     *  Delete this form
     */


    function deleteForm() {

        //  first check if any activities are using this form, response will be passed by WS event
        Y.doccirrus.jsonrpc.api.formtemplate.isinuse( { 'formId'  : template.canonicalId } ).fail( onUsageLookupFailed );

        getModalDelete().setAttrs( {
            title: Y.doccirrus.i18n('FormEditorMojit.status_messages.PLEASE_WAIT'),
            bodyContent: Y.doccirrus.comctl.getThrobber()
        } );

        function onUsageLookupFailed( err ) {
            Y.doccirrus.DCWindow.notice( {
                title: Y.doccirrus.i18n('FormEditorMojit.modals.LBL_NOTICE'),
                message: "Err: " + JSON.stringify(err),
                window: { width: 'medium' }
            } );

            return;
        }
    }

    function onCheckInUse( msg ) {
        msg = msg && msg.data && msg.data[0] ? msg.data[0] : msg;

        var
            LBL_DEL_ISINUSE = Y.doccirrus.i18n('FormEditorMojit.form_properties.LBL_DEL_ISINUSE'),
            LBL_DEL_NOTINUSE = Y.doccirrus.i18n('FormEditorMojit.form_properties.LBL_DEL_NOTINUSE'),
            confirmMsg = msg.inUse ? LBL_DEL_ISINUSE : LBL_DEL_NOTINUSE;


        getModalDelete().setAttrs( {
            title: Y.doccirrus.i18n('FormEditorMojit.modals.LBL_NOTICE'),
            bodyContent: confirmMsg
        } );
    }

    function addActivityTypes() {
        var
            actTypeEnum = Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
            html = '<option value=""></option>',
            i;

        actTypeEnum.sort(function(a, b) {
            var
                langDash = '-' + template.userLang,
                aLoc = a[langDash].toLowerCase(),
                bLoc = b[langDash].toLowerCase();
            return ((aLoc < bLoc) ? -1 : ((aLoc > bLoc) ? 1 : 0));
        });

        for (i = 0; i < actTypeEnum.length; i++) {
            html = html + '<option value="' + actTypeEnum[i].val + '">' + actTypeEnum[i]['-' + template.userLang] + '</option>';
        }

        jq.selActType.html(html);
        jq.selActType.val(template.actType || '');
    }

    /**
     *  Bump the version of this form
     */

    function bumpVersion() {

        var
            bumpVersionForm = $('#divBumpVersion').html().replace('txtRevCommentTemplate', 'txtRevComment'),
            revComment = '';


        async.series( [ showVPlusModal, createNewVersion ], onAllDone );

        //  show a modal to request revision comment and confirm action
        function showVPlusModal( itcb ) {
            var jqRevComment;

            Y.doccirrus.comctl.setModal(
                Y.doccirrus.i18n('FormEditorMojit.generic.BTN_CONFIRM'),
                bumpVersionForm,
                true,
                onBumpConfirm,
                onModalReady
            );

            function onModalReady() {
                jqRevComment = $('#txtRevComment');
                jqRevComment.off('keydown').on('keydown', function(evt) {
                    if (13 === evt.keyCode || 10 === evt.keyCode) {
                        onBumpConfirm();
                    }
                });
            }
            function onBumpConfirm() {
                revComment = jqRevComment.val();
                Y.doccirrus.comctl.setModal(
                    Y.doccirrus.i18n('FormEditorMojit.generic.BTN_CONFIRM'),
                    Y.doccirrus.comctl.getThrobber(),
                    true,
                    onBumpConfirm
                );
                itcb( null );
            }
        }

        //  Called when user confirms a new version of the form
        function createNewVersion( itcb ) {
            Y.dcforms.makeNewVersion(template.canonicalId, revComment, onVewVersionCreated);
            function onVewVersionCreated(err, newVersionMeta) {
                if (err) { return itcb( err ); }

                //  v1 API
                newVersionMeta = newVersionMeta.data ? newVersionMeta.data : newVersionMeta;

                template.latestVersionId = newVersionMeta.newVersionId;
                template.version = newVersionMeta.newVersionNo;
                template.revision = 0;
                itcb( null );
            }

        }

        function onAllDone( err ) {
            if ( err ) {
                Y.log( 'Problem creating new form version: ' + JSON.stringify( err ), 'warn', NAME );

                Y.doccirrus.comctl.setModal(
                    Y.doccirrus.i18n('FormEditorMojit.generic.LBL_ERROR'),
                    Y.doccirrus.i18n('FormEditorMojit.fe.LBL_COULD_NOT_CREATE_VERSION'),
                    true
                );

                return;
            }

            template.autoSaveDelay = 0;
            template.autosave();
            Y.doccirrus.comctl.clearModal();

            Y.dcforms.event.raise('onNewVersionCreated', template);
            onFormSaved();
        }

    }

    /**
     *  inSight2 checkbox is a UI shortcut for toggling between inSuite_T and InCase_T schemas (MOJ-6101)
     */

    function updateInSight2() {
        jq.chkInSight2.prop( 'checked', 'InSuite_T' === template.reducedSchema );
        if ( 'InCase_T' !== template.reducedSchema && 'InSuite_T' !== template.reducedSchema ) {
            jq.tdInSight2.hide();
        } else {
            jq.tdInSight2.show();
        }
    }

    /**
     *  Update dcforms-template with new values from this form
     */

    function onFormChanged() {
        //Y.log('Setting formvalues from dcforms-template', 'debug', NAME);

        template.setName(formLang, jq.txtFormName.val());
        template.setIsSubform(jq.chkSubform.prop('checked'));

        template.gridSize = parseFloat(jq.txtFormGrid.val());

        //  sanity
        if (isNaN(template.gridSize)) {
            template.gridSize = 5;
            jq.txtFormGrid.val(5);
        }

        if (template.gridSize < 0.5) {
            template.gridSize = 0.5;
            jq.txtFormGrid.val(0.5);
        }

        if (template.gridSize > 50) {
            template.gridSize = 50;
            jq.txtFormGrid.val(50);
        }

        template.isSubform = jq.chkSubform.prop('checked');
        template.isFixed = jq.chkFixed.prop('checked');        //  default is now fixed layout MOJ-3112

        if (jq.hasOwnProperty('selSelectSchema')) {
            if (template.reducedSchema !== jq.selSelectSchema.val()) {
                //Y.log('Setting schema: ' + template.reducedSchema, 'debug', NAME);
                template.setSchema(jq.selSelectSchema.val(), onSchemaSet);
            }
        }

        template.actType = jq.selActType.val();
        template.defaultFor = jq.selDefaultFor.val();

        template.templateFile = jq.txtFormFile.val();

        template.shortName = jq.txtFormShortName.val();

        template.autoSaveDelay = 0;
        template.autosave(onFormSaved);
    }

    /**
     *  Form tree may have changed (name, etc) reload it
     */

    function onFormSaved() {
        //  clear server-side cache
        Y.dcforms.refreshFormList(onServerCacheCleared);
        //Y.doccirrus.comctl.privatePost('/1/formtemplate/:clearFormListCache', {}, onServerCacheCleared);

        //  clear client-side cache
        function onServerCacheCleared() {
            Y.dcforms.getFormList('', true, onFormsListReloaded);
        }

        function onFormsListReloaded() {
            template.raise('formTitleChange', template.name);
        }
    }

    /**
     *  Callback after reduced schema changed for this form
     */

    function onSchemaSet() {
        //  save again after schema loaded
        template.autoSaveDelay = 0;
        template.autosave();
    }

    /**
     *  Called when user confirms copy of this form with a new name
     */

    function onCopyConfirm() {

        var
            //il8n = Y.dcforms.il8nDict,
            newName = $('#txtNewFormName').val(),
            serialized = template.serialize();

        function onCopyComplete(err, newIdentifiers) {
            if (err) {
                Y.doccirrus.comctl.setModal(Y.doccirrus.i18n('FormEditorMojit.generic.LBL_ERROR'), Y.doccirrus.i18n('FormEditorMojit.fe.LBL_COULD_NOT_CREATE_VERSION'), true);
                return;
            }

            newIdentifiers = newIdentifiers.data ? newIdentifiers.data : newIdentifiers;

            //  refresh the page to reload everything
            parent.location.hash = 'form=' + newIdentifiers._id;
            window.location.reload();
        }

        Y.dcforms.copyForm(serialized, newName, onCopyComplete);
    }

    /**
     *  Called when user confirms that they want to delete this form
     */

    function onDeleteConfirm() {

        function onFormDeleted(err /*, response */) {

            if (err) {
                Y.doccirrus.comctl.setModal(Y.doccirrus.i18n('FormEditorMojit.generic.LBL_WARNING'), Y.doccirrus.i18n('FormEditorMojit.fe.LBL_COULD_NOT_DELETE'), true);
                return;
            }

            getModalDelete().setAttrs( { title: Y.doccirrus.i18n('FormEditorMojit.modals.LBL_NOTICE'), bodyContent: Y.doccirrus.i18n('FormEditorMojit.fe.LBL_DELETED') } );

            //  reload the page
            parent.location.hash = '';
            window.location.href = window.location.href.slice(0, -1);

            Y.doccirrus.comctl.privatePost('/1/formtemplate/:clearFormListCache', {}, onServerCacheCleared);
        }

        function onServerCacheCleared() {
            window.location.reload();
        }

        getModalDelete().setAttrs( { title: Y.doccirrus.i18n('FormEditorMojit.modals.LBL_NOTICE'), bodyContent: Y.doccirrus.comctl.getThrobber() } );

        var params = { 'id': template.canonicalId };
        Y.doccirrus.comctl.privatePost('/1/formtemplate/:deletecanonicalonly', params, onFormDeleted);

    }

    function onResizePaper() {
        function onResizeComplete() {
            window.location.reload();
        }
        Y.doccirrus.modals.resizePaper.show(template, onResizeComplete);
    }

    /**
     *  Called when BFB checkbox is clicked
     */

    function onBFBStateChange() {
        template.isBFB = jq.chkBFB.prop('checked');
        jq.divBFBPanel = $('#divAgBFB');
        if (template.isBFB) {
            jq.divBFBPanel.show();
        } else {
            jq.divBFBPanel.hide();
        }
        template.raise('bfbChange', template);
    }

    function onClickInSight2() {
        if ( 'InCase_T' === template.reducedSchema ) {
            template.setSchema( 'InSuite_T', onSchemaToggle );
        } else {
            template.setSchema( 'InCase_T', onSchemaToggle );
        }

        function onSchemaToggle( err ) {
            if ( err ) {
                Y.log( 'Error changing schema: ' + JSON.stringify( err ), 'warn', NAME );
            }
        }
    }

    //  toggled useReporting checkbox
    function onUseReportingChange() {
        var cbValue = jq.chkUseReporting.prop('checked');

        //  if correct value is already set then skip this step, prevent duplicate events
        if ( template.useReporting === cbValue ) { return; }

        template.useReporting = cbValue;
        //template.autosave( Y.dcforms.nullCallback );
        template.raise( 'useReportingChange', template.useReporting );
    }

    //  toggle PDF only display mode for EXTMOJ-1985 (display form as static PDF pages with PDF attachments concatenated on)
    function onIsPdfAttachedChange() {
        var cbValue = jq.chkIsPdfAttached.prop('checked');

        //  if correct value is already set then skip this step, prevent duplicate events
        if ( template.isPdfAttached === cbValue ) { return; }

        template.isPdfAttached = cbValue;
        //template.autosave( Y.dcforms.nullCallback );
        template.raise( 'isPdfAttachedChange', template.isPdfAttached );
    }

    function onIsLetterChange() {
        var cbValue = jq.chkIsLetter.prop('checked');

        //  if correct value is already set then skip this step, prevent duplicate events
        if ( template.isLetter === cbValue ) { return; }

        template.isLetter = cbValue;
        //template.autosave( Y.dcforms.nullCallback );
        template.raise( 'isLetterChange', template.isLetter );
    }

    function onUtf8Change() {
        var cbValue = jq.chkUtf8.prop('checked');

        //  if correct value is already set then skip this step, prevent duplicate events
        if ( template.utf8 === cbValue ) { return; }

        template.utf8 = cbValue;
        //template.autosave( Y.dcforms.nullCallback );
        template.raise( 'ut8Change', template.utf8 );
    }

    //  Form's schema has been changed, update schema select and insight checkbox

    function onReducedSchemaChanged() {
        updateInSight2();
        jq.selSelectSchema.val( template.reducedSchema );
    }

    /**
     *  Called when activity select box is changed
     */

    function onActTypeChange() {
        template.actType = jq.selActType.val();
    }

    /**
     *  Event handler, called when user selects a form in the tree at left
     *  @param instanceId
     */

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            /*
             *  recover any dcforms-element reference which was passed to this
             */
            if (('undefinded' !== node.passToBinder) && ('undefined' !== node.passToBinder.template)) {
                template = node.passToBinder.template;
            }

            /*
             *  Cache Query selectors for controls
             */

            jq = {                                                  //%  pre-cached cached DOM queries [object]
                'selFormLang': $('#selFormLang'),
                'txtFormName': $('#txtFormName'),
                'txtFormFile': $('#txtFormFile'),
                'txtFormGrid': $('#txtFormGrid'),
                'txtFormShortName': $('#txtFormShortName'),
                'divSelFormSchema': $('#divSelFormSchema'),
                'chkSubform': $('#chkSubform'),
                'chkFixed': $('#chkFixed'),
                'chkReadOnly': $('#chkFormReadOnly'),
                'chkBFB': $('#chkBFB'),
                'chkInSight2': $('#chkInSight2'),
                'chkUseReporting': $('#chkUseReporting'),
                'chkIsPdfAttached': $('#chkIsPdfAttached'),
                'chkIsLetter': $('#chkIsLetter'),
                'chkUtf8': $('#chkUtf8'),
                'spanPaperSize': $('#spanPaperSize'),
                'btnUpdateFormProperties': $('#btnUpdateFormProperties'),
                'btnCopyForm': $('#btnCopyForm'),
                'selDefaultFor': $('#selDefaultFor'),
                'selActType': $('#selActType'),
                'btnDeleteForm': $('#btnDeleteForm'),
                'btnBumpVersion': $('#btnBumpVerison'),
                'btnResizePaper': $('#btnResizePaper'),
                'tdFormSchema': $('#tdFormSchema'),
                'tdFormFileName': $('#tdFormFileName'),
                'tdReadOnly': $('#tdReadOnly'),
                'tdInSight2': $('#tdInSight2'),
                'tdUseReporting': $('#tdUseReporting')
            };

            /*
             *  Instantiate and bind the KO model
             */

            initForm();

            editFormPropertiesVM = new EditFormPropertiesVM();

            ko.applyBindings( editFormPropertiesVM, document.querySelector( '#divEditFormContainer' ) );

            /**
             *  Subscribe to ws events
             */

            //  add socket event listener for check before form deletion, MOJ-11160
            Y.doccirrus.communication.on( {
                event: 'checkFormIsInUse',
                // note: specifying a socket here will cause this to fail after navigation,
                // omitting this option will cause whichever is the current socket to be used
                //socket: Y.doccirrus.communication.getSocket( '/' ),
                done: onCheckInUse,
                handlerId: 'checkFormIsInUse-' + NAME
            } );

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for edit_form_properties.js - ' + node.getAttribute('id'), 'debug', NAME);

            //  unsubscribe from any form events

            Y.dcforms.event.off('*', NAME);

            //  unsubscribe from ws events
            Y.doccirrus.communication.off( 'checkFormIsInUse', 'checkFormIsInUse-' + NAME );

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screw up future use of this DOM node, which we might need
            //node.destroy();
        }
    };

}