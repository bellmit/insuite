/*
 @author: mp
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery, $ */

'use strict';

YUI.add( 'dcnavigation', function( Y, NAME ) {

        var navNamespace = Y.namespace( 'doccirrus' ).nav,

            i18n = Y.doccirrus.i18n,

            BEFOREUNLOAD_MESSAGE = i18n('dcnavigation.beforeUnloadView.beforeunload.message'),

            navUtils;

        //  will become Y.doccirrus.nav
        navUtils = function NavigationUtils() {
        };

        //  key/value store of all subnav objects/views on the page
        navUtils.subNavigations = {};

        //  holds the subnav object and subnavelement object which have focus
        navUtils.currentActivated = {
            navigation: '',
            element: ''
        };

        //  previously activated subnav and subnavelement
        navUtils.lastActivated = {
            navigation: '',
            element: ''
        };

        /**
         * sets the mojit name
         * @type {string} name of the mojit
         */
        navUtils.mojit = 'CaseFileMojit';

        /**
         * Sets the last activated element by navigation and element names
         * @param navName
         * @param elementName
         */
        function setCurrentActivated( navName, elementName ){

            //Y.log( 'Setting current activated: ' + navName + ' ' + elementName , 'debug', NAME);
            //Y.log( 'Last activated was: ' + JSON.stringify(navUtils.currentActivated), 'debug', NAME );

            // do not allow second activation of currently active navigation element
            if( navName === navUtils.currentActivated.navigation &&
                elementName === navUtils.currentActivated.element ) {
                return;
            }
            navUtils.lastActivated = {
                navigation: navUtils.currentActivated.navigation,
                element: navUtils.currentActivated.element
            };
            navUtils.currentActivated = {
                navigation: navName,
                element: elementName
            };

            //Y.log('Currently activated nav item: ' + JSON.stringify(navUtils.currentActivated), 'debug', NAME );
        }

        /**
         *
         * @param element
         * @constructor
         * @deprecated
         */
        navUtils.SubNavigationElement = function SubNavigationElement( element ) {
            var self = this;

            Y.doccirrus.uam.ViewModel.apply( self );

            self._modelName = 'SubNavigationElement';
            // template name
            self.name = ko.observable( element.name );
            // tells which element should be selected in elements array
            self.activationName = ko.observable( element.activationName || element.name );
            self.title = ko.observable( element.title );
            self.url = ko.observable( element.url );
            self.isActive = ko.observable( element.isActive || false );
            self.hasError = ko.observable( element.hasError || false );
            self.isDisabled = ko.observable( element.isDisabled || false );
            self.isHidden = ko.observable( element.isHidden || false );
            self.imgSrc = ko.observable( element.imgSrc || '' );
            self.click = element.click;
            self.menu = element.menu;
            self.hasLoaded = false;
            self.hasToBeLoaded = element.hasToBeLoaded || false;

            // add to control visibility of certain nav tabs depending on resolution
            // intended to be used with hidden-xx or visible-xx class
            // introduced with MOJ-1600 fix
            self.xs = ko.observable( element.xs || false );
            self.sm = ko.observable( element.sm || false );
            self.md = ko.observable( element.md || false );
            self.lg = ko.observable( element.lg || false );

            //this.callback = element.callback;
        };

        /***
         *
         * Subnavigation models have two basic modes of operation:
         * 'load'  -  loads fresh Jade into a div and (re)runs binders
         *            the div is determined by the SubNavigationElement.name or
         *            it is always the same div (selector)
         * 'noLoad' - the subnavigation panels have all their HTML already loaded
         *            so no jade loading occurs, only a show and hide of the divs
         *
         * Previously to version 2.3, the two modes were exclusive - either hiding
         * or reloading the jade from scratch.  Now a new mode is introduced with
         * the skipReload option.  i.e. when running activate() or activateElement()
         * you can specify skipReload. This means that the Jade is only loaded once
         * and subsequent activations will do a show/hide.
         *
         * @param name name of the navigation - used as identifier
         * @param elements
         * @param mode (optional) noLoad  - do not load templates into the selector div
         *                        load  -  load templates into selector div
         * @param selector (optional) only applies to 'load' mode!  Specifies target div id
         *                            for loading templates, optional, default is the element name.
         * @param {object} [aConfig] (optional) otherwise configurations
         * @constructor
         * @deprecated
         */
        navUtils.SubNavigationModel = function SubNavigationModel( name, elements, mode, selector, aConfig ) {
            var self = this;
            // a configuration object
            self._config = Y.merge({
                // to access loadTemplate options param
                jadeOptions : {}
            }, aConfig);

            self._modelName = 'SubNavigationModel';
            Y.doccirrus.uam.ViewModel.apply( self );

            // this clearly marks this model as
            // a special kind of Model that cannot
            // be saved.
            self._isNav = true;
            self.divSelector = selector;
            self._mode = mode || 'noLoad';
            self._name = name;
            self.elements = ko.observableArray();
            self.elements._arrayOf = 'SubNavigationElement';

            //console.log( self.elements() );

            /**
             *  Show or hide the view's container and jadeLoad the view
             *
             *      - sets the current activated element in datastore
             *      - raises optional onActivated event
             *      - loads a view into a target div
             *
             *
             *  @param  element     {Object}    A SubNavigationElement ko model
             *  @param  jqEvent     {Object}    jQuery event
             *  @param  options     {Object}    options to pass to binder
             *  @param  skipJadeReload  {Boolean}   Skip the reload of the template, NB registerNode() will not be executed
             *  @returns            {boolean}   true on success, false of failure
             */

            self.activate = function( element, jqEvent, options, skipJadeReload ) {

                Y.log( 'Subnavigation model activate: ' + (typeof element) + ' ' + element.name(), 'debug', NAME );

                //  TODO: add option to skip reload of elements
                //  var skipJadeReload = (jqEvent.hasOwnProperty('skipJadeReload') && jqEvent.skipJadeReload);

                var _options = Y.merge( self._config.jadeOptions, options );

                if( !element ) {
                    Y.log( 'click navigation null element', 'debug' );
                    return false;
                }
                if( element.isDisabled() ) {
                    Y.log( 'Not activating disabled item: ' + element.name(), 'info', NAME );
                    if( jqEvent && jqEvent.stopPropagation ) {
                        jqEvent.stopPropagation();
                    }
                    return false;
                }

                // unset the tabs, and hide the related content divs
                ko.utils.arrayForEach( self.elements(), function( navItem ) {
                    navItem.isActive( false );
                    $( '#' + navItem.name() ).addClass( 'hidden' );
                } );

                // set the correct tab now
                element.isActive( true );
                if( self.onActivate ) {
                    self.onActivate( element );
                }
                // show the correct div
                $( '#' + element.name() ).removeClass( 'hidden' );

                // additionally check whether we have to load Jade...
                if( 'load' === self._mode || element.hasToBeLoaded ) {
                    setCurrentActivated( self._name, element.name() );

                    if( skipJadeReload && element.hasLoaded ) {
                        if( element.callback ) {
                            element.callback();
                        }
                    } else {
                        navUtils.loadTemplate(
                            element.name(),
                            self.divSelector,
                            function postLoad() {
                                element.hasLoaded = true;
                                if( 'function' === typeof element.callback ) {
                                    element.callback.apply( element, arguments );
                                }
                            },
                            _options
                        );
                    }

                }
                return true;
            };

            /**
             *  Set a property of one of the subnav elements
             *
             *  @param  elemName    {String}    Should correspond to the view it loads
             *  @param  propName    {String}    One of the observables of the subnav element
             *  @param  value       {Mixed}     New value of this observable
             */

            self.setElemProperty = function(elemName, propName, value) {
                ko.utils.arrayForEach( self.elements(), function( navItem ) {

                    if (elemName === navItem.name() && navItem[propName] && 'function' === (typeof navItem[propName])) {
                        navItem[propName](value);
                    }

                });
            };

            /**
             *  Get a property of one of the subnav elements
             *
             *  @param  elemName    {String}    Should correspond to the view it loads
             *  @param  propName    {String}    One of the observables of the subnav element
             */

            self.getElemProperty = function(elemName, propName) {
                ko.utils.arrayForEach( self.elements(), function( navItem ) {

                    if (elemName === navItem.name() && navItem[propName] && 'function' === (typeof navItem[propName])) {
                        return navItem[propName]();
                    }

                });
            };

            // fill the arrays with data
            self.elements( Y.doccirrus.uam.ViewModel.createModels( {
                forName: self.elements._arrayOf,
                inAttribute: 'elements',
                parent: self,
                items: elements
            } ) );

            navUtils.subNavigations[name] = self;
        };

        navUtils.SubNavigationModel.prototype = {
            constructor: navUtils.SubNavigationModel,
            /**
             * find an SubNavigationElement by name
             * @param {String} name the name to find by
             * @returns {null|SubNavigationElement}
             */
            getElementByName : function(name){
                return Y.Array.find(this.elements(), function(element){
                    return element.name() === name;
                });
            }
        };

        /**
         * Gets the reference of a created sub navigation
         * @param key name of the sub navigation
         * @returns {*}
         */
        navUtils.getSubNavigation  = function( key ){
            return navUtils.subNavigations[key];
        };

        /**
         * Activates the last activated navigation element.
         */
        navUtils.back = function() {
            var success = true;
            console.log( 'trying to load last activated element' );
            if( navUtils.lastActivated !== '_load' ) {
                success = navUtils.activateElement(
                    navUtils.lastActivated.navigation,
                    navUtils.lastActivated.element
                );
            } else {
                console.log( 'last element was not loaded via menu' );
                navUtils.loadTemplate( navUtils.lastActivated.element );
            }
            if( !success ) {
                console.log( 'Last activated navigation element could not be found' );
            }
        };

        /**
         * Looks for the element in the given navigation and executes activate
         * with the element.
         *
         * @method activateElement
         * @param {String} navName Name of the navigation
         * @param {String} elementName Name of the NavSubItem
         * @param {Object} [options] options which will be passed to binder
         * @param {Boolean}  Skip reload
         * @param {Function} [callback] Callback to be executed after element activation
         * @returns {boolean} true if the element has been found, else false
         */
        navUtils.activateElement = function( navName, elementName, options, skipJadeReload, callback ) {
            var
                navigation;
            navigation = navUtils.subNavigations[navName];
            if( navigation ) {
                return ko.utils.arrayFirst( navigation.elements(), function( navElement ) {
                    if( navElement.activationName().toLowerCase().indexOf( elementName.toLowerCase() ) > -1 ) {
                        Y.log('Activating element ' + elementName + ' on nav ' + navName, 'debug', NAME);

                        if( 'function' === typeof callback ) {
                            navElement.callback = callback;
                        }

                        navigation.activate( navElement, null, options, skipJadeReload );
                        return true;
                    }
                    return false;
                } );
            } else {
                Y.log( 'Navigation could not be found. Can not activate element: ' + navName + ' ' + elementName, 'warn', NAME );
                return false;
            }
        };

        /**
         *  In some cases we do not want to needlessly reload vies and data from the server
         *
         *  @param  navName     {String}
         *  @param  elementName {String}
         */

        navUtils.canSkipReload = function(navName, elementName) {

            if ('mainCasefileNavigation' !== navName) {
                return false;
            }

            var
                currentPatient = Y.doccirrus.uam.loadhelper.get('currentPatient'); //,
                //currentActivity = Y.doccirrus.uam.loadhelper.get('currentActivity');

            switch (elementName) {
                case 'casefile_browser':
                    if (currentPatient && Y.doccirrus.uam.loadhelper.get('casefilePatientId') === currentPatient._id) {
                        //  casefile for this patient was already loaded
                        return true;
                    }
                    break;

                case 'patient_detail':
                    if (currentPatient && Y.doccirrus.uam.loadhelper.get('patientPatientId') === currentPatient._id) {
                        //  casefile for this patient was already loaded
                        return true;
                    }
                    break;


            }
            return false;
        };

        /**
         *
         * @method loadTemplate
         * @param name {String} name of the template
         * @param selector {String} (optional) selector defines a div selector, otherwise it is the #name
         * @param callback {Function} (optional) callback function after template loaded
         * @param {object} [options] (optional) options of dcJadeRepository.loadNodeFromTemplate
         */
        navUtils.loadTemplate = function( name, selector, callback, options ) {

            var
                node,
                divSelector = selector || '#' + name;

            function handleTemplateLoaded() {
                //setCurrentActivated( '_load', name );
                //this causes errors <--- is this called multiple times??
                if( callback && 'function' === typeof callback ) {
                    callback();
                }

            }

            // DEPRECATED and being removed...
            //dataLink = document.querySelector( '*[data-link-view="' + name + '"]' );
            //if( dataLink ) {
            //    $( dataLink ).addClass( 'active' );
            //}

            node = document.querySelector( divSelector );
            if( node ) {
                ko.cleanNode( node );
            }
            YUI.dcJadeRepository.loadNodeFromTemplate(
                name,
                navUtils.mojit,
                options || {},
                Y.one( divSelector ),
                handleTemplateLoaded
            );
        };

        /**
         * Holds beforeUnloadView types
         * @deprecated
         * @property beforeUnloadView
         * @for doccirrus.nav
         * @type {Object}
         */
        navUtils.beforeUnloadView = {
            type : {
                beforeunload: {},
                router: {},
                appHref: {}
            }
        };

        /**
         * Prevents a view from unloading.
         * - Publishes the event 'beforeUnloadView' on Y, which can be prevented to suppress unloading the view (more details there).
         * @deprecated
         * @param {Object} parameters
         * @param {Y.Router} [parameters.router] If specified prevents calling a link href associated with a path in the router
         */
        navUtils.initBeforeUnloadView = function initBeforeUnloadView( parameters ) {

            parameters = parameters || {};

            var
                type = navUtils.beforeUnloadView.type,
                router = parameters.router;

            if( navUtils.initBeforeUnloadView.initialized ) {
                Y.log( 'initBeforeUnloadView: already initialized', 'warn', NAME );
                return;
            }
            else {
                navUtils.initBeforeUnloadView.initialized = true;
            }

            /**
             * The event is fired, when registered and a view may unload.
             * The view may unload by using a router and external actions (such as visiting another page, reloading/leaving a page).
             *
             * There are constants to check the type against (in "Y.doccirrus.nav.beforeUnloadView.type")
             * - in case an external action is triggered, it will provide an beforeunload event type and the event data for it
             * - in case it was configured using a router, it will provide a router event type and the event data for it
             *
             * @event beforeUnloadView
             * @type Event.Custom
             * @for Y
             * @param {EventFacade} eventFacade The EventFacade
             * @param {Object} event The event object
             * @param {Y.doccirrus.nav.beforeUnloadView.type} event.type The event type object
             * @param {Object} event.router The 'router' event object
             * @param {String} event.router.route The route the router should process
             * @param {String} event.router.href The link href if available
             * @param {Y.Router} event.router.instance The router instance
             * @param {String} event.router.getPath router instance result for getPath
             * @param {Function} event.router.goRoute processes the route with the router
             */
            Y.publish( 'beforeUnloadView', {
                emitFacade: true,
                preventable: true,
                defaultFn: function beforeUnloadView_defaultFn() {
                    Y.log( 'Event beforeUnloadView propagated', 'debug', NAME );
                },
                preventedFn: function beforeUnloadView_preventedFn() {
                    Y.log( 'Event beforeUnloadView was prevented', 'warn', NAME );
                },
                stoppedFn: function beforeUnloadView_stoppedFn() {
                    Y.log( 'Event beforeUnloadView was stopped', 'warn', NAME );
                }
            } );

            // handle a given Y.Router instance
            if( router instanceof Y.Router ) {

                /**
                 * A preventable call to Y.Router.save
                 * @deprecated
                 * @for Y.Router
                 * @method saveAllowedUnloadView
                 * @param {String} route the route as the method "save" would take
                 * @return {boolean} true for not prevented access
                 */
                router.saveAllowedUnloadView = function( route ) {
                    var
                        beforeUnloadView = {
                            type: type.router,
                            router: {
                                href: null,
                                route: route,
                                instance: router,
                                getPath: router.getPath(),
                                goRoute: function beforeUnloadView_goRoute() {
                                    router.save( route );
                                }
                            }
                        };

                    // notify about the user action
                    if( Y.fire( 'beforeUnloadView', {}, beforeUnloadView ) ) {
                        router.save( route );
                        return true;
                    }
                    return false;
                };

                // make static links to Y.Router routes preventable
                jQuery( document.body ).on( "click", "a[href]:not([target=_blank])", function beforeUnloadView_click_href( $event ) {
                    var
                        $link = jQuery( this ),
                        href = $link.attr( 'href' ),
                        goRoute = href.replace( '#', '' ), // workaround for the hash indicator stuff
                        hasRoute = router.hasRoute( href ),
                        beforeUnloadView = null,
                        appHrefs = Y.doccirrus.NavBarHeader && Y.doccirrus.NavBarHeader.hrefs && Y.doccirrus.NavBarHeader.hrefs.peek();

                    if( hasRoute ) {// router does know how to handle href

                        // build event data
                        beforeUnloadView = {
                            type: type.router,
                            router: {
                                href: href,
                                route: goRoute,
                                instance: router,
                                getPath: router.getPath(),
                                goRoute: function beforeUnloadView_goRoute() {
                                    router.save( goRoute );
                                }
                            }
                        };

                        // notify about the user action
                        if( !Y.fire( 'beforeUnloadView', {}, beforeUnloadView ) ) {
                            // user action was halted
                            $event.preventDefault();
                            $event.stopImmediatePropagation();
                        }

                    }
                    else if( Array.isArray( appHrefs ) && -1 !== appHrefs.indexOf( href ) ) {

                        // build event data
                        beforeUnloadView = {
                            type: type.appHref,
                            appHref: {
                                href: href,
                                instance: router,
                                goHref: function beforeUnloadView_goHref() {
                                    window.location.href = href;
                                }
                            }
                        };

                        // notify about the user action
                        if( !Y.fire( 'beforeUnloadView', {}, beforeUnloadView ) ) {
                            // user action was halted
                            $event.preventDefault();
                            $event.stopImmediatePropagation();
                        }

                    }

                } );

            }

            // handle page unload
            Y.on( 'beforeunload', function beforeUnloadView_beforeunload( yEvent ) {
                var
                    event = yEvent._event,
                    beforeUnloadView = {
                        type: type.beforeunload,
                        beforeunload: {
                            event: event
                        }
                    };

                if( !Y.fire( 'beforeUnloadView', {}, beforeUnloadView ) ) {
                    // user action was halted

                    (event || window.event).returnValue = BEFOREUNLOAD_MESSAGE; // Gecko and Trident
                    return BEFOREUNLOAD_MESSAGE; // Gecko and WebKit
                }

            } );

        };

        Y.doccirrus.uam.SubNavigationElement = navUtils.SubNavigationElement;
        Y.doccirrus.uam.SubNavigationModel = navUtils.SubNavigationModel;

        if( !navNamespace ) {
            //  note: this will be extened by casefile_nav.js to add a YUI router
            Y.namespace( 'doccirrus' ).nav = navUtils;
        }

    },
    '0.0.1', {
        requires: [
            'doccirrus',
            'dcutils',
            'dcviewmodel'
        ]
    }
);