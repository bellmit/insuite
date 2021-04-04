/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'InsuranceStatusModel', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module InsuranceStatusModel
     */

    var
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * __ABSTRACT__
     *
     * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
     *
     * @class InsuranceStatusModel
     * @constructor
     * @extends KoViewModel
     */
    function InsuranceStatusModel( config ) {
        InsuranceStatusModel.superclass.constructor.call( this, config );
    }

    Y.extend( InsuranceStatusModel, KoViewModel.getBase(), {
        initializer: function InsuranceStatusModel_initializer() {
            var
                self = this;

            self.initInsuranceStatusModel();
        },
        destructor: function InsuranceStatusModel_destructor() {
        },
        initInsuranceStatusModel: function() {
            var
                self = this;

            self.initValidateDependencies();
        },
        initValidateDependencies: function() {
            var
                self = this;

            /**
             * validate those dependencies
             */

            self.addDisposable( ko.computed( function() {
                self.paidFree();
                self.paidFreeTo();
                self.paidFreeTo.validate();
            } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );
        }
    }, {
        schemaName: 'patient.insuranceStatus',
        NAME: 'InsuranceStatusModel'
    } );

    KoViewModel.registerConstructor( InsuranceStatusModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'patient-schema'
    ]
} );
