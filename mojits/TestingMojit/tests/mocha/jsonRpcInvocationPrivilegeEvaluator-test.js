const sinon = require( 'sinon' );
/* global Y, afterEach, beforeEach, describe, expect, it */
describe( 'jsonRpcInvocationPrivilegeEvaluator', () => {
    describe( '#isAllowed()', () => {
        describe( 'given an access control list with non existing resource', () => {
            // Building fake JsonRpc structure
            const acl = [
                {namespace: 'testname', method: 'testAdminMethod', access: 'ADMIN'},
                {namespace: 'testname', method: 'testUserMethod', access: 'USER'},
                {namespace: 'testname', method: 'testNoUserMethod'}
            ];

            const action = 'testAdminMethod';
            beforeEach( () => {
                this.stub = sinon.stub( Y.doccirrus.jsonrpc.reflection, 'getDescription' );
                this.stub.callsFake( () => acl );
                this.resource = 'testname';
                this.candidate = new Y.doccirrus.jsonrpc.privilige.JsonRpcInvocationPrivilegeEvaluator(Y.doccirrus.jsonrpc.reflection);
                // test user with group
                this.principal = {
                    id: 'foo',
                    groups: ['ADMIN']
                };
            } );
            it( 'should allow access', () => {
                expect( this.candidate.isAllowed( this.principal, this.resource, action ) ).to.be.equal( true );
            } );
            it( 'should deny access for admin route', () => {
                this.principal.groups = ['USER'];
                expect( this.candidate.isAllowed( this.principal, this.resource, action ) ).to.be.equal( false );
            } );
            it( 'should allow access for support role to admin route', () => {
                this.principal.groups = ['SUPPORT'];
                expect( this.candidate.isAllowed( this.principal, this.resource, action ) ).to.be.equal( true );
            } );
            it( 'should not allow a user with no fitting role', () => {
                this.principal.groups = ['NotAUser'];
                expect( this.candidate.isAllowed( this.principal, this.resource, action ) ).to.be.equal( false );
            } );
            it( 'should only protect routes listed in jsonRpc', () => {
                this.resource = 'testname1';
                expect( this.candidate.isAllowed( this.principal, this.resource, action ) ).to.be.equal( true );
            } );
            afterEach( () => {
                this.stub.restore();
            } );
        } );
    } );
} );