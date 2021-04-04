/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'DmpAsthmaModel', function( Y/*, NAME */ ) {
    'use strict';
    /**
     * @module DmpAsthmaModel
     */

    var
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,

        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @abstract
     * @class DmpAsthmaModel
     * @constructor
     * @extends DmpBaseModel
     */
    function DmpAsthmaModel( config ) {
        DmpAsthmaModel.superclass.constructor.call( this, config );
    }

    Y.extend( DmpAsthmaModel, KoViewModel.getConstructor( 'DmpBaseModel' ), {
        _runBoilerplate: function() {
            var
                self = this;

            DmpAsthmaModel.superclass._runBoilerplate.apply( this, arguments );

            // get the correct list
            self._boilerplate.dmpConcomitantDisease.list( Y.doccirrus.schemas.activity.types.DmpAsthmaConcomitantDisease_E.list );

        },
        initializer: function() {
            var
                self = this;
            self.initDmpAsthmaModel();
        },
        destructor: function() {
        },
        initDmpAsthmaModel: function() {
            var
                self = this;

            self.initCurrentPeakFlowValue();

            /**
             * validate those dependencies
             */
            self.addDisposable( ko.computed( function() {
                var
                    computedInitial = ko.computedContext.isInitial();

                unwrap( self.dmpCurrentPeakFlowValue );
                unwrap( self.dmpCurrentPeakFlowValueNotDone );

                ignoreDependencies( function() {
                    if( !computedInitial ) {
                        self.dmpCurrentPeakFlowValue.validate();
                        self.dmpCurrentPeakFlowValueNotDone.validate();
                    }
                } );
            } ).extend( { rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT } ) );

        },
        initCurrentPeakFlowValue: function() {
            var
                self = this;

            // set done true
            self.addDisposable( ko.computed( function() {
                var
                    dmpCurrentPeakFlowValue = unwrap( self.dmpCurrentPeakFlowValue );

                if( dmpCurrentPeakFlowValue ) {
                    self.dmpCurrentPeakFlowValueNotDone( false );
                }
            } ) );

            // unset values for done false
            self.addDisposable( ko.computed( function() {
                var
                    dmpCurrentPeakFlowValueNotDone = unwrap( self.dmpCurrentPeakFlowValueNotDone ),
                    dmpCurrentPeakFlowValueDefault = self.get( 'defaults.dmpCurrentPeakFlowValue' );

                if( dmpCurrentPeakFlowValueNotDone ) {
                    self.dmpCurrentPeakFlowValue( dmpCurrentPeakFlowValueDefault );
                }
            } ) );

        }
    }, {
        schemaName: 'v_dmpasthma',
        NAME: 'DmpAsthmaModel'
    } );
    KoViewModel.registerConstructor( DmpAsthmaModel );

}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'DmpBaseModel',
        'v_dmpasthma-schema',
        'activity-schema'
    ]
} );