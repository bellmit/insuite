/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'PatientGadget', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadget
     */
    var
        // unwrap = ko.unwrap,
        // peek = ko.utils.peekObservable,

        KoViewModel = Y.doccirrus.KoViewModel,
        GadgetBase = KoViewModel.getConstructor( 'GadgetBase' );

    /**
     * @constructor
     * @class PatientGadget
     * @extends GadgetBase
     */
    function PatientGadget() {
        PatientGadget.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadget, GadgetBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initPatientGadget();
        },
        /** @private */
        destructor: function() {
        },
        /**
         * If this Gadget is editable
         * @property editable
         * @type {Boolean}
         * @default false
         * @for PatientGadget
         */
        editable: false,
        /** @private */
        _initPatientGadget: function() {
        }
    }, {
        NAME: 'PatientGadget',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadget );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'GadgetBase'
    ]
} );
