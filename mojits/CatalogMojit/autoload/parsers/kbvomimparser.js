/**
 * User: do
 * Date: 10/03/14  13:39
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'kbvomimparser', function( Y, NAME ) {
        

        /**
         * Common (Server- and client-side) library for catalog
         * parsing.
         *
         * Simple Xalan-style Streaming parser (event free though) that calls
         * back the user for business logic execution.
         *
         * Has only one method    parse()
         *
         * @class KBVOMIMParser
         */
        var
        // our singleton
            omimParser;

        function KBVOMIMParser() {
            Y.log( 'Init KBV PLZ Catalog Parser ', 'info', NAME );
        }

        /**
         * Parses KBV OMIM Catalog. Only provides a leafCallback and a callback that
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
        KBVOMIMParser.prototype.parse = function( data, options, callback ) {
            function devNull() {
            }

            var
                leafCallback = options.leafCallback || devNull;

            function parse( cat ) {
                if( Y.Lang.isArray( cat ) ) {
                    Y.Array.each( cat, function( entry ) {
                        leafCallback( {
                            "prefixG": entry.prefixG,
                            "omimG": entry.omimG,
                            "genName": entry.genName,
                            "genStatus": entry.genStatus,
                            "prefixP": entry.prefixP,
                            "omimP": entry.omimP,
                            "desc": entry.desc,
                            "pmk": entry.pmk
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
         * @param {Object} ac.rest
         * @param {Object} ac.rest.originalparams
         * @param {String} ac.rest.originalparams.term country term treated as RegExp (either term or sign)
         * @param {String} ac.rest.originalparams.sign sign searches by countryCode (either term or sign)
         * @returns {Object} SearchQuery
         */
        KBVOMIMParser.prototype.getSearchQuery = function( ac ) {
            var params = ac.rest.originalparams,
                type;

            // query all catalogs without specified query
            if( !ac.rest.query ) {
                ac.rest.query = {
                    catalog: ac.rest.originalparams.catalog
                };
            }

            if( params.term && params.type ) {
                switch( params.type ) {
                    case 'g':
                        type = 'omimG';
                        break;
                    case 'p':
                        type = 'omimP';
                        break;
                    case 'n':
                        type = 'genName';
                        break;
                    default:
                        type = 'desc';
                }
                ac.rest.query[type] = params.exactMatch ? params.term : { $regex: params.term, $options: 'i'  };
            }

            // exclude catalog tables
            ac.rest.query.key = { $exists: false };

            return ac.rest.query;
        };

        // create our singleton
        omimParser = new KBVOMIMParser();
        Y.namespace( 'doccirrus.catalogparser' ).omim = omimParser;

    },
    '0.0.1', {requires: ['']}
);
