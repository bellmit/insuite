/**
 * User: pi
 * Date: 16/08/16  10:55
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*exported _fn */
/*global ko, moment */
function _fn( Y/*, NAME*/ ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable();

    function ASVBrowserModel( config ) {
        ASVBrowserModel.superclass.constructor.call( this, config );
    }

    Y.extend( ASVBrowserModel, Disposable, {
        initializer: function ASVBrowserModel_initializer() {
            var
                self = this;
            self.initASVBrowserModel();
        },
        destructor: function ASVBrowserModel_destructor() {

        },
        makeURL: function ASVBrowserModel_( id ) {
            var
                url = '/media/' + id + '_original';
            url = Y.doccirrus.infras.getPrivateURL( url );
            return '<a target="_blank" href="' + url + '">' + name + '</a> &nbsp';
        },
        initASVBrowserModel: function ASVBrowserModel_initASVBrowserModel() {
            var
                self = this;
            self.asvLogKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-invoice-table',
                    pdfTitle: i18n( 'Invoicemojit.asv_browserJS.pdfTitle' ),
                    stateId: 'InvoiceMojit-ASVBrowser-asvLogKoTable',
                    states: [ 'limit' ],
                    striped: false,
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.asvlog.read,
                    columns: [
                        {
                            forPropertyName: 'receiver',
                            label: i18n( 'asvlog-schema.ASVLog_T.receiver.i18n' ),
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'insuranceId',
                            label: i18n( 'asvlog-schema.ASVLog_T.insuranceId.i18n' ),
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'insuranceName',
                            label: i18n( 'asvlog-schema.ASVLog_T.insuranceName.i18n' ),
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'receivingOrg',
                            label: i18n( 'asvlog-schema.ASVLog_T.receivingOrg.i18n' ),
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'transferDate',
                            label: i18n( 'asvlog-schema.ASVLog_T.transferDate.i18n' ),
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    value = meta.value,
                                    TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
                                    date = '';
                                if( value ) {
                                    date = moment( value ).format( TIMESTAMP_FORMAT );
                                }
                                return date;
                            }
                        },
                        {
                            forPropertyName: 'conFileName',
                            label: i18n( 'asvlog-schema.ASVLog_T.conFileName.i18n' ),
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    conFileId = data.conFileId,
                                    conFileName = data.conFileName || 'CON';
                                if( data.conFileId ) {
                                    return self.makeURL( conFileId, conFileName );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'pdfFileName',
                            label: i18n( 'asvlog-schema.ASVLog_T.pdfFileName.i18n' ),
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    pdfFileId = data.pdfFileId,
                                    pdfFileName = data.pdfFileName || 'PDF';
                                if( data.pdfFileId ) {
                                    return self.makeURL( pdfFileId, pdfFileName );
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            forPropertyName: 'asvTotal',
                            label: i18n( 'asvlog-schema.ASVLog_T.asvTotal.i18n' ),
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    value = meta.value || 0;
                                return Y.doccirrus.comctl.numberToLocalString( value );
                            }
                        }
                    ]
                }
            } );
        }
    }, {
        NAME: 'ASVBrowserModel',
        ATTRS: {}
    } );

    return {
        registerNode: function( node ) {
            var
                asvBrowserModel = new ASVBrowserModel();

            ko.applyBindings( asvBrowserModel, node.one( '#asvBrowserModel' ).getDOMNode() );
        }
    };
}