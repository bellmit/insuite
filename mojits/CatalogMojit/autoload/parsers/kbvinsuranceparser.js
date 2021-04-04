/**
 * User: do
 * Date: 10/03/14  13:39
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'kbvinsuranceparser', function( Y, NAME ) {
        

        /**
         * Common (Server- and client-side) library for catalog
         * parsing.
         *
         * Simple Xalan-style Streaming parser (event free though) that calls
         * back the user for business logic execution.
         *
         * Has only one method    parse()
         *
         * @class KBVInsuranceParser
         */
        var
        // our singleton
            insParser,
            moment = require( 'moment' ),
            startOfTime,
            endOfTime;

        function convert( date ) {
            return moment( date, 'YYYY-MM-DD' );
        }

        startOfTime = convert( '1000-01-01' );
        endOfTime = convert( '9999-12-31' );

        function getValidityRange( range ) {
            if( !range || 'string' !== typeof range ) {
                return;
            }
            range = range.split( '..' );

            return {
                start: (range[0]) ? convert( range[0] ) : startOfTime,
                end: (range[1]) ? convert( range[1] ) : endOfTime
            };
        }

        function minimalValidRange() {
            var i, minStart, minEnd, validRange;
            for( i = 0; i < arguments.length; i++ ) {
                validRange = arguments[i];
                if( validRange && validRange.start && validRange.end ) {
                    if( !minStart ) {
                        minStart = validRange.start;
                    }
                    if( !minEnd ) {
                        minEnd = validRange.end;
                    }
                    minStart = (validRange.start.isAfter( minStart )) ? validRange.start : minStart;
                    minEnd = (validRange.end.isBefore( minEnd )) ? validRange.end : minEnd;
                }
            }
            return {start: minStart, end: minEnd};
        }

        function addABList( ktabs ) {
            Y.Object.each( ktabs, function( ktab ) {
                ktab.abrechnungsbereiche = {};
                Y.Object.each( ktabs, function( __ktab ) {
                    ktab.abrechnungsbereiche[__ktab.ktab] = __ktab.abrechnungsbereich;
                } );
            } );
        }

        function KBVInsuranceParser() {
            Y.log( 'Init KBV Insurance Catalog Parser ', 'info', NAME );
        }

        /**
         * Parses KBV Insurance Catalog. Only provides a leafCallback and a callback that
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
        KBVInsuranceParser.prototype.parse = function( data, options, callback ) {
            function devNull() {
            }

            var
                leafCallback = options.leafCallback || devNull,
                tableCallback = options.leafCallback || devNull,
                verbose = options.verbose || false;

            function findKeyInTable( table, key ) {
                return data[0].tables[table][key];
            }

            function parse( cat ) {

                var obj = cat['kostenträger'],
                    ex = cat.existenzbeendigung,
                    unzkv = cat.unzkv,
                    h, i,
                    ktabs = {},
                    kt_validity,
                    iknr_validity,
                    ktab_validity,
                    validityRange;

                if( Y.Object.owns( obj, 'iknr' ) && Y.Lang.isArray( obj.iknr ) ) {
                    for( h = 0; h < obj.iknr.length; h++ ) {
                        if( Y.Object.owns( obj, 'ktabrechnungsbereich' ) ) {

                            for( i in obj.ktabrechnungsbereich ) {
                                if( verbose || (obj.vknr && obj.iknr && i) ) {

                                    kt_validity = getValidityRange( obj.gueltigkeit );
                                    iknr_validity = getValidityRange( obj.iknr[h].gueltigkeit );
                                    ktab_validity = getValidityRange( obj.ktabrechnungsbereich[i].gueltigkeit );
                                    validityRange = minimalValidRange( kt_validity, iknr_validity, ktab_validity );
                                    ktabs[i] = {
                                        vknr: obj.vknr,
                                        iknr: obj.iknr[h].iknr,
                                        abrechnungs_ik: obj.iknr[h].abrechnungs_ik || (1 === obj.iknr.length && true) || false, // if abrechnungs_ik is not set and there is only one iknr, we assume this is the abrechnungs_ik
                                        ktab: i,
                                        name: obj.name,
                                        sortierungsname: obj.sortierungsname,
                                        kurzname: obj.kurzname,
                                        suchname: obj.suchname,
                                        ortssuchnamen: obj.ortssuchnamen,
                                        gebuehrenordnung: obj.gebuehrenordnung,
                                        kostentraegergruppe: findKeyInTable( 'ktgruppe', obj.kostentraegergruppe ),
                                        kostentraegergruppeId: obj.kostentraegergruppe,
                                        abrechnungsstelle: findKeyInTable( 'bezirksstelle', obj.abrechnungsstelle ),
                                        abrechnungsbereich: obj.ktabrechnungsbereich[i].name,
                                        kv: obj.kv,
                                        kt_gueltigkeit_start: kt_validity.start.toDate(),
                                        kt_gueltigkeit_end: kt_validity.end.toDate(),
                                        ik_gueltigkeit_start: iknr_validity && iknr_validity.start && iknr_validity.start.toDate(),
                                        ik_gueltigkeit_end: iknr_validity && iknr_validity.end && iknr_validity.end.toDate(),
                                        ktab_gueltigkeit_start: ktab_validity && ktab_validity.start && ktab_validity.start.toDate(),
                                        ktab_gueltigkeit_end: ktab_validity && ktab_validity.end && ktab_validity.end.toDate(),
                                        gueltigkeit_start: validityRange.start.toDate(),
                                        gueltigkeit_end: validityRange.end.toDate(),
                                        existenzbeendigung_vk: (ex) ? ex.aufnehmender_kostentraeger : undefined,
                                        existenzbeendigung_q: (ex) ? ex.letztes_quartal : undefined,
                                        unzkv: unzkv || undefined
                                    };

                                }
                            }
                            addABList( ktabs );
                            Y.Object.each( ktabs, leafCallback );
                        }
                    }
                }
            }

            function parseTables( cat ) {
                var i, j,
                    table,
                    value,
                    tables = cat.tables;

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
                        } else if( Y.Object.owns( rec, 'tables' ) ) {
                            parseTables( rec );
                        }
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
         * Returns kbv insurances. Prioritizes insurances within same kv as assigned location.
         * @param ac{ActionContext}
         * @param callback
         */
        KBVInsuranceParser.prototype.search = function( ac, callback ) {

            var nameOrLocation,
                user = Y.doccirrus.auth.getSUForLocal(),
                params = ac.rest.originalparams,
                options = ac.rest.options,
                limit = options.limit;

            function get( _query, _options, _cb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalog',
                    query: _query,
                    options: _options
                }, _cb );
            }

            function insurancesInKv( err, results ) {

                function insurancesNotInKv( err, results2 ) {
                    if( err ) {
                        Y.log( 'kbv insurance search:' + JSON.stringify( err ), 'error', NAME );
                        callback( err );
                        return;
                    }
                    callback( null, results.concat( results2 ) );
                }

                if( err ) {
                    Y.log( 'kbv insurance search:' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }

                if( results.length < limit ) {
                    ac.rest.query.kv = {$ne: ac.rest.query.kv};
                    options.limit = limit - results.length;
                    get( ac.rest.query, options, insurancesNotInKv );
                } else {
                    callback( null, results );
                }
            }

            function kvCb( err, kv ) {
                if( err ) {
                    Y.log( 'kbv insurance search:' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }

                ac.rest.query.kv = kv;
                get( ac.rest.query, options, insurancesInKv );
            }

            function locationCb( err, location ) {
                if( err || !location[0] ) {
                    err = err || 'location not found';
                    Y.log( 'kbv insurance search:' + JSON.stringify( err ), 'error', NAME );
                    callback( err );
                    return;
                }
                Y.doccirrus.utils.getKvFromLocation( ac.rest.user, location[0], kvCb );
            }

            if( !ac.rest.query ) {
                ac.rest.query = {
                    catalog: ac.rest.originalparams.catalog
                };
            }
            // "suchname" matches suchname or ortssuchname
            if( ac.rest.query.suchname ) {

                nameOrLocation = ac.rest.query.suchname;
                ac.rest.query.$or = [
                    {suchname: nameOrLocation},
                    {ortssuchnamen: nameOrLocation}
                ];
                delete ac.rest.query.suchname;
            }

            // exclude catalog tables
            ac.rest.query.key = { $exists: false };

            // exclude non abrechungs_iks, if user doesn't search for iknr
            if( !ac.rest.query.iknr && !params.disableOnlyInvoiceIK ) {
                ac.rest.query.abrechnungs_ik = true;
            }

            if( !params.locationId ) {
                get( ac.rest.query, options, callback );
            } else {

                Y.doccirrus.mongodb.runDb( {
                    user: ac.rest.user,
                    model: 'location',
                    query: {_id: params.locationId}
                }, locationCb );
            }

        };

        /**
         * Returns search query for the KBV Insurance Catalog.
         * @param ac {ActionContext}
         * @returns {Object} SearchQuery
         */
        KBVInsuranceParser.prototype.getSearchQuery = function( ac ) {
            var nameOrLocation;
            // query all catalogs without specified query
            if( !ac.rest.query ) {
                ac.rest.query = {
                    catalog: ac.rest.originalparams.catalog
                };
            }
            // "suchname" matches suchname or ortssuchname
            if( ac.rest.query.suchname ) {

                nameOrLocation = ac.rest.query.suchname;
                ac.rest.query.$or = [
                    {suchname: nameOrLocation},
                    {ortssuchnamen: nameOrLocation}
                ];
                delete ac.rest.query.suchname;
            }

            // exclude catalog tables
            ac.rest.query.key = { $exists: false };

            return ac.rest.query;
        };

        // create our singleton
        insParser = new KBVInsuranceParser();
        Y.namespace( 'doccirrus.catalogparser' ).kbvinsurance = insParser;

    },
    '0.0.1', {requires: ['']}
);
