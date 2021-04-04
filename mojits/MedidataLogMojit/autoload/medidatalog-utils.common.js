/**
 * User: dcdev
 * Date: 2/5/21  6:50 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, moment*/
'use strict';

YUI.add( 'medidatalog-utils', function( Y /*, NAME */ ) {

    var
        i18n = Y.doccirrus.i18n,
        dateFields = {
            SENT: 'sentDate',
            NOTIFICATION: 'created',
            RECEIVED: 'receiveDate'
        };

    function constructMedidataLogTableConfig ( args ) {
        var uniqueColumns = args.uniqueColumns || [],
            type = args.type;

        var startColumns = [
            {
                componentType: 'KoTableColumnCheckbox',
                forPropertyName: 'checked',
                label: '',
                checkMode: 'multi',
                allToggleVisible: true
            },
            {
                forPropertyName: 'created',
                label: i18n( 'medidatalog-schema.MedidataLog_T.' + dateFields[type] ),
                title: i18n( 'medidatalog-schema.MedidataLog_T.' + dateFields[type] ),
                width: '5%',
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
                        placeholder: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' )
                    }
                },
                renderer: function TabReceivedViewModel_renderer_created( meta ) {
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
                label: i18n( 'medidatalog-schema.MedidataLog_T.status' ),
                title: i18n( 'medidatalog-schema.MedidataLog_T.status' ),
                width: '5%',
                visible: true,
                isSortable: true,
                isFilterable: true,
                renderer: function( meta ) {
                    var value = meta.value,
                        displayText = Y.doccirrus.schemaloader.getEnumListTranslation( 'medidatalog', 'Status_E', value, 'i18n', '' );

                    return displayText;
                }
            },
            {
                forPropertyName: 'correlationReference',
                label: i18n( 'medidatalog-schema.MedidataLog_T.correlationReference' ),
                title: i18n( 'medidatalog-schema.MedidataLog_T.correlationReference' ),
                width: '5%',
                visible: false,
                isSortable: true,
                isFilterable: true
            },
            {
                forPropertyName: 'documentReference',
                label: i18n( 'medidatalog-schema.MedidataLog_T.documentReference' ),
                title: i18n( 'medidatalog-schema.MedidataLog_T.documentReference' ),
                width: '5%',
                visible: false,
                isSortable: true,
                isFilterable: true
            },
            {
                forPropertyName: type === 'SENT' ? 'receiver' : 'sender',
                label: i18n( 'medidatalog-schema.MedidataLog_T.' + (type === 'SENT' ? 'receiver' : 'sender') ),
                title: i18n( 'medidatalog-schema.MedidataLog_T.' + (type === 'SENT' ? 'receiver' : 'sender') ),
                width: '4%',
                isSortable: true,
                isFilterable: true
            },
            {
                forPropertyName: 'invoiceNo',
                label: i18n( 'medidatalog-schema.MedidataLog_T.invoiceNo' ),
                title: i18n( 'medidatalog-schema.MedidataLog_T.invoiceNo' ),
                width: '5%',
                isSortable: true,
                isFilterable: true,
                renderer: function( meta ) {
                    var data = meta.row;
                    if( meta.value && data.activityId ) {
                        return Y.Lang.sub( '<a href="{href}" target="_blank">{text}</a>', {
                            text: meta.value,
                            href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/activity/' + data.activityId + "/section/documentform"
                        } );
                    } else if( meta.value ) {
                        return meta.value;
                    } else {
                        return null;
                    }

                }
            }
        ];
        var endColumns = [
            {
                forPropertyName: 'patientName',
                label: i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientName' ),
                title: i18n( 'InpacsLogMojit.tabInpacsLogOverview.patientName' ),
                width: '6%',
                isSortable: true,
                isFilterable: true,
                renderer: function( meta ) {
                    var data = meta.row;
                    if( meta.value && data.patientId ) {
                        return Y.Lang.sub( '<a href="{href}" target="_blank">{text}</a>', {
                            text: meta.value,
                            href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + data.patientId
                        } );
                    } else if( meta.value ) {
                        return meta.value;
                    } else {
                        return null;
                    }
                }
            }
        ];

        return {
            componentType: 'KoTable',
            componentConfig: {
                formRole: 'casefile-ko-insuite-table',
                stateId: 'MedidataLogMojit-'+ type.toLowerCase() +'Table',
                states: ['limit'],
                fillRowsToLimit: false,
                remote: true,
                proxy: Y.doccirrus.jsonrpc.api.medidatalog[type === 'SENT' ? 'read' : 'getLogs'],
                baseParams: {query: {type: type}},
                selectMode: 'none',
                columns: startColumns.concat( uniqueColumns ).concat( endColumns )
            }
        };
    }
    Y.namespace( 'doccirrus.medidatalog' ).utils = {
        constructMedidataLogTableConfig: constructMedidataLogTableConfig
    };

}, '0.0.1', {
    requires: [
        'oop',
        'dccommonutils',
        'dccommonerrors',
        'medidatalog-schema'
    ]
} );
