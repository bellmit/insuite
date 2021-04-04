/**
 *  Added to move REST actions from controller.server.js to new REST API
 *
 *  TODO: use cacheFormList with IPC, keep a central copy on master
 *
 *  User: strix
 *  (c) 2014, Doc Cirrus GmbH, Berlin
 */

/*jshint latedef:false */
/*global YUI */
/*eslint-disable no-unused-vars */


YUI.add( 'formtemplate-api', function( Y , NAME ) {
        const
            //Promise = require('bluebird'),
            async = require( 'async' ),
            { formatPromiseResult, promisifyArgsCallback, handleResult } = require( 'dc-core' ).utils,
            util = require('util');

        let
            cacheFormList = null;

        /**
         *  Create a brand new user form in the database (will also create the first version in history)
         *  @param args
         */

        function createForm(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.createForm', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.createForm');
            }
            var
                params = args.originalParams,
                template = params.template,
                dbSetup = {
                    'user': args.user,
                    'action': 'post',
                    'model': 'formtemplate',
                    'options': { 'overwrite': true }
                },
                formTitle =  (template.name && template.name.de ) ? template.name.de : 'untitled',
                dbObj = {
                    'category': template.category,
                    'formFolderId': template.formFolderId,
                    'jsonTemplate': template || {},
                    'name': template.name,
                    'title': formTitle,                //  deprecated
                    'formId': template.formId ? template.formId : `${formTitle}.form`,                       //  deprecated
                    'userId': args.user.identityId,
                    'instanceId': params.instanceId || '',                                  //  deprecated
                    'latestVersionId': 'placeholder',
                    'version': parseInt(template.version ? template.version : '0', 10),
                    'revision': parseInt(template.revision ? template.revision : '0', 10),
                    'tCreated': new Date(),
                    'tModified': new Date(),
                    'formatVersion': 1.1
                },
                err = null;

            //  check the request (instanceId is deprecated, planned for removal)
            if ( !params.template ) { err = Y.doccirrus.errors.rest( 500, 'template not given', true ); }
            if ( isNaN( template.version ) || isNaN( template.revision ) ) { err = Y.doccirrus.errors.rest( 500, 'Could not set version of new form', true ); }

            if ( err ) {
                args.callback( err );
                return;
            }

            //  clear the forms list cache
            clearFormListCache();

            //  save a new formtemplate
            Y.log('Saving: ' + JSON.stringify(dbObj, undefined, 2), 'debug', NAME);
            Y.log('Saving new form: ' + JSON.stringify(dbObj.title), 'debug', NAME);

            dbSetup.data = Y.doccirrus.filters.cleanDbObject(dbObj);
            Y.doccirrus.mongodb.runDb(dbSetup, onTemplateCreated);

            //  create a new version

            function onTemplateCreated(err, data) {
                if (err) { return onFailure( err ); }
                if (0 === data.length) { return onFailure( Y.doccirrus.errors.rest( 500, 'Could not create new template, unknown db error', true ) ); }

                Y.log('Created form: ' + JSON.stringify(data[0]), 'info', NAME);
                dbObj._id = data[0];
                Y.doccirrus.forms.historyutils.addVersion( args.user, dbObj, Y.doccirrus.i18n('FormEditorMojit.form_history.COMMENT'), onVersionCreated );
            }

            //  create a new version

            function onVersionCreated(err, newVersionId, newVersionNumber) {
                if (err) {
                    Y.log('Could not create first version of new form: ' + JSON.stringify(err), 'debug', NAME);
                    args.callback(err);
                    return;
                }

                Y.log('Created initial version of form: ' + newVersionNumber + ' := ' + newVersionId, 'info', NAME );

                var newFormIdentifiers = {
                    '_id': dbObj._id,
                    'latestVersionId': newVersionId,
                    'version': newVersionNumber
                };

                args.callback(null, newFormIdentifiers);
            }

            function onFailure(err) {
                Y.log( 'Problem creating form: ' + JSON.stringify(err), 'warn', NAME );
                args.callback(err);
            }

        }

        /**
         *  Load a form template or version from the database
         *
         *  Expected parameters:
         *
         *      id          {String}    Identifies a canonical form and its family of revisions
         *      versionId   {String}    Identifies a specific version of a form
         *
         *  @param args
         */

        function loadForm(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.loadForm', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.loadForm');
            }
            var
                params = args.originalParams,
                canonicalId = params.id || '',
                versionId = params.versionId || '',
                modelName = ('' !== versionId) ? 'formtemplateversion' : 'formtemplate',
                allowRetry = true,
                formTemplate;

            Y.log('Called loadform with templateId ' + canonicalId + ' versionId: ' + versionId, 'info', NAME);

            //  check params
            canonicalId = canonicalId.replace(/"/g, '');  //  have sometimes been quotes in the past

            if ('' === canonicalId) {
                args.callback( Y.doccirrus.errors.rest( 500, 'form template id not given', true ) );
                return;
            }

            var
                dbSetup = {
                    'user': args.user,
                    'model': modelName,
                    'action': 'get',
                    'query': {'_id': (('' !== versionId) ? versionId : canonicalId)}
                };

            Y.doccirrus.mongodb.runDb(dbSetup, onFormLoaded);

            function onFormLoaded(err, data) {
                if (err) {
                    args.callback(err);
                    return;
                }

                if (0 === data.length) {

                    //  Could not find this form or version, may not have been imported,
                    //  try for current canonical version

                    if (true === allowRetry && 'formtemplateversion' === modelName) {
                        Y.log('Could not load specified form version, trying for latest version...', 'warn', NAME );
                        allowRetry = false;
                        dbSetup.model = 'formtemplate';
                        dbSetup.query = {'_id': canonicalId};
                        Y.doccirrus.mongodb.runDb(dbSetup, onFormLoaded);
                        return;
                    } else {
                        return args.callback( Y.doccirrus.errors.rest( 404, 'Form template or version not found.', true ) );
                    }
                }

                Y.log( 'Database query returns ' + data.length + ' results', 'debug', NAME );

                formTemplate = data[0];

                //  should no longer happen
                if (!formTemplate.jsonTemplate) {
                    args.callback( Y.doccirrus.errors.rest( 500, 'Invalid form in database _id: ' + canonicalId + ' versionId: ' + versionId, true ) );
                    return;
                }

                //  fixes a legacy issue with mismatched form versions and revision numbers
                formTemplate.jsonTemplate.version = formTemplate.version;
                formTemplate.jsonTemplate.revision = formTemplate.revision;

                formTemplate.userId = 'redacted';
                args.callback(null, formTemplate);

            }
        }

        /**
         *  Save a revision to a formtemplate object
         *
         *  Note that this updates the canonical current copy of the form, does not create a new version, changes
         *  should not be visible in - eg - CaseFile until a new version is created.
         */

        function saveForm(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.saveForm', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.saveForm');
            }
            var
                params = args.originalParams,
                id = params.id || '',
                template = params.template || null,
                defaultFor = '',
                dbSetup = {
                    'user': args.user,
                    'model': 'formtemplate',
                    'action': 'put',
                    'query': { '_id': id }
                },
                saveData;


            if ('' === id) { args.callback('form template ID not given'); return; }
            if (!template) { args.callback('template not given'); return; }

            //  update basic object

            saveData = {
                'userId': args.user.identityId,
                'formId': id,
                'fields_': ['jsonTemplate', 'category', 'version', 'revision', 'formId', 'isReadOnly', 'formatVersion'],
                'category': template.category,
                'isReadOnly': template.isReadOnly,
                'version': template.version,
                'revision': template.revision,
                'jsonTemplate': template,
                'formatVersion': 1.1
            };

            //  legacy field, still maintained for some functionality until it can be refactored away, MOJ-12276
            saveData.formId = id;
            saveData.jsonTemplate.formId = id;

            if (!saveData.jsonTemplate.defaultFor) {
                saveData.jsonTemplate.defaultFor = '';
            }

            defaultFor = saveData.jsonTemplate.defaultFor;

            //Y.log('Saving: ' + JSON.stringify(saveData, undefined, 2), 'debug', NAME);
            dbSetup.data = Y.doccirrus.filters.cleanDbObject(saveData);

            Y.doccirrus.mongodb.runDb(dbSetup, onTemplateStored);

            //  Make any changes needed to role assignments
            function onTemplateStored(err) {
                if (err) { args.callback(err); return; }
                Y.log('Saved / updated form: ' + id + ' (' + JSON.stringify(template.name) + ')', 'debug', NAME);
                Y.doccirrus.formsconfig.notifyConfigChange(args.user, defaultFor, id, onRoleAssigned);
            }

            //  Return canonicalId to the client
            function onRoleAssigned(err) {
                if (err) {
                    Y.log('Error assigning form role after save: ' + err, 'warn', NAME);
                }

                Y.doccirrus.forms.exportutils.loadDependencies(args.user, 'formtemplate', id, onOwnDepsLoaded);
            }

            function onOwnDepsLoaded(err, dependsOn) {
                if (err) {
                    Y.log('Could not load immediate dependencies of form: ' + JSON.stringify(err), 'warn', NAME);
                    args.callback(err);
                    return;
                }

                Y.log('Loaded immediate dependencies: ' + "\n" + dependsOn, 'debug', NAME);

                Y.doccirrus.forms.exportutils.loadSecondaryDependencies(args.user, dependsOn, onSecondaryDepsLoaded);
            }

            function onSecondaryDepsLoaded(err, dependsOn) {
                if (err) {
                    Y.log('Could not load secondary dependencies of form: ' + JSON.stringify(err), 'warn', NAME);
                    args.callback(err);
                    return;
                }

                Y.log('Loaded secondary dependencies: ' + "\n" + JSON.stringify(dependsOn), 'debug', NAME);

                saveData = {
                    'fields_': ['dependsOn'],
                    'dependsOn': dependsOn
                };

                dbSetup.data = Y.doccirrus.filters.cleanDbObject(saveData);
                Y.doccirrus.mongodb.runDb(dbSetup, onDepsUpdated);
            }

            function onDepsUpdated(err) {
                if (err) {
                    Y.log('Error updating form dependencies after save: ' + err, 'warn', NAME);
                }

                args.callback(null, id);
            }

        }

        function createVersion(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.createVersion', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.createVersion');
            }
            var
                params = args.originalParams,
                canonicalId = params.id || '',
                revComment = params.revcomment;

            if ('' === canonicalId) {
                args.callback( Y.doccirrus.errors.rest( 404, 'Please specify a form template to make new verison from.', true ) );
                return;
            }

            clearFormListCache();

            Y.doccirrus.forms.historyutils.addVersionById( args.user, canonicalId, revComment, onVersionCreated);

            function onVersionCreated(err, newVersionId, newVersionNo) {
                if (err) {
                    Y.log('Could not create new version of form: ' + JSON.stringify(err), 'debug', NAME);
                    args.callback( err );
                    return;
                }

                var result = { '_id': canonicalId, 'newVersionId': newVersionId, 'newVersionNo': newVersionNo };

                Y.log( 'Created new version of form: ' + JSON.stringify( newVersionId ) , 'info', NAME );
                args.callback(null, result);
            }

        }

        /**
         *  REST action to list the revision history of a form template
         *
         *  @param  args                        {Object}    As sent by RestController_new.js
         *  @param  args.user                   {Object}    REST user or equivalent
         *  @param  args.originalParams         {Object}
         *  @param  args.originalParams.id      {String}    Database _id of a formtemplate object
         *  @param  args.callback               {Function}  Of the form fn( err, versionList }
         */

        function listVersions( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.listVersions', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.listVersions');
            }
            var params = args.originalParams;

            //  check passed arguments
            if ( !params.hasOwnProperty( 'id' ) ) {
                Y.log( 'Cannot load form history, id not sent', 'warn', NAME );
                return args.callback( Y.doccirrus.errors.rest( 404, 'id not specified', true ) );
            }

            Y.doccirrus.forms.historyutils.listVersions( args.user, params.id, args.callback );
        }

        /**
         *  REST action to get reduced metadata about the latest version of a form, by array of canonicalIds
         *
         *  This metadata is in the same format used for forms tree and form version history listings
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object}    args.originalParams
         *  @param  {Object{    args.originalParams.canonicalIds    Array of form canonicalIds (strings)
         *  @param  {Function}  args.callback                       Of the forn fn( err, versionsMeta )
         *
         */

        function latestVersionMeta( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.latestVersionMeta', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.latestVersionMeta');
            }
            let
                params = args.originalParams,
                canonicalIds = params.canonicalIds || [],
                versionsMeta = [];

            //  check passed arguments
            if ( !params.hasOwnProperty( 'canonicalIds' ) || !Array.isArray( params.canonicalIds ) ) {
                return args.callback( Y.doccirrus.errors.rest( 404, 'canonicalIds not specified', true ) );
            }

            async.eachSeries( canonicalIds, getLatestVersionMeta, onAllDone );

            function getLatestVersionMeta( canonicalId, itcb ) {
                let
                    getFields = {
                        '_id': 1,
                        'jsonTemplate.name': 1,
                        'category': 1,
                        'version': 1,
                        'revision': 1,
                        'revComment': 1,
                        'tCreated': 1
                    },
                    sortFields = {
                        'version': -1,
                        'revision': -1
                    },
                    dbSetup = {
                        'user': args.user,
                        'model': 'formtemplateversion',
                        'action': 'get',
                        'query': { 'canonicalId': canonicalId },
                        'options': {
                            'limit': 1,
                            'fields': getFields,
                            'sort': sortFields
                        }
                    };

                Y.doccirrus.mongodb.runDb( dbSetup, onVersionLoaded );

                function onVersionLoaded( err, result ) {
                    if ( err ) { return itcb( err ); }

                    let meta = result[0];

                    if ( !meta || !meta.jsonTemplate || !meta.jsonTemplate.name ) {
                        err = Y.doccirrus.errors.rest( 404, 'No version found for canonicalId' );
                        return itcb( err );
                    }

                    meta.canonicalId = canonicalId + '';
                    meta.title = meta.jsonTemplate.name;
                    delete meta.jsonTemplate;
                    versionsMeta.push( meta );

                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if (err) {
                    Y.log( 'Problem getting metadata of latest form versions: ' + JSON.stringify(err), 'warn', NAME );
                    return args.callback(err);
                }
                args.callback(null, versionsMeta);
            }
        }

        /**
         *  REST action to generate list database objects this form requires
         *
         *  This list is to be stored on the object and regenerated on save.  This method will generate and return
         *  the list.
         *
         *  @param  args    {Object}    As sent by RestController_new.js
         */

        function listDependencies(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.listDependencies', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.listDependencies');
            }
            var
                params = args.originalParams,
                collection = params.collection || 'formtemplate',
                id = params.id || '';

            if ('' === id) {
                args.callback( Y.doccirrus.errors.rest( 404, 'Please specify a formtemplate id', true ) );
                return;
            }

            Y.doccirrus.forms.exportutils.loadDependencies(args.user, collection, id, onDepsLoaded);

            function onDepsLoaded(err, dependsOn) {
                if (err) {
                    Y.log('Problem loading immediate dependencies: ' + JSON.stringify(err), 'debug', NAME);
                    args.callback(err);
                    return;
                }

                Y.doccirrus.forms.exportutils.loadSecondaryDependencies(args.user, dependsOn, args.callback);
            }
        }

        /**
         *  List forms the current tenant has uploaded or exported to disk
         *  @param args
         */

        function listFormExports(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.listFormExports', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.listFormExports');
            }
            Y.doccirrus.forms.exportutils.listExportDir(
                args.user,
                function onExportsListed( err, data ) {
                    if (err) {
                        Y.log( 'Could not list forms on disk: ' + JSON.stringify(err), 'warn', NAME );
                        args.callback( err );
                        return;
                    }

                    args.callback( null, data );
            });
        }

        /**
         *  Delete contents of form exports directory for this tenanct / instance
         *  @param args
         */

        function clearFormExports(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.clearFormExports', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.clearFormExports');
            }
            function onExportsCleared( err/*, data*/ ) {
                if (err) {
                    Y.log('Could not empty contents of export dir: ' + JSON.stringify(err), 'debug', NAME);
                    args.callback( err );
                    return;
                }

                Y.log('Emptied form exports directory.', 'info', NAME);

                args.callback( null, { 'status': 'ok' });
            }

            Y.doccirrus.forms.exportutils.clearExportDir(args.user, onExportsCleared);
        }

        /**
         *  REST action to delete a form and its entire revision history
         *
         *  Note that this behavior differs to previous /r/deleteform action, which kept revision history, changed
         *  for consistency with spec and UI.
         *
         *  @param  args    {Object}    As sent by RestController_new.js
         */

        function deleteWithHistory(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.deleteWithHistory', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.deleteWithHistory');
            }
            var
                params = args.originalParams,
                canonicalId = params.id || '',
                report = {},
                history = [];

            clearFormListCache();

            //  check passed arguments
            if (!params.hasOwnProperty('id') || '' === canonicalId) {
                Y.log( 'Cannot load form history, id not sent', 'warn', NAME );
                return args.callback( Y.doccirrus.errors.rest( 404, 'id not specified', true ) );
            }

            function onCanonicalDeleted(err) {
                if (err) {
                    Y.log('Could not delete form template: ' + JSON.stringify(err), 'warn', NAME);
                    return args.callback(err);
                }
                args.callback(null, report);
            }

            function onHistoryCleared() {
                var
                    dbSetup = {
                        'user': args.user,
                        'model': 'formtemplate',
                        'action': 'delete',
                        'query': { '_id': canonicalId }
                    };

                report[canonicalId] = 'formtemplate';

                Y.doccirrus.mongodb.runDb( dbSetup, onCanonicalDeleted );
            }

            function onVersionDeleted(err) {
                if (err) {
                    Y.log( `Could not delete form version: ${JSON.stringify(err)}`, 'warn', NAME);
                    return args.callback(err);
                }
                deleteNext();
            }

            function deleteNext() {

                if (0 === history.length) {
                    onHistoryCleared();
                    return;
                }

                var
                    nextItem = history.pop(),
                    dbSetup = {
                        'user': args.user,
                        'model': 'formtemplateversion',
                        'action': 'delete',
                        'query': { '_id': nextItem._id }
                    };

                report[nextItem._id] = 'formtemplateversion';
                Y.doccirrus.mongodb.runDb( dbSetup, onVersionDeleted );
            }

            function onHistoryLoaded(err, savedVersions) {

                if ( err ) {
                    Y.log( 'Error loading history: ' + JSON.stringify( err ), 'warn', NAME );
                }

                history = savedVersions;
                deleteNext();
            }

            //  pass to the schema
            Y.doccirrus.schemas.formtemplate.listVersions(args.user, params.id, onHistoryLoaded);
        }

        /**
         *  REST action to delete a form and leave the history intact for activities which may use it
         *
         *  Note that this behavior differs to previous /r/deleteform action, which kept revision history, changed
         *  for consistency with spec and UI.
         *
         *  @param  args    {Object}    As sent by RestController_new.js
         */

        function deleteCanonicalOnly(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.deleteCanonicalOnly', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.deleteCanonicalOnly');
            }
            var
                params = args.originalParams,
                canonicalId = params.id || '',
                report = {};

            //  check passed arguments
            if ( !params.hasOwnProperty( 'id' ) || '' === canonicalId ) {
                Y.log( 'Cannot delete form, id not sent', 'warn', NAME );
                return args.callback( Y.doccirrus.errors.rest( 404, 'id not specified', true ) );
            }

            clearFormListCache();

            function onCanonicalDeleted(err) {
                if (err) {
                    Y.log('Could not delete form template: ' + JSON.stringify(err), 'warn', NAME);
                    return args.callback(err);
                }
                clearFormListCache();
                args.callback(null, report);
            }

            function onHistorySaved(err, versionId, versionNo) {
                if (err) {
                    Y.log('Could not save canonical state of form prior to deletion: ' + JSON.stringify(err), 'warn', NAME);
                    return args.callback(err);
                }

                report.msg = 'Saved backup copy of form v' + versionNo + ' in history with id: ' + versionId;
                Y.log(report.msg, 'debug', NAME);

                var
                    dbSetup = {
                        'user': args.user,
                        'model': 'formtemplate',
                        'action': 'delete',
                        'query': { '_id': canonicalId }
                    };

                report[canonicalId] = 'formtemplate';

                Y.doccirrus.mongodb.runDb( dbSetup, onCanonicalDeleted );
            }

            Y.doccirrus.schemas.formtemplate.createNewVersionById(args.user, canonicalId, 'deleted', onHistorySaved);
        }

        /**
         *  Get current form config
         */

        function getConfig(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.getConfig', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.getConfig');
            }

            //  Load categories from disk
            Y.doccirrus.formsconfig.getConfig(args.user, onConfigLoaded);

            function onConfigLoaded(err, formConfig) {
                if ( err ) {
                    err = Y.doccirrus.errors.rest( 500,'Could not load form assignments from database: ' + JSON.stringify(err), true );
                    return args.callback( err );
                }
                args.callback(null, formConfig);
            }
        }

        /**
         *  Set for config key
         */

        function setConfig(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.setConfig', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.setConfig');
            }

            var
                params = args.originalParams,
                configKey = (params.key ? params.key : ''),
                configValue = (params.value ? params.value : '');

            Y.log( 'Updating forms config (via REST) key: ' + configKey + ' value: ' + configValue, 'info', NAME);

            Y.doccirrus.formsconfig.setConfigKey( args.user, configKey, configValue, onConfigUpdated);

            function onConfigUpdated(err) {
                if ( err ) {
                    args.callback( Y.doccirrus.errors.rest( 500, 'Could not read form categories from disk: ' + JSON.stringify(err), true) );
                    return;
                }
                args.callback( null, { configKey: configValue } );
            }
        }

        /**
         *  DEPRECATED Rest action to list form categories
         *
         *  Note that form categories were previously defined in static file on disk: ./formcategories.json
         *
         *  This route is deprecated now that for categories are available on the client as a YUI module
         *
         *  @param args
         */

        function getCategories(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.getCategories', 'info', NAME);
            Y.log('DEPRECATED Y.doccirrus.api.formtemplate.getCategories, should no longer be needed, form folders are now stored in database', 'warn', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.getCategories');
            }
            args.callback(null, Y.dcforms.categories);
        }

        /**
         *  List all forms available to current user
         *
         *  TODO: cache this on master and query via IPC
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user                       REST user or equivalent
         *  @param  {Boolean}   args.inMigration                Set to true if running in migration
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.modelname   Optional, default is 'formtemplate'
         *  @param  {String}    args.originalParams.canonicalId Optional, only list one form
         *  @param  {Function}  args.callback                   Of the form fn( err, formList )
         */

        async function listForms( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.listForms', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.listForms');
            }
            Y.log('Listing available forms.', 'debug', NAME);

            const
                params = args.originalParams || {},
                allowModels = ['formtemplate', 'formtemplateversion'],
                modelName = 'formtemplate',

                listFields = {
                    '_id': 1,
                    'formId': 1,
                    'version': 1,
                    'formFolderId': 1,
                    'latestVersionId': 1,
                    'isSubform': 1,
                    'isReadOnly': 1,
                    'category': 1,
                    'defaultFor': 1,
                    'bfbAlternative': 1,
                    'revision': 1,
                    'jsonTemplate.name': 1,
                    'jsonTemplate.category': 1,
                    'jsonTemplate.bfbAlternative': 1,
                    'jsonTemplate.isSubform': 1,
                    'jsonTemplate.isFixed': 1,
                    'jsonTemplate.printA4': 1,
                    'jsonTemplate.printOffsetX': 1,
                    'jsonTemplate.printOffsetY': 1,
                    'jsonTemplate.printScale': 1,
                    'jsonTemplate.printRotate': 1,
                    'jsonTemplate.printBackground': 1,
                    'jsonTemplate.defaultFor': 1,
                    'jsonTemplate.width': 1,
                    'jsonTemplate.height': 1
                },

                dbSetup = {
                    'user': args.user,
                    'model': modelName,
                    'action': 'get',
                    'options': {
                        'lean': true,
                        'select': listFields
                    },
                    'query': { }
                };

            let
                err, data;

            //  For diagnostic view we may want to look in version or previous table name
            if (params.modelname) {
                Y.log('Using non-standard model: ' + modelName, 'warn', NAME);
                if (-1 !== allowModels.indexOf(params.modelname)) {
                    Y.log('Set model to: ' + modelName, 'warn', NAME);
                    dbSetup.model = params.modelname;
                }
            }

            //  Check if in migration
            if ( args.hasOwnProperty( 'inMigration' ) ) {
                dbSetup.migrate = args.inMigration;
            }

            //  We may be querying the properties of a single form
            if ( params.canonicalId ) {
                dbSetup.query._id = params.canonicalId;
            }

            [ err, data ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( dbSetup ) );

            if ( err ) {
                Y.log( `Could not load form listing: ${err.stack||err}`, 'warn', NAME );
                return args.callback( err );
            }

            //  If we have a set of forms, summarize and return to client, otherwise create the default set

            Y.log('Creating form list, ' + data.length + ' items', 'info', NAME);

            var formsList = [], i;

            for (i = 0; i < data.length; i++) {

                if (data[i].jsonTemplate) {

                    if (!data[i].jsonTemplate.name) {
                        data[i].jsonTemplate.name = { 'en': 'Untitled', 'de': 'Untitled' };
                    }

                    if (!data[i].version){ data[i].version = 1; }
                    if (!data[i].revision){ data[i].revision = 0; }

                    data[i].isSubform = false;

                    if (data[i].jsonTemplate.hasOwnProperty('isSubform')) {
                        data[i].isSubform = data[i].jsonTemplate.isSubform;
                    }

                    if ('string' === typeof data[i].isSubform) {
                        data[i].isSubform = ('true' === data[i].isSubform.toLowerCase());
                    }

                    if ( !data[i].formId ) {
                        data[i].formId = data[i]._id.toString();
                    }

                    formsList.push({
                        '_id': data[i]._id.toString(),
                        'formId': data[i].formId || '',
                        'formFolderId': data[i].formFolderId || '',
                        'title': data[i].jsonTemplate.name,
                        'version': data[i].version,
                        'latestVersionId': data[i].latestVersionId || '',
                        'isSubform': data[i].isSubform || false,
                        'isReadOnly': data[i].isReadOnly || false,
                        'category': data[i].jsonTemplate.category,
                        'defaultFor': data[i].jsonTemplate.defaultFor || '',
                        'bfbAlternative': data[i].jsonTemplate.bfbAlternative || '',
                        'tip': Y.doccirrus.schemas.formtemplate.makeToolTip(data[i]),
                        'revision': data[i].revision
                    });
                    
                }
            }

            function sortByFormVersion(a, b){
                var
                    aVer = a.version,
                    bVer = b.version;

                return ((aVer < bVer) ? -1 : ((aVer > bVer) ? 1 : 0));
            }

            formsList.sort( sortByFormVersion );

            //  do not cache the forms list if only looking up a single form
            if ( !params.canonicalId ) {
                cacheFormList = formsList;
            }

            args.callback(null, formsList);
        }

        /**
         *  Load, map and render a form on the server, return mediaId of new PDF document
         *
         *  Parameters:
         *
         *      formId          {String}    Database _id of canonical form
         *      formVersionId   {String}    Database _id of a fixed version of a form
         *      mapper          {String}    Name of a form mapper to instantiate
         *      mapCollection   {String}    Type of object to be mapped
         *      mapObject       {String}    _id of object to be mapped
         *
         *  Optionally:
         *
         *      saveTo          {String}    Where the PDF should be stored (db|temp|zip)
         *      zipId           {String}    When compiling multipple PDFs into a zip archive
         *      preferName      {String}    Filename on disk
         *      serialRender    {String}    Queue all renders
         *
         *  @param  args    {Object}    See above
         */

        function makePDF( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.makePDF', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.makePDF');
            }
            var
                params = args.originalParams,
                formId = params.formId ? params.formId : '',
                formVersionId = params.formVersionId ? params.formVersionId : '',
                mapperName = params.mapper ? params.mapper : '',
                mapCollection = params.mapCollection ? params.mapCollection : '',   //  always 'activity' in practice
                mapObject = params.mapObject ? params.mapObject : '',               //  always activity _id in practice
                mapFields = params.mapFields || {},                                 //  literal fields passed from caller
                saveTo = params.saveTo ? params.saveTo : 'db',
                zipId = params.zipId ? params.zipId : '',
                preferName = params.preferName ? params.preferName : 'temp.pdf',
                useCopyMask = ( params.printCopies && params.printCopies > 0 ),

                // MOJ-10953 Allow caller to prevent slow activity post-processes from being triggered
                skipTriggerRules = args.skipTriggerRules || false,
                skipTriggerSecondary = args.skipTriggerSecondary || false,

                pdfOptions;

            if ('' === formId) {
                args.callback( Y.doccirrus.errors.rest( 404, 'Form ID not given, cannot map', true ) );
                return;
            }

            function onPDFCreated(err, mediaId) {
                if (err) {
                    Y.log('Could not create form PDF: ' + JSON.stringify(err), 'warn', NAME);
                    args.callback(err);
                    return;
                }

                Y.log('Created PDF document and saved to database with media _id: ' + mediaId, 'debug', NAME);
                args.callback( null, { 'mediaId': mediaId } );
            }

            //  MOJ-6996 intercept ws event to target user
            function onPdfProgress( evt ) {
                evt.targetId = args.user.identityId;
                Y.dcforms.raisePdfProgressEvent( evt );
            }

            if ('' === mapperName) {
                Y.log('Mapping not specified, rendering form without external data.', 'warn', NAME);
            }

            pdfOptions = {
                'user': args.user,                      //  REST user
                'formId': formId,                       //  canonical form id / formtemplate _id
                'formVersionId': formVersionId,         //  form version / formtemplateversion _id
                'mapperName': mapperName,               //  may be removed, mappers are being restructured
                'mapCollection': mapCollection,         //  type of object to load
                'mapObject': mapObject,                 //  database _id of object to load
                'mapFields': mapFields,                 //  literal fields passed form caller
                'saveTo': saveTo,                       //  destination of rendered PDF (db|zip|temp)
                'zipId': zipId,                         //  archive to use if saving to zip
                'preferName': preferName,               //  filename in zip
                'useCopyMask': useCopyMask,             //  true if printing with 'COPY' mask, not saved to db
                'onPdfProgress': onPdfProgress,         //  update progress bar on client

                'skipTriggerRules': skipTriggerRules,
                'skipTriggerSecondary': skipTriggerSecondary,

                'callback': onPDFCreated                //  callback
            };

            Y.doccirrus.forms.renderOnServer.toPDF( pdfOptions );
        }

        /**
         *  Shim to generate PDFs asynchronously through the JSONRPC API and raise a ws event on completion
         *
         *  This should match the ws event raised by the default FSM when asynchronously generating PDFs after
         *  activity approval.
         *
         *  This method may also accept a printer name to send the PDF to.
         *
         *  @param args
         */

        function makePDFws( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.makePDFws', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.makePDFws');
            }

            const
                params = args.originalParams,
                mapObject =  params.mapObject || '',
                mapCollection = params.mapCollection || 'activity',
                printCopies = params.printCopies || 1;

            let
                pdfMedia,
                printResult = null,
                printComplete = false,
                ownerObj = null;

            async.series( [ generatePdf, loadOwnerObject, sendToPrinter, updateFormprinters, notifyClient ], onAllDone );

            //  call back immediately
            return args.callback( null, { 'status': 'queued' } );

            async function generatePdf( itcb ) {
                const
                    makePDFP = promisifyArgsCallback( makePDF ),
                    passParams = {
                        user: args.user,
                        originalParams: args.originalParams
                    };

                let err;

                [ err, pdfMedia ] = await formatPromiseResult( makePDFP( passParams ) );

                if ( err ) { return itcb( err ); }
                itcb( null );
            }

            function loadOwnerObject( itcb ) {
                Y.log( 'Querying database for mapped object: ' + mapCollection + '::' + mapObject, 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    'action': 'get',
                    'user': args.user,
                    'model': mapCollection,
                    'query': { '_id': mapObject + '' },
                    'options': { 'limit': 1 },
                    'callback': onOwnerLoaded
                } );

                function onOwnerLoaded( err, result ) {
                    //  not an error, owner might be a dummy object
                    if ( err || !result[0] ) { return itcb( null ); }
                    ownerObj = result[0];
                    itcb( null );
                }

            }

            //  TODO: extend to allow printing from temp dir
            function sendToPrinter( itcb ) {
                if ( !params.printTo || '' === params.printTo || !pdfMedia || !pdfMedia.mediaId ) { return itcb( null ); }

                for( let i = 0; i < printCopies; i++) {
                    Y.doccirrus.api.media.print( {
                        'user': args.user,
                        'originalParams': {
                            'printerName': params.printTo,
                            'mediaId': pdfMedia.mediaId
                        },
                        'callback': onPrintQueued
                    } );
                }


                function onPrintQueued( err, result ) {
                    if ( err ) {
                        Y.log( 'Problem sending new PDF to printer: ' + JSON.stringify( err ), 'warn', NAME );
                        return itcb( err );
                    }

                    printResult = result;
                    printComplete = true;

                    Y.doccirrus.api.activity.incrementPrintCount({
                        user: args.user,
                        originalParams: {
                            activityIds: [ mapObject ],
                            numCopies: 1
                        }
                    });

                    itcb( null );
                }
            }

            function updateFormprinters( itcb ) {
                if ( !printResult || !params.userLocationId ) { return itcb( null ); }
                Y.doccirrus.api.formprinter.setsingle( {
                    'user': args.user,
                    'originalParams': {
                        'canonicalId': params.formId,
                        'locationId': params.userLocationId,
                        'printerName': params.printTo
                    },
                    'callback': itcb
                } );

            }

            function notifyClient( itcb ) {
                //  skip this step if no media object was created
                if ( !pdfMedia || !ownerObj || !pdfMedia.mediaId ) { return itcb( null ); }

                //  Notify user of successful print
                if ( printResult ) {
                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: args.user.identityId,
                        nsp: 'default',
                        event: 'asyncPDFPrinted',
                        msg: {
                            data: {
                                'status': 'complete',
                                'mediaId': pdfMedia.mediaId,
                                'printerName': params.printTo,
                                'mapId': mapObject,
                                'mapCollection': mapCollection,
                                'msg': printResult.msg
                            }
                        }
                    } );
                }

                //  MOJ-6996 notify room of single user who requested this PDF
                Y.doccirrus.communication.emitEventForUser( {
                    targetId: args.user.identityId,
                    nsp: 'default',
                    event: 'onPDFCreated',
                    msg: {
                        data: {
                            'status': 'complete',
                            'mediaId': pdfMedia.mediaId,
                            'activity': ownerObj,
                            'owner': ownerObj
                        }
                    }
                } );

                return itcb( null );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Error making or printing PDF: ' + JSON.stringify( err ), 'warn', NAME );

                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: args.user.identityId,
                        nsp: 'default',
                        event: 'onPDFCreated',
                        msg: {
                            data: {
                                'status': 'error',
                                'err': err
                            }
                        }
                    } );

                    return;
                }
                Y.log( 'Completed PDF generation/print.', 'debug', NAME );
            }

        }

        /**
         *  Create a PDF directly from form state exported by client
         *
         *  @param args
         */

        async function generatePdfDirect( args ) {
            const
                compileFromFormP = util.promisify( Y.doccirrus.media.hpdf.compileFromForm ),

                params = args.originalParams || {},
                documentState = params.documentState || null;

            let
                err, result;

            //  1. Sanity checks
            if ( !documentState ) { return args.callback( new Error( 'Document state not sent.' ) ); }

            //  2. Convert documentState to a PDF

            [ err, result ] = await formatPromiseResult( compileFromFormP( args.user, documentState, Y.dcforms.nullCallback ) );

            if ( err ) {
                Y.log( `Problem generting PDF directly from document: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            args.callback( err, result );
        }

        /**
         *  Make a PDF for an activity with copy mask and print it n times
         *
         *  As with makepdfws, but must have a printer name and number of copies
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Object]    args.originalParams
         *  @param  {String}    args.originalParams.printTo         Name of a CUPS printer
         *  @param  {String}    args.originalParams.printCopies     Integer >= 1
         *  @param  {Boolean}   args.originalParams.waitCallback    Optional, used in testing
         *  @param  {Object}    args.callback                       Called immediately unless waitCallback is true
         *
         *  @return {*}
         */

        function printPDFCopyWS( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.printPDFCopyWS', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.printPDFCopyWS');
            }
            var
                params = args.originalParams,
                mapObject =  params.mapObject || '',
                mapCollection = params.mapCollection || 'activity',
                printCopies = parseInt( params.printCopies, 10 ) || 0,
                printTo = params.printTo || '',
                waitCallback = params.waitCallback || false,
                notNotify = params.notNotify || false,
                printComplete = false,
                printMsg,
                tempFile;

            if ( isNaN( printCopies ) || printCopies < 1 ) {
                return args.callback( Y.doccirrus.errors.rest( 500, 'numCopies not given' ) );
            }

            if ( '' === printTo ) {
                return args.callback( Y.doccirrus.errors.rest( 500, 'printerName not given' ) );
            }

            async.series( [ generatePdf, /* loadOwnerObject, */ sendToPrinter, notifyClient ], onAllDone );

            if ( !waitCallback ) {
                //  call back immediately
                return args.callback( null, { 'status': 'queued' } );
            }

            function generatePdf( itcb ) {

                makePDF( {
                    'user': args.user,
                    'originalParams': args.originalParams,
                    'callback': onPdfGenerated
                } );

                //  call back immediately
                //return args.callback( null, { 'status': 'queued' });

                function onPdfGenerated(err, mediaResult) {
                    if ( err ) { return itcb( err ); }

                    tempFile = mediaResult.mediaId ? mediaResult.mediaId : mediaResult;
                    tempFile = tempFile.tempId ? tempFile.tempId : tempFile;
                    itcb( null );
                }

            }

            function sendToPrinter( itcb ) {
                let tempAry = [], i;
                for ( i = 0; i < printCopies; i++ ) {
                    tempAry.push( 'copy ' + i );
                }

                async.eachSeries( tempAry, printPdfAgain, itcb );

                function printPdfAgain( label, _cb ) {
                    Y.log( 'Printing additional copy to ' + printTo + ': ' + label, 'debug', NAME );

                    Y.doccirrus.printer.printFile( {
                        printerName: printTo,
                        filePath: tempFile
                    }, onPrintQueued );

                    function onPrintQueued( err, result ) {
                        if ( err ) {
                            Y.log( 'Problem sending PDF to printer: ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }

                        printComplete = true;
                        _cb( null );
                    }
                }

            }

            function notifyClient( itcb ) {
                //  Notify user of successful print
                if( !notNotify ) {
                    if ( printComplete ) {

                        printMsg = {
                            'status': 'complete',
                            'mediaId': 'KOPIE',
                            'printerName': params.printTo,
                            'tempFile': tempFile,
                            'mapId': mapObject,
                            'mapCollection': mapCollection,
                            'msg': 'KOPIE (' + printCopies + ')'
                        };

                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: args.user.identityId,
                            nsp: 'default',
                            event: 'asyncPDFPrinted',
                            msg: {
                                data: printMsg
                            }
                        } );

                    } else {

                        printMsg = {
                            'status': 'failed'
                        };

                    }
                }

                return itcb( null );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Error making or printing PDF: ' + JSON.stringify( err ), 'warn', NAME );

                    Y.doccirrus.communication.emitEventForUser( {
                        targetId: args.user.identityId,
                        nsp: 'default',
                        event: 'onPDFCreated',
                        msg: {
                            data: {
                                'status': 'error',
                                'err': err
                            }
                        }
                    } );

                }

                Y.log( 'Completed PDF generation/print.', 'debug', NAME );

                //  during testing we want to know the outcome of print job
                if ( waitCallback ) {
                    return args.callback( err, printMsg );
                }

            }

        }

        /**
         *  Make a PDF based on the reporting API
         *
         *  @param  args                            {Object}    REST /1/ format
         *  @param  args.user                       {Object}    REST user or equivalent
         *  @param  args.originalParams             {Object}
         *
         *  @param  args.originalParams.startDate   {String}    Start of date range for reporting events
         *  @param  args.originalParams.endDate     {String}    End of date range for reporting events
         *  @param  args.originalParams.presetId    {String}    _id of an insight2 preset report
         *
         *  @param  args.callback                   {Function}  Of the form fn( err, pdfUrl )
         */

        function makeReportPDF( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.makeReportPDF', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.makeReportPDF');
            }
            var
                params = args.originalParams,
                startDate = params.startDate || null,
                endDate = params.endDate || null,
                noWait = params.noWait || false,
                presetId = params.presetId || null,
                tableParams = params.tableParams || {};

            //  check required arguments
            if ( !startDate || !endDate || !presetId ) {
                return args.callback( Y.doccirrus.errors.rest( 404, 'Missing required argument', true ) );
            }

            if ( noWait ) {
                Y.log( 'Using noWait option, status will be returned by websocket events', 'debug', NAME );

                //  deliberately calling back early
                args.callback( null, { 'started': presetId } );         //  eslint-disable-line
            }

            Y.log( 'Generating report ' + presetId + ' for date range: ' + startDate + ' to ' + endDate, 'debug', NAME );

            Y.doccirrus.forms.renderOnServer.reportToPDF( {
                'user': args.user,
                'presetId': presetId,
                'startDate': startDate,
                'endDate': endDate,
                'tableParams': tableParams,
                'onProgress': emitReportEvent,
                'callback': onPDFReportCreated
            } );

            function onPDFReportCreated( err, response) {
                if (err) {
                    Y.log( 'Error creating PDF report: ' + JSON.stringify( err ), 'warn', NAME );

                    if ( noWait ) {
                        return emitReportEvent( { 'error': err } );
                    } else {
                        return args.callback( err );
                    }
                }

                if ( noWait ) {
                    emitReportEvent( {
                        'label': 'complete',
                        'progress': 100,
                        'mapId': presetId,
                        'url': response.tempUrl,
                        'fileName': response.tempFile,
                        'canonicalId': response.canonicalId
                    } );
                } else {
                    return args.callback( null, response.tempUrl );
                }
            }

            function emitReportEvent( evt ) {
                Y.log( 'Raising PDF progress event: ' + JSON.stringify( evt ), 'debug', NAME );
                evt.targetId = args.user.identityId;
                Y.dcforms.raisePdfProgressEvent( evt );
            }

        }

        /**
         *  Make a PDF containing a table of casefolder entries
         *
         *  May be extended to other tables in future
         *
         *  @param  args                                {Object}    REST /1/ format
         *  @param  args.user                           {Object}    REST user or equivalent
         *  @param  args.originalParams                 {Object}
         *  @param  args.originalParams.query           {Object}    Used to filter activities, may include table filter
         *  @param  args.originalParams.patientId       {String}    _id of the current patient
         *  @param  args.originalParams.casefolderId    {String}    _id of a casefolder object (optional)
         *  @param  args.originalParams.preferName      {String}    Filename requested
         *  @param  args.originalParams.mapFields       {Object}    Optional fields to be mapped into header
         *  @param  args.callback                       {Function}  Of the form fn( err, pdfUrl )
         */

        function makeCasefileTablePDF( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.makeCasefileTablePDF', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.makeCasefileTablePDF');
            }
            var
                params = args.originalParams,
                noWait = params.noWait || false,
                patientId = params.patientId || null,
                casefolderId = params.casefolderId || null,
                preferName = params.preferName || 'Untitled',
                fileName = 'Patientenakte_' + Y.doccirrus.media.cleanFileName( preferName )+ '.pdf';

            //  check required arguments
            if ( !patientId ) {
                return args.callback( Y.doccirrus.errors.rest( 404, 'Missing required argument: patientId', true ) );
            }

            if ( noWait ) {
                Y.log( 'Using noWait option, status will be returned by websocket events', 'debug', NAME );

                //  deliberately returning early
                args.callback( null, { 'started': patientId } );                //  eslint-disable-line
            }

            Y.log( 'Generating casefolder PDF for patient: ' + patientId + ' folder: ' + casefolderId, 'debug', NAME );

            Y.doccirrus.forms.renderOnServer.tableToPDF( {
                'user': args.user,
                'casefolderId': casefolderId,
                'patientId': patientId,
                'query': params.query || { patientId: params.patientId },
                'fileName': fileName,
                'filePath': Y.doccirrus.media.getCacheDir() + fileName,
                'mapFields': params.mapFields || {},
                'onProgress': emitReportEvent,
                'callback': onTablePDFCreated
            } );

            function onTablePDFCreated( err, response) {
                if (err) {
                    Y.log( 'Error creating PDF report: ' + JSON.stringify( err ), 'warn', NAME );

                    if ( noWait ) {
                        return emitReportEvent( 'error', err );
                    } else {
                        return args.callback( err );
                    }
                }

                if ( noWait ) {
                    emitReportEvent( {
                        'label': 'complete',
                        'progress': 100,
                        'mapId': patientId,
                        'url': response.tempUrl,
                        'fileName': response.tempFile
                    } );
                } else {
                    return args.callback( null, response.tempUrl );
                }
            }

            function emitReportEvent( evt ) {
                Y.log( 'Raising PDF progress event: ' + JSON.stringify( evt ), 'debug', NAME );
                evt.targetId = args.user.identityId;
                Y.dcforms.raisePdfProgressEvent( evt );
            }

        }

        /**
         *  Make a PDF of table data
         *
         *  @param  args                                    {Object}    REST /1/ format
         *  @param  args.originalParams                     {Object}
         *  @param  args.originalParams.tableDataSource     {String}    Identifies API to fill table from
         *  @param  args.originalParams.role                {String}    Form role to map to
         *  @param  args.originalParams.preferName          {String}    Optional, not guaranteed
         *  @param  args.originalParams.formData            {Object}    Additional fields to be mapped into form
         *  @param  args.originalParams.options             {Object}    Optional, use depends on data source
         *  @param  args.originalParams.query               {Object}    Optional, reduce results with filters
         *  @param  args.originalParams.listenId            {String}    Activity _id to direct PDF events to on client
         *  @param  args.callback                           {Function}  Of the form fn( err )
         */

        function makeKoTablePDF( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.makeKoTablePDF', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.makeKoTablePDF');
            }
            var
                params = args.originalParams,
                noWait = params.noWait || false,
                tableDataSource = params.tableDataSource || null,
                role = params.role || null,
                fileName = Y.doccirrus.media.cleanFileName( params.preferName ) || 'labdata_test.pdf',
                formData = params.formData || {};

            //  check required params
            if ( !tableDataSource || !role ) {
                return args.callback( Y.doccirrus.errors.rest( 500, 'Missing required argument', true ) );
            }

            if ( noWait ) {
                Y.log( 'Using noWait option, status will be returned by websocket events', 'debug', NAME );
                args.callback( null, { 'started': tableDataSource, 'fileName': fileName } );     //  eslint-disable-line
            }

            Y.log( 'Generating table for from: ' + tableDataSource, 'debug', NAME );

            Y.doccirrus.forms.renderOnServer.koTableToPDF( {
                'user': args.user,
                'tableDataSource': tableDataSource,
                'role': role,
                'fileName': fileName,
                'filePath': Y.doccirrus.media.getCacheDir() + fileName,
                'formData': formData,
                'options': params.options,
                'query': params.query,
                'onProgress': emitReportEvent,
                'callback': onPDFCreated
            } );

            function onPDFCreated( err, response) {
                if (err) {
                    Y.log( 'Error creating PDF from table: ' + JSON.stringify( err ), 'warn', NAME );

                    if ( noWait ) {
                        return emitReportEvent( { 'error': err } );
                    } else {
                        return args.callback( err );
                    }
                }

                if ( noWait ) {
                    emitReportEvent( {
                        'label': 'complete',
                        'progress': 100,
                        'mapId': params.listenId || tableDataSource,
                        'url': response.tempUrl,
                        'fileName': response.tempFile,
                        'canonicalId': response.canonicalId || '',
                        'percent': 100
                    } );
                } else {
                    return args.callback( null, response.tempUrl );
                }
            }

            function emitReportEvent( evt ) {
                Y.log( 'Raising PDF progress event: ' + JSON.stringify( evt ), 'debug', NAME );
                evt.targetId = args.user.identityId;
                Y.dcforms.raisePdfProgressEvent( evt );
            }

        }

    /**
     *  Replace the PDF used by an activity
     *
     *  @param  args                                {Object}
     *  @param  args.originalParams                 {Object}
     *  @param  args.originalParams.activityId      {String}
     *  @param  args.originalParams.skipIfApproved  {Boolean}
     */

    function regeneratePDF(args) {
        Y.log('Entering Y.doccirrus.api.formtemplate.regeneratePDF', 'info', NAME);
        if (args && args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.regeneratePDF');
        }
        var
            dbSetup,
            activity,
            mapperName,
            params = args.originalParams || {};

        //  check that an activity id was sent

        if (!params.activityId) {
            Y.log('No activityId passed to regeneratePDF', 'warn', NAME);
            args.callback( Y.doccirrus.errors.rest( 400, 'Please send activityId and formDocId', true ) );
            return;
        }

        //  request the activity

        dbSetup = {
            'user': args.user,
            'model': 'activity',
            'action': 'get',
            'query': {'_id': params.activityId},
            'options': {'limit': 1}
        };

        Y.doccirrus.mongodb.runDb(dbSetup, onLookupActivity);

        function onLookupActivity(err, data) {
            if (err) {
                Y.log('Error loading activity ' + params.activityId + ': ' + JSON.stringify(err), 'warn', NAME);
                args.callback(err);
                return;
            }

            if (!data[0]) {
                Y.log('Activity not found: ' + params.activityId, 'warn', NAME);
                args.callback( Y.doccirrus.errors.rest( 404, 'activity not found: ' + params.activityId, true ) );
                return;
            }

            activity = data[0];

            mapperName = Y.doccirrus.forms.renderOnServer.mapperForActType(activity.actType);

            //  we might not regenerate activity if it is approved and already has a PDF
            if ( activity.status !== 'VALID' && activity.formPdf && '' !== activity.formPdf && params.skipIfApproved ) {
                args.callback(err, { 'mediaId': activity.formPdf, 'mapper': mapperName });
                return;
            }

            var
                pdfOptions = {
                    'user': args.user,                                  //  REST user
                    'formId':    activity.formId,                       //  canonical form id / formtemplate _id
                    'formVersionId': activity.formVersion || '',        //  form version / formtemplateversion _id
                    'mapperName': mapperName,                           //  may be removed, mappers are being restructured
                    'mapCollection': 'activity',                        //  type of object to load
                    'mapId': activity._id,                              //  database _id of object to load
                    'saveTo': 'db',                                     //  destination of rendered PDF (db|zip|temp)
                    'zipId': '',                                        //  archive to use if saving to zip
                    'preferName': '',                                   //  filename in zip
                    'callback': onPDFCreated                            //  callback
                };

            Y.doccirrus.forms.renderOnServer.toPDF( pdfOptions );
        }

        function onPDFCreated(err, mediaId) {
            if (!mediaId) { mediaId = ''; }
            args.callback(err, { 'mediaId': mediaId, 'mapper': mapperName });
        }
    }

    /**
     *  Regenerate PDFs for a set of activities and concatenate into a single large document
     *
     *  Used by CashBook for Medneo workflow, see MOJ-6290
     *
     *  @param  args                                {Object}    REST args /1/ API
     *  @param  args.originalParams                 {Object}
     *  @param  args.originalParams.activityIds     {String[]}  Array of activity _id strings
     */

    function compileBatchPDF( args ) {
        Y.log('Entering Y.doccirrus.api.formtemplate.compileBatchPDF', 'info', NAME);
        if (args && args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.compileBatchPDF');
        }
        var
            params = args.originalParams,
            activityIds = params.activityIds || null,
            mediaIds = [];

        if ( !activityIds ) { return args.callback( Y.doccirrus.errors.rest( 400, 'Activity _ids not given', true ) ); }

        //TODO: add sysnum to prevent concurrent generation on the same tenant
        //TODO: call back immediately, we will process this in the background
        //args.callback( null, { 'status': 'started' } );

        async.eachSeries( activityIds, forEachActivityId, onAllRegenerated );

        function forEachActivityId( _id, itcb ) {

            function onPdfRegenerated( err, result ) {
                if ( err ) {
                    Y.log( 'Could not regenerate PDF for activity ' + _id + ': ' + JSON.stringify( err ), 'warn', NAME );
                    return itcb( err );
                }
                mediaIds.push( result.mediaId );
                itcb( null );
            }

            Y.log( 'Regenerating PDF for activity: ' + _id, 'debug', NAME );

            regeneratePDF( {
                'user': args.user,
                'originalParams': {
                    'activityId': _id,
                    'skipIfApproved': true
                },
                'callback': onPdfRegenerated
            } );

        }

        function onAllRegenerated( err ) {
            if (err) {
                Y.log('Error regenerating PDFs: ' + JSON.stringify(err), 'warn', NAME);
                return;
            }

            Y.log('Finished regenerating activity PDFs.', 'debug', NAME);
            //  TODO: emit ws event here
            //  TODO: compile single PDF here

            Y.doccirrus.media.pdf.concatenatePDFs( { user: args.user, mediaIds }, onSinglePdfCompiled );
        }

        function onSinglePdfCompiled( err, compiledPdfFile ) {
            if ( err ) {
                Y.log( 'Could not compile PDFs into a single file: ' + JSON.stringify( err ), 'warn', NAME );
                return args.callback( err );
            }

            var fileName = 'special-cashbook-approve-' + args.user.tenantId + '-pdf';

            Y.log( `Saving PDF to database with special identifier: ${fileName}`, 'info', NAME );
            Y.doccirrus.media.gridfs.importFile( args.user, fileName, compiledPdfFile, false, onSavedToGridFs );

            function onSavedToGridFs( err ) {
                if ( err ) {
                    Y.log( `Could not import PDF into GridFS: ${JSON.stringify( err )}`, 'warn', NAME );
                    return args.callback( err );
                }

                Y.log( `Compiled PDF file: ${compiledPdfFile}`, 'debug', NAME );
                args.callback( null, fileName );
            }
        }

    }

    /**
     *  Replace a form on an activity
     *
     *  Expects the following arguments
     *
     *  activityId      {string}    activity to generate PDF from (for mapper)
     *  formId          {string}    replacement form id
     *  formVersion     {string}    formVersion
     */

    function replaceForm(args) {
        Y.log('Entering Y.doccirrus.api.formtemplate.replaceForm', 'info', NAME);
        if (args && args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.replaceForm');
        }
        var
            dbSetup,
            activity,
            params = args.originalParams;

        //  check that an activity id was sent

        if (!params.activityId || !params.formId || !params.formVersion) {
            Y.log('No activityId, formId or formVerison passed to regeneratePDF', 'warn', NAME);
            args.callback( Y.doccirrus.errors.rest( 404, 'Please send activityId, formId and formVersion', true ) );
            return;
        }

        //  request the activity

        dbSetup = {
            'user': args.user,
            'model': 'activity',
            'action': 'get',
            'query': {'_id': params.activityId},
            'options': {'limit': 1}
        };

        Y.doccirrus.mongodb.runDb(dbSetup, onLookupActivity);
        //

        function onLookupActivity(err, data) {
            if (err) {
                Y.log(`Error loading activity ${params.activityId}: ${JSON.stringify(err)}`, 'warn', NAME);
                args.callback(err);
                return;
            }

            if (!data[0]) {
                Y.log(`Activity not found: ${params.activityId}`, 'warn', NAME);
                args.callback( Y.doccirrus.errors.rest( 404, 'activity not found: ' + params.activityId, true ) );
                return;
            }

            activity = data[0];

            Y.log('Mapping not specified, rendering form without external data.', 'debug', NAME);

            dbSetup = {
                'user': args.user,
                'model': 'activity',
                'action': 'put',
                'query': {'_id': params.activityId},
                'data': {
                    'formId': params.formId,
                    'formVersion': params.formVersion,
                    'fields_': ['formId', 'formVersion']
                },
                'skipcheck_': true,
                'options': {
                    'limit': 1,
                    'ignoreReadOnly': ['formId', 'formVersion']
                }
            };

            Y.doccirrus.filters.setSkipCheck( dbSetup.data, true );

            Y.doccirrus.mongodb.runDb(dbSetup, onActivitySaved);

            function onActivitySaved(err) {
                args.callback(err, params);
            }
        }
    }

        /**
         *  Replace a form on a document
         *
         *  Expects the following arguments
         *
         *  activityId      {string}    activity to generate PDF from (for mapper)
         *  formId          {string}    replacement form id
         *  formVersionId   {string}    formVersion
         */

        function replaceFormInDoc(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.replaceFormInDoc', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.replaceFormInDoc');
            }
            var
                dbSetup,
                doc,
                params = args.originalParams;

            //  check that an activity id was sent

            if (!params.documentId || !params.formId || !params.formVersionId) {
                Y.log('No document, formId or formVerison passed to regeneratePDF: ' + JSON.stringify(params), 'warn', NAME);

                args.callback(new Error('Please send activityId, formId and formVersion'));
                return;
            }

            //  request the activity

            dbSetup = {
                'user': args.user,
                'model': 'document',
                'action': 'get',
                'query': {'_id': params.documentId},
                'options': {'limit': 1}
            };

            Y.doccirrus.mongodb.runDb(dbSetup, onLookupDocument);
            //

            function onLookupDocument(err, data) {
                if (err) {
                    Y.log('Error loading document ' + params.activityId + ': ' + JSON.stringify(err), 'warn', NAME);
                    args.callback(err);
                    return;
                }

                if (!data[0]) {
                    Y.log('Document not found: ' + params.activityId, 'warn', NAME);
                    args.callback(new Error('document not found: ' + params.activityId));
                    return;
                }

                doc = data[0];

                Y.log('Mapping not specified, rendering form without external data.', 'debug', NAME);

                dbSetup = {
                    'user': args.user,
                    'model': 'document',
                    'action': 'put',
                    'query': {'_id': params.documentId},
                    'data': {
                        'formId': params.formId,
                        'formInstanceId': params.formVersionId,
                        'fields_': ['formId', 'formInstanceId']
                    },
                    'skipcheck_': true,
                    'options': {
                        'limit': 1,
                        'ignoreReadOnly': ['formId', 'formInstanceId']
                    }
                };

                Y.doccirrus.filters.setSkipCheck( dbSetup.data, true );

                Y.doccirrus.mongodb.runDb(dbSetup, onDocSaved);

                function onDocSaved(err) {
                    args.callback(err, params);
                }
            }
        }

    /**
     *  Check if a form template has been used to create activities
     *  @param  {Object}    args
     *  @param  {Object}    args.user
     *  @param  {Object}    args.originalParams
     *  @param  {String}    args.originalParams.formId      Canonical ID of a form template
     *  @param  {Object}    args.callback                   Called immediately
     */

    async function isInUse( args ) {
        Y.log('Entering Y.doccirrus.api.formtemplate.isInUse', 'info', NAME);
        if (args && args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.isInUse');
        }

        const formId = args.originalParams.formId || '';

        //  call back immediately, result will be passed by WS event, MOJ-11160
        args.callback( null, { status: `Started check for usages of ${formId}` } );     //  eslint-disable-line callback-return

        Y.log( 'Checking if form is in use: ' + formId, 'info', NAME );

        let err, result;

        [ err, result ] = await formatPromiseResult(
            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'activity',
                action: 'get',
                query: { formId: formId },
                options: { limit: 1 }
            } )
        );

        if ( err ) {
            Y.log('Could not determine form use: ' + formId, 'warn', NAME);
            args.callback( err );
            return;
        }

        Y.log( 'Query on activities returns ' + result.length + ' items.', 'debug', NAME );

        Y.doccirrus.communication.emitEventForUser( {
            targetId: args.user.identityId,
            nsp: 'default',
            event: 'checkFormIsInUse',
            msg: {
                data: {
                    formId: formId,
                    inUse: 0 !== result.length
                }
            }
        } );
    }


    /**
     *  Export a set of forms to disk
     *
     *  Expects a POSTed argument called formIds with _ids of formtemplate objects
     *
     *  @param args
     */

    function exportForms(args) {
        Y.log('Entering Y.doccirrus.api.formtemplate.exportForms', 'info', NAME);
        if (args && args.callback) {
            args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.exportForms');
        }
        var
            params = args.originalParams,
            withHistory = params.withHistory || false,
            formIds = params.formIds || [],
            numForms = formIds.length,
            nextFormId,
            exportCount = 0,
            failures = [];

        exportNext();

        //  callback immediately
        args.callback(null, { 'startBatch': numForms });            //  eslint-disable-line

        Y.doccirrus.forms.exportutils.raiseExportEvent({
            'status': 'startBatch',
            'requested': numForms
        }, args.user);

        function exportNext() {
            if (0 === formIds.length) {
                Y.doccirrus.forms.exportutils.raiseExportEvent({
                    'status': 'endBatch',
                    'requested': numForms,
                    'exported': exportCount,
                    'failed': failures
                }, args.user);

                return;
            }

            nextFormId = formIds.pop();
            Y.doccirrus.forms.exportutils.exportForm(args.user, nextFormId, withHistory, onExportedForm);
        }

        function onExportedForm(err) {

            if (err) {
                failures.push(nextFormId);
            } else {
                exportCount = exportCount + 1;
            }

            exportNext();
        }
    }

        /**
         *  Method to bulk export all forms, versions and media in database more quickly than before
         *
         *  Note that this calls back immediately, the notifies client of progress via websocket events
         *
         *  @param  args    {Object}    REST request
         */

        function exportAllForms( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.exportAllForms', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.exportAllForms');
            }
            args.callback( null, { 'startBatch': 'all' } );                                 //  eslint-disable-line
            Y.doccirrus.forms.exportutils.exportAllForms( args.user, onAllExported );

            function onAllExported() {
                Y.log( 'Completed export of all forms.', 'debug', NAME );
            }
        }

        /**
         *  Handle upload of a form backup
         */

        function uploadFormBackup( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.uploadFormBackup', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.uploadFormBackup');
            }
            Y.log('Called /1/formtemplate/:uploadbackup', 'info', NAME);

            var
                newId = 'formzip_' + new Date().getTime(),      //% temporary identifier
                files = args.originalfiles,
                lastFile = {},
                k;

            Y.doccirrus.api.formtemplate.clearFormListCache();

            //  Check passed file uploads

            if( 'object' !== (typeof files) ) {
                args.callback( Y.doccirrus.errors.rest( 500, 'Please upload a single file.', true ) );
                return;
            }

            //  Can only process a single upload at a time, select last file in set

            for( k in files ) {
                if( files.hasOwnProperty( k ) ) {
                    if( files[k].hasOwnProperty( 'path' ) ) {
                        lastFile = files[k];
                    }
                }
            }

            //  Check that at least one file was passed

            if( false === lastFile.hasOwnProperty( 'path' ) ) {
                args.callback( Y.doccirrus.errors.rest( 500, 'Invalid file upload.', true ) );
                return;
            }

            //  Validate, normalize and stat the uploaded image

            Y.doccirrus.forms.importutils.handleArchiveUpload( args.user, lastFile, newId, onExtractArchive );

            function onExtractArchive( err ) {
                if( err ) {
                    args.callback( Y.doccirrus.errors.rest( 500, 'Could not extract archive.', 500 ) );
                    return;
                }

                args.callback( null, {'status': 'ok' } );
            }
        }

        /**
         *  Export a form and dependencies to be added to a zip file for download
         *
         *  @param  args    {Object}    /1/ REST args
         */

        function exportSingleForm( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.exportSingleForm', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.exportSingleForm');
            }
            var
                params = args.originalParams,
                id = params.id || '',
                withHistory = false,
                modelName = params.modelname || 'formtemplate';

            Y.log( 'Called exportform: ' + modelName + ' ' + id + ' with history ' + ( withHistory ? 'TRUE' : 'FALSE' ), 'info', NAME );

            if ( '' === id ) {
                args.callback( Y.doccirrus.errors.rest( 404, 'Please specify a form to export.', true ) );
                return;
            }

            Y.doccirrus.forms.exportutils.exportForm( args.user, id, withHistory, onFormExported );

            function onFormExported( err, copyOK, copyFail ) {
                if ( err ) {
                    Y.log( 'Could not export ' + modelName + ' ' + id + ': ' + err, 'warn', NAME );
                    args.callback( err );
                    return;
                }

                args.callback( null, { 'success': copyOK, 'failure': copyFail });
            }
        }

        /**
         *  Import a form from the temp/upload directory (uploaded zip file contents)
         *
         *  see: exportutils.server.js and /var/formsexport
         */

        async function importSingleForm( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.importSingleForm', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.importSingleForm');
            }

            let
                callback = args.callback,
                params = args.originalParams,
                modelName = params.modelName || 'formtemplate',
                id = params.id || '',

                err, newForm;

            Y.log( 'Called importform ' + modelName + ' ' + id, 'info', NAME );

            if ('' === id) {
                return handleResult(Y.doccirrus.errors.rest( 404, 'Please specify a form to import', true ), null, callback);
            }

            [err, newForm] = await formatPromiseResult(new Promise((resolve, reject)=> {
                Y.doccirrus.forms.importutils.importForm(args.user, { modelName, id }, (err, formdata) => {
                    if (err) {
                        Y.log('Could not import ' + modelName + ' ' + id + ': ' + err, 'warn', NAME);
                       reject(err);
                       return;
                    }

                    resolve(formdata);
                });
            }));

            if (err) {
                Y.log(`Form import failed ${modelName}, id: ${id},  ${err.stack || err}`, 'error', NAME);
            }

            return handleResult(err, {
                ...newForm
            }, callback);
        }

        /**
         *  Collect all of a form's dependencies into a single object
         *  @param args
         */

        function packageForm( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.packageForm', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.packageForm');
            }
            var
                params = args.originalParams,
                formId = params.formId || '',
                formVersionId = params.formVersionId || '';

            if ( '' === formId ) {
                return args.callback( Y.doccirrus.errors.rest( 500, 'No formId given', true ) );
            }

            Y.doccirrus.forms.package.toBase64( args.user, formId, formVersionId, args.callback );
        }

        /**
         *  Create a list of custom/user defined reporting fields from forms
         */

        function getUserReportingFields( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.getUserReportingFields', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.getUserReportingFields');
            }
            Y.doccirrus.formsReportingHelper.getUserReportingFields( args );
        }


        /**
         *  Create and map form for a new activity
         *  This is intended as a test for API calls which wil be made to mappinghelper.server.js
         */

        function testFormCreation( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.testFormCreation', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.testFormCreation');
            }
            var
                params = args.originalParams,
                activityId = params.activityId || '5a03326992ebe512384eac94',
                rCache = Y.doccirrus.insight2.reportingCache.createReportingCache();

            Y.doccirrus.forms.mappinghelper.initializeFormForActivity( args.user, activityId, rCache, onFormCreated );

            function onFormCreated( err, result ) {
                //console.log( '(****) onFormCreated, err: ', err );
                //console.log( '(****) onFormCreated, result: ', result );
                args.callback( err, result );
            }
        }

        /**
         *  Dev / support route to import forms from disk (otherwise runs on server start)
         *
         *  This will clear the file hashes in the admins collection, to force check of all forms
         *
         *  @param args
         */

        async function testImport(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.testImport', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.testImport');
            }

            Y.log('Called testImport (REST)', 'info', NAME);

            const
                runOnStartP = util.promisify( Y.doccirrus.forms.importutils.runOnStart ),
                adminFormsId = Y.doccirrus.schemas.admin.getDefaultFormId();

            var err, report;

            [ err ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: 'admin',
                    action: 'delete',
                    query: { _id: adminFormsId }
                } )
            );

            if ( err ) { return args.callback( err ); }

            args.user.testImport = true;

            [ err, report ] = await formatPromiseResult( runOnStartP( args.user ) );

            if ( err ) { return args.callback( err ); }

            Y.log( `Completed manual import for default forms from disk, report:\n${report}`, 'info', NAME );

            args.callback( null, { 'report': report } );
        }

        /**
         *  Method to manually run migration of form document to new format
         *  @param args
         */

        function testMigration(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.testMigration', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.testMigration');
            }
            Y.doccirrus.forms.migrationhelper.updateFormDocumentFormat(args.user, false, function onMigrationComplete(err) {
                if (err) { args.callback(err); return; }
                args.callback(null, 'Form document migration complete');
            });
        }

        /**
         *  Method to manually run migration of form documents to include a format version number and to adjust element
         *  positions to match new text layout system
         *
         *  @param args
         */

        function testVersionMigration(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.testVersionMigration', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.testVersionMigration');
            }
            function onMigrationComplete(err, report) {
                if (err) {
                    Y.log('Could not complete forms migration: ' + (report || ''), 'debug', NAME);
                    args.callback(err);
                    return;
                }
                args.callback(null, 'Form document migration complete: <br/>' + report);
            }

            Y.doccirrus.forms.migrationhelper.checkOrAddAllFormatVersions(args.user, onMigrationComplete);
        }

        /**
         *  Fix for a bug where formtemplateversions could be updated twice
         *  @param args
         */

        function testFixDuplicateMigration(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.testFixDuplicateMigration', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.testFixDuplicateMigration');
            }
            function onMigrationComplete(err, report) {
                if (err) {
                    Y.log('Could not complete forms migration: ' + (report || ''), 'debug', NAME);
                    args.callback(err);
                    return;
                }
                args.callback(null, 'Form document migration complete: <br/>' + report);
            }

            Y.doccirrus.forms.migrationhelper.testBatchUndoDuplicateMigration(args.user, onMigrationComplete);
        }

        function testAddDependencies(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.testAddDependencies', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.testAddDependencies');
            }
            args.user.isNotInMigration = false;
            Y.doccirrus.forms.migrationhelper.addFormDependencies(
                args.user,
                function onAddedDeps(err, report) {
                    args.callback(err, { 'report': report });
                }
            );
        }

        function testClearDependencies(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.testClearDependencies', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.testClearDependencies');
            }
            Y.doccirrus.forms.migrationhelper.clearFormDependencies(
                args.user,
                function onAddedDeps(err) {
                    args.callback(err, { 'report': 'Cleared all dependencies' });
                }
            );
        }

        /**
         *  Test route to set all images in all forms and versions to be read-only
         *  future: this may later include a set of hardcoded forms to be omitted from this actionn
         *
         *  @param args
         */

        function testImageReadOnlyMigration( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.testImageReadOnlyMigration', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.testImageReadOnlyMigration');
            }
            var report = '';

            async.series(
                [
                    migrateFormTemplates,
                    migrateFormTemplateVersions
                ],
                onAllDone
            );

            //  make images read-only in the canonical form templates
            function migrateFormTemplates( itcb ) {
                function onMigrateFormTemplates( err, reportPart ) {
                    report = report + reportPart;
                    itcb( err );
                }
                Y.doccirrus.forms.migrationhelper.setFormImagesReadOnly(
                    args.user,
                    'formtemplate',
                    false,
                    onMigrateFormTemplates
                );
            }

            //  make images read-only in the form versions
            function migrateFormTemplateVersions( itcb ) {
                function onMigrateFormTemplates( err, reportPart ) {
                    report = report + reportPart;
                    itcb( err );
                }
                Y.doccirrus.forms.migrationhelper.setFormImagesReadOnly(
                    args.user,
                    'formtemplateversion',
                    false,
                    onMigrateFormTemplates
                );
            }

            //  finally
            function onAllDone( err ) {
                args.callback( err, { 'report': report } );
            }
        }

        function testFormElementBordersMigration( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.testFormElementBordersMigration', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.testFormElementBordersMigration');
            }
            Y.log( 'Invoking migration fixElementBorders...', 'debug', NAME );
            Y.doccirrus.forms.migrationhelper.fixElementBorders( args.user, false, args.callback );
        }

        /**
         *  Unset all English translations in forms to remove bad/legacy data
         *
         *  This is intended to only be run manually in order to produce a clean forms export
         *  This can optionally replace all English translations with German ones is the 'replaceTranslations' option is passed
         *
         *  @param args
         */

        function setAllToGerman( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.setAllToGerman', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.setAllToGerman');
            }
            var
                params = args.originalParams || {},
                opts = {};

            if ( params.replaceText ) {
                opts.replaceText = true;
            }

            Y.doccirrus.forms.migrationhelper.setAllToGerman(
                args.user,
                opts,                   //  no special options set
                false,                  //  not in migration
                args.callback
            );
        }

        /**
         *  MOJ-6698 Lock tables to user input for all existing forms
         *  @param args
         */

        function makeTablesReadOnly( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.makeTablesReadOnly', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.makeTablesReadOnly');
            }
            Y.doccirrus.forms.migrationhelper.makeTablesReadOnly(
                args.user,
                false,                  //  not in migration
                args.callback
            );
        }

        /**
         *  note: Form list cache is currently not used due as yet unresolved IPC issues
         *  @param args
         */

        function clearFormListCache(args) {
            Y.log('Entering Y.doccirrus.api.formtemplate.clearFormListCache', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.clearFormListCache');
            }
            cacheFormList = null;

            if (args && args.callback) {
                return args.callback(null, { 'msg': 'cleared form list cache' });
            }
        }

        function runOnStart( user, callback ) {
            var cluster = require( 'cluster' );

            if ( cluster.isMaster ) {
                Y.doccirrus.forms.importutils.enforceRevocations( user, callback );
            }

            //  initialize country-specific schema members which depend on config
            Y.dcforms.initInvoiceItem_CH_T();
            Y.dcforms.initInCase_CH_T();
        }

        /**
         *  temporary test route to track down incorrect infrastructure config variables
         *  @param args
         */

        function getCssURL( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.getCssURL', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.getCssURL');
            }

            var
                dcauth = require( __dirname + '/../../../node_modules/dc-core' ).auth,
                meta = {},
                cssUrl = '/fonts/ttf.css';

            meta.infrastructure = {puc: dcauth.getPUCUrl( '' ), prc: dcauth.isPRC() ? dcauth.getPRCUrl( '' ) : dcauth.getVPRCUrl( '' ) };

            cssUrl = meta.infrastructure.prc + cssUrl;

            //  ac.addCss will prepend a '/', so use a second single '/' to get an absolute URL
            cssUrl = cssUrl.replace('http://', '//');
            cssUrl = cssUrl.replace('https://', '//');

            args.callback( null, { 'css': cssUrl } );
        }

        /**
         *  get data from activityIds and prepares data for print copy and pass data generate pdf and print
         *  @param args
         */

        async function prepareDataForPrintCopyWS( args ) {
            Y.log('Entering Y.doccirrus.api.formtemplate.prepareDataForPrintCopyWS', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formtemplate.prepareDataForPrintCopyWS');
            }

            let
                user = args.user,
                params = args.originalParams,
                activityIds = params.activityIds || [],
                copiesNumber = params.copiesNumber || 0,
                printerName = params.printerName,
                dataForCopies = [];

            if( activityIds && activityIds.length ) {
                let [error, activities] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: { _id: { $in: activityIds} }
                    } )
                );

                if( error ) {
                    Y.log( `Failed to get activities ${error.stack || error}`, 'error', NAME );
                    throw error;
                }

                if( activities ) {
                    activities.forEach( function( activity ) {
                        dataForCopies.push({
                            'serialRender': 'true',
                            'formId': activity.formId,
                            'formVersionId': activity.formVersion,
                            'mapCollection': 'activity',
                            'mapObject': activity._id.toString(),
                            'saveTo': 'temp',
                            'printTo': printerName,
                            'printCopies': 1,
                            'waitCallback': true,
                            'notNotify': true
                        });
                    });
                }
            }

            for ( let i = 0; i < copiesNumber; i ++ ) {
                dataForCopies.forEach( async function( activity, idx ) {
                    let [error] = await formatPromiseResult(
                        new Promise( (resolve, reject) => {
                            Y.doccirrus.api.formtemplate.printpdfcopyws( {
                                'user': user,
                                'originalParams': activity,
                                'callback': function( err, res ) {
                                    if( err ) {
                                        reject( err );
                                    } else {
                                        resolve( res );
                                    }
                                }
                            } );
                        })
                    );

                    if( error ) {
                        Y.log( `Failed to print copy ${error.stack || error}`, 'error', NAME );
                        throw error;
                    }

                    if( i === copiesNumber - 1 && idx === dataForCopies.length - 1 ) {
                        let printMsg = {
                            'status': 'complete',
                            'mediaId': 'KOPIE',
                            'printerName': printerName,
                            'msg': 'KOPIE (' + copiesNumber + ')'
                        };

                        Y.doccirrus.communication.emitEventForUser( {
                            targetId: args.user.identityId,
                            nsp: 'default',
                            event: 'asyncPDFPrinted',
                            msg: {
                                data: printMsg
                            }
                        } );
                    }
                });
            }

            args.callback( null );
        }

        /**
         *  Create forms which are missing due to import, error or broken batch processes
         *
         *  This method will check for a 'migrationtasks' collection, which should contain documents with 'taskname'
         *  and 'objId' properties.  This will process tasks named 'CREATE_FORM'
         *
         *  The 'migrationtasks' collection is populated by a 3LS mongoscript
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback
         */

        async function createMissingForms( args ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                initializeFormP = util.promisify( Y.doccirrus.forms.mappinghelper.initializeFormForActivity ),
                user = args.user,
                taskQuery = { taskname: 'CREATE_FORM' };

            let
                err, migrationTasksModel,
                tasksCursor, taskCount, task,
                progress = 0;

            //  1. Create a model to iterate over tasks
            [ err, migrationTasksModel ] = await formatPromiseResult( getModelP( user, 'migrationtask', true ) );

            if ( err ) {
                Y.log( `Could not initialize migration tasks model: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            //  2. Count outstanding tasks
            [ err, taskCount ] = await formatPromiseResult( migrationTasksModel.mongoose.count( taskQuery ).exec() );

            if ( err ) {
                Y.log( `Could not count migration tasks: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            //  3. Run a cursor over the tasks and execute them sequentially
            tasksCursor = migrationTasksModel.mongoose.find( taskQuery ).cursor();
            tasksCursor.addCursorFlag('noCursorTimeout', true);

            let result;

            while ( task = await tasksCursor.next() ) {  // eslint-disable-line no-cond-assign
                Y.log( `Initializing form for activity: ${ task.objId } (${progress + 1} of ${taskCount})`, 'info', NAME );

                //  4.1 Try to initialize the form
                [ err, result ] = await formatPromiseResult( initializeFormP( user, `${ task.objId }`, false, false ) );

                if ( err ) {
                    Y.log( `Could not initialize form for activity ${task.objId}: ${err.stack||err}`, 'error', NAME );
                    //  delete the task and continue with the next, best effort
                }

                //  4.2 Delete the task and any duplicates
                taskQuery.objId = task.objId;
                [ err ] = await formatPromiseResult( migrationTasksModel.mongoose.deleteMany( taskQuery ).exec() );

                if ( err ) {
                    Y.log( `Could not clear task ${JSON.stringify( task )}: ${err.stack||err}`, 'error', NAME );
                    //  continue, best effort
                }

                progress = progress + 1;
            }

            args.callback( null, { status: `Processed ${taskCount} CREATE_FORM tasks, details in log.` } ); //  eslint-disable-line callback-return
        }

        /**
         *  Create pdfs which are missing due to import, error or broken batch processes
         *
         *  This method will check for a 'migrationtasks' collection, which should contain documents with 'taskname'
         *  and 'objId' properties.  This will process tasks named 'CREATE_PDF'
         *
         *  The 'migrationtasks' collection is populated by a 3LS mongoscript
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback
         */

        async function createMissingPdfs( args ) {
            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                makePdfP = promisifyArgsCallback( Y.doccirrus.forms.renderOnServer.toPDF ),
                user = args.user,
                taskQuery = { taskname: 'CREATE_PDF' };

            let
                err, migrationTasksModel,
                tasksCursor, taskCount, task,
                pdfOptions, activity, result,
                progress = 0;

            //  1. Create a model to iterate over tasks
            [ err, migrationTasksModel ] = await formatPromiseResult( getModelP( user, 'migrationtask', true ) );

            if ( err ) {
                Y.log( `Could not initialize migration tasks model: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            //  2. Count outstanding tasks
            [ err, taskCount ] = await formatPromiseResult( migrationTasksModel.mongoose.count( taskQuery ).exec() );

            if ( err ) {
                Y.log( `Could not count migration tasks: ${err.stack||err}`, 'error', NAME );
                return args.callback( err );
            }

            //  3. This might take awhile, call back immediately
            args.callback( null, { status: `Processing ${taskCount.length} tasks, details in log.` } ); //  eslint-disable-line callback-return

            //  4. Run a cursor over the tasks and execute them sequentially
            tasksCursor = migrationTasksModel.mongoose.find( taskQuery ).cursor();
            tasksCursor.addCursorFlag('noCursorTimeout', true);

            while ( task = await tasksCursor.next() ) {  // eslint-disable-line no-cond-assign
                Y.log( `(re)creating for for activity: ${ task.objId } (${progress} of ${taskCount})`, 'info', NAME );

                //  4.1 Try to load the activity

                [ err, result ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        query: { _id: `${task.objId}` }
                    } )
                );

                if ( err ) {
                    Y.log( `Could not load activity ${task.objId}, cannot create PDF: ${err.stack||err}`, 'error', NAME );
                    continue;
                }

                if ( !result[0] ) {
                    Y.log( `Could not load activity ${task.objId}, cannot create PDF`, 'error', NAME );
                    continue;
                }

                activity = result[0];

                //  4.2 Try to (re)create the PDF

                pdfOptions = {
                    'user': user,                                   //  user
                    'formId': (activity.formId + ''),               //  formtemplate _id
                    'formVersionId': (activity.formVersion + ''),   //  formtemplateversion _id or ''
                    'mapperName': '',                               //  inferred from form if not sent
                    'mapCollection': 'activity',                    //  owner collection
                    'mapObject': (activity._id + ''),               //  owner _id
                    'mapFields': {},                                //  extra properties to set in form
                    'saveTo':'db',                                  //  saveTo database
                    'zipid': '',                                    //  zipId (not zipped)
                    'preferName': '',                               //  preferName (no preferred name on disk)
                    'onProgress': null                              //  event handler for PDF progress
                };

                [ err ] = await formatPromiseResult( makePdfP( pdfOptions ) );

                if ( err ) {
                    Y.log( `Could not make PDF for activity ${task.objId}: ${err.stack||err}`, 'error', NAME );
                    //  delete the task and continue with the next, best effort
                } else {
                    Y.log( `Created PDF for activity: ${JSON.stringify( result )}`, 'info', NAME );
                }

                //  4.3 Delete the task and any duplicates
                taskQuery.objId = task.objId;
                [ err ] = await formatPromiseResult( migrationTasksModel.mongoose.deleteMany( taskQuery ).exec() );

                if ( err ) {
                    Y.log( `Could not clear task ${JSON.stringify( task )}: ${err.stack||err}`, 'error', NAME );
                    //  continue, best effort
                }

                progress = progress + 1;
            }

            args.callback( null, { status: `Processed ${taskCount} CREATE_PDF tasks, details in log.` } ); //  eslint-disable-line callback-return
        }

        //  MEDIA REST API

        Y.namespace( 'doccirrus.api' ).formtemplate = {
            //  automatic import of forms
            runOnStart: runOnStart,

            //  forms CRUD
            'createform': createForm,
            'loadform': loadForm,
            'saveform': saveForm,
            'listforms': listForms,
            'deletewithhistory': deleteWithHistory,
            'deletecanonicalonly': deleteCanonicalOnly,

            //  form  versions
            'createversion': createVersion,
            'listversions': listVersions,
            'latestVersionMeta': latestVersionMeta,

            //  forms configuration
            'getcategories': getCategories,
            'getconfig': getConfig,
            'setconfig': setConfig,
            'clearFormListCache': clearFormListCache,

            //  printing and management
            'makepdf': makePDF,
            'makepdfws': makePDFws,
            'generatePdfDirect': generatePdfDirect,
            'regeneratepdf': regeneratePDF,
            'compilebatchpdf': compileBatchPDF,
            'isinuse': isInUse,
            'replaceform': replaceForm,
            'replaceformindoc': replaceFormInDoc,
            'makereportpdf': makeReportPDF,
            'makekotablepdf': makeKoTablePDF,
            'makecasefiletablepdf': makeCasefileTablePDF,
            'printpdfcopyws': printPDFCopyWS,
            'prepareDataForPrintCopyWS': prepareDataForPrintCopyWS,

            //  import and export
            'listdependencies': listDependencies,
            'listformexports': listFormExports,
            'clearformexports': clearFormExports,
            'exportforms': exportForms,
            'exportallforms': exportAllForms,
            'uploadbackup': uploadFormBackup,
            'exportform': exportSingleForm,
            'importform': importSingleForm,

            //  experimental
            'packageform': packageForm,
            'getUserReportingFields': getUserReportingFields,

            //  generate missing forms and PDFs (initializing migrated data)
            createMissingForms,
            createMissingPdfs,

            //  migration testing
            'testimport': testImport,
            'testMigration': testMigration,
            'testVersionMigration': testVersionMigration,
            'testFixDuplicateMigration': testFixDuplicateMigration,
            'testAddDependencies': testAddDependencies,
            'testClearDependencies': testClearDependencies,
            'testImageReadOnlyMigration': testImageReadOnlyMigration,
            'testFormElementBordersMigration': testFormElementBordersMigration,
            'testFormCreation': testFormCreation,

            'setAllToGerman': setAllToGerman,
            'makeTablesReadOnly': makeTablesReadOnly,

            'getCssURL': getCssURL
        };

    },
    '0.0.1',
    {requires: [
        'formtemplate-schema',
        'dcforms-confighelper',
        'dcforms-exportutils',
        'dcforms-categories',
        'dcforms-packageutils',
        'dcforms-reportinghelper',
        'dcforms-mappinghelper',
        //  temporary
        'admin-schema',

        // schemas defined on startup
        'dcforms-schema-InCase-CH-T',
        'dcforms-schema-InvoiceItem-CH-T',
        'dcforms-schema-Prescription-CH-T'

    ]}
);
