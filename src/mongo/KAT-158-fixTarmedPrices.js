/**
 * User: dcdev
 * Date: 11/13/20  3:15 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global db:true */

print( '==== FIXING PRICE FOR TARMED TREATMENTS KAT-158 ====' );
db = db.getSiblingDB( "0" );

function getRelevantDignityScalingFactor( args ) {
    var
        tarmedInvoiceFactorValues = args.tarmedInvoiceFactorValues || [],
        qualiDignities = args.qualiDignities || [],
        caseFolderType = args.caseFolderType;
    return tarmedInvoiceFactorValues.find( function( value ) {
        return value.caseTypes.includes( caseFolderType ) && qualiDignities.includes( value.qualiDignity );
    } );
}

function calculateTarmedPrice( args ) {
    var
        tarmedScalingFactors = args.tarmedScalingFactors,
        caseFolderType = args.caseFolderType || 'PRIVATE_CH',
        cantonCode = args.cantonCode,
        insuranceGLN = args.insuranceGLN,
        treatment = args.treatment || {},
        taxPointValue, specialValue, specialInsurances,
        date = treatment.timestamp || new Date().toJSON(),
        medicalTaxPoints = treatment.medicalTaxPoints || 0,
        technicalTaxPoints = treatment.technicalTaxPoints || 0,
        assistanceTaxPoints = treatment.assistanceTaxPoints || 0,
        medicalScalingFactor = treatment.medicalScalingFactor,
        technicalScalingFactor = treatment.technicalScalingFactor,
        tarmedTaxPointValues = tarmedScalingFactors.taxPointValues || [],
        relevantTarmedTaxPointEntry,
        totalMedicalTaxPoints,
        scaledMedicalTaxPoints,
        scaledTechnicalTaxPoints,
        technicalPrice,
        medicalPrice;

    relevantTarmedTaxPointEntry = getRelevantTarmedTaxPointEntry( {
        caseFolderType: caseFolderType,
        cantonCode: cantonCode,
        date: date,
        tarmedTaxPointValues: tarmedTaxPointValues
    } );

    taxPointValue = relevantTarmedTaxPointEntry.value;
    specialValue = relevantTarmedTaxPointEntry.specialValue;
    specialInsurances = relevantTarmedTaxPointEntry.specialInsurances;

    if( specialValue && Array.isArray( specialInsurances ) && specialInsurances.includes( insuranceGLN ) ) {
        taxPointValue = specialValue;
    }

    totalMedicalTaxPoints = medicalTaxPoints + assistanceTaxPoints;
    scaledMedicalTaxPoints = totalMedicalTaxPoints * medicalScalingFactor;
    scaledTechnicalTaxPoints = technicalTaxPoints * technicalScalingFactor;

    technicalPrice = Math.round( scaledTechnicalTaxPoints * taxPointValue ) / 100;
    medicalPrice = Math.round( scaledMedicalTaxPoints * taxPointValue ) / 100;

    return technicalPrice + medicalPrice;
}

function getRelevantTarmedTaxPointEntry( args ) {
    var
        caseFolderType = args.caseFolderType,
        cantonCode = args.cantonCode,
        tarmedTaxPointValues = args.tarmedTaxPointValues,
        date = args.date;

    var law = caseFolderTypeToLaw( caseFolderType );

    return tarmedTaxPointValues.find( function( entry ) {
        var isMatchingLaw = entry.law === law;
        if( law !== 'KVG' ) {
            return isMatchingLaw;
        }
        var isValidDateRange = new Date( entry.validFrom ) < new Date( date ),
            isMatchingCantonCode = entry.cantonCode === cantonCode,
            isNotExpired = (!entry.validUntil || Date( entry.validUntil ) > Date( date ));

        return isMatchingLaw && isValidDateRange && isMatchingCantonCode && isNotExpired;
    } );
}

function caseFolderTypeToLaw( caseFolderType ) {
    switch( caseFolderType ) {
        case'PRIVATE_CH':
            return 'KVG';
        case 'PRIVATE_CH_UVG':
            return 'UVG';
        case 'PRIVATE_CH_IVG':
            return 'IVG';
        case 'PRIVATE_CH_MVG':
            return 'MVG';
        case 'PRIVATE_CH_VVG':
            return 'VVG';
    }
    return null;
}

