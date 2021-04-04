/*jslint anon:true, sloppy:true, moment:true*/
/*global fun:true,ko, moment */
/*exported fun */

fun = function _fn( Y ) {
    'use strict';

    return {

        registerNode: function() {
            var
                auditLogTable,
                lang = 'i18n',
                fields = Y.doccirrus.schemas.audit.types.root,
                i18n = Y.doccirrus.i18n,
                DCPRC = i18n( 'MISMojit.tab_connectivity.text.DCPRC' ),
                PUC = i18n( 'MISMojit.tab_connectivity.text.PUC' ),
                KoComponentManager = Y.doccirrus.KoUI.KoComponentManager;

            auditLogTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-insuite-table',
                    pdfTitle: i18n( 'InSuiteAdminMojit.tab_auditlog.pdfTitle' ),
                    stateId: 'dc-audit-table',
                    striped: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.audit.getForAuditBrowser,
                    columns: [
                        {
                            forPropertyName: 'timestamp',
                            label: fields.timestamp[lang],
                            width: '12%',
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            renderer: function( item ) {
                                return moment( item.value ).format( 'DD.MM.YYYY (HH:mm:ss)' );
                            }
                        },
                        {
                            forPropertyName: 'user',
                            label: fields.user[lang],
                            width: '13%',
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'action',
                            label: fields.action[lang],
                            width: '7%',
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.audit.types.Action_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            isSortable: true,
                            renderer: function( item ) {
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'audit', 'Action_E', item.value, 'i18n', 'Unbekannter Typ' );
                            }
                        },
                        {
                            forPropertyName: 'model',
                            label: fields.model[lang],
                            width: '10%',
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.audit.types.ModelMeta_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            isSortable: true,
                            renderer: function( item ) {
                                var
                                    action = ko.unwrap( item.row.action ),
                                    objId = ko.unwrap( item.row.objId ),
                                    text = Y.doccirrus.schemaloader.getEnumListTranslation( 'audit', 'ModelMeta_E', item.value, 'i18n', 'Unbekannter Typ' ),
                                    link,
                                    result;
                                if( action === "print" && objId) {
                                    link = '<a target="_blank" href="/incase#/activity/' + objId +'" title="" style="display: inline-block; width: 100%">' + text + '</a>';
                                }
                                result = link ? link : text;
                                return result;
                            }
                        },
                        {
                            forPropertyName: 'descr',
                            label: fields.descr[lang],
                            width: '40%',
                            isFilterable: true,
                            renderer: function( item ) {
                                if( 'dcprcconnection' === item.row.model ) {
                                    return DCPRC + Y.doccirrus.schemaloader.getEnumListTranslation( 'audit', 'Status_E', item.value, 'i18n', '' );
                                }
                                if( 'pucconnection' === item.row.model ) {
                                    return PUC + Y.doccirrus.schemaloader.getEnumListTranslation( 'audit', 'Status_E', item.value, 'i18n', '' );
                                }
                                if( item.row.relatedActivities && item.row.relatedActivities[0] ) {
                                    return item.value + ', ' + Y.doccirrus.modals.auditDiffDialog.renderRelatedActivities( item.row );
                                } else {
                                    return item.value;
                                }
                            }
                        },
                        {
                            forPropertyName: 'ip',
                            width: '6%',
                            label: i18n( 'auth-schema.root.ip' ),
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'objId',
                            width: '12%',
                            label: i18n( 'audit-schema.root.objId' ),
                            isFilterable: true,
                            visible: false
                        }
                    ],
                    selectMode: 'none',
                    onRowClick: function( meta ) {
                        var data = meta.row;
                        Y.doccirrus.modals.auditDiffDialog.show( data );
                    }
                }
            } );

            ko.applyBindings( {
                auditLogTable: auditLogTable
            }, document.querySelector( '#auditLogBrowser' ) );
        },

        deregisterNode: function() {

        }
    };
};
