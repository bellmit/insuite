/*
 * Copyright (c) 2015 Doc Cirrus GmbH
 * all rights reserved.
 *
 * jadeLoaded view for editing the print properties of a dcforms-template object - prtin preferences apply to whole
 * document, are only used whn generating a PDF
 */

/*jshint latedef:false */
/*exported _fn */
/*global $, ko */

function _fn(Y, NAME) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,

        myNode,                                 //  YUI/DOM node this was jadeLoaded into
        template,                               //  reference to the currently loaded template

        eventHandlers = {
            'bfbChange': onBFBChange
        },

        dataBinding = {
            'selPdfPrinterName': 'printerName',
            'selPdfRotation': 'rotate',
            'txtOffsetX': 'offsetx',
            'txtOffsetY': 'offsety',
            'txtPdfScale': 'scale',
            'chkPdfA4': 'printA4',
            'chkPrintBg': 'printBackground'
        },

        jq = {};                                //  cached jQuery selectors

    /**
     *  Configure this form to loaded page and (re)bind events
     */

    function initPanel() {

        var
            jqTemp,
            k;

        //  display settings of current template
        updatePanelFromTemplate();

        //  attach event handlers to form controls
        for (k in dataBinding) {
            if (dataBinding.hasOwnProperty(k)) {

                jqTemp = $('#' + k);

                //	unset any existing handler
                jqTemp.off('keyup.forms').on('keyup.forms', updateTemplateFromPanel);
                jqTemp.off('change.forms').on('change.forms', updateTemplateFromPanel);
            }
        }

        //  only enable test print button if at least one printer is available
        if (0 === Y.dcforms.getPrinterList().length) {
            jq.btnTestPrint.addClass('disabled');
        } else {
            jq.btnTestPrint.off('click.forms').on('click.forms', onTestPrint);
        }

    }

    /**
     *  Register all event handlers
     */

    function registerEventHandlers() {
        var k;
        for (k in eventHandlers) {
            if (eventHandlers.hasOwnProperty(k)) {
                template.on(k, 'edit_pdf_properties', eventHandlers[k]);
            }
        }
    }

    /**
     *  Unhook event listeners for this panel from template
     */

    function deregisterEventHandlers() {
        if (!template) { return; }
        template.event.off('*', 'edit_pdf_proeprties');
    }

    /**
     *  Fill this form with values from dcforms-page object
     */

    function updatePanelFromTemplate() {
        //Y.log('Setting panel controls from dcforms-template', 'debug', NAME);

        var k;
        for (k in dataBinding) {
            if (dataBinding.hasOwnProperty(k)) {
                //Y.log('Setting: k => ' + dataBinding[k], 'debug', 'edit_page_properties');

                if ('chkPrintBg' === k || 'chkPdfA4' === k) {
                    $('#' + k).prop('checked', template.pdf[dataBinding[k]]);
                } else {
                    $('#' + k).val(template.pdf[dataBinding[k]]);
                }

            }
        }

        //  update visibility of printbg checkbox
        onBFBChange();
    }

    /**
     *  Update dcforms-page object when this form changes
     */

    function updateTemplateFromPanel() {

        if (!template) {
            Y.log('No form selected, cannot edit pdf options.', 'debug', NAME);
            return;
        }

        var
            dirty = false,                      //% set true if anything changes on the page object
            currElem,
            currVal,                            //% current value of the input/DOM element
            k;                                  //% for iterating over binding [string]

        //  check that current selected page is the same which last filled the form
        for (k in dataBinding) {
            if (dataBinding.hasOwnProperty(k)) {

                currElem = $('#' + k);
                currVal = currElem.val();

                if (!isNaN(currVal)) {
                    if (template.pdf[dataBinding[k]] !== currVal) {
                        template.pdf[dataBinding[k]] = currVal;
                        dirty = true;
                    }
                }

                if ('chkPrintBg' === k || 'chkPdfA4' === k) {
                    currVal = Boolean(currElem.is(":checked"));
                    if (template.pdf[dataBinding[k]] !== currVal) {
                        template.pdf[dataBinding[k]] = currVal;
                        dirty = true;
                    }
                }

            }
        }

        //  only update the template on change
        if (true === dirty && template) {
            //  Print option changes do not require a re-render, but should be saved back to server
            template.autosave();
        }
    }

    /**
     *  Show a modal listing available printers
     */

    function showTestPrintSelectDialog() {
        var
            options = {},
            printers = Y.dcforms.getPrinterList(),
            modalButtons = {},
            dialogButtonSelectLabel = i18n('FormEditorMojit.pdf_properties.labels.PRINT'),
            printerSelectDialog,
            windowConfig = {},
            printerSelect = '',
            printerName,
            tempFile,
            i;

        //  make a select element with all available printers
        for (i = 0; i < printers.length; i++) {
            printerSelect = printerSelect + '<option value="' + printers[i].name + '">' + printers[i].name + '</option>';
        }

        printerSelect = '' +
        //  '<p>' + i18n('FormEditorMojit.pdf_properties.labels.PLEASE_SELECT_PRINTER') + '</p>' +
            '<select id="selTestPrinter" class="form-control">' + printerSelect + '</select>';

        //  if there are no printers configured on this instance, show a message instead
        if (0 === printers.length) {
            printerSelect = i18n('FormEditorMojit.pdf_properties.labels.NO_PRINTERS');
            dialogButtonSelectLabel = i18n('FormEditorMojit.pdf_properties.labels.MAKE_PDF');
        }

        //  build the dialog

        modalButtons.cancel = Y.merge( Y.doccirrus.DCWindow.getButton( 'CANCEL' ), options.buttonCancelConfig );

        modalButtons.print = Y.merge( {
            isDefault: true,
            name: 'SELECTPRINT',
            label: dialogButtonSelectLabel,
            action: actionSelectAndPrint,
            disabled: false
        }, {} );

        modalButtons.ok = Y.merge( {
            isDefault: true,
            name: 'OKPRINT',
            label: i18n( 'DCWindow.BUTTONS.OK' ),
            action: actionOKClose,
            disabled: false,
            hidden: true
        }, {} );

        printerSelectDialog = new Y.doccirrus.DCWindow( Y.aggregate( {
            className: 'DCWindow-showTestPrinterSelectDialog',
            bodyContent: '<div id="divTestPrint">' + printerSelect + '</div>',
            title: i18n('FormEditorMojit.pdf_properties.labels.TEST_PRINT'),
            icon: Y.doccirrus.DCWindow.ICON_LIST,
            width: Y.doccirrus.DCWindow.SIZE_LARGE,
            height: 225,
            minHeight: 125,
            minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
            centered: true,
            modal: true,
            resizeable: false,
            maximizable: false,
            fitOnViewPortResize: !Y.UA.touchEnabled, // for non touch devices to handle complete visibility of dialog for small screens, eg: mac-book
            render: document.body,
            buttons: {
                header: ['close'],
                footer: [
                    modalButtons.cancel,
                    modalButtons.print
                ]
            },
            after: {
                visibleChange: function( yEvent ) {
                    // also captures cancel for e.g.: ESC
                    if( !yEvent.newVal ) {
                        Y.log('Cancel printer select', 'debug', NAME);
                    }
                }
            }
        }, windowConfig, true ) );

        function actionSelectAndPrint() {

            jq.divTestPrint = $('#divTestPrint');
            jq.selTestPrinter = $('#selTestPrinter');

            if (0 === printers.length) {
                // no printers configured, or CUPS not available
                // instead start a PDF generation and hand off to previous show/download dialog
                jq.divTestPrint.html(Y.doccirrus.comctl.getThrobber());
                Y.dcforms.makePDF(template, 'temp', '', '', function onAltPDFCreation() {
                    printerSelectDialog.close();
                });
                return;
            }

            //  hide the modal buttons
            $(printerSelectDialog.getButton('SELECTPRINT')._node).hide();
            $(printerSelectDialog.getButton('CANCEL')._node).hide();

            //  set the printer
            printerName = jq.selTestPrinter.val();

            Y.log('Selected printer: ' + printerName, 'debug', NAME);
            jq.divTestPrint.html(Y.doccirrus.comctl.getThrobber());

            template.setMode('fill', function onModeSet() {
                template.render(function onRendered() {
                    Y.dcforms.setStatus(Y.doccirrus.i18n('FormEditorMojit.status_messages.RENDERING_PDF'), true);
                    template.renderPdfServer('temp', '', '', onDocumentForPDF);
                });
            });
        }

        function onDocumentForPDF( err, formForPDF ) {
            if ( err ) { return onPDFCreated( err ); }

            //  call formtemplate API via REST
            Y.doccirrus.comctl.privatePost('1/media/:makepdf', { 'document': formForPDF }, onPDFCreated );
        }

        function onPDFCreated(err, data) {

            if (err) {
                Y.log('Could not create PDF for test print: ' + JSON.stringify(err), 'warn', NAME);
                jq.divTestPrint.html(i18n('FormEditorMojit.pdf_properties.error.PDF_GENERATION_ERROR'));
                return;
            }

            data = data.data ? data.data : data;

            if (!data.tempId || '' === data.tempId) {
                Y.log('PDF generation error: file not saved', 'warn', NAME);
                jq.divTestPrint.html(i18n('FormEditorMojit.pdf_properties.error.PDF_GENERATION_ERROR'));
                return;
            }

            tempFile = data.tempId;

            var
                postData = {
                    'printerName': printerName,
                    'tempFile': tempFile,
                    'deleteOnPrint': false
                };

            Y.doccirrus.comctl.privatePost('/1/media/:printCache', postData, onPrintComplete);
        }

        function onPrintComplete(err, response) {

            //  Show OK button in modal footer
            var okButton = printerSelectDialog._createButton(modalButtons.ok);
            printerSelectDialog.footerNode.appendChild(okButton);
            $(okButton._node).addClass('btn-primary');

            if (err || !response || !response.data || !response.data.msg) {
                jq.divTestPrint.html(i18n('FormEditorMojit.pdf_properties.error.PRINT_ERROR'));

                jq.divTestPrint.html(
                    response.data.msg + '<br/>' +
                    i18n('FormEditorMojit.pdf_properties.error.PRINT_ERROR') + ': '+ printerName
                );
                return;
            }

            Y.log('Print job added on server: ' + JSON.stringify(response), 'debug', NAME);
            jq.divTestPrint.html(
                response.data.msg + '<br/>' +
                i18n('FormEditorMojit.pdf_properties.labels.PRINTER') + ': '+ printerName
            );
        }

        function actionOKClose() {
            printerSelectDialog.close();
        }
    }

    /**
     *  Raised by edit_form_properties.js via template when isBFB property is changed
     *  Also called when initializing to set visibility
     *
     *  (in BFB forms the page backgrounds depend on a system wide setting, not user preference for individual forms)
     *  see: MOJ-4169
     */

    function onBFBChange() {
        if (template.isBFB) {
            jq.divPrintBg.hide();
        } else {
            jq.divPrintBg.show();
        }
    }

    /**
     *  Generate a PDF of the current form and send it to the configured printer
     */

    function onTestPrint() {
        showTestPrintSelectDialog();
        return;
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
                'selPdfPrinterName': $('#selPdfPrinterName'),
                'selPdfRotation': $('#selPdfRotation'),
                'txtOffsetX': $('#txtOffsetX'),
                'txtOffsetY': $('#txtOffsetY'),
                'txtPdfScale': $('#txtPdfScale'),
                'divPrintBg': $('#divPrintBg'),
                'btnTestPrint': $('#btnTestPrint')
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
             *  load values from them element
             */

            //  remove any previous or duplicate events
            deregisterEventHandlers();
            //  listen for template events
            registerEventHandlers();

            //  jQuery init, etc
            initPanel();

            function EditPDFPropertiesVM() {
                var
                    self = this;

                self.lblRotationI18n = i18n('FormEditorMojit.print_properties.LBL_ROTATION');
                self.lblOffsetXI18n = i18n('FormEditorMojit.print_properties.LBL_OFFSETX');
                self.lblOffsetYI18n = i18n('FormEditorMojit.print_properties.LBL_OFFSETY');
                self.lblPdfScaleI18n = i18n('FormEditorMojit.print_properties.LBL_PDFSCALE');
                self.lblPrintBgI18n = i18n('FormEditorMojit.print_properties.LBL_PRINT_BG');
                self.lblPdfA4I18n = i18n('FormEditorMojit.print_properties.LBL_PDFA4');
                self.lblTestPrintI18n = i18n('FormEditorMojit.print_properties.LBL_TESTPRINT');

            }

            ko.applyBindings( new EditPDFPropertiesVM(), document.querySelector( '#divEditPdfPropertiesContainer' ) );

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