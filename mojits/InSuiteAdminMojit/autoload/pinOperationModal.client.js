/**
 * User: as
 * Date: 19.04.18  10:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * User: as
 * Date: 31.01.18  13:25
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/**
 * User: do
 * Date: 20/11/15  17:12
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*global YUI, ko */

YUI.add( 'PinOperationModal', function( Y/*, NAME */ ) {

    var
        getObject = Y.doccirrus.commonutils.getObject,
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n;

    function PinOperationModel( config ) {
        PinOperationModel.superclass.constructor.call( this, config );
    }


    Y.extend( PinOperationModel, KoViewModel.getDisposable(), {
        initializer: function PinOperationModel_initializer(params) {
            var
                self = this;

            self.initValues(params);
        },

        initValues: function(params) {
            var
                self = this;
            var message = params.message;
            var methodToCall = params.methodToCall;
            var context = params.context;
            var CtId = params.CtId;
            var CardHandle = params.CardHandle;
            var PinTyp = params.PinTyp;

            self.message = ko.observable(message);

            Y.doccirrus.jsonrpc.api.timanager.pinOperation( {
                data: {
                    context: context,
                    CtId: CtId,
                    CardHandle: CardHandle,
                    action: methodToCall,
                    PinTyp: PinTyp
                }
            } )
                .done( function( response ){
                    var
                        result = response.data,
                        status, attemptsLeft;

                    switch( methodToCall ) {
                        case 'GetPinStatus':
                            status = result && result.PinStatus;
                            self.message( i18n( 'InTiMojit.pinStatus.' + status ).i18n );
                            break;
                        case 'VerifyPin':
                            status = result && result.PinResult;
                            attemptsLeft = result.LeftTries ? result.LeftTries : '';
                            self.message( i18n( 'InTiMojit.verifyPin.' + status ).i18n + attemptsLeft );
                            break;
                        case 'ChangePin':
                            status = result && result.PinResult;
                            attemptsLeft = result.LeftTries ? result.LeftTries : '';
                            self.message( i18n( 'InTiMojit.changePin.' + status ).i18n + attemptsLeft );
                            break;
                        case 'UnblockPin':
                            status = result && result.PinResult;
                            attemptsLeft = result.LeftTries ? result.LeftTries : '';
                            self.message( i18n( 'InTiMojit.unblockPin.' + status ).i18n + attemptsLeft );
                            break;
                    }
                })
                .fail( function( e ) {
                    if (/\bS:Server:/.test(e.message)){
                        e.message=  e.message.replace("S:Server: ", "");
                    }

                    var faultstring = getObject( 'err.root.Envelope.Body.Fault.faultstring', e );
                    self.message( faultstring || e.message || e );
                } );
        }
    }, {
        NAME: 'PinOperationModel'
    } );

    KoViewModel.registerConstructor( PinOperationModel );

    function PinOperationModal() {}

    PinOperationModal.prototype.show = function (args) {
        return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
            .renderFile( { path: 'InSuiteAdminMojit/views/pinOperation_modal' } )
        )
            .then( function( response ) {
                return response && response.data;
            } )
            .then( function( template ) {
                return new Promise( function( resolve ) {
                    var
                        bodyContent = Y.Node.create( template ),
                        modal,
                        pinOperationModel;

                    modal = new Y.doccirrus.DCWindow( {
                        id: 'pinOperation_modal',
                        className: 'DCWindow-Appointment',
                        bodyContent: bodyContent,
                        title: i18n( 'InTiMojit.pinOperationHeader.' + args.methodToCall ).i18n,
                        width: '30%',
                        height: '30%',
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: [ 'close' ],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CLOSE', {
                                    isDefault: true,
                                    action: function() {
                                        resolve();
                                        this.close();
                                    }
                                } )
                            ]
                        },
                        after: {
                            destroy: function() {
                                ko.cleanNode( bodyContent.getDOMNode() );
                                resolve();
                                pinOperationModel.destroy();
                            }
                        }
                    } );

                    pinOperationModel = new PinOperationModel( {
                        modal: modal,
                        onItemSelected: function( data ) {
                            resolve( data );
                        },
                        message: args.modalMessage,
                        methodToCall: args.methodToCall,
                        context: args.context,
                        CtId: args.CtId,
                        CardHandle: args.CardHandle,
                        PinTyp: args.PinTyp
                    } );

                    ko.applyBindings( pinOperationModel, bodyContent.getDOMNode() );

                } );

            } ).catch( );
    };


    Y.namespace( 'doccirrus.modals' ).pinOperationModal = new PinOperationModal();

}, '0.0.1', {
    requires: [
        'doccirrus',
        'KoViewModel',
        'DCWindow',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dccommonutils'
    ]
} );
