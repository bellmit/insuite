/**
 * User: do
 * Date: 10/03/14  13:39
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'kbvregisterparser', function( Y, NAME ) {
        

        /**
         * Common (Server- and client-side) library for catalog
         * parsing.
         *
         * Simple Xalan-style Streaming parser (event free though) that calls
         * back the user for business logic execution.
         *
         * Has only one method    parse()
         *
         * @class KBVRegisterParser
         */
        var
        // our singleton
            registerParser;

        function KBVRegisterParser() {
            Y.log( 'Init KBV Register Catalog Parser ', 'info', NAME );
        }

        /**
         * Parses KBV Register Catalog. Only provides a leafCallback and a callback that
         * is fired if the parser has finished.
         *
         * Because of the synchronous nature of this method, the user can count on the
         * ordering of nodes to be regular, i.e. node processing of the next node will
         * not begin until the current node processing is complete.
         *
         * @method parse
         * @param data {Array} a KBV Insurance Catalog as JS Object (Array)
         * @param options {Object} options has following parameters/attributes
         *              leafCallback,  Function called when a leaf is encountered
         *              verbose, false (default) - emits only valid items
         * @param callback {Function} Optional, function to be called when done.
         */
        KBVRegisterParser.prototype.parse = function( data, options, callback ) {
            function devNull() {
            }

            var
                leafCallback = options.leafCallback || devNull,
                verbose = options.verbose || false;

            function getFirstKey( entry ) {
                var keys = Object.keys( entry );
                return keys.length ? keys[0] : undefined;
            }

            function parse( cat ) {
                if( Y.Lang.isArray( cat ) ) {
                    Y.Array.each( cat, function( entry ) {
                        if(verbose || (entry.kv && entry.ar && entry.bz) ){
                            var kv = getFirstKey( entry.kv ),
                                ar = getFirstKey( entry.ar ),
                                bz = getFirstKey( entry.bz );
                            leafCallback( {
                                kvKey: kv,
                                kvName: entry.kv[kv],
                                arKey: ar,
                                arName: entry.ar[ar],
                                bzKey: bz,
                                bzName: entry.bz[bz]
                            } );
                        }
                    } );
                }
            }

            if( options.leafCallback ) {
                parse( data );
            }

            // in future this will probably be asynchronous, so we put in a callback here.
            if( callback ) {
                callback();
            }
        };

        /**
         * Returns search query for the KBV Insurance Catalog.
         * @param ac {ActionContext}
         * @returns {Object} SearchQuery
         */
        KBVRegisterParser.prototype.getSearchQuery = function( ac ) {
            var params = ac.rest.originalparams;
            // query all catalogs without specified query
            if( !ac.rest.query ) {
                ac.rest.query = {
                    catalog: ac.rest.originalparams.catalog
                };
            }

            if(params.kv){
                ac.rest.query.kvKey = params.kv;
            }
            if(params.ar){
                ac.rest.query.arKey = params.ar;
            }
            if(params.bz){
                ac.rest.query.bzKey = params.bz;
            }

            // exclude catalog tables
            ac.rest.query.key = { $exists: false };

            return ac.rest.query;
        };

        // create our singleton
        registerParser = new KBVRegisterParser();
        Y.namespace( 'doccirrus.catalogparser' ).kbvregister = registerParser;

    },
    '0.0.1', {requires: ['']}
);
