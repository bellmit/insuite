/*global db:true*/


"use strict";

// AGGREGATION - 1 : statistics of GNR codes per doctor and BS-location
db.invoiceentries.aggregate(
    [
        {$match: {"type": "schein"}}, {
        $project: {
            "data.treatments": 1,
            st: "$data.scheinType",
            quarter: "$data.quarter"
        }
    }, {$unwind: "$data.treatments"}, {
        $project: {
            bsnr: "$data.treatments._bsnr",
            lanr: "$data.treatments._lanr",
            code: "$data.treatments.code",
            st: 1,
            quarter: 1
        }
    }, {
        $group: {
            _id: {
                bsnr: "$bsnr", lanr: "$lanr", st: "$st", code: "$code"
            },
            codes: {
                $sum: 1
            }
        }
    }, {
        $sort: {
            "_id.bsnr": 1,
            "_id.lanr": 1
        }
    }, {
        $out: "201503GNRStats"
    }
    ] );

// AGGREGATION 2 - sammelerklaerung feeschedules
db.invoiceentries.aggregate(
    [
        {$match: {"type": "schein"}}, {
        $project: {
            bsnr: "$data.treatments._bsnr",
            feeSchedule: "$data.patient.insuranceStatus.feeSchedule"
        }
    },{
        $unwind:"$bsnr"
    }, {
        $group:{_id:"$_id",bsnr:{$first:"$bsnr"},feeSchedule:{$first:"$feeSchedule"}}
    },

        {
            $unwind:"$feeSchedule"
        },{
        $group: {
            _id: {
                bsnr: "$bsnr", fee: "$feeSchedule"
            },
            count: {
                $sum: 1
            }
        }
    }, {
        $sort: {
            "_id.bsnr": 1
        }
    }, {
        $out: "201503Sammelerklaerung"
    }
    ] );


//db = db.getSiblingDB( "4795c10b0000" );
db = db.getSiblingDB( "6376776a444" );
var db0 = db.getSiblingDB( "0" );

db.patients.update({"insuranceStatus.0.feeSchedule":"1"},{$set:{"insuranceStatus.0.ktGruppe":"Primärkasse"}},{multi:true});
db.patients.update({"insuranceStatus.0.feeSchedule":"2"},{$set:{"insuranceStatus.0.ktGruppe":"Ersatzkasse"}},{multi:true});
var rs = db.patients.find(),
    iknrs = [];
rs.forEach(function (next){
    var rs2,
        iknr = next.insuranceStatus && next.insuranceStatus[0] && next.insuranceStatus[0].insuranceId;

    if(iknr && iknrs.indexOf(iknr)) {
        iknrs.push(iknr);
        rs2 = db0.catalogs.find({
            catalog:'DC-SDKT-D-1438701564556.json',
            ktab:"00",
            "kostentraegergruppeId" : {$gt:"19"},
            iknr: iknr });
        if( rs2.count() ) {
            print( 'updating sonstige kt on patients with iknr = ' + iknr );
            db.patients.update( {"insuranceStatus.0.insuranceId": iknr}, {$set: {"insuranceStatus.0.ktGruppe": "Sonstige Kostenträger"}}, {multi: true} );
        }
    }
});

db['62d1'].find().forEach( a => {
    db.activities.find( {patientId: a.patientIdOld} ).forEach( b => {
        db.SUP24724.insert( b );
    } );
    db.activities.update( {patientId: a.patientIdOld}, {$set:{ patientId: a.patientIdNew }}, {multi:true});
});



