/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'ExampleGadget', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module ExampleGadget
     */
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        GadgetBase = KoViewModel.getConstructor( 'GadgetBase' );

    /**
     * @constructor
     * @class ExampleGadget
     * @extends GadgetBase
     */
    function ExampleGadget() {
        ExampleGadget.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ExampleGadget, GadgetBase, {
        /** @private */
        initializer: function() {
        },
        /** @private */
        destructor: function() {
        }
    }, {
        NAME: 'ExampleGadget',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( ExampleGadget );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'GadgetBase'
    ]
} );
