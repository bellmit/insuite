/**
 * User: pi
 * Date: 30/09/2015  11:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'task-process', function( Y, NAME ) {
        /**
         * The DC Task data process definition
         *
         * @class TaskProcess
         */
        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        /**
         * Sets employee name to task
         * @param {Object} user
         * @param {Object} task
         * @param {Function} callback
         */
        function setEmployeeName( user, task, callback ) {
            Y.doccirrus.utils.setEmployeeName( user, task, callback );
        }
        /**
         * Sets candidates names to task
         * @param {Object} user
         * @param {Object} task
         * @param {Function} callback
         */
        function setCandidatesNames( user, task, callback ) {
            Y.doccirrus.utils.setCandidatesNames( user, task, callback );
        }

        /**
         * If the alert time was shifted to future than callTime should be undefined.
         * @param {Object} user
         * @param {Object} task
         * @param {Function} callback
         */
        function deleteCallTime( user, task, callback ) {
            var
                originalData = task.originalData_,
                moment;
            if( !task.isNew && originalData && originalData.alertTime !== task.alertTime ) {
                moment = require( 'moment' );
                if( moment( task.alertTime ).isAfter( moment() ) ) {
                    task.callTime = undefined;
                }
            }
            callback( null, task );
        }

        function deleteSocketIOEvents( user, task, callback ) {
            var
                taskId = task._id && task._id.toString();
            Y.doccirrus.mongodb.runDb( {
                user: user,
                action: 'delete',
                model: 'socketioevent',
                query: {
                    'message.taskId': taskId
                },
                options: {
                    override: true
                }
            }, function( err ) {
                callback( err, task );
            } );
        }

        function setCreatorData( user, task, callback ) {

            if( !task.dateCreated ) {
                task.dateCreated = Date.now();
            }

            if( 'su' === user.id ) {
                return callback( null, task );
            }

            if( task.creatorId || task.creatorName ) {
                callback( null, task );
                return;
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'get',
                query: {
                    _id: user.identityId
                },
                callback: ( error, result ) => {

                    if( error || !(result && result.length) ) {
                        return callback( error );
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'employee',
                        action: 'get',
                        query: {
                            _id: result[0].specifiedBy
                        },
                        callback: ( error, result ) => {
                            if( error || !(result && result.length) ) {
                                return callback( error );
                            }

                            let employee = result[0];
                            task.creatorId = employee._id.toString();
                            task.creatorName = Y.doccirrus.schemas.person.personDisplay( employee );

                            callback( null, task );
                        }
                    } );
                }
            } );
        }

        function descAppender( data, fieldName ) {
            if( 'status' === fieldName ) {
                return data[ fieldName ] ? `${Y.doccirrus.schemas.task.schema[ fieldName ].i18n}: ${Y.doccirrus.schemaloader.getEnumListTranslation( 'task', 'Status_E', data.status, 'i18n' )}` : '';
            }
            return data[ fieldName ] ? `${Y.doccirrus.schemas.task.schema[ fieldName ].i18n}: ${data[ fieldName ]}` : '';
        }

        function eventToRefreshTaskTable( user, task, callback ) {
            Y.doccirrus.communication.emitNamespaceEvent( {
                nsp: 'default',
                tenantId: user && user.tenantId,
                event: 'system.REFRESH_TASK_TABLE'
            } );

            callback( null, task );
        }

        function updateReporting( user, task, callback ) {
            //TODO: merge and insert check for task template
            Y.doccirrus.insight2.utils.requestReporting( user, 'TASK', task._id.toString() );
            callback( null, task );
        }

        function deleteReporting( user, task, callback ) {
            Y.doccirrus.insight2.utils.removeReporting( user.tenantId, 'TASK', task._id.toString() );
            callback( null, task );
        }

        function setCompletedData( user, task, callback ) {

            if( task.status === 'DONE' && !task.dateDone ) {
                task.dateDone = Date.now();
            }

            callback( null, task );
        }
        function setTaskType( user, task, callback ) {

            if( Y.doccirrus.schemas.task.systemTaskTypes.USER === task.type ){
                return callback( null, task );
            }

            task.taskType = task.taskType || Y.doccirrus.schemas.tasktype.getTaskTypeFromType( task.type );
            return callback( null, task );
        }

        function triggerRuleEngine( user, task, onDelete, callback ) {
            // return early, user should not wait for rule engine to complete
            callback( null, task );         //  eslint-disable-line callback-return

            let originalData = task.originalData_;
            if( Y.doccirrus.auth.isMocha() ) { //do not run rule engine during mocha tests
                return;
            }

            if( task.autoGenID ) {
                Y.log( `Task ${task._id.toString()} is auto-generated`, 'info', NAME );
                return;
            }

            let data = { ...(task.toObject ? task.toObject() : task), new: task.wasNew || false };

            if( !onDelete && originalData && originalData.patientId && originalData.patientId.toString() !== ( task.patientId ? task.patientId.toString() : task.patientId ) ){
                Y.doccirrus.api.rule.triggerIpcQueue( {
                    user,
                    type: 'task',
                    tenantId: user.tenantId,
                    patientId: originalData.patientId.toString(),
                    onDelete: true,
                    data: JSON.parse(JSON.stringify(data))
                } );
            }

            //trigger only if patientId is defined
            if( task.patientId ){
                Y.doccirrus.api.rule.triggerIpcQueue( {
                    user,
                    type: 'task',
                    tenantId: user.tenantId,
                    patientId: task.patientId,
                    onDelete,
                    data: JSON.parse(JSON.stringify(data))
                } );
            }

        }

        /**
         * Class Task Processes
         */

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            audit: {
                // audit: {}  switches on auditing.  for no auditing, do not include the "audit" parameter

                /**
                 * optional:  true = in addition to regular auditing note down actions
                 * on this model that were attempted as well as ones that failed.
                 * Descr. in this case will always be "Versuch".
                 *
                 * false = note down only things that actually took place,
                 * not attempts that failed
                 */
                noteAttempt: false,

                /**
                 * optional: here we can override what is shown in the audit log description
                 * only used when the action succeeds (see noteAttempt)
                 *
                 * @param   {Array}           data
                 * @returns {*|string|string}
                 */
                descrFn: function( data ) {
                    return [
                        descAppender( data, 'employeeName' ),
                        descAppender( data, 'status' )]
                        .filter( notEmpty => notEmpty )
                        .join( ', ' );
                }

            },

            name: NAME,

            pre: [
                {
                    run: [
                        Y.doccirrus.filtering.models.task.resultFilters[0],
                        setEmployeeName,
                        setCandidatesNames,
                        deleteCallTime,
                        setCreatorData,
                        setCompletedData,
                        setTaskType
                    ],
                    forAction: 'write'
                },
                {
                    run: [
                        Y.doccirrus.filtering.models.task.resultFilters[0]
                    ],
                    forAction: 'delete'
                }
            ],
            post: [
                {
                    run: [
                        deleteSocketIOEvents,
                        function( user, task, callback ) {
                            Y.doccirrus.api.task.notifyAssignedEmployees( user, task, {
                                onDelete: true,
                                context: this.context
                            }, callback );
                        },
                        deleteReporting,
                        (user, task, callback) => { triggerRuleEngine(user, task, true, callback); }
                    ],
                    forAction: 'delete'
                },
                {
                    run: [
                        eventToRefreshTaskTable,
                        function( user, task, callback ) {
                            Y.doccirrus.api.task.notifyAssignedEmployees( user, task, {
                                onDelete: false,
                                context: this.context
                            }, callback );
                        },
                        updateReporting,
                        (user, task, callback) => { triggerRuleEngine(user, task, false, callback); }
                    ],
                    forAction: 'write'
                }
            ],
            processQuery: Y.doccirrus.filtering.models.task.processQuery,
            processAggregation: Y.doccirrus.filtering.models.task.processAggregation
        };

    },
    '0.0.1', {
        requires: [
            'task-schema',
            'employee-schema',
            'simpleperson-schema',
            'syncTaskReportingManager'
        ]
    }
);
