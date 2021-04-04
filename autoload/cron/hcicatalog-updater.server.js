/*jslint anon:true, nomen:true*/
/*global YUI*/

'use strict';

YUI.add( 'HCICatalogUpdater', function( Y, NAME ) {
        const
            fs = require( 'fs' ),
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            {logEnter, logExit} = require( '../../server/utils/logWrapping' )( Y, NAME ),
            moment = require( 'moment' ),
            path = require( 'path' ),
            http = require( 'https' ),
            config = require( 'dc-core' ).config.load( `${process.cwd()}/HCICatalogUpdater.json` ),
            parseString = require( 'xml2js' ).parseString,
            join = require( 'path' ).join,
            baseTmpDir = Y.doccirrus.auth.getTmpDir(),
            dirPath = join( baseTmpDir, 'hci-catalog-raw' ),
            instances = ['article', 'product', 'substance', 'code', 'productQuantity', 'productSubstanceQuantity'],
            files = {
                article: `${dirPath}/Article.xml`,
                product: `${dirPath}/Product.xml`,
                substance: `${dirPath}/Substance.xml`,
                code: `${dirPath}/Code.xml`,
                productQuantity: `${dirPath}/Product_Proprietary_Quantity.xml`,
                productSubstanceQuantity: `${dirPath}/Product_Substance_Alternative_Quantity.xml`
            },
            actionsForHeaders = {
                article: "DownloadArticle",
                product: "DownloadProduct",
                substance: "DownloadSubstance",
                code: "DownloadCode",
                productQuantity: "DownloadProduct_Proprietary_Quantity",
                productSubstanceQuantity: "DownloadProduct_Substance_Alternative_Quantity"
            },
            actionsForEnvelope = {
                article: "DownloadArticleInput",
                product: "DownloadProductInput",
                substance: "DownloadSubstanceInput",
                code: "DownloadCodeInput",
                productQuantity: "DownloadProduct_Proprietary_QuantityInput",
                productSubstanceQuantity: "DownloadProduct_Substance_Alternative_QuantityInput"
            },
            collectionNames = {
                article: "tmp_hciarticle",
                product: "tmp_hciproduct",
                substance: "tmp_hcisubstance",
                code: "tmp_hcicode",
                productQuantity: "tmp_hciproduct_unit",
                productSubstanceQuantity: "tmp_hciproduct_substance_unit",
                output: "tmp_hcicatalog"
            };

        const articleConfig = {
                file: files.article,
                itemsQuery: ["ARTICLE", "ART"],
                collectionName: collectionNames.article,
                mapper: ( item ) => {
                    if( !item.GTIN ) {
                        return null;
                    }
                    let ARTCOMP = (item.ARTCOMP || []).find( cp => {
                        if( cp.ROLE && cp.ROLE[0] ) {
                            return cp.ROLE[0].toUpperCase() === "H";
                        } else {
                            return false;
                        }
                    } );

                    let ARTPRI_PPUB = {}, ARTPRI_PEXF = {}, u_extra = [];

                    (item.ARTPRI || []).forEach( ( ARTPRI ) => {
                        let PTYP = ARTPRI.PTYP ? ARTPRI.PTYP[0] : "";
                        switch( PTYP.toUpperCase() ) {
                            case "PPUB":
                                ARTPRI_PPUB = ARTPRI;
                                u_extra.push( ARTPRI );
                                break;
                            case "PEXF":
                                ARTPRI_PEXF = ARTPRI;
                                u_extra.push( ARTPRI );
                                break;
                            default:
                                u_extra.push( ARTPRI );
                        }
                    } );

                    return {
                        code: (item.GTIN && item.GTIN[0]) || null,
                        phGTIN: (item.GTIN && item.GTIN[0]) || null,
                        phPZN: item.PHARMACODE && item.PHARMACODE[0],
                        prdNo: item.PRDNO && item.PRDNO[0],
                        phUnit: (item.QTYUD && item.QTYUD[0]) || "",
                        phCompany: ((ARTCOMP || {}).COMPNO && (ARTCOMP || {}).COMPNO[0]) || null,
                        phPackSize: item.QTY && item.QTY[0],
                        phDescription: item.DSCRLONGD && item.DSCRLONGD[0],
                        phPriceSale: (ARTPRI_PPUB.PRICE && ARTPRI_PPUB.PRICE[0]) || 0,
                        phPriceCost: (ARTPRI_PEXF.PRICE && ARTPRI_PEXF.PRICE[0]) || 0,
                        u_extra: u_extra,
                        insuranceCode: (((item.ARTINS || [])[0] || {}).NINCD && ((item.ARTINS || [])[0] || {}).NINCD[0]) || "",
                        paidByInsurance: (((item.ARTINS || [])[0] || {}).NINCD && ((item.ARTINS || [])[0] || {}).NINCD[0]) === "10",
                        supplyCategory: (item.SMCAT && item.SMCAT[0]) || "",
                        del: (item.DEL && item.DEL[0]) || false
                    };
                },
                chunkHandler: async ( suUser, article ) => {
                    let err, updatedArticles;
                    if( !article.del ) {
                        [err, updatedArticles] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: suUser,
                            action: 'put',
                            query: {"phPZN": article.phPZN},
                            fields: [
                                'code',
                                'prdNo',
                                'phPZN',
                                'phGTIN',
                                'phUnit',
                                'phCompany',
                                'phPackSize',
                                'phDescription',
                                'phPriceSale',
                                'phPriceCost',
                                'insuranceCode',
                                'paidByInsurance',
                                'supplyCategory',
                                'u_extra'
                            ],
                            model: 'medicationscatalog',
                            data: Y.doccirrus.filters.cleanDbObject( article.toObject() )
                        } ) );

                        if( err ) {
                            throw new Error( err );
                        }

                        if( Array.isArray( updatedArticles ) && updatedArticles.length === 0 ) {
                            return article.phPZN;
                        }
                        return null;
                    } else {
                        await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: suUser,
                            model: 'medicationscatalog',
                            action: 'delete',
                            query: {
                                phPZN: article.phPZN
                            },
                            options: {
                                override: true
                            }
                        } ) );
                    }
                }
            },
            ingrTypeMapper = {
                W: "ACTIVE",
                w: "ACTIVEMINOR",
                A: "FLAVOURING",
                C: "COLOURING",
                K: "PRESERVATIVE",
                X: "ANTIOXIDANT",
                H: "BULKING"
            },
            productConfig = {
                file: files.product,
                itemsQuery: ['PRODUCT', 'PRD'],
                collectionName: collectionNames.product,
                mapper: ( item ) => {
                    if( !item.PRDNO || !item.PRDNO[0] ) {
                        return null;
                    }

                    let CPTCMP = ((item.CPT || {}).CPTCMP && (item.CPT || {}).CPTCMP[0]) || [];
                    let quantityUnit = "";
                    if( item.CPT && item.CPT[0] && item.CPT[0].PQTYU && Array.isArray( item.CPT[0].PQTYU ) && item.CPT[0].PQTYU.length ) {
                        quantityUnit = item.CPT[0].PQTYU[0];
                    }
                    return {
                        _id: (item.PRDNO && item.PRDNO[0]) || null,
                        phAtc: (item.ATC) || null,
                        phIngr: CPTCMP.map( cptcmp => {
                            let WHK = cptcmp.WHK && cptcmp.WHK[0];
                            return {
                                code: cptcmp.SUBNO && cptcmp.SUBNO[0],
                                strength: (cptcmp.QTY && cptcmp.QTY[0]) + (cptcmp.QTYU && cptcmp.QTYU[0]),
                                type: ingrTypeMapper[WHK] || WHK
                            };
                        } ),
                        phForm: item.FORMD && item.FORMD[0],
                        quantityUnit: quantityUnit
                    };
                },
                chunkHandler: async ( suUser, product ) => {
                    let err, currentMedications;
                    [err, currentMedications] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: suUser,
                            action: 'get',
                            query: {"prdNo": product._id},
                            model: 'medicationscatalog'
                        }
                    ) );

                    if( err ) {
                        throw new Error( err );
                    }

                    currentMedications = currentMedications.result ? currentMedications.result : currentMedications;

                    for( let prd of currentMedications ) {
                        let updatedPrd = {
                            ...prd,
                            phAtc: product.phAtc,
                            phForm: product.phForm,
                            phIngr: prd.phIngr.map( ingr => {
                                let newIngr = product.phIngr.find( ing => ing.code === ingr.code );
                                if( newIngr ) {
                                    return {
                                        ...ingr,
                                        strength: newIngr.strength,
                                        type: newIngr.type
                                    };
                                }
                                return ingr;
                            } )
                        };

                        [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: suUser,
                            action: 'put',
                            query: {"prdNo": product._id},
                            fields: [
                                'phAtc',
                                'phIngr',
                                'phForm'
                            ],
                            model: 'medicationscatalog',
                            data: Y.doccirrus.filters.cleanDbObject( updatedPrd )
                        } ) );

                        if( err ) {
                            throw new Error( err );
                        }
                    }
                }
            },
            substanceConfig = {
                file: files.substance,
                itemsQuery: ["SUBSTANCE", "SB"],
                collectionName: collectionNames.substance,
                mapper: ( item ) => {
                    return {
                        _id: item.SUBNO && item.SUBNO[0],
                        name: item.NAMD && item.NAMD[0]
                    };
                },
                chunkHandler: async ( suUser, substance ) => {
                    let err, currentMedications;

                    [err, currentMedications] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: suUser,
                            action: 'get',
                            query: {"phIngr.code": substance._id},
                            model: 'medicationscatalog'
                        }
                    ) );

                    currentMedications = currentMedications.result ? currentMedications.result : currentMedications;

                    for( let medication of currentMedications ) {
                        medication.phIngr.forEach( ingr => {
                            if( ingr.code === substance._id ) {
                                ingr.name = substance.name;
                            }
                        } );

                        [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: suUser,
                            action: 'put',
                            query: {"phIngr.code": substance._id},
                            fields: [
                                'phIngr'
                            ],
                            model: 'medicationscatalog',
                            data: Y.doccirrus.filters.cleanDbObject( medication )
                        } ) );

                        if( err ) {
                            throw new Error( err );
                        }
                    }
                }
            },
            codesTypeToParse = ["20", "9"],
            codeConfig = {
                file: files.code,
                itemsQuery: ["CODE", "CD"],
                ignoreMaxItemCount: true,
                date: moment( '2000-01-01' ).format( 'YYYY-MM-DD' ), //Need all codes for correct update by  productQuantity and productSubstanceConfig chunks
                collectionName: collectionNames.code,
                mapper: ( item ) => {
                    if( codesTypeToParse.indexOf( item.CDTYP && item.CDTYP[0] ) !== -1 ) {
                        return {
                            _id: item.CDVAL && item.CDVAL[0],
                            description: item.DSCRD && item.DSCRD[0],
                            del: item.DEL && item.DEL[0],
                            type: item.CDTYP && item.CDTYP[0]
                        };
                    }
                    return null;
                },
                chunkHandler: async ( suUser, code ) => {
                    let err;
                    code.insuranceDescription = code.description;

                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: suUser,
                        action: 'put',
                        query: {"insuranceCode": code._id},
                        fields: [
                            'insuranceDescription'
                        ],
                        model: 'medicationscatalog',
                        data: code
                    } ) );

                    if( err ) {
                        throw new Error( err );
                    }

                }
            },
            getPhUnitsChunkHandler = ( callScopeName ) => {
                return async ( suUser, productQuantity ) => {
                    let err, code, medication;
                    if( productQuantity || !productQuantity.prdNo ) {
                        return;
                    }

                    [err, medication] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: suUser,
                        action: 'get',
                        query: {"prdNo": productQuantity.prdNo},
                        model: 'medicationscatalog'
                    } ) );

                    if( err ) {
                        Y.log( `getPhUnitsChunkHandler: ${callScopeName} chunk: failed to get medication ${err.stack || err}`, 'error', NAME );
                        throw new Error( err );
                    }

                    medication = medication.result ? medication.result : medication;

                    if( !medication ) {
                        return;
                    }

                    [err, code] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: suUser,
                        action: 'get',
                        query: {"_id": productQuantity.prdNo},
                        model: collectionNames.code
                    } ) );

                    if( err ) {
                        Y.log( `getPhUnitsChunkHandler: ${callScopeName} chunk: failed to get code ${err.stack || err}`, 'error', NAME );
                        throw new Error( err );
                    }

                    code = code.result ? code.result : code;

                    let updatedPhUnit = {
                        phUnit: productQuantity._id,
                        phUnitDescription: code.description
                    };

                    if( medication.units && !medication.find( unit => unit.phUnit === updatedPhUnit.phUnit ) ) {
                        medication.units.push( updatedPhUnit );
                    }

                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: suUser,
                        action: 'update',
                        query: {"_id": medication._id},
                        model: 'medicationscatalog',
                        fields: ['units'],
                        data: Y.doccirrus.filters.cleanDbObject( medication )
                    } ) );

                    if( err ) {
                        Y.log( `getPhUnitsChunkHandler: ${callScopeName} chunk: failed to update medicationCatalog ${err.stack || err}`, 'error', NAME );
                        throw new Error( err );
                    }
                };
            },

            productQuantityConfig = {
                file: files.productQuantity,
                itemsQuery: ["PRODUCT_PROPRIETARY_QUANTITY", "PQ"],
                collectionName: collectionNames.productQuantity,
                mapper: ( item ) => {
                    return {
                        prdNo: item.PRDNO && item.PRDNO[0],
                        quantityUnit: item.PRPQTYU && item.PRPQTYU[0] || ""
                    };
                },
                chunkHandler: getPhUnitsChunkHandler( "productQuantity" )
            },
            productSubstanceQuantityConfig = {
                file: files.productSubstanceQuantity,
                itemsQuery: ["PRODUCT_SUBSTANCE_ALTERNATIVE_QUANTITY", "PAQ"],
                collectionName: collectionNames.productSubstanceQuantity,
                mapper: ( item ) => {
                    if( !item.NSFLAG || !item.NSFLAG[0] || item.NSFLAG[0] === "false" ) {
                        return null;
                    }

                    return {
                        prdNo: item.PRDNO && item.PRDNO[0],
                        quantityUnit: item.QTYU && item.QTYU[0] || "",
                        NSFLAG: item.NSFLAG && Boolean( item.NSFLAG )
                    };
                },
                chunkHandler: getPhUnitsChunkHandler( "productSubstanceQuantity" )
            },
            getActiveTenantsP = promisifyArgsCallback( Y.doccirrus.api.company.getActiveTenants ),
            instanceConfig = {
                'article': articleConfig,
                'product': productConfig,
                'substance': substanceConfig,
                'code': codeConfig,
                'productQuantity': productQuantityConfig,
                'productSubstanceQuantity': productSubstanceQuantityConfig
            };

        Y.doccirrus.media.mkdirIfMissing( dirPath ); //Create tmp dir for xml files
        //Filter: A - Only the currently Active (A) records, D - Only records marked as Deleted (D), ALL - All records
        function getEnvelope( action, date = moment().subtract( 1, 'days' ).format( 'YYYY-MM-DD' ) ) {
            return `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ind="http://www.hcisolutions.ch/index">
                            <soap:Header/><soap:Body>
                            <ind:${action}>
                                <ind:INDEX>medINDEX</ind:INDEX>
                                <ind:FROMDATE>${date}</ind:FROMDATE>
                                <ind:FILTER>A</ind:FILTER>
                            </ind:${action}>
                        </soap:Body></soap:Envelope>`;
        }

        /**
         * Downloads updates from hci download service, and updates the medicationcatalogs model by new data
         * @param suUser
         * @returns {Promise.<void>}
         */

        async function getUpdatedItems( suUser = Y.doccirrus.auth.getSUForLocal() ) {
            const timer = logEnter( "Y.doccirrus.HCICatalogUpdater" );
            if( !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                Y.log( 'getUpdatedItems: Updating HCI catalog is not available in not Switzerland mode', 'info', NAME );
                logExit( timer );
                return;
            }

            let postData, err, newAndUpdatedMedications, activeTenantList = [], notExistedArticles = [];
            try {
                Y.log( `getUpdatedItems: Starting to download XML files`, 'info', NAME );
                let date = await getLastUpdatingDate( suUser );
                for( let instance of instances ) {
                    if( instanceConfig[instance].date ) {
                        date = instanceConfig[instance].date;
                    }
                    postData = getEnvelope( actionsForEnvelope[instance], date );
                    try {
                        await downloadXML( postData, files[instance], actionsForHeaders[instance] );
                    } catch( error ) {
                        Y.log( `getUpdatedItems: Failed to download  XML files from hcisolutions ${error.stack || error}`, 'error', NAME );
                    }
                }
                Y.log( `getUpdatedItems: Started to parse XML files`, 'info', NAME );
                for( let instance of instances ) {
                    await uploadXML( suUser, instanceConfig[instance] );
                }

                Y.log( `getUpdatedItems: Starting to update Catalogs`, 'info', NAME );
                for( let instance of instances ) {
                    if( instance === 'article' ) {
                        notExistedArticles = await updateCatalogByChunk( suUser, articleConfig.collectionName, articleConfig.chunkHandler );
                    }
                    await updateCatalogByChunk( suUser, instanceConfig[instance].collectionName, instanceConfig[instance].chunkHandler );
                }

                Y.log( `getUpdatedItems: Start merging hci data into temp document`, 'info', NAME );

                await mergeData( suUser, notExistedArticles );

                Y.log( `getUpdatedItems: Finished merging hci data into temp document`, 'info', NAME );

                [err, newAndUpdatedMedications] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: suUser,
                    action: 'get',
                    query: {},
                    model: collectionNames.output
                } ) );

                if( err ) {
                    Y.log( `getUpdatedItems: Failed to get medications from temporary catalog ${err.stack || err}`, 'error', NAME );
                    throw new Error( err );
                }

                if( Y.doccirrus.auth.isVPRC() ) {
                    Y.log( `getUpdatedItems: Starting to update Tenants`, 'info', NAME );
                    let activeTenants;
                    [err, activeTenants] = await formatPromiseResult( getActiveTenantsP( {user: suUser} ) );
                    if( err ) {
                        Y.log( `getUpdatedItems: Failed to get active tenants ${err.stack || err}`, 'error', NAME );
                        throw new Error( err );
                    }

                    activeTenantList = activeTenants.map( doc => doc.tenantId );
                }

                //Update medication catalog by new medications
                Y.log( `getUpdatedItems: Starting to update medication catalog by new medications`, 'info', NAME );
                for( let medication of newAndUpdatedMedications ) {
                    delete medication._id;
                    medication = Y.doccirrus.filters.cleanDbObject( medication );
                    let result;
                    [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user: suUser,
                        action: 'put',
                        query: {"phPZN": medication.phPZN},
                        fields: [
                            'code',
                            'prdNo',
                            'phPZN',
                            'phGTIN',
                            'phUnit',
                            'phCompany',
                            'phPackSize',
                            'phAtc',
                            'phDescription',
                            'phPriceSale',
                            'phPriceCost',
                            'insuranceCode',
                            'paidByInsurance',
                            'supplyCategory',
                            'u_extra',
                            'insuranceDescription',
                            'catalogShort',
                            'phIngr',
                            'phForm'
                        ],
                        model: 'medicationscatalog',
                        data: medication
                    } ) );

                    if( err ) {
                        Y.log( `getUpdatedItems: Failed to update  medication in catalog ${err.stack || err}`, 'error', NAME );
                        throw new Error( err );
                    }

                    result = result.result ? result.result : result;
                    /*Insert item into catalog if not existed*/
                    if( Array.isArray( result ) && !result.length ) {
                        [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                            user: suUser,
                            action: 'post',
                            data: medication,
                            model: 'medicationscatalog'
                        } ) );

                        if( err ) {
                            Y.log( `getUpdatedItems: Failed to insert new medication into catalog ${err.stack || err}`, 'error', NAME );
                            throw new Error( err );
                        }
                    }
                    /*Update prices in inStock*/
                    if( activeTenantList && activeTenantList.length ) {
                        let tenantSU = null,
                            stockItems;

                        for( let tenantId of activeTenantList ) {
                            tenantSU = Y.doccirrus.auth.getSUForTenant( tenantId );

                            [err, stockItems] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                                user: tenantSU,
                                action: 'get',
                                query: {"phPZN": medication.phPZN},
                                model: 'instock'
                            } ) );

                            if( err ) {
                                Y.log( `getUpdatedItems: Failed to get stock items ${err.stack || err}`, 'error', NAME );
                                throw new Error( err );
                            }

                            stockItems = stockItems.result ? stockItems.result : stockItems;

                            for( let stockItem of stockItems ) {
                                if( stockItem.phPriceSale !== Number( medication.phPriceSale ) ) {
                                    stockItem.phPriceSale = medication.phPriceSale;
                                    if( !stockItem.notes ) {
                                        stockItem.notes = "";
                                    }

                                    stockItem = Y.doccirrus.filters.cleanDbObject( stockItem );
                                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                                        user: tenantSU,
                                        action: 'put',
                                        data: stockItem,
                                        query: {"phPZN": medication.phPZN},
                                        fields: ["phPriceSale", 'notes'],
                                        model: 'instock'
                                    } ) );

                                    if( err ) {
                                        Y.log( `getUpdatedItems: Failed to update prices in inStock ${err.stack || err}`, 'error', NAME );
                                        throw new Error( err );
                                    }
                                }
                            }

                        }

                    }
                }

                Y.log( `getUpdatedItems: Setting HCI update date in DB`, 'info', NAME );
                await saveLastUpdatingDate( suUser );
            } catch( err ) {
                Y.log( `getUpdatedItems: Failed to update medications catalog ${err.stack || err}`, 'error', NAME );
            }
            logExit( timer );
        }

        /**
         * Gets cursor ana to pass each object to asnyc 'handler'
         * @param user
         * @param collectionName - collection name to get cursor for
         * @param  {function} handler -asnyc method to do something with object which received  via cursor
         * @param skipcheck_ - adds a skipcheck_ property to object which received  via cursor
         * @returns {Promise.<Array>}
         */
        async function updateCatalogByChunk( user, collectionName, handler, skipcheck_ = true ) {
            const timer = logEnter( "Y.doccirrus.updateCatalogByChunk" );
            let cursor = await getCursor( user, collectionName ),
                document, collector = [], result;
            Y.log( `updateCatalogByChunk: Start updating medication catalog by ${collectionName} chunk`, 'info', NAME );

            while( document = await cursor.next() ) {   // eslint-disable-line no-cond-assign
                if( !document ) {
                    break;
                }

                document.skipcheck_ = skipcheck_;
                result = await handler( user, document );
                if( result ) {
                    collector.push( result );
                }
            }
            Y.log( `updateCatalogByChunk: Updating medication catalog by ${collectionName} chunk finished`, 'info', NAME );
            logExit( timer );
            return collector;
        }

        /**
         * Returns cursor for collection
         * @param collectionName
         * @returns {Promise.<void>}
         */
        async function getCursor( suUser, collectionName ) {
            const timer = logEnter( "Y.doccirrus.getCursor" );
            let model, err;
            [err, model] = await formatPromiseResult( Y.doccirrus.mongodb.getModel( suUser, collectionName, true ) );

            if( err ) {
                logExit( timer );
                throw new Error( err );
            }

            logExit( timer );
            return model.mongoose.find( {} ).cursor();
        }

        /***
         * To Concatenate article, products, substances and codes into one collectuion
         * @returns {Promise<void>}
         */
        async function mergeData( suUser, phPZNs ) {
            const timer = logEnter( "Y.doccirrus.mergeData" );
            const catalogShort = "HCI";
            let err;

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: suUser,
                model: collectionNames.output,
                action: 'delete',
                query: {
                    _id: {$exists: true}
                },
                options: {
                    override: true
                }
            } ) );

            if( err ) {
                logExit( timer );
                throw new Error( err );
            }

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: suUser,
                action: "aggregate",
                model: collectionNames.article,
                pipeline: [
                    {
                        $match: {
                            phPZN: {$in: phPZNs}
                        }
                    },
                    {
                        $lookup: {
                            from: `${collectionNames.product}s`,
                            localField: 'prdNo',
                            foreignField: '_id',
                            as: 'product'
                        }

                    },
                    {$unwind: "$product"},
                    {
                        $lookup: {
                            from: `${collectionNames.substance}s`,
                            localField: 'product.phIngr.code',
                            foreignField: '_id',
                            as: 'substances'
                        }
                    },
                    {
                        $lookup: {
                            from: `${collectionNames.code}s`,
                            localField: 'insuranceCode',
                            foreignField: '_id',
                            as: 'insuranceDescription'
                        }
                    },
                    {
                        $lookup: {
                            from: `${collectionNames.code}s`,
                            localField: 'phUnit',
                            foreignField: '_id',
                            as: 'phUnitDescription'
                        }
                    },
                    {
                        $lookup: {
                            from: `${collectionNames.productQuantity}s`,
                            localField: 'prdNo',
                            foreignField: 'prdNo',
                            as: 'units1'
                        }
                    },
                    {
                        $lookup: {
                            from: `${collectionNames.productSubstanceQuantity}s`,
                            localField: 'prdNo',
                            foreignField: 'prdNo',
                            as: 'units2'
                        }
                    },
                    {
                        $addFields: {
                            'units': {
                                $concatArrays: [
                                    '$units1', '$units2', [
                                        {
                                            'prdNo': '$prdNo',
                                            quantityUnit: '$product.quantityUnit'
                                        }]]
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: `${collectionNames.code}s`,
                            localField: 'units.quantityUnit',
                            foreignField: '_id',
                            as: 'units'
                        }
                    },
                    {
                        $project: {
                            code: 1,
                            phPZN: 1,
                            prdNo: 1,
                            phGTIN: 1,
                            phUnit: 1,
                            phCompany: 1,
                            phPackSize: 1,
                            phDescription: 1,
                            phPriceSale: 1,
                            phPriceCost: 1,
                            insuranceCode: 1,
                            paidByInsurance: 1,
                            supplyCategory: 1,
                            u_extra: 1,
                            units: {
                                $map: {
                                    input: '$units',
                                    as: 'unit',
                                    in: {
                                        phUnit: '$$unit._id',
                                        phUnitDescription: '$$unit.description'
                                    }
                                }
                            },
                            phUnitDescription: {$arrayElemAt: ["$phUnitDescription", 0]},
                            insuranceDescription: {$arrayElemAt: ["$insuranceDescription", 0]},
                            phAtc: "$product.phAtc",
                            phIngr: {
                                $map: {
                                    input: "$product.phIngr",
                                    as: "ingr",
                                    in: {
                                        code: "$$ingr.code",
                                        strength: "$$ingr.strength",
                                        type: "$$ingr.type",
                                        subst: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$substances",
                                                        as: "sb",
                                                        cond: {
                                                            $eq: ['$$sb._id', '$$ingr.code']
                                                        }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    }
                                }
                            },
                            phForm: "$product.phForm",
                            substances: "$substances"
                        }
                    },
                    {
                        $project: {
                            code: 1,
                            phPZN: 1,
                            prdNo: 1,
                            phGTIN: 1,
                            phUnit: 1,
                            phCompany: 1,
                            phPackSize: 1,
                            phAtc: 1,
                            phDescription: 1,
                            phPriceSale: 1,
                            phPriceCost: 1,
                            insuranceCode: 1,
                            paidByInsurance: 1,
                            supplyCategory: 1,
                            u_extra: 1,
                            units: 1,
                            phUnitDescription: "$phUnitDescription.description",
                            insuranceDescription: "$insuranceDescription.description",
                            catalogShort: catalogShort,
                            phIngr: {
                                $map: {
                                    input: "$phIngr",
                                    as: "sb",
                                    in: {
                                        code: "$$sb.code",
                                        strength: "$$sb.strength",
                                        name: "$$sb.subst.name",
                                        type: "$$sb.type"
                                    }
                                }
                            },
                            phForm: 1
                        }
                    },
                    {
                        $out: `${collectionNames.output}s`
                    }
                ],
                cursor: {},
                options: {}
            } ) );

            if( err ) {
                Y.log( `mergeData: failed to merge data: ${err}`, 'error', 'NAME' );
                logExit( timer );
                throw new Error( err );
            }
            logExit( timer );
        }

        /**
         * Parse xml and upload to DB
         * @param {module:authSchema.auth} user
         * @param {Object} config
         * @param {string} config.file - xml file name with path
         * @param {array} config.itemsQuery array of string to select elements from xml output
         * @param {string} config.collectionName - model name to insert parsed values
         * @param {function} config.mapper - mapper
         * @returns {Promise<void>}
         */
        async function uploadXML( user, config ) {
            const timer = logEnter( "Y.doccirrus.uploadXML" );
            const {file, itemsQuery, collectionName, mapper} = config;
            let err, data;

            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: collectionName,
                action: 'delete',
                query: {
                    _id: {$exists: true}
                },
                options: {
                    override: true
                }
            } ) );

            if( err ) {
                Y.log( `uploadXML: Failed to delete collection: ${collectionName} : ${err.stack || err}`, 'error', NAME );
                logExit( timer );
                throw new Error( err );
            }

            if( !fs.existsSync( file ) ) {
                logExit( timer );
                throw new Error( `uploadXML: failed to upload xml, file not found ${file}`, 'error', NAME );
            }

            data = fs.readFileSync( file, 'utf8' );
            let stats = fs.statSync( file );

            if( stats.size / 1000000.0 > 60 ) {
                logExit( timer );
                return; //Ignore huge changes
            }

            //Parse XML and insert into tmp collection
            [err] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                parseString( data, async ( err, result ) => {
                    if( err ) {
                        reject( err );
                    }
                    const baseSelector = ((((result || {})['soap:Envelope'] || {})['soap:Body'] || [])[0] || {}),
                        resultOptions = ((baseSelector[itemsQuery[0]] || [])[0] || {}).RESULT,
                        count = (((resultOptions || [])[0] || {}).NBR_RECORD || [])[0];

                    let items = ((baseSelector[itemsQuery[0]] || [])[0] || {})[itemsQuery[1]];

                    if( !config.ignoreMaxItemCount && Number( count ) > 10000 ) {
                        Y.log( `uploadXML: Ignore huge changes ${collectionName}`, 'warn', NAME );
                        items = [];
                    }

                    if( !items && Number( count ) !== 0 ) {
                        Y.log( `uploadXML: Wrong file format, failed to parse ${itemsQuery[0]}`, 'warn', NAME );
                        return reject( `Wrong file format, failed to parse ${itemsQuery[0]}` );
                    }

                    if( Number( count ) === 0 ) {
                        Y.log( `uploadXML: No changes received:  ${collectionName}`, 'warn', NAME );
                        items = [];
                    }

                    items = items.map( mapper );
                    items = items.filter( i => !!i );

                    items = Y.doccirrus.filters.cleanDbObject( items );

                    [err] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: collectionName,
                            action: 'post',
                            data: items,
                            options: {
                                override: true
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `uploadXML: Failed to insert into collection: ${collectionName} : ${err.stack || err}`, 'error', NAME );
                        return reject( err );
                    }

                    return resolve();
                } );

            } ) );

            if( err ) {
                Y.log( `uploadXML: Failed to insert item into collection ${collectionName}: ${err}`, 'error', NAME );
                logExit( timer );
                throw new Error( err );
            }
            Y.log( `uploadXML: ${collectionName} finished`, 'info', NAME );
            logExit( timer );
        }

        /**
         * Download data from hci and save as xml file
         * @param postData - soap envelope
         * @param fileName  - file to save data
         * @param action - action should be placed on request headers
         * @returns {Promise<*>}
         */
        async function downloadXML( postData, fileName, action ) {
            const timer = logEnter( "Y.doccirrus.downloadXML" );
            const
                options = {
                    host: "index.hcisolutions.ch",
                    path: "/Index/current/download.asmx",
                    method: "POST",
                    auth: `${config.username}:${config.password}`,
                    headers: {
                        'Content-Type': "application/soap+xml",
                        'charset': "UTF-8",
                        'action': `http://www.hcisolutions.ch/index/${action}`,
                        'Content-Length': Buffer.byteLength( postData )
                    }
                };

            let err, result;
            //Clear file
            fs.writeFileSync( path.join( fileName ), "", 'utf8' );

            [err, result] = await formatPromiseResult( new Promise( ( resolve, reject ) => {
                const req = http.request( options, ( res ) => {
                    if( res.statusCode !== 200 ) {
                        Y.log( `downloadXML: Request to hcisolutions is not success, statusCode : ${res.statusCode}`, 'error', NAME );
                        reject( -1 );
                    }

                    res.setEncoding( 'utf8' );
                    res.on( 'data', ( chunk ) => {
                        fs.appendFileSync( path.join( fileName ), chunk, ( error ) => {
                            Y.log( `downloadXML: Failed to write into ${fileName} ${error.stack || error}`, 'error', NAME );
                            if( error ) {
                                reject( error );
                            }
                        } );

                    } );
                    res.on( 'end', () => {
                        Y.log( `downloadXML: Finished downloading ${fileName}`, 'info', NAME );
                        resolve();
                    } );
                } );

                req.on( 'error', ( e ) => {
                    Y.log( `downloadXML: Failed to make request to hcisolutions  ${e.stack || e}`, 'error', NAME );
                    reject( e );
                } );

                // Write data to request body
                req.write( postData );
                req.end();
            } ) );
            logExit( timer );

            if( err ) {
                throw new Error( err );
            }
            return result;
        }

        /**
         * Get last catalog updating date from admin model
         * @param suUser
         * @returns date
         */
        async function getLastUpdatingDate( suUser ) {
            const timer = logEnter( "Y.doccirrus.getLastUpdatingDate" );
            let err, result;
            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: suUser,
                model: 'admin',
                action: 'get',
                query: {
                    _id: Y.doccirrus.schemas.admin.getId()
                }
            } ) );

            if( err ) {
                logExit( timer );
                throw new Error( err );
            }
            result = result.result ? result.result : result;

            logExit( timer );
            return moment( result[0].lastHCICatalogUpdatingDate || moment().subtract( 1, 'days' ) ).format( 'YYYY-MM-DD' );
        }

        /**
         * Save today as last catalog updating date
         * @param suUser
         */
        async function saveLastUpdatingDate( suUser ) {
            const timer = logEnter( "Y.doccirrus.saveLastUpdatingDate" );
            let err;
            [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: suUser,
                model: 'admin',
                action: 'put',
                query: {
                    _id: Y.doccirrus.schemas.admin.getId()
                },
                fields: ['lastHCICatalogUpdatingDate'],
                data: Y.doccirrus.filters.cleanDbObject( {lastHCICatalogUpdatingDate: new Date()} )
            } ) );
            logExit( timer );

            if( err ) {
                throw new Error( err );
            }
        }

        /**
         *
         * @param {Function} callback
         * @return {*}
         */
        function init( callback ) {
            if( !Y.doccirrus.ipc.isMaster() ) {
                return callback();
            }
            if( (Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isMVPRC()) && Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                Y.doccirrus.kronnd.on( 'HCICatalogUpdate', getUpdatedItems );
            }
            return callback();
        }

        function getConfigs() {
            return {
                articleConfig,
                substanceConfig,
                codeConfig,
                productConfig,
                productQuantityConfig,
                productSubstanceQuantityConfig,
                collectionNames
            };
        }

        Y.namespace( 'doccirrus' ).HCICatalogUpdater = {
            init: init,
            uploadXML,
            getConfigs,
            updateCatalogByChunk,
            mergeData
        };

    },
    '0.0.1', {
        requires: [
            'dcmongodb',
            'dckronnd',
            'dcscheduling',
            'dclicmgr',
            'dcauth',
            'dcpatalert',
            'mojito',
            'dcutils'

            // @see https://confluence.intra.doc-cirrus.com/display/SD/YUI+Dependencies
            // 'dcfilters',
            // 'dcipc',
            // 'dccommonutils',
            // 'admin-schema',
            // 'company-api',
            // 'dcmedia-store'
        ]
    }
);