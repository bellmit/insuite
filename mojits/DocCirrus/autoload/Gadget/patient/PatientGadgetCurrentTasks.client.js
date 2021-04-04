/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( 'PatientGadgetCurrentTasks', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetCurrentTasks
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        GADGET_UTILS = GADGET.utils,

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetCurrentTasks;

    /**
     * @constructor
     * @class PatientGadgetCurrentTasks
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetCurrentTasks() {
        PatientGadgetCurrentTasks.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetCurrentTasks, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.loadTableDataDeBounced = GADGET_UTILS.deBounceMethodCall( self.reloadTableData, 2000 );
            self.initPatientGadgetCurrentTasks();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyCommunication();
        },
        tasks: null,
        initPatientGadgetCurrentTasks: function() {
            var
                self = this;

            self.currentTasksI18n = i18n( 'PatientGadget.PatientGadgetCurrentTasks.i18n' );
            self.createTaskI18n = i18n( 'InCaseMojit.casefile_browser.title.CREATE_TASK' );

            self._linkToTaskTable = '/tasks#/active';

            self.tasks = ko.observableArray();

            self.addDisposable( ko.computed( function() {

                self.table.setItems( unwrap( self.tasks ) );
            } ) );

            self.table.onRowClick = function( row/*, $event*/ ) {
                self.displayTaskDetails( row.id() );
                return;
            };

            self.loadTableData();

            self._initCommunication();

        },
        displayTaskDetails: function( taskId ) {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.task.getPopulatedTask( {
                noBlocking: true,
                query: {
                    _id: taskId
                }
            } )
                .done( function( response ) {
                    var
                        _data = response.data && response.data[0];
                    Y.doccirrus.modals.taskModal.showDialog( _data, function() {
                        self.reloadTableData();
                    } );
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        },

        _communicationScheduleSubscription: null,
        _communicationPatientSubscription: null,
        _communicationScheduletypeSubscription: null,
        _communicationCalendarSubscription: null,
        _communicationEmployeeSubscription: null,
        _initCommunication: function() {
            var
                self = this;

            self._communicationTaskSubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'task',
                callback: function( /*data, meta*/ ) {
                    self.loadTableDataDeBounced();
                }
            } );

            self._communicationPatientSubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'patient',
                callback: function( /*data, meta*/ ) {
                    self.loadTableDataDeBounced();
                }
            } );

            self._communicationEmployeeSubscription = Y.doccirrus.communication.subscribeCollection( {
                collection: 'employee',
                callback: function( /*data, meta*/ ) {
                    self.loadTableDataDeBounced();
                }
            } );
        },
        _destroyCommunication: function() {
            var
                self = this;

            if( self._communicationTaskSubscription ) {
                self._communicationTaskSubscription.removeEventListener();
                self._communicationTaskSubscription = null;
            }
            if( self._communicationPatientSubscription ) {
                self._communicationPatientSubscription.removeEventListener();
                self._communicationPatientSubscription = null;
            }
            if( self._communicationEmployeeSubscription ) {
                self._communicationEmployeeSubscription.removeEventListener();
                self._communicationEmployeeSubscription = null;
            }
        },
        _createTask: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            Y.doccirrus.modals.taskModal.showDialog( {
                patientId: peek( currentPatient._id ),
                patientName: Y.doccirrus.schemas.person.personDisplay( {
                    firstname: peek( currentPatient.firstname ),
                    lastname: peek( currentPatient.lastname ),
                    title: peek( currentPatient.title )
                } )
            }, function() {
                self.reloadTableData();
            } );
        },
        loadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );

            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }

            Y.doccirrus.jsonrpc.api.task.getPopulatedTask( {
                noBlocking: true,
                query: {
                    status: {$ne: 'DONE'},
                    patientId:  peek( currentPatient._id )
                },
                options: {
                    sort: {
                        alertTime: -1
                    }
                }
            } )
                .done( function( response ) {
                    if( self.get( 'destroyed' ) || !self.tasks ) {
                        return;
                    }
                    self.tasks( response.data || [] );
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );

        },
        reloadTableData: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = binder && peek( binder.currentPatient );
            if( !currentPatient || self.get( 'destroyed' ) ) {
                return;
            }
            Y.doccirrus.communication.apiCall( {
                method: 'task.getPopulatedTask',
                query: {
                    status: {$ne: 'DONE'},
                    patientId:  peek( currentPatient._id )
                },
                options: {
                    limit: self.loadLimit,
                    sort: {
                        alertTime: -1
                    }
                }
            }, function( err, response ) {
                if( !err && !self.get( 'destroyed' ) && self.tasks ) {
                    self.tasks( response.data || [] );
                }
            } );
        }
    }, {
        NAME: 'PatientGadgetCurrentTasks',
        ATTRS: {
            availableConfigurableTableColumns: {
                value: [
                    {
                        val: CONFIG_FIELDS.ALERT_TIME,
                        i18n: i18n( 'PatientGadget.PatientGadgetCurrentTasks.CONFIG_FIELDS.DUE' ),
                        converter: function( value, data ) {
                            var
                                timestamp = value,
                                format = data.allDay ? TIMESTAMP_FORMAT : TIMESTAMP_FORMAT_LONG;

                            if( timestamp ) {
                                if( moment().isAfter( moment( timestamp ) ) ) {
                                    return '<span class="dc-fade-animation dc-red">'+moment( timestamp ).format( format )+'</span>';
                                }
                                return moment( timestamp ).format( format );
                            } else {
                                return '';
                            }
                        }
                    },
                    {
                        val: CONFIG_FIELDS.DATE_CREATED,
                        i18n: i18n( 'PatientGadget.PatientGadgetCurrentTasks.CONFIG_FIELDS.DATE_CREATED' ),
                        converter: function( value/*, data*/ ) {
                            var
                                timestamp = value;

                            if( timestamp ) {
                                return moment( timestamp ).format( TIMESTAMP_FORMAT_LONG );
                            }
                            return '';
                        }
                    },
                    {
                        val: CONFIG_FIELDS.URGENCY,
                        i18n: i18n( 'task-schema.Task_T.urgency.i18n' ),
                        converter: function( value/*, data*/ ) {
                            return Y.doccirrus.schemaloader.getEnumListTranslation( 'task', 'Urgency_E', value, 'i18n' );

                        }
                    },
                    {
                        val: CONFIG_FIELDS.TITLE,
                        i18n: i18n( 'PatientGadget.PatientGadgetCurrentTasks.CONFIG_FIELDS.TITLE' ),
                        converter: function( value/*, data*/ ) {
                            return value || '';
                        }
                    },
                    {
                        val: CONFIG_FIELDS.TYPE,
                        i18n: i18n( 'tasktype-schema.TaskType_T.type' ),
                        converter: function( value/*, data*/ ) {
                            return value || '';
                        }
                    },
                    {
                        val: CONFIG_FIELDS.DETAILS,
                        i18n: i18n( 'task-schema.Task_T.details.i18n' ),
                        converter: function( value, data ) {
                            var
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
                        }
                    },
                    {
                        val: CONFIG_FIELDS.EMPLOYEE_NAME,
                        i18n: i18n( 'task-schema.Task_T.employeeName.i18n' ),
                        converter: function( value/*, data*/ ) {
                            return value || '';
                        }
                    },
                    {
                        val: CONFIG_FIELDS.CREATOR_NAME,
                        i18n: i18n( 'task-schema.Task_T.creatorName.i18n' ),
                        converter: function( value/*, data*/ ) {
                            return value || '';
                        }
                    },
                    {
                        val: CONFIG_FIELDS.CANDIDATES_NAMES,
                        i18n: i18n( 'task-schema.Task_T.candidates.i18n' ),
                        converter: function( value, data ) {

                            var
                                candidates = value,
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
                        }
                    },
                    {
                        val: CONFIG_FIELDS.ROLES,
                        i18n: i18n( 'task-schema.Task_T.roles.i18n' ),
                        renderer: function( value/*, data*/ ) {
                            var
                                roles = value;

                            if( !(Array.isArray( roles ) && roles.length) ) {
                                return '';
                            }

                            return roles.join( ',<br/>' );
                        }
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.ALERT_TIME,
                    CONFIG_FIELDS.TITLE,
                    CONFIG_FIELDS.EMPLOYEE_NAME
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetCurrentTasks );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'PatientGadgetConfigurableTableBase',
        'GadgetLayouts',
        'GadgetUtils',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dccommonutils',
        'dcutils',
        'dccommunication-client'
    ]
} );
