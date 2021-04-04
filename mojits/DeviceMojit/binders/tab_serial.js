/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
/*exported fun */

fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n;

    return {

        registerNode: function( node ) {
            var pageData = Y.doccirrus.utils.getMojitBinderByType( 'DeviceMojit' ).mojitProxy.pageData.get( 'tab_serial' );
            pageData.protocol = window.location.protocol.replace(":","");
            var data = Y.mix( {
                registerConnectionUrl: Y.Lang.sub( 'http://localhost:15150/register.html?server={server}&protocol={protocol}&tenant={tenant}', pageData )
            }, pageData );

            data.tabSerialHeaderI18n = i18n( 'DeviceMojit.tab_serial.header' );
            data.instructions1I18n = i18n( 'DeviceMojit.tab_serial.instructions.1' );
            data.instructions2I18n = i18n( 'DeviceMojit.tab_serial.instructions.2' );
            data.instructions3I18n = i18n( 'DeviceMojit.tab_serial.instructions.3' );
            data.instructions4I18n = i18n( 'DeviceMojit.tab_serial.instructions.4' );
            data.instructions5I18n = i18n( 'DeviceMojit.tab_serial.instructions.5' );
            data.instructions6I18n = i18n( 'DeviceMojit.tab_serial.instructions.6' );
            data.notes1I18n = i18n( 'DeviceMojit.tab_serial.notes.1' );
            data.notes2I18n = i18n( 'DeviceMojit.tab_serial.notes.2' );
            data.macI18n = i18n( 'DeviceMojit.tab_serial.software.mac' );
            data.windowsI18n = i18n( 'DeviceMojit.tab_serial.software.windows' );
            data.linuxI18n = i18n( 'DeviceMojit.tab_serial.software.linux' );
            data.commandLineI18n = i18n( 'DeviceMojit.tab_serial.software.commandLine' );
            data.localHostForDeviceServer = 'http://localhost:15150/log';
            var localIp = '127.0.0.1';
            data.isDeviceServerLocal = function( entry ) {
                return (entry && entry.ip) === localIp;
            };

            Promise.resolve( Y.doccirrus.jsonrpc.api.sdManager.getIpOfLocalConnection() )
                .then( function( res ) {
                    localIp = res.data;
                } )
                .catch( function( err ) {
                    Y.log( 'getIpOfLocalConnection: could not get IP of local connection: ' + err.stack || err, 'error', 'tab_serial.js' );
                } );

            Promise.resolve( Y.doccirrus.jsonrpc.api.sdManager.getDeviceServerNames() )
                .then( function( res ) {
                    data.dsNameList = res.data || [];
                } )
                .catch( function( err ) {
                    Y.log( 'getDeviceServerNames: error in retrieving dsNameList. Setting dsNameList to empty array: '+err.stack || err, 'error', 'tab_serial.js' );
                    data.dsNameList = [];
                })
                .then( function() {
                    ko.applyBindings( data, node.getDOMNode() );
                });
        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

        }
    };
};
