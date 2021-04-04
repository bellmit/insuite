/**
 *  Added to move REST actions from controller.server.js to new REST API
 *
 *  User: cb
 *  (c) 2019, Doc Cirrus GmbH, Berlin
 */

/*jshint latedef:false */
/*global YUI */
/*eslint-disable no-unused-vars, no-inner-declarations */


YUI.add( 'formfolder-api', function( Y, NAME ) {

        const
            fs = require( 'fs' ),
            util = require( 'util' ),
            { formatPromiseResult, handleResult, promisifyArgsCallback } = require( 'dc-core' ).utils,

            IPC_REQUEST_FORMS_LIST = 'IPC_REQUEST_FORMS_LIST',
            IPC_UPDATE_FORMS_LIST = 'IPC_UPDATE_FORMS_LIST';

        let
            formsLists = {};

        /**
         *  Called by dcdb.server.js on startup
         *  @param user
         *  @param callback
         */

        async function runOnStart( user, callback ) {
            let err;

            //  only run on Master
            if (!Y.doccirrus.ipc.isMaster() ) { return callback( null ); }

            //  1.  Check / initialize default form folders
            [ err ] = await formatPromiseResult( checkDefaultFolders( user, false ) );
            if ( err ) { return callback( err ); }

            //  2.  Set IPC listener for requests to update cached form list
            Y.doccirrus.ipc.subscribeNamed( IPC_UPDATE_FORMS_LIST, NAME, true, onUpdateFormsList );

            //  3.  Set IPC listener for requests for form list
            Y.doccirrus.ipc.subscribeNamed( IPC_REQUEST_FORMS_LIST, NAME, true, onRequestFormsList );

            callback( null );
        }

        /**
         *  IPC event handler, run on master when some other instance requests a pre-cached forms list
         *
         *  @param request
         *  @param callback
         */

        function onRequestFormsList( request, callback ) {
            if ( formsLists.hasOwnProperty( request.tenantId ) ) {
                //console.log( '(****) sending formsList: ', formsLists[ request.tenantId ] );
                return callback( null, formsLists[ request.tenantId ] );
            }
            callback( null, [] );
        }

        /**
         *  IPC event handler, run on master when one of the tenants reports that the forms or folders have changed
         */

        async function onUpdateFormsList( request, callback ) {
            let [ err ] = await formatPromiseResult( buildFormsList() );
            callback( err );
        }


        /**
         *  Support / dev route to run checkDefaultFolders below
         */

        async function createDefaultFolders( args ) {
            let err;

            //  check/create the folders
            [ err ] = await formatPromiseResult( checkDefaultFolders( args.user, false ) );
            if ( err ) { return args.callback(err); }

            //  check the country modes
            [ err ] = await formatPromiseResult( Y.doccirrus.forms.migrationhelper.setFormFolderCountryMode( args.user, false ) );
            if ( err ) { return args.callback(err); }

            //  check the licences
            [ err ] = await formatPromiseResult( Y.doccirrus.forms.migrationhelper.setFormFolderLicence( args.user, false ) );
            if ( err ) { return args.callback(err); }

            args.callback( err, { status: 'Created default folders.' } );
        }

        /**
         *  Ensure that the default form folders exist, create them if not
         *
         *  @param  {Object}    user
         *  @param  Boolean}    inMigration     True if run from migrate.server.js
         *  @return {Promise<void>}
         */

        async function checkDefaultFolders( user, inMigration ) {
            Y.log('Entering Y.doccirrus.api.formfolder.checkDefaultFolders', 'info', NAME);

            let
                err, result,
                defaultFolder, extantFolder,
                defaultFolderIds = [],
                found;

            //  1.  Make a list of default form folder _ids and try to load them

            for ( defaultFolder of Y.doccirrus.schemas.formfolder.defaultFormFolders ) {
                defaultFolderIds.push( defaultFolder._id );
            }

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'formfolder',
                    query: { _id: { $in: defaultFolderIds } },
                    migrate: inMigration
                } )
            );

            if ( err ) {
                Y.log( `Could not look up default form folders: ${err.stack||err}`, 'warn', NAME );
                throw err;
            }

            //  2.  Create any default form folders which do not already exist

            for ( defaultFolder of Y.doccirrus.schemas.formfolder.defaultFormFolders ) {

                defaultFolder = JSON.parse( JSON.stringify( defaultFolder ) );
                defaultFolder.licence = defaultFolder.licence || '';
                defaultFolder.isDefault = true;
                defaultFolder.tCreated = new Date();
                defaultFolder.tModified = new Date();

                if ( !defaultFolder.countryMode ) {
                    defaultFolder.countryMode = [ 'D', 'CH' ];
                }

                found = false;

                for ( extantFolder of result ) {
                    if ( extantFolder._id.toString() === defaultFolder._id ) {
                        found = true;
                    }
                }

                if ( !found ) {

                    Y.log( `Missing default form folder ${defaultFolder.de} ${defaultFolder._id}, creating.`, 'info', NAME );

                    [ err ] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'formfolder',
                            action: 'post',
                            data: Y.doccirrus.filters.cleanDbObject( defaultFolder ),
                            migrate: inMigration
                        } )
                    );

                    if ( err ) {
                        Y.log( `Could not create default form folder: ${err.stack||err}`, 'error', NAME );
                        throw err;
                    }
                }
            }

            Y.log('Exiting Y.doccirrus.api.formfolder.checkDefaultFolders', 'info', NAME);
        }

        /**
         *  Structure the list of forms into a flat list of folders
         *  Should only be run on master
         */

        async function buildFormsList( user ) {
            Y.log('Entering Y.doccirrus.api.formfolder.buildFormsList', 'info', NAME);

            const
                getModelP = util.promisify( Y.doccirrus.mongodb.getModel ),
                listFormsP = promisifyArgsCallback( Y.doccirrus.api.formtemplate.listforms ),

                RECOVERY_FOLDER_ID = Y.doccirrus.schemas.formfolder.recoveryFolderId;

            let
                err,
                formFolderModel, formFolderCursor,
                allFolders = [], rootFolders = [],
                allForms, recoveryFolder,
                folder, parentFolder,
                form, found,
                newFormsList;

            //

            //  1.  Get list of folders and sort by root and name

            [ err, formFolderModel ] = await formatPromiseResult( getModelP( user, 'formfolder', false ) );

            if ( err ) {
                Y.log( `Could not instantiate form folder model: ${err.stack||err}`, 'error', NAME );
                //  nothing further to be done;
                return;
            }

            formFolderCursor = formFolderModel.mongoose.find( {} ).lean().cursor();
            while( folder = await formFolderCursor.next() ) {   //  eslint-disable-line no-cond-assign

                folder.forms = [];
                folder.subfolders = [];
                folder._id = `${folder._id}`;

                if ( !folder.parentId ) {
                    rootFolders.push( folder );
                } else {
                    allFolders.push( folder );
                }

                //  if folder is missing then the recovery folder owns it
                if ( RECOVERY_FOLDER_ID === folder._id ) {
                    recoveryFolder = folder;
                }
            }

            newFormsList = rootFolders.concat( allFolders );

            //  2.  Get all form metas and add each to the correct folder

            [ err, allForms ] = await formatPromiseResult( listFormsP( { user: user } ) );

            for ( form of allForms ) {
                found = false;

                for ( folder of newFormsList ) {
                    if ( form.formFolderId === folder._id ) {
                        folder.forms.push( form );
                        found = true;
                    }
                }

                if ( !found ) {
                    recoveryFolder.forms.push( form );
                }
            }

            //  3.  Link subfolders
            for ( parentFolder of newFormsList ) {
                for ( folder of newFormsList ) {

                    //  sanity check, folder cannot be its own parent
                    if ( folder._id === folder.parentId ) { folder.parentId = ''; }

                    if ( folder.parentId === parentFolder._id ) {
                        parentFolder.subfolders.push( folder._id );
                    }
                }
            }

            //  to be cached on master in future, currently returned directly

            Y.log('Exiting Y.doccirrus.api.formfolder.buildFormsList', 'info', NAME);
            return newFormsList;
        }

        /**
         *  Return cached froms list over IPC
         */

        async function getFoldersWithForms( args ) {
            Y.log('Entering Y.doccirrus.api.formfolder.getFoldersWithForms', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formfolder.getFoldersWithForms');
            }

            let err, formList;

            [ err, formList ] = await formatPromiseResult( buildFormsList( args.user ) );

            args.callback( err, formList );

            /*
            if ( Y.doccirrus.ipc.isMaster() ) {
                return args.callback( null, formsList );
            }

            Y.doccirrus.ipc.sendAsync( IPC_REQUEST_FORMS_LIST, { tenantId: args.user.tenantId }, args.callback );
            */

            /* promisify breaks IPC, TODO: find out why
            const ipcRaiseP = util.promisify( Y.doccirrus.ipc.sendAsync );

            let [ err, result ] = await formatPromiseResult(
                ipcRaiseP( IPC_REQUEST_FORMS_LIST, { tenantId: args.user.tenantId } )
            );
            args.callback( err, result );
            */
        }

        /**
         *  Make a list of parent folders to export when exporting a form/folder
         *
         *  @param  {Object}    user
         *  @param  {String}    formFolderId
         *  @return {Promise<void>}
         */

        async function getParentFolderDeps( user, formFolderId ) {
            let
                deps = [ 'formfolder::' + formFolderId ],
                err, result, moreDeps;

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'formfolder',
                    query: { _id: formFolderId }
                } )
            );

            if ( err ) {
                Y.log( `Could not load formfolder from database: ${err.stack||err}`, 'error', NAME );
                throw err;
            }

            if ( !result || !result[0] ) {
                //  missing folder, return empty deps, best effort
                Y.log( `Referenced form folder is missing: ${formFolderId}`, 'warn', NAME );
                return [];
            }

            if ( result[0].parentId && result[0].parentId === `${result[0]._id}` ) {
                //  sometimes observed in old data, MOJ-12837
                Y.log( `Form folder is own parent: ${result[0]._id}`, 'error', NAME );
                result[0].parentId = '';
            }

            if ( result[0].parentId && '' !== result[0].parentId ) {
                //  has a parent, get the parents recursively
                [ err, moreDeps ] = await formatPromiseResult( getParentFolderDeps( user, result[0].parentId ) );
                if ( err ) {
                    return deps;
                }
                deps = deps.concat( moreDeps );
            }

            return deps;
        }

        /**
         *  Create a new custom form folder in the tree
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.originalParams
         *  @param  {String}    args.originalParams.title       Name of folder in current user language
         *  @param  {String}    args.originalParams.parentId    _id of another folder, if child
         *  @param  {Object}    args.user
         *  @param  {Function}  args.callback
         */

        async function addFolder(args) {
            Y.log('Entering Y.doccirrus.api.formfolder.addFolder', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formfolder.addFolder');
            }

            let
                params = args.originalParams,
                title = params.title || 'New folder',
                parentId = params.parentId || '',

                dbSetup = {
                    'user': args.user,
                    'action': 'post',
                    'model': 'formfolder'
                },

                dbObj = {
                    parentId: parentId,
                    isDefault: false,
                    countryMode:  Y.doccirrus.commonutils.getCountryModeFromConfigs(),
                    en: title,
                    de: title,
                    tCreated: new Date(),
                    tModified: new Date()
                },

                err, result;

            Y.log( `Creating new form folder "${title}" under ${parentId}`, 'info', NAME );

            dbSetup.data = Y.doccirrus.filters.cleanDbObject( dbObj );

            [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( dbSetup ) );

            return handleResult( err, result, args.callback );
        }

        /**
         *  Save changes to a form folder
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.originalParams     Form folder
         *  @paran  {Object}    args.user
         *  @param  {Function}  args.callback
         */

        async function updateFolder( args ) {
            Y.log('Entering Y.doccirrus.api.formfolder.updateFolder', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formfolder.updateFolder');
            }

            const { user, callback } = args;
            let
                putData = args.originalParams,
                fields = [ 'en', 'de', 'parentId', 'countryMode', 'licence', 'tModified' ],
                err, result;


            putData.fields_ = fields;
            putData.tModified = new Date();

            [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'formfolder',
                    action: 'put',
                    query: { _id: putData._id },
                    data: Y.doccirrus.filters.cleanDbObject( putData )
                } )
            );

            return handleResult( err, result, callback );
        }

        /**
         *  Delete a folder given an _id
         *
         *  Anything it contains will be moved to 'recovered' folder
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.originalParams
         *  @param  {Object}    args.originalParams._id
         *
         *  @return {Promise<*>}
         */

        async function removeFolder(args) {
            Y.log('Entering Y.doccirrus.api.formfolder.removeFolder', 'info', NAME);
            if (args && args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.formfolder.removeFolder');
            }

            const
                { user, originalParams, callback } = args,
                RECOVERY_FOLDER_ID = Y.doccirrus.schemas.formfolder.recoveryFolderId,
                folderId = originalParams._id;

            let err, result, folder, toMove;

            //  load the form and check that this is not a default form folder

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    'user': user,
                    'model': 'formfolder',
                    'query': {'_id': originalParams._id}
                } )
            );

            if ( !err && !result[0] ) {
                err = new Error( 'Could not find folder.' );
            }

            if ( err ) {
                Y.log( `Could not delete form folder ${folderId}: ${err.stack||err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            folder = result[ 0 ];

            if ( folder.isDefault ) {
                err = new Error( 'Cannot delete default folder.' );
                return handleResult( err, null, callback );
            }

            //  reassign any forms in this folder to 'Recovered'

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'formtemplate',
                    query: { formFolderId: folderId },
                    options: { fields: { _id: 1 } }
                } )
            );

            if ( err ) {
                Y.log( `Problem looking up forms in folder ${folderId}: ${err.stack||err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }

            for ( toMove of result ) {
                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'formtemplate',
                        action: 'update',
                        query: { _id: toMove._id },
                        data: { formFolderId: RECOVERY_FOLDER_ID }
                    } )
                );

                if ( err ) {
                    Y.log( `Problem moving form to recovery folder from ${folderId}: ${err.stack||err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
            }

            //  reassign any subfolders in this folder to 'Recovered'

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'formfolder',
                    query: { parentId: folderId },
                    options: { fields: { _id: 1 } }
                } )
            );

            if ( err ) {
                Y.log( `Problem looking up subfolders of ${folderId}: ${err.stack||err}`, 'error', NAME );
                return handleResult( err, null, callback );
            }
            for ( toMove of result ) {
                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'formfolder',
                        action: 'update',
                        query: { _id: toMove._id },
                        data: { parentId: RECOVERY_FOLDER_ID }
                    } )
                );

                if ( err ) {
                    Y.log( `Problem moving form folder to recovery folder from ${folderId}: ${err.stack||err}`, 'error', NAME );
                    return handleResult( err, null, callback );
                }
            }

            //  Finally, delete the folder

            [ err, result ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb({
                    'user': user,
                    'action': 'delete',
                    'model': 'formfolder',
                    'query': {'_id': folderId }
                } )
            );

            return handleResult( err, result, callback );
        }

        /**
         *  Move a formtemplate from one form folder to another
         *
         *  Should trigger events to update forms tree
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.originalParams
         *  @param  {Object}    args.originalParams.formId
         *  @param  {Object}    args.originalParams.formFolderId
         *  @param  {Object}    args.user
         *  @param  {object}    args.callback
         *
         *  @return {Promise<void>}
         */

        async function moveForm( args ) {
            const
                params = args.originalParams,
                formId = params.formId || null,
                formFolderId = params.formFolderId || null,
                callback = args.callback;

            let err, result;

            if ( !formId || !formFolderId ) {
                err = new Error( 'Invalid request' );
                return handleResult( err, null, callback );
            }

            [ err, result ] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'formtemplate',
                action: 'update',
                query: { _id: formId },
                data: Y.doccirrus.filters.cleanDbObject( { formFolderId: formFolderId } )
            } ) );

            //  TODO: raise WS event here

            return handleResult( err, result, callback );
        }

        async function getFolders(args) {
            let
                {user, callback} = args,
                err, formfolders, folder;

           [err, formfolders] = await formatPromiseResult( Y.doccirrus.mongodb.runDb({
                'user': user,
                'action': 'get',
                'model': 'formfolder'
            }));

           for ( folder of formfolders ) {
               if ( `${folder._id}` === folder.parentId ) {
                   Y.log( `Form folder is its own parent: ${folder._id}`, 'warn', NAME );
                   folder.parentId = '';
               }
           }

           return handleResult(err, formfolders , callback);
        }

        /**
         *  Make a tree similar to getFoldersWithForms for data in the export/upload directory
         *
         *  @param  {Object}    args
         *  @param  {Object}    args.callback
         */

        async function getExportedFoldersWithForms( args ) {
            const
                makeExportDirP = util.promisify( Y.doccirrus.forms.exportutils.makeExportDir ),
                listFilesRecursiveP = util.promisify( Y.doccirrus.media.listRecursive ),
                readFileP = util.promisify( fs.readFile ),

                defaultFolders = Y.doccirrus.schemas.formfolder.defaultFormFolders,

                //  magic folder to handle lost and found items
                recoveryFolder = {
                    "_id": "000000000000000000000699",
                    "countryMode": [
                        "D",
                        "CH"
                    ],
                    "en": "Recovered",
                    "de": "Recovered",
                    "licence": "",
                    "isDefault": true,
                    "tCreated": "2019-08-12T13:09:05.016Z",
                    "tModified": "2019-08-12T13:09:05.016Z",
                    "forms": [],
                    "subfolders": []
                };

            let
                err, tenantDir, filesList, result,
                file, folder, subfolder, form, formMeta, jsonStr, isFound, foundMigrate,
                hasRecoveryFolder = false,
                folders = [];

            //  Set up the export directory if not present

            [ err, tenantDir ] = await formatPromiseResult( makeExportDirP( args.user ) );

            if ( err ) {
                Y.log( `Could not initialize export directory for tenant ${args.user.tenantId}: ${err.stack||err}`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            //  List files in the export directory

            [ err, filesList ] = await formatPromiseResult( listFilesRecursiveP( tenantDir, '' ) );

            if ( err ) {
                Y.log( `Could not list exported files for tenant ${args.user.tenantId}: ${err.stack||err}`, 'error', NAME );
                return handleResult( err, null, args.callback );
            }

            //  Read the folders into an array

            for ( file of filesList ) {
                if ( 'formfolder_' === file.filename.substr( 0, 11 ) ) {

                    [ err, jsonStr ] = await formatPromiseResult( readFileP( file.path, 'utf8' ) );

                    if ( err ) {
                        Y.log( `Could not import form folder for tenant ${args.user.tenantId}: ${err.stack||err}`, 'error', NAME );
                        return handleResult( err, null, args.callback );
                    }

                    try {
                        folder = JSON.parse( jsonStr );
                        folder.forms = [];
                        folder.subfolders = [];
                        folders.push( folder );
                    } catch( parseErr ) {
                        Y.log( `Could not parse folder JSON file ${file.path}: ${parseErr.stack||parseErr}`, 'error', NAME );
                        //  best effort, continue with the next file
                    }

                }
            }

            //  Link subfolders from their parents

            for ( subfolder of folders ) {
                isFound = false;

                for ( folder of folders ) {
                    if ( subfolder.parentId === folder._id ) {
                        folder.subfolders.push( subfolder._id );
                        isFound = true;
                    }
                }

                if ( !isFound && subfolder.parentId && subfolder.parentId !== '' ) {
                    //  missing parent
                    recoveryFolder.subfolders.push( subfolder._id );
                    if ( !hasRecoveryFolder ) {
                        folders.push( recoveryFolder );
                        hasRecoveryFolder = true;
                    }
                }

            }

            //  Sort the forms into folders

            for ( file of filesList ) {
                if ( 'formtemplate_' === file.filename.substr( 0, 13 ) ) {

                    //  load and parse the form from file on disk

                    [ err, jsonStr ] = await formatPromiseResult( readFileP( file.path, 'utf8' ) );

                    if ( err ) {
                        Y.log( `Could not import form for tenant ${args.user.tenantId}: ${err.stack||err}`, 'error', NAME );
                        return handleResult( err, null, args.callback );
                    }

                    try {
                        form = JSON.parse( jsonStr );
                        formMeta = formToFormMeta( form );
                    } catch( parseErr ) {
                        Y.log( `Could not parse folder JSON file ${parseErr.stack||parseErr}` );
                    }

                    //  match the form to a folder
                    isFound = false;
                    for ( folder of folders ) {
                        if ( form.formFolderId === folder._id ) {
                            folder.forms.push( formMeta );
                            isFound = true;
                        }
                    }

                    //  if category but no folder, try to migrate
                    if ( false === isFound && '' === formMeta.formFolderId && formMeta.category ) {

                        //  find and load corresponding default form folder, if not already done
                        for ( folder of defaultFolders ) {
                            if ( formMeta.category === folder.canonical ) {

                                formMeta.formFolderId = folder._id;

                                //  do not add the same folder multiple time for multiple migrated forms
                                foundMigrate = false;
                                for ( subfolder of folders ) {
                                    if ( subfolder._id === folder._id ) {
                                        subfolder.forms.push( formMeta );
                                        foundMigrate = true;
                                        isFound = true;
                                        break;
                                    }
                                }

                                if ( foundMigrate ) {
                                    break;
                                }

                                //  load the folder into the set
                                [ err, result ] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: args.user,
                                        model: 'formfolder',
                                        query: { '_id': folder._id }
                                    } )
                                );

                                if ( err ) {
                                    Y.log( `Could not migrate legacy form: ${err.stack||err}`, 'error', NAME );
                                    //  continue to add it to 'Recovered' folder
                                }

                                if ( result && result[0] ) {
                                    folder = result[0];
                                    folder._id = folder._id.toString();
                                    folder.forms = [ formMeta ];
                                    folder.subfolders = [];
                                    folders.push( folder );
                                    isFound = true;
                                }
                            }
                        }

                    }

                    //  add to recovery folder if no folders match
                    if ( false === isFound ) {
                        recoveryFolder.forms.push( formMeta );
                        if ( !hasRecoveryFolder ) {
                            folders.push( recoveryFolder );
                            hasRecoveryFolder = true;
                        }
                    }
                }
            }

            return handleResult( null, folders, args.callback );
        }

        /**
         *  Utility, used when listing forms on disk
         *
         *  Place forms in same format as when listing from database
         *
         *  @param  {Object}    form
         *  @return {Object}    formMeta
         */

        function formToFormMeta( form ) {
            let
                jT = form.jsonTemplate,
                tip = Y.doccirrus.schemas.formtemplate.makeToolTip( form );

            return {
                "_id": form._id,
                "formId": form._id,
                "formFolderId": form.formFolderId || '',
                "title": {
                    "en": jT.name.en,
                    "de": jT.name.de
                },
                "version": form.version,
                "latestVersionId": form.latestVersionId,
                "isSubform": form.isSubform || false,
                "isReadOnly": form.isReadOnly || false,
                "category": form.category,
                "defaultFor": jT.defaultFor || '',
                "bfbAlternative": jT.bfbAlternative,
                "tip": tip,
                "revision": form.revision
            };
        }

        /**
         *  Dev / support route to manually run migration to set formFolderIds on form templates
         *
         *  @param args
         *  @return {Promise<*>}
         */

        async function setFormFolderIds( args ) {
            let err;

            [ err ] = await formatPromiseResult(
                Y.doccirrus.forms.migrationhelper.setFormFolderIds( args.user, false )
            );

            if ( err ) { return args.callback( err ); }
            args.callback( null, { status: 'Completed migration to set formFolderId on form templates.' } );
        }

        /*
         *  Expose API
         */

        Y.namespace( 'doccirrus.api' ).formfolder = {

            //  REST API
            addFolder,
            updateFolder,
            removeFolder,
            getFolders,
            getParentFolderDeps,

            getFoldersWithForms,

            moveForm,

            getExportedFoldersWithForms,

            //  internal only
            runOnStart,
            checkDefaultFolders,

            //  dev / support routes to manually run migrations
            setFormFolderIds,
            createDefaultFolders

        };

    },
    '0.0.1',
    {
        requires: [
            'formfolder-schema',
            'formfolder-process',
            'formtemplate-schema',
            'formtemplate-api',
            'dcforms-confighelper',
            'dcforms-exportutils'
        ]
    }
);