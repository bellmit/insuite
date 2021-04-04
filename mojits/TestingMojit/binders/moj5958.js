/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'moj5958-binder-index', function( Y, NAME ) {
    'use strict';

    /**
     * @class Moj5958Binder
     * @extends Y.doccirrus.DCBinder
     * @constructor
     */
    function Moj5958Binder() {
        Moj5958Binder.superclass.constructor.apply( this, arguments );
    }

    Y.extend( Moj5958Binder, Y.doccirrus.DCBinder, {
        initializer: function() {
            var
                self = this;

            self.initDashboard();
            self.initDashboard2();
        },
        destructor: function() {
        },
        setupNavigation: function() {
            var
                self = this,
                navigation = self.get( 'navigation' );

            navigation.addItems( [
                {
                    text: 'Dashboard',
                    name: 'Dashboard',
                    href: '#/dashboard'
                },
                {
                    text: 'Dashboard2',
                    name: 'Dashboard2',
                    href: '#/dashboard2'
                },
                {
                    text: 'Something',
                    name: 'Something',
                    href: '#/something'
                },
                {
                    text: 'Anything',
                    name: 'Anything',
                    href: '#/anything'
                }
            ] );

        },
        setupRouter: function() {
            var
                self = this,
                router = self.get( 'router' );

            router.set( 'root', Y.doccirrus.utils.getUrl( 'moj5958' ) );
            router.set( 'routes', [
                {
                    routeId: 'dashboard',
                    path: '/',
                    callbacks: Y.bind( self.route_dashboard, self )
                },
                {
                    routeId: 'dashboard',
                    path: '/dashboard',
                    callbacks: Y.bind( self.route_dashboard, self )
                },
                {
                    routeId: 'dashboard2',
                    path: '/dashboard2',
                    callbacks: Y.bind( self.route_dashboard2, self )
                },
                {
                    routeId: 'something',
                    path: '/something',
                    callbacks: Y.bind( self.route_something, self )
                },
                {
                    routeId: 'anything',
                    path: '/anything',
                    callbacks: Y.bind( self.route_anything, self )
                }
            ] );
            self.route = ko.observable( null );

        },
        route_dashboard: function( request ) {
            var
                self = this;

            self.get( 'navigation' ).activateTab( 'Dashboard' );
            self.route( request.route.routeId );
        },
        route_dashboard2: function( request ) {
            var
                self = this;

            self.get( 'navigation' ).activateTab( 'Dashboard2' );
            self.route( request.route.routeId );
        },
        route_something: function( request ) {
            var
                self = this;

            self.get( 'navigation' ).activateTab( 'Something' );
            self.route( request.route.routeId );
        },
        route_anything: function( request ) {
            var
                self = this;

            self.get( 'navigation' ).activateTab( 'Anything' );
            self.route( request.route.routeId );
        },
        dashboard: null,
        initDashboard: function() {
            var
                self = this;

            self.dashboard = {
                environment: 'moj5958-dashboard',
                layoutList: Y.doccirrus.gadget.layouts.base.list, // use another list than the default one
                layoutTypes: Y.doccirrus.gadget.layouts.base.types // because list is expanded and not reduced
            };

        },
        dashboard2: null,
        initDashboard2: function() {
            var
                self = this;

            self.dashboard2 = {
                environment: 'moj5958-dashboard2',
                availableGadgetNamesToAdd: [// use other gadgets than the default ones
                    {val: 'ExampleEditableGadget', i18n: 'ExampleEditableGadget'}
                ]
            };

        }
    }, {} );

    Y.namespace( 'mojito.binders' )[NAME] = new Moj5958Binder( {
        binderName: NAME
    } );

}, '3.16.0', {
    requires: [
        'oop',
        'DCBinder',
        'Gadgets',

        'GadgetLayouts' // only needed because of other layoutList configured
    ]
} );
