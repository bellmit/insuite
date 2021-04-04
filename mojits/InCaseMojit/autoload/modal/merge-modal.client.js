/**
 * User: clemens
 * Date: 2019-05-31  14:38
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'merge-modal', function( Y/*, NAME*/ ) {

        var
            peek = ko.utils.peekObservable,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;

        function createMergeData(self) {
            var currentActivity = peek( self.get( 'currentActivity' ) );

            return Promise.resolve( Y.doccirrus.jsonrpc.api.edmp.getMergeData( {
                actType: peek( currentActivity.actType ),
                patientId: peek( currentActivity.patientId ),
                caseFolderId: peek( currentActivity.caseFolderId ),
                timestamp: peek( currentActivity.timestamp )
            } ) ).get( 'data' );
        }
        function mergeData( data, self )  {
            var currentActivity = peek( self.get( 'currentActivity' ) );

            if( Array.isArray( data ) ) {
                data.forEach( function( entry ) {
                    if( currentActivity[entry.path] ) {
                        currentActivity[entry.path]( entry.value );
                    }
                } );
            }
            currentActivity.dmpNeedsMergeAcknowledgment( false );
            currentActivity.timestamp( (new Date()).toJSON() );
        }
        function showMergeDialog(self)  {

            function show( data ) {

                if( !data || !data.length ) {
                    return;
                }

                var
                    modal,
                    node = Y.Node.create( '<div></div>' );
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'edmp_merge_with_lastdoc',
                    'InCaseMojit',
                    {},
                    node,
                    function() {
                        var mergeTable = KoComponentManager.createComponent( {
                                componentType: 'KoTable',
                                componentConfig: {
                                    stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-mergeTable',
                                    renderFooter: false,
                                    states: ['limit'],
                                    limit: 50, // should be enough for all edmp types
                                    limitList: [50],
                                    striped: true,
                                    fillRowsToLimit: false,
                                    data: data,
                                    columns: [
                                        {
                                            componentType: 'KoTableColumnCheckbox',
                                            forPropertyName: 'checked',
                                            label: '',
                                            checkMode: 'multi',
                                            allToggleVisible: true
                                        },
                                        {
                                            forPropertyName: 'i18n',
                                            label: 'Feld',
                                            title: 'Feld',
                                            renderer: function( meta ) {
                                                return meta.value;
                                            }
                                        },
                                        {
                                            forPropertyName: 'valueDisplay',
                                            label: 'Wert',
                                            title: 'Wert',
                                            renderer: function( meta ) {
                                                var overridden = meta.row.overridden;
                                                return meta.value + (overridden ? ' <i class="dc-info-icon" title="Aus Medizindaten übernommen!"></i>' : '');
                                            }
                                        }
                                    ],
                                    onRowClick: function() {
                                        return false;
                                    }
                                }
                            } ),
                            componentColumnCheckbox = mergeTable.getComponentColumnCheckbox();

                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment-MergeWithLastDoc',
                            bodyContent: node,
                            title: 'Datenübernahme aus vorhergehender Dokumentation',
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        label: 'Quittieren',
                                        action: function() {
                                            var checkedData = componentColumnCheckbox.checked();
                                            mergeData( checkedData, self );
                                            modal.close();
                                        }
                                    } )
                                ]
                            }
                        } );

                        ko.applyBindings( {mergeTable: mergeTable}, node.getDOMNode().querySelector( '#mergeWithLastDocData' ) );
                    }
                );
            }

            if( !peek( self.dmpNeedsMergeAcknowledgment ) ) {
                return;
            }

            createMergeData(self).then( function( mergeData ) {
                show( mergeData );
            } ).catch( function( err ) {
                Y.log( 'could merge last doc into new doc ' + err, 'error');
            } );

        }

        Y.namespace( 'doccirrus.modals' ).mergeModal = {
            showMergeDialog: showMergeDialog
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);
