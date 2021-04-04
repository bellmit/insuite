/**
 * User: pi
 * Date: 09/02/2015  13:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'formtemplateversion-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function setIsModified( user, formtemplateversion, callback ) {
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                formtemplateversion.lastChanged = formtemplateversion.lastChanged || new Date();
            } else {
                formtemplateversion.lastChanged = new Date();
            }
            callback( null, formtemplateversion );
        }

        function syncFormTemplateVerion( user, formtemplateversion, callback ) {
            callback( null, formtemplateversion );
            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `formtemplateversion_${ formtemplateversion._id.toString()}`,
                entityName: 'formtemplateversion',
                entryId: formtemplateversion._id.toString(),
                lastChanged: formtemplateversion.lastChanged,
                onDelete: false
            }, () => {} );
        }

        function syncFormTemplateVerionOnDelete( user, formtemplateversion, callback ) {
            callback( null, formtemplateversion );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `formtemplateversion_${ formtemplateversion._id.toString()}`,
                entityName: 'formtemplateversion',
                entryId: formtemplateversion._id.toString(),
                lastChanged: formtemplateversion.lastChanged,
                onDelete: true
            }, () => {} );
        }

        /**
         * @class formtemplateversionProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker('write', 'formtemplateversion'),
                    setIsModified
                ], forAction: 'write'},
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker('delete', 'formtemplateversion'),
                    syncFormTemplateVerionOnDelete
                ], forAction: 'delete'}
            ],

            post: [
                {run: [ syncFormTemplateVerion ], forAction: 'write'}
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
