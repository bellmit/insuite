/*global Y, it, should, describe, before, after, context */
const
    dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, //the date format of JSON
    util = require( 'util' ),
    fs = require( 'fs' ),
    moment = require( 'moment' ),
    path = require( 'path' ),
    mongoose = require( 'mongoose' ),
    {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    ldtFilesPath = `${__dirname}/../fixtures/lab-api/ldt/`,
    hl7FilesPath = `${__dirname}/../fixtures/lab-api/hl7/`,
    jsonFilesPath = `${__dirname}/../fixtures/lab-api/json/`,
    user = Y.doccirrus.auth.getSUForLocal(),
    mockedTestData = JSON.parse( fs.readFileSync( `${jsonFilesPath}mockedTestData.json`, 'utf8' ) ),
    [patientId1, patientId2, patientId3, caseFolderId1, caseFolderId2, caseFolderId3, employeeId1, employeeId2, locationId1, locationId2, locationId3, labLogId1] = mochaUtils.getObjectIds(),
    readFile = util.promisify( fs.readFile ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    locationPostP = promisifyArgsCallback( Y.doccirrus.api.location.post ),
    employeePostP = promisifyArgsCallback( Y.doccirrus.api.employee.post ),
    patientPostP = promisifyArgsCallback( Y.doccirrus.api.patient.post ),
    casefolderPostP = promisifyArgsCallback( Y.doccirrus.api.casefolder.post ),
    activityPostP = promisifyArgsCallback( Y.doccirrus.api.activity.post ),
    hl7Files = [
        'hl7Example'
    ],
    files = [
        'ldt_20_old',
        'ldt_20',
        'ldt_307',
        'ldt_312',
        'ldt_312_pdf', //SLOW
        'ldt_313',
        'ldt_321',
        'ldt_323',
        'ldt_324',
        'ldt_324_corona',
        'ldt_325',
        'ldt_326',
        'ldt_328',
        'ldt_329'
    ],
    cleanCollections = async () => {
        await cleanDb( {
            user,
            collections2clean: ['activity', 'casefolder', 'patient', 'location', 'employee', 'catalog']
        } );
    };

//convert date from string to object
function reviver( key, value ) {
    if( typeof value === 'string' && dateFormat.test( value ) ) {
        return moment( value ).toDate();
    }

    return value;
}

function postEntry( model, entry ) {
    return Y.doccirrus.mongodb.runDb( {
        user: user,
        model: model,
        action: 'post',
        data: Y.doccirrus.filters.cleanDbObject( entry )
    } );
}

async function sanitizeLDTFile( pathToFile ) {
    let stringData;
    const pathToLoadLdtFile = path.resolve( pathToFile );

    let [err, data] = await formatPromiseResult(
        readFile( pathToLoadLdtFile )
    );
    if( err ) {
        throw err;
    }

    //Sanitize LF/CR to CRLF for the xDT parser
    stringData = data && data.toString();
    const indexOfCRLF = stringData && stringData.indexOf( '\r\n', 1 );
    if( indexOfCRLF === -1 ) {
        if( stringData.indexOf( '\r' ) === -1 ) {
            //LF
            stringData = stringData.replace( /\n/gm, "\r\n" );
        } else {
            //CR
            stringData = stringData.replace( /\r/gm, "\r\n" );
        }
        data = new Buffer( stringData );
    }
    return data;
}

//package
describe( 'lab-api', function mainDescribe() {
    let err;

    context( 'given German System with 2 locations', function contextGerman() {
        before( async function beforeAllGermanTests() {
            //locations
            await locationPostP( {
                user: user,
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: locationId1,
                    commercialNo: '100714102'
                } ) )
            } );
            await locationPostP( {
                user: user,
                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLocationData( {
                    _id: locationId2,
                    commercialNo: '100714103'
                } ) )
            } );
        } );

        after( async function afterAllGermanTests() {
            await cleanDb( {
                user: user,
                collections2clean: [
                    'activity',
                    'casefolder',
                    'patient',
                    'employee',
                    'location',
                    'lablog'
                ]
            } );
        } );

        context( 'given LDT file', function contextLDTFile() {
            before( async function beforePublicFunctions() {
                this.config = {
                    checkFileWithLdkPm: false,
                    checkFilesWithLdkPm: undefined,
                    softValidation: true,
                    billingFlag: true,
                    ldtBillingFlag: 'on',
                    allowGkvBilling: false,
                    ldtAllowGkvBilling: 'off',
                    useAddInfoForId: false,
                    useAddInfoForIdFK: 8310
                };
                this.fileName = 'ldtTestFile';
                this.pathToLoadLdtFile = path.resolve( `${ldtFilesPath}${this.fileName}.ldt` );

                await employeePostP( {
                    user: user,
                    data: {
                        employee: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getEmployeeData( {
                                _id: employeeId1,
                                locations: [
                                    {
                                        _id: locationId1,
                                        locname: 'Test'
                                    }
                                ]
                            } )
                        ),
                        identity: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getIdentityData( {
                                _id: undefined,
                                username: 'completelyNewUsername',
                                specifiedBy: employeeId1
                            } )
                        )
                    }
                } );

                //patient
                await patientPostP( {
                    user: user,
                    data: Y.doccirrus.filters.cleanDbObject( {
                        ...mockedTestData.patients[0],
                        _id: patientId1,
                        activeCaseFolderId: caseFolderId2,
                        "insuranceStatus[0].locationId": locationId1
                    } )
                } );
                //casefolder
                await casefolderPostP( {
                    user: user,
                    data: Y.doccirrus.filters.cleanDbObject( {
                        ...mockedTestData.casefolders[0],
                        _id: caseFolderId1,
                        patientId: patientId1.toString()
                    } )
                } );
                //activities
                await activityPostP( {
                    user: user,
                    data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getScheinData( {
                        timestamp: moment( '01.03.2020', 'DD.MM.YYYY' ).toISOString(),
                        caseFolderId: caseFolderId1.toString(),
                        patientId: patientId1.toString(),
                        employeeId: employeeId1.toString(),
                        locationId: locationId1,
                        actType: 'PKVSCHEIN'
                    } ) )
                } );
            } );

            after( async function afterPublicFunctions() {
                await cleanDb( {
                    user: user,
                    collections2clean: [
                        'employee',
                        'activity',
                        'casefolder',
                        'patient'
                    ]
                } );
            } );

            let
                testLDTData,
                metaData,
                initialLabLogData,
                labLogs,
                matchMethod,
                detailsForLDTMatching,
                initialActivityData,
                textToCompare,
                verifiedActivityData;

            //when
            describe( '.parseLDTFile()', function parseLDTFile() {
                it( `returns parsed data`, async function returnParsedData() {
                    let data = await sanitizeLDTFile( this.pathToLoadLdtFile );
                    should.exist( data );

                    testLDTData = await Y.doccirrus.api.lab.parseLDTFile( {
                        cfg: this.config,
                        data: data,
                        ldtFile: {
                            originalname: this.fileName
                        },
                        user: user
                    } );

                    should.exist( testLDTData );
                } );
            } );

            describe( '.getMetaData()', function getMetaData() {
                it( `returns metadata`, async function returnMetaData() {
                    metaData = await Y.doccirrus.api.lab.getMetaData( {
                        ldtJson: testLDTData.ldtJson
                    } );
                    should.exist( metaData );

                    const compareObj = `{"labName":"Werner Martell","dateOfCreation":"2019-04-29T22:00:00.000Z","typeOfLab":"internal"}`;

                    metaData.should.deep.equal( JSON.parse( compareObj, reviver ) );
                } );
            } );

            describe( '.getInitialLabLogDataFromLDT()', function getInitialLabLogDataFromLDT() {
                it( `returns initialLabLogData`, async function returnInitialLabLogData() {
                    initialLabLogData = await Y.doccirrus.api.lab.getInitialLabLogDataFromLDT( {
                        cfg: this.config,
                        dateOfCreation: metaData.dateOfCreation,
                        labName: metaData.labName,
                        ldtFile: {
                            originalname: 'a',
                            fileHash: 'a'
                        },
                        ldtJson: testLDTData.ldtJson,
                        pmResults: testLDTData.pmResults,
                        savedLDTFile: {
                            fileDatabaseId: {
                                _id: '1'
                            }
                        },
                        user: user
                    } );
                    should.exist( initialLabLogData );
                    initialLabLogData.should.be.an( 'array' );
                    initialLabLogData.should.have.length.of.at.least( 1 );

                    const
                        testObj = `{"timestamp":${JSON.stringify( initialLabLogData[0].timestamp )},"created":"2019-04-29T22:00:00.000Z","source":"Werner Martell","status":"PROCESSING","description":"","type":"LG-Bericht ([E] Endbefund)","user":{"name":"SU-1213141513Mocha"},"fileName":"a","fileHash":"a","fileDatabaseId":"1","configuration":{"pre":{"billingFlag":true,"gkvBillingFlag":false,"disallowGkvBilling":false,"checkFileWithLdkPm":false,"useCustomAssignment":false,"customAssignmentField":8310},"assignment":{"assignmentField":"","assignmentValue":""}},"linkedActivities":[],"assignedPatient":{"patientId":"","patientName":"","patientFirstname":""},"patientLabLogId":"","l_data":{"versionUsed":{"type":"ldt","name":"ldt20"},"records":[{"recordType":"8220","ldtVersion":"LDT1001.02","bsnr":185615900,"bsnrDesc":"Werner Martell","docLANR":[{"head":365754567,"docName":"Werner Martell"}],"bsnrStreet":"Ernst-von-Bayern Str. 6","bsnrZip":"59590","bsnrCity":"Geseke","kbvValidationNo":"Z/38/0801/36/817","encoding":"Code page 437","customerNo":"1821","dateOfCreation":"2019-04-29T22:00:00.000Z"},{"recordType":"8202","labReqNo":"RL_9183_0448","labReqReceived":"2019-04-29T22:00:00.000Z","reportDate":"2019-04-29T22:00:00.000Z","patientName":"Kramp","patientForename":"MaximilianPKV","patientDob":"1996-01-18T23:00:00.000Z","findingKind":"E","billingType":"P","labClient":"365754567","feeSchedule":3,"patientGender":1,"testId":[{"head":"KBBX","testLabel":"KLEINES BLUTBILD","gnr":[{"head":"3550","cost":350,"BillingDoneBy":2}]},{"head":"LEUKO","testLabel":"LEUKOZYTEN","testResultVal":9.93,"TestResultUnit":"tsd./∩┐╜l","sampleNormalValueText":["4.23 - 9.07"],"testResultLimitIndicator":"+"},{"head":"ERY","testLabel":"ERYTHROZYTEN","testResultVal":4.55,"TestResultUnit":"T/l","sampleNormalValueText":["4.63 - 6.08"],"testResultLimitIndicator":"-"},{"head":"HB","testLabel":"HAEMOGLOBIN","testResultVal":15.5,"TestResultUnit":"g/dl","sampleNormalValueText":["13.7 - 17.5"]},{"head":"HK","testLabel":"HAEMATOKRIT","testResultVal":42.4,"TestResultUnit":"%","sampleNormalValueText":["40.1 - 51"]},{"head":"MCH","testLabel":"MCH","testResultVal":34.1,"TestResultUnit":"pg/Ery","sampleNormalValueText":["25.7 - 32.2"],"testResultLimitIndicator":"+"},{"head":"MCHC","testLabel":"MCHC","testResultVal":36.6,"TestResultUnit":"g/dl","sampleNormalValueText":["32.3 - 36.5"],"testResultLimitIndicator":"+"},{"head":"MCV","testLabel":"MCV","testResultVal":93.2,"TestResultUnit":"fl","sampleNormalValueText":["79 - 92.2"],"testResultLimitIndicator":"+"},{"head":"THR","testLabel":"THROMBOZYTEN","testResultVal":245,"TestResultUnit":"tsd./∩┐╜l","sampleNormalValueText":["163 - 337"]},{"head":"CA","testLabel":"CALCIUM","gnr":[{"head":"3555","cost":233,"BillingDoneBy":2}],"testResultVal":2.5,"TestResultUnit":"mmol/l","sampleNormalValueText":["2.08 - 2.65"]},{"head":"FE","testLabel":"EISEN","gnr":[{"head":"3620","cost":233,"BillingDoneBy":2}],"testResultVal":170,"TestResultUnit":"∩┐╜g/dl","sampleNormalValueText":["65 - 175"]},{"head":"K","testLabel":"KALIUM","gnr":[{"head":"3557","cost":175,"BillingDoneBy":2}],"testResultVal":3.2,"TestResultUnit":"mmol/l","sampleNormalValueText":["3.5 - 5.5"],"testResultLimitIndicator":"-"},{"head":"NA","testLabel":"NATRIUM","gnr":[{"head":"3558","cost":175,"BillingDoneBy":2}],"testResultVal":138,"TestResultUnit":"mmol/l","sampleNormalValueText":["132 - 146"]},{"head":"BILISY","testLabel":"BILIRUBIN GESAMT","gnr":[{"head":"3581H1","cost":233,"BillingDoneBy":2}],"testResultVal":0.78,"TestResultUnit":"mg/dl","sampleNormalValueText":["0.3 - 1.2"]},{"head":"KREA","testLabel":"CREATININ","gnr":[{"head":"3585H1","cost":233,"BillingDoneBy":2}],"testResultVal":0.79,"TestResultUnit":"mg/dl","sampleNormalValueText":["0.7 - 1.3"]},{"head":"GFR2","testLabel":"GLOM FILT RATE CKD","testResultVal":104,"TestResultUnit":"ml/min/1,73 m2KOF","sampleTestNotes":["Kein Hinweis auf eine eingeschr∩┐╜nkte Filtrationsleistung","der Nieren. Zum Ausschluss einer Nierensch∩┐╜digung wird bei","Risikopatienten zus∩┐╜tzlich eine Untersuchung auf Albumin im","Urin empfohlen. (Hinweis: Die verwendete eGFR-Formel ist","ungeeignet u.a. f∩┐╜r Nicht-Kaukasier, bei extrem","geringer/gro∩┐╜er Muskelmasse und nach Nierentransplantation.","F∩┐╜r Schwarz-Amerikaner wurde ein zus∩┐╜tzlicher","Multiplikationsfaktor von 1,159 ermittelt.)"],"sampleNormalValueText":["90"]},{"head":"HST","testLabel":"HARNSTOFF","gnr":[{"head":"3584H1","cost":233,"BillingDoneBy":2}],"testResultVal":27,"TestResultUnit":"mg/dl","sampleNormalValueText":["19 - 49"]},{"head":"GLUCS","testLabel":"GLUCOSE","gnr":[{"head":"3560","cost":233,"BillingDoneBy":2}],"testResultVal":89,"TestResultUnit":"mg/dl","sampleTestNotes":["In Vollblutproben kommt es wegen des fortgesetzten","Zellstoffwechsels zu einem kontinuierlichen Abbau der","Glucose, dies ist insbesondere bei der Diagnose des","Diabetes mellitus zu beachten. F∩┐╜r die Bestimmung der","Glucose sollten NaF-oder Serum-R∩┐╜hrchen mit Trenngel","verwendet werden.","Verf∩┐╜lschung durch Glykolyse nicht sicher auszuschlie∩┐╜en."],"sampleNormalValueText":["< 100","abnorme N∩┐╜chternglucose: 100 - 125","Diabetes mellitus: > 125","In der Schwangerschaft: < 92","abnorme N∩┐╜chternglucose: 92 - 125","Diabetes mellitus: >125"]},{"head":"HBAKAP","testLabel":"HBA1C","gnr":[{"head":"3561","cost":1166,"BillingDoneBy":2}],"testResultVal":6.2,"TestResultUnit":"%","sampleNormalValueText":["4.27 - 6.07"],"testResultLimitIndicator":"+"},{"head":"HBA1CA","testLabel":"HBA1C ALTERNATIV","testResultVal":44,"TestResultUnit":"mmol/mol Hb","sampleNormalValueText":["23 - 43","Auf Empfehlung der Deutschen Diabetes Gesellschaft und der","Deutschen Vereinten Gesellschaft f∩┐╜r Klinische Chemie und","Laboratoriumsmedizin (Deutsches ∩┐╜rzteblatt, Heft 33, 2009)","geben wir zu den bisher ∩┐╜blichen Einheiten (%) den","HBA1c-Wert standardisiert nach der IFCC-Methode in","mmol/molHb an."],"testResultLimitIndicator":"+"},{"head":"HS","testLabel":"HARNSAEURE","gnr":[{"head":"3583H1","cost":233,"BillingDoneBy":2}],"testResultVal":6.5,"TestResultUnit":"mg/dl","sampleNormalValueText":["3.7 - 9.2"]},{"head":"APSY","testLabel":"ALKAL PHOSPHATASE","gnr":[{"head":"3587H1","cost":233,"BillingDoneBy":2}],"testResultVal":57,"TestResultUnit":"U/l","sampleNormalValueText":["46 - 116"]},{"head":"GOT","testLabel":"GOT","gnr":[{"head":"3594H1","cost":233,"BillingDoneBy":2}],"testResultVal":39,"TestResultUnit":"U/l","sampleNormalValueText":["13 - 40"]},{"head":"GPT","testLabel":"GPT","gnr":[{"head":"3595H1","cost":233,"BillingDoneBy":2}],"testResultVal":81,"TestResultUnit":"U/l","sampleNormalValueText":["7 - 40"],"testResultLimitIndicator":"+"},{"head":"GGT","testLabel":"GGT","gnr":[{"head":"3592H1","cost":233,"BillingDoneBy":2}],"testResultVal":69,"TestResultUnit":"U/l","sampleNormalValueText":["< 73"]},{"head":"CHOL","testLabel":"CHOLESTERIN","gnr":[{"head":"3562H1","cost":233,"BillingDoneBy":2}],"testResultVal":201,"TestResultUnit":"mg/dl","sampleNormalValueText":["< 200","Niedrig (w∩┐╜nschenswert) < 200","M∩┐╜∩┐╜ig (grenzwertig) 200 - 239","Hoch  240"],"testResultLimitIndicator":"+"},{"head":"TRIG","testLabel":"TRIGLYCERIDE","gnr":[{"head":"3565H1","cost":233,"BillingDoneBy":2}],"testResultVal":105,"TestResultUnit":"mg/dl","sampleNormalValueText":["< 150"]},{"head":"HDL","testLabel":"HDL CHOLESTERIN","gnr":[{"head":"3563H1","cost":233,"BillingDoneBy":2}],"testResultVal":36,"TestResultUnit":"mg/dl","sampleNormalValueText":["40 - 60"],"testResultLimitIndicator":"-"},{"head":"LDL","testLabel":"LDL CHOLESTERIN","gnr":[{"head":"3564H1","cost":233,"BillingDoneBy":2}],"testResultVal":144,"TestResultUnit":"mg/dl","sampleNormalValueText":["Optimal < 100","Beinahe optimal/h∩┐╜her als optimal 100 - 129","Grenzwertig hoch 130 - 159","Hoch 160 - 189"],"testResultLimitIndicator":"+"},{"head":"LHQ","testLabel":"LDL HDL QUOTIENT","testResultVal":4,"TestResultUnit":"kA","sampleNormalValueText":["<3.0","Herz-Kreislauf oder Schlaganfall-Risiko:","Zielbereich: < 3.0","steigendes Risiko: 3.0 - 5.0","erh∩┐╜htes Risiko: > 5.0"],"testResultLimitIndicator":"+"},{"head":"GE","testLabel":"GESAMT EIWEISS","gnr":[{"head":"3573H1","cost":175,"BillingDoneBy":2}],"testResultVal":6.26,"TestResultUnit":"g/dl","sampleNormalValueText":["5.7 - 8.2"]},{"head":"TSH","testLabel":"TSH BASAL","testResultVal":0.42,"TestResultUnit":"mU/l","sampleNormalValueText":["0.55 - 4.78"],"testResultLimitIndicator":"-"}]},{"recordType":"8221","sizeTotal":59307}]},"flow":"","flags":[],"errs":[],"pmResults":null}`,
                        revivedObj = JSON.parse( testObj, reviver );

                    initialLabLogData[0].assignedPatient.should.deep.equal( revivedObj.assignedPatient );
                } );
            } );

            describe( '.writeInitialLabLogs()', function writeInitialLabLogs() {
                it( `posts initialLabLogs`, async function returnInitialLabLogs() {
                    labLogs = await Y.doccirrus.api.lab.writeInitialLabLogs( {
                        dataToInsert: initialLabLogData,
                        pmResults: testLDTData.pmResults,
                        user: user
                    } );

                    should.exist( labLogs );
                    labLogs.should.be.an( 'array' );
                    labLogs.should.have.length.of.at.least( 1 );
                    should.exist( labLogs[0]._id );
                } );
            } );

            describe( '.findMatchMethod()', function findMatchMethod() {
                it( `returns matchMethod`, async function returnMatchMethod() {
                    matchMethod = await Y.doccirrus.api.lab.findMatchMethod( {
                        cfg: this.config,
                        ldtJson: labLogs[0].l_data
                    } );
                    should.exist( matchMethod );
                    matchMethod.timestamp.should.not.be.eql( '' );
                    matchMethod.assignmentField.should.be.eql( '8311' );
                    matchMethod.assignmentValue.should.be.eql( 'RL_9183_0448' );
                    matchMethod.patientName.should.be.eql( 'Kramp' );
                    matchMethod.patientFirstname.should.be.eql( 'MaximilianPKV' );
                    matchMethod.patientDob.should.not.be.eql( '' );
                    should.not.exist( matchMethod.patientInsuranceId );
                    should.not.exist( matchMethod.patientInsuranceNo );
                    should.not.exist( matchMethod.locationIdFromLDT );
                    should.not.exist( matchMethod.recordRequestId );
                    matchMethod.labReqId.should.be.eql( 'RL_9183_0448' );
                } );
            } );

            describe( '.getDetailsForLDTMatching()', function getDetailsForLDTMatching() {
                it( `returns detailsForLDTMatching`, async function returnDetailsForLDTMatching() {
                    detailsForLDTMatching = await Y.doccirrus.api.lab.getDetailsForLDTMatching( {
                        assignmentField: matchMethod.assignmentField,
                        assignmentValue: matchMethod.assignmentValue,
                        cfg: this.config,
                        ldtJson: labLogs[0].l_data,
                        locationIdFromLDT: matchMethod.locationIdFromLDT,
                        patientDob: matchMethod.patientDob,
                        patientFirstname: matchMethod.patientFirstname,
                        patientInsuranceId: matchMethod.patientInsuranceId,
                        patientInsuranceNo: matchMethod.patientInsuranceNo,
                        patientName: matchMethod.patientName,
                        user: user
                    } );

                    should.exist( detailsForLDTMatching );
                    should.exist( detailsForLDTMatching.patient );
                    should.exist( detailsForLDTMatching.patient._id );
                    should.exist( detailsForLDTMatching.caseFolderId );
                    should.exist( detailsForLDTMatching.locationId );
                    should.exist( detailsForLDTMatching.employeeId );
                    detailsForLDTMatching.caseFolderId.should.be.eql( caseFolderId1.toString() );
                    detailsForLDTMatching.locationId.should.be.eql( '' );
                    detailsForLDTMatching.employeeId.should.be.eql( mockedTestData.patients[0].employees[0] );
                    labLogs[0].assignedPatient.patientId = detailsForLDTMatching.patient && detailsForLDTMatching.patient._id.toString();
                } );
            } );

            describe( '.getInitialActivityData()', function getInitialActivityData() {
                it( `returns initialActivityData`, async function returnInitialActivityData() {
                    const record = labLogs[0].l_data.records[labLogs[0].l_data.records.length > 3 ? 2 : 1];

                    textToCompare = Y.doccirrus.api.xdtTools.prettyText(
                        {
                            records: [record],
                            versionUsed: labLogs[0].l_data.versionUsed
                        },
                        false,
                        false,
                        false
                    );

                    initialActivityData = await Y.doccirrus.api.lab.getInitialActivityData( {
                        caseFolderId: detailsForLDTMatching.caseFolderId,
                        dbData: labLogs[0],
                        employeeId: detailsForLDTMatching.employeeId,
                        labName: metaData.labName,
                        ldtJson: labLogs[0].l_data,
                        locationId: detailsForLDTMatching.locationId,
                        textToCompare: textToCompare,
                        timestamp: matchMethod.timestamp
                    } );

                    should.exist( initialActivityData );
                    should.exist( initialActivityData.l_extra );
                    should.exist( initialActivityData.l_version );
                    initialActivityData.patientId.should.be.eql( patientId1.toString() );
                    initialActivityData.locationId.should.be.eql( '' );
                    initialActivityData.employeeId.should.be.eql( mockedTestData.patients[0].employees[0] );
                    initialActivityData.caseFolderId.should.be.eql( caseFolderId1.toString() );
                    initialActivityData.status.should.be.eql( 'VALID' );
                    initialActivityData.apkState.should.be.eql( 'IN_PROGRESS' );
                    initialActivityData.actType.should.be.eql( 'LABDATA' );
                } );
            } );

            describe( '.getVerifiedActivityData()', function getVerifiedActivityData() {
                it( `returns verifiedActivityData`, async function returnVerifiedActivityData() {
                    verifiedActivityData = await Y.doccirrus.api.lab.getVerifiedActivityData( {
                        activityData: initialActivityData,
                        user: user
                    } );

                    should.exist( verifiedActivityData );
                    should.exist( verifiedActivityData.activityData );
                    should.exist( verifiedActivityData.activityData.l_extra );
                    should.not.exist( verifiedActivityData.prev_id );
                    verifiedActivityData.activityData.patientId.should.be.eql( patientId1.toString() );
                    verifiedActivityData.activityData.employeeId.should.be.eql( mockedTestData.patients[0].employees[0] );
                    verifiedActivityData.activityData.locationId.toString().should.be.eql( locationId1.toString() );
                    verifiedActivityData.mergingIsRequired.should.be.eql( false );
                } );
            } );

            context( 'LDT Parser', function contextLDTParser() {
                for( const file of files ) {
                    const
                        pathToLoadLdtFile = path.resolve( `${ldtFilesPath}${file}.ldt` ),
                        pathToLoadValidJSON = path.resolve( `${jsonFilesPath}${file}.json` );

                    it( `${file} should return valid parsed LDTJSON`, async function itLDTJSON() {
                        this.timeout( 60000 );

                        let data = await sanitizeLDTFile( pathToLoadLdtFile );
                        should.exist( data );

                        let validData = await readFile( pathToLoadValidJSON );
                        should.exist( validData );

                        let parsedLDTFile = await Y.doccirrus.api.lab.parseLDTFile( {
                            cfg: {
                                checkFileWithLdkPm: false,
                                checkFilesWithLdkPm: undefined,
                                softValidation: true
                            },
                            data: data,
                            ldtFile: {
                                originalname: file
                            },
                            user: user
                        } );
                        should.exist( parsedLDTFile );

                        //check output
                        // console.log( file );
                        // console.log( JSON.stringify( parsedLDTFile.ldtJson ) );

                        return parsedLDTFile.ldtJson.should.deep.equal( JSON.parse( validData, reviver ) );
                    } );
                }
            } );
            context( 'given LDT file with FK8310 set', function contextFK8310() {
                let submitLDT;

                before( async function beforeFK8310() {
                    //patient
                    await patientPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getPatientData( {
                                    ...mockedTestData.patients[1],
                                    _id: patientId2,
                                    activeCaseFolderId: caseFolderId2,
                                    "insuranceStatus[0].locationId": locationId1
                                }
                            )
                        )
                    } );
                    await patientPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getPatientData( {
                                ...mockedTestData.patients[2],
                                _id: patientId3,
                                activeCaseFolderId: caseFolderId3,
                                "insuranceStatus[0].locationId": locationId1
                            } )
                        )
                    } );
                    //casefolder
                    await casefolderPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                            patientId: patientId2.toString(),
                            _id: caseFolderId2,
                            type: 'PRIVATE'
                        } ) )
                    } );
                    await casefolderPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                            patientId: patientId3.toString(),
                            _id: caseFolderId3,
                            type: 'PRIVATE'
                        } ) )
                    } );
                    //activities
                    await activityPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getScheinData( {
                            timestamp: moment( '01.03.2020', 'DD.MM.YYYY' ).toISOString(),
                            caseFolderId: caseFolderId2.toString(),
                            patientId: patientId2.toString(),
                            employeeId: employeeId2.toString(),
                            locationId: locationId2,
                            actType: 'PKVSCHEIN'
                        } ) )
                    } );
                    await activityPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getScheinData( {
                            timestamp: moment( '01.03.2020', 'DD.MM.YYYY' ).toISOString(),
                            caseFolderId: caseFolderId3.toString(),
                            patientId: patientId3.toString(),
                            employeeId: employeeId2.toString(),
                            locationId: locationId1,
                            actType: 'PKVSCHEIN'
                        } ) )
                    } );
                    await activityPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLabRequestData( {
                            timestamp: moment( '02.03.2020', 'DD.MM.YYYY' ).toISOString(),
                            patientId: patientId2.toString(),
                            employeeId: employeeId2.toString(),
                            locationId: locationId2,
                            caseFolderId: caseFolderId2.toString(),
                            labRequestId: '999111'
                        } ) )
                    } );
                } );

                after( async function afterFK8310() {
                    await cleanDb( {
                        user: user,
                        collections2clean: [
                            'activity',
                            'casefolder',
                            'patient',
                            'lablog'
                        ]
                    } );
                } );

                it( '.submitLDT()', async function submitLDTFK8310() {
                    this.timeout( 10000 );
                    const pathToLoadLdtFile = path.resolve( `${ldtFilesPath}labRequestIdTestFile.ldt` );

                    let data = await sanitizeLDTFile( pathToLoadLdtFile );
                    should.exist( data );

                    submitLDT = await Y.doccirrus.api.lab.submitLDT( {
                        data: {
                            useDataFromLabrequestIfPresent: true,
                            billingFlag: true,
                            ignoreHashExists: true
                        },
                        ldtFile: {
                            path: `${ldtFilesPath}labRequestIdTestFile.ldt`,
                            originalname: 'labRequestIdTestFile.ldt',
                            data: data
                        },
                        user: user
                    } );
                    should.exist( submitLDT );
                    submitLDT[0].linkedActivities.should.be.an( 'Array' );
                    submitLDT[0].linkedActivities.should.have.length( 1 );
                } );
                it( 'Patient should have LABDATA and TREATMENT activities', async function patientShouldHaveActivities() {
                    let result = await Y.doccirrus.mongodb.runDb( {
                        model: 'activity',
                        user,
                        action: 'get',
                        query: {
                            _id: {$in: submitLDT && submitLDT[0].linkedActivities}
                        },
                        options: {
                            lean: true
                        }
                    } );

                    should.exist( result );
                    result.should.be.an( 'Array' );
                    result[0].should.be.an( 'Object' );
                    result[0].patientId.should.equal( patientId2.toString() );
                    result[0].caseFolderId.should.equal( caseFolderId2.toString() );
                    result[0].locationId.toString().should.equal( locationId2.toString() );
                    result[0].employeeId.should.equal( employeeId2.toString() );
                } );
            } );
            context( 'given LDT file with FK8405 set', function contextFK8405() {
                this.timeout(0);
                let submitLDT;

                before( async function beforeFK8405() {
                    await employeePostP( {
                        user: user,
                        data: {
                            employee: Y.doccirrus.filters.cleanDbObject(
                                mochaUtils.getEmployeeData( {
                                    _id: employeeId2,
                                    locations: [
                                        {
                                            _id: locationId1,
                                            locname: 'Test'
                                        }
                                    ]
                                } )
                            ),
                            identity: Y.doccirrus.filters.cleanDbObject(
                                mochaUtils.getIdentityData( {
                                    _id: undefined,
                                    username: `completelyNewUsername${employeeId2.toString()}`,
                                    specifiedBy: employeeId2
                                } )
                            )
                        }
                    } );
                    //patient
                    await patientPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getPatientData( {
                                    ...mockedTestData.patients[1],
                                    _id: patientId2,
                                    activeCaseFolderId: caseFolderId2,
                                    "insuranceStatus[0].locationId": locationId1
                                }
                            )
                        )
                    } );
                    await patientPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getPatientData( {
                                ...mockedTestData.patients[2],
                                _id: patientId3,
                                activeCaseFolderId: caseFolderId3,
                                "insuranceStatus[0].locationId": locationId1
                            } )
                        )
                    } );
                    //casefolder
                    await casefolderPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                            patientId: patientId2.toString(),
                            _id: caseFolderId2,
                            type: 'PRIVATE'
                        } ) )
                    } );
                    await casefolderPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                            patientId: patientId3.toString(),
                            _id: caseFolderId3,
                            type: 'PRIVATE'
                        } ) )
                    } );
                    //activities
                    await activityPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getScheinData( {
                            timestamp: moment( '01.03.2020', 'DD.MM.YYYY' ).toISOString(),
                            caseFolderId: caseFolderId2.toString(),
                            patientId: patientId2.toString(),
                            employeeId: employeeId2.toString(),
                            locationId: locationId2,
                            actType: 'PKVSCHEIN'
                        } ) )
                    } );
                    await activityPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getScheinData( {
                            timestamp: moment( '01.03.2020', 'DD.MM.YYYY' ).toISOString(),
                            caseFolderId: caseFolderId3.toString(),
                            patientId: patientId3.toString(),
                            employeeId: employeeId2.toString(),
                            locationId: locationId1,
                            actType: 'PKVSCHEIN'
                        } ) )
                    } );
                    await activityPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getLabRequestData( {
                            timestamp: moment( '02.03.2020', 'DD.MM.YYYY' ).toISOString(),
                            patientId: patientId2.toString(),
                            employeeId: employeeId2.toString(),
                            locationId: locationId2,
                            caseFolderId: caseFolderId2.toString(),
                            labRequestId: '999111'
                        } ) )
                    } );
                } );

                after( async function afterFK8405() {
                    await cleanDb( {
                        user: user,
                        collections2clean: [
                            'employee',
                            'activity',
                            'casefolder',
                            'patient',
                            'lablog'
                        ]
                    } );
                } );

                it( '.submitLDT()', async function submitLDTFK8405() {
                    this.timeout(0);
                    const pathToLoadLdtFile = path.resolve( `${ldtFilesPath}ldtTestFile2.ldt` );

                    let data = await readFile( pathToLoadLdtFile );
                    should.exist( data );

                    submitLDT = await Y.doccirrus.api.lab.submitLDT( {
                        data: {
                            ldtBillingFlag: "on",
                            ignoreHashExists: true
                        },
                        ldtFile: {
                            path: `${ldtFilesPath}ldtTestFile2.ldt`,
                            originalname: 'ldtTestFile2.ldt',
                            data: data
                        },
                        user: user
                    } );
                    should.exist( submitLDT );
                    submitLDT[0].linkedActivities.should.be.an( 'Array' );
                    submitLDT[0].linkedActivities.should.have.length( 1 );
                } );
                it( 'Patient should have LABREQUEST activity', async function patientShouldHaveLabrequest() {
                    let result = await Y.doccirrus.mongodb.runDb( {
                        model: 'activity',
                        user,
                        action: 'get',
                        query: {
                            _id: submitLDT[0].linkedActivities[0]
                        },
                        options: {
                            lean: true
                        }
                    } );

                    should.exist( result );
                    result.should.be.an( 'Array' );
                    result.should.have.length( 1 );
                    result[0].should.be.an( 'Object' );
                    result[0].patientId.should.equal( patientId3.toString() );
                    result[0].caseFolderId.should.equal( caseFolderId3.toString() );
                } );
            } );
            context( 'given ASV LDT file', function contextASV() {
                const {
                    asv: {
                        location,
                        employee,
                        patient,
                        gkvCaseFolder,
                        asvCaseFolder,
                        gkvSchein,
                        asvSchein
                    }
                } = mockedTestData;

                before( async function beforeASVTest() {
                    this.timeout( 5000 );
                    //locations
                    await locationPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getLocationData( {
                                ...location,
                                _id: locationId3
                            } )
                        )
                    } );
                    //employee
                    await employeePostP( {
                        user: user,
                        data: {
                            employee: Y.doccirrus.filters.cleanDbObject(
                                mochaUtils.getEmployeeData( {
                                    ...employee,
                                    _id: employeeId1
                                } )
                            ),
                            identity: Y.doccirrus.filters.cleanDbObject(
                                mochaUtils.getIdentityData( {
                                    _id: undefined,
                                    username: `completelyNewUsername${employeeId1.toString()}`,
                                    specifiedBy: employeeId1
                                } )
                            )
                        }
                    } );
                    //patient
                    await patientPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getPatientData( {
                                ...patient,
                                _id: patientId2,
                                "insuranceStatus[0].locationId": locationId3
                            } )
                        )
                    } );
                    //2x casefolder (GKV,ASV)
                    await casefolderPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                            ...gkvCaseFolder,
                            _id: caseFolderId2,
                            patientId: patientId2.toString()
                        } ) )
                    } );
                    await casefolderPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                            ...asvCaseFolder,
                            _id: caseFolderId3,
                            patientId: patientId2.toString()
                        } ) )
                    } );
                    //2x schein (older:GKV, newer:ASV)
                    await activityPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getScheinData( {
                            ...gkvSchein,
                            patientId: patientId2.toString(),
                            caseFolderId: caseFolderId2.toString(),
                            employeeId: employeeId1.toString(),
                            locationId: locationId3
                        } ) )
                    } );
                    await activityPostP( {
                        user: user,
                        data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getScheinData( {
                            ...asvSchein,
                            patientId: patientId2.toString(),
                            caseFolderId: caseFolderId3.toString(),
                            employeeId: employeeId1.toString(),
                            locationId: locationId3
                        } ) )
                    } );
                } );

                after( async function afterASVTest() {
                    await cleanDb( {
                        user: user,
                        collections2clean: [
                            'activity',
                            'casefolder',
                            'patient',
                            // 'employee',
                            'identity',
                            'lablog'
                        ]
                    } );
                } );

                it( '.submitLDT()', async function submitLDT_ASV() {
                    const asvFileName = 'asv.ldt';

                    let data = await sanitizeLDTFile( `${ldtFilesPath}asv.ldt` );
                    should.exist( data );

                    let result = await Y.doccirrus.api.lab.submitLDT( {
                        data: {
                            billingFlag: false,
                            gkvBillingFlag: false,
                            disallowGkvBilling: false,
                            checkFileWithLdkPm: false,
                            useCustomAssignment: false,
                            customAssignmentField: "8310",
                            useDataFromLabrequestIfPresent: false
                        },
                        ldtFile: {
                            path: `${ldtFilesPath}${asvFileName}`,
                            originalname: 'asvFileName',
                            data: data
                        },
                        user: user
                    } );
                    should.exist( result );
                    result = result[0];
                    result.assignedPatient.patientId.should.equal( patientId2.toString() );
                    result.linkedActivities.should.be.an( 'Array' );
                    result.linkedActivities.should.have.length( 1 );
                } );
                it( 'ASV should have LABDATA', async function patientShouldHaveLabdata() {
                    let labDataActivity = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'activity',
                        action: 'get',
                        query: {
                            patientId: patientId2.toString(),
                            caseFolderId: caseFolderId3.toString(),
                            employeeId: employeeId1.toString(),
                            locationId: locationId3,
                            actType: 'LABDATA'
                        },
                        options: {
                            lean: true
                        }
                    } );

                    should.exist( labDataActivity );
                    labDataActivity.should.be.an( 'Array' );
                    labDataActivity.should.have.length( 1 );
                } );
            } );
        } );

        context( 'given HL7 test files', function contextHL7() {
            for( const file of hl7Files ) {
                const
                    pathToLoadHL7File = path.resolve( `${hl7FilesPath}${file}.hl7` ),
                    pathToLoadValidJSON = path.resolve( `${jsonFilesPath}${file}.json` );

                it( `${file} should return LDT data parsed from HL7`, async function returnValidHL7toLDTJSON() {
                    const Iconv = require( 'iconv' ).Iconv;
                    let data = await readFile( pathToLoadHL7File );
                    if( err || !data ) {
                        throw err;
                    }

                    try {
                        let iconv = new Iconv( 'ISO-8859-1', 'UTF-8//IGNORE' );
                        data = iconv.convert( data );
                    } catch( ex ) {
                        should.not.exist( ex );
                    }

                    let HL7JSON = Y.doccirrus.api.hl7.convertHL7toHL7JSON( data.toString( 'utf8' ) );

                    let {ldt} = Y.doccirrus.api.lab.getLDTJSONandTreatmentsFromHL7JSON( {
                        HL7JSON: HL7JSON,
                        config: {}
                    } );

                    if( err || !ldt ) {
                        throw err;
                    }

                    let validData;
                    validData = await readFile( pathToLoadValidJSON );
                    if( err || !validData ) {
                        throw err;
                    }

                    // console.log( JSON.stringify( ldt ) );

                    return ldt.should.deep.equal( JSON.parse( validData, reviver ) );
                } );
            }
        } );

        context( 'given employee', function() {
            before( async function() {
                await employeePostP( {
                    user: user,
                    data: {
                        employee: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getEmployeeData( {
                                _id: employeeId1,
                                locations: [
                                    {
                                        _id: locationId1,
                                        locname: 'Test'
                                    }
                                ]
                            } )
                        ),
                        identity: Y.doccirrus.filters.cleanDbObject(
                            mochaUtils.getIdentityData( {
                                _id: undefined,
                                username: 'completelyNewUsername',
                                specifiedBy: employeeId1
                            } )
                        )
                    }
                } );
            } );
            after( async function() {
                await cleanDb( {
                    user: user,
                    collections2clean: [
                        'employee',
                        'identity'
                    ]
                } );
            } );

            context( 'given not assigned labLog entry', function() {
                before( async function() {
                    await Y.doccirrus.mongodb.runDb( {
                        model: 'lablog',
                        user: user,
                        action: 'post',
                        data: Y.doccirrus.filters.cleanDbObject( {
                            _id: labLogId1,
                            ...mockedTestData.lablogs[0]
                        } )
                    } );
                } );
                after( async function() {
                    await cleanDb( {
                        user: user,
                        collections2clean: [
                            'lablog'
                        ]
                    } );
                } );

                context( 'given new patient that matches the one required in labLog', function() {
                    before( async function() {
                        await patientPostP( {
                            user: user,
                            data: Y.doccirrus.filters.cleanDbObject(
                                mochaUtils.getPatientData( {
                                    _id: patientId1,
                                    firstname: mockedTestData.lablogs[0].l_data.records[1].patientForename,
                                    lastname: mockedTestData.lablogs[0].l_data.records[1].patientName,
                                    kbvDob: moment( mockedTestData.lablogs[0].l_data.records[1].patientDob ).format( "DD.MM.YYYY" ),
                                    dob: mockedTestData.lablogs[0].l_data.records[1].patientDob
                                } )
                            )
                        } );
                    } );
                    after( async function() {
                        await cleanDb( {
                            user: user,
                            collections2clean: [
                                'patient'
                            ]
                        } );
                    } );
                    context( 'given GKV caseFolder with GKV schein', function() {
                        before( async function() {
                            await casefolderPostP( {
                                user: user,
                                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getCaseFolderData( {
                                    patientId: patientId1.toString(),
                                    _id: caseFolderId1,
                                    type: 'PUBLIC'
                                } ) )
                            } );
                            await activityPostP( {
                                user: user,
                                data: Y.doccirrus.filters.cleanDbObject( mochaUtils.getScheinData( {
                                    timestamp: moment( '14.09.2020', 'DD.MM.YYYY' ).toISOString(),
                                    caseFolderId: caseFolderId1.toString(),
                                    patientId: patientId1.toString(),
                                    employeeId: employeeId1.toString(),
                                    locationId: locationId1,
                                    actType: 'SCHEIN'
                                } ) )
                            } );
                        } );
                        after( async function() {
                            await cleanDb( {
                                user: user,
                                collections2clean: [
                                    'casefolder',
                                    'activity'
                                ]
                            } );
                        } );

                        it( 'should trigger lab process and return properties for frontend', async function() {
                            const result = await Y.doccirrus.api.lab.triggerLabProcess( {
                                user: user
                            } );

                            result.unassignedEntries.should.equal( 1 );
                            result.newlyAssigned.should.equal( 1 );
                        } );

                        it( 'assigned labLog should be linked to patient and only have LABDATA linked to it (no treatments)', async function() {
                            const labLog = await Y.doccirrus.mongodb.runDb( {
                                model: 'lablog',
                                user: user,
                                action: 'get',
                                data: {
                                    _id: labLogId1
                                }
                            } );

                            labLog.should.be.an( 'Array' );
                            labLog.should.have.length( 1 );
                            labLog[0].linkedActivities.should.be.an( 'Array' );
                            labLog[0].linkedActivities.should.have.length( 1 );
                            labLog[0].assignedPatient.patientId.should.be.equal( patientId1.toString() );
                        } );
                    } );
                } );
            } );
        } );
    } );

    context( 'when given a system with Swiss country setting, a patient (with same name as in the HL7file), casefolder, employee and location', function contextCH() {
        before( async function beforeAllSwissTests() {
            this.timeout( 10000 );
            await cleanCollections();
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
            this.countryMode = Y.config.doccirrus.Env.countryMode;
            Y.config.doccirrus.Env.countryMode = ['CH'];

            this.patientId = new mongoose.Types.ObjectId().toString();
            this.caseFolderId = new mongoose.Types.ObjectId().toString();
            this.employeeId = new mongoose.Types.ObjectId().toString();
            this.locationId = new mongoose.Types.ObjectId().toString();
            this.identityId = new mongoose.Types.ObjectId().toString();
            this.firstname = "Patrick";
            this.lastname = "Abelantado";
            this.dob = "1985-09-20T10:00:00.000Z";
            this.kbvDob = "20.09.1985";

            this.locationData = mochaUtils.getLocationData( {
                _id: this.locationId,
                commercialNo: '198212401',
                countryMode: 'CH',
                countryCode: 'CH',
                zip: 1210,
                cantonCode: '3',
                bankIBAN: '01-162-8',
                esrNumber: '010001628',
                zsrNumber: "T277419"
            } );

            this.employeeData = mochaUtils.getEmployeeData( {
                _id: this.employeeId,
                countryMode: 'CH',
                zsrNumber: 'T277489',
                qualiDignities: ['0000', '9999']
            } );

            this.patientData = mochaUtils.getPatientData( {
                _id: this.patientId,
                firstname: this.firstname,
                lastname: this.lastname,
                dob: this.dob,
                kbvDob: this.kbvDob,
                countryMode: 'CH',
                cantonCode: '3',
                activeCaseFolderId: this.caseFolderId
            } );

            this.caseFolderData = mochaUtils.getCaseFolderData( {
                type: 'PRIVATE_CH',
                patientId: this.patientId,
                _id: this.caseFolderId,
                countryMode: 'CH'
            } );

            this.activityData = mochaUtils.getScheinData( {
                timestamp: moment( '06.11.2019', 'DD.MM.YYYY' ).toISOString(),
                caseFolderId: this.caseFolderId,
                patientId: this.patientId,
                employeeId: this.employeeId,
                locationId: this.locationId,
                actType: 'PKVSCHEIN'
            } );

            await postEntry( 'location', Y.doccirrus.filters.cleanDbObject( this.locationData ) );
            await postEntry( 'employee', Y.doccirrus.filters.cleanDbObject( this.employeeData ) );
            await postEntry( 'patient', Y.doccirrus.filters.cleanDbObject( this.patientData ) );
            await postEntry( 'casefolder', Y.doccirrus.filters.cleanDbObject( this.caseFolderData ) );
            await postEntry( 'activity', Y.doccirrus.filters.cleanDbObject( this.activityData ) );
        } );

        after( async function afterTestSubmitHL7() {
            await cleanDb( {
                user: user,
                collections2clean: [
                    'activity',
                    'casefolder',
                    'patient',
                    'employee',
                    'location'
                ]
            } );

            Y.config.doccirrus.Env.countryMode = this.countryMode || ['D'];
        } );

        context( 'and given an HL7-file and createTreatments set to true in configurations', function contextHL7() {
            before( async function beforeTestSubmitHL7() {
                this.timeout( 5000 );
                // Prepare input
                this.config = {
                    ignoreHashExists: true,
                    billingFlag: true,
                    flow: "MS_Laborimport_HL7",
                    skipParsingLdt: true,
                    sourceFileType: "HL7",
                    hl7CreateTreatments: true,
                    respondimmediately: false
                };
                this.fileName = hl7Files[0];
                this.pathToLoadHL7File = path.resolve( `${hl7FilesPath}${this.fileName}.hl7` );

                this.hl7File = await readFile( this.pathToLoadHL7File );
                if( err || !this.hl7File ) {
                    throw err;
                }

                // Still need to create the JSON file
                const Iconv = require( 'iconv' ).Iconv;
                try {
                    let iconv = new Iconv( 'ISO-8859-1', 'UTF-8//IGNORE' );
                    this.hl7Converted = iconv.convert( this.hl7File );
                } catch( ex ) {
                    should.not.exists( ex );
                }
                this.HL7JSON = Y.doccirrus.api.hl7.convertHL7toHL7JSON( this.hl7Converted.toString( 'utf8' ) );
            } );

            describe( '.submitHL7()', function() {
                it( `should return response with one linked activity`, async function testSubmitHL7() {
                    const submitHL7 = await Y.doccirrus.api.lab.submitHL7( {
                        user: user,
                        data: {
                            HL7JSON: this.HL7JSON,
                            config: this.config
                        },
                        ldtFile: {
                            path: this.pathToLoadHL7File,
                            originalname: this.fileName + '.hl7',
                            data: this.hl7File,
                            pmResults: {}
                        }
                    } );

                    should.exist( submitHL7 );
                    submitHL7[0].linkedActivities.should.be.an( 'Array' );
                    submitHL7[0].linkedActivities.should.have.length( 1 );
                } );
            } );
        } );

        context( 'and given HL7-file and createTreatments set to false in config', function contextHL7() {
            before( async function beforeTestSubmitHL7() {
                // Prepare input
                this.config = {
                    ignoreHashExists: true,
                    billingFlag: true,
                    flow: "",
                    skipParsingLdt: true,
                    sourceFileType: "HL7",
                    hl7CreateTreatments: false,
                    respondimmediately: false
                };

                this.fileName = hl7Files[0];
                this.pathToLoadHL7File = path.resolve( `${hl7FilesPath}${this.fileName}.hl7` );

                this.hl7File = await readFile( this.pathToLoadHL7File );
                if( err || !this.hl7File ) {
                    throw err;
                }

                // Still need to create the JSON file
                const Iconv = require( 'iconv' ).Iconv;
                try {
                    let iconv = new Iconv( 'ISO-8859-1', 'UTF-8//IGNORE' );
                    this.hl7Converted = iconv.convert( this.hl7File );
                } catch( ex ) {
                    should.not.exists( ex );
                }
                this.HL7JSON = Y.doccirrus.api.hl7.convertHL7toHL7JSON( this.hl7Converted.toString( 'utf8' ) );
            } );

            describe( '.submitHL7()', function() {
                it( `should return a response with no linked activities`, async function testSubmitHL7() {
                    const submitHL7 = await Y.doccirrus.api.lab.submitHL7( {
                        user: user,
                        data: {
                            HL7JSON: this.HL7JSON,
                            config: this.config
                        },
                        ldtFile: {
                            path: this.pathToLoadHL7File,
                            originalname: this.fileName + '.hl7',
                            data: this.hl7File,
                            pmResults: {}
                        }
                    } );

                    should.exist( submitHL7 );
                    submitHL7[0].linkedActivities.should.be.an( 'Array' );
                    submitHL7[0].linkedActivities.should.have.length( 0 );
                } );
            } );
        } );
    } );

} );
