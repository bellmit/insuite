/*global Y, it, expect, describe, before, after */
/**
 * User: dcdev
 * Date: 7/22/20  4:07 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
const
    mongoose = require( 'mongoose' ),
    util = require( 'util' ),
    user = Y.doccirrus.auth.getSUForLocal(),
    instockModal = 'instock',
    stockordesModal = 'stockorders',
    countryMode = Y.config.doccirrus.Env.countryMode,
    stockOrderId = new mongoose.Types.ObjectId(),
    locationId = new mongoose.Types.ObjectId(),
    editorId = new mongoose.Types.ObjectId(),
    supplierId = new mongoose.Types.ObjectId(),
    basecontactId = "5c52e1a3e04f4b1e8678e8d8",
    stockLocations = [
        {
            _id: new mongoose.Types.ObjectId(),
            title: "stockLocation1",
            description: "description stockLocation1"

        }, {
            _id: new mongoose.Types.ObjectId(),
            title: "stockLocation2",
            description: "description stockLocation2"
        }],
    instockItems = [
        {
            "_id": new mongoose.Types.ObjectId(),
            "phPriceSale": 79,
            "phPriceSaleCatalog": 79,
            "phPriceCost": 0,
            "phPriceCostCatalog": 0,
            "vat": 1001,
            "vatType": 1,
            "quantity": 0,
            "quantityOrdered": 0,
            "minimumQuantity": 0,
            "supplierId": supplierId,
            "notes": " ",
            "phPackSize": 3,
            "isDivisible": false,
            "automaticReorder": false,
            "ingredients": [],
            "editorId": null,
            "dateCreated": null,
            "dateUpdated": null,
            "phPZN": "6661984",
            "gtinCode": "0000042305194",
            "prdNo": "1319927",
            "description": "WONDERSTRIPES Wonderlashes Eyelash&Brow Growth Serum 3 ml",
            "locationId": locationId,
            "stockLocationId": stockLocations[0]._id,
            "supplyCategory": "",
            "phUnit": "ml",
            "articleCategory": "Gesichts-Pflege Kuren/Seren/Set"
        },
        {
            "_id": new mongoose.Types.ObjectId(),
            "phPriceSale": 0,
            "phPriceSaleCatalog": 0,
            "phPriceCost": 0,
            "phPriceCostCatalog": 0,
            "vat": 1001,
            "vatType": 1,
            "quantity": 0,
            "quantityOrdered": 0,
            "minimumQuantity": 0,
            "supplierId": supplierId,
            "notes": " ",
            "phPackSize": 1,
            "isDivisible": false,
            "automaticReorder": false,
            "ingredients": [],
            "editorId": null,
            "dateCreated": null,
            "dateUpdated": null,
            "phPZN": "4470346",
            "gtinCode": "00029369101005",
            "prdNo": "1143662",
            "description": "Mc David Ankle Guard Sprunggelenk XXS 36-37 weiss",
            "locationId": locationId,
            "stockLocationId": stockLocations[1]._id,
            "supplyCategory": "",
            "phUnit": "Stk",
            "articleCategory": "Knöchelbandagen"
        }
    ],
    stockOrder = {
        "_id": stockOrderId,
        "mediaId": "",
        "basecontactId": supplierId,
        "locationId": locationId,
        "stocks": [
            {
                "checked": false,
                "quantityDelivered": 1,
                "phPriceSale": 0,
                "phPriceSaleCatalog": 2,
                "phPriceCost": 0,
                "phPriceCostCatalog": 3,
                "nota": "",
                "patients": [],
                "isDivisible": false,
                "dividedQuantity": 0,
                "_id": new mongoose.Types.ObjectId(),
                "quantity": 3,
                "references": instockItems[0]._id,
                "stockLocationId": stockLocations[0]._id,
                "stockType": "instock"
            },
            {
                "checked": false,
                "quantityDelivered": 1,
                "phPriceSale": 79,
                "phPriceSaleCatalog": 79,
                "phSalesStatus": "UNKNOWN",
                "phPriceCost": 0,
                "phPriceCostCatalog": 0,
                "nota": "",
                "patients": [],
                "isDivisible": false,
                "dividedQuantity": 0,
                "_id": new mongoose.Types.ObjectId(),
                "quantity": 1,
                "references": instockItems[1]._id,
                "stockLocationId": stockLocations[1]._id,
                "stockType": "instock"
            }
        ],
        "editorId": editorId,
        "orderNo": "2002-525",
        "status": "created",
        "dateCreated": "2020-07-21T14:15:52.410Z",
        "dateSent": "",
        "dateArrived": ""
    },
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    supplierData = mochaUtils.getSupplierData( {
        _id: supplierId,
        sendElectronicOrder: false,
        isMainSupplier: true
    } );

describe( 'Stock orders api test', function() {
    before( async function() {
        this.timeout( 5000 );
        await cleanDb( {user} );
        Y.config.doccirrus.Env.countryMode = ['CH'];

        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'location',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                _id: locationId,
                stockLocations,
                countryCode: "CH",
                countryMode: ["CH"],
                zip: "1210"
            } ) )
        } );
        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'basecontact',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( supplierData )
        } );
        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'identity',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getIdentityData( {
                _id: editorId
            } ) )
        } );
        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: instockModal,
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( [].concat( instockItems ) )
        } );
        await Y.doccirrus.mongodb.runDb( {
            user: user,
            model: stockordesModal,
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( stockOrder )
        } );
    } );

    after( async function() {
        this.timeout( 5000 );
        await cleanDb( {user} );
        Y.config.doccirrus.Env.countryMode = countryMode;
    } );
    describe( 'StockOrders api', function() {
        it( 'api.stockordersrequest.getOrders by Id', async function() {
            let result = await Y.doccirrus.api.stockordersrequest.getOrders( {
                user,
                query: {
                    _id: stockOrder._id
                },
                options: {
                    lean: true
                }
            } );
            result.result.length.should.equal( 1 );

            expect( result.result[0].supplier._id.toString() ).to.equal( supplierData._id.toString() );

            delete result.result[0].supplier;
            expect( result.result ).to.deep.have.same.members( [
                {
                    "_id": stockOrder._id,
                    "mediaId": "",
                    "basecontactId": supplierId.toString(),
                    "locationId": locationId,
                    "orderNo": "2002-525",
                    "status": "created",
                    "dateCreated": new Date( "2020-07-21T14:15:52.410Z" ),
                    "dateSent": null,
                    "dateArrived": null,
                    "stockItems": [
                        {
                            "_id": instockItems[0]._id,
                            "phPriceSale": 79,
                            "phPriceSaleCatalog": 79,
                            "phSalesStatus": "UNKNOWN",
                            "phPriceCost": 0,
                            "phPriceCostCatalog": 0,
                            "vat": 1001,
                            "vatType": 1,
                            "quantity": 0,
                            "quantityOrdered": 0,
                            "minimumQuantity": 0,
                            "supplierId": supplierId,
                            "notes": " ",
                            "phPackSize": 3,
                            "isDivisible": false,
                            "automaticReorder": false,
                            "ingredients": [],
                            "editorId": null,
                            "dateCreated": null,
                            "dateUpdated": null,
                            "phPZN": "6661984",
                            "gtinCode": "0000042305194",
                            "prdNo": "1319927",
                            "description": "WONDERSTRIPES Wonderlashes Eyelash&Brow Growth Serum 3 ml",
                            "locationId": locationId,
                            "stockLocationId": instockItems[0].stockLocationId,
                            "supplyCategory": "",
                            "phUnit": "ml",
                            "articleCategory": "Gesichts-Pflege Kuren/Seren/Set"
                        },
                        {
                            "_id": instockItems[1]._id,
                            "phPriceSale": 0,
                            "phPriceSaleCatalog": 0,
                            "phSalesStatus": "UNKNOWN",
                            "phPriceCost": 0,
                            "phPriceCostCatalog": 0,
                            "vat": 1001,
                            "vatType": 1,
                            "quantity": 0,
                            "quantityOrdered": 0,
                            "minimumQuantity": 0,
                            "supplierId": supplierId,
                            "notes": " ",
                            "phPackSize": 1,
                            "isDivisible": false,
                            "automaticReorder": false,
                            "ingredients": [],
                            "editorId": null,
                            "dateCreated": null,
                            "dateUpdated": null,
                            "phPZN": "4470346",
                            "gtinCode": "00029369101005",
                            "prdNo": "1143662",
                            "description": "Mc David Ankle Guard Sprunggelenk XXS 36-37 weiss",
                            "locationId": locationId,
                            "stockLocationId": instockItems[1].stockLocationId,
                            "supplyCategory": "",
                            "phUnit": "Stk",
                            "articleCategory": "Knöchelbandagen"
                        }
                    ],
                    "editors": [],
                    "lastEditor": {
                        "_id": editorId,
                        "lastname": "Last name",
                        "firstname": "First name"
                    },
                    "locname": "TestPraxis1",
                    "stockLocations": [],
                    "form": {},
                    "stocks": [
                        {
                            "checked": false,
                            "quantity": 3,
                            "references": instockItems[0]._id,
                            "stockLocationId": stockOrder.stocks[0].stockLocationId,
                            "quantityDelivered": 1,
                            "stockType": "instock",
                            "patients": [],
                            "phPriceSale": 0,
                            "phPriceSaleCatalog": 2,
                            "totalStockPrice": 0,
                            "activities": [],
                            "phPZN": "",
                            "phPriceCost": 0,
                            "phPriceCostCatalog": 3,
                            "nota": "",
                            "dividedQuantity": 0,
                            "_id": stockOrder.stocks[0]._id,
                            "stockItem": {
                                "_id": instockItems[0]._id,
                                "phPriceSale": 79,
                                "phPriceSaleCatalog": 79,
                                "phSalesStatus": "UNKNOWN",
                                "phPriceCost": 0,
                                "phPriceCostCatalog": 0,
                                "vat": 1001,
                                "vatType": 1,
                                "quantity": 0,
                                "quantityOrdered": 0,
                                "minimumQuantity": 0,
                                "supplierId": supplierId,
                                "notes": " ",
                                "phPackSize": 3,
                                "isDivisible": false,
                                "automaticReorder": false,
                                "ingredients": [],
                                "editorId": null,
                                "dateCreated": null,
                                "dateUpdated": null,
                                "phPZN": "6661984",
                                "gtinCode": "0000042305194",
                                "prdNo": "1319927",
                                "description": "WONDERSTRIPES Wonderlashes Eyelash&Brow Growth Serum 3 ml",
                                "locationId": locationId,
                                "stockLocationId": instockItems[0].stockLocationId,
                                "supplyCategory": "",
                                "phUnit": "ml",
                                "articleCategory": "Gesichts-Pflege Kuren/Seren/Set"
                            }
                        },
                        {
                            "checked": false,
                            "quantity": 1,
                            "references": instockItems[1]._id,
                            "stockLocationId": stockOrder.stocks[1].stockLocationId,
                            "quantityDelivered": 1,
                            "stockType": "instock",
                            "patients": [],
                            "phPriceSale": 79,
                            "phPriceSaleCatalog": 79,
                            "totalStockPrice": 79,
                            "activities": [],
                            "phPZN": "",
                            "phPriceCost": 0,
                            "phPriceCostCatalog": 0,
                            "nota": "",
                            "dividedQuantity": 0,
                            "_id": stockOrder.stocks[1]._id,
                            "stockItem": {
                                "_id": instockItems[1]._id,
                                "phPriceSale": 0,
                                "phPriceSaleCatalog": 0,
                                "phSalesStatus": "UNKNOWN",
                                "phPriceCost": 0,
                                "phPriceCostCatalog": 0,
                                "vat": 1001,
                                "vatType": 1,
                                "quantity": 0,
                                "quantityOrdered": 0,
                                "minimumQuantity": 0,
                                "supplierId": supplierId,
                                "notes": " ",
                                "phPackSize": 1,
                                "isDivisible": false,
                                "automaticReorder": false,
                                "ingredients": [],
                                "editorId": null,
                                "dateCreated": null,
                                "dateUpdated": null,
                                "phPZN": "4470346",
                                "gtinCode": "00029369101005",
                                "prdNo": "1143662",
                                "description": "Mc David Ankle Guard Sprunggelenk XXS 36-37 weiss",
                                "locationId": locationId,
                                "stockLocationId": instockItems[1].stockLocationId,
                                "supplyCategory": "",
                                "phUnit": "Stk",
                                "articleCategory": "Knöchelbandagen"
                            }
                        }
                    ],
                    "totalOrderedQuantity": 4,
                    "totalOrderedPrice": 79
                }
            ] );
        } );
        it( 'api.stockordersrequest.getOrders by location', async function() {
            let result = await Y.doccirrus.api.stockordersrequest.getOrders( {
                user,
                query: {
                    $and: [
                        {"locationId": locationId},
                        {"status": "created"}
                    ],
                    convertToObjectIdConfig: [["$and", 0, "locationId"]]
                },
                options: {
                    lean: true
                }
            } );
            result.result.length.should.equal( 1 );
        } );
        it( 'api.stockordersrequest._insertItemsFromCatalogToInStock, order with item from catalog but existed same in instock ', async function() {
            const inStockItem = {
                "_id": new mongoose.Types.ObjectId( "5f16f33130fe54447beea3d6" ),
                "phPriceSale": 10,
                "phPriceSaleCatalog": 18.9,
                "phPriceCost": 11,
                "phPriceCostCatalog": 0,
                "vat": 1002,
                "vatType": 2,
                "quantity": 0,
                "quantityOrdered": 0,
                "minimumQuantity": 0,
                "supplierId": new mongoose.Types.ObjectId( basecontactId ),
                "notes": " ",
                "phPackSize": 35,
                "isDivisible": false,
                "automaticReorder": false,
                "ingredients": [],
                "editorId": null,
                "dateCreated": null,
                "dateUpdated": null,
                "phPZN": "1479660",
                "gtinCode": "0000100040777",
                "prdNo": "28266",
                "description": "DHU Arnica comp Gel Tb 35 g",
                "locationId": locationId,
                "stockLocationId": stockLocations[0]._id,
                "supplyCategory": "",
                "phUnit": "g",
                "articleCategory": "Homöopathische Arzneimittel"
            };
            const catalogItem = {
                "_id": new mongoose.Types.ObjectId( "5ed65d4754b0de885aec2ff1" ),
                "code": "0000100040777",
                "phGTIN": "0000100040777",
                "phPZN": "1479660",
                "prdNo": "28266",
                "phUnit": "g",
                "phCompany": "3911",
                "phPackSize": "35",
                "phDescription": "DHU Arnica comp Gel Tb 35 g",
                "u_extra": [
                    {
                        "VDAT": "2010-08-04T00:00:00+02:00",
                        "PTYP": "PDOC",
                        "PRICE": "17.01"
                    },
                    {
                        "VDAT": "2010-08-04T00:00:00+02:00",
                        "PTYP": "PPHA",
                        "PRICE": "14.17"
                    },
                    {
                        "VDAT": "2010-08-04T00:00:00+02:00",
                        "PTYP": "PPUB",
                        "PRICE": "18.9"
                    }
                ],
                "insuranceCode": "12",
                "paidByInsurance": false,
                "supplyCategory": "",
                "articleType": "06.20.01.00",
                "vatType": 2,
                "units": [],
                "phAtc": null,
                "phForm": "Gel",
                "phPriceSale": 18.9,
                "phPriceCost": 0,
                "phUnitDescription": "Gramm",
                "insuranceDescription": "SL: Homoe./Antropo.",
                "catalogShort": "HCI",
                "phIngr": [],
                "articleCategory": "Homöopathische Arzneimittel"
            };
            await Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'medicationscatalog',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( catalogItem )
            } );

            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: instockModal,
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( [].concat( inStockItem ) )
            } );

            const newOrder = {
                basecontactId: basecontactId,
                locationId: locationId,
                stocks: [
                    {
                        vatType: 1,
                        checked: false,
                        patients: [],
                        phPackSize: "6",
                        phPriceCost: 0,
                        phPriceCostCatalog: 0,
                        phPriceSale: 3.9,
                        phPriceSaleCatalog: 3.9,
                        quantity: 1,
                        quantityDelivered: 0,
                        references: "5ed65d4754b0de885aec2ff1",
                        stockLocationId: stockLocations[0]._id,
                        stockType: "medicationscatalog"
                    }]
            };

            let order = await Y.doccirrus.api.stockordersrequest._insertItemsFromCatalogToInStock( newOrder, user );
            //Expect that the fields are overwritten by stockitem values
            expect( order.stocks[0] ).to.include( {
                phPriceSale: 10,
                phPriceCost: 11,
                stockType: "instock"
            } );
            expect( order.stocks[0].references.toString() ).equal( inStockItem._id.toString() );
        } );
        it( 'api.stockordersrequest._insertItemsFromCatalogToInStock, order with item from catalog but not existed in instock ', async function() {
            const mediationCatalogItem = {
                "_id": "5ed65d8154b0de885aec908d",
                "code": "0012742011169",
                "phGTIN": "0012742011169",
                "phPZN": "3620430",
                "prdNo": "1075767",
                "phUnit": "Stk",
                "phCompany": "3008",
                "phPackSize": "6",
                "phDescription": "FINGRS Sandblatt Feilen 6 Stk",
                "u_extra": [
                    {
                        "VDAT": "2007-08-31T00:00:00+02:00",
                        "PTYP": "PPUB",
                        "PRICE": "3.9"
                    }
                ],
                "insuranceCode": "99",
                "paidByInsurance": false,
                "supplyCategory": "",
                "articleType": "22.24.28.06",
                "vatType": 1,
                "units": [],
                "phAtc": null,
                "phForm": null,
                "phPriceSale": 3.9,
                "phPriceCost": 0,
                "phUnitDescription": "Stück",
                "insuranceDescription": "nicht definiert",
                "catalogShort": "HCI",
                "phIngr": [],
                "articleCategory": "Nagelfeilen"
            };
            const newOrder = {
                basecontactId: basecontactId,
                locationId: locationId,
                stocks: [
                    {
                        vatType: 1,
                        checked: false,
                        patients: [],
                        phPackSize: "6",
                        phPriceCost: 0,
                        phPriceCostCatalog: 0,
                        phPriceSale: 3.9,
                        phPriceSaleCatalog: 3.9,
                        quantity: 1,
                        quantityDelivered: 0,
                        references: "5ed65d8154b0de885aec908d",
                        stockLocationId: stockLocations[0]._id,
                        stockType: "medicationscatalog"
                    }]
            };
            let insertedItemToInstock;
            await Y.doccirrus.mongodb.runDb( {
                user: Y.doccirrus.auth.getSUForLocal(),
                model: 'medicationscatalog',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mediationCatalogItem )
            } );

            let order = await Y.doccirrus.api.stockordersrequest._insertItemsFromCatalogToInStock( newOrder, user );
            //Expect that item from catalog was inserted into instock
            insertedItemToInstock = await Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'instock',
                user,
                query: {
                    $and: [
                        {phPZN: {$eq: mediationCatalogItem.phPZN}},
                        {stockLocationId: {$eq: stockLocations[0]._id}}
                    ]
                }
            } );

            insertedItemToInstock = insertedItemToInstock.result ? insertedItemToInstock.result : insertedItemToInstock;

            expect( insertedItemToInstock ).to.deep.have.same.members( [
                {
                    _id: insertedItemToInstock[0]._id,
                    phPriceSale: 3.9,
                    phPriceSaleCatalog: 3.9,
                    phSalesStatus: "UNKNOWN",
                    phPriceCost: 0,
                    phPriceCostCatalog: 0,
                    vat: 1003,
                    vatType: 0,
                    quantity: 0,
                    quantityOrdered: 0,
                    minimumQuantity: 0,
                    supplierId: new mongoose.Types.ObjectId( order.basecontactId ),
                    notes: ' ',
                    phPackSize: 6,
                    isDivisible: false,
                    automaticReorder: false,
                    ingredients: [],
                    editorId: null,
                    dateCreated: null,
                    dateUpdated: null,
                    phPZN: '3620430',
                    gtinCode: '0012742011169',
                    prdNo: '1075767',
                    description: 'FINGRS Sandblatt Feilen 6 Stk',
                    locationId: locationId,
                    stockLocationId: stockLocations[0]._id,
                    supplyCategory: '',
                    phUnit: 'Stk'
                }] );

            expect( order.stocks[0].references.toString() ).equal( insertedItemToInstock[0]._id.toString() );
        } );
        it( `api.stockordersrequest.sendOrder`, async function() {
            let result = await Y.doccirrus.api.stockordersrequest.sendOrder( {
                user,
                data: {
                    _id: stockOrder._id
                }
            } );
            //Check if status changed
            expect( result[0].status ).equal( 'sent' );

            let insertedItemsToInstock = await Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'instock',
                user,
                query: {
                    _id: {$in: stockOrder.stocks.map( s => s.references )}
                }
            } );
            //Check if quantityOrdered is updated
            insertedItemsToInstock = insertedItemsToInstock.result || insertedItemsToInstock;
            insertedItemsToInstock.forEach( ( item ) => {
                expect( item.quantityOrdered ).equal( (stockOrder.stocks.find( s => s.references.toString() === item._id.toString() ) || {}).quantity );
            } );
        } );

        it( `api.stockordersrequest._updateCatalogPricesExi`, async function() {
            let order = await Y.doccirrus.api.stockordersrequest.getOrders( {
                user,
                query: {
                    _id: stockOrder._id
                },
                options: {
                    lean: true
                }
            } );
            order = order.result && order.result[0] || order;
            await Y.doccirrus.api.stockordersrequest._updateCatalogPricesExistinInstockItems( user, order );

            let result = await Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'instock',
                user,
                query: {
                    _id: stockOrder.stocks[0].references
                }
            } );

            result = result.result || result;

            expect( result[0].phPriceSaleCatalog ).equal( stockOrder.stocks[0].phPriceSaleCatalog );
            expect( result[0].phPriceCostCatalog ).equal( stockOrder.stocks[0].phPriceCostCatalog );
        } );
        describe( 'saveOrder', function() {
            let getOrderNo = Y.doccirrus.api.stockordersrequest.getOrderNo;
            before( function() {
                Y.doccirrus.api.stockordersrequest.getOrderNo = function() {
                    return "12345-4444";
                };
            } );

            after( function() {
                Y.doccirrus.api.stockordersrequest.getOrderNo = getOrderNo;
            } );

            it( `api.stockordersrequest.saveAsNew`, async function() {
                let orderId = await Y.doccirrus.api.stockordersrequest.saveAsNew( {
                    user,
                    data: {
                        _id: stockOrder._id
                    }
                } );
                expect( orderId.length ).equal( 1 );

                let order = await Y.doccirrus.api.stockordersrequest.getOrderById( orderId[0], user );

                expect( order ).to.include( {
                    mediaId: "",
                    basecontactId: supplierId.toString()
                } );

                expect( order.stocks[0] ).to.deep.include( {
                    "checked": false,
                    "quantityDelivered": 3,
                    "phPriceSale": 0,
                    "phPriceSaleCatalog": 0,
                    "phPriceCost": 0,
                    "phPriceCostCatalog": 0,
                    "nota": "",
                    "isDivisible": false,
                    "dividedQuantity": 0,
                    "quantity": 3,
                    "references": instockItems[0]._id,
                    "stockType": "instock",
                    "stockLocationId": stockLocations[0]._id
                } );
            } );
        } );
        it( 'api.stockordersrequest.removeOrder', async function() {
            await Y.doccirrus.api.stockordersrequest.removeOrder( {
                user,
                data: stockOrder
            } );
        } );

    } );
} );