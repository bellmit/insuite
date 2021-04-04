/**
 * User: do
 * Date: 02/03/15  14:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


'use strict';

/*global YUI */

YUI.add( 'dcpartnertable', function( Y ) {
        var i18n = Y.doccirrus.i18n,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,

            NAME = i18n( 'partner-schema.Partner_T.NAME' ),
            PARTNERTYPE = i18n( 'partner-schema.PartnerType_E.i18n' ),
            COMMENT = i18n( 'partner-schema.Partner_T.COMMENT' ),
            STATUS = i18n( 'partner-schema.Partner_T.STATUS' );

        function createTable( args ) {
            args = args || {};

            var
                method = (args.transferTo) ? 'getForManualTransfer' : 'read',
                proxy = function( params ) {
                    if( args.query ){
                        if( !params.query ){
                            params.query = args.query;
                        } else {
                            params.query = Y.mix( params.query, args.query );
                        }
                    }
                    return Y.doccirrus.jsonrpc.api.partner[method]( params ).done( function( result ){
                        result.data = (result.data || []).filter( function( el ){
                            var
                                licenseType = 'INCARE' === el.systemType ? 'CARE' : 'DSCK' === el.systemType ? el.dcId : el.systemType,
                                shouldDisplayPartnerBecauseOfSystemType = el.systemType &&
                                  ( Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds[licenseType] ) ||
                                    Y.doccirrus.auth.hasAdditionalService( Y.doccirrus.schemas.settings.additionalServiceKinds[licenseType] ));

                            return 'LICENSED' !== el.status || shouldDisplayPartnerBecauseOfSystemType;
                        } );
                        return result;
                    } );
                },
                baseParams = { sort: { name: 1 } };

            if(args.transferTo){
                baseParams = { activityIds: args.activityIds };
            }

            var table = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-intouch-table',
                    pdfTitle: i18n( 'UserMgmtMojit.intouchAdmin.PARTNERS' ),
                    stateId: args.stateId || 'dc-partner-table',
                    states: ['limit'],
                    striped: false,
                    remote: true,
                    proxy: proxy,
                    baseParams: baseParams,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkMode: 'multi',
                            allToggleVisible: false
                        },
                        {
                            forPropertyName: 'name',
                            label: NAME,
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'partnerType',
                            label: PARTNERTYPE,
                            renderer: function( meta ) {
                                var
                                    partnerType = meta.value;

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'partner', 'PartnerType_E', partnerType, 'i18n', 'k.A.' );
                            },
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.partner.types.PartnerType_E.list,
                                optionsCaption: '',
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            isSortable: true
                        },
                        {
                            forPropertyName: 'comment',
                            label: COMMENT,
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'status',
                            label: STATUS,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.partner.types.Status_E.list,
                                optionsCaption: '',
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            isSortable: true,
                            renderer: function( meta ) {
                                var
                                    val = meta.value;
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'partner', 'Status_E', val, 'i18n', 'k.A.' );
                            }
                        }
                    ],
                    onRowClick: args.onRowClick || function() {
                        return false;
                    }
                }
            } );

            return table;
        }

        Y.namespace( 'doccirrus.tables' ).createPartnerTable = createTable;

    },
    '0.0.1',
    {
        requires: [
            'JsonRpcReflection-doccirrus',
            'KoUI-all',
            'KoViewModel'
        ]
    }
);
