/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, $ */
/*exported fun */
fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel,
        viewModel = null,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        supportedDrivers = Y.doccirrus.schemas.settings.cardreader.drivers,
        pageData = Y.doccirrus.utils.getMojitBinderByType( 'DeviceMojit' ).mojitProxy.pageData.get( 'tab_cardreader' ),
        localDeviceServerName = '';

    pageData.port = window.location.port;
    pageData.protocol = window.location.protocol.slice( 0, -1 );

    function CardReaderDevicesTableModel( config ) {
        CardReaderDevicesTableModel.superclass.constructor.call( this, config );
    }

    Y.extend( CardReaderDevicesTableModel, KoViewModel.getBase(), {
            initializer: function CardReaderDevicesTableModel_initializer() {
                this.connectionStatus.readOnly( true );
                this.ds.readOnly( true );

                if( unwrap( this.ds ) !== localDeviceServerName ) {
                    this.name.readOnly( true );
                    this.driver.readOnly( true );
                    this.port.readOnly( true );
                    this.mobile.disabled = ko.observable( true );
                }
            },
            destructor: function CardReaderDevicesTableModel_destructor() {
            },
            save: function() {
                var
                    data = this.toJSON(),
                    promise;
                if( this.isNew() ) {
                    promise = Promise.resolve( Y.doccirrus.jsonrpc.api.cardreaderconfiguration.postAndReturn( {
                        data: data
                    } ) );
                } else {
                    promise = Promise.resolve( Y.doccirrus.jsonrpc.api.cardreaderconfiguration.update( {
                        query: {
                            _id: data._id
                        },
                        data: data,
                        model: 'cardreaderconfiguration',
                        fields: Object.keys( data )
                    } ) );
                }
                return promise;
            }
        },
        {
            schemaName: 'v_cardreaderconfiguration',
            NAME: 'CardReaderDevicesTableModel',
            ATTRS: {
                validatable: {
                    value: true,
                    lazyAdd: false
                },
                ignoreModificationsOn: {
                    value: [
                        'connectionStatus'
                    ],
                    cloneDefaultValue: true,
                    lazyAdd: false
                }
            }
        }
    );

    /**
     * This views ViewModel
     * @constructor
     */
    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getBase(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        doesCountryModeIncludeSwitzerland: function() {
            var self = this;
            if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                self.CH_countryMode( true );
            }
        },
        initViewModel: function() {
            var
                self = this;

            self.headerI18n = i18n( 'DeviceMojit.tab_cardreader.header.i18n' );
            self.macosHeaderI18n = i18n( 'DeviceMojit.tab_cardreader.instructions.macos.header.i18n' );
            self.macos1I18n = i18n( 'DeviceMojit.tab_cardreader.instructions.macos.1.i18n' );
            self.macos2I18n = Y.Lang.sub( i18n( 'DeviceMojit.tab_cardreader.instructions.macos.2.i18n' ), {
                'style-em': '<em>',
                '/style-em': '</em>',
                'link-driversTable': '<a data-bind="click: openDriverTable" class="drivers-table-link">',
                '/link-driversTable': '</a>'
            } );
            self.macos3I18n = Y.Lang.sub( i18n( 'DeviceMojit.tab_cardreader.instructions.macos.3.i18n' ), {
                'style-em': '<em>',
                '/style-em': '</em>',
                'link-deviceAdapter': '<a href="/inport#/serial" target="_blank">',
                '/link-deviceAdapter': '</a>'
            } );
            self.macos4I18n = i18n( 'DeviceMojit.tab_cardreader.instructions.macos.4.i18n' );
            self.windowsHeaderI18n = i18n( 'DeviceMojit.tab_cardreader.instructions.windows.header.i18n' );
            self.windows1I18n = i18n( 'DeviceMojit.tab_cardreader.instructions.windows.1.i18n' );
            self.windows2I18n = Y.Lang.sub( i18n( 'DeviceMojit.tab_cardreader.instructions.windows.2.i18n' ), {
                'style-em': '<em>',
                '/style-em': '</em>',
                'link-driversTable': '<a data-bind="click: openDriverTable" class="drivers-table-link">',
                '/link-driversTable': '</a>'
            } );
            self.windows3I18n = Y.Lang.sub( i18n( 'DeviceMojit.tab_cardreader.instructions.windows.3.i18n' ), {
                'style-em': '<em>',
                '/style-em': '</em>',
                'link-deviceAdapter': '<a href="/inport#/serial" target="_blank">',
                '/link-deviceAdapter': '</a>'
            } );
            self.windows4I18n = i18n( 'DeviceMojit.tab_cardreader.instructions.windows.4.i18n' );
            self.linuxHeaderI18n = i18n( 'DeviceMojit.tab_cardreader.instructions.linux.header.i18n' );
            self.linux1I18n = i18n( 'DeviceMojit.tab_cardreader.instructions.linux.1.i18n' );
            self.linux2I18n = i18n( 'DeviceMojit.tab_cardreader.instructions.linux.2.i18n' );
            self.linux3I18n = Y.Lang.sub( i18n( 'DeviceMojit.tab_cardreader.instructions.linux.3.i18n' ), {
                'style-em': '<em>',
                '/style-em': '</em>',
                'link-deviceAdapter': '<a href="/inport#/serial" target="_blank">',
                '/link-deviceAdapter': '</a>'
            } );
            self.linux4I18n = i18n( 'DeviceMojit.tab_cardreader.instructions.linux.4.i18n' );

            self.registerConnectionUrl = Y.Lang.sub( 'http://localhost:8888/cardreader/register?ips={ips}&protocol={protocol}&port={port}&tenant={tenant}&noRedirect=1', pageData );

            self.cardreadersToDelete = [];
            self.configurations = self.get( 'configurations' );
            self.numberOfRows = self.get( 'numberOfRows' );
            self.deviceServerName = self.get( 'ds' );
            self.deviceServerVersion = self.get( 'deviceServerVersion' );

            self.CH_countryMode = ko.observable( false );

            self.initCardReaderDevicesTable();
            self.initSaveButton();
            self.initPortSearchButton();
            self.doesCountryModeIncludeSwitzerland();
            self.initConfProgramButton();
        },
        initCardReaderDevicesTable: function() {
            var
                self = this;
            var
                columnDefinition = [
                    {
                        forPropertyName: 'connectionStatus',
                        label: i18n( 'cardreaderconfiguration-schema.cardreaderconf.connectionStatus' ).i18n,
                        width: '50px',
                        renderer: function( meta ) {
                            var
                                value = unwrap( meta.value ),
                                color;

                            if( value === 'connected' ) {
                                color = 'dc-green';
                            } else if( value === 'disconnected' ) {
                                color = 'dc-red';
                            } else if( value === 'error' ) {
                                color = 'dc-orange';
                            } else {
                                color = 'dc-grey';
                            }

                            return "<div class='text-center'><i class='fa fa-circle " + color + "'</div>";
                        }
                    },
                    {
                        forPropertyName: 'name',
                        label: i18n( 'cardreaderconfiguration-schema.cardreaderconf.name' ).i18n
                    },
                    {
                        forPropertyName: 'driver',
                        label: i18n( 'cardreaderconfiguration-schema.cardreaderconf.driver' ).i18n,
                        inputField: {
                            componentType: 'KoFieldSelect2',
                            componentConfig: {
                                options: supportedDrivers,
                                optionsText: 'i18n',
                                optionsValue: 'val',
                                select2Config: {
                                    multiple: false
                                }
                            }
                        }
                    },
                    {
                        forPropertyName: 'port',
                        label: i18n( 'cardreaderconfiguration-schema.cardreaderconf.port' ).i18n
                    },
                    {
                        forPropertyName: 'ds',
                        label: i18n( 'cardreaderconfiguration-schema.cardreaderconf.deviceServer' ).i18n,
                        width: '150px',
                        css: {
                            'text-center': 1
                        }
                    },
                    {
                        componentType: 'KoEditableTableCheckboxColumn',
                        forPropertyName: 'mobile',
                        label: i18n( 'cardreaderconfiguration-schema.cardreaderconf.mobile' ).i18n,
                        title: 'checkbox',
                        width: '50px',
                        css: {
                            'text-center': 1
                        }
                    },
                    {
                        forPropertyName: 'testCardreader',
                        label: i18n( 'cardreaderconfiguration-schema.cardreaderconf.testCardreader' ).i18n,
                        utilityColumn: true,
                        width: '60px',
                        css: {
                            'text-center': 1
                        },
                        inputField: {
                            componentType: 'KoButton',
                            componentConfig: {
                                name: 'test',
                                title: i18n( 'general.button.TEST' ),
                                icon: 'TACHOMETER',
                                getDisabled: function( context ) {
                                    return ko.computed( function() {
                                        var
                                            isValid = context.$parent.row.isValid() && unwrap( context.$parent.row.ds ) === localDeviceServerName;
                                        return !isValid;
                                    } );
                                },
                                click: function( button, $event, $context ) {
                                    var portToTest = parseInt( unwrap( $context.$parent.row.port ) ); //eslint-disable-line
                                    var driver = unwrap( $context.$parent.row.driver );
                                    var callID = "";

                                    Y.doccirrus.communication.apiCall( {
                                        method: 'dscrmanager.testPortAvailability',
                                        data: {
                                            port: portToTest,
                                            driver: driver,
                                            callID: callID
                                        }
                                    }, function( err, res ) {
                                        if( err ) {
                                            $context.$parent.row.connectionStatus( 'error' );
                                            return;
                                        }

                                        if( res.data.isAvailable ) {
                                            $context.$parent.row.connectionStatus( 'connected' );
                                        } else {
                                            $context.$parent.row.connectionStatus( 'disconnected' );
                                        }
                                    } );
                                }
                            }
                        }
                    },
                    {
                        forPropertyName: 'delete',
                        label: i18n( 'cardreaderconfiguration-schema.cardreaderconf.delete' ).i18n,
                        utilityColumn: true,
                        width: '60px',
                        css: {
                            'text-center': 1
                        },
                        inputField: {
                            componentType: 'KoButton',
                            componentConfig: {
                                name: 'test',
                                title: i18n( 'general.button.DELETE' ),
                                icon: 'TRASH_O',
                                click: function( button, $event, $context ) {
                                    var
                                        rowModel = $context.$parent.row,
                                        formatted = rowModel.toJSON();

                                    if( formatted._id ) {
                                        self.cardreadersToDelete.push( formatted._id );
                                    }

                                    self.cardReaderDevicesTable.removeRow( rowModel );
                                }
                            }
                        }
                    }
                ];

            // in Swiss mode we always have Smart cards, i.e. PCSC cardreaders, and no drivers.
            if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                columnDefinition = columnDefinition.filter( function( col ) {
                    return Boolean(
                        col.forPropertyName !== 'driver' &&
                        col.forPropertyName !== 'testCardreader' &&
                        col.forPropertyName !== 'port'
                    );
                } );

                self.onlyOneCardReaderPerDeviceServer = ko.observable(
                    self.configurations.filter( function( elem ) {
                        return elem && elem.ds === localDeviceServerName;
                    } ).length
                );
            }

            self.cardReaderDevicesTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                stateId: 'cardReaderDevicesTable',
                componentConfig: {
                    stateId: 'cardReaderDevicesTable',
                    ViewModel: CardReaderDevicesTableModel,
                    defaultViewModelData: {
                        data: {
                            driver: supportedDrivers[0],
                            name: '',
                            port: 0,
                            mobile: false,
                            ds: self.get( 'ds' )
                        }
                    },
                    data: self.configurations.map( function( item ) {
                        return {data: item};
                    } ),
                    columns: columnDefinition,
                    onAddButtonClick: function() {
                        if( self.deviceServerName && self.deviceServerVersion >= '1.1.0' ) {
                            return true;
                        } else {
                            if( self.deviceServerName && self.deviceServerVersion < '1.1.0' ) {
                                Y.doccirrus.modals.deviceServerWarningModal.show( 'version' );
                                return false;
                            } else {
                                Y.doccirrus.modals.deviceServerWarningModal.show( 'status' );
                                return false;
                            }
                        }
                    },
                    selectMode: 'none',
                    isAddRowButtonDisabled: Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ? self.onlyOneCardReaderPerDeviceServer : function () { return false; }
                }
            } );

            if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                self.cardReaderDevicesTable.rows.subscribe( function( newVal ) {
                    if( newVal.length ) {
                        self.onlyOneCardReaderPerDeviceServer(
                            newVal.filter( function( elem ) {
                                return elem && elem.ds() === localDeviceServerName;
                            } ).length
                        );
                    } else {
                        self.onlyOneCardReaderPerDeviceServer( false );
                    }
                } );
            }
        },
        initSaveButton: function() {
            var
                self = this;

            self.saveBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'SAVE_BTN',
                    option: 'PRIMARY',
                    size: 'SMALL',
                    disabled: ko.computed( function() {
                        var
                            isValid = true,
                            isModified = false;
                        unwrap( self.cardReaderDevicesTable.rows ).forEach( function( configurationModel ) {
                            isValid = isValid && configurationModel.isValid();
                            isModified = isModified || configurationModel.isModified();
                        } );

                        if( unwrap( self.cardReaderDevicesTable.rows ).length !== self.numberOfRows ) {
                            isModified = true;
                            self.numberOfRows = unwrap( self.cardReaderDevicesTable.rows ).length;
                        }

                        return !isValid || !isModified;
                    } ),
                    text: i18n( 'general.button.SAVE' ),
                    click: function() {
                        self.saveConfigurations();
                    }
                }
            } );
        },
        initPortSearchButton: function() {
            var self = this;

            self.portSearchBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'SAVE_BTN',
                    option: 'PRIMARY',
                    size: 'SMALL',
                    text: i18n( 'cardreaderconfiguration-schema.utilsButtons.scanPorts' ).i18n,
                    click: function() {
                        if( self.deviceServerName && self.deviceServerVersion >= '1.1.0' ) {
                            Y.doccirrus.modals.portScanModal.show();
                        } else {
                            if( self.deviceServerName && self.deviceServerVersion < '1.1.0' ) {
                                Y.doccirrus.modals.deviceServerWarningModal.show( 'version' );
                            } else {
                                Y.doccirrus.modals.deviceServerWarningModal.show( 'status' );
                            }
                        }
                    }
                }
            } );
        },
        initConfProgramButton: function() {
            var self = this;

            self.confProgramBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'SAVE_BTN',
                    option: 'PRIMARY',
                    size: 'SMALL',
                    text: i18n( 'cardreaderconfiguration-schema.utilsButtons.confProgramButton' ).i18n,
                    click: function() {
                        Y.doccirrus.modals.confprogramModal.show();
                    }
                }
            } );
        },
        saveConfigurations: function() {
            var self = this;

            Promise.mapSeries( peek( self.cardReaderDevicesTable.rows ), function( item ) {
                if( item.isModified() ) {
                    return item.save()
                        .then( function( data ) {
                            item.set( 'data', data );
                            item.setNotModified();
                        } );
                }
                return;
            } ).then( function() {
                Y.doccirrus.jsonrpc.api.cardreaderconfiguration.deleteConfigurations( {query: {_id: {$in: self.cardreadersToDelete}}} )
                    .done( function() {
                    } );
            } ).catch( function( error ) {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );
        },
        configurationTitle: i18n( 'cardreaderconfiguration-schema.general.configurationTitle' ).i18n,
        inOutLicensed: Y.doccirrus.auth.hasAdditionalService( "inOut" ),
        legacyButton: i18n( 'cardreaderconfiguration-schema.general.legacyButton' ),
        switchCardreader: function() {
            Y.mojito.binders.DeviceNavigationBinderIndex.handleCrSwitch();
        },
        openDriverTable: function() {
            $( '#drivers-body' ).collapse( 'toggle' );
            $( 'html,body' ).animate( {
                    scrollTop: $( "#drivers-collapse" ).offset().top
                },
                'slow' );
        }
    }, {
        schemaName: 'settings',
        ATTRS: {
            configurations: {
                value: [],
                lazyAdd: false
            },
            numberOfRows: {
                value: 0,
                lazyAdd: false
            },
            ds: {
                value: '',
                lazyAdd: false
            },
            deviceServerVersion: {
                value: '',
                lazyAdd: false
            }
        }
    } );

    return {
        registerNode: function( node ) {
            Y.doccirrus.jsonrpc.api.cardreaderconfiguration.getCardreaderConfiguration()
                .done( function( response ) {
                    localDeviceServerName = response.data.localDeviceServerName;
                    viewModel = new ViewModel( {
                        configurations: response.data.configurations,
                        numberOfRows: response.data.configurations.length,
                        ds: response.data.localDeviceServerName,
                        deviceServerVersion: response.data.localDeviceServerVersion
                    } );
                    ko.applyBindings(
                        viewModel,
                        node.getDOMNode()
                    );
                } );
        },

        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};
