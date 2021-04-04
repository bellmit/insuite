/*global YUI */

'use strict';
YUI.add( 'InSightTableModel', function( Y/*, NAME  */) {

        var
            KoViewModel = Y.doccirrus.KoViewModel;


        /**
         * @module InSightTableModel
         */

        /**
         * __ABSTRACT__
         *
         * @class InSightTableModel
         * @constructor
         * @extends KoViewModel
         */
        function InSightTableModel( config ) {
            InSightTableModel.superclass.constructor.call( this, config );
        }

        InSightTableModel.ATTRS = {
            supportCountryExtensions: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( InSightTableModel, KoViewModel.getBase(), {
            initializer: function InSightTableModel_initializer() {
                var
                    self = this;

                self.initInSightTableModel();
            },
            destructor: function InSightTableModel_destructor() {
            },
            /**
             * initializes this InSightTableModel
             */
            initInSightTableModel: function InSightTableModel_initInSightTableModel() {
            }
        }, {
            schemaName: 'v_insight2',
            NAME: 'InSightTableModel'
        } );
        KoViewModel.registerConstructor( InSightTableModel );
        /**
         * @class InSightTableEditModel
         * @constructor
         * @extends InSightTableModel
         */
        function InSightTableEditModel( config ) {
            InSightTableEditModel.superclass.constructor.call( this, config );
        }

        Y.extend( InSightTableEditModel, InSightTableModel, {
            initializer: function InSightTableEditModel_initializer() {
                var
                    self = this;

                self.initInSightTableEditModel();
            },
            destructor: function InSightTableEditModel_destructor() {
            },
            /**
             * Initialises "InSightTableEditModel"
             */
            initInSightTableEditModel: function InSightTableEditModel_initInSightTableEditModel() {
            }

        }, {
            schemaName: InSightTableModel.schemaName,
            NAME: 'InSightTableEditModel',
            ATTRS: {}
        } );

        KoViewModel.registerConstructor( InSightTableEditModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'v_insight2-schema',
            'dccommonutils'
        ]
    }
);