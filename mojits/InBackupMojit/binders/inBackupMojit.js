/*global YUI, ko */
YUI.add( 'InBackupMojitBinder', function( Y, NAME ) {
    'use strict';
    var
         /*peek = ko.utils.peekObservable,
         ignoreDependencies = ko.ignoreDependencies,
         unwrap = ko.unwrap,*/

        catchUnhandled = Y.doccirrus.promise.catchUnhandled,

        KoViewModel = Y.doccirrus.KoViewModel,
        InBackupViewModel = KoViewModel.getConstructor( 'InBackupViewModel' );

    /**
     * @class InBackupMojitBinder
     * @extends Y.doccirrus.DCBinder
     * @constructor
     */
    function InBackupMojitBinder() {
        InBackupMojitBinder.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InBackupMojitBinder, Y.doccirrus.DCBinder, {
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
            Y.doccirrus.NavBarHeader.setActiveEntry( 'inbackup' );
        },
        /** @private */
        _initObservables: function() {
            var
                self = this;

            self.route = ko.observable();
            self.inBackupViewModel = ko.observable();
        },
        /** @protected */
        setupNavigation: function() {
        },
        /** @protected */
        setupRouter: function() {
            var
                self = this,
                router = self.get( 'router' );

            router.set( 'root', Y.doccirrus.utils.getUrl( 'inbackup' ) );
            router.set( 'routes', [
                {
                    routeId: 'inbackup',
                    path: '/',
                    callbacks: Y.bind( self._route_inbackup, self )
                }
            ] );

        },
        /** @private */
        _route_inbackup: function( request/*, response, next*/ ) {
            var
                self = this;

            self.showLoadingMask();

            Promise
                .props( {
                    templateInBackupViewModel: self.useTemplate( {
                        name: 'InBackupViewModel',
                        path: 'InBackupMojit/views/InBackupViewModel'
                    } )
                } )
                .then( function() {

                    self.route( request );
                    self.inBackupViewModel( new InBackupViewModel() );
                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );
            self.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;
        }
    }, {
        ATTR: {}
    } );

    Y.namespace( 'mojito.binders' )[NAME] = new InBackupMojitBinder( {
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

        'InBackupViewModel'
    ]
} );
