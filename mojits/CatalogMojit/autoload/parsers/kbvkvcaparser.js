/**
 * User: do
 * Date: 10/03/14  13:39
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'kbvkvcaparser', function( Y, NAME ) {
        

        /**
         * Common (Server- and client-side) library for catalog
         * parsing.
         *
         * Simple Xalan-style Streaming parser (event free though) that calls
         * back the user for business logic execution.
         *
         * Has only one method    parse()
         *
         * @class KBVKvcaParser
         */
        var
        // our singleton
            kvcaParser;

        function KBVKvcaParser() {
            Y.log( 'Init KBV Register Catalog Parser ', 'info', NAME );
        }

        /**
         * Parses KBV KVCA Catalog. Only provides a leafCallback and a callback that
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
        KBVKvcaParser.prototype.parse = function( data, options, callback ) {
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
                if( Y.Lang.isObject( cat ) ) {
                    Y.Object.each( cat, function( val, key ) {
                        Y.Array.each( val, function( entry ) {
                            var type = getFirstKey( entry ),
                                address = entry[type];
                            if( verbose || (type && address) ) {
                                leafCallback( {
                                    kv: key,
                                    kvcaType: type,
                                    kvcaAddress: address
                                } );
                            }
                        } );
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
         * Returns search query for the KBV kvca Catalog.
         * @param ac {ActionContext}
         * @returns {Object} SearchQuery
         */
        KBVKvcaParser.prototype.getSearchQuery = function( ac ) {
            var params = ac.rest.originalparams;
            // query all catalogs without specified query
            if( !ac.rest.query ) {
                ac.rest.query = {
                    catalog: ac.rest.originalparams.catalog
                };
            }

            if( params.kv ) {
                ac.rest.query.kvKey = params.kv;
            }
            if( params.type ) {
                ac.rest.query.kvcaType = params.kvcaType;
            }
            if( params.bz ) {
                ac.rest.query.kvcaAddress = params.kvcaAddress;
            }

            // exclude catalog tables
            ac.rest.query.key = { $exists: false };

            return ac.rest.query;
        };

        // create our singleton
        kvcaParser = new KBVKvcaParser();
        Y.namespace( 'doccirrus.catalogparser' ).kbvkvca = kvcaParser;

    },
    '0.0.1', {requires: ['']}
);
