/**
 * User: florian
 * Date: 12.01.21  14:04
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global Y, it, describe, expect, context, before, after, should */

const
    user = Y.doccirrus.auth.getSUForLocal(),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    util = require( 'util' ),
    fs = require( 'fs' ).promises,
    sinon = require( 'sinon' ),
    path = require('path'),
    cleanDb = util.promisify( mochaUtils.cleanDB );

describe( 'kimaccounts-api', function() {
    context( 'given KIM account configuration and a database collection. #KAP-92', function() { // given
        describe( '#updateKimAccountConfiguration()', function() { // when
            context( 'when sending kimaccounts to store it in collection', function() { // when
                before( function() { // then
                    this.args = {
                        user: user,
                        model: 'kimaccount',
                        originalParams: {
                            kimAccountRowsData: [
                                {
                                    _id: '5ffda600fd2bb471415b0b5c',
                                    loginStatus: 'denied',
                                    kimUsername: 'Florian',
                                    kimPassword: '234456',
                                    authorisedUsers: [
                                        '5fa501c5c484c41ead0142ea'
                                    ],
                                    tiContext: 'Mandant1#inSuite#Workplace1',
                                    serverAddressPOP: 'kops:10995',
                                    serverAddressSMTP: 'kops:10465'
                                }
                            ]
                        }
                    };
                } );
                it( 'then it should return added successfully', async function() {
                    this.result = await Y.doccirrus.api.kimaccount.updateKimAccountConfiguration( this.args );
                    expect(this.result).to.be.an('array');
                    expect(this.result).to.have.length(1);
                    expect(this.result[0]._doc.kimUsername).to.be.eql('Florian');
                    should.not.exist(this.result[0].errors);
                } );
                after( 'clean the database', async function() {
                    await cleanDb( {user, collections2clean: ['kimaccount']} );
                } );
            } );
            context( 'when sending kimaccounts to update it in collection', function() { // when
                before( function() { // then
                    this.args = {
                        user: user,
                        model: 'kimaccount',
                        originalParams: {
                            kimAccountRowsData: [
                                {
                                    _id: '5ffda600fd2bb471415b0b5c',
                                    loginStatus: 'denied',
                                    kimUsername: 'Florian',
                                    kimPassword: '234456',
                                    serverAddress: 'kops:10110',
                                    authorisedUsers: [
                                        '5fa501c5c484c41ead0142ea'
                                    ],
                                    tiContext: 'Mandant1#inSuite#Workplace1',
                                    serverAddressPOP: 'kops:10995',
                                    serverAddressSMTP: 'kops:10465'
                                }
                            ]
                        }
                    };
                } );
                it( 'then it should return updated successfully', async function() {
                    const passwordChange = '111111';

                    this.result = await Y.doccirrus.api.kimaccount.updateKimAccountConfiguration( this.args );
                    this.args.originalParams.kimAccountRowsData[0].kimPassword = passwordChange;
                    this.result = await Y.doccirrus.api.kimaccount.updateKimAccountConfiguration( this.args );

                    expect(this.result).to.be.an('array');
                    expect(this.result).to.have.length(1);
                    expect(this.result[0]._doc.kimPassword).to.be.eql(passwordChange);
                    should.not.exist(this.result[0].errors);
                } );
                after( 'clean the database', async function() {
                    await cleanDb( {user, collections2clean: ['kimaccount']} );
                } );
            } );
            context( 'when sending kimaccounts to store and to update it in collection', function() { // when
                before( async function() { // then
                    this.args = {
                        user: user,
                        model: 'kimaccount',
                        originalParams: {
                            kimAccountRowsData: [
                                {
                                    _id: '5ffda600fd2bb471415b0b5c',
                                    loginStatus: 'denied',
                                    kimUsername: 'Florian',
                                    kimPassword: '234456',
                                    serverAddress: 'kops:10110',
                                    authorisedUsers: [
                                        '5fa501c5c484c41ead0142ea'
                                    ],
                                    tiContext: 'Mandant1#inSuite#Workplace1',
                                    serverAddressPOP: 'kops:10995',
                                    serverAddressSMTP: 'kops:10465'
                                }
                            ]
                        }
                    };
                    this.secondKimAccount = {
                        _id: '5ffec4ef4ad3d63b91c21962',
                        loginStatus: 'denied',
                        kimUsername: 'Bideny',
                        kimPassword: '213123',
                        authorisedUsers: [
                            '5fa501c5c484c41ead0142ea'
                        ],
                        tiContext: 'Mandant1#inSuite#Workplace1',
                        serverAddressPOP: 'kops:10995',
                        serverAddressSMTP: 'kops:10465'
                    };
                    this.kimAccountWithInvalidTiContext = {
                        _id: '5ffec5844ad3d63b91c21965',
                        loginStatus: 'denied',
                        kimUsername: 'Wednes',
                        kimPassword: '123456',
                        serverAddress: 'kops:10110',
                        authorisedUsers: [
                            '5fa503b4c484c41ead014316'
                        ],
                        tiContext: 'Mandant1#inSuite#Workplace2',
                        serverAddressPOP: 'kops:10995',
                        serverAddressSMTP: 'kops:10465'
                    };
                    await Y.doccirrus.api.kimaccount.updateKimAccountConfiguration( this.args );
                } );
                it( 'then it should should update one create one account.', async function() {
                    const addedAuthUser = '5fa503b4c484c41ead014316';

                    this.args.originalParams.kimAccountRowsData[0].authorisedUsers.push( addedAuthUser );
                    this.args.originalParams.kimAccountRowsData.push( this.secondKimAccount );
                    this.result = await Y.doccirrus.api.kimaccount.updateKimAccountConfiguration( this.args );

                    expect(this.result).to.be.an('array');
                    expect(this.result).to.have.length(2);
                    expect(this.result[0]._doc.authorisedUsers).to.have.length(2);
                    expect(this.result[1].kimUsername).to.be.eql(this.secondKimAccount.kimUsername);
                    should.not.exist(this.result[0].errors);
                    should.not.exist(this.result[1].errors);
                } );
                after( 'clean the database', async function() {
                    await cleanDb( {user, collections2clean: ['kimaccount']} );
                } );
            } );
        } );
        describe( '#getKimAccountConfiguration()', function() {
            context( 'when getting KIM accounts from collection', function() { // when
                before( async function() { // then
                    this.loginStates = {loginAccept: 'success', loginDenied: 'denied', loginError: 'failed'};
                    this.validTiContext = 'Mandant1#inSuite#Workplace1#';
                    this.invaldTiContext = 'Mandant1#inSuite#Workplace2#';
                    this.kimValidLogin = {
                        username: 'praxis.test@kim.local#mail.kim.local#Mandant1#ClientID1#Workplace1#',
                        password: 'geheim'
                    };
                    this.args = {
                        user: user,
                        model: 'kimaccount',
                        originalParams: {
                            kimAccountRowsData: [
                                {
                                    _id: '5ffda600fd2bb471415b0b5c',
                                    loginStatus: 'denied',
                                    kimUsername: this.kimValidLogin.username,
                                    kimPassword: this.kimValidLogin.password,
                                    serverAddress: 'kops:10110',
                                    authorisedUsers: [
                                        '5fa501c5c484c41ead0142ea'
                                    ],
                                    tiContext: this.validTiContext,
                                    serverAddressPOP: 'kops:10995',
                                    serverAddressSMTP: 'kops:10465'
                                },
                                {
                                    _id: '5ffec4ef4ad3d63b91c21962',
                                    loginStatus: 'denied',
                                    kimUsername: 'Bideny',
                                    kimPassword: '213123',
                                    serverAddress: 'kops:10110',
                                    authorisedUsers: [
                                        '5fa501c5c484c41ead0142ea'
                                    ],
                                    tiContext: this.validTiContext,
                                    serverAddressPOP: 'kops:10995',
                                    serverAddressSMTP: 'kops:10465'
                                },
                                {
                                    _id: '5ffec5844ad3d63b91c21965',
                                    loginStatus: 'denied',
                                    kimUsername: 'Wednes',
                                    kimPassword: '123456',
                                    serverAddress: 'kops',
                                    authorisedUsers: [
                                        '5fa503b4c484c41ead014316',
                                        '5fa501c5c484c41ead0142ea'
                                    ],
                                    tiContext: this.invaldTiContext,
                                    serverAddressPOP: 'kops:10995',
                                    serverAddressSMTP: 'kops:10465'
                                }
                            ]
                        }
                    };
                    this.organisationalUnit = [
                        {
                            _id: '5d89c972244a1305f075f9f5',
                            humanId: 'Mandant1',
                            name: 'Test-Mandant1',
                            locations: ['000000000000000000000001']
                        }];

                    this.workstations = [
                        {
                            humanId: 'Workplace1',
                            name: 'Workplace-KoPS-Simulator-Test',
                            tiCardReaders: ['5fabc16d2ea1b526fd22232e']
                        }];

                    this.cardReaders = [
                        {
                            _id: '5fabc16d2ea1b526fd22232e',
                            humanId: 'T1',
                            name: 'Terminal-KoPS-Konnektor-Test',
                            organisationalUnits: ['5d89c972244a1305f075f9f5']
                        }];

                    this.tismcb = [
                        {
                            iccsn: '80276883110000016161',
                            name: 'Test Praxis Valid',
                            organisationalUnits: ['5d89c972244a1305f075f9f5']
                        }];

                    await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'organisationalunit',
                        action: 'mongoInsertMany',
                        data: this.organisationalUnit
                    } );

                    await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'workstation',
                        action: 'mongoInsertMany',
                        data: this.workstations
                    } );

                    await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'ticardreader',
                        action: 'mongoInsertMany',
                        data: this.cardReaders
                    } );

                    await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'tismcb',
                        action: 'mongoInsertMany',
                        data: this.tismcb
                    } );

                    await Y.doccirrus.api.kimaccount.updateKimAccountConfiguration( this.args );
                } );
                it( 'then it should return all entries.', async function() {
                    this.skip(); // skipped until kops runs in dc-inSuite
                    this.args = {user: user};
                    this.result = await Y.doccirrus.api.kimaccount.getKimAccountConfiguration( this.args );

                    expect( this.result ).to.be.an( 'array' );
                    expect( this.result.length ).to.be.eql( 3 );
                } );
                it( 'then it should delete the tiContext from the kimAccount if the context is no longer available.', async function() {
                    this.skip(); // skipped until kops runs in dc-inSuite
                    this.args = {user: user};
                    this.result = await Y.doccirrus.api.kimaccount.getKimAccountConfiguration( this.args );

                    expect( this.result[0].tiContext ).to.be.a( 'string' );
                    expect( this.result[0].tiContext ).to.be.eql( this.validTiContext );

                    expect( this.result[1].tiContext ).to.be.a( 'string' );
                    expect( this.result[1].tiContext ).to.be.eql( this.validTiContext );

                    expect( this.result[2].tiContext ).to.be.a( 'string' );
                    expect( this.result[2].tiContext ).to.be.eql( '' );

                } );
                it( 'then it should return the authentification status from KoPs', async function() {
                    this.skip(); // skipped until kops runs in dc-inSuite
                    this.args = {user: user};
                    this.result = await Y.doccirrus.api.kimaccount.getKimAccountConfiguration( this.args );

                    expect( this.result[0].loginStatus ).to.be.a( 'string' );
                    expect( this.result[0].loginStatus ).to.be.eql( this.loginStates.loginAccept );

                    expect( this.result[1].loginStatus ).to.be.a( 'string' );
                    expect( this.result[1].loginStatus ).to.be.eql( this.loginStates.loginDenied );

                    expect( this.result[2].loginStatus ).to.be.a( 'string' );
                    expect( this.result[2].loginStatus ).to.be.eql( this.loginStates.loginDenied );

                } );
                after( 'clean the database', async function() {
                    await cleanDb( {
                        user,
                        collections2clean: ['kimaccount', 'workstation', 'tismcb', 'organisationalunit', 'ticardreader']
                    } );
                } );
            } );
        } );
        describe( '#receiveEmails(), given pdf-file, KIM account, email information, attachments and tiDirectoryService entry.', function() {
            context( 'when receiving emails from KIM.', function() { // when
                before( async function() { // then
                    this.timeout(5000);
                    this.originalParams = {onlyAuthorisedUsers: false};
                    this.testFile = await fs.readFile(path.join(process.cwd(), 'mojits/TestingMojit/tests/testfile_KIM/TestCase.pdf'));
                    this.kimAccount = [{
                        _id: '60016203ee956037c5e9aae2',
                        kimUsername: 'praxis.test@kim.local',
                        authorisedUsers: ['5f7d7b39b77f8000f3b5ba82'],
                        kimPassword: 'geheim',
                        serverAddressPOP: 'kops:10110',
                        serverAddressSMTP: 'kops:10025',
                        tiContext: 'Mandant1#ClientID1#Workplace1#',
                        loginStatus: ''
                    }];
                    this.tiDirectoryServiceSenderAccount = [
                        {
                            _id: '6012c0fe0d45129d9401386f',
                            mail: ['sarah.mustermann@kim.local', 'praxis.mustermann@kim.local'],
                            localityName: 'Berlin',
                            organization: 'Praxis Dr. Sarah Mustermann'
                        }
                    ];
                    this.tiDirectoryServiceReceiverAccount = [
                        {
                            _id: '6012c0fe0d45129d9401386d',
                            mail: ['praxis.test@kim.local', 'testpraxis@kim.local'],
                            localityName: 'Berlin',
                            organization: 'Testpraxis'
                        }
                    ];
                    const emails = [{
                        attachments: [
                            {
                                type: 'attachment',
                                content: this.testFile,
                                contentType: 'APPLICATION_PDF',
                                partId: '2',
                                release: null,
                                contentDisposition: 'attachment',
                                filename: 'TestCase.pdf',
                                headers: {},
                                size: this.testFile.length
                            }
                        ],
                        headers: {},
                        headerLines: [],
                        text: 'Holla!',
                        textAsHtml: '<p>Holla!<p>',
                        subject: 'Hallo, das ist eine Email.',
                        date: '2021-02-01T11:23:40.000Z',
                        to: {
                            value: [
                                {
                                    address: 'praxis.test@kim.local',
                                    name: ''
                                },
                                {
                                    address: 'testpraxis@kim.local',
                                    name: ''
                                }
                            ]
                        },
                        from: {
                            value: [
                                {
                                    address: 'sarah.mustermann@kim.local',
                                    name: ''
                                }
                            ]
                        },
                        messageId: '<4d29068a-f9d5-ef6b-21fa-bd12b11df712@kim.local>',
                        html: false
                    }];

                    const kimMock = {
                        async isUserLoginValid() {
                            return true;
                        },
                        async buildUserNameForKIMUsageWithContext() {
                          return 'praxis.test@kim.local#kops:10110#Mandant1#ClientID1#Workplace1#';
                        },
                        async receiveEmails() {
                            return emails;
                        },
                        async sendEmail() {
                            return {
                                messageId: emails[0].messageId,
                                userName: 'praxis.test@kim.local'
                            };
                        }
                    };

                    const tiContextMock = {
                        async getConfigurationParameters() {
                            return [
                                {
                                    _id: {
                                        MandantId: 'Mandant1',
                                        WorkplaceId: 'Workplace1',
                                        MandantName: 'Schmerzzentrum Therapeuthische Einheit',
                                        WorkplaceName: 'Workplace-KoPS-Simulator-Test'
                                    },
                                    CtIds: ['T1'],
                                    profiles: [
                                        {
                                            profileLabel: 'Profil-KoPS-Konnektor-Test',
                                            cardTerminals: ['T1']
                                        }
                                    ],
                                    CtNames: ['Terminal-KoPS-Konnektor-Test'],
                                    context: {
                                        MandantId: 'Mandant1',
                                        ClientSystemId: 'ClientID1',
                                        WorkplaceId: 'Workplace1',
                                        MandantName: 'Schmerzzentrum Therapeuthische Einheit',
                                        WorkplaceName: 'Workplace-KoPS-Simulator-Test'
                                    },
                                    settings: [
                                        {
                                           ldapFQDN: 'http://localhost:10389'
                                        }
                                    ]
                                }
                            ];
                        }
                    };

                    this.stub = sinon.stub( Y.doccirrus.api.ticontext, 'getConfigurationParameters' ).returns(tiContextMock.getConfigurationParameters());
                    this.stub = sinon.stub( Y.doccirrus.dcTi, 'getKim' ).returns(kimMock);

                    await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'kimaccount',
                        action: 'mongoInsertMany',
                        data: this.kimAccount
                    } );

                    await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'tiDirectoryService',
                        action: 'mongoInsertMany',
                        data: this.tiDirectoryServiceSenderAccount
                    } );

                    const mockedTreatment = ['603621fc1acbe84c7e252007'];

                    const edocletterMock = {
                        async updateActivityStatus() {
                            const activityUpdate = {
                                activity: [{
                                    casefolderId: '5fa51c2181b8cc34cad1cec0'
                                }],
                                treatmentCreation: {
                                    code: 0,
                                    createdTreatment: mockedTreatment
                                },
                                activityUpdate: {
                                    n: 1,
                                    nModiefied: 1,
                                    ok: 1
                                }
                            };
                            return activityUpdate;
                        }
                    };

                    this.stub = sinon.stub( Y.doccirrus.api.edocletter, 'updateActivityStatus' ).returns(edocletterMock.updateActivityStatus());

                    this.emails = emails;
                } );

                it( 'then it should return objectsIds form patienttransfer with the written email objects.', async function() {
                    this.result = await Y.doccirrus.api.kimaccount.receiveEmails( {
                        user: user,
                        originalParams: this.originalParams
                    } );

                    this.patientTransfer = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patienttransfer',
                        action: 'get',
                        query: {
                            _id: this.result[0]
                        }
                    } );

                    expect(this.result).to.be.an('Array');
                    expect(this.result.length).to.be.eql(1);
                    expect(this.patientTransfer[0]._id.toString()).to.be.eql(this.result[0][0][0]);
                    expect(this.patientTransfer.kimAccountUsername).to.be.eql(this.kimAccount.username);
                    expect(this.patientTransfer[0].messageID).to.be.eql(this.emails[0].messageId);
                } );

                it( 'then it should save the attached media and link it to the patienttransfer item.', async function() {
                    this.patientTransfer = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patienttransfer',
                        action: 'get',
                        query: {
                            _id: this.result[0]
                        }
                    } );

                    this.media = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'media',
                        query: {
                            _id: this.patientTransfer[0].attachedMedia[0].mediaId
                        }
                    } );

                    this.files = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'fs.files',
                        query: {
                            filename: this.patientTransfer[0].attachedMedia[0].mediaId
                        }
                    } );

                    this.buffer = await new Promise(( resolve, reject ) => {
                        Y.doccirrus.gridfs.get( user, this.files[0]._id, function( err, result ) {
                            if( err ) {
                                reject( err );
                                return;
                            }
                            resolve( result );
                        } );
                    } );

                    expect(this.buffer.data).to.be.eql(this.emails[0].attachments[0].content);
                    expect(this.buffer.data.length).to.be.eql(this.emails[0].attachments[0].size);
                    expect(this.media[0].ownerCollection).to.be.eql('patienttransfer');
                    expect(this.media[0].mime).to.be.eql(this.emails[0].attachments[0].contentType);
                    expect(this.media[0].name).to.be.eql(this.emails[0].attachments[0].filename);
                } );

                it( 'then it should return patienttransfer ids with send information', async function() {

                    this.result = await Y.doccirrus.api.kimaccount.sendEmail( {
                        user: user,
                        originalParams: {
                            receiver: this.tiDirectoryServiceReceiverAccount,
                            sender: {
                                username: this.kimAccount[0].kimUsername
                            },
                            body: this.emails[0].text,
                            subject: this.emails[0].subject,
                            attachments: [
                                {
                                    mediaId: this.media[0]._id.toString(),
                                    caption: 'TestCase.pdf',
                                    contentType: 'application/pdf'
                                }
                            ]
                        }
                    } );

                    this.patientTransfer = await Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'patienttransfer',
                        action: 'get',
                        query: {
                            _id: {
                                $in: this.result.patientTransferIds
                            }
                        }
                    } );

                    this.resultReceiver = [];

                    for (let receiver of this.emails[0].to.value) {
                        this.resultReceiver.push(receiver.address);
                    }

                    expect(this.result).to.be.an('object');
                    expect(this.result.patientTransferIds.length).to.be.eql(2);
                    expect(this.patientTransfer[0].kimRecipient[0].mail[0]).to.be.eql(this.resultReceiver[0]);
                    expect(this.patientTransfer[1].kimRecipient[0].mail[0]).to.be.eql(this.resultReceiver[1]);
                    expect(this.patientTransfer[0].status).to.be.eql('SENT');
                    expect(this.patientTransfer[1].status).to.be.eql('SENT');
                } );
                it( 'then it should return patienttransfer ids with send information and change state of activity and add a treatment to the casefolder', async function() {
                    this.activityIds = ['603621981acbe84c7e251fa2'];
                    this.emails[0].subject = 'Arztbrief';

                    this.result = await Y.doccirrus.api.kimaccount.sendEmail( {
                        user: user,
                        originalParams: {
                            receiver: this.tiDirectoryServiceReceiverAccount,
                            sender: {
                                username: this.kimAccount[0].kimUsername
                            },
                            body: this.emails[0].text,
                            subject: this.emails[0].subject,
                            attachments: [
                                {
                                    mediaId: this.media[0]._id.toString(),
                                    caption: 'TestCase.pdf',
                                    contentType: 'application/pdf'
                                }
                            ],
                            activityIds: this.activityIds
                        }
                    } );
                    expect(this.result).to.be.an('object');

                    expect(this.result.patientTransferIds).to.be.an('Array');
                    expect(this.result.patientTransferIds.length).to.be.eql(2);

                    expect(this.result.activityIds).to.be.an('Array');
                    expect(this.result.activityIds.length).to.be.eql(1);
                    expect(this.result.activityIds).to.be.eql(this.activityIds);

                    expect(this.result.activityUpdate).to.be.an('object');

                    expect(this.result.activityUpdate.activityUpdate.n).to.be.eql(1);
                    expect(this.result.activityUpdate.activityUpdate.nModiefied).to.be.eql(1);
                    expect(this.result.activityUpdate.activityUpdate.ok).to.be.eql(1);

                    expect(this.result.activityUpdate.treatmentCreation.code).to.be.eql(0);

                } );
                after( 'clean the database', async function() {
                    await cleanDb( {
                        user,
                        collections2clean: ['patienttransfer', 'kimaccount', 'media', 'fs.files', 'fs.chunks', 'tiDirectoryService']
                    } );
                } );
            } );
        } );
    } );
} );