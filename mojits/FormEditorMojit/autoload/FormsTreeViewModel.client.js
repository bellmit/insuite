/**
 *  FormsTreeViewModel
 *
 *  Note that this requires knockout drag/drop plugin: /static/InvoiceMojit/assets/js/knockout_dragdrop.js
 *
 *  User: clemens
 *  Date: 4/07/19
 *  (c) 2019, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, ko */

'use strict';

YUI.add( 'FormsTreeViewModel', function( Y, NAME ) {

        /**
         * @module FormsTreeViewModel
         */

        var
            KoUI = Y.doccirrus.KoUI,
            KoViewModel = Y.doccirrus.KoViewModel,
            KoComponentManager = KoUI.KoComponentManager,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n;

        /**
         *  @class FormsTreeViewModel
         *  @constructor
         *  @extends KoViewModel
         *
         *  @param  {Object}    config
         *  @param  {Boolean}   config.isEditable           Tree only editable in form editor, default false
         *  @param  {Boolean}   config.showEmptyFolders     Form editor shows empty folders, default false
         *  @param  {Boolean}   config.showLockedForms      Show locked forms, default false
         *  @param  {Boolean}   config.debugMode            In debugMode the magic archive folder is visible, default false
         */
        function FormsTreeViewModel( config ) {
            FormsTreeViewModel.superclass.constructor.call( this, config );
        }

        Y.extend( FormsTreeViewModel, KoViewModel.getBase(), {

                //  PROPERTIES

                maxTitleLength: 37,
                textFilter: null,
                isEditable: null,
                showLockedForms: null,
                showEmptyFolders: null,
                debugMode: null,

                initializer: function FormsTreeViewModel_initializer( options ) {
                    var self = this;

                    //  CONFIGURATION

                    self.options = options;
                    self.userLang = Y.dcforms.getUserLang();
                    self.onAddForm = options.onAddForm || null;

                    //  TRANSLATIIONS

                    //self.SEARCH_PLACEHOLDER = i18n( 'FormEditorMojit.forms_tree.SEARCH_PLACEHOLDER');

                    //  OBSERVABLES

                    self.folders = ko.observableArray();
                    self.textFilter = ko.observable( '' );

                    self.isEditable = ko.observable( options.isEditable || false );
                    self.showLockedForms = ko.observable( options.showLockedForms || false );
                    self.showEmptyFolders =  ko.observable( options.showEmptyFolders || false );

                    self.useExportOnDisk = ko.observable( options.useExportOnDisk || false );

                    //  in inCase casefolder may have specific country mode, and the server can have them in general
                    //  folders for both are shown in form editor in debug mode
                    self.showGermanForms = ko.observable( options.hasOwnProperty( 'showGermanForms' ) ? options.showGermanForms : Y.doccirrus.commonutils.doesCountryModeIncludeGermany() );
                    self.showSwissForms = ko.observable( options.hasOwnProperty( 'showSwissForms' ) ? options.showSwissForms : Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() );

                    self.debugMode = ko.observable( options.debugMode || false );

                    //  filter status for forms and folders, used in updating counts on init / search
                    self.formFiltering = {};                //  dictionary of form _ids and filter status true/false
                    self.folderFilteredCount = {};          //  dictionary of folder _ids and count of filtered items

                    //  prepare ko treeview component

                    self.initTree( options );

                    //  load or apply the list of folders

                    if ( options.folders ) {
                        //  folders passed by parent
                        ko.utils.arrayPushAll( self.folders, options.folders );
                        self.updateFilteredFolderCounts();
                        self.tree.reload();
                    } else {
                        //  load folders from server
                        self.getFolders();
                    }
                },

                initTree: function( options ) {
                    var
                        self = this,
                        contextMenuArr = null;

                    if ( self.isEditable() ) {
                        contextMenuArr = [
                            {
                                disabled: ( self.onAddForm ? false : true ),
                                text: i18n( 'FormEditorMojit.forms_tree.ADD_FORM'),
                                handler: self.addForm.bind( self )
                            },
                            {
                                disabled: false,
                                text: i18n( 'FormEditorMojit.forms_tree.LBL_CREATE_FOLDER'),
                                handler: self.addFolder.bind( self )
                            },
                            {
                                disabled: false,
                                text: i18n( 'FormEditorMojit.forms_tree.EDIT_FOLDER'),
                                handler: self.editFolder.bind( self )
                            },
                            {
                                disabled: true,
                                text: i18n( 'FormEditorMojit.forms_tree.LBL_MAKE_ROOT_FOLDER'),
                                handler: self.makeRootFolder.bind( self )
                            },
                            {
                                disabled: true,
                                text: i18n( 'FormEditorMojit.forms_tree.LBL_DELETE_FOLDER'),
                                handler: self.removeFolder.bind( self )
                            }
                        ];
                    }

                    self.tree = KoComponentManager.createComponent( {
                        componentType: 'KoTree',
                        componentConfig: {
                            showActivatedIndicators: false,
                            enableDragDrop: self.isEditable(),
                            expandResolver: self.createExpandResolver(),
                            rowActionButton: self.initRowActionButton( options ),

                            resolver: function( node ) { return self.getTreeDataFolders( node ); },
                            onError: function onError( err ) {
                                Y.log( 'Error on KoTree: ' + JSON.stringify( err ), 'error', NAME );
                            },

                            onDropDone: function( sourceNode, targetNode ) {

                                //  if dragging a form from one folder to another
                                if ( sourceNode && sourceNode.entry && sourceNode.entry.formId ) {
                                    self.onDragDropForm( sourceNode, targetNode );
                                }

                                //  if dragging a folder around
                                if ( sourceNode && sourceNode.entry && sourceNode.entry.forms ) {
                                    self.onDragDropFolder( sourceNode, targetNode );
                                }
                            },

                            allowDragging: function( node ) {
                                var parent = unwrap( node.getParent() );
                                if( null === parent ) {
                                    return false;
                                }

                                return true;
                            },

                            contextMenu: contextMenuArr
                        }
                    } );

                    self.addDisposable(
                        self.selectionSubscription = self.tree.selectedNode.subscribe( function onSelectedNodeChange( newVal ) {
                            self.onSelectedNodeChanged( newVal );
                        } )
                    );
                },

                createExpandResolver: function() {
                    return function( nodeId ) {
                        return new Promise( function( resolve ) {
                            self.rules().forEach( function( rule ) {
                                if( rule._id === nodeId ) {
                                    resolve( rule );
                                }
                            });
                            resolve( null );
                        } );
                    };
                },

                initRowActionButton: function( options ) {

                    if ( options.hasExportButton ) {
                        return KoComponentManager.createComponent({
                            componentType: 'KoButton',
                            componentConfig: {
                                name: 'formTreeRowActionButton',
                                option: 'PRIMARY',
                                text: options.exportButtonLabel || 'xxx',
                                size: 'XSMALL',
                                click: function clickRowButton( btn, evt, ctx ) {
                                    if ( options.onButtonClick ) {
                                        options.onButtonClick( btn, evt, ctx );
                                    }
                                }
                            }
                        });
                    }

                    return;
                },

                destructor: function FormsTreeViewModel_destructor() {
                    //self.selectionSubscription.dispose();
                },

                /**
                 *  Public method to set the text search
                 */

                setTextFilter: function( query ) {
                    var self = this;
                    self.textFilter( query );
                    self.updateFilteredFolderCounts();
                    self.tree.reload();
                },

                /**
                 *  Called by the KoTree when expanding one level
                 *
                 *  If no node is passed then it is requesting the root of the tree
                 *
                 *  @param node
                 *  @return {Promise}
                 */

                getTreeDataFolders: function( node ) {
                    var self = this;
                    return new Promise( function( resolve ) {
                        var
                            plainFolders = self.folders(),
                            filteredTreeNodes = [],
                            form, folder,
                            openTo = null,
                            i, j;

                        if( node ) {
                            openTo = node.id;

                            //  add child folders first
                            for ( i = 0; i < plainFolders.length; i++ ) {
                                folder = plainFolders[i];

                                if ( folder.parentId === openTo && self.showFolderInContext( folder ) ) {
                                    filteredTreeNodes.push( self.mapFolderToTreeNode( folder ) );
                                }
                            }

                            //  add any forms which are directly in this folder
                            for ( i = 0; i < plainFolders.length; i++ ) {
                                folder = plainFolders[i];
                                if ( folder._id === openTo ) {
                                    for ( j = 0; j < folder.forms.length; j++ ) {

                                        form = folder.forms[j];

                                        if ( true === self.formFiltering[ form._id ] ) {
                                            //  add the form to the tree if not hidden by licence, settings or
                                            //  text search filter
                                            filteredTreeNodes.push( self.mapFormToTreeNode( form ) );
                                        }

                                    }
                                }
                            }

                        } else {

                            for ( i = 0; i < plainFolders.length; i++ ) {
                                folder = plainFolders[i];

                                if ( !folder.parentId ) {
                                    //  only add root folders to the root of the tree
                                    if ( self.showFolderInContext( folder ) ) {
                                        //  some folders are hidden according to context
                                        filteredTreeNodes.push( self.mapFolderToTreeNode( folder ) );
                                    }

                                }
                            }

                        }

                        filteredTreeNodes.sort( function compareAlphabetical(a, b) {
                            //  subfolders above forms (have en property)
                            if ( a.entry.en && !b.entry.en ) {
                                return -1;
                            }

                            //  subfolders above forms (have en property)
                            if ( b.entry.en && !a.entry.en ) {
                                return 1;
                            }

                            var
                                aText = a.text.toLowerCase(),
                                bText = b.text.toLowerCase();

                            if ( aText < bText ) {
                                return -1;
                            }
                            if ( aText > bText ) {
                                return 1;
                            }
                            return 0;
                        } );

                        resolve( filteredTreeNodes );
                    } );
                },

                /**
                 *  Folders may be hidden because of context:
                 *
                 *      (*) being empty
                 *      (*) country mode
                 *      (*) license
                 *      (*) magic archive folder
                 *
                 *  @param  {Object}    folder
                 */

                showFolderInContext: function( folder ) {
                    var
                        self = this,
                        hasSwissCountryMode = -1 !== folder.countryMode.indexOf( 'CH' ),
                        hasGermanCountryMode = -1 !== folder.countryMode.indexOf( 'D' ),
                        SERVICE_INSPECTORAPO = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORAPO,
                        SERVICE_INSPECTORDOC = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOC,
                        SERVICE_INSPECTORDOCSOLUI = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOCSOLUI,
                        staticFolderIds = {
                            inSpectorForms: '000000000000000000000700',
                            recipesForms: '000000000000000000000606',
                            archiveFolder: '000000000000000000000608',
                            recoveryFolder: '000000000000000000000699'
                        },
                        countryModeMatch = false;

                    //  Archiv folder is only shown in debug mode
                    if( folder._id === staticFolderIds.archiveFolder && !self.debugMode() ) {
                        return false;
                    }

                    //  Recovery folder only shown in debug mode
                    if( folder._id === staticFolderIds.recoveryFolder && !self.debugMode() ) {
                        return false;
                    }

                    //  empty folders are shown in inForm, but not most other contexts
                    if( !self.showEmptyFolders() && 0 === self.folderFilteredCount[folder._id] ) {
                        return false;
                    }

                    /**
                     * if InSpectorAPO is activated:
                     *      ALL folders should be FILTERED, and ONLY those related to InSpector should be shown
                     *      (to not confuse the pharmacist users with the physician forms)
                     */
                    if( Y.doccirrus.auth.hasAdditionalService( SERVICE_INSPECTORAPO ) ) {
                        return [
                                   staticFolderIds.inSpectorForms,
                                   staticFolderIds.recipesForms
                               ].indexOf( folder._id ) !== -1 || self.debugMode();
                    }

                    /**
                     * if InSpectorDOC is activated:
                     *      the InSpector forms folder should be visible,
                     * else
                     *      the InSpector forms folder should be hidden (not of interest for the common user)
                     */
                    if( folder._id === staticFolderIds.inSpectorForms ) {
                        return Y.doccirrus.auth.hasAdditionalService( SERVICE_INSPECTORDOC ) || Y.doccirrus.auth.hasAdditionalService( SERVICE_INSPECTORDOCSOLUI ) || self.debugMode();
                    }

                    //  at least one country mode must match the context
                    if( self.showSwissForms() && hasSwissCountryMode ) {
                        countryModeMatch = true;
                    }

                    if( self.showGermanForms() && hasGermanCountryMode ) {
                        countryModeMatch = true;
                    }

                    if( !countryModeMatch ) {
                        return self.debugMode();
                    }

                    //  if a licence is required for this folder, check that we have it
                    if( folder.licence && '' !== folder.licence ) {
                        if( !Y.doccirrus.auth.hasSpecialModule( folder.licence ) ) {
                            return self.debugMode();
                        }
                    }

                    return true;
                },

                /**
                 *  For each form in each folder, check if it matches filters / licence / settings
                 *  Then for each root folder, count filtered items in this and its subfolders recursively
                 */

                updateFilteredFolderCounts: function() {
                    var
                        self = this,
                        plainFolders = self.folders(),
                        folder, form,
                        i, j;

                    //  for each form in each folder, check if form is filtered

                    for ( i = 0; i < plainFolders.length; i++ ) {
                        folder = plainFolders[i];

                        for ( j = 0;  j < folder.forms.length; j++ ) {
                            form = folder.forms[j];
                            self.formFiltering[ form._id ] = self.isFormFiltered( form );
                        }

                    }

                    //  for each root folder, count filtered forms in the folder and any subfolders

                    for ( i = 0; i < plainFolders.length; i++ ) {
                        folder = plainFolders[i];

                        if ( !folder.parentId ) {
                            self.countFilteredChildItems( folder );
                        }
                    }

                },

                /**
                 *  Check if a single form matches current settings / filters
                 *
                 *  @param  {Object}    form    A form meta
                 *  @return {Boolean}
                 */

                isFormFiltered: function( form ) {
                    var
                        self = this,
                        txt, parts, i;

                    if ( self.showLockedForms() !== form.isReadOnly ) {
                        return false;
                    }

                    if ( !self.textFilter ) {
                        return true;
                    }

                    //  text search filter uses space delimited search terms which must all match form title
                    txt = form.title.de + ' ' + form.title.en;
                    txt = txt.toLowerCase();
                    parts = self.textFilter().toLowerCase().split( ' ' );

                    for ( i = 0; i < parts.length; i++ ) {
                        if ( parts[i] !== '' ) {
                            if ( -1 === txt.indexOf( parts[i] ) ) {
                                //  search term not found in this form
                                return false;
                            }
                        }
                    }

                    return true;
                },

                /**
                 *  Count the number of forms in a folder and its subfolders which match all filters
                 *
                 *      (*) doccirrus / customer forms
                 *      (*) licence restrictions
                 *      (*) text filter
                 *
                 *  @param  {Object}    filter
                 */

                countFilteredChildItems: function( folder ) {
                    var
                        self = this,
                        total= 0,
                        i, form, subfolder;

                    //  count all forms directly in this folder
                    for ( i = 0; i < folder.forms.length; i++ ) {
                        form = folder.forms[i];
                        if ( true === self.formFiltering[ form._id ] ) {
                            total = total + 1;
                        }
                    }

                    //  repeat for all subfolders
                    for ( i = 0; i < folder.subfolders.length; i++ ) {
                        subfolder = self.getFolderById( folder.subfolders[i] );
                        if ( subfolder ) {
                            self.countFilteredChildItems( subfolder );
                            total = total + self.folderFilteredCount[ subfolder._id ];
                        }
                    }

                    //  store on global object, collected by caller in recursion
                    self.folderFilteredCount[ folder._id ] = total;
                },

                /**
                 *  Utility to look up subfolders
                 *  @param folderId
                 */

                getFolderById: function( folderId ) {
                    var
                        self = this,
                        plainFolders = self.folders(),
                        i;

                    for ( i = 0; i < plainFolders.length; i++ ) {
                        if ( plainFolders[i]._id === folderId ) {
                            return plainFolders[i];
                        }
                    }

                    return null;
                },

                /**
                 *  Make a tree node template given a form folder
                 *
                 *  @param      {Object}    folder
                 *  @returns    {Object}    tree node template
                 */

                mapFolderToTreeNode: function( folder ) {
                    var
                        self = this,
                        useTitle = folder[ self.userLang ];

                    if ( useTitle.length > self.maxTitleLength ) {
                        useTitle = useTitle.substr( 0, self.maxTitleLength ) + '...';
                    }

                    return {
                        id: folder._id,
                        text: useTitle,
                        totalCount: self.folderFilteredCount[ folder._id ],
                        entry: folder,
                        children: true,
                        leaf: true,
                        expanded: false //self.isExpanded( folder._id )
                    };
                },

                /**
                 *  Return true if a folder is held open, otherwise false
                 *  @param folderId
                 */

                isExpanded: function( folderId ) {
                    var self = this, i;

                    for ( i =  0; i < self.tree.openNodes.length; i++ ) {
                        if ( self.tree.openNodes[i].entry &&  self.tree.openNodes[i].entry._id === folderId ) {
                            return true;
                        }
                    }

                    return false;
                },

                mapFormToTreeNode: function( form ) {
                    var
                        self = this,
                        useTitle = form.title[ self.userLang ];

                    if ( useTitle.length > self.maxTitleLength ) {
                        useTitle = useTitle.substr( 0, self.maxTitleLength ) + '...';
                    }

                    return {
                        id: form._id,
                        text: useTitle,
                        totalCount: 0,
                        entry: form,
                        children: false,
                        leaf: true,
                        bgColor: ( form.defaultFor ? 'rgba(110, 210, 110, 0.5)' : 'white' )
                    };
                },

                onSelectedNodeChanged: function( newVal ) {
                    if ( !newVal || !newVal.entry || !newVal.entry.formId ) {
                        return;
                    }
                    var self = this;
                    Y.log( 'Form selected in tree: ' + newVal.entry.formId, 'debug', NAME );
                    if ( self.options.onSelect ) {
                        self.options.onSelect( newVal.entry );
                    }
                },

                /**
                 *  Launch a modal to edit folder properties
                 *
                 *  @param treeItem
                 *  @param evt
                 */

                editFolder: function( treeItem ) {
                    var
                        self = this,
                        folder = self.getContainingFolder( treeItem );

                    Y.doccirrus.modals.editFolder.show( { folder: folder, onUpdate: onFolderEdited } );

                    function onFolderEdited( changedFolder ) {
                        var plainFolders = self.folders(), i;
                        for ( i = 0; i < plainFolders.length; i++ ) {
                            if ( plainFolders[i]._id === changedFolder._id ) {
                                plainFolders[i] = changedFolder;
                                self.tree.reload();
                            }
                        }
                    }
                },

                makeRootFolder: function( treeItem ) {
                    var
                        self = this,
                        folder = self.getContainingFolder( treeItem ),
                        updateArgs = {
                            query: { _id: folder && folder._id },
                            data: { parentId: '', fields_: 'parentId' }
                        };

                    if ( !folder ) {
                        Y.log( 'Could not resolve folder for tree item.', 'error', NAME );
                        return;
                    }

                    Y.doccirrus.jsonrpc.api.formfolder.put( updateArgs ).then( onMovedToRoot ).fail( onUpdateFailed );

                    function onMovedToRoot( /* result */ ) {
                        folder.parentId =  '';
                        self.tree.reload();
                    }

                    function onUpdateFailed( err ) {
                        Y.log( 'Could not move folder ' + folder._id + ' to root: ' + JSON.stringify( err ), 'error', NAME );
                    }
                },

                /**
                 *  Create a new folder from the right click menu, only ask for name, further properties can be
                 *  changed in the edit modal.
                 *
                 *  @param treeNode
                 */

                addFolder: function( treeNode ) {
                    var
                        self = this,
                        folder = self.getContainingFolder( treeNode ),
                        postArgs = {
                            parentId: ( folder ? folder._id : '' )
                        };

                    //  Prompt user for a folder name

                    Y.doccirrus.DCWindow.prompt( {
                        'title': i18n( 'FormEditorMojit.forms_tree.LBL_CREATE_FOLDER'),
                        'defaultValue': '',
                        'callback': onNameChosen
                    } );

                    function onNameChosen( evt ) {
                        var title = evt.data && evt.data.trim();

                        if ( !title || '' === title ) {
                            return;
                        }

                        postArgs.title = title;

                        Y.doccirrus.jsonrpc.api.formfolder.addFolder( postArgs )
                            .then( function() {
                                self.getFolders();
                            } )
                            .fail( function( err ) {
                                Y.log( 'could not add folder. Error: ' + JSON.stringify( err ), 'debug', NAME );
                            } );
                    }

                },

                /**
                 *  Add a new form to this folder
                 */

                addForm: function( treeNode ) {
                    var self = this,
                        folder = self.getContainingFolder( treeNode );

                    if ( self.onAddForm && folder ) {
                        self.onAddForm( folder );
                    }
                },

                /**
                 *  Given a tree node which may be a folder or a form, return the folder associated with it
                 *  @param treeNode
                 */

                getContainingFolder: function( treeNode ) {
                    if ( !treeNode || !treeNode.entry ) { return null; }

                    var
                        self = this,
                        plainFolders = self.folders(),
                        entry = treeNode.entry,
                        folder = null, i;

                    //  if the user right clicked a form, not a folder, find the form which contains it
                    if ( entry.formFolderId ) {
                        for ( i = 0; i < plainFolders.length; i++ ) {
                            if ( entry.formFolderId === plainFolders[i]._id ) {
                                folder = plainFolders[i];
                            }
                        }
                    } else {
                        folder = entry;
                    }

                    return folder;
                },

                /**
                 *  Event to remove a folder raised by context menu
                 */

                removeFolder: function( treeNode ) {
                    var
                        self = this,
                        folder = self.getContainingFolder( treeNode );

                    //  default folder, cannot be deleted or renamed
                    if ( !folder || folder.isDefault ) {
                        Y.doccirrus.DCWindow.notice( {
                            message: i18n( 'FormEditorMojit.forms_tree.NO_DELETE_DEFAULTS')
                        } );
                        return;
                    }

                    Y.doccirrus.jsonrpc.api.formfolder.removeFolder( { _id: folder._id } )
                        .then( function() {
                            self.getFolders();
                        } )
                        .fail( function( err ) {
                            Y.log( 'could not remove folder. Error: ' + JSON.stringify( err ), 'debug', NAME );
                        } );
                },

                getFolders: function() {
                    var self = this;

                    if ( !self.useExportOnDisk() ) {
                        Y.doccirrus.jsonrpc.api.formfolder.getFoldersWithForms()
                            .then( onLoadFolders )
                            .fail( onLoadFoldersError );
                    } else {
                        Y.doccirrus.jsonrpc.api.formfolder.getExportedFoldersWithForms()
                            .then( onLoadFolders )
                            .fail( onLoadFoldersError );
                    }

                    function onLoadFolders( res ) {
                        self.folders.removeAll();
                        //  leave out the default archive folder unless in debug mode, magic
                        if ( !self.debugMode() ) {
                            res.data = res.data.filter( function( folder ) {
                                return folder._id !== Y.doccirrus.schemas.formfolder.archivFolderId;
                            } );
                        }

                        ko.utils.arrayPushAll( self.folders, res.data );
                        self.updateFilteredFolderCounts();
                        self.tree.reload();
                    }

                    function onLoadFoldersError( err ) {
                        Y.log( 'could not get folders. Error: ' + JSON.stringify( err ), 'debug', NAME );
                    }
                },

                /**
                 *  Recursively get all formIds for a folder and its subfolders
                 *  @param folderId
                 */

                getFormIdsForFolder: function( folderId, showLockedForms ) {
                    var
                        self = this,
                        folder = self.getFolder( folderId ),
                        formIds = [],
                        i;

                    if ( !folder ) {
                        Y.log( 'Could not find form folder: ' + folderId, 'error', NAME );
                        return [];
                    }

                    for ( i = 0; i < folder.forms.length; i++ ) {
                        if (folder.forms[i].isReadOnly === showLockedForms) {
                            formIds.push( folder.forms[i]._id );
                        }
                    }

                    for ( i = 0; i < folder.subfolders.length; i++ ) {
                        formIds = formIds.concat( self.getFormIdsForFolder( folder.subfolders[i], showLockedForms ) );
                    }

                    return formIds;
                },
                /**
                 *  Recursively get all formIds for a folder and its subfolders and parentFolders
                 *  @param  folderId {String}
                 *  @paran showLockedForms {Boolean} filter isReadOnly forms
                 */

                getFormIdsAndFoldersInfo: function( folderId, showLockedForms ) {
                    var self = this,
                    subFoldersInfo = collectSubfolders(folderId),
                        parentFoldersInfo = [];

                    subFoldersInfo.forEach( function( info ) {
                        if (info.parentId && !subFoldersInfo.some(function( conf ) {
                                return conf.formFolderId === info.parentId;
                            })) {
                            parentFoldersInfo = parentFoldersInfo.concat(self.collectParentFolderInfo(info.parentId));
                        }
                    });

                    return parentFoldersInfo.concat(subFoldersInfo);

                    function collectSubfolders( folderId ) {
                        var
                            folder = self.getFolder( folderId ),
                            subFoldersInfo = [],
                            i;

                        if ( !folder ) {
                            Y.log( 'Could not find form folder: ' + folderId, 'error', NAME );
                            return [];
                        }

                        for ( i = 0; i < folder.forms.length; i++ ) {
                            if (folder.forms[i].isReadOnly === showLockedForms) {
                                subFoldersInfo.push( { formId: folder.forms[i]._id,
                                    formFolderId: folder._id,
                                    parentId: folder.parentId,
                                    formFolderTitles:  {
                                        de: folder.de,
                                        en: folder.en
                                    }} );
                            }
                        }


                        for ( i = 0; i < folder.subfolders.length; i++ ) {
                            subFoldersInfo = subFoldersInfo.concat( collectSubfolders( folder.subfolders[i], showLockedForms ) );
                        }

                        return subFoldersInfo;
                    }
                },

                /**
                 *  Recursively get all  parentFolders ids and titles
                 *  @param folderId
                 */
                collectParentFolderInfo: function( folderId ) {
                    var self = this,
                        folder = self.getFolder(folderId),
                        parentFoldersInfo = [];
                    if (!folder) {
                        return [];
                    }

                    parentFoldersInfo.push( {
                        formId: "",
                        formFolderId: folder._id,
                        parentId: folder.parentId,
                        formFolderTitles:  {
                            de: folder.de,
                            en: folder.en
                        }} );

                    if (folder.parentId) {
                        parentFoldersInfo = parentFoldersInfo.concat(self.collectParentFolderInfo(folder.parentId));
                    }

                    return parentFoldersInfo.reverse();
                },


                /**
                 *  Get a folder from the array given its _id
                 *  @param folderId
                 */

                getFolder: function( folderId ) {
                    var
                        self = this,
                        plainFolders = self.folders(),
                        i;

                    for ( i = 0; i < plainFolders.length; i++ ) {
                        if ( plainFolders[i]._id === folderId ) {
                            return plainFolders[i];
                        }
                    }

                    return null;
                },

                /**
                 *  Recursively list parents of a folder
                 *
                 *  Used to prevent drag-drop of a parent into a child folder
                 *
                 *  @param      {Object}    folder
                 *  @returns    {Object}    array of folder _ids
                 */

                listParents: function( folder ) {
                    var
                        self = this,
                        plainFolders = self.folders(),
                        ancestors = [],
                        i;

                    if ( !folder.parentId ) { return ancestors; }

                    ancestors.push( folder.parentId );
                    for ( i = 0; i < plainFolders.length; i++ ) {
                        if ( folder.parentId === plainFolders[i]._id ) {
                            ancestors = ancestors.concat( self.listParents( plainFolders[i] ) );
                        }
                    }

                    return ancestors;
                },

                //  EVENT HANDLERS

                /**
                 *  Raised when a form is dropped
                 *
                 *  @param  {Object}    sourceNode
                 *  @param  {Object}    targetNode
                 */

                onDragDropForm: function( sourceNode, targetNode ) {
                    var
                        self = this,
                        formMeta = sourceNode.entry,
                        newFolder = self.getContainingFolder( targetNode );

                    if ( newFolder._id ) {
                        formMeta.parentId = newFolder._id;
                    } else {
                        //  forms cannot be dragged into root
                        return false;
                    }


                    Y.doccirrus.jsonrpc.api.formfolder.moveForm( { formId: formMeta._id, formFolderId: newFolder._id } )
                        .then( onFormMoved )
                        .fail( onFormMoveErr );

                    function onFormMoved() {
                        self.getFolders();
                    }

                    function onFormMoveErr( err ) {
                        Y.log( 'could not move form. Error: ' + JSON.stringify( err ), 'debug', NAME );
                    }
                },

                /**
                 *  Raised when a folder is dropped
                 *
                 *  @param  {Object}    sourceNode
                 *  @param  {Object}    targetNode
                 */

                onDragDropFolder: function( sourceNode, targetNode ) {
                    var
                        self = this,
                        folder = self.getContainingFolder( sourceNode ),
                        newParent = self.getContainingFolder( targetNode ),
                        newParentAncestors = self.listParents( newParent );

                    //  MOJ-11871 Prevent parent from being dragged into child folder, prevent circular reference
                    if ( -1 !== newParentAncestors.indexOf( folder._id ) ) {
                        Y.log( 'Cannot drag parent folder into child, circular reference.', 'warn', NAME );
                        self.getFolders();
                        return;
                    }

                    if ( newParent._id && folder._id !== newParent._id ) {
                        folder.parentId = newParent._id;
                    } else {
                        folder.parentId = '';
                    }

                    Y.doccirrus.jsonrpc.api.formfolder.updateFolder( folder )
                        .then( onFolderMoved )
                        .fail( onFolderMoveErr );

                    function onFolderMoved() {
                        self.getFolders();
                    }

                    function onFolderMoveErr( err ) {
                        Y.log( 'could not update folder. Error: ' + JSON.stringify( err ), 'debug', NAME );
                    }

                }

            },
            {
                NAME: 'FormsTreeViewModel'
            }
        );

        KoViewModel.registerConstructor( FormsTreeViewModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'formfolder-schema',
            'editfolder-modal'
        ]
    }
);
