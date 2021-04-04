/**
 * User: pi
 * Date: 12.11.15   14:15
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global fun: true, ko, _ */
/*exported fun */
//TRANSLATION INCOMPLETE!! MOJ-3201
fun = function _fn( Y, NAME ) {

    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
        KoViewModel = Y.doccirrus.KoViewModel;

    function AccountModel( config ) {
        AccountModel.superclass.constructor.call( this, config );
    }

    Y.extend( AccountModel, KoViewModel.constructors.ContactModel, {
        initializer: function AccountModel_initializer( config ) {
            var
                self = this;
            self.mainNode = config.node;
            self.initAccountModel();
        },
        initAccountModel: function() {
            var
                self = this;
            self.talkOptions = ko.observableArray( [ { value: 'MS', label: 'Frau' }, { value: 'MR', label: 'Herr' } ] );
            self.emailObj = ko.observable();
            self.phoneObj = ko.observable();
            self.saveAccount = function() {
                var
                    emailObj = ko.utils.peekObservable( self.emailObj );

                if( emailObj.isModified() ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        title: i18n( 'utils_clientJS.confirmDialog.title.CONFIRMATION' ),
                        message: i18n( 'patientRegistration.emailChangeMessage' ),
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_SMALL,
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            var
                                                modal = this;
                                            modal.close();
                                            self.save( true );

                                        }
                                    } )
                                ]
                            }
                        }
                    } );
                } else {
                    self.save();
                }

            };
            self.addDummyPhoneObject();
            self.initSubscribers();
            self.loadData();

        },
        initSubscribers: function() {
            var
                self = this;
            self.addDisposable( self.communications.subscribe( function( communications ) {
                communications.forEach( function( communication ) {
                    switch( ko.utils.peekObservable( communication.type ) ) {
                        case 'EMAILPRIV':
                        case 'EMAILJOB':
                            self.emailObj( communication );
                            break;
                        case 'PHONEPRIV':
                        case 'PHONEJOB':
                            self.phoneObj( communication );
                            break;
                    }
                } );
            } ) );
        },
        checkPhone: function(){
            var
                self = this,
                communications = ko.utils.peekObservable( self.communications ),
                hasPhone;
            hasPhone = communications.some( function( communication ) {
                    var
                        type = ko.utils.peekObservable( communication.type );
                return 'PHONEPRIV' === type || 'PHONEJOB' === type;
            } );
            if( !hasPhone ) {
                self.addDummyPhoneObject();
            }

        },
        addDummyPhoneObject: function() {
            var
                self = this,
                communicationModel = new KoViewModel.createViewModel( {
                    NAME: 'ContactCommunicationModel', config: {
                        validatable: true,
                        data: {
                            type: 'PHONEJOB'
                        },
                        parent: self
                    }
                } );

            if( communicationModel.value && communicationModel.value.validationFunction ) {
                communicationModel.value.validationFunction = [
                    {
                        msg: 'Bitte wählen Sie eine Kontaktart aus und geben einen passenden Wert dazu ein.',
                        validator: function( val ) {
                            if( val ) {
                                return null !== Y.doccirrus.regexp.phoneNumber.exec( val );
                            }
                            return true;
                        }
                    } ];
                communicationModel.type.validationFunction = [];
            }
            self.communications.push( communicationModel );

        },
        loadData: function() {
            var
                self = this;
            self.setModelIsNotReady();
            Y.doccirrus.jsonrpc.api.patientportal.getPatientProfile()
                .done( function( response ) {
                    var
                        data = response.data && response.data[ 0 ];
                    /**
                     * if there is no phone, add empty one
                     */
                        //if( !data.phone ) {
                        //    data.communications.push( { type: 'PHONEJOB' } );
                        //}
                    self.checkEmail( data );
                    self.set( 'data', data );
                    self.checkPhone();
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } )
                .always( function() {
                    self.setModelIsReady();
                } );

        },
        checkEmail: function( data ) {
            var
                hasEmail;
            data.communications = data.communications || [];
            data.communications = data.communications.filter( function( communication ) {
                if( 'EMAILPRIV' === communication.type || 'EMAILJOB' === communication.type ) {
                    if( !hasEmail ) {
                        hasEmail = true;
                        return true;
                    }
                    return false;
                } else {
                    return true;
                }
            } );
            if( !hasEmail ) {
                data.communications.push( { type: 'EMAILJOB' } );
            }
        },
        checkPassword: function( hash ) {
            return new Promise( function( resolve, reject ) {
                Y.doccirrus.jsonrpc.api.patientportal.checkPassword( {hash: hash} )
                    .done( function( response ) {
                        if( response && response.data && response.data.match === true ) {
                            resolve( true );
                        }
                        resolve( false );
                    } )
                    .fail( function( error ) {
                        _.invoke( error, 'display' );
                        reject( false );
                    } );
            } );
        },
        requestAccountDeletion: function() {
            var self = this;
            Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'PatPortalMojit/views/intime_account_tab_confirm_dialog'} )
            ).then( function( response ) {
                return response && response.data;
            } ).then( function( template ) {
                    var
                        bodyContent = Y.Node.create( template ),
                        confirmModal,
                        shouldShowTheWarningText = ko.observable(),
                        pwFromModal = ko.observable();

                    confirmModal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-ConfirmModal',
                        bodyContent: bodyContent,
                        title: i18n( 'patientRegistration.requestAccountDeletion.TITLE' ),
                        width: Y.doccirrus.DCWindow.SIZE_SMALL,
                        centered: true,
                        modal: true,
                        render: document.body,
                        visible: true,
                        after: {
                            destroy: function() {
                                ko.cleanNode( bodyContent.getDOMNode() );
                            }
                        },
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        var params,
                                            emailObj = peek( self.emailObj ),
                                            pw = bodyContent.one( 'input' ).get( 'value' ),
                                            hash = Y.doccirrus.authpub.getPasswordHash( pw );

                                        params = {
                                            email: emailObj && peek( emailObj.value ),
                                            firstname: peek( self.firstname ),
                                            lastname: peek( self.lastname )
                                        };

                                        if( pw && pw !== '' && !hash ) {
                                            shouldShowTheWarningText( true );
                                            return;
                                        }

                                        self.checkPassword( hash )
                                            .then( function( pwCorrect ) {
                                                if( pwCorrect ) {
                                                    confirmModal.close();
                                                    shouldShowTheWarningText( false );

                                                    Promise.resolve( Y.doccirrus.jsonrpc.api.patientportal.sendAccountDeletionRequestToSupport( params ) )
                                                        .then( function() {
                                                            Y.doccirrus.DCWindow.notice( {
                                                                type: 'success',
                                                                message: i18n( 'patientRegistration.requestAccountDeletion.REQUEST_IS_SENT' )
                                                            } );
                                                        })
                                                        .catch( function( err ) {
                                                            Y.doccirrus.DCWindow.notice( {
                                                                type: 'error',
                                                                message: Y.doccirrus.errorTable.getMessage( err )
                                                            } );
                                                        } );

                                                } else {
                                                    shouldShowTheWarningText( true );
                                                    return;
                                                }
                                            } ).catch( function( err ) {
                                            self.showError( err );
                                        } );
                                    }

                                } )
                            ]
                        }
                    } );

                    self.addDisposable( ko.computed( function() {
                        var
                            okBtn = confirmModal.getButton( 'OK' ).button;
                        if( ko.unwrap( pwFromModal ) && ko.unwrap( pwFromModal ) !== '' ) {
                            okBtn.enable();
                        } else {
                            okBtn.disable();
                        }
                    } ) );
                    ko.applyBindings( {
                        shouldShowTheWarningText: shouldShowTheWarningText,
                        pwFromModal: pwFromModal,
                        confirmMessageI18n: i18n( 'patientRegistration.requestAccountDeletion.TEXT' ),
                        enterPasswordI18n: i18n( 'patientRegistration.requestAccountDeletion.ENTER_PASSWORD' ),
                        wrongPasswordI18n: i18n( 'patientRegistration.requestAccountDeletion.WRONG_PASSWORD' )
                    }, bodyContent.getDOMNode() );
                }
            ).catch( function( err ) {
                Y.log( 'could not get AccountDeletion template: ' + JSON.stringify( err ), 'error', 'PatPortalViewModel' );
            } );
        },

        showError: function( error ) {
            Y.log( 'Can not proccess action. error ' + JSON.stringify( error ), 'error', NAME );
            Y.doccirrus.DCWindow.notice( {
                type: 'info',
                message: 'Can not proccess action. error ' + JSON.stringify( error ),
                window: {
                    width: Y.doccirrus.DCWindow.SIZE_SMALL
                }
            } );
    },

    setModelIsNotReady: function(){
            var
                self = this;
            Y.doccirrus.utils.showLoadingMask( self.mainNode );
        },
        setModelIsReady: function( keepDirty ) {
            var
                self = this;
            if( !keepDirty ) {
                self.setNotModified();
            }
            Y.doccirrus.utils.hideLoadingMask( self.mainNode );
        },
        toJSON: function() {
            var
                result = AccountModel.superclass.toJSON.apply( this, arguments );
            result.communications.forEach( function( communication ) {
                switch( communication.type ) {
                    case 'EMAILPRIV':
                    case 'EMAILJOB':
                        result.email = communication.value;
                        break;
                    case 'PHONEPRIV':
                    case 'PHONEJOB':
                        result.phone = communication.value;
                        break;
                }
            } );

            return result;
        },
        save: function( emailChanged ) {
            var
                self = this,
                data = self.toJSON();

            self.setModelIsNotReady();
            delete data.communications;
            data.emailChanged = emailChanged;

            Y.doccirrus.jsonrpc.api.patientportal.setPatientProfile( {
                data: data
            } )
                .done( function() {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'success',
                        message: 'Ihre Daten wurden gesichert.'
                    } );
                    self.setModelIsReady();
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    self.setModelIsReady( true );
                } );
        }
    }, {
        schemaName: 'contact',
        NAME: 'AccountContact'
    } );

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node   NB: The node MUST have an   id   attribute.
         */
        registerNode: function( node/*, key, options*/ ) {
            var
                accountModel = new AccountModel( {node: node} );

            ko.applyBindings( accountModel, document.querySelector( '#intimeAccount' ) );
        },
        deregisterNode: function () {

        }
    };
};
