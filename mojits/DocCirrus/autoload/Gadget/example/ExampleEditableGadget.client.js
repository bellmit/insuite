/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'ExampleEditableGadget', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module ExampleEditableGadget
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        getObject = Y.doccirrus.commonutils.getObject,
        KoViewModel = Y.doccirrus.KoViewModel,
        GadgetBase = KoViewModel.getConstructor( 'GadgetBase' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        TPL_PATH_EXAMPLE = GADGET_CONST.paths.TPL_EXAMPLE;

    /**
     * @constructor
     * @class ExampleEditableGadget
     * @extends GadgetBase
     */
    function ExampleEditableGadget() {
        ExampleEditableGadget.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ExampleEditableGadget, GadgetBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initExampleEditableGadget();
        },
        /** @private */
        destructor: function() {
        },
        /**
         * If this Gadget is editable
         * @property editable
         * @type {Boolean}
         * @default true
         * @for ExampleEditableGadget
         */
        editable: true,
        /** @private */
        _initExampleEditableGadget: function() {
            var
                self = this,
                model = self.get( 'gadgetModel' );

            self.somethingFromConfig = ko.observable();

            self.addDisposable( ko.computed( function() {
                var
                    config = unwrap( model.config );

                self.somethingFromConfig( getObject( 'somethingFromConfig', config ) );
            } ) );
        }
    }, {
        NAME: 'ExampleEditableGadget',
        ATTRS: {
            /**
             * Some sort of markup string
             * - can be a promise to fulfill with a string (returned by valueFn)
             * @for ExampleEditableGadget
             */
            editTemplate: {
                valueFn: function() {
                    return Y.doccirrus.jsonrpc.api.jade
                        .renderFile( {noBlocking: true, path: TPL_PATH_EXAMPLE + 'ExampleEditableGadgetConfigDialog'} )
                        .then( function( response ) {
                            return response.data;
                        } );
                }
            },
            /**
             * Some sort of model
             * - can be a promise to fulfill with a model (returned by valueFn)
             * - specify "toJSON" to not let ko.toJS be used
             * - specify "destroy" to let your model be destroyed (dispose is being ignored when destroy is available)
             * - specify "dispose" to let your model be disposed
             * @for ExampleEditableGadget
             */
            editBindings: {
                getter: function() {
                    return {
                        somethingFromConfig: ko.observable( peek( this.somethingFromConfig ) )
                    };
                }
            }
        }
    } );

    KoViewModel.registerConstructor( ExampleEditableGadget );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'GadgetConstants',
        'GadgetBase',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dccommonutils'
    ]
} );
