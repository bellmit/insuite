/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'KoDisplay', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoDisplay
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoField = KoComponentManager.registeredComponent( 'KoField' );

    /**
     * __A display visualization implementation.__
     * @class KoDisplay
     * @constructor
     * @extends KoField
     * @param {Object} config a configuration object
     */
    function KoDisplay() {
        KoDisplay.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoDisplay,
        extends: KoField,
        descriptors: {
            componentType: 'KoDisplay',
            init: function() {
                var self = this;
                KoDisplay.superclass.init.apply( self, arguments );
                self.display = ko.computed( self.display, self );
            },
            /**
             * Computed display based on underlying value
             * @property display
             * @returns {string}
             */
            display: function() {
                return String( ko.unwrap( this.value ) );
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoDisplay' ) );
            }
        }
    } );
    /**
     * @property KoDisplay
     * @type {KoDisplay}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoDisplay );

}, '3.16.0', {
    requires: [
        'KoUI',
        'KoComponentManager',
        'KoField'
    ]
} );
