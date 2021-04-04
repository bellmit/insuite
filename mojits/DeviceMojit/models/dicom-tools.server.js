/*
 @user: jm
 @date: 2015-07-28
 */

/**
 * tools and tables needed in dicom message builder and reader
 */

//TODO make everything buffers right from the start?

/*global YUI */



YUI.add( 'dicom-tools', function( Y, NAME ) {

        var DicomTools = function() {

            /**
             * Created by jm on 2014-11-12.
             */
                
            var dicomTools = this;


            dicomTools.string2Arr = function(str) {
                var a = [];
                for (var i = 0; i < str.length; i++) {
                    a.push(str.charCodeAt(i));
                }
                return a;
            };

            dicomTools.messageTypeTags = {
                A_ASSOCIATE_RQ                : 0x01 ,
                A_ASSOCIATE_AC                : 0x02 ,
                A_ASSOCIATE_RJ                : 0x02 ,
                P_DATA_TF                     : 0x04 ,
                A_RELEASE_RQ                  : 0x05 ,
                A_RELEASE_RP                  : 0x06 ,
                A_ABORT                       : 0x07 ,
                application_context           : 0x10 ,
                presentation_context          : 0x20 ,
                presentation_context_response : 0x21 ,
                abstract_syntax               : 0x30 ,
                transfer_syntax               : 0x40 ,
                user_info                     : 0x50 ,
                maximum_length                : 0x51 ,
                implementation_class_uid      : 0x52 ,
                implementation_version_name   : 0x55
            };

            dicomTools.commands = {
                CommandGroupLength                   : {tag: [0x00,0x00,0x00,0x00], vr: "UL", vm: "1"}, // The even number of bytes from the end of the value field to the beginning of the next group.
                AffectedSOPClassUID                  : {tag: [0x00,0x00,0x02,0x00], vr: "UI", vm: "1"}, // The affected SOP Class UID associated with the operation.
                RequestedSOPClassUID                 : {tag: [0x00,0x00,0x03,0x00], vr: "UI", vm: "1"}, // The requested SOP Class UID associated with the operation.
                CommandField                         : {tag: [0x00,0x00,0x00,0x01], vr: "US", vm: "1"}, // This field distinguishes the DIMSE operation conveyed by this Message. This field shall be set to one of the commandFIeldTags.
                MessageID                            : {tag: [0x00,0x00,0x10,0x01], vr: "US", vm: "1"}, // Implementation-specific value that distinguishes this Message from otherMessages.
                MessageIDBeingRespondedTo            : {tag: [0x00,0x00,0x20,0x01], vr: "US", vm: "1"}, // Shall be set to the value of the Message ID(0000,0110) field used in associated request Message.
                MoveDestination                      : {tag: [0x00,0x00,0x00,0x06], vr: "AE", vm: "1"}, // Shall be set to the DICOM AE Title of the destination DICOM AE to which the C-STORE sub-operations are being performed.
                Priority                             : {tag: [0x00,0x00,0x00,0x07], vr: "US", vm: "1"}, // The priority shall be set to one of priorityTags.
                CommandDataSetType                   : {tag: [0x00,0x00,0x00,0x08], vr: "US", vm: "1"}, // This field indicates if a Data Set is present in the Message. This field shall be set to the value of 0x0101 if no Data Set is present; any other value indicates a DataSet is included in the Message.
                Status                               : {tag: [0x00,0x00,0x00,0x09], vr: "US", vm: "1"}, // Confirmation status of the operation. SeeAnnex C.
                OffendingElement                     : {tag: [0x00,0x00,0x01,0x09], vr: "AT", vm: "n"}, // If status is Cxxx, then this field contains alist of the elements in which the error was detected.
                ErrorComment                         : {tag: [0x00,0x00,0x02,0x09], vr: "LO", vm: "1"}, // This field contains an application-specific text description of the error detected.
                ErrorID                              : {tag: [0x00,0x00,0x03,0x09], vr: "US", vm: "1"}, // This field shall optionally contain an application-specific error code.
                AffectedSOPInstanceUID               : {tag: [0x00,0x00,0x00,0x10], vr: "UI", vm: "1"}, // Contains the UID of the SOP Instance for which this operation occurred.
                RequestedSOPInstanceUID              : {tag: [0x00,0x00,0x01,0x10], vr: "UI", vm: "1"}, // Contains the UID of the SOP Instance for which this operation occurred.
                EventTypeID                          : {tag: [0x00,0x00,0x02,0x10], vr: "US", vm: "1"}, // Values for this field are application-specific.
                AttributeIdentifierList              : {tag: [0x00,0x00,0x05,0x10], vr: "AT", vm: "n"}, // This field contains an Attribute Tag for each of the n Attributes applicable.
                ActionTypeID                         : {tag: [0x00,0x00,0x08,0x10], vr: "US", vm: "1"}, // Values for this field are application-specific.
                NumberOfRemainingSuboperations       : {tag: [0x00,0x00,0x20,0x10], vr: "US", vm: "1"}, // The number of remaining C-STORE sub-operations to be invoked for the operation.
                NumberOfCompletedSuboperations       : {tag: [0x00,0x00,0x21,0x10], vr: "US", vm: "1"}, // The number of C-STORE sub-operations associated with this operation that have completed successfully.
                NumberOfFailedSuboperations          : {tag: [0x00,0x00,0x22,0x10], vr: "US", vm: "1"}, // The number of C-STORE sub-operations associated with this operation that have failed.
                NumberOfWarningSuboperations         : {tag: [0x00,0x00,0x23,0x10], vr: "US", vm: "1"}, // The number of C-STORE sub-operations associated with this operation that generated warning responses.
                MoveOriginatorApplicationEntityTitle : {tag: [0x00,0x00,0x30,0x10], vr: "AE", vm: "1"}, // Contains the DICOM AE Title of the DICOM AE that invoked the C-MOVE operation from which this C-STORE sub-operation is being performed.
                MoveOriginatorMessageID              : {tag: [0x00,0x00,0x31,0x10], vr: "US", vm: "1"}, // Contains the Message ID (0000,0110) of the C-MOVE-RQ Message from which thisC-STORE sub-operation is being performed.

                //retired:
                CommandLengthToEnd       : {tag: [0x00,0x00,0x01,0x00], vr: "UL", vm: "1"},
                CommandRecognitionCode   : {tag: [0x00,0x00,0x10,0x00], vr: "SH", vm: "1"},
                Initiator                : {tag: [0x00,0x00,0x00,0x02], vr: "AE", vm: "1"},
                Receiver                 : {tag: [0x00,0x00,0x00,0x03], vr: "AE", vm: "1"},
                FindLocation             : {tag: [0x00,0x00,0x00,0x04], vr: "AE", vm: "1"},
                NumberOfMatches          : {tag: [0x00,0x00,0x50,0x08], vr: "US", vm: "1"},
                ResponseSequenceNumber   : {tag: [0x00,0x00,0x60,0x08], vr: "US", vm: "1"},
                DialogReceiver           : {tag: [0x00,0x00,0x00,0x40], vr: "LT", vm: "1"},
                TerminalType             : {tag: [0x00,0x00,0x10,0x40], vr: "LT", vm: "1"},
                MessageSetID             : {tag: [0x00,0x00,0x10,0x50], vr: "SH", vm: "1"},
                EndMessageID             : {tag: [0x00,0x00,0x20,0x50], vr: "SH", vm: "1"},
                DisplayFormat            : {tag: [0x00,0x00,0x10,0x51], vr: "LT", vm: "1"},
                PagePositionID           : {tag: [0x00,0x00,0x20,0x51], vr: "LT", vm: "1"},
                TextFormatID             : {tag: [0x00,0x00,0x30,0x51], vr: "CS", vm: "1"},
                NormalReverse            : {tag: [0x00,0x00,0x40,0x51], vr: "CS", vm: "1"},
                AddGrayScale             : {tag: [0x00,0x00,0x50,0x51], vr: "CS", vm: "1"},
                Borders                  : {tag: [0x00,0x00,0x60,0x51], vr: "CS", vm: "1"},
                Copies                   : {tag: [0x00,0x00,0x70,0x51], vr: "IS", vm: "1"},
                CommandMagnificationType : {tag: [0x00,0x00,0x80,0x51], vr: "CS", vm: "1"},
                Erase                    : {tag: [0x00,0x00,0x90,0x51], vr: "CS", vm: "1"},
                Print                    : {tag: [0x00,0x00,0xA0,0x51], vr: "CS", vm: "1"},
                Overlays                 : {tag: [0x00,0x00,0xB0,0x51], vr: "US", vm: "n"}
            };

            dicomTools.dataFields = {
                //base data
                BaseFieldsLength                : {tag: [0x08,0x00,0x00,0x00], vr: "UL", vm: "1"},
                SpecificCharacterSet            : {tag: [0x08,0x00,0x08,0x00], vr: "CS", vm: "n"},
                LanguageCodeSequence            : {tag: [0x08,0x00,0x06,0x00], vr: "SQ", vm: "1"},
                ImageType                       : {tag: [0x08,0x00,0x08,0x00], vr: "CS", vm: "nn"},
                InstanceCreationDate            : {tag: [0x08,0x00,0x12,0x00], vr: "DA", vm: "1"},
                InstanceCreationTime            : {tag: [0x08,0x00,0x13,0x00], vr: "TM", vm: "1"},
                InstanceCreatorUID              : {tag: [0x08,0x00,0x14,0x00], vr: "UI", vm: "1"},
                InstanceCoercionDateTime        : {tag: [0x08,0x00,0x15,0x00], vr: "DT", vm: "1"},
                SOPClassUID                     : {tag: [0x08,0x00,0x16,0x00], vr: "UI", vm: "1"},
                SOPInstanceUID                  : {tag: [0x08,0x00,0x18,0x00], vr: "UI", vm: "1"},
                RelatedGeneralSOPClassUID       : {tag: [0x08,0x00,0x1a,0x00], vr: "UI", vm: "n"},
                OriginalSpecializedSOPClassUID  : {tag: [0x08,0x00,0x1b,0x00], vr: "UI", vm: "1"},
                StudyDate                       : {tag: [0x08,0x00,0x20,0x00], vr: "DA", vm: "1"},
                SeriesDate                      : {tag: [0x08,0x00,0x21,0x00], vr: "DA", vm: "1"},
                AcquisitionDate                 : {tag: [0x08,0x00,0x22,0x00], vr: "DA", vm: "1"},
                ContentDate                     : {tag: [0x08,0x00,0x23,0x00], vr: "DA", vm: "1"},
                AcquisitionDateTime             : {tag: [0x08,0x00,0x2A,0x00], vr: "DT", vm: "1"},
                StudyTime                       : {tag: [0x08,0x00,0x30,0x00], vr: "TM", vm: "1"},
                SeriesTime                      : {tag: [0x08,0x00,0x31,0x00], vr: "TM", vm: "1"},
                AcquisitionTime                 : {tag: [0x08,0x00,0x32,0x00], vr: "TM", vm: "1"},
                ContentTime                     : {tag: [0x08,0x00,0x33,0x00], vr: "TM", vm: "1"},
                AccessionNumber                 : {tag: [0x08,0x00,0x50,0x00], vr: "SH", vm: "1"},
                IssuerOfAccessionNumberSequence : {tag: [0x08,0x00,0x51,0x00], vr: "SQ", vm: "1"},
                QueryRetrieveLevel              : {tag: [0x08,0x00,0x52,0x00], vr: "CS", vm: "1"},

                StudyDescription                : {tag: [0x08,0x00,0x30,0x10], vr: "LO", vm: "1"},

                //patient data
                PatientFieldsLength                 : {tag: [0x10,0x00,0x00,0x00], vr: "UL", vm: "1"},
                PatientName                         : {tag: [0x10,0x00,0x10,0x00], vr: "SQ", vm: "1"},
                PatientID                           : {tag: [0x10,0x00,0x20,0x00], vr: "SQ", vm: "1"},
                IssuerOfPatientID                   : {tag: [0x10,0x00,0x21,0x00], vr: "SQ", vm: "1"},
                TypeOfPatientID                     : {tag: [0x10,0x00,0x22,0x00], vr: "SQ", vm: "1"},
                IssuerOfPatientIDQualifiersSequence : {tag: [0x10,0x00,0x24,0x00], vr: "SQ", vm: "1"},
                PatientBirthDate                    : {tag: [0x10,0x00,0x30,0x00], vr: "SQ", vm: "1"},
                PatientBirthTime                    : {tag: [0x10,0x00,0x32,0x00], vr: "SQ", vm: "1"},
                PatientSex                          : {tag: [0x10,0x00,0x40,0x00], vr: "SQ", vm: "1"},
                PatientInsurancePlanCodeSequence    : {tag: [0x10,0x00,0x50,0x00], vr: "SQ", vm: "1"},

                //specific data
                SpecificFieldsLength : {tag: [0x20,0x00,0x00,0x00], vr: "UL", vm: "1"},
                StudyInstanceUID     : {tag: [0x20,0x00,0x0d,0x00], vr: "UI", vm: "1"},
                SeriesInstanceUID    : {tag: [0x20,0x00,0x0e,0x00], vr: "UI", vm: "1"},
                StudyID              : {tag: [0x20,0x00,0x10,0x00], vr: "SH", vm: "1"},

                NumberOfPatientRelatedStudies   : {tag: [0x20,0x00,0x00,0x12], vr: "IS", vm: "1"},
                NumberOfPatientRelatedSeries    : {tag: [0x20,0x00,0x02,0x12], vr: "IS", vm: "1"},
                NumberOfPatientRelatedInstances : {tag: [0x20,0x00,0x04,0x12], vr: "IS", vm: "1"},
                NumberOfStudyRelatedSeries      : {tag: [0x20,0x00,0x06,0x12], vr: "IS", vm: "1"},
                NumberOfStudyRelatedInstances   : {tag: [0x20,0x00,0x08,0x12], vr: "IS", vm: "1"},
                NumberOfSeriesRelatedInstances  : {tag: [0x20,0x00,0x09,0x12], vr: "IS", vm: "1"},

                //retired:
                LengthToEnd               : {tag: [0x08,0x00,0x01,0x00], vr: "UL", vm: "1"},
                RecognitionCode           : {tag: [0x08,0x00,0x10,0x00], vr: "SH", vm: "1"},
                OverlayDate               : {tag: [0x08,0x00,0x24,0x00], vr: "DA", vm: "1"},
                CurveDate                 : {tag: [0x08,0x00,0x25,0x00], vr: "DA", vm: "1"},
                OverlayTime               : {tag: [0x08,0x00,0x34,0x00], vr: "TM", vm: "1"},
                CurveTime                 : {tag: [0x08,0x00,0x35,0x00], vr: "TM", vm: "1"},
                DataSetType               : {tag: [0x08,0x00,0x40,0x00], vr: "US", vm: "1"},
                DataSetSubtype            : {tag: [0x08,0x00,0x41,0x00], vr: "LO", vm: "1"},
                NuclearMedicineSeriesType : {tag: [0x08,0x00,0x42,0x00], vr: "CS", vm: "1"}
            };

            dicomTools.dataTypes = {
                // Application Entity
                AE: {len: 16},
                // Age String
                AS: {len: 4, chars: "0123456789DWMY"},
                // Attribute Tag
                AT: {len: 4},
                // Code String
                CS: {len: 16, chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 _"},
                // Date
                DA: {len: 18, chars: "0123456789- "},
                // Decimal String
                DS: {len: 16, chars: "0123456789+-Ee. "},
                // Date Time
                DT: {len: 54, chars: "0123456789+-. "},
                // Floating PointSingle
                FL: {len: 4},
                // Floating PointDouble
                FD: {len: 8},
                // Integer String
                IS: {len: 12, chars: "0123456789+- "},
                // Long String
                LO: {len: 64},
                // Long Text
                LT: {len: 10240},
                // Other Byte String
                OB: {len: 0},
                // Other Double String
                OD: {len: 4294967288},
                // Other Float String
                OF: {len: 4294967292},
                // Other Word String
                OW: {len: 0},
                // Person Name
                PN: {len: 64},
                // Short String
                SH: {len: 16},
                // Signed Long
                SL: {len: 4},
                // Sequence of Items
                SQ: {len: 0},
                // Signed Short
                SS: {len: 2},
                // Short Text
                ST: {len: 1024},
                // Time
                TM: {len: 28, chars: "0123456789.- "},
                // Unlimited Characters
                UC: {len: 4294967294},
                // Unique Identifier (UID)
                UI: {len: 64, chars: "0123456789."},
                // Unsigned Long
                UL: {len: 4},
                // Unknown
                UN: {len: 4294967296},
                // Universal Resource Identifier or Universal Resource Locator (URI/URL)
                UR: {len: 4294967294},
                // Unsigned Short
                US: {len: 2},
                // Unlimited Text
                UT: {len: 4294967294}
            };

            dicomTools.statusCodes = {
                GENERIC: {
                    SUCCESS: "0000",
                    FAILURE: "Axxx",
                    WARNING: "Bxxx",
                    ERROR_CANNOT_UNDERSTAND: "Cxxx",
                    CANCEL: "FExx",
                    PENDING: "FFxx"
                },
                C_STORE: {
                    REFUSED_OUT_OF_RES: "A7xx",
                    ERROR_DATA_SET_NO_MATCHING_SOPC: "A9xx",
                    ERROR_CANNOT_UNDERSTAND: "Cxxx",
                    WARNING_COERCION_OF_DATA_ELEM: "B000",
                    WARNING_DATA_SET_NO_MATCHING_SOPC: "B007",
                    WARNING_ELEMENTS_DISCARDED: "B006",
                    SUCCESS: "0000"
                },
                C_FIND: {
                    REFUSED_OUT_OF_RES: "A700",
                    ERROR_DATA_SET_NO_MATCHING_SOPC: "A900",
                    ERROR_CANNOT_UNDERSTAND: "Cxxx",
                    CANCEL_DUE_TO_CANCEL_REQ: "FE00",
                    SUCCESS: "0000",
                    PENDING_MATCHES_CONT_ALL_KEYS_OK: "FF00",
                    PENDING_MATCHES_CONT_SOME_KEYS_UNSUPPORTED: "FF01"
                },
                C_MOVE: {
                    REFUSED_OUT_OF_RES_CANNOT_CALC_NO_MATCHES: "A701",
                    REFUSED_OUT_OF_RES_CANNOT_PERF_SUBOP: "A702",
                    REFUSED_MOVE_DESTINATION_UNKNOWN: "A801",
                    ERROR_ID_NO_MATCHING_SOPC: "A900",
                    ERROR_CANNOT_UNDERSTAND: "Cxxx",
                    CANCEL_DUE_TO_CANCEL_REQ: "FE00",
                    WARNING_SUBOP_DONE_WITH_FAILURES: "B000",
                    SUCCESS_NO_FAILURES: "0000",
                    PENDING_SUBOP_CONT: "FF00"
                },
                C_GET: {
                    REFUSED_OUT_OF_RES_CANNOT_CALC_NO_MATCHES: "A701",
                    REFUSED_OUT_OF_RES_CANNOT_PERF_SUBOP: "A702",
                    ERROR_ID_NO_MATCHING_SOPC: "A900",
                    ERROR_CANNOT_UNDERSTAND: "Cxxx",
                    CANCEL_DUE_TO_CANCEL_REQ: "FE00",
                    WARNING_SUBOP_DONE_WITH_FAILURES: "B000",
                    SUCCESS_NO_FAILURES: "0000",
                    PENDING_SUBOP_CONT: "FF00"
                },
                N_SET: {
                    ERROR_PROCESSING_FAILURE: "A710"
                }
            };

            dicomTools.statusCodesString = function(b){
                var ret = "unknown code";
                if (0===b[0]&&0===b[1]) {ret = "SUCCESS";}
                if (0xA0<=b[0]&&0xB0>b[0]) {ret = "FAILURE";}
                if (0xB0<=b[0]&&0xC0>b[0]) {ret = "WARNING";}
                if (0xC0<=b[0]&&0xD0>b[0]) {ret = "ERROR_CANNOT_UNDERSTAND";}
                if (0xFE<=b[0]&&0xFF>b[0]) {ret = "CANCEL";}
                if (0xFF<=b[0]) {ret = "PENDING";}

                return ret+" (0x"+b[0].toString(16)+" 0x"+b[1].toString(16)+")";
            };

            dicomTools.defaults = {
                application_context_name: dicomTools.string2Arr("1.2.840.10008.3.1.1.1"),
                multi_val_delimiter: 0x5c //TODO most likely wrong, as the delimiter should be defined on a per-type basis
            };

            dicomTools.commandFIeldTags = {
                C_STORE_RQ         : [0x01,0x00],
                C_STORE_RSP        : [0x01,0x80],
                C_GET_RQ           : [0x10,0x00],
                C_GET_RSP          : [0x10,0x80],
                C_FIND_RQ          : [0x20,0x00],
                C_FIND_RSP         : [0x20,0x80],
                C_MOVE_RQ          : [0x21,0x00],
                C_MOVE_RSP         : [0x21,0x80],
                C_ECHO_RQ          : [0x30,0x00],
                C_ECHO_RSP         : [0x30,0x80],
                N_EVENT_REPORT_RQ  : [0x00,0x01],
                N_EVENT_REPORT_RSP : [0x00,0x81],
                N_GET_RQ           : [0x10,0x01],
                N_GET_RSP          : [0x10,0x81],
                N_SET_RQ           : [0x20,0x01],
                N_SET_RSP          : [0x20,0x81],
                N_ACTION_RQ        : [0x30,0x01],
                N_ACTION_RSP       : [0x30,0x81],
                N_CREATE_RQ        : [0x40,0x01],
                N_CREATE_RSP       : [0x40,0x81],
                N_DELETE_RQ        : [0x50,0x01],
                N_DELETE_RSP       : [0x50,0x81],
                C_CANCEL_RQ        : [0xFF,0x0F]
            };

            dicomTools.priority = {
                LOW    : [0x02,0x00],
                MEDIUM : [0x00,0x00],
                HIGH   : [0x01,0x00]
            };

            dicomTools.dataSetPresent = {
                TRUE  : [0x02,0x01],
                FALSE : [0x01,0x01]
            };

            dicomTools.serviceClasses = {//TODO add remaining special entries
                verification                      : dicomTools.string2Arr("1.2.840.10008.1.1"          ),
                storageCommitmentPushModel        : dicomTools.string2Arr("1.2.840.10008.1.20.1"       ),
                proceduralEventLogging            : dicomTools.string2Arr("1.2.840.10008.1.40"         ),
                substanceAdministrationLogging    : dicomTools.string2Arr("1.2.840.10008.1.42"         ),
                storage                           : dicomTools.string2Arr("1.2.840.10008.4.2"          ),
                patientRoot_FIND                  : dicomTools.string2Arr("1.2.840.10008.5.1.4.1.2.1.1"),
                patientRoot_MOVE                  : dicomTools.string2Arr("1.2.840.10008.5.1.4.1.2.1.2"),
                patientRoot_GET                   : dicomTools.string2Arr("1.2.840.10008.5.1.4.1.2.1.3"),
                studyRoot_FIND                    : dicomTools.string2Arr("1.2.840.10008.5.1.4.1.2.2.1"),
                studyRoot_MOVE                    : dicomTools.string2Arr("1.2.840.10008.5.1.4.1.2.2.2"),
                studyRoot_GET                     : dicomTools.string2Arr("1.2.840.10008.5.1.4.1.2.2.3"),
                modPerformedProc_Step             : dicomTools.string2Arr("1.2.840.10008.3.1.2.3.3"    ),
                modPerformedProc_StepRetrieve     : dicomTools.string2Arr("1.2.840.10008.3.1.2.3.4"    ),
                modPerformedProc_StepNotify       : dicomTools.string2Arr("1.2.840.10008.3.1.2.3.5"    ),
                basicGrayscPrintMgmtMeta          : dicomTools.string2Arr("1.2.840.10008.5.1.1.9"      ),
                basicColorPrintMgmtMeta           : dicomTools.string2Arr("1.2.840.10008.5.1.1.18"     ),
                basicFilmSession                  : dicomTools.string2Arr("1.2.840.10008.5.1.1.1"      ),
                basicFilmBox                      : dicomTools.string2Arr("1.2.840.10008.5.1.1.2"      ),
                basicGrayscaleImageBox            : dicomTools.string2Arr("1.2.840.10008.5.1.1.4"      ),
                basicColorImageBox                : dicomTools.string2Arr("1.2.840.10008.5.1.1.4.1"    ),
                basicAnnotationBox                : dicomTools.string2Arr("1.2.840.10008.5.1.1.15"     ),
                printJob                          : dicomTools.string2Arr("1.2.840.10008.5.1.1.14"     ),
                printer                           : dicomTools.string2Arr("1.2.840.10008.5.1.1.16"     ),
                presentationLUT                   : dicomTools.string2Arr("1.2.840.10008.5.1.1.23"     ),
                printerConfigurationRetrieval     : dicomTools.string2Arr("1.2.840.10008.5.1.1.16.376" ),
                mediaCreationManagement           : dicomTools.string2Arr("1.2.840.10008.5.1.1.33"     ),
                modalityWorklist_FIND             : dicomTools.string2Arr("1.2.840.10008.5.1.4.31"     ),
                PatientInfoQuery_generalRel       : dicomTools.string2Arr("1.2.840.10008.5.1.4.37.1"   ),
                PatientInfoQuery_breastImagingRel : dicomTools.string2Arr("1.2.840.10008.5.1.4.37.2"   ),
                PatientInfoQuery_cardiacRel       : dicomTools.string2Arr("1.2.840.10008.5.1.4.37.3"   ),
                instanceAvailabilityNotification  : dicomTools.string2Arr("1.2.840.10008.5.1.4.33"     ),
                hangingProtocol_Storage           : dicomTools.string2Arr("1.2.840.10008.5.1.4.38.1"   ),
                hangingProtocol_InfoModelFIND     : dicomTools.string2Arr("1.2.840.10008.5.1.4.38.2"   ),
                hangingProtocol_InfoModelMOVE     : dicomTools.string2Arr("1.2.840.10008.5.1.4.38.3"   ),
                hangingProtocol_InfoModelGET      : dicomTools.string2Arr("1.2.840.10008.5.1.4.38.4"   ),
                productCharQueryInfoModel_FIND    : dicomTools.string2Arr("1.2.840.10008.5.1.4.41"     ),
                substanceApprQueryInfoModel_FIND  : dicomTools.string2Arr("1.2.840.10008.5.1.4.42"     ),
                colorPalette_Storage              : dicomTools.string2Arr("1.2.840.10008.5.1.4.39.1"   ),
                colorPalette_InfoModel_FIND       : dicomTools.string2Arr("1.2.840.10008.5.1.4.39.2"   ),
                colorPalette_InfoModel_MOVE       : dicomTools.string2Arr("1.2.840.10008.5.1.4.39.3"   ),
                colorPalette_InfoModel_GET        : dicomTools.string2Arr("1.2.840.10008.5.1.4.39.4"   ),
                compIns_RootRetrieve_MOVE         : dicomTools.string2Arr("1.2.840.10008.5.1.4.1.2.4.2"),
                compIns_RootRetrieve_GET          : dicomTools.string2Arr("1.2.840.10008.5.1.4.1.2.4.3"),
                compIns_RetrieveNoBulkData_GET    : dicomTools.string2Arr("1.2.840.10008.5.1.4.1.2.5.3"),
                genImplantTemplateInfoModel_FIND  : dicomTools.string2Arr("1.2.840.10008.5.1.4.43.2"   ),
                genImplantTemplateInfoModel_MOVE  : dicomTools.string2Arr("1.2.840.10008.5.1.4.43.3"   ),
                genImplantTemplateInfoModel_GET   : dicomTools.string2Arr("1.2.840.10008.5.1.4.43.4"   ),
                implAssemblyTemplInfoModel_FIND   : dicomTools.string2Arr("1.2.840.10008.5.1.4.44.2"   ),
                implAssemblyTemplInfoModel_MOVE   : dicomTools.string2Arr("1.2.840.10008.5.1.4.44.3"   ),
                implAssemblyTemplInfoModel_GET    : dicomTools.string2Arr("1.2.840.10008.5.1.4.44.4"   ),
                implTemplGroupInfoModel_FIND      : dicomTools.string2Arr("1.2.840.10008.5.1.4.45.2"   ),
                implTemplGroupInfoModel_MOVE      : dicomTools.string2Arr("1.2.840.10008.5.1.4.45.3"   ),
                implTemplGroupInfoModel_GET       : dicomTools.string2Arr("1.2.840.10008.5.1.4.45.4"   )
            };

            dicomTools.upsClasses = {
                push  : dicomTools.string2Arr("1.2.840.10008.5.1.4.34.6.1"),
                watch : dicomTools.string2Arr("1.2.840.10008.5.1.4.34.6.2"),
                pull  : dicomTools.string2Arr("1.2.840.10008.5.1.4.34.6.3"),
                event : dicomTools.string2Arr("1.2.840.10008.5.1.4.34.6.4")
            };

            dicomTools.transferSyntax = {
                implicitVRLittleEndian         : dicomTools.string2Arr("1.2.840.10008.1.2"      ),
                explicitVRLittleEndian         : dicomTools.string2Arr("1.2.840.10008.1.2.1"    ),
                explicitVRLittleEndianDeflated : dicomTools.string2Arr("1.2.840.10008.1.2.1.99" ),
                lossyJPEGImageCompression      : dicomTools.string2Arr("1.2.840.10008.1.2.4.50" ),
                jpegCodingProcess_2_4          : dicomTools.string2Arr("1.2.840.10008.1.2.4.51" ),
                jpegCodingProcess_14           : dicomTools.string2Arr("1.2.840.10008.1.2.4.57" ),
                losslessJPEGImageCompression   : dicomTools.string2Arr("1.2.840.10008.1.2.4.70" ),
                jpegLsLossles                  : dicomTools.string2Arr("1.2.840.10008.1.2.4.80" ),
                jpegLsLossy                    : dicomTools.string2Arr("1.2.840.10008.1.2.4.81" ),
                jpeg2kP1Lossles                : dicomTools.string2Arr("1.2.840.10008.1.2.4.90" ),
                jpeg2kP1Lossy                  : dicomTools.string2Arr("1.2.840.10008.1.2.4.91" ),
                jpeg2kP2Lossles                : dicomTools.string2Arr("1.2.840.10008.1.2.4.92" ),
                jpeg2kP2Lossy                  : dicomTools.string2Arr("1.2.840.10008.1.2.4.93" ),
                jpip                           : dicomTools.string2Arr("1.2.840.10008.1.2.4.94" ),
                jpipDeflate                    : dicomTools.string2Arr("1.2.840.10008.1.2.4.95" ),
                mpeg2MPML                      : dicomTools.string2Arr("1.2.840.10008.1.2.4.100"),
                mpeg2MPHL                      : dicomTools.string2Arr("1.2.840.10008.1.2.4.101"),
                mpeg4AVCH264HP41               : dicomTools.string2Arr("1.2.840.10008.1.2.4.102"),
                mpeg4AVCH264BDHP41             : dicomTools.string2Arr("1.2.840.10008.1.2.4.103"),
                mpeg4AVCH264HP42               : dicomTools.string2Arr("1.2.840.10008.1.2.4.104"),
                mpeg4AVCH264BDHP42             : dicomTools.string2Arr("1.2.840.10008.1.2.4.105"),
                mpeg4AVCH264BDHP42stereo       : dicomTools.string2Arr("1.2.840.10008.1.2.4.106"),
                rle                            : dicomTools.string2Arr("1.2.840.10008.1.2.5"    ),
                rfc2557                        : dicomTools.string2Arr("1.2.840.10008.1.2.6.1"  ),
                xml                            : dicomTools.string2Arr("1.2.840.10008.1.2.6.2"  ),

                //retired:
                explicitVRBigEndian     : dicomTools.string2Arr("1.2.840.10008.1.2.2"    ),
                jpegCodingProcess_3_5   : dicomTools.string2Arr("1.2.840.10008.1.2.4.52" ),
                jpegCodingProcess_6_8   : dicomTools.string2Arr("1.2.840.10008.1.2.4.53" ),
                jpegCodingProcess_7_9   : dicomTools.string2Arr("1.2.840.10008.1.2.4.54" ),
                jpegCodingProcess_10_12 : dicomTools.string2Arr("1.2.840.10008.1.2.4.55" ),
                jpegCodingProcess_11_13 : dicomTools.string2Arr("1.2.840.10008.1.2.4.56" ),
                jpegCodingProcess_15    : dicomTools.string2Arr("1.2.840.10008.1.2.4.58" ),
                jpegCodingProcess_16_18 : dicomTools.string2Arr("1.2.840.10008.1.2.4.59" ),
                jpegCodingProcess_17_19 : dicomTools.string2Arr("1.2.840.10008.1.2.4.60" ),
                jpegCodingProcess_20_22 : dicomTools.string2Arr("1.2.840.10008.1.2.4.61" ),
                jpegCodingProcess_21_23 : dicomTools.string2Arr("1.2.840.10008.1.2.4.62" ),
                jpegCodingProcess_24_26 : dicomTools.string2Arr("1.2.840.10008.1.2.4.63" ),
                jpegCodingProcess_25_27 : dicomTools.string2Arr("1.2.840.10008.1.2.4.64" ),
                jpegCodingProcess_28    : dicomTools.string2Arr("1.2.840.10008.1.2.4.65" ),
                jpegCodingProcess_29    : dicomTools.string2Arr("1.2.840.10008.1.2.4.66" )

            };

            dicomTools.frameOfReference = {
                talairachBrainAtlas   : dicomTools.string2Arr("1.2.840.10008.1.4.1.1" ),
                spm2_t1               : dicomTools.string2Arr("1.2.840.10008.1.4.1.2" ),
                spm2_t2               : dicomTools.string2Arr("1.2.840.10008.1.4.1.3" ),
                spm2_pd               : dicomTools.string2Arr("1.2.840.10008.1.4.1.4" ),
                spm2_epi              : dicomTools.string2Arr("1.2.840.10008.1.4.1.5" ),
                spm2_fil_t1           : dicomTools.string2Arr("1.2.840.10008.1.4.1.6" ),
                spm2_pet              : dicomTools.string2Arr("1.2.840.10008.1.4.1.7" ),
                spm2_transm           : dicomTools.string2Arr("1.2.840.10008.1.4.1.8" ),
                spm2_spect            : dicomTools.string2Arr("1.2.840.10008.1.4.1.9" ),
                spm2_gray             : dicomTools.string2Arr("1.2.840.10008.1.4.1.10" ),
                spm2_white            : dicomTools.string2Arr("1.2.840.10008.1.4.1.11" ),
                spm2_csf              : dicomTools.string2Arr("1.2.840.10008.1.4.1.12" ),
                spm2_brainmask        : dicomTools.string2Arr("1.2.840.10008.1.4.1.13" ),
                spm2_avg305t1         : dicomTools.string2Arr("1.2.840.10008.1.4.1.14" ),
                spm2_avg152t1         : dicomTools.string2Arr("1.2.840.10008.1.4.1.15" ),
                spm2_avg152t2         : dicomTools.string2Arr("1.2.840.10008.1.4.1.16" ),
                spm2_avg152pd         : dicomTools.string2Arr("1.2.840.10008.1.4.1.17" ),
                spm2_singlesubjt1     : dicomTools.string2Arr("1.2.840.10008.1.4.1.18" ),
                icbm_452_t1           : dicomTools.string2Arr("1.2.840.10008.1.4.2.1" ),
                icbm_SingleSubjectMRI : dicomTools.string2Arr("1.2.840.10008.1.4.2.2" )
            };

            dicomTools.ASSAC_presentation_resultreason = {
                "0": "ACCEPTED",
                "1": "REJ_USER",
                "2": "REJ_NO_REASON",
                "3": "REJ_ABSTRACT_SYNTAX",
                "4": "REJ_TRANSFER_SYNTAX"
            };

            dicomTools.ASSRJ_presentation_result = {
                "1": "REJ_PERMANENT",
                "2": "REJ_TRANSIENT"
            };

            dicomTools.ASSRJ_presentation_source = {
                "1": "SERVICE_USER",
                "2": "SERVICE_PROVIDER_ACSE",
                "3": "SERVICE_PROVIDER_PRESENTATION"
            };

            dicomTools.ASSRJ_presentation_diag = {
                SERVICE_USER: {
                    "1": "REJ_NO_REASON",
                    "2": "REJ_APPLICATION_CONTEXT",
                    "3": "REJ_CALLING_AE_TITLE",
                    "4": "REJ_RESERVED_4",
                    "5": "REJ_RESERVED_5",
                    "6": "REJ_RESERVED_6",
                    "7": "REJ_CALLED_AE_TITLE",
                    "8": "REJ_RESERVED_8",
                    "9": "REJ_RESERVED_9",
                    "10": "REJ_RESERVED_10"
                },
                SERVICE_PROVIDER_ACSE: {
                    "0": "REJ_NO_REASON",
                    "1": "REJ_PROTOCOL_VERSION"
                },
                SERVICE_PROVIDER_PRESENTATION: {
                    "0": "REJ_RESERVED",
                    "1": "REJ_TEMPORARY_CONGESTIO",
                    "2": "REJ_LOCAL_LIMIT_EXCEEDED",
                    "3": "REJ_RESERVED_3",
                    "4": "REJ_RESERVED_4",
                    "5": "REJ_RESERVED_5",
                    "6": "REJ_RESERVED_6",
                    "7": "REJ_RESERVED_7"
                }
            };

            dicomTools.ABORT_source = {
                "0": "SERVICE_USER",
                "1": "RESERVED",
                "2": "SERVICE_PROVIDER"
            };

            dicomTools.ABORT_diag = {
                "0": "NO_REASON",
                "1": "UNRECOGNIZED_PDU",
                "2": "UNEXPECTED_PDU",
                "3": "RESERVED",
                "4": "UNRECOGNIZED_PDU_PARAMETER",
                "5": "UNEXPECTED_PDU_PARAMETER",
                "6": "INVALID_PDU_PARAMETER_VAL"
            };

            dicomTools.states = {
                "sta1"  : "Idle",
                "sta2"  : "Transport connection open (Awaiting A-ASSOCIATE-RQ PDU)",
                "sta3"  : "Awaiting local A-ASSOCIATE response primitive (from local user)",
                "sta4"  : "Awaiting transport connection opening to complete (from local transport service)",
                "sta5"  : "Awaiting A-ASSOCIATE-AC or A-ASSOCIATE-RJ PDU",
                "sta6"  : "Association established and ready for data transfer",
                "sta7"  : "Awaiting A-RELEASE-RP PDU",
                "sta8"  : "Awaiting local A-RELEASE response primitive (from local user)",
                "sta9"  : "Release collision requestor side; awaiting A-RELEASE response (from local user)",
                "sta10" : "Release collision acceptor side; awaiting A-RELEASE-RP PDU",
                "sta11" : "Release collision requestor side; awaiting A-RELEASE-RP PDU",
                "sta12" : "Release collision acceptor side; awaiting A-RELEASE response primitive (from local user)",
                "sta13" : "Awaiting Transport Connection Close Indication (Association no longer exists)"
            };

            dicomTools.stateIDs = {
                "sta1"  : 0,
                "sta2"  : 1,
                "sta3"  : 2,
                "sta4"  : 3,
                "sta5"  : 4,
                "sta6"  : 5,
                "sta7"  : 6,
                "sta8"  : 7,
                "sta9"  : 8,
                "sta10" : 9,
                "sta11" : 10,
                "sta12" : 11,
                "sta13" : 12
            };


            dicomTools.actions = {
                //Association Establishment
                "AE-1" : "Issue TRANSPORT CONNECT request primitive to local transport service",
                "AE-2" : "Send A-ASSOCIATE-RQ-PDU",
                "AE-3" : "Issue A-ASSOCIATE confirmation (accept) primitive",
                "AE-4" : "Issue A-ASSOCIATE confirmation (reject) primitive and close transport connection",
                "AE-5" : "Issue Transport connection response primitive; start ARTIM timer",
                "AE-6" : "Stop ARTIM timer and issue A-ASSOCIATE-AC-PDU / issue A-ASSOCIATE-RJ-PDU and start ARTIM timer",
                "AE-7" : "Send A-ASSOCIATE-AC PDU",
                "AE-8" : "Send A-ASSOCIATE-RJ PDU and start ARTIM timer",

                //Data Transfer
                "DT-1" : "Send P-DATA-TF PDU",
                "DT-2" : "Send P-DATA indication primitive",

                //Association Release
                "AR-1"  : "Send A-RELEASE-RQ PDU",
                "AR-2"  : "Issue A-RELEASE indication primitive",
                "AR-3"  : "Issue A-RELEASE confirmation primitive, and close transport connection",
                "AR-4"  : "Issue A-RELEASE-RP PDU and start ARTIM timer",
                "AR-5"  : "Stop ARTIM timer",
                "AR-6"  : "Issue P-DATA indication",
                "AR-7"  : "Issue P-DATA-TF PDU",
                "AR-8"  : "Issue A-RELEASE indication (release collision)",
                "AR-9"  : "Send A-RELEASE-RP PDU",
                "AR-10" : "Issue A-RELEASE confirmation primitive",

                //Association Abort
                "AA-1" : "Send A-ABORT PDU (service-user source) and start (or restart if already started) ARTIM timer",
                "AA-2" : "Stop ARTIM timer if running. Close transport connection",
                "AA-3" : "issue A-ABORT indication and close transport connection / issue A-P-ABORT indication and close transport connection",
                "AA-4" : "Issue A-P-ABORT indication primitive",
                "AA-5" : "Stop ARTIM timer",
                "AA-6" : "Ignore PDU",
                "AA-7" : "Send A-ABORT PDU",
                "AA-8" : "Send A-ABORT PDU (service-provider source-), issue an A-P-ABORT indication, and start ARTIM timer"
            };

            dicomTools.stateTransitionTable = {
                //                                    sta1                 sta2                 sta3              sta4              sta5               sta6                 sta7                sta8              sta9              sta10             sta11             sta12             sta13
                "SEND_CONNECTION_REQUEST"    : [["AE-1", "sta4" ],[                     ],[               ],[               ],[               ],[               ],[                     ],[               ],[               ],[               ],[               ],[               ],[               ]],
                "RECV_CONNECTION_CONFIRM"    : [[               ],[                     ],[               ],["AE-2", "sta5" ],[               ],[               ],[                     ],[               ],[               ],[               ],[               ],[               ],[               ]],
                "RECV_A_ASSOCIATE_AC"        : [[               ],["AA-1", "sta13"      ],["AA-8", "sta13"],[               ],["AE-3", "sta6" ],["AA-8", "sta13"],["AA-8", "sta13"      ],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-6", "sta13"]],
                "RECV_A_ASSOCIATE_RJ"        : [[               ],["AA-1", "sta13"      ],["AA-8", "sta13"],[               ],["AE-4", "sta1" ],["AA-8", "sta13"],["AA-8", "sta13"      ],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-6", "sta13"]],
                "RECV_CONNECTION_INDICATION" : [["AE-5", "sta2" ],[                     ],[               ],[               ],[               ],[               ],[                     ],[               ],[               ],[               ],[               ],[               ],[               ]],
                "RECV_A_ASSOCIATE_RQ"        : [[               ],["AE-6","sta6","sta13"],["AA-8", "sta13"],[               ],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"      ],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-7", "sta13"]],
                "SEND_ACCEPT_A_ASSOCIATE"    : [[               ],[                     ],["AE-7", "sta6" ],[               ],[               ],[               ],[                     ],[               ],[               ],[               ],[               ],[               ],[               ]],
                "SEND_REJECT_A_ASSOCIATE"    : [[               ],[                     ],["AE-8", "sta13"],[               ],[               ],[               ],[                     ],[               ],[               ],[               ],[               ],[               ],[               ]],
                "SEND_P_DATA"                : [[               ],[                     ],[               ],[               ],[               ],["DT-1", "sta6" ],[                     ],["AR-7", "sta8" ],[               ],[               ],[               ],[               ],[               ]],
                "RECV_P_DATA"                : [[               ],["AA-1", "sta13"      ],["AA-8", "sta13"],[               ],["AA-8", "sta13"],["DT-2", "sta6" ],["AR-6", "sta7"       ],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-6", "sta13"]],
                "SEND_A_RELEASE_RQ"          : [[               ],[                     ],[               ],[               ],[               ],["AR-1", "sta7" ],[                     ],[               ],[               ],[               ],[               ],[               ],[               ]],
                "RECV_A_RELEASE_RQ"          : [[               ],["AA-1", "sta13"      ],["AA-8", "sta13"],[               ],["AA-8", "sta13"],["AR-2", "sta8" ],["AR-8","sta9","sta10"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-6", "sta13"]],
                "RECV_A_RELEASE_RP"          : [[               ],["AA-1", "sta13"      ],["AA-8", "sta13"],[               ],["AA-8", "sta13"],["AA-8", "sta13"],["AR-3", "sta1"       ],["AA-8", "sta13"],["AA-8", "sta13"],["AR-10","sta12"],["AR-3", "sta1" ],["AA-8", "sta13"],["AA-6", "sta13"]],
                "SEND_A_RELEASE_RP"          : [[               ],[                     ],[               ],[               ],[               ],[               ],[                     ],["AR-4", "sta13"],["AR-9", "sta11"],[               ],[               ],["AR-4", "sta13"],[               ]],
                "SEND_A_ABORT"               : [[               ],[                     ],["AA-1", "sta13"],["AA-2", "sta1" ],["AA-1", "sta13"],["AA-1", "sta13"],["AA-1", "sta13"      ],["AA-1", "sta13"],["AA-1", "sta13"],["AA-1", "sta13"],["AA-1", "sta13"],["AA-1", "sta13"],[               ]],
                "RECV_A_ABORT"               : [[               ],["AA-2", "sta1"       ],["AA-3", "sta1" ],[               ],["AA-3", "sta1" ],["AA-3", "sta1" ],["AA-3", "sta1"       ],["AA-3", "sta1" ],["AA-3", "sta1" ],["AA-3", "sta1" ],["AA-3", "sta1" ],["AA-3", "sta1" ],["AA-2", "sta1" ]],
                "RECV_CONNECTION_CLOSED"     : [[               ],["AA-5", "sta1"       ],["AA-4", "sta1" ],["AA-4", "sta1" ],["AA-4", "sta1" ],["AA-4", "sta1" ],["AA-4", "sta1"       ],["AA-4", "sta1" ],["AA-4", "sta1" ],["AA-4", "sta1" ],["AA-4", "sta1" ],["AA-4", "sta1" ],["AA-5", "sta1" ]],
                "RECV_ARTIM_EXPIRED"         : [[               ],["AA-2", "sta1"       ],[               ],[               ],[               ],[               ],[                     ],[               ],[               ],[               ],[               ],[               ],["AA-2", "sta1" ]],
                "RECV_INVALID"               : [[               ],["AA-1", "sta13"      ],["AA-8", "sta13"],[               ],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"      ],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-8", "sta13"],["AA-7", "sta13"]]
            };


            /**
             * state machine simulator for test purposes
             * @class StateMachine
             * @param {String} name name of the state machine for logging
             * @param {Boolean} lightness boolean to pick if logging colors are light or dark
             */
            dicomTools.StateMachine = function(name, lightness) {
                var _state = "sta1";

                lightness = lightness?60:0;

                this.state = function(newState) {
                    if (typeof newState !== "undefined") {
                        _state = newState;
                        Y.log("\x1b["+(32+lightness)+"m"+"state changed to "+_state+": "+dicomTools.states[_state]+"\x1b[0m", "log", NAME);
                        return true;
                    } else {
                        Y.log("\x1b["+(32+lightness)+"m"+"state is "+_state+": "+dicomTools.states[_state]+"\x1b[0m", "log", NAME);
                        return _state;
                    }
                };

                this.event = function(kind, subtype) {
                    if (!subtype) { 
                        subtype = 1; //default to next best
                    }
                    var actionState = dicomTools.stateTransitionTable[kind][dicomTools.stateIDs[_state]];
                    if (0 === actionState.length) {
                        Y.log("\x1b[31m invalid transition from state "+_state+" with event "+kind+"\x1b[0m", "log", NAME);
                    } else {
                        Y.log("\x1b[97m- "+name+" -\x1b[0m");
                        Y.log("\x1b["+(33+lightness)+"m"+"event is "+kind+" in state "+_state+"\x1b[0m", "log", NAME);
                        Y.log("\x1b["+(34+lightness)+"m"+"action is "+actionState[0]+": "+dicomTools.actions[actionState[0]]+"\x1b[0m", "log", NAME);
                        this.state(actionState[subtype]);
                    }
                };
            };

            /**
             * converts a 64bit-long-size number to array of Little-endian formatted integers/bytes
             * @method longToByteArrayL
             * @param {Number} long
             *
             * @return {Array<byte>}
             */
            dicomTools.longToByteArrayL = function(long) {
                // we want to represent the input as a 8-bytes array
                var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
                for ( var index = 0; index < byteArray.length; index ++ ) {
                    var byte = long & 0xff; //jshint ignore:line
                    byteArray [ index ] = byte;
                    long = (long - byte) / 256 ;
                }
                return byteArray;
            };

            /**
             * converts a 32bit-integer-size number to array of Little-endian formatted integers/bytes (and caps all overflow)
             * @method intToByteArrayL
             * @param {Number} int
             *
             * @return {Function}
             */
            dicomTools.intToByteArrayL = function(int) {
                return dicomTools.longToByteArrayL(int).slice(0,4);
            };

            /**
             * converts a 16bit-short-size number to array of Little-endian formatted integers/bytes (and caps all overflow)
             * @method shortToByteArrayL
             * @param {Number} short
             *
             * @return {Function}
             */
            dicomTools.shortToByteArrayL = function(short) {
                return dicomTools.longToByteArrayL(short).slice(0,2);
            };

            /**
             * converts a 64bit-short-size number to array of big-endian formatted integers/bytes
             * @method longToByteArrayB
             * @param {Number} long
             *
             * @return {Array<byte>}
             */
            dicomTools.longToByteArrayB = function(long) {
                // we want to represent the input as a 8-bytes array
                var byteArray = [0, 0, 0, 0, 0, 0, 0, 0];
                for ( var index = byteArray.length - 1; index >= 0; index -- ) {
                    var byte = long & 0xff; //jshint ignore:line
                    byteArray [ index ] = byte;
                    long = (long - byte) / 256 ;
                }
                return byteArray;
            };

            /**
             * converts a 32bit-integer-size number to array of Little-endian formatted integers/bytes (and caps all overflow)
             * @method intToByteArrayB
             * @param {Number} int
             *
             * @return {Function}
             */
            dicomTools.intToByteArrayB = function(int) {
                return dicomTools.longToByteArrayB(int).slice(4,8);
            };

            /**
             * converts a 16bit-short-size number to array of Little-endian formatted integers/bytes (and caps all overflow)
             * @method shortToByteArrayB
             * @param {Number} short
             *
             * @return {Function}
             */
            dicomTools.shortToByteArrayB = function(short) {
                return dicomTools.longToByteArrayB(short).slice(6,8);
            };

            /**
             * converts an array of little-endian formatted ints/bytes to a 64bit-Number
             * @method byteArrayToLongL
             * @param {Number} byteArray
             *
             * @return {Number}
             */
            dicomTools.byteArrayToLongL = function(byteArray) {
                var value = 0;
                for ( var i = byteArray.length - 1; i >= 0; i--) {
                    value = (value * 256) + byteArray[i];
                }

                return value;
            };

            /**
             * converts an array of big-endian formatted ints/bytes to a 64bit-Number
             * @method byteArrayToLongB
             * @param {Number} byteArray
             *
             * @return {Number}
             */
            dicomTools.byteArrayToLongB = function(byteArray) {
                var value = 0;
                for ( var i = 0; i < byteArray.length; i++) {
                    value = (value * 256) + byteArray[i];
                }

                return value;
            };

            /**
             * adds a 0x00 to an array with uneven length
             * @method arrEven
             * @param {Array} arr
             *
             * @return {Array} arr
             */
            dicomTools.arrEven = function(arr) {
                if (!arr) {return [];}
                if(arr.length%2 === 1) {
                    return arr.concat(0);
                }
                return arr;
            };

            /**
             * searches through an object to see if a value has an associated key
             * @method getAttribute
             * @param {Array} obj
             * @param {String} val
             * @param {String} subAtt
             * @param {Boolean} log
             *
             * @return {Boolean | Number}
             */
            dicomTools.getAttribute = function(obj, val, subAtt, log) {
                function alog(s) {
                    if (log) {Y.log(s, "log", NAME);}
                }
                alog("val:");
                alog(val);

                for(var att in obj) {
                    if(obj.hasOwnProperty(att)) {
                        if (!subAtt) {
                            alog("comparing attribute "+att+":");
                            alog("A: "+obj[att]);
                            alog("B: "+val);
                            if (Array.isArray(val) && Array.isArray(obj[att])) {
                                alog("special array case...");
                                var diffs = 0;
                                for (var i = 0; i < val.length && i < obj[att].length; i++) {
                                    alog(val[i]+" !== "+obj[att][i]+" ?");
                                    if (val[i] !== obj[att][i]) {diffs++;}
                                }
                                alog("diffs: "+diffs);
                                if (0 === diffs && val.length === obj[att].length) {
                                    alog("valid result found");
                                    return att;
                                }
                            } else {
                                if (obj[att] === val) {
                                    alog("valid result found");
                                    return att;
                                }
                            }
                        } else {
                            alog("comparing attribute "+att+":");
                            alog("A: "+obj[att]);
                            alog("B: "+val);
                            if (Array.isArray(val) && Array.isArray(obj[att][subAtt])) {
                                alog("special array case...");
                                var SaDiffs = 0;
                                for (var j = 0; j < val.length && j < obj[att][subAtt].length; j++) {
                                    alog(val[j]+" !== "+obj[att][j]+" ?");
                                    if (val[j] !== obj[att][subAtt][j]) {SaDiffs++;}
                                }
                                alog("diffs: "+SaDiffs);
                                if (0 === SaDiffs && val.length === obj[att][subAtt].length) {
                                    alog("valid result found");
                                    return att;
                                }
                            } else {
                                if (obj[att][subAtt] === val) {
                                    alog("valid result found");
                                    return att;
                                }
                            }
                        }
                    }
                }
                return false;
            };

            /**
             * minimizes a dicom object to a key:value pair if it's just {type: [key], attributes:{len: [len]}, value: [value]}
             * @method minimizeObj
             * @param {Object} obj
             */
            dicomTools.minimizeObj = function(obj) {
                //console.log("minimizing...");
                //console.log(util.inspect(obj));
                //console.log(obj.hasOwnProperty("type") +" "+ obj.hasOwnProperty("attributes") +" "+ obj.hasOwnProperty("value"));
                if (obj.hasOwnProperty("attributes") && obj.hasOwnProperty("value")) {
                    var val = obj.value;

                    //console.log("is proper obj...");
                    if (obj.hasOwnProperty("type") && 1 === Object.keys(obj.attributes).length && obj.attributes.hasOwnProperty("len")) {
                        //console.log("can optimize: " + obj.type);
                        obj[obj.type] = val;
                        delete obj.type;
                        delete obj.attributes;
                        delete obj.value;
                    }
                    if ('[object Array]' === Object.prototype.toString.call(val)) {
                        //console.log("value is array");
                        for (var i = 0; i < val.length; i++) {
                            dicomTools.minimizeObj(val[i]);
                        }
                    }
                }
            };

        };
        
        Y.namespace( 'doccirrus.api.dicom' ).tools = new DicomTools();
    },
    '0.0.1', {requires: []}
);
