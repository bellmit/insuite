/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
/*exported fun */
fun = function _fn( Y ) {
    'use strict';

    var KoViewModel = Y.doccirrus.KoViewModel,
        PredefinedReportsViewModel = KoViewModel.getConstructor( 'PredefinedReportsViewModel' );

    function reports_registerNode( node/*, someKey, jadeData*/ ) {

        var aReportsViewModel = new PredefinedReportsViewModel({
            containerName: 'invoiceReports',
            origin: 'INVOICE'
        });

        aReportsViewModel.set( 'node', node.getDOMNode() );
        ko.applyBindings( aReportsViewModel, node.getDOMNode() );

    }

    function reports_deregisterNode( /*node, someKey, jadeData*/ ) {
    }

    return {
        registerNode: reports_registerNode,
        deregisterNode: reports_deregisterNode
    };
};