function fixPrices() {
    let result, physicians, locations, invoiceconfigurations, tarmedTaxPointValues, tarmedInvoiceFactorValues,
        count = 0;
    const treatmentsWithPredefinedMedicalScalingFactor = ["00.2530", "00.2550", "00.2570", "00.2590", "04.0620",
        "04.1930", "06.0430", "06.0440", "06.0730", "06.0740", "07.0300", "07.0310", "10.1040", "10.1050", "11.0120",
        "24.0250", "24.3250", "28.0020", "29.2090", "35.0020", "39.6070"];
    const tarmedActivitiesQuery = {
        actType: 'TREATMENT',
        status: 'VALID',
        timestamp: {
            $gte: new Date( "2020-06-01T00:00:00.000Z" ),
            $lt: new Date()
        },
        catalogShort: {
            $in: ['TARMED', 'TARMED_UVG_IVG_MVG']
        },
        $and: [
            {code: {$nin: treatmentsWithPredefinedMedicalScalingFactor}},
            {code: /^\d{2}\.\d{4}$/}
        ],
        employeeId: {$exists: true},
        locationId: {$exists: true},
        caseFolderId: {$exists: true}
    };

    try {
        physicians = db.employees.find( {type: 'PHYSICIAN'}, {_id: 1, qualiDignities: 1} ).toArray();
    } catch( error ) {
        return;
    }

    try {
        locations = db.locations.find( {}, {_id: 1, cantonCode: 1} ).toArray();
    } catch( error ) {
        print( `Error! Could not get locations: ${error}` );
        return;
    }

    try {
        invoiceconfigurations = db.invoiceconfigurations.find( {}, {
            tarmedTaxPointValues: 1,
            tarmedInvoiceFactorValues: 1
        } ).toArray();

        tarmedTaxPointValues = invoiceconfigurations[0].tarmedTaxPointValues;
        tarmedInvoiceFactorValues = invoiceconfigurations[0].tarmedInvoiceFactorValues;
    } catch( error ) {
        print( `Error! Could not get invoiceconfiguration: ${error}` );
        return;
    }

    try {
        result = db.activities.find( tarmedActivitiesQuery );
    } catch( error ) {
        print( `Error! Could not get TARMED activities: ${error}` );
        return;
    }
    while( result.hasNext() ) {
        let activity = result.next();
        let employee = physicians.find( p => p._id.toString() === new ObjectId(activity.employeeId).toString() ),
            location = locations.find( l => l._id.toString() === activity.locationId.toString() ),
            caseFolders, caseFolderType;

        try {
            caseFolders = db.casefolders.find( {_id: new ObjectId(activity.caseFolderId)}, {_id: 1, type: 1} ).toArray();
            caseFolderType = caseFolders[0].type;
        } catch ( error ) {
            print( `Error! Could not get caseFolder ${activity.caseFolderId} from activity ${activity._id.toString()}. Error: ${error}` );
            continue;
        }

        if( !employee ) {
            print( `Error! Could not get employee ${activity.employeeId} from activity ${activity._id.toString()}` );
            continue;
        }
        if( !location ) {
            print( `Error! Could not get location ${activity.locationId.toString()} from activity ${activity._id.toString()}` );
            continue;
        }

        let scalingFactorEntry = getRelevantDignityScalingFactor( {
                tarmedInvoiceFactorValues,
                qualiDignities: employee.qualiDignities,
                caseFolderType
            } ) || {},
            newMedicalScalingFactor = scalingFactorEntry.factor || 1,
            newPrice = calculateTarmedPrice( {
                tarmedScalingFactors: {
                    taxPointValues: tarmedTaxPointValues
                },
                treatment: Object.assign({}, activity, {medicalScalingFactor: newMedicalScalingFactor}),
                cantonCode: location.cantonCode,
                caseFolderType
            } );

        if( newPrice !== activity.price || newMedicalScalingFactor !== activity.medicalScalingFactor ) {
            if( !newPrice ) {
                print(`new price ${newPrice} is not valid for treatment ${activity._id.toString()} whith code ${activity.code}. continue with another treatment...`);
                continue;
            }

            print(`treatment ${activity._id.toString()} whith code ${activity.code} changing price from ${activity.price } to ${newPrice}`);
            print(`treatment ${activity._id.toString()} whith code ${activity.code} changing medicalScalingFactor from ${activity.medicalScalingFactor } to ${newMedicalScalingFactor}`);

            try {
                db.activities.update( {_id: activity._id}, {
                    $set: {
                        price: newPrice,
                        medicalScalingFactor: newMedicalScalingFactor
                    }
                } );
                count++;
            } catch( error ) {
                print( `Error! Error while updating old price (${activity.price}) to new price (${newPrice}) for activity ${activity._id.toString()} (${activity.code}): ${error}` );
            }
        }
    }

    print( `====== ${count} TARMED activities updated! =====` );
}

(() => {
    fixPrices();
})();
