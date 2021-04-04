'use strict';

/*global fun:true, ko, async */
/*exported fun*/
fun = function _fn( Y ) {

    var
        i18n = Y.doccirrus.i18n,
        viewModel = null,
        KoViewModel = Y.doccirrus.KoViewModel,
        unwrap = ko.unwrap,
        InPacsmodalityModel = KoViewModel.getConstructor( 'InPacsmodalityModel' );

    function InPacsmodalityView() {
        InPacsmodalityView.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InPacsmodalityView, KoViewModel.getDisposable(), {

        handleReloadEvent: null,

        initInPacsmodalityView: function() {
            var self = this;
            self.buttonSaveI18n = i18n( 'general.button.SAVE' );
            self.baseConfigPortI18n = i18n( 'InPacsAdminMojit.inpacsmodality_T.baseConfigPort' );
            self.portI18n = i18n( 'InPacsAdminMojit.inpacsmodality_T.port' );
            self.isMockingI18n = i18n( 'InPacsAdminMojit.inpacsmodality_T.isMocking' );
            self.encodingTextI18n = i18n( 'InPacsAdminMojit.inpacsmodality_T.encodingText' );
            self.buttonTestI18n = i18n( 'general.button.TEST' );
            self.buttonDeleteI18n = i18n( 'general.button.DELETE' );
            self.configs = ko.observableArray();
            self.configsToDelete = [];
            self.addConfig = function() {
                self.configs.push( new InPacsmodalityModel() );
            };
            self.removeConfig = function( item ) {
                if( item._id() && !item.isNew() ) {
                    self.configsToDelete.push( item );
                }
                self.configs.remove( item );
            };
            self.testModalityConnection = function( item ) {
                if( !item.isNew() && !item.isModified() && item._id() ) {
                    Y.doccirrus.jsonrpc.api.inpacsmodality.testModalityConnection( {
                        query: {
                            "modality": ko.toJSON( unwrap( item ) )
                        }
                    } ).done( function( res ) {
                        Y.doccirrus.DCWindow.notice( {
                            message: res.data
                        } );
                    } ).fail( function( err ) {
                        Y.log( 'Test modality failed: ' + JSON.stringify( err ), 'warn', "" );
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: err.message
                        } );
                    } );
                }
                else {
                    Y.doccirrus.DCWindow.notice( {
                        message: "Modality is not saved."
                    } );
                }
            };
            self.isDefaultConfig = function( item ) {
                var defaultTitle = i18n( 'InPacsAdminMojit.inpacsmodality_T.label.main_title' );
                return defaultTitle === item.title();
            };
            self.isMocking = ko.observable( false );
            self._defaultEncodingList = Y.doccirrus.schemas.inpacsconfiguration.types.DefaultEncoding_E.list;
            self.selectedEncoding = ko.observable();
            self.originalSelectedEncoding = ko.observable();
            self.load();

            var messageId = 'tab_inpcs_reload_orthanc_error_mgs';

            self.handleReloadEvent = Y.doccirrus.communication.on( {
                event: 'reloadOrthancServiceError',
                handlerId: 'tab_inpcs_reload_orthanc_error_mgs',
                done: function() {
                    Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: messageId,
                        content: 'Orthanc reload fehlgeschlagen.',
                        level: 'ERROR'
                    } );
                }
            } );

            self.addDisposable(ko.computed(function() {
                unwrap( self.configs ).forEach(function( config ) {
                    if ( 'InPacsAdminMojit.inpacsmodality_T.label.main_title' === unwrap (config.title )) {
                        config.title( i18n( 'InPacsAdminMojit.inpacsmodality_T.label.main_title' ) );
                    }
                });
            }));

        },
        initializer: function(config) {
            var
                self = this;
            self.initInPacsmodalityView();
            self.mainNode = config.node;

            self.isValid = ko.computed( function() {
                var configs = ko.unwrap( self.configs );
                return configs.every( function( elem ) {
                    return elem.isValid();
                } );
            } );
        },

        checkIfSettingsHaveChanged: function() {
            var self = this;
            var hasChanged = false;
            var configs = ko.unwrap( self.configs );
            var configsValid = configs.every( function( elem ) {
                return elem.isValid();
            } );

            if( self.originalSelectedEncoding() !== self.selectedEncoding() ) {
                return true;
            } else if(!configsValid) {
                return configsValid;
            } else if(self.configsToDelete.length) {
                return true;
            } else {
                ko.utils.arrayForEach( self.configs(), function( item ) {
                    if( item.name() && item.title() && item.port() && item.ip() ) {
                        if( item.isNew() && !ko.unwrap( item._id ) ) {
                            hasChanged = true;
                        }
                        else if( item.isModified() ) {
                            hasChanged = true;
                        }
                    }
                } );

                return hasChanged;
            }
        },

        destructor: function() {
            var
                self = this;
            if( self.handleReloadEvent ) {
                self.handleReloadEvent.removeEventListener();
                self.handleReloadEvent = null;
            }
        },

        load: function() {
            var self = this;

            async.waterfall([

                function queryInpacConfiguration( waterfallCb ) {
                    Y.doccirrus.jsonrpc.api.inpacsconfiguration.read()
                        .done( function( res ) {
                            if( res && res.data ) {
                                self.isMocking( res.data[0].isMocking );

                                if( res.data[0].defaultEncoding ) {
                                    self.selectedEncoding( res.data[0].defaultEncoding );
                                    self.originalSelectedEncoding( res.data[0].defaultEncoding );
                                }
                            }

                            waterfallCb();
                        } )
                        .fail( function( err ) {
                            if( err ) {
                                Y.log( 'Could not get inpacs config: ' + JSON.stringify( err ), 'warn', "" );
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'error',
                                    message: err.message
                                } );
                            }
                            waterfallCb();
                        } );
                },

                function queryInpacsmodality ( waterfallCb ) {
                    Y.doccirrus.jsonrpc.api.inpacsmodality.read()
                        .done( function( res ) {
                            if( !res || !res.data || !res.data.length ) {
                                Y.log( 'No data returned from server - forms will be empty.', 'warn', "" );
                                self.configs.push( new InPacsmodalityModel( {
                                    data: Y.doccirrus.schemas.inpacsmodality.getDefaultData()
                                } ) );
                                self.configs.push( new InPacsmodalityModel() );
                                return;
                            }
                            for( let i = 0; i < res.data.length; i++ ) {
                                if( res.data[i] ) {
                                    self.configs.push( new InPacsmodalityModel( {
                                        data: res.data[i]
                                    } ) );
                                }
                            }

                            waterfallCb();
                        } )
                        .fail( function( err ) {
                            if( err ) {
                                Y.log( 'Could not get table data: ' + JSON.stringify( err ), 'warn', "" );
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'error',
                                    message: err.message
                                } );
                            }
                            waterfallCb();
                        } );
                }

            ], function finalCallback( ) {
                Y.log("Queried Inpacsconfiguration/modality", "debug", "");
            });
        },
        onSave: function() {

            var
                self = this;

            function saveFailed( err ) {
                if( err ) {
                    Y.log( 'Could not save forms data: ' + JSON.stringify( err ), 'warn', "" );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: err.message
                    } );
                }
            }

            function setMocking() {
                Y.doccirrus.jsonrpc.api.inpacsconfiguration.setMocking( {
                    query: {
                        'isMocking': ko.toJSON( self.isMocking )
                    }
                } ).fail( saveFailed );
            }

            function save() {

                var
                    newConfigs = [],
                    modConfigs = [];

                ko.utils.arrayForEach( self.configs(), function( item ) {
                    if( item.name() && item.title() && item.port() && item.ip() ) {
                        if( item.isNew() && !ko.unwrap( item._id ) ) {
                            newConfigs.push( ko.toJSON( item ) );
                        }
                        else if( item.isModified() ) {
                            modConfigs.push( ko.toJSON( item ) );
                        }
                    }
                } );

                Y.doccirrus.utils.showLoadingMask( self.mainNode );

                Y.doccirrus.communication.apiCall( {
                    method: 'inpacsmodality.saveModalityConfig',
                    data: {
                        configsToDelete: self.configsToDelete,
                        configsToCreate: newConfigs,
                        configsToUpdate: modConfigs,
                        selectedEncoding: self.selectedEncoding() !== self.originalSelectedEncoding() ? self.selectedEncoding() : null
                    }
                }, function( err, res ) {
                    Y.doccirrus.utils.hideLoadingMask( self.mainNode );

                    if(err) {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            content: err.message,
                            level: 'ERROR'
                        } );
                        return;
                    }

                    self.originalSelectedEncoding( self.selectedEncoding() );

                    var results = res.data;
                    ko.utils.arrayForEach( self.configs(), function( item ) {
                        item.set( 'data', results.find( function( obj ) {
                            return obj.name === ko.unwrap( item.name );
                        } ) );
                        item.setNotModified();
                    } );
                    self.configsToDelete = [];
                    setMocking();
                } );
            }

            if(self.checkIfSettingsHaveChanged()) {
                Y.doccirrus.modals.OrthancRestartDialog.showDialog( save );
            } else {
                setMocking();
            }
        }
    } );

    return {
        registerNode: function( node ) {
            viewModel = new InPacsmodalityView({
                node: node.getDOMNode()
            });

            ko.applyBindings( viewModel, node.getDOMNode() );
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );

            // clear the viewModel
            if( viewModel ) {
                viewModel.destroy();
                viewModel = null;
            }

        }
    };
};