/**
 * User: pi
 * Date: 25/05/16  10:15
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/* global YUI */
YUI.add( 'DCMemoryChecker', function( Y, NAME ) {
        "use strict";

        function checkMemoryUsage() {
            Y.log( 'Checking memory usage', 'info', NAME );
            let
                os = require( 'os' ),
                totalMem = os.totalmem(),
                memoryUsed = process.memoryUsage().heapUsed,
                percentage = ( memoryUsed / totalMem ) * 100,
                norm = 12.5;
            if( norm < percentage ) {
                Y.log( 'Process uses to much memory. It will be restarted', 'info', NAME );
                Y.doccirrus.utils.restartServer();
            }
        }
        
        Y.namespace( 'doccirrus' ).memorychecker = {
            /**
             * periodically check for expired tenants and deactivate them
             */
            checkMemoryUsage: function() {
                checkMemoryUsage();
            }
        };
        Y.doccirrus.kronnd.on( 'checkMemory', Y.doccirrus.memorychecker.checkMemoryUsage );
    },
    '0.0.1', { requires: [ 'dckronnd', 'dcutils' ] }
);


