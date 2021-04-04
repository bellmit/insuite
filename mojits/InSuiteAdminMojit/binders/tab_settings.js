/*global ko, $, YUI, fun:true */
/*exported fun */

//TRANSLATION INCOMPLETE!! MOJ-3201
fun = function _fn( Y, NAME ) {
    'use strict';

    var
        $saveBtn,
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        SettingsModel = Y.doccirrus.KoViewModel.getConstructor( 'SettingsModel' ),
        adminModel,
        myNode,
        smtpDirtyCheckString,
        CURRENT_PRACTICE_NO = '',
        PUC_URL;

    /**
     * @class AdminViewModel
     * @constructor
     */
    function AdminViewModel( config ) {
        AdminViewModel.superclass.constructor.call( this, config );
    }

    AdminViewModel.ATTRS = {
        data: {
            value: null,
            lazyAdd: false
        }
    };

    Y.extend( AdminViewModel, KoViewModel.getDisposable(), {

            initializer: function AdminViewModel_initializer( config ) {
                var self = this;

                self.profileManagement = ko.observable( {} );
                self.initAdminViewModel( config.proxyNotSupported );
            },
            destructor: function AdminViewModel_destructor() {
            },
            initAdminViewModel: function AdminViewModel_initAdminViewModel( proxyNotSupported ) {
                var
                    self = this,
                    validation = Y.doccirrus.validations.common.Admin_T_proxy[ 0 ];
                if( !self.get( 'data.proxy' ) ) {
                    self.set( 'data.proxy', '' );
                }
                self.isVPRCNotAdmin = ko.observable( Y.doccirrus.auth.isVPRC() && !Y.doccirrus.auth.isVPRCAdmin() );

                self.proxyNotSupported = ko.observable( proxyNotSupported );
                self.proxy = ko.observable( self.get( 'data.proxy' ) );
                self.proxy.validationMessages = ko.observableArray( [ validation.msg ] );
                self.proxy.hasError = ko.computed( function() {
                    var
                        isValid = validation.validator( self.proxy() );
                    return !isValid;
                } );

                //translations
                self.proxyFeatureNotSupportedI18n = i18n( 'InSuiteAdminMojit.tab_settings.proxy_settings.PROXY_NOT_SUPPORTED' );
                self.settingsProfileHeadLineI18n = i18n( 'ProfileMojit.ProfileManagementViewModel.headline.text' );
                self.settingsProxyHeadingI18n = i18n( 'InSuiteAdminMojit.tab_settings.proxy_settings.HEADING' );
                self.settingsProxyTextI18n = i18n( 'InSuiteAdminMojit.tab_settings.proxy_settings.TEXT' );
                self.settingsProxyLabelI18n = i18n( 'InSuiteAdminMojit.tab_settings.proxy_settings.LABEL' );
                self.proxyButtonTextI18n = i18n( 'InSuiteAdminMojit.tab_settings.proxy_settings.BUTTON_LABEL'  );

                self.addDisposable( ko.computed( function() {
                    self.proxy.hasError();
                    setSaveBtn( !self.proxy.hasError() );
                } ) );
                self.profileManagement = new Y.doccirrus.ProfileManagementViewModel.create( { fromSettings: true } );
                self.profileManagement.settingsProfileInfoStoreI18n = i18n( 'ProfileMojit.ProfileManagementViewModel.info.store_admin' );
                self.profileManagement.settingsProfileLabelI18n = i18n( 'ProfileMojit.ProfileManagementViewModel.profile.label' );
                self.profileManagement.settingsButtonStoreI18n = i18n( 'ProfileMojit.ProfileManagementViewModel.button.STORE_Profile' );
                self.profileManagement.settingsButtonRestoreI18n = i18n( 'ProfileMojit.ProfileManagementViewModel.button.RESTORE_Profile' );
                self.profileManagement.configureWorkStationI18n = i18n( 'ProfileMojit.configureWorkStation' );
            },
            saveProxySettings: function() {
                var self = this;

                return Y.doccirrus.jsonrpc.api.cli.setProxyConfig( {
                    data: {
                        proxy: ko.utils.peekObservable( self.proxy )
                    }
                } ).then( function( response ) {
                    var
                        proxy = response.data && response.data.proxy;

                    self.set( 'data.proxy', proxy );
                    self.proxy( proxy );

                    return response;
                } );
            },
            testProxy: function () {
                var
                    self = this;

                Y.doccirrus.jsonrpc.api.communication.testProxyUrl({
                    data: {
                        proxyUrl: ko.utils.peekObservable( self.proxy )
                    }
                })
                .then( function() {
                    notice( i18n( 'InSuiteAdminMojit.tab_settings.message.TEST_PROXY_SUCCESS' ), 'info' );
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
            }
        }
    );

    function getSettings( node, options ) {
        var
            settingsModel;

        Y.doccirrus.jsonrpc.api.settings.read().then( onSettingsLoaded ).fail( onSettingsError );

        function onSettingsLoaded( result ) {
            var data = result.data[ 0 ];
            if( options && options.pucUrl ) {
                PUC_URL = options.pucUrl;
            }

            data.blockMalware = data.blockMalware || false;

            settingsModel = new KoViewModel.createViewModel( {
                NAME: 'SettingsModel', config: {
                    data: data
                }
            } );

            settingsModel.hasInScribeLicence = Y.doccirrus.auth.hasAdditionalService( 'inScribe' );
            settingsModel.saveSettings = saveSettings;
            settingsModel.onTemplateReady = onTemplateReady;
            settingsModel.verifySmtpConfiguration = verifySmtpConfiguration;
            settingsModel.clearSmtpConfiguration = clearSmtpConfiguration;
            settingsModel.showHubAccessInfoMessage = showHubAccessInfoMessage;
            settingsModel.showAccountBanInfobox = showAccountBanInfobox;
            settingsModel.showPublicVCInfoMessage = showPublicVCInfoMessage;

            //translates
            settingsModel.settingsGroupDBI18n = i18n( 'InSuiteAdminMojit.medicinedb_settings.group.DB' );
            settingsModel.settingsDBCertI18n = i18n( 'InSuiteAdminMojit.medicinedb_settings.label.DB_CERT' );
            settingsModel.settingsAccountBanCheckboxI18n = i18n( 'InSuiteAdminMojit.security_settings.ACCOUNT_BAN.CHECKBOX' );
            settingsModel.settingsAccountBanPreI18n = i18n( 'InSuiteAdminMojit.security_settings.ACCOUNT_BAN.TEXT.PRE' );
            settingsModel.settingsAccountBanPostI18n = i18n( 'InSuiteAdminMojit.security_settings.ACCOUNT_BAN.TEXT.POST' );
            settingsModel.settingsUseDCAVWGI18n = i18n( 'InSuiteAdminMojit.medicinedb_settings.text.USE_DC_AVWG' );
            settingsModel.settingsSecuritySettingsI18n = i18n( 'InSuiteAdminMojit.security_settings.group.SECURITY_SETTINGS' );
            settingsModel.settingsAutoLogOutCheckBoxI18n = i18n( 'InSuiteAdminMojit.medicinedb_settings.checkbox.AUTOLOGOUT' );
            settingsModel.settingsTextPreI18n = i18n( 'InSuiteAdminMojit.medicinedb_settings.text.PRE' );
            settingsModel.settingsTextPostI18n = i18n( 'InSuiteAdminMojit.medicinedb_settings.text.POST' );
            settingsModel.settingsHeadingI18n = i18n( 'InSuiteAdminMojit.bfb_settings.HEADING' );
            settingsModel.settingsCheckBoxI18n = i18n( 'InSuiteAdminMojit.bfb_settings.CHECKBOX' );
            settingsModel.settingsRemoteHeadingI18n = i18n( 'InSuiteAdminMojit.remote_access_settings.HEADING' );
            settingsModel.settingsRemoteGeneralSwitchI18n = i18n( 'InSuiteAdminMojit.remote_access_settings.GENERAL_SWITCH' );
            settingsModel.settingsRemoteLoginTanI18n = i18n( 'InSuiteAdminMojit.remote_access_settings.LOGIN_TAN' );
            settingsModel.settingsMalwareHeadingI18n = i18n( 'InSuiteAdminMojit.malware_settings.HEADING' );
            settingsModel.settingsBlockMalwareI18n = i18n( 'InSuiteAdminMojit.malware_settings.BLOCK_MALWARE' );
            settingsModel.settingsCrossLocationsHeadingI18n = i18n( 'InSuiteAdminMojit.cross_location_settings.HEADING' );
            settingsModel.settingsCrossLocationsCheckBoxI18n = i18n( 'InSuiteAdminMojit.cross_location_settings.CHECKBOX' );
            settingsModel.settingsCrossLocationsPatientCheckBoxI18n = i18n( 'InSuiteAdminMojit.cross_location_settings.PATIENT_ACCESS_CHECKBOX' );
            settingsModel.settingsCrossLocationPatientEditingAllowedCheckBoxI18n = i18n( 'InSuiteAdminMojit.cross_location_settings.PATIENT_EDITING_ALLOWED_CHECKBOX' );
            settingsModel.settingsCrossLocationsCalendarCheckBoxI18n = i18n( 'InSuiteAdminMojit.cross_location_settings.CALENDAR_ACCESS_CHECKBOX' );
            settingsModel.settingsFontCustomHeadingI18n = i18n( 'InSuiteAdminMojit.custom_font_settings.HEADING' );
            settingsModel.settingsFontCustomSubHeadingI18n = i18n( 'InSuiteAdminMojit.custom_font_settings.SUBHEADING' );
            settingsModel.settingsFontCustomDescrI18n = i18n( 'InSuiteAdminMojit.custom_font_settings.DESCRIPTION' );
            settingsModel.settingsEmailHeadingI18n = i18n( 'InSuiteAdminMojit.tab_settings.email_settings.HEADING' );
            settingsModel.settingsEmailServerIncomeI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.EMAIL_SERVER_INCOME' );
            settingsModel.settingsEmailPlaceholderImapI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.IMAP' );
            settingsModel.settingsEmailPortI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.EMAIL_PORT' );
            settingsModel.settingsEmailEncriptionI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.ENCRYPTION' );
            settingsModel.settingsEmailLabelSSLI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.SSL' );
            settingsModel.settingsEmailLabelUserI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.USER' );
            settingsModel.settingsSMTPEmailLabelUserI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.SMTP_USER' );
            settingsModel.settingsEmailLabelUserNameI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.USER_NAME' );
            settingsModel.settingsEmailLabelPasswordI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.PASSWORD' );
            settingsModel.settingsSMTPEmailLabelPasswordI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.SMTP_PASSWORD' );
            settingsModel.settingsEmailServerOutcomeI18n = i18n( 'InSuiteAdminMojit.tab_locations.label.EMAIL_SERVER_OUTCOME' );
            settingsModel.settingsEmailPlaceholderSMTPI18n = i18n( 'InSuiteAdminMojit.tab_locations.placeholder.SMTP' );
            settingsModel.settingsEmailSettingsClearI18n = i18n( 'InSuiteAdminMojit.tab_settings.email_settings.SETTINGS_CLEAR' );
            settingsModel.settingsEmailPortalURLI18n = i18n( 'InSuiteAdminMojit.tab_settings.placeholder.PATIENT_PORTAL_URL' );
            settingsModel.settingsEmailPortalHeadingI18n = i18n( 'InSuiteAdminMojit.tab_settings.text.PATIENT_PORTAL_URL_HEADING' );
            settingsModel.settingsEmailPortalURLTextI18n = i18n( 'InSuiteAdminMojit.tab_settings.text.PATIENT_PORTAL_URL_TEXT' );
            settingsModel.settingsPublicVCI18n = i18n( 'InSuiteAdminMojit.tab_settings.text.PUBLIC_VC_HEADING' );
            settingsModel.settingsEnablePublicVCI18n = i18n( 'InSuiteAdminMojit.tab_settings.text.PUBLIC_VC_TEXT' );
            settingsModel.settingsButtonSaveI18n = i18n( 'general.button.SAVE' );
            settingsModel.intialSmtpDirtyCheckString = SettingsModel.buildSmtpDirtyCheckString( settingsModel );
            settingsModel.strictModeHeadingI18n = i18n( 'InSuiteAdminMojit.cross_location_settings.strictModeHeading' );
            settingsModel.booksAccessI18n = i18n( 'InSuiteAdminMojit.cross_location_settings.booksAccess', {
                data: {
                    group: i18n( 'identity-schema.Group_E.ADMIN' )
                }
            } );
            settingsModel.locationsHeadingI18n = i18n( 'InSuiteAdminMojit.location_settings.HEADING' );
            settingsModel.allowSameCommercialNo18n = i18n( 'settings-schema.Settings_T.allowSameCommercialNo' );

            settingsModel.timeoutDelayEnabled = ko.computed( function() {
                return settingsModel.autoLogout();
            } );
            settingsModel.accountBanDelayEnabled = ko.computed( function() {
                return settingsModel.accountBan();
            } );

            settingsModel.countryModeIncludesGermany = ko.computed( function() {
                return Y.doccirrus.commonutils.doesCountryModeIncludeGermany();
            } );

            settingsModel.forceUpdate = ko.observable( "" );

            smtpDirtyCheckString = SettingsModel.buildSmtpDirtyCheckString( settingsModel, false );

            settingsModel.saveButtonEnabled = ko.computed( function() {
                return smtpDirtyCheckString === (SettingsModel.buildSmtpDirtyCheckString( settingsModel, true ) + settingsModel.forceUpdate());
            } );

            Y.each( node.querySelectorAll( '.SettingsModel' ), function( settingsNode ) {
                ko.applyBindings( settingsModel, settingsNode );
            } );

            settingsModel._isValid.subscribe( setSaveBtn );
        }

        function onSettingsError( err ) {
            Y.log( 'error loading settings' + err, 'error' );
        }
    }

    function getAdminSettings( node ) {
        Y.doccirrus.jsonrpc.api.cli.getProxyConfig()
            .done( function( response ) {
                var
                    data = response.data || {};

                adminModel = new AdminViewModel( { data: data, proxyNotSupported: false } );

                Y.each( node.querySelectorAll( '.AdminModel' ), function( adminNode ) {
                    ko.applyBindings( adminModel, adminNode );
                } );
            } )
            .fail( function( error ) {
                if( error && error.code === "userMgmtMojit_01" ) {
                    // Means dc-cli is not present and so proxy feature is not supported. Simply disable the proxy textbox in this case.
                    adminModel = new AdminViewModel( { data: {}, proxyNotSupported: true } );

                    Y.each( node.querySelectorAll( '.AdminModel' ), function( adminNode ) {
                        ko.applyBindings( adminModel, adminNode );
                    } );
                } else {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                }
            } );
    }

    function setSaveBtn( isValid ) {
        if( isValid ) {
            $saveBtn.removeClass( 'disabled' );
        } else {
            $saveBtn.addClass( 'disabled' );
        }
    }

    function notice( msg, type ) {
        Y.doccirrus.DCWindow.notice( {
            type: type,
            message: msg,
            window: { width: 'medium' }
        } );
    }

    function isProxyChanged() {
        var
            oldProxy = adminModel.get( 'data.proxy' ),
            currentProxy = ko.utils.peekObservable( adminModel.proxy );
        return oldProxy !== currentProxy;
    }

    function _saveSettings( settingsModel, settingOnly ) {
        if( !settingOnly ) {
            return adminModel.saveProxySettings();
        }

        return settingsModel
            .save()
            .done( function() {
                smtpDirtyCheckString = SettingsModel.buildSmtpDirtyCheckString( settingsModel, false );
                settingsModel.intialSmtpDirtyCheckString = SettingsModel.buildSmtpDirtyCheckString( settingsModel, false );
                notice( i18n( 'InSuiteAdminMojit.tab_settings.message.SETTINGS_SAVED' ), 'info' );
            } )
            .fail( function( error ) {
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
            } );
    }

    function clearSmtpConfiguration( settingsModel ) {
        SettingsModel.clearSmtpConfiguration( settingsModel );
    }

    function verifySmtpConfiguration( settingsModel ) {
        SettingsModel.verifySmtpConfiguration( this, function() {
            smtpDirtyCheckString = SettingsModel.buildSmtpDirtyCheckString( settingsModel, false );
            settingsModel.forceUpdate.notifySubscribers( "" );
        } );
    }
    function showAccountBanInfobox() {
        Y.doccirrus.DCWindow.notice( {
            type: 'info',
            message: i18n( 'InSuiteAdminMojit.security_settings.ACCOUNT_BAN.INFOBOX' ),
            window: {
                width: 'medium',
                buttons: {
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function() {
                                this.close();
                            }
                        } )
                    ]
                }
            }
        } );
    }
    function showHubAccessInfoMessage() {
        Y.doccirrus.DCWindow.notice( {
            type: 'info',
            message: i18n( 'InSuiteAdminMojit.remote_access_settings.INFO' ),
            window: {
                width: 'medium',
                buttons: {
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function() {
                                this.close();
                            }
                        } )
                    ]
                }
            }
        } );
    }

    function showPublicVCInfoMessage() {
        Y.doccirrus.DCWindow.notice( {
            type: 'info',
            message: i18n( 'InSuiteAdminMojit.tab_settings.text.PUBLIC_VC_MESSAGE', {data: {practiceNo: CURRENT_PRACTICE_NO, pucUrl: PUC_URL}} ),
            window: {
                width: 'medium',
                buttons: {
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function() {
                                this.close();
                            }
                        } )
                    ]
                }
            }
        } );
    }

    function saveSettings( settingsModel ) {

        function callSaveSettings() {
            if( isProxyChanged() ) {
                SettingsModel.showConfirmBox( settingsModel, i18n( 'InSuiteAdminMojit.tab_settings.proxy_settings.WARN_MESSAGE' ), _saveSettings );
            } else {
                _saveSettings( settingsModel, true );
            }
        }

        if( !settingsModel.saveButtonEnabled() && !SettingsModel.checkIfSmtpSettingsAreRemoved( settingsModel ) ) {
            notice( i18n( 'InSuiteAdminMojit.tab_settings.email_settings.SETTINGS_SAVE_WARN' ), 'error' );
        } else if( settingsModel.intialSmtpDirtyCheckString && SettingsModel.checkIfSmtpSettingsAreRemoved( settingsModel ) ) {
            SettingsModel.showConfirmBox( null, i18n( 'InSuiteAdminMojit.tab_settings.email_settings.SETTINGS_USE_DEFAULT_CONFIRM' ), callSaveSettings );
        }  else {
            callSaveSettings();
        }
    }

    /**
     *  Raised by the binder when template is loaded
     *  Embed upload control to add fonts
     */

    function onTemplateReady() {

        function onFontsChanged( err /*, data */ ) {
            function onFontsReloaded( err, result ) {
                if( err ) {
                    Y.log( 'Error reloading fonts from GridFS: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }
                Y.log( 'Fonts reloaded from gridFS:\n' + JSON.stringify( result, undefined, 2 ), 'debug', NAME );
            }

            if( err ) {
                Y.log( 'Problem reloading fonts listing: ' + JSON.stringify( err ), 'warn', NAME );
            }

            Y.doccirrus.media.fonts.reloadFontList( onFontsReloaded );
        }

        function onFontControlLoaded() {
            Y.log( 'Font upload control loaded.', 'debug', NAME );
        }

        //  TTF fonts are owned by the default settings object

        var fontUploadNode = myNode.one( '#divFontUploadEmbed' );

        fontUploadNode.passToBinder = {
            //'onChange': onFontsChanged,
            'onAdd': onFontsChanged,
            'onRemove': onFontsChanged,
            'ownerId': '000000000000000000000001',
            'ownerCollection': 'settings',
            'label': '',
            'allowCategories': [ 'font' ],
            'dropAreaLabel': i18n( 'InSuiteAdminMojit.tab_settings.font_settings.dropAreaLabel' ),
            'emptyListLabel': i18n( 'InSuiteAdminMojit.tab_settings.font_settings.emptyListLabel' ),
            'widthPx': 48,
            'heightPx': 48
        };

        YUI.dcJadeRepository.loadNodeFromTemplate(
            'list_attachments',
            'MediaMojit',
            {},
            fontUploadNode,
            onFontControlLoaded
        );
    }

    return {
        /**
         *
         * @param node
         * @param key
         * @param options
         */
        registerNode: function( node, key, options ) {
            var domNode = node.getDOMNode();

            myNode = node;
            $saveBtn = $( '#saveBtn' );
            Y.doccirrus.utils.getPracticeNo( function afterGetPracticeNo( practiceNo ) {
                if( practiceNo ) {
                    CURRENT_PRACTICE_NO = practiceNo;
                }
            } );
            getSettings( domNode.querySelector( '#settings' ), options );
            getAdminSettings( domNode.querySelector( '#settings' ) );
        },

        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};