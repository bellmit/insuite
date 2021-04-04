/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dcactivitysettingmodel', function( Y ) {

        function ActivitySettingModel(settings) {
            var
                self = this;

            self._modelName = 'ActivitySettingModel';
            Y.doccirrus.uam.ViewModel.call( self );

            self._schemaName = 'activitysetting';
            //       self._runBoilerplate( settings );

            self.settings = ko.observableArray(settings);

        }

        Y.namespace( 'doccirrus.uam' ).ActivitySettingModel = ActivitySettingModel;
    },
    '0.0.1', {requires: [
        'dcviewmodel',
        'dcsubviewmodel'
    ]}
);