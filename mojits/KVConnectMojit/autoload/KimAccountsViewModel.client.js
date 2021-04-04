/**
 * User: florian
 * Date: 17.12.20  17:35
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI ko*/
'use strict';

YUI.add( 'KimAccountsViewModel', function( Y, NAME ) {

        /**
         * This ViewModel is under Verwaltung/InSuite/Dienste and manages the KIM Accounts for in the KIM network. For Useraccount
         * is defined with username, password, authorised user who have the permission to use this account and the tiContext with
         * additional information of the system settings.
         * @module KimAccountsViewModel
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            KoViewModel = Y.doccirrus.KoViewModel,
            KimAccountModel = Y.doccirrus.KoViewModel.getConstructor( 'KimAccountModel' );

        function KimAccountsViewModel( config ) {
            KimAccountsViewModel.superclass.constructor.call( this, config );
        }

        KimAccountsViewModel.ATTRS = {
            validatable: {
                value: false,
                lazyAdd: false
            }
        };

        Y.extend( KimAccountsViewModel, KoViewModel.getBase(), {
                initializer: function KimAccountsViewModel_initializer() {
                    var
                        self = this;

                    self.userManagementHeadline = i18n( 'kimaccount-schema.KIMAccount_T.userManagementHeadline.i18n' );
                    self.login = i18n( 'kimaccount-schema.KIMAccount_T.login.i18n' );
                    self.kimUsername = i18n( 'kimaccount-schema.KIMAccount_T.kimUsername.i18n' );
                    self.kimPassword = i18n( 'kimaccount-schema.KIMAccount_T.kimPassword.i18n' );
                    self.serverAddressPOP = i18n( 'kimaccount-schema.KIMAccount_T.serverAddressPOP.i18n' );
                    self.serverAddressSMTP = i18n( 'kimaccount-schema.KIMAccount_T.serverAddressSMTP.i18n' );
                    self.authorisedUsers = i18n( 'kimaccount-schema.KIMAccount_T.authorisedUsers.i18n' );
                    self.deleteKIMAccount = i18n( 'kimaccount-schema.KIMAccount_T.deleteKIMAccount.i18n' );
                    self.deleteKimAccountMessage = i18n( 'kimaccount-schema.KIMAccount_T.deleteKimAccountMessage.i18n' );
                    self.mandant = i18n( 'kimaccount-schema.KIMAccount_T.mandant.i18n' );
                    self.clientSystem = i18n( 'kimaccount-schema.KIMAccount_T.clientSystem.i18n' );
                    self.workstation = i18n( 'kimaccount-schema.KIMAccount_T.workstation.i18n' );
                    self.kimAccountSaveModalTitle = i18n( 'kimaccount-schema.KIMAccount_T.kimAccountSaveModalTitle.i18n' );
                    self.kimAccountSaveModalMessage = i18n( 'kimaccount-schema.KIMAccount_T.kimAccountSaveModalMessage.i18n' );

                    self.tiContext = ko.observableArray();
                    self.initWorkStationsViewModel();

                },
                /**
                 * Calls the init function in the needed order.
                 */
                initWorkStationsViewModel: function() {
                    var
                        self = this;

                    self.initAccountsTable();
                    self.initSaveButton();
                },
                /**
                 * Initalizes and manage the Account table. Loads initial account data and show it as table rows. New account
                 * configuration can be added and existing accounts can be deleted. The account get check for validation and
                 * modification. The initial account information will be check if these are valid credentials against the api.
                 */
                initAccountsTable: function() {
                    var
                        self = this;

                    self.kimAccountsTable = KoComponentManager.createComponent( {
                        componentType: 'KoEditableTable',
                        componentConfig: {
                            stateId: 'KimAccountsTable',
                            ViewModel: KimAccountModel,
                            remote: true,
                            proxy: Y.doccirrus.jsonrpc.api.kimaccount.read,
                            columns: [
                                {
                                    label: self.login,
                                    text: self.login,
                                    width: '50px',
                                    forPropertyName: 'loginStatus',
                                    css: {
                                        'text-center': 1,
                                        'text-align': 'center'
                                    },
                                    renderer: function( meta ) {
                                        var
                                            value = unwrap( meta.value ),
                                            row = unwrap( meta.row ),
                                            statusMessage = row && row.statusMessage && peek( row.statusMessage ) || '',
                                            statusIcon,
                                            colorCss;

                                        if( value === 'success' ) {
                                            statusIcon = 'ok';
                                            colorCss = 'text-success';
                                        } else if( value === 'denied' ) {
                                            statusIcon = 'minus';
                                            colorCss = 'text-warning';
                                        } else {
                                            statusIcon = 'question';
                                            colorCss = 'text-info';
                                        }

                                        return '<span title="' + (statusMessage) + '" class="glyphicon glyphicon-' + statusIcon + '-sign ' + colorCss + '"/>';
                                    }
                                },
                                {
                                    label: self.kimUsername,
                                    text: self.kimUsername,
                                    width: '100px',
                                    forPropertyName: 'kimUsername',
                                    css: {
                                        'text-center': 1,
                                        'text-align': 'center'
                                    }
                                },
                                {
                                    label: self.kimPassword,
                                    text: self.kimPassword,
                                    width: '100px',
                                    forPropertyName: 'kimPassword',
                                    css: {
                                        'text-center': 1,
                                        'text-align': 'center'
                                    },
                                    type: 'password',
                                    renderer: function( meta ) {
                                        var value = unwrap( meta.value );
                                        if( value ) {
                                            return '***';
                                        }
                                    }
                                },
                                {
                                    label: self.serverAddressPOP,
                                    text: self.serverAddressPOP,
                                    width: '150px',
                                    forPropertyName: 'serverAddressPOP',
                                    css: {
                                        'text-center': 1,
                                        'text-align': 'center'
                                    }
                                },
                                {
                                    label: self.serverAddressSMTP,
                                    text: self.serverAddressSMTP,
                                    width: '150px',
                                    forPropertyName: 'serverAddressSMTP',
                                    css: {
                                        'text-center': 1,
                                        'text-align': 'center'
                                    }
                                },
                                {
                                    label: self.authorisedUsers,
                                    text: self.authorisedUsers,
                                    width: '150px',
                                    forPropertyName: 'authorisedUsers',
                                    css: {
                                        'text-center': 1,
                                        'text-align': 'center'
                                    },
                                    inputField: {
                                        componentType: 'KoFieldSelect2',
                                        componentConfig: {
                                            useSelect2Data: true,
                                            select2Read: function( value ) {
                                                return value.map( function( id ) {
                                                    return self.initialConfig.employees.find( function( employee ) {
                                                        return id === employee._id;
                                                    } );
                                                } ).filter( Boolean ).map( function( employee ) {
                                                    return self._getNameAndIdFromEmployee( employee );
                                                } );
                                            },
                                            select2Write: function( $event, observable ) {
                                                if( $event.added ) {
                                                    observable.push( $event.added.id );
                                                }
                                                if( $event.removed ) {
                                                    observable.remove( function( item ) {
                                                        return item === $event.removed.id;
                                                    } );
                                                }
                                            },
                                            select2Config: {
                                                multiple: true,
                                                initSelection: undefined,
                                                query: undefined,
                                                data: function() {
                                                    return {
                                                        results: self.initialConfig.employees.map( function( employee ) {
                                                            return self._getNameAndIdFromEmployee( employee );
                                                        } )
                                                    };
                                                }
                                            }
                                        }
                                    },
                                    renderer: function( meta ) {
                                        var
                                            employeeIdsAuthUsers = ko.unwrap( meta.value ),
                                            employeeNamesAuthUsers = [];

                                        employeeNamesAuthUsers = employeeIdsAuthUsers.map( function( id ) {
                                            return self.initialConfig.employees.find( function( employee ) {
                                                return id === employee._id;
                                            } );
                                        } ).filter( Boolean ).map( function( employee ) {
                                            return {name: Y.doccirrus.schemas.person.personDisplay( employee )};
                                        } );

                                        return Object.values( employeeNamesAuthUsers ).map( function( values ) {
                                            return values.name;
                                        } ).join( '; ' );
                                    }
                                },
                                {
                                    label: self.mandant + ' / ' + self.clientSystem + ' / ' + self.workstation,
                                    text: self.mandant + ' / ' + self.clientSystem + ' / ' + self.workstation,
                                    width: '150px',
                                    forPropertyName: 'tiContext',
                                    css: {
                                        'text-center': 1,
                                        'text-align': 'center'
                                    },
                                    inputField: {
                                        componentType: 'KoFieldSelect2',
                                        componentConfig: {
                                            useSelect2Data: true,
                                            select2Read: function( value ) {
                                                var
                                                    resContext = '';

                                                if( value ) {
                                                    resContext = self.tiContext().find( function( tiContext ) {
                                                        return value === tiContext.id;
                                                    } );
                                                    return self._getIdContextFromTiContext( resContext );
                                                }
                                            },
                                            select2Write: function( $event, observable ) {
                                                if( $event.added ) {
                                                    observable( $event.added.id );
                                                }
                                                if( $event.removed ) {
                                                    observable.remove( function( item ) {
                                                        return item === $event.removed.id;
                                                    } );
                                                }
                                            },
                                            select2Config: {
                                                multiple: false,
                                                initSelection: undefined,
                                                query: undefined,
                                                data: function() {
                                                    return {
                                                        results: self.tiContext().map( function( tiContext ) {
                                                            return self._getIdContextFromTiContext( tiContext );
                                                        } )
                                                    };
                                                }
                                            }
                                        }
                                    },
                                    renderer: function( meta ) {
                                        var
                                            tiContextId = ko.unwrap( meta.value ),
                                            resContext = '';

                                        if( tiContextId ) {
                                            resContext = self.tiContext().find( function( tiContext ) {
                                                return tiContextId === tiContext.id;
                                            } );
                                            return self._getIdContextFromTiContext( resContext ).text;
                                        }
                                    }
                                },
                                {
                                    forPropertyName: 'deleteButton',
                                    utilityColumn: true,
                                    width: '50px',
                                    css: {
                                        'text-center': 1
                                    },
                                    inputField: {
                                        componentType: 'KoButton',
                                        componentConfig: {
                                            name: self.deleteKIMAccount,
                                            title: self.deleteKIMAccount,
                                            icon: 'TRASH_O',
                                            click: function( button, $event, $context ) {
                                                self._confirmDeleteKimAccount( self.deleteKimAccount, self.deleteKimAccountMessage ).then( function( confirm ) {
                                                    if( confirm ) {
                                                        $context.$parent.row.removeAccountFromCollection().then( function() {
                                                            self.kimAccountsTable.removeRow( $context.$parent.row );
                                                        } ).catch( function( response ) {
                                                            Y.log( 'could not remove KIM account: ' + response, 'error', NAME );
                                                            self._handleError( response );
                                                        } );
                                                    }
                                                } );
                                            }
                                        }
                                    }
                                }
                            ],
                            onAddButtonClick: function() {
                                self.kimAccountsTable.addRow( {
                                    data: {}
                                } );
                                return false;
                            }
                        }
                    } );
                    self._loadTiContext();
                    self._loadKimAccountsConfiguration();
                },
                /**
                 * Initializes the save button for saving the account information into database. It checks if the account
                 * configuration is modified and valid and get only enabled, if both is true.
                 */
                initSaveButton: function() {
                    var
                        self = this;

                    self.saveButton = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            lazyAdd: true,
                            name: 'saveKIMAccounts',
                            option: 'PRIMARY',
                            text: i18n( 'general.button.SAVE' ),
                            disabled: ko.computed( function() {
                                var
                                    iskimAccountTableValid = true,
                                    isKimAccountTableModified = false,
                                    rows = unwrap( self.kimAccountsTable.rows );

                                rows.forEach( function( kimAccount ) {
                                    var
                                        isModified = unwrap( kimAccount.isModified() ),
                                        isValid = unwrap( kimAccount.isValid() );

                                    if( !isValid ) {
                                        iskimAccountTableValid = false;
                                    }
                                    if( isModified ) {
                                        isKimAccountTableModified = true;
                                    }
                                } );
                                return !(isKimAccountTableModified && iskimAccountTableValid);
                            } ),
                            click: function() {
                                var
                                    rows = unwrap( self.kimAccountsTable.rows ),
                                    kimAccountRowsData = [];

                                rows.forEach( function( kimAccount ) {
                                    kimAccountRowsData.push(kimAccount);

                                } );
                                Promise.resolve( Y.doccirrus.jsonrpc.api.kimaccount.updateKimAccountConfiguration( {
                                    kimAccountRowsData: kimAccountRowsData
                                } ) ).then( function() {
                                    Y.doccirrus.DCWindow.notice( {
                                        title: self.kimAccountSaveModalTitle,
                                        message: self.kimAccountSaveModalMessage,
                                        callback: function() {
                                            self._loadKimAccountsConfiguration();
                                        }
                                    } );

                                } ).catch( function( err ) {
                                    Y.log( 'Error querying by param in kimaccount-api: ' + err.stack || err, 'error', 'KimAccountsEditorModel.client.js' );
                                    Y.doccirrus.DCWindow.notice( {
                                        type: 'error',
                                        message: 'KIM Account konnten nicht gespeichert werden.'
                                    } );
                                } );
                            }
                        }
                    } );
                },
                /**
                 * Loads the configured Ti-Context-Configuration-Parameters. Used are the mandantId, clientSystemId and
                 * workplaceId. From the api-call the ids of this contexts are the same. Therefore we build an id
                 * from mandantId, clientSystemId and workplaceId by concatination.
                 * @private
                 */
                _loadTiContext: function() {
                    var
                        self = this;

                    Promise.resolve( Y.doccirrus.jsonrpc.api.ticontext.getConfigurationParameters() )
                        .then( function( res ) {
                            res.data.forEach( function( tiContext ) {
                                tiContext.id = tiContext.context.MandantId + '#' +
                                               tiContext.context.ClientSystemId + '#' +
                                               tiContext.context.WorkplaceId + '#';
                            } );
                            self.tiContext( res.data );

                        } )
                        .catch( function( err ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: Y.doccirrus.errorTable.getMessages( err )
                            } );
                        } );
                },
                /**
                 * Shows and error message as modal view in the frontend.
                 * @param err: Error to show in modal.
                 * @private
                 */
                _handleError: function( err ) {
                    var code = err.code || err.statusCode;
                    if( code ) {
                        Y.doccirrus.DCWindow.notice( {
                            message: Y.doccirrus.errorTable.getMessage( {code: code} )
                        } );
                    }
                    Y.log( 'error: ' + err.message, 'warn', NAME );
                },
                /**
                 * Confirms the deletion of a KIM account in a modal view for the user.
                 * @param title: title of the modal.
                 * @param message: Message of the modal.
                 * @returns {Promise}
                 * @private
                 */
                _confirmDeleteKimAccount: function( title, message ) {
                    return new Promise( function( resolve ) {
                        Y.doccirrus.DCWindow.confirm( {
                            title: title,
                            message: message,
                            callback: function( confirm ) {
                                resolve( confirm.success );
                            }
                        } );
                    } );
                },
                /**
                 * Loads existing KIM account configuration from the database collection on view startup.
                 * @private
                 */
                _loadKimAccountsConfiguration: function() {
                    var
                        self = this;

                    Promise.resolve( Y.doccirrus.jsonrpc.api.kimaccount.getKimAccountConfiguration( {
                        onlyAuthorisedUsers: false
                    } ) ).then( function( kimAccountConfiguration ) {
                        self.kimAccountsTable._convertedData([]);
                        kimAccountConfiguration.data.forEach( function( kimAccount ) {
                            self.kimAccountsTable.addRow( {data: kimAccount} );
                        } );
                    } ).catch( function( err ) {
                        Y.log( '#_loadKimAccountsConfiguration() Error querying for kimaccount configuration in database: ' + err.stack || err, 'error', 'KimAccountsEditorModel.client.js' );
                    } );
                },
                /**
                 * Formats the the authorised User for the TableView to display correctly.
                 * @param employee: Person information to format.
                 * @returns {{id, text: string}}: id and display information.
                 * @private
                 */
                _getNameAndIdFromEmployee: function( employee ) {
                    return {id: employee._id, text: Y.doccirrus.schemas.person.personDisplay( employee )};
                },
                /**
                 * Format tiContext information to display in the tableView.
                 * @param tiContext: Given Ti-Connector-Context
                 * @returns {{id, text: string}} id and display information.
                 * @private
                 */
                _getIdContextFromTiContext: function( tiContext ) {
                    return {
                        id: tiContext.id, text: tiContext.context.MandantId + ' / ' +
                                                tiContext.context.ClientSystemId + ' / ' +
                                                tiContext.context.WorkplaceId
                    };
                },
                destructor: function KimAccountsViewModel_destructor() {
                    var
                        self = this;

                    Y.log( 'KimAccountsViewModel_destructor ' + self, 'info', NAME );
                }
            },
            {
                NAME: 'KimAccountsViewModel'
            } );

        KoViewModel.registerConstructor( KimAccountsViewModel );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'kimaccount-schema',
            'KimAccountModel'
        ]
    }
);