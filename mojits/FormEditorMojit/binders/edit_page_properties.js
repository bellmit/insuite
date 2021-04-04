/*
 * Copyright (c) 2012 Doc Cirrus GmbH
 * all rights reserved.
 *
 * jadeLoaded view for editing the properties of a dcforms-page object (represents a printed page, has elements)
 *
 */

/*exported _fn */
/*global $, ko, async */

function _fn(Y, NAME) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,

        template,                               //  reference to the currently loaded template
        currPage,                               //  reference to last selected dcforms-page object

        subFormList = [],                       //  may be assigned as headers or footers
        subFormListLoaded = false,              //  true when subform select boxes can be rendered

        isInitializing = false,                 //  prevent updates to page in response to initial 'set' events

        eventHandlers = {
            'pageSelected': onPageSelected,
            'changeUserLang': onChangeUserLang
        },

        dataBinding = {
            'hdnPageName': 'name',
            'txtPageFgColor':  'fgColor',
            'txtPageBgColor':  'bgColor'
        },

        editPagePropertiesVM = null,            //  instantiated when binder is run

        jq = {},                                //  cached jQuery selectors

        KEYCODE_DELETE = 46,

        KEYCODE_C = 67,
        KEYCODE_V = 86,
        KEYCODE_X = 88,

        KEYCODE_LEFT = 37,
        KEYCODE_UP = 38,
        KEYCODE_RIGHT = 39,
        KEYCODE_DOWN = 40;

    /**
     *  KoViewModel for page properties panel, initially used for translations, will be expanded as deprecated jQuery
     *  based UI is changed and replaced.
     *
     *  @constructor
     */

    function EditPagePropertiesVM() {
        var
            self = this,

            //  page properties to auto subscribe
            PAGE_PROPERTIES = [
                'firstPageDifferent',
                'isCarbonCopy'
            ];

        //  INITIALIZTION

        /**
         *  Set up event handlers, observables and computeds
         */

        self.init = function __init() {
            var i;

            self.selectedElements = ko.observableArray( [] );
            self.clipboardElements = ko.observableArray( [] );
            self.copiedFrom = ko.observable( '' );              //  page name, do not paste onto the same page

            self.currentPage = ko.observable( null );

            //  create observables for bound properties
            for ( i = 0; i < PAGE_PROPERTIES.length; i++ ) {
                self[ PAGE_PROPERTIES[i] ] = ko.observable();
            }

            //  keep track of KO subscriptions to be disposed, in case we need that in future
            self.subs = {};

            self.initComputeds();
            self.initEventhandlers();
            self.initSubscriptions();

            //  set the first page of the current form if there is one
            if ( template && template.pages && template.pages[0] ) {
                self.onPageSelected( template.pages[0] );
            }
        };

        /**
         *  Subscribe to own observables
         */

        self.initComputeds = function __initComputeds() {
            self.hasCurrentPage = ko.computed( function() {
                return null !== self.currentPage();
            } );

            self.noPageSelected = ko.computed( function() {
                return !self.hasCurrentPage();
            } );

            self.canCopyGroup = ko.computed( function() {
                var selElemPlain = self.selectedElements();
                return ( selElemPlain.length > 0 );
            } );

            self.canPasteGroup = ko.computed( function() {
                var clipElemPlain = self.clipboardElements();
                return ( clipElemPlain && clipElemPlain.length );
            } );
        };

        /**
         *  Subscribe to bound values in the panel, pass changes to update currPage
         */

        self.initSubscriptions = function __initSubscriptions() {
            var i, propName;

            for ( i = 0; i < PAGE_PROPERTIES.length; i++ ) {
                propName = PAGE_PROPERTIES[i];
                self.subs[propName] = self[propName].subscribe( makePropertyUpdater( propName ) );
            }

            function makePropertyUpdater( propName ) {
                //console.log( `(****) page panel make listener for ${propName}` );
                return function( newVal ) {
                    var pageObj = self.currentPage();
                    //console.log( `(****) setting property on page: `, propName, newVal );

                    //  should not happen
                    if ( !pageObj ) { return; }
                    //  prevent feedback with form events

                    //console.log( '(****) setting property on page, have page: ', propName, newVal, pageObj.getProperty( propName ) );

                    //if ( newVal === pageObj.getProperty( propName )  ) { return; }
                    pageObj.setProperty( propName, newVal, Y.dcforms.nullCallback );
                };
            }

        };

        /**
         *  Subscribe to events raised by the form
         */

        self.initEventhandlers = function __initEventHandlers() {
            template.on( 'loaded', 'EditPagePropertiesVM',  function( evt ) { self.onFormLoaded( evt ); }  );
            template.on( 'pageSelected', 'EditPagePropertiesVM', function( evt ) { self.onPageSelected( evt ); } );
            template.on( 'selectElementGroup', 'EditPagePropertiesVM', function( evt ) { self.onSelectElementGroup( evt ); } );

            //template.on( 'changeUserLang', 'EditPagePropertiesVM', ( evt ) => self.onChangeUserLang( evt ) );

            //  listen for keydown events, to allow selected groups of elements to be moved with arow keys
            $( window ).off( 'keydown' ).on( 'keydown', function( evt ) { self.onKeyDown( evt ); } );
        };

        self.dispose = function __dispose() {
            Y.log( 'Disposing page properties panel', 'debug', NAME );
        };

        //  TRANSLATIONS

        self.lblForegroundColorI18n = i18n('FormEditorMojit.panel_properties.LBL_FOREGROUND_COLOR');
        self.lblBackgroundColorI18n = i18n('FormEditorMojit.panel_properties.LBL_BACKGROUND_COLOR');
        self.lblPageHeaderI18n = i18n('FormEditorMojit.page_properties.LBL_PAGE_HEADER');
        self.lblPageFooterI18n = i18n('FormEditorMojit.page_properties.LBL_PAGE_FOOTER');
        self.lblPageHeaderOverflowI18n = i18n('FormEditorMojit.page_properties.LBL_PAGE_HEADER_OVERFLOW');
        self.lblPageFooterOverflowI18n = i18n('FormEditorMojit.page_properties.LBL_PAGE_FOOTER_OVERFLOW');

        self.lblFirstPageDifferent = 'First Page Different';    //  TODO: translateme

        self.lblIsCarbonCopyI18n = i18n('FormEditorMojit.page_properties.LBL_IS_CARBON_COPY');
        self.lblBackgroundImageI18n = i18n('FormEditorMojit.panel_properties.LBL_BACKGROUND_IMAGE');
        self.lblBtnChooseImageI18n = i18n('FormEditorMojit.ctrl.BTN_CHOOSE_IMAGE');
        self.btnEPReorderElementsI18n = i18n('FormEditorMojit.ctrl.BTN_EP_REORDER_ELEMENTS');
        self.btnRemovePageI18n = i18n('FormEditorMojit.ctrl.BTN_REMOVE_PAGE');
        self.btnCopyPageI18n = i18n('FormEditorMojit.ctrl.BTN_COPY_PAGE');

        self.lblGroupedElementsI18n = i18n('FormEditorMojit.page_properties.LBL_GROUPED_ELEMENTS');
        self.lblGroupedExplanationI18n = i18n('FormEditorMojit.page_properties.LBL_GROUPED_EXPLANATION');

        self.lblGroupSelectI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_SELECT');
        self.lblGroupSelectShortcutI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_SELECT_SHORTCUT');

        self.lblGroupCopyI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_COPY');
        self.lblGroupCopyShortcutI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_COPY_SHORTCUT');

        self.lblGroupPasteI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_PASTE');
        self.lblGroupPasteShortcutI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_PASTE_SHORTCUT');

        self.lblGroupCutI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_CUT');
        self.lblGroupCutShortcutI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_CUT_SHORTCUT');

        self.lblGroupDeleteI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_DELETE');
        self.lblGroupDeleteShortcutI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_DELETE_SHORTCUT');

        self.lblGroupMoveI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_MOVE');
        self.lblGroupMoveShortcutI18n = i18n('FormEditorMojit.page_properties.LBL_GROUP_MOVE_SHORTCUT');

        self.btnCopyGroupI18n = i18n('FormEditorMojit.panel_properties.BTN_COPY_GROUP');
        self.btnPasteGroupI18n = i18n('FormEditorMojit.panel_properties.BTN_PASTE_GROUP');
        self.btnDeleteGroupI18n = i18n('FormEditorMojit.panel_properties.BTN_DELETE_GROUP');

        //  EVENT HANDLERS

        self.onFormLoad = function __onFormLoaded() {
            if ( 0 === template.pages.length ) {
                //  if form has no pages then this panel should be hidden
                self.currentPage( null );
            } else {
                //  select the first page when a form is loaded
                self.currentPage( template.pages[0] );
            }
        };

        self.onPageSelected = function __onPageSelected( pageObj ) {
            var i, propName;

            //  if no change to current page, nothing to do
            if ( self.currentPage() === pageObj ) { return; }

            //console.log( '(****) KO onPageSelected ', pageObj.name );

            self.currentPage( pageObj );

            for ( i = 0; i < PAGE_PROPERTIES.length; i++ ) {
                propName = PAGE_PROPERTIES[i];
                //console.log( '(****) KO updatePanel: ', propName,  pageObj.getProperty( propName ) );
                self[ propName ]( pageObj.getProperty( propName ) );
            }
        };

        self.onElementSelected = function __onElementSelected( elemObj ) {
            var currentPage = self.currentPage();

            if ( elemObj.page.name !== currentPage.name ) {
                self.onPageSelected( elemObj.page );

                // global, legacy:
                onPageSelected( elemObj.page );
            }
        };

        self.onSelectElementGroup = function __onSelectElementGroup( elementGroup ) {
            self.selectedElements( elementGroup );
        };

        //  RAISED BY UI BINDINGS

        self.onCopySelectedClick = function __onCopySelectedClick() {
            var copySelectedElements = self.selectedElements().slice(0);

            if ( copySelectedElements[0] && copySelectedElements[0].page ) {
                self.copiedFrom( copySelectedElements[0].page.name );
            }

            self.clipboardElements( copySelectedElements );
        };

        self.onDeleteSelectedClick = function __onDeleteSelectedClick() {
            var
                currentPage = self.currentPage(),
                selectedElements = self.selectedElements(),
                newPageElements = [],
                i;

            if ( !currentPage ) { return; }

            //  make sure no element is selected
            currentPage.form.setSelected( 'fixed', null );

            for ( i = 0; i < currentPage.elements.length; i++ ) {
                if ( !isSelected( currentPage.elements[i].elemId ) ) {
                    newPageElements.push( currentPage.elements[i] );
                }
            }

            //  keep the deleted elements in clipboard, but remove reference to current page to allow them to be pasted back
            self.copiedFrom( '' );

            currentPage.elements = newPageElements;
            currentPage.setTabIndexes();

            currentPage.form.render( function() {
                currentPage.form.autosave();
            } );

            function isSelected( elemId ) {
                var j;
                for ( j = 0; j < selectedElements.length; j++ ) {
                    if ( selectedElements[j].elemId === elemId ) {
                        return true;
                    }
                }
                return false;
            }
        };

        self.onPasteSelectedClick = function __onPasteSelectedClick() {
            var
                currentPage = self.currentPage(),
                copyElements = self.clipboardElements(),
                pastedElements = [],
                serial;

            if ( 0 === copyElements.length ) {
                return;
            }

            async.eachSeries( copyElements, copySingleElement, onPasteComplete );

            function copySingleElement( elem, itcb ) {
                serial = elem.serialize();
                serial.id = serial.type + Y.doccirrus.comctl.getRandId();

                Y.dcforms.element.create( currentPage, currentPage.elements.length, serial, onElementCreated );

                function onElementCreated(err, newElement) {
                    if (err) {
                        Y.log( 'Could not copy element: ' + JSON.stringify( err ), 'warn', NAME );
                        itcb( err );
                        return;
                    }

                    currentPage.elements.push( newElement );
                    pastedElements.push( newElement );
                    itcb( null );
                }
            }

            function onPasteComplete() {
                //  select newly pasted elements
                currentPage.elements.forEach( function ( elem ) { elem.inGroupSelection = false; } );
                pastedElements.forEach( function ( elem ) { elem.inGroupSelection = true; } );
                currentPage.form.updateGroupSelect( currentPage );

                //  redraw entire form (selection lost on other pages)
                currentPage.form.render( onRedrawAfterPaste );
            }

            function onRedrawAfterPaste() {
                currentPage.form.autosave();
            }

        };


        /**
         *  Run when remove button clicked, cause dcforms-template to remove this page
         */

        self.onRemoveCurrentPage = function __onRemoveCurrentPage() {
            var pageName = currPage.name;
            template.removePage( pageName, onPageRemoved );

            function onPageRemoved(err) {
                if (err) {
                    Y.log('Could not remove page: ' + err, 'warn', NAME);
                    return;
                }

                self.currentPage( null );
                currPage = null;
                Y.log('Removed page: ' + pageName, 'info', NAME);
                template.render( Y.dcforms.nullCallback );
                template.raise( 'pageRemoved', pageName );
            }
        };

        /**
         *  Make a copy of the current page with all elements and properties, rename new elements
         */

        self.onCopyBtnClick = function __onCopyBtnClick() {

            var
                pageObj = self.currentPage(),
                pageIdx = 0, i;

            for (i = 0; i < template.pages.length; i++) {
                if (pageObj && pageObj.name === template.pages[i].name) {
                    pageIdx = i;
                }
            }

            template.copyPage( pageIdx, onPageCopied );

            function onPageCopied( err , newPage ) {
                if ( err ) {
                    Y.log( err, 'warn', NAME );
                    return;
                }

                var i, page;
                for ( i = 0; i < template.pages.length; i++ ) {
                    page = template.pages[i];
                    if ( !page.isInDOM ) {
                        page.addToDOM();
                    }
                }

                template.raise( 'pageSelected', newPage );
                template.render( Y.dcforms.nullCallback );
            }
        };

        self.onKeyDown = function __onKeyDown( evt ) {
            var
                currentPage = self.currentPage(),
                selectedElements,
                selectedOnPage,
                dx = 0, dy = 0;

            //  check that we are editing a page
            if ( !currentPage || 'edit' !== currentPage.form.mode ) {
                return;
            }

            //  check for grouped element keyboard shortcuts
            switch( evt.keyCode ) {
                //  copy selected elements
                case KEYCODE_C:
                    if ( evt.ctrlKey ) { self.onCopySelectedClick(); }
                    return;

                //  paste selected
                case KEYCODE_V:
                    if ( evt.ctrlKey ) { self.onPasteSelectedClick(); }
                    return;

                //  cut selected
                case KEYCODE_X:
                    if ( evt.ctrlKey ) {
                        self.onCopySelectedClick();
                        self.onDeleteSelectedClick();
                    }
                    return;

                //  delete all elements
                case KEYCODE_DELETE:    self.onDeleteSelectedClick();               return;

                //  move all elements by one grid square
                case KEYCODE_DOWN:      dy = currentPage.form.gridSize;             break;
                case KEYCODE_UP:        dy = -1 * currentPage.form.gridSize;        break;
                case KEYCODE_RIGHT:     dx = currentPage.form.gridSize;             break;
                case KEYCODE_LEFT:      dx = -1 * currentPage.form.gridSize;        break;

                //  all other keys, do nothing and return
                default:                                                            return;
            }



            //  check that we have a selection
            selectedElements = self.selectedElements();
            if ( !selectedElements || 0 === selectedElements.length ) {
                return;
            }

            selectedOnPage = selectedElements[0].page;

            selectedElements.forEach( function( elem ) {
                elem.mm.left = elem.mm.left + dx;
                elem.mm.top = elem.mm.top + dy;

                if ( elem.mm.left + elem.mm.width > currentPage.form.paper.width ) {
                    elem.mm.left = currentPage.form.paper.width - elem.mm.width;
                }

                if ( elem.page.form.isFixed ) {
                    if ( elem.mm.top + elem.mm.height > currentPage.form.paper.height ) {
                        elem.mm.top = currentPage.form.paper.height - elem.mm.height;
                    }
                }

                if ( elem.mm.left < 0 ) { elem.mm.left = 0; }
                if ( elem.mm.top < 0 ) { elem.mm.top = 0; }
            } );

            //  redraw all layers of the page which was changed
            evt.preventDefault();

            selectedOnPage.redraw();
            currentPage.form.autosave( Y.dcforms.nullCallback );
        };
    }

    /**
     *  Configure this form to loaded page and (re)bind events
     */

    function initPanel() {

        var
            jqTemp,
            k;

        //  attach event handlers to form controls

        isInitializing = true;

        for (k in dataBinding) {
            if (dataBinding.hasOwnProperty(k)) {

                jqTemp = $('#' + k);

                //	unset any existing handler
                jqTemp.off('keyup.forms').on('keyup.forms', updatePageFromPanel);
                jqTemp.off('change.forms').on('change.forms', updatePageFromPanel);

            }
        }

        //  add event listeners to buttons / input elements

        jq.btnSetPageBgImg.off('click.forms').on('click.forms', onRequestNewImage);

        //jq.btnRemovePage.off('click.forms').on('click.forms', onRemoveBtnClick);
        //jq.btnCopyPage.off('click.forms').on('click.forms', onCopyBtnClick);
        jq.btnReorderElements.off('click.forms').on('click.forms', onReorderBtnClick);

        jq.txtPageBgColor.off('keyup.forms').on('keyup.forms', updatePageFromPanel);
        jq.txtPageFgColor.off('keyup.forms').on('keyup.forms', updatePageFromPanel);
        //jq.chkIsCarbonCopy.off('change.forms').on('change.forms', onCCChange);

        isInitializing = false;
    }

    /**
     *  Called when a page has been selected in the editor
     */

    /*
    function showControls() {
        jq.divNoPageSelected.hide();
        jq.divPagePropertyControls.show();
    }
    */

    /**
     *  Default view before page is selected
     */

    /*
    function hideControls() {
        jq.divNoPageSelected.hide();
        jq.divPagePropertyControls.show();
    }
    */

    /**
     *  Register all event handlers
     */

    function registerEventHandlers() {
        var k;
        for (k in eventHandlers) {
            if (eventHandlers.hasOwnProperty(k)) {
                template.on(k, 'edit_page_form', eventHandlers[k]);
            }
        }
    }

    /**
     *  Unhook event listeners for this panel from template
     */

    function deregisterEventHandlers() {
        if (!template) { return; }
        template.event.off('*', 'edit_page_form');
    }

    /**
     *  Fill this form with values from dcforms-page object
     */

    function updatePanelFromPage() {
        //Y.log('Setting panel controls from dcforms-page', 'debug', NAME);

        var k;
        for (k in dataBinding) {
            if (dataBinding.hasOwnProperty(k)) {
                //Y.log('Setting: k => ' + dataBinding[k], 'debug', 'edit_page_properties');
                $('#' + k).val(currPage[dataBinding[k]]);
            }
        }

        //  note this page's name in the form
        //jq.spanPageId.html(currPage.name);

        jq.chkIsCarbonCopy.prop('checked', currPage.isCarbonCopy);

        //  note any background image
        jq.spanPageId.html(currPage.name);
        jq.spanPageBgImg.html(currPage.bgImgNameT[currPage.form.userLang]);

        //jq.txtPageBgColor.val(currPage.bgColor);
        //jq.txtPageFgColor.val(currPage.fgColor);
        //jq.txtPageBgColorMC.minicolors('value', currPage.bgColor);
        //jq.txtPageFgColorMC.minicolors('value', currPage.fgColor);

        jq.spanPageBgImg.html(currPage.bgImgName);

        updateMinicolors(jq.txtPageBgColor, currPage.bgColor);
        updateMinicolors(jq.txtPageFgColor, currPage.fgColor);
    }

    /**
     *  Update dcforms-page object when this form changes
     */

    function updatePageFromPanel() {

        if (!currPage) {
            Y.log('No page selected, cannot set page properties panel.', 'debug', NAME);
            return;
        }

        if (isInitializing) {
            //  setting values in form elements can cause spurious updates / re-render of page
            return;
        }

        Y.log('Update page from edit form: ' + currPage.name, 'debug', NAME);


        var
            dirty = false,                      //% set true if anything changes on the page object
            currVal,                            //% current value of the input/DOM element
            k = '';                             //% for iterating over binding [string]

        //  check that current selected page is the same which last filled the form
        for (k in dataBinding) {
            if (dataBinding.hasOwnProperty(k)) {

                currVal = $('#' + k).val();

                if (currPage.getProperty(dataBinding[k]) !== currVal) {
                    //currPage[dataBinding[k]] = currVal;
                    currPage.setProperty(dataBinding[k], currVal);
                    dirty = true;
                }

            }
        }

        /*
        if (currPage.isCarbonCopy !== jq.chkIsCarbonCopy.prop('checked')) {
            currPage.isCarbonCopy = jq.chkIsCarbonCopy.prop('checked');
            dirty = true;
        }
        */

        //  only update the element on change
        if (true === dirty && currPage) {
            //  don't trigger if render and first load are not complete
            if (template.isRendered  && !isInitializing) {
                currPage.redrawDirty();
            }
            currPage.onChange();
        }
    }

    /**
     *  Cause a minicol event to update and be updated by a text input
     *  MOJ-8938 rewrite to minicolor v2.2.6, standardize with other color pickers across mojits
     *
     *  @param  jqCacheTxt  {object}    jQuery selector for a text input element
     *  @param  key         {string}    Field to update on element
     */

    function linkMinicolor(jqCacheTxt, key ) {

        jqCacheTxt.minicolors(
            'create',
            {
                'opacity': true,
                'theme': 'bootstrap',
                'swatchPosition': 'left',
                'format': 'rgb',
                'defaultValue': 'rgba(255, 255, 255, 1)',
                'value': 'rgba(255, 255, 255, 1)',
                'change': function onChangeMC() {
                    if (currPage && !isInitializing) {
                        currPage[ key ] = jqCacheTxt.minicolors( 'rgbaString' );
                    }
                },
                'hide': function onHideMC() {
                    if (currPage && !isInitializing) {
                        currPage.onChange();
                    }
                }
            }
        );
    }

    /**
     *  Update a minicol from linked text box
     *
     *  @param  jqCacheTxt  {object}    jQuery selector for a text input element
     *  @param  jqCacheMC   {object}    jQuery selector for a hidden text input element
     */

    function updateMinicolors(jqCacheTxt, newValue) {
        jqCacheTxt.minicolors('value', newValue);
    }



    /**
     *  Pages may have headers and footers specified as subforms
     */

    function updateSubformSelect() {

        if (!subFormListLoaded || !currPage) {
            return;
        }

        var
            userLang = Y.dcforms.getUserLang(),
            html = '<option value=""></option>',
            i;

        for (i = 0; i < subFormList.length; i++) {
            if (true === subFormList[i].isSubform) {
                html = html +
                    '<option ' + 'value="' + subFormList[i].formId + '"' + '>' +
                    subFormList[i].title[userLang] +
                    '</option>';
            }
        }

        jq.selPageHeader.html(html);
        jq.selPageHeader.val(currPage.header || '');
        jq.selPageFooter.html(html);
        jq.selPageFooter.val(currPage.footer || '');

        jq.selPageHeaderOverflow.html( html );
        jq.selPageHeaderOverflow.val( currPage.headerOverflow || '');
        jq.selPageFooterOverflow.html( html);
        jq.selPageFooterOverflow.val( currPage.footerOverflow || '');

        jq.selPageHeader.off('change.page').on('change.page', function onHeaderSubformChange() {
            var newHeader = jq.selPageHeader.val();
            if (currPage.getProperty('header') !== newHeader) {
                currPage.setProperty('header', newHeader, function onHeaderSubformLoad() {
                    template.render( Y.dcforms.nullCallback );
                } );
            }
        } );
        jq.selPageFooter.off('change.page').on('change.page', function onFooterSubformChange() {
            var newFooter = jq.selPageFooter.val();
            if (currPage.getProperty('footer') !== newFooter) {
                currPage.setProperty('footer', newFooter, function onFooterSubformLoad() {
                    template.render( Y.dcforms.nullCallback );
                } );
            }
        } );

        jq.selPageHeaderOverflow.off('change.page').on('change.page', function onHeaderOverflowSubformChange() {
            var newHeaderOverflow = jq.selPageHeaderOverflow.val();
            if (currPage.getProperty('headerOverflow') !== newHeaderOverflow) {
                currPage.setProperty('headerOverflow', newHeaderOverflow, function onHeaderOverflowSubformLoad() {
                    template.render( Y.dcforms.nullCallback );
                } );
            }
        } );
        jq.selPageFooterOverflow.off('change.page').on('change.page', function onFooterSubformChange() {
            var newFooterOverflow = jq.selPageFooterOverflow.val();
            if (currPage.getProperty('footerOverflow') !== newFooterOverflow) {
                currPage.setProperty('footerOverflow', newFooterOverflow, function onFooterOverflowSubformLoad() {
                    template.render( Y.dcforms.nullCallback );
                } );
            }
        } );

    }

    //  EVENT HANDLERS

    /**
     *  Launch dialog to select a new background image for this panel
     */

    function onRequestNewImage() {

        if (!currPage) {
            return;
        }

        function onReRender() {
            //currPage.redraw(Y.dcforms.LAYER_BG);
            Y.log('updated page background', 'debug', NAME);
            currPage.autosave();
            currPage.redraw();
            Y.doccirrus.comctl.clearModal();
        }

        function onImageSelected(mediaItem, fixAspect) {

            if (null === mediaItem) {

                currPage.bgImgName = '';                                //  LEGACY, to be removed
                currPage.bgImgMime = '';                                //  LEGACY, to be removed
                currPage.bgImgFixAspect = false;

                currPage.setProperty('bgImgName', '', function() {
                    currPage.setProperty('bgImg', '', function() {
                        onReRender();
                    });
                });


            } else {

                currPage.bgImgName = mediaItem.name;                    //  LEGACY, to be removed
                currPage.bgImgMime = mediaItem.mimeType;                //  LEGACY, to be removed
                currPage.bgImgFixAspect = fixAspect;

                currPage.setProperty('bgImgName', mediaItem.name, function() {
                    currPage.setProperty('bgImg', mediaItem._id, function() {
                        onReRender();
                    });
                });

            }

            jq.spanPageBgImg.html(currPage.bgImgNameT[currPage.form.userLang]);
        }

        var
            evt = {
                'ownerCollection': 'forms',
                'ownerId': currPage.form.canonicalId,
                'widthPx': currPage.form.paper.width,
                'heightPx': currPage.form.paper.height,
                'default': currPage.bgImg,
                'onSelected': onImageSelected
            };

        //currPage.raiseBinderEvent('onRequestImage', evt);
        template.raise('requestImage', evt);
    }

    /**
     *  Update the list of available subforms, should usually happen before page is selected but not guaranteed
     *
     *  @param err
     *  @param formsList
     */

    function onFormListLoaded(err, formsList) {

        if (err) {
            Y.log('Could not load list of subforms: ' + JSON.stringify(err), 'warn', NAME);
            return;
        }

        subFormList = [];

        var
            userLang = Y.dcforms.getUserLang(),
            i;

        for (i = 0; i < formsList.length; i++) {
            if (true === formsList[i].isSubform) {

                subFormList.push(formsList[i]);

            }
        }

        subFormList.sort(function(a, b) {
            if ( a.title[userLang].toLowerCase() > b.title[userLang].toLowerCase() ) { return 1; }
            if ( a.title[userLang].toLowerCase() < b.title[userLang].toLowerCase() ) { return -1; }
            return 0;
        });

        subFormListLoaded = true;
        updateSubformSelect();
    }

    /**
     *  Raised by the template when user clicks on an abstract page or creates a new one
     *
     *  @param  selPage     {Object}    A dcforms-page object
     */

    function onPageSelected(selPage) {

        if (!selPage || '' === selPage) {
            Y.log('Page deselected.', 'warn', NAME);
            //hideControls();
            currPage = null;
            return;
        }

        isInitializing = true;
        //Y.log('Page Selected: ' + selPage.name, 'debug', NAME);
        currPage = selPage;

        $('#txtPageBgColor').val(currPage.bgColor);
        $('#txtPageFgColor').val(currPage.fgColor);

        jq.chkIsCarbonCopy.prop('checked', currPage.isCarbonCopy);

        //jq.chkIsCarbonCopy.off('change').on('change', onCCChange);
        //jq.chkIsCarbonCopy.off('click.forms').on('click.forms', onCCChange);

        initPanel();
        updatePanelFromPage();
        updateSubformSelect();
        isInitializing = false;
    }

    //function onCCChange() {
    //    updatePageFromPanel();
    //}

    function onChangeUserLang() {
        onPageSelected(currPage);
    }

    //  simple jQuery events

    /*
    function onRemoveBtnClick() {
        removeCurrPage();
    }
    */


    function onReorderBtnClick() {
        Y.log('REMOVED: Page will no reorder its own relements.', 'warn', NAME);
    //  Y.dcforms.reorderElements(currPage);
    }

    //  BINDER API


    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            /*
             *  Cache Query selectors for controls
             */

            jq = {                                                  //%  pre-cached cached DOM queries [object]
                'divNoPageSelected': $('#divNoPageSelected'),
                'divPagePropertyControls': $('#divPagePropertyControls'),
                'hdnPageName': $('#hdnPageName'),
                'spanPageId': $('#spanPageId'),
                'spanPageBgImg': $('#spanPageBgImg'),
                'btnReorderElements': $('#btnReorderElements'),
                'btnSetPageBgImg': $('#btnSetPageBgImg'),
                'txtPageBgColorMC': $('#txtPageBgColorMC'),
                'txtPageFgColorMC': $('#txtPageFgColorMC'),
                'txtPageBgColor': $('#txtPageBgColor'),
                'txtPageFgColor': $('#txtPageFgColor'),
                'selPageHeader': $('#selPageHeader'),
                'selPageFooter': $('#selPageFooter'),
                'selPageHeaderOverflow': $('#selPageHeaderOverflow'),
                'selPageFooterOverflow': $('#selPageFooterOverflow'),
                'chkIsCarbonCopy': $('#chkIsCarbonCopy')
            };

            /*
             *  recover any dcforms-element reference which was passed to this
             */

            if (node.passToBinder && node.passToBinder.template) {
                template = node.passToBinder.template;
            } else {
                Y.log('Please pass a dcforms-page object to this binder', 'warn', NAME);
                // TODO: translateme
                jq.divNoPageSelected.html('No form template selected.');
                //hideControls();
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

            Y.dcforms.getFormList('', false, onFormListLoaded);

            isInitializing = true;
            linkMinicolor(jq.txtPageBgColor, 'bgColor');
            linkMinicolor(jq.txtPageFgColor, 'fgColor');
            isInitializing = false;

            if (0 !== template.pages.length) {
                onPageSelected(template.pages[0]);
            }

            editPagePropertiesVM = new EditPagePropertiesVM();
            editPagePropertiesVM.init();

            ko.applyBindings( editPagePropertiesVM, document.querySelector( '#divPagePropertyControlsContainer' ) );

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for edit_page_properties.js - ' + node.getAttribute('id'), 'debug', NAME);

            /*
             *  De-register update event on the element
             */

            if (currPage) {
                currPage.onUpdateEditForm = function() {
                    Y.log('Unhandled');
                };
            }

            if ( editPagePropertiesVM ) {
                editPagePropertiesVM.dispose();
            }

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screws up future use of this DOM node, which we might need
            //node.destroy();
        }
    };

}