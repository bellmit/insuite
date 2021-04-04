/**
 * User: ma
 * Date: 21/10/2014  15:45
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'identity-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        const
            ObjectId = require( 'mongoose' ).Types.ObjectId,
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils;

        /**
         * make sure there will be at least one admin user left
         * we care only if the user is currently an admin, but won't be after the operation
         *
         * @param   {String}          action
         *
         * @return {Function}
         */
        function getAdminChecker( action ) {

            return function checkForAdmin( user, identity, callback ) {
                var
                    wasAdmin ,
                    isAdmin = Y.doccirrus.auth.isAdminUser( identity );

                if( identity.isNew ) { // EXIT 1
                    callback( null, identity );
                    return;
                }

                if( user.identityId.toString() !== identity._id.toString() ) {  // EXIT 2
                    callback( null, identity );
                    return;
                }

                if( isAdmin && ('delete' === action || 'INACTIVE' === identity.status) ) { // EXIT 3
                    callback( Y.doccirrus.errors.rest( 7300, 'cannot remove/deactivate yourself', true ) );
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'identity',
                    query: {_id: identity._id},
                    callback: function( err, result ) {
                        if( err || !result || !result[0] ) {
                            callback( err || 'could not find an existing identity' );
                            return;
                        }
                        wasAdmin = Y.doccirrus.auth.isAdminUser( result[0] );
                        if( wasAdmin && !isAdmin ) {  // EXIT 4
                            callback( Y.doccirrus.errors.rest( 7300, 'cannot demote yourself', true ) );
                        } else {
                            callback( null, identity );
                        }
                    }
                } );

                // check the number of current (active) admin users
                //                Y.doccirrus.mongodb.runDb( {
                //                    user: user,
                //                    model: 'identity',
                //                    action: 'get',
                //                    query: {status: 'ACTIVE', memberOf: {$elemMatch: {group: 'ADMIN'}}},
                //                    callback: function( err, result ) {
                //                        if( err ) {
                //                            callback( err );
                //                            return;
                //                        }
                //                        if( 1 === result.length && result[0]._id.toString() === identity._id.toString() ) { // if this is the last admin
                //                            Y.log( 'will not allow to remove the only admin user', 'warn', NAME );
                //                            callback( Y.doccirrus.errors.rest( 7300, 'cannot remove the admin user', true ) );
                //                        } else {
                //                            callback( null, identity );
                //                        }
                //                    }
                //                } );
            };
        }

        /**
         * allows user to change his own profile.
         *  adds ADMIN group if user changes his profile.(only for this action)
         * @param {Object} user
         * @param {Object} identity
         * @param {Function} done
         */
        function accessCheckHelper(user, identity, done){
            function isSameGroups(groupsA, groupsB){
                return (groupsA.length === groupsB.length) && groupsA.every(function(groupA){
                    return groupsB.some(function(groupB){
                        return groupA.group === groupB.group;
                    });
                });
            }
            if( user && user.identityId === identity.originalData_._id.toString() && isSameGroups(identity.memberOf, identity.originalData_.memberOf) ) {
                user.groups = user.groups || [];
                if( !Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.identity.userGroups.ADMIN ) ) {
                    user.groups.push( {group: Y.doccirrus.schemas.identity.userGroups.ADMIN } );
                }
            }
            done();
        }

        /**
         * Checks if username is free
         * @param {Object} user
         * @param {Object} identity
         * @param {Function} callback
         *
         * @return {Function}       callback
         */
        function checkUsername( user, identity, callback ) {
            var
                originalData = identity.originalData_;
            if( !identity.isNew && originalData && originalData.username === identity.username ) {
                return callback( null, identity );
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'identity',
                action: 'count',
                query: {
                    username: identity.username,
                    _id: { $ne: identity._id }
                }
            }, function( err, count ) {
                if( err ) {
                    return callback( err );
                }
                if( count ) {
                    return callback( Y.doccirrus.errors.rest( 23000, '', true ) );
                }
                callback( err, identity );
            } );


        }

        async function updateEmployeeByIdentity( user, identity, callback ) {
            if( !identity.specifiedBy || identity.failedLoginCountWasModified || identity.nextLoginAttemptWasModified ) {
                return handleResult( null, identity, callback );
            }

            const memberOfQuery = {
                $all: identity.memberOf.map( ( groupEntry ) => ({
                    $elemMatch: {
                        _id: ObjectId( groupEntry._id ),
                        group: groupEntry.group
                    }
                }) )
            };
            let error, count;

            /* check if employee should update */

            [error, count] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'count',
                    query: {
                        _id: identity.specifiedBy,
                        status: identity.status,
                        username: identity.username,
                        roles: {$in: identity.roles},
                        memberOf: memberOfQuery
                    },
                    fields: ['status', 'memberOf', 'username', 'roles']
                } )
            );

            if( error ) {
                Y.log( `updateEmployeeByIdentity: error while checking if employee should update ${error.stack || error}`, 'error', NAME );
                return handleResult( error, null, callback );
            }

            if( count ) {
                Y.log( `updateEmployeeByIdentity: employee should not be updated`, 'debug', NAME );
                return handleResult( null, identity, callback );
            }

            Y.log( 'updateEmployeeByIdentity: updating employee', 'debug', NAME );

            [error] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'put',
                    query: {_id: identity.specifiedBy},
                    data: {
                        status: identity.status,
                        username: identity.username,
                        memberOf: identity.memberOf,
                        roles: identity.roles,
                        skipcheck_: true
                    },
                    fields: ['status', 'memberOf', 'username', 'roles']
                } )
            );

            if( error ) {
                Y.log( `updateEmployeeByIdentity. post process error: ${JSON.stringify( error )}`, 'error', NAME );
                return handleResult( error, null, callback );
            }

            return handleResult( null, identity, callback );
        }

        // workaround @MOJ-6625
        function setIsModified( user, identity, callback ) {
            identity.wasNew = identity.isNew;
            identity.failedLoginCountWasModified = identity.isModified( 'failedLoginCount' );
            identity.nextLoginAttemptWasModified = identity.isModified( 'nextLoginAttempt' );
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                identity.lastChanged = identity.lastChanged || new Date();
            } else {
                identity.lastChanged = new Date();
            }
            callback( null, identity );
        }

        function supportCheck( user, identity, callback ) {
            let
                dbData = this && this.dbData,
                currentGroups = identity.memberOf && identity.memberOf.map( item => item.group ) || [],
                oldGroups = dbData.memberOf && dbData.memberOf.map( item => item.group ) || [],
                currentHasSupport = currentGroups.includes( Y.doccirrus.schemas.identity.userGroups.SUPPORT ),
                oldHasSupport = oldGroups.includes( Y.doccirrus.schemas.identity.userGroups.SUPPORT ),
                userGroups = user.groups && user.groups.map( item => item.group ) || [],
                userHasSupport = userGroups.includes( Y.doccirrus.schemas.identity.userGroups.SUPPORT );
            if( !userHasSupport && ( ( currentHasSupport && !oldHasSupport) || (oldHasSupport && !currentHasSupport) ) ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 23001 ) );
            }
            callback();
        }

        function syncIdentity( user, identity, callback ) {
            callback( null, identity );
            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `identity_${ identity._id.toString()}`,
                entityName: 'identity',
                entryId: identity._id.toString(),
                lastChanged: identity.lastChanged,
                onDelete: false
            }, () => {} );
        }

        function syncIdentityOnDelete( user, identity, callback ) {
            callback( null, identity );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `identity_${ identity._id.toString()}`,
                entityName: 'identity',
                entryId: identity._id.toString(),
                lastChanged: identity.lastChanged,
                onDelete: true
            }, () => {} );
        }

        /**
         * @class identityProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'identity' ),
                    syncIdentityOnDelete,
                    getAdminChecker( 'delete' )

                ], forAction: 'delete'},
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'identity', accessCheckHelper ),
                    getAdminChecker( 'write' ),
                    supportCheck,
                    setIsModified,
                    checkUsername
                ], forAction: 'write'}
            ],

            post: [
                {run: [
                    updateEmployeeByIdentity,
                    syncIdentity
                ], forAction: 'write'}
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
