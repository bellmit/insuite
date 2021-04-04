/*global fun:true, ko*/
fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var contactListModel,
        i18n = Y.doccirrus.i18n,
        CONTACT = i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' ),
        FIRSTNAME = i18n( 'person-schema.Person_T.firstname.i18n' ),
        REGISTERED = i18n( 'CRMMojit.crm_companies_tabJS.title.REGISTERED' ),
        ACTIVE_STATUS = i18n( 'customer-schema.base.activeState.i18n' ),
        COMPANY_NAME = i18n( 'CRMMojit.crm_contacts_tab.title.COMPANY_NAME' ),
        CUSTOMER_NUMBER = i18n( 'customer-schema.base.customerNo.i18n' ),
        LASTNAME = i18n( 'person-schema.Person_T.lastname.i18n' );

    function ContactListModel( config ) {
        var self = this,
            pageData = config.pageData,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;
        Y.doccirrus.uam.ViewModel.mixDisposable( self );
        self.contactsKoTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                stateId: 'CRMMojit-PatientsTab-contactsKoTable',
                states: ['limit'],
                fillRowsToLimit: false,
                remote: true,
                rowPopover: false,
                proxy: Y.doccirrus.jsonrpc.api.contact.getNonPatient,
                columns: [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'checked',
                        label: ''
                    },
                    {
                        forPropertyName: 'firstname',
                        label: FIRSTNAME,
                        title: FIRSTNAME,
                        isFilterable: true,
                        width: '20%'
                    },
                    {
                        forPropertyName: 'lastname',
                        label: LASTNAME,
                        title: LASTNAME,
                        isFilterable: true,
                        width: '20%'
                    },
                    {
                        forPropertyName: 'communications.0.value',
                        label: CONTACT,
                        title: CONTACT,
                        width: '20%',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: '_id',
                        label: REGISTERED,
                        title: REGISTERED,
                        width: '18%',
                        renderer: function( meta ) {
                            var format = '%d.%m.%Y',
                                value = meta.value;
                            return Y.Date.format( Y.doccirrus.commonutils.dateFromObjectId( value ), {format: format} );
                        }
                    },
                    {
                        forPropertyName: 'customerNo',
                        label: CUSTOMER_NUMBER,
                        title: CUSTOMER_NUMBER,
                        isFilterable: true,
                        width: '14%',
                        renderer: function( meta ){
                            var customerNums = meta.value;
                            if( customerNums ) {
                                return customerNums.join( ', ' );
                            }
                            return '';
                        }
                    },
                    {
                        forPropertyName: 'coname',
                        isFilterable: true,
                        label: COMPANY_NAME,
                        title: COMPANY_NAME,
                        width: '13%',
                        renderer: function( meta ){
                            var conames = meta.value;
                            if( conames ) {
                                return conames.join( ', ' );
                            }
                            return '';
                        }
                    },
                    {
                        forPropertyName: 'activeState',
                        label: ACTIVE_STATUS,
                        title: ACTIVE_STATUS,
                        width: '10%',
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                        renderer: function( meta ) {
                            var status = meta.value,
                                icon = ( status ) ? '<i class="fa fa-check"></i>' : '<i class="fa fa-times"></i>';
                            return icon;
                        }
                    }
                ],
                onRowClick: function( meta ) {
                    var data = meta.row;
                    pageData.prevTab = '/crm#/centralcontacts_tab';
                    window.open( '/crm#/contact_tab/' + data._id, '_self' );
                }
            }
        } );
    }

    return {
        registerNode: function( node, key, options ) {
            contactListModel = new ContactListModel( {
                pageData: options.pageData
            } );
            ko.applyBindings( contactListModel, document.querySelector( '#contactList' ) );
        },
        deregisterNode: function() {
            if( contactListModel && contactListModel._dispose ) {
                contactListModel._dispose();
            }

        }
    };
};