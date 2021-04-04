/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, $, ko */
YUI.add(
    'InCareMojitBinder',
    function( Y, NAME ) {
        'use strict';

        var
            i18n = Y.doccirrus.i18n;

        function showRestoreFromISDCNotice( model, e ) {
            if( e.target.checked ) {
                notice( i18n( 'InSuiteAdminMojit.tab_settings.restore_from_iscd_notice.TEXT' ), 'info' );
            }
            return true;
        }

        function notice( msg, type ) {
            Y.doccirrus.DCWindow.notice( {
                type: type,
                message: msg,
                window: {width: 'medium'}
            } );
        }

        function toggleFullScreenHandler() {
            Y.doccirrus.DCBinder.toggleFullScreen();
        }

        function saveSettings( settingsModel ) {

            var data = settingsModel._serializeToJS();
            data.fields_ = 'isRestoreFromISCD';

            $.ajax( {
                type: 'PUT',
                xhrFields: {withCredentials: true},
                data: data,
                url: Y.doccirrus.infras.getPrivateURL( '/1/settings/' + settingsModel._id ),
                success: function( result ) {
                    if( result && result.meta && result.meta.errors && result.meta.errors.length ) {
                        notice( i18n( 'general.message.ERROR_WHILE_SAVING' ), 'error' );
                    } else {
                        notice( i18n( 'InSuiteAdminMojit.tab_settings.message.SETTINGS_SAVED' ), 'info' );
                    }
                },
                error: function( err ) {
                    Y.log( 'error saving kv connect settings' + err, 'error' );
                    notice( i18n( 'general.message.ERROR_WHILE_SAVING' ), 'error' );
                }
            } );

        }

        /**
         * Constructor for the InCareMojitBinder class.
         *
         * @class InCareMojitBinder
         * @constructor
         */
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
                Y.doccirrus.NavBarHeader.setActiveEntry( 'incare' );
                Y.doccirrus.DCBinder.initToggleFullScreen();
                
                var
                    self = this,
                    settingsModel;

                self.node = node;

                $.ajax( {
                    type: 'GET',
                    xhrFields: {withCredentials: true},
                    url: Y.doccirrus.infras.getPrivateURL( '/1/settings' ),
                    success: function( result ) {
                        var data = result.data[0];
                        settingsModel = new Y.doccirrus.uam.SettingsModel( data );
                        settingsModel.saveSettings = saveSettings;
                        settingsModel.toggleFullScreenHandler = toggleFullScreenHandler;
                        settingsModel.showRestoreFromISDCNotice = showRestoreFromISDCNotice;
                        //translations
                        settingsModel.inCareHeadlineI18n = i18n('InCareMojit.headline');
                        settingsModel.inCareHeadingI18n = i18n('InCareMojit.restore_settings.HEADING');
                        settingsModel.inCareCheckBoxI18n = i18n('InCareMojit.restore_settings.CHECKBOX');
                        settingsModel.inCareButtonSaveI18n = i18n( 'general.button.SAVE' );
                        settingsModel.viewPortBtnI18n = Y.doccirrus.DCBinder.viewPortBtnI18n;


                        settingsModel.timeoutDelayEnabled = ko.computed( function() {
                            return settingsModel.autoLogout();
                        } );

                        ko.applyBindings( settingsModel, self.node.getDOMNode() );
                    },
                    error: function( err ) {
                        Y.log( 'error loading settings' + err, 'error' );
                    }
                } );
            }
        };

    },
    '0.0.1',
    {
        requires: [
            "DCBinder",
            'mojito-client',
            'NavBarHeader',
            'doccirrus',
            'KoUI-all',
            'dccommonutils',
            'dcsettingsmodel'
        ]
    }
);
