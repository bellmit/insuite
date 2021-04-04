/**
 *  Script to parse inSuite logs for aggregate timing information of API calls
 *
 *  Output CSV to paste into a spreadsheet
 */

/*eslint no-console:0 */

const
    readline = require( 'readline' ),
    fs = require('fs'),
    stats = {};


const
    callList = [
        "Y.doccirrus.api.InCaseMojit.getVatList",
        "Y.doccirrus.api.NAME.loadActivitySettings",
        "Y.doccirrus.api.activity.addAttachmentLinks",
        "Y.doccirrus.api.activity.checkCatalogCode",
        "Y.doccirrus.api.activity.checkKbvUtilityExistence",
        "Y.doccirrus.api.activity.checkSubGop",
        "Y.doccirrus.api.activity.checkTransition",
        "Y.doccirrus.api.activity.createActivitiesFromCatalogusage",
        "Y.doccirrus.api.activity.createActivityForPatient",
        "Y.doccirrus.api.activity.createActivitySafe",
        "Y.doccirrus.api.activity.createFindingForPatient",
        "Y.doccirrus.api.activity.createKbvMedicationPlanForMedications",
        "Y.doccirrus.api.activity.delete",
        "Y.doccirrus.api.activity.doTransition",
        "Y.doccirrus.api.activity.doTransitionBatch",
        "Y.doccirrus.api.activity.doTransitionPlus",
        "Y.doccirrus.api.activity.generateContent",
        "Y.doccirrus.api.activity.get",
        "Y.doccirrus.api.activity.getActivityDataForPatient",
        "Y.doccirrus.api.activity.getActivityForFrontend",
        "Y.doccirrus.api.activity.getActualMedicationData",
        "Y.doccirrus.api.activity.getCaseFileLight",
        "Y.doccirrus.api.activity.getCaseFolderBl",
        "Y.doccirrus.api.activity.getCashBook",
        "Y.doccirrus.api.activity.getCompleteScheins",
        "Y.doccirrus.api.activity.getContinuousDiagnosis",
        "Y.doccirrus.api.activity.getDistinct",
        "Y.doccirrus.api.activity.getKbvUtilityAgreement",
        "Y.doccirrus.api.activity.getMedicationData",
        "Y.doccirrus.api.activity.getNewActivityForFrontend",
        "Y.doccirrus.api.activity.getOpenBilledSchein",
        "Y.doccirrus.api.activity.getOpenScheinBL",
        "Y.doccirrus.api.activity.getPrescriptionTypes",
        "Y.doccirrus.api.activity.incrementPrintCount",
        "Y.doccirrus.api.activity.isScheinComplete",
        "Y.doccirrus.api.activity.lastKbvUtility",
        "Y.doccirrus.api.activity.moveActivity",
        "Y.doccirrus.api.activity.post",
        "Y.doccirrus.api.activity.recalcBLInCaseFolder",
        "Y.doccirrus.api.activity.saveKbvUtilityDiagnosis",
        "Y.doccirrus.api.activity.saveMedicationPlan",
        "Y.doccirrus.api.activity.setEmployeeName",
        "Y.doccirrus.api.activity.setPatientName",
        "Y.doccirrus.api.activity.updateActivitySafe",
        "Y.doccirrus.api.activity.updateBatch",
        "Y.doccirrus.api.activity.updateEditor",
        "Y.doccirrus.api.activity.updateKBVMedicationPlanPdf",
        "Y.doccirrus.api.activitysequence.applySequence",
        "Y.doccirrus.api.activitysequence.getAllSequenceGroups",
        "Y.doccirrus.api.activitysequence.getLightSequences",
        "Y.doccirrus.api.activitysequence.getSequenceWithActivities",
        "Y.doccirrus.api.activitytabsconfiguration.get",
        "Y.doccirrus.api.admin.checkAndUpdateVersion",
        "Y.doccirrus.api.admin.setLanguage",
        "Y.doccirrus.api.admin.getLanguage",
        "Y.doccirrus.api.appreg.getEntry",
        "Y.doccirrus.api.appreg.getPopulated",
        "Y.doccirrus.api.appreg.registerUIMenu",
        "Y.doccirrus.api.appreg.runOnStart",
        "Y.doccirrus.api.appreg.writeConfigFile",
        "Y.doccirrus.api.audit.getEntry",
        "Y.doccirrus.api.audit.getForAuditBrowser",
        "Y.doccirrus.api.auth.unlockLogin",
        "Y.doccirrus.api.basecontact.get",
        "Y.doccirrus.api.basecontact.getExpandedPhysicians",
        "Y.doccirrus.api.budget.calculate",
        "Y.doccirrus.api.calendar.doesCalendarAcceptScheduletypeId",
        "Y.doccirrus.api.calendar.getPopulatedCalendar",
        "Y.doccirrus.api.calendar.gettime",
        "Y.doccirrus.api.calevent.calculateSchedule",
        "Y.doccirrus.api.calevent.createCloseDayEvent",
        "Y.doccirrus.api.calevent.delete",
        "Y.doccirrus.api.calevent.get",
        "Y.doccirrus.api.calevent.getBlockedSlots",
        "Y.doccirrus.api.calevent.getConsultTimes",
        "Y.doccirrus.api.calevent.getDocSchedules",
        "Y.doccirrus.api.calevent.getForCloseDayTable",
        "Y.doccirrus.api.calevent.moveEventToOtherCalendarColumn",
        "Y.doccirrus.api.calevent.post",
        "Y.doccirrus.api.calevent.put",
        "Y.doccirrus.api.calevent.updateRoomAppointments",
        "Y.doccirrus.api.calevent.validateCaleventData",
        "Y.doccirrus.api.cardreaderconfiguration.getRegisteredCardreaders",
        "Y.doccirrus.api.casefolder.checkCaseFolder",
        "Y.doccirrus.api.casefolder.copyActivitiesToCaseFolder",
        "Y.doccirrus.api.casefolder.get",
        "Y.doccirrus.api.casefolder.getAllowedCaseFolderForEmployee",
        "Y.doccirrus.api.casefolder.getCaseFolderDataForActivity",
        "Y.doccirrus.api.casefolder.getCaseFolderForCurrentEmployee",
        "Y.doccirrus.api.casefolder.getCaseFolderQueryForEmployee",
        "Y.doccirrus.api.casefolder.moveActivitiesToCaseFolder",
        "Y.doccirrus.api.casefolder.post",
        "Y.doccirrus.api.casefolder.setActiveTab",
        "Y.doccirrus.api.casefolder.updateCaseFolderRuleStats",
        "Y.doccirrus.api.catalog.catalogCodeSearch",
        "Y.doccirrus.api.catalog.catalogViewerList",
        "Y.doccirrus.api.catalog.catalogViewerListAvailableCatalogs",
        "Y.doccirrus.api.catalog.catalogViewerSearch",
        "Y.doccirrus.api.catalog.catsearch",
        "Y.doccirrus.api.catalog.get",
        "Y.doccirrus.api.catalog.getCatalogDescriptorsByActType",
        "Y.doccirrus.api.catalog.getEBMDescriptorByLocationId",
        "Y.doccirrus.api.catalog.getInsurances",
        "Y.doccirrus.api.catalog.getPKVKT",
        "Y.doccirrus.api.catalog.getTreatmentCatalogEntry",
        "Y.doccirrus.api.catalog.getUtilityAgreement",
        "Y.doccirrus.api.catalog.hmvCatalogUsageSearch",
        "Y.doccirrus.api.catalog.hmvSearch",
        "Y.doccirrus.api.catalog.lookup",
        "Y.doccirrus.api.catalog.searchIcdsInCatalogAndPatient",
        "Y.doccirrus.api.catalog.searchKbvUtility",
        "Y.doccirrus.api.catalog.verifyKT",
        "Y.doccirrus.api.catalogtext.getCatalogText",
        "Y.doccirrus.api.catalogusage.calculateUsageIndexSeq",
        "Y.doccirrus.api.catalogusage.getMMIActualData",
        "Y.doccirrus.api.catalogusage.getTopByShortName",
        "Y.doccirrus.api.cli.getPRCHost",
        "Y.doccirrus.api.cli.getPRCIP",
        "Y.doccirrus.api.cli.getStatus",
        "Y.doccirrus.api.cli.softwareUpdate",
        "Y.doccirrus.api.communication.sendSupportEmail",
        "Y.doccirrus.api.crlog.applyAction",
        "Y.doccirrus.api.crlog.getHistory",
        "Y.doccirrus.api.device.executeApp",
        "Y.doccirrus.api.device.getFieldsForXDT",
        "Y.doccirrus.api.device.getGDTVersions",
        "Y.doccirrus.api.device.getLDTVersions",
        "Y.doccirrus.api.device.getProcedureList",
        "Y.doccirrus.api.device.getS2eClients",
        "Y.doccirrus.api.device.readDirDeviceServer",
        "Y.doccirrus.api.device.readFileDeviceServer",
        "Y.doccirrus.api.device.unlinkDeviceServer",
        "Y.doccirrus.api.device.writeFileDeviceServer",
        "Y.doccirrus.api.diagnosis.getLatestDiagnosesFromPatientRegardingDaySeparationOfTreatments",
        "Y.doccirrus.api.document.getByTag",
        "Y.doccirrus.api.dscrmanager.getOnlineCardreadersList",
        "Y.doccirrus.api.dscrmanager.readCard",
        "Y.doccirrus.api.edmp.checkEdmpCaseNo",
        "Y.doccirrus.api.edmp.isEdmpCaseNoLocked",
        "Y.doccirrus.api.employee.GET",
        "Y.doccirrus.api.employee.PUT",
        "Y.doccirrus.api.employee.getEmployeeByName",
        "Y.doccirrus.api.employee.getEmployeeForUsername",
        "Y.doccirrus.api.employee.getIdentityForUsername",
        "Y.doccirrus.api.employee.getLabDataSortOrder",
        "Y.doccirrus.api.employee.getLabDataSortOrderForUsername",
        "Y.doccirrus.api.employee.getLoggedInEmployee",
        "Y.doccirrus.api.employee.getMyEmployee",
        "Y.doccirrus.api.employee.readEmployeeForAdminDetail",
        "Y.doccirrus.api.employee.readEmployeesForAdminOverview",
        "Y.doccirrus.api.employee.updateEmployee",
        "Y.doccirrus.api.employee.updateLabdataSortOrder",
        "Y.doccirrus.api.employee.updateOnlyEmployee",
        "Y.doccirrus.api.errors.log",
        "Y.doccirrus.api.flow.execute",
        "Y.doccirrus.api.flow.getActiveFlows",
        "Y.doccirrus.api.flow.getFlowsForCollection",
        "Y.doccirrus.api.flow.getLaunchers",
        "Y.doccirrus.api.formfolder.getFoldersWithForms",
        "Y.doccirrus.api.formprinter.getAllAlternatives",
        "Y.doccirrus.api.formprinter.getPrinter",
        "Y.doccirrus.api.formprinter.loadIndividualAssignment",
        "Y.doccirrus.api.formprinter.setSingle",
        "Y.doccirrus.api.formtemplate.getConfig",
        "Y.doccirrus.api.formtemplate.getUserReportingFields",
        "Y.doccirrus.api.formtemplate.listForms",
        "Y.doccirrus.api.formtemplate.loadForm",
        "Y.doccirrus.api.formtemplate.makeKoTablePDF",
        "Y.doccirrus.api.formtemplate.makePDF",
        "Y.doccirrus.api.identity.getLastActivatedProfile",
        "Y.doccirrus.api.identity.getOnlineStatus",
        "Y.doccirrus.api.identity.updateOnlineStatus",
        "Y.doccirrus.api.incaseconfiguration.readConfig",
        "Y.doccirrus.api.inpacslog.unclaimInpacsLogEntry",
        "Y.doccirrus.api.insight2.get",
        "Y.doccirrus.api.insight2.getOne",
        "Y.doccirrus.api.insight2containers.getByName",
        "Y.doccirrus.api.insight2containers.updateConfig",
        "Y.doccirrus.api.insight2importexport.listSetOnDB",
        "Y.doccirrus.api.insight2importexport.listSetOnDisk",
        "Y.doccirrus.api.invoiceconfiguration.get",
        "Y.doccirrus.api.invoiceconfiguration.getNextInvoiceNumber",
        "Y.doccirrus.api.invoiceconfiguration.invoicefactor",
        "Y.doccirrus.api.invoicelog.calculateEntries",
        "Y.doccirrus.api.invoiceprocess.getProcessInfo",
        "Y.doccirrus.api.jade.renderFile",
        "Y.doccirrus.api.jira.search",
        "Y.doccirrus.api.kbv.abrechnungsgebiete",
        "Y.doccirrus.api.kbv.certNumbers",
        "Y.doccirrus.api.kbv.dkm",
        "Y.doccirrus.api.kbv.fachgruppe",
        "Y.doccirrus.api.kbv.gebuehrenordnung",
        "Y.doccirrus.api.kbv.kvFromLocationId",
        "Y.doccirrus.api.kbv.personenkreis",
        "Y.doccirrus.api.kbv.pseudognr",
        "Y.doccirrus.api.kbv.scheinRelatedPatientVersion",
        "Y.doccirrus.api.kbv.scheinarten",
        "Y.doccirrus.api.kbv.scheinunterarten",
        "Y.doccirrus.api.kbv.sktinfo",
        "Y.doccirrus.api.kbv.sktzusatz",
        "Y.doccirrus.api.kbv.versichertenarten",
        "Y.doccirrus.api.kbvlog.generateQPZ",
        "Y.doccirrus.api.kbvlog.get",
        "Y.doccirrus.api.kbvlog.validate",
        "Y.doccirrus.api.kbvutilityprice.getPrices",
        "Y.doccirrus.api.kotableconfiguration.saveUserConfiguration",
        "Y.doccirrus.api.lab.getStringified",
        "Y.doccirrus.api.labtest.get",
        "Y.doccirrus.api.labtest.undefined",
        "Y.doccirrus.api.labtest.updateLabTests",
        "Y.doccirrus.api.linkedactivities.confirmInvalidatedParents",
        "Y.doccirrus.api.linkedactivities.statuscheck.get",
        "Y.doccirrus.api.location.enhancedLocations",
        "Y.doccirrus.api.location.get",
        "Y.doccirrus.api.location.getForeignLocations",
        "Y.doccirrus.api.location.getLocationSet",
        "Y.doccirrus.api.meddata.getAllMeddataTypes",
        "Y.doccirrus.api.meddata.getMedDataItemTemplateCollection",
        "Y.doccirrus.api.meddata.getLatestMeddataForPatient",
        "Y.doccirrus.api.mirrorscheduletype.getScheduleTypesForCalendar",
        "Y.doccirrus.api.mmi.generateCarrierSegments",
        "Y.doccirrus.api.mmi.generateMedicationPlanPDF",
        "Y.doccirrus.api.mmi.getAMR",
        "Y.doccirrus.api.mmi.getARV",
        "Y.doccirrus.api.mmi.getCatalogEntries",
        "Y.doccirrus.api.mmi.getCompareableMedications",
        "Y.doccirrus.api.mmi.getDocuments",
        "Y.doccirrus.api.mmi.getMappedProduct",
        "Y.doccirrus.api.mmi.getMappingCatalogEntries",
        "Y.doccirrus.api.mmi.getMetaData",
        "Y.doccirrus.api.mmi.getPackages",
        "Y.doccirrus.api.mmi.getPackagesDetails",
        "Y.doccirrus.api.mmi.getProductInfo",
        "Y.doccirrus.api.mmi.getProducts",
        "Y.doccirrus.api.mmi.getProductsDetails",
        "Y.doccirrus.api.mmi.sendRequest",
        "Y.doccirrus.api.mmi.sendRequestPost",
        "Y.doccirrus.api.patient.addMarkers",
        "Y.doccirrus.api.patient.additionalFormData",
        "Y.doccirrus.api.patient.attachActivity",
        "Y.doccirrus.api.patient.detachActivity",
        "Y.doccirrus.api.patient.get",
        "Y.doccirrus.api.patient.getAppointments",
        "Y.doccirrus.api.patient.getForPatientBrowser",
        "Y.doccirrus.api.patient.getForPatientGadgetAppointments",
        "Y.doccirrus.api.patient.getPatientReferenceContacts",
        "Y.doccirrus.api.patient.getPopulatedPatient",
        "Y.doccirrus.api.patient.hasDocumentedSchein",
        "Y.doccirrus.api.patient.isNewestVersion",
        "Y.doccirrus.api.patient.lastSchein",
        "Y.doccirrus.api.patient.mergePatients",
        "Y.doccirrus.api.patient.put",
        "Y.doccirrus.api.patient.relevantDiagnosesForTreatment",
        "Y.doccirrus.api.patient.removeMarkers",
        "Y.doccirrus.api.patient.savePatient",
        "Y.doccirrus.api.patient.updateAttachedContent",
        "Y.doccirrus.api.patientreg.setPortalAuth",
        "Y.doccirrus.api.patientreg.updatePatientregOnPUC",
        "Y.doccirrus.api.physician.get",
        "Y.doccirrus.api.physician.getWithSpecializationString",
        "Y.doccirrus.api.practice.getIntimeConfig",
        "Y.doccirrus.api.prescription.createPrescriptionsAndMedicationPlan",
        "Y.doccirrus.api.prescription.prepareDataForPrint",
        "Y.doccirrus.api.prescription.prescribeMedications",
        "Y.doccirrus.api.prescription.printPrescriptions",
        "Y.doccirrus.api.printer.getPrinter",
        "Y.doccirrus.api.profile.getDefaultProfile",
        "Y.doccirrus.api.profile.updateDefaultPrinter",
        "Y.doccirrus.api.receipt.assignToInvoice",
        "Y.doccirrus.api.reporting.generatePerformanceGroupReport",
        "Y.doccirrus.api.reporting.generatePerformanceReportByEmployees",
        "Y.doccirrus.api.reporting.generateSchneiderKBVLogAnalysis",
        "Y.doccirrus.api.reporting.getAnalysis",
        "Y.doccirrus.api.reporting.getDataByAggregation",
        "Y.doccirrus.api.reporting.getDataByConfigId",
        "Y.doccirrus.api.reporting.getLabDataOverview",
        "Y.doccirrus.api.reporting.regenerateFromAuditLog",
        "Y.doccirrus.api.room.getRoomsWithCountedSchedules",
        "Y.doccirrus.api.rule.trigger",
        "Y.doccirrus.api.ruleimportexport.docCirrusImportAll",
        "Y.doccirrus.api.ruleimportexport.getImportFile",
        "Y.doccirrus.api.ruleimportexport.importDocCirrus",
        "Y.doccirrus.api.ruleimportexport.importSet",
        "Y.doccirrus.api.ruleimportexport.listSetOnDisk",
        "Y.doccirrus.api.ruleimportexport.uploadbackup",
        "Y.doccirrus.api.rulelog.addEntries",
        "Y.doccirrus.api.rulelog.removeEntries",
        "Y.doccirrus.api.rulelog.removeEntriesAndUpdateCaseFolderStats",
        "Y.doccirrus.api.rulelog.updateCaseFolderStats",
        "Y.doccirrus.api.scheduletype.readScheduletypesForCalendarId",
        "Y.doccirrus.api.sdManager.executeS2eClient",
        "Y.doccirrus.api.sdManager.exportPatientToHL7",
        "Y.doccirrus.api.sdManager.getDeviceServerVersion",
        "Y.doccirrus.api.sdManager.getS2eClients",
        "Y.doccirrus.api.sdManager.readDirS2eClient",
        "Y.doccirrus.api.sdManager.readFileS2eClient",
        "Y.doccirrus.api.sdManager.reloadDevices",
        "Y.doccirrus.api.sdManager.unlinkS2eClient",
        "Y.doccirrus.api.sdManager.writeFileS2eClient",
        "Y.doccirrus.api.settings.countOpenTabs",
        "Y.doccirrus.api.settings.dynamsoft",
        "Y.doccirrus.api.settings.get",
        "Y.doccirrus.api.settings.getPatientPortalUrl",
        "Y.doccirrus.api.settings.isRemoteAllowed",
        "Y.doccirrus.api.severity.getSeveritySorted",
        "Y.doccirrus.api.socketioevent.delete",
        "Y.doccirrus.api.socketioevent.deleteEventByMessageId",
        "Y.doccirrus.api.socketioevent.deleteExternalApiCallEvent",
        "Y.doccirrus.api.socketioevent.deletePUCActionCallEvent",
        "Y.doccirrus.api.socketioevent.getEventsForUser",
        "Y.doccirrus.api.socketioevent.getExternalApiCallEvent",
        "Y.doccirrus.api.socketioevent.getPUCActionCallEvent",
        "Y.doccirrus.api.socketioevent.post",
        "Y.doccirrus.api.socketioevent.savePUCActionCallEvent",
        "Y.doccirrus.api.tag.delete",
        "Y.doccirrus.api.tag.get",
        "Y.doccirrus.api.tag.getMedLabData",
        "Y.doccirrus.api.tag.updateTags",
        "Y.doccirrus.api.task.alertHotTasks",
        "Y.doccirrus.api.task.getPatientHotTask",
        "Y.doccirrus.api.task.getPopulatedTask",
        "Y.doccirrus.api.tasktype.getForTypeTable",
        "Y.doccirrus.api.ticontext.tiForPatientBrowser",
        "Y.doccirrus.api.timanager.getCachedTiStatusInfo",
        "Y.doccirrus.api.timanager.pinOperation",
        "Y.doccirrus.api.timanager.readCard",
        "Y.doccirrus.api.tisettings.get",
        "Y.doccirrus.api.workstation.getWithTiCardReaders",
        "Y.doccirrus.api.xdtParser.parse"
    ];

