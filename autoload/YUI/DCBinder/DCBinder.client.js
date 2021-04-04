/* jslint anon:true, nomen:true */
/* global YUI, ko, setViewportWide,  */
YUI.add( 'DCBinder', function( Y, NAME ) {
    'use strict';
    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    /**
     *
     * @class DCBinder
     * @extends Y.Base
     * @constructor
     */
    function DCBinder() {
        DCBinder.superclass.constructor.apply( this, arguments );
    }

    /**
     * Set viewPortIsWide
     */
    DCBinder.viewPortBtnI18n = Y.doccirrus.i18n( 'CalendarMojit.calendar.title_attribute.VIEWPORTBTN' );
    DCBinder.initToggleFullScreen = () => {
        let viewportIsWide = Y.doccirrus.utils.localValueGet( 'cal_viewportIsWide' );

        if( !viewportIsWide ) {
            Y.doccirrus.utils.localValueSet( 'cal_viewportIsWide', "true" );
            viewportIsWide = true;
        } else {
            viewportIsWide = viewportIsWide !== "false";
        }

        setViewportWide( viewportIsWide );
    };
    DCBinder.toggleFullScreen = () => {
        const viewportIsWide = !(Y.doccirrus.utils.localValueGet( 'cal_viewportIsWide' ) === "true" || false);

        setViewportWide( viewportIsWide );
        Y.doccirrus.utils.localValueSet( 'cal_viewportIsWide', viewportIsWide );
    };

    Y.extend( DCBinder, Y.Base, {
        /** @private */
        initializer: function() {
            var
                self = this;

            /**
             * @event initialDataAvailable
             * @type {CustomEvent}
             * @param {EventFacade} event An Event Facade object
             * @param {Object} data provided data
             */
            self.publish( 'initialDataAvailable', {
                emitFacade: true,
                preventable: true,
                context: self,
                defaultFn: self._handleInitialData,
                preventedFn: self._handleInitialDataPrevented,
                stoppedFn: self._handleInitialDataStopped,
                fireOnce: true,
                async: true
            } );

            /**
             * @event uiReady
             * @type {CustomEvent}
             * @param {EventFacade} event An Event Facade object
             * @param {Object} data provided data
             */
            self.publish( 'uiReady', {
                emitFacade: true,
                preventable: true,
                context: self,
                defaultFn: self._handleUiReady,
                preventedFn: self._handleUiReadyPrevented,
                stoppedFn: self._handleUiReadyStopped,
                fireOnce: true,
                async: true
            } );

        },
        /** @private */
        destructor: function() {
        },
        /**
         * init function is shared by binder and class approach
         * use initializer for extend
         * Binder initialization method, invoked after all binders on the page
         * have been constructed. Use "binderInit"
         * @method init
         * @param mojitProxy
         * @private
         */
        init: function() {
            var
                self = this;

            if( !self.get( 'initialized' ) ) { // called by Base
                DCBinder.superclass.init.apply( this, arguments );
            } else { // called by Mojito
                self.binderInit( arguments[0] );
            }

        },
        /** @protected */
        binderInit: function( mojitProxy ) {
            var
                self = this;

            self.set( 'mojitProxy', mojitProxy );
        },
        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @method bind
         * @param node {Node} The DOM node to which this mojit is attached.
         * @private
         */
        bind: function( node ) {
            var
                self = this;

            self._initNode( node );
            self.showLoadingMask();
            self._getInitialData();

        },
        /**
         * After refreshView has been called and the DOM has been refreshed, an event is triggered that calls the hook method onRefreshView.
         * You can use onRefreshView to do things such as detach an event or prepare for another user action by re-attaching an event.
         * @method onRefreshView
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        onRefreshView: function( /* node */ ) {
            var
                self = this;

            self.bind.apply( self, arguments );
        },
        /** @private */
        _initNode: function( node ) {
            var
                self = this;

            self.set( 'node', node );
        },
        /** @private */
        _getInitialData: function() {
            var
                self = this;

            Promise
                .props( self.get( 'initialData' ) )
                .then( function( result ) {
                    self.fire( 'initialDataAvailable', {}, result );
                } );

        },
        /** @private */
        _setInitialData: function( initialData ) {
            var
                self = this,
                mojitProxy = self.get( 'mojitProxy' ),
                binderName = self.get( 'binderName' );

            mojitProxy.pageData.set( binderName, initialData );
        },
        /** @private */
        _handleInitialData: function( facade, initialData ) {
            var
                self = this;

            self._setInitialData( initialData );
            self._initUI();
        },
        /** @private */
        _handleInitialDataPrevented: function() {
        },
        /** @private */
        _handleInitialDataStopped: function() {
        },
        /**
         * Helper method to retrieve "initialData" more easily (it is actually stored in "mojitProxy" under this "binderName" )
         * @method getInitialData
         * @param {String} [path]
         * @returns {*|undefined}
         */
        getInitialData: function( path ) {
            var
                self = this,
                pageDataPath = self.get( 'binderName' );

            if( path ) {
                pageDataPath += '.' + path;
            }

            return self
                .get( 'mojitProxy' )
                .pageData.get( pageDataPath );
        },
        /**
         * Helper method to set "initialData" more easily (it is actually stored in "mojitProxy" under this "binderName" )
         * @method setInitialData
         * @param {String} path
         * @param {*} value
         * @returns {this}
         */
        setInitialData: function( path, value ) {
            var
                self = this,
                pageDataPath = self.get( 'binderName' );

            if( path ) {
                pageDataPath += '.' + path;
            }

            return self
                .get( 'mojitProxy' )
                .pageData.set( pageDataPath, value );
        },
        /**
         * Helper method to get from simple Object like cache stored inside pageData
         * @method getSimpleData
         * @param {String} [path]
         * @returns {*|undefined}
         */
        getSimpleData: function( path ) {
            var
                self = this,
                pageDataPath = self.get( 'binderName' ),
                pageData = self.get( 'mojitProxy' ).pageData;

            if( !pageData.__smplCache ) {
                pageData.__smplCache = {};
            }

            if( path ) {
                pageDataPath += '.' + path;
            }

            return pageData.__smplCache[pageDataPath];
        },
        /**
         * Helper method to set value in simple Object like cache stored inside pageData
         * @method setSimpleData
         * @param {String} path
         * @param {*} value
         * @returns {this}
         */
        setSimpleData: function( path, value ) {
            var
                self = this,
                pageDataPath = self.get( 'binderName' ),
                pageData = self.get( 'mojitProxy' ).pageData;

            if( !pageData.__smplCache ) {
                pageData.__smplCache = {};
            }

            if( path ) {
                pageDataPath += '.' + path;
            }

            pageData.__smplCache[pageDataPath] = value;
            return self;
        },
        /**
         * Helper method to retrieve "additionalData" in a common way
         * @method getAdditionalData
         * @param {String} [path]
         * @returns {*|undefined}
         */
        getAdditionalData: function( path ) {
            var
                self = this,
                additionalDataPath = 'additionalData';

            if( path ) {
                additionalDataPath += '.' + path;
            }

            return self
                .get( additionalDataPath );
        },
        /**
         * Helper method to set "additionalData" in a common way
         * @method getAdditionalData
         * @param {String} path
         * @param {*} value
         * @returns {this}
         */
        setAdditionalData: function( path, value ) {
            var
                self = this,
                additionalDataPath = 'additionalData';

            if( path ) {
                additionalDataPath += '.' + path;
            }

            return self
                .set( additionalDataPath, value );
        },
        /** @private */
        _handleUiReady: function( /* facade, data */ ) {
            var
                self = this;

            self.applyBindings();
            self.dispatchRoute();
            self.hideLoadingMask();
        },
        /** @private */
        _handleUiReadyPrevented: function() {
        },
        /** @private */
        _handleUiReadyStopped: function() {
        },
        navigation: null,
        /** @private */
        _initUI: function() {
            var
                self = this;

            Promise
                .props( self._initUIGatherProps() )
                .then( Y.bind( self._initUIGatherPropsThen, self ) )
                .catch( Y.bind( self._initUIGatherPropsCatch, self ) );

        },
        /** @private */
        _initUIGatherProps: function() {
            var
                self = this;

            return {
                router: self.setupRouter(),
                navigation: self.setupNavigation()
            };
        },
        /** @private */
        _initUIGatherPropsThen: function( props ) {
            var
                self = this;

            if( Y.Object.owns( props, 'navigation' ) ) {
                self.navigation = self.get( 'navigation' );
            }

            return Promise
                .props( self.get( 'additionalData' ) )
                .then( function( additionalData ) {
                    self.setAttrs( additionalData );
                    self.fire( 'uiReady', {}, {} );
                } );
        },
        /** @private */
        _initUIGatherPropsCatch: function() {
        },
        setupRouter: function() {
        },
        setupNavigation: function() {
        },
        showLoadingMask: function( text ) {
            var
                self = this,
                node = self.get( 'node' );

            if( node ) {
                Y.doccirrus.utils.showLoadingMask( node, text );
            }
        },
        hideLoadingMask: function() {
            var
                self = this,
                node = self.get( 'node' );

            if( node ) {
                Y.doccirrus.utils.hideLoadingMask( node );
            }
        },
        dispatchRoute: function() {
            var
                self = this,
                router = self.get( 'router' );

            if( router.match( router.getPath() ).length ) {
                router.dispatch();
            } else {
                router.replace( '/' );
            }
        },
        /** @protected */
        applyBindings: function() {
            var
                self = this,
                node = self.get( 'node' );

            try {
                ko.cleanNode( node.getDOMNode() );
                ko.applyBindings( self, node.getDOMNode() );
            } catch (err) {
                //  indicates a problem with our pug files, error needed for debugging
                console.log( 'ERROR, Cannot apply bindings: ', err );      //  eslint-disable-line no-console
            }
        },
        /**
         * Fetches a template and applies it to DOM
         * @method useTemplate
         * @param {Object} parameters
         * @param {String} parameters.name
         * @param {String} parameters.path
         * @param {Object} [parameters.data]
         * @returns {Promise}
         */
        useTemplate: function( parameters ) {
            var
                self = this,

                path = parameters.path,
                name = parameters.name,
                data = parameters.data,

                getName = 'useTemplate.' + name,
                usedTemplate = self.get( getName );

            if( !usedTemplate ) {
                self.set( getName, Y.doccirrus.jsonrpc.api.jade
                    .renderFile( { path: path, data: data } )
                    .then( function( response ) {
                        var
                            template = response.data;

                        Y.one( 'body' ).append( [
                            '<script type="text/html" id="', name, '">', template, '</script>'
                        ].join( '' ) );

                        return name;
                    } ) );
            }

            return self.get( getName );
        }
    }, {
        ATTRS: {
            /**
             * @attribute binderName
             * @type String
             * @default ''
             */
            binderName: {
                value: NAME
            },
            /**
             * @attribute mojitProxy
             * @type Object
             * @default null
             */
            mojitProxy: {
                value: null
            },
            /**
             * @attribute node
             * @type Y.Node
             * @default null
             */
            node: {
                value: null
            },
            /**
             * @attribute router
             * @type Y.doccirrus.DCRouter
             * @default Y.doccirrus.DCRouter
             */
            router: {
                valueFn: function() {
                    return new Y.doccirrus.DCRouter();
                }
            },
            /**
             * @attribute navigation
             * @type KoNav
             */
            navigation: {
                valueFn: function() {
                    return KoComponentManager.createComponent( {
                        componentType: 'KoNav',
                        componentConfig: {}
                    } );
                }
            },
            /**
             * - "initialData" gets written into "pageData" by the name of the Binder ("binderName")
             * @attribute initialData
             * @type Object
             * @default Object
             */
            initialData: {
                value: {},
                cloneDefaultValue: true,
                lazyAdd: false
            },
            /**
             * - "additionalData" gets written into the Binder as attributes associated by the given keys
             * @attribute additionalData
             * @type Object
             * @default Object
             */
            additionalData: {
                value: {},
                cloneDefaultValue: true,
                lazyAdd: false
            },
            /**
             * storage of method useTemplate
             * @attribute useTemplate
             * @type Object
             * @default Object
             * @protected
             */
            useTemplate: {
                value: {},
                cloneDefaultValue: true,
                lazyAdd: false
            }
        }
    } );

    Y.namespace( 'doccirrus' );
    Y.doccirrus.DCBinder = DCBinder;

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'DCRouter',
        'KoUI-all',
        'dcutils'
    ]
} );
