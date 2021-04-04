/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'calendar-schema', function( Y, NAME ) {

        'use strict';

        var
            ramlConfig = {
                // REST API v2. parameters
                "2": {
                    description: "Calendars."
                }
            },

            COMPARATOR_ID = '200000000000000000000001',
            DEFCAL_ID = '111111111111111111111111',
            TEMPCAL_ID = '000000000000000000000002',
            CLOSECAL_ID = '000000000000000000000007',
            RESOURCECAL_ID = '000000000000000000000001',
            DEFCAL_NAME = 'Infokalender',
            DEFCAL_COLOR = '#444477',
            DEFCAL_TYPE = 'INFORMAL',
            CAL_ID1 = '515ae9604013671c12c1c900',
            CAL_NAME1 = 'Arztkalender',
            CAL_PUBLIC1 = true,
            CAL_COLOR1 = '#441122',
            CAL_TYPE1 = 'PATIENTS',
            EMPLOYEE_ID_FIRST = '111ae9604013671c12c1c111',
            DEF_CONSULT_TIMES = [
                {
                    days: [1, 2, 3, 4, 5], start: [9, 0], end: [17, 0], privateInsurance: true, publicInsurance: true, scheduleTypes: []
                }
            ],
            DEF_SPECIFIC_CONSULT_TIMES = [
                {
                    days: [1, 2, 3, 4, 5], start: [9, 0], end: [17, 0], privateInsurance: true, publicInsurance: true, range: [], scheduleTypes: []
                }
            ],

            template = [
                {
                    _id: DEFCAL_ID,
                    color: DEFCAL_COLOR,
                    name: DEFCAL_NAME,
                    type: DEFCAL_TYPE
                },
                {
                    _id: CAL_ID1,
                    color: CAL_COLOR1,
                    name: CAL_NAME1,
                    type: CAL_TYPE1,
                    isPublic: CAL_PUBLIC1,
                    employee: EMPLOYEE_ID_FIRST,
                    consultTimes: DEF_CONSULT_TIMES,
                    specificConsultTimes: []
                }
            ],
            types = {},
            i18n = Y.doccirrus.i18n,
            PATIENT_NO_LBL = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.PATIENT_NO' );

        template[1].locationId = Y.doccirrus.schemas.location.getMainLocationId();

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        // a time far in the future
        function getNotArrivedTime() {
            return new Date( 2115, 1, 1 );
        }

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Calendar_T",
                        "lib": types
                    }
                },

                "Domain": "Calendar",

                "Schedule_T": {
                    "base": {
                        "complex": "ext",
                        "type": "Repetition_T",
                        "lib": types
                    },
                    "start": {
                        "type": "Date",
                        "required": true,
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'calendar-schema.Schedule_T.start' ),
                        "-en": "Start Date",
                        "-de": "Beginn"
                    },

                    "end": {
                        "type": "Date",
                        "validate": "Schedule_T_end",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'calendar-schema.Schedule_T.end' ),
                        "-en": "End Date",
                        "-de": "Ende"
                    },
                    "doctorStart": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.doctorStart' ),
                        "-en": "Doctor Start",
                        "-de": "Arzt Start"
                    },
                    "doctorEnd": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.doctorEnd' ),
                        "-en": "Doctor End",
                        "-de": "Arzt Ende"
                    },
                    "type": {
                        "complex": "eq",
                        "type": "SchedType_E",
                        "i18n": i18n( 'calendar-schema.Schedule_T.type' ),
                        "lib": types,
                        "-en": "Document type",
                        "-de": "Dokumentenart"
                    },
                    "title": {
                        "key": true,
                        "type": "String",
                        "default": "",
                        "index": "unique",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.title' ),
                        "-en": "Description",
                        "-de": "Bezeichnung"
                    },
                    "userDescr": {
                        "type": "String",
                        "default": "",
                        "validate": "Schedule_T_userDescr",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.userDescr' ),
                        "-en": "Description",
                        "-de": "Bezeichnung"
                    },
                    "urgency": {
                        "apiv": { v: 2, queryParam: false },
                        "complex": "eq",
                        "type": "urgency_E",
                        "lib": types
                    },
                    "severity": {
                        "apiv": { v: 2, queryParam: false },
                        "complex": "eq",
                        "type": "Severity_E",
                        "lib": "severity"
                    },
                    "details": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.details' ),
                        "-en": "Details",
                        "-de": "Details"
                    },
                    "eta": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.eta' ),
                        "-en": "eta",
                        "-de": "eta"
                    },
                    "pushtime": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.pushtime' ),
                        "-en": "pushtime",
                        "-de": "Schieben"
                    },
                    "calltime": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.calltime' ),
                        "-en": "calltime",
                        "-de": "calltime"
                    },
                    "alertTime": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.altertTime' ),
                        "-en": "alertTime",
                        "-de": "alertTime"
                    },
                    "adhoc": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.adhoc' ),
                        "-en": "adhoc",
                        "-de": "adhoc"
                    },
                    "group": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.group' ),
                        "-en": "group",
                        "-de": "group"
                    },
                    "closeTime": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.closeTime ' ),
                        "-en": "closeTime",
                        "-de": "closeTime"
                    },
                    "closeDayType": {
                        "complex": "eq",
                        "type": "CloseDayType_E",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.closeDayType' ),
                        "lib": types,
                        "-en": "Type",
                        "-de": "Typ"
                    },
                    "closeTimeId": {
                        "type": "String",
                        "refType": "ObjectId",
                        "-en": "closeTimeId",
                        "-de": "closeTimeId"
                    },
                    "calendar": {
                        "required": true,
                        "type": "String",
                        "ref": "calendar",
                        "refType": "ObjectId",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'calendar-schema.Schedule_T.calendar' ),
                        "-en": "Calendar",
                        "-de": "Kalendar"
                    },
                    "scheduletype": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.scheduletype' ),
                        "-en": "Scheduletype",
                        "-de": "Eintragsart"
                    },
                    "scheduletypePopulated": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.scheduletypePopulated' ),
                        "-en": "Scheduletype",
                        "-de": "Eintragsart"
                    },
                    "allDay": {
                        "type": "Boolean",
                        "default": false,
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.allDay' ),
                        "-en": "allDay",
                        "-de": "ganztägig"
                    },
                    "duration": {
                        "type": "number",
                        "future": "Integer",
                        "validate": "scheduleDuration",
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.duration' ),
                        "-en": "Duration",
                        "-de": "Dauer"
                    },
                    "plannedDuration": {
                        "type": "number",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.plannedDuration' ),
                        "-en": "plannedDuration",
                        "-de": "plannedDuration"
                    },
                    "number": {
                        "type": "number",
                        "future": "Integer",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.number' ),
                        "-en": "number",
                        "-de": "number"
                    },
                    "employee": {
                        "type": "String",
                        "future": "foreignkey.Person_T",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.employee' ),
                        "-en": "employee",
                        "-de": "employee"
                    },
                    "patient": {
                        "type": "String",
                        "ref": "patient",
                        "refType": "ObjectId",
                        "future": "foreignkey.Patient_T",
                        "apiv": { v: 2, queryParam: true },
                        i18n: i18n( 'calendar-schema.Schedule_T.patient' ),
                        "-en": "patient",
                        "-de": "patient"
                    },
                    "externalResource": {
                        "type": "String",
                        "future": "foreignkey.JuristicPerson_T",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.externalResource' ),
                        "-en": "externalResource",
                        "-de": "externalResource"
                    },
                    "repetitionExt": {
                        "complex": "ext",
                        "type": "Recurrence_T",
                        "lib": types
                    },
                    "author": {
                        "type": "String",
                        "future": "foreignkey.Person_T",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.author' ),
                        "-en": "author",
                        "-de": "author"
                    },
                    "scheduled": {
                        "type": "Number",
                        "apiv": { v: 2, queryParam: true },
                        "description": "(-2 = unconfirmed, -1 = no-show; 0 = default; 1 = in progress; 2 = completed / in the past)",
                        "i18n": i18n( 'calendar-schema.Schedule_T.scheduled' ),
                        "-en": "scheduled",
                        "-de": "scheduled"
                    },
                    "wasInTreatment": {
                        "type": "Boolean",
                        "default": false,
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.wasInTreatment' ),
                        "-en": "wasInTreatment",
                        "-de": "wasInTreatment"
                    },
                    "url": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.url' ),
                        "-en": "url",
                        "-de": "url"
                    },
                    "patientAlertExt": {
                        "complex": "ext",
                        "type": "PatientAlert_T",
                        "lib": "patientalert"
                    },
                    "arrivalTime": {
                        "type": "Date",
                        "default": getNotArrivedTime().toJSON(), // a time in far future for the sake of sorting
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.arrivalTime' ),
                        "-en": "arrivalTime",
                        "-de": "arrivalTime"
                    },
                    "groupId": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.groupId.i18n' ),
                        "-en": "groupId",
                        "-de": "groupId"
                    },
                    "capacityOfGroup": {
                        "type": "number",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.capacityOfGroup.i18n' ),
                        "-en": "capacityOfGroup",
                        "-de": "capacityOfGroup"
                    },
                    "lastEditor": {
                        "type": "string",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.lastEditor' ),
                        "-en": "editorName",
                        "-de": "editorName"
                    },
                    "lastEditedDate": {
                        "type": "Date",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.lastEditedDate' ),
                        "-en": "lastEditedDate",
                        "-de": "letzte Änderung"
                    },
                    "isFromPortal": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.isFromPortal' ),
                        "-en": "isFromPortal",
                        "-de": "vom Patientenportal"
                    },
                    "partner": {
                        "complex": "eq",
                        "type": "PartnerData_T",
                        "lib": types
                    },
                    "actualWaitingTimeMinutes": {
                        "type": "Number",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.actualWaitingTimeMinutes' ),
                        "-en": "actualWaitingTimeMinutes",
                        "-de": "actualWaitingTimeMinutes"
                    },
                    "conferenceId": {
                        "type": "ObjectId",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.conferenceId' ),
                        "-en": i18n( 'calendar-schema.Schedule_T.conferenceId' ),
                        "-de": i18n( 'calendar-schema.Schedule_T.conferenceId' )
                    },
                    "lastChanged": {
                        "type": "Date",
                        i18n: i18n( 'UserMgmtMojit.lastChanged.i18n' ),
                        "-en": "last changed",
                        "-de": "zuletzt geändert"
                    },
                    "isReadOnly": {
                        "type": "Boolean",
                        "default": false,
                        "apiv": { v: 2, queryParam: true },
                        "i18n": i18n( 'calendar-schema.Schedule_T.isReadOnly' )
                    },
                    "roomId": {
                        "type": "ObjectId",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Schedule_T.roomId' )
                    },
                    "orderInRoom": {
                        "type": "Number",
                        "apiv": {v: 2, queryParam: false},
                        "i18n": i18n( 'calendar-schema.Schedule_T.orderInRoom' )
                    },
                    "resourceBased": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: true },
                        "i18n": i18n( 'calendar-schema.Schedule_T.resourceBased' )
                    },
                    "resource": {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.resource' ),
                        "-en": "Resource",
                        "-de": "Ressource"
                    },
                    "linkByResource": {
                        "type": 'String',
                        "apiv": { v: 2, queryParam: false },
                        i18n: i18n( 'calendar-schema.Schedule_T.linkByResource' ),
                        "-en": "linkByResource",
                        "-de": "linkByResource"
                    }
                },
                "CloseDayType_E": {
                    "type": "string",
                    "apiv": { v: 2, queryParam: false },
                    "list": [
                        {
                            "val": "HOLIDAY",
                            "i18n": i18n( 'calendar-schema.CloseDayType_E.HOLIDAY' ),
                            "-en": "Holiday",
                            "-de": "Feiertag"
                        },
                        {
                            "val": "VACATION",
                            "i18n": i18n( 'calendar-schema.CloseDayType_E.VACATION' ),
                            "-en": "Vacation",
                            "-de": "Urlaub"
                        },
                        {
                            "val": "OTHER",
                            "i18n": i18n( 'calendar-schema.CloseDayType_E.OTHER' ),
                            "-en": "Other",
                            "-de": "Sonstige"
                        }
                    ]
                },
                "PartnerData_T": {
                    "dcCustomerNo": {
                        "type": "String",
                        "i18n": i18n( 'calendar-schema.PartnerData_T.dcCustomerNo' ),
                        "-en": i18n( 'calendar-schema.PartnerData_T.dcCustomerNo' ),
                        "-de": i18n( 'calendar-schema.PartnerData_T.dcCustomerNo' )
                    },
                    "name": {
                        "type": "String",
                        "i18n": i18n( 'calendar-schema.PartnerData_T.name' ),
                        "-en": i18n( 'calendar-schema.PartnerData_T.name' ),
                        "-de": i18n( 'calendar-schema.PartnerData_T.name' )
                    },
                    "scheduleId": {
                        "type": "ObjectId",
                        "i18n": i18n( 'calendar-schema.PartnerData_T.scheduleId' ),
                        "-en": i18n( 'calendar-schema.PartnerData_T.scheduleId' ),
                        "-de": i18n( 'calendar-schema.PartnerData_T.scheduleId' )
                    },
                    "patientId": {
                        "type": "ObjectId",
                        "i18n": i18n( 'calendar-schema.PartnerData_T.patientId' ),
                        "-en": i18n( 'calendar-schema.PartnerData_T.patientId' ),
                        "-de": i18n( 'calendar-schema.PartnerData_T.patientId' )
                    }
                },
                "CalType_E": {
                    "type": "string",
                    "apiv": { v: 2, queryParam: false },
                    "version": 1,
                    "list": [
                        {
                            "val": "INFORMAL",
                            "i18n": i18n( 'calendar-schema.CalType_E.INFORMAL' ),
                            "-en": "Info-calendar",
                            "-de": "Infokalender"
                        },
                        {
                            "val": "DUTIES",
                            "i18n": i18n( 'calendar-schema.CalType_E.DUTIES' ),
                            "-en": "Duties",
                            "-de": "Pflichten"
                        },
                        {
                            "val": "PATIENTS",
                            "i18n": i18n( 'calendar-schema.CalType_E.PATIENTS' ),
                            "-en": "Plan-calendar",
                            "-de": "Plankalender"
                        },
                        {
                            "val": "INTRESOURCES",
                            "i18n": i18n( 'calendar-schema.CalType_E.INTRESOURCES' ),
                            "-en": "Internal Resources",
                            "-de": "Interne Ressourcen"
                        },
                        {
                            "val": "EXTRESOURCES",
                            "i18n": i18n( 'calendar-schema.CalType_E.EXTRESOURCES' ),
                            "-en": "External Resources",
                            "-de": "Externe Ressourcen"
                        }
                    ]
                },
                "CalView_T": {
                    "color": {
                        "type": "String",
                        "required": true,
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.CalView_T.color.i18n' ),
                        "-en": "color",
                        "-de": "Farbe"
                    },
                    "zIndex": {
                        "type": "number",
                        "future": "Integer",
                        "i18n": i18n( 'calendar-schema.CalView_T.zIndex' ),
                        "-en": "zIndex",
                        "-de": "zIndex"
                    },
                    "xIndex": {
                        "type": "number",
                        "future": "Integer",
                        "i18n": i18n( 'calendar-schema.CalView_T.xIndex' ),
                        "-en": "xIndex",
                        "-de": "xIndex"
                    }
                },
                "Calendar_T": {
                    "name": {
                        "type": "String",
                        "required": true,
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.name' ),
                        "-en": "Name",
                        "-de": "Name"
                    },
                    "descr": {
                        "type": "String",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.descr' ),
                        "-en": "Description",
                        "-de": "Beschreibung"
                    },
                    "isPublic": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.isPublic' ),
                        "-en": "Is Public",
                        "-de": "Ist öffentlich"
                    },
                    "isShared": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.isShared' ),
                        "-en": i18n( 'calendar-schema.Calendar_T.isShared' ),
                        "-de": i18n( 'calendar-schema.Calendar_T.isShared' )
                    },
                    "calGroup": {
                        "type": ['string'],
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.calGroup' ),
                        "-en": i18n( 'calendar-schema.Calendar_T.calGroup' ),
                        "-de": i18n( 'calendar-schema.Calendar_T.calGroup' )
                    },
                    "isRandomMode": {
                        "type": "Boolean",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.isRandomMode' ),
                        "-en": i18n( 'calendar-schema.Calendar_T.isRandomMode' ),
                        "-de": i18n( 'calendar-schema.Calendar_T.isRandomMode' )
                    },
                    "type": {
                        "complex": "eq",
                        "type": "CalType_E",
                        "lib": types,
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.type' ),
                        "-en": "Type",
                        "-de": "Typ"
                    },
                    "employee": {
                        "type": "String",
                        "future": "foreignkey.Person_T",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.employee' ),
                        "-en": "Employee",
                        "-de": "Mitarbeiter"
                    },
                    "locationId": {
                        "type": "String",
                        "ref": "location",
                        "refType": "ObjectId",
                        "future": "foreignkey.Location_T",
                        "default": Y.doccirrus.schemas.location.getMainLocationId(),
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.locationId' ),
                        "-en": "Location",
                        "-de": "Betriebsstätte"
                    },
                    "consultTimes": {
                        "complex": "inc",
                        "type": "WeeklyTime_T",
                        "lib": "location",
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.consultTimes' ),
                        "-en": "Consultation Times",
                        "-de": "Sprechzeiten"
                    },
                    "specificConsultTimes": {
                        "complex": "inc",
                        "type": "SpecificConsultTime_T",
                        "lib": types,
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.specificConsultTimes' ),
                        "-en": "Specific Consultation Times",
                        "-de": "Sondersprechzeiten"
                    },
                    "ext": {
                        "complex": "ext",
                        "type": "CalView_T",
                        "lib": types
                    },
                    "mirrorCalendarId": {
                        "type": "ObjectId",
                        "i18n": i18n( 'calendar-schema.Calendar_T.mirrorCalendarId' ),
                        "-en": i18n( 'calendar-schema.Calendar_T.mirrorCalendarId' ),
                        "-de": i18n( 'calendar-schema.Calendar_T.mirrorCalendarId' )
                    },
                    "resources": {
                        "complex": "inc",
                        "type": "CalendarResource_T",
                        "lib": types,
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.Calendar_T.resources' ),
                        "-en": "resources",
                        "-de": "resources"
                    }
                },
                "CalendarResource_T": {
                    "resourceType": {
                        "type": "String",
                        "required": true,
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.CalendarResource_T.resourceType' ),
                        "-en": "resourceType",
                        "-de": "resourceType"
                    },
                    "resource": {
                        "type": "String",
                        "required": true,
                        "apiv": { v: 2, queryParam: false },
                        "i18n": i18n( 'calendar-schema.CalendarResource_T.resource' ),
                        "-en": "resource",
                        "-de": "resource"
                    }
                },
                "SpecificConsultTime_T": {
                    "base": {
                        "complex": "ext",
                        "type": "WeeklyTime_T",
                        "lib": "location"
                    },
                    "range": {
                        "type":["String"],
                        "required": true,
                        "i18n": i18n( 'calendar-schema.SpecificConsultTime_T.range' )
                    },
                    "start": {
                        "type": [Number],
                        "override": true,
                        i18n: i18n( 'location-schema.WeeklyTime_T.start.i18n' )
                    },
                    "end": {
                        "type": [Number],
                        "override": true,
                        i18n: i18n( 'location-schema.WeeklyTime_T.end.i18n' )
                    }
                },

                "EmployeeSched_T": {},
                "JurPersonSched_T": {},
                "ResourceSched_T": {},
                "PatientSched_T": {},
                "Repetition_T": {
                    "linkSeries": {
                        "type": "String",
                        "ref": "schedule",
                        "refType": "ObjectId",
                        "i18n": i18n( 'calendar-schema.Repetition_T.linkSeries' ),
                        "-en": "Base Schedule",
                        "-de": "Terminserie"
                    },
                    "isCustomised": {
                        "type": "Boolean",
                        "default": undefined,
                        "i18n": i18n( 'calendar-schema.Repetition_T.isCustomised.i18n' ),
                        "-en": "isCustomised",
                        "-de": "isCustomised"
                    }
                },
                "Recurrence_T": {
                    /*
                     The following fields follow the naming convention of rrule lib
                     https://github.com/jakubroztocil/rrule
                     Except:
                     "freq"  -->   "repetition"
                     */
                    "repetition": {
                        "complex": "eq",
                        "type": "RepType_E",
                        "validate": "Recurrence_T_until",
                        "lib": types
                    },
                    "dtstart": {
                        "type": "Date",
                        "validate": "Recurrence_T_until",
                        i18n: i18n( 'calendar-schema.Recurrence_T.dtstart' ),
                        "-en": "From Date",
                        "-de": "Beginn am"
                    },
                    "interval": {
                        "type": "Number",
                        "validate": "Recurrence_T_interval",
                        i18n: i18n( 'calendar-schema.Recurrence_T.interval' ),
                        "-en": "Interval",
                        "-de": "Interval"
                    },
                    "until": {
                        "type": "Date",
                        "validate": "Recurrence_T_until",
                        i18n: i18n( 'calendar-schema.Recurrence_T.until' ),
                        "-en": "To Date",
                        "-de": "Ende am"
                    },
                    "bysetpos": {
                        "type": "Number",
                        "i18n": i18n( 'calendar-schema.Recurrence_T.bysetpos' ),
                        "-en": "scheduled",
                        "-de": "scheduled"
                    },
                    "bymonth": {
                        "type": "Number",
                        "i18n": i18n( 'calendar-schema.Recurrence_T.bymonth' ),
                        "-en": "scheduled",
                        "-de": "scheduled"
                    },
                    "bymonthday": {
                        "type": "Number",
                        "i18n": i18n( 'calendar-schema.Recurrence_T.bysetpos' ),
                        "-en": "scheduled",
                        "-de": "scheduled"
                    },
                    "byyearday": {
                        "type": "Number",
                        "i18n": i18n( 'calendar-schema.Recurrence_T.byyearday' ),
                        "-en": "scheduled",
                        "-de": "scheduled"
                    },
                    "byweekno": {
                        "type": "Number",
                        "i18n": i18n( 'calendar-schema.Recurrence_T.byweekno' ),
                        "-en": "scheduled",
                        "-de": "scheduled"
                    },
                    "byweekday": {
                        "type": ["String"],
                        i18n: i18n( 'calendar-schema.Recurrence_T.byweekday' ),
                        "-en": "On Weekday",
                        "-de": "An Wochentag"
                    }

                    /*
                     Note:  these fields are only set dynamically for querying purposes, but not stored in the DB:
                     wkst
                     count
                     */
                },
                "Byweekday_E": {
                    // THIS ENUM ISN'T ACTUALLY IN USE, BECAUSE MONGODB DOESN'T HANDLE MULTIPLE VALUE ENUMS
                    // THIS IS JUST FOR TRANSLATION PURPOSES
                    "type": "string",
                    i18n: i18n( 'calendar-schema.Byweekday_E.i18n' ),
                    "-en": "On Weekday",
                    "-de": "An Wochentag",
                    "list": [
                        {
                            "val": "0",
                            i18n: i18n( 'calendar-schema.Byweekday_E.0' ),
                            "-en": "Mo",
                            "-de": "Mo"
                        },
                        {
                            "val": "1",
                            i18n: i18n( 'calendar-schema.Byweekday_E.1' ),
                            "-en": "Tu",
                            "-de": "Di"
                        },
                        {
                            "val": "2",
                            i18n: i18n( 'calendar-schema.Byweekday_E.2' ),
                            "-en": "We",
                            "-de": "Mi"
                        },
                        {
                            "val": "3",
                            i18n: i18n( 'calendar-schema.Byweekday_E.3' ),
                            "-en": "Th",
                            "-de": "Do"
                        },
                        {
                            "val": "4",
                            i18n: i18n( 'calendar-schema.Byweekday_E.4' ),
                            "-en": "Fr",
                            "-de": "Fr"
                        },
                        {
                            "val": "5",
                            i18n: i18n( 'calendar-schema.Byweekday_E.5' ),
                            "-en": "Sa",
                            "-de": "Sa"
                        },
                        {
                            "val": "6",
                            i18n: i18n( 'calendar-schema.Byweekday_E.6' ),
                            "-en": "Su",
                            "-de": "So"
                        }
                    ]
                },
                "RepType_E": {
                    "type": "string",
                    "default": "NONE",
                    "version": 1,
                    i18n: i18n( 'calendar-schema.RepType_E.i18n' ),
                    "-en": "Repeat",
                    "-de": "repetition",
                    "list": [
                        {
                            "val": "NONE",
                            i18n: i18n( 'calendar-schema.RepType_E.NONE' ),
                            "-en": "None",
                            "-de": "keine"
                        },
                        {
                            "val": "HOURLY",
                            i18n: i18n( 'calendar-schema.RepType_E.HOURLY' ),
                            "-en": "Hourly",
                            "-de": "stündlich"
                        },
                        {
                            "val": "DAILY",
                            i18n: i18n( 'calendar-schema.RepType_E.DAILY' ),
                            "-en": "Daily",
                            "-de": "täglich"
                        },
                        {
                            "val": "WEEKLY",
                            i18n: i18n( 'calendar-schema.RepType_E.WEEKLY' ),
                            "-en": "Weekly",
                            "-de": "wöchentlich"
                        },
                        {
                            "val": "MONTHLY",
                            i18n: i18n( 'calendar-schema.RepType_E.MONTHLY' ),
                            "-en": "Monthly",
                            "-de": "monatlich"
                        },
                        {
                            "val": "YEARLY",
                            i18n: i18n( 'calendar-schema.RepType_E.YEARLY' ),
                            "-en": "Yearly",
                            "-de": "jährlich"
                        }
                    ]
                },
                "SchedType_E": {
                    "apiv": { v: 2, queryParam: false },
                    "type": "string",
                    "list": [
                        {
                            "val": "AVAILABLE",
                            i18n: i18n( 'calendar-schema.SchedType_E.AVAILABLE' ),
                            "-en": "available",
                            "-de": "available"
                        },
                        {
                            "val": "UNAVAILABLE",
                            i18n: i18n( 'calendar-schema.SchedType_E.UNAVAILABLE' ),
                            "-en": "unavailable",
                            "-de": "unavailable"
                        },
                        {
                            "val": "RESERVED",
                            i18n: i18n( 'calendar-schema.SchedType_E.RESERVED' ),
                            "-en": "reserved",
                            "-de": "reserved"
                        },
                        {
                            "val": "BOOKED",
                            i18n: i18n( 'calendar-schema.SchedType_E.BOOKED' ),
                            "-en": "booked",
                            "-de": "booked"
                        },
                        {
                            "val": "BLOCKED",
                            i18n: i18n( 'calendar-schema.SchedType_E.BLOCKED' ),
                            "-en": "blocked",
                            "-de": "blocked"
                        },
                        {
                            "val": "INFORMAL",
                            i18n: i18n( 'calendar-schema.SchedType_E.INFORMAL' ),
                            "-en": "informal",
                            "-de": "informal"
                        }
                    ]
                },
                "urgency_E": {
                    "type": "Number",
                    "apiv": { v: 2, queryParam: false },
                    "default": 0,
                    i18n: i18n( 'calendar-schema.Schedule_T.urgency' ),
                    "-en": "Urgency",
                    "-de": "Dringlichkeit",
                    "list": [
                        {
                            "val": 0,
                            i18n: i18n( 'calendar-schema.Schedule_T.urgency_E.0' ),
                            "-de": "Normal",
                            "-en": "Normal"
                        },
                        {
                            "val": 1,
                            i18n: i18n( 'calendar-schema.Schedule_T.urgency_E.1' ),
                            "-de": "!",
                            "-en": "!"
                        },
                        {
                            "val": 2,
                            i18n: i18n( 'calendar-schema.Schedule_T.urgency_E.2' ),
                            "-de": "!!",
                            "-en": "!!"
                        },
                        {
                            "val": 3,
                            i18n: i18n( 'calendar-schema.Schedule_T.urgency_E.3' ),
                            "-de": "!!!",
                            "-en": "!!!"
                        }
                    ]
                }
            }
        );

        /**
         * helper to determine adhoc for inconsistent values
         * @param {object} event
         * @return {boolean}
         * @private
         */
        function isEventAdHoc( event ) {
            return ('true' === event.adhoc || true === event.adhoc) ? true : false;
        }

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,

            ramlConfig: ramlConfig,

            indexes: [
                { key: { "calendar": 1 } },
                { key: { "start": 1 } },
                { key: { "end": 1 } }
            ],

            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: template,

            /**
             * scheduled flag has following values: (falsy => waiting)
             */
            SCH_UNCONFIRMED: -2,
            SCH_NOSHOW: -1,
            SCH_WAITING: 0,
            SCH_CURRENT: 1,
            SCH_ENDED: 2,

            MAX_SERIES_SCHEDULES: 120,

            getDefaultCalendarId: function() {
                return DEFCAL_ID;
            },
            getTempDocCalendarId: function() {
                return TEMPCAL_ID;
            },
            getStandardCalendarId: function() {
                return CAL_ID1;
            },
            /**
             * Returns a random new ID for the class of info calendars
             *
             * Set _id to this string in a Calendar Object being posted
             * to DCModel.
             *
             */
            getNewInfoCalId: function() {
                var
                    a = '', i;
                for( i = 0; i < 22; i++ ) {
                    a = a.concat( Math.floor( (Math.random() * 16) ).toString( 16 ) );
                }
                return '11' + a;
            },
            /**
             * Given a calendar's ID (or Mongoose BSON ID) returns true if this calendar is
             * for a doctor and false otherwise.
             *
             * @param calendarId
             * @return {Boolean}
             */
            isDoctorCalendar: function( calendarId ) {
                if( calendarId && calendarId.toString() ) {
                    return calendarId.toString() > COMPARATOR_ID;
                }
                return false;
            },
            /**
             * Given a calendar's ID (or Mongoose BSON ID) returns true if this calendar is for resources ( virtual ) and false otherwise.
             *
             * @param calendarId
             * @return {Boolean}
             */
            isResourceCalendar: function( calendarId ) {
                if( calendarId && calendarId.toString() ) {
                    return calendarId.toString() === RESOURCECAL_ID;
                }
                return false;
            },
            /**
             * Returns the ID for virtual resource calendar.
             * @return {String}
             */
            getResourceCalId: function() {
                return RESOURCECAL_ID;
            },
            /**
             * Returns the smallest possible Doctor Calendar ID.
             * @return {String}
             */
            getComparatorId: function() {
                return COMPARATOR_ID;
            },
            /**
             * Returns the ID of the close calendar.
             * @returns {string}
             */
            getCloseTimeCalId: function() {
                return CLOSECAL_ID;
            },
            getDefaultConsultTimes: function() {
                return DEF_CONSULT_TIMES;
            },
            getDefaultSpecificConsultTimes: function() {
                return DEF_SPECIFIC_CONSULT_TIMES;
            },
            /**
             * we make a clear distinction between all kind of events here.
             * we always recognize an event only by its type name, which is determined
             * by the content of that event.
             *
             * "repetition" is merely a helper type, i.e. not searchable
             *
             * @param calevent
             * @returns {String}
             */
            getEventType: function getEventType( calevent ) {
                var
                    eventType;
                if( true === calevent.allDay || 'true' === calevent.allDay ) {
                    eventType = 'allDay';
                } else if( true === calevent.adhoc || 'true' === calevent.adhoc ) {
                    eventType = 'adhoc';
                } else if( true === calevent.closeTime || 'true' === calevent.closeTime ) {
                    eventType = 'closeTime';
                } else if( calevent.scheduleId ) {
                    eventType = 'repetition'; // repeated planned
                } else {
                    eventType = 'plan'; // single planned
                }
                return eventType;
            },
            getRecurrenceFields: function getRecurrenceFields() {
                return Y.clone( types.Recurrence_T, true );
            },

            /**
             * builds an event title from given parameters
             * @param {object} parameters
             * @param {object} parameters.event calendar model
             * @param {object} [parameters.patient] patient model
             * @param {object} [parameters.scheduletype] scheduletype model
             * @param {function} [parameters.patientFormatter] a funtion to be used for formatting the patient - should return string, provided are the default generated string and the current patient if
             * @return {string}
             */
            buildScheduleTitle: function buildScheduleTitle( parameters ) {
                var
                    _k = Y.dcforms.mapper.koUtils.getKo(),
                    event = parameters.event,
                    patient = parameters.patient,
                    scheduletype = parameters.scheduletype,
                    userDescr = _k.unwrap( event.userDescr ) ? (_k.unwrap( event.userDescr ) || '').trim() : '',
                    stringNumber = 'Nummer',
                    stringPatient = patient ? Y.doccirrus.schemas.person.personDisplay( patient ) : '',
                    stringScheduletype = scheduletype ? scheduletype.name : '',
                    formatType = 0;

                if( stringPatient ) {
                    if( patient && patient.kbvDob ) {
                        stringPatient += ', ' + patient.kbvDob;
                    }
                    if( patient && patient.patientNo ) {
                        stringPatient += ', ' + PATIENT_NO_LBL + ':' + patient.patientNo;
                    }
                }

                if( parameters.patientFormatter ) {
                    stringPatient = parameters.patientFormatter( stringPatient, patient );
                }

                if( !userDescr && !stringPatient ) {
                    formatType = 1;
                } else if( userDescr && !stringPatient ) {
                    formatType = 2;
                } else if( !userDescr && stringPatient ) {
                    formatType = 3;
                } else if( userDescr && stringPatient ) {
                    formatType = 4;
                }

                if( isEventAdHoc( event ) ) {
                    stringNumber += ' ' + _k.unwrap( event.number );
                    switch( formatType ) {
                        case 1:
                            if( stringScheduletype ) {
                                stringNumber += ', ' + stringScheduletype;
                            }
                            return stringNumber;
                        case 2:
                            if( stringScheduletype ) {
                                userDescr += ', ' + stringScheduletype;
                            }
                            return userDescr;
                        case 3:
                            if( stringScheduletype ) {
                                stringNumber += ', ' + stringScheduletype;
                            }
                            return stringPatient + ', ' + stringNumber;
                        case 4:
                            if( stringScheduletype ) {
                                userDescr += ', ' + stringScheduletype;
                            }
                            return stringPatient + ', ' + userDescr;
                    }
                } else {
                    switch( formatType ) {
                        case 1:
                            return stringScheduletype;
                        case 2:
                            if( stringScheduletype ) {
                                userDescr += ', ' + stringScheduletype;
                            }
                            return userDescr;
                        case 3:
                            if( stringScheduletype ) {
                                stringPatient += ', ' + stringScheduletype;
                            }
                            return stringPatient;
                        case 4:
                            if( stringScheduletype ) {
                                userDescr += ', ' + stringScheduletype;
                            }
                            return stringPatient + ', ' + userDescr;
                    }
                }
            },

            /**
             * Filter a list of "scheduletype" objects to match defined ids in their "calendarRefs" property
             * with a provided calendar
             * @param {Array} scheduletypes
             * @param {Object|String} calendar
             * @returns {Array}
             */
            filterScheduletypesForCalendar: function( scheduletypes, calendar ) {
                if( Y.Lang.isObject( calendar ) ) {
                    calendar = calendar._id;
                }
                return Y.Array.filter( scheduletypes, function( scheduletype ) {
                    var
                        calendarRefs = scheduletype.calendarRefs || [];

                    calendarRefs = Y.Array.map( calendarRefs, function( item ) {
                        return item.calendarId;
                    } );
                    return calendarRefs.indexOf( calendar ) > -1;
                } );
            },

            /**
             * Filter a list of "scheduletype" objects to get allscheduletypes with resources
             * @param {Array} scheduletypes
             * @param {Object|String} calendar
             * @returns {Array}
             */
            filterScheduletypesForResourceCalendar: function( scheduletypes ) {
                return scheduletypes.filter( function( scheduletype ) {
                    return scheduletype.requiredResources && scheduletype.requiredResources[0];
                } );
            },
            /**
             * Get the contrast color for given calendar color
             * @param {String} color Hex or RGB value string
             * @returns {String}
             */
            getContrastColor: function( color ) {
                var
                    rgb = Y.Color.toArray( Y.Color.toRGB( color ) ),
                    brightness;

                //http://www.w3.org/TR/AERT#color-contrast
                brightness = Math.round( ((parseInt( rgb[0], 10 ) * 299) + (parseInt( rgb[1], 10 ) * 587) + (parseInt( rgb[2], 10 ) * 114)) / 1000 );

                if( brightness > 125 ) {
                    return '#333';
                } else {
                    return '#fff';
                }
            },

            /**
             * readonly logic for calevents
             * @param currentData
             * @param newData
             * @returns {Array}
             */
            getReadOnlyFieldsForCalevent: function getReadOnlyFieldsForCalevent( currentData, newData ) {
                var
                    roFields = [];
                if( ( currentData.scheduled !== newData.scheduled ) && !newData.isManualChange ) {
                    roFields.push( 'eta' ); // MOJ-3244, only manual change on start can change eta
                }
                return roFields;
            },
            getNotArrivedTime: getNotArrivedTime,

            /**
             * Some common constants for return values of "reason"
             * in "doccirrus.api.calendar.doesCalendarAcceptScheduletypeId"
             */
            doesCalendarAcceptScheduletypeId: {
                NO_MATCH_FOR_CALENDAR: -3,
                REQUIRED_FOR_CALENDAR: -2,
                NOT_EMPTY_FOR_INFO: -1,
                EMPTY_FOR_INFO: 1,
                MATCH_FOR_CALENDAR: 2
            }
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'oop',
            'dcvalidations',
            'dcschemaloader',
            'person-schema',
            'location-schema',
            'patientalert-schema',
            'severity-schema',
            'dcformmap-ko-util',
            'color'
        ]
    }
);
