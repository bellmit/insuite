/*global YUI, ko */

YUI.add( 'open-medicationplan-handler', function( Y ) {
    'use strict';

    var unwrap = ko.unwrap;

    /**
     * Handle medicationplan open action for the given patient
     *
     * @param {object} args
     * @return {*}
     */
    Y.namespace( 'doccirrus.incase.handlers' ).openMedicationPlan = function( args ) {
        var user = args.user;
        var patient = args.patient;
        var caseFolder = args.caseFolder;
        var medication = args.medication;
        var matchingInsurance = Y.doccirrus.incase.kbv.vos.requestContextUtils.getMatchingInsurance( patient, caseFolder );
        return Y.doccirrus.incase.kbv.vos.requestContextUtils.requestIdentifier( {
            requestContextCode: '6',
            userId: user._id,
            patientId: patient._id,
            insuranceId: matchingInsurance && matchingInsurance._id,
            employeeId: unwrap( medication.employeeId ),
            locationId: unwrap( medication.locationId ),
            externalPrescriptionSoftwareUrl: args.externalPrescriptionSoftwareUrl
        } );
    };
}, '3.16.0', {
    requires: [
        'kbv-vos-request-context-utils'
    ]
} );
