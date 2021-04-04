/**
 * User: pi
 * Date: 06/11/15  14:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, $ */
'use strict';

YUI.add( 'IntimeNavigationBinderIndex', function( Y, NAME ) {

    var
        commonData;

    function CommonData() {
        this.prac = '';
        this.number = '';
        this.prevPage = '';
        this.practiceIsChecked = false;
        this.dropPracticeCheckedFlag = false;
        this.loadData();
    }

    CommonData.prototype = {
        loadData: function() {
            this.setPrac( Y.doccirrus.utils.localValueGet( 'prac' ) );
            this.setNumber( Y.doccirrus.utils.localValueGet( 'number' ) );
            this.setPrevPage( '' );
            this.setPracticeIsChecked( Y.doccirrus.utils.localValueGet( 'practiceIsChecked' ) );

        },
        getPrevPage: function(){
            this.setPrevPage( Y.doccirrus.utils.localValueGet( 'portalPrevPage' ) );
            return this.prevPage;
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
        setNumber: function( number, userId ) {
            this.number = number;
            Y.doccirrus.utils.localValueSet( 'number', number || '', userId );
        },
        setPrevPage: function( page, userId ) {
            this.prevPage = page;
            Y.doccirrus.utils.localValueSet( 'portalPrevPage', page, userId );
        },
        drop: function( userId ) {
            this.setPrac( '', userId );
            this.setNumber( '', userId );
            this.setPrevPage( '', userId );
            this.setPracticeIsChecked( false, userId );
        }
    };

    function isUserLoggedIn(){
        var
            user = Y.doccirrus.auth.getPatientPortalUser();
        return user && user.patientLoggedIn;
    }

    /**
     * Constructor for the IntimeNavigationBinderIndex class.
     * @module IntimeNavigationBinderIndex
     * @class IntimeNavigationBinderIndex
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
            var navigation,
                adhocSupport,
                registrationSupport;
            navigation = new Y.doccirrus.nav.SubNavigationModel( 'mainIntimeNavigation', [
                { name: 'intime_waitingtime_tab', url: '/intime#/waitingtime', title: 'Wartezeit'},
                { name: 'intime_schedules_tab', url: '/intime#/schedules', title: 'Termine', isActive: false },
                { name: 'intime_practices_tab', url: '/intime#/practices', title: Y.doccirrus.i18n('PatPortalMojit.intime_practices_tab.text.TITLE'), isActive: false },
                { name: 'intime_documents_tab', url: '/intime#/documents', title: 'Dokumente', isActive: false },
                { name: 'intime_devices_tab', url: '/intime#/devices', title: 'Geräte', isActive: false },
                // {
                //     name: 'intime_transfer_tab',
                //     url: '/intime#/transfer',
                //     title: 'Transfer',
                //     isDisabled: true,
                //     isActive: false
                // },
                { name: 'intime_help_tab', url: 'https://www.doc-cirrus.com/de/gesundheitsportal-anleitung-fuer-patienten', title: 'Hilfe', isActive: false },
                { name: 'intime_account_tab', url: '/intime#/account', title: 'Konto', isActive: false },
                {
                    name: 'intime_appointment_tab',
                    url: '/intime#/appointment',
                    title: 'Appointment',
                    isActive: false,
                    isHidden: true
                },
                { name: 'intime_login_tab', url: '/intime#/login', title: 'Login', isActive: false, isHidden: true },
                {
                    name: 'intime_registration_tab',
                    url: '/intime#/registration',
                    title: 'Anmeldung',
                    isActive: false,
                    isHidden: true
                },
                {
                    name: '',
                    url: '/pplogout',
                    imgSrc: '/static/dcbaseapp/assets/img/doccirrus/exit.png',
                    title: '',
                    isActive: false,
                    isDisabled: !Y.doccirrus.auth.getUserId()
                }

            ], 'load', '#upperDiv', { jadeOptions: { binder: this } } );

            navigation.openInNewTab = function() {
                window.open( document.URL, '_blank' );
            };

            navigation.collapseNavigation = function() {
                $( '.navbar-collapse.collapse.navbar-ex1-collapse' ).collapse( 'hide' );
                return true;
            };
            navigation.setDisabledAll = function( stat ) {
                var
                    elements = ko.utils.peekObservable( navigation.elements );
                elements.forEach( function( element ) {
                    if( !ko.utils.peekObservable( element.isHidden ) ) {
                        if( '/pplogout' === ko.utils.peekObservable( element.url ) ) {
                            element.isDisabled( stat || !Y.doccirrus.auth.getUserId() );
                        } else {
                            element.isDisabled( stat );
                        }

                    }
                } );
            };
            ko.applyBindings( navigation, document.querySelector( '#mainIntimeNavigation' ) );

            Y.doccirrus.nav.mojit = this.jaderef;

            Y.doccirrus.nav.router = new Y.Router( {
                html5: false,
                root: '/intime',
                routes: [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow default intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.router.save( '/waitingtime' );
                        }
                    },
                    {
                        path: /^\/waitingtime\/*([^\/]*)*\/*([^\/]*)*$/, // /waitingtime/:prac/:number
                        callbacks: function( req ) {
                            if( req.params[ 1 ] ) { // if at least 1 params is set
                                commonData.setPrac( req.params[ 1 ] );
                                commonData.setNumber( req.params[ 2 ] );
                            }
                            if( Y.config.debug ) {
                                Y.log( 'Follow default waitingtime_tab route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainIntimeNavigation', 'intime_waitingtime_tab' );

                        }
                    },
                    {
                        path: /^\/schedules\/*([^\/]*)*$/, // /schedules/:prac
                        callbacks: function( req ) {
                            var
                                params = req.params;
                            if( !isUserLoggedIn() ) {
                                return Y.doccirrus.nav.router.save( '/login' );
                            }
                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                                return Y.doccirrus.nav.router.save( '/schedules' );
                            }
                            if( Y.config.debug ) {
                                Y.log( 'Follow schedules_tab intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainIntimeNavigation', 'intime_schedules_tab' );

                        }
                    },
                    {
                        path: /^\/appointment\/*([^\/]*)*$/, // /appointment/:prac
                        callbacks: function( req ) {
                            var
                                params = req.params;

                            if( !isUserLoggedIn() ) {
                                return Y.doccirrus.nav.router.save( '/login' );
                            }
                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                                return Y.doccirrus.nav.router.save( '/appointment' );
                            }
                            if( Y.config.debug ) {
                                Y.log( 'Follow practices_tab intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainIntimeNavigation', 'intime_appointment_tab' );
                        }
                    },
                    {
                        path: /^\/practices\/*([^\/]*)*$/, // /practices/:prac
                        callbacks: function( req ) {
                            var
                                params = req.params;

                            if( !isUserLoggedIn() ) {
                                return Y.doccirrus.nav.router.save( '/login' );
                            }
                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                                commonData.setPracticeIsChecked( false );
                                /**
                                 * need it to avoid dropping "practiceIsChecked" after page refresh
                                 */
                                return Y.doccirrus.nav.router.save( '/practices' );
                            }
                            if( Y.config.debug ) {
                                Y.log( 'Follow practices_tab intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainIntimeNavigation', 'intime_practices_tab' );
                        }
                    },
                    {
                        path: /^\/documents\/*([^\/]*)*$/, // /documents/:prac
                        callbacks: function( req ) {
                            var
                                params = req.params;

                            if( !isUserLoggedIn() ) {
                                return Y.doccirrus.nav.router.save( '/login' );
                            }
                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                                return Y.doccirrus.nav.router.save( '/documents' );
                            }
                            if( Y.config.debug ) {
                                Y.log( 'Follow documents_tab intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainIntimeNavigation', 'intime_documents_tab' );

                        }
                    },
                    {
                        path: /^\/devices\/*([^\/]*)*$/, // /devices/:prac
                        callbacks: function( req ) {
                            var
                                params = req.params;

                            if( !isUserLoggedIn() ) {
                                return Y.doccirrus.nav.router.save( '/login' );
                            }
                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                                return Y.doccirrus.nav.router.save( '/devices' );

                            }
                            if( Y.config.debug ) {
                                Y.log( 'Follow devices_tab intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainIntimeNavigation', 'intime_devices_tab' );

                        }
                    },
                    // {
                    //     path: /^\/transfer\/*([^\/]*)*$/, // /transfer/:prac
                    //     callbacks: function( req ) {
                    //         var
                    //             params = req.params;
                    //
                    //         if( !isUserLoggedIn() ) {
                    //             return Y.doccirrus.nav.router.save( '/login' );
                    //         }
                    //         if( params[ 1 ] ) {
                    //             commonData.setPrac( params[ 1 ] );
                    //             return Y.doccirrus.nav.router.save( '/transfer' );
                    //         }
                    //         if( Y.config.debug ) {
                    //             Y.log( 'Follow transfer_tab intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                    //         }
                    //         Y.doccirrus.nav.activateElement( 'mainIntimeNavigation', 'intime_transfer_tab' );
                    //
                    //     }
                    // },
                    {
                        path: /^\/help\/*([^\/]*)*$/, // /help/:prac
                        callbacks: function( req ) {
                            var
                                params = req.params;

                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                                return Y.doccirrus.nav.router.save( '/help' );
                            }
                            if( Y.config.debug ) {
                                Y.log( 'Follow help_tab intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainIntimeNavigation', 'intime_help_tab' );

                        }
                    },
                    {
                        path: /^\/account\/*([^\/]*)*$/, // /account/:prac
                        callbacks: function( req ) {
                            var
                                params = req.params;

                            if( !isUserLoggedIn() ) {
                                return Y.doccirrus.nav.router.save( '/login' );
                            }
                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                                return Y.doccirrus.nav.router.save( '/account' );
                            }
                            if( Y.config.debug ) {
                                Y.log( 'Follow account_tab intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainIntimeNavigation', 'intime_account_tab' );

                        }
                    },
                    {
                        path: /^\/login\/?([^\/]*)\/?([^\/]*)\/?([^\/]*)$/, // /login/:prac/:adhocSupport/:registrationSupport
                        callbacks: function( req ) {
                            var
                                params = req.params;
                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                            }
                            commonData.adhocSupport = params[ 2 ] || adhocSupport || '';
                            commonData.registrationSupport = params[ 3 ] || registrationSupport || '';
                            if( Y.config.debug ) {
                                Y.log( 'Follow login_tab intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            navigation.setDisabledAll( false );
                            Y.doccirrus.nav.activateElement( 'mainIntimeNavigation', 'intime_login_tab' );
                        }
                    },
                    {
                        path: /logout/,
                        callbacks: function() {
                            Y.doccirrus.nav.router.save( '/login' );
                        }
                    },
                    {
                        path: '/registration/:patientregId',
                        callback: function( req ) {
                            navigation.setDisabledAll( true );
                            if( Y.config.debug ) {
                                Y.log( 'Follow registration_tab intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            Y.doccirrus.nav.activateElement( 'mainIntimeNavigation', 'intime_registration_tab', req.params );

                        }
                    },
                    {
                        path: /^\/frame_link\/?([^\/]*)\/?([^\/]*)\/?([^\/]*)$/,
                        callback: function( req ) {
                            var
                                params = req.params;
                            adhocSupport = params[ 2 ] || '';
                            registrationSupport = params[ 3 ] || '';
                            if( params[ 1 ] ) {
                                commonData.setPrac( params[ 1 ] );
                            }
                            commonData.dropPracticeCheckedFlag = true;
                            if( Y.config.debug ) {
                                Y.log( 'Follow frame_link intime route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }

                            if( Y.doccirrus.auth.isPatientLoggedIn() ) {
                                Y.doccirrus.nav.router.save( '/practices' );
                            }
                            else {
                                Y.doccirrus.nav.router.replace( '/login' );
                            }

                        }
                    }
                ]
            } );

            //  Set the default hash fragment, or action the route if one is given
            var routeTo = location.href.split( 'intime#' );
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
        'deviceconfiguration-schema',
        'DCJawboneData',
        'ContactModel',
        'WeeklyTimeModel',

        'activity-schema',
        'dcauth',
        'dc-comctl',
        'dcutils',
        'dccommonutils',
        'dcformloader',
        'dcmedia',

        //  audio record and playback in forms
        'FineViewModel',
        'microphoneinputmodal',
        'playaudiomodal'
    ]
} );
