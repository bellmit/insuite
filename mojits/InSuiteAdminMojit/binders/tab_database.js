/*jslint anon:true, sloppy:true, moment:true*/
/*global fun:true,ko,$ */

fun = function _fn( Y ) {
    'use strict';
    var i18n = Y.doccirrus.i18n;
    
    return {
        registerNode: function( node ) {
            var data = Y.doccirrus.utils.getMojitBinderByType( 'InSuiteAdminMojit' ).mojitProxy.pageData.get( 'tab_database' );

            data.replHeaderWarningI18n = i18n('InSuiteAdminMojit.tab_database.replHeaderWarning');
            data.replHeaderI18n = i18n('InSuiteAdminMojit.tab_database.replHeader');
            data.norepI18n = i18n( 'InSuiteAdminMojit.tab_database.norep' );
            data.setDataSetDateI18n = i18n( 'InSuiteAdminMojit.tab_database.setDataSetDate' );
            data.setDataHealthI18n = i18n( 'InSuiteAdminMojit.tab_database.setDataHealth' );
            data.setDataNameI18n = i18n( 'InSuiteAdminMojit.tab_database.setDataName' );
            data.setDataStateI18n = i18n( 'InSuiteAdminMojit.tab_database.setDataState' );
            data.setDataOptimeDateI18n = i18n( 'InSuiteAdminMojit.tab_database.setDataOptimeDate' );
            data.setDataLagI18n = i18n( 'InSuiteAdminMojit.tab_database.setDataLag' );
            data.setDataPingI18n = i18n( 'InSuiteAdminMojit.tab_database.setDataPing' );
            data.mouseOverLagI18n = i18n( 'InSuiteAdminMojit.tab_database.mouseOverLag' );
            data.mouseOverHealthTitleI18n = i18n( 'InSuiteAdminMojit.tab_database.mouseOverHealthTitle' );
            data.mouseOverHealthI18n = i18n( 'InSuiteAdminMojit.tab_database.mouseOverHealth' );

            $('[data-toggle="popover"]').popover();
            
            ko.applyBindings( data, node.getDOMNode() );
        },

        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};
