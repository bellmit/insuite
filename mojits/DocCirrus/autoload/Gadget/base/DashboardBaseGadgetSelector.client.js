/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'DashboardBaseGadgetSelector', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module DashboardBaseGadgetSelector
     */
    var
        // unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        // ignoreDependencies = ko.ignoreDependencies,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,

        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        GADGET_UTILS = GADGET.utils,
        requireYuiModule = GADGET_UTILS.requireYuiModule,
        makeDragEventData = GADGET_UTILS.makeDragEventData,
        TPL_PATH_BASE = GADGET_CONST.paths.TPL_BASE,

        SELECTOR_DRAG_CLASS_NAME = 'DashboardBaseGadgetSelector-drag',
        SELECTOR_PROXY_CLASS_NAME = 'DashboardBaseGadgetSelector-proxy',
        SELECTOR_PROXY_CLASS_NAME_VALID = 'DashboardBaseGadgetSelector-proxy-valid',
        SELECTOR_PROXY_CLASS_NAME_INVALID = 'DashboardBaseGadgetSelector-proxy-invalid';

    /**
     * @constructor
     * @class DashboardBaseGadgetSelector
     */
    function DashboardBaseGadgetSelector() {
        DashboardBaseGadgetSelector.superclass.constructor.apply( this, arguments );
    }

    Y.extend( DashboardBaseGadgetSelector, KoViewModel.getDisposable(), {
        /** @private */
        initializer: function() {
            var
                self = this;
            self.noGadgetsPlaceableI18n = i18n( 'DashboardBase.DashboardBaseGadgetSelector.noGadgetsPlaceable' );

            self._initEventTarget();
            self._initPromise();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self.destroyEventTarget();
        },
        /**
         * Event target to notify about interaction ('cancel', 'drop')
         * @type null|Y.EventTarget
         */
        eventTarget: null,
        /** @private */
        _initEventTarget: function() {
            var
                self = this,
                eventTarget;

            if( !self.eventTarget ) {
                eventTarget = self.eventTarget = new Y.EventTarget();

                eventTarget.publish( 'cancel', {preventable: false} );
                eventTarget.publish( 'drop', {preventable: false} );
            }

        },
        /** @protected */
        destroyEventTarget: function() {
            var
                self = this,
                eventTarget = self.eventTarget;

            if( eventTarget ) {
                self.eventTarget.detachAll();
                self.eventTarget = null;
            }

        },
        /**
         * Path of template to use in dialog
         * @protected
         */
        gadgetSelectorTplPath: TPL_PATH_BASE + 'DashboardBaseGadgetSelector',
        /**
         * Class name applied to element which is dragged via proxy
         */
        gadgetSelectorDragClassName: SELECTOR_DRAG_CLASS_NAME,
        /**
         * Class name applied to proxy element which is dragged
         */
        gadgetSelectorProxyClassName: SELECTOR_PROXY_CLASS_NAME,
        /**
         * Class name applied to proxy element when dropping is valid
         */
        gadgetSelectorProxyClassNameValid: SELECTOR_PROXY_CLASS_NAME_VALID,
        /**
         * Class name applied to proxy element when dropping is invalid
         */
        gadgetSelectorProxyClassNameInValid: SELECTOR_PROXY_CLASS_NAME_INVALID,
        /**
         * Main promise responsible to build up needed things
         * @type null|Promise
         * @protected
         */
        promise: null,
        /** @private */
        _initPromise: function() {
            var
                self = this,
                host = self.get( 'host' ),
                // There might be static things needed from the constructors of available gadgets
                availableGadgetNamesToAdd = host.get( 'availableGadgetNamesToAdd' ),
                availableGadgetsConstructorNames = availableGadgetNamesToAdd.map( function( availableGadgetName ) {
                    return availableGadgetName.val;
                } );

            self.promise = Promise
                .props( {
                    availableGadgetsConstructorNames: requireYuiModule( availableGadgetsConstructorNames ),
                    template: Y.doccirrus.jsonrpc.api.jade
                        .renderFile( {noBlocking: true, path: self.gadgetSelectorTplPath} )
                        .then( function( response ) {
                            return response.data;
                        } )
                } )
                .then( Y.bind( self.onPromiseResolved, self ) );
        },
        /** @protected */
        onPromiseResolved: function( props ) {
            var
                self = this,
                host = self.get( 'host' ),
                eventTarget = self.eventTarget,
                ddContainerElement = peek( host._ddContainerElement ),
                ddDelegate,
                bindings = self._createGadgetSelectorBindings(),
                bodyContent = Y.Node.create( props.template ),
                dialog = new Y.doccirrus.DCWindow( {
                    id: 'DCWindow-DashboardBaseGadgetSelector',
                    className: 'DCWindow-DashboardBaseGadgetSelector',
                    bodyContent: bodyContent,
                    title: i18n( 'DashboardBase.DashboardBaseGadgetSelector.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_SMALL,
                    height: 400,
                    minHeight: 400,
                    minWidth: Y.doccirrus.DCWindow.SIZE_SMALL,
                    centered: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' )
                        ]
                    },
                    after: {
                        visibleChange: function( yEvent ) {
                            // also captures cancel for e.g.: ESC
                            if( !yEvent.newVal ) {
                                setTimeout( function() { // delay for letting others fire first
                                    eventTarget.fire( 'cancel' );
                                    eventTarget.detachAll();

                                    if( ddDelegate ) {
                                        ddDelegate.destroy();
                                    }
                                    self._disposeGadgetSelectorBindings( bindings );

                                    ko.cleanNode( bodyContent.getDOMNode() );

                                    host.gadgetSelector( null );
                                    self.destroy();

                                }, 10 );
                            }
                        }
                    }
                } ),
                boundingBox = dialog.get( 'boundingBox' ),
                drag;

            self.set( 'boundingBox', boundingBox );

            ko.applyBindings( bindings, bodyContent.getDOMNode() );

            ddDelegate = new Y.DD.Delegate( {
                container: boundingBox,
                nodes: '.DashboardBaseGadgetSelector-Gadget-draggable',
                target: false,
                dragConfig: {
                    groups: [host.getDashboardDragGroup()],
                    startCentered: true
                }
            } );
            drag = ddDelegate.dd;

            self.set( 'ddDelegate', ddDelegate );

            // drag scroll
            drag.plug( Y.Plugin.DDWinScroll, {
                horizontal: false,
                buffer: 50
            } );

            // drag proxy
            drag.plug( Y.Plugin.DDProxy, {
                moveOnEnd: false,
                resizeFrame: false,
                cloneNode: true
            } );

            // overwrite drag proxy clone to support drag outside dialog
            drag.proxy.clone = function() {
                var dragHost = this.get( 'host' ),
                    n = dragHost.get( 'node' ),
                    c = n.cloneNode( true );

                c.all( 'input[type="radio"]' ).removeAttribute( 'name' );

                delete c._yuid;
                c.setAttribute( 'id', Y.guid() );
                c.setStyle( 'position', 'absolute' );
                c.setStyle( 'zIndex', boundingBox.getStyle( 'zIndex' ) );
                self._adjustGadgetSelectorDragProxyClone( c );
                boundingBox.get( 'parentNode' ).appendChild( c );
                dragHost.set( 'dragNode', c );
                return c;
            };

            // overwrite drag start method to do things that doesn't work to do later
            drag.start = function() {

                host.gadgetDragging( true );

                Y.all( ddContainerElement.querySelectorAll( '.Gadget-draggable, .Gadget-dropTarget' ) ).each( self._applyDropTarget, self );

                Y.DD.Drag.prototype.start.apply( this, arguments );
            };

            ddDelegate.on( {
                'drag:start': self._ddDelegateOnDragStart,
                'drag:enter': self._ddDelegateOnDragEnter,
                'drag:exit': self._ddDelegateOnDragExit,
                'drag:drag': self._ddDelegateOnDragDrag,
                'drag:end': self._ddDelegateOnDragEnd,
                'drag:drophit': self._ddDelegateOnDropHit,
                'drag:dropmiss': self._ddDelegateOnDropMiss
            }, null, self );

            host.gadgetSelector( dialog );

        },
        /**
         * DD ignores layers, it just compares regions - so reject if drop target is overlaid
         * @param yEvent
         * @returns {Boolean}
         * @protected
         */
        _isDropTargetOverlaidByDialog: function( yEvent ) {
            var
                self = this,
                boundingBox = self.get( 'boundingBox' );

            return boundingBox.inRegion( Y.DOM._getRegion(
                yEvent.target.mouseXY[1], // top
                yEvent.target.mouseXY[0], // right
                yEvent.target.mouseXY[1], // bottom
                yEvent.target.mouseXY[0]  // left
            ) );
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

            node.addClass( self.gadgetSelectorDragClassName );
            dragNode.addClass( self.gadgetSelectorProxyClassName );

            dragNode.replaceClass(
                self.gadgetSelectorProxyClassNameValid,
                self.gadgetSelectorProxyClassNameInValid
            );
        },
        /** @private **/
        _ddDelegateOnDragStart: function( yEvent ) {
            var
                self = this;

            self.onDragStart( makeDragEventData( yEvent.target, null, yEvent ) );
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
                    self.gadgetSelectorProxyClassNameInValid,
                    self.gadgetSelectorProxyClassNameValid
                );
            }
        },
        /** @private **/
        _ddDelegateOnDragEnter: function( yEvent ) {
            var
                self = this;

            self.set( 'aboveDrop', yEvent.drop );
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
                self.gadgetSelectorProxyClassNameValid,
                self.gadgetSelectorProxyClassNameInValid
            );
        },
        /** @private **/
        _ddDelegateOnDragExit: function( yEvent ) {
            var
                self = this;

            self.set( 'lastDrop', yEvent.drop );
            self.set( 'aboveDrop', null );
        },
        /**
         * @param {Object} parameters
         * @param {DD.Drag} parameters.drag
         * @param {null|DD.Drop} parameters.drop
         * @param {EventFacade} parameters._event
         */
        onDrag: function( /*parameters*/ ) {
        },
        /** @private **/
        _ddDelegateOnDragDrag: function( yEvent ) {
            var
                self = this,
                drop,
                drag = yEvent.target,
                currentDropLast = self.get( 'currentDrop' ),
                currentDrop;

            if( self._isDropTargetOverlaidByDialog( yEvent ) ) {
                currentDrop = null;
            }
            else {
                currentDrop = self.get( 'aboveDrop' );
            }

            self.onDrag( makeDragEventData( yEvent.target, currentDrop, yEvent ) );

            if( currentDrop !== currentDropLast ) {
                self.set( 'currentDrop', currentDrop );
                if( currentDrop ) {
                    self.onDragEnterDrop( makeDragEventData( drag, currentDrop, yEvent ) );
                }
                else {
                    drop = self.get( 'aboveDrop' ) || self.get( 'lastDrop' );
                    self.onDragLeaveDrop( makeDragEventData( drag, drop, yEvent ) );
                }
            }

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
                host = self.get( 'host' ),
                drag = parameters.drag,
                node = drag.get( 'node' );

            node.removeClass( self.gadgetSelectorDragClassName );
            host.gadgetDragging( false );

        },
        /** @private **/
        _ddDelegateOnDragEnd: function( yEvent ) {
            var
                self = this;

            self.onDragEnd( makeDragEventData( yEvent.target, null, yEvent ) );
        },
        /**
         * @param {Object} parameters
         * @param {DD.Drag} parameters.drag
         * @param {DD.Drop} parameters.drop
         * @param {EventFacade} parameters._event
         */
        onDragHitDrop: function( parameters ) {
            var self = this,
                yEvent = parameters._event,
                host = self.get( 'host' ),
                eventTarget = self.eventTarget,
                ddContainerElement = peek( host._ddContainerElement ),
                activeDashboardObservable = host.activeDashboard,
                dragNode = yEvent.drag.get( 'node' ),
                dropNode = yEvent.drop.get( 'node' ),

                dragData = ko.dataFor( dragNode.getDOMNode() ),
                dropData = ko.dataFor( dropNode.getDOMNode() ),

                gadgetName = dragData.val,
                isDropTarget = Boolean( dropData.isDrop ),

                activeDashboardModel = peek( activeDashboardObservable ),
                collectionsObservable = activeDashboardModel.collections,
                collectionsArray = peek( collectionsObservable ),

                dropCollection, dropGadgetsIndex,

                gadgetConfig = self._createGadgetSelectorDropGadgetConfig( yEvent ),
                gadgetModel;

            if( isDropTarget ) {
                gadgetModel = host.addGadget( gadgetName, dropData.gadgetCollection, null, gadgetConfig );
            }
            else {

                dropCollection = Y.Array.find( collectionsArray, function( collection ) {
                    return peek( collection.gadgets ).some( function( gadget, index ) {
                        var isGadget = dropData === gadget;
                        if( isGadget ) {
                            dropGadgetsIndex = index;
                        }
                        return isGadget;
                    } );
                } );

                gadgetModel = host.addGadget( gadgetName, dropCollection, dropGadgetsIndex, gadgetConfig );
            }

            Y.all( ddContainerElement.querySelectorAll( '.Gadget-draggable' ) ).each( self._applyDropTarget, self );

            eventTarget.fire( 'drop', {}, {
                gadget: gadgetModel
            } );
        },
        /** @private **/
        _ddDelegateOnDropHit: function( yEvent ) {
            var
                self = this;

            if( !self._isDropTargetOverlaidByDialog( yEvent ) && self.isValidDragDropEvent( makeDragEventData( yEvent.drag, yEvent.drop, yEvent ) ) ) {

                self.onDragHitDrop( makeDragEventData( yEvent.target, self.get( 'aboveDrop' ), yEvent ) );
            }
            else {
                self.onDragMissDrop( makeDragEventData( yEvent.target, null, yEvent ) );
            }

            self.set( 'aboveDrop', null );
            self.set( 'currentDrop', null );
            self.set( 'lastDrop', null );
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

            self.set( 'aboveDrop', null );
            self.set( 'currentDrop', null );
            self.set( 'lastDrop', null );

            self.onDragMissDrop( makeDragEventData( yEvent.target, null, yEvent ) );
        },
        /** @protected **/
        _applyDropTarget: function( node ) {
            var
                self = this,
                ddDelegate = self.get( 'ddDelegate' ),
                host = self.get( 'host' );

            ddDelegate.createDrop( node, [host.getDashboardDragGroup()] );
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
        /**
         * Bindings to use in gadget selector.
         * @returns {Object}
         * @protected
         */
        _createGadgetSelectorBindings: function() {
            var
                self = this,
                host = self.get( 'host' ),
                bindings = {
                    gadgetNames: host.get( 'availableGadgetNamesToAdd' ),
                    gadgetName: ko.observable(),
                    gadgetsPlaceAble: true,
                    noGadgetsPlaceableI18n: self.noGadgetsPlaceableI18n
                };

            return bindings;
        },
        /**
         * Dispose bindings in gadget selector.
         * @param {Object} bindings
         * @protected
         */
        _disposeGadgetSelectorBindings: function( /*bindings*/ ) {
        },
        /**
         * Adjust cloned node of drag proxy inside gadget selector.
         * @param {Node} cloneNode
         * @protected
         */
        _adjustGadgetSelectorDragProxyClone: function( /*cloneNode*/ ) {
        },
        /**
         * Default gadget model data to use when drop creates a new gadget.
         * @protected
         * @param {EventFacade} yEvent
         * @returns {Object}
         */
        _createGadgetSelectorDropGadgetConfig: function( /*yEvent*/ ) {
            return {};
        }
    }, {
        NAME: 'DashboardBaseGadgetSelector',
        ATTRS: {
            /**
             * The instance hosting this selector
             * @attribute host
             */
            host: {value: null},
            /** @private **/
            aboveDrop: {value: null},
            /** @private **/
            lastDrop: {value: null},
            /**
             * Current drop dragging over
             * @attribute currentDrop
             * @type {null|DD.Drop}
             */
            currentDrop: {value: null},
            /**
             * The boundingBox node of the dialog
             * @attribute boundingBox
             */
            boundingBox: {value: null},
            /**
             * The DD.Delegate instance of the dialog
             * @attribute ddDelegate
             */
            ddDelegate: {value: null}
        }
    } );

    KoViewModel.registerConstructor( DashboardBaseGadgetSelector );

}, '3.16.0', {
    requires: [
        'oop',
        'dd-delegate',
        'dd-proxy',
        'dd-scroll',

        'doccirrus',
        'KoViewModel',
        'GadgetConstants',
        'GadgetUtils',
        'DCWindow',

        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );
