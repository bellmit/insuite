/**
 * Date: 31/03/14  17:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*exported _fn */

/*global ko, $, YUI, moment, Modernizr */
function _fn( Y, NAME ) {
    'use strict';

    var i18n = Y.doccirrus.i18n,
        IS_CONTENT_OUTDATED = i18n( 'invoicelog-schema.InvoiceLog_T.isContentOutdated.i18n' ),
        DELIVERY_SETTING_MISSING = i18n( 'InvoiceMojit.gkv_browserJS.tooltip.DELIVERY_SETTING_MISSING' ),
        CONTENT_NOT_AVAILABLE = i18n( 'InvoiceMojit.gkv_browserJS.tooltip.CONTENT_NOT_AVAILABLE' ),
        QUARTER = i18n( 'InvoiceMojit.gkv_browserJS.label.QUARTER' ),
        QUARTER_TITLE = i18n( 'InvoiceMojit.invoicefactor_item.label.QUARTER' ),
        YEAR_TITLE = i18n( 'InvoiceMojit.invoicefactor_item.label.YEAR' ),
        YEAR = i18n( 'InvoiceMojit.gkv_browserJS.label.YEAR' ),
        BSNR = i18n( 'InvoiceMojit.gkv_browserJS.label.BSNR' ),
        LOCATION_TYPE = i18n( 'InvoiceMojit.gkv_browserJS.label.LOCATION_TYPE' ),
        LOCATION_TYPE_TITLE = i18n( 'InvoiceMojit.gkv_browserJS.label.LOCATION_TYPE_TITLE' ),
        KV = i18n( 'InvoiceMojit.gkv_browserJS.label.KV' ),
        QSL = i18n( 'InvoiceMojit.gkv_browserJS.label.QSL' ),
        STATUS = i18n( 'InvoiceMojit.gkv_browserJS.label.STATUS' ),
        FILES = i18n( 'InvoiceMojit.gkv_browserJS.label.FILES' ),
        LOCATION_NAME = i18n( 'InvoiceMojit.gkv_browserJS.label.LOCATION_NAME' ),
        LOCATION_TITLE = i18n( 'InvoiceMojit.gkv_delivery_settings.label.ESTABLISHMENT' ),
        USER = i18n( 'InvoiceMojit.gkv_browserJS.label.USER' ),
        PRICE_TOTAL = i18n( 'InvoiceMojit.gkv_browserJS.label.PRICE_TOTAL' ),
        QPZ = i18n( 'InvoiceMojit.gkv_browserJS.label.QPZ' ),
        QPZ_TITLE = i18n( 'InvoiceMojit.gkv_browserJS.title.QPZ' ),
        KBV_PM_STATS = i18n( 'InvoiceMojit.gkv_browserJS.title.KBV_PM_STATS' ),
        LAST_UPDATE = i18n( 'InvoiceMojit.gkv_browserJS.label.LAST_UPDATE' ),
        DELIVERY = i18n( 'InvoiceMojit.gkv_browserJS.label.DELIVERY' ),
        CONFIRM_REPLACE = i18n( 'InvoiceMojit.gkv_browserJS.message.CONFIRM_REPLACE' ),
        SUCCESSFULLY_MANUAL_SENT = i18n( 'InvoiceMojit.general.SUCCESSFULLY_MANUAL_SENT' ),
        SUCCESSFULLY_ENCRYPTED = i18n( 'InvoiceMojit.general.SUCCESSFULLY_ENCRYPTED' ),
        // SUCCESSFULLY_REPLACED = i18n( 'InvoiceMojit.general.SUCCESSFULLY_REPLACED' ),
        CHOOSE_SHIPPING_TYPE = i18n( 'InvoiceMojit.general.CHOOSE_SHIPPING_TYPE' ),
        ERR_MESSAGE = i18n( 'InvoiceMojit.general.ERR_MESSAGE' ),
        MANUAL = i18n( 'deliverysettings-schema.DeliveryType_E.MANUAL' ),
        ONE_CLICK = i18n( 'deliverysettings-schema.DeliveryType_E.1CLICK' );

    var
        hasFeature = Y.doccirrus.schemas.invoicelog.hasFeature,
        GKV_DELIVERY_SETTINGS_COLUMN_FEATURE = Y.doccirrus.schemas.invoicelog.FEATURES.GKV_DELIVERY_SETTINGS_COLUMN,
        SEE_CONTENT_FEATURE = Y.doccirrus.schemas.invoicelog.FEATURES.SEE_CONTENT,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        progressMap = {
            collect: i18n( 'InvoiceMojit.progress.collect_gkv' ),
            write: i18n( 'InvoiceMojit.progress.write' ),
            validate: i18n( 'InvoiceMojit.progress.validate' ),
            mergeSave: i18n( 'InvoiceMojit.progress.mergeSave' ),
            mergeValidate: i18n( 'InvoiceMojit.progress.mergeValidate' ),
            resetting: i18n( 'InvoiceMojit.progress.resetting' ),
            replace_references: i18n( 'InvoiceMojit.progress.replace_references' )
        },
        ONE_CLICK_FUNCTIONS_ENUM = Y.doccirrus.schemas.gkv_deliverysettings.ONE_CLICK_FUNCTIONS_ENUM,
        shippingListTo1ClickFnMap = {
            INVOICE: ONE_CLICK_FUNCTIONS_ENUM.FKT_2,
            PARTIAL_INVOICE: ONE_CLICK_FUNCTIONS_ENUM.FKT_2,
            TEST_INVOICE: ONE_CLICK_FUNCTIONS_ENUM.FKT_1,
            TEST_PARTIAL_INVOICE: ONE_CLICK_FUNCTIONS_ENUM.FKT_1
        };

    function getProgressbarElementId( kbvlogId ) {
        return 'progressbar-' + kbvlogId;
    }

    function getProgressbar( kbvlogId ) {
        var id = getProgressbarElementId( kbvlogId );
        return '<span id="' + id + '-time"></span></span><div class="progress invoice-progress"><div id="' + id + '" class="progress-bar progress-bar-info invoice-progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div></div>';
    }

    function getProgressText( type ) {
        return progressMap[type] || '';
    }

    function showTime( ms ) {

        if( !ms ) {
            return '';
        }

        var duration = moment.duration( ms ),
            formattedDuration = '';

        if( duration.hours() ) {
            formattedDuration += getDurationPad( duration.hours() + ':' );
        }

        return formattedDuration + getDurationPad( duration.minutes() ) + ':' + getDurationPad( duration.seconds() );
    }

    function getDurationPad( value ) {
        return ('00' + value).slice( -2 );
    }

    function updateProgressbar( kbvlogId, progress ) {
        var id = getProgressbarElementId( kbvlogId ),
            text = getProgressText( progress.type ),
            progressElement = document.getElementById( id ),
            progressTimeElement = document.getElementById( id + '-time' );
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

    //  follow kbvlogid given by router
    function loadAndOpenLog( kbvlogId, patientId ) {
        Y.doccirrus.jsonrpc.api.kbvlog
            .read( { query: { _id: kbvlogId } } )
            .then( openLogModal );

        function openLogModal( result ) {
            var data = result && result.data && result.data[0] ? result.data[0] : null;

            if ( !data ) {
                Y.log( 'Could not load deep linked kbv log: ' + kbvlogId, 'warn', NAME );
                return;
            }

            if ( patientId ) {
                data.openToPatient = patientId;
            }

            Y.doccirrus.modals.invoiceLogModal.show( data, 'KBV', function() {
                Y.log( 'Closed default modal, redirecting to default GKV hash fragment', 'debug', NAME );

                //  return to default route
                window.location.hash = '#/gkv';
            } );
        }
    }

    return {
        registerNode: function( node, key, options ) {
            var
                sentEnum = Y.doccirrus.schemas.kbvlog.sentEnumValues,
                notice = Y.doccirrus.DCWindow.notice,
                confirm = Y.doccirrus.DCWindow.confirm,
                actionButtonsViewModel,
                isReloading = false,
                kbvlogGkvTable,
                componentColumnCheckbox,
                invoiceConfiguration = options.binder.invoiceconfiguration(),
                openToLogId = ( options.data && options.data.kbvlogId ? options.data.kbvlogId : null ),
                openToPatientId = ( options.data && options.data.patientId ? options.data.patientId : null );

            function makeURL( id, label ) {
                var url = '/download/' + id;
                url = Y.doccirrus.infras.getPrivateURL( url );
                return '<a href="' + url + '">' + label + '</a> &nbsp;';
            }

            function showStats( statFiles ) {
                var html = '<ul>';
                statFiles.forEach( function( statFile ) {
                    html += ('<li>' + makeURL( statFile.fileId, statFile.fileName ) + '</li>');
                } );
                html += '</ul>';

                notice( {
                    title: KBV_PM_STATS,
                    type: 'info',
                    window: {width: 'small'},
                    message: html
                } );
            }

            kbvlogGkvTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-invoice-table',
                    pdfTitle: i18n( 'InvoiceMojit.gkv_browserJS.pdfTitle' ),
                    stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-kbvlogGkvTable',
                    states: ['limit'],
                    striped: false,
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.kbvlog.read,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkMode: 'single',
                            allToggleVisible: false
                        },
                        {
                            width: '48px',
                            forPropertyName: 'quarter',
                            label: QUARTER,
                            title: QUARTER_TITLE,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR_FOR_NUMBER,
                            isFilterable: true
                        },
                        {
                            width: '64px',
                            forPropertyName: 'year',
                            label: YEAR,
                            title: YEAR_TITLE,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR_FOR_NUMBER,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'locname',
                            label: LOCATION_NAME,
                            title: LOCATION_TITLE,
                            renderer: function( meta ) {
                                return meta.value || '';
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            width: '95px',
                            forPropertyName: 'commercialNo',
                            label: BSNR,
                            title: BSNR,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            width: '115px',
                            forPropertyName: 'slType',
                            label: LOCATION_TYPE,
                            title: LOCATION_TYPE_TITLE,
                            renderer: function( meta ) {
                                return i18n( 'InvoiceMojit.gkv_browserJS.locationType.' +
                                             (meta.value === 'super' ? 'superLocation' :
                                                 (meta.value === 'main' ? 'mainLocation' :
                                                     (meta.value === 'member' ? 'memberLocation' : 'location')
                                                 )
                                             )
                                           );
                            },
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options:  [
                                    { val: 'super', i18n: i18n( 'InvoiceMojit.gkv_browserJS.locationType.superLocation' ) },
                                    { val: 'main', i18n: i18n( 'InvoiceMojit.gkv_browserJS.locationType.mainLocation' ) },
                                    { val: 'member', i18n: i18n( 'InvoiceMojit.gkv_browserJS.locationType.memberLocation' ) },
                                    { val: 'location', i18n: i18n( 'InvoiceMojit.gkv_browserJS.locationType.location' ) }
                                ],
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }

                        },
                        {
                            width: '60px',
                            forPropertyName: 'destination',
                            label: KV,
                            title: KV,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: '_deliverySettings',
                            label: DELIVERY,
                            title: DELIVERY,
                            renderer: function( meta ) {
                                var row = meta.row,
                                    kvcMessageListLink = '';

                                // if kbvog was sent via kvconnect show link to message history
                                if( sentEnum.indexOf( row.status ) > -1 && row.sentId ) {
                                    kvcMessageListLink = '&nbsp;<a href="kvconnect#/kbvlog/' + row._id + '" target="_blank"><span class="glyphicon glyphicon-envelope"></span></a>';
                                }
                                if( -1 !== ['ACCEPTED', 'REJECTED'].indexOf( row.status ) &&
                                    !hasFeature( GKV_DELIVERY_SETTINGS_COLUMN_FEATURE, row._log_version, 'KBV' ) ) {
                                    // determine delivery type for old kbvlogs by checking "sender"
                                    return row.sender ? ONE_CLICK : MANUAL;
                                } else if( !meta.value ) {
                                    return '<a href="invoiceadmin#/gkv_delivery_settings" title="' + DELIVERY_SETTING_MISSING + '"><span style="color: #a94442;" class="glyphicon glyphicon-question-sign"></span></a>';
                                }
                                return ['<a href="invoiceadmin#/gkv_delivery_settings/' + meta.value._id + '">', Y.doccirrus.schemaloader.translateEnumValue( 'i18n', meta.value.deliveryType, Y.doccirrus.schemas.gkv_deliverysettings.types.DeliveryType_E.list, '-' ), '</a>', kvcMessageListLink].join( '' );
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'totalItems',
                            label: QSL,
                            renderer: function( meta ) {
                                var html, pdfUrl;

                                if( !hasFeature( SEE_CONTENT_FEATURE, meta.row._log_version, 'KBV' ) ) {
                                    return meta.value + '&nbsp;<span class="glyphicon glyphicon-question-sign" title="' + CONTENT_NOT_AVAILABLE + '"></span>';
                                }

                                html = '<a href="#">' + meta.value + '</a>';

                                if( meta.row.isContentOutdated === true ) {
                                    html = html + '&nbsp;<span class="text-warning glyphicon glyphicon-warning-sign" aria-hidden="true" title="' + IS_CONTENT_OUTDATED + '"></span>';
                                }

                                //  Add link to PDF if available
                                if( meta.row && meta.row.pdfMediaId && '' !== meta.row.pdfMediaId ) {
                                    //  TODO: add PDF ICON
                                    pdfUrl = '/media/' + meta.row.pdfMediaId + '_original.APPLICATION_PDF.pdf';
                                    pdfUrl = Y.doccirrus.infras.getPrivateURL( pdfUrl );
                                    html = html + '<br/>' + '<a href="' + pdfUrl + '" target="_blank">PDF</a>';
                                }

                                if (meta.row.sourceConFiles && meta.row.sourceConFiles.length){
                                    return '-';
                                }
                                //  TODO: add link to ZIP if PDF available

                                return html;
                            },
                            pdfRenderer: function( meta ) {
                                return meta.value;
                            }
                        },
                        {
                            forPropertyName: 'status',
                            label: STATUS,
                            title: STATUS,
                            renderer: function( meta ) {
                                var translation,
                                    data = meta.row,
                                    _value = meta.value,
                                    errors = data.output,
                                    warnings = data.warnings,
                                    advices = data.advices,
                                    errorString = '',
                                    _statusList = Y.doccirrus.schemas.invoicelog.types.Status_E.list;

                                function displaySeparated( arr, _char ) {
                                    var i, arr2 = [];
                                    if( !Array.isArray( arr ) ) {
                                        return '';
                                    }
                                    for( i = 0; i < arr.length; i++ ) {
                                        if( Array.isArray( arr[i] ) && arr[i].length ) {
                                            arr2.push( arr[i].length );
                                        } else if( arr[i] ) {
                                            arr2.push( arr[i] );
                                        } else {
                                            continue;
                                        }
                                    }
                                    return arr2.join( _char );
                                }

                                function translate( val, lang ) {
                                    var status = Y.Array.find( _statusList, function( status ) {
                                        return status.val === val;
                                    } );
                                    return status[lang];
                                }

                                if( !_value ) {
                                    return '';
                                }

                                translation = translate( _value, 'i18n' );

                                if( sentEnum.indexOf( _value ) > -1 ) {
                                    if( data.test && data.test ) {
                                        translation += ' Test';
                                    } else if( data.complete && data.complete ) {
                                        translation += ' Abschluss';
                                    } else {
                                        translation += ' Teil';
                                    }
                                    if( data.replacement && data.replacement ) {
                                        translation += ' Ersatz';
                                    }

                                } else if( 'CANCELED' === _value ) {
                                    return translation;
                                } else {
                                    errorString = displaySeparated( [errors, warnings, advices], '/' );
                                    if( errorString ) {
                                        translation += '&nbsp;(' + errorString + ')';
                                    }
                                }

                                if( data.sourceConFiles && data.sourceConFiles.length ) {
                                    translation += '&nbsp;(ZG)';
                                }

                                if( data.isPreValidated && 'VALID' === _value || 'INVALID' === _value ) {
                                    translation += '&nbsp;(VP)';
                                }
                                if( 'VALIDATING' === _value || 'APPROVING' === _value || 'REPLACING' === _value ||  'MERGING' === _value ) {
                                    return '<a href="#" class="kbvlogmodel-status kbvlogmodel-status-' + _value.toLowerCase() + '">' + translation + '</a>' + getProgressbar( data._id );
                                } else {
                                    return '<a href="#" class="kbvlogmodel-status kbvlogmodel-status-' + _value.toLowerCase() + '">' + translation + '</a>';
                                }
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
                            width: '85px',
                            forPropertyName: 'files',
                            label: FILES,
                            renderer: function( meta ) {
                                var html = '',
                                    kbvlog = meta.row,
                                    conFileId = kbvlog.conFileId,
                                    xkmFileId = kbvlog.xkmFileId,
                                    statFiles = kbvlog.statFiles,
                                    sourceConFiles = kbvlog.sourceConFiles,
                                    scanProtocolId = kbvlog.scanProtocolId,
                                    i;
                                if( conFileId ) {
                                    html += makeURL( conFileId, 'CON' );
                                }

                                if( xkmFileId ) {
                                    html += makeURL( xkmFileId, 'XKM' );
                                }

                                if( sourceConFiles ) {
                                    for( i = 0; i < sourceConFiles.length; i++ ) {
                                        html += '<br>' + makeURL( sourceConFiles[i].conFileId, (i + 1) + '. CON' );
                                    }
                                }
                                if (scanProtocolId) {
                                    html += '<br>' + makeURL( scanProtocolId,   'Log' );
                                }

                                if( statFiles && statFiles.length ) {
                                    html += ('<a title="' + KBV_PM_STATS + '"><span class="glyphicon glyphicon-inbox"></span></a>');
                                }

                                return html;
                            },
                            pdfRenderer: function( meta ) {
                                var text = '',
                                    kbvlog = meta.row,
                                    conFileId = kbvlog.conFileId,
                                    xkmFileId = kbvlog.xkmFileId;

                                if( conFileId ) {
                                    text = text + 'CON ';
                                }

                                if( xkmFileId ) {
                                    text = text + 'XKM ';
                                }

                                return text;
                            }
                        },
                        {
                            forPropertyName: 'user.name',
                            label: USER,
                            title: USER,
                            renderer: function( meta ) {
                                var data = meta.row,
                                    user = data.user;

                                if( user && user.length ) {
                                    return user[user.length - 1].name;
                                } else {
                                    return '';
                                }
                            },
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'lastUpdate',
                            label: LAST_UPDATE,
                            title: LAST_UPDATE,
                            renderer: Y.doccirrus.invoicelogutils.renderDateAndTime,
                            sortInitialIndex: 0,
                            isSortable: true,
                            isFilterable: true,
                            direction: 'DESC',
                            queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR
                        },
                        {
                            forPropertyName: 'QPZ',
                            label: QPZ,
                            title: QPZ_TITLE,
                            renderer: function( meta ) {
                                return meta.value ? meta.value.filter( function( item ) {
                                    return item.totalTime;
                                } ).map( function( item ) {
                                    var criticalTime = item.totalTime > (780 * 60),
                                        physician = item.physician,
                                        physicianName = [physician.firstname, physician.lastname].join( ' ' );

                                    return ['<span class="badge"', criticalTime ? ' style="background-color: red;"' : '', ' title="', physicianName, '">', physician.initials ? (physician.initials + ' ') : '', item.totalTime, '</span>'].join( '' );
                                } ).join( ' ' ) : '-';
                            },
                            isFilterable: false,
                            isSortable: false
                        },
                        {
                            forPropertyName: 'priceTotal',
                            label: PRICE_TOTAL,
                            title: PRICE_TOTAL,
                            renderer: function( meta ) {
                                if (meta.row.sourceConFiles && meta.row.sourceConFiles.length){
                                    return '-';
                                }
                                return meta.value ? Y.doccirrus.comctl.numberToLocalString( meta.value ) : '-';
                            },
                            isSortable: true
                        }
                    ],
                    onRowClick: function( meta, evt ) {
                        var
                            colName = meta.col.forPropertyName,
                            data = meta.row,
                            location = data.mainLocationId,
                            invoiceLogId = data._id.toString();

                        //  open aggregate PDF in new tab
                        if( colName === 'totalItems' && evt && evt.target && evt.target.innerHTML && 'PDF' === evt.target.innerHTML ) {
                            return;
                        }

                        // here we actual want the default behavior of the a tag
                        if( -1 === ['files', '_deliverySettings'].indexOf( colName ) ) {
                            evt.preventDefault();
                        }

                        if( colName === 'status' ) {
                            // show error log modal
                            Y.doccirrus.modals.invoiceErrorLogModal.show( location, invoiceLogId, 'KBV', function() {
                                reloadTable();
                            });
                        } else if( colName === 'totalItems' && hasFeature( SEE_CONTENT_FEATURE, data._log_version, 'KBV' ) ) {
                            Y.doccirrus.modals.invoiceLogModal.show( data, 'KBV', function() {
                                reloadTable();
                            } );
                        } else if( colName === 'files' ) {
                            if( data.statFiles && data.statFiles.length ) {
                                showStats( data.statFiles );
                            }
                        }

                        return false;
                    },
                    getCssRow: function( $context, css ) {
                        var row = $context.$data;
                        if( row && ['main', 'member'].includes(row.slType)){
                            css['KoTable-isSelected-row'] = true;
                        }
                        if( row && 'REPLACED' === row.status ) {
                            css.info = true;
                        }
                    } // TODOOO kvc highlight connected(replaced/same bs? q? year) logs on hover?
                }
            } );

            componentColumnCheckbox = kbvlogGkvTable.getComponentColumnCheckbox();

            function checkSelection( checkIfModified, cb ) {
                var rtn = null, selection = [];

                function finalCb() {
                    rtn = selection.map( function( selected ) {
                        return selected._id;
                    } );

                    cb( rtn );
                }

                if( !componentColumnCheckbox.checked().length ) {
                    notice( {
                        type: 'error',
                        message: ERR_MESSAGE
                    } );
                    return;
                }
                selection = componentColumnCheckbox.checked();
                if( checkIfModified ) {
                    if( selection.some( function( row ) {
                        return row.isContentOutdated === true;
                    } ) ) {
                        Y.doccirrus.modals.invoicelogContentHasChangedModal.show( {
                            callback: function( action ) {
                                if( action === 'next' ) {
                                    finalCb();
                                } else if( action === 'pre_check' ) {
                                    actionButtonsViewModel.preValidate.action();
                                }
                            }
                        } );
                        return;
                    }
                }
                finalCb();
            }

            function reloadTable() {
                var selected = componentColumnCheckbox.checked(),
                    ids = Array.isArray( selected ) && selected.length ? [selected[0]._id] : selected;
                if( isReloading ) {
                    return;
                }
                componentColumnCheckbox.uncheckAll();
                isReloading = true;
                if( kbvlogGkvTable ) {
                    kbvlogGkvTable.reload( {
                        done: function() {
                            componentColumnCheckbox.checkItemsByProperty( ids );
                        },
                        always: function() {
                            isReloading = false;
                        }
                    } );
                }
            }

            function createLogsCb( response ) {
                //var data =response.data;
                var params,
                    data = (response && response.data || []).filter( function( entry ) {
                        return !!entry.quarterList;
                    } );

                if( Array.isArray( data ) && data.length ) {
                    Y.doccirrus.modals.kbvLogCreateModal.show( data, function( checkedQuarters ) {
                        if( !checkedQuarters ) {
                            return;
                        }
                        params = {
                            quartersToCreate: checkedQuarters.map( function( quarterDef ) {
                                return {
                                    locationId: quarterDef.locationId,
                                    quarter: quarterDef.checked.quarter,
                                    year: quarterDef.checked.year,
                                    commercialNo: quarterDef.commercialNo,
                                    locname: quarterDef.locname,
                                    kv: quarterDef.kv,
                                    superLocation: quarterDef.superLocation,
                                    slMembers: quarterDef.slMembers,
                                    slName: quarterDef.slName,
                                    slMembersData: quarterDef.slMembersData
                                };
                            } ),
                            forceCreation: true
                        };

                        if( !params.quartersToCreate.length ) {
                            return;
                        }
                        Promise.resolve( Y.doccirrus.jsonrpc.api.kbvlog.createLogs( params ) ).then( function() {
                            reloadTable();
                        } ).catch( function( err ) {
                            Y.log( 'could not create user-defined kbvlogs ' + err, 'error', NAME );
                        } );

                    } );
                }

            }

            function ajaxCall( url, success, noReload, cb ) {

                var response = null,
                    cbFunc = function() {
                        if( !noReload ) {
                            reloadTable();
                        }
                        kbvlogGkvTable.masked( false );
                        if( 'function' === typeof cb ) {
                            cb( response );
                        }
                    };

                kbvlogGkvTable.masked( true );

                $.ajax( {
                    type: 'GET',
                    xhrFields: {withCredentials: true},
                    url: Y.doccirrus.infras.getPrivateURL( url ),
                    success: function( res ) {
                        var messages = [];
                        response = res;

                        if( res && res.meta && res.meta.errors && res.meta.errors.length ) {
                            res.meta.errors.forEach( function( error ) {
                                messages.push(error.message || Y.doccirrus.errorTable.getMessage( {code: error.status || error.code, data: error.data} ));
                            });

                            if( res.meta.errors.some( function( err ) {
                                    return err.code === 2026;
                                } ) ) {
                                messages.push( '<a href="/invoiceadmin" target="_blank">Neues Zertifikat erstellen</a>' );
                            }
                            notice( {
                                type: 'error',
                                message: messages.join( '<hr>' ),
                                window: {width: 'medium'},
                                callback: cbFunc
                            } );
                        } else if( res && res.meta && res.meta.warnings && res.meta.warnings.length ) {
                            messages = Y.doccirrus.errorTable.getMessages( res.meta.warnings );
                            notice( {
                                type: 'warn',
                                window: {width: 'medium'},
                                message: messages.join( '<hr>' ),
                                callback: cbFunc
                            } );
                        } else if( success ) {
                            notice( {
                                type: 'info',
                                window: {width: 'medium'},
                                message: success,
                                callback: cbFunc
                            } );
                        } else {
                            cbFunc();
                        }

                    },
                    error: function( res ) {
                        notice( {
                            type: 'error',
                            message: res.message || Y.doccirrus.errorTable.getMessage( {code: res.status || res.code} ),
                            callback: cbFunc
                        } );
                    }
                } );
            }

            function enableSendBtns( state ) {
                if( !state ) {
                    return false;
                }
                var status = state.status;
                return (!state.slType || state.slType === 'super' ) && (
                    ('ENCRYPTED' === status) ||
                    ('SENT_ERR' === status) ||
                    ('REJECTED' === status) ||
                    ('TIMEOUT' === status)
                );
            }

            actionButtonsViewModel = Y.doccirrus.invoicelogutils.createActionButtonsViewModel( {
                create: {
                    action: function() {
                        ajaxCall(
                            '/1/kbvlog/:createLogs/',
                            null,
                            null,
                            createLogsCb
                        );
                    },
                    enabled: true,
                    visible: true
                },
                remove: {
                    action: function() {
                        checkSelection( false, function( selection ) {
                            if( selection ) {
                                ajaxCall(
                                    '/1/kbvlog/:remove/?id=' + selection,
                                    null
                                );
                            }
                        } );
                    },
                    enabled: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        var enabled = -1 !== ['CREATED', 'VALID', 'VALIDATION_ERR', 'CRYPT_ERR', 'ENCRYPTED', 'INVALID', 'MERGED', 'MERGING_ERR'].indexOf( state.status );
                        return enabled;
                    },
                    visible: true
                },
                replace: {
                    action: function() {
                        checkSelection( false, function( selection ) {
                            if( !selection ) {
                                return;
                            }

                            confirm( {
                                message: CONFIRM_REPLACE,
                                callback: function( result ) {
                                    if( !result.success ) {
                                        return;
                                    }
                                    ajaxCall(
                                        '/1/kbvlog/:replaceKBVLog/?id=' + selection
                                    );
                                }
                            } );
                        } );
                    },
                    enabled: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        // TODOOO kvc check also delivery settings? but we need this for manual sending too
                        return (!state.slType || state.slType === 'super' ) && -1 !== ['ACCEPTED', 'REPLACE_ERR'].indexOf( state.status );
                    },
                    visible: true
                },
                preValidate: {
                    action: function() {
                        checkSelection( false, function( selection ) {
                            if( selection ) {
                                ajaxCall(
                                    '/1/kbvlog/:validate/?id=' + selection + '&preValidation=true',
                                    null,
                                    true
                                );
                            }
                        } );
                    },
                    enabled: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        var status = state.status;
                        return ('CREATED' === status) ||
                               ('VALID' === status) ||
                               ('INVALID' === status) ||
                               ('ENCRYPTED' === status) ||
                               ('SENT_ERR' === status) ||
                               ('VALIDATION_ERR' === status) ||
                               ('TIMEOUT' === status) ||
                               ('CANCELED' === status);
                    },
                    visible: true
                },
                validate: {
                    action: function() {
                        checkSelection( true, function( selection ) {
                            if( selection ) {
                                ajaxCall(
                                    '/1/kbvlog/:validate/?id=' + selection,
                                    null,
                                    true
                                );
                            }
                        } );
                    },
                    enabled: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        var status = state.status;
                        return ('CREATED' === status) ||
                               ('VALID' === status) ||
                               ('INVALID' === status) ||
                               ('ENCRYPTED' === status) ||
                               ('SENT_ERR' === status) ||
                               ('VALIDATION_ERR' === status) ||
                               ('TIMEOUT' === status) ||
                               ('CANCELED' === status);
                    },
                    visible: true
                },
                approve: {
                    action: function() {
                        checkSelection( true, function( selection ) {
                            var selectedLog;

                            function approve() {
                                ajaxCall(
                                    '/1/invoicelog/:approve/?invoiceType=KBV&id=' + selection,
                                    null,
                                    true
                                );
                            }

                            if( !selection ) {
                                return;
                            }

                            selectedLog = componentColumnCheckbox.checked();
                            if( !selectedLog && !selectedLog[0] ) {
                                return;
                            }

                            Y.doccirrus.modals.invoiceLogApproveModal.show( selectedLog[0], approve );
                        } );
                    },
                    visible: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        var isPreValidated = state.isPreValidated,
                            notApproved = state.notApproved;
                        return isPreValidated && (notApproved[0] || notApproved[1] || notApproved[2]);
                    },
                    enabled: true
                },
                encrypt: {
                    action: function() {
                        checkSelection( true, function( selection ) {
                            if( selection ) {
                                ajaxCall(
                                    '/1/kbvlog/:encryptAccountStatement/?id=' + selection,
                                    SUCCESSFULLY_ENCRYPTED
                                );
                            }
                        } );
                    },
                    enabled: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        return (!state.slType || state.slType === 'super' ) && !state.isPreValidated && 'VALID' === state.status;
                    },
                    visible: true
                },
                send: {
                    action: function() {
                        var
                            shippingType;
                        checkSelection( false, function( selection ) {
                            if( selection ) {
                                shippingType = actionButtonsViewModel.shipping();

                                if( !shippingType ) {
                                    notice( {
                                        title: 'Meldungen',
                                        type: 'error',
                                        window: {width: 'small'},
                                        message: CHOOSE_SHIPPING_TYPE
                                    } );
                                    return;
                                }

                                ajaxCall(
                                    '/1/kbvlog/:sendAccountStatement/?id=' + selection + '&shippingType=' + shippingType,
                                    null
                                );
                            }
                        } );

                    },
                    visible: function() {
                        var state = this.state();
                        if( !state || !state._deliverySettings || !state._deliverySettings.deliveryType ) {
                            return false;
                        }

                        return '1CLICK' === state._deliverySettings.deliveryType;
                    },
                    enabled: enableSendBtns
                },
                manualSend: {
                    action: function() {

                        function finishCb( id ) {
                            ajaxCall( '/1/kbvlog/:manualSend/?id=' + id, SUCCESSFULLY_MANUAL_SENT );
                        }

                        var
                            node, aDCWindow,
                            selected = componentColumnCheckbox.checked()[0],
                            manualSendModel = new Y.doccirrus.uam.ManualSendModel( {
                                callback: finishCb,
                                selectedLog: selected,
                                deliverySettings: selected._deliverySettings
                            }, [
                                'manual-send-step-1',
                                'manual-send-step-2',
                                'manual-send-step-3'
                            ] );

                        node = Y.Node.create( '<div></div>' );
                        // load table template & bind a ViewModel
                        YUI.dcJadeRepository.loadNodeFromTemplate(
                            'manual_send',
                            'InvoiceMojit',
                            {},
                            node,
                            function templateLoaded() {
                                ko.applyBindings( manualSendModel, node.getDOMNode() );
                            }
                        );
                        aDCWindow = new Y.doccirrus.DCWindow( {
                            bodyContent: node,
                            title: 'Manueller Versand Schritt 1/3',
                            type: 'info',
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    {
                                        name: 'next',
                                        label: 'Ablegen',
                                        isDefault: true,
                                        action: function() {
                                            manualSendModel.next();
                                        }
                                    }
                                ]
                            }
                        } );
                        manualSendModel.setWindow( aDCWindow );
                    },
                    visible: function() {
                        var state = this.state();
                        if( !state || !state._deliverySettings || !state._deliverySettings.deliveryType ) {
                            return false;
                        }

                        return 'MANUAL' === state._deliverySettings.deliveryType;
                    },
                    enabled: enableSendBtns
                },
                mergeConFile: {
                    action: function() {
                        var
                            node, aDCWindow,
                            KoViewModel = Y.doccirrus.KoViewModel,
                            mergeConFiles_TITLE = i18n( 'InvoiceMojit.gkv_browserJS.mergeConFiles.TITLE' ),
                            mergeConFiles_mergeButton = i18n( 'InvoiceMojit.gkv_browserJS.mergeConFiles.MERGE_BUTTON' ),
                            MergeConFilesViewModel = KoViewModel.getConstructor( 'MergeConFilesViewModel' ),
                            state = this.state(),
                            mergeConFiles = new MergeConFilesViewModel( state );
                        node = Y.Node.create( '<div></div>' );
                        // load table template & bind a ViewModel
                        YUI.dcJadeRepository.loadNodeFromTemplate(
                            'MergeConFilesViewModel',
                            'InvoiceMojit',
                            {},
                            node,
                            function templateLoaded() {
                                aDCWindow = new Y.doccirrus.DCWindow( {
                                    bodyContent: node,
                                    title: mergeConFiles_TITLE,
                                    type: 'info',
                                    centered: true,
                                    modal: true,
                                    width: Y.doccirrus.DCWindow.SIZE_LARGE,
                                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                                    height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                    minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                    render: document.body,
                                    buttons: {
                                        header: [
                                            {
                                                name: 'close',
                                                isDefault: true,
                                                action: function() {
                                                    mergeConFiles.onCloseModal( aDCWindow );
                                                }
                                            }],
                                        footer: [
                                            {
                                                name: 'CANCEL',
                                                isDefault: true,
                                                action: function() {
                                                    mergeConFiles.onCloseModal( aDCWindow );
                                                }
                                            },
                                            {
                                                name: 'merge',
                                                label: mergeConFiles_mergeButton,
                                                isDefault: true,
                                                action: function() {
                                                    mergeConFiles.mergeConFiles( aDCWindow, kbvlogGkvTable );
                                                }
                                            }
                                        ]
                                    }
                                } );
                                ko.applyBindings( mergeConFiles, node.getDOMNode() );
                                mergeConFiles.isDisabledMergeButton(aDCWindow);
                            }
                    );
                    },
                    visible: function() {
                        return invoiceConfiguration.conFileSplicing();
                    },
                    enabled: function( state ) {
                        if( !state ) { // state.status = PREVALIDATED
                            return false;
                        }
                        return (!state.slType || state.slType === 'super' ) && (-1 !== ['VALID'].indexOf( state.status ) )&& !state.isPreValidated;
                    }
                },
                asv: {
                    action: function() {
                        var state = this.state();
                        triggerAsvProcess( state );
                    },
                    visible: function() {
                       var state = this.state();

                        return state && 'CREATED' !== state.status &&  'INVALID' !== state.status && state.conFileId &&
                               Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.ASV );
                    },
                    enabled: true
                }
            } );

            function is1ClickFnAllowed( type, kvcaEntry ) {
                var oneClickFnEnumVal = shippingListTo1ClickFnMap[type];
                if( !oneClickFnEnumVal ) {
                    return true;
                }

                return Y.doccirrus.schemas.gkv_deliverysettings.has1ClickFn( kvcaEntry, oneClickFnEnumVal );
            }

            function disableOption( item ) {
                if( !item ) {
                    return false;
                }
                return ko.computed( function() {
                    var log = actionButtonsViewModel.state(),
                        _deliverySettings = log && log._deliverySettings,
                        kvcaEntry = log && log.kvcaEntry && log.kvcaEntry[0],
                        status = log && log.status,
                        allowedStatus = 'ENCRYPTED' === status || 'SENT_ERR' === status,
                        isReplacementLog = Boolean( log && log.replacement ),
                        isReplacementItem = 'REPLACEMENT' === item,
                        oneClickFnAllowed;
                    if( !log || !_deliverySettings || !kvcaEntry ) {
                        return true;
                    }

                    oneClickFnAllowed = is1ClickFnAllowed( item, kvcaEntry );

                    if( isReplacementLog ) {
                        return !isReplacementItem;
                    }

                    if( isReplacementLog && isReplacementItem ) {
                        return !oneClickFnAllowed || !allowedStatus;
                    } else if( !isReplacementLog && isReplacementItem ) {
                        return true;
                    } else if( isReplacementLog && !isReplacementItem ) {
                        return !oneClickFnAllowed;
                    } else {
                        return !oneClickFnAllowed || !allowedStatus;
                    }
                } );
            }

            function triggerAsvProcess( kbvlog ) {
                if( !Modernizr.localstorage ) {
                    notice( {
                        title: 'Fehler',
                        type: 'error',
                        window: {width: 'xlarge'},
                        message: 'Localstorage steht nicht zur Verfügung!'
                    } );
                }

                if( !kbvlog.conFileId ) {
                    Y.log( 'no con file id specified', 'error' );
                    return;
                }

                window.location.href = "/asv/" + kbvlog.conFileId + "/" + Y.doccirrus.auth.getUserId();
            }

            actionButtonsViewModel._shippingList = Y.doccirrus.schemas.kvcmessage.getGkvInvoiceMessageTypes();

            actionButtonsViewModel._shippingList.unshift( {
                val: '',
                '-de': 'Versandart?'
            } );

            actionButtonsViewModel.shipping = ko.observable( actionButtonsViewModel._shippingList[0] );

            actionButtonsViewModel.buttonGenerateI18n = i18n('InvoiceMojit.gkv_browser.button.GENERATE');
            actionButtonsViewModel.buttonRemoveI18n = i18n('InvoiceMojit.gkv_browser.button.REMOVE');
            actionButtonsViewModel.buttonReplaceI18n = i18n('InvoiceMojit.gkv_browser.button.REPLACE');
            actionButtonsViewModel.buttonPrecheckI18n = i18n('InvoiceMojit.gkv_browser.button.PRECHECK');
            actionButtonsViewModel.buttonApproveI18n = i18n('InvoiceMojit.gkv_browser.button.APPROVE');
            actionButtonsViewModel.buttonCheckI18n = i18n('InvoiceMojit.gkv_browser.button.CHECK');
            actionButtonsViewModel.buttonEncodeI18n = i18n('InvoiceMojit.gkv_browser.button.ENCODE');
            actionButtonsViewModel.deliveryMethodI18n = i18n('InvoiceMojit.gkv_browser.placeholder.DELIVERY_METHOD');
            actionButtonsViewModel.buttonManualDeliveryI18n = i18n('InvoiceMojit.gkv_browser.button.MANUAL_DELIVERY');
            actionButtonsViewModel.buttonMergeConFileI18n = i18n('InvoiceMojit.gkv_browser.button.MERGE_CON_FILE');
            actionButtonsViewModel.buttonASVBillingI18n = i18n('InvoiceMojit.gkv_browser.button.ASV_BILLING');
            actionButtonsViewModel.buttonOneClickDeliveryI18n = i18n('InvoiceMojit.gkv_browser.button.ONE_CLICK_DELIVERY');

            ko.computed( function() {
                var
                    selectedRows = componentColumnCheckbox.checked();

                actionButtonsViewModel.state( selectedRows && selectedRows.length ? selectedRows[0] : null );
            } );

            Y.doccirrus.communication.on( {
                event: 'invoicelogAction',
                done: function( message ) {
                    var data = message.data && message.data[0];
                    if( 'KBV' === data.invoiceType ) {
                        if( 'progress' === data.state ) {
                            updateProgressbar( data.id, data.progress );
                        } else {
                            reloadTable();
                        }
                    }
                },
                handlerId: 'updateGkvTable'
            } );

            actionButtonsViewModel._shippingListOptions = function( option, item ) {
                ko.applyBindingsToNode( option, {
                    disable: disableOption( item.val )
                } );
            };

            ko.applyBindings( {
                invoiceconfiguration: options.binder.invoiceconfiguration,
                kbvlogGkvTable: kbvlogGkvTable,
                actionButtons: actionButtonsViewModel
            }, node.one( '#gkvBrowser' ).getDOMNode() );

            //  update table when PUBRECEIPTs / PDFs generated for entire invoice log
            function addWsEventListeners() {
                //  add socket event listener for PUBRECEIPTs / patientenquittungen
                Y.doccirrus.communication.on( {
                    event: 'pubreceiptCompiledForInvoiceLog',
                    // omitting this option will cause whichever is the current socket to be used
                    //socket: Y.doccirrus.communication.getSocket( '/' ),
                    done: onPubreceiptGeneratedForPatient,
                    handlerId: 'inVoicePubreceiptPatientListener'
                } );

                function onPubreceiptGeneratedForPatient( /* message */ ) {

                    //var data = message.data && message.data[0];
                    //  PDF will have been generated at this point,  prompt the user to open or print it
                    //if ( data.mediaId && '' !== data.mediaId ) {
                    //    data.documentUrl = '/media/' + data.mediaId + '_original.APPLICATION_PDF.pdf';
                    //    Y.doccirrus.modals.printPdfModal.show( data );
                    //}

                    kbvlogGkvTable.reload();
                }
            }

            /*
            function removeWsEventListeners() {
                Y.doccirrus.communication.off( 'pubreceiptCompiledForInvoiceLog', 'inVoicePubreceiptPatientListener' );
            }
            */

            addWsEventListeners();

            //  open modal if deep linked from casefile
            if ( openToLogId ) {
                Y.log( 'Deep link to KBV log: ' + openToLogId + ' patient: ' + openToPatientId, 'debug', NAME );
                loadAndOpenLog( openToLogId, openToPatientId );
            }

        }
    };
}