/**
 * User: do
 * Date: 22/08/17  19:22
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

YUI.add( 'KvcMessageListModel', function( Y/*, NAME */ ) {

        function createMessageList() {

            function dateRenderer( meta ) {
                if( !meta.value ) {
                    return '';
                }
                return moment( meta.value ).format( 'DD.MM.YYYY<br>HH:mm:ss' );
            }

            function mapKbvLog( entry ) {
                return {
                    id: entry._id,
                    text: ['Q', entry.quarter, '/', entry.year, ' (V' + entry.version + ')', ' - ', entry.locname].join( '' ), // TODOOO kvc add more info so user can see version
                    data: entry
                };
            }

            var
                sentEnum = Y.doccirrus.schemas.kbvlog.sentEnumValues,
                peek = ko.utils.peekObservable,
                disableAll = ko.observable( false ),
                selectedMessage = ko.observable(),
                i18n = Y.doccirrus.i18n,
                AN_ERROR_OCCURRED = i18n( 'general.message.AN_ERROR_OCCURRED' ),
                SENT_AT = i18n( 'kvcmessage-schema.KVCMessage_T.sentAt.i18n' ),
                RECEIVED_AT = i18n( 'kvcmessage-schema.KVCMessage_T.receivedAt.i18n' ),
                FROM = i18n( 'kvcmessage-schema.KVCMessage_T.from.i18n' ),
                TO = i18n( 'kvcmessage-schema.KVCMessage_T.to.i18n' ),
                CONFIRMED = i18n( 'kvcmessage-schema.KVCMessage_T.confirmed.i18n' ),
                NOT_CONFIRMED = i18n( 'kvcmessage-schema.KVCMessage_T.notConfirmed.i18n' ),
                // SERVICE_TYPE = i18n( 'kvcmessage-schema.KVCMessage_T.kvcServiceType.i18n' ),
                MESSAGE_TYPE = i18n( 'kvcmessage-schema.KVCMessage_T.messageType.i18n' ),
                MESSAGE_STATUS = i18n( 'kvcmessage-schema.KVCMessage_T.messageStatus.i18n' ),
                SUBJECT = i18n( 'kvcmessage-schema.KVCMessage_T.subject.i18n' ),
                SERVERSTATUS = i18n( 'kvcmessage-schema.KVCMessage_T.serverStatus.i18n' ),
                ALL_SERVICES = i18n( 'KVConnectMojit.kvconnect.placeholder.ALL_SERVICES' ),
                ALL_AVAILABLE_INVOICES = i18n( 'KVConnectMojit.kvconnect.placeholder.ALL_AVAILABLE_INVOICES' ),
                // ATTACHMENTS = i18n( 'kvcmessage-schema.KVCMessage_T.attachments.i18n' ), use translateion for renderer?
                KoUI = Y.doccirrus.KoUI,
                KoComponentManager = KoUI.KoComponentManager,
                actionButtons, componentColumnCheckbox,

                nNewMsgs = ko.observable(),
                progress = {
                    show: ko.observable( false ),
                    percentage: ko.observable(),
                    text: ko.observable()
                },
                selectedKvcServiceType = ko.observable( null ),
                filterKbvLogs = ko.observableArray(),
                selectKbvLogsSelect2 = {
                    data: ko.computed( {
                        read: function() {
                            return filterKbvLogs();
                        },
                        write: function( $event ) {
                            var added = $event && $event.added,
                                removed = $event && $event.removed;

                            if( added ) {
                                filterKbvLogs.push( added );
                            }
                            if( removed ) {
                                filterKbvLogs.remove( removed );
                            }
                        }
                    } ),
                    select2: {
                        allowClear: false,
                        dropdownAutoWidth: true,
                        placeholder: ALL_AVAILABLE_INVOICES,
                        multiple: true,
                        query: function( query ) {
                            Y.doccirrus.jsonrpc.api.kbvlog.read( {
                                query: {
                                    $or: [
                                        {
                                            locname: {
                                                $regex: query.term,
                                                $options: 'i'
                                            }
                                        }],
                                    $and: [{sentId: {$ne: null}}, {sentId: {$ne: ''}}],
                                    status: {$in: sentEnum}
                                }
                            } ).done( function( response ) {
                                var data = response.data;
                                query.callback( {
                                    results: data.map( mapKbvLog )
                                } );
                            } );
                        }
                    }
                },
                kvcServiceTypeSelect2 = {
                    val: ko.computed( {
                        read: function() {
                            return selectedKvcServiceType();
                        },
                        write: function( event ) {
                            selectedKvcServiceType( event.val );
                        }
                    } ),
                    select2: {
                        placeholder: ALL_SERVICES,
                        allowClear: true,
                        data: Y.doccirrus.schemas.kvcmessage.types.KVCServiceType_E.list.map( function( entry ) {
                            return {id: entry.val, text: entry.i18n};
                        } )
                    }
                },

                messageListTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-kbvlogKvMessageListTable',
                        states: ['limit'],
                        striped: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.kvcmessage.read,
                        baseParams: ko.computed( function() {
                            var _selectedKvcServiceType = selectedKvcServiceType(),
                                selectedKbvLogIds = filterKbvLogs().map( function( entry ) {
                                    return entry.id;
                                } ),
                                query = {};

                            if( selectedKbvLogIds && selectedKbvLogIds.length ) {
                                query.kbvlogId = {$in: selectedKbvLogIds};
                            }

                            if( _selectedKvcServiceType ) {
                                query.kvcServiceType = _selectedKvcServiceType;
                            }

                            return {
                                query: query
                            };

                        } ),
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: '',
                                checkMode: 'multi',
                                allToggleVisible: true
                            },
                            {
                                forPropertyName: 'confirmed',
                                label: CONFIRMED,
                                title: CONFIRMED,
                                renderer: function( meta ) {
                                    if( 'SENT' === meta.row.messageType ) {
                                        return;
                                    }
                                    return true === meta.value ? '<div class="text-center"><span class="glyphicon glyphicon-ok"></span></div>' : '';
                                },
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_BOOL_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: [{val: true, i18n: CONFIRMED}, {val: false, i18n: NOT_CONFIRMED}],
                                    optionsText: 'i18n',
                                    optionsValue: 'val',
                                    select2Config: {
                                        multiple: false
                                    }
                                }
                            },
                            // TODO: with this enabled Dienst select 2 is not working
                            // {
                            //     forPropertyName: 'kvcServiceType',
                            //     label: SERVICE_TYPE,
                            //     title: SERVICE_TYPE,
                            //     renderer: function( meta ) {
                            //         return Y.doccirrus.schemaloader.translateEnumValue( '-de', meta.value, Y.doccirrus.schemas.kvcmessage.types.KVCServiceType_E.list, '' );
                            //     },
                            //     queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            //     filterField: {
                            //         componentType: 'KoFieldSelect2',
                            //         options: Y.doccirrus.schemas.kvcmessage.types.KVCServiceType_E.list,
                            //         optionsText: 'i18n',
                            //         optionsValue: 'val'
                            //     },
                            //     isSortable: true,
                            //     isFilterable: true
                            // },
                            {
                                forPropertyName: 'messageType',
                                label: MESSAGE_TYPE,
                                title: MESSAGE_TYPE,
                                renderer: function( meta ) {
                                    return Y.doccirrus.schemaloader.translateEnumValue( '-de', meta.value, Y.doccirrus.schemas.kvcmessage.types.KVCMessageType_E.list, '' ).replace( ' ', '<br>' );
                                },
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.kvcmessage.types.KVCMessageType_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'messageStatus',
                                label: MESSAGE_STATUS,
                                title: MESSAGE_STATUS,
                                renderer: function( meta ) {
                                    return Y.doccirrus.schemaloader.translateEnumValue( '-de', meta.value, Y.doccirrus.schemas.kvcmessage.types.KVCMessageStatus_E.list, '' );
                                },
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.kvcmessage.types.KVCMessageStatus_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'sentAt',
                                label: SENT_AT,
                                title: SENT_AT,
                                sortInitialIndex: 0,
                                renderer: dateRenderer,
                                isSortable: true,
                                isFilterable: true,
                                direction: 'DESC',
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR
                            },
                            {
                                forPropertyName: 'receivedAt',
                                label: RECEIVED_AT,
                                title: RECEIVED_AT,
                                renderer: dateRenderer,
                                isSortable: true,
                                isFilterable: true
                            },
                            { // TODOOO kvc add auto complete for all known mail adresses like from kbv catalog and kvc users (DocCirrus.3@kv-safenet.de)
                                forPropertyName: 'from',
                                label: FROM,
                                title: FROM,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                isFilterable: true
                            },
                            { // TODOOO kvc see above
                                forPropertyName: 'to',
                                label: TO,
                                title: TO,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                width: '40%',
                                forPropertyName: 'subject',
                                label: SUBJECT,
                                title: SUBJECT,
                                renderer: function( meta ) {
                                    var row = meta.row,
                                        postfix = row && row.attachments && row && row.attachments.length ? ' <span title="' + row.attachments.length + ' Anhäng(e)" class="glyphicon glyphicon-paperclip"></span>' : '';
                                    return meta.value + postfix;
                                },
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'serverStatus',
                                label: SERVERSTATUS,
                                title: SERVERSTATUS,
                                width: '100px',
                                renderer: function( meta ) {
                                    var classFromEnum,
                                        enumTranslation = Y.doccirrus.schemaloader.translateEnumValue( '-de', meta.value, Y.doccirrus.schemas.kvcmessage.types.KVCServerStatus_E.list, '' );
                                    switch( meta.value ) {
                                        case 'OK':
                                            classFromEnum = 'glyphicon glyphicon-remove-sign';
                                            break;
                                        // @deprecated
                                        case 'MARKED_FOR_DELETION':
                                            classFromEnum = 'fa fa-hourglass-half';
                                            break;
                                        case 'DELETED':
                                            classFromEnum = 'glyphicon glyphicon-ok-sign';
                                            break;
                                        default:
                                            return '';
                                    }
                                    return ['<div class="text-center"><span title="', enumTranslation, '" class="', classFromEnum, '"></span></div>'].join( '' );
                                },
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.kvcmessage.types.KVCServerStatus_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            }
                        ],
                        getCssRow: function( $context, css ) {
                            var row = $context.$data;

                            if( row && row._errors && row._errors.length ) {
                                css.danger = true;
                                css['text-danger'] = true;
                            } else if( 'PROCESSED' === row.messageStatus ) {
                                css.success = true;
                                css['text-success'] = true;
                            }
                        }
                    }
                } );

            componentColumnCheckbox = messageListTable.getComponentColumnCheckbox();

            actionButtons = Y.doccirrus.invoicelogutils.createActionButtonsViewModel( {
                fetch: {
                    action: function() {
                        // TODOOO add sio event that informs user about new messages
                        disableAll( true );
                        Promise.resolve( Y.doccirrus.jsonrpc.api.kvcmessage.fetchNewMessages() ).then( function( response ) {
                            var nMsgsFound = response && response.data && response.data.length;
                            // sys msg got x new msg are being processed
                            nNewMsgs( nMsgsFound || 0 );
                            if( nMsgsFound ) {
                                messageListTable.reload();
                            }
                        } ).catch( function( err ) {
                            if( err.code ) {
                                err = new Y.doccirrus.commonerrors.DCError( err.code );
                            }
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: err && err.message || AN_ERROR_OCCURRED
                            } );
                        } ).finally( function() {
                            disableAll( false );
                        } );
                    },
                    enabled: function( state ) {
                        if( state.selectedMessage ) {
                            return false;
                        }
                        if( state && state.disableAll ) {
                            return false;
                        }

                        return true;
                    },
                    visible: function( state ) {
                        return !Boolean( state.selectedMessage );
                    }
                },
                deleteFromServer: {
                    action: function() {
                    },
                    enabled: function( state ) {
                        if( state.selectedMessage ) {
                            return false;
                        }
                        return state.checked.some( function( row ) {
                            return 'OK' === row.serverStatus;
                        } );
                    },
                    visible: function( state ) {
                        return !Boolean( state.selectedMessage );
                    }
                },
                back: {
                    action: function() {
                        messageListTable.unSelect();
                    },
                    enabled: function( state ) {
                        return Boolean( state.selectedMessage );
                    },
                    visible: function( state ) {
                        return Boolean( state.selectedMessage );
                    }
                },
                confirm: {
                    action: function( vm ) {
                        var checked = vm.checked,
                            idsToConfirm = checked.filter( function( row ) {
                                return !row.confirmed;
                            } ).map( function( row ) {
                                return row._id;
                            } );
                        if( 0 === idsToConfirm.length ) {
                            return;
                        }
                        disableAll( true );
                        Promise.resolve( Y.doccirrus.jsonrpc.api.kvcmessage.confirm( {
                            kvcMessageIds: idsToConfirm
                        } ) ).then( function() {
                            messageListTable.reload();
                        } ).catch( function( err ) {
                            if( err.code && !err.message ) {
                                err = new Y.doccirrus.commonerrors.DCError( err.code );
                            }
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: err && err.message || AN_ERROR_OCCURRED
                            } );
                        } ).finally( function() {
                            disableAll( false );
                        } );
                    },
                    enabled: function( state ) {
                        if( state.selectedMessage ) {
                            return false;
                        }
                        return state.checked.some( function( row ) {
                            return !row.confirmed;
                        } );
                    },
                    visible: function( state ) {
                        return !Boolean( state.selectedMessage );
                    }
                }
            } );

            function setInvoiceFilter( kbvlogId ) {
                if( kbvlogId ) {
                    Y.doccirrus.jsonrpc.api.kbvlog.read( {
                        query: {
                            _id: kbvlogId
                        }
                    } ).done( function( response ) {
                        var err,
                            data = response.data;
                        if( data[0] ) {
                            filterKbvLogs.push( mapKbvLog( data[0] ) );
                        } else {
                            err = new Y.doccirrus.commonerrors.DCError( 2031 );
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: err.message || AN_ERROR_OCCURRED
                            } );
                        }
                    } ).fail( function( err ) {

                        if( err.code && !err.message ) {
                            err = new Y.doccirrus.commonerrors.DCError( err.code );
                        }
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: err && err.message || AN_ERROR_OCCURRED
                        } );

                    } );
                }
            }

            ko.computed( function() {
                var disAll = disableAll(),
                    _selectedMessage = selectedMessage(),
                    newState,
                    state = actionButtons.state(),
                    stateProp = {disableAll: disAll, checked: [], selectedMessage: _selectedMessage},
                    checkedRows = componentColumnCheckbox.checked();

                newState = state ? Object.assign( state, stateProp ) : actionButtons.state( stateProp );
                newState.checked = checkedRows;
                actionButtons.state( newState );
            } );

            messageListTable.selected.subscribe( function( selectedRows ) {

                var currentlySelectedMessage = peek( selectedMessage ),
                    messageData = selectedRows[0],
                    kvcMessageModel = messageData ? Y.doccirrus.KoViewModel.createViewModel( {
                            NAME: 'KvcMessageModel',
                            config: {data: messageData}
                        } )
                        : null;

                if( currentlySelectedMessage ) {
                    currentlySelectedMessage.destroy();
                }

                selectedMessage( kvcMessageModel );
            } );

            Y.doccirrus.communication.on( {
                event: 'kvcMessageAction',
                done: function( message ) {
                    var data = message && message.data && message.data[0],
                        level = data && data.level,
                        msg = data && data.message;
                    if( msg && level ) {
                        messageListTable.reload();
                        Y.doccirrus.DCSystemMessages.removeMessage( msg );
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            level: level,
                            messageId: msg,
                            content: msg
                        } );
                    }
                },
                handlerId: 'kvcMessageTable'
            } );

            Y.doccirrus.communication.on( {
                event: 'fetchKvcMessagesProgress',
                done: function( message ) {
                    var data = message.data && message.data[0];
                    if( !data ) {
                        return;
                    }
                    if( data.type === 'error' ) {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            level: 'ERROR',
                            messageId: data.message.messageId,
                            content: data.message
                        } );
                    } else if( data.type === 'progress' ) {
                        progress.show( data.nMessageHeaders > data.currentMessageHeaderIndex );
                        progress.percentage( data.percentage );
                        progress.text( data.kvcUsername + ' ' + data.currentMessageHeaderIndex + '/' + data.nMessageHeaders );
                    } else if( data.type === 'stats' ) {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            level: 'INFO',
                            content: i18n( 'InvoiceMojit.KvcMessageListModelJS.message.N_NEW_MESSAGES', {data: data} )
                        } );
                        progress.show( false );
                        progress.percentage( '' );
                        progress.text( '' );
                    }
                },
                handlerId: 'fetchKvcMessagesProgressHandler'
            } );

            return {
                selectedKvcServiceType: selectedKvcServiceType,
                nNewMsgs: nNewMsgs,
                actionButtons: actionButtons,
                messageListTable: messageListTable,
                selectedMessage: selectedMessage,
                kvcServiceTypeSelect2: kvcServiceTypeSelect2,
                selectKbvLogsSelect2: selectKbvLogsSelect2,
                setInvoiceFilter: setInvoiceFilter,
                progress: progress
            };
        }

        Y.namespace( 'doccirrus' ).KvcMessageListModel = {
            create: createMessageList
        };
    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'kbvlog-schema'
        ]
    }
);
