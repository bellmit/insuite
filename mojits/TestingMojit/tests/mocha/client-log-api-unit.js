/*global Y, describe, it*/

const
    sinon = require( 'sinon' ),
    user = Y.doccirrus.auth.getSUForLocal();

describe( 'Client Log API', () => {

    it( 'should log POST data including user details', async () => {
        const data = {foo: 'bar', baz: 'qux'};

        sinon.stub( Y, 'log' );

        Y.doccirrus.api.errors.log( {user, data} );

        Y.log.should.have.been.calledWith( `Client error received: ${JSON.stringify( {
            client: data,
            user: {
                id: user.id,
                identityId: user.identityId,
                tenantId: user.tenantId
            }
        } )}`, 'info', 'client-log-api' );

        Y.log.restore();
    } );
} );
