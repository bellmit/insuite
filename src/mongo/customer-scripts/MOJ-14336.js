/*global db, ObjectId, print, printjson, ISODate*/
//cant use aggregation, because caseFolderId/employeeId is string and $toObjectId is only supported in 4.0

var
    startDate = new ISODate( '2020-04-30T22:00:00.000Z' ),
    currentDate = new Date(),
    catalogShorts = ['TARMED', 'TARMED_UVG_IVG_MVG'],
    excludedEmployees = ['5eb16ba8dd3a495bc70237c5', '5eb16ba8dd3a495bc70237c4'],
    treatment,
    employee,
    catalogEntry,
    caseFolder,
    checkQuantDignities,
    quantDignityExists,
    qualDignityExists,
    treatmentPassesChecks,
    requiredQuantDignityCode,
    requiredQualDignityCodes = [],
    query = {
        timestamp: {
            $gte: startDate
        },
        actType: 'TREATMENT',
        catalogShort: {$in: catalogShorts},
        employeeId: {$nin: excludedEmployees}
    },
    activitiesToDelete = [],
    distinctTreatmentCodes = db.activities.distinct( 'code', query ),
    distinctTreatmentEmployees = db.activities.distinct( 'employeeId', query ).map( elem => elem && ObjectId( elem ) ),
    distinctTreatmentCaseFolderIds = db.activities.distinct( 'caseFolderId', query ).map( elem => elem && ObjectId( elem ) ),
    relevantCatalogEntries = db.catalogs.find( {
        seq: {$in: distinctTreatmentCodes}
    } ).toArray(),
    relevantEmployees = db.employees.find( {
        _id: {$in: distinctTreatmentEmployees}
    } ).toArray(),
    relevantCaseFolders = db.casefolders.find( {
        _id: {$in: distinctTreatmentCaseFolderIds}
    } ).toArray(),
    allTreatments = db.activities.find( query ).toArray(),
    malformedCatalogEntries = [],
    okTreatments = [],
    ignored = 0,
    errorOrImported = 0,
    uniqueMissingQual = new Set(),
    sum = 0,
    missingDignitiesFromEmployees = {};

