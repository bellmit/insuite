/**
 * User: florian
 * Date: 05.02.21  13:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global Y, it, describe, expect, context, before, after */

const
    user = Y.doccirrus.auth.getSUForLocal(),
    mochaUtils = require( '../../server/mochaUtils' )( Y ),
    util = require( 'util' ),
    sinon = require( 'sinon' ),
    cleanDb = util.promisify( mochaUtils.cleanDB );

describe( 'tiDirectoryService-api', function() {
    context( 'given LDAP connection data and tiSettings. #KAP-87', function() { // given
        describe( '#retrieveDataFromVZD()', function() { // when
            context( 'when collect data from VZD via LDAP', function() { // when
                before( async function() { // then
                    this.timeout(20000);
                    this.expectedResultKeys = [
                        '_id', 'controls', 'objectClass', 'mail', 'dn', 'givenName', 'sn', 'postalCode', 'streetAddress', 'localityName',
                        'cn', 'displayName', 'title', 'stateOrProvinceName', 'organization', 'otherName', 'personalEntry',
                        'uid', 'published', 'specialisation'
                    ];
                    const tiDirectoryServiceResult = [
                        {
                            dn: 'uid=1-hba-kim-valid,dc=data,dc=vzd',
                            controls: [],
                            objectClass: [
                                'telematikMember',
                                'inetOrgPerson',
                                'organizationalPerson',
                                'person',
                                'top'
                            ],
                            givenName: 'Peter',
                            sn: 'Mustermann',
                            postalCode: '10117',
                            streetAddress: 'Albrechtstr. 11',
                            localityName: 'Berlin',
                            cn: 'Dr. Peter Mustermann',
                            displayName: 'Mustermann, Peter',
                            title: 'Dr. med',
                            stateOrProvinceName: 'Berlin',
                            organization: 'Praxis Dr. Peter Mustermann',
                            otherName: '',
                            personalEntry: 'FALSE',
                            uid: '1-hba-kim-valid',
                            mail: 'dr.peter.mustermann@kim.local',
                            specialisation: 'Arztpraxis'
                        },
                        {
                            dn: 'uid=1-smcb-kim-fehler,dc=data,dc=vzd',
                            controls: [],
                            objectClass: [
                                'telematikMember',
                                'inetOrgPerson',
                                'organizationalPerson',
                                'person',
                                'top'
                            ],
                            givenName: 'Gerhard',
                            sn: 'Meier',
                            postalCode: '81545',
                            streetAddress: 'Wettersteinplatz 5',
                            localityName: 'München',
                            cn: 'Praxis Dr. Gerhard Meier',
                            displayName: 'Praxis Dr. Meier',
                            title: 'Dr. med',
                            stateOrProvinceName: 'Bayern',
                            organization: 'Praxis Dr. Gerhard Meier',
                            otherName: '',
                            personalEntry: 'FALSE',
                            uid: '1-smcb-kim-fehler',
                            mail: 'gerhard.meier@kim.local',
                            specialisation: 'Arztpraxis'
                        }
                    ];
                    const additionalEntry = {
                        dn: 'uid=1-smcb-kim-test-valid,dc=data,dc=vzd',
                        controls: [],
                        objectClass: [
                            'telematikMember',
                            'inetOrgPerson',
                            'organizationalPerson',
                            'person',
                            'top'
                        ],
                        givenName: '',
                        sn: 'Testpraxis',
                        postalCode: '10117',
                        streetAddress: 'Friedrichstr. 136',
                        localityName: 'Berlin',
                        cn: '',
                        displayName: 'Testpraxis',
                        title: '',
                        stateOrProvinceName: '',
                        organization: 'Testpraxis',
                        otherName: '',
                        personalEntry: 'FALSE',
                        uid: '1-smcb-kim-fehler',
                        mail: [
                            'praxis.test@kim.local',
                            'testpraxis@kim.local'
                        ],
                        specialisation: 'Allgemeinmedizin'
                    };

                    this.kimMock = {
                        collectVZDContacts: async function( server, pagingSize, attributes, filter, callback ) {
                            return await callback( tiDirectoryServiceResult );
                        }
                    };

                    this.kimMockAddNewSet = {
                        collectVZDContacts: async function( server, pagingSize, attributes, filter, callback ) {
                            return await callback( [additionalEntry] );
                        }
                    };

                    const tiSettings = {
                        ...Y.doccirrus.schemas.tisettings.getDefaultData(),
                        ldapFQDN: 'http://localhost:10389'
                    };

                    const cleanedEntries = Y.doccirrus.filters.cleanDbObject( tiSettings );

                    await Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'put',
                        model: 'tisettings',
                        data: cleanedEntries,
                        fields: Object.keys(cleanedEntries),
                        query: {_id: cleanedEntries._id}
                    } );
                } );
                it( 'then it should save 2 entries in db collection with expected members.', async function() {
                    sinon.restore();
                    this.stub = sinon.stub( Y.doccirrus.dcTi, 'getKim' ).returns(this.kimMock);

                    this.result = await Y.doccirrus.api.tiDirectoryService.retrieveDataFromVZD({user});
                    this.dbResult = await Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'tiDirectoryService',
                        query: {}
                    } );

                    expect(Object.keys(this.dbResult[0])).to.have.members(this.expectedResultKeys);
                    expect(this.dbResult).to.have.length.of(2);
                    expect(this.dbResult[0].dn).to.be.eql('uid=1-hba-kim-valid,dc=data,dc=vzd');
                    expect(this.dbResult[1].dn).to.be.eql('uid=1-smcb-kim-fehler,dc=data,dc=vzd');
                } );
                it( 'then it should delte the old entries and save the new one.', async function() {
                    sinon.restore();
                    this.stub = sinon.stub( Y.doccirrus.dcTi, 'getKim' ).returns(this.kimMockAddNewSet);

                    this.dbResultBefore = await Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'tiDirectoryService',
                        query: {}
                    } );

                    expect(this.dbResultBefore[0].published).to.be.eql(true);
                    expect(this.dbResultBefore[1].published).to.be.eql(true);

                    this.result = await Y.doccirrus.api.tiDirectoryService.retrieveDataFromVZD({user});
                    this.dbResult = await Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'tiDirectoryService',
                        query: {}
                    } );

                    expect(Object.keys(this.dbResult[0])).to.have.members(this.expectedResultKeys);
                    expect(this.dbResult).to.have.length.of(1);
                    expect(this.dbResultBefore[0].published).to.be.eql(true);
                    expect(this.dbResult[0].dn).to.be.eql('uid=1-smcb-kim-test-valid,dc=data,dc=vzd');

                } );
                after( 'clean the database', async function() {
                    sinon.restore();
                    await cleanDb( {
                        user,
                        collections2clean: ['tiDirectoryService', 'tisettings']
                    } );
                } );
            } );
        } );
    } );
} );