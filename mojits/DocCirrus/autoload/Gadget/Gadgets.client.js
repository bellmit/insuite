/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'Gadgets', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module Gadgets
     */

    Y.namespace( 'doccirrus.gadget' );
    var
        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        TPL_PATH_BASE = GADGET_CONST.paths.TPL_BASE,
        TPL_EXAMPLE_BASE = GADGET_CONST.paths.TPL_EXAMPLE,
        TPL_PATH_PATIENT = GADGET_CONST.paths.TPL_PATIENT;

    /**
     * Shorthand register in "base" path
     * @param {String} name
     */
    function registerBase( name ) {
        GADGET.register( {
            name: name,
            template: TPL_PATH_BASE + name,
            viewModel: name
        } );
    }

    /**
     * Shorthand register in "patient" path
     * @param {String} name
     */
    function registerPatient( name ) {
        GADGET.register( {
            name: name,
            template: TPL_PATH_PATIENT + name,
            viewModel: name
        } );
    }

    /**
     * Gadgets of base
     */
    registerBase( 'DashboardBase' );

    /**
     * Gadgets of example
     */
    GADGET.register( {
        name: 'ExampleDashboard',
        template: TPL_PATH_BASE + 'DashboardBase', // re-use the 'DashboardBase' template
        viewModel: 'ExampleDashboard'
    } );
    GADGET.register( {
        name: 'ExampleGadget',
        template: TPL_EXAMPLE_BASE + 'ExampleGadget',
        viewModel: 'ExampleGadget'
    } );
    GADGET.register( {
        name: 'ExampleEditableGadget',
        template: TPL_EXAMPLE_BASE + 'ExampleEditableGadget',
        viewModel: 'ExampleEditableGadget'
    } );
    GADGET.register( {
        name: 'ExampleReportGadget',
        template: TPL_EXAMPLE_BASE + 'ExampleReportGadget',
        viewModel: 'ExampleReportGadget'
    } );

    /**
     * Gadgets of patient
     */
    registerPatient( 'PatientHeaderDashboard' );
    registerPatient( 'PatientGadgetEditGadget' );
    registerPatient( 'PatientGadgetProfileImage' );
    registerPatient( 'PatientGadgetCommunications' );
    registerPatient( 'PatientGadgetInsuranceStatus' );
    registerPatient( 'PatientGadgetCrm' );
    registerPatient( 'PatientGadgetAttachedContentInfo' );
    registerPatient( 'PatientGadgetMarkers' );
    registerPatient( 'PatientGadgetCommentWithNextAppointmentAndTask' );
    registerPatient( 'PatientGadgetLastHistory' );
    registerPatient( 'PatientGadgetLastDLDiagnosis' );
    registerPatient( 'PatientGadgetLastFinding' );
    registerPatient( 'PatientGadgetDiagnosisTypeContinuous' );
    registerPatient( 'PatientGadgetDiagnosis' );
    registerPatient( 'PatientGadgetMedication' );
    registerPatient( 'PatientGadgetLastAppointments' );
    registerPatient( 'PatientGadgetUpcomingAppointments' );
    registerPatient( 'PatientGadgetLastNoShowAppointments' );
    registerPatient( 'PatientGadgetAlarmClock' );
    registerPatient( 'PatientGadgetTreatments' );
    registerPatient( 'PatientGadgetCaves' );
    registerPatient( 'PatientGadgetGestation' );
    registerPatient( 'PatientGadgetPatientNumber' );
    registerPatient( 'PatientGadgetProcedure' );
    registerPatient( 'PatientGadgetAddress' );
    registerPatient( 'PatientGadgetReference' );
    registerPatient( 'PatientGadgetJobTitle' );
    registerPatient( 'PatientGadgetLatestMedicationPlan' );
    registerPatient( 'PatientGadgetIFrame' );
    registerPatient( 'PatientGadgetCompletedTasks' );
    registerPatient( 'PatientGadgetCurrentTasks' );
    registerPatient( 'PatientGadgetTherapy' );
    registerPatient( 'PatientGadgetLatestMedData' );
    registerPatient( 'PatientGadgetDoctorAddress' );
    registerPatient( 'PatientGadgetInvoices' );
    registerPatient( 'PatientGadgetLatestLabData' );
    registerPatient( 'PatientGadgetLatestVaccinationStatus' );
    registerPatient( 'PatientGadgetMedicationTypeContinuous' );
    registerPatient( 'PatientGadgetAmts' );

}, '3.16.0', {
    requires: [
        'GadgetConstants',
        'GadgetLoader'
    ]
} );
