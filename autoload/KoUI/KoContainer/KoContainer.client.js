/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'KoContainer', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoContainer
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        peek = ko.utils.peekObservable,

        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' );

    /**
     * __A container implementation which can have components in its items.__
     * @class KoContainer
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoContainer() {
        KoContainer.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoContainer,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoContainer',
            /**
             * Observable array of components. See {{#crossLink "ko.extenders/makeKoComponent:method"}}{{/crossLink}}.
             * @property items
             * @type ko.observableArray
             */
            items: null,
            init: function() {
                var self = this;
                KoContainer.superclass.init.apply( self, arguments );
                var template = ko.unwrap( self.template ),
                    items = [].concat( ko.unwrap( self.items ) || [] );  // TODO: [MOJ-3842] KoUI: ko.extenders.makeKoComponent should apply owner & not clean the referenced configuration items
                delete template.data;
                self.items = ko.observableArray( items ).extend( {makeKoComponent: true} );
                template.foreach = self.items;
            },
            /**
             * disposes any internal subscriptions
             * @method disposeSubscriptions
             * @for KoContainer
             */
            disposeSubscriptions: function KoContainer_disposeSubscriptions() {
                var
                    self = this;

                Y.Array.invoke( peek( self.items ), 'disposeSubscriptions' );

                KoContainer.superclass.disposeSubscriptions.apply( self, arguments );

            },
            /**
             * Component destructor.
             * @method dispose
             * @for KoContainer
             */
            dispose: function() {
                var
                    self = this;

                Y.Array.invoke( peek( self.items ), 'dispose' );

                KoContainer.superclass.dispose.apply( self, arguments );

            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoContainer' ) );
            }
        }
    } );
    /**
     * @property KoContainer
     * @type {KoContainer}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoContainer );

}, '3.16.0', {
    requires: [
        'KoUI',
        'KoComponentManager',
        'KoComponent'
    ]
} );
