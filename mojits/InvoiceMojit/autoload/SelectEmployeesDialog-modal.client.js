/*global YUI, ko, Promise */

'use strict';

YUI.add( 'selectemployees-modal', function( Y ) {
    var
        i18n = Y.doccirrus.i18n,
        WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_LARGE + 200,
        WINDOW_HEIGHT = 700;

    function showSelectEmployeesModal( callback ) {

        var KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            employeeTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                baseParams: {
                    query: {
                        type: 'PHYSICIAN',
                        status: 'ACTIVE'
                    }
                },
                stateId: 'dc-pvslog-employee-table',
                states: ['limit'],
                remote: true,
                proxy: Y.doccirrus.jsonrpc.api.employee.read,
                limit: 5,
                limitList: [5, 10, 20, 30, 40, 50],
                scrollToTopOfTableWhenPaging: false,
                striped: false,
                columns: [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'checked',
                        label: '',
                        checkMode: 'multi',
                        allToggleVisible: false
                    },
                    {
                        forPropertyName: 'lastname',
                        label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.SURNAME' ),
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'firstname',
                        label: i18n( 'InSuiteAdminMojit.tab_employees.employeesTable.label.FORENAME' ),
                        isSortable: true,
                        isFilterable: true
                    }
                ]
            }
        } ),
            componentColumnCheckbox = employeeTable.getComponentColumnCheckbox();

        Promise
            .props( {
                modules: Y.doccirrus.utils.requireYuiModule( [
                    'node',
                    'JsonRpcReflection-doccirrus',
                    'JsonRpc',
                    'DCWindow'
                ] ),
                template: Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InvoiceMojit/views/SelectEmployeesDialog'} )
                    .then( function( response ) {
                        return response.data;
                    } )
            } )
            .then( function( props ) {
                var
                    template = props.template,
                    bindings = {employeeTable: employeeTable},
                    bodyContent = Y.Node.create( template ),
                    dialog = new Y.doccirrus.DCWindow( {
                        id: 'DCWindow-SelectEmployeesDialog',
                        className: 'DCWindow-SelectEmployeesDialog',
                        bodyContent: bodyContent,
                        title: i18n( 'SelectEmployeesDialog.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_INFO,

                        width: WINDOW_SIZE,
                        minHeight: WINDOW_HEIGHT,
                        minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,

                        maximizable: true,
                        centered: true,
                        modal: true,

                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                {
                                    label: i18n( 'SelectLocationsDialog.buttons.CHOOSELOCATIONS.label' ),
                                    isDefault: true,
                                    action: function() {
                                        var selectedRows = componentColumnCheckbox.checked();
                                        dialog.close();
                                        callback( selectedRows.length ? selectedRows : null );
                                    }
                                }
                            ]
                        }
                    } );

                //  necessary to re-center after table node is added (similar to processNextTick)
                window.setTimeout( function() { dialog.centered(); }, 1 );



                ko.applyBindings( bindings, bodyContent.getDOMNode() );
            } );
    }

    Y.namespace( 'doccirrus.modals' ).selecEmployees = {
        show: showSelectEmployeesModal
    };

}, '0.0.1', {
    requires: [
        'oop',
        'event-custom',
        'doccirrus',
        'dcutils',
        'KoViewModel'
    ]
} );
