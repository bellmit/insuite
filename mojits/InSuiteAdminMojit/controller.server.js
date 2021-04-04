/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'InSuiteAdminMojit', function( Y, NAME ) {
    

    /**
     * The InSuiteAdminMojit module.
     *
     * @module InSuiteAdminMojit
     */

    function initInSuiteAdmin(ac, meta) {

        let request = ac.http.getRequest(),
            catalogDescriptors,
            countryCode,
            pucUrl, replOn;

        if( !Y.doccirrus.auth.hasSectionAccess( request && request.user, 'InSuiteAdminMojit.insuiteadmin' ) ) {
            Y.log( 'No admin account... aborting' );
            Y.doccirrus.utils.redirect( '/', ac );
        }
        else {
            pucUrl = Y.doccirrus.auth.getPUCUrl( '/inconference?prac=' );
            countryCode = Y.doccirrus.auth.getCountryCode( request.user );
            catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors(
                {
                    actType: '',
                    country: countryCode || 'D'
                } );

            // MOJ-3453: if country has no catalogs fall back to german catalogs
            if( Y.Object.isEmpty( catalogDescriptors ) ) {
                catalogDescriptors = Y.doccirrus.api.catalog.getFrontendCatalogDescriptors( {
                    actType: '',
                    country: 'D'
                } );
            }

            ac.pageData.set( 'catalog-descriptors', catalogDescriptors );
            ac.pageData.set( 'pucUrl', pucUrl );
            replOn = Y.doccirrus.mongodb.isReplOn();

            if (Y.doccirrus.auth.isISD()) {
                ac.assets.addCss('./css/InSuiteAdminMojitISD.css');
            }
            ac.assets.addCss('./css/InSuiteAdminMojit.css');

            //  for drag and drop assignment of forms to printers
            ac.assets.addCss('/static/FormEditorMojit/assets/css/jquery-sortable.css');
            ac.assets.addJs('/static/FormEditorMojit/assets/js/jquery-sortable.js');

            if (replOn) {
                Y.doccirrus.mongodb.getReplstats((err,res)=>{
                    if (err) {
                        Y.log("error fetching replset data:", "warn", NAME);
                        Y.log(err, "warn", NAME);
                    }

                    Y.log(`initInSuiteAdmin. getReplstats result: ${JSON.stringify(res)}`, "debug", NAME);

                    if (res) {
                        if (res.date) {
                            res.date = res.date.toString();
                        }
                        if (res.members) {
                            res.members.forEach(e=>{
                                if (e.optimeDate) {
                                    e.optimeDate = e.optimeDate.toString();
                                }
                                if (0 === e.uptime) {
                                    e.optimeDate="";
                                    e.lag="";
                                    e.pingMs="";
                                }
                            });
                        }
                    }

                    ac.pageData.set( 'tab_database', {
                        replOn: replOn,
                        replData: res||{}
                    });
                    ac.done( {}, meta );
                });
            } else {
                ac.pageData.set( 'tab_database', {
                    replOn: replOn,
                    replData: {}
                });
                ac.done( {}, meta );
            }
        }

            ac.assets.addJs('/static/MISMojit/assets/js/xterm.js','top');
            ac.assets.addCss('/static/MISMojit/assets/css/xterm.css');
            ac.assets.addJs('/static/MISMojit/assets/js/addons/fit/fit.js', 'top');
    }

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace( 'mojito.controllers' )[NAME] = {

        /**
         * @param {Object} ac The ActionContext that provides access to the Mojito API.
         */
        insuiteadmin: function( ac ) {
            initInSuiteAdmin(ac, {http: {}, isd: Y.doccirrus.auth.isISD(), title: Y.doccirrus.i18n('general.PAGE_TITLE.CONFIGURATION')});
        },

        contactsNav: function( ac ) {
            var
                meta = {http: {}/*, view:{id:'InSuiteAdminMojitBinder'}*/};
            ac.done( {}, meta );
        }
    };

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-http-addon',
        'mojito-assets-addon',
        'mojito-params-addon',
        'mojito-data-addon',
        'dcauth',
        'catalog-api'
    ]
} );
