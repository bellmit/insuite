/*jslint anon:true, nomen:true*/
/*global YUI, ko, _*/

'use strict';

YUI.add( 'InPacsWorkListViewModel', function( Y ) {

    var
        peek = ko.utils.peekObservable,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n;

    var
        eventTarget = new Y.EventTarget();

    eventTarget.publish( 'orderChanged', { preventable: false } );

    /**
     * @class WorkListItemModel
     * @constructor
     * @param {Object} config configuration object
     * @extends KoViewModel
     */
    function WorkListItemModel( config ) {
        WorkListItemModel.superclass.constructor.call( this, config );
    }

    WorkListItemModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( WorkListItemModel, KoViewModel.getBase(), {

            initializer: function WorkListItemModel_initializer() {
                var
                    self = this;

                self.tagObject = ko.observable( {
                    tagId: ko.unwrap( self.dicomTag ),
                    tagName: ko.unwrap( self.comment )
                } );

                self.userOrder = ko.computed( {
                    read: function() {
                        return self.order();
                    },
                    write: function( value ) {

                        var
                            orderOld = Number( peek( self.order ) ),
                            orderNew = Number( value );

                        self.order( Number( value ) );

                        eventTarget.fire( 'orderChanged', {
                            data: {
                                tagId: peek( self.dicomTag ),
                                orderOld: orderOld,
                                orderNew: orderNew
                            }
                        } );
                    }
                } );

                self.addDisposable( ko.computed( function() {
                    var
                        tobj = ko.unwrap( self.tagObject ),
                        defaultContentForSpecialTags = Y.doccirrus.schemas.inpacsworklist.getDefaultContentForSpecialTags( tobj.tagId );

                    self.content.readOnly( false );

                    self.dicomTag( tobj.tagId );
                    self.comment( tobj.tagName );

                    if( defaultContentForSpecialTags ) {
                        self.contentType( defaultContentForSpecialTags );
                    }

                    switch (tobj.tagId) {
                        case '0008,0050':
                            // Study ID tag
                            self.content.readOnly( true );
                            break;
                            // Study Instance UID tag
                        case '0020,000D':
                            self.name( 'UI' );
                            break;
                    }
                } ) );

            },
            destructor: function WorkListItemModel_destructor() {
            }
        },
        {
            schemaName: 'v_worklistdata.workListData',
            NAME: 'WorkListItemModel'
        }
    );

    KoViewModel.registerConstructor( WorkListItemModel );

    InPacsWorkListViewModel.ATTRS = {
        data: {
            value: null,
            lazyAdd: false
        }
    };

    function InPacsWorkListViewModel() {
        InPacsWorkListViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InPacsWorkListViewModel, KoViewModel.getBase(), {

            templateName: 'InPacsWorkListTemplate',

            workListData: ko.observableArray( [] ),

            // ---------- To configure user defined dicom tag values list -----------
            dicomTagText: ko.observable(),
            dicomCommentTagText: ko.observable(),
            dicomTagCsvValues: ko.observableArray(),
            dicomTagCsvValuesFileDownloadId: ko.observable(),
            dicomTagValuesTable: null,
            // ----------------------------- END ------------------------------------

            /**
             * setter method for dicomTagText, dicomCommentTagText, dicomTagCsvValues and dicomTagCsvValuesFileDownloadId
             * observables
             *
             * @param {string} dicomTag - A dicom tag whose values are configured by user
             * @param {string} dicomCommentTag - A DICOM tag whose value would be the comment from the uploaded CSV
             * @param {Array} dicomTagValues - user configured values for DICOM tag
             * @param {string} dicomTagCsvValuesFileDownloadId - fs.files database ID of the uploaded csv file
             */
            setDicomTagValuesEnum: function( dicomTag, dicomCommentTag, dicomTagValues, dicomTagCsvValuesFileDownloadId ) {
                if( dicomTag ) {
                    this.dicomTagText( dicomTag );
                }

                if( dicomCommentTag ) {
                    this.dicomCommentTagText(dicomCommentTag);
                }

                if( Array.isArray(dicomTagValues) ) {
                    this.dicomTagCsvValues( dicomTagValues );
                }

                if( dicomTagCsvValuesFileDownloadId ) {
                    this.dicomTagCsvValuesFileDownloadId( dicomTagCsvValuesFileDownloadId );
                }
            },

            /**
             * Resets dicomTagText, dicomTagCsvValues and dicomTagCsvValuesFileDownloadId observables
             */
            resetDicomTagValuesEnum: function() {
                this.dicomTagText( undefined );
                this.dicomCommentTagText( undefined );
                this.dicomTagCsvValues.removeAll();
                this.dicomTagCsvValuesFileDownloadId( undefined );
            },

            /**
             * Getter method for dicomTagCsvValuesFileDownloadId observable
             * @returns {string} - fs.files database Id of the uploaded CSV file if present.
             */
            getDicomTagCsvValuesFileDownloadId: function() {
                return this.dicomTagCsvValuesFileDownloadId();
            },

            /**
             * This method combines value of dicomTagText, dicomCommentTagText, dicomTagCsvValues observable array and fileDownloadId
             * observable into an object and returns it in array.
             *
             * @returns { {dicomTag: <string>, dicomCommentTag: <string>, values: [{ id: <string>, value: <string>, comment: <string> }], fileDownloadId: <string> }[]}
             */
            getDicomTagValuesEnum: function() {
                if( !this.dicomTagText() && !this.dicomCommentTagText() && !this.dicomTagCsvValues().length && !this.dicomTagCsvValuesFileDownloadId() ) {
                    // Means the user has not changed anything so no need to build an array
                    return [];
                }

                return [
                    {
                        dicomTag: this.dicomTagText(),
                        dicomCommentTag: this.dicomCommentTagText(),
                        values: this.dicomTagCsvValues(),
                        fileDownloadId: this.dicomTagCsvValuesFileDownloadId()
                    }
                ];
            },

            initializer: function( /*config*/ ) {
                var
                    self = this;

                self.resetDicomTagValuesEnum();
                self.fetchWorkListData();
                self.initTemplate();
                self.initDCOMTagsTable();
                self.initDicomTagValuesTable();
            },

            fetchWorkListData: function() {
                var
                    self = this,
                    workListId = self.get( 'data' ).modality.workListId;

                if( workListId ) {
                    Y.doccirrus.jsonrpc.api.inpacsworklist.read( {
                            query: {
                                _id: workListId
                            }
                        } )
                        .done( function( response ) {
                            var
                                dicomTagsValuesEnum = response && response.data && response.data[0] && Array.isArray( response.data[0].dicomTagValues ) && response.data[0].dicomTagValues[0];

                            self.workListData.removeAll();
                            if( self.dicomTagsTable ) {
                                self.dicomTagsTable.addedRows.removeAll();
                            }
                            self.workListData( _.sortBy( response.data[0].workListData, 'order' ) );

                            if( dicomTagsValuesEnum ) {
                                self.setDicomTagValuesEnum( dicomTagsValuesEnum.dicomTag, dicomTagsValuesEnum.dicomCommentTag, dicomTagsValuesEnum.values || [], dicomTagsValuesEnum.fileDownloadId );
                            } else {
                                self.resetDicomTagValuesEnum();
                            }
                        } );
                }
            },

            destructor: function() {
                eventTarget.detachAll();
            },

            /** @protected */
            initTemplate: function() {
                var
                    self = this;

                self.template = {
                    name: self.templateName,
                    data: self
                };
            },

            getModelData: function() {
                var
                    self = this;
                return {
                    _id: self.get( 'data' ).modality.workListId,
                    workListData: _.sortBy( self.dicomTagsTable.rows().map( function( row ) {
                        return row.toJSON();
                    } ), 'order' ),
                    dicomTagValues: self.getDicomTagValuesEnum()
                };
            },

            initDicomTagValuesTable: function() {
                var
                    self = this;

                self.dicomTagValuesTable = KoComponentManager.createComponent({
                    componentType: 'KoTable',
                    componentConfig: {
                        renderFooter: true,
                        data: self.dicomTagCsvValues,
                        columns: [
                            {
                                forPropertyName: "id",
                                isFilterable: true,
                                label: "#",
                                title: "#",
                                width: "70px"
                            },
                            {
                                forPropertyName: "value",
                                isFilterable: true,
                                label: i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.input' ),
                                title: i18n( 'InPacsAdminMojit.worklist.optionalDicomValues.input' )
                            },
                            {
                                forPropertyName: "comment",
                                isFilterable: true,
                                label: i18n( 'InPacsAdminMojit.table.comment' ),
                                title: i18n( 'InPacsAdminMojit.table.comment' )
                            }
                        ]
                    }
                });
            },

            initDCOMTagsTable: function() {
                var
                    self = this;
                self.dicomTagsTable = KoComponentManager.createComponent( {
                    componentType: 'KoEditableTable',
                    stateId: 'worklist-KoEditableTable',
                    componentConfig: {
                        ViewModel: WorkListItemModel,
                        data: self.workListData,
                        columns: [
                            {
                                forPropertyName: 'userOrder',
                                label: i18n( 'inpacsworklist-schema.WorkListItem_T.order.i18n' ),
                                title: i18n( 'activitysequence-schema.ActivitySequence_T.order.i18n' ),
                                inputField: {
                                    componentConfig: {
                                        valueUpdate: 'change'
                                    }
                                },
                                width: '70px'
                            },
                            {
                                forPropertyName: 'tagObject',
                                label: i18n( 'InPacsAdminMojit.table.dicomTag' ),
                                title: i18n( 'InPacsAdminMojit.table.dicomTag' ),
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        useSelect2Data: true,
                                        select2Read: function( value ) {
                                            return (value && value.text) || '';
                                        },
                                        select2Write: function( $event, observable ) {
                                            observable( $event.added.data );
                                        },
                                        select2Config: {
                                            multiple: false,
                                            createSearchChoice: function( item ) {
                                                return {
                                                    id: item,
                                                    text: item,
                                                    data: {
                                                        tagId: item,
                                                        tagName: ''
                                                    }
                                                };
                                            },
                                            query: function( query ) {
                                                Y.doccirrus.jsonrpc.api.inpacsdicomtags.read( {
                                                    query: {
                                                        tagId: {
                                                            $regex: query.term,
                                                            $options: 'i'
                                                        }
                                                    },
                                                    options: {
                                                        itemsPerPage: 15,
                                                        sort: { tagId: 1 }
                                                    }
                                                } ).done( function( response ) {
                                                    query.callback( {
                                                        results: (response && response.data && response.data.map( function( item ) {
                                                            return { id: item.tagId, text: item.tagId, data: item };
                                                        } )) || []
                                                    } );
                                                } );
                                            }
                                        }
                                    }
                                },
                                renderer: function( meta ) {
                                    var value = ko.unwrap( meta.value );
                                    return value.tagId;
                                }
                            },
                            {
                                forPropertyName: 'name',
                                label: i18n( 'InPacsAdminMojit.table.name' ),
                                title: i18n( 'InPacsAdminMojit.table.name' ),
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        select2Config: {
                                            placeholder: ' ',
                                            minimumInputLength: 1,
                                            multiple: false,
                                            allowClear: true,
                                            createSearchChoice: function( item ) {
                                                return {
                                                    id: item,
                                                    text: item
                                                };
                                            },
                                            quietMillis: 700,
                                            initSelection: function( element, callback ) {
                                                var data = { id: element.val(), text: element.val() };
                                                callback( data );
                                            },
                                            query: function( query ) {
                                                Y.doccirrus.jsonrpc.api.tag.read( {
                                                    query: {
                                                        type: Y.doccirrus.schemas.tag.tagTypes.INPACSNAME,
                                                        title: {
                                                            $regex: query.term,
                                                            $options: 'i'
                                                        }
                                                    },
                                                    options: {
                                                        itemsPerPage: 15,
                                                        sort: { title: 1 }
                                                    },
                                                    fields: { title: 1 }
                                                } ).done( function( response ) {
                                                    query.callback( {
                                                        results: (response && response.data && response.data.map( function( item ) {
                                                            return { id: item.title, text: item.title };
                                                        } )) || []
                                                    } );
                                                } );
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                forPropertyName: 'content',
                                label: i18n( 'InPacsAdminMojit.table.content' ),
                                title: i18n( 'InPacsAdminMojit.table.content' ),
                                getComponentForCell: function( meta ) {
                                    var
                                        dataModel = meta.row,
                                        dicomTag = peek( dataModel.dicomTag );

                                    // Device tag
                                    if( '0040,0001' === dicomTag ) {
                                        return {

                                            componentType: 'KoFieldSelect2',
                                            componentConfig: {
                                                useSelect2Data: true,
                                                select2Read: function( value ) {
                                                    return (value && value.name) || '';
                                                },
                                                select2Write: function( $event, observable ) {
                                                    observable( $event.added.data );
                                                },
                                                select2Config: {
                                                    formatSelection: function( result ) {
                                                        return result;
                                                    },
                                                    multiple: false,
                                                    initSelection: function( element, callback ) {
                                                        var data = { id: element.val(), text: element.val() };
                                                        callback( data );
                                                    },
                                                    query: function( query ) {
                                                        Y.doccirrus.jsonrpc.api.inpacsmodality.read( {
                                                            query: {
                                                                name: { $regex: query.term, $options: 'i' }
                                                            }
                                                        } ).done( function( response ) {
                                                            query.callback( {
                                                                results: (response && response.data && response.data.map( function( item ) {
                                                                    return {
                                                                        id: item.name,
                                                                        text: item.name,
                                                                        data: item
                                                                    };
                                                                } )) || []
                                                            } );
                                                        } );
                                                    }
                                                }
                                            }
                                        };
                                    } else {
                                        return {
                                            componentType: 'KoFieldSelect2',
                                            componentConfig: {
                                                options: self.get( 'data' ).inPacsSchema,
                                                optionsText: 'text',
                                                optionsValue: 'id',
                                                select2Config: {
                                                    placeholder: ' ',
                                                    allowClear: true,
                                                    minimumInputLength: 0,
                                                    multiple: false
                                                }
                                            }
                                        };
                                    }
                                },

                                renderer: function( meta ) {

                                    if( 3 === ko.unwrap( meta.row.contentType ) ) {
                                        return i18n( 'inpacsworklist-schema.ContentType_E.STUDY_ID.i18n' );
                                    }

                                    function setDecorationIfTemplate( text ) {
                                        if( meta.row.template() ) {
                                            return Y.Lang.sub( '<span style="text-decoration: line-through;">{text}</span>', { text: text } );
                                        }
                                        return text;
                                    }

                                    var
                                        val = ko.unwrap( meta.value ),
                                        foundItem = self.get( 'data' ).inPacsSchema.find( function( key ) {
                                            return key.id === val;
                                        } ),
                                        dicomTag = ko.unwrap( meta.row.dicomTag );

                                    if( foundItem ) {
                                        if( 'eingabe' === foundItem.id ) {
                                            meta.row.contentType( Y.doccirrus.schemas.inpacsworklist.getContentTypeForUnMappedTag( dicomTag ) );
                                        } else {
                                            /**
                                             * Meaning previously this dicom tag was configured as "eingabe" (i.e. user configured values)
                                             * so the contentType was set as 1 but later if the user changes to something else then
                                             * if contentType is still 1 then roll back to 0
                                             */
                                            meta.row.contentType( Y.doccirrus.schemas.inpacsworklist.getContentTypeForMappedTag( dicomTag ) );
                                        }
                                        return setDecorationIfTemplate( foundItem.text );
                                    } else {
                                        meta.row.contentType( Y.doccirrus.schemas.inpacsworklist.getContentTypeForMappedTag( dicomTag ) );
                                        return setDecorationIfTemplate( (val && val.name) || '' );
                                    }
                                }
                            },
                            {
                                forPropertyName: 'template',
                                label: i18n( 'inpacsworklist-schema.WorkListItem_T.template.i18n' ),
                                title: i18n( 'inpacsworklist-schema.WorkListItem_T.template.i18n' ),
                                inputField: {
                                    componentConfig: {
                                        valueUpdate: 'change'
                                    }
                                }
                            },
                            {
                                forPropertyName: 'comment',
                                label: i18n( 'InPacsAdminMojit.table.comment' ),
                                title: i18n( 'InPacsAdminMojit.table.comment' ),
                                inputField: {
                                    componentConfig: {
                                        valueUpdate: 'change'
                                    }
                                }
                            },
                            {
                                forPropertyName: 'deleteButton',
                                utilityColumn: true,
                                width: '60px',
                                css: {
                                    'text-center': 1
                                },
                                inputField: {
                                    componentType: 'KoButton',
                                    componentConfig: {
                                        name: 'delete',
                                        title: Y.doccirrus.i18n( 'general.button.DELETE' ),
                                        icon: 'TRASH_O',
                                        click: function( button, $event, $context ) {
                                            var
                                                rowModel = $context.$parent.row;
                                            self.dicomTagsTable.removeRow( rowModel );
                                        }
                                    }
                                }
                            }
                        ],
                        onAddButtonClick: function() {
                            self.dicomTagsTable.addRow( {
                                data: {
                                    order: Math.max.apply( Math, self.dicomTagsTable.rows().map( function( workListItem ) { //  eslint-disable-line prefer-spread
                                        return ko.unwrap( workListItem.order() );
                                    } ) ) + 1
                                }
                            } );
                            return false;
                        }
                    }
                } );

                eventTarget.on( 'orderChanged', function( event ) {

                    var
                        orderCurrent,
                        tagId,
                        tagIdNew = event.data.tagId,
                        orderNew = event.data.orderNew,
                        orderOld = event.data.orderOld,

                        arr = self.workListData().map( function( workListItem ) {

                            orderCurrent = Number( peek( workListItem.order ) );
                            tagId = peek( workListItem.dicomTag );

                            // Reorder in the range between new and old order
                            if( orderOld > orderNew ) {
                                if( tagId !== tagIdNew && orderNew <= orderCurrent && orderCurrent < orderOld ) {
                                    workListItem.order( orderCurrent + 1 );
                                }
                            } else {
                                if( tagId !== tagIdNew && orderNew >= orderCurrent && orderCurrent > orderOld ) {
                                    workListItem.order( orderCurrent - 1 );
                                }
                            }

                            return workListItem.toJSON();
                        } );

                    _.sortBy( arr, 'order' );

                    // KoEditableTable should be refreshed with new order,
                    // so delete all and insert new models
                    self.workListData.removeAll();
                    self.workListData( arr );
                } );
            }
        }, {
            NAME: 'InPacsWorkListViewModel',
            schemaName: 'inpacsworklist'
        }
    );
    KoViewModel.registerConstructor( InPacsWorkListViewModel );
}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'KoEditableTable',
        'InPacsWorkListModel',
        'v_worklistdata-schema',
        'tag-schema'
    ]
} );