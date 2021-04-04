/**
 * User: dcdev
 * Date: 1/5/21  2:37 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/* global db:true */
print( '==== KAT-330: Fix overpaid invoices ====' );
db = db.getSiblingDB( "0" );

function calculateSwissInvoiceTotal( args ) {
    var linkedActivities = args.linkedActivities || [],
        caseFolderType = args.caseFolderType || '',
        treatments,
        medications,
        activitiesBulks,
        mappedTreatments,
        mappedMedications,
        total = 0, totalVat = 0;

    treatments = linkedActivities.filter( function( l ) {
        return l.actType === 'TREATMENT';
    } );

    medications = linkedActivities.filter( function( l ) {
        return l.actType === 'MEDICATION';
    } );

    activitiesBulks = mapActivitiesIntoBulks( {
        treatments: treatments,
        medications: medications
    } );
    mappedTreatments = activitiesBulks.treatmentsBulks.reduce( function( result, array ) {
        return result.concat( array || [] );
    }, [] );
    mappedMedications = activitiesBulks.medicationsBulks.reduce( function( result, array ) {
        return result.concat( array || [] );
    }, [] );

    mappedTreatments.forEach( function( treatment ) {
        var quantity = treatment.dQuantity,
            itemPrice = 0;

        if( treatment.catalog && ['TARMED', 'TARMED_UVG_IVG_MVG'].includes( treatment.catalogShort ) ) {
            itemPrice = calculateTarmedPrice( {
                treatment: treatment,
                caseFolderType,
                trustTreatmentScalingFactors: true
            } );
        } else {
            itemPrice = calculateNonTarmedPrice( treatment );
        }
        totalVat += treatment.vatAmount * quantity || 0;
        total += itemPrice;
    } );

    mappedMedications.forEach( function( medication ) {
        var quantity = medication.dQuantity,
            medicationVatType = Number.isFinite( medication.vatType ) ? medication.vatType : vatToVatType( medication.vat ),
            nettoItemPrice = calculateMedicationPriceWithVat( {
                phPriceSale: medication.phPriceSale,
                currentVatType: medicationVatType,
                vatType: 0,
                vat: 1003
            } ),
            vatDifference = medication.phPriceSale - nettoItemPrice;

        totalVat += vatDifference * quantity || 0;
        total += nettoItemPrice * quantity || 0;
    } );

    return {
        total: total,
        totalVat: totalVat
    };
}

function mapActivitiesIntoBulks( args ) {
    var treatments = args.treatments || [],
        medications = args.medications || [],
        treatmentArraysPartitionedByDate = getDatePartitionedArray( treatments ) || [],
        medicationArraysPartitionedByDate = getDatePartitionedArray( medications ) || [],
        treatmentsBulks, medicationsBulks;

    treatmentArraysPartitionedByDate.forEach( function( part ) {
        divideActivitiesSessions( part );
    } );

    treatmentsBulks = treatmentArraysPartitionedByDate.map( function( part ) {
        return distinctActivitiesBy( part, ['code', 'side'] );
    } );
    medicationsBulks = medicationArraysPartitionedByDate.map( function( part ) {
        return distinctActivitiesBy( part, ['code', 'side'] );
    } );

    return {
        treatmentsBulks: treatmentsBulks || [],
        medicationsBulks: medicationsBulks || []
    };
}

function divideActivitiesSessions( activities ) {
    var lSessionNumber = 1,
        activityFound = activities.find( function( a ) {
            return a.daySeparation;
        } );

    if( !activityFound ) {
        return;
    }
    activities = activities.map( function( a ) {
        a.timestamp = new Date( a.timestamp );
        return a;
    } ).sort( function( a, b ) {
        return a.timestamp - b.timestamp;
    } );
    activities.forEach( function( activity, index ) {
        if( activity.daySeparation && index !== 0 ) {
            lSessionNumber++;
        }
        activity.lSessionNumber = lSessionNumber;
    } );
}

