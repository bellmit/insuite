/*global YUI */



YUI.add( 'InTouchPublicMojit', function( Y, NAME ) {

    /**
     *
     * @module InTouchPublicMojit
     */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace( 'mojito.controllers' )[NAME] = {

        /**
         *
         * @param {Object}  ac The ActionContext that provides access
         *        to the Mojito API.
         */
        intouch: function( ac ) {
            var
                params = ac.params.getFromMerged(),
                req = ac.http.getRequest(),
                res = ac.http.getResponse(),
                args = {};

            Y.log( 'intouch entered', 'info', NAME );
            // move all this into DC-URL library
            args.user = req.user;
            args.query = params.query;
            args.data = params.data || {};
            args.originalParams = params;
            // split out paging
            // rest.options = getDCParamOptions( params.options || params );

            //setup args for API
            args.httpRequest = req;
            args.httpResponse = res;

            args.callback = function( err, data ) {
                // This is the route for HTML
                // PDF and CSV do not use this callback,
                // and instead short-circuit mojito.
                if( err ) {
                    ac.error( err );
                    return;
                }
                //
                ac.done( {
                    status: 'Mojito is working.',
                    data: data.html
                } );
            };
        }

    };

}, '0.0.1', {requires: [
    'mojito',
    'mojito-config-addon',
    'mojito-data-addon',
    'mojito-models-addon',
    'mojito-params-addon',
    'mojito-http-addon',
    'mojito-intl-addon'
]} );
