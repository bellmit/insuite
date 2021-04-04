/**
 * User: strix
 * Date: 26/10/16
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'HistoryModel', function( Y ) {

        /**
         * @module HistoryModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityModel = KoViewModel.getConstructor( 'SimpleActivityModel' ),
            mixin = Y.doccirrus.api.activity.getFormBasedActivityAPI();

        /**
         * @class HistoryModel
         * @constructor
         * @extends SimpleActivityModel
         */
        function HistoryModel( config ) {
            HistoryModel.superclass.constructor.call( this, config );
        }

        HistoryModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( HistoryModel, SimpleActivityModel, {

                initializer: function HistoryModel_initializer() {
                    var self = this;
                    if( self.initFormBasedActivityAPI ) { self.initFormBasedActivityAPI(); }

                    self.initHistoryModel();
                },
                destructor: function HistoryModel_destructor() { },
                initHistoryModel: function HistoryModel_initHistoryModel() {
                    //var self = this;
                }
            },
            {
                schemaName: 'v_simple_activity',
                NAME: 'HistoryModel'
            }
        );

        Y.mix( HistoryModel, mixin, false, Object.keys( mixin ), 4 );

        KoViewModel.registerConstructor( HistoryModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityModel',
            'v_simple_activity-schema',
            'activity-api'
        ]
    }
);