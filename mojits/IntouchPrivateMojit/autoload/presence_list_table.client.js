/**
 * User: do
 * Date: 03/03/15  15:16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*global YUI*/
YUI.add( 'dcpresencelisttable', function( Y ) {
        var i18n = Y.doccirrus.i18n,
            LASTNAME = i18n( 'IntouchPrivateMojit.presence_list_tableJS.title.LASTNAME' ),
            FIRSTNAME = i18n( 'IntouchPrivateMojit.presence_list_tableJS.title.FIRSTNAME' ),
            TYPE = i18n( 'IntouchPrivateMojit.presence_list_tableJS.title.TYPE' ),
            INSTITUTE = i18n( 'IntouchPrivateMojit.presence_list_tableJS.title.INSTITUTE' ),
            WEBRTC_ARE_NOT_SUPPORTED = i18n( 'IntouchPrivateMojit.presence_list_tableJS.title.WEBRTC_ARE_NOT_SUPPORTED' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;

        function createTable( args ) {
            args = args || {};
            var table = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-intouch-table',
                    pdfTitle: i18n( 'IntouchPrivateMojit.intouch_presence_listJS.pdfTitle' ),
                    stateId: args.stateId || 'dc-presence-list-table',
                    states: ['limit'],
                    fillRowsToLimit: ('boolean' === typeof args.fillRowsToLimit) ? args.fillRowsToLimit : true,
                    remote: true,
                    rowPopover: false,
                    baseParams: {query: args.query || {}},
                    proxy: Y.doccirrus.jsonrpc.api.telecommunication.getPresenceList,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'select',
                            label: ''
                        },
                        {
                            forPropertyName: 'lastname',
                            label: LASTNAME,
                            queryFilterType: Y.doccirrus.DCQuery.MONGO_IREGEX,
                            renderer: function( meta ){
                                var data = meta.row,
                                    exclamation = '';
                                if(!data.supportsWebRTC){
                                    exclamation = ' ' + '<i class="fa fa-exclamation dc-red" title="'+WEBRTC_ARE_NOT_SUPPORTED+'"></i>';
                                }
                                return meta.value + exclamation;
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'firstname',
                            label: FIRSTNAME,
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.MONGO_IREGEX,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'type',
                            label: TYPE,
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.employee.types.Employee_E.list,
                                optionsText: '-de',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var data = meta.row;
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'employee', 'Employee_E', data.type, '-de' );

                            }

                        },
                        {
                            forPropertyName: 'locationName',
                            label: INSTITUTE,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                allowValuesNotInOptions: true
                            },
                            isSortable: true
                        }
                    /**{
                            forPropertyName: 'online',
                            label: ONLINE,
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    rowData = meta.row,
                                    text = '';
                                text += rowData.onlineEmp && i18n( 'general.onlineStatus.ONLINE_EMP' ) || ' ';
                                text += rowData.onlinePat && i18n( 'general.onlineStatus.ONLINE_PAT' ) || ' ';
                                text += rowData.onlinePartner && i18n( 'general.onlineStatus.ONLINE_PARTNER' ) || ' ';
                                return text;
                            }

                        }*/
                    ]
                }
            } );

            Y.doccirrus.communication.on( {
                event: 'refreshPresenceTable',
                done: function( /*message*/ ) {
                    table.reload();
                }
            } );

            return table;
        }

        Y.namespace( 'doccirrus.tables' ).createPresenceListTable = createTable;

    },
    '0.0.1',
    {
        requires: [
            'JsonRpcReflection-doccirrus',
            'KoComponentManager',
            'KoTable'
        ]
    }
);
