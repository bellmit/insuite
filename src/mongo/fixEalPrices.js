
/* global db:true */

print( '==== FIXING EAL PRICES MOJ-13927 ====' );
db = db.getSiblingDB( "0" );

const ealActivitiesQuery = {
    timestamp: {
        $gte: new Date("2020-06-01T00:00:00.000Z"),
        $lt: new Date()
    },
    catalogShort: 'EAL',
    price: 0.01
}, distinctCodes = [];

const ealActivities = db.activities.find( ealActivitiesQuery ).toArray();

if(!ealActivities.length) {                                       
    print( '==== No EAL activities with price 0.01 found! ====' );
}
ealActivities.forEach( activity => {
    if( !distinctCodes.find( code => code === activity.code ) ) {
        distinctCodes.push( activity.code );
    }
} );

const catalogEntries = db.catalogs.find( {seq: {$in: distinctCodes}, catalog: {$regex: /DC-EAL-CH/}}).toArray();

distinctCodes.forEach( code => {
    const activityIds = ealActivities.filter( a => a.code === code ).map( a => a._id ),
        appropriateCatalogEntry = catalogEntries.find( entry => entry.seq === code ),
        price = appropriateCatalogEntry.taxPoints;
    db.activities.update({_id: {$in: activityIds}}, {$set: {price}}, {multi: true});
    print( `==== updated ${activityIds.length} activities with code ${code} ====` );
});
print( '==== EAL ACTIVITIES FIX FINISHED! ====' );