function distinctActivitiesBy( activities, parameters ) {
    var distinctActivities = [];
    activities = activities || [];

    activities.forEach( function( activity ) {
        var sameParameterExists = distinctActivities.find( function( distinct ) {
            var allMatch = distinct.lSessionNumber === activity.lSessionNumber,
                i;

            for( i = 0; i < parameters.length; i++ ) {
                if( !allMatch ) {
                    break;
                }
                allMatch = allMatch && distinct[parameters[i]] === activity[parameters[i]];
            }
            return allMatch;
        } );
        if( !sameParameterExists ) {
            const dQuantity = activities.filter( function( a ) {
                var allMatch = a.lSessionNumber === activity.lSessionNumber,
                    j;

                for( j = 0; j < parameters.length; j++ ) {
                    if( !allMatch ) {
                        break;
                    }
                    allMatch = allMatch && a[parameters[j]] === activity[parameters[j]];
                }
                return allMatch;
            } ).length;
            distinctActivities.push( Object.assign( {}, {dQuantity: dQuantity}, activity ) );
        }
    } );
    return distinctActivities;
}

function getDatePartitionedArray( array ) {
    var idx = -1,
        result = [],
        i;
    if( !array ) {
        return result;
    }
    for( i = array.length - 1; i >= 0; i-- ) {
        if( i === array.length - 1 ) {
            idx = i;
        } else {
            if( array[i].timestamp.toISOString().split( 'T' )[0] !== array[idx].timestamp.toISOString().split( 'T' )[0] ) {
                result.push( array.slice( i + 1, idx + 1 ) );
                idx = i;
            }
        }
    }
    if( idx > -1 ) {
        result.push( array.slice( 0, idx + 1 ) );
    }
    return result;
}

function calculateTarmedPrice( args ) {
    var
        treatment = args.treatment || {},
        caseFolderType = args.caseFolderType,
        taxPointValue,
        medicalTaxPoints = treatment.medicalTaxPoints || 0,
        technicalTaxPoints = treatment.technicalTaxPoints || 0,
        assistanceTaxPoints = treatment.assistanceTaxPoints || 0,
        medicalScalingFactor = treatment.medicalScalingFactor,
        technicalScalingFactor = treatment.technicalScalingFactor,
        quantity = Number.isFinite( treatment.dQuantity ) ? treatment.dQuantity : 1,
        totalMedicalTaxPoints,
        scaledMedicalTaxPoints,
        scaledTechnicalTaxPoints,
        technicalPrice,
        medicalPrice;

    taxPointValue = treatment.taxPointValue * 100;

    if( medicalScalingFactor === 1 && caseFolderType === 'PRIVATE_CH' ) {
        const employee = db.employees.findOne( {_id: ObjectId( treatment.employeeId )}, {qualiDignities: 1} );
        if( employee && employee.qualiDignities && employee.qualiDignities.includes( '3000' ) ) {
            medicalScalingFactor = 0.93;
        }
    }

    if(medicalScalingFactor !== treatment.medicalScalingFactor) {
        print('treatment ' + treatment.code + ' in quantity of ' + quantity + ' has ' + treatment.medicalScalingFactor + ' medical scaling factor, but script calculated it as ' + medicalScalingFactor + '. caseFolderType: ' + caseFolderType );
    } else {
        print('treatment ' + treatment.code + ' in quantity of ' + quantity + ' has ' + treatment.medicalScalingFactor + ' medical scaling factor. caseFolderType: ' + caseFolderType );
    }

    totalMedicalTaxPoints = medicalTaxPoints + assistanceTaxPoints;
    scaledMedicalTaxPoints = totalMedicalTaxPoints * medicalScalingFactor;
    scaledTechnicalTaxPoints = technicalTaxPoints * technicalScalingFactor;

    technicalPrice = Math.round( scaledTechnicalTaxPoints * taxPointValue * quantity ) / 100;
    medicalPrice = Math.round( scaledMedicalTaxPoints * taxPointValue * quantity ) / 100;

    return technicalPrice + medicalPrice;
}

function calculateNonTarmedPrice( args ) {
    var quantity = Number.isFinite( args.dQuantity ) ? args.dQuantity : 1,
        price = args.price || args.taxPoints;
    return price * quantity || 0;
}

function vatToVatType( vat ) {
    switch( vat ) {
        case 1001:
            return 1;
        case 1002:
            return 2;
        case 1003:
            return 0;
        default:
            return 0;
    }
}

