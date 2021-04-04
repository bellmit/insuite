import {formatPromiseResult} from "@dc/ti/lib/utils/promise";

export class AppLicenseSerialsMiddleware {
    /**
     * Create the middleware handle
     *
     * @param {YUI} yui
     * @return {Function}
     */
    static create( yui ) {
        const logger = yui.log.bind( yui );

        const middleware = new AppLicenseSerialsMiddleware(
            logger,
            yui
        );

        return middleware.handle.bind( middleware );
    }

    /**
     * Create a new instance
     *
     * @param {Function} logger
     * @param {YUI} yui
     */
    constructor( logger, yui ) {
        this.logger = logger;
        this.dc = yui.doccirrus;
    }

    /**
     * Handle a request
     *
     * @param {Object} request Express request object
     * @param {Object} response Express response object
     * @return {*}
     */
    async handle( request, response ) {
        this.logger( 'Receiving request', 'debug', this.constructor.name );

        const [error, appAccessSerials] = await formatPromiseResult(
            this.dc.api.appLicenseSerials.get( request )
        );

        if( error ) {
            return response.status( error.code || 403 ).send( error.message || '' );
        }

        if( !appAccessSerials ) {
            return response.status( 400 ).send( [] );
        }

        return response.status( 200 ).send( appAccessSerials );
    }
}