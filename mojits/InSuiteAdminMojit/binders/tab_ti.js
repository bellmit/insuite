/**
 * User: oliversieweke
 * Date: 10.04.18  16:55
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global fun:true, ko, _ */
/*exported fun */

fun = function _fn(Y) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel,
        viewModel = null;

    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getBase(), {
        initializer: function() {
            var
                self = this;

            self.tiConfigurationsTableTitle = i18n( 'InTiMojit.tiConfigurations.tableTitle.i18n' );
            self.connectorConnectionTitle = i18n( 'InTiMojit.tiConfigurations.connectorConnectionTitle.i18n' );
            self.connectorFQDNTitle = i18n( 'InTiMojit.tiConfigurations.connectorFQDNTitle.i18n' );
            self.certificateTitle = i18n( 'InTiMojit.tiConfigurations.certificateTitle.i18n' );
            self.currentCertificateI18n = i18n( 'InTiMojit.tiConfigurations.currentCertificate.i18n' );
            self.noCertificateI18n = i18n( 'InTiMojit.tiConfigurations.noCertificate.i18n' );
            self.configurationParametersHeaderI18n = i18n( 'InTiMojit.tiConfigurations.configurationParametersTitle.i18n' );
            // self.clientCertificatePasswordI18n = i18n( 'InTiMojit.tiConfigurations.clientCertificatePassword.i18n' ); // PASSPHRASE: uncomment here if a passphrase is needed
            self.connectionProtocolTitle = i18n( 'InTiMojit.tiConfigurations.connectionProtocolTitle.i18n' );
            self.statusHeaderI18n = i18n( 'InTiMojit.status.header' );
            self.TiStatusI18n = i18n( 'InTiMojit.status.TiStatus' );
            self.SisStatusI18n = i18n( 'InTiMojit.status.SisStatus' );
            self.servicesHeaderI18n = i18n( 'InTiMojit.services.header' );
            self.versionsSupportedI18n = i18n( 'InTiMojit.services.versionsSupported' );
            self.onlineCheckHeaderI18n = i18n( 'InTiMojit.onlineCheck.header' );
            self.noContextI18n = i18n( 'InTiMojit.noContext' );
            self.noSmcbI18n = i18n( 'InTiMojit.noSmcb' );
            self.pinOperationsHeaderI18n = i18n( 'InTiMojit.pinOperationsHeader.i18n' );
            // Hint Messages
            self.pinOperationsHintI18n = i18n('InTiMojit.hintMessages.pinOperations');
            self.connectorConnectionHintI18n = i18n('InTiMojit.hintMessages.connectorConnection');
            self.ldapConnectionHintI18n = i18n('InTiMojit.hintMessages.ldapConnection');
            self.statusHintI18n = i18n('InTiMojit.hintMessages.status');
            self.servicesHintI18n = i18n('InTiMojit.hintMessages.services');
            self.onlineCheckHintI18n = i18n('InTiMojit.hintMessages.onlineCheck');
            self.configurationParametersHintI18n = i18n('InTiMojit.hintMessages.configurationParameters');
            // Configuration table messages
            self.configurationError = i18n( 'InTiMojit.tiConfigurations.error.i18n' );
            self.configurationWarning = i18n( 'InTiMojit.tiConfigurations.warning.i18n' );
            self.configurationSuccess = i18n( 'InTiMojit.tiConfigurations.success.i18n' );
            /**
             *   ldap connection for KIM "Verzeichnisdienst"
             */
            self.ldapFQDNTitle = i18n( 'InTiMojit.tiConfigurations.ldapFQDNTitle.i18n' );
            self.ldapHeadingTitle = i18n( 'InTiMojit.tiConfigurations.ldapHeadingTitle.i18n' );
            // Contexts
            self.contextInfos = ko.observableArray(self.get('contextInfos'));
            self.selectedContextInfo = ko.observable();
            // PIN


            // Connector Connection
            self.connectorFQDN = ko.observable();
            self.connectionProtocol = ko.observable();
            self.certificateName = ko.observable();
            self.certificateName.hasError = ko.observable(true);
            self.certificateName.messages = ko.observableArray([i18n( 'InTiMojit.tiConfigurations.pleaseAddCertificate.i18n' )]);


            // self.clientCertificatePassword = ""; // PASSPHRASE: uncomment here if a passphrase is needed
            // Ti Status
            self.vpnTiStatus = ko.observable(self.get('vpnTiStatus'));
            self.vpnSisStatus = ko.observable(self.get('vpnSisStatus'));
            self.versionsSupported = ko.observable(self.get('versionsSupported'));
            // Online Check
            self.modeOnlineCheck = ko.observable();
            self.modeOnlineCheckOptions = ko.observableArray();
            // SMCBs
            self.selectedCardHandle = ko.observable();
            self.cards = ko.computed(function() {
                if (self.selectedContextInfo() && self.selectedContextInfo().SMCBCards) {
                    return self.selectedContextInfo().SMCBCards;
                } else {
                    return [];
                }
            });

            //PinTyp
            self.selectedPinTyp = ko.observable();
            self.pinTyp = ko.observableArray([]);
            self.addDisposable( ko.computed( function() {
                var
                    selectedCardHandle = ko.unwrap( self.selectedCardHandle),
                    smcbs = ko.unwrap(self.cards),
                    selectedCard = smcbs.filter(function(el){
                        return el.CardHandle === selectedCardHandle;
                    }),
                    pinTypArray = [{
                        display: 'CH',
                        value: 'PIN.CH' // default eGK, only
                    },{
                        display: 'SMC',
                        value: 'PIN.SMC' // default SMC, first two
                    },{
                        display: 'QES',
                        value: 'PIN.QES' // default for HBA, all 3
                    }];
                if (selectedCard.length){

                    if('SMC-B' === selectedCard[0].CardType){
                        self.pinTyp( [ pinTypArray[0], pinTypArray[1]]);
                        self.selectedPinTyp('PIN.SMC');
                    } else if('HBA' === selectedCard[0].CardType){
                        self.pinTyp([pinTypArray[0], pinTypArray[2]]);
                        self.selectedPinTyp('PIN.QES');
                    } else {
                        self.pinTyp([pinTypArray[0]]);
                    }
                } else {
                    return [];
                }
            }));

            self.availablePinOperations = ko.observableArray([
                {
                    method: 'GetPinStatus',
                    name: i18n( 'InTiMojit.pinOperationHeader.GetPinStatus' ).i18n,
                    modalMessage: i18n( 'InTiMojit.pinOperationInitialMessage.getPinStatus' ).i18n,
                    disabled: ko.observable(false)
                },
                {
                    method: 'VerifyPin',
                    name: i18n( 'InTiMojit.pinOperationHeader.VerifyPin' ).i18n,
                    modalMessage: i18n( 'InTiMojit.pinOperationInitialMessage.verifyPin' ).i18n,
                    disabled: ko.computed(function(){
                        var
                            selectedCardHandle = ko.unwrap( self.selectedCardHandle),
                            smcbs = ko.unwrap(self.cards),
                            selectedPinTyp=  ko.unwrap(self.selectedPinTyp ),
                            selectedCard = smcbs.filter(function(el){
                                return el.CardHandle === selectedCardHandle;
                            });
                        if (selectedCard.length) {
                            if( 'HBA' === selectedCard[0].CardType && selectedPinTyp === 'PIN.QES') {
                                return true;
                            }
                        }
                        return false;
                    })

                },
                {
                    method: 'ChangePin',
                    name: i18n( 'InTiMojit.pinOperationHeader.ActivatePin' ).i18n,
                    modalMessage: i18n( 'InTiMojit.pinOperationInitialMessage.activatePin' ).i18n,
                    disabled: ko.observable(false)
                },
                {
                    method: 'ChangePin',
                    name: i18n( 'InTiMojit.pinOperationHeader.ChangePin' ).i18n ,
                    modalMessage: i18n( 'InTiMojit.pinOperationInitialMessage.activatePin' ).i18n,
                    disabled: ko.observable(false)
                },
                {
                    method: 'UnblockPin',
                    name: i18n( 'InTiMojit.pinOperationHeader.UnblockPin' ).i18n,
                    modalMessage: i18n( 'InTiMojit.pinOperationInitialMessage.unblockPin' ).i18n,
                    disabled: ko.observable(false)
                }
            ]);
            /**
             *   ldap connection for KIM "Verzeichnisdienst"
             */
            self.ldapFQDN = ko.observable();

            self.initViewModel();
        },
        destructor: function() {},
        initViewModel: function() {
            var
                self = this;

            self.getVpnStatus();
            self.getServicesStatus();
            self.getContextInfos();
            self.getConnectorSettings();
            self.initCertificateUploader();
            self.initTiConfigurationsTable();
        },
        getVpnStatus: function() {
            var
                self = this;

            self.vpnTiStatusColor = ko.computed(function() {
                if ( self.vpnTiStatus() ) {
                    return self.vpnTiStatus() === 'Online' ? 'dc-green' : 'dc-red';
                }
            });
            self.vpnSisStatusColor = ko.computed(function() {
                if ( self.vpnSisStatus() ) {
                    return self.vpnSisStatus() === 'Online' ? 'dc-green' : 'dc-red';
                }
            });
        },
        getServicesStatus: function() {
            var
                self = this;

            self.servicesStatusColor = ko.computed(function() {
                if ( self.versionsSupported() !== null ) {
                    return self.versionsSupported() ? 'dc-green' : 'dc-red';
                }
            });
        },

        getContextInfos: function() {
            var
                self = this,
                contextInfos = self.contextInfos();

            self.contextInfos(contextInfos.map(function( contextInfo ) {
                contextInfo.contextWithCtId = contextInfo.context;
                contextInfo.contextWithCtId.CtId = contextInfo.CtId;
                return contextInfo;
            }));

        },
        displayCardTerminal: function(contextInfo) {
            return contextInfo.tiCardReaderName + ' ( ' + contextInfo.workStationName + ' | ' + contextInfo.organisationalUnitName + ')';
        },

        sendPinOperation: function(viewModel) {
            var methodToCall = viewModel.method;
            var modalMessage = viewModel.modalMessage;

            Object.assign( this.selectedContextInfo().context, {UserId: Y.doccirrus.auth.getUserId()});
            Y.doccirrus.modals.pinOperationModal.show({
                modalMessage: modalMessage,
                methodToCall: methodToCall,
                context: this.selectedContextInfo().context,
                CtId: this.selectedContextInfo().CtId,
                CardHandle: this.selectedCardHandle(),
                PinTyp: this.selectedPinTyp()
            });
        },

        getConnectorSettings: function() {
            var
                self = this;

            Y.doccirrus.jsonrpc.api.timanager.getModeOnlineCheckOptions()
                .done( function( res ) {
                    return self.modeOnlineCheckOptions( res.data );
                } )
                .fail( function( err ) {
                    Y.log( 'Could not get Model Online Check options: ' + err, 'debug', "tab_ti" );
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                } );

            Y.doccirrus.jsonrpc.api.tisettings.read( {
                options: {
                    select: {
                        connectorFQDN: 1,
                        connectionProtocol:1,
                        clientCertificateName: 1,
                        modeOnlineCheck: 1
                    }
                }
            }).done(function( res ) {
                var
                    settings = res && res.data && res.data[0] || {};

                self.connectorFQDN(settings.connectorFQDN || '');
                self.connectionProtocol(settings.connectionProtocol || 'HTTPS');
                self.certificateName(settings.clientCertificateName || self.noCertificateI18n);
                self.modeOnlineCheck(settings.modeOnlineCheck || '');
                self.ldapFQDN(settings.ldapFQDN || '');
            }).fail(function(err) {
                Y.log( 'Could not get connector settings: ' + err, 'debug', "tab_ti" );
                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                self.connectorFQDN();
                self.connectionProtocol();
                self.modeOnlineCheck();
            });

            self.saveConnectorFQDNButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'saveConnectorFQDN',
                    text: i18n( 'general.button.SAVE' ),
                    disabled: ko.computed( function() {
                        return !self.connectorFQDN();
                    } ),
                    click: function updateConnectorFQDN() {
                        Y.doccirrus.jsonrpc.api.tisettings.update( {connectorFQDN: self.connectorFQDN()} )
                            .done( function() {
                                return self.refreshTiInfo();
                            } )
                            .fail( function( err ) {
                                Y.log( 'Could not update connector FQDN: ' + err, 'debug', "tab_ti" );
                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            } );
                    }
                }
            } );
            self.saveConnectionProtocolButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'saveConnectionProtocol',
                    text: i18n( 'general.button.SAVE' ),
                    disabled: ko.computed( function() {
                        var connectionProtocol = self.connectionProtocol(),
                            certificateName = self.certificateName(),
                            httpsNeedsCert = connectionProtocol === 'HTTPS' &&
                                             (!certificateName || certificateName === self.noCertificateI18n);
                        self.certificateName.hasError( httpsNeedsCert );
                        return !connectionProtocol || httpsNeedsCert;
                    } ),
                    click: function updateConnectionProtocol() {
                        Y.doccirrus.jsonrpc.api.tisettings.update( {connectionProtocol: self.connectionProtocol()} )
                            .done( function() {
                                return self.refreshTiInfo();
                            } )
                            .fail( function( err ) {
                                Y.log( 'Could not update connection protocol: ' + err, 'debug', "tab_ti" );
                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            } );
                    }
                }
            } );
            /**
             * Save the given ldap full qualified domain name into ti settings collection.
             * @type {KoComponent}
             */
            self.saveLdapFQDNButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'saveLdapFQDN',
                    text: i18n( 'general.button.SAVE' ),
                    click: function updateConnectorFQDN() {
                        Promise.resolve( Y.doccirrus.jsonrpc.api.tisettings.update( {
                            user: self.user,
                            ldapFQDN: self.ldapFQDN(),
                            model: 'tisettings'
                        } ) ).then( function( res ) {
                            if( res ) {
                                self.refreshTiInfo();
                            }
                        } ).catch( function( err ) {
                            Y.log( 'Error updating ldapFQDN in tisettings-api: ' + err.stack || err, 'error', 'tab_ti.js' );
                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        } );
                    }
                }
            } );
            self.testLdapConnection = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'testLdapConnection',
                    text: 'Testen',
                    css: {
                        'btn-block': true
                    },
                    click: function() {
                        Promise.resolve( Y.doccirrus.jsonrpc.api.tiDirectoryService.testLdapConnection( {
                            filter: '(&(givenName=*Peter*)(sn=*Mustermann*))',
                            attributes: ['mail']
                        } ) ).then( function( res ) {
                            if( res ) {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'success',
                                    message: 'Verbindung zu LDAP erfolgreich.'
                                } );
                            }
                        } ).catch( function( err ) {
                            Y.log( 'Error check connection to LDAP in tisettings-api: ' + err.stack || err, 'error', 'tab_ti.js' );
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: 'LDAP konnte unter der angegebenen URL nicht erreicht werden.'
                            } );
                        } );
                    }
                }
            } );
            // self.saveClientCertificatePassword = KoComponentManager.createComponent( {
            //     componentType: 'KoButton',
            //     componentConfig: {
            //         name: 'saveClientCertificatePassword',
            //         text: i18n( 'general.button.SAVE' ),
            //         click: function updateClientCertificatePassword() {
            //             Y.doccirrus.jsonrpc.api.tisettings.update( { clientCertificatePassword: self.clientCertificatePassword } )
            //                 .done(() => self.refreshTiInfo())
            //                 .fail(err => Y.log( 'Could not update client certificate password: ' + err, 'debug', "tab_ti" ));
            //         }
            //     }
            // } ); // PASSPHRASE: uncomment here if a passphrase is needed
            self.saveModeOnlineCheckButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'saveModeOnlineCheckButton',
                    text: i18n( 'general.button.SAVE' ),
                    click: function updateModeOnlineCheckButton() {
                        Y.doccirrus.jsonrpc.api.tisettings.update( {modeOnlineCheck: self.modeOnlineCheck()} )
                            .fail( function( err ) {
                                Y.log( 'Could not update Mode Online Check: ' + err, 'debug', "tab_ti" );
                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            } );
                    }
                }
            } );
        },
        initCertificateUploader: function initCertificateUploader() {
            var
                self = this;


            self.certificateUploaderModel = {
                handleCertificate: function( certificate ) {
                    var
                        certificateName = certificate.name,
                        reader = new FileReader();

                    reader.onload = function() {
                        var
                            clientCertificateBase64String = reader.result;

                        Y.doccirrus.jsonrpc.api.tisettings.update( {
                            clientCertificateBase64String: clientCertificateBase64String,
                            clientCertificateName: certificateName
                        } )
                            .done( function() {
                                self.certificateName( certificateName );
                                self.refreshTiInfo();
                            })
                            .fail( function(err) {
                                Y.log( 'Could not update client certificate: ' + err, 'debug', "tab_ti" );
                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                            });

                    };

                    reader.readAsDataURL( certificate );
                }
            };
        },

        initTiConfigurationsTable: function() {
            var
                self = this;

            self.tiConfigurationsTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'ti-congigurations-KoTable',
                    limit: 10,
                    rowPopover: true,
                    onRowPopover: function( userConfig, rowData ) {
                        var connectorErrorCode = rowData.connectorErrorCode;
                        var inSuiteErrorMessage = rowData.inSuiteErrorMessage;
                        var invalidParam = rowData.invalidParam;
                        var unlinkedParam = rowData.unlinkedParam;
                        var invalidParamValue = rowData.invalidParamValue;
                        var unlinkedParamValue = rowData.unlinkedParamValue;
                        var profiles = rowData.profiles;

                        if( invalidParam ) {
                            return Object.assign( userConfig, {
                                title: self.configurationError,
                                content: i18n( 'InTiMojit.tiConfigurations.invalidParamErrorMessage.i18n', {
                                    data: {
                                        invalidParam: invalidParam,
                                        invalidParamValue: invalidParamValue
                                    }
                                } ),
                                styleTitle: 'background-color: #f2dede',
                                styleContent: ''
                            } );
                        } else if( unlinkedParam ) {
                            return Object.assign( userConfig, {
                                title: self.configurationWarning,
                                content: i18n( 'InTiMojit.tiConfigurations.unlinkedParamWarningMessage.i18n', {
                                    data: {
                                        unlinkedParam: unlinkedParam,
                                        unlinkedParamValue: unlinkedParamValue,
                                        MandantId: rowData.context.MandantId
                                    }
                                } ),
                                styleTitle: 'background-color: #fcf8e3',
                                styleContent: ''
                            } );
                        } else if( connectorErrorCode ) {
                            return Object.assign( userConfig, {
                                title: self.configurationError,
                                content: i18n( 'InTiMojit.tiConfigurations.unknownConnectorErrorMessage.i18n', {
                                    data: {errorCode: connectorErrorCode}
                                } ),
                                styleTitle: 'background-color: #f2dede',
                                styleContent: ''
                            } );
                        } else if( inSuiteErrorMessage ) {
                            return Object.assign( userConfig, {
                                title: self.configurationError,
                                content: i18n( 'InTiMojit.tiConfigurations.inSuiteErrorMessage.i18n', {
                                    data: {inSuiteErrorMessage: inSuiteErrorMessage}
                                } ),
                                styleTitle: 'background-color: #f2dede',
                                styleContent: ''
                            } );
                        } else if (!profiles.length) {
                            return Object.assign( userConfig, {
                                title: self.configurationWarning,
                                content: i18n( 'InTiMojit.tiConfigurations.noProfilesWarningMessage.i18n' ),
                                styleTitle: 'background-color: #fcf8e3',
                                styleContent: ''
                            } );
                        } else {
                            return Object.assign( userConfig, {
                                title: '',
                                content: self.configurationSuccess,
                                styleTitle: '',
                                styleContent: 'background-color: #dff0d8'
                            } );
                        }
                    },
                    columns: [
                        {
                            width: '30px',
                            renderer: function( meta ) {
                                var color = (meta.row.inSuiteErrorMessage || meta.row.connectorErrorCode) ? 'dc-red' : 'dc-green';
                                return '<div class="fa fa-circle ' + color + '"></div>';
                            }
                        },
                        {
                            forPropertyName: 'context',
                            label: i18n( 'InTiMojit.tiConfigurations.MandantId.i18n' ),
                            title: i18n( 'InTiMojit.tiConfigurations.MandantId.i18n' ),
                            isFilterable: true,
                            isSortable: true,
                            isValid: false,
                            renderer: function( meta ) {
                                var context = ko.unwrap( meta.value );
                                return context.MandantId;
                            },
                            getCss: function( $context ) {
                                var css = $context.$data.css();
                                css.primary = true;
                                css.warning = $context.$parent.unlinkedParam === 'MandantId'; // overwriting primary css if needed
                                css.danger = $context.$parent.invalidParam === 'MandantId';   // overwriting warning css if needed
                                return css;
                            }
                        },
                        {
                            forPropertyName: 'context',
                            label: i18n( 'InTiMojit.tiConfigurations.ClientSystemId.i18n' ),
                            title: i18n( 'InTiMojit.tiConfigurations.ClientSystemId.i18n' ),
                            isFilterable: true,
                            isSortable: true,
                            renderer: function( meta ) {
                                var context = ko.unwrap( meta.value );
                                return context.ClientSystemId;
                            },
                            getCss: function( $context ) {
                                var css = $context.$data.css();
                                css.primary = true;
                                css.warning = $context.$parent.unlinkedParam === 'ClientSystemId'; // overwriting primary css if needed
                                css.danger = $context.$parent.invalidParam === 'ClientSystemId';   // overwriting warning css if needed
                                return css;
                            }
                        },
                        {
                            forPropertyName: 'context',
                            label: i18n( 'InTiMojit.tiConfigurations.WorkplaceId.i18n' ),
                            title: i18n( 'InTiMojit.tiConfigurations.WorkplaceId.i18n' ),
                            isFilterable: true,
                            isSortable: true,
                            renderer: function( meta ) {
                                var context = ko.unwrap( meta.value );
                                return context.WorkplaceId;
                            },
                            getCss: function( $context ) {
                                var css = $context.$data.css();
                                css.primary = true;
                                css.warning = $context.$parent.unlinkedParam === 'WorkplaceId'; // overwriting primary css if needed
                                css.danger = $context.$parent.invalidParam === 'WorkplaceId';   // overwriting warning css if needed
                                return css;
                            }
                        },
                        {
                            forPropertyName: 'CtIds',
                            label: i18n( 'InTiMojit.tiConfigurations.cardTerminals.i18n' ),
                            title: i18n( 'InTiMojit.tiConfigurations.cardTerminals.i18n' ),
                            isFilterable: true,
                            filterField: {
                                componentType: 'KoField',
                                placeholder: 'Terminal-ID'
                            },
                            renderer: function( meta ) {
                                var
                                    CtIds = ko.unwrap( meta.value );
                                return CtIds.join( ', ' );
                            },
                            getCss: function( $context ) {
                                var css = $context.$data.css();
                                css.primary = true;
                                css.warning = $context.$parent.unlinkedParam === 'CtId'; // overwriting primary css if needed
                                css.danger = $context.$parent.invalidParam === 'CtId';   // overwriting warning css if needed
                                return css;
                            }
                        },
                        {
                            forPropertyName: 'profiles',
                            label: i18n( 'InTiMojit.tiConfigurations.profiles.i18n' ),
                            title: i18n( 'InTiMojit.tiConfigurations.profiles.i18n' ),
                            visible: false,
                            isFilterable: true,
                            filterField: {
                                componentType: 'KoField',
                                placeholder: i18n( 'InTiMojit.tiConfigurations.profile.i18n' )
                            },
                            renderer: function( meta ) {
                                var
                                    profiles = ko.unwrap( meta.value ),
                                    text;

                                return profiles.map( function( profile ) {
                                    text = '';
                                    text += profile.profileLabel;

                                    if( profile.cardTerminals.length ) {
                                        text += ' (' + profile.cardTerminals.join( ', ' ) + ')';
                                    } else {
                                        text += ' (' + i18n( 'InTiMojit.tiConfigurations.allCardTerminals.i18n' ) + ')';
                                    }
                                    return text;
                                } ).join( '<br>' );
                            },
                            getCss: function( $context ) {
                                var css = $context.$data.css();
                                css.primary = $context.$parent.profiles.length > 0;
                                css.warning = $context.$parent.profiles.length === 0;
                                return css;
                            }
                        }
                    ],
                    _afterRender: function() {
                        Y.doccirrus.KoUI.KoComponentManager.componentTypes.KoTable.superclass._afterRender.apply( this, arguments );
                        this.initRowPopover();
                        self.loadTiConfigurationsData();
                    }
                }

             } );
        },

        loadTiConfigurationsData: function() {
            var self = this;

            self.tiConfigurationsTable.masked( true );

            Promise.resolve( Y.doccirrus.jsonrpc.api.ticontext.getConfigurationParameters() )
                .then( function( res ) {
                    self.tiConfigurationsTable.data( res.data );
                    self.tiConfigurationsTable.masked( false );
                } )
                .catch( function( err ) {
                    self.tiConfigurationsTable.masked( false );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: Y.doccirrus.errorTable.getMessages( err )
                    } );
                } );
        },

        refreshTiInfo: function refreshTiInfo() {
            var
                self = this;

            self.contextInfos( [] );
            self.getContextInfos();
            self.vpnTiStatus( null );
            self.vpnSisStatus( null );
            self.versionsSupported( null );
            Y.doccirrus.jsonrpc.api.timanager.getTiInfo( {unfilteredByProfile: true} )
                .done( function( res ){
                    var
                        data = res.data,
                        contextInfos = data.contextInfos,
                        resourceInformation = data.resourceInformation,
                        tiServicesVersionSupport = data.tiServicesVersionSupport;

                    self.contextInfos(contextInfos);
                    self.getContextInfos();
                    self.vpnTiStatus(resourceInformation && resourceInformation.Connector && resourceInformation.Connector.VPNTIStatus.ConnectionStatus);
                    self.vpnSisStatus(resourceInformation && resourceInformation.Connector && resourceInformation.Connector.VPNSISStatus.ConnectionStatus);
                    self.versionsSupported(tiServicesVersionSupport && tiServicesVersionSupport.versionsSupported);
                })
                .fail(function( err ){
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    Y.log( 'Unable to get TI info. Error:' + err, 'debug', 'ti_tab' );
                });
        },

        showTiHint: function( hintMessage ) {
            var
                text = hintMessage,
                bodyContent = Y.Node.create( '<div>' + text + '</div>' );

            return new Y.doccirrus.DCWindow( {
                className: 'DCWindow-TIHint',
                bodyContent: bodyContent,
                icon: Y.doccirrus.DCWindow.ICON_INFO,
                title: i18n( 'DCWindow.notice.title.info' ),
                width: Y.doccirrus.DCWindow.SIZE_LARGE,
                minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                maximizable: true,
                resizable: true,
                focusOn: [],
                centered: true,
                modal: true,
                render: document.body,
                buttons: {
                    header: [ 'close' ],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'OK' )
                    ]
                }
            } );
        }
    }, {
        ATTRS: {
            vpnTiStatus: {
                value: '',
                lazyAdd: false
            },
            vpnSisStatus: {
                value: '',
                lazyAdd: false
            },
            contextInfos: {
                value: [],
                lazyAdd: false
            },
            versionsSupported: {
                value: false,
                lazyAdd: false
            }
        }
        });

    return {
        registerNode: function( node ) {
            Y.doccirrus.jsonrpc.api.timanager.getTiInfo( {unfilteredByProfile: true} )
                .done( function( res ){
                    var
                        data = res.data,
                        contextInfos = data.contextInfos,
                        resourceInformation = data.resourceInformation,
                        tiServicesVersionSupport = data.tiServicesVersionSupport;

                    viewModel = new ViewModel({
                        contextInfos: contextInfos,
                        vpnTiStatus: resourceInformation && resourceInformation.Connector && resourceInformation.Connector.VPNTIStatus.ConnectionStatus,
                        vpnSisStatus: resourceInformation && resourceInformation.Connector && resourceInformation.Connector.VPNSISStatus.ConnectionStatus,
                        versionsSupported: tiServicesVersionSupport && tiServicesVersionSupport.versionsSupported
                    });
                    ko.applyBindings(
                        viewModel,
                        node.getDOMNode()
                    );
                })
                .fail(function( err ){
                    Y.log( 'Unable to get TI info. Error:' + err, 'debug', 'ti_tab' );
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    viewModel = new ViewModel({
                        contextInfos: undefined,
                        vpnTiStatus: undefined,
                        vpnSisStatus: undefined,
                        versionsSupported: undefined
                    });
                    ko.applyBindings(
                        viewModel,
                        node.getDOMNode()
                    );
                });
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};
