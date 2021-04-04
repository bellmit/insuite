/**
 * User: do
 * Date: 29/08/16  13:41
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI, moment */
'use strict';

YUI.add( 'EdmpDeliveriesTableVM', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,

            QUARTER = i18n( 'InvoiceMojit.gkv_browserJS.label.QUARTER' ),
            YEAR = i18n( 'InvoiceMojit.gkv_browserJS.label.YEAR' ),
            LAST_UPDATE = i18n( 'InvoiceMojit.gkv_browserJS.label.LAST_UPDATE' );

        function EdmpDeliveriesTableVM( config ) {
            return {
                table: KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        formRole: 'casefile-ko-invoice-table',
                        pdfTitle: i18n( 'InvoiceMojit.edmp_browserJS.pdfTitleSent' ),
                        stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-edmpDeliveriesTable',
                        staticConfig: [
                            {
                                name: 'Archiviert',
                                shortcutDescription: '',
                                shortcutIndex: 0,
                                shortcutVisible: true,
                                filters: [
                                    {
                                        forPropertyName: 'edmpDeliveryStatus',
                                        value: ['ARCHIVED']
                                    }
                                ]
                            }

                        ],
                        states: ['limit'],
                        striped: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.edmpdelivery.read,
                        columns: [
                            // {
                            //     componentType: 'KoTableColumnCheckbox',
                            //     forPropertyName: 'checked',
                            //     label: '',
                            //     checkMode: 'single',
                            //     allToggleVisible: false
                            // },
                            {
                                width: '48px',
                                forPropertyName: 'quarter',
                                label: QUARTER,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                width: '48px',
                                forPropertyName: 'year',
                                label: YEAR,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'edmpDeliveryStatus',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                                width: '100px',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.edmpdelivery.types.EdmpDeliveryStatus_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                renderer: function( meta ) {
                                    var
                                        status = meta.value;
                                    return Y.doccirrus.schemaloader.translateEnumValue( 'i18n', status, Y.doccirrus.schemas.edmpdelivery.types.EdmpDeliveryStatus_E.list, '' );
                                }
                            },
                            {
                                forPropertyName: 'sentDate',
                                label: i18n( 'activity-schema.DMP_BASE_T.dmpSentDate.i18n' ),
                                title: i18n( 'activity-schema.DMP_BASE_T.dmpSentDate.i18n' ),
                                width: '120px',
                                renderer: function( meta ) {
                                    var val = meta.value,
                                        date;
                                    if( !val ) {
                                        return '';
                                    }
                                    date = moment.utc( val );
                                    if( !date.isValid() ) {
                                        return '';
                                    }
                                    return date.local().format( 'DD.MM.YYYY' );
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'locname',
                                label: 'BS',
                                renderer: function( meta ) {
                                    return meta.value || 'n/a';
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'addresseeIk',
                                label: i18n( 'edmpdelivery-schema.EdmpDelivery_T.addresseeIk.i18n' ),
                                renderer: function( meta ) {
                                    var addresseeIk = meta.value === 'QDOCU' ? '-' : Y.doccirrus.edmputils.renderAddresseeIk(meta);
                                    return addresseeIk;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'nDocs',
                                label: i18n( 'edmpdelivery-schema.EdmpDelivery_T.nDocs.i18n' ),
                                title: i18n( 'edmpdelivery-schema.EdmpDelivery_T.nDocs.i18n' ),
                                renderer: function( meta ) {
                                    return meta.value || 0;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'editor.name',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                                width: '148px',
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
                                forPropertyName: 'lastUpdate',
                                label: LAST_UPDATE,
                                renderer: Y.doccirrus.invoicelogutils.renderDateAndTime,
                                sortInitialIndex: 0,
                                isSortable: true,
                                isFilterable: true,
                                direction: 'DESC',
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                data = meta.row;
                            if( 'PACKING' === data.edmpDeliveryStatus ) {
                                return;
                            }

                            config.onAction( {type: 'rowClick', data: data} );
                            return false;
                        },
                        getCssRow: function( $context, css ) {
                            var row = $context.$data;
                            if( 'PACKING' === row.edmpDeliveryStatus ) {
                                css['text-muted'] = true;
                            }
                        }
                    }
                } )
            };
        }

        Y.namespace( 'doccirrus.edmp.models' ).EdmpDeliveriesTableVM = EdmpDeliveriesTableVM;
    },
    '0.0.1', {requires: ['edmpdelivery-schema', 'edmp-utils']}
);

