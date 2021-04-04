/*
 *  Server-side utility / shortcut functions for FormEditorMojit
 *
 *  This includes common methods and utilities used by a number of FEM components, prevents duplication and
 *  simplifies the jadeLoaded views by doing much of their lifting.
 *
 */

/*jshint bitwise:false, latedef:false */
/*global YUI */



YUI.add(
    /* YUI module name */
    'dcforms-utils',

    /* Callback */

    function(Y, NAME) {

        Y.log('Adding dcforms server-side helper utilities', 'info', 'dcforms-utils');
        if (!Y.dcforms) { Y.dcforms = {}; }

        /*
         *  Environment ------------------------------------------------------------------------------------------------
         */

        Y.dcforms.isOnServer = true;
        Y.dcforms._async = require( 'async' );

        /*
         *  Private variables ------------------------------------------------------------------------------------------
         */

        var
            Canvas = require('canvas'),
            Image = Canvas.Image,
            bfbCheckbox = false,                //  is updated from the db settings object
            randIdIterator = 0;                 //  cut down on chance of collision

        /*
         *	Utility methods --------------------------------------------------------------------------------------------
         */

        /**
         *  Make a simple hash of string to prevent double-saving (unnecessary PUTs in response to events like mouse clicks)
         *
         *  credit: http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
         *  credit: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
         *
         *  JSHint is set to ignore this block due ti an apparent error in the 'bitwise' option for some versions
         *  of this tool.
         *
         *  @param txt  {String}    Some string to hash
         */


        Y.dcforms.fastHash = function(txt) {
            var
                hash = 0,       //% 32 bit integer [int]
                i;              //% char pos [int]

            if( 'object' === typeof txt ) {
                txt = JSON.stringify( txt );
            }

            if( 0 === txt.length ) {
                return hash;
            }

            for( i = 0; i < txt.length; i++ ) {
                hash = (((hash << 5) - hash) + txt.charCodeAt( i ));        //  jshint ignore:line
                hash = hash & hash;                                         //  jshint ignore:line
            }

            return hash;
        };

        /**
         * Safari likes to sprinkle random <div> elements and other junk into content-editable fields, forms need
         * to be cleaned of this, but this is a stopgap.
         *
         * TODO: find a way to do this on the server
         *
         * @param html
         * @returns {string|string}
         */

        Y.dcforms.stripHtml= function(html) {
            html = html || '';

            html = html.replace( new RegExp( '<', 'g' ), '&lt;' );
            html = html.replace( new RegExp( '>', 'g' ), '&gt;' );

            if ( 'string' !== typeof html ) {
                html = html && html.toString ? html.toString() : html + '';
            }

            return html;
        };

        //  NOTE: proxima nova is the page font, however, the DC stylesheet was causing this to appear very small
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
         *  @param  user        {String}    REST user or equivalent
         *  @param  key         {String}    See FEM/formdefaults.json
         *  @param  forceReload {Boolean}   Get from server and not cache
         *  @param  callback    {Function}  of the form fn(err, value)
         */

        Y.dcforms.getConfigVar = function (user, key, forceReload, callback) {

            function onConfigLoaded(err, formRoles) {
                if (err) {
                    Y.log('Could not load formsconfig: ' + JSON.stringify(err), 'warn', NAME);
                    callback(err);
                    return;
                }

                if ('*' === key) {
                    callback(null, formRoles);
                    return;
                }

                if (formRoles.hasOwnProperty(key)) {
                    callback(null, formRoles[key]);
                    return;
                }

                callback(null, '');
            }

            Y.doccirrus.formsconfig.getConfig(user, onConfigLoaded);
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
            Y.log('Y.dcforms.setConfigVar - Unimplemented on server. ', 'warn', NAME);
            Y.log('params: ' + patientRegId + ',' + setKey + ', ' + setValue, 'debug', NAME);
            callback(new Error('Y.dcforms.setConfigVar - Unimplemented on server.'));
        };

        /**
         *  Get reduced metadata for the canonical version of a form
         *
         *  This is used by CaseFile to look up form versions when creating activities which have default forms
         *
         *  @param  {Object}    user            Used to proxy requests to other PRCs
         *  @param  {String}    canonicalId     Master / editable copy of a form
         *  @param  {Function}  callback        Of the form fn(err, serializedForm)
         */

        Y.dcforms.getFormListing = function( user, canonicalId, callback ) {
            Y.doccirrus.api.formtemplate.listforms( {
                user: user,
                originalParams: {
                    canonicalId: canonicalId
                },
                callback: callback
            } );
        };

        /**
         *  Subforms might be referred to by canonicalId, form role or name
         *
         *  This will call back with empty string if no form is found.
         *
         *  @param  user            {String}    REST user or equivalent
         *  @param  identifier      {String}    For _id, role or name
         *  @param  callback        {Function}  Of the form fn( err, formId )
         */

        Y.dcforms.findFormId = function( user, identifier, callback ) {
            var
                async = require( 'async' ),
                foundCanonicalId = '',
                formList;

            async.series( [ checkIfCanonicalId, checkIfFormRole, checkIfFormName ], onAllDone );

            //  first check if this is a form
            function checkIfCanonicalId( itcb ) {
                Y.dcforms.getFormList( user, false, onFormListLoaded);

                function onFormListLoaded( err, data ) {
                    if (err) { return callback( 'Could not load form list: ' + JSON.stringify( err ) ); }

                    //  mongoose magic will otherwise break the comparisons to identifier
                    formList = JSON.parse( JSON.stringify( data ) );

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
                foundCanonicalId = foundCanonicalId + '';       //  mongoose magic
                callback( null, foundCanonicalId );
            }
        };

        /**
         *  Convenience wrapper to load a form template given an instance ID
         *
         *  @param  user        {string}       REST user or equivalent
         *  @param  canonicalId {string}       Database _id of form template
         *  @param  versionId   {String}       Database _id ofform template version
         *  @param  callback    {function}     Of the form fn(err, serializedForm)
         */

        Y.dcforms.loadForm = function(user, canonicalId, versionId, callback) {
            Y.doccirrus.api.formtemplate.loadform({
                'callback': callback,
                'user': user,
                'originalParams': {
                    'id': canonicalId,
                    'versionId': versionId
                }
            });
        };

        /**
         *  Save a form instance to database
         *
         *  @param canonicalId  {string}    Database _id of form template
         *  @param serialized   {object}    As produced by dcforms-serialize()
         *  @param callback     {function}  Of the form fn(err)
         */

        Y.dcforms.saveForm = function(canonicalId, serialized, callback){
            Y.log('Y.dcforms.saveForm - Unimplemented on server. ' + canonicalId, 'warn', NAME);
            callback(null);
        };

        /**
         *  Export a form template and dependencies to tgz / zip archive
         *
         *  @param canonicalId  {string}    Database _id of form template
         *  @param callback     {function}  Of the form fn(err)
         */

        Y.dcforms.exportForm = function(canonicalId, callback){
            Y.log('Y.dcforms.exportForm - Unimplemented on server. ' + canonicalId, 'warn', NAME);
            callback(new Error('Y.dcforms.exportForm - Unimplemented on server.'));
        };

        /**
         *  Load a form and dependancies from backup / zip directory
         *
         *  @param canonicalId  {string}    Database _id of form template
         *  @param callback     {function}  Of the form fn(err)
         */

        Y.dcforms.importForm = function(canonicalId, callback){
            Y.log('Y.dcforms.importForm - Unimplemented on server. ' + canonicalId, 'warn', NAME);
            callback(new Error('Y.dcforms.importForm - Unimplemented on server.'));
        };

        /**
         *  Lists current contents of import / export dir
         *
         *  Returns array of meta objects in same format as listforms
         *
         *  @param  callback    {Function}  Of the form fn(err, list)
         */

        Y.dcforms.listFormExports = function(callback) {
            Y.log('Y.dcforms.listFormExports - Unimplemented on server.', 'warn', NAME);
            callback(null);
        };

        /**
         *  Deletes current contents of import / export dir
         *
         *  @param  callback    {Function}  Of the form fn(err)
         */

        Y.dcforms.clearFormExports = function(callback) {
            Y.log('Y.dcforms.clearFormnExports - Unimplemented on server.', 'warn', NAME);
            callback(null);
        };

        /**
         *  Causes the server to copy the canonical form template into a new version
         *
         *  @param  canonicalId {String}    database _id of the current form template to create a version from
         *  @param  revComment  {String}    optional comment on why a new version is being created
         *  @param  callback    {Function}  of the form fn(err, newVersionId
         */

        Y.dcforms.makeNewVersion = function(canonicalId, revComment, callback) {
            Y.log('Y.dcforms.makeNewVersion - Unimplemented on server.', 'warn', NAME);
            callback(null, '');
        };

        /**
         *  Get abbreviated listing of all versions of the given form
         *
         *  @param  canonicalId {String}    database _id of a formtemplate
         *  @param  callback    {Function}  of the form fn(err, data)
         */

        Y.dcforms.getFormVersionHistory = function(canonicalId, callback) {
            Y.log('Y.dcforms.getFormVersionHistory - Unimplemented on server.', 'warn', NAME);
            callback(null);
        };

        /**
         *  Store the new template on the server (database, not disk)
         *
         *  @param  newTemplate {Object}    A serialized dcforms-template object with a new instance Id
         *  @param  callback    {Function}
         */

        Y.dcforms.saveNewTemplate = function(newTemplate, callback) {
            Y.log('Y.dcforms.saveNewTemplate - Unimplemented on server.', 'warn', NAME);
            callback(null);
        };

        /**
         *  Load the current user's set of form categroies from cache or server
         *  @method getFormCategories
         *  @param  forceReload {Boolean}   causes cached value to be cleared
         *  @param  callback    {Function}  of the form fn(err, data)
         */

        Y.dcforms.getFormCategories = function(forceReload, callback) {
            Y.log('Y.dcforms.getFormCategories - Unimplemented on server.', 'warn', NAME);
            callback(null, {});
       };

        /**
         *  Get list of forms belonging to the current user, summaries only
         *
         *  Summary includes form instance id, category and title in available languages
         *
         *  @param  user            {Object}        REST user or equivalent
         *  @param  forceReload     {bool}          Force loading from server, rather than using cached response
         *  @param  callback        {function}      Of the form fn(err, data)
         */

        Y.dcforms.getFormList = function( user, forceReload, callback ) {
            var
                apiArgs = {
                    'user': user,
                    'originalParams': {},
                    'callback': onFormListLoaded
                };

            Y.doccirrus.api.formtemplate.listforms( apiArgs );

            function onFormListLoaded( err, formList ) {
                if ( err ) { return callback( err ); }
                callback( null, formList );
            }
        };

        /**
         *  Invalidate the cached form list on the server (eg, when a form is unlocked or title changes)
         *  @param callback
         */

        Y.dcforms.refreshFormList = function(callback) {
            Y.log('Y.dcforms.refreshFormList - Unimplemented on server.', 'warn', NAME);
            callback(null, {});
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
            txt = txt.replace(new RegExp('/<(?:.|\n)*?>/', 'gm'), '');      //  eslint-disable-line no-control-regex
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
            txt = txt.replace(new RegExp('\n', 'g'), "\n");                     //  eslint-disable-line no-control-regex
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

        /**
         *  Small helper function / shortcut to set the status line above the form
         *  NOTE: this assumes some DOM elements, better to encapsulate
         *  @param  msg     Status message [string]
         *  @param  busy    Show throbber animation [bool]
         */

        Y.dcforms.setStatus = function(msg, busy) {
            Y.log('Forms set status: ' + (msg || '""') + ' ' + (busy ? 'BUSY': 'IDLE'), 'info', NAME);
        };

        /**
         *  Dummy method when called on server
         *  @param  callback    {Function}  Of the form fn(err)
         */

        Y.dcforms.initModal = function(callback) {
            callback(null);
        };

        /**
         *  Small helper function / shortcut to set the status line above the form
         *
         *  Dummy API call, no use on server
         *
         *  @param  title           {String}    Modal dialog title [string]
         *  @param  content         {String}    Body of modal dialog [string]
         *  @param  closeVisible    {Boolean}   Turn close button visibility on or off
         *  @param  onOKClick       {Function}  If set, OK button click calls this function [optional]
         *  @param  callback        {Function}  Of the form fn(err) [optional]
         */

        Y.dcforms.setModal = function(title, content, closeVisible, onOKClick, callback) {
            Y.log( 'Form requested modal: ' + title, 'debug', NAME );
            Y.log( 'DEPRECATED, REMOVED: Please use DCWindow', 'warn', NAME );
            if ( callback ) { return callback( null ); }
        };

        /**
         *  No use on server
         *  Calls to this method should be dreprecated in favor of calling Y.doccirrus.comctl directly
         */

        Y.dcforms.clearModal = function() {
            return false;
        };

        /**
         *  Ignored on server, no user interactions
         *  @return     {Boolean}   True if modal is displayed, false if not
         */

        Y.dcforms.inModal = function() {
            return false;
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
         *  See MOJ-1098 - user's language preference is kept on a per-form basis
         *
         *  @/param  formId  {String}    Common to all versions of a form
         */

        Y.dcforms.getUserLang = function() {
            Y.log('Y.dcforms.getUserLang - Per-form language settings not implemented on server, returning global language setting for this user.', 'warn', NAME);
            return Y.doccirrus.comctl.getUserLang() === 'de-ch' ? 'de': Y.doccirrus.comctl.getUserLang();
        };

        /**
         *  Ensures that the callback is only called once
         *  Used to find errors in deep async code
         *
         *  Assumes callback has no more than four arguments
         *
         *  @param  callback    {Function}  Callback to be counted
         *  @param  label       {String}    Used to disambiguate callers
         */

        Y.dcforms.checkSingleCB = function(callback, label) {
            var called = 0;
            label = label || 'none';
            return function checkCBCount( arg1, arg2, arg3, arg4 ) {
                called = called + 1;
                if( called > 1 ) {
                    Y.log( 'Callback called multiple times: ' + called + ' (label: ' + label + ')', 'error', NAME );
                    console.log( 'stack trace follows: ', new Error().stack );      //  eslint-disable-line no-console
                    return;
                }
                callback( arg1, arg2, arg3, arg4 );
            };
        };

        /**
         *  This is a generic / shortcut callback function for situations where we only care care about the callback
         *  value if it's an error
         */

        Y.dcforms.nullCallback = function(err) {
            if (err) {
                Y.log('Error on callback: ' + JSON.stringify(err), 'warn', NAME);
                console.log('Stack trace follows: ', new Error().stack);            //  eslint-disable-line no-console
            }
        };

        /**
         *	Set current user language for this page / form
         *
         *  @param  userLang    {string}    Language to set ('en'|'de')
         *  @param  formId      {string}    per-form lang perference is kept in localStorage
         */

        Y.dcforms.setUserLang = function(userLang, formId) {
            Y.log('Y.dcforms.setUserLang - Unimplemented on server.', 'warn', NAME);
            Y.log('params: ' + userLang + ', ' + formId, 'debug', NAME);
            /*
             if (formId && ('' !== formId)) {
             Y.log('Setting local lang preference: ' + formId + '-lang :=' + userLang, 'debug', NAME);
             Y.doccirrus.utils.localValueSet(formId + '-lang', userLang);
             }

             Y.doccirrus.comctl.setUserLang(userLang);
             */
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
                        setTimeout( function() { processNext(); }, 1 );
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
            var timing = [], randId = Y.doccirrus.comctl.getRandId();
            Y.dcforms.addTimingPoint( timing, randId + ' (start chain)' );

            function processNext( idx ) {
                if ( idx === steps.length ) {
                    Y.dcforms.addTimingPoint( timing, randId + ' (end chain)' );
                    //Y.dcforms.printTiming( timing );
                    return callback( null );
                }

                var step = steps[ idx ];

                step( function onEndStep( err ) {
                    Y.dcforms.addTimingPoint( timing, randId + ' ' + idx + ': ' +  step.name );
                    if ( err ) { return callback( err ); }
                    processNext( idx + 1 );
                } );
            }
            processNext( 0 );
        };

        /*
         *	Helpers for node canvas ------------------------------------------------------------------------------------
         */

        /**
         *  Convert a dataUrl to the buffer format needed for server-side canvas
         *  @param dataUrl
         *  @returns {Buffer}
         */

        Y.dcforms.dataUrlToBuffer = function(dataUrl) {
            var bin, parts;
            //Y.log('Converting dataUrl to buffer: ' + dataUrl, 'debug', NAME);
            parts = dataUrl.split(',', 2);
            bin = Buffer.from(parts[1], 'base64');
            return bin;
        };

        Y.dcforms.createImageFromDataUrl = function(dataUrl) {
            var newImage = new Image();
            newImage.src = Y.dcforms.dataUrlToBuffer(dataUrl);
            return newImage;
        };

        /**
         *  To match client API
         *  @param callback
         */

        Y.dcforms.loadCertNumbers = function(callback) {
            Y.log('not implemented on server: loadCertNumbers', 'debug', NAME);
            callback(null);
        };

        /**
         *  Check whether the BFB checkbox is set at inSuite properties
         *  @param  user        {Object}    REST user or equivalent
         *  @param  callback    {Function}  Of the form fn(err)
         */

        Y.dcforms.checkBFBSetting = function(user, callback) {
            var
                dbSetup = {
                    'user': user,
                    'model': 'settings',
                    'action': 'get',
                    'query': { }
                };

            bfbCheckbox = false;

            Y.doccirrus.mongodb.runDb( dbSetup, onSettingsLoaded );

            function onSettingsLoaded(err, results) {
                if (err || !results || 0 === results.length) {
                    Y.log( 'Could not load settings to set BFB status', 'warn', NAME );
                    callback(err);
                    return;
                }

                bfbCheckbox = (results[0].blankoforms || false);
                callback(null);
            }
        };

        /**
         *  Check if client (ie, customer) has BFB registration number and Blankformulare are enabled in settings
         *  (note that this is synchronous, the bfbCheckbox variable should be initialized above)
         *
         *  @return {Boolean}   True if client has Blankoformulare certification
         */

        Y.dcforms.clientHasBFB = function() {
            var hasCertNo = Y.config.insuite.kbv && Y.config.insuite.kbv.bfbCertNumber;

            if (hasCertNo && bfbCheckbox && '' !== Y.config.insuite.kbv.bfbCertNumber) {
                return true;
            }

            return false;
        };

        /**
         *  Client and server need different calls to request meddata in chart format
         *
         *  Rarely run on the server, almost ways maps on the client, MOJ-10236
         *
         *  @param  {Object}    user            As cached on form template, only used on server
         *  @param  {Object}    queryParams     Given by chart element
         *  @param  {Function}  callback        Of the form fn( err, chartPoints )
         */

        Y.dcforms.getChartData = function( user, queryParams, callback ) {
            Y.doccirrus.api.meddata.getChartData( {
                'user': user,
                'originalParams': queryParams,
                'callback': callback
            } );
        };

        /**
         *  Pass ws event to client to update PDF render progress bar
         *
         *  @param  evt             {Object}
         *  @param  evt.label       {String}    Description of current step, debugging
         *  @param  evt.progress    {Number}    Percent
         *  @param  evt.mapId       {String}    Database _id of object this event applies to
         *  @param  evt.targetId    {String}    Target / room for event
         */

        Y.dcforms.raisePdfProgressEvent = function( evt ) {
            Y.log( 'Report PDF progress: ' + evt.percent + ' / ' + evt.mapId || '' + ' / ' + evt.label, 'debug', NAME );
            evt.progress = evt.percent;

            if ( !evt.targetId ) {
                Y.log( 'No target supplied for PDF ws event: ' + JSON.stringify( evt ), 'warn', NAME );
                console.log( '(****) stack trace follows: ', new Error().stack );   //  eslint-disable-line no-console
                return;
            }

            Y.doccirrus.communication.emitEventForUser( {
                targetId: evt.targetId,
                nsp: 'default',
                event: 'pdfRenderProgress',
                msg: { data: evt }
            } );
        };

        /**
         *  Utility method for development, makes stack traces more readable in chrome
         */

        Y.dcforms.tidyStackTrace = function(/* txtStack */) {
            return '';
            /*
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
            */
        };

    }, // end module function

    /* Req YUI version */
    '0.0.1',

    /* YUI module config */
    {
        requires: [
            'dcforms-event-emitter',
            'dcforms-confighelper',
            'dcforms-schema-all',
            'dc-comctl',
            'meddata-api'
        ]
    }

);  // end YUI.add