/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'KoComponentManager', function( Y, NAME ) {
    'use strict';
    /**
     * @module KoComponentManager
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        KoUI = Y.doccirrus.KoUI,
    /**
     * Manages register and creation processes for KoUI components.
     * @class doccirrus.KoUI.KoComponentManager
     */
        /**
         * @property KoComponentManager
         * @for doccirrus.KoUI
         * @type {doccirrus.KoUI.KoComponentManager}
         */
        KoComponentManager = KoUI.KoComponentManager = {
            /**
             * count of created components
             * @property created
             * @for doccirrus.KoUI.KoComponentManager
             * @type {Number}
             */
            created: 0,
            /**
             * collection of instantiated components
             * @property components
             * @for doccirrus.KoUI.KoComponentManager
             * @type {Object}
             */
            components: {},
            /**
             * Available components to use.
             * @class doccirrus.KoUI.KoComponentManager.componentTypes
             */
            /**
             * collection of registered components
             * @property componentTypes
             * @for doccirrus.KoUI.KoComponentManager
             * @type {doccirrus.KoUI.KoComponentManager.componentTypes}
             */
            componentTypes: {},
            /**
             * @method addComponent
             * @for doccirrus.KoUI.KoComponentManager
             * @param {Object} component
             * @protected
             */
            addComponent: function( component ) {
                if( component.componentId in KoComponentManager.components ) {
                    Y.log( Y.Lang.sub( '{componentId} got rewritten', KoComponentManager.components ), 'warn', NAME );
                }
                KoComponentManager.components[component.componentId] = component;
            },
            /**
             * @method removeComponent
             * @for doccirrus.KoUI.KoComponentManager
             * @param {KoComponent} component
             * @protected
             */
            removeComponent: function( component ) {
                KoComponentManager.components[component.componentId] = null;
                delete KoComponentManager.components[component.componentId];
            },
            /**
             * Instantiates a {{#crossLink "KoComponent"}}{{/crossLink}}.
             * Lookup the list of available {{#crossLink "doccirrus.KoUI.KoComponentManager.componentTypes"}}components{{/crossLink}}.
             * @method createComponent
             * @for doccirrus.KoUI.KoComponentManager
             * @param {Object} componentConfig
             * @param {String} [componentType] can be omitted if the 'componentType' is specified in componentConfig
             * @return {KoComponent}
             * @example
             // markup: <div data-bind="template: aKoButton.template"></div>
             ko.applyBindings( {
                aKoButton: KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'aKoButton',
                        text: 'KoButton',
                        option: 'PRIMARY',
                        click: function() {
                            alert( 'clicked a KoButton' );
                        }
                    }
                } )
            }, node.getDOMNode() );
             */
            createComponent: function( componentConfig, componentType ) {
                // handle already instantiated
                if( componentConfig instanceof KoComponentManager.registeredComponent( 'KoComponent' ) ) {
                    return componentConfig;
                }
                // handle provided componentType
                if( 'componentType' in componentConfig ) {
                    return new KoComponentManager.componentTypes[componentConfig.componentType]( componentConfig.componentConfig || componentConfig );
                }
                componentConfig = componentConfig || {};
                // lookup componentType
                if( KoComponentManager.componentTypes[componentType] ) {
                    return new KoComponentManager.componentTypes[componentType]( componentConfig );
                }
                // fallback
                return new KoComponentManager.registeredComponent( 'KoComponent' )( componentConfig ); // TODO : …
            },
            /**
             * Register a component to be able to reuse it.
             * @method registerComponent
             * @for doccirrus.KoUI.KoComponentManager
             * @param {KoComponent} constructor
             * @param {String} [name] optional if specified with constructor name
             * @return {KoComponent}
             */
            registerComponent: function( constructor, name ) {
                name = name || constructor.name;
                if( name in KoComponentManager.componentTypes ) {
                    return KoComponentManager.componentTypes[name];
                }
                KoComponentManager.componentTypes[name] = constructor;
                return KoComponentManager.componentTypes[name];
            },
            /**
             * Check if a component constructor name is registered.
             * @method registeredComponent
             * @for doccirrus.KoUI.KoComponentManager
             * @param {String} name
             * @return {KoComponent|undefined}
             */
            registeredComponent: function( name ) {
                if( !KoComponentManager.componentTypes[name] ) {
                    Y.log( new Error( Y.Lang.sub( '{name} not registered', {name: name} ) ), 'error', NAME );
                }
                return KoComponentManager.componentTypes[name];
            }
        };

    /**
     * count of current components
     * @property count
     * @for doccirrus.KoUI.KoComponentManager
     * @type {Number}
     */
    Object.defineProperty( KoComponentManager, 'count', {
        enumerable: true,
        configurable: true,
        get: function() {
            return Object.keys( KoComponentManager.components ).length;
        }
    } );

}, '3.16.0', {
    requires: [
        'KoUI'
    ]
} );
