/**
 * User: md
 * Date: 23/06/2020  4:46 PM
 * (c) 2020, Doc Cirrus GmbH, Berlin
 */

/* global Y, should, it, describe */

const
    mongoose = require( 'mongoose' ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    user = Y.doccirrus.auth.getSUForLocal(),
    mainLocationId = Y.doccirrus.schemas.location.getMainLocationId(),
    defaultReceiptNumberingSchemeId = '000000000000000000000002',
    randomlyGeneratedId = new mongoose.Types.ObjectId().toString(),
    randomlyGeneratedIdNotInData = new mongoose.Types.ObjectId().toString();

const
    invoiceconfigurationFixture = {
        receiptsSchemes: [
            {
                _id: defaultReceiptNumberingSchemeId,
                "locationId": mainLocationId,
                "name": "Box1",
                "year": "2020B1-",
                "digits": 5,
                "nextNumber": 1
            }, {
                _id: randomlyGeneratedId,
                "locationId": mainLocationId,
                "name": "Box2",
                "year": "2020B2-",
                "digits": 5,
                "nextNumber": 1
            }]
    };

describe( 'Incash api tests', () => {

    describe( '0. Setup', () => {
        it( '0. posting incash settings should create sysnum entries (tested in sysnum-api-test)', async function() {
            this.timeout( 4000 );
            // read first to setup default values
            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'invoiceconfiguration',
                    action: 'get',
                    query: {_id: '000000000000000000000001'}
                } )
            );
            should.not.exist( err );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );

            //setup incash fixture
            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'invoiceconfiguration',
                    action: 'put',
                    query: {_id: '000000000000000000000001'},
                    data: {...invoiceconfigurationFixture, skipcheck_: true},
                    fields: ['receiptsSchemes']
                } )
            );
            should.not.exist( err );
        } );
    } );

    describe( '1. getNextIncashNo', () => {
        it( '1.1. should response with error for unknown location or cashbook ids', async () => {
            let [err] = await formatPromiseResult(
                Y.doccirrus.api.incash.getNextIncashNo( user, randomlyGeneratedIdNotInData, defaultReceiptNumberingSchemeId )
            );
            should.exist( err );
        } );

        it( '1.2. getting number for the first incash settings', async () => {
            let [err, nextNo] = await formatPromiseResult(
                Y.doccirrus.api.incash.getNextIncashNo( user, mainLocationId, defaultReceiptNumberingSchemeId )
            );
            should.not.exist( err );
            nextNo.should.be.equal( '2020B1-00002' );
        } );

        it( '1.3. getting number for the second incash settings', async () => {
            let [err, nextNo] = await formatPromiseResult(
                Y.doccirrus.api.incash.getNextIncashNo( user, mainLocationId, randomlyGeneratedId )
            );
            should.not.exist( err );
            nextNo.should.be.equal( '2020B2-00002' );
        } );

        it( '1.4. getting number for the first incash settings one several time', async () => {
            let [err, nextNo] = await formatPromiseResult(
                Y.doccirrus.api.incash.getNextIncashNo( user, mainLocationId, defaultReceiptNumberingSchemeId )
            );
            should.not.exist( err );
            nextNo.should.be.equal( '2020B1-00003' );

            [err, nextNo] = await formatPromiseResult(
                Y.doccirrus.api.incash.getNextIncashNo( user, mainLocationId, defaultReceiptNumberingSchemeId )
            );
            should.not.exist( err );
            nextNo.should.be.equal( '2020B1-00004' );
        } );

        it( '1.5. getting number for the second incash settings after first again', async () => {
            let [err, nextNo] = await formatPromiseResult(
                Y.doccirrus.api.incash.getNextIncashNo( user, mainLocationId, randomlyGeneratedId )
            );
            should.not.exist( err );
            nextNo.should.be.equal( '2020B2-00003' );
        } );
    } );

} );
