/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'DmpKhkModel', function( Y/*, NAME */ ) {
    'use strict';
    /**
     * @module DmpKhkModel
     */

    var
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,

        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @abstract
     * @class DmpKhkModel
     * @constructor
     * @extends DmpBaseModel
     */
    function DmpKhkModel( config ) {
        DmpKhkModel.superclass.constructor.call( this, config );
    }

    Y.extend( DmpKhkModel, KoViewModel.getConstructor( 'DmpBaseModel' ), {
        _runBoilerplate: function() {
            var
                self = this;

            DmpKhkModel.superclass._runBoilerplate.apply( this, arguments );

            // get the correct list
            self._boilerplate.dmpConcomitantDisease.list( Y.doccirrus.schemas.activity.types.DmpKhkConcomitantDisease_E.list );

        },
        initializer: function() {
            var
                self = this;
            self.initDmpKhkModel();
        },
        destructor: function() {
        },
        initDmpKhkModel: function() {
            var
                self = this;

            self.initLdlCholesterol();

            /**
             * validate those dependencies
             */
            self.addDisposable( ko.computed( function() {
                var
                    computedInitial = ko.computedContext.isInitial();

                unwrap( self.dmpLdlCholesterolValue );
                unwrap( self.dmpLdlCholesterolUnit );
                unwrap( self.dmpLdlCholesterolNotDetermined );

                ignoreDependencies( function() {
                    if( !computedInitial ) {
                        self.dmpLdlCholesterolValue.validate();
                        self.dmpLdlCholesterolUnit.validate();
                        self.dmpLdlCholesterolNotDetermined.validate();
                    }
                } );
            } ).extend( { rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT } ) );

        },
        initLdlCholesterol: function() {
            var
                self = this;

            // filter empty string value which is needed so we can reset the unit if dmpLdlCholesterolNotDetermined is checked
            self.dmpLdlCholesterolUnit.list( self.dmpLdlCholesterolUnit.list().filter( function( entry ) {
                return Boolean( entry.val );
            } ) );

            // set determined true
            self.addDisposable( ko.computed( function() {
                var
                    dmpLdlCholesterolValue = unwrap( self.dmpLdlCholesterolValue ),
                    dmpLdlCholesterolUnit = unwrap( self.dmpLdlCholesterolUnit );

                if( dmpLdlCholesterolValue && dmpLdlCholesterolUnit ) {
                    self.dmpLdlCholesterolNotDetermined( false );
                }
            } ) );

            // unset values for determined false
            self.addDisposable( ko.computed( function() {
                var
                    dmpLdlCholesterolNotDetermined = unwrap( self.dmpLdlCholesterolNotDetermined );

                if( dmpLdlCholesterolNotDetermined ) {
                    self.dmpLdlCholesterolValue( null );
                    self.dmpLdlCholesterolUnit( '' );
                }
            } ) );

        }
    }, {
        schemaName: 'v_dmpkhk',
        NAME: 'DmpKhkModel'
    } );
    KoViewModel.registerConstructor( DmpKhkModel );

}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'DmpBaseModel',
        'v_dmpkhk-schema'
    ]
} );