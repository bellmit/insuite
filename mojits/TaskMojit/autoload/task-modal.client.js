/**
 * User: pi
 * Date: 29/09/15  13:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, $ */

'use strict';

YUI.add( 'DCTaskModal', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            TASK = i18n( 'CalendarMojit.task_api.title.TASK' ),
            TASKTYPE = i18n( 'tasktype-schema.TaskType_E.i18n' ),
            VON = i18n( 'general.title.FROM' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;

        function TaskModal() {
        }

        TaskModal.prototype.showDialog = function( data, callback ) {

            function show() {
                var
                    modal,
                    KoViewModel = Y.doccirrus.KoViewModel,
                    doNotSave = Boolean( data && data.doNotSave ),
                    forMultipleActivities = Boolean( data && data.selectedActivities ),
                    modelName = ( data && data.isTaskTypeModel ) ? 'TaskTypeModel' : 'TaskModel',
                    pathToPug = ( data && data.isTaskTypeModel ) ? 'TaskMojit/views/tasktype_modal' : 'TaskMojit/views/task_modal',
                    taskModel = new KoViewModel.createViewModel( {
                        NAME: modelName, config: {
                            data: data || {}
                        }
                    } ),
                    buttons = [
                        KoComponentManager.createComponent( {
                            componentType: 'KoButton',
                            componentConfig: {
                                name: 'CANCEL',
                                text: Y.doccirrus.DCWindow.getButton( 'CANCEL' ).label,
                                click: function() {
                                    $( '#modal' ).modal( 'hide' );
                                }
                            }
                        } )
                    ],
                    headerButtons = [
                        KoComponentManager.createComponent( {
                            componentType: 'KoButton',
                            componentConfig: {
                                name: 'close',
                                option: 'CLOSE',
                                click: function() {
                                    $( '#modal' ).modal( 'hide' );
                                }
                            }
                        } )];

                taskModel.conferenceLinkI18n = i18n( 'TaskMojit.TaskModal.label.CONFERENCE_LINK' );
                taskModel.seeInDispatcherI18n = i18n( 'TaskMojit.TaskModal.label.SEE_IN_DISPATCHER' );
                taskModel.generateIDI18n = i18n( 'TaskMojit.TaskModal.label.GENERATE_ID' );
                taskModel.seeInTransferLogI18n = i18n( 'TaskMojit.TaskModal.label.SEE_IN_TRANSFER_LOG' );
                taskModel.labelChangesI18n = i18n( 'TaskMojit.TaskModal.label.CHANGES' );
                taskModel.labelAssignedI18n = i18n( 'TaskMojit.TaskModal.label.ASSIGNED' );
                taskModel.labelDurationI18n = i18n( 'CalendarMojit.template_appointment.label.DURATION' );
                taskModel.labelRoleI18n = i18n( 'role-schema.Role_T.value.i18n' );
                taskModel.labelTypeI18n = i18n( 'tasktype-schema.TaskType_T.type' );
                taskModel.singleTaskI18n = i18n( 'TaskMojit.TaskModal.label.SINGLE_TASK' );
                taskModel.multipleTasksI18n = i18n( 'TaskMojit.TaskModal.label.MULTIPLE_TASKS' );

                if( taskModel.status && taskModel.status() !== 'DONE' && !forMultipleActivities ) {
                    headerButtons.unshift(
                        KoComponentManager.createComponent( {
                            componentType: 'KoButton',
                            componentConfig: {
                                name: 'done',
                                text: i18n( 'TaskMojit.TaskModal.button.DONE' ),
                                size: 'SMALL',
                                click: function() {
                                    //e.target.button.disable();
                                    getCurrentUser().then( function( response ) {
                                        if( response.data ) {
                                            assignTaskAndUpdateStatus( response.data, 'DONE' );
                                            if( taskModel._id() ) {
                                                Y.doccirrus.communication.confirmMessage( {
                                                    messageId: taskModel._id()
                                                } );
                                            }
                                            //self.hide( e );
                                            $( '#modal' ).modal( 'hide' );
                                        }
                                    } );
                                }
                            }
                        } ),
                        KoComponentManager.createComponent( {
                            componentType: 'KoButton',
                            componentConfig: {
                                name: 'assign',
                                text: i18n( 'TaskMojit.TaskModal.button.TAKE' ),
                                size: 'SMALL',
                                click: function() {
                                    // e.target.button.disable();

                                    getCurrentUser().then( function( response ) {
                                        if( response.data ) {
                                            assignTaskAndUpdateStatus( response.data, 'ASSIGNED' );
                                            //self.hide( e );
                                            $( '#modal' ).modal( 'hide' );
                                        }
                                    } );
                                }
                            }
                        } )
                    );
                }

                function assignTaskAndUpdateStatus( user, status ) {
                    var
                        currentEmployee = user;

                    taskModel.employeeId( currentEmployee._id );
                    taskModel.employeeName( Y.doccirrus.schemas.person.personDisplay( currentEmployee ) );
                    taskModel.status( status );
                    saveTask();

                }

                function getCurrentUser() {
                    return Y.doccirrus.jsonrpc.api.employee
                        .getEmployeeForUsername( { username: Y.doccirrus.auth.getUserId() } );
                }

                function doneCb() {
                    if( 'function' === typeof callback ) {
                        callback();
                    }

                }

                function failCb( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                }

                if( !taskModel.isNew() && taskModel.status && taskModel.status() !== 'DONE' && Y.doccirrus.auth.isAdmin() ) {
                    buttons.push( KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'DELETE',
                            text: Y.doccirrus.DCWindow.getButton( 'DELETE' ).label,
                            click: function() {
                                taskModel.remove()
                                    .done( doneCb )
                                    .fail( failCb );
                                $( '#modal' ).modal( 'hide' );
                            }
                        }
                    } ) );
                }

                if( ( taskModel.status && taskModel.status() !== 'DONE' ) || ( data && data.isTaskTypeModel ) ) {
                    buttons.push( KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'save',
                            text: Y.doccirrus.DCWindow.getButton( 'SAVE' ).label,
                            option: 'PRIMARY',
                            click: function() {
                                saveTask();
                                $( '#modal' ).modal( 'hide' );
                            }
                        }
                    } ) );
                }

                function saveTask() {
                    if( doNotSave ) {
                        $( '#modal' ).modal( 'hide' );
                        if( 'function' === typeof callback ) {
                            callback( taskModel.toJSON() );
                        }
                        return;
                    }
                    if( forMultipleActivities ) {
                        Y.doccirrus.jsonrpc.api.task
                            .createTasksForActivities( {
                                data: {
                                    tasksCount: taskModel.tasksCount(),
                                    taskData: taskModel.toJSON(),
                                    activities: data.selectedActivities
                                }
                            } )
                            .done( doneCb )
                            .fail( failCb );
                    } else {
                        taskModel.save()
                            .done( doneCb )
                            .fail( failCb );
                    }
                }

                var taskTitle = TASK;
                if( taskModel.creatorName && taskModel.creatorName() ) {
                    taskTitle += ' ' + VON + ': ' + taskModel.creatorName();
                }

                Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( {path: pathToPug} ) ).then( function( response ) {
                    return response && response.data;
                } ).then( function( template ) {

                    var
                        bodyContent = template;

                    modal = {
                        id: 'task_modal',
                        bodyContent: bodyContent,
                        title: ( data && data.isTaskTypeModel ) ? TASKTYPE : taskTitle,
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: 'large',
                        render: document.body,
                        buttons: {
                            header: headerButtons,
                            footer: buttons
                        }
                    };

                    var taskModal = new Y.doccirrus.DCWindowBootstrap( modal );
                    ko.applyBindings( taskModal, document.querySelector( '#modal' ) );
                    ko.applyBindings( taskModel, document.querySelector( '#taskModel' ) );

                    if( taskModel.status && taskModel.status() !== 'DONE' ) {
                        taskModel.addDisposable( ko.computed( function() {
                            var
                                modelValid = taskModel._isValid(),
                                okBtn = document.querySelector( '#modal button[name="save"]' ),
                                doneBtn = document.querySelector( '#modal button[name="done"]' ),
                                assignBtn = document.querySelector( '#modal button[name="assign"]' );
                            if( modelValid ) {
                                if( doneBtn ) {
                                    doneBtn.disabled = false;
                                }
                                if( assignBtn ) {
                                    assignBtn.disabled = false;
                                }
                                okBtn.disabled = false;
                            } else {
                                if( doneBtn ) {
                                    doneBtn.disabled = true;
                                }
                                if( assignBtn ) {
                                    assignBtn.disabled = true;
                                }
                                okBtn.disabled = true;
                            }
                        } ) );
                    }

                    if( data && data.isTaskTypeModel ) {
                        taskModel.addDisposable( ko.computed( function() {
                            var
                                modelValid = taskModel._isValid(),
                                okBtn = document.querySelector( '#modal button[name="save"]' );
                            if( modelValid ) {
                                okBtn.disabled = false;
                            } else {
                                okBtn.disabled = true;
                            }
                        } ) );
                    }

                    $( '[data-toggle="popover"]' ).popover().on( "show.bs.popover", function() {
                        $( this ).data( "bs.popover" ).tip().css( 'width', "240px" );
                    } );

                } );
            }

            show();
        };

        Y.namespace( 'doccirrus.modals' ).taskModal = new TaskModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'DCWindowBootstrap',
            'doccirrus',
            'KoViewModel',
            'TaskModel',
            'TaskTypeModel'
        ]
    }
);
