/*global YUI, ko, _*/

'use strict';

YUI.add( 'tasksconfigurationmodal', function( Y /*, NAME*/ ) {
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n, //eslint-disable-line
            unwrap = ko.unwrap;

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
         * TaskConfigurationViewModel
         * @param {Object} config
         * @constructor
         */
        function TaskConfigurationViewModel( config ) {
            TaskConfigurationViewModel.superclass.constructor.call( this, config );
        }

        TaskConfigurationViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( TaskConfigurationViewModel, KoViewModel.getBase(), {
                initializer: function TaskConfigurationViewModel_initializer( config ) {
                    var
                        self = this;
                    //translations
                    self.detailsI18n = i18n( 'task-schema.Task_T.details.i18n' );
                    self.titleI18n = i18n( 'general.title.WHAT' );
                    self.candidatesNamesI18n = i18n( 'task-schema.Task_T.candidates.i18n' );
                    self.patientNameI18n = i18n( 'task-schema.Task_T.patient.i18n' );
                    self.creatorNameI18n = i18n( 'task-schema.Task_T.creatorName.i18n' );
                    self.employeeNameI18n = i18n( 'task-schema.Task_T.employeeName.i18n' );
                    self.rolesI18n = i18n( 'task-schema.Task_T.roles.i18n' );
                    self.listsI18n = i18n( 'TaskMojit.TaskModal.label.COLUMN' );
                    self.taskTypesI18n = i18n( 'tasktype-schema.TaskType_T.type' );
                    self.urgencyI18n = i18n( 'task-schema.Task_T.urgency.i18n' );
                    self.alertTimeI18n = i18n( 'task-schema.Task_T.alertTime.i18n' );
                    self.scheduleI18n = i18n( 'task-schema.Task_T.nextSchedule.i18n' );
                    self.linkedScheduleI18n = i18n( 'task-schema.Task_T.linkedSchedule.i18n' );
                    self.lastScheduleI18n = i18n( 'task-schema.Task_T.lastSchedule.i18n' );
                    self.dateCreatedI18n = i18n( 'task-schema.Task_T.dateCreated.i18n' );
                    self.filterI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.title.FILTER' );
                    self.colorI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.COLOR' );
                    self.tasksDataI18n = i18n( 'TaskMojit.labels.display_tasks_data' );

                    self.isFilter = config && config.isFilter;

                    self.columnConfiguration = null;
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

                    if( config && !config.isFilter ) {
                        self._id = ko.observable( config._id );
                        self.details( config.details );
                        self.title( config.title );
                        self.candidates( config.candidates );
                        self.patientName( config.patientName );
                        self.creatorName( config.creatorName );
                        self.employeeName( config.employeeName );
                        self.roles( config.roles );
                        self.tasks( config.tasks );
                        self.urgency( config.urgency );
                        self.dateCreated( config.dateCreated );
                        self.alertTime( config.alertTime );
                        self.schedule( config.schedule );
                        self.linkedSchedule( config.linkedSchedule );
                        self.lastSchedule( config.lastSchedule );
                        self.detailsFilter( config.detailsFilter );
                        self.titleFilter( config.titleFilter );
                        self.candidatesFilter( config.candidatesFilter );
                        self.patientNameFilter( config.patientNameFilter );
                        self.creatorNameFilter( config.creatorNameFilter );
                        self.employeeNameFilter( config.employeeNameFilter );
                        self.rolesFilter( config.rolesFilter );
                        self.tasksFilter( config.tasksFilter );
                        self.urgencyFilter( config.urgencyFilter );
                        self.dateCreatedFilter( config.dateCreatedFilter );
                        self.scheduleFilter( config.scheduleFilter );
                        self.linkedScheduleFilter( config.linkedScheduleFilter );
                        self.lastScheduleFilter( config.lastScheduleFilter );
                    } else {
                        self.loadConfiguration();
                    }
                },
                destructor: function TaskConfigurationViewModel_destructor() {
                },
                loadConfiguration: function TaskConfigurationViewModel_loadConfiguration() {
                        var self = this;
                    Y.doccirrus.jsonrpc.api.taskconfiguration.read()
                        .then( function( res ) {
                        var
                            data = ( res && res.data && res.data[0] ) || null;
                        self.columnConfiguration = data;
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
                    } ).fail( fail );
                }
            },
            {
                NAME: 'TaskConfigurationViewModel'
            } );

        KoViewModel.registerConstructor( TaskConfigurationViewModel );

        function getTemplate( node, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'tasks_configuration_modal',
                'TaskMojit',
                {},
                node,
                callback
            );
        }

        function show( data, isFilter, callback ) {
            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, function() {
                if( isFilter ) {
                    data = {
                        isFilter: true
                    };
                }
                var model = new TaskConfigurationViewModel( data ),
                    buttons = [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function() {
                                var
                                    self = this,
                                    resultData = {
                                        details: unwrap( model.details ),
                                        title: unwrap( model.title ),
                                        candidates: unwrap( model.candidates ),
                                        patientName: unwrap( model.patientName ),
                                        creatorName: unwrap( model.creatorName ),
                                        employeeName: unwrap( model.employeeName ),
                                        roles: unwrap( model.roles ),
                                        tasks: unwrap( model.tasks ),
                                        urgency: unwrap( model.urgency ),
                                        dateCreated: unwrap( model.dateCreated ),
                                        alertTime: unwrap( model.alertTime ),
                                        schedule: unwrap( model.schedule ),
                                        linkedSchedule: unwrap( model.linkedSchedule ),
                                        lastSchedule: unwrap( model.lastSchedule ),
                                        detailsFilter: unwrap( model.detailsFilter ),
                                        titleFilter: unwrap( model.titleFilter ),
                                        candidatesFilter: unwrap( model.candidatesFilter ),
                                        patientNameFilter: unwrap( model.patientNameFilter ),
                                        creatorNameFilter: unwrap( model.creatorNameFilter ),
                                        employeeNameFilter: unwrap( model.employeeNameFilter ),
                                        rolesFilter: unwrap( model.rolesFilter ),
                                        listsFilter: unwrap( model.listsFilter ),
                                        tasksFilter: unwrap( model.tasksFilter ),
                                        urgencyFilter: unwrap( model.urgencyFilter ),
                                        dateCreatedFilter: unwrap( model.dateCreatedFilter ),
                                        scheduleFilter: unwrap( model.scheduleFilter ),
                                        linkedScheduleFilter: unwrap( model.linkedScheduleFilter ),
                                        lastScheduleFilter: unwrap( model.lastScheduleFilter )
                                    },
                                    fields = ['details', 'title', 'candidates', 'patientName', 'creatorName',
                                        'employeeName', 'roles', 'tasks', 'urgency', 'dateCreated', 'alertTime',
                                        'schedule', 'linkedSchedule', 'lastSchedule', 'detailsFilter',
                                        'titleFilter', 'candidatesFilter', 'patientNameFilter', 'creatorNameFilter', 'employeeNameFilter',
                                        'rolesFilter', 'tasksFilter', 'urgencyFilter', 'dateCreatedFilter',
                                        'scheduleFilter', 'linkedScheduleFilter', 'lastScheduleFilter', 'listsFilter'],
                                    api,
                                    query,
                                    isConfiguration = model.columnConfiguration && model.columnConfiguration._id,
                                    dataId = data && data._id;
                                if( isConfiguration ) {
                                    api = Y.doccirrus.jsonrpc.api.taskconfiguration.update;
                                    query = {_id: model.columnConfiguration._id};
                                } else if( dataId ) {
                                    api = Y.doccirrus.jsonrpc.api.list.update;
                                    query = {_id: data._id};
                                } else {
                                    api = Y.doccirrus.jsonrpc.api.taskconfiguration.create;
                                }
                                if( isConfiguration || dataId ) {
                                    api( {
                                        query: query,
                                        fields: fields,
                                        data: resultData
                                    } )
                                        .then( function() {
                                            callback();
                                        } ).fail( fail );
                                } else {
                                    api( {
                                        data: resultData
                                    } )
                                        .then( function() {
                                            callback();
                                        } ).fail( fail );
                                }
                                self.close();
                            }
                        } )
                    ],
                    modal = new Y.doccirrus.DCWindow( { //eslint-disable-line
                        className: 'DCWindow-AddConfiguration',
                        bodyContent: node,
                        title: i18n( 'CalendarMojit.tab_graphic-waiting-list.label.CONFIGURATION' ),
                        icon: Y.doccirrus.DCWindow.ICON_INFO,
                        width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        height: Y.doccirrus.DCWindow.SIZE_LARGE,
                        resizeable: true,
                        dragable: true,
                        maximizable: true,
                        centered: true,
                        visible: true,
                        focusOn: [],
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: buttons
                        },
                        after: {
                            visibleChange: function( event ) {
                                if( !event.newVal ) {
                                    ko.cleanNode( node.getDOMNode() );
                                    model.destroy();
                                }
                            }
                        }
                    } );

                ko.applyBindings( model, node.getDOMNode() );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).tasksConfiguration = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'DCWindow'
        ]
    }
);
