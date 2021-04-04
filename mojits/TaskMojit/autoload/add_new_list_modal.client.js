/*global YUI, ko, async, $*/

'use strict';

YUI.add( 'addnewlistmodal', function( Y, NAME ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

        /**
         * AddNewListViewModel
         * @param {Object} config
         * @constructor
         */
        function AddNewListViewModel( config ) {
            AddNewListViewModel.superclass.constructor.call( this, config );
        }

        AddNewListViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( AddNewListViewModel, KoViewModel.getBase(), {
            initializer: function AddNewListViewModel_initializer( config ) {
                var
                    self = this;

                if( config.name ) {
                    self.name( config.name );
                }

                if( config.color ) {
                    self.color( config.color );
                }

                if( config.numberOfTasks ) {
                    self.numberOfTasks( config.numberOfTasks );
                }

                self.colorI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.COLOR' );
                self.maxNumberI18n = i18n( 'TaskMojit.labels.max_number' );
                self.addNewListI18n = i18n( 'TaskMojit.labels.add_new_column' );
                self.editListI18n = i18n( 'TaskMojit.labels.edit_column' );
                self.rolesI18n = i18n( 'task-schema.Task_T.roles.i18n' );
                self.taskTypesI18n = i18n( 'tasktype-schema.TaskType_T.type' );
                self.urgencyI18n = i18n( 'task-schema.Task_T.urgency.i18n' );
                self.employeeNameI18n = i18n( 'task-schema.Task_T.employeeName.i18n' );
                self.candidatesNamesI18n = i18n( 'task-schema.Task_T.candidates.i18n' );
                self.patientNameI18n = i18n( 'task-schema.Task_T.patient.i18n' );
                self.locationI18n = i18n( 'patient-schema.Patient_T.locationId.i18n' );
                self.alertTimeI18n = i18n( 'task-schema.Task_T.alertTime.i18n' );
                self.alertTimeComponent = KoComponentManager.createComponent( {
                    componentType: 'KoSchemaValue',
                    componentConfig: {
                        fieldType: 'ISODate',
                        useIsoDate: true,
                        showLabel: false,
                        placeholder: self.alertTimeI18n
                    }
                } );
                self.urgencyList = Y.doccirrus.schemas.task.types.Urgency_E.list;
                self.rolesFilterValue = ko.observableArray( [] );
                self.tasksFilterValue = ko.observable();
                self.urgencyFilterValue = ko.observable();
                self.locationsFilterValue = ko.observableArray( [] );
                self.employeesFilterValue = ko.observableArray( [] );
                self.employeeNameFilterValue = ko.observable();
                self.employeeNameTextValue = ko.observable();
                self.patientsFilterValue = ko.observable();
                self.patientsNameValue = ko.observable();
                self.alertTimeFilterValue = ko.computed( function() {
                    return unwrap( self.alertTimeComponent.value );
                });
                // load data for existing column only
                self._initSelect2Roles();
                self._initTaskTypes();
                self._initSelect2TaskTypes();
                self._initSelect2Urgency();
                self._initSelect2Locations();
                self._initEmployees();
                self._initSelect2Employees();
                self._initSelect2EmployeeName();
                self._initPatients();
                self._initSelect2Patients();

                if( config.rolesFilterValue ) {
                    self.rolesFilterValue( config.rolesFilterValue );
                }

                if( config.tasksFilterValue ) {
                    self.tasksFilterValue( config.tasksFilterValue );
                }

                if( config.urgencyFilterValue ) {
                    self.urgencyFilterValue( config.urgencyFilterValue );
                }

                if( config.locationsFilterValue ) {
                    self.locationsFilterValue( config.locationsFilterValue );
                }

                if( config.employeesFilterValue ) {
                    self.employeesFilterValue( config.employeesFilterValue );
                }

                if( config.employeeNameFilterValue ) {
                    self.employeeNameFilterValue( config.employeeNameFilterValue );
                }

                if( config.employeeNameTextValue ) {
                    self.employeeNameTextValue( config.employeeNameTextValue );
                }

                if( config.patientsFilterValue ) {
                    self.patientsFilterValue( config.patientsFilterValue );
                }

                if( config.patientsNameValue ) {
                    self.patientsNameValue( config.patientsNameValue );
                }

                if( config.alertTimeFilterValue ) {
                    self.alertTimeComponent.value( config.alertTimeFilterValue );
                }
            },
            destructor: function AddNewListViewModel_destructor() {
            },
            attachAllMiniColors: function() {
                var
                    $markerPrioritiesNodeBinder = $( '#addNewList' ),
                    $elementsToAttach = $( '.input-color:not(.minicolors-input)', $markerPrioritiesNodeBinder );

                if( !$elementsToAttach.length ) {
                    Y.log( 'No elements to attach color pickers to.', 'warn', NAME );
                    return false;
                }

                async.eachSeries( $elementsToAttach, attachColorPicker, onInitComplete );

                function attachColorPicker( toElem, itcb ) {
                    if ( toElem && toElem.attachedColorPicker ) {
                        Y.log( 'Color picker handler already initialized, not repeating.', 'warn', NAME );
                        return itcb( null );
                    }

                    $( toElem ).minicolors(
                        'create',
                        {
                            theme: 'bootstrap',
                            opacity: true,
                            format: 'hex',
                            change: function( value ) {
                                var $data = ko.dataFor( toElem );
                                $data.color( value );
                            }
                        }
                    );

                    toElem.attachedColorPicker = true;
                    itcb( null );
                }

                function onInitComplete( err) {
                    if ( err ) {
                        Y.log( 'Problem creating color pickers: ' + JSON.stringify( err ), 'warn', NAME );
                    }
                }
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
                        query: function( query ) {
                            Y.doccirrus.jsonrpc.api.role.get( {
                                query: {
                                    value: {
                                        $regex: query.term,
                                        $options: 'i'
                                    }
                                }
                            } ).done( function( response ) {
                                    var
                                        data = response.data;
                                    query.callback( {
                                        results: data.map( function( role ) {
                                            if( !role ) {
                                                return role;
                                            }
                                            return {
                                                value: role.value,
                                                text: role.value
                                            };
                                        } )
                                    } );
                                }
                            ).fail( function() {
                                query.callback( {
                                    results: []
                                } );
                            } );
                        }
                    }
                };
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
            _initSelect2TaskTypes: function() {
                    var
                        self = this;
                    self.select2TaskTypes = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                return unwrap( self.tasksFilterValue );
                            },
                            write: function( $event ) {
                                self.tasksFilterValue( $event.val );
                            }
                        } ) ),
                        select2: {
                            width: '100%',
                            allowClear: true,
                            placeholder: self.taskTypesI18n,
                            data: function() {
                                var list = unwrap( self.taskTypes ),
                                    data = list.map( function( entry ) {
                                        return {
                                            id: entry._id,
                                            text: entry.name
                                        };
                                    } );
                                return {results: data};
                            }
                        }
                    };
                },
                _initSelect2Urgency: function() {
                    var
                        self = this;

                    function formatResult( el ) {
                        return "<div class='row'><div style='width: 30px; height: 20px; border: 1px solid black;' class='col-xs-offset-1 col-xs-4 col-lg-4 urgency-color-" + el.id + "'></div><div class='col-xs-8 col-lg-8'>" + el.text + "</div></div>";
                    }

                    self.select2Urgency = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                return unwrap( self.urgencyFilterValue );
                            },
                            write: function( $event ) {
                                self.urgencyFilterValue( $event.val );
                            }
                        } ) ),
                        select2: {
                            width: '100%',
                            allowClear: true,
                            placeholder: self.urgencyI18n,
                            data: self.urgencyList.map( function( entry ) {
                                return {
                                    id: entry.val,
                                    text: entry.i18n
                                };
                            } ),
                            minimumResultsForSearch: -1,
                            formatSelection: formatResult,
                            formatResult: formatResult
                        }
                    };
                },
                _initSelect2Locations: function() {
                    var
                        self = this;

                    self.select2Locations = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return unwrap( self.locationsFilterValue );
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.locationsFilterValue.push( $event.added );
                                }
                                if( $event.removed ) {
                                    self.locationsFilterValue.remove( function( item ) {
                                        return item.id === $event.removed.id;
                                    } );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: self.locationI18n,
                            width: '100%',
                            multiple: true,
                            allowClear: true,
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.location.read( {
                                    query: {
                                        locname: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    }
                                } ).done( function( response ) {
                                        var
                                            data = response.data;
                                        query.callback( {
                                            results: data.map( function( location ) {
                                                return {
                                                    id: location._id,
                                                    text: location.locname
                                                };
                                            } )
                                        } );
                                    }
                                ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            }
                        }
                    };
                },
                _initEmployees: function() {
                    var
                        self = this;

                    self.employees = ko.observableArray( [] );

                    Y.doccirrus.jsonrpc.api.employee.read( { query: { status: 'ACTIVE'} } ).done( function( response ) {
                        self.employees( response.data.map( function( item ) {
                            return {
                                value: item._id,
                                text: item.lastname + ', ' + item.firstname
                            };
                        } ) );
                    } );
                },
                _initSelect2Employees: function() {
                    var
                        self = this;

                    self.select2Employees = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return unwrap( self.employeesFilterValue );
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.employeesFilterValue.push( $event.added );
                                }
                                if( $event.removed ) {
                                    self.employeesFilterValue.remove( function( item ) {
                                        return item.id === $event.removed.id;
                                    } );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: self.candidatesNamesI18n,
                            width: '100%',
                            multiple: true,
                            allowClear: true,
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.employee.getEmployeeByName( {
                                    query: {
                                        term: query.term
                                    }
                                } ).done( function( response ) {
                                        var
                                            data = response.data;
                                        query.callback( {
                                            results: data.filter( function( employee ) {
                                                return employee.status === 'ACTIVE';
                                            } ).map( function( employee ) {
                                                return {
                                                    id: employee._id,
                                                    text: Y.doccirrus.schemas.person.personDisplay( employee )
                                                };
                                            } )
                                        } );
                                    }
                                ).fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                            }
                        }
                    };
                },
                _initSelect2EmployeeName: function() {
                    var
                        self = this;

                    self.select2EmployeeName = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                return unwrap( self.employeeNameFilterValue );
                            },
                            write: function( $event ) {
                                self.employeeNameFilterValue( $event.val );
                                if( $event.added ) {
                                    self.employeeNameTextValue( $event.added.text );
                                } else {
                                    self.employeeNameTextValue( undefined );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: self.employeeNameI18n,
                            width: '100%',
                            allowClear: true,
                            data: function() {
                                var list = unwrap( self.employees ),
                                    data = list.map( function( entry ) {
                                        return {
                                            id: entry.value,
                                            text: entry.text
                                        };
                                    } );
                                return {results: data};
                            }
                        }
                    };
                },
                _initPatients: function() {
                    var
                        self = this;

                    self.patients = ko.observableArray( [] );

                    Y.doccirrus.jsonrpc.api.patient.read( { query: {} } ).done( function( response ) {
                        self.patients( response.data.map( function( item ) {
                            return {
                                value: item._id,
                                text: item.firstname + ' ' + item.lastname
                            };
                        } ) );
                    } );
                },
                _initSelect2Patients: function() {
                    var
                        self = this;

                    self.select2Patients = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                return unwrap( self.patientsFilterValue );
                            },
                            write: function( $event ) {
                                self.patientsFilterValue( $event.val );
                                if( $event.added ) {
                                    self.patientsNameValue( $event.added.text );
                                } else {
                                    self.patientsNameValue( undefined );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: self.patientNameI18n,
                            width: '100%',
                            allowClear: true,
                            data: function() {
                                var list = unwrap( self.patients ),
                                    data = list.map( function( entry ) {
                                        return {
                                            id: entry.value,
                                            text: entry.text
                                        };
                                    } );
                                return {results: data};
                            }
                        }
                    };
                }
        },
        {
            schemaName: 'list',
            NAME: 'AddNewListViewModel'
        });

        KoViewModel.registerConstructor( AddNewListViewModel );


        function getTemplate( node, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'add_new_list_modal',
                'TaskMojit',
                {},
                node,
                callback
            );
        }

        function show( data, callback ) {
            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, function() {
                var model = new AddNewListViewModel( data ),
                    buttons = [
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function() {
                                var
                                    self = this,
                                    resultData = {
                                        name: unwrap( model.name ),
                                        color: unwrap( model.color ),
                                        numberOfTasks: unwrap( model.numberOfTasks ),
                                        rolesFilterValue: unwrap( model.rolesFilterValue ),
                                        tasksFilterValue: unwrap( model.tasksFilterValue ),
                                        urgencyFilterValue: unwrap( model.urgencyFilterValue ),
                                        locationsFilterValue: unwrap( model.locationsFilterValue ),
                                        employeesFilterValue: unwrap( model.employeesFilterValue ),
                                        employeeNameFilterValue: unwrap( model.employeeNameFilterValue ),
                                        employeeNameTextValue: unwrap( model.employeeNameTextValue ),
                                        patientsFilterValue: unwrap( model.patientsFilterValue ),
                                        patientsNameValue: unwrap( model.patientsNameValue ),
                                        alertTimeFilterValue: unwrap( model.alertTimeFilterValue )
                                    };

                                if( data._id ) {
                                    if( data.existingTasksNumber ) {
                                        Y.doccirrus.DCWindow.confirm( {
                                            message: i18n( 'TaskMojit.message.filter_change_confirm' ),
                                            callback: function( dialog ) {
                                                if( dialog.success ) {
                                                    updateList();
                                                }
                                            }
                                        } );
                                    } else {
                                        updateList();
                                    }
                                } else {
                                    Y.doccirrus.jsonrpc.api.list.create( {
                                        data: resultData
                                    } )
                                        .then( function() {
                                            callback();
                                        });
                                }

                                self.close();

                                function updateList() {
                                    Y.doccirrus.jsonrpc.api.list.update( {
                                        query: { _id: data._id },
                                        fields: ['name', 'color', 'numberOfTasks', 'rolesFilterValue', 'tasksFilterValue',
                                            'urgencyFilterValue', 'locationsFilterValue', 'employeesFilterValue',
                                            'employeeNameFilterValue', 'patientsFilterValue', 'alertTimeFilterValue',
                                            'employeeNameTextValue', 'patientsNameValue'],
                                        data: resultData
                                    } )
                                        .then( function() {
                                            // update tasks columnName after name was changed
                                            Y.doccirrus.jsonrpc.api.task.updateName({
                                                query: {
                                                    columnId: data._id
                                                },
                                                data: {
                                                    columnName: resultData.name
                                                }
                                            })
                                                .then( function() {
                                                    callback();
                                                } );
                                        });
                                }
                            }
                        } )
                    ],
                    modal;

                if( data && data._id ) {
                    buttons.unshift( Y.doccirrus.DCWindow.getButton( 'DELETE', {
                        isDefault: true,
                        action: function() {
                            var
                                self = this;
                            self.close();
                            Y.doccirrus.DCWindow.notice( {
                                title: i18n( 'TaskMojit.labels.column_delete' ),
                                message: i18n( 'TaskMojit.message.delete_confirm' ),
                                window: {
                                    buttons: {
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                                isDefault: true,
                                                action: function( e ) {
                                                    var
                                                        that = this;
                                                    e.target.button.disable();
                                                    Y.doccirrus.jsonrpc.api.list.delete( {
                                                        query: {
                                                            _id: data._id
                                                        }
                                                    } )
                                                        .then( function() {
                                                            that.close();
                                                            callback( data._id );
                                                        } );
                                                }
                                            } )
                                        ]
                                    }
                                }
                            } );
                        }
                    } ) );
                    buttons.unshift( Y.doccirrus.DCWindow.getButton( 'CANCEL' ) );
                } else {
                    buttons.unshift( Y.doccirrus.DCWindow.getButton( 'CANCEL' ) );
                }
                modal = new Y.doccirrus.DCWindow( { //eslint-disable-line
                    className: 'DCWindow-AddNewList',
                    bodyContent: node,
                    title: data && data._id ? model.editListI18n : model.addNewListI18n,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
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
                model.addDisposable( ko.computed( function() {
                    var isValid = unwrap( model.name ),
                        okButton = modal.getButton( 'OK' ).button;
                    if( isValid ) {
                        okButton.enable();
                    } else {
                        okButton.disable();
                    }
                } ) );
                ko.applyBindings( model, node.getDOMNode() );
                model.attachAllMiniColors();

            } );
        }

        Y.namespace( 'doccirrus.modals' ).addNewList = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'DCWindow',
            'list-schema'
        ]
    }
);
