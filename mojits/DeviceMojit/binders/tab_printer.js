/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
'use strict';
fun = function _fn( Y/*, NAME*/ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n;

    return {

        registerNode: function( node ) {
            var
                data = new KoViewModel.createViewModel( {
                    config: {
                        data: {
                            allPrintersShared: ko.observable(),
                            allPrintersSharedI18n: i18n( 'DeviceMojit.tab_printer.title.ALL_PRINTERS_SHARED' ),
                            ip: Y.doccirrus.infras.getPrivateURL( 'cups' )
                        }
                    }
                } );

            Y.doccirrus.jsonrpc.api.admin.read( {
                    query: { _id: '000000000000000000000001' }
                }
            ).then( function( response ) {
                if( response && response.data && response.data[0] && response.data[0].allPrintersShared ) {
                    data.initialConfig.data.allPrintersShared( response.data[0].allPrintersShared );
                }
            } ).always( function() {
                ko.applyBindings( data.initialConfig.data, node.getDOMNode() );
            } );

            data.addDisposable( ko.computed( function() {
                data.initialConfig.data.allPrintersShared();

                Y.doccirrus.jsonrpc.api.device.shareAllPrinters( {
                    data: {
                        allPrintersShared: data.initialConfig.data.allPrintersShared()
                    }
                } );

            } ) );

        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

        }
    };
};
