/**
 * User: do
 * Date: 06.01.21  07:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, context, it, describe, before, after */

const
    mongoose = require( 'mongoose' ),
    ObjectId = mongoose.Types.ObjectId,
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    getContinuousDiagnosis = promisifyArgsCallback( Y.doccirrus.api.activity.getContinuousDiagnosis ),
    saveConfig = promisifyArgsCallback( Y.doccirrus.api.incaseconfiguration.saveConfig ),
    util = require( 'util' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

function postEntry( model, entry ) {
    return Y.doccirrus.mongodb.runDb( {
        user: user,
        model: model,
        action: 'post',
        data: Y.doccirrus.filters.cleanDbObject( entry )
    } );
}

function updateInCaseConfig( data ) {
    return saveConfig( {
        user: user,
        data: {
            inCaseConfig: data,
            masterTabConfigs: [],
            allowAdHoc: false
        }
    } );
}

describe( 'continuous diagnosis', async function() {

    before( async function() {
        await cleanDb( {user} );

        this.caseFolderId = new ObjectId();
        this.patientId = new ObjectId();
        this.employeeId = new ObjectId();
        this.firstLocationId = new ObjectId();
        this.secondLocationId = new ObjectId();
        this.firstLocationDiagnosesId = new ObjectId();
        this.secondLocationDiagnosesId = new ObjectId();

        await postEntry( 'location', mochaUtils.getLocationData( {_id: this.firstLocationId} ) );
        await postEntry( 'location', mochaUtils.getLocationData( {
            _id: this.secondLocationId,
            commercialNo: '310101300'
        } ) );
        await postEntry( 'patient', mochaUtils.getPatientData( {_id: this.patientId} ) );
        await postEntry( 'casefolder', mochaUtils.getCaseFolderData( {
            _id: this.caseFolderId,
            patientId: this.patientId.toString()
        } ) );

        const activityBase = {
            status: 'IMPORTED',
            employeeId: this.employeeId.toString(),
            caseFolderId: this.caseFolderId,
            patientId: this.patientId.toString()
        };

        const continuousDiagnosisBase = {
            ...activityBase,
            diagnosisCert: 'CONFIRM',
            diagnosisType: 'CONTINUOUS',
            diagnosisTreatmentRelevance: 'TREATMENT_RELEVANT',
            diagnosisSite: 'BOTH'
        };

        // BS1
        const scheinData1 = mochaUtils.getScheinData( {
            ...activityBase,
            locationId: this.firstLocationId,
            timestamp: mochaUtils.generateNewDate()
        } );
        scheinData1.status = 'IMPORTED';
        await postEntry( 'activity', scheinData1 );
        await postEntry( 'activity', mochaUtils.getDiagnosisActivity( {
            _id: this.firstLocationDiagnosesId,
            code: 'C00.1',
            ...continuousDiagnosisBase,
            locationId: this.firstLocationId,
            timestamp: mochaUtils.generateNewDate()
        } ) );

        // BS2
        const scheinData2 = mochaUtils.getScheinData( {
            ...activityBase,
            locationId: this.secondLocationId,
            timestamp: mochaUtils.generateNewDate()
        } );
        scheinData2.status = 'IMPORTED';
        await postEntry( 'activity', scheinData2 );
        await postEntry( 'activity', mochaUtils.getDiagnosisActivity( {
            _id: this.secondLocationDiagnosesId,
            ...continuousDiagnosisBase,
            locationId: this.secondLocationId,
            timestamp: mochaUtils.generateNewDate()
        } ) );
    } );
    after( async function() {
        await cleanDb( {user} );
    } );

    describe( 'getContinuousDiagnosis', async function() {
        context( 'with disabled (default) option getImportedContinuousDiagnosisFromCurrentLocation', async function() {
            before( async function() {
                this.timeout( 30000 );
                this.allImportedDiagnosisResult = await getContinuousDiagnosis( {
                    user: user,
                    query: {
                        to: mochaUtils.generateNewDate(),
                        patientId: this.patientId.toString(),
                        timestamp: mochaUtils.generateNewDate(),
                        locationId: this.firstLocationId
                    }
                } );
            } );

            it( 'should find all imported continuous diagnosis', async function() {
                const allImportedDiagosis = [this.firstLocationDiagnosesId, this.secondLocationDiagnosesId].map( id => id.toString() );
                this.allImportedDiagnosisResult.map( diagnosis => diagnosis._id.toString() ).should.have.members( allImportedDiagosis );
            } );

        } );

        context( 'with enabled option getImportedContinuousDiagnosisFromCurrentLocation', async function() {
            before( async function() {
                this.timeout( 30000 );
                await updateInCaseConfig( {getImportedContinuousDiagnosisFromCurrentLocation: true} );

                this.onlyImportedDiagnosisOfPassLocationResult = await getContinuousDiagnosis( {
                    user: user,
                    query: {
                        to: mochaUtils.generateNewDate(),
                        patientId: this.patientId.toString(),
                        timestamp: mochaUtils.generateNewDate(),
                        locationId: this.firstLocationId
                    }
                } );
            } );
            after( async function() {
                await updateInCaseConfig( {getImportedContinuousDiagnosisFromCurrentLocation: false} );
            } );

            it( 'should find only imported continuous diagnosis of same location', async function() {
                const onlyImportedDiagnosisOfLocation = [this.firstLocationDiagnosesId].map( id => id.toString() );
                this.onlyImportedDiagnosisOfPassLocationResult.map( diagnosis => diagnosis._id.toString() ).should.have.members( onlyImportedDiagnosisOfLocation );
            } );
        } );
    } );

} );