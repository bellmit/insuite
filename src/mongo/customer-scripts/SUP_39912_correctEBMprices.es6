// AOK etc. problems with HK messed up - SUP-39573, SUP-39824

// ------------------------------------
//   Section I  looks at HK and determine bad HK entries.
//              no fix script available, unfinished
// ------------------------------------
var iDate = ISODate("2021-01-01T00:00:00.000Z");

var badSeq = db.catalogusages.aggregate( [
    {
        $group: {
            _id: "$seq",
            catalogYesNo: {$addToSet: "$catalog"},
            catalogs: {$addToSet:"$catalogShort"},
            actTypes: {$addToSet:"$seqId.actType"}
        }
    }, {$match: {"catalogYesNo.1": {$exists: true}}}] ).map( a => a );
badSeq.length;

/*output the array visibly*/
badSeq.filter(a=>a.catalogs.includes("EBM")).map(a=>`${a._id}  ${a.catalogs}  /  ${a.actTypes}`)
var badCodes = db.activities.distinct("code", {timestamp:{$gt:iDate},actType:"TREATMENT", catalog:false, code: /^\d{5}$/, catalogShort:"EBM"});


var suspectTreatments = db.activities.find({timestamp:{$gt:iDate},actType:"TREATMENT", catalog:false, code: /\d{5}/, catalogShort:"EBM"});
var badCodes = db.activities.distinct("code", {timestamp:{$gt:iDate},actType:"TREATMENT", catalog:false, code: /^\d{5}$/, catalogShort:"EBM"});
var bS = badSeq.map( a => a._id )
badCodes.filter( c => !bS.includes(c) );



// ------------------------------------
//   Section II  inspects activities, prints problematic codes
//               Fix script follows in section III
//               This is generic code you want to run
// ------------------------------------


var iDate = ISODate("2021-01-01T00:00:00.000Z");
// Calculate Bad EBM Prices in this Quarter
var badPrices = db.activities.aggregate( [
    {$match: {timestamp:{$gt:iDate}}},
    {
     $group:{_id:"$code", catalog: {$addToSet:"$catalog"},
         unit: {$addToSet:"$unit"}, actualUnit: {$addToSet:"$actualUnit"},
         price: {$addToSet:"$price"}, actualPrice: {$addToSet:"$actualPrice"},
         billingFactorValue: {$addToSet:"$billingFactorValue"}}
    }, {$match: {"price.1": {$exists: true},_id: /^\d{5}$/}}] ).map( a => a );
badPrices.length;

// Quick analysis
//  All empty arrays is good output here.
badPrices.forEach( rec => {
    printjson( db.activities.aggregate([
        {$match:{code:rec._id,timestamp:{$gt:iDate}, billingFactorValue:"0.111244", price: {$nin:rec.actualPrice}, catalog:true }},
        {$project:{code:1,price: 1, catalog: 1, unit: 1, actualUnit: 1, actualPrice: 1,billingFactorValue:1}},
        {$group:{_id:"$code",price: {$addToSet:"$price"}, catalog: {$addToSet:"$catalog"}, unit: {$addToSet:"$unit"}, actualUnit: {$addToSet:"$actualUnit"}, actualPrice: {$addToSet:"$actualPrice"},billingFactorValue: {$addToSet:"$billingFactorValue"}}},
        {$match:{$or:[{"price.1": {$exists:true}}, {"catalog.1": {$exists:true}}, {"unit.1": {$exists:true}}, {"actualUnit.1": {$exists:true}}, {"actualPrice.1": {$exists:true}},{"billingFactorValue.1": {$exists:true}}]}}
        ]).map(a=>a) );
});

// Detailed analysis
badPrices.forEach( rec => {
    printjson( db.activities.aggregate([
        {$match:{code:rec._id,timestamp:{$gt:iDate}, billingFactorValue:"0.111244", price: {$nin:rec.actualPrice}, catalog:true }},
        {$project:{code:1,price: 1, catalog: 1, unit: 1, actualUnit: 1, actualPrice: 1,billingFactorValue:1}},
        {$group:{_id:"$code",price: {$addToSet:"$price"}, catalog: {$addToSet:"$catalog"}, unit: {$addToSet:"$unit"}, actualUnit: {$addToSet:"$actualUnit"}, actualPrice: {$addToSet:"$actualPrice"},billingFactorValue: {$addToSet:"$billingFactorValue"}}
        } ]).map(a=>a) );
});

//////////
db.activities.find({code:"35405",timestamp:{$gt:iDate}     }, {price: 1, catalog: 1, unit: 1, actualUnit: 1, value: 1,billingFactorValue:1})


// ------------------------------------
//   Section III   Generic fix script
//
// ------------------------------------

//// Quick backup
badPrices.forEach( x => {
    db.activities.find({timestamp:{$gt:iDate},code:x._id}).forEach(b=>{
        db.SUP39912_delete_Apr_21.insert(b);});
});
db.SUP39912_delete_Apr_21.count();


// do the fix.
var errPrices = [];
var totalModified=0
function genericFixPrices( record ) {
    var correctRS =  db.activities.find({code:record._id,timestamp:{$gt:iDate}, billingFactorValue:"0.111244", price: {$nin:record.actualPrice}, catalog:true});
    if(!correctRS.hasNext()) {
        errPrices.push(record._id);
        return print(`${record._id}  !!!!!! NO CORRECT RECORD FOUND `)
    }
    var correctActivity = correctRS.next();
    print( `billingFactorValue: code: ${record._id} ${correctActivity.billingFactorValue}, price: ${correctActivity.price}, actualPrice: ${correctActivity.actualPrice}, unit: ${correctActivity.unit}, actualUnit: ${correctActivity.actualUnit}` );
    /* correct the activities */
    var result = db.activities.updateMany({timestamp:{$gt:iDate}, code:record._id, price:{ $ne: correctActivity.price } }, {$set: {
            billingFactorValue: correctActivity.billingFactorValue, u_extra: correctActivity.u_extra, price: correctActivity.price, actualPrice: correctActivity.actualPrice, unit: correctActivity.unit, actualUnit: correctActivity.actualUnit
        }});
    printjson(result);
    totalModified += result.modifiedCount;
}

badPrices.forEach( x => genericFixPrices( x ) );
totalModified;
errPrices;

db.activities.count({timestamp:{$gt:iDate}, code:{$in:errPrices}});


// ------------------------------------
//   Section IV   More relaxed fix script
//
//          This script recognises and fixes more error cases than the safe version above,
//          but it may not correctly handle the codes with unit and actualUnit = Euro.
// ------------------------------------
/*sometimes there are not completely broken entries, that cannot be fixed, you can see these "errPrices" here:*/

