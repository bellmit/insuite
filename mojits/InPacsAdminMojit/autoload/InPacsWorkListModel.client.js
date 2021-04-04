/*jslint anon:true, nomen:true*/
/*global YUI*/

'use strict';

YUI.add( 'InPacsWorkListModel', function( Y ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel;

    function InPacsWorkListModel() {
        InPacsWorkListModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InPacsWorkListModel, KoViewModel.getBase(), {
            initializer: function( /*config*/ ) {
            }
        }, {
            NAME: 'InPacsWorkListModel',
            schemaName: 'inpacsworklist'
        }
    );
    KoViewModel.registerConstructor( InPacsWorkListModel );
}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel'
    ]
} );