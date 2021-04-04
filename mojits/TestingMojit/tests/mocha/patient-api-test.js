/**
 * User: md
 * Date: 31/09/2020  2:27 PM
 * (c) 2020, Doc Cirrus GmbH, Berlin
 */

/* global Y, it, describe, before, after, expect */

const
    mongoose = require( 'mongoose' ),
    moment = require( 'moment' ),
    util = require( 'util' ),
    fs = require( 'fs' ),
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    user = Y.doccirrus.auth.getSUForLocal(),
    employeeId = new mongoose.Types.ObjectId().toString(),
    patientId = new mongoose.Types.ObjectId().toString(),
    someLocationId = new mongoose.Types.ObjectId().toString(),
    otherLocationId = new mongoose.Types.ObjectId().toString(),
    caseFolderId = new mongoose.Types.ObjectId().toString(),
    scheinId = new mongoose.Types.ObjectId().toString(),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    loadFromDBandPopulateCache = util.promisify( Y.doccirrus.api.settings.loadFromDBandPopulateCache ),
    deleteCheck = promisifyArgsCallback( Y.doccirrus.api.patient.deleteCheck ),
    employeePostP = promisifyArgsCallback( Y.doccirrus.api.employee.post ),
    lastScheinP = promisifyArgsCallback( Y.doccirrus.api.patient.lastSchein ),
    userForSomeLocation = {...user, id: 'nonSU4Some', locations: [{_id: someLocationId}]},
    userForOtherLocation = {...user, id: 'nonSU4Other', locations: [{_id: otherLocationId}]},
    scheinData = {
        "actType": "SCHEIN",
        "attachments": [],
        "subType": "",
        "time": "",
        "userContent": "ambulante Behandlung (ambulante Behandlung)",
        "partnerInfo": "",
        "explanations": "",
        "status": "VALID",
        "activities": [],
        "referencedBy": [],
        "formLang": "de",
        "formGender": "m",
        "apkState": "IN_PROGRESS",
        "forInsuranceType": "",
        "locationFeatures": "",
        "continuousIcds": [],
        "icds": [],
        "icdsExtra": [],
        "scheinQuarter": "1",
        "scheinYear": "2019",
        "scheinBillingArea": "00",
        "scheinType": "0101",
        "scheinSubgroup": "00",
        "content": "ambulante Behandlung (ambulante Behandlung)",
        "fk4235Set": [],
        "invoiceData": []
    };

const makeRandomNumber = ( len ) => {
    return Math.random().toString( 10 ).substring( 2, len + 2 );
};

async function postEntry( model, entry ) {
    return Y.doccirrus.mongodb.runDb( {
        user,
        model,
        action: 'post',
        data: Y.doccirrus.filters.cleanDbObject( entry )
    } );
}

