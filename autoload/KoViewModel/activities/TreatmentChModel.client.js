/**
 * User: oliversieweke
 * Date: 19.11.18  13:50
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI  */

'use strict';

YUI.add( 'TreatmentChModel', function( Y/*, NAME*/ ) {
        /**
         * @module TreatmentChModel
         */

        var KoViewModel = Y.doccirrus.KoViewModel,
            CatalogBasedActivityModel = KoViewModel.getConstructor( 'CatalogBasedActivityModel' );

        var CASE_FOLDER_TYPE_TO_COUNTRY_MAP = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP;


        /**
         * @class TreatmentChModel
         * @constructor
         * @extends CatalogBasedActivityModel
         */
        function TreatmentChModel( config ) {
            TreatmentChModel.superclass.constructor.call( this, config );
        }

        TreatmentChModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        TreatmentChModel.toPrice = Y.doccirrus.schemas.activity.toPrice;

        Y.extend( TreatmentChModel, CatalogBasedActivityModel, {

                initializer: function TreamtentChModel_initializer() {
                    this.initTreamtentChModel();
                },
                destructor: function TreamtentChModel_destructor() {},
                initTreamtentChModel: function TreamtentChModel_initTreamtentChModel() {
                    var self = this;

                    self.countryMode( ['CH'] );
                },

                getCatalogBaseOptions: function TreamtentChModel_getCatalogBaseOptions() {
                    var
                        self = this,
                        options = TreatmentChModel.superclass.getCatalogBaseOptions.apply( this, arguments ),
                        caseFolder = self.get( 'caseFolder' ),
                        forInsuranceType = caseFolder && caseFolder.type;
                    if( !forInsuranceType ) {
                        return options;
                    }
                    options.short = Y.doccirrus.schemas.catalog.getShortNameByInsuranceType(
                        CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolder.type],
                        forInsuranceType
                    );
                    return options;
                }
            },
            {
                schemaName: 'v_treatment_ch',
                NAME: 'TreatmentChModel'
            }
        );
        KoViewModel.registerConstructor( TreatmentChModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedActivityModel',
            'activity-schema',
            'v_treatment_ch-schema'
        ]
    }
)
;