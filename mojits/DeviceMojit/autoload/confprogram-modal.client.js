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

YUI.add( 'confprogrammodal', function( Y/*, NAME */ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        //catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        i18n = Y.doccirrus.i18n,
        //unwrap = ko.unwrap,
        APPLY = i18n( 'InCaseMojit.medication_modalJS.button.APPLY' );

    function ConfprogramModel( config ) {
        ConfprogramModel.superclass.constructor.call( this, config );
    }


    Y.extend( ConfprogramModel, KoViewModel.getDisposable(), {

        initializer: function ConfprogramModel_initializer() {
            var
                self = this;

            self.initValues();
        },

        initValues: function() {
            var self = this;
            self.initGTBtn();
            self.initOrgaBtn();
        },
        initGTBtn: function() {
            var self = this;

            self.gtBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'SAVE_BTN',
                    option: 'PRIMARY',
                    size: 'SMALL',
                    text: 'GT (German Telematics)',//i18n( 'cardreaderconfiguration-schema.utilsButtons.scanPorts' ).i18n,
                    click: function() {
                        console.log('GT');

                        Y.doccirrus.jsonrpc.api.dscrmanager.contactDeviceServer( {
                            data: {
                                action: 'executeProgram'
                            }
                        } )
                            .done( function( res ) {
                                console.log(res);
                            } )
                            .fail( function(err) {
                                console.log(err);
                            } );
                    }
                }
            });
        },
        initOrgaBtn: function() {
            var self = this;

            self.orgaBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'SAVE_BTN',
                    option: 'PRIMARY',
                    size: 'SMALL',
                    text: 'Orga (Ingenico Healthcare)',//i18n( 'cardreaderconfiguration-schema.utilsButtons.scanPorts' ).i18n,
                    click: function() {
                        console.log('Orga');
                    }
                }
            });
        },
        codeText: ko.observable('[klicken sie auf ein\n' +
                                '        Konfigurationsprogramm um den Vorgang zu starten]')
    }, {
        NAME: 'ConfprogramModel'
    } );

    KoViewModel.registerConstructor( ConfprogramModel );

    function ConfprogramModal() {
    }

    ConfprogramModal.prototype.show = function () {
        return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
            .renderFile( { path: 'DeviceMojit/views/confprogram_modal' } )
        )
            .then( function( response ) {
                return response && response.data;
            } )
            .then( function( template ) {
                return new Promise( function( resolve ) {
                    var
                        bodyContent = Y.Node.create( template ),
                        modal,
                        confprogramModel;

                    modal = new Y.doccirrus.DCWindow( {
                        id: 'confprogram_modal',
                        className: 'DCWindow-Appointment',
                        bodyContent: bodyContent,
                        title: 'Konfigurationsprogramme',//i18n( 'cardreaderconfiguration-schema.portscanModal.title' ).i18n,
                        width: '95%',
                        height: '85%',
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: [ 'close' ],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    isDefault: true,
                                    action: function() {
                                        this.close();
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    label: APPLY,
                                    isDefault: true,
                                    action: function() {
                                        this.close();
                                        resolve( confprogramModel.toJSON() );

                                    }
                                } )
                            ]
                        },
                        after: {
                            destroy: function() {
                                ko.cleanNode( bodyContent.getDOMNode() );
                                confprogramModel.destroy();
                            }
                        }
                    } );

                    confprogramModel = new ConfprogramModel( {
                        modal: modal,
                        onItemSelected: function( data ) {
                            resolve( data );
                        }

                    } );

                    ko.applyBindings( confprogramModel, bodyContent.getDOMNode() );

                } );

            } ).catch( );
    };


    Y.namespace( 'doccirrus.modals' ).confprogramModal = new ConfprogramModal();

}, '0.0.1', {
    requires: [
        'doccirrus',
        'KoViewModel',
        'DCWindow',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'v_cardreaderconfiguration-schema'
    ]
} );
