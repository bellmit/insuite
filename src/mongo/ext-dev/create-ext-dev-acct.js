/**
 * User: mkramp
 * Date: 5/28/20  3:50 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global db, ObjectId */

var
    data,
    currentDate = new Date().toISOString();

data = db.employees.insertOne(
    {
        title: "",
        firstname: "ext",
        nameaffix: "",
        middlename: "",
        fk3120: "",
        lastname: "dev",
        specialities: [],
        specialisationText: "",
        asvTeamNumbers: [],
        asvSpecializations: [],
        asvMembershipType: "FULL",
        arztstempel: "",
        fromLDAP: false,
        roles: [
            "Empfang"
        ],
        preferredLanguage: "",
        currentLocation: "",
        expertise: [],
        bsnrs: [],
        accounts: [],
        communications: [
            {
                signaling: true,
                confirmed: true,
                confirmNeeded: false,
                _id: new ObjectId(),
                type: "EMAILPRIV",
                preferred: true,
                value: "ext-dev@doc-cirrus.com"
            }
        ],
        addresses: [],
        type: "OTHER",
        talk: "NONE",
        username: "ext-dev",
        memberOf: [
            {group: "ADMIN"}
        ],
        status: "ACTIVE",
        dob: currentDate,
        initials: "ED",
        countryMode: [
            "D"
        ],
        qualiDignities: [],
        quantiDignities: []
    }
);

if( data.acknowledged && data.insertedId ) {
    data = db.identities.insertOne(
        {
            cardKey: "",
            roles: [
                "Empfang"
            ],
            preferredLanguage: "",
            currentLocation: "",
            labdataSortOrder: "",
            signaling: true,
            status: "ACTIVE",
            partnerIds: [],
            username: "ext-dev",
            memberOf: [
                {group: "ADMIN"}
            ],
            locations: [],
            firstname: "ext",
            lastname: "dev",
            pwResetToken: "",
            lastChanged: currentDate,
            specifiedBy: data.insertedId.valueOf(),
            //X123123
            pw: "$2$rwt9ab354myo6076345de24d4c9c75c5d878c88c750ba1278409a2502cb4655c50777da561d4dbfecf9300d2a2ee380a92492fd6af586a8c6c87f90566983b816aeab2de0672"
        }
    );
    if( data.acknowledged && data.insertedId ) {
        print( "Created ext-dev account" );
    } else {
        print( "Failed creating ext-dev IDENTITY" );
    }
} else {
    print( "Failed creating ext-dev EMPLOYEE" );
}

