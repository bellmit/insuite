/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    return {

        registerNode: function( node ) {

            function switchCardreader() {
                Y.mojito.binders.DeviceNavigationBinderIndex.handleCrSwitch();
            }

            var pageData = Y.doccirrus.utils.getMojitBinderByType( 'DeviceMojit' ).mojitProxy.pageData.get( 'tab_cardreader' );

            pageData.switchCardreader = switchCardreader;

            var data = Y.mix( {
                    registerConnectionUrl: Y.Lang.sub( 'http://localhost:8888/cardreader/register?ips={ips}&protocol={protocol}&port={port}&tenant={tenant}&noRedirect=1', pageData )
                }, pageData );
            
            ko.applyBindings( data, node.getDOMNode() );
        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

        }
    };
};