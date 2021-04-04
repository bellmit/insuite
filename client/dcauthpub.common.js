/**
 * User: rrrw
 * Date: 12.02.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';

/**
 * Client Side Auth Library
 */

/*jslint anon:true, nomen:true */
/*global YUI, sjcl, SHA1 */
YUI.add( 'dcauthpub', function( Y, NAME ) {

        var
            myAuth,
            aesParams = {
                ks: 256,
                mode: 'ccm',
                cipher: 'aes'
            };

        function Pin( pin, patientId ) {
            this.pin = pin;
            this.patientId = patientId;
        }

        /**
         * Parses a JSON Patient Pin and gives you a Pin
         * object back.  Or null, if the parse fails.
         *
         * Static function. Not available on the instances.
         *
         * @param str
         */
        Pin.parse = function parse( str ) {
            var
                obj,
                result = null;
            try {
                obj = JSON.parse( str );
                result = new Pin( obj.pin, obj.patientId );
                if( !result.isValid() ) {
                    result = null;
                }
            } catch( e ) {
                // not JSON, doesn't matter.
            }
            if( !result ) {
                Y.log( 'Parse Error: Bad Patient Pin Object: ' + str, 'warn', NAME );
            }
            return result;
        };

        Pin.prototype.toJSON = function toJSON() {
            var
                obj = { pin: this.pin, patientId: this.patientId };
            return JSON.stringify( obj );
        };

        Pin.prototype.toString = function toString() {
            return this.toJSON();
        };

        Pin.prototype.isValid = function isValid() {
            if( this.pin &&
                'string' === typeof this.pin &&
                6 === this.pin.length &&
                this.patientId &&
                'string' === typeof this.patientId &&
                12 < this.patientId.length ) {
                return true;
            }
            return false;
        };

        /**
         * Constructor for the module class.
         *
         * @class DCAuthPub
         * @private
         */
        function DCAuthPub() {
            // purely static object at the moment, nothing in the instances.

            /**
             * Contains sections and groups which HAVE access.
             * @property sectionsAccess
             * @type Object
             */
            this.sectionsAccess = {
                CalendarMojit: {
                    reports: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ],
                    requiredLicense: {
                        type: Y.doccirrus.schemas.settings.licenseCategories.BASE_SERVICES,
                        license: Y.doccirrus.schemas.settings.baseServices.INTIME
                    }

                },
                CaseFileMojit: {
                    reports: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ],
                    tab_withoutCardRead: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ],
                    tab_apkInProgress: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ],
                    tab_kim: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ]
                },
                InvoiceMojit: {
                    invoice_nav: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    gkv_browser: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    asv_browser: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    kvg_browser: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    edmp_browser: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    cashbook: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    rlv: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    med_budget: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    ut_budget: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    billing: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ],
                    reports: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ],
                    invoiceAdmin_nav: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    gkv_settings: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    gkv_delivery_settings: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    kvg_delivery_settings: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    kvg_settings: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    bg_settings: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    pkv_settings: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    pvs_settings: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    cash_settings: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    rule_editor: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    edmp_settings: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    general_settings: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    lab_devices_certificates: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    shift_patients: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    requiredLicense: {
                        type: Y.doccirrus.schemas.settings.licenseCategories.BASE_SERVICES,
                        license: Y.doccirrus.schemas.settings.baseServices.INVOICE
                    }
                },
                UserMgmtMojit: {
                    intouchAdmin: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ]
                },
                InSuiteAdminMojit: {
                    insuiteadmin: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ]
                },
                InBackupMojit: {
                    requiredLicense: {
                        type: Y.doccirrus.schemas.settings.licenseCategories.ADDITIONAL_SERVICES,
                        license: Y.doccirrus.schemas.settings.additionalServiceKinds.INBACKUP
                    },
                    inBackupMojit: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ]
                },
                DeviceMojit: {
                    inport: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    requiredLicense: {
                        type: Y.doccirrus.schemas.settings.licenseCategories.BASE_SERVICES,
                        license: Y.doccirrus.schemas.settings.baseServices.INPORT
                    }
                },
                LabLogMojit: {
                    labLog: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                KVConnectMojit: {
                    kvconnect: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                TelekardioMojit: {
                    telekardio: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    cardioConfig: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                CRMMojit: {
                    crm_nav: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                AppTokenMojit: {
                    appToken: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    appAccessManager: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    appNav: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                FormEditorMojit: {
                    forms: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ],
                    requiredLicense: {
                        type: Y.doccirrus.schemas.settings.licenseCategories.BASE_SERVICES,
                        license: Y.doccirrus.schemas.settings.baseServices.INFORM
                    }
                },
                IncaseAdminMojit: {
                    incase_nav: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN
                    ],
                    rule_editor: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                InPacsAdminMojit: {
                    inPacsAdminMojit: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    requiredLicense: {
                        type: Y.doccirrus.schemas.settings.licenseCategories.ADDITIONAL_SERVICES,
                        license: Y.doccirrus.schemas.settings.additionalServiceKinds.INPACS
                    }
                },
                InPacsLogMojit: {
                    inPacsLogMojit: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    requiredLicense: {
                        type: Y.doccirrus.schemas.settings.licenseCategories.ADDITIONAL_SERVICES,
                        license: Y.doccirrus.schemas.settings.additionalServiceKinds.INPACS
                    }
                },
                GdtLogMojit: {
                    gdtLog: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                InTimeAdminMojit: {
                    intimeadmin: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    requiredLicense: {
                        type: Y.doccirrus.schemas.settings.licenseCategories.BASE_SERVICES,
                        license: Y.doccirrus.schemas.settings.baseServices.INTIME
                    }
                },
                InSight2Mojit: {
                    root: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    myreports: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    tab1: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    patienten: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    diagnosen: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    leistungen: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    abrechnung: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    infotab: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    "standard-reports": [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    analysis: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    import_export: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    settings: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    requiredLicense: {
                        type: Y.doccirrus.schemas.settings.licenseCategories.ADDITIONAL_SERVICES,
                        license: Y.doccirrus.schemas.settings.additionalServiceKinds.INSIGHT
                    }
                },
                InSetupMojit: {
                    import_export_text_blocks: [
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ]
                },
                CatalogMojit: {
                    catalogs: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                MISMojit: {
                    terminal: [
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ],
                    console: [
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ]
                },
                SocketIOMojit: {
                    socketIO: [
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ]
                },
                InStockMojit: {
                    inStock: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    requiredLicense: {
                        type: Y.doccirrus.schemas.settings.licenseCategories.ADDITIONAL_SERVICES,
                        license: Y.doccirrus.schemas.settings.additionalServiceKinds.INSTOCK
                    }
                },
                InCashMojit: {
                    InCash: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ],
                    requiredLicense: {
                        type: Y.doccirrus.schemas.settings.licenseCategories.ADDITIONAL_SERVICES,
                        license: Y.doccirrus.schemas.settings.additionalServiceKinds.INCASH
                    }
                },
                PatientTransferMojit: {
                    transferLog: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                },
                DeviceLogMojit: {
                    deviceLog: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT,
                        Y.doccirrus.schemas.identity.userGroups.CONTROLLER
                    ]
                }
            };

            /**
             * Contains APIs and groups which DO NOT have access
             * @property restrictedAPI
             * @type Object
             */
            this.restrictedAPI = {
                kbvlog: {
                    replaceKBVLog: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    deleteKBVLog: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    manualSend: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    cleanXpmPath: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    preValidate: [
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    validate: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    deliverySettings: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    encryptAccountStatement: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    sendAccountStatement: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    approve: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF
                    ]
                },
                tarmedlog: {
                    preValidate: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF
                    ],
                    validate: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    generateInvoices: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    send: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ]
                },
                pvslog: {
                    send: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    preValidate: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF
                    ],
                    validate: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    replacePVSLog: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    approve: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ]
                },
                cashlog: {
                    preValidate: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF
                    ],
                    validate: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ],
                    approve: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ]
                },
                invoicelog: {
                    approve: [
                        Y.doccirrus.schemas.identity.userGroups.SUPERUSER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ]
                },
                document: {
                    check: [
                        Y.doccirrus.schemas.identity.userGroups.USER,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF
                    ]
                },
                company: {
                    all: [
                        Y.doccirrus.schemas.identity.userGroups.PHYSICIAN,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACIST,
                        Y.doccirrus.schemas.identity.userGroups.PHARMACY_STAFF,
                        Y.doccirrus.schemas.identity.userGroups.USER
                    ]
                },
                kotableconfiguration: {
                    cloneAllTableConfigurationForUserAsPreset: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ],
                    clearTableConfigurationPreset: [
                        Y.doccirrus.schemas.identity.userGroups.ADMIN,
                        Y.doccirrus.schemas.identity.userGroups.SUPPORT
                    ]
                }
            };
        }

        DCAuthPub.prototype.init = function init() {
        };

        function salt( str ) {
            return 'doc-cirrus.gmbh./@213#$)5Awsd~zcZXCc @#*5*' + str + '_82_Bessemer_Str_12103_Berlin';
        }

        /**
         * We don't send passwords in the clear.  We don't store passwords.
         *
         * Specifically we store a derived hash value, that we derive using the
         * Password Based Key Derivation Function 2
         * (PBKDF2) standardised by RSA Labs.
         *
         * For PBKDF recommendations see, e.g.:
         * http://csrc.nist.gov/publications/nistpubs/800-132/nist-sp800-132.pdf
         *
         * For a cost comparison, see:
         * Colin Percival, "Stronger Key Derivation via Sequential Memory-Hard Functions" BSDCan'09, May 2009.
         * http://www.tarsnap.com/scrypt/scrypt.pdf
         *
         * We use the SJCL Stanford crypto library implementation because of speed and accuracy.
         *
         * @param str
         * @return hash string or undefined
         */
        DCAuthPub.prototype.getPasswordHash = function getPasswordHash( str ) {
            var
                mySjcl = getSjcl(),
                hmacSHA256 = function hmacSHA256( key ) {
                    var hasher = new mySjcl.misc.hmac( key, mySjcl.hash.sha256 ); //eslint-disable-line new-cap
                    this.encrypt = function() {
                        return hasher.encrypt.apply( hasher, arguments );
                    };
                },
                iterations = 1000,
                sjclSalt,
                keySizeBits = 512,
                //t1, t2,
                pwHash;

            sjclSalt = mySjcl.codec.hex.toBits( salt( str ) );

            if( str && 'string' === typeof str && 0 < str.length ) {
                //t1 = Date.now();
                pwHash = mySjcl.codec.hex.fromBits(
                    mySjcl.misc.pbkdf2( str, sjclSalt, iterations, keySizeBits, hmacSHA256 )
                );

                //t2 = Date.now();
                // Y.log( 'PBKDF2 took (ms) : ' + (t2 - t1) );
                pwHash = pwHash.toString();
                //alert( 'PBKDF2 took (ms) : ' + (t2 - t1) );
            }
            return pwHash;
        };

        /**
         * to make sure sjcl is available on both client and server
         * @returns {object}
         */
        function getSjcl() {
            if( 'undefined' === typeof sjcl || !sjcl ) {
                if( 'undefined' === typeof require || !require ) {  // eslint-disable-line
                    Y.log( 'SJCL Lib not found, and cannot require() in encPRCMsg ', 'error', NAME );
                } else {
                    // load the SJCL library into the node environment.
                    return require( process.cwd() + '/mojits/DocCirrus/assets/js/sjcl-28d8573235.js' ); // eslint-disable-line
                }
            }
            return sjcl;
        }

        // load tiny SHA1 for either browser or node
        function getSha1() {
            if( 'undefined' === typeof SHA1 || !SHA1 ) {
                if( 'undefined' === typeof require || !require ) {  // eslint-disable-line
                    Y.log( 'SHA1 Lib not found, and cannot require() in encPRCMsg ', 'error', NAME );
                } else {
                    // load the SHA1 library into the node environment.
                    return require( process.cwd() + '/mojits/DocCirrus/assets/js/tinySHA1.r4.js' ); // eslint-disable-line
                }
            }
            return SHA1;
        }

        DCAuthPub.prototype.generateHash = function( str ) {
            var
                myHasher = getSha1();
            try {
                return myHasher( str );
            } catch( e ) {
                Y.log( 'error in generateHash:' + JSON.stringify( e.message || e ), 'error', NAME );
            }
        };

        /**
         * AES256 encryption of the given string, intended to be
         * encrypted with a shared secret and then decrypted at
         * the other end.
         * The message is salted, so that the same message will
         * never be encrypted to the same ciphertext.
         * @param str
         */
        DCAuthPub.prototype.encPRCMsg = function encPRCMsg( key, str ) {
            var
                mySjcl = getSjcl(),
                result;

            if( 'string' === typeof str ) {
                result = mySjcl && mySjcl.encrypt( key, JSON.stringify( { d: Date.now(), m: str } ), aesParams, {} );
            } else {
                Y.log( 'ENCRYPT: NULL result ', 'warn', NAME );
                result = null;
            }
            return result;
        };

        DCAuthPub.prototype.encJSON = function encJSON( key, json, isString ) {
            var
                _json = json;
            if( !isString ) {
                _json = JSON.stringify( json );
            }
            return this.encPRCMsg( key, _json );

        };

        DCAuthPub.prototype.decPRCMsg = function decPRCMsg( key, str ) {
            var
                mySjcl = getSjcl(),
                result;

            try {
                result = mySjcl && mySjcl.decrypt( key, str, {}, {} );
            } catch( e ) {
                Y.log( 'Cannot decrypt the given message: ' + JSON.stringify( e.message || e ), 'error', NAME );
            }
            try {
                result = JSON.parse( result ).m;
            } catch( e1 ) {
                Y.log( 'Cannot parse deciphertext: ' + result, 'error', NAME );
            }
            return result;
        };

        DCAuthPub.prototype.decJSON = function decJSON( key, jsonStrEnc ) {
            var jsonStr = this.decPRCMsg( key, jsonStrEnc );
            return jsonStr && JSON.parse( jsonStr );
        };

        DCAuthPub.prototype.b64_encode = function enc64( str ) {
            var
                mySjcl = getSjcl(),
                result;

            if( 'string' === typeof str ) {
                result = mySjcl && mySjcl.codec.base64.fromBits( mySjcl.codec.utf8String.toBits( str ) );
            } else {
                result = null;
            }
            return result;
        };

        DCAuthPub.prototype.b64_decode = function dec64( str ) {
            var
                mySjcl = getSjcl(),
                result;

            if( 'string' === typeof str ) {
                result = mySjcl && mySjcl.codec.utf8String.fromBits( mySjcl.codec.base64.toBits( str ) );
            } else {
                result = null;
            }
            return result;
        };

        /**
         * Generates a random PIN with /len/ digits.  FUTURE TBD: Is it cryptographically secure?
         * Maximum length is 16k, minimum length 1. Default is 5.
         *
         * @param len number of digits in the PIN
         * @return {String}
         */
        DCAuthPub.prototype.getPin = function getPin( len ) {
            len = len || 5;
            var result = '',
                i;
            len = (len > 16384 || len < 1 ) ? 5 : len;
            for( i = 0; i < len; i++ ) {
                result = result.concat( Math.floor( Math.random() * 10 ) );
            }
            return result;
        };

        /**
         * Generates a random PIN for this Patient (identified by Id).
         * If the patient Id is not longer than 12 chars, returns null.
         *
         * @param patientId  id of the patient for whom this pin is as a string (optional)
         *                   if no patient Id is provided just returns a string otherwise returns
         *                   a Pin object.
         * @return {String}
         */
        DCAuthPub.prototype.getPatientPin = function getPatientPin( patientId ) {
            var
                pin;
            //
            // PATIENT PIN has 6 digits (Aug 2013)
            //
            pin = new Pin( myAuth.getPin( 6 ), patientId );
            if( pin.isValid() ) {
                return pin;
            }
            // cannot define a pin with these parameters...
            return null;
        };

        /**
         * Checks the given string for password strength. Returns an integer value which has the following meaning:
         * 0: not ok
         * 1: ok - 6 chars
         * 2: better - 8 chars
         * 3: good - 8 chars contain upper/lower/numbers/specialchars or >= 12 chars
         *
         * @param password string to check
         * @return {number} password strength
         */
        DCAuthPub.prototype.checkPwStrength = function checkPwStrength( password ) {
            var
                score = 0,
                passPhraseInterval=[20,25], // Min , Max
                passWordInterval=[8,12],
                charTypes = [
                    /[a-z]/,
                    /[A-Z]/,
                    /\d/,
                    /\W|_/],
                charTypeCount = 0,
                calcScore = function (password, passInterval){
                    var
                        deltaInterval = passInterval[1]-passInterval[0], // !>0
                        differenceToMinimum = password.length - (passInterval[0]),
                        preScore =  differenceToMinimum === 0 ? 0.1 : (differenceToMinimum)/deltaInterval;
                    // 100% = 3, 49% =2, >0 = 1
                    return preScore >= 1 ? 3 : ( preScore > 0.49 ?  2 : (preScore > 0 ? 1 : 0 ));
                };

            charTypes.forEach(function(ele){
               if (ele.test(password)) {
                   charTypeCount++;
               }
            });

            // TESTING RULES:
            if (charTypeCount >= 2 && password.length >= passPhraseInterval[0]  )  {
                score = calcScore(password, passPhraseInterval);
            }
            if (charTypeCount === 4 && password.length >= passWordInterval[0]  )  {
                score = calcScore(password, passWordInterval);
            }
            return score;
        };

        /**
         * generte new key pair
         * @returns {JSON}
         */
        DCAuthPub.prototype.createKeys = function() {
            var
                sjcl = getSjcl(),
                pair = sjcl.ecc.elGamal.generateKeys( 256 ), // Curve P-256. If only a bitsize is given, SJCL assumes a P-* curve.
                pub = pair.pub.get(),
                sec = pair.sec.get();

            // Serialize public key
            pub = sjcl.codec.base64.fromBits( pub.x.concat( pub.y ) );

            // Serialize private key
            sec = sjcl.codec.base64.fromBits( sec );

            return { publicKey: pub, secret: sec };
        };

        /**
         * https://github.com/bitwiseshiftleft/sjcl/wiki/Asymmetric-Crypto#finding-shared-secret-keys
         *
         * @param {string} mySecret (in base64)
         * @param {string} theirPublicKey (in base64)
         * @return {Array} shared secret (as bit array)
         */
        DCAuthPub.prototype.getSharedSecret = function( mySecret, theirPublicKey ) {
            var
                sjcl = getSjcl(),
                pub, sec;

            // Unserialize public key:
            pub = new sjcl.ecc.elGamal.publicKey( //eslint-disable-line new-cap
                sjcl.ecc.curves.c256,
                sjcl.codec.base64.toBits( theirPublicKey )
            );

            // Unserialize private key:
            sec = new sjcl.ecc.elGamal.secretKey( //eslint-disable-line new-cap
                sjcl.ecc.curves.c256,
                sjcl.ecc.curves.c256.field.fromBits( sjcl.codec.base64.toBits( mySecret ) )
            );
            return sec.dh( pub );
        };

        /**
         * Tells whether user groups have same(or higher) access than target group or not
         * @method hasEnoughGroupRights
         * @param userGroupsNames
         * @param targetGroupName
         * @returns {boolean}
         */
        DCAuthPub.prototype.hasEnoughGroupRights = function( userGroupsNames, targetGroupName ) {
            var
                mainGroupWeight = Y.doccirrus.schemas.employee.getGroupWeight();
            if( Array.isArray( userGroupsNames ) ) {
                userGroupsNames.forEach( function( groupName ) {
                    var
                        groupWeight = Y.doccirrus.schemas.employee.getGroupWeight( groupName );
                    if( groupWeight > mainGroupWeight ) {
                        mainGroupWeight = groupWeight;
                    }
                } );
            } else {
                mainGroupWeight = Y.doccirrus.schemas.employee.getGroupWeight( userGroupsNames );
            }
            return mainGroupWeight >= Y.doccirrus.schemas.employee.getGroupWeight( targetGroupName );
        };

        myAuth = new DCAuthPub();

        /**
         * Expose the Pin "Class" of objects through the
         * DCAuthPub object.
         *
         * You can then create a new Patient Pin using the
         * "Class" constructor as follows:
         *
         * pin = new Y.doccirrus.authpub.PatientPin( pin, pId )
         *
         * @type {Function}
         */
        myAuth.PatientPin = Pin;

        myAuth.init();

        Y.namespace( 'doccirrus' ).authpub = myAuth;

    },
    '0.0.1', {
        requires: [
            'identity-schema',
            'settings-schema'
        ]
    }
);
