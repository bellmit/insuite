/**
 * User: rrrw
 * Date: 11/01/2014  15:45
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'catalog-schema', function( Y, NAME ) {
        /**
         * The DC case data schema definition
         *
         * @module DCCatalog
         */

        var

            insuranceMap,

        // ------- Schema definitions  -------

            types = {},
            i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Catalog_T",
                        "lib": types
                    }
                },
                "Catalog_T": {
                    "Catalog_Base_T": {
                        "complex": "ext",
                        "type": "Catalog_Base_T",
                        "lib": types
                    },
                    "Catalog_D_T": {
                        "complex": "ext",
                        "type": "Catalog_D_T",
                        "lib": types
                    },
                    "Catalog_CH_T": {
                        "complex": "ext",
                        "type": "Catalog_CH_T",
                        "lib": types
                    }
                },
                "Catalog_Base_T": {
                    "default": {
                        "complex": "ext",
                        "type": "DefaultCat_T",
                        "lib": types
                    },
                    "plz": {
                        "complex": "ext",
                        "type": "Plz_T",
                        "lib": types
                    },
                    "kbvcountries": {
                        "complex": "ext",
                        "type": "KBVCountries_T",
                        "lib": types
                    },
                    "kbvplz": {
                        "complex": "ext",
                        "type": "KBVPlz_T",
                        "lib": types
                    },
                    "KBVkvregister_T": {
                        "complex": "ext",
                        "type": "KBVkvregister_T",
                        "lib": types
                    },
                    "kbvinsurance": {
                        "complex": "ext",
                        "type": "KBVInsurance_T",
                        "lib": types
                    },
                    "kbvkv": {

                        "complex": "ext",
                        "type": "KBVkv_T",
                        "lib": types
                    },
                    "kbvsdav": {
                        "complex": "ext",
                        "type": "SDAV_T",
                        "lib": types
                    },
                    "__table": {
                        "complex": "ext",
                        "type": "Table_T",
                        "lib": types
                    },
                    "kbvkvca": {
                        "complex": "ext",
                        "type": "KVCA_T",
                        "lib": types
                    },
                    "omim": {
                        "complex": "ext",
                        "type": "OMIM_T",
                        "lib": types
                    },
                    "bginsurance": {
                        "complex": "ext",
                        "type": "BG_T",
                        "lib": types
                    },
                    "hmvghd": {
                        "complex": "ext",
                        "type": "HMVGHD_T",
                        "lib": types
                    },
                    "insurances": {
                        "complex": "ext",
                        "type": "INSURANCE_COMMON_T",
                        "lib": types
                    },
                    "ut_items": {
                        "complex": "ext",
                        "type": "UT_Items_T",
                        "lib": types
                    },
                    "cardio": {
                        "complex": "ext",
                        "type": "Cardio_T",
                        "lib": types
                    },
                    "catalog": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.Catalog_T.catalog' ),
                        "-en": "catalog",
                        "-de": "catalog"
                    },
                    "u_extra": {
                        "apiv": { v:2, queryParam: true },
                        "type": "Mixed",
                        i18n: i18n( 'catalog-schema.Catalog_T.special' ),
                        "-en": "special",
                        "-de": "special"
                    },
                    catalogShort: {
                        "type": "String",
                        "i18n": i18n( 'catalog-schema.catalogShort.i18n' )
                    },
                    treatmentCategory: {
                        type: "String",
                        i18n: i18n( 'catalog-schema.TarmedDignity_T.treatmentCategory.i18n' )
                    }
                },
                "Catalog_D_T": {},
                "Catalog_CH_T": {
                    "tarmedQualiDignities": {
                        "complex": "ext",
                        "type": "TarmedDignity_T",
                        "lib": types
                    }
                },
                "DefaultCat_T": {
                    "level": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.DefaultCat_T.level' ),
                        "-en": "level",
                        "-de": "level"
                    },
                    "l1": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.DefaultCat_T.level' ),
                        "-en": "level",
                        "-de": "level"
                    },
                    "seq": {
                        "apiv": { v:2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'catalog-schema.DefaultCat_T.seq' ),
                        "-en": "seq",
                        "-de": "seq"
                    },
                    "chapter": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.DefaultCat_T.chapter' ),
                        "-en": "chapter",
                        "-de": "chapter"
                    },
                    "chapterPart": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.DefaultCat_T.chapterPart' ),
                        "-en": "chapterPart",
                        "-de": "chapterPart"
                    },
                    "chapterText": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.DefaultCat_T.chapterText' ),
                        "-en": "chapterText",
                        "-de": "chapterText"
                    },
                    "unifiedSeq": {
                        "apiv": { v:2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'catalog-schema.DefaultCat_T.unifiedSeq' ),
                        "-en": "unifiedSeq",
                        "-de": "unifiedSeq"
                    },
                    "title": {
                        "apiv": { v:2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'catalog-schema.DefaultCat_T.title' ),
                        "-en": "title",
                        "-de": "title"
                    },
                    "infos": {
                        "apiv": { v:2, queryParam: true },
                        "type": "String",
                        i18n: i18n( 'catalog-schema.DefaultCat_T.infos' ),
                        "-en": "infos",
                        "-de": "infos"
                    },
                    "unit": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.DefaultCat_T.unit' ),
                        "-en": "unit",
                        "-de": "unit"
                    },
                    "value": {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.DefaultCat_T.value' ),
                        "-en": "value",
                        "-de": "value"
                    }
                },
                "Table_T": {
                    key: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.Table_T.key' ),
                        "-en": "key",
                        "-de": "Schlüßel"
                    }
                },
                "Plz_T": {
                    city: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.Plz_T.city' ),
                        "-en": "city",
                        "-de": "Stadt"
                    },
                    zip: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.Plz_T.zip' ),
                        "-en": "zip",
                        "-de": "PLZ"
                    }
                },
                "KBVCountries_T": {
                    sign: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVCountries_T.sign' ),
                        "-en": "sign",
                        "-de": "sign"
                    },
                    country: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVCountries_T.country' ),
                        "-en": "country",
                        "-de": "country"
                    },
                    origin: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVCountries_T.origin' ),
                        "-en": "origin",
                        "-de": "origin"
                    },
                    schluessel: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVCountries_T.schluessel' ),
                        "-en": "schluessel",
                        "-de": "schluessel"
                    }
                },
                "KBVPlz_T": {
                    plz: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVPlz_T.plz' ),
                        "-en": "plz",
                        "-de": "plz"
                    },
                    bz: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVPlz_T.bz' ),
                        "-en": "bz",
                        "-de": "bz"
                    }
                },
                "KBVkv_T": {
                    kvValue: {
                        "type": "Mixed",
                        i18n: i18n( 'catalog-schema.KBVkv_T.kvValue' ),
                        "-en": "kvValue",
                        "-de": "kvValue"
                    },
                    kvKey: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVkv_T.kvKey' ),
                        "-en": "kvKey",
                        "-de": "kvKey"
                    },
                    kvType: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVkv_T.kvType' ),
                        "-en": "kvType",
                        "-de": "kvType"
                    },
                    kvSU: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVkv_T.kvSu' ),
                        "-en": "kvSU",
                        "-de": "kvSU"
                    },
                    kvAB: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVkv_T.kvAB' ),
                        "-en": "kvAB",
                        "-de": "kvAB"
                    },
                    kvKTAB: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVkv_T.kvKTAB' ),
                        "-en": "kvKTAB",
                        "-de": "kvKTAB"
                    }
                },
                "KBVkvregister_T": {

                    kvName: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVkvregister_T.kvName' ),
                        "-en": "kvName",
                        "-de": "kvName"
                    },
                    arKey: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVkvregister_T.arKey' ),
                        "-en": "arKey",
                        "-de": "arKey"
                    },
                    arName: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVkvregister_T.arName' ),
                        "-en": "arName",
                        "-de": "arName"
                    },
                    bzKey: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVkvregister_T.bzKey' ),
                        "-en": "bzKey",
                        "-de": "bzKey"
                    },
                    bzName: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVkvregister_T.bzName' ),
                        "-en": "bzName",
                        "-de": "bzName"
                    }
                },
                "SDAV_T": {
                    bsnr: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.SDAV_T.bsnr' ),
                        "-en": "bsnr",
                        "-de": "bsnr"
                    },
                    parentBsnr: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.SDAV_T.parentBsnr' ),
                        "-en": "parentBsnr",
                        "-de": "parentBsnr"
                    },
                    lanr: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.SDAV_T.lanr' ),
                        "-en": "lanr",
                        "-de": "lanr"
                    },
                    lanrList: {
                        "type": [String],
                        i18n: i18n( 'catalog-schema.SDAV_T.lanrList' ),
                        "-en": "lanrList",
                        "-de": "lanrList"
                    },
                    bsnrList: {
                        "type": [String],
                        i18n: i18n( 'catalog-schema.SDAV_T.bsnrList' ),
                        "-en": "bsnrList",
                        "-de": "bsnrList"
                    }
                },
                "KVCA_T": {
                    kv: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.kv' ),
                        "-en": "kv",
                        "-de": "kv"
                    },
                    kvName: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVkvregister_T.kvName' ),
                        "-en": "kvName",
                        "-de": "kvName"
                    },
                    kvcaType: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KVCA_T.kvcaType' ),
                        "-en": "kvcaType",
                        "-de": "kvcaType"
                    },
                    kvcaAddress: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KVCA_T.kvcaAddress' ),
                        "-en": "kvcaAddress",
                        "-de": "kvcaAddress"
                    },
                    version: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KVCA_T.version' ),
                        "-en": "version",
                        "-de": "version"
                    },
                    functions: {
                        i18n: i18n( 'catalog-schema.KVCA_T.functions' ),
                        "type": "any"
                    }
                },
                "UT_Items_T": {
                    group: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.UT_Items_T.group' ),
                        "-en": "group",
                        "-de": "group"
                    },
                    groupTherapy: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.UT_Items_T.groupTherapy' ),
                        "-en": "groupTherapy",
                        "-de": "groupTherapy"
                    },
                    prices: {
                        "type": "Mixed",
                        i18n: i18n( 'catalog-schema.UT_Items_T.prices' ),
                        "-en": "prices",
                        "-de": "prices"
                    }
                },
                "INSURANCE_COMMON_T": {
                    addresses: {
                        "complex": "inc",
                        "type": "Address_T",
                        "lib": "person",
                        i18n: i18n( 'catalog-schema.INSURANCE_COMMON_T.addresses' ),
                        "-en": "Addresses",
                        "-de": "Adressen"
                    },
                    communications: {
                        "complex": "inc",
                        "type": "Communication_T",
                        "lib": "person",
                        i18n: i18n( 'catalog-schema.INSURANCE_COMMON_T.communications' ),
                        "-en": "communications",
                        "-de": "communications"
                    }
                },
                "BG_T": {
                    nachfolge_iknr: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.BG_T.nachfolge_iknr' ),
                        "-en": "nachfolge_iknr",
                        "-de": "nachfolge_iknr"
                    },
                    name2: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.BG_T.name2' ),
                        "-en": "name2",
                        "-de": "name2"
                    },
                    ik_unidav: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.BG_T.ik_unidav' ),
                        "-en": "ik_unidav",
                        "-de": "ik_unidav"
                    },
                    mail_unidav: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.BG_T.mail_unidav' ),
                        "-en": "mail_unidav",
                        "-de": "mail_unidav"
                    },
                    d2d_id_unidav: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.BG_T.d2d_id_unidav' ),
                        "-en": "d2d_id_unidav",
                        "-de": "d2d_id_unidav"
                    }
                },
                "SDDA_T": {
                    orgianizationId: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.SDDA_T.orgianizationId' ),
                        "-en": "orgianizationId",
                        "-de": "orgianizationId"
                    },
                    orgianizationName: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.SDDA_T.orgianizationName' ),
                        "-en": "orgianizationName",
                        "-de": "orgianizationName"
                    },
                    ukv: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.SDDA_T.ukv' ),
                        "-en": "ukv",
                        "-de": "ukv"
                    },
                    kv_connect: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.SDDA_T.kv_connect' ),
                        "-en": "Addressee",
                        "-de": "Adressat"
                    },
                    constraints: {
                        "type": "any",
                        i18n: i18n( 'catalog-schema.SDDA_T.constraints' ),
                        "-en": "Programs",
                        "-de": "Programme"
                    }
                },
                "HMVGHD_T": {
                    pzn: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.HMVGHD_T.pzn' ),
                        "-en": "pzn",
                        "-de": "pzn"
                    },
                    herstellerId: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.HMVGHD_T.herstellerId' ),
                        "-en": "herstellerId",
                        "-de": "herstellerId"
                    },
                    artikelNo: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.HMVGHD_T.artikelNo' ),
                        "-en": "artikelNo",
                        "-de": "artikelNo"
                    },
                    herstellerName: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.HMVGHD_T.herstellerName' ),
                        "-en": "herstellerName",
                        "-de": "herstellerName"
                    },
                    bezeichnung: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.HMVGHD_T.bezeichnung' ),
                        "-en": "bezeichnung",
                        "-de": "bezeichnung"
                    },
                    hmvNo: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.HMVGHD_T.hmvNo' ),
                        "-en": "hmvNo",
                        "-de": "hmvNo"
                    },
                    menge: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.HMVGHD_T.menge' ),
                        "-en": "menge",
                        "-de": "menge"
                    },
                    mengeneinheit: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.HMVGHD_T.mengeneinheit' ),
                        "-en": "mengeneinheit",
                        "-de": "mengeneinheit"
                    },
                    darreichungsForm: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.HMVGHD_T.darreichungsForm' ),
                        "-en": "darreichungsForm",
                        "-de": "darreichungsForm"
                    },
                    apoek: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.HMVGHD_T.apoek' ),
                        "-en": "apoek",
                        "-de": "apoek"
                    },
                    mwst: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.HMVGHD_T.mwst' ),
                        "-en": "mwst",
                        "-de": "mwst"
                    }
                },
                "OMIM_T": {
                    prefixG: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.OMIM_T.prefixG' ),
                        "-en": "prefixG",
                        "-de": "prefixG"
                    },
                    omimG: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.OMIM_T.omimG' ),
                        "-en": "omimG",
                        "-de": "omimG"
                    },
                    genName: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.OMIM_T.genName' ),
                        "-en": "genName",
                        "-de": "genName"
                    },
                    genStatus: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.OMIM_T.genStatus' ),
                        "-en": "genStatus",
                        "-de": "genStatus"
                    },
                    prefixP: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.OMIM_T.prefixP' ),
                        "-en": "prefixP",
                        "-de": "prefixP"
                    },
                    omimP: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.OMIM_T.omimP' ),
                        "-en": "omimP",
                        "-de": "omimP"
                    },
                    desc: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.OMIM_T.desc' ),
                        "-en": "desc",
                        "-de": "desc"
                    },
                    pmk: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.OMIM_T.pmk' ),
                        "-en": "pmk",
                        "-de": "pmk"
                    }
                },
                "KBVInsurance_T": {
                    vknr: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.vknr' ),
                        "-en": "vknr",
                        "-de": "vknr"
                    },
                    iknr: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.iknr' ),
                        "-en": "iknr",
                        "-de": "iknr"
                    },
                    abrechnungs_ik: {
                        "type": "Boolean",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.abrechnungs_ik' ),
                        "-en": "abrechnungs_ik",
                        "-de": "abrechnungs_ik"
                    },
                    ktab: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.ktab' ),
                        "-en": "ktab",
                        "-de": "ktab"
                    },
                    name: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.name' ),
                        "-en": "name",
                        "-de": "Name"
                    },
                    sortierungsname: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.sortierungsname' ),
                        "-en": "sortname",
                        "-de": "Sortierungsname"
                    },
                    kurzname: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.kurzname' ),
                        "-en": "shortname",
                        "-de": "Kurzname"
                    },
                    suchname: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.suchname' ),
                        "-en": "Searchname",
                        "-de": "Suchname"
                    },
                    ortssuchnamen: {
                        "type": [String],
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.ortssuchnamen' ),
                        "-en": "ortssuchnamen",
                        "-de": "ortssuchnamen"
                    },
                    gebuehrenordnung: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.gebuehrenordnung' ),
                        "-en": "gebuehrenordnung",
                        "-de": "Gebuehrenordnung"
                    },
                    kostentraegergruppe: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.kostentraegergruppe' ),
                        "-en": "kostentraegergruppe",
                        "-de": "Kostentraegergruppe"
                    },
                    kostentraegergruppeId: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.kostentraegergruppeId' ),
                        "-en": "kostentraegergruppeId",
                        "-de": "kostentraegergruppeId"
                    },
                    abrechnungsstelle: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.abrechnungsstelle' ),
                        "-en": "abrechnungsstelle",
                        "-de": "Abrechnungsstelle"
                    },
                    abrechnungsbereich: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.abrechnungsbereich' ),
                        "-en": "abrechnungsbereich",
                        "-de": "Abrechnungsbereich"
                    },
                    abrechnungsbereiche: {
                        "type": "Mixed",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.abrechnungsbereiche' ),
                        "-en": "abrechnungsbereiche",
                        "-de": "Abrechnungsbereiche"
                    },
                    kv: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.kv' ),
                        "-en": "kv",
                        "-de": "kv"
                    },
                    kt_gueltigkeit_start: {
                        "type": Date,
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.kt_gueltigkeit_start' ),
                        "-en": "kt_gueltigkeit_start",
                        "-de": "kt_gueltigkeit_start"
                    },
                    kt_gueltigkeit_end: {
                        "type": Date,
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.kt_gueltigkeit_end' ),
                        "-en": "kt_gueltigkeit_end",
                        "-de": "kt_gueltigkeit_end"
                    },
                    ik_gueltigkeit_start: {
                        "type": Date,
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.ik_gueltigkeit_start' ),
                        "-en": "ik_gueltigkeit_start",
                        "-de": "ik_gueltigkeit_start"
                    },
                    ik_gueltigkeit_end: {
                        "type": Date,
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.ik_gueltigkeit_end' ),
                        "-en": "ik_gueltigkeit_end",
                        "-de": "ik_gueltigkeit_end"
                    },
                    ktab_gueltigkeit_start: {
                        "type": Date,
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.ktab_gueltigkeit_start' ),
                        "-en": "ktab_gueltigkeit_start",
                        "-de": "ktab_gueltigkeit_start"
                    },
                    ktab_gueltigkeit_end: {
                        "type": Date,
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.ktab_gueltigkeit_end' ),
                        "-en": "ktab_gueltigkeit_end",
                        "-de": "ktab_gueltigkeit_end"
                    },
                    gueltigkeit_start: {
                        "type": Date,
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.gueltigkeit_start' ),
                        "-en": "gueltigkeit_start",
                        "-de": "gueltigkeit_start"
                    },
                    gueltigkeit_end: {
                        "type": Date,
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.gueltigkeit_end' ),
                        "-en": "gueltigkeit_end",
                        "-de": "gueltigkeit_end"
                    },
                    existenzbeendigung_vk: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.existenzbeendigung_vk' ),
                        "-en": "existenzbeendigung_vk",
                        "-de": "existenzbeendigung_vk"
                    },
                    existenzbeendigung_q: {
                        "type": "String",
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.existenzbeendigung_q' ),
                        "-en": "existenzbeendigung_q",
                        "-de": "existenzbeendigung_q"
                    },
                    "unzkv": {
                        "type": [String],
                        i18n: i18n( 'catalog-schema.KBVInsurance_T.unzkv' ),
                        "-en": "unzkv",
                        "-de": "unzkv"
                    }
                },
                "Cardio_T": {
                    messages: {
                        "type": [String],
                        i18n: i18n( 'catalog-schema.Cardio_T.messages' ),
                        "-en": "Messages",
                        "-de": "Nachrichten"
                    },
                    start: {
                        "type": Date,
                        i18n: i18n( 'catalog-schema.Cardio_T.start' ),
                        "-en": "start",
                        "-de": "start"
                    },
                    end: {
                        "type": Date,
                        i18n: i18n( 'catalog-schema.Cardio_T.end' ),
                        "-en": "end",
                        "-de": "end"
                    }
                },
                TarmedDignity_T: {
                    catalogExtension: {
                        type: "Boolean",
                        validate: "TarmedDignity_T_catalogExtension",
                        i18n: i18n( 'catalog-schema.TarmedDignity_T.catalogExtension.i18n' )
                    },
                    code: {
                        type: "String",
                        validate: "TarmedDignity_T_code",
                        i18n: i18n( 'catalog-schema.TarmedDignity_T.code.i18n' )
                    },
                    text: {
                        type: "String",
                        validate: "TarmedDignity_T_text",
                        i18n: i18n( 'catalog-schema.TarmedDignity_T.text.i18n' )
                    }
                },
                KBVUtilityPrices_T: {
                    position: {
                        type: "Boolean",
                        i18n: i18n( 'catalog-schema.KBVUtilityPrices_T.position.i18n' )
                    },
                    chapter: {
                        type: "String",
                        i18n: i18n( 'catalog-schema.KBVUtilityPrices_T.chapter.i18n' )
                    },
                    description: {
                        type: "String",
                        i18n: i18n( 'catalog-schema.KBVUtilityPrices_T.description.i18n' )
                    },
                    validFrom: {
                        type: "String",
                        i18n: i18n( 'catalog-schema.KBVUtilityPrices_T.validFrom.i18n' )
                    },
                    price: {
                        type: "Number",
                        i18n: i18n( 'catalog-schema.KBVUtilityPrices_T.price.i18n' )
                    }
                }
            }
        );
        // Mapping table for insurance catalogs
        insuranceMap = {
            "A": {
                "PUBLIC": "BVA",
                "PRIVATE": "BVA",
                "PRIVCHOICE": "BVA",
                "SELFPAYER": "BVA"
            },
            "D": {
                "PUBLIC": ["EBM"],
                "PRIVATE": ["GOÄ", "GebüH"],
                "PUBLIC_A": ["EBM"],
                "PRIVATE_A": ["GOÄ", "GebüH"],
                "SELFPAYER": ["GOÄ", "GebüH", "AMTS"],
                "BG": ["UVGOÄ"],
                "PRIVCHOICE": ["GOÄ", "UVGOÄ", "GebüH", "EBM"],
                "PREPARED": ["GOÄ", "UVGOÄ", "GebüH", "EBM"]
            },
            "CH" : {
                "PRIVATE_CH": ["TARMED", "EAL", "MIGEL", "ARZT_KVG_VVG", "Pandemieleistungen"],
                "PRIVATE_CH_UVG": ["TARMED_UVG_IVG_MVG", "EAL", "MIGEL", "Pandemieleistungen", "AMV"],
                "PRIVATE_CH_MVG": ["TARMED_UVG_IVG_MVG", "EAL", "MIGEL", "Pandemieleistungen"],
                "PRIVATE_CH_IVG": ["TARMED_UVG_IVG_MVG", "EAL", "MIGEL"],
                "PRIVATE_CH_VVG": ["TARMED_UVG_IVG_MVG", "MIGEL", "EAL", "ARZT_KVG_VVG"],
                "PREPARED": ["TARMED_UVG_IVG_MVG", "MIGEL", "TARMED", "EAL", "ARZT_KVG_VVG"]
            }
        };

        function unifySeq( seq ) {
            var
                NUMBER_LENGTH = 9,
                reg = /([^\d]*)(\d*)((?:[^\d].*)?)/,
                matches = (seq && seq.toString() || '').match( reg ),
                letterPart = matches[ 1 ] || '',
                numberPart = matches[ 2 ] || '',
                restPart = matches[ 3 ] || '',
                numberCount = numberPart.length,
                zerosNumber = NUMBER_LENGTH - numberCount,
                i;
            if( !seq && 0 !== seq ) {
                return seq;
            }
            if( letterPart && !numberPart.length && !restPart.length ) {
                return letterPart;
            }
            for( i = 0; i < zerosNumber; i++ ) {
                numberPart = '0' + numberPart;
            }
            return letterPart + numberPart + restPart.toUpperCase();
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        function sortItemsBySeq( item1, item2 ) {
            var
                seq1 = unifySeq( item1.seq ),
                seq2 = unifySeq( item2.seq );
            if( seq1 > seq2 ) {
                return 1;
            } else if( seq1 < seq2 ) {
                return -1;
            } else {
                return 0;
            }
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            //MOJ-1870: optimisation indexes essential for large collection
            indexes: [
                { key: {
                    "title": 1
                } },
                { key: {
                    "vknr": 1
                }, indexType: { sparse:true } },
                { key: {
                    "catalog": 1
                } },
                { key: {
                    "catalogShort": 1
                } },
                { key: {
                    "catalog": 1,
                    "bzkey": 1
                } },
                { key: {
                    "seq": 1,
                    "catalog": 1
                } },
                { key: {
                    "unifiedSeq": 1,
                    "catalog": 1
                } },
                { key: {
                    "kv": 1,
                    "kvSU": 1,
                    "kvKey": 1,
                    "kvType": 1
                    }, indexType: { sparse:true } },
                { key: {
                    bsnr: 1
                } },
                { key: { parentBsnr: 1 } },
                { key: { lanr: 1 } },
                { key: {
                    seq: 1
                } },
                {
                    key: {
                        "sign": 1
                    },
                    indexType: {sparse: true}
                },
                { key: {
                    "plz": 1
                    }, indexType: { sparse:true } },
                { key: {
                    "country": 1
                    }, indexType: { sparse:true } },
                { key: {
                    "omimG": 1
                    }, indexType: { sparse:true } },
                { key: {
                    "omimP": 1
                    }, indexType: { sparse:true } },
                { key: {
                    "genName": 1
                    }, indexType: { sparse:true } },
                { key: {
                    "desc": 1
                } },
                { key: {
                    "u_extra.hierarchyRules.seq":1
                    }, indexType: { sparse:true }
                }
            ],

            name: NAME,

            /**
             * Return the short name of a insurance catalog according to
             * the specified country code and insurance type.
             *
             * @param country
             * @param insuranceType
             * @returns {*}
             */
            getShortNameByInsuranceType: function( country, insuranceType ) {
                var _short;
                if( insuranceMap[country] && insuranceMap[country][insuranceType] ) {
                    _short = insuranceMap[country][insuranceType];
                } else {
                    Y.log( 'Could not find short name for country ' + country +
                           ' and insurance type: ' + insuranceType, 'warn', NAME );
                    _short = '';
                }
                return _short;
            },

            /**
             * Returns array of insurance types for a given country and catalog short name.
             *
             * @param country
             * @param shortName
             * @returns {Array}
             */
            getInsuranceTypesByShortName: function(country, shortName) {
                var i,
                    insuranceTypes = [],
                    insuranceCountryMap = insuranceMap[country];
                if( insuranceCountryMap ) {
                    for( i in insuranceCountryMap ) {
                        if( -1 !== insuranceCountryMap[i].indexOf( shortName ) ) {
                            insuranceTypes.push( i );
                        }
                    }
                }
                return insuranceTypes;
            },

            /**
             * General function to list all activities that can have catalog.
             *
             * Used in Reports to translate the Catalog to human readable form.
             *
             * Used in UI to tell whether the UI should expect special code entry.
             *
             * @returns {string[]}
             */
            getDisplayCatalogActTypes: function() {
                return [
                    'TREATMENT',
                    'MEDICATION',
                    'DIAGNOSIS',
                    'UTILITY',
                    'ASSISTIVE',
                    'MEASUREMENT'/*,
                    // Process is not a catalog type for display purposes
                    // it has no code wizard inputter, or special input variant
                    // nor does it need special translations
                    'PROCESS'*/
                ];
            },

            getSubGop: function( u_extra, age, options ) {
                var found, subGop = u_extra && u_extra.sub_gop_liste;
                if( !subGop || !subGop.gnrs || !subGop.gnrs.length ) {
                    return;
                }

                subGop.gnrs.some( function( gnr ) {
                    var additionalCheck = true;
                    if( options && Object.keys(options).length ){
                        Object.keys(options).forEach( function( key ){
                            if( (options[key] || options[key] === false) && !(gnr[key] === options[key] || gnr[key] === '_all_' ) ){
                                additionalCheck = false;
                            }
                        });
                    }
                    if(!additionalCheck){
                        return false;
                    }

                    var passed = gnr.alter.every( function( alter ) {
                        var gnrAge = +alter.value;
                        return ('MIN' === alter.type  ? age >= gnrAge : age < gnrAge);
                    } );
                    if( passed ) {
                        found = gnr.code;

                    }
                    return passed;
                } );
                return found;
            },

            hasSubGop: function( u_extra ) {
                return Boolean( u_extra && u_extra.sub_gop_liste );
            },

            getMessageInLanguage: function(messagesArray, language) {
                var languagesMap = ['de', 'us', 'gb', 'fr', 'es', 'it'],
                    ind = languagesMap.indexOf(language);

                if ( ind === -1 ) {
                    Y.log('Unknown language for getting Cardio message: '+language,'error');
                    ind = 0;
                }
                if (ind < messagesArray.length) {
                    return messagesArray[ind];
                } else {
                    Y.log('Wrong multi-language message array: '+language,'error');
                    return "";
                }
            },
            /**
             * Returns first ambulant price item unless isStationary is true, then the first stationary price item is returned.
             * The first priceItem without "leistungserbringerart" set will also be immediately returned.
             * @param bewertung_liste
             * @param [isStationary]
             * @returns priceItem
             */
            getPriceItemFromList: function( bewertung_liste, isStationary ) {
                var kind = true === isStationary ? '2' : '1', // "leistungserbringerart"
                    result;
                if( Array.isArray( bewertung_liste ) ) {
                    bewertung_liste.some( function( item ) {
                        if( !item.leistungserbringerart || item.leistungserbringerart === kind ) {
                            result = item;
                            return true;
                        }
                    } );
                }
                return result;
            },
            sortItemsBySeq: sortItemsBySeq,
            cacheQuery: true,
            unifySeq: unifySeq
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', { requires: ['person-schema', 'dcschemaloader' ] }
);
