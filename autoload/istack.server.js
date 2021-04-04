/**
 * User: ad
 * Date: 15.06.2013
 * (c) 2013, Doc Cirrus GmbH, Berlin
 */

'use strict';

YUI.add( 'dcistack', function( Y/*, NAME*/ ) {

        var
            config;

        function IStack() {
            // purely static object at the moment, nothing in the instances.
        }

        function boot() {
            var
                prepared_config = {
                    activate: true,
                    debug: true,
                    base: process.cwd(),
                    node_modules: process.cwd() + '/node_modules',
                    db_layer: null,  //used for dcdb adapter
                    mongoDb: {                     //used for queueing
                        db: {
                            safe: true,
                            native_parser: false
                        },
                        host: 'localhost',
                        port: 27017,
                        multitenant: true
                    }
                },
                istack,
                intervalId;
            config = require( 'dc-core' ).config.load( process.cwd() + '/application.json' );

            if( config &&
                config.istack &&
                'true' === config.istack.activate && !Y.doccirrus.auth.isPUC() && !Y.doccirrus.auth.isVPRC() ) {
                istack = require( 'dc-istack' );
                intervalId = setInterval( function boot_istack() {

                    if( Y.doccirrus && Y.doccirrus.mongodb ) {
                        prepared_config.db_layer = Y.doccirrus.mongodb;
                        prepared_config.auth_layer = Y.doccirrus.auth;
                        istack.boot( prepared_config );
                        clearInterval( intervalId );
                    }

                }, 250 );
            } else {
                Y.log( '**Nothing to do for IStack: deactivated.' );
            }

        }

        IStack.prototype.init = function() {
            Y.log( '**Starting IStack**' );

            //async boot istack
            boot();
        };

        IStack.prototype.register = function( emitter ) {
            var
                istack;

            Y.log( '** Emitter registered!');
            emitter.on( 'INTERNAL_MESSAGE_EVT', function( event ) {
                Y.log( '** Received MESSAGE_EVT from ' + event.senderId + '(eventType: ' + event.eventType + ', model: ' + event.modelName + ')');

                if ( myIStack && config && config.istack && 'true' === config.istack.activate ) {
                    istack = require( 'dc-istack' );
                    istack.dispatch( event );
                }
            } );
        };

        var
            myIStack = new IStack();

        Y.doccirrus.auth.onReady( function() {
            myIStack.init();
        } );


        Y.namespace( 'doccirrus' ).istack = myIStack;

    },
    '0.0.1', { requires: [] }
);
