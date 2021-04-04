/**
 * User: pi
 * Date: 27/01/15  12:015
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global fun:true, ko, moment */
fun = function _fn( Y ) {
    'use strict';

    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        myVM;

    /**
     *
     * medneo spec for KoTable is:
     *

     Field Name (export file, today),Field Name (to be),Sample
/     Name,organisation,org Maeurer
/     ,organizationId,oaa00090045
/     orderNo,orderNo,eaa63918231
/     ,patientLastName,Tiedge
/     ,patientFirstName,Stefan
/     ,patientDateOfBirth,36302
/     Rechnunsnummern,invoiceId,45654
/     Datum,invoiceDate,42223
/     Kostenträger,payor,AOK Nordost
/     Inkasso,invoiceCashing,MEDNEO
/     Order Acct.,invocieOrderAccounting,INT_SZ
/     Auslagen,agencyCost,
/     Notizen,[not needed],eaa63918231
/     activity-schema.Schein_T.content.i18n,[not needed],eaa63918231
/     activity-schema.Schein_T.comment.i18n,[not needed],Order State: 49
/     billing-schema.Schein_T.code.i18n,billingCodes,"1,47,5353"
     ,costServices,654.32
     ,costDrugs,45.78
     ,costMaterial,3.5
/     Summe,costTotal,703.6

Additional fields:
     Alter,
     Geschlecht,
     Untersuchender Arzt,
     Faktor (liste),
     Begründung (liste),



     */
    function BillingViewModel() {
        var self = this;

        self.billingKoTable = KoComponentManager.createComponent( {
            componentType: 'KoTable',
            componentConfig: {
                stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-billingKoTable',
                states: ['limit'],
                fillRowsToLimit: false,
                remote: true,
                rowPopover: false,
                proxy: Y.doccirrus.jsonrpc.api.billing.read,
                columns: [
                    {
                        componentType: 'KoTableColumnCheckbox',
                        forPropertyName: 'select',
                        label: ''
                    },
                    {
                        forPropertyName: 'practiceName',
                        label: 'organisation',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'practiceId',
                        label: 'organizationId',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'orderNo',
                        label: 'orderNo',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'patientLastName',
                        label: 'patientLastName',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'patientFirstName',
                        label: 'patientFirstName',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'patientAge',
                        label: 'patientAge',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'patientGender',
                        label: 'patientGender',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'patientDOB',
                        label: 'patientDateOfBirth',
                        renderer: function( meta ) {
                            var data = meta.row;
                            return moment( data.patientDOB ).format( 'YYYY-MM-DD' );
                        },
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'employeeName',
                        label: 'employeeName',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'invoiceNo',
                        label: 'invoiceId',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'status',
                        label: 'status',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'timestamp',
                        label: 'invoiceDate',
                        renderer: function( meta ) {
                            var data = meta.row;
                            return moment( data.timestamp ).format( 'YYYY-MM-DD' );
                        },
                        isSortable: true,
                        direction: 'DESC',
                        isFilterable: true,
                        queryFilterType: Y.doccirrus.DCQuery.DATE_RANGE_OPERATOR,
                        filterField: {
                            componentType: 'KoSchemaValue',
                            componentConfig: {
                                fieldType: 'DateRange',
                                showLabel: false,
                                isOnForm: false,
                                required: false,
                                placeholder: 'invoiceDate',
                                autoCompleteDateRange: true
                            }
                        }
                    },
                    {
                        forPropertyName: 'insuranceName',
                        label: 'payor',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'debtCollection',
                        label: 'invoiceCashing',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'orderAccounting',
                        label: 'invoiceOrderAccounting',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'agencyCost',
                        label: 'agencyCost',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'order',
                        label: 'order',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'billingCodes',
                        label: 'billingCodes',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'factors',
                        label: 'factors',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'explanations',
                        label: 'explanations',
                        isSortable: true,
                        isFilterable: true
                    },
                    {
                        forPropertyName: 'drugCost',
                        label: 'costDrugs',
                        isSortable: true,
                        renderer: function( meta ) {
                            return Y.doccirrus.comctl.numberToLocalString( meta.row.drugCost );
                        },
                        direction: 'DESC',
                        isFilterable: false,
                        queryFilterType: Y.doccirrus.DCQuery.GT_OPERATOR
                    },
                    {
                        forPropertyName: 'matCost',
                        label: 'costMaterials',
                        isSortable: true,
                        renderer: function( meta ) {
                            return Y.doccirrus.comctl.numberToLocalString( meta.row.matCost );
                        },
                        direction: 'DESC',
                        isFilterable: false,
                        queryFilterType: Y.doccirrus.DCQuery.GT_OPERATOR
                    },
                    {
                        forPropertyName: 'treatCost',
                        label: 'costServices',
                        isSortable: true,
                        renderer: function( meta ) {
                            return Y.doccirrus.comctl.numberToLocalString( meta.row.treatCost );
                        },
                        direction: 'DESC',
                        isFilterable: false,
                        queryFilterType: Y.doccirrus.DCQuery.GT_OPERATOR
                    },
                    {
                        forPropertyName: 'totalCost',
                        label: 'costTotal',
                        isSortable: true,
                        renderer: function( meta ) {
                            return Y.doccirrus.comctl.numberToLocalString( meta.row.totalCost );
                        },
                        direction: 'DESC',
                        isFilterable: false,
                        queryFilterType: Y.doccirrus.DCQuery.GT_OPERATOR
                    }
                ]
            }
        } );

        self.exportCSV = function() {
            var
                filters = myVM.billingKoTable.filterParams(),
                params = {
                    query: filters,
                    options: {sort: {}, select: {}}};

            Y.doccirrus.comctl.privatePost( '/1/billing/:exportDataTable', params, function doDownload( error, body ) {
                var
                    zipId = body && body.data && body.data.zipId,
                    downloadUrl = Y.doccirrus.infras.getPrivateURL( '/zip/' + zipId + '.zip?ext=csv' );

                if( zipId ) {
                    window.open( downloadUrl );
                }
            } );
        };

    }

    return {
        registerNode: function() {
            myVM = new BillingViewModel();
            ko.applyBindings( myVM, document.querySelector( '#billing' ) );
        }
    };
};