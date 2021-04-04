/**MDpi
 * Date: 18/02/2016  14:34
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'role-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function verifyRequest( user, role, callback ) {

            let modelName = 'role';

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: modelName,
                action: 'get',
                query: {value: role.value}
            }, function( err, result ) {
                if( err ) {
                    callback( err );
                } else {
                    Y.log( JSON.stringify( result ), 'error', NAME );
                    if( result.length === 0 ) {
                        callback( null, role );
                    } else {
                        //TODO: update to be rest error
                        callback( 'RoleValue is not unique' );
                    }
                }
            } );
        }

        function removeFromEmployees( user, role, callback ) {

            Y.doccirrus.mongodb.getModel( user, 'employee', true, function getModelAndUpdate( error, employee ) {

                employee.mongoose.collection.update(
                    {},
                    {$pull: {roles: {$in: [role.value]}}},
                    {multi: true},
                    callback
                );
            } );
        }

        function removeFromTaskType( user, role, callback ) {

            Y.doccirrus.mongodb.getModel( user, 'tasktype', true, function getModelAndUpdate( error, tasktype ) {

                tasktype.mongoose.collection.update(
                    {},
                    {$pull: {roles: {$in: [role.value]}}},
                    {multi: true},
                    callback
                );
            } );
        }

        /**
         * Class Task Processes
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            name: NAME,

            pre: [
                {
                    run: [
                        verifyRequest
                    ],
                    forAction: 'write'
                },
                {
                    run: [
                        removeFromEmployees,
                        removeFromTaskType
                    ],
                    forAction: 'delete'
                }

            ]
        };

    },
    '0.0.1', {requires: ['dchttps', 'role-schema']}
);
