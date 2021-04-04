/**
 * User: do
 * Date: 07.05.20  12:24
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'KoPictureViewer', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoPictureViewer
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        peek = ko.utils.peekObservable,
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' );

    /**
     * An picture viewer component.
     * Can be set up to show an array of pictures or a single one.
     * In multiple pictures can scrolled in carousel mode or with start and end boundaries.
     * @class KoPictureViewer
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoPictureViewer() {
        KoPictureViewer.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        descriptors: {
            componentType: 'KoPictureViewer',
            init: function() {
                var self = this;
                KoPictureViewer.superclass.init.apply( self, arguments );
                self.initKoPictureViewer();
            },
            initKoPictureViewer: function() {
                var self = this;
                self.borderRadius = self.borderRadius || '0';
                self.carouselMode = self.carouselMode || false;
                self.containerClass = ko.observable( self.containerClass || '' );
                self.controlSizeClass = ko.observable( self.controlSizeClass || 'dc-carousel-control-xl' );
                self.sourceComparator = self.sourceComparator || function( sourceA, sourceB ) {
                    return sourceA === sourceB;
                };
                self.isLoading = ko.observable( false );
                self.pictureSources = ko.observableArray();
                self.hasSources = ko.computed( function() {
                    return self.pictureSources().length > 0;
                } );
                self.isMultiPicturePreview = ko.computed( function() {
                    return self.pictureSources().length > 1;
                } );
                self.displayedSource = ko.observable();
                self.showNextPictureButton = ko.computed( function() {
                    var currentSourcesLength = self.pictureSources().length,
                        currentSourceIndex = self.currentSourceIndex();
                    if( self.carouselMode ) {
                        return true;
                    }
                    return currentSourceIndex < currentSourcesLength - 1;
                } );

                self.showLastPictureButton = ko.computed( function() {
                    var currentSourceIndex = self.currentSourceIndex();
                    if( self.carouselMode ) {
                        return true;
                    }

                    return currentSourceIndex > 0;
                } );

                self.caption = ko.computed( function() {
                    var displayedSource = self.displayedSource();
                    if( displayedSource && displayedSource.caption ) {
                        return displayedSource.caption;
                    }
                } );
            },
            onImageLoad: function() {
                var self = this;
                self.isLoading( false );
            },
            currentSourceIndex: function() {
                var self = this;
                return self.pictureSources().indexOf( self.displayedSource() );
            },
            nextPicture: function( model, event ) {
                var self = this,
                    currentSourceIndex = self.currentSourceIndex(),
                    currentSourcesLength = self.pictureSources().length,
                    nextSourceIndex = currentSourcesLength <= currentSourceIndex + 1 ? 0 : currentSourceIndex + 1;

                if( event ) {
                    event.stopPropagation();
                }
                if( !peek( self.showNextPictureButton ) ) {
                    return false;
                }
                self.setDisplaySourceByIndex( nextSourceIndex );
                return false;
            },
            lastPicture: function( model, event ) {
                var self = this,
                    currentSourceIndex = self.currentSourceIndex(),
                    currentSourcesLength = self.pictureSources().length,
                    lastSourceIndex = 0 > currentSourceIndex - 1 ? currentSourcesLength - 1 : currentSourceIndex - 1;

                if( event ) {
                    event.stopPropagation();
                }
                if( !peek( self.showLastPictureButton ) ) {
                    return false;
                }
                self.setDisplaySourceByIndex( lastSourceIndex );
                return false;
            },
            setDisplaySourceByIndex: function( index ) {
                var self = this;
                self.setDisplayedSource( self.pictureSources()[index] );
            },
            setDisplayedSource: function( source ) {
                var self = this;
                if( source && !self.sourceComparator( self.displayedSource(), source ) ) {
                    self.isLoading( true );
                    self.displayedSource( source );
                    if( typeof self.onSourceChange === 'function' ) {
                        self.onSourceChange( source );
                    }
                }
            },
            hasSource: function( source ) {
                var self = this;
                return self.pictureSources().some( function( sourceEntry ) {
                    return self.sourceComparator( source, sourceEntry );
                } );
            },
            getSourceBy: function( comparator ) {
                var self = this;
                return self.pictureSources().find( comparator );
            },
            /**
             * Set the source url of the picture viewer.
             * Cann be a an array of urls or a single url.
             * @method setSource
             * @returns {}
             */
            setSource: function( sources, showThisSource ) {
                var self = this;

                if( !Array.isArray( sources ) ) {
                    sources = [sources];
                }

                if( JSON.stringify( self.pictureSources() ) === JSON.stringify( sources ) ) {
                    return;
                }
                self.pictureSources( sources );
                self.setDisplayedSource( showThisSource || sources[0] );
            }
        },
        constructor: KoPictureViewer,
        extends: KoComponent,
        static: {},
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoPictureViewer' ) );
            }
        }
    } );
    /**
     * @property KoPictureViewer
     * @type {KoPictureViewer}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoPictureViewer );

}, '3.16.0', {
    requires: [
        'oop',
        'KoUI',
        'KoComponentManager',
        'KoComponent'
    ]
} );
