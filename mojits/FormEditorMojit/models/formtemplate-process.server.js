/**
 * User: pi
 * Date: 09/02/2015  13:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'formtemplate-process', function( Y, NAME ) {

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        // workaround @MOJ-6625
        function setIsModified( user, formtemplate, callback ) {
            let context = this && this.context || {};
            if( context.activeActiveWrite ) {
                formtemplate.lastChanged = formtemplate.lastChanged || new Date();
            } else {
                formtemplate.lastChanged = new Date();
            }
            callback( null, formtemplate );
        }

        function syncFormTemplate( user, formtemplate, callback ) {
            callback( null, formtemplate );
            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `formtemplate_${ formtemplate._id.toString()}`,
                entityName: 'formtemplate',
                entryId: formtemplate._id.toString(),
                lastChanged: formtemplate.lastChanged,
                onDelete: false
            }, () => {} );
        }

        function syncFormTemplateOnDelete( user, formtemplate, callback ) {
            callback( null, formtemplate );

            let context = this && this.context || {};
            if( context.activeActiveWrite ){
                Y.log( 'Write by activeActive, immediate sync skipped', 'info', NAME );
                return;
            }
            Y.doccirrus.api.dispatch.syncObjectWithDispatcher(user, 'activeReference', {
                addedFrom: `formtemplate_${ formtemplate._id.toString()}`,
                entityName: 'formtemplate',
                entryId: formtemplate._id.toString(),
                lastChanged: formtemplate.lastChanged,
                onDelete: true
            }, () => {} );
        }

        /**
         * @class formtemplateProcess
         */
        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker('write', 'formtemplate'),
                    setIsModified
                ], forAction: 'write'},
                {run: [
                    Y.doccirrus.auth.getCollectionAccessChecker('delete', 'formtemplate'),
                    syncFormTemplateOnDelete
                ], forAction: 'delete'}
            ],
            post: [
                {run: [ syncFormTemplate ], forAction: 'write'}
            ],

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
