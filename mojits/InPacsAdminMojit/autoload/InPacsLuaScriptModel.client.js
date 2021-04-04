/*jslint anon:true, nomen:true*/
/*global YUI*/

'use strict';

YUI.add( 'InPacsLuaScriptModel', function( Y ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel;

    function InPacsLuaScriptModel() {
        InPacsLuaScriptModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InPacsLuaScriptModel, KoViewModel.getBase(), {

        initInPacsLuaScriptModel: function() {
        },

        initializer: function() {
            var
                self = this;
            self.initInPacsLuaScriptModel();
        }

    }, {
        schemaName: 'inpacsluascript',
        NAME: 'InPacsLuaScriptModel'
    } );

    InPacsLuaScriptModel.ATTRS = {
        data: {
            value: null,
            lazyAdd: false
        }
    };

    KoViewModel.registerConstructor( InPacsLuaScriptModel );

}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'inpacsluascript-schema'
    ]
} );