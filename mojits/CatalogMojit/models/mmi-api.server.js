/**
 * User: pi
 * Date: 25/09/2014  15:13
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'mmi-api', function( Y, NAME ) {
        /**
         * @module mmi-api
         */
        let defaultMappings,
            mmiConnect = require( 'dc-core' ).config.load( `${process.cwd()}/mmiconnect.json` );
        const i18n = Y.doccirrus.i18n;
        const NEW_MMI_VERSION = i18n( 'communications.message.NEW_MMI_VERSION' );
        const {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils;
        const MMI_ADMIN_ID = Y.doccirrus.schemas.admin.getMmiId();
        const getMetaDataAsync = promisifyArgsCallback( getMetaData );

        async function getDatabaseMMIVersion( args ) {
            const {user} = args;
            let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'admin',
                query: {
                    _id: MMI_ADMIN_ID
                },
                migrate: true,
                options: {limit: 1}
            } ) );

            if( err ) {
                Y.log( `could not get mmi version from insuite db: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            return results && results[0] && results[0].mmiVersion;
        }

        async function wasMMIUpdated( args ) {
            const {user, mmiVersion} = args;
            let [err, mmiInSuiteDbVersion] = await formatPromiseResult( getDatabaseMMIVersion( {user} ) );
            if( err ) {
                Y.log( `could not check if mmi was updated: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            return mmiVersion !== mmiInSuiteDbVersion;
        }

        async function setMMIWasUpdated( args ) {
            const {user, mmiVersion} = args;

            let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'admin',
                action: 'upsert',
                query: {
                    _id: MMI_ADMIN_ID
                },
                migrate: true,
                data: {
                    mmiVersion,
                    skipcheck_: true
                }
            } ) );

            if( err ) {
                Y.log( `could not set new mmi version: ${mmiVersion}: ${err.stack}`, 'warn', NAME );
                throw err;
            }

            Y.log( `updated tenant ${user.tenantId} mmi version in admin db: ${JSON.stringify( results )}`, 'info', NAME );
        }

        async function getMMIVersion() {
            let [err, result] = await formatPromiseResult( getMetaDataAsync( {} ) );

            if( err ) {
                Y.log( `could not get MMI version`, 'warn', NAME );
                throw err;
            }

            const drugUpdate = result && result.drugUpdate;
            const priceUpdate = result && result.priceUpdate;
            if( !drugUpdate || !priceUpdate ) {
                throw Error( 'could not find mmi version' );
            }

            return `${drugUpdate}-${priceUpdate}`;
        }



        async function checkIfChangeLogCreationIsNeeded( user ) {
            let [err, mmiVersion] = await formatPromiseResult( getMMIVersion() );

            let createChangeListResult;
            let wasUpdated, wasUpdatedErr;
            [wasUpdatedErr, wasUpdated] = await formatPromiseResult( wasMMIUpdated( {user, mmiVersion} ) );

            if( !err && !wasUpdatedErr && wasUpdated ) {
                Y.log( `mmi was updated: create change list on ${user.tenantId}`, 'info', NAME );

                [err, createChangeListResult] = await formatPromiseResult( Y.doccirrus.api.changelog.server.createMMIChangeListForTenant( {user, mmiVersion} ) );
                if( err ) {
                    Y.log( `error while creating change list on tenant: ${user.tenantId}: ${err.stack || err}}`, 'warn', NAME );
                } else {
                    let updateMmiDbVersionResult;
                    [err, updateMmiDbVersionResult] = await formatPromiseResult( setMMIWasUpdated( {user, mmiVersion} ) );
                    if( err ) {
                        Y.log( `error while creating change list on tenant: ${user.tenantId}: ${err.stack || err}}`, 'warn', NAME );
                    } else {
                        Y.log( `updated mmi version insuite db: ${updateMmiDbVersionResult}`, 'info', NAME );
                    }
                }
            } else if( !err && !wasUpdatedErr ) {
                Y.log( `mmi not updated: no need to create change list on ${user.tenantId}`, 'info', NAME );
            }

            return createChangeListResult || null;
        }

        async function initMMIService( callback ) {
            Y.log( `initMMIService`, 'info', NAME );
            if( !Y.doccirrus.ipc.isMaster() ) {
                return callback();
            }
            let [err, results] = await formatPromiseResult( Y.doccirrus.utils.iterateTenants( checkIfChangeLogCreationIsNeeded ) );
            if( err ) {
                Y.log( `error while iterating tenants to create mmi/catalogusage change list: ${err.stack || err}`, 'error', NAME );
            } else {
                Y.log( `create mmi/catalogusage change list on tenants" ${results}`, 'info', NAME );
                if( results && results.filter( Boolean ).length ) {
                    Y.doccirrus.communication.emitEventForAll( {
                        event: 'message',
                        eventType: Y.doccirrus.schemas.socketioevent.eventTypes.CONFIRM,
                        msg: {data: NEW_MMI_VERSION},
                        global: 'true'
                    } );
                }
            }

            callback( err );
        }


        /**
         * Shortcut for 'getCatalogEntries' with parameter 'catalogShortName' equals 'ATC'
         * @method getATCCatalogEntries
         * @see Y.doccirrus.api.mmi.getCatalogEntries
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query]
         * @param {String} [args.query.code]  ATC code
         * @param {String} [args.query.name]  ATC 'name'
         * @param {String} [args.query.children=1] 1 - display 'children', 0 - hide
         * @param {String} [args.query.parents=0]  1 - display  'parents', 0 - hide
         * @param {Number} [args.query.maxResult=0] request parameter 'maxResult' sets amount of result items
         * @param {Function} args.callback
         */
        function getATCCatalogEntries( args ) {
            var queryParams = args.query || {},
                requestParams = {
                    user: args.user,
                    query: {
                        code: queryParams.code,
                        name: queryParams.name,
                        catalogShortName: 'ATC',
                        children: queryParams.children || 1,
                        parents: queryParams.parents || 0,
                        maxResult: queryParams.maxResult || 0
                    },
                    callback: args.callback
                };

            if( requestParams.query.code === '*' ) {
                // to get all catalog entries
                delete requestParams.query.code;
            }

            Y.doccirrus.api.mmi.getCatalogEntries( requestParams );
        }

        /**
         * Sends 'getMolecules' request to MMI Catalog
         * @method getMolecules
         * @param {Object} args
         * @param {Object} [args.query]
         * @param {String} [args.query.name] Molecule 'name'
         * @param {Number} [args.query.maxResult=0] request parameter 'maxResult' sets amount of result items
         * @param {Function} args.callback
         * @for doccirrus.api.mmi
         */
        function getMolecules( args ) {
            var queryParams = args.query || {},
                requestParams = {
                    query: {
                        method: 'getMolecules',
                        params: {
                            name: queryParams.name,
                            maxresult: queryParams.maxResult || 0
                        }
                    },
                    callback: args.callback
                };
            Y.doccirrus.api.mmi.sendRequest( requestParams );
        }

        /**
         * Sends 'getCatalogEntries' request to MMI Catalog
         * @method getCatalogEntries
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query]
         * @param {String} [args.query.code]  Entry 'code'
         * @param {String} [args.query.name]  Entry 'name'
         * @param {String} [args.query.catalogShortName]  short name of catalog
         * @param {String} [args.query.children=1] 1 - display 'children', 0 - hide
         * @param {String} [args.query.parents=0]  1 - display  'parents', 0 - hide
         * @param {Number} [args.query.maxResult=0] request parameter 'maxResult' sets amount of result items
         * @param {Function} args.callback
         * @for doccirrus.api.mmi
         */
        function getCatalogEntries( args ) {
            var queryParams = args.query || {},
                requestParams = {
                    user: args.user,
                    query: {
                        method: 'getCatalogEntries',
                        params: {
                            code: queryParams.code,
                            name: queryParams.name,
                            catalogshortname: queryParams.catalogShortName,
                            children: queryParams.children || 1,
                            parents: queryParams.parents || 0,
                            maxresult: queryParams.maxResult || 0
                        }
                    },
                    callback: args.callback
                };
            Y.doccirrus.api.mmi.sendRequest( requestParams );

        }

        /**
         * Sends 'getProducts' request to MMI Catalog
         * @method getProducts
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query]
         * @param {String} [args.query.name]  product 'name'
         * @param {String} [args.query.companyName]  product 'companyName'
         * @param {Array} [args.query.atcCodeList]  list of ATC codes
         * @param {Array} [args.query.moleculeIdList]  list of molecule ids
         * @param {Array} [args.query.pznList]  list of PZN codes
         * @param {Number} [args.query.maxResult=0] request parameter 'maxResult' sets amount of result items
         * @param {Number} [args.query.page=0] page number
         * @param {Number} [args.query.pageSize=0] page size
         * @param {Function} args.callback
         *  @for doccirrus.api.mmi
         */
        function getProducts( args ) {
            var queryParams = args.query || {},
                requestParams = {
                    user: args.user,
                    query: {
                        method: 'getProducts',
                        params: {
                            name: queryParams.name,
                            companyname: queryParams.companyName,
                            moleculename: queryParams.moleculeName,
                            atccode_orlist: queryParams.atcCodeList,
                            moleculeid_andlist: queryParams.moleculeIdList,
                            insuranceiknr: queryParams.insuranceIknr,
                            pzn_orlist: queryParams.pznList,
                            maxresult: queryParams.maxResult || 0,
                            page: queryParams.page || 0,
                            pagesize: queryParams.pageSize || 0,
                            sortorder: 'KBV',
                            icd_orlist: queryParams.ICD10List
                        }
                    },
                    callback: args.callback
                };
            Y.doccirrus.api.mmi.sendRequest( requestParams );
        }

        /**
         * Sends request to MMI via POST, used for generating Medicationplan PDFs MOJ-11356
         * @method sendRequest
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.method name of get method, e.g. 'getCatalogEntries'
         * @param {Object} args.query.params parameters for request
         * @param {Function} args.callback
         * @for doccirrus.api.mmi
         */

        function sendRequestPost( args ) {
            var
                needle = require( 'needle' ),
                credential = mmiConnect && mmiConnect.credential,
                commonerrors = Y.doccirrus.commonerrors,
                { query, callback }  = args,
                SAMPLEUSERNAME = credential && credential.username,
                SAMPLEKEY = credential && credential.key,
                url = 'http://localhost:7777/rest/pharmindexv2/' +
                    query.method + '/' +
                    SAMPLEKEY + '/' +
                    SAMPLEUSERNAME + '/',

                options = {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000
                };

            Y.log( 'send request to mmi API, url: ' + url, 'debug', NAME );
            Y.log( 'send request to mmi API, params: ' + JSON.stringify( query.params ), 'debug', NAME );
            needle.post( url, JSON.stringify( query.params, undefined, 2 ), options, onNeedleRequest );

            function onNeedleRequest( err, response ) {

                if( err ) {
                    if( 'ECONNREFUSED' === err.code){
                        return callback( new commonerrors.DCError( 9001 ) );
                    }
                    return callback( err );
                }
                if( response.body && response.body.STATUS && 4 === response.body.STATUS.code && 0 === response.body.COUNT ) {
                    Y.log( `sendRequest: MMI ERROR (1): response.body: ${response.body}`, 'error', NAME );
                    return callback( new commonerrors.DCError( 9000 ) );
                }
                if( typeof response.body !== 'object' ) {
                    Y.log( `sendRequest: MMI ERROR (2): response.body: ${response.body}`, 'error', NAME );
                    return callback( new commonerrors.DCError( 9003 ) );
                }

                return callback( err, response.body );
            }

        }

        /**
         * Sends request to MMI Catalog
         * @method sendRequest
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} args.query.method name of get method, e.g. 'getCatalogEntries'
         * @param {Object} args.query.params parameters for request
         * @param {Function} args.callback
         * @for doccirrus.api.mmi
         */

        function sendRequest( args ) {
            var needle = require( 'needle' ),
                credential = mmiConnect && mmiConnect.credential,
                commonerrors = Y.doccirrus.commonerrors,
                { query, callback }  = args,
                SAMPLEUSERNAME = credential && credential.username,
                SAMPLEKEY = credential && credential.key,
                url = 'http://localhost:7777/rest/pharmindexv2/' +
                      query.method + '/' +
                      SAMPLEKEY + '/' +
                      SAMPLEUSERNAME + '/' +
                      encodeURIComponent( JSON.stringify( query.params ) );

            Y.log( 'send request to mmi API, url: ' + url, 'debug', NAME );
            Y.log( 'send request to mmi API, params: ' + JSON.stringify( query.params ), 'debug', NAME );
            needle.get( url, { timeout: 30000 }, function( err, response ) {
                if( err ) {
                    if( 'ECONNREFUSED' === err.code){
                        return callback( new commonerrors.DCError( 9001 ) );
                    }
                    return callback( err );
                }
                if( response.body && response.body.STATUS && 4 === response.body.STATUS.code && 0 === response.body.COUNT ) {
                    Y.log( `sendRequest: MMI ERROR (1): response.body: ${response.body}`, 'error', NAME );
                    return callback( new commonerrors.DCError( 9000 ) );
                }
                if( typeof response.body !== 'object' ) {
                    Y.log( `sendRequest: MMI ERROR (2): response.body: ${response.body}`, 'error', NAME );
                    return callback( new commonerrors.DCError( 9003 ) );
                }

                return callback( err, response.body );
            } );
        }

        /**
         * Catalog entries the client needs to display product values.
         * Some product values have catalog codes, we need to be map these codes client-side to display them properly.
         * @method  getMappingCatalogEntries
         * @param   {Object}          args
         */
        function getMappingCatalogEntries( args ) {
            var result = {};

            function finalCb( err ) {
                args.callback( err, result );
            }

            function getEntries( catalogShortName, _cb ) {

                function entiresCb( err, entries ) {
                    if( err ) {
                        Y.log( `Error getting catalog entries for ${catalogShortName}: ${err.stack || err}`, 'warn', NAME );
                        _cb( err );
                        return;
                    }
                    result[ catalogShortName ] = entries;
                    _cb();
                }

                Y.doccirrus.api.mmi.getCatalogEntries( {
                    query: {
                        catalogShortName: catalogShortName
                    },
                    callback: entiresCb
                } );
            }

            if( !args || !args.query || !args.query.catalogShortNames ) {
                args.callback( new Error( 'Missing Paramter' ) );
                return;
            }

            require( 'async' ).each( args.query.catalogShortNames, getEntries, finalCb );

        }

        /**
         * Sends 'getPackages' request to MMI Catalog
         * @method getPackages
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query]
         * @param {String} [args.query.name] package 'name'
         * @param {Array} [args.query.packageIdList] list(or) of package ids
         * @param {Array} [args.query.productIdList] list(or) of product ids
         * @param {Array} [args.query.atcCodeList]  list of ATC codes
         * @param {Array} [args.query.moleculeidList] list(and) of molecule ids
         * @param {Array} [args.query.moleculeType] 'all' (default) | 'active' | 'inactive'
         * @param {Array} [args.query.pznList] list(or) of PZN codes
         * @param {Number} [args.query.maxResult=0] request parameter 'maxResult' sets amount of result items
         * @param {Number} [args.query.priceComparisonGroupId] id of price comparison group
         * @param {Number} [args.query.sortOrder=KBV] specification for sorting
         * @param {Number} [args.query.page=0] page number
         * @param {Number} [args.query.pageSize=0] page size
         * @param {String} [args.query.disabledList] list of objects names which should be disabled from result
         * @param {Function} args.callback
         * @for doccirrus.api.mmi
         */
        function getPackages( args ) {
            let moleculetype;
            if( ['all', 'active', 'inactive'].includes( args.query.moleculeType ) ) {
                moleculetype = args.query.moleculeType;
            } else if( ['activeMulti', 'activeMono'].includes( args.query.moleculeType ) ) {
                moleculetype = 'ACTIVE';
            }

            var queryParams = args.query || {},
                requestParams = {
                    user: args.user,
                    query: {
                        method: 'getPackages',
                        params: {
                            name: queryParams.name,
                            packageid_orlist: queryParams.packageIdList,
                            productid_orlist: queryParams.productIdList,
                            moleculemass_andlist: queryParams.moleculeMassList,
                            moleculetype,
                            atccode_orlist: queryParams.atcCodeList,
                            companyname: queryParams.companyName,
                            pzn_orlist: queryParams.pznList,
                            maxresult: queryParams.maxResult || 0,
                            pricecomparisongroupid: queryParams.priceComparisonGroupId,
                            pricecomparisonpzn: queryParams.priceComparisonPzn,
                            insuranceiknr: queryParams.insuranceIknr,
                            insurancediscountfilter: queryParams.insuranceDiscountFilter,
                            sortorder: (undefined === queryParams.sortOrder) ? 'KBV' : queryParams.sortOrder,
                            page: queryParams.page || 0,
                            pagesize: queryParams.pageSize || 0,
                            disabledobjects: queryParams.disabledList || ["PRODUCT"]
                        }
                    },
                    callback: args.callback
                };
            if( ['all', 'active', 'activeMulti', 'inactive'].includes( args.query.moleculeType ) ) {
                requestParams.query.params.moleculeid_andlist = queryParams.moleculeIdList;
            } else {
                requestParams.query.params.moleculeid_orlist = queryParams.moleculeIdList;
            }
            if( ['activeMulti', 'activeMono'].includes( args.query.moleculeType ) ) {
                requestParams.query.params.exactActiveMoleculeMatch = true;
            }

            Y.doccirrus.api.mmi.sendRequest( requestParams );
        }

        /**
         * Sends 'getDocuments' request to MMI Catalog
         * @method getDocuments
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query]
         * @param {Number} [args.query.documentId] document id
         * @param {Number} [args.query.moleculeId] molecule id
         * @param {Number} [args.query.productId] product id
         * @param {String} [args.query.pzn] pzn code
         * @param {String} [args.query.documentTypeCode] document type code
         * @param {Array} [args.query.documentCategoryCodeList] of document category codes
         * @param {Array} [args.query.documentCategoryGroupCodeList] list of document category group codes
         * @param {Number} [args.query.contentFilter] 0 - Content is included, 1 - is not
         * @param {Number} [args.query.maxResult=0] request parameter 'maxResult' sets amount of result items
         * @param {Function} args.callback
         * @for doccirrus.api.mmi
         */
        function getDocuments( args ) {
            var queryParams = args.query || {},
                requestParams = {
                    user: args.user,
                    query: {
                        method: 'getDocuments',
                        params: {
                            documentid: queryParams.documentId,
                            moleculeid: queryParams.moleculeId,
                            productid: queryParams.productId,
                            pzn: queryParams.pzn,
                            documenttypecode: queryParams.documentTypeCode,
                            documentcategorycode_orlist: queryParams.documentCategoryCodeList,
                            documentcategorygroupcode_orlist: queryParams.documentCategoryGroupCodeList,
                            contentfilter: queryParams.contentFilter,
                            maxresult: queryParams.maxResult || 0,
                            sortorder: 'KBV'
                        }
                    },
                    callback: args.callback
                };// maximumSelectionSize: 1,
            Y.doccirrus.api.mmi.sendRequest( requestParams );
        }

        /**
         * Sends 'getAMR' request to MMI Catalog
         * @method getAMR
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query]
         * @param {Number} [args.query.productId] product id
         * @param {Number} [args.query.packageId] package id
         * @param {Number} [args.query.regulationTypeCodeList=['1','2','3','4']] List of regulation type codes (e.g. ["1","3","4"])
         * @param {String} [args.query.pzn] pzn code
         * @param {Number} [args.query.maxResult=0] request parameter 'maxResult' sets amount of result items
         * @param {Function} args.callback
         * @for doccirrus.api.mmi
         */
        function getAMR( args ) {
            var queryParams = args.query || {},
                requestParams = {
                    user: args.user,
                    query: {
                        method: 'getAMR',
                        params: {
                            productid: queryParams.productId,
                            packageid: queryParams.packageId,
                            pzn: queryParams.pzn,
                            maxresult: queryParams.maxResult || 0,
                            sortorder: 'KBV'
                        }
                    },
                    callback: args.callback
                };
            Y.doccirrus.api.mmi.sendRequest( requestParams );
        }

        /**
         * Sends 'getProductsDetails' request to MMI Catalog
         * returns mapped object with product data
         * @method getProductsDetails
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query]
         * @param {String} [args.query.name]  product 'name'
         * @param {String} [args.query.companyName]  product 'companyName'
         * @param {Array} [args.query.atcCodeList]  list of ATC codes
         * @param {Array} [args.query.moleculeIdList]  list of molecule ids
         * @param {Array} [args.query.pznList]  list of PZN codes
         * @param {Number} [args.query.maxResult=0] request parameter 'maxResult' sets amount of result items
         * @param {Function} args.callback
         * @param {Object} args.originalParams
         * @param {Integer} args.originalParams.page page number
         * @param {Integer} args.originalParamsitemsPerPage size of page
         * @for doccirrus.api.mmi
         * @see getProducts
         */
        function getProductsDetails( args ) {
            var queryParams = args.query || {},
                originalParams = args.originalParams || {},
                async = require( 'async' );

            function parseProductResponse( err, data ) {
                if( err ) {
                    return args.callback( err );
                }
                if( data ) {
                    data.patientAge = queryParams.patientAge;
                }
                async.series( [
                    function( done ) {
                        _mapProducts( {error: err, data, next: done} );
                    }
                ], function( err, results ) {

                    if( !err && results && results[ 0 ] ) {
                        results[ 0 ].count = data && data.COUNT;
                        return args.callback( err, results[ 0 ] );
                    }
                    return args.callback( err );
                } );
            }

            args.query.pageSize = originalParams.itemsPerPage;
            args.query.page = (0 === originalParams.page) ? 1 : originalParams.page;
            Y.doccirrus.api.mmi.getProducts( {
                user: args.user,
                query: args.query,
                callback: parseProductResponse
            } );
        }

        function _mapProducts( args ) {
            const {error, data, next, doMinimalMapping = false} = args;
            var async = require( 'async' ),
                products = [],
                patientAge = data && data.patientAge;

            if( error ) {
                return next( error );
            }
            if( !data ) {
                return next( error, data );
            }

            if( !data.PRODUCT || 0 === data.PRODUCT.length ) {
                return next( error, products );
            }

            function mapNameByCode( catalogShortName, code ) {
                var found = '',
                    entries = defaultMappings && defaultMappings[ catalogShortName ] && defaultMappings[ catalogShortName ].CATALOGENTRY;

                if( !entries ) {
                    return;
                }

                entries.some( function( entry ) {
                    if( entry.CODE === code ) {
                        found = entry.NAME;
                        return true;
                    }
                } );

                return found;

            }

            function mapIconCode( code ) {
                var iconMap = {
                        'AP*': 'APA'
                    },
                    iconCode = iconMap[ code ] || code,
                    iconTitle = mapNameByCode( 'PRODUCTSIGN', code );
                return {
                    src: iconCode,
                    title: iconTitle
                };
            }

            async.series( [
                function( done ) {
                    if( !defaultMappings ) {
                        Y.doccirrus.api.mmi.getMappingCatalogEntries( {
                            query: {
                                catalogShortNames: [ 'MOLECULETYPE', 'MOLECULEUNIT', 'PHARMFORM', 'PRODUCTSIGN' ]
                            },
                            callback: function( err, data ) {
                                defaultMappings = data;
                                done( err, data );
                            }
                        } );
                    } else {
                        return done();
                    }
                },
                function( done ) {
                    function mapProduct( product, done ) {
                        var result = {
                            phAtc: [],
                            phAtcDisplay: [],
                            phIcons: [],
                            phIngr: [],
                            phIngrOther: [],
                            phEqual: [],
                            phIdenta: [],
                            phAMRText: []
                        };

                        function mapMolecule( molecule ) {
                            let
                                shortName = molecule.MOLECULENAME || '',
                                equivalent;

                            //  MOJ-10758 Add shortName of molecule if available
                            if ( molecule.EQUIVALENT_LIST ) {
                                for ( equivalent of molecule.EQUIVALENT_LIST ) {
                                    if (
                                        ( equivalent.ID === molecule.ID )  &&
                                        ( equivalent.MOLECULENAME ) &&
                                        ( equivalent.MOLECULENAME.length < shortName.length )
                                    ) {
                                        shortName = equivalent.MOLECULENAME;
                                    }
                                }
                            }

                            return {
                                code: molecule.ID,
                                name: molecule.MOLECULENAME,
                                shortName: shortName,
                                strength: mapStrength( molecule )
                            };
                        }

                        function mapStrength( molecule ){
                            let
                                massform = Y.doccirrus.comctl.numberToLocalString( molecule.MASSFROM, { intWithoutDec: true } ),
                                unitCode = massform && mapNameByCode( 'MOLECULEUNIT', molecule.MOLECULEUNITCODE ) || '';
                            return `${massform} ${unitCode}`;
                        }

                        result.id = product.ID;
                        result.title = product.NAME;
                        result.userContent = product.NAME; // was previously result.content, moved for MOJ-8766
                        result.phTer = Boolean( product.RECIPET_FLAG );
                        result.phTrans = Boolean( product.TRANSFUSIONLAW_FLAG );
                        result.phImport = Boolean( product.IMPORT_FLAG );
                        result.phNegative = Boolean( product.NEGATIVE_FLAG );
                        result.phLifeStyle = 1 === product.LIFESTYLE_FLAG;
                        result.phLifeStyleCond = 2 === product.LIFESTYLE_FLAG;
                        result.phGBA = Boolean( product.THERAPYHINTNAME );
                        result.phDisAgr = Boolean( product.DISAGR_FLAG );
                        result.phDisAgrAlt = Boolean( product.DISAGR_ALTERNATIVEEXIST_FLAG );
                        result.phMed = Boolean( product.MEDICINEPRODUCT_FLAG );
                        result.phPrescMed = Boolean( product.MEDICINEPRODUCTEXCEPTION_FLAG );
                        result.phCompany = product.COMPANYNAME;
                        result.phOTC = "0" === product.DISPENSINGTYPECODE;
                        result.phOnly = "1" === product.DISPENSINGTYPECODE;
                        result.phRecipeOnly = "2" === product.DISPENSINGTYPECODE;
                        result.phBTM = "3" === product.DISPENSINGTYPECODE;
                        result.phContraceptive = (product.ADDITIONALFLAGS || []).some( flag => flag.NAME === 'CONTRACEPTIVE_FLAG' && flag.VALUE === '1' );
                        result.phGBATherapyHintName = product.THERAPYHINTNAME;
                        //result.phDisagr = Boolean( product.DISAGR_FLAG );
                        //result.phDisagrAlt = Boolean( product.DISAGR_ALTERNATIVEEXIST_FLAG );


                        result.original = product;

                        if( product.ITEM_LIST ) {
                            product.ITEM_LIST.forEach( function( item ) {
                                if( item.ATCCODE_LIST && !doMinimalMapping ) {
                                    item.ATCCODE_LIST.forEach( function( atc ) {
                                        var atcHierarchy = [];
                                        result.phAtc.push( atc.CODE );
                                        while( atc ) {
                                            atcHierarchy.push( {
                                                name: atc.NAME,
                                                code: atc.CODE
                                            } );
                                            atc = atc.PARENT;
                                        }
                                        Array.prototype.push.apply( result.phAtcDisplay, atcHierarchy.reverse() );
                                    } );
                                }
                                if( item.COMPOSITIONELEMENTS_LIST && !doMinimalMapping ) {
                                    item.COMPOSITIONELEMENTS_LIST.forEach( function( component ) {
                                        if( 'A' === component.MOLECULETYPECODE ) {
                                            // active molecule
                                            result.phIngr.push( mapMolecule( component ) );

                                        } else {
                                            result.phIngrOther.push( mapMolecule( component ) );
                                        }

                                        if( component.EQUIVALENT_LIST ) {
                                            component.EQUIVALENT_LIST.forEach( function( equivalent ) {
                                                result.phEqual.push( mapMolecule( equivalent ) );
                                            } );

                                        }
                                    } );
                                }
                                if( defaultMappings && defaultMappings.PHARMFORM && defaultMappings.PHARMFORM.CATALOGENTRY ) {
                                    defaultMappings.PHARMFORM.CATALOGENTRY.some( function( formatEntry ) {
                                        // TODO: avwg make this code reusable
                                        if( item.PHARMFORMCODE === formatEntry.CODE ) {
                                            result.phForm = formatEntry.NAME;
                                            return true;
                                        }
                                        return false;
                                    } );
                                }

                                if( item.IDENTA && (item.IDENTA.DIAMETER || item.IDENTA.HEIGTH || item.IDENTA.WEIGHT || item.IDENTA.IMAGENAME ) ) {
                                    result.phIdenta.push( {
                                        diameter: item.IDENTA.DIAMETER,
                                        height: item.IDENTA.HEIGTH,
                                        weight: item.IDENTA.WEIGHT,
                                        image: item.IDENTA.IMAGENAME
                                    } );
                                }
                            } );
                        }
                        if( product.ICONCODE_LIST ) {
                            product.ICONCODE_LIST.forEach( function( icon ) {
                                result.phIcons.push( mapIconCode( icon ) );
                            } );
                        }

                        // add custom icon for "verordnungsfähige Medizinprodukte
                        if( result.phPrescMed ) {
                            result.phIcons.push( {
                                src: 'VMP',
                                title: 'verordnungsfähiges Medizinprodukt'
                            } );
                        }

                        Y.doccirrus.api.mmi.getAMR( {
                            query: {
                                productId: product.ID
                            },
                            callback: function( err, data ) {
                                if( err ) {
                                    Y.log( `Error while getting getAMR: ${err.stack || err}`, 'warn', NAME );
                                }
                                var moment = require( 'moment' ),
                                    AMR = {
                                        appendix1: false,
                                        appendix3: false,
                                        appendix5: false,
                                        list: []
                                    };

                                if( data && data.AMR ) {
                                    ////only for debug
                                    result.original.amr = data.AMR;
                                    ////
                                    data.AMR.forEach( function( amr ) {
                                        if( (!patientAge || ((!amr.AGEFROM || (patientAge > amr.AGEFROM)) && (!amr.AGETO || (patientAge < amr.AGETO)))) ) {
                                            result.phAMRText.push( {
                                                ageFrom: amr.AGEFROM,
                                                ageTo: amr.AGETO,
                                                fileName: amr.FILENAME,
                                                nameSort: amr.NAME_SORT,
                                                text: amr.TEXT,
                                                title: amr.TITLE || '',
                                                regulationTypeCode: amr.REGULATIONTYPECODE,
                                                limitation: amr.limitation ? moment( amr.limitation ).format( 'DD.MM.YYYY' ) : ''
                                            } );
                                            switch( amr.REGULATIONTYPECODE ) {
                                                case '1':
                                                    if( !AMR.appendix1 ) {
                                                        AMR.appendix1 = true;
                                                        AMR.list.push( 'amr1' );
                                                    }
                                                    break;
                                                case '3':
                                                    if( !AMR.appendix3 ) {
                                                        AMR.appendix3 = true;
                                                        AMR.list.push( 'amr3' );
                                                    }
                                                    break;

                                                case '5':
                                                    if( !AMR.appendix5 ) {
                                                        AMR.appendix5 = true;
                                                        AMR.list.push( 'amr5' );
                                                    }
                                                    break;
                                                default:
                                                    break;
                                            }
                                        }

                                    } );

                                }
                                result.phOTC = result.phOTC || Boolean( product.OTC_FLAG && !AMR.appendix1 );
                                result.phOTX = Boolean( product.OTC_FLAG && AMR.appendix1 );
                                result.phAMR = AMR.list;
                                done( null, result );
                            }
                        } );
                    }

                    async.map( data.PRODUCT, mapProduct, function( err, results ) {
                        products = results;
                        done( err, results );
                    } );

                }
            ], function( err ) {
                return next( err, products );
            } );
        }

        /**
         * Helper to refine package data of some tables to be able to show more data.
         *  @param   {Object}          args
         * @return {Promise<void>}
         */
        async function refinePlainPackage( args ) {
            const {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils;
            const getMappedProductAsync = promisifyArgsCallback( getMappedProduct );
            const {packageDetails, options} = args;

            for( let packageDetail of packageDetails ) {
                let [err, product] = await formatPromiseResult( getMappedProductAsync( {
                    query: {
                        phPZN: packageDetail.phPZN,
                        ...options
                    }
                } ) );

                if( err ) {
                    Y.log( `refinePlainPackage: could not get mapped product to refine package details: ${err.stack || err}`, 'warn', NAME );
                } else if( !product ) {
                    Y.log( `refinePlainPackage: could not find pzn ${packageDetail.phPZN}`, 'debug', NAME );
                } else {
                    Object.assign( packageDetail, product );
                }
            }
        }

        /**
         * Sends 'getPackagesDetails' request to MMI Catalog
         * returns mapped object with package data
         * @method getPackagesDetails
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query]
         * @param {String} [args.query.name] package 'name'
         * @param {Array} [args.query.packageIdList] list(or) of package ids
         * @param {Array} [args.query.productIdList] list(or) of product ids
         * @param {Array} [args.query.moleculeidList] list(and) of molecule ids
         * @param {Array} [args.query.pznList] list(or) of PZN codes
         * @param {Number} [args.query.maxResult=0] request parameter 'maxResult' sets amount of result items
         * @param {Number} [args.query.priceComparisonGroupId] id of price comparison group
         * @param {String} [args.query.disabledList] list of objects names which should be disabled from result
         * @param {Boolean} [args.query.simple] reduce amount of extra request
         * @param {Boolean} [args.query.refinePlainPackage] refine plain package object with mapped product and package
         * @param {Function} args.callback
         * @param {Integer} args.originalParams.page page number
         * @param {Integer} args.originalParamsitemsPerPage size of page
         * @for doccirrus.api.mmi
         */
        function getPackagesDetails( args ) {
            var queryParams = args.query || {},
                originalParams = args.originalParams || {},
                options = args.options,
                async = require( 'async' );

            function parsePackages( err, data ) {
                if( data ) {
                    data.bsnr = queryParams.bsnr;
                    data.lanr = queryParams.lanr;
                    data.insuranceIknr = queryParams.insuranceIknr;
                    data.simple = queryParams.simple;
                }
                async.series( [
                    function( done ) {
                        _mapPackages( err, data, done );
                    }
                ], async function( err, results ) {
                    const packageDetails = results && results[0];
                    if( !err && packageDetails ) {
                        if( options && queryParams.refinePlainPackage ) {
                            await refinePlainPackage( {
                                packageDetails,
                                options: {
                                    bsnr: data.bsnr,
                                    lanr: data.lanr,
                                    insuranceIknr: data.insuranceIknr
                                }
                            } );
                        }

                        return args.callback( err, {
                            meta: {
                                errors: [],
                                warnings: [],
                                query: null,
                                itemsPerPage: originalParams.itemsPerPage,
                                totalItems: data && data.COUNT,
                                page: originalParams.page,
                                replyCode: 200
                            },
                            data: packageDetails
                        } );
                    }
                    return args.callback( err, undefined );
                } );
            }

            args.query.pageSize = originalParams.itemsPerPage;
            args.query.page = (0 === originalParams.page) ? 1 : originalParams.page;

            Y.doccirrus.api.mmi.getPackages( {
                user: args.user,
                query: args.query,
                callback: parsePackages
            } );
        }

        function _mapPackages( err, data, next ) {
            var packages = [],
                async = require( 'async' ),
                moment = require( 'moment' );
            if( err ) {
                return next( err );
            }
            if( !data ) {
                return next( err, data );
            }

            if( !data.PPACKAGE || 0 === data.PPACKAGE.length ) {
                return next( err, packages );
            }

            function mapPackage( packageOrig, done ) {
                var result = {
                    phARVText: [],
                    phAlternatives: [],
                    phPriceHistory: []
                };
                const phSalesStatus = Y.doccirrus.schemas.v_medication.mapSalesSatusCode( packageOrig.SALESSTATUSCODE );
                const phRefundAmount = (Array.isArray( packageOrig.PRICE_LIST ) ? packageOrig.PRICE_LIST : []).filter( priceListEl => {
                    return priceListEl.PRICETYPE === 'DISCOUNT130B';
                } ).map( priceListEl => {
                    return priceListEl.VALUE / 100;
                } )[0];

                result.phPriceSale = packageOrig.PRICE_PHARMACYSALE;
                result.phRefundAmount = phRefundAmount;
                result.phPriceRecommended = packageOrig.PRICE_RECCOMENDED;
                result.phPatPay = packageOrig.PRICE_PATIENTPAYMENT;
                result.phPatPayHint = packageOrig.PATIENTPAYMENTHINT;
                result.phFixedPay = packageOrig.PRICE_FIXED;
                result.phCheaperPkg = false;
                result.phNLabel = packageOrig.NAME_RECIPE;
                result.content = packageOrig.NAME_RECIPE;       //  MOJ-8766
                result.phPackSize = packageOrig.SIZE_AMOUNT + ' ' + packageOrig.SIZE_UNITCODE;
                result.phPZN = packageOrig.PZN;
                result.title = packageOrig.NAME;
                result.phCompany = packageOrig.COMPANYNAME;
                result.phPriceCompGroup1 = packageOrig.PRICE_COMPARISONGROUP1;
                result.phPriceCompGroup2 = packageOrig.PRICE_COMPARISONGROUP2;
                result.phDisAgrAlt = Boolean( packageOrig.DISAGR_ALTERNATIVEEXIST_FLAG );
                result.phDisagrCode = packageOrig.DISAGR_TYPECODE;
                result.phNLabel = packageOrig.NAME_RECIPE;
                result.id = packageOrig.ID;
                result.phNormSize = packageOrig.SIZE_NORMSIZECODE || 'UNKNOWN';
                if( phSalesStatus ) {
                    result.phSalesStatus = phSalesStatus;
                }
                result.phFormCode = packageOrig.PHARMFORMCODE_IFA;

                ///only for debug
                if( !data.simple ) {
                    result.original = packageOrig;
                }
                /////////
                if( !data.simple && packageOrig.PRICEHISTORY_LIST ) {
                    result.phPriceHistory = packageOrig.PRICEHISTORY_LIST.map( function( price ) {
                        return {
                            date: moment( price.VALIDDATE ).format( 'DD.MM.YYYY' ),
                            price: price.VALUE
                        };
                    } );
                }

                async.parallel( [
                    function( cb ) {
                        if( !data.simple && data.bsnr && data.lanr ) {
                            Y.doccirrus.api.mmi.getARV( {
                                query: {
                                    bsnr: data.bsnr,
                                    lanr: data.lanr,
                                    packageId: packageOrig.ID,
                                    insuranceIknr: data.insuranceIknr
                                },
                                callback: function( err, data ) {
                                    if( err ) {
                                        Y.log( `Error while getting ARV: ${err.stack || err}`, 'warn', NAME );
                                    }
                                    if( data && data.ARV && 0 < data.ARV.length ) {
                                        ////only for debug
                                        result.original.arv = data.ARV;
                                        //////
                                        data.ARV.forEach( function( arv ) {
                                            var hasAlternatives = false,
                                                datesInfo = 'Gültigkeit ';
                                            if( arv.VALIDFROM ) {
                                                datesInfo += 'von ' + moment( arv.VALIDFROM ).format( 'DD.MM.YYYY' ) + ' ';
                                            }
                                            if( arv.VALIDTO ) {
                                                datesInfo += 'bis ' + moment( arv.VALIDTO ).format( 'DD.MM.YYYY' ) + ' ';
                                            }
                                            if( arv.CREATE_DATE ) {
                                                datesInfo += 'Erstellungsdatum ' + moment( arv.CREATE_DATE ).format( 'DD.MM.YYYY' );
                                            }
                                            if( arv.ALTERNATIVEPACKAGEGROUP && arv.ALTERNATIVEPACKAGEGROUP.PACKAGE_LIST && arv.ALTERNATIVEPACKAGEGROUP.PACKAGE_LIST.length ) {
                                                hasAlternatives = true;
                                                arv.ALTERNATIVEPACKAGEGROUP.PACKAGE_LIST.forEach( function( pkg ) {
                                                    if( !pkg || !pkg.PACKAGE ) {
                                                        return;
                                                    }
                                                    result.phAlternatives.push( {
                                                        title: pkg.PACKAGE.NAME,
                                                        phPatPay: pkg.PACKAGE.PRICE_PATIENTPAYMENT,
                                                        phPriceSale: pkg.PACKAGE.PRICE_PHARMACYSALE,
                                                        phPriceRecommended: pkg.PACKAGE.PRICE_RECCOMENDED,
                                                        phFixedPay: pkg.PACKAGE.PRICE_FIXED,
                                                        phCompany: pkg.PACKAGE.COMPANYNAME,
                                                        phPZN: pkg.PACKAGE.PZN,
                                                        phDisagrAlt: pkg.PACKAGE.DISAGR_ALTERNATIVEEXIST_FLAG,
                                                        phDisagrCode: pkg.PACKAGE.DISAGR_TYPECODE
                                                    } );
                                                } );
                                            }


                                            // MOJ-11137: do not return arv entries without NAME, otherwise crash
                                            let phARVTextTitle = arv.ARVTYPE && arv.ARVTYPE.NAME;
                                            if( !phARVTextTitle ) {
                                                return;
                                            }

                                            result.phARVText.push( {
                                                title: phARVTextTitle,
                                                hint: arv.HINT && arv.HINT.TEXT || '',
                                                hasAlternatives: hasAlternatives,
                                                datesInfo: datesInfo
                                            } );
                                        } );
                                        result.phARV = true;
                                    } else {
                                        result.phARV = false;
                                    }
                                    cb();
                                }
                            } );
                        } else {
                            return cb();
                        }
                    }, function( cb ) {
                        if( !data.simple && result.phPriceCompGroup2 ) {
                            Y.doccirrus.api.mmi.getPackages( {
                                query: {
                                    priceComparisonGroupId: result.phPriceCompGroup2,
                                    disabledList: [ 'ALL' ],
                                    sortOrder: ''
                                },
                                callback: function( err, response ) {
                                    if( err || !response || !response.PPACKAGE || !response.PPACKAGE.length ) {
                                        Y.log( err ? `error getting cheaper products ${err.stack || err}` : 'no price comparison packages found', 'warn', NAME );
                                        done();
                                        return;
                                    }
                                    response.PPACKAGE.some( function( pkg ) {
                                        if( pkg.PRICE_PHARMACYSALE < result.phPriceSale ) {
                                                result.phCheaperPkg = true;
                                            return true;
                                        }
                                    } );
                                    cb();
                                }
                            } );
                        } else {
                            return cb();
                        }
                    } ], function( err ) {
                    done( err, result );
                } );

            }

            async.map( data.PPACKAGE, mapPackage, function( err, results ) {
                packages = results;
                next( err, packages );
            } );
        }

        /**
         * Sends 'getARV' request to MMI Catalog
         * @method getARV
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.bsnr
         * @param {String} args.query.lanr
         * @param {Integer} [args.query.packageId] package ids
         * @param {String} [args.query.pzn] list(and) PZN code
         * @param {String} [args.query.insuranceIknr]
         * @param {Integer} [args.query.insurancegroupid]
         * @param {Integer} [args.query.insuranceDiscountFilter]
         * @param {Number} [args.query.maxResult=0] request parameter 'maxResult' sets amount of result items
         * @param {Function} args.callback
         * @for doccirrus.api.mmi
         */
        function getARV( args ) {
            var queryParams = args.query || {},
                requestParams = {
                    user: args.user,
                    query: {
                        method: 'getARV',
                        params: {
                            bsnr: queryParams.bsnr,
                            lanr: queryParams.lanr,
                            packageid: queryParams.packageId,
                            pzn: queryParams.pzn,
                            insuranceiknr: queryParams.insuranceIknr,
                            insurancegroupid: queryParams.insuranceGroupId,
                            insurancediscountfilter: queryParams.insuranceDiscountFilter,
                            maxresult: queryParams.maxResult || 0
                        }
                    },
                    callback: args.callback
                };
            Y.doccirrus.api.mmi.sendRequest( requestParams );
        }

        function getProductInfo( args ) {
            var queryParams = args.query || {},
                async = require( 'async' ),
                documents = {};

            if( queryParams.documentTypeCode ) {
                queryParams.documentTypeCode.forEach( function( code ) {
                    documents[ code ] = [];
                } );
            }
            if( !queryParams.productId ) {
                return args.callback( null, documents );
            }
            function documentRequest( code, done ) {
                function parseDocument( err, data ) {
                    if( err ) {
                        return done( err );
                    }
                    if( data && data.DOCUMENT ) {
                        data.DOCUMENT.forEach( function( document ) {
                            if( document.CATEGORY_LIST ) {
                                document.CATEGORY_LIST.forEach( function( category ) {
                                    documents[ code ].push( { title: category.NAME, content: category.CONTENT } );
                                } );
                            }
                        } );
                    }
                    done();
                }

                Y.doccirrus.api.mmi.getDocuments( {
                    query: {
                        documentTypeCode: code,
                        productId: queryParams.productId
                    },
                    callback: parseDocument
                } );
            }

            async.map( queryParams.documentTypeCode || [], documentRequest, function( err ) {
                if( err ) {
                    return args.callback( err );
                }
                args.callback( err, documents );
            } );

        }

        /**
         * Gets mmi meta data
         * @method getMetaData
         * @param {Object} args
         * @param {Function} args.callback
         * @for doccirrus.api.mmi
         */
        function getMetaData( args ) {
            var needle = require( 'needle' ),
                url = 'http://localhost:7777/rest/pharmindexv2/getMetadata';
            Y.log( 'send request to mmi API, url: ' + url, 'debug', NAME );
            needle.get( url, { timeout: 30000 }, function( err, response ) {
                var data, priceUpdate, drugUpdate;
                if( err ) {
                    return args.callback( err );
                }
                data = response.body && response.body.METADATA;
                if( !data ) {
                    Y.log( 'MMI returned no error, but an invalid empty response. Try restarting MMI.', 'error', NAME );
                    return args.callback( 'MMI returned no error, but an invalid empty response.' );
                }
                if( Array.isArray( data.METADATAENTRY_LIST ) ) {
                    data.METADATAENTRY_LIST.forEach( function( metadata ) {
                        if( 'DATABASE_PRICE_DATE' === metadata.ENTRYCODE ) {
                            priceUpdate = metadata.VALUE;
                        } else if( 'DATABASE_DRUG_DATE' === metadata.ENTRYCODE ) {
                            drugUpdate = metadata.VALUE;
                        }
                    } );
                }
                return args.callback( err, {
                    version: data.VERSION,
                    drugUpdate: drugUpdate,
                    priceUpdate: priceUpdate
                } );
            } );
        }

        function getMappedProduct( args ) {
            var queryParams = args.query || {},
                async = require( 'async' );
            async.parallel( [
                function( done ) {
                    Y.doccirrus.api.mmi.getProductsDetails( {
                        query: {
                            pznList: [ queryParams.phPZN ],
                            patientAge: queryParams.patientAge,
                            insuranceIknr: queryParams.insuranceIknr
                        },
                        callback: done
                    } );
                },
                function( done ) {
                    Y.doccirrus.api.mmi.getPackagesDetails( {
                        query: {
                            pznList: [ queryParams.phPZN ],
                            bsnr: queryParams.bsnr,
                            lanr: queryParams.lanr,
                            insuranceIknr: queryParams.insuranceIknr
                        },
                        callback: done
                    } );
                }
            ], function( err, results ) {
                var combinedResult = {};
                if( !err && results && 2 === results.length && 0 < results[ 0 ].length && 0 < results[ 1 ].data.length ) {
                    combinedResult = Y.merge( results[ 1 ].data[ 0 ] || {}, results[ 0 ][ 0 ] || {} );
                }

                return args.callback( err, combinedResult );
            } );
        }

        /**
         * Gets all medication for prescription activity specified by "prescId" parameter.
         * Then the current mmi data is requested for all medications. The returned Array will look like this:
         * [
         *      {
         *          original: { originalMedication1 }
         *          updated: { currentMedication1 }
         *      },
         *      ...
         * ]
         *
         * @method getCompareableMedications
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {String} args.query.prescId prescription activity id
         * @param {String} args.query.patientAge
         * @param {String} args.query.insuranceIknr
         * @param {String} args.query.bsnr
         * @param {String} args.query.lanr
         * @param {Function} args.callback
         * @for doccirrus.api.mmi
         */
        function getCompareableMedications( args ) {
            var fieldsToCompare = [ "content", "phMed", "phDisAgrAlt", "phDisAgr", "phGBA", "phAMR", "phLifeStyle", "phNegative", "phImport", "phTrans", "phTer", "phOnly", "phAtc", "phIngr", "phFixedPay", "phPatPay", "phPriceSale", "phPriceRecommended", "phPackSize", "phForm", "phCompany", "phPZN", "phBTM", "phContraceptive", "phLifeStyleCond", "phNLabel", "phOTC", "phOTX", "phRecipeOnly", "phRefund" ],
                result = [],
                async = require( 'async' ),
                user = args.user,
                queryParams = args.query,
                callback = args.callback;

            function finalCb( err ) {
                if( err ) {
                    Y.log( `Could not compare medications: ${err.stack | err}`, 'warn', NAME );
                    callback( err );
                    return;
                }
                callback( null, result );
            }

            function pickAttributes( obj ) {
                var i,
                    newObj = {};
                for( i in obj ) {
                    if( obj.hasOwnProperty( i ) && -1 !== fieldsToCompare.indexOf( i ) ) {
                        newObj[ 'activity.' + i ] = obj[ i ];
                    }
                }
                return newObj;
            }

            function compareMedication( medication, _cb ) {
                if( !medication.phPZN ) {
                    _cb();
                    return;
                }

                function mappedProductCb( err, mappedProduct ) {
                    if( err ) {
                        Y.log( `Could not get mapped product for medication comparison: ${err.stack || err}`, 'warn', NAME );
                        _cb( err );
                        return;
                    }

                    result.push( {
                        //mongooselean.toObject
                        original: pickAttributes( medication ),
                        updated: pickAttributes( mappedProduct )
                    } );

                    _cb();
                }

                Y.doccirrus.api.mmi.getMappedProduct( {
                    query: {
                        phPZN: medication.phPZN,
                        patientAge: queryParams.patientAge,
                        insuranceIknr: queryParams.insuranceIknr,
                        bsnr: queryParams.bsnr,
                        lanr: queryParams.lanr
                    },
                    callback: mappedProductCb
                } );

            }

            function medicationCb( err, medications ) {
                if( err || !medications || !medications.length ) {
                    err = err ? err : ('no medications found');
                    Y.log( `could not get medications ${err}`, 'warn', NAME );
                    callback( err );
                    return;
                }

                async.each( medications, compareMedication, finalCb );
            }

            function prescriptionCb( err, presc ) {
                if( err || !presc || !presc.length ) {
                    err = err ? err : ('no presc found for ' + queryParams.prescId);
                    Y.log( `could not get presc ${err}`, 'warn', NAME );
                    callback( err );
                    return;
                }
                presc = presc[ 0 ];
                if( !presc.activities || !presc.activities.length ) {
                    callback( new Error( 'medications linked to this prescriptions' ) );
                    return;
                }
                Y.doccirrus.mongodb.runDb( {
                    model: 'activity',
                    user: user,
                    query: {
                        _id: {
                            $in: presc.activities
                        }
                    },
                    callback: medicationCb
                } );
            }

            if( !queryParams.prescId ) {
                Y.log( 'no presc id passed', 'warn', NAME );
                callback( new Error( 'No medication presc id passed' ) );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                model: 'activity',
                user: user,
                query: {
                    _id: queryParams.prescId
                },
                callback: prescriptionCb
            } );
        }

        /**
         *
         * @method generateCarrierSegments
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.data.medicationPlan
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function generateCarrierSegments( args ) {
            var
                { data: { medicationPlan } = {}, callback } = args,
                params = {
                    action: 'encode',
                    medicationplan: medicationPlan
                },
                commonerrors = Y.doccirrus.commonerrors;
            if( !medicationPlan ) {
                Y.log( 'generateCarrierSegments. medicationPlan is missing', 'error', NAME );
                return callback( new commonerrors.DCError( 400, { message: 'medicationPlan is missing' } ) );
            }
            Y.doccirrus.api.mmi.sendRequestPost( {
                query: {
                    method: 'medicationplanManage',
                    params
                },
                callback( err, data = {} ){
                    if( err ) {
                        Y.log( `could not create carrier segments: ${err.stack || err}`, 'warn', NAME );
                        return callback( err );
                    }
                    callback( null, data.carriersegments || [] );
                }
            } );
        }

        /**
         * @method generateMedicationPlan
         * @param {Object} args
         * @param {Object} args.data
         * @param {String} args.data.carrierSegment
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function generateMedicationPlan( args ) {
            var
                { data: { carrierSegment } = {}, callback } = args,
                params = {
                    action: 'decode',
                    carriersegment: carrierSegment
                },
                commonerrors = Y.doccirrus.commonerrors;
            if( !carrierSegment ) {
                Y.log( 'generateCarrierSegments. carrierSegment is missing', 'warn', NAME );
                return callback( new commonerrors.DCError( 400, { message: 'carrierSegment is missing' } ) );
            }
            Y.doccirrus.api.mmi.sendRequest( {
                query: {
                    method: 'medicationplanManage',
                    params
                },
                callback( err, data = {} ){
                    let
                        medicationPlan = data.MEDICATIONPLAN;
                    if( err ) {
                        Y.log( `could not generate medication plan: ${err.stack || err}`, 'warn', NAME );
                        return callback( err );
                    }
                    callback( null, medicationPlan );
                }
            } );
        }

        /**
         * @method generateMedicationPlanPDF
         * @param {Object} args
         * @param {Object} args.data
         * @param {Object} args.data.carrierSegment
         * @param {Function} args.callback
         * @return  {Function}  args.callback
         */
        function generateMedicationPlanPDF( args ) {
            var
                { data: { carrierSegment } = {}, callback } = args,
                needle = require( 'needle' ),

                credential = mmiConnect && mmiConnect.credential,
                SAMPLEUSERNAME = credential && credential.username,
                SAMPLEKEY = credential && credential.key,
                commonerrors = Y.doccirrus.commonerrors,
                url;
            if( !carrierSegment ) {
                Y.log( 'generateMedicationPlanPDF. carrierSegment is missing', 'warn', NAME );
                return callback( new commonerrors.DCError( 400, { message: 'carrierSegment is missing' } ) );
            }
            url = `http://localhost:7777/GetMPBinary?username=${SAMPLEUSERNAME}&licensekey=${SAMPLEKEY}&binarytypecode=PDF&content=${encodeURIComponent( carrierSegment )}`;
            Y.log( 'generateMedicationPlanPDF send request to mmi API, url: ' + url, 'debug', NAME );
            needle.get( url, { timeout: 30000 }, function( err, response ) {
                if( err ) {
                    if( 'ECONNREFUSED' === err.code){
                        return callback( new commonerrors.DCError( 9001 ) );
                    }
                    return callback( err );
                }
                if( response.body && response.body.STATUS && 4 === response.body.STATUS.code && 0 === response.body.COUNT ) {
                    return callback( new commonerrors.DCError( 9000 ) );
                }
                if( response.body && 0 === response.body.length ){
                    return callback( new commonerrors.DCError( 9002 ) );
                }
                callback( null, response.body );

            } );
        }

        function enableMMIService( callback ) {
            const
                exec = require( 'child_process' ).exec,
                execOptions = {
                    cwd: process.cwd(),
                    detached: false,
                    shell: true
                };

            if( !mmiConnect.enableCommand ) {
                Y.log(`enableMMIService: 'enableCommand' command not found in mmiconnect.json`, 'error', NAME);
                return callback(`enableMMIService: 'enableCommand' command not found in mmiconnect.json`);
            }

            exec( `${mmiConnect.enableCommand}`, execOptions, ( err, stdout, stderr ) => {
                Y.log( `enableMMIService: command stdout: ${stdout}`, 'info', NAME );
                Y.log( `enableMMIService: command stderr: ${stderr}`, 'info', NAME );

                if( err ) {
                    Y.log( `enableMMIService: Could not enable MMI service. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    return callback(err);
                } else {
                    Y.log(`enableMMIService: Successfully enabled MMI service`, 'info', NAME);
                    return callback();
                }
            } );
        }

        function disableMMIService( callback ) {
            const
                exec = require( 'child_process' ).exec,
                execOptions = {
                    cwd: process.cwd(),
                    detached: false,
                    shell: true
                };

            if( !mmiConnect.disableCommand ) {
                Y.log(`disableMMIService: 'disableCommand' command not found in mmiconnect.json`, 'error', NAME);
                return callback(`disableMMIService: 'disableCommand' command not found in mmiconnect.json`);
            }

            exec( `${mmiConnect.disableCommand}`, execOptions, ( err, stdout, stderr ) => {
                Y.log( `disableMMIService: command stdout: ${stdout}`, 'info', NAME );
                Y.log( `disableMMIService: command stderr: ${stderr}`, 'info', NAME );

                if( err ) {
                    Y.log( `disableMMIService: Could not disable MMI service. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    return callback(err);
                } else {
                    Y.log(`disableMMIService: Successfully disabled MMI service`, 'info', NAME);
                    return callback();
                }
            } );
        }

        function setMedicationData( args ) {
            const {initData = {}, mappedProduct, mappedPackage, additionalData = {}} = args;
            let isOTC, patientAge, isOver12, isChild, phPatPay, phPatPayHint;

            // adjust phPatPay and phPatPayHint
            isOTC = mappedProduct.phOTC;
            patientAge = additionalData.patientAge;
            isOver12 = 12 < patientAge;
            isChild = 18 >= patientAge;
            phPatPay = mappedPackage.phPatPay;
            phPatPayHint = mappedPackage.phPatPayHint;

            if( patientAge && isOTC && isChild && isOver12 ) {
                phPatPay = null;
                phPatPayHint = null;
            } else if( patientAge && isChild ) {
                phPatPay = 0;
                phPatPayHint = 'zuzahlungsfrei';
            }

            initData.actType = 'MEDICATION';
            initData.catalogShort = 'MMI';

            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.schemas.activity._setActivityData( {
                    initData,
                    entry: {
                        code: '',
                        catalogShort: 'MMI',
                        title: mappedProduct.title,
                        phTer: mappedProduct.phTer,
                        phTrans: mappedProduct.phTrans,
                        phImport: mappedProduct.phImport,
                        phNegative: mappedProduct.phNegative,
                        phLifeStyle: mappedProduct.phLifeStyle,
                        phLifeStyleCond: mappedProduct.phLifeStyleCond,
                        phGBA: mappedProduct.phGBA,
                        phGBATherapyHintName: mappedProduct.phGBATherapyHintName,
                        phDisAgr: mappedProduct.phDisAgr,
                        phDisAgrAlt: mappedProduct.phDisAgrAlt,
                        phMed: mappedProduct.phMed,
                        phPrescMed: mappedProduct.phPrescMed,
                        phCompany: mappedProduct.phCompany,
                        phOnly: mappedProduct.phOnly,
                        phRecipeOnly: mappedProduct.phRecipeOnly,
                        phBTM: mappedProduct.phBTM,
                        phContraceptive: mappedProduct.phContraceptive,
                        phOTC: mappedProduct.phOTC,
                        phOTX: mappedProduct.phOTX,
                        phAMR: mappedProduct.phAMR,
                        phAMRContent: mappedProduct.phAMRText,
                        phAtc: mappedProduct.phAtc,
                        phIngr: mappedProduct.phIngr,
                        phForm: mappedProduct.phForm,
                        phFormCode: mappedPackage.phFormCode,

                        phPriceSale: mappedPackage.phPriceSale,
                        phRefundAmount: mappedPackage.phRefundAmount,
                        phPriceRecommended: mappedPackage.phPriceRecommended,
                        phPatPay: phPatPay,
                        phPatPayHint: phPatPayHint,
                        phFixedPay: mappedPackage.phFixedPay,
                        phCheaperPkg: mappedPackage.phCheaperPkg,

                        phNLabel: mappedPackage.phNLabel,

                        phPZN: mappedPackage.phPZN,
                        phSalesStatus: mappedPackage.phSalesStatus,
                        phNormSize: mappedPackage.phNormSize,
                        phPackSize: mappedPackage.phPackSize,
                        phARV: mappedPackage.phARV,
                        phARVContent: mappedPackage.phARVText,
                        prdNo: mappedPackage.prdNo,
                        insuranceCode: mappedPackage.insuranceCode,
                        paidByInsurance: mappedPackage.paidByInsurance,
                        supplyCategory: mappedPackage.supplyCategory,
                        insuranceDescription: mappedPackage.insuranceDescription,
                        phGTIN: mappedPackage.phGTIN
                    },
                    user: args.user
                }, ( err, result ) => {
                    if( err ) {
                        return reject( err );
                    }
                    resolve( result );
                } );
            } );
        }

        /**
         * Creates an medication activity for PZN with fresh MMI data.
         * @param   {Object}            args
         * @param   {Object}            args.originalParams
         * @param   {Function}          args.callback
         * @param   {String}            args.originalParams.pzn
         * @param   {String}            args.originalParams.iknr
         * @param   {String}            args.originalParams.bsnr
         * @param   {String}            args.patientAge
         * @param   {String}            args.insuranceIknr
         * @param   {String}            args.lanr
         *
         *
         *
         * @return {Promise<Medication>}
         */
        async function getMMIMedicationByPZN( args ) {
            Y.log( 'Entering Y.doccirrus.api.mmi.getMMIMedicationByPZN', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.mmi.getMMIMedicationByPZN' );
            }
            const getMappedProductAsync = promisifyArgsCallback( getProductsDetails );
            const getMappedPackageAsync = promisifyArgsCallback( getPackagesDetails );
            const {originalParams, callback} = args;
            const {pzn, iknr, bsnr, lanr, patientAge, initData = {}} = originalParams;

            if( !pzn ) {
                return handleResult( Y.doccirrus.errors.rest( 400, 'Missing pzn parameter' ), undefined, callback );
            }

            let [err, mappedProducts] = await formatPromiseResult( getMappedProductAsync( {
                query: {
                    iknr,
                    pznList: [pzn]
                }
            } ) );

            if( err ) {
                Y.log( `could not get mapped product: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            if( !mappedProducts.length ) {
                return handleResult( undefined, null, callback );
            }

            let mappedPackages;
            [err, mappedPackages] = await formatPromiseResult( getMappedPackageAsync( {
                query: {
                    pznList: [pzn],
                    iknr,
                    bsnr,
                    lanr
                }
            } ) );

            if( err ) {
                Y.log( `could not get mapped package: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            let mappedPackage = mappedPackages && mappedPackages.data && mappedPackages.data[0];

            if( !mappedPackage ) {
                return handleResult( undefined, null, callback );
            }

            let medication;
            [err, medication] = await formatPromiseResult( setMedicationData( {
                initData,
                mappedProduct: mappedProducts[0],
                mappedPackage: mappedPackage,
                additionalData: {
                    patientAge
                }
            } ) );

            return handleResult( undefined, medication, callback );
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class mmi
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).mmi = {
            /**
             * @property name
             * @type {String}
             * @default mmi-api
             * @protected
             */
            name: NAME,
            init: initMMIService,
            enableMMIService,
            disableMMIService,
            getMMIMedicationByPZN,
            getCatalogEntries: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getCatalogEntries', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getCatalogEntries');
                }
                getCatalogEntries( args );
            },
            sendRequest: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.sendRequest', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.sendRequest');
                }
                sendRequest( args );
            },
            sendRequestPost: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.sendRequestPost', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.sendRequestPost');
                }
                sendRequestPost( args );
            },
            getProducts: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getProducts', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getProducts');
                }
                getProducts( args );
            },
            getMolecules: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getMolecules', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getMolecules');
                }
                getMolecules( args );
            },
            getATCCatalogEntries: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getATCCatalogEntries', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getATCCatalogEntries');
                }
                getATCCatalogEntries( args );
            },
            getMappingCatalogEntries: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getMappingCatalogEntries', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getMappingCatalogEntries');
                }
                getMappingCatalogEntries( args );
            },
            getPackages: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getPackages', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getPackages');
                }
                getPackages( args );
            },
            getDocuments: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getDocuments', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getDocuments');
                }
                getDocuments( args );
            },
            getAMR: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getAMR', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getAMR');
                }
                getAMR( args );
            },
            getProductsDetails: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getProductsDetails', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getProductsDetails');
                }
                getProductsDetails( args );
            },
            getProductInfo: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getProductInfo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getProductInfo');
                }
                getProductInfo( args );
            },
            getPackagesDetails: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getPackagesDetails', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getPackagesDetails');
                }
                getPackagesDetails( args );
            },
            getARV: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getARV', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getARV');
                }
                getARV( args );
            },
            getMetaData: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getMetaData', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getMetaData');
                }
                getMetaData( args );
            },
            getMappedProduct: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getMappedProduct', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getMappedProduct');
                }
                getMappedProduct( args );
            },
            mapProducts: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.mapProducts', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.mapProducts');
                }
                const
                    error = null,
                    {data, callback, doMinimalMapping} = args;
                _mapProducts( {error, data, next: callback, doMinimalMapping} );
            },
            getCompareableMedications: function( args ) {
                Y.log('Entering Y.doccirrus.api.mmi.getCompareableMedications', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.getCompareableMedications');
                }
                getCompareableMedications( args );
            },
            generateCarrierSegments( args ){
                Y.log('Entering Y.doccirrus.api.mmi.generateCarrierSegments', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.generateCarrierSegments');
                }
                generateCarrierSegments( args );
            },
            generateMedicationPlan( args ){
                Y.log('Entering Y.doccirrus.api.mmi.generateMedicationPlan', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.generateMedicationPlan');
                }
                generateMedicationPlan( args );
            },
            generateMedicationPlanPDF( args ){
                Y.log('Entering Y.doccirrus.api.mmi.generateMedicationPlanPDF', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.mmi.generateMedicationPlanPDF');
                }
                generateMedicationPlanPDF( args );
            }

        };

    },
    '0.0.1', { requires: [ 'dccommonerrors', 'changelog-api' ] }
);
