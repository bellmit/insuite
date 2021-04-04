/*global YUI */
'use strict';
YUI.add( 'JsonRpcReflection-doccirrus', function( Y/*, NAME*/ ) {
    /**
     * API description
     * @module JsonRpcReflection-doccirrus
     */
    Y.doccirrus.jsonrpc.reflection.add( [
        /** @class  Y.doccirrus.api.auth */
        /**
         * @property loginDevicePoll
         * @for  doccirrus.api.auth.loginDevicePoll
         * @type {Function}
         */
        { namespace: 'auth', method: 'loginDevicePoll' },

        /** @class  Y.doccirrus.api.fhir-identifier */
        /**
         * @property loginDevicePoll
         * @for  doccirrus.api.fhir-identifier.create
         * @type {Function}
         */
        { namespace: 'fhir-identifier', method: 'post' },

        /** @class doccirrus.jsonrpc.api.mirrorlocation */
        /**
         * @property mirrorlocation
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.mirrorlocation}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.mirrorlocation
         * @type {Function}
         */
        { namespace: 'mirrorlocation', method: 'read' },

        /** @class doccirrus.jsonrpc.api.location */
        /**
         * @property location
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.location}
         */
        /**
         * @property
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'enhancedLocations'},

        /**
         * @property create
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'create', access: 'ADMIN' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'update', access: 'ADMIN' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'delete', access: 'ADMIN' },
        /**
         * @property testEmail
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'testEmail', access: 'ADMIN' },
        /**
         * @property testEmailWithoutSend
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'testEmailWithoutSend', access: 'ADMIN' },

        /**
         * @property isCommercialNoAlreadyAssigned
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'isCommercialNoAlreadyAssigned', access: 'ADMIN' },

        /**
         * @property getForeignLocations
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'getForeignLocations' },
        /**
         * @property saveWithStockLocations
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'saveWithStockLocations', access: 'ADMIN' },
        /**
         * @property deleteWithStockLocations
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'deleteWithStockLocations', access: 'ADMIN' },
        /**
         * @property getWithStockLocations
         * @for doccirrus.jsonrpc.api.location
         * @type {Function}
         */
        { namespace: 'location', method: 'getWithStockLocations' },
        /** @class doccirrus.jsonrpc.api.practice */
        /**
         * @property practice
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.practice}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.practice
         * @type {Function}
         */
        { namespace: 'practice', method: 'create', access: 'ADMIN' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.practice
         * @type {Function}
         */
        { namespace: 'practice', method: 'read' },
        /**
         * @property getMyPractice
         * @for doccirrus.jsonrpc.api.practice
         * @type {Function}
         */
        { namespace: 'practice', method: 'getMyPractice' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.practice
         * @type {Function}
         */
        { namespace: 'practice', method: 'update', access: 'ADMIN' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.practice
         * @type {Function}
         */
        { namespace: 'practice', method: 'delete', access: 'ADMIN' },
        /**
         * @property saveIntimeConfig
         * @for doccirrus.jsonrpc.api.practice
         * @type {Function}
         */
        { namespace: 'practice', method: 'saveIntimeConfig', access: 'ADMIN' },
        /**
         * @property getIntimeConfig
         * @for doccirrus.jsonrpc.api.practice
         * @type {Function}
         */
        { namespace: 'practice', method: 'getIntimeConfig' },
        /**
         * @property doesCountryModeIncludeGermany
         * @for doccirrus.jsonrpc.api.doesCountryModeIncludeGermany
         * @type {Function}
         */
        { namespace: 'practice', method: 'getCountryMode' },
        /**
         * @property doesCountryModeIncludeGermany
         * @for doccirrus.jsonrpc.api.doesCountryModeIncludeGermany
         * @type {Function}
         */
        { namespace: 'practice', method: 'doesCountryModeIncludeGermany' },
        /**
         * @property doesCountryModeIncludeSwitzerland
         * @for doccirrus.jsonrpc.api.doesCountryModeIncludeSwitzerland
         * @type {Function}
         */
        { namespace: 'practice', method: 'doesCountryModeIncludeSwitzerland' },
        { namespace: 'cacheUtils', method: 'getData' },
        /** @class doccirrus.jsonrpc.api.padx */
        /**
         * @property padx
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.padx}
         */
        /**
         * @property getSpecVersion
         * @for doccirrus.jsonrpc.api.padx
         * @type {Function}
         */
        { namespace: 'padx', method: 'getSpecVersion' },
        /** @class doccirrus.jsonrpc.api.calendar */
        /**
         * @property calendar
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.calendar}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'create', access: 'ADMIN' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'update', access: 'CONTROLLER' },
        /**
         * @property updateResources
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'updateResources', access: 'ADMIN' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'delete', access: 'ADMIN' },
        /**
         * @property readCalendarCloseTime
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'readCalendarCloseTime' },
        /**
         * @property readCalendarAdminOverview
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'readCalendarAdminOverview' },
        /**
         * @property doesCalendarAcceptScheduletypeId
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'doesCalendarAcceptScheduletypeId' },
        /**
         * @property getPartnersSharedCalendars
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'getPartnersSharedCalendars' },
        /**
         * @property importCloseTime
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'importCloseTime' },
        /**
         * @property getPopulatedCalendar
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'getPopulatedCalendar' },
        /**
         * @property getAllCalGroups
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'getAllCalGroups' },
        /**
         * @property gettime
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'gettime' },
        /**
         * @property gettime
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calendar', method: 'gettime' },
        /** @class doccirrus.jsonrpc.api.room */
        /**
         * @property room
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.room}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.room
         * @type {Function}
         */
        { namespace: 'room', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.room
         * @type {Function}
         */
        { namespace: 'room', method: 'read' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.room
         * @type {Function}
         */
        { namespace: 'room', method: 'delete' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.room
         * @type {Function}
         */
        { namespace: 'room', method: 'update' },
        /**
         * @property updateRooms
         * @for doccirrus.jsonrpc.api.room
         * @type {Function}
         */
        { namespace: 'room', method: 'updateRooms' },
        /**
         * @property getRoomsWithCountedSchedules
         * @for doccirrus.jsonrpc.api.room
         * @type {Function}
         */
        { namespace: 'room', method: 'getRoomsWithCountedSchedules' },
        /**
         * @property roomconfiguration
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.roomconfiguration}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.roomconfiguration
         * @type {Function}
         */
        { namespace: 'roomconfiguration', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.roomconfiguration
         * @type {Function}
         */
        { namespace: 'roomconfiguration', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.roomconfiguration
         * @type {Function}
         */
        { namespace: 'roomconfiguration', method: 'update' },
        /** @class doccirrus.jsonrpc.api.list */
        /**
         * @property list
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.list}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.list
         * @type {Function}
         */
        { namespace: 'list', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.list
         * @type {Function}
         */
        { namespace: 'list', method: 'read' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.list
         * @type {Function}
         */
        { namespace: 'list', method: 'delete' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.list
         * @type {Function}
         */
        { namespace: 'list', method: 'update' },
        /** @class doccirrus.jsonrpc.api.patient */
        /**
         * @property patient
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.patient}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'delete' },
        /**
         * @property getForPatientBrowser
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'getForPatientBrowser' },
        /**
         * @property getPatientOFACInfo
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'getPatientOFACInfo' },
        /**
         * @property getPatientReferenceContacts
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'getPatientReferenceContacts' },
        /**
         * @property sendEmailConfirmation
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'sendEmailConfirmation' },
        /**
         * @property getPatientDiff
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'getPatientDiff' },
        /**
         * @property trialDataImportCombine
         * @for doccirrus.jsonrpc.api.import
         * @type {Function}
         */
        { namespace: 'import', method: 'trialDataImportCombine' },
        /**
         * @property importAllOtherCollections
         * @for doccirrus.jsonrpc.api.import
         * @type {Function}
         */
        { namespace: 'import', method: 'importAllOtherCollections', access: 'ADMIN' },
        /**
         * @property importEmployeeLocations
         * @for doccirrus.jsonrpc.api.import
         * @type {Function}
         */
        { namespace: 'import', method: 'importEmployeeLocations' },
        /**
         * @property importCalendarsAndSchedules
         * @for doccirrus.jsonrpc.api.import
         * @type {Function}
         */
        { namespace: 'import', method: 'importCalendarsAndSchedules' },
        /**
         * @property clearEmployeesAndLocations
         * @for doccirrus.jsonrpc.api.import
         * @type {Function}
         */
        //{ namespace: 'import', method: 'clearEmployeesAndLocations' },
        /**
         * @property clearCalendarsAndSchedules
         * @for doccirrus.jsonrpc.api.import
         * @type {Function}
         */
        //{ namespace: 'import', method: 'clearCalendarsAndSchedules' },
        /**
         * @property clearAllOtherCollections
         * @for doccirrus.jsonrpc.api.import
         * @type {Function}
         */
        //{ namespace: 'import', method: 'clearAllOtherCollections' },
        /**
         * @property finalDataImportCombine
         * @for doccirrus.jsonrpc.api.import
         * @type {Function}
         */
        { namespace: 'import', method: 'finalDataImportCombine' },
        /**
         * @property clearGridFSMediaAndDoc
         * @for doccirrus.jsonrpc.api.import
         * @type {Function}
         */
        //{ namespace: 'import', method: 'clearGridFSMediaAndDoc' },
        /**
         * @property exportToJsonFiles
         * @for doccirrus.jsonrpc.api.import
         * @type {Function}
         */
        { namespace: 'import', method: 'exportToJsonFiles' },
        /**
         * @property getPatients
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'getPatients' },
        /**
         * get patient appointments
         * @property getAppointments
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'getAppointments' },
        /**
         * get patient old appointments
         * @property getOldAppointments
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'getOldAppointments' },
        /**
         * get for PatientGadgetLastAppointments
         * @property getForPatientGadgetLastAppointments
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'getForPatientGadgetLastAppointments' },
        /**
         * get for PatientGadgetUpcomingAppointments
         * @property getForPatientGadgetAppointments
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'getForPatientGadgetAppointments' },
        /**
         * @property patientsWithoutCardSwipe
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'patientsWithoutCardSwipe' },
        /**
         * @property addMarkers
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'addMarkers' },
        /**
         * @property removeMarkers
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'removeMarkers' },
        /**
         * calls {{#crossLink "doccirrus.api.patient/isNewestVersion:method"}}isNewestVersion{{/crossLink}} from server
         * @property isNewestVersion
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.isNewestVersion
         */
        { namespace: 'patient', method: 'isNewestVersion' },
        /**
         * calls {{#crossLink "doccirrus.api.patient/relevantDiagnosesForTreatment:method"}}relevantDiagnosesForTreatment{{/crossLink}} from server
         * @property relevantDiagnosesForTreatment
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.relevantDiagnosesForTreatment
         */
        { namespace: 'patient', method: 'relevantDiagnosesForTreatment' },
        /**
         * calls {{#crossLink "doccirrus.api.patient/scheinByTimestamp:method"}}scheinByTimestamp{{/crossLink}} from server
         * @property scheinByTimestamp
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.scheinByTimestamp
         */
        { namespace: 'patient', method: 'scheinByTimestamp' },
        /**
         * @property scheinForCurrentQuarter
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.scheinForCurrentQuarter
         */
        { namespace: 'patient', method: 'scheinForCurrentQuarter' },
        /**
         * @property scheinForQuarterFromDate
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.scheinForQuarterFromDate
         */
        { namespace: 'patient', method: 'scheinForQuarterFromDate' },
        /**
         * @property additionalFormData
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.additionalFormData
         */
        { namespace: 'patient', method: 'additionalFormData' },
        /**
         * @property savePatient
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.savePatient
         */
        { namespace: 'patient', method: 'savePatient' },
        /**
         * @property checkPatientNo
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.checkPatientNo
         */
        { namespace: 'patient', method: 'checkPatientNo' },
        /**
         * @property attachActivity
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.attachActivity
         */
        { namespace: 'patient', method: 'attachActivity' },
        /**
         * @property detachActivity
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.detachActivity
         */
        { namespace: 'patient', method: 'detachActivity' },
        /**
         * @property lastSchein
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.lastSchein
         */
        { namespace: 'patient', method: 'lastSchein' },
        /**
         * @property lastScheinForUser
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.lastScheinForUser
         */
        { namespace: 'patient', method: 'lastScheinForUser' },
        /**
         * @property getPatientHistory
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.getPatientHistory
         */
        { namespace: 'patient', method: 'getPatientHistory' },
        /**
         * @property lastAU
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.lastAU
         */
        { namespace: 'patient', method: 'lastAU' },
        /**
         * @property patientsWithApkInProgress
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.patientsWithApkInProgress
         */
        { namespace: 'patient', method: 'patientsWithApkInProgress' },
        /**
         * @property askConfirmEMail
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.askConfirmEMail
         */
        { namespace: 'patient', method: 'askConfirmEMail' },
        /**
         * @property deleteCheck
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.deleteCheck
         */
        { namespace: 'patient', method: 'deleteCheck' },
        /**
         * @property mergeImportedPatient
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.mergeImportedPatient
         */
        { namespace: 'patient', method: 'mergeImportedPatient' },

        /**
         * @property editTelekardioSerial
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         * @see doccirrus.api.patient.editTelekardioSerial
         */
        { namespace: 'patient', method: 'editTelekardioSerial' },
        /**
         * merge one patient into another
         * @property mergePatients
         * @for doccirrus.jsonrpc.api.patient
         * @type {Function}
         */
        { namespace: 'patient', method: 'mergePatients' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.physician
         * @type {Function}
         */
        { namespace: 'physician', method: 'read' },
        /**
         * @property getWithSpecializationString
         * @for doccirrus.jsonrpc.api
         * @type {Function}
         * @see doccirrus.api.phsyician.getWithSpecializationString
         */
        { namespace: 'physician', method: 'getWithSpecializationString' },

        /** @class doccirrus.jsonrpc.api.patientversion */
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.patientversion
         * @type {Function}
         */
        { namespace: 'patientversion', method: 'update' },
        /**
         * @property getPrinter
         * @for doccirrus.jsonrpc.api.printer
         * @type {Function}
         * @see doccirrus.api.printer.getPrinter
         */
        { namespace: 'printer', method: 'getPrinter' },
        /**
         * @property listQueues
         * @for doccirrus.jsonrpc.api.printer
         * @type {Function}
         */
        { namespace: 'printer', method: 'listQueues' },
        /**
         * @property clearQueue
         * @for doccirrus.jsonrpc.api.printer
         * @type {Function}
         */
        { namespace: 'printer', method: 'clearQueue' },
        /**
         * @property refreshPrinterList
         * @for doccirrus.jsonrpc.api.printer
         * @type {Function}
         */
        { namespace: 'printer', method: 'refreshPrinterList' },

        /** @class doccirrus.jsonrpc.api.settings */
        /**
         * @property settings
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.settings}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.settings
         * @type {Function}
         */
        { namespace: 'settings', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.settings
         * @type {Function}
         */
        { namespace: 'settings', method: 'update', access: 'ADMIN' },
        /**
         * @property dynamsoft
         * @for doccirrus.jsonrpc.api.settings
         * @type {Function}
         */
        { namespace: 'settings', method: 'dynamsoft' },
        /**
         * @property verifySmtpConfiguration
         * @for doccirrus.jsonrpc.api.settings
         * @type {Function}
         */
        { namespace: 'settings', method: 'verifySmtpConfiguration' },
        /**
         * @property getLogFilePath
         * @for doccirrus.jsonrpc.api.settings
         * @type {Function}
         */
        { namespace: 'settings', method: 'getLogFilePath' },

        /** @class doccirrus.jsonrpc.api.employee */
        /**
         * @property employee
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.employee}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'create', access: 'ADMIN' },
        /**
         * @property updateOnlyEmployee
         * @for doccirrus.jsonrpc.api.updateOnlyEmployee
         * @type {Function}
         */
        { namespace: 'employee', method: 'updateOnlyEmployee' },
        /**
         * @property getASVTeamNumbers
         * @for doccirrus.jsonrpc.api.getASVTeamNumbers
         * @type {Function}
         */
        { namespace: 'employee', method: 'getASVTeamNumbers' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'update', access: 'ADMIN' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'delete', access: 'ADMIN' },
        /**
         * @property readEmployeesForAdminOverview
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'readEmployeesForAdminOverview', access: 'ADMIN' },
        /**
         * @property getMyEmployee
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'getMyEmployee' },
        /**
         * @property readEmployeeForAdminDetail
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'readEmployeeForAdminDetail', access: 'ADMIN' },
        /**
         * @property getIdentityForUsername
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'getIdentityForUsername' },

        /**
         * @property getLabDataSortOrderForUsername
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'getLabDataSortOrderForUsername' },

        /**
         * @property getEmployeeForUsername
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'getEmployeeForUsername' },
        /**
         * @property activateIdentity
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'activateIdentity', access: 'ADMIN' },
        /**
         * @property activateSupportAccount
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'activateSupportAccount' },
        /**
         * @property inactivateIdentity
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'inactivateIdentity', access: 'ADMIN' },
        /**
         * @property doResetUserPw
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'doResetUserPw' , access: 'USER' },
        /**
         * @property doResetEmployeePw
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'doResetEmployeePw' , access: 'ADMIN' },
        /**
         * @property getRlvPhysicians
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'getRlvPhysicians' },
        /**
         * @property getLoggedInEmployee
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'getLoggedInEmployee' },
        /**
         * @property getEmployeeByName
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'getEmployeeByName' },
        /**
         * @property updateEmployee
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'updateEmployee', access: 'ADMIN' },
        /**
         * @property checkIfInitialsAreAvailable
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'checkIfInitialsAreAvailable', access: 'ADMIN' },
        /**
         * @property setCurrentLocation
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'setCurrentLocation' },
        /**
         * @property updateLabdataSortOrder
         * @for doccirrus.jsonrpc.api.employee
         * @type {Function}
         */
        { namespace: 'employee', method: 'updateLabdataSortOrder', access: 'ADMIN' },
        /** @class doccirrus.jsonrpc.api.biller */
        /**
         * @property biller
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.biller}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.biller
         * @type {Function}
         */
        { namespace: 'biller', method: 'read' },
        /** @class doccirrus.jsonrpc.api.marker */
        /**
         * @property marker
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.marker}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.marker
         * @type {Function}
         */
        { namespace: 'marker', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.marker
         * @type {Function}
         */
        { namespace: 'marker', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.marker
         * @type {Function}
         */
        { namespace: 'marker', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.marker
         * @type {Function}
         */
        { namespace: 'marker', method: 'delete' },
        /** @class doccirrus.jsonrpc.api.severity */
        /**
         * @property severity
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.severity}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.severity
         * @type {Function}
         */
        { namespace: 'severity', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.severity
         * @type {Function}
         */
        { namespace: 'severity', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.severity
         * @type {Function}
         */
        { namespace: 'severity', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.severity
         * @type {Function}
         */
        { namespace: 'severity', method: 'delete' },
        /** @class doccirrus.jsonrpc.api.kbv */
        /**
         * @property kbv
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.kbv}
         */
        /**
         * @property fachgruppe
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'fachgruppe' },
        /**
         * @property dkm
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'dkm' },
        /**
         * @property pseudognr
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'pseudognr' },
        /**
         * @property abrechnungsgebiete
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'abrechnungsgebiete' },
        /**
         * @property sktzusatz
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'sktzusatz' },
        /**
         * @property personenkreis
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'personenkreis' },
        /**
         * @property sktinfo
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'sktinfo' },
        /**
         * @property scheinarten
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'scheinarten' },
        /**
         * @property versichertenarten
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'versichertenarten' },
        /**
         * @property gebuehrenordnung
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'gebuehrenordnung' },
        /**
         * @property codeValidation
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'codeValidation' },
        /**
         * @property kvFromLocationId
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'kvFromLocationId' },
        /**
         * @property scheinRelatedPatientVersion
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'scheinRelatedPatientVersion' },
        /**
         * @property certNumbers
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'certNumbers' },
        /**
         * @property checkLanr
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'checkLanr' },
        /**
         * @property checkBsnr
         * @for doccirrus.jsonrpc.api.kbv
         * @type {Function}
         */
        { namespace: 'kbv', method: 'checkBsnr' },
        /**
         * puc
         * @class doccirrus.jsonrpc.api.patientreg
         * */
        /**
         * @property patientreg
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.patientreg}
         */
        /**
         * @property confirmPatientEmailToPRC
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'confirmPatientEmailToPRC', server: 'puc' },        /**
         * @property create
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'create', server: 'puc' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'read', server: 'puc' },
        /**
         * @property listmine
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'listmine', server: 'puc' },
        /**
         * @property requestForPin
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'requestForPin', server: 'puc' },
        /**
         * @property submitPatientDeviceKey
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'submitPatientDeviceKey', server: 'puc' },        /**
         * @property update
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'update', server: 'puc' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'delete', server: 'puc' },
        /**
         * @property deletePatientreg
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'deletePatientreg', server: 'puc' },
        /**
         * @property sendEmailConfirmationAgain
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'sendEmailConfirmationAgain', server: 'puc' },
        /**
         * @property updatePatient
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'updatePatient', server: 'puc' },
        /**
         * @property processPatientDataPP
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'processPatientDataPP', server: 'puc' },
        /**
         * @property patientDCRegister
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'patientDCRegister', server: 'puc' },
        /**
         * @property removeInvitation
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'removeInvitation', server: 'puc' },
        /**
         * @property noteInvitation
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'noteInvitation', server: 'puc' },
        /**
         * @property checkEmailDuplication
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'checkEmailDuplication', server: 'puc' },
        /**
         * @property checkinPatient
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'patientreg', method: 'checkinPatient', server: 'puc' },
        /**
         * @property jawbone
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.jawbone}
         */
        /**
         * @property getAppConfig
         * @for doccirrus.jsonrpc.api.jawbone
         * @type {Function}
         */
        { namespace: 'jawbone', method: 'getAppConfig', server: 'current' },
        /**
         * @property getAccessToken
         * @for doccirrus.jsonrpc.api.jawbone
         * @type {Function}
         */
        { namespace: 'jawbone', method: 'getAccessToken', server: 'current' },
        /**
         * @property getPatientJawboneData
         * @for doccirrus.jsonrpc.api.jawbone
         * @type {Function}
         */
        { namespace: 'jawbone', method: 'getPatientJawboneData', server: 'current' },
        /**
         * @property checkAccessToken
         * @for doccirrus.jsonrpc.api.jawbone
         * @type {Function}
         */
        { namespace: 'jawbone', method: 'checkAccessToken', server: 'current' },
        /**
         * @property removeJawboneCredential
         * @for doccirrus.jsonrpc.api.jawbone
         * @type {Function}
         */
        { namespace: 'jawbone', method: 'removeJawboneCredential', server: 'current' },
        /**
         * @property metaprac
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.metaprac}
         */
        /**
         * @property getPatientPractice
         * @for doccirrus.jsonrpc.api.metaprac
         * @type {Function}
         */
        { namespace: 'metaprac', method: 'getPatientPractice', server: 'current' },
        /**
         * @property blindproxy
         * @for doccirrus.jsonrpc.api.metaprac
         * @type {Function}
         */
        { namespace: 'metaprac', method: 'blindproxy' },
        /**
         * @property mediaproxy
         * @for doccirrus.jsonrpc.api.metaprac
         * @type {Function}
         */
        { namespace: 'metaprac', method: 'mediaproxy' },
        /**
         * @property patientportal
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.patientportal}
         */
        /**
         * @property getPatientPractice
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'getPatientPractice', server: 'current' },
        /**
         * @property sendJawboneDataPRC
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'sendJawboneDataPRC', server: 'current' },
        /**
         * @property getDeviceConfigData
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'getDeviceConfigData', server: 'current' },
        /**
         * @property getPatientSchedule
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'getPatientSchedule', server: 'current' },
        /**
         * @property patientSchedule
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'patientSchedule', server: 'current' },
        /**
         * @property getFullPracticeInfo
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'getFullPracticeInfo', server: 'current' },
        /**
         * @property getPracticeAppointmentTypes
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'getPracticeAppointmentTypes', server: 'current' },
        /**
         * @property getFreeAppointments
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'getFreeAppointments', server: 'current' },
        /**
         * @property getWaitingTime
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'getWaitingTime', server: 'current' },
        /**
         * @property makeAppointment
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'makeAppointment', server: 'current' },
        /**
         * @property makeVideoConference
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'makeVideoConference', server: 'current' },
        /**
         * @property getPatientProfile
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'getPatientProfile', server: 'current' },
        /**
         * @property setPatientProfile
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'setPatientProfile', server: 'current' },
        /**
         * @property getRecaptchaSiteKey
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'getRecaptchaSiteKey', server: 'current' },

        /**
         * @property resetPassword
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'resetPassword', server: 'current' },
        /**
         * @property registerPatient
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'registerPatient', server: 'current' },
        /**
         * @property checkPassword
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'checkPassword', server: 'current' },
        /**
         * @property sendAccountDeletionRequestToSupport
         * @for doccirrus.jsonrpc.api.patientportal
         * @type {Function}
         */
        { namespace: 'patientportal', method: 'sendAccountDeletionRequestToSupport', server: 'current' },
        /**
         * @property deviceconfiguration
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.deviceconfiguration}
         */
        /**
         * @property upsert
         * @for doccirrus.jsonrpc.api.deviceconfiguration
         * @type {Function}
         */
        { namespace: 'deviceconfiguration', method: 'upsert', server: 'current' },
        /** @class doccirrus.jsonrpc.api.activity */
        /**
         * @property activity
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.activity}
         */
        /**
         * @property getGestationData
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getGestationData' },
        /**
         * @property createKbvMedicationPlanForMedications
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'createKbvMedicationPlanForMedications' },
        /**
         * @property createMedicationPlanForMedications
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'createMedicationPlanForMedications' },
        /**
         * @property createMedicationPlanFromDocumedis
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'createMedicationPlanFromDocumedis' },
        /**
         * @property updateMedicationPlanFromDocumedis
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'updateMedicationPlanFromDocumedis' },
        /**
         * @property CHMEDtoMedications
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'CHMEDtoMedications' },
        /**
         * @property convertMedicationsToMedplanChmed
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'convertMedicationsToMedplanChmed' },
        /**
         * @property handleMedications
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'handleMedications' },
        /**
         * @property getActivitiesGroupedByAPK
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getActivitiesGroupedByAPK' },
        /**
         * @property setAPKState
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'setAPKState' },
        /**
         * @property getLatestMedicationPlan
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getLatestMedicationPlan' },
        /**
         * @property getActivityForFrontend
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getActivityForFrontend' },
        /**
         * @property getDistinct
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getDistinct' },
        /**
         * @property saveMedicationPlan
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'saveMedicationPlan' },
        /**
         * @property quickprint
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'quickprint' },
        /**
         * @property doTransition
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'doTransition' },
        /**
         * @property doTransitionPlus
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'doTransitionPlus' },
        /**
         * @property getNewActivityForFrontend
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getNewActivityForFrontend' },
        /**
         * @property checkCatalogCode
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'checkCatalogCode' },
        /**
         * @property copeActivity
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'copeActivity' },
        /**
         * @property getContentTopByActType
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getContentTopByActType' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'read' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'create' },
        /**
         * @property saveKbvUtilityDiagnosis
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'saveKbvUtilityDiagnosis' },
        /**
         * @property getKbvUtilityAgreement
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getKbvUtilityAgreement' },
        /**
         * @property countBLFrom
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'countBLFrom' },
        /**
         * @property getOpenScheinBL
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getOpenScheinBL' },
        /**
         * @property getCaseFile
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getCaseFile' },
        /**
         * @property getCaseFile
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getCaseFileLight' },
        /**
         * @property lastKbvUtility
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'lastKbvUtility' },
        /**
         * @property checkKbvUtilityExistence
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'checkKbvUtilityExistence' },
        /**
         * @property getActivityForFrontend
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'mirroractivity', method: 'getActivityForFrontend' },
        /**
         * @property getCaseFile
         * @for doccirrus.jsonrpc.api.mirroractivity
         * @type {Function}
         */
        { namespace: 'mirroractivity', method: 'getCaseFile' },

        /**
         * @property getCaseFile
         * @for doccirrus.jsonrpc.api.mirroractivity
         * @type {Function}
         */
        { namespace: 'mirroractivity', method: 'getCaseFileLight' },

        /**
         * @property getContinuousDiagnosis
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getContinuousDiagnosis' },
        /**
         * @property getContinuousMedications
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getContinuousMedications' },
        /**
         * @property getActivitiesPopulated
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getActivitiesPopulated' },
        /**
         * @property getCashBook
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getCashBook' },
        /**
         * @property doTransitionBatch
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'doTransitionBatch' },
        /**
         * @property moveActivity
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'moveActivity' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'delete' },
        /**
         * @property saveFile
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'saveFile' },
        /**
         * @property isLegalBLForCaseFolder
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'isLegalBLForCaseFolder' },
        /**
         * @property recalcBLInCaseFolder
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'recalcBLInCaseFolder' },
        /**
         * @property getBLOfLastSchein
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getBLOfLastSchein' },
        /**
         * @property createActivitiesFromCatalogusage
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'createActivitiesFromCatalogusage' },
        /**
         * @property invoiceBatchCreation
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'invoiceBatchCreation' },
        /**
         * @property getDeviceTableData
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getDeviceTableData' },
        /**
         * @property createMedDataForPatient
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'createMedDataForPatient' },
        /**
         * @property getLabDataTableData
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getLabDataTableData' },
        /**
         * @property updateBatch
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'updateBatch' },
        /**
         * @property resetActivityStatus
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'resetActivityStatus' },
        /**
         * @property validateInvoices
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'validateInvoices' },
        /**
         * @property createMedicationPlanByCarrierSegment
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'createMedicationPlanByCarrierSegment' },
        /**
         * @property mailActivities
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'mailActivities' },
        /**
         * @property sendEmailsFromPatientId
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'sendEmailsFromPatientId' },
        /**
         * @property sendEmailsFromContactId
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'sendEmailsFromContactId' },
        /**
         * @property mailActivities
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'checkSubGop' },
        /**
         * @property createDispense
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'createDispense' },
        /**
         * @property printLabel
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'printLabel' },
        /**
         * @property incrementPrintCount
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'incrementPrintCount' },
        /**
         * @property getLatestDiagnosesFromPatientRegardingDaySeparationOfTreatments
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getLatestDiagnosesFromPatientRegardingDaySeparationOfTreatments' },
        /**
         * @property activitiesLockUnlock
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'activitiesLockUnlock' },
        /**
         * @property requestETSArrangementCode
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'requestETSArrangementCode' },
        /**
         * @property createSimpleActivityWithAttachedPDF
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'createSimpleActivityWithAttachedPDF' },
        /**
         * @property createSimpleActivity
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'createSimpleActivity' },
        /**
         * @property setScheinFinishedWithoutPseudoCode
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'setScheinFinishedWithoutPseudoCode' },
        /**
         * @property getHistoricMedDataActivities
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getHistoricMedDataActivities', access: 'USER' },
        /**
         * @property calculateActivityMedicalScalingFactor
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'calculateActivityMedicalScalingFactor', access: 'USER' },
        /**
         * @property calculateTarmedPrice
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'calculateTarmedPrice', access: 'USER' },
        /**
         * @property getOnHoldActivities
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getOnHoldActivities', access: 'USER' },
        /**
         * @property createKIMActivity
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'createKIMActivity', access: 'USER' },
        /**
         * @property revertKIMActivity
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'revertKIMActivity', access: 'USER' },
        /**
         * @property prescription
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.prescription}
         */
        /**
         * @property prescribeMedications
         * @for doccirrus.jsonrpc.api.prescription
         * @type {Function}
         */
        { namespace: 'prescription', method: 'prescribeMedications' },
        /**
         * @property createPrescriptionsAndMedicationPlan
         * @for doccirrus.jsonrpc.api.prescription
         * @type {Function}
         */
        { namespace: 'prescription', method: 'createPrescriptionsAndMedicationPlan' },
        /**
         * @property printPrescriptions
         * @for doccirrus.jsonrpc.api.prescription
         * @type {Function}
         */
        { namespace: 'prescription', method: 'printPrescriptions' },
        /**
         * @property prescriptionAddendum
         * @for doccirrus.jsonrpc.api.prescription
         * @type {Function}
         */
        { namespace: 'prescription', method: 'prescriptionAddendum' },
        /**
         * @property getChartData
         * @for doccirrus.jsonrpc.api.meddata
         * @type {Function}
         */
        { namespace: 'meddata', method: 'getChartData' },
        /**
         * @property getAllMeddataTypes
         * @for doccirrus.jsonrpc.api.meddata
         * @type {Function}
         */
        { namespace: 'meddata', method: 'getAllMeddataTypes' },
        /**
         * @property getLatestMeddataForPatient
         * @for doccirrus.jsonrpc.api.meddata
         * @type {Function}
         */
        { namespace: 'meddata', method: 'getLatestMeddataForPatient' },
        /**
         * @property checkVaccinationStatus
         * @for doccirrus.jsonrpc.api.meddata
         * @type {Function}
         */
        { namespace: 'meddata', method: 'checkVaccinationStatus' },
        /**
         * @property getCustomMeddataTypes
         * @for doccirrus.jsonrpc.api.meddata
         * @type {Function}
         */
        { namespace: 'meddata', method: 'getCustomMeddataTypes' },
        /**
         * @property getMedDataItemTemplateCollection
         * @for doccirrus.jsonrpc.api.meddata
         * @type {Function}
         */
        { namespace: 'meddata', method: 'getMedDataItemTemplateCollection' },

        /**
         * @property cdsCodesSearch
         * @for doccirrus.jsonrpc.api.meddata
         * @type {Function}
         */
        { namespace: 'meddata', method: 'cdsCodesSearch' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.labdata
         * @type {Function}
         */
        { namespace: 'labdata', method: 'getLatestLabDataForPatient' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.labdata
         * @type {Function}
         */
        { namespace: 'labdata', method: 'read' },
        /**
         * @property hl7
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.hl7}
         */
        /**
         * @property convertHL7toLDTJSON
         * @for doccirrus.jsonrpc.api.hl7
         * @type {Function}
         */
        { namespace: 'hl7', method: 'convertHL7toLDTJSON' },
        /**
         * @property activitysequence
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.activitysequence}
         */

        /**
         * @property updateSequences
         * @for doccirrus.jsonrpc.api.activitysequence
         * @type {Function}
         */
        { namespace: 'activitysequence', method: 'updateSequences' },
        /**
         * @property batchUpdate
         * @for doccirrus.jsonrpc.api.activitysequence
         * @type {Function}
         */
        { namespace: 'activitysequence', method: 'batchUpdate' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.activitysequence
         * @type {Function}
         */
        { namespace: 'activitysequence', method: 'delete' },
        /**
         * @property getLightSequences
         * @for doccirrus.jsonrpc.api.activitysequence
         * @type {Function}
         */
        { namespace: 'activitysequence', method: 'getLightSequences' },
        /**
         * @property getSequencesByGroup
         * @for doccirrus.jsonrpc.api.activitysequence
         * @type {Function}
         */
        { namespace: 'activitysequence', method: 'getSequencesByGroup' },
        /**
         * @property getSequenceWithActivities
         * @for doccirrus.jsonrpc.api.activitysequence
         * @type {Function}
         */
        { namespace: 'activitysequence', method: 'getSequenceWithActivities' },
        /**
         * @property applySequence
         * @for doccirrus.jsonrpc.api.activitysequence
         * @type {Function}
         */
        { namespace: 'activitysequence', method: 'applySequence' },
        /**
         * @property getActivityCompleteList
         * @for doccirrus.jsonrpc.api.activitysequence
         * @type {Function}
         */
        { namespace: 'activitysequence', method: 'getActivityCompleteList' },
        /**
         * @property getAllSequenceGroups
         * @for doccirrus.jsonrpc.api.activitysequence
         * @type {Function}
         */
        { namespace: 'activitysequence', method: 'getAllSequenceGroups' },
        /** @class doccirrus.jsonrpc.api.actionbutton */
        /**
         * @property actionbutton
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.actionbutton}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.actionbutton
         * @type {Function}
         */
        { namespace: 'actionbutton', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.actionbutton
         * @type {Function}
         */
        { namespace: 'actionbutton', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.actionbutton
         * @type {Function}
         */
        { namespace: 'actionbutton', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.delete
         * @type {Function}
         */
        { namespace: 'actionbutton', method: 'delete' },
        /**
         * @property scheduletype
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.scheduletype}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.scheduletype
         * @type {Function}
         */
        { namespace: 'scheduletype', method: 'create' },
        /** @class doccirrus.jsonrpc.api.activitysettings */
        /**
         * @property activitysettings
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.activitysettings}
         */
        /**
         * @property update
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.activitysettings}
         */
        { namespace: 'activitysettings', method: 'update' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.activitysettings
         * @type {Function}
         */
        { namespace: 'activitysettings', method: 'read' },
        /**
         * @property updateActivitySettings
         * @for doccirrus.jsonrpc.api.activitysettings
         * @type {Function}
         */
        { namespace: 'activitysettings', method: 'updateActivitySettings' },
        /** @class doccirrus.jsonrpc.api.activitysettingsuser */
        /**
         * @property activitysettingsuser
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.activitysettingsuser}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.activitysettingsuser
         * @type {Function}
         */
        { namespace: 'activitysettingsuser', method: 'read' },
        /**
         * @property saveSettingsSorting
         * @for doccirrus.jsonrpc.api.activitysettingsuser
         * @type {Function}
         */
        { namespace: 'activitysettingsuser', method: 'saveSettingsSorting' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.scheduletype
         * @type {Function}
         */
        { namespace: 'scheduletype', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.scheduletype
         * @type {Function}
         */
        { namespace: 'scheduletype', method: 'update', access: 'CONTROLLER' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.scheduletype
         * @type {Function}
         */
        { namespace: 'scheduletype', method: 'delete', access: 'ADMIN' },
        /**
         * @property readScheduletypeForEdit
         * @for doccirrus.jsonrpc.api.scheduletype
         * @type {Function}
         */
        { namespace: 'scheduletype', method: 'readScheduletypeForEdit' },
        /**
         * @property readCalendarForScheduletypeEdit
         * @for doccirrus.jsonrpc.api.scheduletype
         * @type {Function}
         */
        { namespace: 'scheduletype', method: 'readCalendarForScheduletypeEdit' },
        /**
         * @property readScheduletypesForCalendarId
         * @for doccirrus.jsonrpc.api.scheduletype
         * @type {Function}
         */
        { namespace: 'scheduletype', method: 'readScheduletypesForCalendarId' },
        /**
         * @property deleteRequiredResource
         * @for doccirrus.jsonrpc.api.scheduletype
         * @type {Function}
         */
        { namespace: 'scheduletype', method: 'deleteRequiredResource', access: 'ADMIN' },
        /**
         * @property updateRequiredResources
         * @for doccirrus.jsonrpc.api.scheduletype
         * @type {Function}
         */
        { namespace: 'scheduletype', method: 'updateRequiredResources', access: 'ADMIN' },
        /**
         * @property catalogusage
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.catalogusage}
         */
        /**
         * @property removeAllByShortName
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'removeAllByShortName' },
        /**
         * @property getTopByShortName
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'getTopByShortName' },
        /**
         * @property getMMIActualData
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'getMMIActualData' },
        /**
         * @property getTags
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'getTags' },
        /**
         * @property changeTags
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'changeTags' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'update' },
        /**
         * @property deleteBatch
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'deleteBatch' },
        /**
         * @property addCodeBatch
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'addCodeBatch' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        {namespace: 'catalogusage', method: 'copyBatch'},
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'read' },
        /**
         * @property getSortedByLocation
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'getSortedByLocation' },
        /**
         * @property updateBySeqId
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'updateBySeqId' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'create' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.catalogusage
         * @type {Function}
         */
        { namespace: 'catalogusage', method: 'delete' },
        /** @class doccirrus.jsonrpc.api.invoiceconfiguration */
        /**
         * @property invoiceconfiguration
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.invoiceconfiguration}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.invoiceconfiguration
         * @type {Function}
         */
        { namespace: 'invoiceconfiguration', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.invoiceconfiguration
         * @type {Function}
         */
        { namespace: 'invoiceconfiguration', method: 'update', access: 'ADMIN' },
        /**
         * @property invoicefactor
         * @for doccirrus.jsonrpc.api.invoiceconfiguration
         * @type {Function}
         */
        { namespace: 'invoiceconfiguration', method: 'invoicefactor' },
        /**
         * @property getPvsCustomerNoList
         * @for doccirrus.jsonrpc.api.invoiceconfiguration
         * @type {Function}
         */
        { namespace: 'invoiceconfiguration', method: 'getPvsCustomerNoList' },
        /**
         * @property getTarmedInvoiceFactor
         * @for doccirrus.jsonrpc.api.invoiceconfiguration
         * @type {Function}
         */
        { namespace: 'invoiceconfiguration', method: 'getTarmedInvoiceFactor' },
        /**
         * @property updateMediportDeliveryFlows
         * @for doccirrus.jsonrpc.api.invoiceconfiguration
         * @type {Function}
         */
        { namespace: 'invoiceconfiguration', method: 'updateMediportDeliveryFlows', access: 'ADMIN' },
        /**
         * @property removeMediportDeliveryFlows
         * @for doccirrus.jsonrpc.api.invoiceconfiguration
         * @type {Function}
         */
        { namespace: 'invoiceconfiguration', method: 'removeMediportDeliveryFlows', access: 'ADMIN' },
        /**
         * @property activitytabsconfiguration
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.activitytabsconfiguration}
         */
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.activitytabsconfiguration
         * @type {Function}
         */
        { namespace: 'activitytabsconfiguration', method: 'get' },
        /**
         * @property configuration
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.configuration}
         */
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.configuration
         * @type {Function}
         */
        { namespace: 'configuration', method: 'get' },
        /**
         * @property incaseconfiguration
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.incaseconfiguration}
         */
        /**
         * @property readConfig
         * @for doccirrus.jsonrpc.api.incaseconfiguration
         * @type {Function}
         */
        { namespace: 'incaseconfiguration', method: 'readConfig' },
        /**
         * @property saveConfig
         * @for doccirrus.jsonrpc.api.incaseconfiguration
         * @type {Function}
         */
        { namespace: 'incaseconfiguration', method: 'saveConfig', access: 'ADMIN' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.incaseconfiguration
         * @type {Function}
         */
        { namespace: 'incaseconfiguration', method: 'update', access: 'ADMIN' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.getConfigs
         * @type {Function}
         */
        { namespace: 'incaseconfiguration', method: 'getConfigs' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.getOldPatientIds
         * @type {Function}
         */
        { namespace: 'incaseconfiguration', method: 'getOldPatientIds' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.getOldPatientList
         * @type {Function}
         */
        { namespace: 'incaseconfiguration', method: 'getOldPatientList' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.deleteOldPatients
         * @type {Function}
         */
        { namespace: 'incaseconfiguration', method: 'deleteOldPatients' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.deleteOldPatientsInBatches
         * @type {Function}
         */
        { namespace: 'incaseconfiguration', method: 'deleteOldPatientsInBatches' },

        /**
         * @property doInvoiceTransitionBatch
         * @for doccirrus.jsonrpc.api.invoiceprocess
         * @type {Function}
         */
        { namespace: 'invoiceprocess', method: 'getProcessInfo', access: 'SUPERUSER' },

        /**
         * @property doInvoiceTransitionBatch
         * @for doccirrus.jsonrpc.api.invoiceprocess
         * @type {Function}
         */
        { namespace: 'invoiceprocess', method: 'doInvoiceTransitionBatch', access: 'CONTROLLER' },

        /**
         * @property validateInvoices
         * @for doccirrus.jsonrpc.api.invoiceprocess
         * @type {Function}
         */

        { namespace: 'invoiceprocess', method: 'validateInvoices', access: 'SUPERUSER' },

        /**
         * @property invoiceBatchCreation
         * @for doccirrus.jsonrpc.api.invoiceprocess
         * @type {Function}
         */
        { namespace: 'invoiceprocess', method: 'invoiceBatchCreation', access: 'SUPERUSER' },

        /**
         * @property invoiceBatchZip
         * @for doccirrus.jsonrpc.api.invoiceprocess
         * @type {Function}
         */
        { namespace: 'invoiceprocess', method: 'invoiceBatchZip', access: 'SUPERUSER' },

        /**
         * @property invoiceBatchCreationPDF
         * @for doccirrus.jsonrpc.api.invoiceprocess
         * @type {Function}
         */
        { namespace: 'invoiceprocess', method: 'invoiceBatchCreationPDF', access: 'SUPERUSER' },

        /** @class doccirrus.jsonrpc.api.InCaseMojit */
        /**
         * @property InCaseMojit
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.InCaseMojit}
         */
        /**
         * @property getVatList
         * @for doccirrus.jsonrpc.api.InCaseMojit
         * @type {Function}
         */
        { namespace: 'InCaseMojit', method: 'getVatList' },
        /**
         * @property getCHMED
         * @for doccirrus.jsonrpc.api.InCaseMojit
         * @type {Function}
         */
        { namespace: 'InCaseMojit', method: 'getCHMED' },
        /**
         * @property unzipCHMED
         * @for doccirrus.jsonrpc.api.InCaseMojit
         * @type {Function}
         */
        { namespace: 'InCaseMojit', method: 'unzipCHMED' },
        /** @class doccirrus.jsonrpc.api.IsDispatcherMojit */
        /**
         * @property IsDispatcherMojit
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.IsDispatcherMojit}
         */
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.IsDispatcherMojit
         * @type {Function}
         */
        { namespace: 'dispatchrequest', method: 'read' },
        /**
         * @property generateTestData
         * @for doccirrus.jsonrpc.api.IsDispatcherMojit
         * @type {Function}
         */
        { namespace: 'dispatchrequest', method: 'generateTestData' },
        /**
         * @property generateTestData
         * @for doccirrus.jsonrpc.api.IsDispatcherMojit
         * @type {Function}
         */
        { namespace: 'dispatchrequest', method: 'getDetails' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.IsDispatcherMojit
         * @type {Function}
         */
        { namespace: 'prcdispatch', method: 'read' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.IsDispatcherMojit
         * @type {Function}
         */
        { namespace: 'prcdispatch', method: 'update' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.IsDispatcherMojit
         * @type {Function}
         */
        { namespace: 'prcdispatch', method: 'restorePRCData' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.IsDispatcherMojit
         * @type {Function}
         */
        { namespace: 'prcdispatch', method: 'delete' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.IsDispatcherMojit
         * @type {Function}
         */
        { namespace: 'mirroremployee', method: 'read' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.IsDispatcherMojit
         * @type {Function}
         */
        { namespace: 'mirrorpatient', method: 'read' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.IsDispatcherMojit
         * @type {Function}
         */
        { namespace: 'mirrorpatient', method: 'update' },
        /** @class doccirrus.jsonrpc.api.jade */
        /**
         * @property jade
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.jade}
         */
        /**
         * @property renderFile
         * @for doccirrus.jsonrpc.api.jade
         * @type {Function}
         */
        { namespace: 'jade', method: 'renderFile' },
        /** @class doccirrus.jsonrpc.api.catalog */
        /**
         * @property catalog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.catalog}
         */
        /**
         * @property getCatalogDescriptorsForFrontend
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getCatalogDescriptorsForFrontend' },
        /**
         * @property getCatalogDescriptorsByActType
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getCatalogDescriptorsByActType' },
        /**
         * @property catsearch
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'catsearch' },
        /**
         * @property verifyKT
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'verifyKT' },
        /**
         * @property catalogCodeSearch
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'catalogCodeSearch' },
        /**
         * @property searchNotHK
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'searchNotHK' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'read' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'create' },
        /**
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'delete' },
        /**
         * @property hmvSearch
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'hmvSearch' },
        /**
         * @property ghdHmvSearch
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'ghdHmvSearch' },
        /**
         * @property hmvCatalogUsageSearch
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'hmvCatalogUsageSearch' },
        /**
         * @property getKvList
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getKvList' },
        /**
         * @property getInsurances
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getInsurances' },
        /**
         * @property getCostCarrierBillingGroups
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getCostCarrierBillingGroups' },
        /**
         * @property searchKbvUtility
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'searchKbvUtility' },
        /**
         * @property searchKbvUtilityNamesAndPositions
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'searchKbvUtilityNamesAndPositions' },
        /**
         * @property getUtilityAgreement
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getUtilityAgreement' },
        /**
         * @property getIcdsFromDiagnosisGroup
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getIcdsFromDiagnosisGroup' },
        /**
         * @property catalogViewerListAvailableCatalogs
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'catalogViewerListAvailableCatalogs' },
        /**
         * @property catalogViewerList
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'catalogViewerList' },
        /**
         * @property catalogViewerSearch
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'catalogViewerSearch' },
        /**
         * @property searchIcdsInCatalogAndPatient
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'searchIcdsInCatalogAndPatient' },
        /**
         * @property getKbvUtilties
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getKbvUtilities' },
        /**
         * @property getEntriesByLocationId
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getEntriesByLocationId' },
        /**
         * @property getTarmedDignities
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getTarmedDignities' },
        /**
         * @property getTarmedCantonsByCode
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getTarmedCantonsByCode' },
        /**
         * @property searchTarmedCantonsByCodeOrName
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'searchTarmedCantonsByCodeOrName' },
        /**
         * @property searchOmimCatalog
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'searchOmimCatalog' },
        /**
         * @property getHierarchyCodesByAge
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getHierarchyCodesByAge' },
        /**
         * @property getSecondaryHierarchyCodes
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getSecondaryHierarchyCodes' },
        /**
         * @property getTreatmentCatalogEntry
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getTreatmentCatalogEntry' },
        /** @class doccirrus.jsonrpc.api.catalogreference */
        /**
         * @property catalogreference
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.catalogreference}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.catalogreference
         * @type {Function}
         */
        { namespace: 'catalogreference', method: 'read' },
        /** @class doccirrus.jsonrpc.api.fhir_codesystem */
        /**
         * @property fhir_codesystem
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.fhir_codesystem}
         */
        /**
         * @property searchCodeSystems
         * @for doccirrus.jsonrpc.api.fhir_codesystem
         * @type {Function}
         */
        { namespace: 'fhir_codesystem', method: 'searchCodeSystems' },
        /**
         * @property calevent
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.calevent}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'read' },        /**
         * @property receiveWaitingTime
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'receiveWaitingTime' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'delete' },
        /**
         * @property count
         * @for doccirrus.jsonrpc.api.count
         * @type {Function}
         */
        { namespace: 'calevent', method: 'count' },
        /**
         * @property addCloseTimeEventsToNewCalendar
         * @for doccirrus.jsonrpc.api.addCloseTimeEventsToNewCalendar
         * @type {Function}
         */
        { namespace: 'calevent', method: 'addCloseTimeEventsToNewCalendar' },
        /**
         * @property getDocSchedules
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'getDocSchedules' },
        /**
         * @property getGroupedByCalId
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'getGroupedByCalId' },

        /**
         * @property getBlockedSlots
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'getBlockedSlots' },

        /**
         * @property getConsultTimes
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'getConsultTimes' },

        /**
         * @property checkSchedule
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'checkSchedule' },
        /**
         * @property validateCaleventData
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'validateCaleventData' },
        /**
         * @property moveEventToOtherCalendarColumn
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'moveEventToOtherCalendarColumn' },
        /**
         * @property calculateSchedule
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'calculateSchedule' },
        /**
         * @property calculatePartnerSchedule
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'calculatePartnerSchedule' },
        /**
         * @property createCloseDayEvent
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'createCloseDayEvent' },
        /**
         * @property getForCloseDayTable
         * @for doccirrus.jsonrpc.api.calevent
         * @type {Function}
         */
        { namespace: 'calevent', method: 'getForCloseDayTable' },
        /**
         * @property updateRoomAppointments
         * @for doccirrus.jsonrpc.api.calendar
         * @type {Function}
         */
        { namespace: 'calevent', method: 'updateRoomAppointments' },
        /**
         * @property schedule
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.schedule}
         */
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.schedule
         * @type {Function}
         */
        { namespace: 'schedule', method: 'update' },
        /**
         * @property resource
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.resource}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.resource
         * @type {Function}
         */
        { namespace: 'resource', method: 'create', access: 'ADMIN' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.resource
         * @type {Function}
         */
        { namespace: 'resource', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.resource
         * @type {Function}
         */
        { namespace: 'resource', method: 'update', access: 'ADMIN' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.resource
         * @type {Function}
         */
        { namespace: 'resource', method: 'delete', access: 'ADMIN' },
        /**
         * @property getResourceList
         * @for doccirrus.jsonrpc.api.resource
         * @type {Function}
         */
        { namespace: 'resource', method: 'getResourceList' },
        /**
         * @property getResourceTypes
         * @for doccirrus.jsonrpc.api.resource
         * @type {Function}
         */
        { namespace: 'resource', method: 'getResourceTypes' },
        /**
         * @property updateCollection
         * @for doccirrus.jsonrpc.api.resource
         * @type {Function}
         */
        { namespace: 'resource', method: 'updateCollection', access: 'ADMIN' },
        /**
         * @property mmi
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.mmi}
         */
        /**
         * @property getProducts
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getProducts' },
        /**
         * @property getProductsDetails
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getProductsDetails' },
        /**
         * @property getProductInfo
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getProductInfo' },
        /**
         * @property getMappingCatalogEntries
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getMappingCatalogEntries' },
        /**
         * @property getATCCatalogEntries
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getATCCatalogEntries' },
        /**
         * @property getMolecules
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getMolecules' },
        /**
         * @property getPackages
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getPackages' },
        /**
         * @property getPackagesDetails
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getPackagesDetails' },
        /**
         * @property getDocuments
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getDocuments' },
        /**
         * @property getAMR
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getAMR' },
        /**
         * @property getARV
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getARV' },
        /**
         * @property getMetaData
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getMetaData' },
        /**
         * @property getCompareableMedications
         * @for doccirrus.jsonrpc.api.mmi
         * @type {Function}
         */
        { namespace: 'mmi', method: 'getCompareableMedications' },
        /**
         * @property getCardData
         * @for doccirrus.jsonrpc.api.crManager
         * @type {Function}
         */
        { namespace: 'crManager', method: 'getCardData' },
        /**
         * @property getLastDevice
         * @for doccirrus.jsonrpc.api.crManager
         * @type {Function}
         */
        { namespace: 'crManager', method: 'getLastDevice' },
        /**
         * @property getDeviceList
         * @for doccirrus.jsonrpc.api.crManager
         * @type {Function}
         */
        { namespace: 'crManager', method: 'getDeviceList' },
        /**
         * @property getPatientFromCard
         * @for doccirrus.jsonrpc.api.crManager
         * @type {Function}
         */
        { namespace: 'crManager', method: 'getPatientFromCard' },
        /**
         * @property reloadDevices
         * @for doccirrus.jsonrpc.api.sdManager
         * @type {Function}
         */
        { namespace: 'sdManager', method: 'reloadDevices' },
        /**
         * @property getDeviceServerVersion
         * @for doccirrus.jsonrpc.api.sdManager
         * @type {Function}
         */
        { namespace: 'sdManager', method: 'getDeviceServerVersion' },
        /**
         * @property getDeviceServerNames
         * @for doccirrus.jsonrpc.api.sdManager
         * @type {Function}
         */
        { namespace: 'sdManager', method: 'getDeviceServerNames' },
        /**
         * @property getIpOfLocalConnection
         * @for doccirrus.jsonrpc.api.sdManager
         * @type {Function}
         */
        { namespace: 'sdManager', method: 'getIpOfLocalConnection' },
        /**
         * @property assignCardInfoToIdentity
         * @for doccirrus.jsonrpc.api.inout
         * @type {Function}
         */
        { namespace: 'inout', method: 'assignCardInfoToIdentity', access: 'ADMIN' },

        /** @class doccirrus.jsonrpc.api.lab */
        /**
         * @property lab
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.lab}
         */
        /**
         * @property submitLDT
         * @for doccirrus.jsonrpc.api.lab
         * @type {Function}
         */
        { namespace: 'lab', method: 'submitLDT' },
        /**
         * @property triggerLabProcess
         * @for doccirrus.jsonrpc.api.lab
         * @type {Function}
         */
        { namespace: 'lab', method: 'triggerLabProcess', access: 'SUPPORT' },
        /**
         * @property submitHL7
         * @for doccirrus.jsonrpc.api.lab
         * @type {Function}
         */
        { namespace: 'lab', method: 'submitHL7' },
        /**
         * @property getStringified
         * @for doccirrus.jsonrpc.api.lab
         * @type {Function}
         */
        { namespace: 'lab', method: 'getStringified' },
        /**
         * @property assignLabLog
         * @for doccirrus.jsonrpc.api.lab
         * @type {Function}
         */
        { namespace: 'lab', method: 'assignLabLog' },
        /**
         * @property assignOldLabLog
         * @for doccirrus.jsonrpc.api.lab
         * @type {Function}
         */
        { namespace: 'lab', method: 'assignOldLabLog' },
        /**
         * @property revertLabLog
         * @for doccirrus.jsonrpc.api.lab
         * @type {Function}
         */
        { namespace: 'lab', method: 'revertLabLog' },
        /**
         * @property attachToPatientId
         * @for doccirrus.jsonrpc.api.lab
         * @type {Function}
         */
        { namespace: 'lab', method: 'attachToPatientId' },
        /**
         * @property kvcTriggerFindings
         * @for doccirrus.jsonrpc.api.lab
         * @type {Function}
         */
        { namespace: 'lab', method: 'kvcTriggerFindings' },
        // /**
        //  * @property testMdn
        //  * @for doccirrus.jsonrpc.api.lab
        //  * @type {Function}
        //  */
        // { namespace: 'lab', method: 'testMdn' },
        /**
         * @property test
         * @for doccirrus.jsonrpc.api.gdt
         * @type {Function}
         */
        { namespace: 'gdt', method: 'test' },
        /**
         * @property test
         * @for doccirrus.jsonrpc.api.gdt
         * @type {Function}
         */
        { namespace: 'gdt', method: 'generatePatientDataRequest' },
        /**
         * @property test
         * @for doccirrus.jsonrpc.api.gdt
         * @type {Function}
         */
        { namespace: 'gdt', method: 'generatePatientData' },
        /**
         * @property test
         * @for doccirrus.jsonrpc.api.gdt
         * @type {Function}
         */
        { namespace: 'gdt', method: 'generateStudyDataRequest' },
        /**
         * @property test
         * @for doccirrus.jsonrpc.api.gdt
         * @type {Function}
         */
        { namespace: 'gdt', method: 'generateStudyDataViewRequest' },

        /** @class doccirrus.jsonrpc.api.lablog */
        /**
         * @property lablog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.lablog}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.lablog
         * @type {Function}
         */
        { namespace: 'lablog', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.lablog
         * @type {Function}
         */
        { namespace: 'lablog', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.lablog
         * @type {Function}
         */
        { namespace: 'lablog', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.lablog
         * @type {Function}
         */
        { namespace: 'lablog', method: 'delete' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.cardio
         * @type {Function}
         */
        { namespace: 'cardio', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.cardio
         * @type {Function}
         */
        { namespace: 'cardio', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.cardio
         * @type {Function}
         */
        { namespace: 'cardio', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.cardio
         * @type {Function}
         */
        { namespace: 'cardio', method: 'delete' },
        /**
         * @property checkCardioServer
         * @for doccirrus.jsonrpc.api.cardio
         * @type {Function}
         */
        { namespace: 'cardio', method: 'checkCardioServer' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'inport', method: 'create', server: 'prc', access: 'ADMIN' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'inport', method: 'read', server: 'prc' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'inport', method: 'update', server: 'prc', access: 'ADMIN' },

        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.patientreg
         * @type {Function}
         */
        { namespace: 'inport', method: 'delete', server: 'prc', access: 'ADMIN' },
        /** @class doccirrus.jsonrpc.api.flowlog */
        /**
         * @property flowlog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.flowlog}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.flowlog
         * @type {Function}
         */
        { namespace: 'flowlog', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.flowlog
         * @type {Function}
         */
        { namespace: 'flowlog', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.flowlog
         * @type {Function}
         */
        { namespace: 'flowlog', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.flowlog
         * @type {Function}
         */
        { namespace: 'flowlog', method: 'delete' },
        /**
         * @property getPrescriptionTypes
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'getPrescriptionTypes' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.activity
         * @type {Function}
         */
        { namespace: 'activity', method: 'update' },
        /**
         * @property reboot
         * @for doccirrus.jsonrpc.api.cli
         * @type {Function}
         */
        { namespace: 'cli', method: 'reboot', access: 'ADMIN' },
        /**
         * @property updateCheck
         * @for doccirrus.jsonrpc.api.cli
         * @type {Function}
         */
        { namespace: 'cli', method: 'updateCheck', access: 'ADMIN' },
        /**
         * @property softwareUpdate
         * @for doccirrus.jsonrpc.api.cli
         * @type {Function}
         */
        { namespace: 'cli', method: 'softwareUpdate', access: 'ADMIN' },
        /**
         * @property getProxyConfig
         * @for doccirrus.jsonrpc.api.cli
         * @type {Function}
         */
        { namespace: 'cli', method: 'getProxyConfig' },
        /**
         * @property setProxyConfig
         * @for doccirrus.jsonrpc.api.cli
         * @type {Function}
         */
        { namespace: 'cli', method: 'setProxyConfig', access: 'ADMIN' },
        /**
         * @property post
         * @for doccirrus.jsonrpc.api.kvg_deliverysettings
         * @type {Function}
         */
        { namespace: 'kvg_deliverysettings', method: 'post', access: 'ADMIN'},
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.kvg_deliverysettings
         * @type {Function}
         */
        { namespace: 'kvg_deliverysettings', method: 'get'},
        /**
         * @property put
         * @for doccirrus.jsonrpc.api.kvg_deliverysettings
         * @type {Function}
         */
        { namespace: 'kvg_deliverysettings', method: 'put', access: 'ADMIN'},
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.kvg_deliverysettings
         * @type {Function}
         */
        { namespace: 'kvg_deliverysettings', method: 'delete', access: 'ADMIN'},
        /**
         * @property save
         * @for doccirrus.jsonrpc.api.kvg_deliverysettings
         * @type {Function}
         */
        { namespace: 'kvg_deliverysettings', method: 'save', access: 'ADMIN'},
        /**
         * @property saveManual
         * @for doccirrus.jsonrpc.api.gkv_deliverysettings
         * @type {Function}
         */
        { namespace: 'gkv_deliverysettings', method: 'saveManual', access: 'ADMIN' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.gkv_deliverysettings
         * @type {Function}
         */
        { namespace: 'gkv_deliverysettings', method: 'read' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.gkv_deliverysettings
         * @type {Function}
         */
        { namespace: 'gkv_deliverysettings', method: 'create', access: 'ADMIN' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.gkv_deliverysettings
         * @type {Function}
         */
        { namespace: 'gkv_deliverysettings', method: 'update', access: 'ADMIN' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.gkv_deliverysettings
         * @type {Function}
         */
        { namespace: 'gkv_deliverysettings', method: 'delete', access: 'ADMIN' },
        /**
         * @property getUnusedLocations
         * @for doccirrus.jsonrpc.api.gkv_deliverysettings
         * @type {Function}
         */
        { namespace: 'gkv_deliverysettings', method: 'getUnusedLocations' },
        /**
         * @property getKvcaEntry
         * @for doccirrus.jsonrpc.api.gkv_deliverysettings
         * @type {Function}
         */
        { namespace: 'gkv_deliverysettings', method: 'getKvcaEntry' },
        /**
         * @property getCatalogShortByTimestamp
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getCatalogShortByTimestamp' },
        /**
         * @property getPKVKT
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'getPKVKT' },
        /**
         * @property catalogusageSearch
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'catalogusageSearch' },
        /**
         * @property utItemSearch
         * @for doccirrus.jsonrpc.api.catalog
         * @type {Function}
         */
        { namespace: 'catalog', method: 'utItemSearch' },
        /** @class doccirrus.jsonrpc.api.kbvlog */
        /**
         * @property kbvlog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.kbvlog}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.kbvlog
         * @type {Function}
         */
        { namespace: 'kbvlog', method: 'read', access: 'PHYSICIAN' },
        /**
         * @property createLogs
         * @for doccirrus.jsonrpc.api.kbvlog
         * @type {Function}
         */        /**
         * @property remove
         * @for doccirrus.jsonrpc.api.kbvlog
         * @type {Function}
         */
        { namespace: 'kbvlog', method: 'remove', access: 'SUPERUSER' },
        /**
         * @property createLogs
         * @for doccirrus.jsonrpc.api.kbvlog
         * @type {Function}
         */
        { namespace: 'kbvlog', method: 'createLogs', access: 'PHYSICIAN' },
        /**
         * @property validate
         * @for doccirrus.jsonrpc.api.kbvlog
         * @type {Function}
         */
        { namespace: 'kbvlog', method: 'validate', access: 'PHYSICIAN' },
        /**
         * @property encryptAccountStatement
         * @for doccirrus.jsonrpc.api.kbvlog
         * @type {Function}
         */
        { namespace: 'kbvlog', method: 'encryptAccountStatement', access: 'CONTROLLER' },
        /**
         * @property sendAccountStatement
         * @for doccirrus.jsonrpc.api.kbvlog
         * @type {Function}
         */
        { namespace: 'kbvlog', method: 'sendAccountStatement', access: 'CONTROLLER' },
        /**
         * @property manualSend
         * @for doccirrus.jsonrpc.api.kbvlog
         * @type {Function}
         */
        { namespace: 'kbvlog', method: 'manualSend', access: 'CONTROLLER' },
        /**
         * @property replaceKBVLog
         * @for doccirrus.jsonrpc.api.kbvlog
         * @type {Function}
         */
        { namespace: 'kbvlog', method: 'replaceKBVLog', access: 'CONTROLLER' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.kbvConFile
         * @type {Function}
         */
        { namespace: 'kbvConFiles', method: 'delete', access: 'ADMIN' },
        /**
         * @property mergeConFiles
         * @for doccirrus.jsonrpc.api.kbvConFile
         * @type {Function}
         */
        { namespace: 'kbvConFiles', method: 'merge', access: 'ADMIN' },
        /** @class doccirrus.jsonrpc.api.tarmedlog */
        /**
         * @property kvcmessage
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.tarmedlog}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.tarmedlog
         * @type {Function}
         */
        { namespace: 'tarmedlog', method: 'read', access: 'SUPERUSER' },
        { namespace: 'tarmedlog', method: 'put', access: 'SUPERUSER' },
        /**
         * @property send
         * @for doccirrus.jsonrpc.api.tarmedlog
         * @type {Function}
         */
        { namespace: 'tarmedlog', method: 'send', access: 'CONTROLLER' },
        /**
         * @property createLogs
         * @for doccirrus.jsonrpc.api.tarmedlog
         * @type {Function}
         */
        { namespace: 'tarmedlog', method: 'createLogs', access: 'SUPERUSER' },
        /**
         * @property remove
         * @for doccirrus.jsonrpc.api.tarmedlog
         * @type {Function}
         */
        { namespace: 'tarmedlog', method: 'removeLog', access: 'CONTROLLER' },
        /**
         * @property validate
         * @for doccirrus.jsonrpc.api.tarmedlog
         * @type {Function}
         */
        { namespace: 'tarmedlog', method: 'validate', access: 'SUPERUSER' },
        /**
         * @property generateInvoices
         * @for doccirrus.jsonrpc.api.tarmedlog
         * @type {Function}
         */
        { namespace: 'tarmedlog', method: 'generateInvoices', access: 'SUPERUSER' },
        /** @class doccirrus.jsonrpc.api.kbvlog */
        /**
         * @property kvcaccount
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.kvcaccount}
         */
        /**
         * @property version
         * @for doccirrus.jsonrpc.api.kvcaccount
         * @type {Function}
         */
        { namespace: 'kvcaccount', method: 'version', access: 'CONTROLLER'  },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.kvcaccount
         * @type {Function}
         */
        { namespace: 'kvcaccount', method: 'read', access: 'CONTROLLER'  },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.kvcaccount
         * @type {Function}
         */
        { namespace: 'kvcaccount', method: 'delete', access: 'CONTROLLER' },
        /**
         * @property login
         * @for doccirrus.jsonrpc.api.kvcaccount
         * @type {Function}
         */
        { namespace: 'kvcaccount', method: 'login', access: 'CONTROLLER' },
        /**
         * @property changePassword
         * @for doccirrus.jsonrpc.api.kvcaccount
         * @type {Function}
         */
        { namespace: 'kvcaccount', method: 'changePassword', access: 'CONTROLLER' },
        /**
         * @property changeLocations
         * @for doccirrus.jsonrpc.api.kvcaccount
         * @type {Function}
         */
        { namespace: 'kvcaccount', method: 'changeLocations', access: 'CONTROLLER' },
        /**
         * @property createCertificate
         * @for doccirrus.jsonrpc.api.kvcaccount
         * @type {Function}
         */
        { namespace: 'kvcaccount', method: 'createCertificate', access: 'CONTROLLER' },
        /**
         * @property refreshCsrStatus
         * @for doccirrus.jsonrpc.api.kvcaccount
         * @type {Function}
         */
        { namespace: 'kvcaccount', method: 'refreshCsrStatus', access: 'CONTROLLER' },
        /**
         * @property accountStatus
         * @for doccirrus.jsonrpc.api.kvcaccount
         * @type {Function}
         */
        { namespace: 'kvcaccount', method: 'accountStatus', access: 'CONTROLLER'  },
        /**
         * @property deleteCertificate
         * @for doccirrus.jsonrpc.api.kvcaccount
         * @type {Function}
         */
        { namespace: 'kvcaccount', method: 'deleteCertificate', access: 'CONTROLLER' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.kvcaccount
         * @type {Function}
         */
        { namespace: 'kvcaccount', method: 'get', access: 'CONTROLLER'  },
        /** @class doccirrus.jsonrpc.api.kbvlog */
        /**
         * @property kvcmessage
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.kvcmessage}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.kvcmessage
         * @type {Function}
         */
        { namespace: 'kvcmessage', method: 'read', access: 'CONTROLLER'  },
        /**
         * @property confirm
         * @for doccirrus.jsonrpc.api.kvcmessage
         * @type {Function}
         */
        { namespace: 'kvcmessage', method: 'confirm', access: 'CONTROLLER'  },
        /**
         * @property fetchNewMessages
         * @for doccirrus.jsonrpc.api.kvcmessage
         * @type {Function}
         */
        { namespace: 'kvcmessage', method: 'fetchNewMessages', access: 'CONTROLLER'  },
        /** @class doccirrus.jsonrpc.api.asvlog */
        /**
         * @property asvlog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.asvlog}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.asvlog
         * @type {Function}
         */
        { namespace: 'asvlog', method: 'read' },
        /**
         * @property pvslog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.pvslog}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.pvslog
         * @type {Function}
         */
        { namespace: 'pvslog', method: 'read', access: 'SUPERUSER' },
        /**
         * @property remove
         * @for doccirrus.jsonrpc.api.pvslog
         * @type {Function}
         */
        { namespace: 'pvslog', method: 'remove' },
        /**
         * @property validate
         * @for doccirrus.jsonrpc.api.pvslog
         * @type {Function}
         */
        { namespace: 'pvslog', method: 'validate', access: 'SUPERUSER'  },
        /**
         * @property createLogs
         * @for doccirrus.jsonrpc.api.pvslog
         * @type {Function}
         */
        { namespace: 'pvslog', method: 'createLogs', access: 'SUPERUSER' },
        /**
         * @property createLogs
         * @for doccirrus.jsonrpc.api.pvslog
         * @type {Function}
         */
        { namespace: 'pvslog', method: 'send', access: 'CONTROLLER' },
        /**
         * @property createLogs
         * @for doccirrus.jsonrpc.api.pvslog
         * @type {Function}
         */
        { namespace: 'pvslog', method: 'replace', access: 'CONTROLLER' },
        /**
         * @property createLogs
         * @for doccirrus.jsonrpc.api.pvslog
         * @type {Function}
         */
        { namespace: 'pvslog', method: 'remove', access: 'SUPERUSER' },
        /**
         * @property isOneClick
         * @for doccirrus.jsonrpc.api.pvslog
         * @type {Function}
         */
        { namespace: 'pvslog', method: 'isOneClick', access: 'SUPERUSER' },

        /**
         * @property read
         * @for doccirrus.jsonrpc.api.cashlog
         * @type {Function}
         */
        { namespace: 'cashlog', method: 'read', access: 'SUPERUSER' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.cashlog
         * @type {Function}
         */
        { namespace: 'cashlog', method: 'replace', access: 'SUPERUSER' },
        /**
         * @property remove
         * @for doccirrus.jsonrpc.api.cashlog
         * @type {Function}
         */
        { namespace: 'cashlog', method: 'remove', access: 'SUPERUSER' },
        /**
         * @property createLogs
         * @for doccirrus.jsonrpc.api.cashlog
         * @type {Function}
         */
        { namespace: 'cashlog', method: 'createLogs', access: 'SUPERUSER' },
        /**
         * @property validate
         * @for doccirrus.jsonrpc.api.cashlog
         * @type {Function}
         */
        { namespace: 'cashlog', method: 'validate', access: 'SUPERUSER' },
        /**
         * @property replace
         * @for doccirrus.jsonrpc.api.cashlog
         * @type {Function}
         */
        { namespace: 'cashlog', method: 'replace', access: 'SUPERUSER' },
        /**
         * @property getReplaceDialogContent
         * @for doccirrus.jsonrpc.api.cashlog
         * @type {Function}
         */
        { namespace: 'cashlog', method: 'getReplaceDialogContent', access: 'SUPERUSER' },

        /**
         * @property invoicelog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.invoicelog}
         */
        /**
         * @property searchInvoiceLog
         * @for doccirrus.jsonrpc.api.searchInvoiceLog
         * @type {Function}
         */
        { namespace: 'invoicelog', method: 'searchInvoiceLog' },
        /**
         * @property getInvoiceEntries
         * @for doccirrus.jsonrpc.api.invoicelog
         * @type {Function}
         */
        { namespace: 'invoicelog', method: 'getInvoiceEntries' },
        /**
         * @property invalidateExcludedIds
         * @for doccirrus.jsonrpc.api.invoicelog
         * @type {Function}
         */
        { namespace: 'invoicelog', method: 'invalidateExcludedIds' },
        /**
         * @property approveByIds
         * @for doccirrus.jsonrpc.api.invoicelog
         * @type {Function}
         */
        { namespace: 'invoicelog', method: 'approveByIds' },
        /**
         * @property approve
         * @for doccirrus.jsonrpc.api.invoicelog
         * @type {Function}
         */
        { namespace: 'invoicelog', method: 'approve' },
        /**
         * @property getEntries
         * @for doccirrus.jsonrpc.api.invoicelog
         * @type {Function}
         */
        { namespace: 'invoicelog', method: 'getEntries' },
        /**
         * @property removeCode
         * @for doccirrus.jsonrpc.api.invoicelog
         * @type {Function}
         */
        { namespace: 'invoicelog', method: 'removeCode' },
        /**
         * @property removeEntries
         * @for doccirrus.jsonrpc.api.invoicelog
         * @type {Function}
         */
        { namespace: 'invoicelog', method: 'removeEntries' },
        /**
         * @property calculateEntries
         * @for doccirrus.jsonrpc.api.invoicelog
         * @type {Function}
         */
        { namespace: 'invoicelog', method: 'calculateEntries' },
        /**
         * @property createPubReceiept
         * @for doccirrus.jsonrpc.api.invoice
         * @type {Function}
         */
        { namespace: 'invoicelog', method: 'getPdfFromInvoice' },
        /**
         * @property getPdfFromInvoice
         * @for doccirrus.jsonrpc.api.invoicelog
         * @type {Function}
         */
        { namespace: 'invoice', method: 'createPubReceipt' },
        /**
         * @property getTreatmentsForCurrentSchein
         * @for doccirrus.jsonrpc.api.invoice
         * @type {Function}
         */
        { namespace: 'invoice', method: 'getTreatmentsForCurrentSchein' },
        /**
         * @property createAllPubreceiptsForLog
         * @for doccirrus.jsonrpc.api.invoice
         * @type {Function}
         */
        { namespace: 'invoice', method: 'createAllPubreceiptsForLog' },
        /**
         * @property compilePubreceiptsForQuarter
         * @for doccirrus.jsonrpc.api.invoice
         * @type {Function}
         */
        { namespace: 'invoice', method: 'compilePubreceiptsForQuarter' },
        /**
         * @property getTreatmentsForDateRange
         * @for doccirrus.jsonrpc.api.invoice
         * @type {Function}
         */
        { namespace: 'invoice', method: 'getTreatmentsForDateRange' },
        /**
         * @property getOverdueInvoices
         * @for doccirrus.jsonrpc.api.invoice
         * @type {Function}
         */
        { namespace: 'invoice', method: 'getOverdueInvoices' },
        /**
         * @property socketioevent
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.socketioevent}
         */
        /**
         * @property deleteEventByMessageId
         * @for doccirrus.jsonrpc.api.socketioevent
         * @type {Function}
         */
        { namespace: 'socketioevent', method: 'deleteEventByMessageId' },
        /**
         * @property identity
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.identity}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.identity
         * @type {Function}
         */
        { namespace: 'identity', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.identity
         * @type {Function}
         */
        { namespace: 'identity', method: 'update', access: 'ADMIN' },
        /**
         * @property updateOnlineStatus
         * @for doccirrus.jsonrpc.api.identity
         * @type {Function}
         */
        { namespace: 'identity', method: 'updateOnlineStatus' },
        /**
         * @property getOnlineStatus
         * @for doccirrus.jsonrpc.api.identity
         * @type {Function}
         */
        { namespace: 'identity', method: 'getOnlineStatus' },
        /**
         * @property getLastActivatedProfile
         * @for doccirrus.jsonrpc.api.identity
         * @type {Function}
         */
        { namespace: 'identity', method: 'getLastActivatedProfile' },
        /**
         * @property telecommunication
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.telecommunication}
         */
        /**
         * @property updateOnlineStatus
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'getPresenceList' },
        /**
         * @property initiateCall
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'initiateCall' },
        /**
         * @property rejectCall
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'rejectCall' },
        /**
         * @property runOnStart
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'runOnStart' },
        /**
         * @property getPresenceList
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'getPresenceList' },
        /**
         * @property initiateCall
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'initiateCall' },
        /**
         * @property updateCallLog
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'updateCallLog' },
        /**
         * @property setParticipantStatus
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'setParticipantStatus' },
        /**
         * @property inviteByEmail
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'inviteByEmail' },
        /**
         * @property cancelEmailInvitations
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'cancelEmailInvitations' },
        /**
         * @property inviteExternalParticipants
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'inviteExternalParticipants' },
        /**
         * @property addParticipant
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'addParticipant' },
        /**
         * @property upsertCallAuditOnPUC
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'upsertCallAuditOnPUC' },
        /**
         * @property excludeParticipantsFromCallAudit
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'excludeParticipantsFromCallAudit' },
        /**
         * @property addParticipantsToCallAudit
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'addParticipantsToCallAudit' },
        /**
         * @property updateCaller
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'updateCaller' },
        /**
         * @property cancelConferenceCallAudit
         * @for doccirrus.jsonrpc.api.telecommunication
         * @type {Function}
         */
        { namespace: 'telecommunication', method: 'cancelConferenceCallAudit' },
        /**
         * @property partner
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.partner}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.partner
         * @type {Function}
         */
        { namespace: 'partner', method: 'read' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.partner
         * @type {Function}
         */
        { namespace: 'partner', method: 'create' },
        /**
         * @property batchDelete
         * @for doccirrus.jsonrpc.api.partner
         * @type {Function}
         */
        { namespace: 'partner', method: 'batchDelete' },
        /**
         * @property importPartnerData
         * @for doccirrus.jsonrpc.api.partner
         * @type {Function}
         */
        { namespace: 'partner', method: 'importPartnerData' },
        /**
         * @property sendInvitation
         * @for doccirrus.jsonrpc.api.partner
         * @type {Function}
         */
        { namespace: 'partner', method: 'sendInvitation' },
        /**
         * @property getForManualTransfer
         * @for doccirrus.jsonrpc.api.partner
         * @type {Function}
         */
        { namespace: 'partner', method: 'getForManualTransfer' },
        /**
         * @property getPseudonym
         * @for doccirrus.jsonrpc.api.partner
         * @type {Function}
         */
        { namespace: 'partner', method: 'getPseudonym' },
        /**
         * @property getPartnerDetails
         * @for doccirrus.jsonrpc.api.partner
         * @type {Function}
         */
        { namespace: 'partner', method: 'getPartnerDetails' },
        /**
         * @property partnerreg
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.partnerreg}
         */
        { namespace: 'partnerreg', method: 'read' },
        /**
         * @property gerPresenceListPUC
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.partnerreg}
         */
        { namespace: 'partnerreg', method: 'gerPresenceListPUC' },
        /**
         * @property transferTeleConsult
         * @for doccirrus.jsonrpc.api.patientTransfer
         * @type {Function}
         */
        { namespace: 'patientTransfer', method: 'transferTeleConsult' },
        /**
         * @property getSentTransfer
         * @for doccirrus.jsonrpc.api.patientTransfer
         * @type {Function}
         */
        { namespace: 'patientTransfer', method: 'getSentTransfer' },
        /**
         * @property dispatchPatientData
         * @for doccirrus.jsonrpc.api.patientTransfer
         * @type {Function}
         */
        { namespace: 'patientTransfer', method: 'dispatchPatientData' },
        /**
         * @property getEmailsOnlyForAuthorisedUsers
         * @for doccirrus.jsonrpc.api.patientTransfer
         * @type {Function}
         */
        { namespace: 'patientTransfer', method: 'getEmailsOnlyForAuthorisedUsers' },
        /**
         * @property transfer
         * @for doccirrus.jsonrpc.api.activityTransfer
         * @type {Function}
         */
        { namespace: 'activityTransfer', method: 'transfer' },
        /**
         * @property getActivityCounts
         * @for doccirrus.jsonrpc.api.activityTransfer
         * @type {Function}
         */
        { namespace: 'activityTransfer', method: 'getActivityCounts' },
        /**
         * @property reSynchronizeTransfer
         * @for doccirrus.jsonrpc.api.activityTransfer
         * @type {Function}
         */
        { namespace: 'activityTransfer', method: 'reSynchronizeTransfer' },
        /**
         * @property getPendingActivities
         * @for doccirrus.jsonrpc.api.activityTransfer
         * @type {Function}
         */
        { namespace: 'activityTransfer', method: 'getPendingActivities' },
        /**
         * @property createOrUpdatePatient
         * @for doccirrus.jsonrpc.api.activityTransfer
         * @type {Function}
         */
        { namespace: 'activityTransfer', method: 'createOrUpdatePatient' },
        /**
         * @property getTransferStats
         * @for doccirrus.jsonrpc.api.activityTransfer
         * @type {Function}
         */
        { namespace: 'activityTransfer', method: 'getTransferStats' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.devicelog
         * @type {Function}
         */
        { namespace: 'devicelog', method: 'read' },
        /**
         * @property claimDeviceLogEntry
         * @for doccirrus.jsonrpc.api.devicelog
         * @type {Function}
         */
        { namespace: 'devicelog', method: 'claimDeviceLogEntry' },
        /**
         * @property claimAllUnclaimedDeviceLogs
         * @for doccirrus.jsonrpc.api.devicelog
         * @type {Function}
         */
        { namespace: 'devicelog', method: 'claimAllUnclaimedDeviceLogs' },
        /**
         * @property revertDeviceLogEntryFromActivity
         * @for doccirrus.jsonrpc.api.devicelog
         * @type {Function}
         */
        { namespace: 'devicelog', method: 'revertDeviceLogEntryFromActivity' },
        /**
         * @property banklog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.banklog}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.banklog
         * @type {Function}
         */
        { namespace: 'banklog', method: 'read' },
        /**
         * @property runBESR
         * @for doccirrus.jsonrpc.api.banklog
         * @type {Function}
         */
        { namespace: 'banklog', method: 'runBESR' },
        /**
         * @property runTest
         * @for doccirrus.jsonrpc.api.banklog
         * @type {Function}
         */
        { namespace: 'banklog', method: 'runTest' },
        /**
         * @property claimBankLogEntry
         * @for doccirrus.jsonrpc.api.banklog
         * @type {Function}
         */
        { namespace: 'banklog', method: 'claimBankLogEntry' },
        /**
         * @property unsassignActivityFromBankLogRecord
         * @for doccirrus.jsonrpc.api.banklog
         * @type {Function}
         */
        { namespace: 'banklog', method: 'unsassignActivityFromBankLogRecord' },
        /**
         * @property uploadBESR
         * @for doccirrus.jsonrpc.api.banklog
         * @type {Function}
         */
        { namespace: 'banklog', method: 'uploadBESR' },
        /**
         * @property callaudit
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.callaudit}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.callaudit
         * @type {Function}
         */
        { namespace: 'callaudit', method: 'read' },
        /**
         * @property inphone
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.inphone}
         */
        /**
         * @property getForCallerLog
         * @for doccirrus.jsonrpc.api.inphone
         * @type {Function}
         */
        { namespace: 'inphone', method: 'getForCallerLog' },
        /**
         * @property leanSyncInitCall
         * @for doccirrus.jsonrpc.api.inphone
         * @type {Function}
         */
        { namespace: 'inphone', method: 'leanSyncInitCall' },
        /**
         * @property audit
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.audit}
         */
        /**
         * @property getForAuditBrowser
         * @for doccirrus.jsonrpc.api.callaudit
         * @type {Function}
         */
        { namespace: 'audit', method: 'getForAuditBrowser', access: 'PHYSICIAN' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.callaudit
         * @type {Function}
         */
        { namespace: 'audit', method: 'get' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.callaudit
         * @type {Function}
         */
        { namespace: 'audit', method: 'renderDiffToTextClient' },
        /**
         * @property dashboard
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.dashboard}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.dashboard
         * @type {Function}
         */
        { namespace: 'dashboard', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.dashboard
         * @type {Function}
         */
        { namespace: 'dashboard', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.dashboard
         * @type {Function}
         */
        { namespace: 'dashboard', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.dashboard
         * @type {Function}
         */
        { namespace: 'dashboard', method: 'delete' },
        /**
         * @property saveUserConfiguration
         * @for doccirrus.jsonrpc.api.dashboard
         * @type {Function}
         */
        { namespace: 'dashboard', method: 'saveUserConfiguration' },
        /**
         * @property kotableconfiguration
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.kotableconfiguration}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'delete' },
        /**
         * @property saveUserConfiguration
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'saveUserConfiguration' },
        /**
         * @property clearAllTableConfigurationForUser
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'clearAllTableConfigurationForUser' },
        /**
         * @property getAllTableConfigurationForUser
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'getAllTableConfigurationForUser' },
        /**
         * @property hasUserTableConfigurations
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'hasUserTableConfigurations' },
        /**
         * @property cloneAllTableConfigurationForUserAsPreset
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'cloneAllTableConfigurationForUserAsPreset' },
        /**
         * @property checkTableConfigurationPresetExists
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'checkTableConfigurationPresetExists' },
        /**
         * @property clearTableConfigurationPreset
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'clearTableConfigurationPreset' },
        /**
         * @property resetTableConfigurationAndApplyPresetForUser
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'resetTableConfigurationAndApplyPresetForUser' },
        /**
         * @property getTableConfigurationPresetInfo
         * @for doccirrus.jsonrpc.api.kotableconfiguration
         * @type {Function}
         */
        { namespace: 'kotableconfiguration', method: 'getTableConfigurationPresetInfo' },
        /**
         * @property casefolder
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.casefolder}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'read' },
        /**
         *
         * @property create
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'create' },
        /**
         *
         * @property getCaseFolderDataForActivity
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'getCaseFolderDataForActivity' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'delete' },
        /**
         * @property getCaseFolderForCurrentEmployee
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'getCaseFolderForCurrentEmployee' },
        /**
         * @property setActiveTab
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'setActiveTab' },
        /**
         * @property moveActivitiesToCaseFolder
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'moveActivitiesToCaseFolder' },
        /**
         * @property copyActivitiesToCaseFolder
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'copyActivitiesToCaseFolder' },
        /**
         * @property lockPregnancyCaseFolder
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'lockPregnancyCaseFolder' },
        /**
         * @property unlockPregnancyCaseFolder
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'unlockPregnancyCaseFolder' },
        /**
         * @property getCaseFolderErrors
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'casefolder', method: 'getCaseFolderErrors'},
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'mirrorcasefolder', method: 'read' },
        /**
         * @property setActiveTab
         * @for doccirrus.jsonrpc.api.casefolder
         * @type {Function}
         */
        { namespace: 'mirrorcasefolder', method: 'setActiveTab' },
        /**
         * @property rlv
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.rlv}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.rlv
         * @type {Function}
         */
        { namespace: 'rlv', method: 'read' },
        /**
         * @property getRlvEntries
         * @for doccirrus.jsonrpc.api.rlv
         * @type {Function}
         */
        { namespace: 'rlv', method: 'getRlvEntries' },
        /**
         * @property calculate
         * @for doccirrus.jsonrpc.api.rlv
         * @type {Function}
         */
        { namespace: 'rlv', method: 'calculate' },
        /** @class doccirrus.jsonrpc.api.document */
        /**
         * @property document
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.document}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.document
         * @type {Function}
         */
        { namespace: 'document', method: 'create' },
        /**
         * @property patientDocument
         * @for doccirrus.jsonrpc.api.document
         * @type {Function}
         */
        { namespace: 'document', method: 'patientDocument' },
        /**
         * @property getByTag
         * @for doccirrus.jsonrpc.api.document
         * @type {Function}
         */
        { namespace: 'document', method: 'getByTag' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.document
         * @type {Function}
         */
        { namespace: 'document', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.document
         * @type {Function}
         */
        { namespace: 'document', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.document
         * @type {Function}
         */
        { namespace: 'document', method: 'delete' },
        /**
         * @property documentationtree
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.documentationtree}
         */

        /**
         * @property read
         * @for doccirrus.jsonrpc.api.documentationtree
         * @type {Function}
         */
        { namespace: 'documentationtree', method: 'read' },

        /**
         * @property create
         * @for doccirrus.jsonrpc.api.documentationtree
         * @type {Function}
         */
        { namespace: 'documentationtree', method: 'create' },

        /**
         * @property update
         * @for doccirrus.jsonrpc.api.documentationtree
         * @type {Function}
         */
        { namespace: 'documentationtree', method: 'update' },

        /**
         * @property update
         * @for doccirrus.jsonrpc.api.documentationtree
         * @type {Function}
         */
        { namespace: 'documentationtree', method: 'update' },
        /**
         * @property company
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.company}
         */
        /**
         * @property getActiveTenants
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'getActiveTenants' },
        /**
         * @property getLicences
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'getLicences' },
        /**
         * @property getCentralContact
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'getCentralContact', access: 'SUPERUSER' },
        /**
         * @property getCompanyData
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'getCompanyData', access: 'SUPERUSER' },
        /**
         * @property getCompanyData
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'getCompanyDataByDCCustomerNo', access: 'SUPERUSER' },
        /**
         * @property getDataForCompanyBrowser
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'getDataForCompanyBrowser', access: 'SUPERUSER' },
        /**
         * @property generateScript
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'generateScript', access: 'SUPERUSER' },
        /**
         * @property upgradeCompaniesInGroup
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'upgradeCompaniesInGroup', access: 'SUPERUSER' },
        /**
         * @property setVprcFQHostNameFromMVPRC
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'setVprcFQHostNameFromMVPRC', access: 'SUPERUSER' },
        /**
         * @property transformToPRC
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'transformToPRC', access: 'SUPERUSER' },
        /**
         * @property activateTenant
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'activateTenant', access: 'SUPERUSER' },
        /**
         * @property deleteTenant
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'deleteTenant', access: 'SUPERUSER' },
        /**
         * @property getTemplateTenants
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'getTemplateTenants', access: 'SUPERUSER' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'read', access: 'SUPERUSER' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'create', access: 'SUPERUSER' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'delete', access: 'ADMIN' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'update', access: 'SUPERUSER' },
        /**
         * @property createTenant
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'createTenant', access: 'SUPERUSER' },
        /**
         * @property activateSystem
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'activateSystem', access: 'SUPERUSER' },
        /**
         * @property createCommissionKey
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'createCommissionKey', access: 'SUPERUSER' },
        /**
         * @property removeCommissionKey
         * @for doccirrus.jsonrpc.api.company
         * @type {Function}
         */
        { namespace: 'company', method: 'removeCommissionKey', access: 'SUPERUSER' },
        /**
         * @property contact
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.contact}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.contact
         * @type {Function}
         */
        { namespace: 'contact', method: 'read', access: 'ADMIN' },
        /**
         * @property post
         * @for doccirrus.jsonrpc.api.contact
         * @type {Function}
         */
        { namespace: 'contact', method: 'post' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.contact
         * @type {Function}
         */
        { namespace: 'contact', method: 'update', access: 'ADMIN' },
        /**
         * @property getNonPatient
         * @for doccirrus.jsonrpc.api.contact
         * @type {Function}
         */
        { namespace: 'contact', method: 'getNonPatient', access: 'SUPERUSER' },
        /**
         * @property getPatient
         * @for doccirrus.jsonrpc.api.contact
         * @type {Function}
         */
        { namespace: 'contact', method: 'getPatient' },
        /**
         * @property deletePatient
         * @for doccirrus.jsonrpc.api.contact
         * @type {Function}
         */
        { namespace: 'contact', method: 'deletePatient', access: 'SUPERUSER' },
        /**
         * @property searchContact
         * @for doccirrus.jsonrpc.api.contact
         * @type {Function}
         */
        { namespace: 'contact', method: 'searchContact', access: 'ADMIN' },
        /**
         * @property communication
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.communication}
         */
        /**
         * @property speedTest
         * @for doccirrus.jsonrpc.api.communication
         * @type {Function}
         */
        { namespace: 'communication', method: 'speedTest' },
        /**
         * @property sendLicenseEmail
         * @for doccirrus.jsonrpc.api.communication
         * @type {Function}
         */
        { namespace: 'communication', method: 'sendLicenseEmail' },
        /**
         * @property sendSupportEmail
         * @for doccirrus.jsonrpc.api.communication
         * @type {Function}
         */
        { namespace: 'communication', method: 'sendSupportEmail' },
        /**
         * @property receiveFromPRC
         * @for doccirrus.jsonrpc.api.communication
         * @type {Function}
         */
        { namespace: 'communication', method: 'receiveFromPRC' },
        /**
         * @property getUser
         * @for doccirrus.jsonrpc.api.communication
         * @type {Function}
         */
        { namespace: 'communication', method: 'getUser' },
        /**
         * @property getAllSockets
         * @for doccirrus.jsonrpc.api.communication
         * @type {Function}
         */
        { namespace: 'communication', method: 'getAllSockets' },
        /**
         * @property getClientEventHandlers
         * @for doccirrus.jsonrpc.api.communication
         * @type {Function}
         */
        { namespace: 'communication', method: 'getClientEventHandlers' },
        /**
         * @property emitSocketTestEvents
         * @for doccirrus.jsonrpc.api.communication
         * @type {Function}
         */
        { namespace: 'communication', method: 'emitSocketTestEvents' },
        /**
         * @property testProxyUrl
         * @for doccirrus.jsonrpc.api.communication
         * @type {Function}
         */
        { namespace: 'communication', method: 'testProxyUrl' },
        /**
         * @property billing
         * @for doccirrus.jsonrpc.api.billing
         * @type {Function}
         */
        { namespace: 'billing', method: 'read' },
        /**
         * @property flow
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.flow}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.flow
         * @type {Function}
         */
        { namespace: 'flow', method: 'create', access: 'ADMIN' },
        { namespace: 'flow', method: 'getFlows' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.flow
         * @type {Function}
         */
        { namespace: 'flow', method: 'update', access: 'ADMIN' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.flow
         * @type {Function}
         */
        { namespace: 'flow', method: 'read' },
        /**
         * @property testFlow
         * @for doccirrus.jsonrpc.api.flow
         * @type {Function}
         */
        { namespace: 'flow', method: 'testFlow', access: 'ADMIN' },
        /**
         * @property getActiveFlows
         * @for doccirrus.jsonrpc.api.flow
         * @type {Function}
         */
        { namespace: 'flow', method: 'getActiveFlows' },
        /**
         * @property getLaunchers
         * @for doccirrus.jsonrpc.api.flow
         * @type {Function}
         */
        { namespace: 'flow', method: 'getLaunchers' },
        /**
         * @property clearBlacklist
         * @for doccirrus.jsonrpc.api.flow
         * @type {Function}
         */
        { namespace: 'flow', method: 'clearBlacklist', access: 'ADMIN' },
        /**
         * @property resetSerial
         * @for doccirrus.jsonrpc.api.flow
         * @type {Function}
         */
        { namespace: 'flow', method: 'resetSerial', access: 'ADMIN' },
        /**
         * @property execute
         * @for doccirrus.jsonrpc.api.flow
         * @type {Function}
         */
        { namespace: 'flow', method: 'execute' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.flow
         * @type {Function}
         */
        { namespace: 'flow', method: 'delete', access: 'ADMIN' },
        /**
         * @property getFlowsForCollection
         * @for doccirrus.jsonrpc.api.flow
         * @type {Function}
         */
        { namespace: 'flow', method: 'getFlowsForCollection' },
        /**
         * @property device
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.device}
         */
        /**
         * @property pacsExport
         * @for doccirrus.jsonrpc.api.device
         * @type {Function}
         */
        { namespace: 'device', method: 'pacsExport' },
        /**
         * @property getGDTVersions
         * @for doccirrus.jsonrpc.api.device
         * @type {Function}
         */
        { namespace: 'device', method: 'getGDTVersions' },
        /**
         * @property getFieldsForXDT
         * @for doccirrus.jsonrpc.api.device
         * @type {Function}
         */
        { namespace: 'device', method: 'getFieldsForXDT' },
        /**
         * @property getLDTVersions
         * @for doccirrus.jsonrpc.api.device
         * @type {Function}
         */
        { namespace: 'device', method: 'getLDTVersions' },
        /**
         * @property shareAllPrinters
         * @for doccirrus.jsonrpc.api.device
         * @type {Function}
         */
        { namespace: 'device', method: 'shareAllPrinters' },
        /**
         * @property getConfiguredDevice
         * @for doccirrus.jsonrpc.api.device
         * @type {Function}
         */
        { namespace: 'device', method: 'getConfiguredDevice' },
        /**
         * @property getNotConfiguredDevice
         * @for doccirrus.jsonrpc.api.device
         * @type {Function}
         */
        { namespace: 'device', method: 'getNotConfiguredDevice' },
        /**
         * @property getProcedureList
         * @for doccirrus.jsonrpc.api.device
         * @type {Function}
         */
        { namespace: 'device', method: 'getProcedureList' },
        /**
         * @property getS2eClients
         * @for doccirrus.jsonrpc.api.device
         * @type {Function}
         */
        { namespace: 'device', method: 'getS2eClients' },
        /**
         * @property file
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.file}
         */
        /**
         * @property testSmb
         * @for doccirrus.jsonrpc.api.file
         * @type {Function}
         */
        { namespace: 'file', method: 'testSmb' },

        /**
         * @property gridfs
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.gridfs}
         */
        /**
         * @property getFsFiles
         * @for doccirrus.jsonrpc.api.gridfs
         * @type {Function}
         */
        { namespace: 'gridfs', method: 'getFsFiles'},

        /**
         * @property gridfs
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.gridfs}
         */
        /**
         * @property updateFsFile
         * @for doccirrus.jsonrpc.api.gridfs
         * @type {Function}
         */
        { namespace: 'gridfs', method: 'updateFsFile'},
        /**
         * @property media
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.media}
         */

        /**
         * @property read
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'read' },

        /**
         * @property concatenatepdfs
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'concatenatepdfs' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'delete' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'update' },
        /**
         * @property saveFromCache
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'saveFromCache' },
        /**
         * @property makecopy
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'makecopy' },
        /**
         * @property createzip
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'createzip' },
        /**
         * @property copypdftozip
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'copypdftozip' },
        /**
         * @property checkCache
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'checkCache' },
        /**
         * @property printCache
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'printCache' },
        /**
         * @property print
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'print' },
        /**
         * @property scheduleDeletion
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'scheduleDeletion' },
        /**
         * @property loadDataURI
         * @for doccirrus.jsonrpc.api.imagesCanvas
         * @type {Function}
         */
        { namespace: 'media', method: 'loadDataURI' },
        /**
         * @property saveDataURI
         * @for doccirrus.jsonrpc.api.imagesCanvas
         * @type {Function}
         */
        { namespace: 'media', method: 'saveDataURI' },
        /**
         * @property saveChartPDF
         * @for doccirrus.jsonrpc.api.imagesCanvas
         * @type {Function}
         */
        { namespace: 'media', method: 'saveChartPDF' },
        /**
         * @property getPdfPageLayout
         * @for doccirrus.jsonrpc.api.imagesCanvas
         * @type {Function}
         */
        { namespace: 'media', method: 'getPdfPageLayout' },
        /**
         * @property makepdf
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'makepdf' },
        /**
         * @property list
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'list' },
        /**
         * @property listfonts
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'listfonts' },
        /**
         * @property remove
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'remove' },
        /**
         * @property
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'reloadfonts' },

        /**
         * @property list
         * @for doccirrus.jsonrpc.api.exportActivitiesAttachmentsToZip
         * @type {Function}
         */
        { namespace: 'media', method: 'exportActivitiesAttachmentsToZip' },
        /**
         * @property uploadchunked
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'uploadchunked' },
        /**
         * @property upload64
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'upload64' },
        /**
         * @property tempstore
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'tempstore' },
        /**
         * @property markFalsePositive
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'markFalsePositive' },
        /**
         * @property deleteMalware
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'deleteMalware' },
        /**
         * @property download
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'download' },
        /**
         * @property compilepdf
         * @for doccirrus.jsonrpc.api.media
         * @type {Function}
         */
        { namespace: 'media', method: 'compilepdf' },
        /**
         * @property basecontact
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.basecontact}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.basecontact
         * @type {Function}
         */
        { namespace: 'basecontact', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.basecontact
         * @type {Function}
         */
        { namespace: 'basecontact', method: 'read' },
        /**
         * @property getExpandedPhysicians
         * @for doccirrus.jsonrpc.api.basecontact
         * @type {Function}
         */
        { namespace: 'basecontact', method: 'getExpandedPhysicians' },
        /**
         * @property doesVendorHaveOrdersOrDeliveries
         * @for doccirrus.jsonrpc.api.basecontact
         * @type {Function}
         */
        { namespace: 'basecontact', method: 'doesVendorHaveOrdersOrDeliveries' },
        /**
         * @property getFullContactData
         * @for doccirrus.jsonrpc.api.basecontact
         * @type {Function}
         */
        { namespace: 'basecontact', method: 'getFullContactData' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.basecontact
         * @type {Function}
         */
        { namespace: 'basecontact', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.basecontact
         * @type {Function}
         */
        { namespace: 'basecontact', method: 'delete' },
        /**
         * @property searchContact
         * @for doccirrus.jsonrpc.api.basecontact
         * @type {Function}
         */
        { namespace: 'basecontact', method: 'searchContact' },
        /**
         * @property task
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.task}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'read' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'delete' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'create' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'update' },
        /**
         * @property getPatientHotTask
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'getPatientHotTask' },
        /**
         * @property getPopulatedTask
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'getPopulatedTask' },
        /**
         * @property createTasksForActivities
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'createTasksForActivities' },
        /**
         * @property deleteBatch
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'deleteBatch' },
        /**
         * @property assignTaskAndUpdateStatus
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'assignTaskAndUpdateStatus' },
        /**
         * @property createTaskForRoles
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'createTaskForRoles' },
        /**
         * @property createActivitiesForPatients
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'createActivitiesForPatients' },
        /**
         * @property createDocumentAndActivity
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'createDocumentAndActivity' },
        /**
         * @property updateColumns
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'updateColumns' },
        /**
         * @property updateColumnTask
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'updateColumnTask' },
        /**
         * @property updateName
         * @for doccirrus.jsonrpc.api.task
         * @type {Function}
         */
        { namespace: 'task', method: 'updateName' },
        /**
         * @property taskconfiguration
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.taskconfiguration}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.taskconfiguration
         * @type {Function}
         */
        { namespace: 'taskconfiguration', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.taskconfiguration
         * @type {Function}
         */
        { namespace: 'taskconfiguration', method: 'update' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.taskconfiguration
         * @type {Function}
         */
        { namespace: 'taskconfiguration', method: 'create' },
        /** @class doccirrus.jsonrpc.api.tasktype */
        /**
         * @property tasktype
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.tasktype}
         */
        /**
         * @property getForTypeTable
         * @for doccirrus.jsonrpc.api.tasktype
         * @type {Function}
         */
        { namespace: 'tasktype', method: 'getForTypeTable' },
        /**
         * @property updateTaskType
         * @for doccirrus.jsonrpc.api.tasktype
         * @type {Function}
         */
        { namespace: 'tasktype', method: 'updateTaskType' },
        /**
         * @property deleteType
         * @for doccirrus.jsonrpc.api.tasktype
         * @type {Function}
         */
        { namespace: 'tasktype', method: 'deleteType' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.tasktype
         * @type {Function}
         */
        { namespace: 'tasktype', method: 'read' },
        /** @class doccirrus.jsonrpc.api.cardioconfiguration */
        /**
         * @property cardioconfiguration
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.cardioconfiguration}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.cardioconfiguration
         * @type {Function}
         */
        { namespace: 'cardioconfiguration', method: 'read' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.cardioconfiguration
         * @type {Function}
         */
        { namespace: 'cardioconfiguration', method: 'delete' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.cardioconfiguration
         * @type {Function}
         */
        { namespace: 'cardioconfiguration', method: 'create' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.cardioconfiguration
         * @type {Function}
         */
        { namespace: 'cardioconfiguration', method: 'update' },
        /**
         * @property saveConfig
         * @for doccirrus.jsonrpc.api.cardioconfiguration
         * @type {Function}
         */
        { namespace: 'cardioconfiguration', method: 'saveConfig' },
        /**
         * @property testConfig
         * @for doccirrus.jsonrpc.api.cardioconfiguration
         * @type {Function}
         */
        { namespace: 'cardioconfiguration', method: 'testConfig' },
        /**
         * @property deleteConfig
         * @for doccirrus.jsonrpc.api.cardioconfiguration
         * @type {Function}
         */
        { namespace: 'cardioconfiguration', method: 'deleteConfig' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.role
         * @type {Function}
         */
        { namespace: 'role', method: 'read' },
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.role
         * @type {Function}
         */
        { namespace: 'role', method: 'get' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.role
         * @type {Function}
         */
        { namespace: 'role', method: 'delete', access: 'ADMIN' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.role
         * @type {Function}
         */
        { namespace: 'role', method: 'create', access: 'ADMIN' },
        /**
         * @property budget
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.budget}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.budget
         * @type {Function}
         */
        { namespace: 'budget', method: 'read' },
        /**
         * @property calculate
         * @for doccirrus.jsonrpc.api.calculate
         * @type {Function}
         */
        { namespace: 'budget', method: 'calculate' },
        /**
         * @property rulelog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.rulelog}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.rulelog
         * @type {Function}
         */
        { namespace: 'rulelog', method: 'read' },
        /**
         * @property removeEntriesAndUpdateCaseFolderStats
         * @for doccirrus.jsonrpc.api.rulelog
         * @type {Function}
         */
        { namespace: 'rulelog', method: 'removeEntriesAndUpdateCaseFolderStats' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.rulelog
         * @type {Function}
         */
        { namespace: 'rulelog', method: 'update' },
        /**
         * @property calculateErrors
         * @for doccirrus.jsonrpc.api.rulelog
         * @type {Function}
         */
        { namespace: 'rulelog', method: 'calculateErrors' },
        /**
         * @property getErrors
         * @for doccirrus.jsonrpc.api.rulelog
         * @type {Function}
         */
        { namespace: 'rulelog', method: 'getErrors' },
        /**
         * @property rule
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.rule}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'create', access: 'ADMIN' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'getFilteredRules' },
        /**
         * @property getFilteredRules
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.update
         * @type {Function}
         */
        { namespace: 'rule', method: 'update', access: 'ADMIN' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.delete
         * @type {Function}
         */
        { namespace: 'rule', method: 'delete', access: 'ADMIN' },
        /**
         * @property createDirectory
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'createDirectory', access: 'ADMIN' },
        /**
         * @property renameRuleSetOrDirectory
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'renameRuleSetOrDirectory', access: 'ADMIN' },
        /**
         * @property moveRuleSetOrDirectory
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'moveRuleSetOrDirectory', access: 'ADMIN' },
        /**
         * @property importFromCatalog
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'importFromCatalog', access: 'ADMIN' },
        /**
         * @property activate
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'activate', access: 'ADMIN' },
        /**
         * @property activate
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'lock', access: 'ADMIN' },
        /**
         * @property deleteDirectory
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'deleteDirectory', access: 'ADMIN' },
        /**
         * @property createRuleActivities
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'createRuleActivities' },
        /**
         * @property getFiltered
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'getFiltered' },
        /**
         * @property triggerIpcQueue
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'triggerIpcQueue' },
        /**
         * @property triggerRuleEngineOnCaseOpenIPC
         * @for doccirrus.jsonrpc.api.rule
         * @type {Function}
         */
        { namespace: 'rule', method: 'triggerRuleEngineOnCaseOpenIPC' },
        /**
         * @property getconfig
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'getconfig' },
        /**
         * @property deletecanonicalonly
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'deletecanonicalonly' },
        /**
         * @property setconfig
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'setconfig' },

        /**
         * @property loadform
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'loadform' },
        /**
         * @property saveform
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'saveform' },
        /**
         * @property isinuse
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'isinuse' },
        /**
         * @property makepdfws
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'makepdfws' },
        /**
         * @property makePDFFiles
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'makePDFFiles' },
        /**
         * @property makepdf
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'makepdf' },
        /**
         * @property makereportpdf
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'makereportpdf' },
        /**
         * @property makekotablepdf
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'makekotablepdf' },
        /**
         * @property generatePdfDirect
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'generatePdfDirect' },

        /**
         * @property printpdfcopyws
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'printpdfcopyws' },
        /**
         * @property getUserReportingFields
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'getUserReportingFields' },

        /**
         * @property latestVersionMeta
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'latestVersionMeta' },

        /**
         * @property prepareDataForPrintCopyWS
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'prepareDataForPrintCopyWS' },

        /**
         * @property listversions
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'listversions' },
        /**
         * @property
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'listforms' },
        /**
         * @property listformexports
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'listformexports' },
        /**
         * @property exportforms
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'exportforms' },
        /**
         * @property createversion
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'createversion' },
        /**
         * @property createform
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'createform' },
        /**
         * @property clearformexports
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'clearformexports' },
        /**
         * @property clearFormListCache
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'clearFormListCache' },
        /**
         * @property exportform
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'exportform' },
        /**
         * @property importform
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'importform' },
        /**
         * @property uploadbackup
         * @for doccirrus.jsonrpc.api.formtemplate
         * @type {Function}
         */
        { namespace: 'formtemplate', method: 'uploadbackup' },
        /**
         * @property test
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.test}
         */
        /**
         * @property testWarnings
         * @for doccirrus.jsonrpc.api.test
         * @type {Function}
         */
        { namespace: 'test', method: 'testWarnings' },
        /**
         * @property testErrorInErrorTable
         * @for doccirrus.jsonrpc.api.test
         * @type {Function}
         */
        { namespace: 'test', method: 'testErrorInErrorTable' },
        /**
         * @property testErrorNotInErrorTable
         * @for doccirrus.jsonrpc.api.test
         * @type {Function}
         */
        { namespace: 'test', method: 'testErrorNotInErrorTable' },
        /**
         * @property biotronik
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.biotronik}
         */
        /**
         * @property addDataFromServer
         * @for doccirrus.jsonrpc.api.biotronik
         * @type {Function}
         */
        { namespace: 'biotronik', method: 'addDataFromServer' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.insight2
         * @type {Function}
         */
        { namespace: 'insight2', method: 'read' },

        /**
         * @property create
         * @for doccirrus.jsonrpc.api.insight2
         * @type {Function}
         */
        { namespace: 'insight2', method: 'create', access: 'CONTROLLER' },

        /**
         * @property update
         * @for doccirrus.jsonrpc.api.insight2
         * @type {Function}
         */
        { namespace: 'insight2', method: 'update', access: 'CONTROLLER' },

        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.insight2
         * @type {Function}
         */
        { namespace: 'insight2', method: 'delete', access: 'CONTROLLER' },

        /**
         * @property getOne
         * @for doccirrus.jsonrpc.api.insight2
         * @type {Function}
         */
        { namespace: 'insight2', method: 'getOne' },

        /**
         * @property getByName
         * @for doccirrus.jsonrpc.api.insight2containers
         * @type {Function}
         */
        { namespace: 'insight2containers', method: 'getByName' },

        /**
         * @property update
         * @for doccirrus.jsonrpc.api.insight2containers
         * @type {Function}
         */
        { namespace: 'insight2containers', method: 'updateConfig' },

        /**
         * @property resetUserConfigs
         * @for doccirrus.jsonrpc.api.insight2containers
         * @type {Function}
         */
        { namespace: 'insight2containers', method: 'resetUserConfigs', access: 'CONTROLLER' },

        /**
         * @property read
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'read' },

        /**
         * @property getData
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'getData' },

        /**
         * @property aggregate
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'aggregate' },

        /**
         * @property generate
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'generate', access: 'CONTROLLER' },

        /**
         * @property getAnalysis
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'getAnalysis' },
        /**
         * @property getLabDataOverview
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'getLabDataOverview' },
        /**
         * @property generateSchneiderKBVLogAnalysis
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'generateSchneiderKBVLogAnalysis', access: 'CONTROLLER' },
        /**
         * @property generatePerformanceGroupReport
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'generatePerformanceGroupReport', access: 'CONTROLLER' },
        /**
         * @property generatePerformanceReportByEmployees
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'generatePerformanceReportByEmployees', access: 'CONTROLLER' },
        /**
         * @property generatePVSPerformanceReport
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'generatePVSPerformanceReport', access: 'CONTROLLER' },
        /**
         * @property generatePVSLogAnalysis
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'generatePVSLogAnalysis', access: 'CONTROLLER'},
        /**
         * @property getLabDataTable
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'getLabDataTable' },
        /**
         * @property startGenerateFromUI
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'startGenerateFromUI', access: 'CONTROLLER' },
        /**
         * @property getRegenerationFlagUI
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'getRegenerationFlagUI' },
        /**
         * @property setCancelRegenerationFlag
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'setCancelRegenerationFlag' },
        /**
         * @property getReportingDbStatus
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'getReportingDbStatus' },
        /**
         * @property clearReportings
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'clearReportings', access: 'CONTROLLER' },
        /**
         * @property clearSyncreportings
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'clearSyncreportings', access: 'CONTROLLER' },
        /**
         * @property restartReportingWorker
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'restartReportingWorker', access: 'CONTROLLER' },
        /**
         * @property createCSVFromReporting
         * @for doccirrus.jsonrpc.api.reporting
         * @type {Function}
         */
        { namespace: 'reporting', method: 'createCSVFromReporting' },

        /**
         * @property admin
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.admin}
         */
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.admin
         * @type {Function}
         */
        { namespace: 'admin', method: 'read', access: 'ADMIN' },
        /**
         * @property getConfiguredDatasafeBackupJob
         * @for doccirrus.jsonrpc.api.admin
         * @type {Function}
         */
        { namespace: 'admin', method: 'getConfiguredDatasafeBackupJob' },

        /**
         * @property setDatasafeBackupTime
         * @for doccirrus.jsonrpc.api.admin
         * @type {Function}
         */
        { namespace: 'admin', method: 'setDatasafeBackupTime', access: 'ADMIN' },
        /**
         * @property getLanguage
         * @for doccirrus.jsonrpc.api.admin
         * @type {Function}
         */
        { namespace: 'admin', method: 'getLanguage' },
        /**
         * @property getLanguage
         * @for doccirrus.jsonrpc.api.admin
         * @type {Function}
         */
        { namespace: 'admin', method: 'getFingerPrint' },
        /**
         * @property setLanguage
         * @for doccirrus.jsonrpc.api.admin
         * @type {Function}
         */
        { namespace: 'admin', method: 'setLanguage', access: 'ADMIN' },
        /**
         * @property getAppLicenseSerialToken
         * @for doccirrus.jsonrpc.api.admin
         * @type {Function}
         */
        { namespace: 'admin', method: 'getAppLicenseSerialToken', access: 'ADMIN' },
        /**
         * @property ehks
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.ehks}
         */
        /**
         * @property createEhksDoc
         * @for doccirrus.jsonrpc.api.ehks
         * @type {Function}
         */
        { namespace: 'ehks', method: 'createEhksDoc' },
        /**
         * @property isEhksPatientNoLocked
         * @for doccirrus.jsonrpc.api.ehks
         * @type {Function}
         */
        { namespace: 'ehks', method: 'isEhksPatientNoLocked' },
        /**
         * @property edoc
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.edoc}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.edoc
         * @type {Function}
         */
        { namespace: 'edoc', method: 'read' },
        /**
         * @property approveValidDocs
         * @for doccirrus.jsonrpc.api.edoc
         * @type {Function}
         */
        { namespace: 'edoc', method: 'approveValidDocs' },
        /**
         * @property isHgvCaseNoLocked
         * @for doccirrus.jsonrpc.api.edoc
         * @type {Function}
         */
        { namespace: 'edoc', method: 'isHgvCaseNoLocked' },
        /**
         * @property edmp
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.edmp}
         */
        /**
         * @property getPatientsLastFirstDoc
         * @for doccirrus.jsonrpc.api.edmp
         * @type {Function}
         */
        { namespace: 'edmp', method: 'getPatientsLastFirstDoc' },
        /**
         * @property collectDiagnosisChainInfo
         * @for doccirrus.jsonrpc.api.edmp
         * @type {Function}
         */
        { namespace: 'edmp', method: 'collectDiagnosisChainInfo' },
        /**
         * @property isEdmpCaseNoLocked
         * @for doccirrus.jsonrpc.api.edmp
         * @type {Function}
         */
        { namespace: 'edmp', method: 'isEdmpCaseNoLocked' },
        /**
         * @property setAddressee
         * @for doccirrus.jsonrpc.api.edmp
         * @type {Function}
         */
        { namespace: 'edmp', method: 'setAddressee' },
        /**
         * @property setPrintedFlag
         * @for doccirrus.jsonrpc.api.edmp
         * @type {Function}
         */
        { namespace: 'edmp', method: 'setPrintedFlag' },
        /**
         * @property getMergeData
         * @for doccirrus.jsonrpc.api.edmp
         * @type {Function}
         */
        { namespace: 'edmp', method: 'getMergeData' },
        /**
         * @property createEdmpDoc
         * @for doccirrus.jsonrpc.api.edmp
         * @type {Function}
         */
        { namespace: 'edmp', method: 'createEdmpDoc' },
        /**
         * @property createHgvDoc
         * @for doccirrus.jsonrpc.api.edmp
         * @type {Function}
         */
        { namespace: 'edmp', method: 'createHgvDoc' },
        /**
         * @property createZervixZytologieDoc
         * @for doccirrus.jsonrpc.api.edmp
         * @type {Function}
         */
        { namespace: 'edmp', method: 'createZervixZytologieDoc' },
        /**
         * @property upcomingedmpdoc
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.upcomingedmpdoc}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.upcomingedmpdoc
         * @type {Function}
         */
        { namespace: 'upcomingedmpdoc', method: 'read' },
        /**
         * @property edmpdelivery
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.edmpdelivery}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.edmpdelivery
         * @type {Function}
         */
        { namespace: 'edmpdelivery', method: 'create', access: 'SUPERUSER' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.edmpdelivery
         * @type {Function}
         */
        { namespace: 'edmpdelivery', method: 'read', access: 'SUPERUSER' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.edmpdelivery
         * @type {Function}
         */
        { namespace: 'edmpdelivery', method: 'update', access: 'SUPERUSER' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.edmpdelivery
         * @type {Function}
         */
        { namespace: 'edmpdelivery', method: 'delete', access: 'SUPERUSER' },
        /**
         * @property correctDocsFromDelivery
         * @for doccirrus.jsonrpc.api.edmpdelivery
         * @type {Function}
         */
        { namespace: 'edmpdelivery', method: 'correctDocsFromDelivery', access: 'SUPERUSER' },
        /**
         * @property createDeliveries
         * @for doccirrus.jsonrpc.api.edmpdelivery
         * @type {Function}
         */
        { namespace: 'edmpdelivery', method: 'createDeliveries', access: 'SUPERUSER' },
        /**
         * @property removeDocsFromDelivery
         * @for doccirrus.jsonrpc.api.edmpdelivery
         * @type {Function}
         */
        { namespace: 'edmpdelivery', method: 'removeDocsFromDelivery', access: 'SUPERUSER' },
        /**
         * @property sendDelivery
         * @for doccirrus.jsonrpc.api.edmpdelivery
         * @type {Function}
         */
        { namespace: 'edmpdelivery', method: 'sendDelivery', access: 'SUPERUSER' },
        /**
         * @property packDelivery
         * @for doccirrus.jsonrpc.api.edmpdelivery
         * @type {Function}
         */
        { namespace: 'edmpdelivery', method: 'packDelivery', access: 'SUPERUSER' },
        /**
         * @property archiveDelivery
         * @for doccirrus.jsonrpc.api.edmpdelivery
         * @type {Function}
         */
        { namespace: 'edmpdelivery', method: 'archiveDelivery', access: 'SUPERUSER' },
        /**
         * @property matchPatient
         * @for doccirrus.jsonrpc.api.patientmatch
         * @type {Function}
         */
        { namespace: 'patientmatch', method: 'matchPatient', access: 'SUPERUSER' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.patienttransfer
         * @type {Function}
         */
        { namespace: 'patienttransfer', method: 'read' },
        /**
         * @property put
         * @for doccirrus.jsonrpc.api.patienttransfer
         * @type {Function}
         */
        { namespace: 'patienttransfer', method: 'put' },
        /**
         * @property formportal
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.formportal}
         */
        /**
         * @property getActivePortalList
         * @for doccirrus.jsonrpc.api.formportal
         * @type {Function}
         */
        { namespace: 'formportal', method: 'getActivePortalList' },
        /**
         * @property sentToFormPortal
         * @for doccirrus.jsonrpc.api.formportal
         * @type {Function}
         */
        { namespace: 'formportal', method: 'sentToFormPortal' },
        /**
         * @property sendUrl
         * @for doccirrus.jsonrpc.api.formportal
         * @type {Function}
         */
        { namespace: 'formportal', method: 'sendUrl' },

        /**
         * @property loadIndividualAssignment
         * @for doccirrus.jsonrpc.api.formprinter
         * @type {Function}
         */
        { namespace: 'formprinter', method: 'loadIndividualAssignment' },
           /**
         * @property clearuserassignments
         * @for doccirrus.jsonrpc.api.formprinter
         * @type {Function}
         */
        { namespace: 'formprinter', method: 'clearuserassignments' },
        /**
         * @property getAllAlternatives
         * @for doccirrus.jsonrpc.api.formprinter
         * @type {Function}
         */
        { namespace: 'formprinter', method: 'getAllAlternatives' },
        /**
         * @property getprinter
         * @for doccirrus.jsonrpc.api.formprinter
         * @type {Function}
         */
        { namespace: 'formprinter', method: 'getprinter' },
        /**
         * @property getassignments
         * @for doccirrus.jsonrpc.api.formprinter
         * @type {Function}
         */
        { namespace: 'formprinter', method: 'getassignments' },
        /**
         * @property getAllAlternatives
         * @for doccirrus.jsonrpc.api.formprinter
         * @type {Function}
         */
        { namespace: 'formprinter', method: 'setsingle' },
        /**
         * @property removeAlternative
         * @for doccirrus.jsonrpc.api.formprinter
         * @type {Function}
         */
        { namespace: 'formprinter', method: 'removeAlternative' },
        /**
         * @property addFolder
         * @for doccirrus.jsonrpc.api.formfolder
         * @type {Function}
         */
        { namespace: 'formfolder', method: 'addFolder' },
        /**
         * @property updateFolder
         * @for doccirrus.jsonrpc.api.formfolder
         * @type {Function}
         */
        { namespace: 'formfolder', method: 'updateFolder' },
        /**
         * @property removeFolder
         * @for doccirrus.jsonrpc.api.formfolder
         * @type {Function}
         */
        { namespace: 'formfolder', method: 'removeFolder' },
        /**
         * @property getFolders
         * @for doccirrus.jsonrpc.api.formfolder
         * @type {Function}
         */
        { namespace: 'formfolder', method: 'getFolders' },
        /**
         * @property getFoldersWithForms
         * @for doccirrus.jsonrpc.api.formfolder
         * @type {Function}
         */
        { namespace: 'formfolder', method: 'getFoldersWithForms' },
        /**
         * @property getExportedFoldersWithForms
         * @for doccirrus.jsonrpc.api.formfolder
         * @type {Function}
         */
        { namespace: 'formfolder', method: 'getExportedFoldersWithForms' },
        /**
         * @property moveForm
         * @for doccirrus.jsonrpc.api.formfolder
         * @type {Function}
         */
        { namespace: 'formfolder', method: 'moveForm' },
        /**
         * @property put
         * @for doccirrus.jsonrpc.api.formfolder
         * @type {Function}
         */
        { namespace: 'formfolder', method: 'put' },
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.importexport
         * @type {Function}
         */
        { namespace: 'importexport', method: 'clearByMetadata' },
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.textblocksimportexport
         * @type {Function}
         */
        { namespace: 'textblocksimportexport', method: 'listSetOnDB' },
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.textblocksimportexport
         * @type {Function}
         */
        { namespace: 'textblocksimportexport', method: 'listSetOnDisk' },
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.textblocksimportexport
         * @type {Function}
         */
        { namespace: 'textblocksimportexport', method: 'exportSet' },
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.textblocksimportexport
         * @type {Function}
         */
        { namespace: 'textblocksimportexport', method: 'importSet' },
        /**
         * @property ruleimportexport
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.ruleimportexport}
         */
        /**
         * @property exportSet
         * @for doccirrus.jsonrpc.api.ruleimportexport
         * @type {Function}
         */
        { namespace: 'ruleimportexport', method: 'exportSet' },
        /**
         * @property uploadbackup
         * @for doccirrus.jsonrpc.api.ruleimportexport
         * @type {Function}
         */
        { namespace: 'ruleimportexport', method: 'uploadbackup' },
        /**
         * @property listSetOnDisk
         * @for doccirrus.jsonrpc.api.ruleimportexport
         * @type {Function}
         */
        { namespace: 'ruleimportexport', method: 'listSetOnDisk' },
        /**
         * @property importSet
         * @for doccirrus.jsonrpc.api.ruleimportexport
         * @type {Function}
         */
        { namespace: 'ruleimportexport', method: 'importSet' },
        /**
         * @property deleteArchive
         * @for doccirrus.jsonrpc.api.ruleimportexport
         * @type {Function}
         */
        { namespace: 'ruleimportexport', method: 'deleteArchive' },
        /**
         * @property listSetOnDB
         * @for doccirrus.jsonrpc.api.ruleimportexport
         * @type {Function}
         */
        { namespace: 'ruleimportexport', method: 'listSetOnDB' },
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.ruleimportexport
         * @type {Function}
         */
        { namespace: 'ruleimportexport', method: 'clearByMetadata' },
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.ruleimportexport
         * @type {Function}
         */
        { namespace: 'ruleimportexport', method: 'docCirrusReloadRegenerate' },
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.getActiveTenants
         * @type {Function}
         */
        { namespace: 'ruleimportexport', method: 'getActiveTenants' },
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.getImportFile
         * @type {Function}
         */
        { namespace: 'ruleimportexport', method: 'getImportFile' },

        /**
         * @property flowimportexport
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.flowimportexport}
         */
        /**
         * @property listSetOnDisk
         * @for doccirrus.jsonrpc.api.flowimportexport
         * @type {Function}
         */
        { namespace: 'flowimportexport', method: 'listSetOnDisk' },
        /**
         * @property uploadbackup
         * @for doccirrus.jsonrpc.api.flowimportexport
         * @type {Function}
         */
        { namespace: 'flowimportexport', method: 'uploadbackup' },
        /**
         * @property listSetOnDB
         * @for doccirrus.jsonrpc.api.flowimportexport
         * @type {Function}
         */
        { namespace: 'flowimportexport', method: 'listSetOnDB' },
        /**
         * @property exportSet
         * @for doccirrus.jsonrpc.api.flowimportexport
         * @type {Function}
         */
        { namespace: 'flowimportexport', method: 'exportSet' },
        /**
         * @property importSet
         * @for doccirrus.jsonrpc.api.flowimportexport
         * @type {Function}
         */
        { namespace: 'flowimportexport', method: 'importSet' },
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.flowimportexport
         * @type {Function}
         */
        { namespace: 'flowimportexport', method: 'clearByMetadata' },

        /**
         * @property catalogusageimportexport
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.catalogusageimportexport}
         */
        /**
         * @property listSetOnDisk
         * @for doccirrus.jsonrpc.api.catalogusageimportexport
         * @type {Function}
         */
        {namespace: 'catalogusageimportexport', method: 'listSetOnDisk'},
        /**
         * @property uploadbackup
         * @for doccirrus.jsonrpc.api.catalogusageimportexport
         * @type {Function}
         */
        {namespace: 'catalogusageimportexport', method: 'uploadbackup'},
        /**
         * @property listSetOnDB
         * @for doccirrus.jsonrpc.api.catalogusageimportexport
         * @type {Function}
         */
        {namespace: 'catalogusageimportexport', method: 'listSetOnDB'},
        /**
         * @property exportSet
         * @for doccirrus.jsonrpc.api.catalogusageimportexport
         * @type {Function}
         */
        {namespace: 'catalogusageimportexport', method: 'exportSet'},
        /**
         * @property importSet
         * @for doccirrus.jsonrpc.api.catalogusageimportexport
         * @type {Function}
         */
        {namespace: 'catalogusageimportexport', method: 'importSet'},
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.catalogusageimportexport
         * @type {Function}
         */
        {namespace: 'catalogusageimportexport', method: 'clearByMetadata'},

        /**
         * @property insight2importexport
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.insight2importexport}
         */
        /**
         * @property listSetOnDisk
         * @for doccirrus.jsonrpc.api.insight2importexport
         * @type {Function}
         */
        { namespace: 'insight2importexport', method: 'listSetOnDisk' },
        /**
         * @property listSetOnDB
         * @for doccirrus.jsonrpc.api.insight2importexport
         * @type {Function}
         */
        { namespace: 'insight2importexport', method: 'listSetOnDB' },
        /**
         * @property exportSet
         * @for doccirrus.jsonrpc.api.insight2importexport
         * @type {Function}
         */
        { namespace: 'insight2importexport', method: 'exportSet' },
        /**
         * @property importSet
         * @for doccirrus.jsonrpc.api.insight2importexport
         * @type {Function}
         */
        { namespace: 'insight2importexport', method: 'importSet' },
        /**
         * @property tag
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.tag}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'read' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'create' },
        /**
         * @property getMedLabData
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'getMedLabData' },
        /**
         * @property updateSubTypeTag
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'updateSubTypeTag' },
        /**
         * @property updateDocumentTag
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'updateDocumentTag' },
        /**
         * @property updateCatalogTag
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        {namespace: 'tag', method: 'updateCatalogTag'},
        /**
         * @property updateOnlyTag
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'updateOnlyTag' },
        /**
         * @property updateMedData
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'updateMedData' },
        /**
         * @property updateLabDataTag
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'updateLabDataTag' },
        /**
         * @property deleteSubTypeTag
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'deleteSubTypeTag' },
        /**
         * @property deleteDocumentTag
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'deleteDocumentTag' },
        /**
         * @property deleteCatalogTag
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        {namespace: 'tag', method: 'deleteCatalogTag'},
        /**
         * @property deleteLabDataTag
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        {namespace: 'tag', method: 'deleteLabDataTag'},
        /**
         * @property deleteOnlyTag
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'deleteOnlyTag' },
        /**
         * @property generateTagDeleteText
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'generateTagDeleteText' },
        /**
         * @property getDistinctLabDataTags
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'getDistinctLabDataTags' },
        /**
         * @property getDistinctMedDataTags
         * @for doccirrus.jsonrpc.api.tag
         * @type {Function}
         */
        { namespace: 'tag', method: 'getDistinctMedDataTags' },
        /**
         * @property shortcut
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.shortcut}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.shortcut
         * @type {Function}
         */
        { namespace: 'shortcut', method: 'read' },
        /**
         * @property saveShortcuts
         * @for doccirrus.jsonrpc.api.shortcut
         * @type {Function}
         */
        { namespace: 'shortcut', method: 'saveShortcuts' },

        /**
         * @property labtest
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.labtest}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.labtest
         * @type {Function}
         */
        { namespace: 'labtest', method: 'read' },
        /**
         * @property addUserPassword
         * @for doccirrus.jsonrpc.api.smb
         * @type {Function}
         */
        { namespace: 'smb', method: 'addUserPassword' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.gdtexportlog
         * @type {Function}
         */
        { namespace: 'gdtexportlog', method: 'read' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.gdtlog
         * @type {Function}
         */
        { namespace: 'gdtlog', method: 'read' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.inpacslog
         * @type {Function}
         */
        { namespace: 'inpacslog', method: 'read' },
        /**
         * @property assignInpacsEntryToActivity
         * @for doccirrus.jsonrpc.api.inpacslog
         * @type {Function}
         */
        { namespace: 'inpacslog', method: 'assignInpacsEntryToActivity' },
        /**
         * @property revertInpacsEntryFromActivity
         * @for doccirrus.jsonrpc.api.inpacslog
         * @type {Function}
         */
        { namespace: 'inpacslog', method: 'revertInpacsEntryFromActivity' },
        /**
         * @property getDataFromOrthanc
         * @for doccirrus.jsonrpc.api.inpacslog
         * @type {Function}
         */
        { namespace: 'inpacslog', method: 'getDataFromOrthanc' },
        /**
         * @property checkAndFixPatientNoInOrthanc
         * @for doccirrus.jsonrpc.api.inpacslog
         * @type {Function}
         */
        { namespace: 'inpacslog', method: 'checkAndFixPatientNoInOrthanc' },
        /**
         * @property getPatientsInstanceCount
         * @for doccirrus.jsonrpc.api.inpacslog
         * @type {Function}
         */
        { namespace: 'inpacslog', method: 'getPatientsInstanceCount' },
        /**
         * @property checkAndAssignOrthancStudyIdToActivities
         * @for doccirrus.jsonrpc.api.inpacslog
         * @type {Function}
         */
        { namespace: 'inpacslog', method: 'checkAndAssignOrthancStudyIdToActivities' },
        /**
         * @property cleanEmptyRecordsFromOrthanc
         * @for doccirrus.jsonrpc.api.inpacslog
         * @type {Function}
         */
        { namespace: 'inpacslog', method: 'cleanEmptyRecordsFromOrthanc' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.inpacsmodality
         * @type {Function}
         */
        { namespace: 'inpacsmodality', method: 'read' },
        /**
         * @property testModalityConnection
         * @for doccirrus.jsonrpc.api.inpacsmodality
         * @type {Function}
         */
        { namespace: 'inpacsmodality', method: 'testModalityConnection', access: 'ADMIN' },
        /**
         * @property saveModalityConfig
         * @for doccirrus.jsonrpc.api.inpacsmodality
         * @type {Function}
         */
        { namespace: 'inpacsmodality', method: 'saveModalityConfig', access: 'ADMIN' },
        /**
         * @property parseCsvFileForDicomTagValues
         * @for doccirrus.jsonrpc.api.inpacsconfiguration
         * @type {Function}
         */
        { namespace: 'inpacsconfiguration', method: 'parseCsvFileForDicomTagValues' },
        /**
         * @property getLogFile
         * @for doccirrus.jsonrpc.api.inpacsconfiguration
         * @type {Function}
         */
        { namespace: 'inpacsconfiguration', method: 'getLogFile' },
        /**
         * @property changeLastLogLine
         * @for doccirrus.jsonrpc.api.inpacsconfiguration
         * @type {Function}
         */
        { namespace: 'inpacsconfiguration', method: 'changeLastLogLine', access: 'ADMIN' },
        /**
         * @property saveWorkList
         * @for doccirrus.jsonrpc.api.inpacsconfiguration
         * @type {Function}
         */
        { namespace: 'inpacsconfiguration', method: 'saveWorkList', access: 'ADMIN' },
        /**
         * @property restartOrthanc
         * @for doccirrus.jsonrpc.api.restartOrthanc
         * @type {Function}
         */
        { namespace: 'inpacsconfiguration', method: 'restartOrthanc', access: 'ADMIN' },
        /**
         * @property setLogLevelAndRestart
         * @for doccirrus.jsonrpc.api.setLogLevelAndRestart
         * @type {Function}
         */
        { namespace: 'inpacsconfiguration', method: 'setLogLevelAndRestart', access: 'ADMIN' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.inpacsworklist
         * @type {Function}
         */
        { namespace: 'inpacsworklist', method: 'create', access: 'ADMIN' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.inpacsworklist
         * @type {Function}
         */
        { namespace: 'inpacsworklist', method: 'update', access: 'ADMIN' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.inpacsworklist
         * @type {Function}
         */
        { namespace: 'inpacsworklist', method: 'read' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.inpacsconfiguration
         * @type {Function}
         */
        { namespace: 'inpacsconfiguration', method: 'read' },
        /**
         * @property getMappedData
         * @for doccirrus.jsonrpc.api.inpacsconfiguration
         * @type {Function}
         */
        { namespace: 'inpacsconfiguration', method: 'getMappedData' },
        /**
         * @property createWorkListTxt
         * @for doccirrus.jsonrpc.api.inpacsconfiguration
         * @type {Function}
         */
        { namespace: 'inpacsconfiguration', method: 'createWorkListTxt' },
        /**
         * @property setMocking
         * @for doccirrus.jsonrpc.api.inpacsconfiguration
         * @type {Function}
         */
        { namespace: 'inpacsconfiguration', method: 'setMocking', access: 'ADMIN' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.inpacsdicomtags
         * @type {Function}
         */
        { namespace: 'inpacsdicomtags', method: 'read' },
        /**
         * @property inpacsluascript
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.inpacsluascript}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.inpacsluascript
         * @type {Function}
         */
        { namespace: 'inpacsluascript', method: 'read' },
        /**
         * @property createOrUpdateLuaScripts
         * @for doccirrus.jsonrpc.api.inpacsluascript
         * @type {Function}
         */
        { namespace: 'inpacsluascript', method: 'createOrUpdateLuaScripts', access: 'ADMIN' },
        /**
         * @property mirrorcalendar
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.mirrorcalendar}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.mirrorcalendar
         * @type {Function}
         */
        { namespace: 'mirrorcalendar', method: 'read' },
        /**
         * @property updateCalendars
         * @for doccirrus.jsonrpc.api.mirrorcalendar
         * @type {Function}
         */
        { namespace: 'mirrorcalendar', method: 'updateCalendars' },
        /**
         * @property mirrorscheduletype
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.mirrorscheduletype}
         */
        /**
         * @property getScheduleTypesForCalendar
         * @for doccirrus.jsonrpc.api.mirrorscheduletype
         * @type {Function}
         */
        { namespace: 'mirrorscheduletype', method: 'getScheduleTypesForCalendar' },
        /**
         * @property omimchain
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.omimchain}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.omimchain
         * @type {Function}
         */
        { namespace: 'omimchain', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.omimchain
         * @type {Function}
         */
        { namespace: 'omimchain', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.omimchain
         * @type {Function}
         */
        { namespace: 'omimchain', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.omimchain
         * @type {Function}
         */
        { namespace: 'omimchain', method: 'delete' },
        /**
         * @property getOmimChains
         * @for doccirrus.jsonrpc.api.omimchain
         * @type {Function}
         */
        { namespace: 'omimchain', method: 'getOmimChains' },
        /**
         * @property catalogtext
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.catalogtext}
         */
        /**
         * @property write
         * @for doccirrus.jsonrpc.api.catalogtext
         * @type {Function}
         */
        { namespace: 'catalogtext', method: 'create' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.catalogtext
         * @type {Function}
         */
        { namespace: 'catalogtext', method: 'update' },
        /**
         * @property kbvutilityprice
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.kbvutilityprice}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.kbvutilityprice
         * @type {Function}
         */
        { namespace: 'kbvutilityprice', method: 'create' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.kbvutilityprice
         * @type {Function}
         */
        { namespace: 'kbvutilityprice', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.kbvutilityprice
         * @type {Function}
         */
        { namespace: 'kbvutilityprice', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.kbvutilityprice
         * @type {Function}
         */
        { namespace: 'kbvutilityprice', method: 'delete' },
        /**
         * @property getPrices
         * @for doccirrus.jsonrpc.api.kbvutilityprice
         * @type {Function}
         */
        { namespace: 'kbvutilityprice', method: 'getPrices' },
        /**
         * @property confirmPriceChange
         * @for doccirrus.jsonrpc.api.kbvutilityprice
         * @type {Function}
         */
        { namespace: 'kbvutilityprice', method: 'confirmPriceChange' },
        /**
         * @property getLogFile
         * @for doccirrus.jsonrpc.api.settings
         * @type {Function}
         */
        { namespace: 'settings', method: 'getLogFile' },
        /**
         * @property getPatientPortalUrl
         * @for doccirrus.jsonrpc.api.settings
         * @type {Function}
         */
        { namespace: 'settings', method: 'getPatientPortalUrl' },
        /**
         * @property countOpenTabs
         * @for doccirrus.jsonrpc.api.settings
         * @type {Function}
         */
        { namespace: 'settings', method: 'countOpenTabs' },
        /**
         * @property getTerminal
         * @for doccirrus.jsonrpc.api.xterminal
         * @type {Function}
         */
        { namespace: 'xterminal', method: 'getTerminal', access: 'SUPPORT' },
        /**
         * @property transfer
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.transfer}
         */
        /**
         * @property doTransfer
         * @for doccirrus.jsonrpc.api.transfer
         * @type {Function}
         */
        { namespace: 'transfer', method: 'doTransfer' },
        /**
         * @property conference
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.conference}
         */
        /**
         * @property createOnlineConference
         * @for doccirrus.jsonrpc.api.conference
         * @type {Function}
         */
        { namespace: 'conference', method: 'createOnlineConference' },
        /**
         * @property updateOnlineConference
         * @for doccirrus.jsonrpc.api.conference
         * @type {Function}
         */
        { namespace: 'conference', method: 'updateOnlineConference' },
        /**
         * @property getConferenceData
         * @for doccirrus.jsonrpc.api.conference
         * @type {Function}
         */
        { namespace: 'conference', method: 'getConferenceData' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.conference
         * @type {Function}
         */
        { namespace: 'conference', method: 'delete' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.conference
         * @type {Function}
         */
        { namespace: 'conference', method: 'read' },
        /**
         * @property storeProfile
         * @for doccirrus.jsonrpc.api.profile
         * @type {Function}
         */
        { namespace: 'profile', method: 'storeProfile' },
        /**
        * @property read
        * @for doccirrus.jsonrpc.api.profile
        * @type {Function}
        */
        { namespace: 'profile', method: 'read' },
        /**
         * @property updateDefaultPrinter
         * @for doccirrus.jsonrpc.api.profile
         * @type {Function}
         */
        { namespace: 'profile', method: 'updateDefaultPrinter' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.profile
         * @type {Function}
         */
        { namespace: 'profile', method: 'delete' },
        /**
         * @property reStoreProfile
         * @for doccirrus.jsonrpc.api.profile
         * @type {Function}
         */
        { namespace: 'profile', method: 'reStoreProfile' },
        /**
         * @property getDefaultProfile
         * @for doccirrus.jsonrpc.api.profile
         * @type {Function}
         */
        { namespace: 'profile', method: 'getDefaultProfile' },
        /**
         * @property setDefaultProfile
         * @for doccirrus.jsonrpc.api.profile
         * @type {Function}
         */
        { namespace: 'profile', method: 'setDefaultProfile' },

        /**
         * @property listSetOnDB
         * @for doccirrus.jsonrpc.api.profileimportexport
         * @type {Function}
         */
        { namespace: 'profileimportexport', method: 'listSetOnDB' },
        /**
         * @property listSetOnDisk
         * @for doccirrus.jsonrpc.api.profileimportexport
         * @type {Function}
         */
        { namespace: 'profileimportexport', method: 'listSetOnDisk' },
        /**
         * @property exportSet
         * @for doccirrus.jsonrpc.api.profileimportexport
         * @type {Function}
         */
        { namespace: 'profileimportexport', method: 'exportSet' },
        /**
         * @property importSet
         * @for doccirrus.jsonrpc.api.profileimportexport
         * @type {Function}
         */
        {namespace: 'profileimportexport', method: 'importSet'},
        /**
         * @property clearByMetadata
         * @for doccirrus.jsonrpc.api.profileimportexport
         * @type {Function}
         */
        {namespace: 'profileimportexport', method: 'clearByMetadata'},
        /**
         * @property apptoken
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.apptoken}
         */
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.apptoken
         * @type {Function}
         */
        { namespace: 'apptoken', method: 'create' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.apptoken
         * @type {Function}
         */
        { namespace: 'apptoken', method: 'update' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.apptoken
         * @type {Function}
         */
        { namespace: 'apptoken', method: 'read' },
        /**
         * @property getAppTokens
         * @for doccirrus.jsonrpc.api.apptoken
         * @type {Function}
         */
        { namespace: 'apptoken', method: 'getAppTokens' },
        /**
         * @property getPopulatedAppTokens
         * @for doccirrus.jsonrpc.api.apptoken
         * @type {Function}
         */
        { namespace: 'apptoken', method: 'getPopulatedAppTokens' },
        /**
         * @property getPopulatedAppTokensByCompany
         * @for doccirrus.jsonrpc.api.apptoken
         * @type {Function}
         */
        { namespace: 'apptoken', method: 'getPopulatedAppTokensByCompany' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.apptoken
         * @type {Function}
         */
        { namespace: 'apptoken', method: 'delete' },
        /**
         * @property crlog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.crlog}
         */
        /**
         * @property getHistory
         * @for doccirrus.jsonrpc.api.crlog
         * @type {Function}
         */
        { namespace: 'crlog', method: 'getHistory' },
        /**
         * @property applyAction
         * @for doccirrus.jsonrpc.api.crlog
         * @type {Function}
         */
        { namespace: 'crlog', method: 'applyAction' },
        /**
         * @property cardreaderconfiguration
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.cardreader}
         */
        /**
         * @property getCardreaderConfiguration
         * @for doccirrus.jsonrpc.api.cardreader
         * @type {Function}
         */
        { namespace: 'cardreaderconfiguration', method: 'getCardreaderConfiguration' },
        /**
         * @property postAndReturn
         * @for doccirrus.jsonrpc.api.cardreader
         * @type {Function}
         */
        { namespace: 'cardreaderconfiguration', method: 'postAndReturn', access: 'ADMIN' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.cardreader
         * @type {Function}
         */
        { namespace: 'cardreaderconfiguration', method: 'update', access: 'ADMIN' },
        /**
         * @property deleteConfigurations
         * @for doccirrus.jsonrpc.api.cardreader
         * @type {Function}
         */
        { namespace: 'cardreaderconfiguration', method: 'deleteConfigurations', access: 'ADMIN' },
        /**
         * @property getOnlineCardreaders
         * @for doccirrus.jsonrpc.api.cardreader
         * @type {Function}
         */
        //{ namespace: 'cardreaderconfiguration', method: 'getOnlineCardreaders' },
        /**
         * @property getRegisteredCardreaders
         * @for doccirrus.jsonrpc.api.cardreader
         * @type {Function}
         */
        { namespace: 'cardreaderconfiguration', method: 'getRegisteredCardreaders' },
        /**
         * @property dscrmanager
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.dscrmanager}
         */
        /**
         * @property listPlatformDrivers
         * @for doccirrus.jsonrpc.api.dscrmanager
         * @type {Function}
         */
        /**
         * @property testPortAvailability
         * @for doccirrus.jsonrpc.api.dscrmanager
         * @type {Function}
         */
        { namespace: 'dscrmanager', method: 'testPortAvailability' },
        /**
         * @property scanPorts
         * @for doccirrus.jsonrpc.api.dscrmanager
         * @type {Function}
         */
        { namespace: 'dscrmanager', method: 'scanPorts' },
        /**
         * @property getOnlineCardreadersList
         * @for doccirrus.jsonrpc.api.dscrmanager
         * @type {Function}
         */
        { namespace: 'dscrmanager', method: 'getOnlineCardreadersList' },
        /**
         * @property readCard
         * @for doccirrus.jsonrpc.api.dscrmanager
         * @type {Function}
         */
        { namespace: 'dscrmanager', method: 'readCard' },
        /**
         * @property readCardBatch
         * @for doccirrus.jsonrpc.api.dscrmanager
         * @type {Function}
         */
        { namespace: 'dscrmanager', method: 'readCardBatch' },
        /**
         * @property listPlatformDrivers
         * @for doccirrus.jsonrpc.api.dscrmanager
         * @type {Function}
         */
        { namespace: 'dscrmanager', method: 'listPlatformDrivers' },
        /**
         * @property getSmartCardReaderList
         * @for  doccirrus.api.dscrmanager.getSmartCardReaderList
         * @type {Function}
         */
        { namespace: 'dscrmanager', method: 'getSmartCardReaderList' },
        /** @class  Y.doccirrus.api.dscrmanager */
        /**
         * @property readSmartCard
         * @for  doccirrus.api.dscrmanager.readSmartCard
         * @type {Function}
         */
        { namespace: 'dscrmanager', method: 'readSmartCard' },
        /**
         * @property getSolDocumentation
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'getSolDocumentation' },
        /**
         * @property getPopulated
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'getPopulated' },
        /**
         * @property populateAppAccessManagerTable
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'populateAppAccessManagerTable' },
        /**
         * @property populateVersionUpdateTable
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'populateVersionUpdateTable' },
        /**
         * @property updateAppVersion
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'updateAppVersion' },
        /**
         * @property updateAllAppVersions
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'updateAllAppVersions' },
        /**
         * @property getOutdatedAppsCount
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'getOutdatedAppsCount' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'read' },
        /**
         * @property registerRouteOverride
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'registerRouteOverride', access: 'SUPERUSER' },
        /**
         * @property registerUIMenu
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'registerUIMenu' },
        /**
         * @property unRegisterUIMenu
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'unRegisterUIMenu' },
        /**
         * @property callApp
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'callApp' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'update', access: 'ADMIN' },
        /**
         * @property uploadRPM
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'uploadRPM' },
        /**
         * @property giveAccess
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'giveAccess', access: 'ADMIN' },
        /**
         * @property denyAccess
         * @for doccirrus.jsonrpc.api.appreg
         * @type {Function}
         */
        { namespace: 'appreg', method: 'denyAccess', access: 'ADMIN' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.labdevice
         * @type {Function}
         */
        { namespace: 'labdevice', method: 'create' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.labdevice
         * @type {Function}
         */
        { namespace: 'labdevice', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.labdevice
         * @type {Function}
         */
        { namespace: 'labdevice', method: 'delete' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.labdevice
         * @type {Function}
         */
        { namespace: 'labdevice', method: 'read' },
        /**
         * @property create
         * @for doccirrus.jsonrpc.api.labdevicetest
         * @type {Function}
         */
        { namespace: 'labdevicetest', method: 'create' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.labdevicetest
         * @type {Function}
         */
        { namespace: 'labdevicetest', method: 'update' },
        /**
         * @property delete
         * @for doccirrus.jsonrpc.api.labdevicetest
         * @type {Function}
         */
        { namespace: 'labdevicetest', method: 'delete' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.labdevicetest
         * @type {Function}
         */
        { namespace: 'labdevicetest', method: 'read' },
        /**
         * @property timanager
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.timanager}
         */
        /**
         * @property getCardTerminals
         * @for doccirrus.jsonrpc.api.getCardTerminals
         * @type {Function}
         */
        { namespace: 'timanager', method: 'getCardTerminals' },
        /**
         * @property getCardsForQes
         * @for doccirrus.jsonrpc.api.getCards
         * @type {Function}
         */
        { namespace: 'timanager', method: 'getCardsForQes' },
        /**
         * @property getCards
         * @for doccirrus.jsonrpc.api.getCards
         * @type {Function}
         */
        { namespace: 'timanager', method: 'getCards' },
        /**
         * @property readCard
         * @for doccirrus.jsonrpc.api.readCard
         * @type {Function}
         */
        { namespace: 'timanager', method: 'readCard' },
        /**
         * @property changePin
         * @for doccirrus.jsonrpc.api.changePin
         * @type {Function}
         */
        { namespace: 'timanager', method: 'changePin' },
        /**
         * @property getPinStatus
         * @for doccirrus.jsonrpc.api.getPinStatus
         * @type {Function}
         */
        { namespace: 'timanager', method: 'getPinStatus' },
        /**
         * @property unblockPin
         * @for doccirrus.jsonrpc.api.unblockPin
         * @type {Function}
         */
        { namespace: 'timanager', method: 'unblockPin' },
        /**
         * @property verifyPin
         * @for doccirrus.jsonrpc.api.verifyPin
         * @type {Function}
         */
        { namespace: 'timanager', method: 'verifyPin' },
        /**
         * @property getTiInfo
         * @for doccirrus.jsonrpc.api.getTiInfo
         * @type {Function}
         */
        { namespace: 'timanager', method: 'getTiInfo' },
        /**
         * @property getCachedTiStatusInfo
         * @for doccirrus.jsonrpc.api.getCachedTiStatusInfo
         * @type {Function}
         */
        { namespace: 'timanager', method: 'getCachedTiStatusInfo' },
        /**
         * @property cacheTiStatusInfo
         * @for doccirrus.jsonrpc.api.cacheTiStatusInfo
         * @type {Function}
         */
        { namespace: 'timanager', method: 'cacheTiStatusInfo' },
        /**
         * @property getConnectorFQDN
         * @for doccirrus.jsonrpc.api.getConnectorFQDN
         * @type {Function}
         */
        { namespace: 'timanager', method: 'getConnectorFQDN' },
        /**
         * @property updateConnectorFQDN
         * @for doccirrus.jsonrpc.api.updateConnectorFQDN
         * @type {Function}
         */
        { namespace: 'timanager', method: 'updateConnectorFQDN' },
        /**
         * @property getModeOnlineCheckOptions
         * @for doccirrus.jsonrpc.api.getModeOnlineCheckOptions
         * @type {Function}
         */
        { namespace: 'timanager', method: 'getModeOnlineCheckOptions' },
        /**
         * @property pinOperation
         * @for doccirrus.jsonrpc.api.pinOperation
         * @type {Function}
         */
        { namespace: 'timanager', method: 'pinOperation' },
        /**
         * @property organisationalunit
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.organisationalunit}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.organisationalunit
         * @type {Function}
         */
        { namespace: 'organisationalunit', method: 'read' },
        /**
         * @property updateCollection
         * @for doccirrus.jsonrpc.api.organisationalunit
         * @type {Function}
         */
        { namespace: 'organisationalunit', method: 'updateCollection', access: 'ADMIN' },
        /**
         * @property tismcb
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.tismcb}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.tismcb
         * @type {Function}
         */
        { namespace: 'tismcb', method: 'read' },
        /**
         * @property updateCollection
         * @for doccirrus.jsonrpc.api.tismcb
         * @type {Function}
         */
        { namespace: 'tismcb', method: 'updateCollection', access: 'ADMIN' },
        /**
         * @property ticardreader
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.ticardreader}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.ticardreader
         * @type {Function}
         */
        { namespace: 'ticardreader', method: 'read' },
        /**
         * @property updateCollection
         * @for doccirrus.jsonrpc.api.ticardreader
         * @type {Function}
         */
        { namespace: 'ticardreader', method: 'updateCollection', access: 'ADMIN' },
        /**
         * @property workstation
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.workstation}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.workstation
         * @type {Function}
         */
        { namespace: 'workstation', method: 'read' },
        /**
         * @property updateCollection
         * @for doccirrus.jsonrpc.api.workstation
         * @type {Function}
         */
        { namespace: 'workstation', method: 'updateCollection', access: 'ADMIN' },
        /**
         * @property getWithTiCardReaders
         * @for doccirrus.jsonrpc.api.workstation
         * @type {Function}
         */
        { namespace: 'workstation', method: 'getWithTiCardReaders' },
        /**
         * @property ticontext
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.ticontext}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.ticontext
         * @type {Function}
         */
        { namespace: 'ticontext', method: 'getList' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.ticontext
         * @type {Function}
         */
        { namespace: 'ticontext', method: 'getConfigurationParameters' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.ticontext
         * @type {Function}
         */
        { namespace: 'ticontext', method: 'tiForPatientBrowser' },
        /**
         * @property reloadSMCBs
         * @for doccirrus.jsonrpc.api.ticontext
         * @type {Function}
         */
        { namespace: 'ticontext', method: 'reloadSMCBs' },
        /**
         * @property tisettings
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.tisettings}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.tisettings
         * @type {Function}
         */
        { namespace: 'tisettings', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.tisettings
         * @type {Function}
         */
        { namespace: 'tisettings', method: 'update', access: 'ADMIN' },
        /**
         * @property opscode
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.opscode}
         */
        /**
         * @property searchByCodeOrName
         * @for doccirrus.jsonrpc.api.opscode
         * @type {Function}
         */
        { namespace: 'opscode', method: 'searchByCodeOrName' },
        /**
         * @property linkedactivities
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.linkedactivities}
         */
        /**
         * @property confirmInvalidatedParents
         * @for doccirrus.jsonrpc.api.linkedactivities
         * @type {Function}
         */
        { namespace: 'linkedactivities', method: 'confirmInvalidatedParents' },
        /**
         * @property insurancegroup
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.insurancegroup}
         */
        /**
         * @property search
         * @for doccirrus.jsonrpc.api.insurancegroup
         * @type {Function}
         */
        { namespace: 'insurancegroup', method: 'search' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.insurancegroup
         * @type {Function}
         */
        { namespace: 'insurancegroup', method: 'read' },
        /**
         * @property save
         * @for doccirrus.jsonrpc.api.insurancegroup
         * @type {Function}
         */
        { namespace: 'insurancegroup', method: 'save' },
        /**
         * @property save
         * @for doccirrus.jsonrpc.api.insurancegroup
         * @type {Function}
         */
        { namespace: 'insurancegroup', method: 'delete' },
        /**
         * @property supportrequest
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.supportrequest}
         */
        /**
         * @property getRequestsForTable
         * @for doccirrus.jsonrpc.api.supportrequest
         * @type {Function}
         */
        { namespace: 'supportrequest', method: 'getRequestsForTable' },
        /**
         * @property acceptRequest
         * @for doccirrus.jsonrpc.api.supportrequest
         * @type {Function}
         */
        { namespace: 'supportrequest', method: 'acceptRequest' },
        /**
         * @property instockrequest
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.instockrequest}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.instock
         * @type {Function}
         */
        { namespace: 'instock', method: 'read' },
        /**
         * @property update
         * @for doccirrus.jsonrpc.api.instock
         * @type {Function}
         */
        { namespace: 'instock', method: 'update' },
        /**
         * @property insertWares
         * @for doccirrus.jsonrpc.api.instockrequest
         * @type {Function}
         */
        { namespace: 'instockrequest', method: 'insertWares' },
        /**
         * @property getWares
         * @for doccirrus.jsonrpc.api.instockrequest
         * @type {Function}
         */
        { namespace: 'instockrequest', method: 'getWares' },
        /**
         * @property getWaresFromCatalog
         * @for doccirrus.jsonrpc.api.instockrequest
         * @type {Function}
         */
        { namespace: 'instockrequest', method: 'getWaresFromCatalog' },
        /**
         * @property updateWares
         * @for doccirrus.jsonrpc.api.instockrequest
         * @type {Function}
         */
        { namespace: 'instockrequest', method: 'updateWares' },
        /**
         * @property stockordersrequest
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.stockordersrequest}
         */
        /**
         * @property saveOrder
         * @for doccirrus.jsonrpc.api.stockordersrequest
         * @type {Function}
         */
        { namespace: 'stockordersrequest', method: 'saveOrder' },
        /**
         * @property createEmptyOrder
         * @for doccirrus.jsonrpc.api.stockordersrequest
         * @type {Function}
         */
        { namespace: 'stockordersrequest', method: 'createEmptyOrder' },
        /**
         * @property getOrders
         * @for doccirrus.jsonrpc.api.stockordersrequest
         * @type {Function}
         */
        { namespace: 'stockordersrequest', method: 'getOrders' },
        /**
         * @property updateOrder
         * @for doccirrus.jsonrpc.api.stockordersrequest
         * @type {Function}
         */
        { namespace: 'stockordersrequest', method: 'updateOrder' },
        /**
         * @property removeOrder
         * @for doccirrus.jsonrpc.api.stockordersrequest
         * @type {Function}
         */
        { namespace: 'stockordersrequest', method: 'removeOrder' },
        /**
         * @property setStatus
         * @for doccirrus.jsonrpc.api.stockordersrequest
         * @type {Function}
         */
        { namespace: 'stockordersrequest', method: 'setStatus' },
        /**
         * @property sendOrder
         * @for doccirrus.jsonrpc.api.stockordersrequest
         * @type {Function}
         */
        { namespace: 'stockordersrequest', method: 'sendOrder' },
        /**
         * @property arriveOrder
         * @for doccirrus.jsonrpc.api.stockordersrequest
         * @type {Function}
         */
        { namespace: 'stockordersrequest', method: 'arriveOrder' },
        /**
         * @property saveAsNew
         * @for doccirrus.jsonrpc.api.stockordersrequest
         * @type {Function}
         */
        { namespace: 'stockordersrequest', method: 'saveAsNew' },
        /**
         * @property updateItemInOrderOrCreateNew
         * @for doccirrus.jsonrpc.api.stockordersrequest
         * @type {Function}
         */
        { namespace: 'stockordersrequest', method: 'updateItemInOrderOrCreateNew' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.stockorders
         * @type {Function}
         */
        { namespace: 'stockorders', method: 'read' },
        /**
         * @property getVatList
         * @for doccirrus.jsonrpc.api.instockrequest
         * @type {Function}
         */
        { namespace: 'instockrequest', method: 'getVatList' },
        /**
         * @property getDeliveries
         * @for doccirrus.jsonrpc.api.stockdelivery
         * @type {Function}
         */
        { namespace: 'stockdelivery', method: 'getDeliveries' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.stockdelivery
         * @type {Function}
         */
        { namespace: 'stockdelivery', method: 'read' },
        /**
         * @property createDeliveryFromOrder
         * @for doccirrus.jsonrpc.api.stockdelivery
         * @type {Function}
         */
        { namespace: 'stockdelivery', method: 'createDeliveryFromOrder' },
        /**
         * @property approveOrderItems
         * @for doccirrus.jsonrpc.api.stockdelivery
         * @type {Function}
         */
        { namespace: 'stockdelivery', method: 'approveOrderItems' },
        /**
         * @property archiveOrder
         * @for doccirrus.jsonrpc.api.stockdelivery
         * @type {Function}
         */
        { namespace: 'stockdelivery', method: 'archiveOrder' },
        /**
         * @property addDeliveryItems
         * @for doccirrus.jsonrpc.api.stockdelivery
         * @type {Function}
         */
        { namespace: 'stockdelivery', method: 'addDeliveryItems' },
        /**
         * @property getAll
         * @for doccirrus.jsonrpc.api.partneridcatalog
         * @type {Function}
         */
        { namespace: 'partneridcatalog', method: 'getAll' },
        /**
         * @property quickCreate
         * @for doccirrus.jsonrpc.api.receipt
         * @type {Function}
         */
        { namespace: 'receipt', method: 'quickCreate' },
        /**
         * @property assignToInvoice
         * @for doccirrus.jsonrpc.api.receipt
         * @type {Function}
         */
        { namespace: 'receipt', method: 'assignToInvoice' },
        /**
         * @property claimForInvoice
         * @for doccirrus.jsonrpc.api.receipt
         * @type {Function}
         */
        { namespace: 'receipt', method: 'claimForInvoice' },
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.receivedispatch
         * @type {Function}
         */
        { namespace: 'receivedispatch', method: 'read' },
        /**
         * @property doAction
         * @for doccirrus.jsonrpc.api.receivedispatch
         * @type {Function}
         */
        { namespace: 'receivedispatch', method: 'doAction' },
        /**
         * @property shiftpatients
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.shiftpatients}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.shiftpatients
         * @type {Function}
         */
        { namespace: 'shiftpatients', method: 'read' },
        /**
         * @property shift
         * @for doccirrus.jsonrpc.api.shiftpatients
         * @type {Function}
         */
        { namespace: 'shiftpatients', method: 'shift' },
        /**
         * @property generateJsDocForSchemas
         * @for doccirrus.jsonrpc.api.jsdoc
         * @type {Function}
         */
        { namespace: 'jsdoc', method: 'generateJsDocForSchemas' },
        /**
         * @property save
         * @for doccirrus.jsonrpc.api.incash
         * @type {Function}
         */
        { namespace: 'incash', method: 'save' },
        /**
         * @property getReceiptsBook
         * @for doccirrus.jsonrpc.api.incash
         * @type {Function}
         */
        { namespace: 'incash', method: 'getReceiptsBook' },
        /**
         * @property cancel
         * @for doccirrus.jsonrpc.api.incash
         * @type {Function}
         */
        { namespace: 'incash', method: 'cancel' },
        /**
         * @property changelog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.changelog}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.changelog
         * @type {Function}
         */
        { namespace: 'changelog', method: 'read' },
        /**
         * @property getChangeLogList
         * @for doccirrus.jsonrpc.api.changelog
         * @type {Function}
         */
        { namespace: 'changelog', method: 'getChangeLogList' },
        /**
         * @property getChangeLog
         * @for doccirrus.jsonrpc.api.changelog
         * @type {Function}
         */
        { namespace: 'changelog', method: 'getChangeLog' },
        /**
         * @property warning
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.warning}
         */
        /**
         * @property generateSumexDocuments
         * @for doccirrus.jsonrpc.api.warning
         * @type {Function}
         */
        { namespace: 'warning', method: 'generateSumexDocuments' },
        /**
         * @property errors
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.errors}
         */
        /**
         * @property log
         * @for doccirrus.jsonrpc.api.warning
         * @type {Function}
         */
        { namespace: 'errors', method: 'log' },
        /**
         * @property patientemails
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.patientemails}
         */
        /**
         * @property getSavedEmails
         * @for doccirrus.jsonrpc.api.patientemails
         * @type {Function}
         */
        { namespace: 'patientemails', method: 'getSavedEmails' },
        /**
         * @property kbvutility2
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.kbvutility2}
         */
        /**
         * @property searchDiagnoses
         * @for doccirrus.jsonrpc.api.kbvutility2
         * @type {Function}
         */
        { namespace: 'kbvutility2', method: 'searchDiagnoses' },
        /**
         * @property checkAgreement
         * @for doccirrus.jsonrpc.api.kbvutility2
         * @type {Function}
         */
        { namespace: 'kbvutility2', method: 'checkAgreement' },
        /**
         * @property checkBlankRegulation
         * @for doccirrus.jsonrpc.api.kbvutility2
         * @type {Function}
         */
        { namespace: 'kbvutility2', method: 'checkBlankRegulation' },
        /**
         * @property getPrescriptionCase
         * @for doccirrus.jsonrpc.api.kbvutility2
         * @type {Function}
         */
        { namespace: 'kbvutility2', method: 'getPrescriptionCase' },
        /**
         * @property calculatePrescriptionCaseUnits
         * @for doccirrus.jsonrpc.api.kbvutility2
         * @type {Function}
         */
        { namespace: 'kbvutility2', method: 'calculatePrescriptionCaseUnits' },
        /**
         * @property getValidApprovals
         * @for doccirrus.jsonrpc.api.kbvutility2
         * @type {Function}
         */
        { namespace: 'kbvutility2', method: 'getValidApprovals' },
        /**
         * @property stocklocation
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.stocklocation}
         */
        /**
         * @property get
         * @for doccirrus.jsonrpc.api.stocklocation
         * @type {Function}
         */
        { namespace: 'stocklocation', method: 'get' },

        /**
         * @property jira
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.jira}
         */
        /**
         * @property searchJira
         * @for doccirrus.jsonrpc.api.jira
         * @type {Function}
         */
        { namespace: 'jira', method: 'searchJira' },

        /**
         * @property okfe_export
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.okfe_export}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.okfe_export
         * @type {Function}
         */
        { namespace: 'okfe_export', method: 'read' },
        /**
         * @property exportXMLs
         * @for doccirrus.jsonrpc.api.okfe_export
         * @type {Function}
         */
        { namespace: 'okfe_export', method: 'exportXMLs' },
        /**
         * @property getHTML
         * @for doccirrus.jsonrpc.api.okfe_export
         * @type {Function}
         */
        { namespace: 'okfe_export', method: 'getHTML' },
        /**
         * @property getLastExport
         * @for doccirrus.jsonrpc.api.okfe_export
         * @type {Function}
         */
        { namespace: 'okfe_export', method: 'getLastExport' },
        /**
         * @property tiDirectoryService
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.tiDirectoryService}
         */
        /**
         * @property searchTiDirectoryService
         * @for doccirrus.jsonrpc.api.tiDirectoryService
         * @type {Function}
         */
        { namespace: 'tiDirectoryService', method: 'read' },
        /**
         * @property testLdapConnection
         * @for doccirrus.jsonrpc.api.tiDirectoryService
         * @type {Function}
         */
        { namespace: 'tiDirectoryService', method: 'testLdapConnection' },
        /**
         * @property retrieveDataFromVZD
         * @for doccirrus.jsonrpc.api.tiDirectoryService
         * @type {Function}
         */
        { namespace: 'tiDirectoryService', method: 'retrieveDataFromVZD' },
        /**
         * @property getDirectoryServiceData
         * @for doccirrus.jsonrpc.api.tiDirectoryService
         * @type {Function}
         */
        { namespace: 'tiDirectoryService', method: 'getDirectoryServiceData' },
        /**
         * @property kimaccount
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.kimaccount}
         */
        /**
         * @property getUserNameForKIMUsage
         * @for doccirrus.jsonrpc.api.kimaccount
         * @type {Function}
         */
        { namespace: 'kimaccount', method: 'getUserNameForKIMUsage' },
        /**
         * @property getSender
         * @for doccirrus.jsonrpc.api.kimaccount
         * @type {Function}
         */
        { namespace: 'kimaccount', method: 'getSender' },
        /**
         * @property updateKimAccountConfiguration
         * @for doccirrus.jsonrpc.api.kimaccount
         * @type {Function}
         */
        { namespace: 'kimaccount', method: 'updateKimAccountConfiguration' },
        /**
         * @property getKimAccountConfiguration
         * @for doccirrus.jsonrpc.api.kimaccount
         * @type {Function}
         */
        { namespace: 'kimaccount', method: 'getKimAccountConfiguration' },
        /**
         * @property deleteKimAccount
         * @for doccirrus.jsonrpc.api.kimaccount
         * @type {Function}
         */
        { namespace: 'kimaccount', method: 'deleteKimAccount' },
        /**
         * @property sendEmail
         * @for doccirrus.jsonrpc.api.kimaccount
         * @type {Function}
         */
        { namespace: 'kimaccount', method: 'sendEmail' },
        /**
         * @property getValidKimAccounts
         * @for doccirrus.jsonrpc.api.kimaccount
         * @type {Function}
         */
        { namespace: 'kimaccount', method: 'getValidKimAccounts' },
        /**
         * @property receiveEmails
         * @for doccirrus.jsonrpc.api.kimaccount
         * @type {Function}
         */
        { namespace: 'kimaccount', method: 'receiveEmails' },
        /**
         * @property deleteEmail
         * @for doccirrus.jsonrpc.api.kimaccount
         * @type {Function}
         */
        { namespace: 'kimaccount', method: 'deleteEmail' },
        /**
         * @property tiQES
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.tiQES}
         */
        /**
         * @property signDocuments
         * @for doccirrus.jsonrpc.api.tiQES
         * @type {Function}
         */
        { namespace: 'tiQES', method: 'signDocuments' },
        /**
         * @property verifyDocument
         * @for doccirrus.jsonrpc.api.tiQES
         * @type {Function}
         */
        { namespace: 'tiQES', method: 'verifyDocument' },
        /**
         * @property stopSigningProcess
         * @for doccirrus.jsonrpc.api.tiQES
         * @type {Function}
         */
        { namespace: 'tiQES', method: 'stopSigningProcess' },
        /**
         * @property instockconfiguration
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.instockconfiguration}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.instockonfiguration
         * @type {Function}
         */
        { namespace: 'instockconfiguration', method: 'read' },
        /**
         * @property saveConfig
         * @for doccirrus.jsonrpc.api.instockonfiguration
         * @type {Function}
         */
        { namespace: 'instockconfiguration', method: 'saveConfig' },
        /**
         * @property medidatalog
         * @for doccirrus.jsonrpc.api
         * @type {doccirrus.jsonrpc.api.medidatalog}
         */
        /**
         * @property read
         * @for doccirrus.jsonrpc.api.medidatalog
         * @type {Function}
         */
        { namespace: 'medidatalog', method: 'read' },
        /**
         * @property getDocumentsStatus
         * @for doccirrus.jsonrpc.api.medidatalog
         * @type {Function}
         */
        { namespace: 'medidatalog', method: 'getDocumentsStatus' },
        /**
         * @property obtainDocumentReferences
         * @for doccirrus.jsonrpc.api.medidatalog
         * @type {Function}
         */
        { namespace: 'medidatalog', method: 'obtainDocumentReferences' },
        /**
         * @property downloadDocumentsFromMedidata
         * @for doccirrus.jsonrpc.api.medidatalog
         * @type {Function}
         */
        { namespace: 'medidatalog', method: 'downloadDocumentsFromMedidata' },
        /**
         * @property getLogs
         * @for doccirrus.jsonrpc.api.medidatalog
         * @type {Function}
         */
        { namespace: 'medidatalog', method: 'getLogs' },
        /**
         * @property fetchNotificationsFromMedidata
         * @for doccirrus.jsonrpc.api.medidatalog
         * @type {Function}
         */
        { namespace: 'medidatalog', method: 'fetchNotificationsFromMedidata' },
        /**
         * @property confirmReceipt
         * @for doccirrus.jsonrpc.api.medidatalog
         * @type {Function}
         */
        { namespace: 'medidatalog', method: 'confirmReceipt' }
    ] );
}, '3.16.0', {
    requires: [
        'JsonRpcReflection'
    ]
} );