if ( !process.argv[2] ) {
    console.log( 'Please pass a filename:\n\n\tnode ./log-timing.js /path/to/my.log\n\n' );
    process.exit( 1 );
}



let
    fileName = process.argv[2],
    inputStream = fs.createReadStream( fileName ),
    lineReader = readline.createInterface( { input: inputStream } );

//let lineCount = 0;

initStats();
lineReader.on('line', onReadLine );
lineReader.on( 'close', onEndOfFile );

function onReadLine(line) {
    //lineCount++;
    if ( -1 === line.indexOf(': Exiting Y.d' ) ) { return; }

    let
        parts = line.split( ' ' ),
        isSlow = ( -1 !== line.indexOf( '[SLOW-API-CALL]' ) ),
        isVerySlow = ( -1 !== line.indexOf( '[VERY-SLOW-API-CALL]' ) ),
        callName = parts[9],
        elapsed = -1,
        i;

    for ( i = 9; i < parts.length; i++ ) {
        if ( '[' === parts[i].substr( 0, 1 ) && -1 !== parts[i].indexOf( 'ms]' ) ) {
            elapsed = parseInt( parts[i].replace( '[', '' ).replace( 'ms]', '' ), 10 );
        }
    }

    if ( -1 === elapsed ) {
        //console.log( `[!] malformed log entry: ${line}` );
        return;
    }

    if ( !stats.hasOwnProperty( callName ) ) {
        /*
        stats[ callName ] = {
            callName: callName,
            count: 0,
            total: 0,
            isSlow: 0,
            isVerySlow: 0
        };
        */
        //  not checking this one
        return;
    }

    stats[ callName ].count++;
    stats[ callName ].total += elapsed;

    if ( isSlow ) {
        stats[ callName ].isSlow++;
    }

    if ( isVerySlow ) {
        stats[ callName ].isVerySlow++;
    }
}

