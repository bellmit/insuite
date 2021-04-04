/**
 * User: as
 * Date: 02.05.18  12:29
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*global YUI, ko */

YUI.add( 'readCardHintModal', function( Y/*, NAME */ ) {

    var KoViewModel = Y.doccirrus.KoViewModel;

    function ReadCardHintModel( config ) {
        ReadCardHintModel.superclass.constructor.call( this, config );
    }

    Y.extend( ReadCardHintModel, KoViewModel.getDisposable(), {
        initializer: function ReadCardHintModel_initializer(params) {
            var promptForcedOnlineCheckMessage = params.promptForcedOnlineCheck ? 'Es wurde kein Prüfungsnachweiss gefunden.' : '';
            var promptRegularOnlineCheckMessage = params.promptRegularOnlineCheck ? 'Eine Online-Prüfung wurde durchgeführt.' : '';
            var errorCodeMessage;

            switch( params.errorCode ) {
                case '3':
                    errorCodeMessage = 'Die Aktualisierung der VSD auf der eGK war technisch nicht möglich.';
                    break;
                case '4':
                    errorCodeMessage = 'Authentifizierungszertifikat eGK ungültig.';
                    break;
                case '5':
                    errorCodeMessage = 'Die eGK enthält inkonsistente Versichertendaten. Eine Online-Prüfung ist notwendig.';
                    break;
                case '6':
                    errorCodeMessage = 'Die Online-Prüfung konnte aufgrund von längerer Nichterreichbarkeit der Telematik-Infrastruktur nicht durchgeführt werden. Bitte ergreifen Sie Maßnahmen, um den Fehler zu analysieren und zu beseitigen.';
                    break;
                default:
                    errorCodeMessage = '';
                    break;
            }

            this.promptForcedOnlineCheckMessage = ko.observable(promptForcedOnlineCheckMessage);
            this.promptRegularOnlineCheckMessage = ko.observable(promptRegularOnlineCheckMessage);
            this.errorCodeMessage = ko.observable(errorCodeMessage);
        }
    }, {
        NAME: 'readCardHintModel'
    } );

    KoViewModel.registerConstructor( ReadCardHintModel );

    function ReadCardHintModal() {}

    ReadCardHintModal.prototype.show = function (args) {
        return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
            .renderFile( { path: 'InCaseMojit/views/readCardHintModal' } )
        )
            .then( function( response ) {
                return response && response.data;
            } )
            .then( function( template ) {
                return new Promise( function( resolve ) {
                    var
                        bodyContent = Y.Node.create( template ),
                        modal,
                        readCardHintModel;

                    modal = new Y.doccirrus.DCWindow( {
                        id: 'readCardHintModal',
                        className: 'DCWindow-Appointment',
                        bodyContent: bodyContent,
                        title: 'TI',
                        width: '30%',
                        height: '40%',
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: [ 'close' ],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        this.close();
                                    }
                                } )
                            ]
                        },
                        after: {
                            destroy: function() {
                                ko.cleanNode( bodyContent.getDOMNode() );
                                readCardHintModel.destroy();
                            }
                        }
                    } );

                    readCardHintModel = new ReadCardHintModel( {
                        modal: modal,
                        onItemSelected: function( data ) {
                            resolve( data );
                        },
                        errorCode: args.errorCode,
                        promptForcedOnlineCheck: args.promptForcedOnlineCheck,
                        promptRegularOnlineCheck: args.promptRegularOnlineCheck
                    } );

                    ko.applyBindings( readCardHintModel, bodyContent.getDOMNode() );

                } );

            } ).catch(function( ) {
                //console.log(e);
            } );
    };


    Y.namespace( 'doccirrus.modals' ).readCardHintModal = new ReadCardHintModal();

}, '0.0.1', {
    requires: [
        'doccirrus',
        'KoViewModel',
        'DCWindow',
        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );
