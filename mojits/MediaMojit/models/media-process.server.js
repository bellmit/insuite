/**
 * User: ma
 * Date: 27/05/14  15:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */


YUI.add( 'media-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        const
            { formatPromiseResult } = require( 'dc-core' ).utils;

        function getActivityOrPatient( user, media, callback ) {

            function onLoadActivity( err, activities ) {
                if( err ) {
                    Y.log( 'Failed to get activities for media ' + err.message, 'error' );
                    return callback( err );
                }

                if( activities.length === 0 ) { return callback( null ); }
                callback( activities[0]._id.toString() );
            }

            if( ['activity', 'patient'].includes( media.ownerCollection ) && media.ownerId ) {
                return callback( media.ownerId );
            }

            if( 'forms' === media.ownerCollection && !media.ownerId ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'activity',
                    action: 'get',
                    query: { formPdf: media._id.toString() },
                    callback: onLoadActivity
                } );
                return;
            }

            callback( null );
        }

        function syncMediaWithDispatcher( user, media, callback ) {
            callback( null, media );
            getActivityOrPatient( user, media, ( activityId ) => {

                if( !activityId ) {
                    //  missing activityId
                    return callback( null, media );
                }
                if ( !activityId || 24 !== activityId.length || /[^0-9a-f]/.test( activityId.toLowerCase() ) ) {
                    //  activityId is actually a temp, random id of an activity which is not yet saved, cannot be synced
                    return callback( null, media );
                }

                Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'reference', {
                    addedFrom: 'media_' + media._id.toString(),
                    syncActivityId: activityId
                }, () => {} );

                let context = this && this.context || {};
                if( context.activeActiveWrite ){
                    Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                    return;
                }
                Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                    addedFrom: `media_${ media._id.toString()}`,
                    entityName: 'media',
                    entryId: media._id.toString(),
                    lastChanged: media.lastChanged,
                    onDelete: false
                }, () => {} );
            } );
        }

        function syncMediaWithDispatcherOnDelete( user, media, callback ) {
            callback( null, media );
            getActivityOrPatient( user, media, ( activityId ) => {

                if( !activityId ) {
                    //  missing activityId
                    return;
                }

                let context = this && this.context || {};
                if( context.activeActiveWrite ){
                    Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                    return;
                }
                Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                    addedFrom: `media_${ media._id.toString()}`,
                    entityName: 'media',
                    entryId: media._id.toString(),
                    lastChanged: media.lastChanged,
                    onDelete: true
                }, () => {} );
            } );
        }

        function setIsModified( user, media, callback ) {
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                media.lastChanged = media.lastChanged || new Date();
            } else {
                media.lastChanged = new Date();
            }
            callback( null, media );
        }

        /**
         *  If there is a malware warning, propogate it to any documents which refer to this media
         *
         *  @param  {Object}    user
         *  @param  {Object}    media
         *  @param  {Function}  callback
         */

        async function checkMalwareWarning( user, media, callback ) {
            if ( !media.malwareWarning ) { return callback( null, media ); }

            let err, documents, i, malwareName, data;

            [ err, documents ] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'document',
                    query: { mediaId: media._id }
                } )
            );

            if ( err ) {
                Y.log( `Could not copy malware warning to documents: ${err.stack||err}`, 'error', NAME );
                return callback( null, media );
            }

            for ( i = 0; i < documents.length; i++ ) {
                if ( media.malwareFalsePositive ) {
                    //  clear the malware warning for false positives
                    data = { $unset: { malwareWarning: '' } };
                } else {
                    //  set/confirm the malware warning on the document
                    //  we don't need all the clamdscan output on the document, just the name
                    malwareName = media.malwareWarning.split( '\n' )[0];
                    malwareName = malwareName.replace( ':', '' ).replace( 'FOUND', '' ).trim();
                    data = { $set: { malwareWarning: malwareName } };
                }

                [ err ] = await formatPromiseResult(
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'document',
                        action: 'update',
                        query: { _id: documents[i]._id },
                        data
                    } )
                );

                if ( err ) {
                    Y.log( `Could not update malware warning on document ${documents[i]._id}: ${err.stack||err}`, 'error', NAME );
                    //  continue with any other documents, best effort
                }

            }

            callback( null, media );
        }

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {
            pre: [
                { run: [setIsModified], forAction: 'write' },
                { run: [syncMediaWithDispatcherOnDelete], forAction: 'delete' }
            ],
            post: [
                { run: [syncMediaWithDispatcher], forAction: 'write' },
                { run: [checkMalwareWarning], forAction: 'write' }
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
