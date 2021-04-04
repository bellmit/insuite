/*exported _fn */
/*global ko, moment, async, _ */
/*eslint prefer-template:0, strict:0 */

'use strict';

function _fn( Y, NAME ) {

    var
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap,

        KoViewModel = Y.doccirrus.KoViewModel,
        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),
        allLocations,
        currentUser,
        receipts,
        activitySettings,

        DATE = i18n( 'InvoiceMojit.cashbookJS.title.DATE' ),
        INVOICENO = i18n( 'InvoiceMojit.cashbookJS.title.INVOICENO' ),
        SUM = i18n( 'InvoiceMojit.cashbookJS.title.SUM' ),
        INVOICETYPE = i18n( 'InvoiceMojit.cashbookJS.title.INVOICETYPE' ),
        FIRSTNAME = i18n( 'InvoiceMojit.cashbookJS.title.FIRSTNAME' ),
        LASTNAME = i18n( 'InvoiceMojit.cashbookJS.title.LASTNAME' ),
        STATUS = i18n( 'InvoiceMojit.cashbookJS.title.STATUS' ),
        REASON_TO_CANCEL = i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.REASON_TO_CANCEL' );

    function CashBookViewModel( config ) {
        var
            self = this;

        /**
         *  Instantiate components and subscribe to events
         */

        function init() {
            /*
             *  KO components and observables
             */

            //  False if no process is ongoing, start at true until status checked on server
            self.isVisible = true;

            self.locationIds = ko.observableArray( [] );
            self.cashbookIds = ko.observableArray( [] );

            //  Checkbox "nur automatisch erzeugte Rechnungen anzeigen"
            self.dateSelectorSwitchMode = Y.doccirrus.utils.localValueGet( 'dateSelectorSwitchModeReceipts' );
            self.cashbbokI18n = i18n( 'InCaseMojit.receiptbook.CASHBOOK' );
            self.balanceI18n = i18n( 'InCaseMojit.receiptbook.BALANCE' );

            // init date range selector and set table params
            self.dateSelector = KoComponentManager.createComponent( {
                componentType: 'KoDateRangeSelector',
                componentConfig: {
                    switchMode: self.dateSelectorSwitchMode || 'quarter'
                }
            } );

            self.tableBaseParams = ko.computed( function() {
                var
                    baseParams = {
                        'query': {
                            '$and': [ {
                                timestamp: {
                                    '$lte': self.dateSelector.endDate(),
                                    '$gte': self.dateSelector.startDate()
                                }
                            } ]
                        }
                    },
                    locations = unwrap( self.locationIds ),
                    cashbookIds = unwrap( self.cashbookIds );

                if( locations.length ){
                    let locationsObj = baseParams.query.$and.find( function( el ){
                        return el.locationId;
                    });
                    if( locationsObj ){
                        locationsObj.locationId = { $in: locations };
                    } else {
                        baseParams.query.$and.push( { locationId: { $in: locations } } );
                    }
                }

                if( cashbookIds.length ) {
                    baseParams.query.$and.push( { cashbookId: { $in: cashbookIds } } );
                }

                // save dateSelector mode in localStorage
                Y.doccirrus.utils.localValueSet( 'dateSelectorSwitchModeReceipts', unwrap( self.dateSelector.switchMode ));
                return baseParams;
            } );

            self.initCashbookSelection();
            self.initButtons();
            //  Receipts table
            self.initReceiptsTable();
        }

        self.initButtons = function __initButtons() {
            self.createButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'addCashItem',
                    text: i18n( 'general.button.CREATE' ),
                    option: 'PRIMARY',
                    click: function() {
                        Y.doccirrus.modals.CreateIncashModal.show( {table: self.receipsKoTable, allLocations: allLocations } );
                    }
                }
            } );

            self.deleteVisible = ko.observable( false );
            self.deleteButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'deleteReceipt',
                    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.DEL' ),
                    visible: ko.computed( function(){
                        return unwrap( self.deleteVisible );
                    } ),
                    click: function() {
                        var table =  self.receipsKoTable,
                            checkedIds = table && table.getComponentColumnCheckbox().checkedProperties() || [];
                        if( checkedIds.length ){
                            Y.doccirrus.DCWindow.notice( {
                                type: 'info',
                                message: i18n( 'UserMgmtMojit.partnerJS.CONFIRMDELETION' ),
                                window: {
                                    width: 'auto',
                                    buttons: {
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                                action: function() {
                                                    this.close();
                                                    table.getComponentColumnCheckbox().uncheckAll();
                                                }
                                            } ),
                                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                                isDefault: true,
                                                action: function() {
                                                    this.close();
                                                    Y.doccirrus.jsonrpc.api.activity
                                                        .doTransitionBatch( { query: { ids: checkedIds, transition: 'delete' }, additionalParams: {} } )
                                                        .done( function(){ table.reload(); })
                                                        .fail( function( error ){ _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' ); } );
                                                }
                                            } )
                                        ]
                                    }
                                }
                            } );

                        }
                    }
                }
            } );

            self.approveVisible = ko.observable( false );
            self.approveButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'approveReceipt',
                    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.APPROVE' ),
                    visible: ko.computed( function(){
                        return unwrap( self.approveVisible );
                    } ),
                    click: function() {
                        var table =  self.receipsKoTable,
                            checkedIds = table && table.getComponentColumnCheckbox().checkedProperties() || [];
                        if( checkedIds.length ){
                            Y.doccirrus.DCWindow.notice( {
                                type: 'info',
                                message: i18n( 'general.message.ARE_YOU_SURE' ),
                                window: {
                                    width: 'auto',
                                    buttons: {
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                                action: function() {
                                                    this.close();
                                                    table.getComponentColumnCheckbox().uncheckAll();
                                                }
                                            } ),
                                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                                isDefault: true,
                                                action: function() {
                                                    this.close();
                                                    Y.doccirrus.jsonrpc.api.activity
                                                        .doTransitionBatch( { query: { ids: checkedIds, transition: 'approve' }, additionalParams: {} } )
                                                        .done( function(){ table.reload(); })
                                                        .fail( function( error ){ _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' ); } );
                                                }
                                            } )
                                        ]
                                    }
                                }
                            } );

                        }
                    }
                }
            } );

            self.cancelReceiptVisible = ko.observable( false );
            self.cancelReceiptButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'cancelReceipt',
                    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.CANCEL' ),
                    visible: ko.computed( function(){
                        return unwrap( self.cancelReceiptVisible );
                    } ),
                    click: function() {
                        var table =  self.receipsKoTable,
                            checkedIds = table && table.getComponentColumnCheckbox().checkedProperties() || [];
                        if( checkedIds.length ){
                            Y.doccirrus.modals.activityCancel.show( { 'message': REASON_TO_CANCEL, callback: function( result ) {
                                Y.doccirrus.jsonrpc.api.activity
                                    .doTransitionBatch( { query: { ids: checkedIds, transition: 'cancel' }, additionalParams: {cancelReason: result && result.data} } )
                                    .done( function(){ table.reload(); })
                                    .fail( function( error ){ _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' ); } );
                            } } );
                        }
                    }
                }
            } );

            self.cancelVisible = ko.observable( false );
            self.cancelButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'cancelCashItem',
                    text: i18n( 'InCaseMojit.casefile_browser.more.menuitem.CANCEL' ),
                    visible: ko.computed( function(){
                        return unwrap( self.cancelVisible );
                    } ),
                    click: function() {
                        var table =  self.receipsKoTable,
                            checkedIds = table && table.getComponentColumnCheckbox().checkedProperties() || [];
                        if( checkedIds.length ){
                            Y.doccirrus.DCWindow.notice( {
                                type: 'info',
                                message: i18n( 'general.message.ARE_YOU_SURE' ),
                                window: {
                                    width: 'auto',
                                    buttons: {
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                                action: function() {
                                                    this.close();
                                                    table.getComponentColumnCheckbox().uncheckAll();
                                                }
                                            } ),
                                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                                isDefault: true,
                                                action: function() {
                                                    this.close();
                                                    Y.doccirrus.jsonrpc.api.incash.cancel( { data: { ids: checkedIds } })
                                                        .done( function(){ table.reload(); })
                                                        .fail( function( error ){ _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' ); } );
                                                }
                                            } )
                                        ]
                                    }
                                }
                            } );

                        }
                    }
                }
            } );
        };

        self.initCashbookSelection = function __initCashbookSelection() {
            self.select2Cashbook = {
                val: ko.computed( {
                    read: function() {
                        return '';
                    },
                    write: function( $event ) {
                        if( $event.added ) {
                            self.locationIds.push( $event.added.data.locationId );
                            self.cashbookIds.push( $event.added.data._id );
                        }
                        if( $event.removed ) {
                            self.locationIds.remove( function( item ) {
                                return item === $event.removed.data.locationId;
                            } );
                            self.cashbookIds.remove( function( item ) {
                                return item === $event.removed.data._id;
                            } );
                        }
                    }
                } ),
                select2: {
                    placeholder: '',
                    multiple: true,
                    data: receipts.map( function( receipt ) {
                        var location = (allLocations || []).find( function(el){ return receipt.locationId === el._id.toString(); });
                        return { id: receipt._id, text: receipt.name + ( location ? ' (' + location.locname + ')' : '' ), data: receipt };
                    })
                }
            };
        };

        /**
         *  Create invoice table and subscribe to selections
         */

        self.initReceiptsTable = function __initReceiptsTable() {

            var
                locations = config.user && config.user.locations ? config.user.locations : [],
                locationFilter = locations.map( function( location ) {
                    return { val: location._id, i18n: location.locname };
                } );

            self.selectedTableRows = ko.observableArray( [] );

            self.receipsKoTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-invoice-table',
                    pdfTitle: i18n( 'InvoiceMojit.cashbookJS.pdfTitle' ),
                    stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-receipsKoTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    baseParams: self.tableBaseParams,
                    remote: true,
                    rowPopover: false,
                    selectMode: 'multi',
                    proxy: Y.doccirrus.jsonrpc.api.incash.getReceiptsBook,
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'select',
                            notVisibleAtSummaryRow: true,
                            label: ''
                        },
                        {
                            forPropertyName: 'timestamp',
                            label: DATE,
                            title: DATE,
                            renderer: function( meta ) {
                                var data = meta.row;
                                if( !data.timestamp ) {
                                    return '';
                                }
                                return moment( data.timestamp ).format( 'DD.MM.YYYY' );
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
                                    placeholder: DATE,
                                    autoCompleteDateRange: true
                                }
                            },
                            width: '5%'
                        },
                        {
                            forPropertyName: 'invoiceNo',
                            label: INVOICENO,
                            title: INVOICENO,
                            pdfTitle: 'Rech.Nr.',
                            renderer: function( meta ) {
                                //  TODO: add align property to KoTable columns
                                return '<span style="float: right;">' + ( meta.row.invoiceNo || '') + '</span>';
                            },
                            isSortable: true,
                            direction: 'DESC',
                            isFilterable: true,
                            width: '5%'
                        },
                        {
                            forPropertyName: 'amount',
                            label: SUM,
                            title: SUM,
                            renderer: function( meta ) {
                                //  TODO: add align property to KoTable columns
                                if( meta.row && meta.row[0] ) {
                                    return '<span style="float: right;">' + Y.doccirrus.comctl.numberToLocalString( meta.row[0].amount ) + '</span>';
                                }
                                var formatPrice = Y.doccirrus.comctl.numberToLocalString( meta.row.amount );
                                return '<span style="float: right;">' + formatPrice + '</span>';
                            },
                            isSortable: true,
                            direction: 'DESC',
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.GT_OPERATOR,
                            filterField: {
                                componentType: 'KoSchemaValue',
                                componentConfig: {
                                    fieldType: 'Number',
                                    showLabel: false,
                                    isOnForm: false,
                                    required: false,
                                    isSelectMultiple: false,
                                    placeholder: SUM
                                }
                            },
                            width: '5%'
                        },
                        {
                            forPropertyName: 'content',
                            label: INVOICETYPE,
                            title: INVOICETYPE,
                            width: '5%',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    renderContentAsHTML = ActivityModel.renderContentAsHTML( data );

                                if( data.careComment ) {
                                    renderContentAsHTML += ' <a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a><div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' + data.careComment + '</div>';
                                }

                                return renderContentAsHTML;
                            }
                        },
                        {
                            forPropertyName: 'patientFirstName',
                            label: FIRSTNAME,
                            title: FIRSTNAME,
                            isSortable: true,
                            isFilterable: true,
                            width: '5%'
                        },
                        {
                            forPropertyName: 'patientLastName',
                            label: LASTNAME,
                            title: LASTNAME,
                            isSortable: true,
                            isFilterable: true,
                            width: '5%'
                        },
                        {
                            forPropertyName: 'status',
                            label: STATUS,
                            title: STATUS,
                            renderer: function( meta ) {
                                var data = meta.row;
                                return '<span>' + Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', data.status, 'i18n' ) + '</span>';
                            },
                            isFilterable: true,
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.activity.getFilteredStatuses(),
                                optionsCaption: '',
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            width: '5%'
                        },
                        {
                            forPropertyName: 'patientId.insuranceStatus.type',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.INSURANCE' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.placeholder.INSURANCE' ),
                            visible: false,
                            isSortable: false,
                            isFilterable: true,
                            width: '5%',
                            renderer: function( meta ) {
                                var
                                    data = meta.row,
                                    patient = data.patientId ? data.patientId : null,
                                    insuranceStatus = ( patient && patient.insuranceStatus ) ? patient.insuranceStatus : [];

                                if( patient && insuranceStatus && Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                                    return insuranceStatus.map( function( entry ) {
                                        return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', entry.type, 'i18n', '' );
                                    } ).join( ', ' );
                                }

                                return '';
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemaloader.filterEnumByCountryMode(Y.doccirrus.schemas.person.types.Insurance_E.list),
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        },
                        {
                            forPropertyName: 'locationName',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.locationName' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.locationName' ),
                            width: '5%',
                            visible: false,
                            isFilterable: true,
                            isSortable: false,
                            filterPropertyName: 'locationId',
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: locationFilter,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    locationId = meta.row.locationId,
                                    i;

                                // location names are only a placeholder in data from getCaseFileLight, fill
                                // from location set loaded on binder

                                for( i = 0; i < locations.length; i++ ) {
                                    if( locations[i]._id === locationId ) {
                                        meta.row.locationName = locations[i].locname;
                                    }
                                }

                                return meta.row.locationName;
                            }
                        },
                        {
                            forPropertyName: 'employeeName',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                            width: '5%',
                            visible: false,
                            isSortable: false,
                            isFilterable: false,
                            renderer:  function( meta ) {
                                var
                                    data = meta.row,
                                    editor = data.editor,
                                    parts;

                                if( data.actType ){
                                    if( editor && editor.length ) {
                                        return editor[editor.length - 1].name;
                                    }
                                } else {
                                    if( data.employeeName && data.employeeName.indexOf(',') !== -1 ) {
                                        parts = data.employeeName.split(',').map( function( el ){ return el.trim(); } );
                                        return parts.slice(1) + ' ' + parts[0];
                                    }

                                    return data.employeeName;
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'cashbook',
                            label: i18n( 'InCaseMojit.receiptbook.CASHBOOK' ),
                            title: i18n( 'InCaseMojit.receiptbook.CASHBOOK' ),
                            isSortable: true,
                            isFilterable: true,
                            width: '5%'
                        },
                        {
                            forPropertyName: 'incashNo',
                            label: i18n( 'InCaseMojit.receiptbook.INCASHNO' ),
                            title: i18n( 'InCaseMojit.receiptbook.INCASHNO' ),
                            isSortable: true,
                            isFilterable: true,
                            width: '5%'
                        },
                        {
                            forPropertyName: 'paymentMethod',
                            label: i18n('InCaseMojit.createreceipt_modal_clientJS.title.PAYMENT_METHOD'),
                            title: i18n('InCaseMojit.createreceipt_modal_clientJS.title.PAYMENT_METHOD'),
                            isSortable: true,
                            isFilterable: true,
                            width: '5%',
                            renderer: function( meta ) {
                                var data = meta.row,
                                    paymentMethodList = Y.doccirrus.schemas.activity.getPaymentMethodList(),
                                    paymentText = '';
                                if( !data.paymentMethod ) {
                                    return '';
                                }
                                paymentMethodList.forEach( function( item ) {
                                    if( item.value === data.paymentMethod ) {
                                        paymentText = item.text;
                                    }
                                });
                                return '<span>' + paymentText + '</span>';
                            },
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.activity.getPaymentMethodList(),
                                optionsCaption: '',
                                optionsText: 'text',
                                optionsValue: 'value'
                            }
                        }
                    ],
                    summaryRow: true,
                    hideSummaryRow: false,
                    onRowClick: function( meta ) {
                        if( meta && meta.row && meta.row._id && meta.row.actType ) {
                            window.open( Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/activity/' + meta.row._id, '_blank' );
                        } else if( meta && meta.row && meta.row.status !== 'CANCELLED' ){
                            Y.doccirrus.modals.CreateIncashModal.show( {table: self.receipsKoTable, allLocations: allLocations, data: meta.row } );
                        }
                        return false;
                    }
                }
            } );

            self.balanceValue = ko.observable( '' );
            self.receipsKoTable.data.subscribe( function( value ) {
                self.balanceValue( Y.doccirrus.comctl.numberToLocalString( value && value.length && value[value.length-1] && value[value.length-1].amount ) || 0 );
            });

            self.receipsKoTable.getComponentColumnCheckbox().checked.subscribe( function( newArray ) {
                self.selectedTableRows( newArray );

                var
                    allSelectedInashCancel = false,
                    allSelectedReceiptValid = false,
                    allSelectedReceiptApproved = false;
                if( newArray.length && Y.doccirrus.auth.isAdmin() ){
                    allSelectedInashCancel = newArray.every( function( el ){ return !el.actType && el.status === 'VALID'; } );
                    allSelectedReceiptValid = newArray.every( function( el ){ return el.actType && el.status === 'VALID'; } );
                    allSelectedReceiptApproved = newArray.every( function( el ){ return el.actType && el.status === 'APPROVED'; } );
                }
                self.cancelVisible( allSelectedInashCancel );
                self.deleteVisible( allSelectedReceiptValid );
                self.approveVisible( allSelectedReceiptValid );
                self.cancelReceiptVisible( allSelectedReceiptApproved );
            } );
        };

        init();

    } // end cashBookViewModel

    /**
     *  Preload list of locations for BS column of cashbook table
     *
     *  @param  {Function}  callback    Of the form fn( err )
     */
    function loadLocations( callback ) {

        var
            locationQuery = {
                options: {
                    fields: { '_id': 1, 'locname': 1 },
                    objPopulate: false
                }
            };

        Y.doccirrus.jsonrpc.api.location
            .read( locationQuery )
            .then( onLocationsRead )
            .fail( onFail );

        function onLocationsRead( foundLocations ) {
            allLocations = foundLocations.data ? foundLocations.data : foundLocations;
            callback( null );
        }

        function onFail( err ) {
            Y.log( 'Could not load current set of locations: ' + JSON.stringify( err ), 'warn', NAME );
            callback( err );
        }
    }

    function loadCurrentUser( callback ) {
        Y.doccirrus.jsonrpc.api.employee
            .getIdentityForUsername( { username: Y.doccirrus.auth.getUserId() } )
            .then( onIdentityLoaded )
            .fail( onFail );

        function onIdentityLoaded( response ) {
            var
                data = response && response.data ? response.data : {};
            currentUser = data;
            callback( null );
        }

        function onFail( err ) {
            Y.log( 'Could not load current user object: ' + JSON.stringify( err ), 'warn', NAME );
            return callback( err );
        }
    }

    function loadInvoiceConfiguration( callback ) {
        Y.doccirrus.jsonrpc.api.invoiceconfiguration.read()
            .then( onConfigLoaded )
            .fail( onFail );

        function onConfigLoaded( config ) {
            var
                locations = currentUser && currentUser.locations || [],
                mappedLocations = locations.map( function( loc ) {
                    return loc._id;
                }),
                loadedReceipts = config.data[0] && config.data[0] && config.data[0].receiptsSchemes || [];

            if( mappedLocations.length ) {
                receipts = loadedReceipts.filter( function( rec ) {
                    return -1 !== mappedLocations.indexOf( rec.locationId );
                });
            } else {
                receipts = loadedReceipts;
            }
            callback( null );
        }

        function onFail( err ) {
            Y.log( 'Could not load configuration: ' + JSON.stringify( err ), 'error', NAME );
            callback( err );
        }
    }

    function initActivitySettings( callback ) {
        Y.doccirrus.jsonrpc.api.activitysettings
            .read( { query: { _id: Y.doccirrus.schemas.activitysettings.getId() } } )
            .then( onSettingsLoaded )
            .fail( onFail );

        function onSettingsLoaded( response ) {
            activitySettings = Y.Lang.isArray( response.data ) && response.data[0] && Y.Lang.isArray( response.data[0].settings ) && response.data[0].settings || [];
            callback( null );
        }

        function onFail( err ) {
            Y.log( 'Could not load activity settings: ' + JSON.stringify( err ), 'warn', NAME );
            callback( err );
        }
    }

    return {
        registerNode: function() {
            async.series( [ loadLocations, loadCurrentUser, loadInvoiceConfiguration, initActivitySettings ], onDataReady );
            function onDataReady( err ) {
                if( err ) {
                    Y.log( 'Could not initialize receiptsbook: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                var cashBookVM = new CashBookViewModel( { 'locations': allLocations, 'user': currentUser, 'receipts': receipts, 'activitySettings': activitySettings } );
                ko.applyBindings( cashBookVM, document.querySelector( '#receiptsBook' ) );
            }
        },
        deregisterNode: function() {}
    };
}
