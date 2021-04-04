/*global ko, YUI, moment */
'use strict';

YUI.add( 'RequestViewModel', function( Y/*, NAME*/ ) {

    var i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        STATUS = i18n( 'dispatchrequest-schema.DispatchRequest_T.status' ),
        STATUS_I18N = i18n( 'dispatchrequest-schema.DispatchRequest_T.Status_E' ),
        TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
        TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
        VIEW_STATE_INITIAL = null,
        VIEW_STATE_OVERVIEW = 'overview',
        VIEW_STATE_DETAIL = 'detail',
        KoViewModel = Y.doccirrus.KoViewModel;

    function getRequestById( id ) {
        return Y.doccirrus.jsonrpc.api.dispatchrequest.read( {
            query: {
                _id: id
            }
        } );
    }

    function getMandateByType( response ) {
        var str = i18n( isDocumentType( response ) ? 'IsDispatcherMojit.tab_requests.document' : 'IsDispatcherMojit.tab_requests.reciept' );
        return str;
    }

    function isDocumentType( response ) {
        return response.url && response.contentType && response.caption;
    }

    function getStatusMarkup( status ) {

        var st = status || 0,
            statusValue = STATUS_I18N[String( st )];

        if( statusValue === STATUS_I18N[1] ) {
            return '<i class="fa fa-check"></i>';  // Processed
        } else { // Everything else
            return '<i class="fa fa-ban"></i>';
        }
    }

    /**
     * default error notifier
     */
    function fail( response ) {
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }
    }

    function ViewDetailsModel() {
        ViewDetailsModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewDetailsModel, KoViewModel.getBase(), {

        saveDisabled: false,

        initializer: function() {
            var self = this,
                data = self.get( 'data' );

            self.request = new Y.doccirrus.uam.RequestModel( data );
            self.request.formattedStatus( getStatusMarkup( data.status ) );

            self.request.labelBSNRI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.bsnr');
            self.request.labelLANRI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.lanr');
            self.request.labelPatientIdI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.patient_id');
            self.request.mandateI18n = i18n('IsDispatcherMojit.tab_requests.mandate');
            self.request.labelStatusI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.status');
            self.request.labelCareI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.care');
            self.request.labelTelephoneI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.telephone');
            self.request.commentI18n = i18n('dispatchrequest-schema.DispatchRequest_T.comment');
            self.request.codePZNI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.codePZN');
            self.request.codeHMVI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.codeHMV');
            self.request.labelNoteI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.note');
            self.request.prescrPeriodI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.prescPeriod');
            self.request.labelDoseI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.dose');
            self.request.labelQuantityI18n = i18n('IsDispatcherMojit.tab_requests.details.dialog.label.quantity');
        },

        isDocument: function() {
            return isDocumentType( this.request );
        },

        getMandatType: function() {
            return getMandateByType( this.request );
        }

    } );

    function RequestViewModel() {
        RequestViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( RequestViewModel, KoViewModel.getBase(), {

            details: null,
            generateTestData: null,
            requestsTable: null,
            statusFilter: ko.observable( {} ),

            initializer: function() {
                var self = this;
                self.details = ko.observable( null );
                self.initStateListener();
            },

            initialisedOverview: false,
            initStateListener: function() {
                var self = this;
                self.view = ko.observable( VIEW_STATE_INITIAL );
                self.eventStateListener = Y.after( 'tab_requests-state', self.eventStateListenerHandler, self );
            },

            isOverviewInitialised: function() {
                var self = this;
                return Boolean( self.initialisedOverview );
            },

            initOverview: function() {
                var
                    self = this;

                if( !self.isRequestsTableInitialized() ) {
                    self.initRequestsTable();
                }

                self.initialisedOverview = true;
            },

            eventStateListenerHandler: function( yEvent, state ) {
                var
                    self = this,
                    id = state.params.id;

                switch( state.view ) {
                    case VIEW_STATE_OVERVIEW:
                        if( !self.isOverviewInitialised() ) {
                            self.initOverview();
                        }
                        break;
                    case VIEW_STATE_DETAIL:
                        if( id ) {
                            if( !self.isOverviewInitialised() ) {
                                self.initOverview();
                            }
                            self.showRequestsDetail( id );
                        }
                        break;
                }

                if( !self.generateTestData ) {
                    self.initGenerateTestData();
                }

                self.view( state.view );

            },

            isRequestsTableInitialized: function() {
                var
                    self = this;

                return Boolean( self.requestsTable );
            },

            initGenerateTestData: function() {
                var
                    self = this,
                    KoUI = Y.doccirrus.KoUI,
                    KoComponentManager = KoUI.KoComponentManager;

                self.generateTestData = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'add_test_data',
                        text: 'Add Test Data',
                        click: function() {
                            Y.doccirrus.jsonrpc.api.dispatchrequest.generateTestData().done( function() {
                                self.requestsTable.reload();
                            } ).fail( function( response ) {
                                Y.log( 'Failed to generate test data. Error: ' + JSON.stringify( response.error ), 'error' );
                            } );
                        }
                    }
                } );
            },

            initRequestsTable: function() {
                var
                    self = this;

                self.requestsTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'dc-requests-table',
                        states: ['limit'],
                        striped: true,
                        remote: true,
                        sortersLimit: 2,
                        proxy: Y.doccirrus.jsonrpc.api.dispatchrequest.read,
                        baseParams: {
                            query: {
                                status: self.statusFilter()
                            }
                        },
                        columns: [
                            {
                                forPropertyName: 'status',
                                label: STATUS,
                                isFilterable: false,
                                isSortable: true,
                                width: '8%',
                                sortInitialIndex: 0,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                renderer: function( meta ) {
                                    return '<div style="text-align: center">' + getStatusMarkup( meta.value ) + '</div>';
                                }
                            },
                            {
                                forPropertyName: 'createdDate',
                                label: i18n( 'dispatchrequest-schema.DispatchRequest_T.createdDate' ),
                                isFilterable: true,
                                isSortable: true,
                                sortInitialIndex: 1,
                                direction: 'DESC',
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    var
                                        timestamp = meta.value,
                                        data = meta.row,
                                        format = data.allDay ? TIMESTAMP_FORMAT : TIMESTAMP_FORMAT_LONG;
                                    if( timestamp ) {
                                        return moment( timestamp ).format( format );
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                forPropertyName: 'dateConfirmed',
                                label: i18n( 'dispatchrequest-schema.DispatchRequest_T.dateConfirmed' ),
                                isFilterable: true,
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    var
                                        timestamp = meta.value,
                                        data = meta.row,
                                        format = data.allDay ? TIMESTAMP_FORMAT : TIMESTAMP_FORMAT_LONG;
                                    if( timestamp ) {
                                        return moment( timestamp ).format( format );
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                forPropertyName: 'actType',
                                label: i18n( 'IsDispatcherMojit.tab_requests.mandate' ),
                                isFilterable: false,
                                isSortable: false,
                                width: '180px',
                                renderer: function( meta ) {
                                    return getMandateByType( meta.row ) + '<br>(' + Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', meta.row.dispatchActivities[0].actType, 'i18n', '' ) + ')';

                                }
                            },
                            {
                                forPropertyName: 'locationName',
                                label: i18n( 'IsDispatcherMojit.tab_requests.practice' ),
                                isFilterable: false,
                                isSortable: false
                            },
                            {
                                forPropertyName: 'patientName',
                                label: i18n( 'IsDispatcherMojit.tab_requests.patient' ),
                                isFilterable: false,
                                isSortable: false
                            },
                            {
                                forPropertyName: 'patientId',
                                label: i18n( 'dispatchrequest-schema.DispatchRequest_T.patientId' ),
                                isFilterable: true,
                                isSortable: true
                            },
                            {
                                forPropertyName: 'bsnr',
                                label: i18n( 'dispatchrequest-schema.DispatchRequest_T.bsnr' ),
                                isFilterable: true,
                                isSortable: true
                            },
                            {
                                forPropertyName: 'lanr',
                                label: i18n( 'dispatchrequest-schema.DispatchRequest_T.lanr' ),
                                isFilterable: true,
                                isSortable: true
                            },
                            {
                                forPropertyName: '',
                                width: '70px',
                                isFilterable: false,
                                isSortable: false,
                                renderer: function() {
                                    return '<button class="btn btn-xs btn-link">' + i18n( 'IsDispatcherMojit.tab_requests.changes' ) + '</button>';
                                },
                                onCellClick: function( meta ) {
                                    var data = meta.row;
                                    Y.doccirrus.modals.dispatchRequestChanges.show( {dispatchRequestId: data._id} );
                                    return false;
                                }
                            }
                        ],
                        onRowClick: function( meta ) {
                            self.showRequestsDetail( meta.row._id );
                            return false;
                        }
                    }
                } );
            },

            showRequestsDetail: function( id ) {

                var mainSelf = this;

                getRequestById( id ).done( function( response ) {
                    var data = response.data && response.data[0];
                    if( !data ) {
                        Y.doccirrus.DCWindow.notice( {
                            message: i18n( 'InSuiteAdminMojit.tab_contacts.detail.message.NOT_FOUND' ),
                            callback: function() {

                            }
                        } );
                        return;
                    }

                    var node = Y.Node.create( '<div></div>' ),
                        self = this,
                        viewDetailsModel = new ViewDetailsModel( {
                            data: data
                        } ),
                        footerButtons = [Y.doccirrus.DCWindow.getButton( 'CANCEL' )],
                        isReadOnly = (data.status !== 0);

                    if( !isReadOnly ) {
                        footerButtons.push( Y.doccirrus.DCWindow.getButton( 'DISCARD', {
                            isDefault: true,
                            action: function() {
                                Y.doccirrus.DCWindow.confirm( {
                                    message: i18n( 'IsDispatcherMojit.tab_requests.details.dialog.discard_msg' ),
                                    callback: function TabRequestsMarkAsIrrelevant( e ) {
                                        if( e.success ) {
                                            viewDetailsModel.request.status( 3 );
                                            viewDetailsModel.request._save( null, function() {
                                                self.requestDetailsWindow.close( e );
                                                mainSelf.requestsTable.reload();
                                            }, function() {
                                                Y.doccirrus.DCWindow.notice( {
                                                    message: 'Save Error!',
                                                    callback: function() {
                                                    }
                                                } );
                                            } );
                                        }
                                    }
                                } );
                            }
                        } ) );

                        if( !viewDetailsModel.request.hasInvalidActivity() ) {
                            footerButtons.push( Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                isDefault: true,
                                action: function( e ) {
                                    viewDetailsModel.request.isValid().then( function( result ) {
                                        if( !result.hasError ) {
                                            viewDetailsModel.request._save( null, function() {
                                                self.requestDetailsWindow.close( e );
                                                mainSelf.requestsTable.reload();
                                            }, function() {
                                                Y.doccirrus.DCWindow.notice( {
                                                    message: 'Save Error!',
                                                    callback: function() {
                                                    }
                                                } );
                                            } );
                                        }
                                    } );
                                }
                            } ) );
                        }
                    }

                    self.requestDetailsWindow = new Y.doccirrus.DCWindow( {
                        bodyContent: node,
                        focusOn: [],
                        title: i18n( 'IsDispatcherMojit.tab_prc.details.dialog.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_WARN,
                        width: 640,
                        height: 665,
                        minHeight: 400,
                        minWidth: 640,
                        centered: true,
                        modal: true,
                        tabindex: 10,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: footerButtons
                        }
                    } );

                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'tab_requests_detail',
                        'IsDispatcherMojit',
                        {},
                        node,
                        function templateLoaded() {
                            ko.applyBindings( viewDetailsModel, node.getDOMNode() );
                        }
                    );

                } ).fail( fail );
            },

            setFilterByStatus: function setFilterByStatus( statusFilter ) {
                var
                    self = this;

                self.statusFilter( statusFilter );
            }
        },
        {
            NAME: 'RequestViewModel'
        } );

    KoViewModel.registerConstructor( RequestViewModel );

}, '1.0.0', {
    requires: [
        'oop',
        'KoViewModel',
        'dcutils',
        'dcrequestchangesmodal'
    ]
} );