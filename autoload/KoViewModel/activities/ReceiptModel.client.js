/**
 * User: strix
 * Date: 09/08/16
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0 strict:0 */
/*global YUI, ko */

'use strict';

YUI.add( 'ReceiptModel', function( Y /*, NAME */ ) {
        /**
         * @module ReceiptModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityModel = KoViewModel.getConstructor( 'SimpleActivityModel' ),
            mixin = Y.doccirrus.api.activity.getFormBasedActivityAPI();

        /**
         * @class ReceiptModel
         * @constructor
         * @extends FormBasedActivityModel
         * @param   {Object}    config
         */
        function ReceiptModel( config ) {
            ReceiptModel.superclass.constructor.call( this, config );
        }

        ReceiptModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( ReceiptModel, SimpleActivityModel, {

                initializer: function FormModel_initializer() {
                    var self = this;
                    self.initReceiptModel();
                },

                destructor: function FormModel_destructor() {
                    var self = this;
                    self.invoiceNoListener.dispose();
                },

                initReceiptModel: function() {
                    var self = this;

                    if( self.initFormBasedActivityAPI ) { self.initFormBasedActivityAPI(); }

                    self.invoiceNoListener = self.invoiceNo.subscribe( function( newVal ) {
                        var
                            stub = {
                                'actType': self.actType(),
                                'receiptNo': self.receiptNo(),
                                'invoiceNo': newVal,
                                'content': self.content()
                            },
                            options = {};

                        self.userContent( Y.doccirrus.schemas.activity.generateContent( stub, options ) );
                    } );
                },

                //  redirect new event
                onActivityLinked: function( activity ) {
                    var self = this;
                    return self.onActivityLinkBlocked( activity );
                },

                /**
                 *  Raised when an activity link was blocked by rule
                 *  @param  {Object}    activity    Plain activity object from CasefileViewModel activities table
                 */

                onActivityLinkBlocked: function( activity ) {
                    var
                        self = this;

                    if ( ( 'INVOICE' !== activity.actType && 'INVOICEREF' !== activity.actType ) || 'CANCELLED' === activity.status ) {
                        return false;
                    }

                    //  If receipt is approved then don' change invoice
                    if ( !self._isEditable() ) {
                        return false;
                    }

                    self.invoiceNo( activity.invoiceNo || '' );
                    self.invoiceText( activity.content || '' );

                    //  initialize ammount to outstanding balance of invoice if we are creating a new reciept
                    if ( !ko.unwrap( self._id ) ) {
                        self.amount( parseFloat( activity.totalReceiptsOutstanding ).toFixed( 2 ) || 0.00 );
                    }

                    self.activities( [ activity._id ] );

                    //  returning true will cause this INVOICE _id to be added to 'activities'
                    //  a pre-process will correct the direction of the link on first save
                    return true;
                },

                /**
                 *  Raised when linked activity is unchecked in the table
                 *  --param  {String}    activityId
                 */

                onActivityUnlinked: function( /*activityId*/ ) {
                    var
                        self = this;

                    //  If this receipt has not been approved then we can update these fields directly
                    if ( self._isEditable() ) {
                        self.activities( [] );
                        self.referencedBy( [] );
                        self.invoiceNo( '' );
                        self.invoiceText( '' );
                        return;
                    }
                }

            },
            {
                schemaName: 'v_receipt',
                NAME: 'ReceiptModel'
            }
        );

        Y.mix( ReceiptModel, mixin, false, Object.keys( mixin ), 4 );

        KoViewModel.registerConstructor( ReceiptModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'FormBasedActivityModel',
            'v_receipt-schema'
        ]
    }
)
;