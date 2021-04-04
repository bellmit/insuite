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

YUI.add( 'portscanmodal', function( Y/*, NAME */ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        //catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap;

    function PortScanModel( config ) {
        PortScanModel.superclass.constructor.call( this, config );
    }


    Y.extend( PortScanModel, KoViewModel.getDisposable(), {

        initializer: function PortScanModel_initializer() {
            var
                self = this;

            self.driversList(self.get('driversList'));
            self.availablePorts([]);
        },
        driversList: ko.observableArray([]),
        selectedDriver: ko.observable(),
        scanPorts: function() {
            var self = this;
            self.availablePorts([]);
            if (unwrap(self.portLimit)) {
                Y.doccirrus.communication.apiCall( {
                    method: 'dscrmanager.scanPorts',
                    data: {
                        driver: unwrap(self.selectedDriver),
                        min: 0,
                        max: parseInt(unwrap(self.portLimit), 10)
                    }
                }, function( err, res ) {
                    if( err ) {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            content: i18n('DeviceMojit.tab_cardreader.errors.scanPortError'),
                            level: 'ERROR'
                        } );
                        return;
                    }

                    var portsFound = res.data.ports;

                    portsFound.forEach(function( port ) {
                        self.availablePorts.push(port);
                    });
                } );
            }
        },
        portLimit: ko.observable(10),
        availablePorts: ko.observableArray(),
        driversLabel: i18n('cardreaderconfiguration-schema.portscanModal.driversLabel'),
        portsLabel: i18n('cardreaderconfiguration-schema.portscanModal.portsLabel'),
        searchButtonText: i18n('cardreaderconfiguration-schema.portscanModal.searchButtonText'),
        resultText: i18n('cardreaderconfiguration-schema.portscanModal.result'),
        noPortFoundText: i18n('cardreaderconfiguration-schema.portscanModal.noPortFoundText')
    }, {
        NAME: 'PortScanModel',
        ATTRS: {
            driversList: {
                value: [],
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( PortScanModel );

    function PortScanModal() {
    }

    PortScanModal.prototype.show = function () {
        return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
            .renderFile( { path: 'DeviceMojit/views/portscan_modal' } )
        )
            .then( function( response ) {
                return response && response.data;
            } )
            .then( function( template ) {
                Y.doccirrus.communication.apiCall( {
                    method: 'dscrmanager.listPlatformDrivers',
                    data: {}
                }, function( err, res ) {
                    if( err ) {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            content: i18n('DeviceMojit.tab_cardreader.errors.driverError'),
                            level: 'ERROR'
                        } );
                        return;
                    }

                    var
                        bodyContent = Y.Node.create( template ),
                        modal,
                        portScanModel;

                    modal = new Y.doccirrus.DCWindow( {
                        id: 'port_scan_modal',
                        className: 'DCWindow-Appointment',
                        bodyContent: bodyContent,
                        title: i18n( 'cardreaderconfiguration-schema.portscanModal.title' ).i18n,
                        width: '40%',
                        height: '75%',
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
                                portScanModel.destroy();
                            }
                        }
                    } );

                    portScanModel = new PortScanModel( {
                        modal: modal,
                        driversList: res.data.data
                        // onItemSelected: function( data ) {
                        //     resolve( data );
                        // }
                    } );

                    ko.applyBindings( portScanModel, bodyContent.getDOMNode() );
                } );

            } ).catch( );
    };


    Y.namespace( 'doccirrus.modals' ).portScanModal = new PortScanModal();

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
