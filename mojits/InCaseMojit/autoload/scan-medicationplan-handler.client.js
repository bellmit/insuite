/*global YUI */

YUI.add( 'scan-medicationplan-handler', function( Y ) {
    'use strict';

    /**
     * Handle scan medicaitonplan action for the given patient
     *
     * @param {object} args
     * @return {*}
     */
    Y.namespace( 'doccirrus.incase.handlers' ).scanMedicationPlan = function( args ) {
        var user = args.user;
        var patient = args.patient;
        var caseFolder = args.caseFolder;
        var inCaseSelectedDoctorParts = (Y.doccirrus.utils.localValueGet( 'incase-selected-doctor' ) || '').split( '-' );
        var matchingInsurance = Y.doccirrus.incase.kbv.vos.requestContextUtils.getMatchingInsurance( patient, caseFolder );
        return Y.doccirrus.incase.kbv.vos.requestContextUtils.requestIdentifier( {
            requestContextCode: '8',
            userId: user._id,
            patientId: patient._id,
            insuranceId: matchingInsurance && matchingInsurance._id,
            employeeId: inCaseSelectedDoctorParts[0] || matchingInsurance && matchingInsurance.employeeId,
            locationId: inCaseSelectedDoctorParts[1] || matchingInsurance && matchingInsurance.locationId,
            externalPrescriptionSoftwareUrl: args.externalPrescriptionSoftwareUrl
        } );
    };
}, '3.16.0', {
    requires: [
        'kbv-vos-request-context-utils'
    ]
} );
