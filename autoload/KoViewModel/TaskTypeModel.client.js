/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'TaskTypeModel', function( Y/*, NAME */ ) {
        /**
         * @module TaskTypeModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            DUE_DATE = i18n( 'TaskMojit.TASK_TYPES_TAB.label.DUE_DATE' );

        /**
         * @class TaskTypeModel
         * @constructor
         * @extends KoViewModel
         */
        function TaskTypeModel( config ) {
            TaskTypeModel.superclass.constructor.call( this, config );
        }

        TaskTypeModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };
        Y.extend( TaskTypeModel, KoViewModel.getBase(), {
                initializer: function TaskTypeModel_initializer( config ) {
                    var self = this;

                    self.dueDate = DUE_DATE;

                    self.initTask( config && config.data );
                },
                destructor: function TaskTypeModel_destructor() {
                },
                /**
                 * Saves or updates current task
                 * @method save
                 */
                save: function() {
                    var
                        self = this,
                        data = self.toJSON(),
                        promise;

                    promise = Y.doccirrus.jsonrpc.api.tasktype.updateTaskType( {
                        data: data,
                        fields: Object.keys( data )
                    } );
                    return promise;
                },
                /**
                 * initializes task model
                 * @method initTask
                 * @param {Object} data
                 */
                initTask: function TaskTypeModel_initTask( data ) {
                    var
                        self = this;

                    self.employee = ko.observable( (data.employeeId && {
                            id: data.employeeId,
                            text: data.employeeName
                        }) || data.employeeId );
                    self.addDisposable( ko.computed( function() {
                        var
                            employee = self.employee();
                        self.employeeId( employee && employee.id );
                        self.employeeName( employee && employee.text );
                    } ) );
                    self.candidatesObj = ko.observableArray( self.get( 'data.candidatesObj' ) || [] );
                    self.addDisposable( ko.computed( function() {
                        var
                            candidatesObj = self.candidatesObj();
                        self.candidates( candidatesObj.map( function( candidate ) {
                            return candidate._id;
                        } ) );
                    } ) );

                    self.initSelect2Employee();
                    self.initSelect2Role();
                },

                /**
                 * Coverts employee object to selec2 object
                 * @method personToSelect2Object
                 * @param {String} text
                 * @returns {Object}
                 */
                personToSelect2Object: function( person ) {
                    if( !person ) {
                        return person;
                    }
                    return {
                        id: person._id,
                        text: Y.doccirrus.schemas.person.personDisplay( person ),
                        data: {
                            kbvDob: person.kbvDob,
                            dob: person.dob
                        }
                    };
                },
                /**
                 * Initializes select2 for employee
                 * @method initSelect2Employee
                 */
                initSelect2Employee: function() {
                    var
                        self = this;
                    self.select2Employee = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    employee = ko.unwrap( self.employee );
                                return employee;
                            },
                            write: function( $event ) {
                                self.employee( $event.added );
                            }
                        } ) ),
                        placeholder: ko.observable( "\u00A0" ),
                        select2: {
                            allowClear: true,
                            width: '100%',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.employee.getEmployeeByName( {
                                    query: {
                                        term: query.term
                                    }
                                } ).done( function( response ) {
                                        var
                                            data = response.data;
                                        query.callback( {
                                            results: data.map( function( employee ) {
                                                return self.personToSelect2Object( employee );
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
                    self.select2Candidates = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    candidatesObj = ko.unwrap( self.candidatesObj );
                                return candidatesObj.map( function( candidate ) {
                                    return self.personToSelect2Object( candidate );
                                } );
                            },
                            write: function( $event ) {
                                if( Y.Object.owns( $event, 'added' ) ) {
                                    self.candidatesObj.push( $event.added.data );
                                }
                                if( Y.Object.owns( $event, 'removed' ) ) {
                                    self.candidatesObj.remove( function( candidate ) {
                                        return candidate._id === $event.removed.id;
                                    } );
                                }
                            }
                        } ) ),
                        select2: {
                            multiple: true,
                            width: '100%',
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
                                                    text: Y.doccirrus.schemas.person.personDisplay( employee ),
                                                    data: employee
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
                /**
                 * Initializes select2 for role
                 * @method initSelect2Role
                 */
                initSelect2Role: function() {
                    var
                        self = this;

                    self.select2Role = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    roles = ko.unwrap( self.roles );
                                roles = roles.map( function( roleValue ) {
                                    return {id: roleValue, text: roleValue};
                                } );
                                return roles;
                            },
                            write: function( $event ) {
                                if( Y.Object.owns( $event, 'added' ) ) {
                                    self.roles.push( $event.added.text );
                                }
                                if( Y.Object.owns( $event, 'removed' ) ) {
                                    self.roles.remove( $event.removed.text );
                                }
                            }
                        } ) ),
                        select2: {
                            multiple: true,
                            width: '100%',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.role.get( {
                                    query: {
                                        value: {$regex: query.term, $options: 'i'}
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
                                                    id: role.value,
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
                            },
                            formatResult: function( obj ) {
                                return obj.text;
                            }

                        }
                    };

                }
            },
            {
                schemaName: 'tasktype',
                NAME: 'TaskTypeModel'
            }
        )
        ;
        KoViewModel.registerConstructor( TaskTypeModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'task-schema',
            'person-schema',
            'tasktype-schema',
            'dcrequestchangesmodal',
            'dcgenerateidmirrorpatient'
        ]
    }
)
;