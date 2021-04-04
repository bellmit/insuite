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

YUI.add( 'deviceServerWarningModal', function( Y/*, NAME */ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n;

    function DeviceServerWarningModel( config ) {
        DeviceServerWarningModel.superclass.constructor.call( this, config );
    }

    Y.extend( DeviceServerWarningModel, KoViewModel.getDisposable(), {

        initializer: function DeviceServerWarningModel_initializer() {
            this.type = this.get('type');
            this.warning = i18n( 'cardreaderconfiguration-schema.warningModal.warning.type.' + this.type ).i18n;
        },
        type: ko.observable(),
        warning: ko.observable()
    }, {
        NAME: 'DeviceServerWarningModel',
        ATTRS: {
            type: {
                value: '',
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( DeviceServerWarningModel );

    function DeviceServerWarningModal() {
    }

    DeviceServerWarningModal.prototype.show = function (type) {
        return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
            .renderFile( { path: 'DeviceMojit/views/deviceServer-warning-modal' } )
        )
            .then( function( response ) {
                return response && response.data;
            } )
            .then( function( template ) {
                var
                    bodyContent = Y.Node.create( template ),
                    modal,
                    deviceServerWarningModel;

                modal = new Y.doccirrus.DCWindow( {
                    id: 'deviceServerWarningModal',
                    className: 'DCWindow-Appointment',
                    bodyContent: bodyContent,
                    title: i18n( 'cardreaderconfiguration-schema.warningModal.title' ).i18n,
                    width: '40%',
                    height: '40%',
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
                            } )
                        ]
                    },
                    after: {
                        destroy: function() {
                            ko.cleanNode( bodyContent.getDOMNode() );
                            deviceServerWarningModel.destroy();
                        }
                    }
                } );

                deviceServerWarningModel = new DeviceServerWarningModel( {
                    modal: modal,
                    type: type
                } );

                ko.applyBindings( deviceServerWarningModel, bodyContent.getDOMNode() );

            } );
    };


    Y.namespace( 'doccirrus.modals' ).deviceServerWarningModal = new DeviceServerWarningModal();

}, '0.0.1', {
    requires: [
        'doccirrus',
        'KoViewModel',
        'DCWindow',
        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );
