/*
 @author: strix
 @date: 2016/07/15
 */

/*jshint latedef:false */
/*global YUI, ko, moment */

'use strict';

YUI.add( 'dcreceiptinvoicemodal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),

            unwrap = ko.unwrap,

            WINDOW_SIZE = 1024;

        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'receiptinvoice_modal',
                'InCaseMojit',
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
         *  @param  onActivitySelected  {Function}  Of the form fn( activityTableRow )
         *  @constructor
         */

        function ReceiptInvoiceViewModel( currentPatient, currentActivity, onActivitySelected ) {
            var self = this;

            self.onActivitySelected = onActivitySelected;
            self.isLoaded = ko.observable( false );
            self.formActivities = ko.observableArray( [] );

            self.invoiceActivityTable = createInvoiceActivityTable( {
                data: self.formActivities,
                currentPatient: currentPatient,
                onRowClick: function( meta, evt ) { self.onRowClick( meta, evt ); }
            } );

            self.findCandidateInvoices = function __findCandidateInvoices() {
                Y.log( 'Finding candidate activities for patient ' + unwrap( currentPatient._id ), 'debug', NAME );

                function onActivitiesLoaded( data ) {
                    data = data.data ? data.data : data;

                    self.formActivities( data );
                        self.isLoaded( true );
                }

                function onActivityLoadFailure( err ) {
                    Y.log( 'Could not load activities: ' + JSON.stringify( err ), 'warn', NAME );
                }

                var
                    //activityId = unwrap( currentActivity._id ),
                    activityQuery = {
                        //  select all invoices for this patient
                        'patientId': unwrap( currentPatient._id ),
                        'actType': 'INVOICE'
                    };

                Y.doccirrus.jsonrpc.api.activity
                    .read( { query: activityQuery } )
                    .then( onActivitiesLoaded )
                    .fail( onActivityLoadFailure );
            };

            self.onRowClick = function( meta ) {
                //  user must click on the copy button column
                if ( !meta.col || !meta.col.forPropertyName || '_id' !== meta.col.forPropertyName ) { return; }

                onActivitySelected( meta.row );
            };

            self.dispose = function __disposeReceiptInvoiceVM() {
                self.invoiceActivityTable.dispose();
            };

            //  initialize
            self.findCandidateInvoices();
        }

        function createInvoiceActivityTable( args ) {
            args = args || {};
            var
                currentPatient = args.currentPatient,

                table = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    scrollToTopOfTableWhenPaging: false,
                    data: args.data,
                    stateId: args.stateId || 'dc-receiptinvoice-activity-table',
                    states: ['limit'],
                    striped: false,
                    baseParams: {
                        sort: {
                            name: 1
                        }
                    },
                    columns: [
                        /*
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkMode: 'multi',
                            allToggleVisible: false
                        },
                        */

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
                            forPropertyName: 'catalogShort',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' ),
                            width: '100px',
                            isSortable: true,
                            isFilterable: true,
                            visible: false
                        },
                        {
                            forPropertyName: 'invoiceNo',
                            label: 'R. Nr.',
                            title: 'R. Nr.',
                            width: '80px',
                            isSortable: true,
                            isFilterable: true,
                            renderer: function( meta ) {
                                var
                                    data = meta.row;

                                if ( !data.invoiceNo ) { return ''; }
                                return '' + data.invoiceNo;
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
                        {
                            forPropertyName: 'caseFolderId',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                            width: '30%',
                            isSortable: true,
                            renderer: function( meta ) {
                                var
                                    id = meta.value,
                                    caseFolder = null;
                                if( id ) {
                                    caseFolder = currentPatient && currentPatient.caseFolderCollection.getTabById( id );
                                }
                                return caseFolder && caseFolder.title || '';
                            }
                        },
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
                            visible: false
                        },
                        {
                            forPropertyName: '_id',
                            label: '',
                            title: '',
                            width: '50px',
                            visible: true,
                            renderer: function() {
                                return '<button class="btn btn-primary btn-sm"><i class="fa fa-check-circle"></i></button>';
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
                receiptInvoiceVM = new ReceiptInvoiceViewModel( args.currentPatient, args.currentActivity, onInvoiceChanged ),

                windowSettings = {
                    className: 'DCWindow-ReceiptInvoiceSelector',
                    bodyContent: node,
                    title: i18n( 'InCaseMojit.receipt_invoice_modal.title' ),
                    maximizable: true,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: WINDOW_SIZE,
                    minHeight: 200,
                    minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: []
                    }
                },
                
                modal;

            getTemplate( node, {}, onTemplateReady );
            
            //  EVENT HANDLERS

            function onTemplateReady() {
                modal = new Y.doccirrus.DCWindow( windowSettings );
                ko.applyBindings( receiptInvoiceVM, node.getDOMNode() );
            }

            function onInvoiceChanged( activity ) {
                args.onInvoiceChanged( activity._id, activity );
                onComplete();
            }

            function onComplete() {
                modal.close();
                receiptInvoiceVM.dispose();
            }
            
        }

        Y.namespace( 'doccirrus.modals' ).receiptInvoiceSelector = { show: show };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dcpartnertable',
            'dccallermodal'
        ]
    }
);
