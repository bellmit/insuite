/**
 * User: pi
 * Date: 25/01/16  10:55
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'ActivityCreateButtonsViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class ActivityCreateButtonsViewModel
     */
    function ActivityCreateButtonsViewModel() {
        ActivityCreateButtonsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivityCreateButtonsViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function ActivityCreateButtonsViewModel_initializer() {
            var
                self = this;

            self.initActivityCreateButtonsViewModel();
        },
        /** @protected */
        destructor: function ActivityCreateButtonsViewModel_destructor() {
            var
                self = this;

            self.destroyActivityCreateButtonsViewModel();
        },
        initActivityCreateButtonsViewModel: function ActivityCreateButtonsViewModel_initActivityCreateButtonsViewModel() {
            var
                self = this;

            self.createButtons();
            self.initSlidePanel();
            this.createActivity = this.createActivity.bind(this);
        },
        sideBarConfig: null,
        leftSidePanel: null,
        isPinned: null,
        wasPinned: null,
        initSlidePanel: function ActivityCreateButtonsViewModel_initSlidePanel() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                ddDelegate,
                drag;

            self.isPinned = ko.observable( false );
            self.wasPinned = false;

            self.sideBarConfig = {
                side: 'left',
                name: 'activityCreateButtonsView',
                panelHeading: i18n( 'InCaseMojit.casefile_browser.title.NEW_ENTRY' ),
                visible: self.addDisposable( ko.computed( function() {
                    var caseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                        isEDOC = caseFolder && Y.doccirrus.schemas.casefolder.isEDOC( caseFolder ),
                        isPinned = self.isPinned();

                    if( self.leftSidePanel && isEDOC && isPinned ) {
                        self.wasPinned = true;
                        self.leftSidePanel.setPinned( false, true );
                    } else if( self.leftSidePanel && !isEDOC && !isPinned && self.wasPinned ) {
                        self.wasPinned = false;
                        self.leftSidePanel.setPinned( true, true );
                    }

                    return !isEDOC;
                } ) ),
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

                        drag.addHandle( '.activityCreateButtonsViewModel-dragHandle' );

                        // drag constrained
                        drag.plug( Y.Plugin.DDConstrained, {
                            constrain2node: element.querySelector( '.activityCreateButtonsViewModel-container' ),
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

                                drag.con.set( 'constrain2node', element.querySelector( '.activityCreateButtonsViewModel-container' ) );
                                ddDelegate.syncTargets();

                            },
                            'drag:drophit': function( yEvent ) {
                                var
                                    dropNode = yEvent.drop.get( 'node' ),
                                    dragNode = yEvent.drag.get( 'node' ),
                                    dragData = ko.dataFor( dragNode.getDOMNode() ),
                                    dropData = ko.dataFor( dropNode.getDOMNode() ),
                                    buttons = self.getButtons(),
                                    data = peek( buttons ),
                                //dragIndex = data.indexOf( dragData ),
                                    dropIndex = data.indexOf( dropData ),
                                    settingsSorting;

                                buttons.remove( dragData );
                                buttons.splice( dropIndex, 0, dragData );

                                settingsSorting = Y.Array.dedupe( peek( buttons ).map( function( button ) {
                                    return button.activitySetting && button.activitySetting._id || undefined;
                                } ).filter( function( id ) {
                                    return Boolean( id );
                                } ) );

                                Y.doccirrus.jsonrpc.api.activitysettingsuser
                                    .saveSettingsSorting( {
                                        userId: Y.doccirrus.auth.getUserId(),
                                        settingsSorting: settingsSorting
                                    } )
                                    .done( function( response ) {
                                        binder.setInitialData( 'activitysettingsuser', response.data );
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
        destroyActivityCreateButtonsViewModel: function ActivityCreateButtonsViewModel_destroyActivityCreateButtonsViewModel() {

        },
        createButtons: function ActivityCreateButtonsViewModel_createButtons() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = ko.unwrap( binder.currentPatient ),
                userLang = Y.doccirrus.comctl.getUserLang(),
                filteredList,
                specialModKinds = Y.doccirrus.schemas.settings.specialModuleKinds,
                hasQDocuLicense = Y.doccirrus.auth.hasSpecialModule( specialModKinds.QDOCU ),
                activityTypeList = binder.getInitialData( 'activityTypes' ).list,
                activitysettingsuser = binder.getInitialData( 'activitysettingsuser' ),
                settingsSorting = activitysettingsuser && activitysettingsuser.settingsSorting || [],
                actTypeConfig = Y.doccirrus.schemas.activity.getActTypeClientConfig(),
                buttons,
                isGermany = Y.doccirrus.commonutils.doesCountryModeIncludeGermany(),
                isSwitz = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

            self.template = {
                name: self.get( 'templateName' ),
                data: self,
                afterRender: self.afterRender.bind( self ),
                afterAdd: self.afterAdd.bind( self ),
                beforeRemove: self.beforeRemove.bind( self )
            };

            self.lang = '-' + userLang;

            //  not all activity types can be created by user, even if they can be displayed in the casefolder
            filteredList = activityTypeList.filter( function checkAllowed( item ) {
                if ( actTypeConfig[ item.val ] && actTypeConfig[ item.val ].blockCreation ) {
                    //  this act type cannot be created manually in casefile (FROMPATIENT, etc)
                    return false;
                }

                //  QDocu if QDocu License is present
                if ( 'QDOCU' === item.val && !hasQDocuLicense ) {
                    return false;
                }

                //  special rule for inGyn, only show GRAVIDOGRAMM for female patients
                if ( 'GRAVIDOGRAMM' === item.val && 'FEMALE' !== ko.unwrap( currentPatient.gender ) ) {
                    return false;
                }

                item.hideForCurrentCaseFolder = ko.computed( function() {
                    ko.unwrap( currentPatient.caseFolderCollection.activeCaseFolderId ); // This will triger the computed
                    // on changing the casefolder tab
                    var activeTab = currentPatient.caseFolderCollection.getActiveTab();
                    var currentCaseFolderType = activeTab && activeTab.type;

                    return currentCaseFolderType && Array.isArray( item.blockForCaseFolderTypes ) && item.blockForCaseFolderTypes.indexOf( currentCaseFolderType ) > -1;
                } );

                //skip country specific prescriptions;
                if( ['LONGPRESCR'].indexOf( item.val ) !== -1 && isGermany ){
                    return false;
                }
                if( ['PUBPRESCR', 'PRESCRBTM', 'PRESCRG', 'PRESCRT', 'PRESASSISTIVE'].indexOf( item.val ) !== -1 && isSwitz ){
                    return false;
                }

                // add if act type is configured to be visible
                return item.visible;
            } );

            buttons = filteredList.map( self.actTypeMapper.bind( self ) );

            // sort buttons by settingsSorting
            if( settingsSorting.length ) {
                buttons.sort( function( a, b ) {
                    var valueA, valueB;
                    if( a.activitySetting ) {
                        valueA = settingsSorting.indexOf( a.activitySetting._id );
                    }
                    if( b.activitySetting ) {
                        valueB = settingsSorting.indexOf( b.activitySetting._id );
                    }
                    if( valueA > valueB ) {
                        return 1;
                    }
                    if( valueA < valueB ) {
                        return -1;
                    }
                    return 0;
                } );
            }

            self.buttons = ko.observableArray( buttons );
        },

        getButtons: function() {
            var self = this;
            return self.buttons;
        },

        createActivity: function( data ) {
            var self = this;
            data.newActivityConfig = data.newActivityConfig ? data.newActivityConfig : {};

            if ( data.userContent && '' !== data.userContent ) {
                data.newActivityConfig.userContent = data.userContent;
            }

            Y.doccirrus.inCaseUtils.createActivity( data );

            if( self.leftSidePanel ) {
                self.leftSidePanel.hideSideBar( true );
            }
        },

        actTypeMapper: function ActivityCreateButtonsViewModel_actTypeMapper( actTypeDesc ) {
            return {
                actType: actTypeDesc.val,
                title: actTypeDesc.i18n,
                color: actTypeDesc.activitySetting && actTypeDesc.activitySetting.color || '',
                name: 'activityCreateButton-' + actTypeDesc.val,
                activitySetting: actTypeDesc.activitySetting,
                hideForCurrentCaseFolder: actTypeDesc.hideForCurrentCaseFolder
            };
        },
        afterRender: function ActivityCreateButtonsViewModel_afterRender() {

        },
        afterAdd: function ActivityCreateButtonsViewModel_afterAdd() {

        },
        beforeRemove: function ActivityCreateButtonsViewModel_beforeRemove() {

        }
    }, {
        NAME: 'ActivityCreateButtonsViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' )  || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            },
            templateName: {
                value: 'activityCreateButtonsViewModel',
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( ActivityCreateButtonsViewModel );

}, '3.16.0', {
    requires: [
        'oop',
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
