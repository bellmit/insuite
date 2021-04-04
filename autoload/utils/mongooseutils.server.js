/**
 * User: do
 * Date: 09.04.19  13:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/

'use strict';

YUI.add( 'dcmongooseutils', function( Y, NAME ) {

        Y.log( `init ${NAME}`, 'info', NAME );

        /**
         * @module Mongoose Utils
         */

        /**
         *
         * @param fields Mongoose Fields Declaration {pathA: 1, pathB: 1, ...}
         * @param activity Mongoose Document Instance
         * @param activity.pathsModifiedBefore must be set on pre-process with content of modifiedPaths()
         * @return {*}
         */
        function areFieldsModified( fields, activity ) {
            Y.log( `check if passed fields of passed mongoose document are modified`, 'info', NAME );
            const pathsModifiedBefore = activity.pathsModifiedBefore;
            if( !Array.isArray(pathsModifiedBefore) ) {
                throw Error( 'activity must have pathsModifiedBefore set by pre-process' );
            }
            const paths = Object.keys( fields );
            Y.log( `passed paths to check: ${paths}`, 'debug', NAME );
            Y.log( `all modified paths of activity to check: ${pathsModifiedBefore}`, 'debug', NAME );
            return paths.some( function( field ) {
                return pathsModifiedBefore.includes( field );
            } );
        }

        Y.namespace( 'doccirrus' ).mongooseUtils = {
            areFieldsModified
        };

    },
    '0.0.1', {requires: []}
);
