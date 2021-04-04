/**
 * User: nazar krania
 * Date: 1/28/19  11:21 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, should, expect, describe, it, after*/

const
    dataCache = Y.doccirrus.cacheUtils.dataCache,
    {formatPromiseResult} = require( 'dc-core' ).utils,
    mongoose = require( 'mongoose' ),
    logId = new mongoose.Types.ObjectId().toString(),
    KEY = 'mochaTest',
    user = Y.doccirrus.auth.getSUForLocal();

let
    mockedDel;

const acquireLock = ( key, data ) => {
    return dataCache.acquireLock( {
        key, data
    } );
};

const releaseLock = ( params ) => {
    return dataCache.releaseLock( params );
};

const logValidate = ( mojit, {user, originalParams} ) => {
    return new Promise( ( resolve, reject ) => {
        mojit.validate( {
            user,
            originalParams,
            callback: ( err, res ) => {
                if( err ) {
                    return reject( err );
                }
                return resolve( res );
            }
        } );
    } );
};

const logReplace = ( mojit, {user, originalParams} ) => {
    return new Promise( ( resolve, reject ) => {
        mojit.replace( {
            user,
            originalParams,
            callback: ( err, res ) => {
                if( err ) {
                    return reject( err );
                }
                return resolve( res );
            }
        } );
    } );
};

const pvsLog = {
        "_id": logId,
        "isPreValidated": true,
        "notApproved": [
            0,
            0,
            0
        ],
        "replacement": false,
        "excludedPatientIds": [],
        "excludedScheinIds": [],
        "insuranceTypes": [
            "BG",
            "PRIVATE",
            "SELFPAYER"
        ],
        "doNotcheckCatalog": true,
        "employeeFilterEnabled": false,
    //TODO: FIX LOCATIONID
        "mainLocationId": "000000000000000000000001",
        "commercialNo": "101010101",
        "locname": "TestPraxis1",
        "totalItems": "",
        "user": [
            {
                "_id": "5c4b2aada04fda37ce1d7a2b",
                "name": "A B",
                "employeeNo": "100000000000000000000004"
            }
        ],
        "lastUpdate": "2019-01-25T15:26:36.992Z",
        "status": "VALIDATION_ERR",
        "_log_version": "3",
        "created": "2019-01-25T15:25:25.888Z",
        "pid": "",
        "priceTotal": null,
        "pointsTotal": null,
        "pricePerPatient": null,
        "pointsPerPatient": null,
        "replacedLogId": "",
        "version": null,
        "padnextFileName": "",
        "padnextFileId": "",
        "padnextSettingId": "5c4b2a3333699837cd13dc76",
        "padnextSettingTitle": "Test",
        "padnextSettingCustomerNo": "1",
        "encryptedPadnextFileName": "",
        "encryptedPadnextFileId": "",
        "startDate": "2018-08-31T22:00:00.000Z",
        "useStartDate": true,
        "endDate": "2019-01-25T23:00:00.000Z",
        "useEndDate": true,
        "useInsuranceStatus": false,
        "insuranceStatus": [],
        "withEmptyInsurance": true,
        "minTotal": 0,
        "employees": []
    },
    kbvLog = {
        "_id": logId,
        "isPreValidated": true,
        "notApproved": [
            0,
            0,
            0
        ],
        "replacement": false,
        "excludedPatientIds": [],
        "excludedScheinIds": [],
        "complete": false,
        "test": false,
        "mainLocationId": "56d94ba0d6d1f8607e4aaef8",
        "commercialNo": "qaa",
        "locname": "afff",
        "totalItems": "0/0/0",
        "user": [
            {
                "name": "A B",
                "employeeNo": "100000000000000000000004"
            },
            {
                "name": "A B",
                "employeeNo": "100000000000000000000004"
            }
        ],
        "lastUpdate": "2019-01-25T15:26:57.357Z",
        "status": "INVALID",
        "_log_version": "3",
        "created": "2019-01-25T15:26:06.947Z",
        "pid": "",
        "priceTotal": 0,
        "pointsTotal": 0,
        "pricePerPatient": null,
        "pointsPerPatient": null,
        "replacedLogId": "",
        "version": 1,
        "guid": "",
        "number": 0,
        "quarter": 1,
        "year": 2019,
        "destination": "72",
        "conFileName": "Z01qaa_25.01.2019_16.26.CON",
        "conFileId": "5c4b2ab986175437d7fbf125",
        "xkmFileName": "",
        "xkmFileId": "",
        "pdfMediaId": "",
        "kvcaEntry": [
            {
                "_id": "5c4b2a8e33699837cd13dc7c",
                "kv": "99",
                "kvName": "KBV",
                "kvcaType": "1CLICK",
                "kvcaAddress": "abrechnung.test@kv-safenet.de",
                "version": "2",
                "functions": [
                    {
                        "id": "Fkt 2",
                        "name": "1-Click Abrechnung als Echtabrechnung"
                    },
                    {
                        "id": "Fkt 8",
                        "name": "technische Rückmeldung (MDN) zu einem Echtpaket"
                    },
                    {
                        "id": "Fkt 1",
                        "name": "1-Click Abrechnung als Testabrechnung"
                    },
                    {
                        "id": "Fkt 10",
                        "name": "fachliche Rückmeldung zu einem Echtpaket"
                    },
                    {
                        "id": "Fkt 7",
                        "name": "technische Rückmeldung (MDN) zu einem Testpaket"
                    },
                    {
                        "id": "Fkt 9",
                        "name": "fachliche Rückmeldung zu einem Testpaket"
                    },
                    {
                        "id": "Fkt 3",
                        "name": "Sammelerklärung als Testpaket"
                    },
                    {
                        "id": "Fkt 4",
                        "name": "Sammelerklärung als Echtpaket"
                    },
                    {
                        "id": "Fkt 5",
                        "name": "1-Click Abrechnung inkl. Sammelerklärung als Testabrechnung"
                    },
                    {
                        "id": "Fkt 6",
                        "name": "1-Click Abrechnung inkl. Sammelerklärung als Echtabrechnung"
                    }
                ]
            }
        ],
        "addressee": "abrechnung.test@kv-safenet.de",
        "sender": "",
        "from": "",
        "sentId": "",
        "delivered": null,
        "responded": null,
        "QPZ": [
            {
                "physician": {
                    "_id": "100000000000000000000003",
                    "officialNo": "",
                    "asvTeamNumbers": [],
                    "specialities": [],
                    "lastname": "B",
                    "nameaffix": "",
                    "firstname": "A",
                    "title": "",
                    "initials": "AB"
                },
                "totalTime": 0
            },
            {
                "physician": {
                    "_id": "577a525dab71254346002815",
                    "officialNo": "",
                    "asvTeamNumbers": [],
                    "specialities": [],
                    "lastname": "ABC",
                    "nameaffix": "",
                    "firstname": "ABC",
                    "title": "",
                    "initials": "AA"
                },
                "totalTime": 0
            }
        ],
        "statFiles": [
            {
                "fileName": "Prüfprotokoll.pdf",
                "fileId": "5c4b2ac186175437d7fbf128"
            }
        ],
        "messages": []
    };

