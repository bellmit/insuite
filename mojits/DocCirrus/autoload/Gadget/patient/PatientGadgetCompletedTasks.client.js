/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _ */
YUI.add( 'PatientGadgetCompletedTasks', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetCompletedTasks
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),
        TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        GADGET_UTILS = GADGET.utils,

        CONFIG_FIELDS = GADGET_LAYOUT_PATIENT.configFields.configurableTable.PatientGadgetCompletedTasks;

    /**
     * @constructor
     * @class PatientGadgetCompletedTasks
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetCompletedTasks() {
        PatientGadgetCompletedTasks.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetCompletedTasks, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.loadTableDataDeBounced = GADGET_UTILS.deBounceMethodCall( self.reloadTableData, 2000 );
            self.initPatientGadgetCompletedTasks();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyCommunication();
        },
        tasks: null,
        initPatientGadgetCompletedTasks: function() {
            var
                self = this;

            self.completedTasksI18n = i18n( 'PatientGadget.PatientGadgetCompletedTasks.i18n' );

            self._linkToTaskTable = '/tasks#/completed';

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
                    status: {$eq: 'DONE'},
                    patientId:  peek( currentPatient._id )
                },
                options: {
                    sort: {
                        dateDone: -1
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
                    status: {$eq: 'DONE'},
                    patientId:  peek( currentPatient._id )
                },
                options: {
                    limit: self.loadLimit,
                    sort: {
                        dateDone: -1
                    }
                }
            }, function( err, response ) {
                if( !err && !self.get( 'destroyed' ) && self.tasks ) {
                    self.tasks( response.data || [] );
                }
            } );
        }
    }, {
        NAME: 'PatientGadgetCompletedTasks',
        ATTRS: {
            availableConfigurableTableColumns: {
                value: [
                    {
                        val: CONFIG_FIELDS.DATE_DONE,
                        i18n: i18n( 'PatientGadget.PatientGadgetCompletedTasks.CONFIG_FIELDS.DATE_DONE' ),
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
                        val: CONFIG_FIELDS.TITLE,
                        i18n: i18n( 'PatientGadget.PatientGadgetCompletedTasks.CONFIG_FIELDS.TITLE' ),
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
                    }
                ]
            },
            defaultConfigurableTableColumns: {
                value: [
                    CONFIG_FIELDS.DATE_DONE,
                    CONFIG_FIELDS.TITLE,
                    CONFIG_FIELDS.EMPLOYEE_NAME
                ]
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetCompletedTasks );

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
