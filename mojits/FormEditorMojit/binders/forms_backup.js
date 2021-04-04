/**
 *  jadeLoaded forms tree to allow import / export from compressed archive
 *
 *  This has two modes of operation to allow import and export to a directory on disk which
 *  may compressed into a tar.gz archive or overwritten by uploading.
 *
 *  @author: strix
 *
 *  Copyright (c) 2012 Doc Cirrus GmbH all rights reserved.
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*exported _fn */
/*global $, ko */

function _fn(Y, NAME) {
    'use strict';

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @/param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            //  private vars

            var
            //  myNode = node,                          //  YUI / DOM node this is rendered into
                i18n = Y.doccirrus.i18n,
                BTN_ARC_EXPORT = i18n('FormEditorMojit.fe.view.BTN_ARC_EXPORT'),
                BTN_ARC_IMPORT = i18n('FormEditorMojit.fe.view.BTN_ARC_IMPORT'),
                BTN_ARC_DELETE = i18n('FormEditorMojit.fe.view.BTN_ARC_DELETE'),
                BTN_EXPORT_CAT = i18n('FormEditorMojit.fe.view.BTN_EXPORT_CAT'),
                LBL_DB_DEPENDENCES = i18n('FormEditorMojit.form_backup.LBL_DB_DEPENDENCES'),
                LBL_DB_DISK = i18n('FormEditorMojit.form_backup.LBL_DB_DISK'),
                LBL_CONFIG = i18n('FormEditorMojit.form_backup.LBL_CONFIG'),
                userLang = Y.dcforms.getUserLang(),     //  user's language, may be overridden by template
                jqCache = {},                           //  cached jQuery selectors

                formCats = null,                        //  form categories (more or less static)
                formList = null,                        //  forms in database (array of meta objects)
                exportList = null,                      //  forms on disk (array of meta objects)

                inBatchOp = false,                      //  true if progress bar is to be shown
                inBatchTotal = 0,
                inBatchProgress = 0,

                perfDebug = {                           //  debug performance issues with export
                    'config': 0,
                    'deps': 0,
                    'fs': 0
                },

                openCatsDb = {},
                openCatsDisk = {},

                ico = '<i class="fa fa-file-text-o"></i>&nbsp;&nbsp;',

            // configuration

                maxTitleLength = 40;

            /*
             *  Cache Query selectors for controls
             */

            jqCache = {                                          //%  pre-cached cached DOM queries [object]
                'divBackupContainer': $('#divBackupContainer'),
                'divBackupDiskTreeUser': $('#divBackupDiskTreeUser'),
                'divBackupDiskTreeRO': $('#divBackupDiskTreeRO'),
                'divBackupDBTreeUser': $('#divBackupDBTreeUser'),
                'divBackupDBTreeRO': $('#divBackupDBTreeRO'),
                'divWaiting': $('#divWaiting'),
                'tableImportExport': $('#tableImportExport'),
                'fileUploadArchive': $('#fileUploadArchive'),        //  must be defined by parent binder to work
                'formUploadArchive': $('#formUploadArchive'),
                'divBackupProgressArea': $('#divBackupProgressArea'),
                'divBackupProgressBar': $('#divBackupProgressBar'),
                'spanBackupProgressSr': $('#spanBackupProgressSr'),
                'btnDownloadArchive': $('#' + node.passToBinder.btnDownloadArchiveId)
            };

            jqCache.btnDownloadArchive.addClass('disabled');

            //  INITIALIZATION

            /**
             *  Set up event listeners and request forms list from server
             */

            function initBackupDialog() {

                //  begin load and rendering process
                //   - get categories
                //      - get form list from db
                //          - render the tree at right
                //      - get form list from disk
                //          - render the tree at left

                Y.doccirrus.jsonrpc.api.formfolder.getFolders()
                    .then( function( res ) {
                        let defaultCats = Y.dcforms.getCategories( {
                            'withArchiv': true,
                            'withGHD': true,
                            'withInSight2': true,
                            'withEDMP': true,
                            'withEnvelopes': true,
                            'withTelekardio': true,
                            'withDOQUVIDE': true,
                            'withInGyn': true,
                            'withInPedia': true,
                            'withDQS': true
                        } );
                        formCats = [].concat(defaultCats,res.data);

                        loadDBForms();
                        loadDiskForms();

                        //  set handler for archive uploads

                        jqCache.fileUploadArchive.off('change.forms').on('change.forms', function() {
                            onArchiveFileSelected();
                        });

                        //  listen for archive file uploads
                        //  This is a bit of a hacky way to do it, but due to AJAX limitations on Safari
                        //  is the cleanest known solution available at time of writing

                        $('#iframeUploadTarget').off('load.forms').on('load.forms', function() { onArchiveUpload(); });


                    } ).fail( function( err ) {
                    Y.log( 'could not get folders. Error: ' + JSON.stringify( err ), 'debug', NAME );
                } );

            }

            initBackupDialog();

            //  SET UP SOCKET IO

            //console.log(Y.doccirrus.communication.getSocket( '/' ));

            Y.doccirrus.communication.on( {
                event: 'formExportAction',
                socket: Y.doccirrus.communication.getSocket( '/' ),
                done: function onFormExportMessage( message ) {
                    var data = message.data && message.data[0];
                    switch(data.status) {
                        case 'startBatch':
                            inBatchOp = true;
                            inBatchTotal = data.requested * 2;
                            inBatchProgress = 0;

                            perfDebug = {                           //  new performance measures
                                'config': 0,
                                'deps': 0,
                                'fs': 0
                            };

                            jqCache.divBackupDiskTreeUser.html(Y.doccirrus.comctl.getThrobber());
                            jqCache.divBackupDiskTreeRO.html(Y.doccirrus.comctl.getThrobber());

                            setProgressBar(inBatchProgress, inBatchTotal);
                            break;

                        case 'start':
                            inBatchProgress = inBatchProgress + 1;
                            setProgressBar(inBatchProgress, inBatchTotal);
                            break;

                        case 'done':

                            if (data.performance) {
                                perfDebug.config = perfDebug.config + (data.performance.config || 0);
                                perfDebug.deps = perfDebug.deps + (data.performance.deps || 0);
                                perfDebug.fs = perfDebug.fs + (data.performance.fs|| 0);
                                updatePerformanceDiv();
                            }

                            //  exportAll does not send start events
                            if (data.double) {
                                inBatchProgress = inBatchProgress + 1;
                            }

                            inBatchProgress = inBatchProgress + 1;
                            setProgressBar(inBatchProgress, inBatchTotal);
                            break;

                        case 'endBatch':
                            if (perfDebug.deps > 0) {
                                updatePerformanceDiv();
                            }
                            loadDiskForms();
                            clearProgressBar();
                            inBatchOp = false;
                            break;

                    }

                },
                handlerId: 'formExportActionHandler'
            } );

            //  PRIVATE METHODS

            /**
             *  (re)Load the right panel / tree showing forms in database
             */

            function loadDBForms() {
                jqCache.divBackupDBTreeUser.html(Y.doccirrus.comctl.getThrobber());
                jqCache.divBackupDBTreeRO.html(Y.doccirrus.comctl.getThrobber());
                Y.dcforms.getFormList('', false, onDBFormsListLoaded);
            }

            /**
             *  (re)Load the left panel / tree showing forms on disk
             */

            function loadDiskForms() {
                jqCache.divBackupDiskTreeUser.html(Y.doccirrus.comctl.getThrobber());
                jqCache.divBackupDiskTreeRO.html(Y.doccirrus.comctl.getThrobber());
                Y.dcforms.listFormExports( onDiskFormsListLoaded);
            }

            /**
             *  Render the database forms three into its container
             */

            function renderDBFormsTree(treeDiv, isReadOnly) {

                var
                //    that = this,

                    i,                                      //% iterate over categories/folders [int]
                    j,                                      //% iterate over templates/items [int]

                    html = '',                              //% temp string
                    subtree = '',                           //% temp string
                    subtreeCount = '',
                    roPrefix = (isReadOnly ? 'ro' : 'nro'),
                    exportCatBtn = '',
                    exportBtn = '',
                    trimTitle = '',                         //% temp string
                    formsInCategory,                        //% filtered form list
                    leafClass,
                    forForm;                                //% current form

                //  First check that everything we need is loaded - try load it if not.

                if (!formCats || !formList) {
                    Y.log('Could not render forms tree, not yet ready, waiting on data.', 'warn', NAME);
                    return;
                }

                //  Make a CSS tree from the categories and forms

                openCatsDb = {};

                for (i = 0; i < formCats.length; i++) {
                    subtree = '';
                    subtreeCount = '';

                    formsInCategory = filterFormList(formList, formCats[i].canonical, isReadOnly);
                    formCats[i].memberCount = formsInCategory.length;

                    for (j = 0; j < formsInCategory.length; j++) {

                        forForm = formsInCategory[j];

                        trimTitle = forForm.title[userLang];
                        if (trimTitle.length > maxTitleLength) {
                            trimTitle = forForm.title[userLang].substring(0, maxTitleLength) + '...';
                        }

                        leafClass = (forForm.defaultFor === '') ? 'forms-tree-leaf' : 'forms-tree-leaf-special';

                        exportBtn = '<button type="button" ' +
                            'id="btnExport' + forForm._id + '" ' +
                            'style="float: right;" ' +
                            'class="btn btn-primary btn-xs"' +
                            '>Export</button>';

                        subtree = subtree +
                            '<div class="' + leafClass + '">' +
                            '<table '+ 'noborder width="100%"><tr>' +
                            '<td ' + 'valign="top">' + ico + trimTitle + ' <small>v' + forForm.version + '</small></td>' +
                            '<td ' + 'valign="top">' + exportBtn + '</td>' +
                            '</tr></table></div>' +
                            '<div class="forms-tree-spacer"></div>';

                    }

                    exportCatBtn = '<button type="button" ' +
                        'id="btnExportCat' + roPrefix + i + '" ' +
                        'style="float: right;" ' +
                        'class="btn btn-primary btn-xs"' +
                        '>'+ BTN_EXPORT_CAT +'</button>';

                    if (formCats[i].memberCount > 0) {
                        subtreeCount = ' <small>(' + formCats[i].memberCount + ')</small>';
                    }

                    subtree = '' +
                        '<div id="cbT' + roPrefix +  i + '" class="forms-tree-root">' +
                            '<span id="cbTI' + roPrefix +  i  + '">' +
                                '<i class="fa fa-folder"></i>' +
                            '</span>' +
                            '<span id="spanTitle' + roPrefix +  i + '">' +
                            '&nbsp;&nbsp;' + formCats[i][userLang] + subtreeCount +
                            '</span>' +
                            exportCatBtn +
                            '<div id="cbTC' + roPrefix +  i + '" style="display:none;">' +
                                '<div class="forms-tree-spacer"></div>' +
                                subtree +
                            '</div>' +
                        '</div>' +
                        '<div class="forms-tree-spacer"></div>';

                    if (formsInCategory.length > 0) {
                        html = html + subtree;
                    }

                    openCatsDb[roPrefix + i] = false;
                }

                //  add 'export all' button
                if (formList.length > 0 && true === isReadOnly) {
                    html = html + '<button class="btn" id="btnExportAllForms">'+ BTN_ARC_EXPORT +'</button>';
                }

                jqCache[treeDiv].html(html);

                //  attach onClick events for form categories
                for (i = 0; i < formCats.length; i++) {
                    $('#cbT' + roPrefix +  i).off('click').on('click', makeCatClickHandlerDb(i));
                    //$('#spanTitle' + roPrefix +  i).off('click').on('click', makeCatClickHandlerDb(i));

                    $('#btnExportCat' + roPrefix + i).off('click').on('click', makeCatExportHandlerDb(formCats[i]));

                }

                //  attach onClick events to form templates in tree
                for (i = 0; i < formList.length; i++) {
                    attachDBTemplateOnClick(formList[i]);
                }


                //  handle export all event
                if (formList.length > 0) {
                    $('#btnExportAllForms').off('click.forms').on('click.forms', function() { exportAll(); });
                }

                /**
                 *  Add event to handle user clicking on a form template in the tree
                 *
                 *  @param  formMeta    {Object}    Form listing object
                 */

                function attachDBTemplateOnClick(formMeta) {
                    $('#btnExport' + formMeta._id).off('click.export').on('click.export', function(evt) {
                        evt.stopPropagation();
                        exportForm(formMeta);
                    });
                }

                function makeCatClickHandlerDb(idx) {
                    return function( /* evt */) {

                        if (openCatsDb[roPrefix + idx]) {
                            openCatsDb[roPrefix + idx] = false;
                            $('#cbTC' + roPrefix + idx).hide();
                            $('#cbTI' + roPrefix + idx).html('<i class="fa fa-folder"></i>');
                            $('#cbT' + roPrefix + idx).addClass('forms-tree-root').removeClass('forms-tree-root-x');
                        } else {
                            openCatsDb[roPrefix + idx] = true;
                            $('#cbTC' + roPrefix + idx).show();
                            $('#cbTI' + roPrefix + idx).html('<i class="fa fa-folder-open"></i>');
                            $('#cbT' + roPrefix + idx).addClass('forms-tree-root-x').removeClass('forms-tree-root');
                        }

                    };
                }

                function makeCatExportHandlerDb(formCat) {

                    function onExportPost(err, data) {
                        if (err) {
                            Y.log('Could not queue batch of forms for export: ' + JSON.stringify(err), 'warn', NAME);
                            return;
                        }
                        if( Y.config.debug ) {
                            Y.log('Queued batch of forms for export: ' + JSON.stringify(data), 'debug', NAME);
                        }
                    }

                    return function onFormCatExportClick(evt) {
                        evt.stopPropagation();

                        if (inBatchOp) {
                            Y.log('Cannot export form category, already in a batch operation.', 'debug', NAME);
                            return;
                        }

                        inBatchOp = true;

                        var
                            inCategory = filterFormList(formList, formCat.canonical, isReadOnly),
                            formIds = [],
                            postData,
                            i;

                        for (i = 0; i < inCategory.length; i++) {
                            formIds.push(inCategory[i]._id);
                        }

                        postData = {
                            'formIds': formIds,
                            'withHistory': $('#chkWithHistory').is(':checked')
                        };

                        Y.doccirrus.comctl.privatePost('/1/formtemplate/:exportforms', postData, onExportPost);
                    };
                }

            }

            /**
             *  Filter form list by _id or category
             *
             *  @param  source      {Array}     Set of form meta objects
             *  @param  filter      {String}    Value to match
             *  @param  isReadOnly  {Boolean}   Read-only forms are displayed in separate tree, see MOJ-3254
             *  @returns            {Array}
             */

            function filterFormList(source, filter, isReadOnly) {
                var
                    i,
                    filtered = [];

                if (!source) {
                    Y.log('Attempting to filter form list beofre data has loaded.', 'warn', NAME);
                    return filtered;
                }

                for (i = 0; i < source.length; i++) {

                    if (!source[i].hasOwnProperty('isReadOnly')) {
                        source[i].isReadOnly = isReadOnly;
                    }

                    if (source[i].isReadOnly === isReadOnly) {
                        if (source[i].hasOwnProperty('_id') && (source[i]._id === filter)) {
                            filtered.push(source[i]);
                        }

                        if (source[i].hasOwnProperty('category') && (source[i].category === filter)) {
                            filtered.push(source[i]);
                        }
                    }
                }


                //  sort the list by form title in current language

                filtered.sort(compareAlphabetical);

                function compareAlphabetical(a,b) {
                    if (a.title[userLang] < b.title[userLang]) {
                        return -1;
                    }
                    if (a.title[userLang] > b.title[userLang]) {
                        return 1;
                    }
                    return 0;
                }

                return filtered;
            }

            /**
             *  Render the disk forms tree into left of modal
             */

            function renderDiskFormsTree(treeDiv, isReadOnly) {

                var
                    i,                                      //% iterate over categories/folders [int]
                    j,                                      //% iterate over templates/items [int]

                    html = '',                              //% temp string
                    subtree = '',                           //% temp string
                    subtreeCount = '',
                    importBtn = '',                         //% temp string
                    trimTitle = '',                         //% temp string

                    roPrefix = (isReadOnly ? 'dro' : 'dnro'),
                    leafClass,

                    formsInCategory,                        //% filtered form list
                    forForm;                                //% current form

                //  First check that everything we need is loaded - try load it if not.

                if (!formCats || !exportList) {
                    Y.log('Could not render export forms tree, not yet ready, waiting on data.', 'warn', NAME);
                    return;
                }

                //  Make a CSS tree from the categories and forms

                openCatsDisk = {};

                for (i = 0; i < formCats.length; i++) {

                    subtree = '';
                    subtreeCount = '';
                    formsInCategory = filterFormList(exportList, formCats[i].canonical, isReadOnly);
                    formCats[i].memberCount = formsInCategory.length;

                    for (j = 0; j < formsInCategory.length; j++) {

                        forForm = formsInCategory[j];

                        trimTitle = forForm.title[userLang];
                        if (trimTitle.length > maxTitleLength) {
                            trimTitle = forForm.title[userLang].substring(0, maxTitleLength) + '...';
                        }

                        if (!forForm.defaultFor) {
                            forForm.defaultFor = '';
                        }

                        leafClass = (forForm.defaultFor === '') ? 'forms-tree-leaf' : 'forms-tree-leaf-special';

                        importBtn = '<button type="button" ' +
                            'id="btnImport' + forForm._id + '" ' +
                            'style="float: right;" ' +
                            'class="btn btn-primary btn-xs"' +
                            '>Import</button>';

                        subtree = subtree +
                            '<div class="' + leafClass + '">' +
                                '<table '+ 'noborder width="100%"><tr>' +
                                '<td ' + 'valign="top">' + ico + trimTitle + ' <small>v' + forForm.version + '</small></td>' +
                                '<td ' + 'valign="top">' + importBtn + '</td>' +
                                '</tr></table>' +
                            '</div>' +
                            '<div class="forms-tree-spacer"></div>';

                    }

                    if (formCats[i].memberCount > 0) {
                        subtreeCount = ' <small>(' + formCats[i].memberCount + ')</small>';
                    }

                    subtree = '' +
                        '<div id="cbT' + roPrefix +  i + '" class="forms-tree-root">' +
                            '<span id="cbTI' + roPrefix +  i  + '">' +
                                '<i class="fa fa-folder"></i>' +
                            '</span>' +
                            '&nbsp;&nbsp;' + formCats[i][userLang] + subtreeCount +
                            '<div id="cbTC' + roPrefix +  i + '" style="display:none;">' +
                                '<div class="forms-tree-spacer"></div>' +
                                subtree +
                            '</div>' +
                        '</div>' +
                        '<div class="forms-tree-spacer"></div>';

                    openCatsDisk[roPrefix + i] = false;

                    if (formsInCategory.length > 0) {
                        html = html + subtree;
                    }
                }

                if (exportList.length > 0 && true === isReadOnly) {
                    html = html +
                        '<button class="btn" id="btnClearArchive">'+ BTN_ARC_DELETE +'</button>&nbsp;' +
                        '<button class="btn" id="btnImportAll">'+ BTN_ARC_IMPORT +'</button>';
                }

                //html = html + '<button class="btn" id="btnClearArchive">Import All</button>';

                jqCache[treeDiv].html(html);

                //  attach onClick events for form categories
                for (i = 0; i < formCats.length; i++) {
                    $('#cbT' + roPrefix +  i).off('click.forms').on('click.forms', makeCatClickHandlerDisk(i));
                }

                //  attach onClick events to form templates in tree

                for (i = 0; i < exportList.length; i++) {
                    attachDiskTemplateOnClick(exportList[i]);
                }

                //  option to clear the archive
                if (exportList.length > 0) {
                    $('#btnClearArchive').off('click.forms').on('click.forms', function () {
                        clearExports();
                    });
                    $('#btnImportAll').off('click.forms').on('click.forms', function () {
                        importAll();
                    });

                }

                /**
                 *  Add event to handle user clicking on a form template in the tree
                 *
                 *  @param  formMeta    {Object}    Form listing object
                 */

                function attachDiskTemplateOnClick(formMeta) {
                    $('#btnImport' + formMeta._id).off('click.forms').on('click.forms', function(evt) {
                        evt.stopPropagation();
                        importForm(formMeta);
                    });
                }

                function makeCatClickHandlerDisk(idx) {
                    return function() {

                        if (openCatsDisk[roPrefix + idx]) {
                            openCatsDisk[roPrefix + idx] = false;
                            $('#cbTC' + roPrefix + idx).hide();
                            $('#cbTI' + roPrefix + idx).html('<i class="fa fa-folder"></i>');
                            $('#cbT' + roPrefix + idx).addClass('forms-tree-root').removeClass('forms-tree-root-x');
                        } else {
                            openCatsDisk[roPrefix + idx] = true;
                            $('#cbTC' + roPrefix + idx).show();
                            $('#cbTI' + roPrefix + idx).html('<i class="fa fa-folder-open"></i>');
                            $('#cbT' + roPrefix + idx).addClass('forms-tree-root-x').removeClass('forms-tree-root');
                        }

                    };
                }

            }


            /**
             *  Copy a form and all of its dependencies to disk
             *
             *  @param  dbFormMeta  {Object}    A single form listing object
             *  @param  callback    {Function}  Optional, of the form fn(err, result)
             */

            function exportForm(dbFormMeta, callback) {

                function onFormExported(err, result) {
                    //  reload disk forms

                    if (callback && 'function' === typeof callback) {
                        callback(err, result);
                        return;
                    }

                    if(err) {
                        jqCache.divWaiting.html('Could not export form: ' + err);
                        return;
                    }

                    if (result.failure && result.failure.length > 0) {
                        Y.log(
                            'Form could not be completely exported, media or subforms may have been deleted: ' +
                            JSON.stringify(result.failure),
                            'warn',
                            NAME
                        );
                    }

                    //loadDiskForms();
                }

                var
                    postData = {
                        'formIds': [ dbFormMeta._id ],
                        'withHistory': $('#chkWithHistory').is(':checked')
                    };

                Y.doccirrus.comctl.privatePost('/1/formtemplate/:exportforms', postData, onFormExported);

                jqCache.divBackupDiskTreeUser.html(Y.doccirrus.comctl.getThrobber());
                jqCache.divBackupDiskTreeRO.html(Y.doccirrus.comctl.getThrobber());
            }

            /**
             *  Import a form from disk - will create a new canonical formtemplate if none exists, or else a new
             *  version and replacement of the canonical template.
             *
             *  @param  diskFormMeta    {Object}    Form list entry from disk
             *  @param  callback        {Function}  Optional, of the form fn(err, result)
             */

            function importForm(diskFormMeta, callback) {

                function onFormImported(err, result) {
                    //  reload disk forms

                    if (callback && 'function' === typeof callback) {
                        callback(err, result);
                        return;
                    }

                    if(err) {
                        jqCache.divWaiting.html('Could not import form: ' + err);
                        return;
                    }

                    if (result.failure && result.failure.length > 0) {
                        Y.log(
                            'Form could not be completely imported, media or subforms may have been deleted: ' +
                            JSON.stringify(result.failure),
                            'warn',
                            NAME
                        );
                    }

                    Y.dcforms.event.raise('onFormImported', diskFormMeta);

                    loadDBForms();
                }

                Y.dcforms.importForm(diskFormMeta._id, onFormImported);
            }

            /**
             *  Empty the archive directory
             */

            function clearExports() {
                function onClearExports(err) {
                    if (err) {
                        Y.log('Could not clear exports: ' + err);
                        return;
                    }

                    loadDiskForms();
                }

                jqCache.divBackupDiskTreeUser.html(Y.doccirrus.comctl.getThrobber());
                jqCache.divBackupDiskTreeRO.html(Y.doccirrus.comctl.getThrobber());

                Y.dcforms.clearFormExports(onClearExports);
            }

            /**
             *  Write all form templates and their dependancies to disk for archiving
             */

            function exportAll() {
                if (inBatchOp) {
                    Y.log('Cannot export form category, already in a batch operation.', 'debug', NAME);
                    return;
                }

                inBatchOp = true;

                var
                    formIds = [],
                    postData,
                    i;

                for (i = 0; i < formList.length; i++) {
                    formIds.push(formList[i]._id);
                }

                jqCache.divBackupDiskTreeUser.html(Y.doccirrus.comctl.getThrobber());
                jqCache.divBackupDiskTreeRO.html(Y.doccirrus.comctl.getThrobber());

                postData = {
                    'formIds': formIds,
                    'withHistory': $('#chkWithHistory').is(':checked')
                };

                Y.doccirrus.comctl.privatePost('/1/formtemplate/:exportforms', postData, onExportPost);

                function onExportPost(err, data) {
                    if (err) {
                        Y.log('Could not queue batch of forms for export: ' + JSON.stringify(err), 'warn', NAME);
                        return;
                    }
                    if( Y.config.debug ) {
                        Y.log('Queued batch of forms for export: ' + JSON.stringify(data), 'debug', NAME);
                    }
                }
            }

            /*
            function exportAll_legacy() {
                if (inBatchOp) {
                    Y.log('Cannot export all forms, another batch process is running.', 'debug', NAME);
                    return;
                }

                inBatchOp = true;

                Y.doccirrus.comctl.privatePost('/1/formtemplate/:exportallforms', {}, onAllExported);

                function onAllExported() {
                    Y.log('Started batch export of all forms', 'debug', true);
                }
            }
            */

            /**
             *  Import all forms from disk to current tenant
             */

            function importAll() {
                var
                    results = {},
                    toImport= [],
                    i;

                if (0 === exportList.length) {
                    return;
                }

                for (i = 0; i < exportList.length; i++) {
                    toImport.push(exportList[i]);
                }

                jqCache.divBackupDBTreeUser.html(Y.doccirrus.comctl.getThrobber());
                jqCache.divBackupDBTreeRO.html(Y.doccirrus.comctl.getThrobber());
                importNext();

                function importNext() {

                    if (0 === toImport.length) {
                        //Y.log('Imported all forms: ' + JSON.stringify(results), 'info', NAME);
                        clearProgressBar();
                        //loadDBForms();

                        //  reload thepage to update components in background
                        window.location.reload();

                        return;
                    }

                    var
                        progress = (exportList.length - toImport.length),
                        nextForm = toImport.pop();

                    importForm(nextForm, onImported);
                    setProgressBar(progress, exportList.length);

                    function onImported(err, result) {

                        if (err) {
                            Y.log('Could not import form: ' + nextForm._id + ': ' + err, 'warn', NAME);
                        } else {
                            Y.log('Imported form: ' + nextForm._id, 'info', NAME);
                            results[nextForm._id] = result;
                        }

                        importNext();
                    }
                }

            }

            /**
             *  Display a progress bar at the top of the modal (0 - max)
             *
             *  @param  value   {Number}    Current propertion
             *  @param  max     {Number}    Total work
             */

            function setProgressBar(value, max) {
                var
                    percentage = parseInt(((value / max) * 100), 10);

                jqCache.divBackupProgressBar.attr('aria-valuenow', percentage);
                jqCache.divBackupProgressBar.css('width', percentage + '%');
                jqCache.spanBackupProgressSr.html(percentage + '%');

                jqCache.divBackupProgressArea.show();
            }

            /**
             *  Temporary debugging measure to find why export is so slow
             */

            function updatePerformanceDiv() {
                var
                    total = (perfDebug.config + perfDebug.deps + perfDebug.fs),
                    report = '';

                report = report + LBL_CONFIG+': ' + perfDebug.config + 'ms (' + parseInt((perfDebug.config / total) * 100) + '%) ';
                report = report + LBL_DB_DEPENDENCES+': ' + perfDebug.deps + 'ms (' + parseInt((perfDebug.deps / total) * 100) + '%) ';
                report = report + LBL_DB_DISK+': ' + perfDebug.fs + 'ms (' + parseInt((perfDebug.fs / total) * 100) + '%) ';

                $('#divPerformance').html('<small>' + report + '</small>');
                $('#divPerformance').show();
            }

            /**
             *  Hide the progress bar when done
             */


            function clearProgressBar() {
                jqCache.divBackupProgressArea.hide();
            }

            //  EVENT HANDLERS

            /**
             *  Callback from Y.doccirrus.getFormsList - has a flat list of forms
             *
             *  @param  err         {String}    AJAX error message
             *  @param  data        {Object}    Array of form template metadata objects
             */

            function onDBFormsListLoaded(err, data) {

                if (err) {
                    //  TRANSLATEME
                    Y.doccirrus.comctl.setModal('Error', 'Could not load forms list from database');
                    return;
                }

                var
                    i;

                formList = [];

                for (i = 0 ; i < data.length; i++) {
                    //  may be filtering here in future
                    formList.push(data[i]);
                }

                renderDBFormsTree('divBackupDBTreeUser', false);
                renderDBFormsTree('divBackupDBTreeRO', true);
            }

            /**
             *  Callback from Y.doccirrus.getFormsList - has a flat list of forms
             *
             *  @param  err         {String}    AJAX error message
             *  @param  data        {Object}    Array of form template metadata objects
             */

            function onDiskFormsListLoaded(err, data) {

                if (err) {
                    //  TRANSLATEME
                    Y.doccirrus.comctl.setModal('Error', 'Could not load forms list from disk / archive');
                    return;
                }

                //  API change
                data = data.data ? data.data : data;

                var
                    i;

                if (0 === data.length) {
                    jqCache.btnDownloadArchive.addClass('disabled');
                } else {
                    jqCache.btnDownloadArchive.removeClass('disabled');
                }

                exportList = [];

                for (i = 0 ; i < data.length; i++) {
                    //  may be filtering here in future
                    exportList.push(data[i]);
                }

                renderDiskFormsTree('divBackupDiskTreeUser', false);
                renderDiskFormsTree('divBackupDiskTreeRO', true);
            }

            /**
             *  When user selects an archive file, upload it
             *
             *  note: express upload error
             *  see: https://github.com/andrewrk/node-multiparty/issues/35
             */

            function onArchiveFileSelected() {
                var postUrl = Y.doccirrus.infras.getPrivateURL('/1/formtemplate/:uploadbackup');
                jqCache.divBackupDiskTreeUser.html( Y.doccirrus.comctl.getThrobber() );
                jqCache.divBackupDiskTreeRO.html( Y.doccirrus.comctl.getThrobber() );
                jqCache.formUploadArchive.attr( 'action', postUrl ).submit();
            }

            /**
             *  Forms have been loaded from tarball, reload the disk view
             */

            function onArchiveUpload() {
                loadDiskForms();
            }

            function FormsBackupVM() {
                var
                    self = this;

                self.lblDiscUserI18n = i18n('FormEditorMojit.form_backup.LBL_DISK_USER');
                self.lblDiscDefaultI18n = i18n('FormEditorMojit.form_backup.LBL_DISK_DEFAULT');
                self.lblDbUserI18n = i18n('FormEditorMojit.form_backup.LBL_DB_USER');
                self.lblDbDefaultI18n = i18n('FormEditorMojit.form_backup.LBL_DB_DEFAULT');
                self.lblCheckboxExpI18n = i18n('FormEditorMojit.form_backup.LBL_CHECKBOX_EXP');

            }

            ko.applyBindings( new FormsBackupVM(), document.querySelector( '#divBackupContainer' ) );

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for forms_editor.js - ' + node.getAttribute('id'), 'debug', NAME);

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screws up future use of this DOM node, which we might need
            //node.destroy();
        }
    };

}