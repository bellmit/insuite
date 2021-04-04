/**
 * User: do
 * Date: 16.08.19  10:02
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'kvcaccount-schema', function( Y, NAME ) {
        /**
         * The kvcaccount entry schema,
         *
         * @module kvcaccount-schema,
         */
        const i18n = Y.doccirrus.i18n;
        // ------- Schema definitions  -------
        let types = {};

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "KVCAccount_T",
                        "lib": types
                    }
                },
                KVCAccount_T: {
                    "uid": {
                        "type": "String",
                        i18n: i18n( 'kvcaccount-schema.KVCAccount_T.uid.i18n' ),
                        "-en": "UID",
                        "-de": "UID"
                    },
                    status: {
                        "complex": "eq",
                        i18n: i18n( 'kvcaccount-schema.KVCAccount_T.status.i18n' ),
                        "type": "KVCAccountStatus_E",
                        "lib": types
                    },
                    "statusMessage": {
                        "type": "String",
                        i18n: i18n( 'kvcaccount-schema.KVCAccount_T.statusMessage.i18n' ),
                        "-en": "Status Message",
                        "-de": "Status Nachricht"
                    },
                    "username": {
                        "type": "String",
                        unique: true,
                        required: true,
                        i18n: i18n( 'kvcaccount-schema.KVCAccount_T.username.i18n' ),
                        "-en": "Username",
                        "-de": "Nutzername"
                    },
                    "password": {
                        "type": "String",
                        required: true,
                        i18n: i18n( 'kvcaccount-schema.KVCAccount_T.password.i18n' ),
                        "-en": "Password",
                        "-de": "Passwort"
                    },
                    "lastKvcLogin": {
                        "type": "Date",
                        i18n: i18n( 'kvcaccount-schema.KVCAccount_T.lastKvcLogin.i18n' ),
                        "-en": "Last login",
                        "-de": "Letzter Login"
                    },
                    "passwordChangeNeeded": {
                        "type": "Boolean",
                        i18n: i18n( 'kvcaccount-schema.KVCAccount_T.pwdChangeNecessary.i18n' ),
                        "-en": "Password change is necessary",
                        "-de": "Passwort-Änderung notwenig"
                    },
                    "passwordLastChange": {
                        "type": "Date",
                        i18n: i18n( 'kvcaccount-schema.KVCAccount_T.lastKvcPwdChange.i18n' ),
                        "-en": "Last password change",
                        "-de": "Letzte Passwort-Änderung"
                    },
                    "certificateStatus": {
                        "complex": "eq",
                        i18n: i18n( 'kvcaccount-schema.KVCAccount_T.certificateStatus.i18n' ),
                        "type": "KVCAccountCertificateStatus_E",
                        "lib": types
                    },
                    "certificates": {
                        "complex": "inc",
                        i18n: i18n( 'kvcaccount-schema.KVCAccount_T.certificate.i18n' ),
                        "type": "KVCCertificate_T",
                        "lib": types
                    },
                    "locationIds": {
                        "type": ["String"],
                        required: true,
                        i18n: i18n( 'kvcaccount-schema.KVCAccount_T.locationIds.i18n' ),
                        "-en": "Locations",
                        "-de": "Betriebsstätten"
                    }
                },
                KVCAccountStatus_E: {
                    "type": "String",
                    "default": 'NOT_LOGGED_IN',
                    "list": [
                        {
                            "val": "LOGIN_OK",
                            i18n: i18n( 'kvcaccount-schema.KVCAccountStatus_E.LOGIN_OK' ),
                            "-de": i18n( 'kvcaccount-schema.KVCAccountStatus_E.LOGIN_OK' ),
                            "-en": i18n( 'kvcaccount-schema.KVCAccountStatus_E.LOGIN_OK' )
                        },
                        {
                            "val": "LOGIN_FAILED",
                            i18n: i18n( 'kvcaccount-schema.KVCAccountStatus_E.LOGIN_FAILED' ),
                            "-de": i18n( 'kvcaccount-schema.KVCAccountStatus_E.LOGIN_FAILED' ),
                            "-en": i18n( 'kvcaccount-schema.KVCAccountStatus_E.LOGIN_FAILED' )
                        },
                        {
                            "val": "NOT_LOGGED_IN",
                            i18n: i18n( 'kvcaccount-schema.KVCAccountStatus_E.NOT_LOGGED_IN' ),
                            "-de": i18n( 'kvcaccount-schema.KVCAccountStatus_E.NOT_LOGGED_IN' ),
                            "-en": i18n( 'kvcaccount-schema.KVCAccountStatus_E.NOT_LOGGED_IN' )
                        }
                    ]
                },
                KVCAccountCertificateStatus_E: {
                    "type": "String",
                    "default": "NONE",
                    "list": [
                        {
                            "val": "VALID",
                            i18n: i18n( 'kvcaccount-schema.KVCAccountCertificateStatus_E.VALID' ),
                            "-de": i18n( 'kvcaccount-schema.KVCAccountCertificateStatus_E.VALID' ),
                            "-en": i18n( 'kvcaccount-schema.KVCAccountCertificateStatus_E.VALID' )
                        },
                        {
                            "val": "EXPIRED",
                            i18n: i18n( 'kvcaccount-schema.KVCAccountCertificateStatus_E.EXPIRED' ),
                            "-de": i18n( 'kvcaccount-schema.KVCAccountCertificateStatus_E.EXPIRED' ),
                            "-en": i18n( 'kvcaccount-schema.KVCAccountCertificateStatus_E.EXPIRED' )
                        },
                        {
                            "val": "NONE",
                            i18n: i18n( 'kvcaccount-schema.KVCAccountCertificateStatus_E.NONE' ),
                            "-de": i18n( 'kvcaccount-schema.KVCAccountCertificateStatus_E.NONE' ),
                            "-en": i18n( 'kvcaccount-schema.KVCAccountCertificateStatus_E.NONE' )
                        }

                    ]
                },
                KVCCertificate_T: {
                    validFrom: {
                        "type": "Date",
                        i18n: i18n( 'kvcaccount-schema.KVCCertificate_T.validFrom.i18n' ),
                        "-en": "Valid from",
                        "-de": "Gültig seit"
                    },
                    validTo: {
                        "type": "Date",
                        i18n: i18n( 'kvcaccount-schema.KVCCertificate_T.validTo.i18n' ),
                        "-en": "Valid to",
                        "-de": "Gültig bis"
                    },
                    pin: {
                        "type": "String",
                        i18n: i18n( 'kvcaccount-schema.KVCCertificate_T.validTo.i18n' ),
                        "-en": "PIN",
                        "-de": "PIN"
                    },
                    signedCertificateFileId: {
                        "type": "String",
                        i18n: i18n( 'kvcaccount-schema.KVCCertificate_T.signedCertificateFileId.i18n' ),
                        "-en": "Signed Certificate",
                        "-de": "Signiertes Zertifikat"
                    },
                    csrFileId: {
                        "type": "String",
                        i18n: i18n( 'kvcaccount-schema.KVCCertificate_T.csrFileId.i18n' ),
                        "-en": "CSR File",
                        "-de": "CSR Datei"
                    },
                    csrId: {
                        "type": "String",
                        i18n: i18n( 'kvcaccount-schema.KVCCertificate_T.csrId.i18n' ),
                        "-en": "CSR ID",
                        "-de": "CSR ID"
                    },
                    csrStatus: {
                        "complex": "eq",
                        i18n: i18n( 'kvcaccount-schema.KVCCertificate_T.csrStatus.i18n' ),
                        "type": "CsrStatus_E",
                        "lib": types,
                        "-en": "CSR Status",
                        "-de": "CSR Status"
                    },
                    privateKeyFileId: {
                        "type": "String",
                        i18n: i18n( 'kvcaccount-schema.KVCCertificate_T.privateKeyFileId.i18n' ),
                        "-en": "Private Key",
                        "-de": "Privater Schlüssel"
                    },
                    publicKeyFileId: {
                        "type": "String",
                        i18n: i18n( 'kvcaccount-schema.KVCCertificate_T.publicKeyFileId.i18n' ),
                        "-en": "Public Key",
                        "-de": "Öffentlicher Schlüssel"
                    }
                },
                CsrStatus_E: {
                    "type": "String",
                    "list": [
                        {
                            "val": "SENT",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.SENT' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.SENT' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.SENT' )
                        },
                        {
                            "val": "100",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.100' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.100' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.100' )
                        },
                        {
                            "val": "110",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.110' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.110' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.110' )
                        },
                        {
                            "val": "120",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.120' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.120' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.120' )
                        },
                        {
                            "val": "210",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.210' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.210' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.210' )
                        },
                        {
                            "val": "299",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.299' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.299' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.299' )
                        },
                        {
                            "val": "399",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.399' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.399' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.399' )
                        },
                        {
                            "val": "900",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.900' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.900' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.900' )
                        },
                        {
                            "val": "901",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.901' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.901' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.901' )
                        },
                        {
                            "val": "902",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.902' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.902' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.902' )
                        },
                        {
                            "val": "903",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.903' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.903' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.903' )
                        },
                        {
                            "val": "999",
                            i18n: i18n( 'kvcaccount-schema.CsrStatus_E.999' ),
                            "-de": i18n( 'kvcaccount-schema.CsrStatus_E.999' ),
                            "-en": i18n( 'kvcaccount-schema.CsrStatus_E.999' )
                        }
                    ]
                }

            }
        );

        function isValidCsrStatus( csrStatus ) {
            return Y.doccirrus.schemas.kvcaccount.types.CsrStatus_E.list.some( function(entry){return entry.val === csrStatus;} );
        }

        function isFinalCsrStatus( csrStatus ) {
            return csrStatus && csrStatus.length === 3 && csrStatus[0] === '9';
        }

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,
            name: NAME,
            isValidCsrStatus: isValidCsrStatus,
            isFinalCsrStatus: isFinalCsrStatus
        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dcschemaloader',
            'doccirrus',
            'dcvalidations'
        ]
    }
);
