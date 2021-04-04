/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'ScheduletypeModel', function( Y/*, NAME */ ) {
        

        /**
         * @module ScheduletypeModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class ScheduletypeModel
         * @constructor
         * @extends KoViewModel
         * @param {Object} config
         */
        function ScheduletypeModel( config ) {
            ScheduletypeModel.superclass.constructor.call( this, config );
        }

        ScheduletypeModel.ATTRS = {
            standardId: {
                value: Y.doccirrus.schemas.scheduletype.getStandardId(),
                lazyAdd: false
            }
        };

        Y.extend( ScheduletypeModel, KoViewModel.getBase(), {
            /**
             * initializes this model
             */
            initModel: function ScheduletypeModel_initModel() {
            },

            initializer: function ScheduletypeModel_initializer() {
                var
                    self = this;

                self.initModel();
            },
            destructor: function ScheduletypeModel_destructor() {
            },
            isStandardId: function ScheduletypeModel_isStandardId() {
                var
                    self = this;

                return ko.utils.peekObservable( self._id ) === self.get( 'standardId' );
            }
        }, {
            schemaName: 'scheduletype',
            NAME: 'ScheduletypeModel'
        } );
        KoViewModel.registerConstructor( ScheduletypeModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'scheduletype-schema'
        ]
    }
);