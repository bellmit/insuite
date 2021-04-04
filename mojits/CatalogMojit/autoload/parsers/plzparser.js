/*global YUI */
YUI.add( 'plzparser', function( Y, NAME ) {
        

        /**
         * Common (Server- and client-side) library for catalog
         * parsing.
         *
         * Simple Xalan-style Streaming parser (event free though) that calls
         * back the user for business logic execution.
         *
         * Has only one method    parse()
         *
         * @class PlzParser
         */
        var
            // our singleton
            plzParser;

        function PlzParser() {
            Y.log( 'Init PLZ Catalog Parser ', 'info', NAME );
        }

        /**
         * Parses KBV Plz Catalog. Only provides a leafCallback and a callback that
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
        PlzParser.prototype.parse = function( data, options, callback ) {
            function devNull() {
            }

            var
                leafCallback = options.leafCallback || devNull,
                verbose = options.verbose || false;

            function parse( cat ) {
                if( Y.Lang.isArray( cat ) ) {
                    Y.Array.each( cat, function( entry ) {
                        Y.Object.each( entry, function( val, key ) {
                            if( verbose ||  key ) {
                                leafCallback( {
                                    zip: key
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
         * Returns search query for the KBV Insurance Catalog.
         * @param ac {ActionContext}
         * @returns {Object} SearchQuery
         */
        PlzParser.prototype.getSearchQuery = function( ac ) {
            var params = ac.rest.originalparams,
                query = {};
            // query all catalogs without specified query
            if( !ac.rest.query ) {
                ac.rest.query = {
                    catalog: ac.rest.originalparams.catalog
                };
            }

            if( params.term ) {
                query = { $and: [
                        {zip: params.exactMatch ? params.term : {$regex: '^' + params.term, $options: 'i' }},
                        {sign: 'CH'}
                    ] };
                ac.rest.query = query;
            }

            // exclude catalog tables
            ac.rest.query.key = { $exists: false };

            return ac.rest.query;
        };

        // create our singleton
        plzParser = new PlzParser();
        Y.namespace( 'doccirrus.catalogparser' ).plzparser = plzParser;

    },
    '0.0.1', {requires: ['']}
);
