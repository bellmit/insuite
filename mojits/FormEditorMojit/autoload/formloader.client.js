/**
 * User: rrrw
 * Date: 11.12.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';

/*jslint anon:true, nomen:true */
/*global YUI, $ */
YUI.add( 'dcformloader', function( Y, NAME ) {

        function FormLoader() {
            //  need something in the body to pass JSHint
            Y.log('Creating formloader helper object.', 'debug', NAME);
        }

        /**
         *  Load a form and controls into a DOM node on the page
         *
         *  @method addFormToDiv
         *  @param settings {Object}    Configures the form to load, object to map and events to pass back to caller
         *  @param callback {Function}  Called when for is loaded
         */

        FormLoader.prototype.addFormToDiv = function( settings, callback ) {
            var
                formNode;

            if( !settings.id ) {
                Y.log( 'Form no data id, will be empty', 'debug' );
            }
            
            if(( !settings.divId ) && ( !settings.embedDivId )) {
                Y.log( 'Embed div not given in settings: assuming "boundFormDiv"', 'debug', NAME );
                settings.embedDivId = 'boundFormDiv';
            }

            if ( !settings.embedDivId ) {
                settings.embedDivId = settings.divId;
                Y.log( 'passing embed div: ' + settings.embedDivId, 'debug', NAME );
            }

            if( !settings.renderDivId ) {
                Y.log( 'PDF rending div not given in settings, creating one', 'debug', NAME );
                settings.renderDivId = 'divFormsRender';
                $("body").append($('<div id="' + settings.renderDivId + '"/>'));
            }

            if( !settings.initialMode ) {
                Y.log( 'PDF rending div not given in settings, creating one', 'debug', NAME );
                settings.initialMode = 'fill';
            }

            settings.embedDivId = settings.embedDivId.replace('#', '');
            settings.renderDivId = settings.renderDivId.replace('#', '');

            if (!$('#' + settings.embedDivId).length) {
                Y.log('No such DOM ID, #' + settings.embedDivId + ', cannot render form.', 'warn', NAME);
                return;
            }

            formNode = Y.one( '#' + settings.embedDivId );

            if (settings.formId) {                              //  deprecated
                settings.canonicalId = settings.formId;         //  current
            }

            if (settings.templateFile) {
                settings.formId = settings.templateFile;        //  deprecated
                settings.canonicalId = settings.templateFile;   //  current
            }

            if( !settings.canonicalId) {
                Y.log( 'No form to load, please set canonicalId and formVersionId', 'warn' );
                callback( new Error('Invalid formId: ' + settings.formId) );
                return;
            }

            if (!settings.ownerCollection) {
                settings.ownerCollection = settings.collection;
            }

            if (!settings.ownerId) {
                settings.ownerId = settings.id;
            }

            if (!settings.formVersionId) {
                settings.formVersionId = '';
            }

            Y.log('Rendering form into div: ' + settings.embedDivId, 'debug', NAME);

            formNode.passToBinder = {
                //  which form to open
                'formId': settings.formId,          //  deprecated
                'canonicalId': settings.canonicalId,
                'formVersionId': settings.formVersionId,
                //  model and id of object to map
                'collection': settings.model,
                'id': settings.id,

                //  object which owns any generated PDFs or submitted forms
                'ownerCollection': settings.ownerCollection,
                'ownerId': settings.ownerId,

                //  where to render the form
                'embedDivId': settings.embedDivId,
                'renderDivId': settings.renderDivId,
                'initialMode': settings.initialMode,
                'bfbRedirect': (settings.bfbRedirect || false),
                'bfbHide': (settings.bfbHide || false)
            };

            if (settings.formVersion) {
                formNode.passToBinder.formVersion = settings.formVersion;
            }

            if (settings.onFormEvent) {
                formNode.passToBinder.onFormEvent = settings.onFormEvent;
            }

            if (settings.viewModel) {
                formNode.passToBinder.viewModel = settings.viewModel;
            }

            if (settings.setWidth) {
                formNode.passToBinder.setWidth = settings.setWidth;
                Y.log('Set default width of form: ' + settings.setWidth, 'debug', NAME);
            }

            if (settings.onLoad) {
                formNode.passToBinder.onLoad = settings.onLoad;
            }

            //  set language as of this moment (can be changed by page_
            Y.Intl.setLang( 'FormEditorMojit', $( '#YUI_SERVER_LANG' ).val() );
            if( Y.config.debug ) {
                Y.log( 'Set language from hidden element: ' + Y.Intl.getLang( 'FormEditorMojit' ), 'info', NAME );
            }

            function onFormBound() {
                Y.log( 'Form loaded and bound', 'info', NAME );
                if (callback) { return callback(); }
            }

            function onDictLoaded(err, dict) {
                if (err) {
                    Y.dcforms.il8nDict = Y.Intl.get( 'FormEditorMojit' );
                } else {
                    Y.dcforms.il8nDict = dict;
                }

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'forms_bind',
                    'FormEditorMojit',
                    { },
                    formNode,
                    onFormBound
                );
            }

            //Y.doccirrus.comctl.getIl8nDict('FormEditorMojit', onDictLoaded);
            onDictLoaded(null, Y.Intl.get( 'FormEditorMojit' ));
        };

        //  Boilerplate to set the translation dictionary
        //  Note that this is on the way out, as most internationalization is now done server-side by the jadeLoader
        //  For now there are still YUI components which use this

        Y.Intl.setLang( 'FormEditorMojit', $( '#YUI_SERVER_LANG' ).val() );
        if( Y.config.debug ) {
            Y.log( 'Set language from hidden element: ' + Y.Intl.getLang( 'FormEditorMojit' ), 'info', NAME );
        }
        Y.dcforms.il8nDict = Y.Intl.get( 'FormEditorMojit' );

        //  Add formLoader to the namespace

        var
            formLoaderObj;

        formLoaderObj = new FormLoader();

        Y.namespace( 'doccirrus' ).formloader = formLoaderObj;

    },
    '0.0.1', {requires: [
        'dcforms-utils',
        'dcforms-reducedschema',
        'dcforms-template',
        'dcforms-categoriesselect',
        'dcforms-pdf',
        'dcforms-roles',
        'dcformloader',

        'dcforms-map-casefile',
        'dcforms-map-docletter',
        'dcforms-map-invoice',
        'dcforms-map-pubreceipt',
        'dcforms-map-prescription',
        'dcforms-map-patient',
        'dcforms-map-infotree',
        'dcforms-map-incase',

        'event-mouseenter',
        'mojito-client',
        'intl',
        'mojito-intl-addon',
        'mojito-rest-lib'
    ]}
);
