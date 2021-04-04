/*jslint anon:true, sloppy:true, nomen:true*/
/*global ko, moment, _ */

/*exported _fn */
function _fn( Y, NAME ) {         //  eslint-disable-line
    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoComponentManager = KoUI.KoComponentManager,
        viewModel;

    function showConfirmBox( type, message, method ) {
        Y.doccirrus.DCWindow.notice( {
            type: type,
            message: message,
            window: {
                width: 'medium',
                buttons: {
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                            action: function() {
                                this.close();
                            }
                        } ),
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function() {
                                this.close();
                                method();
                            }
                        } )
                    ]
                }
            }
        } );
    }

    function onFail( error ) {
        if( typeof error === "string" ) {
            // Should never go here. Keeping this as last resort
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: error || 'Undefined error',
                window: {
                    width: Y.doccirrus.DCWindow.SIZE_SMALL
                }
            } );
        } else if( error && error.code === "115028" ) {
            // Means labLog cannot be reverted from the activity because the activity cannot be changed in its current state
            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display', "info" );
        } else {
            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
        }
    }

    function TabLabLogViewModel( config ) {
        TabLabLogViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabLabLogViewModel, Disposable, {
        initializer: function( config ) {
            var
                self = this;

            self.mainNode = config.node;
            self.initlabLogTable();
            self.triggerLabProcessListener = Y.doccirrus.communication.on( {
                event: 'triggerLabProcessEvent',
                done: function( response ) {
                    Y.doccirrus.utils.hideLoadingMask( self.mainNode );
                    var error = response && response.data && response.data[0] && response.data[0].error;
                    var displayData = response && response.data && response.data[0] && response.data[0].result;

                    if( error ) {
                        onFail( error );
                    } else {
                        showConfirmBox( 'info', i18n( 'LabLogMojit.tab_labLog.messages.triggerLabProcess', {
                            data: displayData || {
                                unassignedEntries: 0,
                                newlyAssigned: 0
                            }
                        } ), function() {
                        } );
                        self.labLogTable.reload( {
                            fail: onFail
                        } );
                    }
                }
            } );

            self.isSupport = Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.employee.userGroups.SUPPORT );
            self.labLogHeadlineI18n = i18n( 'LabLogMojit.tab_labLog.headline' );
            self.labLogCheckFileWithLDKPMI18n = i18n( 'settings-schema.Settings_T.checkFilesWithLdkPm.i18n' );
        },
        /**
         * @type {null|KoTable}
         */
        labLogTable: null,
        initlabLogTable: function() {
            var
                self = this;

            self.labLogTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'LabLogMojit.tab_labLog.pdfTitle' ),
                    pdfFile: i18n( 'LabLogMojit.tab_labLog.pdfTitle' ),
                    stateId: 'LabLogMojit-tab_labLog-labLogTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.lablog.read,
                    selectMode: 'none',
                    striped: false,
                    limitList: [5, 10, 20, 50, 100],
                    columns: [
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'lablog-schema.Lablog_T.timestamp' ),
                            title: i18n( 'lablog-schema.Lablog_T.timestamp' ),
                            width: '125px',
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'lablog-schema.Lablog_T.timestamp' ),
                                    autoCompleteDateRange: true
                                }
                            },
                            renderer: function( meta ) {
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
                            forPropertyName: 'created',
                            label: i18n( 'lablog-schema.Lablog_T.created' ),
                            title: i18n( 'lablog-schema.Lablog_T.created' ),
                            width: '125px',
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 1,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'lablog-schema.Lablog_T.created' ),
                                    autoCompleteDateRange: true
                                }
                            },
                            renderer: function( meta ) {
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
                            forPropertyName: 'source',
                            label: i18n( 'lablog-schema.Lablog_T.source' ),
                            title: i18n( 'lablog-schema.Lablog_T.source' ),
                            width: '200px',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'lablog-schema.Lablog_T.status' ),
                            title: i18n( 'lablog-schema.Lablog_T.status' ),
                            width: '110px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.lablog.types.Status_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    isNewLabBookRequired = !!(data && data.configuration),
                                    displayText = i18n( 'lablog-schema.Status_E.' + meta.row.status ),
                                    displayTextClass,
                                    errorStr = Y.doccirrus.schemas.lablog.displayPmErrors( data.pmResults );

                                if( isNewLabBookRequired ) {
                                    if( 'IMPORTED' === meta.value ) {
                                        if( !(data && data.assignedPatient && data.assignedPatient.patientId) ) {
                                            displayTextClass = 'text-danger';
                                        } else {
                                            displayTextClass = 'text-success';
                                        }
                                    } else if( 'PROCESSING' === meta.value ) {
                                        displayTextClass = 'text-warning';
                                    }
                                } else {
                                    if( 'IMPORTED' === meta.value ) {
                                        if( Y.doccirrus.schemas.lablog.someL_dataRecordNeedsMatching( data ) || -1 !== data.flags.indexOf( 'LDK_PM_CANCELED' ) ) {
                                            displayTextClass = 'text-danger';
                                        } else {
                                            displayTextClass = 'text-success';
                                        }
                                        if( errorStr ) {
                                            displayText += (' (' + errorStr + ')');
                                        }
                                    }
                                }
                                if( displayTextClass ) {
                                    displayText = Y.Lang.sub( '<span class="{displayTextClass}">{displayText}</span>', {
                                        displayText: displayText,
                                        displayTextClass: displayTextClass
                                    } );
                                }
                                return displayText;
                            }
                        },
                        {
                            forPropertyName: 'user.name',
                            label: i18n( 'lablog-schema.Lablog_T.user' ),
                            title: i18n( 'lablog-schema.Lablog_T.user' ),
                            width: '170px',
                            visible: false,
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                const
                                    data = meta.row,
                                    user = data.user;

                                if( user && user.length ) {
                                    return user[user.length - 1].name;
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'flow',
                            label: i18n( 'lablog-schema.Lablog_T.flow' ),
                            title: i18n( 'lablog-schema.Lablog_T.flow' ),
                            width: '170px',
                            visible: false,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'fileName',
                            label: i18n( 'lablog-schema.Lablog_T.fileName' ),
                            title: i18n( 'lablog-schema.Lablog_T.fileName' ),
                            width: '200px',
                            visible: false,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'fileHash',
                            label: i18n( 'lablog-schema.Lablog_T.fileHash' ),
                            title: i18n( 'lablog-schema.Lablog_T.fileHash' ),
                            width: '150px',
                            visible: false,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'fileDatabaseId',
                            label: i18n( 'lablog-schema.Lablog_T.downloadLdtFile' ),
                            title: i18n( 'lablog-schema.Lablog_T.downloadLdtFile' ),
                            width: '150px',
                            visible: false,
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( meta ) {
                                var
                                    fileDatabaseId = meta.value,
                                    url;

                                if( fileDatabaseId ) {
                                    url = '/download/' + fileDatabaseId;
                                    url = Y.doccirrus.infras.getPrivateURL( url );

                                    return Y.Lang.sub( '<a href="{href}" target="_blank">{text}</a>', {
                                        text: i18n( 'GdtLogMojit.tabGdtOverview.downloadText' ),
                                        href: url
                                    } );
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: function() {
                                return false;
                            }
                        },
                        {
                            forPropertyName: 'type',
                            label: i18n( 'lablog-schema.Lablog_T.type' ),
                            title: i18n( 'lablog-schema.Lablog_T.type' ),
                            width: '170px',
                            visible: true,
                            isFilterable: true,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'description',
                            label: i18n( 'lablog-schema.Lablog_T.description' ),
                            title: i18n( 'lablog-schema.Lablog_T.description' ),
                            width: '250px',
                            visible: false,
                            isFilterable: true,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'assignedPatient.patientName',
                            label: i18n( 'lablog-schema.Lablog_T.assignedPatient' ),
                            title: i18n( 'lablog-schema.Lablog_T.assignedPatient' ),
                            width: '200px',
                            visible: true,
                            isFilterable: true,
                            isSortable: true,
                            renderer: function( meta ) {
                                var
                                    row = meta.row,
                                    patientName = row && row.assignedPatient && row.assignedPatient.patientName,
                                    activityId = row && row.linkedActivities && row.linkedActivities.length > 0 && row.linkedActivities[0];

                                if( patientName && activityId ) {
                                    return Y.Lang.sub( '<a href="{href}" target="_blank">{text}</a>', {
                                        text: patientName,
                                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/activity/' + activityId
                                    } );
                                }
                                return '';
                            },
                            onCellClick: function() {
                                return false;
                            }
                        },
                        {
                            forPropertyName: 'assign',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assign' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assign' ),
                            width: '90px',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( meta ) {
                                var row = meta.row;
                                if( (row.status && row.status !== 'PROCESSING') && (row.status && row.status !== 'LOCKED') && (row.assignedPatient && (row.assignedPatient.patientId === '' || !row.assignedPatient.patientId)) ) {
                                    return Y.Lang.sub( '<button class="btn btn-xs btn-primary">{title}</button>', {title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assignRow' )} );
                                }
                            },
                            onCellClick: function( meta ) {
                                var labLogEntry = meta.row;
                                if( labLogEntry && labLogEntry.status !== 'PROCESSING' ) {
                                    Y.doccirrus.modals.assignLabLogData.showDialog( labLogEntry,
                                        function( result ) {
                                            if( result.success ) {
                                                self.labLogTable.reload();
                                            }
                                        }
                                    );
                                }
                                return false;
                            }
                        },
                        {
                            forPropertyName: 'revert',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.revert' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.revert' ),
                            width: '90px',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( meta ) {
                                var row = meta.row;
                                if( (row.status && row.status !== 'PROCESSING') && row.assignedPatient && row.assignedPatient.patientId ) {
                                    return Y.Lang.sub( '<button class="btn btn-xs btn-primary">{title}</button>', {title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.revertRow' )} );
                                }
                            },
                            onCellClick: function( meta ) {
                                var labLogEntry = meta.row;
                                if( labLogEntry.assignedPatient && labLogEntry.assignedPatient.patientId ) {
                                    showConfirmBox( 'warn', i18n( 'LabLogMojit.tab_labLog.messages.revertLabLogText' ), function() {
                                        Y.doccirrus.jsonrpc.api.lab.revertLabLog( {
                                            data: {
                                                labLog: labLogEntry
                                            }
                                        } )
                                            .then( function( result ) {
                                                if( result && result.data ) {
                                                    self.labLogTable.reload();
                                                }
                                            } )
                                            .fail( onFail );
                                    } );
                                }
                                return false;
                            }
                        }
                    ],
                    onRowClick: function( meta ) {
                        var row = meta.row;
                        if( row.status && row.status !== 'PROCESSING' ) {
                            Y.doccirrus.modals.labLogFileView.show( row, function( result ) {
                                if( result.success ) {
                                    self.labLogTable.reload();
                                }
                            } );
                        }
                    },
                    responsive: false,
                    tableMinWidth: ko.computed( function() {
                        var
                            initializedColumns = self.labLogTable.columns.peek(),
                            visibleColumns = initializedColumns.filter( function( col ) {
                                return ko.unwrap( col.visible );
                            } ),
                            tableMinWidth = 0;

                        visibleColumns.forEach( function( col ) {
                            var
                                width = ko.utils.peekObservable( col.width ) || '';

                            if( width.indexOf( '%' ) > 0 ) {
                                tableMinWidth += 200;
                            } else {
                                tableMinWidth += parseInt( width, 10 );
                            }
                        } );

                        return tableMinWidth + 'px';
                    }, null, {deferEvaluation: true} ).extend( {rateLimit: 0} )
                }
            } );
        },
        triggerLabProcess: _.debounce( function TabOverviewViewModel_triggerLabProcess() {
            Y.doccirrus.utils.showLoadingMask( this.mainNode );
            Y.doccirrus.jsonrpc.api.lab.triggerLabProcess( {
                data: {
                    immediateResponse: true
                }
            } )
                .fail( onFail );
        }, 300, {leading: true, trailing: false} ),
        showSpinner: function() {
            Y.doccirrus.utils.showLoadingMask( this.mainNode );
        },
        hideSpinner: function() {
            Y.doccirrus.utils.hideLoadingMask( this.mainNode );
        },
        destructor: function() {
            if( this.triggerLabProcessListener ) {
                this.triggerLabProcessListener.removeEventListener();
                this.triggerLabProcessListener = null;
            }
        }
    } );

    return {

        registerNode: function( node ) {
            viewModel = new TabLabLogViewModel( {
                node: node.getDOMNode()
            } );
            ko.applyBindings( viewModel, node.getDOMNode() );
        },

        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
            // clear the viewModel
            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }
        }
    };
}
