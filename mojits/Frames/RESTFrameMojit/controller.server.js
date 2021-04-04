/*
 * User: rrrw
 * Date: 01.01.13  09:50
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */


/*global YUI*/

YUI.add( 'RESTFrameMojit', function( Y, NAME ) {
    

    /**
     * @method setTestingModeHeader
     * @private
     *
     * add X-DC-TESTING header to response if system is in testing state either set by
     *  --mocha param or using /2/test/:setIsMocha
     *
     * @param {Object} ac
     *
     * @returns {Object} ac
     */
    function setTestingModeHeader( ac ){
        if( Y.doccirrus.auth.isMocha() ){
            ac.http.addHeader( 'X-DC-TESTING', 'true' );
        }
        return ac;
    }

    Y.namespace( 'mojito.controllers' )[NAME] = {

        dcrest_3: function( ac ) {
            var
                req = ac.http.getRequest(),
                dcauth = require( 'dc-core' ).auth,
                meta = {
                    'http': {
                        headers: {
                            'content-type': 'application/json; charset=utf-8'
                        }
                    }
                };

            /**
             *
             * @param   {Object}            error           http error
             * @param   {Object}            data            the complete response from rest handler
             */
            function respondREST( error, data ) {
                var
                    output = JSON.stringify( data );
                if( error ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, error.code || 500, error.reasonPhrase || 'unknown error' );

                } else {
                    if( !data || !data.data ) {
                        Y.log( 'REST_3 returning EMPTY RESPONSE', 'info', NAME );
                    } else {
                        Y.log( 'REST_3 returning ' + output.substr( 0, 300 ) + ' ...', 'debug', NAME );
                    }
                    setTestingModeHeader( ac );
                    ac.done( output, meta );
                }
            }

            try {
                req.user = Y.doccirrus.auth.getSUForTenant(dcauth.sanitizeTenantId(dcauth.getTenantFromHost(req.headers.host)));
            } catch (e) {
                return respondREST( Y.doccirrus.errors.rest( 401,'Auth Error' ), '' );
            }
            if( !req.user.tenantId ) {
                req.user.tenantId = "0";
            }

            Y.log( 'DC processing REST_3 route.' + JSON.stringify(req.user), 'info', NAME );

            try {
                Y.doccirrus.RESTController_3.handleRequest(
                    {req: req, fromBody: ac.params.getFromBody(), fromUrl: ac.params.getFromUrl()},
                    respondREST);
            } catch(e) {
                Y.log(`dcrest_3: Exception in method: 'Y.doccirrus.RESTController_3.handleRequest'. Error -> ${e.stack || e}`, "error", NAME);
                return respondREST( Y.doccirrus.errors.rest( 400, 'Malformed request' ), '');
            }
        },

        dcrest_2: function( ac ) {
            var
                meta = {
                    'http': {
                        headers: {
                            'content-type': 'application/json; charset=utf-8'
                        }
                    }
                };

            /**
             *
             * @param   {Object}            error           http error
             * @param   {Object}            data            the complete response from rest handler
             */
            function respondREST( error, data ) {
                var
                    output = JSON.stringify( data );
                if( error ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, error.code || 500, error.reasonPhrase || 'unknown error' );

                } else {
                    if( !data || !data.data ) {
                        Y.log( 'REST_2 returning EMPTY RESPONSE', 'info', NAME );
                    } else {
                        Y.log( 'REST_2 returning ' + output.substr( 0, 300 ) + ' ...', 'debug', NAME );
                    }
                    setTestingModeHeader( ac );
                    ac.done( output, meta );
                }
            }

            Y.log( 'DC processing REST_2 route.', 'info', NAME );
            try {
                Y.doccirrus.RESTController_2.handleRequest(
                    {req: ac.http.getRequest(), fromBody: ac.params.getFromBody(), fromUrl: ac.params.getFromUrl()},
                    respondREST);
            } catch(e) {
                Y.log(`dcrest_2: Error on executing method: 'Y.doccirrus.RESTController_2.handleRequest'. Error -> ${e.stack || e}`, "error", NAME);
                return respondREST( Y.doccirrus.errors.rest( 400, 'Malformed request' ), '');
            }
        },

        /**
         * See routes.json
         * @param   {Object}          ac
         * @return {Function | undefined}
         */
        'dcrest_1': function( ac ) {
            var
                req = ac.http.getRequest(),
                url = req.url;

            function respondRESTJsonRpc( err, result ) {
                if( err ) { //  handle HTTP errors, NOT custom business logic errors
                    if( err.name && 'ValidationError' === err.name ) {
                        Y.doccirrus.utils.reportErrorJSON( ac, (err.code || 400), (err.reasonPhrase || err.message || err.toString()) );
                        return;
                    } else if( 500 === err.code ) {
                        Y.doccirrus.utils.reportErrorJSON( ac, 500, (err.reasonPhrase || err.toString()) );
                        return;
                    } else if( 'string' === typeof err ) {
                        Y.doccirrus.utils.reportErrorJSON( ac, 500, err );
                        return;
                    }
                }
                setTestingModeHeader( ac );
                ac.done( {
                    'data': result.data,
                    'status': 'ok'
                }, result.meta );
            }

            function respondREST1( err, result ) {
                if( err ) { //  handle HTTP errors, NOT custom business logic errors
                    if( err.name && 'ValidationError' === err.name ) {
                        Y.doccirrus.utils.reportErrorJSON( ac, (err.code || 400), (err.reasonPhrase || err.message || err.toString()) );
                        return;
                    } else if( 500 === err.code ) {
                        Y.doccirrus.utils.reportErrorJSON( ac, 500, (err.reasonPhrase || err.toString()) );
                        return;
                    } else if( 'string' === typeof err ) {
                        Y.doccirrus.utils.reportErrorJSON( ac, 500, err );
                        return;
                    } else {
                        Y.doccirrus.utils.reportErrorJSON( ac, err.code, err.toString() );
                        return;
                    }
                }
                result.meta.__timing = req.__timing;

                if( req.__timing ) {
                    req.__timing.push( { rest: Date.now() } );
                    Y.log( `${url} TIMING | cors ${Date.now() - req.__timing[0].cors} ms ago `, "info", NAME );
                }
                setTestingModeHeader( ac );
                ac.done( {
                    'data': result.data,
                    'status': 'ok'
                }, result.meta );
            }

            if( 0 === url.indexOf( '/1/jsonrpc' ) ) {
                /**
                 * JSONRPC request
                 */
                try {
                    let data = ac.params.getFromBody();
                    //not applicable if data is array, only apply for single JSONRPC call
                    if ( data && data.params && true === data.params.noTimeout){
                        //clear mojito timeout thet is defined in actionTimeout
                        //check /node_modules/mojito/lib/app/autoload/action-context.common.js
                        clearTimeout(ac._timer);
                        ac._timer = null;
                    }
                    Y.doccirrus.JSONRPCController.handleRequest({
                        params: data,
                        req: ac.http.getRequest(),
                        lang: Y.Intl.lookupBestLang(ac.context.lang, ['en', 'de', 'de-ch']) || 'en'
                    }, respondRESTJsonRpc);
                } catch(e) {
                    Y.log(`dcrest_1: Error on executing method: 'Y.doccirrus.JSONRPCController.handleRequest'. Error -> ${e.stack || e}`, "error", NAME);
                    return respondRESTJsonRpc( Y.doccirrus.errors.rest( 400, 'Malformed request' ), '');
                }
            } else {
                /**
                 * Standard REST request
                 */
                try {
                    Y.doccirrus.RESTController_1.handleRequest({
                        redirect: function restRedirect(url, soft) {
                            Y.doccirrus.utils.redirect(url, ac, soft);
                        },
                        params: ac.params.getFromMerged(),
                        req: ac.http.getRequest(),
                        lang: Y.Intl.lookupBestLang(ac.context.lang, ['en', 'de', 'de-ch']) || 'en'
                    }, respondREST1);
                } catch(e) {
                    Y.log(`dcrest_1: Error on executing method: 'Y.doccirrus.RESTController_1.handleRequest'. Error -> ${e.stack || e}`, "error", NAME);
                    return respondREST1( Y.doccirrus.errors.rest( 400, 'Malformed request' ), '');
                }
            }

        }

    };

}, '0.1.0', {
    requires: [
        'mojito',
        'mojito-params-addon',
        'mojito-http-addon',
        'mojito-meta-addon',
        'mojito-intl-addon',
        'dcerror',
        'dcutils'
    ]
} );
