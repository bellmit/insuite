/*jslint anon:true, sloppy:true, nomen:true*/

/*global fun:true, ko, $, YUI, ko, moment, _ */
/*exported fun */

'use strict';

fun = function _fn( Y ) {

    var
        i18n = Y.doccirrus.i18n,
        viewModel = null,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager,
        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),
        CHANGES_NOT_SAVED = i18n( 'general.message.CHANGES_NOT_SAVED' ),
        TAKE_BUTTON = i18n( 'TaskMojit.TaskModal.button.TAKE' ),
        ASSIGN_ROW = i18n( 'InpacsLogMojit.tabInpacsLogOverview.assignRow' ),
        REVERT_ROW = i18n( 'InpacsLogMojit.tabInpacsLogOverview.revertRow' ),
        CONFIRM_DELETION_OF_ACTIVITIES_OF_ASSIGNED_PATIENT = i18n('PatientTransferMojit.message.confirm_deletion_of_activities_of_assigned_patient'),
        ASSIGN_PATIENT = i18n('PatientTransferMojit.label.assign_patient'),
        REVERT_PATIENT = i18n('PatientTransferMojit.label.revert_patient'),

        actTypeColorMap = {};

    function TransfersReceivedViewModel() {
        TransfersReceivedViewModel.superclass.constructor.call( this, arguments );
    }

    Y.extend( TransfersReceivedViewModel, Disposable, {

            overviewTable: null,
            kimMessagePollingLasttime: ko.observable(''),
            hasKim: Y.doccirrus.auth.hasTelematikServices('KIM'),


        /**
         * Initialized the tableview, refresh button and need information.
         * @param {String} config: The InSuite user.
         */
        initializer: function TransfersReceivedViewModel_initializer( config ) {
            var
                self = this;

            self.incaseconfiguration = config[0].incaseconfiguration;

            self.successfulEmailRefresh = i18n('PatientTransferMojit.KimEmailService.refreshSuccessful');

            self.initOverviewTable();
            self.initActivitySettings();
            self.initRefreshButton();
            self.kimMessagePollingLasttime();
            var
                date = moment(self.incaseconfiguration.kimMessagePollingLasttime);

            self.kimMessagePollingLasttime(i18n( 'PatientTransferMojit.KimEmailService.lastTimePulled', {
                data: {
                    timeSince: date.fromNow()
                }
            } ));
            if( config.logEntryId ) {
                self.showEntryDetailsTable( config.logEntryId );
            }

        },

        showEntryDetailsTable: function TransfersReceivedViewModel_showDetailsTable( logEntryId ) {
            var
                self = this;

            Y.doccirrus.jsonrpc.api.patienttransfer.read( {
                query: {
                    _id: logEntryId
                }
            } ).done( function( result ) {
                self.openActivityDetailsTable( result.data[0] );
            } );
        },

        initActivitySettings: function TransfersReceivedViewModel_initActivitySettings() {
            Y.doccirrus.jsonrpc.api.activitysettings
                .read( { query: { _id: Y.doccirrus.schemas.activitysettings.getId() } } )
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data[0] && Y.Lang.isArray( response.data[0].settings ) && response.data[0].settings || [];
                } )
                .then( function( activitySettings ) {
                    activitySettings.forEach( function( activitySetting ) {
                        actTypeColorMap[activitySetting.actType] = activitySetting.color;
                    } );
                } );
        },
        /**
         * Initializes the refresh button for fetching unseen emails and gives user feedback if it was successful or not.
         */
        initRefreshButton: function TransfersReceivedViewModel_initRefreshButton() {
            var
                self = this;

            self.refreshButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    lazyAdd: true,
                    name: 'refresh',
                    option: 'PRIMARY',
                    icon: 'REFRESH',
                    disabled: !Y.doccirrus.auth.hasTelematikServices('KIM'),
                    click: function() {
                        Promise.resolve( Y.doccirrus.jsonrpc.api.kimaccount.receiveEmails( {
                            onlyAuthorisedUsers: false
                        } ).done( function() {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'success',
                                    message: self.successfulEmailRefresh
                                } );
                            self.kimMessagePollingLasttime(i18n( 'PatientTransferMojit.KimEmailService.lastTimePulled', {
                                data: {
                                    timeSince:  moment().fromNow()
                                }
                            } ));

                            self.overviewTable.reload();
                            } ).fail( function( error ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            } ) );
                    }
                }
            } );
        },
        showAssignButton: function(row){
            return row.emailType === 'KIM' && !row.patientId && row.subject === 'Arztbrief' && Y.doccirrus.auth.hasTelematikServices('eDocletter');
        },
        showRevertButton: function( row ) {
            return row.emailType === 'KIM' && row.patientId && row.subject === 'Arztbrief' && Y.doccirrus.auth.hasTelematikServices( 'eDocletter' );
        },
        initOverviewTable: function TransfersReceivedViewModel_initOverviewTable() {
            var
                self = this,
                statusFilterList = (Y.doccirrus.schemas.patienttransfer.types.Status_E.list || []).filter( function(el){
                    return el.val !== Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENT;
                });

            function highlightDependOnStatus( row ) {
                return !row.patientId ? 'text-danger' : 'text-success';
            }

            self.overviewTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'PatientTransferMojit.title.pdf' ),
                    stateId: 'LabLogMojit-tab_overview-overviewTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.patientTransfer.getEmailsOnlyForAuthorisedUsers,
                    baseParams: {},
                    selectMode: 'none',
                    columns: [
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.timestamp.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.timestamp.i18n' ),
                            width: '140px',
                            isSortable: true,
                            isFilterable: true,
                            sortInitialIndex: 0,
                            direction: 'DESC',
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function TransfersReceivedViewModel_overviewTable_renderer_timestamp( meta ) {
                                var
                                    value = meta.value;

                                if( value ) {
                                    return moment( value ).format( i18n( 'general.TIMESTAMP_FORMAT_LONG' ) );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.status.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.status.i18n' ),
                            width: '100px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: statusFilterList,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function TransfersReceivedViewModel_overviewTable_renderer_status( meta ) {

                                var
                                    displayText = Y.doccirrus.schemaloader.translateEnumValue( 'i18n', meta.value, Y.doccirrus.schemas.patienttransfer.types.Status_E.list, '' ),
                                    displayTextClass = highlightDependOnStatus( meta.row );

                                displayText = Y.Lang.sub( '<span class="{displayTextClass}">{displayText}</span>', {
                                    displayText: displayText,
                                    displayTextClass: displayTextClass
                                } );

                                return displayText;
                            }
                        },
                        {
                            forPropertyName: 'emailType',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.emailType.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.emailType.i18n' ),
                            width: '100px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false
                        },
                        {
                            forPropertyName: 'doctorName',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.doctorName.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.doctorName.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var doctorName = meta.row.doctorName;
                                return doctorName === 'Automatischer Prozess' ? i18n('patienttransfer-schema.default_doctor_name') : doctorName;
                            }
                        },
                        {
                            forPropertyName: 'practiceName',
                            width: '160px',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.device.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.device.i18n' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'practiceCity',
                            width: '160px',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.city.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.city.i18n' ),
                            visible: false,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'kimReceiverEmail',
                            width: '160px',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.kimReceiverEmail.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.kimReceiverEmail.i18n' ),
                            visible: true,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'mirrorPatientName',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.mirrorPatientName.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.mirrorPatientName.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            visible: true,
                            renderer: function( meta ) {
                                var
                                    displayText = meta.value,
                                    displayTextClass = highlightDependOnStatus( meta.row );

                                if( meta.row.mirrorPatientName ) {
                                    displayText = Y.Lang.sub( '<span class="{displayTextClass}">{displayText}</span>', {
                                        displayText: displayText,
                                        displayTextClass: displayTextClass
                                    } );
                                } else {
                                    displayText = '';
                                }

                                return displayText;
                            },
                            onCellClick: function() {
                                return false;
                            }
                        },
                        {
                            forPropertyName: 'patientName',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.patientName.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.patientName.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    displayText = meta.value || i18n( 'patienttransfer-schema.PatientTransfer_T.localPatient.i18n' );

                                if( meta.row.patientId ) {
                                    displayText = Y.Lang.sub( '<a target="_blank" href="{patientId}/tab/casefile_browser">{displayText}</a>', {
                                        displayText: displayText,
                                        patientId: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + meta.row.patientId
                                    } );
                                } else {
                                    displayText = '';
                                }
                                return displayText;
                            },
                            onCellClick: function() {
                                return false;
                            }
                        },
                        {
                            forPropertyName: 'patientPseudonym',
                            width: '160px',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.patientPseudonym.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.patientPseudonym.i18n' ),
                            visible: false,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'mirrorActivitiesIds',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.mirrorActivitiesIds.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.mirrorActivitiesIds.i18n' ),
                            width: '95px',
                            isSortable: true,
                            renderer: function( meta ) {
                                if( meta.row.mirrorPatientId ){
                                    return meta.value.length;
                                } else {
                                    return meta.row.attachedMedia && meta.row.attachedMedia.length || 0;
                                }
                            }
                        },
                        {
                            forPropertyName: 'mirrorActivitiesActTypes',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.mirrorActivitiesActTypes.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.mirrorActivitiesActTypes.i18n' ),
                            renderer: function( meta ) {
                                var value;
                                if( meta.row.emailType === 'KIM' ) {
                                    value = meta.row.attachedMedia || [];
                                    return value.map( function( item ) {
                                        item._id = item.mediaId;
                                        return '<a target="_blank" href="' + Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getMediaUrl( item, 'original' ) ) + '">' + item.caption + '</a>';
                                    } ).join( ', ' );
                                } else {
                                    const
                                        output = [];

                                    if( Y.Lang.isArray( meta.row.mirrorActivitiesActTypes ) ) {
                                        const
                                            types = meta.row.mirrorActivitiesActTypes
                                                .filter( function( type, index ) {
                                                    return meta.row.mirrorActivitiesActTypes.indexOf( type ) === index;
                                                } )
                                                .map( function( type ) {
                                                    return {
                                                        type: type,
                                                        count: meta.row.mirrorActivitiesActTypes.filter( function ( actType ) {
                                                            return actType === type;
                                                        } ).length
                                                    };
                                                } ),
                                            scheinType = types.find( function( type ) {
                                                return type.type === 'AMTSSCHEIN';
                                            });

                                        if( scheinType ) {
                                            output.push( '<b>' + i18n( 'activity-schema.Activity_E.' + scheinType.type ) + ' (' + scheinType.count + ')</b>' );
                                        }

                                        types.forEach( function( type ) {
                                            if( type.type !== 'AMTSSCHEIN' ) {
                                                output.push( i18n( 'activity-schema.Activity_E.' + type.type ) + ' (' + type.count + ')' );
                                            }
                                        } );
                                    }

                                    return output.join( '<br>' );
                                }
                            }
                        },
                        {
                            forPropertyName: 'user.name',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.user.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.user.i18n' ),
                            isFilterable: true,
                            isSortable: true,
                            width: '150px',
                            renderer: function( meta ) {
                                var data = meta.row,
                                    user = data.user;

                                if( user && user.length ) {
                                    return user[user.length - 1].name;
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'mirrorPatientId',
                            label: ASSIGN_PATIENT,
                            title: ASSIGN_PATIENT,
                            width: '92px',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( meta ) {
                                if( meta.row.status !== 'IMPORTED' && meta.value ) {
                                    return Y.Lang.sub('<button class="btn btn-xs btn-primary">{action}</button>', {
                                        action: ( meta.row.patientId )? TAKE_BUTTON : ASSIGN_ROW
                                    });
                                } else if( self.showAssignButton(meta.row)) {
                                    return Y.Lang.sub('<button class="btn btn-xs btn-primary">{action}</button>', {
                                        action: ASSIGN_ROW
                                    });
                                }
                            },
                            pdfRenderer: function( meta ) {
                                if( meta.row.status !== 'IMPORTED' && meta.value ) {
                                    if( meta.row.patientId ) {
                                        return TAKE_BUTTON;
                                    } else {
                                        return ASSIGN_ROW;
                                    }
                                }
                                return '';
                            },
                            onCellClick: function( meta ) {
                                var logEntry = meta.row;
                                if( meta.row.status !== 'IMPORTED' && meta.value || self.showAssignButton(logEntry)) {
                                    self.showMatchPatientDialog( logEntry.mirrorPatientId, logEntry.mirrorActivitiesIds, logEntry );
                                    return false;
                                }
                            }
                        },
                        {
                            forPropertyName: 'revert_assignment',
                            label: REVERT_PATIENT,
                            title: REVERT_PATIENT,
                            width: '92px',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( meta ) {
                                if( self.showRevertButton( meta.row ) ) {
                                    return Y.Lang.sub( '<button class="btn btn-xs btn-primary">{action}</button>', {
                                        action: REVERT_ROW
                                    } );
                                }
                            },
                            pdfRenderer: function() {
                                return '';
                            },
                            onCellClick: function( meta ) {
                                var logEntry = meta.row;
                                if( self.showRevertButton( logEntry ) ) {
                                    self.revertPatientAssignment( logEntry );
                                    return false;
                                }
                            }
                        }
                    ],
                    onRowClick: function TransfersReceivedViewModel_overviewTable_onRowClick( meta ) {
                        if( meta.row.emailType !== 'KIM' && meta.row.status !== 'IMPORTED' && meta.row.patientId ) {
                            self.openActivityDetailsTable( meta.row );
                        } else if( !meta.row.mirrorPatientId ) {
                            Y.doccirrus.modals.previewTransferModal.show( meta.row, function(){
                                self.overviewTable.reload();
                            } );
                        }
                    },
                    responsive: false,
                    tableMinWidth: ko.computed( function() {
                        var
                            initializedColumns = self.overviewTable.columns.peek(),
                            visibleColumns = initializedColumns.filter( function( col ) {
                                return ko.unwrap( col.visible );
                            } ),
                            tableMinWidth = 0;

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
                    }, null, { deferEvaluation: true } ).extend( { rateLimit: 0 } )
                }
            } );
        },

        openActivityDetailsTable: function( data ) {

            var node = Y.Node.create( '<div></div>' ),
                self = this,
                footerButtons = [Y.doccirrus.DCWindow.getButton( 'CANCEL' )],
                activityTableBaseParams = {
                    query: {
                        _id: { $in: data.mirrorActivitiesIds },
                        patientId: data.mirrorPatientId
                    }
                };

            self.requestDetailsWindow = new Y.doccirrus.DCWindow( {
                bodyContent: node,
                focusOn: [],
                title: i18n( 'PatientTransferMojit.dialog.transfer_details.title' ) + ' "{{patName}}"'.replace( '{{patName}}', data.mirrorPatientName ),
                icon: Y.doccirrus.DCWindow.ICON_WARN,
                width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                centered: true,
                maximizable: true,
                modal: true,
                tabindex: 10,
                render: document.body,
                buttons: {
                    header: ['close', 'maximize'],
                    footer: footerButtons
                }
            } );

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'transferActivityDetails',
                'PatientTransferMojit',
                {},
                node,
                function templateLoaded() {
                    ko.applyBindings( {
                        activitiesTable: self.initActivitiesTable( activityTableBaseParams )
                    }, node.getDOMNode() );
                }
            );
        },

        initActivitiesTable: function( activityTableBaseParams ) {
            var activitiesTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'CaseFileMojit-CasefileNavigationBinderIndex-activitiesTable-transferReceived',
                    states: ['limit', 'usageShortcutsVisible'],
                    striped: false,
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.mirroractivity.getCaseFile,
                    baseParams: activityTableBaseParams,
                    limit: 10,
                    limitList: [10, 20, 30, 40, 50, 100],
                    columns: [
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
                                // options: quarterColumnFilterList,
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
                    }, null, { deferEvaluation: true } ).extend( { rateLimit: 0 } ),
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
                    }
                }
            } );

            return activitiesTable;
        },

        showMatchPatientDialog: function( mirrorPatientId, mirrorActivitiesIds, logEntry ) {

            var
                self = this,
                patient,
                matchResult;

            function updateEntryStatus( status, patientId ) { //eslint-disable-line no-unused-vars
                var
                    data = { status: status, patientId: patientId },
                    _id = logEntry._id;
                data.fields_ = ['status', 'patientId'];

                $.ajax( {
                    xhrFields: { withCredentials: true },
                    type: 'PUT',
                    url: Y.doccirrus.infras.getPrivateURL( '/1/patienttransfer/' + _id ),
                    contentType: 'application/json',
                    data: JSON.stringify( data )
                } )
                    .done( function() {
                        self.overviewTable.reload();
                    } )
                    .fail( function() {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: CHANGES_NOT_SAVED
                        } );
                    } );
            }

            function createOrUpdatePatient( mirrorPatient, mirrorActivitiesIds, patientId, selectedData, caseFolderId ) {

                var params = {
                    mirrorPatient: mirrorPatient,
                    mirrorActivitiesIds: mirrorActivitiesIds,
                    practiceName: logEntry.practiceName,
                    doctorName: logEntry.doctorName,
                    preservedCaseFolders: logEntry.preservedCaseFolders,
                    unlock: logEntry.unlock,
                    selectedData: selectedData,
                    requestId: logEntry.requestId,
                    caseFolderId: caseFolderId
                };

                if( patientId ) {
                    params.query = { _id: patientId };
                }

                Y.doccirrus.jsonrpc.api.activityTransfer.createOrUpdatePatient( params ).done( function() {
                    self.overviewTable.reload();
                } ).fail( function() {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: CHANGES_NOT_SAVED
                    } );
                } );
            }

            function processTransfer( mirrorPatientId ){
                Y.doccirrus.jsonrpc.api.mirrorpatient.read( {
                    query: { _id: mirrorPatientId }
                } ).then( function( response ) {
                    patient = response.data[0];

                    if(logEntry.requestId){
                        if( logEntry.patientId ){
                            Y.doccirrus.modals.selectCaseFolder.show( logEntry.patientId, undefined, function( caseFolder ) {
                                createOrUpdatePatient( patient, mirrorActivitiesIds, logEntry.patientId, {}, caseFolder && caseFolder.data );
                            } );
                        } else {
                            selectPatient( patient, [], logEntry.requestId );
                        }
                        return;
                    }

                    Y.doccirrus.jsonrpc.api.patientmatch.matchPatient(
                        { data: patient }
                    ).then( function( response ) {

                        matchResult = response.data;

                        if( matchResult.length === 1 ) {
                            if( matchResult[0].mirrorPatientId && patient._id && matchResult[0].mirrorPatientId !== patient._id &&
                                (matchResult[0].additionalMirrorPatientIds || []).includes(patient._id) ){ //additionally linked partner, no need to compare
                                createOrUpdatePatient( patient, mirrorActivitiesIds, matchResult[0]._id, {} );
                            } else {
                                var data = Y.doccirrus.commonutils.comparePatients(matchResult[0], patient); //eslint-disable-line
                                if( data.rows && data.rows.length && ( data.baseData || data.insuranceData || data.egkData || data.accountData || data.additionalData || data.careData ) ) {
                                    Y.doccirrus.modals.patientUpdateModal.show({
                                        data: data,
                                        callback: function(err, selectedData){ //eslint-disable-line
                                            createOrUpdatePatient( patient, mirrorActivitiesIds, matchResult[0]._id, selectedData );
                                        }
                                    } );
                                } else {
                                    createOrUpdatePatient( patient, mirrorActivitiesIds, matchResult[0]._id, {} ); //nothing changed
                                }
                            }
                        } else if( matchResult.length > 1 ) {
                            selectPatient( patient, matchResult );
                        } else {
                            noticeNotFound( patient, mirrorActivitiesIds );

                        }
                    } );
                } );
            }

            function processKIM( logEntry ){
                Y.doccirrus.modals.crSelectPatient.show( {
                    kim: true,
                    parsedKIMPatient: logEntry.parsedKIMPatient,
                    patients: [],
                    callback: function( optionsSelected ) {
                        switch( optionsSelected.action ) {
                            // user has the option to create from patientFromCard
                            case 'create':
                                break;
                            // user selected a patient
                            case 'select': {
                                Y.doccirrus.jsonrpc.api.activity.createKIMActivity( {
                                    data: {
                                        action: 'select',
                                        logEntry: logEntry,
                                        caseFolderId: optionsSelected.caseFolder._id,
                                        patient: optionsSelected.patient,
                                        update: optionsSelected.update
                                    }
                                } ).done( function() {
                                    self.overviewTable.reload();
                                } ).fail( function( error ) {
                                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                } );

                                break;
                            }





                        }
                    }
                } );
            }

            function selectPatient( mirrorPatient, patientsMatching, requestId ) {
                Y.doccirrus.modals.crSelectPatient.show( {
                    patients: patientsMatching,
                    patientFromCard: mirrorPatient,
                    requestId: requestId,
                    callback: function( optionsSelected ) {
                        switch( optionsSelected.action ) {
                            // user has the option to create from patientFromCard
                            case 'create':
                                createOrUpdatePatient( mirrorPatient, mirrorActivitiesIds );
                                break;
                            // user selected a patient
                            case 'select':
                                if( requestId ){
                                    Y.doccirrus.modals.selectCaseFolder.show( optionsSelected.patient._id, undefined, function( caseFolderId ) {
                                        createOrUpdatePatient( mirrorPatient, mirrorActivitiesIds, optionsSelected.patient._id, {} , caseFolderId && caseFolderId.data );
                                    } );
                                } else {
                                    createOrUpdatePatient( mirrorPatient, mirrorActivitiesIds, optionsSelected.patient._id );
                                }
                                break;
                        }
                    }
                } );
            }

            function noticeNotFound( mirrorPatient, mirrorActivitiesIds ) {

                var msg = i18n( 'PatientTransferMojit.message.patient_not_found' );

                msg += ' <i>' + mirrorPatient.lastname + ', ' + mirrorPatient.firstname + ( mirrorPatient.kbvDob !== '00.00.0000' ? ', ' + moment( mirrorPatient.dob ).format( 'DD.MM.YYYY' ) : '' ) +
                       ( mirrorPatient.pseudonym ? ' (' + mirrorPatient.pseudonym  + ')' : '' ) + '</i>';

                return Y.doccirrus.DCWindow.notice( {
                    message: msg,
                    window: {
                        width: 'medium',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', { isDefault: false } ),
                                {
                                    label: i18n( 'general.button.SEARCH' ),
                                    action: function( e ) {
                                        e.target.button.disable();
                                        this.close( e );
                                        selectPatient( patient, matchResult );
                                    }
                                },
                                {
                                    isDefault: true,
                                    label: i18n( 'general.button.CREATE' ),
                                    action: function( e ) {
                                        e.target.button.disable();
                                        this.close( e );
                                        createOrUpdatePatient( mirrorPatient, mirrorActivitiesIds );
                                    }
                                }
                            ]
                        }
                    }
                } );
            }

            if( mirrorPatientId ){
                processTransfer( mirrorPatientId );
            } else if( logEntry.emailType === 'KIM' ){
                processKIM( logEntry );
            }
        },

        revertPatientAssignment: function( log ) {
            var self = this;
            Y.doccirrus.DCWindow.confirm( {
                message: CONFIRM_DELETION_OF_ACTIVITIES_OF_ASSIGNED_PATIENT,
                callback: function( dialog ) {
                    if( dialog.success ) {
                        Promise.resolve( Y.doccirrus.jsonrpc.api.activity.revertKIMActivity( {
                            data: {
                                patientTransferId: log._id
                            }
                        } ) ).catch( function( error ) {
                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } ).finally( function() {
                            self.overviewTable.reload();
                        } );
                    }
                }
            } );
        }
    } );

    return {
        registerNode: function( node, key, options ) {
            viewModel = new TransfersReceivedViewModel(options);

            ko.applyBindings( viewModel, node.getDOMNode() );
        }
    };
};
