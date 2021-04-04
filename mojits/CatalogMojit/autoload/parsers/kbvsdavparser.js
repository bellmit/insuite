/**
 * User: do
 * Date: 28/04/14  18:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'kbvsdavparser', function( Y, NAME ) {
        

        /**
         * Common (Server- and client-side) library for catalog
         * parsing.
         *
         * Simple Xalan-style Streaming parser (event free though) that calls
         * back the user for business logic execution.
         *
         * Has only one method    parse()
         *
         * @class KBVSdavParser
         */
        var
        // our singleton
            sdavParser;

        function KBVSdavParser() {
            Y.log( 'Init PKV Insurance Catalog Parser ', 'info', NAME );
        }

        /**
         * Parses KBV SDAV Catalog. Only provides a leafCallback and a callback that
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
        KBVSdavParser.prototype.parse = function( data, options, callback ) {
            function devNull() {
            }

            var
                i, j,
                rec,
                obj,
                bsnr,
                bsnrList,
                lanrList,
                docs,
                leafCallback = options.leafCallback || devNull,
                verbose = options.verbose || false;

            function getFirstKey( obj ) {
                var keys = ('object' === typeof obj) ? Object.keys( obj ) : undefined;
                if( !keys || !keys.length ) {
                    return;
                }
                return keys[0];
            }

            function parse( cat, _cb ) {
                docs = [];
                obj = cat['1450'];
                if( obj && (verbose || (obj['0201'] && obj['0212'])) ) {
                    bsnr = getFirstKey( obj['0201'] );
                    bsnrList = obj['0201'][bsnr];
                    lanrList = obj['0212'];
                    docs.push( {
                        bsnr: bsnr,
                        parentBsnr: null,
                        lanrList: lanrList,
                        bsnrList: bsnrList
                    } );
                    for( j = 0; j < bsnrList.length; j++ ) {
                        docs.push( {
                            bsnr: bsnrList[j],
                            parentBsnr: bsnr,
                            lanrList: lanrList,
                            bsnrList: bsnrList
                        } );
                    }
                    for( j = 0; j < lanrList.length; j++ ) {
                        docs.push( {
                            lanr: lanrList[j],
                            parentBsnr: bsnr,
                            bsnrList: bsnrList,
                            lanrList: lanrList
                        } );
                    }
                    leafCallback( docs, _cb );
                }
            }

            function parseTop( data ) {
                if( data && Array.isArray( data ) && 0 < data.length ) {
                    for( i = 0; i < data.length; i++ ) {
                        rec = data[i];
                        if( Array.isArray( rec ) ) {
                            require( 'async' ).eachSeries( rec, parse, callback );
                        }
                    }
                } else {
                    callback('No data');

                }
            }

            if( options.leafCallback ) {
                parseTop( data );
            } else {
                callback('No leafCallback');
            }
        };

        /**
         * Returns search query for the KBV SDAV Catalog.
         * @param ac {ActionContext}
         * @returns {Object} SearchQuery
         */
        KBVSdavParser.prototype.getSearchQuery = function( ac ) {
            var params = ac.rest.originalparams;
            // query all catalogs without specified query
            if( !ac.rest.query ) {
                ac.rest.query = {
                    catalog: params.catalog
                };
            }

            if( params.key && params.term ) {
                switch( params.key ) {
                    case 'bsnr':
                        ac.rest.query.bsnr = { $regex: '^' + params.term, $options: 'i'  };
                        break;
                    case 'lanr':
                        ac.rest.query.lanr = { $regex: '^' + params.term, $options: 'i'  };
                        break;
                }
            }

            if( params.bsnr ) {
                // ac.rest.query.parentBsnr = params.bsnr;
                ac.rest.query.$or = [
                    {parentBsnr: params.bsnr},
                    {bsnrList: {$in: [params.bsnr]}}
                ];


            }

            if( params.lanr ) {
                ac.rest.query.lanrList = {$in: [params.lanr]};
            }

            // exclude catalog tables
            ac.rest.query.key = { $exists: false };

            return ac.rest.query;
        };

        // create our singleton
        sdavParser = new KBVSdavParser();
        Y.namespace( 'doccirrus.catalogparser' ).kbvsdav = sdavParser;

    },
    '0.0.1', {requires: ['']}
);
