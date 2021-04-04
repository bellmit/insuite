/**
 * User: mkramp
 * Date: 6/3/20  8:54 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, print, printjsononeline */

var query = {
    labRequestRef: {
        $exists: true
    },
    actType: "TREATMENT",
    catalogShort: {$ne: "GOÄ"},
    price: {
        $gt: 0,
        $type: "int"
    },
    status: {$in: ["VALID", "CREATED", "APPROVED"]},
    catalog: false
};

//print backup data
db.activities.find( query, {price: 1} ).forEach( function( elem ) {
    printjsononeline( elem );
} );

print(
    db.activities.update(
        query,
        {
            $mul: {price: 1 / 100}
        },
        {
            multi: true
        }
    )
);
