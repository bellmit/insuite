/*global YUI, ko, Promise */

'use strict';

YUI.add( 'selectpvsinsurance-modal', function( Y, NAME ) {
    var
        i18n = Y.doccirrus.i18n,
        WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_LARGE + 200,
        WINDOW_HEIGHT = 700,

        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable();

    function SelectPvsInsuranceModel( config ) {
        SelectPvsInsuranceModel.superclass.constructor.call( this, config );
    }

    Y.extend( SelectPvsInsuranceModel, Disposable, {

        insuranceProviders: null,
        insuranceProvidersTable: null,
        unspecifiedInsurance: null,

        initializer: function( options ) {
            var self = this;
            self.unspecifiedInsurance = ko.observable( true );
            self.unspecifiedInsuranceLabelI18n = i18n('FilterInvoiceItemsDialog.unspecifiedInsurance.label');
            self._initInsuranceProviders( options.insuranceProviders );
        },

        destructor: function() {
            var self = this;
            self.insuranceProviders.dispose();
            self.insuranceProviders = null;

            self.unspecifiedInsurance.dispose();
            self.unspecifiedInsurance = null;
        },

        _initInsuranceProviders: function( insuranceProviders ) {
            var self = this;

            var i;
            for( i = 0; i < insuranceProviders.length; i++ ) {
                //  enable all rows by default if they have an _id
                insuranceProviders[i].disabled = !(insuranceProviders[i]._id && true);
                //  check all rows by default
                insuranceProviders[i].checked = true;
            }

            self.insuranceProviders = ko.observableArray( insuranceProviders );

            //  TODO: fix table columns

            self.insuranceTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    scrollToTopOfTableWhenPaging: false,
                    data: self.insuranceProviders,
                    stateId: 'dc-pvslog-insurance-table',
                    states: ['limit'],
                    striped: false,
                    baseParams: {
                        sort: {
                            name: 1
                        }
                    },
                    limit: 5,
                    limitList: [5, 10, 20, 30, 40, 50],
                    columns: [
                        {
                            componentType: 'KoTableColumnLinked',
                            forPropertyName: 'linked',
                            label: '(x)',
                            visible: true,
                            isCheckBoxDisabledHook: function( /* data */ ) {
                                return false;
                            },
                            toggleLinkOfRowHook: function( link, data ) {
                                var
                                    columnLinked = this,
                                    isRowLinked = columnLinked.isLinked( link );

                                if( data.disabled ) {
                                    return false;
                                }

                                if( isRowLinked ) {
                                    columnLinked.removeLink( link );
                                    data.checked = false;
                                } else {
                                    columnLinked.addLink( link );
                                    data.checked = true;
                                }

                                return true;
                            },
                            toggleSelectAllHook: function( rows ) {
                                var
                                    columnLinked = this,
                                    addedIds = [],
                                    i;

                                //  link as a single batch to prevent multiple remap / rerender of forms
                                for( i = 0; i < rows.length; i++ ) {
                                    if( false === rows[i].disabled ) {
                                        addedIds.push( rows[i]._id );
                                        rows[i].checked = true;
                                    }
                                }

                                columnLinked.addLinks( addedIds );
                                return true;
                            },
                            toggleDeselectAllHook: function( rows ) {
                                var
                                    removedIds = [],
                                    columnLinked = this,
                                    i;

                                for( i = 0; i < rows.length; i++ ) {
                                    rows[i].checked = false;
                                    removedIds.push( rows[i]._id );
                                }

                                columnLinked.removeLinks( removedIds );
                                return true;
                            }
                        },
                        {
                            forPropertyName: 'name',
                            label: i18n( 'SelectPvsInsuranceDialog.table.INSURANCE_NAME' ),
                            title: i18n( 'SelectPvsInsuranceDialog.table.INSURANCE_NAME' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var row = meta.row;
                                //  prefer printName if available
                                if ( row.printName && '' !== row.printName ) { return row.printName; }
                                return meta.value;
                            }
                        },
                        {
                            forPropertyName: 'sumId',
                            label: i18n( 'SelectPvsInsuranceDialog.table.ACTIVITY_COUNT' ),
                            title: i18n( 'SelectPvsInsuranceDialog.table.ACTIVITY_COUNT' ),
                            width: '155px',
                            isSortable: true,
                            isFilterable: true
                        }
                    ]//,
                    //onRowClick: onTableRowClick
                }
            } );

            //  Set initial selections
            ko.ignoreDependencies( function() {
                var
                    componentColumnLinked = self.insuranceTable.getComponentColumnLinked(),
                    linkIds = [],
                    i;

                for( i = 0; i < insuranceProviders.length; i++ ) {
                    if( insuranceProviders[i].checked ) {
                        linkIds.push( insuranceProviders[i]._id );
                    }
                }

                componentColumnLinked.removeLinks();
                componentColumnLinked.addLinks( linkIds );
            } );

        },

        /**
         * Serializes this Model to a javascript object.
         * @method toJSON
         * @returns {Object}
         */

        toJSON: function() {
            var
                self = this,
                insuranceProviders = self.insuranceProviders(),
                jsonObj = [],
                i;

            for( i = 0; i < insuranceProviders.length; i++ ) {
                if( insuranceProviders[i].checked ) {
                    jsonObj.push( insuranceProviders[i] );
                }
            }

            return jsonObj;
        }

    } );

    /**
     *  Provides a dialog to select insurance providers to generate PVS logs for
     *
     *
     *  @method show
     *  @param  options                     {Object}
     *  @param  options.settings            {Object}    Date range
     *  @param  options.insuranceProviders  {Object}    Set of PVS insurance providers with open billable items
     *  @param  options.onInsuranceSelected {Function}  Called when user confirms insurance company selection
     *  @param  options.onCancelDialog      {Function}  Called when dialog is cancelled without confirming selection
     *
     *  @returns {Y.EventTarget}
     *  @for doccirrus.modals.filterInvoiceItems
     */

    function showSelectPvsInsuranceModal( options ) {
        if( !options || !options.insuranceProviders ) {
            Y.log( 'Cannot create modal, needs set of insurance providers to present to user.', 'warn', NAME );
            return;
        }

        if( options.insuranceProviders.length === 0 ) {
            options.onInsuranceSelected( options.insuranceProviders );
            return;
        }

        Promise
            .props( {
                modules: Y.doccirrus.utils.requireYuiModule( [
                    'node',
                    'JsonRpcReflection-doccirrus',
                    'JsonRpc',
                    'DCWindow'
                ] ),
                template: Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InvoiceMojit/views/SelectPvsInsuranceDialog'} )
                    .then( function( response ) {
                        return response.data;
                    } )
            } )
            .then( function( props ) {

                var
                    template = props.template,
                    bindings = new SelectPvsInsuranceModel( options ),
                    bodyContent = Y.Node.create( template ),
                    dialog = new Y.doccirrus.DCWindow( {
                        id: 'DCWindow-SelectPvsInsuranceDialog',
                        className: 'DCWindow-SelectPvsInsuranceDialog',
                        bodyContent: bodyContent,
                        title: i18n( 'SelectPvsInsuranceDialog.title' ),
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
                                    label: i18n( 'SelectPvsInsuranceDialog.buttons.CHOOSEINSURANCE.label' ),
                                    name: 'CHOOSEINSURANCE',
                                    value: 'CHOOSEINSURANCE',
                                    isDefault: true,
                                    action: onChooseInsurance
                                }
                            ]
                        },
                        after: {
                            visibleChange: onVisibilityChange
                        }
                    } );

                //  necessary to re-center after table node is added (similar to processNextTick)
                window.setTimeout( function() {
                    dialog.centered();
                }, 1 );

                /**
                 *  Raised when the CHOOSEINSURANCE button is clicked
                 *  @param e
                 */

                function onChooseInsurance( e ) {
                    var selectedProviders = bindings.toJSON();
                    if( 0 === selectedProviders.length ) {
                        return;
                    }

                    if( options.onInsuranceSelected ) {
                        options.onInsuranceSelected( selectedProviders, bindings.unspecifiedInsurance() );
                    }

                    dialog.close( e );
                }

                function onVisibilityChange( yEvent ) {
                    // also captures cancel for e.g.: ESC
                    if( !yEvent.newVal ) {
                        setTimeout( function() { // delay for letting others fire first
                            if( options.onCancelDialog ) {
                                options.onCancelDialog();
                            }

                            bindings.dispose();
                            ko.cleanNode( bodyContent.getDOMNode() );

                        }, 10 );
                    }
                }

                ko.applyBindings( bindings, bodyContent.getDOMNode() );
            } );
    }

    Y.namespace( 'doccirrus.modals' ).selectPvsInsurance = {
        show: showSelectPvsInsuranceModal
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
