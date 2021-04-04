/**
 * User: do
 * Date: 23.10.18  13:19
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'InsuranceGroupPriceModel', function( Y/*, NAME*/ ) {
        /**
         * @module InsuranceGroupPriceModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class InsuranceGroupPriceModel
         * @constructor
         * @extends KoViewModel
         */
        function InsuranceGroupPriceModel( config ) {
            InsuranceGroupPriceModel.superclass.constructor.call( this, config );
        }

        InsuranceGroupPriceModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( InsuranceGroupPriceModel, KoViewModel.getBase(), {

                initializer: function InsuranceGroupPriceModel_initializer() {
                    var
                        self = this;
                    self.initInsuranceGroupPriceModel();
                },
                destructor: function InsuranceGroupPriceModel_destructor() {
                },
                initInsuranceGroupPriceModel: function InsuranceGroupPriceModel_initInsuranceGroupPriceModel() {
                    var self = this;
                    self.displayPrice = ko.computed( Y.doccirrus.comctl.simpleHelperPriceComputed( self.price, {allowEmpty: true} ) );
                    self.displayPrice.hasError = self.price.hasError;
                    self.displayPrice.validationMessages = self.price.validationMessages;
                    self.displayPrice.i18n = self.price.i18n;
                }
            },
            {
                schemaName: 'kbvutilityprice.prices',
                NAME: 'InsuranceGroupPriceModel'
            }
        );
        KoViewModel.registerConstructor( InsuranceGroupPriceModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'kbvutilityprice-schema',
            'dccommonerrors'
        ]
    }
);