/**
 * User: pi
 * Date: 24/02/17  11:15
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, it, describe */

const
    model = 'sysnum',
    async = require( 'async' ),
    incTimes = Array.apply( null, {length: 10} ).map( Number.call, Number ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    util = require( 'util' ),
    user = Y.doccirrus.auth.getSUForLocal();

describe( 'Sysnum api tests.', function() {
    describe( '1. Check api.sysnum.getNextDcCustomerNo .', function() {
        describe( '1.1. New entry should be created with default number value, if sysnum entry for dcCustomerNo is not exists.', function() {
            it( '1.1.1. Sysnum entry for dcCustomerNo should be default item.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model,
                    query: {
                        _id: Y.doccirrus.schemas.sysnum.DC_CUSTOMER_NO_ID
                    },
                    action: 'get'
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    result[0].number.should.equal( Y.doccirrus.schemas.sysnum.START_DC_CUSTOMER_NO );
                    done();
                } );
            } );
            it( '1.1.2. Sysnum entry for dcCustomerNo can not be created.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model,
                    data: {
                        _id: Y.doccirrus.schemas.sysnum.DC_CUSTOMER_NO_ID,
                        number: Y.doccirrus.schemas.sysnum.START_DC_CUSTOMER_NO,
                        skipcheck_: true
                    },
                    action: 'post'
                }, ( err ) => {
                    should.exist( err );
                    err.should.be.an( 'object' );
                    err.code.should.be.equal( 11000 );
                    err.name.should.be.equal( 'MongoError' );
                    done();
                } );
            } );
            it( '1.1.3. Sysnum entry for dcCustomerNo can be created.', function( done ) {
                Y.doccirrus.api.sysnum.getNextDcCustomerNo( {
                    user,
                    callback( err, result ) {
                        should.not.exist( err );
                        should.exist( result );
                        should.exist( result );
                        result.should.equal( Y.doccirrus.schemas.sysnum.START_DC_CUSTOMER_NO + 1 );
                        done();
                    }
                } );
            } );
            it( '1.1.4. Sysnum entry for dcCustomerNo should have correct number.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model,
                    query: {
                        _id: Y.doccirrus.schemas.sysnum.DC_CUSTOMER_NO_ID
                    },
                    action: 'get'
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    result[0].number.should.be.equal( Y.doccirrus.schemas.sysnum.START_DC_CUSTOMER_NO + 1 );
                    done();
                } );
            } );
            it( '1.1.5. Should be possible to inc dcCustomerNo several times at same time.', function( done ) {
                this.timeout( 10000 );
                async.each( incTimes, ( number, done ) => {
                    Y.doccirrus.api.sysnum.getNextDcCustomerNo( {
                        user,
                        callback: done
                    } );

                }, ( err ) => {
                    should.not.exist( err );
                    done();
                } );
            } );
            it( '1.1.4. Sysnum entry for dcCustomerNo should have correct number.', function( done ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model,
                    query: {
                        _id: Y.doccirrus.schemas.sysnum.DC_CUSTOMER_NO_ID
                    },
                    action: 'get'
                }, ( err, result ) => {
                    should.not.exist( err );
                    should.exist( result );
                    result.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    result[0].number.should.be.equal( Y.doccirrus.schemas.sysnum.START_DC_CUSTOMER_NO + 11 );
                    done();
                } );
            } );
        } );
    } );

    describe( '2. Check sysnum.getNextInCashNo.', function() {
        const
            getNextInCashNo = util.promisify( Y.doccirrus.schemas.sysnum.getNextInCashNo ),
            mainLocationId = Y.doccirrus.schemas.location.getMainLocationId(),
            defaultReceiptNumberingSchemeId = '000000000000000000000002',
            randomlyGeneratedId = '5edfa873b4aa1d59e8eb91c2';

        it( '2.1. possible to create several receipt number settings for same location', async function() {
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

            //put one new Receipt Number setting for same location and update existed one
            [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'invoiceconfiguration',
                    action: 'put',
                    query: {_id: '000000000000000000000001'},
                    data: {
                        skipcheck_: true,
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
                    },
                    fields: ['receiptsSchemes']
                } )
            );
            should.not.exist( err );

            let
                did1 = Y.doccirrus.schemas.sysnum.getReceiptsSchemeCounterDomain( mainLocationId, defaultReceiptNumberingSchemeId ),
                did2 = Y.doccirrus.schemas.sysnum.getReceiptsSchemeCounterDomain( mainLocationId, randomlyGeneratedId ),
                sysnums;

            [err, sysnums] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'sysnum',
                    action: 'get',
                    query: {partition: {$in: [did1, did2]}}
                } )
            );

            should.not.exist( err );

            //updating invoiceconfiguration should create new autoincrement counter for new Receipt Numbering Scheme and keep existed
            sysnums.should.be.an( 'array' ).which.has.lengthOf( 2 );
        } );

        it( '2.2. possible to separately get next number for each receipt scheme number setting', async function() {
            let
                did1 = Y.doccirrus.schemas.sysnum.getReceiptsSchemeCounterDomain( mainLocationId, defaultReceiptNumberingSchemeId ),
                did2 = Y.doccirrus.schemas.sysnum.getReceiptsSchemeCounterDomain( mainLocationId, randomlyGeneratedId ),
                sysnum1,
                sysnum2;

            //find sysnums entries crated for Receipt Number settings

            let [err, sysnums] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'sysnum',
                    action: 'get',
                    query: {partition: did1}
                } )
            );
            should.not.exist( err );
            sysnums.should.be.an( 'array' ).which.has.lengthOf( 1 );
            sysnum1 = {...sysnums[0]};

            [err, sysnums] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'sysnum',
                    action: 'get',
                    query: {partition: did2}
                } )
            );
            should.not.exist( err );
            sysnums.should.be.an( 'array' ).which.has.lengthOf( 1 );
            sysnum2 = {...sysnums[0]};

            let nextNo;
            [err, nextNo] = await formatPromiseResult( getNextInCashNo( user, sysnum1 ) );
            should.not.exist( err );
            nextNo.number.should.be.equal( 2 );

            [err, nextNo] = await formatPromiseResult( getNextInCashNo( user, sysnum2 ) );
            should.not.exist( err );
            nextNo.number.should.be.equal( 2 );

            [err, nextNo] = await formatPromiseResult( getNextInCashNo( user, sysnum1 ) );
            should.not.exist( err );
            nextNo.number.should.be.equal( 3 );
        } );
    } );
} );