function f(code) {
    var rs = db.activities.find( {code: code, timestamp: {$gt: iDate}, billingFactorValue: "0.111244", catalog: true}, {code:1, price: 1, catalog: 1, unit: 1, actualUnit: 1, actualPrice:1, value: 1,billingFactorValue:1} );
    if( rs.hasNext() ) {
        printjson( rs.next() );
    }
}
errPrices.forEach(x=>f(x));

/*then this less safe script fixes them...*/

var errPrices2 = [];
var totalModified2 = 0
function genericFixPricesLessSafe( code ) {
    var correctRS =  db.activities.find({code:code,timestamp:{$gt:iDate}, billingFactorValue:"0.111244", catalog:true});
    if(!correctRS.hasNext()) {
        errPrices2.push(code);
        return print(`${code}  !!!!!! NO CORRECT RECORD FOUND `)
    }
    var correctActivity = correctRS.next();
    print( `billingFactorValue: code: ${code} ${correctActivity.billingFactorValue}, price: ${correctActivity.price}, actualPrice: ${correctActivity.actualPrice}, unit: ${correctActivity.unit}, actualUnit: ${correctActivity.actualUnit}` );
    /* correct the activities */
    var result = db.activities.updateMany({timestamp:{$gt:iDate}, code:code, price:{ $ne: correctActivity.price } }, {$set: {
            billingFactorValue: correctActivity.billingFactorValue, u_extra: correctActivity.u_extra, price: correctActivity.price, actualPrice: correctActivity.actualPrice, unit: correctActivity.unit, actualUnit: correctActivity.actualUnit
        }});
    printjson(result);
    totalModified2 += result.modifiedCount;
}

errPrices.forEach( x => genericFixPricesLessSafe( x ) );
totalModified2;
errPrices2;

var insertionArray = [];
db.SUP39912_delete_Apr_21.find().forEach( rec => {
    insertionArray.push({
        '_id': new ObjectId(),
        'entityName': 'ACTIVITY',
        'entryId': rec._id.str,
        'timestamp': new Date()
    } );
});
print( `[i] Scheduling reporting update for SUP39912_delete_Apr_21` );
db.syncreportings.insertMany( insertionArray );


function f(code) {
    print( db.activities.count( {code: code, timestamp: {$gt: iDate}}, {code:1, price: 1, catalog: 1, unit: 1, actualUnit: 1, actualPrice:1, value: 1,billingFactorValue:1} ));
}
errPrices2.forEach(x=>f(x));

/*
cd /var/lib/prc
tar -xvzf ~/incoming/p4_17_17.tgz
cat 4_17_17 | xargs -n 1 ls -la
cat 4_17_17 | xargs 4_17_17backup.tgz
cat 4_17_17 | xargs cvzf 4_17_17backup.tgz
cat 4_17_17 | xargs tar cvzf 4_17_17backup.tgz
tar xvzf 4_17_17_Patch.tgz
cat 4_17_17 | xargs -n 1 chown prc.prc
  */


