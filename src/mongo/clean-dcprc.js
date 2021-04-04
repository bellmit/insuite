/**
 * User: rrrw
 * Date: 16/06/15  10:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
//
// -- iterate through companies, update them and delete the relevant databases --
// this script was run successfully on PRODVPRC on 18.6.2015.
//
/*global db:true, ObjectId*/
"use strict";

// make sure we are in local tenant
db = db.getSiblingDB( "0" );

var
    toDelete = [],
    blacklisted = [
        "1001",
        "1250",
        "1125",
        "1349",
        "1488",
        "1346",
        "1547",
        "1363",
        "1335",
        "1498",
        "1321",
        "1546",
        "1497",
        "1512",
        "1415",
        "1290",
        "1364",
        "1496",
        "1438",
        "1012",
        "1583",
        "1513",
        "1325",
        "1416",
        "1017",
        "0000",
        "1350",
        "1119",
        "1530",
        "1489",
        "1571",
        "1572",
        "1579",
        "1581"

    ];
//rs = db.companies.find({dcCustomerNo:{$nin:blacklisted},"prodServices.to":{$lt:ISODate("2015-05-20T00:00:00Z")}});
var rs = db.companies.find(
    {
        dcCustomerNo: {$nin: blacklisted},
        activeState:false,
        $and:[{"prodServices.0.to":{$exists:false}},{"prodServices.1.to":{ $type: 10 } },{"prodServices.2.to":null},{"prodServices.3.to":{$exists:false}}],
        deleted: {$ne:true}
    } );
// Iterate through each company and do...
rs.forEach( function iterateCompanies( item ) {
    var outputStr;
    if( -1 < item.tenantId.indexOf('deleted') ) {
        //print( '(' + item.dcCustomerNo + ')' + item.coname + '  already deleted tenant: ' + item.tenantId );
        outputStr = 'ALREADY DELETED --- ';
    } else {
        print( '(' + item.dcCustomerNo + ')' + item.coname + ' deleting tenant: ' + item.tenantId );
        outputStr = '(' + item.dcCustomerNo + ')' + item.coname + ' deleting tenant: ' + item.tenantId;
        toDelete.push( item.tenantId );
    }
    /*jshint newcap: false*/
    var rsCont = db.contacts.find( {_id: ObjectId( item.centralContact )} );

    rsCont.forEach( function moveContact( contact ) {
        var update = {},
            command = {};
        if( contact.communications ) {
            update.$addToSet = {};
            update.$addToSet.communications = contact.communications;
        }
        update.$set = { deletedName: contact.lastname, deleted: true };
        db.companies.update({_id:item._id},update);
        //print(outputStr + '    ' + JSON.stringify(contact.communications));

        command._id = contact._id;
        //print("db.contacts.remove( "+ JSON.stringify( command ) +" )");
        db.contacts.remove( command );
    } );

} );

// finally iterate toDelete and drop the DBs....
toDelete.forEach( function dropDb(dbName) {
    if(/^([\da-f]){8,15}$/.exec(dbName)) {
        db = db.getSiblingDB( dbName );
        db.dropDatabase();
        print("dropped Database( "+dbName+" );");
    }
} );


//================================================
// METHOD 2




["03e0b82b77",
    "0d97c77811",
    "102b3cb022",
    "13826c0077777",
    "180712ef6666",
    "21b31a0c66",
    "2222222222",
    "2452d7b8333",
    "2492cebd9999",
    "258ce5ac2222",
    "27468fb30000",
    "3015d6be5555",
    "308cb1d6111",
    "30ecf04477",
    "456f1a1788",
    "49acf44e7777",
    "4af13278999",
    "4b3ec1b244",
    "4d26fbb833",
    "5055f9cb44",
    "539cfbf8777",
    "53de7892222",
    "56c6808088",
    "5879f99122",
    "5a9e8dee6666",
    "5b86eae73333",
    "5d032def11",
    "61e9611b55",
    "6604aa58999",
    "67795daa88",
    "7361c22144",
    "809ca744000",
    "8246cd0233",
    "832232431111",
    "874ffb011112",
    "874ffb011113",
    "8f8132ea55",
    "98fb5d2d7777",
    "9c5f7da155",
    "9eb6c41322",
    "a16e81036",
    "a2d74e3166",
    "a5b115e588",
    "a74e94ce3333",
    "abd56df7733",
    "ad4c4ed899",
    "b2ae5d2355",
    "b2d3cc659999",
    "b3124f2d99",
    "ba9db0bb555",
    "bb4989c944",
    "bcd760cd66",
    "be40a9041111",
    "c0de029b7777",
    "cd78639e111",
    "d08fecd37777",
    "d1cb023e22",
    "e109b5836666",
    "e12f584144",
    "e17a1646999",
    "e3beba1444",
    "e55d17295555",
    "e9a60bdf111",
    "e9c1b85855",
    "ea1d5bcb555",
    "f170e4b82222",
    "f46075de999",
    "f8f1a8090000",
    "fb6b8328999"].forEach(function(item){ db = db.getSiblingDB( item ); print( db.dropDatabase() ); });

