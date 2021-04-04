/*
 * Copyright (c) 2012 Doc Cirrus GmbH
 * all rights reserved.
 */

//  Allowing late definitions for readability - lets us put the callback chains is execution order from top to bottom

/*jslint latedef:false */
/*global YUI */



YUI.add('FormEditorMojit', function (Y, NAME) {

        /**
         * The FormEditorMojit module.
         *
         * @module FormEditorMojit
         */

        const
            { masterDCFormTenant } = Y.doccirrus.utils.getConfig( 'env.json' );

        //var
        //  historical and current collections where forms are kept
        //  formModels = ['form', 'formtemplate', 'formtemplateversion'],

        //  a better way to handle dates
        //  moment = require('moment');

        /**
         *  ac.error() no longer used for REST calls, this is a quick way to migrate to new scheme
         *
         *  2013-11-12
         *
         *  TODO: replace this with current pattern
         *
         *  @param ac       {object}    action context of a REST call
         *  @param msg      {string}    error message
         *  @param code     {number}    optional HTTP status code, default is 404
         */

        function acRestError(ac, msg, code) {

            if (!msg) {
                msg = 'Undefined REST error from FormEditorMojit';
            }

            if (!code) {
                code = 404;
            }

            Y.log('REST error: ' + msg + ' (code: ' + code + ')', 'warn', NAME);
            Y.doccirrus.utils.reportErrorJSON(ac, code, msg);
        }


        /**
         * Constructor for the Controller class.
         *
         * @class Controller
         * @constructor
         */

        Y.namespace('mojito.controllers')[NAME] = {

            //  INTERNAL

            /**
             * Used by default methods of the restcontroller
             * @returns {string}
             */

            getModelName: function() {
                return 'formtemplate';
            },

            //  PAGES

            /**
             * Method corresponding to the '/forms' route, default for this module.
             * @param ac {Object} The ActionContext that provides access to the Mojito API.
             */

            forms: function (ac) {
                var
                    licenceName = Y.doccirrus.auth.getRequiredLicense( NAME ),
                    licenceUrl = '/license?licenseType=' + licenceName,
                    jadeDict = ac.intl.lang();

                jadeDict.bs3 = true;

                //  check if the server was started with --debug and pass to editor
                jadeDict.ARGV_DEBUG = (Y.config.argv.hasOwnProperty('debug') && Y.config.argv.debug);

                //  list of client-side components moved to ./autoload/assethelper.server.js
                Y.doccirrus.forms.assethelper(ac);
                //ac.assets.addCss( '/static/CaseFileMojit/assets/css/ko.css' );
                ac.assets.addCss( Y.doccirrus.media.fonts.getCssUrl( ac ) );
                ac.assets.addCss('./css/ko.css');
                ac.assets.addJs( '/static/InvoiceMojit/assets/js/knockout_dragdrop.js' );

                ac.pageData.set( 'masterDCFormTenant', masterDCFormTenant );

                if( !Y.doccirrus.auth.hasModuleAccess( ac.http.getRequest() && ac.http.getRequest().user, NAME ) ) {
                    Y.doccirrus.utils.redirect( licenceUrl, ac );
                    return;
                }

                if( !Y.doccirrus.auth.hasSectionAccess( ac.http.getRequest() && ac.http.getRequest().user, 'FormEditorMojit.forms' ) ) {
                    Y.log( 'No admin account... disallowing access to /forms route, redirect to front page', 'warn', NAME );
                    Y.doccirrus.utils.redirect( '/', ac );
                } else {
                    ac.done( jadeDict, {title: Y.doccirrus.i18n('general.PAGE_TITLE.CONFIGURATION')} );
                }
            },

            /**
             * Method corresponding to the '/formprinters' route, default for this module.
             * @param ac {Object} The ActionContext that provides access to the Mojito API.
             */

            formprinters: function (ac) {
                var jadeDict = ac.intl.lang();
                jadeDict.bs3 = true;

                //  check if the server was started with --debug and pass to editor
                jadeDict.ARGV_DEBUG = (Y.config.argv.hasOwnProperty('debug') && Y.config.argv.debug);

                //  list of client-side components moved to ./autoload/assethelper.server.js
                Y.doccirrus.forms.assethelper(ac);

                ac.assets.addCss('./css/ko.css');
                ac.assets.addCss('/static/FormEditorMojit/assets/css/jquery-sortable.css');
                ac.assets.addJs('/static/FormEditorMojit/assets/js/jquery-sortable.js');

                ac.done(jadeDict, {title: Y.doccirrus.i18n('general.PAGE_TITLE.CONFIGURATION')});
            },

            /**
             * Method corresponding to the '/formsdiagnostic' route
             * @param ac {Object} The ActionContext that provides access to the Mojito API.
             */

            formsdiagnostic: function (ac) {
                var jadeDict = ac.intl.lang();
                jadeDict.bs3 = true;

                //  list of client-side components moved to ./autoload/assethelper.server.js
                Y.doccirrus.forms.assethelper(ac);
                ac.assets.addCss('./css/ko.css');
                ac.done(jadeDict);
            },

            //  REST METHODS

            /**
             *  REST action to list reduced schema for validating forms (DEPRECATED)
             *  @param ac
             */

            listreducedschema: function (ac) {
                Y.log('DEPRECATED: listreducedschema, please use Y.dcforms.reducedschema.listSync', 'warn', NAME);
                var finish = this._getCallback(ac);
                finish(null, Y.dcforms.reducedschema.listSync());
            },

            /**
             *  REST action to load a reduced schema
             *  @param ac
             */

            getreducedschema: function (ac) {
                Y.log('DEPRECATED: getreducedschema (REST), please use Y.dcforms.reducedSchema.loadSync', 'warn', NAME);

                var
                    finish = this._getCallback(ac),
                    schemaName = ac.rest.originalparams.schema,
                    schema = Y.dcforms.reducedschema.loadSync(schemaName);

                if (schema) {
                    finish(null, schema);
                } else {
                    acRestError(ac, 'Could not read reduced schema "' + schemaName + '"', 404);
                }
            },

            /**
             *  Load a user form from the database
             *
             *  If only a template _id is given then the latest, canonical form is returned - if a versionId is given
             *  then a previous version of a form is returned.  If a version is specified but not found then a
             *  best effort is made to find the latest version of a form.
             *
             *  Moving to formtemplate-api.server.js - calls to this are deprecated
             *
             *  @param ac
             */

            loadform: function (ac) {

                var args = {
                    callback: this._getCallback(ac),
                    originalParams: ac.rest.originalparams,
                    user: ac.rest.user
                };

                Y.doccirrus.api.formtemplate.loadform(args);
            },

            /**
             *  Update a form template in the database
             *
             *  Note that this updates the canonical current copy of the form, does not create a new version, changes
             *  should not be visible in - eg - CaseFile until a new version is created.
             *
             *  In previous version of this module there was a copy of a form per user - that is no longer the case.
             *
             *  DEPRECATED: please use /1/formtemplate/saveform
             *
             *  @param ac
             */

            saveform: function (ac) {

                if (!ac.rest.originalparams.id) { onFailure('form template ID not given'); return; }
                if (!ac.rest.originalparams.template) { onFailure('template not given'); return; }

                var
                    finish = this._getCallback(ac),
                    templateId = ac.rest.originalparams.id,
                    template = ac.rest.originalparams.template,
                    defaultFor = '',
                    dbQuery = { '_id': templateId },
                    saveData = {
                        'userId': ac.rest.user.identityId,
                        'formId': templateId,
                        'fields_': ['jsonTemplate', 'category', 'version', 'revision', 'formId', 'isReadOnly', 'formatVersion'],
                        'category': template.category,
                        'isReadOnly': template.isReadOnly,
                        'version': template.version,
                        'revision': template.revision,
                        'jsonTemplate': template,
                        'formatVersion': 1.1
                    };

                if (!saveData.jsonTemplate.defaultFor) {
                    saveData.jsonTemplate.defaultFor = '';
                }

                defaultFor = saveData.jsonTemplate.defaultFor;
                saveData = Y.doccirrus.filters.cleanDbObject(saveData);

                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: 'formtemplate',
                    user: ac.rest.user,
                    data: saveData,
                    fields: {},
                    query: dbQuery
                }, onTemplateStored );

                //  Make any changes needed to role assignments
                function onTemplateStored(err) {
                    if (err) {
                        onFailure(err);
                        return;
                    }

                    Y.log('Saved / updated form: ' + templateId + ' (' + JSON.stringify(template.name) + ')', 'debug', NAME);

                    Y.doccirrus.formsconfig.notifyConfigChange(ac.rest.user, defaultFor, templateId, onRoleAssigned);
                }

                //  Return canonicalId to the client
                function onRoleAssigned(err) {
                    if (err) {
                        Y.log('Error assigning form role after save: ' + err, 'warn', NAME);
                    }

                    finish(null, templateId);
                }

                //  In case of problem
                function onFailure(err) {
                    acRestError(ac, err, 500);
                }
            },

            /**
             *  Export a form and dependancies to be added to a zip file for download
             *  @param ac
             */

            'exportform': function (ac) {

                var
                    params = ac.rest.originalparams,
                    id = params.id || '',
                    withHistory = false,
                    modelName = params.modelname || 'formtemplate',
                    finish = this._getCallback(ac);                 //% ac.done()

                Y.log('Called exportform: ' + modelName + ' ' + id + ' with history ' + (withHistory ? 'TRUE' : 'FALSE'), 'info', NAME);

                if ('' === id) {
                    acRestError( ac, 'Please specify a form to export.', 404 );
                    return;
                }

                Y.doccirrus.forms.exportutils.exportForm(ac.rest.user, id, withHistory, onFormExported);

                function onFormExported(err, copyOK, copyFail) {
                    if (err) {
                        Y.log('Could not export ' + modelName + ' ' + id + ': ' + err, 'warn', NAME);
                        acRestError( ac, 'Could not export ' + modelName + ' ' + id + ':' + err );
                        return;
                    }

                    finish( null, { 'success': copyOK, 'failure': copyFail });
                }
            },

            /**
             *  Test route to speed / test development of forms migration helper
             *  @param ac
             */

            'migrateformstest': function(ac) {
                var
                    params = ac.rest.originalparams,
                    task = params.task || '',
                    finish = this._getCallback(ac);


                Y.doccirrus.api.formtemplate.clearFormListCache();

                switch(task) {
                    case 'dbforms':
                        //  Rebuild form revision history and move into appropriate tables
                        Y.doccirrus.forms.migrationhelper.migrateDBForms( ac.rest.user, onTaskComplete);
                        break;

                    case 'dbactivities':
                        //  COrrect references to forms in activities
                        Y.doccirrus.forms.migrationhelper.migrateOwners( ac.rest.user, 'activity', onTaskComplete);
                        break;


                    case 'dbdocuments':
                        //  Correct references to forms in documents
                        Y.doccirrus.forms.migrationhelper.migrateOwners( ac.rest.user, 'document', onTaskComplete);
                        break;

                    default:
                        acRestError( ac, 'Unrecognized please specify a migration task to test.', 404 );
                        return;
                }

                function onTaskComplete( err, result ) {

                    if (err) {
                        acRestError( ac, 'Migration task "' + task + '" failed:' + err, 500);
                        return;
                    }

                    switch(task) {
                        case 'dbforms':         finish( null, { 'report': result } );   break;
                        case 'dbactivities':    finish( null, { 'report': result } );   break;
                        case 'dbdocuments':     finish( null, { 'report': result } );   break;
                    }
                }
            },


            /**
             * Store submitted questionnaires
             *
             * DEPRECATED: submitted forms are now held as documents
             *
             * TODO: remove this (still used by patient portal, to be refactored out)
             *
             * @param ac
             */

            submitquestionnaire: function (ac) {
                var
                    finish = this._getCallback(ac),
                    params = ac.rest.originalparams,
                    fileName = params.fileName || '',                            //% name of original file on disk [string]
                    keyList = params.keyList ? params.keyList.split(',') : '',   //% list of form input elements [string]

                    randId = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
                    fields = {},
                    i;

                if ('' === fileName) {
                    acRestError(ac, 'fileName not specified in POST', 500);
                }
                if ('' === keyList) {
                    acRestError(ac, 'keylist not specified in POST', 500);
                }

                for (i = 0; i < keyList.length; i++) {
                    fields[keyList[i]] = params[keyList[i]];
                }

                var
                    storeObj = {                                    //  object to be stored
                        'instanceId': randId + '_' + fileName,
                        'fieldsJson': JSON.stringify(fields),
                        'fileName': fileName,
                        'userId': ac.rest.user.identityId,
                        'tModified': new Date()
                    };

                Y.doccirrus.filters.cleanDbObject( storeObj );
                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    model: 'questionnaire',
                    user: ac.rest.user,
                    data: storeObj,
                    options: { 'overwrite': true }
                }, onQuestionnaireSaved );

                function onQuestionnaireSaved (err, results) {

                    if (err) {
                        onFailure('Could not complete database query to store for questionnaire: ' + err);
                        return;
                    }

                    // database query completed successfully, and we have results
                    finish(null, results[0]);
                }

                function onFailure(err) {
                    acRestError(ac, err, 404);
                }

            },

            //  silence lint errors about undefined variables
            //  these will be overwritten by property injection in restcontroller.server.js

            _getCallback: false


        };

    }, '0.0.1',
    {
        requires: [
            'mojito',
            'mojito-assets-addon',
            'mojito-config-addon',
            'mojito-params-addon',
            'mojito-models-addon',
            'mojito-http-addon',
            'mojito-intl-addon',
            'mojito-data-addon',
            'dcauth',
            'dcmongodb',
            'FormsTreeViewModel',

            //'dcforms-assethelper',
            //'dcforms-migrationhelper',
            //'dcforms-confighelper',

            'dcforms-exportutils',
            'dcforms-importutils',
            'dcforms-reducedschema',

            'formtemplate-api',

            'form-schema',
            'formfolder-schema',
            'formfolder-api',
            'formtemplate-schema',
            'formtemplateversion-schema',

            'schematemplate-flatfile',

            'formtemplate-flatfile',            //DEPRECATED
            'formimage-schema',                 //DEPRECATED
            'questionnaire-schema'              //DEPRECATED
        ]
    }
);

