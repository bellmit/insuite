/**
 * User: do
 * Date: 16.08.19  13:05
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'KvcAccountsViewModel', function( Y, NAME ) {

        /**
         * @module KvcAccountsViewModel
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,

            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
            STATUS = i18n( 'kvcaccount-schema.KVCAccount_T.status.i18n' ),
            USERNAME = i18n( 'kvcaccount-schema.KVCAccount_T.username.i18n' ),
            PASSWORD = i18n( 'kvcaccount-schema.KVCAccount_T.password.i18n' ),
            LOCATION_IDS = i18n( 'kvcaccount-schema.KVCAccount_T.locationIds.i18n' ),
            CERTIFICATE_STATUS = i18n( 'kvcaccount-schema.KVCAccount_T.certificateStatus.i18n' ),
            LAST_KVC_LOGIN = i18n( 'kvcaccount-schema.KVCAccount_T.lastKvcLogin.i18n' ),
            PASSWORD_CHANGE_NEEDED = i18n( 'kvcaccount-schema.KVCAccount_T.passwordChangeNeeded.i18n' ),
            PASSWORD_LAST_CHANGE = i18n( 'kvcaccount-schema.KVCAccount_T.passwordLastChange.i18n' ),

            CREATE_CERTIFICATE = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.manageCertificates.button.CREATE_CERTIFICATE' ),
            DELETE_CERTIFICATE = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.manageCertificates.button.DELETE_CERTIFICATE' ),
            DOWNLOAD_CERTIFICATE = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.manageCertificates.button.DOWNLOAD_CERTIFICATE' ),

            CONFIRM_DELETION_TITLE = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.confirmDeletion.title' ),
            CONFIRM_DELETION_MESSAGE = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.confirmDeletion.message' ),

            NOTICE_SER_NOT_LOGGED_IN_MESSAGE = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.noticeUserNotLoggedIn.message' ),

            USER_MANAGEMENT_HEADLINE = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.headline.USER_MANAGEMENT' ),

            CHANGE_PASSWORD = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.button.CHANGE_PASSWORD' ),
            MANAGE_CERTIFICATES = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.button.MANAGE_CERTIFICATES' ),

            CHANGE_PASSWORD_NEW_PASSWORD = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.changePassword.NEW_PASSWORD' ),
            CHANGE_PASSWORD_OLD_PASSWORD = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.changePassword.OLD_PASSWORD' ),
            CHANGE_PASSWORD_GUIDELINES = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.changePassword.GUIDELINES' ),

            // CREATE_CERTIFICATE_OLD_PIN = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.createCertificate.OLD_PIN' ),
            CREATE_CERTIFICATE_NEW_PIN = i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.createCertificate.NEW_PIN' ),

            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            KoViewModel = Y.doccirrus.KoViewModel,
            KvcAccountModel = Y.doccirrus.KoViewModel.getConstructor( 'KvcAccountModel' );

        function handleError( err ) {
            var code = err.code || err.statusCode;
            if( code ) {
                Y.doccirrus.DCWindow.notice( {
                    message: Y.doccirrus.errorTable.getMessage( {code: code} )
                } );
            }
            Y.log( 'error: ' + err.message, 'warn', NAME );
        }

        function confirm( title, message ) {
            return new Promise( function( resolve ) {
                Y.doccirrus.DCWindow.confirm( {
                    title: title,
                    message: message,
                    callback: function( confirm ) {
                        resolve( confirm.success );
                    }
                } );
            } );
        }

        function notice( message ) {
            return new Promise( function( resolve ) {
                Y.doccirrus.DCWindow.notice( {
                    message: message,
                    callback: function() {
                        resolve();
                    }
                } );
            } );
        }

        function DialogModel( data ) {
            var self = this;
            self.title = data.title;
            self.subtitle = data.subtitle;
            self.primaryBtnText = data.primaryBtnText;
            self.disabledFields = ko.observable( false );
            self.fields = [];
            self.fields = data.fields.map( function( field ) {
                field.data = ko.observable();
                field.type = field.type || 'input';
                return field;
            } );
            self.getData = function() {
                var result = {};
                self.fields.forEach( function( field ) {
                    result[field.attr] = field.data();
                } );
                return result;
            };
            self.action = data.action;

            self.messages = ko.observableArray( [] );

        }

        function showChangeDialog( data ) {
            var modal, aDCWindowResizeEvent,
                model = new DialogModel( data );
            Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'KVConnectMojit/views/kvcaccount_change_auth'} )
                .then( function( response ) {
                    var bodyContent = Y.Node.create( response.data );

                    modal = new Y.doccirrus.DCWindow( {
                        id: 'KvcAccountChangeAuth',
                        className: 'DCWindow-KvcAccountChangeAuth',
                        bodyContent: bodyContent,
                        title: model.title,
                        icon: Y.doccirrus.DCWindow.ICON_EDIT,
                        centered: true,
                        width: data.width,
                        render: document.body,
                        modal: true,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    label: i18n( 'general.button.CANCEL' )
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    label: model.primaryBtnText,
                                    action: function() {
                                        if( data.action && 'function' === typeof data.action ) {
                                            model.disabledFields( true );
                                            data.action( model.getData() ).then( function() {
                                                model.disabledFields( false );
                                                modal.close();
                                            } ).catch( function( err ) {
                                                var message;
                                                if( err.code ) {
                                                    message = Y.doccirrus.errorTable.getMessage( {code: err.code} );
                                                } else {
                                                    message = err.message || err;
                                                }
                                                model.disabledFields( false );
                                                // show errors
                                                model.messages( [message] );
                                            } );
                                        } else {
                                            modal.close();
                                        }
                                    }
                                } )
                            ]
                        },
                        after: {
                            render: function() {
                                var
                                    modalBody = this,
                                    modalBodyResizeHandler = function() {
                                        modalBody.set( 'centered', true );
                                    };
                                aDCWindowResizeEvent = Y.one( window ).on( 'resize', modalBodyResizeHandler );
                                modalBodyResizeHandler();
                            },
                            destroy: function() {
                                if( aDCWindowResizeEvent ) {
                                    aDCWindowResizeEvent.detach();
                                }
                                if( model && model._dispose ) {
                                    model._dispose();
                                }
                                ko.cleanNode( bodyContent.getDOMNode() );
                            }
                        }

                    } );

                    // Workaround for Change Password Modal
                    setTimeout( function() {
                        modal.set( 'centered', true );
                    }, 0 );

                    ko.applyBindings( model, document.getElementById( 'KvcAccountChangeAuth' ) );

                } );
        }

        function KvcCertificateViewModel( account ) {
            var self = this;

            self.account = account;

            self.getCertificateInfo = function( cert ) {

                var
                    validTo = cert.validTo(),
                    validFrom = cert.validFrom();

                if( !validTo || !validTo ) {
                    return '-';
                }

                return i18n( 'KVConnectMojit.KvcAccountsViewModelJS.modal.manageCertificates.CERTIFICATION_INFO', {
                    data: {
                        validTo: moment( validTo ).format( TIMESTAMP_FORMAT_LONG ),
                        validFrom: moment( validFrom ).format( TIMESTAMP_FORMAT_LONG )
                    }
                } );
            };

            self.getCsrStatus = function( cert ) {
                return 'CSR Status: ' + Y.doccirrus.schemaloader.getEnumListTranslation( 'kvcaccount', 'CsrStatus_E', peek( cert.csrStatus ), 'i18n', '-' );
            };

            self.isFinalCsrStatus = ko.computed( function() {
                var certs = account.certificates(),
                    cert = certs[0];
                return cert && Y.doccirrus.schemas.kvcaccount.isFinalCsrStatus( unwrap( cert.csrStatus ) );
            } );

            self.refreshCsrStatus = function() {
                account.refreshCsrStatus().catch( handleError );
            };

            self.createCertificate = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'createCertificate',
                    icon: 'PLUS',
                    title: CREATE_CERTIFICATE,
                    text: CREATE_CERTIFICATE,
                    click: function() {
                        showChangeDialog( {
                            title: CREATE_CERTIFICATE,
                            subtitle: '',
                            width: Y.doccirrus.DCWindow.SIZE_SMALL,
                            primaryBtnText: CREATE_CERTIFICATE,
                            fields: [
                                // {
                                //     label: CREATE_CERTIFICATE_OLD_PIN,
                                //     attr: 'oldPin',
                                //     type: 'password'
                                // },
                                {
                                    label: CREATE_CERTIFICATE_NEW_PIN,
                                    attr: 'newPin',
                                    type: 'password'
                                }
                            ],
                            action: function( data ) {
                                return account.createCertificate( data );
                            }
                        } );

                    }
                }
            } );
            self.deleteCertificate = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'deleteCertificate',
                    icon: 'MINUS',
                    title: DELETE_CERTIFICATE,
                    text: DELETE_CERTIFICATE,
                    click: function() {
                        account.deleteCertificate().catch( handleError );
                    }
                }
            } );
            self.downloadCertificate = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'downloadCertificate',
                    icon: 'DOWNLOAD',
                    title: DOWNLOAD_CERTIFICATE,
                    text: DOWNLOAD_CERTIFICATE,
                    click: function() {

                    }
                }
            } );

        }

        function showCertificateManagementModal( account ) {
            var
                model = new KvcCertificateViewModel( account );
            Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'KVConnectMojit/views/kvc_certificate'} )
                .then( function( response ) {
                    var bodyContent = Y.Node.create( response.data );

                    model.modal = new Y.doccirrus.DCWindow( {
                        id: 'KvcCertificateManagementModal',
                        className: 'DCWindow-KvcCertificateManagementModal',
                        bodyContent: bodyContent,
                        title: MANAGE_CERTIFICATES,
                        icon: Y.doccirrus.DCWindow.ICON_CERTIFICATE,
                        centered: true,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CLOSE', {
                                    isDefault: true,
                                    label: i18n( 'general.button.CLOSE' )
                                } )
                            ]
                        }
                    } );

                    ko.applyBindings( model, bodyContent.getDOMNode() );
                } );
        }

        function KvcAccountsViewModel( config ) {
            KvcAccountsViewModel.superclass.constructor.call( this, config );
        }

        KvcAccountsViewModel.ATTRS = {
            validatable: {
                value: false,
                lazyAdd: false
            }
        };

        Y.extend( KvcAccountsViewModel, KoViewModel.getBase(), {
                initializer: function KvcAccountsViewModel_initializer() {
                    var
                        self = this;

                    self.userManagementHeadlineI18n = USER_MANAGEMENT_HEADLINE;

                    self.accountsTable = KoComponentManager.createComponent( {
                        componentType: 'KoEditableTable',
                        componentConfig: {
                            stateId: 'InsuranceGroupBrowser-insuranceGroupTable',
                            ViewModel: KvcAccountModel,
                            sharedViewModelData: {
                                getTableInstance: function() {
                                    return self.accountsTable;
                                }
                            },
                            data: self.initialConfig.data,
                            columns: [
                                {
                                    label: STATUS,
                                    text: STATUS,
                                    width: '50px',
                                    forPropertyName: 'status',
                                    css: {
                                        'text-center': 1
                                    },
                                    renderer: function( meta ) {
                                        var value = unwrap( meta.value ),
                                            statusI18n = Y.doccirrus.schemaloader.getEnumListTranslation( 'kvcaccount', 'KVCAccountStatus_E', value, 'i18n', '-' ),
                                            row = unwrap( meta.row ),
                                            statusMessage = row && row.statusMessage && peek( row.statusMessage ) || '',
                                            statusIcon, colorCss;

                                        if( value === 'LOGIN_OK' ) {
                                            statusIcon = 'ok';
                                            colorCss = 'text-success';
                                        } else if( value === 'LOGIN_FAILED' ) {
                                            statusIcon = 'minus';
                                            colorCss = 'text-warning';
                                        } else {
                                            statusIcon = 'question';
                                            colorCss = 'text-info';
                                        }
                                        return '<span title="' + (statusMessage || statusI18n) + '" class="glyphicon glyphicon-' + statusIcon + '-sign ' + colorCss + '"/>';
                                    }
                                },
                                {
                                    label: CERTIFICATE_STATUS,
                                    text: CERTIFICATE_STATUS,
                                    forPropertyName: 'certificateStatus',
                                    width: '50px',
                                    css: {
                                        'text-center': 1
                                    },
                                    renderer: function( meta ) {
                                        var value = unwrap( meta.value ),
                                            statusI18n = Y.doccirrus.schemaloader.getEnumListTranslation( 'kvcaccount', 'KVCAccountCertificateStatus_E', value, 'i18n', '-' ),
                                            statusIcon, colorCss;

                                        if( value === 'VALID' ) {
                                            statusIcon = 'ok';
                                            colorCss = 'text-success';
                                        } else if( value === 'EXPIRED' ) {
                                            statusIcon = 'minus';
                                            colorCss = 'text-warning';
                                        } else {
                                            statusIcon = 'question';
                                            colorCss = 'text-info';
                                        }
                                        return '<span title="' + statusI18n + '" class="glyphicon glyphicon-' + statusIcon + '-sign ' + colorCss + '"/>';
                                    }
                                },
                                {
                                    label: USERNAME,
                                    text: USERNAME,
                                    forPropertyName: 'username'
                                },
                                {
                                    label: PASSWORD,
                                    text: PASSWORD,
                                    forPropertyName: 'password',
                                    type: 'password',
                                    renderer: function( meta ) {
                                        var value = unwrap( meta.value );
                                        if( value ) {
                                            return '***';
                                        }
                                    }
                                },
                                {
                                    label: LOCATION_IDS,
                                    text: LOCATION_IDS,
                                    forPropertyName: 'locations',
                                    inputField: {
                                        componentType: 'KoFieldSelect2',
                                        componentConfig: {
                                            useSelect2Data: true,
                                            select2Read: function( value ) {
                                                var result = value.filter(Boolean);
                                                return result;
                                            },
                                            select2Write: function __type_select2Write( $event, observable ) {
                                                if( $event.added ) {
                                                    observable.push( $event.added );
                                                }
                                                if( $event.removed ) {
                                                    observable.remove( $event.removed );
                                                }
                                            },
                                            select2Config: {
                                                query: undefined,
                                                initSelection: undefined,
                                                data: self.initialConfig.locations.map( function( location ) {
                                                    return {id: location._id, text: location.locname};
                                                } )
                                            }
                                        }
                                    },
                                    renderer: function __col_type_renderer( meta ) {
                                        var
                                            value = unwrap( meta.value );

                                            var result = (value || []).map( function( location ) {
                                                return location ? location.text : '';
                                            } );

                                            return result.filter(x => x.trim()).join(', ');
                                    }
                                },
                                {
                                    label: LAST_KVC_LOGIN,
                                    text: LAST_KVC_LOGIN,
                                    forPropertyName: 'lastKvcLogin',
                                    renderer: function( meta ) {
                                        var value = unwrap( meta.value );
                                        if( value ) {
                                            return moment( value ).format( TIMESTAMP_FORMAT_LONG );
                                        }
                                        return '-';
                                    }
                                },
                                {
                                    label: PASSWORD_CHANGE_NEEDED,
                                    text: PASSWORD_CHANGE_NEEDED,
                                    forPropertyName: 'passwordChangeNeeded',
                                    renderer: function( meta ) {
                                        var value = unwrap( meta.value );
                                        if( typeof value === 'boolean' ) {
                                            return true === value ? 'Ja' : 'Nein'; // TODO: i18n
                                        }
                                        return '-';
                                    }
                                },
                                {
                                    label: PASSWORD_LAST_CHANGE,
                                    text: PASSWORD_LAST_CHANGE,
                                    forPropertyName: 'passwordLastChange',
                                    renderer: function( meta ) {
                                        var value = unwrap( meta.value );
                                        if( value ) {
                                            return moment( value ).format( TIMESTAMP_FORMAT_LONG );
                                        }
                                        return '-';
                                    }
                                },
                                {
                                    forPropertyName: 'changePasswordButton',
                                    utilityColumn: true,
                                    width: '60px',
                                    css: {
                                        'text-center': 1
                                    },
                                    inputField: {
                                        componentType: 'KoButton',
                                        componentConfig: {
                                            name: 'change-password',
                                            title: CHANGE_PASSWORD,
                                            tooltip: CHANGE_PASSWORD,
                                            icon: 'PENCIL',
                                            click: function( button, $event, $context ) {
                                                if( $context.$parent.row.status() !== 'LOGIN_OK' ) {
                                                    return notice( NOTICE_SER_NOT_LOGGED_IN_MESSAGE );
                                                }
                                                showChangeDialog( {
                                                    title: CHANGE_PASSWORD,
                                                    subtitle: CHANGE_PASSWORD_GUIDELINES,
                                                    width: Y.doccirrus.DCWindow.SIZE_LARGE,
                                                    primaryBtnText: CHANGE_PASSWORD,
                                                    fields: [
                                                        {
                                                            label: CHANGE_PASSWORD_OLD_PASSWORD,
                                                            attr: 'oldPwd',
                                                            type: 'password'
                                                        },
                                                        {
                                                            label: CHANGE_PASSWORD_NEW_PASSWORD,
                                                            attr: 'newPwd',
                                                            type: 'password'
                                                        }
                                                    ],
                                                    action: function( data ) {
                                                        return $context.$parent.row.changePassword( data );
                                                    }
                                                } );
                                            }
                                        }
                                    }
                                },
                                {
                                    forPropertyName: 'manageCertificatesButtons',
                                    utilityColumn: true,
                                    width: '60px',
                                    css: {
                                        'text-center': 1
                                    },
                                    inputField: {
                                        componentType: 'KoButton',
                                        componentConfig: {
                                            name: 'manage-certificate',
                                            title: MANAGE_CERTIFICATES,
                                            tooltip: MANAGE_CERTIFICATES,
                                            icon: 'CERTIFICATE',
                                            click: function( button, $event, $context ) {
                                                if( $context.$parent.row.status() !== 'LOGIN_OK' ) {
                                                    return notice( NOTICE_SER_NOT_LOGGED_IN_MESSAGE );
                                                }
                                                showCertificateManagementModal( $context.$parent.row );
                                            }
                                        }
                                    }
                                },
                                {
                                    forPropertyName: 'deleteButton',
                                    utilityColumn: true,
                                    width: '60px',
                                    css: {
                                        'text-center': 1
                                    },
                                    inputField: {
                                        componentType: 'KoButton',
                                        componentConfig: {
                                            name: 'delete',
                                            title: i18n( 'general.button.DELETE' ),
                                            icon: 'TRASH_O',
                                            click: function( button, $event, $context ) {

                                                confirm( CONFIRM_DELETION_TITLE, CONFIRM_DELETION_MESSAGE ).then( function( success ) {
                                                    if( success ) {
                                                        $context.$parent.row.remove().then( function() {
                                                            self.accountsTable.removeRow( $context.$parent.row );
                                                        } ).catch( function( response ) {
                                                            Y.log( 'could not remove kvc account: ' + response, 'error', NAME );
                                                            handleError( response );
                                                        } );

                                                    }
                                                } );

                                            }
                                        }
                                    }
                                }
                            ],
                            onAddButtonClick: function() {
                                self.accountsTable.addRow( {
                                    data: {}
                                } );
                                return false;
                            }
                        }
                    } );

                    return Promise.resolve( Y.doccirrus.jsonrpc.api.kvcaccount.read() ).then( function( response ) {
                        if( response && response.data ) {
                            self.accountsTable.data( response.data.map( function( data ) {
                                data.initlocations = data.locationIds.map( function( locationId ) {
                                    var loc;
                                    self.initialConfig.locations.some( function( location ) {
                                        if( location._id === locationId ) {
                                            loc = {id: locationId, text: location.locname};
                                            return true;
                                        }
                                    } );
                                    return loc;
                                } );
                                return {data: data};
                            } ) );
                        }
                    } ).catch( handleError );

                },
                destructor: function KvcAccountsViewModel_destructor() {
                    var
                        self = this;

                    Y.log( 'KvcAccountsViewModel_destructor ' + self, 'info', NAME );

                }
            },
            {
                NAME: 'KvcAccountsViewModel'
            } );

        KoViewModel.registerConstructor( KvcAccountsViewModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'kvcaccount-schema',
            'KvcAccountModel'
        ]
    }
);