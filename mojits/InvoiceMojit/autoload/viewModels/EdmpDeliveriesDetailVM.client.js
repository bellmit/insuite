/**
 * User: do
 * Date: 09/09/16  13:52
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, $, moment */
'use strict';

YUI.add( 'EdmpDeliveriesDetailVM', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            dmpTypeList = Y.doccirrus.schemas.activity.types.DmpType_E.list,
            eDocActTypes = Y.doccirrus.schemas.activity.eDocActTypes,
            isEdmp = Y.doccirrus.schemas.activity.isEdmp,
            filterEdmpActStatus = Y.doccirrus.edmpcommonutils.filterEdmpActStatus,
            notice = Y.doccirrus.DCWindow.notice,
            edocActTypeList = Y.doccirrus.schemas.activity.types.Activity_E.list.filter( function( entry ) {
                return -1 !== eDocActTypes.indexOf( entry.val );
            } ),
            CARE_E_DOCUMENATION = i18n( 'InCaseMojit.care.label.CARE_E_DOCUMENATION' );

        function EdmpDeliveriesDetailVM( config ) {
            var currentModel = ko.observable(),
                isValid = ko.computed( function() {
                    var currentEdmpDeliveryModel = currentModel(),
                        valid;
                    if( currentEdmpDeliveryModel ) {
                        valid = currentEdmpDeliveryModel._isValid();
                        if( 'boolean' === typeof valid ) {
                            config.onAction( valid );
                        }
                    }
                } ),
                edmpDeliveriesDetailPossibleDocsTableBaseParams = ko.computed( function() {
                    var edmpDeliveryModel = currentModel();
                    if( !edmpDeliveryModel ) {
                        return null;
                    }
                    var dmpDeliveryId = edmpDeliveryModel._id.peek(),
                        query = {
                            dmpDeliveryRef: dmpDeliveryId
                        };

                    return {
                        query: query
                    };
                } ),
                edmpDeliveriesDetailContentTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-edmpDeliveryContentTable',
                        states: ['limit'],
                        striped: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.edoc.read,
                        baseParams: edmpDeliveriesDetailPossibleDocsTableBaseParams,
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: '',
                                checkMode: 'multi',
                                allToggleVisible: true
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
                                width: '110px',
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
                                width: '110px',
                                isSortable: true,
                                direction: 'DESC',
                                sortInitialIndex: 0,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    var
                                        row = meta.row,
                                        datumunt = row.datumunt,
                                        isHgvActType = Y.doccirrus.schemas.activity.isHgv( row.actType ),
                                        idQDocuActType = Y.doccirrus.schemas.activity.isQDocu( row.actType ),
                                        dmpExaminationDate = row.dmpType === 'FIRST' ? row.dmpExaminationDate : row.dmpExaminationDate_following,
                                        dmpSignatureDate = meta.value;

                                    if( isHgvActType ) {
                                        return moment( dmpExaminationDate ).format( 'DD.MM.YYYY' );
                                    }

                                    if( idQDocuActType && datumunt ) {
                                        return moment( datumunt ).format( 'DD.MM.YYYY' );
                                    }

                                    if( dmpSignatureDate ) {
                                        return moment( dmpSignatureDate ).format( 'DD.MM.YYYY' );
                                    } else {
                                        return '';
                                    }
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
                                    optionsText: '-de',
                                    optionsValue: 'val'
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
                                    optionsText: '-de',
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
                                forPropertyName: 'patientId.lastname',
                                label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                                width: '148px',
                                renderer: function( meta ) {
                                    return meta.value;
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
                                    return meta.value;
                                },
                                isSortable: false,
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'patientId.dob',
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
                                isSortable: false,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                node,
                                colName = meta.col.forPropertyName,
                                data = meta.row,
                                actType = data.actType,
                                dmpErrors = data.dmpErrors;
                                dmpErrors.actType = actType;
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
                            } else {
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

                            if( ['CREATED', 'INVALID', 'VALID'].indexOf( row.status ) && row.dmpQuarter === quarter && row.dmpYear === year && 2 >= weeksToNextQ ) {
                                css.danger = true;
                                css['text-danger'] = true;
                            } else if( 'CANCELLED' === row.status ) {
                                css.muted = true;
                                css['text-muted'] = true;
                            }
                        }
                    }
                } ),
                componentColumnCheckbox = edmpDeliveriesDetailContentTable.getComponentColumnCheckbox(),
                checked = componentColumnCheckbox.checked;

            ko.computed( function() {
                var chk = checked();
                if( ko.computedContext.isInitial() ) {
                    return;
                }
                config.onChecked( chk );
            } );

            function reloadTable() {
                edmpDeliveriesDetailContentTable.reload();
            }

            return {
                currentModel: currentModel,
                isValid: isValid,
                reloadTable: reloadTable,
                checked: checked,
                edmpDeliveriesDetailContentTable: edmpDeliveriesDetailContentTable
            };
        }

        Y.namespace( 'doccirrus.edmp.models' ).EdmpDeliveriesDetailVM = EdmpDeliveriesDetailVM;
    },
    '0.0.1', {requires: ['edmp-commonutils']}
);

