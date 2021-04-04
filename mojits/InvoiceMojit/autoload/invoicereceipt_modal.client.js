/*
 @author: strix
 @date: 2016/07/15
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, moment */

'use strict';

YUI.add( 'dcinvoicereceiptmodal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),

            unwrap = ko.unwrap,

            WINDOW_SIZE = 1024;

        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'invoicereceipt_modal',
                'InvoiceMojit',
                data,
                node,
                callback
            );
        }

        /**
         *  Model for the set of invoices which could be linked by a receipt
         *
         *  @param  currentPatient      {Object}    PatientModel
         *  @param  currentActivity     {Object}    ActivityModel
         *  @param  allLocations        {Object}    Set of location _ids and names
         *  @param  onActivitySelected  {Function}  Of the form fn( activityTableRow )
         *  @constructor
         */

        function InvoiceReceiptViewModel( currentPatient, currentActivity, allLocations, onReceiptsUpdated ) {
            var self = this;

            self.currentPatient = currentPatient;
            self.currentActivity = currentActivity;
            self.onReceiptsUpdated = onReceiptsUpdated;
            self.isLoaded = ko.observable( false );
            self.receiptActivities = ko.observableArray( [] );
            self.locations = allLocations;

            self.receiptActivityTable = createReceiptActivityTable( {
                data: self.receiptActivities,
                currentPatient: currentPatient,
                locations: allLocations,
                onRowClick: function( meta, evt ) { self.onRowClick( meta, evt ); },
                onRowToggle: function( col, link, data ) { self.onTableRowToggle( col, link, data ); },
                onSelectAllRows: function( col, rows ) { self.onTableSelectAllRows( col, rows ); },
                onDeselectAllRows: function( col, rows ) { self.onTableDeselectAllRows( col, rows ); }
            } );

            self.findCandidateReceipts = function __findCandidateReceipts( newlyAddedReceiptId ) {
                Y.log( 'Finding candidate activities for patient ' + unwrap( currentPatient._id ), 'debug', NAME );

                function onActivitiesLoaded( data ) {
                    data = data.data ? data.data : data;

                    self.receiptActivities( data );
                    self.linkCurrentReceipts( newlyAddedReceiptId );
                    self.isLoaded( true );
                }

                function onActivityLoadFailure( err ) {
                    Y.log( 'Could not load activities: ' + JSON.stringify( err ), 'warn', NAME );
                }

                var
                    activityId = unwrap( currentActivity._id ),
                    activityQuery = {

                        $and: [
                            { 'patientId': unwrap( currentPatient._id ) },
                            { 'actType': { '$in': [ 'RECEIPT', 'CREDITNOTE', 'WARNING1', 'WARNING2', 'REMINDER', 'BADDEBT' ] } },
                            { 'caseFolderId': unwrap( currentActivity.caseFolderId ) },
                            { $or: [
                                //  the linked activity of the receipt must be empty or a reference to the current activity
                                //  (this is to prevent showing receipts already owned by some other invoice)
                                { 'referencedBy': { $eq: [] } },
                                { 'referencedBy': { $eq: [ activityId + '' ] } }
                            ] }
                        ]

                    };
                
                return Y.doccirrus.jsonrpc.api.activity
                    .read( { query: activityQuery } )
                    .then( onActivitiesLoaded )
                    .fail( onActivityLoadFailure );
            };

            self.linkCurrentReceipts = function __linkCurrentReceipts( newlyAddedReceiptId ) {
                    var
                        componentColumnLinked = self.receiptActivityTable.getComponentColumnLinked(),
                        linkIds = [];

                if ( self.currentActivity && self.currentActivity.receipts ) {
                    linkIds = self.currentActivity.receipts.slice();    // clone
                }

                if( newlyAddedReceiptId ){
                    linkIds.push( newlyAddedReceiptId );
                }

                componentColumnLinked.removeLinks();
                componentColumnLinked.addLinks( linkIds );
            };

            /**
             *  Called when modal is closed
             */

            self.dispose = function __disposeInvoiceReceiptVM() {
                self.curentPatient = null;
                self.currentActivity = null;
                self.receiptActivityTable.dispose();
            };

            /**
             *  Open a child modal to create a new receipt
             */

            self.showCreateReceiptModal = function __showCreateReceiptModal() {
                var self = this;

                function onReceiptCreate( newReceipt ) {
                    //  New receipts should be linked to and included in this invoice, we'll need to reload the table
                    //  and update the totalReceipts

                    self.receiptActivityTable.masked( true );
                    self.findCandidateReceipts( newReceipt && newReceipt._id )
                        .then( function() {
                            self.receiptActivityTable.reload();
                            self.receiptActivityTable.masked( false );
                        } );
                }

                Y.doccirrus.modals.createReceiptsModal.show( {
                    id: self.currentActivity._id,
                    total: self.currentActivity.total,
                    totalReceiptsOutstanding: self.currentActivity.totalReceiptsOutstanding,
                    createBadDebt: false,
                    locationId: self.currentActivity.locationId,
                    onReceiptCreate: onReceiptCreate
                } );
            };

            /**
             *  Shortcut method to change the linked invoice of a selected receipt
             *  @param  receiptIds  {Object}
             *  @param  callback    {Function}
             */

            self.claimReceiptForCurrentInvoice = function __claimReceiptForCurrentInvoice( receiptIds, callback ) {
                function onReceiptsClaimed( err, result ) {

                    if ( err ) {
                        Y.log( 'Error while claiming receipts: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }
                    //  TODO: raise event to reload parent (cashbook) table
                    self.receiptActivityTable.masked( false );
                    callback( null, result );
                }

                var
                    postArgs = {
                        'invoiceId': self.currentActivity._id,
                        'receiptIds': receiptIds
                    };

                self.receiptActivityTable.masked( true );
                Y.doccirrus.comctl.privatePost( '/1/receipt/:claimForInvoice', postArgs, onReceiptsClaimed );
            };

            //  EVENT HANDLERS

            /**
             *  Raised by table when a cell is clicked, use to open receipts in a new tab
             *  @param meta
             */

            self.onRowClick = function( meta ) {
                //  user must click on the copy button column
                if ( !meta.col || !meta.col.forPropertyName || '_id' !== meta.col.forPropertyName ) { return; }

                //  open Receipt in CaseFile in new window
                var url = '/incase#/activity/' + meta.row._id;
                window.open( url, '_blank' );
            };

            /**
             *  Raised by table when checkbox value changes
             *  @param  col
             *  @param  link
             *  @param  data
             */

            self.onTableRowToggle = function __onTableRowToggle( col, link, data ) {
                //  ignore during initialization
                if ( !self.isLoaded() ) { return true; }

                var
                    isRowLinked = col.isLinked( link ),
                    oldIds = unwrap( self.currentActivity.receipts || [] ).slice(),
                    receiptIds = oldIds.slice(),
                    toggleId = data._id,
                    i = 0;

                if ( isRowLinked ) {
                    //  already in the set, remove it
                    Y.log( 'Removing selected item from set: ' + toggleId, 'debug', NAME );

                    receiptIds = [];
                    for ( i = 0; i < oldIds.length ; i++ ) {
                        if ( oldIds[i] !== toggleId ) {
                            receiptIds.push( oldIds[i] );
                        }
                    }

                    col.removeLink( link );

                } else {
                    //  not in the set, add it
                    Y.log( 'Adding selected item to set: ' + toggleId, 'debug', NAME );
                    receiptIds.push( toggleId );
                    col.addLink( link );
                }

                self.claimReceiptForCurrentInvoice( receiptIds, onReceiptsChanged );

                function onReceiptsChanged( err, result ) {

                    if ( err ) {
                        Y.log( 'Problem while updating set of linked receipts: ' + JSON.stringify( err ), 'warn', NAME );
                       return;
                    }

                    var
                        componentColumnLinked = self.receiptActivityTable.getComponentColumnLinked(),
                        newInvoice = result.data ? result.data : result;

                    self.currentActivity.receipts = newInvoice.receipts;
                    self.currentActivity.totalReceipts = newInvoice.totalReceipts;
                    self.currentActivity.totalReceiptsOutstanding = newInvoice.price - newInvoice.totalReceipts;

                    //  When an invoice is marked as PAID the remaining balance is set to 0, MOJ-6627
                    if ( 'CREDITED' === self.currentActivity.status || 'ARCHIVED' === self.currentActivity.status  ) {
                        self.currentActivity.totalReceipts = parseFloat( self.currentActivity.price );
                        self.currentActivity.totalReceiptsOutstanding = 0;
                    }

                    componentColumnLinked.addLinks( self.currentActivity.receipts );
                    self.receiptActivityTable.reload();
                    self.onReceiptsUpdated( self.currentActivity );
                }

                //  immediately call back true to the table
                return true;
            };

            /**
             *  Raised by table when 'check all' box in top right is toggled on
             *
             *  @param col
             *  @param rows
             *  @return {boolean}
             */

            self.onTableSelectAllRows = function __onTableSelectAllRows( col, rows ) {
                //  ignore during initialization
                if ( !self.isLoaded() ) { return true; }

                var
                    receiptIds = unwrap( self.currentActivity.receipts || [] ).slice(),
                    i;

                for (i = 0; i < rows.length; i++ ) {
                    if ( -1 === receiptIds.indexOf( rows[i]._id ) ) {
                        receiptIds.push( rows[i]._id );
                        col.addLink( rows[i] );
                    }
                }

                self.claimReceiptForCurrentInvoice( receiptIds, onReceiptsChanged );

                function onReceiptsChanged( err, result ) {

                    if ( err ) {
                        Y.log( 'Problem while updating set of linked receipts: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    var
                        componentColumnLinked = self.receiptActivityTable.getComponentColumnLinked(),
                        newInvoice = result.data ? result.data : result;

                    self.currentActivity.receipts = newInvoice.receipts;
                    self.currentActivity.totalReceipts = newInvoice.totalReceipts;
                    self.currentActivity.totalReceiptsOutstanding = newInvoice.price - newInvoice.totalReceipts;

                    //  When an invoice is marked as PAID the remaining balance is set to 0, MOJ-6627
                    if ( 'CREDITED' === self.currentActivity.status || 'ARCHIVED' === self.currentActivity.status  ) {
                        self.currentActivity.totalReceipts = parseFloat( self.currentActivity.price );
                        self.currentActivity.totalReceiptsOutstanding = 0;
                    }

                    componentColumnLinked.addLinks( self.currentActivity.receipts );
                    self.receiptActivityTable.reload();
                    self.onReceiptsUpdated( self.currentActivity );
                }

                //  immediately call back true to the table
                return true;
            };

            /**
             *  Raised by table when 'check all' box in top right is toggled off
             *
             *  @param col
             *  @param rows
             *  @return {boolean}
             */

            self.onTableDeselectAllRows = function __onTableDeselectAllRows( col, rows ) {
                //  ignore during initialization
                if ( !self.isLoaded() ) { return true; }

                var
                    oldIds = unwrap( self.currentActivity.receipts || [] ).slice(),
                    removeIds = [],
                    receiptIds = [],
                    i;

                for (i = 0; i < rows.length; i++ ) {
                    removeIds.push( rows[i]._id);
                    col.removeLink( rows[i] );
                }

                for (i = 0; i < oldIds.length; i++ ) {
                    if ( -1 === removeIds.indexOf( oldIds[i]) ) {
                        receiptIds.push( oldIds[i] );
                    }
                }

                self.claimReceiptForCurrentInvoice( receiptIds, onReceiptsChanged );

                function onReceiptsChanged( err, result ) {

                    if ( err ) {
                        Y.log( 'Problem while updating set of linked receipts: ' + JSON.stringify( err ), 'warn', NAME );
                        return;
                    }

                    var
                        componentColumnLinked = self.receiptActivityTable.getComponentColumnLinked(),
                        newInvoice = result.data ? result.data : result;

                    self.currentActivity.receipts = newInvoice.receipts;
                    self.currentActivity.totalReceipts = newInvoice.totalReceipts;
                    self.currentActivity.totalReceiptsOutstanding = newInvoice.price - newInvoice.totalReceipts;

                    //  When an invoice is marked as PAID the remaining balance is set to 0, MOJ-6627
                    if ( 'CREDITED' === self.currentActivity.status || 'ARCHIVED' === self.currentActivity.status ) {
                        self.currentActivity.totalReceipts = parseFloat( self.currentActivity.price );
                        self.currentActivity.totalReceiptsOutstanding = 0;
                    }

                    componentColumnLinked.removeLinks( removeIds );
                    self.receiptActivityTable.reload();
                    self.onReceiptsUpdated( self.currentActivity );
                }

                //  immediately call back true to the table
                return true;
            };

            //  initialize
            self.findCandidateReceipts();
        }

        function createReceiptActivityTable( args ) {
            args = args || {};

            //TODO: link checkbox column to current invoice receipts field

            var
                table = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    scrollToTopOfTableWhenPaging: false,
                    data: args.data,
                    stateId: args.stateId || 'dc-invoicereceipt-activity-table',
                    states: ['limit'],
                    striped: false,
                    baseParams: {
                        sort: {
                            name: 1
                        }
                    },
                    columns: [
                        {
                            componentType: 'KoTableColumnLinked',
                            forPropertyName: 'linked',
                            label: '(y)',
                            visible: true,
                            isCheckBoxDisabledHook: function( /* data */ ) {
                                return false;
                            },
                            toggleLinkOfRowHook: function( link, data ) {
                                return args.onRowToggle( this, link, data );
                            },
                            toggleSelectAllHook: function( rows ) {
                                return args.onSelectAllRows( this, rows );
                            },
                            toggleDeselectAllHook: function( rows ) {
                                return args.onDeselectAllRows( this, rows );
                            }
                        },

                        {
                            forPropertyName: 'timestamp',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                            width: '100px',
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
                            forPropertyName: 'actType',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                            width: '120px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_ACTTYPE_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs,
                                optionsText: '-de',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    actType = meta.value;

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, '-de', 'k.A.' );

                            }
                        },
                        {
                            forPropertyName: 'amount',
                            label: 'Betrag', //i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                            title: 'Betrag', //i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                            width: '80px',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    amount = meta.row.amount || 0.00,
                                    formatAmount = Y.doccirrus.comctl.numberToLocalString( amount );

                                return '<span style="float: right;">' + formatAmount + '</span>';
                            }
                        },
                        {
                            forPropertyName: 'content',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                            width: '70%',
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

                        //  debug

                        {
                            forPropertyName: 'status',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                            width: '115px',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.activity.getFilteredStatuses(),
                                optionsText: '-de',
                                optionsValue: 'val'
                            },
                            renderer: function( meta ) {
                                var
                                    status = meta.value;

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', status, '-de', '' );
                            }
                        },
                        {
                            forPropertyName: 'editor.name',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                            width: '30%',
                            isSortable: true,
                            isFilterable: true,
                            visible: false,
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
                        },
                        {
                            forPropertyName: 'employeeName',
                            label: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                            title: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                            width: '30%',
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'locationName',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.locationName' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.locationName' ),
                            width: '30%',
                            visible: false,
                            renderer: function( meta ) {
                                var data = meta.row, i;

                                for ( i = 0; i < args.locations.length; i++ ) {
                                    if ( args.locations[i]._id === data.locationId ) {
                                        return args.locations[i].locname;
                                    }
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: '_id',
                            label: '',
                            title: '',
                            width: '50px',
                            visible: true,
                            renderer: function() {
                                return '<button class="btn btn-sm"><i class="glyphicon glyphicon-pencil"></i></button>';
                            }
                        }

                    ],

                    onRowClick: args.onRowClick
                }
            } );

            return table;
        }

        function show( args ) {

            var
                node = Y.Node.create( '<div></div>' ),
                invoiceReceiptVM = new InvoiceReceiptViewModel( args.currentPatient, args.currentActivity, args.locations, onInvoiceChanged ),

                btnCreateReceipt = {
                    name: 'CREATE_RECEIPT',
                    label: i18n( 'InvoiceMojit.invoice_receipt_modal.CREATE_RECEIPT' ),
                    isDefault: true,
                    action: function() {
                        invoiceReceiptVM.showCreateReceiptModal();
                    }
                },

                btnDone = Y.doccirrus.DCWindow.getButton( 'OK', {
                    isDefault: true,
                    action: function() {
                        //callback( flowModel.toJSON() );
                        this.close();
                    }
                } ),

                patientName = args.currentPatient.firstname + ' ' + args.currentPatient.lastname,

                modalTitle = i18n( 'InvoiceMojit.invoice_receipt_modal.title' ) +
                    ' / ' + args.currentActivity.content +
                    ' / ' + patientName,

                windowSettings = {
                    className: 'DCWindow-InvoiceReceiptSelector',
                    bodyContent: node,
                    title: modalTitle,
                    maximizable: true,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: WINDOW_SIZE,
                    height: 730,
                    minHeight: 730,
                    minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [ btnCreateReceipt, btnDone ]
                    }
                },
                
                modal;          //  eslint-disable-line no-unused-vars

            getTemplate( node, {}, onTemplateReady );
            
            //  EVENT HANDLERS

            function onTemplateReady() {
                modal = new Y.doccirrus.DCWindow( windowSettings );
                ko.applyBindings( invoiceReceiptVM, node.getDOMNode() );
            }

            function onInvoiceChanged( activity ) {
                args.onReceiptsChanged( activity._id, activity );
            }

            /*
            function onComplete() {
                modal.close();
                invoiceReceiptVM.dispose();
            }
            */
            
        }

        Y.namespace( 'doccirrus.modals' ).invoiceReceiptSelector = { show: show };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dccallermodal',
            'KoViewModel',
            'ActivityModel'
        ]
    }
);
