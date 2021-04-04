/*global YUI, ko */

YUI.add( 'repeat-prescription-handler', function( Y ) {
    'use strict';

    var unwrap = ko.unwrap;

    /**
     * Handle repeat-prescription action for the given patient
     *
     * @param {object} args
     * @return {*}
     */
    Y.namespace( 'doccirrus.incase.handlers' ).repeatPrescription = function( args ) {
        var user = args.user;
        var patient = args.patient;
        var caseFolder = args.caseFolder;
        var prescriptionId = unwrap( args.prescription._id );
        var matchingInsurance = Y.doccirrus.incase.kbv.vos.requestContextUtils.getMatchingInsurance( patient, caseFolder );
        return Y.doccirrus.incase.kbv.vos.requestContextUtils.requestIdentifier( {
            requestContextCode: '3',
            userId: user._id,
            patientId: patient._id,
            insuranceId: matchingInsurance && matchingInsurance._id,
            employeeId: unwrap( args.prescription.employeeId ),
            locationId: unwrap( args.prescription.locationId ),
            requestId: prescriptionId,
            externalPrescriptionSoftwareUrl: args.externalPrescriptionSoftwareUrl
        } );
    };
}, '3.16.0', {
    requires: [
        'kbv-vos-request-context-utils'
    ]
} );
