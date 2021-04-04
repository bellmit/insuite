/**
 * User: pi
 * Date: 16/12/15  14:05
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'DiagnosisModel', function( Y/*, NAME */) {
        /**
         * @module DiagnosisModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            CatalogBasedActivityModel = KoViewModel.getConstructor( 'CatalogBasedActivityModel' ),
            ignoreDependencies = ko.ignoreDependencies,
            unwrap = ko.unwrap;

        /**
         * @class DiagnosisModel
         * @constructor
         * @extends CatalogBasedActivityModel
         */
        function DiagnosisModel( config ) {
            DiagnosisModel.superclass.constructor.call( this, config );
        }

        DiagnosisModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( DiagnosisModel, CatalogBasedActivityModel, {

                initializer: function DiagnosisModel_initializer() {
                    var
                        self = this;
                    self.initDiagnosisModel();
                },
                destructor: function DiagnosisModel_destructor() {
                },
                initDiagnosisModel: function DiagnosisModel_initDiagnosisModel() {
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
                schemaName: 'v_diagnosis',
                NAME: 'DiagnosisModel'
            }
        );
        KoViewModel.registerConstructor( DiagnosisModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedActivityModel',
            'v_diagnosis-schema'
        ]
    }
)
;