/**
 * Tests for the centralized/global lock for invoice logs.
 */
describe( 'Cache-utils centralized/global lock tests', function() {
    describe( '0. Setup', function() {

        it( '0.0. unmock cacheUtils', async function() {
            mockedDel = Y.doccirrus.cacheUtils.adapter.del;
            //put original adapter del
            Y.doccirrus.cacheUtils.adapter.del = Y.doccirrus.cacheUtils.adapter._del;
        } );

        it( '0.1. insert pvslog', async function() {
            const [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'pvslog',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( pvsLog )
            } ) );
            should.not.exist( err );
            should.exist( result );
        } );

        it( '0.2. insert kbvlog', async function() {
            const [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'kbvlog',
                action: 'post',
                data: Y.doccirrus.filters.cleanDbObject( kbvLog )
            } ) );
            should.not.exist( err );
            should.exist( result );
        } );

        it( '0.3. release lock', async function() {
            const [err] = await formatPromiseResult( releaseLock( {key: KEY} ) );
            should.not.exist( err );
        } );

    } );

    describe( '1. Check basic functionality of acquireLock and releaseLock', function() {
        it( '1.1. acquireLock should create lock', async function() {
            const [err, result] = await formatPromiseResult( acquireLock( KEY, `${(new Date()).getTime()}` ) );
            should.not.exist( err );
            expect( result ).to.be.an( 'array' );
            let status = result[0];
            status.should.equal( 1 );
        } );

        it( '1.2. acquireLock should not allow to create lock again', async function() {
            const [err, result] = await formatPromiseResult( acquireLock( KEY, `${(new Date()).getTime()}` ) );
            should.not.exist( err );
            expect( result ).to.be.an( 'array' );
            let status = result[0];
            status.should.equal( 0 );
        } );

        it( '1.3. releaseLock should release lock', async function() {
            const [err, result] = await formatPromiseResult( releaseLock( {key: KEY} ) );
            should.not.exist( err );
            expect( result ).to.be.an( 'array' );
            let status = result[0];
            status.should.equal( 1 );
        } );

        it( '1.4. releaseLock will not release lock if it not exists', async function() {
            const [err, result] = await formatPromiseResult( releaseLock( {key: KEY} ) );
            should.not.exist( err );
            expect( result ).to.be.an( 'array' );
            let status = result[0];
            status.should.equal( 0 );
        } );

        it( '1.5. should be possible to create new lock after it was released', async function() {
            const [err, result] = await formatPromiseResult( acquireLock( KEY, `${(new Date()).getTime()}` ) );
            should.not.exist( err );
            expect( result ).to.be.an( 'array' );
            let status = result[0];
            status.should.equal( 1 );
            await formatPromiseResult( releaseLock( {key: KEY} ) );
        } );
    } );

    describe( '2. Check that lock is working in scope of pvslog.validate', function() {
        it( '2.1. check that lock will be triggered for cashlog (prevalidate)', async function() {
            const key = 'invoicing';
            const data = `cashlog|prevalidate|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult( logValidate( Y.doccirrus.api.pvslog, {
                user,
                originalParams: {
                    id: pvsLog._id,
                    preValidation: true,
                    cashlog: true
                }
            } ) );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );

        it( '2.2. check that lock will be triggered for pvslog (prevalidate)', async function() {
            const key = 'invoicing';
            const data = `pvslog|prevalidate|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult( logValidate( Y.doccirrus.api.pvslog, {
                user,
                originalParams: {
                    id: pvsLog._id,
                    preValidation: true,
                    cashlog: false
                }
            } ) );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );

        it( '2.1. check that lock will be triggered for cashlog (validate)', async function() {
            const key = 'invoicing';
            const data = `cashlog|validate|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult( logValidate( Y.doccirrus.api.pvslog, {
                user,
                originalParams: {
                    id: pvsLog._id,
                    preValidation: false,
                    cashlog: true
                }
            } ) );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );

        it( '2.2. check that lock will be triggered for pvslog (validate)', async function() {
            const key = 'invoicing';
            const data = `pvslog|validate|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult( logValidate( Y.doccirrus.api.pvslog, {
                user,
                originalParams: {
                    id: pvsLog._id,
                    preValidation: false,
                    cashlog: false
                }
            } ) );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );
    } );

    describe( '3. Check that lock is working in scope of kbvlog.validate', function() {
        it( '3.1. check that lock will be triggered', async function() {
            const key = 'invoicing';
            const data = `kbvlog|validate|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult( logValidate( Y.doccirrus.api.kbvlog, {
                user,
                originalParams: {
                    id: kbvLog._id
                }
            } ) );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );
    } );

    describe( '4. Check that lock is working in scope of cashlog.replace', function() {
        it( '4.1. check that lock will be triggered', async function() {
            const key = 'invoicing';
            const data = `cashlog|replace|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult( logReplace( Y.doccirrus.api.cashlog, {
                user,
                originalParams: {
                    id: kbvLog._id
                }
            } ) );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );
    } );

    describe( '4. Check that lock is working in scope of pvslog.replace', function() {
        it( '4.1. check that lock will be triggered for cashlog (prevalidate)', async function() {
            const key = 'invoicing';
            const data = `cashlog|prevalidate|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult( logReplace( Y.doccirrus.api.pvslog, {
                user,
                originalParams: {
                    id: pvsLog._id,
                    preValidation: true,
                    cashlog: true
                }
            } ) );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );

        it( '4.2. check that lock will be triggered for pvslog (prevalidate)', async function() {
            const key = 'invoicing';
            const data = `pvslog|prevalidate|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult( logReplace( Y.doccirrus.api.pvslog, {
                user,
                originalParams: {
                    id: pvsLog._id,
                    preValidation: true,
                    cashlog: false
                }
            } ) );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );

        it( '4.3. check that lock will be triggered for cashlog (validate)', async function() {
            const key = 'invoicing';
            const data = `cashlog|validate|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult( logReplace( Y.doccirrus.api.pvslog, {
                user,
                originalParams: {
                    id: pvsLog._id,
                    preValidation: false,
                    cashlog: true
                }
            } ) );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );

        it( '4.4. check that lock will be triggered for pvslog (validate)', async function() {
            const key = 'invoicing';
            const data = `pvslog|validate|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult( logReplace( Y.doccirrus.api.pvslog, {
                user,
                originalParams: {
                    id: pvsLog._id,
                    preValidation: false,
                    cashlog: false
                }
            } ) );
            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );
    } );

    describe( '5. Check that lock is working in scope of invoiceprocess', function() {
        it( '5.1. check that lock will be triggered for invoiceBatchCreation', async function() {
            const key = 'invoicing';
            const data = `cashlog|invoiceGeneration|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.invoiceprocess.invoiceBatchCreation( {
                        user,
                        callback: ( err, res ) => {
                            if( err ) {
                                return reject( err );
                            }
                            return resolve( res );
                        }
                    } );
                } )
            );

            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );

        it( '5.2. check that lock will be triggered for invoiceBatchCreationPDF', async function() {
            const key = 'invoicing';
            const data = `cashlog|invoiceAndPDFGeneration|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.invoiceprocess.invoiceBatchCreationPDF( {
                        user,
                        callback: ( err, res ) => {
                            if( err ) {
                                return reject( err );
                            }
                            return resolve( res );
                        }
                    } );
                } )
            );

            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );
    } );

    describe( '6. Check that lock is working in scope of invoicelog', function() {
        after( async function() {
            const key = 'invoicing';
            await formatPromiseResult( releaseLock( {key: key} ) );
        } );

        it( '6.1. check that lock will be triggered for approve (kbvlog)', async function() {
            const key = 'invoicing';
            const data = `kbvlog|approve|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.invoicelog.approve( {
                        user,
                        originalParams: {
                            id: kbvLog._id,
                            invoiceType: 'KBV'
                        },
                        callback: ( err, res ) => {
                            if( err ) {
                                return reject( err );
                            }
                            return resolve( res );
                        }
                    } );
                } )
            );

            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );

        it( '6.2. check that lock will be triggered for approve (pvslog)', async function() {
            const key = 'invoicing';
            const data = `pvslog|approve|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.invoicelog.approve( {
                        user,
                        originalParams: {
                            id: pvsLog._id,
                            invoiceType: 'PVS'
                        },
                        callback: ( err, res ) => {
                            if( err ) {
                                return reject( err );
                            }
                            return resolve( res );
                        }
                    } );
                } )
            );

            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );

        it( '6.3. check that lock will be triggered for approve (cashlog)', async function() {
            const key = 'invoicing';
            const data = `cashlog|approve|${user.U}|${(new Date()).getTime()}|0`;
            await formatPromiseResult( releaseLock( {key: key} ) );
            await formatPromiseResult( acquireLock( key, data ) );

            const [err, result] = await formatPromiseResult(
                new Promise( ( resolve, reject ) => {
                    Y.doccirrus.api.invoicelog.approve( {
                        user,
                        originalParams: {
                            id: '-',
                            invoiceType: 'CASH'
                        },
                        callback: ( err, res ) => {
                            if( err ) {
                                return reject( err );
                            }
                            return resolve( res );
                        }
                    } );
                } )
            );

            should.not.exist( result );
            should.exist( err );
            err.should.be.an( 'Object' );
            err.code.should.equal( '2507' );
        } );
    } );

    describe( '4. Removing test data', function() {
        it( '4.1. removes pvslog', async function() {
            const [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'pvslog',
                action: 'delete',
                query: {
                    _id: logId
                }
            } ) );
            should.not.exist( err );
            should.exist( result );
        } );

        it( '4.2. removes kbvlog', async function() {
            const [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'kbvlog',
                action: 'delete',
                query: {
                    _id: logId
                }
            } ) );
            should.not.exist( err );
            should.exist( result );
        } );
    } );

    describe( '5. TearDown', function() {

        it( '5.0. mock cacheUtils', function() {
            //put mocked functions back to not affect other suites
            Y.doccirrus.cacheUtils.adapter.del = mockedDel;
        } );
    } );
} );
