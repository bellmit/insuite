/**
 * User: do
 * Date: 15/01/16  12:51
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, $ */
'use strict';

YUI.add( 'dcRuleSetTree', function( Y, NAME ) {

        var unwrap = ko.utils.unwrapObservable,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            i18n = Y.doccirrus.i18n;

        function fail( response ) {
            var
                errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

            if( errors.length ) {
                Y.Array.invoke( errors, 'display' );
            }
        }

        function mapEntryToTreeNode( entry ) {
            return {
                id: entry._id,
                text: entry.isDirectory ? entry.name : entry.description,
                totalCount: entry.totalCount,
                entry: entry,
                children: Boolean( entry.isDirectory ),
                leaf: Boolean( !entry.isDirectory )
            };
        }

        function filterLicensed( entry, isMasterTenant ) {
            var DOQUVIDEparent = Y.doccirrus.schemas.rule.getDOQUVIDEDirId(),
                DQSparent = Y.doccirrus.schemas.rule.getDQSDirId(),
                DcSZparent = Y.doccirrus.schemas.rule.getDcSZId(),
                DcPKVparent = Y.doccirrus.schemas.rule.getDcPKVId(),
                EBMparent = Y.doccirrus.schemas.rule.getEBMDirId(),
                CARDIOparent = Y.doccirrus.schemas.rule.getCARDIODirId(),
                PEDIAparent = Y.doccirrus.schemas.rule.getPEDIADirId(),
                TARMEDparent = Y.doccirrus.schemas.rule.getTarmedId(),
                TARMEDUVGparent = Y.doccirrus.schemas.rule.getTarmedUVGId(),
                TARMEDOthersParent = Y.doccirrus.schemas.rule.getTarmedOthersId(),
                DOQUVIDElicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE ) || false,
                DQSlicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DQS ) || false,
                CARDIOlicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO ) || false,
                PEDIAlicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.PEDIA ) || false,
                isSwitzMode = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() || false,
                entryID = entry._id.toString();

            if(
                (entryID === DOQUVIDEparent && false === DOQUVIDElicense) ||
                (entryID === CARDIOparent && false === CARDIOlicense) ||
                (entryID === DQSparent && false === DQSlicense) ||
                (entryID === PEDIAparent && false === PEDIAlicense) ||
                (entryID === TARMEDparent && false === isSwitzMode && !isMasterTenant) ||
                (entryID === TARMEDUVGparent && false === isSwitzMode && !isMasterTenant) ||
                (entryID === TARMEDOthersParent && false === isSwitzMode && !isMasterTenant) ||
                (entryID === DcSZparent && isSwitzMode && !isMasterTenant) ||
                (entryID === DcPKVparent && isSwitzMode && !isMasterTenant) ||
                (entryID === EBMparent && isSwitzMode && !isMasterTenant)
            ){
                return false;
            }
            return true;
        }

        function createGetData( api, options ) {
            var
                that = this,
                isMasterDCFormTenant = that && that.options && that.options.isMasterDCFormTenant || options && options.isMasterDCFormTenant;
            return function( node ) {
                return new Promise( function( resolve, reject ) {
                    var query = {};
                    if( !node ) {
                        query.parent = null;
                        query.isDirectory = true;
                    } else {
                        query.parent = node.id;
                    }
                    api( {
                        query: query,
                        options: {
                            sort: {
                                _id: 1,
                                isDirectory: -1
                            }
                        }
                    } )
                        .then( function( response ) {
                            return (response && response.data || []).filter( function(entry){ return filterLicensed( entry, isMasterDCFormTenant); } ).map( mapEntryToTreeNode );
                        } )
                        .then( resolve )
                        .fail( function( response ) {
                            reject( response );
                        } );
                } );
            };
        }

        function getFilteringResolver( options ) {
            return function( node ) {
                return new Promise( function( resolve, reject ) {

                    options.id = ((!node) ? null : node.id);

                    Y.doccirrus.jsonrpc.api.rule.getFiltered( options ).then( function( response ) {
                        return (response && response.data && Array.isArray(response.data) && response.data || []).map( mapEntryToTreeNode );
                    } ).then( resolve ).fail( function( response ) { reject( response ); } );
                } );
            };
        }

        function editName( currentValue, callback ) {

            var node = Y.Node.create( '<div></div>' ),
                modal;

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'editTreeNodeName',
                'IncaseAdminMojit',
                {},
                node,
                function() {

                    var model = {
                        name: ko.observable( currentValue || '' )
                    };

                    modal = new Y.doccirrus.DCWindow( {
                        bodyContent: node,
                        title: null === currentValue ? 'Verzeichnis erstellen' : 'Verzeichnis umbenennen',
                        type: 'info',
                        width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                {
                                    name: 'save',
                                    label: 'Speichern',
                                    isDefault: true,
                                    action: function() {
                                        modal.close();
                                        callback( null, model.name() );
                                    }
                                }
                            ]
                        }
                    } );

                    ko.applyBindings( model, node.one( '#editTreeNodeName' ).getDOMNode() );
                }
            );

        }

        function RuleSetTree( options ) {
            var self = this;

            self.isImporting = ko.observable( false );
            self.isRegenerating = ko.observable( false );
            self.progressBarStatus = ko.observable( 0 );
            self.progressBarText = ko.observable( i18n( 'IncaseAdminMojit.rules.tree.importExport_load' ) );
            self.options = options || {};
            self.rules = ( self.options && self.options.rules ) || [];

            Promise.resolve( Y.doccirrus.jsonrpc.api.rule.importFromCatalog( {
                checkOnly: true
            } ) )
            .then( function( result ) {
                self.isImporting( result.data.status === 'PROCESSING' );
            } )
            .catch( function() {
                self.isImporting( false );
            } );

            Y.doccirrus.communication.on( {
                event: 'ruleImport',
                done: function( results ) {
                    if( results.data[0].text ){
                        self.progressBarText( results.data[0].text );
                    }
                    if( results.data && results.data[0] && results.data[0].status === 'processing' ) {
                        self.isImporting( true );
                        self.progressBarStatus( results.data[0].percents );
                    }
                    var dcDirectoryId, children;
                    if( results.data && results.data[0] && results.data[0].status === 'done' ) {

                        self.progressBarStatus( 100 );

                        dcDirectoryId = Y.doccirrus.schemas.rule.getDirectoryIdByCatalogShort();
                        children = self.tree.root.children();

                        children.some( function( node ) {
                            if( dcDirectoryId === node.id ) {
                                node.unload( { keepSelection: true } );
                                return true;
                            }
                        } );

                        self.isImporting( false );
                    }
                }
            } );

            function createExpandResolver() {
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
            }

            function createGetDataRules() {
                return function( node ) {
                    return new Promise( function( resolve ) {
                        var filter = null,
                            filteredRules;
                        if( node ) {
                            filter = node.id;
                        }
                        filteredRules = self.rules().filter( function( rule ) {
                            return rule.parent === filter && rule.isDirectory === true;
                        });
                        if( !filter ) {
                            filteredRules = filteredRules.filter( function( rule ) {
                                return rule.isDirectory === true;
                            });
                        }
                        resolve( filteredRules.filter( filterLicensed ).map( mapEntryToTreeNode ) );
                    } );
                };
            }

            function createDirectory( node, event, close ) {
                var parentNode = node.isLeaf() ? node.getParent() : node,
                    parentId = parentNode.id,
                    errorMessage,
                    isLocked = parentNode.isLocked(),
                    that = this, // jshint ignore:line
                    isMasterDCFormTenant = that && that.options && that.options.isMasterDCFormTenant;

                if( isLocked && !isMasterDCFormTenant ) {
                    errorMessage = Y.doccirrus.errorTable.getMessage( { code: '24002' } );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: errorMessage,
                        window: { width: 'small' }
                    } );
                    return;
                }

                editName( null, function( err, name ) {
                    if( err ) {
                        return;
                    }
                    Y.doccirrus.jsonrpc.api.rule.createDirectory( {
                        parentId: parentId,
                        directoryName: name
                    } ).done( function( response ) {
                        var entry = response && response.data && response.data[0];
                        if( entry ) {
                            parentNode.expand().addChild( mapEntryToTreeNode( entry ) ).expand();
                        }
                    } )
                        .fail( fail )
                        .always( close );
                } );
            }

            function changeName( node, event, close ) {
                var id = node.id,
                    currentName = unwrap( node.text ),
                    errorMessage,
                    isLocked = node.isLocked(),
                    that = this, // jshint ignore:line
                    isMasterDCFormTenant = that && that.options && that.options.isMasterDCFormTenant;

                if( node.isLeaf() ) {
                    return;
                }

                if( isLocked && !isMasterDCFormTenant ) {
                    errorMessage = Y.doccirrus.errorTable.getMessage( { code: '24002' } );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: errorMessage,
                        window: { width: 'small' }
                    } );
                    return;
                }

                editName( currentName, function( err, name ) {
                    if( err || !name ) {
                        return;
                    }

                    Y.doccirrus.jsonrpc.api.rule.renameRuleSetOrDirectory( {
                        nodeId: id,
                        nodeName: name
                    } ).done( function( response ) {
                        var data = response && response.data;

                        if( data ) {
                            node.text( node.isLeaf() ? data.description : data.name );
                            node.entry = data;
                        }
                    } )
                        .fail( fail )
                        .always( close );
                } );
            }

            function changeActiveState( node, state, close ) {
                Y.doccirrus.jsonrpc.api.rule.activate( {
                    ruleId: node.id,
                    isActive: state
                } ).done( function() {
                    var parent = node.isDirectory() ? node : node.parent;
                    parent.unload( { keepSelection: true } );
                } )
                    .fail( fail )
                    .always( close );
            }

            function changeLockState( node, state, close ) {
                Y.doccirrus.jsonrpc.api.rule.lock( {
                    ruleId: node.id,
                    isLocked: state
                } ).done( function() {
                    var parent = node.isDirectory() ? node : node.parent;
                    parent.unload( { keepSelection: true } );
                } )
                    .fail( fail )
                    .always( close );
            }

            function activate( node, event, close ) {
                /*jshint validthis:true */
                changeActiveState.call( this, node, true, close );
            }

            function deactivate( node, event, close ) {
                /*jshint validthis:true */
                changeActiveState.call( this, node, false, close );
            }

            function lock( node, event, close ) {
                /*jshint validthis:true */
                changeLockState.call( this, node, true, close );
            }

            function unlock( node, event, close ) {
                /*jshint validthis:true */
                changeLockState.call( this, node, false, close );
            }

            function remove( node, event, close ) {
                var isLeaf = node.isLeaf(),
                    modal,
                    that = this, // jshint ignore:line
                    isMasterDCFormTenant = that && that.options && that.options.isMasterDCFormTenant;

                close();
                function doRemove() {

                    var promise = Promise.resolve( true );
                    if( node.id ) {
                        if( isLeaf ) {
                            promise = Promise.resolve( Y.doccirrus.jsonrpc.api.rule.delete( {
                                query: {
                                    _id: node.id
                                }
                            } ) );
                        } else {
                            promise = Promise.resolve( Y.doccirrus.jsonrpc.api.rule.deleteDirectory( {
                                directoryId: node.id
                            } ) );
                        }
                    }

                    promise.then( function() {
                        var parent = node.parent;
                        if( parent ) {
                            parent.unload( { keepSelection: true } );
                        }
                    } ).catch( fail );

                }

                var isTop = !(node.parent && node.parent.text());
                if( isLeaf && !node.isLocked() && !isTop ) {
                    doRemove();
                } else if( isTop || (node.isLocked() && !isMasterDCFormTenant) ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'warn',
                        message: 'Dieser Bereich kann nicht gelöscht werden!',
                        window: { width: 'small' }
                    } );
                } else {
                    modal = Y.doccirrus.DCWindow.notice( {
                        type: 'warn',
                        message: 'Alle Einträge in diesem Verzeichnis werden gelöscht.',
                        window: {
                            width: 'small',
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    {
                                        name: 'delete',
                                        label: 'Löschen',
                                        isDefault: true,
                                        action: function() {
                                            if( modal && modal.close ) {
                                                modal.close();
                                            }
                                            doRemove();
                                        }
                                    }
                                ]
                            }
                        }
                    } );

                }
            }

            function onError( err ) {
                fail( err );
            }

            function isDisabled( node /*, event */ ){
                /*jshint unused:false*/
                if(!node){
                    return true;
                }
                var parentNode = node.isLeaf() ? node.getParent() : node,
                    isLocked = parentNode.isLocked(),
                    isMasterDCFormTenant = this && this.options && this.options.isMasterDCFormTenant;
                return isLocked && !isMasterDCFormTenant;
            }

            function isDelete( node /*, event */ ){
                /*jshint unused:false*/
                if(!node){
                    return true;
                }
                var isLocked = node.isLocked(),
                    isMasterDCFormTenant = this && this.options && this.options.isMasterDCFormTenant;
                return isLocked && !isMasterDCFormTenant;
            }

            function isNotCopy( node /*, event */ ){
                /*jshint unused:false*/
                if(!node || !node.isLeaf()){
                    return true;
                }
                return false;
            }

            var isMasterDCFormTenant = this && this.options && this.options.isMasterDCFormTenant,
                contextMenuArr = [
                {
                    disabled: isDisabled.bind( self ),
                    text: i18n( 'IncaseAdminMojit.rules.contextMenu.newRule' ),
                    handler: self.createRuleSet.bind( self )
                },
                {
                    disabled: isNotCopy.bind( self ),
                    text: i18n( 'IncaseAdminMojit.rules.contextMenu.copyRule' ),
                    handler: self.copyRuleSet.bind( self )
                },
                {
                    disabled: isDisabled.bind( self ),
                    text: i18n( 'IncaseAdminMojit.rules.contextMenu.newDirectory' ),
                    handler: createDirectory.bind( self )
                },
                {
                    disabled: isDisabled.bind( self ),
                    text: i18n( 'IncaseAdminMojit.rules.contextMenu.renameDirectory' ),
                    handler: changeName.bind( self )
                },
                {
                    text: i18n( 'IncaseAdminMojit.rules.contextMenu.activate' ),
                    handler: activate
                },
                {
                    text: i18n( 'IncaseAdminMojit.rules.contextMenu.deactivate' ),
                    handler: deactivate
                },
                {
                    disabled: isDelete.bind( self ),
                    text: i18n( 'IncaseAdminMojit.rules.contextMenu.delete' ),
                    handler: remove.bind( self )
                }
            ];

            if(isMasterDCFormTenant){
                contextMenuArr.push({
                    text: i18n( 'IncaseAdminMojit.rules.contextMenu.lock' ),
                    handler: lock
                },
                {
                    text: i18n( 'IncaseAdminMojit.rules.contextMenu.unlock' ),
                    handler: unlock
                });
            }

            this.tree = KoComponentManager.createComponent( {
                componentType: 'KoTree',
                componentConfig: {
                    showActivatedIndicators: true,
                    resolver: createGetDataRules(),
                    expandResolver: createExpandResolver(),
                    onError: onError,
                    enableDragDrop: true,
                    onDropDone: function( sourceNode, targetNode ) {
                        var targetNodeParent = targetNode.isLeaf() ? targetNode.getParent() : targetNode;
                        return Y.doccirrus.jsonrpc.api.rule.moveRuleSetOrDirectory( {
                            sourceId: sourceNode.id,
                            targetId: targetNodeParent.id
                        } );
                    },
                    allowDragging: function( node ) {
                        var parent = unwrap( node.getParent() );
                        if( null === parent ) {
                            return false;
                        }
                        return !node.isLocked() || self.options.isMasterDCFormTenant;
                    },
                    contextMenu: contextMenuArr
                }
            } );

        }


        RuleSetTree.prototype.createRuleSet = function( node, event, close ) {
            var self = this,
                errorMessage,
                parentNode = node.isLeaf() ? node.getParent() : node,
                parentId = parentNode.id,
                isLocked = parentNode.isLocked(),
                defaultRuleSet = Y.doccirrus.schemas.rule.getDefaultRuleSet( { directoryId: parentId } ),
                isMasterDCFormTenant = this && this.options && this.options.isMasterDCFormTenant;

            if( isLocked && !isMasterDCFormTenant) {
                errorMessage = Y.doccirrus.errorTable.getMessage( { code: '24002' } );
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: errorMessage,
                    window: { width: 'small' }
                } );
                return;
            }
            if( ko.utils.peekObservable( parentNode.expanded ) ){
                self.tree.selectedNode( parentNode.addChild( mapEntryToTreeNode( defaultRuleSet ) ) );
            } else {
                parentNode.expand( function(){
                    self.tree.selectedNode( parentNode.addChild( mapEntryToTreeNode( defaultRuleSet ) ) );
                } );
            }
            close();
        };

        RuleSetTree.prototype.copyRuleSet = function( node, event, close ) {
            var self = this,
                parentNode = node.isLeaf() ? node.getParent() : node,
                entry = node.entry,
                dcDir = Y.doccirrus.schemas.rule.getDcDirId();

            function traverseUp( item ){
                var parent = item && item.entry && item.entry.parent;
                if(  dcDir === parent || null === parent ){
                    return item;
                }
                if( 'function' === typeof item.getParent ){
                    return traverseUp( item.getParent() );
                }
                return item;
            }

            Y.doccirrus.modals.selectRuleParentModal.showDialog( {
                currentParent: traverseUp(parentNode).entry,
                filterLicensed: filterLicensed
            } ).then( function(result){
                if( result && true !== result.confirmed ){
                    return close();
                }


                var newParent = self.tree.root.getNodeById( result.selected );
                if(!newParent){ //try one level nested
                    newParent = self.tree.root.getNodeById( Y.doccirrus.schemas.rule.getDcDirId() );
                    if(!newParent.loaded){
                        self.tree.load( newParent, gotSubFolder );
                    } else {
                        gotSubFolder();
                    }
                } else {
                    gotFolder();
                }
                function gotSubFolder() {
                    newParent = newParent.getNodeById( result.selected );
                    gotFolder();
                }
                function gotFolder(){
                    if(!newParent){ //destination folder not found
                        return close();
                    }
                    if(!newParent.loaded){
                        self.tree.load( newParent, addNew );
                    } else {
                        addNew();
                    }

                    function addNew(){
                        newParent.expand();
                        entry.parent = result.selected;
                        entry.isLocked = false;

                        delete entry._id;
                        entry.description = ((entry.description) ? entry.description + ' ' : '' ) + 'Kopie';
                        (entry.rules || []).map( function(rule){
                            rule.ruleId = (new Y.doccirrus.mongo.ObjectId()).toString();
                            (rule.actions || []).map( function(action){
                                if(action.template){
                                    action.template.tempateID = (new Y.doccirrus.mongo.ObjectId()).toString();
                                }
                                return action;
                            });
                            return rule;
                        });

                        if( newParent && entry ) {
                            Promise.resolve( Y.doccirrus.jsonrpc.api.rule.create( {
                                data: entry
                            } ) )
                            .then( function(response) {
                                if( response && Array.isArray(response.data) && response.data[0] ) {
                                    node.id = response.data[0];
                                    entry._id = response.data[0];
                                }
                                self.tree.selectedNode( newParent.addChild( mapEntryToTreeNode( entry ) ) );
                                self.tree.loadAndExpandById( entry );
                                close();
                            } )
                            .catch( fail );
                        } else {
                            close();
                        }
                    }
                }
            });
        };

        RuleSetTree.prototype.importFromCatalog = function( catalogShort ) {
            var
                self = this;

            Y.doccirrus.DCWindow.confirm( {
                message: i18n('IncaseAdminMojit.rules.warnMessage', { data: { catalogShort: catalogShort } } ),
                callback: function( result ) {
                    if( !result.success ) {
                        return;
                    }
                    self.isImporting( true );
                    Y.doccirrus.jsonrpc.api.rule.importFromCatalog( {
                        catalogShort: catalogShort
                    } );
                }
            } );
        };

        RuleSetTree.prototype.showRegenerateDialog = function() {
            var
                self = this;

            function processRegenerate(err, result ) {
                if( err && self.isImporting()) {
                    self.isImporting( false );
                    return;
                }
                if( result.action === 'start') {
                    Promise.resolve( Y.doccirrus.jsonrpc.api.ruleimportexport.docCirrusReloadRegenerate( {
                        caseFolders: result.caseFolders,
                        deletingLogStrategy: result.deletingLogStrategy,
                        actTypes: result.actTypes,
                        tenants: result.tenants,
                        actStatus: result.actStatus,
                        patientId: result.patientId,
                        timestamp: result.timestamp,
                        locationId: result.locationId
                    } ) )
                        .then( function() {
                            self.progressBarText( i18n( 'IncaseAdminMojit.rules.tree.importExport_load' ) );
                            self.isImporting( true );
                        } )
                        .catch( function() {
                            self.isImporting( false );
                        } );
                }
            }

            Y.doccirrus.modals.ruleRegenerateModal.show({
                callback: processRegenerate
            } );
        };

        RuleSetTree.prototype.showExportImportDialog = function() {
            var
                self = this,
                node = Y.Node.create( '<div></div>' ),
                importExportModel = new Y.doccirrus.RuleImportExport.create( {
                    exportConfig: {
                        resolver: createGetData.call( self, Y.doccirrus.jsonrpc.api.ruleimportexport.listSetOnDB ),
                        enableDragDrop: false
                    },
                    importConfig: {
                        resolver: createGetData.call( self, Y.doccirrus.jsonrpc.api.ruleimportexport.listSetOnDisk ),
                        enableDragDrop: false
                    },
                    jsonRpcApiImportExport: Y.doccirrus.jsonrpc.api.ruleimportexport,
                    metaDataFileName: 'rules_meta.json',
                    fileNamePrefix: 'rules-'
                } ),
                importExportWindow = null,
                downloadDisabled;

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'RuleImportExport',
                'IncaseAdminMojit',
                {},
                node,
                function templateLoaded() {
                    importExportWindow = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-Rule-Import-Export',
                        bodyContent: node,
                        title: i18n( 'IncaseAdminMojit.rules.tree.importExportTitle' ),
                        icon: Y.doccirrus.DCWindow.ICON_WARN,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: Y.doccirrus.DCWindow.SIZE_LARGE,
                        minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                        centered: true,
                        maximizable: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CLOSE' ),
                                {
                                    name: 'downloadRules',
                                    classNames: 'btn-primary',
                                    label: i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.DOWNLOAD_ARCHIVE' ),
                                    action: function() {
                                        importExportModel.downloadArchive();
                                    }
                                },
                                {
                                    name: 'uploadRules',
                                    template: '<button type="button" />',
                                    classNames: 'btn-primary',
                                    label: i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.UPLOAD_ARCHIVE' ),
                                    action: function() {
                                        importExportModel.uploadArchive();
                                    }
                                }
                            ]
                        },
                        after: {
                            visibleChange: function( yEvent ) {
                                if( !yEvent.newVal ) {
                                    downloadDisabled.dispose();
                                    ko.cleanNode( node.getDOMNode() );
                                    importExportModel.dispose();
                                }

                                if( unwrap( importExportModel.someChangesWasMaid ) ) {
                                    self.tree.reload();
                                }
                            }
                        }
                    } );

                    // Since I can't found the possibility to create the buttons already with an icons, add the icons after the buttons are added.
                    var downloadRulesBtn = $( 'button[name=downloadRules]' ),
                        uploadRulesBtn = $( 'button[name=uploadRules]' );

                    downloadRulesBtn.html( '<i class="fa fa-chevron-circle-down"></i> ' + downloadRulesBtn.html() );
                    uploadRulesBtn.html( '<i class="fa fa-chevron-circle-up"></i> ' + uploadRulesBtn.html() );

                    downloadDisabled = ko.computed( function() {
                        var
                            download = importExportWindow.getButton( 'downloadRules' ).button,
                            children = importExportModel.importTree.root.children();

                        if( 0 === children.length ) {
                            download.disable();
                        } else {
                            download.enable();
                        }
                    } );

                    ko.applyBindings( importExportModel, node.getDOMNode() );
                }
            );
        };

        Y.namespace( 'doccirrus' ).RuleSetTree = {

            name: NAME,

            create: function( options) {
                return new RuleSetTree( options );
            },
            getFilteringResolver: getFilteringResolver,
            getOriginalResolver: function( options ){
                return createGetData( Y.doccirrus.jsonrpc.api.rule.read, options );
            }
        };
    },
    '0.0.1', {
        requires: [
            'DCWindow',
            'KoUI',
            'KoComponentManager',
            'dcRuleImportExport',
            'KoTree',
            'dcruleregeneratemodal',
            'DCSelectRuleParentModal'
        ]
    }
);


