/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'GadgetConstants', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module GadgetConstants
     */

    Y.namespace( 'doccirrus.gadget.constants' );
    var
        GADGET_CONST = Y.doccirrus.gadget.constants,

        PATH_GADGET = 'DocCirrus/autoload/Gadget/',

        gadgetConstants = {},
        layoutConstants = {};

    /**
     * Paths used by gadgets or layouts
     * @type {Object}
     */
    GADGET_CONST.paths = Object.freeze( {
        GADGET: PATH_GADGET,
        TPL_BASE: PATH_GADGET + 'base/views/',
        TPL_EXAMPLE: PATH_GADGET + 'example/views/',
        TPL_PATIENT: PATH_GADGET + 'patient/views/'
    } );

    /**
     * Constants of gadget names
     * @type {Object}
     */
    // NOTE: If a defined is removed it can't be used anymore, definitions are incremental!
    GADGET_CONST.gadgetNames = Object.freeze( {

        ExampleGadget: 5,
        ExampleEditableGadget: 6,
        ExampleReportGadget: 29,

        PatientGadgetProfileImage: 10,
        PatientGadgetCommunications: 11,
        PatientGadgetInsuranceStatus: 12,
        PatientGadgetCrm: 13,
        PatientGadgetAttachedContentInfo: 14,
        PatientGadgetMarkers: 15,
        PatientGadgetCommentWithNextAppointmentAndTask: 16,
        PatientGadgetLastHistory: 17,
        PatientGadgetLastFinding: 18,
        PatientGadgetDiagnosisTypeContinuous: 19,
        PatientGadgetDiagnosis: 20,
        PatientGadgetMedication: 21,
        PatientGadgetLastAppointments: 22,
        PatientGadgetTreatments: 23,
        PatientGadgetCaves: 24,
        PatientGadgetGestation: 25,
        PatientGadgetUpcomingAppointments: 26,
        PatientGadgetAlarmClock: 27,
        PatientGadgetPatientNumber: 30,
        PatientGadgetProcedure: 31,
        PatientGadgetLastNoShowAppointments: 32,
        PatientGadgetAddress: 33,
        PatientGadgetJobTitle: 34,
        PatientGadgetLatestMedicationPlan: 35,
        PatientGadgetReference: 36,
        PatientGadgetIFrame: 37,
        PatientGadgetCompletedTasks: 38,
        PatientGadgetCurrentTasks: 39,
        PatientGadgetTherapy: 40,
        PatientGadgetLatestMedData: 41,
        PatientGadgetDoctorAddress: 42,
        PatientGadgetInvoices: 43,
        PatientGadgetLatestLabData: 44,
        PatientGadgetLatestVaccinationStatus: 45,
        PatientGadgetLastDLDiagnosis: 46,
        PatientGadgetMedicationTypeContinuous: 47,
        PatientGadgetAmts: 48
        // NOTE: Next usage is at 49
    } );

    /**
     * Constants of layout type names
     * @type {Object}
     */
    // NOTE: If a defined is removed it can't be used anymore, definitions are incremental!
    GADGET_CONST.layoutTypes = Object.freeze( {
        FULL: 1,
        TWO: 2,
        TWO_LTR: 3,
        TWO_RTL: 4,
        THREE: 5,
        PATIENT_HEADER: 6
        // NOTE: Next usage is at 7
    } );

    Y.each( GADGET_CONST.gadgetNames, function( v, k ) {
        gadgetConstants[v] = k;
    } );

    /**
     * Gets gadget const by name
     * @param {String} name
     * @returns {Number}
     */
    GADGET_CONST.getGadgetConstByName = function( name ) {
        return GADGET_CONST.gadgetNames[name];
    };

    /**
     * Gets gadget name by const
     * @param {Number} number
     * @returns {String}
     */
    GADGET_CONST.getGadgetNameByConst = function( number ) {
        return gadgetConstants[number];
    };

    Y.each( GADGET_CONST.layoutTypes, function( v, k ) {
        layoutConstants[v] = k;
    } );

    /**
     * Gets layout type const by name
     * @param {String} name
     * @returns {Number}
     */
    GADGET_CONST.getLayoutTypeConstByName = function( name ) {
        return GADGET_CONST.layoutTypes[name];
    };

    /**
     * Gets layout type name by const
     * @param {Number} number
     * @returns {String}
     */
    GADGET_CONST.getLayoutTypeNameByConst = function( number ) {
        return layoutConstants[number];
    };

}, '3.16.0', {
    requires: [
        'oop'
    ]
} );
