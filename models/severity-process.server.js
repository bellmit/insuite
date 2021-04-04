/**
 * User: md
 * Date: 02/04/2019  13:30
 * (c) 2019, Doc Cirrus GmbH, Berlin
 */
/*global YUI */
'use strict';

YUI.add( 'severity-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        // workaround @MOJ-6625
        function setIsModified( user, severity, callback ) {
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                severity.lastChanged = severity.lastChanged || new Date();
            } else {
                severity.lastChanged = new Date();
            }
            callback( null, severity );
        }

        function syncSeverity( user, severity, callback ) {
            callback( null, severity );
            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `severity_${ severity._id.toString()}`,
                entityName: 'severity',
                entryId: severity._id.toString(),
                lastChanged: severity.lastChanged,
                onDelete: false
            }, () => {} );
        }

        function syncSeverityOnDelete( user, severity, callback ) {
            callback( null, severity );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `severity_${ severity._id.toString()}`,
                entityName: 'severity',
                entryId: severity._id.toString(),
                lastChanged: severity.lastChanged,
                onDelete: true
            }, () => {} );
        }

        /**
         * @class formtemplateProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [ setIsModified ], forAction: 'write'},
                {run: [ syncSeverityOnDelete ], forAction: 'delete'}
            ],
            post: [
                {run: [ syncSeverity ], forAction: 'write'}
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
