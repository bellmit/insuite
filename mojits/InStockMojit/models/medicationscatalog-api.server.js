/**
 * User: Sebastian Lara
 * Date: 28/06/2019  14:00
 * (c) 2019, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'medicationscatalog-api', function( Y, NAME ) {
        

        /** @module medicationscatalog-api */

        const
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils,
            {flattenArray} = Y.doccirrus.commonutils,

            getMetaDataProm = promisifyArgsCallback( Y.doccirrus.api.mmi.getMetaData ),
            getMoleculesProm = promisifyArgsCallback( Y.doccirrus.api.mmi.getMolecules ),
            getProductsProm = promisifyArgsCallback( Y.doccirrus.api.mmi.getProducts ),
            getATCCatalogEntriesProm = promisifyArgsCallback( Y.doccirrus.api.mmi.getATCCatalogEntries ),
            getProductInfoProm = promisifyArgsCallback( Y.doccirrus.api.mmi.getProductInfo ),

            priceRegEx = /^PRICE.*(PATIENT|PHARMACY|FIXED)/,
            anatomicalAtcLevelRegEx = /^\w$/,

            WHITELISTED_PARAMS = {
                catalogShort: {
                    required: true, // if param is required it needs a 'missingParamErrorMessage' to send back to the client
                    missingParamErrorMessage: 'Please define catalog (catalogShort) when having more than one countryMode set',
                    enums: ['MMI', 'HCI'],
                    additionalValidator: catalogShortValidator
                },
                maxResult: {},
                fetchProductInfo: {},
                name: {
                    handler: getMoleculesByName
                },
                moleculeName: {
                    handler: getMedications
                },
                atc: {
                    handler: getMedications
                },
                pzn: {
                    handler: getMedications
                },
                productName: {
                    handler: getMedications
                },
                icd10: {
                    handler: getMedications
                }
            };

        /**
         * Additional validator for the "catalogShort" param
         *
         * @param {Object} query
         * @returns {DCError|undefined}
         */
        function catalogShortValidator( query ) {
            const
                countryModeLength = Y.config.doccirrus.Env.countryMode.length,
                includesSwissCountry = Y.config.doccirrus.Env.countryMode.includes( 'CH' ),
                includesGermanCountry = Y.config.doccirrus.Env.countryMode.includes( 'D' );

            let error;

            if( countryModeLength > 1 && !query.catalogShort ) {
                error = new Y.doccirrus.commonerrors.DCError( 400, {message: 'Please define catalog (catalogShort) when having more than one countryMode set'} );
            }

            if( countryModeLength === 1 && includesSwissCountry && query.catalogShort === 'MMI' ) {
                error = new Y.doccirrus.commonerrors.DCError( 400, {message: 'MMI not supported for CH country'} );
            }

            if( countryModeLength === 1 && includesGermanCountry && query.catalogShort === 'HCI' ) {
                error = new Y.doccirrus.commonerrors.DCError( 400, {message: 'HCI not supported for D country'} );
            }

            return error;
        }

        /**
         * Validates the incoming request's query parameters
         *
         * 1. assert that all query params are whitelisted
         * 2. assert that required params are present
         * 3. assert that only one "executable param" (param with handler function) is present
         * 4. assert that params with enums pass
         * 5. assert if value type is as expected
         * 6. run any additional validators from the whitelist object
         * 7. assert that at least one "executable param" is present
         *
         * @param {Object} query
         * @returns {DCError|undefined}
         */
        function validateQueryParams( query ) {
            const
                whitelistedParamsList = Object.keys( WHITELISTED_PARAMS ),
                queryParamsListAll = Object.keys( query ),
                queryParamsList = queryParamsListAll.filter( ( param ) => (whitelistedParamsList.includes( param )) ),
                searchByParams = [],
                searchByParamsHandlers = new Set();

            let error;

            // ----------- 1. VALIDATE IF DISALLOWED PARAMS ARE PRESENT -----------

            if( queryParamsListAll.length > queryParamsList.length ) {
                let disallowedParams = queryParamsListAll.filter( ( param ) => (!queryParamsList.includes( param )) );

                return new Y.doccirrus.commonerrors.DCError( 400, {message: `${disallowedParams.join( ', ' )} not allowed!`} );
            }

            for( let param of whitelistedParamsList ) {

                let {required, enums, missingParamErrorMessage, additionalValidator} = WHITELISTED_PARAMS[param];

                // ----------- 2. VALIDATE IF REQUIRED PARAMS ARE PRESENT -----------

                if( required && !queryParamsList.includes( param ) ) {
                    return new Y.doccirrus.commonerrors.DCError( 400, {message: missingParamErrorMessage} );
                }

                if( queryParamsList.includes( param ) ) {

                    // ----------- 3. VALIDATE IF THERE ARE DISALLOWED PARAM STACKS -----------

                    if( WHITELISTED_PARAMS[param].handler ) {
                        let handlerName = WHITELISTED_PARAMS[param].handler.name;
                        searchByParams.push( param );
                        searchByParamsHandlers.add( handlerName );

                        if( searchByParamsHandlers.size >= 2 ) {
                            return new Y.doccirrus.commonerrors.DCError( 400, {message: `Parameters "${searchByParams.join( '" and "' )}" cannot be sent in the same request`} );
                        }
                    }

                    // ----------- 4. VALIDATE IF PARAMS WITH EXPECTED ENUMS PASS -----------

                    if( enums && !enums.includes( query[param] ) ) {
                        return new Y.doccirrus.commonerrors.DCError( 400, {message: `For ${param} please provide one of the following: ${enums.join( ', ' )}`} );
                    }

                    // ----------- 5. RUN ANY ADDITIONAL VALIDATORS -----------

                    if( additionalValidator ) {
                        error = additionalValidator( query );
                    }
                }

                if( error ) {
                    return error;
                }
            }

            // ----------- 6. VALIDATE IF ANY "SEARCH-BY" PARAM IS INCLUDED -----------

            if( !searchByParams.length ) {
                let allSearchByParams = whitelistedParamsList.filter( ( param ) => (WHITELISTED_PARAMS[param].handler) );

                error = new Y.doccirrus.commonerrors.DCError( 400, {message: `Request must include catalogShort and any of the following: ${allSearchByParams.join( ', ' )}`} );
            }

            return error;
        }

        /**
         * ----------- HANDLER FUNCTIONS -----------
         */

        /**
         * Gets ATC code tree
         * @param {Object} args
         * @param {Functions} args.callback
         * @param {Object} args.data
         * @param {String} args.atc
         * @param {Number} [args.parents]
         * @param {Number} [args.children]
         * @param {Object} args.query
         * @returns {Promise<Object|*>}
         */
        async function getATCCatalogEntries( args ) {
            Y.log( `Executing getATCCatalogEntries`, 'info', NAME );
            const {callback, data: {atc, parents, children}, query} = args;
            let error, result, reducerFunction;

            Y.log( `executing getATCCatalogEntries with query: atc=${atc}, parents=${parents}, children=${children}`, 'debug', NAME );

            query.code = atc || '';
            query.parents = parents || 5; // get full parent tree
            query.children = children || 1; // only the first level

            [error, result] = await formatPromiseResult(
                getATCCatalogEntriesProm( {...args, query} )
            );

            if( error || !result ) {
                Y.log( `getATCCatalogEntries: error while getting ATC codes: ${error ? error.stack || error : ('result is ' + typeof result)}`, 'error', NAME );
                return handleResult( error, result, callback );
            }

            reducerFunction = _reduceATCCodeEntry;

            if( anatomicalAtcLevelRegEx.test(atc) && query.children > 1 ) {
                reducerFunction = _reduceTopDownATCCodeTree;
            }

            const atcCodeList = result.CATALOGENTRY
                ? flattenArray( result.CATALOGENTRY.map( reducerFunction ) )
                : [];

            return handleResult( error, {
                atcCodeList
            }, callback );
        }

        /**
         * Gets molecules by molecule name
         *
         * @param {Object} args
         * @param {Function} [args.callback]
         * @param {Object} args.query
         * @param {String} args.query.name
         * @param {String} args.query.maxResult
         * @returns {Promise<Object|*>}
         */
        async function getMoleculesByName( args ) {
            Y.log( `Executing getMoleculesByName`, 'info', NAME );
            const {query} = args;
            let error, result;

            let _query = {
                name: query.name && `%${query.name}%` || '',
                maxResult: query.maxResult || 200
            };

            [error, result] = await formatPromiseResult(
                getMoleculesProm( {query: _query} )
            );

            if( error || !result ) {
                Y.log( `getMoleculesByName: error while getting molecules: ${error ? error.stack || error : ('result is ' + typeof result)}`, 'error', NAME );
                return handleResult( error, result );
            }

            if( !result.MOLECULE || !result.MOLECULE.length ) {
                error = new Y.doccirrus.commonerrors.DCError( 404, {message: `Molecule name search "${query.name}" returned ${result.COUNT} results`} );
                return handleResult( error, undefined );
            }

            let moleculesResult = result.MOLECULE.map( function( item ) {
                return {
                    _id: item.ID,
                    name: item.NAME
                };
            } );

            return handleResult( error, moleculesResult );
        }

        /**
         * Creates an ICD10 object with name, code and parent (if present)
         * @param {Object} ICD10Entry
         * @param {Array} result
         * @returns {{code: (string), name: (string), parent: (object)}}
         * @private
         */
        function _reduceICD10CodeEntry( ICD10Entry, result ) {
            result = (result && Array.isArray( result ))
                ? result
                : [];

            let icd10CodeObj = {
                name: ICD10Entry.NAME || '',
                icd10Code: ICD10Entry.CODE || '',
                upperCode: ICD10Entry.UPPERCODE || '',
                level: result.length
            };

            result.push( icd10CodeObj );

            if( ICD10Entry.PARENT ) {
                icd10CodeObj = ICD10Entry.PARENT;
                _reduceICD10CodeEntry( icd10CodeObj, result );
            }

            return result;
        }

        /**
         * Maps the ICD10 code list to a simpler object
         * @param {Array} ICD10CodeList
         * @returns {Array}
         * @private
         */
        function _mapCD10CodeList( ICD10CodeList ) {
            if( ICD10CodeList.length ) {
                const icd10CodeListOfLists = ICD10CodeList.map( _reduceICD10CodeEntry );
                return flattenArray( icd10CodeListOfLists );
            }
            return [];
        }

        /**
         * Checks if the package info has pricing information
         * @param {Object} packageEntry
         * @returns {boolean}
         * @private
         */
        function _packageInfoHasPriceInfo( packageEntry ) {
            return Object.keys( packageEntry ).some( ( key ) => priceRegEx.test( key ) );
        }

        /**
         * Maps the package list to a simpler object
         * @param {Array} packageList
         * @returns {Array}
         * @private
         */
        function _mapPackageList( packageList ) {
            if( !packageList.length ) {
                return [];
            }

            let result, priceObj;

            return packageList.map( ( packageEntry ) => {
                result = {
                    pzn: packageEntry.PZN || '',
                    name: packageEntry.NAME || '',
                    quantity: packageEntry.SIZE_AMOUNT || 0,
                    prices: {}
                };

                if( _packageInfoHasPriceInfo( packageEntry ) ) {
                    priceObj = Object.keys( packageEntry ).reduce( ( acc, key ) => {
                        if( priceRegEx.test( key ) ) {
                            acc[key] = packageEntry[key];
                        }
                        return acc;
                    }, {} );
                    result.prices = priceObj;
                }

                return result;
            } );
        }

        /**
         * Maps the composition element to a simple object
         * @param {Object} compositionElement
         * @returns {{name: String, moleculeId: Number}}
         * @private
         */
        function _reduceCompositionElementsList( compositionElement ) {
            return {
                name: compositionElement.MOLECULENAME,
                moleculeTypeCode: compositionElement.MOLECULETYPECODE,
                ingredientCode: [{
                    type: 'MOLECULEID',
                    value: compositionElement.MOLECULEID
                }],
                strengthValue: compositionElement.MASSFROM ? Y.doccirrus.comctl.numberToLocalString( compositionElement.MASSFROM, { intWithoutDec: true } ) : '',
                strengthUnitCode: compositionElement.MOLECULEUNITCODE || ''
            };
        }

        /**
         * Maps the composition elements list to a simple molecule list
         * @param {Array} itemList
         * @returns {Array|*}
         * @private
         */
        function _mapMoleculeList( itemList ) {
            if( !itemList.length ) {
                return [];
            }

            if( !itemList.some( ( item ) => item.COMPOSITIONELEMENTS_LIST && item.COMPOSITIONELEMENTS_LIST.length ) ) {
                return [];
            }

            const
                itemListsWithMolecules = itemList.filter( ( item ) => item.COMPOSITIONELEMENTS_LIST && item.COMPOSITIONELEMENTS_LIST.length ),
                moleculeListOfLists = itemListsWithMolecules.map( ( item ) => {
                    return flattenArray( item.COMPOSITIONELEMENTS_LIST.map( _reduceCompositionElementsList ) );
                } );

            return flattenArray( moleculeListOfLists );
        }

        /**
         * Maps the ATC Code Tree to a simpler object
         * @param {Object} atcCodeTree
         * @param {Array} result
         * @returns {[{name: (*|string), upperCode: (*|string), atcCode: (*|string), parent: (object)}]}
         * @private
         */
        function _reduceATCCodeEntry( atcCodeTree, result ) {
            result = (result && Array.isArray( result ))
                ? result
                : [];

            let atcCodeObj = {
                name: atcCodeTree.NAME || '',
                atcCode: atcCodeTree.CODE || atcCodeTree.NAME_SHORT || '',
                upperCode: atcCodeTree.UPPERCODE || '',
                level: result.length
            };

            if( atcCodeTree.CHILD_LIST ) {
                atcCodeObj.children = atcCodeTree.CHILD_LIST.map( ( entry ) => ({
                    name: entry.NAME || '',
                    atcCode: entry.CODE || atcCodeTree.NAME_SHORT || '',
                    upperCode: entry.UPPERCODE || ''
                }) );
            }

            result.push(atcCodeObj);

            if( atcCodeTree.PARENT ) {
                atcCodeObj = atcCodeTree.PARENT;
                _reduceATCCodeEntry( atcCodeObj, result );

            }

            return result;
        }

        /**
         * Maps the full ATC Code Tree to a simpler object
         *
         * Works when the request is top level and children is more than 1
         *
         * @param {Object} atcCodeTree
         * @returns {{children: [], name: (*|string), upperCode: (string|*), atcCode: (string|*)}}
         * @private
         */
        function _reduceTopDownATCCodeTree( atcCodeTree ) {
            const atcCodeObj = {
                name: atcCodeTree.NAME || '',
                atcCode: atcCodeTree.NAME_SHORT || '',
                upperCode: atcCodeTree.UPPERCODE || '',
                children: []
            };

            if( atcCodeTree.CHILD_LIST ) {
                atcCodeObj.children = atcCodeTree.CHILD_LIST.map( _reduceTopDownATCCodeTree );
            }

            return atcCodeObj;
        }

        /**
         * Maps the item lists' ATCCODE_LIST entry
         * @param {Array} itemList
         * @returns {Array}
         * @private
         */
        function _mapATCCodeList( itemList ) {
            if( !itemList.length ) {
                return [];
            }

            if( !itemList.some( ( item ) => item.ATCCODE_LIST && item.ATCCODE_LIST.length ) ) {
                return [];
            }

            const
                itemListsWithATCCodes = itemList.filter( ( item ) => item.ATCCODE_LIST && item.ATCCODE_LIST.length ),
                atcCodeListOfLists = itemListsWithATCCodes.map( ( item ) => {
                    return flattenArray( item.ATCCODE_LIST.map( _reduceATCCodeEntry ) );
                } );

            return flattenArray( atcCodeListOfLists );

        }

        /**
         * Gets divisibility from the item lists
         * @param {Array} itemList
         * @returns {String}
         * @private
         */
        function _getDivisibility( itemList ) {
            if( !Array.isArray(itemList) || itemList.length === 0 ) {
                return 'UNKNOWN';
            }

            const numberOf = {
                ITEMS: itemList.length,
                NOT_DIVISIBLE: 0,
                DIVISIBLE4: 0,
                DIVISIBLE3: 0,
                DIVISIBLE2: 0,
                DIVISIBLE: 0
            };

            itemList.forEach( ( item ) => {
                if (!item.DIVISIBLE_FLAG) {
                    numberOf.NOT_DIVISIBLE++;
                } else {
                    if( item.DIVISIBLE4_FLAG ) {
                        numberOf.DIVISIBLE4++;
                    } else if( item.DIVISIBLE3_FLAG ) {
                        numberOf.DIVISIBLE3++;
                    } else if( item.DIVISIBLE2_FLAG ) {
                        numberOf.DIVISIBLE2++;
                    }
                    numberOf.DIVISIBLE++;
                }
            } );

            switch( true ) {
                // if some items are not marked as divisible, the whole medication is not divisible
                case numberOf.NOT_DIVISIBLE > 0:
                    return 'NOT_DIVISIBLE';

                // all are divisible by 4
                case numberOf.DIVISIBLE4 === numberOf.ITEMS:
                    return 'DIVISIBLE4';

                // all are divisible by 3
                case numberOf.DIVISIBLE3 === numberOf.ITEMS:
                    return 'DIVISIBLE3';

                // all are divisible by 2, or by 2 + 4
                case numberOf.DIVISIBLE2 === numberOf.ITEMS:
                case (numberOf.DIVISIBLE2 + numberOf.DIVISIBLE4) === numberOf.ITEMS:
                    return 'DIVISIBLE2';

                // all are divisible at all (without a given number)
                case numberOf.DIVISIBLE === numberOf.ITEMS:
                    return 'DIVISIBLE';
            }
            // should not come here
            return 'UNKNOWN';
        }

        /**
         * ----------- FOR REFERENCE -----------
         *
         * let resultStructure = {
                icd10CodeList: [
                    {
                        name: '',
                        icd10Code: '',
                        upperCode: ''
                    },
                    {
                        name: '',
                        icd10Code: '',
                        upperCode: ''
                    },
                    ...
                ],
                name: '',
                atcCodeList: [
                    {
                        name: '',
                        atcCode: '',
                        upperCode: ''
                    },
                    {
                        name: '',
                        atcCode: '',
                        upperCode: '',
                        children: [
                            {
                                name: '',
                                atcCode: '',
                                upperCode: ''
                            },
                            ...
                        ]
                    },
                    ...
                ],
                company: '',
                packageList: [
                    {
                        pzn: '',
                        prices: [
                            {
                                PRICE_PATIENTPAYMENT: 5.56,
                                PRICE_PHARMACYBUY: 35.9,
                                PRICE_PHARMACYSALE: 55.55
                            }
                        ]
                    }
                ]
            };
         */

        /**
         * Queries MMI getProducts to get medications
         *
         * @param {Object} args
         * @param {Object} args.query
         * @param {String} [args.query.atc]
         * @param {String} [args.query.pzn]
         * @param {String} [args.query.idc10]
         * @param {String} [args.query.productName]
         * @param {Number} [args.query.maxResult]
         * @returns {Promise<Object|*>}
         */
        async function getMedications( args ) {
            Y.log( `Executing getMedications`, 'info', NAME );
            const {query: {atc, pzn, icd10, productName, maxResult, moleculeName, fetchProductInfo}} = args;
            let error, result, res, getProductsInfoPromises;

            let _query = {
                atcCodeList: atc && [atc],
                pznList: pzn && [pzn],
                ICD10List: icd10 && [icd10],
                name: productName,
                maxResult: maxResult || 200,
                moleculeName
            };

            [error, result] = await formatPromiseResult(
                getProductsProm( {query: _query} )
            );

            if( error || !result ) {
                Y.log( `getMedications: error while getting medications: ${error ? error.stack || error : ('result is ' + typeof result)}`, 'error', NAME );
                return handleResult( error, result );
            }

            if( !result.PRODUCT || !result.PRODUCT.length ) {
                error = new Y.doccirrus.commonerrors.DCError( 404, {message: `product search "${JSON.stringify(_query)}" returned ${result.COUNT} results`} );
                return handleResult( error, undefined );
            }

            if( fetchProductInfo ) {
                getProductsInfoPromises = result.PRODUCT.map( ( item ) => getProductInfoProm( {
                    query: {
                        documentTypeCode: ['BI', 'SPC'],
                        productId: Boolean( item.IMPORT_FLAG ) ? item.ORIGINALPRODUCTID : item.ID
                    }
                } ) );

                [error, res] = await formatPromiseResult(
                    Promise.all( getProductsInfoPromises )
                );

                if( error || !res ) {
                    Y.log( `getMedications: error while getting product info for medications: ${error ? error.stack || error : ('result is ' + typeof res)}`, 'error', NAME );
                    return handleResult( error, result );
                }
            }

            let catalogsResult = result.PRODUCT.map( ( item, index ) => ({
                icd10CodeList: _mapCD10CodeList( item.ICD10CODE_LIST || [] ),
                name: item.NAME || '',
                company: item.COMPANYNAME || '',
                divisibility: _getDivisibility( item.ITEM_LIST || [] ),
                atcCodeList: _mapATCCodeList( item.ITEM_LIST || [] ),
                packageList: _mapPackageList( item.PACKAGE_LIST || [] ),
                moleculeList: _mapMoleculeList( item.ITEM_LIST || [] ),
                documents: fetchProductInfo ? res[index] : []
            }) );

            return handleResult( error, catalogsResult );
        }

        /**
         * Returns the handler function for the request according to
         * the "executable param" from the whitelist object
         *
         * If inSwiss and catalogShort is HCI: returns default REST 2 handler
         *
         * @param {Object} query
         * @returns {Promise}
         */
        function getHandlerFunction( query ) {
            const includesSwissCountry = Y.config.doccirrus.Env.countryMode.includes( 'CH' );

            // ----------- exception for inSwiss -----------
            if( includesSwissCountry && query.catalogShort === 'HCI' ) {
                return promisifyArgsCallback( Y.doccirrus.RESTController_2.defaultHandlers.get );
            }

            const [searchByParam] = Object.keys( query ).filter( ( param ) => (WHITELISTED_PARAMS[param].handler) );

            return WHITELISTED_PARAMS[searchByParam].handler;
        }

        /**
         * ----------- METHODS -----------
         */

        /**
         * Returns data relating to medicationcatalogs
         * results will depend on the query parameters
         *
         * 1. validate query parameters
         * 2. check if MMI service is enabled/online
         * 3. choose handler function depending on query parameters
         * 4. execute hanlders and return result or error
         *
         * @param {Object} args
         * @param {Object} args.query
         * @param {Function} [args.callback]
         * @returns {Promise<Object|*>}
         */
        async function get( args ) {
            const {callback, query} = args;
            let error, result;

            // ----------- 1. VALIDATE QUERY PARAMS -----------

            error = validateQueryParams( query );

            if( error ) {
                Y.log( `medicationscatalog.get: query did not pass validation: ${error}`, 'warn', NAME );
                return handleResult( error, undefined, callback );
            }

            // ----------- 2. Check whether MMI service is enabled -----------

            [error, result] = await formatPromiseResult(
                getMetaDataProm( {} )
            );

            if( error || !result ) {
                Y.log( `medicationscatalog.get: error while getting metadata: ${!result ? error.stack || error : ('result is ' + typeof result)}`, 'error', NAME );
                return handleResult( error, result, callback );
            }

            // ----------- 3. INITIALISE HANDLER FUNCTION -----------

            const restHandler = getHandlerFunction( query );

            // ----------- 4. Get results from MMI -----------

            [error, result] = await formatPromiseResult(
                restHandler( args )
            );

            if( error ) {
                Y.log( `medicationscatalog.get: error while handling request: ${error.stack || error}`, 'error', NAME );
            }

            return handleResult( error, result, callback );
        }

        Y.namespace( 'doccirrus.api' ).medicationscatalog = {
            name: NAME,

            getATCCatalogEntries,
            get: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.medicationscatalog.get', 'info', NAME );

                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.medicationscatalog.get' );
                }

                return get( args );
            },
            // exporting for testing
            _reduceATCCodeEntry,
            _reduceICD10CodeEntry,
            _getDivisibility
        };

    },
    '0.0.1', {requires: ['medicationscatalog-schema']}
);
