/**
 * User: do
 * Date: 02/03/15  14:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


'use strict';

/*global YUI, moment, ko, _ */

YUI.add( 'dcconflictstable', function( Y ) {
        var i18n = Y.doccirrus.i18n,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            peek = ko.utils.peekObservable,

            MODEL = i18n( 'kbvlog-schema.KBVErrorMap_T.model.i18n' ),
            OBJECTID = i18n( 'audit-schema.root.objId' ),
            TIMESTAMP = i18n('activity-schema.Activity_T.timestamp.i18n'),
            ERRORMESSAGE = i18n( 'kvcmessage-schema.KVCMessage_T._errors.i18n' ),
            PATIENTNAME = i18n( 'activity-schema.Activity_T.patientName.i18n' ),
            ACTIONS = i18n( 'UserMgmtMojit.transfer_conflicts.actions' ),
            APPLY = i18n( 'UserMgmtMojit.transfer_conflicts.applyChanges' ),
            DISCARD = i18n( 'UserMgmtMojit.transfer_conflicts.discardChanges' ),
            RETRY = i18n( 'UserMgmtMojit.transfer_conflicts.retryOperation' );

        function createTable( args ) {
            args = args || {};

            var
                collections = ['patient', 'activity', 'casefolder', 'employee', 'location', 'basecontact', 'calendar', 'schedule',
                    'scheduletype', 'document', 'media', 'formtemplate', 'formtemplateversion', 'marker', 'severity'].map( function(collection){
                   return {
                       val: collection,
                       i18n: Y.doccirrus.schemaloader.getEnumListTranslation( 'audit', 'ModelMeta_E', collection, 'i18n', 'Unbekannter Typ (' + collection + ')' )
                   };
                }),
                table = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-intouch-table',
                    pdfTitle: i18n( 'UserMgmtMojit.intouchAdmin.PARTNERS' ),
                    stateId: args.stateId || 'dc-partner-table',
                    states: ['limit'],
                    striped: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.receivedispatch.read,
                    baseParams: {
                        query: {status: {$in: [2, 3]}}
                    },
                    columns: [
                        {
                            forPropertyName: 'timestamp',
                            label: TIMESTAMP,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            renderer: function( meta ) {
                                var
                                    value = peek(meta.value);
                                if(!value){
                                    return '';
                                }
                                return moment( value ).format( i18n( 'general.TIMESTAMP_FORMAT_LONG' ) );
                            }
                        },
                        {
                            forPropertyName: 'entityName',
                            label: MODEL,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: collections,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            isSortable: true,
                            renderer: function( meta ) {
                                var
                                    value = peek(meta.value);
                                if(!value){
                                    return '';
                                }
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'audit', 'ModelMeta_E', value, 'i18n', 'Unbekannter Typ (' + value + ')' );
                            }
                        },
                        {
                            forPropertyName: 'errorMessage',
                            label: ERRORMESSAGE,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR,
                            isSortable: false,
                            renderer: function( meta ) {
                                var
                                    value = peek(meta.value);
                                if(!value){
                                    return '';
                                }
                                return value;
                            }
                        },
                        {
                            forPropertyName: 'entryId',
                            label: OBJECTID,
                            isFilterable: true,
                            isSortable: false,
                            onCellClick: function(){
                                return false;
                            },
                            renderer: function( meta ) {
                                var row = meta.row,
                                    url,
                                    value = peek(meta.value);

                                if(!value){
                                    return '';
                                }

                                switch( peek(row.entityName) ) {
                                    case 'activity':
                                        url = 'incase#/activity/' + value;
                                        break;
                                    case 'patient':
                                        url = 'incase#/patient/' + value;
                                        break;
                                    case 'casefolder':
                                        if( peek( row.doc && row.doc.patientId ) ){
                                            url = 'incase#/patient/' + row.doc.patientId + '/tab/casefile_browser/casefolder/' + value;
                                        }
                                        break;
                                    case 'basecontact':
                                        url = 'contacts#/' + value;
                                        break;
                                    case 'employee':
                                        url = 'admin/insuite#/employee/' + value;
                                        break;
                                    case 'location':
                                        url = 'admin/insuite#/location/' + value;
                                        break;
                                    case 'media':
                                        url = 'media/' + value;
                                        break;
                                    case 'calendar':
                                        url = '/admin/intime#/calendars';
                                        break;
                                    case 'scheduletype':
                                        url = '/admin/intime#/appointment-types';
                                        break;
                                    default:
                                        url = null;
                                }
                                if( url ){
                                    url = Y.doccirrus.infras.getPrivateURL( url );
                                    return '<a href="' + url + '" target="_blank">' + value + '</a>';
                                }
                                return value;
                            }
                        },
                        {
                            forPropertyName: 'patientName',
                            label: PATIENTNAME,
                            isFilterable: false,
                            isSortable: false,
                            onCellClick: function(){
                                return false;
                            },
                            renderer: function( meta ) {
                                var row = meta.row,
                                    value = peek(meta.value);

                                if(!value){
                                    return '';
                                }

                                if( row.patientId ){
                                    return '<a href="' + Y.doccirrus.infras.getPrivateURL( 'incase#/patient/' + row.patientId ) + '" target="_blank">' + value + '</a>';
                                }
                                return value;
                            }
                        },
                        {
                            label: ACTIONS,
                            title: ACTIONS,
                            isSortable: false,
                            isFilterable: false,
                            visible: true,
                            width: '300px',
                            onCellClick: function doAction( data, event ) {
                                if(event.target && event.target.name){
                                    Y.doccirrus.jsonrpc.api.receivedispatch.doAction( {
                                        data: {
                                            action: event.target.name,
                                            id: data.row && data.row._id
                                        }
                                    } )
                                        .done( function() {
                                            table.reload();
                                        } )
                                        .fail( function( error ) {
                                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                        } );
                                }
                                return false;
                            },
                            renderer: function( meta ) {
                                var row = meta.row;
                                if( row.status === 2 ) {
                                    return '<button name="applyChanges" type="button" class="btn btn-default btn-xs">' + APPLY + '</button>&nbsp;' +
                                           '<button name="discardChanges" type="button" class="btn btn-default btn-xs">' + DISCARD + '</button>';
                                } else if ( row.status === 3 ) {
                                    return '<button name="retryOperation" type="button" class="btn btn-default btn-xs">' + RETRY + '</button>';
                                }
                            }
                        }

                    ],
                    onRowClick: args.onRowClick || function() { return false; },
                    statI18n: i18n( 'UserMgmtMojit.transfer_conflicts.statistic' ),
                    getStat: function() {
                        Y.doccirrus.jsonrpc.api.activityTransfer.getTransferStats()
                            .done( function( response ) {
                                if(response && response.data){
                                    Y.doccirrus.DCWindow.notice( {
                                        window: {
                                            width: 'large'
                                        },
                                        message: (response.data || []).map( function(partner){
                                            var sortedStates = _.sortBy(partner.states || [], "_id.status");
                                            return '<b>' + partner._id.dcCustomerNo + '</b><ul>' +
                                                   (sortedStates).map( function(state){
                                                       return '<li>State:&nbsp;' + state._id.status +
                                                              '&nbsp;(&nbsp;' + i18n( "UserMgmtMojit.transfer_conflicts.statuses." + ( [0,1,2,3].indexOf(state._id.status) !== -1 ? state._id.status : 'other' ) )  + '&nbsp;)&nbsp;' +
                                                              '&nbsp;Min:&nbsp;' + state.minNo +
                                                              ';&nbsp;Max:&nbsp;' + state.maxNo + ';&nbsp;Count:&nbsp;' + state.count +
                                                              ';</li>';
                                                   }).join('') + '</ul>' ;
                                        }).join('')
                                    } );
                                }
                            } )
                            .fail( function( error ) {
                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            } );
                    }
                }
            } );

            return table;
        }

        Y.namespace( 'doccirrus.tables' ).createConflictTable = createTable;

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