var updatelist = [
    {
        "_id" : ObjectId("603d3b03d045b5ea0b222051"),
        "price" : 15.02,
        "billingFactorValue" : "0.111244",
        "catalog" : true,
        "u_extra" : {
            "validfrom" : "2005-04-01..",
            "quittungstext" : "Zuschlag für die Sprachschwellenmessung",
            "leistungserbringerart" : "1",
            "leistungsgruppe" : "8",
            "asvQualifications" : [
                "HALS_NASEN_OHRENHEILKUNDE"
            ],
            "kv" : {
                "kv" : "51",
                "arztpraxis" : true,
                "kv_bewertung" : [
                    {
                        "value" : "135",
                        "unit" : "Punkte",
                        "leistungserbringerart" : "1"
                    },
                    {
                        "value" : "15.02",
                        "unit" : "Euro",
                        "leistungserbringerart" : "1",
                        "versorgungsgebiet" : "1"
                    },
                    {
                        "value" : "135",
                        "unit" : "Punkte",
                        "leistungserbringerart" : "2"
                    },
                    {
                        "value" : "15.02",
                        "unit" : "Euro",
                        "leistungserbringerart" : "2",
                        "versorgungsgebiet" : "1"
                    }
                ]
            },
            "gkv_kontenart" : [
                {
                    "gkv_kontenart" : "400"
                },
                {
                    "gkv_kontenart" : "408"
                },
                {
                    "gkv_kontenart" : "409"
                },
                {
                    "gkv_kontenart" : "463"
                },
                {
                    "gkv_kontenart" : "570"
                }
            ],
            "fachgruppe_liste" : {
                "zulaessig" : true,
                "liste" : [
                    {
                        "versorgungsbereich" : "2",
                        "fachgruppe" : [
                            "060",
                            "061",
                            "062"
                        ]
                    }
                ]
            },
            "berichtspflicht" : false,
            "genehmigungspflicht" : true,
            "aop_115b" : false,
            "begruendungen_liste" : {
                "ops_liste" : [ ],
                "ops_liste_include" : null,
                "icd_liste" : [ ],
                "gnr_liste" : [ ]
            },
            "ausschluss_liste" : [
                {
                    "value" : "1",
                    "unit" : "1",
                    "gnr" : [
                        {
                            "seq" : "09320",
                            "hint" : "Tonschwellenaudiometrie"
                        },
                        {
                            "seq" : "09335",
                            "hint" : "Zuschlag zu der Gebührenordnungsposition 09320 bei Durchführung einer Kinderaudiometrie an einer speziellen Kinderaudiometrieanlage"
                        },
                        {
                            "seq" : "09336",
                            "hint" : "Kindersprachaudiometrie an einer speziellen Kinderaudiometrieanlage"
                        },
                        {
                            "seq" : "20320",
                            "hint" : "Tonschwellenaudiometrie"
                        },
                        {
                            "seq" : "20321",
                            "hint" : "Zuschlag Sprachaudiometrie"
                        },
                        {
                            "seq" : "20335",
                            "hint" : "Zuschlag zur Gebührenordnungsposition 20320 bei Durchführung einer Kinderaudiometrie an einer speziellen Kinderaudiometrieanlage"
                        },
                        {
                            "seq" : "20336",
                            "hint" : "Kindersprachaudiometrie an einer speziellen Kinderaudiometrieanlage"
                        }
                    ]
                },
                {
                    "value" : "1",
                    "unit" : "2",
                    "gnr" : [
                        {
                            "seq" : "09343",
                            "hint" : "Zusatzpauschale bei der Diagnostik des Tinnitus"
                        },
                        {
                            "seq" : "20338",
                            "hint" : "Hörgeräteversorgung beim Säugling, Kleinkind oder Kind"
                        },
                        {
                            "seq" : "20339",
                            "hint" : "Zusatzpauschale für die erste Nachuntersuchung nach Hörgeräteversorgung beim Säugling, Kleinkind oder Kind"
                        },
                        {
                            "seq" : "20340",
                            "hint" : "Zusatzpauschale für die Nachsorge(n) bei Hörgeräteversorgung beim Säugling, Kleinkind oder Kind"
                        },
                        {
                            "seq" : "20343",
                            "hint" : "Zusatzpauschale bei der Diagnostik des Tinnitus"
                        }
                    ]
                },
                {
                    "value" : "1",
                    "unit" : "7",
                    "gnr" : [
                        {
                            "seq" : "09372",
                            "hint" : "Hörgeräteversorgung beim Jugendlichen und Erwachsenen"
                        },
                        {
                            "seq" : "09373",
                            "hint" : "Zusatzpauschale für die erste Nachuntersuchung nach Hörgeräteversorgung beim Jugendlichen und Erwachsenen"
                        },
                        {
                            "seq" : "09374",
                            "hint" : "Zusatzpauschale für die Nachsorge(n) bei Hörgeräteversorgung"
                        },
                        {
                            "seq" : "20372",
                            "hint" : "Hörgeräteversorgung beim Jugendlichen und Erwachsenen"
                        },
                        {
                            "seq" : "20373",
                            "hint" : "Zusatzpauschale für die erste Nachuntersuchung nach Hörgeräteversorgung"
                        },
                        {
                            "seq" : "20374",
                            "hint" : "Zusatzpauschale für die Nachsorge(n) bei Hörgeräteversorgung"
                        }
                    ]
                }
            ],
            "zeitbedarfsliste" : [
                {
                    "zeitbedarf" : "2",
                    "leistung_typ" : "AL"
                }
            ],
            "pruefzeit" : {
                "quartal" : 2,
                "tag" : 2
            },
            "bewertung_liste" : [
                {
                    "value" : "135",
                    "unit" : "Punkte",
                    "leistungserbringerart" : "1"
                },
                {
                    "value" : "15.02",
                    "unit" : "Euro",
                    "leistungserbringerart" : "1",
                    "versorgungsgebiet" : "1"
                },
                {
                    "value" : "135",
                    "unit" : "Punkte",
                    "leistungserbringerart" : "2"
                },
                {
                    "value" : "15.02",
                    "unit" : "Euro",
                    "leistungserbringerart" : "2",
                    "versorgungsgebiet" : "1"
                }
            ]
        },
        "code" : "09321",
        "actualPrice" : 135,
        "unit" : "Euro",
        "actualUnit" : "Punkte"
    },
    {
        "_id" : ObjectId("603d3af6bf87c9ea119f5023"),
        "price" : 0.25,
        "billingFactorValue" : "0.111244",
        "catalog" : true,
        "u_extra" : {
            "validfrom" : "2005-04-01..",
            "quittungstext" : "Mengenmäßige Bestimmung der Gamma-GT",
            "leistungserbringerart" : "1",
            "leistungsgruppe" : "11",
            "asvQualifications" : [
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG",
                "INNERE_MEDIZIN_UND_GASTROENTEROLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG",
                "INNERE_MEDIZIN_UND_GASTROENTEROLOGIE",
                "STRAHLENTHERAPIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE",
                "HALS_NASEN_OHRENHEILKUNDE",
                "NUKLEARMEDIZIN_KERNTEAM",
                "VISZERALCHIRURGIE",
                "ALLGEMEINCHIRURGIE",
                "LABORATORIUMSMEDIZIN",
                "FRAUENHEILKUNDE_UND_GEBURTSHILFE_MIT_SCHWERPUNKT_GYNÄKOLOGISCHE_ONKOLOGIE",
                "UROLOGIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE",
                "STRAHLENTHERAPIE",
                "HAUT_UND_GESCHLECHTSKRANKHEITEN",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG",
                "LABORATORIUMSMEDIZIN",
                "INNERE_MEDIZIN_UND_PNEUMOLOGIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG",
                "STRAHLENTHERAPIE",
                "THORAXCHIRURGIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE",
                "INNERE_MEDIZIN_UND_KARDIOLOGIE_(KERNTEAM)",
                "HERZCHIRURGIE",
                "LABORATORIUMSMEDIZIN",
                "HAUT_UND_GESCHLECHTSKRANKHEITEN",
                "ORTHOPÄDIE_UND_UNFALLCHIRURGIE_MIT_ZUSATZ-WEITERBILDUNG_ORTHOPÄDISCHE_RHEUMATOLOGIE",
                "INNERE_MEDIZIN_UND_NEPHROLOGIE",
                "INNERE_MEDIZIN_UND_PNEUMOLOGIE",
                "INNERE_MEDIZIN_UND_RHEUMATOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-RHEUMATOLOGIE",
                "AUGENHEILKUNDE",
                "ORTHOPÄDIE_UND_UNFALLCHIRURGIE_MIT_ZUSATZ-WEITERBILDUNG_ORTHOPÄDISCHE_RHEUMATOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-PNEUMOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN",
                "INNERE_MEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_INFEKTIOLOGIE",
                "MIKROBIOLOGIE_VIROLOGIE_UND_INFEKTIONSEPIDEMIOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-GASTROENTEROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-PNEUMOLOGIE",
                "ORTHOPADIE_UND_UNFALLCHIRURGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN",
                "INNERE_MEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE",
                "TRANSFUSIONSMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_HÄMOSTASEOLOGIE",
                "LABORATORIUMSMEDIZIN",
                "KINDER_UND_JUGENDMEDIZIN",
                "INNERE_MEDIZIN_UND_RHEUMATOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER-RHEUMATOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER-PNEUMOLOGIE",
                "INNERE_MEDIZIN_UND_PNEUMOLOGIE",
                "LABORATORIUMSMEDIZIN",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_NEUROPÄDIATRIE",
                "NEUROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-GASTROENTEROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDER_UND_JUGEND-KARDIOLOGIE",
                "HERZCHIRURGIE",
                "INNERE_MEDIZIN_UND_KARDIOLOGIE",
                "ORTHOPADIE_UND_UNFALLCHIRURGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-PNEUMOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDER_UND_JUGEND-KARDIOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-GASTROENTEROLOGIE",
                "INNERE_MEDIZIN_UND_GASTROENTEROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN",
                "LABORATORIUMSMEDIZIN",
                "INNERE_MEDIZIN_UND_HAMATOLOGIE_UND_ONKOLOGIE"
            ],
            "kv" : {
                "kv" : "51",
                "arztpraxis" : true,
                "kv_bewertung" : [
                    {
                        "value" : "0.25",
                        "unit" : "Euro",
                        "leistungserbringerart" : "1"
                    },
                    {
                        "value" : "0.25",
                        "unit" : "Euro",
                        "leistungserbringerart" : "2"
                    }
                ]
            },
            "gkv_kontenart" : [
                {
                    "gkv_kontenart" : "400"
                },
                {
                    "gkv_kontenart" : "408"
                },
                {
                    "gkv_kontenart" : "409"
                },
                {
                    "gkv_kontenart" : "463"
                },
                {
                    "gkv_kontenart" : "570"
                }
            ],
            "fachgruppe_liste" : {
                "zulaessig" : true,
                "liste" : [
                    {
                        "versorgungsbereich" : "1",
                        "fachgruppe" : [
                            "001",
                            "002",
                            "010",
                            "080",
                            "090",
                            "092",
                            "093",
                            "094",
                            "096",
                            "097",
                            "098",
                            "099",
                            "340",
                            "341",
                            "342",
                            "343",
                            "344",
                            "505",
                            "520",
                            "536",
                            "537",
                            "538",
                            "539",
                            "547",
                            "562",
                            "563",
                            "565"
                        ]
                    },
                    {
                        "versorgungsbereich" : "2",
                        "fachgruppe" : [
                            "020",
                            "022",
                            "030",
                            "040",
                            "041",
                            "042",
                            "043",
                            "044",
                            "045",
                            "046",
                            "047",
                            "048",
                            "050",
                            "060",
                            "061",
                            "062",
                            "070",
                            "080",
                            "081",
                            "082",
                            "083",
                            "084",
                            "085",
                            "086",
                            "087",
                            "088",
                            "089",
                            "091",
                            "095",
                            "100",
                            "102",
                            "110",
                            "111",
                            "112",
                            "120",
                            "130",
                            "131",
                            "140",
                            "141",
                            "142",
                            "144",
                            "145",
                            "146",
                            "147",
                            "148",
                            "149",
                            "150",
                            "160",
                            "161",
                            "170",
                            "171",
                            "190",
                            "191",
                            "192",
                            "194",
                            "195",
                            "196",
                            "197",
                            "199",
                            "200",
                            "220",
                            "271",
                            "291",
                            "303",
                            "304",
                            "309",
                            "310",
                            "314",
                            "315",
                            "320",
                            "321",
                            "322",
                            "324",
                            "326",
                            "327",
                            "330",
                            "357",
                            "470",
                            "471",
                            "501",
                            "504",
                            "506",
                            "510",
                            "511",
                            "512",
                            "513",
                            "514",
                            "515",
                            "516",
                            "517",
                            "518",
                            "521",
                            "522",
                            "523",
                            "524",
                            "525",
                            "526",
                            "527",
                            "528",
                            "529",
                            "530",
                            "531",
                            "532",
                            "533",
                            "534",
                            "535",
                            "542",
                            "544",
                            "545",
                            "546",
                            "548",
                            "549",
                            "550",
                            "551",
                            "552",
                            "553",
                            "554",
                            "555",
                            "556",
                            "557",
                            "558",
                            "559",
                            "560",
                            "561",
                            "564",
                            "566",
                            "567",
                            "568",
                            "570",
                            "571",
                            "572"
                        ]
                    }
                ]
            },
            "berichtspflicht" : false,
            "genehmigungspflicht" : false,
            "aop_115b" : false,
            "begruendungen_liste" : {
                "ops_liste" : [ ],
                "ops_liste_include" : null,
                "icd_liste" : [ ],
                "gnr_liste" : [ ]
            },
            "ausschluss_liste" : [
                {
                    "value" : "1",
                    "unit" : "1",
                    "gnr" : [
                        {
                            "seq" : "32125",
                            "hint" : "Präoperative Labordiagnostik"
                        },
                        {
                            "seq" : "34291",
                            "hint" : "Herzkatheteruntersuchung mit Koronarangiographie"
                        }
                    ]
                },
                {
                    "value" : "1",
                    "unit" : "2",
                    "gnr" : [
                        {
                            "seq" : "31010",
                            "hint" : "Operationsvorbereitung bei Neugeborenen, Säuglingen, Kleinkindern und Kindern bis zum 12. Lebensjahr"
                        },
                        {
                            "seq" : "31011",
                            "hint" : "Operationsvorbereitung für Eingriffe bei Jugendlichen und Erwachsenen bis zum vollendeten 40. Lebensjahr"
                        },
                        {
                            "seq" : "31012",
                            "hint" : "Operationsvorbereitung bei Eingriffen bei Patienten nach Vollendung des 40. Lj"
                        },
                        {
                            "seq" : "31013",
                            "hint" : "Operationsvorbereitung bei Patienten nach Vollendung des 60. Lebensjahres"
                        }
                    ]
                },
                {
                    "value" : "1",
                    "unit" : "6",
                    "gnr" : [
                        {
                            "seq" : "08535",
                            "hint" : "Stimulationsbehandlung zur In-Vitro-Fertilisation (IVF), Intracytoplasmatischen Spermieninjektion (ICSI) oder zum intratubaren Gametentransfer (GIFT)"
                        },
                        {
                            "seq" : "08550",
                            "hint" : "Extrakorporale Befruchtung mit natürlicher Eizell-Spermien-Interaktion (In-vitro-Fertilisation (IVF)), inklusive Kultivierung bis zum Embryonentransfer (ET)"
                        },
                        {
                            "seq" : "08551",
                            "hint" : "Maßnahmen zur In-vitro-Fertilisation (IVF) entsprechend der Gebührenordnungsposition 08550 bis zum Ausbleiben der Zellteilung"
                        },
                        {
                            "seq" : "08552",
                            "hint" : "Maßnahmen zur In-vitro-Fertilisation (IVF) entsprechend der Gebührenordnungspositionen 08550 bzw. 08560 bis frühestens zwei Tage vor der geplanten Follikelpunktion"
                        },
                        {
                            "seq" : "08555",
                            "hint" : "Extrakorporale Befruchtung mittels intrazytoplasmatischer Spermieninjektion (ICSI)"
                        },
                        {
                            "seq" : "08558",
                            "hint" : "Embryo-Transfer (ET), ggf. als Zygotentransfer und/oder als intratubarer Embryo-Transfer (EIFT) oder intratubarer Gameten-Transfer (GIFT)"
                        },
                        {
                            "seq" : "08560",
                            "hint" : "IVF einschl. ICSI mit anschließendem Embryo-Transfer (ET)"
                        },
                        {
                            "seq" : "08561",
                            "hint" : "IVF einschl. ICSI bis zum Ausbleiben der Zellteilung"
                        }
                    ]
                },
                {
                    "value" : "1",
                    "unit" : "7",
                    "gnr" : [
                        {
                            "seq" : "40100",
                            "hint" : "Versandmaterial, Transport, Ergebnisübermittlung (Labor, Zytologie, Zyto- und Molekulargenetik)"
                        }
                    ]
                }
            ],
            "bewertung_liste" : [
                {
                    "value" : "0.25",
                    "unit" : "Euro",
                    "leistungserbringerart" : "1"
                },
                {
                    "value" : "0.25",
                    "unit" : "Euro",
                    "leistungserbringerart" : "2"
                }
            ]
        },
        "code" : "32071",
        "actualPrice" : 0.25,
        "unit" : "Euro",
        "actualUnit" : "Euro"
    },
    {
        "_id" : ObjectId("603d3aec85e78aea133c0858"),
        "price" : 19.4,
        "billingFactorValue" : "0.111244",
        "catalog" : true,
        "u_extra" : {
            "validfrom" : "2007-07-01..",
            "quittungstext" : "Untersuchung des/der natriuretischen Peptides/Peptide BNP und/oder NT-Pro-BNP und/oder MR-Pro-ANP",
            "leistungserbringerart" : "1",
            "leistungsgruppe" : "11",
            "asvQualifications" : [
                "FRAUENHEILKUNDE_UND_GEBURTSHILFE_MIT_SCHWERPUNKT_GYNÄKOLOGISCHE_ONKOLOGIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG",
                "STRAHLENTHERAPIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE",
                "LABORATORIUMSMEDIZIN",
                "UROLOGIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE",
                "STRAHLENTHERAPIE",
                "HAUT_UND_GESCHLECHTSKRANKHEITEN",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG",
                "LABORATORIUMSMEDIZIN",
                "INNERE_MEDIZIN_UND_PNEUMOLOGIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE_OHNE_GENANNTEN_SCHWERPUNKT_UND_MIT_KV-GENEHMIGUNG",
                "STRAHLENTHERAPIE",
                "THORAXCHIRURGIE",
                "INNERE_MEDIZIN_UND_HÄMATOLOGIE_UND_ONKOLOGIE",
                "INNERE_MEDIZIN_UND_KARDIOLOGIE_(KERNTEAM)",
                "HERZCHIRURGIE",
                "LABORATORIUMSMEDIZIN",
                "HAUT_UND_GESCHLECHTSKRANKHEITEN",
                "ORTHOPÄDIE_UND_UNFALLCHIRURGIE_MIT_ZUSATZ-WEITERBILDUNG_ORTHOPÄDISCHE_RHEUMATOLOGIE",
                "INNERE_MEDIZIN_UND_NEPHROLOGIE",
                "INNERE_MEDIZIN_UND_PNEUMOLOGIE",
                "INNERE_MEDIZIN_UND_RHEUMATOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-RHEUMATOLOGIE",
                "AUGENHEILKUNDE",
                "ORTHOPÄDIE_UND_UNFALLCHIRURGIE_MIT_ZUSATZ-WEITERBILDUNG_ORTHOPÄDISCHE_RHEUMATOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-GASTROENTEROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN",
                "INNERE_MEDIZIN_UND_GASTROENTEROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-PNEUMOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN",
                "INNERE_MEDIZIN_UND_RHEUMATOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER-RHEUMATOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER-PNEUMOLOGIE",
                "INNERE_MEDIZIN_UND_PNEUMOLOGIE",
                "LABORATORIUMSMEDIZIN",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_NEUROPÄDIATRIE",
                "NEUROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-GASTROENTEROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDER_UND_JUGEND-KARDIOLOGIE",
                "HERZCHIRURGIE",
                "INNERE_MEDIZIN_UND_KARDIOLOGIE",
                "ORTHOPADIE_UND_UNFALLCHIRURGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-PNEUMOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_SCHWERPUNKT_KINDER_UND_JUGEND-KARDIOLOGIE",
                "KINDER_UND_JUGENDMEDIZIN_MIT_ZUSATZ-WEITERBILDUNG_KINDER_UND_JUGEND-GASTROENTEROLOGIE",
                "INNERE_MEDIZIN_UND_GASTROENTEROLOGIE",
                "KINDER_UND_JUGENDMEDIZIN",
                "LABORATORIUMSMEDIZIN",
                "INNERE_MEDIZIN_UND_HAMATOLOGIE_UND_ONKOLOGIE"
            ],
            "kv" : {
                "kv" : "51",
                "arztpraxis" : true,
                "kv_bewertung" : [
                    {
                        "value" : "19.40",
                        "unit" : "Euro",
                        "leistungserbringerart" : "1"
                    },
                    {
                        "value" : "19.40",
                        "unit" : "Euro",
                        "leistungserbringerart" : "2"
                    }
                ]
            },
            "gkv_kontenart" : [
                {
                    "gkv_kontenart" : "400"
                },
                {
                    "gkv_kontenart" : "408"
                },
                {
                    "gkv_kontenart" : "409"
                },
                {
                    "gkv_kontenart" : "463"
                },
                {
                    "gkv_kontenart" : "570"
                }
            ],
            "fachgruppe_liste" : {
                "zulaessig" : true,
                "liste" : [
                    {
                        "versorgungsbereich" : "1",
                        "fachgruppe" : [
                            "001",
                            "002",
                            "010",
                            "080",
                            "090",
                            "092",
                            "093",
                            "094",
                            "096",
                            "097",
                            "098",
                            "099",
                            "340",
                            "341",
                            "342",
                            "343",
                            "344",
                            "505",
                            "520",
                            "536",
                            "537",
                            "538",
                            "539",
                            "547",
                            "562",
                            "563",
                            "565"
                        ]
                    },
                    {
                        "versorgungsbereich" : "2",
                        "fachgruppe" : [
                            "020",
                            "022",
                            "030",
                            "040",
                            "041",
                            "042",
                            "043",
                            "044",
                            "045",
                            "046",
                            "047",
                            "048",
                            "050",
                            "060",
                            "061",
                            "062",
                            "070",
                            "080",
                            "081",
                            "082",
                            "083",
                            "084",
                            "085",
                            "086",
                            "087",
                            "088",
                            "089",
                            "091",
                            "095",
                            "100",
                            "102",
                            "110",
                            "111",
                            "112",
                            "120",
                            "130",
                            "131",
                            "140",
                            "141",
                            "142",
                            "144",
                            "145",
                            "146",
                            "147",
                            "148",
                            "149",
                            "150",
                            "160",
                            "161",
                            "170",
                            "171",
                            "190",
                            "191",
                            "192",
                            "194",
                            "195",
                            "196",
                            "197",
                            "199",
                            "200",
                            "220",
                            "271",
                            "291",
                            "303",
                            "304",
                            "309",
                            "310",
                            "314",
                            "315",
                            "320",
                            "321",
                            "322",
                            "324",
                            "326",
                            "327",
                            "330",
                            "357",
                            "470",
                            "471",
                            "501",
                            "504",
                            "506",
                            "510",
                            "511",
                            "512",
                            "513",
                            "514",
                            "515",
                            "516",
                            "517",
                            "518",
                            "521",
                            "522",
                            "523",
                            "524",
                            "525",
                            "526",
                            "527",
                            "528",
                            "529",
                            "530",
                            "531",
                            "532",
                            "533",
                            "534",
                            "535",
                            "542",
                            "544",
                            "545",
                            "546",
                            "548",
                            "549",
                            "550",
                            "551",
                            "552",
                            "553",
                            "554",
                            "555",
                            "556",
                            "557",
                            "558",
                            "559",
                            "560",
                            "561",
                            "564",
                            "566",
                            "567",
                            "568",
                            "570",
                            "571",
                            "572"
                        ]
                    }
                ]
            },
            "berichtspflicht" : false,
            "genehmigungspflicht" : false,
            "aop_115b" : false,
            "begruendungen_liste" : {
                "ops_liste" : [ ],
                "ops_liste_include" : null,
                "icd_liste" : [ ],
                "gnr_liste" : [ ]
            },
            "ausschluss_liste" : [
                {
                    "value" : "1",
                    "unit" : "1",
                    "gnr" : [
                        {
                            "seq" : "34291",
                            "hint" : "Herzkatheteruntersuchung mit Koronarangiographie"
                        }
                    ]
                },
                {
                    "value" : "1",
                    "unit" : "2",
                    "gnr" : [
                        {
                            "seq" : "31010",
                            "hint" : "Operationsvorbereitung bei Neugeborenen, Säuglingen, Kleinkindern und Kindern bis zum 12. Lebensjahr"
                        },
                        {
                            "seq" : "31011",
                            "hint" : "Operationsvorbereitung für Eingriffe bei Jugendlichen und Erwachsenen bis zum vollendeten 40. Lebensjahr"
                        },
                        {
                            "seq" : "31012",
                            "hint" : "Operationsvorbereitung bei Eingriffen bei Patienten nach Vollendung des 40. Lj"
                        },
                        {
                            "seq" : "31013",
                            "hint" : "Operationsvorbereitung bei Patienten nach Vollendung des 60. Lebensjahres"
                        }
                    ]
                },
                {
                    "value" : "1",
                    "unit" : "6",
                    "gnr" : [
                        {
                            "seq" : "08535",
                            "hint" : "Stimulationsbehandlung zur In-Vitro-Fertilisation (IVF), Intracytoplasmatischen Spermieninjektion (ICSI) oder zum intratubaren Gametentransfer (GIFT)"
                        },
                        {
                            "seq" : "08550",
                            "hint" : "Extrakorporale Befruchtung mit natürlicher Eizell-Spermien-Interaktion (In-vitro-Fertilisation (IVF)), inklusive Kultivierung bis zum Embryonentransfer (ET)"
                        },
                        {
                            "seq" : "08551",
                            "hint" : "Maßnahmen zur In-vitro-Fertilisation (IVF) entsprechend der Gebührenordnungsposition 08550 bis zum Ausbleiben der Zellteilung"
                        },
                        {
                            "seq" : "08552",
                            "hint" : "Maßnahmen zur In-vitro-Fertilisation (IVF) entsprechend der Gebührenordnungspositionen 08550 bzw. 08560 bis frühestens zwei Tage vor der geplanten Follikelpunktion"
                        },
                        {
                            "seq" : "08555",
                            "hint" : "Extrakorporale Befruchtung mittels intrazytoplasmatischer Spermieninjektion (ICSI)"
                        },
                        {
                            "seq" : "08558",
                            "hint" : "Embryo-Transfer (ET), ggf. als Zygotentransfer und/oder als intratubarer Embryo-Transfer (EIFT) oder intratubarer Gameten-Transfer (GIFT)"
                        },
                        {
                            "seq" : "08560",
                            "hint" : "IVF einschl. ICSI mit anschließendem Embryo-Transfer (ET)"
                        },
                        {
                            "seq" : "08561",
                            "hint" : "IVF einschl. ICSI bis zum Ausbleiben der Zellteilung"
                        }
                    ]
                },
                {
                    "value" : "1",
                    "unit" : "7",
                    "gnr" : [
                        {
                            "seq" : "40100",
                            "hint" : "Versandmaterial, Transport, Ergebnisübermittlung (Labor, Zytologie, Zyto- und Molekulargenetik)"
                        }
                    ]
                }
            ],
            "bewertung_liste" : [
                {
                    "value" : "19.40",
                    "unit" : "Euro",
                    "leistungserbringerart" : "1"
                },
                {
                    "value" : "19.40",
                    "unit" : "Euro",
                    "leistungserbringerart" : "2"
                }
            ]
        },
        "code" : "32097",
        "actualPrice" : 19.4,
        "unit" : "Euro",
        "actualUnit" : "Euro"
    },
    {
        "_id" : ObjectId("603d3adfd045b5ea0b222038"),
        "price" : 22.81,
        "billingFactorValue" : "0.111244",
        "catalog" : true,
        "u_extra" : {
            "validfrom" : "2012-01-01..",
            "quittungstext" : "Diagnostik des Tinnitus",
            "leistungserbringerart" : "1",
            "leistungsgruppe" : "8",
            "asvQualifications" : [
                "HALS_NASEN_OHRENHEILKUNDE"
            ],
            "kv" : {
                "kv" : "51",
                "arztpraxis" : true,
                "kv_bewertung" : [
                    {
                        "value" : "205",
                        "unit" : "Punkte",
                        "leistungserbringerart" : "1"
                    },
                    {
                        "value" : "22.81",
                        "unit" : "Euro",
                        "leistungserbringerart" : "1",
                        "versorgungsgebiet" : "1"
                    },
                    {
                        "value" : "205",
                        "unit" : "Punkte",
                        "leistungserbringerart" : "2"
                    },
                    {
                        "value" : "22.81",
                        "unit" : "Euro",
                        "leistungserbringerart" : "2",
                        "versorgungsgebiet" : "1"
                    }
                ]
            },
            "gkv_kontenart" : [
                {
                    "gkv_kontenart" : "400"
                },
                {
                    "gkv_kontenart" : "408"
                },
                {
                    "gkv_kontenart" : "409"
                },
                {
                    "gkv_kontenart" : "463"
                },
                {
                    "gkv_kontenart" : "570"
                }
            ],
            "fachgruppe_liste" : {
                "zulaessig" : true,
                "liste" : [
                    {
                        "versorgungsbereich" : "2",
                        "fachgruppe" : [
                            "060",
                            "061",
                            "062"
                        ]
                    }
                ]
            },
            "berichtspflicht" : false,
            "genehmigungspflicht" : false,
            "aop_115b" : false,
            "begruendungen_liste" : {
                "ops_liste" : [ ],
                "ops_liste_include" : null,
                "icd_liste" : [ ],
                "gnr_liste" : [ ]
            },
            "anzahlbedingung_liste" : [
                {
                    "bezugsraum" : {
                        "anzahl" : "1",
                        "value" : "1",
                        "unit" : "7",
                        "aussetzungsgrund_liste" : [ ],
                        "altersbedingung_liste" : [ ]
                    }
                }
            ],
            "ausschluss_liste" : [
                {
                    "value" : "1",
                    "unit" : "2",
                    "gnr" : [
                        {
                            "seq" : "09321",
                            "hint" : "Zuschlag Sprachaudiometrie"
                        },
                        {
                            "seq" : "20321",
                            "hint" : "Zuschlag Sprachaudiometrie"
                        }
                    ]
                },
                {
                    "value" : "1",
                    "unit" : "7",
                    "gnr" : [
                        {
                            "seq" : "20343",
                            "hint" : "Zusatzpauschale bei der Diagnostik des Tinnitus"
                        }
                    ]
                }
            ],
            "zeitbedarfsliste" : [
                {
                    "zeitbedarf" : "16",
                    "leistung_typ" : "AL"
                }
            ],
            "pruefzeit" : {
                "quartal" : 13
            },
            "bewertung_liste" : [
                {
                    "value" : "205",
                    "unit" : "Punkte",
                    "leistungserbringerart" : "1"
                },
                {
                    "value" : "22.81",
                    "unit" : "Euro",
                    "leistungserbringerart" : "1",
                    "versorgungsgebiet" : "1"
                },
                {
                    "value" : "205",
                    "unit" : "Punkte",
                    "leistungserbringerart" : "2"
                },
                {
                    "value" : "22.81",
                    "unit" : "Euro",
                    "leistungserbringerart" : "2",
                    "versorgungsgebiet" : "1"
                }
            ]
        },
        "code" : "09343",
        "actualPrice" : 205,
        "unit" : "Euro",
        "actualUnit" : "Punkte"
    },
    {
        "_id" : ObjectId("603d3ac6a8f2bbea04552745"),
        "price" : 8.34,
        "billingFactorValue" : "0.111244",
        "catalog" : true,
        "u_extra" : {
            "validfrom" : "2017-04-01..",
            "quittungstext" : "Hämoglobin im Stuhl, immunologisch",
            "leistungserbringerart" : "1",
            "leistungsgruppe" : "6",
            "kv" : {
                "kv" : "51",
                "arztpraxis" : true,
                "kv_bewertung" : [
                    {
                        "value" : "75",
                        "unit" : "Punkte",
                        "leistungserbringerart" : "1"
                    },
                    {
                        "value" : "8.34",
                        "unit" : "Euro",
                        "leistungserbringerart" : "1",
                        "versorgungsgebiet" : "1"
                    }
                ]
            },
            "gkv_kontenart" : [
                {
                    "gkv_kontenart" : "408"
                },
                {
                    "gkv_kontenart" : "409"
                },
                {
                    "gkv_kontenart" : "463"
                },
                {
                    "gkv_kontenart" : "521"
                },
                {
                    "gkv_kontenart" : "570"
                }
            ],
            "fachgruppe_liste" : {
                "zulaessig" : true,
                "liste" : [
                    {
                        "versorgungsbereich" : "2",
                        "fachgruppe" : [
                            "110",
                            "111",
                            "112",
                            "303",
                            "357",
                            "501",
                            "532",
                            "566"
                        ]
                    }
                ]
            },
            "berichtspflicht" : false,
            "genehmigungspflicht" : true,
            "aop_115b" : false,
            "begruendungen_liste" : {
                "ops_liste" : [ ],
                "ops_liste_include" : null,
                "icd_liste" : [ ],
                "gnr_liste" : [ ]
            },
            "altersbedingung_liste" : [
                {
                    "value" : "50",
                    "unit" : "8",
                    "type" : "MIN"
                }
            ],
            "anzahlbedingung_liste" : [
                {
                    "bezugsraum" : {
                        "anzahl" : "1",
                        "value" : "2",
                        "unit" : "12",
                        "aussetzungsgrund_liste" : [ ],
                        "altersbedingung_liste" : [
                            {
                                "value" : "55",
                                "unit" : "8",
                                "type" : "MIN"
                            }
                        ]
                    }
                },
                {
                    "bezugsraum" : {
                        "anzahl" : "1",
                        "value" : "1",
                        "unit" : "12",
                        "aussetzungsgrund_liste" : [ ],
                        "altersbedingung_liste" : [
                            {
                                "value" : "50",
                                "unit" : "8",
                                "type" : "MIN"
                            },
                            {
                                "value" : "54",
                                "unit" : "8",
                                "type" : "MAX"
                            }
                        ]
                    }
                }
            ],
            "ausschluss_liste" : [
                {
                    "value" : "1",
                    "unit" : "7",
                    "gnr" : [
                        {
                            "seq" : "05220",
                            "hint" : "Zuschlag für die anästhesiologische Grundversorgung"
                        },
                        {
                            "seq" : "05222",
                            "hint" : "Zuschlag zur GOP 05220"
                        },
                        {
                            "seq" : "06220",
                            "hint" : "Zuschlag für die augenärztliche Grundversorgung"
                        },
                        {
                            "seq" : "06222",
                            "hint" : "Zuschlag zur GOP 06220"
                        },
                        {
                            "seq" : "07220",
                            "hint" : "Zuschlag für die chirurgische Grundversorgung"
                        },
                        {
                            "seq" : "07222",
                            "hint" : "Zuschlag zur GOP 07220"
                        },
                        {
                            "seq" : "08220",
                            "hint" : "Zuschlag für die gynäkologische Grundversorgung"
                        },
                        {
                            "seq" : "08222",
                            "hint" : "Zuschlag zur GOP 08220"
                        },
                        {
                            "seq" : "09220",
                            "hint" : "Zuschlag für die Hals-Nasen-Ohrenärztliche Grundversorgung"
                        },
                        {
                            "seq" : "09222",
                            "hint" : "Zuschlag zur GOP 09220"
                        },
                        {
                            "seq" : "10220",
                            "hint" : "Zuschlag für die hautärztliche Grundversorgung"
                        },
                        {
                            "seq" : "10222",
                            "hint" : "Zuschlag zur GOP 10220"
                        },
                        {
                            "seq" : "13220",
                            "hint" : "Zuschlag für die allgemeine internistische Grundversorgung"
                        },
                        {
                            "seq" : "13222",
                            "hint" : "Zuschlag zur GOP 13220"
                        },
                        {
                            "seq" : "13294",
                            "hint" : "Zuschlag für die angiologisch-internistische Grundversorgung"
                        },
                        {
                            "seq" : "13296",
                            "hint" : "Zuschlag zur GOP 13294"
                        },
                        {
                            "seq" : "13344",
                            "hint" : "Zuschlag für die endokrinologisch-internistische Grundversorgung"
                        },
                        {
                            "seq" : "13346",
                            "hint" : "Zuschlag zur GOP 13344"
                        },
                        {
                            "seq" : "13394",
                            "hint" : "Zuschlag für die gastroenterologisch-internistische Grundversorgung"
                        },
                        {
                            "seq" : "13396",
                            "hint" : "Zuschlag zur GOP 13394"
                        },
                        {
                            "seq" : "13494",
                            "hint" : "Zuschlag für die hämato-/onkologisch-internistische Grundversorgung"
                        },
                        {
                            "seq" : "13496",
                            "hint" : "Zuschlag zur GOP 13494"
                        },
                        {
                            "seq" : "13543",
                            "hint" : "Zuschlag für die kardiologisch-internistische Grundversorgung"
                        },
                        {
                            "seq" : "13544",
                            "hint" : "Zuschlag zur GOP 13543"
                        },
                        {
                            "seq" : "13594",
                            "hint" : "Zuschlag für die nephrologisch-internistische Grundversorgung"
                        },
                        {
                            "seq" : "13596",
                            "hint" : "Zuschlag zu der GOP 13594"
                        },
                        {
                            "seq" : "13644",
                            "hint" : "Zuschlag für die pneumologisch-internistische Grundversorgung"
                        },
                        {
                            "seq" : "13646",
                            "hint" : "Zuschlag zur GOP 13644"
                        },
                        {
                            "seq" : "13694",
                            "hint" : "Zuschlag für die rheumatologisch-internistische Grundversorgung"
                        },
                        {
                            "seq" : "13696",
                            "hint" : "Zuschlag zur GOP 13694"
                        },
                        {
                            "seq" : "14214",
                            "hint" : "Zuschlag für die kinder- und jugendpsychiatrische Grundversorgung"
                        },
                        {
                            "seq" : "14216",
                            "hint" : "Zuschlag zur GOP 14214"
                        },
                        {
                            "seq" : "16215",
                            "hint" : "Zuschlag für die neurologische Grundversorgung"
                        },
                        {
                            "seq" : "16217",
                            "hint" : "Zuschlag zur GOP 16215"
                        },
                        {
                            "seq" : "18220",
                            "hint" : "Zuschlag für die orthopädische Grundversorgung"
                        },
                        {
                            "seq" : "18222",
                            "hint" : "Zuschlag zur GOP 18220"
                        },
                        {
                            "seq" : "20220",
                            "hint" : "Zuschlag für die phoniatrisch-pädaudiologische Grundversorgung"
                        },
                        {
                            "seq" : "20222",
                            "hint" : "Zuschlag zur GOP 20220"
                        },
                        {
                            "seq" : "21218",
                            "hint" : "Zuschlag für die psychiatrische Grundversorgung"
                        },
                        {
                            "seq" : "21219",
                            "hint" : "Zuschlag zur GOP 21218"
                        },
                        {
                            "seq" : "21225",
                            "hint" : "Zuschlag für die nervenheilkundliche Grundversorgung"
                        },
                        {
                            "seq" : "21226",
                            "hint" : "Zuschlag zur GOP 21225"
                        },
                        {
                            "seq" : "22216",
                            "hint" : "Zuschlag für die psychotherapeutisch-medizinische Grundversorgung"
                        },
                        {
                            "seq" : "22218",
                            "hint" : "Zuschlag zur GOP 22216"
                        },
                        {
                            "seq" : "23216",
                            "hint" : "Zuschlag für die psychotherapeutische Grundversorgung"
                        },
                        {
                            "seq" : "23218",
                            "hint" : "Zuschlag zur GOP 23216"
                        },
                        {
                            "seq" : "26220",
                            "hint" : "Zuschlag für die urologische Grundversorgung"
                        },
                        {
                            "seq" : "26222",
                            "hint" : "Zuschlag zur GOP 26220"
                        },
                        {
                            "seq" : "27220",
                            "hint" : "Zuschlag für die physikalisch rehabilitative Grundversorgung"
                        },
                        {
                            "seq" : "27222",
                            "hint" : "Zuschlag zur GOP 27220"
                        },
                        {
                            "seq" : "32457",
                            "hint" : "Quantitative immunologische Bestimmung von occultem Blut im Stuhl (iFOBT)"
                        }
                    ]
                }
            ],
            "pfg_ausschluss" : true,
            "bewertung_liste" : [
                {
                    "value" : "75",
                    "unit" : "Punkte",
                    "leistungserbringerart" : "1"
                },
                {
                    "value" : "8.34",
                    "unit" : "Euro",
                    "leistungserbringerart" : "1",
                    "versorgungsgebiet" : "1"
                }
            ]
        },
        "code" : "01738",
        "actualPrice" : 75,
        "unit" : "Euro",
        "actualUnit" : "Punkte"
    }
];

