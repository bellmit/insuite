/**
 * User: nicolas.pettican
 * Date: 22.07.20  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* eslint-disable no-console */

const
    {MongoClient} = require( 'mongodb' ),
    /* env variables to pass when running the script */
    /* can also be set manually */
    USERNAME = process.env.USERNAME,
    PASSWORD = process.env.PASSWORD,
    ADMIN = process.env.ADMIN,
    dbURL = `mongodb://${USERNAME}:${PASSWORD}@127.0.0.1:27017/0?authSource=${ADMIN}&gssapiServiceName=mongodb`;

if( !USERNAME || !PASSWORD || !ADMIN ) {
    console.log( 'Please add USERNAME, PASSWORD, ADMIN as environment variables, e.g.:\n' +
                 'PROP_ADMIN_USER="admin.user" ' +
                 'PROP_ADMIN_PASSWORD="admin.password" ' +
                 'PROP_ADMIN_AUTH="admin.authdb" ' +
                 'USERNAME=$(dc-mongo-property get "$PROP_ADMIN_USER") ' +
                 'PASSWORD=$(dc-mongo-property get "$PROP_ADMIN_PASSWORD") ' +
                 'ADMIN=$(dc-mongo-property get "$PROP_ADMIN_AUTH") node src/mongo/getDbStats.js' );
}

let error;

function printHeading( msg ) {
    console.log( '---------------------------------------------' );
    console.log( msg );
    console.log( '---------------------------------------------' );
}

function formatPromiseResult( prom ) {
    return prom
        .then( ( result ) => {
            return [null, result];
        } )
        .catch( ( err ) => {
            return [err];
        } );
}

async function createDbConnection() {
    let client;

    console.log( 'Connecting to database' );
    /* Connect to database */
    [error, client] = await formatPromiseResult( MongoClient.connect( dbURL, {useNewUrlParser: true} ) );

    if( error ) {
        console.error( `Error occurred while connecting to mongodb: ${error || JSON.stringify( error, null, 2 )}` );
        process.exit( 1 );
    }

    return client;
}

/**
 * Prints stats about physicians and treatments
 *
 * @param {Object} db mongo client
 * @returns {Promise<void>}
 */
async function getStats( db ) {
    const
        locationsModel = db.collection( 'locations' ),
        employeesModel = db.collection( 'employees' ),
        activitiesModel = db.collection( 'activities' ),
        locationBSNRs = new Map(),
        treatmentsPerPhysician = [];
    let
        locations,
        locationIds = [],
        location,
        physicians,
        physician,
        treatments,
        treatment;

    printHeading( 'Analysing statistics for physicians and treatments' );

    [error, locations] = await formatPromiseResult(
        locationsModel.find( {}, {_id: 1, locname: 1, commercialNo: 1} )
    );

    if( error ) {
        console.warn( `Could not get locations: ${error}` );
        return;
    }

    locations.forEach( ( loc ) => {
        locationIds.push( loc._id );
        locationBSNRs.set( loc._id.toString(), loc.commercialNo );
    } );

    console.log( `Found ${locationIds.length} locations` );

    [error, physicians] = await formatPromiseResult(
        employeesModel.find(
            {type: 'PHYSICIAN', locations: {$elemMatch: {_id: {$in: locationIds.map( ( _id ) => _id.toString() )}}}},
            {_id: 1, locations: 1, lastname: 1, type: 1, status: 1}
        ).toArray()
    );

    if( error ) {
        console.warn( `Could not get physicians: ${error}` );
        return;
    }

    console.log( `Found ${physicians.length} physicians, ${physicians.filter( ( dr ) => dr.status === 'ACTIVE' ).length} active` );

    console.log( '---------------------------------------------' );

    /* log as csv file format */
    console.log( `\nPhysician;PhysicianID;PhysicianStatus;LocationID;LocationBSNR` );
    for( physician of physicians ) {
        if( !physician.locations || !physician.locations.length ) {
            console.log( `${physician.lastname};${physician._id.toString()};${physician.status};;` );
            continue;
        }
        for( location of physician.locations ) {
            console.log( `${physician.lastname};${physician._id.toString()};${physician.status};${location._id};${locationBSNRs.get( location._id )}` );
        }
    }

    console.log( '---------------------------------------------' );

    /* get treatment stats */

    for( physician of physicians ) {
        [error, treatments] = await formatPromiseResult(
            activitiesModel.find(
                {actType: 'TREATMENT', employeeId: physician._id.toString(), locationId: {$in: locationIds}},
                {_id: 1, locationId: 1}
            ).toArray()
        );

        if( error ) {
            console.warn( `Could not get treatments for physician ${physician.lastname} with ID ${physician._id.toString()}: ${error}` );
            continue;
        }

        console.log( `Found ${treatments.length} treatments for physician ${physician.lastname} with ID ${physician._id.toString()}` );

        treatmentsPerPhysician.push( {
            physicianName: physician.lastname,
            physicianId: physician._id.toString(),
            treatments: treatments
        } );
    }

    console.log( '---------------------------------------------' );

    /* log as csv file format */
    console.log( `\nPhysician;PhysicianID;PhysicianStatus;TreatmentID;LocationID;LocationBSNR` );
    for( physician of treatmentsPerPhysician ) {
        if( !physician.treatments || !physician.treatments.length ) {
            console.log( `${physician.lastname};${physician._id.toString()};${physician.status};;;` );
            continue;
        }
        for( treatment of physician.treatments ) {
            console.log( `${physician.lastname};${physician._id.toString()};${physician.status};${treatment._id.toString()};${treatment.locationId.toString()};${locationBSNRs.get( treatment.locationId.toString() )}` );
        }
    }
}

(async () => {
    const dbClient = await createDbConnection();
    /* if using npm mongodb < 3, dbClient is the db */
    /* https://www.sitepoint.com/community/t/mongodb-typeerror-db-collection-is-not-a-function/285588 */
    const db = dbClient.db( '0' );

    await getStats( db );
})();