/**
 * User: nicolas.pettican
 * Date: 24.06.20  16:47
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* eslint-disable no-console */

const
    fs = require( 'fs' ),
    {promisify} = require( 'util' ),
    readFile = promisify( fs.readFile ),
    /* we're assuming that mongodb npm client is version >= 3 */
    {MongoClient, ObjectId} = require( 'mongodb' ),

    /* env variables to pass when running the script */
    /* can also be set manually */
    USERNAME = process.env.USERNAME,
    PASSWORD = process.env.PASSWORD,
    ADMIN = process.env.ADMIN,
    dbURL = `mongodb://${USERNAME}:${PASSWORD}@127.0.0.1:27017/0?authSource=${ADMIN}&gssapiServiceName=mongodb`,
    /* dbURL = 'mongodb://localhost:27023/0', */

    /* user defined variables */
    instructionFilePath = '',
    /* set the bellow variable (Array of String) in order to only run the merge on a defined BSNRs */
    restrictBSNRList = [];

if( !USERNAME || !PASSWORD || !ADMIN ) {
    console.log( 'Please add USERNAME, PASSWORD, ADMIN as environment variables, e.g.:\n' +
                 'PROP_ADMIN_USER="admin.user" ' +
                 'PROP_ADMIN_PASSWORD="admin.password" ' +
                 'PROP_ADMIN_AUTH="admin.authdb" ' +
                 'USERNAME=$(dc-mongo-property get "$PROP_ADMIN_USER") ' +
                 'PASSWORD=$(dc-mongo-property get "$PROP_ADMIN_PASSWORD") ' +
                 'ADMIN=$(dc-mongo-property get "$PROP_ADMIN_AUTH") node src/mongo/MOJ-13590-merge-locations.js' );
}

let error;

function formatPromiseResult( prom ) {
    return prom
        .then( ( result ) => {
            return [null, result];
        } )
        .catch( ( err ) => {
            return [err];
        } );
}

function removeDuplicateIdentitiesWarning() {
    console.log( 'The script might cause duplicate locations in identities.' +
                 'To fix, run the following script when finished:\n' +
                 'let locations, uniqueLocationIds, result;\n' +
                 'db.identities.find({ \'locations.0\': { $exists: true } }).forEach((ident) => {\n' +
                 '    locations = [];\n' +
                 '    uniqueLocationIds = new Set();\n' +
                 '    ident.locations.forEach((loc) => {\n' +
                 '        if (!uniqueLocationIds.has(loc._id)) {\n' +
                 '            locations.push(loc);\n' +
                 '            uniqueLocationIds.add(loc._id);\n' +
                 '        }\n' +
                 '    });\n' +
                 '    result = db.identities.updateOne({ _id: ident._id }, { $set: { locations: locations } });\n' +
                 '    printjson(result);\n' +
                 '});' );
}

/**
 * Prints stats to the output in order to check the difference
 * before and after the script
 *
 * @param {Object} db mongo client
 * @returns {Promise<void>}
 */
