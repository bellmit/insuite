/**
 * User: pi
 * Date: 17.01.18  08:47
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, moment*/
import 'babel-polyfill';
import '../../../autoload/KoUI/KoTable/KoTable.client';
import '../../../autoload/KoUI/KoButton/KoButton.client';
import '../../../autoload/KoViewModel/KoViewModel.client';
import '../../../autoload/jsonrpc/JsonRpc.client';
import '../../../autoload/KoUI/KoComponentManager/KoComponentManager.client';
import '../../../autoload/doccirrus.common';
import '../models/appreg-schema.common';

// eslint-disable-next-line no-native-reassign
Promise = window.bluebirdPromise;

YUI.add( 'AppTokenEntryPoint', function( Y/*, NAME */ ) {
    const
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
        isObjectEmpty = Y.doccirrus.commonutils.isObjectEmpty,
        i18n = Y.doccirrus.i18n;

    class ViewModel extends Disposable {
        initializer() {
            this.initViewModel();
        }

        initViewModel() {
            this.tableTitle = i18n( 'general.PAGE_TITLE.APP_TOKEN' );
            this.initAppTokenTable();
            this.initBtns();
            this.initAppLicenseSerialsToken();
        }

        showAppTokenModal( data ) {
            const
                self = this;
            return import(/*webpackChunkName: "appTokenModal"*/ './appToken-modal' )
                .then( function( modal ) {
                    Y.use( [ 'DCWindow', 'doccirrus', 'promise', 'KoViewModel', 'AppTokenModel', 'JsonRpc', 'comctlLib' ], () => {

                        modal = modal.default( Y );
                        modal.showDialog( { data } )
                            .then( () => {
                                self.appTokenTable.reload();
                            } );
                    } );

                } );
        }

        deleteSelected() {
            const
                self = this,
                componentColumnCheckbox = this.appTokenTable.getComponentColumnCheckbox(),
                checked = componentColumnCheckbox.checked();

            if( checked.some( ( row ) => row.companyData && !isObjectEmpty(row.companyData) ) ) {
                // don't allow to delete apptoken if it has an associated company
                return;
            }

            return import(/*webpackChunkName: "AppTokenModel" */ '../models/AppTokenModel.client' )
                .then( () => {
                    return new Promise( ( resolve, reject ) => {
                        Y.use( 'AppTokenModel', () => {
                            const
                                AppTokenModel = Y.doccirrus.KoViewModel.getConstructor( 'AppTokenModel' );
                            AppTokenModel.deleteEntry( {
                                query: {
                                    appName: { $in: checked.map( item => item.appName ) }
                                }
                            } )
                                .then( resolve )
                                .catch( reject );
                        } );
                    } );
                } )
                .then( () => {
                    self.appTokenTable.reload();
                } )
                .catch( error => {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        }

        initBtns() {
            const
                self = this;
            this.deleteBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'deleteBtn',
                    text: i18n( 'general.button.DELETE' ),
                    title: i18n( 'general.button.DELETE' ),
                    disabled: ko.computed( function() {
                        var
                            checkboxColumn = ko.unwrap( self.appTokenTable.getComponentColumnCheckbox() ),
                            checked = checkboxColumn.checked();

                        if( checked.length && checked.every( ( row ) => isObjectEmpty( row.companyData ) ) ) {
                            return false;
                        }

                        return true;
                    } ),
                    click: function() {
                        return self.deleteSelected();
                    }
                }
            } );
            this.createBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'createBtn',
                    text: i18n( 'general.button.ADD' ),
                    title: i18n( 'general.button.ADD' ),
                    click: function() {
                        return self.showAppTokenModal();
                    }
                }
            } );
        }

        refreshToken( data ) {
            const
                self = this;
            return import(/*webpackChunkName: "AppTokenModel" */ '../models/AppTokenModel.client' )
                .then( () => {
                    return new Promise( ( resolve, reject ) => {
                        Y.use( 'AppTokenModel', () => {
                            const
                                AppTokenModel = Y.doccirrus.KoViewModel.getConstructor( 'AppTokenModel' );
                            data.token = AppTokenModel.generateToken();
                            AppTokenModel.save( data )
                                .then( resolve )
                                .catch( reject );
                        } );
                    } );
                } )
                .then( () => {
                    self.appTokenTable.reload();
                } )
                .catch( error => {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );

        }

        initAppLicenseSerialsToken() {
            const self = this;

            self.displayAppLicenseSerialsTokenSection = ko.observable( true );

            if( !Y.doccirrus.auth.isAdmin() ) {
                self.displayAppLicenseSerialsTokenSection( false );
                return;
            }

            self.appLicenseSerialsTokenExplanationI18n = i18n( 'admin-schema.Admin_T.appLicenseSerialsToken' );
            self.appLicenseSerialsTokenI18n = ko.observable( '' );
            self.appLicenseSerialsTokenLoading = ko.observable( true );

            Y.doccirrus.jsonrpc.api.admin.getAppLicenseSerialToken()
                .done( function( response ) {
                    var
                        warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                    if( warnings.length ) {
                        Y.Array.invoke( warnings, 'display' );
                    }

                    self.appLicenseSerialsTokenI18n( response.data );
                } )
                .fail( function( response ) {
                    var
                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                    if( errors.length ) {
                        Y.Array.invoke( errors, 'display' );
                    }
                } )
                .always( function() {
                    self.appLicenseSerialsTokenLoading( false );
                } );
        }

        initAppTokenTable() {
            const
                self = this;

            self.appTokenTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'AppToken-appTokenTable',
                    states: [ 'limit' ],
                    fillRowsToLimit: false,
                    proxy: Y.doccirrus.jsonrpc.api.apptoken.getPopulatedAppTokensByCompany,
                    remote: true,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'select',
                            label: ''
                        },
                        {
                            forPropertyName: 'appName',
                            label: i18n( 'apptoken-schema.AppToken_T.appName' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'title',
                            label: i18n( 'apptoken-schema.AppToken_T.title' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'vendor',
                            label: i18n( 'apptoken-schema.AppToken_T.vendor' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'description',
                            label: i18n( 'apptoken-schema.AppToken_T.description' ),
                            width: '20%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'activatedOn',
                            label: i18n( 'AppTokenMojit.appToken.title.ACTIVATED_ON' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'companyData',
                            label: i18n( 'AppTokenMojit.appToken.title.USED_BY_COMPANIES' ),
                            width: '15%',
                            renderer: function( meta ) {
                                let value = meta.value || {};
                                if( !value._id ) {
                                    return `<em>N/A</em>`;
                                }
                                return `<a target="_blank" href="/crm#/company_tab/${value._id}">${value.coname} (${value.dcCustomerNo})</a>`;
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'version',
                            label: i18n( 'AppTokenMojit.appToken.title.VERSION' ),
                            width: '10%',
                            isSortable: true,
                            isFilterable: true,
                            visible: true
                        },
                        {
                            forPropertyName: 'latestReleaseDate',
                            label: i18n( 'AppTokenMojit.appToken.title.LATEST_RELEASE_DATE' ),
                            width: '15%',
                            renderer: function( meta ) {
                                let value = meta.value;
                                if( !value ) {
                                    return;
                                }
                                return moment(value).format('DD.MM.YYYY[  ]HH:mm:ss');
                            },
                            isSortable: true,
                            isFilterable: true,
                            visible: true
                        },
                        {
                            forPropertyName: 'token',
                            label: 'token',
                            visible: false
                        }
                    ],
                    onRowClick: function( meta ) {
                        if( meta.isLink ) {
                            return false;
                        }
                        if( meta.row ) {
                            return self.showAppTokenModal( meta.row );
                        }
                        return false;

                    }
                }
            } );
        }
    }

    /**
     * @module AppTokensEntryPoint
     *
     */
    /**
     * @property appTokenEntryPoint
     */
    Y.namespace( 'doccirrus.entryPoints' ).appTokenEntryPoint = {

        jaderef: 'AppTokenMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        bind: function( node ) {
            const
                viewModel = new ViewModel();
            ko.applyBindings( viewModel, node.getDOMNode() );

        }
    };
}, '0.0.1', {
    requires: [
        'KoTable',
        'KoButton',
        'KoViewModel',
        'KoComponentManager',
        'apptoken-schema',
        'JsonRpc'
    ]
} );