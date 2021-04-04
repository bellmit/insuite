/*global Y, describe, it*/

const
    sinon = require( 'sinon' ),
    {RateLimiterMiddleware} = require( '../../../../middleware/dcrate-limiter' )( Y );

describe( 'RateLimiterMiddleware', () => {

    describe( 'handle', () => {

        it( 'should use request header `cf-connecting-ip` as quota identifier if set', async () => {
            const request = {
                connection: {remoteAddress: 'baz'},
                headers: {'cf-connecting-ip': 'foo', 'x-forwarded-for': 'bar'}
            }, response = {}, next = sinon.stub(), cache = {}, subject = new RateLimiterMiddleware( cache, 1, 1 );

            response.status = sinon.stub().returns( response );
            response.send = sinon.stub().returns( response );
            cache.getQuota = sinon.stub().resolves( 0 );

            await subject.handle( request, response, next );

            cache.getQuota.should.have.been.calledWithMatch( sinon.match( {discriminator: 'foo'} ) );
        } );

        it( 'should use request header `x-forwarded-for` as quota identifier if set and `cf-connecting-ip` is not', async () => {
            const request = {
                connection: {remoteAddress: 'baz'},
                headers: {'x-forwarded-for': 'bar'}
            }, response = {}, next = sinon.stub(), cache = {}, subject = new RateLimiterMiddleware( cache );

            response.status = sinon.stub().returns( response );
            response.send = sinon.stub().returns( response );
            cache.getQuota = sinon.stub().resolves( 0 );

            await subject.handle( request, response, next );

            cache.getQuota.should.have.been.calledWithMatch( sinon.match( {discriminator: 'bar'} ) );
        } );

        it( 'should use remote address as quota identifier if header `cf-connecting-ip` and `x-forwarded-for` not set', async () => {
            const request = {
                connection: {remoteAddress: 'baz'},
                headers: {}
            }, response = {}, next = sinon.stub(), cache = {}, subject = new RateLimiterMiddleware( cache );

            response.status = sinon.stub().returns( response );
            response.send = sinon.stub().returns( response );
            cache.getQuota = sinon.stub().resolves( 0 );

            await subject.handle( request, response, next );

            cache.getQuota.should.have.been.calledWithMatch( sinon.match( {discriminator: 'baz'} ) );
        } );

        it( 'should return internal server error when quota request failed unexpectedly', async () => {
            const request = {
                    connection: {remoteAddress: 'baz'},
                    headers: {}
                }, response = {}, next = sinon.stub().resolves( 'qux' ), cache = {},
                subject = new RateLimiterMiddleware( cache );

            response.status = sinon.stub().returns( response );
            response.send = sinon.stub().returns( response );
            cache.getQuota = sinon.stub().rejects( 'foo' );

            const result = await subject.handle( request, response, next );

            result.should.be.equal( 'qux' );
            next.should.have.been.calledWithMatch( sinon.match( {code: 500} ) );
        } );

        it( 'should return forbidden when quota exceeded', async () => {
            const request = {
                connection: {remoteAddress: 'baz'},
                headers: {}
            }, response = {}, next = sinon.stub(), cache = {}, subject = new RateLimiterMiddleware( cache, 1, 1 );

            response.status = sinon.stub().returns( response );
            response.send = sinon.stub().returns( response );
            cache.getQuota = sinon.stub().resolves( 2 );

            const result = await subject.handle( request, response, next );

            result.should.be.equal( response );
            response.status.should.have.been.calledWith( 403 );
        } );

        it( 'should pass request when quota succeeded', async () => {
            const request = {
                    connection: {remoteAddress: 'baz'},
                    headers: {}
                }, response = {}, next = sinon.stub().resolves( 'qux' ), cache = {},
                subject = new RateLimiterMiddleware( cache, 1, 2 );

            response.status = sinon.stub().returns( response );
            response.send = sinon.stub().returns( response );
            cache.getQuota = sinon.stub().resolves( 2 );

            const result = await subject.handle( request, response, next );

            result.should.be.equal( 'qux' );
            next.should.have.been.calledWithExactly();
        } );
    } );
} );
