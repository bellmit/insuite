/*jslint anon:true, sloppy:true, nomen:true*/
/* global YUI, ko */

'use strict';

YUI.add( 'KoTree', function( Y, NAME ) {

    Y.namespace( 'doccirrus.KoUI' );

    var
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap,
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' );

    function isFunction( val ) {
        return 'function' === typeof val;
    }

    // https://stackoverflow.com/questions/880512/prevent-text-selection-after-double-click
    // Will look out for better solution. Here text is selected for a short period.
    function clearSelection() {
        var sel;
        if( document.selection && document.selection.empty ) {
            document.selection.empty();
        } else if( window.getSelection ) {
            sel = window.getSelection();
            sel.removeAllRanges();
        }
    }

    function KoTree() {
        KoTree.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTree,
        extends: KoComponent,
        openNodes: [],
        descriptors: {
            componentType: 'KoTree',
            itemsComponentType: 'KoTreeItem',

            init: function() {
                var self = this;

                KoTree.superclass.init.apply( self, arguments );

                if( unwrap( self.enableDragDrop ) && !isFunction( self.onDropDone ) ) {
                    throw Error( 'you must define a onDrop function if enableDragDrop is set to "true"!' );
                }

                self.openNodes = [];

                this.root = KoComponentManager.createComponent( {
                    componentType: self.itemsComponentType,
                    componentConfig: {
                        tree: this,
                        children: true === unwrap( self.remote ) ? true : [],
                        expanded: true
                    }
                } );

                if( true === unwrap( self.remote ) ) {
                    this.load( this.root );
                }
            },

            setDataMapper: function( node/*, level*/ ) {
                return {
                    id: node._id,
                    text: node.name || 'n/a',
                    totalCount: 0,
                    entry: node,
                    expanded: true,
                    children: node.children ? [] : false
                };
            },

            setData: function( data, mapper ) {
                var self = this;

                function walk( currentItemModel, arr, level ) {
                    arr.forEach( function( nodeData ) {
                        var
                            newChild,
                            item = (mapper || self.setDataMapper)( nodeData, level );
                        newChild = currentItemModel.addChild( item );
                        if( newChild !== currentItemModel && nodeData.children && nodeData.children.length ) {
                            walk( newChild, nodeData.children, level + 1 );
                        }
                    } );
                }

                // clear current tree
                self.root.children( [] );

                walk( self.root, data, 0 );
            },

            load: function( node, done ) {

                var self = this,
                    children = unwrap( node.children );

                if( null === children || node.loaded ) {
                    if( isFunction( done ) ) {
                        return done( node );
                    }
                    return;
                }

                node.loading( true );

                return Promise.resolve( self.resolver( this.root === node ? null : node ) )
                    .then( function( children ) {
                        node.children( (Array.isArray( children ) && children || []).map( function( data ) {
                            data.parent = node;
                            data.tree = self;
                            return KoComponentManager.createComponent( {
                                componentType: self.itemsComponentType,
                                componentConfig: data
                            } );
                        } ) );

                        if( isFunction( self.onLoaded ) ) {
                            self.onLoaded();
                        }

                        node.loading( false );
                        node.loaded = true;
                        if( 'function' === typeof done ) {
                            return done( node );
                        }
                    } )
                    .catch( function( err ) {
                        if( isFunction( done ) ) {
                            done();
                        }
                        if( isFunction( self.onError ) ) {
                            self.onError( err );
                        } else {
                            throw err;
                        }
                    } ).then( function() {
                        return self;
                    } );
            },
            
            isSelectable: function( node ) {
                return node.isLeaf();
            },

            onClick: function( node, event ) {
                var
                    self = this,
                    isDblClick = 'dblclick' === event.type,
                    useToggleToExpand = unwrap( node.tree.useToggleToExpand ),
                    isToggle = 'ko-tree-toggle' === event.target.className || 'ko-tree-toggle' === event.target.parentElement.className;

                if( event ) {
                    event.stopPropagation();
                    event.preventDefault();
                }

                if( (isToggle && useToggleToExpand) || isDblClick) {
                    if( isDblClick ) {
                        clearSelection();
                    }

                    node.toggleExpand();

                    //  self in this context is a KoTreeItem
                    self.tree.updateOpenNodes( node );

                    return;
                }

                var children = unwrap( node.children ),
                    selectedNode = node.tree.selectedNode();

                if( node.tree.isSelectable( node ) ) {
                    node.tree.selectedNode( node !== selectedNode ? node : null );
                }

                if( null === children ) {
                    // TODOOO
                    return;
                }
                if( !useToggleToExpand ) {
                    node.toggleExpand();
                    //  self in this context is a KoTreeItem
                    self.tree.updateOpenNodes( node );
                }
            },

            /**
             *  Keep track of which folders/entries are open, so that we can keep them open through updates to data
             *
             *  (eg, when creating / changing form folders)
             *
             *  @param node
             */

            updateOpenNodes: function( node ) {
                var self = this;

                if( node.expanded() ) {
                    if( !self.openNodes.find( function( openNode ) {
                        return node.id === openNode.id;
                    } ) ) {
                        self.openNodes.push( node );
                    }
                } else {
                    self.openNodes = self.openNodes.filter( function( check ) {
                        return (check.id !== node.id);
                    } );
                }
            },

            onContextMenu: function( node, event ) {
                var
                    contextMenu;

                if( !node.tree.contextMenu ) {
                    return;
                }

                event.stopPropagation();
                event.preventDefault();

                contextMenu = new Y.doccirrus.DCContextMenu( {
                    menu: node.tree.contextMenu.map( function( config ) {
                        return new Y.doccirrus.DCContextMenuItem( {
                            text: config.text,
                            disabled: config.disabled && 'function' === typeof config.disabled && config.disabled.call( node.tree, node, event ) || false,
                            click: function() {
                                config.handler.call( node.tree, node, event, contextMenu.close.bind( contextMenu ) );
                            }
                        } );

                    } )
                } );

                contextMenu.showAt( event.pageX, event.pageY );
            },

            reload: function( cb ) {
                this.root.loaded = false;
                this.load( this.root, cb );
            },

            move: function( sourceNode, targetNode ) {
                var sourceNodeParent = sourceNode.getParent(),
                    targetNodeParent = targetNode.isLeaf() ? targetNode.getParent() : targetNode;

                sourceNodeParent.removeChild( sourceNode );

                if( targetNodeParent.loaded ) {
                    targetNodeParent.addChild( sourceNode );
                }
            },

            onDrop: function( node, targetNode ) {
                var
                    self = this;

                if( true !== unwrap( self.data.tree.enableDragDrop ) ) {
                    return;
                }

                if( isFunction( targetNode.tree.onDropDone ) ) {
                    Promise.resolve( targetNode.tree.onDropDone( node, targetNode ) )
                        .then( function() {
                            targetNode.tree.move( node, targetNode );
                        } )
                        .catch( function( err ) {
                            if( isFunction( targetNode.tree.onError ) ) {
                                targetNode.tree.onError( err );
                            } else {
                                throw err;
                            }
                        } );
                }
            },

            onDragEnter: function( event, node, targetNode ) {
                if( true !== unwrap( this.data.tree.enableDragDrop ) ) {
                    return;
                }
                targetNode.tree.currentDropTarget( targetNode );
            },

            onDragLeave: function( event, oldTargetNode ) {
                if( true !== unwrap( this.data.tree.enableDragDrop ) ) {
                    return;
                }
                var current = unwrap( oldTargetNode.tree.currentDropTarget );
                if( oldTargetNode === current ) {
                    oldTargetNode.tree.currentDropTarget( null );
                }
            },

            onDragStart: function( node ) {
                if( true !== unwrap( this.data.tree.enableDragDrop ) ) {
                    return;
                }
                if( true === unwrap( this.data.tree.allowDragging ) ) {
                    return true;
                }
                if( isFunction( this.data.tree.allowDragging ) ) {
                    return this.data.tree.allowDragging( node );
                }
                return false;
            },

            deselectAll: function() {
                this.selectedNode( null );
            },

            /**
             * Allows to automatically select and expand a path
             * to a tree entry even if a deep child
             * @param {Object} entry DB entry object
             */
            loadAndExpandById: function( entry ) {
                if( !this.expandResolver ) {
                    Y.log( 'expandResolver should be set to use this function!', 'error', NAME );
                    return;
                }

                var
                    self = this,
                    nodeIds = [],
                    parentId = entry.parent;

                /**
                 * Load  all folders chain to get the entry leaf
                 * @param {String} ruleFolderId Id of the folder to load the rules from
                 */
                function getFolderChain( ruleFolderId ) {
                    self.expandResolver( ruleFolderId )
                        .then( function( nodeFolder ) {
                            if( nodeFolder && nodeFolder._id){
                                nodeIds.push( nodeFolder._id );
                            }
                            if( nodeFolder.parent ) {
                                getFolderChain( nodeFolder.parent );
                            } else {
                                processNodesIds();
                            }
                        } );
                }

                /**
                 *  Expand the all loaded nodes from nodeIds array
                 *  until we get the final item
                 */
                function processNodesIds() {

                    var
                        node = self.root,
                        nodeLoadedCount = 0,
                        loadedNode;

                    nodeIds.reverse();

                    function loadNode() {
                        var foundNode;
                        self.load( node.getNodeById( nodeIds[nodeLoadedCount] ), function( newLoadedNode ) {
                            loadedNode = node.getNodeById( nodeIds[nodeLoadedCount] );

                            if( !unwrap( loadedNode.expanded ) ) {
                                loadedNode.expand();
                            }

                            node = newLoadedNode;
                            if( (++nodeLoadedCount ) < nodeIds.length ) {
                                loadNode();
                            } else {
                                if( loadedNode.isLeaf() ) {
                                    loadedNode.tree.selectedNode( node );
                                } else {
                                    foundNode = loadedNode.getNodeById( entry._id );
                                    if( foundNode && foundNode.elements && foundNode.elements() && foundNode.elements()[0] && foundNode.elements()[0].scrollIntoView ) {
                                        foundNode.elements()[0].scrollIntoView();
                                    }
                                    loadedNode.tree.selectedNode( foundNode );
                                }
                            }
                        } );
                    }

                    loadNode();
                }

                getFolderChain( parentId );
            },
            textFormatter: function( text ) {
                return text;
            }
        },
        lazy: {
            templateName: function( key ) {
                return this._handleLazyConfig( key, ko.observable( 'KoTree' ) );
            },

            selectedNode: function( key ) {
                return this._handleLazyConfig( key, ko.observable( null ) );
            },

            resolver: function( key ) {
                return this._handleLazyConfig( key, function() {
                } );
            },

            expandResolver: function( key ) {
                return this._handleLazyConfig( key, null );
            },

            enableDragDrop: function( key ) {
                return this._handleLazyConfig( key, ko.observable( false ) );
            },

            currentDropTarget: function( key ) {
                return this._handleLazyConfig( key, ko.observable() );
            },

            rowActionButton: function( key ) {
                return this._handleLazyConfig( key, ko.observable() );
            },

            showActivatedIndicators: function( key ) {
                return this._handleLazyConfig( key, ko.observable( false ) );
            },

            iconSet: function( key ) {
                var defaultIconSet = {
                    file: 'glyphicon-file',
                    open: 'glyphicon-folder-open',
                    closed: 'glyphicon-folder-close'
                };
                return this._handleLazyConfig( key, ko.observable( defaultIconSet ) );
            },

            useToggleToExpand: function( key ) {
                return this._handleLazyConfig( key, ko.observable( false ) );
            },

            remote: function( key ) {
                return this._handleLazyConfig( key, ko.observable( true ) );
            }
        }
    } );

    /**
     * @property KoTree
     * @type {KoTree}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTree );

    /**
     * @class KoTreeItem
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoTreeItem() {
        KoTreeItem.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTreeItem,
        extends: KoComponent,
        textDisplay: null,
        descriptors: {
            componentType: 'KoTreeItem',

            init: function() {
                var self = this;

                KoTreeItem.superclass.init.apply( self, arguments );

                self.textDisplay = ko.computed( function() {
                    var text = unwrap( self.text );
                    return self.tree.textFormatter( text, self.entry );
                } );
                self.loadingItems = i18n( 'treeItem.loadingItems' );
                self.noEntriesText = ko.observable( i18n( 'treeItem.noEntriesText' ) );
            },

            toggleExpand: function( done ) {
                var expanded = unwrap( this.expanded ),
                    remote = unwrap( this.tree.remote );
                // children = unwrap( this.children );

                if( true === remote && !this.isLeaf() && !expanded ) { //&& Array.isArray( children ) && false === this.loaded ) {
                    this.tree.load( this, done );
                }
                this.expanded( !expanded );
                return this;
            },

            getParent: function() {
                return unwrap( this.parent );
            },

            isLocked: function() {
                return unwrap( this.entry.isLocked );
            },

            isDirectory: function() {
                return unwrap( this.entry.isDirectory );
            },

            unload: function( options ) {
                var self = this,
                    current = this.tree.selectedNode(),
                    isDescendant = current && current.id ? Boolean( this.getNodeById( current.id ) ) : false;
                this.loaded = false;
                this.loading( false );
                this.collapse();
                this.expand( function() {
                    var selected;
                    if( isDescendant && options && options.keepSelection ) {
                        selected = self.getNodeById( current.id );
                        self.tree.selectedNode( selected || null );
                    }
                } );
                return this;
            },

            getNodeById: function( id ) {
                function find( node, id ) {
                    var children = node && node.children && node.children(),
                        result;
                    if( Array.isArray( children ) ) {
                        children.some( function( child ) {
                            if( child.id === id ) {
                                result = child;
                                return true;
                            } else {
                                result = find( child, id );
                                if( result ) {
                                    return true;
                                }
                            }
                        } );
                    }
                    return result;
                }

                return find( this, id );
            },

            hasChildren: function() {
                var children = unwrap( this.children );
                return Array.isArray( children ) && 0 < children.length;
            },

            hasParent: function() {
                var parent = unwrap( this.parent );
                return null !== parent;
            },

            isLeaf: function() {
                return unwrap( this.children ) === false;
            },

            expand: function( done ) {
                var expanded = unwrap( this.expanded );
                if( !expanded ) {
                    this.toggleExpand( done );
                }
                return this;
            },
            collapse: function( done ) {
                var expanded = unwrap( this.expanded );
                if( expanded ) {
                    this.toggleExpand( done );
                }
                return this;
            },

            select: function() {
                var tree = this.tree,
                    currentSelected = unwrap( tree.selectedNode );
                if( !this.isLeaf() && this !== currentSelected ) {
                    tree.selectedNode( this );
                }
                return this;
            },

            addChild: function( data ) {
                var newChild;
                if( !data ) {
                    throw Error( 'Missing Argument: data' );
                }
                if( !this.isLeaf() ) {
                    data.tree = this.tree;
                    if( data instanceof KoTreeItem ) {
                        if( ko.isObservable( data.parent ) ) {
                            data.parent( this );
                        } else {
                            data.parent = this;
                        }
                        newChild = data;
                    } else {
                        data.parent = this;
                        newChild = KoComponentManager.createComponent( {
                            componentType: 'KoTreeItem',
                            componentConfig: data
                        } );
                        newChild = new KoTreeItem( data );
                    }
                    this.children.push( newChild );
                    return newChild;
                }
                return this;
            },

            removeChild: function( node ) {
                if( ko.isObservable( node.parent ) ) {
                    node.parent( null );
                } else {
                    node.parent = null;
                }
                this.children.remove( node );
                return node;
            }
        },
        lazy: {

            templateName: function( key ) {
                return this._handleLazyConfig( key, ko.observable( 'KoTreeItem' ) );
            },

            loading: function( key ) {
                return this._handleLazyConfig( key, ko.observable( false ) );
            },

            children: function( key ) {
                return this._handleLazyConfig( key, ko.observableArray( [] ) );
            },

            bgColor: function( key ) {
                return this._handleLazyConfig( key, ko.observable( 'white' ) );
            },

            icon: function() {
                var self = this;
                return ko.pureComputed( function() {
                    var iconSet = unwrap( self.tree.iconSet );
                    if( false === unwrap( self.children ) ) {
                        return iconSet.file;
                    } else if( unwrap( self.expanded ) ) {
                        return iconSet.open;
                    } else {
                        return iconSet.closed;
                    }
                } );
            },

            activeClass: function() {
                var self = this;

                return ko.pureComputed( function() {
                    var
                        entry = self.entry,
                        isRuleSetActive = entry && entry.isActive,
                        allRulesActive = entry && entry.rules && -1 === entry.rules.indexOf( '"isActive":false' );

                    return isRuleSetActive ? (allRulesActive ? 'text-success' : 'text-warning') : 'text-danger';
                } );
            },

            activeText: function() {
                var self = this;
                return ko.pureComputed( function() {
                    //TODO: i18n here
                    var activeClass = self.activeClass(),
                        result = '';
                    if( 'text-success' === activeClass ) {
                        result = 'Die Regelgruppe ist aktiv!';
                    } else if( 'text-warning' === activeClass ) {
                        result = 'Die Regelgruppe ist aktiv, aber Regeln in der Regelgruppe sind deaktiviert!';
                    } else if( 'text-danger' === activeClass ) {
                        result = 'Die Regelgruppe ist nicht aktiv!';
                    }
                    return result;
                } );
            },

            text: function( key ) {
                return this._handleLazyConfig( key, ko.observable() );
            },

            totalCount: function( key ) {
                return this._handleLazyConfig( key, ko.observable( 0 ) );
            },

            expanded: function( key ) {
                return this._handleLazyConfig( key, ko.observable() );
            }
        }
    } );

    /**
     * @property KoTreeItem
     * @type {KoTreeItem}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTreeItem );

}, '3.16.0', {
    requires: [
        'oop',
        'KoUI',
        'KoUI-utils-Function',
        'KoComponentManager',
        'KoComponent',
        'DCContextMenu'
    ]
} );