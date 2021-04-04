 /**
  * Modal to replace forms_backup with new nested forms tree
  *
  * User: strix
  * Date: 14/08/2019
  * (c) 2018, Doc Cirrus GmbH, Berlin
  */

'use strict';

/*eslint prefer-template:0, strict:0 */
/*global YUI, async, $, ko, moment */

YUI.add( 'formimportexport-modal', function( Y, NAME ) {

        /**
         *  ViewModel for binding form folder trees and export options
         */

        var
            i18n = Y.doccirrus.i18n,
            WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_LARGE + 200,
            WINDOW_HEIGHT = 200,

            KoViewModel = Y.doccirrus.KoViewModel,
            Disposable = KoViewModel.getDisposable(),
            FormsTreeModel = KoViewModel.getConstructor( 'FormsTreeViewModel' );

        function ImportExportViewModel( config ) {
            ImportExportViewModel.superclass.constructor.call( this, config );
        }

        Y.extend( ImportExportViewModel, Disposable, {

            //  properties

            //  setup and teardown

            initializer: function( options ) {
                var self = this;

                self.options = options;

                self.inBatchOp = ko.observable( false );
                self.inBatchTotal = ko.observable( 100 );
                self.inBatchProgress = ko.observable( 0 );

                self.inBatchPercentage = ko.computed( function() {
                    return parseInt( ( ( self.inBatchProgress() / self.inBatchTotal() ) * 100), 10);
                } );

                self.inBatchPercentageStr = ko.computed( function() {
                    return self.inBatchPercentage() + '%';
                } );

                self.exportVersions = ko.observable( false );

                self._initTranslations();
                self._initButtonandlers();
                self._initFormTrees();
                self._initWsEvents();
                self._initUploadListener();
            },

            _initTranslations: function() {
                var self = this;
                self.lblDiscUserI18n = i18n('FormEditorMojit.form_backup.LBL_DISK_USER');
                self.lblDiscDefaultI18n = i18n('FormEditorMojit.form_backup.LBL_DISK_DEFAULT');
                self.lblDbUserI18n = i18n('FormEditorMojit.form_backup.LBL_DB_USER');
                self.lblDbDefaultI18n = i18n('FormEditorMojit.form_backup.LBL_DB_DEFAULT');
                self.lblCheckboxExpI18n = i18n('FormEditorMojit.form_backup.LBL_CHECKBOX_EXP');

                self.formSearchPlaceholder = i18n('FormEditorMojit.forms_tree.SEARCH_PLACEHOLDER');

                self.BTN_ARC_EXPORT = i18n('FormEditorMojit.fe.view.BTN_ARC_EXPORT');
                self.BTN_ARC_IMPORT = i18n('FormEditorMojit.fe.view.BTN_ARC_IMPORT');
                self.BTN_ARC_DELETE = i18n('FormEditorMojit.fe.view.BTN_ARC_DELETE');
            },

            /**
             *  Self is different when raised from binder
             *  @private
             */

            _initButtonandlers: function() {

                var self = this;

                self.btnImportAll = function() {
                    //TODO: add handlig custom folders
                    var
                        self = this,
                        folders = self.diskTreeUser.folders(),
                        formIds = [],
                        i ,j;

                    for ( i = 0; i < folders.length; i++ ) {
                        for ( j = 0; j < folders[i].forms.length; j++ ) {
                            formIds.push( folders[i].forms[j].formId );
                        }
                    }

                    self.importBatch( formIds );
                };

                self.btnExportAll = function() {
                    var
                        folders = self.formsTreeDefault.folders(),
                        formIds = self.getDbFormIds( folders ),

                        postData = {
                            'formIds': formIds,
                            'withHistory': self.exportVersions()
                        };

                    Y.doccirrus.jsonrpc.api.formtemplate.exportforms( postData ).then( onExportForms ).fail( onExportError );

                    function onExportForms( data ) {
                        Y.log('Queued batch of forms for export: ' + JSON.stringify(data), 'debug', NAME);
                    }

                    function onExportError( err ) {
                        Y.log('Could not queue batch of forms for export: ' + JSON.stringify(err), 'warn', NAME);
                    }

                };

                self.btnClearArchive = function() {
                    Y.dcforms.clearFormExports(onClearExports);
                    function onClearExports() {
                        Y.log( 'Cleared form export directory.', 'info', NAME );
                        self.diskTreeUser.getFolders();
                        self.diskTreeDefault.getFolders();
                    }
                };
            },

            /**
             *  Create form trees for database amd disk forms
             */

            _initFormTrees: function() {
                var self = this;

                self.formsTreeUser = new FormsTreeModel({
                    showLockedForms: false,
                    showEmptyFolders: false,
                    isEditable: false,
                    hasExportButton: true,
                    exportButtonLabel: 'Export',
                    isUserForm: true,
                    debugMode: self.options.debugMode,
                    onButtonClick: function( btn, evt, ctx  ) {
                      var showLockedForms = false;
                      return onFormTreeSelection( btn, evt, ctx, showLockedForms);
                    }
                });

                self.formsTreeDefault = new FormsTreeModel({
                    showLockedForms: true,
                    showEmptyFolders: false,
                    isEditable: false,
                    hasExportButton: true,
                    exportButtonLabel: 'Export',
                    debugMode: self.options.debugMode,
                    onButtonClick: function(btn, evt, ctx) {
                        var showLockedForms = true;
                        return onFormTreeSelection( btn, evt, ctx, showLockedForms);
                    }
                });

                self.diskTreeUser = new FormsTreeModel({
                    showLockedForms: false,
                    showEmptyFolders: false,
                    isEditable: false,
                    hasExportButton: true,
                    exportButtonLabel: 'Import',
                    useExportOnDisk: true,
                    debugMode: self.options.debugMode,
                    onButtonClick: function(btn, evt, ctx) {
                        var showLockedForms = false;
                        onDiskTreeSelection(btn, evt, ctx, showLockedForms);
                    }
                });

                self.diskTreeDefault = new FormsTreeModel({
                    showLockedForms: true,
                    showEmptyFolders: false,
                    isEditable: false,
                    hasExportButton: true,
                    exportButtonLabel: 'Import',
                    useExportOnDisk: true,
                    debugMode: self.options.debugMode,
                    onButtonClick:  function(btn, evt, ctx) {
                        var showLockedForms = true;
                        onDiskTreeSelection(btn, evt, ctx, showLockedForms);
                    }
                });

                self.formSearchText = ko.observable( '' );

                self.formSearchListener = self.formSearchText.subscribe( function( query ) {
                    self.formsTreeUser.setTextFilter( query );
                    self.formsTreeDefault.setTextFilter( query );
                } );

                self.diskSearchText = ko.observable( '' );

                self.diskSearchListener = self.diskSearchText.subscribe( function( query ) {
                    self.diskTreeUser.setTextFilter( query );
                    self.diskTreeDefault.setTextFilter( query );
                } );

                function onFormTreeSelection( btn, evt, ctx, showLockedForms ) {
                    var
                        entry = ctx && ctx.$parent && ctx.$parent.entry ? ctx.$parent.entry : null,
                        postData = {
                            'formIds': [],
                            'withHistory': self.exportVersions()
                        };

                    evt.originalEvent.stopPropagation();
                    if ( !entry ) { return; }

                    //  exporting a folder
                    if ( entry.forms ) {
                        postData.formIds = self.formsTreeDefault.getFormIdsForFolder( entry._id, showLockedForms );
                    }

                    //  exporting a single form
                    if ( entry.formId ) {
                        postData.formIds.push( entry._id );
                    }

                    Y.doccirrus.jsonrpc.api.formtemplate.exportforms( postData ).then( onExportForms ).fail( onExportError );

                    function onExportForms( data ) {
                        Y.log('Queued batch of forms for export: ' + JSON.stringify(data), 'debug', NAME);
                    }

                    function onExportError( err ) {
                        Y.log('Could not queue batch of forms for export: ' + JSON.stringify(err), 'warn', NAME);
                    }
                }

                function onDiskTreeSelection( btn, evt, ctx, showLockedForms ) {
                    var
                        entry = ctx && ctx.$parent && ctx.$parent.entry ? ctx.$parent.entry : null,
                        formIds = [];

                    evt.originalEvent.stopPropagation();
                    if ( !entry ) { return; }

                    //  importing a folder, add foorms from subfolders recursively
                    if ( entry.forms ) {
                        formIds = self.diskTreeUser.getFormIdsForFolder( entry._id, showLockedForms );
                    }

                    //  importing a single form
                    if ( entry.formId ) {
                        formIds.push( entry.formId );
                    }

                    self.importBatch( formIds );
                }

            },

            _initWsEvents: function() {
                var self = this;

                self.perfDebug = {                           //  performance measures
                    'config': 0,
                    'deps': 0,
                    'fs': 0
                };

                self.performanceReport = ko.observable( '' );

                Y.doccirrus.communication.on( {
                    event: 'formExportAction',
                    socket: Y.doccirrus.communication.getSocket( '/' ),
                    done: function onFormExportMessage( message ) {
                        var data = message.data && message.data[0];

                        switch(data.status) {
                            case 'startBatch':
                                self.inBatchOp( true );
                                self.inBatchTotal( data.requested * 2 );
                                self.inBatchProgress( 0 );

                                //jqCache.divBackupDiskTreeUser.html(Y.doccirrus.comctl.getThrobber());
                                //jqCache.divBackupDiskTreeRO.html(Y.doccirrus.comctl.getThrobber());

                                //setProgressBar(inBatchProgress, inBatchTotal);
                                break;

                            case 'start':
                                self.inBatchProgress( self.inBatchProgress() + 1);
                                //setProgressBar(inBatchProgress, inBatchTotal);
                                break;

                            case 'done':

                                if (data.performance) {
                                    self.perfDebug.config = self.perfDebug.config + (data.performance.config || 0);
                                    self.perfDebug.deps = self.perfDebug.deps + (data.performance.deps || 0);
                                    self.perfDebug.fs = self.perfDebug.fs + (data.performance.fs|| 0);
                                    updatePerformanceText();
                                }

                                //  exportAll does not send start events
                                if (data.double) {
                                    self.inBatchProgress( self.inBatchProgress() + 1 );
                                }

                                self.inBatchProgress( self.inBatchProgress() + 1);
                                //setProgressBar(inBatchProgress, inBatchTotal);
                                break;

                            case 'endBatch':
                                if ( self.perfDebug.deps > 0 ) {
                                    updatePerformanceText();
                                }

                                self.diskTreeUser.getFolders();
                                self.diskTreeDefault.getFolders();

                                //clearProgressBar();
                                self.inBatchOp( false );
                                break;

                        }

                    },
                    handlerId: 'formExportActionHandler'
                } );

                function updatePerformanceText() {
                    var
                        total = (self.perfDebug.config + self.perfDebug.deps + self.perfDebug.fs),
                        report = '';

                    report = report + self.LBL_CONFIG + ': ' + self.perfDebug.config + 'ms (' + parseInt( (self.perfDebug.config / total ) * 100, 10 ) + '%) ';
                    report = report + self.LBL_DB_DEPENDENCES + ': ' + self.perfDebug.deps + 'ms (' + parseInt( (self.perfDebug.deps / total ) * 100, 10 ) + '%) ';
                    report = report + self.LBL_DB_DISK + ': ' + self.perfDebug.fs + 'ms (' + parseInt( (self.perfDebug.fs / total) * 100, 10 ) + '%) ';

                    self.performanceReport( report );
                }
            },

            _initUploadListener: function() {
                var
                    self = this,
                    jqIframe = $( '#iframeUploadTarget' );

                jqIframe.off( 'load' ).on( 'load', onIframeLoaded );

                function onIframeLoaded() {
                    self.diskTreeUser.getFolders();
                    self.diskTreeDefault.getFolders();
                }
            },

            destructor: function() {
                //var self = this;
                // unsubscribe ws events here
                Y.doccirrus.communication.off( 'formExportAction', 'formExportActionHandler' );
            },

            //  methods

            /**
             *  Get the _id of every form available in the tree
             */

            getDbFormIds: function( folders ) {
                var
                    folder,
                    formIds = [],
                    i, j;

                for ( i = 0; i < folders.length; i++ ) {
                    folder = folders[i];
                    for ( j = 0; j < folder.forms.length; j++ ) {
                        formIds.push( folder.forms[j]._id );
                    }
                }

                return formIds;
            },

            /**
             *  Improt a set of forms, given an array of form _ids from the export folder
             *
             *  @param  {Object}    formIds
             */

            importBatch: function( formIds ) {
                var self = this;

                self.inBatchOp( true );
                self.inBatchProgress( 0 );
                self.inBatchTotal( formIds.length );
                //Sort by parentId from top do down

                async.eachSeries( formIds, importSingleForm, onAllDone );

                function importSingleForm( formId, itcb ) {
                    Y.dcforms.importForm( formId, onFormImported );

                    function onFormImported( err /*, result */ ) {
                        if ( err ) {
                            Y.log( 'Problem importing form: ' + JSON.stringify( err ), 'error', NAME );
                            //  continue with other forms
                        }

                        self.inBatchProgress( self.inBatchProgress() + 1 );
                        itcb();
                    }
                }

                function onAllDone() {
                    self.inBatchOp( false );
                    self.formsTreeUser.getFolders();
                    self.formsTreeDefault.getFolders();

                    //  tell the parent
                    if ( self.options  && self.options.onImport ) {
                        self.options.onImport();
                    }
                }
            }

            //  event handlers

        } );

        /**
         *  Modal to edit form folders
         *
         *  @param  config                      {Object}
         *  @param  config.onImport             {Function}  Called when changes to the folder are saved to the server
         *  @param  config.onRequestDownload    {Function}  Parent handles this for legacy reasons, may be removed
         *  @param  config.onCloseDialog        {Function}  Refresh the forms lists when done
         */

        function show( config ) {
            var
                node = Y.Node.create( '<div></div>' ),

                importExportVM,
                modal,

                btnUpload = {
                    name: 'UPLOAD',
                    label: i18n( 'FormEditorMojit.formimportexport_modal.BTN_UPLOAD' ),
                    isDefault: true,
                    action: function() { onUploadButtonClick(); }
                },

                btnDownload = {
                    name: 'DOWNLOAD',
                    label: i18n( 'FormEditorMojit.formimportexport_modal.BTN_DOWNLOAD' ),
                    isDefault: true,
                    action: function() { onDownloadButtonClick(); }
                },

                btnCancel = {
                    name: 'CANCEL',
                    label: i18n( 'FormEditorMojit.formimportexport_modal.BTN_CANCEL' ),
                    isDefault: true,
                    action: onCancelButtonClick
                },

                buttonSet = [ btnCancel, btnUpload, btnDownload ];

            async.series(
                [
                    loadJade,
                    createModal
                ],
                onModalReady
            );

            //  X. Load modal jade template (stub)
            function loadJade( itcb ) {
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'formimportexport_modal',
                    'FormEditorMojit',
                    {},
                    node,
                    itcb
                );
            }

            //  X. Instantiate the modal
            function createModal( itcb ) {
                var
                    importExportVM = new ImportExportViewModel( config );
                    modal = new Y.doccirrus.DCWindow( {
                        id: 'DCWindow-TablePropertiesDialog',
                        className: 'DCWindow-TablePropertiesDialog',
                        bodyContent: node,
                        title: i18n( 'FormEditorMojit.formimportexport_modal.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_INFO,

                        width: WINDOW_SIZE,
                        minHeight: WINDOW_HEIGHT,
                        minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,

                        maximizable: true,
                        centered: true,
                        modal: true,

                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: buttonSet
                        },
                        after: {
                            visibleChange: function( evt ) { onVisibilityChange( evt ); }
                        }
                    } );

                ko.applyBindings( importExportVM, $('#divImportExportContainer')[0] );

                itcb( null );
            }

            //  Event handlers

            /**
             *  Raised after modal is created
             *
             *  @param err
             */

            function onModalReady( err ) {
                if ( err ) {
                    Y.log( 'Could not set printer modal: ' + JSON.stringify( err ), 'warn', NAME );
                }
            }

            /**
             *  Download button - force download of tgz archive via iframe on parent
             *  For legacy reasons the caller provides this div to keep a hidden iframe
             */

            function onDownloadButtonClick() {
                var
                    dateStr = moment().format('YYYY-MM-DD_H-mm-ss'),
                    fileName = 'forms-export-' + dateStr + '.tar.gz',
                    tgzUrl = Y.doccirrus.infras.getPrivateURL('/tgz/' + fileName);

                $('#divFormsDownloadBackup').html(
                    '<iframe src="' + tgzUrl + '" width="5px" height="5px" frameborder="no"></iframe>'
                );
            }

            /**
             *  Upload button
             *  For legacy reasons, a file element is provided by the caller
             */

            function onUploadButtonClick() {
                Y.log('Add upload dialog here.', 'debug', NAME);
                var
                    jqForm = $('#formUploadArchive'),
                    jqFile = $('#fileUploadArchive');

                jqForm.attr( 'action', Y.doccirrus.infras.getPrivateURL( '/1/formtemplate/:uploadbackup' ) );
                jqFile.off( 'change' ).on( 'change', onFileChange ).click();

                function onFileChange() {
                    jqForm.submit();
                }

            }

            /**
             *  User pressed the cancel button, just close the modal
             *  Future: might delete the cached PDF here on a timeout, will be cleared on next restart
             */

            function onCancelButtonClick() {
                modal.close();
            }

            /**
             *  Raised when window is opened or closed
             */

            function onVisibilityChange( evt ) {
                //  refresh the tress in the parent

                if( !evt.newVal ) {
                    if ( config && config.onCloseDialog ) {
                        config.onCloseDialog();
                    }
                    if ( importExportVM ) {
                        importExportVM.dispose();
                    }
                    ko.cleanNode( node.getDOMNode() );
                }

            }

        }

        Y.namespace( 'doccirrus.modals' ).formImportExport = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'dcforms-utils'
        ]
    }
);