/**MDpi
 * Date: 18/02/2016  14:34
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'prcdispatch-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function addNewTask( user, title, urgency, details, roles, creator ) {
            // creating new task
            var taskData = {
                allDay: true,
                alertTime: (new Date()).toISOString(),
                title: title,
                urgency: urgency,
                details: details,
                group: true,
                roles: roles,
                creatorName: creator
            };

            var cleanData = Y.doccirrus.filters.cleanDbObject( taskData );

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'task',
                action: 'post',
                data: cleanData
            }, function( err ) {//, result
                if( err ) {
                    Y.log( 'Failed to add task: ' + title + '\n\t' + err.message, 'error', NAME );
                }
            } );
        }

        function statusCheck( user, prcdispatch, callback ) {
            var originalData = prcdispatch.originalData_ || {},
                isDoquvide = Y.doccirrus.auth.isDOQUVIDE(),
                title,
                details,
                roles,
                creator;


            if( isDoquvide ){
                if( originalData && originalData.activeState && prcdispatch.activeState === true ) { //NEW
                    title = Y.doccirrus.i18n( 'dispatch.doquvide_new' );
                } else if( prcdispatch.activeState === true ) {
                    title = Y.doccirrus.i18n( 'dispatch.doquvide_active' );
                } else {
                    title = Y.doccirrus.i18n( 'dispatch.doquvide_not_active' );
                }
                details = prcdispatch.coname;
                roles = [ Y.doccirrus.schemas.role.ROLES.CARDIO ];
                creator = prcdispatch.coname;

            } else{
                //INCARE
                if( prcdispatch.activeState === true ) {
                    title = Y.doccirrus.i18n( 'dispatch.active' );
                } else {
                    title = Y.doccirrus.i18n( 'dispatch.not_active' );
                }
                title = title.replace( '{prcCustomerNo}', prcdispatch.prcCustomerNo );
                details = '';
                roles = [Y.doccirrus.schemas.patient.DISPATCHER.INCARE];
                creator = Y.doccirrus.i18n( 'dispatch.task.creatorName' );
            }

            if( originalData.activeState !== prcdispatch.activeState ) {
                addNewTask( user, title, 2, details, roles, creator );
                return callback( null, prcdispatch );
            } else {
                return callback( null, prcdispatch );
            }
        }

        function verifyRequest( user, prcdispatchrequest, callback ) {

            let modelName = 'prcdispatch',
                originalData = prcdispatchrequest.originalData_ || {};

            let queryConditions = [
                {customerId: prcdispatchrequest.customerId},
                {customerId: {'$exists': true, '$ne': ''}}
            ];

            if( originalData._id ) {
                queryConditions.push( {'_id': {'$ne': originalData._id}} );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: modelName,
                action: 'get',
                query: {
                    $and: queryConditions
                }

            }, function( err, result ) {
                if( err ) {
                    callback( err );
                } else {
                    if( result.length === 0 ) {
                        callback( null, prcdispatchrequest );
                    } else {
                        //TODO: update to be rest error
                        callback( 'PartnerId is not unique' );
                    }
                }
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
                        verifyRequest,
                        statusCheck
                    ],
                    forAction: 'write'
                }
            ]
        };

    },
    '0.0.1', {requires: ['dchttps', 'dispatchrequest-schema', 'mirroractivity-schema', 'task-schema']}
);
