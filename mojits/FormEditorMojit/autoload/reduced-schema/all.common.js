/*
 *  Copyright DocCirrus GmbH 2015
 *
 *  YUI module requiring all reduced schemas for forms, to simplify loading
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-schema-all',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         *
         *  The paper name is that used in the forms dialogs, the hpdf property is the paper geometry name used by the
         *  libharu PDF library
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.schema)  { Y.dcforms.schema = {}; }
        Y.log('Adding all reduced schema for forms.', 'info', NAME);

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [
            //  Schemas
            'dcforms-schema-Activity-T',
            'dcforms-schema-CaseFile-T',
            'dcforms-schema-Calendar-T',
            'dcforms-schema-Communication-T',
            'dcforms-schema-Customer-T',
            'dcforms-schema-DocLetter-T',
            'dcforms-schema-Document-T',
            'dcforms-schema-Event-T',
            'dcforms-schema-InCase-T',
            'dcforms-schema-InSuite-T',
            'dcforms-schema-Invoice-T',
            'dcforms-schema-InvoiceItem-T',
            'dcforms-schema-Medication-T',
            'dcforms-schema-Patient-T',
            'dcforms-schema-Person-T',
            'dcforms-schema-Personalienfeld-T',
            'dcforms-schema-Prescription-T',
            'dcforms-schema-PubReceipt-T',
            'dcforms-schema-SelectedActivity-T',
            'dcforms-schema-Treatment-T',
            'dcforms-schema-Labdata-T',
            'dcforms-schema-CaseFolderTableRow-T',
            'dcforms-schema-EdmpDelivery-T',
            'dcforms-schema-MedData-T',
            'dcforms-schema-Ingredient-T',
            'dcforms-schema-GravidogrammItem-T',
            'dcforms-schema-CheckupPlanItem-T',
            'dcforms-schema-InStockOrder-T',
            'dcforms-schema-InStock-T',
            'dcforms-schema-Address-T',
            'dcforms-schema-MedicationActivity-T',
            'dcforms-schema-MedicationActivity-T',
            'dcforms-schema-InvoiceLinkedItem-T',

            //  Serial letters only
            'dcforms-schema-Contact-T',

            //  Country mode specific
            'dcforms-schema-InCase-CH-T',
            'dcforms-schema-InvoiceItem-CH-T',
            'dcforms-schema-Prescription-CH-T',

            //  BIOTRONIC / Cardiac event tables
            'dcforms-schema-MdcIdcEpisode-T',
            'dcforms-schema-MdcIdcLead-T',
            'dcforms-schema-MdcIdcZone-T',

            //  Enums
            'dcforms-schema-CalType-E',
            'dcforms-schema-CivilStatus-E',
            'dcforms-schema-Communication-E',
            'dcforms-schema-CompanyType-E',
            'dcforms-schema-DocType-E',
            'dcforms-schema-Gender-E',
            'dcforms-schema-Language-E',
            'dcforms-schema-RepType-E'

        ]
    }
);