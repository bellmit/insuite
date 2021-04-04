/**
 * User: dcdev
 * Date: 7/26/19  2:18 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global Y, it, describe, after,should, before, beforeEach, afterEach, expect */
const
    fs = require( 'fs' ),
    {formatPromiseResult} = require( 'dc-core' ).utils,
    user = Y.doccirrus.auth.getSUForLocal(),
    substanceData = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><SUBSTANCE CREATION_DATETIME="2019-07-26T14:55:07.27122+02:00" PROD_DATE="2019-07-26T00:00:00" VALID_DATE="2019-07-26T00:00:00" RELEASE="2019-05" xmlns="http://www.hcisolutions.ch/index"><SB DT="2019-07-25T00:00:00+02:00"><SUBNO>212521</SUBNO><NAMD>Lomitapid</NAMD><ANAMD>Lomitapid</ANAMD><NAMF>Lomitapide</NAMF><NAML>Lomitapidum</NAML><CAS>0182431-12-5</CAS><MMASS>693,72</MMASS><FORMULA>C39H37F6N3O2</FORMULA><DEL>false</DEL></SB><RESULT><OK_ERROR>OK</OK_ERROR><NBR_RECORD>1</NBR_RECORD><ERROR_CODE /><MESSAGE>Input parameters INDEX: MEDINDEX, FROMDATE: 2019-07-25, FILTER: ALL</MESSAGE></RESULT></SUBSTANCE></soap:Body></soap:Envelope>`,
    codeData = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><CODE CREATION_DATETIME="2019-07-26T14:55:07.44282+02:00" PROD_DATE="2019-07-26T00:00:00" VALID_DATE="2019-07-26T00:00:00" RELEASE="2019-05" xmlns="http://www.hcisolutions.ch/index"><CD DT="2019-07-26T00:00:00+02:00"><CDTYP>20</CDTYP><CDVAL>06.20.05.00</CDVAL><DSCRD>Formula magistralis</DSCRD><DSCRF>formule magistrale</DSCRF><PV>06.20.00.00</PV><DEL>false</DEL></CD><CD DT="2019-07-26T00:00:00+02:00"><CDTYP>9</CDTYP><CDVAL>Stk</CDVAL><DSCRD>Struk</DSCRD><DSCRF>Struk</DSCRF><PV>06.20.00.00</PV><DEL>false</DEL></CD><RESULT><OK_ERROR>OK</OK_ERROR><NBR_RECORD>23</NBR_RECORD><ERROR_CODE /><MESSAGE>Input parameters INDEX: MEDINDEX, FROMDATE: 2019-07-25, FILTER: ALL</MESSAGE></RESULT></CODE></soap:Body></soap:Envelope>`,
    productData = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><PRODUCT CREATION_DATETIME="2019-07-26T14:55:05.71122+02:00" PROD_DATE="2019-07-26T00:00:00" VALID_DATE="2019-07-26T00:00:00" RELEASE="2019-05" xmlns="http://www.hcisolutions.ch/index"><PRD DT="2019-07-25T00:00:00+02:00"><PRDNO>1234443</PRDNO><DSCRD>ARTEOPTIC Gtt Opht 2 %</DSCRD><DSCRF>ARTEOPTIC gtt opht 2 %</DSCRF><DSCRLONGD>Arteoptic Gtt Opht 2 %</DSCRLONGD><DSCRLONGF>Arteoptic gtt opht 2 %</DSCRLONGF><BNAMD>Arteoptic</BNAMD><BNAMF>Arteoptic</BNAMF><BNAMLONGD>Arteoptic</BNAMLONGD><BNAMLONGF>Arteoptic</BNAMLONGF><DSCRSWISSMEDICD>Arteoptic 2 %, Augentropfen</DSCRSWISSMEDICD><DSCRSWISSMEDICF>Arteoptic 2 %, Augentropfen</DSCRSWISSMEDICF><GENGRP>S01ED05LAON000000020GTTO</GENGRP><ATC>S01ED05</ATC><IT>11.09.00</IT><KONO>2132</KONO><TRADE>aH</TRADE><CDBRAND>248</CDBRAND><PRTNO>10940</PRTNO><MONO>757369</MONO><CDGALD>Y</CDGALD><CDGALF>Y</CDGALF><FORMD>Gtt Opht</FORMD><FORMF>gtt opht</FORMF><DOSE>2</DOSE><DOSEU>%</DOSEU><PRDIXREL>1</PRDIXREL><CDS>1</CDS><QAP>1</QAP><CDSMODULES>CHD, CHN, CHA, CHS, CHR, DSM, CHO</CDSMODULES><SMNR>46117</SMNR><SMCAT>B</SMCAT><LTC_ASC>1</LTC_ASC><TR>1608</TR><DEL>false</DEL><CPT><CPTLNO>1</CPTLNO><IDXIND>LA</IDXIND><DDDD>0.2</DDDD><DDDU>ml</DDDU><DDDA>LA</DDDA><IXREL>1</IXREL><GALF>1021</GALF><PRDGRPCD>SYNTHETIC</PRDGRPCD><EXCIP>Excip. ad collyr. pro</EXCIP><EXCIPQ>1 ml</EXCIPQ><PQTY>1</PQTY><PQTYU>ml</PQTYU><CPTCMP><LINE>1</LINE><SUBNO>200176</SUBNO><QTY>20</QTY><QTYU>mg</QTYU><WHK>W</WHK></CPTCMP><CPTCMP><LINE>2</LINE><SUBNO>205689</SUBNO><QTY /><QTYU /><WHK>w</WHK><PREFIX_DE>corresp.:</PREFIX_DE><PREFIX_FR>corresp.:</PREFIX_FR></CPTCMP><CPTCMP><LINE>3</LINE><SUBNO>200677</SUBNO><QTY /><QTYU /><WHK>K</WHK></CPTCMP><CPTIX><IXNO>2</IXNO><GRP>2</GRP><RLV>3</RLV></CPTIX><CPTROA><SYSLOC>L</SYSLOC><ROA>OPTHALTA</ROA></CPTROA></CPT></PRD><RESULT><OK_ERROR>OK</OK_ERROR><NBR_RECORD>1</NBR_RECORD><ERROR_CODE /><MESSAGE>Input parameters INDEX: MEDINDEX, FROMDATE: 2019-07-25, FILTER: ALL</MESSAGE></RESULT></PRODUCT></soap:Body></soap:Envelope>`,
    articleData = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><ARTICLE CREATION_DATETIME="2019-07-26T14:55:00.39162+02:00" PROD_DATE="2019-07-26T00:00:00" VALID_DATE="2019-07-26T00:00:00" RELEASE="2019-05" xmlns="http://www.hcisolutions.ch/index"><ART DT="2019-07-26T00:00:00+02:00"><PHARMACODE>20244</PHARMACODE><PHAR>0020244</PHAR><GTIN>7680316440115</GTIN><GRPCD>M9</GRPCD><CDSO1>04.00.00.00</CDSO1><PRDNO>1234443</PRDNO><SMCAT>D</SMCAT><SMNO>31644011</SMNO><HOSPCD>N</HOSPCD><CLINCD>N</CLINCD><ARTTYP>0</ARTTYP><VAT>2</VAT><SALECD>N</SALECD><GRDFR>0</GRDFR><TEMP>15/25</TEMP><BG>N</BG><EXP>60</EXP><QTY>30</QTY><DSCRD>FERRO-GRADUMET Depottabl 30 Stk</DSCRD><DSCRF>FERRO-GRADUMET cpr dépôt 30 pce</DSCRF><DSCRLONGD>Ferro-Gradumet Depottabl 30 Stk</DSCRLONGD><DSCRLONGF>Ferro-Gradumet cpr dépôt 30 pce</DSCRLONGF><SORTD>FERRO-GRADUMET DEPOTTABL 30 STK</SORTD><SORTF>FERRO-GRADUMET CPR DÉPÔT 30 PCE</SORTF><QTYUD>Stk</QTYUD><QTYUF>pce</QTYUF><IMG2>true</IMG2><DSCRPACKD>FERRO-GRADUMET 30 Depottabletten</DSCRPACKD><DSCRPACKF>FERRO-GRADUMET 30 comprimés retard</DSCRPACKF><PCKTYPCD>BLIST</PCKTYPCD><PCKTYPD>Blist</PCKTYPD><PCKTYPF>blist</PCKTYPF><MULT>1</MULT><NOPCS>30</NOPCS><MINI>14</MINI><DEPCD>N</DEPCD><LOACD>N</LOACD><STTOX>N</STTOX><GGL>N</GGL><SMDAT>1967-06-22T00:00:00+02:00</SMDAT><WEIGHT>25.08</WEIGHT><DEL>false</DEL><ARTCOMP><COMPNO>1836</COMPNO><ROLE>H</ROLE><ARTNO1>685230</ARTNO1><ARTNO2>685230</ARTNO2><ARTNO3>685230</ARTNO3></ARTCOMP><ARTCOMP><COMPNO>1836</COMPNO><ROLE>V</ROLE><ARTNO1>685230</ARTNO1><ARTNO2>685230</ARTNO2><ARTNO3>685230</ARTNO3></ARTCOMP><ARTCOMP><COMPNO>5360</COMPNO><ROLE>L</ROLE><ARTNO1>685230</ARTNO1><ARTNO2>685230</ARTNO2><ARTNO3>685230</ARTNO3></ARTCOMP><ARTBAR><CDTYP>E13</CDTYP><BC>7680316440115</BC><BCSTAT>A</BCSTAT></ARTBAR><ARTCH><PHARMACODE2>4204981</PHARMACODE2><PHAR2>4204981</PHAR2><CHTYPE>SDO</CHTYPE><LINENO>1</LINENO><NOUNITS>30</NOUNITS></ARTCH><ARTPRI><VDAT>1999-01-01T00:00:00+01:00</VDAT><PTYP>PPUB</PTYP><PRICE>10.9</PRICE></ARTPRI><ARTPRI><VDAT>2005-07-22T00:00:00+02:00</VDAT><PTYP>PEXF</PTYP><PRICE>7.92</PRICE></ARTPRI><ARTINS><VDAT>2004-07-01T00:00:00+02:00</VDAT><INCD>3</INCD><NINCD>30</NINCD><FDATARIFFTYPE>402</FDATARIFFTYPE><FDATARIFFCODE>7680316440115</FDATARIFFCODE></ARTINS><SIZE><WIDTH>95</WIDTH><HEIGHT>66</HEIGHT><DEPTH>20</DEPTH></SIZE></ART><RESULT><OK_ERROR>OK</OK_ERROR><NBR_RECORD>1</NBR_RECORD><ERROR_CODE /><MESSAGE>Input parameters INDEX: MEDINDEX, FROMDATE: 2019-07-25, FILTER: ALL</MESSAGE></RESULT></ARTICLE></soap:Body></soap:Envelope>`,
    productQuantityData = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><PRODUCT_PROPRIETARY_QUANTITY CREATION_DATETIME="2020-01-08T10:55:48.6431716+01:00" PROD_DATE="2020-01-07T00:00:00" VALID_DATE="2020-01-07T00:00:00" RELEASE="2019-11" xmlns="http://www.hcisolutions.ch/index"><PQ DT="2014-11-01T00:00:00+01:00"><PRDNO>1234443</PRDNO><CPTLNO>1</CPTLNO><LNO>1</LNO><STDQTY>1</STDQTY><STDQTYU>ml</STDQTYU><PRPQTY>1</PRPQTY><PRPQTYU>Pip</PRPQTYU><DEL>false</DEL></PQ><PQ DT="2014-11-01T00:00:00+01:00"><PRDNO>1709</PRDNO><CPTLNO>1</CPTLNO><LNO>1</LNO><STDQTY>1</STDQTY><STDQTYU>ml</STDQTYU><PRPQTY>30</PRPQTY><PRPQTYU>gtt</PRPQTYU><DEL>false</DEL></PQ><RESULT><OK_ERROR>OK</OK_ERROR><NBR_RECORD>2</NBR_RECORD><ERROR_CODE /><MESSAGE>Input parameters INDEX: MEDINDEX, FROMDATE: 2000-01-01, FILTER: ALL</MESSAGE></RESULT></PRODUCT_PROPRIETARY_QUANTITY></soap:Body></soap:Envelope>`,
    productSubstanceQuantityData = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body>
<PRODUCT_SUBSTANCE_ALTERNATIVE_QUANTITY CREATION_DATETIME="2020-01-08T10:55:49.0643743+01:00" PROD_DATE="2020-01-07T00:00:00" VALID_DATE="2020-01-07T00:00:00" RELEASE="2019-11" xmlns="http://www.hcisolutions.ch/index">
  <PAQ DT="2014-11-01T00:00:00+01:00">
    <PRDNO>1234443</PRDNO>
    <CPTLNO>1</CPTLNO>
    <SUBNO>203893</SUBNO>
    <CLNO>0</CLNO>
    <SBLNO>0</SBLNO>
    <QULNO>0</QULNO>
    <QTY>5</QTY>
    <QTYU>mg</QTYU>
    <NSFLAG>true</NSFLAG>
    <DEL>false</DEL>
  </PAQ>
  <PAQ DT="2015-10-29T00:00:00+01:00">
    <PRDNO>30</PRDNO>
    <CPTLNO>1</CPTLNO>
    <SUBNO>203893</SUBNO>
    <CLNO>0</CLNO>
    <SBLNO>0</SBLNO>
    <QULNO>1</QULNO>
    <QTY>0.0114019885068</QTY>
    <QTYU>mmol</QTYU>
    <NSFLAG>false</NSFLAG>
    <DEL>false</DEL>
  </PAQ>
  <RESULT>
    <OK_ERROR>OK</OK_ERROR>
    <NBR_RECORD>2</NBR_RECORD>
    <ERROR_CODE />
    <MESSAGE>Input parameters INDEX: MEDINDEX, FROMDATE: 2000-01-01, FILTER: ALL</MESSAGE>
  </RESULT>
</PRODUCT_SUBSTANCE_ALTERNATIVE_QUANTITY>
  </soap:Body></soap:Envelope>`;
