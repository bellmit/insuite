/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, jQuery */
'use strict';
YUI.add( 'KoFileUploader', function( Y/*, NAME*/ ) {
    /**
     * @module KoFileUploader
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        unwrap = ko.unwrap,
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' );

    /**
     * __A file uploader implementation.__
     * @class KoFileUploader
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     * @example
     // markup: <div data-bind="template: aKoFileUploader.template"></div>
     ko.applyBindings( {
         aKoFileUploader: KoComponentManager.createComponent( {
                    componentType: 'KoFileUploader',
                    componentConfig: {
                        fileTypes: [ 'jpg' ],
                        generateDataURL: true,
                        callbacks: {
                            onComplete: function( meta ) {
                                console.warn( 'KoFileUploader', 'onComplete', meta );
                            },
                            onProgress: function( meta ) {
                                console.warn( 'KoFileUploader', 'onProgress', meta );
                            },
                            onUpload: function( meta ) {
                                console.warn( 'KoFileUploader', 'onUpload', meta );
                            },
                            onError: function( meta ) {
                                console.warn( 'KoFileUploader', 'onError', meta );
                            }
                        }
                    }
                }
         } )
     }, node.getDOMNode() );
     */
    function KoFileUploader() {
        KoFileUploader.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoFileUploader,
        extends: KoComponent,
        static: {},
        descriptors: {
            componentType: 'KoFileUploader',
            init: function() {
                var self = this;
                KoFileUploader.superclass.init.apply( self, arguments );
                self.cancel = self.cancel.bind( self );
                self.initObservables();
                self.initButtons();
            },
            initObservables: function() {
                var
                    self = this;
                self.droppedFiles = ko.computed( {
                    read: function() {
                        return [];
                    },
                    write: function( files ) {
                        self.uploadFiles( files );
                    }
                } );
                self.uploader = {
                    fileTypes: self.fileTypes,
                    acceptFiles: self.acceptFiles,
                    generateDataURL: self.generateDataURL,
                    callbacks: self.callbacks,
                    filesInProgress: self.filesInProgress,
                    uploadUrl: self.uploadUrl
                };

            },
            initButtons: function() {
                var
                    self = this;
                self.uploadFileBtn = KoUI.KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'UploadButton',
                        text: i18n( 'general.button.UPLOAD' ),
                        click: function() {
                            jQuery( '#uploadButton' ).click();
                        }
                    }
                } );
            },
            getProgressBarValue: function( fileDescriptor ) {
                return unwrap( fileDescriptor.inProgress ) || 0;
            },
            getProgressBarWidth: function( fileDescriptor ) {
                return (unwrap( fileDescriptor.inProgress ) || 0) + '%';
            },
            getProgressBarText: function( fileDescriptor ) {
                return (unwrap( fileDescriptor.inProgress ) || 0) + '%';
            },
            uploadFiles: function( files ) {
                var
                    self = this;
                if( self.uploader.uploadFiles ) {
                    self.uploader.uploadFiles( files );
                }
            },
            cancel: function( data ) {
                var
                    self = this;
                if( self.uploader.cancel ) {
                    self.uploader.cancel( data );
                }
            },
            /**
             * If set to true, filesInProgress will include 'dataURL' for every file descriptor
             * @property generateDataURL
             * @default false
             */
            generateDataURL: false,
            /**
             * Defines whether progress bar is shown or not
             * @property generateDataURL
             * @default true
             */
            showProgressBar: true,

            /**
             * Callbacks map
             * @property generateDataURL
             * @default null
             * @example
             {
                 onComplete: function( meta ) {
                     console.warn( 'fileUploader', 'onComplete', meta );
                 },
                 onProgress: function( meta ) {
                     console.warn( 'fileUploader', 'onProgress', meta );
                 },
                 onUpload: function( meta ) {
                     console.warn( 'fileUploader', 'onUpload', meta );
                 },
                 onError: function( meta ) {
                     console.warn( 'fileUploader', 'onError', meta );
                 }
             }
             */
            callbacks: null,
            /**
             * Defines "accept" for file input
             * @property acceptFiles
             * @default "image/*"
             */
            acceptFiles: 'image/*'
        },
        lazy: {
            /**
             * Contains descriptors of currently processed files
             * @attribute filesInProgress
             * @type {Array}
             * @default []
             */
            filesInProgress: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observableArray() );
            },
            /**
             * Contains descriptors of currently processed files
             * @attribute uploadUrl
             * @type {String}
             * @default '/1/media/:uploadchunked'
             */
            uploadUrl: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, '/1/media/:uploadchunked' );
            },
            /**
             *
             * @attribute fileTypes
             * @type {Array}
             * @default []
             */
            fileTypes: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, [] );
            },
            /**
             * An array of additional buttons
             * @attribute buttons
             * @type {Array}
             * @default []
             */
            buttons: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observableArray() );
            },
            /**
             * Label which is shown when no file in progress
             * @attribute dropLabel
             * @type {String}
             * @default
             */
            dropLabel: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( i18n( 'general.text.DROP_FILE' ) ) );
            },
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoFileUploader' ) );
            }
        }
    } );
    /**
     * @property KoFileUploader
     * @type {KoFileUploader}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoFileUploader );

}, '3.16.0', {
    requires: [
        'oop',
        'KoUI',
        'KoComponentManager',
        'KoComponent',
        'KoButton'
    ]
} );
