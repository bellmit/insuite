/**
 * User: pi
 * Date: 17/11/17  15:50
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, context, it, describe, before, after */

const
    {promisifyArgsCallback} = require( 'dc-core' ).utils,
    mongoose = require( 'mongoose' ),
    moment = require( 'moment' ),
    util = require( 'util' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    prescribeMedicationsP = promisifyArgsCallback( Y.doccirrus.api.prescription.prescribeMedications ),
    createPrescriptionsAndMedicationPlanP = promisifyArgsCallback( Y.doccirrus.api.prescription.createPrescriptionsAndMedicationPlan ),
    printPrescriptionsP = promisifyArgsCallback( Y.doccirrus.api.prescription.printPrescriptions ),
    createMedicationPlanForMedicationsP = promisifyArgsCallback( Y.doccirrus.api.activity.createMedicationPlanForMedications ),
    patientId = new mongoose.Types.ObjectId().toString(),
    identityId = new mongoose.Types.ObjectId().toString(),
    employeeId = new mongoose.Types.ObjectId().toString(),
    caseFolderId = new mongoose.Types.ObjectId().toString(),
    mainLocationId = new mongoose.Types.ObjectId().toString(),
    user = Y.doccirrus.auth.getSUForLocal(),
    formTemplate = require( '../../forms/prescription_form.json' ).formtemplate,
    pubPrescElemMap = new Map(),
    privPrescElemMap = new Map(),
    defaultPrinterName = 'defaultMochaPrinter',
    userEmployee = {
        _id: '5a1800945fd3d410501499a0',
        countryMode: [mochaUtils.getCountryMode()],
        "username": "R",
        "officialNo": "",
        "type": "OTHER",
        "from": "2014-11-11T19:31:02.581Z",
        "to": null,
        "employeeNo": "",
        "department": "",
        "dob": "2014-11-11T18:32:13.922Z",
        "bsnrs": [],
        "talk": "MR",
        "locations": [],
        "specialities": [],
        "addresses": [],
        "communications": [
            {
                "type": "EMAILPRIV",
                "preferred": false,
                "value": "mocha-test@doc-cirrus.com"
            }
        ],
        "prodServices": [],
        "accounts": [],
        "lastname": "Mocha",
        "fk3120": "",
        "middlename": "",
        "memberOf": [
            {"group": "ADMIN"}
        ],
        "status": "ACTIVE",
        "nameaffix": "",
        "firstname": "Tester"
    },
    userIdentity = {
        _id: '5a1800945fd3d410501499a3',
        "username": "mochaTest",
        "firstname": "Tester",
        "lastname": "Mocha",
        specifiedBy: '5a1800945fd3d410501499a0',
        "pwResetToken": "",
        "status": "ACTIVE",
        "memberOf": [
            {"group": "ADMIN"}
        ],
        "pw": "$2$rwt9ab354myo6076345de24d4c9c75c5d878c88c750ba1278409a2502cb4655c50777da561d4dbfecf9300d2a2ee380a92492fd6af586a8c6c87f90566983b816aeab2de0672"
    };
let
    medicationPlanFormId,
    originPrinter;

formTemplate.forEach( template => {
    if( 'casefile-prescription-kbv' === template.jsonTemplate.defaultFor ) {
        template.jsonTemplate.pages[0].elements.forEach( element => {
            pubPrescElemMap.set( element.schemaMember, {id: element.id} );
        } );
    }
    if( 'casefile-prescription-p' === template.jsonTemplate.defaultFor ) {

        template.jsonTemplate.pages[0].elements.forEach( element => {
            privPrescElemMap.set( element.schemaMember, {id: element.id} );
        } );
    }
    if( 'casefile-medicationplan-table' === template.jsonTemplate.defaultFor ) {
        medicationPlanFormId = template._id;
    }
} );

/**
 * Test checks that prescription-medication api creates correct set of activities for prescription and medication plan.
 * The test covers socket events which are sent to client during activities creation as well as printing functionality.
 */
describe( 'prescription and medication plan creation based on medication selection', function() {
    const
        med1 = {
            'timestamp': '2017-11-17T14:53:15.846Z',
            'medicationPlanOrder': 1,
            'patientId': patientId,
            'caseFolderId': caseFolderId,
            'actType': 'MEDICATION',
            'catalogShort': 'MMI',
            'code': '08533807',
            'generalCosts': 0,
            'specialCosts': 0,
            'userContent': 'Ibu 600 - 1 A Pharma®, Filmtbl.',
            'vat': 0,
            'hasVat': false,
            'phPriceSale': 12.32,
            'phPriceRecommended': null,
            'phPatPay': 5,
            'phPatPayHint': 'AVP<50,00 => ZuZa=5,00',
            'phCheaperPkg': true,
            'phFixedPay': 12.54,
            'phOnly': false,
            'phTer': false,
            'phTrans': false,
            'phImport': false,
            'phNegative': false,
            'phLifeStyle': false,
            'phLifeStyleCond': false,
            'phAMR': [],
            "phAMRContent": [],
            'phGBA': false,
            'phDisAgr': false,
            'phDisAgrAlt': true,
            'phMed': false,
            'phPrescMed': false,
            'phPZN': '08533807',
            'phCompany': '1 A Pharma GmbH',
            'phPackSize': '20 st',
            'phAtc': ['M01AE01'],
            'phIngr': [
                {
                    '_id': '598300466dd8950c7a18cd1c',
                    'strength': '600 mg',
                    'name': 'Ibuprofen',
                    'code': 1857
                }],
            'phForm': 'Filmtbl.',
            'phRecipeOnly': true,
            'phBTM': false,
            'phNLabel': 'Ibu - 1 A Pharma® 600 20 Filmtbl. N1',
            'phOTC': false,
            'phOTX': false,
            'phARV': false,
            'phARVContent': [],
            'dosis': '',
            'phDosisMorning': '0',
            'phDosisAfternoon': '0',
            'phDosisEvening': '0',
            'phDosisNight': '0',
            'phDosisType': 'SCHEDULE',
            'phAsNeededMedication': false,
            'phUnit': '',
            'phNote': '',
            'phReason': '',
            'phSelfMedication': false,
            'prescriptionType': 'PUBPRESCR',
            'group': 1
        },
        med2 = {
            'exactMedication': true,
            'timestamp': '2017-11-17T14:53:16.680Z',
            'patientId': patientId,
            'medicationPlanOrder': 0,
            'caseFolderId': caseFolderId,
            'actType': 'MEDICATION',
            'catalogShort': 'MMI',
            'code': '05749978',
            'generalCosts': 0,
            'specialCosts': 0,
            'userContent': 'ASS 100 mg elac TAH Tabletten',
            'vat': 0,
            'hasVat': false,
            'phPriceSale': 3.2,
            'phPriceRecommended': 3.2,
            'phPatPay': 3.2,
            'phPatPayHint': 'AVP<=5,00 => ZuZa=3,20',
            'phCheaperPkg': true,
            'phFixedPay': 3.38,
            'phOnly': true,
            'phTer': false,
            'phTrans': false,
            'phImport': false,
            'phNegative': false,
            'phLifeStyle': false,
            'phLifeStyleCond': false,
            'phAMR': ['amr1'],
            "phAMRContent": [],
            'phGBA': false,
            'phDisAgr': false,
            'phDisAgrAlt': false,
            'phMed': false,
            'phPrescMed': false,
            'phPZN': '05749978',
            'phCompany': 'TEVA GmbH',
            'phPackSize': '100 st',
            'phAtc': ['B01AC06'],
            'phIngr': [
                {
                    '_id': '5989aa7f004c9d0f39109b38',
                    'strength': '100 mg',
                    'name': 'Acetylsalicylsäure',
                    'code': 4384
                }],
            'phForm': 'Tbl.',
            'phRecipeOnly': false,
            'phBTM': false,
            'phNLabel': 'ASS 100mg elac TAH 100 Tbl. N3',
            'phOTC': false,
            'phOTX': true,
            'phARV': false,
            'phARVContent': [],
            'dosis': '2-0-3',
            'phDosisMorning': '0',
            'phDosisAfternoon': '0',
            'phDosisEvening': '0',
            'phDosisNight': '0',
            'phDosisType': 'TEXT',
            'phAsNeededMedication': false,
            'phUnit': '',
            'phNote': '',
            'phReason': '',
            'phSelfMedication': false,
            'prescriptionType': 'PUBPRESCR',
            'group': 1
        },
        med3 = {
            exactMedication: true,
            'timestamp': '2017-11-17T14:53:17.717Z',
            'patientId': patientId,
            'caseFolderId': caseFolderId,
            medicationPlanOrder: 2,
            'actType': 'MEDICATION',
            'catalogShort': 'MMI',
            'code': '02194830',
            'generalCosts': 0,
            'specialCosts': 0,
            'userContent': 'Spiraea Komplex Hanosan flüssig 50ml N1',
            'vat': 0,
            'hasVat': false,
            'phPriceSale': 13.49,
            'phPriceRecommended': null,
            'phPatPay': 5,
            'phPatPayHint': 'AVP<50,00 => ZuZa=5,00',
            'phCheaperPkg': false,
            'phFixedPay': null,
            'phOnly': true,
            'phTer': false,
            'phTrans': false,
            'phImport': false,
            'phNegative': false,
            'phLifeStyle': false,
            'phLifeStyleCond': false,
            'phAMR': [],
            "phAMRContent": [],
            'phGBA': false,
            'phDisAgr': false,
            'phDisAgrAlt': false,
            'phMed': false,
            'phPrescMed': false,
            'phPZN': '02194830',
            'phCompany': 'Hanosan GmbH Pharmazeutische Fabrik',
            'phPackSize': '50 ml',
            'phAtc': ['V60A'],
            'phIngr': [
                {
                    '_id': '59e49a36e5ad7310bca24beb',
                    'strength': '3 mg',
                    'name': 'Filipendula ulmaria Ø',
                    'code': 48739
                }, {
                    '_id': '59e49a36e5ad7310bca24bea',
                    'strength': '30 mg',
                    'name': 'Melissa officinalis Ø',
                    'code': 2726
                }, {
                    '_id': '59e49a36e5ad7310bca24be9',
                    'strength': '3 mg',
                    'name': 'Kalmia latifolia Ø',
                    'code': 25209
                }, {
                    '_id': '59e49a36e5ad7310bca24be8',
                    'strength': '1 mg',
                    'name': 'Asa foetida Ø',
                    'code': 47978
                }, {
                    '_id': '59e49a36e5ad7310bca24be7',
                    'strength': '0,30 mg',
                    'name': 'Convallaria majalis Ø',
                    'code': 25210
                }, {
                    '_id': '59e49a36e5ad7310bca24be6',
                    'strength': '10 mg',
                    'name': 'Lycopus virginicus',
                    'code': 48740
                }],
            'phForm': 'Tropfen zum Einnehmen, Lsg.',
            'phRecipeOnly': false,
            'phBTM': false,
            'phNLabel': 'Spiraea Komplex Hanosan flüssig 50ml N1',
            'phOTC': true,
            'phOTX': false,
            'phARV': false,
            'phARVContent': [],
            'dosis': '',
            'phDosisMorning': '0',
            'phDosisAfternoon': '0',
            'phDosisEvening': '0',
            'phDosisNight': '0',
            'phDosisType': 'SCHEDULE',
            'phAsNeededMedication': false,
            'phUnit': '',
            'phNote': '',
            'phReason': '',
            'phSelfMedication': false,
            'prescriptionType': 'PRIVPRESCR',
            'group': 2
        },
        kbvMedicationPlan = {
            actType: 'KBVMEDICATIONPLAN',
            attachments: [],
            attachedMedia: [],
            subType: '',
            timestamp: moment().toDate(),
            time: '',
            patientId,
            caseFolderId,
            employeeId,
            backupEmployeeIds: [],
            locationId: mainLocationId,
            userContent: '',
            mediaImportError: '',
            partnerInfo: '',
            explanations: '',
            status: 'CREATED',
            editor: [],
            activities: [],
            referencedBy: [],
            formId: '',
            formVersion: '',
            formPdf: '',
            formLang: 'de',
            formGender: 'n',
            apkState: 'IN_PROGRESS',
            unlinkedMirrorIds: [],
            medicationPlanVersion: '026',
            medicationPlanEntries:
                [
                    {
                        type: 'MEDICATION',
                        timestamp: moment().toDate(),
                        phNLabel: 'Aspira Tragetasche 1 St.',
                        phPZN: '10080402',
                        phCompany: 'Mpv Medical GmbH (IFA-Nr:10002)',
                        phForm: '',
                        phPackSize: '1 st',
                        phPackQuantity: 1,
                        phPriceSale: null,
                        phPriceRecommended: 21,
                        phPatPay: null,
                        phPatPayHint: '',
                        phFixedPay: null,
                        phIngr: [],
                        phAtc: [],
                        phOnly: false,
                        phTer: false,
                        phTrans: false,
                        phImport: false,
                        phNegative: false,
                        phLifeStyle: false,
                        phLifeStyleCond: false,
                        phAMR: [],
                        phGBA: false,
                        phGBATherapyHintName: null,
                        phDisAgr: false,
                        phDisAgrAlt: false,
                        phMed: true,
                        phPrescMed: false,
                        phBTM: false,
                        phRecipeOnly: false,
                        phOTC: true,
                        phOTX: false,
                        phARV: false,
                        phARVContent: [],
                        phAMRContent: [],
                        phCheaperPkg: false,
                        phContinuousMed: false,
                        phContinuousMedDate: null,
                        phContinuousMedStart: null,
                        phContinuousMedEnd: null,
                        phSampleMed: false,
                        hasVat: false,
                        vat: 0,
                        dosis: '0-0-0-0',
                        phDosisMorning: '0',
                        phDosisAfternoon: '0',
                        phDosisEvening: '0',
                        phDosisNight: '0',
                        phDosisType: 'SCHEDULE',
                        phAsNeededMedication: false,
                        phUnit: '',
                        phNote: '',
                        phReason: '',
                        phSelfMedication: false,
                        phSalesStatus: 'ONMARKET',
                        phNormSize: 'N',
                        phHeader: '',
                        isPrescribed: false,
                        restRequestId: null,
                        isDispensed: false,
                        isArrived: true,
                        orderId: null,
                        phFormCode: null,
                        phDosisUnitCode: null,
                        phGTIN: '',
                        insuranceDescription: '',
                        insuranceCode: '',
                        prdNo: null,
                        phUnitDescription: '',
                        phForeignUnit: '',
                        explanations: 'test',
                        source: ''
                    }]
        };

    // Skipped tests (Y.doccirrus.api.activity.createMedicationPlanForMedications) make only sense for inSwiss.
    // at the moment no way to test ony for this country type.

    context( 'de', function() {
        before( async function() {
            this.timeout( 30000 );
            await cleanDb( {
                user: user
            } );

            //prevent triggering ruleengine
            Y.doccirrus.auth._isMocha = Y.doccirrus.auth.isMocha;
            Y.doccirrus.auth.isMocha = () => true;

            const
                mockPrinter = require( '../../server/printer-mock' );
            originPrinter = mockPrinter( Y );

            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: mainLocationId
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patient',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getPatientData( {
                    firstname: 'test',
                    lastname: 'patient',
                    'insuranceStatus': [
                        {
                            'insuranceId': '109519005',
                            'insuranceName': 'AOK Nordost - Die Gesundheitskasse',
                            'insurancePrintName': 'AOK Nordost',
                            'insuranceGrpId': '72101',
                            'type': 'PUBLIC',
                            'kv': '72',
                            'locationId': mainLocationId,
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
                        }],
                    _id: patientId
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getEmployeeData( {
                    _id: employeeId
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'post',
                data: Object.assign( {skipcheck_: true}, mochaUtils.getIdentityData( {
                    _id: identityId,
                    specifiedBy: employeeId
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'practice',
                action: 'post',
                data: Object.assign( {
                    skipcheck_: true
                }, mochaUtils.getPracticeData() )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'casefolder',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                    patientId: patientId,
                    _id: caseFolderId
                } ) )
            } );
            let date = moment();
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getActivityData( {
                    actType: 'SCHEIN',
                    timestamp: date.toISOString(),
                    patientId,
                    scheinQuarter: date.get( 'quarter' ),
                    scheinYear: date.get( 'year' ),
                    status: 'VALID',
                    scheinType: '0101',
                    scheinSubgroup: '00',
                    caseFolderId,
                    employeeId: employeeId,
                    locationId: mainLocationId
                } ) )
            } );
            await mochaUtils.createMochaForms( user );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'formprinter',
                action: 'post',
                data: {
                    skipcheck_: true,
                    identityId: 'default',
                    locationId: mainLocationId,
                    canonicalId: medicationPlanFormId,
                    printerName: defaultPrinterName,
                    alternatives: []

                }
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'employee',
                action: 'post',
                data: {
                    ...userEmployee,
                    skipcheck_: true
                }
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'identity',
                action: 'post',
                data: {
                    ...userIdentity,
                    skipcheck_: true
                }
            } );
        } );
        describe( 'Test prescription creation and update.', function() {
            describe( 'Test prescription creation.', async function() {
                before( async function() {
                    await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'delete',
                        query: {
                            actType: {$ne: 'SCHEIN'}
                        }
                    } );
                } );

                const
                    testData = {
                        printerName: defaultPrinterName,
                        prescriptionGroups: {
                            'PUBPRESCR': {
                                '1': [Object.assign( {}, med1 ), Object.assign( {}, med2 ), Object.assign( {}, med2 )]
                            },
                            'PRIVPRESCR': {
                                '2': [Object.assign( {}, med3 )]
                            },
                            'PRESCRBTM': {},
                            'PRESCRG': {},
                            'PRESCRT': {},
                            'PRESASSISTIVE': {}
                        },
                        prescriptionData: {
                            PUBPRESCR: {
                                paidFree: true,
                                paid: false,
                                nightTime: false,
                                otherInsurance: false,
                                utUnfall: false,
                                workAccident: false,
                                isPatientBVG: true,
                                assistive: false,
                                vaccination: true,
                                practiceAssistive: true,
                                dentist: true
                            },
                            PRIVPRESCR: {utUnfall: true},
                            PRESCRBTM: {
                                paidFree: false,
                                paid: false,
                                nightTime: false,
                                employeeSpecialities: false,
                                fk4202: false,
                                workAccident: false,
                                isPatientBVG: false,
                                practiceAssistive: false,
                                dentist: false
                            },
                            PRESCRT: {noMapping: false, nightTime: false, otherInsurance: false, isPatientBVG: false}
                        },
                        employeeId,
                        locationId: mainLocationId,
                        patientId,
                        caseFolderId,
                        timestamp: moment().toISOString(),
                        print: false,
                        numCopies: 0
                    };
                let
                    med1Id,
                    med2Id,
                    med2_2Id,
                    med3Id,
                    pubPrescription,
                    privPrescription;

                it( 'Makes api call', async function() {
                    this.timeout( 30000 );
                    await prescribeMedicationsP( {
                        user,
                        data: testData,
                        waitCallback: true
                    } );
                } );
                it( 'Checks medication entries', async function() {
                    const results = await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            actType: 'MEDICATION',
                            caseFolderId,
                            patientId
                        },
                        options: {
                            sort: {_id: 1},
                            select: {
                                code: 1,
                                status: 1
                            }
                        }
                    } );
                    results.should.be.an( 'array' ).which.has.lengthOf( 4 );
                    results[0].code.should.equal( med2.code );
                    results[0].status.should.equal( 'VALID' );
                    med2_2Id = results[0]._id.toString();
                    results[1].code.should.equal( med2.code );
                    results[1].status.should.equal( 'VALID' );
                    med2Id = results[1]._id.toString();
                    results[2].code.should.equal( med1.code );
                    results[2].status.should.equal( 'VALID' );
                    med1Id = results[2]._id.toString();
                    results[3].code.should.equal( med3.code );
                    results[3].status.should.equal( 'VALID' );
                    med3Id = results[3]._id.toString();
                } );
                it( 'Checks prescription entries', async function() {
                    const results = await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            $or: [{actType: 'PUBPRESCR'}, {actType: 'PRIVPRESCR'}],
                            caseFolderId,
                            patientId
                        },
                        options: {
                            sort: {_id: 1},
                            select: {
                                activities: 1
                            }
                        }
                    } );

                    results.should.be.an( 'array' ).which.has.lengthOf( 2 );
                    results[0].activities.should.deep.equal( [med1Id, med2Id, med2_2Id] );
                    results[1].activities.should.deep.equal( [med3Id] );
                } );
                it( 'Checks order of entries', async function() {
                    const results = await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            caseFolderId,
                            patientId,
                            actType: {$ne: 'SCHEIN'}
                        },
                        options: {
                            sort: {timestamp: 1},
                            select: {
                                code: 1,
                                status: 1,
                                actType: 1,
                                timestamp: 1,
                                content: 1,
                                userContent: 1,
                                attachments: 1
                            }
                        }
                    } );

                    let
                        _med1, _med2_2, _med2, _med3;
                    results.should.be.an( 'array' ).which.has.lengthOf( 6 );
                    _med2_2 = results[0];
                    _med2_2.actType.should.equal( 'MEDICATION' );
                    _med2_2.code.should.equal( med2.code );
                    _med2_2.status.should.equal( 'VALID' );

                    _med2 = results[1];
                    _med2.actType.should.equal( 'MEDICATION' );
                    _med2.code.should.equal( med2.code );
                    _med2.status.should.equal( 'VALID' );

                    _med1 = results[2];
                    _med1.actType.should.equal( 'MEDICATION' );
                    _med1.code.should.equal( med1.code );
                    _med1.status.should.equal( 'VALID' );

                    results[3].actType.should.equal( 'PUBPRESCR' );
                    results[3].userContent.should.equal( 'Kassenrezept (16)' );
                    // cover old and new MMI texts
                    results[3].content.should.satisfy( txt => {
                        return [
                            `Kassenrezept (16), <br/>(1) 2 x ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu - 1 A Pharma® 600 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `,
                            `Kassenrezept (16), <br/>(1) 2 x ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `
                        ].includes( txt );
                    } );
                    results[3].attachments.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    pubPrescription = results[3];

                    _med3 = results[4];
                    _med3.actType.should.equal( 'MEDICATION' );
                    _med3.code.should.equal( med3.code );
                    _med3.status.should.equal( 'VALID' );

                    results[5].actType.should.equal( 'PRIVPRESCR' );
                    results[5].userContent.should.equal( 'Privatrezept_blau' );
                    results[5].content.should.equal( `Privatrezept_blau, <br/>(1) Spiraea Komplex Hanosan flüssig 50ml N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) ` );
                    results[5].attachments.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    privPrescription = results[5];
                } );
                it( 'Checks public prescription document (form)', async function() {
                    const results = await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'document',
                        action: 'get',
                        query: {
                            _id: {$in: pubPrescription.attachments}
                        },
                        options: {
                            sort: {timestamp: 1},
                            select: {
                                formState: 1
                            }
                        }
                    } );
                    results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    const
                        formState = results[0].formState;
                    let
                        exactMatch1 = pubPrescElemMap.get( 'exactMed1' ),
                        exactMatch2 = pubPrescElemMap.get( 'exactMed2' ),
                        exactMatch3 = pubPrescElemMap.get( 'exactMed3' );

                    Object.keys( testData.prescriptionData.PUBPRESCR ).forEach( key => {
                        const
                            element = pubPrescElemMap.get( key );
                        if( testData.prescriptionData.PUBPRESCR[key] ) {
                            formState[element.id].should.include( '*' );
                        } else {
                            formState[element.id].should.not.include( '*' );
                        }
                    } );
                    formState[exactMatch1.id].should.not.include( '*' );
                    formState[exactMatch2.id].should.include( '*' );
                    formState[exactMatch3.id].should.include( '*' );
                } );
                it( 'Checks private prescription document (form)', async function() {
                    const results = await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'document',
                        action: 'get',
                        query: {
                            _id: {$in: privPrescription.attachments}
                        },
                        options: {
                            sort: {timestamp: 1},
                            select: {
                                formState: 1
                            }
                        }
                    } );
                    results.should.be.an( 'array' ).which.has.lengthOf( 1 );
                    const
                        formState = results[0].formState;
                    let
                        exactMatch1 = privPrescElemMap.get( 'exactMed1' ),
                        exactMatch2 = privPrescElemMap.get( 'exactMed2' ),
                        exactMatch3 = privPrescElemMap.get( 'exactMed3' );

                    Object.keys( testData.prescriptionData.PRIVPRESCR ).forEach( key => {
                        const
                            element = privPrescElemMap.get( key );
                        if( testData.prescriptionData.PRIVPRESCR[key] ) {
                            formState[element.id].should.include( '*' );
                        } else {
                            formState[element.id].should.not.include( '*' );
                        }
                    } );

                    formState[exactMatch1.id].should.include( '*' );
                    formState[exactMatch2.id].should.not.include( '*' );
                    formState[exactMatch3.id].should.not.include( '*' );
                } );
                it( 'count files in case folder', async function() {
                    const result = await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'count',
                        query: {
                            actType: {$ne: 'SCHEIN'}
                        }
                    } );
                    result.should.be.equal( 6 );
                } );
            } );
            describe( 'Test prescription update.', function() {
                let pubPrescription, pubPrescriptionMedication;

                it( 'get PUBPRESCR prescription and linked medications', async function() {
                    const results = await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            $or: [{actType: 'PUBPRESCR'}, {actType: 'MEDICATION'}],
                            caseFolderId,
                            patientId
                        }
                    } );
                    pubPrescription = results.filter( activity => activity.actType === 'PUBPRESCR' )[0];
                    should.exist( pubPrescription );
                    pubPrescriptionMedication = results.filter( activity => activity.actType === 'MEDICATION' && pubPrescription.activities.includes( activity._id.toString() ) );
                    pubPrescriptionMedication.should.be.an( 'array' ).which.has.lengthOf( 3 );
                } );

                it( 'should not throw on update prescription', async function() {
                    this.timeout( 30000 );
                    return new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.prescription.prescriptionAddendum( {
                            user,
                            data: {
                                prescriptionId: pubPrescription._id.toString(),
                                medications: [
                                    pubPrescriptionMedication[0], // keep first medication
                                    Object.assign( pubPrescriptionMedication[1], {
                                        phReason: 'NEW PH REASON',
                                        phNote: 'NEW PH NOTE'
                                    } ) // update second medication
                                    // remove third medication
                                ],
                                employeeId: pubPrescription.employeeId,
                                locationId: pubPrescription.locationId,
                                timestamp: pubPrescription.timestamp,
                                prescriptionData: {
                                    nightTime: true,
                                    otherInsurance: true
                                },
                                print: false,
                                printerName: '',
                                numCopies: 0,
                                taskData: {
                                    employeeId: userEmployee._id,
                                    employeeName: `${userEmployee.firstname} ${userEmployee.lastname}`,
                                    patientId: patientId,
                                    activities: [],
                                    allDay: true,
                                    alertTime: '2017-11-27T23:00:00.000Z',
                                    templateAlertTimeInterval: 'Seconds',
                                    title: 'Bitte drucken (Dokumente)',
                                    urgency: 2,
                                    status: 'ASSIGNED',
                                    details: 'Privatrezept(1)\n',
                                    roles: [],
                                    candidates: ['100000000000000000000003'],
                                    candidatesNames: [],
                                    location: [],
                                    type: ''
                                },
                                showDialog: false,
                                printActivities: []
                            },
                            callback( err, result ) {
                                if( err ) {
                                    reject( err );
                                } else {
                                    resolve( result );
                                }
                            }
                        } );
                    } ).should.be.fulfilled;
                } );

                it( 'should update PUBPRESCR prescription and linked medications', async function() {
                    const results = await Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            $or: [{actType: 'PUBPRESCR'}, {actType: 'MEDICATION'}],
                            caseFolderId,
                            patientId
                        },
                        options: {
                            sort: {timestamp: 1}
                        }
                    } );
                    pubPrescription = results.filter( activity => activity.actType === 'PUBPRESCR' )[0];
                    should.exist( pubPrescription );
                    pubPrescription.nightTime.should.eql( true );
                    pubPrescription.otherInsurance.should.eql( true );
                    pubPrescription.utUnfall.should.eql( false );
                    pubPrescription.workAccident.should.eql( false );
                    pubPrescription.isPatientBVG.should.eql( true );
                    pubPrescription.assistive.should.eql( false );
                    pubPrescription.vaccination.should.eql( true );
                    pubPrescription.practiceAssistive.should.eql( true );
                    pubPrescription.dentist.should.eql( true );
                    pubPrescriptionMedication = results.filter( activity => activity.actType === 'MEDICATION' && pubPrescription.activities.includes( activity._id.toString() ) );
                    pubPrescriptionMedication.should.be.an( 'array' ).which.has.lengthOf( 2 );
                    pubPrescriptionMedication[1].phReason = 'NEW PH REASON';
                    pubPrescriptionMedication[1].phNote = 'NEW PH NOTE';
                } );

                it( 'should create task', function() {
                    return Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'task',
                        action: 'get',
                        query: {},
                        options: {
                            sort: {_id: -1}
                        }
                    } ).should.be.fulfilled
                        .then( data => {
                            data.should.have.lengthOf( 1 );
                            data[0].activities.should.be.an( 'array' );
                            data[0].activities.forEach( item => {
                                item._id = item._id.toString();
                            } );
                            data[0].activities.should.deep.equal( [
                                {
                                    actType: pubPrescription.actType,
                                    _id: pubPrescription._id.toString()
                                }] );
                        } );
                } );
                it( 'cleans tasks', function() {
                    return Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'task',
                        action: 'delete',
                        query: {
                            _id: {$exists: true}
                        }
                    } ).should.be.fulfilled;
                } );

            } );
        } );
        describe( 'Test medication plan and prescription creation', function() {
            before( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            after( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            const
                postData = {
                    'prescriptionGroups': {
                        'PUBPRESCR': {
                            '1': [Object.assign( {count: 4}, med1 ), med2]
                        },
                        'PRIVPRESCR': {
                            '2': [med3]
                        },
                        'PRESCRBTM': {},
                        'PRESCRG': {},
                        'PRESCRT': {},
                        'PRESASSISTIVE': {}
                    },
                    employeeId,
                    locationId: mainLocationId,
                    patientId,
                    caseFolderId,
                    kbvMedicationPlan,
                    timestamp: moment().toISOString()
                };

            it( 'Makes api call', async function() {
                this.timeout( 30000 );
                try {
                    await createPrescriptionsAndMedicationPlanP( {
                        user,
                        data: postData,
                        waitCallback: true
                    } );
                } catch( err ) {
                    if( err.code !== 9001 ) {
                        throw err;
                    }
                }
            } );
            it( 'Check activities order', async function() {
                const results = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId,
                        patientId,
                        actType: {$ne: 'SCHEIN'}
                    },
                    options: {
                        sort: {timestamp: 1},
                        select: {
                            code: 1,
                            status: 1,
                            actType: 1,
                            timestamp: 1,
                            activities: 1,
                            userContent: 1,
                            content: 1
                        }
                    }
                } );
                let
                    _med1, _med1_2, _med1_3, _med1_4, _med2, _med3;
                results.should.be.an( 'array' ).which.has.lengthOf( 9 );
                _med2 = results[1];
                _med2.actType.should.equal( 'MEDICATION' );
                // _med2.code.should.equal( med2.code );
                _med2.status.should.equal( 'VALID' );

                _med1_4 = results[2];
                _med1_4.actType.should.equal( 'MEDICATION' );
                _med1_4.code.should.equal( med1.code );
                _med1_4.status.should.equal( 'VALID' );

                _med1_3 = results[3];
                _med1_3.actType.should.equal( 'MEDICATION' );
                _med1_3.code.should.equal( med1.code );
                _med1_3.status.should.equal( 'VALID' );

                _med1_2 = results[4];
                _med1_2.actType.should.equal( 'MEDICATION' );
                _med1_2.code.should.equal( med1.code );
                _med1_2.status.should.equal( 'VALID' );

                _med1 = results[5];
                _med1.actType.should.equal( 'MEDICATION' );
                _med1.code.should.equal( med1.code );
                _med1.status.should.equal( 'VALID' );

                results[6].actType.should.equal( 'PUBPRESCR' );
                results[6].userContent.should.equal( 'Kassenrezept (16)' );
                //results[ 5 ].content.should.equal( 'Kassenrezept (16), <br/>(1) Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 (2) Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 (3) Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 (4) Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 (5) ASS 100mg elac TAH 100 Tbl. N3' );
                results[6].content.should.satisfy( txt => {
                    return [
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) 4 x Ibu - 1 A Pharma® 600 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `,
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) 4 x Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `
                    ].includes( txt );
                } );
                results[6].activities.should.deep.equal( [_med1._id.toString(), _med1_2._id.toString(), _med1_3._id.toString(), _med1_4._id.toString(), _med2._id.toString()] );

                _med3 = results[7];
                _med3.actType.should.equal( 'MEDICATION' );
                _med3.code.should.equal( med3.code );
                _med3.status.should.equal( 'VALID' );

                results[8].actType.should.equal( 'PRIVPRESCR' );
                results[8].userContent.should.equal( 'Privatrezept_blau' );
                results[8].content.should.equal( `Privatrezept_blau, <br/>(1) Spiraea Komplex Hanosan flüssig 50ml N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) ` );

                results[0].actType.should.equal( 'KBVMEDICATIONPLAN' );

                results[0].activities.should.deep.equal( [_med2._id.toString(), _med1_4._id.toString(), _med1_3._id.toString(), _med1_2._id.toString(), _med1._id.toString(), _med3._id.toString()] );
                //results[ 0 ].activities.should.deep.equal( [ _med2._id.toString(), _med1._id.toString(), _med1_2._id.toString(), _med1_3._id.toString(), _med1_4._id.toString(), _med3._id.toString() ] );
            } );
            it( 'count files in case folder', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                result.should.be.equal( 9 );
            } );
        } );
        describe( 'Test socket events on prescribeMedications (waitCallback: false)', function() {
            const
                testData = {
                    printerName: defaultPrinterName,
                    prescriptionGroups: {
                        'PUBPRESCR': {
                            '1': [Object.assign( {}, med1 ), Object.assign( {}, med2 )]
                        },
                        'PRIVPRESCR': {
                            '2': [Object.assign( {}, med3 )]
                        },
                        'PRESCRBTM': {},
                        'PRESCRG': {},
                        'PRESCRT': {},
                        'PRESASSISTIVE': {}
                    },
                    employeeId,
                    locationId: mainLocationId,
                    patientId,
                    caseFolderId,
                    timestamp: moment().toISOString()
                };

            before( async function() {
                Y.doccirrus.communication.event.on( 'onEmitEventForUser', () => {
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            after( async function() {
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            it( 'Makes api call', async function() {
                this.timeout( 30000 );
                await prescribeMedicationsP( {
                    user,
                    data: testData,
                    waitCallback: true
                } );
            } );
            it( 'Checks order of entries', async function() {
                const results = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId,
                        patientId,
                        actType: {$ne: 'SCHEIN'}
                    },
                    options: {
                        sort: {timestamp: 1},
                        select: {
                            code: 1,
                            status: 1,
                            actType: 1,
                            timestamp: 1,
                            content: 1,
                            userContent: 1,
                            attachments: 1
                        }
                    }
                } );
                let
                    _med1, _med2, _med3;
                results.should.be.an( 'array' ).which.has.lengthOf( 5 );
                _med2 = results[0];
                _med2.actType.should.equal( 'MEDICATION' );
                _med2.code.should.equal( med2.code );
                _med2.status.should.equal( 'VALID' );

                _med1 = results[1];
                _med1.actType.should.equal( 'MEDICATION' );
                _med1.code.should.equal( med1.code );
                _med1.status.should.equal( 'VALID' );

                results[2].actType.should.equal( 'PUBPRESCR' );
                results[2].userContent.should.equal( 'Kassenrezept (16)' );
                results[2].content.should.satisfy( txt => {
                    return [
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu - 1 A Pharma® 600 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `,
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `
                    ].includes( txt );
                } );
                results[2].attachments.should.be.an( 'array' ).which.has.lengthOf( 1 );

                _med3 = results[3];
                _med3.actType.should.equal( 'MEDICATION' );
                _med3.code.should.equal( med3.code );
                _med3.status.should.equal( 'VALID' );

                results[4].actType.should.equal( 'PRIVPRESCR' );
                results[4].userContent.should.equal( 'Privatrezept_blau' );
                results[4].content.should.equal( `Privatrezept_blau, <br/>(1) Spiraea Komplex Hanosan flüssig 50ml N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) ` );
                //  has a form, but not a PDF at this point
                results[4].attachments.should.be.an( 'array' ).which.has.lengthOf( 1 );
            } );
            it( 'count files in case folder', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                result.should.be.equal( 5 );
            } );
        } );
        describe( 'Test socket events on createPrescriptionsAndMedicationPlan (waitCallback: false)', function() {
            const
                postData = {
                    'prescriptionGroups': {
                        'PUBPRESCR': {
                            '1': [med1, med2]
                        },
                        'PRIVPRESCR': {
                            '2': [med3]
                        },
                        'PRESCRBTM': {},
                        'PRESCRG': {},
                        'PRESCRT': {},
                        'PRESASSISTIVE': {}
                    },
                    employeeId,
                    locationId: mainLocationId,
                    patientId,
                    caseFolderId,
                    kbvMedicationPlan,
                    timestamp: moment().toISOString()
                },
                emitEventForUserData = [];

            before( async function() {
                Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                    emitEventForUserData.push( params );
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            after( async function() {
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );

            it( 'Makes api call', async function() {
                this.timeout( 30000 );
                await new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.prescription.createPrescriptionsAndMedicationPlan( {
                        user,
                        data: postData,
                        callback() {
                        },
                        _callback( err ) {
                            if( err ) {
                                if( err.code !== 9001 ) {
                                    return reject( err );
                                }
                            }
                            resolve();
                        }
                    } );
                } );
            } );
            it( 'Checks socket events', function() {
                emitEventForUserData.should.deep.include( {
                    targetId: '000',
                    event: 'system.UPDATE_ACTIVITIES_TABLES',
                    msg: {data: caseFolderId}
                } );
            } );
            it( 'Check activities order', async function() {
                const results = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId,
                        patientId,
                        actType: {$ne: 'SCHEIN'}
                    },
                    options: {
                        sort: {timestamp: 1},
                        select: {
                            code: 1,
                            status: 1,
                            actType: 1,
                            timestamp: 1,
                            activities: 1,
                            userContent: 1,
                            content: 1
                        }
                    }
                } );
                let
                    _med1, _med2, _med3;
                results.should.be.an( 'array' ).which.has.lengthOf( 6 );
                _med2 = results[1];
                _med2.actType.should.equal( 'MEDICATION' );
                // _med2.code.should.equal( med2.code );
                _med2.status.should.equal( 'VALID' );

                _med1 = results[2];
                _med1.actType.should.equal( 'MEDICATION' );
                _med1.code.should.equal( med1.code );
                _med1.status.should.equal( 'VALID' );

                results[3].actType.should.equal( 'PUBPRESCR' );
                results[3].userContent.should.equal( 'Kassenrezept (16)' );
                results[3].content.should.satisfy( txt => {
                    return [
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu - 1 A Pharma® 600 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `,
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `
                    ].includes( txt );
                } );
                results[3].activities.should.deep.equal( [_med1._id.toString(), _med2._id.toString()] );

                _med3 = results[4];
                _med3.actType.should.equal( 'MEDICATION' );
                _med3.code.should.equal( med3.code );
                _med3.status.should.equal( 'VALID' );

                results[5].actType.should.equal( 'PRIVPRESCR' );
                results[5].userContent.should.equal( 'Privatrezept_blau' );
                results[5].content.should.equal( `Privatrezept_blau, <br/>(1) Spiraea Komplex Hanosan flüssig 50ml N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) ` );

                results[0].actType.should.equal( 'KBVMEDICATIONPLAN' );
                results[0].activities.should.deep.equal( [_med2._id.toString(), _med1._id.toString(), _med3._id.toString()] );
            } );
            it( 'count files in case folder', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                result.should.be.equal( 6 );
            } );
        } );
        describe( 'Positive test print prescribeMedications', function() {
            const
                testData = {
                    printerName: '',
                    'prescriptionGroups': {
                        'PUBPRESCR': {
                            '1': [Object.assign( {}, med1 ), Object.assign( {}, med2 )]
                        },
                        'PRIVPRESCR': {
                            '2': [Object.assign( {}, med3 )]
                        },
                        'PRESCRBTM': {},
                        'PRESCRG': {},
                        'PRESCRT': {},
                        'PRESASSISTIVE': {}
                    },
                    employeeId,
                    locationId: mainLocationId,
                    patientId,
                    caseFolderId,
                    timestamp: moment().toISOString(),
                    print: false
                },
                eventBlackList = ['linkedActivityUpdate', 'pdfRenderProgress'];

            let
                onPrintFile = [],
                emitEventForUserData = [],
                printItems;

            before( async function() {
                Y.doccirrus.printer.event.on( 'onPrintFile', ( params ) => {
                    onPrintFile.push( params );
                } );
                Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                    if( eventBlackList.includes( params.event ) ) {
                        return;
                    }
                    emitEventForUserData.push( params );
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    action: 'update',
                    fields: ['defaultPrinter', 'enabledPrinters'],
                    data: {
                        enabledPrinters: [defaultPrinterName],
                        defaultPrinter: defaultPrinterName
                    },
                    query: {
                        _id: mainLocationId
                    }
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    action: 'update',
                    fields: ['currentLocation'],
                    data: {
                        skipcheck_: true,
                        currentLocation: mainLocationId
                    },
                    query: {
                        _id: userEmployee._id
                    }
                } );
            } );
            after( async function() {
                Y.doccirrus.printer.event.removeAllListeners( 'onPrintFile' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );

            it( 'Makes api call to create activities', async function() {
                this.timeout( 30000 );
                await new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.prescription.prescribeMedications( {
                        user: user,
                        data: testData,
                        callback() {
                        },
                        _callback( err, data ) {
                            if( err ) {
                                return reject( err );
                            }
                            //  record new PRESCRIPTION activities to be printed in next step
                            printItems = [];

                            if( data && data.prescriptions ) {
                                data.prescriptions.forEach( function( item ) {
                                    printItems.push( {
                                        copies: 0,
                                        printerName: defaultPrinterName,
                                        activity: item
                                    } );
                                } );
                            }
                            data.notPrintedActivities.should.be.an( 'array' ).which.has.lengthOf( 2 );
                            return resolve();
                        }
                    } );
                } );
            } );
            it( 'Makes api call to print newly created activities', async function() {
                this.timeout( 30000 );      //  TODO: 15000
                const printResult = await printPrescriptionsP( {
                    user: user,
                    data: printItems,
                    waitCallback: true
                } );
                printResult.should.be.an( 'array' ).which.has.lengthOf( 2 );
                printResult[0].result.copies.should.be.an( 'array' ).which.has.lengthOf( 0 );
                printResult[0].result.msg.should.equal( 'Die Datei wurde erfolgreich zum Drucker gesendet. <!--undefined-->' );

                //  when print is complete, user should have been notified of new print jobs by ws
                onPrintFile.should.have.lengthOf( 2 );
                onPrintFile[0].printerName.should.equal( defaultPrinterName );
                onPrintFile[1].printerName.should.equal( defaultPrinterName );

                //  when print is complete, there should be new PDFs to be displayed in inCase, so user should
                //  also have received a WS events to update UI

                emitEventForUserData.should.have.lengthOf( 7 );
                emitEventForUserData[0].event.should.equal( 'system.UPDATE_ACTIVITIES_TABLES' );
                emitEventForUserData[0].msg.data.should.equal( caseFolderId );

                // checking success message of first print
                emitEventForUserData[4].event.should.equal( 'asyncPDFPrinted' );
                emitEventForUserData[4].msg.data.printerName.should.equal( defaultPrinterName );
                emitEventForUserData[4].msg.data.msg.should.equal( 'Die Datei wurde erfolgreich zum Drucker gesendet. <!--undefined-->' );

                // checking for update of print count
                emitEventForUserData[5].event.should.equal( 'activityPrinted' );

                // checking success message of second print
                emitEventForUserData[6].event.should.equal( 'asyncPDFPrinted' );
                emitEventForUserData[6].msg.data.printerName.should.equal( defaultPrinterName );
                emitEventForUserData[6].msg.data.msg.should.equal( 'Die Datei wurde erfolgreich zum Drucker gesendet. <!--undefined-->' );

                //  cleanup event buffers before next run
                emitEventForUserData = [];
                onPrintFile = [];
            } );
            it( 'Makes api call to print newly created activities with copies', async function() {
                this.timeout( 30000 );
                printItems[0].copies = 2;

                const printResult = await printPrescriptionsP( {
                    user: user,
                    data: printItems,
                    waitCallback: true
                } );
                printResult.should.be.an( 'array' ).which.has.lengthOf( 2 );
                printResult[0].result.msg.should.equal( 'Die Datei wurde erfolgreich zum Drucker gesendet. <!--undefined-->' );

                printResult[0].result.copies.should.be.an( 'array' ).which.has.lengthOf( 1 );
                printResult[0].result.copies[0].status.should.equal( 'complete' );
                printResult[0].result.copies[0].msg.should.equal( 'KOPIE (2)' );
                printResult[0].result.copies[0].printerName.should.equal( defaultPrinterName );

                //  two prints, two copies
                onPrintFile.should.have.lengthOf( 4 );

                //  two prints, copies are nto saved and should not update inCase activities table
                emitEventForUserData.should.have.lengthOf( 6 );

                // event for update print count
                emitEventForUserData[0].event.should.equal( 'activityPrinted' );

                // event for single print
                emitEventForUserData[1].event.should.equal( 'asyncPDFPrinted' );
                emitEventForUserData[1].msg.data.printerName.should.equal( defaultPrinterName );
                emitEventForUserData[1].msg.data.msg.should.equal( 'Die Datei wurde erfolgreich zum Drucker gesendet. <!--undefined-->' );

                // event for update print count
                emitEventForUserData[2].event.should.equal( 'activityPrinted' );

                // event for print copies
                emitEventForUserData[3].event.should.equal( 'asyncPDFPrinted' );
                emitEventForUserData[3].msg.data.status.should.equal( 'complete' );
                emitEventForUserData[3].msg.data.msg.should.equal( 'KOPIE (2)' );

                // event for update print count
                emitEventForUserData[4].event.should.equal( 'activityPrinted' );

                // event for second single print
                emitEventForUserData[5].event.should.equal( 'asyncPDFPrinted' );
                emitEventForUserData[5].msg.data.printerName.should.equal( defaultPrinterName );
                emitEventForUserData[5].msg.data.msg.should.equal( 'Die Datei wurde erfolgreich zum Drucker gesendet. <!--undefined-->' );

                //  cleanup event buffers before next run
                emitEventForUserData = [];
                onPrintFile = [];

            } );
            it( 'Checks order of entries', async function() {
                const results = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId,
                        patientId,
                        actType: {$ne: 'SCHEIN'}
                    },
                    options: {
                        sort: {timestamp: 1},
                        select: {
                            code: 1,
                            status: 1,
                            actType: 1,
                            timestamp: 1,
                            content: 1,
                            userContent: 1,
                            attachments: 1
                        }
                    }
                } );
                let
                    _med1, _med2, _med3;
                results.should.be.an( 'array' ).which.has.lengthOf( 5 );
                _med2 = results[0];
                _med2.actType.should.equal( 'MEDICATION' );
                _med2.code.should.equal( med2.code );
                _med2.status.should.equal( 'VALID' );

                _med1 = results[1];
                _med1.actType.should.equal( 'MEDICATION' );
                _med1.code.should.equal( med1.code );
                _med1.status.should.equal( 'VALID' );

                results[2].actType.should.equal( 'PUBPRESCR' );
                results[2].userContent.should.equal( 'Kassenrezept (16)' );

                results[2].content.should.satisfy( txt => {
                    return [
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu - 1 A Pharma® 600 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `,
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `
                    ].includes( txt );
                } );
                results[2].attachments.should.be.an( 'array' ).which.has.lengthOf( 2 ); //form and pdf

                _med3 = results[3];
                _med3.actType.should.equal( 'MEDICATION' );
                _med3.code.should.equal( med3.code );
                _med3.status.should.equal( 'VALID' );

                results[4].actType.should.equal( 'PRIVPRESCR' );
                results[4].userContent.should.equal( 'Privatrezept_blau' );
                results[4].content.should.equal( `Privatrezept_blau, <br/>(1) Spiraea Komplex Hanosan flüssig 50ml N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) ` );
                results[4].attachments.should.be.an( 'array' ).which.has.lengthOf( 2 ); //form and PDF
            } );
            it( 'count files in case folder', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                result.should.be.equal( 5 );
            } );
        } );
        describe( 'Test print medication plan', function() {
            const
                postData = {
                    medications: [
                        med1,
                        med2,
                        med3
                    ],
                    employeeId,
                    locationId: mainLocationId,
                    patientId,
                    caseFolderId,
                    timestamp: moment().toISOString(),
                    print: true,
                    printerName: defaultPrinterName
                },
                onPrintFile = [],
                emitEventForUserData = [],
                eventBlackList = ['linkedActivityUpdate', 'pdfRenderProgress'];
            let
                notPrintedActivities,
                mmiOn = false;
            before( async function() {
                this.timeout( 5000 );
                Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                    if( eventBlackList.includes( params.event ) ) {
                        return;
                    }
                    emitEventForUserData.push( params );
                } );
                Y.doccirrus.printer.event.on( 'onPrintFile', ( params ) => {
                    onPrintFile.push( params );
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            after( async function() {
                Y.doccirrus.printer.event.removeAllListeners( 'onPrintFile' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );

            it( 'Makes api call', async function() {
                this.timeout( 30000 );
                try {
                    await new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.activity.createMedicationPlanForMedications( {
                            user,
                            data: postData,
                            callback() {
                            },
                            _callback( err, data ) {
                                if( err ) {
                                    return reject( err );
                                }
                                notPrintedActivities = data.notPrintedActivities;
                                return resolve();
                            }
                        } );
                        setTimeout( function() {
                            return reject( {code: 9001} );
                        }, 28000 );
                    } );
                    mmiOn = true;
                } catch( err ) {
                    mmiOn = !(err && err.code === 9001);
                }
            } );
            it( 'Checks onPrintFile', function() {
                if( mmiOn ) {
                    if( notPrintedActivities && notPrintedActivities.length ) { // mmi is off
                        emitEventForUserData.should.have.lengthOf( 3 );
                        emitEventForUserData[0].msg.data.should.equal( 'Ihr MMI Dienst steht aktuell nicht zur Verfügung.' );
                        emitEventForUserData[1].event.should.equal( 'system.UPDATE_ACTIVITIES_TABLES' );
                        emitEventForUserData[1].msg.data.should.equal( caseFolderId );
                    } else { // mmi is on
                        onPrintFile.should.have.lengthOf( 1 );
                        onPrintFile[0].printerName.should.equal( defaultPrinterName );
                        emitEventForUserData.should.have.lengthOf( 6 );
                        emitEventForUserData[0].event.should.equal( 'system.UPDATE_ACTIVITIES_TABLES' );
                        emitEventForUserData[0].msg.data.should.equal( caseFolderId );
                        emitEventForUserData[1].event.should.equal( 'system.UPDATE_ACTIVITIES_TABLES' );
                        emitEventForUserData[1].msg.data.should.equal( caseFolderId );
                        emitEventForUserData[2].event.should.equal( 'system.UPDATE_ACTIVITIES_TABLES' );
                        emitEventForUserData[2].msg.data.should.equal( caseFolderId );
                        emitEventForUserData[3].event.should.equal( 'system.UPDATE_ACTIVITIES_TABLES' );
                        emitEventForUserData[3].msg.data.should.equal( caseFolderId );
                        emitEventForUserData[4].event.should.equal( 'system.UPDATE_ACTIVITIES_TABLES' );
                        emitEventForUserData[4].msg.data.should.equal( caseFolderId );
                        emitEventForUserData[5].event.should.equal( 'message' );
                        emitEventForUserData[5].msg.data.should.equal( 'Folgende 1 Druckaufträge wurden gestartet: \n an defaultMochaPrinter' );
                    }
                }
            } );
            it( 'Check activities order', async function() {
                const results = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId,
                        patientId,
                        actType: {$ne: 'SCHEIN'}
                    },
                    options: {
                        sort: {timestamp: 1},
                        select: {
                            code: 1,
                            status: 1,
                            actType: 1,
                            timestamp: 1,
                            activities: 1
                        }
                    }
                } );
                results.should.be.an( 'array' ).which.has.lengthOf( 4 );
                results[0].actType.should.equal( 'MEDICATION' );
                results[0].code.should.equal( med3.code );
                results[0].status.should.equal( 'VALID' );
                results[1].actType.should.equal( 'MEDICATION' );
                results[1].code.should.equal( med2.code );
                results[1].status.should.equal( 'VALID' );
                results[2].actType.should.equal( 'MEDICATION' );
                results[2].code.should.equal( med1.code );
                results[2].status.should.equal( 'VALID' );
                results[3].actType.should.equal( 'MEDICATIONPLAN' );
                results[3].activities.should.deep.equal( [results[2]._id.toString(), results[1]._id.toString(), results[0]._id.toString()] );
            } );
            it( 'count files in case folder', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                result.should.be.equal( 4 );
            } );
        } );
        describe( 'Test print createPrescriptionsAndMedicationPlan', function() {
            const
                postData = {
                    printerName: defaultPrinterName,
                    prescriptionGroups: {
                        PUBPRESCR: {
                            '1': [med1, med2]
                        },
                        PRIVPRESCR: {
                            '2': [med3]
                        },
                        PRESCRBTM: {},
                        PRESCRG: {},
                        PRESCRT: {},
                        PRESASSISTIVE: {}
                    },
                    employeeId,
                    locationId: mainLocationId,
                    patientId,
                    kbvMedicationPlan,
                    caseFolderId,
                    timestamp: moment().toISOString(),
                    print: true
                },
                emitEventForUserData = [],
                onPrintFile = [],
                eventBlackList = ['linkedActivityUpdate', 'pdfRenderProgress'];
            let
                notPrintedActivities,
                printedActivities,
                mmiOff = false;

            before( async function() {
                Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                    if( eventBlackList.includes( params.event ) ) {
                        return;
                    }
                    if( params.msg && 'Der Administrator hat Ihre Konfigurationseinstellungen geändert. Bitte loggen Sie sich zum aktivieren der Einstellungen neu an.' === params.msg.data ) {
                        return;
                    }
                    emitEventForUserData.push( params );
                } );
                Y.doccirrus.printer.event.on( 'onPrintFile', ( params ) => {
                    onPrintFile.push( params );
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'location',
                    action: 'update',
                    fields: ['defaultPrinter', 'enabledPrinters'],
                    data: {
                        enabledPrinters: [defaultPrinterName],
                        defaultPrinter: defaultPrinterName
                    },
                    query: {
                        _id: mainLocationId
                    }
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    action: 'update',
                    fields: ['currentLocation'],
                    data: {
                        skipcheck_: true,
                        currentLocation: mainLocationId
                    },
                    query: {
                        _id: userEmployee._id
                    }
                } );
            } );
            after( async function() {
                Y.doccirrus.printer.event.removeAllListeners( 'onPrintFile' );
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            it( 'Makes api call', async function() {
                this.timeout( 30000 );
                try {
                    const data = await new Promise( ( resolve, reject ) => {
                        Y.doccirrus.api.prescription.createPrescriptionsAndMedicationPlan( {
                            user: user,
                            data: postData,
                            callback() {
                            },
                            _callback( err, result ) {
                                if( err ) {
                                    return reject( err );
                                }
                                return resolve( result );
                            }
                        } );
                    } );
                    should.exist( data );
                    notPrintedActivities = data.notPrintedActivities;
                    printedActivities = data.printedActivities;
                    // due to EXTMOJ-1758 (inCase, MMI) Wait for MMI PDF before printing from VO modal
                    // medicationPlanOnly: true,       //  do no create medication activities
                    // mediactions are not printed
                } catch( err ) {
                    if( err.code === 9001 ) {
                        mmiOff = true; // Error: Ihr MMI Dienst steht aktuell nicht zur Verfügung.
                    } else {
                        mmiOff = false;
                        throw err;
                    }
                }
            } );
            it( 'Checks onPrintFile', async function() {
                if( !mmiOff ) {
                    if( notPrintedActivities && notPrintedActivities.length && printedActivities && 0 === printedActivities.length ) { // mmi is off
                        emitEventForUserData.should.have.lengthOf( 5 );
                        emitEventForUserData[0].event.should.equal( 'system.UPDATE_ACTIVITIES_TABLES' );
                        emitEventForUserData[0].msg.data.should.equal( caseFolderId );
                    } else { // mmi is on
                        onPrintFile.should.have.lengthOf( 1 );
                        onPrintFile[0].printerName.should.equal( defaultPrinterName );
                        emitEventForUserData.should.have.lengthOf( 2 );
                        emitEventForUserData[0].event.should.equal( 'system.UPDATE_ACTIVITIES_TABLES' );
                        emitEventForUserData[0].msg.data.should.equal( caseFolderId );
                        emitEventForUserData[1].event.should.equal( 'system.UPDATE_ACTIVITIES_TABLES' );
                        emitEventForUserData[1].msg.data.should.equal( caseFolderId );

                        // not called due to
                        //  waitCallback: true,             //  do not call back immediately
                        //emitEventForUserData[ 2 ].event.should.equal( 'message' );
                        //emitEventForUserData[ 2 ].msg.data.should.equal( 'Folgende 3 Druckaufträge wurden gestartet: \nKassenrezept an defaultMochaPrinter\nPrivatrezept an defaultMochaPrinter\nMedikationsplan an defaultMochaPrinter' );
                    }
                }
            } );
            it( 'Check activities order', async function() {
                const results = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId,
                        patientId,
                        actType: {$ne: 'SCHEIN'}
                    },
                    options: {
                        sort: {timestamp: 1},
                        select: {
                            code: 1,
                            status: 1,
                            actType: 1,
                            timestamp: 1,
                            activities: 1,
                            userContent: 1,
                            content: 1
                        }
                    }
                } );
                let
                    _med1, _med2, _med3;
                results.should.be.an( 'array' ).which.has.lengthOf( 6 );
                _med2 = results[1];
                _med2.actType.should.equal( 'MEDICATION' );
                _med2.code.should.equal( med2.code );
                _med2.status.should.equal( 'VALID' );

                _med1 = results[2];
                _med1.actType.should.equal( 'MEDICATION' );
                _med1.code.should.equal( med1.code );
                _med1.status.should.equal( 'VALID' );

                results[3].actType.should.equal( 'PUBPRESCR' );
                results[3].userContent.should.equal( 'Kassenrezept (16)' );
                results[3].content.should.satisfy( txt => {
                    return [
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu - 1 A Pharma® 600 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `,
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `
                    ].includes( txt );
                } );
                _med3 = results[4];
                _med3.actType.should.equal( 'MEDICATION' );
                _med3.code.should.equal( med3.code );
                _med3.status.should.equal( 'VALID' );

                results[5].actType.should.equal( 'PRIVPRESCR' );
                results[5].userContent.should.equal( 'Privatrezept_blau' );
                results[5].content.should.equal( `Privatrezept_blau, <br/>(1) Spiraea Komplex Hanosan flüssig 50ml N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) ` );

                results[0].actType.should.equal( 'KBVMEDICATIONPLAN' );
                results[0].activities.should.deep.equal( [_med2._id.toString(), _med1._id.toString(), _med3._id.toString()] );
            } );
            it( 'count files in case folder', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                result.should.be.equal( 6 );
            } );
        } );
        describe( 'Test task print prescribeMedications', function() {
            const
                testData = {
                    printerName: defaultPrinterName,
                    'prescriptionGroups': {
                        'PUBPRESCR': {
                            '1': [Object.assign( {}, med1 ), Object.assign( {}, med2 )]
                        },
                        'PRIVPRESCR': {
                            '2': [Object.assign( {}, med3 )]
                        },
                        'PRESCRBTM': {},
                        'PRESCRG': {},
                        'PRESCRT': {},
                        'PRESASSISTIVE': {}
                    },
                    employeeId,
                    locationId: mainLocationId,
                    patientId,
                    caseFolderId,
                    timestamp: moment().toISOString(),
                    taskData: {
                        employeeId: userEmployee._id,
                        employeeName: `${userEmployee.firstname} ${userEmployee.lastname}`,
                        patientId: patientId,
                        activities: [],
                        allDay: true,
                        alertTime: '2017-11-27T23:00:00.000Z',
                        templateAlertTimeInterval: 'Seconds',
                        title: 'Bitte drucken (Dokumente)',
                        urgency: 2,
                        status: 'ASSIGNED',
                        details: 'Privatrezept(1)\n',
                        roles: [],
                        candidates: ['100000000000000000000003'],
                        candidatesNames: [],
                        location: [],
                        type: ''
                    }
                };
            let
                prescription1,
                prescription2;

            before( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'delete',
                    query: {
                        _id: {$exists: true}
                    }
                } );
            } );
            after( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            it( 'Makes api call', async function() {
                this.timeout( 30000 );
                const data = await prescribeMedicationsP( {
                    user: user,
                    data: testData,
                    waitCallback: true
                } );
                data.notPrintedActivities.should.be.an( 'array' ).which.has.lengthOf( 2 );
            } );
            it( 'Checks order of entries', async function() {
                const results = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId,
                        patientId,
                        actType: {$ne: 'SCHEIN'}
                    },
                    options: {
                        sort: {timestamp: 1},
                        select: {
                            code: 1,
                            status: 1,
                            actType: 1,
                            timestamp: 1,
                            content: 1,
                            userContent: 1,
                            attachments: 1
                        }
                    }
                } );
                let
                    _med1, _med2, _med3;
                results.should.be.an( 'array' ).which.has.lengthOf( 5 );
                _med2 = results[0];
                _med2.actType.should.equal( 'MEDICATION' );
                _med2.code.should.equal( med2.code );
                _med2.status.should.equal( 'VALID' );

                _med1 = results[1];
                _med1.actType.should.equal( 'MEDICATION' );
                _med1.code.should.equal( med1.code );
                _med1.status.should.equal( 'VALID' );

                prescription1 = results[2];
                prescription1.actType.should.equal( 'PUBPRESCR' );
                prescription1.userContent.should.equal( 'Kassenrezept (16)' );
                prescription1.content.should.satisfy( txt => {
                    return [
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu - 1 A Pharma® 600 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `,
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `
                    ].includes( txt );
                } );
                _med3 = results[3];
                _med3.actType.should.equal( 'MEDICATION' );
                _med3.code.should.equal( med3.code );
                _med3.status.should.equal( 'VALID' );

                prescription2 = results[4];
                prescription2.actType.should.equal( 'PRIVPRESCR' );
                prescription2.userContent.should.equal( 'Privatrezept_blau' );
                prescription2.content.should.equal( `Privatrezept_blau, <br/>(1) Spiraea Komplex Hanosan flüssig 50ml N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) ` );
            } );
            it( 'Checks task', async function() {
                const data = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } );
                data.should.have.lengthOf( 1 );
                data[0].activities.should.be.an( 'array' );
                data[0].activities.forEach( item => {
                    item._id = item._id.toString();
                } );
                data[0].activities.should.deep.equal( [
                    {
                        actType: prescription1.actType,
                        _id: prescription1._id.toString()
                    }, {
                        actType: prescription2.actType,
                        _id: prescription2._id.toString()
                    }] );
            } );
            it( 'count files in case folder', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                result.should.be.equal( 5 );
            } );
        } );
        describe( 'Test task print medication plan', function() {
            const
                postData = {
                    medications: [
                        med1,
                        med2,
                        med3
                    ],
                    employeeId,
                    locationId: mainLocationId,
                    patientId,
                    caseFolderId,
                    timestamp: moment().toISOString(),
                    taskData: {
                        employeeId: userEmployee._id,
                        employeeName: `${userEmployee.firstname} ${userEmployee.lastname}`,
                        patientId: patientId,
                        activities: [],
                        allDay: true,
                        alertTime: '2017-11-27T23:00:00.000Z',
                        templateAlertTimeInterval: 'Seconds',
                        title: 'Bitte drucken (Dokumente)',
                        urgency: 2,
                        status: 'ASSIGNED',
                        details: 'Privatrezept(1)\n',
                        roles: [],
                        candidates: ['100000000000000000000003'],
                        candidatesNames: [],
                        location: [],
                        type: ''
                    }
                };

            let
                medicationPlan;
            before( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'delete',
                    query: {
                        _id: {$exists: true}
                    }
                } );
            } );
            after( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            it( 'Makes api call', async function() {
                this.timeout( 30000 );
                const data = await createMedicationPlanForMedicationsP( {
                    user,
                    data: postData,
                    waitCallback: true
                } );
                data.notPrintedActivities.should.be.an( 'array' ).which.has.lengthOf( 1 );
            } );
            it( 'Check activities order', async function() {
                const results = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId,
                        patientId,
                        actType: {$ne: 'SCHEIN'}
                    },
                    options: {
                        sort: {timestamp: 1},
                        select: {
                            code: 1,
                            status: 1,
                            actType: 1,
                            timestamp: 1,
                            activities: 1
                        }
                    }
                } );
                results.should.be.an( 'array' ).which.has.lengthOf( 4 );
                results[0].actType.should.equal( 'MEDICATION' );
                results[0].code.should.equal( med3.code );
                results[0].status.should.equal( 'VALID' );
                results[1].actType.should.equal( 'MEDICATION' );
                results[1].code.should.equal( med2.code );
                results[1].status.should.equal( 'VALID' );
                results[2].actType.should.equal( 'MEDICATION' );
                results[2].code.should.equal( med1.code );
                results[2].status.should.equal( 'VALID' );
                medicationPlan = results[3];
                medicationPlan.actType.should.equal( 'MEDICATIONPLAN' );
                medicationPlan.activities.should.deep.equal( [results[2]._id.toString(), results[1]._id.toString(), results[0]._id.toString()] );
            } );
            it( 'Checks task', async function() {
                const data = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } );
                data.should.have.lengthOf( 1 );
                data[0].activities.should.be.an( 'array' );
                data[0].activities.forEach( item => {
                    item._id = item._id.toString();
                } );
                data[0].activities.should.deep.equal( [
                    {
                        actType: medicationPlan.actType,
                        _id: medicationPlan._id.toString()
                    }] );
            } );
            it( 'count files in case folder', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                result.should.be.equal( 4 );
            } );
        } );
        describe( 'Test task print createPrescriptionsAndMedicationPlan', function() {
            const
                testData = {
                    'prescriptionGroups': {
                        'PUBPRESCR': {
                            '1': [Object.assign( {}, med1 ), Object.assign( {}, med2 )]
                        },
                        'PRIVPRESCR': {
                            '2': [Object.assign( {}, med3 )]
                        },
                        'PRESCRBTM': {},
                        'PRESCRG': {},
                        'PRESCRT': {},
                        'PRESASSISTIVE': {}
                    },
                    employeeId,
                    locationId: mainLocationId,
                    patientId,
                    caseFolderId,
                    kbvMedicationPlan,
                    timestamp: moment().toISOString(),
                    taskData: {
                        employeeId: userEmployee._id,
                        employeeName: `${userEmployee.firstname} ${userEmployee.lastname}`,
                        patientId: patientId,
                        activities: [],
                        allDay: true,
                        alertTime: '2017-11-27T23:00:00.000Z',
                        templateAlertTimeInterval: 'Seconds',
                        title: 'Bitte drucken (Dokumente)',
                        urgency: 2,
                        status: 'ASSIGNED',
                        details: 'Privatrezept(1)\n',
                        roles: [],
                        candidates: ['100000000000000000000003'],
                        candidatesNames: [],
                        location: [],
                        type: ''
                    }
                };
            let
                prescription1,
                prescription2,
                medicationPlan,
                mmiOn = true;

            before( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'delete',
                    query: {
                        _id: {$exists: true}
                    }
                } );
            } );
            after( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            it( 'Makes api call', async function() {
                this.timeout( 30000 );
                try {
                    const data = await createPrescriptionsAndMedicationPlanP( {
                        user: user,
                        data: testData,
                        waitCallback: true
                    } );
                    data.notPrintedActivities.should.be.an( 'array' ).which.has.lengthOf( 2 );
                } catch( err ) {
                    mmiOn = false;
                    if( err.code !== 9001 ) {
                        throw err;
                    }
                }
            } );
            it( 'Checks order of entries', async function() {
                const results = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId,
                        patientId,
                        actType: {$ne: 'SCHEIN'}
                    },
                    options: {
                        sort: {timestamp: 1},
                        select: {
                            code: 1,
                            status: 1,
                            actType: 1,
                            content: 1,
                            userContent: 1,
                            activities: 1
                        }
                    }
                } );
                let
                    _med1, _med2, _med3;
                results.should.be.an( 'array' ).which.has.lengthOf( 6 );
                _med2 = results[1];
                _med2.actType.should.equal( 'MEDICATION' );
                _med2.code.should.equal( med2.code );
                _med2.status.should.equal( 'VALID' );

                _med1 = results[2];
                _med1.actType.should.equal( 'MEDICATION' );
                _med1.code.should.equal( med1.code );
                _med1.status.should.equal( 'VALID' );

                prescription1 = results[3];
                prescription1.actType.should.equal( 'PUBPRESCR' );
                prescription1.userContent.should.equal( 'Kassenrezept (16)' );
                prescription1.content.should.satisfy( txt => {
                    return [
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu - 1 A Pharma® 600 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `,
                        `Kassenrezept (16), <br/>(1) ASS 100mg elac TAH 100 Tbl. N3 2-0-3  (${moment().format( 'DD.MM.YYYY' )})  (2) Ibu 600 - 1 A Pharma® 20 Filmtbl. N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) `
                    ].includes( txt );
                } );
                _med3 = results[4];
                _med3.actType.should.equal( 'MEDICATION' );
                _med3.code.should.equal( med3.code );
                _med3.status.should.equal( 'VALID' );

                prescription2 = results[5];
                prescription2.actType.should.equal( 'PRIVPRESCR' );
                prescription2.userContent.should.equal( 'Privatrezept_blau' );
                prescription2.content.should.equal( `Privatrezept_blau, <br/>(1) Spiraea Komplex Hanosan flüssig 50ml N1 0-0-0-0  (${moment().format( 'DD.MM.YYYY' )}) ` );

                medicationPlan = results[0];
                medicationPlan.actType.should.equal( 'KBVMEDICATIONPLAN' );
                medicationPlan.activities.should.deep.equal( [_med2._id.toString(), _med1._id.toString(), _med3._id.toString()] );
            } );
            it( 'Checks task', async function() {
                const data = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'task',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {_id: -1}
                    }
                } );
                if( mmiOn ) {
                    data.should.have.lengthOf( 1 );
                    data[0].activities.should.be.an( 'array' );
                    data[0].activities.forEach( item => {
                        item._id = item._id.toString();
                    } );
                    data[0].activities.should.deep.equal( [
                        {
                            actType: prescription1.actType,
                            _id: prescription1._id.toString()
                        },
                        {
                            actType: prescription2.actType,
                            _id: prescription2._id.toString()
                        }] );
                }
            } );
            it( 'count files in case folder', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                result.should.be.equal( 6 );
            } );
        } );
    } );

    context( 'ch', function() {
        let oldCountryMode;

        before( async function() {
            this.timeout( 30000 );
            await cleanDb( {
                user: user
            } );

            //prevent triggering ruleengine
            Y.doccirrus.auth._isMocha = Y.doccirrus.auth.isMocha;
            Y.doccirrus.auth.isMocha = () => true;

            if( !Y.config ) {
                Y.config = {};
            }

            if( !Y.config.doccirrus ) {
                Y.config.doccirrus = {};
            }

            if( !Y.config.doccirrus.Env ) {
                Y.config.doccirrus.Env = {};
            }

            oldCountryMode = Y.config.doccirrus.Env.countryMode;
            Y.config.doccirrus.Env.countryMode = ['CH'];

            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'location',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: mainLocationId,
                    countryMode: 'CH',
                    countryCode: 'CH',
                    zip: 1210,
                    cantonCode: '3',
                    bankIBAN: '01-162-8',
                    esrNumber: '010001628',
                    zsrNumber: "T277419",
                    glnNumber: '7601000993939'
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'employee',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getEmployeeData( {
                    _id: employeeId,
                    countryMode: 'CH',
                    zsrNumber: 'T277489',
                    qualiDignities: ['0500'],
                    glnNumber: '7601000164874'
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getIdentityData( {
                    _id: identityId,
                    specifiedBy: employeeId
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'patient',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getPatientData( {
                    _id: patientId,
                    firstname: 'test',
                    lastname: 'patient',
                    countryMode: 'CH',
                    cantonCode: '3',
                    'insuranceStatus': [
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
                            "address1": "Laurstrasse 10",
                            "address2": "",
                            "zipcode": "6002",
                            "city": "Winterthur",
                            "phone": "+41 800 809 809",
                            "insuranceLink": "www.axa.ch",
                            "email": "",
                            "insuranceGLN": "7601003898064",
                            "recipientGLN": "7601003898064",
                            "department": "",
                            "isTiersGarant": false,
                            "isTiersPayant": true,
                            "insuranceId": "7601003898064",
                            "insuranceName": "AXA Health (KVG / LAMal)",
                            "insurancePrintName": "AXA Health",
                            "type": "PRIVATE_CH",
                            "locationId": mainLocationId,
                            "changebillingtypedesc": true,
                            "mediport": true
                        }
                    ]
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'casefolder',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                    type: 'PRIVATE_CH',
                    patientId: patientId,
                    _id: caseFolderId,
                    countryMode: 'CH'
                } ) )
            } );
            await Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'activity',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getActivityData( {
                    patientId: patientId,
                    employeeId: employeeId,
                    locationId: mainLocationId,
                    caseFolderId: caseFolderId,
                    actType: "PKVSCHEIN",
                    attachments: [],
                    backupEmployeeIds: [],
                    mediaImportError: "",
                    partnerInfo: "",
                    explanations: "",
                    status: "VALID",
                    activities: [],
                    referencedBy: [],
                    formId: "",
                    formVersion: "",
                    formPdf: "",
                    formLang: "de-ch",
                    formGender: "m",
                    apkState: "IN_PROGRESS",
                    unlinkedMirrorIds: [],
                    forInsuranceType: "",
                    locationFeatures: "",
                    scheinRemittor: "",
                    scheinEstablishment: "",
                    scheinSpecialisation: "",
                    scheinOrder: "",
                    scheinDiagnosis: "",
                    reasonType: "DISEASE",
                    scheinFinding: "",
                    scheinNotes: "",
                    scheinClinicalTreatmentFrom: null,
                    scheinClinicalTreatmentTo: null,
                    scheinNextTherapist: "",
                    fk4234: false,
                    fk4219: "",
                    continuousIcds: [],
                    createContinuousDiagnosisOnSave: false,
                    caseNumber: "",
                    icds: [],
                    icdsExtra: [],
                    isTiersGarant: false,
                    isTiersPayant: true,
                    docPrinted: true,
                    attachedMedia: [],
                    treatmentType: "AMBULANT",
                    isChiefPhysician: false,
                    fk4235Set: [],
                    invoiceData: []
                } ) )
            } );
        } );
        after( async function() {
            await cleanDb( {
                user: user
            } );

            Y.config.doccirrus.Env.countryMode = oldCountryMode || ['D'];
        } );

        describe( 'Test medication plan creation', function() {
            before( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            after( async function() {
                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );

            const
                postData = {
                    medications: [
                        med1,
                        Object.assign( {count: 2}, med2 ),
                        med3
                    ],
                    employeeId,
                    locationId: mainLocationId,
                    patientId,
                    caseFolderId,
                    timestamp: moment().toISOString()
                };

            it( 'Makes api call', async function() {
                this.timeout( 15000 );
                await createMedicationPlanForMedicationsP( {
                    user,
                    data: postData,
                    waitCallback: true
                } );
            } );

            it( 'Check activities order', async function() {
                const results = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId,
                        patientId,
                        actType: {$ne: 'SCHEIN'}
                    },
                    options: {
                        sort: {timestamp: 1},
                        select: {
                            code: 1,
                            status: 1,
                            actType: 1,
                            timestamp: 1,
                            activities: 1
                        }
                    }
                } );
                let
                    _med1, _med2, _med2_2, _med3;
                results.should.be.an( 'array' ).which.has.lengthOf( 5 );
                _med3 = results[0];
                _med3.actType.should.equal( 'MEDICATION' );
                _med3.code.should.equal( med3.code );
                _med3.status.should.equal( 'VALID' );

                _med2_2 = results[1];
                _med2_2.actType.should.equal( 'MEDICATION' );
                _med2_2.code.should.equal( med2.code );
                _med2_2.status.should.equal( 'VALID' );

                _med2 = results[2];
                _med2.code.should.equal( med2.code );
                _med2.status.should.equal( 'VALID' );

                _med1 = results[3];
                _med1.actType.should.equal( 'MEDICATION' );
                _med1.code.should.equal( med1.code );
                _med1.status.should.equal( 'VALID' );
                results[4].actType.should.equal( 'MEDICATIONPLAN' );
                results[4].activities.should.deep.equal( [_med1._id.toString(), _med2._id.toString(), _med3._id.toString(), _med3._id.toString()] );
            } );
            it( 'count files in case folder', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                result.should.be.equal( 5 );
            } );
        } );
        describe( 'Test socket events on createMedicationPlanForMedications (waitCallback: false)', function() {
            const
                postData = {
                    medications: [
                        med1,
                        med2,
                        med3
                    ],
                    employeeId,
                    locationId: mainLocationId,
                    patientId,
                    caseFolderId,
                    timestamp: moment().toISOString()
                },
                emitEventForUserData = [];

            before( async function() {
                Y.doccirrus.communication.event.on( 'onEmitEventForUser', ( params ) => {
                    emitEventForUserData.push( params );
                } );

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            after( async function() {
                Y.doccirrus.communication.event.removeAllListeners( 'onEmitEventForUser' );

                await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'delete',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
            } );
            it( 'Makes api call', async function() {
                this.timeout( 15000 );
                await new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.activity.createMedicationPlanForMedications( {
                        user,
                        data: postData,
                        callback() {
                        },
                        _callback( err ) {
                            if( err ) {
                                return reject( err );
                            }
                            resolve();
                        }
                    } );
                } );
            } );
            it( 'Checks socket events', function() {
                emitEventForUserData.should.deep.include( {
                    targetId: '000',
                    event: 'system.UPDATE_ACTIVITIES_TABLES',
                    msg: {data: caseFolderId}
                } );
            } );
            it( 'Check activities order', async function() {
                const results = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'get',
                    query: {
                        caseFolderId,
                        patientId,
                        actType: {$ne: 'SCHEIN'}
                    },
                    options: {
                        sort: {timestamp: 1},
                        select: {
                            code: 1,
                            status: 1,
                            actType: 1,
                            timestamp: 1,
                            activities: 1
                        }
                    }
                } );
                results.should.be.an( 'array' ).which.has.lengthOf( 4 );
                results[0].actType.should.equal( 'MEDICATION' );
                results[0].code.should.equal( med3.code );
                results[0].status.should.equal( 'VALID' );
                results[1].actType.should.equal( 'MEDICATION' );
                results[1].code.should.equal( med2.code );
                results[1].status.should.equal( 'VALID' );
                results[2].actType.should.equal( 'MEDICATION' );
                results[2].code.should.equal( med1.code );
                results[2].status.should.equal( 'VALID' );
                results[3].actType.should.equal( 'MEDICATIONPLAN' );
                results[3].activities.should.deep.equal( [results[2]._id.toString(), results[1]._id.toString(), results[0]._id.toString()] );
            } );
            it( 'count files in case folder', async function() {
                const result = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    action: 'count',
                    query: {
                        actType: {$ne: 'SCHEIN'}
                    }
                } );
                result.should.be.equal( 4 );
            } );
        } );
    } );

    after( async function() {
        await cleanDb( {
            user: user
        } );

        Y.doccirrus.auth.isMocha = Y.doccirrus.auth._isMocha;
        Y.doccirrus.printer = originPrinter;
    } );
} );