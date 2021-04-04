/**
 * User: rrrw
 * Date: 22.05.14  12:11
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

'use strict';

YUI.add( 'audit-schema', function( Y, NAME ) {

        /**
         * The DC audit data schema / mongoose Schemas.
         *
         * @module DCAudit
         */

        var

        // ------- Schema definitions  -------
            i18n = Y.doccirrus.i18n,
            types = {
                Action_E: {
                    type: "String",
                    i18n: i18n( 'audit-schema.Action_E.i18n' ),
                    "-en": "Action",
                    "-de": "Handlung",
                    "list": [
                        {
                            "val": "put",
                            i18n: i18n( 'audit-schema.Action_E.put' ),
                            "-en": "changed",
                            "-de": "ändert"
                        },
                        {
                            "val": "upsert",
                            i18n: i18n( 'audit-schema.Action_E.upsert' ),
                            "-en": "changed / created",
                            "-de": "ändert / erzeugt"
                        },
                        {
                            "val": "post",
                            i18n: i18n( 'audit-schema.Action_E.post' ),
                            "-en": "created",
                            "-de": "erzeugt"
                        },
                        {
                            "val": "delete",
                            i18n: i18n( 'audit-schema.Action_E.delete' ),
                            "-en": "deleted",
                            "-de": "löscht"
                        },
                        {
                            "val": "get",
                            i18n: i18n( 'audit-schema.Action_E.get' ),
                            "-en": "read",
                            "-de": "liest"
                        },
                        {
                            "val": "transfer",
                            i18n: i18n( 'audit-schema.Action_E.transfer' ),
                            "-en": "transferred",
                            "-de": "überträgt"
                        },
                        {
                            "val": "install",
                            i18n: i18n( 'audit-schema.Action_E.install' ),
                            "-en": "Install",
                            "-de": "Install"
                        },
                        {
                            "val": "remove",
                            i18n: i18n( 'audit-schema.Action_E.remove' ),
                            "-en": "Remove",
                            "-de": "Remove"
                        },
                        {
                            "val": "start",
                            i18n: i18n( 'audit-schema.Action_E.start' ),
                            "-en": "Start",
                            "-de": "Start"
                        },
                        {
                            "val": "finish",
                            i18n: i18n( 'audit-schema.Action_E.finish' ),
                            "-en": "Finish",
                            "-de": "Ende"
                        },
                        {
                            "val": "init",
                            i18n: i18n( 'audit-schema.Action_E.init' ),
                            "-en": "Reinitialization",
                            "-de": "Reinitialization"
                        },
                        {
                            "val": "check",
                            i18n: i18n( 'audit-schema.Action_E.check' ),
                            "-en": "Check",
                            "-de": "Prüfen"
                        },
                        {
                            "val": "reboot",
                            i18n: i18n( 'audit-schema.Action_E.reboot' ),
                            "-en": "Reboot",
                            "-de": "Neustart"
                        },
                        {
                            "val": "update",
                            i18n: i18n( 'audit-schema.Action_E.update' ),
                            "-en": "Update",
                            "-de": "Aktualisieren"
                        },
                        {
                            "val": "open",
                            i18n: i18n( 'audit-schema.Action_E.open' ),
                            "-en": "open",
                            "-de": "öffnen"
                        },
                        {
                            "val": "sent",
                            i18n: i18n( 'audit-schema.Action_E.sent' )
                        },
                        {
                            "val": "received",
                            i18n: i18n( 'audit-schema.Action_E.received' )
                        },
                        {
                            "val": "updateTag",
                            i18n: i18n( 'audit-schema.Action_E.tagUpdate' )
                        },
                        {
                            "val": "lock",
                            i18n: i18n( 'audit-schema.Action_E.lock' )
                        },
                        {
                            "val": "unlock",
                            i18n: i18n( 'audit-schema.Action_E.unlock' )
                        },
                        {
                            "val": "malware",
                            i18n: i18n('audit-schema.Action_E.malware')
                        },
                        {
                            "val": "print",
                            i18n: i18n( 'audit-schema.Action_E.print' )
                        },
                        {
                            "val": "sign",
                            i18n: i18n( 'audit-schema.Action_E.sign' )
                        }
                    ]
                },
                ModelMeta_E: {
                    type: "String",
                    i18n: i18n( 'audit-schema.ModelMeta_E.i18n' ),
                    "-en": "What",
                    "-de": "Was",
                    "list": [
                        {
                            "val": "audit",
                            i18n: i18n( 'audit-schema.ModelMeta_E.audit' ),
                            "-en": "audit",
                            "-de": "Audit"
                        },
                        {
                            "val": "admin",
                            i18n: i18n( 'audit-schema.ModelMeta_E.admin' ),
                            "-en": "System File",
                            "-de": "System Datei"
                        },
                        {
                            "val": "document",
                            i18n: i18n( 'audit-schema.ModelMeta_E.document' ),
                            "-en": "Document",
                            "-de": "Dokument"
                        },
                        {
                            "val": "transfer",
                            i18n: i18n( 'audit-schema.ModelMeta_E.transfer' )
                        },
                        {
                            "val": "practice",
                            i18n: i18n( 'audit-schema.ModelMeta_E.practice' ),
                            "-en": "Practice",
                            "-de": "Einrichtung"
                        },
                        {
                            "val": "media",
                            i18n: i18n( 'audit-schema.ModelMeta_E.media' ),
                            "-en": "Media",
                            "-de": "Datei"
                        },
                        {
                            val: 'location',
                            i18n: i18n( 'audit-schema.ModelMeta_E.location' )
                        },
                        /*
                        {
                            "val": "reporting",
                            i18n: i18n( 'audit-schema.ModelMeta_E.reporting' )
                        },
                        */
                        /*
                         {
                         "val": "metaprac",
                         i18n: i18n( 'audit-schema.ModelMeta_E.metaprac' ),
                         "-en": "metaprac",
                         "-de": "metaprac"
                         },
                         {
                         "val": "media",
                         i18n: i18n( 'audit-schema.ModelMeta_E.media' ),
                         "-en": "Media",
                         "-de": "Bilder"
                         },
                         {
                         "val": "patientreg",
                         i18n: i18n( 'audit-schema.ModelMeta_E.patientreg' ),
                         "-en": "PP entry",
                         "-de": "PP Eintrag"
                         },
                         {
                         "val": "practice",
                         i18n: i18n( 'audit-schema.ModelMeta_E.practice' ),
                         "-en": "Practice",
                         "-de": "Praxis"
                         },
                         */
                        {
                            "val": "repetition",
                            i18n: i18n( 'audit-schema.ModelMeta_E.repetition' ),
                            "-en": "Repetition",
                            "-de": "Serientermin"
                        },
                        {
                            "val": "schedule",
                            i18n: i18n( 'audit-schema.ModelMeta_E.schedule' ),
                            "-en": "Schedule",
                            "-de": "Kalendereintrag"
                        },
                        {
                            "val": "scheduletype",
                            i18n: i18n( 'audit-schema.ModelMeta_E.scheduletype' ),
                            "-en": "Calendar entry type",
                            "-de": "Kalendereintragstyp"
                        },
                        {
                            "val": "medication",
                            i18n: i18n( 'audit-schema.ModelMeta_E.medication' ),
                            "-en": "Medication",
                            "-de": "Medikament"
                        },
                        {
                            "val": "calendar",
                            i18n: i18n( 'audit-schema.ModelMeta_E.calendar' ),
                            "-en": "Calendar",
                            "-de": "Kalender"
                        },
                        {
                            "val": "flow",
                            i18n: i18n( 'audit-schema.ModelMeta_E.flow' )
                        },
                        {
                            "val": "cardreaderconfiguration",
                            i18n: i18n( 'audit-schema.ModelMeta_E.cardreaderconfiguration' )
                        },
                        /*
                         {
                         "val": "identity",
                         i18n: i18n( 'audit-schema.ModelMeta_E.identity' ),
                         "-en": "Login Details",
                         "-de": "Login Details"
                         },
                         {
                         "val": "sysnum",
                         i18n: i18n( 'audit-schema.ModelMeta_E.sysnum' ),
                         "-en": "System number",
                         "-de": "Systemnummer"
                         },
                         {
                         "val": "intime",
                         i18n: i18n( 'audit-schema.ModelMeta_E.intime' ),
                         "-en": "Waiting room",
                         "-de": "Wartezimmer"
                         },
                         {
                         "val": "patientalert",
                         i18n: i18n( 'audit-schema.ModelMeta_E.patientalert' ),
                         "-en": "Patientalert",
                         "-de": "Patientenalert"
                         },
                         {
                         "val": "contact",
                         i18n: i18n( 'audit-schema.ModelMeta_E.contact' ),
                         "-en": "Contact",
                         "-de": "Kontakt"
                         },
                         */
                        {
                            "val": "company",
                            i18n: i18n( 'audit-schema.ModelMeta_E.company' ),
                            "-en": "Company",
                            "-de": "Firma"
                        },
                        /*
                         {
                         "val": "customer",
                         i18n: i18n( 'audit-schema.ModelMeta_E.customer' ),
                         "-en": "Customer",
                         "-de": "Kunde"
                         },
                         {
                         "val": "mt2it",
                         i18n: i18n( 'audit-schema.ModelMeta_E.mt2it' ),
                         "-en": "MT2IT",
                         "-de": "MT2IT"
                         },
                         */
                        {
                            "val": "auth",
                            i18n: i18n( 'audit-schema.ModelMeta_E.auth' ),
                            "-en": "Session information",
                            "-de": "Sitzungsinformation"
                        },
                        {
                            "val": "patient",
                            i18n: i18n( 'audit-schema.ModelMeta_E.patient' ),
                            "-en": "Patient",
                            "-de": "Patient"
                        },
                        /*
                         {
                         "val": "marker",
                         i18n: i18n( 'audit-schema.ModelMeta_E.marker' ),
                         "-en": "Marker",
                         "-de": "Marker"
                         },
                         {
                         "val": "invoiceconfiguration",
                         i18n: i18n( 'audit-schema.ModelMeta_E.invoiceconfiguration' ),
                         "-en": "Invoice Configuration",
                         "-de": "Rechnungskonfiguration"
                         },
                         */
                        {
                            "val": "kbvlog",
                            i18n: i18n( 'audit-schema.ModelMeta_E.kbvlog' ),
                            "-en": "KBV invoice",
                            "-de": "KBV Abrechung"
                        },
                        {
                            "val": "kvcmessage",
                            i18n: i18n( 'audit-schema.ModelMeta_E.kvcmessage' ),
                            "-en": "KBV invoice",
                            "-de": "KBV Abrechung"
                        },
                        {
                            "val": "pvslog",
                            i18n: i18n( 'audit-schema.ModelMeta_E.pvslog' ),
                            "-en": "PVS invoice",
                            "-de": "PVS Abrechung"
                        },
                        /*
                         {
                         "val": "severity",
                         i18n: i18n( 'audit-schema.ModelMeta_E.severity' ),
                         "-en": "Severity",
                         "-de": "Grad"
                         },
                         */
                        {
                            "val": "activity",
                            i18n: i18n( 'audit-schema.ModelMeta_E.activity' ),
                            "-en": "Case file entry",
                            "-de": "Akteneintrag"
                        },
                        {
                            "val": "basecontact",
                            i18n: i18n( 'audit-schema.ModelMeta_E.basecontact' ),
                            "-en": "Contact",
                            "-de": "Kontakt"
                        },
                        {
                            "val": "settings",
                            i18n: i18n( 'audit-schema.ModelMeta_E.usersettings' ),
                            "-en": "Setting",
                            "-de": "Einstellung"
                        },
                        /*
                         {
                         "val": "physician",
                         i18n: i18n( 'audit-schema.ModelMeta_E.physician' ),
                         "-en": "Referrer",
                         "-de": "Zuweiser"
                         },
                         {
                         "val": "usersettings",
                         i18n: i18n( 'audit-schema.ModelMeta_E.usersettings' ),
                         "-en": "Setting",
                         "-de": "Einstellung"
                         },
                         {
                         "val": "form",
                         i18n: i18n( 'audit-schema.ModelMeta_E.form' ),
                         "-en": "Formular",
                         "-de": "Formular"
                         }
                         */
                        {
                            "val": "dcprcconnection",
                            i18n: i18n( 'audit-schema.ModelMeta_E.dcprcconnection' ),
                            "-en": "Licensing connection",
                            "-de": "Verbindung zum Lizenzserver"
                        },
                        {
                            "val": "pucconnection",
                            i18n: i18n( 'audit-schema.ModelMeta_E.pucconnection' ),
                            "-en": "Internet connection",
                            "-de": "Verbindung zum Internet"
                        },
                        {
                            "val": "backup",
                            i18n: i18n( 'audit-schema.ModelMeta_E.backup' ),
                            "-en": "backup",
                            "-de": "backup"
                        },
                        {
                            "val": "device",
                            i18n: i18n( 'audit-schema.ModelMeta_E.device' ),
                            "-en": "device",
                            "-de": "device"
                        },
                        {
                            "val": "system",
                            i18n: i18n( 'audit-schema.ModelMeta_E.system' ),
                            "-en": "System",
                            "-de": "System"
                        },
                        {
                            "val": "callaudit",
                            i18n: i18n( 'audit-schema.ModelMeta_E.callaudit' ),
                            "-en": "Call",
                            "-de": "Ruf"
                        },
                        {
                            "val": "dispatchrequest",
                            i18n: i18n( 'audit-schema.ModelMeta_E.dispatchrequest' ),
                            "-en": "Dispatchrequest",
                            "-de": "Verteilungsanfrage"
                        },
                        {
                            "val": "task",
                            i18n: i18n( 'audit-schema.ModelMeta_E.task' ),
                            "-en": "Task",
                            "-de": "Aufgabe"
                        },
                        {
                            "val": "v_synchro",
                            i18n: i18n( 'audit-schema.ModelMeta_E.prcsynchro' ),
                            "-en": "PRCsynchro",
                            "-de": "PRCsynchro"
                        },
                        {
                            "val": "v_dispatch",
                            i18n: i18n( 'audit-schema.ModelMeta_E.dispatch' ),
                            "-en": "Dispatch",
                            "-de": "Dispatch"
                        },
                        {
                            "val": "reporting",
                            i18n: i18n( 'audit-schema.ModelMeta_E.reporting' ),
                            "-en": "Reporting entry",
                            "-de": "inSight Eintrag"
                        },                        {
                            "val": "sol",
                            i18n: i18n( 'audit-schema.ModelMeta_E.sol' ),
                            "-en": "Sol",
                            "-de": "Sol"
                        },
                        {
                            "val": "insurancegroup",
                            i18n: i18n( 'audit-schema.ModelMeta_E.insurancegroup' ),
                            "-en": "Reporting Insurance Group",
                            "-de": "Kostenträgergruppe"
                        },
                        {
                            'val': 'serialEmail',
                            i18n: i18n( 'audit-schema.ModelMeta_E.serialEmail' ),
                            '-en': 'Serial email',
                            '-de': 'Serien-E-Mail'
                        },
                        {
                            'val': 'incash',
                            i18n: i18n( 'audit-schema.ModelMeta_E.incash' ),
                            '-en': 'Cash book entry',
                            '-de': 'Kassenbucheintrag'
                        },
                        {
                            'val': 'tag',
                            i18n: i18n( 'audit-schema.ModelMeta_E.tag' ),
                            '-en': 'Tag',
                            '-de': 'Tag'
                        },
                        {
                            'val': 'patientPortal',
                            i18n: i18n( 'audit-schema.ModelMeta_E.patientPortal' ),
                            '-en': 'Health portal',
                            '-de': 'Gesundheitsportal'
                        },
                        {
                            'val': 'virtualFields',
                            i18n: i18n( 'audit-schema.ModelMeta_E.virtualFields' ),
                            '-en': 'DB',
                            '-de': 'DB'
                        },
                        {
                            val: 'caseFolder',
                            i18n: i18n( 'audit-schema.ModelMeta_E.caseFolder' )
                        },
                        {
                            val: 'employee',
                            i18n: i18n( 'audit-schema.ModelMeta_E.employee' )
                        },
                        {
                            "val": "patienttransfer",
                            i18n: i18n( 'audit-schema.ModelMeta_E.patienttransfer' ),
                            "-en": "patienttransfer",
                            "-de": "patienttransfer"
                        },
                        {
                            "val": "kimaccount",
                            i18n: i18n( 'audit-schema.ModelMeta_E.kimaccount' ),
                            "-en": "KIM account",
                            "-de": "KIM Account"
                        }
                    ]
                },
                Status_E: {
                    "type": "String",
                    "default": '1',
                    "list": [
                        {
                            "val": '1',
                            i18n: i18n( 'audit-schema.Status_E.ONLINE' ),
                            "-en": "Reconnected",
                            "-de": "Verbindung wiederhergestellt"
                        },
                        {
                            "val": '0',
                            i18n: i18n( 'audit-schema.Status_E.OFFLINE' ),
                            "-en": "Connection lost",
                            "-de": "Verbindung verloren"
                        }
                    ],
                    i18n: i18n( 'audit-schema.Status_E.i18n' ),
                    "-en": "status",
                    "-de": "status"
                }
            };

        types = Y.mix( types, {
            root: {
                user: {
                    type: 'String',
                    i18n: i18n( 'audit-schema.root.user' ),
                    "-en": "Who",
                    "-de": "Wer"
                },
                userId: {
                    type: 'String',
                    i18n: i18n( 'audit-schema.root.userId' ),
                    "-en": "User Id",
                    "-de": "Nutzer Id"
                },
                model: {
                    complex: 'eq',
                    type: 'ModelMeta_E',
                    lib: types,
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'audit-schema.root.model' ),
                    "-en": "What",
                    "-de": "Was"
                },
                objId: {
                    type: 'String',
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'audit-schema.root.objId' ),
                    "-en": "Object Id",
                    "-de": "Objekt Id"
                },
                action: {
                    complex: 'eq',
                    type: 'Action_E',
                    lib: types,
                    apiv: {v: 2, queryParam: false},
                    i18n: i18n( 'audit-schema.root.action' ),
                    "-en": "Action",
                    "-de": "Aktion"
                },
                attempt: {
                    type: 'String',
                    i18n: i18n( 'audit-schema.root.attempt' ),
                    "-en": "Attempt",
                    "-de": "Attempt"
                },
                descr: {
                    type: 'String',
                    "apiv": {v: 2, queryParam: false},
                    i18n: i18n( 'audit-schema.root.descr' ),
                    "-en": "Description",
                    "-de": "Beschreibung"
                },
                timestamp: {
                    type: 'Date',
                    i18n: i18n( 'audit-schema.root.timestamp' ),
                    "-en": "When",
                    "-de": "Wann"
                },
                relatedActivities: {
                    "complex": "inc",
                    "type": "relatedActivities_T",
                    "lib": types,
                    i18n: i18n( 'audit-schema.root.relatedActivities.i18n' ),
                    "-en": "relatedActivities",
                    "-de": "relatedActivities"
                },
                "sessionInfo": {
                    "complex": "ext",
                    "type": "sessionInfo_T",
                    "lib": types
                },
                "actType": {
                    type: 'String',
                    i18n: i18n( 'audit-schema.root.actType' ),
                    "-en": "Activity Type",
                    "-de": "Aktivitätstyp"
                },
                "diff": {
                    type: "any",
                    i18n: i18n( 'audit-schema.root.diff.i18n' ),
                    "-en": "diff",
                    "-de": "diff"
                }
            },
            "sessionInfo_T": {
                "sessionId": {
                    "type": "string",
                    i18n: i18n( 'auth-schema.root.sessionId' ),
                    "-en": "sessionId",
                    "-de": "sessionId"
                },
                ip: {
                    type: 'String',
                    i18n: i18n( 'audit-schema.root.ip' ),
                    "-en": "IP",
                    "-de": "IP"
                },
                deviceName: {
                    type: 'String',
                    i18n: i18n( 'audit-schema.root.ip' ),
                    "-en": "deviceName",
                    "-de": "deviceName"
                }
            },
            "relatedActivities_T": {
                id: {
                    type: 'String',
                    i18n: i18n( 'audit-schema.relatedActivities_T.id.i18n' ),
                    "-en": "id",
                    "-de": "id"
                },
                text: {
                    type: 'String',
                    i18n: i18n( 'audit-schema.relatedActivities_T.text.i18n' ),
                    "-en": "text",
                    "-de": "text"
                }
            }
        } );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        // -------- Our Schema Methods and Hooks are defined here -------

        /**
         * Class audit Schemas -- gathers all the schemas that the audit Service works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            name: NAME,

            indexes: [
                {
                    key: {
                        "objId": 1
                    }
                },
                {
                    key: {
                        "model": 1
                    }
                },
                {
                    key: {
                        "timestamp": 1
                    }
                },
                {
                    key: {
                        "action": 1
                    }
                },
                {
                    key: {
                        "user": 1
                    }
                },
                {
                    key: {
                        "descr": "text"
                    },
                    indexType: { default_language: "german" }
                },
                {
                    key: {
                        "ip": 1
                    }
                }
            ],

            /**
             *
             * @param {String} action
             * @return {Boolean}
             */
            isValidAction: function isValidAction( action ) {
                return !!types.Action_E.list.find( function findAction( action_e ) {
                    return action_e && action_e.val === action;
                } );
            },

            /**
             *
             * @param {String} model
             * @return {Boolean}
             */
            isValidModel: function isValidModel( model ) {
                return !!types.ModelMeta_E.list.find( function findModel( modelMeta_E ) {
                    return modelMeta_E && modelMeta_E.val === model;
                } );
            }
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'mojito'
        ]
    }
);
