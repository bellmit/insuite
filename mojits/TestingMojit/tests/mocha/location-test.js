/**
 * User: md
 * Date: 17/03/21  12:23
 * (c) 2021, Doc Cirrus GmbH, Berlin
 */
/*global Y, before, after, should, it, describe */

const
    util = require( 'util' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    getObjectIds = mochaUtils.getObjectIds,
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal(),
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    isCommercialNoAlreadyAssigned = promisifyArgsCallback( Y.doccirrus.api.location.isCommercialNoAlreadyAssigned );


describe( 'Location tests.', function() {
    after( async function() {
        await cleanDb( {user} );
    } );

    describe( 'CommercialNo (BSNR) tests', function() {
        let locationId_1, locationId_2, locationId_3;

        before( async function() {
            this.timeout( 5000 ); // 2000 not enough for posting several locations
            await cleanDb( {user} );

            [ locationId_1, locationId_2, locationId_3   ] = getObjectIds();

            //populate default values on read
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'settings',
                action: 'get',
                query: {}
            } );

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: locationId_1,
                    commercialNo: '001',
                    locname: 'loc001'
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: locationId_2,
                    commercialNo: '002',
                    locname: 'loc002'
                } ) )
            } );

        } );

        it( 'Check non existed commercialNo for new location should response without error', async function() {
            await isCommercialNoAlreadyAssigned({
                user,
                originalParams: {
                    locationId: null,
                    commercialNo: 'nonExisted'
                }
            }).catch( error => {
                should.not.exist( error );
            } );

        } );

        it( 'Check existed commercialNo for existed location should response without error', async function() {
            await isCommercialNoAlreadyAssigned({
                user,
                originalParams: {
                    locationId: locationId_1,
                    commercialNo: '001'
                }
            }).catch( error => {
                should.not.exist( error );
            } );

        } );

        it( 'Check existed commercialNo for new location should response with an error', async function() {
            await isCommercialNoAlreadyAssigned({
                user,
                originalParams: {
                    locationId: null,
                    commercialNo: '001'
                }
            }).catch( error => {
                should.exist( error );
                error.code.should.be.equal( '40000' );
            } );
        } );

        it( 'Should response with empty array in case no BSNR duplicates', async function() {
            const result = await Y.doccirrus.api.location.areThereSameCommercialNoAssigned( { user } );
            result.should.be.an( 'array' ).which.has.lengthOf( 0 );
        } );

        it( 'Should prevent writing location with same BSNR if not configured', async function() {
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'settings',
                action: 'put',
                query: {_id: '000000000000000000000001'},
                data: Y.doccirrus.filters.cleanDbObject( {
                    allowSameCommercialNo: false
                } ),
                fields: ['allowSameCommercialNo']
            } );

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: locationId_3,
                    commercialNo: '002', //same BSNR
                    locname: 'loc003'
                } ) )
            } ).catch( error => {
                should.exist( error );
                error.code.should.be.equal( '40000' );
            });
        } );


        it( 'Should response with array of found duplicates in case of BSNR duplicates', async function() {
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'settings',
                action: 'put',
                query: { _id: '000000000000000000000001' },
                data: Y.doccirrus.filters.cleanDbObject( {
                    allowSameCommercialNo: true
                } ),
                fields: [ 'allowSameCommercialNo' ]
            } );

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: locationId_3,
                    commercialNo: '002', //same BSNR
                    locname: 'loc003'
                } ) )
            } );

            const result = await Y.doccirrus.api.location.areThereSameCommercialNoAssigned( { user } );
            result.should.be.an( 'array' ).which.has.lengthOf( 1 );
            result[0]._id.should.be.equal( '002' );
            result[0].locations.should.be.an( 'array' ).and.contain.all.members( ['loc002', 'loc003'] );
        } );
    } );

} );
