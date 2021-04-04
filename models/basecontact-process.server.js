/**
 * User: do
 * Date: 07/09/15  16:06
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'basecontact-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        const
            async = require( 'async' ),
            syncAuxManager = Y.doccirrus.insight2.syncAuxManager,
            {formatPromiseResult, handleResult} = require( 'dc-core' ).utils,
            referenceTypeMap = {
                'PHYSICIAN': [
                    {
                        model: 'patient',
                        field: ['physicians']
                    }]
            };

        function setContent( user, basecontact, callback ) {
            basecontact.content = Y.doccirrus.schemas.basecontact.generateContent( basecontact );
            callback( null, basecontact );
        }

        function checkReferences( user, basecontact, callback ) {

            var basecontactId = basecontact._id.toString(),
                baseContactType = basecontact.baseContactType,
                references = referenceTypeMap[baseContactType];

            function finalCb( err ) {
                if( err ) {
                    return callback( err );
                }
                callback( null, basecontact );
            }

            function check( ref, cb ) {
                var fieldName,
                    isArray = Array.isArray( ref.field ),
                    query = {};

                function checkCb( err, count ) {
                    if( err ) {
                        return cb( err );
                    }

                    if( 0 !== count ) {
                        return cb( Y.doccirrus.errors.rest( 12000, '', true ) );
                    }

                    cb();
                }

                if( isArray ) {
                    fieldName = ref.field[0];
                    query[fieldName] = {$in: [basecontactId]};
                } else {
                    query[ref.field] = basecontactId;
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'count',
                    model: ref.model,
                    migrate: true,
                    query: query,
                    callback: checkCb
                } );
            }

            if( !references ) {
                return callback( null, basecontact );
            }

            async.each( references, check, finalCb );

        }

        function checkContactPhone( user, basecontact, callback ) {
            Y.doccirrus.utils.checkPersonPhone( user, basecontact, 'BASECONTACT', callback );
        }

        function removeContactPhoneNumbers( user, basecontact, callback ) {
            Y.doccirrus.utils.removePersonPhoneNumbers( user, basecontact, 'BASECONTACT', callback );
        }

        function updateReporting( user, basecontact, callback ) {
            syncAuxManager.auxHook( basecontact, 'basecontact', user );
            callback( null, basecontact );
        }

        // workaround @MOJ-6625
        function setWasModified( user, basecontact, callback ) {
            basecontact.wasNew = basecontact.isNew;
            basecontact.contactsWasModified = basecontact.isModified( 'contacts' );
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                basecontact.lastChanged = basecontact.lastChanged || new Date();
            } else {
                basecontact.lastChanged = new Date();
            }
            callback( null, basecontact );
        }

        /**
         * helper.
         * Finds added and deleted contacts, and updates their "contacts" field.
         * @param {Object} params
         * @param {Object} [params.user] requires if baseContactModel is undefined
         * @param {Object} [params.baseContactModel] mongoose basecontact model
         * @param {String} params.docId basecontact _id
         * @param {Array} params.currentContacts current "contacts" array
         * @param {Array} params.prevContacts previous "contacts" array
         * @param {Function} params.callback
         */
        function addAndRemoveContacts( params ) {
            let
                async = require( 'async' ),
                {docId, currentContacts, prevContacts, baseContactModel: model, callback, user} = params,
                addedContacts = currentContacts.filter( contactId => !prevContacts.includes( contactId ) ),
                deletedContacts = prevContacts.filter( contactId => !currentContacts.includes( contactId ) );
            async.waterfall( [
                function( next ) {
                    if( model ) {
                        return setImmediate( next, null, model );
                    }
                    Y.doccirrus.mongodb.getModel( user, 'basecontact', true, function( err, model ) {
                        next( err, model );
                    } );
                },
                function( model, next ) {
                    if( addedContacts.length ) {
                        let
                            query = {
                                _id: {$in: addedContacts}
                            };
                        model.mongoose.update( query, {$addToSet: {contacts: docId}}, {multi: true}, ( err ) => {
                            next( err, model );
                        } );
                    } else {
                        return setImmediate( next, null, model );
                    }
                },
                function( model, next ) {
                    if( deletedContacts.length ) {
                        let
                            query = {
                                _id: {$in: deletedContacts}
                            };
                        model.mongoose.update( query, {$pull: {contacts: docId}}, {multi: true}, ( err ) => {
                            next( err, model );
                        } );
                    } else {
                        return setImmediate( next, null, model );
                    }
                }
            ], callback );

        }

        /**
         * Updates "contacts" field of related basecontacts
         * @param {Object} user
         * @param {Object} basecontact
         * @param {Function} callback
         */
        function updateRelatedContacts( user, basecontact, callback ) {
            if( (basecontact.wasNew && basecontact.contacts && basecontact.contacts.length) || (!basecontact.wasNew && basecontact.contactsWasModified) ) {
                let
                    docId = basecontact._id,
                    originalData_ = basecontact.originalData_;
                addAndRemoveContacts( {
                    user,
                    docId,
                    currentContacts: basecontact.contacts.map( item => {
                        return item.toString();
                    } ),
                    prevContacts: basecontact.wasNew ? [] : originalData_.contacts.map( item => {
                        return item.toString();
                    } ),
                    callback( err ) {
                        callback( err, basecontact );
                    }
                } );
            } else {
                setImmediate( callback, null, basecontact );
            }
        }

        /**
         * Deletes current basecontact from "contacts" field of all related basecontacts
         * @param {Object} user
         * @param {Object} basecontact
         * @param {Function} callback
         */
        function deleteFromRelatedContacts( user, basecontact, callback ) {
            if( basecontact.contacts && basecontact.contacts.length ) {
                addAndRemoveContacts( {
                    user,
                    docId: basecontact._id,
                    currentContacts: [],
                    prevContacts: basecontact.contacts.map( item => {
                        return item.toString();
                    } ),
                    callback( err ) {
                        callback( err, basecontact );
                    }
                } );
            } else {
                setImmediate( callback, null, basecontact );
            }
        }

        /**
         * @method removeFromTransferCache
         * @private
         *
         * remove cache entry for current basecontact on POST write and delete
         *
         * @param {Object} user
         * @param {Object} basecontact
         * @param {String} callback
         *
         * @returns {Function} callback
         */
        async function removeFromTransferCache( user, basecontact, callback ) {
            let [err] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'delete',
                    model: 'transfercache',
                    query: {
                        basecontactsIds: basecontact._id
                    },
                    options: {
                        override: true
                    }
                } )
            );
            if( err ) {
                Y.log( `removeFromTransferCache: could not remove for basecontact: ${err.stack || err}`, 'error', NAME );
            }
            callback( null, basecontact );
        }

        function syncBaseContactWithDispatcher( user, basecontact, callback ) {
            callback( null, basecontact );

            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher( user, 'activeReference', {
                addedFrom: `basecontact_${basecontact._id.toString()}`,
                entityName: 'basecontact',
                entryId: basecontact._id.toString(),
                lastChanged: basecontact.lastChanged,
                onDelete: false
            }, () => {
            } );

        }

        async function updatePreviousMainSupplier( user, basecontact, callback ) {
            if( basecontact.isMainSupplier ) {
                const condition = {isMainSupplier: true},
                    update = {isMainSupplier: false},
                    multi = {multi: true};

                let [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    action: 'update',
                    model: 'basecontact',
                    query: condition,
                    user,
                    data: update,
                    options: multi
                } ) );

                if( err ) {
                    Y.log( `updatePreviousMainSupplier: Could not update Previous Main Supplier ${err.stack || err}`, 'error', NAME );
                    callback( err, basecontact );
                }

                callback( null, basecontact );
            } else {
                callback( null, basecontact );
            }
        }

        function syncBaseContactWithDispatcherOnDelete( user, basecontact, callback ) {
            callback( null, basecontact );

            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher( user, 'activeReference', {
                addedFrom: `basecontact_${basecontact._id.toString()}`,
                entityName: 'basecontact',
                entryId: basecontact._id.toString(),
                lastChanged: basecontact.lastChanged,
                onDelete: true
            }, () => {
            } );

        }

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'delete', 'basecontact' ),
                        checkReferences,
                        syncBaseContactWithDispatcherOnDelete
                    ], forAction: 'delete'
                },
                {
                    run: [
                        updatePreviousMainSupplier,
                        setWasModified,
                        setContent
                    ], forAction: 'write'
                }
            ],
            post: [
                {
                    run: [
                        updateRelatedContacts,
                        updateReporting,
                        checkContactPhone,
                        removeFromTransferCache,
                        syncBaseContactWithDispatcher
                    ], forAction: 'write'
                },
                {
                    run: [
                        deleteFromRelatedContacts,
                        removeContactPhoneNumbers,
                        removeFromTransferCache
                    ], forAction: 'delete'
                }
            ],
            audit: {
                descrFn: function( data ) {
                    return data.content || data._id;
                }

            },

            name: NAME
        };

    },
    '0.0.1', {requires: ['basecontact-schema', 'syncAuxManager']}
);
