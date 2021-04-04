/**
 * User: rw
 * Date: 12.02.14
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'dccatalogindex', function( Y, NAME ) {
        

        /**
         * Server-side library for creation, searching and mgmt of
         * catalog indices.
         *
         * Catalog indexing. Catalog index exists once on a server
         * in the DB '0' -- i.e. it is shared by all tenants. This
         * provides re-use of the shared indexes and also forces exact
         * addressing of catalogs, so that many different versions can
         * co-exist.
         *
         * Catalog Indexes are created for all installed catalogs that
         * are listed in the Catalog Descriptor Meta Object. This can
         * be retrieved with:
         *
         * /r/catapi/?action=catapi
         *
         * Additionally the Catalog index contains auxilliary table
         * information.  The following is a list of the tables available:
         *
         * KT:
         * - ktabrechnungsbereich
         * - kv
         * - bezirksstelle
         * - ktgruppe
         * - gebuehrenordnung
         * - wop
         * EBM
         * - ktgruppe
         * - kv
         * - bezirksstelle
         * - ktabrechnungsbereich
         * - geschlecht
         * - gebuehrenordnung
         * - scheinart
         * - rlv
         * - leistungsgruppe
         * - gop
         * - leistungserbringart
         * - valutaeinheit
         * - profilzeitart
         * - versorgungsgebiet
         * - bezugsraum
         * - arztpraxis
         * - fachgruppe
         * - vdxvertragsart
         * - vdxkontenart
         * - zeiteinheit
         * - versorgungsbereich
         * - zusatzangabe
         * - schnittnahtzeit
         *
         * The REST Search API for this index is as follows:
         *
         * 1) search for entry in catalog
         * /r/catsearch/?action=catsearch
         *
         * Parameter:
         * - catalog (required) returns all entries (ex. 74E13101.sdkt.dc.json)
         *
         * Further parameters depend on the parsers getSearchQuery method.
         * The default parser expects:
         * - term (regex)
         *
         * The kbvinsuranceparser expects an optional mongodb query (ac.rest.query)
         *
         *
         * 2) search for entries in tables
         * /r/getTables/?action=getTables
         *
         * Parameter:
         * - catalog (required) returns all entries (ex. 74E13101.sdkt.dc.json)
         * - table (optional) filter entries by table (title attribute, ex. ktgruppe)
         * - key (optional) filter entries by key (ex. 04)
         *
         * @class DCCatalogIndex
         * @deprecated
         */
        function DCCatalogIndex() {
        }

        var
            MongoClient = require( 'mongodb' ).MongoClient,
            migrate = require( 'dc-core' ).migrate,
            config,
            db,
            async = require( 'async' ),
            fs = require( 'fs' ),
            path = require( 'path' ),
        // our singleton
            catIndex;

        /**
         *
         * @method  createIndexFromFile
         * @param   {String}          filename
         * @param   {Function}        callback
         */
        DCCatalogIndex.prototype.createIndexFromFile = function( filename, callback ) {
            callback = callback || function() {
            };
            var
                self = this,
                user = Y.doccirrus.auth.getSUForLocal(),
                parser = Y.doccirrus.api.catalog.getParserForCatalogName( filename ),
                sum = 0,
                errors = 0,
                cat;

            function posted( err ) {
                if( err ) {
                    errors++;
                }
                else {
                    sum++;
                }
            }

            function insertEntry( entry, _cb ) {
                // optimise by making an array and posting in one go...

                if( Array.isArray( entry ) ) {
                    Y.Array.each( entry, function( obj ) {
                        obj.catalog = filename;
                    } );
                } else {
                    entry.catalog = filename;
                }

                function insertCb( err/*, docs */ ) {
                    if( err ) {
                        Y.log( 'Error inserting catalog entry ' + err, 'error', NAME );
                    }
                    //Y.log( 'Inserted catalog entry ' + JSON.stringify( docs ), 'info', NAME );

                    posted( err );
                    if( 'function' === typeof _cb ) {
                        _cb( err );
                    }
                }

                db.collection( 'catalogs' ).insert( entry, insertCb );
            }

            function metaInserted( err ) {
                var catalogDescriptor = Y.doccirrus.api.catalog.getCatalogDescriptorForName( filename );
                if( catalogDescriptor && 'EBM' === catalogDescriptor.short ) {
                    self.updateCatalogUsage( catalogDescriptor );
                }
                callback( err, {created: sum, errors: errors } );
            }

            function insertMeta() {
                Y.log( 'Insert catalog index meta', 'info', NAME );

                Y.doccirrus.mongodb.runDb( {
                        user: user,
                        action: 'post',
                        model: 'catalog',
                        data: Y.doccirrus.filters.cleanDbObject( {
                            catalog: '__meta',
                            title: filename
                        } )
                    },
                    metaInserted );
            }

            function cleanedCb( err ) {
                if( err ) {
                    Y.log( 'Could not clean: ' + filename, 'info', NAME );
                    callback( err, null );
                }
                // 2. parse the cat, and write all the entries into the index
                // after a little processing
                parser.parse( cat,
                    {
                        entryCallback: insertEntry,
                        leafCallback: insertEntry,
                        tableCallback: insertEntry
                    }, insertMeta
                );
            }

            if( !parser ) {
                Y.log( 'Could not get parser for: ' + filename, 'info', NAME );
                callback( new Error( 'Count not get parser for ' + filename ) );
                return;
            }

            cat = require( path.join( Y.doccirrus.api.catalog.getCatalogsPath(), filename ) );

            if( Array.isArray( cat ) || 'object' === typeof cat ) {
                // 1. delete the existing index entries for this catalog
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'delete',
                    model: 'catalog',
                    query: { catalog: filename },
                    options: { override: true }
                }, cleanedCb );
            } else {
                Y.log( 'Empty catalog requested for indexing: ' + filename, 'info', NAME );
                callback( null, null );
            }
        };

        DCCatalogIndex.prototype.updateCatalogUsage = function( descriptor ) {

            var su = Y.doccirrus.auth.getSUForLocal(),
                fieldsToUpdate = ['level', 'title', 'infos', 'unit', 'value', 'u_extra'];

            function count( n ) {
                Y.log( 'updated catalogusage for ' + n + 'tenants', 'info', NAME );
            }

            function updateTenant( user ) {

                var catalogUsageResults;

                function finalCb( err ) {
                    if( err ) {
                        Y.log( 'Error updating tenant catalogusage', 'error', NAME );
                    } else {
                        Y.log( 'Finished updating tenant catalogusage', 'info', NAME );
                    }
                }

                function update( catalogEntry, _cb ) {
                    var found;

                    catalogUsageResults.some( function( catalogUsageEntry ) {
                        if( catalogEntry.seq === catalogUsageEntry.seq ) {
                            found = catalogUsageEntry;
                            return true;
                        }
                        return false;
                    } );
                    if( found ) {

                        fieldsToUpdate.forEach( function( field ) {
                            if( catalogEntry[field] ) {
                                found[field] = catalogEntry[field];
                            }
                        } );
                        found.catalog = true;
                        found.catalogRef = descriptor.filename;

                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'catalogusage',
                            action: 'put',
                            query: {
                                _id: found._id
                            },
                            fields: Object.keys(found),
                            data: Y.doccirrus.filters.cleanDbObject(found)
                        }, _cb);

                    } else {
                        _cb();
                    }
                }

                function matchingCatalogEntriesCb( err, results ) {

                    if( err ) {
                        Y.log( 'Error retrieving matching ebm catalog entries ' + JSON.stringify( err ), 'error', NAME );
                        finalCb( err );
                        return;
                    }

                    async.eachSeries( results, update, finalCb );
                }

                function catalogUsageCb( err, results ) {

                    if( err ) {
                        Y.log( 'Error retrieving ebm catalogusage ' + JSON.stringify( err ), 'error', NAME );
                        finalCb( err );
                        return;
                    }

                    var seqIds = results.map( function( result ) {
                        return result.seq;
                    } );

                    catalogUsageResults = results;

                    Y.doccirrus.mongodb.runDb( {
                        user: su,
                        model: 'catalog',
                        query: {
                            catalog: descriptor.filename,
                            seq: {
                                $in: seqIds
                            }
                        }
                    }, matchingCatalogEntriesCb );

                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'catalogusage',
                    query: {
                        catalog: false,
                        catalogShort: 'EBM'
                    }
                }, catalogUsageCb );
            }

            migrate.forEachTenant( updateTenant, count );

        };

        /**
         * Function that creates fresh indexes for those catalogs that are installed in the
         * assets directory AND listed in the meta catalog descriptor, if they are not already indexed.
         * In case a catalogs are indexed, but not in the assets directory, the indexes are deleted.
         *
         * Catalogs not in the Meta-Catalog will not be loaded.
         *
         * @method  autoload
         * @param   {Function}            callback
         */
        DCCatalogIndex.prototype.autoload = function( callback ) {
            callback = callback || function() {
            };
            var
                user = Y.doccirrus.auth.getSUForLocal() ,
                indexed = [],
                catalogs;

            function doneAll( err ) {
                Y.log( ' **** completed indexing **** ', 'info', NAME );
                if( db ) {
                    db.close();
                }
                callback( err, indexed );
            }

            function exists( arr, s ) {
                return -1 !== arr.indexOf( s );
            }

            function getCatalogFilesToLoad() {
                var catalogDescriptors = Y.doccirrus.api.catalog.getCatalogDescriptors(),
                    catalogFilesToLoad = [];
                Y.Object.each( catalogDescriptors, function( val ) {
                    if( !val.cat ) {
                        return;
                    }
                    val.cat.forEach( function( cat ) {
                        if( !exists( catalogFilesToLoad, cat.filename ) ) {
                            catalogFilesToLoad.push( cat.filename );
                        }
                    } );
                } );
                return catalogFilesToLoad;
            }

            function mapToFullPath( filenames ) {
                return Y.Array.map( filenames, function( filename ) {
                    return path.join( Y.doccirrus.api.catalog.getCatalogsPath(), filename );
                } );
            }

            function mapToBasename( fullPathFiles ) {
                return Y.Array.map( fullPathFiles, function( fullPathFile ) {
                    return path.basename( fullPathFile );
                } );
            }

            function getCatalogsOnDisk( files, callback ) {
                files = mapToFullPath( files );
                async.filter( files, fs.exists, callback );
            }

            function getIndexedCatalogs( callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'catalog',
                    query: { catalog: '__meta' }
                }, function( err, result ) {
                    if( err ) {
                        callback( err );
                        return;
                    }
                    callback( null, Y.Array.map( result, function( cat ) {
                        return cat.title;
                    } ) );
                } );
            }

            function compareCatalogs( catalogs, indexedCatalogs, existingFiles ) {
                var catalogsToIndex = [],
                    catalogsToDelete = [];
                catalogs.forEach( function( catalog ) {
                    if( exists( indexedCatalogs, catalog ) && !exists( existingFiles, catalog ) ) {
                        Y.log( 'Delete catalog index: ' + catalog, 'info', NAME );
                        catalogsToDelete.push( catalog );
                    } else if( !exists( indexedCatalogs, catalog ) && exists( existingFiles, catalog ) ) {
                        Y.log( 'Index catalog: ' + catalog, 'info', NAME );
                        catalogsToIndex.push( catalog );
                    }
                } );
                indexedCatalogs.forEach( function( catalog ) {
                    if( !exists( catalogs, catalog ) ) {
                        catalogsToDelete.push( catalog );
                    }
                } );
                indexed = catalogsToIndex;
                indexCatalogs( catalogsToIndex, catalogsToDelete );
            }

            function indexCatalogs( catalogsToIndex, catalogsToDelete ) {

                function deletedCatalogs( err, result ) {
                    if( err ) {
                        Y.log( 'Error deleting all obsolete indexes', 'error', NAME );
                        return;
                    } else if( result ) {
                        Y.log( 'Deleted all obsolete indexes - count: ' + Array.isArray( result ) ? result.length : result, 'debug', NAME, false );
                    }

                    async.eachSeries( catalogsToIndex, function( catalog, callback ) {
                            Y.log( 'Indexing catalog: ' + catalog, 'info', NAME );
                            catIndex.createIndexFromFile( catalog, callback );
                        },
                        doneAll
                    );
                }

                function deleteCatalogs() {
                    if( 0 >= catalogsToDelete.length ) {
                        deletedCatalogs();
                        return;
                    }
                    Y.log( 'Deleting catalogs: ' + catalogsToDelete.join( ', ' ), 'info', NAME );
                    db.collection( 'catalogs' ).remove( { $or: [
                        {catalog: { $in: catalogsToDelete }},
                        {catalog: '__meta', title: { $in: catalogsToDelete }}
                    ] }, {w: 1}, deletedCatalogs );
                }

                setImmediate( deleteCatalogs );
            }

            function dbReady( err, _db ) {

                if( err ) {
                    Y.log( 'CatalogIndex native mongodb driver could not connect to db ' + err, 'info', NAME );
                    return;
                }
                db = _db;

                catalogs = getCatalogFilesToLoad();

                getCatalogsOnDisk( catalogs, function( existingFiles ) {
                    existingFiles = mapToBasename( existingFiles );
                    getIndexedCatalogs( function( err, indexed ) {
                        if( err ) {
                            Y.log( 'Error loading index catalogs from database', 'info', NAME );
                            callback( err );
                        }
                        compareCatalogs( catalogs, indexed, existingFiles );
                    } );
                } );
            }

            Y.log( 'Autoloading Catalogs.', 'info', NAME );

            // we only build this index on a (V)PRC system
            if( !Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isPRC() ) {
                callback();
                return;
            }

            config = require( 'dc-core' ).db.loadDbConfig();
            MongoClient.connect( 'mongodb://' + config.mongoDb.host + ':' + config.mongoDb.port + '/0', dbReady );
        };

        /**
         * Search for indexed catalogs. The search query is build
         * depending on the catalog parsers getSearchQuery Method,
         * which expects an ActionContext instance.
         * @method search
         * @param {Object} ac
         * @param {Function} callback
         */
        DCCatalogIndex.prototype.search = function( ac, callback ) {
            var catalogName = ac.rest.originalparams.catalog || '01.BVA_Honorarordnung.dc.json',
                user = Y.doccirrus.auth.getSUForLocal(),
                parser = Y.doccirrus.api.catalog.getParserForCatalogName( catalogName ),
                query,
                catalog = Y.doccirrus.api.catalog.getCatalogDescriptorForName( ac.rest.originalparams.catalog ),
                itemsPerPage = ac.rest.originalparams.itemsPerPage || 10;

            function search() {
                async.parallel( [
                    function( done ) {
                        parser.search( ac, done );
                    }, function( done ) {
                        if( true === catalog.extensible ) {
                            ac.rest.options.sort = {count: -1};
                            parser.searchShort( ac, done );
                        } else {
                            done( null, [] );
                        }
                    }
                ], function( err, results ) {
                    if( err ) {
                        return callback( err );
                    }

                    if(results && results.length && results[1] && results[1].length) {
                        const uniqueSeqArr = [];

                        results[1] = results[1].filter( (item) => {
                            if(uniqueSeqArr.indexOf( item.seq ) === -1) {
                                uniqueSeqArr.push(item.seq);
                                return true;
                            } else {
                                return false;
                            }
                        } );
                    }

                    results[1] = results[1].slice( 0, 5 );
                    var uniqueSeq = [];
                    results[1].forEach( function setSeq( item ) {
                        uniqueSeq.push( item.seq );
                    } );
                    results[0].every( function checkForUnique( item ) {
                        if( -1 === uniqueSeq.indexOf( item.seq ) ) {
                            uniqueSeq.push( item.seq );
                            results[1].push( item );
                        }
                        if( results[1].length >= itemsPerPage ) {
                            return false;
                        } else {
                            return true;
                        }

                    } );
                    results[1].slice( 0, itemsPerPage );
                    callback( err, results[1] );
                } );
            }

            if( !parser ) {
                callback( new Error( 'Parser Not Found for ' + catalogName ) );
                return;
            }
            // default parser handles things different
            if( Y.doccirrus.catalogparser.default === parser ) {

                if( 'EBM' === catalog.short && ac.rest.originalparams.locationId ) {
                    // get kv specific ebm catalog by locationId

                    Y.doccirrus.api.catalog.getEBMDescriptorByLocationId( {
                        user: ac.rest.user,
                        originalParams: {
                            locationId: ac.rest.originalparams.locationId
                        },
                        callback: function( err, desc ) {
                            if( err ) {
                                Y.log( 'Error getting kv from locationId for EBM(851)' );
                                callback( err );
                                return;
                            }
                            catalog = desc;
                            ac.rest.originalparams.catalog = desc.filename;
                            search();
                        }
                    } );
                } else {
                    search();
                }
                return;
            }

            // kbvinsurance search needs to prioritize regional kv's
            if( Y.doccirrus.catalogparser.kbvinsurance === parser ) {
                parser.search( ac, callback );
                return;
            }

            query = parser.getSearchQuery( ac );

            if( !query ) {
                callback( new Error( 'Query For Parser Not Found' ) );
                return;
            }
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'catalog',
                query: query,
                options: ac.rest.options
            }, callback );

        };

        /**
         * Get catalog table entries. Optional these entries can be filtered by table name, key and an search term.
         *
         * @method getFromTables
         * @param  {Object} options
         *      - catalog {String}, (required) returns all entries (ex. 74E13101.sdkt.dc.json)
         *      - table {String}, filter entries by table (title attribute, ex. ktgruppe)
         *      - term {String}, value must contain this string (case insensitiv)
         * @param {Function} callback
         */
        DCCatalogIndex.prototype.getFromTables = function( options, callback ) {
            var user = Y.doccirrus.auth.getSUForLocal(),
                query = { $and: [
                    {key: { $exists: true }}
                ] };
            /*
             if( !options.catalog ) {
             callback( new Error( 'No catalog specified' ) );
             return;
             }
             */
            if( options.catalog ) {
                query.$and.push( {
                    catalog: options.catalog
                } );
            }
            if( options.table ) {
                query.$and.push( {
                    title: options.table
                } );
            }
            if( options.key ) {
                query.$and.push( {
                    key: options.key
                } );
            }
            if( options.term ) {
                query.$and.push( {
                    value: { $regex: options.term, $options: 'i' }
                } );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'catalog',
                query: query,
                options: {
                    sort: { key: 1}
                }
            }, callback );
        };

        // create our singleton
        catIndex = new DCCatalogIndex();
        // on ready autoload indexes
        Y.doccirrus.auth.onReady( function() {
            /**
             * dc-server will no longer index catalog jsons.
             * Instead a mongodump is restored if catalogmeta.version does not equal catalogsVersion in admin collection.
             * This is done in catalog-api on startup.
             * For now we keep this module and the json parsers, because they provide query and search functionality.
             */
            // MOJ-2445
            setTimeout( function() {
                //catIndex.autoload( reportResult );
            }, 5000 );
        } );

        Y.namespace( 'doccirrus' ).catalogindex = catIndex;

    },
    '0.0.1', {requires: ['dcauth', 'dcmongodb', 'catalog-api' ]}
);
