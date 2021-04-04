/**
 * User: pi
 * Date: 25/09/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */


/*global YUI, ko, moment, _ $*/

'use strict';

YUI.add( 'TaskViewModel', function( Y, NAME ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
        MAX_LIMIT = i18n( 'TaskMojit.message.max_limit' ),
        WHAT = i18n( 'general.title.WHAT' ),
        LABEL_ASSIGNED = i18n( 'TaskMojit.TaskModal.label.COLUMN' ),
        BTN_CREATE_GRAPHIC = 'BTN_CREATE_GRAPHIC',
        PLUS = 'PLUS',
        CONFIRM_DELETE = i18n( 'CalendarMojit.tab_task_JS.message.CONFIRM_DELETE' ),
        unwrap = ko.unwrap,

        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    /**
    * default error notifier
     * @param {object} response
    */
    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            _.invoke( errors, 'display' );
        }

    }

    /**
     * This views TasksViewModel
     * @constructor
     */
    function TasksViewModel( conf ) {

        this.filterQuery = conf.filterQuery || {};
        this.pdfTitle = (conf && conf.pdfTitle ) ? conf.pdfTitle : '';

        TasksViewModel.superclass.constructor.apply( this, conf );
    }

    TasksViewModel.ATTRS = {
        /**
         * All specified fields will be subscribed( from data model )
         */
        whiteList: {
            value: [],
            lazyAdd: false
        },

        subModelsDesc: {
            value: [],
            lazyAdd: false
        },
        binder: {
            valueFn: function() {
                return Y.doccirrus.utils.getMojitBinderByType( 'InTaskMojitBinder' );
            },
            lazyAdd: false
        }
    };

    Y.extend( TasksViewModel, KoViewModel.getDisposable(), {
        /**
         * A name to identify this view model by
         * @property {String} viewName
         */
        viewName: 'tab_tasks_active',
        /** @protected */
        initializer: function TabTasksViewModel_initializer( /* config */ ) {
            var
                self = this;

            self._initRoleStatuses();
            self._initTaskTypes();
            self._initTasksViewModel();
            self._initActions();
            self._initTasksKoTable();
            self._initCommunication();
            self._initSelect2Roles();
            self._initSelect2TaskTypes();
            self._initSelect2Urgency();
            self.initSelect2List();
            self._getLocalStorageConfig();
            self._loadConfiguration();
            self._loadTasks();
            self.initDrag();
        },
        /** @protected */
        destructor: function TabTasksViewModel_destructor() {
            var
                self = this;

            self.destroyTasksViewModel();
        },
        /** @protected */
        _initTasksViewModel: function TasksViewModel__initTasksViewModel() {
            var
                self = this;

            self.isAdmin = Y.doccirrus.auth.isAdmin();
            self.filterQueryObservable = ko.observable( self.filterQuery );
            self.isAdminUser = ko.observable( Y.doccirrus.auth.isAdmin() );
            self.tasksData = ko.observableArray( [] );
            self.listArray = ko.observableArray( [] );
            self.filteredListArray = ko.observableArray( [] );
            self.urgencyList = Y.doccirrus.schemas.task.types.Urgency_E.list;
            self.eventStateListener = Y.after( 'tab_tasks-state', self.eventStateListenerHandler, self );
            self.isDragging = ko.observable( false );
            self.showClosedTasksFilter = ko.observable( false );

            self.alertTimeComponent = KoComponentManager.createComponent( {
                componentType: 'KoSchemaValue',
                componentConfig: {
                    fieldType: 'DateRange',
                    showLabel: false,
                    isOnForm: true,
                    required: false,
                    placeholder: i18n( 'task-schema.Task_T.alertTime.i18n' )
                }
            } );

            self.scheduleComponent = KoComponentManager.createComponent( {
                componentType: 'KoSchemaValue',
                componentConfig: {
                    fieldType: 'DateRange',
                    showLabel: false,
                    isOnForm: true,
                    required: false,
                    placeholder: i18n( 'task-schema.Task_T.nextSchedule.i18n' )
                }
            } );

            self.linkedScheduleComponent = KoComponentManager.createComponent( {
                componentType: 'KoSchemaValue',
                componentConfig: {
                    fieldType: 'DateRange',
                    showLabel: false,
                    isOnForm: true,
                    required: false,
                    placeholder: i18n( 'task-schema.Task_T.linkedSchedule.i18n' )
                }
            } );

            self.lastScheduleComponent = KoComponentManager.createComponent( {
                componentType: 'KoSchemaValue',
                componentConfig: {
                    fieldType: 'DateRange',
                    showLabel: false,
                    isOnForm: true,
                    required: false,
                    placeholder: i18n( 'task-schema.Task_T.lastSchedule.i18n' )
                }
            } );

            self.isTaskSelected = ko.pureComputed( function() {
                return this.tasksKoTable.getComponentColumnCheckbox().checked().length;
            }, this );

            self.allowGroupActions = ko.pureComputed( function() {
                return 1 < this.tasksKoTable.getComponentColumnCheckbox().checked().length;
            }, this );

            // filters
            self.filterView = ko.observable( true );
            self.detailsFilterValue = ko.observable( '' );
            self.titleFilterValue = ko.observable( '' );
            self.candidatesNamesFilterValue = ko.observable( '' );
            self.patientNameFilterValue = ko.observable( '' );
            self.creatorNameFilterValue = ko.observable( '' );
            self.employeeNameFilterValue = ko.observable( '' );
            self.rolesFilterValue = ko.observableArray( [] );
            self.tasksFilterValue = ko.observableArray( [] );
            self.urgencyFilterValue = ko.observableArray( [] );
            self.dateCreatedFilterValue = ko.observable( '' );
            self.localStorageConfigs = ko.observableArray( [] );
            self.configurationFilterValue = ko.observable( '' );
            self.listFilterValue = ko.observableArray( [] );

            // configuration
            self.details = ko.observable( false );
            self.title = ko.observable( true );
            self.candidates = ko.observable( true );
            self.patientName = ko.observable( true );
            self.creatorName = ko.observable( false );
            self.employeeName = ko.observable( false );
            self.roles = ko.observable( false );
            self.tasks = ko.observable( true );
            self.urgency = ko.observable( true );
            self.dateCreated = ko.observable( false );
            self.alertTime = ko.observable( true );
            self.schedule = ko.observable( false );
            self.linkedSchedule = ko.observable( false );
            self.lastSchedule = ko.observable( false );
            self.detailsFilter = ko.observable( true );
            self.titleFilter = ko.observable( false );
            self.candidatesFilter = ko.observable( true );
            self.patientNameFilter = ko.observable( true );
            self.creatorNameFilter = ko.observable( true );
            self.employeeNameFilter = ko.observable( true );
            self.rolesFilter = ko.observable( true );
            self.listsFilter = ko.observable( false );
            self.tasksFilter = ko.observable( true );
            self.urgencyFilter = ko.observable( true );
            self.dateCreatedFilter = ko.observable( false );
            self.scheduleFilter = ko.observable( false );
            self.linkedScheduleFilter = ko.observable( false );
            self.lastScheduleFilter = ko.observable( false );

            // translations
            self.detailsI18n = i18n( 'task-schema.Task_T.details.i18n' );
            self.titleI18n = WHAT;
            self.candidatesNamesI18n = i18n( 'task-schema.Task_T.candidates.i18n' );
            self.patientNameI18n = i18n( 'task-schema.Task_T.patient.i18n' );
            self.creatorNameI18n = i18n( 'task-schema.Task_T.creatorName.i18n' );
            self.employeeNameI18n = i18n( 'task-schema.Task_T.employeeName.i18n' );
            self.rolesI18n = i18n( 'task-schema.Task_T.roles.i18n' );
            self.taskTypesI18n = i18n( 'tasktype-schema.TaskType_T.type' );
            self.urgencyI18n = i18n( 'task-schema.Task_T.urgency.i18n' );
            self.alertTimeI18n = i18n( 'task-schema.Task_T.alertTime.i18n' );
            self.scheduleI18n = i18n( 'task-schema.Task_T.nextSchedule.i18n' );
            self.linkedScheduleI18n = i18n( 'task-schema.Task_T.linkedSchedule.i18n' );
            self.lastScheduleI18n = i18n( 'task-schema.Task_T.lastSchedule.i18n' );
            self.dateCreatedI18n = i18n( 'task-schema.Task_T.dateCreated.i18n' );
            self.filterI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.FILTER' );
            self.labelAssignedI18n = LABEL_ASSIGNED;
            self.tasksTitleI18n = i18n( 'TaskMojit.labels.tasks_title' );
            self.showCompletedTasksI18n = i18n( 'TaskMojit.labels.show_completed_tasks' );
            self.createTaskGraphicI18n = i18n( 'TaskMojit.TaskModal.button.CREATE_TASK' );

            self.addDisposable( ko.computed( function() {
                var
                    filteredList = [],
                    list = unwrap( self.listFilterValue );
                unwrap( self.listArray ).forEach( function( item ) {
                    var
                        filtered = list.some( function( i ) {
                            return i.id === item._id;
                        } );
                    if( !filtered && list.length ) {
                        return;
                    }
                    filteredList.push( item );
                } );
                self.filteredListArray( filteredList );
            } ) );

            self.addDisposable( ko.computed( function() {
                var
                    rolesData = [],
                    tasksData = [],
                    urgencyData = [],
                    details = unwrap( self.detailsFilterValue ),
                    title = unwrap( self.titleFilterValue ),
                    candidatesNames = unwrap( self.candidatesNamesFilterValue ),
                    patientName = unwrap( self.patientNameFilterValue ),
                    creatorName = unwrap( self.creatorNameFilterValue ),
                    employeeName = unwrap( self.employeeNameFilterValue ),
                    roles = unwrap( self.rolesFilterValue ),
                    tasks = unwrap( self.tasksFilterValue ),
                    urgency = unwrap( self.urgencyFilterValue ),
                    alertTime = unwrap( self.alertTimeComponent.value ),
                    schedule = unwrap( self.scheduleComponent.value ),
                    linkedSchedule = unwrap( self.linkedScheduleComponent.value ),
                    lastSchedule = unwrap( self.lastScheduleComponent.value ),
                    dateCreated = unwrap( self.dateCreatedFilterValue ),
                    preparedData = _.assign( {}, self.filterQuery );
                if( details && details.length ) {
                    preparedData.details = {
                      iregex: details
                    };
                }

                if( title && title.length ) {
                    preparedData.title = {
                        iregex: title
                    };
                }

                if( candidatesNames && candidatesNames.length ) {
                    preparedData.candidatesNames = {
                        iregex: candidatesNames
                    };
                }

                if( patientName && patientName.length ) {
                    preparedData.patientName = {
                        iregex: patientName
                    };
                }

                if( creatorName && creatorName.length ) {
                    preparedData.creatorName = {
                        iregex: creatorName
                    };
                }

                if( employeeName && employeeName.length ) {
                    preparedData.employeeName = {
                        iregex: employeeName
                    };
                }

                if( roles && roles.length ) {
                    roles.forEach( function( role ) {
                        rolesData.push( role.id );
                    });
                    preparedData.roles = {
                        $in: rolesData
                    };
                }

                if( tasks && tasks.length ) {
                    tasks.forEach( function( role ) {
                        tasksData.push( role.id );
                    });
                    preparedData['taskTypeObj.name'] = {
                        $in: tasksData
                    };
                }

                if( urgency && urgency.length ) {
                    urgency.forEach( function( u ) {
                        urgencyData.push( u.id );
                    });
                    preparedData.urgency = {
                        $in: urgencyData
                    };
                }

                if( alertTime && alertTime.date1 && alertTime.date2 ) {
                    preparedData.alertTime = {
                        $gte: alertTime.date1,
                        $lte: alertTime.date2
                    };
                }

                if( schedule && schedule.date1 && schedule.date2 ) {
                    preparedData.schedule = {
                        $gte: schedule.date1,
                        $lte: schedule.date2
                    };
                }

                if( linkedSchedule && linkedSchedule.date1 && linkedSchedule.date2 ) {
                    preparedData.linkedSchedule = {
                        $gte: linkedSchedule.date1,
                        $lte: linkedSchedule.date2
                    };
                }

                if( lastSchedule && lastSchedule.date1 && lastSchedule.date2 ) {
                    preparedData.lastSchedule = {
                        $gte: lastSchedule.date1,
                        $lte: lastSchedule.date2
                    };
                }

                if( dateCreated && dateCreated.length ) {
                    preparedData.dateCreated = {
                        dckvdob: dateCreated
                    };
                }

                self.filterQueryObservable( preparedData );
                self._loadTasks();
            }).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}}) );

            self.addDisposable( ko.computed( function() {
                var
                    configs = unwrap( self.configurationFilterValue );

                self.detailsFilterValue( configs.detailsFilterValue || '' );
                self.titleFilterValue( configs.titleFilterValue || '' );
                self.candidatesNamesFilterValue( configs.candidatesNamesFilterValue || '' );
                self.patientNameFilterValue( configs.patientNameFilterValue || '' );
                self.creatorNameFilterValue( configs.creatorNameFilterValue || '' );
                self.employeeNameFilterValue( configs.employeeNameFilterValue || '' );
                self.rolesFilterValue( configs.rolesFilterValue || [] );
                self.tasksFilterValue( configs.tasksFilterValue || [] );
                self.urgencyFilterValue( configs.urgencyFilterValue || [] );
                self.alertTimeComponent.value( configs.alertTimeComponent || '');
                self.scheduleComponent.value( configs.scheduleComponent || '');
                self.linkedScheduleComponent.value( configs.linkedScheduleComponent || '');
                self.lastScheduleComponent.value( configs.lastScheduleComponent || '');
                self.dateCreatedFilterValue( configs.dateCreatedFilterValue || '' );
                self.listFilterValue( configs && configs.listFilterValue || [] );
            }));

            self.isTasksDataNotEmpty = ko.computed( function() {
                var
                    tasksData = unwrap( self.tasksData );
                return 0 < tasksData.length;
            } );
        },

        eventStateListenerHandler: function( yEvent, state ) {
            var
                self = this,
                id = state.params.id;

            switch( state.view ) {
                case 'details':
                    self.displayTaskDetails( (id) );
                    break;
            }
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
        _initTaskTypes: function() {
            var
                self = this;

            self.taskTypes = ko.observableArray( [] );

            Y.doccirrus.jsonrpc.api.tasktype.getForTypeTable( { query: {} } ).done( function( response ) {
                self.taskTypes( response.data.map( function( item ) {
                    return self.select2TaskTypeMapper( item );
                } ) );
            } );
        },
        _taskTypeSubscription: null,
        _initCommunication: function() {
            var
                self = this;

            self._taskTypeSubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'tasktype',
                callback: function( /*data, meta*/ ) {
                    self.tasksKoTable.reload();
                }
            } );
        },
        _destroyCommunication: function() {
            var
                self = this;

            if( self._taskTypeSubscription ) {
                self._taskTypeSubscription.removeEventListener();
                self._taskTypeSubscription = null;
            }
        },
        /**
         * displays tasks details
         * @param {this} context
         * @param {object} item
         * @param {object} event
         */
        showTaskDetails: function( context, item, event ) {
            var
                self = this;
            event.stopPropagation();
            event.stopImmediatePropagation();
            self.displayTaskDetails( item._id );
        },
        /**
         * updates showClosedTasksFilter value
         * @return {Boolean} always true
         */
        updateClosedTasksFilter: function() {
            var
                self = this,
                showClosedTasksFilter = unwrap( self.showClosedTasksFilter );
            Y.doccirrus.utils.localValueSet( 'showClosedTasksFilter', showClosedTasksFilter.toString() );
            self.showClosedTasksFilter( showClosedTasksFilter );
            return true;
        },
        _loadTasks: function() {
            var
                self = this,
                showClosedTasksFilter = Y.doccirrus.utils.localValueGet( 'showClosedTasksFilter' ),
                filterQueryObservable = unwrap( self.filterQueryObservable );
            if( !showClosedTasksFilter ) {
                self.showClosedTasksFilter( false );
            } else {
                self.showClosedTasksFilter( 'true' === showClosedTasksFilter ? true : false );
            }

            if( !self.showClosedTasksFilter() ) {
                filterQueryObservable.status = {$ne: 'DONE'};
            }
            Y.doccirrus.jsonrpc.api.task.getPopulatedTask( {
                query: filterQueryObservable
            } ).done( function( response ) {
                var
                    data,
                    closedTasks,
                    activeTasks;
                self.tasksData( [] );
                data = response && response.data || [];
                closedTasks = data.filter( function( item ) {
                    return 'DONE' === item.status;
                });
                activeTasks = data.filter( function( item ) {
                    return 'DONE' !== item.status;
                });
                data = _.sortBy( activeTasks, 'orderInColumn' ).concat( _.sortBy( closedTasks, 'orderInColumn' ) );
                self.tasksData( data );
                self._loadListData();
                self.initDrag();
            }).fail( function( error ) {
                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            });
        },
        initSelect2List: function() {
            var
                self = this;
            self.select2List = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.listFilterValue );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.listFilterValue.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.listFilterValue.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: LABEL_ASSIGNED,
                    multiple: true,
                    query: function( options ) {
                        var list = unwrap( self.listArray ),
                            term = options.term,
                            filteredData = list.filter( function( entry ) {
                                if( term && -1 === entry.name.toLowerCase().indexOf( term.toLowerCase() ) ) {
                                    return;
                                }
                                return entry;
                            } ),
                            data = filteredData.map( function( entry ) {
                                return {
                                    id: entry._id,
                                    text: entry.name
                                };
                            } );
                        return options.callback( {results: data} );
                    }
                }
            };
        },
        _initSelect2Roles: function() {
            var
                self = this;
            self.select2Roles = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.rolesFilterValue );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.rolesFilterValue.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.rolesFilterValue.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: self.rolesI18n,
                    multiple: true,
                    query: function( options ) {
                        var list = unwrap( self.roleStatuses ),
                            data = list.map( function( entry ) {
                                return {
                                    id: entry.value,
                                    text: entry.text
                                };
                            } );
                        return options.callback( {results: data} );
                    }
                }
            };
        },
        _initSelect2TaskTypes: function() {
            var
                self = this;
            self.select2TaskTypes = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.tasksFilterValue );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.tasksFilterValue.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.tasksFilterValue.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: self.taskTypesI18n,
                    multiple: true,
                    query: function( options ) {
                        var list = unwrap( self.taskTypes ),
                            data = list.map( function( entry ) {
                                return {
                                    id: entry._id,
                                    text: entry.name
                                };
                            } );
                        return options.callback( {results: data} );
                    }
                }
            };
        },
        _initSelect2Urgency: function() {
            var
                self = this;

            function formatSelection( el ) {
                var
                    selection = "<div style='margin:auto; height: 16px; width: 20px; border: 1px solid black;' class=";
                selection += "urgency-color-" + el.id + "></div>";
                return selection;
            }

            function formatResult( el ) {
                return "<div class='row'><div style='width: 30px; height: 20px; border: 1px solid black;' class='col-xs-offset-1 col-xs-4 col-lg-4 urgency-color-" + el.id + "'></div><div class='col-xs-8 col-lg-8'>" + el.text + "</div></div>";
            }

            self.select2Urgency = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return unwrap( self.urgencyFilterValue );
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.urgencyFilterValue.push( $event.added );
                        }
                        if( $event.removed ) {
                            self.urgencyFilterValue.remove( function( item ) {
                                return item.id === $event.removed.id;
                            } );
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    placeholder: self.urgencyI18n,
                    multiple: true,
                    query: function( options ) {
                        var list = self.urgencyList,
                            data = list.map( function( entry ) {
                                return {
                                    id: entry.val,
                                    text: entry.i18n
                                };
                            } );
                        return options.callback( {results: data} );
                    },
                    minimumResultsForSearch: -1,
                    formatSelection: formatSelection,
                    formatResult: formatResult
                }
            };
        },
        /**
         * saves button configuration
         */
        saveConfiguration: function() {
            var
                self = this,
                detailsFilter = unwrap( self.detailsFilterValue ),
                titleFilter = unwrap( self.titleFilterValue ),
                candidatesNames = unwrap( self.candidatesNamesFilterValue ),
                patientNameFilter = unwrap( self.patientNameFilterValue ),
                creatorNameFilter = unwrap( self.creatorNameFilterValue ),
                employeeName = unwrap( self.employeeNameFilterValue ),
                rolesFilter = unwrap( self.rolesFilterValue ),
                tasksFilter = unwrap( self.tasksFilterValue ),
                urgencyFilter = unwrap( self.urgencyFilterValue ),
                dateCreatedFilter = unwrap( self.dateCreatedFilterValue ),
                alertTimeComponent = unwrap( self.alertTimeComponent.value ),
                scheduleComponent = unwrap( self.scheduleComponent.value ),
                linkedScheduleComponent = unwrap( self.linkedScheduleComponent.value ),
                lastScheduleComponent = unwrap( self.lastScheduleComponent.value ),
                listFilterValue = unwrap( self.listFilterValue ),
                localStorageValue = Y.doccirrus.utils.localValueGet( 'tasksFilterConfiguration'),
                localStorageConfiguration = [],
                value = {
                    name: '',
                    description: '',
                    visible: true,
                    detailsFilterValue:  detailsFilter,
                    titleFilterValue:  titleFilter,
                    candidatesNamesFilterValue: candidatesNames,
                    patientNameFilterValue: patientNameFilter,
                    creatorNameFilterValue: creatorNameFilter,
                    employeeNameFilterValue: employeeName,
                    rolesFilterValue: rolesFilter,
                    tasksFilterValue: tasksFilter,
                    urgencyFilterValue: urgencyFilter,
                    dateCreatedFilterValue: dateCreatedFilter,
                    alertTimeComponent: alertTimeComponent,
                    scheduleComponent: scheduleComponent,
                    linkedScheduleComponent: linkedScheduleComponent,
                    lastScheduleComponent: lastScheduleComponent,
                    listFilterValue: listFilterValue
                };

            if( localStorageValue ) {
                try {
                    localStorageConfiguration = JSON.parse( localStorageValue );
                } catch( parseErr ) {
                    Y.log( 'Problem getting localStorage filter configurations: ' + JSON.stringify( parseErr ), 'warn', NAME );
                }
            } else {
                localStorageConfiguration = [];
            }

            localStorageConfiguration.push( value );
            Y.doccirrus.modals.tasksFilterConfiguration.show( localStorageConfiguration, false, function() {
                self._getLocalStorageConfig();
            });
        },
        /**
         * changes button name and description
         */
        editConfiguration: function() {
            var
                self = this,
                localStorageValue = Y.doccirrus.utils.localValueGet( 'tasksFilterConfiguration'),
                localStorageConfiguration = [];

            if( localStorageValue ) {
                try {
                    localStorageConfiguration = JSON.parse( localStorageValue );
                } catch( parseErr ) {
                    Y.log( 'Problem getting localStorage filter configurations: ' + JSON.stringify( parseErr ), 'warn', NAME );
                }
            } else {
                localStorageConfiguration = [];
            }
            Y.doccirrus.modals.tasksFilterConfiguration.show( localStorageConfiguration, true, function() {
                self._getLocalStorageConfig();
            });
        },
        /**
         * changes filter view
         */
        filterViewHandler: function() {
            var
                self = this;
            self.filterView( !unwrap( self.filterView ) );
        },
        /**
         * Calls modal which adds new column
         * @param {Object|null} item
         */
        add: function( item ) {
            var
                self = this,
                data = item._id ? item : {};
            if( item._id ) {
                data.existingTasksNumber = ( self.tasksData() || [] ).some( function( i ) {
                    return i.columnId === item._id;
                });
            }
            Y.doccirrus.modals.addNewList.show( data, function() {
                self._loadTasks();
            });
        },
        /**
         * Calls configure modal
         * @param {object} item
         */
        configure: function( item ) {
            var
                self = this,
                data = item._id ? item : null,
                isFilter = 'filter' === item ? true: false;
            Y.doccirrus.modals.tasksConfiguration.show( data, isFilter, function( res ) {
                if( res ) {
                    Promise.all( (self.tasksData() || []).map( function( task ) {
                        if( task.columnId === res ) {
                            Y.doccirrus.jsonrpc.api.task.update( {
                                query: {_id: task._id},
                                data: {$unset: {columnId: '', columnName: ''}},
                                fields: ['columnId', 'columnName']
                            } ).fail( fail );
                        }
                    } ) ).then( function() {
                        self._loadConfiguration();
                        self._loadTasks();
                    } );
                } else {
                    self._loadConfiguration();
                    self._loadTasks();
                }
            });
        },
        /**
         * apply filer
         * @param {this} $context
         * @param {object} item
         * @param {object} event
         */
        applyConfiguration: function( $context, item, event ) {
            var
                self = this;
            if( !$( event.target ).hasClass( 'active' ) ) {
                $( 'span.filter-button').removeClass( 'active' );
                $( event.target ).addClass( 'active' );
                self.configurationFilterValue( item );
            } else {
                $( event.target ).removeClass( 'active' );
                self.configurationFilterValue( {} );
            }
        },
        /**
         * loads tasks
         */
        _loadListData: function() {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.list.read( {
                'query': {},
                'options': {}
            } ).then( function( res ) {
                var data = ( res && res.data ) || [];
                self.listArray( _.sortBy( data, 'order' ) );
                self.initDrag();
            } ).fail( function( err ) {
                if( err ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                }
            } );
        },
        /**
         * loads LocalStorageConfigs
         */
        _getLocalStorageConfig: function() {
            var
                self = this,
                localStorageValue = Y.doccirrus.utils.localValueGet( 'tasksFilterConfiguration'),
                localStorageConfiguration = [];

            if( localStorageValue ) {
                try {
                    localStorageConfiguration = JSON.parse( localStorageValue );
                } catch( parseErr ) {
                    Y.log( 'Problem getting localStorage filter configurations: ' + JSON.stringify( parseErr ), 'warn', NAME );
                }
            } else {
                localStorageConfiguration = [];
            }
            self.localStorageConfigs( localStorageConfiguration );
        },
        /**
         * Loads filters and base column configuration
         */
        _loadConfiguration: function() {
            var self = this;
            Y.doccirrus.jsonrpc.api.taskconfiguration.read()
                .then( function( res ) {
                    var
                        data = ( res && res.data && res.data[0] ) || null;
                    if( data ) {
                        self.details( data.details );
                        self.title( data.title );
                        self.candidates( data.candidates );
                        self.patientName( data.patientName );
                        self.creatorName( data.creatorName );
                        self.employeeName( data.employeeName );
                        self.roles( data.roles );
                        self.tasks( data.tasks );
                        self.urgency( data.urgency );
                        self.dateCreated( data.dateCreated );
                        self.alertTime( data.alertTime );
                        self.schedule( data.schedule );
                        self.linkedSchedule( data.linkedSchedule );
                        self.lastSchedule( data.lastSchedule );
                        self.detailsFilter( data.detailsFilter );
                        self.titleFilter( data.titleFilter );
                        self.candidatesFilter( data.candidatesFilter );
                        self.patientNameFilter( data.patientNameFilter );
                        self.creatorNameFilter( data.creatorNameFilter );
                        self.employeeNameFilter( data.employeeNameFilter );
                        self.rolesFilter( data.rolesFilter );
                        self.listsFilter( data.listsFilter || false );
                        self.tasksFilter( data.tasksFilter );
                        self.urgencyFilter( data.urgencyFilter );
                        self.dateCreatedFilter( data.dateCreatedFilter );
                        self.scheduleFilter( data.scheduleFilter );
                        self.linkedScheduleFilter( data.linkedScheduleFilter );
                        self.lastScheduleFilter( data.lastScheduleFilter );
                    }
                } ).fail( function( err ) {
                    if( err ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    }
                } );
        },
        /**
         * Shows color for time icon
         * @param {object} data
         * @returns {String}
         */
        alertTimeIcon: function( data ) {
            if( !data ) {
                return;
            }
            var
                timestamp = data.alertTime;

            if( timestamp ) {
                if( moment().isAfter( moment( timestamp ) ) ) {
                    return '<span class="fa fa-clock-o icon-red"></span>';
                }
                return '<span class="fa fa-clock-o icon-green"></span>';
            } else {
                return '';
            }
        },
        /**
         * Colors date
         * @param {object} data
         * @returns {Date|String}
         */
        alertTimeTitle: function( data ) {
            if( !data ) {
                return;
            }
            var
                timestamp = data.alertTime,
                doneDate = data.dateDone,
                format = data.allDay ? TIMESTAMP_FORMAT : TIMESTAMP_FORMAT_LONG,
                component;

            if( timestamp ) {
                if( moment().isAfter( moment( timestamp ) ) ) {
                    component = doneDate ? '<span >' : '<span class="dc-red">';
                    return component + moment( timestamp ).format( format ) + '</span>';
                }
                return moment( timestamp ).format( format );
            } else {
                return '';
            }
        },
        /**
         * returns roles
         * @param {object} data
         * @returns {String}
         */
        rolesTitle: function( data ) {
            if( !data ) {
                return;
            }
            if( !(Array.isArray( data.roles ) && data.roles.length) ) {
                return '';
            }

            return data.roles.join( ',<br/>' );
        },
        /**
         * returns candidates
         * @param {object} data
         * @returns {String}
         */
        candidatesTitle: function( data ) {
            if( !data ) {
                return;
            }
            var
                candidates = data.candidatesNames,
                candidatesObj = data.candidatesObj;

            if( !Array.isArray( candidatesObj ) ||
                (Array.isArray( candidatesObj ) && 0 === candidatesObj.length) ) {
                return '';
            }

            if( !candidates ) {
                candidates = data.candidatesObj;
                return candidates.map( function( candidate ) {
                    return candidate.title + ' ' + candidate.firstname + ' ' + candidate.lastname;
                } ).join( ',<br/>' );
            }

            return candidates.join( ',<br/>' );
        },
        /**
         * returns patient name
         * @param {object} data
         * @returns {String}
         */
        patientNameTitle: function( data ) {
            if( !data ) {
                return;
            }
            if( data.patientName ) {
                return Y.Lang.sub( '<a target="_blank" href="{href}">{patientName}</a>', {
                    href: Y.doccirrus.utils.getUrl( Y.doccirrus.auth.isISD() ? 'mirror_patients' : 'inCaseMojit' ) + '#/patient/' + data.patientId + '/tab/casefile_browser',
                    patientName: data.patientPartnerId || data.patientName
                } );
            } else {
                return '';
            }
        },
        /**
         * returns date
         * @param {object} data
         * @returns {String}
         */
        dateCreatedTitle: function( data ) {
            if( !data ) {
                return;
            }
            var
                timestamp = data.dateCreated;

            if( timestamp ) {
                return moment( timestamp ).format( TIMESTAMP_FORMAT_LONG );
            }
            return '';
        },
        /**
         * returns details info
         * @param {object} data
         * @returns {String}
         */
        detailsTitle: function( data ) {
            if( !data ) {
                return;
            }
            var
                value = data.details,
                infos = value && value.split( '\n' );

            if( data.linkedSchedule && Array.isArray( infos ) ) {
                if( data.linkedSchedule.start ) {
                    infos[2] = infos[2] && Y.Lang.sub( '<a>{schedule}</a>', {
                        schedule: infos[2]
                    } );
                }
                return infos && infos.join( '<br/>' );
            }
            return value;
        },
        /**
         * returns schedule
         * @param {object} data
         * @returns {String}
         */
        scheduleTitle: function( data ) {
            if( !data ) {
                return;
            }
            if( data.schedule ) {
                return Y.Lang.sub( '<a title=' + data.schedule.title + '>{schedule}</a>', {
                    schedule: moment( data.schedule.start ).format( 'DD.MM.YYYY HH:mm' )
                } );
            } else {
                return '';
            }
        },
        /**
         * returns linkedSchedule
         * @param {object} data
         * @returns {String}
         */
        linkedScheduleTitle: function( data ) {
            if( !data ) {
                return;
            }
            if( data.linkedSchedule && data.linkedSchedule.start ) {
                return Y.Lang.sub( '<a title=' + data.linkedSchedule.title + '>{schedule}</a>', {
                    schedule: moment( data.linkedSchedule.start ).format( 'DD.MM.YYYY HH:mm' )
                } );
            } else {
                return '';
            }
        },
        /**
         * returns lastSchedule
         * @param {object} data
         * @returns {Date|String}
         */
        lastScheduleTitle: function( data ) {
            if( !data ) {
                return;
            }
            var
                lastSchedule = data.lastSchedule;
            if( lastSchedule ) {
                return Y.Lang.sub( '<a title=' + lastSchedule.title + '>{schedule}</a>', {
                    schedule: moment( lastSchedule.start ).format( 'DD.MM.YYYY HH:mm' )
                } );
            } else {
                return '';
            }
        },
        getRoleStatuses: function() {
            var
                self = this;
            return ko.computed( function() {
                var roles = ko.unwrap( self.roleStatuses );
                return roles;
            } );
        },

        getTaskTypes: function() {
            var
                self = this;
            return ko.computed( function() {
                var types = ko.unwrap( self.taskTypes );
                return types;
            } );
        },
        select2TaskTypeMapper: function( tasktype ) {
            return {
                _id: tasktype._id,
                name: tasktype.name,
                type: tasktype.type,
                title: tasktype.title,
                allDay: tasktype.allDay,
                urgency: tasktype.urgency,
                days: tasktype.days,
                minutes: tasktype.minutes,
                hours: tasktype.hours,
                employeeId: tasktype.employeeId,
                employeeName: tasktype.employeeName,
                details: tasktype.details,
                roles: tasktype.roles,
                candidates: tasktype.candidates,
                candidatesNames: tasktype.candidatesNames,
                candidatesObj: tasktype.candidatesObj
            };
        },
        initDrag: function TabGraphicWaitingListViewModel_initDrag() {
            var
                self = this,
                adjustment,
                tasksList,
                columnsList;
            destroyDrag();
            setTimeout( function() {
                // need delay to initiate drag
                runDrag();
            }, 500 );

            function onDrag( $item, position ) {
                $item.css( {
                    left: position.left - ( adjustment.left || 0 ),
                    top: position.top - ( adjustment.top || 0 )
                } );
            }

            function destroyDrag() {
                // need always take actual data
                tasksList = $( "ol.tasks-list-drop" );
                columnsList = $( "ol.tasks-list" );
                tasksList.sortable( 'destroy' );
                columnsList.sortable( 'destroy' );
            }

            function runDrag() {
                // need always take actual data
                tasksList = $( "ol.tasks-list-drop" );
                columnsList = $( "ol.tasks-list" );
                tasksList.sortable( {
                    group: 'tasks-list-drop',
                    pullPlaceholder: false,
                    exclude: 'li.list',
                    onDrop: function( $item, container, _super ) {
                        var
                            $clonedItem = $( '<li/>' ).css( {height: 0} ),
                            elements,
                            containerNode = container ? $( container.el )[0] : null,
                            dropData = containerNode ? ko.dataFor( containerNode ) : null,
                            tasksData = unwrap( self.tasksData ) || [],
                            filteredTasks,
                            dragData = ko.dataFor( $item[0] ),
                            dirtyTasksItems = [];

                        Y.doccirrus.utils.showLoadingMask( $( container.el )[0]  );

                        columnsList.sortable( 'enable' );
                        if( !containerNode ) {
                            self._loadTasks();
                            return;
                        }
                        $item.before( $clonedItem );
                        $clonedItem.animate( {'height': $item.height()} );
                        $clonedItem.detach();
                        _super( $item, container );
                        tasksData.forEach( function( task ) {
                            if( dropData && dropData._id ) {
                                if( dragData._id === task._id ) {
                                    task.columnId = dropData._id;
                                    task.columnName = dropData.name;
                                }
                            } else {
                                if( dragData._id === task._id ) {
                                    task.columnId = '';
                                    task.columnName = '';
                                }
                            }
                        } );
                        filteredTasks = tasksData.filter( function( task ) {
                            if( dropData && dropData._id ) {
                                return task.columnId === dropData._id;
                            } else {
                                return !task.columnId;
                            }
                        } );
                        if( dropData && dropData._id ) {
                            if( dropData.numberOfTasks && ( dropData.numberOfTasks < filteredTasks.length ) ) {
                                Y.doccirrus.DCWindow.notice( {
                                    message: MAX_LIMIT
                                } );
                                self._loadTasks();
                                return;
                            }
                        }
                        elements = $( containerNode ).find( '.task' );
                        elements.each( function( index, element ) {
                            var
                                data = ko.dataFor( element );
                            data.orderInColumn = index;
                            data.columnId = dropData && dropData._id ? dropData._id : '';
                            data.columnName = dropData && dropData.name ? dropData.name : '';
                            dirtyTasksItems.push( data );
                        } );
                        if( dirtyTasksItems.length ) {
                            Y.doccirrus.jsonrpc.api.task.updateColumnTask( {
                                data: {
                                    tasks: dirtyTasksItems
                                }
                            } ).then( function() {
                                if( $item && $item[0] ) {
                                    $( $item[0] ).remove();
                                }
                            } ).fail( fail )
                                .always( function() {
                                    if( !dropData || !dropData._id ) {
                                        Y.doccirrus.utils.hideLoadingMask( $( container.el )[0]  );
                                    }
                                    self.isDragging( false );
                                    self._loadTasks();
                                } );
                        } else {
                            if( !dropData || !dropData._id ) {
                                Y.doccirrus.utils.hideLoadingMask( $( container.el )[0]  );
                            }
                            self.isDragging( false );
                            self._loadTasks();
                        }
                    },

                    // set $item relative to cursor position
                    onDragStart: function( $item, container, _super, event ) {
                        var
                            pointer = container.rootGroup.pointer,
                            clientX = event.clientX,
                            clientY = event.clientY;

                        columnsList.sortable( 'disable' );
                        adjustment = {
                            left: pointer.left - clientX,
                            top: pointer.top - clientY
                        };
                        self.isDragging( true );
                        _super( $item, container );
                    },
                    onDrag: onDrag
                } );

                columnsList.sortable( {
                    group: 'tasks-list',
                    nested: false,
                    pullPlaceholder: false,
                    exclude: 'li.task',
                    placeholder: '<li class="placeholder col-md-12"></li>',
                    onDrop: function( $item, container, _super ) {
                        var
                            $clonedItem = $( '<li/>' ).css( {height: 0} ),
                            containerItem = $( "#tasksListGraphic" ),
                            dirtyColumns = [],
                            elementDirty,
                            elements = [],
                            i;
                        $item.before( $clonedItem );
                        $clonedItem.animate( {'height': $item.height()} );
                        $clonedItem.detach();
                        _super( $item, container );
                        elementDirty = containerItem.find( 'ol.tasks-list li.list' );

                        for( i = 0; i < elementDirty.length; i++ ) {
                            if( elementDirty[i] ) {
                                elements.push( ko.dataFor( elementDirty[i] ) );
                            }
                        }
                        elements.forEach( function( element, index ) {
                            var
                                data = element;
                            data.order = index;
                            dirtyColumns.push( data );
                        } );

                        if( dirtyColumns.length ) {
                            Y.doccirrus.jsonrpc.api.task.updateColumns( {
                                data: {
                                    columns: dirtyColumns
                                }
                            } ).fail( fail )
                                .always( function() {
                                    self.isDragging( false );
                                    self._loadTasks();
                                } );
                        } else {
                            self.isDragging( false );
                            self._loadTasks();
                        }
                    },
                    // set $item relative to cursor position
                    onDragStart: function( $item, container, _super ) {
                        var
                            offset = $item.offset(),
                            pointer = container.rootGroup.pointer;
                        adjustment = {
                            left: pointer.left - offset.left,
                            top: pointer.top - offset.top
                        };
                        self.isDragging( true );
                        _super( $item, container );
                    },
                    onDrag: onDrag
                } );
            }
        },
        /** @protected */
        _initTasksKoTable: function TasksViewModel_initTasksKoTable() {
            var
                self = this;

            self.tasksKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-intime-table',
                    pdfTitle: self.pdfTitle || '',
                    stateId: 'CalendarMojit-CalendarMojitBinderIndex-tasksKoTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.task.getPopulatedTask,
                    sortersLimit: 1,
                    baseParams: {
                        query: self.filterQuery
                    },
                    exportCsvConfiguration: {
                        columns: [
                            {
                                forPropertyName: 'alertTime',
                                stripHtml: true
                            },
                            {
                                forPropertyName: 'roles',
                                stripHtml: true
                            },
                            {
                                forPropertyName: 'candidatesObj',
                                stripHtml: true
                            }
                        ]
                    },
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'select',
                            label: ''
                        },
                        {
                            forPropertyName: 'alertTime',
                            label: i18n( 'task-schema.Task_T.alertTime.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            sortInitialIndex: 0,
                            direction: 'DESC',
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            width: '80px',
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'task-schema.Task_T.alertTime.i18n' )
                                }
                            },
                            renderer: function( meta ) {
                                var
                                    timestamp = meta.value,
                                    data = meta.row,
                                    doneDate = data.dateDone,
                                    format = data.allDay ? TIMESTAMP_FORMAT : TIMESTAMP_FORMAT_LONG,
                                    component;

                                if( timestamp ) {
                                    if( moment().isAfter( moment( timestamp ) ) ) {
                                        component = doneDate ? '<span >' : '<span class="dc-red">';
                                        return component + moment( timestamp ).format( format ) + '</span>';
                                    }
                                    return moment( timestamp ).format( format );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'title',
                            label: WHAT,
                            isSortable: true,
                            isFilterable: true,
                            width: '10%'
                        },
                        {
                            forPropertyName: 'urgency',
                            label: i18n( 'task-schema.Task_T.urgency.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            sortInitialIndex: 1,
                            direction: 'DESC',
                            width: '80px',
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
                            forPropertyName: 'taskTypeObj.name',
                            label: i18n( 'tasktype-schema.TaskType_T.type' ),
                            isSortable: false,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            width: '80px',
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                optionsText: 'name',
                                options: self.getTaskTypes(),
                                optionsValue: '_id'
                            }
                        },
                        {
                            forPropertyName: 'roles',
                            label: i18n( 'task-schema.Task_T.roles.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            width: '80px',
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                optionsText: 'text',
                                options: self.getRoleStatuses(),
                                optionsValue: 'value'
                            },
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
                                    candidates = meta.value,
                                    candidatesObj = meta.row.candidatesObj;

                                if( !Array.isArray( candidatesObj ) ||
                                    (Array.isArray( candidatesObj ) && 0 === candidatesObj.length) ) {
                                    return '';
                                }

                                if( !candidates ) {
                                    candidates = meta.row.candidatesObj;
                                    return candidates.map( function( candidate ) {
                                        return candidate.title + ' ' + candidate.firstname + ' ' + candidate.lastname;
                                    } ).join( ',<br/>' );
                                }

                                return candidates.join( ',<br/>' );
                            }
                        },
                        {
                            forPropertyName: 'patientName',
                            label: i18n( 'task-schema.Task_T.patient.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return Y.Lang.sub( '<a target="_blank" href="{href}">{patientName}</a>', {
                                        href: Y.doccirrus.utils.getUrl( Y.doccirrus.auth.isISD() ? 'mirror_patients' : 'inCaseMojit' ) + '#/patient/' + meta.row.patientId + '/tab/casefile_browser',
                                        patientName: meta.row.patientPartnerId || meta.value
                                    } );
                                } else {
                                    return '';
                                }
                            },
                            pdfRenderer: function( meta ) {
                                return meta.value || '';
                            }
                        },
                        {
                            forPropertyName: 'employeeName',
                            label: i18n( 'task-schema.Task_T.employeeName.i18n' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'creatorName',
                            label: i18n( 'task-schema.Task_T.creatorName.i18n' ),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'dateCreated',
                            label: i18n( 'task-schema.Task_T.dateCreated.i18n' ),
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                            renderer: function( meta ) {
                                var
                                    timestamp = meta.value;

                                if( timestamp ) {
                                    return moment( timestamp ).format( TIMESTAMP_FORMAT_LONG );
                                }
                                return '';
                            }
                        },
                        {
                            forPropertyName: 'details',
                            label: i18n( 'task-schema.Task_T.details.i18n' ),
                            isSortable: true,
                            visible: false,
                            isFilterable: true,
                            width: '30%',
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    value = meta.value,
                                    infos = value && value.split( '\n' );

                                if( data.linkedSchedule && Array.isArray( infos ) ) {
                                    if( data.linkedSchedule.start ) {
                                        infos[2] = infos[2] && Y.Lang.sub( '<a>{schedule}</a>', {
                                                schedule: infos[2]
                                            } );
                                    }
                                    return infos && infos.join( '<br/>' );
                                }
                                return value;
                            },
                            onCellClick: function( meta ) {
                                var updateEvent;
                                if( meta.row && meta.value && meta.row.linkedSchedule && meta.row.linkedSchedule.start ) {
                                    updateEvent = {
                                        action: 'updateEvent',
                                        eventId: meta.row.linkedSchedule._id
                                    };

                                    Y.doccirrus.utils.sessionValueSet( 'loadEvent', updateEvent );
                                    window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );
                                }
                                return;
                            }
                        },
                        {
                            forPropertyName: 'schedule',
                            label: i18n( 'task-schema.Task_T.nextSchedule.i18n' ),
                            isSortable: false,
                            visible: false,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'task-schema.Task_T.nextSchedule.i18n' )
                                }
                            },
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return Y.Lang.sub( '<a title=' + meta.value.title + '>{schedule}</a>', {
                                        schedule: moment( meta.value.start ).format( 'DD.MM.YYYY HH:mm' )
                                    } );
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: function( meta ) {
                                var updateEvent;
                                if( meta.value ) {
                                    updateEvent = {
                                        action: 'updateEvent',
                                        eventId: meta.value._id
                                    };

                                    Y.doccirrus.utils.sessionValueSet( 'loadEvent', updateEvent );
                                    window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );
                                }
                                return;
                            }
                        },
                        {
                            forPropertyName: 'linkedSchedule',
                            label: i18n( 'task-schema.Task_T.linkedSchedule.i18n' ),
                            isSortable: false,
                            visible: false,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'task-schema.Task_T.linkedSchedule.i18n' )
                                }
                            },
                            renderer: function( meta ) {
                                if( meta.value && meta.value.start ) {
                                    return Y.Lang.sub( '<a title=' + meta.value.title + '>{schedule}</a>', {
                                        schedule: moment( meta.value.start ).format( 'DD.MM.YYYY HH:mm' )
                                    } );
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: function( meta ) {
                                var updateEvent;
                                if( meta.value && meta.value.start ) {
                                    updateEvent = {
                                        action: 'updateEvent',
                                        eventId: meta.value._id
                                    };

                                    Y.doccirrus.utils.sessionValueSet( 'loadEvent', updateEvent );
                                    window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );
                                }
                                return;
                            }
                        },
                        {
                            forPropertyName: 'lastSchedule',
                            label: i18n( 'task-schema.Task_T.lastSchedule.i18n' ),
                            isSortable: false,
                            visible: false,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'DateRange',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    placeholder: i18n( 'task-schema.Task_T.lastSchedule.i18n' )
                                }
                            },
                            renderer: function( meta ) {
                                if( meta.value ) {
                                    return Y.Lang.sub( '<a title=' + meta.value.title + '>{schedule}</a>', {
                                        schedule: moment( meta.value.start ).format( 'DD.MM.YYYY HH:mm' )
                                    } );
                                } else {
                                    return '';
                                }
                            },
                            onCellClick: function( meta ) {
                                var updateEvent;
                                if( meta.value ) {
                                    updateEvent = {
                                        action: 'updateEvent',
                                        eventId: meta.value._id
                                    };

                                    Y.doccirrus.utils.sessionValueSet( 'loadEvent', updateEvent );
                                    window.open( Y.doccirrus.utils.getUrl( 'calendar' ) );
                                }
                                return;
                            }
                        },
                        {
                            forPropertyName: 'columnName',
                            label: LABEL_ASSIGNED,
                            isSortable: true,
                            isFilterable: true,
                            width: '80px'
                        }
                    ],
                    onRowClick: function( meta ) {
                        var
                            data = meta.row;

                        if( meta.col.forPropertyName === 'patientName' || meta.col.forPropertyName === 'schedule'
                            || ( meta.col.forPropertyName === 'linkedSchedule' && data.linkedSchedule && data.linkedSchedule.start )
                            || ( meta.col.forPropertyName === 'lastSchedule' && data.lastSchedule && data.lastSchedule.start )
                            || ( meta.col.forPropertyName === 'details' && data.linkedSchedule && data.linkedSchedule.start && data.details ) ) {
                            //  do not intercept link to patient case
                            return;
                        }

                        self.displayTaskDetails( data._id );
                    }
                }
            } );
        },

        displayTaskDetails: function( taskId ) {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.task.getPopulatedTask( {
                query: {
                    _id: taskId
                }
            } )
                .done( function( response ) {
                    var
                        _data = response.data && response.data[0];
                    Y.doccirrus.modals.taskModal.showDialog( _data, function() {
                        self.tasksKoTable.reload();
                        self._loadTasks();
                    } );
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        },

        destroyTasksViewModel: function() {
            var
                self = this;

            self.destroySocketListeners();
        },

        destroySocketListeners: function() {
            Y.doccirrus.communication.off( 'system.REFRESH_TASK_TABLE', 'TaskViewModel' );
        },

        _initActions: function TasksViewModel__initActions() {
            var
                self = this;

            Y.doccirrus.communication.on( {
                event: 'system.REFRESH_TASK_TABLE',
                done: function() {
                    self.tasksKoTable.reload();
                },
                handlerId: 'TaskViewModel'
            } );

            self.initTaskCreateComponent();
            self.initTaskDeleteComponent();
            self.initTaskTakeComponent();
            self.initTaskDoneComponent();
            self.initSerialLetterCreateComponent();
            self.initSerialEMailCreateComponent();
        },

        initTaskCreateComponent: function() {
            var
                self = this;

            self.createTask = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_CREATE',
                    text: i18n( 'TaskMojit.TaskModal.button.CREATE_TASK' ),
                    click: function() {
                        var types = self.taskTypes() || [],
                            defaultType = types.find( function( item ) { return  Y.doccirrus.schemas.tasktype.templateDefault._id === item._id; } );

                        Y.doccirrus.modals.taskModal.showDialog( { taskTypeObj: defaultType }, function() {
                            self.tasksKoTable.reload();
                        } );
                    }
                }
            } );

            self.createTaskGraphic = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: BTN_CREATE_GRAPHIC,
                    text: '',
                    icon: PLUS,
                    click: function() {
                        var types = self.taskTypes() || [],
                            defaultType = types.find( function( item ) { return  Y.doccirrus.schemas.tasktype.templateDefault._id === item._id; } );

                        Y.doccirrus.modals.taskModal.showDialog( { taskTypeObj: defaultType }, function() {
                            self._loadTasks();
                        } );
                    }
                }
            } );
        },

        /**
         *  @method initSerialLetterCreateComponent
         */
        initSerialLetterCreateComponent: function TaskViewModel_initSerialLetterCreateComponent() {
            var
                self = this;

            self.createSerialLetter = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_CREATE_SERIAL_LETTER',
                    text: i18n( 'TaskMojit.TaskModal.button.CREATE_SERIAL_LETTER' ),
                    click: function() {

                        var
                            componentColumnCheckbox = self.tasksKoTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked(),
                            selectedPatientsIds = [];

                        if( checked && checked.length ) {
                            selectedPatientsIds = checked.map( function( selected ) {
                                return selected.patientId;
                            } );
                        }

                        // TODO: explanatory notice here
                        if( 0 === selectedPatientsIds.length ) {
                            return;
                        }

                        Y.doccirrus.modals.serialLetterAssistantModal.show( {
                            selectedPatientsIds: selectedPatientsIds,
                            locations: self.locations,
                            employee: self.currentEmployee
                        } );
                    }
                }
            } );
        },

        /**
         *  @method initSerialLetterCreateComponent
         */
        initSerialEMailCreateComponent: function TaskViewModel_initSerialEMailCreateComponent() {
            var
                self = this,
                binder = Y.mojito.binders.TaskMojitBinder;

            binder.location().then( function( response ) {
                self.locations = response;
            } );

            Y.doccirrus.jsonrpc.api.employee
                .getEmployeeForUsername( {username: Y.doccirrus.auth.getUserId()} )
                .done( function( response ) {
                    self.currentEmployee = (response && response.data) ? response.data : null;
                } );

            self.createSerialEMail = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_CREATE_SERIAL_EMAIL',
                    text: i18n( 'TaskMojit.TaskModal.button.CREATE_SERIAL_EMAIL' ),
                    click: function() {
                        var
                            componentColumnCheckbox = self.tasksKoTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked(),
                            selectedPatientsIds = [];

                        if( checked && checked.length ) {
                            selectedPatientsIds = checked.map( function( selected ) {
                                return selected.patientId;
                            } );
                        }

                        // TODO: explanatory notice here
                        if( 0 === selectedPatientsIds.length ) {
                            return;
                        }

                        Y.doccirrus.modals.serialEMailAssistantModal.show( {
                            origin: "TASKS",
                            selectedPatientsIds: selectedPatientsIds,
                            selectedPatients: checked,
                            locations: self.locations,
                            employee: self.currentEmployee
                        } );
                    }
                }
            } );
        },

        initTaskDeleteComponent: function() {
            var
                self = this;

            self.deleteTask = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'BTN_DELETE',
                    text: i18n( 'general.button.DELETE' ),
                    click: function() {
                        var
                            componentColumnCheckbox = self.tasksKoTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked();
                        if( checked && checked.length ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'info',
                                message: Y.Lang.sub( CONFIRM_DELETE, { taskCount: checked.length } ),
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
                                                    Y.doccirrus.jsonrpc.api.task.deleteBatch( {
                                                        query: {
                                                            ids: checked.map( function( task ) {
                                                                return task._id;
                                                            } )
                                                        }
                                                    } )
                                                        .done( function() {
                                                            modal.close();
                                                            self.tasksKoTable.reload();
                                                        } )
                                                        .fail( function( error ) {
                                                            modal.close();
                                                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                        } );

                                                }
                                            } )
                                        ]
                                    }
                                }
                            } );
                        }
                    }
                }
            } );
        },
        initTaskDoneComponent: function() {
                var
                    self = this;

                self.doneTask = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'done',
                        text: i18n( 'TaskMojit.TaskModal.button.DONE' ),
                        size: 'SMALL',
                        click: function() {
                            var
                                componentColumnCheckbox = self.tasksKoTable.getComponentColumnCheckbox(),
                                checked = componentColumnCheckbox.checked();
                            Y.doccirrus.jsonrpc.api.task.assignTaskAndUpdateStatus( {
                                query: {
                                    ids: checked.map( function( task ) {
                                        return task._id;
                                    } ),
                                    status: 'DONE'
                                },
                                fields: ['status', 'employeeId', 'employeeName']
                            } ).done( function() {
                                self.tasksKoTable.reload();
                            } ).fail( function( error ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                } );
                        }
                    }
                } );
        },
        initTaskTakeComponent: function() {
            var
                self = this;

            self.takeTask = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'assign',
                    text: i18n( 'TaskMojit.TaskModal.button.TAKE' ),
                    size: 'SMALL',
                    click: function() {
                        var
                            componentColumnCheckbox = self.tasksKoTable.getComponentColumnCheckbox(),
                            checked = componentColumnCheckbox.checked();
                        Y.doccirrus.jsonrpc.api.task.assignTaskAndUpdateStatus( {
                            query: {
                                ids: checked.map( function( task ) {
                                    return task._id;
                                } ),
                                status: 'ASSIGNED'
                            },
                            fields: ['status', 'employeeId', 'employeeName']
                        } ).done( function() {
                            self.tasksKoTable.reload();
                        } ).fail( function( error ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } );
                    }
                }
            } );
        }
    }, {
        NAME: 'TaskViewModel'
    } );

    KoViewModel.registerConstructor( TasksViewModel );

}, '1.0.0', {
    requires: [
        'oop',
        'KoViewModel',
        'KoUI-all',
        'dcutils',
        'SerialLetterAssistantModal',
        'SerialEMailAssistantModal',
        'DCWindow',
        'doccirrus',
        'tasksfilterconfigurationmodal',
        'tasksconfigurationmodal',
        'addnewlistmodal'
    ]
} );
