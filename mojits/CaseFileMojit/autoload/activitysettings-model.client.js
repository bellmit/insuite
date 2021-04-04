/*global YUI, $, ko */

'use strict';

YUI.add( 'dcactivitysettingsmodel', function( Y ) {

        function ActivitySettingsModel(settings) {
            var
                //id = Y.doccirrus.schemas.activitysettings.getId(),
                self = this;

            self._modelName = 'ActivitySettingsModel';
            Y.doccirrus.uam.ViewModel.call( self );

            self._schemaName = 'activitysettings';
            self.settings = ko.observableArray( settings.settings );
            self.makeSettings = function(activityTypes){
                var setting, exist;

                activityTypes.forEach(function(actType){
                    exist = false;
                     self.settings().forEach(function(setting){
                         if (!exist) {
                             exist = ( setting.actType === actType.val );
                         }

                         if ( setting.actType === actType.val ) {
                             setting.functionality = actType.functionality;
                         }

                     });

                     if(!exist){
                         setting = {
                             actType: actType.val,
                             color: '#ffffff',
                             isVisible: true,
                             functionality: actType.functionality,
                             en: actType['-en'],
                             de: actType['-de']
                         };

                         if( actType.val === 'SCHEIN' || actType.val === 'BGSCHEIN' || actType.val === 'PKVSCHEIN' ) {
                             setting.color = '#ffffe4';
                         }

                         self.settings.push(setting);
                     }
                 });

                self.settings().forEach(function(setting){
                    setting.showTreeConfig = Y.doccirrus.schemas.activity.actTypeHasDocTree( setting.actType );
                    setting.color = ko.observable(setting.color);
                    setting.isVisible = ko.observable(setting.isVisible);
                    setting.showPrintCount = ko.observable(setting.showPrintCount);
                    setting.useWYSWYG = ko.observable(setting.useWYSWYG);
                    setting.subTypes = ko.observableArray(setting.subTypes || []);
                });

               self.settings(self.settings().filter(
                function (item) {
                    var stay = true;
                    if (item.actType === "STOCKDISPENSE" && !Y.doccirrus.auth.hasAdditionalService('inStock') ){
                        stay = false;
                    }
                    return stay;
                }));
            };

            self.getSetting = function(actType){
                var settingObj;
                self.settings().forEach(function(setting){
                    if(setting.actType === actType){
                        settingObj = setting;
                    }
                });
                return settingObj;
            };

            self.isVisible = function(actType){
                var setting = self.getSetting(actType );
                if(!setting){
                    return true;
                }else if(setting.isVisible()){
                    return true;
                }else{
                    return false;
                }
            };

            self._save = function() {
                var params = self._serializeToJS();

                    //  TODO: use jsonrpc here

                    Y.log( 'Saving activity settings', 'info', 'activitysettings' );
                    $.ajax( {
                        type: 'POST',
                        xhrFields: { withCredentials: true },
                        contentType: 'application/json; charset=UTF-8',
                        url: Y.doccirrus.infras.getPrivateURL( '/1/activitysettings/:updateActivitySettings' ),
                        data: JSON.stringify( params ),
                        success: function() {
                            Y.log('Resetting activity settings');
                            Y.doccirrus.api.activitysettings.reset();
                        },
                        error: function( err ) {
                            Y.log( 'ERROR saving activity settings ' + err, 'error', 'activitysettings' );
                            return;
                        }
                    } );

            };
        }

        Y.namespace( 'doccirrus.uam' ).ActivitySettingsModel = ActivitySettingsModel;
    },
    '0.0.1', {requires: [
        'dcviewmodel'
    ]}
);