/**
 * User: pi
 * Date: 26/04/17  13:45
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global Y, context, before, after, it, describe, expect */

const
    mongoose = require( 'mongoose' ),
    util = require( 'util' ),
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    user = Y.doccirrus.auth.getSUForLocal(),
    EXPLANATIONS = 'Lorem ipsum dolor sit amet',
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    getEBMDescriptorByLocationId = promisifyArgsCallback( Y.doccirrus.api.catalog.getEBMDescriptorByLocationId ),
    addCodeBatch = promisifyArgsCallback( Y.doccirrus.api.catalogusage.addCodeBatch );

function getTreatmentData( config = {} ) {
    let treatment = {
        actType: 'TREATMENT',
        status: 'VALID',
        explanations: EXPLANATIONS
    };
    return mochaUtils.getActivityData( Object.assign( treatment, config ) );
}

async function waitForUpdatedActivities( self, timeToWait = 4000 ) {
    self.timeout( self.timeout() + timeToWait );
    await new Promise( ( resolve ) => {
        setTimeout( resolve, timeToWait );
    } );
}

describe( 'catalogusage-api', function() {
    let countryMode;
    before( async function() {
        this.timeout( 8000 );
        await cleanDb( {user} );
    } );
    after( async function() {
        await cleanDb( {user} );
        Y.config.doccirrus.Env.countryMode = countryMode || ['D'];
    } );

    context( 'de', function() {
        before( async function() {
            /*this.timeout(0)*/

            this.mainLocationId = new mongoose.Types.ObjectId().toString();
            this.anotherLocationId = new mongoose.Types.ObjectId().toString();
            this.employeeId = new mongoose.Types.ObjectId().toString();
            this.patientId = new mongoose.Types.ObjectId().toString();
            this.caseFolderId = new mongoose.Types.ObjectId().toString();

            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: this.mainLocationId
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: this.anotherLocationId,
                    commercialNo: '100714103'
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getEmployeeData( {
                    _id: this.employeeId
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patient',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient',
                    _id: this.patientId,
                    activeCaseFolderId: this.caseFolderId,
                    insuranceStatus: [
                        {
                            'insuranceId': '109519005',
                            'insuranceName': 'AOK Nordost - Die Gesundheitskasse',
                            'insurancePrintName': 'AOK Nordost',
                            'insuranceGrpId': '72101',
                            'type': 'PUBLIC',
                            'kv': '72',
                            'locationId': this.mainLocationId,
                            'employeeId': this.employeeId,
                            'address2': '10957 Berlin',
                            'address1': 'Wilhelmstraße 1',
                            'bgNumber': '',
                            'unzkv': [],
                            'fused': false,
                            'feeSchedule': '1',
                            'costCarrierBillingGroup': '01',
                            'costCarrierBillingSection': '00',
                            'dmp': '',
                            'persGroup': '',
                            'insuranceKind': '1',
                            'fk4110': null,
                            'fk4133': null
                        }
                    ]
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'casefolder',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                    patientId: this.patientId,
                    _id: this.caseFolderId
                } ) )
            } );
        } );
        describe( 'Check catalog usage creation during activity creation.', function() {
            before( async function() {
                this.defaultEBM = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'TREATMENT',
                    short: 'EBM'
                } );
                this.defaultGOAE = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'TREATMENT',
                    short: 'GOÄ'
                } );
                this.catalogRefEBM = this.defaultEBM.filename;
                this.catalogRefGOAE = this.defaultGOAE.filename;

                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getScheinData( {
                        caseFolderId: this.caseFolderId,
                        locationId: this.mainLocationId,
                        employeeId: this.employeeId,
                        patientId: this.patientId
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getScheinData( {
                        caseFolderId: this.caseFolderId,
                        locationId: this.anotherLocationId,
                        employeeId: this.employeeId,
                        patientId: this.patientId
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getTreatmentData( {
                        caseFolderId: this.caseFolderId,
                        locationId: this.mainLocationId,
                        catalogRef: this.catalogRefEBM,
                        catalog: true,
                        code: '01100',
                        catalogShort: 'EBM',
                        employeeId: this.employeeId,
                        patientId: this.patientId
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getTreatmentData( {
                        caseFolderId: this.caseFolderId,
                        locationId: this.anotherLocationId,
                        catalogRef: this.catalogRefEBM,
                        catalog: true,
                        code: '01100',
                        catalogShort: 'EBM',
                        employeeId: this.employeeId,
                        patientId: this.patientId
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getTreatmentData( {
                        caseFolderId: this.caseFolderId,
                        locationId: this.mainLocationId,
                        catalogRef: this.catalogRefEBM,
                        code: '02100',
                        catalogShort: 'EBM',
                        catalog: true,
                        employeeId: this.employeeId,
                        patientId: this.patientId
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getTreatmentData( {
                        caseFolderId: this.caseFolderId,
                        locationId: this.anotherLocationId,
                        catalogRef: this.catalogRefEBM,
                        catalog: true,
                        code: '02100',
                        catalogShort: 'EBM',
                        employeeId: this.employeeId,
                        patientId: this.patientId
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getTreatmentData( {
                        caseFolderId: this.caseFolderId,
                        locationId: this.mainLocationId,
                        catalogRef: this.catalogRefGOAE,
                        code: 'customCode',
                        catalogShort: 'GOÄ',
                        catalog: false,
                        employeeId: this.employeeId,
                        patientId: this.patientId
                    } ) )
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getTreatmentData( {
                        caseFolderId: this.caseFolderId,
                        locationId: this.anotherLocationId,
                        catalog: false,
                        code: 'customCode',
                        catalogRef: this.catalogRefGOAE,
                        catalogShort: 'GOÄ',
                        employeeId: this.employeeId,
                        patientId: this.patientId
                    } ) )
                } );
            } );
            it( 'Check amount of catalogusage entries after activity is created', async function() {
                const count = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalogusage',
                    action: 'count',
                    query: {}
                } );
                count.should.be.equal( 6 );
            } );
            describe( 'Inserts codes by addCodeBatch', function() {
                before( async function() {
                    const desc = await getEBMDescriptorByLocationId( {
                        user: user,
                        originalParams: {
                            locationId: this.mainLocationId.toString()
                        }
                    } );
                    this.locCatalog = desc.filename;
                    await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'catalog',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( [
                            {
                                seq: '20210',
                                catalog: this.locCatalog
                            }, {
                                seq: '02100',
                                catalog: this.locCatalog
                            }, {
                                seq: '01100',
                                catalog: this.locCatalog
                            }
                        ] )
                    } );
                } );
                it( 'makes api call api.catalogusage.addCodeBatch', async function() {
                    let
                        defaultEBM = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                            actType: 'TREATMENT',
                            short: 'EBM'
                        } );
                    /**
                     * will create one original code * 2(each per location),
                     * will update other 2 codes.
                     */
                    await addCodeBatch( {
                        user,
                        data: {
                            codes: [
                                {
                                    seq: '20210',
                                    filename: defaultEBM.filename
                                }, {
                                    seq: '02100',
                                    filename: defaultEBM.filename
                                }, {
                                    seq: '01100',
                                    filename: defaultEBM.filename
                                }
                            ],
                            tags: [],
                            locations: [this.mainLocationId.toString(), this.anotherLocationId.toString()]
                        }
                    } );
                } );
                it( 'counts catalogusage entries.', async function() {
                    const count = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'catalogusage',
                        action: 'count',
                        query: {}
                    } );
                    count.should.be.equal( 8 );
                } );
            } );
            describe( 'Inserts codes for custom EBM Code Edge case and check billingFactorValue.', function() {
                before( async function() {
                    //LAM-1983: custom code in EBM
                    this.customEBMCodeId = new mongoose.Types.ObjectId().toString();

                    await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( getTreatmentData( {
                            _id: this.customEBMCodeId,
                            caseFolderId: this.caseFolderId,
                            locationId: this.mainLocationId,
                            catalogRef: this.catalogRefEBM,
                            code: 'customCode',
                            catalogShort: 'EBM',
                            catalog: false,
                            employeeId: this.employeeId,
                            patientId: this.patientId
                        } ) )
                    } );
                } );
                it( 'Check custom EBM catalogusage entry', async function() {
                    this.retries( 10 );
                    const result = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'catalogusage',
                        query: {
                            seq: 'customCode',
                            catalogShort: 'EBM',
                            locationId: this.mainLocationId
                        }
                    } );
                    //
                    expect( result ).to.be.an( 'array' ).which.has.lengthOf( 1 );
                    result[0].catalog.should.be.equal( false );
                    result[0].billingFactorValue.should.be.equal( '1' );
                } );
                it( 'Check custom EBM activity entry', async function() {
                    const result = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        query: {_id: this.customEBMCodeId}
                    } );
                    //
                    expect( result ).to.be.an( 'array' ).which.has.lengthOf( 1 );
                    result[0].catalog.should.be.equal( false );
                    result[0].billingFactorValue.should.be.equal( '1' );
                } );
            } );

        } );
        describe( 'Check unified seq', function() {
            let
                catalogSchema = Y.doccirrus.schemas.catalog;
            it( 'checks treatment code "800"', function() {
                let
                    unifiedSeq = catalogSchema.unifySeq( '800' );
                unifiedSeq.should.equal( '000000800' );
            } );
            it( 'checks treatment code "2a"', function() {
                let
                    unifiedSeq = catalogSchema.unifySeq( '2a' );
                unifiedSeq.should.equal( '000000002A' );
            } );
            it( 'checks treatment code "12.11"', function() {
                let
                    unifiedSeq = catalogSchema.unifySeq( '12.11' );
                unifiedSeq.should.equal( '000000012.11' );
            } );
            it( 'checks treatment code "12.14e"', function() {
                let
                    unifiedSeq = catalogSchema.unifySeq( '12.14e' );
                unifiedSeq.should.equal( '000000012.14E' );
            } );
            it( 'checks treatment code "08341"', function() {
                let
                    unifiedSeq = catalogSchema.unifySeq( '08341' );
                unifiedSeq.should.equal( '000008341' );
            } );
            it( 'checks treatment code "4705"', function() {
                let
                    unifiedSeq = catalogSchema.unifySeq( '4705' );
                unifiedSeq.should.equal( '000004705' );
            } );
            it( 'checks treatment code "D"', function() {
                let
                    unifiedSeq = catalogSchema.unifySeq( 'D' );
                unifiedSeq.should.equal( 'D' );
            } );
            it( 'checks treatment code "W3N"', function() {
                let
                    unifiedSeq = catalogSchema.unifySeq( 'W3N' );
                unifiedSeq.should.equal( 'W000000003N' );
            } );
            it( 'checks treatment code "D25.H"', function() {
                let
                    unifiedSeq = catalogSchema.unifySeq( 'D25.H' );
                unifiedSeq.should.equal( 'D000000025.H' );
            } );
            it( 'checks treatment code "A99.H25"', function() {
                let
                    unifiedSeq = catalogSchema.unifySeq( 'A99.H25' );
                unifiedSeq.should.equal( 'A000000099.H25' );
            } );
            it( 'checks treatment code "A1800"', function() {
                let
                    unifiedSeq = catalogSchema.unifySeq( 'A1800' );
                unifiedSeq.should.equal( 'A000001800' );
            } );
        } );
    } );

    context( 'ch', function() {
        before( async function() {
            await cleanDb( {user} );

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

            this.code1 = '00.0010';
            this.code2 = '00.0020';
            this.swissPatientId = new mongoose.Types.ObjectId().toString();
            this.swissLocationId = new mongoose.Types.ObjectId().toString();
            this.swissCaseFolderId = new mongoose.Types.ObjectId().toString();
            this.swissEmployeeId = new mongoose.Types.ObjectId().toString();

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: this.swissLocationId,
                    commercialNo: '100714104',
                    countryMode: 'CH',
                    countryCode: 'CH',
                    zip: 1210,
                    cantonCode: '3'
                } ) )
            } );

            this.locCatalog = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                actType: 'TREATMENT',
                short: 'TARMED'
            } );
            this.tarmedCatalogRef = this.locCatalog.filename;
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'catalog',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( [
                    {
                        seq: this.code1,
                        catalog: this.tarmedCatalogRef
                    },
                    {
                        seq: this.code2,
                        catalog: this.tarmedCatalogRef
                    }
                ] )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getEmployeeData( {
                    _id: this.swissEmployeeId,
                    countryMode: 'CH'
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getPatientData( {
                    firstname: 'swiss',
                    lastname: 'patient',
                    _id: this.swissPatientId,
                    activeCaseFolderId: this.swissCaseFolderId,
                    countryMode: ['CH'],
                    insuranceStatus: [
                        {
                            "fk4133": null,
                            "fk4110": null,
                            "insuranceKind": "",
                            "costCarrierBillingSection": "",
                            "costCarrierBillingGroup": "",
                            "feeSchedule": "",
                            "fused": false,
                            "unzkv": [],
                            "bgNumber": "",
                            "address1": "Route de Verbier 13",
                            "address2": "",
                            "zipcode": "1934",
                            "city": "Le Châble",
                            "phone": "058 758 60 70",
                            "insuranceLink": "www.amb-assurance.ch",
                            "email": "gburnier@groupemutuel.ch",
                            "insuranceGLN": "7601003000504",
                            "recipientGLN": "7601003002980",
                            "department": "",
                            "isTiersGarant": false,
                            "isTiersPayant": true,
                            "insuranceId": "7601003000504",
                            "insuranceName": "AMB Assurances",
                            "insurancePrintName": "Groupe Mutuel",
                            "type": "PRIVATE_CH",
                            "persGroup": "",
                            "dmp": "",
                            "mediport": true
                        }
                    ]
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                    patientId: this.swissPatientId,
                    _id: this.swissCaseFolderId,
                    type: 'PRIVATE_CH'
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getScheinData( {
                    patientId: this.swissPatientId,
                    caseFolderId: this.swissCaseFolderId,
                    locationId: this.swissLocationId,
                    employeeId: this.swissEmployeeId,
                    countryMode: ['CH']
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( getTreatmentData( {
                    patientId: this.swissPatientId,
                    caseFolderId: this.swissCaseFolderId,
                    locationId: this.swissLocationId,
                    catalogRef: this.tarmedCatalogRef,
                    code: this.code1,
                    catalogShort: 'TARMED',
                    catalog: true,
                    employeeId: this.swissEmployeeId,
                    modifyHomeCat: false,
                    countryMode: ['CH']
                } ) )
            } );
        } );
        describe( 'catalogUsage modify that tolerate modifyHomeCat in SWISS', function() {

            it( 'check catalogusage entries should have code', async function() {
                await waitForUpdatedActivities( this, 2000 );
                const count = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalogusage',
                    action: 'count',
                    query: {seq: this.code1}
                } );
                count.should.be.equal( 1 );
            } );

            it( 'check catalogusage entries should not have explanation string', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalogusage',
                    action: 'get',
                    query: {seq: this.code1},
                    options: {
                        select: {
                            explanations: 1
                        }
                    }
                } );
                result[0].explanations.should.be.equal( '' );
            } );

        } );
        describe( 'catalogUsage modify that tolerate modifyHomeCat in SWISS', function() {
            before( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( getTreatmentData( {
                        patientId: this.swissPatientId,
                        caseFolderId: this.swissCaseFolderId,
                        locationId: this.swissLocationId,
                        catalogRef: this.tarmedCatalogRef,
                        code: this.code2,
                        catalogShort: 'TARMED',
                        catalog: true,
                        employeeId: this.swissEmployeeId,
                        modifyHomeCat: true
                    } ) )
                } );
            } );

            it( 'check catalogusage entries should have new code', async function() {
                await waitForUpdatedActivities( this, 2000 );
                const count = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalogusage',
                    action: 'count',
                    query: {seq: this.code2}
                } );
                count.should.be.equal( 1 );
            } );

            it( 'check catalogusage entries should have explanation string', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalogusage',
                    action: 'get',
                    query: {seq: this.code2},
                    options: {
                        select: {
                            explanations: 1
                        }
                    }
                } );
                result[0].explanations.should.be.equal( EXPLANATIONS );
            } );
        } );
    } );

} );
