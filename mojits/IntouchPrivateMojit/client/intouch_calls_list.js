/**
 * User: pi
 * Date: 05/03/15  15:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global ko, moment */

import '../../DocCirrus/autoload/dcquery.common';
import '../../../autoload/KoUI/KoTable/KoTable.client';

export default function( Y ) {
    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n,
        CALLS = i18n( 'IntouchPrivateMojit.intouch_calls_listJS.title.CALLS' ),
        MISSED_CALLS = i18n( 'IntouchPrivateMojit.intouch_calls_listJS.title.MISSED_CALLS' );

    function CallsListModel( options ) {
        var self = this,
            columns,
            missedCalls = ('rejected' === options.state) ? true : false,
            pdfTitleMissed = i18n( 'IntouchPrivateMojit.intouch_calls_listJS.title.MISSED_CALLS' ),
            pdfTitleCalls = i18n( 'IntouchPrivateMojit.intouch_calls_listJS.title.CALLS' ),
            pdfTitle = missedCalls ? pdfTitleMissed : pdfTitleCalls,
            query = {};

        options = options || {};
        self.pageTitle = missedCalls ? MISSED_CALLS : CALLS;

        // return the list of all OTHER participants
        function getParticipantList( callAudit ) {
            var
                callee = callAudit.callee,
                caller = callAudit.caller[ 0 ],
                participants = [ caller ].concat( callee ),
                type,
                text = '';

            Y.Array.each( participants, function( item ) {
                if( item.identityId !== callAudit.identityId ) { // if not myself
                    type = Y.doccirrus.schemaloader.getEnumListTranslation( 'employee', 'Employee_E', item.type, '-de' );
                    text += item.lastname + ', ' + item.firstname + ', ' + type + ', ' + item.locationName + '\n';
                }
            } );
            return text;
        }

        function withToolTipText( value, data ) {
            if( missedCalls ) {
                return value;
            } else {
                return '<span title="' + getParticipantList( data ) + '">' + value + '</span>';
            }
        }

        if( missedCalls ) {
            query.picked = { $ne: true }; // not picked
        } else {
            query.picked = true;
        }

        columns = [
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
                forPropertyName: 'lastname',
                label: 'Nachname',
                isSortable: true,
                isFilterable: true,
                renderer: function( meta ) {
                    var
                        value = meta.value;

                    return withToolTipText( value, meta.row );
                }
            },
            {
                forPropertyName: 'firstname',
                label: 'Vorname',
                isSortable: true,
                isFilterable: true,
                renderer: function( meta ) {
                    var
                        value = meta.value;

                    return withToolTipText( value, meta.row );
                }
            },
            {
                forPropertyName: 'type',
                label: 'Typ',
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
                    var data = meta.value,
                        typeName = Y.doccirrus.schemaloader.getEnumListTranslation( 'employee', 'Employee_E', data, '-de' );
                    return withToolTipText( typeName, meta.row );
                }
            },
            {
                forPropertyName: 'reason',
                label: 'Grund',
                isFilterable: true,
                isSortable: true
            }
        ];

        if( missedCalls ) {
            columns.splice( 4, 0,
                {
                    forPropertyName: 'caller.0.locationName',
                    label: 'Einrichtung',
                    isSortable: true,
                    isFilterable: true
                }
            );
        } else {
            columns.splice( 4, 0,
                {
                    forPropertyName: 'duration',
                    label: 'Dauer',
                    isSortable: true,
                    isFilterable: true,
                    renderer: function( meta ) {
                        var
                            duration = meta.value || 0;
                        return moment.utc( duration ).format( "HH:mm:ss" );
                    }
                }
            );
            columns.push( {
                    forPropertyName: 'consultNote',
                    label: 'Notiz',
                    isFilterable: true,
                    isSortable: true,
                    renderer: function( meta ) {
                        var
                            text = meta.value || '';

                        text = text && (text.substr( 0, 20 ) + '...');
                        return '<span title="' + meta.value + '">' + text + '</span>';
                    }
                }
            );
        }

        self.callsKoTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                formRole: 'casefile-ko-intouch-table',
                pdfTitle: pdfTitle,
                stateId: 'dc-intouch-calls-kotable',
                states: [ 'limit' ],
                fillRowsToLimit: false,
                remote: true,
                rowPopover: false,
                proxy: Y.doccirrus.jsonrpc.api.callaudit.read,
                baseParams: { query: query },
                columns: columns
            }
        } );
    }

    return {
        registerNode: function( node, key, options ) {
            Y.use( [ 'dcquery', 'KoTable' ], () => {
                ko.applyBindings( new CallsListModel( options ), document.querySelector( '#callsList' ) );
            } );
        }
    };
}