/**
 * User: oliversieweke
 * Date: 18.05.18  17:10
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko */

YUI.add( 'WorkStationDeletionPreventedModal', function( Y/*, NAME*/ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        i18n = Y.doccirrus.i18n;

    function WorkStationDeletionPreventedModel( config ) {
        WorkStationDeletionPreventedModel.superclass.constructor.call( this, config );
    }

    Y.extend( WorkStationDeletionPreventedModel, KoViewModel.getDisposable(), {
        initializer: function WorkStationDeletionPreventedModel_initializer(params) {
            var
                self = this;

            self.message = ko.observable(params.message);
        },
        destructor: function serviceVersionsNotSupported_destructor() {}
    }, {
        NAME: 'WorkStationDeletionPreventedModel'
    } );

    KoViewModel.registerConstructor( WorkStationDeletionPreventedModel );

    function WorkStationDeletionPreventedModal() {}
    WorkStationDeletionPreventedModal.prototype.show = function (message) {
        return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
            .renderFile( { path: 'InTiMojit/views/tistatus-modal' } )
        ).then( function( response ) {
            var
                modal,
                workStationDeletionPreventedModel,
                template = response && response.data,
                bodyContent = Y.Node.create( template );

            modal = new Y.doccirrus.DCWindow( {
                id: 'tistatus-modal',
                className: 'DCWindow-TI',
                bodyContent: bodyContent,
                title: i18n( 'WorkStations.workStationDeletionPreventedModal.title' ),
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
                        workStationDeletionPreventedModel.destroy();
                    }
                }
            } );

            workStationDeletionPreventedModel = new WorkStationDeletionPreventedModel({
                modal: modal,
                message: message
            });

            ko.applyBindings( workStationDeletionPreventedModel, bodyContent.getDOMNode() );

        }).catch( catchUnhandled );
    };

    Y.namespace( 'doccirrus.modals' ).workStationDeletionPreventedModal = new WorkStationDeletionPreventedModal();

}, '0.0.1', {
    requires: [
        'doccirrus',
        'KoViewModel',
        'DCWindow'
    ]
} );