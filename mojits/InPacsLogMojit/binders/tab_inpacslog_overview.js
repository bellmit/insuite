/**
 * User: abhijit.baldawa
 * Date: 26.10.17  12:39
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

    function onFail( error ) {
        if(error && typeof error === "string") {
            error = {message:error};
        } else if( typeof error === "object" && !error.message ) {
            if( error.data ) {
                error.message = error.data;
            }
        }

        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            message: error && error.message || 'Undefined error',
            window: {
                width: Y.doccirrus.DCWindow.SIZE_SMALL
            }
        } );
    }

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
                                method( );
                            }
                        } )
                    ]
                }
            }
        } );
    }

    function TabInpacsOverviewViewModel( config ) {
        TabInpacsOverviewViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabInpacsOverviewViewModel, KoViewModel.getDisposable(), {
        inpacsOverviewTable: null,
        inpacsLogRevertHandler: null,
        pullDataFromOrthancButtonEnabled: null,

        initializer: function ( config ) {
            var
                self = this;

            self.titleI18n = i18n( 'InpacsLogMojit.tabInpacsLogOverview.title' );
            self.refreshFromPacsI18n = i18n( 'InpacsLogMojit.tabInpacsLogOverview.refreshFromPacs' );

            self.mainNode = config.node;
            self.pullDataFromOrthancButtonEnabled = ko.observable( true );

            self.initOverviewTable();
            self.initSocketListeners();
        },

        destructor: function FindingModel_destructor() {
            if( this.inpacsLogRevertHandler ) {
                this.inpacsLogRevertHandler.removeEventListener();
                this.inpacsLogRevertHandler = null;
            }
        },

        defaultCellClick: function ( meta ) {
            var data = meta.row;
            if( data && data.orthancStudyUId ) {
                window.open( Y.doccirrus.infras.getPrivateURL( '/inpacs/osimis-viewer/app/index.html?study=' + encodeURIComponent( data.orthancStudyUId ) ), '_blank' );
            }
            return false;
        },

        getDataFromOrthanc: function( ) {
            var
                self = this;

            Y.doccirrus.utils.showLoadingMask( self.mainNode );
            self.pullDataFromOrthancButtonEnabled( false );

            Y.doccirrus.communication.apiCall( {
                method: 'inpacslog.getDataFromOrthanc',
                data: {}
            }, function( err ) {
                Y.doccirrus.utils.hideLoadingMask( self.mainNode );
                self.pullDataFromOrthancButtonEnabled( true );

                if(err) {
                    onFail( err );
                } else {
                    self.inpacsOverviewTable.reload();
                }
            } );
        },

        initSocketListeners: function () {
            var
                self = this;

            self.inpacsLogRevertHandler = Y.doccirrus.communication.on({
                event: 'system.UPDATE_INPACS_LOG_TABLE',
                done: function success( response ) {
                    var
                        data = response && response.data && response.data[0];

                    if( data && data.error === "ERROR_REVERTING" ) {
                        onFail( i18n( 'InpacsLogMojit.tabInpacsLogOverview.errorReverting' ) );
                    }

                    self.inpacsOverviewTable.reload();
                }
            });
        },

        initOverviewTable: function TabInpacsOverviewViewModel_initOverviewTable() {
            var
                self = this;

            self.inpacsOverviewTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'InpacsLogMojit.tabInpacsLogOverview.title' ),
                    stateId: 'InPacsLogMojit-tab_overview-overviewTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.inpacslog.read,
                    selectMode: 'none',
                    columns: [
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.timestamp' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.timestamp' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function TabOverviewViewModel_overviewTable_renderer_timestamp( meta ) {
                                var
                                    value = meta.value;

                                if( value ) {
                                    return moment( value ).format( 'DD.MM.YYYY HH:mm' );
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: self.defaultCellClick.bind(self)
                        },
                        {
                            forPropertyName: 'g_extra.StudyDate',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.created' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.created' ),
                            width: '8%',
                            isSortable: true,
                            sortInitialIndex: 0,
                            direction: 'DESC',
                            isFilterable: true,
                            renderer: function TabOverviewViewModel_overviewTable_renderer_created( meta ) {
                                var
                                    data = meta.row,
                                    createdDate;

                                if( data && data.g_extra && data.g_extra.StudyDate ) {
                                    createdDate = moment( data.g_extra.StudyDate, "YYYYMMDD" );

                                    if( createdDate.isValid() ) {
                                        return createdDate.format( 'DD.MM.YYYY' );
                                    } else {
                                        return '';
                                    }
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: self.defaultCellClick.bind(self)
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
                            // onCellClick: self.defaultCellClick.bind(self)
                        },
                        {
                            forPropertyName: 'patientDob',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientDob' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientDob' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function( meta ) {
                                var
                                    value = meta.value;

                                if( value ) {
                                    return moment( value ).format( 'DD.MM.YYYY' );
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: self.defaultCellClick.bind(self)
                        },
                        {
                            forPropertyName: 'patientGender',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.gender' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.gender' ),
                            width: '5%',
                            renderer: function( meta ) {
                                var gender = meta.value;

                                switch( gender ) {
                                    case 'MALE':
                                        return 'm';
                                    case 'FEMALE':
                                        return 'w';
                                    case 'UNDEFINED':
                                        return 'x';
                                    case 'VARIOUS':
                                        return 'd';
                                    default:
                                        return 'u';
                                }

                            },
                            isFilterable: true,
                            visible: false,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect',
                                options: Y.Array.filter( Y.doccirrus.schemas.patient.types.Gender_E.list, function( item ) {
                                    return Boolean( item.val );
                                } ).map( function( item ) {
                                    var gender = item.val;

                                    switch( gender ) {
                                        case 'MALE':
                                            return {val: gender, i18n: 'm'};
                                        case 'FEMALE':
                                            return {val: gender, i18n: 'w'};
                                        case 'UNDEFINED':
                                            return {val: gender, i18n: 'x'};
                                        case 'VARIOUS':
                                            return {val: gender, i18n: 'd'};
                                        default:
                                            return {val: gender, i18n: 'u'};
                                    }
                                } ),
                                optionsCaption: '',
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            onCellClick: self.defaultCellClick.bind(self)
                        },
                        {
                            forPropertyName: 'g_extra.StudyInstanceUID',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.studyInstanceId' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.studyInstanceId' ),
                            isFilterable: true,
                            isSortable: true,
                            width: '10%',
                            visible: false,
                            renderer: function( meta ) {
                                var
                                    row = meta.row;

                                if( row && row.g_extra && row.g_extra.StudyInstanceUID ) {
                                    return row.g_extra.StudyInstanceUID;
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: self.defaultCellClick.bind(self)
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
                            },
                            onCellClick: self.defaultCellClick.bind(self)
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.status' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.status' ),
                            width: '10%',
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

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'inpacslog', 'Status_E', status, 'i18n', '' );
                            },
                            onCellClick: self.defaultCellClick.bind(self)
                        },
                        {
                            forPropertyName: '',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assign' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assign' ),
                            width: '8%',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( meta ) {
                                if( meta.row.status !== 'PROCESSED' ) {
                                    return Y.Lang.sub( '<button class="btn btn-xs btn-primary">{title}</button>', {title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assignRow' )} );
                                }
                            },
                            onCellClick: function( meta ) {
                                var inpacsLogEntry;
                                if( meta.row && meta.row.status !== 'PROCESSED' ) {
                                    inpacsLogEntry = meta.row;
                                    Y.doccirrus.modals.assignToActivitySelectModal.showDialog( inpacsLogEntry,
                                        function( result ) {
                                            if( result.success ) {
                                                self.inpacsOverviewTable.reload();
                                            }
                                        }
                                    );
                                }

                                return false;
                            }
                        },
                        {
                            forPropertyName: '',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.revert' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.revert' ),
                            width: '7%',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( meta ) {
                                if( meta.row.status === 'PROCESSED' ) {
                                    return Y.Lang.sub( '<button class="btn btn-xs btn-primary">{title}</button>', {title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.revertRow' )} );
                                }
                            },
                            onCellClick: function( meta ) {
                                if( meta.row && meta.row.status === 'PROCESSED' ) {
                                    showConfirmBox('warn', i18n( 'InpacsLogMojit.tabInpacsLogOverview.revertWarning' ), function() {
                                        var inpacsLogEntry = meta.row;

                                        Y.doccirrus.jsonrpc.api.inpacslog.revertInpacsEntryFromActivity( {
                                            data: {
                                                inpacsLogId: inpacsLogEntry._id
                                            }
                                        } ).then( function( result ) {
                                            if( result && result.data === "RELOAD" ) {
                                                self.inpacsOverviewTable.reload();
                                            }
                                        } ).fail( onFail );
                                    });
                                }

                                return false;
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
            viewModel = new TabInpacsOverviewViewModel({
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