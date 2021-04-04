/**
 * User: pi
 * Date: 08/07/16  15:30
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global fun:true, ko, moment */
/*exported fun */

fun = function _fn( Y, NAME ) {
    'use strict';
    var
        companyListModel;

    function CompanyListModel( config ) {
        var self = this,
            i18n = Y.doccirrus.i18n,
            CONTACT = i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' ),
            APPLIANCE_NEW = i18n( 'CRMMojit.crm_companies_tabJS.message.APPLIANCE_NEW' ),
            TENANT_CREATE_FAIL = i18n( 'CRMMojit.crm_companies_tabJS.message.TENANT_CREATE_FAIL' ),
            ACTIVATE = i18n( 'CRMMojit.companiesbrowser.button.ACTIVATE' ),
            DEACTIVATE = i18n( 'CRMMojit.companiesbrowser.button.DEACTIVATE' ),
            COMPANY_NAME = i18n( 'person-schema.Company_T.coname' ),
            COMPANY_TYPE = i18n( 'person-schema.Company_T.cotype' ),
            CUSTOMER_NUMBER = i18n( 'customer-schema.base.customerNo.i18n' ),
            DC_CUSTOMER_NUMBER = i18n( 'customer-schema.base.dcCustomerNo.i18n' ),
            CENTRAL_CONTACT = i18n( 'customer-schema.base.centralContact.i18n' ),
            TENANT_ID = i18n( 'customer-schema.base.tenantId.i18n' ),
            SYSTEM_ID = i18n( 'customer-schema.base.systemId.i18n' ),
            ACTIVE_STATUS = i18n( 'customer-schema.base.activeState.i18n' ),
            RELEASE_GROUP = i18n( 'customer-schema.base.releaseGroup.i18n' ),
            VERSION = i18n( 'customer-schema.base.version.i18n' ),
            ACTIVATION_SUCCESS = i18n( 'CRMMojit.crm_companies_tabJS.message.ACTIVATION_SUCCESS' ),
            ACTIVATION_FAIL = i18n( 'CRMMojit.crm_companies_tabJS.message.ACTIVATION_FAIL' ),
            DEACTIVATION_SUCCESS = i18n( 'CRMMojit.crm_companies_tabJS.message.DEACTIVATION_SUCCESS' ),
            DEACTIVATION_FAIL = i18n( 'CRMMojit.crm_companies_tabJS.message.DEACTIVATION_FAIL' ),
            PROD_SERVICES = i18n( 'customer-schema.base.prodServices.i18n' ),
            REGISTERED = i18n( 'CRMMojit.crm_companies_tabJS.title.REGISTERED' ),
            ACTIVATED = i18n( 'CRMMojit.crm_companies_tabJS.title.ACTIVATED' ),
            END = i18n( 'CRMMojit.crm_companies_tabJS.title.END' ),
            CONFIRMED = i18n( 'contact-schema.Contact_T.confirmed.i18n' ),
            SPECIAL_MODULES = i18n('licenseManager.specialModules.i18n'),
            BASE_SYSTEM_LEVEL = i18n('licenseManager.baseSystemLevel.i18n'),
            BASE_SERVICES = i18n('licenseManager.baseServices.i18n'),
            ADDITIONAL_SERVICES = i18n('licenseManager.additionalServices.i18n'),
            SUPPORT_LEVEL = i18n('licenseManager.supportLevel.i18n'),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            pageData = config.pageData;

        self.reloadTable = function() {
            var
                self = this;
            self.companiesKoTable.reload();
        };

        self.showError = function( msg ) {
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: msg
            } );
        };

        self.showSuccess = function( msg ) {
            Y.doccirrus.DCWindow.notice( {
                type: 'success',
                message: msg
            } );
        };

        self.handleCreation = function() {
            var
                self = this;
            Y.doccirrus.modals.createTenantModal.showDialog( {
                data: {
                    systemType: Y.doccirrus.schemas.company.systemTypes.APPLIANCE,
                    serverType: Y.doccirrus.schemas.company.serverTypes.PRC
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
        };

        self.companiesKoTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                stateId: 'CRMMojit-CompaniesTabPRC-companiesKoTable',
                states: ['limit'],
                fillRowsToLimit: false,
                remote: true,
                rowPopover: false,
                proxy: Y.doccirrus.jsonrpc.api.company.getCentralContact,
                baseParams: {
                    query: {
                        systemType: Y.doccirrus.schemas.company.systemTypes.APPLIANCE,
                        serverType: Y.doccirrus.schemas.company.serverTypes.PRC
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
                        forPropertyName: 'systemId',
                        label: SYSTEM_ID,
                        title: SYSTEM_ID,
                        isFilterable: true,
                        isSortable: true,
                        width: '16%',
                        filterBy: function( row ) {
                            var value = this.filterField.value();
                            return row.systemId.indexOf( value ) > -1;
                        }
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
                                    switch( services[i].ps ) {
                                        case 'MISCORE':
                                            servicesString += 'M ';
                                            break;
                                        case 'NEWSLETTER':
                                            servicesString += 'N ';
                                            break;
                                        case 'VPRC':
                                            if( Y.doccirrus.schemas.company.isTemplate( services[i] ) ) {
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
                    },
                    {
                        forPropertyName: 'releaseGroup',
                        label: RELEASE_GROUP,
                        title: RELEASE_GROUP,
                        isFilterable: true,
                        isSortable: true,
                        visible: false,
                        queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                        width: '7%',
                        renderer: function( meta ) {
                            var group = meta.value;
                            return group || '';
                        }
                    },
                    {
                        forPropertyName: 'version',
                        label: VERSION,
                        title: VERSION,
                        isFilterable: true,
                        isSortable: true,
                        visible: false,
                        width: '7%',
                        renderer: function( meta ) {
                            var version = meta.value;
                            return version || '';
                        }
                    },
                    {
                        forPropertyName: 'licenseScope.0.specialModules',
                        label: SPECIAL_MODULES,
                        title: SPECIAL_MODULES,
                        isFilterable: true,
                        width: '12%',
                        visible: false,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: Y.doccirrus.schemas.settings.licenseSchema.specialModules_E.list,
                            optionsText: 'i18n',
                            optionsValue: 'val'
                        },
                        renderer: function( meta ) {
                            var specialModules = meta.value;

                            if( specialModules ) {
                                specialModules = specialModules.map( function( item ) {
                                    return i18n( 'licenseManager.specialModules.' + item );
                                } ).join( ', ' );
                                return specialModules;
                            }
                            return '';
                        }
                    },
                    {
                        forPropertyName: 'licenseScope.0.doctorsAmount',
                        label: BASE_SYSTEM_LEVEL,
                        title: BASE_SYSTEM_LEVEL,
                        isFilterable: true,
                        isSortable: true,
                        width: '12%',
                        visible: false,
                        renderer: function( meta ) {
                            var doctorsAmount = meta.value;

                            if( '0' === doctorsAmount ) {
                                return '';
                            }
                            return doctorsAmount;
                        }
                    },
                    {
                        forPropertyName: 'licenseScope.0.baseServices',
                        label: BASE_SERVICES,
                        title: BASE_SERVICES,
                        isFilterable: true,
                        width: '12%',
                        visible: false,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: Y.doccirrus.schemas.settings.licenseSchema.baseServices_E.list,
                            optionsText: 'i18n',
                            optionsValue: 'val'
                        },
                        renderer: function( meta ) {
                            var baseServices = meta.value;

                            if( baseServices ) {
                                baseServices = baseServices.map( function( item ) {
                                    return i18n( 'licenseManager.baseServices.' + item );
                                } ).join( ', ' );
                                return baseServices;
                            }
                            return '';
                        }
                    },
                    {
                        forPropertyName: 'licenseScope.0.additionalServices',
                        label: ADDITIONAL_SERVICES,
                        title: ADDITIONAL_SERVICES,
                        isFilterable: true,
                        width: '12%',
                        visible: false,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: Y.doccirrus.schemas.settings.licenseSchema.additionalServices_E.list,
                            optionsText: 'i18n',
                            optionsValue: 'val'
                        },
                        renderer: function( meta ) {
                            var additionalServices = meta.value;

                            if( additionalServices ) {
                                additionalServices = additionalServices.map( function( item ) {
                                    return i18n( 'licenseManager.additionalServices.' + item );
                                } ).join( ', ' );
                                return additionalServices;
                            }
                            return '';
                        }
                    },
                    {
                        forPropertyName: 'licenseScope.0.supportLevel',
                        label: SUPPORT_LEVEL,
                        title: SUPPORT_LEVEL,
                        isFilterable: true,
                        width: '12%',
                        visible: false,
                        queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                        filterField: {
                            componentType: 'KoFieldSelect2',
                            options: Y.doccirrus.schemas.settings.licenseSchema.supportLevel_E.list,
                            optionsText: 'i18n',
                            optionsValue: 'val'
                        },
                        renderer: function( meta ) {
                            var supportLevel = meta.value;

                            if( supportLevel ) {
                                return i18n( 'licenseManager.supportLevel.' + supportLevel );
                            }
                            return '';
                        }
                    },
                    {
                        forPropertyName: '',
                        label: i18n( 'CRMMojit.crm_companies_tabJS.title.GRAPHANA' ),
                        title: i18n( 'CRMMojit.crm_companies_tabJS.title.GRAPHANA' ),
                        width: '12%',
                        isSortable: false,
                        isFilterable: false,
                        renderer: function( meta ) {
                            var
                                data = meta.row;

                            if( data.systemId ) {
                                return Y.Lang.sub('<a href="{href}" target="_blank">{text}</a>', {
                                    text: 'Link',
                                    href: "https://server-metrics.intra.doc-cirrus.com/d/000000001/appliance-metrics?var-serial="+data.systemId
                                });
                            } else {
                                return null;
                            }
                        },
                        onCellClick: function ( ) {
                            return false;
                        }
                    }
                ],
                onRowClick: function( meta ) {
                    var data = meta.row;
                    pageData.prevTab = '/crm#/companies_tab_prc';
                    window.open( '/crm#/company_tab/' + data._id, '_self' );
                }
            }
        } );

        self.createTenant = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'createTenant',
                text: APPLIANCE_NEW,
                click: function() {
                    self.handleCreation();
                }
            }
        } );
        self.activate = KoComponentManager.createComponent( {
            componentType: 'KoButton',
            componentConfig: {
                name: 'activate',
                text: ACTIVATE,
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
                click: function() {
                    self.handleActivation( false );
                }
            }
        } );

        self.handleActivation = function ( newActiveState )
        {
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
        };

        self.showTrialModal = function( dataArr, callback ) {
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
        };


    }

    return {
        registerNode: function( node, key, options ) {
            companyListModel = new CompanyListModel( {
                pageData: options.pageData
            } );
            ko.applyBindings( companyListModel, document.querySelector( '#companyListPrc' ) );
        },
        deregisterNode: function() {
        }
    };
};