import proxy from 'http-proxy-middleware';
import core from 'dc-core';
import uuid from 'node-uuid';

/**
 * Pass requests to the FHIR RESTful proxy
 *
 * @see https://gitlab.intra.doc-cirrus.com/dev/dc-fhir-rest
 */
export class FhirProxyMiddleware {

    /**
     * Create the middleware handle
     *
     * @param {YUI} yui
     * @param {Dictionary} settings
     * @return {Function}
     */
    static create( yui, settings ) {
        const logger = yui.log.bind(yui);

        if (!settings.get( 'proxy.enable', true )) {
            logger( 'Proxy is disabled', 'info', FhirProxyMiddleware.name );

            return ( request, response, next ) => next();
        }

        const middleware = new FhirProxyMiddleware(
            logger,
            yui.doccirrus.auth,
            settings
        );

        return middleware.handle.bind( middleware );
    }

    /**
     * Create a new instance
     *
     * @param {Function} logger
     * @param {object} authentication
     * @param {Dictionary} settings
     */
    constructor( logger, authentication, settings ) {
        const target = new URL(`${
            settings.get( 'proxy.upstream.scheme', 'http' )
        }://${
            settings.get( 'proxy.upstream.host', 'localhost' )
        }:${
            settings.get( 'proxy.upstream.port', '8080' )
        }`);

        this.logger = logger;
        this.authentication = authentication;
        this.settings = settings;

        this.options = {
            target: target.href,
            rewrite: {
                [`^${settings.get( 'proxy.path', '/fhir' )}`]: settings.get( 'proxy.upstream.path', '/fhir' )
            },
            onProxyReq: this.onProxyRequestHeader.bind( this ),
            onProxyRes: this.onProxyResponseHeader.bind( this )
        };

        this.logger( `Using upstream ${this.options.target}${Object.values( this.options.rewrite ).pop().replace( /^\/+/, '' )}`, 'info', this.constructor.name );

        if( this.settings.get( 'proxy.authentication', 'basic' ).toLowerCase() === 'none' ) {
            this.logger( `Access protection is disabled`, 'warn', this.constructor.name );
        }
    }

    /**
     * Handle a request
     *
     * We must prevent to implement any part of the FHIR specification
     * since this is the responsibility of the upstream.
     *
     * @param {Object} request Express request object
     * @param {Object} response Express response object
     * @param {Function} next
     * @return {*}
     */
    async handle( request, response, next ) {
        this.logger( 'Receiving request', 'debug', this.constructor.name );

        if ( !this.isAuthorized( request ) ) {
            // we can't proceed without authorization
            // see also http://hl7.org/fhir/http.html
            return response.status( 403 ).send();
        }

        if( !this.getTenant( request ) ) {
            // we can't proceed without the tenant
            // see also http://hl7.org/fhir/http.html
            return response.status( 404 ).send();
        }

        proxy( this.options )( request, response, next );
    }

    /**
     * Get the tenant for the given request
     *
     * @param {Request} request
     * @return {string}
     */
    getTenant( request ) {
        if( core.auth.isPRC() || core.auth.isISD() ) {
            return core.auth.getLocalTenantId();
        }
        return this.authentication.getTenantFromHost( request.realmHost );
    }

    /**
     * Check if the request is authorized to access the FHIR RESTful API
     *
     * @param {Request} request
     * @return {Boolean}
     * @see LAM-1792
     */
    isAuthorized( request ) {
        // This allows us just one policy for one FHIR package. This approach
        // does not scale and is way too simple because the more FHIR packages
        //  we have the more policies we have to provide. Thus such policies
        // should be kept in the FHIR package itself and the validation should
        // be part of the FHIR solution itself including configurable ACLs in the
        // database.
        const authentication = this.settings.get( 'proxy.authentication', 'basic' ).toLowerCase();

        if( authentication === 'none' ) {
            return true;
        }

        if( authentication === 'basic' ) {
            return 'authorization' in request.headers &&
                request.header('authorization').startsWith( 'Basic' ) &&
                request.header( 'x-forwarded-proto' ) === 'https' &&
                request.user &&
                this.authentication.isAdminUser( request.user );
        }

        return false;
    }

    /**
     * Provide additional header for the proxy request
     *
     * @param {Request} proxyRequest
     * @param {Request} request
     * @param {Response} response
     */
    onProxyRequestHeader( proxyRequest, request, response ) {
        // corelation identifier
        proxyRequest.setHeader( 'x-request-id', uuid.v4() );
        // tenant header must always set by this middleware
        proxyRequest.setHeader( 'x-tenant-id', this.getTenant( request ) );
        // forwarded headers should be fetched from downstream
        proxyRequest.setHeader( 'x-forwarded-host', request.header( 'x-forwarded-host' ) || request.header( 'host' ) );
        proxyRequest.setHeader( 'x-forwarded-proto', request.header( 'x-forwarded-proto' ) || request.protocol() );
        proxyRequest.setHeader( 'x-forwarded-port', request.header( 'x-forwarded-port' ) || '80' );
    }

    /**
     * Remove some unwanted header from the proxy response
     *
     * @param {Response} proxyResponse
     * @param {Request} request
     * @param {Response} response
     */
    onProxyResponseHeader( proxyResponse, request, response ) {
        delete proxyResponse.headers['x-powered-by'];
    }
}
