/**
 * User: strix
 * Date: 06/02/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'GravidogrammProcessModel', function( Y /*, NAME */ ) {
        /**
         * @module GavidogrammProcessModel
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            MedDataModel = KoViewModel.getConstructor( 'MedDataModel' );

        /**
         * @class MedDataModel
         * @constructor
         * @param {Object} config
         * @extends SimpleActivityModel
         */
        function GravidogrammProcessModel( config ) {
            GravidogrammProcessModel.superclass.constructor.call( this, config );
        }

        Y.extend( GravidogrammProcessModel, MedDataModel, {

                isGravidogrammProcess: null,

                initializer: function GravidogrammProcessModel_initializer() {
                    var self = this;
                    self.initGravidogrammProcessModel();
                },
                destructor: function GravidogrammProcessModel_destructor() {
                },
                initGravidogrammProcessModel: function __initGravidogrammProcessModel() {
                    var
                        self = this;

                    //  deprecated, now that this is split off from MedDataModel should not be necessary: TODO: remove
                    self.isGravidogrammProcess = ko.observable( true );
                }
            },
            {
                schemaName: 'v_meddata',
                NAME: 'GravidogrammProcessModel',
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
        KoViewModel.registerConstructor( GravidogrammProcessModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'MedDataModel',
            'tag-schema',
            'v_meddata-schema',
            'v_gravidogrammprocess-schema',
            'activity-schema',
            'dc-comctl'
        ]
    }
);