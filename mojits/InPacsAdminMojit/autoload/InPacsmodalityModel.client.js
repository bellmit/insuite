/*jslint anon:true, nomen:true*/
/*global YUI*/

'use strict';

YUI.add( 'InPacsmodalityModel', function( Y ) {

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        function InPacsmodalityModel() {
            InPacsmodalityModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( InPacsmodalityModel, KoViewModel.getBase(), {
                initInPacsmodalityModel: function() {

                },
                initializer: function() {
                    var
                        self = this;
                    self.initInPacsmodalityModel();
                }

            }, {
                schemaName: 'inpacsmodality',
                NAME: 'InPacsmodalityModel'
            }
        );

        InPacsmodalityModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        KoViewModel.registerConstructor( InPacsmodalityModel );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'inpacsmodality-schema'
        ]
    }
);