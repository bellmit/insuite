/*jslint anon:true, sloppy:true, nomen:true*/
// eslint-disable-next-line no-unused-vars
/*global fun:true, ko, moment */

'use strict';

fun = function _fn( Y ) {

    var
        i18n = Y.doccirrus.i18n,
        viewModel = null,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        actTypeColorMap = {};

    function TransfersSentViewModel() {
        TransfersSentViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( TransfersSentViewModel, Disposable, {

        overviewTable: null,

        initializer: function TransfersSentViewModel_initializer() {
            var
                self = this,
                transferLogEntryId = self.get( 'transferLogEntryId' );
            if( transferLogEntryId ) {
                self.showEntryDetailsTable( transferLogEntryId );
            }

            self.initOverviewTable();
            self.initActivitySettings();
        },

        showEntryDetailsTable: function TransfersReceivedViewModel_showDetailsTable( transferLogEntryId ) {
            Y.doccirrus.jsonrpc.api.patienttransfer.read( {
                query: {
                    _id: transferLogEntryId
                }
            } ).done( function( result ) {
                Y.doccirrus.modals.previewTransferModal.show( result.data[0] );
            } );
        },

        initActivitySettings: function TransfersSentViewModel_initActivitySettings() {
            Y.doccirrus.jsonrpc.api.activitysettings
                .read( { query: { _id: Y.doccirrus.schemas.activitysettings.getId() } } )
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data[ 0 ] && Y.Lang.isArray( response.data[ 0 ].settings ) && response.data[ 0 ].settings || [];
                } )
                .then( function( activitySettings ) {
                    activitySettings.forEach( function( activitySetting ) {
                        actTypeColorMap[ activitySetting.actType ] = activitySetting.color;
                    } );
                } );
        },

        initOverviewTable: function TransfersSentViewModel_initOverviewTable() {
            var
                self = this;

            function highlightDependOnStatus( status ) {
                switch( status ) {
                    case Y.doccirrus.schemas.patienttransfer.patientTransferTypes.CANCELED:
                        return 'text-danger';
                    case Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENT:
                        return 'text-success';
                    default:
                        return '';
                }
            }
            self.overviewTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'PatientTransferMojit.title.pdf' ),
                    stateId: 'PatientTransferMojit-tab_transfers_sent',
                    states: [ 'limit' ],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.patientTransfer.getSentTransfer,
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
                            forPropertyName: 'partners',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.partners.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.partners.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ){
                                var value,
                                    practiceName;
                                if(meta.row.kimRecipient && meta.row.kimRecipient.length > 0 &&
                                   meta.row.kimRecipient[0].mail && meta.row.kimRecipient[0].mail[0]) {
                                    value = meta.row.kimRecipient[0].mail[0];
                                    return value;
                                } else {
                                    value = meta.value;
                                    practiceName = value && value[0] && value[0].name;
                                    return practiceName;
                                }

                            }
                        },
                        {
                            forPropertyName: 'doctorName',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.doctorName.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.doctorName.i18n' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'status',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.status.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.status.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.patienttransfer.types.Status_E.list.filter( function( item ) {
                                    return item.val === Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENT ||
                                           item.val === Y.doccirrus.schemas.patienttransfer.patientTransferTypes.SENDING ||
                                           item.val === Y.doccirrus.schemas.patienttransfer.patientTransferTypes.CANCELED;
                                } ),
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function TransfersReceivedViewModel_overviewTable_renderer_status( meta ) {

                                var
                                    displayText = Y.doccirrus.schemaloader.translateEnumValue( 'i18n', meta.value, Y.doccirrus.schemas.patienttransfer.types.Status_E.list, '' ),
                                    displayTextClass = highlightDependOnStatus( meta.value );

                                displayText = Y.Lang.sub( '<span class="{displayTextClass}">{displayText}</span>', {
                                    displayText: displayText,
                                    displayTextClass: displayTextClass
                                } );

                                return displayText;
                            }
                        },
                        {
                            forPropertyName: 'subject',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.subject.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.subject.i18n' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'textContent',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.textContent.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.textContent.i18n' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'attachedMedia',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.attachedMedia.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.attachedMedia.i18n' ),
                            isSortable: false,
                            isFilterable: false,
                            renderer: function( meta ) {
                                var value = meta.value || [];
                                    return value.map( function( item ) {
                                        item._id = item.mediaId;
                                        return '<a target="_blank" href="' + Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getMediaUrl( item, 'original' ) ) + '">' + item.caption + '</a>';
                                    } ).join( ', ' );
                            }
                        }
                    ],
                    onRowClick: function TransfersReceivedViewModel_overviewTable_onRowClick( meta ) {
                        if( !meta.isLink ) {
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
        }
    }, {
        ATTRS: {
            transferLogEntryId: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    return {
        registerNode: function( node, key, options ) {
            viewModel = new TransfersSentViewModel( {
                transferLogEntryId: options.transferLogEntryId
            } );

            ko.applyBindings( viewModel, node.getDOMNode() );
        }
    };
};
