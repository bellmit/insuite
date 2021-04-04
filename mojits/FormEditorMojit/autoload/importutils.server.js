/**
 *  Utilities to load forms from disk into database
 *
 *  @author: strix
 *  @date: 2015 March
 */

/*jslint anon:true, nomen:true, latedef:false */
/*global YUI*/



YUI.add( 'dcforms-importutils', function( Y, NAME ) {

        const
        //  node modules
            fs = require( 'fs' ),
            util = require( 'util' ),
            shellexec = require( 'child_process' ).exec,
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            { formatPromiseResult } = require( 'dc-core' ).utils,

        //  objects which can be imported from disk
            allowDefaultTypes = ['formtemplate', 'formtemplateversion', 'media', 'formfolder'];

        let
        //  location from which forms are imported or exported from zip archive
        //  these are defaults which may be overridden in env.json
            baseDir = Y.doccirrus.auth.getTmpDir() + '/',
            exportFormsDir = baseDir + 'formsexport/',
            defaultFormsDir = baseDir + 'formsdefault/',
            revocationList = 'revoke_list.json',        //  in defaultFormsDir

        //  set to true if this component starts up without error
            initOk = false;

        // helper, credit: http://stackoverflow.com/questions/1960473/unique-values-in-an-array
        function arrayDeduplicate(value, index, self) {
            if ('' === value || true === value || 'true' === value) { return false; }
            if ( -1 !== value.indexOf( '.form' ) ) { return false; }
            return self.indexOf(value) === index;
        }

        /**
         *  Called when the server starts
         */

        function init() {
            var cluster = require('cluster');
            var outstanding = 2;

            setFormDirs();

            if( cluster.isMaster) {
                Y.doccirrus.media.mkdirIfMissing( exportFormsDir, decOutstanding );
                if( (Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD() || Y.doccirrus.auth.isMTSAppliance()) && !Y.doccirrus.auth.isDCPRC() /* || Y.doccirrus.auth.isVPRC() */ ) {
                    if( !Y.doccirrus.fileutils.isDirectorySync( defaultFormsDir ) ) {
                        console.error( 'Error in Config env.json:' + defaultFormsDir + ' is not a directory' ); //  eslint-disable-line no-console
                        process.exit( 44 );
                    }
                } else {
                    Y.log( 'Default Forms Dir setup ignored', 'warn', NAME );
                    initOk = true;
                }
            } else {
                initOk = true;
            }

            function decOutstanding( err ) {
                if( err ) {
                    Y.log( 'Error initializing form IO: ' + err, 'error', NAME );
                    return;
                }
                outstanding = outstanding - 1;
                initOk = (0 === outstanding);
            }
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

                //  add base dir if relative to current working directory
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

            Y.log( 'Form export directory: ' + exportFormsDir, 'info', NAME );
            Y.log( 'Default form directory: ' + defaultFormsDir, 'info', NAME );
        }

        function initialized() {
            return initOk;
        }

        /**
         *  Store a POSTed file in the import directory, extract tar.gz, check contents
         *
         *  NOTE: this requires the 'file' external utilitiy to be configured in MediaMojit
         *
         *  Expect mime type for tgz files is "application/x-gzip"
         *
         *  REVIEWME: this should be reviewed for potential security risks
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  uploadObj   {Object}    ac / Express file upload object
         *  @param  newId       {String}    temp filename
         *  @param  callback    (Function}  Of the form fn(err)
         */

        function handleArchiveUpload( user, uploadObj, newId, callback, cleanExportDirFn = clearExportDir ) {

            var
                originalMime,
                tenantDir,
                archiveFile;

            //  clear the export directory
            cleanExportDirFn( user, onCleanDirectory );

            //  then make sure that this is a tgz file
            function onCleanDirectory(err, useTenantDir) {
                if (err) {
                    callback('Could not clear export directory to allow upload: ' + err);
                    return;
                }

                //  validation of upload here
                tenantDir = useTenantDir;
                archiveFile = tenantDir + newId + '.' + ( 'zip' === uploadObj.extension ? 'zip' : 'tar.gz');
                Y.log( 'Checking type of uploaded file: ' + uploadObj.path, 'debug', NAME );
                Y.doccirrus.media.getFileMimeType(uploadObj.path, onGetFileType);
            }

            //  once we have the type, check it and copy archive into export directory
            function onGetFileType(err, mimeType) {
                if (err) {
                    callback('Could not identify uploaded file type: ' + err);
                    return;
                }

                originalMime = mimeType;

                if (
                    ('application/x-gzip' !== mimeType) &&
                    ('application/gzip' !== mimeType) &&
                    ('application/x-tar' !== mimeType) &&
                    ('application/zip' !== mimeType)
                ) {
                    callback('Could not extract forms, please upload a tar.gz file, uploaded file was ' + mimeType);
                    return;
                }

                if ('application/x-tar' === mimeType) {
                    archiveFile = tenantDir + newId + '.tar';
                }

                //Y.log('Details of uploaded file: ' + JSON.stringify(uploadObj), 'info', NAME);

                var shellCmd = 'cp "' + uploadObj.path + '" "' +  archiveFile + '"';

                Y.log('Copying uploaded file to: ' + archiveFile, 'info', NAME);
                Y.log('Shell cmd: ' + shellCmd, 'info', NAME);
                shellexec( shellCmd, onArchiveCopied );
            }

            //  once in the export directory, extract it with tar at the shell

            async function onArchiveCopied( err, stdout, stderr ) {
                if( err || stderr ) {
                    callback( 'Could not copy uploaded forms archive - err:' + err + ' stderr: ' + stderr );
                    return;
                }

                Y.log( 'Copied archive to export dir, STDOUT:' + stdout, 'debug', NAME );

                //  if not zipped then we can skip the next step
                if( 'application/x-tar' === originalMime ) {
                    onArchiveUnzipped( null, '', '', true );
                    return;
                }

                let
                    shellArgs = [],
                    shellCmd,
                    bin;

                if( 'application/zip' === originalMime ) {
                    bin = 'unzip';
                    shellArgs = [
                        '-p',
                        `"${newId}.zip"`,
                        '>',
                        `${newId}.tar`
                    ];
                } else {
                    bin = 'gunzip';
                    shellArgs = [
                        `"${newId}.tar.gz"`
                    ];
                }

                [err, shellCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: bin,
                        shellArgs: shellArgs
                    } )
                );
                
                if( err ) {
                    return callback( err );
                }

                Y.log( 'Exec: ' + shellCmd, 'debug', NAME );
                shellexec( shellCmd, {'cwd': tenantDir}, onArchiveUnzipped );
            }

            function onGetFileTypeGzip(err, mimeType) {
                if( err ) {
                    callback( 'Could not identify uploaded file type: ' + err );
                    return;
                }

                originalMime = mimeType;
                if( 'application/gzip' === mimeType ) {
                    //double zipped found
                    let shellCmd = 'mv "' + archiveFile + '" "' + archiveFile + '.gz' + '"';
                    archiveFile += '.gz';
                    Y.log( 'Renaming back to zip: ' + archiveFile, 'info', NAME) ;
                    Y.log( 'Shell cmd: ' + shellCmd, 'debug', NAME );
                    shellexec( shellCmd, onArchiveCopied );
                } else {
                    //tar here
                    onArchiveUnzipped( null, '', '', true );
                }

            }

            async function onArchiveUnzipped( err, stdout, stderr, tar ) {
                if( err ) {
                    cleanupAndFail( newId + '.tar.gz', 'Could not gunzip uploaded forms archive - err:' + err + ' stderr: ' + stderr );
                    return;
                }

                if( stderr && '' !== stderr ) {
                    Y.log( 'Unzip operation STDERR: ' + stderr, 'warn', NAME );
                }

                Y.log( 'Copied archive to export dir, STDOUT:' + stdout, 'debug', NAME );

                //in case of double zip check mime type again
                if( !tar ) {
                    archiveFile = tenantDir + newId + '.tar';
                    return Y.doccirrus.media.getFileMimeType( archiveFile, onGetFileTypeGzip );
                }

                let shellCmd;
                [err, shellCmd] = await formatPromiseResult(
                    Y.doccirrus.binutilsapi.constructShellCommand( {
                        bin: 'tar',
                        shellArgs: [
                            '-xf',
                            `"${newId}.tar"`
                        ]
                    } )
                );

                if( err ) {
                    return callback( err );
                }

                Y.log( 'Running tar in ' + tenantDir + ': ' + shellCmd, 'info', NAME );

                shellexec( shellCmd, {'cwd': tenantDir}, onArchiveExtracted );
            }

            //  once we have extracted the files, remove the original archive
            //  TODO: additional security checks here

            function onArchiveExtracted(err, stdout, stderr) {
                if (err) {
                    cleanupAndFail(newId + '.tar', 'Could not extract uploaded forms archive - err:' + err + ' stderr: ' + stderr);
                    return;
                }

                if (stderr && '' !== stderr) {
                    Y.log( 'Tar archive extract operation STDERR: ' + stderr, 'warn', NAME );
                }

                Y.log( 'Extracted archive to export dir, STDOUT:' + stdout, 'debug', NAME );


                //  add read permissions for clamdscan
                var shellCmd = `chmod -R +r "${tenantDir}"`;
                shellexec( shellCmd, { 'cwd': tenantDir }, onPermissionsChanged);
            }

            function onPermissionsChanged( err, stdout, stderr ) {
                if (err) {
                    cleanupAndFail(newId + '.tar', 'Could not add read permission - err:' + err + ' stderr: ' + stderr);
                    return;
                }

                Y.log( 'Changed permissions of extracted files, STDOUT:' + stdout, 'debug', NAME );

                fs.unlink(tenantDir + newId + '.tar', onArchiveRemoved);
            }

            function onArchiveRemoved(err /*, stdout, stderr */) {
                if (err) {
                    callback( 'Could not clear uploaded archive after extracting - err: ' + err /* + ' stderr: ' + stderr */ );
                    return;
                }

                Y.log('Removed archive as uploaded by user: ' + archiveFile, 'info', NAME);
                callback(null);
            }

            function cleanupAndFail(fileName, msg) {
                fs.unlink(tenantDir + fileName, onCleanup);

                function onCleanup() {
                    callback(msg);
                }
            }

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

        /**
         *  Import a form from the import directory
         *
         *  @param  user                {Object}    ac REST user or equivalent
         *  @param  params              {Object}
         *  @param  params.modelName    {Object}    Type of object to start from
         *  @param  params.id           {String}    Should match a form available in the import directory
         *  @param  callback            {Function}  Of the form (err, _id);
         */

        function importForm(user, params, callback) {
            Y.log('Attempting to import form from disk: ' + params.modelName + ' ' + params.id, 'info', NAME);

            let
                tenantDir,
                nextItem,
                toImport = [],
                importOK = [],
                importFail = [],
                modelName = params.modelName || 'formtemplate',
                id = params.id;

            toImport.push({ 'type': modelName, '_id': id });

            Y.log('Checking that export directory exists...', 'debug', NAME);
            makeExportDir(user, onExportDirLoaded);

            function onExportDirLoaded(err, useTenantDir) {
                if (err) {
                    callback('Could not find / access directory to import from: ' + err);
                    return;
                }

                Y.log('Forms export directory is: ' + useTenantDir, 'debug', NAME);
                tenantDir = useTenantDir;
                importNext();
            }

            function onVersionMigrated(err) {
                callback( err, importOK, importFail );
            }

            function importNext() {

                if (0 === toImport.length) {
                    //  form and all dependencies imported
                    Y.doccirrus.forms.migrationhelper.checkOrAddAllFormatVersions(user, onVersionMigrated);
                    return;
                }

                nextItem = toImport.pop();
                nextItem.fileName = tenantDir + nextItem.type + '_' + nextItem._id + '.json';

                //  prevent infinite recursion if there are circular references anywhere
                if ((true === inDepsList(importOK, nextItem)) || (true === inDepsList(importFail, nextItem))) {
                    if ( 'media' !== nextItem.type ) {
                        Y.log('Skipping duplicate item: ' + JSON.stringify(nextItem), 'info', NAME);
                        importNext();
                        return;
                    }
                }

                Y.log('Handling next import task: ' + JSON.stringify(nextItem), 'debug', NAME);
                Y.doccirrus.media.readFile(nextItem.fileName, tenantDir, onFileRead);
            }

            async function onFileRead(err, rawJSONBuffer) {

                if (err) {

                    Y.log('Could not read file from disk: ' + nextItem.fileName, 'warn', NAME);

                    //  prevent crash on importing some embedded forms such as headers / footers
                    //  if they have been improperly exported
                    if ('formtemplateversion' === nextItem.type) {
                        Y.log('Imported form is missing latest version', 'warn', NAME);
                        importNext();
                        return;
                    }

                    //  Form is missing an image, instead of crashing, will import whatever remains
                    //  (media may have been deleted before export in originating instance)
                    if ('media' === nextItem.type) {
                        Y.log('Imported form is missing an embedded image', 'warn', NAME);
                        importNext();
                        return;
                    }

                    //  Form is missing a folder, instead of crashing, will import whatever remains
                    //  (migration issue)
                    if ('formfolder' === nextItem.type) {
                        Y.log('Imported form is missing a folder', 'warn', NAME);
                        importNext();
                        return;
                    }

                    callback('Could not read form from disk: ' + err);
                    return;
                }

                var
                    foundDeps,
                    dbObj,
                    i;

                try {
                    dbObj = JSON.parse(rawJSONBuffer.toString());
                } catch (parseErr) {
                    Y.log('Could not parse object from disk: ' + nextItem.fileName, 'warn', NAME);
                    callback('Could not parse object from disk: ' + nextItem.fileName);
                    return;
                }

                if ('formtemplate' === nextItem.type || 'formtemplateversion' === nextItem.type) {

                    if (!dbObj.hasOwnProperty('isReadOnly')) {
                        //  previously exported forms may not have this property
                        dbObj.isReadOnly = false;
                    }

                    //  migration for nested form folders, may be needed for old uploaded forms
                    checkFormFolderId( dbObj );

                    //  import nested form folders for this from disk
                    if ( dbObj.formFolderId ) {
                        [ err ] = await formatPromiseResult( importAllParentFolders( user, dbObj.formFolderId, [] ) );
                        if ( err ) {
                            Y.log( `Could not import all folders: ${err.stack||err}`, 'warn', NAME );
                            // continue, best effort, form will land in 'recovered' folder
                        }
                    }

                    //  get this form's dependencies
                    foundDeps = listDependenciesInFormObj(dbObj);

                    Y.log('Found additional dependencies to be imported: ' + JSON.stringify(foundDeps, undefined, 2), 'info', NAME);

                    for (i = 0; i < foundDeps.length; i++) {
                        //  TODO: recurse into subforms
                        if (('subform' !== foundDeps[i].type) && (false === inDepsList(toImport, foundDeps[i]))) {
                            //Y.log('Adding dependancy to form template: ' + JSON.stringify(foundDeps[i]), 'info', NAME);

                            if (foundDeps._id !== id) {
                                toImport.push(foundDeps[i]);
                            }

                        }
                    }
                }

                if ('subform' === nextItem.type) {
                    //  skip this for now
                    //TODO: general subform import
                    importNext();
                    return;
                }

                if (nextItem.type === 'formfolder') {
                    //prevent updating licence field
                    delete  dbObj.licence;
                }

                Y.log('Saving disk object to database: ' + nextItem.type + '::' + nextItem._id, 'debug', NAME);
                saveToDb(user, nextItem.type, nextItem._id, dbObj, onSavedToDB);
            }

            function onSavedToDB(err, newId) {
                delete nextItem.fileName;

                if (err) {
                    Y.log('Could not save object ' + nextItem.type + ' ' + nextItem._id + ': ' + err, 'warn', NAME);
                    importFail.push(nextItem);
                } else {
                    Y.log('Saved object ' + nextItem.type + ' ' + nextItem._id + ' as ' + (newId || id ), 'info', NAME);
                    importOK.push(nextItem);
                }

                //  The form being imported may be from an older version of the FormEditorMojit, and may require
                //  migration to work with the current version.

                Y.doccirrus.forms.migrationhelper.checkOrAddFormFormatVersion(user, nextItem.type, nextItem._id, onFormatChecked);

            }

            function onFormatChecked(err) {
                if (err) {
                    Y.log('Could not update imported form to latest format version.', 'warn', NAME);
                    callback(err);
                    return;
                }

                importNext();
            }

        }

        /**
         *  Recursively import all parent form folders
         *
         *  @param  {String}    formFolderId    Next parent folder to import
         *  @param  {Object}    imported        Array of _ids of imported folders, safety against circular references
         *  @return {Promise<void>}
         */

        async function importAllParentFolders( user, formFolderId, imported ) {
            const
                readFileP = util.promisify( fs.readFile ),
                saveToDbP = util.promisify( saveToDb ),

                tenantId = user.tenantId || '0',
                tenantDir = `${exportFormsDir}${tenantId}/`,
                fileName = `${tenantDir}formfolder_${formFolderId}.json`;

            let jsonStr, dbObj, err;

            //  check that we have not imported this already
            if ( -1 !== imported.indexOf( formFolderId ) ) {
                throw Error( `Circular references in parent folder structure, aborting: ${formFolderId}`);
            }

            //  read the json file from disk
            [ err, jsonStr ] = await formatPromiseResult( readFileP( fileName ) );
            if ( err ) {
                Y.log( `Could not read form folder file ${fileName}: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            //  parse the JSON
            try {
                dbObj = JSON.parse( jsonStr );
            } catch ( parseErr ) {
                Y.log( `Could not parse form folder file ${fileName}: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            //prevent updating licence field
            delete dbObj.licence;

            //  save or update in database
            [ err ] = await formatPromiseResult( saveToDbP( user, 'formfolder', formFolderId, dbObj ) );
            if ( err ) {
                Y.log( `Could not save form folder from file ${fileName}: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            //  continue with parent, if one exists
            imported.push( formFolderId );
            if ( dbObj.parentId && '' !== dbObj.parentId ) {
                return importAllParentFolders( user, dbObj.parentId, imported );
            }
        }

        /**
         *  Save something loaded form disk into the database
         *
         *  First try to load any existing object, the exact action taken will depend on object type and whether it
         *  exists in this database already.  New objects are posted as-is, but if in conflict with existing object:
         *
         *      formtemplates:
         *          current form template is saved as a new version
         *          current form template is overwritten by version from disk
         *
         *      formtemplateversions:
         *          if this literal, exact version has already been imported then there is no need to duplicate it
         *          otherwise added to top of revision history and version numbering is updated (pending)
         *
         *  @param  user        {String}    ac REST user or equivalent
         *  @param  saveModel   {String}    Type of object / collection to be saved to
         *  @param  saveId      {String}    database _id of source object
         *  @param  saveObj     {String}    plain javascript object
         *  @param  callback    {Function}  of the form fn(err, newId)
         */

        function saveToDb(user, saveModel, saveId, saveObj, callback) {

            var extant;         //  is set to true if a version of this object already exists

            //  first check if this exists in database
            Y.doccirrus.mongodb.runDb({
                'user': user,
                'model': saveModel,
                'query': { '_id': saveId },
                'action': 'get',
                'callback': onExtantCheck
            });

            function onExtantCheck(err, data) {
                if (err) {
                    Y.log( `Could not query existing collection for imported object: ${err.stack||err}`, 'warn', NAME);
                    callback(err);
                    return;
                }

                extant = (0 !== data.length);

                switch(saveModel) {
                    case 'formtemplate':
                        //  replace any canonical template and add to history
                        importCanonicalTemplate(user, saveModel, saveId, saveObj, extant, callback);
                        break;

                    case 'formtemplateversion':
                        if (true === extant) {
                            //  do not repeat import of versions that already exist, we're done with this one
                            Y.log( `Skipping import of form template version, already present: ${saveId}`, 'debug', NAME);
                            callback(null, saveId);
                            return;
                        }

                        importTemplateVersion(user, saveModel, saveId, saveObj, extant, callback);
                        break;

                    case 'media':
                        //  add to database as simple object, then run 2.17 migration in case of older format
                        importWholeObject(user, saveModel, saveId, saveObj, extant, onMediaSaved );
                        break;

                    case 'formfolder':
                        //  add to database as simple object
                        importWholeObject(user, saveModel, saveId, saveObj, extant, callback );
                        break;

                    default:
                        //  security - don't allow import of anything other than form templates and their media
                        //  prevent hostile import of, eg, new admin user accounts
                        Y.log( `SECURITY WARNING! Unrecognized form import type: ${saveModel}`, 'warn', NAME );
                        return callback( Y.doccirrus.errors.rest( 500, `Unrecognized form import type: ${saveModel}`, true ) );

                }

                function onMediaSaved( err, result ) {
                    if ( err ) {
                        Y.log( 'Error on importing media, not migrating this item: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    }

                    function onMediaMigrated( err, strReport ) {
                        if ( err ) {
                            Y.log( 'Error migrating imported media: ' + JSON.stringify( err ), 'debug', NAME );
                            return callback( err );
                        }
                        Y.log( 'Migrated single media item, report: ' + strReport, 'debug', NAME );
                        callback( null, result );
                    }

                    Y.log('Moving image file to GridFS: ' + saveId, 'debug', NAME);

                    Y.doccirrus.media.migrationhelper.moveToGridFs(
                        user,                                           //  user
                        { '_id': saveId + '' },                         //  query
                        false,                                          //  inMigration
                        onMediaMigrated                                 //  callback
                    );
                }
            }

        }  // end saveToDb

        /**
         *  Save something to the database without any further changes
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  modelName   {String}    Name of a db collection
         *  @param  id          {String}    Database _id of this object
         *  @param  obj         {Object}    Userialized from file
         *  @param  extant      {Boolean}   True if an object with this _id already exists in this collection
         *  @param  callback    {Function}  Of the form fn(err)
         */

        function importWholeObject(user, modelName, id, obj, extant, callback) {

            Y.log('Importing object whole, without modification: ' + modelName + '::' + id, 'debug', NAME);

            var k, importedId;

            if (extant) {
                obj.fields_ = [];
                for (k in obj) {
                    if (obj.hasOwnProperty(k)) {
                        if ('_id' !== k) {
                            obj.fields_.push(k);
                        }
                    }
                }
            }

            Y.doccirrus.filters.cleanDbObject(obj);
            Y.doccirrus.mongodb.runDb({
                'user': user,
                'model': modelName,
                'query': { '_id': id },
                'data': obj,
                'action': (extant ? 'put' : 'post'),
                'callback': onWholeImport
            });

            function onWholeImport(err, newIds) {
                if (err) { return callback(err); }
                importedId = newIds[0];

                //  only media objects have binary files to be imported
                if ('media' !== modelName ) {
                    Y.log( 'Imported object with new id: ' + importedId, 'debug', NAME );
                    return callback(null, importedId);
                }

                //  Migrate this media object if exported from an older version
                if ( obj.source && obj.source !== '' && !obj.gridfs ) {

                    Y.log( 'Migrating media object: ' + obj._id, 'warn', NAME );

                    Y.doccirrus.media.migrationhelper.moveToGridFs( user, { _id: obj._id }, false, onGridFSImport );
                    return;
                }

                //  Load media binary directly into gridfs
                var
                    tenantId = user.tenantId || '0',
                    tenantDir = exportFormsDir + tenantId + '/',
                    fileName;

                fileName = tenantDir + 'media_' + id + '.binary';

                fs.stat( fileName, onStatBinFile );

                function onStatBinFile( err, stats ) {
                    if ( err ) {
                        Y.log( 'No binary file to import from tenant directory.', 'debug', NAME );
                        onGridFSImport( null );
                        return;
                    }

                    Y.doccirrus.media.virusScan( user, fileName, onVirusScanComplete );

                    function onVirusScanComplete( err ) {
                        if ( err ) {
                            Y.log( `Imported media for forms does not pass malware scan: ${fileName}`, 'error', NAME );
                            Y.log( `clamdscan output follows:\n ${err.stack||err}`, 'error', NAME );
                            return callback( err );
                        }

                        Y.log( 'Importing forms media into GridFS: ' + fileName + ' ' + JSON.stringify( stats ), 'debug', NAME );
                        Y.doccirrus.media.gridfs.importFile( user, id, fileName, false, onGridFSImport );
                    }
                }

            }

            function onGridFSImport( err ) {
                if (err) {
                    Y.log( 'Error adding media file to GridFS: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback(err);
                }
                callback( null, importedId );
            }

        }  // end importWholeObject

        /**
         *  Place imported template version on the top of the history stack
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  modelName   {String}    always 'formtemplateversion'
         *  @param  id          {String}    Database _id of this object
         *  @param  obj         {Object}    Userialized from file
         *  @param  extant      {Boolean}   Should always be false for this type (versions should be immutable)
         *  @param  callback    {Function}  Of the form fn(err)
         */

        function importTemplateVersion(user, modelName, id, obj, extant, callback) {

            function onHistoryLoaded(err, history) {

                if (err) {
                    Y.log('Could not look up form history: ' + JSON.stringify(err), 'warn', NAME);
                    callback(err);
                    return;
                }

                obj.version = history.length;

                //  save it to database  - user, modelName, id, obj, callback
                importWholeObject(user, modelName, id, obj, extant, onVersionSaved);
            }

            function onVersionSaved(err, newVersionId) {
                if (err) {
                    Y.log('Could not save new template version to database: ' + JSON.stringify(err), 'warn', NAME  );
                    callback(err);
                    return;
                }

                //  we have added a new version to the top of the history stack, if there is a canonical template
                //  then we must increase its version number
                Y.log('Inserted new version ' + newVersionId + ' into history, updating canonical version number.', 'debug', NAME);

                //  calling this a second time will cause latest version number and _id to be added to any canonical form
                Y.doccirrus.forms.historyutils.listVersionsAndCorrect(user, obj.canonicalId, onTemplateUpdated);
            }

            function onTemplateUpdated(err) {
                callback(err);
            }

            //  load history for canonical form and correct is present
            Y.doccirrus.forms.historyutils.listVersionsAndCorrect(user, obj.canonicalId, onHistoryLoaded);
        }

        /*
         *  Save a canonical template to database
         *
         *  Process:
         *
         *      (*) back up any existing form template to the history
         *      (*) overwrite any existing form template / save a new one
         *      (*) add the new/updated for template to history as current latest version
         *      (*) fix any references and version numbering issues
         *      (*) assign any role claimed by the form
         *
         *  @param  user        {Object}    REST user or equivalent
         *  @param  modelName   {String}    Should always be 'formtemplate'
         *  @param  id          {String}    Database _id of form template
         *  @param  obj         {Object}    From disk, should match formtemplate schema
         *  @param  isExtant    {Boolean}   True if a form with this _id already exists in db
         *  @param  callback    {Function}  Of the form fn(err)
         */

        function importCanonicalTemplate(user, modelName, id, obj, isExtant, callback) {

            if (isExtant) {
                //  save a copy of the current canonical form before overwriting it with obj
                Y.doccirrus.forms.historyutils.addVersionById(user, id, 'gespeichert vor dem Import', onExtantBackedUp);
            } else {
                onExtantBackedUp(null, null);
            }

            function onExtantBackedUp(err, newIds) {
                if (err) {
                    callback(err);
                    return;
                }

                if (isExtant) {
                    Y.log('Current version of form template backed up in form history: ' + JSON.stringify(newIds), 'debug', NAME);
                } else {
                    Y.log('No existing form template to be backed up up in form history, starting new history for this form.', 'debug', NAME);
                }

                importWholeObject(user, modelName, id, obj, isExtant, onCanonicalUpdated);
            }

            function onCanonicalUpdated(err) {

                if (err) {
                    callback(err);
                    return;
                }

                //  Once the new canonical template has been imported, push a copy of it to the top of the history
                //  stack as a new version so that it can be used by activities
                Y.doccirrus.forms.historyutils.addVersionById(user, id, 'importiert', onNewTemplateAddedToHistory);
            }

            function onNewTemplateAddedToHistory(err, newIds) {
                if (err) {
                    callback(err);
                    return;
                }

                Y.log('Imported canonical template added to form history: ' + JSON.stringify(newIds), 'debug', NAME);

                //  After updating the canonical object, check the history
                //  this will reset the version number and latestVersionId on the new canonical template
                Y.doccirrus.forms.historyutils.listVersionsAndCorrect(user, id, onHistoryChecked);
            }

            function onHistoryChecked(err) {

                if (err) {
                    callback(err);
                    return;
                }

                //  if there is a role this form claims then assign it
                if (obj.jsonTemplate && obj.jsonTemplate.defaultFor) {
                    Y.log('Updating for role assignments for new form: ' + obj.jsonTemplate.defaultFor, 'debug', NAME);
                    Y.doccirrus.formsconfig.notifyConfigChange(
                        user,
                        obj.jsonTemplate.defaultFor,
                        id,
                        onRoleAssigned
                    );
                    return;
                }

                callback(null);
            }

            function onRoleAssigned(err) {
                callback(err);
            }

        } // end importCanonicalTemplate

        /**
         *  List dependencies in a form object, whether read from db or disk
         *
         *  @param  templateObj     {Object}    From disk, should match formtemplate or formtemplateversion schema
         *  @return                 {Array}     Set of references to objects needed by this one, [{ type, id }]
         */

        function listDependenciesInFormObj(templateObj) {
            var
                direct = Y.doccirrus.forms.exportutils.listDirectDependencies(templateObj),
                recorded = templateObj.dependsOn || '',
                allDeps = direct + "\n" + recorded,
                lines = allDeps.split("\n"),
                dependsOn = [],
                newItem,
                parts,
                i;

            lines = lines.filter(arrayDeduplicate);

            for (i = 0; i < lines.length; i++) {
                parts = lines[i].split('::');
                if (2 === parts.length) {

                    //  handle a bug in previous version of form export which could inject 'true' into deps string
                    parts[0] = parts[0].replace('trueformtemplate', 'formtemplate');

                    newItem = { 'type': parts[0], '_id': parts[1] };
                    //console.log('Check dependency: ' + JSON.stringify( newItem ));
                    if (false === inDepsList(dependsOn, newItem) && -1 === newItem._id.indexOf( '.form' ) ) {
                        //console.log('Add dependency: ' + JSON.stringify( newItem ));
                        dependsOn.push(newItem);
                    }
                }
            }

            return dependsOn;
        }

        /**
         *  Check if an item is in the given dependancy list
         *  @param depsList     {object}    Array of dependancy objects
         *  @param item         {object}    Single dependancy object
         *  @return             {boolean}
         */

        function inDepsList(depsList, item) {
            var i;
            for (i = 0; i < depsList.length; i++) {
                if (depsList[i].type === item.type && depsList[i]._id === item._id) {
                    return true;
                }
            }
            return false;
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

                Y.log('Reading file: ' + nextItem.path + ' from path ' + tenantDir, 'info', NAME );

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
                    callback('Could not parse form on disk: ' + err);
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

                //if (formObj.hasOwnProperty('isReadOnly')) {
                //    formObj.isReadOnly = formObj.isReadOnly;
                //}

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

            tenantDir = tenantDir.replace('//', '/0/');

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
         *  Check the set of default forms for any new items which should be imported
         *
         *  This should run at startup on the master instance.
         *
         *  @param  user        {Object}    For database access, equivalent to REST user
         *  @param  callback    {Function}  Of the form fn(err, report)
         */

        function importDefaultForms(user, callback) {

            var
                report = '',
                formRoles,
                nextModel,
                filename,
                nextId,
                toCheck = [],
                adminWithHashes = new ObjectId( Y.doccirrus.schemas.admin.getDefaultFormId() );

            Y.log('Importing default forms for tenant: ' + user.tenantId, 'debug', NAME);
            report = report + '\nImporting default forms for tenant: ' + user.tenantId + "\n\n";

            Y.doccirrus.formsconfig.getConfig(user, onRolesLoaded);

            function onRolesLoaded(err, assignments) {
                if (err) {
                    Y.log('Could not load form role assignments.', 'warn', NAME);
                    callback(err, report);
                    return;
                }

                report = report + "Form roles at outset: " + JSON.stringify(assignments, undefined, 2) + "\n\n";

                formRoles = assignments;
                makeExportDir(user, onExportDirCreated);
            }

            //  ensure that an export directory exists for this tenant, create if not
            function onExportDirCreated(err) {
                if (err) {
                    callback('Could not initialize export dir: ' + err, report);
                    return;
                }
                Y.log('Default forms directory: ' + defaultFormsDir, 'debug', NAME);
                report = report + 'Default forms directory: ' + defaultFormsDir + "\n\n";
                Y.doccirrus.media.listRecursive( defaultFormsDir, '', onFilesListed );
            }

            //  add all form templates to a work queue, then expand each into listing format
            function onFilesListed(err, fileList) {

                if (err) {
                    callback( 'Could not read content of form export dir: ' + err, report);
                    return;
                }

                var
                    currentItem,
                    i;

                for (i = 0; i < fileList.length; i++) {
                    currentItem = fileList[i];
                    if (currentItem.isFile && ( 'json' === currentItem.ext )) {
                        if (-1 !== allowDefaultTypes.indexOf(currentItem.filename.split('_')[0])) {
                            toCheck.push(currentItem);
                        }
                    }
                }

                Y.log('Listed files in default forms directory: ' + JSON.stringify(toCheck) + 'tenant ' + user.tenantId, 'debug', NAME);
                report = report + 'Listed files in default forms directory: ' + JSON.stringify(toCheck) + "\n\n";

                checkNext( null );
            }

            //  pop files off the queue until all have been listed
            function checkNext( err ) {

                if (err) {
                    callback('Could not list exported forms: ' + err, report);
                    return;
                }

                if (0 === toCheck.length) {
                    //  all done
                    Y.log( 'Finished importing default forms on tenant: ' + user.tenantId, 'info', NAME );
                    callback(null, report);
                    return;
                }

                var
                    nextItem = toCheck.pop(),
                    parts = nextItem.filename.replace('.json', '').split('_');

                nextModel = parts[0];
                nextId = parts[1];
                filename = nextItem.filename;

                Y.log('Checking next file: ' + nextItem.filename + ' (model: ' + nextModel + ' _id: ' + nextId + ')', 'info', NAME);
                report = report + 'Checking next file: ' + nextItem.filename + ' (model: ' + nextModel + ' _id: ' + nextId + ')' + "\n";

                //  only allow import of form templates, form versions and media items (security)

                if (nextItem.isDirectory || -1 === allowDefaultTypes.indexOf(nextModel)) {
                    Y.log('Skipping import, not a form object: ' + nextItem.path, 'warn', NAME);
                    report = report + 'Skipping import, not a form object: ' + nextItem.path + "\n";
                    checkNext();
                    return;
                }

                //  Y.log('Reading file from disk: ' + defaultFormsDir + nextItem.path, 'debug', NAME);

                Y.doccirrus.media.readFileWithHash(nextItem.path, defaultFormsDir, onFileRead);
            }

            //  read a single form template from disk to get properties for tree / listing
            function onFileRead(err, rawJSONBuffer, hash) {

                if (err) {
                    callback('Could not read form from disk: ' + err, report);
                    return;
                }

                let
                    formObj, role, checkRole = '',
                    hasRoleSelf, hasRoleParent, isUnclaimed;

                try {
                    Y.log('Parsing imported object: ' + rawJSONBuffer.length + 'bytes', 'info', NAME);
                    report = report +  'Parsing imported object: ' + rawJSONBuffer.length + 'bytes' + "\n\n";
                    formObj = JSON.parse(rawJSONBuffer.toString());
                } catch (parseErr) {
                    callback('Could not parse form on disk: ' + err, report);
                    return;
                }

                //Y.log('Loaded object: ' + JSON.stringify(formObj), 'debug', NAME);

                if (formObj.jsonTemplate) {

                    if (!formObj.jsonTemplate.name) {
                        formObj.jsonTemplate.name = {'en': 'Untitled', 'de': 'Untitled'};
                    }

                    if (!formObj.version) {
                        formObj.version = 1;
                    }
                    if (!formObj.revision) {
                        formObj.revision = 0;
                    }

                    if (!formObj.hasOwnProperty('isSubform')) {
                        formObj.isSubform = false;
                    }

                    formObj.isReadOnly = true;

                    if (formObj.jsonTemplate.hasOwnProperty('isSubform')) {
                        formObj.isSubform = formObj.jsonTemplate.isSubform;
                    }

                    if ('string' === typeof formObj.isSubform) {
                        formObj.isSubform = ('true' === formObj.isSubform.toLowerCase());
                    }

                    //  check if this default form claims a role
                    if (formObj.jsonTemplate.defaultFor && '' !== formObj.jsonTemplate.defaultFor) {
                        checkRole = formObj.jsonTemplate.defaultFor;
                        Y.log( `Default form ${formObj._id} is marked for role: ${checkRole}`, 'info', NAME);
                        report = report + 'Default form is marked for role: ' + checkRole + "\n";
                    }

                    //  prevent default forms from taking an existing role assignment made by user MOJ-3135
                    if ('' !== checkRole) {
                        hasRoleSelf = ( formRoles[checkRole] && formRoles[checkRole] === formObj._id );
                        hasRoleParent = ( formRoles[checkRole] && formRoles[checkRole] === formObj.canonicalId );
                        isUnclaimed = ( formRoles[checkRole] === '' );

                        //  don't claim the role if it is already assigned to something else
                        if ( hasRoleSelf || hasRoleParent || isUnclaimed ) {
                            Y.log(`Maintaining role assignment for: ${checkRole}`, 'info', NAME);
                        } else {
                            Y.log('Not setting role for default form (would overwrite existing assignment)', 'info', NAME);
                            report = report + 'Not setting role for default form (would overwrite existing assignment)' + "\n";
                            formObj.jsonTemplate.defaultFor = '';
                        }
                    }

                    //  check if this for has been assigned a role by the user, retain if so MOJ-12135
                    for ( role in formRoles ) {
                        if ( formRoles.hasOwnProperty( role ) ) {

                            if ( formRoles[ role ] === formObj._id && formObj.jsonTemplate ) {
                                Y.log( `Preserving default form role ${role} for form ${formObj._id}`, 'info', NAME );
                                formObj.jsonTemplate.defaultFor = role;
                            }

                        }
                    }
                }

                //check if this file is already processed
                //  first check if this exists in database
                Y.doccirrus.mongodb.runDb({
                    'user': user,
                    'model': 'admin',
                    'query': {
                        '_id': adminWithHashes,
                        'defaultForms': { $elemMatch: { 'filename': filename, 'hash': hash } }
                    },
                    'action': 'get',
                    'options': { 'fields': { '_id': 1 } },
                    'callback': checkInDb
                });

                //Y.log('Checking default form object: ' + nextModel + '::' + nextId, 'debug', NAME);


                function checkInDb( err, foundHash ){
                    if( err ){
                        Y.log( `Error on checking stored hashes for ${filename} e:${err.message}`, 'error', NAME );
                    }

                    if( foundHash && foundHash.length ){
                        Y.log( `${filename} already processed with hash: ${hash}`, 'info', NAME );
                        checkNext();
                        return;
                    }

                    //  first check if this exists in database
                    Y.doccirrus.mongodb.runDb({
                        'user': user,
                        'model': nextModel,
                        'query': { '_id': nextId },
                        'action': 'get',
                        'callback': onExtantCheck
                    });
                }


                function onExtantCheck(err, data) {

                    if (err) {
                        Y.log('Could not query existing collection for imported object: ' + JSON.stringify(err), 'warn', NAME);
                        report = report + 'Could not query existing collection for imported object: ' + JSON.stringify(err) + "\n";
                        callback(err, report);
                        return;
                    }

                    if (0 !== data.length) {
                        //  already exists, but may have changed, replace the existing version
                        Y.log('Replacing default form object in db ' + nextModel + '::' + nextId, 'debug', NAME);
                        report = report + 'Replacing default form object in db ' + nextModel + '::' + nextId + "\n";
                        updateCurrentObjectInDb();
                        return;
                    }

                    function updateCurrentObjectInDb() {
                        var putFields = { 'fields_': [ ] }, k;

                        checkFormFolderId( formObj );

                        for (k in formObj) {
                            if (formObj.hasOwnProperty(k)) {
                                if ('_id' !== k && '__v' !== k) {
                                    putFields[k] = formObj[k];
                                    putFields.fields_.push(k);
                                }
                            }
                        }

                        Y.doccirrus.filters.cleanDbObject(putFields);

                        Y.doccirrus.mongodb.runDb({
                            'user': user,
                            'model': nextModel,
                            'query': { '_id': nextId },
                            'data': putFields,
                            'action': 'put',
                            'callback': onSaveToDb
                        });
                    }

                    //  Imported form may be from an previous version of the form editor and require migration in
                    //  order to work with current casefile / FEM

                    function onSaveToDb(err) {
                        if (err) {
                            checkNext(err);
                            return;
                        }

                        //  update list of form role assignments (in case more than one disk form claims a role)
                        if ( formObj.jsonTemplate && '' !== formObj.jsonTemplate.defaultFor && nextModel === 'formtemplate' ) {
                            Y.log( `Recording saved form role: ${formObj.jsonTemplate.defaultFor} owned by ${nextModel} ${formObj._id}`, 'info', NAME );
                            formRoles[ formObj.jsonTemplate.defaultFor ] = formObj._id;
                        }

                        Y.log('saved to db: ' + nextModel + '::' + nextId, 'debug', NAME);

                        //firstly pull existed filename in case of hash change
                        Y.doccirrus.mongodb.runDb({
                            'user': user,
                            'model': 'admin',
                            'query': {
                                '_id': adminWithHashes
                            },
                            'action': 'mongoUpdate',
                            'data': {
                                $pull: {
                                    'defaultForms': { filename: filename }
                                }
                            }
                        }).then( () => {
                            Y.doccirrus.mongodb.runDb({
                                'user': user,
                                'model': 'admin',
                                'query': {
                                    '_id': adminWithHashes
                                },
                                'action': 'mongoUpdate',
                                'data': {
                                    $push: {
                                        'defaultForms': { filename: filename, hash: hash }
                                    }
                                },
                                'callback': onUpdateAdmin
                            });
                        }).catch( err => {
                           Y.log( 'Error on pulling file hashes ' + err.message, 'error', NAME );
                            onUpdateAdmin(err);
                        });

                    }

                    function onUpdateAdmin(err) {
                        if (err) {
                            checkNext(err);
                            return;
                        }

                        Y.log('updated admin: ' + nextModel + '::' + nextId, 'info', NAME);

                        if ( 'formtemplate' === nextModel || 'formtemplateversion' === nextModel ) {
                            Y.log( 'Checking format of form object: ' + nextModel + '::' + nextId, 'debug', NAME );
                            Y.doccirrus.forms.migrationhelper.checkOrAddFormFormatVersion(user, nextModel, nextId, onFormatChecked);
                            return;
                        }

                        var binFile;
                        if ( 'media' === nextModel ) {
                            Y.log( 'Importing binary form object: ' + nextModel + '::' + nextId, 'info', NAME );
                            binFile = defaultFormsDir + 'media_' + nextId + '.binary';
                            Y.doccirrus.media.gridfs.importFile( user, nextId, binFile, true, onBinaryImport );
                            return;
                        }

                        //  should never get here
                        checkNext( null );
                    }

                    function onFormatChecked(err) {
                        checkNext(err);
                    }

                    function onBinaryImport( err) {
                        if ( err ) {
                            Y.log( 'Error importing file from GridFS: ' + JSON.stringify( err ), 'warn', NAME );
                        }
                        checkNext( null );
                    }

                    //  object does not exist in database, we can import it
                    Y.log('Saving default form object to db as ' + nextModel + '::' + nextId, 'info', NAME);
                    report = report + 'Saving default form object to db as ' + nextModel + '::' + nextId + "\n";

                    //  migration into nested form folders
                    checkFormFolderId( formObj );

                    saveToDb(user, nextModel, nextId, formObj, onSaveToDb);
                }

            }

        }


        /**
         *  When saving form templates or versions, check that formFolderId exists and migrate if not
         *  @param  {Object}    formObj     A formtemplate or formtemplateversion object
         */

        function checkFormFolderId( formObj ) {
            const defaultFolders = Y.doccirrus.schemas.formfolder.defaultFormFolders;
            let folder;

            if ( !formObj.formFolderId && formObj.category ) {
                for ( folder of defaultFolders ) {
                    if ( formObj.category === folder.canonical ) {
                        Y.log( `Migrated legacy form into folder ${folder._id} ${folder.en}`, 'info', NAME );
                        formObj.formFolderId = folder._id;
                    }
                }
            }
        }

        /**
         *  Check the revocation list of default forms and ensure that all listed objects are deleted
         *
         *  expected: var/defaultforms/revoke_objects.json
         *
         *  Format of the revocation list is array of objects with schema and _id properties
         *
         *  @param user
         *  @param callback
         */

        function enforceRevocations(user, callback) {

            var
                revokeListFile = defaultFormsDir + revocationList,
                toRevoke = [],
                nextRevoke = {},
                report = '';

            Y.log( 'Checking revocation list file: ' + revokeListFile, 'debug', NAME );

            fs.readFile( revokeListFile, onFileRead );

            function onFileRead(err, jsonStr) {
                if (err) {
                    //  no revocation list, not an error
                    Y.log('No revocation list found for default form set.', 'info', NAME);
                    report = report + 'No revocation list found for default form set.' + "\n";
                    callback(null, report);
                    return;
                }

                //Y.log('Loaded revocation list: ' + jsonStr, 'debug', NAME);

                var jsonObj, i;

                try {
                    jsonObj = JSON.parse(jsonStr);
                } catch (parseErr) {
                    Y.log('Error parsing forms revocation list: ' + JSON.stringify(parseErr), 'warn', NAME);
                    report = report + 'Error parsing forms revocation list: ' + JSON.stringify(parseErr) + "\n";
                    callback(parseErr, report);
                    return;
                }

                for (i = 0; i < jsonObj.length; i++) {
                    if (jsonObj[i].hasOwnProperty('schema') && jsonObj[i].hasOwnProperty('_id')) {
                        Y.log('Queueing revocation: ' + JSON.stringify(jsonObj[i]), 'debug', NAME);
                        report = report + 'Queueing revocation: ' + JSON.stringify(jsonObj[i]) + "\n";
                        toRevoke.push(jsonObj[i]);
                    }
                }

                revokeNext();
            }

            function revokeNext() {

                if (0 === toRevoke.length) {
                    Y.log('Forms revocation check complete', 'info', NAME);
                    report = report + 'Forms revocation check complete' + "\n";
                    callback(null, report);
                    return;
                }

                nextRevoke = toRevoke.pop();

                //Y.log('Checking database for revoked object: ' + JSON.stringify(nextRevoke), 'debug', NAME);

                //  for security reasons we can only revoke from a few collections
                if (-1 === allowDefaultTypes.indexOf(nextRevoke.schema)) {
                    Y.log('Not revoking object, not in approved set: ' + JSON.stringify(nextRevoke), 'warn', NAME);
                    report = report + 'Not revoking object, not in approved set: ' + JSON.stringify(nextRevoke) + "\n";
                    revokeNext();
                    return;
                }

                //  check if this exists in database
                Y.doccirrus.mongodb.runDb({
                    'user': user,
                    'model': nextRevoke.schema,
                    'query': { '_id': nextRevoke._id },
                    'action': 'get',
                    'callback': onExtantCheck
                });
            }

            function onExtantCheck(err, data) {
                if (err || 0 === data.length) {
                    //  not in database
                    Y.log('Revoked object not found in database: ' + JSON.stringify(nextRevoke), 'debug', NAME);
                    report = report + 'Revoked object not found in database: ' + JSON.stringify(nextRevoke) + "\n";
                    revokeNext();
                    return;
                }

                Y.log('Revoking default object: ' + nextRevoke.schema + '::' + nextRevoke._id, 'info', NAME);
                report = report + 'Revoking default object: ' + nextRevoke.schema + '::' + nextRevoke._id + "\n";

                Y.doccirrus.mongodb.runDb({
                    'user': user,
                    'model': nextRevoke.schema,
                    'query': { '_id': nextRevoke._id },
                    'action': 'delete',
                    'callback': onDelete()
                });
            }

            function onDelete(err) {
                if (err) {
                    Y.log('Could not delete default forms object: ' + JSON.stringify(err), 'warn', NAME);
                    report = report + 'Could not delete default forms object: ' + JSON.stringify(err) + "\n";
                    callback(err);
                    return;
                }

                revokeNext();
            }

        }

        /**
         *  On server start, once the database is up, for each teneant:
         *
         *      - import any new default form objects which have been shipped (forms, versions, media)
         *      - remove from db any form objects which have been revoked
         *
         *  @param user     {Object}    For database access, equivalent to REST user
         *  @param callback {Function}  optional
         */

        function setupDefaultForms(user, callback) {
            callback = callback || Y.dcforms.nullCallback;

            var report = 'Setting up default forms...' + "\n";

            /*
             *  Make sure that forms exist on server start
             */

            init();

            function onFormsImported(err, addReport) {

                report = report + addReport;

                if (err) {
                    Y.log( 'Error importing default forms: ' + JSON.stringify(err), 'error', NAME );
                    // this is not a reason to fail fast
                    // as there can be id clashes in the form versions.
                    // when importing multiple same forms

                    callback( null, report );
                    return;
                }

                enforceRevocations(user, onRevocationsComplete);
            }

            function onRevocationsComplete(err, addReport) {

                if (err) {
                    callback(err);
                    return;
                }
                report = report + addReport;

                //Y.log('Default forms checks complete, calling back...', 'debug', NAME);
                Y.doccirrus.forms.migrationhelper.checkOrAddAllFormatVersions(user, onVersionMigrated);
            }

            function onVersionMigrated(err, migrationReport) {
                report = report + '<br/>\n' + migrationReport;
                callback(err, report);
            }

            var cluster = require('cluster');

            if(
                cluster.isMaster &&
                (Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD() || Y.doccirrus.auth.isMTSAppliance() /* || Y.doccirrus.auth.isVPRC() */ )
            ) {
                importDefaultForms( user, onFormsImported );
                return;
            }

            if (user.testImport) {
                importDefaultForms( user, onFormsImported );
                return;
            }

            // else we are not going to be serving forms from this
            // server type

            callback(null, report);
        }

        /**
         *  Run in all cases
         */

        setFormDirs();

        /*
         *  Share this with the rest of mojito
         */

        Y.namespace( 'doccirrus.forms' ).importutils = {
            'initialized': initialized,

            'importForm': importForm,                   //  copy to import dir
            'makeExportDir': makeExportDir,             //  per tenant
            'clearExportDir': clearExportDir,
            'listExportDir': listExportDir,             //  list forms in export dir
            'getExportDir': getExportDir,               //  just return the configured location for the export dir

            'enforceRevocations': enforceRevocations,   //  delete form templates listed in revoke_list.json

            'handleArchiveUpload': handleArchiveUpload, //  replace export dir with archive

            'runOnStart': setupDefaultForms
        };


    },
    '0.0.1', {requires: [ 'dcmedia-store', 'dcmedia-gridfs', 'dcforms-confighelper', 'dcforms-migrationhelper', 'dcfilters', 'mediamojit-migrationhelper' ]}
);