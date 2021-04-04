/**
 * User: dcdev
 * Date: 3/18/20  1:45 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global Y, before, after, it, describe, should, expect */
const
    // {formatPromiseResult} = require( 'dc-core' ).utils,
    util = require( 'util' ),
    mongoose = require( 'mongoose' ),
    fs = require( 'fs' ),
    _ = require( 'lodash' ),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    cleanDb = util.promisify( mochaUtils.cleanDB ),
    user = Y.doccirrus.auth.getSUForLocal();

const putInvoiceNo = ( invoiceId, invoiceNo ) => {
    return Y.doccirrus.mongodb.runDb( {
        user,
        model: 'activity',
        action: 'put',
        query: {
            _id: invoiceId
        },
        data: Y.doccirrus.filters.cleanDbObject( {
            invoiceNo
        } ),
        fields: ['invoiceNo']
    } );
};

describe( 'flow_transformers', function() {
    let countryMode;

    before( async function() {
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
    } );

    after( async function() {
        await cleanDb( {
            user
        } );
        Y.config.doccirrus.Env.countryMode = countryMode || ['D'];
    } );

    describe( "MEDIPORT_RES", function() {
        before( async function() {
            this.testData = JSON.parse( fs.readFileSync( `${__dirname}/../mediportXmlAnswers/testData.json`, 'utf8' ) );
            this.mediportResTransformer = util.promisify( Y.doccirrus.api.flow_transformers.MEDIPORT_RES );
            this.locationId = new mongoose.Types.ObjectId();
            this.employeeId = new mongoose.Types.ObjectId();
            this.patientId = new mongoose.Types.ObjectId();
            this.caseFolderId = new mongoose.Types.ObjectId();
            this.invoiceId = new mongoose.Types.ObjectId();
            this.invoiceRefId = new mongoose.Types.ObjectId();
            this.INVOICE = {
                ...this.testData.INVOICE,
                patientId: this.patientId.toString(),
                caseFolderId: this.caseFolderId.toString(),
                locationId: this.locationId.toString(),
                employeeId: this.employeeId.toString()
            };
            this.INVOICEREF = {
                ...this.testData.INVOICEREF,
                patientId: this.patientId.toString(),
                caseFolderId: this.caseFolderId.toString(),
                locationId: this.locationId.toString(),
                employeeId: this.employeeId.toString()
            };
            this.xml = fs.readFileSync( `${__dirname}/../mediportXmlAnswers/acceptedResponse.xml` );
            this.config = {
                transformer: this.testData.transformer,
                input: {
                    type: "Buffer",
                    data: this.xml
                },
                overwrite: {
                    "ip": null
                },
                title: "Mediport Receive"
            };

            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'location',
                action: 'post',
                data: {
                    ...mochaUtils.getLocationData( {
                        _id: this.locationId,
                        countryMode: 'CH',
                        countryCode: 'CH',
                        zip: 1210,
                        cantonCode: '3',
                        glnNumber: '7601001304987'
                    } ),
                    skipcheck_: true
                }
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'employee',
                action: 'post',
                data: {
                    ...mochaUtils.getEmployeeData( {_id: this.employeeId, countryMode: 'CH'} ),
                    skipcheck_: true
                }
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'patient',
                action: 'post',
                data: {
                    ...mochaUtils.getPatientData( {
                        _id: this.patientId,
                        countryMode: 'CH',
                        socialSecurityNo: '7561234567897'
                    } ),
                    skipcheck_: true
                }
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'casefolder',
                action: 'post',
                data: {
                    ...mochaUtils.getCaseFolderData( {
                        _id: this.caseFolderId,
                        patientId: this.patientId.toString(),
                        type: 'PRIVATE_CH'
                    } ),
                    skipcheck_: true
                }
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'post',
                data: {
                    _id: this.invoiceId,
                    ...this.INVOICE,
                    skipcheck_: true
                }
            } );
            await Y.doccirrus.mongodb.runDb( {
                user,
                model: 'activity',
                action: 'post',
                data: {
                    _id: this.invoiceRefId,
                    ...this.INVOICEREF,
                    skipcheck_: true
                }
            } );
        } );
        after( async function() {

        } );

        describe( 'Accept response', async function() {
            before( async function() {
                this.communication = {
                    ...this.testData.acceptedCommunication,
                    locationId: this.locationId,
                    employeeId: this.employeeId.toString(),
                    caseFolderId: this.caseFolderId.toString()
                };
            } );
            it( 'should return COMMUNICATION when INVOICE exists', async function() {
                const res = await this.mediportResTransformer( this.config, user );
                expect( res.data.communication ).to.deep.equalInAnyOrder( this.communication );
            } );
            it( 'should create flowlog when INVOICE doesn\'t exist', async function() {
                await putInvoiceNo( this.invoiceId, 'Main_1702946' );
                await this.mediportResTransformer( this.config, user );
                const res = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'flowlog',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {
                            _id: -1
                        }
                    }
                } );
                const flowlog = res[0];
                should.exist( flowlog.fileDownloadUrl );
                expect( _.omit( flowlog, ['_id', 'fileDownloadUrl', 'latestOccurrence', 'timesOccurred'] ) ).to.deep.equalInAnyOrder( this.testData.acceptedFlowlog );

                //give Invoice it's invoceNo back
                await putInvoiceNo( this.invoiceId, 'Main_1702943' );
            } );
        } );
        describe( 'Pending response', async function() {
            before( async function() {
                this.xml = fs.readFileSync( `${__dirname}/../mediportXmlAnswers/pendingResponse.xml` );
                this.config = {
                    transformer: this.testData.transformer,
                    input: {
                        type: "Buffer",
                        data: this.xml
                    },
                    overwrite: {
                        "ip": null
                    },
                    title: "Mediport Receive"
                };
                this.communication = {
                    ...this.testData.pendingCommunication,
                    locationId: this.locationId,
                    employeeId: this.employeeId.toString(),
                    caseFolderId: this.caseFolderId.toString()
                };
            } );
            it( 'should return COMMUNICATION when INVOICEREF exists', async function() {
                const res = await this.mediportResTransformer( this.config, user );
                expect( res.data.communication ).to.deep.equalInAnyOrder( this.communication );
            } );
            it( 'should create flowlog when INVOICEREF doesn\'t exist', async function() {
                await putInvoiceNo( this.invoiceRefId, 'Main_1702945' );
                await this.mediportResTransformer( this.config, user );

                const res = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'flowlog',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {
                            _id: -1
                        }
                    }
                } );
                const flowlog = res[0];
                should.exist( flowlog.fileDownloadUrl );
                expect( _.omit( flowlog, ['_id', 'fileDownloadUrl', 'latestOccurrence', 'timesOccurred'] ) ).to.deep.equalInAnyOrder( this.testData.pendingFlowlog );

                //give INVOICEREF it's invoceNo back
                await putInvoiceNo( this.invoiceRefId, 'Main_1702944' );
            } );
        } );
        describe( 'Rejected response', async function() {
            before( async function() {
                this.xml = fs.readFileSync( `${__dirname}/../mediportXmlAnswers/rejectedResponse.xml` );
                this.config = {
                    transformer: this.testData.transformer,
                    input: {
                        type: "Buffer",
                        data: this.xml
                    },
                    overwrite: {
                        "ip": null
                    },
                    title: "Mediport Receive"
                };
                this.communication = {
                    ...this.testData.rejectedCommunication,
                    locationId: this.locationId,
                    employeeId: this.employeeId.toString(),
                    caseFolderId: this.caseFolderId.toString()
                };
            } );
            it( 'should return COMMUNICATION when INVOICEREF exists', async function() {
                const res = await this.mediportResTransformer( this.config, user );
                expect( res.data.communication ).to.deep.equalInAnyOrder( this.communication );
            } );
            it( 'should create flowlog when INVOICEREF doesn\'t exist', async function() {
                await putInvoiceNo( this.invoiceRefId, 'Main_1702999' );
                await this.mediportResTransformer( this.config, user );

                const res = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'flowlog',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {
                            _id: -1
                        }
                    }
                } );
                const flowlog = res[0];
                should.exist( flowlog.fileDownloadUrl );
                expect( _.omit( flowlog, ['_id', 'fileDownloadUrl', 'latestOccurrence', 'timesOccurred'] ) ).to.deep.equalInAnyOrder( this.testData.rejectedFlowlog );
            } );
        } );
        describe( 'Xml with missing data', function() {
            before( async function() {
                this.xml = fs.readFileSync( `${__dirname}/../mediportXmlAnswers/notFullXml.xml` );
                this.config = {
                    transformer: this.testData.transformer,
                    input: {
                        type: "Buffer",
                        data: this.xml
                    },
                    overwrite: {
                        "ip": null
                    },
                    title: "Mediport Receive"
                };
                this.communication = {
                    ...this.testData.notFullCommunication,
                    locationId: this.locationId,
                    employeeId: this.employeeId.toString(),
                    caseFolderId: this.caseFolderId.toString()
                };
            } );
            it( 'should create Communication with missing explanation, missing some patient, insurance and employee data', async function() {
                const res = await this.mediportResTransformer( this.config, user );
                expect( res.data.communication ).to.deep.equalInAnyOrder( this.communication );
            } );
        } );
        describe( 'Xml with no data', function() {
            before( async function() {
                this.xml = fs.readFileSync( `${__dirname}/../mediportXmlAnswers/noDataXml.xml` );
                this.config = {
                    transformer: this.testData.transformer,
                    input: {
                        type: "Buffer",
                        data: this.xml
                    },
                    overwrite: {
                        "ip": null
                    },
                    title: "Mediport Receive"
                };
            } );
            it( 'should create Communication with missing explanation, missing some patient, insurance and employee data', async function() {
                await this.mediportResTransformer( this.config, user );

                const res = await Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'flowlog',
                    action: 'get',
                    query: {},
                    options: {
                        sort: {
                            _id: -1
                        }
                    }
                } );
                const flowlog = res[0];
                should.exist( flowlog.fileDownloadUrl );
                expect( _.omit( flowlog, ['_id', 'fileDownloadUrl', 'latestOccurrence', 'timesOccurred'] ) ).to.deep.equalInAnyOrder( this.testData.noDataFlowlog );
            } );
        } );
    } );
} );