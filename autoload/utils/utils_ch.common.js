/**
 * User: oliversieweke
 * Date: 26.03.19  16:40
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

'use strict';

YUI.add( 'dccommonutils-ch', function( Y, NAME ) {


        /**
         * PLEASE PAY ATTENTION AT JSDOC DESCRIPTION BEFORE YOU DO ANY CHANGES!
         * _____________________________________________________________________________________________________________
         * | Price components:
         * |
         * | - medicalTaxPoints (MTP):          medical part of price
         * | - assistanceTaxPoints (ATP):       assistance part of medical price
         * | - technicalTaxPoints (TTP):        technical part of price
         * | - medicalScalingFactor (MSF):      scaling factor for medical part. Depends on catalog value or doctor's dignity
         * | - technicalScalingFactor (TSF):    scaling factor for technical part. Depends on catalog value
         * | - taxPointValue (TPV):             scaling factor for both medical and technical parts (in percentage format e.g. 94). Depends on canton and insurance type
         * | - quantity (Q):                    treatments quantity
         * |____________________________________________________________________________________________________________
         *
         * _____________________________________________________________________________________________________________
         * | Algorithm for calculating price:
         * |
         * | - medPrice = round( (MTP + ATP) * MSF * TPV * Q )
         * | - techPrice = round( TTP * TSF * TPV * Q )
         * | - total = medPrice + techPrice
         * |____________________________________________________________________________________________________________
         * @method calculateTarmedPrice
         * @param {Object} args                                             :REQUIRED:
         * @param {Array} args.tarmedScalingFactors                         :REQUIRED: contains taxPointValues and invoiceFactorValues
         * @param {Array} args.tarmedScalingFactors.taxPointValues          :REQUIRED: taxPoint values from all canton codes
         * @param {Array} args.tarmedScalingFactors.invoiceFactorValues     :OPTIONAL: invoice factor values for doctor's qualiDignities
         * @param {String} args.cantonCode                                  :REQUIRED:
         * @param {String} args.insuranceGLN                                :OPTIONAL: If this parameter is not provided, special tax point values for special insurances will not be taken into account
         * @param {String} args.caseFolderType                              :OPTIONAL: caseFolderType
         * @param {Boolean} args.trustTreatmentScalingFactors               :OPTIONAL: If this parameter is provided, take all price scaling factors from treatment data
         * @param {Number} args.treatment                                   :REQUIRED: Should contain technical and medical tax points and factors
         * @param {Number} args.treatment.timestamp                         :OPTIONAL:
         * @param {Number} args.treatment.medicalTaxPoints                  :OPTIONAL: Medical part of price
         * @param {Number} args.treatment.technicalTaxPoints                :OPTIONAL: Technical part of price
         * @param {Number} args.treatment.assistanceTaxPoints               :OPTIONAL: Assistance part of medical price
         * @param {Number} args.treatment.medicalScalingFactor              :OPTIONAL: Scaling factor for medical part. Depends on catalog value or doctor's dignity
         * @param {Number} args.treatment.technicalScalingFactor            :OPTIONAL: Scaling factor for technical part. Depends on catalog value
         * @returns {Number}
         */
        function calculateTarmedPrice( args ) {
            var
                tarmedScalingFactors = args.tarmedScalingFactors,
                caseFolderType = args.caseFolderType || 'PRIVATE_CH',
                cantonCode = args.cantonCode,
                insuranceGLN = args.insuranceGLN,
                treatment = args.treatment || {},
                trustTreatmentScalingFactors = args.trustTreatmentScalingFactors,
                err, taxPointValue, specialValue, specialInsurances,
                date = treatment.timestamp || new Date().toJSON(),
                medicalTaxPoints = treatment.medicalTaxPoints || 0,
                technicalTaxPoints = treatment.technicalTaxPoints || 0,
                assistanceTaxPoints = treatment.assistanceTaxPoints || 0,
                medicalScalingFactor = treatment.medicalScalingFactor,
                technicalScalingFactor = treatment.technicalScalingFactor,
                quantity = Number.isFinite(treatment.dQuantity) ? treatment.dQuantity : 1,
                tarmedTaxPointValues,
                relevantTarmedTaxPointEntry,
                totalMedicalTaxPoints,
                scaledMedicalTaxPoints,
                scaledTechnicalTaxPoints,
                technicalPrice,
                medicalPrice;

            if( trustTreatmentScalingFactors ) {
                // convert stored in db format (e.g. 0.94) to percentage format (e.g. 94)
                taxPointValue = treatment.taxPointValue * 100;
            } else {
                if( !tarmedScalingFactors || !tarmedScalingFactors.taxPointValues ) {
                    err = new  Y.doccirrus.commonerrors.DCError( 'tarmed_04' ) ;
                    Y.log( 'calculateTarmedPrice(): no tarmedTaxPointValues provided for the price calculation:\n' + err.stack, 'error', NAME );
                    throw err;
                }
                tarmedTaxPointValues = tarmedScalingFactors.taxPointValues;
                if( !Array.isArray( tarmedTaxPointValues ) ) {
                    err = new  Y.doccirrus.commonerrors.DCError( 'tarmed_04' ) ;
                    Y.log( 'calculateTarmedPrice(): no tarmedTaxPointValues provided for the price calculation:\n' + err.stack, 'error', NAME );
                    throw err;
                }
                if( !cantonCode ) {
                    err = new  Y.doccirrus.commonerrors.DCError( 'tarmed_03' ) ;
                    Y.log( 'calculateTarmedPrice(): no cantonCode provided for the price calculation:\n' + err.stack, 'error', NAME );
                    throw err;
                }

                relevantTarmedTaxPointEntry = getRelevantTarmedTaxPointEntry( {
                    caseFolderType: caseFolderType,
                    cantonCode: cantonCode,
                    date: date,
                    tarmedTaxPointValues: tarmedTaxPointValues
                } );

                if( !relevantTarmedTaxPointEntry ) {
                    err = new Error( 'No relevant TARMED tax point entry found' );
                    Y.log( 'calculateTarmedPrice(): no relevant TARMED tax point entry was found for the parameters ' + {caseFolderType: caseFolderType, cantonCode: cantonCode, date: date} + ':\n${err.stack}', 'error', NAME );
                    throw err;
                }

                taxPointValue = relevantTarmedTaxPointEntry.value;
                specialValue = relevantTarmedTaxPointEntry.specialValue;
                specialInsurances = relevantTarmedTaxPointEntry.specialInsurances;

                if( specialValue && Array.isArray( specialInsurances ) && specialInsurances.includes( insuranceGLN ) ) {
                    taxPointValue = specialValue;
                }
            }

            totalMedicalTaxPoints = medicalTaxPoints + assistanceTaxPoints;
            scaledMedicalTaxPoints = totalMedicalTaxPoints * medicalScalingFactor;
            scaledTechnicalTaxPoints = technicalTaxPoints * technicalScalingFactor;

            technicalPrice = Math.round( scaledTechnicalTaxPoints * taxPointValue * quantity ) / 100;
            medicalPrice = Math.round( scaledMedicalTaxPoints * taxPointValue * quantity ) / 100;

            return technicalPrice + medicalPrice;
        }

        /**
         * @method calculateNonTarmedPrice
         *  @param {Object} args  :REQUIRED:
         *  @param {Number} args.taxPoints : Required: Defaults to 0
         * @returns {number}
         */
        function calculateNonTarmedPrice ( args ) {
            var quantity = Number.isFinite( args.dQuantity ) ? args.dQuantity : 1,
                price = args.price || args.taxPoints;
            return price * quantity || 0;
        }

        /**
         * Round price to **.*5 or **.*0 according to Swiss price policy
         * @method roundSwissPrice
         * @param {Number} number  :REQUIRED:
         * @returns {Number}
         */
        function roundSwissPrice( number ) {
            if( isNaN( number ) ) {
                return 0;
            } else {
                return Math.round( Number( number ) * 20 ) / 20;
            }
        }

        function countLastRefNumberDigit(invoiceNo) {
            var numbersTable = [
                [0, 9, 4, 6, 8, 2, 7, 1, 3, 5],
                [9, 4, 6, 8, 2, 7, 1, 3, 5, 0],
                [4, 6, 8, 2, 7, 1, 3, 5, 0, 9],
                [6, 8, 2, 7, 1, 3, 5, 0, 9, 4],
                [8, 2, 7, 1, 3, 5, 0, 9, 4, 6],
                [2, 7, 1, 3, 5, 0, 9, 4, 6, 8],
                [7, 1, 3, 5, 0, 9, 4, 6, 8, 2],
                [1, 3, 5, 0, 9, 4, 6, 8, 2, 7],
                [3, 5, 0, 9, 4, 6, 8, 2, 7, 1],
                [5, 0, 9, 4, 6, 8, 2, 7, 1, 3]
            ];
            var descendingRow = [0, 9, 8, 7, 6, 5, 4, 3, 2, 1];

            var
                rowIndex = 0,
                i;
            for( i = 0; i < invoiceNo.length; i++ ) {
                rowIndex = numbersTable[rowIndex][invoiceNo[i]];
            }
            return descendingRow[rowIndex];
        }

        function getRelevantTarmedTaxPointEntry ( args ) {
            var
                caseFolderType = args.caseFolderType,
                cantonCode = args.cantonCode,
                tarmedTaxPointValues = args.tarmedTaxPointValues,
                date = args.date;

            var law = Y.doccirrus.schemas.casefolder.caseFolderTypeToLaw( caseFolderType );

            return tarmedTaxPointValues.find( function(entry) {
                var isMatchingLaw = entry.law === law;
                if(law !== 'KVG') {
                    return isMatchingLaw;
                }
                var isValidDateRange = new Date( entry.validFrom ) < new Date( date ),
                    isMatchingCantonCode = entry.cantonCode === cantonCode,
                    isNotExpired = (!entry.validUntil || Date( entry.validUntil ) > Date( date ));

                return isMatchingLaw && isValidDateRange && isMatchingCantonCode && isNotExpired;
            } );
        }

        function getRelevantDignityScalingFactor( args ) {
            var
                tarmedInvoiceFactorValues = args.tarmedInvoiceFactorValues || [],
                qualiDignities = args.qualiDignities || [],
                caseFolderType = args.caseFolderType;
            return tarmedInvoiceFactorValues.find( function( value ) {
                return value.caseTypes.includes( caseFolderType ) && qualiDignities.includes( value.qualiDignity );
            } );
        }

        function getSwissCatalogsShort(caseFolderType) {
            if(!caseFolderType) {
                return ['TARMED', 'TARMED_UVG_IVG_MVG', 'EAL', 'MIGEL', 'ARZT_KVG_VVG', 'Pandemieleistungen', 'AMV'];
            }
            switch( caseFolderType ) {
                case 'PRIVATE_CH':
                    return ['TARMED', 'EAL', 'MIGEL', 'ARZT_KVG_VVG', 'Pandemieleistungen'];
                case 'PRIVATE_CH_VVG':
                    return ['TARMED', 'EAL', 'MIGEL', 'ARZT_KVG_VVG'];
                case 'PRIVATE_CH_UVG':
                    return ['TARMED_UVG_IVG_MVG', 'EAL', 'MIGEL', 'AMV'];
                case 'PRIVATE_CH_MVG':
                    return ['TARMED_UVG_IVG_MVG', 'EAL', 'MIGEL', 'Pandemieleistungen'];
                case 'PRIVATE_CH_IVG':
                    return ['TARMED_UVG_IVG_MVG', 'EAL', 'MIGEL'];
            }
            return [];
        }

        function calculateHCIPriceSale( priceCost ) {
            priceCost = parseFloat(priceCost);
            function calculatePrice( fixed, mult ) {
                var price = (priceCost + fixed + priceCost * mult) * percentage;
                return Math.round( price * 100 ) / 100;
            }
            var percentage = 1.08;
            if( priceCost === 0 ) {
                return 0;
            } else if( priceCost <= 5.00 ) {
                return calculatePrice( 4, 0.12 );
            } else if( priceCost < 10.00 ) {
                return calculatePrice( 8, 0.12 );
            } else if( priceCost < 15.00 ) {
                return calculatePrice( 12, 0.12 );
            } else if( priceCost < 880.00 ) {
                return calculatePrice( 16, 0.12 );
            } else if( priceCost < 2570.00 ) {
                return calculatePrice( 60, 0.07 );
            } else if( priceCost >= 2570.00 ) {
                return calculatePrice( 240, 0 );
            }
        }

        /**
         * Calculates medication price with vat
         *
         * @PUBLIC
         * @method calculateMedicationPriceWithVat
         *
         * @param {Object} args                     :REQUIRED:
         * @param {Number} args.vatTypeCatalog      :REQUIRED:
         * @param {Number} args.phPriceSaleCatalog  :REQUIRED:
         * @param {Number} args.phPriceSale         :REQUIRED:
         * @param {Number} args.vatType             :REQUIRED:
         * @param {Number} args.currentVatType      :REQUIRED:
         * @param {Number} args.vat                 :REQUIRED:

         * @returns {number}
         */
        function calculateMedicationPriceWithVat( args ) {
            var initialVatType = args.vatTypeCatalog,
                initialSalePrice = args.phPriceSaleCatalog,
                currentSalePrice = args.phPriceSale,
                currentVatType = args.currentVatType,
                newVatType = args.vatType,
                newVat = args.vat || Y.doccirrus.schemas.instock.getVatByVatType( newVatType ),
                newVatPercent = Y.doccirrus.vat.getPercent( newVat ),
                initialVat, initialVatPercent, catalogNettoPrice, newPriceWithVat;

            if( !Number.isFinite( initialVatType ) ) {
                initialVatType = currentVatType;
            }

            if( !initialSalePrice ) {
                initialSalePrice = currentSalePrice;
            }

            initialVat = Y.doccirrus.schemas.instock.getVatByVatType( initialVatType );
            initialVatPercent = Y.doccirrus.vat.getPercent( initialVat );

            if( initialVatType === newVatType || initialVat === newVat ) {
                return initialSalePrice;
            }

            catalogNettoPrice = initialSalePrice / (100 + initialVatPercent) * 100;
            newPriceWithVat = catalogNettoPrice * (100 + newVatPercent) / 100;

            return newPriceWithVat;
        }

        /**
         * Convert vat to vatType
         * @method vatToVatType
         * @param {Number} vat  :REQUIRED:
         * @returns {Number}
         */
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

        Y.namespace( 'doccirrus' ).commonutilsCh = {
            calculateTarmedPrice: calculateTarmedPrice,
            calculateNonTarmedPrice: calculateNonTarmedPrice,
            calculateHCIPriceSale: calculateHCIPriceSale,
            countLastRefNumberDigit: countLastRefNumberDigit,
            getRelevantTarmedTaxPointEntry: getRelevantTarmedTaxPointEntry,
            getSwissCatalogsShort: getSwissCatalogsShort,
            roundSwissPrice: roundSwissPrice,
            calculateMedicationPriceWithVat: calculateMedicationPriceWithVat,
            getRelevantDignityScalingFactor: getRelevantDignityScalingFactor,
            vatToVatType: vatToVatType
        };

    },
    '0.0.1', {
        requires: [
            'oop',
            'dccommonutils',
            'dccommonerrors'
        ]
    }
);
