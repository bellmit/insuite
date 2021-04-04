/*jslint anon:true, nomen:true*/
/*global YUI, ko, async, moment */

YUI.add( 'dcdispensingmodal', function( Y ) {
        'use strict';
        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            KoViewModel = Y.doccirrus.KoViewModel,
            cancelButtonI18n = i18n( 'DCWindow.BUTTONS.CANCEL' ),
            OP = i18n('InStockMojit.instock_schema.InStock_T.OP'),
            TP = i18n('InStockMojit.instock_schema.InStock_T.TP'),
            unwrap = ko.unwrap,
            modal;

        function DispensingModalModel( config ) {
            DispensingModalModel.superclass.constructor.call( this, config );
        }

        Y.extend( DispensingModalModel, KoViewModel.getDisposable(), {
            destructor: function() {
            },

            initializer: function() {
                var
                    self = this;
                self.allWares = [];
                self.wareLocations = {};
                self.phPZNLocation = {};
                self.selectedOrderId = null;
                self.waresToOrder = [];
                self.actions = [];
                self.initObservables();
                self.initLabes();

                self.initWare();

            },
            initLabes: function() {
                var
                    self = this;
                self.stockLocationI18n = i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' );
                self.canNotReverseActionI18n = i18n( 'InCaseMojit.DispensingModal.canNotReverseAction' );
                self.medicationWillOrderedI18n = i18n( 'InCaseMojit.DispensingModal.medicationWillOrdered' );
                self.openOrdersI18n = i18n( 'InCaseMojit.DispensingModal.openOrders' );
                self.printLabelI18n = i18n( 'InCaseMojit.DispensingModal.printLabel' );
                self.orderListI18n = i18n( 'InCaseMojit.DispensingModal.orderList' );
                self.selectedSupplierI18n = i18n( 'InStockMojit.instock_schema.StockSuppliers_T.supplier' );
                self.groupedMedications = {};
            },
            initObservables: function() {
                var self = this;
                self.noItems = ko.observable( true );
                self.showMedication = ko.observable( false );
                self.title = ko.observable( "" );
                self.printLabel = ko.observable( true );
                self.ordersTable = ko.observable( null );
                self.medicationsTable = ko.observable( null );
                self.newOrder = ko.observable( false );
                self.description = ko.observable( "" );
            },
            getActKey: function( act ) {
                return [(unwrap( act.s_extra ) || {}).stockLocationId, act.phPZN, !!unwrap( act.isDivisible ), !!unwrap( act.order ), unwrap( act.canBeDispensed )].join( "_" );
            },
            initWare: function() {
                var
                    self = this,
                    phPZNs = self.get( 'phPZNs' ),
                    locationId = self.get( 'locationId' ),
                    activities = self.get( 'activities' ),
                    inStockWares = [];
                self.orders = [];

                async.series( [getWares, getOrders, createEmptyOrder], onAllDone );

                function getWares( itcb ) {
                    Y.doccirrus.jsonrpc.api.instockrequest.getWares( {
                        query: {
                            $and: [
                                {
                                    phPZN: {$in: phPZNs}
                                },
                                {
                                    locationId: locationId
                                }
                            ]
                        }
                    } )
                        .done( function( response ) {
                            inStockWares = response.data;
                            itcb();
                        } )
                        .fail( function( err ) {
                            itcb( err );
                        } );
                }

                function getOrders( itcb ) {
                    Y.doccirrus.jsonrpc.api.stockordersrequest.getOrders( {
                        query: getOrderQuery( locationId )
                    } ).done( function( response ) {
                        self.orders = response.results || response.data || response;
                        itcb();

                    } ).fail( function( err ) {
                        itcb( err );
                    } );
                }

                function createEmptyOrder( itcb ) {
                    if( !self.orders.length ) {
                        Y.doccirrus.jsonrpc.api.stockordersrequest.createEmptyOrder( {
                            data: {locationId: locationId}
                        } ).done( function( response ) {
                            self.orders = response.results || response.data || response;
                            itcb();
                        } ).fail( function( err ) {
                            itcb( err );
                        } );
                    } else {
                        itcb();
                    }
                }

                function getOrderQuery( locationId ) {
                    return {
                        $and: [
                            {"locationId": locationId},
                            {"status": "created"},
                            { "dateCreated": {
                                "$gte": moment().startOf( 'day' ).toDate(),
                                "$lte": moment().endOf('day').toDate()
                            }
                            }
                        ],
                        convertToObjectIdConfig: [["$and", 0, "locationId"]]
                    };
                }

                function onAllDone( err ) {
                    if( err ) {
                        return handleResponseError( err );
                    }

                    var
                        phPZNsCount = {};

                    activities.forEach( function( act ) {
                        var key = self.getActKey( act );
                        phPZNsCount[key] = phPZNsCount[key] ? phPZNsCount[key] + 1 : 1;
                    } );

                    /*Merge instock and activity data*/
                    activities.forEach( function( activity ) {
                        var inStockWare = inStockWares.find( function( ware ) {
                                return ware.phPZN === unwrap( activity.phPZN ) && ware.stockLocationId === (unwrap( activity.s_extra ) || {}).stockLocationId;
                            } ),
                            reduceCount = 0;

                        if( inStockWare ) {
                            inStockWare.stockItemId = inStockWare._id;
                            delete inStockWare._id;

                            reduceCount = Y.doccirrus.schemas.instock.calculateReduceCount( activity, phPZNsCount[self.getActKey( activity )] );
                            delete inStockWare.editor;
                            /*Check if are enough medications in stocklocation*/
                            if (reduceCount > inStockWare.quantity && inStockWare.quantity !==0 ){
                                phPZNsCount[self.getActKey( activity )]--;
                                activity = Object.assign( activity, inStockWare, {order: self.orders[0]}, {canBeDispensed: false} );
                            } else if( reduceCount > inStockWare.quantity  ) {
                                activity = Object.assign( activity, inStockWare, {order: self.orders[0]}, {canBeDispensed: false} );
                            } else {
                                activity = Object.assign( activity, inStockWare, {canBeDispensed: true} );
                            }
                        } else {
                            activity = Object.assign( activity, {order: self.orders[0]} );
                        }

                        if( modal && modal.getButton( 'OK' )) {
                            modal.getButton( 'OK' ).button.enable();
                        }
                    } );

                    self.showMedication( true );

                    showMedications( activities );

                    function showMedications( activities ) {
                        var
                            data = [],
                            key,
                            ware,
                            phSalePrice;
                        /*Grouping medications for getting count of each phPZN for each stockLocation*/
                        self.groupedMedications = groupByStockLocationAndPhPZN( activities );

                        for( key in self.groupedMedications ) {
                            if( self.groupedMedications.hasOwnProperty( key ) ) {
                                ware = self.groupedMedications[key][0];
                                if( !isNaN( ware.phPackSize ) && !isNaN( ware.phPriceSale ) ) {
                                    if( Number( ware.phPackSize ) === 0 && ware.isDivisible ) {
                                        phSalePrice = 0;
                                    } else {
                                        phSalePrice = ware.isDivisible ? Number( ware.phPriceSale ) / Number( ware.phPackSize ) : Number( ware.phPriceSale );
                                    }
                                } else {
                                    phSalePrice = 0;
                                }
                                data.push( new SelectedWaresViewModel( {
                                    data: {
                                        phPZN: ware.phPZN,
                                        description: ware.description || unwrap( ware.phNLabel ) || unwrap( ware.userContent ),
                                        reason: ware.phReason,
                                        stockLocation: ware.stockLocation,
                                        stockItemId: ware.stockItemId, //Get ware _id by selected stockLocationId
                                        stockLocationId: ware.stockLocationId,
                                        isDivisible: ware.isDivisible,
                                        divisibleCount: ware.divisibleCount,
                                        phPackSize: Number( ware.phPackSize ),
                                        prdNo: ware.prdNo,
                                        phPriceSale: phSalePrice,
                                        count: self.groupedMedications[key].length,
                                        order: ware.order,
                                        _id: ware._id,
                                        canBeDispensed: ware.canBeDispensed
                                    }
                                } ) );
                            }
                        }

                        function groupByStockLocationAndPhPZN( activities ) {
                            var result = {};

                            activities.forEach( function( act ) {
                                var key = self.getActKey( act );
                                if( result[key] ) {
                                    result[key].push( act );
                                } else {
                                    result[key] = [act];
                                }
                            } );
                            return result;
                        }

                        self.medicationsTable(
                            KoComponentManager.createComponent( {
                                componentType: 'KoEditableTable',
                                componentConfig: {
                                    stateId: 'medicationsTable',
                                    states: ['limit', 'usageShortcutsVisible'],
                                    data: data,
                                    ViewModel: SelectedWaresViewModel,
                                    responsive: true,
                                    draggableRows: false,
                                    striped: false,
                                    fillRowsToLimit: false,
                                    limit: 10,
                                    limitList: [10, 20, 30, 40, 50, 100],
                                    columns: [
                                        {
                                            forPropertyName: 'phPZN',
                                            label: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                            title: i18n( 'InStockMojit.instock_schema.InStock_T.phPZN' ),
                                            width: '10%',
                                            isSortable: true,
                                            isFilterable: true
                                        },
                                        {
                                            forPropertyName: 'description',
                                            label: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                            title: i18n( 'InStockMojit.instock_schema.InStock_T.description' ),
                                            width: '15%',
                                            isSortable: true,
                                            isFilterable: true
                                        },
                                        {
                                            forPropertyName: 'count',
                                            label: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.count' ),
                                            title: i18n( 'InCaseMojit.medicationplan_prescription_modalJS.title.count' ),
                                            width: '5%'
                                        },
                                        {
                                            forPropertyName: 'isDivisible',
                                            label: i18n( 'InStockMojit.instock_schema.InStock_T.fullPartialPackage' ),
                                            title: i18n( 'InStockMojit.instock_schema.InStock_T.fullPartialPackage' ),
                                            width: '5%',
                                            isSortable: true,
                                            isFilterable: true,
                                            renderer: function( meta ) {
                                                if( unwrap( meta.value ) ) {
                                                    return TP;
                                                } else {
                                                    return OP;
                                                }

                                            }
                                        },
                                        {
                                            forPropertyName: 'phPriceSale',
                                            width: '15%',
                                            label: i18n( 'InStockMojit.instock_schema.InStock_T.unitPrice' ),
                                            title: i18n( 'InStockMojit.instock_schema.InStock_T.unitPrice' ),
                                            renderer: function( meta ) {
                                                var value = unwrap( meta.value );
                                                if( !isNaN( value ) ) {
                                                    return Y.doccirrus.schemas.instock.getSwissPriceString( value );
                                                }

                                                return value;
                                            }
                                        },
                                        {
                                            forPropertyName: 'stockLocation',
                                            label: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                            title: i18n( 'InStockMojit.instock_schema.InStock_T.stockLocationId' ),
                                            required: true,
                                            width: '15%',
                                            renderer: function( meta ) {
                                                if( unwrap( meta.value ) ) {
                                                    return unwrap( meta.value ).title;
                                                }
                                                return "";
                                            }
                                        },
                                        {
                                            forPropertyName: 'reason',
                                            width: '10%',
                                            label: i18n( 'activity-schema.Medication_T.phReason.i18n' ),
                                            title: i18n( 'activity-schema.Medication_T.phReason.i18n' )
                                        },
                                        {
                                            forPropertyName: 'order',
                                            width: '10%',
                                            label: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderNo' ),
                                            title: i18n( 'InStockMojit.instock_schema.StockOrders_T.orderNo' ),
                                            renderer: function( meta ) {
                                                var value = unwrap( meta.value );
                                                if( value && value.orderNo ) {
                                                    return '<a target="_blank" href="admin/instock#/orders/' + value._id + '">' + value.orderNo + '</a>';
                                                } else {
                                                    return "";
                                                }
                                            }
                                        }
                                    ],
                                    isAddRowButtonVisible: function() {
                                        return false;
                                    }
                                }

                            } )
                        );
                    }

                }

                function handleResponseError( err ) {
                    var errors = Y.doccirrus.errorTable.getErrorsFromResponse( err );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        window: {width: 'small'},
                        message: errors.join( '<br>' )
                    } );
                }
            }

        }, {
            NAME: 'DispensingModalModel',
            ATTRS: {
                phPZNs: {
                    value: [],
                    lazyAdd: false
                },
                locationId: {
                    value: "",
                    lazyAdd: false
                },
                activities: {
                    value: [],
                    lazyAdd: false
                },
                currentUser: {
                    value: [],
                    lazyAdd: false
                }
            }
        } );

        function DispensingModal() {

        }

        DispensingModal.prototype.showDialog = function( data ) {
            function show() {
                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'InCaseMojit/views/dispensing-modal'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            dispensingModalModel,
                            bodyContent = Y.Node.create( template );
                        dispensingModalModel = new DispensingModalModel( data );

                        function createDispense() {
                            var
                                userContent,
                                wares,
                                activities;

                            wares = unwrap( unwrap( dispensingModalModel.medicationsTable ).rows ).filter( function( ware ) {
                                return unwrap( ware.canBeDispensed );
                            } );

                            activities = data.activities.filter( function( act ) {
                                return !!wares.find( function( ware ) {
                                    return unwrap( ware.phPZN ) === unwrap( act.phPZN ) && unwrap( act.canBeDispensed );
                                } );
                            } );

                            if( !activities.length ) {
                                return;
                            }

                            userContent = wares.map( function( ware ) {
                                return unwrap( ware.description ) + " : " + unwrap( ware.reason );
                            } ).join( '\n' );

                            modal.getButton( 'OK' ).button.disable();

                            return Y.doccirrus.jsonrpc.api.activity.createDispense( {
                                data: {
                                    dispense: {
                                        dispensedItems: wares.map( function( ware ) {
                                            return {
                                                stockItemId: unwrap( ware.stockItemId ), //Get ware _id by selected stockLocationId
                                                phPZN: unwrap( ware.phPZN ),
                                                reason: unwrap( ware.reason ),
                                                description: unwrap( ware.description )
                                            };
                                        } ),
                                        'patientId': unwrap( activities[0].patientId ),
                                        'locationId': unwrap( activities[0].locationId ),
                                        'caseFolderId': unwrap( activities[0].caseFolderId ),
                                        'employeeId': unwrap( data.currentUser._id ),
                                        'employeeName': unwrap( data.currentUser.firstname ) + " " + unwrap( data.currentUser.lastname ),
                                        'comment': unwrap( dispensingModalModel.description ),
                                        'userContent': userContent
                                    },
                                    medicationIds: activities.map( function( act ) {
                                        return unwrap( act._id );
                                    } ),
                                    wares: wares.map( function( ware ) {
                                        return {
                                            phPZN: unwrap( ware.phPZN ),
                                            stockLocationId: unwrap( ware.stockLocation )._id,
                                            reduce: Y.doccirrus.schemas.instock.calculateReduceCount( ware, unwrap( ware.count ) ),
                                            notes: i18n( 'activity-schema.StockDispense.addingDispense' ) + " " + unwrap( dispensingModalModel.description )
                                        };
                                    } )
                                }
                            } );

                        }

                        function addToOrder() {
                            var
                                activitiesData = [],
                                dispensedPZNs = [],
                                key,
                                activities = data.activities,
                                patientId,
                                caseFolderId;

                            if (activities && activities.length ) {
                                patientId = activities[0].patientId;
                                caseFolderId = activities[0].caseFolderId;
                            }

                            if( unwrap( dispensingModalModel.medicationsTable ) ) {
                                dispensedPZNs = unwrap( unwrap( dispensingModalModel.medicationsTable ).rows ).map( function( ware ) {
                                        return unwrap( ware.phPZN );
                                    }
                                );
                            }
                            var groupedMedications = dispensingModalModel.groupedMedications;
                            //Is grouped by phPZN, stockLocationId, isDivisible
                            for( key in groupedMedications ) {
                                if( groupedMedications.hasOwnProperty( key ) && groupedMedications[key].length ) {
                                    if( groupedMedications[key][0].order ) {
                                        activitiesData.push( {
                                            activities: groupedMedications[key],
                                            isDivisible: groupedMedications[key][0].isDivisible,
                                            phPackSize: groupedMedications[key][0].phPackSize,
                                            count: groupedMedications[key].length,
                                            stockLocationId: unwrap( groupedMedications[key][0].stockLocationId ),
                                            addOrderInfo: dispensedPZNs.indexOf( unwrap( groupedMedications[key][0].phPZN ) ) !== -1,
                                            phPZN: unwrap( groupedMedications[key][0].phPZN )
                                        } );
                                    }
                                }
                            }

                            if( !activitiesData.length ) {
                                return;
                            }

                            modal.getButton( 'OK' ).button.disable();

                            return Y.doccirrus.jsonrpc.api.stockordersrequest.updateItemInOrderOrCreateNew( {
                                data: {
                                    orderId: (dispensingModalModel.orders[0] || {})._id,
                                    patientId: unwrap( patientId ),
                                    activitiesData: activitiesData,
                                    caseFolderId: caseFolderId
                                }
                            } );
                        }

                        function printLabel() {
                            if( unwrap( dispensingModalModel.printLabel ) ) {
                                Y.doccirrus.jsonrpc.api.activity.printLabel( {
                                    data: {
                                        medications: data.activities.map( function( med ) {
                                            return {
                                                _id: unwrap( med._id ),
                                                formId: unwrap( med.formId ),
                                                locationId: unwrap( med.locationId ),
                                                formVersion: unwrap( med.formVersion )
                                            };
                                        } )
                                    }
                                } ).fail( function( err ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                } );
                            }
                        }

                        modal = new Y.doccirrus.DCWindow( {
                            bodyContent: bodyContent,
                            title: i18n( 'InCaseMojit.DispensingModal.title' ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            maximizable: true,
                            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        label: cancelButtonI18n
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        label: i18n( 'InCaseMojit.DispensingModal.title' ),
                                        action: function() {
                                            var promises = [];
                                            promises.push( addToOrder() );
                                            promises.push( createDispense() );

                                            Promise.all( promises )
                                                .then( function() {
                                                    data.callback();
                                                    printLabel();
                                                    Y.fire( 'activityTransitioned', {
                                                        data: {
                                                            actType: unwrap( (data.currentActivity || {}).actType ) || "MEDICATION"
                                                        },
                                                        model: unwrap( data.currentActivity ),
                                                        transitionDescription: Y.doccirrus.schemas.activity.getTransitionDescription( 'approve' ),
                                                        skipRedirectBack: true
                                                    } );
                                                    modal.close();
                                                } ).catch( function( err ) {
                                                modal.getButton( 'OK' ).button.enable();
                                                if( err && err.message ) {
                                                    Y.doccirrus.DCWindow.notice( {
                                                        type: 'error',
                                                        message: err.message,
                                                        window: {
                                                            width: 'medium',
                                                            buttons: {
                                                                footer: [
                                                                    Y.doccirrus.DCWindow.getButton( 'CLOSE', {
                                                                        isDefault: false
                                                                    } )
                                                                ]
                                                            }
                                                        }
                                                    } );
                                                } else {
                                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                                }
                                            } );
                                        },
                                        disabled: true
                                    } )
                                ]
                            }
                        } );

                        modal.set( 'focusOn', [] );

                        modal.after( 'visibleChange', function() {
                            modal = null;
                        } );

                        ko.applyBindings( dispensingModalModel, bodyContent.getDOMNode() );
                    } ).catch( catchUnhandled );
            }

            show();

        };

        Y.namespace( 'doccirrus.modals' ).dispensingModal = new DispensingModal();

        /**
         * SelectedWaresViewModel for KoEditableTable
         * @param config
         * @constructor
         */
        function SelectedWaresViewModel( config ) {
            SelectedWaresViewModel.superclass.constructor.call( this, config );
        }

        SelectedWaresViewModel.ATTRS = {
            whiteList: {
                value: [
                    'phPZN',
                    'gtinCode',
                    'description',
                    'phPriceSale',
                    'vat',
                    'quantity',
                    'quantityOrdered',
                    'minimumQuantity',
                    'm_extra',
                    'supplier',
                    'quantityDelivered',
                    'editorId',
                    'checked',
                    'editor',
                    'stocksId',
                    'stockLocationId',
                    'stockLocation',
                    'isProcessed',
                    'stockType',
                    'isDivisible',
                    'divisibleCount',
                    'count',
                    'order',
                    'stockItemId',
                    'reason'
                ],
                lazyAdd: false
            },
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( SelectedWaresViewModel, KoViewModel.getBase(), {
                initializer: function( config ) {
                    var
                        self = this;
                    self.phPZN.readOnly = true;
                    self.description.readOnly = true;
                    self.quantity.readOnly = true;
                    self.reason = ko.observable( "" );
                    self.isDivisible.readOnly = true;
                    self.count.readOnly = true;
                    self.stockItemId.readOnly = true;
                    self.divisibleCount.readOnly = true;
                    self.stockLocation.readOnly = true;
                    self.reason.readOnly = true;
                    self.order.readOnly = true;
                    self.setDefaultValues( config );

                },
                setDefaultValues: function( data ) {
                    this.set( 'data', data );
                },
                destructor: function() {
                }
            },
            {
                schemaName: 'v_selectedWares',
                NAME: 'SelectedWaresViewModel'
            }
        );
        KoViewModel.registerConstructor( SelectedWaresViewModel );

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'oop',
            'KoViewModel',
            'promise',
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'KoBaseContact',
            'KoUI-all',
            'instock-schema',
            'stockorders-schema',
            'StockLocationSelectViewModel',
            'SupplierSelectViewModel',
            'v_selectedWares-schema'
        ]
    }
);
