/*
 * Copyright (c) 2012 Doc Cirrus GmbH
 * all rights reserved.
 */

/*eslint-disable no-unused-vars */
/*exported _fn */
/*global $ */

function _fn(Y, NAME) {
    'use strict';

    //  Isolates context of a single instance of this view from other views

    function formContext() {

        /*
         *  LOCAL VARIABLES
         */

        var
            bindCollection = '',        //  name of collection this is bound to
            bindId = '',                //  id of object this is bound to
            bindObj = {},               //  bound object

            ownerCollection = 'forms',  //  collection and id which will own generated
            ownerId = 'test',           //  submissions, PDFs, etc
            viewModel,                  //  mapper may relate a viewModel to a form

            mapper,                     //  object which relates view or database models to the reduced schema of a form

            useInitialMode = 'fill',    //  form mode to start with

            canonicalId = '',           //  database _id of formtemplate (editable in FEM)
            formVersionId = '',         //  database _id of formtemplateversion (readonly, can be embedded)

            //formVersion = '',         //  version of form to load, or empty string for latest
            jqCache = {},               //  cached jquery references
            template,                   //  dcforms-template object

            minPxWidth = 200,           //  size which will trigger expansion of render div [int]
            defaultPxWidth = 625,       //  legacy value, if sizing to container fails [int]

            embedDivId = 'divFormsCompose' + (Math.random() * 999999).toString().replace('.', ''),
            renderDivId = 'divFormsRender', // + (Math.random() * 999999).toString().replace('.', ''),

            patientRegId = '',             //  TODO: enable mapper binding through PUC proxy
            renderPdfTo = 'temp',       //  may be temp, zip or db
            zipId = null,               //  set if rendering to zip rather than database

            doBFBRedirect = false,      //  true when first creating an activity on a client
            doBFBHide = false,          //  true when opening an editable activity

            callWhenLoaded,             //  Optionally notify the parent binder when form loaded

            relayFormEvent = null;      //  method to pass form events to parent binder

        function initNode( node ) {

            Y.log('Registering node for forms_bind.js', 'info', NAME);

            //  cache jQuery selectors for UI elements

            jqCache = {
                //  main control groups
                'divFormButtons': $('#divFormButtons'),
                'spanFillButtons': $('#spanFillButtons'),
                'spanContextButtons': $('#spanContextButtons'),

                //  buttons
                'btnPDF': $('#btnPDF'),
                'btnTest': $('#btnTest')
            };

            //  get arguments provided by parent view

            node.append('<div id="' + embedDivId + '" />');

            if (node.hasOwnProperty('passToBinder')) {

                //  recover formId from passed node
                if (node.passToBinder.hasOwnProperty('canonicalId')) {
                    canonicalId = node.passToBinder.canonicalId;
                }

                //  recover any instanceId from passed node
                if (node.passToBinder.hasOwnProperty('formVersionId')) {
                    formVersionId = node.passToBinder.formVersionId;
                }

                //  recover any initialMode from passed node
                if (node.passToBinder.hasOwnProperty('initialMode')) {
                    useInitialMode = node.passToBinder.initialMode;
                }

                //  recover formVersion from passed node
                //if (node.passToBinder.hasOwnProperty('formVersion')) {
                //    formVersion = node.passToBinder.formVersion;
                //    Y.log('Serv form version: ' + formVersion);
                //}

                //  legacy, DEPRECATED
                if (node.passToBinder.hasOwnProperty('templateFile')) {
                    canonicalId = node.passToBinder.templateFile;
                }

                //  recover collection from passed node
                if (node.passToBinder.hasOwnProperty('collection')) {
                    bindCollection = node.passToBinder.collection;
                }

                //  recover document ID from passed node
                if (node.passToBinder.hasOwnProperty('id')) {
                    bindId = node.passToBinder.id;
                }

                //  recover owner collection (of generated submissions, PDFs, etc) from passed node
                if (node.passToBinder.hasOwnProperty('ownerCollection')) {
                    ownerCollection = node.passToBinder.ownerCollection;
                }

                //  recover owner id (of generated submissions, PDFs, etc) from passed node
                if (node.passToBinder.hasOwnProperty('ownerId')) {
                    ownerId = node.passToBinder.ownerId;
                }

                //  check for an event listener
                if (node.passToBinder.hasOwnProperty('viewModel')) {
                    viewModel = node.passToBinder.viewModel;
                }

                //  check for domId to render into
                //if (node.passToBinder.hasOwnProperty('embedDivId')) {
                    //embedDivId = node.passToBinder.embedDivId;

                    //embedDivId = 'divFormsCompose';
                //}

                //  check for domId to render PDFs into
                if (node.passToBinder.hasOwnProperty('renderDivId')) {
                    renderDivId = node.passToBinder.renderDivId;
                }

                //  check for domId to render PDFs into
                if (node.passToBinder.hasOwnProperty('setWidth')) {
                    defaultPxWidth= node.passToBinder.setWidth;
                }

                //  check for form event listener
                if (node.passToBinder.hasOwnProperty('onFormEvent')) {
                    relayFormEvent = node.passToBinder.onFormEvent;
                }

                //  check for a load event handler
                if (node.passToBinder.hasOwnProperty('onLoad')) {
                    callWhenLoaded = node.passToBinder.onLoad;
                }

                //  destination of PDF render may be a zip file
                if (node.passToBinder.hasOwnProperty('zipId')) {
                    zipId = node.passToBinder.zipId;
                }

                //  BFB redirect is not always applied
                if (node.passToBinder.hasOwnProperty('bfbRedirect')) {
                    doBFBRedirect = node.passToBinder.bfbRedirect;
                } else {
                    doBFBRedirect = false;
                }

                //  BFB hide is not always applied
                if (node.passToBinder.hasOwnProperty('bfbHide')) {
                    doBFBHide = node.passToBinder.bfbHide;
                } else {
                    doBFBHide = false;
                }

            } else {
                Y.doccirrus.comctl.setModal('Notice', 'Please pass arguments in node.passToBinder', true);
            }

            Y.log('Attempting to load form mapping to ' + bindCollection + '::' + bindId, 'info', NAME);


            //  try load form from passed identifiers
            if (('' !== canonicalId) && ('' !== formVersionId)) {
                loadTemplate(canonicalId, formVersionId);
                return;
            }

            //  allow unspecified version for now (due to migration uncertainty in version history of forms)
            if ('' !== canonicalId) {
                loadTemplate(canonicalId, '');
                return;
            }

            Y.doccirrus.comctl.setModal('Notice', 'Mapped form not specified, nothing to show.', true);
        }


        /*
         *  BINDER ACTIONS - load child controls, change states, etc
         */

        /**
         *  Load a form template to be mapped into
         *
         *  If this completes successfully the 'onLoad' event will fire in onTemplateEvent and we will
         *  load and map the requested db object
         *
         *  Note that 'doBFBRedirect' in the binding is set by casefile_detail for first load of a form relating
         *  to an activity.  It is used only when creating activities - on load the activity should show whichever
         *  for was used previously, regardless of KBV/BFB state.
         *
         *  @param  canonicalId     {String}    master / editable copy fo form in database
         *  @param  formVersionId   {String}    a specific version of this form
         */

        function loadTemplate(canonicalId, formVersionId) {

            var
                il8nDict = Y.dcforms.il8nDict,
                jqDiv = $('#' + embedDivId),
                jqMenu = $('#divFormButtons'),
                clientBFB;

            jqDiv.show();

            function onInitialModeSet() {
                onTemplateLoaded(formVersionId);
            }

            function onFormRendered(err) {
                if (err) {
                    Y.log('Could not load form from server: ' + err, 'warn', NAME);
                    return;
                }

                onTemplateLoaded(formVersionId);
                template.setMode(useInitialMode, onInitialModeSet);
            }

            function onFormLoaded(err) {
                if (err) {
                    Y.log('Could not load form from server: ' + err, 'warn', NAME);
                    return;
                }

                var i, j, elem;       //  for iterating over all elements in the loaded form for BFB hiding

                //  some forms cannot be used in some clients if they do not have KBV/BFB certification
                //  there may be an alternative form which can be used in this case

                if (doBFBRedirect && template.isBFB && false === Y.dcforms.clientHasBFB()) {

                    if (template.bfbAlternative && '' !== template.bfbAlternative) {
                        Y.log('No BFB certification, loading alternative form', 'info', NAME);
                        loadTemplate(template.bfbAlternative, '');
                        return;
                    }

                }

                //  some forms have elements which should be hidden if no KBV/BFB certification is available
                //  this situation should persist for the lifetime of activities, and in other contexts such
                //  as the patient portal

                if (doBFBHide || (doBFBRedirect && false === Y.dcforms.clientHasBFB())) {
                    for (i = 0; i < template.pages.length; i++) {
                        for (j = 0; j < template.pages[i].elements.length; j++) {

                            elem = template.pages[i].elements[j];
                            elem.isHiddenBFB = (elem.isBFB  && !clientBFB);

                            //if (elem.isHiddenBFB) {
                                //console.log('hiding BFB element ' + elem.elemId);
                            //}
                        }
                    }
                }

                //  if rendering into a 0 width div, try to get the width of the menu bar (hack for CaseFile)
                template.px.width = jqDiv.width();
                template.ownerCollection = ownerCollection;
                template.ownerId = ownerId;
                template.mode = useInitialMode;

                if ((template.px.width < minPxWidth) && (jqMenu.length > 0)) {
                    template.px.width = jqMenu.width();
                    Y.log('Set page width from menu bar: ' + template.px.width, 'debug', NAME);
                }

                if (template.px.width < minPxWidth) {
                    template.px.width = defaultPxWidth;
                    Y.log('Set page width from default: ' + template.px.width, 'debug', NAME);
                }

                template.onBinderEvent = onTemplateEvent;
                //template.load(canonicalId, formVersionId, onTemplateLoaded);
                template.render(onFormRendered);
            }

            function onTemplateCreated(err, newTemplate) {

                if (err) {
                    Y.log('Could not create form template: ' + err, 'warn', NAME);
                    return;
                }

                template = newTemplate;
                template.px.width = jqDiv.width();
                template.ownerCollection = ownerCollection;
                template.ownerId = ownerId;
                template.mode = useInitialMode;

                //  load the form from server
                template.load(canonicalId, formVersionId, onFormLoaded);
            }

            //  create an empty template object
            function onKBVConfigLoad(err) {
                if (err) {
                    //  non-fatal, assume not KBV certified if no KBV certification object is available
                    Y.log('Could not load KBV certification numbers.', 'debug', NAME);
                }

                clientBFB = Y.dcforms.clientHasBFB();
                Y.dcforms.template.create(patientRegId, '', '', embedDivId, il8nDict, false, onTemplateCreated);
            }

            //  first step is to load KBV config, since the requested form may not be available if there is no
            //  KBV certification

            Y.dcforms.loadCertNumbers(onKBVConfigLoad);
        }

        /**
         *  Hackish, experimental way to let mappers add buttons to the form UI based on their own state / events / workflow
         *
         *  @param  buttonDef   {Object}    Should have 'label', icon and 'onClick' members
         */

        function addContextButton(buttonDef) {

            var
                id = buttonDef.id || 'btnFEMContext' + Math.random().toString(36).slice(2),
                icon = buttonDef.icon || 'fa-bolt',
                label = buttonDef.label || 'Untitled',

                html = '' +
                    '<button class="btn" id="' + id + '">' +
                    '<i class="fa ' + icon + '"></i>' +
                    '<span>&nbsp;' + label + '</span>' +
                    '</button>' +
                    '<span>&nbsp;</span>';


            jqCache.spanContextButtons.append(html);

            if (buttonDef.onClick) {
                $('#' + id).off('click').on('click', buttonDef.onClick);
            }

            Y.log('Adding context button to embedded form: ' + label, 'info', NAME);
            jqCache.spanContextButtons.show();
        }

        /*
         *  EVENT HANDLERS
         */


        /**
         *  Called by the loaded template when state changes or user does something
         *
         *  This binder just sets up the template and the mapper, and passes events back and forth between them and
         *  any parent object
         *
         *  @param  eventName   {string}
         *  @param  eventData
         */

        function onTemplateEvent(eventName, eventData) {

            //  pass to mapper
            if ('object' === typeof mapper) {
                mapper.handleEvent(eventName, eventData);
            }

            //  inform parent view
            if ('function' === typeof relayFormEvent) {
                relayFormEvent(eventName, eventData);
            }

            //  load mapper and set up UI
            switch(eventName){

            //    case 'onLoaded':
            //        onTemplateLoaded(eventData);
            //        break;

                case 'onRequestContextButton':
                    addContextButton(eventData);
                    break;

                case 'onClearContextButtons':
                    jqCache.spanContextButtons.html('');
                    break;

            }

        }

        /**
         *  Called after template is instantiated and loaded from the server
         *  @param  formVersionId   {String}    The form version which was actually loaded
         */

        function onTemplateLoaded(/*formVersionId*/) {

            function onMapComplete() {
                template.off('mapcomplete', 'forms_bind');

                if (callWhenLoaded) {
                    callWhenLoaded(template);
                }
            }

            //  to not instantiate more than one mapper per form
            if (mapper) {
                //TODO: find what calls this twice
                Y.log('Prevented instantiation of more than one mapper for a single form', 'debug', NAME);
                return;
            }

            //Y.log('Loaded form version: ' + formVersionId + ' from patientreg: ' + patientRegId, 'info', NAME);

            jqCache.spanFillButtons.show();

            jqCache.btnPDF.off('click.forms').on('click.forms', function onPDFClick() {
                Y.dcforms.setStatus( Y.doccirrus.i18n('FormEditorMojit.status_messages.RENDERING_PDF'), true);
                Y.dcforms.makePDF(template, renderPdfTo, '', '', onPDFRendered);
                //template.renderAllPDF('temp', zipId, template.name[template.userLang], onPDFRendered);
            });

            jqCache.btnTest.off('click.forms').on('click.forms', function onPDFClick() {
                Y.doccirrus.comctl.setModal('About', '<pre>' + JSON.stringify(bindObj, undefined, 2) + '</pre>', true);
            });

            // Problem here is that the reduced schema is not loaded at this time and
            // so we repeat the information that is already contained in the reduced
            // schema here.
            Y.dcforms.setStatus('Mapping...', true);
            switch (template.reducedSchema) {
                case 'Invoice_T':       template.mapperName = 'invoice';        break;
                case 'Prescription_T':  template.mapperName = 'prescription';   break;
                case 'Patient_T':       template.mapperName = 'patient';        break;
                case 'CaseFile_T':      template.mapperName = 'casefile';       break;
                case 'DocLetter_T':     template.mapperName = 'docletter';      break;
                case 'PubReceipt_T':    template.mapperName = 'pubreceipt';     break;
                case 'InCase_T':        template.mapperName = 'incase';         break;
                default:                template.mapperName = 'incase';         break;
            }

            Y.log('Binding form with mapper: ' + template.mapperName, 'debug', NAME);

            template.on('mapcomplete', 'forms_bind', onMapComplete);

            var
                patientViewModel,
                context;

            if ('plain' === template.mapperName) {
                onMapComplete(null);
            } else {

                patientViewModel = Y.doccirrus.uam.loadhelper.get( 'currentPatient' ) || null;
                context = {
                    'bindCollection': bindCollection,
                    'bindId': bindId,
                    'patient': patientViewModel,
                    'activity': viewModel
                };

                mapper = Y.dcforms.mapper[template.mapperName]( template, context );
            }

        }

        function onPDFRendered(err, newMediaId) {
            if (err) {
                Y.log('Could not create new PDF: ' + err, 'warn', NAME);
                return;
            }
            Y.log('Created new PDF: ' + newMediaId);
        }

        return {
            'init': initNode
        };
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
            var
                i18n = Y.doccirrus.i18n;

            Y.log('creating form binder', 'debug', NAME);
            node.formContextWrapper = formContext();
            node.formContextWrapper.init(node);

            function FormsNewVM() {
                var
                    self = this;

               self.btnExportPDFI18n =  i18n('FormEditorMojit.ctrl.BTN_EXPORT_PDF');
               self.btnTestI18n = i18n('FormEditorMojit.ctrl.BTN_TEST');
            }

            ko.applyBindings( new FormsNewVM(), document.querySelector( '#divFormsComposeFrame' ) );

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for forms_editor.js - ' + node.getAttribute('id'), 'debug', NAME);

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screws up future use of this DOM node, which we might need
            //node.destroy();

        }
    };

}
