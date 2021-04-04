/**
 * User: strix
 * Date: 12/3/2020
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */


YUI.add( 'formfolder-process', function( Y, NAME ) {
        /**
         * The DC Location data schema definition
         *
         * @class DCFormFolderProcess
         */

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        function checkParentId( user, formFolder, callback ) {
            if ( `${formFolder._id}` === formFolder.parentId ) {
                Y.log( `Form folder is its own parent: ${formFolder._id}`, 'warn', NAME );
                formFolder.parentId = '';
            }
            callback( null, formFolder );
        }

        /**
         * Class FormFolder Processes --
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         */

        Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {run: [ checkParentId ], forAction: 'find'},
                {run: [ checkParentId ], forAction: 'write'},
                {run: [], forAction: 'delete'}
            ],
            post: [],
            name: NAME
        };

    },
    '0.0.1', {requires: [
        'formfolder-schema'

    ]}
);
