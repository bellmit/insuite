/*jslint anon:true, nomen:true*/
/*global YUI, ko, Promise */

'use strict';

/**
 * This modal view uses the functionality of the MessageViewModel to define sender and receiver for signed eArztbrief and
 * send it via kimaccount-api.
 */
YUI.add( 'DCKimMessageOutboxModal', function( Y ) {

    var
        i18n = Y.doccirrus.i18n,
        unwrap =  ko.unwrap,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel,
        InCaseMojitViewModel = KoViewModel.getConstructor( 'InCaseMojitViewModel' );

    function KimMessageOutboxModel(selectedActivities) {
        this.activityIds = selectedActivities;
        KimMessageOutboxModel.superclass.constructor.call( this, arguments );
    }

    KimMessageOutboxModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( KimMessageOutboxModel, InCaseMojitViewModel, {

        initializer: function KimMessageOutboxModel_initializer() {
            var
                self = this;

            self.patienttransfers = ko.observableArray();
            self.currentPatientTransferId = ko.observable();

            self.isSendingValid = ko.computed(function() {
                var
                    iter,
                    transfers = unwrap(self.patienttransfers),
                    isValid = true,
                    hasErrorReceiver = false,
                    hasErrorSender = false;

                if( transfers.length > 0 ) {
                    for( iter = 0; iter < transfers.length; iter++ ) {
                        if( transfers[iter]._isValid() === false ) {
                            isValid = false;
                        }
                        if( transfers[iter].kimRecipient.hasError() === true ) {
                            hasErrorReceiver = true;
                        }
                        if( transfers[iter].kimSender.hasError() === true ) {
                            hasErrorSender = true;
                        }
                    }
                }

                return Boolean(isValid && !hasErrorReceiver && !hasErrorSender);
            });

            self.initFlatFeeCheck();
            self.initPatientTransfersFromActivities();
            self.initOverviewTable();
        },

        /**
         * Opens the modal for quarterly flat fee check.
         * @returns {*}
         */
        initFlatFeeCheck: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                incaseConfig = binder.getInitialData( 'incaseconfiguration' );

            return new Promise( function( resolve, reject ) {
                if( !incaseConfig.kimTreatmentAutoCreationOnEDocLetterSent ) {
                    Y.doccirrus.modals.KimTreatmentAutoCreationConfirmationModal.show( incaseConfig )
                        .then( function( updatedInCaseConfig ) {
                            Y.log( '#initFlatFeeCheck() flat fees update from modal view. ', 'info', 'KimMessageOutboxModel-modal.client.js' );

                            if( updatedInCaseConfig ) {
                                binder.setInitialData( 'incaseconfiguration', updatedInCaseConfig );
                                resolve();
                            } else {
                                reject();
                            }
                        } )
                        .catch( function( error ) {
                            Y.log( '#initFlatFeeCheck() Error during KimTreatmentAutoCreationConfirmationModal confirmation: ' + JSON.stringify( error ), 'warn', 'KimMessageOutboxModel-modal.client.js' );
                            reject( error );
                        } );
                } else {
                    resolve();
                }
            } );
        },

        /**
         * As input parameter the model gets and array of activities (docletters) and parse it into patienttransfer-schema.
         * Therefore each of the activities become an instance of MessageViewModel which uses the patienttransfer-schema.
         */
        initPatientTransfersFromActivities: function() {
            var
                self = this,
                MessageViewModel = KoViewModel.getConstructor( 'MessageViewModel' ),
                patientTransfer,
                currentId;

            Promise.resolve(Y.doccirrus.jsonrpc.api.activity.read({
                query: {
                    _id: {
                        $in: self.activityIds
                    },
                    actType: 'DOCLETTER'
                }
            } )).then(function( result ) {
                self.patienttransfers( result.data.map( function( item ) {
                    return new MessageViewModel( {
                        data: {
                            timestamp: item.timestamp,
                            employee: item.employeeName,
                            subject: item.content,
                            textContent: i18n( 'PatientTransferMojit.KimEmailService.defaultKIMeArztbriefContent' ),
                            attachments: item.attachments,
                            attachedMedia: item.attachedMedia,
                            doctorName: item.employeeName,
                            activityIds: Array.isArray(item._id) ? item._id : [item._id],
                            patientId: item.patientId
                        }
                    } );
                } ) );

                patientTransfer = unwrap(self.patienttransfers)[0];
                if( patientTransfer ) {
                    currentId = unwrap (patientTransfer.activityIds)[0];
                    self.currentPatientTransferId(currentId);
                }
            }).catch(function(err){
                Y.log( '#initPatientTransfersFromActivities() Error querying for activities in database: ' + err.stack || err, 'error', 'KimMessageOutboxModel-modal.client.js' );
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: 'Activities konnten nicht geladen werden.',
                    window: {
                        width: Y.doccirrus.DCWindow.SIZE_MEDIUM
                    }
                } );
            });
        },
        /**
         * The table shows the user all signed docletters and make it selectable for defining sender and receiver.
         */
        initOverviewTable: function() {
            var
                self = this;

            self.overviewTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    fillRowsToLimit: false,
                    remote: false,
                    renderFooter: false,
                    data: self.patienttransfers,
                    baseParams: {},
                    selectMode: 'single',
                    columns: [
                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'activity-schema.Activity_T.time.i18n' ),
                            title: i18n( 'activity-schema.Activity_T.time.i18n' ),
                            isSortable: false,
                            isFilterable: false
                        },
                        {
                            forPropertyName: 'doctorName',
                            label: i18n( 'patienttransfer-schema.PatientTransfer_T.employee.i18n' ),
                            title: i18n( 'patienttransfer-schema.PatientTransfer_T.employee.i18n' ),
                            isSortable: false,
                            isFilterable: false
                        }
                    ],
                    onRowClick: function( meta ) {
                        if (self.overviewTable.isSelected(meta.row)) {
                            self.currentPatientTransferId('');
                        } else {
                            self.currentPatientTransferId( meta.row.activityIds()[0] );
                        }

                    },
                    responsive: false
                }
            } );
        }
    } );
    Y.namespace( 'doccirrus.modals' ).kimMessageOutboxModal = {
        /**
         * Init function to show the modal. It gets the markup and instanziates the view model. It get the selected
         * activities and hand it over to the KimMessageOutboxModel constructor.
         * @param {Array} selectedActivities: Activities (Docletters) for sending.
         */
        show: function(selectedActivities) {
            var
                modalViewPath = 'InCaseMojit/views/kimMessageOutbox_modal',
                successfulEmailSend = i18n( 'PatientTransferMojit.KimEmailService.successfulEmailSend' ),
                successfulEmailSendMultiple = i18n( 'PatientTransferMojit.KimEmailService.successfulEmailSendMultiple' );

            Y.doccirrus.jsonrpc.api.jade
                .renderFile( {
                    path: modalViewPath
                } ).then( function( response ) {
                    var
                        markup = response.data,
                        node = Y.Node.create( markup ),
                        model = new KimMessageOutboxModel(selectedActivities),
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-KimMessageOutboxModel',
                            bodyContent: node,
                            title: i18n('PatientTransferMojit.title.kimModalTitle'),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: 1200,
                            height: 700,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        action: function() {
                                            this.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            var
                                                transfers = unwrap( model.patienttransfers ),
                                                emailTransfersPromises = transfers.map( function( item ) {
                                                    return item.handleSendTransfer();
                                                } );

                                            Promise.all( emailTransfersPromises ).then( function( result ) {

                                                result = result.map( function( item ) {
                                                    return item.data;
                                                } );

                                                if( result.length === 1 ) {
                                                    Y.doccirrus.DCWindow.notice( {
                                                        type: 'success',
                                                        message: successfulEmailSend
                                                    } );
                                                } else {
                                                    Y.doccirrus.DCWindow.notice( {
                                                        type: 'success',
                                                        message: successfulEmailSendMultiple
                                                    } );
                                                }

                                            } );

                                            this.close();
                                        }
                                    } )
                                ]
                            }
                        } );
                        model.addDisposable( ko.computed( function() {
                            var
                                isReadyForSending = unwrap(model.isSendingValid),
                                sendButton = modal.getButton( 'OK' ).button;
                            if( isReadyForSending ) {
                                sendButton.enable();
                            } else {
                                sendButton.disable();
                            }
                        } ) );
                    ko.applyBindings( model, node.getDOMNode() );
                } );
        }
    };

}, '0.0.1', {
    requires: [
        'DCWindow',
        'dcvalidations',
        'KoViewModel',
        'MessageViewModel'
    ]
} );