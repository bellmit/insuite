/*
 @author: mp
 @date: 2013/11/10
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

/**
 * @module caseFile
 * @class DCbankaccountmodel
 */

YUI.add( 'dcbankaffiliatemodel', function( Y ) {

        var AffiliateModel;

        AffiliateModel = function AffiliateModel( affiliate ) {
            var
                self = this;
            self._modelName = 'AffiliateModel';
            Y.doccirrus.uam.ViewModel.call( self );
            Y.doccirrus.uam.SubViewModel.call( self, affiliate );

            self._runBoilerplate( affiliate );

        };

        Y.namespace( 'doccirrus.uam' ).AffiliateModel = AffiliateModel;
    },
    '0.0.1', {requires: [ 'dcviewmodel' ] }
);