for( let i = 0; i < allTreatments.length; i++ ) {
    treatment = allTreatments[i];
    checkQuantDignities = true;
    treatmentPassesChecks = true;
    quantDignityExists = false;
    qualDignityExists = false;

    // eslint-disable-next-line no-loop-func
    employee = relevantEmployees.find( elem => elem._id.valueOf() === treatment.employeeId );
    // eslint-disable-next-line no-loop-func
    catalogEntry = relevantCatalogEntries.find( elem => elem.seq === treatment.code && elem.catalog.includes( `DC-${treatment.catalogShort}-CH` ) );
    if( !catalogEntry ) {
        print( `ERROR: Didnt find a catalog entry for treatment code: ${treatment.code}. continue...` );
        ignored++;
        continue;
    }
    // eslint-disable-next-line no-loop-func
    caseFolder = relevantCaseFolders.find( elem => {
        return elem._id.valueOf() === treatment.caseFolderId;
    } );
    if( !caseFolder ) {
        print( `ERROR: Could not find CaseFolder for treatment: ${treatment._id}` );
        continue;
    }
    if( caseFolder.type === 'ERROR' || caseFolder.imported === true ) {
        errorOrImported++;
        continue;
    }

    quantDignityExists = Boolean( catalogEntry && catalogEntry.u_extra && catalogEntry.u_extra.dignityRules && catalogEntry.u_extra.dignityRules.quantDignity );
    qualDignityExists = Boolean( catalogEntry && catalogEntry.u_extra && catalogEntry.u_extra.dignityRules && catalogEntry.u_extra.dignityRules.qualDignity && Array.isArray( catalogEntry.u_extra.dignityRules.qualDignity ) && catalogEntry.u_extra.dignityRules.qualDignity.length );

    requiredQuantDignityCode = quantDignityExists && catalogEntry.u_extra.dignityRules.quantDignity.code;
    requiredQualDignityCodes = qualDignityExists && catalogEntry.u_extra.dignityRules.qualDignity.map( elem => elem && elem.code );

    if( !quantDignityExists && !qualDignityExists ) {
        //has none
        print( `ERROR: treatment in catalog has neither 'quantDignity' nor 'qualDignity' set. ignoring...` );
        print( `catalog entry:` );
        printjson( catalogEntry );
        malformedCatalogEntries.push( catalogEntry && catalogEntry._id );
        continue;
    }

    //qual first
    if( requiredQualDignityCodes && requiredQualDignityCodes.length && employee.qualiDignities.length ) {
        if( requiredQualDignityCodes.includes( '9999' ) ) {
            checkQuantDignities = false;
        }
        if( !requiredQualDignityCodes.includes( '0000' ) && !(requiredQualDignityCodes.length === 1 && requiredQualDignityCodes[0] === '9999') ) {
            // eslint-disable-next-line no-loop-func
            treatmentPassesChecks = employee.qualiDignities.some( elem => requiredQualDignityCodes.includes( elem ) );
            checkQuantDignities = treatmentPassesChecks;
        }
        if( !treatmentPassesChecks && !checkQuantDignities ) {
            // eslint-disable-next-line no-loop-func
            requiredQualDignityCodes.filter( elem => {
                if( employee.qualiDignities.includes( elem ) || elem === '9999' ) {
                    return true;
                }
                if( !missingDignitiesFromEmployees.hasOwnProperty( `${employee.lastname}_${employee.firstname}` ) ) {
                    missingDignitiesFromEmployees[`${employee.lastname}_${employee.firstname}`] = {
                        qual: [],
                        quant: [],
                        sum: 0,
                        codes: []
                    };
                } else {
                    if( !missingDignitiesFromEmployees[`${employee.lastname}_${employee.firstname}`].qual.includes( elem ) ) {
                        missingDignitiesFromEmployees[`${employee.lastname}_${employee.firstname}`].qual.push( elem );
                    }
                }
                uniqueMissingQual.add( elem );
                return false;
            } );
        }
    }
    if( checkQuantDignities && quantDignityExists && requiredQuantDignityCode && employee.quantiDignities.length ) {
        //quantDignity needs at least 1
        treatmentPassesChecks = employee.quantiDignities.includes( requiredQuantDignityCode );
        if( !treatmentPassesChecks ) {
            if( !missingDignitiesFromEmployees.hasOwnProperty( `${employee.lastname}_${employee.firstname}` ) ) {
                missingDignitiesFromEmployees[`${employee.lastname}_${employee.firstname}`] = {
                    qual: [],
                    quant: [],
                    sum: 0,
                    codes: []
                };
            } else {
                if( !missingDignitiesFromEmployees[`${employee.lastname}_${employee.firstname}`].quant.includes( requiredQuantDignityCode ) ) {
                    missingDignitiesFromEmployees[`${employee.lastname}_${employee.firstname}`].quant.push( requiredQuantDignityCode );
                }
            }
        }
    }

    if( !treatmentPassesChecks ) {
        if( treatment.price ) {
            if( missingDignitiesFromEmployees.hasOwnProperty( `${employee.lastname}_${employee.firstname}` ) ) {
                missingDignitiesFromEmployees[`${employee.lastname}_${employee.firstname}`].sum += parseFloat( treatment.price );
            }
            sum += parseFloat( treatment.price );
        }
        if( missingDignitiesFromEmployees.hasOwnProperty( `${employee.lastname}_${employee.firstname}` ) ) {
            if( !missingDignitiesFromEmployees[`${employee.lastname}_${employee.firstname}`].codes.includes( treatment.code ) ) {
                missingDignitiesFromEmployees[`${employee.lastname}_${employee.firstname}`].codes.push( treatment.code );
            }
        }
        activitiesToDelete.push( treatment );
    } else {
        okTreatments.push( treatment._id );
    }
}

print( `Ignored: ${ignored}` );
print( `ErrorOrImported: ${errorOrImported}` );
print( `Malformed: ${malformedCatalogEntries.length}` );
print( `Deleted: ${activitiesToDelete.length}` );
print( `OK: ${okTreatments.length}` );
var tmp = Array.from( uniqueMissingQual );
print( `Missing QualDig: ${tmp.toString()}` );
print( `Sum: ${sum}` );
print( `Missing Digs for each Employee:` );
printjson( missingDignitiesFromEmployees );

if( activitiesToDelete && activitiesToDelete.length ) {
    db.createCollection( `MOJ-14336-delete-${currentDate.toISOString()}` );
    db.getCollection( `MOJ-14336-delete-${currentDate.toISOString()}` ).insertMany( activitiesToDelete );

    // eslint-disable-next-line no-inner-declarations
    var activityIdsToDelete = activitiesToDelete.map( elem => elem._id );
    db.activities.remove( {
        _id: {$in: activityIdsToDelete}
    } );
}
