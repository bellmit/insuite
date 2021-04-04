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

YUI.add( 'dcbankaccountmodel', function( Y ) {

        var BankAccountModel;

        BankAccountModel = function BankAccountModel( account ) {
            var
                self = this;
            self._modelName = 'BankAccountModel';
            Y.doccirrus.uam.ViewModel.call( self );
            Y.doccirrus.uam.SubViewModel.call( self, account );

            self._runBoilerplate( account, {
                blacklist: [
                    'cardNo',
                    'cardCheckCode',
                    'cardValidToMonth',
                    'cardValidToYear',
                    'trial',
                    'debitAllowed'
                ]
            } );

        };

        Y.namespace( 'doccirrus.uam' ).BankAccountModel = BankAccountModel;
    },
    '0.0.1', {requires: [ 'dcviewmodel' ] }
);