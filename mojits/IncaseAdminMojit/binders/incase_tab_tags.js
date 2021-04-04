/*eslint prefer-template: 0 */
/*global fun:true, ko */
/*exported fun */
'use strict';

fun = function _fn( Y, NAME ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n,
        SAVE_FAIL = i18n( 'IncaseAdminMojit.incase_tab_tags.messages.SAVE_FAIL' ),

        tabTagsViewModel;

    function showError( message ) {
        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            message: message || SAVE_FAIL
        } );
    }

    /**
     * Object responsible for updating and deleting of different tag types
     * @returns {{destroy: destroy}}
     * @constructor
     */
    function TagProcessOnEventHandler() {

        var
            eventTarget = new Y.EventTarget();

        Object.keys( Y.doccirrus.schemas.tag.tagTypes ).forEach( function( tagType ) {
            eventTarget.publish( 'updateTag_' + Y.doccirrus.schemas.tag.tagTypes[tagType], { preventable: false } );
            eventTarget.publish( 'deleteTag_' + Y.doccirrus.schemas.tag.tagTypes[tagType], { preventable: false } );
        } );

        eventTarget.on( 'updateTag_' + Y.doccirrus.schemas.tag.tagTypes.SUBTYPE, updateSubTypeTag );
        eventTarget.on( 'deleteTag_' + Y.doccirrus.schemas.tag.tagTypes.SUBTYPE, deleteSubTypeTag );

        eventTarget.on( 'updateTag_' + Y.doccirrus.schemas.tag.tagTypes.DOCUMENT, updateDocumentTag );
        eventTarget.on( 'deleteTag_' + Y.doccirrus.schemas.tag.tagTypes.DOCUMENT, deleteDocumentTag );

        eventTarget.on( 'updateTag_' + Y.doccirrus.schemas.tag.tagTypes.CANCELREASON, updateOnlyTag );
        eventTarget.on( 'deleteTag_' + Y.doccirrus.schemas.tag.tagTypes.CANCELREASON, deleteOnlyTag );

        eventTarget.on( 'updateTag_' + Y.doccirrus.schemas.tag.tagTypes.CATALOG, updateCatalogTag );
        eventTarget.on( 'deleteTag_' + Y.doccirrus.schemas.tag.tagTypes.CATALOG, deleteCatalogTag );

        eventTarget.on( 'updateTag_' + Y.doccirrus.schemas.tag.tagTypes.DOSE, updateOnlyTag );
        eventTarget.on( 'deleteTag_' + Y.doccirrus.schemas.tag.tagTypes.DOSE, deleteOnlyTag );

        eventTarget.on( 'updateTag_' + Y.doccirrus.schemas.tag.tagTypes.PHNOTE, updateOnlyTag );
        eventTarget.on( 'deleteTag_' + Y.doccirrus.schemas.tag.tagTypes.PHNOTE, deleteOnlyTag );

        eventTarget.on( 'updateTag_' + Y.doccirrus.schemas.tag.tagTypes.PHREASON, updateOnlyTag );
        eventTarget.on( 'deleteTag_' + Y.doccirrus.schemas.tag.tagTypes.PHREASON, deleteOnlyTag );

        function reloadTable() {
            tabTagsViewModel.tagsTable.reload();
        }

        function updateSubTypeTag( event ) {

            var
                model = event.data,
                jsonData = model.toJSON() ;

            jsonData.oldTitle = model.oldTitle();

            Y.doccirrus.jsonrpc.api.tag.updateSubTypeTag( { data: jsonData } )
                .done( function() {
                    model.setNotModified();
                    reloadTable();
                } )
                .fail( function() {
                    showError();
                } );
        }

        function updateDocumentTag( event ) {
            var
                model = event.data;

            Y.doccirrus.jsonrpc.api.tag.updateDocumentTag( { data: model.toJSON() } )
                .done( function() {
                    model.setNotModified();
                    reloadTable();
                } )
                .fail( function() {
                    showError();
                } );
        }

        function updateCatalogTag( event ) {
            var
                model = event.data;

            Y.doccirrus.jsonrpc.api.tag.updateCatalogTag( {data: model.toJSON()} )
                .done( function() {
                    model.setNotModified();
                    reloadTable();
                } )
                .fail( function() {
                    showError();
                } );
        }

        function updateOnlyTag( event ) {
            var
                model = event.data;

            Y.doccirrus.jsonrpc.api.tag.updateOnlyTag( { data: model.toJSON() } )
                .done( function() {
                    model.setNotModified();
                    reloadTable();
                } )
                .fail( function() {
                    showError();
                } );
        }

        function deleteSubTypeTag( event ) {
            var
                model = event.data;

            Y.doccirrus.jsonrpc.api.tag.deleteSubTypeTag( { data: model.toJSON() } ).then( reloadTable ).fail( showError );
        }

        function deleteDocumentTag( event ) {
            var
                model = event.data;

            Y.doccirrus.jsonrpc.api.tag.deleteDocumentTag( { data: model.toJSON() } ).then( reloadTable ).fail( showError );
        }

        function deleteOnlyTag( event ) {
            var
                model = event.data;

            Y.doccirrus.jsonrpc.api.tag.deleteOnlyTag( { data: model.toJSON() } ).then( reloadTable ).fail( showError );
        }

        function deleteCatalogTag( event ) {
            var
                model = event.data;

            Y.doccirrus.jsonrpc.api.tag.deleteCatalogTag( {data: model.toJSON()} ).then( reloadTable ).fail( showError );
        }

        function destroy() {
            eventTarget.detachAll();
        }

        function fireUpdateTagEvent( data ) {
            eventTarget.fire( 'updateTag_' + ko.unwrap( data.type() ), { data: data } );
        }

        function fireDeleteTagEvent( data ) {
            eventTarget.fire( 'deleteTag_' + ko.unwrap( data.type() ), { data: data } );
        }

        return {
            destroy: destroy,
            fireUpdateTagEvent: fireUpdateTagEvent,
            fireDeleteTagEvent: fireDeleteTagEvent
        };
    }

    var
        tagProcessingEventHandler = new TagProcessOnEventHandler();

    /**
     * TagViewModel for KoEditableTable
     * @param config
     * @constructor
     */
    function TagViewModel( config ) {
        TagViewModel.superclass.constructor.call( this, config );
    }

    TagViewModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };
    Y.extend( TagViewModel, KoViewModel.getBase(), {

            initializer: function WorkListItemModel_initializer() {
                this.type.readOnly = true;
                this.oldTitle = ko.observable();
                this.saveButton = ko.observable();
                this.saveButton.disabled = ko.computed( function() {
                    return !this.isModified();
                }, this );
            },
            destructor: function WorkListItemModel_destructor() {
            }
        },
        {
            schemaName: 'tag',
            NAME: 'TagViewModel'
        }
    );
    KoViewModel.registerConstructor( TagViewModel );

    /**
     * @constructor
     * @class TabTagsViewModel
     */
    function TabTagsViewModel() {
        TabTagsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( TabTagsViewModel, KoViewModel.getDisposable(), {

        tagsData: null,
        tagsEditableTable: null,

        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initObservables();
            //self.readTagsData();
            self.initTagsTable();
        },

        destructor: function() {
            tagProcessingEventHandler.destroy();
        },

        initObservables: function TabTagsViewModel_initObservables() {
            this.tagsData = ko.observableArray( [] );
            this.tagsEditableTable = ko.observable();
        },

        /**
         * KoTable replaces KoEditableTable which was used in previous versions
         */

        initTagsTable: function TabTagsViewModel_initTagsTable() {
            var
                self = this,
                tagTypes = Y.doccirrus.schemas.tag.types.Type_E.list.filter( filterTagTypes );
            
            function filterTagTypes( item ) {
                return item.val !== 'MEDDATA' && item.val !== 'LABDATA';
            }

            self.NEW_TAG = i18n( 'IncaseAdminMojit.incase_tab_tags.messages.CREATE_TAG' );

            self.tagsTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'inCaseAdmin-tags',
                    states: ['limit'],

                    remote: true,
                    proxy: self.readTags,
                    limit: 20,
                    limitList: [10, 20, 30, 40, 50],
                    sortersLimit: 1,

                    columns: [
                        {
                            forPropertyName: 'type',
                            label: i18n( 'tag-schema.Type_E.i18n' ),
                            title: i18n( 'tag-schema.Type_E.i18n' ),
                            width: '30%',
                            isFilterable: true,
                            isSortable: true,

                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: tagTypes,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },

                            renderer: function( meta ) {
                                var
                                    type = meta.row.type;
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'tag', 'Type_E', type, 'i18n', 'k.A.' );

                            }
                        },
                        {
                            forPropertyName: 'title',
                            label: i18n( 'tag-schema.Tag_T.title.i18n' ),
                            //width: '60%',
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'editButton',
                            label: "",
                            title: "",
                            width: '50px',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( /* meta */ ) {
                                return '<button class="btn btn-default KoButton"><i class="glyphicon glyphicon-pencil"></i></button>';
                            },
                            onCellClick: function( meta ) {
                                self.editTagValue( meta );
                            }
                        },
                        {
                            forPropertyName: 'deleteButton',
                            label: "",
                            title: "",
                            width: '50px',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( /* meta */ ) {
                                return '<button class="btn btn-default KoButton"><i class="fa fa-trash-o"></i></button>';
                            },
                            onCellClick: function( meta ) {
                                self.confirmDeleteTag( meta );
                            }
                        }
                    ]
                }
            } );

        },

        /**
         *  Proxy to force baseParams
         *
         *  @param  {Object}    options
         *  @param  {Object}    options.query
         */

        readTags: function( options ) {
            options.query = options.query || {};
            if ( !options.query.type ) {
                options.query.type = { $nin: ['LABDATA', 'MEDDATA'] };
            }
            return Y.doccirrus.jsonrpc.api.tag.read( options );
        },

        /**
         *  Show a prompt for changing a tag's title
         *
         *  @param  {Object}    meta
         *  @param  {Object}    meta.row    Plain tag object
         */

        editTagValue: function( meta ) {
            Y.doccirrus.DCWindow.prompt( {
                title: i18n( 'DCWindow.BUTTONS.EDIT' ),
                defaultValue: meta.row.title,
                callback: onValueChanged
            } );

            function onValueChanged( evt ) {
                var
                    newValue = evt.data ? evt.data.trim() : '',
                    tagVM = new TagViewModel( { data: meta.row } );

                //  tags shouldn't be empty
                if ( '' === newValue ) { return; }

                tagVM.oldTitle( meta.row.title );
                tagVM.title( newValue );

                tagProcessingEventHandler.fireUpdateTagEvent( tagVM );
            }
        },

        /**
         *  Raised in response to delete buttons, pops a modal to confirm
         *
         *  @param  {Object}    meta
         *  @param  {Object}    meta.row    Plain tag object
         */

        confirmDeleteTag: function( meta ) {
            var model = new TagViewModel( { data: meta.row } );

            Y.doccirrus.jsonrpc.api.tag.generateTagDeleteText( {
                data: model
            } ).done( function( result ) {
                Y.doccirrus.DCWindow.confirm( {
                    type:  'warn',
                    title: i18n( 'DCWindow.notice.title.warn' ),
                    message: result.data.message,
                    buttonOkConfig: {
                        disabled: model.type() === 'CATALOG' && !result.data.default
                    },
                    callback: function( dialog ) {
                        if( dialog.success ) {
                            tagProcessingEventHandler.fireDeleteTagEvent( model );
                        }
                    },
                    window: {
                        width: 'medium'
                    }
                } );
            } ).fail( function( err ) {
                var
                    message;

                if( err === "TAG_NOT_FOUND" ) {
                    message = i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_NOT_FOUND' );
                } else {
                    message = i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_DELETE_DATA_ERR' );
                }

                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: message
                } );
            } );
        },

        /**
         *  Open a modal with a small form to create new tags (called by Ko button)
         */

        addNewTag: function() {
            var self = this;

            Y.doccirrus.modals.createTag.show( { onAdd: onAdd } );

            function onAdd( newTag ) {
                if ( !newTag.duplicate ) {
                    Y.log( 'New tag created: ' + newTag.type + ' ' + newTag.title, 'info', NAME );
                    self.tagsTable.reload();
                }
            }
        }

    }, {
        NAME: 'TabTagsViewModel',
        ATTRS: {}
    } );

    return {

        registerNode: function( node ) {
            tabTagsViewModel = new TabTagsViewModel();
            ko.applyBindings( tabTagsViewModel, node.getDOMNode() );
        },

        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};
