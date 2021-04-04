/*
 *  Client-Side Utility / shortcut functions for FormEditorMojit page
 *
 *  This includes common methods and utilities used by a number of FEM components, prevents duplication and
 *  simplifies the jadeLoaded views by doing much of their lifting.
 *
 */

/*jshint bitwise:false */
/*global YUI, $, async */

'use strict';

YUI.add(
    /* YUI module name */
    'dcforms-utils',

    /* Callback */

    function(Y, NAME) {
        Y.log('Adding dcforms client-side helper utilities', 'info', 'dcforms-utils');
        if (!Y.dcforms) { Y.dcforms = {}; }

        //  environment
        Y.dcforms.isOnServer = false;
        Y.dcforms._async = async;

        //  package holds pre-cached objects, provided instead of loading them over REST
        Y.dcforms.package = {};
        Y.dcforms.usePackage = false;

        /*
         *  Private variables ------------------------------------------------------------------------------------------
         */

        var
            randIdIterator = 0,                     //  cut down on chance of collision
            cacheFormList = [],                     //  cache list of forms
            cacheForms = {},                        //  cache serialized forms
        //  cacheFormId = {},                       //  cache instance Id lookups
            cacheFormConfig,                        //  cache of form config keys, may be sent in page in future
            cacheCertNumbers,                       //  cache of KBV certification numbers (affects behavior of BFB forms)
            cachePrinterList,                       //  cache of available CUPS printer names
            cachePresetList,                        //  cache of available insight2 reports
            checkBFBSetting = false,                //  check if BFB settings box is checked

        /*
         *  Associations with activities -------------------------------------------------------------------------------
         */

        //  Mapper names corresponding to form reduced schema bindings

            mapperNames = {
                'Invoice_T': 'invoice',
                'Prescription_T':  'prescription',
                'Patient_T': 'patient',
                'CaseFile_T': 'casefile',
                'DocLetter_T': 'docletter',
                'PubReceipt_T': 'pubreceipt',
                'InCase_T': 'incase'
            },

            defaultMapper = 'incase';

        /*
         *	Utility methods --------------------------------------------------------------------------------------------
         */

        /**
         *  Make a simple hash of string to prevent double-saving (unnecessary PUTs in response to events like mouse clicks)
         *
         *  credit: http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
         *  credit: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
         *
         *  @param txt  {String}    Some string to hash
         */

        Y.dcforms.fastHash = function(txt) {
            return Y.doccirrus.comctl.fastHash(txt);
        };

        /**
         * Safari likes to sprinkle random <div> elements and other junk into content-editable fields, forms need
         * to be cleaned of this, but this is a stopgap.
         *
         * http://stackoverflow.com/questions/822452/strip-html-from-text-javascript
         *
         * @param html
         * @returns {string|string}
         */

        Y.dcforms.stripHtml= function(html) {
            html = html || '';

            if ( 'string' !== typeof html ) {
                html = html && html.toString ? html.toString() : html + '';
            }

            if ('' === html || !html.replace) {
                return '';
            }

            html = html.replace(new RegExp('</div>', 'g'), '</div>\n');
            html = html.replace(new RegExp('<br/>', 'g'), '<br/>\n');

            html = html.replace( new RegExp( '<', 'g' ), '&lt;' );
            html = html.replace( new RegExp( '>', 'g' ), '&gt;' );

            var
                tmp = document.createElement("DIV"),
                cleanHTML;

            tmp.innerHTML = html;

            cleanHTML = tmp.textContent || tmp.innerText || "";

            return cleanHTML;
        };

        //  NOTE: proxima nova is the page font, howeverm the DC stylesheet was causing this to appear very small
        //  in rendered text

        //Y.dcforms.defaultFont = 'proxima_nova_rgregular,"Helvetica Neue",Helvetica,Arial,sans-serif';
        Y.dcforms.defaultFont = 'Helvetica';

        /**
         *  A simple random string used to uniquely identify things
         *
         *  hat tip: http://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
         */

        Y.dcforms.getRandId = function() {

            randIdIterator = randIdIterator + 1;

            var
                randId = '' +
                    randIdIterator.toString() +
                    Math.random().toString(36).slice(2) +
                    Math.random().toString(36).slice(2);

            return randId.substring(0, 18);
        };

        /**
         *  Used by editor to enforce clean names for pages and elements
         *
         *  @param      dirtyId {String}    String which may or may not be a valid name for an element/page
         *  @return             {String}    String limitied to aphanumeric characters and '_'/'-'
         */

        Y.dcforms.cleanId = function(dirtyId) {
            var
                allowChars = '' +
                    'abcdefghijklmnopqrstuvwxyz' +
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                    '1234567890',
                currChar,
                cleanId = '',
                i;

            for (i = 0; i < dirtyId.length; i++) {
                currChar = dirtyId.substr(i, 1);
                if (-1 !== allowChars.indexOf(currChar)) {
                    cleanId = cleanId + currChar;
                }
            }

            //  empty string is not a valid id for elements or pages
            if ('' === cleanId) {
                cleanId = 'id' + Y.doccirrus.comctl.getRandId().substr(0, 6);
            }

            return cleanId;
        };

        /*
         *	Event handling ---------------------------------------------------------------------------------------------
         */

        Y.dcforms.event = Y.dcforms.createEventEmitter();

        /*
         *  IO with server ---------------------------------------------------------------------------------------------
         */

        /**
         *  Get a property of the default forms config
         *
         *  @param  patientRegId    {String}    Used when communicating though PUC proxy
         *  @param  key             {String}    See FEM/formdefaults.json
         *  @param  forceReload     {Boolean}   Get from server and not cache
         *  @param  callback        {Function}  of the form fn(err, value)
         */

        Y.dcforms.getConfigVar = function(patientRegId, key, forceReload, callback) {

            if ( true === forceReload ) {
                cacheFormConfig = null;
            }

            //  first try the cache
            if ( cacheFormConfig && cacheFormConfig.hasOwnProperty(key) ) {
                callback( null, cacheFormConfig[key]);
                return;
            }

            function onReloadConfig(err, data) {

                if (err) {
                    callback('Formularkonfiguration konnte nicht geladen werden: ' + err);
                    return;
                }
                data = (data && data.data) ? data.data : data;
                cacheFormConfig = data;

                if (cacheFormConfig && cacheFormConfig.hasOwnProperty(key)) {
                    callback( null, cacheFormConfig[key]);
                    return;
                }

                // magic value, get all config
                if ('*' === key) {
                    callback(null, data);
                    return;
                }

                callback( null , '' );
            }

            if ( true === Y.dcforms.usePackage ) {
                onReloadConfig( null, Y.dcforms.package.config );
                return;
            }


            if ( !patientRegId ) {
                //  use JSONRPC if calling this from inCase/inSuite
                Y.doccirrus.jsonrpc.api.formtemplate.getconfig( { noBlocking: true } )
                    .then( function( result ) { onReloadConfig( null, result ); } )
                    .fail( function( err ) { onReloadConfig( err ); } );

            } else {
                //  if calling this from the patient portal
                Y.doccirrus.blindproxy.getSingle(patientRegId, '/1/formtemplate/:getconfig', {}, onReloadConfig);
            }


        };

        /**
         *  Set a property of the default forms config
         *
         *  Note that patientRegId is ignored at present - there is no need for this in the patient
         *  portal - this may change when activities and documents are exchanged between PRCs
         *
         *  @param  patientRegId   {String}    Used when communicating though PUC proxy
         *  @param  setKey      {String}    See FEM/formdefaults.json
         *  @param  setValue    {String}    New value of this key
         *  @param  callback    {Function}  Of the form fn(err)
         */

        Y.dcforms.setConfigVar = function(patientRegId, setKey, setValue, callback) {

            var params = { 'action': 'setformconfig', 'key': setKey, 'value': setValue };

            function onConfigSet(err) {
                if (err) {
                    callback('Formularkonfiguration nicht aktualisierbar: ' + err);
                    return;
                }

                //  update the cache
                cacheFormConfig[setKey] = setValue;
                callback();
            }

            Y.doccirrus.blindproxy.getSingle(patientRegId, '/1/formtemplate/:setconfig', params, onConfigSet);
        };

        /**
         *  Get reduced metadata for the canonical version of a form
         *
         *  This is used by CaseFile to look up form versions when creating activities which have default forms
         *
         *  @param  patientRegId       {string}        Used to proxy requests to other PRCs
         *  @param  canonicalId     {String}        Master / editable copy of a form
         *  @param  callback        {function}      Of the form fn(err, serializedForm)
         */

        Y.dcforms.getFormListing = function(patientRegId, canonicalId, callback) {

            function onFormListLoaded(err, data) {
                if (err) {
                    callback('Formularliste ' + canonicalId + ': ' + err);
                    return;
                }

                var i;
                for (i = 0; i < data.length; i++) {
                    if (data[i]._id === canonicalId) {
                        callback( null, data[i]);
                        return;
                    }
                }

                callback('Version passt nicht: ' + canonicalId);
            }

            Y.dcforms.getFormList( patientRegId, false, onFormListLoaded);
        };

        /**
         *  Subforms might be referred to by canonicalId, form role or name
         *
         *  This will call back with empty string if no form is found.
         *
         *  @param  patientRegId    {String}    Used on patient portal
         *  @param  identifier      {String}    For _id, role or name
         *  @param  callback        {Function}  Of the form fn( err, formId )
         */

        Y.dcforms.findFormId = function( patientRegId, identifier, callback ) {
            var
                foundCanonicalId = '',
                formList;

            async.series( [ checkIfCanonicalId, checkIfFormRole, checkIfFormName ], onAllDone );

            //  first check if this is a form
            function checkIfCanonicalId( itcb ) {
                Y.dcforms.getFormList( patientRegId, false, onFormListLoaded);

                function onFormListLoaded( err, data ) {
                    if (err) { return callback( 'Could not load form list: ' + JSON.stringify( err ) ); }
                    formList = data;

                    var i;
                    for ( i = 0; i < formList.length; i++ ) {
                        if ( formList[i]._id === identifier ) {
                            foundCanonicalId = formList[i]._id;
                            return itcb( null );
                        }
                    }

                    itcb( null );
                }
            }

            //  check form roles
            function checkIfFormRole( itcb ) {
                //  if identifier is a canonical id then skip this step
                if ( '' !== foundCanonicalId ) { return itcb( null ); }

                var i;
                for ( i = 0; i < formList.length; i++ ) {
                    if ( formList[i].defaultFor === identifier ) {
                        foundCanonicalId = formList[i]._id;
                        return itcb( null );
                    }
                }

                itcb( null );
            }

            //  check form names
            function checkIfFormName( itcb ) {
                //  if identifier is a canonical id or form role then skip this step
                if ( '' !== foundCanonicalId ) { return itcb( null ); }

                var i;
                for ( i = 0; i < formList.length; i++ ) {
                    if ( formList[i].title.en === identifier || formList[i].title.de === identifier ) {
                        foundCanonicalId = formList[i]._id;
                        return itcb( null );
                    }
                }

                itcb( null );
            }

            function onAllDone( err ) {
                if ( err ) { return callback( err ); }
                callback( null, foundCanonicalId );
            }
        };

        /**
         *  Convenience wrapper to load a form template given an instance ID
         *
         *  @param  patientRegId    {string}       Used to proxy requests to other PRCs
         *  @param  canonicalId     {string}       Database _id of form template
         *  @param  versionId       {String}       Database _id ofform template version
         *  @param  callback        {function}     Of the form fn(err, serializedForm)
         */

        Y.dcforms.loadForm = function(patientRegId, canonicalId, versionId, callback) {

            //  first check the cache
            /*

                forms cache temporarily disabled due to load order issue in 2.2temp branch
                disabling the cache makes form load asynchronous in all cases, changing event order

            if (cacheForms.hasOwnProperty(canonicalId + '-v-' + versionId)) {
                callback(null, cacheForms[canonicalId + '-v-' + versionId]);
                return;
            }
            */

            var
                url = '/1/formtemplate/:loadform',
                params = {
                    'id': canonicalId,
                    'versionId': versionId,
                    'action': 'loadform'
                };

            function onFormLoaded(err, serialized) {
                if (err) {
                    //Y.doccirrus.comctl.setModal('Warning', 'Could not load form: ' + text, true);
                    Y.log('Could not load template: ' + canonicalId + '-v-' + versionId, 'debug', NAME);
                    callback(err);
                    return;
                }

                Y.log('Loaded form template: ' + canonicalId + '-v-' + versionId, 'debug', NAME);
                serialized = (serialized && serialized.data) ? serialized.data : serialized;
                cacheForms[canonicalId + '-v-' + versionId] = serialized;
                callback(null, serialized);
            }

            //  attempt to use pre-cached version
            if ( Y.dcforms.usePackage ) {
                if ( versionId && '' !== versionId ) {
                    if ( Y.dcforms.package.formtemplateversion[versionId] ) {
                        Y.log( 'Loaded canonical form from local package: ' + canonicalId, 'debug', NAME );
                        return callback( null, Y.dcforms.package.formtemplateversion[versionId] );
                    }
                } else {
                    if ( Y.dcforms.package.formtemplate[canonicalId] ) {
                        Y.log( 'Loaded form version from local package: ' + canonicalId, 'debug', NAME );
                        return callback( null, Y.dcforms.package.formtemplate[canonicalId] );
                    }
                }

                // if form and version not found, discard the requested version and try again
                if ( versionId && '' !== versionId ) {
                    Y.log( 'Form version not found in package, trying for latest form: ' + canonicalId, 'debug', NAME );
                    Y.dcforms.loadForm( patientRegId, canonicalId, '', callback );
                    return;
                }

                //  should not happen
                Y.log( 'Form not found: ' + canonicalId, 'warn', NAME );
                console.log( 'current package: ', Y.dcforms.package );      //   eslint-disable-line no-console
            }

            if ( !patientRegId ) {
                //  use JSONRPC in inSuite / inCase
                Y.doccirrus.jsonrpc.api.formtemplate.loadform( params )
                    .then( function( result ) { onFormLoaded( null, result ); } )
                    .fail( function( err ) { onFormLoaded( err ); } );

            } else {
                //  use blindproxy on patient portal
                Y.doccirrus.blindproxy.getSingle(patientRegId, url, params, onFormLoaded);
            }

        };

        /**
         *  Save a form instance to database
         *
         *  @param canonicalId  {string}    Database _id of form template
         *  @param serialized   {object}    As produced by dcforms-serialize()
         *  @param callback     {function}  Of the form fn(err)
         */

        Y.dcforms.saveForm = function(canonicalId, serialized, callback){

            //  invalidate the whole form cache REVIEWME: no longer necessary to do this?
            cacheForms = [];

            var
                params = {
                    'id': canonicalId,
                    'template': serialized
                };

            Y.doccirrus.jsonrpc.api.formtemplate
                .saveform( params )
                .done( onFormSaved )
                .fail( onFormSaveError );

            function onFormSaved( data ) {
                //Y.log('Saved form template: ' + msg, 'debug', NAME);
                callback(null, data);
            }

            function onFormSaveError( err ) {
                //  not seen in practice
                //  TODO: translate when applying new i18n to this file
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: 'Could not save form: ' + JSON.stringify( err )
                } );
                callback(err);
                return;
            }
        };

        /**
         *  Export a form template and dependencies to tgz / zip archive
         *
         *  @param canonicalId  {string}    Database _id of form template
         *  @param callback     {function}  Of the form fn(err)
         */

        Y.dcforms.exportForm = function(canonicalId, callback) {
            var
                url = '/1/formtemplate/:exportform',
                params = {
                    'modelname': 'formtemplate',
                    'id': canonicalId
                };

            function onFormExported(err, data) {
                if (err) {
                    //  TRANSLATEME
                    Y.doccirrus.comctl.setModal('Warning', 'Could not export form: ' + err, true);
                    callback(err);
                    return;
                }
                /*
                if( Y.config.debug ) {
                    Y.log('Saved form template and dependancies: ' + JSON.stringify(data), 'debug', NAME);
                }
                */
                callback(null, data);
            }

            Y.doccirrus.comctl.privatePost(url, params, onFormExported);

        };

        /**
         *  Load a form and dependencies from backup / zip directory
         *
         *  @param canonicalId  {string}    Database _id of form template
         *  @param callback     {function}  Of the form fn(err)
         */

        Y.dcforms.importForm = function(canonicalId, callback){

            //  invalidate the client-side form cache
            cacheForms = [];

            var
                params = {
                    'modelname': 'formtemplate',
                    'id': canonicalId
                };

            Y.doccirrus.jsonrpc.api.formtemplate.importform( params ).then( onFormImported ).fail( onFormImportError );

            function onFormImported( data) {
                Y.log('Imported form template: ' + JSON.stringify( data ), 'debug', NAME);
                //  Clear the db forms cache before calling back
                cacheFormList = [];
                callback(null, data);
            }

            function onFormImportError( err ) {
                if (err) {
                    Y.log( 'Could not import form: ' + JSON.stringify( err ), 'error', NAME );
                    return callback(err);
                }
            }
        };

        /**
         *  Lists current contents of import / export dir
         *
         *  Returns array of meta objects in same format as listforms
         *
         *  @param  callback    {Function}  Of the form fn(err, list)
         */

        Y.dcforms.listFormExports = function(callback) {
            Y.doccirrus.comctl.privatePost('/1/formtemplate/:listformexports', { }, callback );
        };

        /**
         *  Deletes current contents of import / export dir
         *
         *  @param  callback    {Function}  Of the form fn(err)
         */

        Y.dcforms.clearFormExports = function(callback) {
            Y.doccirrus.comctl.privatePost('/1/formtemplate/:clearformexports', {}, callback );
        };

        /**
         *  Causes the server to copy the canonical form template into a new version
         *
         *  @param  canonicalId {String}    database _id of the current form template to create a version from
         *  @param  revComment  {String}    optional comment on why a new version is being created
         *  @param  callback    {Function}  of the form fn(err, newVersionId
         */

        Y.dcforms.makeNewVersion = function(canonicalId, revComment, callback) {

            var
                url = '/1/formtemplate/:createversion',
                params = {
                    'id': canonicalId,
                    'revcomment': revComment
                };

            Y.doccirrus.comctl.privatePost(url, params, callback);
        };

        /**
         *  Get abbreviated listing of all versions of the given form
         *
         *  @param  canonicalId {String}    database _id of a formtemplate
         *  @param  callback    {Function}  of the form fn(err, data)
         */

        Y.dcforms.getFormVersionHistory = function(canonicalId, callback) {

            function onHistoryLoaded(err, data) {
                if (data && data.data) {
                    //  new REST API format
                    data = data.data;
                }
                callback(err, data);
            }

            var
                url = '/1/formtemplate/:listversions',
                params = {
                    'id': canonicalId
                };

            Y.doccirrus.comctl.privateGet(url, params, onHistoryLoaded);
        };

        /**
         *  Store the new template on the server (database, not disk)
         *
         *  @param  newTemplate {Object}    A serialized dcforms-template object with a new instance Id
         *  @param  callback    {Function}
         */

        Y.dcforms.saveNewTemplate = function(newTemplate, callback) {

            var
                url = '/1/formtemplate/:createform',
                params = {
                    'action': 'createform',
                    'template': newTemplate,
                    'instanceId': newTemplate.instanceId,
                    'category': newTemplate.category
                };

            function onFormCreated(err, data) {
                if ( err ) {
                    Y.log('ERROR could not create new template: ' + err, 'warn', NAME);
                    //TODO: TRANSLATEME and convert to DCWindow
                    Y.doccirrus.comctl.setModal('Error', 'Could not create new form:<br/>'  + err, true);
                    return callback( err );
                }

                Y.log('SUCCESS: created new form ' + data);
                callback( null, data );
            }

            Y.doccirrus.comctl.privatePost(url, params, onFormCreated);

        };

        /**
         *  Make a new copy of a form template (user editable)
         *
         *  One should change the name in teh serialized form template before calling
         *
         *  @param  jsonTemplate  {Object}    Serialized form template
         *  @param  newName     {String}    Name of new form
         *  @param  callback    {Function}  Of the form fn(err, newIds)
         */

        Y.dcforms.copyForm = function(jsonTemplate, newName, callback) {
            jsonTemplate.name.en = newName;
            jsonTemplate.name.de = newName;
            jsonTemplate.templateFile = Y.dcforms.trim(newName + '.form');
            jsonTemplate.version = 1;
            jsonTemplate.revision = 0;
            jsonTemplate.defaultFor = '';
            jsonTemplate.formId = '';       //  to be filled later

            Y.dcforms.saveNewTemplate(jsonTemplate, callback);
        };

        /**
         *  Load the current user's set of form categroies from cache or server
         *  @method getFormCategories
         *  @param  forceReload {Boolean}   causes cached value to be cleared
         *  @param  callback    {Function}  of the form fn(err, data)
         */

        Y.dcforms.getFormCategories = function(forceReload, callback) {
            Y.log('DEPRECATED: client util call to getFormCatgeories, please use static YUI module', 'warn', NAME);
            callback(null, Y.dcforms.categories);
        };

        /**
         *  Get list of forms belonging to the current user, summaries only
         *
         *  Summary includes form instance id, category and title in available languages
         *
         *  @param  patientRegId    {string}        Used to proxy requests to other PRCs
         *  @param  forceReload     {bool}          Force loading from server, rather than using cached response
         *  @param  callback        {function}      Of the form fn(err, data)
         */

        Y.dcforms.getFormList = function(patientRegId, forceReload, callback) {

            if (forceReload) {
                cacheFormList = [];
            }

            //  first check whether we have already cached this call
            if (cacheFormList.length > 0) {
                Y.log('Returning form list from cache: ' + cacheFormList.length + ' items', 'debug', NAME);
                return callback(null, cacheFormList);
            }

            function onFormListLoaded(err, data) {

                if (err) {
                    return callback('Could not lor form list: ' + err);
                }

                data = (data && data.data) ? data.data : data;

                if ('string' === typeof data) {
                    //Y.log('Raw form list: ' + data, 'debug', NAME);
                    data = JSON.parse(data);
                }

                Y.log('Loaded list of ' + data.length + ' forms available to this user.', 'info', NAME);
                cacheFormList = data;

                //  Some sanity checks before returning, legacy data might be missing required properties
                var i;
                for (i = 0; i < cacheFormList.length; i++) {
                    if (!cacheFormList[i].hasOwnProperty('title')) {
                        cacheFormList[i].title = {};
                    }

                    if (!cacheFormList[i].title.hasOwnProperty('en')) {
                        cacheFormList[i].title.en = 'Untitled';
                    }

                    if (!cacheFormList[i].title.hasOwnProperty('de')) {
                        cacheFormList[i].title.de = 'Namenlose Form';
                    }
                }

                callback(null, cacheFormList);
            }

            //  TODO: use JSONPRC
            Y.doccirrus.blindproxy.getSingle(patientRegId, '/1/formtemplate/:listforms', {}, onFormListLoaded);
        };

        /**
         *  Invalidate the cached form list on the server (eg, when a form is unlocked or title changes)
         *  @param callback
         */

        Y.dcforms.refreshFormList = function(callback) {
            cacheFormList = null;
            Y.doccirrus.comctl.privatePost('/1/formtemplate/:clearFormListCache', {}, callback);
        };

        /**
         *  Sanitize some value from the dom before allowing it into Jade   DEPRECATED since jade is being phased out
         *  @param  txt {String}    Some untrusted user input
         */

        Y.dcforms.escape = function(txt) {
            if ('string' !== typeof txt) { txt = ''; }
            txt = txt.replace(new RegExp('<br/>', 'g'), '{newline}');
            txt = txt.replace(new RegExp('<br>', 'g'), '{newline}');
            txt = txt.replace(new RegExp('</div>', 'g'), '{newline}');
            txt = txt.replace(new RegExp('</p>', 'g'), '{newline}');
            txt = txt.replace(new RegExp('</blockquote>', 'g'), '{newline}');
            txt = txt.replace(new RegExp('&nbsp;', 'g'), '{&nbsp}');
            txt = txt.replace(new RegExp('&quot;', 'g'), '{&quot}');
            txt = txt.replace(new RegExp('"', 'g'), '{&quot}');
            txt = txt.replace(new RegExp('&#39;', 'g'), '{&squot}');
            txt = txt.replace(new RegExp('\'', 'g'), '{&squot}');
            txt = txt.replace(new RegExp("\n", 'g'), '{newline}');  //  eslint-disable-line no-control-regex
            txt = txt.replace(new RegExp("\r", 'g'), '{newline}');  //  eslint-disable-line no-control-regex
            txt = txt.replace(new RegExp(';', 'g'), '{&#59}');    //  undo HTML entity markup used to squeeze this into attribute

            txt = txt.replace(new RegExp('<b>', 'g'), '{bold}');        //  Webkit makes these
            txt = txt.replace(new RegExp('</b>', 'g'), '{/bold}');
            txt = txt.replace(new RegExp('<i>', 'g'), '{italic}');
            txt = txt.replace(new RegExp('</i>', 'g'), '{/italic}');
            txt = txt.replace(new RegExp('<' + 'u>', 'g'), '{underline}');
            txt = txt.replace(new RegExp('</' + 'u>', 'g'), '{/underline}');

            txt = txt.replace(new RegExp('<strong>', 'g'), '{bold}');        //  Opera makes these
            txt = txt.replace(new RegExp('</strong>', 'g'), '{/bold}');
            txt = txt.replace(new RegExp('</b>', 'g'), '{/bold}');
            txt = txt.replace(new RegExp('<em>', 'g'), '{italic}');
            txt = txt.replace(new RegExp('</em>', 'g'), '{/italic}');

            //  http://stackoverflow.com/questions/822452/strip-html-from-text-javascript
            txt = txt.replace(new RegExp('/<(?:.|\n)*?>/', 'gm'), '');  //  eslint-disable-line no-control-regex
            return txt;
        };

        /**
         *  Remove escaping from Jade values  DEPRECATED since jade is being phased out
         *  @param  txt {String}    Some property of a form element
         */

        Y.dcforms.unescape = function(txt) {
            txt = txt.replace(new RegExp('&#59', 'g'), ';');
            txt = txt.replace(new RegExp('{&squot}', 'g'), '\'');
            txt = txt.replace(new RegExp('{&quot}', 'g'), '&quot;');
            txt = txt.replace(new RegExp('&quot;', 'g'), '"');
            txt = txt.replace(new RegExp('\\n', 'g'), "\n");
            txt = txt.replace(new RegExp('{carriagereturn}', 'g'), "<br>");
            txt = txt.replace(new RegExp('{newline}', 'g'), "<br>");
            txt = txt.replace(new RegExp('{&nbsp}', 'g'), '&nbsp;');
            txt = txt.replace(new RegExp('{&#59}', 'g'), '&#59;');
            txt = txt.replace(new RegExp('{semicolon}', 'g'), '&#59;');

            txt = txt.replace(new RegExp('{bold}', 'g'), '<b>');
            txt = txt.replace(new RegExp('{/bold}', 'g'), '</b>');
            txt = txt.replace(new RegExp('{italic}', 'g'), '<i>');
            txt = txt.replace(new RegExp('{/italic}', 'g'), '</i>');
            txt = txt.replace(new RegExp('{underline}', 'g'), '<' + 'u>');
            txt = txt.replace(new RegExp('{/underline}', 'g'), '</' + 'u>');

            return txt;
        };

        /*
         *	UI Components ----------------------------------------------------------------------------------------------
         */

        //  UI components
        //  TODO: consider moving into their own jadeLoaded component

        /**
         *  Small helper function / shortcut to set the status line above the form
         *  NOTE: this assumes some DOM elements, better to encapsulate
         *  @param  msg     Status message [string]
         *  @param  busy    Show throbber animation [bool]
         */

        Y.dcforms.setStatus = function(msg, busy) {

            if (!msg || 'undefined' === msg) {
                msg = '';
            }

            var jq = {
                spanStatus: $('#spanStatus'),
                imgThrobber: $('#imgThrobber')
            };

            /*
            if (jq.spanStatus.length <= 0) {
                Y.log('No status span on page, embedded form not reporting', 'debug', 'dcforms-template');
            } else {
                jq.spanStatus.html(msg + '&nbsp;&nbsp;');
            }
            */

            Y.log( 'Form status message: ' + msg, 'debug', NAME );

            if (true === busy) {
                //  hiding for feedback on MOJ-3615, to be removed completely if no longer needed
                //jq.imgThrobber.show();
                jq.imgThrobber.hide();
            } else {
                jq.imgThrobber.hide();
            }
        };

        /*
         *  Records whether modal is currently visible or not
         *
         *  This is to prevent multiple layers being created if modals are creates / shown in quick successions,
         *  before animation completes
         */

        //  This is deprecated along with comctl modals
        //  TODO: remove
        Y.dcforms.modalVisible = false;

        /**
         *  Create the forms modal if not yet present (DEPRECATED, Bootstrap 2 support)
         *  @param  callback    {Function}  Of the form fn(err)
         */

        Y.dcforms.initModalBS2 = function(callback) {
            Y.log('Deprecated: Y.dcforms.initModalBS2() - please use Y.doccirrus.comctl.initModalBS2(...) instead.', 'warn', NAME);
            Y.doccirrus.comctl.initModalBS2(callback);
        };


        /**
         *  Create the forms modal if not yet present
         *  @param  callback    {Function}  Of the form fn(err)
         */

        Y.dcforms.initModal = function(callback) {
            Y.log('Deprecated: Y.dcforms.initModal() - please use Y.doccirrus.comctl.initModal(...) instead.', 'warn', NAME);
            Y.doccirrus.comctl.initModal(callback);
        };

        /**
         *  Small helper function / shortcut to set the status line above the form
         *  NOTE: this assumes some DOM elements, better to encapsulate
         *  @param  title           {String}    Modal dialog title [string]
         *  @param  content         {String}    Body of modal dialog [string]
         *  @param  closeVisible    {Boolean}   Turn close button visibility on or off
         *  @param  onOKClick       {Function}  If set, OK button click calls this function [optional]
         *  @param  callback        {Function}  Of the form fn(err) [optional]
         */

        Y.dcforms.setModal = function(title, content, closeVisible, onOKClick, callback) {
            Y.log('Deprecated: Y.dcforms.setModal(...) - please use Y.doccirrus.comctl.setModal(...) instead.', 'warn', NAME);
            Y.doccirrus.comctl.setModal(title, content, closeVisible, onOKClick, callback);
        };

        /**
         *  Hide / remove any modal dialog on screeen DEPRECATED
         *  Calls to this method should be dreprecated in favor of calling Y.doccirrus.comctl directly
         */

        Y.dcforms.clearModal = function() {
            Y.log('Deprecated: Y.dcforms.clearModal() - please use Y.doccirrus.comctl.clearModal() instead.', 'warn', NAME);
            Y.doccirrus.comctl.clearModal();

        };

        /**
         *  Check if the modal is displayed
         *
         *  @return     {Boolean}   True if modal is displayed, false if not
         */

        Y.dcforms.inModal = function() {
            return Y.doccirrus.comctl.inModal();
            //return ('none' !== $('#divModalPopup').css('display'));
        };

        /**
         *  Prevent mouse or keyboard events from propogating / bubbling up to parent elements
         *  Used to prevent unwatend selection of dom elements in form editor
         *
         *  attrib: http://www.javascripter.net/faq/canceleventbubbling.htm
         *
         *  @param  evt {Object}    Dom event
         */

        Y.dcforms.cancelEventBubble = function(evt) {
            var e = evt ? evt:window.event;
            if (e.stopPropagation) { e.stopPropagation(); }
            if (null !== e.cancelBubble) { e.cancelBubble = true; }
        };

        /*
         *	Placeholder for translation dictionary
         */

        if (!Y.dcforms.il8nDict) {
            Y.dcforms.il8nDict = {};
        }

        /**
         *	Get current user language for a form or thi current page
         *
         *  See MOJ-1098 - user's language perference is kept on a per-form basis
         *
         *  @/param  formId  {String}    Common to all versions of a form
         */

        Y.dcforms.getUserLang = function( formId ) {
            //  return the page language if form not specified
            if (!formId || '' === formId) {
                return  Y.doccirrus.comctl.getUserLang() === 'de-ch' ? 'de': Y.doccirrus.comctl.getUserLang();
            }

            var storedValue = Y.doccirrus.utils.localValueGet(formId + '-lang');

            Y.log('Getting local lang preference: ' + formId + '-lang <==' + storedValue, 'debug', NAME);

            if (null === storedValue || '' === storedValue) {

                return Y.doccirrus.comctl.getUserLang() === 'de-ch' ? 'de': Y.doccirrus.comctl.getUserLang();
            }

            return storedValue;

        };

        /**
         *  Ensures that the callback is only called once
         *  Used to find errors in deep async code
         *
         *  Assumes callback has no more than four arguments
         *
         *  @param  callback    {Function}  Callback to be counted
         *  @param  label       {String}    To disambiguate multiple calls
         */

        Y.dcforms.checkSingleCB = function(callback, label) {
            return Y.doccirrus.comctl.checkSingleCB(callback, label);
        };


        /**
         *  This is a generic / shortcut callback function for situations where we only care care about the callback
         *  value if it's an error
         *
         *  MOVED to dcommonutils
         *
         *  @param  {err}
         */

        Y.dcforms.nullCallback = function(err) {
            Y.doccirrus.commonutils.nullCallback( err );
        };


        /**
         *	Set current user language for this page / form
         *
         *  @param  userLang    {string}    Language to set ('en'|'de')
         *  @param  formId      {string}    per-form lang perference is kept in localStorage
         */

        Y.dcforms.setUserLang = function(userLang, formId) {
            if ( formId && ('' !== formId) ) {
                Y.log('Setting local lang preference: ' + formId + '-lang :=' + userLang, 'debug', NAME);
                Y.doccirrus.utils.localValueSet( formId + '-lang', userLang );
            }

            Y.doccirrus.comctl.setUserLang( userLang );
        };

        /**
         *  Wrapper to allow symmetry with how images must be created on the server
         *  @param  dataUrl     {String}    An image in dataURI format
         */

        Y.dcforms.createImageFromDataUrl = function(dataUrl) {
            var newImage = new Image();
            newImage.src = dataUrl;
            return newImage;
        };

        /**
         *  Load ant KBV certification numbers into cache if not yet present
         *  This should be called once during load if BFB forms will be affected
         *
         *  Note: the Form Editor allows editing of BFB forms in all cases, it is only the forms_bind binder used by
         *  CaseFile which needs to check whether a client can use a given form.
         *
         *  TODO: this should use the cached values in the inCaseMojit binder, when in InCase
         *
         *  @param  callback    {Function}  Of the form fn(err, configObject)
         */


        Y.dcforms.loadCertNumbers = function(callback) {
            if (cacheCertNumbers) {
                callback(null, cacheCertNumbers);
                return;
            }

            Y.doccirrus.jsonrpc.api.settings.read( {} )
                .then( onSettingsLoaded )
                .then( onKbvSettingsLoaded )
                .fail( onSettingsErr );

            function onSettingsLoaded( data) {
                if (data && data.data && data.data.length && data.data[0].hasOwnProperty('blankoforms')) {
                    checkBFBSetting =  data.data[0].blankoforms;
                } else {
                    checkBFBSetting = false;
                }
                //Y.log('checkBFBSetting: ' + (checkBFBSetting ? 'TRUE' : 'FALSE'), 'debug', NAME);
                //Y.doccirrus.comctl.privateGet('/1/kbv/:certNumbers', {}, onCertConfigLoaded);
                return Y.doccirrus.jsonrpc.api.kbv.certNumbers( {} );
            }

            function onKbvSettingsLoaded( data ) {
                cacheCertNumbers = data.data ? data.data : data;
                callback( null, cacheCertNumbers );
            }

            function onSettingsErr( err ) {
                if (err) {
                    Y.log('Could not load inSuite settings: ' + JSON.stringify(err), 'debug', NAME);
                    callback(err);
                    return;
                }
            }
        };

        /**
         *  Check if client has BFB registration number
         *  Synchronous, the certification numbers should be cached by first calling Y.dcforms.loadCertNumbers above
         */

        Y.dcforms.clientHasBFB = function() {
            var hasCertNo = cacheCertNumbers && cacheCertNumbers.bfbCertNumber;

            if (hasCertNo && '' !== cacheCertNumbers.bfbCertNumber && checkBFBSetting) {
                return true;
            }

            return false;
        };

        /**
         *  Get the name of a mapper given the reduced schema it will handle
         *
         *  @param  reducedSchemaName   {String}    eg, InCase_T
         *  @returns                    {string}    eg, incase
         */

        Y.dcforms.getMapperName = function(reducedSchemaName) {
            var mapperName = mapperNames.hasOwnProperty(reducedSchemaName) ? mapperNames[reducedSchemaName] : defaultMapper;
            return mapperName;
        };

        /**
         *  Used to pre-cache list of printers available at this client, to allow synchronous use in UI
         *
         *  @param  callback    {Function}  Of the form fn(err)
         */

        Y.dcforms.loadPrinterList = function(callback) {
            function onListPrinters(err, data) {
                if (err) {
                    Y.log('Could not list printers: ' + JSON.stringify(err), 'warn', NAME);
                    cachePrinterList = null;
                    callback(err);
                    return;
                }

                cachePrinterList = data.data ? data.data : data;
                callback(null);
            }

            Y.doccirrus.comctl.privateGet('/1/printer/:getPrinter', {}, onListPrinters);
        };

        /**
         *  Access cached list of CUPS printer names
         *  @returns {Object}   Array of available pritners
         */

        Y.dcforms.getPrinterList = function() {
            //return [];
            return cachePrinterList || [];
        };

        /**
         *  Set the printer cache from elsewhere
         *  @returns {Object}   Array of available pritners
         */

        Y.dcforms.setPrinterList = function(newList) {
            //return [];
            cachePrinterList = newList;
        };

        /**
         *  Used to pre-cache list of insight2 reports available at this client, to allow synchronous use in UI
         *
         *  This is only used in the form editor, since reports only run on the server
         *
         *  @param  callback    {Function}  Of the form fn(err)
         */

        Y.dcforms.loadInsight2PresetList = function( callback ) {
            var query = {
                query: {
                    predefined: true
                }
            };

            //if (this.config && this.config.containerName) {
            //    query.query.container = {
            //        $in: [this.config.containerName]
            //    };
            //}

            function onPresetsLoaded( result ) {
                if ( result && result.meta && result.meta.errors && result.meta.errors[0] ) {
                    Y.log( 'Error loading insight2 presets: ' + JSON.stringify( result.meta.errors[0]  ), 'warn', NAME );
                    callback( result.meta.errors[0]  );
                    return;
                }

                cachePresetList = ( result.data ? result.data : result );
                callback( null, cachePresetList );
            }

            Y.doccirrus.jsonrpc.api.insight2
                .read( query )
                .then( onPresetsLoaded );
        };

        /**
         *  Client and server need different calls to request meddata in chart format
         *
         *  @param  {Object}    user            Not used on client
         *  @param  {Object}    queryParams     Given by chart element
         *  @param  {Function}  callback        Of the form fn( err, chartPoints )
         */

        Y.dcforms.getChartData = function( user, queryParams, callback ) {

            Y.doccirrus.jsonrpc.api.meddata.getChartData( queryParams)
                .then( onChartDataLoaded )
                .fail( onChartDataErr );

            function onChartDataLoaded( data ) {
                data = data.data ? data.data : data;
                callback( null, data || {} );
            }

            function onChartDataErr( err ) {
                Y.log( 'Problem loading chart data from server: ' + JSON.stringify( err ), 'warn', NAME );
                callback( err );
            }
        };

        /**
         *  async.eachSeries is slow on the client due to setting and waiting for timers
         *  implementing own version
         *
         *  @param  coll        {Object}    Array of objects to be processed sequentially
         *  @param  iteratee    {Function}  Of the form fn( item, iteration_callback )
         *  @param  callback    {Function}  Of the form fn( err )
         */

        Y.dcforms.eachSeries = function( coll, iteratee, callback ) {

            var
                BREAK_INTERATION_EVERY = 50,       //  prevent stack from getting too deep
                atIndex = 0;

            function processNext() {
                if ( atIndex === coll.length ) {
                    //  all done
                    return callback( null );
                }

                var nextItem = coll[atIndex];
                iteratee( nextItem, onStepComplete );

                function onStepComplete( err ) {
                    if ( err ) { return callback( err ); }
                    atIndex = atIndex + 1;

                    if ( 0 === atIndex % BREAK_INTERATION_EVERY ) {
                        window.setTimeout( function() { processNext(); }, 1 );
                        return;
                    }

                    processNext();
                }
            }

            processNext();
        };

        /**
         *  Replacement for async.series which was running slowly in chrome
         *
         *  @param  {Object}    steps       Array of functions which accept a callback
         *  @param  {Function}  callback    Of the form fn( err )
         *  @return {*}
         */

        Y.dcforms.runInSeries = function( steps, callback ) {
            if ( 0 === steps.length ) { return callback( null ); }

            //  Uncomment to print timing information
            //var timing = [], randId = Y.doccirrus.comctl.getRandId();
            //Y.dcforms.addTimingPoint( timing, randId + ' (start chain)' );

            function processNext( idx ) {
                if ( idx === steps.length ) {
                    //Y.dcforms.addTimingPoint( timing, randId + ' (end chain)' );
                    //Y.dcforms.printTiming( timing );
                    return callback( null );
                }

                var step = steps[ idx ];

                step( function onEndStep( err ) {
                    //Y.dcforms.addTimingPoint( timing, randId + ' ' + idx + ': ' +  step.name );
                    if ( err ) { return callback( err ); }
                    processNext( idx + 1 );
                } );
            }
            processNext( 0 );
        };

        /**
         *  Access cached list of insight2 predefined reports
         *  @returns {Object}   Array of report/aggregation presets
         */

        Y.dcforms.getInsight2PresetList = function() {
            return cachePresetList || [];
        };

        /**
         *  Utility method for development, makes stack traces more readable in chrome
         */

        Y.dcforms.tidyStackTrace = function(txtStack) {
            var
                lines = txtStack.split("\n"),
                parts,
                newTxt = '',
                i;

            for (i = 0; i < lines.length; i++) {
                parts = lines[i].split('(');
                parts = parts[0].split('@');
                newTxt = newTxt + parts[0] + "\n";
            }

            return newTxt;
        };


        //  Buttons to add and remove table rows in client, when tables are editable
        //  Ideally would be in table-utils.common.js, load order issue

        if (!Y.dcforms.assets) { Y.dcforms.assets = {}; }

        Y.dcforms.assets.btnTrash =  Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAAiCAYAAADYmxC7AAAABmJLR0QA/w' +
            'D/AP+gvaeTAAAACXBIWXMAAC4jAAAuIwF4pT92AAAAB3RJTUUH4QYWCyQ0N/dllgAAABl0RVh0Q29tbW' +
            'VudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAFKSURBVFjD7ZihTgNBEIa/2zAniuiaSxNqMH0FdE3NqT' +
            'OYvgIGBBiaEJJiaspTVIA5A8+BwpDKigazJG3FbXKHKIgiCr1Cb0P2N2Nmki+Tf/9sJiiKolgsFhhjyL' +
            'KMPM/ZtZRShGGI1pparUYwm82K6XSKK2o0GihjDC7JGIOy1joFZa1FVeGhdcrzHIWD8lAe6re1t81wNk' +
            'm5vhjx8pkq0qJ7c0VyGFYFNed59MD8eMhd0gRgkp5yef9E5/yI/S2ggvF4XGwyMElPOBu9/qj3oDvk9g' +
            'P4Tz3VTIYM4ujbvigeMCgBtLXR63GffhwRrdR6ta9vaWdBVmr4PyPBQ+0EKlv+gLArNasi0UNk6WjeHn' +
            'v0APhaAZHSli+1qajdoSVrGqRF3I5Kb2rjRPdG91AeykPt/uChXANCiYhTUCKC0lo7BaW1JnDxaPYOUI' +
            'Jukr8uShQAAAAASUVORK5CYII='
        );

        Y.dcforms.assets.btnPlus = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAAiCAYAAADYmxC7AAAABmJLR0QA/w' +
            'D/AP+gvaeTAAAACXBIWXMAAC4jAAAuIwF4pT92AAAAB3RJTUUH4QYWCyUS/OHRKgAAABl0RVh0Q29tbW' +
            'VudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAD7SURBVFjD7ZghTsRAFEBff5iKIvpdxXoEB+AGHASBwi' +
            'IRK5BYFIKDcAMOgCCpXFH3m5SKTjKDQRAEC91Ndwjz1IjJ5GX+GzNFjDGO44iZMU0TIQSWRkQoyxJVpa' +
            'oqimEYYtd1pELTNIiZkRJmhnjvk5Ly3iOHaOg7QggICZKlstS+Odr5hOmVh6sbnnqgPuf2/pKT8tA35Y' +
            '1N/7HuN5jPTS1H0bZtnN3QNmY2Jjs1tI2Zjf1eyimr+od76xXqlhjfV96eWV/c8QLAKdePa86O8+v7K1' +
            'KfG5vZ0P6byuPLUlkqS/1HKRFJTQhxziUl5ZxDVDUpKVWlSPHT7B0pvWfWpmEdJgAAAABJRU5ErkJggg' +
            '=='
        );

        Y.dcforms.assets.btnMinus = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAAiCAYAAADYmxC7AAAABmJLR0QA/w' +
            'D/AP+gvaeTAAAACXBIWXMAAC4jAAAuIwF4pT92AAAAB3RJTUUH4QYWCzYny71UmwAAABl0RVh0Q29tbW' +
            'VudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAADHSURBVFjD7dihDcNADAXQf1bvQEjMAsK7SUcp6gqFXa' +
            'Goo3STSoEBYY4UBcTSXTeoEtDEwB9/S09nowullDLPM0QEy7Ig54y9Q0RIKYGZUVUVwjRNZRgGWEnTNC' +
            'ARgaWICEhVTaFUFXTEDf1KzhkEg3GUoxzlKOuo0+aJ5YPX7Y73uKJbX/B4XnFO/34pFfTjyu7YQ3SP9U' +
            'VGW6/s1i04bkeFruuKH7qjHOUoRznKUQejiMgaCBRjNIWKMYKY2RSKmREsfpp9AbbTS6yzVe5QAAAAAE' +
            'lFTkSuQmCC'
        );

    }, // end module function

    /* Req YUI version */
    '0.0.1',

    /* YUI module config */
    {
        requires: [
            'node',
            'dccommonutils',
            'dc-comctl',
            'dcblindproxy',
            'dcutils',
            'dcforms-event-emitter',
            'dcforms-categories',
            'dcforms-schema-all',

            //  common to table element types
            'dcforms-table-utils',

            //  only require value editors on the client
            'dcforms-editvalue-dropdown',
            'dcforms-editvalue-nontext',
            'dcforms-editvalue-radio',
            'dcforms-editvalue-table',
            'dcforms-editvalue-date',
            'dcforms-editvalue-text',
            'dcforms-editvalue-markdown',

            //  only require element editors on the client
            'dcforms-booleaneditor',
            'dcforms-dateeditor',
            'dcforms-subformeditor',
            'dcforms-chartmdeditor',
            'dcforms-hyperlinkeditor',

            //  Ko replacements for older element editors
            'FormTableEditorViewModel'
        ]
    }

);  // end YUI.add

