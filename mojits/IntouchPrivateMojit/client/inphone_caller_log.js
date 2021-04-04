/**
 * User: pi
 * Date: 26/02/15  16:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global ko, moment */

import '../models/inphone-schema.common';
export default function( Y ) {
    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n;
    function CallerLogModel() {
        var self = this,
            pdfTitle = i18n( 'IntouchPrivateMojit.inphone_caller_log_listJS.pdfTitle' ),
            query = {};

        self.pageTitle = pdfTitle;

        self.callerLogKoTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                formRole: 'casefile-ko-inphone-table',
                pdfTitle: pdfTitle,
                stateId: 'dc-inphone-caller-log-kotable',
                states: ['limit'],
                fillRowsToLimit: false,
                remote: true,
                rowPopover: false,
                proxy: Y.doccirrus.jsonrpc.api.inphone.getForCallerLog,
                baseParams: {query: query},
                columns: [
                    {
                        forPropertyName: 'callTime',
                        label: 'Zeit',
                        isSortable: true,
                        isFilterable: true,
                        sortInitialIndex: 0,
                        direction: 'DESC',
                        queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                        renderer: function( meta ) {
                            var
                                value = meta.value;

                            if( value ) {
                                return moment( value ).format( 'DD.MM.YYYY, HH:mm' );
                            }
                            return '';
                        }
                    },
                    {
                        forPropertyName: 'callInfo',
                        label: i18n( 'IntouchPrivateMojit.inphone-schema.InPhone_T.callInfo.i18n' ),
                        isFilterable: true,
                        sortInitialIndex: 0,
                        renderer: function( meta ) {
                            var
                                value = meta.value;
                            return value;
                        }
                    },
                    {
                        forPropertyName: 'callerType',
                        label: i18n( 'IntouchPrivateMojit.inphone-schema.InPhone_T.callerType.i18n' ),
                        isSortable: true,
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: Y.doccirrus.schemas.inphone.types.CallerType_E.list,
                            optionsText: 'i18n',
                            optionsValue: 'val'
                        },
                        renderer: function( meta ) {
                            return Y.doccirrus.schemaloader.getEnumListTranslation( 'inphone', 'CallerType_E', meta.value, 'i18n', '' );
                        }
                    },
                    {
                        forPropertyName: 'callername',
                        label: i18n( 'IntouchPrivateMojit.inphone-schema.InPhone_T.callername.i18n' ),
                        isSortable: true,
                        isFilterable: true,
                        renderer: function( meta ) {
                            var
                                value = meta.value;
                            return value;
                        }
                    }
                ]
            }
        } );
    }

    return {
        registerNode: function( node, key, options ) {
            Y.use('inphone-schema', function() {
                ko.applyBindings( new CallerLogModel( options ), document.querySelector( '#callerTable' ) );
            });
        }
    };
}