describe( 'Test hci catalog updater', function() {
    let articleConfig,
        substanceConfig,
        codeConfig,
        productConfig,
        productQuantityConfig,
        productSubstanceQuantityConfig,
        collectionNames;

    async function cleanChunktables() {
        await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: collectionNames.code,
            action: 'delete',
            query: {
                _id: {$exists: true}
            }
        } ) );
        await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: collectionNames.substance,
            action: 'delete',
            query: {
                _id: {$exists: true}
            }
        } ) );
        await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: collectionNames.product,
            action: 'delete',
            query: {
                _id: {$exists: true}
            }
        } ) );

        await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: collectionNames.article,
            action: 'delete',
            query: {
                _id: {$exists: true}
            }
        } ) );

        await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: collectionNames.output,
            action: 'delete',
            query: {
                _id: {$exists: true}
            }
        } ) );

        await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: collectionNames.productQuantity,
            action: 'delete',
            query: {
                _id: {$exists: true}
            }
        } ) );

        await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
            user,
            model: collectionNames.productSubstanceQuantity,
            action: 'delete',
            query: {
                _id: {$exists: true}
            }
        } ) );
    }

    before( function() {
        const configs = Y.doccirrus.HCICatalogUpdater.getConfigs();
        substanceConfig = configs.substanceConfig, //eslint-disable-line
            codeConfig = configs.codeConfig,
            articleConfig = configs.articleConfig,
            productConfig = configs.productConfig,
            productQuantityConfig = configs.productQuantityConfig,
            productSubstanceQuantityConfig = configs.productSubstanceQuantityConfig,
            collectionNames = configs.collectionNames;

    } );
    describe( '1. Test xml to object mappers', function() {
        after( async function() {
            await cleanChunktables();
        } );

        it( 'Test substance.xml parsing', async function() {
            let err, result; //eslint-disable-line
            fs.writeFileSync( substanceConfig.file, substanceData, 'utf8' );

            await Y.doccirrus.HCICatalogUpdater.uploadXML( user, substanceConfig );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: collectionNames.substance,
                action: 'get',
                query: {}
            } ) );
            should.not.exist( err );

            result = result.result ? result.result : result;

            (result || {})[0].should.deep.equal( {
                "_id": "212521",
                "name": "Lomitapid"
            } );
        } );

        it( 'Test code.xml parsing', async function() {
            let err, result; //eslint-disable-line
            fs.writeFileSync( codeConfig.file, codeData, 'utf8' );
            await Y.doccirrus.HCICatalogUpdater.uploadXML( user, codeConfig );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: collectionNames.code,
                action: 'get',
                query: {}
            } ) );
            should.not.exist( err );

            result = result.result ? result.result : result;

            (result || {})[0].should.deep.equal( {
                "_id": "06.20.05.00",
                "description": "Formula magistralis",
                "del": false,
                "type": "20"
            } );
        } );

        it( 'Test product.xml parsing', async function() {
            let err, result; //eslint-disable-line
            fs.writeFileSync( productConfig.file, productData, 'utf8' );

            await Y.doccirrus.HCICatalogUpdater.uploadXML( user, productConfig );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: collectionNames.product,
                action: 'get',
                query: {}
            } ) );
            should.not.exist( err );

            result = result.result ? result.result : result;

            (result || {})[0].should.deep.equal( {
                "_id": "1234443",
                "phAtc": "S01ED05",
                "phForm": "Gtt Opht",
                "phIngr": [],
                "quantityUnit": "ml"
            } );
        } );

        it( 'Test article.xml parsing', async function() {
            let err, result; //eslint-disable-line
            fs.writeFileSync( articleConfig.file, articleData, 'utf8' );

            await Y.doccirrus.HCICatalogUpdater.uploadXML( user, articleConfig );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: collectionNames.article,
                action: 'get',
                query: {}
            } ) );
            should.not.exist( err );

            result = result.result ? result.result : result;
            delete ((result || {})[0] || {})._id;
            (result || {})[0].should.deep.equal( {
                "code": "7680316440115",
                "phGTIN": "7680316440115",
                "phUnit": "Stk",
                "phUnitDescription": "",
                "phPZN": "20244",
                "prdNo": "1234443",
                "phCompany": "1836",
                "phPackSize": "30",
                "del": false,
                "phDescription": "Ferro-Gradumet Depottabl 30 Stk",
                "phPriceSale": 10.9,
                "phPriceCost": "7.92",
                "insuranceCode": "30",
                "paidByInsurance": false,
                "supplyCategory": "D",
                "u_extra": [
                    {
                        "VDAT": [
                            "1999-01-01T00:00:00+01:00"
                        ],
                        "PTYP": [
                            "PPUB"
                        ],
                        "PRICE": [
                            "10.9"
                        ]
                    },
                    {
                        "VDAT": [
                            "2005-07-22T00:00:00+02:00"
                        ],
                        "PTYP": [
                            "PEXF"
                        ],
                        "PRICE": [
                            "7.92"
                        ]
                    }
                ]
            } );
        } );

        it( 'Test Product_Proprietary_Quantity.xml parsing', async function() {
            let err, result; //eslint-disable-line
            fs.writeFileSync( productQuantityConfig.file, productQuantityData, 'utf8' );

            await Y.doccirrus.HCICatalogUpdater.uploadXML( user, productQuantityConfig );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: collectionNames.productQuantity,
                action: 'get',
                query: {}
            } ) );
            should.not.exist( err );

            result = result.result ? result.result : result;

            delete result[0]._id;
            (result || {})[0].should.deep.equal( {
                "prdNo": "1234443",
                "quantityUnit": "Pip"
            } );
        } );

        it( 'Test Product_Proprietary_Quantity.xml parsing', async function() {
            let err, result; //eslint-disable-line
            fs.writeFileSync( productSubstanceQuantityConfig.file, productSubstanceQuantityData, 'utf8' );

            await Y.doccirrus.HCICatalogUpdater.uploadXML( user, productSubstanceQuantityConfig );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: collectionNames.productSubstanceQuantity,
                action: 'get',
                query: {}
            } ) );
            should.not.exist( err );

            result = result.result ? result.result : result;

            delete result[0]._id;
            (result || {})[0].should.deep.equal( {
                "NSFLAG": true,
                "prdNo": "1234443",
                "quantityUnit": "mg"
            } );
            //NSFLAG === false
            result.length.should.equal( 1 );
        } );
    } );
    describe( '1. Test updating medications catalog by chunks', function() {
        const productToInsert = {
                "_id": "1234443",
                "phAtc": "J01GB06",
                "phForm": "Inj Lös",
                "phIngr": [
                    {
                        "code": "203942",
                        "strength": "4.4mg",
                        "type": "ACTIVE"
                    },
                    {
                        "code": "200908",
                        "strength": "1",
                        "type": "FLAVOURING"
                    }],
                "quantityUnit": "ml"
            },
            substanceToInsert = {
                "_id": "200908",
                "name": "Dinatrium 2-mercaptobutandiat"
            },
            codeToInsert = [
                {
                    "_id": "15121",
                    "description": "Taraxacum compositum Heel",
                    "del": false
                },
                {
                    "_id": "mg",
                    "description": "Miligram",
                    "del": false
                },
                {
                    "_id": "Pip",
                    "description": "Pip",
                    "del": false
                }
            ],
            productQuantityToInsert = {
                "prdNo": "1234443",
                "quantityUnit": "Pip"
            },
            productSubstanceQuantityToInsert = {
                "NSFLAG": true,
                "prdNo": "1234443",
                "quantityUnit": "mg"
            };

        before( async function() {
            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: articleConfig.collectionName,
                data: Y.doccirrus.filters.cleanDbObject( [
                    {
                        "code": "5000223074777",
                        "phGTIN": "5000223074777",
                        "phPZN": "54929",
                        "prdNo": "1234443",
                        "phUnit": "mg",
                        "phCompany": "609",
                        "phPackSize": "2",
                        "phDescription": "Jelonet Paraffingaze 10cmx7m Ds",
                        "phPriceSale": 33.85,
                        "phPriceCost": "0",
                        "insuranceCode": "15121",
                        "paidByInsurance": false,
                        "supplyCategory": "",
                        "del": false,
                        "u_extra": [
                            {
                                "VDAT": [
                                    "2018-04-17T00:00:00+02:00"
                                ],
                                "PTYP": [
                                    "PPUB"
                                ],
                                "PRICE": [
                                    "33.85"
                                ]
                            }
                        ]
                    },
                    {
                        "code": "7680261460466",
                        "phGTIN": "7680261460466",
                        "phPZN": "55679",
                        "prdNo": "15199",
                        "phCompany": "12127",
                        "phPackSize": "85",
                        "phDescription": "Solarcaïne Lot Tb 85 ml",
                        "phPriceSale": 0,
                        "phPriceCost": "11.17",
                        "insuranceCode": "30",
                        "paidByInsurance": false,
                        "supplyCategory": "D",
                        "del": true,
                        "u_extra": []
                    }
                ] )
            } ) );

            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: productConfig.collectionName,
                data: Y.doccirrus.filters.cleanDbObject( productToInsert )
            } ) );

            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: substanceConfig.collectionName,
                data: Y.doccirrus.filters.cleanDbObject( substanceToInsert )
            } ) );

            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: codeConfig.collectionName,
                data: Y.doccirrus.filters.cleanDbObject( [].concat( codeToInsert ) )
            } ) );

            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: productQuantityConfig.collectionName,
                data: Y.doccirrus.filters.cleanDbObject( productQuantityToInsert )
            } ) );

            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: productSubstanceQuantityConfig.collectionName,
                data: Y.doccirrus.filters.cleanDbObject( productSubstanceQuantityToInsert )
            } ) );
        } );

        beforeEach( async function() {
            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'post',
                model: 'medicationscatalog',
                data: Y.doccirrus.filters.cleanDbObject( [
                    {
                        "code": "5000223074777",
                        "phGTIN": "5000223074777",
                        "phPZN": "54929",
                        "prdNo": "1234443",
                        "phCompany": "11265",
                        "phUnit": "mg",
                        "phPackSize": "1",
                        "phDescription": "Erythrocin i.v. Trockensub 1000 mg Amp",
                        "phPriceSale": 1,
                        "phPriceCost": "48.24",
                        "u_extra": [
                            {
                                "VDAT": "2018-11-06T00:00:00+01:00",
                                "PTYP": "PEXF",
                                "PRICE": "48.23"
                            }
                        ],
                        "insuranceCode": "15121",
                        "paidByInsurance": false,
                        "supplyCategory": "B",
                        "phAtc": "J01FA01",
                        "phForm": "Trockensub",
                        "insuranceDescription": "Hors Liste (Swissmedic zugelassene Präp)",
                        "catalogShort": "HCI",
                        "phIngr": [
                            {
                                "code": "203942",
                                "strength": "4.2mg",
                                "name": "Levomenthol",
                                "type": "ACTIVE"
                            },
                            {
                                "code": "200908",
                                "strength": "",
                                "name": "Aromatica",
                                "type": "FLAVOURING"
                            }
                        ]
                    },
                    {
                        "code": "7680261460466",
                        "phGTIN": "7680261460466",
                        "phPZN": "55679",
                        "prdNo": "151991",
                        "phCompany": "157",
                        "phPackSize": "225",
                        "phDescription": "Lansoyl Oralgel 225 g",
                        "phPriceSale": 0,
                        "phPriceCost": "11.47",
                        "u_extra": [
                            {
                                "VDAT": "2018-08-01T00:00:00+02:00",
                                "PTYP": "PEXF",
                                "PRICE": "11.47"
                            }
                        ],
                        "insuranceCode": "20",
                        "paidByInsurance": false,
                        "supplyCategory": "D",
                        "phAtc": "A06AA01",
                        "phForm": "Gel",
                        "insuranceDescription": "LPPV",
                        "catalogShort": "HCI",
                        "phIngr": [
                            {
                                "code": "205331",
                                "strength": "782.3mg",
                                "name": "Paraffin dickflüssig",
                                "type": "ACTIVE"
                            },
                            {
                                "code": "201868",
                                "strength": "",
                                "name": "Saccharose",
                                "type": "BULKING"
                            }
                        ]
                    },
                    {
                        "code": "7680291520390",
                        "phGTIN": "7680291520390",
                        "phPZN": "31532",
                        "prdNo": "4123",
                        "phCompany": "1847",
                        "phPackSize": "10",
                        "phDescription": "Ben-u-ron Supp 250 mg Kind 10 Stk",
                        "phPriceSale": "2.8",
                        "phPriceCost": "1.52",
                        "u_extra": [
                            {
                                "VDAT": "2018-12-01T00:00:00+01:00",
                                "PTYP": "PEXF",
                                "PRICE": "1.52"
                            },
                            {
                                "VDAT": "2018-12-01T00:00:00+01:00",
                                "PTYP": "PPUB",
                                "PRICE": "2.8"
                            }
                        ],
                        "insuranceCode": "10",
                        "paidByInsurance": true,
                        "supplyCategory": "D",
                        "phAtc": "N02BE01",
                        "phForm": "Supp",
                        "insuranceDescription": "SL: bezahlt durch KK",
                        "catalogShort": "HCI",
                        "phIngr": [
                            {
                                "code": "200908",
                                "strength": "250mg",
                                "name": "Paracetamol",
                                "type": "ACTIVE"
                            }
                        ]
                    }
                ] )
            } ) );
        } );

        afterEach( async function() {
            await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'delete',
                query: {
                    _id: {$exists: true}
                }
            } ) );
        } );

        after( async function() {
            await cleanChunktables();
        } );

        it( 'Should update medication in medicationcatalog by medication from articleConfig.collectionName', async function() {
            this.timeout( 10000 );
            let err, result, missedAricles;
            missedAricles = await Y.doccirrus.HCICatalogUpdater.updateCatalogByChunk(
                user,
                articleConfig.collectionName,
                articleConfig.chunkHandler
            );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                query: {phPZN: "54929"}
            } ) );

            should.not.exist( err );
            expect( missedAricles ).to.be.empty; //eslint-disable-line no-unused-expressions
            result = result.result ? result.result : result;
            result[0].phPackSize.should.equal( '2' );
        } );

        it( 'Should delete medication from medicationcatalog', async function() {
            this.timeout( 10000 );
            let err, result, missedAricles;
            missedAricles = await Y.doccirrus.HCICatalogUpdater.updateCatalogByChunk(
                user,
                articleConfig.collectionName,
                articleConfig.chunkHandler
            );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                query: {phPZN: "55679"}
            } ) );

            should.not.exist( err );
            expect( missedAricles ).to.be.empty; //eslint-disable-line no-unused-expressions
            result = result.result ? result.result : result;
            expect( result ).to.be.empty; //eslint-disable-line no-unused-expressions
        } );

        it( 'Should update medication by item from productConfig.collectionName', async function() {
            this.timeout( 10000 );
            let err, result;
            await Y.doccirrus.HCICatalogUpdater.updateCatalogByChunk(
                user,
                productConfig.collectionName,
                productConfig.chunkHandler
            );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                query: {prdNo: productToInsert._id}
            } ) );

            should.not.exist( err );
            result = result.result ? result.result : result;
            result[0].phAtc.should.equal( productToInsert.phAtc );
            result[0].phForm.should.equal( productToInsert.phForm );

            expect( (result || {})[0].phIngr[0] ).to.include( {
                ...productToInsert,
                name: 'Levomenthol'
            }.phIngr[0] );
            expect( (result || {})[0].phIngr[1] ).to.include( {
                ...productToInsert,
                name: 'Aromatica'
            }.phIngr[1] );
        } );

        it( 'Should update medication (phIngr.name) by item from substanceConfig.collectionName', async function() {
            this.timeout( 10000 );
            let err, result;
            const code = substanceToInsert._id;
            await Y.doccirrus.HCICatalogUpdater.updateCatalogByChunk(
                user,
                substanceConfig.collectionName,
                substanceConfig.chunkHandler
            );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                query: {'phIngr.code': code}
            } ) );

            should.not.exist( err );
            result = result.result ? result.result : result;

            let updatedIngr = result[0].phIngr.find( ( ing ) => ing.code === code );

            expect( updatedIngr ).to.not.be.undefined; //eslint-disable-line
            expect( updatedIngr ).to.include( {
                "strength": "250mg",
                "type": "ACTIVE",
                name: substanceToInsert.name
            } );
        } );

        it( 'Should update insuranceDescription by item from codeConfig.collectionName', async function() {
            this.timeout( 10000 );
            let err, result;
            const insuranceCode = codeToInsert[0]._id;

            await Y.doccirrus.HCICatalogUpdater.updateCatalogByChunk(
                user,
                codeConfig.collectionName,
                codeConfig.chunkHandler
            );
            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: 'medicationscatalog',
                action: 'get',
                query: {'insuranceCode': insuranceCode}
            } ) );

            should.not.exist( err );
            result = result.result ? result.result : result;
            result[0].insuranceDescription.should.equal( codeToInsert[0].description );
        } );

        it( 'Should merge chunk into medication', async function() {
            let err, result;
            this.timeout( 10000 );
            await Y.doccirrus.HCICatalogUpdater.mergeData( user, ['54929'] );

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                user,
                model: collectionNames.output,
                action: 'get',
                query: {'phPZN': ['54929']}
            } ) );

            should.not.exist( err );
            result = result.result ? result.result : result;
            delete result[0]._id;

            result[0].should.deep.equal( {
                code: '5000223074777',
                phGTIN: '5000223074777',
                phPZN: '54929',
                prdNo: "1234443",
                phUnit: "mg",
                phUnitDescription: "Miligram",
                phCompany: '609',
                phPackSize: '2',
                phDescription: 'Jelonet Paraffingaze 10cmx7m Ds',
                phPriceSale: 33.85,
                phPriceCost: '0',
                insuranceCode: '15121',
                paidByInsurance: false,
                supplyCategory: '',
                u_extra: [
                    {
                        "VDAT": [
                            "2018-04-17T00:00:00+02:00"
                        ],
                        "PTYP": [
                            "PPUB"
                        ],
                        "PRICE": [
                            "33.85"
                        ]
                    }],
                phAtc: 'J01GB06',
                phForm: 'Inj Lös',
                insuranceDescription: 'Taraxacum compositum Heel',
                catalogShort: 'HCI',
                phIngr: [
                    {
                        "code": "203942",
                        "strength": "4.4mg",
                        "type": "ACTIVE"
                    },
                    {
                        "code": "200908",
                        "strength": "1",
                        name: "Dinatrium 2-mercaptobutandiat",
                        "type": "FLAVOURING"
                    }
                ],
                "units": [
                    {
                        "phUnit": "Pip",
                        "phUnitDescription": "Pip"
                    },
                    {
                        "phUnit": "mg",
                        "phUnitDescription": "Miligram"
                    }
                ]
            } );
        } );

    } );

} );