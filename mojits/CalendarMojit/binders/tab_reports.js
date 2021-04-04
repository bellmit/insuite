/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
/*exported fun*/

fun = function _fn( Y ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        binder = Y.doccirrus.utils.getMojitBinderByType( 'CalendarMojit' ),
        binderViewModel = binder.binderViewModel,
        PredefinedReportsViewModel = KoViewModel.getConstructor( 'PredefinedReportsViewModel' ),
        aReportsViewModel = null;

    return {
        registerNode: function tab_reports_registerNode( node/*, someKey, jadeData*/ ) {

            aReportsViewModel = new PredefinedReportsViewModel({
                containerName: 'calendarReports',
                origin: 'CALENDAR'
            });

            aReportsViewModel.set( 'node', node.getDOMNode() );
            ko.applyBindings( aReportsViewModel, node.getDOMNode() );

            binderViewModel.currentView( aReportsViewModel );
        },
        deregisterNode: function tab_reports_deregisterNode( node/*, someKey, jadeData*/ ) {
            ko.cleanNode( node.getDOMNode() );

            //  clean up viewmodel, unsubscribe hotkeys, MOJ-7531
            aReportsViewModel.destroy();
        }
    };
};