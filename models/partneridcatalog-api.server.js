/**			/home/dcdev/doccirrus/dc-insuite/models/partneridcatalog-api.server.js
 * User: md
 * Date: 2/11/18  14:44
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

'use strict';

YUI.add( 'partneridcatalog-api', function( Y, NAME ) {

        /*

        example usage in sol:
            get, put, delete:
                let code = global.get("SOLNAME").toUpperCase();
                msg.url = global.get("ISURL") + "/2/partneridcatalog/?code="+code;
                return msg;
            post:
                let code = global.get("SOLNAME").toUpperCase();
                msg.url = global.get("ISURL") + "/2/partneridcatalog";
                msg.payload = {
                    code,
                    name: 'sumex 1 application'
                }
                return msg;
        */
        function filterArgs( args, action ) {
            const
                { user: { U: appName } = {}, query: { code : queryCode = '' } = {}, data: { code = '' } = {}, callback } = args;

            if( !appName ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 401 ) );
            }
            if( 'post' === action && code.toUpperCase() !== appName.toUpperCase() ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 422, {message: 'Application should add only own code'} ) );
            }
            if( ['get', 'put', 'delete'].includes(action) && (!queryCode || queryCode.toUpperCase() !== appName.toUpperCase() ) ){
                return callback( new Y.doccirrus.commonerrors.DCError( 422, {message: 'Application should query only own code'} ) );
            }

        }

        function get( args ) {
            filterArgs( args, 'get' );
            Y.doccirrus.RESTController_1.defaultHandlers.get( args );
        }

        function post( args ) {
            filterArgs( args, 'post' );
            // 1. add casefolder
            args.data = Y.doccirrus.filters.cleanDbObject( args.data );
            Y.doccirrus.RESTController_1.defaultHandlers.post( args );
        }

        function put( args ) {
            filterArgs( args, 'put' );
            args.data = Y.doccirrus.filters.cleanDbObject( args.data );
            Y.doccirrus.RESTController_1.defaultHandlers.put( args );
        }

        function del( args ) {
            filterArgs( args, 'delete' );
            Y.doccirrus.RESTController_1.defaultHandlers.delete( args );
        }

        function getAll( args ) {
            Y.doccirrus.RESTController_1.defaultHandlers.get( args );
        }
        /**
         * @class partneridcatalog
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).partneridcatalog = {
            name: NAME,
            get,
            put,
            post,
            delete: del,
            getAll
        };

    },
    '0.0.1', {requires: ['partneridcatalog-schema']}
);