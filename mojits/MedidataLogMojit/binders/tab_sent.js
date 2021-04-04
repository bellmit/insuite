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

    function TabSentViewModel( config ) {
        TabSentViewModel.superclass.constructor.call( this, config );
    }
    Y.extend( TabSentViewModel, Disposable, {
        initializer: function TabSentViewModel_initializer() {
            var
                self = this;

            self.sentTitleI18n = i18n( 'MedidataLogMojit.tab_sent.title' );
            self.requestStatusBtnI18n = i18n( 'MedidataLogMojit.buttons.requestStatus' );
            self.initSentTable();
            self.requestStatusEnabled = ko.observable( false );
            ko.computed( function() {
                var componentColumnCheckbox = self.sentTable.getComponentColumnCheckbox(),
                    selectedRows = componentColumnCheckbox.checked();

                self.requestStatusEnabled( selectedRows.length && selectedRows.every( function( row ) {
                    return row.status === 'PROCESSING';
                } ) );
            } );
        },
        sentTable: null,
        initSentTable: function() {
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
                        var value = meta.value || '';
                        if( !value ) {
                            return '-';
                        } else {
                            return '<a href="#">XML</a>';
                        }
                    }
                }
            ];

            var tableConfig = Y.doccirrus.medidatalog.utils.constructMedidataLogTableConfig( {
                uniqueColumns: uniqueColumns,
                type: 'SENT'
            } );
            self.sentTable =  KoComponentManager.createComponent( tableConfig );
        },
        getStatus: function() {
            var self = this,
                componentColumnCheckbox = self.sentTable.getComponentColumnCheckbox(),
                selectedRows = componentColumnCheckbox.checked(),
                rowsToAsk = selectedRows.filter( function( row ) {
                    return row.status !== 'DONE';
                } );

            Y.doccirrus.jsonrpc.api.medidatalog.getDocumentsStatus( {
                logs: rowsToAsk
            } ).done( function( ) {
                self.sentTable.reload();
            } ).fail( notice );
        }
    });

    viewModel = new TabSentViewModel();

    return {

        registerNode: function tab_overview_registerNode( node ) {

            ko.applyBindings( viewModel, node.getDOMNode() );
        },

        deregisterNode: function tab_overview_deregisterNode( node ) {

            ko.cleanNode( node.getDOMNode() );

        }
    };
}