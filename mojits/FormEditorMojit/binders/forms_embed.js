/*
 * Copyright (c) 2012 Doc Cirrus GmbH
 * all rights reserved.
 */

/*exported _fn */
/*global $, async, ko */
/*jshint latedef:false */
/*eslint-disable no-unused-vars */

function _fn(Y, NAME) {                         //  eslint-disable-line
    'use strict';

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
            Y.log('Registering node for forms_editor.js', 'info', NAME);

            /*
             *  LOCAL VARIABLES
             */

            var
                i18n = Y.doccirrus.i18n,
                //  passed by caller
                passed = node.hasOwnProperty( 'passToBinder' ) ? node.passToBinder : {},

            //    myNode,
                canonicalId = '',
                formVersionId = '',
                patientRegId = '',
                divId = 'divFormsCompose',

                //  owner of the document holding form content
                formOwnerId = '',
                formOwnerCollection = '',

                callOnSubmit,
                callOnRequestAudioRecord = null,
                callOnRequestAudioPlay = null,

                onSubmitDisabled = false,
                lockForm = false,

                zipId = null,                   //  if rendering to zip instead of database

                initialState = {},              //  may be passed from parent

                //  cached jquery references
                jqCache = {
                    //  main control groups
                    'divFormButtons': $('divFormButtons'),
                    'spanFillButtons': $('spanFillButtons'),

                    //  buttons
                    'btnPDF': $('#btnPDF'),
                    'btnSubmit': $('#btnSubmit'),
                    'btnNext': $('#btnNext'),
                    'btnPrev': $('#btnPrev'),
                    'btnReset': $('#btnReset')
                },

                template,               //  dcforms-template object
                pageIndex = 0,
                pageCount = 0,
                selectedPage,           //  identifies selected dcforms-page object
                selectedElement;        //  identifies selected dcforms-element object

            /*
             *  BINDER ACTIONS - load child controls, change states, etc
             */

            /**
             *  Load a form into the view window
             *
             *  @param  canonicalId     {string}    _id of a form template in the database
             *  @param  formVersionId   {string}    _id of a formtemplateversion in the database
             */

            function loadTemplate(canonicalId, formVersionId) {

                var
                    il8nDict = Y.dcforms.il8nDict,
                    jqDiv = $('#' + divId);

                jqDiv.show();

                async.series( [ createTemplate, resizeForm, redrawForm ], onAllDone );

                function createTemplate( itcb ) {
                    Y.dcforms.template.create(patientRegId, canonicalId, formVersionId, divId, il8nDict, false, onTemplateCreated);
                    function onTemplateCreated(err, newTemplate) {

                        if (err) {
                            Y.log('Error creating form template:' + err, 'warn', NAME);
                            jqDiv.html(err);
                            return;
                        }

                        template = newTemplate;
                        template.onBinderEvent = onTemplateEvent;
                        template.patientRegId = patientRegId;

                        itcb( null );
                    }
                }

                function resizeForm( itcb ) {
                    //template.px.width = jqDiv.width();
                    template.renderPage = 0;
                    template.resize( jqDiv.width(), itcb );
                }

                function redrawForm( itcb ) {
                    template.render( itcb );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Problem while loading form template: ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue despite error, best effort
                    }
                    onTemplateLoaded(template);
                }
            }

            /**
             *  Try load form named in URL hash fragment
             *  Stub: Very simple for now, may need to become a more complicated parser in future
             */

            //  not used at present, but planned for next version
            //function loadFromHashFragment() {
            //    var
            //        hash = window.location.hash,
            //        instanceId = hash.replace('#form=', '');
            //
            //    if (('' === instanceId) ||('#' === instanceId)) {return; }
            //    loadTemplate(instanceId);
            //}

            /*
             *  EVENT HANDLERS
             */

            /**
             *  Called by the loaded template when user does something
             *
             *  @param  eventName   {String}
             *  @param  eventData   {Mixed}     Usually an object
             */

            function onTemplateEvent(eventName, eventData) {

                /*
                try {
                    Y.log('Template event: ' + eventName + ' data: ' + JSON.stringify(eventData), 'debug', NAME);
                } catch (jsonErr) {
                    Y.log('Template event: ' + eventName + ' data not serialized: ' + jsonErr, 'debug', NAME);
                }
                */

                switch(eventName){

                    case 'onElementSelected':   onElementSelected(eventData);               break;

                    case 'onModeSet':           onModeSet(eventData);                       break;
                    case 'onPageSelected':      onPageSelected(eventData);                  break;
                    case 'onSchemaSet':         onSchemaSet(eventData);                     break;

                    //case 'onPageLeft':          alert('onPageLeft');                        break;
                    //case 'onPageRight':         alert('onPageRight');                       break;

                    default:
                        Y.log('Unhandled template event: ' + eventName, 'warn', NAME);
                        break;
                }
            }

            /**
             *  Called after form is redrawn
             */

            function onReRender(err) {
                if (err) {
                    Y.log('Could not redraw form: ' + err, 'warn', NAME);
                }
            }

            /**
             *  Called after template is instantiated and loaded from the server
             *
             *  @param  template    {object}    dcforms-template object
             */

            function onTemplateLoaded(template) {

                //Y.log('Template loaded, initialState is: ' + (typeof initialState) + ' ' + JSON.stringify(initialState));
                template.fromDict( initialState, onLoadFromDict );

                function onLoadFromDict( err ) {
                    if ( err ) {
                        Y.log( 'Problem loading form from dict: ' + JSON.stringify( err ), 'warn', NAME );
                        //  continue with render anyway
                    }
                    template.render( onReRender );
                }


                Y.log('Loaded template: ' + template.canonicalId, 'info', NAME);

                //  start with the first page
                template.renderPage = 0;

                template.ownerId = formOwnerId;
                template.ownerCollection = formOwnerCollection;

                pageCount = template.pages.length;
                pageIndex = 0;

                jqCache.spanFillButtons.show();

                jqCache.btnSubmit.off('click.forms').on('click.forms', function onSubmitBtn() {
                    callOnSubmit(template.toDict(), template);
                });

                jqCache.btnNext.off('click.forms').on('click.forms', onNextBtn);
                jqCache.btnPrev.off('click.forms').on('click.forms', onPrevBtn);
                jqCache.btnPDF.off('click.forms').on('click.forms', onPDFClick);

                onPageSelected( template.pages[0] );

                if (onSubmitDisabled) {
                    jqCache.btnSubmit.hide();
                } else {
                    jqCache.btnSubmit.show();
                }

                //callOnRequestAudioRecord = null,
                //callOnRequestAudioPlay = null,
                //template.on( 'requestAudioFile', NAME, function( args ) { self.onRequestImageSelect( args ); } );

                if ( callOnRequestAudioRecord ) {
                    template.on( 'requestAudioRecord', NAME, function( args ) { callOnRequestAudioRecord( args ); } );
                }

                if ( callOnRequestAudioPlay ) {
                    template.on( 'requestAudioPlayback', NAME, function( args ) { callOnRequestAudioPlay( args ); } );
                }

                if ( lockForm ) {
                    template.setMode('locked', onReRender);
                }

            }

            function onPDFClick() {
                Y.dcforms.setStatus(Y.doccirrus.i18n('FormEditorMojit.status_messages.RENDERING_PDF'), true);
                var saveTo = zipId ? 'zip' : 'temp';
                template.renderPdfServer(saveTo, zipId, 'temp', onDocumentReady);

                function onDocumentReady( err, formForPDF ) {
                    if ( err ) { return onPDFCreated( err ); }

                    //  call formtemplate API via REST
                    Y.doccirrus.comctl.privatePost('1/media/:makepdf', { 'document': formForPDF }, onPDFCreated );
                }

            }

            function onNextBtn() {
                var dict = template.toDict();

                template.renderPage = template.renderPage + 1;
                if (template.renderPage >= (template.pages.length - 1)) {
                    template.renderPage = template.pages.length - 1;
                }
                onPageSelected( template.pages[ template.renderPage ] );

                template.fromDict( dict, onDictLoaded );
            }

            function onPrevBtn() {
                var dict = template.toDict();
                template.renderPage = template.renderPage - 1;
                if (template.renderPage <= 0) {
                    template.renderPage = 0;
                }
                onPageSelected( template.pages[ template.renderPage ] );
                template.fromDict( dict, onDictLoaded );
            }

            function onDictLoaded ( err ) {
                if ( err ) {
                    Y.log( 'Problem loading dict into form: ' + JSON.stringify( err ), 'warn', NAME );
                    //  continue with render in any case
                }
                template.render( onReRender );
            }

            /*
             /**
             *  Called when image control is loaded, used to manage images in edit mode
             *
             *  @param  err         {string}    See jadeLoader index binder for detail
             *  @param  templateId  {string}    Cache reference, usually: mojitname + '_' + templatename


             function onImagesLoaded(err, templateId) {
             if (err) {
             Y.log('Error loading images: ' + err, 'error', NAME);
             return;
             }
             Y.log('Image control loaded, templateId: ' + templateId, 'info', NAME);
             }

             Will need to be re-added if we allow references to images as a form input type

             */

            /**
             *  Note when template changes mode
             *
             *  Nothing really to do here yet, may be important to validation later
             *
             *  @param  mode    {String}    Name of dcforms-template mode
             */

            function onModeSet(mode) {
                if ('shutdown' === mode) {
                    Y.log('Unloading form, page is closing...', 'info', NAME);
                }
            }

            /**
             *  Raised when a page is clicked or selected from menu - use to enable or disable buttons
             *  @param  currPage    {object}    A dcforms-page object
             */

            function onPageSelected(currPage) {
                selectedPage = currPage;

                if (!template) {
                    Y.log('Form template is not defined.', 'warn', NAME);
                    return;
                }

                if (0 === template.renderPage) {
                    jqCache.btnPrev.attr('disabled', 'disabled');
                } else {
                    jqCache.btnPrev.removeAttr('disabled');
                }

                if (template.renderPage >= (template.pages.length - 1)) {
                    jqCache.btnNext.attr('disabled', 'disabled');
                } else {
                    jqCache.btnNext.removeAttr('disabled');
                }
            }

            /**
             *  Raised when the user selects / clicks on an element
             *  @param currElement
             */

            function onElementSelected(currElement) {

                if ('edit' !== template.mode) {
                    //  only editable in edit mode
                    return;
                }

                if ((template.instaceId + '::' + currElement.domId) === selectedElement) {
                    //  ignore repeated selection
                    return;
                }

                selectedElement = template.instanceId + '::' + currElement.domId;
            }

            /**
             *  Callback from PDF render
             *
             *  @param  err     {string}    Error message or null
             *  @param  newid   {string}    A database _id or zip handle depending on destination of PDF render
             */

            function onPDFCreated(err, newId) {

                newId = newId.data ? newId.data : newId;

                if (err) {
                    Y.log('Could not render PDF: ' + err, 'warn', NAME);
                    return;
                }

                Y.log('Created new PDF with reference: ' + newId, 'debug', NAME);
            }

            /**
             *  Raised when a form applies a reduced schema
             *  @param  reducedSchemaName   {string}    Must be supported by reducedschema-yui
             */

            function onSchemaSet(reducedSchemaName) {
                Y.log('Set form schema to ' + reducedSchemaName, 'info', NAME);
            }

            function onSubmitDefault() {
                Y.log('No handler has been set to accept submitted forms, using default / debug.', 'warn', NAME);
                template.submitQuestionnaire();
            }

            //myNode = node;
            callOnSubmit = onSubmitDefault;

            //  recover options from passed by parent binder

            if ( node.hasOwnProperty('passToBinder') ) {

                //  form instantiation
                canonicalId = passed.hasOwnProperty( 'canonicalId' ) ? passed.canonicalId : canonicalId;
                formVersionId = passed.hasOwnProperty( 'formVersionId' ) ? passed.formVersionId : formVersionId;
                patientRegId = passed.hasOwnProperty( 'patientRegId' ) ? passed.patientRegId : patientRegId;
                zipId = passed.hasOwnProperty( 'zipId' ) ? passed.zipId : zipId;
                lockForm = passed.hasOwnProperty( 'lockForm' ) ? passed.lockForm : lockForm;
                onSubmitDisabled = passed.hasOwnProperty( 'onSubmitDisabled' ) ? passed.onSubmitDisabled : onSubmitDisabled;
                formOwnerId = passed.hasOwnProperty( 'ownerId' ) ? passed.ownerId : '';
                formOwnerCollection = passed.hasOwnProperty( 'ownerCollection' ) ? passed.ownerCollection : '';

                //  event handlers
                callOnSubmit = passed.hasOwnProperty( 'onSubmit' ) ? passed.onSubmit : onSubmitDefault;
                callOnRequestAudioRecord = passed.hasOwnProperty( 'onRequestAudioRecord' ) ? passed.onRequestAudioRecord : null;
                callOnRequestAudioPlay = passed.hasOwnProperty( 'onRequestAudioPlay' ) ? passed.onRequestAudioPlay : null;

                //  forn content

                if ( passed.hasOwnProperty( 'serialized64' ) ) {
                    try {
                        initialState = JSON.parse( Y.doccirrus.comctl.B64ToUTF8( passed.serialized64) );
                        //Y.log('Set initialstate: ' + JSON.stringify(initialState), 'debug', NAME);
                    } catch (parseErr) {
                        Y.log('Could not parse initial state of form: ' + parseErr, 'warn', NAME);
                    }

                }

                initialState = passed.hasOwnProperty( 'serialized' )  ? passed.serialized : initialState;

                //  legacy, deprecated
                if ( passed.hasOwnProperty('formId') ) { canonicalId = passed.formId; }             //  DEPRECATED
                if ( passed.hasOwnProperty('instanceId') ) { formVersionId = passed.instanceId; }   //  DEPRECATED
            }

            //  try load form from hash fragment
            if ( '' !== canonicalId && '' !== formVersionId ) {
                loadTemplate( canonicalId, formVersionId );
            } else {
                //$('#' + divId).html('No form instance Id given');
                Y.log( 'No form instance Id goven', 'info', NAME );
                loadTemplate( canonicalId, '' );
            }

            function FormEmbedVM() {
                var
                    self = this;

                self.btnPreviousI18n = i18n('FormEditorMojit.embed.BTN_PREVIOUS');
                self.btnNextI18n = i18n('FormEditorMojit.embed.BTN_NEXT');
                self.btnSubmitI18n = i18n('FormEditorMojit.embed.BTN_SUBMIT');
                self.btnPdfI18n = i18n('FormEditorMojit.embed.BTN_PDF');
            }

            ko.applyBindings( new FormEmbedVM(), document.querySelector( '#divFormsComposeFrame' ) );

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for forms_editor.js - ' + node.getAttribute('id'), 'debug', NAME);

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screws up future use of this DOM node, which we might need
            //node.destroy();
        }
    };

}
