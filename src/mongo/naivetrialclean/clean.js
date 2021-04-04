/**
 * Script does the following:
 *
 * * remove all patients
 * * remove all activities
 * * remove all documents
 * * remove all calendars with ID greater than Arztkalender
 * * remove all locations with ID greater than Default location
 * * remove all schedules
 * * remove all repetitions
 * * remove all scheduletypes with ID greater than default
 * * remove all basecontacts
 * * remove all KBV logs
 * * remove all audits
 * * remove all forms
 * * remove all insight2 info
 * * remove all socketio events
 * * create support account and employee
 *
 * Currently employees/identities must be cleaned manually
 *
 */
/*global db, ObjectId, ISODate */

/*jshint strict:false */

function _gt( idStr ) {
    return {_id: {$gt: ObjectId( idStr )}};
}

function _lt( idStr ) {
    return {_id: {$lt: ObjectId( idStr )}};
}

var list = [
    {collection: 'patients'/*, where: _lt( "55a000000000000000000000" ) */},
    {collection: 'patientversions'/*, where: _lt( "55a000000000000000000000" )*/},
    {collection: 'activities'/*, where: _lt( "55a000000000000000000000" )*/},
    {collection: 'casefolders'/*, where: _lt( "55a000000000000000000000" )*/},
    {collection: 'documents'/*, where: _lt( "55a000000000000000000000" )*/},
    {collection: 'kbvlogs'},
    {collection: 'pvslogs'},
    {collection: 'asvlogs'},
    {collection: 'sysnums', where: {_id: ObjectId( "000000000000000000000444" )}},
    {collection: 'invoiceentries'},
    {collection: 'calendars', where: _gt( "515ae9604013671c12c1c900" )},
    {collection: 'scheduletypes', where: _gt( "51b732232e837550c90851fb" )},
    {collection: 'schedules'/*, where: _lt( "54a000000000000000000000" )*/},
    {collection: 'repetitions'/*, where: _lt( "54a000000000000000000000" )*/},
    {collection: 'locations', where: _gt( "000000000000000000000001" )},
    {collection: 'basecontacts'},
    {collection: 'audits'},
    {collection: 'partnerregs'},
    {collection: 'reportings'},
    {collection: 'syncreportings'},
    {collection: 'socketioevents'},
    {collection: 'documentationtrees'},
    {collection: 'markers', where: _lt( "55a000000000000000000000" )},
    {collection: 'catalogusages'}
];

db.physicians_2.drop();

/*
 identities and employees Ids are critical in inTouch.

 That's why we leave things as they are and just delete the dummy information.
 It is easiest with the following two lines:

 (note!  replace  "support@doc-cirrus.com"  with the  "customer@customer.com" address, if present.

 db.identities.remove({username:{$nin:["Support","support@doc-cirrus.com"]}})
 db.employees.remove({username:{$nin:["Support","support@doc-cirrus.com"]}})

 */

/* patients */
// if we have a list of the trial tenant patients, we can do a more focused deletion
// but then we need to check activity patients and document owner ids
// this can be threaded via smart "where" functions in future if required.

list.forEach( function clean( item ) {
    var i, j, msg = item.collection + ':  ';
    i = db[item.collection].count();
    db[item.collection].remove( item.where || {} );
    j = db[item.collection].count();
    print( msg +
           j +
           '  (items deleted: ' +
           (i - j) +
           ')'
    );
} );

var myID, myCursor, wr;

/* Support account creation */
wr = db.employees.insert(
    {
        "username": "Support1",
        "officialNo": "",
        "type": "OTHER",
        "from": ISODate( "2014-11-11T19:31:02.581Z" ),
        "to": null,
        "isSupport": true,
        "employeeNo": "",
        "department": "",
        "dob": ISODate( "2014-11-11T18:32:13.922Z" ),
        "bsnrs": [],
        "talk": "MR",
        "locations": [],
        "specialities": [],
        "addresses": [],
        "communications": [
            {
                "type": "EMAILPRIV",
                "preferred": false,
                "value": "support@doc-cirrus.com",
                "_id": ObjectId( "5462562da423b51c2ef34936" )
            }
        ],
        "prodServices": [],
        "accounts": [],
        "lastname": "Kundendienst",
        "fk3120": "",
        "middlename": "",
        "memberOf": [
            {"group": "ADMIN"},
            {"group": "SUPPORT"}
        ],
        "status": "ACTIVE",
        "nameaffix": "",
        "firstname": "Doc-Cirrus",
        "__v": 0
    } );

if( wr.nInserted ) {
    myCursor = db.employees.find().sort( {_id: -1} );
    myID = myCursor.next()._id.str;
    wr = db.identities.insert(
        {
            "username": "Support1",
            "firstname": "Doc-Cirrus",
            "lastname": "Kundendienst",
            "pwResetToken": "",
            "status": "ACTIVE",
            "specifiedBy": myID,
            "memberOf": [
                {"group": "ADMIN"},
                {"group": "SUPPORT"}
            ],
            "__v": 0,
            /*"pw": "$2$rwt9ab354myo6076345de24d4c9c75c5d878c88c750ba1278409a2502cb4655c50777da561d4dbfecf9300d2a2ee380a92492fd6af586a8c6c87f90566983b816aeab2de0672"*/
            "pw": "$2$8a23feb650db7f319743eeb155be5f2fcf0c9f03a393bfecb47abf9e5bd3cc56b35e6718f5af1b947e58726884c7d9c492d7cb95cc56de7461c633d7116fc10872eba78ba7a5" /*New Prod Password!*/
        } );
    if( wr.nInserted ) {
        print( '\nCreated support account' );
    } else {
        print( '\nFailed creating support IDENTITY' );
    }
} else {
    print( '\nFailed creating support EMPLOYEE' );
}

