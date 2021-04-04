/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'dckbvinsurancemodel', function( Y ) {

        'use strict';

        function KBVInsuranceModel( kbvinsurance ) {
            var
                self = this,
                addresses = kbvinsurance.addresses;
            self._modelName = 'KBVInsuranceModel';

            Y.doccirrus.uam.ViewModel.call( self );

            self._schemaName = 'catalog';
            self._runBoilerplate( kbvinsurance );
            self.addresses = Array.isArray( addresses ) ? addresses : [];
            self._getAddress = function( attr ) {
                var addresses = ko.unwrap( self.addresses );
                if( addresses && addresses.length ) {
                    return addresses[0][attr] || '';
                }
                return '';
            };

            this._dataUrl = '/r/catsearch';
        }

        Y.namespace( 'doccirrus.uam' ).KBVInsuranceModel = KBVInsuranceModel;
    },
    '0.0.1', {
        requires: [
            'dcviewmodel'
        ]
    }
);
