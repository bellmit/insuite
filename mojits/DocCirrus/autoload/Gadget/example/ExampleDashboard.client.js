/*jslint anon:true, sloppy:true, nomen:true*/
YUI.add( 'ExampleDashboard', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module ExampleDashboard
     */
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        DashboardBase = KoViewModel.getConstructor( 'DashboardBase' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_LAYOUT_EXAMPLE = GADGET.layouts.example;

    /**
     * @constructor
     * @class ExampleDashboard
     * @extends DashboardBase
     */
    function ExampleDashboard() {
        ExampleDashboard.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ExampleDashboard, DashboardBase, {
        /** @private */
        initializer: function() {
        },
        /** @private */
        destructor: function() {
        }
    }, {
        NAME: 'ExampleDashboard',
        ATTRS: {
            /**
             * Available layout types as list
             * @attribute layoutList
             * @type Array
             * @for ExampleDashboard
             */
            layoutList: {
                valueFn: function() {
                    return GADGET_LAYOUT_EXAMPLE.list;
                },
                validator: Array.isArray
            },
            /**
             * Default layout type from list
             * @attribute layoutDefaultValue
             * @type Number
             * @for ExampleDashboard
             */
            layoutDefaultValue: {
                valueFn: function() {
                    return GADGET_LAYOUT_EXAMPLE.defaultType;
                },
                validator: Y.Lang.isNumber
            },
            /**
             * Available layout types
             * @attribute layoutTypes
             * @type Object
             * @for ExampleDashboard
             */
            layoutTypes: {
                valueFn: function() {
                    return GADGET_LAYOUT_EXAMPLE.types;
                },
                validator: Y.Lang.isObject
            },
            /**
             * Gadgets that are available for this layout to configure
             * @for ExampleDashboard
             */
            availableGadgetNamesToAdd: {
                valueFn: function() {
                    return [
                        {val: 'ExampleGadget', i18n: 'ExampleGadget'},
                        {val: 'ExampleEditableGadget', i18n: 'ExampleEditableGadget'},
                        {val: 'ExampleReportGadget', i18n: 'ExampleReportGadget'}
                    ];
                }
            }
        }
    } );

    KoViewModel.registerConstructor( ExampleDashboard );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'GadgetLayouts',
        'DashboardBase'
    ]
} );
