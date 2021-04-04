/**
 * User: ad
 * Date: 12.08.2013
 * (c) 2013, Doc Cirrus GmbH, Berlin
 */

'use strict';

YUI.add( 'dcmonitor', function( Y, NAME ) {

        var
            DB = require( 'dc-core' ).db;

        /**
         * NOTE THIS IS A DEPRECATED MODULE (Sept 2013)  MOJ-745
         *
         * ALL CONNECTIONS TO THE DBLAYER MUST GO THROUGH THE DB LAYER
         *
         * Please do not copy this pattern anywhere.
         * Contact @rw if you require extensions to the DBLayer
         *
         */

        function DCMonitor() {

        }

        DCMonitor.prototype.getRuntime = function getRuntime( callback ) {

            Y.log( 'DCMonitor.getRuntime', 'debug', NAME );
            var runtime = {};
            runtime.state = '';

            function setState( yes ) {

                if( runtime.state ) {// if DB has already answered
                    return;
                }
                if( yes ) {
                    runtime.state = 'connected';
                } else {
                    runtime.state = 'disconnected';
                }

                callback( runtime );
            }

            setTimeout( setState, 5400 ); // force callback in case DB is not answering
            DB.onOpen( Y.doccirrus.auth.getLocalTenantId(), setState );
        };

        var
            myMonitor = new DCMonitor();

        Y.namespace( 'doccirrus' ).monitor = myMonitor;

    },
    '0.0.1', { requires: ['dcauth'] }
);
