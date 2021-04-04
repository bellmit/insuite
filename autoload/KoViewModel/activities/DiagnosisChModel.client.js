/*global YUI, ko  */

'use strict';

YUI.add( 'DiagnosisChModel', function( Y/*, NAME */) {
        /**
         * @module DiagnosisChModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            CatalogBasedActivityModel = KoViewModel.getConstructor( 'CatalogBasedActivityModel' ),
            ignoreDependencies = ko.ignoreDependencies,
            unwrap = ko.unwrap;

        /**
         * @class DiagnosisChModel
         * @constructor
         * @extends CatalogBasedActivityModel
         */
        function DiagnosisChModel( config ) {
            DiagnosisChModel.superclass.constructor.call( this, config );
        }

        DiagnosisChModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( DiagnosisChModel, CatalogBasedActivityModel, {

                initializer: function DiagnosisChModel_initializer() {
                    var
                        self = this;
                    self.initDiagnosisChModel();
                },
                destructor: function DiagnosisChModel_destructor() {
                },
                initDiagnosisChModel: function DiagnosisChModel_initDiagnosisChModel() {
                    var
                        self = this;
                    // TODO: KBV Q1 2020 - remove UUU stuff after Q4 2019 invoicing is done
                    /**
                     * validate those dependencies
                     */
                    self.addDisposable( ko.computed( function() {
                        var
                            code = unwrap( self.code ),
                            computedInitial = ko.computedContext.isInitial();

                        ignoreDependencies( function() {
                            if( !computedInitial ) {
                                if( 'UUU' === code ) {
                                    self.diagnosisSite( '' );
                                }
                                self.updateReadOnly();
                            }

                        } );
                    } ).extend( { rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT } ) );

                }
            },
            {
                schemaName: 'v_diagnosis_ch',
                NAME: 'DiagnosisChModel'
            }
        );
        KoViewModel.registerConstructor( DiagnosisChModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedActivityModel',
            'v_diagnosis_ch-schema'
        ]
    }
)
;