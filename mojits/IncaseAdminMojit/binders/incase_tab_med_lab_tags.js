/**
 * User: abhijit.baldawa
 * Date: 08.05.18  12:03
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*global fun:true, ko*/
/*exported fun */
fun = function _fn( Y ) {
    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel,
        viewModel;

    function deleteLabDataTag( data, table ) {
        Y.doccirrus.jsonrpc.api.tag.deleteLabDataTag( { data: data } )
        .then( function(  ) {
            table.reload();
        } )
        .fail( function( err ) {
            var
                message;

            if( err === "TAG_NOT_FOUND" ) {
                message = i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_NOT_FOUND' );
            } else {
                message = i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_DELETE_ERROR' );
            }

            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: message
            } );
        } );
    }

    function deleteMedDataTag( data, table ) {
        Y.doccirrus.jsonrpc.api.tag.deleteOnlyTag( { data: data } )
        .then( function() {
            table.reload();
        } )
        .fail( function( /*err*/ ) {
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: i18n( 'IncaseAdminMojit.incase_tab_tags.messages.TAG_DELETE_ERROR' )
            } );
        } );
    }

    function MedDataLabDataOverviewViewModel( config ) {
        MedDataLabDataOverviewViewModel.superclass.constructor.call( this, config );
    }

    Y.extend( MedDataLabDataOverviewViewModel, KoViewModel.getDisposable(), {
        medDataLabDataOverviewTable: null,

        initializer: function ( config ) {
            var
                self = this;

            self.mainNode = config.node;

            self.initTagsTable();
            self.initButtons();
        },

        destructor: function () {

        },

        initTagsTable: function () {
            var
                self = this;

            self.medDataLabDataOverviewTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'IncaseAdminMojit-tab_med_lab_tag_overviewTable',
                    fillRowsToLimit: false,
                    states: ['limit'],
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.tag.getMedLabData,
                    columns: [
                        {
                            forPropertyName: 'type',
                            label: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.typeOfTag' ),
                            title: i18n( 'IncaseAdminMojit.incase_tab_tags.mainTable.typeOfTag' ),
                            width: "110px",
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: [{val: Y.doccirrus.schemas.tag.tagTypes.LABDATA, i18n: i18n("tag-schema.TagType_E.LABDATA.i18n")}, {val: Y.doccirrus.schemas.tag.tagTypes.MEDDATA, i18n: i18n("tag-schema.TagType_E.MEDDATA.i18n")}],
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    type = meta.value;
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'tag', 'Type_E', type, 'i18n', 'k.A.' );
                            }
                        },
                        {
                            forPropertyName: 'category',
                            label: i18n( 'activity-schema.MedData_T.category.i18n' ),
                            title: i18n( 'activity-schema.MedData_T.category.i18n' ),
                            width: "110px",
                            isSortable: false,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.v_meddata.types.medDataCategory_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var categories = meta.value;
                                if( Array.isArray( categories ) ) {
                                    let
                                        i18nCategories = [],
                                        badges =
                                            categories
                                                // sort the categories alphabetically
                                                .sort()
                                                // print the names as badges, not as text
                                                .map(
                                                    function( category ) {
                                                        var i18nCat = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'MedDataCategory_E', category, 'i18n', '' );
                                                        // Do not add the label to the translated ones, if no translation has been found,
                                                        // because of SECURITY considerations. The translation is put into the title element.
                                                        if( i18nCat.length > 0 ) {
                                                            i18nCategories.push( i18nCat );
                                                        } else {
                                                            i18nCat = category;
                                                        }
                                                        return '<span class="label label-default">'+i18nCat+'</span>';
                                                    }
                                                )
                                                // join them to the final output
                                                .join( "<br/>" );
                                    return '<div title="'+i18nCategories.join( ", " )+'">'+badges+'</div>';
                                }
                                return "";
                            }
                        },
                        {
                            forPropertyName: 'title',
                            isSortable: true,
                            collation:{ locale: 'de', strength: 2, numericOrdering:true},
                            sortInitialIndex: 0,
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
                            label: i18n( 'activity-schema.MedData_T.unit.i18n' ),
                            title: i18n( 'activity-schema.MedData_T.unit.i18n' ),
                            isSortable: true,
                            isFilterable: true,
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
                                        multiple: false
                                    }
                                }
                            },
                            renderer: function( item ) {
                                if( !item.value || !item.value.length){
                                    return '';
                                }
                                return item.value.map( function(el){
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'tag', 'LabMap_E', el, 'i18n', '' );
                                } ).join( ', ' );
                            }
                        },
                        {
                            forPropertyName: '',
                            width: '5%',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( ) {
                                return Y.Lang.sub( '<button class="btn btn-default"><span class=" fa fa-pencil"></button>' );
                            },
                            onCellClick: function( meta ) {
                                var
                                    modalToCall;

                                if( meta.row.type === Y.doccirrus.schemas.tag.tagTypes.LABDATA ) {
                                    modalToCall = "editLabDataTagSelectModal";
                                } else if( meta.row.type === Y.doccirrus.schemas.tag.tagTypes.MEDDATA ) {
                                    modalToCall = "editMedDataTagSelectModal";
                                }

                                if( modalToCall ) {
                                    Y.doccirrus.modals[modalToCall].showDialog( meta.row, function( result ) {
                                        if( result.success ) {
                                            self.medDataLabDataOverviewTable.reload();
                                        }
                                    } );
                                }

                                return false;
                            }
                        },
                        {
                            forPropertyName: '',
                            width: '5%',
                            isFilterable: false,
                            isSortable: false,
                            renderer: function( ) {
                                return Y.Lang.sub( '<button class="btn btn-default"><span class=" fa fa-trash-o"></button>' );
                            },
                            onCellClick: function( meta ) {
                                var
                                    row = meta.row;

                                Y.doccirrus.jsonrpc.api.tag.generateTagDeleteText( {
                                    data: row
                                } )
                                .done( function( result ) {
                                    if( !result.data.default ){
                                        Y.doccirrus.DCWindow.notice( {
                                            type: 'warn',
                                            message: result.data.message
                                        } );
                                    } else {
                                        Y.doccirrus.DCWindow.confirm( {
                                            type:  'warn',
                                            title: i18n( 'DCWindow.notice.title.warn' ),
                                            message: result.data.message,
                                            buttonOkConfig: {
                                                disabled: false
                                            },
                                            callback: function( dialog ) {
                                                if( dialog.success ) {
                                                    if( row.type === Y.doccirrus.schemas.tag.tagTypes.LABDATA ) {
                                                        deleteLabDataTag(row, self.medDataLabDataOverviewTable);
                                                    } else if( row.type === Y.doccirrus.schemas.tag.tagTypes.MEDDATA ) {
                                                        deleteMedDataTag(row, self.medDataLabDataOverviewTable);
                                                    }
                                                }
                                            },
                                            window: {
                                                width: 'medium'
                                            }
                                        } );
                                    }
                                } )
                                .fail( function( err ) {
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

                                return false;
                            }
                        }
                    ]
                }
            } );
        },
        initButtons: function() {
            var
                self = this;
            self.labDataButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_LABDATA',
                    text: i18n( 'IncaseAdminMojit.incase_tab_tags.buttons.ADD_LABDATA' ),
                    option: 'PRIMARY',
                    click: function() {
                        Y.doccirrus.modals.editLabDataTagSelectModal.showDialog( null, function( result ) {
                            if( result.success ) {
                                self.medDataLabDataOverviewTable.reload();
                            }
                        } );
                    }
                }
            } );

            self.medDataButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_MEDDATA',
                    text: i18n( 'IncaseAdminMojit.incase_tab_tags.buttons.ADD_MEDDATA' ),
                    option: 'PRIMARY',
                    click: function() {
                        Y.doccirrus.modals.editMedDataTagSelectModal.showDialog( null, function( result ) {
                            if( result.success ) {
                                self.medDataLabDataOverviewTable.reload();
                            }
                        } );
                    }
                }
            } );
        }
    } );

    return {
        registerNode: function( node ) {
            viewModel = new MedDataLabDataOverviewViewModel({
                node: node.getDOMNode()
            });

            ko.applyBindings( viewModel, node.getDOMNode() );
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );

            // clear the viewModel
            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }

        }
    };
};