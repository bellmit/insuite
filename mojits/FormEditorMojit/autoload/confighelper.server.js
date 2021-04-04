/**
 *  Get and manage form assignments
 *
 *  This has been updated such that form assignments are now kep in the database.  Only one form should
 *  be assigned per role.  This assignment is stored in the defaultFor field of the formtemplate-schema
 *
 *  @author: strix
 *  @date: 2013 December
 */

/*global YUI*/



YUI.add( 'dcforms-confighelper', function( Y , NAME ) {
        const { formatPromiseResult, handleResult } = require( 'dc-core' ).utils;
        /**
         *  Call back with current set of form role assignments
         *
         *  @param  user        {Object}    ac REST user
         *  @param  callback    {Function}  Of the form fn(err, data)
         */

        function getConfig(user, callback) {

            function onDbQuery(err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                var
                    assignments = {},
                    role,
                    i;

                //Y.log('found ' + data.length + ' items', 'debug', NAME);

                //  initialize the set of assignments
                for (i = 0; i < Y.doccirrus.formRoles.length; i++) {
                //  Y.log('Initializing: ' + Y.doccirrus.formRoles[i].name + ' --> ""', 'debug', NAME);
                    assignments[Y.doccirrus.formRoles[i].name] = '';
                }

                //  add assignments from database
                for (i = 0; i < data.length; i++) {
                    if ( data[i] && data[i].jsonTemplate && data[i].jsonTemplate.defaultFor ) {
                        role = data[i].jsonTemplate.defaultFor;
                        //Y.log('Found form role assignment: ' + data[i]._id + ' --> ' + role, 'debug', NAME);
                        if (assignments.hasOwnProperty(role) && '' !== assignments[role]) {
                            Y.log( 'Duplicate assignment to role: ' + role, 'warn', NAME );
                        }
                        assignments[role] = data[i]._id + '';
                    }
                }

                callback(null, assignments);
            }

            var
                dbSetup = {
                    'user': user,
                    'model': 'formtemplate',
                    'action': 'get',
                    'query': {
                        'jsonTemplate.defaultFor': { $ne: '' }
                    }
                };

            Y.doccirrus.mongodb.runDb(dbSetup, onDbQuery);
        }

        /**
         *  Unset all assignments for the given key except for the passed value
         *
         *  Only one form at a time holds a role
         *
         *  @param  user        {object}    ac.rest.user or equivalent
         *  @param  role        {string}    Name of a forms role
         *  @param  holder      {string}    Database _id of form which owns a role
         *  @param  callback    {function}  Of the form fn(err)
         */

        function enforceSingleAssignment(user, role, holder, callback) {

            function onCleared(err) {
                if (err) {
                    callback('Could not clear multiple assignments for role ' + role + ': ' + err);
                    return;
                }

                clearNext();
            }

            function clearNext() {
                if (0 === toClear.length) {
                    Y.log('Form role reassignment complete: ' + role + ' --> ' + holder, 'debug', NAME);
                    callback(null);
                    return;
                }

                var
                    nextForm = toClear.pop(),
                    dbPut = {
                        user: user,
                        action: 'put',
                        model: 'formtemplate',
                        query: { _id: nextForm._id},
                        fields: ['jsonTemplate'],
                        options: {}
                    };

                nextForm.jsonTemplate.defaultFor = '';

                dbPut.data = {
                    jsonTemplate: nextForm.jsonTemplate,
                    skipcheck_: true
                };

                Y.doccirrus.mongodb.runDb(dbPut, onCleared);
            }

            function onDbQuery(err, result) {
                if (err) {
                    callback('Could not load set of assigned forms for role ' + role + ': ' + err);
                    return;
                }

                Y.log(result.length  + ' forms claim role "' + role + '", assigning to ' + holder, 'debug', NAME);

                var i;
                for (i = 0; i < result.length; i++) {
                    if (result[i]._id.toString() !== holder) {
                        Y.log('Form ' + result[i]._id + ' claims role ' + role + ' but is not longer holder, removing...', 'debug', NAME);
                        toClear.push(result[i]);
                    }
                }

                clearNext();
            }

            var
                toClear = [],
                dbSetup = {
                    'user': user,
                    'model': 'formtemplate',
                    'action': 'get',
                    'query': { 'jsonTemplate.defaultFor': role }
                };

            Y.doccirrus.mongodb.runDb(dbSetup, onDbQuery);
        }

        /**
         *  Load the set of form categories from disk, moved from flatfile model
         *  @param  callback    {Function}      Of the form fn(err, data)
         */

        function getFormCategories(callback) {

            Y.log('DEPRECATED: formcategories are no longer loaded from disk, please use static YUI module', 'warn', NAME);
            callback(null, Y.dcforms.categories);
        }

        /**
         *  Called by other components when they save a form, notify which form holds a role
         *
         *  future: this should be called by save hook of form template object
         *
         *  @param  user        {object}    ac.rest.user or equivalent
         *  @param  role        {string}    Name of a forms role
         *  @param  holder      {string}    _id of canonical template which is assigned to this
         *  @param  callback
         */

        function notifyConfigChange(user, role, holder, callback) {

            Y.log('Checking form role assignment: ' + holder + ' --> ' + role, 'debug', NAME);

            if ('' === role) {
                Y.log('Form ' + holder + ' is not assigned to any role.', 'debug', NAME);
                callback(null);
                return;
            }

            enforceSingleAssignment(user, role, holder, callback);
        }

        /**
         *  Get the friendly name of a form role in the given language
         */

        function getRoleName(role, lang) {
            var
                roleName = role, i;

            for (i = 0 ; i < Y.doccirrus.formRoles.length; i++) {
                if (Y.doccirrus.formRoles[i].name === role && Y.doccirrus.formRoles[i].hasOwnProperty(lang)) {
                    roleName = Y.doccirrus.formRoles[i][lang];
                }
            }


            return roleName;
        }

        /**
         *  Given an activity type, get related form role
         *  TODO: implement subtype checks here
         *  @param  {String}    actType
         */

        async function getRoleForActTypeCaseFolderId( user, actType, caseFolderId ) {
            let err, caseFolder;

            [err, caseFolder] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'get',
                model: 'casefolder',
                query: {
                    _id: caseFolderId
                },
                options: {
                    limit: 1
                }
            } ) );

            if( err ) {
                Y.log( `getRoleForActTypeCaseFolderId: Failed to get caseFolderId: id: ${caseFolderId}, actType: ${actType}, err: ${err}`, 'error', NAME );
                throw  err;
            }

            caseFolder = caseFolder[0] || {};

            return Y.doccirrus.getFormRole( actType, caseFolder.type );
        }

        /**
         *  Look up the form corresponding to the given form role
         *
         *  @param  {Object}    user
         *  @param  {String}    formRole
         *  @param  {Function}  callback
         */

        function getFormByRole( user, formRole, callback ) {
            var
                dbSetup = {
                    'user': user,
                    'model': 'formtemplate',
                    'action': 'get',
                    'query': {
                        'jsonTemplate.defaultFor': formRole
                    }
                };

            Y.doccirrus.mongodb.runDb(dbSetup, onDbQuery);

            function onDbQuery( err, result ) {
                if ( err ) {
                    return callback(err);
                }

                if ( 0 === result.length ) {
                    //  no form assigned to this role
                    return callback( null, null );
                }

                var
                    jT = result[0].jsonTemplate,
                    match = {
                        'canonicalId': result[0]._id.toString(),
                        'latestVersionId': result[0].latestVersionId,
                        'title': jT.name,
                        'category': jT.category
                    };

                callback( null, match );
            }
        }

        /**
         * Returns formId by actType and caseFolderType
         * @param {Object} args
         * @param {Object} args.user
         * @param {Stringg} args.data.actType - actibity type
         * @param {String} args.data.caseFolderType - case folder type
         * @returns {Promise.<*>}
         */

        async function getFormIdForActivityType( args ) {
            Y.log( 'Entering Y.doccirrus.formsconfig.getFormIdForActivityType', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.formsconfig.getFormIdForActivityType' );
            }

            const {user, data: {actType, caseFolderType}} = args;

            let formRole = Y.doccirrus.getFormRole( actType, caseFolderType );

            let [err, formId] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                Y.dcforms.getConfigVar( user, formRole, false, onFormLookup );

                function onFormLookup( err, formId ) {
                    if( err ) {
                        Y.log( `getFormIdForActivityType: failed to get formId, formRole: ${formRole}`, 'error', NAME );
                        return reject( err );
                    }

                    if( !formId || '' === formId ) {
                        return reject( Y.doccirrus.errors.rest( 500, `Cannot find formId for ${actType} activity` ) );
                    }

                    resolve( formId );
                }
            } ) );

            if( err ) {
                Y.log( `getFormIdForActivityType:  Failed to get formId for actType:  ${actType}, caseFolderType: ${caseFolderType}, err: ${err.stack || err}`, 'error', NAME );
            }

            return handleResult( err, formId, args.callback );
        }

        /*
         *  Share this with the rest of mojito - renamed from Y.docirrus.forms.config due to strange YUI namespace issue
         */

        Y.namespace( 'doccirrus' ).formsconfig = {
            'getConfig': getConfig,
            'getFormCategories': getFormCategories,
            'enforceSingleAssignment': enforceSingleAssignment,
            'notifyConfigChange': notifyConfigChange,
            'getRoleName': getRoleName,
            'getRoleForActTypeCaseFolderId': getRoleForActTypeCaseFolderId,
            'getFormByRole': getFormByRole,
            'getFormIdForActivityType': getFormIdForActivityType
        };

    },
    '0.0.1', {requires: [ 'dcmedia-store', 'dcforms-roles' ]}
);