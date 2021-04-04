/**
 * User: rw
 * Date: 12.02.14
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'dccatalogparser', function( Y, NAME ) {
        'use strict';

        /**
         * Common (Server- and client-side) library for catalog
         * parsing.
         *
         * Simple Xalan-style Streaming parser (event free though) that calls
         * back the user for business logic execution.
         *
         * Has only one method    parse()
         *
         * @class DCCatalogParser
         */
        var
        // our singleton
            catParser;

        function DCCatalogParser() {
            Y.log( 'Init Catalog Parser ', 'info', NAME );
        }

        /**
         * Parses data and on reaching a node of a certain type (entry, meta, leaf)
         * it calls the relevant processor callback (synchronously).
         *
         * Because of the synchronous nature of this method, the user can count on the
         * ordering of nodes to be regular, i.e. node processing of the next node will
         * not begin until the current node processing is complete.
         *
         * @method parse
         * @param data {Array} a DC Catalog as JS Object (Array)
         * @param options {Object} options has following parameters/attributes
         *              entryCallback,  Function called when an entry is encountered
         *              metaCallback,  Function called when metadata is encountered (only on level 1)
         *              leafCallback,  Function called when a leaf is encountered
         *              tableCallback,  Function called when a table entry is encountered
         *              verbose, false (default) - emits only valid items
         * @param callback {Function} Optional, function to be called when done.
         */
        DCCatalogParser.prototype.parse = function( data, options, callback ) {
            function devNull() {
            }

            var
                entryCallback = options.entryCallback || devNull,
                metaCallback = options.metaCallback || devNull,
                leafCallback = options.leafCallback || devNull,
                tableCallback = options.tableCallback || devNull,
                verbose = options.verbose || false;

            function parse( cat ) {

                // if object show it
                if( Array.isArray( cat ) ) {
                    cat.forEach( function( e ) {
                        parse( e );
                    } );
                } else if( 'object' === typeof cat ) {
                    if( Y.Object.owns( cat, 'entry' ) ) {
                        // process entry type
                        if( verbose || (cat.title || cat.seq) ) {
                            entryCallback( cat );
                        }
                        // recurse
                        parse( cat.entry );
                    } else {
                        if( verbose || (cat.title || cat.seq) ) {
                            leafCallback( cat );
                        }
                    }
                } // otherwise ignore non-compliant catalog entry
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

            function parseCatTop( data ) {
                var
                    i,
                    rec;
                // A catalog must be an Array of objects
                for( i = 0; i < data.length; i++ ) {
                    rec = data[i];
                    // the objects are either objects with entry
                    if( Y.Object.owns( rec, 'entry' ) ) {
                        // parse entries recursively...
                        parse( rec );
                    } else {
                        // or they are metadata objects.
                        Y.Object.each( rec, metaCallback );
                    }
                }
            }

            function parseTop( data ) {
                var i;
                // A catalog is an Array of objects
                if( data && Array.isArray( data ) && 0 < data.length ) {
                    parseCatTop( data );
                    // or an Object that could contain a tables key
                } else if( data && 'object' === typeof data ) {
                    for( i in data ) {
                        if( data.hasOwnProperty( i ) ) {
                            if( 'tables' === i && 'object' === typeof data[i] ) {
                                parseTables( data[i] );
                            } else if( Array.isArray( data[i] ) && 0 < data[i].length ) {
                                parseCatTop( data[i] );
                            }
                        }
                    }
                }
            }

            if( options.entryCallback ||
                options.metaCallback ||
                options.leafCallback ) {

                parseTop( data );
            }

            // in future this will probably be asynchronous, so we put in a callback here.
            if( callback ) {
                callback();
            }
        };

        DCCatalogParser.prototype.search = function( ac, callback ) {
            var user = Y.doccirrus.auth.getSUForLocal(),
                params = ac.rest.originalparams,
                options = ac.rest.options,
                limit = options.limit || 10,
                infoRegex;

            function get( _query, _options, _cb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalog',
                    query: _query,
                    options: _options
                }, _cb );
            }

            if(params.tags && params.tags.length){
                return callback(null, []);
            }

            if( params.exactMatch ) {
                get( { $and: [
                    {seq: params.term },
                    {catalog: params.catalog},
                    {seq: { $exists: true }}
                ] }, options, callback );
                return;
            }

            function seqCb( err, seqEntries ) {
                var exisitingSeqs;

                function titleCb( err, titleEntries ) {
                    if( err ) {
                        callback( err );
                        return;
                    }
                    callback( null, seqEntries.concat( titleEntries ) );
                }

                if( err ) {
                    callback( err );
                    return;
                }
                if( seqEntries.length >= limit ) {
                    callback( null, seqEntries );
                } else {
                    options.limit = limit - seqEntries.length;
                    exisitingSeqs = seqEntries.map( function( entry ) {
                        return entry.seq;
                    } );
                    infoRegex = new RegExp(params.term, 'i');
                    get( { $and: [
                        {seq: {$nin: exisitingSeqs}},
                        {catalog: params.catalog},
                        {seq: { $exists: true }},
                        {$or: [
                            {title: { $regex: params.term, $options: 'i' }},
                            {infos: {$in: [infoRegex]}}
                        ]}
                    ] }, options, titleCb );
                }
            }

            if( !options.sort ) {
                options.sort = {};
            }
            options.sort.seq = 1;

            get( { $and: [
                {catalog: params.catalog},
                {seq: { $exists: true }},
                {seq: { $regex: '^' + params.term, $options: 'i' }}
            ] }, options, seqCb );
        };

        DCCatalogParser.prototype.searchShort = function( ac, callback ) {
            var params = ac.rest.originalparams,
                options = ac.rest.options,
                limit = options.limit || 10,
                infoRegex,
                tagQuery = {};

            function get( _query, _options, _cb ) {
                Y.doccirrus.mongodb.runDb( {
                    user: ac.rest.user,
                    model: 'catalogusage',
                    query: _query,
                    options: _options
                }, _cb );
            }

            if(params.tags && params.tags.length){

                if ('string' === typeof params.tags){
                    tagQuery.tags = params.tags;
                } else {
                    tagQuery.tags = {
                        $in:params.tags
                    };
                }
            }
            if( params.exactMatch ) {
                get( { $and: [
                    {seq: params.term },
                    {catalogShort: params.catalogShort},
                    tagQuery,
                    {seq: { $exists: true }}
                ] }, options, callback );
                return;
            }

            function seqCb( err, seqEntries ) {
                var exisitingSeqs;

                function titleCb( err, titleEntries ) {
                    if( err ) {
                        callback( err );
                        return;
                    }
                    callback( null, seqEntries.concat( titleEntries ) );
                }

                if( err ) {
                    callback( err );
                    return;
                }
                if( seqEntries.length >= limit ) {
                    callback( null, seqEntries );
                } else {
                    options.limit = limit - seqEntries.length;
                    exisitingSeqs = seqEntries.map( function( entry ) {
                        return entry.seq;
                    } );
                    infoRegex = new RegExp(params.term, 'i');

                    get( { $and: [
                        {seq: {$nin: exisitingSeqs}},
                        {catalogShort: params.catalogShort},
                        {seq: { $exists: true }},
                        tagQuery,
                        {$or: [
                            {title: { $regex: params.term, $options: 'i' }},
                            {infos: {$in: [infoRegex]}}
                        ]}
                    ] }, options, titleCb );
                }
            }

            if( !options.sort ) {
                options.sort = {};
            }
            options.sort.seq = 1;

            get( { $and: [
                {catalogShort: params.catalogShort},
                {seq: { $exists: true }},
                tagQuery,
                {seq: { $regex: '^' + params.term, $options: 'i' }}
            ] }, options, seqCb );
        };
        /**
         * Returns search query for the default DC Catalog.
         * @param ac {ActionContext}
         * @returns {Object} SearchQuery
         */
        DCCatalogParser.prototype.getSearchQuery = function( ac ) {
            var params = ac.rest.originalparams,
                query = { $and: [
                    {catalog: params.catalog},
                    {seq: { $exists: true }}
                ] };

            if( params.exactMatch ) {
                query.$and.push( {
                    seq: params.term
                } );
            } else {
                query.$and.push( {$or: [
                    {title: { $regex: params.term, $options: 'i' }},
                    {seq: { $regex: '^' + params.term, $options: 'i' }}
                ]} );
            }

            return query;
        };

        // create our singleton
        catParser = new DCCatalogParser();
        Y.namespace( 'doccirrus.catalogparser' ).default = catParser;

    },
    '0.0.1', {requires: []}
);
