'use strict';

const {formatPromiseResult} = require( 'dc-core' ).utils;
let Y;

/**
 * Simple rate limiter middleware
 *
 * 1. Receives a unique identity of each request or uses the IP address
 * 2. Obtains the current request count (quota) from Redis cache
 * 3. Handles response for surpassing the requestsPerExpiry allowed
 */
class RateLimiterMiddleware {

    /**
     * Create a new instance
     *
     * @param {RateLimiterCache} cache Cache to obtain quotas from
     * @param {Number} expirySeconds Time window for a limited number of requests in seconds
     * @param {Number} requestsPerExpiry Number of allowed request within a single time window
     */
    constructor( cache, expirySeconds = 10, requestsPerExpiry = 1000 ) {
        this.cache = cache;
        this.expirySeconds = expirySeconds;
        this.requestsPerExpiry = requestsPerExpiry;
    }

    /**
     * Handle a request
     *
     * @param {Object} req Express request object
     * @param {Object} res Express response object
     * @param {Function} next
     * @return {*}
     */
    async handle( req, res, next ) {
        Y.log( 'Requesting rate limiter quota', 'debug', this.constructor.name );

        const discriminator = this.resolveIpAddress( req );
        let [err, reqCount] = await formatPromiseResult(
            this.cache.getQuota( {
                discriminator,
                expirySeconds: this.expirySeconds
            } )
        );

        if( err ) {
            Y.log( `Something went wrong while requesting rate limiter quote: ${err}`, 'error', this.constructor.name );
            let error = new Y.doccirrus.commonerrors.DCError( 500, {message: `Error while getting quote from rate limiter: ${err}`} );
            return next( error );
        }

        if( reqCount > this.requestsPerExpiry ) {
            Y.log( `Quota of ${this.requestsPerExpiry} per ${this.expirySeconds}sec exceeded`, 'debug', this.constructor.name );

            return res
                .status( 403 )
                .send( `Quota of ${this.requestsPerExpiry} per ${this.expirySeconds} sec exceeded` );
        }

        Y.log( `Request number ${reqCount} is within quota of ${this.requestsPerExpiry}req/s`, 'debug', this.constructor.name );

        return next();
    }

    /**
     * @private
     * @param {Object} req Express request object
     * @return {*}
     */
    resolveIpAddress( req ) {
        return (
            req.headers &&
            ( req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] ) ||
            req.connection.remoteAddress
        );
    }
}

/**
 * Simple rate limiter factory
 */
class RateLimiterFactory {

    /**
     * Setup rate limiter only for the given routes
     *
     * @param {Object} app Express application
     * @param {Object} routes Routes with limit configurations for the limiters
     * @param {RateLimiterCache} cache Cache for the rate limiters
     */
    static setup( app, routes, cache ) {
        for( const [path, configuration] of Object.entries( routes ) ) {
            if( routes.hasOwnProperty( path ) && Number.isInteger( configuration.expirySeconds ) && Number.isInteger( configuration.requestsPerExpiry ) ) {
                const limiter = new RateLimiterMiddleware( cache, configuration.expirySeconds, configuration.requestsPerExpiry );
                app.use( path, limiter.handle.bind( limiter ) );
            }
        }
    }
}

module.exports = function( _Y ) {
    Y = _Y;
    return {
        RateLimiterMiddleware,
        RateLimiterFactory
    };
};
