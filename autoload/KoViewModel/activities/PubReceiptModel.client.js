/**
 * User: pi
 * Date: 17/02/16  16:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI  */

'use strict';

YUI.add( 'PubReceiptModel', function( Y/*, NAME */) {
        /**
         * @module PubReceiptModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

        /**
         * @class PubReceiptModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function PubReceiptModel( config ) {
            PubReceiptModel.superclass.constructor.call( this, config );
        }

        PubReceiptModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( PubReceiptModel, FormBasedActivityModel, {

                initializer: function PubReceiptModel_initializer() {
                    var
                        self = this;
                    self.initPubReceiptModel();
                },
                destructor: function PubReceiptModel_destructor() {
                },
                initPubReceiptModel: function PubReceiptModel_initPubReceiptModel() {
                }
            },
            {
                schemaName: 'v_pubreceipt',
                NAME: 'PubReceiptModel'
            }
        );

        KoViewModel.registerConstructor( PubReceiptModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'FormBasedActivityModel',
            'v_pubreceipt-schema'
        ]
    }
)
;