function onEndOfFile() {
    //console.log( `---- EOF (${lineCount} lines) ----` );

    let
        csvLines = [],
        k, i;

    //  add one line for each call

    for ( k in stats ) {
        if ( stats[k].callName ) {
            stats[k].mean = ( stats[k].total / stats[k].count );

            if ( isNaN( stats[k].mean ) ) { stats[k].mean = 0; }

            csvLines.push( [ stats[k].callName, stats[k].mean, stats[k].count, stats[k].total, stats[k].isSlow, stats[k].isVerySlow ] );
        }
    }

    //  sort alphabetically

    csvLines.sort( function( a, b ) {
        if ( a > b ) { return 1; }
        if ( a < b ) { return -1; }
        if ( a === b ) { return 0; }
    } );

    //  add header row

    csvLines.unshift( [ 'callName', 'mean', 'count', 'total', 'isSlow', 'isVerySlow' ] );

    //  print to stdout

    for ( i = 0; i < csvLines.length; i++ ) {
        console.log( csvLines[i].join(',') );
    }

}

//  makes it easier to compare CSV
function initStats( ) {
    let callName;
    for ( callName of callList ) {
        stats[ callName ] = {
            callName: callName,
            count: 0,
            total: 0,
            isSlow: 0,
            isVerySlow: 0
        };
    }
}