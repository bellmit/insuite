/**
 * User: do
 * Date: 06/01/16  11:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'dcruleimportutils', function( Y, NAME ) {

        const
            Prom = require( 'bluebird' ),
            SU = Y.doccirrus.auth.getSUForLocal();

        function getCatalogShortByName( name ) {
            const desc = Y.doccirrus.api.catalog.getCatalogDescriptorForName( name );
            return desc.short;
        }

        function setAgeCriteria( ageCriteria, value, unit, type ) {
            const age = getAgeInYears( value, unit );
            if( age ) {
                if( type === 'MIN' ) {
                    ageCriteria.$lt = age;
                } else if( type === 'MAX' ) {
                    ageCriteria.$gt = age;
                }
            }
            return ageCriteria;
        }

        function getAgeInYears( value, unit ) {
            value = +value;

            if( '8' === unit ) {
                return value;
            }
            // Days
            if( '4' === unit ) {
                return value / 365;
            }
            // Months
            if( '6' === unit ) {
                return value / 12;
            }
        }

        function forEachStream( user, modelName, query, iterator ) {
            const getModel = Prom.promisify( Y.doccirrus.mongodb.getModel );
            let stream,
                error,
                currentPromise;

            return getModel( user, modelName, true ).then( model => {

                return new Prom( function( resolve, reject ) {

                    function onData( entry ) {
                        stream.pause();
                        currentPromise = Prom.resolve( iterator( entry ) )
                            .then( () => stream.resume() )
                            .catch( err => (error = err, stream.destroy()) ); //eslint-disable-line no-return-assign
                    }

                    function onError( err ) {
                        error = err;
                    }

                    function onClose() {
                        if( currentPromise && currentPromise.isPending() ) {
                            Y.log( 'forEachStream: current promise is not settled yet, retry in 100ms', 'debug', NAME );
                            return setTimeout( onClose, 10 );
                        }

                        if( error ) {
                            reject( error );
                        } else {
                            resolve();
                        }
                    }

                    stream = model.mongoose.find( query, {}, {timeout: true} ).stream();
                    stream.on( 'data', onData ).on( 'error', onError ).on( 'close', onClose );
                } );

            } );

        }

        function forEachCatalogEntry( catalogShort, actType, iterator ) {
            const
                descriptors = Y.doccirrus.api.catalog.getCatalogDescriptor( {actType: actType, short: catalogShort} ),
                filename = descriptors && descriptors.filename,
                query = {
                    catalog: filename,
                    key: {$exists: false}
                };

            if( !filename ) {
                throw Error( 'could not find catalog descriptor for catalogShort ' + catalogShort );
            }

            return forEachStream( SU, 'catalog', query, iterator );
        }
        
        function mapCatalogShortToCaseFolderType( catalogShort ) {
            const map = {
                EBM: 'PUBLIC',
                GOÄ: 'PRIVATE',
                TARMED: 'PRIVATE_CH',
                TARMED_UVG_IVG_MVG: ['PRIVATE_CH_UVG', 'PRIVATE_CH_IVG', 'PRIVATE_CH_MVG', 'PRIVATE_CH_VVG'],
                Pandemieleistungen: ['PRIVATE_CH', 'PRIVATE_CH_UVG', 'PRIVATE_CH_MVG'],
                AMV: ['PRIVATE_CH_UVG'],
                UVGOÄ: 'BG'
            };
            return map[catalogShort];
        }

        function removeImportedRuleSets( user, catalogShort ) {
            const getModel = Prom.promisify( Y.doccirrus.mongodb.getModel );
            let query;

            if( catalogShort ) {
                query = {
                    fromCatalogShort: catalogShort
                };
            } else {
                return Prom.reject( 'No fromCatalogShort specified.' );
            }

            return getModel( user, 'rule' ).then( model => {
                return new Prom( function( resolve, reject ) {
                    model.mongoose.remove( query, function( err, result ) {
                            if( err ) {
                                reject( err );
                            } else {
                                resolve( result && result.result && result.result.n || 0 );
                            }
                        }
                    );
                } );
            } );

        }

        function getAgeQuery( value ) {
            let arr = [];
            (Array.isArray( value ) && value || []).forEach( o => {
                let obj = {};
                obj = setAgeCriteria( obj, o.value, o.unit, o.type );
                if( 0 < Object.keys( obj ).length ) {
                    arr.push( obj );
                }
            } );

            return arr;
        }

        function needsNewDirectory( count, limit ) {
            return (count / limit) % 1 === 0;
        }

        Y.namespace( 'doccirrus' ).ruleimportutils = {

            name: NAME,

            getCatalogShortByName: getCatalogShortByName,
            setAgeCriteria: setAgeCriteria,
            forEachCatalogEntry: forEachCatalogEntry,
            mapCatalogShortToCaseFolderType: mapCatalogShortToCaseFolderType,
            removeImportedRuleSets: removeImportedRuleSets,
            needsNewDirectory: needsNewDirectory,
            getAgeQuery: getAgeQuery

        };
    },
    '0.0.1', {requires: []}
);

