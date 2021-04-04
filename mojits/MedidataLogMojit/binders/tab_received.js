/**
 * User: dcdev
 * Date: 2/4/21  2:35 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*jslint anon:true, sloppy:true, nomen:true*/
/*global ko */

/*exported _fn */
'use strict';

function _fn( Y ) {         //  eslint-disable-line
    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoComponentManager = KoUI.KoComponentManager,
        viewModel;

    function notice( err ) {
        return Y.doccirrus.DCWindow.notice( {
            message: Y.doccirrus.errorTable.getMessage( err )
        } );
    }

    function TabReceivedViewModel( config ) {
        TabReceivedViewModel.superclass.constructor.call( this, config );
    }
    Y.extend( TabReceivedViewModel, Disposable, {
        initializer: function TabReceivedViewModel_initializer() {
            var
                self = this;

            self.receivedTitleI18n = i18n( 'MedidataLogMojit.tab_received.title' );
            self.updateEntriesBtnI18n = i18n( 'MedidataLogMojit.buttons.updateEntries' );
            self.downloadDocumentsBtnI18n = i18n( 'MedidataLogMojit.buttons.downloadDocuments' );
            self.dateSelector = KoComponentManager.createComponent( {
                componentType: 'KoDateRangeSelector',
                componentConfig: {
                    switchMode: self.dateSelectorSwitchMode || 'quarter'
                }
            } );
            self.initReceivedTable();
            self.downloadDocumentsEnabled = ko.observable( false );
            ko.computed( function() {
                var componentColumnCheckbox = self.receivedTable.getComponentColumnCheckbox(),
                    selectedRows = componentColumnCheckbox.checked();

                self.downloadDocumentsEnabled( selectedRows.length && selectedRows.every( function( row ) {
                    return row.status !== 'UPLOADED';
                } ) );
            } );
        },
        receivedTable: null,
        initReceivedTable: function() {
            var self = this;
            var uniqueColumns = [
                {
                    forPropertyName: 'documentUrl',
                    label: i18n( 'MedidataLogMojit.columns.document' ),
                    title: i18n( 'MedidataLogMojit.columns.document' ),
                    width: '4%',
                    isSortable: true,
                    isFilterable: true,
                    renderer: function( meta ) {
                        var url = meta.value || '';
                        if( !url ) {
                            return '-';
                        } else {
                            url = Y.doccirrus.infras.getPrivateURL( url );
                            return '<a href="' + url +'">XML</a>';
                        }
                    }
                },
                {
                    forPropertyName: 'description',
                    label: i18n( 'medidatalog-schema.MedidataLog_T.description' ),
                    title: i18n( 'medidatalog-schema.MedidataLog_T.description' ),
                    width: '7%',
                    isFilterable: true
                }
            ];

            var tableConfig = Y.doccirrus.medidatalog.utils.constructMedidataLogTableConfig( {
                uniqueColumns: uniqueColumns,
                type: 'RECEIVED'
            } );
            self.receivedTable = KoComponentManager.createComponent( tableConfig );
        },
        obtainReferences: function() {
            var self = this;
                Y.doccirrus.jsonrpc.api.medidatalog.obtainDocumentReferences( {} )
                    .done( function( ) {
                        self.receivedTable.reload();
                    } )
                    .fail( notice );
        },
        downloadDocs: function() {
            var self = this,
                componentColumnCheckbox = self.receivedTable.getComponentColumnCheckbox(),
                selectedRows = componentColumnCheckbox.checked(),
                rowsToAsk = selectedRows.filter( function( row ) {
                    return row.status !== 'UPLOADED';
                } );

            Y.doccirrus.jsonrpc.api.medidatalog.downloadDocumentsFromMedidata( {
                logs: rowsToAsk
            } ).done( function() {
                self.receivedTable.reload();
            } ).fail( notice );
        }
    } );
    
    viewModel = new TabReceivedViewModel();

    return {

        registerNode: function tab_overview_registerNode( node ) {

            ko.applyBindings( viewModel, node.getDOMNode() );
        },

        deregisterNode: function tab_overview_deregisterNode( node ) {

            ko.cleanNode( node.getDOMNode() );

        }
    };
}