/*global YUI*/
'use strict';

YUI.add( 'inpacsworklist-schema', function( Y, NAME ) {

    var
        types = {},
        i18n = Y.doccirrus.i18n;

    types = Y.mix( types, {
            "root": {
                "base": {
                    "complex": "ext",
                    "type": "InPacsWorkList_T",
                    "lib": types
                }
            },

            InPacsWorkList_T: {
                "base_WorkListData_T": {
                    "complex": "ext",
                    "type": "WorkListData_T",
                    "lib": types
                },
                "base_DicomTagValues_T": {
                    "complex": "ext",
                    "type": "DicomTagValues_T",
                    "lib": types
                }
            },

            DicomTagValues_T: {
                dicomTagValues: {
                    "complex": "inc",
                    "type": "DicomTagValue_T",
                    "lib": types,
                    i18n: "dicomTagValues",
                    "-en": "dicomTagValues",
                    "-de": "dicomTagValues"
                }
            },

            DicomTagValue_T: {
                dicomTag: {
                    type: "String",
                    i18n: i18n( 'InPacsAdminMojit.table.dicomTag' ),
                    "-en": i18n( 'InPacsAdminMojit.table.dicomTag' ),
                    "-de": i18n( 'InPacsAdminMojit.table.dicomTag' )
                },

                dicomCommentTag: {
                    type: "String",
                    i18n: "dicomCommentTag",
                    "-en": "dicomCommentTag",
                    "-de": "dicomCommentTag"
                },

                values: {
                    "complex": "inc",
                    "type": "Values_T",
                    "lib": types,
                    i18n: "dicomTagValues",
                    "-en": "dicomTagValues",
                    "-de": "dicomTagValues"
                },

                fileDownloadId: {
                    type: "String",
                    i18n: "fileDownloadId",
                    "-en": "fileDownloadId",
                    "-de": "fileDownloadId"
                }
            },

            Values_T: {
                id: {
                    type: "String",
                    i18n: "id",
                    "-en": "id",
                    "-de": "id"
                },
                value: {
                    type: "String",
                    i18n: i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.input' ),
                    "-en": i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.input' ),
                    "-de": i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.input' )
                },
                comment: {
                    type: "string",
                    i18n: i18n( 'InPacsAdminMojit.table.comment' ),
                    "-en": i18n( 'InPacsAdminMojit.table.comment' ),
                    "-de": i18n( 'InPacsAdminMojit.table.comment' )
                }
            },

            WorkListData_T: {
                workListData: {
                    "complex": "inc",
                    "type": "WorkListItem_T",
                    "lib": types,
                    i18n: i18n( 'inpacsworklist-schema.InPacsWorkList_T.workListData.i18n' ),
                    "-en": "workListData",
                    "-de": "workListData"
                }
            },

            "WorkListItem_T": {
                "dicomTag": {
                    "type": "String",
                    required: true,
                    i18n: i18n( 'inpacsworklist-schema.WorkListItem_T.dicomTag.i18n' ),
                    "-en": "dicomTag",
                    "-de": "dicomTag"
                },
                "name": {
                    "type": "String",
                    i18n: i18n( 'inpacsworklist-schema.WorkListItem_T.name.i18n' ),
                    "-en": "Name",
                    "-de": "Name"
                },
                "content": {
                    "type": "any",
                    i18n: i18n( 'inpacsworklist-schema.WorkListItem_T.content.i18n' ),
                    "-en": "Content",
                    "-de": "Inhalt"
                },
                "comment": {
                    "type": "String",
                    "i18n": i18n( 'inpacsworklist-schema.WorkListItem_T.comment.i18n' ),
                    "-en": "Comment",
                    "-de": "Kommentar"
                },
                "template": {
                    "type": "String",
                    "i18n": i18n( 'inpacsworklist-schema.WorkListItem_T.template.i18n' ),
                    "-en": "Template",
                    "-de": "Template"
                },
                "contentType": {
                    complex: "eq",
                    "type": "ContentType_E",
                    "lib": types,
                    "required": true
                },
                "order": {
                    "type": "Number",
                    "i18n": i18n( 'inpacsworklist-schema.WorkListItem_T.order.i18n' ),
                    "-en": "Order",
                    "-de": "Bestellen"
                }
            },

            "ContentType_E": {
                "default": 0,
                "type": "Number",
                "list": [
                    {
                        "val": 0,
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.MAPPED' ),
                        "-en": "MAPPED",
                        "-de": "MAPPED"
                    },
                    {
                        "val": 1,
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.UNMAPPED' ),
                        "-en": "UNMAPPED",
                        "-de": "UNMAPPED"
                    },
                    {
                        "val": 2,
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.DEVICE' ),
                        "-en": "DEVICE",
                        "-de": "DEVICE"
                    },
                    {
                        "val": 3,
                        i18n: i18n( 'inpacsworklist-schema.ContentType_E.STUDY_ID.i18n' ),
                        "-en": "Study Id",
                        "-de": "Zugangsnummer"
                    }
                ]
            },

            "WorkListType_E": {
                "type": "String",
                "list": [
                    {
                        "val": "CR",
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.CR.i18n' ),
                        "-en": "CR",
                        "-de": "CR"
                    },
                    {
                        "val": "DX",
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.DX.i18n' ),
                        "-en": "DX",
                        "-de": "DX"
                    },
                    {
                        "val": "CT",
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.CT.i18n' ),
                        "-en": "CT",
                        "-de": "CT"
                    },
                    {
                        "val": "MG",
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.MG.i18n' ),
                        "-en": "MG",
                        "-de": "MG"
                    },
                    {
                        "val": "MR",
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.MR.i18n' ),
                        "-en": "MR",
                        "-de": "MR"
                    },
                    {
                        "val": "NM",
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.NM.i18n' ),
                        "-en": "NM",
                        "-de": "NM"
                    },
                    {
                        "val": "OT",
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.OT.i18n' ),
                        "-en": "OT",
                        "-de": "OT"
                    },
                    {
                        "val": "PT",
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.PT.i18n' ),
                        "-en": "PT",
                        "-de": "PT"
                    },
                    {
                        "val": "US",
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.US.i18n' ),
                        "-en": "US",
                        "-de": "US"
                    },
                    {
                        "val": "XC",
                        i18n: i18n( 'InPacsAdminMojit.inpacs_navJS.menu.XC.i18n' ),
                        "-en": "XC",
                        "-de": "XC"
                    }
                ]
            }
        }
    );

    NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

    function createDefaultData() {
        var
            dataArray = [],
            i,
            iId,
            workListTypesLength = types.WorkListType_E.list.length;

        for( i = 0; i < workListTypesLength; i++ ) {
            iId = i + 1;
            dataArray.push( {
                '_id': ('00000000000000000000000' + (iId)).slice( iId.toString().toString().length - 1, 24 + iId.toString().length ),
                "workListData": [
                    {
                        "dicomTag": "0008,0005",
                        "name": "CS",
                        "comment": "SpecificCharacterSet",
                        "contentType": 0,
                        "template": "[ISO_IR 192]",
                        "order": 1
                    },
                    {
                        "dicomTag": "0002,0010",
                        "name": "UI",
                        "comment": "TransferSyntaxUID",
                        "contentType": 0,
                        "template": "1.2.840.10008.1.2.1",
                        "order": 2
                    },
                    {
                        "dicomTag": "0008,0050",
                        "name": "SH",
                        "content": "studyId",
                        "comment": "AccessionNumber",
                        "contentType": 3,
                        "order": 3
                    },
                    {
                        "dicomTag": "0010,0010",
                        "name": "PN",
                        "content": "",
                        "comment": "PatientName",
                        "contentType": 0,
                        "template": "{{ lastname.toUpperCase() }}^{{ firstname.toUpperCase() }}",
                        "order": 4
                    },
                    {
                        "dicomTag": "0010,0020",
                        "name": "LO",
                        "content": "patientId",
                        "comment": "PatientID",
                        "contentType": 0,
                        "order": 5
                    },
                    {
                        "dicomTag": "0010,0030",
                        "name": "DA",
                        "content": "",
                        "comment": "PatientBirthDate",
                        "contentType": 0,
                        "template": "{{ moment(kbvDob, 'DD.MM.YYYY').format('YYYYMMDD') }}",
                        "order": 6
                    },
                    {
                        "dicomTag": "0010,0040",
                        "name": "CS",
                        "content": "",
                        "comment": "PatientSex",
                        "contentType": 0,
                        "template": '{{ gender.toUpperCase() }}',
                        "order": 7
                    },
                    {
                        "dicomTag": "0040,0100",
                        "name": "SQ",
                        "comment": "ScheduledProcedureStepSequence",
                        "contentType": 0,
                        "order": 8
                    },
                    {
                        "dicomTag": "FFFE,E000",
                        "comment": "StartOfItem",
                        "contentType": 0,
                        "order": 9
                    },
                    {
                        "dicomTag": "0008,0060",
                        "name": "CS",
                        "comment": "Modality",
                        "contentType": 0,
                        "template": types.WorkListType_E.list[i].val,
                        "order": 10
                    },
                    {
                        "dicomTag": "0040,0003",
                        "name": "TM",
                        "comment": "ScheduledProcedureStepStartTime",
                        "contentType": 0,
                        "template": "{{ moment().add(1, 'm').format('HHmm') }}00",
                        "order": 11
                    },
                    {
                        "dicomTag": "0040,0002",
                        "name": "DA",
                        "comment": "ScheduledProcedureStepStartDate",
                        "contentType": 0,
                        "template": "{{ moment().format('YYYYMMDD') }}",
                        "order": 12
                    },
                    {
                        "dicomTag": "FFFE,E00D",
                        "comment": "EndOfItems",
                        "contentType": 0,
                        "order": 13
                    },
                    {
                        "dicomTag": "FFFE,E0DD",
                        "comment": "EndOfSequence",
                        "contentType": 0,
                        "order": 14
                    }
                ]
            } );
        }

        return dataArray;
    }

    function getDefaultContentForSpecialTags( dicomTag ) {
        if( dicomTag === '0040,0001' ) {
            // Device tag. This tag will always be configurable by user
            return 2;
        } else if( dicomTag === '0008,0050' ) {
            // Study ID tag. This tag is not configurable by user
            return 3;
        } else if( dicomTag === '0020,000D' ) {
            // Study Instance UID tag. This tag should not be configured by user
            // Even if he configures the content type is fixed
            return 4;
        }
    }

    Y.namespace( 'doccirrus.schemas' )[NAME] = {
        types: types,
        name: NAME,
        defaultItems: createDefaultData(),
        getDefaultContentForSpecialTags: getDefaultContentForSpecialTags,
        getContentTypeForUnMappedTag: function( dicomTag ) {
            var
                defaultContentType = getDefaultContentForSpecialTags( dicomTag );

            if( defaultContentType ) {
                return defaultContentType;
            } else {
                return 1;
            }
        },
        getContentTypeForMappedTag: function( dicomTag ) {
            var
                defaultContentType = getDefaultContentForSpecialTags( dicomTag );

            if( defaultContentType ) {
                return defaultContentType;
            } else {
                return 0;
            }
        }
    };

    Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
}, '0.0.1', {
    requires: [
        'dcschemaloader'
    ]
} );
