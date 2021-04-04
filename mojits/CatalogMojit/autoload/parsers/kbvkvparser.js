/**
 * User: do
 * Date: 10/03/14  13:39
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'kbvkvparser', function( Y, NAME ) {
        

        /**
         * Common (Server- and client-side) library for kv catalog
         * parsing.
         *
         * Simple Xalan-style Streaming parser (event free though) that calls
         * back the user for business logic execution.
         *
         * Has only one method    parse()
         *
         * @class KBVkvparser
         */
        var
        // our singleton
            kvParser;

        function KBVkvparser() {
            Y.log( 'Init KBV kv Catalog Parser ', 'info', NAME );
        }

        /**
         * Parses KBV KV Catalog. Only provides a leafCallback and a callback that
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
         *              tableCallback,  Function called when a table entry is encountered
         *              verbose, false (default) - emits only valid items
         * @param callback {Function} Optional, function to be called when done.
         */
        KBVkvparser.prototype.parse = function( data, options, callback ) {
            function devNull() {
            }

            var
                leafCallback = options.leafCallback || devNull,
                tableCallback = options.leafCallback || devNull,
                verbose = options.verbose || false,
                scheinunterarten = ['0101', '0102', '0103', '0104'];

            function firstKey( obj ) {
                return 'object' === typeof obj ? Object.keys( obj )[0] : undefined;
            }

            function findKeyInTable( table, key ) {
                table = 'T' + table;
                if( !data.tables[table] ) {
                    return;
                }
                return data.tables[table][key];
            }

            function refineValue( table, value ) {
                if( Array.isArray( value ) ) {
                    var arr = [];
                    Y.Array.each( value, function( val ) {
                        arr.push( {
                            key: val,
                            value: findKeyInTable( table, val ) || val
                        } );
                    } );
                    return arr;
                }

                return {
                    key: value,
                    value: findKeyInTable( table, value ) || value
                };
            }

            function parse1( header, cat ) {
                Y.Object.each( cat, function( value, key ) {
                    leafCallback( Y.merge( {
                        kvKey: key,
                        kvValue: 'pseudognr_liste' === key ? value : refineValue( key, value )
                    }, header ) );
                } );
            }

            function parse2( header, cat ) {
                Y.Object.each( cat, function( value, key ) {
                    if( '4106' === key ) {
                        leafCallback( Y.merge( {
                            kvKey: key,
                            kvValue: value
                        }, header ) );
                    } else if( '4239' === key ) {
                        Y.Array.each( value, function( entry ) {
                            var kvSUKey = firstKey( entry );
                            scheinunterarten.push( kvSUKey );
                            leafCallback( Y.merge( {
                                kvKey: key,
                                kvValue: entry[kvSUKey],
                                kvSU: kvSUKey // Scheinuntergruppen ID
                            }, header ) );
                        } );
                    }
                } );
            }

            function parse3( header, cat ) {
                Y.Array.each( cat, function( entry ) {
                    var kvAB, kvKTAB, suEntry, ktabEntries;

                    suEntry = entry['2018'];

                    if( !suEntry || !suEntry.key ) {
                        return;
                    }

                    ktabEntries = suEntry['4106'];

                    if( !ktabEntries ) {
                        return;
                    }

                    kvAB = suEntry.key;
                    Y.Array.each( ktabEntries, function( ktabEntry ) {
                        var excSatzarten, incSatzarten;
                        if( !ktabEntry.key ) {
                            return;
                        }

                        kvKTAB = ktabEntry.key;
                        Y.Object.each( ktabEntry, function( value, key ) {
                            if( 'key' === key ) {
                                return;
                            }
                            if( '9406' === key ) {
                                excSatzarten = value;
                                return;
                            }
                            leafCallback( Y.merge( {
                                kvKey: key,
                                kvValue: refineValue( key, value ),
                                kvAB: kvAB, // Abrechnungsbereich ID
                                kvKTAB: kvKTAB
                            }, header ) );
                        } );
                        if( !excSatzarten ) {
                            incSatzarten = scheinunterarten;
                        } else {
                            incSatzarten = Y.Array.reject( scheinunterarten, function( scheinart ) {
                                return Boolean( Y.Array.find( excSatzarten, function( exScheinart ) {
                                    if( scheinart.length === 2 ) {
                                        var key = ('0' === scheinart[0]) ? '1' : scheinart[0];
                                        return key === exScheinart[3];
                                    } else {
                                        return scheinart === exScheinart;
                                    }
                                } ) );
                            } );
                        }
                        leafCallback( Y.merge( {
                            kvKey: '9406',
                            kvValue: incSatzarten,
                            kvAB: kvAB,
                            kvKTAB: kvKTAB
                        }, header ) );
                    } );

                } );
            }

            function parse( header, type, cat ) {
                header.kvType = type;
                switch( type ) {
                    case 'kvx1':
                        parse1( header, cat );
                        break;
                    case 'kvx2':
                        parse2( header, cat );
                        break;
                    case 'kvx3':
                        parse3( header, cat );
                        break;
                }
            }

            function parseTables( tables ) {
                var i, j,
                    table,
                    value;

                for( i in tables ) {
                    if( tables.hasOwnProperty( i ) ) {
                        table = tables[i];
                        for( j in table ) {
                            if( table.hasOwnProperty( j ) ) {
                                value = table[j];
                                if( verbose || (i && j) ) {
                                    tableCallback( {
                                        title: i,
                                        key: j,
                                        value: value
                                    } );
                                }
                            }
                        }
                    }
                }
            }

            function parseTop( data ) {
                if( data && Y.Lang.isObject( data ) ) {
                    var kvx0 = data.kvx0,
                        header = {
                            kv: kvx0['9113'],
                            version: kvx0['9112']
                        };

                    Y.Object.each( data, function( value, key ) {
                        if( 'tables' === key ) {
                            parseTables( data.tables );
                        } else if( 'kvx0' !== key ) {
                            parse( header, key, value );
                        }
                    } );

                } else {
                    if( callback ) {
                        callback();
                    }
                }
            }

            if( options.leafCallback ||
                options.tableCallback ) {
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
        KBVkvparser.prototype.getSearchQuery = function( ac ) {
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
        kvParser = new KBVkvparser();
        Y.namespace( 'doccirrus.catalogparser' ).kbvkv = kvParser;

    },
    '0.0.1', {requires: ['']}
)
;
