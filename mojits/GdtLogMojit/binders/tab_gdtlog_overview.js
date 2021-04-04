/**
 * User: abhijit.baldawa
 * Date: 14.06.18  17:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*global fun:true, ko, moment*/
/*exported fun */
fun = function _fn( Y ) {
    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel,
        viewModel;

    // function onFail( error ) {
    //     if(error && typeof error === "string") {
    //         error = {message:error};
    //     } else if( typeof error === "object" && !error.message ) {
    //         if( error.data ) {
    //             error.message = error.data;
    //         }
    //     }
    //
    //     Y.doccirrus.DCWindow.notice( {
    //         type: 'error',
    //         message: error && error.message || 'Undefined error',
    //         window: {
    //             width: Y.doccirrus.DCWindow.SIZE_SMALL
    //         }
    //     } );
    // }

    function TabGdtOverviewViewModel( config ) {
        TabGdtOverviewViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabGdtOverviewViewModel, KoViewModel.getDisposable(), {
        gdtOverviewTable: null,
        gdtlogLogRevertHandler: null,

        initializer: function ( config ) {
            var
                self = this;

            self.mainNode = config.node;

            self.initOverviewTable();
            self.initSocketListeners();
        },

        destructor: function FindingModel_destructor() {
            if( this.gdtlogLogRevertHandler ) {
                this.gdtlogLogRevertHandler.removeEventListener();
                this.gdtlogLogRevertHandler = null;
            }
        },

        initSocketListeners: function() {
            var
                self = this;

            self.gdtlogLogRevertHandler = Y.doccirrus.communication.on({
                event: 'system.UPDATE_GDT_LOG_TABLE',
                done: function success() {
                    self.gdtOverviewTable.reload();
                }
            });
        },

        initOverviewTable: function() {
            var
                self = this;

            self.gdtOverviewTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'GdtLogMojit.tabGdtOverview.title' ),
                    stateId: 'GdtLogMojit-tab_overview-overviewTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.gdtlog.read,
                    selectMode: 'none',
                    columns: [
                        {
                            forPropertyName: 'created',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.created' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.created' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true,
                            visible: true,
                            direction: 'DESC',
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function ( meta ) {
                                var
                                    value = meta.value;

                                if( value ) {
                                    return moment( value ).format( 'DD.MM.YYYY HH:mm' );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.timestamp' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.timestamp' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function ( meta ) {
                                var
                                    value = meta.value;

                                if( value ) {
                                    return moment( value ).format( 'DD.MM.YYYY HH:mm' );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'patientName',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientName' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientName' ),
                            width: '12%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var data = meta.row;
                                if( meta.value && data.activityId && data.patientId) {
                                    return Y.Lang.sub('<a href="{href}" target="_blank">{text}</a>', {
                                        text: meta.value,
                                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + (
                                            data.activityId?
                                              '#/activity/' + data.activityId + "/section/documentform":
                                              '#/patient/' + data.patientId + "/tab/casefile_browser"
                                        )
                                    });
                                } else if(meta.value) {
                                    return meta.value;
                                } else {
                                    return null;
                                }
                            }
                        },
                        {
                            forPropertyName: 'user',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.user' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.user' ),
                            isFilterable: true,
                            isSortable: true,
                            width: '10%',
                            renderer: function( meta ) {
                                var
                                    user = meta.value;

                                if( user ) {
                                    return user;
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'fileName',
                            label: i18n( 'GdtLogMojit.gdtLogSchema.fileNameText' ),
                            title: i18n( 'GdtLogMojit.gdtLogSchema.fileNameText' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            width: '10%',
                            renderer: function( meta ) {
                                var
                                    fileName = meta.value;

                                if( fileName ) {
                                    return fileName;
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'fileHash',
                            label: i18n( 'GdtLogMojit.gdtLogSchema.fileHashText' ),
                            title: i18n( 'GdtLogMojit.gdtLogSchema.fileHashText' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            width: '10%',
                            renderer: function( meta ) {
                                var
                                    fileHash = meta.value;

                                if( fileHash ) {
                                    return fileHash;
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'flowTitle',
                            label: i18n( 'GdtLogMojit.gdtLogSchema.flowTitle' ),
                            title: i18n( 'GdtLogMojit.gdtLogSchema.flowTitle' ),
                            isFilterable: true,
                            isSortable: true,
                            visible: false,
                            width: '10%',
                            renderer: function( meta ) {
                                var
                                    flowTitle = meta.value;

                                if( flowTitle ) {
                                    return flowTitle;
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'gdtResult',
                            label: i18n( 'GdtLogMojit.gdtLogSchema.gdtResultText' ),
                            title: i18n( 'GdtLogMojit.gdtLogSchema.gdtResultText' ),
                            width: '15%',
                            isSortable: true,
                            isFilterable: true,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.gdtlog.types.GdtResult_E.list,
                                optionsText: '-de',
                                optionsValue: 'val'
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            renderer: function( meta ) {
                                var
                                    result = meta.value;

                                if( !result ) {
                                    return '';
                                }

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'gdtlog', 'GdtResult_E', result, 'i18n', '' );
                            }
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.status' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.status' ),
                            width: '8%',
                            isSortable: true,
                            isFilterable: true,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.inpacslog.types.Status_E.list,
                                optionsText: '-de',
                                optionsValue: 'val'
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            renderer: function( meta ) {
                                var
                                    status = meta.value;

                                if( !status ) {
                                    return '';
                                }

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'inpacslog', 'Status_E', status, 'i18n', '' );
                            }
                        },
                        {
                            forPropertyName: 'fileDownloadUrl',
                            label: i18n( 'GdtLogMojit.tabGdtOverview.downloadGdtFile' ),
                            title: i18n( 'GdtLogMojit.tabGdtOverview.downloadGdtFile' ),
                            isFilterable: false,
                            isSortable: false,
                            width: '14%',
                            renderer: function( meta ) {
                                var
                                    fileDownloadUrl = meta.value;

                                if( fileDownloadUrl ) {
                                    return Y.Lang.sub('<a href="{href}" target="_blank">{text}</a>', {
                                        text: i18n( 'GdtLogMojit.tabGdtOverview.downloadText' ),
                                        href: fileDownloadUrl
                                    });
                                } else {
                                    return '';
                                }
                            }
                        }
                    ],
                    getCssRow: function( $context, css ) {
                        css[$context.$data.status === 'UNPROCESSED' ? 'text-danger' : 'text-success'] = true;
                    }
                }
            } );
        }
    });


    return {
        registerNode: function( node ) {
            viewModel = new TabGdtOverviewViewModel({
                node: node.getDOMNode()
            });

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
};