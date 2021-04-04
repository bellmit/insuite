/* global db:true */

print( '==== FIXING CATALOG FOR TARMED MOJ-14384 ====' );
db = db.getSiblingDB( "0" );

const tarmedActivitiesQuery = {
    timestamp: {
        $gte: new Date("2020-06-01T00:00:00.000Z"),
        $lt: new Date()
    },
    catalogShort: {
        $in: ['TARMED', 'TARMED_UVG_IVG_MVG']
    },
    catalogRef: {$exists: true},
    code: /^\d{2}\.\d{4}$/,
    catalog: false
};

const result = db.activities.update( tarmedActivitiesQuery, {$set: {catalog: true}}, {multi: true} );

if (result && result.nModified) {
    print( `---- \`${result.nModified} TARMED activities updated! ----` );
}
else {
    print( '---- No TARMED activities with catalog: false found! ----' );
}

print( '==== CATALOG FOR TARMED MOJ-14384 FIX FINISHED! ====' );