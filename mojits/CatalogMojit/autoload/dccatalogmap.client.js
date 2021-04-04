/**
 * User: rw
 * Date: 23.12.13  20:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'dccatalogmap', function( Y, NAME ) {
        'use strict';

        /**
         * In this class we gather all the metadata concerning each catalog,
         * including display text, filters, filenames for json.
         *
         * Also allow a direct per catalog default filter.
         *
         * @class DCCatalogMap
         */
        var
            catalogList,
        // our singleton
            catMap;

        /**
         * returns a catalog object by activity type
         * @param {String} actType
         * @returns {Object}
         */
        function getCatalogForActivityType( actType ) {
            var result = {},
                catalog;

            if( catalogList && catalogList.hasOwnProperty( actType ) ) {
                catalog = catalogList[actType].cat;
            } else {
                Y.log( 'No catalog for activity type: ' + actType, 'warn', NAME );
                //alert('Missing catalog for actType: ' + actType);
                return result;
            }

            if( Array.isArray( catalog ) ) {
                result.filename = catalog[0].filename;
                result.short = catalog[0].short;
            }
            return result;
        }

        function DCCatalogMap() {
        }

        DCCatalogMap.prototype.init = function( list ) {
            if( list ) {
                catalogList = list;
            } else {
                Y.log("No catalog list.","error",NAME);
            }
        };

        /**
         * Given an activity, which catalog should be used to
         * look up info for this activity.
         *
         * Uses REST call to get all Lists and caches these until reload.
         *
         * @method getCatalogForActivity
         * @param activity {Object} an activity model serialized to JSON / or activity data object
         * @returns {{text: string, fileName: string}} text is the display name of the catalog.
         */
        DCCatalogMap.prototype.getCatalogForActivity = function( activity ) {
            var
                result = {};
            if( activity && activity.actType && catalogList[activity.actType] ) {
                result = getCatalogForActivityType( activity.actType );
            }
            return result;
        };

        /**
         * Returns an array of catalog objects matching the options. If no options are passed,
         * all catalogs are returned.
         *
         * @param options
         *      - actType
         *      - short
         *      - filename
         */
        DCCatalogMap.prototype.getCatalogs = function( options ) {
            var results = [],
                tmp,
                actTypeCatalogs;
            options = options || {};
            function findByActType( actType ) {
                if ( !catalogList ) {
                    Y.log( 'Called getCatalogs before catalog list loaded.', 'warn', NAME );
                    return;
                }

                if ( !catalogList[actType] ) {
                    Y.log( 'Catalog list does not support this activity type: ' + actType, 'warn', NAME );
                    return;
                }

                actTypeCatalogs = catalogList[actType];
                if( !actTypeCatalogs || !actTypeCatalogs.cat ) {
                    return;
                }
                tmp = Y.doccirrus.commonutils.filterByCriteria( actTypeCatalogs.cat, options, {
                    pass: 'some',
                    blacklist: ['actType', 'country'],
                    necessaryList: ['country'] // if the 'country' field is present, it is treated as a necessary condition
                } );

                results = results.concat( tmp );
            }

            if( options.actType ) {
                findByActType( options.actType );
            } else {
                Y.Object.each( catalogList, function( val, key ) {
                    findByActType( key );
                } );
            }
            return results;
        };

        /**
         * returns catalog for diagnoses
         * @returns {Object}
         */
        DCCatalogMap.prototype.getCatalogForDiagnosis = function() {
            return getCatalogForActivityType( 'DIAGNOSIS' );
        };

        /**
         * returns catalog for insurance type
         * @returns {Object}
         */
        DCCatalogMap.prototype.getCatalogForInsuranceType = function( type ) {
            switch( type ) {
                case 'PUBLIC':
                    return this.getCatalogSDKT(); // return GKV
                case 'PRIVATE':
                    return this.getCatalogPKV();
                case 'BG':
                    return this.getCatalogBG(); // return PKV
                case 'PRIVCHOICE':
                    return getCatalogForActivityType( '_CUSTOM' ); // return BVA
            }
            return null;
        };

        /**
         * returns catalog SDKT
         * @returns {null|Object}
         */
        DCCatalogMap.prototype.getCatalogSDKT = function() {
            var result = null,
                catalogList = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: '_CUSTOM',
                    short: 'SDKT'
                } );
            if( catalogList.length ) {
                result = catalogList[0];
            }
            return result;
        };

        /**
         * returns catalog PKV
         * @returns {null|Object}
         */
        DCCatalogMap.prototype.getCatalogPKV = function() {
            var result = null,
                catalogList = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: '_CUSTOM',
                    short: 'PKV'
                } );
            if( catalogList.length ) {
                result = catalogList[0];
            }
            return result;
        };
        /**
         * returns catalog BG
         * @returns {null|Object}
         */
        DCCatalogMap.prototype.getCatalogBG = function() {
            var result = null,
                catalogList = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: '_CUSTOM',
                    short: 'BG'
                } );
            if( catalogList.length ) {
                result = catalogList[0];
            }
            return result;
        };

        /**
         * returns catalog SDCOUNTRIES
         * @returns {null|Object}
         */
        DCCatalogMap.prototype.getCatalogSDCOUNTRIES = function() {
            var result = null,
                catalogList = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: '_CUSTOM',
                    short: 'SDCOUNTRIES'
                } );
            if( catalogList.length ) {
                result = catalogList[0];
            }
            return result;
        };

        /**
         * returns catalog SDPLZ
         * @returns {null|Object}
         */
        DCCatalogMap.prototype.getCatalogSDPLZ = function() {
            var result = null,
                catalogList = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: '_CUSTOM',
                    short: 'SDPLZ'
                } );
            if( catalogList.length ) {
                result = catalogList[0];
            }
            return result;
        };

        /**
         * returns catalog Zip
         * @returns {null|Object}
         */
        DCCatalogMap.prototype.getCatalogZip = function( countryCode ) {
            var result = null,
                filterValue,
                catalogList = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: '_CUSTOM',
                    short: 'PLZ'
                } );
            if( catalogList.length ) {
                if( countryCode ) {
                    filterValue = catalogList.filter( function( item ) {
                        return item.country === countryCode;
                    });
                    if( filterValue[0] ) {
                        result = filterValue[0];
                    } else {
                        result = catalogList[0];
                    }
                } else {
                    result = catalogList[0];
                }
            }
            return result;
        };

        /**
         * returns catalog EBM
         * @returns {null|Object}
         */
        DCCatalogMap.prototype.getCatalogEBM = function() {
            var result = null,
                catalogList = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: 'TREATMENT',
                    short: 'EBM'
                } );
            if( catalogList.length ) {
                result = catalogList[0];
            }
            return result;
        };

        /**
         * returns catalog SDAV
         * @returns {null|Object}
         */
        DCCatalogMap.prototype.getCatalogSDAV = function() {
            var result = null,
                catalogList = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: '_CUSTOM',
                    short: 'SDAV'
                } );
            if( catalogList.length ) {
                result = catalogList[0];
            }
            return result;
        };

        /**
         * returns catalog OMIM
         * @returns {null|Object}
         */
        DCCatalogMap.prototype.getCatalogOMIM= function() {
            var result = null,
                catalogList = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: '_CUSTOM',
                    short: 'OMIM'
                } );
            if( catalogList.length ) {
                result = catalogList[0];
            }
            return result;
        };

        /**
         * returns catalog dale uv gkv "stammdaten"
         * @returns {null|Object}
         */
        DCCatalogMap.prototype.getCatalogDALEUVKT = function() {
            var result = null,
                catalogList = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: '_CUSTOM',
                    short: 'DALEUVKT'
                } );
            if( catalogList.length ) {
                result = catalogList[0];
            }
            return result;
        };

        /**
         * returns catalog SDDA "stammdaten"
         * @returns {null|Object}
         */
        DCCatalogMap.prototype.getCatalogSDDA = function() {
            var result = null,
                catalogList = Y.doccirrus.catalogmap.getCatalogs( {
                    actType: '_CUSTOM',
                    short: 'SDDA'
                } );
            if( catalogList.length ) {
                result = catalogList[0];
            }
            return result;
        };

        // create our singleton
        catMap = new DCCatalogMap();

        // export our singleton (catMap) to YUI namespace under name "catalog"
        Y.namespace( 'doccirrus' ).catalogmap = catMap;

    },
    '0.0.1', {
        requires: [
            'dccommonutils'
        ]
    }
);
