/*global fun:true, ko */
/*exported fun*/

'use strict';
fun = function _fn( Y ) {

    var
        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n,
        WHAT = i18n( 'general.title.TITLE' ),
        BTN_ADD = i18n( 'TaskMojit.TASK_TYPES_TAB.button.ADD_NEW_TYPE' ),
        DELETE_ENTRY = i18n( 'TaskMojit.TASK_TYPES_TAB.text.DELETE_ENTRY' );

    /**
     * @constructor
     * @class TabTaskTypeViewModel
     */
    function TabTaskTypeViewModel() {
        TabTaskTypeViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( TabTaskTypeViewModel, KoViewModel.getDisposable(), {

        taskTypesTable: null,
        addNewType: null,

        /** @protected */
        initializer: function() {
            var
                self = this;

            self.pageTitle = i18n( 'TaskMojit.TASK_TYPES_TAB.title' );

            self.initObservables();
            self._initRoleStatuses();
            self.initTaskTypeTable();

            self.addNewType = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_ADD',
                    text: BTN_ADD,
                    click: function() {
                        Y.doccirrus.modals.taskModal.showDialog( {
                            isTaskTypeModel: true,
                            type: Y.doccirrus.schemas.tasktype.taskTypes.USER
                        }, function() {
                            self.taskTypesTable.reload();
                        } );
                    }
                }
            } );
        },

        destructor: function() {
        },

        initObservables: function TabTaskTypeViewModel_initObservables() {
            this.taskTypesTable = ko.observable();
        },
        _initRoleStatuses: function() {
            var
                self = this;

            self.roleStatuses = ko.observableArray( [] );

            Y.doccirrus.jsonrpc.api.role.get( {
                query: {}
            } ).done( function( response ) {
                self.roleStatuses( response.data.map( function( role ) {
                    if( !role ) {
                        return role;
                    }
                    return {
                        value: role.value,
                        text: role.value
                    };
                } ) );
            } );
        },
        getRoleStatuses: function() {
            var
                self = this;
            return ko.computed( function() {
                var roles = ko.unwrap( self.roleStatuses );
                return roles;
            } );
        },
        initTaskTypeTable: function TabTaskTypeViewModel_initTaskTypeTable() {

            var
                self = this;

            self.taskTypesTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'inTimeAdminMojit-taskTypeTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.tasktype.getForTypeTable,
                    baseParams: {
                        query: {_id: {$ne: "000000000000000000000001"}}
                    },
                    columns: [
                        {
                            forPropertyName: 'name',
                            isSortable: true,
                            isFilterable: true,
                            label: i18n( 'tasktype-schema.TaskType_T.name' ),
                            title: i18n( 'tasktype-schema.TaskType_T.name' )
                        },
                        {
                            forPropertyName: 'title',
                            label: WHAT,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'urgency',
                            label: i18n( 'task-schema.Task_T.urgency.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.task.types.Urgency_E.list,
                                optionsCaption: '',
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var data = meta.row;
                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'task', 'Urgency_E', data.urgency, 'i18n' );

                            }
                        },
                        {
                            forPropertyName: 'roles',
                            label: i18n( 'task-schema.Task_T.roles.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                optionsText: 'text',
                                options: self.getRoleStatuses(),
                                optionsValue: 'value'
                            },
                            width: '15%',
                            renderer: function( meta ) {
                                var
                                    roles = meta.value;

                                if( !(Array.isArray( roles ) && roles.length) ) {
                                    return '';
                                }

                                return roles.join( ',<br/>' );
                            }
                        },
                        {
                            forPropertyName: 'candidatesNames',
                            label: i18n( 'task-schema.Task_T.candidates.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {

                                var
                                    candidates = meta.value;

                                if( !candidates ) {
                                    return '';
                                }

                                return candidates.join( ',<br/>' );
                            }
                        },
                        {
                            forPropertyName: 'employeeName',
                            label: i18n( 'task-schema.Task_T.employeeName.i18n' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'details',
                            label: i18n( 'task-schema.Task_T.details.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    value = meta.value,
                                    infos = value && value.split( '\n' );

                                if( Array.isArray( infos ) ) {
                                    return infos && infos.join( '<br/>' );
                                }
                                return value;
                            }
                        },
                        {
                            componentType: 'KoTableColumnRenderer',
                            forPropertyName: 'delete',
                            width: '30px',
                            renderer: function( meta ) {
                                var model = meta.row;
                                if( [Y.doccirrus.schemas.tasktype.templatePrint._id, Y.doccirrus.schemas.tasktype.templateDefault._id].includes( model._id ) ) {
                                    return '';
                                }
                                return '<div style="text-align:center"><span class="fa fa-trash-o"></span></div>';
                            },
                            onCellClick: function( meta ) {
                                var model = meta.row;

                                if( [Y.doccirrus.schemas.tasktype.templatePrint._id, Y.doccirrus.schemas.tasktype.templateDefault._id].includes( model._id ) ) {
                                    return true;
                                }

                                Y.doccirrus.DCWindow.notice( {
                                    type: 'info',
                                    message: DELETE_ENTRY,
                                    window: {
                                        width: 'medium',
                                        buttons: {
                                            footer: [
                                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                                    action: function() {
                                                        this.close();
                                                    }
                                                } ),
                                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                                    isDefault: true,
                                                    action: function() {
                                                        var
                                                            modal = this;
                                                        Y.doccirrus.jsonrpc.api.tasktype.deleteType( {
                                                            query: {
                                                                _id: model._id,
                                                                name: model.name
                                                            }
                                                        } ).done( function() {
                                                            modal.close();
                                                            self.taskTypesTable.reload();
                                                        } ).fail( function( err ) {
                                                            modal.close();
                                                            Y.doccirrus.DCWindow.notice( {
                                                                type: 'error',
                                                                message: ( err && err.message ) || JSON.stringify( err )
                                                            } );
                                                        } );

                                                    }
                                                } )
                                            ]
                                        }
                                    }
                                } );


                            }
                        }
                    ],
                    onRowClick: function( meta ) {
                        var model = meta.row;

                        model.isTaskTypeModel = true;

                        Y.doccirrus.modals.taskModal.showDialog( model, function() {
                            self.taskTypesTable.reload();
                        } );
                    }
                }
            } );
        }
    } );

    return {
        registerNode: function( node ) {
            ko.applyBindings( new TabTaskTypeViewModel(), node.getDOMNode() );
        }
    };
};