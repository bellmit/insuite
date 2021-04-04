/**
 * User: do
 * Date: 29/08/16  13:41
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI, moment, $, ko */
'use strict';

YUI.add( 'EdmpDocsTableVM', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            CARE_E_DOCUMENATION = i18n( 'InCaseMojit.care.label.CARE_E_DOCUMENATION' ),
            QUARTER = i18n( 'InvoiceMojit.gkv_browserJS.label.QUARTER' ),
            YEAR = i18n( 'InvoiceMojit.gkv_browserJS.label.YEAR' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            eDocActTypes = Y.doccirrus.schemas.activity.eDocActTypes,
            isEdmp = Y.doccirrus.schemas.activity.isEdmp,
            isHgv = Y.doccirrus.schemas.activity.isHgv,
            edocActTypeList = Y.doccirrus.schemas.activity.types.Activity_E.list.filter( function( entry ) {
                return -1 !== eDocActTypes.indexOf( entry.val );
            } ),
            dmpTypeList = Y.doccirrus.schemas.activity.types.DmpType_E.list,
            notice = Y.doccirrus.DCWindow.notice,
            filterEdmpActStatus = Y.doccirrus.edmpcommonutils.filterEdmpActStatus;

        function EdmpDocsTableVM() {
            var table = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        formRole: 'casefile-ko-invoice-table',
                        pdfTitle: i18n( 'InvoiceMojit.edmp_browserJS.pdfTitleDocs' ),
                        stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-kbvlogEdmpTable',
                        responsive: false,
                        tableMinWidth: '100%',
                        staticConfig: [
                            {
                                name: 'DM1',
                                shortcutDescription: '',
                                shortcutIndex: 0,
                                shortcutVisible: true,
                                filters: [
                                    {
                                        forPropertyName: 'actType',
                                        value: ['DM1']
                                    }
                                ]
                            },
                            {
                                name: 'DM2',
                                shortcutDescription: '',
                                shortcutIndex: 1,
                                shortcutVisible: true,
                                filters: [
                                    {
                                        forPropertyName: 'actType',
                                        value: ['DM2']
                                    }
                                ]
                            },
                            {
                                name: 'KHK',
                                shortcutDescription: '',
                                shortcutIndex: 2,
                                shortcutVisible: true,
                                filters: [
                                    {
                                        forPropertyName: 'actType',
                                        value: ['KHK']
                                    }
                                ]
                            },
                            {
                                name: 'ASTHMA',
                                shortcutDescription: '',
                                shortcutIndex: 3,
                                shortcutVisible: true,
                                filters: [
                                    {
                                        forPropertyName: 'actType',
                                        value: ['ASTHMA']
                                    }
                                ]
                            },
                            {
                                name: 'COPD',
                                shortcutDescription: '',
                                shortcutIndex: 4,
                                shortcutVisible: true,
                                filters: [
                                    {
                                        forPropertyName: 'actType',
                                        value: ['COPD']
                                    }
                                ]
                            },
                            {
                                name: 'eHKS ND',
                                shortcutDescription: '',
                                shortcutIndex: 4,
                                shortcutVisible: true,
                                filters: [
                                    {
                                        forPropertyName: 'actType',
                                        value: ['EHKSND']
                                    }
                                ]
                            },
                            {
                                name: 'eHKS D',
                                shortcutDescription: '',
                                shortcutIndex: 4,
                                shortcutVisible: true,
                                filters: [
                                    {
                                        forPropertyName: 'actType',
                                        value: ['EHKSD']
                                    }
                                ]
                            }

                        ],
                        states: ['limit'],
                        striped: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.edoc.read,
                        baseParams: {
                            overviewFilter: true
                        },
                        columns: [
                            {
                                width: '48px',
                                forPropertyName: 'dmpQuarter',
                                label: QUARTER,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR_FOR_NUMBER,
                                isFilterable: true
                            },
                            {
                                width: '48px',
                                forPropertyName: 'dmpYear',
                                label: YEAR,
                                renderer: function( meta ) {
                                    return meta.value;
                                },
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR_FOR_NUMBER,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'timestamp',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                width: '96px',
                                isSortable: true,
                                direction: 'DESC',
                                sortInitialIndex: 0,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    var
                                        timestamp = meta.value;

                                    if( timestamp ) {
                                        return moment( timestamp ).format( 'DD.MM.YYYY' );
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                forPropertyName: 'dmpHeadDate',
                                label: i18n( 'activity-schema.DMP_BASE_T.dmpHeadDate.i18n' ),
                                title: i18n( 'activity-schema.DMP_BASE_T.dmpHeadDate.i18n' ),
                                width: '96px',
                                isSortable: true,
                                direction: 'DESC',
                                sortInitialIndex: 0,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    var
                                        dmpHeadDate = meta.value;


                                    if( !isEdmp( meta.row.actType ) ) {
                                        return '';
                                    }

                                    if( dmpHeadDate ) {
                                        return moment( dmpHeadDate ).format( 'DD.MM.YYYY' );
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                forPropertyName: 'dmpSignatureDate',
                                label: i18n( 'activity-schema.DMP_BASE_T.dmpSignatureDate.i18n' ) + '/' + i18n( 'activity-schema.EHKS_BASE_T.examDate.i18n' ),
                                title: i18n( 'activity-schema.DMP_BASE_T.dmpSignatureDate.i18n' ) + '/' + i18n( 'activity-schema.EHKS_BASE_T.examDate.i18n' ),
                                width: '96px',
                                isSortable: true,
                                direction: 'DESC',
                                sortInitialIndex: 0,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    var
                                        row = meta.row,
                                        isHgvActType = Y.doccirrus.schemas.activity.isHgv( row.actType ),
                                        isQDocuActType = Y.doccirrus.schemas.activity.isQDocu( row.actType ),
                                        datumunt = row.datumunt,
                                        dmpExaminationDate = row.dmpType === 'FIRST' ? row.dmpExaminationDate : row.dmpExaminationDate_following,
                                        dmpSignatureDate = meta.value;

                                    if( isQDocuActType && datumunt ) {
                                        return moment( datumunt ).format( 'DD.MM.YYYY' );
                                    }

                                    if( isHgvActType ) {
                                        return moment( dmpExaminationDate ).format( 'DD.MM.YYYY' );
                                    }

                                    if( dmpSignatureDate ) {
                                        return moment( dmpSignatureDate ).format( 'DD.MM.YYYY' );
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                forPropertyName: 'actType',
                                label: CARE_E_DOCUMENATION,
                                title: CARE_E_DOCUMENATION,
                                width: '80px',
                                renderer: function( meta ) {
                                    var value = meta.value;
                                    if( !value ) {
                                        return '';
                                    }
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', value, 'i18n', 'k.A.' );
                                },
                                isFilterable: true,
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: edocActTypeList,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            },
                            {
                                forPropertyName: 'dmpType',
                                label: 'Typ',
                                width: '80px',
                                renderer: function( meta ) {
                                    var actType = meta.row && meta.row.actType;
                                    var type = '';
                                    if( !meta.value ) {
                                        type = '';
                                    }
                                    if( actType === 'QDOCU' ) {
                                        type = meta.row.module;
                                    } else {
                                        type = 'FOLLOWING' === meta.value ? 'Folge-' : 'Erst-';
                                    }
                                    return type;
                                },
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: dmpTypeList,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            },
                            {
                                forPropertyName: 'status',
                                label: 'Status',
                                title: 'Status',
                                width: '100px',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: filterEdmpActStatus( Y.doccirrus.schemas.activity.types.ActStatus_E.list ),
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                },
                                renderer: function( meta ) {
                                    var val = meta.value || '',
                                        data = meta.row,
                                        translation = Y.doccirrus.edmpcommonutils.generateStatus( data );
                                    return '<a href="#" class="kbvlogmodel-status kbvlogmodel-status-' + val.toLowerCase() + '">' + translation + '</a>';
                                }
                            },
                            {
                                forPropertyName: 'dmpSentDate',
                                label: i18n( 'activity-schema.DMP_BASE_T.dmpSentDate.i18n' ),
                                title: i18n( 'activity-schema.DMP_BASE_T.dmpSentDate.i18n' ),
                                width: '120px',
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
                                width: '64px',
                                forPropertyName: 'files',
                                label: i18n( 'InvoiceMojit.gkv_browserJS.label.FILES' ),
                                renderer: function( meta ) {
                                    var html = '',
                                        act = meta.row,
                                        dmpFileId = act.dmpFileId,
                                        filename = act.dmpErrors && act.dmpErrors.filename || '';

                                    function makeURL( id, label ) {
                                        var url = '/download/' + id;
                                        url = Y.doccirrus.infras.getPrivateURL( url );
                                        return '<a href="' + url + '">' + label + '</a> &nbsp';
                                    }

                                    if( dmpFileId && filename ) {
                                        html += makeURL( dmpFileId, filename.split( '.' )[1] || '' );
                                    }

                                    return html;
                                }
                            },
                            {
                                forPropertyName: 'dmpPrintStatus',
                                label: i18n( 'activity-schema.DmpPrintStatus_E.i18n' ),
                                width: '96px',
                                renderer: function( meta ) {
                                    if( isEdmp( meta.row.actType ) || isHgv( meta.row.actType ) ) {
                                        return '<span class="glyphicon ' + ('PRINTED' === meta.value ? 'glyphicon-ok' : 'glyphicon-remove') + '"></span>';
                                    }
                                    return '';
                                }
                            },
                            {
                                width: '110px',
                                forPropertyName: 'dmpAddressee',
                                label: i18n( 'edmpdelivery-schema.EdmpDelivery_T.addresseeIk.i18n' ),
                                renderer: function( meta ) {
                                    var html = '',
                                        activity = meta.row,
                                        status = activity.status,
                                        dmpAddressee = activity.dmpAddressee,
                                        dmpDeliveryInfo = activity.dmpDeliveryInfo,
                                        choseTranslatation = 'wählen',
                                        nAddressees = '(' + (dmpDeliveryInfo && dmpDeliveryInfo.addressees && dmpDeliveryInfo.addressees.length || 0) + ')';

                                    if( -1 !== ['CREATED', 'INVALID', 'CANCELLED'].indexOf( status ) ) {
                                        html = '-';
                                    } else if( dmpAddressee ) {
                                        if(dmpAddressee === 'QDOCU') {
                                            html = '-';
                                        } else {
                                            dmpAddressee = Y.doccirrus.edmputils.renderAddresseeIk.apply( this, arguments );
                                            html = '<a href="#" class="kbvlogmodel-status kbvlogmodel-status-valid">' + dmpAddressee + ' ' + nAddressees + '</a>';
                                        }
                                    } else {
                                        html = '<a href="#" class="kbvlogmodel-status kbvlogmodel-status-invalid">' + choseTranslatation + ' ' + nAddressees + '</a>';
                                    }
                                    return html;
                                }
                            },
                            {
                                forPropertyName: 'patientId.lastname',
                                label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                                width: '148px',
                                renderer: function( meta ) {
                                    return meta.row.patientId.lastname;
                                },
                                isSortable: false,
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'patientId.firstname',
                                label: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                                width: '148px',
                                renderer: function( meta ) {
                                    return meta.row.patientId.firstname;
                                },
                                isSortable: false,
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'patientId.dob',
                                label: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                                width: '128px',
                                renderer: function( meta ) {
                                    var val = meta.row.patientId.dob,
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
                                isSortable: false,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR
                            },
                            {
                                forPropertyName: 'locationId.locname',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.locationName' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.locationName' ),
                                width: '148px',
                                isSortable: false,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    return meta.row.locationName;
                                }
                            },
                            {
                                forPropertyName: 'editor.name',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                                width: '148px',
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    var
                                        data = meta.row,
                                        editor = data.editor;

                                    if( editor && editor.length ) {
                                        return editor[editor.length - 1].name;
                                    } else {
                                        return '';
                                    }
                                }
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                node,
                                colName = meta.col.forPropertyName,
                                data = meta.row,
                                actType = data.actType,
                                dmpErrors = data.dmpErrors;
                            if( dmpErrors && actType ) {
                                dmpErrors.actType = actType;
                            }

                            if( colName === 'status' ) {
                                if( dmpErrors && (dmpErrors.nErrors || dmpErrors.nWarnings) ) {
                                    node = Y.Node.create( '<div></div>' );

                                    YUI.dcJadeRepository.loadNodeFromTemplate(
                                        'edmperrorlog',
                                        'InvoiceMojit',
                                        dmpErrors,
                                        node,
                                        function() {

                                            notice( {
                                                title: 'Meldungen',
                                                type: 'error',
                                                window: {width: 'xlarge'},
                                                message: node
                                            } );

                                            $( '#kbverror-log-tabs a' ).click( function( e ) {
                                                e.preventDefault();
                                                e.stopImmediatePropagation();
                                                $( this ).tab( 'show' );
                                            } );
                                        }
                                    );
                                }
                            } else if( 'dmpAddressee' === colName ) {
                                if( ('VALID' === data.status || 'APPROVED' === data.status) && !data.dmpDeliveryRef && data.actType !== "QDOCU" ) {
                                    Y.doccirrus.modals.edmpChooseAddresseeModal.show( data.dmpDeliveryInfo.addressees, function( result ) {
                                        var dmpDeliveryInfo = data.dmpDeliveryInfo;
                                        if( result ) {
                                            if( 'RECOMMENDATION' !== result.from ) {
                                                if( 'CATALOGUSAGE' === result.from ) {
                                                    result.addressee.catalogUsage = true;
                                                }
                                                dmpDeliveryInfo.addressees.push( result.addressee );
                                            }

                                            Promise.resolve( Y.doccirrus.jsonrpc.api.edmp.setAddressee( {
                                                activityId: data._id,
                                                addressee: result.addressee.orgianizationId || result.addressee.ukv,
                                                dmpDeliveryInfo: dmpDeliveryInfo
                                            } ) ).then( function() {
                                                table.reload();
                                            } ).catch( function( err ) {
                                                Y.log( 'could not create delivreries: ' + err, 'error', NAME );
                                            } );
                                        }
                                    } );
                                }
                            } else if( colName !== 'files' ) {
                                window.open( '/incase#/activity/' + data._id, '_blank' );
                            }
                            return false;
                        },
                        getCssRow: function( $context, css ) {
                            var row = $context.$data,
                                date = moment(),
                                weeksToNextQ = moment.duration( date.clone().startOf( 'quarter' ).add( 1, 'quarter' ).diff( date ) ).asWeeks(),
                                quarter = date.quarter(),
                                year = date.year();

                            if( 'SENT' === row.status ) {
                                css.success = true;
                                css['text-success'] = true;
                            } else if( -1 !== ['CREATED', 'INVALID', 'VALID'].indexOf( row.status ) && row.dmpQuarter === quarter && row.dmpYear === year && 2 >= weeksToNextQ ) {
                                css.danger = true;
                                css['text-danger'] = true;
                            }
                        }
                    }
                } ),
                btnPending = ko.observable( false ),
                nValidDocs = ko.observable(),
                approveValidDocs = ko.observable(),
                btnClick = function() {
                    btnPending( true );
                    Promise.resolve( Y.doccirrus.jsonrpc.api.edoc.approveValidDocs() ).then( function() {
                        table.reload();
                        return getValidDocCount();
                    } ).catch( Y.doccirrus.promise.catchUnhandled ).finally( function() {
                        btnPending( false );
                    } );
                },
                btnDisabled = ko.computed( function() {
                    var isPending = btnPending(),
                        _nValidDocs = nValidDocs(),
                        noValidDocs = Boolean( '0' === _nValidDocs || !_nValidDocs );
                    return noValidDocs || isPending;
                } );

            function getValidDocCount() {
                return Promise.resolve( Y.doccirrus.jsonrpc.api.edoc.approveValidDocs( {onlyCount: true} ) ).then( function( response ) {
                    var data = response.data;
                    nValidDocs( ('' + (data && data.nValidDocs)) );
                } ).catch( Y.doccirrus.promise.catchUnhandled );
            }

            getValidDocCount();

            approveValidDocs.i18n = i18n('InvoiceMojit.edmp_docs.button.approveValidDocs');

            return {
                btnClick: btnClick,
                nValidDocs: nValidDocs,
                btnDisabled: btnDisabled,
                table: table,
                approveValidDocs: approveValidDocs
            };

        }

        Y.namespace( 'doccirrus.edmp.models' ).EdmpDocsTableVM = EdmpDocsTableVM;
    },
    '0.0.1', {requires: ['KoTable', 'activity-schema', 'chooseaddressee-modal', 'edmp-commonutils']}
);

