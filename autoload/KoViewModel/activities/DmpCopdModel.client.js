/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'DmpCopdModel', function( Y/*, NAME */ ) {
    'use strict';
    /**
     * @module DmpCopdModel
     */

    var
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,

        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @abstract
     * @class DmpCopdModel
     * @constructor
     * @extends DmpBaseModel
     */
    function DmpCopdModel( config ) {
        DmpCopdModel.superclass.constructor.call( this, config );
    }

    Y.extend( DmpCopdModel, KoViewModel.getConstructor( 'DmpBaseModel' ), {
        _runBoilerplate: function() {
            var
                self = this;

            DmpCopdModel.superclass._runBoilerplate.apply( this, arguments );

            // get the correct list
            self._boilerplate.dmpConcomitantDisease.list( Y.doccirrus.schemas.activity.types.DmpCopdConcomitantDisease_E.list );

        },
        initializer: function() {
            var
                self = this;
            self.initDmpCopdModel();
        },
        destructor: function() {
        },
        initDmpCopdModel: function() {
            var
                self = this;

            self.initCurrentFev1();

            /**
             * validate those dependencies
             */
            self.addDisposable( ko.computed( function() {
                var
                    computedInitial = ko.computedContext.isInitial();

                unwrap( self.dmpCurrentFev1 );
                unwrap( self.dmpCurrentFev1NotDone );

                ignoreDependencies( function() {
                    if( !computedInitial ) {
                        self.dmpCurrentFev1.validate();
                        self.dmpCurrentFev1NotDone.validate();
                    }
                } );
            } ).extend( { rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT } ) );
            
        },
        initCurrentFev1: function(){
            var
                self = this;

            // set done true
            self.addDisposable( ko.computed( function() {
                var
                    dmpCurrentFev1 = unwrap( self.dmpCurrentFev1 );

                if( dmpCurrentFev1 ) {
                    self.dmpCurrentFev1NotDone( false );
                }
            } ) );

            // unset values for done false
            self.addDisposable( ko.computed( function() {
                var
                    dmpCurrentFev1NotDone = unwrap( self.dmpCurrentFev1NotDone ),
                    dmpCurrentFev1Default = self.get( 'defaults.dmpCurrentFev1' );

                if( dmpCurrentFev1NotDone ) {
                    self.dmpCurrentFev1( dmpCurrentFev1Default || null );
                }
            } ) );

        }
    }, {
        schemaName: 'v_dmpcopd',
        NAME: 'DmpCopdModel'
    } );
    KoViewModel.registerConstructor( DmpCopdModel );

}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'DmpBaseModel',
        'v_dmpcopd-schema'
    ]
} );