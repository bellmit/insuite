/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'KoPaging', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoPaging
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' );

    /**
     * A paging component.
     * @class KoPaging
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoPaging() {
        KoPaging.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoPaging,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoPaging',
            init: function() {
                var self = this;
                KoPaging.superclass.init.apply( self, arguments );

                self.title( self.i18n( 'KoUI.KoPaging.title' ) );
            },
            /**
             * @method hasPrevPage
             * @return {Boolean}
             */
            hasPrevPage: function() {
                var page = ko.unwrap( this.page );
                if( page <= 1 ) {
                    return false;
                }
                return true;
            },
            /**
             * @method doPrevPage
             */
            doPrevPage: function() {
                var self = this;
                if( self.hasPrevPage() ) {
                    self.page( ko.unwrap( self.page ) - 1 );
                }
            },
            /**
             * @method hasNextPage
             * @return {Boolean}
             */
            hasNextPage: function() {
                var self = this,
                    page = ko.unwrap( self.page ),
                    pages = ko.unwrap( self.pages );
                if( pages <= page ) {
                    return false;
                }
                return true;
            },
            /**
             * @method doNextPage
             */
            doNextPage: function() {
                var self = this;
                if( self.hasNextPage() ) {
                    self.page( ko.unwrap( self.page ) + 1 );
                }
            }
        },
        lazy: {
            /**
             * @attribute page
             * @type {Number}
             * @default 1
             */
            page: function( key ) {
                var
                    self = this,
                    target = self._handleLazyConfig( key, ko.observable( 1 ) );

                // TODO: KoField for page

                //create a writable computed observable to intercept writes to our observable
                var result = ko.pureComputed( {
                    read: target,  //always return the original observables value
                    write: function( newValue ) {
                        var current = target(),
                            valueToWrite = parseInt( newValue, 10 ),
                            pages = self.pages.peek();

                        if( isNaN( valueToWrite ) || 0 === valueToWrite ) {
                            valueToWrite = 1;
                        }

                        if( valueToWrite < 1 || 0 === pages ) {
                            valueToWrite = 1;
                        } else if( valueToWrite > pages ) {
                            valueToWrite = pages;
                        }

                        //only write if it changed
                        if( valueToWrite !== current ) {
                            target( valueToWrite );
                        } else {
                            if( newValue !== current ) {
                                target.notifySubscribers( valueToWrite );
                            }
                        }
                    }
                } ).extend( {notify: 'always'} );
                result( target() );

                //return the new computed observable
                return result;
            },
            /**
             * @attribute pages
             * @type {Number}
             * @default 0
             */
            pages: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 0 ) );
            },
            /**
             * @property icon
             * @type {KoIcon}
             */
            icon: function() {
                return KoComponentManager.createComponent( {
                    componentType: 'KoIcon',
                    iconName: 'FILE_TEXT_O'
                } );
            },
            /**
             * @property buttonPrev
             * @type {KoButton}
             */
            buttonPrev: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    name: 'KoPaging-doPrevPage',
                    icon: 'CHEVRON_LEFT',
                    disabled: ko.computed( function() {
                        return !self.hasPrevPage();
                    }, self ),
                    click: Y.bind( self.doPrevPage, self )
                } );
            },
            /**
             * @property buttonNext
             * @type {KoButton}
             */
            buttonNext: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    name: 'KoPaging-doNextPage',
                    icon: 'CHEVRON_RIGHT',
                    disabled: ko.computed( function() {
                        return !self.hasNextPage();
                    }, self ),
                    click: Y.bind( self.doNextPage, self )
                } );
            },
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoPaging' ) );
            }
        }
    } );
    /**
     * @property KoPaging
     * @type {KoPaging}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoPaging );

}, '3.16.0', {
    requires: [
        'oop',
        'KoUI',
        'KoComponentManager',
        'KoComponent'
    ]
} );
