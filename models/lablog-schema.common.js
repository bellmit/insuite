/**
 * User: do
 * Date: 02/03/15  13:27
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'lablog-schema', function( Y, NAME ) {
        'use strict';

        var types = {},
            mom = Y.doccirrus.commonutils.getMoment(),
            i18n = Y.doccirrus.i18n;

        // ------- Schema definitions  -------

        types = Y.mix( types, {
                'root': {
                    'base': {
                        'complex': 'ext',
                        'type': 'Lablog_T',
                        'lib': types
                    }
                },
                'Lablog_T': {
                    'l_data': {
                        'required': true,
                        'type': 'any',
                        '-en': i18n( 'lablog-schema.Lablog_T.l_data' ),
                        '-de': i18n( 'lablog-schema.Lablog_T.l_data' ),
                        i18n: i18n( 'lablog-schema.Lablog_T.l_data' )
                    },
                    'timestamp': {
                        'required': true,
                        'type': 'Date',
                        i18n: i18n( 'lablog-schema.Lablog_T.timestamp' )
                    },
                    'created': {
                        'required': true,
                        'type': 'Date',
                        i18n: i18n( 'lablog-schema.Lablog_T.created' )
                    },
                    'source': {
                        'required': true,
                        'type': 'String',
                        i18n: i18n( 'lablog-schema.Lablog_T.source' )
                    },
                    'status': {
                        'required': true,
                        'complex': 'eq',
                        'type': 'Status_E',
                        'lib': types,
                        i18n: i18n( 'lablog-schema.Lablog_T.status' )
                    },
                    'user': {
                        'required': true,
                        'complex': 'inc',
                        'type': 'EmployeeShort_T',
                        'lib': 'employee',
                        i18n: i18n( 'lablog-schema.Lablog_T.user' )
                    },
                    'fileName': {
                        'required': true,
                        'type': 'String',
                        i18n: i18n( 'lablog-schema.Lablog_T.fileName' )
                    },
                    'fileHash': {
                        'required': true,
                        'type': 'String',
                        i18n: i18n( 'lablog-schema.Lablog_T.fileHash' )
                    },
                    'fileDatabaseId': {
                        'required': true,
                        'type': 'String',
                        i18n: i18n( 'lablog-schema.Lablog_T.fileDatabaseId' )
                    },
                    'configuration': {
                        'required': true,
                        'type': 'any',
                        i18n: i18n( 'lablog-schema.Lablog_T.configuration' )
                    },
                    'pmResults': {
                        'required': true,
                        'type': 'any',
                        i18n: i18n( 'lablog-schema.Lablog_T.pmResults' )
                    },
                    'type': {
                        'required': true,
                        'type': 'String',
                        i18n: i18n( 'lablog-schema.Lablog_T.type' )
                    },
                    'description': {
                        'required': false,
                        'type': 'String',
                        i18n: i18n( 'lablog-schema.Lablog_T.description' )
                    },
                    'assignedPatient': {
                        'required': true,
                        'type': 'any',
                        i18n: i18n( 'lablog-schema.Lablog_T.assignedPatient' )
                    },
                    'linkedActivities': {
                        'required': true,
                        'type': [String],
                        i18n: i18n( 'lablog-schema.Lablog_T.linkedActivities' )
                    },
                    'flow': {
                        'required': false,
                        'type': 'String',
                        i18n: i18n( 'lablog-schema.Lablog_T.flow' )
                    },
                    //still need these values, because we need to support the legacy lablog-schema
                    'flags': {
                        'required': false,
                        'type': [String],
                        i18n: i18n( 'lablog-schema.Lablog_T.flags' )
                    },
                    'associatedPatients': {//possible values: null, PatientID
                        'required': false,
                        'type': [String],
                        i18n: i18n( 'lablog-schema.Lablog_T.associatedPatients' )
                    },
                    'patientEntriesTotal': {
                        'required': false,
                        'type': 'Number',
                        i18n: i18n( 'lablog-schema.Lablog_T.patientEntriesTotal' )
                    },
                    'patientEntriesNoMatch': {
                        'required': false,
                        'type': 'Number',
                        i18n: i18n( 'lablog-schema.Lablog_T.patientEntriesNoMatch' )
                    },
                    'billingFlag': {
                        'required': false,
                        'type': 'Boolean',
                        i18n: i18n( 'lablog-schema.Lablog_T.billingFlag' )
                    },
                    'allowGkvBilling': {
                        'required': false,
                        'type': 'Boolean',
                        i18n: i18n( 'lablog-schema.Lablog_T.allowGkvBilling' )
                    },
                    'disallowGkvBilling': {
                        'required': false,
                        'type': 'Boolean',
                        i18n: i18n( 'lablog-schema.Lablog_T.disallowGkvBilling' )
                    },
                    'checkFileWithLdkPm': {
                        'required': false,
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.checkFileWithLdkPm' ),
                        '-en': 'Validate LDT3 file with LDK validation module',
                        '-de': 'Validiere LDT3-Datei mit dem LDK-Prüfmodul'
                    },
                    'useAddInfoForId': {
                        'required': false,
                        type: 'Boolean',
                        i18n: i18n( 'flow-schema.Transformer_T.useAddInfoForId' ),
                        '-en': 'use as Record Request Id',
                        '-de': 'als Anforderungs-Ident benutzen'
                    },
                    'useAddInfoForIdFK': {
                        'required': false,
                        type: 'String',
                        i18n: i18n( 'flow-schema.Transformer_T.useAddInfoForId' ),
                        '-en': 'Record Request Id',
                        '-de': 'Anforderungs-Ident'
                    },
                    'patientDiffs': {
                        'required': false,
                        'complex': 'inc',
                        'type': 'LabLogPatientDiff_T',
                        'lib': types,
                        i18n: i18n( 'lablog-schema.Lablog_T.patientDiffs' )
                    },
                    'sourceFileType': {
                        'required': false,
                        'complex': 'eq',
                        'type': 'FileTypes_E',
                        'default': 'LDT',
                        'lib': types,
                        i18n: i18n( 'lablog-schema.Lablog_T.sourceFileType' )
                    },
                    "u_extra": {
                        "type": "any",
                        i18n: i18n( 'lablog-schema.Lablog_T.u_extra' ),
                        "-en": "User-definedExtras",
                        "-de": "BenutzerdefinierteExtras"
                    },
                    "errs": {
                        "type": ["any"],
                        i18n: i18n( 'lablog-schema.Lablog_T.errs' )
                    }
                },
                'LabLogPatientDiff_T': {
                    'patientId': {
                        'type': 'String',
                        i18n: i18n( 'lablog-schema.LabLogPatientDiff_T.patientId' )
                    },
                    'nDiffs': {
                        'type': 'Number',
                        i18n: i18n( 'lablog-schema.LabLogPatientDiff_T.nDiffs' )
                    },
                    'values': {
                        'type': 'any',
                        i18n: i18n( 'lablog-schema.LabLogPatientDiff_T.values' )
                    }
                },
                'FileTypes_E': {
                    'type': 'String',
                    'list': [
                        {
                            'val': 'LDT',
                            '-de': 'LDT',
                            '-en': 'LDT'
                        },
                        {
                            'val': 'HL7',
                            '-de': 'HL7',
                            '-en': 'HL7'
                        }
                    ]
                },
                'Status_E': {
                    'type': 'String',
                    'list': [
                        {
                            'val': 'IMPORTED',
                            i18n: i18n( 'lablog-schema.Status_E.IMPORTED' )
                        },
                        {
                            'val': 'EXPORTED',
                            i18n: i18n( 'lablog-schema.Status_E.EXPORTED' )
                        },
                        {
                            'val': 'MUTATED',
                            i18n: i18n( 'lablog-schema.Status_E.MUTATED' )
                        },
                        {
                            'val': 'PROCESSING',
                            i18n: i18n( 'lablog-schema.Status_E.PROCESSING' )
                        },
                        {
                            'val': 'LOCKED',
                            i18n: i18n( 'lablog-schema.Status_E.LOCKED' )
                        }
                    ],
                    i18n: i18n( 'lablog-schema.Lablog_T.status' )
                }
            }
        );

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        var labRequestTypes = {
            '8215': 'LABREQUESTTYPE',
            '8218': 'LABREQUESTTYPE',
            '8219': 'LABREQUESTTYPE_A'
        };

        function getByPath( obj, path ) {
            if( !obj ) {
                return null;
            }
            if( !path ) {
                return obj;
            }
            path = path.split( '.' );
            var node = obj;
            var i;
            for( i = 0; i < path.length; i++ ) {
                if( node[path[i]] ) {
                    node = node[path[i]];
                } else {
                    return null;
                }
            }
            return node;
        }

        /**
         * fetches the record type, cross-version
         * @param {Object} record
         * @return {String}
         */
        function getRecordType( record ) {
            return getByPath( record, 'recordType.head' ) || record.recordType || null;
        }

        /**
         * fetches the lab name, cross-version
         * @param {Object} record
         * @return {String}
         */
        function getHeaderLabName( record ) {
            return getByPath( record, 'recordType.obj_0036Attribute.Obj_0036.obj_0043Attribute3.Obj_0043.company.head' ) || record.labName || record.bsnrDesc || null;
        }

        /**
         * fetches the type of Lab
         * @param {Object} record
         * @return {String}
         */
        function getHeaderTypeOfLab( record ) {
            return record && record.typeOfLab || null;
        }

        /**
         * fetches the lab name, cross-version
         * @param {Object} record
         * @return {String}
         */
        function getHeaderSenderName( record ) {
            return getByPath( record, 'recordType.obj_0022Attribute.Obj_0022.obj_0019Attribute.Obj_0019.bsnrDesc.head' ) || null;
        }

        /**
         * checks if a given record is a request or not
         * @param {Object} record
         * @return {Boolean}
         */
        function isRequest( record ) {
            return !!labRequestTypes[getRecordType( record )];
        }

        /**
         * checks if a given record is a finding or not
         * @param {Object} record
         * @return {Boolean}
         */
        function isFinding( record ) {
            return '8205' === getRecordType( record );
        }

        /**
         * checks if a given record is a report or request
         * @param {Object} record
         * @return {Boolean}
         */
        function isReportOrRequest( record ) {
            const type = getRecordType( record );
            return type === '8201' ||
                   type === '8202' ||
                   type === '8203' ||
                   type === '8204' ||
                   type === '8218' ||
                   type === '8219';
        }

        /**
         * checks if a given record is a header
         * @param {Object} record
         * @param {Object} versionUsed
         * @return {Boolean}
         */
        function isHeader( record, versionUsed ) {
            var
                entryName = 'undefined',
                recordType = getRecordType( record );
            try {
                entryName = Y.doccirrus.api.xdtVersions[versionUsed.type][versionUsed.name].saetze[recordType].attribute;
            } catch( e ) {
                Y.log( 'can\'t find xdt record type for ' + recordType + ': ' + e, 'warn', NAME );
                return false;
            }
            return 'dataHeader' === entryName || 'lPackageHeader' === entryName || 'pPackageHeader' === entryName;
        }

        /**
         * checks if a given record is a footer
         * @param {Object} record
         * @param {Object} versionUsed
         * @return {Boolean}
         */
        function isFooter( record, versionUsed ) {
            var
                entryName = 'undefined',
                recordType = getRecordType( record );
            try {
                entryName = Y.doccirrus.api.xdtVersions[versionUsed.type][versionUsed.name].saetze[recordType].attribute;
            } catch( e ) {
                Y.log( 'can\'t find xdt record type for ' + recordType + ': ' + e, 'warn', NAME );
                return false;
            }
            return 'dataFooter' === entryName || 'lPackageFooter' === entryName || 'pPackageFooter' === entryName;
        }

        /**
         * checks if a given record is a main object
         * @param {Object} record
         * @param {Object} versionUsed
         * @return {Boolean}
         */
        function isMainObject( record, versionUsed ) {
            if( versionUsed && versionUsed.name && versionUsed.name.includes( 'ldt20' ) ) {
                return !(isHeader( record, versionUsed ) || isFooter( record, versionUsed ));
            }
        }

        /**
         * @param {Object} ldtJson
         * @return {Object} record
         */
        function getHeader( ldtJson ) {
            var ver = ldtJson.versionUsed;
            var i, record, entryName, recordType;
            for( i = 0; i < ldtJson.records.length; i++ ) {
                record = ldtJson.records[i];

                entryName = 'undefined';
                recordType = getRecordType( record );
                try {
                    entryName = Y.doccirrus.api.xdtVersions[ver.type][ver.name].saetze[recordType].attribute;
                } catch( e ) {
                    Y.log( 'can\'t find xdt record type for ' + recordType + ': ' + e, 'warn', NAME );
                    return null;
                }

                if(
                    'lPackageHeader' === entryName ||
                    'pPackageHeader' === entryName
                ) {
                    return record;
                }
            }
            return null;
        }

        /**
         * @param {Object} header
         * @return {Date}
         */
        function getHeaderDateOfCreation( header ) {
            return getByPath( header, 'recordType.obj_0032Attribute.Obj_0032.obj_0054Attribute6.Obj_0054.timestamp' ) || header.dateOfCreation || null;
        }

        /**
         * @param {Object} header
         * @return {Date}
         */
        function getHeaderLANR( header ) {
            return getByPath( header, 'recordType.obj_0022Attribute.Obj_0022.obj_0014Attribute.Obj_0014.docLANR.0' ) ||
                   getByPath( header, 'recordType.obj_0022Attribute.Obj_0022.obj_0014Attribute2.Obj_0014.docLANR.0' ) ||
                   getByPath( header, 'recordType.obj_0022Attribute.Obj_0022.obj_0014Attribute3.Obj_0014.docLANR.0' ) ||
                   getByPath( header, 'header.docLANR.0.head' ) ||
                   null;
        }

        /**
         * @param {Object} header
         * @return {Date}
         */
        function getHeaderBSNR( header ) {
            return getByPath( header, 'recordType.obj_0019Attribute.Obj_0019.bsnrDesc.bsnr' ) || header.bsnr || null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordRequestId( record ) {
            return getByPath( record, 'recordType.obj_0013Attribute.Obj_0013.recordRequestId.head' ) ||
                   getByPath( record, 'recordType.obj_0017Attribute.Obj_0017.recordRequestId.head' ) ||
                   getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_006Attribute.Obj_0006.obj_0048Attribute.Obj_0048.recordRequestId' ) ||
                   getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0003Attribute.0.Obj_0003.codeCatalog.obj_0048Attribute.Obj_0048.recordRequestId' ) ||
                   getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0004Attribute.Obj_0004.commissionerCostCovStatement.obj_0048Attribute.Obj_0048.recordRequestId' ) ||
                   getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0005Attribute.Obj_0005.commissionerCostCovStatement.obj_0048Attribute.Obj_0048.recordRequestId' ) ||
                   record.recordRequestId ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getLabReqId( record ) {
            return getByPath( record, 'recordType.obj_0013Attribute.Obj_0013.labReqNo.head' ) ||
                   getByPath( record, 'recordType.obj_0017Attribute.Obj_0017.labReqNo.head' ) ||
                   record.labReqNo ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordFindingKind( record ) {
            return getByPath( record, 'recordType.obj_0017Attribute.Obj_0017.labReqNo.findingKind' ) ||
                   record.findingKind ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordTests( record ) {
            var tests = [];

            var testSources = [
                getByPath( record, 'recordType.obj_0035Attribute.Obj_0035.obj_0055Attribute' ),
                getByPath( record, 'recordType.obj_0059Attribute' ),
                getByPath( record, 'recordType.obj_0035Attribute.Obj_0035.obj_0060Attribute' ),
                getByPath( record, 'recordType.obj_0035Attribute.Obj_0035.obj_0061Attribute' ),
                getByPath( record, 'recordType.obj_0035Attribute.Obj_0035.obj_0062Attribute' ),
                getByPath( record, 'recordType.obj_0035Attribute.Obj_0035.obj_0063Attribute' ),
                getByPath( record, 'recordType.obj_0035Attribute.Obj_0035.obj_0073Attribute' ),
                record.testId
            ];

            testSources.forEach( function( testSource ) {
                if( testSource ) {
                    if( Array.isArray( testSource ) ) {
                        testSource.forEach( function( test ) {
                            tests.push( test );
                        } );
                    } else {
                        tests.push( testSource );
                    }
                }
            } );

            return tests.length ? tests : null;
        }

        /**
         * @param {Object} test
         * @return {Date}
         */
        function getTestId( test ) {
            return getByPath( test, 'Obj_0059.testId.head' ) ||
                   getByPath( test, 'Obj_0060.testId.head' ) ||
                   getByPath( test, 'Obj_0061.testId.head' ) ||
                   getByPath( test, 'Obj_0062.testId.head' ) ||
                   getByPath( test, 'Obj_0063.testId.head' ) ||
                   (!test.Obj_0059 && !test.Obj_0060 && !test.Obj_0061 && !test.Obj_0062 && !test.Obj_0063 && test.head) ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientNameAdd( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.patientNameAdd' ) ||
                   record.patientNameAdd ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientTitle( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.patientTitle' ) ||
                   record.patientTitle ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientPrefix( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.patientPrefix' ) ||
                   record.patientPrefix ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientFirstName( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.patientForename.0' ) ||
                   record.patientForename ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientLastName( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.patientName' ) ||
                   record.patientName ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientGender( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.patientGender' ) ||
                   record.patientGender ||
                   null;
        }

        function mapLdtGenderToDC( gender ) {
            var mappedGender = '';
            switch( gender ) {
                case 'M':
                    mappedGender = 'MALE';
                    break;
                case 'W':
                    mappedGender = 'FEMALE';
                    break;
                case 'U':
                    mappedGender = 'UNKNOWN';
                    break;
                case 'X':
                    mappedGender = 'UNDEFINED';
                    break;
            }
            return mappedGender;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientZip( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.obj_0007Attribute2.Obj_0007.patientZip.head' ) ||
                   record.patientZip ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientStreet( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.obj_0007Attribute2.Obj_0007.patientZip.patientStreet' ) ||
                   record.patientStreet ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientHouseNo( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.obj_0007Attribute2.Obj_0007.patientZip.patientHouseNo' ) ||
                   record.patientHouseNo ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientCity( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.obj_0007Attribute2.Obj_0007.patientZip.patientCity' ) ||
                   record.patientCity ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientCountrycode( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.obj_0007Attribute2.Obj_0007.patientCountrycode' ) ||
                   record.patientCountrycode ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientAddressAdd( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.obj_0007Attribute2.Obj_0007.patientZip.patientAddressAdd' ) ||
                   record.patientAddressAdd ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientPostboxZip( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.obj_0007Attribute2.Obj_0007.patientPostboxZip.head' ) ||
                   record.patientPostboxZip ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientPostbox( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.obj_0007Attribute2.Obj_0007.patientPostboxZip.patientPostbox' ) ||
                   record.patientPostbox ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientPostboxCity( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.obj_0007Attribute2.Obj_0007.patientPostboxZip.patientPostboxCity' ) ||
                   record.patientPostboxCity ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientPostboxCountrycode( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.obj_0007Attribute2.Obj_0007.patientPostboxCountrycode' ) ||
                   record.patientPostboxCountrycode ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientDoB( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.obj_0047Attribute.Obj_0047.patientDob' ) ||
                   record.patientDob ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordPatientId( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.patientId' ) ||
                   record.patientAddInfo ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordReportDate( record ) {
            return getByPath( record, 'recordType.obj_0017Attribute.Obj_0017.obj_0054Attribute5.Obj_0054.timestamp' ) ||
                   getByPath( record, 'recordType.obj_0013Attribute.Obj_0013.obj_0054Attribute2.Obj_0054.timestamp' ) ||
                   record.reportDate ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordLabReqReceived( record ) {
            return getByPath( record, 'recordType.obj_0017Attribute.Obj_0017.obj_0054Attribute5.Obj_0054.timestamp' ) ||
                   getByPath( record, 'recordType.obj_0013Attribute.Obj_0013.obj_0054Attribute2.Obj_0054.timestamp' ) ||
                   record.labReqReceived ||
                   null;
        }

        function getRecordTimestamp( record ) {
            var timestamp = new Date();
            var reportDate = getRecordReportDate( record );
            var requestDate = getRecordRequestDate( record );
            if( reportDate || requestDate ) {
                timestamp = requestDate || reportDate;
                if( typeof timestamp === 'string' ) {
                    timestamp = new Date( timestamp );
                }
                if(
                    0 === timestamp.getHours() &&
                    0 === timestamp.getMinutes() &&
                    0 === timestamp.getSeconds()
                ) {
                    timestamp.setHours( 23 );
                    timestamp.setMinutes( 0 );
                    timestamp.setSeconds( 0 );
                }
            }
            return timestamp;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordRequestDate( record ) {
            return getByPath( record, 'recordType.obj_0013Attribute.Obj_0013.recordRequestId.obj_0054Attribute3.Obj_0054.timestamp' ) ||
                   getByPath( record, 'recordType.obj_0017Attribute.Obj_0017.recordRequestId.obj_0054Attribute3.Obj_0054.timestamp' ) ||
                   getByPath( record, 'recordType.obj_0013Attribute.Obj_0013.obj_0054Attribute2.Obj_0054.timestamp' ) ||
                   getByPath( record, 'recordType.obj_0059Attribute.Obj_0059.obj_0054Attribute2.Obj_0054.timestamp' ) ||
                   record.labReqReceived ||
                   null;
        }

        /**
         * this gives you the field 'Versicherten_ID' which is insuranceNo internally.
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientInsuranceId( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.patientInsId' ) ||
                   record.patientInsId ||
                   null;
        }

        /**
         * this gives you the field 'Versichertennummer' which is kvkHistoricalNo internally.
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientInsuranceNo( record ) {
            return getByPath( record, 'recordType.obj_0045Attribute.Obj_0045.patientInsNo' ) ||
                   record.patientInsNo ||
                   null;
        }

        /**
         * this gives you the field 'Kostenträgerkennung' which is insuranceNo internally.
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientPayerNo( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.payerNo' ) ||
                   record.payerNo ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientSKT( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.insuranceSktAdd' ) ||
                   record.insuranceSktAdd ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientInsuranceFullName( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.insuranceFullName' ) ||
                   record.insuranceFullName ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientInsuranceVKNR( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.insuranceVKNR' ) ||
                   record.insuranceVKNR ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientWop( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.patientWop' ) ||
                   record.patientWop ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPayerBillingArea( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.payerBillingArea' ) ||
                   record.payerBillingArea ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientInsuranceValidToDate( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.insuranceValidToDate' ) ||
                   record.insuranceValidToDate ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientInsuranceValidFromDate( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.insuranceValidFromDate' ) ||
                   record.insuranceValidFromDate ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientInsurancelastCardReadOfQuarter( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.insurancelastCardReadOfQuarter' ) ||
                   record.insurancelastCardReadOfQuarter ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientInsuranceDmp( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.insuranceDmp' ) ||
                   record.insuranceDmp ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientInsKind( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.patientInsKind' ) ||
                   record.patientInsKind ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientInsuranceSpeGroup( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.insuranceSpeGroup' ) ||
                   record.insuranceSpeGroup ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientCardreaderCertificationNo( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0002Attribute.0.Obj_0002.cardreaderCertificationNo' ) ||
                   record.cardreaderCertificationNo ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Date}
         */
        function getRecordPatientPkvInsuranceFullName( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0003Attribute.0.Obj_0003.insuranceFullName.0' ) ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Number}
         */
        function getRecordPatientPkvInsuranceFeeSchedule( record ) {
            return getByPath( record, 'recordType.obj_0001Attribute.Obj_0001.obj_0003Attribute.0.Obj_0003.codeCatalog.head' ) ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {Number}
         */
        function getRecordFeeSchedule( record ) {
            return getRecordPatientPkvInsuranceFeeSchedule( record ) ||
                   record.feeSchedule ||
                   null;
        }

        /**
         * @param {Object} record
         * @return {String}
         */
        function getRecordBillingType( record ) {
            return record.billingType ||
                   null;
        }

        /**
         * @param {Object} test
         * @return {Array}
         */
        function getTestGnr( test ) {
            return getByPath( test, 'Obj_0055.obj_0058Attribute.Obj_0058.gnr' ) ||
                   getByPath( test, 'Obj_0060.obj_0058Attribute.Obj_0058.gnr' ) ||
                   getByPath( test, 'Obj_0061.obj_0058Attribute.Obj_0058.gnr' ) ||
                   getByPath( test, 'Obj_0062.obj_0058Attribute.Obj_0058.gnr' ) ||
                   getByPath( test, 'Obj_0063.obj_0058Attribute.Obj_0058.gnr' ) ||
                   test.gnr ||
                   null;
        }

        /**
         * @param {Object} test
         * @return {Number}
         */
        function getTestFeeSchedule( test ) {
            return getByPath( test, 'Obj_0055.obj_0058Attribute.Obj_0058.codeCatalog' ) ||
                   getByPath( test, 'Obj_0060.obj_0058Attribute.Obj_0058.codeCatalog' ) ||
                   getByPath( test, 'Obj_0061.obj_0058Attribute.Obj_0058.codeCatalog' ) ||
                   getByPath( test, 'Obj_0062.obj_0058Attribute.Obj_0058.codeCatalog' ) ||
                   getByPath( test, 'Obj_0063.obj_0058Attribute.Obj_0058.codeCatalog' ) ||
                   test.feeSchedule ||
                   null;
        }

        /**
         * @param {Object} test
         * @return {Number}
         */
        function getTestResultText( test ) {
            return getByPath( test, 'Obj_0061.obj_0068Attribute4.Obj_0068.text' ) ||
                   getByPath( test, 'Obj_0062.testId.obj_0068Attribute4.Obj_0068.text' ) ||
                   getByPath( test, 'Obj_0062.obj_0068Attribute4.Obj_0068.text' ) ||
                   getByPath( test, 'Obj_0063.obj_0068Attribute4.Obj_0068.text' ) ||
                   test.sampleResultText ||
                   null;
        }

        /**
         * @param {Object} test
         * @return {Number}
         */
        function getTestResultVal( test ) {
            return getByPath( test, 'Obj_0061.obj_0068Attribute4.Obj_0068.text' ) ||
                   getByPath( test, 'Obj_0062.testId.obj_0068Attribute4.Obj_0068.text' ) ||
                   getByPath( test, 'Obj_0062.obj_0068Attribute4.Obj_0068.text' ) ||
                   getByPath( test, 'Obj_0063.obj_0068Attribute4.Obj_0068.text' ) ||
                   test.testResultVal ||
                   null;
        }

        /**
         * @param {Object} test
         * @return {Number}
         */
        function getTestResultUnit( test ) {
            return test.TestResultUnit ||
                   null;
        }

        /**
         * fetches all available attachments (obj_0010Attribute)
         * @param {Object} record
         * @return {Array} ldt attachments
         */
        function getRecordAttachments( record ) {
            var attachmentList = [];

            function searchAttachments( obj ) {
                var keys = Object.keys( obj );
                var i, tempAttachments, j;
                for( i = 0; i < keys.length; i++ ) {
                    if( 'obj_0010Attribute' === keys[i] ) {
                        //push content to attachments list
                        if( Array.isArray( obj[keys[i]] ) ) {
                            tempAttachments = obj[keys[i]];
                            for( j = 0; j < tempAttachments.length; j++ ) {
                                if( getByPath( tempAttachments[j], 'Obj_0010.obj_0068Attribute6.Obj_0068.fileContentBase64' ) ) {
                                    attachmentList.push( tempAttachments[j] );
                                }
                            }
                        }
                    } else {
                        if( 'object' === typeof obj[keys[i]] ) {
                            searchAttachments( obj[keys[i]] );
                        }
                    }

                }
            }

            searchAttachments( record );

            return attachmentList.length ? attachmentList : null;
        }

        /**
         *  Maps patient data of a lab finding record to dc data schema.
         *
         *
         * @param {module:lablogSchema.lablog.l_data} record
         * @param {Function} getCountryByKbvCode
         * @returns {Object}
         */
        function mapRecordPatientToDCPatient( record, getCountryByKbvCode ) {
            var
                patient,
                gender = function( gender ) {
                    return mapLdtGenderToDC( getRecordPatientGender( gender ) );
                },
                map = function( mapFns, obj ) {
                    var result = obj || {};
                    Object.keys( mapFns ).forEach( function( key ) {
                        result[key] = 'function' === typeof mapFns[key] ? mapFns[key]( record ) : mapFns[key];
                    } );
                    return result;
                },
                patientAddrMapFns = {
                    kind: 'OFFICIAL',
                    street: getRecordPatientStreet,
                    houseno: getRecordPatientHouseNo,
                    zip: getRecordPatientZip,
                    city: getRecordPatientCity,
                    country: null,
                    countryCode: getRecordPatientCountrycode,
                    addon: getRecordPatientAddressAdd

                },
                patientPBoxMapFns = {
                    kind: 'POSTBOX',
                    country: null,
                    countryCode: getRecordPatientPostboxCountrycode,
                    city: getRecordPatientPostboxCity,
                    postbox: getRecordPatientPostbox,
                    zip: getRecordPatientPostboxZip
                },
                publicInsuranceMapFns = {
                    type: 'PUBLIC',
                    insuranceNo: getRecordPatientInsuranceId,
                    insuranceId: getRecordPatientPayerNo,
                    insuranceName: getRecordPatientInsuranceFullName,
                    insuranceGrpId: getRecordPatientInsuranceVKNR,
                    fk4108: getRecordPatientCardreaderCertificationNo,
                    cardSwipe: getRecordPatientInsurancelastCardReadOfQuarter,
                    fk4133: getRecordPatientInsuranceValidFromDate,
                    fk4110: getRecordPatientInsuranceValidToDate,
                    insuranceKind: getRecordPatientInsKind,
                    persGroup: getRecordPatientInsuranceSpeGroup,
                    dmp: getRecordPatientInsuranceDmp,
                    costCarrierBillingSection: getRecordPayerBillingArea,
                    locationFeatures: getRecordPatientWop
                },
                privateInsuranceMapFns = {
                    type: 'PRIVATE',
                    insuranceName: getRecordPatientPkvInsuranceFullName,
                    feeSchdule: getRecordPatientPkvInsuranceFeeSchedule

                },
                patientMapFns = {
                    title: getRecordPatientTitle,
                    firstname: getRecordPatientFirstName,
                    nameaffix: getRecordPatientNameAdd,
                    fk3120: getRecordPatientPrefix,
                    lastname: getRecordPatientLastName,
                    gender: gender,
                    dob: getRecordPatientDoB,
                    addresses: function() {
                        var addresses = [],
                            addr = map( patientAddrMapFns ),
                            pbox = map( patientPBoxMapFns );

                        if( addr && addr.countryCode ) {
                            addr.country = getCountryByKbvCode( addr.countryCode );
                        }
                        if( pbox && pbox.countryCode ) {
                            pbox.country = getCountryByKbvCode( pbox.countryCode );
                        }
                        if( addr && addr.zip ) {
                            addresses.push( addr );
                        }
                        if( pbox && pbox.zip ) {
                            addresses.push( pbox );
                        }

                        return addresses;
                    },
                    insuranceStatus: function() {
                        var
                            insurances = [],
                            publicInsurance = map( publicInsuranceMapFns ),
                            privateInsurance = map( privateInsuranceMapFns );

                        if( publicInsurance.insuranceName || publicInsurance.insuranceNo ) {
                            insurances.push( publicInsurance );
                        }

                        if( privateInsurance.insuranceName ) {
                            insurances.push( privateInsurance );
                        }

                        return insurances;
                    }
                };

            patient = map( patientMapFns );

            patient.kbvDob = patient.dob ? mom( patient.dob ).format( 'DD.MM.YYYY' ) : null;

            return patient;
        }

        function getErrorAndAttentionFromObj_0026( obj_0026Attribute ) {

            function mapObj_0026( Obj_0026 ) {
                var
                    result = {
                        noticeReason: {
                            reason: getByPath( Obj_0026, 'NoticeReason.0.head' ),
                            recallRecommended: getByPath( Obj_0026, 'NoticeReason.RecallRecommended.head' ),
                            date: getByPath( Obj_0026, 'NoticeReason.RecallRecommended.obj_0054Attribute.Obj_0054.timestamp' )
                        },
                        person: {
                            firstname: getByPath( Obj_0026, 'obj_0047Attribute.Obj_0047.patientForename.0' ),
                            lastname: getByPath( Obj_0026, 'obj_0047Attribute.Obj_0047.patientName' ),
                            title: getByPath( Obj_0026, 'obj_0047Attribute.Obj_0047.patientTitle' ),
                            status: getByPath( Obj_0026, 'obj_0047Attribute.Obj_0047.personStatus' )
                        },
                        additionalInfo: (getByPath( Obj_0026, 'obj_0068Attribute' ) || []).filter( function( obj0068 ) {
                            return Array.isArray( obj0068.Obj_0068.text );
                        } ).map( function( obj0068 ) {
                            return obj0068.Obj_0068.text.join( '' );
                        } )
                    };

                return result;

            }

            if( !obj_0026Attribute ) {
                return [];
            }

            return (Array.isArray( obj_0026Attribute ) ? obj_0026Attribute : [obj_0026Attribute]).map( function( obj0026 ) {
                return mapObj_0026( obj0026.Obj_0026 );
            } );
        }

        function getRecordErrorAndAttentionFromObj_0017( record ) {
            var
                obj_0026Attribute = getByPath( record, 'recordType.obj_0017Attribute.Obj_0017.obj_0026Attribute' ) || [];

            return getErrorAndAttentionFromObj_0026( obj_0026Attribute );
        }

        function getRecordErrorAttentionFromObj_0060( record ) {
            var results = [],
                obj_0060Attribute = getByPath( record, 'recordType.obj_0035Attribute.Obj_0035.obj_0060Attribute' ) || [];

            obj_0060Attribute.forEach( function( obj_0060 ) {
                var resultValues = getByPath( obj_0060, 'Obj_0060.resultValues' );
                resultValues.forEach( function( resultValue ) {
                    resultValue.testResultVal.forEach( function( obj ) {
                        if( Array.isArray( obj.obj_0042Attribute ) ) {
                            obj.obj_0042Attribute.forEach( function( obj1 ) {
                                var obj_0026Attribute = getByPath( obj1, 'Obj_0042.testResultLimitIndicator.obj_0026Attribute' ),
                                    arr = obj_0026Attribute && getErrorAndAttentionFromObj_0026( obj_0026Attribute );
                                if( arr && arr.length ) {
                                    [].push.apply( results, arr );
                                }
                            } );
                        }
                    } );
                } );
            } );

            return results;
        }

        function getRecordAllErrorAttention( record ) {
            return {
                Obj_0017: getRecordErrorAndAttentionFromObj_0017( record ),
                Obj_0060: getRecordErrorAttentionFromObj_0060( record )
                // TODO: recordType -> obj_0035Attribute -> Obj_0035 -> obj_0061Attribute ...
                // TODO: recordType -> obj_0035Attribute -> Obj_0035 -> obj_0062Attribute ...
                // TODO: recordType -> obj_0035Attribute -> Obj_0035 -> obj_0063Attribute ...
            };
        }

        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            types: types,

            indexes: [
                {
                    key: {
                        timestamp: 1
                    }
                },
                {
                    key: {
                        created: 1
                    }
                },
                {
                    key: {
                        source: 1
                    },
                    indexType: { sparse: true }
                },
                {
                    key: {
                        status: 1
                    }
                },
                {
                    key: {
                        type: 1
                    },
                    indexType: { sparse: true }
                },
                {
                    key: {
                        "assignedPatient.patientName": 1
                    },
                    indexType: { sparse: true }
                }
            ],

            /* OPTIONAL default items to be written to the DB on startup */
            defaultItems: [],
            name: NAME,
            /**
             * Test if a lablog 'flags' entry is associated to meta information
             * @param {String} val
             * @return {boolean}
             */
            isMeta: function( val ) {
                return 'META' === val;
            },
            /**
             * Test if a lablog 'flags' entry marks an erroneous / duplicated item
             * @param {String} val
             * @return {boolean}
             */
            isDuplicate: function( val ) {
                return 'DUPLICATE' === val;
            },
            /**
             * Test if a lablog 'flags' entry is associated to have an activity id
             * @param {String} val
             * @return {boolean}
             */
            isActivityId: function( val ) {
                return !('META' === val || 'NOMATCH' === val || 'DUPLICATE' === val);
            },
            /**
             * Test if a lablog 'flags' entry is associated to need a patient matching
             * @param {String} val
             * @return {boolean}
             */
            needsMatching: function( val ) {
                return 'NOMATCH' === val || 'DUPLICATE' === val;
            },
            labRequestTypes: labRequestTypes,
            getByPath: getByPath,
            getRecordType: getRecordType,
            getHeaderLabName: getHeaderLabName,
            getHeaderSenderName: getHeaderSenderName,
            isRequest: isRequest,
            isFinding: isFinding,
            isReportOrRequest: isReportOrRequest,
            isHeader: isHeader,
            isFooter: isFooter,
            isMainObject: isMainObject,
            getHeader: getHeader,
            getHeaderDateOfCreation: getHeaderDateOfCreation,
            getHeaderLANR: getHeaderLANR,
            getHeaderBSNR: getHeaderBSNR,
            getRecordRequestId: getRecordRequestId,
            getLabReqId: getLabReqId,
            getRecordFeeSchedule: getRecordFeeSchedule,
            getRecordBillingType: getRecordBillingType,
            getRecordTests: getRecordTests,
            getTestId: getTestId,
            getRecordPatientTitle: getRecordPatientTitle,
            getRecordPatientNameAdd: getRecordPatientNameAdd,
            getRecordPatientPrefix: getRecordPatientPrefix,
            getRecordPatientFirstName: getRecordPatientFirstName,
            getRecordPatientLastName: getRecordPatientLastName,
            getRecordPatientDoB: getRecordPatientDoB,
            getRecordPatientGender: getRecordPatientGender,
            getRecordPatientId: getRecordPatientId,
            getRecordReportDate: getRecordReportDate,
            getRecordLabReqReceived: getRecordLabReqReceived,
            getRecordRequestDate: getRecordRequestDate,
            getRecordTimestamp: getRecordTimestamp,
            getTestGnr: getTestGnr,
            getTestFeeSchedule: getTestFeeSchedule,
            getTestResultText: getTestResultText,
            getTestResultVal: getTestResultVal,
            getTestResultUnit: getTestResultUnit,
            getRecordAttachments: getRecordAttachments,
            getRecordPatientInsuranceId: getRecordPatientInsuranceId,
            getRecordPatientInsuranceNo: getRecordPatientInsuranceNo,
            getRecordPatientSKT: getRecordPatientSKT,
            getRecordFindingKind: getRecordFindingKind,
            getHeaderTypeOfLab: getHeaderTypeOfLab,
            /**
             * Test if any records of a lablog object need patient matching
             * @param {Array<module:lablogSchema.lablog>} lablog
             * @return {Boolean}
             */
            someL_dataRecordNeedsMatching: function( lablog ) {
                if( lablog && Array.isArray( lablog ) && lablog[0].assignedPatient ) {
                    return lablog.some( function( labDataRecord ) {
                        return (labDataRecord && labDataRecord.assignedPatient && labDataRecord.assignedPatient.patientId) === '';
                    } );
                } else {
                    if( !(Y.Lang.isObject( lablog ) && 'flags' in lablog && Array.isArray( lablog.flags ) && lablog.flags.length) ) {
                        return false;
                    }
                    return lablog.flags.some( Y.doccirrus.schemas.lablog.needsMatching );
                }
            },
            /**
             * Test if a record at a specified index of a lablog object need patient matching but has a 'recordRequestId'
             * @param {Number} recordIndex
             * @param {Object} lablog
             * @return {Boolean}
             */
            doesL_dataRecordIndexNeedsMatchingAndHasRecordRequestId: function( recordIndex, lablog ) {
                if(
                    !(
                        Y.Lang.isNumber( recordIndex ) && recordIndex >= 0 &&
                        Y.Lang.isObject( lablog ) && 'flags' in lablog && Array.isArray( lablog.flags ) && lablog.flags.length &&
                        'l_data' in lablog && Y.Lang.isObject( lablog.l_data ) && Array.isArray( lablog.l_data.records ) && lablog.l_data.records.length
                    )
                ) {
                    return false;
                }
                return Y.doccirrus.schemas.lablog.needsMatching( lablog.flags[recordIndex] ) && lablog.l_data.records[recordIndex] && lablog.l_data.records[recordIndex].recordRequestId;
            },
            /**
             * Maps a record properties to those of 'patient-schema'
             * @param {Object} record
             * @return {Object}
             */
            mapL_dataRecordToPatientData: function( record ) {
                record = record || {};
                var
                    title = getRecordPatientTitle( record ) || '',
                    firstname = getRecordPatientFirstName( record ),
                    nameaffix = getRecordPatientNameAdd( record ) || '',
                    fk3120 = getRecordPatientPrefix( record ) || '',
                    lastname = getRecordPatientLastName( record ) || '',

                    dob = getRecordPatientDoB( record ) || null,
                    kbvDob = !dob ? '' : mom( dob ).format( 'DD.MM.YYYY' );

                return {
                    title: title,
                    firstname: firstname,
                    nameaffix: nameaffix,
                    fk3120: fk3120,
                    lastname: lastname,

                    dob: dob,
                    kbvDob: kbvDob
                };
            },
            stringMapFindingKind: function( record, file ) {
                var
                    findingKind = getRecordFindingKind( record ),
                    versionName;

                if( findingKind && file ) {
                    versionName = Y.doccirrus.commonutils.getObject( 'l_data.versionUsed.name', false, file );
                    if( versionName ) {
                        return Y.doccirrus.api.xdtVersions.ldt[versionName].stringMappers.findingkind( findingKind );
                    }
                    return findingKind;
                }
                return '';
            },
            stringMapBillingType: function( record, file ) {
                var
                    billingType = getRecordBillingType( record ),
                    versionName;

                if( billingType && file ) {
                    versionName = Y.doccirrus.commonutils.getObject( 'l_data.versionUsed.name', false, file );
                    if( versionName ) {
                        return Y.doccirrus.api.xdtVersions.ldt[versionName].stringMappers.abrechnungstyp( billingType );
                    }
                    return billingType;
                }
                return '';
            },
            stringMapFeeSchedule: function( record, file ) {
                var
                    feeSchedule = getRecordFeeSchedule( record ),
                    versionName;

                if( feeSchedule && file ) {
                    versionName = Y.doccirrus.commonutils.getObject( 'l_data.versionUsed.name', false, file );
                    if( versionName ) {
                        return Y.doccirrus.api.xdtVersions.ldt[versionName].stringMappers.gebueO( feeSchedule );
                    }
                    return feeSchedule;
                }
                return '';
            },
            displayPmErrors: function( pmResults ) {
                var nErrors = pmResults && pmResults.nErrors || 0,
                    nWarnings = pmResults && pmResults.nWarnings || 0,
                    nInfo = pmResults && pmResults.nInfo || 0,
                    errorStr = [nErrors, nWarnings, nInfo].filter( Boolean ).join( '/' );

                return errorStr;
            },
            mapRecordPatientToDCPatient: mapRecordPatientToDCPatient,
            getRecordErrorAndAttentionFromObj_0017: getRecordErrorAndAttentionFromObj_0017,
            getRecordErrorAttentionFromObj_0060: getRecordErrorAttentionFromObj_0060,
            getRecordAllErrorAttention: getRecordAllErrorAttention

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1', {
        requires: [
            'dccommonutils',
            'dcschemaloader',
            'dcvalidations'
        ]
    }
);
