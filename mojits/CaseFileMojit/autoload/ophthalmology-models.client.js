/*jslint anon:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'dcOphthalmologyModels', function( Y ) {
        'use strict';

        Y.namespace( 'doccirrus.uam' );

        /**
         * @param config
         * @constructor
         */
        function OtAppliedSetModel( config ) {
            var
                self = this;

            self._modelName = 'OtAppliedSetModel';
            Y.doccirrus.uam.ViewModel.call( self );
            self._schemaName = 'activity.otAppliedSet';
            Y.doccirrus.uam.SubViewModel.call( self, config );

            self._runBoilerplate( config );

            self.createComputedForObservableDate();
        }

        OtAppliedSetModel.prototype = {
            constructor: OtAppliedSetModel,
            /**
             * creates separated date time computed
             * @private
             */
            createComputedForObservableDate: function() {
                var
                    self = this;

                // separate schema 'otAppliedAtL' into date and time
                ko.bindingHandlers.datetimepicker.createComputedForObservableDate( {
                    context: self, nameFrom: 'otAppliedAtL', nameDate: '_otAppliedAtL_date', nameTime: '_otAppliedAtL_time'
                } );
                // separate schema 'otAppliedAtR' into date and time
                ko.bindingHandlers.datetimepicker.createComputedForObservableDate( {
                    context: self, nameFrom: 'otAppliedAtR', nameDate: '_otAppliedAtR_date', nameTime: '_otAppliedAtR_time'
                } );
            },
            /**
             * click handler for passing otAppliedSet 'L' values to 'R' values
             * @method takeoverValues
             */
            takeoverValues: function() {
                var
                    self = this;

                self.otAppliedAtR( self.otAppliedAtL() );
                self.otAppliedContentR( self.otAppliedContentL() );

            }
        };
        /**
         * @namespace Y.doccirrus.uam
         * @type {OtAppliedSetModel}
         */
        Y.doccirrus.uam.OtAppliedSetModel = OtAppliedSetModel;

    },
    '0.0.1',
    {
        requires: [
            'ko-bindingHandlers',
            'dcviewmodel'
        ]
    }
);
