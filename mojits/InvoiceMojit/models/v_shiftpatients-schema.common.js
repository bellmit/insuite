/**
 * User: do
 * Date: 22.03.19  14:13
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'v_shiftpatients-schema', function( Y, NAME ) {
        /**
         *
         * @module shiftpatients
         */

        var

            // ------- Schema definitions  -------
            types = {},
            i18n = Y.doccirrus.i18n;

        types = Y.mix( types, {
                root: {
                    base: {
                        complex: 'ext',
                        type: 'ShiftPatients_T',
                        lib: types
                    }
                },
                ShiftPatients_T: {
                    invoiceLogType: {
                        required: true,
                        complex: 'eq',
                        type: 'InvoiceLogType_E',
                        lib: types
                    },
                    invoiceLogId: {
                        required: true,
                        type: 'String',
                        i18n: i18n( 'InvoiceMojit.shiftpatients.ShiftPatients_T.invoiceLogId' )
                    },
                    invoiceLogText: {
                        required: true,
                        type: 'String',
                        i18n: i18n( 'InvoiceMojit.shiftpatients.ShiftPatients_T.invoiceLogText' )
                    },
                    sourceEmployeeIds: {
                        required: true,
                        type: ['String'],
                        i18n: i18n( 'InvoiceMojit.shiftpatients.ShiftPatients_T.sourceEmployeeIds' )
                    },
                    sourceLocationId: {
                        required: true,
                        type: 'String',
                        i18n: i18n( 'InvoiceMojit.shiftpatients.ShiftPatients_T.sourceLocationId' )
                    },
                    targetEmployeeId: {
                        validate: "ShiftPatients_T_targetEmployeeId",
                        required: true,
                        type: 'String',
                        i18n: i18n( 'InvoiceMojit.shiftpatients.ShiftPatients_T.targetEmployeeId' )
                    },
                    treatmentCodes: {
                        type: ['String'],
                        i18n: i18n( 'InvoiceMojit.shiftpatients.ShiftPatients_T.treatmentCodes' )
                    },
                    diagnosisCodes: {
                        type: ['String'],
                        i18n: i18n( 'InvoiceMojit.shiftpatients.ShiftPatients_T.diagnosisCodes' )
                    },
                    treatmentCatalogShort: {
                        type: ['String'],
                        i18n: i18n( 'InvoiceMojit.shiftpatients.ShiftPatients_T.treatmentCatalogShort' )
                    },
                    treatmentCodesExcludeInclude: {
                        i18n: i18n( 'InvoiceMojit.shiftpatients.ShiftPatients_T.treatmentCodesExcludeInclude' ),
                        complex: 'eq',
                        type: 'TreatmentCodeExcludeInclude_E',
                        lib: types
                    },
                    diagnosisCodesExcludeInclude: {
                        i18n: i18n( 'InvoiceMojit.shiftpatients.ShiftPatients_T.diagnosisCodesExcludeInclude' ),
                        complex: 'eq',
                        type: 'CodeExcludeInclude_E',
                        lib: types
                    }
                },
                InvoiceLogType_E: {
                    type: 'String',
                    default: 'KBV',
                    i18n: i18n('InvoiceMojit.shiftpatients.InvoiceLogType_E.i18n'),
                    list: [
                        {
                            val: 'KBV',
                            i18n: i18n( 'InvoiceMojit.shiftpatients.InvoiceLogType_E.KBV' )
                        },
                        {
                            val: 'ASV',
                            i18n: i18n( 'InvoiceMojit.shiftpatients.InvoiceLogType_E.ASV' )
                        },
                        {
                            val: 'PVS',
                            i18n: i18n( 'InvoiceMojit.shiftpatients.InvoiceLogType_E.PVS' )
                        },
                        {
                            val: 'CASH',
                            i18n: i18n( 'InvoiceMojit.shiftpatients.InvoiceLogType_E.CASH' )
                        }

                    ]
                },
                CodeExcludeInclude_E: {
                    type: 'String',
                    default: 'include',
                    list: [
                        {
                            val: 'include',
                            i18n: i18n( 'InvoiceMojit.shiftpatients.CodeExcludeInclude_E.include' )
                        },
                        {
                            val: 'exclude',
                            i18n: i18n( 'InvoiceMojit.shiftpatients.CodeExcludeInclude_E.exclude' )
                        }
                    ]
                },
                TreatmentCodeExcludeInclude_E: {
                    type: 'String',
                    default: 'include',
                    list: [
                        {
                            val: 'include',
                            i18n: i18n( 'InvoiceMojit.shiftpatients.TreatmentCodeExcludeInclude_E.include' )
                        },
                        {
                            val: 'exclude',
                            i18n: i18n( 'InvoiceMojit.shiftpatients.TreatmentCodeExcludeInclude_E.exclude' )
                        },
                        {
                            val: 'exact',
                            i18n: i18n( 'InvoiceMojit.shiftpatients.TreatmentCodeExcludeInclude_E.exact' )
                        }
                    ]
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[ NAME ] = {
            types: types,
            name: NAME
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[ NAME ], true );
    },
    '0.0.1', { requires: [ 'dcvalidations', 'dcschemaloader' ] }
);
