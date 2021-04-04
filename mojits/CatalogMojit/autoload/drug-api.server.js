/**
 * User: nicolas.pettican
 * Date: 21.04.20  12:11
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI */

YUI.add( 'drug-api', function( Y, NAME ) {

        /** @module drug-api */

        const
            {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils,
            {flattenArray} = Y.doccirrus.commonutils,

            getMetaDataProm = promisifyArgsCallback( Y.doccirrus.api.mmi.getMetaData ),
            getMoleculesProm = promisifyArgsCallback( Y.doccirrus.api.mmi.getMolecules ),
            getProductsProm = promisifyArgsCallback( Y.doccirrus.api.mmi.getProducts ),
            mapProductsProm = promisifyArgsCallback( Y.doccirrus.api.mmi.mapProducts ),
            getATCCatalogEntriesProm = promisifyArgsCallback( Y.doccirrus.api.mmi.getATCCatalogEntries ),
            getProductInfoProm = promisifyArgsCallback( Y.doccirrus.api.mmi.getProductInfo ),
            getPackagesDetailsProm = promisifyArgsCallback( Y.doccirrus.api.mmi.getPackagesDetails ),

            priceRegEx = /^PRICE.*(PATIENT|PHARMACY|FIXED)/,
            anatomicalAtcLevelRegEx = /^\w$/,

            /**
             * These exist because there used to be different handler functions
             * now we only have "getDrugs". Given this is a special endpoint we can
             * leave this whitelist as an extra layer that returns more verbose
             * and specific error responses for this endpoint.
             *
             * The query parameters with different handler functions cannot be stacked,
             * and at the same time the user needs to pass at least one of them. This
             * is checked for in the validateQueryParams method
             */
            WHITELISTED_PARAMS = {
                catalogShort: {
                    required: true, // if param is required it needs a 'missingParamErrorMessage' to send back to the client
                    missingParamErrorMessage: 'Please define catalog (catalogShort) when having more than one countryMode set',
                    enums: ['MMI', 'HCI'],
                    additionalValidator: catalogShortValidator
                },
                maxResult: {},
                fetchProductInfo: {},
                fetchPackageDetails: {},
                originalResult: {},
                moleculeName: {
                    handler: getDrugs
                },
                atc: {
                    handler: getDrugs
                },
                pzn: {
                    handler: getDrugs
                },
                productName: {
                    handler: getDrugs
                },
                icd10: {
                    handler: getDrugs
                }
            },

            /**
             * Shortcode dictionary, just for reference
             * can be retrieved by /2/drug/:getShortCodeMap
             *
             * @type {Object}
             */
            shortCodeMap = {
                // relates to ATC
                atcCodeLevels: {
                    'AG': 'Anatomical group',
                    'TH': 'Therapeutic group',
                    'TPU': 'Therapeutic Pharmacological group',
                    'CTPU': 'Chemical Therapeutic Pharmacological group',
                    'CS': 'Chemical Substance group',
                    'N/A': 'Unknown'
                },
                // relates to ICD10
                icd10CodeLevels: {
                    'CHP': 'Chapter',
                    'CAT': 'Category',
                    'SUB': 'Cubcategory',
                    'LOC': 'Anatomical site or location of injury',
                    'SPL': 'Specific site, severity or other vital clinical details',
                    'EXT': 'Specific site with special extension',
                    'GRP': 'Group',
                    'N/A': 'Unknown'
                },
                // relates to drug information
                documents: {
                    'BI': 'Patient information',
                    'SPC': 'Professional information'
                },
                // relates to molecule types
                moleculeTypeCodes: {
                    'A': 'Active ingredient',
                    'I': 'Other ingredient'
                }
            };

        /**
         * ----------- CUSTOM VALIDATORS -----------
         */

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
                paramsWithHandler = [],
                paramsWithHandlerHandlers = new Set();

            let error;

            // ----------- 1. VALIDATE IF DISALLOWED PARAMS ARE PRESENT -----------

            if( queryParamsListAll.length > queryParamsList.length ) {
                let disallowedParams = queryParamsListAll.filter( ( param ) => (!queryParamsList.includes( param )) );

                return new Y.doccirrus.commonerrors.DCError( 400, {message: `${disallowedParams.join( ', ' )} not allowed!`} );
            }

            for( let param of whitelistedParamsList ) {

                let {required, enums, missingParamErrorMessage, additionalValidator, handler} = WHITELISTED_PARAMS[param];

                // ----------- 2. VALIDATE IF REQUIRED PARAMS ARE PRESENT -----------

                if( required && !queryParamsList.includes( param ) ) {
                    return new Y.doccirrus.commonerrors.DCError( 400, {
                        message: missingParamErrorMessage || `Missing required param ${param}`
                    } );
                }

                if( queryParamsList.includes( param ) ) {

                    // ----------- 3. VALIDATE IF THERE ARE DISALLOWED PARAM STACKS -----------

                    if( handler ) {
                        let handlerName = handler.name;
                        paramsWithHandler.push( param );
                        paramsWithHandlerHandlers.add( handlerName );

                        if( paramsWithHandlerHandlers.size >= 2 ) {
                            return new Y.doccirrus.commonerrors.DCError( 400, {
                                message: `Parameters "${paramsWithHandler.join( '" and "' )}" cannot be sent in the same request`
                            } );
                        }
                    }

                    // ----------- 4. VALIDATE IF PARAMS WITH EXPECTED ENUMS PASS -----------

                    if( enums && !enums.includes( query[param] ) ) {
                        return new Y.doccirrus.commonerrors.DCError( 400, {
                            message: `For ${param} please provide one of the following: ${enums.join( ', ' )}`
                        } );
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

            // ----------- 6. VALIDATE IF ANY PARAM WITH HANDLER IS INCLUDED -----------

            if( !paramsWithHandler.length ) {
                let allSearchByParams = whitelistedParamsList.filter( ( param ) => (WHITELISTED_PARAMS[param].handler) );

                error = new Y.doccirrus.commonerrors.DCError( 400, {message: `Request must include catalogShort and any of the following: ${allSearchByParams.join( ', ' )}`} );
            }

            return error;
        }

        /**
         * ----------- HANDLER FUNCTIONS -----------
         */

        /**
         * Creates an ICD10 object with name, code and parent (if present)
         * @param   {Object}        ICD10Entry
         * @param   {Array}         result
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
                level: _getICD10CodeLevelKey( {icd10Code: ICD10Entry.CODE || '', upperCode: ICD10Entry.UPPERCODE} )
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
         * @param {Object}  args
         * @param {Array} args.packageList
         * @param {Array} args.packageDetailsMap
         * @param {Array} [args.originalResult]
         * @returns {Array}
         * @private
         */
        function _mapPackageList( args ) {
            const
                {packageList, packageDetailsMap, originalResult} = args,
                pricesDictionary = {
                    PRICE_PATIENTPAYMENT: 'pricePatientPayment',
                    PRICE_PHARMACYBUY: 'pricePharmacyBuy',
                    PRICE_PHARMACYSALE: 'pricePharmacySale',
                    PRICE_FIXED: 'priceFixed'
                },
                priceKeys = Object.keys(pricesDictionary);

            if( !packageList.length ) {
                return [];
            }

            let result, priceObj, priceKey, packageDetails, priceHistory;

            return packageList.map( ( packageEntry ) => {
                result = {
                    pzn: packageEntry.PZN || '',
                    pznOriginal: packageEntry.PZN_ORIGINAL || '',
                    name: packageEntry.NAME || '',
                    quantity: packageEntry.SIZE_AMOUNT || 0,
                    prices: {},
                    phSalesStatus: Y.doccirrus.schemas.v_medication.mapSalesSatusCode( packageEntry.SALESSTATUSCODE ),
                    phNormSize: packageEntry.SIZE_NORMSIZECODE || 'UNKNOWN'
                };

                if( _packageInfoHasPriceInfo( packageEntry ) ) {
                    priceObj = Object.keys( packageEntry ).reduce( ( acc, MMIKey ) => {
                        if( priceKeys.includes(MMIKey) ) {
                            priceKey = pricesDictionary[MMIKey];
                            acc[priceKey] = packageEntry[MMIKey];
                        }
                        return acc;
                    }, {} );
                    result.prices = priceObj;
                }

                if( packageDetailsMap.size && packageDetailsMap.has( packageEntry.PZN ) ) {
                    packageDetails = packageDetailsMap.get( packageEntry.PZN );

                    if( !packageDetails.length ) {
                        return result;
                    }

                    packageDetails = packageDetails[0] || {};
                    priceHistory = packageDetails.phPriceHistory;
                    result.priceHistory = priceHistory || [];

                    if( originalResult ) {
                        result.original = packageDetails;
                    }
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
                ingredientCode: [
                    {
                        type: 'MOLECULEID',
                        value: compositionElement.MOLECULEID
                    }],
                strengthValue: compositionElement.MASSFROM ? Y.doccirrus.comctl.numberToLocalString( compositionElement.MASSFROM, {intWithoutDec: true} ) : '',
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

            const atcCode = atcCodeTree.CODE || atcCodeTree.NAME_SHORT || '';
            let atcCodeObj = {
                name: atcCodeTree.NAME || '',
                atcCode,
                upperCode: atcCodeTree.UPPERCODE || '',
                level: _getATCCodeLevelKey( atcCode )
            };

            if( atcCodeTree.CHILD_LIST ) {
                atcCodeObj.children = atcCodeTree.CHILD_LIST.map( ( entry ) => ({
                    name: entry.NAME || '',
                    atcCode: entry.CODE || atcCodeTree.NAME_SHORT || '',
                    upperCode: entry.UPPERCODE || ''
                }) );
            }

            result.push( atcCodeObj );

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
            const atcCode = atcCodeTree.NAME_SHORT || '';
            const atcCodeObj = {
                name: atcCodeTree.NAME || '',
                atcCode,
                upperCode: atcCodeTree.UPPERCODE || '',
                level: _getATCCodeLevelKey( atcCode ),
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
         * Returns the ATC code level key
         * @param {String} atcCode
         * @returns {string}
         */
        function _getATCCodeLevelKey( atcCode ) {
            const atcCodeLength = atcCode.length;

            switch( atcCodeLength ) {
                case 1:
                    return 'AG'; // anatomical
                case 3:
                    return 'TH'; // therapeutic
                case 4:
                    return 'TPU'; // therapeutic pharmacological
                case 5:
                    return 'CTPU'; // chemical therapeutic pharmacological
                case 7:
                    return 'CS'; // chemical substance
                default:
                    return 'N/A'; // unknown
            }
        }

        /**
         * Returns the ICD10 code level key
         *
         * Based on research from these websites:
         * https://www.webpt.com/blog/post/understanding-icd-10-code-structure/
         * https://icd.codes/icd10cm
         * @param {Object}  args
         * @param {String} args.icd10Code
         * @param {String} [args.upperCode]
         * @returns {string}
         */
        function _getICD10CodeLevelKey( args ) {
            const
                {icd10Code, upperCode} = args,
                icd10CodeLength = icd10Code.length,
                etiologyLevelRegEx = /[A-Z][0-9][A-Z0-9](\.[A-Z0-9]{0,4})/,
                categoryLevelRegEx = /[A-Z][0-9][A-Z0-9]-[A-Z][0-9][A-Z0-9]/;

            if( !upperCode && categoryLevelRegEx.test( icd10Code ) ) {
                return 'CHP'; // chapter
            }

            if( icd10CodeLength === 3 ) {
                return 'CAT'; // category
            }

            if( etiologyLevelRegEx.test( icd10Code ) ) {
                const
                    etiologyCode = icd10Code.split( /\./ ).pop(),
                    etiologyCodeLength = etiologyCode.length;

                switch( etiologyCodeLength ) {
                    case 1:
                        return 'SUB'; // subcategory
                    case 2:
                        return 'LOC'; // anatomical site or location of injury
                    case 3:
                        return 'SPL'; // specific site, severity or other vital clinical details
                    case 4:
                        return 'EXT'; // special extension
                    default:
                        break;
                }
            }

            if( categoryLevelRegEx.test( icd10Code ) ) {
                return 'GRP'; // group
            }

            return 'N/A'; // unknown
        }

        /**
         * Gets divisibility from the item lists
         * @param {Array} itemList
         * @returns {String}
         * @private
         */
        function _getDivisibility( itemList ) {
            if( !Array.isArray( itemList ) || itemList.length === 0 ) {
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
                if( !item.DIVISIBLE_FLAG ) {
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
         * Main GET handler
         *
         * Queries MMI getProducts to get drugs
         *
         * 1. Creates MMI query
         * 2. Executes mmi.getProducts
         * 3. [fetches product information]
         * 4. Maps the medications to the "drug" schema (originally only done for the AMTS project MOJ-12555)
         * 5. Uses mmi._mapProduct to obtain more product information
         * 6. Merges product information with drugs
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
        async function getDrugs( args ) {
            Y.log( `Executing getDrugs`, 'info', NAME );
            const {
                query: {
                    atc,
                    pzn,
                    icd10,
                    productName,
                    maxResult,
                    moleculeName,
                    fetchProductInfo,
                    fetchPackageDetails,
                    originalResult
                }
            } = args;
            let
                error, result,
                product, productInfo, productInfoList = [],
                drug, drugs, phDrugs,
                packageEntry, packageDetails, packageDetailsMap = new Map(),
                atcCodeList;

            // ----------- CREATE MMI QUERY -----------

            const _query = {
                atcCodeList: atc && [atc],
                pznList: pzn && [pzn],
                ICD10List: icd10 && [icd10],
                name: productName,
                maxResult: maxResult || 200,
                moleculeName
            };

            // ----------- CALL MMI.GETPRODUCTS -----------

            [error, result] = await formatPromiseResult(
                getProductsProm( {query: _query} )
            );

            if( error || !result ) {
                Y.log( `getDrugs: error while getting drugs: ${error ? error.stack || error : ('result is ' + typeof result)}`, 'error', NAME );
                return handleResult( error, undefined );
            }

            if( !result.PRODUCT || !result.PRODUCT.length ) {
                error = new Y.doccirrus.commonerrors.DCError( 404, {message: `product search "${JSON.stringify( _query )}" returned ${result.COUNT} results`} );
                return handleResult( error, undefined );
            }

            // ----------- FETCH MORE PRODUCT INFORMATION -----------

            if( fetchProductInfo ) {
                for( product of result.PRODUCT ) {
                    [error, productInfo] = await formatPromiseResult(
                        getProductInfoProm( {
                            query: {
                                documentTypeCode: ['BI', 'SPC'],
                                productId: Boolean( product.IMPORT_FLAG ) ? product.ORIGINALPRODUCTID : product.ID
                            }
                        } )
                    );

                    if( error || !productInfo ) {
                        Y.log( `getDrugs: error while getting product info for drugs: ${error ? error.stack || error : ('result is ' + typeof productInfo)}`, 'error', NAME );
                        continue;
                    }

                    productInfoList.push( productInfo );
                }
            }

            // ----------- FETCH PACKAGE DETAILS -----------

            if( fetchPackageDetails ) {
                for( product of result.PRODUCT ) {
                    if( !product.PACKAGE_LIST || !product.PACKAGE_LIST.length ) {
                        continue;
                    }
                    for( packageEntry of product.PACKAGE_LIST ) {
                        [error, packageDetails] = await formatPromiseResult(
                            getPackagesDetailsProm( {
                                query: {
                                    pznList: [packageEntry.PZN],
                                    productIdList: [product.ID]
                                }
                            } )
                        );

                        if( error || !packageDetails ) {
                            Y.log( `getDrugs: error while getting package details for PZN ${packageEntry.PZN}: ${error ? error.stack || error : ('result is ' + typeof productInfo)}`,
                                'error', NAME );
                            continue;
                        }

                        packageDetailsMap.set( packageEntry.PZN, packageDetails.data || [] );
                    }
                }
            }

            // ----------- MAP THE PRODUCTS TO DRUG OBJECTS -----------

            drugs = result.PRODUCT.map( ( product, index ) => {
                atcCodeList = _mapATCCodeList( product.ITEM_LIST || [] );

                drug = {
                    icd10CodeList: _mapCD10CodeList( product.ICD10CODE_LIST || [] ),
                    name: product.NAME || '',
                    company: product.COMPANYNAME || '',
                    divisibility: _getDivisibility( product.ITEM_LIST || [] ),
                    actCode: atcCodeList[0] ? atcCodeList[0].atcCode : '',
                    atcCodeList,
                    packageList: _mapPackageList( {
                        packageList: product.PACKAGE_LIST || [],
                        packageDetailsMap,
                        originalResult
                    } ),
                    moleculeList: _mapMoleculeList( product.ITEM_LIST || [] )
                };

                if( originalResult ) {
                    drug.original = product;
                }

                if( fetchProductInfo ) {
                    drug.documents = productInfoList[index];
                }

                return drug;
            } );

            // ----------- COLLECT MORE NATIVE INSUITE MAPPINGS -----------

            [error, phDrugs] = await formatPromiseResult(
                mapProductsProm( {data: result, doMinimalMapping: true} )
            );

            if( error || !phDrugs ) {
                Y.log( `getDrugs: error while mapping drugs: ${error ? error.stack || error : ('result is ' + typeof phDrugs)}`, 'error', NAME );
                return handleResult( error, drugs );
            }

            // ----------- MERGE INTO DRUGS -----------

            drugs = _mergeDrugsWithPhDrugs( {drugs, phDrugs} );

            return handleResult( error, drugs );
        }

        /**
         * Merges the "medicationscatalog" medication structure with the "drug" structure
         * @param {Object}  args
         * @param {Array} args.drugs
         * @param {Array} args.phDrugs
         * @returns {[drug]}
         */
        function _mergeDrugsWithPhDrugs( args ) {
            const
                {drugs, phDrugs} = args,
                mergedDrugs = [],
                fieldsToInclude = {
                    phTer: 'isTeratogen', // RECIPET_FLAG
                    phTrans: 'isTransfusion', // TRANSFUSIONLAW_FLAG
                    phImport: 'isReImport', // IMPORT_FLAG
                    phNegative: 'isInNegative', // NEGATIVE_FLAG
                    phLifeStyle: 'isLifestyleDrug', // LIFESTYLE_FLAG
                    phLifeStyleCond: 'isConditionalLifeStyleDrug', // LIFESTYLE_FLAG
                    phGBA: 'isGBATherapyAdvice', // THERAPYHINTNAME
                    phDisAgr: 'isDiscountAgreement', // DISAGR_FLAG
                    phDisAgrAlt: 'isAltDiscountAgreement', // DISAGR_ALTERNATIVEEXIST_FLAG
                    phMed: 'isMedProduct', // MEDICINEPRODUCT_FLAG
                    phPrescMed: 'isPrescMed', // MEDICINEPRODUCTEXCEPTION_FLAG
                    phOTC: 'isOTC', // DISPENSINGTYPECODE
                    phOnly: 'isPharmacyOnly', // DISPENSINGTYPECODE
                    phRecipeOnly: 'isRecipeOnly', // DISPENSINGTYPECODE
                    phBTM: 'isBTM', // DISPENSINGTYPECODE
                    phContraceptive: 'isContraceptive', // DISPENSINGTYPECODE
                    phGBATherapyHintName: 'GBATherapyHintName', // THERAPYHINTNAME
                    phForm: 'formAbbreviation'
                };
            let drug, phDrug, index, phField, field;

            for( [index, drug] of drugs.entries() ) {
                phDrug = phDrugs[index];

                for( [phField, field] of Object.entries( fieldsToInclude ) ) {
                    if( phDrug[phField] === undefined ) {
                        continue;
                    }
                    drug[field] = phDrug[phField];
                }

                if( phDrug.phIcons && phDrug.phIcons.length ) {
                    drug = _addIconsToDrug( {drug, phIcons: phDrug.phIcons} );
                }

                if( phDrug.phIdenta && phDrug.phIdenta.length ) {
                    drug = _addIdentaToDrug( {drug, phIdentaImages: phDrug.phIdenta} );
                }

                mergedDrugs.push( drug );
            }

            return mergedDrugs;
        }

        /**
         * Adds the signet icon information to the drug
         * @param {Object}  args
         * @param {Object}  args.drug
         * @param {Array}   args.phIcons
         * @returns {drug}
         * @private
         */
        function _addIconsToDrug( args ) {
            const {drug, phIcons} = args;

            drug.signetIcons = phIcons.map( ( icon ) => ({
                title: icon.title,
                src: `/static/dcbaseapp/assets/img/MMI/signets/${icon.src}.png`
            }) );

            return drug;
        }

        /**
         * Adds the IDENTA image information to the drug object
         *  @param {Object}  args
         * @param {Object}  args.drugg
         * @param {Array}   args.phIdentaImages
         * @returns {drug}
         * @private
         */
        function _addIdentaToDrug( args ) {
            const {drug, phIdentaImages} = args;

            drug.identaImages = phIdentaImages.map( ( img ) => ({
                weight: img.title,
                diameter: img.diameter,
                height: img.height,
                src: `/mmi-download/IDENTA/${img.image}`
            }) );

            return drug;
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

            if( anatomicalAtcLevelRegEx.test( atc ) && query.children > 1 ) {
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
            const {query, callback} = args;
            let error, result;

            const _query = {
                name: query.name && `%${query.name}%` || '',
                maxResult: query.maxResult || 200
            };

            [error, result] = await formatPromiseResult(
                getMoleculesProm( {query: _query} )
            );

            if( error || !result ) {
                Y.log( `getMoleculesByName: error while getting molecules: ${error ? error.stack || error : ('result is ' + typeof result)}`, 'error', NAME );
                return handleResult( error, result, callback );
            }

            if( !result.MOLECULE || !result.MOLECULE.length ) {
                error = new Y.doccirrus.commonerrors.DCError( 404, {message: `Molecule name search "${query.name}" returned ${result.COUNT} results`} );
                return handleResult( error, undefined, callback );
            }

            let moleculesResult = result.MOLECULE.map( function( product ) {
                return {
                    _id: product.ID,
                    name: product.NAME
                };
            } );

            return handleResult( error, moleculesResult, callback );
        }

        /**
         * Returns the shortCodeMap for the ATC and ICD10 shortcodes
         * @param {Object}  args
         * @param {Function} args.callback
         * @returns {Promise<Object|*>}
         */
        async function getShortCodeMap( args ) {
            const {callback} = args;
            Y.log( `Executing getShortCodeMap`, 'info', NAME );
            return handleResult( undefined, {shortCodeMap}, callback );
        }

        /**
         * Returns drug data from MMI
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
                Y.log( `drug-api.get: query did not pass validation: ${error}`, 'warn', NAME );
                return handleResult( error, undefined, callback );
            }

            // ----------- 2. CHECK WHETHER MMI SERVICE IS ENABLED -----------

            [error, result] = await formatPromiseResult(
                getMetaDataProm( {} )
            );

            if( error || !result ) {
                Y.log( `drug-api.get: error while getting metadata: ${!result ? error.stack || error : ('result is ' + typeof result)}`, 'error', NAME );
                return handleResult( error, result, callback );
            }

            // ----------- 3. INITIALISE HANDLER FUNCTION -----------

            const restHandler = getHandlerFunction( query );

            // ----------- 4. GET RESULTS FROM MMI -----------

            [error, result] = await formatPromiseResult(
                restHandler( args )
            );

            if( error ) {
                Y.log( `drug-api.get: error while handling request: ${error.stack || error}`, 'error', NAME );
            }

            return handleResult( error, result, callback );
        }

        /**
         * Checks if the user has the inScribe license in order to use this endpoint
         * @param {Object}  args
         * @param {Object} args.user
         * @returns {Boolean}
         */
        function userHasLicense( args ) {
            Y.log( 'Y.doccirrus.api.drug.*: checking for inScribe license', 'info', NAME );

            const {user} = args;

            return Y.doccirrus.licmgr.hasAdditionalService(
                user.tenantId,
                Y.doccirrus.schemas.settings.additionalServiceKinds.INSCRIBE
            );
        }

        /**
         * ----------- EXPORTS -----------
         */

        const
            privateMethods = {
                _reduceATCCodeEntry,
                _reduceICD10CodeEntry,
                _getDivisibility,
                _mapPackageList,
                _reduceCompositionElementsList,
                _mapMoleculeList,
                _reduceTopDownATCCodeTree,
                _mapATCCodeList,
                _getICD10CodeLevelKey,
                _getATCCodeLevelKey,
                _mergeDrugsWithPhDrugs
            },
            permissionDenied = new Y.doccirrus.commonerrors.DCError( 403, {message: 'Access forbidden'} );
        let
            drugApiMethods = {
                getATCCatalogEntries: function( args ) {
                    Y.log( 'Entering Y.doccirrus.api.drug.getATCCatalogEntries', 'info', NAME );

                    if( args.callback ) {
                        args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                            .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.drug.getATCCatalogEntries' );
                    }

                    if( userHasLicense( args ) ) {
                        return getATCCatalogEntries( args );
                    }

                    return handleResult( permissionDenied, undefined, args.callback );
                },
                getMoleculesByName: function( args ) {
                    Y.log( 'Entering Y.doccirrus.api.drug.getMoleculesByName', 'info', NAME );

                    if( args.callback ) {
                        args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                            .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.drug.getMoleculesByName' );
                    }

                    if( userHasLicense( args ) ) {
                        return getMoleculesByName( args );
                    }

                    return handleResult( permissionDenied, undefined, args.callback );
                },
                getShortCodeMap: function( args ) {
                    Y.log( 'Entering Y.doccirrus.api.drug.getShortCodeMap', 'info', NAME );

                    if( args.callback ) {
                        args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                            .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.drug.getShortCodeMap' );
                    }

                    if( userHasLicense( args ) ) {
                        return getShortCodeMap( args );
                    }

                    return handleResult( permissionDenied, undefined, args.callback );
                },
                get: function( args ) {
                    Y.log( 'Entering Y.doccirrus.api.drug.get', 'info', NAME );

                    if( args.callback ) {
                        args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                            .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.drug.get' );
                    }

                    if( userHasLicense( args ) ) {
                        return get( args );
                    }

                    return handleResult( permissionDenied, undefined, args.callback );
                }
            };

        // add private methods only for testing
        if( Y.doccirrus.auth.isDevServer() || Y.doccirrus.auth.isMocha() ) {
            drugApiMethods = {
                ...drugApiMethods,
                ...privateMethods
            };
        }

        Y.namespace( 'doccirrus.api' ).drug = {
            name: NAME,
            ...drugApiMethods
        };

    },
    '0.0.1', {requires: ['drug-schema']}
);
