/**
 * User: do
 * Date: 21/04/15  16:16
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'DmpDm1Model', function( Y/*, NAME */ ) {
        'use strict';
        /**
         * @module DmpDm1Model
         */

        var
            unwrap = ko.unwrap,
            ignoreDependencies = ko.ignoreDependencies,

            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @abstract
         * @class DmpDm1Model
         * @constructor
         * @extends DmpBaseModel
         */
        function DmpDm1Model( config ) {
            DmpDm1Model.superclass.constructor.call( this, config );
        }

        Y.extend( DmpDm1Model, KoViewModel.getConstructor( 'DmpBaseModel' ), {
            _runBoilerplate: function() {
                var
                    self = this;

                DmpDm1Model.superclass._runBoilerplate.apply( this, arguments );

                // get the correct list
                self._boilerplate.dmpConcomitantDisease.list( Y.doccirrus.schemas.activity.types.DmpDmConcomitantDisease_E.list );

            },
            initializer: function() {
                var
                    self = this;
                self.initDmpDm1Model();
            },
            destructor: function() {
            },
            initDmpDm1Model: function() {
                var
                    self = this;

                /**
                 * validate those dependencies
                 */
                self.addDisposable( ko.computed( function() {
                    var
                        computedInitial = ko.computedContext.isInitial();

                    unwrap( self.dmpHbA1cUnit );

                    ignoreDependencies( function() {
                        if( !computedInitial ) {
                            self.dmpHbA1cValue.validate();
                        }
                    } );
                } ).extend( { rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT } ) );

                /**
                 * validate those dependencies
                 */
                self.addDisposable( ko.computed( function() {
                    var
                        computedInitial = ko.computedContext.isInitial();

                    unwrap( self.dmpEGFR );

                    ignoreDependencies( function() {
                        if( !computedInitial ) {
                            self.dmpEGFRNotDetermined.validate();
                        }
                    } );
                } ).extend( { rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT } ) );
            }
        }, {
            schemaName: 'v_dmpdm1',
            NAME: 'DmpDm1Model'
        } );
        KoViewModel.registerConstructor( DmpDm1Model );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'DmpBaseModel',
            'v_dmpdm1-schema'
        ]
    }
)
;