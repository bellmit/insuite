'use strict';

/**
 *  Renders a series of invoice forms and adds them to a zip file for download, see MOJ-2068
 *
 *  Originally this was intended to render batches of activities of any type, at present it renders INVOICE type
 *  activities.
 *
 *  @author strix
 */

/*jslint latedef:false */
/*global YUI, $, moment, ko */

YUI.add( 'dcbatchpdfzip', function( Y, NAME ) {

        Y.namespace( 'doccirrus.uam' );

        /**
         *  Displays the progress modal and renders all invoices into a zip
         *
         *  The format of the invoiceData parameter should be an array of objects of the form:
         *
         *      {
         *          'patientId': '123465890',   //  database _id of patient
         *          'activities': [
         *              '0987654321',           //  database _id of patient invoice activities
         *              '5432109876'            //  ... etc ...
         *          ]
         *      }
         *
         *  @param  invoiceData     {Object}    As described above
         *  @param  quarter         {String}    Number of quarter (1|2|3|4) to which schein applies
         *  @param  year            {String}    Year to which schein applies YYYY
         *  @param  callback        {Function}  Of the form fn(err, zipId)
         */

        function createActivityPDFZip(invoiceData, quarter, year, callback) {

            var
                zipId = '',
                canonicalId,
                formVersionId,
                patientsToProcess = [],
                activitiesToProcess = [],
                currentPatientId,
            //    currentActivityId,
                currentPatient,
            //    currentActivity,
            //    currentForm,
                jqProgress,
                jqStatus,
                progressAt = 0,
                progressMax = 0;

            /*
             *  Create the modal window in which the progress is to be displayed
             */

            //  TODO: replace with DCWindow and i18n
            Y.doccirrus.comctl.setModal(
                'Patientenquittung erzeugen',
                '<div id="divRenderStatus">Erstelle Archiv</div><div id="divRenderProgress"></div>',
                false,
                null,
                onModalReady
            );

            /**
             *  Once the modal window has been created:
             *
             *  (-) initialize progress bar and notification areas
             *  (-) request a new archive be created on the server
             *
             *  This should call back with the handle to an archive on the server.  The archive is a folder in which
             *  rendered PDFs are stored temporarily: after they are rendered but before being downloaded
             */

            function onModalReady() {
                //  count tasks to be shown in the progress bar
                var i, j;

                progressMax = progressMax + 1;      //  create zip
                progressMax = progressMax + 1;      //  look up form
                progressMax = progressMax + 1;      //  look up version

                for (i = 0; i < invoiceData.length; i++) {

                    if (!invoiceData[i].patientId || !invoiceData[i].activities) {
                        callback('Invalid data sent.');
                        return;
                    }

                    patientsToProcess.push(invoiceData[i].patientId);
                    progressMax = progressMax + 1;      //  load patient

                    for (j = 0; j < invoiceData[i].activities.length; j++) {
                        progressMax = progressMax + 1;  //  render activity
                    }
                }

                jqProgress = $('#divRenderProgress');
                jqStatus = $('#divRenderStatus');

                jqStatus.html('Erstelle Zip-Archive...');
                Y.doccirrus.comctl.privateGet('/1/media/:createzip', {}, onZipCreated);
            }

            /**
             *  Redraw the progress bar as data is loaded and PDFs are generated
             */

            function updateProgress() {
                var progress = Math.floor((progressAt / progressMax) * 100);

                jqProgress.html(
                    '<div class="progress ">' +
                        '<div ' +
                        'class="progress-bar" ' +
                        'role="progressbar" ' +
                        'aria-valuenow="' + progress + '" ' +
                        'aria-valuemin="0" ' +
                        'aria-valuemax="100" ' +
                        'style="width: ' + progress + '%;">' +
                        '<span class="sr-only">' + progress + '% Komplett</span>' +
                        '</div>' +
                        '</div>'
                );
            }

            /**
             *  Once the zip has been created on the server we look up the current invoice form
             *
             *  @param err
             *  @param newZipId
             */

            function onZipCreated(err, newZipId) {
                if (err) {
                    callback('Konnte Archiv nicht erstellen: ' + err);
                    return;
                }

                zipId = newZipId;

                progressAt = progressAt + 1;
                updateProgress();

                jqStatus.html('Lade Formular...');
                Y.dcforms.getConfigVar('', 'casefile-patientreciept', false, onFormKeyLookup);
            }

            /**
             *  Raised once the canonical PUBRECEIPT form _id has been found in the form roles / config
             *  We then request the 'meta', a summary of the form which will include the _id of the current
             *  version of this form.
             *
             *  @param  err                 {String}    null unless there was a problem
             *  @param  foundCanonicalId    {String}    Database _id of canonical INVOICE form
             */

            function onFormKeyLookup(err, foundCanonicalId) {

                canonicalId = foundCanonicalId;
                formVersionId = '';

                if (err) {
                    //  translateme: PLease set default form for formConfigKey activity type
                    Y.doccirrus.comctl.setModal(
                        'Hinweis',
                        'Es wurde noch kein Formular für diesen Aktivitätstyp konfiguriert.',
                        true
                    );
                    callback('Formular für Patientenquittung nicht gefunden');
                    return;
                }

                progressAt = progressAt + 1;
                updateProgress();

                jqStatus.html('Lade neuste Formular-Version...');
                Y.dcforms.getFormListing('', foundCanonicalId, onFormMetaLoaded);
            }

            /**
             *  Raised once additional details of the current PUBRECEIPT for have been loaded
             *
             *  @param  err         {String}    null unless there was a problem
             *  @param  formMeta    {Object}    Compressed summary of PUBRECEIPT form
             */

            function onFormMetaLoaded(err, formMeta) {
                if (err) {
                    callback('Formular nicht gefunden: ' + err);
                }

                formVersionId = formMeta.latestVersionId;
                progressAt = progressAt + 1;
                updateProgress();

                jqStatus.html('Suche nach Formular ist abgeschlossen.');
                processNextPatient();
            }

            /**
             *  This will load the record of the next patient in the dataset and render each invoice for that patient
             *  The purpose of loading the patient object is to use their name for PDF files
             */

            function processNextPatient() {

                if (0 === patientsToProcess.length) {
                    //  all done
                    callback(null, zipId);
                    return;
                }

                //alert('process next patient');

                //  set the current patient id
                currentPatientId = patientsToProcess.pop();
                activitiesToProcess = [];

                //  make list of activities to render for this patient
                var i, j;
                for (i = 0; i < invoiceData.length; i++) {
                    if (currentPatientId === invoiceData[i].patientId) {
                        for (j = 0; j < invoiceData[i].activities.length; j++) {
                            activitiesToProcess.push(invoiceData[i].activities[j]);
                        }
                    }
                }

                //  load the expanded patient object
                Y.doccirrus.comctl.privateGet( '/1/patient/' + currentPatientId, {}, onPatientLoaded );

                function onPatientLoaded(err, body) {
                    var
                        result = body && body.data;
                    if (err || 0 === result.length) {
                        callback('Konnte Patientendaten nicht laden: ' + err);
                        return;
                    }

                    currentPatient = result[0];
                    jqStatus.html('Bearbeite Patient: ' + currentPatient.firstname + ' ' + currentPatient.lastname);

                    progressAt = progressAt + 1;
                    updateProgress();
                    processNextActivity();
                }

            }

            /**
             *  Render next activity in the queue (on server) and save the resulting PDF to the archive directory
             */

            function processNextActivity() {

                if (0 === activitiesToProcess.length) {
                    Y.log('done with patient');
                    processNextPatient();
                    return;
                }

                var
                    ts = new Date().getTime(),

                    pdfName = '' +
                        currentPatient.firstname + ' ' + currentPatient.lastname + '.' +
                        activitiesToProcess.length + '.' +
                        ts + '.pdf',

                    nextActivityId = activitiesToProcess.pop();

                jqStatus.html('Bearbeite Patient: ' + currentPatient.firstname + ' ' + currentPatient.lastname + ' (' + activitiesToProcess.length + ')');
                progressAt = progressAt + 1;
                updateProgress();

                Y.doccirrus.comctl.privatePost(
                    '/1/formtemplate/:makepdf',
                    {
                        'formId': canonicalId,
                        'formVersionId': formVersionId,
                        'mapper': 'PubReceipt_T',
                        'mapCollection': 'activity',
                        'mapObject': nextActivityId,
                        'saveTo': 'zip',
                        'zipId': zipId,
                        'preferName': pdfName
                    },
                    onPDFRender
                );
            }

            /**
             *  Called after pdf has been rendered on server
             */

            function onPDFRender(err, newMediaId) {
                if (err) {
                    Y.log('Problem rendering PDF: ' + JSON.stringify(err), 'debug', NAME);
                    return;
                }

                if( Y.config.debug ) {
                    Y.log('Created PDF: ' + JSON.stringify(newMediaId), 'debug', NAME);
                }

                processNextActivity();
            }

            /*
            function onPDFRendered(err, newMediaId) {
                if (err) {
                    callback('Konnte PDF nicht erstellen: ' + JSON.stringify(err));
                    return;
                }

                progressAt = progressAt + 1;
                updateProgress();

                Y.log('Rendered PDF: ' + newMediaId);
                if( currentForm && 'function' === currentForm.destroy ) {
                    currentForm.destroy();
                }
                currentForm = {};

                $('#divFormRender').html('');
                $('#divPDFRender').html('');

                processNextPatient();
            }
            */

            /*
            function onFormLoaded(template) {
                var
                    ts = new Date().getTime(),
                    pdfName = currentPatient.firstname() + ' ' + currentPatient.lastname() + '.' + ts + '.pdf',
                    hasReMapped = false;

                function onDomRender(err) {
                    if (err) {
                        callback('Erstellung ist fehlerhaft: ' + err);
                    }

                    if (false === hasReMapped) {
                        //  mapping is complete, re-rendering to allow elements to create overflow pages
                        Y.log('Mapper has instantiated', 'warn', NAME);
                        hasReMapped = true;
                        Y.log('(re)mapping for: ' + currentPatient.firstname() + ' ' + currentPatient.lastname(), 'debug', NAME);
                        currentForm.setMode('pdf', onModeSet);

                    }
                }

                function onModeSet(err) {
                    if (err) {
                        Y.log('Could not set PDF mode: ' + err, 'warn', NAME);
                        return;
                    }
                    currentForm.render(onSecondRender);
                }

                function onSecondRender(err) {
                    if (err) {
                        Y.log('Could not set PDF mode: ' + err, 'warn', NAME);
                        return;
                    }
                    currentForm.render(onMapped);
                }

                function onMapped(err) {

                    if (err) {
                        Y.log('Could not (re)map form: ' + err, 'warn', NAME);
                        return;
                    }

                    progressAt = progressAt + 1;
                    updateProgress();

                    Y.log('rendering for ' + currentPatient.firstname(), 'info', NAME);
                    currentForm.renderAllPDF('divPDFRender', zipId, pdfName, onPDFRendered);
                }

                function onFormEvent(eventName) {
                    Y.log('Legacy form event after render: ' + eventName, 'warn', NAME);
                }

                currentForm = template;
                currentForm.onBinderEvent = onFormEvent;

                progressAt = progressAt + 1;
                updateProgress();

                //  rendering into the page gaves the mappers a chance to generate overflow pages before we render PDF
                currentForm.render(onDomRender);
            }
            */
            /*
            function loadAndMapForm( canonicalId, formVersionId ) {
                // should load an embedded form prefilled with the patient/activity details

                //  Called when jade has embedded the FEM FORM
                //  @param  err     {String}    Error message
                //

                function onJadeLoadOfTemplate( err ) {
                    if( err ) {
                        Y.log( 'Problem jadeLoading bound form: ' + err, 'warn', NAME );
                        return;
                    }
                    Y.log( 'jade reports form is loaded', 'debug', NAME );
                }

                //  rendering form into hidden div will mess up element positions, hide the throbber if necessary
                $('#activityLoading').hide();
                $('#casefileDetail').show();

                if (!formVersionId) {
                    formVersionId = '';
                }

                var
                    formSettings = {
                        divId: 'divFormRender',
                        canonicalId: canonicalId,                       //  master / latest version - formtemplate (editable)
                        formVersionId: formVersionId,                   //  specific formtemplateversion to display (read only)
                        model: 'activity',                              //  collection in db
                        id: currentActivityId,                          //  _id of something in this collection
                        ownerCollection: 'activities',                  //  owner of any generated PDFs or submissions
                        ownerId: currentActivityId,                     //  owner of any generated PDFs or submissions
                        viewModel: currentActivity,                     //  may be used by mappers
                        setWidth: $( '#divFormRender' ).width(),        //  hidden div, width cannot be determined by for on load
                        //  onFormEvent: onBoundFormEvent,              //  callback for template events (no longer used)
                        onLoad: onFormLoaded                            //  run when template has initialized
                    };

                Y.doccirrus.formloader.addFormToDiv( formSettings, onJadeLoadOfTemplate );
            }
            */





        }

        Y.doccirrus.uam.createActivityPDFZip = createActivityPDFZip;

        /**
         *  Wrapper to create and render PUBRECEIPT activities to disk
         *
         *  Summary:
         *
         *      (-) Look up form currently assigned to the PUBRECEIPT role
         *      (-) Look up the current Employee for logging / event attribution purposes
         *      (-) Load the patient object from the server and instantiate as KO viewmovel
         *      (-) load all of the treatments from server and instantiate as KO models
         *      (-) Create a new PUBRECEIPT activity and link it to all treatments
         *      (-) Save and Approve the PUBRECEIPT activity (FSM transitions)
         *      (-) Render to PDF on server, add PDF to zip
         *      (-) call back
         *
         *  Note: this sets the uam currentPatient and currentActivity, should probably not be used from
         *  CaseFile for this reason.
         *
         *  @param  zipId           {String}    Open zip archive id
         *  @param  patientId       {String}    Database _id of current patient
         *  @param  caseFolderId    {String}    Database _id of current caseFolder
         *  @param  treatmentIds    {Object}    Array of treatment _id strings
         *  @param  quarter         {String}    Number of quarter (1|2|3|4) to which schein applies
         *  @param  year            {String}    Year to which schein applies YYYY
         *  @param  callback        {Function}  Of the form fn(err, zipId)
         */

        function createPRActivityPDFZip(zipId, patientId, caseFolderId, treatmentIds, quarter, year, callback) {

            var
                username,
                role = 'casefile-patientreciept',
                canonicalId,
                formVersionId,
                currentEmployee,
                currentPatient,
                currentActivity,
                linkedActivities;

            lookupFormByRole(role, onFormLookup);

            function onFormLookup(err, hasCanonicalId, hasFormVersionId) {
                if (err) {
                    Y.log('Could not find form assigned to PUBRECEIPT activities', 'debug', NAME);
                    callback(err);
                    return;
                }

                canonicalId = hasCanonicalId;
                formVersionId = hasFormVersionId;

                username =  Y.doccirrus.auth.getUserId();
                Y.doccirrus.comctl.privateGet('/1/employee/:getEmployeeForUsername', {'username': username}, onEmployeeLoaded);

            }

            function onEmployeeLoaded(err, result) {
                if (err || !result.data || !result.data._id) {
                    //  should not happen
                    Y.log('Could not load current employee - not logged in?', 'warn', NAME);
                    return;
                }
                //  store it
                Y.doccirrus.uam.loadhelper.set( 'currentEmployee', result.data );
                currentEmployee = result.data;
                //  load the expanded patient object
                Y.doccirrus.comctl.privateGet( '/1/patient/' + patientId, {}, onPatientLoaded );
            }

            function onPatientLoaded(err, body) {
                var
                    result = body && body.data;

                if (err || 0 === result.length) {
                    callback('Konnte Patientendaten nicht laden: ' + err);
                    return;
                }

                currentPatient = new Y.doccirrus.uam.PatientModel( result[0] );
                Y.doccirrus.uam.loadhelper.set( 'currentPatient', currentPatient );

                Y.log('Bearbeite Patient: ' + currentPatient.firstname() + ' ' + currentPatient.lastname(), 'debug', NAME);

                Y.log('creating activity with ' + treatmentIds.length + ' treatments', 'debug', NAME);
                getAllActivities(treatmentIds, onLinkedActivitiesLoaded);
            }

            function onLinkedActivitiesLoaded(err, newLinkedActivities) {
                if (err) {
                    Y.log('Could not load linked activityes: ' + JSON.stringify(err), 'warn', NAME);
                    callback('Konnte verbundene Einträge nicht laden: ' + err);
                    return;
                }

                var
                    linkedActivitiy,
                    checkLink,
                    newActivity = {
                        '_id': null,
                        'actType': 'PUBRECEIPT',
                        'status': 'CREATED',
                        'timestamp': moment().utc().toJSON(),
                        'activities': treatmentIds,
                        'patientId': patientId,
                        'formId': canonicalId,
                        'formVersion': formVersionId,
                        'caseFolderId': caseFolderId,
                        'employeeId': getEmployeeId()
                    }, i;

                currentActivity = new Y.doccirrus.uam.ActivityModel( newActivity );
                linkedActivities = newLinkedActivities;

                for (i = 0; i < linkedActivities.length; i++) {
                    linkedActivitiy = new Y.doccirrus.uam.ActivityModel( linkedActivities[i] );
                    checkLink = currentActivity._linkActivity(linkedActivitiy);

                    if (false === checkLink) {
                        //  could not link entries
                        callback('Konnte Einträge nicht verbinden: ' + linkedActivities[i]._id);
                        return;
                    }

                }

                currentActivity._hash = currentActivity._getHash();
                Y.doccirrus.uam.loadhelper.set( 'currentActivity', currentActivity  );

                currentActivity._save(null, onSaveSuccess, onSaveFailure);
                //loadAndMapForm(canonicalId, formVersionId);
            }

            function onSaveSuccess(result) {
                Y.log('Saved new PUBRECEIPT activity: ' + result[0]);
                currentActivity._id = result[0];
                Y.doccirrus.fsm.doTransition( currentActivity, 'validate', onValidateTransition );
            }

            function onSaveFailure(err) {
                Y.log('Could not save activity: '+ JSON.stringify(err));
                callback(err);
            }

            function getEmployeeId() {
                return currentEmployee._id || currentEmployee[0]._id;
            }

            function onValidateTransition( err /*, result */ ) {

                // emit event for extendability purposes
                /*
                Y.fire( 'activityTransitioned', {
                    errors: err,
                    result: result,
                    activity: activity,
                    transition: transition
                } );
                */

                if( err ) {
                    Y.log( 'Could not complete "validate" transition: ' + JSON.stringify( err, undefined, 2 ), 'warn', NAME );
                    //Y.doccirrus.comctl.setModal( 'Fehler beim ' + transition['-' + userLang], 'Grund: ' + err, NAME );
                    callback( err );
                    return;
                }

                // MOJ-1404: hash will have been updated (and any new _id set) in the activity view model before
                Y.doccirrus.comctl.privateGet('/r/activity/?action=fullactivity&query=_id,' + currentActivity._id + '&objPopulate=TRUE', {}, loadExpandedActivity);
            }

            function loadExpandedActivity(err, data) {
                if (err) {
                    Y.log( 'Could not expand activity after validation: ' + JSON.stringify( err, undefined, 2 ), 'warn', NAME );
                    //Y.doccirrus.comctl.setModal( 'Fehler beim ' + transition['-' + userLang], 'Grund: ' + err, NAME );
                    callback( err );
                    return;
                }

                //alert(JSON.stringify(data[0], undefined, 2));

                //  replace activity with expanded version (used by form mapper on approve)
                currentActivity = new Y.doccirrus.uam.ActivityModel( data[0] );
                currentActivity.status('VALID');
                Y.doccirrus.fsm.doTransition( currentActivity, 'approve', onApproveTransition );
            }

            /**
             *  Note that approval of activities which carry a form will cause a PDF to be generated
             *  on the server, and an invoice number assigned if invoice type
             */

            function onApproveTransition(err /*, result */) {
                if( err ) {
                    Y.log( 'Could not complete "validate" transition: ' + JSON.stringify( err, undefined, 2 ), 'warn', NAME );
                    //Y.doccirrus.comctl.setModal( 'Fehler beim ' + transition['-' + userLang], 'Grund: ' + err, NAME );
                    callback( err );
                    return;
                }

                var
                    ts = new Date().getTime(),
                    preferName = ko.unwrap(currentPatient.firstname) + ' ' + ko.unwrap(currentPatient.lastname) + '.1.' + ts + '.pdf',

                    postArgs = {
                        'activityid': currentActivity._id,
                        'type': 'activity',
                        'zipid': zipId,
                        'prefername': preferName
                    };

                Y.doccirrus.comctl.privatePost('/1/media/:copypdftozip', postArgs, onZipCopy);
            }

            function onZipCopy(err, result) {
                if( err ) {
                    Y.log( 'Could not add PDF to zip: ' + JSON.stringify( err, undefined, 2 ), 'warn', NAME );
                    //Y.doccirrus.comctl.setModal( 'Fehler beim ' + transition['-' + userLang], 'Grund: ' + err, NAME );
                    callback( err );
                    return;
                }

                if( Y.config.debug ) {
                    Y.log('New PDF copied to ZIP file: ' + JSON.stringify(result), 'debug', NAME);
                }
                callback(null, result[0]);
            }

        }

        /**
         *  Helper method used by createPRActivityPDFZip, downloads and instantiates a set of activities
         *
         *  The activities are loaded and returned as plain JSON objects which will beeed to be instantied
         *  as KO ViewModels for use with client-side helpers
         *
         *  @param toDownload   {Object}    Array of activity _ids
         *  @param callback     {Function}  Of the form fn(err, arrayOfObjects)
         */

        function getAllActivities(toDownload, callback) {

            var allActivities = [];

            function onLoadActivity(err, data) {
                if (err) {
                    callback('Eintrag konnte nicht geladen werden: ' + err);
                    return;
                }

                data = data.data ? data.data : data;

                allActivities.push(data[0]);
                downloadNextActivity();
            }

            function downloadNextActivity() {
                if (toDownload.length === 0) {
                    callback(null, allActivities);
                    return;
                }
                var nextActivityId = toDownload.pop();

                Y.doccirrus.comctl.privateGet('/1/activity/' + nextActivityId, {}, onLoadActivity);
            }

            downloadNextActivity();

        }

        /**
         *  Helper method to find the form currently assigned to a role
         *
         *  note: 'casefile-patientreciept' should be the role for now
         *
         *  TODO: move this to a forms API
         *
         *  @param  role        {String}    Name of form role to look up
         *  @param  callback    {Function}  Of the form fn(err, formId, formVersionId)
         */

        function lookupFormByRole(role, callback) {

            var canonicalId = '', formVersionId = '';

            Y.dcforms.getConfigVar('', role, false, onFormKeyLookup);

            function onFormMetaLoaded(err, formMeta) {
                if (err) {
                    callback('Formular nicht gefunden: ' + err);
                }

                formVersionId = formMeta.latestVersionId;

                callback(null, canonicalId, formVersionId);
            }

            function onFormKeyLookup(err, foundCanonicalId) {

                canonicalId = foundCanonicalId;
                formVersionId = '';

                if (err) {
                    //  translateme: PLease set default form for formConfigKey activity type
                    Y.doccirrus.comctl.setModal(
                        'Hinweis',
                        'Es wurde noch kein Formular für diesen Aktivitätstyp konfiguriert.',
                        true
                    );
                    callback('Formular für Patientenquittung nicht gefunden');
                    return;
                }

                //alert('Lade neuste Formular-Version...');
                Y.log('Loading latest version of form ' + foundCanonicalId, 'debug', NAME);
                Y.dcforms.getFormListing('', foundCanonicalId, onFormMetaLoaded);

            }

        }

        Y.doccirrus.uam.createPRActivityPDFZip = createPRActivityPDFZip;
    },
    '0.0.1',
    {
        requires: [
            'dcregexp',
            'dcvalidations',
            'kbv-validations',
            'dcsubviewmodel',
            'dcutils',
            'dcauth',
            'dcvat',
            'dcutils-uam',
            'dccasefilebinderevents',
            'dcloadhelper',
            'dcformloader',
            'dccatalogmap',
            'dcviewmodel',
            'dcpatientmodel',
            'dclocationmodel',
            'dcaddressmodel',
            'dccommunicationmodel',
            'dcinsurancestatusmodel',
            'dcbankaccountmodel',
            'dcbankaffiliatemodel',
            'dcdocumentmodel',
            'dceventarraymodel',
            'dccontactmodel',
            'dcinvoicemodel',
            'base',
            'router',
            'json',
            'model-sync-rest',
            'intl',
            'mojito-intl-addon',
            'dc-comctl',
            'dcmedia',
            'DCWindow',
            'DCFsmDefault',
            'dcmarkermodel',
            'dcmarkerarraymodel',
            'dchotkeyshandler',
            'DCSystemMessages',
            'parallel',
            'dcFkModels',
            'kbv-api',
            'cardreader'
        ]
    }
);
