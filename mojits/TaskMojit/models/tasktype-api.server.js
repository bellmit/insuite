/*jshint esnext:true */
/*global YUI */


YUI.add( 'tasktype-api', function( Y, NAME ) {
        /**
         * @module tasktype-api
         */

        const
            async = require( 'async' );

        /**
         * default post method
         * @method post
         * @param {Object} args
         */
        function post( args ) {
            Y.log('Entering Y.doccirrus.api.tasktype.post', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tasktype.post');
            }
            let
                {user, data = {}, callback, options = {}} = args;
            data = Y.doccirrus.filters.cleanDbObject( data );
            Y.doccirrus.mongodb.runDb( {
                action: 'post',
                model: 'tasktype',
                user,
                data,
                options
            }, callback );
        }

        /**
         * default delete method
         * @method deleteType
         * @param {Object} args
         *
         * @return {Function}   callback
         */
        function deleteType( args ) {
            let
                {user, query = {}, callback, options = {}} = args;

            //user cannot delete default task types
            if( query && query._id &&
                [ Y.doccirrus.schemas.tasktype.templateSystem._id, Y.doccirrus.schemas.tasktype.defaultItems[0]._id, Y.doccirrus.schemas.tasktype.defaultItems[1]._id ].includes( query._id ) ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 1130001 ) );
            }

            Y.doccirrus.mongodb.runDb( {
                action: 'delete',
                model: 'tasktype',
                user,
                query,
                options
            }, callback );
        }

        /**
         * default get method
         * @method get
         * @param {Object} args
         */
        function get( args ) {
            Y.log('Entering Y.doccirrus.api.tasktype.get', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tasktype.get');
            }
            let
                {user, query = {}, callback, options = {}, migrate = false} = args;
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'tasktype',
                user,
                options,
                migrate,
                query
            }, callback );
        }

        function getForTypeTable( args ) {
            var
                user = args.user,
                query = args.query,
                options = args.options,
                callback = args.callback;

            options.lean = true;

            function populateEntry( taskType, callback ) {
                let
                    employeesId = [];

                if( taskType.candidates ) {
                    employeesId = employeesId.concat( taskType.candidates );
                }
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'get',
                    query: {
                        _id: {$in: employeesId}
                    },
                    options: {
                        lean: true,
                        select: {
                            lastname: 1,
                            middlename: 1,
                            nameaffix: 1,
                            firstname: 1,
                            title: 1,
                            specifiedBy: 1
                        }
                    },
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log( 'getPopulatedEmployee. getting employee error: ' + JSON.stringify( err ), 'error', NAME );
                            return callback( err );
                        }
                        taskType.candidatesObj = result;
                        return callback( null, taskType );
                    }
                } );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'tasktype',
                action: 'get',
                query: query,
                options: options,
                callback: function( err, result ) {
                    let
                        taskTypes = result && result.result,
                        defaults = Y.doccirrus.schemas.tasktype.getDefaultTypes();
                    if( err ) {
                        Y.log( 'error in getting tasktypes: ' + JSON.stringify( err ), 'error', NAME );
                        callback( err );
                        return;
                    }
                    if( !taskTypes ) {
                        return callback( null, defaults );
                    }

                    async.mapSeries( taskTypes, populateEntry, ( err ) => {
                        return callback( err, err ? null : result );
                    } );
                }
            } );
        }

        function updateTaskType( args ) {
            let
                {user, data, fields, callback} = args;

            if( data._id ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'put',
                    model: 'tasktype',
                    query: { _id: data._id },
                    data: Y.doccirrus.filters.cleanDbObject( data ),
                    fields: fields
                }, callback );
            } else {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'post',
                    model: 'tasktype',
                    data: Y.doccirrus.filters.cleanDbObject( data )
                }, callback );
            }
        }

        /**
         * @class task
         * @namespace doccirrus.api
         * @main
         */
        Y.namespace( 'doccirrus.api' ).tasktype = {
            /**
             * @property name
             * @type {String}
             * @default tasktype-api
             * @protected
             */
            name: NAME,
            get,
            post,
            getForTypeTable: function( args ) {
                Y.log('Entering Y.doccirrus.api.tasktype.getForTypeTable', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tasktype.getForTypeTable');
                }
                getForTypeTable( args );
            },
            updateTaskType: function( args ) {
                Y.log('Entering Y.doccirrus.api.tasktype.updateTaskType', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tasktype.updateTaskType');
                }
                updateTaskType( args );
            },
            deleteType( args ){
                Y.log('Entering Y.doccirrus.api.tasktype.deleteType', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.tasktype.deleteType');
                }
                deleteType( args );
            }
        };

    },
    '0.0.1', {
        requires: [
            'dccommunication',
            'tasktype-schema',
            'dcauth'
        ]
    }
);
