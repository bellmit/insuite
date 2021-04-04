/*global YUI, ko, _, moment*/

'use strict';

YUI.add( 'DcCreateReceiptModal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            TITLE = i18n( 'InCaseMojit.createreceipt_modal.title.MODAL_TITLE' ),
            CREATE = i18n( 'InCaseMojit.createreceipt_modal.button.CREATE_RECEIPT' ),
            APPROVE = i18n( 'InCaseMojit.createreceipt_modal.button.APPROVE_RECEIPT' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            Disposable = Y.doccirrus.KoViewModel.getDisposable();


        function CreateReceiptModel(){
            CreateReceiptModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( CreateReceiptModel, Disposable, {
            initializer: function CreateReceiptModel_initializer( params ) {
                var self = this,
                    validation = Y.doccirrus.validations.common.decNumber[0],
                    totalReceiptsOutstanding,
                    createBadDebt,
                    currentLocation = self.get( 'locationId' ),
                    amount;

                if( null !== self.get( 'totalReceiptsOutstanding' ) && 'undefined' !== self.get( 'totalReceiptsOutstanding' ) ) {
                    totalReceiptsOutstanding = self.get( 'totalReceiptsOutstanding' ) > 0 ? self.get( 'totalReceiptsOutstanding' ) : 0;
                }

                if( null !== self.get( 'createBadDebt' ) && 'undefined' !== self.get( 'createBadDebt' ) ) {
                    createBadDebt = self.get( 'createBadDebt' );
                }

                self.onReceiptCreate = function( newReceipt ) {
                    if ( params.onReceiptCreate ) {
                        params.onReceiptCreate( newReceipt );
                    } else {
                        Y.log( 'No callback given to receipt modal.', 'error', NAME );
                    }
                };

                self.titleCashbookI18n = i18n('InCaseMojit.createreceipt_modal_clientJS.title.CASHBOOK');
                self.showPaymentMethod = ko.observable( true );
                self.paymentMethodList = Y.doccirrus.schemas.activity.getPaymentMethodList();
                self.timestamp = ko.observable( moment() );
                self.paymentMethod = ko.observable( '' );
                self.cashbookList = ko.observableArray( [] );
                self.cashbookId = ko.observable();
                Y.doccirrus.jsonrpc.api.location
                    .read()
                    .then( function( response ) {
                        return response && response.data || [];
                    } )
                    .done( function( locations ) {
                        Y.doccirrus.jsonrpc.api.invoiceconfiguration.read().done( function ( config ) {
                            var receipts = config.data[0] && config.data[0] && config.data[0].receiptsSchemes || [],
                                cashBooks = receipts.map( function(el){
                                    var location = locations.find( function(loc){ return loc._id.toString() === el.locationId; } );
                                    return {
                                        value: el._id.toString(),
                                        name: el.name,
                                        text: el.name + (location.locname ? ' (' + location.locname + ')' : ''),
                                        locationId: el.locationId
                                    };
                                } );

                            var cashbooksByLocation = cashBooks.filter( function( el ){ return el.locationId === currentLocation; });
                            self.cashbookList( cashbooksByLocation );
                        } ).fail( function( error ){
                            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } );
                    } )
                    .fail( function( error ){
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );

                self.timestampDatepickerOptions = {
                    widgetPositioning: {
                        horizontal: 'right',
                        vertical: 'bottom'
                    },
                    maxDate: moment()
                };

                amount =  totalReceiptsOutstanding >= 0 ? totalReceiptsOutstanding : self.get( 'total' );
                self.amount = ko.observable( Math.abs( amount ) );

                self.cashOperationType = ko.observable( createBadDebt ? 'credit' : 'debit' );

                self._displayAmount = ko.computed( Y.doccirrus.comctl.simpleHelperPriceComputed( self.amount ) );

                self._displayAmount.validationMessages = ko.observableArray( [validation.msg] );
                self._displayAmount.hasError = ko.computed( function() {
                    var
                        num = parseFloat( self.amount().toFixed(2) ),
                        isValid = !Number.isNaN( num ) && validation.validator( num );
                    return !isValid;
                } );
                self.showCashbook = ko.computed( function() {
                    return Y.doccirrus.auth.hasAdditionalService( 'inCash' ) && self.paymentMethod() === 'CASH';
                } );
                self.content = ko.observable( '' );
                self.cashbookId.hasError = ko.computed( function() {
                    return Y.doccirrus.auth.hasAdditionalService( 'inCash' ) && self.paymentMethod() === 'CASH' && !self.cashbookId();
                } );
                self._isValid = ko.computed( function() {
                    return !( unwrap( self._displayAmount.hasError ) || unwrap( self.cashbookId.hasError ) );
                } );

                self.createReceipt = function _createReceipt( approve, cb ) {
                    var
                        operationType = unwrap( self.cashOperationType ),
                        cleanAmount = parseFloat( (peek( self.amount ) + '').replace( ',', '.' ) ).toFixed( 2 ),

                        params = {
                            invoiceId: self.get( 'id' ),
                            amount: (operationType === 'credit' ? -1 : 1) * cleanAmount,
                            content: peek( self.content ),
                            timestamp: peek( self.timestamp ),
                            createBadDebt: createBadDebt || false,
                            linkToInvoice: true,
                            approve: approve
                        },
                        paymentMethod = peek( self.paymentMethod ),
                        cashbookId = peek( self.cashbookId ),
                        cashbookEntry = (peek( self.cashbookList ) || []).find( function( el ) {
                            return el.value === cashbookId;
                        } );

                    if( paymentMethod ) {
                        params.paymentMethod = paymentMethod;
                    }

                    if( cashbookId ) {
                        params.cashbookId = cashbookId;
                    }

                    if( cashbookEntry ) {
                        params.cashbook = cashbookEntry.name || '';
                    }

                    if( isNaN( cleanAmount ) ) {
                        return;
                    }

                    Y.doccirrus.jsonrpc.api.receipt.quickCreate( {
                        data: params
                    } )
                        .done( function( result ) {
                            result = result.data ? result.data : result;
                            self.onReceiptCreate( result );
                            cb();
                        } )
                        .fail( function( err ) {
                            Y.log( 'Error creating receipt: ' + JSON.stringify( err ), 'warn', NAME );
                            return cb();
                        } );
                };
            }
        }, {
            ATTRS: {
                id: {
                    lazyAdd: false,
                    value: null
                },
                total: {
                    lazyAdd: false,
                    value: null
                },
                totalReceiptsOutstanding: {
                    lazyAdd: false,
                    value: null
                },
                createBadDebt: {
                    lazyAdd: false,
                    value: null
                },
                locationId: {
                    lazyAdd: false,
                    value: null
                },
                onReceiptCreate: {
                    lazyAdd: false,
                    value: null
                }

            }
        } );



        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'create-receipt-modal',
                'InCaseMojit',
                data,
                node,
                callback
            );
        }

        function show( data ) {
            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, {}, function() {
                var createReceiptModel = new CreateReceiptModel( data ),
                    modal;



                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-CreateReceipt',
                    bodyContent: node,
                    title: TITLE,
                    maximizable: false,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: Y.doccirrus.DCWindow.SIZE_LARGE,
                    minHeight: 200,
                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            {
                                name: 'APPROVE',
                                label: APPROVE,
                                action: function( e ) {
                                    e.target.button.disable();
                                    this.close( e );
                                    createReceiptModel.createReceipt( true, onComplete );
                                }
                            },
                            Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                isDefault: true,
                                label: CREATE,
                                action: function() {
                                    createReceiptModel.createReceipt( false, onComplete );
                                }
                            })
                        ]
                    },
                    after: {
                        destroy: function() {

                            if( createReceiptModel && createReceiptModel._dispose ) {
                                createReceiptModel._dispose();
                            }
                        }
                    }
                } );
                function onComplete() {
                    modal.close();
                    createReceiptModel.dispose();
                }
                ko.computed( function() {
                    var
                        buttonSave = modal.getButton( 'SAVE' ).button,
                        buttonApprove = modal.getButton( 'APPROVE' ).button,
                        _isValid = createReceiptModel._isValid(),
                        enable = false;

                    if( _isValid ) {
                        enable = true;
                    }

                    if( enable ) {
                        buttonSave.enable();
                        buttonApprove.enable();
                    } else {
                        buttonSave.disable();
                        buttonApprove.disable();
                    }
                } );
                createReceiptModel.titleTimestampI18n = i18n('InCaseMojit.createreceipt_modal_clientJS.title.TIMESTAMP');
                createReceiptModel.titleContentI18n = i18n('InCaseMojit.createreceipt_modal_clientJS.title.CONTENT');
                createReceiptModel.titleAmountI18n = i18n('InCaseMojit.createreceipt_modal_clientJS.title.AMOUNT');
                createReceiptModel.titlePaymentMethodI18n = i18n('InCaseMojit.createreceipt_modal_clientJS.title.PAYMENT_METHOD');
                createReceiptModel.titleDebitI18n = i18n( "InCaseMojit.createreceipt_modal_clientJS.title.DEBIT" );
                createReceiptModel.titleCreditI18n = i18n( "InCaseMojit.createreceipt_modal_clientJS.title.CREDIT" );
                ko.applyBindings( createReceiptModel , node.getDOMNode() );
            } );
        }

        Y.namespace( 'doccirrus.modals' ).createReceiptsModal = { show: show };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dccallermodal',
            'KoViewModel'
        ]
    }
);