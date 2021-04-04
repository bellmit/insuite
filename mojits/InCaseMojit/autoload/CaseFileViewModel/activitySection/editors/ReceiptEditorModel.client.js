/**
 * User: strix
 * Date: 10/08/16  14:25
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, _ */

'use strict';

YUI.add( 'ReceiptEditorModel', function( Y, NAME ) {
        /**
         * @module ReceiptEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            //SimpleActivityModel = KoViewModel.getConstructor( 'SimpleActivityModel' ),
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n;

        /**
         * @class ReceiptEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         * @param   {Object}    config
         */
        function ReceiptEditorModel( config ) {
            ReceiptEditorModel.superclass.constructor.call( this, config );
        }

        ReceiptEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'userContent',
                    'amount',
                    'invoiceNo',
                    'refInvoice',
                    'activities',
                    'referencedBy',
                    'paymentMethod',
                    'cashbook',
                    'cashbookId',
                    'actType',
                    'subType'
                ],
                lazyAdd: false
            }
        };

        Y.extend( ReceiptEditorModel, SimpleActivityEditorModel, {

            /**
             *  Enables "caretPosition" for "userContent"
             *  @protected
             *  @property useUserContentCaretPosition
             *  @type {Boolean}
             *  @default true
             */

            useUserContentCaretPosition: true,

            /**
             *  If the receipt is linked to an invoice, load the activity her to display summary
             */

            initializer: function ReceiptEditorModel_initializer() {
                var self = this;
                self.initReceiptEditorModel();
            },

            destructor: function ReceiptEditorModel_destructor() {
                Y.log( 'Cleaning up ReceiptEditorModel', 'debug', NAME );
            },

            initReceiptEditorModel: function ReceiptEditorModel_initReceiptEditorModel() {
                var
                    self = this,
                    binder = self.get( 'binder' ),
                    locations = binder.getInitialData( 'location' ),
                    currentActivity = unwrap( binder.currentActivity ),
                    plainAmount = peek( currentActivity.amount ),
                    paymentMethod = peek( currentActivity.paymentMethod ),
                    cashbookId = peek( currentActivity.cashbookId ),
                    actTypeWithoutAmount = [ 'REMINDER' ],
                    cashBooks;

                self.paymentMethodList = Y.doccirrus.schemas.activity.getPaymentMethodList();

                self.isEditableStatus = ko.computed( function() {
                    var status = currentActivity.status();
                    return ( 'CREATED' === status || 'VALID' === status );
                } );

                self.cashbookList = ko.observableArray( [] );
                Y.doccirrus.jsonrpc.api.invoiceconfiguration.read().done( function ( config ) {
                    var receipts = config.data[0] && config.data[0] && config.data[0].receiptsSchemes || [];
                    cashBooks = receipts.map( function(el){
                        var location = locations.find( function(loc){ return loc._id.toString() === el.locationId; } );
                        return {
                            value: el._id.toString(),
                            name: el.name,
                            text: el.name + (location.locname ? ' (' + location.locname + ')' : ''),
                            locationId: el.locationId
                        };
                    } );

                    var currentLocation = peek( currentActivity.locationId ),
                        cashbooksByLocation = cashBooks.filter( function( el ){ return el.locationId === currentLocation; });
                   self.cashbookList( cashbooksByLocation );

                    if( cashbooksByLocation.some( function(el){ return el.value === cashbookId; } ) ) {
                        currentActivity.cashbookId( cashbookId );
                        currentActivity.setNotModified();
                    }
                } ).fail( function( error ){
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );

                currentActivity.locationId.subscribe( function( value ){
                    var cashbooksByLocation = cashBooks.filter( function( el ){ return el.locationId === value; });
                    self.cashbookList( cashbooksByLocation );
                });

                if ( !plainAmount || '' === plainAmount ) {
                    if ( self.isEditableStatus() ) {
                        currentActivity.amount( parseFloat( 0 ).toFixed(2) );
                        // prevent display save button if activity already created
                        currentActivity.setNotModified();
                    }
                }

                if( !paymentMethod && self.isEditableStatus() ) {
                    self.paymentMethod( 'CASH' );
                    // prevent display save button if activity already created
                    currentActivity.setNotModified();
                }

                self.incashNo = ko.computed( function() {
                    var incashNo = peek( currentActivity.incashNo );

                    if( incashNo ){
                        return i18n( 'InCaseMojit.receiptbook.INCASHNO' ) + ': ' + incashNo;
                    }

                    return '';
                } );

                self.invoiceLinkText = ko.computed( function __getInvoiceLinkText() {
                    var
                        invoiceText = currentActivity.invoiceText ? unwrap( currentActivity.invoiceText ) : '',
                        invoiceNo = currentActivity.invoiceNo ? unwrap( currentActivity.invoiceNo ) : '',
                        invoiceLinkText = i18n( 'InCaseMojit.ReceiptEditorModel.RECEIPT_NOT_LINKED' );


                    if ( !invoiceText && invoiceNo ) {
                        invoiceText = invoiceNo + '';
                    }

                    if ( invoiceText && '' !== invoiceText) {
                        invoiceLinkText = 'Aw: ' + invoiceText;
                    }

                    return invoiceLinkText;
                } );

                self._displayAmount = ko.computed( Y.doccirrus.comctl.simpleHelperPriceComputed( self.amount, { sign: function( val ){
                    val = Math.abs( val );
                    if( peek(self.cashOperationType ) === 'credit' ){
                        val = -1 * val;
                    }
                    return val;
                }} ) );

                self.cashOperationType = ko.observable( peek( self.amount ) < 0 ? 'credit' : 'debit' );
                self.cashOperationType.subscribe( function( val ){
                    var amount = Math.abs( peek( self.amount ) );
                    if( val === 'credit' ){
                        amount = -1 * amount;
                    }
                    self.amount( amount );
                } );

                self.lockInput = ko.computed( function() {
                    //console.warn( " --- isActive", currentActivity._isEditable.isActive()); // became false somewhy
                    return !self.isEditableStatus();
                } );
                self.hideInput = ko.computed( function() { return -1 !== actTypeWithoutAmount.indexOf( currentActivity.actType() ); } );
                self.showPaymentMethod = ko.observable( ['RECEIPT', 'BADDEBT'].indexOf( currentActivity.actType() ) !== -1 );
                self.showCashbook = ko.computed( function() {
                    return Y.doccirrus.auth.hasAdditionalService( 'inCash' ) && (['RECEIPT', 'BADDEBT'].indexOf( currentActivity.actType() ) !== -1) && currentActivity.paymentMethod() === 'CASH';
                } );
                self.titlePaymentMethodI18n = i18n('InCaseMojit.createreceipt_modal_clientJS.title.PAYMENT_METHOD');
                self.titleCashbookI18n = i18n('InCaseMojit.createreceipt_modal_clientJS.title.CASHBOOK');
                self.titleAmountI18n = i18n('InCaseMojit.createreceipt_modal_clientJS.title.AMOUNT');
                self.titleDebitI18n = i18n( "InCaseMojit.createreceipt_modal_clientJS.title.DEBIT" );
                self.titleCreditI18n = i18n( "InCaseMojit.createreceipt_modal_clientJS.title.CREDIT" );

                self.invoiceButtonText = ko.computed( function() {
                    var
                        referencedByPlain = ko.unwrap( currentActivity.referencedBy ),
                        activitiesPlain = ko.unwrap( currentActivity.activities ),
                        hasInvoice = ( ( referencedByPlain.length + activitiesPlain.length ) > 0 );

                    return hasInvoice ? 'Change invoice -' : 'Choose invoice -';
                } );

                self.addDisposable( ko.computed( function() {
                    var
                        cashbookId = unwrap( currentActivity.cashbookId ),
                        cashbookEntry = (peek( self.cashbookList) || []).find( function( el ){ return el.value === cashbookId; });

                    currentActivity.cashbook( cashbookEntry && cashbookEntry.name );
                }));

                self.addDisposable( ko.computed( function() {
                    var
                        paymentMethod = unwrap( self.paymentMethod );
                    if( 'CASH' !== paymentMethod ) {
                        currentActivity.cashbook( '' );
                        currentActivity.cashbookId( null );
                    }
                }));
            },

            /**
             *  Open modal for choosing an invoice (called form button click handler)
             */

            openReceiptInvoiceModal: function() {
                var
                    self = this,
                    currentPatient = peek( self.get('currentPatient') ),
                    currentActivity = peek( self.get('currentActivity') );

                Y.doccirrus.modals.receiptInvoiceSelector.show( {
                    'currentActivity': currentActivity,
                    'currentPatient': currentPatient,
                    'onInvoiceChanged': function( invoiceId, invoiceObj ) { self.onInvoiceChosen( invoiceId, invoiceObj ); }
                } );
            },

            //  EVENT HANDLERS

            /**
             *  Raised when an invoice has been chosen in the modal
             *
             *  @param  invoiceId   {String}
             *  @param  invoiceObj  {Object}
             */

            onInvoiceChosen: function( invoiceId, invoiceObj ) {
                var
                    self = this,
                    currentActivity = peek( self.get('currentActivity') );


                /**
                 * prompt if receipt exceeeds invoice outstanding balance:
                 *
                 * Der Restbetrag (%%ammount%%) der Rechnung ist kleiner als der Quittungsbetrag (%%receiptTotal%%).  Wollen Sie die Quittung trotzdem erstellen?

                 [y/n]
                 */

                if ( !self.isEditableStatus() ) {
                    Y.log( 'Not linking invoice, current activity not editable: ' + unwrap( currentActivity.status ), 'debug', NAME );
                    return;
                }

                if ( invoiceId && '' !== invoiceId ) {
                    //  set new linked invoice
                    currentActivity.activities( [ invoiceId ] );
                    currentActivity.invoiceText( invoiceObj.content || '' );
                    currentActivity.invoiceNo( invoiceObj.invoiceNo || '' );
                } else {
                    //  clear linked invoice
                    //  TODO: mechanism to unlink here
                    currentActivity.activities( [] );
                }
            }

            }, {
                NAME: 'ReceiptEditorModel'
            }
        );
        KoViewModel.registerConstructor( ReceiptEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel',
            'dcreceiptinvoicemodal',
            'WYSWYGViewModel'
        ]
    }
)
;