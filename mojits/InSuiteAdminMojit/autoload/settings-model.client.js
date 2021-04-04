/**
 * User: do
 * Date: 24/07/14  16:31
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

'use strict';

YUI.add( 'dcsettingsmodel', function( Y ) {

        function SettingsModel( settings ) {
            var
                self = this;
            settings = settings || {};

            self._modelName = 'SettingsModel';
            Y.doccirrus.uam.ViewModel.call( this );

            self._schemaName = 'settings';
            self._runBoilerplate( settings, {} );
            self._validatable( true );

            self._getDCAvwgCertNumber = function() {
                Y.doccirrus.jsonrpc.api.kbv.certNumbers().done( function( result ) {
                    var avwgCertNumber = result && result.data && result.data.avwgCertNumber;
                    if( avwgCertNumber ) {
                        self.avwgNo( avwgCertNumber );
                    }
                } );
            };

            /* ---  Basic data parameters --- */

            self._dataUrl = '/1/settings';
        }

        /**
         * @deprecated
         */
        Y.namespace( 'doccirrus.uam' ).SettingsModel = SettingsModel;
    },
    '0.0.1', {requires: ['dcviewmodel'] }
);
