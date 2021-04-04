/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PredefinedReportsListViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class PredefinedReportsListViewModel
     */
    function PredefinedReportsListViewModel() {
        PredefinedReportsListViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PredefinedReportsListViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function( data ) {
            var self = this;

            self.configData = data;
            self.presetMissingI18n = i18n('InSight2Mojit.timeSelector.PRESET_MISSING');

            self.initPredefinedReportsListViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyPredefinedReportsListViewModel();
        },
        initPredefinedReportsListViewModel: function() {
            var
                self = this;
            self.initTemplate();
            self.initSlidePanel();
        },
        selectPreset: function( preset ) {
            var presetId = preset._id;
            this.configData.currentPreset( presetId );
            this.configData.pr.changePreset();
            if( this.leftSidePanel ) {
                this.leftSidePanel.hideSideBar( true );
            }
        },
        sideBarConfig: null,
        leftSidePanel: null,
        isPinned: null,
        initSlidePanel: function() {
            var
                self = this,
                //binder = self.get( 'binder' ),
                ddDelegate,
                drag;

            self.isPinned = ko.observable( false );

            self.sideBarConfig = {
                side: 'left',
                name: 'predefinedReportsListView',
                panelHeading: i18n( 'InSight2Mojit.predefinedReports.list.HEADER' ),
                onInit: function( sideBar ) {
                    var
                        element = sideBar.$panelBody[0];

                    sideBar.$container.addClass( 'col-md-2' );

                    self.leftSidePanel = sideBar;

                    /**
                     * Initializes / re-initializes dragging
                     *
                     * Because of problems with plug/unplug scrolling on pinned (pinned = scroll window; unpinned scroll container),
                     * the dragging behaviour have to be re-initialized every time on a pin action, because initially it works as expected, but not when switching at runtime.
                     */
                    function initDrag() {
                        destroyDrag();

                        ddDelegate = new Y.DD.Delegate( {
                            container: element,
                            nodes: 'div.btn-block',
                            target: true, // items should also be a drop target
                            dragConfig: {}
                        } );
                        drag = ddDelegate.dd;

                        drag.addHandle( '.predefinedReportsListViewModel-dragHandle' );

                        // drag constrained
                        drag.plug( Y.Plugin.DDConstrained, {
                            constrain2node: element.querySelector( '.predefinedReportsListViewModel-container' ),
                            stickY: true
                        } );

                        // drag proxy
                        drag.plug( Y.Plugin.DDProxy, {
                            moveOnEnd: false,
                            resizeFrame: false,
                            cloneNode: true
                        } );

                        ddDelegate.on( {
                            'drag:start': function( yEvent ) {
                                var
                                    node = yEvent.target.get( 'node' ),
                                    dragNode = yEvent.target.get( 'dragNode' );

                                node.setStyle( 'opacity', 0.25 );
                                dragNode.setStyle( 'opacity', 0.65 );

                            },
                            'drag:end': function( yEvent ) {
                                var
                                    node = yEvent.target.get( 'node' );

                                node.setStyle( 'opacity', 1 );

                                drag.con.set( 'constrain2node', element.querySelector( '.predefinedReportsListViewModel-container' ) );
                                ddDelegate.syncTargets();

                            },
                            'drag:drophit': function( yEvent ) {
                                var
                                    dropNode = yEvent.drop.get( 'node' ),
                                    dragNode = yEvent.drag.get( 'node' ),
                                    dragData = ko.dataFor( dragNode.getDOMNode() ),
                                    dropData = ko.dataFor( dropNode.getDOMNode() ),
                                    buttons = self.configData.presetList,
                                    data = peek( buttons ),
                                    //dragIndex = data.indexOf( dragData ),
                                    dropIndex = data.indexOf( dropData ),
                                    settingsSorting;

                                buttons.remove( dragData );
                                buttons.splice( dropIndex, 0, dragData );

                                settingsSorting = Y.Array.dedupe( peek( buttons ).map( function( button ) {
                                    return button._id || undefined;
                                } ).filter( function( id ) {
                                    return Boolean( id );
                                } ) );

                                self.configData.pr.updateContainerConfig( {
                                    presetsOrder: settingsSorting
                                } );

                            }
                        } );
                    }

                    function destroyDrag() {
                        if( ddDelegate ) {
                            ddDelegate.destroy();
                            self.leftSidePanelDdDelegate = null;
                        }
                    }

                    sideBar.onPin = function( pinned, sideBar ) {
                        self.isPinned( pinned );

                        initDrag(); // @see description

                        // drag scroll  @see "initDrag" description
                        if( pinned ) {
                            drag.plug( Y.Plugin.DDWinScroll, {
                                horizontal: false,
                                buffer: 50
                            } );
                        }
                        else {
                            drag.plug( Y.Plugin.DDNodeScroll, {
                                horizontal: false,
                                buffer: 50,
                                node: sideBar.$container[0]
                            } );
                        }
                    };
                },
                onDestroy: function() {
                    if( ddDelegate ) {
                        ddDelegate.destroy();
                    }
                }
            };

        },
        destroyPredefinedReportsListViewModel: function() {

        },
        initTemplate: function() {
            var self = this;

            self.template = {
                name: self.get( 'templateName' ),
                data: self,
                afterRender: self.afterRender.bind( self ),
                afterAdd: self.afterAdd.bind( self ),
                beforeRemove: self.beforeRemove.bind( self )
            };
        },
        afterRender: function() {

        },
        afterAdd: function() {

        },
        beforeRemove: function() {

        }
    }, {
        NAME: 'PredefinedReportsListViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InSight2MojitBinderInsight2' );
                }
            },
            templateName: {
                value: 'predefinedReportsListViewModel',
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( PredefinedReportsListViewModel );

}, '3.16.0', {
    requires: [
        'dd-delegate',
        'dd-constrain',
        'dd-proxy',
        'dd-scroll',

        'doccirrus',
        'KoViewModel',
        'activity-schema',
        'dc-comctl',
        'dcutils-uam',
        'inCaseUtils'
    ]
} );
