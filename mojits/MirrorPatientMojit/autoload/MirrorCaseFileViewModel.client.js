/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, jQuery */
YUI.add( 'MirrorCaseFileViewModel', function( Y, NAME ) {
    'use strict';

    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        ignoreDependencies = ko.ignoreDependencies,
        i18n = Y.doccirrus.i18n,
        BL_EXCEEDED = i18n( 'InCaseMojit.casefile_navJS.message.BL_EXCEEDED' ),
        SHOW_LEFT_SIDE_PANEL = i18n( 'InCaseMojit.casefile_browserJS.hotkey.SHOW_LEFT_SIDE_PANEL' ),
        SHOW_RIGHT_SIDE_PANEL = i18n( 'InCaseMojit.casefile_browserJS.hotkey.SHOW_RIGHT_SIDE_PANEL' ),
        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel,

        MirrorPatientMojitViewModel = KoViewModel.getConstructor( 'MirrorPatientMojitViewModel' ),

        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),

        ActivityPatientInfoViewModel = KoViewModel.getConstructor( 'MirrorActivityPatientInfoViewModel' ),
        ActivityDetailsViewModel = KoViewModel.getConstructor( 'MirrorActivityDetailsViewModel' ),
        ActivityCaseFileButtonsViewModel = KoViewModel.getConstructor( 'MirrorActivityCaseFileButtonsViewModel' ),
        ActivityCaseFoldersViewModel = KoViewModel.getConstructor( 'ActivityCaseFoldersViewModel' ),
        ActivityCreateButtonsViewModel = KoViewModel.getConstructor( 'ActivityCreateButtonsViewModel' ),
        ActivitySequenceViewModel = KoViewModel.getConstructor( 'ActivitySequenceViewModel' );

    /**
     * @constructor
     * @class MirrorCaseFileViewModel
     * @extends MirrorPatientMojitViewModel
     */
    function MirrorCaseFileViewModel() {
        MirrorCaseFileViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( MirrorCaseFileViewModel, MirrorPatientMojitViewModel, {
        templateName: 'MirrorCaseFileViewModel',

        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initMirrorCaseFileViewModel();
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyMirrorCaseFileViewModel();
        },
        initMirrorCaseFileViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) );

            self.initActivityCaseFoldersViewModel();
            self.initActivitiesTable();

            self.initActivityPatientInfoViewModel();
            self.addDisposable( ko.computed( function() {

                return ignoreDependencies( function() {
                    var
                        currentActivityPatientInfoViewModel = peek( self.activityPatientInfoViewModel );

                    if( currentActivityPatientInfoViewModel ) {
                        currentActivityPatientInfoViewModel.destroy();
                    }

                    if( currentPatient ) {
                        self.activityPatientInfoViewModel( new ActivityPatientInfoViewModel() );
                    }
                    else {
                        self.activityPatientInfoViewModel( null );
                    }
                } );

            } ) );

            self.initActivityDetailsViewModel();
            self.addDisposable( ko.computed( function() {
                var
                    currentActivity = unwrap( binder.currentActivity );

                return ignoreDependencies( function() {
                    var
                        currentActivityDetailsViewModel = peek( self.activityDetailsViewModel );

                    if( currentActivityDetailsViewModel ) {
                        currentActivityDetailsViewModel.destroy();
                    }

                    if( currentActivity ) {
                        self.activityDetailsViewModel( new ActivityDetailsViewModel() );
                    }
                    else {
                        self.activityDetailsViewModel( null );
                    }
                } );

            } ) );

            self.initActivityCaseFileButtonsViewModel();
            self.addDisposable( ko.computed( function() {
                var
                    currentActivity = unwrap( binder.currentActivity );

                return ignoreDependencies( function() {
                    var
                        currentActivityCaseFileButtonsViewModel = peek( self.activityCaseFileButtonsViewModel );

                    if( currentActivityCaseFileButtonsViewModel ) {
                        currentActivityCaseFileButtonsViewModel.destroy();
                    }

                    if( currentActivity ) {
                        self.activityCaseFileButtonsViewModel( null );
                    }
                    else {
                        self.activityCaseFileButtonsViewModel( new ActivityCaseFileButtonsViewModel() );
                    }
                } );

            } ) );

            self.initActivityCreateButtonsViewModel();
            //self.initActivitySequenceViewModel();
            self.initColumnClassName();
            self.initSocketListeners();
            self.initComputedIsCurrentView();

        },
        initComputedIsCurrentView: function() {
            var
                self = this;

            self.addDisposable( ko.computed( function() {
                var
                    isCurrentView = unwrap( self.isCurrentView );

                ignoreDependencies( function() {
                    if( isCurrentView ) {
                        self.attachActivitiesTableShowMoreContentListener();
                    }
                    else {
                        self.detachActivitiesTableShowMoreContentListener();
                    }
                } );
            } ) );
        },
        initHotKeys: function() {
            var
                self = this,
                binder = self.get( 'binder' );
            self.hotKeysGroup = Y.doccirrus.HotKeysHandler.addGroup( 'CaseFileViewModel' );
            self.hotKeysGroup
                .on( 'ctrl+a', 'Anamnese hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'HISTORY'
                    } );
                } )
                .on( 'ctrl+d', 'Diagnose hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'DIAGNOSIS'
                    } );
                } )
                .on( 'ctrl+f', 'Formular hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'FORM'
                    } );
                } )
                .on( 'ctrl+k', 'Kassenrezept Formular hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'PUBPRESCR'
                    } );
                } )
                .on( 'ctrl+l', 'Leistung hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'TREATMENT'
                    } );
                } )
                .on( 'ctrl+m', 'Medikament hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'MEDICATION'
                    } );
                } )
                .on( 'ctrl+e', 'Neuen Eintrag hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createActivity();
                } )
                .on( 'ctrl+r', 'Privatrezept Formular hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'PRIVPRESCR'
                    } );
                } )
                .on( 'ctrl+b', 'Schein hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'SCHEIN'
                    } );
                } )
                .on( 'shift+ctrl+b', 'Fall hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createNewCaseFolderWithSchein();
                } )
                .on( 'shift+ctrl+k', 'Kontakt hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'CONTACT'
                    } );
                } )
                .on( 'ctrl+u', 'Überweisungsformular hinzufügen', function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'REFERRAL'
                    } );
                } )
                .on( 'ctrl+p', 'Wechsel in Patientenliste', function() {
                    binder.navigateToPatientBrowser();
                } )
                .on( 'shift+ctrl+z', i18n( 'InCaseMojit.casefile_browserJS.hotkey.CREATE_OPHTHALMOLOGY_TONOMETRY' ), function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'OPHTHALMOLOGY_TONOMETRY'
                    } );
                } )
                .on( 'shift+ctrl+m', 'Neuer Termin', function() {
                    var
                        binder = self.get( 'binder' );
                    binder.navigateToCalendar();
                } )
                .on( 'shift+ctrl+r', i18n( 'InCaseMojit.casefile_browserJS.hotkey.CREATE_OPHTHALMOLOGY_REFRACTION' ), function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'OPHTHALMOLOGY_REFRACTION'
                    } );
                } )
                .on( 'shift+ctrl+a', i18n( 'InCaseMojit.casefile_browserJS.hotkey.CREATE_AU' ), function() {
                    Y.doccirrus.inCaseUtils.createActivity( {
                        actType: 'AU'
                    } );
                } )
                .on( 'shift+ctrl+arrowLeft', SHOW_LEFT_SIDE_PANEL, function() {
                    var
                        activityCreateButtonsViewModel = peek( self.activityCreateButtonsViewModel ),
                        leftSidePanel = activityCreateButtonsViewModel && activityCreateButtonsViewModel.leftSidePanel;
                    if( leftSidePanel ) {
                        leftSidePanel.toggleSideBar();
                    }
                } )
                .on( 'shift+ctrl+arrowRight', SHOW_RIGHT_SIDE_PANEL, function() {
                    var
                        activitySequenceViewModel = peek( self.activitySequenceViewModel ),
                        rightSidePanel = activitySequenceViewModel && activitySequenceViewModel.rightSidePanel;
                    if( rightSidePanel ) {
                        rightSidePanel.toggleSideBar();
                    }
                } );

        },
        /**
         * Attached event delegation for activities table "more"-link
         */
        _ActivitiesTableShowMoreContentListener: null,
        /**
         * Attaches event delegation for activities table "more"-link
         */
        attachActivitiesTableShowMoreContentListener: function() {
            var
                self = this;

            self._ActivitiesTableShowMoreContentListener = Y.delegate( 'click', self.onActivitiesTableShowMoreContent, document.body, 'td.KoTableCell-forPropertyName-content a.onActivitiesTableShowMoreContent-more', self );
        },
        /**
         * Detaches event delegation for activities table "more"-link
         */
        detachActivitiesTableShowMoreContentListener: function() {
            var
                self = this;

            if( self._ActivitiesTableShowMoreContentListener ) {
                self._ActivitiesTableShowMoreContentListener.detach();
                self._ActivitiesTableShowMoreContentListener = null;
            }
        },
        /**
         * Handles activities table "more"-link
         * @param yEvent
         */
        onActivitiesTableShowMoreContent: function( yEvent ) {
            var
                yTarget = yEvent.target,
                yDetail = yTarget ? yTarget.next( '.onActivitiesTableShowMoreContent-detail' ) : null,
                hidden = yDetail ? yDetail.hasClass( 'onActivitiesTableShowMoreContent-detail-hidden' ) : null;

            if ( !yDetail ) { return; }

            if( hidden ) {
                yDetail.removeClass( 'onActivitiesTableShowMoreContent-detail-hidden' );
                yDetail.addClass( 'onActivitiesTableShowMoreContent-detail-shown' );
            }
            else {
                yDetail.removeClass( 'onActivitiesTableShowMoreContent-detail-shown' );
                yDetail.addClass( 'onActivitiesTableShowMoreContent-detail-hidden' );
            }
        },
        destroyHotKeys: function() {
            var
                self = this;
            if( self.hotKeysGroup ) {
                self.hotKeysGroup
                    .un( 'ctrl+a' )
                    .un( 'ctrl+d' )
                    .un( 'ctrl+f' )
                    .un( 'ctrl+k' )
                    .un( 'ctrl+l' )
                    .un( 'ctrl+m' )
                    .un( 'ctrl+e' )
                    .un( 'ctrl+r' )
                    .un( 'ctrl+b' )
                    .un( 'shift+ctrl+b' )
                    .un( 'shift+ctrl+k' )
                    .un( 'ctrl+u' )
                    .un( 'ctrl+p' )
                    .un( 'shift+ctrl+z' )
                    .un( 'shift+ctrl+m' )
                    .un( 'shift+ctrl+r' )
                    .un( 'shift+ctrl+a' )
                    .un( 'shift+ctrl+arrowLeft' )
                    .un( 'shift+ctrl+arrowRight' );
                self.hotKeysGroup = null;
            }
        },
        destroyMirrorCaseFileViewModel: function() {
            var
                self = this;

            self.destroyActivityPatientInfoViewModel();
            self.destroyActivityDetailsViewModel();
            self.destroyActivityCaseFileButtonsViewModel();
            self.destroyActivityCaseFoldersViewModel();
            self.destroyActivityCreateButtonsViewModel();
            //self.destroyActivitySequenceViewModel();
            //self.destroyCaseFolders();
            //self.destroySocketListeners();
            //self.destroyHotKeys();
            self.detachActivitiesTableShowMoreContentListener();
            self.destroyActivitiesTable();
        },
        activityPatientInfoViewModel: null,
        initActivityPatientInfoViewModel: function() {
            var
                self = this,
                observable;

            if( !self.activityPatientInfoViewModel ) {
                observable = ko.observable( null );
                self.activityPatientInfoViewModel = ko.computed( {
                    read: observable,
                    write: function( value ) {
                        var
                            observablePeek = peek( observable );

                        if( value !== observablePeek ) { // prevent change for same value
                            if( observablePeek ) {
                                observablePeek.destroy();
                            }
                            observable( value );
                        }
                    }
                } );
            }
        },
        destroyActivityPatientInfoViewModel: function() {
            var
                self = this,
                activityPatientInfoViewModelPeek;

            if( self.activityPatientInfoViewModel ) {
                activityPatientInfoViewModelPeek = peek( self.activityPatientInfoViewModel );
                self.activityPatientInfoViewModel.dispose();
                if( activityPatientInfoViewModelPeek ) {
                    self.activityPatientInfoViewModel( null );
                    activityPatientInfoViewModelPeek.destroy();
                }
                self.activityPatientInfoViewModel = null;
            }
        },
        activityDetailsViewModel: null,
        initActivityDetailsViewModel: function() {
            var
                self = this,
                observable;

            if( !self.activityDetailsViewModel ) {
                observable = ko.observable( null );
                self.activityDetailsViewModel = ko.computed( {
                    read: observable,
                    write: function( value ) {
                        var
                            observablePeek = peek( observable );

                        if( value !== observablePeek ) { // prevent change for same value
                            if( observablePeek ) {
                                observablePeek.destroy();
                            }
                            observable( value );
                        }
                    }
                } );
            }
        },
        destroyActivityDetailsViewModel: function() {
            var
                self = this,
                activityDetailsViewModelPeek;

            if( self.activityDetailsViewModel ) {
                activityDetailsViewModelPeek = peek( self.activityDetailsViewModel );
                self.activityDetailsViewModel.dispose();
                if( activityDetailsViewModelPeek ) {
                    self.activityDetailsViewModel( null );
                    activityDetailsViewModelPeek.destroy();
                }
                self.activityDetailsViewModel = null;
            }
        },
        /**
         * @property activitiesTable
         * @type {null|KoTable}
         */
        activitiesTable: null,
        /**
         * @property activitiesTableActivityCopiedListener
         * @type {null|Y.EventHandle}
         */
        activitiesTableActivityCopiedListener: null,
        /**
         * @property activitiesTableActivityTransitionedListener
         * @type {null|Y.EventHandle}
         */
        activitiesTableActivityTransitionedListener: null,
        /** @protected */
        activitiesTableCollapseRowsTooltips: null,
        /** @protected */
        initActivitiesTable: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
            // dynamic list of "Qn YYYY"/CURRENT_Q_VALUE descending from current quarter
                quarterColumnFilterList = (function() {
                    var
                        i,
                        quarterListLength = 8,
                        quarterListResult = [],
                        quarterListMom = moment(),
                        quarterListQn = quarterListMom.get( 'quarter' ),
                        quarterListYYYY = quarterListMom.get( 'year' ),
                        quarterListN;

                    for( i = quarterListLength; i > 0; i-- ) {
                        quarterListN = (i + quarterListQn) % 4 || 4;
                        if( i !== quarterListLength && quarterListN === 4 ) {
                            quarterListYYYY--;
                        }
                        quarterListResult.push( {
                            text: 'Q' + quarterListN + ' ' + quarterListYYYY,
                            value: 'Q' + quarterListN + ' ' + quarterListYYYY
                        } );
                    }

                    quarterListResult.unshift( {
                        text: i18n( 'DCQuery.CURRENT_Q_VALUE.i18n' ),
                        value: Y.doccirrus.DCQuery.CURRENT_Q_VALUE
                    } );

                    return quarterListResult;
                })(),
                actTypeColorMap = {},
                activitySettings = binder.getInitialData( 'activitySettings' ) || [],
                currentActivityObservable = binder.currentActivity,
                activitiesTable,
                activityTableBaseParams,
                collapseRowsActTypes = Y.doccirrus.schemas.activity.types.Activity_E.list.map( function( item ) {
                    return item.val;
                } ),
                dependentCollapseRowsActTypeMap,
                dependentCollapseRows;

            activitySettings.forEach( function( activitySetting ) {
                actTypeColorMap[activitySetting.actType] = activitySetting.color;
            } );

            activityTableBaseParams = ko.computed( function() {
                var
                    patientId = unwrap( currentPatient && currentPatient._id ),

                    activeCaseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                    caseFolderId = activeCaseFolder && activeCaseFolder._id,

                    userFilter = Y.doccirrus.utils.getFilter(),
                    filterQuery = userFilter && userFilter.location && {"locationId": userFilter.location},

                    query = Y.merge( filterQuery );

                if( patientId ) {
                    query.patientId = patientId;
                }

                if( caseFolderId ) {
                    query.caseFolderId = caseFolderId;
                }

                return {
                    query: query
                };
            } );

            self.activitiesTable = activitiesTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'MirrorCaseFileMojit-CasefileNavigationBinderIndex-activitiesTable',
                    states: ['limit', 'usageShortcutsVisible', 'collapseRows'],
                    striped: false,
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.mirroractivity.getCaseFileLight,
                    baseParams: activityTableBaseParams,
                    limit: 10,
                    limitList: [10, 20, 30, 40, 50, 100],
                    columns: [
                        {
                            componentType: 'KoTableColumnRenderer',
                            forPropertyName: 'collapseRowsMinus',
                            width: '32px',
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    data = meta.row;

                                unwrap( dependentCollapseRows && dependentCollapseRows.showRowDependentCollapseRowsObservables[data._id] );

                                return '<span class="fa fa-minus-square-o" style="cursor: pointer;"></span>';
                            },
                            onCellClick: function( meta, event ) {
                                var
                                    data = meta.row;

                                if( event.target.classList.contains( 'fa-minus-square-o' ) ) {
                                    dependentCollapseRows.minusClick( data );
                                }
                            }
                        },
                        {
                            componentType: 'KoTableColumnLinked',
                            forPropertyName: 'linked',
                            label: '',
                            visible: false,
                            isCheckBoxDisabledHook: function( data ) {
                                var
                                    currentActivity = unwrap( currentActivityObservable ),
                                    hasCurrentActivity = Boolean( currentActivity ),
                                    isEditable = hasCurrentActivity && unwrap( currentActivity._isEditable ),
                                    currentActivityActType,
                                    linkableTypes,
                                    linkAny;

                                if( !hasCurrentActivity || false === isEditable ) {
                                    if( !hasCurrentActivity ) {
                                        Y.log( 'no current activity, cannot set linkable types', 'warn', NAME );
                                    }
                                    return true;
                                }

                                currentActivityActType = unwrap( currentActivity.actType );
                                linkableTypes = Y.doccirrus.schemas.activity.linkAllowedFor( currentActivityActType );

                                linkAny = ( ( 1 === linkableTypes.length ) && ( '*' === linkableTypes[0] ) );

                                //  MOJ-7843 do not allow linking of treatments to invoices unless treatment is
                                //  in VALID or APPROVED states
                                if ( 'INVOICE' === currentActivityActType && 'TREATMENT' === data.actType ) {
                                    if ( 'VALID' !== data.status && 'APPROVED' !== data.status ) {
                                        return false;
                                    }
                                }

                                return ( (-1 === linkableTypes.indexOf( data.actType )) || linkAny );
                            },
                            toggleLinkOfRowHook: function( link, data ) {
                                var
                                    columnLinked = this,
                                    isRowLinked = columnLinked.isLinked( link ),
                                    currentActivity = unwrap( currentActivityObservable ),
                                    hasCurrentActivity = Boolean( currentActivity ),
                                    isEditable = hasCurrentActivity && unwrap( currentActivity._isEditable ),
                                    handledActivity;

                                if( !hasCurrentActivity || false === isEditable ) {
                                    return false;
                                }

                                if( (Y.Lang.isFunction( currentActivity._linkActivity ) && Y.Lang.isFunction( currentActivity._unlinkActivity )) ) {

                                    if( isRowLinked ) {
                                        handledActivity = currentActivity._unlinkActivity( link );
                                    } else {
                                        handledActivity = currentActivity._linkActivity( data );
                                    }

                                    if( handledActivity ) {
                                        if( isRowLinked ) {
                                            columnLinked.removeLink( link );
                                        } else {
                                            columnLinked.addLink( link );
                                        }
                                    }

                                    return handledActivity;
                                }

                                if( isRowLinked ) {
                                    columnLinked.removeLink( link );
                                } else {
                                    columnLinked.addLink( link );
                                }

                                return true;
                            }
                        },
                        {
                            componentType: 'KoTableColumnDrag',
                            forPropertyName: 'KoTableColumnDrag',
                            onlyDragByHandle: true,
                            visible: false
                        },
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            visible: false
                        },
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                            width: '100px',
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function( meta ) {
                                var
                                    timestamp = meta.value;

                                if( timestamp ) {
                                    return moment( timestamp ).format( 'DD.MM.YYYY' );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'actType',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                            width: '120px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_ACTTYPE_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
                                optionsText: '-de',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    actType = meta.value;

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, '-de', 'k.A.' );

                            }
                        },
                        {
                            forPropertyName: 'subType',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            width: '100px',
                            queryFilterType: Y.doccirrus.DCQuery.IREGEX_ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'String',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    isSelectMultiple: true,
                                    placeholder: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' )
                                }
                            }
                        },
                        {
                            forPropertyName: 'catalogShort',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' ),
                            width: '100px',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'code',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                            width: '110px',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row;

                                return Y.doccirrus.schemas.activity.displayCode( data );
                            }
                        },
                        {
                            forPropertyName: 'content',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                            width: '70%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    renderContentAsHTML = ActivityModel.renderContentAsHTML( data );

                                if( data.careComment ) {
                                    renderContentAsHTML += ' <a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a><div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' + data.careComment + '</div>';
                                }

                                return renderContentAsHTML;
                            }
                        },
                        {
                            forPropertyName: 'caseFolderId',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                            width: '115px',
                            isSortable: true,
                            renderer: function( meta ) {
                                var
                                    id = meta.value,
                                    caseFolder = null;
                                if( id ) {
                                    caseFolder = currentPatient.caseFolderCollection.getTabById( id );
                                }
                                return caseFolder && caseFolder.title || '';
                            }
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                            width: '115px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.activity.getFilteredStatuses(),
                                optionsText: '-de',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    status = meta.value;

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', status, '-de', '' );
                            }
                        },
                        {
                            forPropertyName: 'editor.name',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                            width: '30%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    editor = data.editor;

                                if( editor && editor.length ) {
                                    return editor[editor.length - 1].name;
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'employeeName',
                            label: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                            title: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                            width: '30%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'locationName',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.locationName' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.locationName' ),
                            width: '30%',
                            visible: false
                        },
                        {
                            forPropertyName: 'price',
                            label: i18n( 'activity-schema.Price_T.price.i18n' ),
                            title: i18n( 'activity-schema.Price_T.price.i18n' ),
                            width: '90px',
                            isSortable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    price = meta.value;

                                if( Y.Lang.isNumber( price ) ) {
                                    return Y.doccirrus.comctl.numberToLocalString( price );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'billingFactorValue',
                            label: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.billingFactorValue.label' ),
                            title: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.billingFactorValue.label' ),
                            width: '70px',
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    billingFactorValue = meta.value,
                                    data = meta.row;

                                if( 'TREATMENT' === data.actType && 'GOÄ' === data.catalogShort ) {
                                    return Y.doccirrus.comctl.factorToLocalString( billingFactorValue );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'quarterColumn',
                            label: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.quarter.label' ),
                            title: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.quarter.label' ),
                            width: '100px',
                            visible: false,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.QUARTER_YEAR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                placeholder: 'Qn YYYY',
                                options: quarterColumnFilterList,
                                optionsText: 'text',
                                optionsValue: 'value',
                                allowValuesNotInOptions: true,
                                // possibility to set own "Qn YYYY"
                                provideOwnQueryResults: function( options, data ) {
                                    var
                                        term = options.term,
                                        results = [];

                                    if( data.every( function( item ) {
                                            return !options.matcher( term, item.text );
                                        } ) ) {
                                        results.push( term );
                                    }

                                    return results;
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    timestamp = data.timestamp,
                                    momTimestamp;

                                if( timestamp ) {
                                    momTimestamp = moment( timestamp );
                                    return 'Q' + momTimestamp.quarter() + ' ' + momTimestamp.get( 'year' );
                                }

                                return '';
                            }
                        }
                    ],
                    responsive: false,
                    tableMinWidth: ko.computed( function() {
                        var
                            initializedColumns = activitiesTable.columns.peek(),
                            visibleColumns = initializedColumns.filter( function( col ) {
                                return ko.unwrap( col.visible );
                            } ),
                            tableMinWidth = 0;

                        // only "tableMinWidth" when those columns are visible
                        if( !Y.Array.find( visibleColumns, function( col ) {
                                if( col.forPropertyName === 'locationName' || col.forPropertyName === 'price' || col.forPropertyName === 'billingFactorValue' || col.forPropertyName === 'quarterColumn' ) {
                                    return true;
                                }
                                return false;
                            } ) ) {
                            activitiesTable.responsive( true );
                            return '';
                        }
                        else {
                            activitiesTable.responsive( false );
                        }

                        visibleColumns.forEach( function( col ) {
                            var
                                width = ko.utils.peekObservable( col.width ) || '';

                            if( width.indexOf( '%' ) > 0 ) {
                                tableMinWidth += 200;
                            }
                            else {
                                tableMinWidth += parseInt( width, 10 );
                            }
                        } );

                        return tableMinWidth + 'px';
                    }, null, {deferEvaluation: true} ).extend( {rateLimit: 0} ),
                    selectMode: 'none',
                    draggableRows: true,
                    isRowDraggable: function( $context ) {
                        return 'VALID' === ko.utils.peekObservable( $context.$data.status );
                    },
                    allowDragOnDrop: function( $contextDrag, $contextDrop ) {
                        var dragIndex = ko.utils.peekObservable( $contextDrag.$index ),
                            dropIndex = ko.utils.peekObservable( $contextDrop.$index ),
                            dropActType = ko.utils.peekObservable( $contextDrop.$data.actType ),
                            result = !(dragIndex < dropIndex && ('SCHEIN' === dropActType || 'PKVSCHEIN' === dropActType || 'BGSCHEIN' === dropActType));
                        return result;
                    },
                    getStyleRow: function getStyleRow( data ) {
                        var
                            result = '';

                        if( data.actType && actTypeColorMap[data.actType] ) {
                            result = 'background-color:' + actTypeColorMap[data.actType];
                        }

                        return result;
                    },
                    getCssRow: function( $context, css ) {
                        var
                            ATTRIBUTES = Y.doccirrus.schemas.activity.ATTRIBUTES,
                            _attributes = $context.$data._attributes || [];

                        Y.each( ATTRIBUTES, function( value, key ) {
                            if( -1 < _attributes.indexOf( value ) ) {
                                css['activity-attribute-' + key] = true;
                            }
                        } );
                    },
                    onRowClick: function( meta ) {
                        if( !meta.isLink ) {
                            binder.navigateToActivity( {activityId: meta.row._id} );
                        }
                        return false;

                    },
                    onRowContextMenu: function( meta, $event ) {
                        var
                            contextMenu;
                        if( !meta.isLink ) {
                            contextMenu = new Y.doccirrus.DCContextMenu( {
                                menu: [
                                    new Y.doccirrus.DCContextMenuItem( {
                                        text: i18n( 'InCaseMojit.casefile_browserJS.menu.openActivityInTab.text' ),
                                        href: '#/activity/' + meta.row._id,
                                        target: '#/activity/' + meta.row._id,
                                        click: function() {
                                            window.open( this.href, this.target );
                                            contextMenu.close();
                                        }
                                    } )
                                ]
                            } );

                            contextMenu.showAt( $event.pageX, $event.pageY );
                            $event.preventDefault();

                            return false;
                        }
                    },
                    collapseRowsActionVisible: true,
                    showRowDependentCollapseRows: function( $context ) {
                        var
                            model = $context.$data,
                            show = dependentCollapseRows.hideRows.indexOf( model ) === -1,
                            showRowDependentCollapseRow;

                        if( !show ) {
                            showRowDependentCollapseRow = dependentCollapseRows.showRowDependentCollapseRowsObservables[model._id];
                            return unwrap( showRowDependentCollapseRow );
                        }

                        return show;
                    },
                    showAdditionalDependentCollapseRows: function( $context ) {
                        var
                            model = $context.$data,
                            show = dependentCollapseRows.showAtRows.indexOf( model ) > -1,
                            showAdditionalDependentCollapseRow;

                        if( show ) {
                            showAdditionalDependentCollapseRow = dependentCollapseRows.showAdditionalDependentCollapseRowsObservables[model._id];
                            return unwrap( showAdditionalDependentCollapseRow );
                        }

                        return show;
                    },
                    getStyleRowAdditionalDependentCollapseRows: function( $context ) {
                        var
                            data = $context.$data,
                            result = '';

                        if( data.actType && actTypeColorMap[data.actType] ) {
                            result = 'background-color:' + actTypeColorMap[data.actType];
                        }

                        return result;
                    },
                    renderAdditionalDependentCollapseRows: function( $context ) {
                        var
                            $data = $context.$data,
                            items = [].concat( dependentCollapseRows.collapses[$data._id] ),
                            markup = [
                                '<span class="fa fa-plus-square-o" style="margin-right: 0.5em; cursor: pointer"></span>',
                                Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', $data.actType, '-de', 'k.A.' ),
                                ': ',
                                items
                                    .sort( function( a, b ) {
                                        var timestampDiff = new Date( b.timestamp ) - new Date( a.timestamp );

                                        if( 0 === timestampDiff ) {
                                            timestampDiff = items.indexOf( a ) < items.indexOf( b ) ? -1 : 1;
                                        }

                                        return timestampDiff;
                                    } )
                                    .map( function( item ) {
                                        var
                                            text = '',
                                            cropped,
                                            linkText = '(' + moment( item.timestamp ).format( 'DD.MM.YYYY' ) + ')',
                                            renderContentAsHTML = ActivityModel.renderContentAsHTML( item ),
                                            renderContentAsHTMLStripped = Y.doccirrus.utils.stripHTML.regExp( renderContentAsHTML ),
                                            linkTitle = renderContentAsHTMLStripped || '';

                                        if( item.code ) {
                                            text = Y.doccirrus.schemas.activity.displayCode( item );
                                        }
                                        else if( renderContentAsHTMLStripped ) {
                                            text = renderContentAsHTMLStripped;
                                        }

                                        cropped = text;
                                        if( cropped.length > 20 ) {
                                            cropped = cropped.substr( 0, 20 ) + ' …';
                                        }

                                        if( cropped ) {
                                            linkText += ' ' + cropped;
                                        }

                                        return Y.Lang.sub( '<a href="javascript:void(0);" title="{title}" data-navigateToActivity="{navigateToActivity}" data-activity-status="{status}">{text}</a>', {
                                            navigateToActivity: item._id,
                                            status: item.status,
                                            title: Y.Escape.html( linkTitle ),
                                            text: Y.Escape.html( linkText )
                                        } );
                                    } )
                                    .filter( function( value ) {
                                        return Boolean( value );
                                    } )
                                    .join( ', ' )
                            ];

                        return markup.join( '' );
                    },
                    onCollapseRowClick: function( model, event ) {
                        if( event.target.classList.contains( 'fa-plus-square-o' ) ) {
                            dependentCollapseRows.plusClick( model );
                        }
                        else if( 'A' === event.target.tagName ) {
                            binder.navigateToActivity( {activityId: event.target.getAttribute( 'data-navigateToActivity' )} );
                        }
                    }
                }
            } );

            /** Handle collapseRows **/
            self.addDisposable( ko.computed( function() {
                var
                    collapseRows = unwrap( activitiesTable.collapseRows ),
                    rows = unwrap( activitiesTable.rows );

                if( collapseRows ) {
                    // namespace
                    dependentCollapseRows = {};
                    // rows that are hidden
                    dependentCollapseRows.hideRows = [];
                    // rows that are shown with alternative content
                    dependentCollapseRows.showAtRows = [];
                    // id map who collapses who
                    dependentCollapseRows.collapses = {};
                    // id map who is collapsed by who
                    dependentCollapseRows.collapsedBy = {};
                    // id map of observables for re-rendering of hidden rows
                    dependentCollapseRows.showRowDependentCollapseRowsObservables = {};
                    // id map of observables for re-rendering of alternative content rows
                    dependentCollapseRows.showAdditionalDependentCollapseRowsObservables = {};
                    // handles plus click of an alternative content row
                    dependentCollapseRows.plusClick = function( model ) {
                        // - need to re-initialize things
                        // - need to change observables for re-rendering
                        var
                            showAdditionalDependentCollapseRowsObservable = dependentCollapseRows.showAdditionalDependentCollapseRowsObservables[model._id],
                            collapses = dependentCollapseRows.collapses[model._id];

                        activitiesTable.destroyDraggableRows();

                        collapses.forEach( function( collapsed ) {
                            var
                                showRowDependentCollapseRowsObservable = dependentCollapseRows.showRowDependentCollapseRowsObservables[collapsed._id];

                            showRowDependentCollapseRowsObservable( true );
                        } );
                        showAdditionalDependentCollapseRowsObservable( false );

                        setTimeout( function() {
                            activitiesTable.initDraggableRows();
                        }, 10 );
                    };
                    // handles minus click of a row that was hidden
                    dependentCollapseRows.minusClick = function( model ) {
                        // - need to change observables for re-rendering
                        var
                            collapsedByModel = dependentCollapseRows.collapsedBy[model._id];

                        dependentCollapseRows.collapses[collapsedByModel._id].forEach( function( model ) {
                            dependentCollapseRows.showRowDependentCollapseRowsObservables[model._id]( false );
                        } );
                        dependentCollapseRows.showAdditionalDependentCollapseRowsObservables[collapsedByModel._id]( true );
                    };

                    // build namespace
                    dependentCollapseRowsActTypeMap = rows.reduce( function( result, currentItem ) {

                        if( -1 === collapseRowsActTypes.indexOf( currentItem.actType ) ) {
                            return result;
                        }

                        dependentCollapseRows.hideRows.push( currentItem );

                        if( !Y.Object.owns( result, currentItem.actType ) ) {
                            result[currentItem.actType] = [];
                        }
                        result[currentItem.actType].push( currentItem );

                        return result;
                    }, {} );
                    Y.each( dependentCollapseRowsActTypeMap, function( items ) {
                        var
                            lastItem = items[items.length - 1];

                        dependentCollapseRows.showAtRows.push( lastItem );
                        dependentCollapseRows.collapses[lastItem._id] = [].concat( items );

                        items.forEach( function( model ) {
                            dependentCollapseRows.showRowDependentCollapseRowsObservables[model._id] = ko.observable( false );
                            dependentCollapseRows.collapsedBy[model._id] = lastItem;
                        } );
                        dependentCollapseRows.showAdditionalDependentCollapseRowsObservables[lastItem._id] = ko.observable( true );
                    } );

                }
                else {
                    dependentCollapseRows = null;
                }

            } ) ); // don't rateLimit - otherwise building dependencies will be made after needed
            self.addDisposable( ko.computed( function() {
                // - needs to hide/show collapse minus column
                var
                    collapseRows = unwrap( activitiesTable.collapseRows ),
                    collapseRowsMinus = activitiesTable.getColumnByPropertyName( 'collapseRowsMinus' );

                if( collapseRowsMinus ) {
                    collapseRowsMinus.visible( collapseRows );
                }
            } ) );

            /**
             * Handle showing of "currentActivity" dependent columns
             */
            self.addDisposable( ko.computed( function() {
                var
                    hasCurrentActivity = unwrap( currentActivityObservable );

                ignoreDependencies( function() {

                    if( hasCurrentActivity ) {
                        activitiesTable.getComponentColumnCheckbox().visible( false );
                        activitiesTable.getComponentColumnDrag().visible( false );
                        activitiesTable.getComponentColumnLinked().visible( true );
                    }
                    else {
                        activitiesTable.getComponentColumnCheckbox().visible( true );
                        activitiesTable.getComponentColumnDrag().visible( true );
                        activitiesTable.getComponentColumnLinked().visible( false );
                    }
                } );
            } ) );

            /**
             * Handle drag and drop
             */
            activitiesTable.events.on( 'KoTable:draggedRows', function( yEvent, data ) {
                Y.doccirrus.jsonrpc.api.activity.moveActivity( {
                        query: {
                            targetId: data.dragData._id,
                            targetPosition: data.dropData.timestamp,
                            direction: (data.dragIndex < data.dropIndex) ? -1 : 1
                        }
                    } )
                    .fail( function( err ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: Y.doccirrus.errorTable.getMessage( err ),
                            window: {width: Y.doccirrus.DCWindow.SIZE_MEDIUM}
                        } );
                    } )
                    .always( function() {
                        activitiesTable.reload();
                    } );
            } );

            /**
             * Handle "currentActivity" linking
             */
            self.addDisposable( ko.computed( function() {
                var
                    currentActivity = unwrap( currentActivityObservable ),
                    hasCurrentActivity = Boolean( currentActivity ),
                    currentActivityActivities,
                    currentActivityIcds;

                if( !hasCurrentActivity ) {
                    return;
                }

                currentActivityActivities = unwrap( currentActivity.activities );
                currentActivityIcds = unwrap( currentActivity.icds );
                ignoreDependencies( function() {
                    var
                        componentColumnLinked = activitiesTable.getComponentColumnLinked(),
                        linkIds = [];

                    linkIds = linkIds.concat( currentActivityActivities ).concat( currentActivityIcds );
                    componentColumnLinked.removeLinks();
                    componentColumnLinked.addLinks( linkIds );
                } );
            } ) );

            self.activitiesTableActivityTransitionedListener = Y.on( 'activityTransitioned', function() {
                activitiesTable.reload();
            } );
            self.activitiesTableActivityPDFChangeListener = Y.on( 'activityPDFChange', function() {
                activitiesTable.reload();
            } );
            self.activitiesTableActivityCopiedListener = Y.on( 'activityCopied', function() {
                activitiesTable.reload();
            } );

            /** Handle bootstrap tooltips on "navigateToActivity"-links **/
            self.activitiesTableCollapseRowsTooltips = {
                mouseenter: Y.one( "body" ).delegate( "mouseenter", function( event ) {
                    jQuery( 'a[data-navigateToActivity]', event.target.getDOMNode() ).tooltip( {
                        delay: 0,
                        placement: 'top'
                    } );
                }, ".KoTable-row-collapse" ),
                mouseleave: Y.one( "body" ).delegate( "mouseleave", function( event ) {
                    jQuery( 'a[data-navigateToActivity]', event.target.getDOMNode() ).each( function() {
                        var
                            $tooltip = jQuery( this ).data( 'bs.tooltip' );

                        if( $tooltip ) {
                            $tooltip.destroy();
                        }
                    } );
                }, ".KoTable-row-collapse" )
            };

        },
        destroyActivitiesTable: function() {
            var

                self = this;
            if( self.activitiesTableActivityTransitionedListener ) {
                self.activitiesTableActivityTransitionedListener.detach();
                self.activitiesTableActivityTransitionedListener = null;
            }
            if( self.activitiesTableActivityPDFChangeListener ) {
                self.activitiesTableActivityPDFChangeListener.detach();
                self.activitiesTableActivityPDFChangeListener = null;
            }
            if( self.activitiesTableActivityCopiedListener ) {
                self.activitiesTableActivityCopiedListener.detach();
                self.activitiesTableActivityCopiedListener = null;
            }
            /** Remove bootstrap tooltips on "navigateToActivity"-links **/
            if( self.activitiesTableCollapseRowsTooltips ) {
                self.activitiesTableCollapseRowsTooltips.mouseenter.detach();
                self.activitiesTableCollapseRowsTooltips.mouseleave.detach();
                self.activitiesTableCollapseRowsTooltips = null;
            }
        },
        initSocketListeners: function() {
            var
                self = this,
                currentPatient = unwrap( self.get( 'currentPatient' ) );

            Y.doccirrus.communication.on( {
                event: 'system.UPDATE_ACTIVITIES_TABLES',
                handlerId: 'CaseFileViewModel',
                done: function success( response ) {
                    var
                        data = response && response.data,
                        activitiesTable = self.activitiesTable,
                        caseFolderId = data && data[0],
                        activeCaseFolder = currentPatient.caseFolderCollection.getActiveTab();
                    if( activitiesTable && activeCaseFolder && caseFolderId === activeCaseFolder._id ) {
                        activitiesTable.reload();
                    }
                }
            } );
            Y.doccirrus.communication.on( {
                event: 'system.BL_EXCEEDED',
                handlerId: 'CaseFileViewModel',
                done: function success( response ) {
                    var caseFolderId = response.data[0] && response.data[0].caseFolderId,
                        caseFolders = currentPatient.caseFolderCollection,
                        caseFolder,
                        text;
                    if( caseFolders && caseFolderId ) {
                        caseFolder = caseFolders.getTabById( caseFolderId );
                    }
                    text = Y.Lang.sub( BL_EXCEEDED, {caseFolderName: (caseFolder && caseFolder.title) || ''} );

                    Y.doccirrus.DCSystemMessages.removeMessage( 'BLExceeded' );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'BLExceeded',
                        content: text,
                        level: 'WARNING'
                    } );
                }
            } );
        },
        destroySocketListeners: function() {
            Y.doccirrus.communication.off( 'system.UPDATE_ACTIVITIES_TABLES', 'CaseFileViewModel' );
            Y.doccirrus.communication.off( 'system.BL_EXCEEDED', 'CaseFileViewModel' );
        },
        activityCaseFileButtonsViewModel: null,
        initActivityCaseFileButtonsViewModel: function() {
            var
                self = this,
                observable;

            if( !self.activityCaseFileButtonsViewModel ) {
                observable = ko.observable( null );
                self.activityCaseFileButtonsViewModel = ko.computed( {
                    read: observable,
                    write: function( value ) {
                        var
                            observablePeek = peek( observable );

                        if( value !== observablePeek ) { // prevent change for same value
                            if( observablePeek ) {
                                observablePeek.destroy();
                            }
                            observable( value );
                        }
                    }
                } );
            }
        },
        destroyActivityCaseFileButtonsViewModel: function() {
            var
                self = this,
                activityCaseFileButtonsViewModelPeek;

            if( self.activityCaseFileButtonsViewModel ) {
                activityCaseFileButtonsViewModelPeek = peek( self.activityCaseFileButtonsViewModel );
                self.activityCaseFileButtonsViewModel.dispose();
                if( activityCaseFileButtonsViewModelPeek ) {
                    self.activityCaseFileButtonsViewModel( null );
                    activityCaseFileButtonsViewModelPeek.destroy();
                }
                self.activityCaseFileButtonsViewModel = null;
            }
        },
        activityCaseFoldersViewModel: null,
        initActivityCaseFoldersViewModel: function() {
            var
                self = this;

            if( !self.activityCaseFoldersViewModel ) {
                self.activityCaseFoldersViewModel = new ActivityCaseFoldersViewModel();
            }
        },
        destroyActivityCaseFoldersViewModel: function() {
            var
                self = this;

            if( self.activityCaseFoldersViewModel ) {
                self.activityCaseFoldersViewModel.destroy();
                self.activityCaseFoldersViewModel = null;
            }
        },
        activityCreateButtonsViewModel: null,
        initActivityCreateButtonsViewModel: function() {
            var
                self = this;
            if( !self.activityCreateButtonsViewModel ) {
                self.activityCreateButtonsViewModel = ko.observable( new ActivityCreateButtonsViewModel() );
            }
        },
        destroyActivityCreateButtonsViewModel: function() {
            var
                self = this;

            if( self.activityCreateButtonsViewModel ) {
                peek( self.activityCreateButtonsViewModel ).destroy();
                self.activityCreateButtonsViewModel = null;
            }
        },
        activitySequenceViewModel: null,
        initActivitySequenceViewModel: function() {
            var
                self = this;
            if( !self.activitySequenceViewModel ) {
                self.activitySequenceViewModel = ko.observable( new ActivitySequenceViewModel() );
            }
        },
        destroyActivitySequenceViewModel: function() {
            var
                self = this;

            if( self.activitySequenceViewModel ) {
                peek( self.activitySequenceViewModel ).destroy();
                self.activitySequenceViewModel = null;
            }
        },
        columnClassName: null,
        initColumnClassName: function() {
            var
                self = this;

            self.columnClassName = ko.computed( function() {
                var
                    isLeftPinned = false,
                    isRightPinned = false,
                    activityCreateButtonsViewModel = unwrap( self.activityCreateButtonsViewModel ),
                    activitySequenceViewModel = unwrap( self.activitySequenceViewModel );

                if( activityCreateButtonsViewModel ) {
                    isLeftPinned = unwrap( activityCreateButtonsViewModel.isPinned );
                }

                if( activitySequenceViewModel ) {
                    isRightPinned = unwrap( activitySequenceViewModel.isPinned );
                }

                if( !isLeftPinned && !isRightPinned ) {
                    return 'col-md-12';
                }
                else if( (isLeftPinned && !isRightPinned) || (!isLeftPinned && isRightPinned) ) {
                    return 'col-md-10';
                }
                else if( isLeftPinned && isRightPinned ) {
                    return 'col-md-8';
                }
            } );
        }
    }, {
        NAME: 'MirrorCaseFileViewModel',
        ATTRS: {
            currentPatient: {
                valueFn: function() {
                    return this.get( 'binder' ).currentPatient;
                },
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( MirrorCaseFileViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'KoSchemaValue',
        'MirrorPatientMojitViewModel',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoUI-all',
        'dcquery',
        'dcutils',
        'dc-comctl',
        'dchotkeyshandler',
        'dcschemaloader',
        'DCContextMenu',
        'activity-schema',
        'ActivityModel',
        'Collection',

        'MirrorActivityPatientInfoViewModel',
        'MirrorActivityDetailsViewModel',
        'MirrorActivityCaseFileButtonsViewModel',
        'ActivityCaseFoldersViewModel',
        'ActivityCreateButtonsViewModel',
        'ActivitySequenceViewModel'
    ]
} );
