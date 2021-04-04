/**
 * User: pi
 * Date: 05/06/15  17:26
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global fun:true, ko, moment*/
fun = function _fn( Y ) {
    'use strict';

    var deletedListModel,
        i18n = Y.doccirrus.i18n,
        CONTACT = i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' ),
        COMPANY_NAME = i18n( 'person-schema.Company_T.coname' ),
        COMPANY_TYPE = i18n( 'person-schema.Company_T.cotype' ),
        MEDNEO_ID = i18n( 'person-schema.Company_T.medneoId' ),
        CUSTOMER_NUMBER = i18n( 'customer-schema.base.customerNo.i18n' ),
        CENTRAL_CONTACT = i18n( 'customer-schema.base.centralContact.i18n' ),
        TENANT_ID = i18n( 'customer-schema.base.tenantId.i18n' ),
        ACTIVE_STATUS = i18n( 'customer-schema.base.activeState.i18n' ),
        PROD_SERVICES = i18n( 'customer-schema.base.prodServices.i18n' ),
        REGISTERED = i18n( 'CRMMojit.crm_companies_tabJS.title.REGISTERED' ),
        ACTIVATED = i18n( 'CRMMojit.crm_companies_tabJS.title.ACTIVATED' ),
        END = i18n( 'CRMMojit.crm_companies_tabJS.title.END' ),
        CONFIRMED = i18n( 'contact-schema.Contact_T.confirmed.i18n' );

    function DeletedListModel(){
        var self = this,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;
        Y.doccirrus.uam.ViewModel.mixDisposable( self );
        self.deletedKoTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                stateId: 'CRMMojit-DeletedTab-deletedKoTable',
                states: ['limit'],
                fillRowsToLimit: false,
                remote: true,
                rowPopover: false,
                baseParams: {
                    query: {
                        deleted: true
                    }
                },
                proxy: Y.doccirrus.jsonrpc.api.company.getCentralContact,
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
                        forPropertyName: 'customerNo',
                        isFilterable: true,
                        isSortable: true,
                        label: CUSTOMER_NUMBER,
                        title: CUSTOMER_NUMBER,
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
                        forPropertyName: 'medneoId',
                        label: MEDNEO_ID,
                        title: MEDNEO_ID,
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
                            var
                                data = meta.row,
                                deletedName = data.deletedName || '';

                            return deletedName;
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
                                servicesString = '';
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
                                        case 'INTIMECONNECT':
                                            servicesString += 'IC ';
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
                ]
            }
        } );

    }

    return {
        registerNode: function( /*node, key, options*/ ) {
            deletedListModel = new DeletedListModel();
            ko.applyBindings( deletedListModel, document.querySelector( '#deletedList' ) );
        },
        deregisterNode: function() {
            if( deletedListModel && deletedListModel._dispose ) {
                deletedListModel._dispose();
            }

        }
    };
};