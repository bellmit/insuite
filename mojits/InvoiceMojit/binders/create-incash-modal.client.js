/*global YUI, ko, moment, _*/

'use strict';

YUI.add( 'DcCreateIncashModal', function( Y /*, NAME*/ ) {
        var
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            Disposable = Y.doccirrus.KoViewModel.getDisposable();


        function CreateIncashModel(){
            CreateIncashModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( CreateIncashModel, Disposable, {
            initializer: function( config ) {
                var self = this,
                    data = config && config.data || {},
                    validation = Y.doccirrus.validations.common.decNumber[0],
                    amount;

                self.selectAll = function( model, event ){
                    if( event && event.target && event.target.select ){
                        event.target.select();
                    }
                };

                self._id = ko.observable( data._id );
                self.timestamp = ko.observable( data.timestamp || moment() );

                self.timestampDatepickerOptions = {
                    widgetPositioning: {
                        horizontal: 'right',
                        vertical: 'bottom'
                    },
                    maxDate: moment()
                };

                amount = data.amount || 0;
                self.amount = ko.observable( Math.abs( amount ) );

                self.cashOperationType = ko.observable( amount < 0 ? 'credit' : 'debit' );

                self._displayAmount = ko.computed( Y.doccirrus.comctl.simpleHelperPriceComputed( self.amount ) );

                self._displayAmount.validationMessages = ko.observableArray( [validation.msg] );
                self._displayAmount.hasError = ko.computed( function() {
                    var
                        isValid = validation.validator( parseFloat( self.amount().toFixed( 2 ) ) );
                    return !isValid;
                } );
                self.content = ko.observable( data.content || '' );

                self.cashbook = ko.observable();
                self.cashbook.hasError = ko.computed( function() {
                    return !unwrap( self.cashbook );
                } );
                self.locationId = ko.observable( data.locationId );

                self.cashbook.subscribe( function( val ) {
                    var location = unwrap( self.cashbookList ).find( function( el ) {
                        return el.val === val;
                    } );
                    if( location && location.locationId ) {
                        self.locationId( location.locationId );
                    }
                } );

                self._isValid = ko.computed( function() {
                    return !unwrap( self._displayAmount.hasError ) && unwrap( self.cashbook );
                } );

                var allLocations = config.allLocations || [];
                self.locations = ko.observableArray( allLocations );
                self.cashbookList = ko.observableArray( [] );
                if( !unwrap(self.locations).length ) {
                    Y.doccirrus.jsonrpc.api.location.read( {fields: ['locname']} ).done( function( locations ) {
                        self.locations( locations.data || [] );
                    } ).fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } ).always( function(){
                        self.initCashbooks( data, self.locations() );
                    });
                } else {
                    self.initCashbooks( data, allLocations );
                }

            },
            initCashbooks: function( data, locations ){
                var self = this;
                Y.doccirrus.jsonrpc.api.invoiceconfiguration.read().done( function ( config ) {
                    var receipts = config.data[0] && config.data[0] && config.data[0].receiptsSchemes || [];
                    self.cashbookList( receipts.map( function(el){
                        var location = locations.find( function(loc){ return loc._id.toString() === el.locationId; } );
                        return {
                            val: el._id.toString(),
                            i18n: el.name + (location.locname ? ' (' + location.locname + ')' : ''),
                            name: el.name,
                            locationId: el.locationId
                        };
                    } ) );
                } ).fail( function( error ){
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } ).always( function(){
                    var cashbook;
                    if(data.cashbook){
                        cashbook = unwrap( self.cashbookList ).find( function( book ){ return book.val === data.cashbookId; } );
                        if( cashbook ){
                            self.cashbook( cashbook.val );
                        }
                    }
                });
            }
        }, {
            ATTRS: {}
        } );



        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'create-incash-modal',
                'InvoiceMojit',
                data,
                node,
                callback
            );
        }

        function show( config ) {
            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, {}, function() {
                var createIncashModel = new CreateIncashModel( config ),
                    modal,
                    title = (config.data && config.data._id) ?
                        i18n( 'InCaseMojit.createreceipt_modal_clientJS.title.ENTRY', { data: { incashNo: config.data.incashNo || 'n/a' } } ) :
                        i18n( 'InCaseMojit.createreceipt_modal_clientJS.title.NEW_ENTRY' );
                
                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-CreateIncash',
                    bodyContent: node,
                    title: title,
                    maximizable: false,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    minHeight: 200,
                    minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                isDefault: true,
                                action: function() {
                                    var cashbook = unwrap( createIncashModel.cashbook ),
                                        cashBookObj = unwrap( createIncashModel.cashbookList ).find( function(el){ return el.val === cashbook; }),
                                        operationType = unwrap( createIncashModel.cashOperationType ),
                                        amount = unwrap( createIncashModel.amount );

                                    Y.doccirrus.jsonrpc.api.incash.save({
                                        _id: unwrap( createIncashModel._id ),
                                        cashbook: cashBookObj.name,
                                        cashbookId: cashBookObj.val,
                                        timestamp: unwrap( createIncashModel.timestamp ),
                                        amount: ( operationType === 'credit' ? -1 : 1 ) * amount,
                                        locationId: unwrap( createIncashModel.locationId ),
                                        content: unwrap( createIncashModel.content )
                                    } ).done( function(){
                                        if( config.table ){
                                            config.table.reload();
                                        }
                                    } ).fail( function( error ) {
                                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                    } );
                                    this.close();
                                }
                            })
                        ]
                    },
                    after: {
                        destroy: function() {
                            if( createIncashModel && createIncashModel._dispose ) {
                                createIncashModel._dispose();
                            }
                        }
                    }
                } );
                ko.computed( function() {
                    var
                        buttonSave = modal.getButton( 'SAVE' ).button,
                        _isValid = createIncashModel._isValid(),
                        enable = false;

                    if( _isValid ) {
                        enable = true;
                    }

                    if( enable ) {
                        buttonSave.enable();
                    } else {
                        buttonSave.disable();
                    }
                } );
                createIncashModel.titleCashbookI18n = i18n( 'InCaseMojit.receiptbook.CASHBOOK' );
                createIncashModel.titleTimestampI18n = i18n('InCaseMojit.createreceipt_modal_clientJS.title.TIMESTAMP');
                createIncashModel.titleContentI18n = i18n('InCaseMojit.createreceipt_modal_clientJS.title.CONTENT');
                createIncashModel.titleAmountI18n = i18n('InCaseMojit.createreceipt_modal_clientJS.title.AMOUNT');
                createIncashModel.titleDebitI18n = i18n( "InCaseMojit.createreceipt_modal_clientJS.title.DEBIT" );
                createIncashModel.titleCreditI18n = i18n( "InCaseMojit.createreceipt_modal_clientJS.title.CREDIT" );
                ko.applyBindings( createIncashModel , node.getDOMNode() );
            } );
        }

        Y.namespace( 'doccirrus.modals' ).CreateIncashModal = { show: show };

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