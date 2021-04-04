/**
 *  Utilities to move forms and images from legacy formats inot the current one, keeping references intact
 *
 *  Overall provess:
 *
 *      (*) Load list of any _ids assigned to user images (moved to MediaMojit)
 *      (*) Load list of any _ids assigned to forms saved to disk (previous backup mechanism)
 *
 *  @author: strix
 *  @date: 2014-05-20
 */



/*jslint anon:true, nomen:true, latedef:false */
/*global YUI*/



YUI.add( 'dcforms-migrationhelper', function( Y, NAME ) {

        var
            Promise = require( 'bluebird' ),
            async = require( 'async' ),
            util = require( 'util' ),
            { formatPromiseResult } = require( 'dc-core' ).utils;

        // helper, credit: http://stackoverflow.com/questions/1960473/unique-values-in-an-array
        function arrayDeduplicate(value, index, self) {
            if ('' === value || true === value || 'true' === value) { return false; }
            return self.indexOf(value) === index;
        }

        /**
         *  Import, reindex and rebuild version history in new format
         *
         *      - load the userimages migration
         *      - load all formtemplates
         *      - check for an existing migration - add revisions if so
         *      - create a new migration if none exist
         *
         *  @param  user        {Object}    ac REST user
         *  @param  callback    {Function}  Of the form fn(err, report)
         */

        function migrateDBForms( user, callback ) {

            Y.log('Migrating all database forms to new revision system.', 'info', NAME);

            var
                report = '',
                formsHistory,
                versionHistory,
                formsHistoryChanged = false,    //  eslint-disable-line no-unused-vars
                outstanding = 0;                //  number of migrations in progress

            loadFormVersions();

            //  we will try to match form versions by using the version number or instanceId field, if available
            //  (may not have been saved to disk, but we'll use it if we can)
            function loadFormVersions() {
                var
                    dbSetup = {
                        //migrate: true,        //  TODO: find out what this does
                        'migrate': true,
                        user: user,
                        model: 'formtemplateversion',
                        action: 'get',
                        query: { },
                        callback: onVersionsLoaded
                    };

                function onVersionsLoaded(err, data) {
                    if (err) {
                        callback('Could not load load form versions set: ' + err);
                        return;
                    }

                    versionHistory = data;
                    listFormsInDb();
                }

                Y.doccirrus.mongodb.runDb( dbSetup );
            }

            //  list all forms in db
            function listFormsInDb() {

                var
                    dbSetup = {
                        'migrate': true,
                        'user': user,
                        'model': 'form',
                        'action': 'get',
                        'query': {},
                        'options': {},
                        'callback': onLoadAllForms
                    };

                Y.doccirrus.mongodb.runDb( dbSetup );

            }

            //  copy all forms into a work queue, so they can be individually checked / migrated
            function onLoadAllForms(err, data) {
                if (err) {
                    callback('Could not load forms from database: ' + err);
                    return;
                }

                if (0 === data.length) {
                    report = report + 'No legacy db forms to migrate.' + "\n";
                    return callback( null, report );
                }

                Y.log('Loaded ' + data.length + ' legacy forms from database, checking if any still need to be migrated...', 'info', NAME);
                report = report + 'Loaded ' + data.length + ' legacy forms from database, checking if any still need to be migrated...' + "\n";

                var i;

                for (i = 0; i < data.length; i++) {
                    outstanding = outstanding + 1;
                    migrateDbItem(data[i]);
                }

            }

            //  check or migrate a single db form from the queue
            function migrateDbItem(dbItem) {

                var
                    myFormId = dbItem.formId || dbItem.canonicalId || dbItem.jsonTemplate.formId,
                    myInstanceId = dbItem.instanceId || dbItem.jsonTemplate.instanceId,
                    cleanItem;

                //  correct a problem in some old legacy data where instanceId was not properly
                //  updated on saving

                if (dbItem && dbItem.jsonTemplate) {
                    if (dbItem.jsonTemplate.instanceId) {
                        dbItem.instanceId = dbItem.jsonTemplate.instanceId;
                        myInstanceId = dbItem.instanceId;
                        report = report + 'Correcting instance references in legacy form to: ' + dbItem.instanceId + "\n";
                    }
                    if (dbItem.jsonTemplate.formId) {
                        dbItem.formId = dbItem.jsonTemplate.formId;
                        myFormId = dbItem.formId;
                    }

                }

                Y.log('Migrating next DB form: ' + dbItem._id + ' formId: ' + myFormId, 'info', NAME);
                report = report + 'Checking migration status of ' + dbItem._id + ' form: ' + myFormId + ' instance: ' + myInstanceId + "\n";

                if (!myFormId) {
                    Y.log('Legacy form missing formId, skipping: ' + dbItem._id, 'warn', NAME);
                    report = report + 'Legacy form lissing formId, skipping ' + dbItem._id + "\n";

                    outstanding = outstanding - 1;
                    checkIfFinished();
                    return;
                }

                if (myFormId && formsHistory.hasOwnProperty(myFormId)) {
                    //  This form has already been migrated, either from disk or from database
                    //  in a previous invocation of this script, use the instanceId to compare to
                    //  version history and import older version if not present

                    Y.log('Form ' + myFormId + ' is known to migration history, checking version history...', 'info', NAME);

                    if ('' === findMigratedInstance(dbItem.jsonTemplate.instanceId)) {

                        //  this should be added to the form version history
                        Y.log('db form ' + myFormId + ' has been migrated but found an instance not in version history', 'info', NAME);
                        report = report + 'db form ' + myFormId + ' has been migrated but found an instance not in version history' + "\n";


                        dbItem._id = formsHistory[myFormId];
                        cleanItem = JSON.parse(JSON.stringify(dbItem));
                        cleanItem.latestVersionId = formsHistory[myFormId];
                        Y.doccirrus.filters.cleanDbObject(cleanItem);
                        Y.log('Cleaned, adding as new version...', 'info', NAME );
                        report = report + 'Cleaned, adding as new version...' + "\n";

                        saveVersionToDatabase(user, cleanItem, onCreatedNewVersion);

                    } else {
                        Y.log('Skipping migration of ' + myFormId + ' - ' + dbItem.instanceId + ' already in version history', 'info', NAME);
                        report = report + 'Already migrated: ' + myFormId + ' - ' + dbItem.instanceId + ' (in version history as ' + findMigratedInstance(dbItem.instanceId) + ')' + "\n";

                        outstanding = outstanding - 1;
                        checkIfFinished();
                    }

                } else {
                    //  This one is new to us, we will want to create a new canonical template
                    //  and initial version from this form, and record it in formsHistory

                    Y.log('Found unmigrated form: ' + myFormId + ' cleaning and adding as canonical.', 'info', NAME);
                    //Y.doccirrus.filters.cleanDbObject(dbItem);
                    //Y.log('Cleaned, adding as canonical...', 'info', NAME );

                    cleanItem = JSON.parse(JSON.stringify(dbItem));
                    cleanItem.latestVersionId = 'placeholder';
                    Y.doccirrus.filters.cleanDbObject(cleanItem);

                    saveCanonicalToDatabase(user, cleanItem, onCreatedNewCanonical);

                }

                //  callback after migrating to formtemplate collection,
                //  will have also created the first entry in revision history
                function onCreatedNewCanonical(err, canonicalId, latestVersionId, versionNumber) {

                    if (err) {
                        callback('Could not save to database: ' + err);
                        return;
                    }

                    Y.log('Imported legacy form ' + myFormId + ' as ' + canonicalId, 'info', NAME);

                    var legacyFormId = dbItem.formId || dbItem.jsonTemplate.formId;

                    report = report + 'Imported instance from forms collection into version history' +
                        ' legacyId: ' + legacyFormId + "\n" +
                        ' formId: ' + myFormId + "\n" +
                        ' _id: ' + canonicalId + "\n" +
                        ' latestVersionId: ' + latestVersionId + "\n" +
                        ' versionNumber: ' + versionNumber + "\n";

                    formsHistory[myFormId] = canonicalId;
                    formsHistoryChanged = true;

                    outstanding = outstanding - 1;
                    checkIfFinished();

                    //  TODO: delete the original form object here (prevent repeated migration)
                }

                //  callback after migrating an instance of a form to the version history

                function onCreatedNewVersion(err, canonicalId, latestVersionId, versionNumber) {

                    if (err) {
                        callback('Could not save to database: ' + err);
                        return;
                    }

                    report = report +
                        'Imported template as new version of existing form ' +
                        ' legacyId: ' + dbItem.formId + "\n" +
                        ' formId: ' + myFormId + "\n" +
                        ' _id: ' + canonicalId + "\n" +
                        ' latestVersionId: ' + latestVersionId + "\n" +
                        ' versionNumber: ' + versionNumber + "\n";


                    outstanding = outstanding - 1;
                    checkIfFinished();

                    //  TODO: delete the original form object here (prevent repeated migration)
                }

            }

            //  look up a form version by instanceId, returns migrated version _id or empty string on failure
            function findMigratedInstance(instanceId) {
                var i, ver;
                for (i = 0; i < versionHistory.length; i++) {
                    ver = versionHistory[i];

                    if (ver.instanceId && (ver.instanceId === instanceId)) {
                        return ver._id;
                    }

                    if (ver.jsonTemplate && ver.jsonTemplate.instanceId && (ver.jsonTemplate.instanceId === instanceId)) {
                        return ver._id;
                    }

                }

                return '';
            }

            //  called after processing a legacy form, only call back when all are completed
            function checkIfFinished() {
                if (0 === outstanding) {

                    //  no more db forms still being migrated
                    report = report + 'No change to form migration history.' + "\n";
                    onTemplateHistorySaved( null );

                }
            }

            //  have recorded this migration
            function onTemplateHistorySaved(err) {
                if (err) {
                    callback('Could not save template migration history: ' + err);
                    return;
                }


                //  all done
                callback(null, report);
            }
        }

        /**
         *  Save a from disk or previous form table to formtemplate and formtemplateversion, add to forms history
         *
         *  Note that the object should be cleaned with one of the following before save:
         *
         * //     Y.doccirrus.filters.cleanDbObject(formObj);
         *
         *  @param  user        {Object}    ac REST user or equivalent
         *  @param  formObj     {Object}    Form as one might get from the forms collection
         *  @param  callback    {Function}  of the form fn(err, _id, versionId, versionNo)
         */

        function saveCanonicalToDatabase(user, formObj, callback) {

            Y.log('Saving legacy form to database as canonical formtemplate.', 'info', NAME);

            //  we don't want to duplicate _ids from the forms collection
            if (formObj._id) { delete formObj._id; }

            //  but we do want to make sure we have a version and revision
            if (!formObj.version) { formObj.version = 0; }
            if (!formObj.revision) { formObj.revision = 0; }

            Y.log('Cleaning database object.', 'info', NAME);
            Y.doccirrus.filters.cleanDbObject(formObj);
            //Y.log('Finished cleaning object.', 'info', NAME);

            var
                dbSetup = {
                    'migrate': true,
                    'user': user,
                    'model': 'formtemplate',
                    'action': 'post',
                    'data': formObj,
                    'callback': onCanonicalSaved
                };

            Y.doccirrus.mongodb.runDb( dbSetup );

            function onCanonicalSaved(err, ids) {
                if (err) {
                    callback(err);
                    return;
                }

                if (0 === ids.length ) {
                    callback('could not save canonical formtemplate for migration');
                    return;
                }

                var canonicalId = ids[0];

                formObj._id = canonicalId;
                formObj.latestVersionId = canonicalId;

                saveVersionToDatabase(user, formObj, callback);
            }

        }

        /**
         *  Save a new version of a form template to the revision history
         *
         *  @param  user                {Object}    ac REST user or equivalent
         *  @param  canonicalFormObj    {Object}    Form as one might get from the forms collection
         *  @param  callback            {Function}  of the form fn(err, canonicalId, versionId, versionNo)
         */

        function saveVersionToDatabase(user, canonicalFormObj, callback) {

            canonicalFormObj.canonicalId = canonicalFormObj._id;
            canonicalFormObj.version = canonicalFormObj.version + 1;

            var
                canonicalId = canonicalFormObj._id,
                dbSetup = {
                    'migrate': true,
                    'user': user,
                    'model': 'formtemplateversion',
                    'action': 'post',
                    'callback': onVersionSaved
                };

            //  we don't want to duplicate _ids in formversiontemplate collection (or anywhere else)
            delete canonicalFormObj._id;
            Y.doccirrus.filters.cleanDbObject(canonicalFormObj);
            dbSetup.data = canonicalFormObj;

            Y.doccirrus.mongodb.runDb( dbSetup );

            function onVersionSaved(err, data) {

                if (err) {
                    return callback( Y.doccirrus.errors.rest( 500, 'Could not save new version of form: ' + err, true ) );
                }

                if (0 === data.length) {
                    return callback( Y.doccirrus.errors.rest( 500, 'Could not create new version of form: no _id returned', true ) );
                }

                canonicalFormObj.latestVersionId = data[0];
                updateCanonicalTemplate();
            }

            function updateCanonicalTemplate() {
                var
                    dbData = {
                        'latestVersionId': (canonicalFormObj.latestVersionId ? canonicalFormObj.latestVersionId : 'placeholder'),
                        'version': (canonicalFormObj.version + 1),
                        'revision': 0
                    },

                    dbSetup = {
                        'migrate': true,
                        'user': user,
                        'model': 'formtemplate',
                        'action': 'put',
                        'query': { '_id': canonicalId },
                        'fields': ['latestVersionId', 'version', 'revision'],
                        'callback': onCanonicalUpdated
                    };

                Y.doccirrus.filters.cleanDbObject(dbData);
                dbSetup.data = dbData;

                Y.doccirrus.mongodb.runDb( dbSetup );
            }

            function onCanonicalUpdated(err) {

                if (err) {
                    callback('Could not update canonical template: ' + err);
                    return;
                }

                callback( null, canonicalFormObj.canonicalId, canonicalFormObj.latestVersionId, canonicalFormObj.version );
            }

        }

        /**
         *  Update references to forms in other objects (documents, activies, etc)
         *
         *  Currently debugging, does not actually apply the transition
         *
         *  @param  user        {Object}    equivalent to ac REST user
         *  @param  modelName   {String}    Type of object which may reference form
         *  @param  callback    {Function}  Of the form fn(err, report)
         */

        function migrateOwners(user, modelName, callback) {

            var
                report = '',
                formsHistory,
                allFormVersions,
                saveQueue = [];

            loadFormVersions();

            //  we will try to match form versions by using the version number or instanceId field, if available
            //  (may not have been saved to disk, but we'll use it if we can)
            function loadFormVersions() {
                var
                    dbSetup = {
                        'migrate': true,
                        user: user,
                        model: 'formtemplateversion',
                        action: 'get',
                        query: { },
                        callback: onFormsLoaded
                    };

                function onFormsLoaded(err, data) {
                    if (err) {
                        callback('Could not load load form versions set: ' + err);
                        return;
                    }

                    allFormVersions = data;
                    loadOwnerCollection();
                }

                Y.doccirrus.mongodb.runDb( dbSetup );
            }


            //  load the entire collection of some type of object which may a have forms
            //  NOTE: this presents a scaling issue where the owner collection could be large
            //  TODO: replace with a serial operation which iterates over the mongo collection
            //  in many calls

            function loadOwnerCollection() {
                var
                    dbSetup = {
                        'migrate': true,
                        user: user,
                        model: modelName,
                        action: 'get',
                        query: { },
                        callback: onOwnersLoaded
                    };

                Y.doccirrus.mongodb.runDb( dbSetup );
            }

            function onOwnersLoaded(err, data) {
                if (err) {
                    Y.log('Could not load collection: ' + modelName + ': ' + err, 'warn', NAME);
                    callback('Could not load collection "' + modelName + '":' + err);
                    return;
                }

                var
                    currentItem,
                    newFormId,
                    newFormVersionId,
                    i;

                Y.log('Loaded ' + data.length + ' ' + modelName + ' objects from database.', 'info', NAME);
                report = report + 'Loaded ' + data.length + ' ' + modelName + ' objects from database.' + "\n";

                for (i = 0; i < data.length; i++) {

                    currentItem = data[i];

                    switch(modelName) {

                        case 'activity':
                            //report = report + 'activity: ' + currentItem._id + ' formId: ' + currentItem.formId + "\n" ;
                            if (currentItem.formId && '' !== currentItem.formId) {
                                newFormId = findFormIdInHistory(currentItem.formId);
                                newFormVersionId = getBestVersionId(currentItem.formId, currentItem.formId, currentItem.formVersion);

                                if ((currentItem.formId !== newFormId) && ('' !== newFormId) && ('' !== newFormVersionId)) {
                                    report = report +
                                        'Updating form reference in activity ' + currentItem._id + ' ' +
                                        'from: ' + currentItem.formId + ' v.' + currentItem.formVersion + ' ' +
                                        'to formId: ' + newFormId + ' ' +
                                        'to formVersionId: ' + newFormVersionId + "\n";

                                    saveQueue.push({
                                        '_id': currentItem._id,
                                        'putData': { 'formId': newFormId, 'formVersion': newFormVersionId },
                                        'fields': [ 'formId', 'formVersion' ]
                                    });
                                }
                            }
                            break;

                        case 'document':
                            //report = report + 'document: ' + currentItem._id + ' formId: ' + currentItem.formId + "\n" ;
                            if (currentItem.formId && '' !== currentItem.formId) {
                                newFormId = findFormIdInHistory(currentItem.formId);
                                newFormVersionId = getBestVersionId(currentItem.formId, currentItem.formInstanceId, '-999');
                                if ((currentItem.formId !== newFormId) && (newFormId !== '') && (newFormVersionId !== '')) {
                                    //TODO: save the object here
                                    report = report +
                                        'Updating form reference in document ' + currentItem._id + ' ' +
                                        'from: ' + currentItem.formId + ' i.' + currentItem.formInstanceId + ' ' +
                                        'to formId: ' + newFormId + ' ' +
                                        'to formVersionId: ' + newFormVersionId + "\n";

                                    saveQueue.push({
                                        '_id': currentItem._id,
                                        'putData': { 'formId': newFormId, 'formInstanceId': newFormVersionId },
                                        'fields': [ 'formId', 'formInstanceId' ]
                                    });
                                }
                            }
                            break;

                    } // end switch type
                } // end foreach db object

                Y.log('<h4></h4>SaveQueue:</h4>' + JSON.stringify(saveQueue), 'debug', NAME);
                saveNext();
            }

            /**
             *  Given a reference to a form, get any migrated _id
             *  @param formId
             */

            function findFormIdInHistory(formId) {
                if (formsHistory.hasOwnProperty(formId)) {
                    return formsHistory[formId];
                }
                //  assume current _id is good, or at least not broken by migration
                return formId;
            }

            /**
             *  For all of the form versions we know about, find the one which best matches these requirements
             *  (best is usually two of three for legacy data)
             *
             *  @param  formId          {String}    Corresponds to filename or form
             *  @param  instanceId      {String}    Uniquely identifies a version of a form
             *  @param  versionNumber   {String}    Iterated by V+ button in FEM
             */

            function getBestVersionId(formId, instanceId, versionNumber) {
                var
                    currentVersion,
                    bestVersionId = '',
                    score,
                    bestScore = 0,
                    i;

                for (i = 0; i < allFormVersions.length; i++) {
                    currentVersion = allFormVersions[i];
                    score = 0;
                    if (formId === currentVersion.formId) { score = score + 1; }
                    if (instanceId === currentVersion.instanceId) { score = score + 1; }
                    if (versionNumber === currentVersion.version) { score = score + 1; }

                    //  things can get a little turned around with documents
                    if (versionNumber === currentVersion.instanceId) { score = score + 1; }
                    if (instanceId === currentVersion.version) { score = score + 1; }

                    if (score > bestScore) {
                        bestVersionId = currentVersion._id;
                    }
                }

                return bestVersionId;
            }

            //  note that activities and documents only ever use a form version, not the (mutable)
            //  canonical / FEM version of a form template.
            //
            //  Currently loading the latest version of the form, following practice of previous migrate script to
            //  drop the collection and reload all forms from disk.

            function saveNext() {

                if (0 === saveQueue.length) {
                    Y.log('REPORT: ' + report, 'debug', NAME);
                    callback (null, report);
                    return;
                }

                var
                    nextSave = saveQueue.pop(),
                    saveData = nextSave.putData,
                    dbSetup = {
                         'migrate': true,
                         'user': user,
                         'model': modelName,
                         'action': 'put',
                         'fields_': nextSave.fields,
                         'query': { '_id': nextSave._id },
                         'options': {},
                         'callback': onUpdateOwner
                    };

                saveData.fields_ = nextSave.fields;
                Y.doccirrus.filters.cleanDbObject(saveData);
                dbSetup.data = saveData;

                //Y.log('Saving next item: ' + JSON.stringify(nextSave, undefined, 2));

                report = report + '<b>Saving next item:</b>' + "\n" + JSON.stringify(nextSave, undefined, 2) + "\n\n";

                //  load the form and try to set version matching instanceId
                Y.doccirrus.mongodb.runDb( dbSetup );
                //saveNext();

                function onUpdateOwner(err) {
                    if (err) {
                        callback('Cannot update object: ' + err);
                        return;
                    }

                    report = report + 'Migrated ' + modelName + ' ' + nextSave._id + "\n";
                    saveNext();
                }

            }

        }

        /**
         *  Change form document format from base64 encoded JSON to plain JSON - MOJ-3348
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  unmigratedOnly  {Boolean}   False for test migration
         *  @param  callback        {Object}    fn(err)
         */

        function updateFormDocumentFormat(user, unmigratedOnly, callback) {

            var stream, error = null; //, SU = Y.doccirrus.auth.getSUForLocal();

            function onStreamData( document ) {

                if (!document.type || 'FORM' !== document.type) {
                    Y.log('document ' + user.tenantId + ' / ' + document._id + ' is not a form, no form data to migrate.', 'debug', NAME);
                    return;
                }

                var
                    formState = document.formState ? document.formState : '',
                    formData = document.formData ? document.formData : '',
                    formDict = {},
                    formId = document.formId || '',
                    formVersionId = document.formInstanceId || '',
                    dbSetup;

                if (formState) {

                    if ('string' === typeof formState) {
                        try {
                            formDict = JSON.parse(formState);
                        } catch (parseErr) {
                            Y.log('Could not parse stored form state: ' + JSON.stringify(parseErr), 'warn', NAME);
                            formDict = {};
                        }
                    }

                    if ('object' === typeof formState) {
                        formDict = formState;
                    }

                }

                if (formData && '' !== formData) {

                    formData = Y.doccirrus.comctl.B64ToUTF8( formData );

                    if ('string' === typeof formData) {
                        try {
                            formDict = JSON.parse( formData );
                        } catch (parseErr) {
                            Y.log('Could not parse saved form data: ' + formData, 'warn', NAME);
                        }
                    } else {
                        Y.log('Form data is not a string: (' + (typeof formData) + ') ' + JSON.stringify(formData), 'debug', NAME);
                    }

                } else {
                    Y.log( 'Form data not available: ' + document._id, 'warn', NAME );
                }

                tryGetForm(formId, formVersionId, onFormLoaded);

                function onFormLoaded(err, linkedForm) {
                    var pages, elements, checkValue, i, j;

                    if (!err) {
                        pages = linkedForm.jsonTemplate.pages || [];
                        for (i = 0; i < pages.length; i++) {
                            elements = pages[i].elements;

                            for (j = 0; j < elements.length; j++) {

                                //Y.log('controlled crash: ' + JSON.stringify(elements[j], 'undefined', 2), 'debug', NAME);
                                //Y.log('controlled crash: ' + pages + ' (' + pages.length + ') ' + elements + ' (' + elements.length + ')', 'debug', NAME);

                                if (
                                    (elements[j]) &&
                                    (elements[j].id) &&
                                    (elements[j].type) &&
                                    ('subform' === elements[j].type) &&
                                    (formDict.hasOwnProperty(elements[j].id))
                                ) {

                                    Y.log('form element ' + j + ': ' + elements[j].type + ' ' + elements[j].id, 'debug', NAME);
                                    checkValue = formDict[elements[j].id];

                                    if ('string' === typeof checkValue && '' !== checkValue) {
                                        if ('{' !== checkValue.substr(0, 1)) {

                                            Y.log('Expanding Base64 JSON subtemplate: ' + checkValue, 'debug', NAME);

                                            try {
                                                checkValue = Y.doccirrus.comctl.B64ToUTF8(checkValue);
                                            } catch (parseErr) {
                                                Y.log('Could not base64 decode saved form data: ' + formData, 'warn', NAME);
                                            }

                                        }

                                        Y.log('Expanding JSON subtemplate: ' + checkValue, 'debug', NAME);
                                        //Y.log('Killing process: ' + canary.killMeNow, 'debug', NAME);

                                        try {
                                            formDict[elements[j].id] = JSON.parse(checkValue);
                                        } catch (parseErr) {
                                            Y.log('Could not parse saved form data: ' + formData, 'warn', NAME);
                                        }

                                        Y.log('Saved form state: ' + JSON.stringify(formDict[elements[j].id]), 'debug', NAME);
                                    }

                                } else {
                                    Y.log('Cannot load form ' + formId + ' version ' + formVersionId + ', making best guess', 'debug', NAME);
                                }
                            }
                        }

                    }

                    saveDocumentBack(formDict);
                }

                function saveDocumentBack(formDict) {
                    dbSetup = {
                        'migrate': true,
                        'user': user,
                        'model': 'document',
                        'action': 'put',
                        'query': {
                            '_id': document._id
                        },
                        'options': {
                            'ignoreReadOnly': ['formState']
                        },
                        'data': {
                            'formState': formDict,
                            'fields_': ['formState']
                        },
                        'callback': onDocumentSaved
                    };

                    Y.doccirrus.filters.cleanDbObject(dbSetup.data);

                    Y.log('set document.formState: ' + dbSetup.data.formState, 'debug', NAME);
                    Y.log( 'migrating document form serialization ' + user.tenantId + ' / ' + document._id, 'info', NAME );

                    stream.pause();

                    Y.doccirrus.mongodb.runDb(dbSetup);
                }

                function onDocumentSaved( err) {
                    if( err ) {
                        error = err;
                        Y.log( 'error migrating document form serialization 2.5 ' + err, 'error', NAME );
                    } else {
                        Y.log( 'migrating document form serialization 2.5 successfully updated document ' + document._id + ' tenant ' + user.tenantId, 'info', NAME );
                    }
                    stream.resume();
                }

            }

            function tryGetForm(canonicalId, formVersionId, formCallback) {

                var args = {
                    'user': user,
                    'callback': formCallback,
                    'originalParams': {
                        'id': canonicalId,
                        'versionId': formVersionId || ''
                    }
                };

                Y.doccirrus.api.formtemplate.loadform(args);
            }

            function onStreamError(err) {
                Y.log( 'migrating document form serialization stream error' + err, 'error', NAME );
                error = err;
            }

            function onStreamClose() {
                Y.log( 'migrating document form serialization stream close', 'info', NAME );
                callback( error );
            }

            function modelCb(err, model) {
                if( err ) {
                    Y.log( 'error migrating document form serialization 2.5 modelCb' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                var docQuery= { 'type': 'FORM' };

                if (true === unmigratedOnly) {
                    docQuery.formState = { $exists: false };
                }

                stream = model.mongoose.find( docQuery, {}, { timeout: true } ).stream();
                stream.on( 'data', onStreamData );
                stream.on( 'error', onStreamError );
                stream.on( 'close', onStreamClose );
            }

            Y.doccirrus.mongodb.getModel( user, 'document', true, modelCb );
        }

        /**
         *  Migrate all forms and form versions to add format version number, and to adjust text type elements to
         *  compensate for changes in font scaling.
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  callback    {Function}  Of the form fn(err, report)
         */

        function checkOrAddAllFormatVersions(user, callback) {
            var
                currentCollection = 'formtemplateversion',
                toMigrate = [],
                report = 'Migrating ' + currentCollection + ' to add FEM format version and rendering adjustments.<br/>',
                nextItemId;

            migrateCollection();

            function migrateCollection() {
                var
                    dbSetup = {
                        'migrate': true,
                        'user': user,
                        'model': currentCollection,
                        'action': 'get',
                        'query': {
                            'formatVersion': {$ne: 1.1}
                        },
                        'callback': onDocumentsLoaded
                    };

                Y.log( 'migrating ' + currentCollection + ' format version / tenant: ' + (user.tenantId || '(none)'), 'info', NAME );
                Y.doccirrus.mongodb.runDb(dbSetup);

            }

            function onDocumentsLoaded(err, unmigratedForms) {
                if (err) {
                    Y.log('Could not search ' + currentCollection + ' for unmigrated forms.', 'warn', NAME);
                    callback(err);
                    return;
                }

                Y.log('Found: ' + unmigratedForms.length + ' ' + currentCollection + 's below current version', 'debug', NAME);

                report = report + 'Found: ' + unmigratedForms.length + ' ' + currentCollection + 's below current version<br/>';

                var i;
                for (i = 0; i < unmigratedForms.length; i++) {
                    Y.log('Checking: ' + currentCollection + unmigratedForms[i]._id, 'debug', NAME);
                    if (!unmigratedForms[i].formatVersion || 1.1 !== unmigratedForms.formatVersion) {
                        Y.log('Queueing: ' + currentCollection + unmigratedForms[i]._id, 'debug', NAME);
                        toMigrate.push(unmigratedForms[i]._id);
                    }
                }
                processNextItem();
            }

            function processNextItem(err) {

                if (err) {
                    Y.log('Could not migrate ' + nextItemId  + ' from ' + currentCollection + ' collection.', 'warn', NAME);
                    report = report + 'Could not migrate ' + nextItemId  + ' from ' + currentCollection + ' collection:' + JSON.stringify(err) + '<br/>';
                    callback(err, report);
                    return;
                }

                if (0 === toMigrate.length) {
                    //  switch to next table if there is one
                    if ('formtemplateversion' === currentCollection) {
                        currentCollection = 'formtemplate';
                        report = report + 'Migrating ' + currentCollection + ' to add FEM format version and rendering adjustments.<br/>';
                        migrateCollection();
                        return;
                    }

                    //  all done;
                    report = report + 'Forms migration complete.<br/>';
                    callback(null, report);
                    return;
                }

                nextItemId = toMigrate.pop();
                report = report + 'Migrating ' + currentCollection + '::' + nextItemId + '<br/>';
                checkOrAddFormFormatVersion(user, currentCollection, nextItemId, onItemProcessed);
            }

            function onItemProcessed(err) {
                if (err) {
                    callback(err);
                    return;
                }

                processNextItem();
            }

        }

        /**
         *  Migrate a single form for revision to the current forms format version
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  collection  {String}    Name of database collection to migrate
         *  @param  _id         {String}    Database _id of single item to migrate
         *  @param  callback    {Function}  Of the form fn(err, report)
         */

        function checkOrAddFormFormatVersion(user, collection, _id, callback) {

            //  This is called from migration, import of form from disk and import of forms from upload
            //  These also deal with linked media and other items, but this only migrates forms and their versions

            if ('formtemplate' !== collection && 'formtemplateversion' !== collection) {
                Y.log('No setting formatVersion, not a form: ' + collection + '::' + _id, 'debug', NAME);
                callback(null);
                return;
            }

            var
                dbSetup = {
                    'migrate': true,
                    'user': user,
                    'model': collection,
                    'action': 'get',
                    'query': {
                        '_id': _id
                    },
                    'callback': onItemLoaded
                };

            Y.log( 'migrating ' + collection + '::' + _id + ' format version / tenant: ' + (user.tenantId || '(none)'), 'info', NAME );
            Y.doccirrus.mongodb.runDb(dbSetup);

            function onItemLoaded(err, results) {
                if (err) {
                    Y.log('Could not load form to migrate ' + collection + '::' + _id + ': ' + JSON.stringify(err), 'warn', NAME);
                    callback(err);
                    return;
                }

                var item;

                if (results.length && results.length > 0) {
                    item = results[0];
                } else {
                    Y.log('Could not load form to migrate: ' + collection + '::' + _id + '(not found)', 'warn', NAME);
                    callback(err);
                    return;
                }

                Y.log('Loaded item with format version: ' + item.formatVersion, 'debug', NAME);

                if (item.formatVersion && item.formatVersion === 1.1) {
                    //  for idempotence
                    callback(null);
                    return;
                }

                //  update element positions and save it back to the database

                var
                    jT = item.jsonTemplate,
                    isDirty = false,            //  eslint-disable-line no-unused-vars
                    i,
                    j,
                    page,
                    element,
                    newTop,
                    useData;

                for (i = 0 ; i < jT.pages.length; i++) {
                    page = jT.pages[i];
                    for (j = 0; j < page.elements.length; j++) {
                        element = page.elements[j];

                        switch (element.type) {
                            case 'input':
                            case 'label':
                            case 'date':
                            case 'textarea':
                                Y.log('Correcting element ' + element.id + ' (' + element.type + ') on page ' + i, 'debug', NAME);
                                newTop = parseFloat(element.top) + (parseFloat(element.fontheight) / 2);
                                if (element.fontheight && !isNaN(newTop)) {
                                    element.top = newTop;
                                    item.jsonTemplate.pages[i].elements[j] = element;
                                    isDirty = true;
                                }
                                break;
                        }

                    }
                }

                useData = {
                    'formatVersion': 1.1,
                    'jsonTemplate': item.jsonTemplate,
                    'fields_': ['jsonTemplate', "formatVersion"]
                };

                useData = Y.doccirrus.filters.cleanDbObject( useData );

                dbSetup = {
                    'migrate': true,
                    'user': user,
                    'model': collection,
                    'action': 'put',
                    'query': {
                        '_id': (_id + '')
                    },
                    'options': {
                        'ignoreReadOnly': ['jsonTemplate', 'formatVersion']
                    },
                    'data': useData,
                    'callback': onChangesSaved
                };

                Y.log('Saving changes to: ' + collection + '::' + _id, 'debug', NAME);
                Y.doccirrus.mongodb.runDb(dbSetup);

            }

            function onChangesSaved(err) {
                if (err) {
                    Y.log('Could not save changes to ' + collection + '::' + _id + ' ' + JSON.stringify(err), 'warn', NAME);
                    callback(err);
                    return;
                }
                callback(null);
            }

        }

        /**
         *  Batch correction to a duplicate migration for formtemplateversions
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  callback    {Function}  Of the form fn(err, report)
         */

        function testBatchUndoDuplicateMigration(user, callback) {
            var
                currentCollection = 'formtemplateversion',
                toMigrate = [],
                report = 'Fixing migration error on ' + currentCollection + ' for vertical rendering adjustments.<br/>',
                nextItem;

            migrateCollection();

            function migrateCollection() {
                var
                    dbSetup = {
                        'migrate': true,
                        'user': user,
                        'model': currentCollection,
                        'action': 'get',
                        'query': {
                            'formatVersion': 1.1
                        },
                        'callback': onDocumentsLoaded
                    };

                Y.log( 'fixing migration error ' + currentCollection + ' format version / tenant: ' + (user.tenantId || '(none)'), 'info', NAME );
                Y.doccirrus.mongodb.runDb(dbSetup);

            }

            function onDocumentsLoaded(err, unmigratedForms) {
                if (err) {
                    Y.log('Could not search ' + currentCollection + ' for unmigrated forms.', 'warn', NAME);
                    callback(err);
                    return;
                }

                Y.log('Found: ' + unmigratedForms.length + ' ' + currentCollection + 's below current version', 'debug', NAME);

                var i;
                for (i = 0; i < unmigratedForms.length; i++) {
                    Y.log('Queueing: ' + currentCollection + unmigratedForms[i]._id, 'debug', NAME);
                    toMigrate.push(unmigratedForms[i]);

                }
                processNextItem();
            }

            function processNextItem(err) {

                if (err) {
                    Y.log('Could not adjust ' + nextItem._id  + ' from ' + currentCollection + ' collection.', 'warn', NAME);
                    report = report + 'Could not adjust ' + nextItem._id  + ' from ' + currentCollection + ' collection:' + JSON.stringify(err) + '<br/>';
                    callback(err, report);
                    return;
                }

                if (0 === toMigrate.length) {
                    //  all done;
                    report = report + 'Forms migration correction complete.<br/>';
                    callback(null, report);
                    return;
                }

                nextItem = toMigrate.pop();
                report = report + 'Migrating ' + currentCollection + '::' + nextItem._id + '<br/>';
                testUndoDuplicateMigration(user, currentCollection, nextItem._id, onItemProcessed);
            }

            function onItemProcessed(err) {
                if (err) {
                    callback(err);
                    return;
                }

                processNextItem();
            }

        }

        /**
         *  Correction to a duplicate migration for formtemplateversions
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  collection  {String}    Name of database collection to migrate
         *  @param  _id         {String}    Database _id of single item to migrate
         *  @param  callback    {Function}  Of the form fn(err, report)
         */

        function testUndoDuplicateMigration(user, collection, _id, callback) {

            //  This is called from migration, import of form from disk and import of forms from upload
            //  These also deal with linked media and other items, but this only migrates forms and their versions

            if ('formtemplate' !== collection && 'formtemplateversion' !== collection) {
                Y.log('No setting formatVersion, not a form: ' + collection + '::' + _id, 'debug', NAME);
                callback(null);
                return;
            }

            var
                dbSetup = {
                    'migrate': true,
                    'user': user,
                    'model': collection,
                    'action': 'get',
                    'query': {
                        '_id': _id
                    },
                    'callback': onItemLoaded
                };

            Y.log( 'correcting migfration ' + collection + '::' + _id + ' format version / tenant: ' + (user.tenantId || '(none)'), 'info', NAME );
            Y.doccirrus.mongodb.runDb(dbSetup);

            function onItemLoaded(err, results) {
                if (err) {
                    Y.log('Could not load form to migrate ' + collection + '::' + _id + ': ' + JSON.stringify(err), 'warn', NAME);
                    callback(err);
                    return;
                }

                var item;

                if (results.length && results.length > 0) {
                    item = results[0];
                } else {
                    Y.log('Could not load form to migrate: ' + collection + '::' + _id + '(not found)', 'warn', NAME);
                    callback(err);
                    return;
                }

                Y.log('Loaded item with format version: ' + item.formatVersion, 'debug', NAME);

                //  update element positions and save it back to the database

                var
                    jT = item.jsonTemplate,
                    isDirty = false,            //  eslint-disable-line no-unused-vars
                    i,
                    j,
                    page,
                    element,
                    newTop,
                    useData;

                for (i = 0 ; i < jT.pages.length; i++) {
                    page = jT.pages[i];
                    for (j = 0; j < page.elements.length; j++) {
                        element = page.elements[j];

                        switch (element.type) {
                            case 'input':
                            case 'label':
                            case 'date':
                            case 'textarea':
                                Y.log('Correcting element ' + element.id + ' (' + element.type + ') on page ' + i, 'debug', NAME);
                                newTop = parseFloat(element.top) - (parseFloat(element.fontheight) / 2);
                                if (element.fontheight && !isNaN(newTop)) {
                                    element.top = newTop;
                                    item.jsonTemplate.pages[i].elements[j] = element;
                                    isDirty = true;
                                }
                                break;
                        }

                    }
                }

                useData = {
                    'formatVersion': 1.1,
                    'jsonTemplate': item.jsonTemplate,
                    'fields_': ['jsonTemplate', "formatVersion"]
                };

                useData = Y.doccirrus.filters.cleanDbObject( useData );

                dbSetup = {
                    'migrate': true,
                    'user': user,
                    'model': collection,
                    'action': 'put',
                    'query': {
                        '_id': (_id + '')
                    },
                    'options': {
                        'ignoreReadOnly': ['jsonTemplate', "formatVersion"]
                    },
                    'data': useData,
                    'callback': onChangesSaved
                };

                Y.log('Saving changes to: ' + collection + '::' + _id, 'debug', NAME);
                Y.doccirrus.mongodb.runDb(dbSetup);

            }

            function onChangesSaved(err) {
                if (err) {
                    Y.log('Could not save changes to ' + collection + '::' + _id + ' ' + JSON.stringify(err), 'warn', NAME);
                    callback(err);
                    return;
                }
                callback(null);
            }

        }

        async function addFormDeps( user ) {
            const inMigration = !user.hasOwnProperty( 'isNotInMigration' );
            const getModel = util.promisify( Y.doccirrus.mongodb.getModel );
            const formTemplateCollections = ['formtemplate', 'formtemplateversion'];
            let report = '';
            let collection, id, err, doc, model, formTemplateModel, formTemplateVersionModel;

            const processFormTemplateCollection = async ( formTemplateCollectionName ) => {
                // Get mongoose models of form templates and versions
                model = formTemplateCollectionName === 'formtemplate' ? formTemplateModel : formTemplateVersionModel;

                let cursor = model.mongoose.find( {} ).lean().cursor();
                let formTemplate;

                while( formTemplate = await cursor.next() ) {  // eslint-disable-line no-cond-assign
                    let
                        initialDeps = formTemplate.dependsOn,
                        ownDeps = Y.doccirrus.forms.exportutils.listDirectDependencies( formTemplate ).split( '\n' ),
                        allDeps = [],
                        isChanged,
                        secondary,
                        parts,
                        i;

                    Y.log( 'Checking dependencies on: ' + formTemplateCollectionName + '::' + formTemplate._id, 'info', NAME );

                    report = report + 'Checking dependencies on: ' + formTemplateCollectionName + '::' + formTemplate._id + "\n";

                    for( i = 0; i < ownDeps.length; i++ ) {
                        allDeps.push( ownDeps[i] );
                        parts = ownDeps[i].split( '::' );
                        collection = parts[0];
                        id = parts[1];
                        secondary = null;

                        // add secondary dependencies
                        if( 'formtemplate' === collection ) {
                            [err, doc] = await formatPromiseResult( formTemplateModel.mongoose.findOne( {_id: id} ).select( {dependsOn: 1} ).lean().exec() );
                            if( err ) {
                                Y.log( `could not get formtemplate ${id} ${formTemplateCollectionName} ${formTemplate._id}: ${err.stack || err}`, 'warn', NAME );
                                throw err;
                            }
                            secondary = doc ? doc.dependsOn : null;
                        } else if( 'formtemplateversion' === collection ) {
                            //  add secondary dependencies
                            [err, doc] = await formatPromiseResult( formTemplateVersionModel.mongoose.findOne( {_id: id} ).select( {dependsOn: 1} ).lean().exec() );
                            if( err ) {
                                Y.log( `could not get formtemplateversion ${id} ${formTemplateCollectionName} ${formTemplate._id}: ${err.stack || err}`, 'warn', NAME );
                                throw err;
                            }
                            secondary = doc ? doc.dependsOn : null;
                        }

                        if( secondary ) {
                            Y.log( 'Adding secondary dependencies: ' + "\n" + collection + '::' + id + "\n" + secondary, 'info', NAME );
                            allDeps = allDeps.concat( secondary.split( "\n" ) );
                        }
                    }

                    //  add revision history
                    if( 'formtemplate' === collection ) {
                        Y.log( `Adding full revision history of formtemplate:: ${formTemplate._id}`, 'info', NAME );
                        let docs;
                        [err, docs] = await formatPromiseResult( formTemplateVersionModel.mongoose.find( {canonicalId: formTemplate._id} ).select( {_id: 1} ).lean().exec() );
                        if( err ) {
                            Y.log( `could not get formtemplateversion ${id} ${formTemplateCollectionName} ${formTemplate._id}: ${err.stack || err}`, 'warn', NAME );
                            throw err;
                        } else {
                            docs.forEach( doc => {
                                allDeps.push( 'formtemplateversion::' + doc._id );
                            } );
                        }

                    }

                    //  format and return results
                    allDeps = allDeps.filter( arrayDeduplicate );
                    allDeps.sort();
                    formTemplate.dependsOn = allDeps.join( "\n" );

                    isChanged = initialDeps !== formTemplate.dependsOn;

                    if( isChanged ) {
                        let result;
                        Y.log( `updated ${formTemplateCollectionName} ${formTemplate._id}`, 'debug', NAME );
                        [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'put',
                            model: formTemplateCollectionName,
                            query: {
                                _id: formTemplate._id
                            },
                            data: {
                                fields_: ['dependsOn'],
                                skipcheck_: true,
                                dependsOn: formTemplate.dependsOn
                            },
                            options: {
                                ignoreReadOnly: ['dependsOn']
                            },
                            migrate: inMigration
                        } ) );

                        if( err ) {
                            Y.log( `could not update ${formTemplateCollectionName} ${formTemplate._id}: ${err.stack || err}`, 'warn', NAME );
                            throw err;
                        } else {
                            Y.log( `updated ${formTemplateCollectionName} ${formTemplate._id}`, 'info', NAME );
                            Y.log( `updated ${formTemplateCollectionName} ${formTemplate._id}: ${result}`, 'debug', NAME );
                        }

                    }

                }
            };

            [err, formTemplateModel] = await formatPromiseResult( getModel( user, 'formtemplate', inMigration ) );

            if( err ) {
                Y.log( `Could not create formtemplate model: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            [err, formTemplateVersionModel] = await formatPromiseResult( getModel( user, 'formtemplateversion', inMigration ) );

            if( err ) {
                Y.log( `Could not create formtemplate model: ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            // Stream all forms which do not have a formFolderId and set one

            for( let collectionName of formTemplateCollections ) {
                await processFormTemplateCollection( collectionName );
            }

        }

        /**
         *  Add and populate dependsOn field of formtemplate and formtemplateversion objects
         *
         *  @param user
         *  @param callback
         */

        function addFormDependencies(user, callback) {

            //  load all templates and versions
            //
            //  for each template and version
            //      add own dependencies to dependsOn
            //      add all secondary dependencies to dependsOn
            //      keep count of how many items have changed
            //
            //  repeat until no items change
            //
            //  save all items which have changed

            var
                runDb = Promise.promisify( Y.doccirrus.mongodb.runDb),
                report = '',
                forms = {}, versions = {},
                toSave = [],

                //  set by formtemplate API when calling from browser
                inMigration = !user.hasOwnProperty('isNotInMigration'),
                collection, id;

            //console.log('Is in migration: ' + (inMigration ? 'TRUE' : 'FALSE'));

            loadForms()
                .then( onFormsLoaded)
                .then( loadVersions )
                .then( onVersionsLoaded )
                .then( updateAllDependencies )
                .then( saveAll )
                .then( function() {
                    Y.log('Finished updating dependencies.', 'debug', NAME);
                    callback(null, report);
                })
                .catch( onErr );

            function loadForms() {
                //console.log('addFormDependencies - loadForms');
                return runDb( { 'user': user, 'action': 'get', 'model': 'formtemplate', 'migrate': inMigration } );
            }

            function onFormsLoaded( data ) {
                //console.log('addFormDependencies - onFormsLoaded');
                Y.log('Loaded ' + data.length + ' forms.', 'debug', NAME);
                report = report + 'Loaded ' + data.length + ' forms.' + "\n";
                var i;

                for (i = 0; i < data.length; i++) {
                    if (!data[i].dependsOn) { data[i].dependsOn = ''; }
                    forms[data[i]._id + ''] = data[i];
                }

                return true;
            }

            function loadVersions() {
                //console.log('addFormDependencies - onFormsLoaded');
                return runDb( { 'user': user, 'action': 'get', 'model': 'formtemplateversion', 'migrate': inMigration } );
            }

            function onVersionsLoaded( data ) {
                //console.log('addFormDependencies - onTemplatesLoaded');
                Y.log('Loaded ' + data.length + ' versions.', 'debug', NAME);
                report = report + 'Loaded ' + data.length + ' versions.' + "\n";
                var i;

                for (i = 0; i < data.length; i++) {
                    if (!data[i].dependsOn) { data[i].dependsOn = ''; }
                    versions[data[i]._id + ''] = data[i];
                }

                return true;
            }

            function updateAllDependencies() {
                //console.log('addFormDependencies - updateAllDependencies');
                var changed = 0, id;

                Y.log('Updating dependencies in all forms and versions.', 'info', NAME);

                for (id in forms) {
                    if (forms.hasOwnProperty(id)) {
                        changed = changed + updateSingle(forms[id], 'formtemplate');
                        Y.log('Changed: ' + changed, 'debug', NAME);
                        Y.log('New deps: ' + forms[id].dependsOn, 'debug', NAME);
                    }
                }

                for (id in versions) {
                    if (versions.hasOwnProperty(id)) {
                        changed = changed + updateSingle(versions[id], 'formtemplateversion');
                        Y.log('Changed: ' + changed, 'debug', NAME);
                        Y.log('New deps: ' + "\n" + versions[id].dependsOn, 'debug', NAME);
                    }
                }

                Y.log('Updated all dependencies, saving ' + toSave.length, 'debug', NAME);

                report = report + 'Updated ' + changed + 'dependency fields.' + "\n";

                if (changed > 0) {
                    //  repeatedly update dependencies until no more changes propogate up tree
                    Y.log('Changes still to propogate, repeating update process...', 'debug', NAME);
                    report = report + 'Changes still to propogate, repeating update process...' + "\n";
                    updateAllDependencies();
                }

                return true;
            }

            function updateSingle( item, saveTo ) {

                var
                    initialDeps = item.dependsOn,
                    ownDeps = Y.doccirrus.forms.exportutils.listDirectDependencies(item).split("\n"),
                    allDeps = [],
                    isChanged,
                    secondary,
                    parts,
                    i, j, k;

                Y.log('Checking dependencies on: ' + saveTo + '::' + item._id, 'debug', NAME);
                report = report + 'Checking dependencies on: ' + saveTo + '::' + item._id + "\n";

                //Y.log('Adding own dependencies: ' + "\n" + ownDeps.join("\n"), 'debug', NAME);

                for (i = 0; i < ownDeps.length; i++) {
                    allDeps.push(ownDeps[i]);
                    parts = ownDeps[i].split('::');
                    collection = parts[0];
                    id = parts[1];
                    secondary = null;

                    if ('formtemplate' === collection) {
                        //  add secondary dependencies
                        secondary = forms.hasOwnProperty(id) ? forms[id].dependsOn : null;
                    }
                    if ('formtemplateversion' === collection) {
                        secondary = versions.hasOwnProperty(id) ? versions[id].dependsOn : null;
                    }

                    if (secondary) {
                        Y.log('Adding secondary dependencies: ' + "\n" + collection + '::' + id + "\n" + secondary, 'debug', NAME);
                        allDeps = allDeps.concat(secondary.split("\n"));
                    }
                }

                //  add revision history
                if ('formtemplate' === collection) {
                    j = 0;

                    for (k in versions) {
                        if (versions.hasOwnProperty(k)) {
                            j = j + 1;
                            if (versions[k].canonicalId && versions[k].canonicalId + '' === item._id + '') {
                                //  add to secondary dependencies
                                Y.log('Adding historical revision: formtemplateversion::' + k, 'debug', NAME);
                                allDeps.push('formtemplateversion::' + k);
                            }
                        }
                    }

                    Y.log('Adding full revision history of formtemplate::' + item._id + ' (' + j + ' checked)', 'debug', NAME);
                }

                //  format and return results
                allDeps = allDeps.filter( arrayDeduplicate );
                allDeps.sort();
                item.dependsOn = allDeps.join("\n");
                //Y.log('Updated dependencies: ' + "\n" + item.dependsOn, 'debug', NAME);

                isChanged = ((initialDeps === item.dependsOn) ? 0 : 1);

                if (1 === isChanged) { toSave.push({ 'id': item._id, 'collection': saveTo }); }
                Y.log('isChanged: ' + isChanged, 'debug', NAME);

                return isChanged;
            }

            function saveAll() {
                //console.log('addFormDependencies - updateAllDependencies');

                Y.log('Updating dependencies of ' + toSave.length + ' items', 'debug', NAME);
                report = report + 'Updating dependencies of ' + toSave.length + ' items' + "\n";

                /*
                var promises = [], willSave, i;

                for (i = 0; i < toSave.length; i++) {
                    Y.log('Creating promise to save ' + toSave[i].collection + '::' + toSave[i].id, 'debug', NAME);
                    willSave = saveSingle(toSave[i]);
                    promises.push(willSave);
                }

                return Promise.all(promises);
                */

                return Promise.map(toSave, saveSingle, { concurrency: 1 });

                function saveSingle(item /*, idx, len */) {

                    //console.log('Save single item: ' + idx + ' of ' + len);

                    var
                        dataset = (item.collection === 'formtemplate' ? forms : versions),
                        dbSetup = {
                            'user': user,
                            'action': 'put',
                            'model': item.collection,
                            'query': { '_id': item.id },
                            'data': {
                                'fields_': ['dependsOn'],
                                'skipcheck_': true,
                                'dependsOn': dataset[item.id].dependsOn
                            },
                            'options': {
                                'limit': 1,
                                'ignoreReadOnly': ['dependsOn']
                            },
                            'migrate': inMigration
                        };

                    Y.log('Saving ' + item.collection + '::' + item.id + "\n" + dataset[item.id].dependsOn, 'debug', NAME);
                    //dbSetup.data = Y.doccirrus.filters.cleanDbObject(dbSetup.data);
                    return runDb( dbSetup );
                }
            }

            function onErr(err) {
                if (err && {} !== err) {
                    Y.log('Problem adding dependencies: ' + JSON.stringify(err), 'warn', NAME);
                    return callback(err);
                }
                //  TODO: find out why empty errors are occasionally returned, find a better way to handle them
                //  callback( null )
            }
        }

        /**
         *  Development route to clear all form dependencies, to test migration
         *  @param user
         *  @param callback
         */

        function clearFormDependencies(user, callback) {

            var
                runDb = Promise.promisify(Y.doccirrus.mongodb.runDb),
                dbLoad= {
                    'user': user,
                    'model': 'formtemplate',
                    'action': 'get'
                };

            runDb(dbLoad)
                .then( removeAllDeps )
                .then( loadVersions )
                .then( removeAllDeps )
                .done(onAllComplete, onErr);


            function removeAllDeps(data) {
                var
                    promises = [],
                    i;

                for (i = 0; i < data.length; i++) {
                    Y.log('Promising to clear dependencies of ' + dbLoad.model + '::' + data[i]._id, 'debug', NAME);
                    promises.push(
                        runDb({
                            'user': user,
                            'action': 'put',
                            'model': dbLoad.model,
                            'query': {'_id': data[i]._id + ''},
                            'skipcheck_': true,
                            'data': {
                                'fields_': ['dependsOn'],
                                'dependsOn': '',
                                'skipcheck_': true
                            }
                        })
                    );
                }

                return Promise.all(promises);
            }

            function loadVersions() {
                dbLoad.model = 'formtempateversion';
                return runDb(dbLoad);
            }

            function onAllComplete() {
                Y.log('Cleared dependencies on all forms and versions', 'debug', NAME);
                callback(null);
            }

            function onErr(err) {
                Y.log('Problem clearing dependencies: ' + JSON.stringify(err), 'warn', NAME );
                callback(err);
            }
        }

        /**
         *  Set the 'readonly' property to true for all image elements in all forms and versions
         *
         *  @param  user            {Object}    REST user or equivalent
         *  @param  collectionName  {String}    Should be 'formtemplate' or 'formtemplateversion'
         *  @param  inMigration     {Boolean}   True if called from migrate.server.js, false if called from test route
         *  @param  callback        {Function}  Of the form fn(err, report)
         */

        function setFormImagesReadOnly( user, collectionName, inMigration, callback ) {

            var
                error,
                stream,
                toSave = [],
                report = 'Making all image elements in forms read-only, collection: ' + collectionName + "\n";

            Y.doccirrus.mongodb.getModel( user, collectionName, true, onModelReady );

            function onModelReady(err, model) {
                if( err ) {
                    Y.log( 'error migrating document form serialization 2.5 modelCb' + err, 'error', NAME );
                    callback( err );
                    return;
                }

                report = report + 'Created database model: ' + collectionName + "\n";

                var
                    hasImagesQuery = {
                        "jsonTemplate.pages.elements": {
                            $elemMatch: { "type":"image" }
                        }
                    };

                stream = model.mongoose.find( hasImagesQuery, {}, { timeout: true } ).stream();
                stream.on( 'data', onStreamData );
                stream.on( 'error', onStreamError );
                stream.on( 'close', onStreamClose );
            }

            function onStreamData( formObj ) {
                var
                    jt = formObj.jsonTemplate ? formObj.jsonTemplate : { pages: [] },
                    doSave = false,
                    i, j, page, elem;

                report = report + 'Stream received form object: ' + formObj._id + "\n";

                for ( i = 0; i < jt.pages.length; i++ ) {
                    page = jt.pages[i];

                    for ( j = 0; j < page.elements.length; j++ ) {
                        elem = page.elements[j];

                        if ( 'image' === elem.type ) {
                            report = report + 'Making image element read-only: ' + elem.id + "\n";
                            Y.log( 'making image element read-only: ' + elem.id , 'debug', NAME );
                            elem.readonly = "true";
                            doSave = true;
                        }
                    }
                }

                if ( doSave ) {
                    toSave.push( formObj );
                }
            }

            function onStreamError(err) {
                Y.log( 'Stream error while loading ' + collectionName + ': ' + err, 'error', NAME );
                report = report + 'Stream error while loading ' + collectionName + ': ' + err + "\n";
                error = err;
            }

            function onStreamClose() {
                Y.log( 'Saving ' + toSave.length + ' updated objects back to database' , 'info', NAME );
                report = report + 'Saving ' + toSave.length + ' updated objects back to database' + "\n";
                async.eachSeries( toSave, saveSingleForm, onAllSaved );
            }

            function saveSingleForm( formObj, itcb ) {
                Y.log( 'Updating ' + collectionName + '::' + formObj._id, 'debug', NAME );
                report = report + 'Updating ' + collectionName + '::' + formObj._id + "\n";

                Y.doccirrus.mongodb.runDb({
                    'user': user,
                    'action': 'put',
                    'model': collectionName,
                    'query': { '_id': formObj._id + '' },
                    'skipcheck_': true,
                    'data': {
                        'fields_': ['jsonTemplate'],
                        'jsonTemplate': formObj.jsonTemplate,
                        'skipcheck_': true
                    },
                    'migrate': inMigration,
                    'callback': itcb
                });
            }

            function onAllSaved( err ) {
                if ( err ) {
                    Y.log( 'Error saving object back to database: ' + JSON.stringify( err ), 'debug', NAME );
                    error = err;
                }
                callback( error, report );
            }
        }

        /**
         *  MOJ-6148 correct element borders in user forms
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  inMigration {Boolean}   True if called form migration, fals eif run from REST route
         *  @param  callback    {Function}  Of the form fn( err, report )
         */

        function fixElementBorders( user, inMigration, callback ) {
            var
                report = '<h2>Correcting element borders in customer forms on tenant ' + user.tenantId + ' (' + ( inMigration ? 'MIGRATE' : 'MANUAL' ) + ')</h2>\n\n',
                affectedForms = [
                    "5391fba7f68076bd1d9833a1",
                    //"5391fb01f68076bd1d98312d",  //  believe borders correct
                    //"5391fb41f68076bd1d98318d",  //  believe borders correct
                    "5391fb86f68076bd1d983281",
                    //"5391fba2f68076bd1d98333d",  //  believe borders correct
                    //"5391fba4f68076bd1d98336d",  //  believe borders correct
                    "5391fba7f68076bd1d9833a1",
                    "5391fc5af68076bd1d983e03",
                    "5391fc61f68076bd1d983e35",
                    //"5391fc6af68076bd1d983e81",  //  believe borders correct
                    //"5391fc74f68076bd1d983ed5",  //  believe borders correct
                    //"5391fc78f68076bd1d983f29",  //  believe borders correct
                    "5391fc80f68076bd1d983f9d",
                    "540ede85da641d1a4493d0e5",
                    "5450fe34bc1feab80f7e0944",
                    //"548833a09e13fb3d6ea400a2",  //  believe borders correct
                    "54a2d6707d045d7a386fe411",
                    "54aba06366449ab94cf4880d",
                    "54abb17bdb6ccd2b0fa090dd",
                    "54abc086e3a606d019c5d75f",
                    "54abd168c66390df47186bad",
                    "54abd193e2a8fce14740d3f7",
                    "54ac0556dc47cb5919f61664",
                    "54ae40725d0503df17f10619",
                    //"54aebb5b9625b48e45365667",  //  believe borders correct
                    "54afbc10a78c05f925682e24",
                    "54afc4554714f87109fb177b",
                    "54bd057e48ed716f3f9e904f",
                    "54be51507554e919281a32f3",
                    "54be6fb7b72dd7113817a557",
                    "54be71ff3700aa9f18d4dec8",
                    "54be71ff3700aa9f18d4dec8",
                    "55016f59c60236de4e8dd957",
                    "550170a563bffbdc4ea30f63",
                    "5506ffd3bde7b2f657e69b80",
                    "55080a8230d911511c6464d3",
                    "550fe8c2fa1470ff1606bf9d",
                    "551029dd94ec3b0222e104e1",
                    "551311a9ace2338a200037dc",
                    "551be3722f64b83d63a22840",
                    //"554a1ae4376325f102f46337",  //  believe borders correct
                    "55781380e96fa52a4b33cd23",
                    "55c9f6a15b0c38b43398d8a4",
                    "55ed9cf48e762ce252dc23a1",
                    "55f0181198885ad612e280f2",
                    "56016ad71ede4f2d4755ccc4",
                    "561519b13cd9280336ef44a6",
                    // "562775aadf9e4163194e1db4",  //  believe borders correct
                    "5638957091c648f70af61d72",
                    "563a29c684be2ee3cc4086c0",
                    "569cc2206b6aed53674547fe",
                    "569cceeb6b6aed536745481e",
                    "56af784c28073fd6491bc7e4",
                    "56af784c28073fd6491bc7e4",
                    "56bc59eb991062ed56a72887",
                    "56c44bb4d738df78b84b3259",
                    "5710a5ccd31e07316d5810fa",
                    "57238d71eb7be4df51e33bc5",
                    "5732f646cd9d2d8159c1ba24",
                    "573328b1addf386673a6532c",
                    "57347feec3d010687c5d2531",
                    "573dcfc1d971735c79898523"
                ];

            report = report + 'Customer form set to be checked:\n ' + JSON.stringify( affectedForms, undefined, 2 ) + '\n\n';

            async.eachSeries( affectedForms, correctSingleForm, onAllDone );

            function correctSingleForm( canonicalId, itcb ) {

                async.series( [ fixCanonical, fixVersions ], onFormDone );

                function fixCanonical( _cb ) {
                    function onCanonicalFixed( err, reportFragment ) {
                        report = report + reportFragment + '\n';
                        if ( err ) {
                            Y.log( 'Error correcting form: ' + JSON.stringify( err ), 'warn', NAME );
                            //  continue
                            _cb( null );
                            return;
                        }
                        _cb( null );
                    }
                    fixElementBordersCanonical( user, canonicalId, inMigration, onCanonicalFixed );
                }

                function fixVersions( _cb ) {
                    function onCanonicalFixed( err, reportFragment ) {
                        report = report + reportFragment + '\n';
                        if ( err ) {
                            Y.log( 'Error correcting form: ' + JSON.stringify( err ), 'warn', NAME );
                            //  continue
                            itcb( null );
                            return;
                        }
                        _cb( null );
                    }
                    fixElementBordersVersions( user, canonicalId, inMigration, onCanonicalFixed );
                }

                function onFormDone( err ) {
                    if ( err ) {
                        Y.log( 'Error correcting element borders in form ' + canonicalId + ': ' + err, 'warn', NAME );
                        //  continue process
                        itcb( null );
                        return;
                    }
                    itcb( null );
                }

            }

            function onAllDone( err ) {
                Y.log( '\n\n' + report + '\n\n', 'debug', NAME );
                Y.log( 'Completed correcting all element borders in customer forms.', 'debug', NAME );
                callback( err, report);
            }

        }

        function fixElementBordersCanonical( user, canonicalId, inMigration, callback ) {
            var report = '';

            Y.log( 'Checking form ' + canonicalId, 'debug', NAME );
            report = report + 'Checking form ' + canonicalId + ' (canonical)...\n';

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'formtemplate',
                'query': { '_id': canonicalId },
                'migrate': inMigration,
                'callback': onCanonicalFormLoaded
            } );

            function onCanonicalFormLoaded( err, result ) {
                if ( err ) {
                    report = report + 'Error loading form ' + canonicalId + ': ' + JSON.stringify( err ) + '\n';
                    Y.log( 'Error loading form ' + canonicalId + ': ' + JSON.stringify( err ), 'warn', NAME );
                    callback( err, report );
                    return;
                }

                if ( 0 === result.length ) {
                    report = report + '  (i) Form ' + canonicalId + ' not found in this set\n';
                    callback( null, report );
                    return;
                }

                var
                    template = result[0] || {},
                    jt = template.jsonTemplate || {},
                    jtname = jt.name || {},
                    nameDe = jtname.de || ( 'UNTITLED' ),
                    reportFragment;

                report = report + '  (i) Loaded formtemplate ' + canonicalId + ' (' + nameDe + '), making all borders transparent...\n';

                //  make element borders transparent
                reportFragment = '' + fixElementBordersJsonTemplate( template );
                report = report + reportFragment;

                if ( -1 !== reportFragment.indexOf( 'TEMPLATE-HAS-NO-CHANGES' ) ) {
                    //  no need to save
                    report = report + '  (i) no changes made, not saving.\n';
                    callback( null, report );
                    return;
                }

                //  save back to the database
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'action': 'put',
                    'model': 'formtemplate',
                    'query': { '_id': template._id + '' },
                    'fields': [ 'jsonTemplate' ],
                    'data': {
                        'fields_': [ 'jsonTemplate' ],
                        'skipcheck_': true,
                        'jsonTemplate': template.jsonTemplate
                    },
                    'options': {
                        'limit': 1,
                        'ignoreReadOnly': ['jsonTemplate']
                    },
                    'migrate': inMigration,
                    'callback': onCanonicalSaved
                } );
            }

            function onCanonicalSaved( err ) {
                if ( err ) {
                    report = report + '  (!) Error saving canonical template: ' + JSON.stringify( err ) + '\n';
                    Y.log( 'Error saving canonical template: ' + JSON.stringify( err ), 'warn', NAME );
                    callback( err );
                    return;
                }

                report = report + '  (i) Saved canonical template ' + canonicalId + ' back to database\n';
                callback( null, report );
            }

        }

        function fixElementBordersVersions( user, canonicalId, inMigration, callback ) {
            var report = '';

            Y.log( 'Checking form versions of ' + canonicalId, 'debug', NAME );
            report = report + 'Checking form versions of ' + canonicalId + ' (canonical)...\n';

            Y.doccirrus.mongodb.runDb( {
                'user': user,
                'model': 'formtemplateversion',
                'query': { 'canonicalId': canonicalId },
                'migrate': inMigration,
                'callback': onFormVersionsLoaded
            } );

            function onFormVersionsLoaded( err, result ) {
                if ( err ) {
                    report = report + 'Error loading form ' + canonicalId + ': ' + JSON.stringify( err ) + '\n';
                    Y.log( 'Error loading form ' + canonicalId + ': ' + JSON.stringify( err ), 'warn', NAME );
                    callback( err, report );
                    return;
                }

                if ( 0 === result.length ) {
                    report = report + '  (i) No versions of form ' + canonicalId + ' found in this set\n';
                    callback( null, report );
                    return;
                }

                report = report + '  (i) Loaded ' + result.length + ' versions of form ' + canonicalId + '\n';

                async.eachSeries( result, fixSingleVersion, onAllVersionsFixed );
            }

            function fixSingleVersion( template, itcb ) {
                var reportFragment;
                report = report + '  (i) Correcting version ' + template._id + ' of form ' + canonicalId + ', making all borders transparent...\n';

                //  make element borders transparent
                reportFragment = '' + fixElementBordersJsonTemplate( template );
                report = report + reportFragment;

                if ( -1 !== reportFragment.indexOf( 'TEMPLATE-HAS-NO-CHANGES' ) ) {
                    //  no need to save
                    report = report + '  (i) no changes made, not saving.\n';
                    itcb( null );
                    return;
                }

                //  save back to the database
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'action': 'put',
                    'model': 'formtemplateversion',
                    'query': { '_id': template._id + '' },
                    'fields': [ 'jsonTemplate' ],
                    'data': {
                        'fields_': [ 'jsonTemplate' ],
                        'skipcheck_': true,
                        'jsonTemplate': template.jsonTemplate
                    },
                    'options': {
                        'limit': 1,
                        'ignoreReadOnly': ['jsonTemplate']
                    },
                    'migrate': inMigration,
                    'callback': onVersionSaved
                } );

                function onVersionSaved( err ) {
                    if ( err ) {
                        report = report + '  (!) Error saving formtemplateversion ' + template._id + ': ' + JSON.stringify( err ) + '\n';
                        Y.log( 'Error saving formtemplateversion ' + template._id + ': ' + JSON.stringify( err ), 'debug', NAME );
                        itcb( err );
                        return;
                    }
                    report = report + '  (*) Saved formtemplateversion back to database ' + template._id + '\n\n';
                    itcb( null );
                }
            }

            function onAllVersionsFixed( err ) {
                if ( err ) {
                    report = report + '  (!) Error saving formtemplateversions: ' + JSON.stringify( err ) + '\n';
                    Y.log( 'Error saving formtemplateversions: ' + JSON.stringify( err ), 'warn', NAME );
                    callback( err );
                    return;
                }

                report = report + '  (i) Completed update of versions of form ' + canonicalId + '\n';
                Y.log( 'Completed update of versions of form ' + canonicalId, 'debug', NAME);
                callback( null, report );
            }
        }

        /**
         *  Make all element borders transparent
         *
         *  @param  template    {Object}    A formtemplate or formteplateversion object
         */

        function fixElementBordersJsonTemplate( template ) {
            var
                hasChanges = false,
                report = '',
                jt = template.jsonTemplate || {},
                pages = jt.pages || [],
                page,
                element,
                i, j;

            for ( i = 0; i < pages.length; i++ ) {
                report = report + '  (i) Checking page: ' + i + '...\n';
                page = pages[i];
                for ( j = 0; j < page.elements.length; j++ ) {
                    element = page.elements[j];

                    if ( element.borderColor && '' !== element.borderColor && 'rgba(0, 0, 0, 0)' !== element.borderColor ) {
                        report = report + '  (i) element ' + (element.id || 'NOID') + ' (' + ( element.type || 'UNKNOWN' ) + ') has border ' + element.borderColor + ' setting to rgba(0, 0, 0, 0)\n';
                        element.borderColor = 'rgba(0, 0, 0, 0)';
                        hasChanges = true;
                    }
                }
            }

            report = report + '  (^) ' + ( hasChanges ? 'TEMPLATE-HAS-CHANGES' : 'TEMPLATE-HAS-NO-CHANGES' ) + '\n';

            return report;
        }

        /**
         *  Replace and unset all English translations in forms to remove bad/legacy data
         *
         *  This is intended to only be run manually in order to produce a clean forms export
         *
         *  @param  user                {Object}    REST user or equivalent
         *  @param  options             {Object}    Extra options, dev
         *  @param  options.replaceText {Boolean}   Set true if english texts are to be replaced by German texts
         *  @param  inMigration         {Boolean}   Set true if called from migrate.server.js
         *  @param  callback            {Function}  Of the form fn( err, report )
         */

        function setAllToGerman( user, options, inMigration, callback ) {
            var
                reportStr = 'Setting all form translations to German\n',
                currentId,
                currentObj,
                currentCollection,
                lineCount = 0,
                formList;

            async.series( [ listAllForms, correctAllForms ], onAllDone );

            function listAllForms( itcb ) {
                Y.dcforms.getFormList( user, true, onFormListLoaded );
                function onFormListLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    formList = result;
                    itcb( null );
                }
            }

            function correctAllForms( itcb ) {
                async.eachSeries( formList, correctSingleForm, itcb );
            }

            function correctSingleForm( formMeta, _cb ) {
                addLine( 'i', 'Checking form ' + formMeta._id + ' / ' + formMeta.category + ' / ' + formMeta.title.de );

                async.series( [ loadSingleForm, replaceTranslations, saveSingleForm, correctAllVersions ], onFormDone );

                function loadSingleForm( itcb ) {
                    currentCollection = 'formtemplate';
                    currentId = formMeta._id;
                    loadFormObj( itcb );
                }

                function replaceTranslations( itcb ) {
                    replaceTranslationsSync();
                    itcb( null );
                }

                function saveSingleForm( itcb ) {
                    saveFormObj( itcb );
                }

                function correctAllVersions( itcb ) {
                    addLine( 'i', 'Checking previous versions of ' + currentId );
                    loadAllVersions( currentId, onVersionsLoaded );
                    function onVersionsLoaded( err, result ) {
                        if ( err ) { return itcb( err ); }
                        addLine( 'i', 'Found ' + result.length + ' previous versions of form ' + currentId );
                        async.eachSeries( result, correctSingleFormVersion, itcb );
                    }
                }

                function onFormDone( err ) {
                    if ( err ) {
                        return _cb( err );
                    }
                    addLine( 'i', 'Completed invalidation of english translations for ' + currentCollection + '::' + currentId + "\n" );
                    addLine( '-', '-'.repeat(100) );
                    _cb( null );
                }
            }

            function correctSingleFormVersion( formVersionObj, _cb ) {
                addLine( '-', '.'.repeat(100) );
                addLine( 'i', 'Correcting version ' + formVersionObj.version + ' of ' + formVersionObj.canonicalId );
                currentCollection = 'formtemplateversion';
                currentId = formVersionObj._id;
                currentObj = formVersionObj;

                replaceTranslationsSync();
                saveFormObj( _cb );
            }

            /**
             *  Load the object specified by currentCollection and currentId (may be formtemplate or formtemplateversion)
             *  @param itcb
             */

            function loadFormObj( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': currentCollection,
                    'query': { _id: currentId },
                    'options': { 'lean': true },
                    'migrate': inMigration,
                    'callback': onObjLoaded
                } );

                function onObjLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    if ( !result || !result[0] ) { return itcb( 'Missing object: ' + currentCollection + '::' + currentId ); }
                    currentObj = JSON.parse( JSON.stringify( result[0] ) );
                    itcb( null );
                }
            }

            function replaceTranslationsSync( ) {
                var
                    pages = currentObj.jsonTemplate.pages,
                    page,
                    elements,
                    elem,
                    en, de,
                    de_f, de_m,
                    i, j;

                addLine( 'd', 'Entering replaceTranslationsSync' );

                for ( i = 0; i < pages.length; i++ ) {
                    page = pages[i];
                    addLine( '-', 'checking page ' + i );

                    //  set any background page from the 'de' value (always applied)
                    if ( page.bgImgT && page.bgImgT.de && page.bgImgT.de !== page.bgImgT.en ) {
                        addLine( 'i', 'Set background image from German value: ' + page.bgImgT.de );
                        page.bgImgT.en = page.bgImgT.de;
                    }

                    if ( page.bgImgNameT && page.bgImgNameT.de && page.bgImgNameT.de !== page.bgImgNameT.en ) {
                        addLine( 'i', 'Set background image name from German value: ' + page.bgImgNameT.de );
                        page.bgImgNameT.en = page.bgImgNameT.de;
                    }

                    //  consider all elements
                    elements = page.elements;
                    for ( j = 0; j < elements.length; j++ ) {

                        elem = elements[j];

                        if ( !elem.defaultValue ) {
                            elem.defaultValue = {
                                'en': '',
                                'de': ''
                            };
                        }

                        en = elem.defaultValue.en;
                        de = elem.defaultValue.de;
                        de_f = elem.defaultValue.de_f || elem.defaultValue.de;
                        de_m = elem.defaultValue.de_m || elem.defaultValue.de;

                        //  mark all German translations clean, and all English translations dirty (always appled)

                        if ( !elem.translationDirty ) {
                            addLine( 'i', 'Initialized dirty state for translations on: ' + elem.elemId );
                            elem.translationDirty = {};
                        }

                        addLine( '.','Invalidating genderised text on element ' + elem.id );

                        elem.translationDirty.en = true;
                        elem.translationDirty.de_f = true;
                        elem.translationDirty.de_m = true;
                        elem.translationDirty.de = false;

                        //  replace any default English captions (always applied)

                        if ( 'caption' === en || 'default' === en ) {
                            addLine( 'i', 'Clearing default value of form element, en: ' + en + ' (' + elem.id + ')' );
                            elem.defaultValue.en = '';
                            en = '';
                        }

                        if ( 'caption' === de_f || 'default' === de_f ) {
                            addLine( 'i', 'Clearing default value of form element, de_f: ' + de_f + ' (' + elem.id + ')' );
                            elem.defaultValue.de_f = '';
                            de_f = '';
                        }

                        if ( 'caption' === de_m || 'default' === de_m ) {
                            addLine( 'i', 'Clearing default value of form element, de_m: ' + de_m + ' (' + elem.id + ')' );
                            elem.defaultValue.de_m = '';
                            de_m = '';
                        }

                        //  replace any english or genderized values with german ones (conditionally applied)

                        if ( options.replaceText && de && en !== de ) {
                            elem.defaultValue.en = de;
                            addLine( 'i', 'setting value of en ' + elem.id + ' from de: ' + elem.defaultValue.en + ' was: ' + en );
                        }

                        if ( options.replaceText && de && de_f !== de ) {
                            elem.defaultValue.de_f = de;
                            addLine( 'i', 'setting value of de_f ' + elem.id + ' from de: ' + elem.defaultValue.de_f + ' was: ' + en );
                        }

                        if ( options.replaceText && de && de_m !== de ) {
                            elem.defaultValue.de_m = de;
                            addLine( 'i', 'setting value of de_m ' + elem.id + ' from de: ' + elem.defaultValue.de_m + ' was: ' + en );
                        }

                        //  correct any missing subtemplates (always applied )

                        if ( 'subform' === elem.type ) {
                            if ( '' === elem.defaultValue.en ) {
                                addLine( 'i', 'Making personalienfeld subform explicit (en): ' + elem.id );
                                elem.defaultValue.en = 'casefile-personalienfeld';
                            }
                            if ( '' === elem.defaultValue.de ) {
                                addLine( 'i', 'Making personalienfeld subform explicit (de): ' + elem.id );
                                elem.defaultValue.de = 'casefile-personalienfeld';
                            }
                        }

                    }
                }
            }

            //  save a form object back to the database after english translations have been invalidated
            function saveFormObj( itcb ) {

                var
                    putData = {
                        'jsonTemplate': currentObj.jsonTemplate,
                        'fields_': [ 'jsonTemplate' ]
                    };

                putData = Y.doccirrus.filters.cleanDbObject( putData );

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'action': 'put',
                    'model': currentCollection,
                    'query': { '_id': currentId },
                    'data': putData,
                    'migrate': inMigration,
                    'callback': onObjectUpdated
                } );

                function onObjectUpdated( err /*, result */ ) {
                    if ( err ) { return itcb( err ); }
                    addLine( '!', 'Saved form object ' + currentCollection + '::' + currentId );
                    itcb( null );
                }
            }

            //  load all versions of a form
            function loadAllVersions( canonicalId, itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'formtemplateversion',
                    'query': { 'canonicalId': canonicalId },
                    'options': { 'lean': true },
                    'migrate': inMigration,
                    'callback': itcb
                } );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not automatically unset English translations in forms: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                addLine( '-', 'Finished migration to clear English translations from forms on tenant: ' + user.tenantId );

                callback( null, reportStr );
            }

            function addLine( ico, txt ) {
                reportStr = reportStr + '[' + ico + ico + '] ' + txt + "\n";
                Y.log( lineCount + ': [' + ico + ico + '] ' + txt, 'debug', NAME );
                lineCount = lineCount + 1;
            }

        }

        /**
         *  For all form templates and versions, make all form templates read-only
         *  @param args
         */

        function makeTablesReadOnly( user, inMigration, callback ) {
            var
                reportStr = 'Making all tables read-only in forms\n',
                currentId,
                currentObj,
                currentCollection,
                lineCount = 0,
                formList;

            async.series( [ listAllForms, correctAllForms ], onAllDone );

            function listAllForms( itcb ) {
                var
                    apiArgs = {
                        'user': user,
                        'originalParams': {},
                        'inMigration': inMigration,
                        'callback': onFormListLoaded
                    };

                Y.doccirrus.api.formtemplate.listforms( apiArgs );

                function onFormListLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    formList = result;
                    itcb( null );
                }
            }

            function correctAllForms( itcb ) {
                async.eachSeries( formList, correctSingleForm, itcb );
            }

            function correctSingleForm( formMeta, _cb ) {
                var needsSave;

                addLine( 'i', 'Checking form ' + formMeta._id + ' / ' + formMeta.category + ' / ' + formMeta.title.de );

                async.series( [ loadSingleForm, lockAllTables, saveSingleForm, correctAllVersions ], onFormDone );

                function loadSingleForm( itcb ) {
                    currentCollection = 'formtemplate';
                    currentId = formMeta._id;
                    loadFormObj( itcb );
                }

                function lockAllTables( itcb ) {
                    needsSave = lockAllTablesSync();
                    itcb( null );
                }

                function saveSingleForm( itcb ) {
                    //  if no editable tables then we don't need to update this
                    if ( !needsSave ) { return itcb( null ); }
                    saveFormObj( itcb );
                }

                function correctAllVersions( itcb ) {
                    addLine( 'i', 'Checking previous versions of ' + currentId );
                    loadAllVersions( currentId, onVersionsLoaded );
                    function onVersionsLoaded( err, result ) {
                        if ( err ) { return itcb( err ); }
                        addLine( 'i', 'Found ' + result.length + ' previous versions of form ' + currentId );
                        async.eachSeries( result, correctSingleFormVersion, itcb );
                    }
                }

                function onFormDone( err ) {
                    if ( err ) {
                        return _cb( err );
                    }
                    addLine( 'i', 'Marked all tables read-only on formTemplate::' + formMeta._id + "\n" );
                    addLine( '-', '-'.repeat(100) );
                    _cb( null );
                }
            }

            function correctSingleFormVersion( formVersionObj, _cb ) {
                var needsSave;

                addLine( '-', '.'.repeat(100) );
                addLine( 'i', 'Locking tables on form version ' + formVersionObj.version + ' of ' + formVersionObj.canonicalId );
                currentCollection = 'formtemplateversion';
                currentId = formVersionObj._id;
                currentObj = formVersionObj;

                needsSave = lockAllTablesSync();

                //  if form version does not contain an editable table then no need to save
                if (!needsSave ) { return _cb( null ); }

                saveFormObj( _cb );
            }

            /**
             *  Load the object specified by currentCollection and currentId (may be formtemplate or formtemplateversion)
             *  @param itcb
             */

            function loadFormObj( itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': currentCollection,
                    'query': { _id: currentId },
                    'options': { 'lean': true },
                    'migrate': inMigration,
                    'callback': onObjLoaded
                } );

                function onObjLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }
                    if ( !result || !result[0] ) { return itcb( 'Missing object: ' + currentCollection + '::' + currentId ); }
                    currentObj = JSON.parse( JSON.stringify( result[0] ) );
                    itcb( null );
                }
            }

            //  returns true if tables locked, false if no change made
            function lockAllTablesSync( ) {
                var
                    needsSave = false,
                    pages = currentObj.jsonTemplate.pages,
                    page,
                    elements,
                    elem,
                    i, j;

                for ( i = 0; i < pages.length; i++ ) {
                    page = pages[i];
                    addLine( '-', 'checking page ' + i );

                    //  consider all elements
                    elements = page.elements;
                    for ( j = 0; j < elements.length; j++ ) {
                        elem = elements[j];
                        //  mark all tables read-only (casts required due to mongoose)
                        if ( 'table' === String( elem.type ) && "true" !== elem.readonly ) {
                            addLine( 'i', 'Set table read-only: ' + elem.id );
                            elem.readonly = "true";
                            needsSave = true;
                        }

                    }
                }

                return needsSave;
            }

            //  save a form object back to the database after english translations have been invalidated
            function saveFormObj( itcb ) {

                var
                    putData = {
                        'jsonTemplate': currentObj.jsonTemplate,
                        'fields_': [ 'jsonTemplate' ]
                    };

                putData = Y.doccirrus.filters.cleanDbObject( putData );

                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'action': 'put',
                    'model': currentCollection,
                    'query': { '_id': currentId },
                    'data': putData,
                    'migrate': inMigration,
                    'callback': onObjectUpdated
                } );

                function onObjectUpdated( err /*, result */ ) {
                    if ( err ) { return itcb( err ); }
                    addLine( '!', 'Saved form object ' + currentCollection + '::' + currentId );
                    itcb( null );
                }
            }

            //  load all versions of a form
            function loadAllVersions( canonicalId, itcb ) {
                Y.doccirrus.mongodb.runDb( {
                    'user': user,
                    'model': 'formtemplateversion',
                    'query': { 'canonicalId': canonicalId },
                    'options': { 'lean': true },
                    'migrate': inMigration,
                    'callback': itcb
                } );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not automatically make all tables read-only in forms: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                addLine( '-', 'Finished migration to mark all tables read-only on tenant: ' + user.tenantId );

                callback( null, reportStr );
            }

            function addLine( ico, txt ) {
                reportStr = reportStr + '[' + ico + ico + '] ' + txt + "\n";
                Y.log( lineCount + ': [' + ico + ico + '] ' + txt, 'debug', NAME );
                lineCount = lineCount + 1;
            }

        }

        /**
         *  Migration to reassign forms from static to user-definable / nestable forms
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   inMigration
         */

        async function setFormFolderIds( user, inMigration ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                defaultFolders = Y.doccirrus.schemas.formfolder.defaultFormFolders;

            let
                formTemplateModel,
                formTemplateCursor,
                formTemplate,
                folder,
                folderId,
                err;

            Y.log( `Starting migration to set formFolderId on form templates for tenant: ${user.tenantId}`, 'info', NAME );

            //  1.  Initialize default form folders

            [ err ] = await formatPromiseResult( Y.doccirrus.api.formfolder.checkDefaultFolders( user, inMigration ) );

            if ( err ) {
                Y.log( `Could not initialize default form folders: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            //  2.  Get mongoose model of form templates

            [ err, formTemplateModel ] = await formatPromiseResult( getModelP( user, 'formtemplate', inMigration ) );

            if ( err ) {
                Y.log( `Could not create formtemplate model: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            //  2.  Stream all forms which do not have a formFolderId and set one

            Y.log( `Completed migration to set formFolderId on form templates for tenant ${user.tenantId}.`, 'info', NAME );

            formTemplateCursor = formTemplateModel.mongoose.find( { formFolderId: { $exists: false } } ).cursor();

            while ( formTemplate = await formTemplateCursor.next() ) {  // eslint-disable-line no-cond-assign
                Y.log( `Checking form template ${formTemplate._id} ${formTemplate.category}` );

                folderId = '000000000000000000000699';      //  "Recovered" folder for lost and found items

                for ( folder of defaultFolders ) {
                    if ( folder.canonical === formTemplate.category ) {
                        folderId = folder._id;
                    }
                }

                Y.log( `Initializing form folder ID of ${formTemplate._id} ${formTemplate.category} to ${folderId}` );

                [ err ] = await formatPromiseResult(
                    formTemplateModel.mongoose.update(
                        { _id: formTemplate._id },
                        { $set: { formFolderId: folderId } }
                    ).exec()
                );

                if ( err ) {
                    Y.log( `Problem updating formTemplate ${formTemplate._id.toString()}: ${err.stack||err}`, 'error', NAME );
                }
            }

        }

        /**
         *  Migration to set form folder license
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   inMigration
         */

        async function setFormFolderLicence( user, inMigration ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                defaultFolders = Y.doccirrus.schemas.formfolder.defaultFormFolders,
                compareFolders = (id) => {
                    return (folder) => folder._id.toString() === id;
                };

            let
                formFoldersModel,
                formFoldersCursor,
                formFolder,
                err;

            Y.log( `Starting migration to set form folder licence on form templates for tenant: ${user.tenantId}`, 'info', NAME );

            //  1.  Get mongoose model of formfolders

            [ err, formFoldersModel ] = await formatPromiseResult( getModelP( user, 'formfolder', inMigration ) );

            if ( err ) {
                Y.log( `Could not create formFolder model: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            //  2.  Stream all folders which do not have a licence and set one

            formFoldersCursor = formFoldersModel.mongoose.find( { formFolderId: { $exists: false } } ).cursor();

            while ( formFolder = await formFoldersCursor.next() ) {  // eslint-disable-line no-cond-assign
                Y.log( `Checking folder ${formFolder._id} ${formFolder.en}` );
                let defaultFolder = defaultFolders.find(compareFolders(formFolder._id.toString()));

                if (!defaultFolder) {
                    Y.log( `Form folder ${formFolder._id.toString()} is not default, licence setup skipped`, 'info', NAME );
                    break;
                }

                [ err ] = await formatPromiseResult(
                    formFoldersModel.mongoose.update(
                        { _id: formFolder._id },
                        { $set: { licence: defaultFolder.licence || "" } }
                    ).exec()
                );

                if ( err ) {
                    Y.log( `Problem updating formFolder ${formFolder._id.toString()}: ${err.stack||err}`, 'error', NAME );
                }
            }

            Y.log( `Completed migration to set form folders licence  for tenant ${user.tenantId}.`, 'info', NAME );
        }

        /**
         *  Migration to set form folder countryMode
         *
         *  @param  {Object}    user
         *  @param  {Boolean}   inMigration
         */

        async function setFormFolderCountryMode( user, inMigration ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                ObjectId = require( 'mongoose' ).Types.ObjectId,
                ids = ["000000000000000000000606", "000000000000000000000607", "000000000000000000000601"];

            let err, formFoldersModel;

            Y.log( `Starting migration to set form folder country mode for tenant: ${user.tenantId}`, 'info', NAME );

            //  1.  Get mongoose model of formfolders

            [ err, formFoldersModel ] = await formatPromiseResult( getModelP( user, 'formfolder', inMigration ) );

            if ( err ) {
                Y.log( `Could not create formFolder model: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            ids.forEach(async (_id)=> {
                [ err ] = await formatPromiseResult(
                    formFoldersModel.mongoose.update(
                        { _id: new ObjectId(_id) },
                        { $set: { countryMode: [ "D" ] } }
                    ).exec()
                );

                if ( err ) {
                    Y.log( `Problem updating formFolder ${_id.toString()}: ${err.stack||err}`, 'error', NAME );
                }
            });


            Y.log( `Completed migration to set form folders countryMode  for tenant ${user.tenantId}.`, 'info', NAME );
        }
        /*
         *  Share this with the rest of mojito
         */

        Y.namespace( 'doccirrus.forms' ).migrationhelper = {
            migrateDBForms,
            migrateOwners,

            addFormDependencies,
            clearFormDependencies,

            updateFormDocumentFormat,
            checkOrAddAllFormatVersions,
            checkOrAddFormFormatVersion,
            testBatchUndoDuplicateMigration,

            setFormImagesReadOnly,
            fixElementBorders,
            setAllToGerman,
            makeTablesReadOnly,

            setFormFolderIds,
            setFormFolderLicence,
            addFormDeps,
            setFormFolderCountryMode
        };

    },
    '0.0.1', {requires: [ 'dcmedia-store', 'document-api', 'dcforms-confighelper', 'dcforms-exportutils' ]}
);