/**
 * User: pi
 * Date: 13/05/15  16:18
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*exported fun */
/*global fun:true, ko, moment, async */
fun = function _fn( Y, NAME ) {
    'use strict';

    var
        companyListModel,
        i18n = Y.doccirrus.i18n,
        CONTACT = i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' ),
        ACTIVATE = i18n( 'CRMMojit.companiesbrowser.button.ACTIVATE' ),
        DEACTIVATE = i18n( 'CRMMojit.companiesbrowser.button.DEACTIVATE' ),
        DELETE = i18n( 'CRMMojit.companiesbrowser.button.DELETE' ),
        ACTIVATION_SUCCESS = i18n( 'CRMMojit.crm_companies_tabJS.message.ACTIVATION_SUCCESS' ),
        ACTIVATION_FAIL = i18n( 'CRMMojit.crm_companies_tabJS.message.ACTIVATION_FAIL' ),
        DEACTIVATION_SUCCESS = i18n( 'CRMMojit.crm_companies_tabJS.message.DEACTIVATION_SUCCESS' ),
        DEACTIVATION_FAIL = i18n( 'CRMMojit.crm_companies_tabJS.message.DEACTIVATION_FAIL' ),
        TENANT_DELETE_SUCCESS = i18n( 'CRMMojit.crm_companies_tabJS.message.TENANT_DELETE_SUCCESS' ),
        TENANT_DELETE_FAIL = i18n( 'CRMMojit.crm_companies_tabJS.message.TENANT_DELETE_FAIL' ),
        TENANT_DELETE_CONFIRM = i18n( 'CRMMojit.crm_companies_tabJS.message.TENANT_DELETE_CONFIRM' ),
        TENANT_CREATE_FAIL = i18n( 'CRMMojit.crm_companies_tabJS.message.TENANT_CREATE_FAIL' ),
        TRANSFORM_CONFIRM = i18n( 'CRMMojit.crm_companies_tabJS.message.TRANSFORM_CONFIRM' ),
        TENANT_NEW = i18n( 'CRMMojit.crm_companies_tabJS.message.TENANT_NEW' ),
        MTS_NEW = i18n( 'CRMMojit.crm_companies_tabJS.message.MTS_NEW' ),
        SELECT_TENANT = i18n( 'CRMMojit.crm_companies_tabJS.message.SELECT_TENANT' ),
        COMPANY_NAME = i18n( 'person-schema.Company_T.coname' ),
        COMPANY_TYPE = i18n( 'person-schema.Company_T.cotype' ),
        CUSTOMER_NUMBER = i18n( 'customer-schema.base.customerNo.i18n' ),
        DC_CUSTOMER_NUMBER = i18n( 'customer-schema.base.dcCustomerNo.i18n' ),
        CENTRAL_CONTACT = i18n( 'customer-schema.base.centralContact.i18n' ),
        TENANT_ID = i18n( 'customer-schema.base.tenantId.i18n' ),
        ACTIVE_STATUS = i18n( 'customer-schema.base.activeState.i18n' ),
        PROD_SERVICES = i18n( 'customer-schema.base.prodServices.i18n' ),
        REGISTERED = i18n( 'CRMMojit.crm_companies_tabJS.title.REGISTERED' ),
        ACTIVATED = i18n( 'CRMMojit.crm_companies_tabJS.title.ACTIVATED' ),
        TRANSFORM_TO_PRC = i18n( 'CRMMojit.crm_companies_tabJS.title.TRANSFORM_TO_PRC' ),
        REPLICATE_AC_DATA = i18n( 'CRMMojit.crm_companies_tabJS.title.REPLICATE_AC_DATA' ),
        REPLICATE_FORM_DATA = i18n( 'CRMMojit.crm_companies_tabJS.title.REPLICATE_FORM_DATA' ),
        REPLICATION_MODAL_AC = i18n( 'CRMMojit.crm_companies_tabJS.message.REPLICATION_MODAL_AC' ),
        REPLICATION_MODAL_FORMS = i18n( 'CRMMojit.crm_companies_tabJS.message.REPLICATION_MODAL_FORMS' ),
        END = i18n( 'CRMMojit.crm_companies_tabJS.title.END' ),
        CONFIRMED = i18n( 'contact-schema.Contact_T.confirmed.i18n' ),
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    function CompanyListModel() {
        CompanyListModel.superclass.constructor.apply( this, arguments );
    }

    CompanyListModel.ATTRS = {
        pageData: {
            value: null,
            lazyAdd: false
        }
    };

    Y.extend( CompanyListModel, Y.doccirrus.KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function CompanyListModel_initializer() {
            var
                self = this;
            self.initCompanyListModel();
        },
        /** @protected */
        destructor: function CompanyListModel_destructor() {
            var
                self = this;
            if( self.canReplicateACDataListener ) {
                self.canReplicateACDataListener.removeEventListener();
            }
            if( self.canReplicateFormDataListener ) {
                self.canReplicateFormDataListener.removeEventListener();
            }
            if( self.activateCustomerListener ) {
                self.activateCustomerListener.removeEventListener();
            }
        },
        initCompanyListModel: function CompanyListModel_initCompanyListModel() {
            var
                self = this;
            self.isVPRCAdmin = Y.doccirrus.auth.isVPRCAdmin();
            self.initCompaniesTable();
            self.initButtons();
            if( self.isVPRCAdmin ) {
                self.initReplicationACData();
                self.initReplicationFormData();
            } else {
                Y.log( 'Server is not VPRCAdmin, not offering replication features.', 'debug', NAME );
            }
        },
        initReplicationACData: function() {
            var
                self = this;
            self.disableReplicateACData = ko.observable( !Y.doccirrus.auth.isMVPRC() );
            self.setSocketListeners();
            self.replicateACData = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'replicateACData',
                    text: REPLICATE_AC_DATA,
                    click: function() {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: REPLICATION_MODAL_AC,
                            window: {
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                            label: 'Abbrechen',
                                            action: function() {
                                                this.close();
                                            }
                                        } ),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            label: 'Bestätigung',
                                            isDefault: true,
                                            action: function() {
                                                self.disableReplicateACData( true );
                                                Y.doccirrus.communication.emit( 'crm.replicateACData', {}, Y.doccirrus.communication.getSocket( '/' ) );
                                                this.close();
                                            }
                                        } ) ]
                                }
                            }

                        } );
                    },
                    disabled: self.disableReplicateACData
                }
            } );

        },
        initReplicationFormData: function() {
            var
                self = this;
            self.disableReplicateFormData = ko.observable( !Y.doccirrus.auth.isMVPRC() );
            self.setSocketListeners();
            self.replicateFormData = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'replicateFormData',
                    text: REPLICATE_FORM_DATA,            //  TODO: translateme
                    click: function() {
                        self.showFormReplicationModal();
                    },
                    disabled: self.disableReplicateFormData
                }
            } );

        },
        showFormReplicationModal: function() {
            var
                self = this,
                noticeWindow,
                checkboxCol = self.companiesKoTable.getComponentColumnCheckbox(),
                selectedTenants = ko.unwrap( checkboxCol.checked ),
                selectedTenantIds = [],
                i;

            for( i = 0; i < selectedTenants.length; i++ ) {
                selectedTenantIds.push( selectedTenants[ i ]._id );
            }

            Y.log( 'Replicating forms to tenants: ' + JSON.stringify( selectedTenantIds ), 'debug', NAME );

            if( 0 === selectedTenantIds.length ) {
                noticeWindow = Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: 'Please select tenants to replicate forms to.' //  TODO: translateme
                } );
                return;
            }

            noticeWindow = Y.doccirrus.DCWindow.notice( {
                type: 'info',
                message: REPLICATION_MODAL_FORMS,
                window: {
                    buttons: {
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                label: 'Abbrechen',
                                action: function onClickCancelFormReplication() {
                                    this.close();
                                }
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                label: 'Bestätigung',
                                isDefault: true,
                                action: onClickStartFormReplication
                            } )
                        ]
                    }
                }

            } );

            function onClickStartFormReplication() {
                self.disableReplicateFormData( true );
                Y.doccirrus.communication.emit( 'crm.replicateFormData', { 'tenantIds': selectedTenantIds }, Y.doccirrus.communication.getSocket( '/' ) );
                noticeWindow.close();
            }

        },
        setSocketListeners: function() {
            var
                self = this,
                withSocket = Y.doccirrus.communication.getSocket( '/' );

            self.canReplicateACDataListener = Y.doccirrus.communication.on( {
                event: 'crm.canReplicateACData',
                done: function handleCall( response ) {
                    var
                        canReplicateACData = response.data;
                    self.disableReplicateACData( !canReplicateACData );
                }
            } );

            self.canReplicateFormDataListener = Y.doccirrus.communication.on( {
                event: 'crm.canReplicateFormData',
                done: function handleCall( response ) {
                    Y.log( 'Socket response to canReplicateFormData: ' + JSON.stringify( response ), 'debug', NAME );
                    var
                        canReplicateFormData = response.data;
                    self.disableReplicateFormData( !canReplicateFormData );
                }
            } );

            self.replicateFormDataListener = Y.doccirrus.communication.on( {
                event: 'crm.replicateFormData',
                done: function handleCall( response ) {
                    Y.log( 'Socket response to replicateFormData: ' + JSON.stringify( response ), 'debug', NAME );
                    var
                        canReplicateFormData = response.data;
                    self.disableReplicateFormData( !canReplicateFormData );
                }
            } );

            Y.doccirrus.communication.emit( 'crm.canReplicateACData', {}, withSocket );
            Y.doccirrus.communication.emit( 'crm.canReplicateFormData', {}, withSocket );
        },
        initCompaniesTable: function() {
            var
                self = this,
                pageData = self.get( 'pageData' );

            self.companiesKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'CRMMojit-CompaniesTab-companiesKoTable',
                    states: [ 'limit' ],
                    fillRowsToLimit: false,
                    remote: true,
                    rowPopover: false,
                    proxy: Y.doccirrus.jsonrpc.api.company.getCentralContact,
                    baseParams: {
                        query: {
                            serverType: Y.doccirrus.schemas.company.serverTypes.VPRC
                        }
                    },
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: ''
                        },
                        {
                            forPropertyName: 'coname',
                            isFilterable: true,
                            isSortable: true,
                            label: COMPANY_NAME,
                            title: COMPANY_NAME,
                            width: '8%'
                        },
                        {
                            forPropertyName: 'dcCustomerNo',
                            isFilterable: true,
                            isSortable: true,
                            label: DC_CUSTOMER_NUMBER,
                            title: DC_CUSTOMER_NUMBER,
                            width: '7%'
                        },
                        {
                            forPropertyName: 'tenantId',
                            isFilterable: true,
                            isSortable: true,
                            label: TENANT_ID,
                            title: TENANT_ID,
                            width: '8%'
                        },
                        {
                            forPropertyName: 'customerNo',
                            label: CUSTOMER_NUMBER,
                            title: CUSTOMER_NUMBER,
                            isFilterable: true,
                            isSortable: true,
                            width: '7%'
                        },
                        {
                            forPropertyName: 'centralContact',
                            label: CENTRAL_CONTACT,
                            title: CENTRAL_CONTACT,
                            width: '8%',
                            renderer: function( meta ) {
                                var contact = meta.value,
                                    first = contact.firstname || '',
                                    last = contact.lastname || '';

                                if( !contact ) {
                                    return '';
                                }

                                return first + ' ' + last;
                            }
                        },
                        {
                            forPropertyName: '_id',
                            label: REGISTERED,
                            title: REGISTERED,
                            isSortable: true,
                            direction: 'DESC',
                            sortInitialIndex: 0,
                            width: '10%',
                            renderer: function( meta ) {
                                var format = '%d.%m.%Y',
                                    value = meta.value;
                                return Y.Date.format( Y.doccirrus.commonutils.dateFromObjectId( value ), { format: format } );
                            }
                        },
                        {
                            forPropertyName: 'activated',
                            label: ACTIVATED,
                            title: ACTIVATED,
                            width: '8%',
                            renderer: function( meta ) {
                                var data = meta.row,
                                    trialService = Y.doccirrus.schemas.company.getTrialDates( data );
                                return trialService && trialService.trialBegin && moment( trialService.trialBegin ).format( 'DD.MM.YYYY' ) || '';
                            }
                        },
                        {
                            forPropertyName: 'end',
                            label: END,
                            title: END,
                            width: '8%',
                            renderer: function( meta ) {
                                var data = meta.row,
                                    trialService = Y.doccirrus.schemas.company.getTrialDates( data );
                                return trialService && trialService.trialExpire && moment( trialService.trialExpire ).format( 'DD.MM.YYYY' ) || '';
                            }
                        },
                        {
                            forPropertyName: 'cotype',
                            label: COMPANY_TYPE,
                            title: COMPANY_TYPE,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.company.types.CompanyType_E.list,
                                optionsValue: 'val'
                            },
                            width: '8%'
                        },
                        {
                            forPropertyName: 'confirmed',
                            label: CONFIRMED,
                            title: CONFIRMED,
                            width: '6%',
                            renderer: function( meta ) {
                                var contact = meta.row && meta.row.centralContact;
                                if( !contact ) {
                                    return '';
                                }
                                return ( undefined !== contact.confirmed && contact.confirmed ) ? '<i class="fa fa-check"></i>' : '<i class="fa fa-times"></i>';

                            }
                        },
                        {
                            forPropertyName: 'prodServices',
                            label: PROD_SERVICES,
                            title: PROD_SERVICES,
                            width: '7%',
                            renderer: function( meta ) {
                                var
                                    i = 0,
                                    services = meta.value,
                                    servicesString = 'IC';
                                if( services ) {
                                    for( i; i < services.length; i++ ) {
                                        switch( services[ i ].ps ) {
                                            case 'MISCORE':
                                                servicesString += 'M ';
                                                break;
                                            case 'NEWSLETTER':
                                                servicesString += 'N ';
                                                break;
                                            case 'VPRC':
                                                if( Y.doccirrus.schemas.company.isTemplate( services[ i ] ) ) {
                                                    servicesString += 'V T '; // for template tenant
                                                } else {
                                                    servicesString += 'V ';
                                                }
                                                break;
                                            case 'NETKPI':
                                                servicesString += 'NK ';
                                                break;
                                            case 'DRGCOCKPIT':
                                                servicesString += 'D ';
                                                break;
                                            case 'QUESTIONAIRE':
                                                servicesString += 'Q ';
                                                break;
                                            case 'INTIME':
                                                servicesString += 'I ';
                                                break;
                                            case 'INTIME+':
                                                servicesString += 'I+ ';
                                                break;
                                            case 'COMMUNITY':
                                                servicesString += 'C ';
                                                break;
                                            case 'PTI':
                                                servicesString += 'P ';
                                                break;
                                            case 'other':
                                                servicesString += '+ ';
                                                break;
                                            case 'PPRC':
                                                servicesString += 'PP ';
                                                break;
                                            case 'SMS':
                                                servicesString += 'S ';
                                                break;
                                        }
                                    }
                                }
                                return servicesString;
                            }
                        },
                        {
                            forPropertyName: 'communications.0.value',
                            label: CONTACT,
                            title: CONTACT,
                            isSortable: true,
                            isFilterable: true,
                            width: '9%'
                        },
                        {
                            forPropertyName: 'activeState',
                            label: ACTIVE_STATUS,
                            title: ACTIVE_STATUS,
                            isFilterable: true,
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            width: '6%',
                            renderer: function( meta ) {
                                var status = meta.value;
                                return ( status ) ? '<i class="fa fa-check"></i>' : '<i class="fa fa-times"></i>';
                            }
                        }
                    ],
                    onRowClick: function( meta ) {
                        var data = meta.row;
                        pageData.prevTab = '/crm#/companies_tab_trial';
                        window.open( '/crm#/company_tab/' + data._id, '_self' );
                    }
                }
            } );
        },
        initButtons: function() {
            var
                self = this;
            self.activate = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'activate',
                    text: ACTIVATE,
                    disabled: self.addDisposable( ko.computed( function() {
                        var
                            selected = self.companiesKoTable.getComponentColumnCheckbox().checked();
                        if( 1 === selected.length ) {
                            if( Y.doccirrus.schemas.company.serverTypes.VPRC === selected[0].serverType
                                && Y.doccirrus.auth.isDCPRC() ) {
                                return true;
                            }
                        }
                        return 1 < selected.length;
                    } ) ),
                    click: function() {
                        self.handleActivation( true );
                    }
                }
            } );
            self.deactivate = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'deactivate',
                    text: DEACTIVATE,
                    disabled: self.addDisposable( ko.computed( function() {
                        var
                            selected = self.companiesKoTable.getComponentColumnCheckbox().checked();
                        if( 1 === selected.length ) {
                            if( Y.doccirrus.schemas.company.serverTypes.VPRC === selected[0].serverType
                                && Y.doccirrus.auth.isDCPRC() ) {
                                return true;
                            }
                        }
                        return 1 < selected.length;
                    } ) ),
                    click: function() {
                        self.handleActivation( false );
                    }
                }
            } );
            self.deleteTenantBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'deleteTenant',
                    text: DELETE,
                    click: function() {
                        self.handleDeletion();
                    }
                }
            } );

            self.createTenant = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'createTenant',
                    text: TENANT_NEW,
                    click: function() {
                        self.handleCreation();
                    }
                }
            } );
            self.createMTS = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'createMTS',
                    text: MTS_NEW,
                    click: function() {
                        self.handleCreation();
                    }
                }
            } );

            self.transformToPRCBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'transformToPRC',
                    text: TRANSFORM_TO_PRC,
                    click: function() {
                        self.handleTransformToPRC();
                    },
                    disabled: ko.computed( function() {
                        return 0 === self.companiesKoTable.getComponentColumnCheckbox().checked().length;
                    } )
                }
            } );
        },
        reloadTable: function() {
            var
                self = this;
            self.companiesKoTable.reload();
        },

        showError: function( msg ) {
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: msg
            } );
        },

        showSuccess: function( msg ) {
            Y.doccirrus.DCWindow.notice( {
                type: 'success',
                message: msg
            } );
        },

        setActivation: function( config ) {
            var
                self = this,
                data,
                callback,
                event;
            if( !Y.doccirrus.auth.isVPRCAdmin() ) {
                return;
            }
            config = config || {};
            callback = config.callback;
            if( undefined === config.id ) {
                Y.log( 'Can not set new active status for tenant. Tenant id is missing.', 'error', NAME );
                return callback( 'Tenant id is missing.' );
            }
            if( config.newState ) {
                event = 'crm.activateTenant';
            } else {
                event = 'crm.deactivateTenant';
            }
            data = {
                templateTenantId: config.templateTenantId,
                _id: config.id,
                days: config.days || 0
            };
            if( self.activateCustomerListener ) {
                self.activateCustomerListener.removeEventListener();
            }
            self.activateCustomerListener = Y.doccirrus.communication.request( {
                socket: Y.doccirrus.communication.getSocket( '/' ),
                event: event,
                message: {
                    data: data
                },
                done: function() {
                    callback();
                },
                fail: function( err ) {
                    callback( err );
                }
            } );
        },

        showTrialModal: function( dataArr, callback ) {
            var
                custNoList = [];

            dataArr.forEach( function( data ) {
                custNoList.push( data.dcCustomerNo );
            } );

            Y.doccirrus.modals.trialDaysModal.showDialog( {
                days: 30,
                firstname: Y.doccirrus.auth.getUserName(),
                affectedTenants: custNoList
            }, function( config ) {
                callback( config );
            } );
        },

        handleActivation: function( newActiveState ) {
            var
                self = this,
                selectedTenants = self.companiesKoTable.getComponentColumnCheckbox().checked();

            if ( Y.doccirrus.auth.isDCPRC() ){
                self.handleActivationDCPRC( newActiveState );
                return;
            }

            if( newActiveState ) {
                self.showTrialModal( selectedTenants, function( config ) {
                    self.companiesKoTable.masked( true );
                    var days = config.days,
                        templateTenantId = config.templateTenantId;
                    async.each( selectedTenants, function( tenant, done ) {
                        if( newActiveState === tenant.activeState ) {
                            return done();
                        }
                        self.setActivation( {
                            id: tenant._id,
                            days: days,
                            newState: true,
                            templateTenantId: templateTenantId,
                            callback: done
                        } );
                    }, function( err ) {
                        self.companiesKoTable.masked( false );
                        if( err ) {
                            self.showError( ACTIVATION_FAIL );
                        } else {
                            self.showSuccess( ACTIVATION_SUCCESS );
                            self.reloadTable();
                        }
                    } );

                } );
            } else {
                self.companiesKoTable.masked( true );
                async.each( selectedTenants, function( tenant, done ) {
                    if( newActiveState === tenant.activeState ) {
                        return done();
                    }
                    self.setActivation( { id: tenant._id, days: 0, newState: false, callback: done } );
                }, function( err ) {
                    self.companiesKoTable.masked( false );
                    if( err ) {
                        self.showError( DEACTIVATION_FAIL );
                    } else {
                        self.showSuccess( DEACTIVATION_SUCCESS );
                        self.reloadTable();
                    }
                } );
            }
        },

        handleActivationDCPRC: function( newActiveState ){
            var
                self = this,
                selectedTenants = self.companiesKoTable.getComponentColumnCheckbox().checked(),
                dcCustomerNoArray = [],
                successText = newActiveState ? ACTIVATION_SUCCESS : DEACTIVATION_SUCCESS,
                failureText = newActiveState ? ACTIVATION_FAIL : DEACTIVATION_FAIL;

            selectedTenants.forEach( function(tenant){
                if ( newActiveState !== tenant.activeState ) {
                    dcCustomerNoArray.push( tenant.dcCustomerNo );
                }
            });
            Y.doccirrus.jsonrpc.api.company.activateSystem( {query: { newState: newActiveState, dcCustomerNumbers: dcCustomerNoArray }} )
                .done( function(){
                    self.companiesKoTable.masked( false );
                    self.showSuccess( successText );
                    self.reloadTable();
                } )
                .fail( function( error ) {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: error && error.message || 'Undefined error',
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_SMALL
                        }
                    } );
                    self.showError( failureText );
                } );
        },

        deleteTenant: function( companyId, callback ) {

            if( undefined === companyId ) {
                Y.log( 'Can not delete tenant. Company id is missing.', 'error', NAME );
                return callback( 'company id is missing.' );
            }

            Y.doccirrus.jsonrpc.api.company.deleteTenant( {
                query: {
                    _id: companyId
                }
            } ).done( function() {
                callback();
            } ).fail( function( error ) {
                Y.log( 'Can not delete tenant with id: ' + companyId + '. Error: ' + JSON.stringify( error ), 'error', NAME );
                callback( error );
            } );
        },

        handleDeletion: function() {
            var
                self = this,
                selectedTenants = self.companiesKoTable.getComponentColumnCheckbox().checked();

            function deleteAction() {
                self.companiesKoTable.masked( true );
                async.each( selectedTenants, function( tenant, done ) {
                    self.deleteTenant( tenant._id, done );
                }, function( err ) {
                    self.companiesKoTable.masked( false );
                    if( err ) {
                        self.showError( TENANT_DELETE_FAIL );
                    } else {
                        self.reloadTable();
                        self.showSuccess( TENANT_DELETE_SUCCESS );
                    }
                } );

            }

            if( 0 < selectedTenants.length ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: Y.Lang.sub( TENANT_DELETE_CONFIRM, { amount: selectedTenants.length } ),
                    window: {
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        deleteAction();
                                        this.close();
                                    }
                                } )
                            ]
                        }
                    }

                } );
            } else {
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: SELECT_TENANT
                } );
            }

        },

        handleCreation: function() {
            var
                self = this;
            Y.doccirrus.modals.createTenantModal.showDialog( {
                data: {
                    systemType: Y.doccirrus.auth.isDCPRC() ? Y.doccirrus.schemas.company.systemTypes.APPLIANCE : Y.doccirrus.schemas.company.systemTypes.TRIAL,
                    serverType: Y.doccirrus.schemas.company.serverTypes.VPRC
                }
            }, function( data ) {
                if( !data ) {
                    return;
                }
                Y.doccirrus.jsonrpc.api.company.createTenant( {
                    data: data
                } )
                    .done( function() {
                        self.reloadTable();
                    } )
                    .fail( function( response ) {
                        Y.log( 'Tenant creation failed. Error: ' + JSON.stringify( response.error ), 'error', NAME );
                        self.showError( TENANT_CREATE_FAIL );
                    } );
            } );
        },

        transformToPRC: function( tenants ) {
            return Y.doccirrus.jsonrpc.api.company.transformToPRC( {
                query: {
                    companyIds: tenants.map( function( tenant ) {
                        return tenant._id;
                    } )
                }
            } );
        },

        handleTransformToPRC: function() {
            var
                self = this,
                selectedTenants = self.companiesKoTable.getComponentColumnCheckbox().checked();
            if( 0 < selectedTenants.length ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: TRANSFORM_CONFIRM,
                    window: {
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        var
                                            modal = this;
                                        self.transformToPRC( selectedTenants )
                                            .done( function() {
                                                self.reloadTable();
                                                modal.close();
                                            } )
                                            .fail( function( error ) {
                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                            } );

                                    }
                                } )
                            ]
                        }
                    }

                } );
            }
        }
    } );

    return {
        registerNode: function( node, key, options ) {
            companyListModel = new CompanyListModel( {
                pageData: options.pageData
            } );
            ko.applyBindings( companyListModel, document.querySelector( '#companyListTrial' ) );
        },
        deregisterNode: function() {
            if( companyListModel && companyListModel.destroy ) {
                companyListModel.destroy();
            }

        }
    };
};