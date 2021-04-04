/**
 * User: oliversieweke
 * Date: 15.01.19  14:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'EmployeeEditModel_D', function( Y/*, NAME */ ) {
        'use strict';
        var KoViewModel = Y.doccirrus.KoViewModel;

        // WARNING: This model is written to have the look and feel of a stand-alone model, it should however only be used as an extension to the base EmployeeEditModel.

        function EmployeeEditModel_D() {}

        Y.extend( EmployeeEditModel_D, Y.Base, {
                initializer: function EmployeeEditModel_D_initializer() {
                    this.initSelect2OfficialNo();
                },
                destructor: function EmployeeEditModel_D_destructor() {},
                initSelect2OfficialNo: function EmployeeEditModel_D_initSelect2OfficialNo() {
                    var
                        self = this;
                    self.select2OfficialNo = Y.doccirrus.uam.utils.createOfficialNoAutoComplete( self );
                }
            },
            {
                NAME: 'EmployeeEditModel_D'
            } );

        KoViewModel.registerConstructor( EmployeeEditModel_D );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel'
        ]
    }
);