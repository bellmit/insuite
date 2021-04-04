/*jslint anon:true, sloppy:true, nomen:true*/
/*global ko, moment */

/*exported _fn */
function _fn( Y, NAME ) {         //  eslint-disable-line
    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoComponentManager = KoUI.KoComponentManager,
        binder = Y.doccirrus.utils.getMojitBinderByType( 'LabLogMojit' ),
        binderViewModel = binder.binderViewModel,
        viewModel;

    function TabOverviewViewModel( config ) {
        TabOverviewViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabOverviewViewModel, Disposable, {
        initializer: function TabOverviewViewModel_initializer() {
            var
                self = this;

            self.initOverviewTable();

            self.overviewHeadlineI18n = i18n( 'LabLogMojit.tab_overview.headline' );
            self.overviewCheckFileWithLDKPMI18n = i18n( 'settings-schema.Settings_T.checkFilesWithLdkPm' );
        },
        /**
         * @type {null|KoTable}
         */
        overviewTable: null,
        initOverviewTable: function TabOverviewViewModel_initOverviewTable() {
            var
                self = this;

            self.overviewTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'LabLogMojit.tab_overview.pdfTitle' ),
                    pdfFile: i18n( 'LabLogMojit.tab_overview.pdfTitle' ),
                    stateId: 'LabLogMojit-tab_overview-overviewTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.lablog.read,
                    selectMode: 'none',
                    columns: [
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'lablog-schema.Lablog_T.timestamp' ),
                            title: i18n( 'lablog-schema.Lablog_T.timestamp' ),
                            width: '140px',
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function TabOverviewViewModel_overviewTable_renderer_timestamp( meta ) {
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
                            width: '140px',
                            isSortable: true,
                            direction: 'DESC',
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function TabOverviewViewModel_overviewTable_renderer_created( meta ) {
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
                            label: i18n( 'lablog-schema.Lablog_T.status' ),
                            title: i18n( 'lablog-schema.Lablog_T.status' ),
                            width: '100px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.lablog.types.Status_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function TabOverviewViewModel_overviewTable_renderer_status( meta ) {
                                var
                                    data = meta.row,
                                    displayText = i18n( 'lablog-schema.Status_E.' + meta.row.status ),
                                    displayTextClass = '',
                                    errorStr = Y.doccirrus.schemas.lablog.displayPmErrors( data.pmResults );

                                if( 'IMPORTED' === meta.value ) {

                                    if( Y.doccirrus.schemas.lablog.someL_dataRecordNeedsMatching( data ) || -1 !== data.flags.indexOf( 'LDK_PM_CANCELED' ) ) {
                                        displayTextClass = 'text-danger';
                                    } else {
                                        displayTextClass = 'text-success';
                                    }

                                    if( errorStr ) {
                                        displayText += (' (' + errorStr + ')');
                                    }

                                    displayText = Y.Lang.sub( '<span class="{displayTextClass}">{displayText}</span>', {
                                        displayText: displayText,
                                        displayTextClass: displayTextClass
                                    } );

                                }

                                return displayText;
                            }
                        },
                        {
                            forPropertyName: 'source',
                            label: i18n( 'lablog-schema.Lablog_T.source' ),
                            title: i18n( 'lablog-schema.Lablog_T.source' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'patientEntriesTotal',
                            label: i18n( 'lablog-schema.Lablog_T.patientEntriesTotal' ),
                            title: i18n( 'lablog-schema.Lablog_T.patientEntriesTotal' ),
                            width: '160px',
                            isSortable: true
                        },
                        {
                            forPropertyName: 'patientEntriesNoMatch',
                            label: i18n( 'lablog-schema.Lablog_T.patientEntriesNoMatch' ),
                            title: i18n( 'lablog-schema.Lablog_T.patientEntriesNoMatch' ),
                            width: '170px',
                            isSortable: true
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
                                var
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
                            forPropertyName: 'fileName',
                            label: i18n( 'lablog-schema.Lablog_T.fileName' ),
                            title: i18n( 'lablog-schema.Lablog_T.fileName' ),
                            width: '170px',
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
                            width: '42%',
                            visible: true,
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
                        }
                    ],
                    onRowClick: function TabOverviewViewModel_overviewTable_onRowClick( meta ) {
                        var
                            data = meta.row;

                        binderViewModel.visitFile( data );
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
                            } else {
                                tableMinWidth += parseInt( width, 10 );
                            }
                        } );

                        return tableMinWidth + 'px';
                    }, null, {deferEvaluation: true} ).extend( {rateLimit: 0} )
                }
            } );
        }
    } );

    viewModel = new TabOverviewViewModel();

    return {

        registerNode: function tab_overview_registerNode( node ) {

            ko.applyBindings( viewModel, node.getDOMNode() );
        },

        deregisterNode: function tab_overview_deregisterNode( node ) {

            ko.cleanNode( node.getDOMNode() );

        }
    };
}
