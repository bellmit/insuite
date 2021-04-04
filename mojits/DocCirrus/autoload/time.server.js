/**
 * User: dcdev
 * Date: 9/5/18  1:27 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */



YUI.add(
    'dc-time',
    function( Y/*, NAME*/ ) {

        var dcTime;

        function DcTime() {

        }

        DcTime.prototype.sendHeartbeat = function() {
            Y.doccirrus.communication.emitNamespaceEvent( {
                nsp: 'default',
                event: 'HEARTBEAT_1M_EVENT',
                msg: {}
            } );
        };

        dcTime = new DcTime();
        Y.namespace( 'doccirrus' ).dctime = dcTime;
    }, '0.0.1',
    {
        requires: []
    }
);

