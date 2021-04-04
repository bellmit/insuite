/*global YUI */


YUI.add( 'tasktype-process', function( Y, NAME ) {
        /**
         * The DC Tasktype data process definition
         *
         * @class TaskTypeProcess
         */
        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function setTypeToDefault( user, tasktype, callback ) {

            Y.doccirrus.mongodb.runDb( {
                user,
                action: 'update',
                model: 'task',
                query: {taskType: tasktype._id},
                data: {
                    $set: {
                        taskType: Y.doccirrus.schemas.tasktype.defaultItems[0]._id,
                        type: ''
                    }
                },
                options: {
                    multi: true
                }
            }, callback );
        }

        async function checkTypeName( user, tasktype, callback ) {

            const {formatPromiseResult} = require( 'dc-core' ).utils;

            let originalData = tasktype.originalData_ || {},
                isNew = tasktype.isNew,
                err, result;

            if( isNew || originalData.name !== tasktype.name ) {
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'tasktype',
                        action: 'get',
                        query: {
                            name: tasktype.name
                        }
                    } )
                );

                if( err ) {
                    Y.log( `checkTypeName: Error getting tasktype: ${err.stack || err}`, 'error', NAME );
                    return callback( err );
                }

                if( result && result.length ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 1130000 ) );
                }
                return callback( null, tasktype );
            } else {
                return callback( null, tasktype );
            }
        }

        function setCandidatesNames( user, tasktype, callback ) {
            Y.doccirrus.utils.setCandidatesNames( user, tasktype, callback );
        }

        function setEmployeeName( user, tasktype, callback ) {
            Y.doccirrus.utils.setEmployeeName( user, tasktype, callback );
        }

        /**
         * Class TaskType Processes
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            name: NAME,

            pre: [
                {
                    run: [
                        checkTypeName,
                        setEmployeeName,
                        setCandidatesNames
                    ],
                    forAction: 'write'
                }
            ],

            post: [
                {
                    run: [
                        setTypeToDefault
                    ],
                    forAction: 'delete'
                }
            ]
        };

    },
    '0.0.1', {
        requires: [
            'task-schema'
        ]
    }
);
