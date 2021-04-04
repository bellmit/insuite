import core from "dc-core";
import path from "path";

describe( 'Y.doccirrus.forms.labdata', function() {
    before( async function() {
        this.stubs = [
            sinon.stub( core.config, 'load' ).callsFake( ( file ) => ( {
                env: {
                    // required by dcauth
                    directories: {
                        tmp: 'foo'
                    },
                    // required by
                    binutils: {}
                },
                db: {
                    mongoDb: {}
                },
                email: {}
            }[path.parse( file ).name] ) )
        ];

        await import( './labdatamappinghelper.common.yui' );
    } );

    after( function() {
        Y = null;
    } );

    describe( '.expandSingleTestResult()', function() {
        it( 'throws a TypeError', function() {
            expect( () => Y.doccirrus.forms.labdata.expandSingleTestResult() ).to.throw( TypeError );
        } );

        context( 'given LDT test data', function() {
            beforeEach( function() {
                this.fixtures = {
                    l_extra: {
                        "recordType": "8201",
                        "recordRequestId": "03344345",
                        "labReqNo": "2711",
                        "labReqReceived": "2020-10-23T21:00:00.000Z",
                        "reportDate": "2020-10-23T16:06:00.000Z",
                        "patientName": "Bar",
                        "patientForename": "Foo",
                        "patientDob": "1996-01-18T23:00:00.000Z",
                        "patientGender": "M",
                        "findingKind": "E",
                        "billingType": "K",
                        "labClient": "283344901",
                        "feeSchedule": 1,
                        "patientAddInfo": "4345",
                        "testId": [
                            {
                                "head": "HBA1C",
                                "testLabel": "HbA1c",
                                "gnr": [
                                    {
                                        "head": "32094",
                                        "cost": 400,
                                        "BillingDoneBy": 1
                                    }
                                ],
                                "testStatus": "B",
                                "sampleLabel": "EDTA-Blut",
                                "testResultVal": 0.4,
                                "TestResultUnit": "%",
                                "sampleNormalValueText": [
                                    "0,2-0,6"
                                ],
                                "labName": "Comedicum Sendlinger Tor"
                            }
                        ]
                    },
                    testResult: {
                        "head": "HBA1C",
                        "testLabel": "HbA1c",
                        "gnr": [
                            {
                                "head": "32094",
                                "cost": 400,
                                "BillingDoneBy": 1
                            }
                        ],
                        "testStatus": "B",
                        "sampleLabel": "EDTA-Blut",
                        "testResultVal": 0.4,
                        "TestResultUnit": "%",
                        "sampleNormalValueText": [
                            "0,2-0,6"
                        ],
                        "labName": "Comedicum Sendlinger Tor"
                    }
                };
            } );
            it( 'converts comma floats to dot floats', function() {
                const originalValue = Y.dcforms.isOnServer;
                Y.dcforms.isOnServer = false;

                const actual = Y.doccirrus.forms.labdata.expandSingleTestResult( this.fixtures.l_extra, this.fixtures.testResult );
                expect( actual ).to.have.property( "labMin" ).that.equals( 0.2 );
                expect( actual ).to.have.property( "labMax" ).that.equals( 0.6 );

                Y.dcforms.isOnServer = originalValue;
            } );
        } );
    } );

} );
