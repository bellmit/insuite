/*
 *  Example of a bound embedded form
 *
 *  To use bound form, please note the required YUI modules, then embed the form as in loadBoundDocument(...)
 *
 *  'bindCollection' refers to an actual collection in the tenant's database, the name should be a schema available
 *  through the restcontroller.  Modify the loadDocuments method to print something sensible if you change the
 *  collection.
 *
 *  'currentId' is the database _id of the currently mapped object
 *
 *  'templateFile' refers to the name of the file in which the default, 'factory condition' version of the form is
 *  shipped - all users may have their own copy, which they might have modified.  The form which is loaded will be
 *  the user's current version.  If the user does not have a version of this form the FEM will attempt to create one
 *  from the default template.
 *
 *  Not shown in this example:
 *
 *  (*) Template events: events such as loading a template, navigating pages, etc can be listened for if you need to
 *      know what the user or embedded form are doing.
 */

/*global YUI, $ */

YUI.add('TestingMojitFormsBindingTest', function(Y, NAME) {

    'use strict';

	Y.log('YUI.add TestingMojitFormsBindingTest with NAMEs ' + NAME, 'info');

    /**
     *  Private members
     */

    var
        myNode,                                         //  make available to private methods
        templateCalendar = 'BindCalendar.form',         //  name of a FEM form
        templateRepetition = 'BindRepetition.form',     //  name of a FEM form
        //templateFile = 'inform1.form',                //  name of a default form
        currentCalendarIdx = -1,                        //  index of selected calendar
        currentRepetitionIdx = -1,                      //  index of selected entry
        maxEntries = 20,                                //  limit number of entires shown
        myCalendars = [],                               //  set of calendars for nav
        myRepetitions = [],                             //  set of entrie for nav
        currentForm = '';                               //  formId of currently loaded form

    /**
     *  Load the set of documents from the server, render as a list to the left of the form div
     */

    function loadCalendars() {

        function onFailure(errmsg) { Y.log('ERROR calendars list: ' + errmsg, 'warn', NAME); }

        function onSuccess(body) {
            var
                data = body && body.data;
            if ('string' === typeof data) { data = JSON.parse(data); }

            myCalendars = data;

            Y.log('Received calendar list: ' + JSON.stringify(data, undefined, 2) + ' items', 'debug', NAME);

            var
                i,
                html = ''; //'<h2>' + bindCollectionName + '</h2>';

            if (0 === data.length) {
                html = html + '<i>(no matching documents in db)</i>';
            }

            for (i = 0; i < data.length; i++) {

                html = html +
                 '<button class="btn btn-large" style="width: 100%; background-color: ' + data[i].color + ';" id="btnLoadcal' + i + '">' +
                 '<span id="spanCalName' + data[i]._id + '">' + data[i].name + '</span>'  + '<br/>' +
                 '<small><span id="spanCalType' + data[i]._id + '" style="background-color:' + data[i].color + ';">' + data[i].type + '</span></small>' +
                 '</button>' +
                 '<div style="height: 3px;"></div>';
            }

            $('#divCalendarList').html(html);

            for (i = 0; i < data.length; i++) { bindLoadButton(i, data[i]._id); }
        }

        function bindLoadButton(idx, id) {

            if (-1 === currentCalendarIdx) {
                currentCalendarIdx = idx;
                loadBoundDocument(templateCalendar, 'calendar', id);
            }

            $('#btnLoadcal' + idx).off('click.testbind').on('click.testbind', function() {
                currentCalendarIdx = idx;
                Y.log('Loading record: ' + id, 'info', NAME);
                loadBoundDocument(templateCalendar, 'calendar', id);
                loadRepetitions(id);
            });
        }

        $.ajax({
            type: 'GET',
            xhrFields: { withCredentials: true },
            url: Y.doccirrus.infras.getPrivateURL( '/1/calendar'),
            success: onSuccess,
            error: onFailure
        });
    }

    /**
     *  Load the set of entries in this calendar (max 20 for safety)
     *  @param calendarId
     */

    function loadRepetitions(calendarId) {

        function onFailure(errmsg) { Y.log('ERROR repeitions list: ' + errmsg, 'warn', NAME); }

        function onSuccess(data) {

            if ('string' === typeof data) { data = JSON.parse(data); }

            myRepetitions = data;

            Y.log('Received calendar entry list: ' + JSON.stringify(data, undefined, 2) + ' items', 'debug', NAME);

            var
                i,
                html = ''; //'<h2>' + bindCollectionName + '</h2>';

            if (0 === data.length) {
                html = html + '<i>(no entries recorded for this calendar)</i>';
            }

            for (i = 0; i < data.length; i++) {
                if (i < maxEntries) {
                    html = html +
                        '<button class="btn btn-large" style="width: 100%; background-color: ' + myCalendars[currentCalendarIdx].color + ';" id="btnLoadrep' + i + '">' +
                        '<span id="spanRepTitle' + data[i]._id + '">' + data[i].title + '</span><br/>' +
                        '<small>' +
                            data[i].start + '<br/>' +
                            data[i].end +
                        '</small>' +
                        '</button>' +
                        '<div style="height: 3px;"></div>';
                }
            }

            $('#divEntryList').html(html);

            for (i = 0; i < data.length; i++) {
                if (i < maxEntries) {
                    bindLoadButton(i, data[i]._id);
                }
            }
        }

        function bindLoadButton(idx, id) {

            $('#btnLoadrep' + idx).off('click.testbind').on('click.testbind', function() {
                Y.log('Loading record: ' + id, 'info', NAME);
                currentRepetitionIdx = idx;
                loadBoundDocument(templateRepetition, 'repetition', id);
            });
        }

        $.ajax({
            type: 'GET',
            xhrFields: { withCredentials: true },
            url: Y.doccirrus.infras.getPrivateURL( '/1/calevent?calendar,' + calendarId),
            success: onSuccess,
            error: onFailure
        });
    }

    /**
     *  Load a form template and bind to a database record
     *
     *  This is the crux of this example
     *
     *  @param templateFile
     *  @param collection
     *  @param id
     */

    function loadBoundDocument(templateFile, collection, id) {

        $('#divFormsEmbed').html('<div id="divFormsEmbedX"></div>');

        var formNode = myNode.one('#divFormsEmbedX');

        Y.log('Loading bound: ' + templateFile + ' --> ' + collection + '::' + id, 'info', NAME);

        //  NB: this property of node is used to pass configuration to embedded form / child binder
        //  The same pattern is used to configure other jadeLoaded views for FEM and MediaMojit

        formNode.passToBinder = {
            'formId': templateFile,
            'collection': collection,
            'id': id,
            'onFormEvent': onFormEvent
        };

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'forms_bind',
            'FormEditorMojit',
            { },
            formNode,
            function() {
                Y.log('Form loaded and bound', 'info', NAME);
            }
        );
    }

    /**
     *  Allows this binder to listen for events emitted by embedded form, and access the template and other objects
     *
     *  For example, you could tap 'onLoaded' to get a reference to the template for your own 'Render PDF' link, or
     *  listen to 'onSchemaSet' to check that the schema specified in the user's copy of the form matches what is
     *  expected by this binder.  One might update the menu at left as fields are changed in the form.
     *
     *  @param eventName
     *  @param eventData
     */

    function onFormEvent(eventName, eventData) {

        switch(eventName) {

            //  keep track of which form is displayed
            case 'onFormLoaded':
                currentForm = eventData.formId;
                Y.log('Current form is ' + currentForm, 'debug', NAME);
                break;

            //  update UI when data is changed by user
            case 'onMappedObjectStored':
                if (currentForm === 'BindCalendar.form') {
                    $('#spanCalName' + eventData._id).html(eventData.name);
                    $('#spanCalType' + eventData._id).html(eventData.type);
                }

                if (currentForm === 'BindRepetition.form') {
                    $('#spanRepTitle' + eventData._id).html(eventData.title);
                }

                break;

            default:
                Y.log('Ignoring form event: ' + eventName);
                break;
        }

    }

    /**
     *  Test opening a second form in a modal
     */

    function popupFormModal() {

        function onModalFormEvent(eventName /*, eventData */) {
            Y.log('Event raised by form in modal: ' + eventName, 'debug', NAME);
        }

        function onModalReady(){

            var formSettings = {
                divId: 'divModalTest',
                formId: 'forms_Test_Start.form',                //  formID corresponds to template filename
                formVersion: 1,                                 //  bind to a specific version of this form
                ownerCollection: 'test',                        //  owner of any generated PDFs or submissions
                ownerId: 'test',                                //  owner of any generated PDFs or submissions
                onFormEvent: onModalFormEvent,                  //  callback for template events
                setWidth: 538                                   //  bootstrap 3 modals don't expand by default
            };

            Y.doccirrus.comctl.setModalAlert('');
            Y.doccirrus.formloader.addFormToDiv( formSettings );

        }

        Y.doccirrus.comctl.setModal(
            'Form in Modal Test',
            '<div id="divModalTest" />',
            null,
            null,
            onModalReady
        );

        //  test
    }

    /**
     * Constructor for the TestingMojitFormsBindingTest class.
     *
     * @class TestingMojitFormsBindingTest
     * @constructor
     */

    Y.namespace('mojito.binders')[NAME] = {

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */

        init: function(mojitProxy) {
            this.mojitProxy = mojitProxy;
        },

        /**
         *	The binder method, invoked to allow the mojit to attach DOM event
         *	handlers.
         *
         *	@param node {Node} The DOM node to which this mojit is attached.
         */

        bind: function(node) {
            Y.log('Binding test form');
            this.node = node;
            myNode = node;

            //  Boilerplate to set the translation dictionary
            //  Note that this is on the way out, as most internationalization is now done server-side by the jadeLoader
            //  For now there are still YUI components which use this

            Y.Intl.setLang('FormEditorMojit', $('#YUI_SERVER_LANG').val());
            Y.log('Set language from hidden element: ' + Y.Intl.getLang('FormEditorMojit'), 'info', NAME);
            Y.dcforms.il8nDict = Y.Intl.get('FormEditorMojit');

            //  Load the set of documents to make a crude nav

            loadCalendars();

            $('#btnPopupForm').off('click').on('click', function() { popupFormModal(); });
        }


    };

},
'0.0.1',
{
    requires: [
        'dcforms-utils',
        'dcforms-reducedschema',
        'dcforms-template',
        'dcforms-formstree',
        'dcforms-categories',
        'dcforms-pdf',
        'dcformloader',
        'event-mouseenter',
        'mojito-client',
        'intl',
        'mojito-intl-addon',
        'mojito-rest-lib'
    ]
}
);
