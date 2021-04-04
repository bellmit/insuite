/**
 * User: pi
 * Date: 13/05/15  16:18
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
'use strict';

YUI.add( 'CRMNavigationBinderIndex', function( Y, NAME ) {

    var i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        TAB_DELETED = i18n('CRMMojit.crm_navJS.title.TAB_DELETED' ),
        TAB_RELEASE = i18n('CRMMojit.crm_navJS.title.TAB_RELEASE' ),
        TAB_COMPANIES_TRIAL = i18n('CRMMojit.crm_navJS.title.TAB_COMPANIES_TRIAL' ),
        TAB_COMPANIES_PRC = i18n('CRMMojit.crm_navJS.title.TAB_COMPANIES_PRC' ),
        TAB_COMPANIES_ISD = i18n('CRMMojit.crm_navJS.title.TAB_COMPANIES_ISD' ),
        TAB_PATIENTS = i18n('CRMMojit.crm_navJS.title.TAB_PATIENTS' ),
        TAB_CONTACTS = i18n('CRMMojit.crm_navJS.title.TAB_CONTACTS' ),
        TAB_COMPANY_BROWSER = i18n('CRMMojit.crm_navJS.title.TAB_COMPANY_BROWSER' );

    /**
     * Constructor for the CRMNavigationBinderIndex class.
     * @module CRMNavigationBinderIndex
     * @class CRMNavigationBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[NAME] = {

        /** using client side Jade so we need to announce who we are. */
        jaderef: 'CRMMojit',

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
            this.checkFlag = true;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function() {
            Y.doccirrus.NavBarHeader.setActiveEntry( 'crm' );

            var
                self = this,
                rootPath = Y.doccirrus.utils.getUrl( 'crm' ),
                router,
                crmNav,
                crm_company_browser_tab,
                crm_contact_browser_tab,
                pageData = {};

            Y.doccirrus.catalogmap.init( this.mojitProxy.pageData.get( 'catalog-descriptors' ) );

            function handleTab(tabName, callback) {
                var node = document.querySelector( "#upperDiv" );
                if( node ) {
                    ko.cleanNode( node );
                }
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    tabName,
                    self.jaderef,
                    { pageData: pageData },
                    Y.one( node ),
                    function(){
                        var tab = crmNav.getItemByName(tabName);
                        if (tab) {
                            tab.active(true);
                        }
                        if (callback) {
                            callback.apply(undefined, arguments);
                        }
                    }
                );
            }

            if( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isDCPRC() ) {
                crmNav = KoComponentManager.createComponent( {
                    componentType: 'KoNav',
                    componentConfig: {
                        items: [
                            {
                                name: 'crm_companies_tab_trial',
                                href: rootPath + '#/companies_tab_trial',
                                text: TAB_COMPANIES_TRIAL
                            },
                            {
                                name: 'crm_companies_tab_prc',
                                href: rootPath + '#/companies_tab_prc',
                                text: TAB_COMPANIES_PRC
                            },
                            {
                                name: 'crm_companies_tab_isd',
                                href: rootPath + '#/companies_tab_isd',
                                text: TAB_COMPANIES_ISD
                            },
                            {
                                name: 'crm_company_browser_tab',
                                href: rootPath + '#/company_tab',
                                text: TAB_COMPANY_BROWSER,
                                visible: false
                            },
                            {
                                name: 'crm_contact_browser_tab',
                                href: rootPath + '#/contact_tab',
                                text: TAB_COMPANY_BROWSER,
                                visible: false
                            },
                            {
                                name: 'crm_patients_tab',
                                href: rootPath + '#/patients_tab',
                                text: TAB_PATIENTS
                            },
                            {
                                name: 'crm_centralContacts_tab',
                                href: rootPath + '#/centralcontacts_tab',
                                text: TAB_CONTACTS
                            },
                            {
                                name: 'crm_deleted_tab',
                                href: rootPath + '#/deleted_tab',
                                text: TAB_DELETED
                            },
                            {
                                name: 'crm_release_group_tab',
                                href: rootPath + '#/release_tab',
                                text: TAB_RELEASE
                            }
                        ]
                    }
                } );
            } else {
                crmNav = KoComponentManager.createComponent( {
                    componentType: 'KoNav',
                    componentConfig: {
                        items: [
                            {
                                name: 'crm_companies_tab_trial',
                                href: rootPath + '#/companies_tab_trial',
                                text: TAB_COMPANIES_TRIAL
                            },
                            {
                                name: 'crm_company_browser_tab',
                                href: rootPath + '#/company_tab',
                                text: TAB_COMPANY_BROWSER,
                                visible: false
                            }
                        ]
                    }
                } );
            }

            crm_company_browser_tab = crmNav.getItemByName('crm_company_browser_tab');
            crm_contact_browser_tab = crmNav.getItemByName('crm_contact_browser_tab');

            ko.applyBindings( crmNav, document.querySelector( '#crmNav' ) );

            router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow default crm route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'crm_companies_tab_trial' );
                            crm_company_browser_tab.visible( false );
                            if( crm_contact_browser_tab ) {
                                crm_contact_browser_tab.visible( false );
                            }
                        }
                    },
                    {
                        path: '/companies_tab_trial',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow crm_companies_tab_trial crm route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'crm_companies_tab_trial' );
                            crm_company_browser_tab.visible( false );
                            if( crm_contact_browser_tab ) {
                                crm_contact_browser_tab.visible( false );
                            }
                        }
                    },
                    {
                        path: '/companies_tab_prc',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow crm_companies_tab_prc crm route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'crm_companies_tab_prc' );
                            crm_company_browser_tab.visible( false );
                            crm_contact_browser_tab.visible( false );
                        }
                    },
                    {
                        path: '/companies_tab_isd',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow crm_companies_tab_isd crm route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'crm_companies_tab_isd' );
                            crm_company_browser_tab.visible( false );
                            crm_contact_browser_tab.visible( false );
                        }
                    },
                    {
                        path: '/patients_tab',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow crm_patients_tab crm route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'crm_patients_tab' );
                            crm_company_browser_tab.visible( false );
                            crm_contact_browser_tab.visible( false );
                        }
                    },
                    {
                        path: '/patients_tab/:id',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow crm_patients_tab crm route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            crm_company_browser_tab.visible( false );
                            crm_contact_browser_tab.visible( false );
                            pageData.patientToDeleteId = req.params.id;
                            handleTab( 'crm_patients_tab' );
                        }
                    },
                    {
                        path: '/centralcontacts_tab',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow crm_centralContacts_tab crm route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'crm_centralContacts_tab' );
                            crm_company_browser_tab.visible( false );
                            crm_contact_browser_tab.visible( false );
                        }
                    },
                    {
                        path: '/company_tab/:id',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow crm_company_browser_tab crm route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            crm_company_browser_tab.visible( true );
                            if( crm_contact_browser_tab ) {
                                crm_contact_browser_tab.visible( false );
                            }
                            pageData.companyId = req.params.id;
                            handleTab( 'crm_company_browser_tab');

                        }
                    },
                    {
                        path: '/contact_tab/:id',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow crm_contact_browser_tab crm route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            crm_company_browser_tab.visible( false );
                            crm_contact_browser_tab.visible( true );
                            pageData.contactId = req.params.id;
                            handleTab( 'crm_contact_browser_tab');

                        }
                    },
                    {
                        path: '/deleted_tab',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow crm_deleted_tab crm route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'crm_deleted_tab' );
                            crm_company_browser_tab.visible( false );
                            crm_contact_browser_tab.visible( false );

                        }
                    },
                    {
                        path: '/release_tab',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow crm_release_group_tab crm route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( 'crm_release_group_tab' );
                            crm_company_browser_tab.visible( false );
                            crm_contact_browser_tab.visible( false );

                        }
                    }
                ]
            } );

            //  Set the default hash fragment, or action the route if one is given
            var routeTo = location.href.split( 'crm#' );
            routeTo = ( routeTo.length < 2) ? '/' : routeTo[1];

            Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
            router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = router.getPath();
            Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );

        }
    };

}, '0.0.1', {requires: [
    'NavBarHeader',
    'JsonRpcReflection-doccirrus',
    'router',
    'dcsubviewmodel',
    'dcquery',
    'KoSchemaValue',
    'DCRouter',
    'event-mouseenter',
    'mojito-client',
    'json',
    'model-sync-rest',
    'intl',
    'mojito-intl-addon',
    'dccatalogmap',
    'company-schema',
    'v_supportcontact-schema',
    'KoUI-all',
    'DCTrialDaysModal',
    'DCCreateTenantModal',
    'ko-bindingHandlers',
    'CompanyModel',
    'ContactModel',
    'SupportBaseContactModel'

]} );
