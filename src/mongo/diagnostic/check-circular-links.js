/* script to check for circular links in activity references */
/* global db, ObjectId */
function checkCircularLinks( act, parents, pathTxt ) {
    if ( !act._id ) {
        print( `[!] invalid activity: ${JSON.stringify(act, undefined, 2)}` );
        return;
    }
    if (!parents) { parents = []; }

    pathTxt = pathTxt || '';
    pathTxt = pathTxt + `\n${act._id.valueOf()} ${act.actType} ${act.status}`;
    if ( act.timestamp ) {
        try {
            pathTxt = `${pathTxt} ${act.timestamp.getFullYear()}-${act.timestamp.getMonth()}-${act.timestamp.getDay()}`;
        } catch (err ) {
            print( `[!] activity has invalid timestamp` );
        }
    }
    let children = act.activities || [];
    if ( act.icds ) { children = children.concat( act.icds ); }
    if ( act.icdsExtra ) { children = children.concat( act.icdsExtra ); }
    if ( act.continuousIcds ) { children = children.concat( act.continuousIcds ); }
    /* */
    if ( -1 !== parents.indexOf( act._id.valueOf() ) ) {
        print( `[!] circular reference in linked activities ${act._id.valueOf()} is in parents ${JSON.stringify(parents)}` );
        print( `[!] path of circular references: ${pathTxt}` );
        return;
    }
    /* */
    let childrenObj = [];
    if ( !Array.isArray( children ) ) {
        print( `[!] invalid array of child activities: ${JSON.stringify(children)}` );
        return;
    }
    children.forEach( function( childId ) {
        let childObj;
        try {
            childObj = db.activities.findOne({_id:ObjectId(childId)});
        } catch ( err ) {
            print(`[i] invalid link from ${act._id.valueOf()} to ${childId}`);
            return;
        }
        if ( childObj ) {
            childrenObj.push( childObj );
        } else {
            print(`[i] link from ${act._id.valueOf()} to missing activity ${childId}`);
        }
    } );
    /* recursively follow link into child activities */
    parents.push( act._id.valueOf() );
    childrenObj.forEach( function( childObj ) {
        checkCircularLinks( childObj, [...parents], pathTxt );
    } );
}
db.activities.find().sort({timestamp: -1}).forEach( checkCircularLinks );

