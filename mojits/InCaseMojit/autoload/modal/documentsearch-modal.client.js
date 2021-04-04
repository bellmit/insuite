/**
 * User: pi
 * Date: 26/10/16  11:20
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, moment, jQuery, _ */

YUI.add( 'DocumentSearchModal', function( Y ) {

        'use strict';

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            DocumentModel = KoViewModel.getConstructor( 'DocumentModel' ),
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            DOCUMENT_TYPE = i18n('InCaseMojit.documentSearchModal_clientJS.title.DOCUMENT_TYPE'),
            TAG = i18n('InCaseMojit.documentSearchModal_clientJS.title.TAG'),
            SUBTYPE = i18n('InCaseMojit.documentSearchModal_clientJS.title.SUBTYPE'),
            CREATED_ON = i18n('InCaseMojit.documentSearchModal_clientJS.title.CREATED_ON'),
            CAPTION = i18n('InCaseMojit.documentSearchModal_clientJS.title.CAPTION'),
            CONTENT_TYPE = i18n('InCaseMojit.documentSearchModal_clientJS.title.CONTENT_TYPE'),
            USER_CONTENT = i18n('InCaseMojit.documentSearchModal_clientJS.title.USER_CONTENT'),
            LAST_NAME = i18n('InCaseMojit.documentSearchModal_clientJS.title.LAST_NAME'),
            FIRST_NAME = i18n('InCaseMojit.documentSearchModal_clientJS.title.FIRST_NAME'),
            DOB = i18n('InCaseMojit.documentSearchModal_clientJS.title.DOB'),
            EMPLOYEE_LAST_NAME = i18n('InCaseMojit.documentSearchModal_clientJS.title.EMPLOYEE_LAST_NAME'),
            ACT_TYPE = i18n('InCaseMojit.documentSearchModal_clientJS.title.ACT_TYPE'),
            LOCATION_NAME = i18n('InCaseMojit.documentSearchModal_clientJS.title.LOCATION_NAME'),
            PATIENT_NO = i18n( 'patient-schema.Patient_T.patientNo.i18n' ),
            MODAL_TITLE = i18n('InCaseMojit.documentSearchModal_clientJS.title.MODAL'),
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;

        /**
         * NavSearchModel model
         * @constructor
         * @extends ActivitysequenceModel
         */
        function NavSearchModel() {
            NavSearchModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( NavSearchModel, KoViewModel.getDisposable(), {
            /** @protected */
            initializer: function() {
                var
                    self = this;
                self.initNavSearchModel();
                self.initNavSearchModel();

            },
            /** @protected */
            destructor: function() {
            },
            /** @protected */
            initNavSearchModel: function() {
                var
                    self = this;
                self.term = ko.observable( self.get( 'term' ) );
                self.patientId = ko.observable( self.get( 'patientId' ) );
                self.patientNo = ko.observable( self.get( 'patientNo' ) );
                self.patientTitle = ko.observable( self.get( 'patientTitle' ) );
                self.textCurrentPatientI18n = i18n( 'InCaseMojit.text.currentPatient' );
                self.togglePreviewI18n = i18n( 'InCaseMojit.documentSearchModal_clientJS.togglePreview' );
                self.toggleMergeMediaByActivityI18n = i18n( 'InCaseMojit.documentSearchModal_clientJS.toggleMergeMediaByActivity' );
                self.forAllDocs = !!( self.patientNo() );
                self.currentPatientSet = ko.observable( !!( self.patientNo() ) );
                self.togglePreview = ko.observable( Y.doccirrus.utils.localValueGet( 'DocumentSearchModal-isPreviewVisible' ) === 'true' );
                self.toggleMergeMediaByActivity = ko.observable( Y.doccirrus.utils.localValueGet( 'DocumentSearchModal-isMergeMediaByActivityVisible' ) === 'true' );

                self.locationFilter = self.get( 'locations' ).map( function( location ) {
                    return {val: location._id, i18n: location.locname};
                } );
                self.initDocumentTable();
                self.initActivityTable();
                self.initImageViewer();

            },
            initDocumentTable: function(){
                var
                    self = this,
                    fileTypesEnum = [],
                    fileTypes = {};
                Y.doccirrus.media.types.fileTypes.forEach(function(fileType){
                    if( !fileTypes[ fileType.mime ] ) {
                        fileTypes[ fileType.mime ] = fileType.ext;
                    } else {
                        fileTypes[ fileType.mime ] = fileTypes[ fileType.mime ] + '/' + fileType.ext;
                    }
                });
                Object.keys( fileTypes ).forEach( function( mime ) {
                    fileTypesEnum.push( {
                        id: mime,
                        text: fileTypes[ mime ].toUpperCase()
                    } );
                } );
                self.documentKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InCaseMojit-DocumentSearchModal-documentKoTable',
                        states: [ 'limit', 'sort' ],
                        fillRowsToLimit: false,
                        remote: true,
                        moveWithKeyboard: true,
                        selectWithNavigate: true,
                        selectOnHover: true,
                        proxy: Y.doccirrus.jsonrpc.api.document.getByTag,
                        baseParams: self.addDisposable( ko.computed( function() {
                            if( self.currentPatientSet() ) {
                                return {
                                    query: {
                                        patientNo: self.patientNo(),
                                        checkHidePdfSettings: true
                                    }
                                };
                            }
                            return {
                                checkHidePdfSettings: true
                            };
                        } ) ),
                        limit: 10,
                        sortersLimit: self.forAllDocs ? 2 : 1,
                        limitList: [10, 20, 30, 40, 50],

                        columns: [
                            {
                                componentType: 'KoTablePicturePreviewColumn',
                                forPropertyName: 'thumb',
                                title: 'Preview',
                                sourceComparator: function( sourceA, sourceB ) {
                                    return sourceA && sourceB && sourceA.mediaId === sourceB.mediaId;
                                },
                                propertyToSource: function( meta ) {
                                    var
                                        data = meta.row,
                                        fullUrl,
                                        thumbUrl;

                                    fullUrl = DocumentModel.fullUrl( {
                                        contentType: data.documentContentType,
                                        mediaId: data.documentMediaId
                                    } );

                                    thumbUrl = DocumentModel.thumbUrl( {
                                        contentType: data.documentContentType,
                                        thumbSize: DocumentModel.thumbSize,
                                        mediaId: data.documentMediaId
                                    } );
                                    if( data.hideLinksOfPrintedPDF ) {
                                        fullUrl = '';
                                    }
                                    return [{mediaId: data.documentMediaId, caption: data.documentCaption, src: thumbUrl, link: fullUrl, contentType: data.documentContentType}];
                                }
                            },
                            {
                                forPropertyName: 'documentType',
                                label: DOCUMENT_TYPE,
                                isSortable: true,
                                isFilterable: true,
                                sortInitialIndex: self.forAllDocs ? 1 : 0,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.document.types.DocType_E.list.filter( function( type ) {
                                        return -1 === type.val.indexOf( 'FORM' ) && 'QUESTIONNAIRE' !== type.val;
                                    } ),
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                renderer: function( meta ){
                                    var
                                        value = meta.value;
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'document', 'DocType_E', value, 'i18n', '' );
                                }
                            },
                            {
                                forPropertyName: 'documentTags',
                                label: TAG,
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    select2Config:{
                                        query: function(query){
                                            Y.doccirrus.jsonrpc.api.tag.read( {
                                                query: {
                                                    type: Y.doccirrus.schemas.tag.tagTypes.DOCUMENT,
                                                    title: {
                                                        $regex: query.term,
                                                        $options: 'i'
                                                    }
                                                },
                                                options: {
                                                    itemsPerPage: 15
                                                },
                                                fields: [ 'title' ]
                                            } ).done( function( response ) {
                                                var data = response && response.data || [];
                                                query.callback( {
                                                    results: data.map( function( item ) {
                                                        return {
                                                            id: item.title,
                                                            text: item.title
                                                        };
                                                    } )
                                                } );
                                            } );
                                        },
                                        initSelection: function( element, callback ) {
                                            var
                                                value = element.val(),
                                                tags = value && value.split(',') || [],
                                                data;

                                            data = tags.map( function( tag ) {
                                                return {
                                                    id: tag,
                                                    text: tag
                                                };
                                            } );
                                            callback( data );
                                        }
                                    },
                                    optionsText: 'text',
                                    optionsValue: 'id',
                                    value: self.term() ? [ self.term() ] : ''
                                },
                                renderer: function( meta ){
                                    var
                                        value = meta.value || [];
                                    return value.join(', ');
                                }

                            },
                            {
                                forPropertyName: 'subType',
                                label: SUBTYPE,
                                isSortable: true,
                                isFilterable: true,
                                sortInitialIndex: self.forAllDocs ? 0 : null,
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    select2Config:{
                                        query: function(query){
                                            Y.doccirrus.jsonrpc.api.tag.read( {
                                                query: {
                                                    type: Y.doccirrus.schemas.tag.tagTypes.SUBTYPE,
                                                    title: {
                                                        $regex: query.term,
                                                        $options: 'i'
                                                    }
                                                },
                                                options: {
                                                    itemsPerPage: 15
                                                },
                                                fields: [ 'title' ]
                                            } ).done( function( response ) {
                                                var data = response && response.data || [];
                                                query.callback( {
                                                    results: data.map( function( item ) {
                                                        return {
                                                            id: item.title,
                                                            text: item.title
                                                        };
                                                    } )
                                                } );
                                            } );
                                        },
                                        initSelection: function( element, callback ) {
                                            var
                                                value = element.val(),
                                                tags = value && value.split(',') || [],
                                                data;

                                            data = tags.map( function( tag ) {
                                                return {
                                                    id: tag,
                                                    text: tag
                                                };
                                            } );
                                            callback( data );
                                        }
                                    },
                                    optionsText: 'text',
                                    optionsValue: 'id'
                                },
                                renderer: function( meta ){
                                    var
                                        value = meta.value;
                                    return value;
                                }
                            },
                            {
                                forPropertyName: 'documentCreatedOn',
                                label: CREATED_ON,
                                isSortable: true,
                                isFilterable: true,
                                sortInitialIndex: self.forAllDocs ? 0 : null,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ){
                                    var
                                        value = meta.value;
                                    return moment( value ).format( TIMESTAMP_FORMAT );
                                }
                            },
                            {
                                forPropertyName: 'documentCaption',
                                label: CAPTION,
                                isSortable: true,
                                isFilterable: true,
                                visible: false,
                                renderer: function( meta ){
                                    var
                                        data = meta.row,
                                        value = meta.value,
                                        fullUrl;
                                    fullUrl = DocumentModel.fullUrl({
                                        contentType: data.documentContentType,
                                        mediaId: data.documentMediaId
                                    });
                                    return data.hideLinksOfPrintedPDF ? value : '<a href="' + fullUrl + '" target="_doc' + data.documentId + '">' + value + '</a>';
                                }

                            },
                            {
                                forPropertyName: 'documentContentType',
                                label: CONTENT_TYPE,
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                width: '100px',
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: fileTypesEnum,
                                    optionsText: 'text',
                                    optionsValue: 'id'
                                },
                                visible: false,
                                renderer: function( meta ) {
                                    var
                                        value = meta.value;
                                    return Y.doccirrus.media.getExt( value ).toUpperCase();
                                }

                            },
                            {
                                forPropertyName: 'content',
                                label: USER_CONTENT,
                                isSortable: true,
                                isFilterable: true,
                                visible: false,
                                renderer: function( meta ) {
                                    return Y.doccirrus.inCaseUtils.collapseActivityContent( meta );
                                }

                            },
                            {
                                forPropertyName: 'lastname',
                                label: LAST_NAME,
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    var
                                        value = meta.value,
                                        data = meta.row;
                                    if( !value || !data.activityId ) {
                                        return '';
                                    }
                                    return '<a href="incase#/activity/' + data.activityId + '/section/documentform" target="_blank">' + value + '</a>';
                                }

                            },
                            {
                                forPropertyName: 'firstname',
                                label: FIRST_NAME,
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    var
                                        value = meta.value,
                                        data = meta.row;
                                    if( !value || !data.activityId ) {
                                        return '';
                                    }
                                    return '<a href="incase#/activity/' + data.activityId + '/section/documentform" target="_blank">' + value + '</a>';
                                }

                            },
                            {
                                forPropertyName: 'kbvDob',
                                label: DOB,
                                isSortable: true,
                                isFilterable: true,
                                visible: false
                            },
                            {
                                forPropertyName: 'employeeLastname',
                                label: EMPLOYEE_LAST_NAME,
                                isSortable: true,
                                isFilterable: true,
                                visible: false,
                                renderer: function(meta){
                                    var
                                        data = meta.row;
                                    return Y.doccirrus.schemas.person.personDisplay( {
                                        lastname: data.employeeLastname,
                                        firstname: data.employeeFirstname,
                                        title: data.employeeTitle,
                                        nameaffix: data.employeeNameaffix
                                    } );
                                }

                            },
                            {
                                forPropertyName: 'actType',
                                label: ACT_TYPE,
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_ACTTYPE_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
                                    optionsText: '-de',
                                    optionsValue: 'val'
                                },
                                renderer: function( meta ) {
                                    var
                                        value = meta.value,
                                        data = meta.row;
                                    if( !value || !data.activityId ) {
                                        return '';
                                    }
                                    return '<a href="incase#/activity/' + data.activityId + '/section/documentform" target="_blank">' + Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', value, 'i18n', 'k.A.' ) + '</a>';
                                }
                            },
                            {
                                forPropertyName: 'locId',
                                label: LOCATION_NAME,
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: self.locationFilter,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                visible: false,
                                renderer: function( meta ){
                                    var
                                        data = meta.row;
                                    return data.locName;
                                }
                            },
                            {
                                forPropertyName: 'patientNo',
                                label: PATIENT_NO,
                                visible: false,
                                isSortable: true,
                                isFilterable: true,
                                filterPropertyName: 'patientNum',
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR,
                                collation: { locale: 'de', numericOrdering: true },
                                renderer: function( meta ) {
                                    return meta.value;
                                }
                            }
                        ]
                    }
                } );

            },
            initActivityTable: function() {
                var self = this;
                self.activityKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InCaseMojit-DocumentSearchModal-activityKoTable',
                        states: ['limit', 'sort'],
                        fillRowsToLimit: false,
                        remote: true,
                        moveWithKeyboard: true,
                        selectWithNavigate: true,
                        selectOnHover: true,
                        proxy: Y.doccirrus.jsonrpc.api.activity.read,
                        baseParams: self.addDisposable( ko.computed( function() {
                            var patientId = self.patientId(),
                                query = {
                                    $and: [
                                        {attachedMedia: {$ne: []}},
                                        {attachedMedia: {$ne: null}}
                                    ]
                                };
                            if( self.currentPatientSet() ) {
                                query.patientId = patientId;
                            }

                            return {query: query};
                        } ) ),
                        limit: 10,
                        sortersLimit: self.forAllDocs ? 2 : 1,
                        limitList: [10, 20, 30, 40, 50],
                        onKeyUp: function( event ) {
                            switch( event.keyCode ) {
                                case 39:
                                    self.pictureViewer.nextPicture();
                                    break;
                                case 37:
                                    self.pictureViewer.lastPicture();
                                    break;
                            }
                        },
                        columns: [
                            {
                                componentType: 'KoTablePicturePreviewColumn',
                                forPropertyName: 'attachedMedia',
                                title: 'Preview',
                                sourceComparator: function( sourceA, sourceB ) {
                                    return sourceA && sourceB && sourceA.mediaId === sourceB.mediaId;
                                },
                                onSourceChange: function( displayedSource ) {
                                    var
                                        pictureViewerSource;

                                    if( displayedSource ) {
                                        pictureViewerSource = self.pictureViewer.getSourceBy( function( source ) {
                                            return source.mediaId === displayedSource.mediaId;
                                        } );

                                        if( pictureViewerSource ) {
                                            self.pictureViewer.setDisplayedSource( pictureViewerSource );
                                        }
                                    }
                                },
                                propertyToSource: function( meta ) {
                                    return (meta.row.attachedMedia || []).map( function( attachedMedia ) {
                                        return {
                                            mediaId: attachedMedia.mediaId,
                                            caption: attachedMedia.caption,
                                            contentType: attachedMedia.contentType,
                                            link: DocumentModel.fullUrl( {
                                                contentType: attachedMedia.contentType,
                                                mediaId: attachedMedia.mediaId
                                            } ),
                                            src: DocumentModel.thumbUrl( {
                                                contentType: attachedMedia.contentType,
                                                mediaId: attachedMedia.mediaId,
                                                thumbSize: DocumentModel.thumbSize
                                            } )
                                        };
                                    } );
                                }
                            },
                            {
                                forPropertyName: 'attachedMediaTags',
                                label: TAG,
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    select2Config: {
                                        query: function( query ) {
                                            Y.doccirrus.jsonrpc.api.tag.read( {
                                                query: {
                                                    type: Y.doccirrus.schemas.tag.tagTypes.DOCUMENT,
                                                    title: {
                                                        $regex: query.term,
                                                        $options: 'i'
                                                    }
                                                },
                                                options: {
                                                    itemsPerPage: 15
                                                },
                                                fields: ['title']
                                            } ).done( function( response ) {
                                                var data = response && response.data || [];
                                                query.callback( {
                                                    results: data.map( function( item ) {
                                                        return {
                                                            id: item.title,
                                                            text: item.title
                                                        };
                                                    } )
                                                } );
                                            } );
                                        },
                                        initSelection: function( element, callback ) {
                                            var
                                                value = element.val(),
                                                tags = value && value.split( ',' ) || [],
                                                data;

                                            data = tags.map( function( tag ) {
                                                return {
                                                    id: tag,
                                                    text: tag
                                                };
                                            } );
                                            callback( data );
                                        }
                                    },
                                    optionsText: 'text',
                                    optionsValue: 'id',
                                    value: self.term() ? [self.term()] : ''
                                },
                                renderer: function( meta ) {
                                    var
                                        value = meta.value || [];
                                    return value.join( ', ' );
                                }

                            },
                            {
                                forPropertyName: 'subType',
                                label: SUBTYPE,
                                isSortable: true,
                                isFilterable: true,
                                sortInitialIndex: self.forAllDocs ? 0 : null,
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    select2Config:{
                                        query: function(query){
                                            Y.doccirrus.jsonrpc.api.tag.read( {
                                                query: {
                                                    type: Y.doccirrus.schemas.tag.tagTypes.SUBTYPE,
                                                    title: {
                                                        $regex: query.term,
                                                        $options: 'i'
                                                    }
                                                },
                                                options: {
                                                    itemsPerPage: 15
                                                },
                                                fields: [ 'title' ]
                                            } ).done( function( response ) {
                                                var data = response && response.data || [];
                                                query.callback( {
                                                    results: data.map( function( item ) {
                                                        return {
                                                            id: item.title,
                                                            text: item.title
                                                        };
                                                    } )
                                                } );
                                            } );
                                        },
                                        initSelection: function( element, callback ) {
                                            var
                                                value = element.val(),
                                                tags = value && value.split(',') || [],
                                                data;

                                            data = tags.map( function( tag ) {
                                                return {
                                                    id: tag,
                                                    text: tag
                                                };
                                            } );
                                            callback( data );
                                        }
                                    },
                                    optionsText: 'text',
                                    optionsValue: 'id'
                                },
                                renderer: function( meta ){
                                    var
                                        value = meta.value;
                                    return value;
                                }
                            },
                            {
                                forPropertyName: 'timestamp',
                                label: CREATED_ON,
                                isSortable: true,
                                isFilterable: true,
                                sortInitialIndex: self.forAllDocs ? 0 : null,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ){
                                    var
                                        value = meta.value;
                                    return moment( value ).format( TIMESTAMP_FORMAT );
                                }
                            },
                            {
                                forPropertyName: 'content',
                                label: USER_CONTENT,
                                isSortable: true,
                                isFilterable: true,
                                visible: false,
                                renderer: function( meta ) {
                                    return Y.doccirrus.inCaseUtils.collapseActivityContent( meta );
                                }

                            },
                            {
                                forPropertyName: 'patientLastName',
                                label: LAST_NAME,
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    var
                                        value = meta.value,
                                        data = meta.row;
                                    return '<a href="incase#/activity/' + data._id + '/section/documentform" target="_blank">' + value + '</a>';
                                }

                            },
                            {
                                forPropertyName: 'patientFirstName',
                                label: FIRST_NAME,
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    var
                                        value = meta.value,
                                        data = meta.row;
                                    return '<a href="incase#/activity/' + data._id + '/section/documentform" target="_blank">' + value + '</a>';
                                }

                            },
                            {
                                forPropertyName: 'patientKbvDob',
                                label: DOB,
                                isSortable: true,
                                isFilterable: true,
                                visible: false
                            },
                            {
                                forPropertyName: 'employeeName',
                                label: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                                title: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'actType',
                                label: ACT_TYPE,
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_ACTTYPE_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
                                    optionsText: '-de',
                                    optionsValue: 'val'
                                },
                                renderer: function( meta ) {
                                    var
                                        value = meta.value,
                                        data = meta.row;
                                    return '<a href="incase#/activity/' + data._id + '/section/documentform" target="_blank">' + Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', value, 'i18n', 'k.A.' ) + '</a>';
                                }
                            },
                            {
                                forPropertyName: 'locationName',
                                label: LOCATION_NAME,
                                visible: false,
                                isFilterable: true,
                                filterPropertyName: 'locationId',
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: self.locationFilter,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                renderer: function( meta ) {
                                    var
                                        locations = self.get( 'locations' ),
                                        locationId = meta.row.locationId,
                                        i;

                                    for( i = 0; i < locations.length; i++ ) {
                                        if( locations[i]._id === locationId ) {
                                            meta.row.locationName = locations[i].locname;
                                        }
                                    }

                                    return meta.row.locationName;
                                }
                            },
                            {
                                forPropertyName: 'patientNo',
                                label: PATIENT_NO,
                                visible: false,
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR,
                                collation: { locale: 'de', numericOrdering: true },
                                renderer: function( meta ) {
                                    return meta.value;
                                }
                            }
                        ]
                    }
                } );

            },
            initImageViewer: function() {
                var self = this;
                self.pictureViewer = KoComponentManager.createComponent( {
                    componentType: 'KoPictureViewer',
                    componentConfig: {
                        name: 'documentsearch-modal-KoPictureViewer',
                        containerClass: 'col-xs-12',
                        sourceComparator: function( sourceA, sourceB ) {
                            return sourceA && sourceB && sourceA.mediaId === sourceB.mediaId;
                        }
                    }
                } );

                self.addDisposable( ko.computed( function() {
                    var displayedSource = self.pictureViewer.displayedSource();
                    var previewCol = self.activityKoTable.columns()[0],
                        selectedRow = self.activityKoTable.selected()[0],
                        rowPictureViewer, columnPictureViewerSource;

                    if( previewCol && selectedRow && displayedSource ) {
                        rowPictureViewer = previewCol.pictureViewers[selectedRow._id];

                        columnPictureViewerSource = rowPictureViewer.getSourceBy( function( source ) {
                            return source.mediaId === displayedSource.mediaId;
                        } );

                        if( columnPictureViewerSource ) {
                            rowPictureViewer.setDisplayedSource( columnPictureViewerSource );
                        }
                    }
                } ) );

                self.addDisposable( ko.computed( function() {
                    var
                        previewCol = self.activityKoTable.columns()[0],
                        colPictureViewer,
                        currentColPictureViewerSource,
                        showThisSource,
                        sourceObject,
                        selectedRow;

                    if( self.toggleMergeMediaByActivity() ) {
                        selectedRow = _.get( unwrap( self.activityKoTable.selected ), '[0]', false );
                        if( selectedRow ) {
                            sourceObject = (selectedRow.attachedMedia || []).map( function( attachedMedia ) {
                                if( attachedMedia.contentType.startsWith( 'image' ) && attachedMedia.contentType !== 'image/tiff' ) {
                                    return {
                                        caption: attachedMedia.caption,
                                        contentType: attachedMedia.contentType,
                                        mediaId: attachedMedia.mediaId,
                                        src: Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getMediaUrl( {
                                            _id: attachedMedia.mediaId,
                                            contentType: 'image/jpeg'
                                        }, '1217x-1' ) )
                                    };
                                } else {
                                    return {
                                        caption: attachedMedia.caption,
                                        contentType: attachedMedia.contentType,
                                        mediaId: attachedMedia.mediaId,
                                        src: DocumentModel.thumbUrl( {
                                            contentType: attachedMedia.contentType,
                                            thumbSize: '1217x-1',
                                            mediaId: attachedMedia.mediaId
                                        } )
                                    };
                                }
                            } );
                            colPictureViewer = previewCol.getPictureViewerById( selectedRow._id );
                            currentColPictureViewerSource = colPictureViewer && colPictureViewer.displayedSource();
                            showThisSource = currentColPictureViewerSource && sourceObject.find( function( source ) {
                                return source.mediaId === currentColPictureViewerSource.mediaId;
                            } );
                        }
                    } else {
                        selectedRow = _.get( unwrap( self.documentKoTable.selected ), '[0]', false );
                        if( selectedRow ) {
                            if( selectedRow.documentContentType.startsWith( 'image' ) && selectedRow.documentContentType !== 'image/tiff' ) {
                                sourceObject = {
                                    contentType: 'image/jpeg',
                                    mediaId: selectedRow.documentMediaId,
                                    src: Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getMediaUrl( {
                                        _id: selectedRow.documentMediaId,
                                        contentType: 'image/jpeg'
                                    }, '1217x-1' ) )
                                };
                            } else {
                                sourceObject = {
                                    contentType: selectedRow.documentContentType,
                                    mediaId: selectedRow.documentMediaId,
                                    src: DocumentModel.thumbUrl( {
                                        contentType: selectedRow.documentContentType,
                                        thumbSize: '1217x-1',
                                        mediaId: selectedRow.documentMediaId
                                    } )
                                };
                            }

                        }
                    }
                    if( !sourceObject ) {
                        return;
                    }
                    self.pictureViewer.setSource( sourceObject, showThisSource );
                } ) );
            }
        }, {
            NAME: 'NavSearchModel',
            ATTRS: {
                term: {
                    value: '',
                    lazyAdd: false
                },
                locations: {
                    value: [],
                    lazyAdd: false
                },
                patientId: {
                    value: '',
                    lazyAdd: false
                },
                patientNo: {
                    value: '',
                    lazyAdd: false
                },
                patientTitle: {
                    value: '',
                    lazyAdd: false
                }
            }
        } );

        function NavSearchModal() {
        }

        NavSearchModal.prototype.show = function( config ) {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( { path: 'InCaseMojit/views/documentsearch_modal' } )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    return new Promise( function( resolve ) {
                        var
                            bodyContent = Y.Node.create( template ),
                            modal,
                            navSearchModel;
                        navSearchModel = new NavSearchModel( config );

                        modal = new Y.doccirrus.DCWindow( { // eslint-disable-line no-unused-vars
                            id: 'documentsearch_modal',
                            className: 'DCWindow-Appointment',
                            bodyContent: bodyContent,
                            title: `<form class="form-inline">
                                        <span>${MODAL_TITLE}</span>
                                        <div class="form-group">
                                            <div class="checkbox-inline" style="margin: 0 30px;">
                                               <label class="control-label">
                                                    <input style="margin-top: 2px;" id="currentPatientSet" type="checkbox">
                                                    <strong>${navSearchModel.textCurrentPatientI18n}</strong>
                                               </label>
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label id="patientTitle" style="padding-right: 12px">${navSearchModel.patientTitle()}</label>
                                            <div class="checkbox-inline" style="padding-right: 12px">
                                                <label class="control-label">
                                                    <input style="margin-top: 2px;" id="togglePreview" type="checkbox">
                                                    <strong>${navSearchModel.togglePreviewI18n}</strong>
                                                </label>
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <div class="checkbox-inline">
                                                <label class="control-label">
                                                    <input style="margin-top: 2px;" id="toggleMergeMediaByActivity" type="checkbox">
                                                    <strong>${navSearchModel.toggleMergeMediaByActivityI18n}</strong>
                                                </label>
                                            </div>
                                        </div>
                                    </form>`,
                            width: '90%',
                            height: '90%',
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close' ],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                        }
                                    } )
                                ]
                            },
                            after: {
                                visibleChange: function( event ) {
                                    if( !event.newVal ) {
                                        ko.cleanNode( bodyContent.getDOMNode() );
                                        navSearchModel.destroy();
                                        resolve();
                                    }
                                }
                            }
                        } );
                        if( navSearchModel.currentPatientSet() ) {
                            jQuery( '#currentPatientSet' ).prop( "checked", true );
                        } else {
                            jQuery( '#currentPatientSet' ).prop( "checked", false );
                        }

                        if( navSearchModel.togglePreview() ) {
                            jQuery( '#togglePreview' ).prop( "checked", true );
                        } else {
                            jQuery( '#togglePreview' ).prop( "checked", false );
                        }

                        if( navSearchModel.toggleMergeMediaByActivity() ) {
                            jQuery( '#toggleMergeMediaByActivity' ).prop( "checked", true );
                        } else {
                            jQuery( '#toggleMergeMediaByActivity' ).prop( "checked", false );
                        }

                        if( navSearchModel.patientNo() ) {
                            jQuery( '#currentPatientSet' ).prop( "disabled", false );
                        } else {
                            jQuery( '#currentPatientSet' ).prop( "disabled", true );
                        }

                        jQuery( "#currentPatientSet" ).change( function() {
                            if( this.checked ) {
                                navSearchModel.currentPatientSet( true );
                                jQuery( "#patientTitle" ).css( 'display', 'inline' );

                            } else {
                                navSearchModel.currentPatientSet( false );
                                jQuery( "#patientTitle" ).css( 'display', 'none' );
                            }
                        } );

                        jQuery( "#togglePreview" ).change( function() {
                            navSearchModel.togglePreview( this.checked );
                            Y.doccirrus.utils.localValueSet( 'DocumentSearchModal-isPreviewVisible', this.checked);
                        } );

                        jQuery( "#toggleMergeMediaByActivity" ).change( function() {
                            navSearchModel.toggleMergeMediaByActivity( this.checked );
                            Y.doccirrus.utils.localValueSet( 'DocumentSearchModal-isMergeMediaByActivityVisible', this.checked);
                        } );
                        ko.applyBindings( navSearchModel, bodyContent.getDOMNode() );
                    } );

                } ).catch( catchUnhandled );

        };
        Y.namespace( 'doccirrus.modals' ).navSearchModal = new NavSearchModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'doccirrus',
            'KoUI-all',
            'KoViewModel',
            'DocumentModel',
            'document-schema',
            'inCaseUtils'
        ]
    }
);
