/**
 * User: do
 * Date: 29/07/15  15:17
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'dcinvoiceutils', function( Y, NAME ) {
    'use strict';

    var _k = Y.dcforms.mapper.koUtils.getKo();

    function setValue( obj, attrName, value ) {
        if('function' === obj[attrName]){
            obj[attrName](value);
        } else {
            obj[attrName] = value;
        }
    }

    function calcTreatment( treatment ) {

        Y.log( 'calculate Treatment costs for ' + (treatment._id && treatment._id.toString() ), 'debug', NAME );

        var price,
            hasVat, vatType,
            u_extra = _k.unwrap( treatment.u_extra );

        price = treatment.price ? _k.unwrap( treatment.price ) : 0.00;
        price = +(parseFloat( price ));

        // vat is a vat code, we still need to calculate the amount
        hasVat = _k.unwrap( treatment.hasVat );
        vatType = hasVat ? ( treatment.vat ? _k.unwrap( treatment.vat ) : 0) : 0;

        setValue( treatment, 'vatAmount', Y.doccirrus.vat.calculateAmt( price, vatType ) || 0 );

        if( !u_extra ) {
            return treatment;
        }

        setValue( treatment, 'BSK', _k.unwrap( treatment.specialCosts ) || 0 );
        setValue( treatment, 'ASK', _k.unwrap( treatment.generalCosts ) || 0 );
        setValue( treatment, 'AHB', +(u_extra.tarifvertrag && u_extra.tarifvertrag.bg_ahb ) || 0 );
        setValue( treatment, 'BHB', +(u_extra.tarifvertrag && u_extra.tarifvertrag.bg_bhb ) || 0 );

        return treatment;
    }

    function calcInvoice( invoice, additionalScheinData, linkedActivities ) {

        Y.log( 'Calculating invoice totals for ' + (invoice._id && invoice._id.toString() ), 'info', NAME );

        var
            hasOP = false,
            totalReceipts = (_k.unwrap( invoice.totalReceipts ) || 0),
            total = 0,
            totalVat = 0,
            totalASK = 0,
            totalBSK = 0,
            totalAHB = 0,
            totalBHB = 0,
            totalExpense = 0,
            swissTotals,
            swissTotal = 0,
            isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland();

        linkedActivities.forEach( function( activity ) {

            if( 'TREATMENT' !== _k.unwrap( activity.actType ) ) {
                return;
            }

            if( activity.costType && _k.unwrap( activity.costType ) && '' !== _k.unwrap( activity.costType ) ) {
                if( additionalScheinData.actType === 'PKVSCHEIN' ) {
                    totalExpense += activity.price;
                }
            } else {
                totalASK += activity.ASK || 0;
                totalBSK += activity.BSK || 0;
                totalAHB += activity.AHB || 0;
                totalBHB += activity.BHB || 0;
            }

            if(
                _k.unwrap( activity.fk5025 ) ||
                _k.unwrap( activity.fk5026 ) ||
                _k.unwrap( activity.fk5034 )
            ) {
                hasOP = true;
            }

            totalVat += activity.vatAmount || 0;
            total += activity.price || 0;

        } );

        linkedActivities.forEach( function( activity ) {

            if( 'MEDICATION' !== _k.unwrap( activity.actType ) ) {
                return;
            }

            totalVat += Y.doccirrus.vat.calculateAmt( activity.phPriceSale, activity.vat ) || 0;
            total += activity.phPriceSale || 0;

        } );

        //  if the schein treatmentType is 'STATIONARY', then the invoice should appear in 'Rechnungen stationär' reporting, MOJ-10680
        if ( 'STATIONARY' === additionalScheinData.treatmentType ) { hasOP = true; }

        if( isSwiss ) {
            swissTotals = calculateSwissInvoiceTotal({
                linkedActivities: linkedActivities
            });
            total = swissTotals.total;
            totalVat = swissTotals.totalVat;
            swissTotal = total + totalVat;
        }

        total = Math.round( total * 100 ) / 100;
        totalVat = Math.round( totalVat * 100 ) / 100;
        totalASK = Math.round( totalASK * 100 ) / 100;
        totalBSK = Math.round( totalBSK * 100 ) / 100;
        totalAHB = Math.round( totalAHB * 100 ) / 100;
        totalBHB = Math.round( totalBHB * 100 ) / 100;

        setValue( invoice, 'totalWithoutExpenses', total - totalASK );
        setValue( invoice, 'totalDoc', total - totalASK );
        setValue( invoice, 'total75', total * 0.75 );
        setValue( invoice, 'total25', total * 0.25 );
        setValue( invoice, 'total15', total * 0.15 );
        setValue( invoice, 'totalOwing', total - (totalReceipts / 100) );

        if( 'AMBULANT' === additionalScheinData.treatmentType && true === additionalScheinData.includesBSK ) {
            total += totalBSK;
        } else if( 'STATIONARY' === additionalScheinData.treatmentType && !additionalScheinData.includesBSK && !additionalScheinData.isChiefPhysician ) {
            total = total * 0.85;
        } else if( 'STATIONARY' === additionalScheinData.treatmentType && !additionalScheinData.includesBSK && true === additionalScheinData.isChiefPhysician ) {
            total = total * 0.75;
        } else if( 'STATIONARY' === additionalScheinData.treatmentType && true === additionalScheinData.includesBSK && !additionalScheinData.isChiefPhysician ) {
            total = total * 0.85;
            total += totalBSK;
        } else if( 'STATIONARY' === additionalScheinData.treatmentType && true === additionalScheinData.includesBSK && true === additionalScheinData.isChiefPhysician ) {
            total = total * 0.75;
            total += totalBSK;
        }

        setValue( invoice, 'hasOP', hasOP ); // this one is from generic form mapper
        setValue( invoice, 'beforetax', total );
        setValue( invoice, 'totalVat', totalVat );
        setValue( invoice, 'total', isSwiss ? swissTotal : total + totalVat );
        setValue( invoice, 'totalASK', totalASK );
        setValue( invoice, 'totalBSK', totalBSK );
        setValue( invoice, 'totalAHB', totalAHB );
        setValue( invoice, 'totalBHB', totalBHB );
        setValue( invoice, 'price', isSwiss ? Y.doccirrus.commonutilsCh.roundSwissPrice( swissTotal ) :
            total + totalVat );
        setValue( invoice, 'totalExpense', totalExpense );
    }

    /**
     * Calculates total for swiss invoicing using swiss price calculation logic
     * @param {Object} args                         :REQUIRED:
     * @param {Array} args.linkedActivities         :REQUIRED:
     * @returns {Object} containing total price and totalVat price
     */
    function calculateSwissInvoiceTotal( args ) {
        var linkedActivities = args.linkedActivities || [],
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

        activitiesBulks = Y.doccirrus.sumexutils.mapActivitiesIntoBulks( {
            treatments: treatments,
            medications: medications
        } );
        mappedTreatments = activitiesBulks.treatmentsBulks.reduce( function( result, array ) {
            return result.concat( array || [] );
        }, [] );
        mappedMedications = activitiesBulks.medicationsBulks.reduce( function( result, array ) {
            return result.concat( array || [] );
        }, [] );

        mappedTreatments.forEach( function (treatment) {
            var quantity = treatment.dQuantity,
                itemPrice = 0;

            if( treatment.catalog && Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.includes(treatment.catalogShort) ) {
                itemPrice = Y.doccirrus.commonutilsCh.calculateTarmedPrice( {
                    treatment: treatment,
                    trustTreatmentScalingFactors: true
                } );
            } else {
                itemPrice = Y.doccirrus.commonutilsCh.calculateNonTarmedPrice( treatment );
            }
            totalVat += treatment.vatAmount * quantity || 0;
            total += itemPrice;
        } );

        mappedMedications.forEach( function( medication ) {
            var quantity = medication.dQuantity,
                medicationVatType = Number.isFinite( medication.vatType ) ? medication.vatType : Y.doccirrus.commonutilsCh.vatToVatType( medication.vat ),
                nettoItemPrice = Y.doccirrus.commonutilsCh.calculateMedicationPriceWithVat( {
                    phPriceSale: medication.phPriceSale,
                    currentVatType: medicationVatType,
                    vatType: 0,
                    vat: 1003
                } ),
                vatDifference = medication.phPriceSale - nettoItemPrice;

            totalVat += vatDifference * quantity || 0;
            //not using Y.doccirrus.commonutilsCh.calculatePriceWithVat since vat is calculated separately here
            total += nettoItemPrice * quantity || 0;
        } );

        return {
            total: total,
            totalVat: totalVat
        };
    }

    function generateQuarterList( nYears ) {
        var i, j,
            list = [],
            mom = Y.doccirrus.commonutils.getMoment(),
            today = mom(),
            quarter = today.quarter(),
            year = today.year();
        for( i = 0; i < nYears; i++ ) {
            year = year - i;
            for( j = quarter; j > 0; j-- ) {
                list.push( {
                    quarter: {
                        quarter: j,
                        year: year
                    },
                    text: j + '/' + year
                } );
            }
            quarter = 4;
        }
        return list;
    }

    /**
     *  This return tessiner code string
     *
     *  @param  diagnosis      {Object}    Diagnosis activity
     *  @param  callback       {Function}  callback function
     */

    function getTessinerCode( diagnosis, callback ) {
        var
            string = '';

        if( !diagnosis ) {
            return callback( Y.doccirrus.errors.rest( '18035' ) );
        }

        if( 'DIAGNOSIS' !== diagnosis.actType ) {
            return callback( Y.doccirrus.errors.rest( '18036' ) );
        }

        if( !diagnosis.code ) {
            return callback( Y.doccirrus.errors.rest( '18037' ) );
        }

        if( 'TESS-KAT' !== diagnosis.catalogShort ) {
            return callback( Y.doccirrus.errors.rest( '18038' ) );
        }

        if( diagnosis.code ) {
            string += (diagnosis.code + ' ');
        }

        if( diagnosis.diagnosisLaterality ) {
            string += (diagnosis.diagnosisLaterality + ' ');
        }

        if( diagnosis.diagnosisPeriod ) {
            string += (diagnosis.diagnosisPeriod + ' ');
        }

        if( diagnosis.diagnosisInfectious ) {
            string += '05 ';
        }
        if( diagnosis.diagnosisFunctional ) {
            string += '06 ';
        }
        if( diagnosis.diagnosisNeoplasia ) {
            string += '07 ';
        }
        if( diagnosis.diagnosisOcupationally ) {
            string += '08 ';
        }
        return callback( null, string );
    }


    Y.namespace( 'doccirrus' ).invoiceutils = {
        calcTreatment: calcTreatment,
        calcInvoice: calcInvoice,
        generateQuarterList: generateQuarterList,
        getTessinerCode: getTessinerCode,
        calculateSwissInvoiceTotal: calculateSwissInvoiceTotal
    };

}, '0.0.1', {requires: ['dcformmap-ko-util', 'dccommonutils', 'dcsumexutils']} );
