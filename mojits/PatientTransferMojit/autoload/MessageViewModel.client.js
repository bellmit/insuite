'use strict';

/*global YUI, ko, _, moment */

YUI.add( 'MessageViewModel', function( Y, NAME ) {

    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        unwrap = ko.unwrap;

    function MessageViewModel( config ) {
        MessageViewModel.superclass.constructor.call( this, config );
    }

    MessageViewModel.ATTRS = {
        validatable: {
            value: true,
            lazyAdd: false
        }
    };

    Y.extend( MessageViewModel, Y.doccirrus.KoViewModel.getBase(), {

            select2Sender: null,
            attachments: null,

            initializer: function MessageViewModel_initializer() {
                var
                    self = this;
                self.kimRecipientlabel = i18n( 'patienttransfer-schema.PatientTransfer_T.kimRecipientlabel.i18n' );
                self.kimSenderLabel = i18n( 'patienttransfer-schema.PatientTransfer_T.kimSenderLabel.i18n' );
                self.kimSubjectLabel = i18n( 'patienttransfer-schema.PatientTransfer_T.kimSubjectLabel.i18n' );
                self.kimMailContentLabel = i18n( 'patienttransfer-schema.PatientTransfer_T.kimMailContentLabel.i18n' );
                self.kimAttachtmentLabel = i18n( 'patienttransfer-schema.PatientTransfer_T.kimAttachtmentLabel.i18n' );
                self.senderPartner = i18n( 'PatientTransferMojit.KimEmailService.partnerSender' );
                self.successfulEmailSend = i18n( 'PatientTransferMojit.KimEmailService.successfulEmailSend' );
                self.noValidKimAccountsValidationMessage = i18n( 'PatientTransferMojit.KimEmailService.noValidKimAccountsValidationMessage' );

                self.attachments = ko.observableArray();
                self.hasKim =  Y.doccirrus.auth.hasTelematikServices('KIM');

                self.kimSender.hasError = ko.observable( false );
                self.partners.hasError = ko.observable( false );
                self.kimRecipient.hasError = ko.observable( false );

                self.kimSender.validationMessages = ko.observableArray();

                self.addDisposable( ko.computed( function() {
                    var
                        kimRecipient = unwrap( self.kimRecipient ),
                        kimSender = unwrap( self.kimSender );
                    self.kimSender.hasError( kimRecipient.length > 0 && !kimSender );
                } ) );

                self.addDisposable( ko.computed( function() {
                    var
                        partners = unwrap( self.partners ),
                        kimReceipient = unwrap( self.kimRecipient );
                    self.kimRecipient.hasError( !partners.length && !kimReceipient.length );
                } ) );

                self.addDisposable( ko.computed( function() {
                    var
                        partners = unwrap( self.partners ),
                        kimReceipient = unwrap( self.kimRecipient );
                    self.partners.hasError( !partners.length && !kimReceipient.length );
                } ) );

                self.initObservables();
                self.initSelect2Sender();
                self.initSelect2PartnerReceiver();
                self.initSelect2KimReceiver();
                self.fetchAttachments();
            },

            fetchAttachments: function() {
                var
                    self = this;

                return Y.doccirrus.jsonrpc.api.media
                    .read( {
                        query: {
                            '_id': {
                                $in: self.attachedMedia().map( function( aMedia ) {
                                    return unwrap( aMedia.mediaId );
                                } )
                            }
                        }
                    } )
                    .then( function( mediaResult ) {
                        var medias = mediaResult.data,
                            dataUpdated = self.attachedMedia().map( function( awm ) {
                                const mediaObj = medias.find( function( media ) {
                                    return media._id === unwrap( awm.mediaId );
                                } );
                                if( mediaObj ) {
                                    return _.extend( awm, {
                                        thumbUrl: Y.doccirrus.media.getMediaThumbUrl( mediaObj, 68, false ),
                                        fullUrl: Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getMediaUrl( mediaObj, 'original' ) )
                                    } );
                                }
                                return {};
                            } );
                        self.attachments( dataUpdated );
                        return dataUpdated;
                    } );
            },

            updateReadOnly: function() {
                this.getModuleViewModelReadOnly()._makeReadOnly( {
                    paths: ['*']
                } );
            },

            getDate: function() {
                return moment( this.timestamp() ).format( i18n( 'general.TIMESTAMP_FORMAT_LONG' ) );
            },

            getSender: function() {
                return this.doctorName() + ((this.practiceName()) ? ' ( ' + this.practiceName() + ' )' : '');
            },

            removeAttachment: function( e ) {
                this.attachments.remove( e );
            },

            handleSelectReceiverPartner: function MessageViewModel_handleSelectReceiver() {
                var self = this,
                    idList = unwrap( self.partners );

                Y.doccirrus.modals.selectReceiverModal.show( idList, function( response ) {
                    self.partners( response );
                } );
            },
            /**
             * Shows a modal view in transferlog under "Neue Nachricht schreiben" for adding KIM receiver. Selected
             * KIM accounts will be added to the schemafield for later usage. It checks which account is already
             * selected and flags this accounts for the modal view.
             */
            handleSelectReceiverKim: function MessageViewModel_handleSelectReceiverKim() {

                var
                    self = this,
                    addedRecipients = unwrap( self.kimRecipient ),
                    kimAccountsVZD = [],
                    selectedAccounts = [],
                    accountIter,
                    addedIter,
                    resultIter;

                Promise.resolve( Y.doccirrus.jsonrpc.api.tiDirectoryService.read()
                    .then( function( response ) {
                        kimAccountsVZD = response.data;
                    } ).then( function() {
                        for( accountIter = 0; accountIter < kimAccountsVZD.length; accountIter++ ) {
                            for( addedIter = 0; addedIter < addedRecipients.length; addedIter++ ) {
                                if( kimAccountsVZD[accountIter]._id === addedRecipients[addedIter].id() ) {
                                    selectedAccounts.push( kimAccountsVZD[accountIter] );
                                }
                            }
                        }
                    } ).then( function() {
                        Y.doccirrus.modals.selectReceiverKimModal.show( selectedAccounts, function( response ) {
                            var kimReceiver = response.map( function( receiver ) {
                                return {
                                    id: receiver._id,
                                    displayName: receiver.displayName,
                                    mail: receiver.mail,
                                    accountType: 'KIM'
                                };
                            } );
                            for( resultIter = 0; resultIter < kimReceiver.length; resultIter++ ) {
                                self.kimRecipient.push( kimReceiver[resultIter] );
                            }
                        } );
                    } ) );
            },
            /**
             * This method handles the sender button click event for "Neue Nachricht schreiben" tab. It collects all
             * necessary information for partner and KIM email send. Makes user feedback dialog for success or error.
             * @returns {Function}: callback function to show dialog.
             */
            handleSendTransfer: function MessageViewModel_handleSendTransfer() {
                var
                    self = this,
                    data = self.toJSON(),
                    isSuccessShown = false,
                    receiverKIM = unwrap( self.kimRecipient ),
                    senderKIM = unwrap( self.kimSender ),
                    senderPartnerTransfer = unwrap( self.partners );

                data.attachedMedia = unwrap( self.attachments );
                receiverKIM = receiverKIM.map( function( item ) {
                    return {
                        id: item.id(),
                        displayName: item.displayName(),
                        mail: item.mail(),
                        accountType: item.accountType()
                    };
                } );

                var promiseArray = [];

                if( receiverKIM.length !== 0 && senderKIM ) {
                    promiseArray.push( Promise.resolve( Y.doccirrus.jsonrpc.api.kimaccount.sendEmail( {
                        receiver: receiverKIM,
                        sender: senderKIM,
                        patientId: data.patientId,
                        activityIds: data.activityIds,
                        body: data.textContent,
                        subject: data.subject,
                        attachments: data.attachedMedia
                    } ) ).then( function() {
                        if( !isSuccessShown ) {
                            isSuccessShown = true;
                            if( data.activityIds.length === 0 ) {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'success',
                                    message: self.successfulEmailSend,
                                    callback: function() {
                                        window.location.hash = '/sent';
                                    }
                                } );
                            }
                        }
                    } ).catch( function( err ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    } ) );
                }
                if( senderPartnerTransfer.length !== 0 ) {
                    promiseArray.push( Promise.resolve( Y.doccirrus.jsonrpc.api.transfer.doTransfer( {
                        data: data
                    } ) ).then( function() {
                        if( !isSuccessShown ) {
                            isSuccessShown = true;
                            Y.doccirrus.DCWindow.notice( {
                                type: 'success',
                                message: self.successfulEmailSend,
                                callback: function() {
                                    window.location.hash = '/sent';
                                }
                            } );
                        }
                    } ).catch( function( error ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } ) );
                }
                return Promise.all(promiseArray);
            },
            initObservables: function MessageViewModel_initObservables() {
                var
                    self = this,
                    buttons = [];

                if( (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ) {
                    buttons.push( KoUI.KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'webcam',
                            text: i18n( 'general.button.WEBCAM' ),
                            click: function() {
                                var
                                    settings = {
                                        'label': 'user',
                                        'onAdd': function( mediaId ) {
                                            self.onWebcamMediaAdded( mediaId );
                                        }
                                    };
                                Y.doccirrus.modals.cameraInput.show( settings );
                            }
                        }
                    } ) );
                }

                if( Y.doccirrus.auth.hasAdditionalService( 'inScan' ) ) {
                    buttons.push( KoUI.KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'scan',
                            text: i18n( 'general.button.SCAN' ),
                            click: function() {
                                var
                                    options = {
                                        saveTo: 'db'
                                    },
                                    dialog = Y.doccirrus.utils.dynamsoft.showScanDialog( options );

                                dialog.on( 'mediaadded64', function( facade, mediaObj ) {
                                    //  MOJ-8901 scanned media is first argument, depending on context
                                    if( facade && !mediaObj ) {
                                        mediaObj = facade;
                                    }
                                    self.addMediaObjToAttachments( mediaObj );
                                } );
                            }
                        }
                    } ) );
                }

                this.fileUploader = KoComponentManager.createComponent( {
                    componentType: 'KoFileUploader',
                    componentConfig: {
                        fileTypes: Y.doccirrus.media.types.getAllExt(),
                        acceptFiles: '',
                        callbacks: {
                            onComplete: function( meta ) {
                                var
                                    response = meta.response;
                                self.addMediaObjToAttachments( response.mediaObj );
                            },
                            onError: function( meta ) {
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'error',
                                    message: meta.reason,
                                    window: {
                                        width: Y.doccirrus.DCWindow.SIZE_LARGE
                                    }
                                } );
                            }
                        },
                        buttons: buttons
                    }
                } );
            },
            onWebcamMediaAdded: function( mediaId ) {
                var self = this;

                Y.log( 'Media uploaded from scanner, new _id is: ' + JSON.stringify( mediaId ), 'info', NAME );

                function onMetadataLoaded( response ) {
                    var
                        mediaObj = response.data && response.data[0];
                    self.addMediaObjToAttachments( mediaObj );
                }

                Y.doccirrus.jsonrpc.api.media
                    .read( {query: {'_id': mediaId}} )
                    .done( onMetadataLoaded )
                    .fail( function( error ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );

            },
            addMediaObjToAttachments: function( mediaObj ) {
                this.attachments.push( this.getAttachmentFromMediaObj( mediaObj ) );
            },
            getAttachmentFromMediaObj: function( mediaObj ) {
                return {
                    mediaId: mediaObj._id,
                    caption: mediaObj.name,
                    contentType: mediaObj.mimeType,
                    thumbUrl: Y.doccirrus.media.getMediaThumbUrl( mediaObj, 68, false ),
                    fullUrl: Y.doccirrus.infras.getPrivateURL( Y.doccirrus.media.getMediaUrl( mediaObj, 'original' ) )
                };
            },
            /**
             * Select2 for partner receiver field. Searches in the partner collection for CONFIRMED / LICENSED entries
             * and make it selectable. Multi select is enabled.
             */
            initSelect2PartnerReceiver: function() {
                var
                    self = this,
                    partners;

                self.select2PartnerReceiver = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            partners = unwrap( self.partners );

                            return partners.map( function( item ) {
                                return {
                                    id: item.initialConfig.data._id,
                                    text: item.initialConfig.data.name
                                };
                            } );
                        },
                        write: function( $event ) {
                            if( $event.added ) {
                                self.partners.push( $event.added.data );
                            }
                            if( $event.removed ) {
                                self.partners.remove( function( item ) {
                                    return unwrap( item._id ) === $event.removed.id;
                                } );
                            }
                        }
                    } ) ),
                    placeholder: ko.observable( ' ' ),
                    select2: {
                        multiple: true,
                        query: function( query ) {
                            Y.doccirrus.jsonrpc.api.partner.read( {
                                query: {
                                    name: {
                                        $regex: query.term,
                                        $options: 'i'
                                    },
                                    status: {$eq: 'CONFIRMED'}
                                }
                            } ).done( function( response ) {
                                var data = response && response.data || [];

                                query.callback( {
                                    results: data.map( function( item ) {
                                        return {
                                            id: unwrap( item._id ),
                                            text: unwrap( item.name ),
                                            data: item
                                        };
                                    } )
                                } );
                            } );
                        }
                    }
                };
            },
            /**
             * Select2 for KIM receiver field. Searches in the partner collection for KIM user in tiDirectoryService
             * collection. A searchtermn is given which filters the entries by displayName.
             */
            initSelect2KimReceiver: function() {
                var
                    self = this,
                    receiver;

                self.select2KimReceiver = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            receiver = unwrap( self.kimRecipient );
                            return receiver.map( function( item ) {
                                if( item.initialConfig ) {
                                    return {
                                        id: item.initialConfig.data.id,
                                        text: item.initialConfig.data.displayName
                                    };
                                } else {
                                    return {
                                        id: item.id(),
                                        text: item.displayName()
                                    };
                                }
                            } );
                        },
                        write: function( $event ) {
                            var
                                accounts,
                                addedAccount;

                            if( $event.added ) {
                                accounts = unwrap( self.receiverKimAccounts );
                                addedAccount = accounts.find( function( item ) {
                                    return item.id() === $event.added.id;
                                } );
                                self.kimRecipient.push( addedAccount );
                            }
                            if( $event.removed ) {
                                self.kimRecipient.remove( function( item ) {
                                    return item.id() === $event.removed.id;
                                } );
                            }
                        }
                    } ) ),
                    placeholder: ko.observable( ' ' ),
                    select2: {
                        multiple: true,
                        query: function( query ) {
                            Promise.resolve( Y.doccirrus.jsonrpc.api.tiDirectoryService.read( {
                                query: {
                                    displayName:
                                        {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                }
                            } ).then( function( res ) {
                                self.receiverKimAccounts( res.data.map( function( item ) {
                                    return {
                                        id: item._id,
                                        displayName: item.displayName,
                                        mail: item.mail,
                                        accountType: 'KIM'
                                    };
                                } ) );
                                var kimAccounts = res.data.map( function( account ) {
                                    return {
                                        id: account._id,
                                        text: account.displayName
                                    };
                                } );
                                query.callback( {
                                    results: kimAccounts
                                } );
                            } ) );
                        }
                    }
                };
            },
            /**
             * Select2 for KIM sender field. Get valid configured KIM account from kimaccount-api. Multi select is
             * disabled, because here we only want to have one sender account for email send.
             */
            initSelect2Sender: function() {
                var
                    self = this;

                self.select2Sender = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var senderAccount = unwrap( self.kimSender );
                            if( senderAccount ) {
                                return {
                                    id: senderAccount.id(),
                                    text: senderAccount.username()
                                };
                            }
                        },
                        write: function( $event ) {
                            var
                                senderAccount,
                                kimAccounts;
                            if( $event.added ) {
                                kimAccounts = unwrap( self.senderKimAccounts );
                                senderAccount = kimAccounts.find( function( item ) {
                                    return item.id() === $event.added.id;
                                } );
                                self.kimSender( senderAccount );
                            }
                        }
                    } ) ),
                    placeholder: ko.observable( ' ' ),
                    select2: {
                        multiple: false,
                        query: function( query ) {
                            Promise.resolve( Y.doccirrus.jsonrpc.api.kimaccount.getValidKimAccounts( {
                                onlyAuthorisedUsers: true
                            } ).then( function( res ) {
                                if (res.data.length === 0) {
                                    self.kimSender.validationMessages([self.noValidKimAccountsValidationMessage]);
                                }
                                self.senderKimAccounts( res.data );
                                query.callback( {
                                    results: res.data.map( function( account ) {
                                        return {
                                            id: account.id,
                                            text: account.username
                                        };
                                    } )
                                } );
                            } ) );
                        }
                    }
                };
            }
        },
        {
            schemaName: 'patienttransfer', // required, but could be overwritten or provided at instantiation level
            NAME: 'MessageViewModel' // required, this is the name we are registering for
        }
    );

    Y.doccirrus.KoViewModel.registerConstructor( MessageViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'KoUI',
        'KoComponent',
        'dcutils-dynamsoft',
        'patienttransfer-schema',
        'DCKimReceiverVZDContactsModal',
        'dcselectreceivermodal'
    ]
} );