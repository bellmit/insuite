/**
 * User: pi
 * Date: 10/03/16  15:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, describe, it, afterEach, before*/

const
    {formatPromiseResult} = require( 'dc-core' ).utils,
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    util = require( 'util' ),
    mongoose = require( 'mongoose' ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

describe( 'basecontact-api.server.js', function() {
    describe( 'doesVendorHaveOrdersOrDeliveries', () => {

        afterEach( 'clean db', async () => {
            await cleanDb( {user} );
        } );

        describe( 'given valid basecontactId and associated stockorders', () => {
            const id = "5eb037344c6cc93fd6630ce9";
            before( async () => {
                //TODO: FIX LOCATIONID
                const stockorder = {
                    "mediaId": "",
                    "basecontactId": "5eb037344c6cc93fd6630ce9",
                    "formId": "5c9513c12baebe6dfb3ee2cf",
                    "locationId": "000000000000000000000001",
                    "stocks": [
                        {
                            "checked": false,
                            "quantityDelivered": 1,
                            "phPriceSale": 16.9,
                            "phPriceSaleCatalog": 16.9,
                            "phPriceCost": 0,
                            "phPriceCostCatalog": 0,
                            "nota": "",
                            "patients": [],
                            "isDivisible": false,
                            "dividedQuantity": 0,
                            "_id": "5ef4a090ece1de0a9e8a08cb",
                            "stockType": "instock",
                            "references": "5ef4a08fece1de0a9e8a08c8",
                            "quantity": 1,
                            "stockLocationId": "5e9f03248e1520f059ce31e9"
                        }
                    ],
                    "editorId": "5bf28673e151410df85edb03",
                    "orderNo": "1202-347",
                    "status": "created",
                    "dateCreated": "2020-06-25T13:03:12.000Z"
                };

                const cleanStockorder = Y.doccirrus.filters.cleanDbObject( stockorder );

                let [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'stockorders',
                        action: 'post',
                        data: cleanStockorder
                    } )
                );

                if( err ) {
                    throw err;
                }
            } );

            it( 'should return result with hasOrdersOrDeliveries: true', async () => {
                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.api.basecontact.doesVendorHaveOrdersOrDeliveries( {
                        query: {basecontactId: id},
                        user
                    } )
                );
                should.not.exist( err );
                should.exist( result );
                result.should.deep.equal( {hasOrdersOrDeliveries: true} );
            } );
        } );

        describe( 'given valid basecontactId, no associated stockorders, but associated stockdeliveries', () => {
            const id = "5eb037344c6cc93fd6630ce9";
            before( async () => {
                //TODO: FIX LOCATIONID
                const stockdelivery = {
                    "mediaId": "5ef0a55a9e3c6d1c1e205a9b",
                    "basecontactId": "5eb037344c6cc93fd6630ce9",
                    "formId": "5c9513c12baebe6dfb3ee2cf",
                    "locationId": "000000000000000000000001",
                    "stocks": [
                        {
                            "checked": true,
                            "isProcessed": true,
                            "phPriceSale": 0,
                            "phPriceSaleCatalog": 0,
                            "phPriceCost": 0,
                            "phPriceCostCatalog": 0,
                            "nota": "",
                            "patients": [],
                            "_id": "5ef0a5569e3c6d1c1e205a89",
                            "quantityDelivered": 1,
                            "stockType": "instock",
                            "references": "5ef0a5569e3c6d1c1e205a86",
                            "quantity": 1,
                            "stockLocationId": "5e9f03248e1520f059ce31e9",
                            "editorId": "5bf28673e151410df85edb03"
                        }
                    ],
                    "editorId": "5bf28673e151410df85edb03",
                    "orderNo": "1202-346",
                    "status": "arrived",
                    "dateCreated": "2020-06-22T12:34:30.171Z",
                    "dateSent": "2020-06-22T12:34:33.806Z",
                    "dateArrived": "2020-06-22T12:34:37.540Z",
                    "orderId": "5ef0a5569e3c6d1c1e205a88"
                };

                const cleanDelivery = Y.doccirrus.filters.cleanDbObject( stockdelivery );

                let [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'stockdelivery',
                        action: 'post',
                        data: cleanDelivery
                    } )
                );

                if( err ) {
                    throw err;
                }

            } );

            it( 'should return result with hasOrdersOrDeliveries: true', async () => {
                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.api.basecontact.doesVendorHaveOrdersOrDeliveries( {
                        query: {basecontactId: id},
                        user
                    } )
                );
                should.not.exist( err );
                should.exist( result );
                result.should.deep.equal( {hasOrdersOrDeliveries: true} );
            } );
        } );

        describe( 'given valid basecontactId, no associated stockorders and stockdeliveries', () => {
            const randomId = new mongoose.Types.ObjectId().toString();
            it( 'should return result with hasOrdersOrDeliveries: false', async () => {
                let [err, result] = await formatPromiseResult(
                    Y.doccirrus.api.basecontact.doesVendorHaveOrdersOrDeliveries( {
                        query: {basecontactId: randomId},
                        user
                    } )
                );
                should.not.exist( err );
                should.exist( result );
                result.should.deep.equal( {hasOrdersOrDeliveries: false} );

            } );
        } );
    } );
} );
