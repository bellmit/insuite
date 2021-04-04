/*
 * Copyright (c) 2012 Doc Cirrus GmbH
 * all rights reserved.
 */

//  unused vars periodically useful for debugging and test of new festures, please leave:
/*eslint prefer-template:0, strict:0, no-unused-vars: 0 */
/*exported _fn */
/*global YUI, $, moment, jQuery, setViewportWide, ko, woofmark, megamark, domador */

function _fn(Y, NAME) {             // eslint-disable-line
    'use strict';

    /*
     *  LOCAL VARIABLES
     */

    var
        i18n = Y.doccirrus.i18n,

        myNode,
        formEditorVM,               //  single instance of FormEditorVM
        KoViewModel = Y.doccirrus.KoViewModel,

        patientRegId = '',          //  to allow editing remotely view PUC proxy (not used at present)
        jqCache = {},               //  cached jquery references
        template,                   //  dcforms-template object
        leftCol = true,             //  show (true) or hide (false) the left column
        wideViewport = false,       //  fit to viewport (true) or default theme (false)
        selectedElement = '',       //  identifies selected dcforms-element object
        lastCategory = '',          //  to check when category changes and reload the tree
        selectedPanel = '',         //  selected accordion group on left column
     // newElementDrag,             //  allows selection on drag end of a new element MOJ-1059

        selectedDefaultForms = [],
        selectedUserForms = [],
        FormsTreeModel = KoViewModel.getConstructor( 'FormsTreeViewModel' ),
        WYSWYGViewModel = KoViewModel.getConstructor( 'WYSWYGViewModel' ),

        mediaMetaData = [],         //  set of images attached to this form

        //  map of event names to handlers, subscribed when template object is created
        eventHandlers = {
            'pageSelected': onPageSelected,
            'pageRemoved': onPageRemoved,
            'elementSelected': onElementSelected,
            'requestImage': selectAttachedImage,
            'formTitleChange': onFormTitleChange,
            'modeSet': onModeSet,
            'schemaSet': onSchemaSet,
            'changeUserLang': onChangeUserLang,
            'saved': onTemplateSaved,
            'elementCreated': onElementCreated,
            'requestMarkdownModal': onRequestMarkdownModal
        };

    /*
     *  BINDER ACTIONS - load child controls, change states, etc
     */

    function FormEditorVM() {
        var
            self = this;

        /**
         *  Initialize the form editor view model
         */

        function init() {
            initWYSWYG();
            initAccordionPanel();
            initBoundTranslations();
            initComputeds();
            initFormsTrees();
        }

        function initWYSWYG() {
            self.wyswyg = new WYSWYGViewModel( { content: self.userContent } );
        }

        function initFormsTrees() {
            var inDevMode = ( jqCache.chkFormDevOptions && jqCache.chkFormDevOptions.prop( 'checked' ) );

            //  TODO: development mode to hide special archive folder

            self.formsTreeUser = new FormsTreeModel({
                showLockedForms: false,
                showEmptyFolders: true,
                isEditable: true,
                onSelect: onFormTreeSelection,
                onAddForm: onAddFormFromTree
            });

            self.formsTreeDefault = new FormsTreeModel({
                showLockedForms: true,
                showEmptyFolders: true,
                onSelect: onFormTreeSelection
            });

            self.formSearchText = ko.observable( '' );

            self.formSearchListener = self.formSearchText.subscribe( function( query ) {
                self.formsTreeUser.setTextFilter( query );
                self.formsTreeDefault.setTextFilter( query );
            } );
        }

        function initAccordionPanel() {
            var
                accordionGroupPanels = [ 'Form', 'BFB', 'Schema', 'Pdf', 'Page', 'Element', 'Images', 'Debug' ],
                k, i;

            self.selectedPanel = ko.observable( 'Form' );

            for ( i = 0; i < accordionGroupPanels.length; i++ ) {
                k = accordionGroupPanels[i];
                self[ 'collapseAg' + k ] = makePanelToggle( k );
                self[ 'showAg' + k ] = ko.computed( makeVisibleComputed( k ) );
            }

            function makePanelToggle( panelId ) {
                return function() {
                    var showPanel = self.selectedPanel() !== panelId ? panelId : '';
                    self.selectedPanel( showPanel );
                };
            }

            function makeVisibleComputed( panelId ) {
                return function() {
                    return ( self.selectedPanel() === panelId );
                };
            }
        }

        function initComputeds() {
            var
                LBL_PAGE = i18n('FormEditorMojit.fe.view.LBL_PAGE'),
                LBL_PAGE_OF = i18n('FormEditorMojit.fe.view.LBL_PAGE_OF');

            self.pageNo = ko.observable( 0 );
            self.pageCount = ko.observable( 0 );

            self.editFormLblPageI18n = ko.computed( function() {
                return LBL_PAGE + ' ' + ( self.pageNo() ) + ' ' + LBL_PAGE_OF + ' ' + self.pageCount();
            } );
        }

        function onAddFormFromTree( formFolder ) {
            if ( !formFolder || !formFolder._id ) { return; }
            showNewFormPopup( formFolder._id );
        }

        function initBoundTranslations() {
            self.editFormFormTreeI18n = i18n('FormEditorMojit.fe.view.LBL_FORMSTREE');
            self.editFormFormTreeDefaultI18n = i18n('FormEditorMojit.fe.view.LBL_FORMSTREEDEFAULT');
            self.editFormLblLoadingListI18n = i18n('FormEditorMojit.fe.view.LBL_LOADING_LIST');
            self.editFormBtnCopyDefaultI18n = i18n('FormEditorMojit.ctrl.BTN_COPY_DEFAULT');
            self.editFormLblMappingTipI18n = i18n('FormEditorMojit.fe.view.LBL_MAPPING_TIP');
            self.editFormLblTestMapI18n = i18n('FormEditorMojit.fe.view.LBL_TEST_MAP');
            self.editFormBtnApplyMapI18n = i18n('FormEditorMojit.fe.view.BTN_APPLY_MAP');
            self.editFormBtnUnmapI18n = i18n('FormEditorMojit.fe.view.BTN_UNMAP');
            self.editFormBtnPrintDebugI18n = i18n('FormEditorMojit.fe.view.BTN_PRINTDEBUG');
            self.editFormLblFormI18n = i18n('FormEditorMojit.fe.view.LBL_FORM');
            self.editFormLblLoadingPropertiesI18n = i18n('FormEditorMojit.fe.view.LBL_LOADING_PROPERTIES');
            self.editFormLblBfbI18n = i18n('FormEditorMojit.fe.view.LBL_BFB');
            self.editFormLblSchemaI18n = i18n('FormEditorMojit.fe.view.LBL_SCHEMA');
            self.editFormLblNoSchemaI18n = i18n('FormEditorMojit.fe.view.LBL_NOSCHEMA');
            self.editFormLblPdfOptionsI18n = i18n('FormEditorMojit.fe.view.LBL_PDF_OPTIONS');
            self.editFormLblPageI18n = i18n('FormEditorMojit.fe.view.LBL_PAGE');
            self.editFormLblSelectPageI18n = i18n('FormEditorMojit.fe.view.LBL_SELECT_PAGE');
            self.editFormLblElementI18n = i18n('FormEditorMojit.fe.view.LBL_ELEMENT');
            self.editFormLblSelectFormI18n = i18n('FormEditorMojit.fe.view.LBL_SELECT_ELEMENT');
            self.editFormLblImagesI18n = i18n('FormEditorMojit.fe.view.LBL_IMAGES');
            self.editFormLblDebugI18n = i18n('FormEditorMojit.fe.view.LBL_DEBUG');
            self.editFormLblShowDebugI18n = i18n('FormEditorMojit.fe.view.LBL_SHOW_DEBUG');
            self.editFormBtnExportPdfI18n = i18n('FormEditorMojit.ctrl.BTN_EXPORT_PDF');
            self.editFormBtnEditFormI18n = i18n('FormEditorMojit.ctrl.BTN_EDIT_FORM');
            self.editFormNewFoermI18n = i18n('FormEditorMojit.fe.view.BTN_NEWFORM');
            self.editFormBtnFillFormI18n = i18n('FormEditorMojit.ctrl.BTN_FILL_FORM');
            self.editFormBtnResetFormI18n = i18n('FormEditorMojit.ctrl.BTN_RESET_FORM');
            self.editFormAddFormElementI18n = i18n('FormEditorMojit.new_el_form.ADD_FORM_ELEMENT');
            self.editFormNewPageI18n = i18n('FormEditorMojit.fe.view.menu.NEWPAGE');
            self.editFormMenuLabelI18n = i18n('FormEditorMojit.fe.view.menu.LABEL');
            self.editFormMenuInputI18n = i18n('FormEditorMojit.fe.view.menu.INPUT');
            self.editFormMenuTaI18n = i18n('FormEditorMojit.fe.view.menu.TA');
            self.editFormMenuTextmatrixI18n = i18n('FormEditorMojit.fe.view.menu.TEXTMATRIX');
            self.editFormMenuHyperlinkI18n = i18n('FormEditorMojit.fe.view.menu.HYPERLINK');
            self.editFormMenuCheckboxI18n = i18n('FormEditorMojit.fe.view.menu.CHECKBOX');
            self.editFormMenuCheckTransI18n = i18n('FormEditorMojit.fe.view.menu.CHECKBOXTRANS');
            self.editFormMenuToggleBoxI18n = i18n('FormEditorMojit.fe.view.menu.TOGGLEBOX');
            self.editFormMenuDateI18n = i18n('FormEditorMojit.fe.view.menu.DATE');
            self.editFormMenuRadioI18n = i18n('FormEditorMojit.fe.view.menu.RADIO');
            self.editFormMenuRadiotransI18n = i18n('FormEditorMojit.fe.view.menu.RADIOTRANS');
            self.editFormMenuDropdownI18n = i18n('FormEditorMojit.fe.view.menu.DROPDOWN');
            self.editFormMenuTableI18n = i18n('FormEditorMojit.fe.view.menu.TABLE');
            self.editFormMenuReportTableI18n = i18n('FormEditorMojit.fe.view.menu.REPORTTABLE');
            self.editFormMenuLabdataTableI18n = i18n('FormEditorMojit.fe.view.menu.LABDATATABLE');
            self.editFormMenuMeddataTableI18n = i18n('FormEditorMojit.fe.view.menu.MEDDATATABLE');
            self.editFormMenuContactTableI18n = i18n('FormEditorMojit.fe.view.menu.CONTACTTABLE');

            self.editFormMenuImageI18n = i18n('FormEditorMojit.fe.view.menu.IMAGE');
            self.editFormMenuBarcodeI18n = i18n('FormEditorMojit.fe.view.menu.BARCODE');
            self.editFormMenuAudioI18n = i18n('FormEditorMojit.fe.view.menu.AUDIO');
            self.editFormMenuVideoI18n = i18n('FormEditorMojit.fe.view.menu.VIDEO');
            self.editFormSubformI18n = i18n('FormEditorMojit.fe.view.menu.SUBFORM');
            self.editFormMenuChartMDI18n = i18n('FormEditorMojit.fe.view.menu.CHARTMD');
            self.editFormMenuEnglishI18n = i18n('FormEditorMojit.fe.view.menu.ENGLISH');
            self.editFormMenuGermanI18n = i18n('FormEditorMojit.fe.view.menu.GERMAN');
            self.editFormMenuBtnTranslateI18n = i18n('FormEditorMojit.translations_modal.BTN_TRANSLATE');
            self.editFormBtnTestformI18n = i18n('FormEditorMojit.fe.view.BTN_TESTFORM');
            self.editFormBtnTestcatsI18n = i18n('FormEditorMojit.fe.view.BTN_TESTCATS');
            self.editFormBtnSavediscI18n = i18n('FormEditorMojit.fe.view.BTN_SAVEDISK');
            self.editFormBtnResetAllI18n = i18n('FormEditorMojit.fe.view.BTN_RESETALL');
            self.editFormBtnNewPageI18n = i18n('FormEditorMojit.fe.view.BTN_NEWPAGE');

            self.formSearchPlaceholder = i18n('FormEditorMojit.forms_tree.SEARCH_PLACEHOLDER');

        }

        //  Event handlers

        /**
         *  Raised when a template is loaded
         *  @param template
         */

        self.onTemplateLoaded = function( newTemplate ) {
            self.pageNo( 1 );
            self.pageCount( newTemplate.pages.length );
        };

        //  initialize this VM
        init();
    }

    /*
     *  BINDER ACTIONS - load child controls, change states, etc
     */

    /**
     *  Load a form into the editor
     *
     *  @param  canonicalId {string}    ID of the current master / canonical copy of a form template
     */

    function loadTemplate(canonicalId) {
        var
            divId = 'divFormsEdit',
            il8nDict = Y.dcforms.il8nDict,
            passTemplate;

        function onFormLoaded(err) {
            if (err) {
                //  TODO: clear the UI or pop a modal
                Y.log('Could not load form template: ' + err, 'warn', NAME);
                return;
            }
            passTemplate.ownerId = canonicalId;
            onTemplateLoaded(passTemplate);
        }

        function onTemplateCreated(err, newTemplate) {

            if (err) {
                Y.log('Could not create formtemplate: ' + err, 'warn', NAME);
                return;
            }

            passTemplate = newTemplate;

            //  subscribe to events on this new template
            registerEventHandlers(newTemplate);

            formEditorVM.onTemplateLoaded( newTemplate );

            //newTemplate.load(canonicalId, '', onFormLoaded);
            onFormLoaded(null);
        }

        //  unload any existing template
        //  unload any existing template
        if (template && template.destroy) {
            deregisterEventHandlers(template);
            template.destroy();
        }

        //  RESTController is passing strings weirdly sometimes
        canonicalId = canonicalId.replace('"', '');
        canonicalId = canonicalId.replace('"', '');
        canonicalId = canonicalId.replace('#/form/', '');

        //Y.log('Binder requesting template load: ' + instanceId, 'info', NAME);
        window.location.hash = '#form=' + canonicalId;
        $('#' + divId).show();

        //  remove any previous handlers mapped to a different template\
        if (template) {
            deregisterEventHandlers(template);
        }

        //  create new new template object
        Y.dcforms.createTemplate({
            'patientRegId': '',
            'canonicalId': canonicalId,
            'formVersionId': '',
            'divId': divId,
            'il8nDict': il8nDict,
            'doRender': false,
            'isInEditor': true,
            'callback': onTemplateCreated
        });

        //Y.dcforms.template.create('', '', '', divId, il8nDict, true, onTemplateCreated);
    }

    /**
     *  Try load form named in URL hash fragment
     *  Stub: Very simple for now, may need to become a more complicated parser in future
     */

    function loadFromHashFragment() {
        var
            hash = window.location.hash,
            instanceId = hash.replace('#form=', '');

        if (('' === instanceId) ||('#' === instanceId)) {return; }
        loadTemplate(instanceId);
    }



    /**
     *  Try load default / start form for current user
     *  Form config to passed in hidden div on page in future, to avoid this extra AJAX request
     */

    function loadDefaultForm() {
        Y.log('No form specifed in URL, attempting to load default for current PRC', 'debug', NAME);

        function onStartFormQuery(err, canonicalId) {
            if (err) {
                Y.log('Could not load default form: err', 'warn', NAME);
                return;
            }

            if ('' === canonicalId) {
                Y.log('No default form has been set, please select one.', 'warn', NAME);
                //  TRANSLATEME:  No default form is set, you can define on ein the editor
                Y.doccirrus.comctl.setModal(
                    'Hinweis',
                    'Standardformular ist nicht festgelegt. Bitte im inForm Editor zuweisen.',
                    true
                );
                return;
            }

            window.location.hash = '#form=' + canonicalId;
            loadFromHashFragment();
        }

        Y.dcforms.getConfigVar( patientRegId, 'startform', false, onStartFormQuery );
    }

    /**
     *  Load form specified in URL as hash fragment with instanceId
     */

    function showSingleDiagnostic() {
        var
            hash = window.location.hash,
            canonicalId = hash.replace('#form=', '');

        function onModalReady() {
            var debugNode = Y.one('#divModalDebug');

            debugNode.passToBinder = { 'canonicalId': canonicalId };

            //  callback from jadeLoader
            function onFormTestLoaded() {
                Y.log('Form tree loaded', 'debug', NAME);
            }

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'forms_debug',
                'FormEditorMojit',
                {},
                debugNode,
                onFormTestLoaded
            );
        }

        if (('' === canonicalId) ||('#' === canonicalId)) {return; }
        Y.doccirrus.comctl.setModal('JSON', '<div id="divModalDebug">Loading: ' + canonicalId + '</div>', true, null, onModalReady);
    }


    /**
     *  Test / Development action to display the current set of form categories
     */

    function loadCategoriesTest() {

        function onModalReady() {
            Y.doccirrus.comctl.setModal(
                'Form Categories',
                '<pre>' + JSON.stringify(Y.dcforms.categories, undefined, 2) + '</pre>',
                true
            );
        }

        Y.doccirrus.comctl.setModal(
            'Form Categories',
            'Loading',
            true,
            null,
            onModalReady
        );

    }

    /**
     *  jade load the 'edit form properties' panel
     *  @param callback
     */

    function loadEditForm(callback) {
        //var formNode = myNode.one('#divEditForm');
        var formNode = Y.one('#divEditForm');

        formNode.passToBinder = {
            'template': template
        };

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'edit_form_properties',
            'FormEditorMojit',
            {},
            formNode,
            function onFormPropertiesLoaded() {
                //Y.log('CALLBACK: loaded form properties dialog: ' + template.instanceId, 'debug', NAME);
                callback();
            }
        );
    }

    /**
     *  Show forms import/export dialog in modal
     */

    function showExportDialog() {
        Y.doccirrus.modals.formImportExport.show( {
            onImport: onFormsListReload,
            debugMode: formEditorVM.formsTreeUser.debugMode()
        } );
    }

    /**
     *  Loads panel for editing page properties
     *  editing form templates.
     *
     *  @param  divId           {string}    DOM ID of element to render the control into
     *  @param  template        {object}    A dcforms-template object
     */

    function loadEditPageForm(divId, template) {
        var pageNode = myNode.one('#' + divId);

        function onLoadEditPagePanel() {
            Y.log('Loaded page edit form', 'debug', NAME);
        }

        pageNode.passToBinder = {
            'template': template
        };

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'edit_page_properties',
            'FormEditorMojit',
            {},
            pageNode,
            onLoadEditPagePanel
        );
    }

    /**
     *  Loads panel for editing PDF/Print options
     *
     *  @param divId
     *  @param template
     */

    function loadEditPdfForm(divId, template) {
        $('#' + divId).html('');

        var elementNode = myNode.one('#' + divId);

        elementNode.passToBinder = { 'template': template };

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'edit_pdf_properties',
            'FormEditorMojit',
            {},
            elementNode,
            Y.dcforms.nullCallback
        );
    }

    /**
     *  Loads panel for editing a single elements
     *  editing form templates.
     *
     *  @param  divId           {string}    DOM ID of element to render the control into
     *  @param  template        {object}    A dcforms-template object
     */

    function loadEditElementForm(divId, template) {

        $('#' + divId).html('');

        var elementNode = myNode.one('#' + divId);

        elementNode.passToBinder = {
            'template': template
        };

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'edit_element_basic',
            'FormEditorMojit',
            {},
            elementNode,
            function onLoadEditPage() {
                //Y.log('CALLBACK: Loaded elememt edit form', 'debug', NAME);
                $('#divFormElementEditor').show();
            }
        );
    }

    /**
     *  Loads panel for editing a single elements
     *  editing form templates.
     *
     *  @param  divId           {string}    DOM ID of element to render the control into
     *  @param  template        {object}    A dcforms-template object
     */

    function loadBFBPropertiesForm(divId, template) {

        $('#' + divId).html('');

        var elementNode = myNode.one('#' + divId);

        elementNode.passToBinder = {
            'template': template
        };

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'edit_bfb_properties',
            'FormEditorMojit',
            {},
            elementNode,
            function onLoadEditPage() {
                //Y.log('CALLBACK: Loaded elememt edit form', 'debug', NAME);
                $('#divFormElementEditor').show();
            }
        );
    }

    /**
     *  Loads image attachment widget into accordion at left, used to manage attached/embedded images when
     *  editing form templates.
     *
     *  @param  divId               {string}    DOM ID of element to render the control into
     *  @param  withOwnerId         {string}    Unique ID of this user's copy of the form template
     *  @param  withOwnerCollection {string}    Name of forms collection, 'forms' for now
     *  @param  callback            {function}  jadeLoader callback of the form fn(err, templateId)
     */

    function loadImageControl(divId, withOwnerId, withOwnerCollection, callback) {

        function onMediaChanged(newMediaMeta) {
            //  save in local variable
            //Y.log('media meta changed to ' + JSON.stringify(newMediaMeta, undefined, 2), 'debug', NAME);
            mediaMetaData = newMediaMeta;
        }

        var imagesNode = myNode.one('#' + divId);

        imagesNode.passToBinder = {
            'onChange': onMediaChanged,
            'ownerId': withOwnerId,
            'ownerCollection': withOwnerCollection,
            'label': 'user',
            'allowCategories': [ 'image' ],
            'widthPx': 68,
            'heightPx': 68
        };

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'list_attachments',
            'MediaMojit',
            {},
            imagesNode,
            callback
        );
    }

    /**
     *  Attach event handlers to the 'add elements' drop-down menu
     */

    function addElementMenu() {
        setAddElement(jqCache.aAddLabel, 'label');
        setAddElement(jqCache.aAddInput, 'input');
        setAddElement(jqCache.aAddTextarea, 'textarea');
        setAddElement(jqCache.aAddTextMatrix, 'textmatrix');
        setAddElement(jqCache.aAddHyperlink, 'hyperlink');
        setAddElement(jqCache.aAddDate, 'date');
        setAddElement(jqCache.aAddCheckbox, 'checkbox');
        setAddElement(jqCache.aAddCheckboxTrans, 'checkboxtrans');
        setAddElement(jqCache.aAddTogglebox, 'togglebox');
        setAddElement(jqCache.aAddRadio, 'radio');
        setAddElement(jqCache.aAddRadioTrans, 'radiotrans');
        setAddElement(jqCache.aAddTable, 'table');
        setAddElement(jqCache.aAddReportTable, 'reporttable');
        setAddElement(jqCache.aAddLabdataTable, 'labdatatable');
        setAddElement(jqCache.aAddMeddataTable, 'meddatatable');
        setAddElement(jqCache.aAddContactTable, 'contacttable');
        setAddElement(jqCache.aAddDropdown, 'dropdown');
        setAddElement(jqCache.aAddBarcode, 'barcode');
        setAddElement(jqCache.aAddAudio, 'audio');
        setAddElement(jqCache.aAddVideo, 'video');
        setAddElement(jqCache.aAddSubform, 'subform');
        setAddElement(jqCache.aAddImage, 'image');
        setAddElement(jqCache.aAddChartMD, 'chartmd');
    }

    /**
     *  Set up links to add new elements to a form
     *
     *  @param  jqMenuItem  {object}    jQuery selector of menu item
     *  @param  elemType    {string}    Name of element type
     */

    function setAddElement(jqMenuItem, elemType) {
        jqMenuItem
            .off('click.forms')
            .on('click.forms', function() {
                template.setNextElemType(elemType);
            });
    }

    /**
     *  JadeLoaded dialog to create a new form
     */

    function showNewFormPopup( formFolderId ) {

        function onOKClick() {
            Y.dcforms.event.raise('onNewFormButtonClick', { 'caller': NAME });
        }

        //  async because it might need to load translation dict, etc
        function onModalVisible(err) {

            if (err) {
                Y.log('Cannot create modal for adding new forms: ' + err, 'warn', NAME);
                return;
            }

            var
                result = { 'mytest': 'testvalue' },
                newFormNode = Y.one('#divNewFormModal');

            newFormNode.passToBinder = {
                'formFolderId': formFolderId,
                'onFormCreated': onNewFormCreated
            };

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'forms_new',
                'FormEditorMojit',
                result,
                newFormNode,
                function onNewFormModalLoaded() {
                    Y.log('Showing modal to create new form', 'debug', NAME);
                }
            );
        }

        Y.doccirrus.comctl.setModal(
            Y.doccirrus.i18n('FormEditorMojit.generic.LBL_CREATE_A_NEW_FORM'),           //  title
            '<div id="divNewFormModal">...</div>',              //  content
            true,                                               //  show close button
            onOKClick,                                          //  OK button event
            onModalVisible                                      //  callback when created
        );

    }

    function setTitle() {
        if (
            (template) &&
            ('object' === typeof template) &&
            (true === template.hasOwnProperty('name')) &&
            (true === template.name.hasOwnProperty(template.userLang))
        ) {
            jqCache.hTitle.html(template.name[template.userLang] + ' v' + template.version + '.' + template.revision);
        } else {
            jqCache.hTitle.html('...');
        }
    }

    /**
     *  Show a modal to select an attached image
     *  @param  binderOptions   {object}    See img_select
     */

    function selectAttachedImage(binderOptions) {

        //  async because it might need to load translation dict, etc
        function onModalVisible(err) {

            if (err) {
                Y.log('Cannot create modal for selecting image: ' + err, 'warn', NAME);
                return;
            }

            var newFormNode = Y.one('#divSelectImageModal');
            newFormNode.passToBinder = binderOptions;

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'img_select',
                'MediaMojit',
                {},
                newFormNode,
                function onNewFormModalLoaded() {
                    Y.log('Showing modal to create new form', 'debug', NAME);
                }
            );
        }

        Y.doccirrus.comctl.setModal(
            Y.doccirrus.i18n('FormEditorMojit.generic.LBL_SELECT_IMAGE'),                //  title
            '<div id="divSelectImageModal">...</div>',          //  content
            false,                                              //  show close button
            null,                                               //  OK button event
            onModalVisible                                      //  callback when created
        );

    }

    /**
     *  Load an object via the REST API and try to map it into the current forms
     *
     *  @param testValues   {String}    Name of an object type available via REST
     */

    function mapTestObject(testValues) {

        function onObjectLoadSuccess(data) {

            if ('string' === typeof data) {
                data = JSON.parse(data);
            }

            if( data instanceof Array ) {
                if (0 === data.length) {
                    onObjectLoadFailure( Y.doccirrus.i18n('FormEditorMojit.fe.LBL_QUERY_EMPTY'));
                    return;
                }
                data = data[0];
            }

            var msg = '<pre>' + JSON.stringify(data, undefined, 2) + '</pre>';

            function onReRendered() {
                Y.log('Mapped data rendered', 'debug', NAME);
            }

            function onDataMapped(err) {
                if (err) {
                    Y.log('Error mapping data: ' + err, 'warn', NAME);
                    //  try re-render anyway
                }

                template.render(onReRendered);
            }

            function onOKMap() {
                Y.doccirrus.comctl.clearModal();
                //Y.log('Mapping template with: ' + JSON.stringify(data), 'debug', NAME);
                template.map(data, false, onDataMapped);
            }

            Y.doccirrus.comctl.setModal(
                Y.doccirrus.i18n('FormEditorMojit.fe.LBL_SUCCESS'),
                Y.doccirrus.i18n('FormEditorMojit.fe.LBL_LOADED_OBJECT') + '<br/>' + msg + Y.doccirrus.i18n('FormEditorMojit.fe.LBL_OK_MAP'),
                true,
                onOKMap
            );
        }

        function onObjectLoadFailure(err) {
            Y.doccirrus.comctl.setModal(
                Y.doccirrus.i18n('FormEditorMojit.fe.LBL_FAILURE'),
                Y.doccirrus.i18n('FormEditorMojit.fe.LBL_COULD_NOT_LOAD') + '<br/>' + testValues + '<br/>' + err
            );
        }

        var jsonObj,
            objArray = [];

        testValues = jQuery.trim(testValues);

        if ('{' === testValues.substring(0, 1)) {
            try {
                jsonObj = JSON.parse(testValues);
            } catch ( parseErr ) {
                Y.doccirrus.comctl.setModal( 'JSON parse err', JSON.stringify( parseErr ) );
                return;
            }

            objArray.push(jsonObj);
            onObjectLoadSuccess(objArray);
        }

        if ('http' === testValues.substring(0, 4) || '//' === testValues.substring(0, 2)) {
            $.ajax({
                type: 'GET',
                xhrFields: { withCredentials: true },
                url: testValues,
                success: onObjectLoadSuccess,
                error: onObjectLoadFailure
            });

        }

    }

    /**
     *  Toggle visibility of language buttons
     */

    function updateLangButtons() {
        var genderIcon;
        switch( template.gender ) {
            case 'n':   genderIcon = 'fa-genderless';   break;
            case 'f':   genderIcon = 'fa-venus';        break;
            case 'm':   genderIcon = 'fa-mars';         break;
        }
        genderIcon = '<i class="fa ' + genderIcon + '"></i>';
        jqCache.spanLangLabel.html( '&nbsp;' + genderIcon + '&nbsp;' + template.userLang.toUpperCase() );
    }

    /**
     *  Handle events raised by form and DOM
     *
     *  @param template
     */

    function registerEventHandlers(template) {
        var k;

        //  events raised by the form template
        for (k in eventHandlers) {
            if (eventHandlers.hasOwnProperty(k)) {
                template.on(k, 'formeditor', eventHandlers[k]);
            }
        }

        //  events in the dom
        $( 'body' ).off( 'keydown' ).on( 'keydown', onKeyDown );
        $( 'body' ).off( 'keyup' ).on( 'keyup', onKeyUp );

        function onKeyDown( evt ) {
            if ( template ) {
                template.kb.ctrl = evt.ctrlKey;
                template.kb.shift = evt.shiftKey;
            }
        }

        function onKeyUp( evt ) {
            if ( template ) {
                template.kb.ctrl = evt.ctrlKey;
                template.kb.shift = evt.shiftKey;
            }
        }

    }

    /**
     *  De-register events handlers when changing form
     *
     *  @param  template    {Object}    A dcforms-template object
     */

    function deregisterEventHandlers(template) {
        template.off('*', 'formeditor');
    }

    /*
     *  EVENT HANDLERS
     */

    /**
     *  Called after template is instantiated and loaded from the server
     *  TODO: tidy this process with async
     */

    function onTemplateLoaded(newTemplate) {

        template = newTemplate;
        template.isInEditor = true;

        Y.log('Form template loaded... ' + template.canonicalId + ' -v- ' + template.formVersionId, 'info', NAME);

        //  Apply any user language preference
        var formUserLang = Y.dcforms.getUserLang(template.formId);

        if (formUserLang && ('' !== formUserLang)) {
            if (template.userLang !== formUserLang) {
                Y.log('Setting form language from stored preference: ' + formUserLang, 'info', NAME);
                template.setUserLang(formUserLang);
            }
        }

        lastCategory = template.category;

        //  set the form title in user language
        setTitle();

        //  set or update handlers for menu buttons
        jqCache.btnEdit.off('click.forms').on('click.forms', onEditBtnClick);
        jqCache.btnCopyDefault.off('click.forms').on('click.forms', onCopyBtnClick);
        jqCache.btnFill.off('click.forms').on('click.forms', onFillBtnClick);
        jqCache.btnTest.off('click.forms').on('click.forms', onTestBtnClick);
        jqCache.btnTestCats.off('click.forms').on('click.forms', onTestCatsBtnClick);
        jqCache.btnPDF.off('click.forms').on('click.forms', onPDFBtnClick);
        jqCache.btnReset.off('click.forms').on('click.forms', onResetBtnClick);
        jqCache.aAddPage.off('click.forms').on('click.forms', onAddPageBtnClick);
        jqCache.chkFormDevOptions.off('change').on('change', onDebugToggle);
        jqCache.btnApplyMap.off('click').on('click', onApplyMappedObjectBtnClick);
        jqCache.btnUnMap.off('click').on('click', onUnMapObjectBtnClick);

        jqCache.aLangEN.off('click').on('click', function() { updateLangOptions( 'en', 'n' ); } );
        jqCache.aLangDE.off('click').on('click', function() { updateLangOptions( 'de', 'n' ); } );
        jqCache.aLangDEF.off('click').on('click', function() { updateLangOptions( 'de', 'f' ); } );
        jqCache.aLangDEM.off('click').on('click', function() { updateLangOptions( 'de', 'm' ); } );

        jqCache.btnEditTranslations.off('click').on('click', onEditTranslationsBtnClick);

        //  load form property panels
        loadEditForm(function(){
            Y.log('Loaded edit form.', 'debug', NAME);
        });

        loadEditPageForm('divEditPage', template);
        loadEditPdfForm('divPrintOptions', template);
        loadEditElementForm('divEditElement', template);
        loadBFBPropertiesForm('divBFBAtForm', template);
        loadImageControl('divEditImages', template.canonicalId, 'forms', Y.dcforms.nullCallback);
        onSchemaSet();

        //  add events to link in 'new element' menu
        addElementMenu();

        onModeSet(template.mode);

        //  enable debug mode automatically if PUC was started with --debug srgument
        if ('true' === $('#ARGV_DEBUG').val()) {
            Y.log('Server started in debug mode, debug controls default on.', 'debug', NAME);
            jqCache.chkFormDevOptions.prop('checked', true);
            onDebugToggle();
        }

        //  change minicolor default theme to Bootstrap, enable RGB format and opacity
        $.minicolors = {
            defaults: {
                opacity: true,
                format: 'rgb',
                theme: 'bootstrap'
            }
        };

        //  show edit or copy button (default, read only forms can be copied but not edited)
        if (template.isReadOnly) {
            jqCache.btnEdit.hide();
            jqCache.btnCopyDefault.show();
            jqCache.spanLockButton.hide();
            jqCache.spanUnLockButton.show();
        } else {
            jqCache.btnEdit.show();
            jqCache.btnCopyDefault.hide();
            jqCache.spanLockButton.show();
            jqCache.spanUnLockButton.hide();
        }

        jqCache.spanLockButton.off('click').on('click', onLockClick);
        jqCache.spanUnLockButton.off('click').on('click', onUnLockClick);

        //  draw / refresh it on canvas - when displayed we may need to update the page height for affix / scroll of
        //  left column

        function onInitialRender() {
            var
                divHeight = $('#divFormsEdit').height(),
                windowHeight = $(window).height(),
                divPadBase = $('#divPadBase');

            if (divHeight < windowHeight) {
                divPadBase.css('height', (windowHeight - divHeight) + 'px');
            } else {
                divPadBase.css('height', '0px');
            }
            // MOJ-4848 temporarily disabled
            //template.setFirstSelected('fixed');
        }

        function onInitialResize() {
            template.render(onInitialRender);
        }

        template.resize( jqCache.formButtonsContainer.width(), onInitialResize );
    }

    function onEditBtnClick() {

        function onReRender() {
            Y.log('Form re-rendered in mode: ' + template.mode, 'debug', NAME);
            onModeSet(template.mode);
        }

        function onEditModeSet() {
            template.render(onReRender);
        }

        template.setMode('edit', onEditModeSet);
    }

    /**
     *  Copy a default form into user forms
     */

    function onCopyBtnClick() {
        $('#btnCopyForm').click();
    }

    function onFillBtnClick() {

        function onReRender() {
            Y.log('Form re-rendered in mode: ' + template.mode, 'debug', NAME);
            onModeSet(template.mode);
        }

        function onFillModeSet() {
            template.render(onReRender);
        }

        template.setMode('fill', onFillModeSet);
    }

    function onTestBtnClick() {
        showSingleDiagnostic();
    }

    function onTestCatsBtnClick() {
        loadCategoriesTest();
    }

    function onPDFBtnClick() {
        Y.dcforms.setStatus(Y.doccirrus.i18n('FormEditorMojit.status_messages.RENDERING_PDF'), true);
        Y.dcforms.makePDF(template, 'temp', '', '', onPDFCreated);
        //template.renderAllPDF('divFormsRender', '', template.name[template.userLang], onPDFCreated);
    }

    function onResetBtnClick() {
        onShowHistory();
    }

    function onAddPageBtnClick(){
        function onPageCreated() {
            Y.log('Added page: ' + newPageName, 'debug', NAME);
            template.render(Y.dcforms.nullCallback);
            formEditorVM.pageCount( template.pages.length );
        }

        var newPageName = 'page' + Math.floor(Math.random() * 100000);

        if (false === template.hasPage(newPageName)) {
            template.addPage(newPageName, {}, onPageCreated);
        }
    }

    function onApplyMappedObjectBtnClick() {
        mapTestObject(jqCache.taMapObj.val());
    }

    function onUnMapObjectBtnClick() {
        var unmapStr = JSON.stringify(template.unmap(), undefined, 2);
        jqCache.taMapObj.val(unmapStr);
        //Y.doccirrus.comctl.setModal('Object', '<pre>' + unmapStr + '</pre>');
    }

    function onEditTranslationsBtnClick() {
        Y.dcforms.editTranslations( template, onTranslationsModalClosed );

        function onTranslationsModalClosed() {
            template.autosave( onTranslationsSaved );
        }

        function onTranslationsSaved( err ) {
            if ( err ) {
                Y.log( 'Problem saving translations: ' + JSON.stringify( err ), 'warn', NAME );
                return;
            }
            Y.log( 'Saved updated translation set.', 'debug', NAME );
        }
    }

    function updateLangOptions( newLang, gender) {
        template.gender = gender;
        template.setUserLang( newLang, Y.dcforms.nullCallback );
        updateLangButtons();
    }

    /**
     *  Called when a new element has been added to the page by user
     *
     *  @param  newElement  {object}    a dcforms-element object which was added
     */

    function onElementCreated(newElement) {
        Y.log('New element created: ' + newElement.getDomId(), 'debug', NAME);

        function onReRender() {
            Y.log('Added new element to page: ' + newElement.elemId, 'debug', NAME);
        }

        //  remove the highlight color
        newElement.bgColor = 'rgba(100, 100, 100, 0.00)';
        newElement.borderColor = 'rgba(0,0,0,0)';

        formEditorVM.selectedPanel( 'Element' );

        if ('image' !== newElement.elemType) {
            //newElement.render(onReRender);
            template.render(onReRender);
            return;
        }

        /**
         *  Called when a picture has been chosen in the image selection modal
         *
         *  @param  media       {Object}      Media metadata object
         *  @param  fixedAspect {Boolean}     True if image is scaled to container, false if cropped
         */

        function onNewImageChosen(media, fixedAspect) {
            var newValue = media && media._id ? media._id : '';

            newElement.imgCache.clear();

            if (!media || !media._id) {
                newElement.setValue('', onSetValue);
                Y.doccirrus.comctl.clearModal();
            }

            newElement.imgFixAspect = fixedAspect;
            newElement.setValue(newValue, onSetValue);
            Y.doccirrus.comctl.clearModal();
        }

        function onSetValue() {
            Y.log( 'Changed image to: ' + newElement.value, 'info', NAME );
            newElement.page.form.raise('valueChanged', newElement);
            newElement.isDirty = true;

            //  there is a strange bug on chrome where image load from dataUri can call back synchronously but
            //  not be immediately ready to blit onto canvas, giving it a half second seems to let it catch up
            //  with itself

            window.setTimeout( function() { newElement.page.redraw(); }, 500 );
        }

        //  remove the highlight color
        newElement.bgColor = 'rgba(100, 100, 100, 0.01)';

        //  pop a modal to choose an image for the new element
        var
            binderOptions = {
                'ownerCollection': 'forms',
                'ownerId': newElement.page.form.canonicalId,
                //'widthPx': newElement.jqSelf().width(),
                //'heightPx': newElement.jqSelf().height(),
                //'ownerCollection': form.ownerCollection,
                //'ownerId': form.ownerId,

                'default': newElement.defaultValue[newElement.page.form.userLang],
                'widthPx': newElement.mm.width,
                'heightPx': newElement.mm.height,

                'onSelected': onNewImageChosen
            };

        selectAttachedImage(binderOptions);
    }

    /**
     *  Pop a modal to show markdown editor, will not have docTree in inForm
     *  @param element
     */

    function onRequestMarkdownModal( element ) {
        var
            isTable = ( 'table' === element.elemType ),
            mdValue = isTable ? element.renderer.getCellValue( element.selRow, element.selCol ) : element.getValue();

        Y.doccirrus.modals.editFormText.show( {
            'value': mdValue,
            'currentActivity': {},
            'showDocTree': false,
            'useWYSWYG': true,
            'onUpdate': onModalTextUpdate
        } );

        function onModalTextUpdate( newValue ) {
            if ( isTable ) {
                element.renderer.setCellValue( newValue, element.selRow, element.selCol );
            } else {
                element.setValue( newValue, onValueSet );
            }

            function onValueSet() {
                element.page.redraw(Y.dcforms.LAYER_TEXT);
                element.page.form.raise( 'valueChanged', element );
            }
        }
    }

    /**
     *  Callback from PDF render
     *
     *  Second argument map be a zip archive Id if rendering to zip rather than database
     */

    function onPDFCreated(err /*, newMediaId */) {
        if (err) {
            Y.log('Could not create new PDF: ' + err, 'warn', NAME);
            //return;
        }

        //Y.log('Created new PDF with database or zip id: ' + newMediaId, 'info', NAME);
    }

    /**
     *  Event handler, called when user selects a form in the tree at left
     *
     *  @param  formListing {Object}    Metadata object for form name, _id, etc
     */

    function onFormTreeSelection(formListing) {
        //Y.log('Form selected: ' + JSON.stringify(formListing), 'debug', NAME);
        loadTemplate(formListing._id);
    }

    function onFormTreeMultiSelection(showDefault, formIds) {
        if (showDefault) {
            selectedDefaultForms = formIds;
            if (formIds.length === 0) {
                jqCache.btnCopyMultiple.hide();
            } else {
                jqCache.btnCopyMultiple.show();
            }
        } else {
            selectedUserForms = formIds;
        }
    }

    /**
     *  Called when a user creates a new form, reload the page to navigate to it
     *
     *  @param newFormIdentifiers  {Object}
     */

    function onNewFormCreated(newFormIdentifiers) {
        window.location.hash = 'form=' + newFormIdentifiers._id;
        window.location.reload();
    }

    /**
     *  show or hide controls according to mode
     */

    function onModeSet(mode) {

        updateLangButtons();

        if ('fill' === mode) {
            // 'fill' mode
            Y.log('Setting window controls to fill mode', 'debug', 'FormEditorMojitBinderForms');

            jqCache.divAccordionFill.show();
            jqCache.spanFillButtons.show();

            jqCache.divAccordionEdit.hide();
            jqCache.spanEditButtons.hide();
            jqCache.spanAddElement.hide();
            jqCache.btnEditTranslations.hide();
        }

        if ('edit' === mode) {
            // 'edit' mode
            Y.log('Setting window controls to edit mode', 'debug', 'FormEditorMojitBinderForms');

            loadEditForm(function(){
                Y.log('Loaded edit form');
            });

            jqCache.divAccordionEdit.show();
            jqCache.spanEditButtons.show();
            jqCache.spanAddElement.show();

            jqCache.divAccordionFill.hide();
            jqCache.spanFillButtons.hide();
            jqCache.btnEditTranslations.show();

            //jqCache.collapseForm.collapse({ toggle: true });
        }

        if ('pdf' === mode) {
            // nothing in particular to be done at present, may want to validate before redning once that is in place
            Y.log('Switching editor to PDF render mode');

        }

        //  set current form language in menu
        updateLangButtons();
    }

    /**
     *  Raised when a page is clicked
     *  @param  currPage    {object}    A dcforms-page object
     */

    function onPageSelected( currPage ) {

        if ('edit' !== template.mode) {
            return;
        }

        formEditorVM.pageNo( currPage.pageNo );
        formEditorVM.pageCount( currPage.form.pages.length );
        formEditorVM.selectedPanel( 'Page' );
    }

    /**
     *  Raised when a page is removed
     */

    function onPageRemoved() {
        formEditorVM.pageCount( template.pages.length );
    }

    /**
     *  Raised when the user selects / clicks on an element
     *  @param currElement
     */

    function onElementSelected( currElement ) {
        Y.log('onElementSelected: ' + ( currElement ? currElement.elemType : 'none'), 'debug', NAME );
        if( template.valueEditor && template.valueEditor.jqContentEditable ) {
            formEditorVM.wyswyg.setTextArea( template.valueEditor.jqContentEditable[0] );
        }
        if ('edit' !== template.mode || !currElement) {
            //  only show the properties pane in edit mode
            return;
        }

        //formEditorVM.pageNo( currElement.page.pageNo );
        formEditorVM.selectedPanel( 'Element' );
    }

    /**
     *  Not currently used except in debug mode, raised by language switcher in button bar
     */

    function onChangeUserLang() {
        Y.log( 'Form language changed, resetting language-dependant fields in editor.' );
        template.render( Y.dcforms.nullCallback );
    }

    /**
     *  Raised when a form applies or changes a reduced schema
     */

    function onSchemaSet(/* reducedSchemaName */) {

        if (!template) {
            return;
        }

        var formSchemaNode = Y.one('#divSchemaList');

        formSchemaNode.passToBinder = { 'template': template };

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'forms_schema',
            'FormEditorMojit',
            {},
            formSchemaNode,
            function onSchemaDisplayLoaded() {
                Y.log('Loaded form schema UI', 'debug', NAME);
            }
        );
    }

    /**
     *  Show or hide the left column
     */

    function onToggleLeftCol() {
        leftCol = !leftCol;

        if (true === leftCol) {
            jqCache.tdLeftCol.show();
            jqCache.tdSpacerCol.show();
            jqCache.btnToggleLeftCol.html('<i class="fa fa-chevron-left"></i>');
        } else {
            jqCache.tdLeftCol.hide();
            jqCache.tdSpacerCol.hide();  //
            jqCache.btnToggleLeftCol.html('<i class="fa fa-chevron-right"></i>');
        }

        onWindowResize();
    }

    /**
     *  Toggle wide screen mode
     */

    function onToggleViewport() {
        wideViewport = !wideViewport;
        setViewportWide(wideViewport);
        onWindowResize();
    }

    /**
     *  Raised by the template when the viewport size changes
     */

    function onWindowResize() {
        var
            pxWidth = parseInt($('#divFormEditor').width(), 10);

        if (jqCache.tdLeftCol.is(':visible')) {
            pxWidth = pxWidth - jqCache.tdLeftCol.width();
        }

        if (jqCache.tdSpacerCol.is(':visible')) {
            pxWidth = pxWidth - jqCache.tdSpacerCol.width();
        }

        template.resize(pxWidth, onTemplateResized);

        function onTemplateResized() {
            //  resize right col and button bar to match canvas size
            jqCache.formButtonsContainer.css('width', pxWidth + 'px');
            jqCache.formButtonsContainer.css('width', pxWidth + 'px');
        }
    }

    /**
     *  Reset a form to default version on disk
     */

    function onShowHistory() {
        Y.log('Showing modal to browse / revert versions', 'debug', NAME);
        Y.doccirrus.modals.formHistory.show( {
            canonicalId: template.canonicalId,
            isDebugMode: formEditorVM.formsTreeUser.debugMode()

    } );
    }

    /**
     *  Called when debug checkbox changes
     */

    function onDebugToggle() {

        function onReRender() {
            Y.log('Toggled debug mode: ' + jqCache.chkFormDevOptions.prop('checked'), 'debug', NAME);
        }

        jqCache.tdFormFileName = $('#tdFormFileName');

        if (jqCache.chkFormDevOptions.prop('checked')) {
            jqCache.spanDebugButtons.show();
            jqCache.tdFormFileName.show();

            jqCache.divAgFormsTestMapping.show();

            $('#tdFormSchema').show();
            $('#tdReadOnly').show();
            $('#collapseTestMapping').show();
            $('#divMapForm').show();

            formEditorVM.formsTreeUser.debugMode( true );
            formEditorVM.formsTreeDefault.debugMode( true );

        } else {
            jqCache.spanDebugButtons.hide();
            jqCache.tdFormFileName.hide();
            jqCache.divAgFormsTestMapping.hide();

            $('#tdFormSchema').hide();
            $('#tdReadOnly').hide();
            $('#collapseTestMapping').hide();
            $('#divMapForm').hide();

            formEditorVM.formsTreeUser.debugMode( false );
            formEditorVM.formsTreeDefault.debugMode( false );
        }

        //  debug mode may show some hidden form folders
        onFormsListReload();

        template.render(onReRender);
    }

    /**
     *  Display print serialization of form as used to create PDFs
     */

    function onDebugPrintClick() {

        function onDocumentReady(err, printJSON) {
            if (err) {
                Y.log( 'Error making print serialization: ' + JSON.stringify( err ), 'warn', NAME );
            }
            $( '#divPrintSerialization' ).html( '<pre>' + JSON.stringify( printJSON, undefined, 2 ) + '</pre>' );
        }

        function onModalReady() {
            template.renderPdfServer('none', '', 'debug', onDocumentReady);
        }

        Y.doccirrus.comctl.setModal(
            'Print Serialization',
            '<div id="divPrintSerialization">Loading...</div>',
            true,
            null,
            onModalReady
        );
    }

    /**
     *  Copy multiple read-only forms
     */

    function onCopyMultiple() {

        function onProgress() {
            jqModalDiv.html(Y.doccirrus.comctl.makeProgressBar(tasksDone, taskCount));
        }

        function onErr(err) {
            jqModalDiv.html('Konnte nicht kopiert werden Form: <pre>' + JSON.stringify(err) + '</pre>');
        }

        function onCopyComplete(err, newIds) {
            if (err) { onErr(err); return; }
            Y.log('Copied form to: ' + JSON.stringify(newIds), 'debug', NAME);

            tasksDone = tasksDone + 1;
            onProgress();
            copyNext();
        }

        function onCopyLoaded(err, serialized) {
            if (err) { onErr(err); return; }

            var newName = serialized.jsonTemplate.name.de + ' (kopie)';

            tasksDone = tasksDone + 1;
            onProgress();

            Y.log('Creating new form: ' + newName, 'info', NAME);
            Y.dcforms.copyForm(serialized.jsonTemplate, newName, onCopyComplete);
        }

        function copyNext() {
            if (0 === toCopy.length) {
                jqModalDiv.html('Fertige kopieren formen');
                window.location.reload();
                return;
            }

            if (!jqModalDiv) {
                jqModalDiv = $('#divCopyMultiple');
            }

            nextId = toCopy.pop();
            Y.dcforms.loadForm('', nextId, '', onCopyLoaded);
        }

        var
            toCopy = [],
            jqModalDiv = null,
            taskCount = 0,
            tasksDone = 0,
            nextId = null,
            i;

        for (i = 0; i < selectedDefaultForms.length; i++) {
            toCopy.push(selectedDefaultForms[i]);
        }

        taskCount = (toCopy.length * 2);

        Y.doccirrus.comctl.setModal('Kopieren', '<div id="divCopyMultiple"></div>', true, null, copyNext);
    }

    /**
     *  Set the read-only flag
     */

    function onLockClick() {
        var lastMode = template.mode;

        function onServerCacheCleared(err) {
            if (err) {
                Y.log('Error clearing cache on server: ' + JSON.stringify(err), 'warn', NAME);
            }

            Y.dcforms.getFormList('', true, onFormsListReload);
            jqCache.spanUnLockButton.show();
        }

        function onLockSave() {
            template.mode = lastMode;

            //  invalidate the server's cache before updating the local cache from server
            Y.dcforms.refreshFormList(onServerCacheCleared);
        }

        jqCache.spanLockButton.hide();
        template.isReadOnly = true;
        template.mode = 'edit';
        template.autoSaveDelay = 0;
        template.autosave(onLockSave);
    }

    /**
     *  Clear the read-only flag
     */

    function onUnLockClick() {
        var lastMode = template.mode;

        function onServerCacheCleared(err) {
            if (err) {
                Y.log('Error clearing cache on server: ' + JSON.stringify(err), 'warn', NAME);
            }

            Y.dcforms.getFormList('', true, onFormsListReload);
            jqCache.spanLockButton.show();
        }

        function onUnlockSave() {
            template.mode = lastMode;

            //  invalidate the server's cache before updating the local cache from server
            Y.dcforms.refreshFormList(onServerCacheCleared);
        }

        jqCache.spanUnLockButton.hide();
        template.isReadOnly = false;
        template.mode = 'edit';
        template.autoSaveDelay = 0;
        template.autosave(onUnlockSave);
    }

    function onFormTitleChange() {
        onFormsListReload();
    }

    /**
     *  Raised when readonly flag has changed on a form
     */

    function onFormsListReload() {
        formEditorVM.formsTreeDefault.getFolders();
        formEditorVM.formsTreeUser.getFolders();
    }

    /**
     *  Raised when a form has been imported
     */

    function onFormImported(formMeta) {

        if (!template) {
            Y.log('Not updating template, none yet loaded.', 'debug', NAME);
            return;
        }

        if (template.canonicalId === formMeta._id) {
            Y.log('Form ' + template.canonicalId + ' has been reimported, updating...', 'info', NAME);
            loadTemplate(formMeta._id);
        }

        Y.dcforms.getFormList('', true, onFormsListReload);
    }

    /**
     *  Raised by template autosave during edit mode
     */

    function onTemplateSaved() {
        setTitle();
    }

    /*
     *  CONSTRUCTOR - managed by jadeLoader
     */

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            myNode = node;

            //  cache jQuery selectors for UI elements

            jqCache = {
                //  page navbar can affect position of controls
                'NavBarHeader': $('#NavBarHeader'),
                'NavBarFooter': $('#NavBarFooter'),

                //  main control groups
                'divFormEditor': $('#divFormEditor'),
                'divFormsRender': $('#divFormEditor' + ''),
                'hTitle': $('#hTitle'),
                'btnToggleLeftCol': $('#btnToggleLeftCol'),
                'btnToggleViewport': $('#btnToggleViewport'),
                'tdLeftCol': $('#tdLeftCol'),
                'tdSpacerCol': $('#tdSpacerCol'),
                'tdRightCol': $('#tdRightCol'),
                //'divScrollContainer': $('divScrollContainer'),
                'divEditElement': $('#divEditElement'),
                'divEditPage': $('#divEditPage'),
                'divBFBAtForm': $('#divBFBAtForm'),
                'spanFillButtons': $('#spanFillButtons'),
                'spanEditButtons': $('#spanEditButtons'),
                'spanDebugButtons': $('#spanDebugButtons'),
                'spanLangButtons': $('#spanLangButtons'),
                'spanAddElement': $('#spanAddElement'),
                'divAccordionFill': $('#divAccordionFill'),
                'divAccordionEdit': $('#divAccordionEdit'),

                //  forms backup upload and download
                'divFormsDownloadBackup': $('#divFormsDownloadBackup'),
                'fileUploadArchive': $('#fileUploadArchive'),

                //  accordion control divs
                'collapseTree': $('#collapseTree'),
                'collapseForm': $('#collapseForm'),
                'collapseSchema': $('#collapseSchema'),
                'collapsePage': $('#collapsePage'),
                'collapsePdfOpt': $('#collapsePdfOpt'),
                'collapseElement': $('#collapseElement'),
                'collapseImages': $('#collapseImages'),
                'collapseDebug': $('#collapseDebug'),

                //  accordion sections
                'divAgFormsTree': $('#divAgFormsTree'),
                'divAgSchema': $('#divAgSchema'),
                'divAgPdf': $('#divAgPdf'),
                'divAgForm': $('#divAgForm'),
                'divAgPage': $('#divAgPage'),
                'divAgElement': $('#divAgElement'),
                'divAgImages': $('#divAgImages'),
                'divAgFormsTestMapping': $('#divAgFormsTestMapping'),
                'divAgBFB': $('divAgBFB'),

                //  buttons
                'formButtonsContainer': $('#formButtonsContainer'),
                'formButtons': $('#formButtons'),
                'btnPDF': $('#btnPDF'),
                'btnEdit': $('#btnEdit'),
                'btnCopyDefault': $('#btnCopyDefault'),
				'btnFill': $('#btnFill'),
				'btnTest': $('#btnTest'),
                'btnTestCats': $('#btnTestCats'),
                'btnNewForm': $('#btnNewForm'),
                'btnAddElement': $('#btnAddElement'),
                'btnAddPage': $('#btnAddPage'),
				'btnReset': $('#btnReset'),
                'btnExport': $('#btnExport'),

                //  language menu
                'btnLangMenu': $('#btnLangMenu'),
                'spanLangLabel': $('#spanLangLabel'),
                'aLangEN': $('#aLangEN'),
                'aLangDE': $('#aLangDE'),
                'aLangDEF': $('#aLangDEF'),
                'aLangDEM': $('#aLangDEM'),
                'btnEditTranslations': $('#btnEditTranslations'),

                'btnPrintDebug': $('#btnPrintDebug'),
                'btnCopyMultiple': $('#btnCopyMultiple'),

                'spanLockButton': $('#spanLockButton'),
                'spanUnLockButton': $('#spanUnLockButton'),

                //  add element links
                'aAddPage': $('#aAddPage'),
                'aAddLabel': $('#aAddLabel'),
                'aAddInput': $('#aAddInput'),
                'aAddTextarea': $('#aAddTextarea'),
                'aAddTextMatrix': $('#aAddTextMatrix'),
                'aAddHyperlink': $('#aAddHyperlink'),
                'aAddCheckbox': $('#aAddCheckbox'),
                'aAddCheckboxTrans': $('#aAddCheckboxTrans'),
                'aAddTogglebox': $('#aAddTogglebox'),
                'aAddRadio': $('#aAddRadio'),
                'aAddRadioTrans': $('#aAddRadioTrans'),
                'aAddTable': $('#aAddTable'),
                'aAddReportTable': $('#aAddReportTable'),
                'aAddLabdataTable': $('#aAddLabdataTable'),
                'aAddMeddataTable': $('#aAddMeddataTable'),
                'aAddContactTable': $('#aAddContactTable'),
                'aAddDropdown': $('#aAddDropdown'),
                'aAddImage': $('#aAddImage'),
                'aAddAudio': $('#aAddAudio'),
                'aAddVideo': $('#aAddVideo'),
                'aAddBarcode': $('#aAddBarcode'),
                'aAddDate': $('#aAddDate'),
                'aAddSubform': $('#aAddSubform'),
                'aAddChartMD': $('#aAddChartMD'),

                //  debug / special
                'chkFormDevOptions': $('#chkFormDevOptions'),
                'divSchemaList': $('#divSchemaList'),
                'btnApplyMap': $('#btnApplyMap'),
                'btnUnMap': $('#btnUnMap'),
                'taMapObj': $('#taMapObj')
            };

            //  set toggle for left column and viewport
            jqCache.btnToggleLeftCol.off('click.forms').on('click.forms', function() { onToggleLeftCol(); });
            jqCache.btnToggleViewport.off('click.forms').on('click.forms', function() { onToggleViewport(); });

            //jqCache.divScrollContainer.css('height', $(window).height());
            //jqCache.divScrollContainer.css('overflow-y', 'auto');

            //  not affected by which template is loaded
            jqCache.btnNewForm.off('click.forms').on('click.forms', function onAddForm(){
                var recoveryFolder = Y.doccirrus.schemas.formfolder.recoveryFolderId;
                showNewFormPopup( template && template.formFolderId ? template.formFolderId : recoveryFolder );
            });

            //  initalize affix plugin for accordion sections and form button bar

            jqCache.divAccordionFill.affix({ offset: { top: jqCache.tdRightCol.offset().top } });
            jqCache.divAccordionEdit.affix({ offset: { top: jqCache.tdRightCol.offset().top } });
            jqCache.formButtonsContainer.affix({ offset: { top: jqCache.formButtons.offset().top } });

            jqCache.formButtonsContainer.on('affixed.bs.affix', function(){
                jqCache.formButtonsContainer.css('width', jqCache.tdRightCol.width() + 'px');

                //  don't flow under the page nav
                if (jqCache.NavBarHeader.hasClass('NavBarHeader-fixedNot')) {
                    jqCache.formButtonsContainer.css('margin-top', '0px');
                    jqCache.divAccordionFill.css('margin-top', '0px');
                    jqCache.divAccordionEdit.css('margin-top', '0px');
                } else {
                    jqCache.formButtonsContainer.css('margin-top', jqCache.NavBarHeader.height() + 'px');
                    jqCache.divAccordionFill.css('margin-top', jqCache.NavBarHeader.height() + 'px');
                    jqCache.divAccordionEdit.css('margin-top', jqCache.NavBarHeader.height() + 'px');
                }

            });

            jqCache.divAccordionEdit.css('overflow', 'scroll');
            jqCache.divAccordionEdit.css('height', ($(window).height() - jqCache.NavBarHeader.height() - jqCache.NavBarFooter.height()) + 'px');

            jqCache.divAccordionFill.css('overflow', 'scroll');
            jqCache.divAccordionFill.css('height', ($(window).height() - jqCache.NavBarHeader.height() - jqCache.NavBarFooter.height()) + 'px');


            jqCache.formButtonsContainer.on('affixed-top.bs.affix', function(){
                jqCache.formButtonsContainer.css('margin-top', '0px');
                jqCache.formButtonsContainer.css('height', 'auto');
                jqCache.divAccordionFill.css('margin-top', '0px');
                jqCache.divAccordionEdit.css('margin-top', '0px');
            });

            //  set export dialog (must work when no forms in DB)
            jqCache.btnExport.off('click.forms').on('click.forms', function onExportClick() { showExportDialog(); });

            //  bind button for showing print debug information
            jqCache.btnPrintDebug.off('click.forms').on('click.forms', onDebugPrintClick);

            //  bind button for copying mutiple read-only forms
            jqCache.btnCopyMultiple.off('click.forms').on('click.forms', onCopyMultiple);

            //  subscribe to import events (may need to refresh view if current form re-imported)
            Y.dcforms.event.on('onFormImported', NAME, onFormImported);

            //  set hash fragment to default start form if none specified
            if (!window.location.hash) {
                loadDefaultForm();
            } else {
                //  try load form from hash fragment
                loadFromHashFragment();
            }

            $( window ).off('resize.forms_editor').on('resize.forms_editor', onWindowResize);

            /**
             *  Rerender the form when all assets have loaded (shows web fonts)
             */

            $( window ).on( 'load.forms_editor', function() {
                if ( template && template.render ) {
                    template.render( function() {
                        Y.log( 'Rerender template on asset load.', 'debug', NAME );
                    } );
                }
            } );

            //  Instantiate and bind the viewmodel, functionality shoudl be migrated to this over time
            formEditorVM = new FormEditorVM();

            ko.applyBindings( formEditorVM, document.querySelector( '#divFormEditor' ) );
        },

        deregisterNode: function( node ) {
            Y.log('deregister node for forms_editor.js - ' + node.getAttribute('id'), 'debug', NAME);

            //  unsubscribe from any form events
            if (template) {
                deregisterEventHandlers(template);
            }
            Y.dcforms.event.off('*', NAME);

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //node.destroy();
        }
    };

}
