/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'GadgetLayouts', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module GadgetLayouts
     */

    Y.namespace( 'doccirrus.gadget.layouts' );
    var
        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        LAYOUT_TYPES = GADGET_CONST.layoutTypes,
        GADGET_LAYOUTS = GADGET.layouts,

        configurableTable;

    /**
     * Creates a layout types object by given array of const
     * @param fromArray
     * @returns {Object}
     */
    function types( fromArray ) {
        var
            result = {};

        fromArray.forEach( function( id ) {
            result[GADGET_CONST.getLayoutTypeNameByConst( id )] = id;
        } );

        Object.freeze( result );

        return result;
    }

    /**
     * Definitions for the "base" layout
     * @type {Object}
     */
    GADGET_LAYOUTS.base = Object.freeze( {
        types: types( [
            LAYOUT_TYPES.FULL,
            LAYOUT_TYPES.TWO,
            LAYOUT_TYPES.TWO_LTR,
            LAYOUT_TYPES.TWO_RTL,
            LAYOUT_TYPES.THREE
        ] ),
        defaultType: LAYOUT_TYPES.FULL,
        list: Object.freeze( [
            { val: LAYOUT_TYPES.FULL, i18n: 'Einspaltig' },
            { val: LAYOUT_TYPES.TWO, i18n: 'Zweispaltig' },
            { val: LAYOUT_TYPES.TWO_LTR, i18n: 'Zweispaltig (lnr)' },
            { val: LAYOUT_TYPES.TWO_RTL, i18n: 'Zweispaltig (rnl)' },
            { val: LAYOUT_TYPES.THREE, i18n: 'Dreispaltig' }
        ] )
    } );

    /**
     * Definitions for the "example" layout
     * @type {Object}
     */
    GADGET_LAYOUTS.example = Object.freeze( {
        types: types( [
            LAYOUT_TYPES.FULL,
            LAYOUT_TYPES.TWO,
            LAYOUT_TYPES.THREE
        ] ),
        defaultType: LAYOUT_TYPES.FULL,
        list: Object.freeze( [
            { val: LAYOUT_TYPES.FULL, i18n: 'Einspaltig' },
            { val: LAYOUT_TYPES.TWO, i18n: 'Zweispaltig' },
            { val: LAYOUT_TYPES.THREE, i18n: 'Dreispaltig' }
        ] )
    } );

    /**
     * Definitions of the patient configurable table gadgets
     * @private
     * @type {{definition: {}}}
     */
    configurableTable = {
        definition: {
            PatientGadgetPatientNumber: {
                1: ['PATIENT_NUMBER', 'patientNumber']
            },
            PatientGadgetDiagnosis: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['CONTENT', 'content'],
                3: ['CODE', 'code']
            },
            PatientGadgetDiagnosisTypeContinuous: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['CONTENT', 'content'],
                3: ['CODE', 'code']
            },
            PatientGadgetLastFinding: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['CONTENT', 'content']
            },
            PatientGadgetLastHistory: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['CONTENT', 'content']
            },
            PatientGadgetLastDLDiagnosis: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['CONTENT', 'content']
            },
            PatientGadgetProcedure: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['CONTENT', 'content']
            },
            PatientGadgetTherapy: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['CONTENT', 'content'],
                3: ['SUBTYPE', 'subType']
            },
            PatientGadgetCommunications: {
                1: ['TYPE', 'type'],
                2: ['VALUE', 'value'],
                3: ['NOTE', 'note']
            },
            PatientGadgetMedication: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['CODE', 'code'],
                3: ['CONTENT', 'content'],
                4: ['RANGE', 'range']
            },
            PatientGadgetLastAppointments: {
                1: ['START', 'start'],
                2: ['SCHEDULE_TITLE', 'scheduleTitle'],
                3: ['CALENDAR_NAME', 'calendar.name'],
                4: ['EMPLOYEE_NAME', 'calendar.employee'],
                5: ['DETAILS', 'details']
            },
            PatientGadgetUpcomingAppointments: {
                1: ['START', 'start'],
                2: ['SCHEDULE_TITLE', 'scheduleTitle'],
                3: ['CALENDAR_NAME', 'calendar.name'],
                4: ['EMPLOYEE_NAME', 'calendar.employee'],
                5: ['DETAILS', 'details']
            },
            PatientGadgetCompletedTasks: {
                1: ['DATE_DONE', 'dateDone'],
                2: ['TITLE', 'title'],
                3: ['DETAILS', 'details'],
                4: ['EMPLOYEE_NAME', 'employeeName'],
                5: ['CREATOR_NAME', 'creatorName'],
                6: ['TYPE', 'taskTypeObj.name']
            },
            PatientGadgetCurrentTasks: {
                1: ['ALERT_TIME', 'alertTime'],
                2: ['DATE_CREATED', 'dateCreated'],
                3: ['URGENCY', 'urgency'],
                4: ['TITLE', 'title'],
                5: ['DETAILS', 'details'],
                6: ['EMPLOYEE_NAME', 'employeeName'],
                7: ['CREATOR_NAME', 'creatorName'],
                8: ['CANDIDATES_NAMES', 'candidatesNames'],
                9: ['ROLES', 'roles'],
                10: ['TYPE', 'taskTypeObj.name']
            },
            PatientGadgetLastNoShowAppointments: {
                1: ['START', 'start'],
                2: ['SCHEDULE_TITLE', 'scheduleTitle'],
                3: ['CALENDAR_NAME', 'calendar.name'],
                4: ['EMPLOYEE_NAME', 'calendar.employee']
            },
            PatientGadgetTreatments: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['CONTENT', 'content'],
                3: ['CODE', 'code']
            },
            PatientGadgetCaves: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['SUBTYPE', 'subType'],
                3: ['CONTENT', 'content']
            },
            PatientGadgetAddress: {
                1: ['ADDRESS', 'patientAddress']
            },
            PatientGadgetLatestMedicationPlan: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['CODE_PZN', 'code'],
                3: ['ACTIVE_INGREDIENTS', 'displayPhIngr'],
                4: ['STRENGTH', 'displayStrength'],
                5: ['NLABEL', 'phNLabel'],
                6: ['FORM_OF_ADMINISTRATION', 'phForm'],
                7: ['DOSIS', 'displayDosis'],
                8: ['PH_UNIT', 'phUnit'],
                9: ['PH_NOTE', 'phNote'],
                10: ['PH_REASON', 'phReason']
            },
            PatientGadgetLatestMedData: {
                1: ['TYPE', 'type'],
                2: ['SMART_VALUE', 'smartValue'],
                3: ['UNIT', 'unit'],
                4: ['DATE', 'measurementDate']
            },
            PatientGadgetLatestLabData: {
                1: ['DATE', 'labReqReceived'],
                2: ['HEAD', 'labHead'],
                3: ['TEST_LABEL', 'labTestLabel'],
                4: ['SAMPLE_NORMAL_VALUE_TEXT', 'labNormalText'],
                5: ['LAB_MIN', 'labMin'],
                6: ['LAB_MAX', 'labMax'],
                7: ['TEST_RESULT_UNIT', 'labTestResultUnit'],
                8: ['TEST_RESULT_VAL', 'labTestResultVal']
            },
            PatientGadgetDoctorAddress: {
                1: ['TYPE', 'type'],
                2: ['CONTENT', 'content'],
                3: ['SPECIALITY', 'speciality'],
                4: ['INSTITUTION_TYPE', 'institutionType'],
                5: ['PHONE_NUMBER', 'phone'],
                6: ['FAX', 'fax'],
                7: ['ADDRESS', 'address']
            },
            PatientGadgetInvoices: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['STATUS', 'status'],
                3: ['TYPE', 'actType'],
                4: ['CONTENT', 'content']
            },
            PatientGadgetMedicationTypeContinuous: {
                1: ['TIMESTAMP', 'timestamp'],
                2: ['CONTENT', 'content'],
                3: ['CODE', 'code']
            }
        },
        buildConstants: function() {
            var
                result = {},
                definitions = configurableTable.definition;

            Y.each( definitions, function( definition, definitionKey ) {
                result[definitionKey] = {};
                Y.each( definitions[definitionKey], function( fields, constKey ) {
                    result[definitionKey][fields[0]] = Number( constKey );
                } );
                Object.freeze( result[definitionKey] );
            } );

            Object.freeze( result );

            return result;
        }
    };

    /**
     * Definitions for the "patient" layout
     * @type {Object}
     */
    GADGET_LAYOUTS.patient = Object.freeze( {
        types: types( [
            LAYOUT_TYPES.PATIENT_HEADER
        ] ),
        defaultType: LAYOUT_TYPES.PATIENT_HEADER,
        list: Object.freeze( [
            { val: LAYOUT_TYPES.PATIENT_HEADER, i18n: 'Variabel' }
        ] ),
        configFields: Object.freeze( {
            GADGET_COL_PROP: 'gadgetCols',
            GADGET_ROW_PROP: 'gadgetRows',
            configurableTable: configurableTable.buildConstants()
        } ),
        /**
         * Get the property name to use in result data for supplied gadget name and the field constant
         * @param {String} gadgetName
         * @param {Number} numberConstant
         * @returns {String|undefined}
         */
        getConfigurableTablePropNameForByConst: function( gadgetName, numberConstant ) {
            var
                definitions = configurableTable.definition;

            if( !definitions[gadgetName] ) {
                return definitions[gadgetName];
            }

            if( !definitions[gadgetName][numberConstant] ) {
                return definitions[gadgetName][numberConstant];
            }

            return definitions[gadgetName][numberConstant][1];
        }
    } );

}, '3.16.0', {
    requires: [
        'oop',
        'GadgetConstants'
    ]
} );
