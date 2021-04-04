/**
 * User: pi
 * Date: 04/05/17  09:00
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */
/*global Y, should, describe, it*/

const user = Y.doccirrus.auth.getSUForLocal();

describe( 'General tests', function() {
    describe( '1. promise/callback mongodb.runDb test', function() {
        it( ' uses callback for success feedback', function( done ) {
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'tag',
                action: 'post',
                data: {
                    skipcheck_: true,
                    title: 'test_tag',
                    type: 'SUBTYPE'
                }
            }, function( err, result ) {
                should.not.exist( err );
                should.exist( result );
                done();
            } );
        } );
        it( ' uses callback for error feedback', function( done ) {
            Y.doccirrus.mongodb.runDb( {
                user,
                model: 'tag',
                action: 'post',
                data: {
                    skipcheck_: true,
                    title: 'test_tag',
                    type: 'SUBTYPE112312312321'
                }
            }, function( err, result ) {
                should.exist( err );
                should.not.exist( result );
                done();
            } );
        } );
        it( ' uses promise for success feedback', function() {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'tag',
                action: 'post',
                data: {
                    skipcheck_: true,
                    title: 'test_tag',
                    type: 'SUBTYPE'
                }
            } )
                .then( result => {
                    should.exist( result );
                } );
        } );
        it( ' uses promise for error feedback', function() {
            return Y.doccirrus.mongodb.runDb( {
                user,
                model: 'tag',
                action: 'post',
                data: {
                    skipcheck_: true,
                    title: 'test_tag',
                    type: 'SUBTYPE112312312321'
                }
            } )
                .catch( err => {
                    should.exist( err );
                } );
        } );
    } );
    describe( '2. Test dcauth functionality', function() {
        const
            identity = {
                _id: "554cab460d94b2c90bbb4731",
                username: "Monica",
                firstname: "Monica",
                lastname: "Geller",
                pwResetToken: "",
                status: "ACTIVE",
                specifiedBy: "554cab460d94b2c90bbb472f",
                memberOf: [
                    {
                        group: "ADMIN"
                    },
                    {
                        group: "REDUCED_USER"
                    }
                ],
                locations: [
                    {
                        _id: "54cb53d272e410760d7896bf",
                        locname: "test"
                    },
                    {
                        _id: "5710e933a2af143309017827",
                        locname: "Olalla"
                    }
                ],
                roles: ['mochaTest']
            };
        it( 'Tests buildUserByIdentity without base object (user)', function() {
            const
                testUser = Y.doccirrus.auth.buildUserByIdentity( {
                    identity: identity,
                    tenantId: 1221
                } );
            testUser.should.deep.equal( {
                id: 'Monica',
                U: 'Monica Geller',
                tenantId: 1221,
                identityId: '554cab460d94b2c90bbb4731',
                specifiedBy: '554cab460d94b2c90bbb472f',
                groups: [{group: 'ADMIN'}, {group: 'REDUCED_USER'}],
                roles: ['mochaTest'],
                locations:
                    [
                        {_id: '54cb53d272e410760d7896bf', locname: 'test'},
                        {_id: '5710e933a2af143309017827', locname: 'Olalla'}]
            } );
        } );
        it( 'Tests buildUserByIdentity with base object', function() {
            const
                baseUser = {someSpecialField: 'test'};
            Y.doccirrus.auth.buildUserByIdentity( {
                identity: identity,
                tenantId: 1221,
                user: baseUser
            } );
            baseUser.should.deep.equal( {
                id: 'Monica',
                someSpecialField: 'test',
                U: 'Monica Geller',
                tenantId: 1221,
                identityId: '554cab460d94b2c90bbb4731',
                specifiedBy: '554cab460d94b2c90bbb472f',
                groups: [{group: 'ADMIN'}, {group: 'REDUCED_USER'}],
                roles: ['mochaTest'],
                locations:
                    [
                        {_id: '54cb53d272e410760d7896bf', locname: 'test'},
                        {_id: '5710e933a2af143309017827', locname: 'Olalla'}]
            } );
        } );
    } );
} );



