/**
 * User: pi
 * Date: 13/05/15  16:18
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global fun:true, ko, $ */
/*exported fun */
fun = function _fn( Y, NAME ) {
    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        SAVE = i18n( 'general.button.SAVE' ),
        BACK = i18n( 'general.button.BACK' ),
        INIT = i18n( 'CRMMojit.crm_company_browser_tab.button.INIT' ),
        PLEASE_SELECT = i18n( 'CRMMojit.crm_companies_tabJS.message.SELECT_CONTACT' ),
        //SAVE_SUCCESS = i18n( 'CRMMojit.crm_company_browser_tabJS.message.SAVE_SUCCESS' ),
        SAVE_FAIL = i18n( 'CRMMojit.crm_company_browser_tabJS.message.SAVE_FAIL' ),
        INIT_SCRIPT_FAIL = i18n( 'CRMMojit.crm_company_browser_tabJS.message.INIT_SCRIPT_FAIL' ),
        COMPANY_NAME = i18n( 'person-schema.Company_T.coname' ),
        COMPANY_TYPE = i18n( 'person-schema.Company_T.cotype' ),
        DCCUSTOMER_NUMBER = i18n( 'customer-schema.base.dcCustomerNo.i18n' ),
        SYSTEM_ID = i18n( 'customer-schema.base.systemId.i18n' ),
        CUSTOMER_NUMBER = i18n( 'customer-schema.base.customerNo.i18n' ),
        CENTRAL_CONTACT = i18n( 'customer-schema.base.centralContact.i18n' ),
        TENANT_ID = i18n( 'customer-schema.base.tenantId.i18n' ),
        URL = '.hub.doc-cirrus.com',
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        crmCompanyBrowserModel,
        KoComponentManager = KoUI.KoComponentManager,
        Disposable = KoViewModel.getDisposable(),
        mongoScript;

    function CRMCompanyBrowserModel() {
        CRMCompanyBrowserModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( CRMCompanyBrowserModel, Disposable, {
        initializer: function CRMCompanyBrowserModel_initializer() {
            var
                self = this;
            self.initCRMCompanyBrowserModel();
        },
        destructor: function CRMCompanyBrowserModel_destructor() {
            var
                self = this;
            self.companyModel.destroy();
            self.centralContactModel.destroy();
            self.supportContactModel.destroy();
        },
        initCRMCompanyBrowserModel: function CRMCompanyBrowserModel_initCRMCompanyBrowserModel() {
            var
                self = this,
                companyData = self.get( 'company' ),
                centralContactData = self.get( 'centralContact' ),
                supportContactData = self.get( 'supportContact' );

            self.tabCompanyI18n = i18n('CRMMojit.crm_navJS.title.TAB_COMPANY');
            self.selectGroupI18n = i18n( 'CRMMojit.crm_release_group_tab.label.SELECT_GROUP' );
            self.useAsTemplateI18n = i18n('CRMMojit.crm_company_browser_tab.title.USE_AS_TEMPLATE');
            self.titleFromI18n = i18n('general.title.FROM');
            self.titleToI18n = i18n('general.title.TO');
            self.centralContactI18n = i18n('customer-schema.base.centralContact.i18n');
            self.supportContactI18n = i18n('customer-schema.base.supportContact.i18n');
            self.workingAtI18n = i18n('person-schema.Person_T.workingAt');
            self.licenseScopeI18n = i18n('customer-schema.base.licenseScope.i18n');
            self.baseSystemLevelI18n = i18n('CRMMojit.crm_company_browser_tab.title.BASE_SYSTEM_LEVEL');
            self.baseSystemLevelNoteI18n = i18n('CRMMojit.crm_company_browser_tab.title.BASE_SYSTEM_LEVEL_NOTE');
            self.titleTenantsI18n = i18n('CRMMojit.crm_company_browser_tab.title.TENANTS');
            self.titleComI18n = i18n('InCaseMojit.communication_item.title.TITLE_COM');

            self.systemIdUrl = ko.computed( function() {
                return companyData.systemId ? 'https://' + companyData.systemId + URL : '';
            } );

            self.companyModel = KoViewModel.createViewModel( {
                NAME: 'CompanyModel',
                config: { data: companyData, appTokens: self.get( 'appTokens' ) }
            } );
            self.centralContactModel = KoViewModel.createViewModel( {
                NAME: 'ContactModel',
                config: { data: centralContactData }
            } );
            self.supportContactModel = KoViewModel.createViewModel( {
                NAME: 'SupportBaseContactModel',
                config: { data: supportContactData }
            } );
            self.isPRC = self.companyModel.serverType() === Y.doccirrus.schemas.company.serverTypes.PRC;
            self.isISD = self.companyModel.serverType() === Y.doccirrus.schemas.company.serverTypes.ISD;
            self.isVPRC = self.companyModel.serverType() === Y.doccirrus.schemas.company.serverTypes.VPRC;

            self.isDCPRC_MTS = !( self.isPRC || self.isISD ) && ( Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isDCPRC() );

            self.isAPPLIANCE = self.companyModel.systemType() === Y.doccirrus.schemas.company.systemTypes.APPLIANCE;

            self.initTenantsTable();
            self.initButtons();
            self.initSelect2SupportContact();

            $('[data-toggle="popover"]').popover();
        },
        contactToSelec2: function CRMCompanyBrowserModel_contactToSelec2( contact ) {
            if( !contact || !contact._id ) {
                return null;
            }
            return {
                id: contact._id,
                text: contact.firstname + ' ' + contact.lastname,
                data: contact
            };
        },
        initSelect2SupportContact: function CRMCompanyBrowserModel_initSelect2SupportContact() {
            var
                self = this,
                selectedContact = self.contactToSelec2( self.supportContactModel.toJSON() ),
                emptyContact = {
                    _id: null
                },
                v_supportcontact = Y.doccirrus.schemas.v_supportcontact,
                defaults = self.supportContactModel.get( 'defaults' );
            Object.keys( v_supportcontact.schema ).forEach( function( key ) {
                if( 'undefined' !== typeof defaults[ key ] ) {
                    emptyContact[ key ] = defaults[ key ];
                } else {
                    emptyContact[ key ] = null;
                }
            } );

            self.select2SupportContact = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        return selectedContact;
                    },
                    write: function( $event ) {
                        self.supportContactModel.set( 'data', ($event.added && $event.added.data) || emptyContact );
                        self.companyModel.supportContact( $event.val || null );
                        selectedContact = $event.added;

                    }
                } ) ),
                select2: {
                    width: '100%',
                    allowClear: true,
                    minimumInputLength: 1,
                    placeholder: PLEASE_SELECT,
                    query: function( query ) {
                        var
                            basecontactSchema = Y.doccirrus.schemas.basecontact,
                            term = query.term;

                        Y.doccirrus.jsonrpc.api.basecontact.searchContact( {
                            query: {
                                baseContactType: basecontactSchema.baseContactTypes.SUPPORT,
                                term: term
                            }
                        } )
                            .done( function( response ) {
                                var data = response.data;
                                data = data.map( self.contactToSelec2 );
                                query.callback( {
                                    results: data
                                } );
                            } );
                    }
                }
            };
        },
        showScriptModal: function() {
            var
                bodyContent = Y.Node.create( '<pre>' + mongoScript + '</pre>' ),
                modal; //eslint-disable-line no-unused-vars
            modal = new Y.doccirrus.DCWindow( {
                className: 'DCWindow-Appointment',
                bodyContent: bodyContent,
                title: 'INIT SCRIPT',
                icon: Y.doccirrus.DCWindow.ICON_INFO,
                width: Y.doccirrus.DCWindow.SIZE_LARGE,
                height: Y.doccirrus.DCWindow.SIZE_LARGE,
                fitOnViewPortResize: !Y.UA.touchEnabled, // for non touch devices to handle complete visibility of dialog for small screens, eg: mac-book
                minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                centered: true,
                modal: true,
                render: document.body,
                buttons: {
                    header: [ 'close' ],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'CANCEL' )
                    ]
                },
                after: {
                    visibleChange: function( event ) {
                        if( !event.newVal ) {
                            ko.cleanNode( bodyContent.getDOMNode() );
                        }
                    }
                }

            } );
        },
        tenantsTable: null,
        initTenantsTable: function CRMCompanyBrowserModel_initTenantsTable() {
            var self = this;

            self.tenantsTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'CRMMojit-CompanyBrowserTab-tenantsTable',
                    states: [ 'limit' ],
                    fillRowsToLimit: false,
                    rowPopover: false,
                    data: self.companyModel.tenants().map( function( tenant ) {
                        if( 'object' !== typeof tenant.centralContact ) {
                            tenant.centralContact = ' ';
                        }
                        return tenant.toJSON();
                    } ),
                    columns: [
                        {
                            forPropertyName: 'coname',
                            label: COMPANY_NAME,
                            title: COMPANY_NAME,
                            isFilterable: true,
                            isSortable: true,
                            width: '17%',
                            filterBy: function( row ) {
                                var value = this.filterField.value();
                                return row.coname.toLowerCase().indexOf( value.toLowerCase() ) > -1;
                            }
                        },
                        {
                            forPropertyName: 'dcCustomerNo',
                            label: DCCUSTOMER_NUMBER,
                            title: DCCUSTOMER_NUMBER,
                            isFilterable: true,
                            isSortable: true,
                            width: '16%',
                            filterBy: function( row ) {
                                var value = this.filterField.value();
                                return row.dcCustomerNo.indexOf( value ) > -1;
                            }
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
                            width: '16%',
                            filterBy: function( row ) {
                                var value = this.filterField.value();
                                return row.customerNo.indexOf( value ) > -1;
                            }
                        },
                        {
                            forPropertyName: 'tenantId',
                            label: TENANT_ID,
                            title: TENANT_ID,
                            isFilterable: true,
                            isSortable: true,
                            width: '17%',
                            filterBy: function( row ) {
                                var value = this.filterField.value();
                                return row.tenantId.indexOf( value ) > -1;
                            }
                        },
                        {
                            forPropertyName: 'centralCont',
                            label: CENTRAL_CONTACT,
                            title: CENTRAL_CONTACT,
                            width: '17%',
                            isFilterable: true,
                            isSortable: true,
                            renderer: function( meta ) {
                                var tenant = meta.row,
                                    first = tenant.centralContact && tenant.centralContact.firstname || '',
                                    last = tenant.centralContact && tenant.centralContact.lastname || '';

                                if( !tenant.centralContact ) {
                                    return '';
                                }

                                return first + ' ' + last;
                            },
                            filterBy: function( row ) {
                                var value = this.filterField.value(),
                                    contact = row.centralContact,
                                    first = contact && contact.firstname || '',
                                    last = contact && contact.lastname || '',
                                    result = first + ' ' + last;
                                return result.toLowerCase().indexOf( value.toLowerCase() ) > -1;
                            },
                            sortBy: function( aRow, bRow ) {

                                var
                                    aString = (aRow.centralContact && aRow.centralContact.firstname || '') + ' ' + (aRow.centralContact && aRow.centralContact.lastname || ''),
                                    bString = (bRow.centralContact && bRow.centralContact.firstname || '') + ' ' + (bRow.centralContact && bRow.centralContact.lastname || '');
                                return KoUI.utils.String.comparators.natural( aString, bString );
                            }
                        },
                        {
                            forPropertyName: 'cotype',
                            label: COMPANY_TYPE,
                            title: COMPANY_TYPE,
                            isFilterable: true,
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.company.types.CompanyType_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            width: '17%'
                        }
                    ],
                    selectMode: 'none'
                }
            } );

        },
        initButtons: function CRMCompanyBrowserModel_initButtons() {
            var self = this,
                pageData = self.get( 'pageData' );

            self.initScript = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'initScript',
                    text: INIT,
                    click: function() {
                        let companyData = self.companyModel.toJSON();
                        Y.doccirrus.jsonrpc.api.company.generateScript( {
                            data: self.centralContactModel.toJSON(),
                            query: {
                                _id: companyData._id
                            }
                        } ).done( function( response ) {
                            mongoScript = response.data;
                            self.showScriptModal();
                        } ).fail( function( error ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: INIT_SCRIPT_FAIL + "\nReason: " + error
                            } );
                        } );
                    }
                }
            } );

            self.goBackBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'goBackBtn',
                    text: BACK,
                    click: function() {
                        if( pageData.prevTab ) {
                            window.open( pageData.prevTab, '_self' );
                        } else {
                            window.open( '/crm', '_self' );
                        }

                    }
                }
            } );

            self.saveCompany = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: SAVE,
                    option: 'PRIMARY',
                    disabled: self.addDisposable( ko.computed( function() {
                        return !self.companyModel._isValid();
                    } ) ),
                    text: SAVE,
                    click: function() {
                        let companyData;
                        if( self.companyModel._isValid() ) {
                            companyData = self.companyModel.toJSON();
                            Y.doccirrus.jsonrpc.api.company.update( {
                                query: {
                                    _id: companyData._id
                                },
                                data: companyData,
                                fields: Object.keys( companyData )
                            } )
                                .done( function() {
                                    self.goBackBtn.click();
                                } )
                                .fail( function() {
                                    Y.doccirrus.DCWindow.notice( {
                                        type: 'error',
                                        message: SAVE_FAIL
                                    } );
                                } );
                        }
                    }
                }
            } );

        }
    }, {
        ATTRS: {
            company: {
                value: {},
                lazyAdd: false
            },
            centralContact: {
                value: {},
                lazyAdd: false
            },
            supportContact: {
                value: {},
                lazyAdd: false
            },
            pageData: {
                value: {},
                lazyAdd: false
            },
            appTokens: {
                value: [],
                lazyAdd: false
            }
        }
    } );

    return {
        registerNode: function( node, key, options ) {
            function loadData( companyId, callback ) {

                Y.log( 'Loading company data', 'debug', NAME );
                if( !companyId ) {
                    Y.log( ' Can not load company. CompanyId is missing', 'debug', NAME );
                    return callback( ' Can not load company. CompanyId is missing' );
                }
                Y.doccirrus.jsonrpc.api.company.getDataForCompanyBrowser( {
                    query: {
                        _id: companyId
                    }
                } )
                    .done( function( response ) {
                        var data = response && response.data;
                        if( data ) {
                            Y.log( 'Loaded company, id: ' + data.companyData && data.companyData._id, 'debug', NAME );
                            return callback( null, data );
                        }

                        Y.log( 'Company with id: ' + companyId + ', not found', 'debug', NAME );
                        callback( 'Company with id: ' + companyId + ', not found' );
                    } )
                    .fail( function( response ) {
                        Y.log( 'Could not load company with id: ' + companyId + '. Error: ' + JSON.stringify( response.error ), 'debug', NAME );
                        callback( response.error );
                    } );

            }

            function init( data ) {
                var
                    companyData = data && data.companyData,
                    appTokens = data && data.appTokens;
                crmCompanyBrowserModel = new CRMCompanyBrowserModel( {
                    company: companyData.company,
                    centralContact: companyData.centralContact || {},
                    supportContact: companyData.supportContact || {},
                    pageData: options.pageData,
                    appTokens: appTokens
                } );

                ko.applyBindings( crmCompanyBrowserModel, node.getDOMNode() );
            }

            loadData( options.pageData.companyId, function( err, data ) {
                if( !err ) {
                    init( data );
                }
                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
            } );
        },
        deregisterNode: function() {
            if( crmCompanyBrowserModel && crmCompanyBrowserModel.destroy ) {
                crmCompanyBrowserModel.destroy();
            }

        }
    };
};