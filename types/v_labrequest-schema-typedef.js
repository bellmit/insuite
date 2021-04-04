/**
 * @module v_labrequestSchema
 */

/**
 * @typedef {Object} module:v_labrequestSchema.editorObj
 * @property {String} name - 
 * @property {String} employeeNo - 
 * @property {String} initials - 
 */


/**
 * @typedef {Object} module:v_labrequestSchema.attachedMediaObj
 * @property {String} mediaId - 
 * @property {String} contentType - 
 * @property {String} caption - 
 * @property {String} title - 
 * @property {String} malwareWarning - 
 */


/**
 * @typedef {Object} module:v_labrequestSchema.v_labrequest
 * @property {String} actType - 
 * @property {string} status - 
 * @property {Array.<String>} attachments - 
 * @property {Array.<module:v_labrequestSchema.attachedMediaObj>} attachedMedia - 
 * @property {Array.<String>} attachedMediaTags - 
 * @property {String} pressButton - 
 * @property {String} subType - 
 * @property {Date} timestamp - 
 * @property {String} daySeparation - 
 * @property {String} time - 
 * @property {String} patientId - 
 * @property {String} employeeId - 
 * @property {Array.<String>} backupEmployeeIds - 
 * @property {String} employeeName - 
 * @property {String} employeeInitials - 
 * @property {ObjectId} locationId - 
 * @property {boolean} external - 
 * @property {String} externalRef - 
 * @property {String} copyRef - 
 * @property {String} content - 
 * @property {String} mirrorActivityId - 
 * @property {String} mirrorCaseFolderType - 
 * @property {String} userContent - 
 * @property {Mixed} mediaImportError - 
 * @property {String} partnerInfo - 
 * @property {Object} patientShort - 
 * @property {String} comment - 
 * @property {String} explanations - 
 * @property {Array.<module:v_labrequestSchema.editorObj>} editor - 
 * @property {Array.<String>} activities - 
 * @property {Array.<String>} referencedBy - 
 * @property {String} formId - 
 * @property {String} formVersion - 
 * @property {String} formPdf - 
 * @property {String} formLang - 
 * @property {String} formGender - 
 * @property {Object} u_extra - 
 * @property {String} caseFolderId - 
 * @property {String} patientName - 
 * @property {String} patientLastName - 
 * @property {String} patientFirstName - 
 * @property {String} patientNo - 
 * @property {String} patientKbvDob - 
 * @property {String} apkState - 
 * @property {Boolean} sentToMediport - 
 * @property {String} asvTeamnumber - 
 * @property {String} careComment - 
 * @property {Boolean} caseFolderDisabled - 
 * @property {Boolean} notDeletable - 
 * @property {String} cancelReason - 
 * @property {String} autoGenID - 
 * @property {String} locationName - 
 * @property {Date} lastChanged - 
 * @property {Array.<String>} unlinkedMirrorIds - 
 * @property {Number} printCount - 
 * @property {Array.<ObjectId>} savedEmails - 
 * @property {String} labRequestType - 
 * @property {String} sonstigesText - 
 * @property {String} knappschaftskennzeichen - 
 * @property {Boolean} befEiltTelBool - 
 * @property {Boolean} befEiltFaxBool - 
 * @property {String} befEiltNr - 
 * @property {String} ssw - 
 * @property {String} zuAngaben - 
 * @property {String} befEiltFax - 
 * @property {String} befEiltTel - 
 * @property {boolean} befEilt - 
 * @property {boolean} kontrollunters - 
 * @property {String} scheinRemittor - 
 * @property {String} scheinEstablishment - 
 * @property {String} ggfKennziffer - 
 * @property {boolean} edtaGrBlutbild - 
 * @property {boolean} edtaKlBlutbild - 
 * @property {boolean} edtaHbA1c - 
 * @property {boolean} edtaReti - 
 * @property {boolean} edtaBlutsenkung - 
 * @property {boolean} edtaDiffBlutbild - 
 * @property {boolean} citratQu - 
 * @property {boolean} citratQuMarcumar - 
 * @property {boolean} citratThrombin - 
 * @property {boolean} citratPTT - 
 * @property {boolean} citratFibri - 
 * @property {boolean} svbAlkPhos - 
 * @property {boolean} svbAmylase - 
 * @property {boolean} svbASL - 
 * @property {boolean} svbBiliD - 
 * @property {boolean} svbBiliG - 
 * @property {boolean} svbCalc - 
 * @property {boolean} svbCholesterin - 
 * @property {boolean} svbCholin - 
 * @property {boolean} svbCK - 
 * @property {boolean} svbCKMB - 
 * @property {boolean} svbCRP - 
 * @property {boolean} svbEisen - 
 * @property {boolean} svbEiwE - 
 * @property {boolean} svbEiwG - 
 * @property {boolean} svbGammaGT - 
 * @property {boolean} svbGlukose - 
 * @property {boolean} svbGOT - 
 * @property {boolean} svbGPT - 
 * @property {boolean} svbHarnsäure - 
 * @property {boolean} svbHarnstoff - 
 * @property {boolean} svbHBDH - 
 * @property {boolean} svbHDL - 
 * @property {boolean} svbLgA - 
 * @property {boolean} svbLgG - 
 * @property {boolean} svbLgM - 
 * @property {boolean} svbKali - 
 * @property {boolean} svbKrea - 
 * @property {boolean} svbKreaC - 
 * @property {boolean} svbLDH - 
 * @property {boolean} svbLDL - 
 * @property {boolean} svbLipase - 
 * @property {boolean} svbNatrium - 
 * @property {boolean} svbOPVorb - 
 * @property {boolean} svbPhos - 
 * @property {boolean} svbTransf - 
 * @property {boolean} svbTrigl - 
 * @property {boolean} svbTSHBasal - 
 * @property {boolean} svbTSHTRH - 
 * @property {boolean} glu1 - 
 * @property {boolean} glu2 - 
 * @property {boolean} glu3 - 
 * @property {boolean} glu4 - 
 * @property {boolean} urinStatus - 
 * @property {boolean} urinMikroalb - 
 * @property {boolean} urinSchwTest - 
 * @property {boolean} urinGlukose - 
 * @property {boolean} urinAmylase - 
 * @property {boolean} urinSediment - 
 * @property {boolean} sonstiges - 
 * @property {boolean} harnStreifenTest - 
 * @property {boolean} nuechternPlasmaGlukose - 
 * @property {boolean} lipidprofil - 
 * @property {Boolean} asvTeamReferral - 
 * @property {String} testDescriptions - 
 * @property {String} labRequestId - 
 * @property {String} labText - 
 * @property {Object} labEntries - 
 * @property {Object} l_extra - 
 * @property {Object} l_version - 
 * @property {Date} labLogTimestamp - 
 * @property {Boolean} fk4204 - 
 * @property {Boolean} behandlungGemaess - 
 * @property {Date} abnDatumZeit - 
 * @property {String} auftrag - 
 * @property {String} scheinSlipMedicalTreatment - 
 * @property {Boolean} fk4202 - 
 * @property {Array.<String>} icds - 
 * @property {Array.<String>} icdsExtra - 
 */