/**
 * User: strix
 * Date: 05/10/17
 * (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'GravidogrammModel', function( Y ) {

        /**
         * @module GravidogrammModel
         */

        var
            medDataCategories = Y.doccirrus.schemas.v_meddata.medDataCategories,
            MedDataItemTemplateCollection = Y.doccirrus.schemas.tag.MedDataItemTemplateCollection,
            KoViewModel = Y.doccirrus.KoViewModel,
            MedDataModel = KoViewModel.getConstructor( 'MedDataModel' ),
            mixin = Y.doccirrus.api.activity.getFormBasedActivityAPI();

        /**
         * @class GravidogrammModel
         * @constructor
         * @extends MedDataModel
         */
        function GravidogrammModel( config ) {
            GravidogrammModel.superclass.constructor.call( this, config );
        }

        GravidogrammModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( GravidogrammModel, MedDataModel, {

                initializer: function GravidogrammModel_initializer() {
                    var self = this;
                    if( self.initFormBasedActivityAPI ) { self.initFormBasedActivityAPI(); }

                    self.initGravidogrammModel();
                },
                destructor: function GravidogrammModel_destructor() { },
                initGravidogrammModel: function GravidogrammModel_initGravidogrammModel() {
                },
                getTypeList: function() {
                    var
                        medDataItemTemplateCollection = new MedDataItemTemplateCollection( {
                            medDataItemTemplatesByCategory: this.get( 'medDataItemTemplatesByCategory' )
                        } );

                    return medDataItemTemplateCollection.getMedDataTypeListForSelect2( medDataCategories.GRAVIDOGRAMM );
                },
                //  special case, GRAVIDOGRAMM opens to text tab before first save, and to table after
                initialTab: function() {
                    var self = this;
                    if ( self.isNew() ) { return 'textform'; }
                    return 'tableform';
                }

            },

            {
                schemaName: 'v_meddata',
                NAME: 'GravidogrammModel',
                ATTRS: {
                    medDataItemTemplatesByCategory: {
                        value: {},
                        lazyAdd: false
                    }
                }
            }
        );

        Y.mix( GravidogrammModel, mixin, false, Object.keys( mixin ), 4 );

        KoViewModel.registerConstructor( GravidogrammModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityModel',
            'MedDataModel',
            'v_simple_activity-schema',
            'tag-schema',
            'v_meddata-schema',
            'v_gravidogramm-schema',
            'activity-api'
        ]
    }
);