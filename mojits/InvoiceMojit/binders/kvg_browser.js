/**
 * User: oliversieweke
 * Date: 23.11.18  10:54
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*exported _fn */

/*eslint prefer-template:0, strict: 0 */
/*global ko, moment, _ */

function _fn( Y, NAME ) {
    'use strict';

    var
        hasFeature = Y.doccirrus.schemas.invoicelog.hasFeature,
        SEE_CONTENT_FEATURE = Y.doccirrus.schemas.invoicelog.FEATURES.SEE_CONTENT,

        i18n = Y.doccirrus.i18n,
        IS_CONTENT_OUTDATED = i18n( 'invoicelog-schema.InvoiceLog_T.isContentOutdated.i18n' ),
        SLD = i18n( 'InvoiceMojit.gkv_browserJS.label.SLD' ),
        STATUS = i18n( 'InvoiceMojit.gkv_browserJS.label.STATUS' ),
        USER = i18n( 'InvoiceMojit.gkv_browserJS.label.USER' ),
        LAST_UPDATE = i18n( 'InvoiceMojit.gkv_browserJS.label.LAST_UPDATE' ),
        LOCATION_NAME = i18n( 'InvoiceMojit.gkv_browserJS.label.LOCATION_NAME' ),
        CREATED_AT = i18n( 'InvoiceMojit.gkv_browserJS.label.CREATED_AT' ),
        PRICE_TOTAL = i18n( 'InvoiceMojit.gkv_browserJS.label.PRICE_TOTAL' ),
        FILES = i18n( 'InvoiceMojit.gkv_browserJS.label.FILES' ),
        DELIVERY = i18n( 'InvoiceMojit.gkv_browserJS.label.DELIVERY' ),
        DELIVERY_SETTING_MISSING = i18n( 'InvoiceMojit.gkv_browserJS.tooltip.DELIVERY_SETTING_MISSING' ),
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        progressMap = {
            collect: 'sammle Daten',
            sending: 'sende Daten',
            generatingPadx: 'generiere Datei'
        },
        selectedRows,
        START_DATE = i18n( 'InvoiceMojit.cashbookJS.messages.FROM' ),
        END_DATE = i18n( 'InvoiceMojit.cashbookJS.messages.TO' ),
        COLLECT_MEDIDATA_REJECTED = i18n( 'tarmedlog-schema.TarmedLog_T.collectMedidataRejected.i18n' ),
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' );

    // ============================================================================================================== \\
    // =============================================== PROGRESS BAR ================================================= \\
    function updateProgressbar( pvslogId, progress ) {
        var id = getProgressbarElementId( pvslogId );
        var text = getProgressText( progress.type );
        var progressElement = document.getElementById( id );
        var progressTimeElement = document.getElementById( id + '-time' );

        if( progressElement ) {
            progressElement.style.width = Math.round( progress.current / progress.total * 100 ) + '%';
            if( text ) {
                progressElement.innerHTML = '&nbsp;' + text;
            }
        }
        if( progressTimeElement ) {
            progressTimeElement.innerHTML = '&nbsp;' + showTime( progress.durationElapsed );
        }
    }

    function getProgressbarElementId( tarmedlog ) {
        return 'progressbar-' + tarmedlog;
    }

    function getProgressbar( tarmedlogId ) {
        var id = getProgressbarElementId( tarmedlogId );
        return '<span id="' + id + '-time"></span></span><div class="progress invoice-progress"><div id="' + id + '" class="progress-bar progress-bar-info invoice-progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div></div>';
    }

    function getProgressText( type ) {
        return progressMap[type] || '';
    }

    function showTime( ms ) {
        if( !ms ) {
            return '';
        }

        var duration = moment.duration( ms );
        var formattedDuration = '';

        if( duration.hours() ) {
            formattedDuration += getDurationPad( duration.hours() + ':' );
        }

        return formattedDuration + getDurationPad( duration.minutes() ) + ':' + getDurationPad( duration.seconds() );
    }

    function getDurationPad( value ) {
        return ('00' + value).slice( -2 );
    }

    // ============================================================================================================== \\

    function notice( err ) {
        return Y.doccirrus.DCWindow.notice( {
            message: Y.doccirrus.errorTable.getMessage( err )
        } );
    }

    return {

        registerNode: function(node, key, options) {
            var actionButtonsViewModel;
            var tarmedlogTable;
            var componentColumnCheckbox;
            var isReloading = false;
            var openToLogId = options && options.data && options.data.invoiceLogId ? options.data.invoiceLogId : null,
                openToPatientId = options && options.data && options.data.patientId ? options.data.patientId : null,
                cashlog = options && options.data && options.data.cashlog,
                api = cashlog ? 'cashlog' : 'tarmedlog';

    // ============================================== ACTION BUTTONS ================================================ \\
            actionButtonsViewModel = Y.doccirrus.invoicelogutils.createActionButtonsViewModel( {
                create: {
                    action: createLogs,
                    enabled: true,
                    visible: true
                },
                remove: {
                    action: removeLog,
                    enabled: function( state ) {
                        return !!(state && ['CREATED', 'CANCELED', 'VALID', 'VALIDATION_ERR', 'INVALID', 'INVOICED_APPROVED'].indexOf( state.status ) !== -1);
                    },
                    visible: true
                },
                preValidate: {
                    action: prevalidateLog,
                    enabled: function( state ) {
                        return !!(state && ['CREATED', 'VALID', 'INVALID', 'VALIDATION_ERR'].indexOf( state.status ) !== -1);
                    },
                    visible: true
                },
                generateInvoices: {
                    action: generateInvoicesForLog,
                    enabled: function( state ) {
                        return state && state.status === 'VALID' && state.totalItems !== "0/0/0" && !state.isContentOutdated &&
                               Y.doccirrus.auth.hasAPIAccess('tarmedlog.generateInvoices');
                    },
                    visible: true
                },
                invoiceBatchCreationPDF: {
                    action: function() {
                    },
                    enabled: function() {
                        return false;
                    },
                    visible: true
                },
                send: {
                    action: send,
                    enabled: function( state ) {
                        return state && state.status === 'INVOICED_APPROVED' && Y.doccirrus.auth.hasAPIAccess('tarmedlog.send');
                    },
                    visible: true
                }
            } );

            actionButtonsViewModel.buttonGenerateI18n = i18n( 'InvoiceMojit.gkv_browser.button.GENERATE' );
            actionButtonsViewModel.buttonRemoveI18n = i18n( 'InvoiceMojit.gkv_browser.button.REMOVE' );
            actionButtonsViewModel.buttonPrecheckI18n = i18n( 'InvoiceMojit.gkv_browser.button.PRECHECK' );
            self.generateInvoicesPDFI18n = i18n( 'InvoiceMojit.cashbookJS.title.GENERATE_INVOICES_PDF' );
            self.approveAndGenerateInvoicesTextI18n = i18n( 'InvoiceMojit.cashbookJS.title.APPROVE_AND_GENERATE_INVOICES' );
            self.shippingButton = i18n( 'InvoiceMojit.gkv_delivery_settings.button.DELIVERY' );

            actionButtonsViewModel.optionsEnable = ko.observable( true );

            actionButtonsViewModel._shippingList = [
                {
                    'val': '',
                    '-de': i18n('InvoiceMojit.gkv_browser.placeholder.DELIVERY_METHOD')
                },
                {
                    'val': 'MANUAL',
                    '-de': i18n( 'deliverysettings-schema.DeliveryType_E.MANUAL' )
                },
                {
                    'val': 'MEDIPORT',
                    '-de': i18n( 'deliverysettings-schema.DeliveryType_E.MEDIPORT' )
                }
            ];

            actionButtonsViewModel.shipping = ko.observable( actionButtonsViewModel._shippingList[0] );
            function createLogs() {

                getInvoiceConfigurations()
                    .then( askForSettings )
                    .then( createLogsFromSettings )
                    .then( reloadTable )
                    .catch( notice );

                function getInvoiceConfigurations() {
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.invoiceconfiguration.read() )
                        .then( function( response ) {
                            var kvgSettings = response && response.data && response.data[0] && response.data[0].kvgSettings;
                            if( !kvgSettings ) {
                                throw new Y.doccirrus.commonerrors.DCError( 2508 ); // Prompts to create setting
                            }
                            return kvgSettings;
                        } );
                }

                function askForSettings( kvgSettings ) {
                    return new Promise( function( resolve ) {
                        return Y.doccirrus.modals.filterKVGInvoiceItems.show( {
                            type: 'KVG',
                            kvgSettings: kvgSettings,
                            onSettingsChosen: resolve
                        } );
                    } );
                }

                function createLogsFromSettings( settings ) {
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.tarmedlog.createLogs( {
                        settings: settings
                    } ) );
                }
            }

            function removeLog( model ) {
                Promise.resolve( Y.doccirrus.jsonrpc.api.tarmedlog.removeLog( {
                    id: ko.unwrap( model.state )._id
                } ) )
                    .then( reloadTable )
                    .catch( notice );
            }

            function prevalidateLog( model ) {
                Promise.resolve( Y.doccirrus.jsonrpc.api.tarmedlog.validate( {
                    id: ko.unwrap( model.state )._id,
                    preValidation: true
                } ) )
                    .catch( notice );
            }

            function generateInvoicesForLog( model ) {
                var selection = ko.unwrap( model.state );
                Y.doccirrus.modals.invoiceLogApproveModal.show( selection, approve, null, {
                    logType: 'tarmedlog',
                    generateText: self.approveAndGenerateInvoicesTextI18n
                } );
                function approve() {
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.tarmedlog.generateInvoices( {
                        id: selection._id
                    } ) ).catch( notice );
                }
            }
            function send( model ) {
                var selection = ko.unwrap( model.state ),
                    value = ko.unwrap( actionButtonsViewModel.shipping );
                if ( value === 'MEDIPORT' ) {
                    Y.doccirrus.jsonrpc.api.flow.getFlows( {
                        query: {
                            flowType: 'KVG'
                        }
                    } ).done( function( response ) {
                        const invoiceDocs = selection.invoiceDocs,
                            invoiceXMLs = invoiceDocs.map(function ( scheinDocs ) {return scheinDocs.xml;} );
                        Y.doccirrus.jsonrpc.api.flow.execute( {
                            query: {
                                _id: response.data[ 0 ]._id
                            },
                            data: {
                                sourceQuery: {invoiceXMLs: invoiceXMLs}
                            }
                        } ).done( function() {
                            Promise.resolve( Y.doccirrus.jsonrpc.api.tarmedlog.send( {
                                id: selectedRows[0]._id,
                                deliveryType: value
                            } ) ).finally( function() {
                                reloadTable();
                            } );
                        } ).fail( function( err ) {
                            notice( err );
                        } );
                    } );
                } else {
                    Promise.resolve( Y.doccirrus.jsonrpc.api.tarmedlog.send( {
                        id: selectedRows[0]._id,
                        deliveryType: value
                    } ) ).then( function() {
                        reloadTable();
                    } ).catch( function( err ) {
                        notice( err );
                    } );
                }
            }

    // ============================================================================================================== \\
    // =================================================== TABLE ==================================================== \\
            tarmedlogTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-invoice-table',
                    pdfTitle: i18n( 'InvoiceMojit.kvg_browserJS.pdfTitle' ),
                    stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-kvglogTable',
                    states: ['limit'],
                    striped: false,
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.tarmedlog.read,
                    baseParams: {filterOnLocations: true},
                    sortersLimit: 1,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkMode: 'single',
                            allToggleVisible: false
                        },
                        {
                            forPropertyName: 'created',
                            label: CREATED_AT,
                            renderer: Y.doccirrus.invoicelogutils.renderDateAndTime,
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR
                        },
                        {
                            forPropertyName: 'locname',
                            label: LOCATION_NAME,
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'totalItems',
                            width: '95px',
                            label: SLD,
                            renderer: function( meta ) {
                                var html = '<a href="#">' + meta.value + '</a>';
                                if( meta.row.isContentOutdated === true ) {
                                    html = html + '&nbsp;<span class="text-warning glyphicon glyphicon-warning-sign" aria-hidden="true" title="' + IS_CONTENT_OUTDATED + '"></span>';
                                }
                                return html;
                            }
                        },
                        {
                            forPropertyName: '_deliverySettings',
                            label: DELIVERY,
                            title: DELIVERY,
                            renderer: function( meta ) {
                                var row = meta.row,
                                    deliveryType;

                                if( !row.deliveryType ) {
                                    return '<a href="invoiceadmin#/kvg_delivery_settings" title="' + DELIVERY_SETTING_MISSING + '"><span style="color: #a94442;" class="glyphicon glyphicon-question-sign"></span></a>';
                                }
                                else {
                                    deliveryType = actionButtonsViewModel._shippingList.filter( function( item ) {
                                        return item.val === row.deliveryType;
                                    } )[ 0 ];
                                    return '<a href="invoiceadmin#/kvg_delivery_settings">'+deliveryType['-de']+'</a>';
                                }
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'insuranceTypes',
                            label:  i18n( 'InvoiceMojit.gkv_browserJS.label.PVSLOG_FILTERS' ),
                            width: '160px',
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    html = '';

                                if( !data.insuranceTypes || 0 === data.insuranceTypes.length ) {
                                    data.insuranceTypes = ['PRIVATE_CH', "PRIVATE_CH_IVG", "PRIVATE_CH_UVG", "PRIVATE_CH_MVG",  "PRIVATE_CH_VVG"];
                                }

                                function mkLabel( label, danger ) {
                                    if( danger ) {
                                        return '<span class="label label-default label-danger">' + label + '</span>&nbsp;';
                                    }
                                    return '<span class="label label-default">' + label + '</span>&nbsp;';
                                }

                                if( data.isTiersGarant ) {
                                    html = html + mkLabel( 'TG' );
                                }
                                if( data.isTiersPayant ) {
                                    html = html + mkLabel( 'TP' );
                                }

                                data.insuranceTypes.forEach( function( item ) {
                                    switch( item ) {
                                        case "PRIVATE_CH_VVG":
                                            html = html + mkLabel( 'VVG' );
                                            break;
                                        case 'PRIVATE_CH':
                                            html = html + mkLabel( 'KVG' );
                                            break;
                                        case 'PRIVATE_CH_IVG':
                                            html = html + mkLabel( 'IVG' );
                                            break;
                                        case 'PRIVATE_CH_UVG':
                                            html = html + mkLabel( 'UVG' );
                                            break;
                                        case 'PRIVATE_CH_MVG':
                                            html = html + mkLabel( 'MVG' );
                                            break;
                                    }
                                } );

                                if( data.minTotal ) {
                                    html = html + '<br/>' + mkLabel( data.minTotal );
                                }

                                if( data.doNotcheckCatalog ) {
                                    html = html + (data.minTotal && data.minTotal.toString().length < 5 ? '' : '<br/>') + mkLabel( i18n( 'FilterInvoiceItemsDialog.doNotcheckCatalog.pill' ) );
                                }

                                if( data.useStartDate ) {
                                    html = html + '<br/>' + mkLabel( START_DATE + ' ' + moment( data.startDate ).format( TIMESTAMP_FORMAT ) );
                                }

                                if( data.useEndDate ) {
                                    html = html + '<br/>' + mkLabel( END_DATE + ' ' + moment( data.endDate ).format( TIMESTAMP_FORMAT ) );
                                }

                                if( true === data.employeeFilterEnabled && data.employees && data.employees.length ) {
                                    data.employees.forEach( function( emp ) {
                                        html = html + '<br/>' + mkLabel( emp.firstname + ' ' + emp.lastname );
                                    } );
                                }

                                if( data.padnextSettingTitle ) {
                                    html = html + '<br/>' + mkLabel( data.padnextSettingTitle );
                                }

                                if( data.padnextSettingTitle ) {
                                    html = html + '<br/>' + mkLabel( data.padnextSettingTitle );
                                }

                                if( data.collectMedidataRejected ) {
                                    html = html + '<br/>' + mkLabel( COLLECT_MEDIDATA_REJECTED, true );
                                }

                                return '<div style="display: flex; flex-wrap: wrap; align-items: baseline;">' + html + '</div>';
                            }
                        },
                        {
                            forPropertyName: 'status',
                            label: STATUS,
                            renderer: function( meta ) {
                                var displayText, displayElement, errorString;
                                var value = meta.value;
                                var data = meta.row;
                                var errors = data.output || [];
                                var warnings = data.warnings || [];
                                var PROGRESS_BAR_STATES = ['VALIDATING', 'APPROVING', 'SENDING', 'INVOICING'];
                                var ERROR_DISPLAY_STATES = ['VALID', 'INVALID'];

                                if( !value ) {
                                    return '';
                                }

                                displayText = Y.doccirrus.schemaloader.getEnumListTranslation( 'invoicelog', 'Status_E', value, 'i18n', '' );

                                if( ERROR_DISPLAY_STATES.indexOf( value ) > -1 ) {
                                    errorString = (errors.length || warnings.length) ? (errors.length + '/' + warnings.length) : null;
                                    if( errorString ) {
                                        displayText += '&nbsp;(' + errorString + ')';
                                    }
                                    if( data.isPreValidated ) {
                                        displayText += '&nbsp;(VP)';
                                    }
                                }

                                displayElement = '<a href="#" class="kbvlogmodel-status kbvlogmodel-status-' + value.toLowerCase() + '">' + displayText + '</a>';

                                if( PROGRESS_BAR_STATES.indexOf( value ) > -1 ) {
                                    displayElement += getProgressbar( data._id );
                                }

                                return displayElement;
                            },
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.invoicelog.types.Status_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'invoiceDocs',
                            label: 'Rechnungen',
                            renderer: function( meta ) {
                                var invoiceDocs = meta.row.invoiceDocs;

                                return (Array.isArray( invoiceDocs ) && invoiceDocs.length) ? i18n( 'invoicelog-schema.Status_E.CREATED' ) + ' (' + invoiceDocs.length + ')' : '-';
                            }
                        },
                        {
                            forPropertyName: 'user.name',
                            label: USER,
                            renderer: function( meta ) {
                                var user = meta && meta.row && meta.row.user;

                                return user && user.length ? user[user.length - 1].name : '';
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'files',
                            label: FILES,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    pdfFile = data.pdfFile,
                                    invoiceDocs = data.invoiceDocs || [],
                                    invoicesDiv = '',
                                    i;
                                function makeURL( id, pdfFile ) {
                                    if ( id === '' ) {
                                        return '';
                                     }
                                    var isPDF = (id || '').indexOf('.pdf') !== -1,
                                        url = pdfFile ? id: '/media/grid_' + id;
                                    url = Y.doccirrus.infras.getPrivateURL( url );
                                    return '<a href="' + url + '">' + ( isPDF ? 'PDF' : 'XML' ) + '</a> &nbsp;';
                                }
                                if( invoiceDocs.length ) {
                                    for( i = 0; i < invoiceDocs.length; i++) {
                                        if(i === 1) {
                                            invoicesDiv = invoicesDiv.concat(
                                                '<span class="onActivitiesTableShowMoreContentMore"> ... </span>' +
                                                '<div id="xml-list-' + data._id + '" class="onActivitiesTableShowMoreContentDetail onActivitiesTableShowMoreContentDetailHidden">' );

                                        }
                                        invoicesDiv = invoicesDiv.concat(makeURL( invoiceDocs[ i ].xml, false ));
                                        if( !pdfFile ) {
                                            invoicesDiv = invoicesDiv.concat(makeURL( invoiceDocs[ i ].pdf, false ));
                                        }
                                    }

                                    if( invoiceDocs.length > 1 ) {
                                        invoicesDiv = invoicesDiv.concat('</div>');
                                    }
                                }

                                if( pdfFile ) {
                                    invoicesDiv = makeURL( pdfFile, true  ) + invoicesDiv;
                                }

                                return invoicesDiv;
                            },
                            onCellClick: function(event) {
                                if (event.isLink || event.row.invoiceDocs.length < 2) {
                                    return false;
                                }
                                var xmlLinkList = document.getElementById('xml-list-' + event.row._id );

                                if(xmlLinkList.classList.contains("onActivitiesTableShowMoreContentDetailHidden")) {
                                    xmlLinkList.classList.remove("onActivitiesTableShowMoreContentDetailHidden");
                                    xmlLinkList.classList.add("onActivitiesTableShowMoreContentDetailShow");
                                } else {
                                    xmlLinkList.classList.remove("onActivitiesTableShowMoreContentDetailShow");
                                    xmlLinkList.classList.add("onActivitiesTableShowMoreContentDetailHidden");
                                }
                            },
                            isSortable: true
                        },
                        {
                            forPropertyName: 'lastUpdate',
                            label: LAST_UPDATE,
                            renderer: Y.doccirrus.invoicelogutils.renderDateAndTime,
                            isSortable: true,
                            sortInitialIndex: 0,
                            direction: 'DESC',
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR
                        },
                        {
                            forPropertyName: 'priceTotal',
                            label: PRICE_TOTAL,
                            renderer: function( meta ) {
                                return meta.value ? Y.doccirrus.comctl.numberToLocalString( meta.value ) : '-';
                            },
                            isSortable: true
                        }
                    ],
                    onRowClick: function( meta, e ) {
                        var colName = meta.col.forPropertyName;
                        var data = meta.row;
                        var invoiceLogId = data._id.toString();
                        var location = data.mainLocationId;

                        if( -1 === ['files', '_deliverySettings'].indexOf( colName ) ) {
                            e.preventDefault();
                        }

                        // e.preventDefault();

                        if( colName === 'status' ) {
                            Y.doccirrus.modals.invoiceErrorLogModal.show( location, invoiceLogId, 'KVG', reloadTable );
                        } else if( colName === 'totalItems' && hasFeature( SEE_CONTENT_FEATURE, meta.row._log_version, 'KVG' ) ) {
                            Y.doccirrus.modals.invoiceLogModal.show( data, 'KVG', reloadTable );
                        }
                        return false;
                    }
                }
            } );

            componentColumnCheckbox = tarmedlogTable.getComponentColumnCheckbox();

            ko.computed( function() {
                selectedRows = componentColumnCheckbox.checked();
                actionButtonsViewModel.state( selectedRows && selectedRows.length ? selectedRows[0] : null );
            } );

            function reloadTable() {
                if( isReloading ) {
                    return;
                }
                isReloading = true;

                const selected = componentColumnCheckbox.checked();
                const ids = Array.isArray( selected ) && selected.length ? [selected[0]._id] : selected;

                componentColumnCheckbox.uncheckAll();

                tarmedlogTable.reload( {
                    done: function() {
                        componentColumnCheckbox.checkItemsByProperty( ids );
                    },
                    always: function() {
                        isReloading = false;
                    }
                } );
            }

            function loadAndOpenLog( api, cashlog, invoiceLogId, patientId ) {
                Y.doccirrus.jsonrpc.api[api]
                    .read( {query: {_id: invoiceLogId}} )
                    .then( openLogModal )
                    .fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );

                function openLogModal( result ) {
                    var data = result && result.data && result.data[0] ? result.data[0] : null;

                    if( !data ) {
                        Y.log( 'Could not load deep linked log: ' + invoiceLogId, 'warn', NAME );
                        return;
                    }

                    if( patientId ) {
                        data.openToPatient = patientId;
                    }

                    Y.doccirrus.modals.invoiceLogModal.show( data, cashlog ? 'CASH ' : 'KVG', function() {
                        Y.log( 'Closed default modal, redirecting to default tarmed hash fragment', 'debug', NAME );

                        //  return to default route
                        window.location.hash = '#/' + cashlog ? 'cashlog' : 'tarmed';
                    } );
                }
            }

    // ============================================================================================================== \\
    // =============================================== COMMUNICATION ================================================ \\
            Y.doccirrus.communication.on( {
                event: 'invoicelogAction',
                done: function( message ) {
                    var data = message.data && message.data[0];
                    if( 'KVG' === data.invoiceType ) {
                        if( data.state === 'progress' ) {
                            updateProgressbar( data.id, data.progress );
                        } else {
                            reloadTable();
                        }
                    }
                },
                handlerId: 'updateTableLogAction'
            } );
            Y.doccirrus.communication.on( {
                event: 'tarmedLogging',
                done: function( message ) {
                    var data = message.data && message.data[0];
                    if( 'KVG' === data.invoiceType ) {
                        if( data.error ) {
                            notice( data.error);
                        }
                        reloadTable();
                    }
                },
                handlerId: 'updateMedidataTable'
            } );

            if( openToLogId ) {
                Y.log( 'Deep link to PVS log: ' + openToLogId + ' patient: ' + openToPatientId, 'debug', NAME );
                loadAndOpenLog( api, cashlog, openToLogId, openToPatientId );
            }

    // ============================================================================================================== \\
            ko.applyBindings( actionButtonsViewModel, document.querySelector( '#actionButtons' ) );
            ko.applyBindings( tarmedlogTable, document.querySelector( '#tarmedlogTable' ) );
        },

        deregisterNode: function() {
            Y.doccirrus.communication.off( 'invoicelogAction', 'updateTableLogAction' );
            Y.doccirrus.communication.off( 'tarmedLogging', 'updateMedidataTable' );
        }
    };
}
