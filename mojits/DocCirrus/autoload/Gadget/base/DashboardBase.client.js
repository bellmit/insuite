/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'DashboardBase', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module DashboardBase
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        ignoreDependencies = ko.ignoreDependencies,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        DashboardModel = KoViewModel.getConstructor( 'DashboardModel' ),
        DashboardBaseGadgetSelector = KoViewModel.getConstructor( 'DashboardBaseGadgetSelector' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        TPL_PATH_BASE = GADGET_CONST.paths.TPL_BASE,
        GADGET_LAYOUT_BASE = GADGET.layouts.base,
        GADGET_UTILS = GADGET.utils,
        makeDragEventData = GADGET_UTILS.makeDragEventData,
        createObjectId = GADGET_UTILS.createObjectId,

        GADGET_DRAG_CLASS_NAME = 'DashboardBaseGadget-drag',
        GADGET_PROXY_CLASS_NAME = 'DashboardBaseGadget-proxy',
        GADGET_PROXY_CLASS_NAME_VALID = 'DashboardBaseGadget-proxy-valid',
        GADGET_PROXY_CLASS_NAME_INVALID = 'DashboardBaseGadget-proxy-invalid';

    /**
     * @constructor
     * @class DashboardBase
     */
    function DashboardBase() {
        DashboardBase.superclass.constructor.apply( this, arguments );
    }

    Y.extend( DashboardBase, KoViewModel.getDisposable(), {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initDataModel();
            self._initActiveDashboard();
            self._initExposedAttributes();
            self.initCreateColumnsAndMoveGadgetsComputed();
            self._initGadgetDrag();
            self._initGadgetMaximized();
            self._initGadgetSelector();

            self.dragLabelI18n = i18n( 'DashboardBase.dragHereLabel' );
            self.layoutLabelI18n = i18n( 'DashboardBase.layoutLabel' );
            self.dashboardBaseAddDialogI18n = i18n( 'DashboardBase.DashboardBaseAddDialog.title' );
            self.dashboardBaseEditDialogI18n = i18n( 'DashboardBase.DashboardBaseEditDialog.title' );
            self.dashboardBaseGadgetSelectorI18n = i18n( 'DashboardBase.DashboardBaseGadgetSelector.title' );


            self.on( {
                initializedChange: function() {
                    var
                        onInitialized = self.get( 'onInitialized' );

                    if( Y.Lang.isFunction( onInitialized ) ) {
                        onInitialized.call( self, self );
                    }
                },
                destroyedChange: function() {
                    var
                        onDestroyed = self.get( 'onDestroyed' );

                    if( Y.Lang.isFunction( onDestroyed ) ) {
                        onDestroyed.call( self, self );
                    }
                }
            } );

        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self.unsetGadgetSelector();
            self._destroyDdDelegate();
            self.destroyDataModel();

        },
        /** @protected */
        dispose: function() {
            var
                self = this;

            if( !self._destroyOnDispose ) {
                self._destroyOnDispose = true;
                self.destroy();
            }
            else {
                delete self._destroyOnDispose;
                DashboardBase.superclass.dispose.apply( this, arguments );
            }
        },
        /**
         * Dashboard data model
         * @property dashboardModel
         * @type DashboardModel
         */
        dashboardModel: null,
        /** @private */
        _initDataModel: function() {
            var
                self = this,
                loaded = self.loaded = ko.observable( false );

            self.dashboardModel = new DashboardModel( {data: self.get( 'dashboardModelDefaultData' )} );

            self.addDisposable( ko.computed( function() {
                self.dashboardModel.readBoilerplate( true );
                if( peek( loaded ) ) {
                    self.save();
                }
            } ).extend( {rateLimit: 0} ) );

            Y.doccirrus.jsonrpc.api.dashboard
                .read( {
                    noBlocking: true,
                    query: {
                        userId: Y.doccirrus.auth.getUserId(),
                        environment: self.get( 'environment' )
                    }
                } )
                .done( function( response ) {
                    var
                        data = response.data && response.data[0] || null;

                    //  there is a race here between the jsonrpc calling back, and the dashboard being disposed, MOJ-13762
                    if( data && self.dashboardModel ) {
                        self.dashboardModel.set( 'data', data );
                        self.dashboardModel.setNotModified();
                    }

                } )
                .always( function() {
                    setTimeout( function() { // delay because of some async things
                        if ( 'function' === typeof loaded ) {
                            loaded( true );
                        }
                    }, 10 );
                } );
        },
        /** @protected */
        destroyDataModel: function() {
            var
                self = this;

            if( self.dashboardModel ) {
                self.dashboardModel.destroy();
                self.dashboardModel = null;
            }
        },
        /**
         * Current active dashboard model or 'null'
         * @property activeDashboard
         * @type null|ko.computed
         */
        activeDashboard: null,
        /**
         * Current active dashboard layout or 'null'
         * @property activeDashboardLayout
         * @type null|ko.computed
         */
        activeDashboardLayout: null,
        /**
         * Current active dashboard maximized or default value
         * @property activeDashboardMaximized
         * @type null|ko.computed
         */
        activeDashboardMaximized: null,
        /**
         * Current active dashboard collections or empty array
         * @property activeDashboardCollections
         * @type null|ko.computed
         */
        activeDashboardCollections: null,
        /**
         * Current active dashboard gadgets or empty array
         * @property activeDashboardGadgets
         * @type null|ko.computed
         */
        activeDashboardGadgets: null,
        /** @private */
        _initActiveDashboard: function() {
            var
                self = this;

            self.activeDashboard = ko.computed( function() {
                var
                    dashboards = unwrap( self.dashboardModel.dashboards ),
                    activeDashboardId = unwrap( self.dashboardModel.activeDashboardId );

                return Y.Array.find( dashboards, function( dashboard ) {
                    return activeDashboardId === unwrap( dashboard._id );
                } );
            } );

            self.activeDashboardLayout = ko.computed( {
                read: function() {
                    var
                        activeDashboard = unwrap( self.activeDashboard );

                    if( activeDashboard ) {
                        return unwrap( activeDashboard.layout );
                    }

                    return null;
                },
                write: function( value ) {
                    var
                        activeDashboard = peek( self.activeDashboard );

                    if( activeDashboard ) {
                        activeDashboard.layout( value );
                    }
                }
            } ).extend( {notify: 'always'} );

            self.activeDashboardMaximized = ko.computed( function() {
                var
                    activeDashboard = unwrap( self.activeDashboard );

                if( activeDashboard ) {
                    return unwrap( activeDashboard.maximized );
                }

                return Y.doccirrus.schemas.dashboard.types.DashboardSetting_T.maximized.default;

            } );

            self.activeDashboardCollections = ko.computed( function() {
                var
                    activeDashboard = unwrap( self.activeDashboard );

                if( null === activeDashboard ) {
                    return [];
                }

                return unwrap( activeDashboard.collections );

            } );

            self.activeDashboardGadgets = ko.computed( function() {
                var
                    activeDashboardCollections = unwrap( self.activeDashboardCollections );

                return activeDashboardCollections.map( function( collection ) {
                    return unwrap( collection.gadgets );
                } );

            } );

        },
        /**
         * Exposed configured layoutTypes for template
         */
        layoutTypes: null,
        /**
         * Exposed configured layoutList for template
         */
        layoutList: null,
        /** @private */
        _initExposedAttributes: function() {
            var
                self = this;

            self.layoutTypes = self.get( 'layoutTypes' );
            self.layoutList = self.get( 'layoutList' );
        },
        /**
         * Computes
         * - create columns based on layout
         * - move gadgets based on layout to an appropriate column
         * @protected
         */
        initCreateColumnsAndMoveGadgetsComputed: function() {
            var
                self = this,
                activeDashboardObservable = self.activeDashboard;

            self.addDisposable( ko.computed( function() {
                var
                    layout = unwrap( self.activeDashboardLayout ),
                    activeDashboardModel = peek( activeDashboardObservable ),
                    gadgetCollection0Index = 0,
                    gadgetCollection1Index = 1,
                    gadgetCollection2Index = 2;

                if( null === layout ) {
                    return;
                }

                ignoreDependencies( function() {
                    var
                        collectionsObservable = activeDashboardModel.collections,
                        collectionsArray = peek( collectionsObservable ),
                        gadgetCollection0Model = collectionsArray[gadgetCollection0Index],
                        gadgetCollection1Model = collectionsArray[gadgetCollection1Index],
                        gadgetCollection2Model = collectionsArray[gadgetCollection2Index];

                    if( !gadgetCollection0Model ) {
                        collectionsObservable.push( {_id: createObjectId()} );
                        gadgetCollection0Model = collectionsArray[collectionsArray.length - 1];
                    }

                    switch( layout ) {
                        case GADGET_LAYOUT_BASE.types.FULL:
                            // move any gadgets of other columns to the first one and remove others
                            if( gadgetCollection1Model && peek( gadgetCollection1Model.gadgets ).length ) {
                                gadgetCollection0Model.gadgets.push.apply( gadgetCollection0Model.gadgets, peek( gadgetCollection1Model.gadgets ).map( function( item ) {
                                    return item.toJSON();
                                } ) );
                            }
                            if( gadgetCollection2Model && peek( gadgetCollection2Model.gadgets ).length ) {
                                gadgetCollection0Model.gadgets.push.apply( gadgetCollection0Model.gadgets, peek( gadgetCollection2Model.gadgets ).map( function( item ) {
                                    return item.toJSON();
                                } ) );
                            }
                            collectionsObservable.splice( 1 );
                            break;
                        case GADGET_LAYOUT_BASE.types.TWO:
                        case GADGET_LAYOUT_BASE.types.TWO_LTR:
                        case GADGET_LAYOUT_BASE.types.TWO_RTL:
                            // move any gadgets of other columns to the first one and remove others
                            // create needed columns if not available
                            if( !gadgetCollection1Model ) {
                                collectionsObservable.push( {_id: createObjectId()} );
                                gadgetCollection1Model = collectionsArray[collectionsArray.length - 1];
                            }
                            if( gadgetCollection2Model && peek( gadgetCollection2Model.gadgets ).length ) {
                                gadgetCollection0Model.gadgets.push.apply( gadgetCollection0Model.gadgets, peek( gadgetCollection2Model.gadgets ).map( function( item ) {
                                    return item.toJSON();
                                } ) );
                            }
                            collectionsObservable.splice( 2, 1 );
                            break;
                        case GADGET_LAYOUT_BASE.types.THREE:
                            // create needed columns if not available
                            if( !gadgetCollection1Model ) {
                                collectionsObservable.push( {_id: createObjectId()} );
                                gadgetCollection1Model = collectionsArray[collectionsArray.length - 1];
                            }
                            if( !gadgetCollection2Model ) {
                                collectionsObservable.push( {_id: createObjectId()} );
                                gadgetCollection2Model = collectionsArray[collectionsArray.length - 1];
                            }
                            break;
                    }
                } );

            } ) );
        },
        /**
         * Removes all gadgets from their holders
         */
        resetColumns: function() {
            var
                self = this,
                collectionsArray = peek( self.activeDashboardCollections );

            collectionsArray.forEach( function( collection ) {
                collection.gadgets.removeAll();
            } );
        },
        /**
         * Adds a gadget to a collection
         * @param {String} gadgetName
         * @param {null|undefined|ko.observable|Number} [collection=0] Either the collection or collection index
         * @param {null|undefined|Number} [position=collection.length] Position index in collection
         * @param {null|undefined|Object} [gadgetConfig]
         * @returns {KoViewModel}
         */
        addGadget: function( gadgetName, collection, position, gadgetConfig ) {
            var
                self = this,
                activeDashboardObservable = self.activeDashboard,
                activeDashboardModel = peek( activeDashboardObservable ),
                collectionsObservable = activeDashboardModel.collections,
                collectionsArray = peek( collectionsObservable ),
                collectionsIndex = 0,
                _id = createObjectId(),
                gadgetObject = {
                    _id: _id,
                    gadgetConst: GADGET_CONST.getGadgetConstByName( gadgetName )
                },
                addTo,
                positionIndex;

            // adjust index to add to
            if( Y.Lang.isNumber( collection ) ) {
                collectionsIndex = collection;
            }
            else if( collection instanceof (KoViewModel.getBase()) ) {
                collectionsIndex = collectionsArray.indexOf( collection );
            }

            // create index if not exists
            while( collectionsIndex > collectionsArray.length - 1 ) {
                collectionsObservable.push( {_id: createObjectId()} );
            }
            addTo = collectionsArray[collectionsIndex];

            // adjust object to add
            if( Y.Lang.isObject( gadgetConfig ) ) {
                gadgetObject = Y.merge( gadgetObject, gadgetConfig );
            }

            // adjust position index to insert
            if( Y.Lang.isNumber( position ) ) {
                positionIndex = position;
                addTo.gadgets.splice( positionIndex, 0, gadgetObject );
            }
            else {
                addTo.gadgets.push( gadgetObject );
                positionIndex = peek( addTo.gadgets ).length - 1;
            }

            return peek( addTo.gadgets )[positionIndex];

        },
        /**
         * Removes a gadget by its id from the appropriate holder
         * @param {String} id
         */
        removeGadget: function( id ) {
            var
                self = this,
                activeDashboardObservable = self.activeDashboard,
                activeDashboardModel = peek( activeDashboardObservable ),
                collectionsObservable = activeDashboardModel.collections,
                collectionsArray = peek( collectionsObservable ),

                inGadgetCollection,
                theGadget;

            collectionsArray.some( function( collection ) {
                peek( collection.gadgets ).some( function( gadget ) {
                    if( id === peek( gadget._id ) ) {
                        theGadget = gadget;
                    }
                    return id === peek( gadget._id );
                } );
            } );

            inGadgetCollection = Y.Array.find( collectionsArray, function( collection ) {
                return peek( collection.gadgets ).indexOf( theGadget ) > -1;
            } );

            if( peek( theGadget._id ) === peek( self.activeDashboardMaximized ) ) {
                self.unsetGadgetMaximized();
            }

            if( inGadgetCollection ) {
                inGadgetCollection.gadgets.remove( theGadget );
            }

        },
        /**
         * Gets the data model for a gadget by its id
         * @param {String} id
         * @returns {KoViewModel|null}
         */
        getGadgetModel: function( id ) {
            var
                self = this,
                activeDashboardGadgets = unwrap( self.activeDashboardGadgets );

            return Y.Array.find( Array.prototype.concat.apply( [], activeDashboardGadgets ), function( model ) {
                return unwrap( model._id ) === id;
            } );
        },
        /**
         * Add gadget click handler
         */
        handlerAddGadget: function() {
            var
                self = this;

            if( self.handlerAddGadgetDisabled() ) {
                return;
            }
            if( peek( self.gadgetSelector ) ) {
                return;
            }
            self.showGadgetSelector();
        },
        /**
         * Test if add gadget click handler should be disabled
         */
        handlerAddGadgetDisabled: function() {
            var
                self = this,
                notLoaded = !unwrap( self.loaded ),
                gadgetSelector = Boolean( unwrap( self.gadgetSelector ) );

            return notLoaded || gadgetSelector;
        },
        /**
         * Show gadget selector
         * @returns {EventTarget} 'cancel', 'drop'
         */
        showGadgetSelector: function() {
            var
                self = this,
                gadgetSelectorInstance = self.createGadgetSelectorInstance();

            self.gadgetSelector( gadgetSelectorInstance.promise );

            return gadgetSelectorInstance.eventTarget;
        },
        /**
         * Method responsible to create an appropriate gadget selector instance for this dashboard.
         * @protected
         * @returns {KoViewModel}
         */
        createGadgetSelectorInstance: function() {
            var
                self = this;

            return new DashboardBaseGadgetSelector( {host: self} );
        },
        /**
         * Class name applied to element which is dragged via proxy
         */
        gadgetDragClassName: GADGET_DRAG_CLASS_NAME,
        /**
         * Class name applied to proxy element which is dragged
         */
        gadgetProxyClassName: GADGET_PROXY_CLASS_NAME,
        /**
         * Class name applied to proxy element when dropping is valid
         */
        gadgetProxyClassNameValid: GADGET_PROXY_CLASS_NAME_VALID,
        /**
         * Class name applied to proxy element when dropping is invalid
         */
        gadgetProxyClassNameInValid: GADGET_PROXY_CLASS_NAME_INVALID,
        /**
         * @protected
         * @type null|ko.observable(null|Promise|doccirrus.DCWindow)
         */
        gadgetSelector: null,
        /** @private **/
        _initGadgetSelector: function() {
            var
                self = this;

            self.gadgetSelector = ko.observable( null );

            self.addDisposable( ko.computed( function() {
                var
                    noActiveDashboard = !unwrap( self.activeDashboard ),
                    activeDashboardMaximized = unwrap( self.activeDashboardMaximized );

                if( noActiveDashboard || activeDashboardMaximized ) {
                    ignoreDependencies( self.unsetGadgetSelector, self );
                }
            } ).extend( {rateLimit: 0} ) );
        },
        /** @protected */
        unsetGadgetSelector: function() {
            var
                self = this,
                gadgetSelector = peek( self.gadgetSelector ),
                DCWindow = Y.doccirrus.DCWindow;

            if( gadgetSelector ) {

                if( gadgetSelector instanceof Promise ) {
                    gadgetSelector.cancel();
                    self.gadgetSelector( null );
                }
                else if( gadgetSelector instanceof DCWindow ) {
                    gadgetSelector.close(); // use close to destroy because of visibleChange
                }

            }
        },
        /**
         * Notify about the DD container element bound to
         * @param ddContainerElement
         * @protected
         */
        notifyBindDdContainerElement: function( ddContainerElement ) {
            var
                self = this;

            self._ddContainerElement( ddContainerElement );
        },
        _ddDelegate: null,
        /** @private */
        _initDdDelegate: function( ddContainerElement ) {
            var
                self = this,
                ddDelegate,
                drag;

            self._destroyDdDelegate();

            if( !ddContainerElement ) {
                return;
            }

            ddDelegate = self._ddDelegate = new Y.DD.Delegate( Y.merge( {
                container: ddContainerElement
            }, self.get( 'ddDelegateConfig' ) ) );

            drag = ddDelegate.dd;

            // overwrite drag start method to do things that doesn't work to do later
            drag.start = function() {
                self._ddDelegateBeforeDragStart.apply( self, arguments );
                Y.DD.Drag.prototype.start.apply( this, arguments );
            };

            // drag constrained
            drag.plug( Y.Plugin.DDConstrained, {
                constrain: ddContainerElement
            } );

            // drag scroll
            drag.plug( Y.Plugin.DDWinScroll, {
                horizontal: false,
                buffer: 50
            } );

            // drag proxy
            drag.plug( Y.Plugin.DDProxy, {
                moveOnEnd: false,
                resizeFrame: true,
                cloneNode: true
            } );

            ddDelegate.on( {
                'drag:mouseDown': function( yEvent ) {
                    if( yEvent.ev.target.ancestor( '.yui3-resize-handles-wrapper' ) ) {
                        // fixes bug for touch devices with Y.Resize inside Y.DD.Drag (resize is not triggered - so prevent drag if is resize)
                        yEvent.halt();
                    }
                },
                'drag:start': self._ddDelegateOnDragStart,
                'drag:drag': self._ddDelegateOnDragDrag,
                'drag:enter': self._ddDelegateOnDragEnter,
                'drag:exit': self._ddDelegateOnDragExit,
                'drag:end': self._ddDelegateOnDragEnd,
                'drag:drophit': self._ddDelegateOnDropHit,
                'drag:dropmiss': self._ddDelegateOnDropMiss
            }, null, self );
        },
        /** @private **/
        _ddDelegateBeforeDragStart: function() {
            var
                self = this,
                ddDelegate = self._ddDelegate;

            // overwrite drag start method to get non visible elements calculated in (doesn't work to do later)
            self.gadgetDragging( true );
            ddDelegate.syncTargets(); // ensures targets for first drag
        },
        /**
         * @param {Object} parameters
         * @param {DD.Drag} parameters.drag
         * @param {null} parameters.drop
         * @param {EventFacade} parameters._event
         */
        onDragStart: function( parameters ) {
            var
                self = this,
                drag = parameters.drag,
                node = drag.get( 'node' ),
                dragNode = drag.get( 'dragNode' );

            node.addClass( self.gadgetDragClassName );
            dragNode.addClass( self.gadgetProxyClassName );

            dragNode.replaceClass(
                self.gadgetProxyClassNameValid,
                self.gadgetProxyClassNameInValid
            );

        },
        /** @private **/
        _ddDelegateOnDragStart: function( yEvent ) {
            var
                self = this;

            // self.gadgetDragging( true ); // @see _ddDelegateBeforeDragStart
            self.onDragStart( makeDragEventData( yEvent.target, null, yEvent ) );
        },
        /** @private **/
        _ddDelegateOnDragDrag: function( /*yEvent*/ ) {
        },
        /**
         * @param {Object} parameters
         * @param {DD.Drag} parameters.drag
         * @param {DD.Drop} parameters.drop
         * @param {EventFacade} parameters._event
         */
        onDragEnterDrop: function( parameters ) {
            var
                self = this,
                drag = parameters.drag,
                dragNode = drag.get( 'dragNode' );

            if( self.isValidDragDropEvent( parameters ) ) {
                dragNode.replaceClass(
                    self.gadgetProxyClassNameInValid,
                    self.gadgetProxyClassNameValid
                );
            }
        },
        /** @private **/
        _ddDelegateOnDragEnter: function( yEvent ) {
            var
                self = this;

            self.onDragEnterDrop( makeDragEventData( yEvent.target, yEvent.drop, yEvent ) );
        },
        /**
         * @param {Object} parameters
         * @param {DD.Drag} parameters.drag
         * @param {DD.Drop} parameters.drop
         * @param {EventFacade} parameters._event
         */
        onDragLeaveDrop: function( parameters ) {
            var
                self = this,
                drag = parameters.drag,
                dragNode = drag.get( 'dragNode' );

            dragNode.replaceClass(
                self.gadgetProxyClassNameValid,
                self.gadgetProxyClassNameInValid
            );
        },
        /** @private **/
        _ddDelegateOnDragExit: function( yEvent ) {
            var
                self = this;

            self.onDragLeaveDrop( makeDragEventData( yEvent.target, yEvent.drop, yEvent ) );
        },
        /**
         * @param {Object} parameters
         * @param {DD.Drag} parameters.drag
         * @param {null|DD.Drop} parameters.drop
         * @param {EventFacade} parameters._event
         */
        onDragEnd: function( parameters ) {
            var
                self = this,
                drag = parameters.drag,
                node = drag.get( 'node' );

            node.removeClass( self.gadgetDragClassName );

        },
        /** @private **/
        _ddDelegateOnDragEnd: function( yEvent ) {
            var
                self = this,
                ddDelegate = self._ddDelegate;

            self.onDragEnd( makeDragEventData( yEvent.target, null, yEvent ) );

            self.gadgetDragging( false );
            ddDelegate.syncTargets();
        },
        /**
         * @param {Object} parameters
         * @param {DD.Drag} parameters.drag
         * @param {DD.Drop} parameters.drop
         * @param {EventFacade} parameters._event
         */
        onDragHitDrop: function( parameters ) {
            var
                self = this,

                drag = parameters.drag,
                drop = parameters.drop,

                activeDashboardObservable = self.activeDashboard,

                dragNode = drag.get( 'node' ),
                dropNode = drop.get( 'node' ),
                dragConfig = self._ddDelegateGetModelFromDragNode( dragNode ),
                dropConfig = self._ddDelegateGetModelFromDropNode( dropNode ),

                isDropPlaceholder,
                activeDashboardModel,
                collectionsObservable,
                collectionsArray,

                dragGadgetCollection,
                dragConfigData,

                dropGadgetsIndex,
                dropGadgetCollection;

            if( !(dragConfig && dropConfig) ) {
                return;
            }

            isDropPlaceholder = Boolean( dropConfig.isDrop );
            activeDashboardModel = peek( activeDashboardObservable );
            collectionsObservable = activeDashboardModel.collections;
            collectionsArray = peek( collectionsObservable );

            dragGadgetCollection = (Y.Array.find( collectionsArray, function( collection ) {
                return peek( collection.gadgets ).some( function( gadget ) {
                    return dragConfig === gadget;
                } );
            } )).gadgets;
            dragConfigData = dragConfig.toJSON();

            dropGadgetCollection = (isDropPlaceholder ? collectionsArray[dropConfig.gadgetCollection] : Y.Array.find( collectionsArray, function( collection ) {
                return peek( collection.gadgets ).some( function( gadget, index ) {
                    var isGadget = dropConfig === gadget;
                    if( isGadget ) {
                        dropGadgetsIndex = index;
                    }
                    return isGadget;
                } );
            } )).gadgets;

            if( isDropPlaceholder ) {
                dropGadgetsIndex = peek( dropGadgetCollection ).length;
            }

            dragGadgetCollection.remove( dragConfig );
            dropGadgetCollection.splice( dropGadgetsIndex, 0, dragConfigData );
        },
        /** @private **/
        _ddDelegateOnDropHit: function( yEvent ) {
            var
                self = this,
                drag = yEvent.drag,
                drop = yEvent.drop;

            if( self.isValidDragDropEvent( makeDragEventData( drag, drop, yEvent ) ) ) {
                self.onDragHitDrop( makeDragEventData( drag, drop, yEvent ) );
            }
            else {
                self.onDragMissDrop( makeDragEventData( drag, null, yEvent ) );
            }

        },
        /**
         * @param {Object} parameters
         * @param {DD.Drag} parameters.drag
         * @param {null} parameters.drop
         * @param {EventFacade} parameters._event
         */
        onDragMissDrop: function( /*parameters*/ ) {
        },
        /** @private **/
        _ddDelegateOnDropMiss: function( yEvent ) {
            var
                self = this;

            self.onDragMissDrop( makeDragEventData( yEvent.target, null, yEvent ) );
        },
        /** @private **/
        _ddDelegateGetModelFromDragNode: function( dragNode ) {
            return ko.dataFor( dragNode.getDOMNode() );
        },
        /** @private **/
        _ddDelegateGetModelFromDropNode: function( dropNode ) {
            // can also return the Object of a drop target
            return ko.dataFor( dropNode.getDOMNode() );
        },
        /**
         * @param {Object} parameters
         * @param {DD.Drag} parameters.drag
         * @param {DD.Drop} parameters.drop
         * @param {EventFacade} parameters._event
         * @returns {boolean}
         */
        isValidDragDropEvent: function( /*parameters*/ ) {

            return true;
        },
        /** @private **/
        _destroyDdDelegate: function() {
            var
                self = this;

            if( self._ddDelegate ) {
                self._ddDelegate.destroy();
                self._ddDelegate = null;
            }
        },
        /**
         * Notifies about a gadget is currently dragged
         * @property gadgetDragging
         * @type null|ko.observable
         */
        gadgetDragging: null,
        /**
         * Disable dragging of gadgets
         * @property gadgetDraggingDisabled
         * @type null|ko.observable
         */
        gadgetDraggingDisabled: null,
        /** @private */
        _initGadgetDrag: function() {
            var
                self = this;

            self._ddContainerElement = ko.observable( null );
            self.gadgetDragging = ko.observable( false );
            self.gadgetDraggingDisabled = ko.observable( self.get( 'gadgetDraggingDisabled' ) );

            // compute dependencies on DOM manipulations
            self.addDisposable( ko.computed( self.compute_initDdDelegate, self ).extend( {rateLimit: 50} ) ); // ensure DOM manipulated

        },
        /**
         * Function used inside the ko.computed to compute "_initDdDelegate"
         * @protected
         */
        compute_initDdDelegate: function() {
            var
                self = this,
                ddContainerElement = unwrap( self._ddContainerElement ),
                gadgetDraggingDisabled = unwrap( self.gadgetDraggingDisabled );

            unwrap( self.activeDashboardLayout );

            if( gadgetDraggingDisabled ) {
                self._destroyDdDelegate();
            }
            else {
                ignoreDependencies( self._initDdDelegate, self, [ddContainerElement] );
            }
        },
        /**
         * Returns the unique drag group for this dashboard
         * @returns {String}
         */
        getDashboardDragGroup: function() {
            var
                self = this;

            return 'dashboard-drag-' + self._yuid;
        },
        /** @protected **/
        isColumnDropTargetVisible: function( /*columnIndex*/ ) {
            // TODO: should hide a drop target if a gadget is dragged from that column
            var
                self = this,
                gadgetDragging = unwrap( self.gadgetDragging );

            return gadgetDragging;
        },
        /**
         * Maximized Gadget if any
         * @property gadgetMaximized
         * @type null|ko.computed
         */
        gadgetMaximized: null,
        /** @private */
        _initGadgetMaximized: function() {
            var
                self = this;

            self.gadgetMaximized = self.addDisposable( ko.computed( function() {
                var
                    activeDashboardMaximized = unwrap( self.activeDashboardMaximized );

                if( activeDashboardMaximized ) {
                    return self.getGadgetModel( activeDashboardMaximized );
                }

                return null;

            } ) );

        },
        /**
         * Set maximized gadget
         * @param {String} id
         */
        setGadgetMaximized: function( id ) {
            var
                self = this,
                activeDashboardObservable = self.activeDashboard,
                activeDashboardModel = peek( activeDashboardObservable );

            if( activeDashboardModel ) {
                activeDashboardModel.maximized( id );
            }

        },
        /**
         * Unset maximized gadget
         */
        unsetGadgetMaximized: function() {
            var
                self = this,
                activeDashboardObservable = self.activeDashboard,
                activeDashboardModel = peek( activeDashboardObservable );

            if( activeDashboardModel ) {
                activeDashboardModel.maximized( activeDashboardModel.get( 'defaults.maximized' ) );
            }

        },
        /**
         * Test if add dashboard click handler should be disabled
         */
        handlerAddDashboardDisabled: function() {
            var
                self = this,
                loaded = unwrap( self.loaded );

            return !loaded;
        },
        /**
         * Add dashboard click handler
         */
        handlerAddDashboard: function() {
            var
                self = this;

            self.showAddDashboard();
        },
        /**
         * Shows add dashboard dialog
         * @returns {EventTarget} 'cancel', 'save'
         */
        showAddDashboard: function() {
            var
                self = this,
                eventTarget = new Y.EventTarget();

            eventTarget.publish( 'cancel', {preventable: false} );
            eventTarget.publish( 'save', {preventable: false} );

            Promise
                .props( {
                    template: Y.doccirrus.jsonrpc.api.jade
                        .renderFile( {noBlocking: true, path: TPL_PATH_BASE + 'DashboardBaseAddDialog'} )
                        .then( function( response ) {
                            return response.data;
                        } )
                } )
                .then( function( props ) {
                    var
                        saveDisabled,
                        bindings = {
                            name: ko.observable( Y.doccirrus.schemas.dashboard.types.DashboardSetting_T.name.default ),
                            hasError: function() {
                                var
                                    names = unwrap( self.dashboardModel.dashboards ).map( function( dashboard ) {
                                        return unwrap( dashboard.name );
                                    } );

                                return names.indexOf( unwrap( this.name ) ) !== -1;
                            },
                            layoutList: self.layoutList,
                            layout: ko.observable( self.get( 'layoutDefaultValue' ) )
                        },
                        bodyContent = Y.Node.create( props.template ),
                        dialog = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-DashboardBaseAddDialog',
                            bodyContent: bodyContent,
                            title: i18n( 'DashboardBase.DashboardBaseAddDialog.title' ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            height: 400,
                            minHeight: 400,
                            minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        action: function( e ) {
                                            dialog.close( e );
                                            var
                                                item = {
                                                    _id: createObjectId(),
                                                    name: peek( bindings.name ),
                                                    layout: peek( bindings.layout )
                                                };

                                            self.dashboardModel.dashboards.push( item );
                                            self.dashboardModel.activeDashboardId( item._id );
                                            self.resetColumns();

                                            eventTarget.fire( 'save', {}, {} );
                                            eventTarget.detachAll();
                                        }
                                    } )
                                ]
                            },
                            after: {
                                visibleChange: function( yEvent ) {
                                    // also captures cancel for e.g.: ESC
                                    if( !yEvent.newVal ) {
                                        setTimeout( function() { // delay for letting others fire first
                                            eventTarget.fire( 'cancel' );
                                            eventTarget.detachAll();

                                            saveDisabled.dispose();
                                            ko.cleanNode( bodyContent.getDOMNode() );

                                        }, 10 );
                                    }
                                }
                            }
                        } );

                    saveDisabled = ko.computed( function() {
                        var
                            saveButton = dialog.getButton( 'SAVE' ).button;

                        if( bindings.hasError() ) {
                            saveButton.disable();
                        } else {
                            saveButton.enable();
                        }
                    } );

                    ko.applyBindings( bindings, bodyContent.getDOMNode() );

                } );

            return eventTarget;
        },
        /**
         * Test if edit dashboard click handler should be disabled
         */
        handlerEditDashboardDisabled: function() {
            var
                self = this,
                dashboards = unwrap( self.dashboardModel.dashboards );

            return !dashboards.length;
        },
        /**
         * Edit dashboard click handler
         */
        handlerEditDashboard: function() {
            var
                self = this;

            self.showEditDashboard();
        },
        /**
         * Shows edit dashboard dialog
         * @returns {EventTarget} 'cancel', 'save'
         */
        showEditDashboard: function() {
            var
                self = this,
                eventTarget = new Y.EventTarget();

            eventTarget.publish( 'cancel', {preventable: false} );
            eventTarget.publish( 'save', {preventable: false} );

            Promise
                .props( {
                    template: Y.doccirrus.jsonrpc.api.jade
                        .renderFile( {noBlocking: true, path: TPL_PATH_BASE + 'DashboardBaseEditDialog'} )
                        .then( function( response ) {
                            return response.data;
                        } )
                } )
                .then( function( props ) {
                    var
                        saveDisabled,
                        bindings = {
                            dashboards: ko.observableArray()
                        },
                        dupedNames = ko.computed( function() {
                            var
                                dashboards = unwrap( bindings.dashboards ),
                                names = {},
                                duped = [];

                            dashboards.forEach( function( dashboard ) {
                                var name = unwrap( dashboard.name );
                                if( names[name] && -1 === duped.indexOf( name ) ) {
                                    duped.push( name );
                                }
                                names[name] = true;
                            } );

                            return duped;
                        } ),
                        bodyContent = Y.Node.create( props.template ),
                        dialog = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-DashboardBaseEditDialog',
                            bodyContent: bodyContent,
                            title: i18n( 'DashboardBase.DashboardBaseEditDialog.title' ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            height: 400,
                            minHeight: 400,
                            minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        action: function( e ) {
                                            dialog.close( e );

                                            var
                                                origin = [].concat( peek( self.dashboardModel.dashboards ) ),
                                                ids = {};

                                            peek( bindings.dashboards ).forEach( function( dashboard ) {
                                                ids[peek( dashboard.reference._id )] = dashboard;
                                            } );

                                            origin.forEach( function( dashboard ) {
                                                var
                                                    dashboardId = peek( dashboard._id );

                                                if( !Y.Object.owns( ids, dashboardId ) ) {
                                                    self.dashboardModel.dashboards.remove( dashboard );
                                                    if( dashboardId === peek( self.dashboardModel.activeDashboardId ) ) {
                                                        if( peek( self.dashboardModel.dashboards ).length ) {
                                                            self.dashboardModel.activeDashboardId( peek( peek( self.dashboardModel.dashboards )[0]._id ) );
                                                        }
                                                        else {
                                                            self.dashboardModel.activeDashboardId( '' );
                                                        }
                                                    }
                                                }
                                                else if( peek( ids[dashboardId].name ) !== peek( dashboard.name ) ) {
                                                    dashboard.name( peek( ids[dashboardId].name ) );
                                                }
                                            } );

                                            eventTarget.fire( 'save', {}, {} );
                                            eventTarget.detachAll();
                                        }
                                    } )
                                ]
                            },
                            after: {
                                visibleChange: function( yEvent ) {
                                    // also captures cancel for e.g.: ESC
                                    if( !yEvent.newVal ) {
                                        setTimeout( function() { // delay for letting others fire first
                                            eventTarget.fire( 'cancel' );
                                            eventTarget.detachAll();

                                            dupedNames.dispose();
                                            saveDisabled.dispose();
                                            ko.cleanNode( bodyContent.getDOMNode() );

                                        }, 10 );
                                    }
                                }
                            }
                        } );

                    saveDisabled = ko.computed( function() {
                        var
                            saveButton = dialog.getButton( 'SAVE' ).button;

                        if( unwrap( dupedNames ).length ) {
                            saveButton.disable();
                        } else {
                            saveButton.enable();
                        }
                    } );

                    bindings.dashboards( peek( self.dashboardModel.dashboards ).map( function( dashboard ) {
                        return {
                            reference: dashboard,
                            name: ko.observable( peek( dashboard.name ) ),
                            remove: function() {
                                bindings.dashboards.remove( this );
                            },
                            hasError: function() {
                                return unwrap( dupedNames ).indexOf( unwrap( this.name ) ) !== -1;
                            }
                        };
                    } ) );

                    ko.applyBindings( bindings, bodyContent.getDOMNode() );

                } );

            return eventTarget;
        },
        /**
         * Resolves to component name by given gadgetConst
         * @param number
         * @returns {String|*}
         */
        getGadgetName: function( number ) {
            return GADGET_CONST.getGadgetNameByConst( number );
        },
        /**
         * Saves current dashboardModel
         * @returns {jQuery.Deferred}
         */
        save: function() {
            var
                self = this,
                data = self.dashboardModel.toJSON();

            return Y.doccirrus.jsonrpc.api.dashboard
                .saveUserConfiguration( {
                    noBlocking: true,
                    userId: Y.doccirrus.auth.getUserId(),
                    environment: self.get( 'environment' ),
                    data: data
                } )
                .done( function( response ) {
                    var
                        result = response.data;

                    if( result ) {
                        self.dashboardModel.setNotModified();
                    }
                } );

        }
    }, {
        NAME: 'DashboardBase',
        ATTRS: {
            /**
             * An environment this layout is for - acts as identifier
             * @attribute environment
             * @type String
             */
            environment: {value: null},
            /**
             * Default data for the dashboard model
             * @attribute dashboardModelDefaultData
             * @type Object
             */
            dashboardModelDefaultData: {
                valueFn: function() {
                    return {_id: createObjectId()};
                }
            },
            /**
             * Gadgets that are available for this layout to configure
             * @attribute availableGadgetNamesToAdd
             * @type Array
             * @example
             * [
             *     {val: 'GadgetBlue', i18n: 'GadgetBlue'},
             *     {val: 'GadgetGreen', i18n: 'GadgetGreen'},
             *     {val: 'GadgetEdit', i18n: 'GadgetEdit'}
             * ]
             */
            availableGadgetNamesToAdd: {
                valueFn: function() {
                    return [];
                }
            },
            /**
             * Available layout types as list
             * @attribute layoutList
             * @type Array
             */
            layoutList: {
                valueFn: function() {
                    return GADGET_LAYOUT_BASE.list;
                },
                validator: Array.isArray
            },
            /**
             * Default layout type from list
             * @attribute layoutDefaultValue
             * @type Number
             */
            layoutDefaultValue: {
                valueFn: function() {
                    return GADGET_LAYOUT_BASE.defaultType;
                },
                validator: Y.Lang.isNumber
            },
            /**
             * Available layout types
             * @attribute layoutTypes
             * @type Object
             */
            layoutTypes: {
                valueFn: function() {
                    return GADGET_LAYOUT_BASE.types;
                },
                validator: Y.Lang.isObject
            },
            /**
             * Callback of initialisation
             * @attribute onInitialized
             * @type null|Function
             */
            onInitialized: {value: null},
            /**
             * Callback of destroyed
             * @attribute onDestroyed
             * @type null|Function
             */
            onDestroyed: {value: null},
            /**
             * Disable dragging of gadgets
             * @attribute gadgetDraggingDisabled
             * @type Boolean
             * @default false
             */
            gadgetDraggingDisabled: {
                value: false,
                setter: function( value ) {
                    var
                        self = this;

                    if( ko.isWriteableObservable( self.gadgetDraggingDisabled ) ) {
                        self.gadgetDraggingDisabled( value );
                    }

                    return value;
                }
            },
            /**
             * DD delegate config used for gadget dragging
             * @attribute ddDelegateConfig
             * @type Object
             */
            ddDelegateConfig: {
                valueFn: function() {
                    var
                        self = this;

                    return {
                        nodes: '.Gadget-draggable, .Gadget-dropTarget',
                        target: true, // items should also be a drop target
                        handles: ['.Gadget-dragHandle'],
                        dragConfig: {
                            groups: [self.getDashboardDragGroup()] // unique drag group
                        }
                    };
                }
            }
        }
    } );

    KoViewModel.registerConstructor( DashboardBase );

}, '3.16.0', {
    requires: [
        'oop',
        'dd-delegate',
        'dd-constrain',
        'dd-proxy',
        'dd-scroll',

        'doccirrus',
        'KoViewModel',
        'GadgetConstants',
        'GadgetLayouts',
        'GadgetUtils',
        'GadgetLoader',

        'dashboard-schema',
        'DashboardModel',
        'DashboardBaseGadgetSelector',

        'DCWindow',
        'dcauth',
        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );
