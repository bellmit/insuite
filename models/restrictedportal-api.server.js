/**
 * User: pi
 * Date: 19/08/16  16:45
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

YUI.add( 'restrictedportal-api', function( Y, NAME ) {

        function post( args ) {
            args.data = Y.doccirrus.filters.cleanDbObject( args.data );
            Y.doccirrus.mongodb.runDb( {
                action: 'post',
                model: 'restrictedportal',
                user: args.user,
                data: args.data,
                options: args.options
            }, args.callback );
        }

        function getEntry( args ) {
            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'restrictedportal',
                user: args.user,
                query: args.query,
                options: args.options
            }, args.callback );
        }

        function put( args ) {
            args.data = Y.doccirrus.filters.cleanDbObject( args.data );
            Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: 'restrictedportal',
                user: args.user,
                query: args.query,
                fields: args.fields,
                data: args.data,
                options: args.options
            }, args.callback );

        }

        function update( args ) {
            args.data = Y.doccirrus.filters.cleanDbObject( args.data );
            Y.doccirrus.mongodb.runDb( {
                action: 'update',
                model: 'restrictedportal',
                user: args.user,
                query: args.query,
                fields: args.fields,
                data: args.data,
                options: args.options
            }, args.callback );
        }


        /**
         * Class case Schemas -- gathers all the schemas that the case Schema works with.
         */
        /**
         * @class restrictedportal
         * @namespace doccirrus.api
         */
        Y.namespace( 'doccirrus.api' ).restrictedportal = {

            name: NAME,
            post( args ) {
                Y.log('Entering Y.doccirrus.api.restrictedportal.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.restrictedportal.post');
                }
                post( args );
            },
            get( args ){
                Y.log('Entering Y.doccirrus.api.restrictedportal.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.restrictedportal.get');
                }
                getEntry( args );
            },
            put( args ){
                Y.log('Entering Y.doccirrus.api.restrictedportal.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.restrictedportal.put');
                }
                put( args );
            },
            update( args ){
                Y.log('Entering Y.doccirrus.api.restrictedportal.update', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.restrictedportal.update');
                }
                update( args );
            }

        };

    },
    '0.0.1', { requires: [] }
);
