/**
 * User: dcdev
 * Date: 9/4/20  10:07 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe, expect*/
const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    util = require( 'util' ),
    mongoose = require( 'mongoose' ),
    _ = require( 'lodash' ),
    ObjectId = mongoose.Types.ObjectId,
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

const deleteEntry = ( model, query ) => {
    return Y.doccirrus.mongodb.runDb( {
        user,
        action: 'delete',
        model,
        query
    } );
};

const checkStockLocation = async function( {query, expected} ) {
    let [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
        user,
        model: 'stocklocation',
        query
    } ) );
    should.not.exist( error );
    const stockLocation = _.omit( result[0], ['_id'] );
    expect( stockLocation ).to.deep.equalInAnyOrder( expected );
};

const checkLocation = async function( {query, expected} ) {
    let [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
        user,
        model: 'location',
        query
    } ) );
    should.not.exist( error );
    const stockLocations = (result[0] || {}).stockLocations;
    expect( stockLocations ).to.deep.equalInAnyOrder( expected );

    return result[0];
};

const cleanCollections = async () => {
    await cleanDb( {
        user,
        collections2clean: ['activity', 'casefolder', 'patient', 'location', 'employee', 'catalog']
    } );
};

describe( 'Stocklocation api test', () => {
    const
        stockLocation1_id = new ObjectId(),
        stockLocation2_id = new ObjectId(),
        instockItemId = new ObjectId(),
        orderId = new ObjectId(),
        stockLocation1 = {
            _id: stockLocation1_id,
            title: 'stockLocation 1',
            description: 'description 1'
        },
        stockLocation2 = {
            _id: stockLocation2_id,
            title: 'stockLocation 2',
            description: 'description 2'
        },
        saveWithStockLocationsP = promisifyArgsCallback( Y.doccirrus.api.location.saveWithStockLocations ),
        deleteWithStockLocations = promisifyArgsCallback( Y.doccirrus.api.location.deleteWithStockLocations );

    let
        location1_id,
        location2_id,
        location1Data = mochaUtils.getLocationData( {
            countryMode: 'CH',
            countryCode: 'CH',
            commercialNo: '111111111',
            cantonCode: '3',
            bankIBAN: '01-162-8',
            esrNumber: '010001628',
            zsrNumber: "T277419",
            zip: 6300
        } ),
        location2Data = mochaUtils.getLocationData( {
            countryMode: 'CH',
            countryCode: 'CH',
            commercialNo: '222222222',
            cantonCode: '3',
            bankIBAN: '01-162-8',
            esrNumber: '010001629',
            zsrNumber: "T277419",
            zip: 6300
        } ),
        instockItem = {
            _id: instockItemId,
            "phPriceSale": 8.74,
            "phPriceSaleCatalog": 0,
            "phPriceCost": 3.65,
            "phPriceCostCatalog": 3.65,
            "vat": 1003,
            "vatType": 3,
            "quantity": 2,
            "quantityOrdered": 0,
            "minimumQuantity": 0,
            "supplierId": new ObjectId(),
            "notes": "Erzeugen dispense  ",
            "phPackSize": 1,
            "isDivisible": false,
            "automaticReorder": false,
            "ingredients": [
                "Adrenalin (Epinephrin)",
                "Adrenalin hydrogentartrat (Epinephrin hydrogentartrat)",
                "Natriumchlorid",
                "Dinatrium edetat",
                "Natrium disulfit (E223)"
            ],
            "editorId": null,
            "dateCreated": null,
            "dateUpdated": null,
            "phPZN": "1445419",
            "gtinCode": "7680565140033",
            "prdNo": "29588",
            "description": "Adrenalin Amino Inj Lös 1 mg/ml 10 Amp 1 ml",
            "stockLocationId": stockLocation1_id,
            "supplyCategory": "B",
            "divisibleCount": 0,
            "phUnit": "Dos"
        },
        order = {
            "_id": orderId,
            "mediaId": new ObjectId().toString(),
            "basecontactId": new ObjectId(),
            "formId": new ObjectId(),
            "stocks": [
                {
                    "checked": false,
                    "isProcessed": false,
                    "phPriceSale": 8.74,
                    "phPriceSaleCatalog": 0,
                    "phPriceCost": 3.65,
                    "phPriceCostCatalog": 3.65,
                    "nota": "",
                    "patients": [],
                    "isDivisible": false,
                    "phPZN": "1445419",
                    "_id": new ObjectId(),
                    "quantityDelivered": 1,
                    "stockType": "instock",
                    "references": instockItemId,
                    "quantity": 1,
                    "stockLocationId": stockLocation1_id,
                    "activities": []
                }
            ],
            "editorId": new ObjectId(),
            "orderNo": "8888-224",
            "status": "arrived",
            "dateCreated": new Date( "2020-09-03T08:41:01.883Z" ),
            "dateSent": new Date( "2020-09-03T08:41:52.685Z" ),
            "dateArrived": new Date( "2020-09-03T08:42:17.110Z" ),
            "orderId": new ObjectId()
        },
        countryMode,
        error,
        result;

    delete location1Data._id;
    delete location2Data._id;
    describe( '0. Setup up.', () => {
        it( 'Clean db', async () => {
            await cleanCollections();

            // must validate for CH countryMode
            if( !Y.config ) {
                Y.config = {};
            }

            if( !Y.config.doccirrus ) {
                Y.config.doccirrus = {};
            }

            if( !Y.config.doccirrus.Env ) {
                Y.config.doccirrus.Env = {};
            }

            countryMode = Y.config.doccirrus.Env.countryMode;
            Y.config.doccirrus.Env.countryMode = ['CH'];
        } );
    } );

    describe( '1. Adding new stocklocations.', function() {
        it( '1.1. should create new location with new stocklocations', async function() {
            [error, result] = await formatPromiseResult( saveWithStockLocationsP( {
                user,
                originalParams: {
                    data: location1Data,
                    stockLocationList: [stockLocation1]
                }
            } ) );
            should.not.exist( error );
            location1_id = new ObjectId( result[0] );
            location1Data._id = location1_id;

            location1Data = await checkLocation( {
                query: {
                    _id: location1_id
                },
                expected: [stockLocation1_id]
            } );
        } );
        it( '1.2. should add new stocklocation to existing location', async function() {
            [error] = await formatPromiseResult( saveWithStockLocationsP( {
                user,
                originalParams: {
                    query: {
                        _id: location1_id
                    },
                    fields: Object.keys( location1Data ),
                    data: location1Data,
                    stockLocationList: [stockLocation1, stockLocation2]
                }
            } ) );
            should.not.exist( error );

            const expected = [stockLocation1_id, stockLocation2_id];
            location1Data = await checkLocation( {
                query: {
                    _id: location1_id
                },
                expected
            } );

            await checkStockLocation( {
                query: {
                    _id: stockLocation2_id
                },
                expected: _.omit( stockLocation2, ['_id'] )
            } );
        } );
    } );

    describe( '2. Update stocklocations', function() {
        it( '2.1. should create second location with edited stocklocation', async function() {
            stockLocation1.title = 'Edited stockLocation 1';
            stockLocation1.description = 'Edited description 1';

            [error, result] = await formatPromiseResult( saveWithStockLocationsP( {
                user,
                originalParams: {
                    data: location2Data,
                    stockLocationList: [stockLocation1, stockLocation2]
                }
            } ) );
            should.not.exist( error );
            location2_id = new ObjectId( result[0] );
            location2Data._id = location2_id;

            location2Data = await checkLocation( {
                query: {
                    _id: location2_id
                },
                expected: [stockLocation1_id, stockLocation2_id]
            } );
            await checkStockLocation( {
                query: {
                    _id: stockLocation1_id
                },
                expected: _.omit( stockLocation1, ['_id'] )
            } );
        } );
        it( '2.2. should edit existing stocklocation in existing location', async function() {
            stockLocation2.title = 'Edited stockLocation 2';
            stockLocation2.description = 'Edited description 2';

            [error] = await formatPromiseResult( saveWithStockLocationsP( {
                user,
                originalParams: {
                    query: {
                        _id: location1_id
                    },
                    fields: Object.keys( location1Data ),
                    data: location1Data,
                    stockLocationList: [stockLocation1, stockLocation2]
                }
            } ) );
            should.not.exist( error );

            const expected = [stockLocation1_id, stockLocation2_id];
            location1Data = await checkLocation( {
                query: {
                    _id: location1_id
                },
                expected
            } );

            await checkStockLocation( {
                query: {
                    _id: stockLocation2_id
                },
                expected: _.omit( stockLocation2, ['_id'] )
            } );
        } );
    } );

    describe( '3. Remove stocklocations', function() {
        it( '3.1. should remove stocklocations from location, but keep stocklocations in database because another location has them', async function() {
            [error] = await formatPromiseResult( saveWithStockLocationsP( {
                user,
                originalParams: {
                    query: {
                        _id: location2_id
                    },
                    fields: Object.keys( location2Data ),
                    data: location2Data,
                    stockLocationList: []     //stockLocation1 and stockLocation2 will be deleted
                }
            } ) );
            should.not.exist( error );
            location2Data = await checkLocation( {
                query: {
                    _id: location2_id
                },
                expected: []
            } );

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'stocklocation',
                query: {
                    _id: {$in: [stockLocation1_id, stockLocation2_id]}
                }
            } ) );
            should.not.exist( error );
            result = result.map( r => _.omit( r, ['_id'] ) );
            const expected = [stockLocation1, stockLocation2].map( i => _.omit( i, ['_id'] ) );
            expect( result ).to.deep.equalInAnyOrder( expected );
        } );

        it( '3.2. should delete existing stocklocation after removing it from last location', async function() {
            [error] = await formatPromiseResult( saveWithStockLocationsP( {
                user,
                originalParams: {
                    query: {
                        _id: location1_id
                    },
                    fields: Object.keys( location1Data ),
                    data: location1Data,
                    stockLocationList: [stockLocation1]     //stockLocation2 will be deleted
                }
            } ) );
            should.not.exist( error );

            const expected = [stockLocation1_id];
            location1Data = await checkLocation( {
                query: {
                    _id: location1_id
                },
                expected
            } );

            [error, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'stocklocation',
                query: {
                    _id: stockLocation2_id
                }
            } ) );
            should.not.exist( error );
            expect( result ).to.deep.equalInAnyOrder( [] );
        } );

        it( '3.3. should NOT delete existing stocklocation because there is open order for this location', async function() {
            order.locationId = location1_id;
            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'stockdelivery',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( order )
            } ) );
            should.not.exist( error );

            [error] = await formatPromiseResult( saveWithStockLocationsP( {
                user,
                originalParams: {
                    query: {
                        _id: location1_id
                    },
                    fields: Object.keys( location1Data ),
                    data: location1Data,
                    stockLocationList: []
                }
            } ) );
            should.exist( error );
            expect( error.code ).to.be.equal( 'stocklocation_01' );

            const expected = [stockLocation1_id];
            location1Data = await checkLocation( {
                query: {
                    _id: location1_id
                },
                expected
            } );

            await checkStockLocation( {
                query: {
                    _id: stockLocation1_id
                },
                expected: _.omit( stockLocation1, ['_id'] )
            } );
        } );

        it( '3.4. should NOT delete existing stocklocation because there is instock item with quantity > 0', async function() {
            instockItem.locationId = location1_id;
            [error] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'instock',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( instockItem )
            } ) );
            should.not.exist( error );

            [error] = await formatPromiseResult( saveWithStockLocationsP( {
                user,
                originalParams: {
                    query: {
                        _id: location1_id
                    },
                    fields: Object.keys( location1Data ),
                    data: location1Data,
                    stockLocationList: []
                }
            } ) );
            should.exist( error );
            expect( error.code ).to.be.equal( 'stocklocation_02' );

            const expected = [stockLocation1_id];
            location1Data = await checkLocation( {
                query: {
                    _id: location1_id
                },
                expected
            } );

            await checkStockLocation( {
                query: {
                    _id: stockLocation1_id
                },
                expected: _.omit( stockLocation1, ['_id'] )
            } );
        } );

        it( '3.5. should NOT delete location with stocklocation containing order', async function() {
            [error] = await formatPromiseResult( deleteWithStockLocations( {
                user,
                originalParams: {
                    data: location1Data,
                    query: {
                        _id: location1_id
                    },
                    stockLocationList: [stockLocation1]
                }
            } ) );
            should.exist( error );
            expect( error.code ).to.be.equal( 'stocklocation_02' );

            const expected = [stockLocation1_id];
            location1Data = await checkLocation( {
                query: {
                    _id: location1_id
                },
                expected
            } );

            await checkStockLocation( {
                query: {
                    _id: stockLocation1_id
                },
                expected: _.omit( stockLocation1, ['_id'] )
            } );
        } );
    } );
    describe( 'Tear Down.', () => {
        it( 'restore country Mode', async () => {
            Y.config.doccirrus.Env.countryMode = countryMode || ['D'];
        } );
        it( 'remove test data', async () => {
            await deleteEntry( 'stocklocation', {_id: stockLocation1_id} );
            await deleteEntry( 'location', {_id: location1_id} );
            await deleteEntry( 'stockdelivery', {_id: orderId} );
            await deleteEntry( 'instock', {_id: instockItemId} );
        } );
    } );
} );