/**
 * User: pi
 * Date: 05.12.17  12:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

function mockHttps( Y, user ) {
    const
        originalHttps = Y.doccirrus.https,
        EventEmitter = require( 'events' ).EventEmitter,
        dcauth = require( 'dc-core' ).auth;

    Y.doccirrus.https = {
        mocked: true,
        event: new EventEmitter(),
        original: originalHttps,
        handlerBodyResponse: originalHttps.handlerBodyResponse,
        externalGet( url, options, callback ) {
            this.event.emit( 'onExternalGet', {url, options} );
            callback();
        },
        externalPost( url, data, options, callback ) {
            this.event.emit( 'onExternalPost', {url, data, options} );
            callback();
        },
        externalPut( url, data, options, callback ) {
            this.event.emit( 'onExternalPut', {url, data, options} );
            callback();
        },
        externalDelete( url, data, options, callback ) {
            this.event.emit( 'onExternalDelete', {url, data, options} );
            callback();
        },
        externalApiCall( params, callback ) {
            Y.doccirrus.api[params.model][params.action || 'get']( {
                user,
                data: params.data || {},
                query: params.query || {},
                callback
            } );
        },
        getHttpsConfig( callback ) {
            if( callback ) {
                callback( null, {} );
            } else {
                return Promise.resolve( {} );
            }
        },
        checkAndGetTokenFromDcprc() {
            return Promise.resolve();
        }
    };
    dcauth._getTenantFromHost = dcauth.getTenantFromHost;
    dcauth.getTenantFromHost = function() {
        return 'insuite';
    };

    return {
        originalHttps,
        getTenantFromHost: dcauth._getTenantFromHost
    };
}

module.exports = mockHttps;