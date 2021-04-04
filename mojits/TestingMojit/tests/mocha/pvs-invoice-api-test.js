/**
 * User: md
 * Date: 16/12/2020  11:30
 * (c) 2020, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, before, after,it, describe, expect*/

const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    fs = require( 'fs' ),
    moment = require( 'moment' ),
    util = require( 'util' ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

describe( 'PVS invoice testing', function() {

    const
        suiteData = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/pvs-invoice/invoice-errors.json`, 'utf8' ) ),
        validate = promisifyArgsCallback( Y.doccirrus.api.pvslog.validate ),
        approve = promisifyArgsCallback( Y.doccirrus.api.invoicelog.approve ),
        [ patientId, locationId, caseFolderId, employeeId, scheinId, treatment_1_Id, treatment_2_Id, pvsLogId, practiceId ] = mochaUtils.getObjectIds(),
        postData = ( model, data ) => {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'post',
                data: {...data, skipcheck_: true}
            } );
        },
        getData = ( model, query, options ) => {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model,
                action: 'get',
                query,
                options
            } );
        },
        waitForTime = async ( self, delay = 1000 ) => {
            self.timeout( 2000 + delay ); //2000 is default mocha timeout
            await formatPromiseResult( new Promise( ( resolve ) => { setTimeout( resolve, delay ); } ) );
        },
        getReportingData = ( status ) => {
            return [
                { actType: 'PKVSCHEIN', activityId: scheinId, status },
                { actType: 'TREATMENT', activityId: treatment_1_Id, status },
                { actType: 'TREATMENT', activityId: treatment_2_Id, status }
            ];
        };

    const
        EMPLOYEE_FIRST = 'testFirst',
        EMPLOYEE_LAST = 'testLast';
    let getLocalTenantId_Org,
        getSUForLocal_Org,
        del_Mocked;


    before( async function() {
        this.timeout( 10000 );
        await cleanDb( {user} );

        //mock stuff to run reporting processing for mocha tenant
        getLocalTenantId_Org = Y.doccirrus.auth.getLocalTenantId;
        Y.doccirrus.auth.getLocalTenantId = () => { return user.tenantId; };
        getSUForLocal_Org = Y.doccirrus.auth.getSUForLocal;
        Y.doccirrus.auth.getSUForLocal = () => { return user; };

        del_Mocked = Y.doccirrus.cacheUtils.adapter.del;
        Y.doccirrus.cacheUtils.adapter.del = Y.doccirrus.cacheUtils.adapter._del;

        Y.doccirrus.insight2.syncReportingManager.clearStarted( 1000 );
        Y.doccirrus.insight2.syncReportingManager.runOnStart( () => {} );

        //setup general data
        await postData( 'location', mochaUtils.getLocationData( {
            _id: locationId
        } ) );
        await postData( 'patient', mochaUtils.getPatientData( {
            _id: patientId,
            dataTransmissionToPVSApproved: true,
            insuranceStatus: [ {
                ...suiteData.insuranceStatusPrivate,
                locationId
            } ]
        } ) );
        await postData( 'casefolder', mochaUtils.getCaseFolderData( {
            patientId: patientId,
            _id: caseFolderId,
            type: "PRIVATE"
        } ) );
        await postData( 'employee', mochaUtils.getEmployeeData( {
            _id: employeeId,
            type: 'PHYSICIAN',
            firstname: EMPLOYEE_FIRST,
            lastname: EMPLOYEE_LAST,
            locations: [ {_id: locationId, locname: 'test' } ]
        } ) );

        // need for correct reporting generation
        await postData( 'practice', {
            ...suiteData.practice,
            _id: practiceId
        } );

        // post activities
        await postData( 'activity', {
            ...suiteData.activities[0],
            _id: scheinId,
            patientId,
            employeeId,
            locationId,
            caseFolderId,
            timestamp: new Date()
        } );

        await postData( 'activity', {
            ...suiteData.activities[1],
            _id: treatment_1_Id,
            patientId,
            employeeId,
            locationId,
            caseFolderId,
            timestamp: new Date()
        } );

        await postData( 'activity', {
            ...suiteData.activities[2],
            _id: treatment_2_Id,
            patientId,
            employeeId,
            locationId,
            caseFolderId,
            timestamp: new Date()
        } );

        await postData( 'pvslog', {
            ...suiteData.pvsLog,
            _id: pvsLogId,
            startDate: moment().add( -1, 'day' ).startOf( 'day' ),
            endDate: moment().endOf( 'day' )
        } );

        let invoiiceConfigurationData = suiteData.invoiceConfiguration;
        invoiiceConfigurationData.padxSettings[0].locations[0]._id = locationId;
        invoiiceConfigurationData.padxSettings[0].employees[0]._id = employeeId;
        await postData( 'invoiceconfiguration', invoiiceConfigurationData );

        // posted activity normally trigger several rule errors, but in this suite rule engine is skipped by isMocha === true flag
        // so resulted rule logs just posted manually
        let ruleData = {
            ...suiteData.ruleLogs[0],
            patientId,
            caseFolderId,
            locationId,
            timestamp: new Date()
        };
        ruleData.affectedActivities[0].id = treatment_1_Id;
        ruleData.affectedActivities[1].id = treatment_2_Id;
        await postData( 'rulelog', ruleData );
    } );

    after( async function() {
        await Y.doccirrus.mongodb.runDb( {
            user,
            model: 'activity',
            action: 'delete',
            query: { patientId },
            options: {
                override: true
            }
        } );

        //wait a bit to finish activity deletion, to not delete location in between
        await waitForTime( this, 500 );

        Y.doccirrus.auth.getLocalTenantId = getLocalTenantId_Org;
        Y.doccirrus.auth.getSUForLocal = getSUForLocal_Org;
        Y.doccirrus.cacheUtils.adapter.del = del_Mocked;

        await cleanDb( {user} );
    } );

    describe( 'collect ruleLogs during invoicing and extend them by employee name', function() {
        it( `run validate should respond without error`, async function() {
            this.timeout( 30000 );

            let [err] = await formatPromiseResult( validate( {
                user,
                originalParams: {
                    id: pvsLogId,
                    preValidation: true
                }
            } ) );
            //here callback is thrown earlier and then progress tracked using events
            //catch those events is not necessary for this particular test suite
            should.not.exist( err );
        } );

        it( `invoice validate process should generate certain number of invoice entries`, async function() {
            this.timeout( 6000 );
            this.retries( 10 );
            await waitForTime( this, 4000 );

            let [err, result] = await formatPromiseResult( getData( 'invoiceentry', {invoiceLogId: pvsLogId} ) );
            should.not.exist( err );
            result.should.be.an( 'array' ).that.has.lengthOf( 4 ); //header, patient, schein, ERROR

            let errorEntry = result.find( el => el.type === 'ERROR' );
            errorEntry.should.be.an( 'object' );
            (errorEntry.data.patientId).should.be.equal( patientId );
            (errorEntry.data.employeeName).should.be.equal( `${EMPLOYEE_LAST}, ${EMPLOYEE_FIRST}` );

        } );
    } );

    describe( 'updating activity status during invoicing should be reflected in reporting collection', function() {
        it( `after validate reporting collection should have activities with status VALID`, async function() {
            await waitForTime( this, 1500 );
            this.retries( 10 );

            let [err, result] = await formatPromiseResult( getData( 'reporting',
                {activityId: {$in: [treatment_1_Id, treatment_2_Id, scheinId]}},
                {select: {activityId: 1, status: 1, actType: 1}} )
            );
            should.not.exist( err );
            expect( result.map( el => {
                delete el._id;
                return el;
            } ) ).to.deep.equalInAnyOrder( getReportingData( 'VALID' ) );
        } );

        it( `run approve should respond without error`, async function() {
            let [err] = await formatPromiseResult( approve( {
                    user,
                    originalParams: {
                        id: pvsLogId,
                        invoiceType: 'PVS'
                    }
                } )
            );
            should.not.exist( err );
        } );

        it( `after approve reporting collection should have activities with status APPROVED`, async function() {
            await waitForTime( this, 1500 );
            this.retries( 10 );

            let [err, result] = await formatPromiseResult( getData( 'reporting',
                {activityId: {$in: [treatment_1_Id, treatment_2_Id, scheinId]}},
                {select: {activityId: 1, status: 1, actType: 1}} )
            );
            should.not.exist( err );
            expect( result.map( el => {
                delete el._id;
                return el;
            } ) ).to.deep.equalInAnyOrder( getReportingData( 'APPROVED' ) );
        } );
    } );
} );



