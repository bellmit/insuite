/**
 * User: abhijit.baldawa
 * Date: 08.05.18  16:12
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, _ */

YUI.add( 'DcEditLabDataTag' , function( Y ) {
    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        unwrap = ko.unwrap,
        KoComponentManager = KoUI.KoComponentManager,
        lodash = _,
        SAVE_FAIL = i18n( 'IncaseAdminMojit.incase_tab_tags.messages.SAVE_FAIL' );

    function showConfirmBox( type, message, method ) {
        Y.doccirrus.DCWindow.notice( {
            type: type,
            message: message,
            window: {
                width: 'medium',
                buttons: {
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'YES', {
                            action: function() {
                                this.close();
                                method();
                            }
                        } ),
                        Y.doccirrus.DCWindow.getButton( 'NO', {
                            isDefault: true,
                            action: function() {
                                this.close();
                            }
                        } )
                    ]
                }
            }
        } );
    }

    function onFail( error ) {
        if(error && typeof error === "string") {
            error = {message:error};
        } else if( typeof error === "object" && !error.message ) {
            if( error.data ) {
                error.message = error.data;
            }
        }

        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            message: error && error.message || 'Undefined error',
            window: {
                width: Y.doccirrus.DCWindow.SIZE_SMALL
            }
        } );
    }

    // -------------------------- Initialize ViewModel for EditableTable ---------------------------------
    /**
     * LabDataTagViewModel for KoEditableTable
     * @param config
     * @constructor
     */
    function LabDataTagViewModel( config ) {
        LabDataTagViewModel.superclass.constructor.call( this, config );
    }

    LabDataTagViewModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        },
        defaultLabTestTypes: {
            value: [],
            lazyAdd: false
        }
    };

    Y.extend( LabDataTagViewModel, KoViewModel.getBase(), {
            titleMap: {},

            initializer: function() {
                var
                    self = this;

                self.titleMap = self.get( 'defaultLabTestTypes' ).reduce( function( obj, item ) {
                    var
                        _item = lodash.assign( {}, item );

                    delete _item._id;
                    obj[ _item.head ] = {
                        title: _item.head || '',
                        testLabel: _item.testLabel || '',
                        sampleNormalValueText: _item.sampleNormalValueText || '',
                        unit: _item.TestResultUnit || ''
                    };
                    return obj;
                }, {} );

                self.initObservables();
            },

            setDefaultValues: function( data ) {
                this.set( 'data', data );
            },

            initObservables: function () {
                var
                    self = this;

                self.type.readOnly = true;

                self.displaySampleNormalValueText = ko.computed( {
                    read: function() {
                        var
                            sampleNormalValueText = unwrap( self.sampleNormalValueText ),
                            result = sampleNormalValueText.join( ', \n' ),
                            minMax = result.split( '-' ),
                            min,
                            max;
                        if( 1 === sampleNormalValueText.length && minMax && 1 < minMax.length ) {
                            min = parseFloat( (minMax[ 0 ] || '').trim() ) || '';
                            max = parseFloat( (minMax[ 1 ] || '').trim() ) || '';
                            return Y.doccirrus.comctl.numberToLocalString( min, { intWithoutDec: true } ) + '-' + Y.doccirrus.comctl.numberToLocalString( max, { intWithoutDec: true } );
                        } else {
                            return result;
                        }
                    },
                    write: function( value ) {
                        var
                            minMax = value.split( '-' ),
                            min,
                            max,
                            result = value;
                        if( minMax && 1 < minMax.length ) {
                            min = Y.doccirrus.comctl.stringToNumber( minMax[ 0 ] );
                            max = Y.doccirrus.comctl.stringToNumber( minMax[ 1 ] );
                            result = min + '-' + max;
                        }
                        self.sampleNormalValueText( [ result ] );
                    }
                } );

                self.displayTitle = ko.computed({
                    read: function() {
                        return unwrap( self.title );
                    },

                    write: function( value ) {
                        self.title(value);
                    }
                });

                self.displayTitle.hasError = ko.computed(function( ) {
                    var
                        titleHasError = unwrap( self.title.hasError ),
                        title = unwrap( self.title ),
                        isValid;

                    isValid = Y.doccirrus.validations.common.LabTest_T_head[0].validator(title);

                    return !isValid || titleHasError;
                });

                self.displayTitle.validationMessages = self.title.validationMessages;
                self.displayTitle.i18n = self.title.i18n;

                self.addDisposable( self.displayTitle.subscribe( function( newValue ) {
                    if( newValue && self.titleMap[ newValue ] ) {
                        self.setDefaultValues( self.titleMap[ newValue ] );
                    }
                } ) );
            },

            isValid: function() {
                var
                    self = this,
                    isValid = LabDataTagViewModel.superclass.isValid.apply(self);

                return isValid && !unwrap(self.displayTitle.hasError);
            },

            destructor: function () {
            }
        },
        {
            schemaName: 'tag',
            NAME: 'LabDataTagViewModel'
        }
    );
    KoViewModel.registerConstructor( LabDataTagViewModel );
    // -------------------------- END. Initialize ViewModel for EditableTable ---------------------------------


    // ---------------------------------------- Initialize EditLabDataTagModal --------------------------------
    function EditLabDataTagModal( config ) {
        EditLabDataTagModal.superclass.constructor.call( this, config );
    }

    Y.extend( EditLabDataTagModal, KoViewModel.getDisposable(), {
        tagsEditorTableData: null,
        tagsEditableTable: null,

        categoriesSelect2Config: null,
        categoriesSelect2Data: null,

        tagsToUpdateTable: null,
        tagsToUpdateData: null,

        tagsEditableTableTitle: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.edit_entry' ),
        tagsCategorySelectionTitle: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.category' ),
        tagsToUpdateTableTitle: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.select_records' ),

        initializer: function ( config ) {
            var
                self = this;

            self.isNotNew = Boolean( config.tag );
            if( !config.tag ) {
                config.tag = {
                    type: 'LABDATA'
                };
            }
            self.tagsToUpdateData = ko.observableArray([]);

            self.categoriesSelect2Data = ko.observableArray( [] );
            self.categoriesSelect2Data( (Array.isArray( config.tag.category ) ? config.tag.category : []) );

            self.tagsEditorTableData = ko.observableArray( [] );
            self.tagsEditorTableData( [{data: lodash.assign( {}, config.tag )}] );
            self.initialData= config.tag || {};
            self.mappingChange = ko.observable( false );

            self.initTagsEditableTable( config.defaultLabTests );
            self.initTagsToUpdateTable();
            self.initCategoriesSelect2();

            if( self.isNotNew ) {
                self.getDistinctLabDataTags( config.tag.title );
            }
        },

        destructor: function () {
        },

        getDistinctLabDataTags: function ( title ) {
            var
                self = this;

            self.tagsToUpdateTable.masked(true);

            Y.doccirrus.jsonrpc.api.tag.getDistinctLabDataTags({
                data: {
                    title: title
                }
            })
            .done( function( result ) {
                self.tagsToUpdateData( result.data.map( function( tag ) {
                    return tag;
                } ) );
                self.tagsToUpdateTable.masked(false);
            } )
            .fail( function( err ) {
                self.tagsToUpdateTable.masked(false);
                onFail(err);
            } );
        },

        initTagsToUpdateTable: function () {
            var
                self = this;

            self.tagsToUpdateTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'IncaseAdminMojit-tagsToUpdateTableLabData',
                    fillRowsToLimit: false,
                    states: ['limit'],
                    remote: false,
                    data: self.tagsToUpdateData,
                    // selectMode: 'multi',
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: ''
                            // checkAllOnToggle: true // can comment this as well
                            // checkMode: 'single',
                            // allToggleVisible: false
                        },
                        {
                            forPropertyName: 'title',
                            isSortable: true,
                            isFilterable: true,
                            label: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.tagTitle' ),
                            title: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.tagTitle' )
                        },
                        {
                            forPropertyName: 'testLabel',
                            isSortable: true,
                            isFilterable: true,
                            label: i18n('labtest-schema.LabTest_T.testLabel.i18n'),
                            title: i18n('labtest-schema.LabTest_T.testLabel.i18n'),
                            renderer: function ( meta ) {
                                return meta.value || '';
                            }
                        },
                        {
                            forPropertyName: 'unit',
                            isSortable: true,
                            isFilterable: true,
                            label: i18n( 'activity-schema.MedData_T.unit.i18n' ),
                            title: i18n( 'activity-schema.MedData_T.unit.i18n' ),
                            renderer: function ( meta ) {
                                return meta.value || '';
                            }
                        },
                        {
                            forPropertyName: 'sampleNormalValueText',
                            isSortable: true,
                            isFilterable: true,
                            label: i18n('labtest-schema.LabTest_T.sampleNormalValueText.i18n'),
                            title: i18n('labtest-schema.LabTest_T.sampleNormalValueText.i18n'),
                            renderer: function ( meta ) {
                                return meta.value || '';
                            }
                        }
                    ]
                }
            } );
        },

        initTagsEditableTable: function ( defaultLabTests ) {
            var
                self = this;

            self.tagsEditableTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                stateId: 'EditLabDataTagModal-tagsEditableTable',
                componentConfig: {
                    ViewModel: LabDataTagViewModel,
                    sharedViewModelData: {
                        defaultLabTestTypes: defaultLabTests
                    },
                    data: self.tagsEditorTableData,
                    columns: [
                        {
                            forPropertyName: 'type',
                            label: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.typeOfTag' ),
                            title: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.typeOfTag' ),
                            renderer: function( meta ) {
                                var
                                    type = meta.row.type();
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'tag', 'Type_E', type, 'i18n', 'k.A.' );

                            }
                        },
                        {
                            forPropertyName: 'displayTitle',
                            label: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.tagTitle' ),
                            title: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.tagTitle' ),
                            inputField: {
                                componentType: 'KoFieldSelect2',
                                componentConfig: {
                                    useSelect2Data: true,
                                    select2Read: function( item ) {
                                        if( !item ) {
                                            return null;
                                        }
                                        return { id: item, text: item };
                                    },
                                    select2Config: {
                                        query: undefined,
                                        initSelection: undefined,
                                        data: defaultLabTests.map( function( item ) {
                                            return { id: item.head, text: item.head };
                                        } ),
                                        createSearchChoice: function( item ) {
                                            return {
                                                id: item,
                                                text: item
                                            };
                                        },
                                        multiple: false
                                    }
                                }
                            }
                        },
                        {
                            forPropertyName: 'testLabel'
                        },
                        {
                            forPropertyName: 'unit'
                        },
                        {
                            forPropertyName: 'displaySampleNormalValueText',
                            label: i18n('labtest-schema.LabTest_T.sampleNormalValueText.i18n'),
                            title: i18n('labtest-schema.LabTest_T.sampleNormalValueText.i18n')
                        },
                        {
                            forPropertyName: 'mapping',
                            label: i18n( 'tag-schema.LabMap_E.i18n' ),
                            title: i18n( 'tag-schema.LabMap_E.i18n' ),
                            inputField: {
                                componentType: 'KoFieldSelect2',
                                componentConfig: {
                                    options: Y.doccirrus.schemas.tag.types.LabMap_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val',
                                    select2Config: {
                                        multiple: false,
                                        allowClear: true
                                    }
                                }
                            },
                            renderer: function( item ) {
                                var value = unwrap( item.value );
                                if( !value || !value.length) {
                                    return '';
                                }
                                if( _.isArray( value ) ) {
                                    return value.map( function(el){
                                        return Y.doccirrus.schemaloader.getEnumListTranslation( 'tag', 'LabMap_E', el, 'i18n', '' );
                                    } ).join( ', ' );
                                }
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'tag', 'LabMap_E', value, 'i18n', '' );
                            }
                        }
                    ],
                    isAddRowButtonDisabled: function() {
                        return true;
                    },
                    isAddRowButtonVisible: function() {
                        return false;
                    }
                }
            } );

            self.addDisposable( ko.computed( function() {
                var
                    rows = unwrap( self.tagsEditableTable.rows ),
                    changedNotMappedField = false,
                    key;

                rows.every( function( rowModel ) {
                    for( key of Object.keys( self.initialData ) ){
                        if( key === 'mapping' ){
                            continue;
                        }
                        changedNotMappedField = changedNotMappedField || !lodash.isEqual( self.initialData[key], unwrap( rowModel[key] ) );
                    }

                    self.mappingChange( !changedNotMappedField && !lodash.isEqual( lodash.sortBy(self.initialData.mapping), lodash.sortBy( unwrap( rowModel.mapping ) ) ) );
                    return rowModel.isValid();
                } ) ;
            } ) );
        },

        initCategoriesSelect2: function ( ) {
            var
                self = this;

            self.categoriesSelect2Config = {
                query: undefined,
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            category = unwrap( self.categoriesSelect2Data);

                        return category.map( function(value){
                            return {
                                id: value,
                                text: Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'MedDataCategory_E', value, 'i18n', value )
                            };
                        });
                    },
                    write: function( $event ) {
                        var
                            index,
                            category = self.categoriesSelect2Data;

                        if( $event.added ) {
                            category.push( $event.added.id );
                        }
                        if( $event.removed ) {
                            index = category.indexOf( $event.removed.id );
                            if( -1 !== index ) {
                                category.splice( index, 1 );
                            }
                        }
                    }
                } ) ),
                placeholder: "",
                select2: {
                    allowClear: true,
                    multiple: true,
                    width: '100%',
                    data: function  __category_select2getData () {
                        return {
                            results: Y.doccirrus.schemas.activity.types.MedDataCategory_E.list.map(function(value){
                                return {
                                    id: value.val,
                                    text: value.i18n
                                };
                            })

                        };
                    },
                    createSearchChoice: function __category_select2createSearchChoice( value ) {
                        return {
                            id: value,
                            text: Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'MedDataCategory_E', value, 'i18n', value )
                        };
                    }
                }
            };
        }
    }, {
        NAME: 'EditLabDataTagModal',
        ATTRS: {}
    } );

    // ---------------------------------------- END. Initialize EditLabDataTagModal --------------------------------



    // --------------------------------------- Initialize EditLabDataTagSelectModal function whose instance will be exported ----------
    function EditLabDataTagSelectModal() {}

    EditLabDataTagSelectModal.prototype.showDialog = function( data, callback ) {
        Promise.resolve(
            Y.doccirrus.jsonrpc.api.jade.renderFile( { path: 'IncaseAdminMojit/views/editLabDataTagDialog' } )
        )
        .then( function( response ) {
            return response && response.data;
        } )
        .then( function( template ) {
            return Y.doccirrus.jsonrpc.api.labtest.read( {
                        query: {
                            userGenerated: true
                        },
                        data: {
                            overrideOptions: true
                        },
                        options: {
                            fields: {
                                head: 1,
                                testLabel: 1,
                                sampleId: 1,
                                TestResultUnit: 1,
                                sampleTestNotes: 1,
                                sampleNormalValueText: 1,
                                testResultLimitIndicator: 1
                            }
                        }
                    } )
                    .then(function( response ) {
                        if( response && response.data && Array.isArray(response.data) ) {
                            return { template: template, defaultLabTests: response.data };
                        } else {
                            return { template: template, defaultLabTests: [] };
                        }
                    });
        } )
        .then( function( params ) {
            var
                modal,
                bodyContent = Y.Node.create( params.template ),
                editLabDataTagModal = new EditLabDataTagModal({tag: data, defaultLabTests: params.defaultLabTests}),
                loadingMaskNode = bodyContent.getDOMNode();

            modal = new Y.doccirrus.DCWindow( {
                bodyContent: bodyContent,
                title: i18n( 'IncaseAdminMojit.incase_tab_tags.modal.title' ),
                icon: Y.doccirrus.DCWindow.ICON_LIST,
                centered: true,
                modal: true,
                maximizable: true,
                width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                render: document.body,
                buttons: {
                    header: ['close', 'maximize'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                            action: function() {
                                modal.close();
                            }
                        } ),
                        Y.doccirrus.DCWindow.getButton( 'SAVE', {
                            isDefault: true,
                            action: function( e ) {
                                var
                                    updatedData = unwrap(editLabDataTagModal.tagsEditableTable.rows),
                                    tagValuesToUpdate = editLabDataTagModal.tagsToUpdateTable.getComponentColumnCheckbox().checked(),
                                    isNotNew = editLabDataTagModal.isNotNew,
                                    mappingChange = unwrap( editLabDataTagModal.mappingChange );


                                if( updatedData && updatedData[0] ) {
                                    updatedData = updatedData[0].toJSON();
                                } else {
                                    updatedData = null;
                                }

                                if( ( !isNotNew || isNotNew && !updatedData.length ) || updatedData && tagValuesToUpdate.length || mappingChange ) {
                                    showConfirmBox("warn", i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_CHANGE_WARNING' ), function( ) {
                                        Y.doccirrus.utils.showLoadingMask(loadingMaskNode);

                                        //Make a websocket call in case the operation takes long time
                                        Y.doccirrus.communication.apiCall( {
                                            method: 'tag.updateLabDataTag',
                                            data: {
                                                data: updatedData,
                                                tagValuesToUpdate: tagValuesToUpdate,
                                                mappingUpdate: mappingChange,
                                                isNew: !isNotNew ? true: false,
                                                isManually: isNotNew && !updatedData.length ? true : false
                                            }
                                        }, function( err ) {
                                            Y.doccirrus.utils.hideLoadingMask(loadingMaskNode);

                                            if( err ) {
                                                if( err.data && Array.isArray(err.data) ) {
                                                    err = err.data[0];
                                                }

                                                if( err === "LABTEST_T_HEAD_ERR" ) {
                                                    onFail( i18n('validations.message.LABTEST_T_HEAD_ERR') );
                                                } else if( err === "TAG_ALREADY_EXISTS" ) {
                                                    onFail( i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_ALREADY_EXISTS', { data: { title: updatedData.title } } ) );
                                                } else if( err === "TAG_NOT_FOUND" ) {
                                                    onFail( i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_NOT_FOUND' ) );
                                                } else {
                                                    onFail( SAVE_FAIL );
                                                }
                                            } else {
                                                modal.close( e );
                                                callback( {success: true} );
                                            }
                                        } );
                                    });
                                }
                            }
                        } )
                    ]
                }
            } );

            modal.set( 'focusOn', [] );

            if( loadingMaskNode.parentNode && loadingMaskNode.parentNode.parentNode ) { //To disable the entire popup
                loadingMaskNode = loadingMaskNode.parentNode.parentNode;
            }

            editLabDataTagModal.addDisposable( ko.computed(function() {
                var
                    editableTableRows = unwrap(editLabDataTagModal.tagsEditableTable.rows),
                    isValid = editableTableRows[0].isValid(),
                    isNotNew = editLabDataTagModal.isNotNew,
                    tagsToUpdate = editLabDataTagModal.tagsToUpdateTable.getComponentColumnCheckbox().checked(),
                    data = editLabDataTagModal.tagsToUpdateTable.rows(),
                    categories = unwrap( editLabDataTagModal.categoriesSelect2Data );

                    if( isValid && ( ( !isNotNew || ( isNotNew && !data.length ) ) || ( tagsToUpdate.length || !tagsToUpdate.length && unwrap( editLabDataTagModal.mappingChange ) && categories.length ) ) ) {
                        modal.getButton( 'SAVE' ).button.enable();
                    } else {
                        modal.getButton( 'SAVE' ).button.disable();
                    }
            }) );
            ko.applyBindings( editLabDataTagModal, bodyContent.getDOMNode() );
        } )
        .catch( onFail );
    };

    // ---------------------------------------END. Initialize EditLabDataTagSelectModal function whose instance will be exported ----------


    Y.namespace( 'doccirrus.modals' ).editLabDataTagSelectModal = new EditLabDataTagSelectModal();

}, '0.0.1', {
    requires: [
        'oop',
        'DCWindow',
        'promise'
    ]
});