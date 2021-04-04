/*global YUI*/


YUI.add( 'resource-api', function( Y, NAME ) {
        var
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;

        /**
         * @public
         * @async
         * @JsonRpcApi
         *
         * This method does below:
         * 1] Return all available resources if query is empty OR
         * 2] Return all resources that match query
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query]
         * @param {string} args.query.... // TODO fill query with some param
         * @param {function} [args.callback] - If present then response will be sent via callback
         * @returns {Promise<undefined>}
         */
        async function getResourceList( args ) {
            const
                {user, query = {}, options, callback} = args;

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    query,
                    options,
                    'model': 'resource'
                } )
            );

            if( err ) {
                Y.log( `getResourceList. Error while getting resources: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( null, result, callback );
        }

        /**
         * @public
         * @async
         * @JsonRpcApi
         *
         * This method does below:
         * 1] Return all available resource types if query is empty OR
         * 2] Return all resource types that match query
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} [args.query]
         * @param {string} args.query.... // TODO fill query with some param
         * @param {function} [args.callback] - If present then response will be sent via callback
         * @returns {Promise<undefined>}
         */
        async function getResourceTypes( args ) {
            const
                {user, query = {}, options, callback} = args;

            let [err, result] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    query,
                    'options': {...options, select: {type: 1}},
                    'model': 'resource'
                } )
            );

            if( err ) {
                Y.log( `getResourceTypes. Error while getting resource types: ${err.stack || err}`, 'warn', NAME );
                return handleResult( err, undefined, callback );
            }

            return handleResult( null, result, callback );
        }

        /**
         * @public
         * @async
         * @JsonRpcApi
         *
         * This method does below:
         * 1] Check for duplication of names of resources inside created objects
         * 2] In case of duplication throw an error to the user
         * 3] Otherwise, create new resource objects
         * 4] Check for duplication of names of resources inside updated objects
         * 5] In case of duplication throw an error to the user
         * 6] Otherwise, update existed resources
         *
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.originalParams
         * @param {Array} args.originalParams.created - Array of resource objects which should be created inside resource collection
         * @param {Array} args.originalParams.updated - Array of resource objects which should be updated inside resource collection
         * @param {Array} args.originalParams.deleted - Array of resource objects which should be deleted from resource collection
         * @param {function} [args.callback] - If present then response will be sent via callback
         * @returns {Promise<undefined>}
         */
        async function updateCollection( args ) {
            const
                {user, originalParams, callback} = args,
                {created, updated, deleted} = originalParams;
            let
                err, result, duplicatedNames,
                createdNames,
                res = {};

            createdNames = [...created].map( function( resource ) {
                return resource.name;
            } );

            if( created.length > 0 ) {
                //check for name duplications
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        'action': 'get',
                        'model': 'resource',
                        'query': {name: {$in: createdNames}},
                        'options': {
                            select: {
                                name: 1
                            }
                        }
                    } )
                );

                if( err ) {
                    Y.log( `updateCollection. Error while checking created resources: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                if( result && result.length ) {
                    duplicatedNames = result.map( item => {
                        return item.name;
                    } );
                    Y.log( `updateCollection. Created resource names ${duplicatedNames} duplication.`, 'warn', NAME );
                    return handleResult( new Y.doccirrus.commonerrors.DCError( 'resourceError_01', {data: {$resourceNames: duplicatedNames}} ), undefined, callback );
                }

                //create new resources
                [err, result] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        'action': 'post',
                        'model': 'resource',
                        'options': {entireRec: true},
                        'data': Y.doccirrus.filters.cleanDbObject( created )
                    } )
                );

                if( err ) {
                    Y.log( `updateCollection. Error while inserting new resources: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                res.addedResources = result;
            }

            if( updated.length > 0 ) {
                for( let resource of updated ) {
                    //check for name duplications
                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            'action': 'get',
                            'model': 'resource',
                            'query': {
                                _id: {$ne : resource._id},
                                name: resource.name
                            },
                            'options': {
                                select: {
                                    name: 1
                                }
                            }
                        } )
                    );

                    if( err ) {
                        Y.log( `updateCollection. Error while checking updated resources: ${err.stack || err}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }

                    if( result && result.length ) {
                        duplicatedNames = result.map( item => {
                            return item.name;
                        } );
                        Y.log( `updateCollection. Updated resource names ${duplicatedNames} duplication.`, 'warn', NAME );
                        return handleResult( new Y.doccirrus.commonerrors.DCError( 'resourceError_01', {data: {$resourceNames: duplicatedNames}} ), undefined, callback );
                    }

                    [err, result] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            action: 'put',
                            model: 'resource',
                            query: {_id: resource._id},
                            fields: Object.keys( resource ),
                            data: Y.doccirrus.filters.cleanDbObject( resource )
                        } )
                    );

                    if( err ) {
                        Y.log( `updateCollection. Error while updating resource with id: ${resource._id}. Error: ${err.stack || err}`, 'warn', NAME );
                        return handleResult( err, undefined, callback );
                    }
                }
            }

            if( deleted.length > 0 ) {
                [err] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'delete',
                        model: 'resource',
                        query: {_id: {$in: deleted}},
                        options: {override: true}
                    } )
                );
                if( err ) {
                    Y.log( `updateCollection. Error while deleting resources: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }
            }

            return handleResult( null, res, callback );
        }

        Y.namespace( 'doccirrus.api' ).resource = {

            name: NAME,
            getResourceList: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.resource.getResourceList', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.resource.getResourceList' );
                }
                return getResourceList( args );
            },
            getResourceTypes: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.resource.getResourceTypes', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.resource.getResourceTypes' );
                }
                return getResourceTypes( args );
            },
            updateCollection: function( args ) {
                Y.log( 'Entering Y.doccirrus.api.resource.updateCollection', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.resource.updateCollection' );
                }
                return updateCollection( args );
            }
        };
    },
    '0.0.1', {
        requires: [
            'oop',
            'dcerror',
            'dccalutils'
        ]
    }
);