/**
 * User: do
 * Date: 31/03/14  17:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*exported _fn */

/*eslint prefer-template:0, strict: 0 */
/*global YUI, ko, $, moment, async */
/*exported YUI*/

function _fn( Y, NAME ) {
    'use strict';

    var
        hasFeature = Y.doccirrus.schemas.invoicelog.hasFeature,
        SEE_CONTENT_FEATURE = Y.doccirrus.schemas.invoicelog.FEATURES.SEE_CONTENT,

        i18n = Y.doccirrus.i18n,
        IS_CONTENT_OUTDATED = i18n( 'invoicelog-schema.InvoiceLog_T.isContentOutdated.i18n' ),
        CONFIRM_REPLACE = i18n( 'InvoiceMojit.gkv_browserJS.message.CONFIRM_REPLACE' ),
        DISPLAYED = i18n( 'InvoiceMojit.gkv_browserJS.message.DISPLAYED' ),
        CONFIRM_KEEP = i18n( 'InvoiceMojit.gkv_browserJS.message.CONFIRM_KEEP' ),
        CREATE_CONFIG_AND_RECREATE_LOG = i18n( 'InvoiceMojit.gkv_browserJS.tooltip.CREATE_CONFIG_AND_RECREATE_LOG' ),
        BSNR = i18n( 'InvoiceMojit.gkv_browserJS.label.BSNR' ),
        SLD = i18n( 'InvoiceMojit.gkv_browserJS.label.SLD' ),
        STATUS = i18n( 'InvoiceMojit.gkv_browserJS.label.STATUS' ),
        FILES = i18n( 'InvoiceMojit.gkv_browserJS.label.FILES' ),
        USER = i18n( 'InvoiceMojit.gkv_browserJS.label.USER' ),
        LAST_UPDATE = i18n( 'InvoiceMojit.gkv_browserJS.label.LAST_UPDATE' ),
        LOCATION_NAME = i18n( 'InvoiceMojit.gkv_browserJS.label.LOCATION_NAME' ),
        CREATED_AT = i18n( 'InvoiceMojit.gkv_browserJS.label.CREATED_AT' ),
        PVSLOG_FILTERS = i18n( 'InvoiceMojit.gkv_browserJS.label.PVSLOG_FILTERS' ),
        PRICE_TOTAL = i18n( 'InvoiceMojit.gkv_browserJS.label.PRICE_TOTAL' ),
        PHYSICIANS = i18n( 'InvoiceMojit.gkv_browserJS.label.PHYSICIANS' ),
        START_DATE = i18n( 'InvoiceMojit.cashbookJS.messages.FROM' ),
        END_DATE = i18n( 'InvoiceMojit.cashbookJS.messages.TO' ),
        DELIVERY = i18n( 'InvoiceMojit.gkv_browserJS.label.DELIVERY' ),

        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),

        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        confirm = Y.doccirrus.DCWindow.confirm,
        notice = Y.doccirrus.DCWindow.notice,
        progressMap = {
            collect: i18n( 'InvoiceMojit.progress.collect' ),
            resetting: i18n( 'InvoiceMojit.progress.resetting' ),
            replace_references: i18n( 'InvoiceMojit.progress.replace_references' ),
            sending: i18n( 'InvoiceMojit.progress.sending' ),
            generatingPadx: i18n( 'InvoiceMojit.progress.generatingPadx' ),
            invoicing: i18n( 'InvoiceMojit.progress.invoicing' ),
            pdf: i18n( 'InvoiceMojit.progress.pdf' )
        },
        ActivityModel = Y.doccirrus.KoViewModel.getConstructor( 'ActivityModel' );

    function createLinkOnInvoice( invoice ) {
        var
            date = moment( invoice.timestamp ).format( 'DD.MM.YYYY' ),
            invoiceNo = invoice.invoiceNo,
            formatPrice = Y.doccirrus.comctl.numberToLocalString( invoice.price ),
            price = '<b style="float: right;">' + formatPrice + '</b>',
            content = ActivityModel.renderContentAsHTML( invoice ),
            patientFirstName = invoice.patientFirstName,
            patientLastName = invoice.patientLastName,
            status = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', invoice.status, 'i18n' ),
            ruleStatus = '<a href="#" class="kbvlogmodel-status kbvlogmodel-status-' + (invoice.ruleStatus || '').toLowerCase() + '">' + Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'RuleStatus_E', invoice.ruleStatus || 'NOT_VALIDATED', 'i18n' ) + '</a>';

        return '<a href="incase#/activity/' + invoice._id + '"  target="_blank">' +
               date + '</a><span>&nbsp;' +
               ( status ? '<i>' + status + '</i>&nbsp;' : '' ) +
               ( invoiceNo ? invoiceNo + '&nbsp;' : '' ) +
               price + '&nbsp;' +
               content + '&nbsp;' +
               ( patientFirstName ? patientFirstName + '&nbsp;' : '' ) +
               ( patientLastName ? patientLastName + '&nbsp;' : '' ) +
               ruleStatus +
               '</span>';
    }

    function createCountLabel( displayed, total  ) {
        return "<p>" + DISPLAYED + " " + displayed +"/"+ total + "</p>";
    }

    function isOneClick( deliverySettings ) {
        return Boolean( deliverySettings && deliverySettings.oneClickServer && deliverySettings.oneClickName && deliverySettings.oneClickPass );
    }

    function getProgressbarElementId( pvslogId ) {
        return 'progressbar-' + pvslogId;
    }

    function getProgressbar( pvslogId ) {
        var id = getProgressbarElementId( pvslogId );
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

    function updateProgressbar( pvslogId, progress ) {
        var id = getProgressbarElementId( pvslogId ),
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

    function hideProgressBar( pvslogId ) {
        var id = getProgressbarElementId( pvslogId );
        $( '#' + id ).hide();
    }

    function enableSendBtns( state, onlyPreValidated ) {
        if( !state ) {
            return false;
        }
        var status = state.status;
        return (state.isPreValidated && onlyPreValidated || !state.isPreValidated && !onlyPreValidated) && (
                ('VALID' === status) ||
                ('SENT_ERR' === status) ||
                ('REJECTED' === status) ||
                ('TIMEOUT' === status)
            );
    }

    //  follow pvslogid given by router
    function loadAndOpenLog( api, cashlog, pvslogId, patientId ) {
        Y.doccirrus.jsonrpc.api[api]
            .read( {query: {_id: pvslogId}} )
            .then( openLogModal );

        function openLogModal( result ) {
            let data = result && result.data && result.data[0] ? result.data[0] : null;

            if( !data ) {
                Y.log( 'Could not load deep linked log: ' + pvslogId, 'warn', NAME );
                return;
            }

            if( patientId ) {
                data.openToPatient = patientId;
            }

            Y.doccirrus.modals.invoiceLogModal.show( data, cashlog ? 'CASH ' : 'PVS', function() {
                Y.log( 'Closed default modal, redirecting to default PVS hash fragment', 'debug', NAME );

                //  return to default route
                window.location.hash = '#/' + cashlog ? 'cashlog' : 'pvs';
            } );
        }
    }

    return {

        registerNode: function( node, key, options ) {
            var actionButtonsViewModel,
                pvslogTable,
                componentColumnCheckbox,
                isReloading = false,
                physicians = options && options.data && options.data.physicians || [],
                openToLogId = options && options.data && options.data.pvslogId ? options.data.pvslogId : null,
                openToPatientId = options && options.data && options.data.patientId ? options.data.patientId : null,
                cashlog = options && options.data && options.data.cashlog,
                api = cashlog ? 'cashlog' : 'pvslog';

            function checkSelection( returnObj, checkIfModified, cb ) {
                var selected = componentColumnCheckbox.checked();

                function finalCb() {
                    if( !returnObj ) {
                        selected = Y.Array.map( selected, function( _selected ) {
                            return _selected._id;
                        } );
                    }
                    cb( selected[0] );
                }

                if( !selected.length ) {
                    notice( {
                        type: 'error',
                        message: 'Bitte wählen Sie mindestens einen Eintrag aus.'
                    } );
                    return;
                }

                if( checkIfModified ) {
                    if( selected.some( function( row ) {
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

                isReloading = true;

                componentColumnCheckbox.uncheckAll();

                pvslogTable.reload( {
                    done: function() {
                        componentColumnCheckbox.checkItemsByProperty( ids );
                    },
                    always: function() {
                        isReloading = false;
                    }
                } );
            }

            function displayErrors( err, res, success, cbFunc ) {
                var messages = [], error;
                if( 'function' !== typeof cbFunc ) {
                    cbFunc = function() {
                    };
                }
                if( res && res.meta && res.meta.errors && res.meta.errors.length ) {
                    for( error of res.meta.errors ){
                        messages.push(error.message || Y.doccirrus.errorTable.getMessage( {code: error.status || error.code, data: error.data} ));
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
                } else if( err ) {
                    notice( {
                        type: 'error',
                        message: err.message || Y.doccirrus.errorTable.getMessage( {code: err.status || err.code} ),
                        callback: cbFunc
                    } );
                } else {
                    cbFunc();
                }
            }

            function ajaxCall( url, success, noReload ) {

                var cbFunc = function() {
                    if( !noReload ) {
                        reloadTable();
                    }
                    pvslogTable.masked( false );
                };

                pvslogTable.masked( true );

                $.ajax( {
                    type: 'GET',
                    xhrFields: {withCredentials: true},
                    url: Y.doccirrus.infras.getPrivateURL( url ),
                    success: function( res ) {
                        displayErrors( null, res, success, cbFunc );
                    },
                    error: function( res ) {
                        displayErrors( res );
                    }
                } );
            }

            function showFormChooser( cb ) {
                Y.doccirrus.modals.chooseInvoiceForm.show( {
                    'defaultIdentifier': 'casefile-invoice',        //  use the system default invoice form
                    'onFormSelected': cb
                } );
            }

            /*
             *  Button bar above the table
             */

            actionButtonsViewModel = Y.doccirrus.invoicelogutils.createActionButtonsViewModel( {
                create: {
                    action: function() {
                        createLogs( cashlog );
                    },
                    enabled: true,
                    visible: true
                },
                remove: {
                    action: function() {
                        checkSelection( false, false, function( selection ) {
                            if( selection ) {
                                ajaxCall(
                                    '/1/' + api + '/:remove/?id=' + selection,
                                    null
                                );
                            }
                        } );
                    },
                    enabled: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        if( Y.doccirrus.auth.memberOf( Y.doccirrus.schemas.employee.userGroups.SUPPORT ) ) {
                            return true;
                        }

                        var enabled = -1 !== ['CREATED', 'VALID', 'VALIDATION_ERR', 'INVALID'].indexOf( state.status );
                        return enabled;
                    },
                    visible: true
                },
                replace: {
                    action: function() {
                        checkSelection( false, false, function( selection ) {
                            if( !selection ) {
                                return;
                            }

                            var promise;
                            if( cashlog ) {
                                promise = new Promise.resolve( Y.doccirrus.jsonrpc.api.cashlog.getReplaceDialogContent( {
                                    query: {
                                        invoiceLogId: selection,
                                        actType: 'INVOICE'
                                    }
                                } )
                                    .then( function( response ) {
                                        var canBeCanceled = response.data.canBeCanceled.map( createLinkOnInvoice ),
                                            canNotBeCanceled = response.data.canNotBeCanceled.map( createLinkOnInvoice ),
                                            canBeCanceledTotal = response.data.canBeCanceledTotal,
                                            canNotBeCanceledTotal = response.data.canNotBeCanceledTotal,
                                            dialogFirstLine = response.data.dialogFirstLine,
                                            confirmKeepLine = CONFIRM_KEEP + createCountLabel( canNotBeCanceled.length, canNotBeCanceledTotal );

                                        dialogFirstLine += createCountLabel( canBeCanceled.length, canBeCanceledTotal );

                                        return (canBeCanceled.length ? dialogFirstLine + canBeCanceled.join( '<br/>' ) : '') +
                                               (canBeCanceled.length && canNotBeCanceled.length ? '<br/><hr/><br/>' : '') +
                                               (canNotBeCanceled.length ? confirmKeepLine + canNotBeCanceled.join( '<br/>' ) : '');
                                    } )
                                    .fail( function( error ) {
                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                    } ) );
                            } else {
                                promise = new Promise.resolve( CONFIRM_REPLACE );
                            }

                            promise.then( function( message ) {
                                confirm( {
                                    window: {width: cashlog ? 'xlarge' : 'medium'},
                                    message: message,
                                    icon: cashlog ? Y.doccirrus.DCWindow.ICON_WARN : null,
                                    callback: function( result ) {
                                        if( !result.success ) {
                                            return;
                                        }
                                        ajaxCall(
                                            '/1/' + api + '/:replace/?id=' + selection
                                        );
                                    }
                                } );
                            } );
                        } );
                    },
                    enabled: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        return -1 !== ['ACCEPTED', 'INVOICED', 'INVOICED_APPROVED', 'REPLACE_ERR'].indexOf( state.status );
                    },
                    visible: true
                },
                preValidate: {
                    action: function() {
                        checkSelection( false, false, function( selection ) {
                            var validateUrl = '/1/' + api + '/:validate/?id=' + selection + '&preValidation=true';
                            if( !selection ) {
                                //  should never happen
                                Y.log( 'Invalid selection, cannot pregenerate', 'warn', NAME );
                                return;
                            }

                            Y.doccirrus.comctl.privateGet( validateUrl, {}, onValidatePvsLog );

                            function onValidatePvsLog( err, result ) {
                                if( err ) {
                                    Y.log( 'Problem validating pvslog: ' + JSON.stringify( err ), 'warn', NAME );
                                    displayErrors( err, null, null, null );
                                    return;
                                }

                                // because "ajaxCall" was removed all error messages are ignored:
                                displayErrors( err, result, null, null );

                                Y.log( 'Validated pvslog ' + selection + ': ' + JSON.stringify( result ), 'debug', NAME );
                                hideProgressBar( selection );
                            }
                        } );
                    },
                    enabled: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        var status = state.status;

                        return 'VALID' === status ||
                               'INVALID' === status ||
                               'CREATED' === status ||
                               'CANCELED' === status ||
                               'VALIDATION_ERR' === status ||
                               'SENT_ERR' === status;
                    },
                    visible: true
                },
                approve: {
                    action: function() {
                        Y.log( 'approve' );
                        checkSelection( true, true, function( selection ) {
                            function approve() {
                                ajaxCall(
                                    '/1/invoicelog/:approve/?id=' + selection._id + '&invoiceType=' + (cashlog ? 'CASH' : 'PVS'),
                                    null,
                                    true
                                );
                            }

                            if( selection ) {
                                Y.doccirrus.modals.invoiceLogApproveModal.show( selection, approve, null, {logType: cashlog ? 'cashlog' : 'pvslog'} );
                            }
                        } );
                    },
                    enabled: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        return 'VALID' === state.status &&
                               state.isPreValidated && (state.notApproved[0] || state.notApproved[1] || state.notApproved[2]);
                    },
                    visible: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        return 'VALID' === state.status &&
                               state.isPreValidated && (state.notApproved[0] || state.notApproved[1] || state.notApproved[2]);
                    }
                },
                validate: {
                    action: function() {
                        checkSelection( false, true, function( selection ) {
                            if( selection ) {
                                ajaxCall(
                                    '/1/' + api + '/:validate/?id=' + selection,
                                    null,
                                    true
                                );
                            }

                            //  TODO: clear / hide progress bar on failure
                        } );
                    },
                    enabled: function( state ) {
                        if( !state ) {
                            return false;
                        }
                        var status = state.status;
                        return 'VALID' === status ||
                               'INVALID' === status ||
                               'CREATED' === status ||
                               'CANCELED' === status ||
                               'VALIDATION_ERR' === status ||
                               'SENT_ERR' === status;
                    },
                    visible: true
                },
                manualSend: {
                    action: function() {
                        Y.log( 'send' );
                        var dcWindow;
                        checkSelection( false, true, function( selection ) {
                            if( selection ) {
                                dcWindow = notice( {
                                    title: i18n( 'DCWindow.notice.title.info' ),
                                    type: 'warn',
                                    window: {
                                        width: 'medium',
                                        buttons: {
                                            footer: [
                                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                                    action: function( event ) {
                                                        dcWindow.close( event );
                                                    }
                                                } ),
                                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                                    isDefault: true,
                                                    label: 'Versenden',
                                                    action: function( event ) {
                                                        dcWindow.close( event );
                                                        ajaxCall(
                                                            '/1/pvslog/:send/?oneClick=false&id=' + selection
                                                        );
                                                    }
                                                } )
                                            ]
                                        }
                                    },
                                    message: '<p>Wollen Sie die Abrechnung manuell versenden?</p><div class="alert alert-info"><p>Enthaltene Scheine und Leistungen werden nach erfolgreichem Versand auf den Zustand "Abgerechnet" gesetzt!</p><p class="text-danger">Dies kann nicht rückgängig gemacht werden!</p>'
                                } );
                            }
                        } );
                    },
                    enabled: enableSendBtns,
                    visible: function( state ) {
                        var
                            deliverySettings = state && state._deliverySettings;

                        if( !deliverySettings ) {
                            return false;
                        }

                        return !cashlog && !isOneClick( deliverySettings );
                    }
                },
                send: {
                    action: function() {
                        checkSelection( false, true, function( selection ) {
                            if( !selection ) {
                                return;
                            }
                            ajaxCall( '/1/pvslog/:send/?oneClick=true&id=' + selection );
                        } );
                    },
                    enabled: enableSendBtns,
                    visible: function( state ) {
                        var
                            deliverySettings = state && state._deliverySettings;

                        if( !deliverySettings ) {
                            return false;
                        }

                        return !cashlog && isOneClick( deliverySettings );
                    }
                },
                invoiceBatchCreation: {
                    action: function() {
                        checkSelection( false, false, function( selection ) {
                            if( !selection ) {
                                return;
                            }
                            showFormChooser( function( canonicalId ) {
                                if( !canonicalId ) {
                                    return;
                                }
                                Y.doccirrus.jsonrpc.api.invoiceprocess.invoiceBatchCreation( {
                                    cashLogId: selection,
                                    canonicalId: canonicalId
                                } ).done( function( res ) {
                                    displayErrors( null, res );
                                } ).fail( function( res ) {
                                    displayErrors( res );
                                } );
                            } );
                        } );
                    },
                    enabled: function( state ) {
                        return enableSendBtns( state, true );
                    },
                    visible: function() {
                        return cashlog;
                    }
                },
                invoiceBatchCreationPDF: {
                    action: function() {
                        checkSelection( false, true, function( selection ) {
                            if( !selection ) {
                                return;
                            }
                            showFormChooser( function( canonicalId ) {
                                if( !canonicalId ) {
                                    return;
                                }
                                Y.doccirrus.jsonrpc.api.invoiceprocess.invoiceBatchCreationPDF( {
                                    cashLogId: selection,
                                    canonicalId: canonicalId
                                } ).done( function( res ) {
                                    displayErrors( null, res );
                                } ).fail( function( res ) {
                                    displayErrors( res );
                                } );
                            } );
                        } );
                    },
                    enabled: enableSendBtns,
                    visible: function() {
                        return cashlog;
                    }
                }
            } );
            /** Creates a logs on server based on invoiceLocations, insuranceDescriptors, invoiceSettings
             *
              * @param  {Boolean] cashlog - if true: CASH view, else PVS view
             */
            function createLogs( cashlog ) {
                var
                    invoiceSettings = {},
                    padxSettings = null,
                    insuranceDescriptors = [],
                    invoiceLocations = [];

                async.series(
                    [
                        getPadxSettings,
                        askForSettings,
                        getPadxLocations,
                        askPvsInsuranceProviders,
                        createLogsOnServer
                    ],
                    onAllDone
                );

                /** Get available padx settings
                *
                * @param itcb
                */
                function getPadxSettings( itcb ) {
                    Promise.resolve( Y.doccirrus.jsonrpc.api.invoiceconfiguration.read() ).then( function( response ) {
                        var invoicesettings = response && response.data && response.data[0];
                        return cashlog ? invoicesettings.cashSettings : invoicesettings.padxSettings;
                    } ).then( function( _padxSettings ) {
                        if( !_padxSettings || !_padxSettings.length ) {
                            throw new Y.doccirrus.commonerrors.DCError( cashlog ? 2505 : 2501 );
                        }
                        padxSettings = _padxSettings;
                        itcb( null );
                    } ).catch( function( err ) {
                        itcb( err );
                    } );
                }

                 /** Ask the user for date range and insurance categories to generate PVS logs for
                 * Modal type is depending cashlog variable
                 * @param itcb
                 */
                function askForSettings( itcb ) {
                    Y.doccirrus.modals.filterInvoiceItems.show( {
                        onSettingsChosen: onFilterSettingsChosen,
                        type: cashlog ? 'CASH' : 'PVS',
                        padxSettings: padxSettings
                    } );

                    function onFilterSettingsChosen( userInvoiceSettings ) {
                        invoiceSettings = userInvoiceSettings;
                        invoiceSettings.withEmptyInsurance = true;
                        itcb( null );
                    }
                }

                /**  3. Get location descriptors from selected PADX settings (see EXTMOJ-1040)
                 * no longer promoting with the selectLocations modal, user must configure padxSettings
                 *
                 * @param itcb
                 * @returns {*}
                 */
                function getPadxLocations( itcb ) {
                    var
                        selectedSettings,
                        hasLocations = false,
                        hasEmployees = false,
                        i;

                    //  Filter to selected padx settings object
                    if( padxSettings && invoiceSettings && invoiceSettings.padnextSettingId ) {
                        for( i = 0; i < padxSettings.length; i++ ) {
                            if( padxSettings[i]._id === invoiceSettings.padnextSettingId ) {
                                selectedSettings = padxSettings[i];
                                hasLocations = ( selectedSettings.locations && selectedSettings.locations.length );
                                hasEmployees = ( selectedSettings.employees && selectedSettings.employees.length );
                            }
                        }
                    }

                    //  if selected padx settings give specific locations to use, use them
                    if( hasLocations ) {
                        invoiceLocations = selectedSettings.locations;
                        return itcb( null );
                    }

                    //  if no locations and no employees then we cannot create pvs logs, ask user to configure some
                    if( !hasLocations && !hasEmployees ) {
                        Y.log( 'No employees or locations configured, cannot create PVS logs.', 'debug', NAME );
                        return itcb( new Y.doccirrus.commonerrors.DCError( cashlog ? 2506 : 2503 ) );
                    }

                    itcb( null );
                }

                /**  5. Ask user for specific PVS/BG insurance providers with items matching settings from step 1
                 *  Legacy removed from PVS log creation, parameters kept to maintain common dialog set
                 * @param itcb
                 */
                function askPvsInsuranceProviders( itcb ) {
                    insuranceDescriptors = [];
                    invoiceSettings.withEmptyInsurance = true;
                    invoiceSettings.useInsuranceStatus = false;
                    invoiceSettings.useInsuranceDescriptors = false;
                    itcb( null );
                }

                /** 6. Create PVS logs according to options given by user
                 *
                 * @param itcb
                 */
                function createLogsOnServer( itcb ) {

                    delete invoiceSettings.locationIdsFromSelectedEmployees;
                    delete invoiceSettings.employeeIds;

                    invoiceSettings.employeeFilterEnabled = !!( invoiceSettings.employees && invoiceSettings.employees.length );

                    var
                        url = '/1/' + api + '/:createLogs/',
                        params = {
                            'locationDescriptors': invoiceLocations,
                            'insuranceDescriptors': insuranceDescriptors,
                            'settings': invoiceSettings
                        };

                    Y.doccirrus.comctl.privatePost( url, params, onPvsLogsCreated );

                    function onPvsLogsCreated( err, result ) {
                        if( err ) {
                            Y.log( 'Could not create '+api+': '+JSON.stringify( err ), 'warn', NAME );
                            itcb( err );
                            return;
                        }

                        Y.log( 'Created '+api+': '+JSON.stringify( result ), 'debug', NAME );
                        itcb( null );
                    }

                }

                //  Finally
                function onAllDone( err ) {
                    if( err ) {
                        Y.log( 'Problem creating PVS logs: ' + JSON.stringify( err ), 'warn', NAME );
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: err && err.message || i18n( 'general.message.AN_ERROR_OCCURRED' )
                        } );
                        return;
                    }
                    reloadTable();
                }

            }

            var columns = [
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
                    renderer: function( meta ) {
                        return meta.value;
                    },
                    isSortable: true,
                    isFilterable: true
                },
                {
                    width: '95px',
                    forPropertyName: 'commercialNo',
                    label: BSNR,
                    renderer: function( meta ) {
                        return meta.value;
                    },
                    isSortable: true,
                    isFilterable: true
                }
            ];

            if( !cashlog ) {
                columns.push( {
                    forPropertyName: '_deliverySettings',
                    label: DELIVERY,
                    title: DELIVERY,
                    renderer: function( meta ) {
                        var row = meta.row;
                        if( -1 !== ['ACCEPTED', 'REJECTED'].indexOf( row.status ) &&
                            !row._deliverySettings ) {
                            // no chance to determine delivery type of old pvslogs
                            return '-';
                        } else if( !meta.value ) {
                            return '<a href="invoiceadmin#/pvs" title="' + CREATE_CONFIG_AND_RECREATE_LOG + '"><span style="color: #a94442;" class="glyphicon glyphicon-question-sign"></span></a>';
                        }
                        return ['<a href="invoiceadmin#/pvs">', Y.doccirrus.schemaloader.translateEnumValue( 'i18n', isOneClick( meta.value ) ? '1CLICK' : 'MANUAL', Y.doccirrus.schemas.gkv_deliverysettings.types.DeliveryType_E.list, '-' ), '</a>'].join( '' );
                    },
                    isSortable: true,
                    isFilterable: true
                } );
            }
            columns = columns.concat( [
                {
                    forPropertyName: 'insuranceTypes',
                    label: PVSLOG_FILTERS,
                    width: '110px',
                    renderer: function( meta ) {
                        var
                            data = meta.row,
                            html = '';

                        if( !data.insuranceTypes || 0 === data.insuranceTypes.length ) {
                            data.insuranceTypes = ['BG', 'PRIVATE', 'SELFPAYER'];
                        }

                        function mkLabel( label ) {
                            return '<span class="label label-default">' + label + '</span>&nbsp;';
                        }

                        data.insuranceTypes.forEach( function( item ) {
                            switch( item ) {
                                case 'BG':
                                    html = html + mkLabel( 'BG' );
                                    break;
                                case 'PRIVATE':
                                    html = html + mkLabel( 'PKV' );
                                    break;
                                case 'PRIVATE_CH':
                                    html = html + mkLabel( 'KVG' );
                                    break;
                                case 'PRIVATE_CH_UVG':
                                    html = html + mkLabel( 'UVG' );
                                    break;
                                case 'PRIVATE_CH_IVG':
                                    html = html + mkLabel( 'IVG' );
                                    break;
                                case 'PRIVATE_CH_VVG':
                                    html = html + mkLabel( 'VVG' );
                                    break;
                                case 'PRIVATE_CH_MVG':
                                    html = html + mkLabel( 'MVG' );
                                    break;
                                case 'SELFPAYER':
                                    html = html + mkLabel( 'SZ' );
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

                        return '<div style="display: inline-block">' + html + '</div>';
                    }
                },
                {
                    forPropertyName: 'totalItems',
                    width: '95px',
                    label: SLD,
                    renderer: function( meta ) {
                        var items = meta.value.split( "|" );
                        var html = '<a href="#" name="included">' + ( items[0] || "" ) + '</a><br/><a href="#" name="excluded">' + ( items[1] || "" ) + '</a>';
                        if( meta.row.isContentOutdated === true ) {
                            html = html + '&nbsp;<span class="text-warning glyphicon glyphicon-warning-sign" aria-hidden="true" title="' + IS_CONTENT_OUTDATED + '"></span>';
                        }
                        return html;
                    }
                },
                {
                    forPropertyName: 'employees._id',
                    queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                    isFilterable: true,
                    label: PHYSICIANS,
                    filterField: {
                        componentType: 'KoFieldSelect2',
                        options: physicians.map( function( phy ) {
                            return {
                                id: phy._id,
                                text: phy.firstname + ' ' + phy.lastname
                            };
                        } ),
                        optionsText: 'text',
                        optionsValue: 'id',
                        select2Config: {
                            multiple: true
                        }
                    },
                    visible: false,
                    renderer: function( meta ) {
                        var employees = meta.row.employees;
                        return Array.isArray( employees ) && employees.length ? employees.map( function( emp ) {
                            return emp.firstname + ' ' + emp.lastname;
                        } ).join( ', ' ) : '-';
                    }
                },
                {
                    forPropertyName: 'status',
                    label: STATUS,
                    renderer: function( meta ) {
                        var translation,
                            _value = meta.value,
                            _statusList = Y.doccirrus.schemas.invoicelog.types.Status_E.list,
                            data = meta.row,
                            errorString,
                            errors = data.output || [],
                            warnings = data.warnings || [];

                        function translate( val, lang ) {
                            var status = Y.Array.find( _statusList, function( status ) {
                                return status.val === val;
                            } );
                            return status[lang];
                        }

                        function displaySeparated( arr, _char ) {
                            var i, arr2 = [];
                            if( !Array.isArray( arr ) ) {
                                return '';
                            }
                            for( i = 0; i < arr.length; i++ ) {
                                if( Array.isArray( arr[i] ) ) {
                                    arr2.push( arr[i].length );
                                } else if( arr[i] || 0 === arr[i] ) {
                                    arr2.push( arr[i] );
                                } else {
                                    continue;
                                }
                            }
                            return arr2.join( _char );
                        }

                        if( !_value ) {
                            return '';
                        }

                        translation = translate( _value, 'i18n' );

                        if( -1 !== ['VALID', 'INVALID'].indexOf( _value ) ) {
                            errorString = displaySeparated( [errors, warnings], '/' );
                            if( errorString ) {
                                translation += '&nbsp;(' + errorString + ')';
                            }
                        }

                        if( data.isPreValidated && 'VALID' === _value || 'INVALID' === _value ) {
                            translation += '&nbsp;(VP)';
                        }

                        if( 'VALIDATING' === _value || 'APPROVING' === _value || 'SENDING' === _value || 'INVOICING' === _value || 'REPLACING' === _value ) {
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
                    forPropertyName: 'user.name',
                    label: USER,
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
                    width: '70px',
                    forPropertyName: 'files',
                    label: FILES,
                    renderer: function( meta ) {
                        var html = '',
                            zipLabel = ( 'VALID' === meta.row.status ) ? 'TEST ZIP' : 'ZIP',
                            kbvlog = meta.row,
                            padnextFileId = kbvlog.padnextFileId;

                        function makeURL( id, label ) {
                            var url = cashlog ? '/media/grid_' + id : '/download/' + id + '?fromLog=' + meta.row._id;
                            url = Y.doccirrus.infras.getPrivateURL( url );
                            if( cashlog ) {
                                return '<a href="' + url + '" download="'+ id +'">' + label + '</a> &nbsp;';
                            }
                            return '<a href="' + url + '">' + label + '</a> &nbsp;';
                        }

                        if( padnextFileId ) {
                            html += makeURL( padnextFileId, cashlog ? 'PDF' : zipLabel );
                        }

                        return html;
                    }
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
            ] );

            pvslogTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-invoice-table',
                    pdfTitle: i18n( 'InvoiceMojit.' + (cashlog ? 'cash_browserJS' : 'pvs_browserJS') + '.pdfTitle' ),
                    stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-pvslogTable',
                    states: ['limit'],
                    striped: false,
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api[api].read,
                    baseParams: {filterOnLocations: true},
                    sortersLimit: 1,
                    columns: columns,
                    onRowClick: function( meta, evt ) {
                        var colName = meta.col.forPropertyName,
                            data = meta.row,
                            errors = data.output,
                            warnings = data.warnings,
                            location = data.mainLocationId,
                            invoiceLogId = data._id.toString();

                        // here we actual want the default behavior of the a tag
                        if( -1 === ['files', '_deliverySettings'].indexOf( colName ) ) {
                            evt.preventDefault();
                        }

                        if( colName === 'status' ) {
                            if( errors || warnings ) {
                                Y.doccirrus.modals.invoiceErrorLogModal.show( location, invoiceLogId, cashlog ? 'CASH' : 'PVS', function() {
                                    reloadTable();
                                } );
                            }
                        } else if( colName === 'totalItems' && hasFeature( SEE_CONTENT_FEATURE, meta.row._log_version, 'PVS' ) && (evt.target.name === 'included' || evt.target.name === 'excluded') ) {
                            data.filterSchein = evt.target.name;
                            Y.doccirrus.modals.invoiceLogModal.show( data, cashlog ? 'CASH' : 'PVS', function() {
                                reloadTable();
                            } );
                        }
                        return false;
                    }
                }
            } );

            componentColumnCheckbox = pvslogTable.getComponentColumnCheckbox();

            actionButtonsViewModel.buttonGenerateI18n = i18n( 'InvoiceMojit.gkv_browser.button.GENERATE' );
            actionButtonsViewModel.buttonRemoveI18n = i18n( 'InvoiceMojit.gkv_browser.button.REMOVE' );
            actionButtonsViewModel.buttonPrecheckI18n = i18n( 'InvoiceMojit.gkv_browser.button.PRECHECK' );
            actionButtonsViewModel.buttonApproveI18n = i18n( 'InvoiceMojit.gkv_browser.button.APPROVE' );
            actionButtonsViewModel.buttonCheckI18n = i18n( 'InvoiceMojit.gkv_browser.button.CHECK' );
            actionButtonsViewModel.buttonManualDeliveryI18n = i18n( 'InvoiceMojit.gkv_browser.button.MANUAL_DELIVERY' );
            actionButtonsViewModel.buttonReplaceI18n = i18n( 'InvoiceMojit.gkv_browser.button.REPLACE' );
            actionButtonsViewModel.generateInvoicesPDFI18n = i18n( 'InvoiceMojit.cashbookJS.title.GENERATE_INVOICES_PDF' );
            actionButtonsViewModel.generateInvoicesTextI18n = i18n( 'InvoiceMojit.cashbookJS.title.GENERATE_INVOICES' );

            ko.computed( function() {
                var
                    selectedRows = componentColumnCheckbox.checked();

                actionButtonsViewModel.state( selectedRows && selectedRows.length ? selectedRows[0] : null );
            } );

            Y.doccirrus.communication.on( {
                event: 'invoicelogAction',
                handlerId: 'updatePvsTable',
                done: function( message ) {
                    var data = message.data && message.data[0];
                    if( ( 'PVS' === data.invoiceType && !cashlog ) ||
                        ( 'CASH' === data.invoiceType && cashlog ) ) {
                        if( 'progress' === data.state ) {
                            updateProgressbar( data.id, data.progress );
                        } else {
                            reloadTable();
                        }
                    }
                }

            } );

            Y.doccirrus.communication.on( {
                event: 'mediaConcatenatePDFs',
                handlerId: 'mediaConcatenatePDFsActionHandler',
                socket: Y.doccirrus.communication.getSocket( '/' ),
                done: function( message ) {
                    var data = message.data && message.data[0],
                        url = data.cacheUrl,
                        options;
                    if( data.status === 'endBatch' ) {
                        options = {
                            'canonicalId': '',
                            'formRole': 'casefile-invoice',
                            'documentUrl': url,
                            'documentFileName': url.substring( url.lastIndexOf( '/' ) + 1 ).split( '?' )[0]
                        };

                        Y.doccirrus.modals.reportPdfModal.show( options );
                    }
                }
            } );

            ko.applyBindings( actionButtonsViewModel, document.querySelector( '#actionButtons' ) );
            ko.applyBindings( pvslogTable, document.querySelector( '#pvslogTable' ) );

            //  open modal if deep linked from casefile
            if( openToLogId ) {
                Y.log( 'Deep link to PVS log: ' + openToLogId + ' patient: ' + openToPatientId, 'debug', NAME );
                loadAndOpenLog( api, cashlog, openToLogId, openToPatientId );
            }

        },

        deregisterNode: function() {
            Y.doccirrus.communication.off( 'invoicelogAction', 'updatePvsTable' );
            Y.doccirrus.communication.off( 'mediaConcatenatePDFs', 'mediaConcatenatePDFsActionHandler' );
        }
    };
}
