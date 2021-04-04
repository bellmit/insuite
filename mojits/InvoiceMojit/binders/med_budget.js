/**
 * User: do
 * Date: 15/10/15  11:25
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*exported _fn */
/*global ko */
function _fn( Y/*, NAME*/ ) {
    'use strict';

    var i18n = Y.doccirrus.i18n;

    return {
        registerNode: function() {
            var
                pdfTitle = i18n( 'InvoiceMojit.BudgetViewModel.pdfTitle_med' ),
                budgetVM = new Y.doccirrus.uam.BudgetViewModel( 'MEDICATION', pdfTitle );

            budgetVM.calcMedBudgetI18n = i18n('InvoiceMojit.med_budget.text.CALC_MED_BUDGET');

            ko.applyBindings( budgetVM, document.querySelector( '#med_budget' ) );
        }
    };
}