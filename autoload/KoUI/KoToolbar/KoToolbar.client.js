/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'KoToolbar', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoToolbar
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' ),
        KoContainer = KoComponentManager.registeredComponent( 'KoContainer' );

    /**
     * A toolbar component.
     * @class KoToolbar
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoToolbar() {
        KoToolbar.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoToolbar,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoToolbar',
            init: function() {
                var self = this;
                KoToolbar.superclass.init.apply( self, arguments );
                self.leftAligned = new KoContainer( {
                    items: self.leftAligned
                } );
                self.rightAligned = new KoContainer( {
                    items: self.rightAligned
                } );
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoToolbar' ) );
            }
        }
    } );
    /**
     * @property KoToolbar
     * @type {KoToolbar}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoToolbar );

    /**
     * A separator for {{#crossLink "KoToolbar"}}{{/crossLink}}.
     * @class KoToolbarSeparator
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoToolbarSeparator() {
        KoToolbarSeparator.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoToolbarSeparator,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoToolbarSeparator'
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoToolbarSeparator' ) );
            }
        }
    } );
    /**
     * @property KoToolbarSeparator
     * @type {KoToolbarSeparator}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoToolbarSeparator );

}, '3.16.0', {
    requires: [
        'KoUI',
        'KoComponentManager',
        'KoComponent',
        'KoContainer'
    ]
} );
