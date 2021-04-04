/**
 * User: do
 * Date: 02/03/15  15:29
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI */
'use strict';

YUI.add( 'dcpartnermodel', function( Y ) {

        function PartnerModel( partner ) {
            var
                self = this;

            self._modelName = 'PartnerModel';

            Y.doccirrus.uam.ViewModel.call( self );

            self._schemaName = 'partner';
            self._runBoilerplate( partner );
            self._dataUrl = '/1/partner';
            self._validatable(true);

        }

        Y.namespace( 'doccirrus.uam' ).PartnerModel = PartnerModel;

    },
    '0.0.1', {requires: ['dcviewmodel', 'partner-schema']}
);