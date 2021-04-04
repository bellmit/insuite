/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, YUI, $, ko, async */ // eslint-disable-line
'use strict';

fun = function _fn( Y/*, NAME*/ ) {
    var
        i18n = Y.doccirrus.i18n,
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoViewModel = Y.doccirrus.KoViewModel,
        deviceConfig;

    function DeviceConfigModel( config ) {
        DeviceConfigModel.superclass.constructor.call( this, config );
    }

    function mapEntryToTreeNode( entry ) {
        return {
            id: entry._id,
            text: entry.title,
            entry: entry,
            children: false
        };
    }

    function createGetData( api ) {
        return function() {
            return new Promise( function( resolve, reject ) {
                var query = {};
                api( {
                    query: query,
                    options: {
                        sort: {
                            title: 1
                        }
                    }
                } )
                    .then( function( response ) {
                        return (response && response.data || []).map( mapEntryToTreeNode );
                    } )
                    .then( resolve )
                    .fail( function( response ) {
                        reject( response );
                    } );
            } );
        };
    }

    Y.extend( DeviceConfigModel, Disposable, {
        initializer: function DeviceConfigModel_initializer() {
            var
                self = this;

            self.initDeviceConfig();

        },
        /**
         * @property configurations
         * @type {ko.observableArray}
         */
        configurations: null,
        /**
         * @property sources
         * @type {ko.observableArray}
         */
        sources: null,
        /**
         * @property transformers
         * @type {ko.observableArray}
         */
        transformers: null,
        /**
         * @property sinks
         * @type {ko.observableArray}
         */
        sinks: null,
        /**
         * @property deleted
         * @type {ko.observableArray}
         */
        deleted: null,
        /**
         * instance of Flow model
         * @property activeConfig
         * @type {Object}
         */
        activeConfig: null,
        /**
         * enables/disables save button
         * @property saveEnabled
         * @type {ko.observable}
         */
        saveEnabled: null,
        /**
         * @property removeConfig
         * @type {Function}
         */
        removeConfig: null,
        /**
         * @property activateConfig
         * @type {Function}
         */
        activateConfig: null,
        /**
         * @property testConfig
         * @type {Function}
         */
        testConfig: null,
        /**
         * @property refresh
         * @type {Function}
         */
        refresh: null,
        /**
         * @property save
         * @type {Function}
         */
        save: null,
        /**
         * @property addConfig
         * @type {Function}
         */
        addConfig: null,
        /**
         * @property addSourceToConfig
         * @type {Function}
         */
        addSourceToConfig: null,
        /**
         * @property addTransformerToConfig
         * @type {Function}
         */
        addTransformerToConfig: null,
        /**
         * @property addSinkToConfig
         * @type {Function}
         */
        addSinkToConfig: null,
        /**
         * @property
         * @type
         */
        enableSmb: false,
        smbpassword: ko.observable(),
        /**
         * Initializes device config model
         * @method initDeviceConfig
         */
        initDeviceConfig: function DeviceConfigModel_initDeviceConfig() {
            var
                self = this;

            self.sourcesI18n = i18n( 'DeviceMojit.tab_devices.title.SOURCES' );
            self.transformersI18n = i18n( 'DeviceMojit.tab_devices.title.TRANSFORMERS' );
            self.sinksI18n = i18n( 'DeviceMojit.tab_devices.title.SINKS' );
            self.addConfigI18n = i18n( 'DeviceMojit.tab_devices.title.ADD_CONFIG' );
            self.buttonSaveI18n = i18n( 'general.button.SAVE' );
            self.testI18n = i18n( 'DeviceMojit.tab_devices.title.TEST' );
            self.refreshI18n = i18n( 'DeviceMojit.tab_devices.title.REFRESH' );
            self.passwordI18n = i18n( 'DeviceMojit.tab_devices.smb_password_MODAL.password' );

            self.configurations = ko.observableArray();

            self.sources = ko.observableArray();
            self.transformers = ko.observableArray();
            self.sinks = ko.observableArray();

            self.initControlButtons();
            self.initAddHandlers();
            self.loadInitData();
        },
        /**
         * Initializes all control buttons
         * @method initControlButtons
         */
        initControlButtons: function DeviceConfigModel_initControlButtons() {
            var
                self = this;
            self.deleted = ko.observableArray();

            self.removeConfig = function( data ) {
                if( data._id && data._id() ) {
                    self.deleted.push( data );
                }
                self.configurations.remove( data );
                self.activeConfig = null;
            };

            self.changeConfig = function( flowModel ){
                Y.doccirrus.modals.flowModal.showModal( flowModel.toJSON(), function( data ) {
                    flowModel.set( 'data', data );
                } );
            };

            self.activateConfig = function( data ) {
                if( self.activeConfig ) {
                    self.activeConfig.active( false );
                }
                data.active( true );
                self.activeConfig = data;
            };

            self.testConfig = function() {
                if( self.activeConfig && self.activeConfig._isValid() ) {

                    self.testConfig.enabled( false );
                    self.activeConfig.test().done( function() {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'success',
                            message: i18n( 'DeviceMojit.tab_devices.message.TEST_SUCCESS' )
                        } );
                    } ).fail( function( error ) {
                        if ( error.data && "object" === typeof error.data ) {
                            try {
                                error.data = JSON.stringify(error.data, null,"    ").replace(/\n/g,"<br>");
                            } catch (e) {
                                // not fail on json errors
                            }
                        }
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } ).always( function() {
                        self.testConfig.enabled( true );
                    } );
                } else {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        message: i18n( 'DeviceMojit.tab_devices.message.INVALID_FLOW_TEST' )
                    } );
                }
            };
            self.testConfig.enabled = ko.observable( true );

            self.refresh = function() {
                self.configurations.removeAll();
                self.loadConfigurations();
            };
            self.saveEnabled = ko.observable();

            self.addDisposable( ko.computed( function() {
                var
                    configurations = self.configurations(),
                    valid = true,
                    modified = true;
                configurations.forEach( function( config ) {
                    var
                        isModified = config.isModified(),
                        isValid = config._isValid();

                    modified = modified || isModified;
                    valid = valid && isValid;
                } );
                self.saveEnabled( valid && modified );
            } ) );

            self.save = function() {
                var
                    configurations = ko.utils.peekObservable( self.configurations ),
                    deleted = ko.utils.peekObservable( self.deleted );
                self.saveEnabled( false );
                async.parallel( [
                    function( done ) {
                        async.eachSeries( deleted, function( flowModel, next ) {
                            flowModel.remove()
                                .done( function() {
                                    next();
                                } )
                                .fail( function( err ) {
                                    next( err );
                                } );
                        }, function( err ) {
                            self.deleted.removeAll();
                            done( err );
                        } );
                    },
                    function( done ) {
                        async.eachSeries( configurations, function( flowModel, next ) {
                            if( flowModel.isModified() && flowModel._isValid() ) {
                                flowModel.save()
                                    .done( function() {
                                        flowModel.setNotModified();
                                        next();
                                    } )
                                    .fail( function( err ) {
                                        next( err );
                                    } );
                            } else {
                                return next();
                            }
                        }, done );
                    }
                ], function( error ) {
                    self.saveEnabled( true );
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    if( !error ) {
                        Y.doccirrus.jsonrpc.api.flow.resetSerial();
                        Y.doccirrus.DCWindow.notice( {
                            type: 'success',
                            message: i18n( 'general.message.CHANGES_SAVED' )
                        } );
                        self.refresh();
                    }
                } );
            };
        },
        /**
         * Initializes add buttons
         * @method initAddHandlers
         */
        initAddHandlers: function DeviceConfigModel_initAddHandlers() {
            var
                self = this;
            self.addConfig = function() {
                Y.doccirrus.modals.flowModal.showModal( {}, function( data ) {
                    self.addFlow( data );
                } );
            };
            self.addSourceToConfig = function( data ) {
                if( self.activeConfig ) {
                    self.activeConfig.sources.removeAll();
                    self.activeConfig.sources.push( data );
                }
            };
            self.addTransformerToConfig = function( data ) {
                self.activeConfig.transformers.push( data );
            };
            self.addSinkToConfig = function( data ) {
                if( self.activeConfig ) {
                    self.activeConfig.sinks.removeAll();
                    self.activeConfig.sinks.push( data );
                }
            };

        },
        /**
         * Adds flow to device config
         * @method addFlow
         * @param {Object} [data] flow data
         */
        addFlow: function( data ) {
            var
                self = this,
                config = new KoViewModel.createViewModel( { NAME: 'FlowModel', config: { data: data }} );
            self.activateConfig( config );
            self.configurations.push( config );

        },
        /**
         * Loads initial data for device config
         * @method loadInitData
         */
        loadInitData: function DeviceConfigModel_loadInitData() {
            var
                self = this;
            self.loadConfigurations();
            self.loadSources();
            self.loadTransformers();
            self.loadSinks();
        },
        /**
         * Loads all flows
         * @method loadConfigurations
         */
        loadConfigurations: function DeviceConfigModel_loadConfigurations() {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.flow.read()
                .done( function( response ) {
                    var configurations;
                    if( response && response.data ) {
                        response.data.forEach( function( config ) {
                            self.addFlow( config );
                        } );
                    }
                    configurations = ko.utils.peekObservable( self.configurations );
                    configurations.forEach( function( flowModel ) {
                        flowModel.set( 'data', flowModel.toJSON() );
                        flowModel.setNotModified();
                    } );
                    self.saveEnabled( false );
                } );
        },
        /**
         * Loads all available sources
         * @method loadSources
         */
        loadSources: function DeviceConfigModel_loadSources() {
            var
                self = this,
                sources = Y.doccirrus.schemas.flow.getSources();
            sources.forEach( function( data ) {
                self.sources.push( data );
            } );
        },
        /**
         * Loads all available transformers
         * @method loadTransformers
         */
        loadTransformers: function DeviceConfigModel_loadTransformers() {
            var
                self = this,
                transformers = Y.doccirrus.schemas.flow.getTransformers();
            transformers.forEach( function( data ) {
                self.transformers.push( data );
            } );
        },
        /**
         * Loads all available sinks
         * @method loadSinks
         */
        loadSinks: function DeviceConfigModel_loadSinks() {
            var
                self = this,
                sinks = Y.doccirrus.schemas.flow.getSinks();
            sinks.forEach( function( data ) {
                self.sinks.push( data );
            } );
        },
        setSmbPassword: function DeviceConfigModel_setSmbPassword() {
            var
                self = this,
                modal;
            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( { path: 'DeviceMojit/views/smbpassword_modal' } )
            ).then( function( response ) {
                return response && response.data;
            } ).then( function( template ) {
                var
                    bodyContent = Y.Node.create( template ),
                    aDCWindowResizeEvent;

                modal = new Y.doccirrus.DCWindow( {
                    bodyContent: bodyContent,
                    title: i18n('DeviceMojit.tab_devices.smb_password_MODAL.title' ),
                    width: '30%',
                    height: '30%',
                    minHeight: Y.doccirrus.DCWindow.SIZE_LARGE,
                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CLOSE' ),
                            Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                isDefault: true,
                                action: function( e ) {
                                    modal.close( e );
                                    self.enableSmb = true;
                                    Y.doccirrus.jsonrpc.api.smb.addUserPassword({
                                        query: {
                                            'password': self.smbpassword()
                                        }
                                    }
                                    ).fail( function( err ){
                                        self.enableSmb = false;
                                        Y.doccirrus.DCWindow.notice( {
                                            type: 'error',
                                            message: err.message
                                        } );
                                    }
                                    );
                                }
                            } )

                        ]
                    },
                    after: {
                        destroy: function() {
                            if( aDCWindowResizeEvent ) {
                                aDCWindowResizeEvent.detach();
                            }
                        }
                    }
                } );

                ko.applyBindings( new DeviceConfigModel(), bodyContent.getDOMNode() );
            } );
        },

        showExportImportDialog: function() {

            var
                self = this,
                node = Y.Node.create( '<div></div>' ),
                importExportModel = new Y.doccirrus.RuleImportExport.create( {
                    exportConfig: {
                        resolver: createGetData( Y.doccirrus.jsonrpc.api.flowimportexport.listSetOnDB ),
                        enableDragDrop: false
                    },
                    importConfig: {
                        resolver: createGetData( Y.doccirrus.jsonrpc.api.flowimportexport.listSetOnDisk ),
                        enableDragDrop: false
                    },
                    jsonRpcApiImportExport: Y.doccirrus.jsonrpc.api.flowimportexport,
                    metaDataFileName: 'flows_meta.json',
                    fileNamePrefix: 'flows-'
                } ),
                importExportWindow = null,
                downloadDisabled;// eslint-disable-line

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'RuleImportExport',
                'IncaseAdminMojit',
                {},
                node,
                function templateLoaded() {
                    importExportWindow = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-Flow-Import-Export',
                        bodyContent: node,
                        title: i18n( 'DeviceMojit.tab_devices.import_export.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_WARN,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: Y.doccirrus.DCWindow.SIZE_LARGE,
                        minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                        centered: true,
                        maximizable: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CLOSE' ),
                                {
                                    name: 'downloadRules',
                                    classNames: 'btn-primary',
                                    label: i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.DOWNLOAD_ARCHIVE' ),
                                    action: function() {
                                        importExportModel.downloadArchive();
                                    }
                                },
                                {
                                    name: 'uploadRules',
                                    template: '<button type="button" />',
                                    classNames: 'btn-primary',
                                    label: i18n( 'IncaseAdminMojit.rules.RuleImportExport.buttons.UPLOAD_ARCHIVE' ),
                                    action: function() {
                                        importExportModel.uploadArchive();
                                    }
                                }
                            ]
                        },
                        after: {
                            visibleChange: function() {
                                importExportModel.dispose();
                                self.configurations([]);
                                self.loadConfigurations();
                            }
                        }
                    } );

                    // Since I can't found the possibility to create the buttons already with an icons, add the icons after the buttons are added.
                    var downloadRulesBtn = $( 'button[name=downloadRules]' ),
                        uploadRulesBtn = $( 'button[name=uploadRules]' );

                    downloadRulesBtn.html( '<i class="fa fa-chevron-circle-down"></i> ' + downloadRulesBtn.html() );
                    uploadRulesBtn.html( '<i class="fa fa-chevron-circle-up"></i> ' + uploadRulesBtn.html() );

                    downloadDisabled = ko.computed( function() {
                        var
                            download = importExportWindow.getButton( 'downloadRules' ).button,
                            children = importExportModel.importTree.root.children();

                        if( 0 === children.length ) {
                            download.disable();
                        } else {
                            download.enable();
                        }
                    } );

                    ko.applyBindings( importExportModel, node.getDOMNode() );
                }
            );
        }
    } );

    return {

        registerNode: function() {
            deviceConfig = new DeviceConfigModel();

            setTimeout( function() {
                Y.doccirrus.communication.emit( 'sd.cleanupDevices', {tenant: Y.doccirrus.utils.getMojitBinderByType( 'DeviceMojit' ).mojitProxy.pageData.get( 'tenant' )} );
            }, 500 );
            Y.doccirrus.uam.utils.initDCPanels();

            ko.applyBindings( deviceConfig, document.querySelector( '#deviceConfig' ) );
        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

        }
    };
};