function calculateMedicationPriceWithVat( args ) {
    var initialVatType = args.vatTypeCatalog,
        initialSalePrice = args.phPriceSaleCatalog,
        currentSalePrice = args.phPriceSale,
        currentVatType = args.currentVatType,
        newVatType = args.vatType,
        newVat = args.vat || getVatByVatType( newVatType ),
        newVatPercent = getPercent( newVat ),
        initialVat, initialVatPercent, catalogNettoPrice, newPriceWithVat;

    if( !Number.isFinite( initialVatType ) ) {
        initialVatType = currentVatType;
    }

    if( !initialSalePrice ) {
        initialSalePrice = currentSalePrice;
    }

    initialVat = getVatByVatType( initialVatType );
    initialVatPercent = getPercent( initialVat );

    if( initialVatType === newVatType || initialVat === newVat ) {
        return initialSalePrice;
    }

    catalogNettoPrice = initialSalePrice / (100 + initialVatPercent) * 100;
    newPriceWithVat = catalogNettoPrice * (100 + newVatPercent) / 100;

    return newPriceWithVat;
}

function getVatByVatType( vatType ) {
    return vatType === 0 ? 1003 : parseFloat( '100' + vatType.toString() );
}

function getPercent( code ) {
    var percent = getByCode( code ) || {};

    return percent.percent || 0;
}

function getByCode( code ) {
    const vat = [
        {
            "code": 1001,
            "percent": 7.7,
            "description": "7,7%",
            "padxstring": "Voller Umsatzsteuersatz",
            "countryMode": "CH"
        },
        {
            "code": 1002,
            "percent": 2.5,
            "description": "2,5%",
            "padxstring": "Reduzierter Umsatzsteuersatz",
            "countryMode": "CH"
        },
        {
            "code": 1003,
            "percent": 0,
            "description": "0,0%",
            "padxstring": "Ohne Umsatzsteuer",
            "countryMode": "CH"
        }
    ];
    return vat.find( entry => code === entry.code );
}

// ---------------------------------------------------
let count = 0, correctCount = 0;
const overpaidInvoiceQuery = {
    actType: {
        $in: ['INVOICEREF', 'INVOICE']
    },
    status: {
        $in: ['BILLED', 'APPROVED']
    },
    patImportId: {$exists: false},
    timestamp: {
        $gte: ISODate("2020-06-01T00:00:00.539Z")
    }
};
db.activities.find( overpaidInvoiceQuery ).forEach( invoice => {
    const caseFolder = db.casefolders.findOne({
        _id: ObjectId( invoice.caseFolderId )
    } ) || {};
    const linkedActivities = db.activities.find( {
        _id: {
            $in: invoice.activities.map( id => {
                switch( typeof id) {
                    case 'string':
                        let resultId;
                        try {
                            resultId = ObjectId( id );
                        } catch( e ) {
                            print('Failed to create ObjectId out of: ' + id + '. Invoice id: ' + invoice._id.toString());
                            resultId = new ObjectId();
                        }
                        return resultId;
                    case 'object':
                        return id;
                    default:
                        return new ObjectId()
                }
            } )
        },
        actType: {
            $in: ['TREATMENT', 'MEDICATION']
        }
    } ).toArray();

    const totals = calculateSwissInvoiceTotal( {linkedActivities, caseFolderType: caseFolder.type} );
    const total = totals.total,
        totalVat = totals.totalVat,
        totalWithVat = total + totalVat;

    const newBeforetax = Math.round( total * 100 ) / 100,
        newTotalVat = Math.round( totalVat * 100 ) / 100,
        newTotal = Math.round( totalWithVat * 100 ) / 100,
        newPrice = Math.round( totalWithVat * 20 ) / 20;

    if( invoice.beforetax !== newBeforetax ||
        invoice.totalVat !== newTotalVat ||
        invoice.total !== newTotal ||
        invoice.price !== newPrice ) {

        db.KAT_330_overpaid_invoices_2.insertOne( invoice );
        const newTotalReceiptsOutstanding = newPrice - parseFloat( invoice.totalReceipts );

        print( '---- Update invoice ' + invoice._id.toString() + ' price from ' + invoice.price + ' to ' + newPrice );
        const result = db.activities.update( {
            _id: invoice._id
        }, {
            $set: {
                beforetax: newBeforetax,
                totalVat: newTotalVat,
                total: newTotal,
                price: newPrice,
                totalReceiptsOutstanding: newTotalReceiptsOutstanding
            }
        } );
        count += result.nModified;
    } else {
        print( '---- Invoice ' + invoice._id.toString() + ' price ' + invoice.price + ' is correct' );
        correctCount++;
    }
} );

print( '==== KAT-330: Fixed ' + count + ' overpaid invoices.' + correctCount + ' Invoices were correct ====' );
