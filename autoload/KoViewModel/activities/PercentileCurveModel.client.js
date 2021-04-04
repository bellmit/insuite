/**
 * User: strix
 * Date: 06/02/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'PercentileCurveModel', function( Y, NAME ) {
        /**
         * @module PercentileCurveModel
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            MedDataModel = KoViewModel.getConstructor( 'MedDataModel' ),
            MedDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes,
            MedDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
            staticTags = Y.doccirrus.schemas.tag.staticTags;

        /**
         * @class MedDataModel
         * @constructor
         * @param {Object} config
         * @extends SimpleActivityModel
         */
        function PercentileCurveModel( config ) {
            PercentileCurveModel.superclass.constructor.call( this, config );
        }

        Y.extend( PercentileCurveModel, MedDataModel, {

                initializer: function PercentileCurveModel_initializer() {
                    var self = this;
                    self.initPercentileCurveModel();
                },
                destructor: function PercentileCurveModel_destructor() {
                },
                initPercentileCurveModel: function PercentileCurveModel_initPercentileCurveModel() {
                    var
                        self = this;

                    //  on first load, set default entries
                    if( !unwrap( self._id ) && unwrap( self.medData ) && (0 === self.medData.length)
                    ) {
                        Y.log( 'Adding default values to PERCENTILECURVE', 'debug', NAME );
                        self.addDefaultValues();
                    }
                },
                addDefaultValues: function() {
                    var
                        self = this,
                        defaultTagTypes = [
                            MedDataTypes.BLOODPRESSURE,
                            MedDataTypes.HEIGHT,
                            MedDataTypes.WEIGHT,
                            MedDataTypes.HEAD_CIRCUMFERENCE,
                            MedDataTypes.BMI
                        ];

                    // add default types from static tag list
                    defaultTagTypes.forEach( function forEachDefaultTypeToLoad( medDataTypeToLoad ) {
                        var
                            tag = staticTags.find( function forEachStaticTag( tag ) {
                                return (tag.title === medDataTypeToLoad);
                            } ),
                            medDataItem = tag
                                .toMedDataItemTemplate()
                                .toMedDataItem( {
                                    category: MedDataCategories.PERCENTILECURVE
                                } );

                        if( medDataItem ) {
                            self.addMedDataItem( medDataItem );
                        }
                    } );
                }

            },
            {
                schemaName: 'v_meddata',
                NAME: 'PercentileCurveModel',
                ATTRS: {
                    validatable: {
                        value: true,
                        lazyAdd: false
                    },
                    medDataItemTemplatesByCategory: {
                        value: {},
                        lazyAdd: false
                    }
                }
            }
        );
        KoViewModel.registerConstructor( PercentileCurveModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'tag-schema',
            'v_meddata-schema',
            'v_percentilecurve-schema',
            'v_ingredientplan-schema',
            'activity-schema'
        ]
    }
);