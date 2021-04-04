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
            self.overviewCheckFileWithLDKPMI18n = i18n( 'settings-schema.Settings_T.checkFilesWithLdkPm.i18n' );

            if ( window.location.hash.length > 1 ) {
                Y.doccirrus.jsonrpc.api.banklog.read( {
                    query: {
                        _id: window.location.hash.substr( 1 )
                    }
                } ).done( function( res ) {
                    if ( res.data && res.data[0] ) {
                        self.showDetails( res.data[0] );
                    }
                } ).fail( self.clearDetails );
            }
        },
        /**
         * @type {null|KoTable}
         */
        overviewTable: null,
        initOverviewTable: function BinderViewModel_initOverviewTable() {
            var
                self = this;

            self.overviewTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    stateId: 'BankLogMojit-overviewTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.banklog.read,
                    selectMode: 'none',
                    columns: [
                        {
                            forPropertyName: 'created',
                            label: i18n( 'banklog-schema.BankLog_T.date.i18n' ),
                            title: i18n( 'banklog-schema.BankLog_T.date.i18n' ),
                            width: '5%',
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'banklog-schema.BankLog_T.paymentDate.i18n' )
                                }
                            },
                            renderer: function TabOverviewViewModel_renderer_created( meta ) {
                                var
                                    value = meta.value;

                                if( !value ) {
                                    return '';
                                }

                                return moment( value ).format( 'DD.MM.YYYY' );
                            }
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.status.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.status.i18n' ),
                            width: '6%',
                            isSortable: true,
                            isFilterable: true,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.inpacslog.types.Status_E.list,
                                optionsText: '-de',
                                optionsValue: 'val'
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            renderer: function TabOverviewViewModel_renderer_status( meta ) {
                                var
                                    status = meta.value;

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'inpacslog', 'Status_E', status, 'i18n', '' );
                            }
                        },
                        {
                            forPropertyName: 'Amount',
                            label: i18n( 'banklog-schema.BankLog_T.amount.i18n' ),
                            title: i18n( 'banklog-schema.BankLog_T.amount.i18n' ),
                            width: '5%',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: 'numberAsString10',
                            interceptRenderOutput: function( output, meta, isTitle ){
                                var
                                    numbers,
                                    removed,// eslint-disable-line
                                    string,
                                    intercepted;
                                if( output && isTitle ) {
                                    // format title to cell value
                                    numbers = output.split( '' );
                                    // eslint-disable-next-line no-unused-vars
                                    removed = numbers.splice( 8, 0, "." );
                                    string = numbers.join( '' );
                                    arguments[0] = parseFloat( string ).toFixed( 2 );
                                } else {
                                    arguments[0] = output;
                                }
                                intercepted = meta.col.__proto__.interceptRenderOutput.apply(this, arguments);
                                if ( !intercepted ) {
                                    return '';
                                }
                                if ( 'string' !== typeof intercepted ) {
                                    intercepted = intercepted.toString();
                                }
                                // remove non-breaking spaces from the tooltip, MOJ-12611
                                intercepted = intercepted.replace( new RegExp( '&nbsp;', 'g' ), ' ' );
                                return intercepted;
                            },
                            renderer: function TabOverviewViewModel_renderer_amount( meta ) {
                                var
                                    data = meta.row,
                                    numbers = data.Amount.split( '' ),
                                    removed = numbers.splice( 8, 0, "." ), // eslint-disable-line
                                    string = numbers.join( '' );

                                return parseFloat( string ).toFixed( 2 );
                            }
                        },
                        {
                            forPropertyName: 'Payment date',
                            label: i18n( 'banklog-schema.BankLog_T.paymentDate.i18n' ),
                            title: i18n( 'banklog-schema.BankLog_T.paymentDate.i18n' ),
                            width: '7%',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'banklog-schema.BankLog_T.paymentDate.i18n' )
                                }
                            },
                            renderer: function TabOverviewViewModel_renderer_paymentDate( meta ) {
                                var
                                    data = meta.row;

                                if( !data['Payment date'] ) {
                                    return '';
                                }

                                return moment( data['Payment date'] ).format( 'DD.MM.YYYY' );
                            }
                        },
                        {
                            forPropertyName: 'Credit date',
                            label: i18n( 'banklog-schema.BankLog_T.creditDate.i18n' ),
                            title: i18n( 'banklog-schema.BankLog_T.creditDate.i18n' ),
                            width: '8%',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'banklog-schema.BankLog_T.paymentDate.i18n' )
                                }
                            },
                            renderer: function TabOverviewViewModel_renderer_creditDate( meta ) {
                                var
                                    data = meta.row;

                                if( !data['Credit date'] ) {
                                    return '';
                                }

                                return moment( data['Credit date'] ).format( 'DD.MM.YYYY' );
                            }
                        },
                        {
                            forPropertyName: 'ESR participant number',
                            label: i18n( 'banklog-schema.BankLog_T.ESRParticipantNumber.i18n' ),
                            title: i18n( 'banklog-schema.BankLog_T.ESRParticipantNumber.i18n' ),
                            width: '11%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'invoiceNo',
                            label: i18n( 'banklog-schema.BankLog_T.invoiceNo' ),
                            title: i18n( 'banklog-schema.BankLog_T.invoiceNo' ),
                            width: '8%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'Reference number',
                            label: i18n( 'banklog-schema.BankLog_T.referenceNumber.i18n' ),
                            title: i18n( 'banklog-schema.BankLog_T.referenceNumber.i18n' ),
                            width: '13%',
                            visible: false,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'Transaction type',
                            label: i18n( 'banklog-schema.BankLog_T.transactionType.i18n' ),
                            title: i18n( 'banklog-schema.BankLog_T.transactionType.i18n' ),
                            width: '8%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'patientName',
                            label: i18n( 'banklog-schema.BankLog_T.patientName.i18n' ),
                            title: i18n( 'banklog-schema.BankLog_T.patientName.i18n' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var data = meta.row;
                                if(meta.value && data.activityId) {
                                    return Y.Lang.sub('<a href="{href}" target="_blank">{text}</a>', {
                                        text: meta.value,
                                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/activity/' + data.activityId + "/section/documentform"
                                    });
                                } else if( meta.value ) {
                                    return meta.value;
                                } else {
                                    return null;
                                }

                            }
                        },
                        {
                            forPropertyName: '',
                            label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assign' ),
                            title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assign' ),
                            width: '5%',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function TabOverviewViewModel_renderer_assign( meta ) {
                                if( meta.row.status !== 'PROCESSED' ) {
                                    return Y.Lang.sub( '<button class="btn btn-xs btn-primary">{title}</button>', {title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.assignRow')} );
                                }
                            },
                            onCellClick: function( meta ) {
                                var cashEntry;
                                if( meta.row && meta.row.status !== 'PROCESSED' ) {
                                    cashEntry = meta.row;
                                    Y.doccirrus.modals.patientAndReceiptSelect.showDialog( cashEntry,
                                        function( result ) {
                                            if( result.success ) {
                                                self.overviewTable.reload();
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
                            width: '5%',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function TabOverviewViewModel_renderer_unassign( meta ) {
                                if( meta.row.status === 'PROCESSED' ) {
                                    return Y.Lang.sub( '<button class="btn btn-xs btn-primary">{title}</button>', { title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.revert' ) } );
                                }
                            },
                            onCellClick: function( meta ) {
                                var
                                    data;
                                if( meta.row && meta.row.status === 'PROCESSED' ) {
                                    data = meta.row;
                                    Y.doccirrus.jsonrpc.api.banklog.unsassignActivityFromBankLogRecord( {
                                        data: {
                                            bankLogId: data._id,
                                            activityId: data.activityId
                                        }
                                    } ).then( function() {
                                        self.overviewTable.reload();
                                    } );
                                }
                                return false;
                            }
                        },
                        {
                            forPropertyName: '',
                            label: i18n( 'InvoiceMojit.general.ZIP_DOWNLOAD' ),
                            title: i18n( 'InvoiceMojit.general.ZIP_DOWNLOAD' ),
                            width: '7%',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function TabOverviewViewModel_renderer_download( meta ) {
                                var data = meta.row,
                                    mediaId = data.MediaObj[0]._id,
                                    fileName = data.MediaObj[0].name;
                                return Y.Lang.sub( '<a href="/media/{id}_original.APPLICATION_OCTET-STREAM.BESR">{title}</a>', { title: fileName, id: mediaId } );
                            }
                        }
                    ],
                    getCssRow: function( $context, css ) {
                        css[$context.$data.status === 'UNPROCESSED' ? 'text-danger' : 'text-success'] = true;
                    }
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