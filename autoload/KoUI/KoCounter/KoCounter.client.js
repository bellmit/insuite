/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'KoCounter', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoCounter
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' );

    /**
     * A counter visualization.
     * @class KoCounter
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoCounter() {
        KoCounter.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoCounter,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoCounter',
            init: function() {
                var
                    self = this;

                KoCounter.superclass.init.apply( self, arguments );

            }
        },
        lazy: {
            /**
             * A label.
             * @attribute label
             * @type {String}
             * @default undefined
             */
            label: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            },
            /**
             * The count initial value or later component.
             * @attribute count
             * @type {KoDisplay}
             * @default undefined
             */
            count: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {value: self.initialConfig.count}, 'KoDisplay' );
            },
            /**
             * The icon initial for {{#crossLink "KoIcon/iconName:attribute"}}{{/crossLink}} or later component.
             * @attribute icon
             * @type {KoIcon}
             * @default undefined
             */
            icon: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {iconName: self.initialConfig.icon}, 'KoIcon' );
            },
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoCounter' ) );
            }
        }
    } );
    /**
     * @property KoCounter
     * @type {KoCounter}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoCounter );

}, '3.16.0', {
    requires: [
        'KoUI',
        'KoComponentManager',
        'KoComponent',
        'KoDisplay',
        'KoIcon'
    ]
} );