db.activities.find(
    {
        $and: [
            {
                actType: {$in: ["SCHEIN", "PKVSCHEIN", "SZSCHEIN", "BGSCHEIN"]},
                patientId: "5e00be7c437c670042f4e111",
                timestamp: {$lte: new Date( 1578380226540 )},
                status: {$ne: "CANCELLED"},
                locationId: {$in: [ObjectId( '5dd2c5e0bfac43003fa68575' ), ObjectId( '000000000000000000000001' )]}
            }, {
                $or: [
                    {locationId: {$in: [ObjectId( '5dd2c5e0bfac43003fa68575' ), ObjectId( '000000000000000000000001' )]}}, {locationId: {$exists: false}}, {
                        patientId: {
                            $in: [
                                "5e00b7cf437c6700424e77be", "5e00b7e6437c67004250adef", "5e00b7e8437c67004250d273", "5e00b7e8437c67004250dacc", "5e00b82c437c670042576c2c", "5e00b847437c67004259f98c", "5e12f6c1f3b22a55d821139d", "5e00b848437c6700425a18bc", "5e00b831437c67004257ed19", "5e00b836437c670042587478", "5e00b856437c6700425b73f6", "5e00b87f437c6700425f5227", "5e00b89d437c670042620acc", "5e00b8ad437c670042638232", "5e00b8b0437c67004263daec", "5e00b8b3437c6700426412f8", "5e00b8d8437c670042678c9e", "5e00b8b4437c67004264341b", "5e00b8c1437c670042656481", "5e00b8ca437c670042663052", "5e00b8d6437c6700426754d1", "5e0dfd28c637760bb7da2ea3", "5e00b93b437c670042710bd9", "5e00b93c437c670042711f08", "5e00b943437c67004271aa9f", "5e00b97b437c67004276d3c9", "5e00ba2d437c67004287a2d1", "5e00b9eb437c670042816639", "5e00ba1e437c670042864718", "5e00ba95437c67004291869f", "5e00bac0437c67004295c0d8", "5e00baaf437c670042941c3d", "5e00bab9437c670042951788", "5e00baf1437c6700429a7c89", "5e00bafe437c6700429bc634", "5e00bb06437c6700429c92d4", "5e00bb13437c6700429de041", "5e00bb3c437c670042a1f4ca", "5e134d97f3b22a55d824e7e1", "5e00bbce437c670042b070e9", "5e00bbe2437c670042b25f64", "5e00bbe3437c670042b27463", "5e00bc05437c670042b5db5d", "5e00bc09437c670042b649e6", "5e00bc20437c670042b88ea6", "5e00bc3f437c670042bba7f2", "5e00bc72437c670042c0b13e", "5e00bc65437c670042bf6da7", "5e00b714437c6700423cd106", "5e00b72c437c6700423f162e", "5e00b743437c670042415d4d", "5e00b7d1437c6700424eacde", "5e00b7a6437c6700424aad3d", "5e00bd73437c670042da5739", "5e00bd76437c670042daaba3", "5e00bd78437c670042dad61a", "5e00bda1437c670042df0b8e", "5e00bd9e437c670042dea0ef", "5e00bd9e437c670042deb101", "5e00bda5437c670042df5b4b", "5e00bdc8437c670042e2dae0", "5e00bdc9437c670042e2f11e", "5e135259f3b22a55d82503ce", "5e00be04437c670042e8c4e0", "5e00be0d437c670042e9b0e9", "5e00be0e437c670042e9df62", "5e00be17437c670042eac879", "5e00be1a437c670042eb0342", "5e00be1d437c670042eb5481", "5e00be24437c670042ec0758", "5e00be35437c670042edbff0", "5e00be3c437c670042ee689a", "5e00be4e437c670042f056fa", "5e00be58437c670042f147b9", "5e00be73437c670042f3fdee", "5e00bc86437c670042c2b111", "5e00bca0437c670042c54c7d", "5e00bccc437c670042c9a419", "5e00bd05437c670042cf42d8", "5e00bcee437c670042cd0202", "5e00bd21437c670042d1fe8a", "5e00bd43437c670042d57306", "5e00bd68437c670042d91b98", "5e00bd52437c670042d6f7cf", "5e00bd57437c670042d77652", "5e00be6f437c670042f38e87", "5e00be6a437c670042f32066", "5e00be74437c670042f41103", "5e00be85437c670042f5d518", "5e00be78437c670042f4739e", "5e00be83437c670042f59bd0", "5e00be8d437c670042f69c87", "5e00bea0437c670042f86d7b", "5e00bea4437c670042f8d7da", "5e00bec9437c670042fc7872", "5e00bec3437c670042fbe290", "5e00bed0437c670042fd0a10", "5e00bec3437c670042fbed5f", "5e00bec4437c670042fbf18d", "5e00bed0437c670042fd12b3", "5e00bed1437c670042fd1f2e", "5e00becb437c670042fcab1d", "5e00bed1437c670042fd3013", "5e00bed2437c670042fd34d2", "5e00becd437c670042fcccfe", "5e00becd437c670042fcd611", "5e00bec7437c670042fc3c91", "5e00bed2437c670042fd3daa", "5e00becd437c670042fce0f8", "5e00bec7437c670042fc4db8", "5e00bec8437c670042fc626a", "5e00b888437c6700426036c7", "5e00bae0437c67004298dabf"]
                        }
                    }, {confirmedViewFromOtherLocations: true}]
            }]
    }
);


