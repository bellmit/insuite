/**
 * User: pi
 * Date: 17/02/16  16:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'QuotationModel', function( Y/*, NAME */ ) {
        /**
         * @module QuotationModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' ),
            unwrap = ko.unwrap;

            /**
         * @class QuotationModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function QuotationModel( config ) {
            QuotationModel.superclass.constructor.call( this, config );
        }

        QuotationModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( QuotationModel, FormBasedActivityModel, {

                initializer: function QuotationModel_initializer() {
                    var
                        self = this;
                    self.initQuotationModel();
                },
                destructor: function QuotationModel_destructor() {
                },
                initQuotationModel: function QuotationModel_initQuotationModel() {
                    var self = this;

                    self.addDisposable( ko.computed( function() {
                        var
                            status = self.status(),
                            linkedActivities = self._activitiesObj(),
                            lastSchein = unwrap( self.get( 'lastScheinObservable' ) ) || {};

                        if( -1 === ['CREATED', 'VALID'].indexOf( status ) ) {
                            return;
                        }

                        Y.doccirrus.invoiceutils.calcInvoice( self, lastSchein, linkedActivities );
                    } ) );

                }
            },
            {
                schemaName: 'v_quotation',
                NAME: 'QuotationModel',
                getActualPrice: function( treatment ) {
                    if( 'GOÄ' === treatment.catalogShort && 'Punkte' === treatment.actualUnit ) {
                        return Y.doccirrus.comctl.dcMul( treatment.actualPrice, Y.doccirrus.schemas.activity.goaeInvoiceFactor );
                    }
                    return treatment.actualPrice;
                },
                getBillingFactorValue: function( treatment ) {
                    return treatment.billingFactorValue;
                }
            }
        );

        KoViewModel.registerConstructor( QuotationModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'FormBasedActivityModel',
            'v_quotation-schema'
        ]
    }
)
;