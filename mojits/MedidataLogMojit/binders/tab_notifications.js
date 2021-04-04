/**
 * User: dcdev
 * Date: 2/4/21  2:36 PM
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

    function TabNotificationsViewModel( config ) {
        TabNotificationsViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( TabNotificationsViewModel, Disposable, {
        initializer: function TabNotificationsViewModel_initializer() {
            var
                self = this;

            self.requestNotificationsBtnI18n = i18n( 'MedidataLogMojit.buttons.requestNotifications' );
            self.confirmBtnI18n = i18n( 'MedidataLogMojit.buttons.confirm' );
            self.dateSelector = KoComponentManager.createComponent( {
                componentType: 'KoDateRangeSelector',
                componentConfig: {
                    switchMode: 'quarter'
                }
            } );
            self.initNotificationsTable();
            self.confirmEnabled = ko.observable( false );
            ko.computed( function() {
                var componentColumnCheckbox = self.notificationsTable.getComponentColumnCheckbox(),
                    selectedRows = componentColumnCheckbox.checked();

                self.confirmEnabled( selectedRows.length && selectedRows.every( function( row ) {
                    return row.status !== 'CONFIRMED';
                } ) );
            } );
        },
        notificationsTable: null,
        initNotificationsTable: function() {
            var self = this;
            var uniqueColumns = [
                {
                    forPropertyName: 'subject',
                    label: i18n( 'medidatalog-schema.MedidataLog_T.subject' ),
                    title: i18n( 'medidatalog-schema.MedidataLog_T.subject' ),
                    width: '8%',
                    isFilterable: true
                },
                {
                    forPropertyName: 'description',
                    label: i18n( 'medidatalog-schema.MedidataLog_T.description' ),
                    title: i18n( 'medidatalog-schema.MedidataLog_T.description' ),
                    width: '10%',
                    isFilterable: true
                },
                {
                    forPropertyName: 'technicalInfo',
                    label: i18n( 'medidatalog-schema.MedidataLog_T.technicalInfo' ),
                    title: i18n( 'medidatalog-schema.MedidataLog_T.technicalInfo' ),
                    width: '10%',
                    isFilterable: true
                }
            ];

            var tableConfig = Y.doccirrus.medidatalog.utils.constructMedidataLogTableConfig( {
                uniqueColumns: uniqueColumns,
                type: 'NOTIFICATION'
            } );
            self.notificationsTable = KoComponentManager.createComponent( tableConfig );
        },
        fetchNotificationsFromMedidata: function() {
            var self = this,
                endDate = self.dateSelector.endDate(),
                startDate = self.dateSelector.startDate();

            Y.doccirrus.jsonrpc.api.medidatalog.fetchNotificationsFromMedidata( {
                endDate: endDate,
                startDate: startDate
            } ).done( function( ) {
                self.notificationsTable.reload();
            } ).fail( notice );
        },
        confirmNotifications: function() {
            var self = this,
                componentColumnCheckbox = self.notificationsTable.getComponentColumnCheckbox(),
                selectedRows = componentColumnCheckbox.checked(),
                rowsToConfirm = selectedRows.filter( function( row ) {
                    return row.status === 'UNCONFIRMED';
                } );

            Y.doccirrus.jsonrpc.api.medidatalog.confirmReceipt( {
                logs: rowsToConfirm,
                type: 'NOTIFICATION'
            } ).done( function( result ) {
                var data = result.data || {};

                if( data.errors && data.errors.length ) {
                    data.errors.map(function( error ) {
                        notice( error.error );
                    } );
                }
                self.notificationsTable.reload();
                //todo: handle result
            } ).fail( notice );
        }
    } );

    viewModel = new TabNotificationsViewModel();

    return {

        registerNode: function tab_overview_registerNode( node ) {

            ko.applyBindings( viewModel, node.getDOMNode() );
        },

        deregisterNode: function tab_overview_deregisterNode( node ) {

            ko.cleanNode( node.getDOMNode() );

        }
    };
}