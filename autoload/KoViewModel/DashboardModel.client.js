/*jslint anon:true, nomen:true*/
/*global YUI */
YUI.add( 'DashboardModel',
    function( Y /*, NAME */ ) {
        'use strict';

        /**
         * @module DashboardModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class DashboardModel
         * @constructor
         * @extends KoViewModel
         */
        function DashboardModel() {
            DashboardModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( DashboardModel, KoViewModel.getBase(), {
            initializer: function() {
            },
            destructor: function() {
            }
        }, {
            schemaName: 'dashboard',
            NAME: 'DashboardModel',
            ATTRS: {
                validatable: {
                    value: true,
                    lazyAdd: false
                }
            }
        } );

        KoViewModel.registerConstructor( DashboardModel );

    },
    '3.16.0',
    {
        requires: [
            'oop',
            'KoViewModel',
            'dashboard-schema'
        ]
    }
);