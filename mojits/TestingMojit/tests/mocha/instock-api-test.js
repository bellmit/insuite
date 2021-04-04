/*global Y, should, it, expect, describe, before, after */

let
    model = 'instock',
    mongoose = require( 'mongoose' ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    user = Y.doccirrus.auth.getSUForLocal(),
    supplierId = new mongoose.Types.ObjectId(),
    editorId = new mongoose.Types.ObjectId(),
    locationId = new mongoose.Types.ObjectId(),
    instockItemId = new mongoose.Types.ObjectId(),
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
    instockItem = {
        "_id": instockItemId,
        "phPriceSale": 16.9,
        "phPriceCost": 0,
        "vat": 0,
        "quantity": 5,
        "quantityOrdered": 0,
        "minimumQuantity": 0,
        "supplierId": supplierId,
        "notes": " ",
        "phPackSize": 25,
        "isDivisible": false,
        "automaticReorder": false,
        "ingredients": [],
        "editorId": editorId,
        "dateCreated": null,
        "dateUpdated": null,
        "phPZN": "1693614",
        "gtinCode": "0000100040807",
        "description": "Tonsiotren H Lutschtabl 60 Stk",
        "locationId": locationId,
        "stockLocationId": stockLocations[0]._id,
        "prdNo": "54824"
    };
    const countryMode = Y.config.doccirrus.Env.countryMode;
describe( 'Instock api tests.', function() {
    let
        mochaUtils = require( '../../server/mochaUtils' )( Y );

    before(function() {
        Y.config.doccirrus.Env.countryMode = ['CH'];
    });

    after( function() {
        Y.config.doccirrus.Env.countryMode = countryMode;
    } );
    describe( '0. Setup.', function() {
        it( '0.1. clean db', function( done ) {
            this.timeout( 20000 );
            mochaUtils.cleanDB( {user}, function( err ) {
                should.not.exist( err );
                done();
            } );
        } );
        it( '0.2. Insert location', async ( ) => {
            const
                locationData = mochaUtils.getLocationData( {
                    _id: locationId,
                    stockLocations,
                    countryCode: "CH",
                    countryMode: ["CH"],
                    zip: "1210"
                } );
            let [err, result] = await  formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( locationData )
            } ) );

            should.not.exist( err );
            should.exist( result );
            result.should.contain( locationId.toString() );

        } );
        it( '0.3. Insert supplier', async (  )  =>{
            const
                locationData = mochaUtils.getSupplierData( {
                    _id: supplierId
                } );
            var [err, result] = await  formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'basecontact',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( locationData )
            } ));
            should.not.exist( err );
            should.exist( result );
            result.should.contain( supplierId.toString() );

        } );
        it( '0.4. Insert editor', async ( ) => {
            const
                locationData = mochaUtils.getIdentityData( {
                    _id: editorId
                } );
            let [err, result] = await  formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( locationData )
            } ));

            should.not.exist( err );
            should.exist( result );
            result.should.contain( editorId.toString() );
        } );
        it( '0.5. Insert instockItem', async ( ) => {
            let [err, result] = await  formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( instockItem )
            } ));

            should.not.exist( err );
            should.exist( result );
            result.should.contain( instockItemId.toString() );
        } );
    } );

    describe( '1. instock api', function() {
        it( 'api.instockrequest.getWares', async function() {
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.api.instockrequest.getWares( {
                    user,
                    options: {
                        lean: true
                    }
                } ) );

            should.not.exist( err );
            result.result.length.should.equal( 1 );

            expect( result.result ).to.deep.have.same.members( [
                {
                    _id: instockItemId,
                    phPriceSale: 16.9,
                    phPriceSaleCatalog: 0,
                    phPriceCost: 0,
                    phPriceCostCatalog: 0,
                    phSalesStatus: "UNKNOWN",
                    vat: 0,
                    vatType: 0,
                    quantity: 5,
                    quantityOrdered: 0,
                    minimumQuantity: 0,
                    supplierId: supplierId,
                    notes: ' ',
                    phPackSize: 25,
                    isDivisible: false,
                    automaticReorder: false,
                    ingredients: [],
                    dateCreated: null,
                    dateUpdated: null,
                    phPZN: '1693614',
                    gtinCode: '0000100040807',
                    description: 'Tonsiotren H Lutschtabl 60 Stk',
                    locationId: locationId,
                    stockLocationId: stockLocations[0]._id,
                    prdNo: '54824',
                    supplier: {
                        _id: supplierId,
                        content: 'NEW LIFERANT2',
                        baseContactType: 'VENDOR'
                    },
                    editor: {
                        _id: editorId,
                        firstname: 'First name',
                        lastname: 'Last name'
                    },
                    location: {
                        _id: locationId,
                        locname: 'TestPraxis1',
                        stockLocations: stockLocations.map(sloc => sloc._id)
                    }
                }] );
        } );

        it('api.instockrequest.reduceWaresCount by _id', async ()=> {
            let result;
            let [err] = await formatPromiseResult(
                Y.doccirrus.api.instockrequest.reduceWaresCount( {
                    user,
                    data: {
                        waresToReduce: [
                            {
                                _id: instockItemId.toString(),
                                reduce: 1,
                                notes: `test comment`
                            }
                        ]
                    }
                } )
            ) ;
            should.not.exist( err );

             [err, result] = await  formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'get',
                query: {_id: instockItemId}
            } ));

            should.not.exist( err );
            result.length.should.equal( 1 );
            expect(result[0].quantity).equal(4);

        });

        it('api.instockrequest.reduceWaresCount by phPZN and stockLocationId', async ()=> {
            let result;
            let [err] = await formatPromiseResult(
                Y.doccirrus.api.instockrequest.reduceWaresCount( {
                    user,
                    data:{ waresToReduce: [
                        {
                            phPZN: instockItem.phPZN,
                            stockLocationId: instockItem.stockLocationId,
                            notes: `test comment`,
                            reduce: 1
                        }
                    ]}
                } )
            ) ;
            should.not.exist( err );

            [err, result] = await  formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'get',
                query: {_id: instockItemId}
            } ));

            should.not.exist( err );
            result.length.should.equal( 1 );
            expect(result[0].quantity).equal(3);

        });

        it('api.instockrequest.updateWares ', async ()=> {
            let result;
            const newSupplierId = new mongoose.Types.ObjectId();
            const newLocationId = new mongoose.Types.ObjectId();
            let [err] = await formatPromiseResult(
                Y.doccirrus.api.instockrequest.updateWares( {
                    user,
                    data: {
                        "_id": instockItemId,
                        "phPriceSale": 18,
                        "phPriceCost": 7,
                        "vat": 3,
                        "quantity": 5,
                        "quantityOrdered": 5,
                        "minimumQuantity": 0,
                        "supplierId": newSupplierId,
                        "notes": "update node",
                        "phPackSize": 27,
                        "isDivisible": true,
                        "automaticReorder": true,
                        "ingredients": [],
                        "editorId": editorId,
                        "dateCreated": null,
                        "dateUpdated": null,
                        "phPZN": "1693614111111",
                        "gtinCode": "00001000408071111",
                        "description": "Tonsiotren H Lutschtabl 60 Stk1",
                        "locationId": newLocationId,
                        "stockLocationId": stockLocations[1]._id,
                        "prdNo": "548241111"
                    }
                } )
            ) ;
            should.not.exist( err );

            [err, result] = await  formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: model,
                action: 'get',
                query: {_id: instockItemId}
            } ));

            should.not.exist( err );
            result.length.should.equal( 1 );
            expect( result ).to.deep.have.same.members( [{
                "_id": instockItemId,
                "phPriceSale": 18,
                "phPriceCost": 7,
                "vat": 3,
                "quantity": 5,
                "quantityOrdered": 5,
                "minimumQuantity": 0,
                "supplierId": newSupplierId,
                "notes": "update node",
                "phPackSize": 27,
                "isDivisible": true,
                "automaticReorder": true,
                "ingredients": [],
                "editorId": editorId,
                "dateCreated": null,
                "dateUpdated": null,
                "phPZN": "1693614111111",
                "gtinCode": "00001000408071111",
                "description": "Tonsiotren H Lutschtabl 60 Stk1",
                "locationId": newLocationId,
                "stockLocationId": stockLocations[1]._id,
                "prdNo": "548241111"
            }]);
        });
    } );


} );