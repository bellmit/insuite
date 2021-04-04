/**
 * User: dcdev
 * Date: 12/3/19  12:48 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'AMTSScheinEditorModel', function( Y ) {
        /**
         * @module AMTSScheinEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ScheinEditorModel = KoViewModel.getConstructor( 'ScheinEditorModel' ),
            i18n = Y.doccirrus.i18n;

        /**
         * @class AMTSScheinEditorModel
         * @constructor
         * @extends ScheinEditorModel
         */
        function AMTSScheinEditorModel( config ) {
            AMTSScheinEditorModel.superclass.constructor.call( this, config );
        }

        AMTSScheinEditorModel.ATTRS = {
            whiteList: {
                value: ScheinEditorModel.ATTRS.whiteList.value.concat( [
                    'treatmentType',
                    'reasonType',
                    'scheinBillingFactorValue',
                    'scheinClinicID',
                    'docPrinted',
                    'caseNumber',
                    'dayOfAccident'
                ] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: ScheinEditorModel.ATTRS.subModelsDesc.value.concat( [] ),
                lazyAdd: false
            }
        };

        Y.extend( AMTSScheinEditorModel, ScheinEditorModel, {
                initializer: function AMTSScheinEditorModel_initializer() {
                    var
                        self = this;
                    self.initAMTSScheinEditorModel();
                },
                destructor: function AMTSScheinEditorModel_destructor() {
                },
                initAMTSScheinEditorModel: function AMTSScheinEditorModel_initAMTSScheinEditorModel() {
                    var
                        self = this;

                    self.invoiceTypeI18n = i18n( 'InCaseMojit.casefile_detail.label.INVOICE_TYPE' );
                    self.treatmentReasonI18n =  i18n( 'InCaseMojit.casefile_detail.label.TREATMENT_REASON' );

                    self._treatmentTypeList = ko.observableArray( Y.doccirrus.schemas.activity.types.TreatmentType_E.list );
                    self.addDisposable( ko.computed( function() {
                        self.scheinClinicID();
                    } ) );

                    self.initObservables();
                },
                initObservables: function() {
                }
            }, {
                NAME: 'AMTSScheinEditorModel'
            }
        );
        KoViewModel.registerConstructor( AMTSScheinEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ScheinEditorModel',
            'FKEditorModels',
            'activity-schema'
        ]
    }
);
