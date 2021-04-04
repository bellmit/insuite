/*global YUI, ko */
YUI.add( 'PrinterMojitBinder', function( Y, NAME ) {
    'use strict';
    var
        /*i18n = Y.doccirrus.i18n,
         peek = ko.utils.peekObservable,
         ignoreDependencies = ko.ignoreDependencies,
         unwrap = ko.unwrap,*/

        catchUnhandled = Y.doccirrus.promise.catchUnhandled,

        KoViewModel = Y.doccirrus.KoViewModel,
        PrinterQueueViewModel = KoViewModel.getConstructor( 'PrinterQueueViewModel' );

    /**
     * @class PrinterMojitBinder
     * @extends Y.doccirrus.DCBinder
     * @constructor
     */
    function PrinterMojitBinder() {
        PrinterMojitBinder.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PrinterMojitBinder, Y.doccirrus.DCBinder, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initDcChangeTab();
            self._initObservables();
        },
        /** @private */
        destructor: function() {
        },
        /** @private */
        _initDcChangeTab: function() {
            Y.doccirrus.NavBarHeader.setActiveEntry( 'printer' );
        },
        /** @private */
        _initObservables: function() {
            var
                self = this;

            self.route = ko.observable();
            self.printerQueueViewModel = ko.observable();
        },
        /** @protected */
        setupNavigation: function() {
        },
        /** @protected */
        setupRouter: function() {
            var
                self = this,
                router = self.get( 'router' );

            router.set( 'root', Y.doccirrus.utils.getUrl( 'printer' ) );
            router.set( 'routes', [
                {
                    routeId: 'queue',
                    path: '/',
                    callbacks: Y.bind( self._route_queue, self )
                }
            ] );

        },
        /** @private */
        _route_queue: function( request/*, response, next*/ ) {
            var
                self = this;

            self.showLoadingMask();

            Promise
                .props( {
                    templatePrinterQueueViewModel: self.useTemplate( {
                        name: 'PrinterQueueViewModel',
                        path: 'PrinterMojit/views/PrinterQueueViewModel'
                    } )
                } )
                .then( function() {

                    self.route( request );
                    self.printerQueueViewModel( new PrinterQueueViewModel() );
                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );
        }
    }, {
        ATTR: {}
    } );

    Y.namespace( 'mojito.binders' )[NAME] = new PrinterMojitBinder( {
        binderName: NAME,
        initialData: {}
    } );

}, '0.0.1', {
    requires: [
        'oop',
        'mojito-client',

        'doccirrus',
        'promise',
        'DCBinder',
        'DCRouter',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',

        'NavBarHeader',

        'dcauth',
        'dcutils',

        'PrinterQueueViewModel'
    ]
} );
