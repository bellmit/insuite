/*jslint anon:true, nomen:true*/
/*global YUI, ko, _ */

YUI.add( 'dcSplitDeliveryItemDialog', function( Y ) {
        'use strict';
        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            KoViewModel = Y.doccirrus.KoViewModel,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            unwrap = ko.unwrap,
            cancelButtonI18n = i18n( 'DCWindow.BUTTONS.CANCEL' ),
            saveButtonI18n = i18n( 'DCWindow.BUTTONS.SAVE' ),
            modal;


        function SplitDeliveryModel( config ) {
            SplitDeliveryModel.superclass.constructor.call( this, config );
        }

        Y.extend( SplitDeliveryModel, KoViewModel.getDisposable(), {
            destructor: function() {
            },

            initializer: function( config ) {
                var
                    self = this;
                self.splitDialogLabeli18n = i18n('InStockMojit.splitDeliveryModal.selectedItem');
                self.stockLocationList = config.stockLocations;
                self.deliveryItem  = config.deliveryItem;
                self.splitToConfig = ko.observableArray([]);

                self.splitToConfig.push(new SplitTableViewModel({
                    data: {
                        stockLocation: _.find(self.stockLocationList, {_id: (unwrap(self.deliveryItem.stockLocation) || {})._id}),
                        quantityDelivered: unwrap(self.deliveryItem.quantityDelivered)
                    }
                }));

                self.showDeleteButtonRow = ko.observable(false);
                self.selectedLocationIds = [(unwrap(self.deliveryItem.stockLocation) || {})._id];

                self.initTable();
            },
            initTable: function(  ) {
                var
                    self = this;
                self.splitTable = KoComponentManager.createComponent( {
                    componentType: 'KoEditableTable',
                    componentConfig: {
                        stateId: 'splitDelivery-stockTable',
                        states: ['limit', 'usageShortcutsVisible'],
                        remote: false,
                        limitList: [6, 20, 30, 40, 50, 100],
                        data: self.splitToConfig,
                        responsive: false,
                        fillRowsToLimit: true,
                        ViewModel: SplitTableViewModel,
                        eventsToSubscribe: [
                            {
                                event: 'instockAction',
                                handlerId: 'stockTableHandlerId'
                            }],
                        baseParams: { },
                        columns: [
                            {
                                forPropertyName: 'quantityDelivered',
                                label: i18n( 'InStockMojit.instock_schema.Stocks_T.quantityDelivered' ),
                                title: i18n( 'InStockMojit.instock_schema.Stocks_T.quantityDelivered' ),
                                width: '50%',
                                isSortable: false,
                                isFilterable: false
                            },
                            {
                                forPropertyName: 'stockLocation',
                                label: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                title: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                width: '50%',
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        useSelect2Data: true,
                                        allowClear: true,
                                        placeholder: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                        select2Read: function( stockLocation ) {
                                            if( !stockLocation ) {
                                                return stockLocation;
                                            } else {
                                                return {
                                                    id: stockLocation._id,
                                                    text:  stockLocation.title || ""
                                                };
                                            }
                                        },
                                        select2Write: function( $event, observable ) {
                                            if ($event.removed) {
                                                _.remove( self.selectedLocationIds, function( id ) {
                                                    return id === $event.removed.id;
                                                } );
                                            }

                                            if (!$event.added) {
                                              return  observable({});
                                            }

                                            observable( {
                                                _id: $event.added.id,
                                                title: $event.added.text
                                            } );

                                            self.selectedLocationIds.push($event.added.id);
                                        },
                                        select2Config: {
                                            query: undefined,
                                            initSelection: undefined,

                                            data: function() {
                                                return {
                                                    results: (self.stockLocationList || [])
                                                        .filter(function( sl ) {
                                                            return self.selectedLocationIds.indexOf(sl._id) === -1;
                                                        })
                                                        .map(function( sl ) {
                                                        return {
                                                            id: sl._id,
                                                            text: sl.title
                                                        };
                                                    })
                                                };
                                            },
                                            multiple: false
                                        }
                                    }
                                },
                                renderer: function( meta ) {
                                    return (unwrap( meta.value ) || {}).title || "";
                                }
                            },
                            {
                                forPropertyName: 'deleteButton',
                                utilityColumn: true,
                                width: '60px',
                                css: {
                                    'text-center': 1
                                },
                                inputField: {
                                    componentType: 'KoButton',
                                    componentConfig: {
                                        name: 'delete',
                                        title: i18n( 'general.button.DELETE' ),
                                        icon: 'TRASH_O',
                                        visible: self.showDeleteButtonRow,
                                        click: function( button, $event, $context ) {
                                            var
                                                rowModel = $context.$parent.row;
                                            $context.$root.splitTable.removeRow( rowModel );
                                            self.splitToConfig.remove( rowModel );
                                            self.showDeleteButtonRow(unwrap(self.splitTable.rows).length !== 1);

                                            _.remove(self.selectedLocationIds, function( id ) {
                                                return id ===  (unwrap(rowModel.stockLocation) || {})._id;
                                            } );
                                        }
                                    }
                                }
                            }
                        ],
                        onAddButtonClick: function() {
                            self.splitTable.addRow({
                                         stockLocation: {},
                                         quantityDelivered: ""
                                });

                            self.showDeleteButtonRow(unwrap(self.splitTable.rows).length !== 1);
                            return false;
                        }
                    }
                });
            }
        } );

        function SplitDeliveryModal() {

        }

        SplitDeliveryModal.prototype.showDialog = function( data ) {
            function show() {
                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InStockMojit/views/SplitDeliveryItemDialog'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            splitDeliveryModel,
                            bodyContent = Y.Node.create( template );

                        splitDeliveryModel = new SplitDeliveryModel(data);

                        modal = new Y.doccirrus.DCWindow( {
                            bodyContent: bodyContent,
                            title: '',//i18n( 'InStockMojit.selectOrderModal.title.selectOrder' ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            maximizable: true,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            height: Y.doccirrus.DCWindow.SIZE_LARGE,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        label: cancelButtonI18n
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        label: saveButtonI18n,
                                        disabled: true,
                                        action: function() {
                                            data.callback(unwrap(splitDeliveryModel.splitTable.rows));
                                            modal.close();
                                        }

                                    } )
                                ]
                            }
                        } );

                        modal.set( 'focusOn', [] );

                        modal.after( 'visibleChange', function(  ) {
                            splitDeliveryModel.destroy();
                            modal = null;
                        } );

                        ko.applyBindings( splitDeliveryModel, bodyContent.getDOMNode() );
                    } ).catch( catchUnhandled );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).splitDeliveryItemDialog = new SplitDeliveryModal();


        /**
         * SplitConfigViewModel for KoEditableTable
         * @param config
         * @constructor
         */
        function SplitTableViewModel( config ) {
            SplitTableViewModel.superclass.constructor.call( this, config );
        }

        SplitTableViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( SplitTableViewModel, KoViewModel.getBase(), {
                initializer: function( ) {
                    var
                        self = this;

                    self.quantityDelivered.required = true;
                    self.stockLocation.hasError = ko.computed(function(){
                        var hasError = !(unwrap(self.stockLocation) || {})._id;
                        if (modal) {
                            modal.getButton('OK').set('disabled', hasError);
                        }
                        return hasError;
                    });

                    self.quantityDelivered.hasError = ko.computed({
                        write: function () {},
                        read: function () {
                            var  value = Number(unwrap(self.quantityDelivered)),
                                hasError = false;

                            if (unwrap(self.quantityDelivered) !== "0" && value === 0) {
                                hasError = true;
                            }

                            hasError = hasError || !self.quantityDelivered.validateNow().valid && !Y.Lang.isNumber(value) && !value >= 0;

                            if (modal) {
                                modal.getButton('OK').set('disabled', hasError);
                            }

                            return hasError;
                        }
                    });
                },
                destructor: function() {
                }
            },
            {
                schemaName: 'v_splitDeliveryItem',
                NAME: 'SplitTableViewModel'
            }
        );
        KoViewModel.registerConstructor( SplitTableViewModel );
    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'oop',
            'KoViewModel',
            'promise',
            'DCWindow',
            'instock-schema',
            'KoUI-all',
            'v_splitDeliveryItem-schema'
        ]
    }
);