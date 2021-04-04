/**
 * User: pi
 * Date: 12/08/15  10:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $ */

'use strict';

YUI.add( 'DCTransformerConfigModal', function( Y ) {

        function TransformerConfigModal() {

        }

        TransformerConfigModal.prototype.showModal = function( data, transformerModelType, callback ) {

            var
                modal, // eslint-disable-line
                node = Y.Node.create( '<div></div>' ),
                i18n = Y.doccirrus.i18n,
                TITLE = i18n( 'DeviceMojit.transformerconfig_modal_clientJS.title.MODAL_TITLE' ) + ": " + data.name,
                KoViewModel = Y.doccirrus.KoViewModel,
                transformerModel = new KoViewModel.createViewModel( {
                    NAME: transformerModelType, config: {
                        data: data
                    }
                } ),
                template = "flowTransformer_modal/" + data.transformerType;

            YUI.dcJadeRepository.loadNodeFromTemplate(
                template,
                'DeviceMojit',
                {},
                node,
                function() {
                    // eslint-disable-next-line no-unused-vars
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-Appointment',
                        bodyContent: node,
                        title: TITLE,
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: Y.doccirrus.DCWindow.SIZE_LARGE,
                        height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    isDefault: true,
                                    action: function() {
                                        callback( transformerModel.toJSON() );
                                        this.close();
                                    }
                                } )
                            ]
                        }
                    } );

                    //BDT-Export
                    switch( data.transformerType ){
                        case 'DICOM':
                            break;
                        case 'JSON_BDT':
                            break;
                        case 'GDT_JSON':
                        case 'GDTSTUDY':
                        case 'GDTPATIENT':
                        case 'GDTVIEW':
                            //GDT-Import
                            transformerModel.mapSubtypeI18n = i18n( 'flow-schema.Transformer_T.mapSubtype.label' );
                            transformerModel.mapSubtypePlaceholderI18n = i18n( 'flow-schema.Transformer_T.mapSubtype.placeholder' );
                            transformerModel.deleteAttachmentsI18n = i18n( 'flow-schema.Transformer_T.deleteAttachments' );
                            transformerModel.forceCreateNewActivityMsgI18n = i18n( 'flow-schema.Transformer_T.forceCreateNewActivityMsg' );
                            transformerModel.configOfAdditionGDTFieldsI18n = i18n( 'flow-schema.GDTMappingRow_T.configOfAdditionGDTFields' );
                            transformerModel.gdtFieldNumberI18n = i18n( 'flow-schema.GDTMappingRow_T.gdtFieldNumber' );
                            transformerModel.gdtMappingRegexStringI18n = i18n( 'flow-schema.GDTMappingRow_T.gdtMappingRegexString' );
                            transformerModel.gdtMappingActionI18n = i18n( 'flow-schema.GdtMappingAction_E.gdtMappingAction' );
                            transformerModel.gdtMappingExampleHeadlineI18n = i18n( 'flow-schema.GDTMappingRow_T.gdtMappingExampleHeadline' );
                            transformerModel.gdtMappingExample1I18n = i18n( 'flow-schema.GDTMappingRow_T.gdtMappingExample1' );
                            transformerModel.gdtMappingExample2I18n = i18n( 'flow-schema.GDTMappingRow_T.gdtMappingExample2' );
                            transformerModel.gdtMappingFieldsI18n = i18n( 'flow-schema.GDTMappingRow_T.gdtMappingFields' );
                            transformerModel.gdtMappingTagsTreatmentCodeI18n = i18n( 'flow-schema.GDTMappingRow_T.tags.treatmentCode' );
                            transformerModel.gdtMappingTagsTreatmentPriceI18n = i18n( 'flow-schema.GDTMappingRow_T.tags.treatmentPrice' );
                            transformerModel.gdtMappingTagsTreatmentDescriptionI18n = i18n( 'flow-schema.GDTMappingRow_T.tags.treatmentDescription' );
                            transformerModel.gdtMappingTagsIcd10I18n = i18n( 'flow-schema.GDTMappingRow_T.tags.icd10' );
                            transformerModel.gdtMappingTagsIcdDescriptionI18n = i18n( 'flow-schema.GDTMappingRow_T.tags.icdDescription' );
                            transformerModel.gdtUseLastChangedActivityI18n = i18n( 'flow-schema.GDT_JSON_T.gdtUseLastChangedActivity' );
                            //GDTstudy
                            transformerModel.gdtVersionI18n = i18n( 'flow-schema.Transformer_T.gdtVersion' );
                            transformerModel.gdtEncodingI18n = i18n( 'flow-schema.Transformer_T.gdtEncoding' );
                            transformerModel.gdtSenderI18n = i18n( 'flow-schema.Transformer_T.gdtSender' );
                            transformerModel.gdtReceiverI18n = i18n( 'flow-schema.Transformer_T.gdtReceiver' );
                            transformerModel.exportMedDataPopover = i18n( 'flow-schema.Transformer_T.exportMedData.popover' );
                            transformerModel.exportMedDataPopoverTitle = i18n( 'flow-schema.Transformer_T.exportMedData.popoverTitle' );
                            transformerModel.exportDiagnosisPopover = i18n( 'flow-schema.Transformer_T.exportDiagnosis.popover' );
                            transformerModel.exportDiagnosisPopoverTitle = i18n( 'flow-schema.Transformer_T.exportDiagnosis.popoverTitle' );
                            transformerModel.procedureListI18n = i18n( 'flow-schema.Transformer_T.procedureList' );
                            transformerModel.showOriginalIdI18n = i18n( 'flow-schema.Transformer_T.removeZerosFromIdMsg' );
                            transformerModel.procedureI18n = i18n( 'flow-schema.Transformer_T.procedure' );
                            transformerModel.GDTdiagnosisDataSubText = i18n( 'flow-schema.Transformer_T.diagnosisData.GDTsubText' );
                            transformerModel.exportDiagnosisI18n = i18n( 'flow-schema.Transformer_T.exportDiagnosis' );
                            //GDTpatient
                            transformerModel.mapPatientLocationAddonPopover = i18n( 'flow-schema.Transformer_T.mapPatientLocationAddon.popover' );
                            transformerModel.mapPatientLocationAddonPopoverTitle = i18n( 'flow-schema.Transformer_T.mapPatientLocationAddon.popoverTitle' );
                            transformerModel.mapBSNRPopover = i18n( 'flow-schema.Transformer_T.mapBSNR.popover' );
                            transformerModel.mapBSNRPopoverTitle = i18n( 'flow-schema.Transformer_T.mapBSNR.popoverTitle' );
                            transformerModel.mapCaseFolderIdPopover = i18n( 'flow-schema.Transformer_T.mapCaseFolderId.popover' );
                            transformerModel.mapCaseFolderIdPopoverTitle = i18n( 'flow-schema.Transformer_T.mapCaseFolderId.popoverTitle' );
                            transformerModel.mapEmployeeIdPopover = i18n( 'flow-schema.Transformer_T.mapEmployeeId.popover' );
                            transformerModel.mapEmployeeIdPopoverTitle = i18n( 'flow-schema.Transformer_T.mapEmployeeId.popoverTitle' );
                            transformerModel.mapResponsibleDoctorPopover = i18n( 'flow-schema.Transformer_T.mapResponsibleDoctor.popover' );
                            transformerModel.mapResponsibleDoctorPopoverTitle = i18n( 'flow-schema.Transformer_T.mapResponsibleDoctor.popoverTitle' );
                            transformerModel.gdtPatientExportSpecialMatchI18n = i18n( 'flow-schema.Transformer_T.gdtPatientExportSpecialMatch' );
                            transformerModel.gdtPatientExportSpecialMatchAdditionalTextI18n = i18n( 'flow-schema.Transformer_T.gdtPatientExportSpecialMatchAdditionalText' );
                            break;
                        case 'MEDIA_IMPORT':
                            transformerModel.mediaImportTagsHeadI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.head' );
                            transformerModel.mediaImportTagsExampleI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.example' );
                            transformerModel.mediaImportTagsPatientNumberI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.patientNumber' );
                            transformerModel.mediaImportTagsLastnameI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.lastname' );
                            transformerModel.mediaImportTagsFirstnameI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.firstname' );
                            transformerModel.mediaImportTagsDobDDI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.dobDD' );
                            transformerModel.mediaImportTagsDobMMI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.dobMM' );
                            transformerModel.mediaImportTagsDobYYYYI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.dobYYYY' );
                            transformerModel.mediaImportTagsDocYYYYI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.docYYYY' );
                            transformerModel.mediaImportTagsDocMMI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.docMM' );
                            transformerModel.mediaImportTagsDocDDI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.docDD' );
                            transformerModel.mediaImportTagsDocHHI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.docHH' );
                            transformerModel.mediaImportTagsDocmmI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.docmm' );
                            transformerModel.mediaImportTagsDocssI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.docss' );
                            transformerModel.mediaImportTagsCounterI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.counter' );
                            transformerModel.mediaImportTagsExtensionI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.extension' );
                            transformerModel.mediaImportTagsIgnore123I18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.ignore123' );
                            transformerModel.mediaImportTagsIgnoreABCI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.ignoreABC' );
                            transformerModel.mediaImportTagsIgnoreAnyI18n = i18n( 'flow-schema.Transformer_T.mediaImportTags.ignoreAny' );
                            break;
                        case 'LDT_UPLOAD':
                        case 'LDT_TRANSACTION':
                        case 'LDT_TRANSACTION_EXTENDED':
                            //LDT-Import
                            transformerModel.billingI18n = i18n( 'flow-schema.Transformer_T.billing' );
                            transformerModel.billingFlagI18n = i18n( 'flow-schema.Transformer_T.billingFlag' );
                            transformerModel.specialMatchI18n = i18n( 'flow-schema.Transformer_T.specialMatch' );
                            transformerModel.disallowGkvBillingI18n = i18n( 'flow-schema.Transformer_T.disallowGkvBilling' );
                            transformerModel.allowGkvBillingI18n = i18n( 'flow-schema.Transformer_T.allowGkvBilling' );
                            transformerModel.useDataFromLabrequestIfPresentI18n = i18n( 'flow-schema.Transformer_T.useDataFromLabrequestIfPresent' );
                            transformerModel.timeRangeI18n = i18n( 'flow-schema.Transformer_T.timeRange' );
                            transformerModel.timeRangeDaysI18n = i18n( 'flow-schema.Transformer_T.timeRangeDays' );
                            transformerModel.useAddInfoForIdI18n = i18n( 'flow-schema.Transformer_T.useAddInfoForId.label' );
                            transformerModel.useAddInfoForIdPlaceholder = i18n( 'flow-schema.Transformer_T.useAddInfoForId.placeholder' );
                            transformerModel.useAddInfoForIdDefault = i18n( 'flow-schema.Transformer_T.useAddInfoForId.default' );
                            transformerModel.useAddInfoForIdPopover = i18n( 'flow-schema.Transformer_T.useAddInfoForId.popover' );
                            transformerModel.useAddInfoForIdPopoverTitle = i18n( 'flow-schema.Transformer_T.useAddInfoForId.popoverTitle' );
                            transformerModel.recordRequestIdI18n = i18n( 'flow-schema.Transformer_T.useAddInfoForId.recordRequestId' );
                            transformerModel.specialMatchNoticeI18n = i18n( 'flow-schema.Transformer_T.specialMatchNotice' );
                            transformerModel.specialMatchSourceI18n = i18n( 'flow-schema.Transformer_T.specialMatchSource' );
                            transformerModel.specialMatchActivityFieldI18n = i18n( 'flow-schema.Transformer_T.specialMatchActivityField' );
                            transformerModel.specialMatchDaysI18n = i18n( 'flow-schema.Transformer_T.specialMatchDays' );
                            transformerModel.specialMatchActivityTypeI18n = i18n( 'flow-schema.Transformer_T.specialMatchActivityType' );
                            transformerModel.labReqIdI18n = i18n( 'flow-schema.Transformer_T.useAddInfoForId.labReqId' );
                            transformerModel.patientIdI18n = i18n( 'flow-schema.Transformer_T.useAddInfoForId.patientId' );
                            //LDT Transaction
                            transformerModel.ldtVersionI18n = i18n( 'flow-schema.Transformer_T.ldtVersion' );
                            transformerModel.scheinDataI18n = i18n( 'flow-schema.Transformer_T.scheinData.label' );
                            transformerModel.scheinDataSubText = i18n( 'flow-schema.Transformer_T.scheinData.subText' );
                            //LDT-Export
                            transformerModel.patientHeightInCmI18n = i18n( 'flow-schema.Transformer_T.patientHeightInCm.label' );
                            transformerModel.patientHeightInCmPopover = i18n( 'flow-schema.Transformer_T.patientHeightInCm.popover' );
                            transformerModel.patientHeightInCmPopoverTitle = i18n( 'flow-schema.Transformer_T.patientHeightInCm.popoverTitle' );
                            transformerModel.patientWeightInKgI18n = i18n( 'flow-schema.Transformer_T.patientWeightInKg.label' );
                            transformerModel.patientWeightInKgPopover = i18n( 'flow-schema.Transformer_T.patientWeightInKg.popover' );
                            transformerModel.patientWeightInKgPopoverTitle = i18n( 'flow-schema.Transformer_T.patientWeightInKg.popoverTitle' );
                            transformerModel.diagnosisSuspectedI18n = i18n( 'flow-schema.Transformer_T.diagnosisSuspected.label' );
                            transformerModel.diagnosisSuspectedPopover = i18n( 'flow-schema.Transformer_T.diagnosisSuspected.popover' );
                            transformerModel.diagnosisSuspectedPopoverTitle = i18n( 'flow-schema.Transformer_T.diagnosisSuspected.popoverTitle' );
                            transformerModel.diagnosis_suspectedI18n = i18n( 'flow-schema.Transformer_T.diagnosisSuspected.diagnosis_suspected' );
                            transformerModel.order_diagnosis_suspectedI18n = i18n( 'flow-schema.Transformer_T.diagnosisSuspected.order_diagnosis_suspected' );
                            transformerModel.treatmentTypeI18n = i18n( 'flow-schema.Transformer_T.treatmentType.label' );
                            transformerModel.treatmentTypePopover = i18n( 'flow-schema.Transformer_T.treatmentType.popover' );
                            transformerModel.treatmentTypePopoverTitle = i18n( 'flow-schema.Transformer_T.treatmentType.popoverTitle' );
                            transformerModel.kurativeI18n = i18n( 'flow-schema.Transformer_T.treatmentType.kurative' );
                            transformerModel.preventiveI18n = i18n( 'flow-schema.Transformer_T.treatmentType.preventive' );
                            transformerModel.belegBehandlungI18n = i18n( 'flow-schema.Transformer_T.treatmentType.belegBehandlung' );
                            transformerModel.initiatorBSNRI18n = i18n( 'flow-schema.Transformer_T.initiatorBSNR.label' );
                            transformerModel.initiatorBSNRPopover = i18n( 'flow-schema.Transformer_T.initiatorBSNR.popover' );
                            transformerModel.initiatorBSNRPopoverTitle = i18n( 'flow-schema.Transformer_T.initiatorBSNR.popoverTitle' );
                            transformerModel.refBSNRI18n = i18n( 'flow-schema.Transformer_T.refBSNR.label' );
                            transformerModel.refBSNRPopover = i18n( 'flow-schema.Transformer_T.refBSNR.popover' );
                            transformerModel.refBSNRPopoverTitle = i18n( 'flow-schema.Transformer_T.refBSNR.popoverTitle' );
                            transformerModel.initiatorLANRI18n = i18n( 'flow-schema.Transformer_T.initiatorLANR.label' );
                            transformerModel.initiatorLANRPopover = i18n( 'flow-schema.Transformer_T.initiatorLANR.popover' );
                            transformerModel.initiatorLANRPopoverTitle = i18n( 'flow-schema.Transformer_T.initiatorLANR.popoverTitle' );
                            transformerModel.refLANRI18n = i18n( 'flow-schema.Transformer_T.refLANR.label' );
                            transformerModel.refLANRPopover = i18n( 'flow-schema.Transformer_T.refLANR.popover' );
                            transformerModel.refLANRPopoverTitle = i18n( 'flow-schema.Transformer_T.refLANR.popoverTitle' );
                            transformerModel.ICDCodeI18n = i18n( 'flow-schema.Transformer_T.ICDCode.label' );
                            transformerModel.ICDCodePopover = i18n( 'flow-schema.Transformer_T.ICDCode.popover' );
                            transformerModel.ICDCodePopoverTitle = i18n( 'flow-schema.Transformer_T.ICDCode.popoverTitle' );
                            transformerModel.diagnosisCertaintyI18n = i18n( 'flow-schema.Transformer_T.diagnosisCertainty.label' );
                            transformerModel.diagnosisCertaintyPopover = i18n( 'flow-schema.Transformer_T.diagnosisCertainty.popover' );
                            transformerModel.diagnosisCertaintyPopoverTitle = i18n( 'flow-schema.Transformer_T.diagnosisCertainty.popoverTitle' );
                            transformerModel.diagnosisLocI18n = i18n( 'flow-schema.Transformer_T.diagnosisLoc.label' );
                            transformerModel.diagnosisLocPopover = i18n( 'flow-schema.Transformer_T.diagnosisLoc.popover' );
                            transformerModel.diagnosisLocPopoverTitle = i18n( 'flow-schema.Transformer_T.diagnosisLoc.popoverTitle' );
                            transformerModel.diagnosisDescI18n = i18n( 'flow-schema.Transformer_T.diagnosisDesc.label' );
                            transformerModel.diagnosisDescPopover = i18n( 'flow-schema.Transformer_T.diagnosisDesc.popover' );
                            transformerModel.diagnosisDescPopoverTitle = i18n( 'flow-schema.Transformer_T.diagnosisDesc.popoverTitle' );
                            transformerModel.diagnosisExceptionDescI18n = i18n( 'flow-schema.Transformer_T.diagnosisExceptionDesc.label' );
                            transformerModel.diagnosisExceptionDescPopover = i18n( 'flow-schema.Transformer_T.diagnosisExceptionDesc.popover' );
                            transformerModel.diagnosisExceptionDescPopoverTitle = i18n( 'flow-schema.Transformer_T.diagnosisExceptionDesc.popoverTitle' );
                            transformerModel.patientPregnancyI18n = i18n( 'flow-schema.Transformer_T.patientPregnancy.label' );
                            transformerModel.patientPregnancyPopover = i18n( 'flow-schema.Transformer_T.patientPregnancy.popover' );
                            transformerModel.patientPregnancyPopoverTitle = i18n( 'flow-schema.Transformer_T.patientPregnancy.popoverTitle' );
                            transformerModel.patientPregnancyGestationLengthI18n = i18n( 'flow-schema.Transformer_T.patientPregnancyGestationLength.label' );
                            transformerModel.patientPregnancyGestationLengthPopover = i18n( 'flow-schema.Transformer_T.patientPregnancyGestationLength.popover' );
                            transformerModel.patientPregnancyGestationLengthPopoverTitle = i18n( 'flow-schema.Transformer_T.patientPregnancyGestationLength.popoverTitle' );
                            break;
                        case 'OSIRIX':
                            break;
                        case 'BESR':
                            break;
                        case 'HL7_LDT_JSON':
                            transformerModel.hl7CreateTreatmentsI18n = i18n( 'flow-schema.Transformer_T.hl7CreateTreatments' );
                            transformerModel.hl7CreateTreatmentsInfoI18n = i18n( 'flow-schema.Transformer_T.hl7CreateTreatmentsInfo' );
                            transformerModel.internalExternalHeaderI18n = i18n( 'flow-schema.InternalExternalLabTreatmentsConfig_T.headerText' );
                            transformerModel.labNameI18n = i18n( 'flow-schema.InternalExternalLabTreatmentsConfig_T.labName' );
                            transformerModel.typeI18n = i18n( 'flow-schema.InternalExternalLabTreatmentsMapping_E.type' );
                            break;
                        case 'MEDIPORT_RES':
                            break;
                        case 'OPHTHALMOLOGY_TMP_IMPORT':
                            transformerModel.tmpFileTypeLabelI18n = i18n( 'flow-schema.Transformer_T.tmpFileType' );
                            transformerModel.tmpFileTypeDescriptionLabelI18n = i18n( 'flow-schema.Transformer_T.tmpFileTypeDescription' );
                            transformerModel.addRowButtonI18n = i18n( 'flow-schema.Transformer_T.addRowButton' );
                            transformerModel.rowNumberHeaderI18n = i18n( 'flow-schema.OpTmpFileRow_T.rowNumber' );
                            transformerModel.labelHeaderI18n = i18n( 'flow-schema.OpTmpFileRow_T.label' );
                            break;
                    }

                    transformerModel.parserSettingsI18n = i18n( 'flow-schema.Transformer_T.parserSettings' );
                    transformerModel.softValidationI18n = i18n( 'flow-schema.Transformer_T.softValidation.label' );
                    transformerModel.popoverI18n = i18n( 'flow-schema.Transformer_T.softValidation.popover' );
                    transformerModel.popoverTitleI18n = i18n( 'flow-schema.Transformer_T.softValidation.popoverTitle' );
                    transformerModel.gdtPatientExportSpecialMatchNoticeI18n = i18n( 'flow-schema.Transformer_T.gdtPatientExportSpecialMatchNotice' );
                    transformerModel.mapCaseFolderIdI18n = i18n( 'flow-schema.Transformer_T.mapCaseFolderIdTo' );
                    transformerModel.mapEmployeeIdI18n = i18n( 'flow-schema.Transformer_T.mapEmployeeIdTo' );
                    transformerModel.mapResponsibleDoctorI18n = i18n( 'flow-schema.Transformer_T.mapResponsibleDoctorTo' );
                    transformerModel.mapBSNRI18n = i18n( 'flow-schema.Transformer_T.mapBSNRTo' );
                    transformerModel.medicineDataI18n = i18n( 'flow-schema.Transformer_T.medicineData.label' );
                    transformerModel.medicineDataSubText = i18n( 'flow-schema.Transformer_T.medicineData.subText' );
                    transformerModel.exportMedDataI18n = i18n( 'flow-schema.Transformer_T.exportMedData.label' );
                    transformerModel.patientNoI18n = i18n( 'flow-schema.Transformer_T.patientNo' );
                    transformerModel.mappedI18n = i18n( 'flow-schema.Transformer_T.mapped' );
                    transformerModel.mappedToI18n = i18n( 'flow-schema.Transformer_T.mappedTo' );
                    transformerModel.mapPatientLocationAddonI18n = i18n( 'flow-schema.Transformer_T.mapPatientLocationAddonTo' );
                    transformerModel.diagnosisDataI18n = i18n( 'flow-schema.Transformer_T.diagnosisData.label' );
                    transformerModel.diagnosisDataSubText = i18n( 'flow-schema.Transformer_T.diagnosisData.subText' );

                    transformerModel.addDisposable( ko.computed( function() {
                        if( ko.unwrap( transformerModel.timeRangeDays ) < 0 ) {
                            transformerModel.timeRangeDays( 0 );
                        } else if( ko.unwrap( transformerModel.timeRangeDays ) > 99 ) {
                            transformerModel.timeRangeDays( 99 );
                        }
                    } ) );
                    $( '[data-toggle="popover"]' ).popover();

                    ko.applyBindings( transformerModel, node.getDOMNode().querySelector( '#transformerModel' ) );
                }
            );

        };
        Y.namespace( 'doccirrus.modals' ).transformerConfigModal = new TransformerConfigModal();
    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'flow-schema'
        ]
    }
);
