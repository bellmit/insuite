/*jslint anon:true, nomen:true*/
/*global YUI */

YUI.add( 'CalendarModel', function( Y/*, NAME */ ) {
        'use strict';

        /**
         * @module CalendarModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class CalendarModel
         * @constructor
         * @extends KoViewModel
         */
        function CalendarModel( config ) {
            CalendarModel.superclass.constructor.call( this, config );
        }

        CalendarModel.ATTRS = {
        };

        Y.extend( CalendarModel, KoViewModel.getBase(), {
            /**
             * initializes this model
             */
            initModel: function CalendarModel_initModel() {
            },

            initializer: function CalendarModel_initializer() {
                var
                    self = this;

                self.initModel();
            },
            destructor: function CalendarModel_destructor() {
            }
        }, {
            schemaName: 'calendar',
            NAME: 'CalendarModel'
        } );
        KoViewModel.registerConstructor( CalendarModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'calendar-schema',
            'WeeklyTimeModel',
            'SpecificConsultTimeModel'
        ]
    }
);