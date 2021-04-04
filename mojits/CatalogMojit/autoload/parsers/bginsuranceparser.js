/**
 * User: do
 * Date: 28/12/14  21:43
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'bginsuranceparser', function( Y, NAME ) {
        

        var
        // our singleton
            insParser;

        function BGInsuranceParser() {
            Y.log( 'Init BG Insurance Catalog Parser ', 'info', NAME );
        }

        BGInsuranceParser.prototype.parse = function( data, options, callback ) {
            callback();
        };

        /**
         * Returns search query for the BG Insurance Catalog.
         * @param ac {ActionContext}
         * @returns {Object} SearchQuery
         */
        BGInsuranceParser.prototype.getSearchQuery = function( ac ) {
            var i, filter;
            // query all catalogs without specified query
            if( !ac.rest.query ) {
                ac.rest.query = {
                    catalog: ac.rest.originalparams.catalog
                };
            }

            // exclude catalog tables
            ac.rest.query.key = { $exists: false };

            // datatable "in" filter does not convert search string to regex
            for( i in ac.rest.query ) {
                if( ac.rest.query.hasOwnProperty( i ) ) {
                    if( 0 === i.indexOf( 'addresses' ) ) {
                        filter = ac.rest.query[i];
                        if( filter.$in && filter.$in.length ) {
                            filter.$in = [new RegExp( filter.$in[0], 'i' )];
                        }
                    }
                }
            }

            return ac.rest.query;
        };

        // create our singleton
        insParser = new BGInsuranceParser();
        Y.namespace( 'doccirrus.catalogparser' ).bginsurance = insParser;

    },
    '0.0.1', {requires: ['']}
);