/*

db.patients.update({"insuranceStatus.0.employeeId":'999999999'},{$set:{"insuranceStatus.0.employeeId":"5cb045db3d104b7ffb448b51"}},{multi:true})
db.patients.update({"insuranceStatus.1.employeeId":'999999999'},{$set:{"insuranceStatus.1.employeeId":"5cb045db3d104b7ffb448b51"}},{multi:true})
db.patients.update({"insuranceStatus.2.employeeId":'999999999'},{$set:{"insuranceStatus.2.employeeId":"5cb045db3d104b7ffb448b51"}},{multi:true})
db.patients.update({"insuranceStatus.3.employeeId":'999999999'},{$set:{"insuranceStatus.3.employeeId":"5cb045db3d104b7ffb448b51"}},{multi:true})

FeeSchedule Warning Problem




db.kbvlogs.aggregate(
    [
        {$match:{quarter:4}},
        {$unwind:"$warnings"},
        {$match:{"warnings.code":{$regex:/KVDT-R210/}}},
        {$project:{link:"$warnings.link"}}
    ]
);



db.activities.aggregate([{$match: {_id: {$in:
    [
ObjectId("5657ac077bbb47ed0e758232"),
ObjectId("5657ad3691db27f30e24fee5"),
ObjectId("5657ad94f06294ef0edad3ae"),
ObjectId("5657ada3176bc9eb0ec03cb7"),
ObjectId("5657ada4f06294ef0edad40c"),
ObjectId("56581a81f06294ef0edae142"),
ObjectId("5657ae4003fac0f10e85ef94"),
ObjectId("5657ae4c4bd791e60ea04d86"),
ObjectId("56580d3f8ed654e20e5ab5b9"),
ObjectId("5658fd61f06294ef0edae1db"),
ObjectId("565cf2854bd791e60ea04f98"),
ObjectId("566a21ce8ed654e20e5ab99e"),
ObjectId("566b734703fac0f10e85f710"),
ObjectId("566f66597bbb47ed0e7597df"),
ObjectId("566f67d5f06294ef0edaee32"),
ObjectId("56720a96f06294ef0edaef83"),
ObjectId("56735c824bd791e60ea050b5"),
ObjectId("5674ac2d7bbb47ed0e7599aa"),
ObjectId("5674ac3e7bbb47ed0e7599bc"),
ObjectId("5678a17c7bbb47ed0e759af3"),
ObjectId("5678a221f06294ef0edaf456"),
ObjectId("561461431416d8e2583e16c8"),
ObjectId("56170485e7c458b9457cbf10"),
ObjectId("56185637dd14d2014620ef80"),
ObjectId("562191dd23f78b9d585f9f1a"),
ObjectId("56580e7603fac0f10e85f186"),
ObjectId("5658186e7bbb47ed0e758f6a"),
ObjectId("5657ab9bf06294ef0edac63f"),
ObjectId("5657aba9f06294ef0edac677"),
ObjectId("5657abdef06294ef0edac7e6")]   }}
},
    {
        $project: {patientId:true}
    }],
    {
        $group: {patientId:1}
    }
);

db.patients.find( { _id: {$in:
    [
ObjectId("561461424d24be5958909553"),
ObjectId("561704859dccfce7581639b6"),
ObjectId("56185637dd14d2014620ef77"),
ObjectId("562191dddd14d2014620f599"),
ObjectId("5657ab9b8ed654e20e5ab131"),
ObjectId("5657aba9f06294ef0edac66f"),
ObjectId("5657abdef06294ef0edac7de"),
ObjectId("5657ac0670d67ade0e3674c4"),
ObjectId("5657ad36f06294ef0edad23b"),
ObjectId("5657ad938ed654e20e5ab458"),
ObjectId("5657ada3f06294ef0edad404"),
ObjectId("5657ae3f7bbb47ed0e758a20"),
ObjectId("5657ae4cf06294ef0edad6a6"),
ObjectId("56580d3f03fac0f10e85f01a"),
ObjectId("562191dddd14d2014620f599"),
ObjectId("5657ab27f06294ef0edac1f8"),
ObjectId("5657ade8f06294ef0edad54a"),
ObjectId("5658fd6091db27f30e250166"),
ObjectId("565cf285f06294ef0edae304"),
ObjectId("566a21cdf06294ef0edaebf5"),
ObjectId("566b7347176bc9eb0ec03deb"),
ObjectId("566f6659f06294ef0edaedbe"),
ObjectId("566f67d57bbb47ed0e759817"),
ObjectId("56720a96f06294ef0edaef7b"),
ObjectId("56735c828ed654e20e5abac8"),
ObjectId("5674ac2d8ed654e20e5abb39"),
ObjectId("5674ac3ef06294ef0edaf100"),
ObjectId("5678a17cf06294ef0edaf382"),
ObjectId("5678a220f06294ef0edaf44f")
    ]}}, {}

);

db.patientversions.find( { patientId: {$in:
    [
"561461424d24be5958909553",
"561704859dccfce7581639b6",
"56185637dd14d2014620ef77",
"562191dddd14d2014620f599",
"5657ab9b8ed654e20e5ab131",
"5657aba9f06294ef0edac66f",
"5657abdef06294ef0edac7de",
"5657ac0670d67ade0e3674c4",
"5657ad36f06294ef0edad23b",
"5657ad938ed654e20e5ab458",
"5657ada3f06294ef0edad404",
"5657ae3f7bbb47ed0e758a20",
"5657ae4cf06294ef0edad6a6",
"56580d3f03fac0f10e85f01a",
"562191dddd14d2014620f599",
"5657ab27f06294ef0edac1f8",
"5657ade8f06294ef0edad54a",
"5658fd6091db27f30e250166",
"565cf285f06294ef0edae304",
"566a21cdf06294ef0edaebf5",
"566b7347176bc9eb0ec03deb",
"566f6659f06294ef0edaedbe",
"566f67d57bbb47ed0e759817",
"56720a96f06294ef0edaef7b",
"56735c828ed654e20e5abac8",
"5674ac2d8ed654e20e5abb39",
"5674ac3ef06294ef0edaf100",
"5678a17cf06294ef0edaf382",
"5678a220f06294ef0edaf44f"
    ]}}, {}

);

*/