/**
 * User: md
 * Date: 01/04/2019  15:45
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'marker-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );


        // workaround @MOJ-6625
        function setIsModified( user, marker, callback ) {
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                marker.lastChanged = marker.lastChanged || new Date();
            } else {
                marker.lastChanged = new Date();
            }
            callback( null, marker );
        }

        function syncMarker( user, marker, callback ) {
            callback( null, marker );
            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `marker_${ marker._id.toString()}`,
                entityName: 'marker',
                entryId: marker._id.toString(),
                lastChanged: marker.lastChanged,
                onDelete: false
            }, () => {} );
        }

        function syncMarkerOnDelete( user, marker, callback ) {
            callback( null, marker );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `marker_${ marker._id.toString()}`,
                entityName: 'marker',
                entryId: marker._id.toString(),
                lastChanged: marker.lastChanged,
                onDelete: true
            }, () => {} );
        }

        /**
         * @class identityProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [ syncMarkerOnDelete ], forAction: 'delete'},
                {run: [ setIsModified ], forAction: 'write'}
            ],

            post: [
                {run: [ syncMarker ], forAction: 'write'}
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
