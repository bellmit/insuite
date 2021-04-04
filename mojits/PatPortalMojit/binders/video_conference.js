
/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, $ */
'use strict';

YUI.add( 'VideoConferenceBinder', function( Y, NAME ) {

    var
        commonData,
        i18n = Y.doccirrus.i18n,
        PRACTICE = i18n( 'PatPortalMojit.general.PRACTICE' ),
        APPOINTMENT = i18n( 'PatPortalMojit.general.APPOINTMENT' );

    function CommonData() {
        this.prac = '';
        this.practiceIsChecked = false;
        this.dropPracticeCheckedFlag = false;
        this.loadData();
    }

    CommonData.prototype = {
        loadData: function() {
            this.setPrac( Y.doccirrus.utils.localValueGet( 'prac' ) );
            this.setPracticeIsChecked( Y.doccirrus.utils.localValueGet( 'practiceIsChecked' ) );
        },
        setPracticeIsChecked: function( checked, userId ) {
            if( 'string' === typeof checked ) {
                checked = 'true' === checked;
            }
            this.practiceIsChecked = checked;
            Y.doccirrus.utils.localValueSet( 'practiceIsChecked', checked, userId );
        },
        setPrac: function( prac, userId ) {
            this.prac = prac;
            Y.doccirrus.utils.localValueSet( 'prac', prac || '', userId );
        },
        drop: function( userId ) {
            this.setPrac( '', userId );
            this.setPracticeIsChecked( false, userId );
        }
    };

    /**
     * Constructor for the VideoConferenceBinder class.
     * @module VideoConferenceBinder
     * @class VideoConferenceBinder
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[ NAME ] = {

        /** using client side Jade so we need to announce who we are. */
        jaderef: 'PatPortalMojit',

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function( mojitProxy ) {
            commonData = new CommonData();
            this.mojitProxy = mojitProxy;
            this.commonData = commonData;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function() {
            var navigation;
            navigation = new Y.doccirrus.nav.SubNavigationModel( 'mainVCNavigation', [
                { name: 'vc_practices_tab', url: '/inconference#/practices', title: PRACTICE, isActive: false },
                { name: 'vc_schedules_tab', url: '/inconference#/schedules', title: APPOINTMENT, isActive: false, isHidden: true },
                { name: 'vc_appointment_tab', url: '/inconference#/appointment', title: APPOINTMENT, isActive: false, isHidden: true }
            ], 'load', '#upperDiv', { jadeOptions: { binder: this } } );

            navigation.openInNewTab = function() {
                window.open( document.URL, '_blank' );
            };

            navigation.patientPortalTitleI18n = i18n( 'PatPortalMojit.general.PP_TITLE' );
            navigation.menuI18n = i18n( 'PatPortalMojit.general.MENU' );
            navigation.openInNewTabI18n = i18n( 'PatPortalMojit.general.NEW_TAB' );

            navigation.collapseNavigation = function() {
                $( '.navbar-collapse.collapse.navbar-ex1-collapse' ).collapse( 'hide' );
                return true;
            };
            ko.applyBindings( navigation, document.querySelector( '#mainVCNavigation' ) );
            ko.applyBindings( {
                poweredByI18n: i18n( 'PatPortalMojit.general.POWERED_BY' ),
                termsOfUseI18n: i18n( 'PatPortalMojit.general.TERMS_OF_USE' )
            }, document.querySelector( '#vcFooter' ) );

            Y.doccirrus.nav.mojit = this.jaderef;

            Y.doccirrus.nav.router = new Y.Router( {
                html5: false,
                root: '/inconference',
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow default vc route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            var
                                params = req.params;

                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                                commonData.setPracticeIsChecked( false );

                            }
                            /**
                             * need it to avoid dropping "practiceIsChecked" after page refresh
                             */
                            return Y.doccirrus.nav.router.save( '/practices' );
                        }
                    },
                    {
                        path: /^\/practices\/*([^\/]*)*$/, // /practices/:prac
                        callbacks: function( req ) {
                            var
                                params = req.params;

                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                                commonData.setPracticeIsChecked( false );
                                /**
                                 * need it to avoid dropping "practiceIsChecked" after page refresh
                                 */
                                return Y.doccirrus.nav.router.save( '/practices' );
                            }
                            if( Y.config.debug ) {
                                Y.log( 'Follow vc_practices_tab inconference route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainVCNavigation', 'vc_practices_tab' );
                        }
                    },
                    {
                        path: /^\/schedules\/*([^\/]*)*$/, // /schedules/:prac
                        callbacks: function( req ) {
                            var
                                params = req.params;
                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                                return Y.doccirrus.nav.router.save( '/schedules' );
                            }
                            if( Y.config.debug ) {
                                Y.log( 'Follow vc_schedules_tab inconference route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainVCNavigation', 'vc_schedules_tab' );

                        }
                    },
                    {
                        path: /^\/appointment\/*([^\/]*)*$/, // /appointment/:prac
                        callbacks: function( req ) {
                            var
                                params = req.params;


                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                                return Y.doccirrus.nav.router.save( '/appointment' );
                            }
                            if( Y.config.debug ) {
                                Y.log( 'Follow appointment_tab inconference route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainVCNavigation', 'vc_appointment_tab' );
                        }
                    }
                ]
            } );

            //  Set the default hash fragment, or action the route if one is given
            var routeTo = location.href.split( 'inconference#' );
            routeTo = ( routeTo.length < 2) ? '/' : routeTo[ 1 ];

            Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
            Y.doccirrus.nav.router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = Y.doccirrus.nav.router.getPath();
            Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );

        }
    };

}, '0.0.1', {
    requires: [
        'doccirrus',
        'JsonRpcReflection-doccirrus',
        'router',
        'dcsubviewmodel',
        'dcnavigation',
        'event-mouseenter',
        'mojito-client',
        'json',
        'model-sync-rest',
        'intl',
        'mojito-intl-addon',
        'dcvalidations',
        'dcauthpub',

        'KoUI-all',
        'ko-bindingHandlers',
        'KoViewModel',
        'DCAppointmentBookingModal',
        'dcblindproxy',
        'ContactModel',
        'WeeklyTimeModel',

        'dcauth',
        'dc-comctl',
        'dcutils',
        'dccommonutils'
    ]
} );
