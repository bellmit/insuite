/**
 * User: do
 * Date: 20/11/15  17:12
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'KimTreatmentAutoCreationConfirmationModal', function( Y/*, NAME */ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n;

    function KimTreatmentAutoCreationConfirmationModal( config ) {
        KimTreatmentAutoCreationConfirmationModal.superclass.constructor.call( this, config );
    }


    Y.extend( KimTreatmentAutoCreationConfirmationModal, KoViewModel.getDisposable(), {

        initializer: function KimTreatmentAutoCreationConfirmationModal_initializer( config ) {
            this.initValues( config );
        },

        initValues: function( config ) {
            this.disclaimer = i18n( 'IncaseAdminMojit.incase_tab_configuration_generalsettings.KIM_TREATMENT_AUTO_CREATION_INFO' );

            this.kimTreatmentAutoCreationOnEDocLetterSent = ko.observable( config.kimTreatmentAutoCreationOnEDocLetterSent );

            this.kimTreatmentAutoCreationOnEDocLetterSent.i18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterSent.i18n' );

            this.kimTreatmentAutoCreationOnEDocLetterReceived = ko.observable( config.kimTreatmentAutoCreationOnEDocLetterReceived );

            this.kimTreatmentAutoCreationOnEDocLetterReceived.i18n = i18n( 'incaseconfiguration-schema.IncaseConfiguration_T.kimTreatmentAutoCreationOnEDocLetterReceived.i18n' );
        },

        confirm: function() {
            return Y.doccirrus.jsonrpc.api.incaseconfiguration.saveConfig( {
                data: {
                    inCaseConfig: {
                        kimTreatmentAutoCreationOnEDocLetterSent: peek( this.kimTreatmentAutoCreationOnEDocLetterSent ),
                        kimTreatmentAutoCreationOnEDocLetterReceived: peek( this.kimTreatmentAutoCreationOnEDocLetterReceived )
                    }
                }
            } );
        }
    }, {
        NAME: 'KimTreatmentAutoCreationConfirmationModal'
    } );

    KoViewModel.registerConstructor( KimTreatmentAutoCreationConfirmationModal );

    function show( data ) {

        return new Promise(function (resolve, reject) {
            var
                node = Y.Node.create( '<div></div>' ),
                modal,
                viewModel = new KimTreatmentAutoCreationConfirmationModal( data );

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'KimTreatmentAutoCreationConfirmationModal',
                'PatientTransferMojit',
                {},
                node,
                function() {

                    modal = new Y.doccirrus.DCWindow( { //eslint-disable-line no-unused-vars
                        className: 'DCWindow-PatientTransferUpadate',
                        bodyContent: node,
                        title: i18n( 'utils_clientJS.confirmDialog.title.CONFIRMATION' ),
                        icon: Y.doccirrus.DCWindow.ICON_QUESTION,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: [
                                Y.doccirrus.DCWindow.getButton( 'close', {
                                    action: function() {
                                        resolve( null );

                                        this.close();
                                    }
                                })
                            ],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function() {
                                        resolve( null );

                                        this.close();
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    label: i18n( 'general.button.TAKE' ),
                                    action: function() {
                                        var
                                            self = this;

                                        viewModel
                                            .confirm()
                                            .done(function (response) {
                                                if (
                                                    response &&
                                                    response.data &&
                                                    response.data.inCaseConfig
                                                ) {
                                                    resolve(response.data.inCaseConfig);
                                                } else {
                                                    reject( new Error('KimTreatmentAutoCreationConfirmationModal: No inCaseConfig response') );
                                                }
                                            })
                                            .fail(function (response) {
                                                var
                                                    errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                                                if( errors.length ) {
                                                    Y.Array.invoke( errors, 'display' );
                                                }

                                                reject( errors );
                                            })
                                            .always( function() {
                                                self.close();
                                            } );
                                    }
                                } )
                            ]
                        }
                    } );

                    ko.applyBindings( viewModel, node.getDOMNode() );
                }
            );
        });
    }


    Y.namespace( 'doccirrus.modals' ).KimTreatmentAutoCreationConfirmationModal = {
        show: show
    };

}, '0.0.1', {
    requires: [
        'KoViewModel',
        'DCWindow',
        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );
