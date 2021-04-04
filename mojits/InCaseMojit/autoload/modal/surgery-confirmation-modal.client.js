/*global YUI, ko */

YUI.add( 'SurgeryConfirmationModal', function( Y/*, NAME */ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        i18n = Y.doccirrus.i18n,
        titleI18n = i18n( 'InCaseMojit.SurgeryEditorModel.modals.warningTitle' );


    function SurgeryConfirmationModel( config ) {
        SurgeryConfirmationModel.superclass.constructor.call( this, config );
    }

    Y.extend( SurgeryConfirmationModel, KoViewModel.getDisposable(), {
        initializer: function SurgeryConfirmationModel_initializer() {},
        destructor: function SurgeryConfirmationModel_destructor() {}
    }, {
        NAME: 'SurgeryConfirmationModel'
    } );

    KoViewModel.registerConstructor( SurgeryConfirmationModel );

    function SurgeryConfirmationModal() {}
    SurgeryConfirmationModal.prototype.show = function ( message ) {
        return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
            .renderFile( { path: 'InCaseMojit/views/surgery-confirmation-modal' } )
        ).then( function( response ) {
            return new Promise( function(resolve){
                var
                    modal,
                    surgeryConfirmationModel,
                    template = response && response.data,
                    bodyContent = Y.Node.create( template );

                bodyContent.setHTML( message );

                modal = new Y.doccirrus.DCWindow( {
                    id: 'surgery-confirmation-modal',
                    className: 'DCWindow-Surgery',
                    bodyContent: bodyContent,
                    title: titleI18n,
                    width: '40%',
                    height: '30%',
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                action: function() {
                                    this.close();
                                    return resolve(false);
                                }
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function() {
                                    this.close();
                                    return resolve(true);
                                }
                            } )
                        ]
                    },
                    after: {
                        destroy: function() {
                            ko.cleanNode( bodyContent.getDOMNode() );
                            surgeryConfirmationModel.destroy();
                        }
                    }
                } );

                surgeryConfirmationModel = new SurgeryConfirmationModel({ modal: modal });

                ko.applyBindings( surgeryConfirmationModel, bodyContent.getDOMNode() );
            });

        }).catch( catchUnhandled );
    };

    Y.namespace( 'doccirrus.modals' ).surgeryConfirmationModal = new SurgeryConfirmationModal();

}, '0.0.1', {
    requires: [
        'doccirrus',
        'KoViewModel',
        'DCWindow'
    ]
} );

