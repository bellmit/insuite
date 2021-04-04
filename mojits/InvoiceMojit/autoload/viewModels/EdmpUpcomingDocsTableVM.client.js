/**
 * User: do
 * Date: 29/08/16  13:41
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI, moment */
'use strict';

YUI.add( 'EdmpUpcomingDocsTableVM', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            QUARTER = i18n( 'InvoiceMojit.gkv_browserJS.label.QUARTER' ),
            YEAR = i18n( 'InvoiceMojit.gkv_browserJS.label.YEAR' ),
            INTERVAL = i18n( 'calendar-schema.Recurrence_T.interval' ),
            PATIENT_NO = i18n( 'patient-schema.Patient_T.patientNo.i18n' ),

            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            edmpAdditionalCaseFolderTypes = Y.doccirrus.schemas.casefolder.eDmpTypes,
            dmpActTypeList = Y.doccirrus.schemas.casefolder.types.Additional_E.list.filter( function( entry ) {
                return -1 !== edmpAdditionalCaseFolderTypes.indexOf( entry.val );
            } );

        function EdmpUpcomingDocsTableVM() {
            return {
                table: KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        formRole: 'casefile-ko-invoice-table',
                        pdfTitle: i18n( 'InvoiceMojit.edmp_browserJS.pdfTitleUnsent' ),
                        stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-edmpUpcomingDocsTable',
                        states: ['limit'],
                        striped: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.upcomingedmpdoc.read,
                        columns: [
                            {
                                width: '48px',
                                forPropertyName: 'quarter',
                                label: QUARTER,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                width: '48px',
                                forPropertyName: 'year',
                                label: YEAR,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'type',
                                label: i18n( 'InCaseMojit.care.label.CARE_EDMP_PROGRAMS' ),
                                width: '80px',
                                isSortable: true,
                                renderer: function( meta ) {
                                    var value = meta.value,
                                        translation = '';

                                    dmpActTypeList.some( function( entry ) {
                                        if( entry.val === value ) {
                                            translation = entry.i18n;
                                            return true;
                                        }
                                    } );
                                    return translation;
                                },
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: dmpActTypeList,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            },
                            {
                                forPropertyName: 'interval',
                                label: INTERVAL,
                                isSortable: true,
                                width: '196px',
                                renderer: function( meta ) {
                                    var value = meta.value,
                                        translation = '';
                                    Y.doccirrus.schemas.activity.types.DmpDocumentationInterval_E.list.some( function( entry ) {
                                        if( entry.val === value ) {
                                            translation = entry.i18n;
                                            return true;
                                        }
                                    } );
                                    return translation;
                                },
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.activity.types.DmpDocumentationInterval_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            },
                            {
                                forPropertyName: 'patientLastname',
                                label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                                width: '148px',
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'patientFirstname',
                                label: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                                width: '148px',
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'patientDob',
                                label: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                                width: '142px',
                                renderer: function( meta ) {
                                    var val = meta.value,
                                        date;
                                    if( !val ) {
                                        return '';
                                    }
                                    date = moment.utc( val );
                                    if( !date.isValid() ) {
                                        return '';
                                    }
                                    return date.local().format( 'DD.MM.YYYY' );
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'patientNo',
                                label: PATIENT_NO,
                                title: PATIENT_NO,
                                width: '142px',
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR,
                                isFilterable: true,
                                collation: { locale: 'de', numericOrdering: true }
                            }
                        ]
                    }
                } )
            };

        }

        Y.namespace( 'doccirrus.edmp.models' ).EdmpUpcomingDocsTableVM = EdmpUpcomingDocsTableVM;
    },
    '0.0.1', {requires: ['KoTable']}
);

