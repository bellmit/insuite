/**
 *  Utilities to assist in loading and saving form set from zip / disk
 *
 *  @author: strix
 *  @date: 2014 May
 */

/*jslint anon:true, nomen:true, latedef:false */
/*global YUI*/



YUI.add( 'dcforms-exportutils', function( Y, NAME ) {

        var

        //  external modules
            Promise = require('bluebird'),
            crypto = require('crypto'),
            async = require('async'),

            { formatPromiseResult } = require( 'dc-core' ).utils,

        //  set to true if this component starts up without error
            initOk = false,
            personalienfeld = '',

        //  location from which forms are imported or exported from zip archive
        //  these are defautls which may be overridden in env.json
            baseDir = Y.doccirrus.auth.getTmpDir() + '/',
            exportFormsDir = baseDir + 'formsexport/',
            defaultFormsDir = baseDir + 'formsdefault/';

        // immediately set the form dirs, regardless.
        setFormDirs();

        // helper, credit: http://stackoverflow.com/questions/1960473/unique-values-in-an-array
        function arrayDeduplicate(value, index, self) {
            if ('' === value || true === value || 'true' === value) { return false; }
            if ( -1 !== value.indexOf( '.form' ) ) { return false; }
            return self.indexOf(value) === index;
        }

        /**
         *  Called when the server starts
         */

        function initFormExportService( callback ) {
            var cluster = require('cluster');
            var outstanding = 2;

            Promise.onPossiblyUnhandledRejection = function (err) {
                Y.log('Error not handled in promise chain: ' + JSON.stringify(err), 'warn', NAME);
            };

            setFormDirs();

            if( cluster.isMaster) {
                Y.doccirrus.media.mkdirIfMissing( exportFormsDir, decOutstanding );
                if( Y.doccirrus.auth.isPRC() /* || Y.doccirrus.auth.isVPRC() */ ) {
                    if( !Y.doccirrus.fileutils.isDirectorySync( defaultFormsDir ) ) {
                        Y.log( 'Error in Config env.json:' + defaultFormsDir + ' is not a directory', 'warn', NAME );
                        process.exit( 44 );
                    }
                } else {
                    initOk = true;
                }
            } else {
                initOk = true;
            }

            function decOutstanding( err ) {
                if( err ) {
                    // transient error - disk space?
                    Y.log( 'Errror initializing form IO: ' + err, 'warn', NAME );
                    return;
                }
                outstanding = outstanding - 1;
                initOk = (0 === outstanding);
            }

            callback();
        }

        /**
         *  Set import and export directory locations from env.json if specified
         */

        function setFormDirs() {
            var
                allDirs = Y.doccirrus.auth.getDirectories(),
                k;

            function checkPath(dirName) {

                Y.log('checking directory: ' + dirName, 'debug', NAME);

                //  add base dir if relative to CWD
                if ('/' !== dirName.charAt(0)) {
                    dirName = baseDir + dirName;
                }

                //  add trailing slash if not present
                if ('/' !== dirName.charAt(dirName.length - 1)) {
                    dirName = dirName + '/';
                }

                Y.log('checking directory returns: ' + dirName, 'debug', NAME);
                return dirName;
            }

            for (k in allDirs) {
                if (allDirs.hasOwnProperty(k)) {
                    switch(k) {
                        case 'forms-export': exportFormsDir = checkPath(allDirs[k]);    break;
                        case 'forms-default': defaultFormsDir = checkPath(allDirs[k]);  break;
                    }
                }
            }

            if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() ) {
                Y.log( 'Form export directory: ' + exportFormsDir, 'info', NAME );
                Y.log( 'Default form directory: ' + defaultFormsDir, 'info', NAME );
            }
        }

        function initialized() {
            return initOk;
        }

        /**
         *  Lets the middleware know configured location for form exports
         */

        function getExportDir() {
            return exportFormsDir;
        }

        /**
         *  Create / empty / reset the form export directory
         *
         *  @param  user        {Object}    ac.rest.user or equivalent
         *  @param  callback    {Function}  Of the form fn(err, tenantExportDir)
         */

        function clearExportDir(user, callback) {

            function onExportDirCleared(err) {
                if (err) {
                    callback('Could not clear tenant form export dir: ' + err);
                    return;
                }
                callback(null, tenantDir);
            }

            function onExportDirCreated(err, useTenantDir) {
                if (err) {
                    callback(err);
                    return;
                }

                tenantDir = useTenantDir;

                Y.log('Clearing form import/export directory: ' + tenantDir, 'info', NAME);
                Y.doccirrus.media.deleteRecursive(tenantDir, '', onExportDirCleared);
            }

            var tenantDir;
            makeExportDir(user, onExportDirCreated);

        }

        function raiseExportEvent(data, user) {
            Y.doccirrus.communication.emitNamespaceEvent( {
                nsp: 'default',
                tenantId: user && user.tenantId,
                event: 'formExportAction',
                msg: {
                    data: data
                }
            } );
        }

        /**
         *  Serialize a form to the export directory
         *
         *      (*) load the form and save it to disk in form export dir
         *      (*) load dependencies and save to disk in form export dir (attached media, subforms)
         *
         *  @param  user        {Object}    ac REST user
         *  @param  id          {String}    Database _id of a formtemplate object
         *  @param  withHistory {Boolean}   Always false for now
         *  @param  callback    {Function}  Of the form fn(err)
         */

        function exportForm(user, id, withHistory, callback) {

            Y.log('Exporting formtemplate ' + id + ' to archive ' + (withHistory ? 'with history' : '(no history)'), 'info', NAME);

            var
                startTime,
                endTime,
                performance = {},
                modelName = 'formtemplate',
                formsConfig,
                toCopy,
            //  copyOK = [],
            //  copyFail = [],
                canonical,

                runDb = Promise.promisify(Y.doccirrus.mongodb.runDb),
                getConfig = Promise.promisify(Y.doccirrus.formsconfig.getConfig),
                exportSingle = Promise.promisify(exportSingleObject);

            raiseExportEvent({'status': 'start', 'id': id, 'withHistory': withHistory }, user);
            startTime = Date.now();

            getConfig(user)                 //  Load forms config before we start
                .then(onConfigLoaded)       //  Store the config and note performance
                .then(loadForm)
                .then(onFormLoaded)
                .done(onAllComplete, onErr);

            function onConfigLoaded(cfg) {
                endTime = Date.now();
                performance.config = (endTime - startTime);

                //Y.log('Loaded forms config: ' + JSON.stringify(cfg), 'info', NAME);
                formsConfig = cfg;
                personalienfeld = formsConfig['casefile-personalienfeld'] || '';
            }

            function loadForm() {
                startTime = Date.now();
                return runDb({'user': user, 'model': modelName, 'query': {'_id': id}});
            }

            async function onFormLoaded(data) {
                if (!data || !data[0]) {
                    Y.log('Could not load formtemplate: ' + id, 'warn', NAME);
                }

                endTime = Date.now();
                performance.deps = (endTime - startTime);
                startTime = Date.now();

                var
                    promises = [],
                    immediateDep = listDirectDependencies( data[0] ).split( "\n" ),
                    folderDep = [],
                    nextDep,
                    err,
                    i;

                canonical = data[0];
                canonical.dependsOn = (canonical.dependsOn ? canonical.dependsOn : '');

                if ( canonical.formFolderId ) {
                    [ err, folderDep ] = await formatPromiseResult(
                        Y.doccirrus.api.formfolder.getParentFolderDeps( user, canonical.formFolderId )
                    );
                    if ( err ) {
                        Y.log( `Problem looking up form folder dependencies: ${err.stack||err}`, 'error', NAME );
                        //  continue anyway, best effort
                    }
                }

                toCopy = canonical.dependsOn.split("\n");
                toCopy = toCopy.concat( folderDep );

                immediateDep.forEach( function( dep ) {
                    if ( -1 === toCopy.indexOf( dep )) {
                        toCopy.push( dep );
                    }
                } );

                //  add the canonical form
                //console.log('Loaded form: ' + id + ', adding to export...', 'debug', NAME);
                toCopy.push('formtemplate::' + id);

                if (!withHistory) {
                    //  remove all form versions except for the most recent (history exported separately)
                    for (i = 0; i < toCopy.length; i++) {
                        nextDep = toCopy[i].split('::');
                        if ('formtemplateversion' === nextDep[0]) {
                            toCopy[i] = '';
                        }
                    }
                }

                if (canonical.latestVersionId && '' !== canonical.latestVersionId) {
                    toCopy.push('formtemplateversion::' + canonical.latestVersionId);
                }

                for (i = 0; i < toCopy.length; i++) {
                    if ('' !== toCopy[i]) {
                        //console.log('exporting: ' + toCopy[i]);
                        nextDep = toCopy[i].split('::');

                        //  deprecated TODO: remove
                        if ('subform' === nextDep[0]) {
                            //  Special case until general subforms are in use
                            nextDep[0]= 'formtemplate';
                            nextDep[1] = formsConfig['casefile-personalienfeld'];
                        }

                        promises.push(exportSingle(user, nextDep[0], nextDep[1]));
                    }
                }

                return Promise.all(promises);
            }

            function onAllComplete() {

                endTime = Date.now();
                performance.fs = (endTime - startTime);

                raiseExportEvent({'status': 'done', 'id': id, 'withHistory': withHistory, 'performance': performance }, user);

                if (withHistory) {
                    exportHistory(user, id, onHistoryExported);
                    return true;
                }

                callback(null);
                return true;
            }

            function onHistoryExported(err) {
                raiseExportEvent({'status': 'done', 'id': id, 'withHistory': withHistory, 'performance': performance }, user);
                callback(err);
            }

            function onErr(err) {
                Y.log('Error exporting form: ' + JSON.stringify(err), 'error', NAME );
                callback(err);
            }

        }

        /**
         *  Export all versions of a form
         *
         *  @param user
         *  @param canonicalId
         *  @param callback
         */

        function exportHistory(user, canonicalId, callback) {
            var
                runDb = Promise.promisify(Y.doccirrus.mongodb.runDb),
                exportSingle = Promise.promisify(exportSingleObject),
                dbSetup = {
                    'user': user,
                    'model': 'formtemplateversion',
                    'query': {'canonicalId': canonicalId }
                };

            Y.log('Exporting complete histroy of form: ' + canonicalId, 'debug', NAME);

            runDb(dbSetup)
                .then(exportAllVersions)
                .done(onAllComplete, onErr);

            function exportAllVersions(data) {
                var i, toExport = [], promises = [], parts;

                for (i = 0; i < data.length; i++) {
                    toExport.push('formtemplateversion::' + data[i]._id);

                    if (data[i].dependsOn && '' !== data[i].dependsOn) {
                        toExport = toExport.concat( data[i].dependsOn.split( "\n" ) );
                        toExport = toExport.concat( listDirectDependencies( data[i] ).split( "\n" ) );
                    }
                }

                toExport = toExport.filter(arrayDeduplicate);

                Y.log('Export deduplicated history set: ' + JSON.stringify(toExport, undefined, 2), 'debug', NAME);

                for (i = 0; i < toExport.length; i++) {
                    parts = toExport[i].split('::');
                    if (2 === parts.length) {
                        promises.push(exportSingle(user, parts[0], parts[1]));
                    }
                }

                Y.log('Merging ' + promises.length + ' promises', 'debug', NAME);
                return Promise.all(promises);
            }

            function onAllComplete() {
                Y.log('Exported complete local history of ' + canonicalId, 'debug', NAME);
                callback(null);
            }

            function onErr(err) {
                Y.log('Could not export complete history: ' + JSON.stringify(err), 'debug', NAME);
                callback(err);
            }
        }

        /**
         *  Export a single form template or media object from the database
         *
         *  @param user         {Object}    ac REST user
         *  @param modelName    {String}    'form'|'formtemplate'|'formtemplatversion'|'media'
         *  @param id           {String}    database _id
         *  @param callback     {Function}  Of the form fn(err)
         */

        function exportSingleObject(user, modelName, id, callback) {
            var
                tenantDir,
                dbSetup = {
                    'user': user,
                    'model': modelName,
                    'action': 'get',
                    'query': { '_id': id }
                };

            if ( !Y.doccirrus.comctl.isObjectId( id ) ) {
                Y.log( `Cannot export object ${modelName}::${id}, not a valid ObjectId.`, 'warn', NAME );
                //  continue with other exports, there can sometimes be some bad references in legacy forms
                return callback( null );
            }

            Y.log('export single object ' + modelName + '::' + id, 'debug', NAME);

            makeExportDir(user, onExportDirCreated);

            function onExportDirCreated(err, useTenantDir) {

                Y.log('export dir created: ' + useTenantDir + ' (user: ' + id + ')', 'debug', NAME);

                if (err) {
                    callback('Could not create directory to export to: ' + err);
                    return;
                }

                tenantDir = useTenantDir;

                Y.log('Exporting single object: ' + modelName + ' - ' + id, 'info', NAME);
                Y.doccirrus.mongodb.runDb( dbSetup, onObjectLoaded );
            }

            function onObjectLoaded(err, data) {
                if (err || 0 === data.length) {
                    callback('Could not export ' + modelName + ' ' + id + ': ' + err);
                    return;
                }

                if ( 'formfolder' === modelName && data[0].parentId && data[0].parentId === `${data[0]._id}` ) {
                    //  clean up circular reference to self, MOJ-12837
                    data[0].parentId = '';
                }

                //  MOJ-8735 Remove user_ object current being added by db layer
                if ( data[0].user_ ) { delete data[0].user_; }

                var
                    fileName = tenantDir + modelName + '_' + id + '.json',
                    //plainJSON = Y.doccirrus.utils.safeStringify(data[0]);
                    plainJSON = JSON.stringify( data[0] , undefined, 2);

                Y.doccirrus.media.writeFile(fileName, tenantDir, plainJSON, onJSONWritten );
            }

            function onJSONWritten( err ) {
                if ( err ) { return callback( err ); }
                if ( 'media' !== modelName ) { return callback( null ); }

                var fileName = tenantDir + 'media_' + id + '.binary';

                Y.log( 'Writing media from GridFS to form export: ' + fileName, 'debug', NAME );
                Y.doccirrus.media.gridfs.exportFile( user, id, fileName, false, onBinaryFileWritten  );
            }

            function onBinaryFileWritten( err ) {
                if ( err ) {
                    Y.log( 'Error writing binary file to disk: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                Y.log( 'Completed GridFS export for: ' + modelName + '::' + id, 'debug', NAME );
                callback( null );
            }
        }

        /**
         *  Import a form from the import directory
         *
         *  @param  user        {Object}    ac REST user or equivalent
         *  @param  modelName   {String}    Type of object to start from
         *  @param  id          {String}    Should match a form available in the import directory
         *  @param  callback    {Function}  Of the form (err, _id);
         */

        function importForm(user, modelName, id, callback) {
            Y.log('MOVED: please use: Y.doccirrus.forms.importutils.importForm()', 'debug', NAME);
            Y.doccirrus.forms.importutils.importForm(user, {modelName, id}, callback);
        }

        /**
         *  Load a form template and find all dependencies
         *
         *  Dependencies are listed in as an array of objects like:
         *
         *  {
         *      'type'      {String}    database collection / model name
         *      '_id'       {String}    database _id
         *  }
         *
         *  @param  user        {Object}    ac REST user
         *  @param  modelName   {String}    'form'|'formtemplate'|'formtemplateversion'
         *  @param  id          {String}    Database _id of an item in this collection
         *  @param  callback    {Function}  Of the form fn(err, dep)
         */

        /**
         *  List immediate dependencies for a formtemplate or formtemplateversion object
         *
         *  (All other objects directly referenced by a formtemplate for formtemplateversion object)
         *
         *  Note that form names will not be resolved - these are just the immediate values.
         *
         *  Note: Form folders and their parents will be treated as dependencies during form import and export, but form
         *  folders are not stored in the dependency list.  This is to avoid complications when moving forms / subfolders.
         *
         *  @param templateObj  {Object}
         *  @returns            {String}    Format used in formtemplate depandsOn field
         */

        function listDirectDependencies(templateObj) {
            var
                jT = templateObj.jsonTemplate,
                deps = [],
                page, elem,
                i, j;

            //  add latest/previous version
            if (templateObj.latestVersionId && '' !== templateObj.latestVersionId) {
                deps.push('formtemplateversion::' + templateObj.latestVersionId);
            }

            //  add page level assets (backgrounds, headers, footers)
            for (i = 0; i < jT.pages.length; i++) {
                page = jT.pages[i];

                if (page.header && '' !== page.header) {
                    deps.push('formtemplate::' + page.header);
                }

                if (page.footer && '' !== page.footer) {
                    deps.push('formtemplate::' + page.footer);
                }

                if (page.headerOverflow && '' !== page.headerOverflow) {
                    deps.push('formtemplate::' + page.headerOverflow);
                }

                if (page.footerOverflow && '' !== page.footerOverflow) {
                    deps.push('formtemplate::' + page.footerOverflow);
                }

                if (page.bgImg && '' !== page.bgImg) {
                    deps.push('media::' + page.bgImg);
                }

                if (page.bgImgT) {
                    if (page.bgImgT && page.bgImgT.de && '' !== page.bgImgT.de) {
                        deps.push('media::' + page.bgImgT.de);
                    }
                    if (page.bgImgT && page.bgImgT.en && '' !== page.bgImgT.en) {
                        deps.push('media::' + page.bgImgT.en);
                    }
                }

                for (j = 0; j < page.elements.length; j++) {
                    elem = page.elements[j];

                    if ('image' === elem.type || 'audio' === elem.type || 'video' === elem.type) {
                        if (elem.defaultValue && elem.defaultValue.de && '' !== elem.defaultValue.de) {
                            deps.push('media::' + elem.defaultValue.de);
                        }
                        if (elem.defaultValue && elem.defaultValue.en && '' !== elem.defaultValue.en) {
                            deps.push('media::' + elem.defaultValue.en);
                        }
                    }

                    if ('subform' === elem.type) {
                        if (elem.defaultValue && elem.defaultValue.de && '' !== elem.defaultValue.de) {
                            deps.push('formtemplate::' + elem.defaultValue.de);
                        } else {
                            //  personalienfeld is the default subform value
                            if (personalienfeld !== '') {
                                deps.push('formtemplate::' + personalienfeld);
                            }
                        }
                        if (elem.defaultValue && elem.defaultValue.en && '' !== elem.defaultValue.en) {
                            deps.push('formtemplate::' + elem.defaultValue.en);
                        } else {
                            if (personalienfeld !== '') {
                                deps.push('formtemplate::' + personalienfeld);
                            }
                        }

                    }

                }

            }

            deps = deps.filter( arrayDeduplicate );

            //  some manual and mapped entries cannot be exported
            deps = deps.filter( function( value ) {
                //  blank or untranslated subform
                if ( 'formtemplate::' === value || '' === value ) { return false; }

                var parts = value.split( '::' );

                //  invalid values of _ids in some legacy forms
                if ( parts[1] && !Y.doccirrus.comctl.isObjectId( parts[1] ) ) {
                    Y.log( `Skipping invalid _id, cannot export: ${value}`, 'warn', NAME );
                    return false;
                }

                //  subform identity mapped at runtime
                if ( -1 !== value.indexOf( '{{' ) ) { return false; }

                return true;
            } );

            return deps.join("\n");
        }

        /**
         *  Expand a list of dependencies to include those cached on referenced forms / versions
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  dependsOn   {String}    Flat list of dependencies as stored on form
         *  @param  callback    {Function}  Of the form fn(err, dependsOn)
         */

        function loadSecondaryDependencies(user, dependsOn, callback) {

            Y.log('Loading secondary dependencies from immediate set: ' + "\n" + dependsOn, 'debug', NAME);

            Promise.map( dependsOn.split("\n"), onEachDependency ).then( onAllLookupsComplete ).catch( onLookupErr );

            function onEachDependency(depLine) {
                var
                    loadDependenciesP = Promise.promisify(loadDependencies),
                    parts = depLine.split('::');

                if ('formtemplate' === parts[0] || 'formtemplateversion' === parts[0]) {
                    Y.log('PROMISE: Checking for dependencies on ' + parts[0] + '::' + parts[1], 'debug', NAME);
                    return loadDependenciesP(user, parts[0], parts[1]);
                } else {
                    if ( 'formfolder' === parts[0] ) {
                        Y.log('PROMISE: Checking for subfolders of ' + parts[0] + '::' + parts[1], 'debug', NAME);
                        return getFolderDependencies( user, parts[1], '' );
                    }

                    Y.log('Dependency is not a form or version: ' + JSON.stringify(parts[0], 'debug', NAME));
                }
                return Promise.cast(true);
            }

            function onAllLookupsComplete(depsArray) {
                //Y.log('Dependencies array: ' + JSON.stringify(depsArray, undefined, 2), 'debug', NAME);
                var
                    allStr = depsArray.join("\n") + "\n" + dependsOn,
                    allLines = allStr.split("\n");

                allLines = allLines.filter(arrayDeduplicate);

                Y.log( 'Dependencies array (filtered): ' + JSON.stringify(allLines, undefined, 2), 'debug', NAME );

                callback(null, allLines.join("\n"));
            }

            function onLookupErr(err) {
                Y.log( 'Error looking for secondary dependencies: ' + JSON.stringify(err), 'warn', NAME );
                callback(err);
            }
        }

        /**
         *  Get the parent folders of a folder as dependencies array
         *
         *  @param  {Object}    user
         *  @param  {String}    folderId
         *  @param  {String}    depsStr
         */

        async function getFolderDependencies( user, folderId, depsStr ) {
            let err, result;

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'formfolder',
                    query: { _id: folderId }
                } )
            );

            if ( !err && !result[0] ) {
                Y.log( `Missing form folder: ${folderId}`, 'warn', NAME );
                return depsStr;
            }

            depsStr = depsStr + 'formfolder::' + folderId + "\n";

            if ( err ) {
                Y.log( `Problem following forms tree: ${err.stack||err}`, 'error', NAME );
                return depsStr;
            }

            if ( result[0].parentId && result[0].parentId === `${result[0]._id}` ) {
                //  sometimes observed in old data, MOJ-12837
                Y.log( `Form folder is own parent: ${result[0]._id}`, 'error', NAME );
                result[0].parentId = '';
            }

            if ( !result[0] || ( !result[0].parentId || '' === result[0].parentId ) ) {
                //  not found or root, we're done
                return depsStr;
            }

            // sanity
            if ( depsStr.length > 1000 ) {
                Y.log( `Circular folder structure ${depsStr}`, 'error', NAME );
                return depsStr;
            }

            //  recurse into parents
            return getFolderDependencies( user, result[0].parentId, depsStr );
        }

        /**
         *  Load an object from the database and return its cached list of dependencies, if any
         *
         *  (test use of bluebird)
         *
         *  @param  user        {Object}    REST user object or equivalent
         *  @param  collection  {String}    Name of model/collection
         *  @param  id          {String}    Database _id of a formtemplate or formtemplateversion object
         *  @param  callback    {Function}  Of the form fn(err, dependsOn)
         */

        function loadDependencies(user, collection, id, callback) {
            var
                runDb = Promise.promisify(Y.doccirrus.mongodb.runDb),
                dbSetup = {
                    'user': user,
                    'model': collection,
                    'action': 'get',
                    'query': {'_id': id + '' }
                };

            if ( !Y.doccirrus.comctl.isObjectId( id ) ) {
                Y.log( `Cannot load dependencies, not a valid ObjectId: ${id}`, 'warn', NAME );
                return callback( null, '' );
            }

            Y.log('Loading immediate dependencies of: ' + collection + '::' + id, 'debug', NAME);

            runDb(dbSetup)
                .then( onObjLoaded )
                .catch( onObjLoadErr );

            function onObjLoaded( data ) {
                //  form not found, nothing we can do
                if ( 0 === data.length ) { return callback(null, ''); }

                if ( !data[0].dependsOn ) { data[0].dependsOn = ''; }

                var
                    allDeps = [],
                    tempStr = listDirectDependencies( data[0] ) + "\n" + data[0].dependsOn,
                    lines = tempStr.split("\n"),
                    i;

                //Y.log('found dependencies of ' + collection + '::' + id + "\n" + data[0].dependsOn, 'debug', NAME);
                //Y.log('all direct dependencies of : ' + collection + '::' + id + "\n" + tempStr, 'debug', NAME);

                for ( i = 0; i < lines.length; i++ ) {
                    Y.log( 'Adding dependency: ' + lines[i], 'debug', NAME );
                    allDeps.push( lines[i] );
                }

                resolveFormNames( allDeps, onResolveDependencies );
            }

            function onResolveDependencies( err, cleanDeps ) {
                if ( err ) {
                    Y.log( `Could not resolve dependencies for form: ${err.stack||err}`, 'warn', NAME );
                } else {
                    cleanDeps = cleanDeps.filter( arrayDeduplicate );
                }
                callback( null, cleanDeps.join( "\n" ) );
            }

            function onObjLoadErr( err ) {
                Y.log( 'Could not load dependencies of ' + collection + '::' + id, 'warn', NAME );
                callback( err );
            }

        }

        /**
         *  Given an array of dependencies like: 'formtemplate::abcd', look up any form names which can be found in
         *  the set of dependencies.  Dependencies which can not be found will be discarded.
         *
         *  @param  dependencies    {Object}    Array of strings
         *  @param  callback        {Function}  Of the form fn( err, resolvedDependencies)
         */

        function resolveFormNames( dependencies, callback ) {
            var
                resolvedDependencies = [];

            async.eachSeries( dependencies, resolveSingle, onAllDone );

            function resolveSingle( depStr, itcb ) {
                var parts = depStr.split( '::' );

                if ( 2 !== parts.length ) {
                    //  wrong number of parts, not a valid reference
                    return itcb( null );
                }

                if ( true === Y.doccirrus.comctl.isObjectId( parts[1] ) ) {
                    //  this dependency refers to a valid ObjectId

                    //  TODO: check that the object exists in the database

                    resolvedDependencies.push( depStr );
                    return itcb( null );
                } else {
                    //  not an ObjectId, might be the name of a form

                    //  TODO: try find a form with this name

                    return itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Error resolving dependencies: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                callback( null, resolvedDependencies );
            }

        }

        /**
         *  List forms currently in export dir
         *
         *  Returned data is in the same format as used by forms tree
         *
         *  @param  user        {Object}    ac.rest.user or equivalent
         *  @param  callback    {Function}  Of the form fn(err, data)
         */

        function listExportDir( user, callback ) {

            var
                tenantDir,
                toList = [],
                expandedList = [];

            makeExportDir(user, onExportDirCreated);

            //  ensure that an export directory exists for this tenant, create if not
            function onExportDirCreated(err, useTenantDir) {
                if (err) {
                    callback('Could not initialize export dir: ' + err);
                    return;
                }
                tenantDir = useTenantDir;
                Y.doccirrus.media.listRecursive( tenantDir, '', onFilesListed );
            }

            //  add all form templates to a work queue, then expand each into listing format
            function onFilesListed(err, fileList) {

                if (err) {
                    callback( 'Could not read content of form export dir: ' + err);
                    return;
                }

                var
                    currentItem,
                    i;

                for (i = 0; i < fileList.length; i++) {
                    currentItem = fileList[i];
                    if (currentItem.isFile && ( 'json' === currentItem.ext )) {
                        if ('formtemplate' === currentItem.filename.split('_')[0]) {
                            toList.push(currentItem);
                        }
                    }
                }

                expandNext( null );
            }

            //  pop files off the queue until all have been listed
            function expandNext( err ) {

                if (err) {
                    callback('Could not list exported forms: ' + err);
                    return;
                }

                if (0 === toList.length) {
                    callback( null, expandedList);
                    return;
                }

                var nextItem = toList.pop();

                Y.log( 'Reading file: ' + nextItem.path + ' from path ' + tenantDir, 'info', NAME );

                Y.doccirrus.media.readFile(nextItem.path, tenantDir, onFileRead);

            }

            //  read a single form template from disk to get properties for tree / listing
            function onFileRead(err, rawJSONBuffer) {

                if (err) {
                    callback('Could not read form from disk: ' + err);
                    return;
                }

                var formObj;

                try {
                    formObj = JSON.parse(rawJSONBuffer.toString());
                } catch (parseErr) {
                    callback('Could not parse form on disk: ' + parseErr);
                    return;
                }

                if (!formObj.jsonTemplate) {
                    Y.log( 'Invalid form: ' + rawJSONBuffer.toString(), 'warn', NAME );
                    expandNext();
                    return;
                }
                //  TODO: additional checks here

                if (!formObj.jsonTemplate.name) {
                    formObj.jsonTemplate.name = { 'en': 'Untitled', 'de': 'Untitled' };
                }

                if (!formObj.version){ formObj.version = 1; }
                if (!formObj.revision){ formObj.revision = 0; }

                formObj.isSubform = false;

                if (formObj.jsonTemplate.hasOwnProperty('isSubform')) {
                    formObj.isSubform = formObj.jsonTemplate.isSubform;
                }

                if ('string' === typeof formObj.isSubform) {
                    formObj.isSubform = ('true' === formObj.isSubform.toLowerCase());
                }

                if ('string' === typeof formObj.isReadOnly) {
                    formObj.isReadOnly = ('true' === formObj.isReadOnly.toLowerCase());
                }

                if (!formObj.jsonTemplate.hasOwnProperty('defaultFor')) {
                    formObj.jsonTemplate.defaultFor = '';
                }

                expandedList.push({
                    '_id': formObj._id,
                    'formId': formObj._id || '',
                    'title': formObj.jsonTemplate.name,
                    'version': formObj.version,
                    'latestVersionId': formObj.latestVersionId || '',
                    'isSubform': formObj.isSubform || false,
                    'isReadOnly': formObj.isReadOnly || false,
                    'defaultFor': formObj.jsonTemplate.defaultFor,
                    'category': formObj.jsonTemplate.category,
                    'revision': formObj.revision
                });

                expandNext();
            }

        }

        /**
         *  Make a form export directory for single tenant only MOJ-1901
         *
         *  @param user
         *  @param callback
         */

        function makeExportDir(user, callback) {
            var
                tenantId = user.tenantId || '0',
                tenantDir = exportFormsDir + tenantId + '/';

            function onMkDir(err) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, tenantDir);
            }
            Y.doccirrus.media.mkdirIfMissing(tenantDir, onMkDir);
        }

        /**
         *  Shortcut method to dup all forms and versions to disk
         *
         *  This should be faster than dumping tem individually since dependancies between forms need not be found,
         *  only dependancies to media
         *
         *  @param  user
         *  @param  callback
         */

        function exportAllForms(user, callback) {
            var
                startTime,
                endTime,
                perfDebug = {},
                tenantDir,
                collectionName,
                mediaIds = [];

            Y.log('Exporting all forms and linked media.', 'debug', NAME);
            startTime = Date.now();
            makeExportDir(user, onExportDirCreated);

            function onExportDirCreated(err, useTenantDir) {
                if (err) {
                    callback('Could not create directory to export to: ' + err);
                    return;
                }

                tenantDir = useTenantDir;
                endTime = Date.now();
                perfDebug.config = (endTime - startTime);

                Y.log('Tenant directory: ' + tenantDir, 'info', NAME);

                startTime = Date.now();
                collectionName = 'formtemplateversion';
                getWholeCollection(collectionName, onFormVersionsLoaded);
            }

            function getWholeCollection(collectionName, onCollectionLoaded) {
                Y.log( 'Loading collection: ' + collectionName, 'info', NAME );
                Y.doccirrus.mongodb.runDb({
                    'user': user,
                    'action': 'get',
                    'model': collectionName,
                    'query': {},
                    'callback': onCollectionLoaded
                });
            }

            function onFormVersionsLoaded(err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                endTime = Date.now();
                perfDebug.deps = (endTime - startTime);

                raiseExportEvent({ 'status': 'startBatch', 'requested': 3 }, user);
                startTime = Date.now();
                saveWholeCollection(data, collectionName, onAllVersionsSaved);
            }

            function onAllVersionsSaved(err) {
                if (err) {
                    callback(err);
                    return;
                }

                endTime = Date.now();
                perfDebug.fs = (endTime - startTime);

                //  report to client that all versions are saved
                raiseExportEvent({ 'status': 'done', 'performance': perfDebug, 'double': true }, user);
                perfDebug.config = 0;

                startTime = Date.now();
                collectionName = 'formtemplate';
                getWholeCollection(collectionName, onFormTemplatesLoaded);
            }

            function onFormTemplatesLoaded(err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                endTime = Date.now();
                perfDebug.deps = (endTime - startTime);
                startTime = Date.now();
                saveWholeCollection(data, collectionName, onAllTemplatesSaved);
            }

            function onAllTemplatesSaved(err) {
                if (err) {
                    callback(err);
                    return;
                }

                endTime = Date.now();
                perfDebug.fs = (endTime - startTime);

                //  report to client that all versions are saved
                raiseExportEvent({ 'status': 'done', 'performance': perfDebug, 'double': true }, user);
                perfDebug.deps = 0;
                perfDebug.fs = 0;

                saveAllMedia(onAllMediaSaved);
            }

            function onAllMediaSaved(err) {
                if (err) {
                    callback(err);
                    return;
                }

                //  report to client that all versions are saved
                raiseExportEvent({ 'status': 'done', 'performance': perfDebug, 'double': true }, user);
                raiseExportEvent({ 'status': 'endBatch' }, user);

                callback(null);
            }

            function saveWholeCollection(data, collectionName, onAllSaved) {
                var
                    nextForm,
                    fileName,
                    plainJSON,
                    i = 0;

                Y.log('Saving ' + data.length + ' ' + collectionName + ' items to disk', 'debug', NAME);

                saveNext();

                function saveNext() {
                    if (i < data.length) {
                        nextForm = data[i];
                        fileName = tenantDir + collectionName + '_' + nextForm._id + '.json';
                        addMediaDeps(nextForm);

                        try {
                            plainJSON = JSON.stringify(nextForm, undefined, 2);
                        } catch (stringErr) {
                            Y.log('Could not serialize ' + collectionName + '::' + i, 'error', NAME);
                            callback(stringErr);
                            return;
                        }

                        i = i + 1;
                        Y.doccirrus.media.writeFile(fileName, tenantDir, plainJSON, onSavedForm);

                    } else {
                        onAllSaved(null);
                    }

                }

                function onSavedForm(err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    Y.log('Exported forms object: ' + fileName, 'debug', NAME);
                    saveNext();
                }
            }

            function addMediaDeps(formObj) {
                var
                    direct = listDirectDependencies(formObj),
                    lines = direct.split("\n"),
                    parts,
                    i;

                for (i = 0; i < lines.length; i++) {
                    parts = lines[i].split('::');
                    if ('media' === parts[0]) {
                        Y.log('Found referenced media, adding to export: ' + parts[1], 'debug', NAME);
                        mediaIds.push(parts[1]);
                    }
                }
            }

            function saveAllMedia(callbackMedia) {
                var
                    nextId,
                    fileName,
                    plainJSON;

                Y.log('Exporting forms media: ' + mediaIds.length + ' items.', 'debug', NAME);
                saveNextMedia();

                function saveNextMedia() {
                    if (0 === mediaIds.length) {
                        Y.log( 'Exported all media', 'info', NAME );
                        callbackMedia(null);
                        return;
                    }

                    startTime = Date.now();

                    nextId = mediaIds.pop();
                    Y.doccirrus.mongodb.runDb({
                        'user': user,
                        'action': 'get',
                        'model': 'media',
                        'query': { '_id' : nextId },
                        'callback': onMediaObjLoaded
                    });
                }

                function onMediaObjLoaded(err, data) {
                    if (err) {
                        callbackMedia(err);
                        return;
                    }

                    if (0 === data.length) {
                        Y.log('Could not export media::' + nextId + ' (not found)', 'warn', NAME);
                        saveNextMedia();
                        return;
                    }

                    endTime = Date.now();
                    perfDebug.deps = perfDebug.deps + (endTime - startTime);

                    startTime = Date.now();

                    try {
                        plainJSON = JSON.stringify(data[0], undefined, 2);
                    } catch (stringErr) {
                        Y.log('Could not serialize media::' + nextId, 'error', NAME);
                        callbackMedia(stringErr);
                        return;
                    }

                    fileName = tenantDir + 'media_' + nextId + '.json';
                    Y.log('Saving media object for forms: ' + fileName, 'debug', NAME);

                    Y.doccirrus.media.writeFile(fileName, tenantDir, plainJSON, onSavedMedia);
                }

                function onSavedMedia(err) {
                    if (err) {
                        Y.log('Could not write media to disk: ' + JSON.stringify(err), 'warn', NAME);
                    }

                    endTime = Date.now();
                    perfDebug.fs = perfDebug.fs + (endTime - startTime);

                    fileName = tenantDir + 'media_' + nextId + '.binary';

                    Y.log( 'Writing media from GridFS to form export: ' + fileName, 'debug', NAME );
                    Y.doccirrus.media.gridfs.exportFile( user, nextId, fileName, false, onFileWritten  );
                }

                function onFileWritten( err ) {
                    if (err) {
                        Y.log('Could not write media file to disk: ' + JSON.stringify( err ), 'warn', NAME);
                    }
                    saveNextMedia();
                }
            }
        }

        /**
         *  Make a hash representing form state, to find/prevent duplicate sequential history entries
         *
         *  @param formObj  {Object}    Formtemplate of version
         */

        function getVersionHash(formObj) {
            var
                jT = formObj.jsonTemplate || {},
                shasum = crypto.createHash('sha1'),
                jTstr;

            //  clear versions and revision, these are reset on import so should not affect hash
            jT.version = -1;
            jT.revision = -1;

            jTstr = JSON.stringify(jT);
            shasum.update(jTstr);
            return shasum.digest('hex');
        }

        /*
         *  Run in all cases
         */

        setFormDirs();

        /*
         *  Share this with the rest of mojito
         */

        Y.namespace( 'doccirrus.forms' ).exportutils = {
            'initialized': initialized,
            'runOnStart': initFormExportService,

            'raiseExportEvent': raiseExportEvent,       //  Socket IO event

            'exportAllForms': exportAllForms,           //  No deps checking, faster

            'exportForm': exportForm,                   //  copy to export dir
            'importForm': importForm,                   //  copy to import dir
            'makeExportDir': makeExportDir,             //  per tenant
            'clearExportDir': clearExportDir,
            'listExportDir': listExportDir,             //  list forms in export dir
            'getExportDir': getExportDir,               //  just return the configured location for the export dir
            'getVersionHash': getVersionHash,           //  used to prevent duplicate revisions

            'loadDependencies': loadDependencies,
            'loadSecondaryDependencies': loadSecondaryDependencies,
            'listDirectDependencies': listDirectDependencies,

            'getFolderDependencies': getFolderDependencies
        };

        /*
         *  Make sure that form import/export directories exist on server start
         */


    },
    '0.0.1',
    {
        requires: [ 'dc-comctl', 'dcmedia-store', 'dcforms-confighelper', 'dcforms-migrationhelper', 'dcforms-importutils' ]
    }
);