async function getStats( db ) {
    const
        locationsModel = db.collection( 'locations' ),
        employeesModel = db.collection( 'employees' ),
        activitiesModel = db.collection( 'activities' );
    let
        locations,
        locationIds = [],
        physicians,
        physician,
        treatmentCount;

    printHeading( 'Analysing statistics for physicians and treatments (short output)' );

    [error, locations] = await formatPromiseResult(
        locationsModel.find( {}, {_id: 1, locname: 1, commercialNo: 1} ).toArray()
    );

    if( error ) {
        console.warn( `Could not get locations: ${error}` );
        return;
    }

    locations.forEach( ( loc ) => {
        locationIds.push( loc._id );
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

    /* get treatment stats */

    for( physician of physicians ) {
        [error, treatmentCount] = await formatPromiseResult(
            activitiesModel.count(
                {actType: 'TREATMENT', employeeId: physician._id.toString(), locationId: {$in: locationIds}}
            )
        );

        if( error ) {
            console.warn( `Could not get treatments for physician ${physician.lastname} with ID ${physician._id.toString()}: ${error}` );
            continue;
        }

        console.log( `Found ${treatmentCount} treatments for physician ${physician.lastname} with ID ${physician._id.toString()}` );
    }

    console.log( '---------------------------------------------' );
}

/**
 * Creates a more workable instruction object
 * each key is the BSNR to use and contains
 * the array of locations and the primary BSNR
 * to use as default template
 *
 * @param {Array} instructions
 * @returns {Object} groups
 */
function createLocationGroups( instructions ) {
    const groups = {};
    let
        line,
        newBSNR,
        newBSNRName,
        primaryBSNR;

    for( {newBSNR, primaryBSNR, newBSNRName, ...line} of instructions ) {
        newBSNR = String( newBSNR );
        primaryBSNR = String( primaryBSNR );

        /* here we can restrict the location to the specified restricted ones */
        if( restrictBSNRList.length && !restrictBSNRList.includes( newBSNR ) ) {
            continue;
        }

        if( !groups[newBSNR] ) {
            groups[newBSNR] = {
                otherBSNRs: [line],
                otherBSNRCodes: [String( line.oldBSNR )],
                primaryBSNR,
                newBSNRName
            };
            continue;
        }

        groups[newBSNR].otherBSNRs.push( line );
        groups[newBSNR].otherBSNRCodes.push( String( line.oldBSNR ) );
    }

    return groups;
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
 * Merges all locations into the primary one and renames BSNR (commercialNo) to newBSNR
 * doing it this way will retain the printer settings and other fields
 * @param args
 */
function mergeLocationsToPrimary( args ) {
    const {primaryLocation, otherLocations, newBSNR, newBSNRName} = args;
    let
        location,
        finalLocation = {};

    for( location of otherLocations ) {
        finalLocation = {...finalLocation, ...location};
    }

    return {
        ...finalLocation,
        ...primaryLocation,
        commercialNo: newBSNR,
        locname: newBSNRName,
        _id: new ObjectId()
    };
}

/**
 * Handles getting the model from the mongo client
 * runs the updateMany method
 * and logs error if any
 *
 * @param args
 * @returns {Promise<void>}
 */
async function runUpdateMany( args ) {
    const
        {findQuery, updateQuery, filterQuery = {}, db, name} = args,
        model = db.collection( name );
    let result;

    [error, result] = await formatPromiseResult(
        model.updateMany( findQuery, updateQuery, filterQuery )
    );

    if( error ) {
        console.error( `Could not update documents for ${name} with query ${JSON.stringify( findQuery )} and update query ${JSON.stringify( updateQuery )}: ${error}` );
    }

    if( result ) {
        console.log( ` > ${name} -> matched: ${result.matchedCount} updated: ${result.modifiedCount}` );
    }
}

async function deleteOldLocations( args ) {
    const
        {oldLocationIds, locationsModel, backupModel} = args;
    let oldLocations;

    if( !oldLocationIds.some( Boolean ) ) {
        throw new Error( 'No locations to delete' );
    }

    /* we might want to back these up first */

    [error, oldLocations] = await formatPromiseResult(
        locationsModel.find( {_id: {$in: oldLocationIds}} ).toArray()
    );

    if( error ) {
        throw new Error( `Could not find old locations with ids ${JSON.stringify( oldLocationIds )}: ${error}` );
    }

    [error] = await formatPromiseResult(
        backupModel.insertMany( oldLocations )
    );

    if( error ) {
        console.warn( `Not deleting old locations with ids: ${JSON.stringify( oldLocationIds )}` );
        throw new Error( `Error backing up old locations: ${error}` );
    }

    [error] = await formatPromiseResult(
        locationsModel.deleteMany( {_id: {$in: oldLocationIds}} )
    );

    if( error ) {
        console.warn( `Error deleting old locations: ${error}` );
    }
}

async function updateMainLocationIds( args ) {
    const
        {newMainLocationId, locationsModel, locationId} = args,
        findQuery = {_id: locationId, mainLocationId: {$exists: true}},
        updateQuery = {$set: {mainLocationId: newMainLocationId}};

    console.log( `Updating mainLocationId for new location ${locationId}` );

    [error] = await formatPromiseResult(
        locationsModel.updateOne( findQuery, updateQuery )
    );

    if( error ) {
        throw new Error( `Could not update mainLocationId with query ${findQuery} and update query ${updateQuery}: ${error}` );
    }
}

/**
 * Updates all documents with the new location
 * see https://doccirrus.atlassian.net/browse/SUP-10489
 *
 * @param args
 * @returns {Promise<void>}
 */
async function updateAllDocuments( args ) {
    const
        {newLocationId, newLocationName, otherLocations, newBSNR, db} = args,
        oldLocationIds = otherLocations.map( ( loc ) => loc._id ),
        oldLocationIdStrings = oldLocationIds.map( ( _id ) => _id.toString() ),
        newLocationIdString = newLocationId.toString();
    let
        findQuery,
        updateQuery,
        filterQuery;

    /* newLocationId directly as locationId (ObjectId):
        calendars
        activities
    */

    console.log( '- updating calendars and activities' );

    findQuery = {locationId: {$in: oldLocationIds}};
    updateQuery = {$set: {locationId: newLocationId}};

    await runUpdateMany( {name: 'calendars', findQuery, updateQuery, db} );
    await runUpdateMany( {name: 'activities', findQuery, updateQuery, db} );

    /* newLocationId directly as locationId (String):
        patients
        patientversions
        catalogtexts
        catalogusages
        documents
    */

    console.log( '- updating patients, patientversions, catalogtexts, catalogusages and documents' );

    findQuery = {locationId: {$in: oldLocationIdStrings}};
    updateQuery = {$set: {locationId: newLocationIdString}};

    await runUpdateMany( {name: 'patients', findQuery, updateQuery, db} );
    await runUpdateMany( {name: 'patientversions', findQuery, updateQuery, db} );
    await runUpdateMany( {name: 'catalogtexts', findQuery, updateQuery, db} );
    await runUpdateMany( {name: 'catalogusages', findQuery, updateQuery, db} );
    await runUpdateMany( {name: 'documents', findQuery, updateQuery, db} );

    /* newLocationName newLocationId directly as locName and locId (String):
        reportings
    */

    console.log( '- updating reportings.locId' );

    findQuery = {locId: {$in: oldLocationIdStrings}}; /* did not include oldLocationNames so that ID takes preference */
    updateQuery = {$set: {locId: newLocationIdString, locName: newLocationName, commercialNo: newBSNR}};

    await runUpdateMany( {name: 'reportings', findQuery, updateQuery, db} );

    /* newLocationId nested as insuranceStatus.XX.locationId (String):
        patients
        patientversions
        see https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/
    */

    console.log( '- updating patients.insuranceStatus and patientversions.insuranceStatus' );

    findQuery = {insuranceStatus: {$elemMatch: {locationId: {$in: oldLocationIdStrings}}}};
    updateQuery = {$set: {'insuranceStatus.$[elem].locationId': newLocationIdString}};
    filterQuery = {multi: true, arrayFilters: [{'elem.locationId': {$in: oldLocationIdStrings}}]};

    await runUpdateMany( {name: 'patients', findQuery, updateQuery, filterQuery, db} );
    await runUpdateMany( {name: 'patientversions', findQuery, updateQuery, filterQuery, db} );

    /* newLocationName and newLocationId nested as locations.XX._id (String) and locations.XX.locname:
        identities
        employees
        see https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/
    */

    console.log( '- updating identities and employees' );

    findQuery = {locations: {$elemMatch: {_id: {$in: oldLocationIdStrings}}}};
    updateQuery = {$set: {'locations.$[elem]._id': newLocationIdString, 'locations.$[elem].locname': newLocationName}};
    filterQuery = {multi: true, arrayFilters: [{'elem._id': {$in: oldLocationIdStrings}}]};

    await runUpdateMany( {name: 'identities', findQuery, updateQuery, filterQuery, db} );
    await runUpdateMany( {name: 'employees', findQuery, updateQuery, filterQuery, db} );

    /* newLocationId as currentLocation (String):
        identities
        employees
        see https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/
    */

    console.log( '- updating identities\' and employees\' currentLocation' );

    findQuery = {currentLocation: {$in: oldLocationIdStrings}};
    updateQuery = {$set: {'currentLocation': newLocationIdString}};

    await runUpdateMany( {name: 'identities', findQuery, updateQuery, db} );
    await runUpdateMany( {name: 'employees', findQuery, updateQuery, db} );

    removeDuplicateIdentitiesWarning();

    /* newLocationId nested as activities.XX.locationId (ObjectId):
        activitysequences
        see https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/
    */

    console.log( '- updating activitysequences' );

    findQuery = {activities: {$elemMatch: {locationId: {$in: oldLocationIds}}}};
    updateQuery = {$set: {'activities.$[elem].locationId': newLocationId}};
    filterQuery = {multi: true, arrayFilters: [{'elem.locationId': {$in: oldLocationIds}}]};

    await runUpdateMany( {name: 'activitysequences', findQuery, updateQuery, filterQuery, db} );

    /* newLocationName and newLocationId nested as mapData.locName and mapData.locId (String):
        documents
    */

    console.log( '- updating documents.mapData' );

    findQuery = {'mapData.locId': {$in: oldLocationIdStrings}}; /* did not include oldLocationNames so that ID takes preference */
    updateQuery = {$set: {'mapData.locId': newLocationIdString, 'mapData.locName': newLocationName}};

    await runUpdateMany( {name: 'documents', findQuery, updateQuery, db} );

    /* locationId nested as
        * invoiceNumberSchemes.XX.locationId (String)
        * receiptNumberSchemes.XX.locationId (String)
        * dunningSchemes.XX.locationId (String)
        invoiceconfigurations
    */

    console.log( '- updating invoiceconfigurations' );

    findQuery = {invoiceNumberSchemes: {$elemMatch: {locationId: {$in: oldLocationIdStrings}}}};
    updateQuery = {$set: {'invoiceNumberSchemes.$[elem].locationId': newLocationIdString}};
    filterQuery = {multi: true, arrayFilters: [{'elem.locationId': {$in: oldLocationIdStrings}}]};

    await runUpdateMany( {name: 'invoiceconfigurations', findQuery, updateQuery, filterQuery, db} );

    findQuery = {receiptNumberSchemes: {$elemMatch: {locationId: {$in: oldLocationIdStrings}}}};
    updateQuery = {$set: {'receiptNumberSchemes.$[elem].locationId': newLocationIdString}};

    await runUpdateMany( {name: 'invoiceconfigurations', findQuery, updateQuery, filterQuery, db} );

    findQuery = {dunningSchemes: {$elemMatch: {locationId: {$in: oldLocationIdStrings}}}};
    updateQuery = {$set: {'dunningSchemes.$[elem].locationId': newLocationIdString}};

    await runUpdateMany( {name: 'invoiceconfigurations', findQuery, updateQuery, filterQuery, db} );

    /* locationId nested as cashSettings.XX.locations.XX._id (ObjectId) (cashSettings.XX.locations also has locname and commercialNo):
        invoiceconfigurations
    */

    findQuery = {'cashSettings.locations': {$elemMatch: {_id: {$in: oldLocationIds}}}};
    updateQuery = {
        $set: {
            'cashSettings.locations.$[elem]._id': newLocationId,
            'cashSettings.locations.$[elem].locname': newLocationName,
            'cashSettings.locations.$[elem].commercialNo': newBSNR
        }
    };
    filterQuery = {multi: true, arrayFilters: [{'elem._id': {$in: oldLocationIds}}]};

    await runUpdateMany( {name: 'invoiceconfigurations', findQuery, updateQuery, filterQuery, db} );

    /* locationId nested as
        * gkvExclusionList.XX.locations.XX._id (ObjectId)
        * gkvExclusionList.XX.locations.XX.locname (String)
        * gkvExclusionList.XX.locations.XX.commercialNo (String)
        invoiceconfigurations
    */

    findQuery = {'gkvExclusionList.locations': {$elemMatch: {_id: {$in: oldLocationIds}}}};
    updateQuery = {
        $set: {
            'gkvExclusionList.locations.$[elem]._id': newLocationId,
            'gkvExclusionList.locations.$[elem].locname': newLocationName,
            'gkvExclusionList.locations.$[elem].commercialNo': newBSNR
        }
    };
    filterQuery = {multi: true, arrayFilters: [{'elem._id': {$in: oldLocationIds}}]};

    await runUpdateMany( {name: 'invoiceconfigurations', findQuery, updateQuery, filterQuery, db} );

    /* locationId as
        * matchedPatients.XX.locationId (String)
        * matchedPatients.XX.insuranceStatus.XX.locationId (String)
        * mergedPatient.locationId (String)
        * mergedPatient.insuranceStatus.XX.locationId (String)
        * parsedPatient.insuranceStatus.XX.locationId (String)
        crlogs
    */

    console.log( '- updating crlogs' );

    findQuery = {};
    updateQuery = {
        $set: {
            'matchedPatients.$[elem].locationId': newLocationIdString,
            'mergedPatient.insuranceStatus.$[elem].locationId': newLocationIdString,
            'parsedPatient.insuranceStatus.$[elem].locationId': newLocationIdString
        }
    };
    filterQuery = {multi: true, arrayFilters: [{'elem.locationId': {$in: oldLocationIdStrings}}]};

    await runUpdateMany( {name: 'crlogs', findQuery, updateQuery, filterQuery, db} );

    findQuery = {'mergedPatient.locationId': {$in: oldLocationIdStrings}};
    updateQuery = {$set: {'mergedPatient.locationId': newLocationIdString}};

    await runUpdateMany( {name: 'crlogs', findQuery, updateQuery, db} );

    findQuery = {'matchedPatients.insuranceStatus': {$elemMatch: {locationId: {$in: oldLocationIdStrings}}}};
    updateQuery = {$set: {'matchedPatients.insuranceStatus.$[elem].locationId': newLocationIdString}};
    filterQuery = {multi: true, arrayFilters: [{'elem.locationId': {$in: oldLocationIdStrings}}]};

    await runUpdateMany( {name: 'crlogs', findQuery, updateQuery, filterQuery, db} );

    /* locationId as config.formPrinters.XX.locationId (String)
       profiles
    */

    console.log( '- updating profiles' );

    findQuery = {
        'config.formPrinters': {
            $elemMatch: {
                locationId: {$in: oldLocationIdStrings}
            }
        }
    };
    updateQuery = {
        $set: {
            'config.formPrinters.$[elem].locationId': newLocationIdString
        }
    };
    filterQuery = {
        multi: true,
        arrayFilters: [
            {
                'elem.locationId': {$in: oldLocationIdStrings}
            }
        ]
    };

    await runUpdateMany( {name: 'profiles', findQuery, updateQuery, filterQuery, db} );

    console.log( `Finished updating all collections with new commercialNo ${newBSNR}` );
}

/**
 * Adds the new location document
 * or if it is the first location, update it
 * Return the new location _id
 * @param args
 * @param args.oldLocationIds
 * @param args.newLocationDocument
 * @param args.locationsModel
 * @returns {ObjectId}
 */
async function addNewPrimaryLocation( args ) {
    const
        {oldLocationIds, newLocationDocument, locationsModel, backupModel} = args,
        firstPracticeLocationIdString = '000000000000000000000001',
        firstPracticeLocationId = new ObjectId( firstPracticeLocationIdString ),

        hasFirstPracticeLocation = oldLocationIds.some( ( locId ) => locId.toString() === firstPracticeLocationIdString );
    let
        firstPracticeLocation,
        error;

    if( hasFirstPracticeLocation ) {
        console.log( `Primary location equals the "first practice location" (${firstPracticeLocationIdString})` );

        newLocationDocument._id = firstPracticeLocationId;

        /* back up the firstpracticelocation before updating */

        [error, firstPracticeLocation] = await formatPromiseResult(
            locationsModel.findOne( {_id: firstPracticeLocationId} )
        );

        if( error ) {
            throw new Error( `Could not find location with id ${firstPracticeLocationIdString}: ${error}` );
        }

        /* update the _id in case it is already backed-up */

        firstPracticeLocation.originalId = firstPracticeLocationId;
        firstPracticeLocation._id = new ObjectId();

        /* back up the firstpracticelocation */

        [error] = await formatPromiseResult(
            backupModel.insertOne( firstPracticeLocation )
        );

        if( error ) {
            throw new Error( `Error backing up old firstPracticeLocation: ${error}` );
        }

        /* update the firstpracticelocation instead of moving it out and creating a new one */

        [error] = await formatPromiseResult(
            locationsModel.replaceOne( {_id: firstPracticeLocationId}, newLocationDocument )
        );

        if( error ) {
            throw new Error( `Error updating location with id ${firstPracticeLocationIdString}: ${error}` );
        }

        return {
            newLocationId: firstPracticeLocationId,
            oldLocationIds: oldLocationIds.filter( ( locId ) => locId.toString() !== firstPracticeLocationIdString )
        };
    }

    /* default logic: add new location */

    [error] = await formatPromiseResult(
        locationsModel.insert( newLocationDocument )
    );

    if( error ) {
        throw new Error( error );
    }

    return {
        newLocationId: newLocationDocument._id,
        oldLocationIds
    };
}

/**
 * Merges the location for each BSNR for each collection
 *
 * @param args
 * @returns {Promise<void>}
 */
async function runMerge( args ) {
    const
        {instructions, db} = args,
        locationsModel = db.collection( 'locations' ),
        backupModel = db.collection( 'MOJ13590_locations_old' ),
        mainLocationIdMap = new Map(),
        locationIdMap = {};
    let
        newBSNR,
        newBSNRName,
        newLocationDocument,
        newLocationName,
        primaryBSNR,
        otherBSNRs,
        otherBSNRCodes,
        primaryLocation,
        otherLocations,
        mainLocationId,
        matchingLocationId,
        newLocationId,
        oldLocationIds,
        result;

    for( newBSNR in instructions ) {
        if( !instructions.hasOwnProperty( newBSNR ) ) {
            continue;
        }

        primaryBSNR = instructions[newBSNR].primaryBSNR;
        newBSNRName = instructions[newBSNR].newBSNRName;
        otherBSNRs = instructions[newBSNR].otherBSNRs;
        otherBSNRCodes = instructions[newBSNR].otherBSNRCodes;

        printHeading( `Merging ${newBSNRName} (${newBSNR})` );
        console.time( `Time elapsed to merge ${newBSNRName}` );

        if( !primaryBSNR || !otherBSNRs.length ) {
            console.warn( `Missing arguments: primaryBSNR is ${primaryBSNR} and otherBSNRs.length: ${otherBSNRs.length}` );
            continue;
        }

        /* get the primary location first */

        [error, primaryLocation] = await formatPromiseResult(
            locationsModel.findOne( {commercialNo: primaryBSNR} )
        );

        if( !primaryLocation ) {
            console.warn( `Could not get primary location: ${error}` );
            continue;
        }

        /* get the other locations */

        [error, otherLocations] = await formatPromiseResult(
            locationsModel.find( {commercialNo: {$in: otherBSNRCodes}} ).toArray()
        );

        /* merge into the final location document to be used */

        console.log( `Merging ${otherLocations.length} locations to ${newBSNRName} (${newBSNR})` );

        newLocationDocument = mergeLocationsToPrimary( {primaryLocation, otherLocations, newBSNR, newBSNRName} );
        /* we add the primary location into other locations to also update to the new location document */
        otherLocations.push( primaryLocation );
        newLocationName = newLocationDocument.locname;

        /* insert the new location to be used
        *  this step will also update the oldLocationIds list in case we are dealing with location 000000000000000000000001 */

        [error, result] = await formatPromiseResult(
            addNewPrimaryLocation( {
                newLocationDocument,
                oldLocationIds: otherLocations.map( ( loc ) => loc._id ),
                locationsModel,
                backupModel
            } )
        );

        if( error ) {
            console.warn( `Error while inserting new location for BSNR ${newBSNR}: ${error}` );
            continue;
        }

        newLocationId = result.newLocationId;
        oldLocationIds = result.oldLocationIds;

        console.log( `Added new primary location to database with _id ${newLocationId.toString()}` );

        locationIdMap[newLocationId.toString()] = oldLocationIds.map( ( _id ) => _id.toString() );

        if( newLocationDocument.mainLocationId ) {
            mainLocationIdMap.set( newLocationId.toString(), newLocationDocument.mainLocationId );
        }

        /* update all the documents */

        console.log( `Updating all documents in database with new locationId ${newLocationId.toString()}:` );

        [error] = await formatPromiseResult(
            updateAllDocuments( {newLocationId, newLocationName, otherLocations, newBSNR, db} )
        );

        if( error ) {
            console.error( `Error while updating documents with new location ${newBSNR}: ${error}` );
            console.log( 'Will not attempt to delete old locations until this function passes' );
            continue;
        }

        /* delete old locations */

        console.log( `Deleting ${oldLocationIds.length} locations` );
        console.log( oldLocationIds );

        [error] = await formatPromiseResult(
            deleteOldLocations( {oldLocationIds, locationsModel, backupModel} )
        );

        if( error ) {
            console.error( `Error while deleting old locations: ${error}` );
        }

        console.log( `√ Successfully updated ${otherLocations.length} locations to reference ${newBSNR}` );
        console.timeEnd( `Time elapsed to merge ${newBSNRName}` );
    }

    /* update mainLocationIds, these could be referencing locations that no longer exist */

    if( mainLocationIdMap.size ) {
        for( [newLocationId, mainLocationId] of mainLocationIdMap.entries() ) {

            /* eslint-disable-next-line no-loop-func */
            matchingLocationId = Object.keys( locationIdMap ).find( ( locationId ) => locationIdMap[locationId].includes( mainLocationId ) );

            if( !matchingLocationId || matchingLocationId === newLocationId ) {
                continue;
            }

            [error] = await formatPromiseResult(
                updateMainLocationIds( {
                    newMainLocationId: matchingLocationId,
                    locationId: new ObjectId( newLocationId ),
                    locationsModel
                } )
            );

            if( error ) {
                console.error( `Error updating mainLocationId: ${error}` );
            }
        }
    }
}

/**
 * The main function that orchestrates everything
 *
 * @returns {Promise<void>}
 */
async function main() {
    let
        instructions,
        dbClient,
        db;

    printHeading( 'Starting operations' );
    console.time( 'Time elapsed for entire operation' );

    if( !instructionFilePath ) {
        console.log( 'Please provide instructionFilePath in the user defined variables.\n' +
                     'This should be a JSON file structured as a list of objects with the following keys:\n' +
                     '\tnewBSNRName\n' +
                     '\tnewBSNR\n' +
                     '\toldBSNRName\n' +
                     '\toldBSNR\n' +
                     '\tAbteilungNr\n' +
                     '\tprimaryBSName\n' +
                     '\tprimaryBSNR' );
        process.exit( 1 );
    }

    console.log( 'Importing instructions' );
    [error, instructions] = await formatPromiseResult(
        readFile( instructionFilePath )
    );

    /* get the instructions */

    if( error ) {
        console.error( `Could not get instruction file: ${error}` );
        process.exit( 1 );
    }

    instructions = JSON.parse( instructions );

    /* get the ingredients ready */

    console.log( 'Grouping locations' );
    instructions = createLocationGroups( instructions );
    dbClient = await createDbConnection();
    /* if using npm mongodb < 3, dbClient is the db */
    /* https://www.sitepoint.com/community/t/mongodb-typeerror-db-collection-is-not-a-function/285588 */
    db = dbClient.db( '0' );

    await getStats( db );

    /* run the merge */

    printHeading( 'Running merge' );

    [error] = await formatPromiseResult(
        runMerge( {instructions, db} )
    );

    if( error ) {
        console.error( `Merge could not complete: ${error}` );
        dbClient.close();
        process.exit( 1 );
    }

    await getStats( db );

    /* finish up */

    dbClient.close();

    console.timeEnd( 'Time elapsed for entire operation' );
}

function printHeader() {
    console.log(
        '\'||\'\'|.     ..|\'\'\'.|    \'||    ||\'                                 \n' +
        ' ||   ||  .|\'     \'      |||  |||    ....  ... ..    ... .   ....  \n' +
        ' ||    || ||             |\'|..\'||  .|...||  ||\' \'\'  || ||  .|...|| \n' +
        ' ||    || \'|.      .     | \'|\' ||  ||       ||       |\'\'   ||      \n' +
        '.||...|\'   \'\'|....\'     .|. | .||.  \'|...\' .||.     \'||||.  \'|...\' \n' +
        '                                                   .|....\'         \n' +
        '                                                                   \n' +
        '\'||\'                                .    ||                          \n' +
        ' ||         ...     ....   ....   .||.  ...    ...   .. ...    ....  \n' +
        ' ||       .|  \'|. .|   \'\' \'\' .||   ||    ||  .|  \'|.  ||  ||  ||. \'  \n' +
        ' ||       ||   || ||      .|\' ||   ||    ||  ||   ||  ||  ||  . \'|.. \n' +
        '.||.....|  \'|..|\'  \'|...\' \'|..\'|\'  \'|.\' .||.  \'|..|\' .||. ||. |\'..|\' \n' +
        '                                                                     '
    );
}

function printHeading( msg ) {
    console.log( '---------------------------------------------' );
    console.log( msg );
    console.log( '---------------------------------------------' );
}

printHeader();
main();