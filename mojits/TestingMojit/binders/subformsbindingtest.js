/*
 *  Example of a bound embedded subform
 */

/*global YUI, $, jQuery */

YUI.add('TestingMojitSubFormsBindingTest', function(Y, NAME) {

    'use strict';

	Y.log('YUI.add TestingMojitSubFormsBindingTest with NAMEs ' + NAME, 'info');

     /**
     *  Make a space-padded string of the given size
     */

    function strLimit(txt, limit) {

        var i;

        txt = jQuery.trim(txt);

        for (i = 0; i < limit; i++) {
            txt = txt + ' ';
        }

        txt = txt.substring(0, limit);
        txt = txt.replace(new RegExp(' ', 'g'), '&nbsp;');
        return txt;
    }


    /**
     *  Private members
     */

    var
        myNode,                                         //  make available to private methods
        jqCache = {},                                   //  cached jQuery selectors
        templateId = 'SubFormTest.form',                //  name of a FEM form
        maxEntries = 20,                                //  limit number of entires shown
        patients = [],                                  //  set of entries for nav
        formTemplate,                                   //  embedded form
        patientIdx = -1,                                //  index of selected patient object

        subformData = {
            'line1': strLimit('Testort-Musterkrankenkas 12345', 30),
            'line2': strLimit('Mustermmann-Muller', 30),
            'line3': strLimit('Prof. Michael-Marti   20.10.25', 30),
            'line4': strLimit('Musterweg 6', 30),
            'line5': strLimit('1234567 Musterhausen     12/10', 30),
            'line6': strLimit('1234567 123456789012 1234 9', 30),
            'line7': strLimit('123456789 123456499  01.07.08', 30)
        },

        dataUrl = '/1/patient?itemsPerPage=' + maxEntries + '&page=1&sort=lastname,1';

    /**
     *  Load the set of documents from the server, render as a list to the left of the form div
     */

    function loadPatients() {
        Y.doccirrus.comctl.privateGet(dataUrl, {}, onLoadPatients);
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

    function loadForm(templateFile, collection, id) {

        $('#divFormsEmbed').html('<div id="divFormsEmbedX"></div>');

        var formNode = myNode.one('#divFormsEmbedX');

        Y.log('Loading bound: ' + templateId + ' --> ' + collection + '::' + id, 'info', NAME);

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

    //  EVENT HANDLERS

    /**
     *
     *  @param  err     {String}    Error message
     *  @param  data    {Object}    Array of patient objects
     */

    function onLoadPatients(err, body) {
        var
            data = body && body.data;

        Y.log('Received patient list: ' + JSON.stringify(data, undefined, 2) + ' items', 'debug', NAME);
        patients = data;

        var
            i,
            jqPatientDiv = $('#divPatientList');

        function bindLoadButton(idx, id) {

            $('#btnLoadPatient' + idx).off('click.testbind').on('click.testbind', function() {
                Y.log('Loading record: ' + id, 'info', NAME);
                onPatientSelected(idx);
            });
        }

        if (err) {
            jqPatientDiv.html('Could not load pateints:<br/>' + err);
            return;
        }

        jqPatientDiv.html( (0 === data.length) ? '<i>(no patient records in db)</i>' : '');

        for (i = 0; i < data.length; i++) {

            jqPatientDiv.append(
                '<button class="btn btn-large" style="width: 100%;" id="btnLoadPatient' + i + '">' +
                    '<span id="spanPatientName' + data[i]._id + '">' +
                        data[i].talk + ' ' + data[i].firstname + ' ' + data[i].lastname +
                    '</span>'  + '<br/>' +
                    '<small><span id="spanPatient' + data[i]._id + '">' +
                        data[i].gender + ' ' + (data[i].hasOwnProperty('dob') ? data[i].dob : '') +
                    '</span></small>' +
                '</button>' +
                '<div style="height: 3px;"></div>'
            );

            bindLoadButton(i, data[i]._id);
        }

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
                Y.log('Form loaded: ' + eventData.formId, 'info', NAME);
                formTemplate = eventData;
                onMapClick();
                break;

            //  update UI when data is changed by user
            case 'onMappedObjectStored':
                Y.log('Mapped object stored.', 'debug', NAME);
                break;

            case 'onFormValueChanged':
                onUnmapClick();
                break;

            case 'onSubformLoaded':
                formTemplate.map({ 'patient': subformData }, true);
                break;

            default:
                Y.log('Ignoring form event: ' + eventName);
                break;
        }

    }

    function onMapClick() {
        var
            patient = {},
            insurance = {},
            address = {},
            employee = {},
            location = {},

            formData = {
                'activityId': jqCache.txtActivityId.val(),
                'total': jqCache.txtTotal.val()
            };

        function onEmployeeLoaded(err, response) {
            var
                data = response && response.data;

            if ((!err) && (data.length > 0)) {
                employee = data;
            }
            Y.doccirrus.comctl.privateGet('/1/location/000000000000000000000001', {}, onLocationLoaded);

        }

        function onLocationLoaded(err, data) {
            data = data.data || data;
            if ((!err) && (data.length > 0)) {
                location = data;
            }

            location.commercialNo = location.commercialNo ? location.commercialNo : '';

            doMap();
        }

        function doMap() {

            formData.patient = {
                'line1': strLimit(subformData.insuranceName, 24) + '&nbsp;' + strLimit(subformData.abrechnungsVKNR, 5),
                'line2': strLimit(patient.lastname, 30),
                'line3': strLimit(patient.title + ' ' + patient.firstname + ' ' + patient.middlename, 19) + '&nbsp;&nbsp;&nbsp;' + subformData.dobDotted,
                'line4': strLimit(address.street + ' ' + address.houseno, 30),
                'line5': strLimit(address.zip + ' '+ address.city, 24) + '&nbsp;' + subformData.validDate,
                'line6': strLimit(insurance.insuranceNo, 7) + '&nbsp;' + strLimit(insurance.insuranceId, 11) + '&nbsp;' + strLimit(insurance.insuranceStatus, 3),
                'line7': strLimit(location.commercialNo, 9) + '&nbsp;' + strLimit(subformData.doctorNo, 9) + '&nbsp;&nbsp;' + subformData.transactionDate
            };

            formTemplate.map(formData, true);
        }

        if (-1 !== patientIdx) {
            patient = patients[patientIdx];

            //  add address, insurance, etc, here

            subformData = {
                'insuranceName': 'Testort-Musterkrankenkaslongerthan',
                'abrechnungsVKNR': '123456789',
                'dob': '20.10.25',
                'transactionDate': '01.07.08',
                'validDate': '12/10',
                'doctorNo': '123456499',
                'dobDotted': ''
            };

            if (!patient.firstname) { patient.firstname = ''; }
            if (!patient.middlename) { patient.middlename = ''; }
            if (!patient.lastname) { patient.lastname = ''; }

            if (patient.dob) { subformData.dobDotted = '10.12.XX'; }

            if (patient.hasOwnProperty('addresses') && (patient.addresses.length > 0)) {
                address = patient.addresses[0];
            }

            if (patient.hasOwnProperty('addresses') && (patient.addresses.length > 0)) {
                address = patient.addresses[0];
            }
            if (!address.houseno) { address.houseno = ''; }
            if (!address.street) { address.street = ''; }
            if (!address.zip) { address.city = ''; }
            if (!address.city) { address.zip = ''; }

            Y.doccirrus.comctl.privateGet('/1/employee/51a59b73353246fd58507a38', {}, onEmployeeLoaded);
        }

    }

    function onUnmapClick() {
        var formData = formTemplate.unmap();

        Y.log('Unmapped form data: ' + JSON.stringify(formData, undefined, 2), 'debug', NAME);

        jqCache.txtActivityId.val(formData.activityId);
        jqCache.txtTotal.val(formData.total);

    }

    function onScaleClick() {
        var scaleData = {
            'line1': '123456789012345678901234567890',
            'line2': '123456789012345678901234567890',
            'line3': '123456789012345678901234567890',
            'line4': '123456789012345678901234567890',
            'line5': '123456789012345678901234567890',
            'line6': '123456789012345678901234567890',
            'line7': '123456789012345678901234567890'
        };
        formTemplate.map({ 'patient': scaleData}, true);
    }

    function onPatientSelected(index) {
        patientIdx = index;

        jqCache.divPatientMeta.html(
            'name: ' + patients[index].firstname + ' ' + patients[index].lastname + '<br/>' +
            'insurance: none'
        );

        Y.log('selected patient: ' + JSON.stringify(patients[index]), undefined, 2);

        onMapClick();
    }

    /**
     * Constructor for the TestingMojitSubFormsBindingTest class.
     *
     * @class TestingMojitSubFormsBindingTest
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

            //  Load the form and a set of patients to map into subform
            loadForm(templateId, 'test', 'test');
            loadPatients();

            //  Get controls

            jqCache = {
                'btnMap': $('#btnMap'),
                'btnUnmap': $('#btnUnmap'),
                'btnScale': $('#btnScale'),
                'txtActivityId': $('#txtActivityId'),
                'txtTotal': $('#txtTotal'),
                'divPatientMeta': $('#divPatientMeta')
            };

            //  Bind controls

            jqCache.btnMap.on('click', onMapClick);
            jqCache.btnUnmap.on('click', onUnmapClick);
            jqCache.btnScale.on('click', onScaleClick);

            jqCache.txtActivityId.on('keyup', onMapClick);
            jqCache.txtTotal.on('keyup', onMapClick);


            var imagesNode = Y.one('#uploadarea');

            function onMediaChanged(data) {
                Y.log('media changed: ' + JSON.stringify(data, undefined, 2), 'info', NAME);
            }

            function onMediaAdded(mediaId) {
                Y.log('Created new attachment: ' + mediaId, 'info', NAME);
            }

            function onMediaRemoved(mediaId) {
                Y.log('Deleted attachment: ' + mediaId, 'info', NAME);
            }

            imagesNode.passToBinder = {
                'onChange': onMediaChanged,
                'onAdd': onMediaAdded,
                'onRemove': onMediaRemoved,
                'ownerId': 'test',
                'ownerCollection': 'test',
                'label': '',
                'widthPx': 120,
                'heightPx': 120
            };

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'list_attachments',
                'MediaMojit',
                {},
                imagesNode,
                function(){
                    Y.log('Embedded media attachmennts', 'info', NAME);
                }
            );


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
