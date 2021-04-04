/**
 * User: pi
 * Date: 14/07/16  15:50
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

module.exports = function( Y ) {
    const
        ObjectId = require( 'mongoose' ).Types.ObjectId,
        mochaAppName = 'MOCHA_APP',
        moment = require( 'moment' ),
        mongoose = require( 'mongoose' ),
        async = require( 'async' ),
        {formatPromiseResult} = require( 'dc-core' ).utils;

    let
        mochaUtils = {
            dateStep: {
                value: 1,
                unit: 'm'
            },
            currentDate: null
        };

    mochaUtils.getCountryMode = function getCountryMode() {
        const practiceCountryMode = Y.doccirrus.commonutils.getCountryModeFromConfigs() || [];
        return practiceCountryMode.length === 1 ? practiceCountryMode[0] : 'D';
    };

    mochaUtils.getAppName = function getAppName() {
        return mochaAppName;
    };

    mochaUtils.getSecondPracticeNo = function getSecondPracticeNo() {
        return 'mochaTestCustomerNo2';
    };
    mochaUtils.getPracticeNo = function getPracticeNo() {
        return 'mochaTestCustomerNo';
    };

    mochaUtils.cleanDB = function cleanDB( config, callback ) {
        let
            {user, collections2clean} = config,
            collections = collections2clean || ['activity', 'patient', 'casefolder', 'marker', 'employee', 'identity', 'calendar', 'location', 'syncreporting', 'catalogusage', 'tag', 'practice', 'conference', 'schedule', 'scheduletype', 'contact', 'patientreg', 'task', 'budget', 'formtemplate', 'formtemplateversion', 'document', 'media', 'audit'];
        async.eachSeries( collections, async function( collection, next ) {
            const [err, model] = await formatPromiseResult(
                Y.doccirrus.mongodb.getModel( user, collection, false )
            );
            if( err ) {
                return next( err );
            }
            model.mongoose.remove( {}, next );
        }, callback );
    };

    mochaUtils.generateNewDate = function generateNewDate() {
        let
            self = this,
            dateStep = self.dateStep,
            startData = self.currentDate || moment().subtract( 1, 'quarter' ).startOf( 'quarter' ).toISOString(),
            newDate = moment( startData ).add( dateStep.value, dateStep.unit ).toISOString();
        self.currentDate = newDate;
        return newDate;
    };

    mochaUtils.createCaseFolder = function createCaseFolder( params ) {
        const
            {employeeId, locationId, user, patientId, caseFolderId} = params;
        let
            locationData = mochaUtils.getLocationData( {
                _id: locationId
            } ),
            employeeData = mochaUtils.getEmployeeData( {
                _id: employeeId
            } ),
            patientData = mochaUtils.getPatientData( {
                insuranceStatus: [
                    {
                        insuranceId: '109519005',
                        insuranceName: 'AOK Nordost - Die Gesundheitskasse',
                        insurancePrintName: 'AOK Nordost',
                        insuranceGrpId: '72101',
                        type: 'PUBLIC',
                        kv: '72',
                        locationId,
                        employeeId,
                        address2: '10957 Berlin',
                        address1: 'Wilhelmstraße 1',
                        bgNumber: '',
                        unzkv: [],
                        fused: false,
                        feeSchedule: '1',
                        costCarrierBillingGroup: '01',
                        costCarrierBillingSection: '00',
                        dmp: '',
                        persGroup: '',
                        insuranceKind: '1',
                        fk4110: null,
                        fk4133: null
                    }],
                _id: patientId
            } ),
            caseFolderData = mochaUtils.getCaseFolderData( {
                patientId: patientId,
                _id: caseFolderId
            } );

        return Y.doccirrus.mongodb.runDb( {
            user: user,
            model: 'location',
            action: 'post',
            data: Y.doccirrus.filters.cleanDbObject( locationData )
        } )
            .then( () => {

                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( employeeData )
                } );

            } )
            .then( () => {
                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'patient',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( patientData )
                } );
            } )
            .then( () => {
                return Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'casefolder',
                    action: 'post',
                    data: Y.doccirrus.filters.cleanDbObject( caseFolderData )
                } );
            } );
    };

    mochaUtils.getPatientData = function getPatientData( patient = {} ) {
        const countryMode = patient.countryMode || mochaUtils.getCountryMode();
        let
            germanInsurance = [
                {
                    'insuranceId': '109519005',
                    'insuranceName': 'AOK Nordost - Die Gesundheitskasse',
                    'insurancePrintName': 'AOK Nordost',
                    'insuranceGrpId': '72101',
                    'type': 'PUBLIC',
                    'kv': '72',
                    'locationId': '000000000000000000000001',
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
            swissInsurance = [
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
                    "locationId": "000000000000000000000001",
                    "changebillingtypedesc": true,
                    "mediport": true
                }],
            _patient = {
                '_id': new mongoose.Types.ObjectId().toString(),
                countryMode: [countryMode],
                partnerIds: [],
                'kbvDob': '01.01.1990',
                'dob': moment( '1989-12-31T23:00:00.000Z' ).toISOString(),
                'gender': 'MALE',
                'talk': 'MR',
                "dataTransmissionToMediportApproved": countryMode === 'CH',
                'insuranceStatus': patient.insuranceStatus || countryMode === 'D' ? germanInsurance : swissInsurance,
                'addresses': [
                    {
                        'kind': 'OFFICIAL',
                        'addon': '',
                        'countryCode': 'D',
                        'country': 'Deutschland',
                        'city': 'Berlin',
                        'zip': '12099',
                        'houseno': '123',
                        'street': '23'
                    }
                ],
                'communications': [
                    {
                        'type': 'PHONEPRIV',
                        'value': '+000',
                        'confirmNeeded': false
                    },
                    {
                        "type": "EMAILPRIV",
                        "value": "mocha-test-patient@doc-cirrus.com",
                        "confirmNeeded": true,
                        "confirmed": false
                    }
                ],
                'lastname': 'Patient',
                'firstname': 'Test'
            };
        return Object.assign( {}, _patient, patient );
    };

    mochaUtils.getCaseFolderData = function getCaseFolderData( config ) {
        return {
            '_id': config._id || new mongoose.Types.ObjectId().toString(),
            'title': config.title || 'Case folder',
            'type': config.type || 'PUBLIC',
            'patientId': config.patientId,
            'additionalType': config.additionalType,
            'identity': config.identity
        };
    };

    mochaUtils.getPracticeData = function getPracticeData( config = {} ) {
        return {
            '_id': config._id || new mongoose.Types.ObjectId().toString(),
            "activeState": true,
            countryMode: config.countryMode || [mochaUtils.getCountryMode()],
            "addresses": [
                {
                    "kind": "POSTAL",
                    "addon": "",
                    "countryCode": "D",
                    "country": "Deutschland",
                    "city": "berlin",
                    "zip": "44444",
                    "houseno": "44",
                    "street": "prac4Str."
                }
            ],
            "commercialNo": "101010101",
            "communications": [
                {
                    "type": "PHONEJOB",
                    "value": "+491111111111",
                    "confirmNeeded": false,
                    "confirmed": false,
                    "signaling": true
                }
            ],
            "coname": "Mocha practice",
            "cotype": "ARZTPRAXIS",
            "createAlert": [
                {
                    "type": "email",
                    "active": true,
                    "receiver": "patient"
                }
            ],
            "customerNo": mochaUtils.getPracticeNo(),
            "deleteAlert": [],
            "prodServices": [],
            "reminderAlert1": [],
            "reminderAlert2": [],
            "reminderAlert3": [],
            "tenantId": "1213141513Mocha",
            "updateAlert": [
                {
                    "type": "email",
                    "active": true,
                    "receiver": "patient"
                }
            ],
            "allowAdhoc": true,
            "allowPRCAdhoc": true,
            "allowBookingsOutsideOpeningHours": true,
            "autoShift": false,
            "calendarViewDayEnd": "23:59",
            "calendarViewDayStart": "08:00",
            "licenseScope": [],
            "autoEnd": false,
            "systemType": "TRIAL",
            "serverType": "MTS",
            "dcCustomerNo": mochaUtils.getPracticeNo(),
            "tenants": [],
            "centralContact": {},
            "colorMode": "MEETING",
            "autoMutateOff": false
        };
    };

    mochaUtils.getEmployeeData = function( employee = {} ) {
        const countryMode = employee.countryMode || mochaUtils.getCountryMode();
        let
            // moment = require( 'moment' ),
            // mongoose = require( 'mongoose' ),
            _employee = {
                '_id': new mongoose.Types.ObjectId().toString(),
                countryMode: [countryMode],
                'officialNo': '999999900',
                'type': 'PHYSICIAN',
                'from': moment( '2010-02-05T23:00:00.000Z' ).toISOString(),
                'to': null,
                'dob': moment( '2010-02-06T09:52:45.322Z' ).toISOString(),
                'talk': 'MR',
                'communications': [
                    {
                        'type': 'EMAILPRIV',
                        'preferred': false,
                        'value': 'mocha-test@doc-cirrus.com',
                        'confirmNeeded': false,
                        'confirmed': false
                    }
                ],
                'lastname': 'Last name',
                'firstname': 'First name',
                'memberOf': [
                    {
                        'group': 'ADMIN'
                    }
                ],
                'asvTeamNumbers': [],
                'status': 'ACTIVE',
                'username': 'username'
            };
        return Object.assign( {}, _employee, employee );
    };

    mochaUtils.getIdentityData = function getIdentityData( identity ) {
        const _identity = {
                '_id': new mongoose.Types.ObjectId().toString(),
                "username": "username",
                "firstname": "First name",
                "lastname": "Last name",
                "pwResetToken": "",
                "status": "ACTIVE",
                "specifiedBy": new mongoose.Types.ObjectId().toString(),
                "memberOf": [
                    {
                        "group": "ADMIN"
                    },
                    {
                        "group": "CONTROLLER"
                    },
                    {
                        "group": "PHYSICIAN"
                    }
                ],
                "__v": 13,
                "pw": "$2$zgy96jzmr3u4e425316b5656223a67af6bed0d065be7b5a29c6a841665ea931320211cfd87e57daa48149af5a388f4668bc25474602a743db3aac9a2036c576d624082d5dcbc",
                "validFrom": "2015-02-05T23:00:00.000Z",
                "validTo": null,
                "cardKey": "",
                "locations": [],
                "onlineEmp": false,
                "onlinePartner": false,
                "onlinePat": false,
                "currentLocation": "",
                "labdataSortOrder": "",
                "preferredLanguage": ""
            };
        return Object.assign( {}, _identity, identity );
    };

    mochaUtils.getActivityData = function getActivityData( activity ) {
        let
            self = this,

            _activity = {
                '_id': new mongoose.Types.ObjectId().toString(),
                'actType': 'HISTORY',
                timestamp: activity.timestamp || self.generateNewDate(),
                'locationId': '000000000000000000000001',
                'apkState': 'IN_PROGRESS',
                'status': 'VALID'
            };
        return Object.assign( {}, _activity, activity );
    };

    mochaUtils.getLocationData = function getLocationData( location = {} ) {
        const countryMode = location.countryMode || mochaUtils.getCountryMode();
        let
            _location = {
                '_id': location._id || new mongoose.Types.ObjectId().toString(),
                'city': 'berlin',
                'commercialNo': '198212400',
                countryMode: [countryMode],
                'country': 'Deutschland',
                'countryCode': countryMode || 'D',
                'email': 'asdsd@asdasd.de',
                'fax': '+111111',
                'houseno': '44',
                'kind': 'BILLING',
                'locname': 'TestPraxis1',
                'openTimes': [
                    {
                        'end': [
                            18,
                            30
                        ],
                        'start': [
                            9,
                            0
                        ],
                        'days': [
                            1,
                            2,
                            3,
                            4,
                            5
                        ]
                    }
                ],
                'phone': '+491111111111',
                'street': 'prac4Str.',
                'zip': '44444',
                'addon': '',
                'isAdditionalLocation': false,
                'kbvZip': '10001',
                'kv': '72',
                'isOptional': true,
                'cardType': 'BANK',
                'enabledPrinters': [],
                'institutionCode': '123123123'
            };
        return Object.assign( {}, _location, location );
    };

    mochaUtils.getSupplierData = ( supplier ) => {
        const _supplier = {
            "_id": new mongoose.Types.ObjectId().toString(),
            "talk": "",
            "title": "",
            "nameaffix": "",
            "firstname": "",
            "lastname": "",
            "institutionType": "OTHER",
            "bsnrs": [],
            "expertise": [],
            "asvTeamNumbers": [],
            "ownZsrNumber": false,
            //"defaultFormId" : null,
            "sendElectronicOrder": true,
            "isMainSupplier": true,
            "contacts": [],
            "baseContactType": "VENDOR",
            "addresses": [],
            "communications": [],
            "institutionName": "NEW LIFERANT2",
            "supplierCustomerId": "12345678",
            "content": "NEW LIFERANT2"
        };
        return Object.assign( {}, _supplier, supplier );
    };
    /**
     *  Method for populating sample activities
     *  @param activity
     */

    mochaUtils.getPkvScheinActivity = function getPkvScheinActivity( activity ) {
        const _activity = {
            actType: 'PKVSCHEIN',
            userContent: 'Privat Schein',
            status: 'VALID'
        };
        return mochaUtils.getActivityData( Object.assign( {}, _activity, activity ) );
    };

    mochaUtils.getTreatmentActivity = function getTreatmentActivity( activity ) {
        const _activity = {
            actType: 'TREATMENT',
            catalogShort: 'EBM',
            code: '01100',
            patientId: activity.patientId,
            status: 'VALID'
        };
        return mochaUtils.getActivityData( Object.assign( {}, _activity, activity ) );
    };

    mochaUtils.getDiagnosisActivity = function getDiagnosisActivity( activity ) {
        const _activity = {
            actType: 'DIAGNOSIS',
            catalogShort: 'ICD-10',
            code: 'A00.0',
            patientId: activity.patientId,
            status: 'VALID'
        };
        return mochaUtils.getActivityData( Object.assign( {}, _activity, activity ) );
    };

    /**
     * This function is optimized for communication.js
     * @param {Object} config
     * @param {String} config.filename will be concat with "process.cwd()"
     * @param {Object} [config.tmpFilename] by default will replace "client" with "require" in original name. will be concat with "process.cwd()"
     * @param {Function} callback
     * @return {String} tmpFilePath full path which can be used to remove/require tmp file.
     */
    mochaUtils.requireClientScript = function requireClientScript( config, callback ) {
        let
            filename = config.filename,
            path = require( 'path' ),
            fileDesc = path.parse( filename ),
            tmpFilename = config.tmpFilename,
            esprima = require( 'esprima' ),
            estraverse = require( 'estraverse' ),
            escodegen = require( 'escodegen' ),
            fs = require( 'fs' ),
            fakeY = {
                "type": "VariableDeclaration",
                "declarations": [
                    {
                        "type": "VariableDeclarator",
                        "id": {
                            "type": "Identifier",
                            "name": "NAME"
                        },
                        "init": {
                            "type": "Literal",
                            "value": "communication.client.js",
                            "raw": "'communication.client.js'"
                        }
                    },
                    {
                        "type": "VariableDeclarator",
                        "id": {
                            "type": "Identifier",
                            "name": "Y"
                        },
                        "init": {
                            "type": "ObjectExpression",
                            "properties": [
                                {
                                    "type": "Property",
                                    "key": {
                                        "type": "Identifier",
                                        "name": "log"
                                    },
                                    "computed": false,
                                    "value": {
                                        "type": "FunctionExpression",
                                        "id": null,
                                        "params": [],
                                        "defaults": [],
                                        "body": {
                                            "type": "BlockStatement",
                                            "body": []
                                        },
                                        "generator": false,
                                        "expression": false
                                    },
                                    "kind": "init",
                                    "method": true,
                                    "shorthand": false
                                },
                                {
                                    "type": "Property",
                                    "key": {
                                        "type": "Identifier",
                                        "name": "doccirrus"
                                    },
                                    "computed": false,
                                    "value": {
                                        "type": "ObjectExpression",
                                        "properties": [
                                            {
                                                "type": "Property",
                                                "key": {
                                                    "type": "Identifier",
                                                    "name": "i18n"
                                                },
                                                "computed": false,
                                                "value": {
                                                    "type": "FunctionExpression",
                                                    "id": null,
                                                    "params": [],
                                                    "defaults": [],
                                                    "body": {
                                                        "type": "BlockStatement",
                                                        "body": [
                                                            {
                                                                "type": "ReturnStatement",
                                                                "argument": {
                                                                    "type": "Literal",
                                                                    "value": "",
                                                                    "raw": "''"
                                                                }
                                                            }
                                                        ]
                                                    },
                                                    "generator": false,
                                                    "expression": false
                                                },
                                                "kind": "init",
                                                "method": true,
                                                "shorthand": false
                                            },
                                            {
                                                "type": "Property",
                                                "key": {
                                                    "type": "Identifier",
                                                    "name": "comctl"
                                                },
                                                "computed": false,
                                                "value": {
                                                    "type": "ObjectExpression",
                                                    "properties": [
                                                        {
                                                            "type": "Property",
                                                            "key": {
                                                                "type": "Identifier",
                                                                "name": "getRandomString"
                                                            },
                                                            "computed": false,
                                                            "value": {
                                                                "type": "FunctionExpression",
                                                                "id": null,
                                                                "params": [],
                                                                "defaults": [],
                                                                "body": {
                                                                    "type": "BlockStatement",
                                                                    "body": [
                                                                        {
                                                                            "type": "ReturnStatement",
                                                                            "argument": {
                                                                                "type": "Literal",
                                                                                "value": "",
                                                                                "raw": "''"
                                                                            }
                                                                        }
                                                                    ]
                                                                },
                                                                "generator": false,
                                                                "expression": false
                                                            },
                                                            "kind": "init",
                                                            "method": true,
                                                            "shorthand": false
                                                        }
                                                    ]
                                                },
                                                "kind": "init",
                                                "method": false,
                                                "shorthand": false
                                            }
                                        ]
                                    },
                                    "kind": "init",
                                    "method": false,
                                    "shorthand": false
                                }
                            ]
                        }
                    }
                ],
                "kind": "var"
            };

        if( !tmpFilename ) {
            tmpFilename = path.join( fileDesc.dir, fileDesc.name.replace( 'client', 'require' ) + '.js' );
        }

        fs.readFile( path.join( process.cwd(), filename ), 'utf8', function( err, data ) { //eslint-disable-line
            let
                AST,
                addExpression;

            //special case
            data = data.replace( /Y\.doccirrus\.communication/gi, 'self' );

            AST = esprima.parse( data, {attachComment: false, comment: true, tokens: true, range: true} );
            escodegen.attachComments( AST, AST.comments, AST.tokens );

            addExpression = AST.body.find( function( node ) {
                return 'ExpressionStatement' === node.type && 'CallExpression' === node.expression.type && node.expression.callee &&
                       'MemberExpression' === node.expression.callee.type && 'YUI' === node.expression.callee.object.name &&
                       'add' === node.expression.callee.property.name;
            } );

            if( addExpression ) {
                let
                    addExpressionIndex = AST.body.indexOf( addExpression );
                AST.body.splice( addExpressionIndex, 1, ...addExpression.expression['arguments'][1].body.body ); //eslint-disable-line
                AST.body.splice( addExpressionIndex, 0, fakeY );
            }

            estraverse.replace( AST, {
                enter: function( node ) {
                    if( 'AssignmentExpression' === node.type && 'MemberExpression' === node.left.type && 'CallExpression' === node.left.object.type &&
                        'doccirrus' === node.left.object.arguments[0].value ) {
                        node.left.object = {
                            type: "Identifier",
                            name: "module"
                        };
                        node.left.property = {
                            type: "Identifier",
                            name: "exports"
                        };
                        return node;
                    }
                }
            } );

            fs.writeFileSync( path.join( process.cwd(), tmpFilename ), escodegen.generate( AST, {
                comment: true
            } ) );

            callback( null, require( path.join( process.cwd(), tmpFilename ) ) );

        } );
        return path.join( process.cwd(), tmpFilename );
    };

    mochaUtils.createMochaForms = function createMochaForms( user ) {
        const
            prescriptionData = require( '../forms/prescription_form.json' ),
            Prom = require( 'bluebird' ),
            fs = require( 'fs' );
        return Promise.resolve()
            .then( () => {
                return Prom.each( prescriptionData.formtemplate, ( formtemplate ) => {
                    return Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'formtemplate',
                        action: 'upsert',
                        data: Object.assign( {skipcheck_: true}, formtemplate )
                    } );
                } );
            } )
            .then( () => {
                return Prom.each( prescriptionData.media, ( media ) => {
                    return Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'media',
                        action: 'upsert',
                        data: Object.assign( {skipcheck_: true}, media )
                    } );
                } );
            } )
            .then( () => {
                return Prom.each( prescriptionData.media, ( media ) => {
                    return new Promise( ( resolve, reject ) => {
                        fs.readFile( process.cwd() + `/mojits/TestingMojit/forms/media_${media._id}.binary`, ( err, data ) => {
                            if( err ) {
                                return reject( err );
                            }
                            Y.doccirrus.gridfs.store( user, media._id, {}, data, ( err ) => {
                                if( err ) {
                                    return reject( err );
                                }
                                resolve();
                            } );
                        } );

                    } );
                } );
            } )
            .then( () => {
                return Prom.each( prescriptionData.formtemplateversion, ( formtemplateversion ) => {
                    return Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'formtemplateversion',
                        action: 'upsert',
                        data: Object.assign( {skipcheck_: true}, formtemplateversion )
                    } );
                } );
            } );

    };

    /**
     * infinite lazy ObjectId generator
     *
     */
    mochaUtils.getObjectIds = function* getObjectIds() {
        while( true ) {
            yield new ObjectId().toString();
        }
    };

    mochaUtils.filterWhitelisted = function ( obj, path, whiteList ) {
        let result;
        if( obj && obj.constructor === Array ) {
            result = [];
            for( const value of obj ) {
                result.push( mochaUtils.filterWhitelisted( value, path, whiteList ) );
            }
            return result;
        }

        if( obj && obj.constructor === Object ) {
            result = {};
            for( const [key, value] of Object.entries( obj ) ) {
                if( whiteList.includes( [...path, key].join( '.' ) ) ) {
                    result[key] = mochaUtils.filterWhitelisted( value, [...path, key], whiteList );
                }
            }
            return result;
        }
        return obj;
    };

    mochaUtils.getScheinData = function getScheinData( config = {} ) {
        let
            date = moment( (config && config.timestamp) || mochaUtils.generateNewDate() ),
            schein = {
                timestamp: date,
                scheinQuarter: date.get( 'quarter' ),
                scheinYear: date.get( 'year' ),
                status: 'VALID',
                scheinType: '0101',
                scheinSubgroup: '00',
                actType: (config && config.actType) || 'SCHEIN'
            };
        return mochaUtils.getActivityData( Object.assign( config, schein ) );
    };

    mochaUtils.getLabRequestData = function getLabRequestData( config = {} ) {
        let labrequest = {
            actType: "LABREQUEST",
            status: "VALID",
            userContent: "LabRequest",
            labRequestType: "LABREQUESTTYPE",
            scheinSlipMedicalTreatment: 1
        };
        return mochaUtils.getActivityData( Object.assign( config, labrequest ) );
    };

    return mochaUtils;
};
