/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'DmpBaseModel', function( Y/*, NAME */ ) {
    'use strict';
    /**
     * @module DmpBaseModel
     */

    var
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,

        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @abstract
     * @class DmpBaseModel
     * @constructor
     * @extends SimpleActivity
     */
    function DmpBaseModel( config ) {
        DmpBaseModel.superclass.constructor.call( this, config );
    }

    DmpBaseModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };
    Y.extend( DmpBaseModel, KoViewModel.getConstructor( 'SimpleActivityModel' ), {
        initializer: function() {
            var
                self = this;
            self.initDmpBaseModel();
        },
        destructor: function() {
        },
        initDmpBaseModel: function() {
            var
                self = this;

            /**
             * validate those dependencies
             */
            self.addDisposable( ko.computed( function() {
                var
                    computedInitial = ko.computedContext.isInitial();

                unwrap( self.dmpType );

                ignoreDependencies( function() {
                    if( !computedInitial ) {
                        self.revalidate();
                    }
                } );
            } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );

        },
        _runBoilerplate: function() {
            var self = this,
                schema = Y.doccirrus.schemas.activity.schema;

            DmpBaseModel.superclass._runBoilerplate.apply( self, arguments );

            Object.keys( schema ).forEach( function( key ) {

                var propertyName = key,
                    property = schema[key];

                if( !self._boilerplate[propertyName] ) {
                    return;
                }

                if( property && property.hint ) {
                    self._boilerplate[propertyName].hint = property.hint;
                    self._boilerplate[propertyName].hintLevel = property.hintLevel;
                }

            } );

        }
    }, {
        NAME: 'DmpBaseModel'
    } );
    KoViewModel.registerConstructor( DmpBaseModel );

}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'SimpleActivityModel'
    ]
} );