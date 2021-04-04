/**
 * User: do
 * Date: 03/06/15  12:38
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * User: rrrw
 * Date: 12.02.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'cardreadercommon', function( Y ) {
        'use strict';

        /**
         *
         * @param {Object} parameters
         * @param {Array} parameters.patientFromCard Addresses of 'patientFromCard'
         * @param {Array} parameters.patient Addresses of 'patient'
         * @return {Array} The merged addresses
         */
        function handleAddressesFromUpdate( parameters ) {
            var addressesMerged = [],
                handledAddressKinds = ['OFFICIAL', 'POSTBOX'],
                patientFromCardAddressesRef = Y.clone( parameters.patientFromCard, true ),
                patientAddressesRef = Y.clone( parameters.patient, true );

            // remove OFFICIAL and POSTBOX as they will be used from card
            patientAddressesRef = Y.Array.filter( patientAddressesRef, function( address ) {
                return handledAddressKinds.indexOf( address.kind ) === -1;
            } );
            // merge in addresses from card
            Y.each( handledAddressKinds, function( addressKind ) {
                var patientFromCardAddress = Y.Array.find( patientFromCardAddressesRef, function( address ) {
                    return address.kind === addressKind;
                } );
                if( patientFromCardAddress ) {
                    addressesMerged.push( patientFromCardAddress );
                }
            } );
            // push remaining patient addresses
            addressesMerged.push.apply( addressesMerged, patientAddressesRef );
            // done
            return addressesMerged;
        }

        // MOJ-14319: [OK] [CARDREAD]
        function getPublicInsurance( patient ) {
            var found;
            if( !Array.isArray( patient.insuranceStatus ) || !patient.insuranceStatus.length ) {
                return;
            }

            patient.insuranceStatus.some( function( insurance ) {
                if( 'PUBLIC' === insurance.type ) {
                    found = insurance;
                    return true;
                }
            } );
            return found;
        }

        function updatePatient( patient, patientFromCard ) {
            var
                mergedPatient,
                mergedAddresses,
                publicInsurancePatient = getPublicInsurance( patient ),
                publicInsurancePatientFromCard = getPublicInsurance( patientFromCard );

            // remove kvkHistoricalNo on "Kassenwechsel"
            if( (publicInsurancePatient && publicInsurancePatient.insuranceGrpId ) &&
                (publicInsurancePatientFromCard && publicInsurancePatientFromCard.insuranceGrpId) ) {

                if( publicInsurancePatient.insuranceGrpId !== publicInsurancePatientFromCard.insuranceGrpId ) {
                    publicInsurancePatient.kvkHistoricalNo = '';
                }
            }
            // merge addresses
            mergedAddresses = handleAddressesFromUpdate( {
                patient: patient.addresses,
                patientFromCard: patientFromCard.addresses
            } );
            // deep merge patient objects
            mergedPatient = Y.aggregate( patient, patientFromCard, true );
            // reapply the merged addresses (aggregate surely messed them up)
            mergedPatient.addresses = mergedAddresses;
            return mergedPatient;
        }

        Y.namespace( 'doccirrus' ).cardreadercommon = {
            updatePatient: updatePatient
        };

    },
    '0.0.1', {requires: [
        'oop'
    ]}
);
