/*
 @author: ma
 @date: 2015/03/18
 */
/*jshint noempty:false */

/*global YUI, ko */

'use strict';

YUI.add( 'dcpatienttransfermodal', function( Y ) {
        var i18n = Y.doccirrus.i18n,
            CHOOSE_PARTER = i18n( 'InCaseMojit.start-telekonsil-modalJS.CHOOSE_PARTER' ),
        //CHOOSE_PARTICIPANTS = i18n( 'InCaseMojit.start-telekonsil-modalJS.CHOOSE_PARTICIPANTS' ),
            CANCEL = i18n( 'general.button.CANCEL' ),
            CONFIRM = i18n( 'general.button.CONFIRM' ),
            NEXT = i18n( 'general.button.NEXT' );

        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'patienttransfer_modal',
                'InCaseMojit',
                data,
                node,
                callback
            );
        }

        function ProcessViewModel() {
            var self = this;

            self.currentStep = ko.observable( 1 );

            self.isVisibleOn = function( step ) {
                return ko.computed( function() {
                    var currentStep = self.currentStep();
                    return step === 'step' + currentStep;
                } );
            };

            self.partnerTable = Y.doccirrus.tables.createPartnerTable();
            self.confirmModal = ko.observable();

            self.confirmModalReady = ko.computed( function() {
                return true;
            } );

            self.partnersReady = ko.computed( function() {
                var checked = self.partnerTable.getComponentColumnCheckbox().checked();
                return Boolean( checked.length ) && isValid( checked );
            } );

            self.currentStepIsReady = ko.computed( function() {
                if( 1 === self.currentStep() ) {
                    return self.partnersReady();
                } else if( 2 === self.currentStep() ) {
                    return self.confirmModalReady();
                }
            } );

            self.getPartners = function() {
                return self.partnerTable.getComponentColumnCheckbox().checked();
            };

            self.getCheckedPartnerNames = function() {
                return self.getPartners().map( function( partner ) {
                    return partner.name;
                } );
            };
        }

        function sendTransferRequest( data, partners ) {
            data.partners = partners;
            Y.doccirrus.ajax.send( {
                type: 'POST',
                xhrFields: {
                    withCredentials: true
                },
                url: Y.doccirrus.infras.getPrivateURL( '/1/patientTransfer/:dispatchPatientData' ),
                data: data,
                success: function( body ) {
                    var
                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( body );
                    if( errors && errors[0] ) {
                        Y.Array.invoke( errors, 'display', 'info' );
                    }
                },
                error: function() {
                    Y.doccirrus.utils.loadingDialog( 'error', 'An error happened trying to delete the patient', null );
                }
            } );
        }

        function isValid( partners ) {
            return Y.Array.every( partners, function( p ) {
                return 'CONFIRMED' === p.status && p.publicKey;
            } );
        }

        function show( data ) {

            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, data, function() {
                var transferWizard,
                    processVM = new ProcessViewModel();

                transferWizard = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-TransferWizard',
                    bodyContent: node,
                    title: CHOOSE_PARTER,
                    maximizable: true,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    minHeight: 200,
                    minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'BACK', {
                                disabled: true,
                                action: function() {
                                    var currentStep = processVM.currentStep();
                                    if( 1 < currentStep ) {
                                        processVM.currentStep( currentStep - 1 );
                                    }
                                }
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                label: CANCEL
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                label: NEXT,
                                disabled: true,
                                action: function() {
                                    var currentStep = processVM.currentStep();
                                    if( 2 === currentStep ) {
                                        sendTransferRequest( data, processVM.getPartners() );
                                        this.close(); // the last step here
                                    } else if( 1 >= currentStep ) {
                                        processVM.currentStep( currentStep + 1 );
                                    }
                                }
                            } )
                        ]
                    }
                } );

                ko.computed( function() {

                    var
                        currentStep = processVM.currentStep(),
                        ready = processVM.currentStepIsReady();

                    if( transferWizard && ready ) {
                        transferWizard.getButton( 'OK' ).button.enable();
                    } else if( transferWizard ) {
                        transferWizard.getButton( 'OK' ).button.disable();
                    }

                    if( 1 >= currentStep ) {
                        transferWizard.getButton( 'BACK' ).button.disable();
                        transferWizard.getButton( 'OK' ).button.set( 'label', NEXT );
                        transferWizard.set( 'title', CHOOSE_PARTER );
                    } else {
                        transferWizard.getButton( 'BACK' ).button.enable();
                        transferWizard.getButton( 'OK' ).button.set( 'label', CONFIRM );
                        transferWizard.set( 'title', 'Hinweis' );
                    }

                } );

                ko.applyBindings( processVM, node.getDOMNode() );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).patientTransfer = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dcpartnertable',
            'dccallermodal'
        ]
    }
);
