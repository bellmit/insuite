/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */

YUI.add(
    'TelekardioMojitBinderconfig',
    function( Y, NAME ) {
        'use strict';
        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel;

        function BinderViewModel( config ) {
            BinderViewModel.superclass.constructor.call( this, config );
        }

        Y.extend( BinderViewModel, KoViewModel.getBase(), {
            initializer: function() {
                var self = this;

                self.configs = ko.observableArray( [] );
                self.configType = ko.observable();
                self.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;
                self.addNewConfigI18n = i18n( 'TelekardioMojit.labels.AddNewConfig' );
                self.configButtonSaveI18n = i18n( 'TelekardioMojit.labels.ConfigButtonSave' );

                self.saveButtonDisabled = ko.computed( function() {
                    return !( self.configs().every( function( config ) {
                            return config._isValid();
                        } ) ) || !( self.configs().some( function( config ) {
                            return config.isModified();
                        } ) );
                } );
            },
            readConfig: function( type ) {
                var self = this,
                    configVMs = [];

                self.configType( type );

                Y.doccirrus.jsonrpc.api.cardioconfiguration.read( {type: type} ).then( function( res ) {
                    return res.data;
                } ).done( function( res ) {
                    res.forEach( function( config ) {
                        configVMs.push( KoViewModel.createViewModel( {
                            NAME: 'CardioconfigurationgModel',
                            config: {data: config}
                        } ) );
                    } );
                    self.configs( configVMs );
                } );
            },
            toggleFullScreenHandler() {
                Y.doccirrus.DCBinder.toggleFullScreen();
            },
            saveButtonDisabled: null,
            saveButtonClickHandler: function() {
                var self = this,
                    data = self.configs(),
                    modifiedConfigs = [];

                modifiedConfigs = data.filter( function( item ) {
                    return item.isModified();
                } ).map( function( model ) {
                    return model.toJSON();
                } );

                if( modifiedConfigs.length ) {
                    Y.doccirrus.jsonrpc.api.cardioconfiguration.saveConfig( { data: modifiedConfigs } ).done( function( res ) {
                        if( res && res.data ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'info',
                                message: i18n( 'general.message.CHANGES_SAVED' ),
                                window: {
                                    width: 'medium'
                                }
                            } );
                        }
                    } ).fail( function( err ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: i18n( 'general.message.ERROR_WHILE_SAVING' ) + '.</br>' + ( err && err.message ),
                            window: {
                                width: 'medium'
                            }
                        } );
                    } );
                }
            },
            addButtonClickHandler: function() {
                var
                    self = this,
                    model = KoViewModel.createViewModel( {
                        NAME: 'CardioconfigurationgModel',
                        config: {data: {serviceType: self.configType()}}
                    } );
                self.configs.push( model );
            }
        } );

        Y.namespace( 'mojito.binders' )[NAME] = {
            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function( mojitProxy ) {
                this.mojitProxy = mojitProxy;
            },
            
            /**
             * The binder method, invoked to allow the mojit to attach DOM event
             * handlers.
             *
             * @param node {Node} The DOM node to which this mojit is attached.
             */
            bind: function( node ) {
                var self = this;
                
                Y.doccirrus.DCBinder.initToggleFullScreen();
                //change active tab in toplevel menu
                Y.doccirrus.NavBarHeader.setActiveEntry( 'cardioconfig' );
                self._initSubNavigation();
                self.binderViewModel = new BinderViewModel();
                ko.applyBindings( self.binderViewModel, node.getDOMNode() );

            },

            /**
             * initialize main sub navigation
             * @private
             */
            _initSubNavigation: function() {
                var
                    self = this,
                    rootPath = Y.doccirrus.utils.getUrl( 'telekardio' ),
                    router;

                router = new Y.doccirrus.DCRouter( {
                    root: rootPath,
                    routes: [
                        {
                            path: '/',
                            callbacks: function() {
                                self.binderViewModel.readConfig( 'cardio' );
                            }
                        },
                        {
                            path: '/cardio',
                            callbacks: function() {
                                self.binderViewModel.readConfig( 'cardio' );
                            }
                        },
                        {
                            path: '/doquvide',
                            callbacks: function() {
                                self.binderViewModel.readConfig( 'doquvide' );
                            }
                        },
                        {
                            path: '/dqs',
                            callbacks: function() {
                                self.binderViewModel.readConfig( 'dqs' );
                            }
                        }
                    ]
                } );

                //  Set the default hash fragment, or action the route if one is given

                var routeTo = location.href.split( 'telekardio#' );
                routeTo = ( routeTo.length < 2) ? '/' : routeTo[1];

                router.save( routeTo );
                routeTo = router.getPath();
            }
        };
    }, '0.0.1', {
        requires: [
            "DCBinder",
            'oop',
            'NavBarHeader',
            'DCRouter',
            'mojito-client',
            'doccirrus',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'KoViewModel',
            'CardioconfigurationgModel'
        ]
    } );