var iDate = ISODate("2021-01-01T00:00:00.000Z");
updatelist.forEach(x=>{
    var result = db.activities.updateMany({timestamp:{$gt:iDate}, code:x.code, price:{ $ne: x.price } }, {$set: {
            billingFactorValue: x.billingFactorValue, u_extra: x.u_extra, price: x.price, actualPrice: x.actualPrice, unit: x.unit, actualUnit: x.actualUnit
        }});
    printjson(result);
    }
);


// ------------------------------------
//   Section V   Fix housecatalog
//
//          Assume only EBM,   corrected previously,   5 digit non-EBM must be deleted.
//
// ------------------------------------
/*sometimes there are not completely broken entries, that cannot be fixed, you can see these "errPrices" here:*/



var toBeCorrected = db.SUP39912_delete_Apr_21.distinct("code");
toBeCorrected.length;

db.catalogusages.remove({seq: /^\d{5}$/, catalogShort:{$ne:"EBM"}});

var errHK = [];
var totalModifiedHK = 0;
function genericFixHouseCatalog( code ) {
    var correctRS =  db.activities.find({code:code,timestamp:{$gt:iDate}, billingFactorValue:"0.111244", catalog:true});
    if(!correctRS.hasNext()) {
        errHK.push(code);
        return print(`${code}  !!!!!! NO CORRECT HK RECORD FOUND `)
    }
    var correctActivity = correctRS.next();
    print( `billingFactorValue: seq: ${code} ${correctActivity.billingFactorValue}, price: ${correctActivity.price}, actualPrice: ${correctActivity.actualPrice}, unit: ${correctActivity.unit}, actualUnit: ${correctActivity.actualUnit}` );
     /*correct the activities*/
    var result = db.catalogusages.updateMany({seq:code }, {$set: {
        catalog:true,
            billingFactorValue: correctActivity.billingFactorValue, u_extra: correctActivity.u_extra, price: correctActivity.price, unit: correctActivity.unit, value: correctActivity.actualUnit
        }});
    printjson(result);
    totalModifiedHK += result.modifiedCount;
}

toBeCorrected.forEach( x => genericFixHouseCatalog( x ));
totalModifiedHK;

/*mop up*/
db.catalogusages.updateMany({seq: /^\d{5}$/},{$set:{catalog:true, unit: "bewertung_liste",value:"bewertung_liste"}});
db.catalogusages.updateMany({seq: /^\d{5}$/},{$unset:{actualPrice:1,actualUnit:1}});
