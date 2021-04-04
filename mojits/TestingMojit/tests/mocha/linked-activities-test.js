/*global Y, should, it, describe, before, after, context, expect*/
const
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    util = require( 'util' ),
    mongoose = require( 'mongoose' ),
    fs = require( 'fs' ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

const postEntry = async ( model, entry ) => {
    return Y.doccirrus.mongodb.runDb( {
        user: user,
        model: model,
        action: 'post',
        data: {...entry, skipcheck_: true}
    } );
};

const getEntry = async ( model, query ) => {
    return await Y.doccirrus.mongodb.runDb( {
        user: user,
        action: 'get',
        model: model,
        query: query
    } );
};

const deleteEntry = async ( model, query ) => {
    return await Y.doccirrus.mongodb.runDb( {
        user: user,
        action: 'delete',
        model: model,
        query: query
    } );
};

const putEntry = async ( model, entryId, data ) => {
    return await Y.doccirrus.mongodb.runDb( {
        user: user,
        action: 'put',
        model: model,
        query: {
            _id: entryId
        },
        fields: Object.keys( data ),
        data: {...data, skipcheck_: true}
    } );
};

const countEntry = async ( model, query ) => {
    return await Y.doccirrus.mongodb.runDb( {
        user: user,
        action: 'count',
        model: model,
        query: query
    } );
};

const waitForUpdatedActivities = async ( self, timeToWait = 4000 ) => {
    self.timeout( self.timeout() + timeToWait );
    await new Promise( ( resolve ) => {
        setTimeout( resolve, timeToWait );
    } );
};

const getFixtureData = ( fileName ) => {
    let fixture;
    try {
        fixture = JSON.parse( fs.readFileSync( `${__dirname}/../fixtures/linked-activity/${fileName}`, 'utf8' ) );
    } catch( err ) {
        should.not.exist( err );
    }

    expect( fixture ).to.be.an( "object" );
    return fixture;
};

describe( 'Linked Activities test', function() {
    let
        countryMode;

    before( async function() {
        this.timeout( 10000 );
        await cleanDb( {
            user
        } );

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

        this.patientId = new mongoose.Types.ObjectId().toString();
        this.caseFolderId = new mongoose.Types.ObjectId().toString();
        this.employeeId = new mongoose.Types.ObjectId().toString();
        this.activitySId = new mongoose.Types.ObjectId().toString();
        this.activityTId = new mongoose.Types.ObjectId().toString();
        this.activityDId = new mongoose.Types.ObjectId().toString();
        this.activityTreatmentSideId = new mongoose.Types.ObjectId().toString();
        this.locationId = new mongoose.Types.ObjectId().toString();
        this.catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
            actType: 'TREATMENT',
            short: 'TARMED'
        } );
        this.DiagnosisCatalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptor( {
            actType: 'DIAGNOSIS',
            short: 'TESS-KAT'
        } );
        const catalogData = getFixtureData( 'data-for-catalogs.json' );
        this.mainCatalogEntry = {
            ...catalogData.mainCatalogEntry,
            "catalog": this.catalogDescriptor && this.catalogDescriptor.filename || ''
        };
        this.secondCatalogEntry = {
            ...catalogData.secondCatalogEntry,
            "catalog": this.catalogDescriptor && this.catalogDescriptor.filename || ''
        };
        this.sideRelatedMainCatalogEntry = {
            ...catalogData.sideRelatedMainCatalogEntry,
            "catalog" : this.catalogDescriptor && this.catalogDescriptor.filename || ''
        };
        this.sideRelatedSecondCatalogEntry = {
            ...catalogData.sideRelatedSecondCatalogEntry,
            "catalog" : this.catalogDescriptor && this.catalogDescriptor.filename || ''
        };
        this.catalogDiagnosisEntry = {
            ...catalogData.diagnosis,
            "catalog": this.DiagnosisCatalogDescriptor && this.DiagnosisCatalogDescriptor.filename || ''
        };

        await postEntry( 'location', Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
            _id: this.locationId,
            countryMode: 'CH',
            countryCode: 'CH',
            zip: 1210,
            cantonCode: '3'
        } ) ) );
        await postEntry( 'employee', Y.doccirrus.filters.cleanDbObject( mochaUtils.getEmployeeData( {
            _id: this.employeeId,
            countryMode: 'CH'
        } ) ) );
        await postEntry( 'patient', Y.doccirrus.filters.cleanDbObject( mochaUtils.getPatientData( {
            firstname: 'test',
            lastname: 'patient',
            _id: this.patientId,
            countryMode: 'CH',
            cantonCode: '3'
        } ) ) );
        await postEntry( 'catalog', Y.doccirrus.filters.cleanDbObject( this.mainCatalogEntry ) );
        await postEntry( 'catalog', Y.doccirrus.filters.cleanDbObject( this.secondCatalogEntry ) );
        await postEntry( 'catalog', Y.doccirrus.filters.cleanDbObject( this.sideRelatedMainCatalogEntry ) );
        await postEntry( 'catalog', Y.doccirrus.filters.cleanDbObject( this.sideRelatedSecondCatalogEntry ) );
    } );
    after( async function() {
        await cleanDb( {
            user
        } );
        Y.config.doccirrus.Env.countryMode = countryMode || ['D'];
    } );

    describe( 'save TREATMENT activities.', function() {
        before( async function() {
            let
                caseFolderData = mochaUtils.getCaseFolderData( {
                    type: 'PRIVATE_CH',
                    patientId: this.patientId.toString(),
                    _id: this.caseFolderId,
                    countryMode: 'CH'
                } ),
                activityData = mochaUtils.getPkvScheinActivity( {
                    _id: this.activitySId,
                    employeeId: this.employeeId.toString(),
                    patientId: this.patientId.toString(),
                    caseFolderId: this.caseFolderId.toString(),
                    locationId: this.locationId
                } ),
                treatmentData = mochaUtils.getTreatmentActivity( {
                    _id: this.activityTId,
                    "code": "00.0010",
                    "treatmentCategory": "Hauptleistung",
                    "divisionCode": 1,
                    "divisionText": "Sprechzimmer",
                    "medicalText": "Beinhaltet alle ärztlichen Leistungen, die der Facharzt in seiner Praxis oder der Arzt bei ambulanten Patienten im Spital ohne oder mit einfachen Hilfsmitteln (etwa Inhalt 'Besuchskoffer') am Patienten hinsichtlich der Beschwerden und Erscheinungen erbringt, derentwegen dieser zum Facharzt kommt, bzw. gebracht wird und hinsichtlich der Beschwerden und Erscheinungen, die während der gleichen Behandlungsdauer auftreten.\r\n\r\nBeinhaltet Begrüssung, Verabschiedung, nicht besonders tarifierte Besprechungen und Untersuchungen, nicht besonders tarifierte Verrichtungen (z.B.: bestimmte Injektionen, Verbände usw.), Begleitung zu und Übergabe (inkl. Anordnungen) an Hilfspersonal betreffend Administration, technische und kurative Leistungen, Medikamentenabgabe (in Notfallsituation u/o als Starterabgabe), auf Konsultation bezogene unmittelbar vorgängige/anschliessende Akteneinsicht/Akteneinträge.",
                    "technicalText": "",
                    "catalogShort": "TARMED",
                    "hierarchyRules": [
                        {
                            "checked": true,
                            "title": "+ Zuschlag für hausärztliche Leistungen in der Arztpraxis",
                            "seq": "00.0015",
                            "validFrom": "Mon Jan 01 2018 00:00:00 GMT+0100 (Central European Standard Time)",
                            "validUntil": null
                        },
                        {
                            "checked": false,
                            "title": "+ Konsultation bei Personen über 6 Jahren und unter 75 Jahren, jede weiteren 5 Min. (Konsultationszuschlag)",
                            "seq": "00.0020",
                            "validFrom": "Mon Jan 01 2018 00:00:00 GMT+0100 (Central European Standard Time)",
                            "validUntil": null
                        },
                        {
                            "checked": false,
                            "title": "+ Konsultation bei Kindern unter 6 Jahren und Personen über 75 Jahren, jede weiteren 5 Min.",
                            "seq": "00.0025",
                            "validFrom": "Mon Jan 01 2018 00:00:00 GMT+0100 (Central European Standard Time)",
                            "validUntil": null
                        },
                        {
                            "checked": false,
                            "title": "+ Konsultation bei Personen über 6 Jahren und unter 75 Jahren mit einem erhöhten Behandlungsbedarf, jede weiteren 5 Min.",
                            "seq": "00.0026",
                            "validFrom": "Mon Jan 01 2018 00:00:00 GMT+0100 (Central European Standard Time)",
                            "validUntil": null
                        },
                        {
                            "checked": false,
                            "title": "+ Konsultation, letzte 5 Min. (Konsultationszuschlag)",
                            "seq": "00.0030",
                            "validFrom": "Mon Jan 01 2018 00:00:00 GMT+0100 (Central European Standard Time)",
                            "validUntil": null
                        },
                        {
                            "checked": false,
                            "title": "+ Zuschlag für Kinder unter 6 Jahren",
                            "seq": "00.0040",
                            "validFrom": "Mon Jan 01 2018 00:00:00 GMT+0100 (Central European Standard Time)",
                            "validUntil": null
                        }
                    ],
                    employeeId: this.employeeId.toString(),
                    patientId: this.patientId.toString(),
                    caseFolderId: this.caseFolderId.toString(),
                    locationId: this.locationId
                } );
            await postEntry( 'casefolder', Y.doccirrus.filters.cleanDbObject( caseFolderData ) );
            await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( activityData ) );
            await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( treatmentData ) );
            await waitForUpdatedActivities( this );
        } );
        it( 'count linked activities', async function() {
            let result = await countEntry( 'activity', {
                caseFolderId: this.caseFolderId.toString(),
                patientId: this.patientId.toString(),
                actType: 'TREATMENT'
            } );
            should.exist( result );
            result.should.equal( 2 ); // 1 main treatments and 1 linked
        } );
        it( 'uncheck and unlink', async function() {
            let result = await getEntry( 'activity', {
                caseFolderId: this.caseFolderId.toString(),
                patientId: this.patientId.toString(),
                actType: 'TREATMENT',
                code: '00.0015'
            } );

            result.length.should.equal( 1 );
            result[0].activities.length.should.equal( 1 );
            result[0].hierarchyRules.forEach( ( rule ) => {
                rule.checked = false;
            } );

            result = await putEntry( 'activity', result[0]._id, result[0] );

            await waitForUpdatedActivities( this );

            result.activities.length.should.equal( 0 );
        } );
        it( 'check and link', async function() {
            let result = await getEntry( 'activity', {
                caseFolderId: this.caseFolderId.toString(),
                patientId: this.patientId.toString(),
                actType: 'TREATMENT',
                code: '00.0015'
            } );

            result.length.should.equal( 1 );
            result[0].activities.length.should.equal( 0 );
            result[0].hierarchyRules.forEach( ( rule ) => {
                rule.checked = true;
            } );

            result = await putEntry( 'activity', result[0]._id, result[0] );
            await waitForUpdatedActivities( this );

            // must connect
            result.activities.length.should.equal( 1 );
        } );
        it( 'delete and unlink', async function() {
            let result = await getEntry( 'activity', {
                caseFolderId: this.caseFolderId.toString(),
                patientId: this.patientId.toString(),
                actType: 'TREATMENT',
                code: '00.0015'
            } );

            result.length.should.equal( 1 );
            result[0].activities.length.should.equal( 1 );

            await deleteEntry( 'activity', {_id: result[0]._id} );

            await waitForUpdatedActivities( this );

            result = await getEntry( 'activity', {
                caseFolderId: this.caseFolderId.toString(),
                patientId: this.patientId.toString(),
                actType: 'TREATMENT'
            } );

            result.length.should.equal( 1 );
            result[0].code.should.equal( '00.0010' );
            result[0].referencedBy.length.should.equal( 0 );

            should.exist( result[0].hierarchyRules );

            result[0].hierarchyRules[0].checked = true;

            result = await putEntry( 'activity', result[0]._id, result[0] );
            await waitForUpdatedActivities( this );

            result.referencedBy.length.should.equal( 1 );
        } );
        it( 'change catalog value', async function() {
            let result = await getEntry( 'activity', {
                caseFolderId: this.caseFolderId.toString(),
                patientId: this.patientId.toString(),
                actType: 'TREATMENT'
            } );

            result.length.should.equal( 2 );

            result = await getEntry( 'activity', {
                caseFolderId: this.caseFolderId.toString(),
                patientId: this.patientId.toString(),
                actType: 'TREATMENT',
                code: '00.0010'
            } );

            result.length.should.equal( 1 );
            result[0].referencedBy.length.should.equal( 1 );

            result[0].catalogShort = 'EAL';
            result[0].code = '1000';

            result = await putEntry( 'activity', result[0]._id, result[0] );
            await waitForUpdatedActivities( this );
            result.referencedBy.length.should.equal( 1 );
            result.hierarchyRules.length.should.equal( 6 );
        } );
    } );
    describe( 'save DIAGNOSIS activities.', function() {
        before( async function() {
            await postEntry( 'catalog', Y.doccirrus.filters.cleanDbObject( this.catalogDiagnosisEntry ) );
            await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( mochaUtils.getDiagnosisActivity( {
                _id: this.activityDId,
                relatedCodes: [
                    {
                        "checked": true,
                        "title": "Andere infektiöse oder parasitäre Krankheiten",
                        "F": false,
                        "I": true,
                        "N": true,
                        "B": false,
                        "seq": "G9"
                    }
                ],
                employeeId: this.employeeId.toString(),
                patientId: this.patientId.toString(),
                caseFolderId: this.caseFolderId.toString(),
                locationId: this.locationId
            } ) ) );
            await waitForUpdatedActivities( this );
        } );
        it( 'count linked activities', async function() {
            let result = await countEntry( 'activity', {
                caseFolderId: this.caseFolderId.toString(),
                patientId: this.patientId.toString(),
                actType: 'DIAGNOSIS'
            } );
            should.exist( result );
            result.should.equal( 2 ); // 1 main diagnosis and 1 created

        } );
        it( 'change catalog value', async function() {
            let result = await getEntry( 'activity', {
                _id: this.activityDId
            } );
            should.exist( result );
            should.exist( result[0] );
            should.exist( result[0].relatedCodes );
            result[0].relatedCodes.length.should.equal( 1 );

            result[0].catalogShort = 'TESS-KAT';
            result[0].catalogRef = this.catalogDescriptor && this.catalogDescriptor.filename || '';
            result[0].code = 'M3';

            result = await putEntry( 'activity', result[0]._id, result[0] );
            await waitForUpdatedActivities( this );
            result.relatedCodes.length.should.equal( 0 );

        } );
    } );
    describe( 'saves TREATMENT activities with side property', function() {
        context( 'given created side related treatment', function() {
            before( async function() {
                const treatmentSideData = mochaUtils.getTreatmentActivity( {
                    _id: this.activityTreatmentSideId,
                    "code": "39.0270",
                    "treatmentCategory": "Hauptleistung",
                    "divisionCode": 5003,
                    "divisionText": "Röntgenraum I",
                    "medicalText": "Beinhaltet Radioulnokarpalgelenk bis inkl. aller Endphalangen vollständig, alle Processus unguiculares.",
                    "technicalText": "",
                    "catalogShort": "TARMED",
                    "sideMandatory": true,
                    "side": "LEFT",
                    "hierarchyRules": [
                        {
                            "checked" : false,
                            "disabled" : false,
                            "title" : "Grundtaxe für das Röntgen und die Ultraschalldiagnostik durch den Arzt in der Arztpraxis und durch Nicht-Radiologen im Spital ({AIP})",
                            "seq" : "39.0020",
                            "validFrom" : "2017-12-31T23:00:00.000Z",
                            "validUntil" : null
                        },
                        {
                            "checked" : true,
                            "disabled" : false,
                            "title" : "+ Röntgen: Hand, jede weitere Aufnahme",
                            "seq" : "39.0275",
                            "validFrom" : "2017-12-31T23:00:00.000Z",
                            "validUntil" : null
                        },
                        {
                            "checked" : false,
                            "disabled" : false,
                            "title" : "Technische Grundleistung 0, Röntgenraum I, ambulanter Patient",
                            "seq" : "39.2000",
                            "validFrom" : "2017-12-31T23:00:00.000Z",
                            "validUntil" : null
                        }
                    ],
                    employeeId: this.employeeId.toString(),
                    patientId: this.patientId.toString(),
                    caseFolderId: this.caseFolderId.toString(),
                    locationId: this.locationId
                } );
                await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( treatmentSideData ) );
                await waitForUpdatedActivities( this );
            });
            it( 'gets second created by system side related treatment and changes it side value', async function() {
                let result = await getEntry( 'activity', {
                    caseFolderId: this.caseFolderId.toString(),
                    patientId: this.patientId.toString(),
                    actType: 'TREATMENT',
                    code: '39.0275'
                } );

                result.length.should.equal( 1 );
                result[0].activities.length.should.equal( 1 );
                result[0].side.should.equal( 'LEFT' );

                result[0].sideMandatory = true;
                // need to make sideMandatory
                result = await putEntry( 'activity', result[0]._id, result[0] );
                await waitForUpdatedActivities( this );

                result.side = 'RIGHT';

                result = await putEntry( 'activity', result._id, result );
                await waitForUpdatedActivities( this );
                result.side.should.equal( 'RIGHT' );
            });
            it( 'gets main side related treatment and checks it side value', async function() {
                let result = await getEntry( 'activity', {
                    caseFolderId: this.caseFolderId.toString(),
                    patientId: this.patientId.toString(),
                    actType: 'TREATMENT',
                    code: '39.0270'
                } );

                result.length.should.equal( 1 );
                result[0].referencedBy.length.should.equal( 1 );
                result[0].side.should.equal( 'RIGHT' );
            });
        });
    });

} );