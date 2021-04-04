/**
 * User: oliversieweke
 * Date: 26.04.18  13:58
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko */

YUI.add( 'TiStatusModal', function( Y/*, NAME*/ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        i18n = Y.doccirrus.i18n;

    function TiStatusModel( config ) {
        TiStatusModel.superclass.constructor.call( this, config );
    }

    Y.extend( TiStatusModel, KoViewModel.getDisposable(), {
        initializer: function TiStatusModel_initializer(params) {
            var
                self = this;

            self.message = ko.observable(params.message);
        },
        destructor: function serviceVersionsNotSupported_destructor() {}
    }, {
        NAME: 'TiStatusModel'
    } );

    KoViewModel.registerConstructor( TiStatusModel );

    function TiStatusModal() {}
    TiStatusModal.prototype.show = function (message) {
        return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
            .renderFile( { path: 'InTiMojit/views/tistatus-modal' } )
        ).then( function( response ) {
            var
                modal,
                tiStatusModel,
                template = response && response.data,
                bodyContent = Y.Node.create( template );

            modal = new Y.doccirrus.DCWindow( {
                id: 'tistatus-modal',
                className: 'DCWindow-TI',
                bodyContent: bodyContent,
                title: i18n( 'InTiMojit.tiStatusModal.title' ),
                width: '40%',
                height: '30%',
                centered: true,
                modal: true,
                render: document.body,
                buttons: {
                    header: ['close'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true
                        } )
                    ]
                },
                after: {
                    destroy: function() {
                        ko.cleanNode( bodyContent.getDOMNode() );
                        tiStatusModel.destroy();
                    }
                }
            } );

            tiStatusModel = new TiStatusModel({
                modal: modal,
                message: message
            });

            ko.applyBindings( tiStatusModel, bodyContent.getDOMNode() );

        }).catch( catchUnhandled );
    };

    Y.namespace( 'doccirrus.modals' ).tiStatusModal = new TiStatusModal();

}, '0.0.1', {
    requires: [
        'doccirrus',
        'KoViewModel',
        'DCWindow'
    ]
} );
