/**
 * User: do
 * Date: 28/04/14  12:59
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'pkvinsuranceparser', function( Y, NAME ) {
        

        /**
         * Common (Server- and client-side) library for catalog
         * parsing.
         *
         * Simple Xalan-style Streaming parser (event free though) that calls
         * back the user for business logic execution.
         *
         * Has only one method    parse()
         *
         * @class PKVInsuranceParser
         */
        var
        // our singleton
            insParser;

        function PKVInsuranceParser() {
            Y.log( 'Init PKV Insurance Catalog Parser ', 'info', NAME );
        }

        /**
         * Parses PKV Insurance Catalog. Only provides a leafCallback and a callback that
         * is fired if the parser has finished.
         *
         * Because of the synchronous nature of this method, the user can count on the
         * ordering of nodes to be regular, i.e. node processing of the next node will
         * not begin until the current node processing is complete.
         *
         * @method parse
         * @param data {Array} a PKV Insurance Catalog as JS Object (Array)
         * @param options {Object} options has following parameters/attributes
         *              leafCallback,  Function called when a leaf is encountered
         *              verbose, false (default) - emits only valid items
         * @param callback {Function} Optional, function to be called when done.
         */
        PKVInsuranceParser.prototype.parse = function( data, options, callback ) {
            function devNull() {
            }

            var
                leafCallback = options.leafCallback || devNull,
                verbose = options.verbose || false;

            function parse( cat ) {

                var obj = cat['kostenträger'];
                if( verbose || (obj.ktabrechnungsbereich && obj.iknr) ) {
                    leafCallback( {
                        name: obj.name,
                        sortierungsname: obj.sortierungsname,
                        kurzname: obj.kurzname,
                        suchname: obj.suchname,
                        iknr: obj.iknr,
                        gebuehrenordnung: obj.gebuehrenordnung,
                        ktab: '00',
                        abrechnungsbereich: obj.ktabrechnungsbereich['00'].name
                    } );
                }
            }

            function parseTop( data ) {
                var
                    i,
                    rec;
                // A catalog must be an Array of objects
                if( data && Array.isArray( data ) && 0 < data.length ) {
                    for( i = 0; i < data.length; i++ ) {
                        rec = data[i];
                        // the objects must be objects with kostenträger
                        if( Y.Object.owns( rec, 'kostenträger' ) ) {
                            // parse kostenträger
                            parse( rec );
                        }
                    }
                }
            }

            if( options.leafCallback ) {
                parseTop( data );
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
        PKVInsuranceParser.prototype.getSearchQuery = function( ac ) {
            // query all catalogs without specified query
            if( !ac.rest.query ) {
                ac.rest.query = {
                    catalog: ac.rest.originalparams.catalog
                };
            }

            // exclude catalog tables
            ac.rest.query.key = { $exists: false };

            return ac.rest.query;
        };

        // create our singleton
        insParser = new PKVInsuranceParser();
        Y.namespace( 'doccirrus.catalogparser' ).pkvinsurance = insParser;

    },
    '0.0.1', {requires: ['']}
);
