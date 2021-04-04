/**
 * User: do
 * Date: 08/12/17  18:10
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, _ */
YUI.add( 'catalogViewer', function( Y, NAME ) {
        'use strict';

        var
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            peek = ko.utils.peekObservable,
            scriptElInitalized = false,
            catalogLoaded = '',
            catalogsAvailable = [];

        function initScriptEl() {
            if( scriptElInitalized ) {
                return Promise.resolve();
            }
            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'CatalogMojit/views/catalogViewer'} ) )
                .then( function( response ) {
                    var scriptEl = document.createElement( 'div' );
                    scriptEl.innerHTML = response.data;
                    document.body.appendChild( scriptEl );

                    scriptElInitalized = true;
                } ).catch( function( response ) {
                    Y.log( 'could not get catalogViewerTemplate ' + response, 'error', NAME );
                } );
        }

        function fetchCatalogs() {
            return new Promise(
                function(resolve) {
                    Y.doccirrus.jsonrpc.api.catalog.catalogViewerListAvailableCatalogs()
                        .done(
                            function( response ) {
                                if( response.data ) {
                                    catalogsAvailable = response.data;
                                }
                                resolve();
                            } );
                }
            );
        }

        function CatalogViewer( config ) {
            CatalogViewer.superclass.constructor.call( this, config );
        }

        CatalogViewer.ATTRS = {
            validatable: {
                value: false,
                lazyAdd: false
            }
        };

        Y.extend( CatalogViewer, KoViewModel.getBase(), {
            templateName: 'catalog-viewer-template',
            initializer: function( config ) {
                if( !config && config.catalogShort ) {
                    throw Error( 'catalog viewer requires config and initial catalogShort' );
                }

                var
                    self = this,
                    initialSelection = config.initialSelection;

                self.selectedItemsTitle = i18n( 'InCaseMojit.addMedicationModal_clientJS.title.SELECTED_ITEMS_TITLE' );
                self.multiSelect = config.multiSelect;
                self.modalChooser = config.modalChooser;
                self.isSelectable = config.isSelectable;
                self.selectedItems = ko.observableArray();

                self.addSelectedItem = function( item ) {
                    if( self.selectedItems.indexOf( item ) !== -1 ) {
                        return;
                    }
                    self.selectedItems.push( item );
                };

                self.unSelectItemButton = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'deleteItem',
                        icon: 'TRASH_O',
                        click: function( button, event, $context ) {
                            self.selectedItems.remove( $context.$parent );
                        }
                    }
                } );

                // store the currently selected catalog
                self.catalogShort = ko.observable( config.catalogShort );

                // load all available catalogs
                self.catalogs = ko.observableArray( catalogsAvailable );

                self.addDisposable( ko.computed( function() {
                    // reload the tree, if the selected catalog changes
                    var catalogShort = unwrap( self.catalogShort );
                    if( catalogShort !== catalogLoaded ) {
                        if( self.tree && self.tree.reload ) {
                            self.tree.reload();
                        }
                        // just allow a single reload
                        catalogLoaded = catalogShort;
                    }
                } ) );

                self.searchInput = ko.observable( '' );

                self.searchText = ko.observable( i18n( 'CatalogMojit.catalogViewerJS.searchText' ) );

                self.catalogEntries = ko.observable( 0 );

                self.catalogDisplayName = self.addDisposable( ko.computed( function() {
                    var catalogShort = unwrap( self.catalogShort ),
                        catalogEntries = unwrap( self.catalogEntries );
                    return (catalogShort || '') + (catalogEntries ? [' (', catalogEntries, ')'].join( '' ) : '');
                } ) );

                self.content = ko.observable( null );
                self.breadcrump = ko.observable( null );

                self.contentTemplateName = self.addDisposable( ko.computed( function() {
                    var catalogShort = unwrap( self.catalogShort );
                    if( typeof catalogShort !== "string" ) {
                        return 'catalog-viewer-empty-content-template';
                    }
                    catalogShort = catalogShort.toLowerCase();

                    // [MOJ-12105] arv has regional type specific catalogs, but the same content (uses same template)
                    if( catalogShort.indexOf( "arv" ) === 0 ) {
                        catalogShort = "arv";
                    }

                    return 'catalog-viewer-' + catalogShort + '-content-template';
                } ) );

                self.searchPlaceholderI18n = i18n( 'general.button.SEARCH' );
                self.selectCatalogI18n = i18n( 'CatalogMojit.catalogViewerJS.selectCatalog' );

                self.clearSearchInput = function() {
                    self.searchInput( '' );
                };

                self.initTree();
                self.initSearch();

                if( initialSelection ) {
                    self.selectByCode( initialSelection );
                }
                self.addDisposable( ko.computed( function() {
                    self.catalogShort();
                    self.breadcrump( null );
                    self.content( null );
                } ) );
            },
            destructor: function() {
            },
            selectCatalogShort: function( vm ) {
                var self = this;
                self.catalogShort( vm.id );
            },
            initTree: function() {
                var self = this;

                function isSelectable( node ) {
                    var isSelectable = Boolean( node.entry && node.entry.data );
                    return isSelectable;
                }

                function onError( response ) {
                    var
                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                    if( errors.length ) {
                        Y.Array.invoke( errors, 'display' );
                    }
                }

                function resolver( node ) {
                    var query = {
                        catalogShort: unwrap( self.catalogShort )
                    };

                    if( !query.catalogShort ) {
                        return [];
                    }

                    if( !node ) {
                        query.parent = null;
                        query.isDirectory = true;
                    } else {
                        query.parent = node.id;
                    }

                    return Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.catalogViewerList( {query: query} ) ).then( function( response ) {
                        return response.data;
                    } ).map( function( doc ) {
                        return {
                            id: doc._id,
                            text: doc.name,
                            totalCount: 0, // need this?
                            entry: doc,
                            children: Boolean( doc.isDirectory )
                        };
                    } ).catch( onError );

                }

                function splitSearchInput( text ) {
                    var parts = (text || '').split( ' ' ).map( function( part ) {
                        return part.trim();
                    } );

                    parts = _.uniq( parts );
                    return parts;
                }

                function textFormatter( text, entry ) {
                    var
                        parts = self.searchInputParts();

                    if( !text ) {
                        return text;
                    }

                    parts.forEach( function( part ) {
                        text = text.replace( part, '<mark>$&</mark>' );
                    } );

                    if( text && entry && entry.data && entry.data.categoryColor ) {
                        text = text + '&nbsp;<i class="fa fa-circle" title="' + entry.data.categoryTitle + '" style="color: ' + entry.data.categoryColor + '"/>';
                    }

                    return text;
                }

                self.textFormatter = textFormatter;
                self.splitSearchInput = splitSearchInput;

                self.searchInputParts = ko.computed( function() {
                    var searchInput = self.searchInput();
                    if( !searchInput ) {
                        return [];
                    }
                    return splitSearchInput( searchInput ).map( function( part ) {
                        return new RegExp( part, 'ig' );
                    } );
                } );

                self.onError = onError;

                self.tree = KoComponentManager.createComponent( {
                    componentType: 'KoTree',
                    componentConfig: {
                        resolver: resolver,
                        onError: onError,
                        textFormatter: textFormatter,
                        enableDragDrop: false,
                        useToggleToExpand: true,
                        iconSet: {
                            file: '',
                            open: 'fa fa-caret-down',
                            closed: 'fa fa-caret-right'
                        },
                        isSelectable: isSelectable
                    }
                } );

                self.tree.selectedNode.subscribe( function( node ) {
                    var content = node && node.entry && node.entry.data || null,
                        breadcrump = node && node.entry.breadcrump || null;

                    if( content ) {
                        content.textFormatter = textFormatter;
                    }
                    self.breadcrump( breadcrump );
                    self.content( content );
                } );

                self.searchTree = KoComponentManager.createComponent( {
                    componentType: 'KoTree',
                    componentConfig: {
                        remote: false,
                        onError: onError,
                        enableDragDrop: false,
                        useToggleToExpand: true,
                        textFormatter: textFormatter,
                        setDataMapper: self.setDataMapper.bind( self ),
                        iconSet: {
                            file: '',
                            open: 'fa fa-caret-down',
                            closed: 'fa fa-caret-right'
                        },
                        isSelectable: isSelectable
                    }
                } );

                self.searchTree.selectedNode.subscribe( function( node ) {
                    var content = node && node.entry && node.entry.data || null,
                        breadcrump = node && node.entry.breadcrump || null;

                    if( content ) {
                        content.textFormatter = textFormatter;
                    }
                    self.breadcrump( breadcrump );
                    self.content( content );
                } );

            },

            initSearch: function() {
                var self = this;

                self._page = ko.observable( 1 );
                self.pages = ko.observable( 0 );
                self.itemsPerPage = ko.observable( 20 ); // can be variable in the future
                self.totalItems = ko.observable( 0 );

                self.page = ko.computed( {
                    read: function() {
                        return unwrap( self._page );
                    },
                    write: function( newValue ) {
                        var current = peek( self._page ),
                            valueToWrite = parseInt( newValue, 10 ),
                            pages = peek( self.pages );

                        if( isNaN( valueToWrite ) || 0 === valueToWrite ) {
                            valueToWrite = 1;
                        }

                        if( valueToWrite < 1 || 0 === pages ) {
                            valueToWrite = 1;
                        } else if( valueToWrite > pages ) {
                            valueToWrite = pages;
                        }

                        if( valueToWrite !== current || newValue !== current ) {
                            self._page( valueToWrite );
                            self.page.notifySubscribers( valueToWrite );
                        }
                    }
                } );

                self.pages = ko.computed( function() {
                    var
                        itemsPerPage = unwrap( self.itemsPerPage ),
                        totalItems = unwrap( self.totalItems ),
                        val = +totalItems / +itemsPerPage;

                    return Math.ceil( val );
                } );

                self.hasPrevPage = ko.computed( function() {
                    var
                        page = unwrap( self.page );

                    if( page <= 1 ) {
                        return false;
                    }
                    return true;
                } );

                self.hasNextPage = ko.computed( function() {
                    var
                        page = unwrap( self.page ),
                        pages = unwrap( self.pages );

                    return page < pages;
                } );

                self.prevPage = function() {
                    if( !peek( self.hasPrevPage ) ) {
                        return;
                    }
                    self.page( +peek( self.page ) - 1 );
                };

                self.nextPage = function() {
                    if( !peek( self.hasNextPage ) ) {
                        return;
                    }
                    self.page( +peek( self.page ) + 1 );
                };

                self.addDisposable( ko.computed( function() {
                    var searchInput = unwrap( self.searchInput ),
                        catalogShort = unwrap( self.catalogShort ),
                        page = unwrap( self.page ),
                        itemsPerPage = unwrap( self.itemsPerPage ),
                        query = {
                            catalogShort: catalogShort,
                            term: searchInput
                        },
                        options = {
                            page: page,
                            itemsPerPage: itemsPerPage
                        };

                    if( !ko.computedContext.isInitial() && '' === searchInput ) {
                        self._page( 1 );
                        self.totalItems( 0 );
                    }

                    if( ko.computedContext.isInitial() || '' === searchInput ) {
                        return;
                    }

                    Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.catalogViewerSearch( {
                        query: query,
                        options: options
                    } ) ).then( function( response ) {
                        var data = response.data,
                            meta = response.meta;
                        self.totalItems( meta && meta.totalItems || 0 );
                        self.searchTree.setData( data );
                    } ).catch( function( err ) {
                        Y.log( 'could not search catalog viewer: ' + err, 'error', NAME );
                        self.onError( err );
                    } );
                } ).extend( {rateLimit: {timeout: 1500, method: 'notifyWhenChangesStop'}} ) );
            },

            selectByCode: function( code ) {
                if( !code ) {
                    return;
                }
                var
                    self = this,
                    query = {
                        catalogShort: unwrap( self.catalogShort ),
                        'data.seq': code
                    };

                if( !query.catalogShort ) {
                    return;
                }

                return Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.catalogViewerList( {
                    query: query,
                    options: {limit: 1}
                } ) ).then( function( response ) {
                    var data = response.data && response.data[0],
                        path = data && data.path,
                        node;

                    if( !data || !path ) {
                        Y.doccirrus.DCWindow.notice( {
                            message: i18n( 'CatalogMojit.catalogViewerJS.message.CODE_NOT_FOUND', {
                                data: {
                                    code: code
                                }
                            } ),
                            window: {width: 'small'}
                        } );
                        return;
                    }

                    node = self.tree.root;

                    Promise.each( path, function( id ) {
                        var nextNode = node.getNodeById( id );
                        if( !nextNode ) {
                            return;
                        }
                        if( !unwrap( nextNode.expanded ) ) {
                            nextNode.expand();
                        }
                        return Promise.resolve( self.tree.load( nextNode ) ).then( function() {
                            node = nextNode;
                        } );
                    } ).then( function() {
                        var nextNode = node.getNodeById( data._id );
                        if( nextNode ) {
                            node.tree.selectedNode( nextNode );
                        }
                    } );

                } ).catch( self.onError );
            },
            setDataMapper: function( node, level ) {
                var self = this,
                    parts,
                    expanded;

                function checkNode( node, parts ) {
                    var str,
                        passed = false;

                    if( node.data ) {
                        str = [node.data.seq, node.data.title].filter( Boolean ).join( ' ' );
                        passed = parts.some( function( part ) {
                            return null !== str.match( part );
                        } );
                    }
                    if( !passed && node.children ) {
                        return node.children.some( function( child ) {
                            return checkNode( child, parts );
                        } );
                    }

                    return passed;
                }

                if( 0 === level && node.children && node.children.length ) {
                    parts = peek( self.searchInputParts );
                    expanded = node.children.some( function( child ) {
                        return checkNode( child, parts );
                    } );
                } else {
                    expanded = true;
                }
                return {
                    id: node._id,
                    text: node.name || 'n/a',
                    totalCount: 0,
                    entry: node,
                    expanded: expanded,
                    children: node.children ? [] : false
                };
            }
        }, {
            // schemaName: 'basecontact',
            NAME: 'CatalogViewer'
        } );

        function createModalChooser( catalogViewer ) {
            return new Promise( function( resolve/*, reject*/ ) {
                var
                    bodyContent = Y.Node.create( document.getElementById( 'catalog-viewer-modal-template' ).innerHTML ),
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-CatalogViewer',
                        bodyContent: bodyContent,
                        title: 'Katalogsuche',
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: (window.innerWidth * 95) / 100,
                        height: (window.innerHeight * 93) / 100,
                        minHeight: 600,
                        minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                        centered: true,
                        modal: true,
                        dragable: true,
                        maximizable: true,
                        resizeable: true,
                        render: document.body,
                        focusOn: [],
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function() {
                                        modal.close();
                                        resolve();

                                    }
                                } ),
                                catalogViewer.multiSelect && Y.doccirrus.DCWindow.getButton( 'ADD', {
                                    label: i18n( 'general.button.ADD' ),
                                    name: 'addSelectionBtn',
                                    action: function() {
                                        var selection = unwrap( catalogViewer.content );
                                        if( selection ) {
                                            catalogViewer.addSelectedItem( selection );
                                        }
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        var selection = unwrap( catalogViewer.content );
                                        modal.close();
                                        if( catalogViewer.multiSelect ) {
                                            if( selection ) {
                                                catalogViewer.addSelectedItem( selection );
                                            }
                                            resolve( catalogViewer.selectedItems() );
                                        } else {
                                            resolve( selection );
                                        }
                                    }
                                } )
                            ].filter( Boolean )
                        }
                    } );

                ko.computed( function() {
                    var selection = unwrap( catalogViewer.content );
                    if( typeof catalogViewer.isSelectable === 'function' && !catalogViewer.isSelectable( selection ) ) {
                        selection = null;
                    }
                    if( selection ) {
                        modal.getButton( 'OK' ).button.enable();
                        if( modal.getButton( 'addSelectionBtn' ) ) {
                            modal.getButton( 'addSelectionBtn' ).button.enable();
                        }
                    } else {
                        modal.getButton( 'OK' ).button.disable();
                        if( modal.getButton( 'addSelectionBtn' ) ) {
                            modal.getButton( 'addSelectionBtn' ).button.disable();
                        }
                    }
                } );

                modal.getButton( 'OK' ).button.disable();

                ko.applyBindings( {catalogViewer: catalogViewer}, bodyContent.getDOMNode() );
            } );
        }

        /**
         *
         * @param config
         * @param config.modalChooser
         * @param config.allowCatalogChange
         * @param config.catalogShort specifies (initial) catalog to display
         * @returns {CatalogViewer}
         */
        function createViewer( config ) {
            return initScriptEl()
                .then(function () {
                    return fetchCatalogs();
                })
                .then( function() {
                    var modalChooser = config && config.modalChooser,
                        catalogViewer = new CatalogViewer( config );
                    if( true === modalChooser ) {
                        return createModalChooser( catalogViewer, config );
                    }
                    return catalogViewer;
                } );
        }

        Y.namespace( 'doccirrus' ).catalogViewer = {
            name: NAME,
            create: createViewer
        };

    },
    '0.0.1', {
        requires: [
            'DCWindow',
            'KoViewModel',
            'KoUI',
            'KoComponentManager',
            'KoTree',
            'catalog-schema'
        ]
    }
);