describe( 'Y.doccirrus.api.patient', function() {

    before( async function() {
        await postEntry( 'location', mochaUtils.getLocationData( {
            _id: someLocationId,
            commercialNo: makeRandomNumber( 9 )
        } ) );
        await employeePostP( {
            user: user,
            data: {
                employee: Y.doccirrus.filters.cleanDbObject(
                    mochaUtils.getEmployeeData( {
                        _id: employeeId,
                        locations: [
                            {
                                _id: someLocationId,
                                locname: 'Test'
                            }
                        ]
                    } )
                ),
                identity: Y.doccirrus.filters.cleanDbObject(
                    mochaUtils.getIdentityData( {
                        _id: undefined,
                        username: `${makeRandomNumber( 9 )}`,
                        specifiedBy: employeeId
                    } )
                )
            }
        } );
        await postEntry( 'patient', mochaUtils.getPatientData( {_id: patientId} ) );
        await postEntry( 'casefolder', {
            ...mochaUtils.getCaseFolderData( {
                _id: caseFolderId,
                type: 'PUBLIC'
            } ), patientId
        } );
        await postEntry( 'activity', {
            ...scheinData,
            _id: scheinId,
            locationId: someLocationId,
            patientId,
            employeeId,
            caseFolderId,
            timestamp: moment().startOf( 'D' ).toISOString()
        } );

        //set Strict mode
        await Y.doccirrus.mongodb.runDb( {
            user,
            model: 'settings',
            action: 'update',
            query: {_id: '000000000000000000000001'},
            data: {
                $set: {
                    noCrossLocationAccess: true,
                    noCrossLocationCalendarAccess: false,
                    noCrossLocationPatientAccess: false
                }
            }
        } );

        //populate global cache
        await loadFromDBandPopulateCache( user, [] );
    } );
    after( async function() {
        //unset Strict mode
        await Y.doccirrus.mongodb.runDb( {
            user,
            model: 'settings',
            action: 'update',
            query: {_id: '000000000000000000000001'},
            data: {
                $set: {
                    noCrossLocationAccess: false,
                    noCrossLocationCalendarAccess: false,
                    noCrossLocationPatientAccess: false
                }
            }
        } );

        await cleanDb( {
            user: user,
            collections2clean: [
                'activity',
                'casefolder',
                'employee',
                'patient',
                'location'
            ]
        } );
    } );

    describe( 'check location restriction on count', function() {

        it( 'su user should see activities', async function() {
            //default mocha user has id: 'su'
            let result = await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'count',
                query: {patientId, caseFolderId}
            } );
            result.should.be.equal( 1 ); //1 Schein
        } );

        it( 'user with allowed location should see activities', async function() {
            let result = await Y.doccirrus.mongodb.runDb( {
                user: userForSomeLocation,
                model: 'activity',
                action: 'count',
                query: {patientId, caseFolderId}
            } );
            result.should.be.equal( 1 ); //1 Schein
        } );

        it( 'user with other location then in activity should not see it', async function() {
            let result = await Y.doccirrus.mongodb.runDb( {
                user: userForOtherLocation,
                model: 'activity',
                action: 'count',
                query: {patientId, caseFolderId}
            } );
            result.should.be.equal( 0 );
        } );
    } );

    describe( '.deleteCheck()', function() {

        it( 'user with allowed locations should get activities', async function() {
            let result = await deleteCheck( {
                user: userForSomeLocation,
                originalParams: {id: patientId}
            } );
            result.should.be.an( 'object' );
            result.status.should.be.equal( 1 );
        } );

        it( 'user with other locations should also get activities for deleting', async function() {
            let result = await deleteCheck( {
                user: userForSomeLocation,
                originalParams: {id: patientId}
            } );
            result.should.be.an( 'object' );
            result.status.should.be.equal( 1 );
        } );
    } );

    describe( 'getScheinsFromActivities', function() {
        const [newCaseFolderId, latestScheinId, earlierScheinId] = mochaUtils.getObjectIds(),
            suiteData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/pvs-invoice/invoice-errors.json`, 'utf8' ) ),
            treatments = suiteData.activities.filter( a => a.actType === 'TREATMENT' ),
            latestSchein = {
                ...scheinData,
                _id: latestScheinId,
                locationId: someLocationId,
                patientId,
                employeeId,
                caseFolderId: newCaseFolderId.toString(),
                timestamp: moment( '2021-01-30T23:00:00.000Z' ).toISOString()
            },
            earlierSchein = {
                ...scheinData,
                _id: earlierScheinId,
                locationId: someLocationId,
                patientId,
                employeeId,
                caseFolderId: newCaseFolderId.toString(),
                timestamp: moment( '2021-01-12T23:00:00.000Z' ).toISOString()
            };
        const earlierTreatments = [];

        before( async function() {
            await postEntry( 'casefolder', {
                ...mochaUtils.getCaseFolderData( {
                    _id: newCaseFolderId,
                    type: 'PUBLIC'
                } ), patientId
            } );

            await postEntry( 'activity', latestSchein );

            let treatmentTime = 1612188000000;   // 2021-02-01T14:00:00.000Z
            for( let treatment of treatments ) {
                treatment._id = new mongoose.Types.ObjectId();
                treatment.locationId = someLocationId;
                treatment.patientId = patientId;
                treatment.employeeId = employeeId;
                treatment.caseFolderId = newCaseFolderId.toString();
                treatment.timestamp = new Date( treatmentTime ).toISOString();
                treatmentTime += 300000;    // plus 5 min
                await postEntry( 'activity', treatment );
            }
        } );

        it( 'With one schein should return same result as lastSchein function', async function() {
            this.timeout( 0 );
            const lastScheinResult = await lastScheinP( {
                user,
                query: {
                    patientId: treatments[0].patientId,
                    locationId: treatments[0].locationId,
                    timestamp: treatments[0].timestamp,
                    caseFolderId: treatments[0].caseFolderId
                }
            } );

            const scheinsFromActivitiesResult = await Y.doccirrus.api.patient.getScheinsFromActivities( {
                user,
                activities: treatments
            } );

            delete scheinsFromActivitiesResult[0].relatedActivitiesIds;

            expect( lastScheinResult ).to.deep.equalInAnyOrder( scheinsFromActivitiesResult );
        } );

        before( async function() {
            await postEntry( 'activity', earlierSchein );
            let treatmentTime = 1610546400000;   // 2021-01-13T14:00:00.000Z
            for( let treatment of treatments ) {
                const t = {
                    ...treatment,
                    _id: new mongoose.Types.ObjectId(),
                    timestamp: new Date( treatmentTime ).toISOString()
                };
                earlierTreatments.push( t );
                await postEntry( 'activity', t );
                treatmentTime += 300000;    // plus 5 min
            }
        } );
        it( 'Should return two scheins', async function() {
            const result = await Y.doccirrus.api.patient.getScheinsFromActivities( {
                user,
                activities: treatments.concat( earlierTreatments )
            } );

            const schienIds = result.map( r => r._id.toString() );
            expect( schienIds ).to.be.equalInAnyOrder( [latestScheinId.toString(), earlierScheinId.toString()] );
        } );

        it( 'Result scheins should contain related activities', async function() {
            const result = await Y.doccirrus.api.patient.getScheinsFromActivities( {
                user,
                activities: treatments.concat( earlierTreatments )
            } );

            const latest = result.find( r => r._id.toString() === latestScheinId.toString() ),
                earliest = result.find( r => r._id.toString() === earlierScheinId.toString() );

            expect( latest.relatedActivitiesIds.map( a => a._id.toString() ) ).to.be.equalInAnyOrder( treatments.map( t => t._id.toString() ) );
            expect( earliest.relatedActivitiesIds.map( a => a._id.toString() ) ).to.be.equalInAnyOrder( earlierTreatments.map( t => t._id.toString() ) );
        } );
    } );

} );
