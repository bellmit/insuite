/*global YUI, ko */

'use strict';

/**
 * Modal view for selecting "Verzeichnisdienst" contacts for sending via KIM."
 */
YUI.add( 'DCKimReceiverVZDContactsModal', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;

        function KimReceiverVZDContactsModal(preSelectedAccounts) {
            this.preSelectedAccounts = preSelectedAccounts;
            KimReceiverVZDContactsModal.superclass.constructor.call( this, arguments );
        }

        /**
         * This is a View which uses two tables to select VZD contacts for sending.
         */
        Y.extend( KimReceiverVZDContactsModal, Y.doccirrus.KoViewModel.getDisposable(), {

            initializer: function KimReceiverVZDContactsModal_initializer() {
                var
                    self = this;

                self.selectedAccounts = ko.observable( self.preSelectedAccounts || [] );

                self.kimModalChoosenContactsI18n = i18n( 'PatientTransferMojit.KimCatalogService.choosen_contacts' );
                self.kimModalAllContactsI18n = i18n( 'PatientTransferMojit.KimCatalogService.all_contacts' );
                self.kimModalLdapConnectionDenied = i18n( 'PatientTransferMojit.KimCatalogService.ldapConnectionDenied' );

                self.initAllAccountsTable();
                self.initSelectedAccountsTable();
            },
            /**
             * Inits the table with all KIM accounts its uses the TiDirectoryService collection to fill.
             */
            initAllAccountsTable: function() {
                var
                    self = this;

                self.allAccountsTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        striped: false,
                        remote: true,
                        limitList: [25, 50, 75, 100],
                        limit: 100,
                        proxy: Y.doccirrus.jsonrpc.api.tiDirectoryService.read,
                        columns: [
                            {
                                forPropertyName: 'cn',
                                label: 'Name',
                                isFilterable: true,
                                isSortable: true
                            },
                            {
                                forPropertyName: 'sn',
                                label: 'Praxisname',
                                isFilterable: true,
                                isSortable: true
                            },
                            {
                                forPropertyName: 'mail',
                                label: 'E-Mail',
                                isFilterable: true,
                                isSortable: true
                            },
                            {
                                forPropertyName: '_id',
                                label: '',
                                title: '',
                                isFilterable: false,
                                isSortable: false,
                                visible: true,
                                width: '50px',
                                renderer: function() {
                                    return '<button class="btn"><i class="fa fa-angle-right"></i></button>';
                                }
                            }
                        ],
                        /**
                         *  Select button clicked, add this contact to the 'selected' table at right
                         *  @param {Object} meta
                         */
                        onRowClick: function( meta ) {
                            var
                                data = meta.row,
                                plainContacts = self.selectedAccounts(),
                                i;

                            if( meta.col.forPropertyName !== '_id' ) {
                                return;
                            }

                            //  check that this contact has not been selected before
                            for( i = 0; i < plainContacts.length; i++ ) {
                                if( data._id === plainContacts[i]._id ) {
                                    return;
                                }
                            }

                            plainContacts.push( data );
                            self.selectedAccounts( plainContacts );
                        }
                    }
                } );
            },
            /**
             * Inits the selected accounts table. As start selection it show the preselected accounts.
             */
            initSelectedAccountsTable: function() {
                var
                    self = this;

                self.selectedAccountsTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        striped: false,
                        remote: false,
                        limitList: [25, 50, 75, 100],
                        limit: 100,
                        data: self.selectedAccounts,
                        columns: [
                            {
                                forPropertyName: 'cn',
                                label: 'Name',
                                isFilterable: true,
                                isSortable: true
                            },
                            {
                                forPropertyName: 'sn',
                                label: 'Praxisname',
                                isFilterable: true,
                                isSortable: true
                            },
                            {
                                forPropertyName: 'mail',
                                label: 'E-Mail',
                                isFilterable: true,
                                isSortable: true
                            },
                            {
                                forPropertyName: '_id',
                                label: '',
                                title: '',
                                isFilterable: false,
                                isSortable: false,
                                visible: true,
                                width: '50px',
                                renderer: function() {
                                    return '<button class="btn"><i class="fa fa-trash"></i></button>';
                                }
                            }
                        ],
                        onRowClick: function( meta) {
                            var
                                data = meta.row,
                                plainContacts = self.selectedAccounts(),
                                i;

                            if( meta.col.forPropertyName !== '_id' ) {
                                return;
                            }

                            //  check that this contact has not been selected before
                            for( i = 0; i < plainContacts.length; i++ ) {
                                if( data._id === plainContacts[i]._id ) {
                                    plainContacts.splice( i, 1 );
                                }
                            }
                            self.selectedAccounts( plainContacts );
                        }
                    }
                } );
            },

            /**
             * Checks is the LDAP connection is configured and collects the current data from "Verzeichnisdienst".
             */
            updateTableData: function(){
                var
                    self = this;

                Promise.resolve( Y.doccirrus.jsonrpc.api.tiDirectoryService.testLdapConnection( {
                } ) ).then( function() {
                    Y.doccirrus.jsonrpc.api.tiDirectoryService.getDirectoryServiceData({});
                    self.allAccountsTable.loadData();
                } ).catch( function( err ) {
                    Y.log( 'Error testing ldap connection.: ' + err.stack || err, 'warn', 'selectReceiverKimModal.client.js' );
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: self.kimModalLdapConnectionDenied
                    } );
                } );
            }
        } );

        /**
         * Modalview for defining sender and receiver KIM accounts for sending "eArztbriefe". The user can select contacts
         * from "Verzeichnisdienst"
         * @type {{show: selectReceiverKimModal.show}}
         */
        Y.namespace( 'doccirrus.modals' ).selectReceiverKimModal = {

            show: function( addedRecipients, callback ) {
                var
                    modalViewPath = 'PatientTransferMojit/views/select_receiver_kim_modal';

                Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {
                        path: modalViewPath
                    } ).then( function( response ) {
                    var
                        markup = response.data,
                        node = Y.Node.create( markup ),
                        model = new KimReceiverVZDContactsModal( addedRecipients ),
                        // eslint-disable-next-line no-unused-vars
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-KoTableRemoteColumnCheckbox',
                            bodyContent: node,
                            title: i18n( 'PatientTransferMojit.KimCatalogService.choose_from_Kim' ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: 1200,
                            height: 700,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                            return callback( model.selectedAccounts() || [] );
                                        }
                                    } )
                                ]
                            }
                        } );

                    ko.applyBindings( model, node.getDOMNode() );
                } );
            }
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'template',
            'MessageViewModel'
        ]
    }
);