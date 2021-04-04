/*global YUI, ko */

YUI.add( 'update-medicationplan-handler', function( Y ) {
    'use strict';

    var unwrap = ko.unwrap;

    /**
     * Handle medicationplan update action for the given patient
     *
     * @param {object} args
     * @return {*}
     */
    Y.namespace( 'doccirrus.incase.handlers' ).updateMedicationPlan = function( args ) {
        var user = args.user;
        var patient = args.patient;
        var caseFolder = args.caseFolder;
        var medicationPlan = args.medicationPlan;
        var matchingInsurance = Y.doccirrus.incase.kbv.vos.requestContextUtils.getMatchingInsurance( patient, caseFolder );
        return Y.doccirrus.incase.kbv.vos.requestContextUtils.requestIdentifier( {
            requestContextCode: '9',
            userId: user._id,
            patientId: patient._id,
            insuranceId: matchingInsurance && matchingInsurance._id,
            employeeId: unwrap( medicationPlan.employeeId ),
            locationId: unwrap( medicationPlan.locationId ),
            externalPrescriptionSoftwareUrl: args.externalPrescriptionSoftwareUrl,
            documents: medicationPlan.attachedMedia().filter( function( media ) {
                return ['application/pdf', 'application/xml'].indexOf( unwrap( media.contentType ) ) !== -1;
            } ).map( function( media ) {
                return {media: unwrap( media.mediaId )};
            } )
        } );
    };
}, '3.16.0', {
    requires: [
        'kbv-vos-request-context-utils'
    ]
} );
