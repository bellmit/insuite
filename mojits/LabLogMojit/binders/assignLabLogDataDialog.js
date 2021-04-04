/**
 * User: maximilian.kramp
 * Date: 08.10.19  09:49
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, jQuery */

'use strict';

YUI.add( 'dc-assignLabLogData', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            unwrap = ko.unwrap,
            KoViewModel = Y.doccirrus.KoViewModel;

        function AssignLabLogModal( config, actions ) {
            this.actions = actions;
            AssignLabLogModal.superclass.constructor.call( this, config );
        }

        Y.extend( AssignLabLogModal, KoViewModel.getDisposable(), {

            patientTable: null,
            selectedPatientId: null,
            caseFolders: null,
            selected: null,
            caseFolderCollection: new (KoViewModel.getConstructor( 'CaseFolderCollection' )),
            /**
             * Determines if details should be shown
             * @type {null|ko.observable}
             */
            detailsVisible: null,
            destructor: function() {

            },

            initializer: function() {
                var
                    self = this;

                self.labDataI18n = i18n( 'activity-schema.Activity_E.LABDATA' );
                self.changeConfigurationI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.changeConfiguration' );
                self.billingFlagI18n = i18n( 'flow-schema.Transformer_T.billingFlag' );
                self.disallowGkvBillingI18n = i18n( 'flow-schema.Transformer_T.disallowGkvBilling' );
                self.allowGkvBillingI18n = i18n( 'flow-schema.Transformer_T.allowGkvBilling' );
                self.useDataFromLabrequestIfPresentI18n = i18n( 'flow-schema.Transformer_T.useDataFromLabrequestIfPresent' );
                self.selectPatientI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.selectPatient' );
                self.selectCaseFolderI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.selectCaseFolder' );
                self.patientFirstnameI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.patientFirstname' );
                self.patientLastnameI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.patientLastname' );
                self.patientDobI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.patientDob' );
                self.patientGenderI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.patientGender' );
                self.patientFindingKindI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.patientFindingKind' );
                self.patientBillingTypeI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.patientBillingType' );
                self.patientFeeScheduleI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.patientFeeSchedule' );
                self.patientLabReqReceivedI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.patientLabReqReceived' );
                self.patientFindingKindI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.patientFindingKind' );
                self.patientReportDateI18n = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.patientReportDate' );
                self.saveButtonI18n = i18n( 'DCWindow.BUTTONS.SAVE' );
                self.cancelButtonI18n = i18n( 'DCWindow.BUTTONS.CANCEL' );
                self.initObservables();
                self.initChangeConfiguration();
                self.initPatientTable();
                self.initNewActivityTab();
                self.initSubscribe();

            },

            initObservables: function() {
                var
                    self = this;
                self.patientTable = null;
                self.selectedPatientId = ko.observable( false );
                self.selectedActivityId = ko.observable( false );
                self.caseFolders = ko.observable( [] );
                self.selectedPatient = null;
                self.selectedActivityType = ko.observable( '' );
                self.selectedCaseFolder = ko.observable( null );
                self.actTypeList = ko.observableArray( [] );
                self.detailsVisible = ko.observable( false );
            },

            initChangeConfiguration: function() {
                var
                    self = this;

                self.billingFlag = ko.observable( false );
                self.allowGkvBilling = ko.observable( false );
                self.disallowGkvBilling = ko.observable( false );
                self.useDataFromLabrequestIfPresent = ko.observable( false );

                self.patientLabData = i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.none' );
            },

            initSubscribe: function() {
                var self = this;
                self.patientTable.getComponentColumnCheckbox().checked.subscribe( function( selectedPatient ) {
                    if( selectedPatient && selectedPatient.length ) {
                        self.selectedPatientId( selectedPatient[0]._id );
                        self.selectedPatient = selectedPatient[0];

                        self.caseFolderCollection.load( {patientId: selectedPatient[0]._id} )
                            .then( function( folders ) {
                                self.caseFolders( folders.filter( function( folder ) {
                                    switch( folder.additionalType ) {
                                        case 'ASV':
                                            return true;
                                    }
                                    return (
                                        !folder.imported &&
                                        !folder.additionalType &&
                                        folder.type &&
                                        folder.type !== "PREPARED"
                                    );
                                } ) );
                            } );
                    } else {
                        self.selectedPatientId( false );
                        self.caseFolders( [] );
                    }
                } );

            },
            /**
             * Provides data for 'Neu' panel : list of caseFolders and activityLists based on 'selectedPatientId'.
             * Handle components state based on selected values : selectedPatientId, selectedFolder, selectedActivityType
             */
            initNewActivityTab: function() {
                var self = this;

                self.saveButtonEnable = ko.observable( true );
                self.selectedFolder = ko.observable();

                self.addDisposable( ko.computed( function() {
                    self.selectedCaseFolder( (unwrap( self.selectedFolder ) || null) );
                } ) );

                self.saveButtonEnable = ko.computed( function() {
                    return unwrap( self.selectedPatientId ) && unwrap( self.selectedFolder ) && unwrap( self.selectedFolder )._id;
                } );

                self.addDisposable( ko.computed( function() {
                    var patientId = unwrap( self.selectedPatientId ) || -1;

                    if( patientId === -1 ) {
                        return;
                    }
                    self.selectedCaseFolder = ko.observable( null );

                } ) );

                self.save = function() {
                    self.actions.save();
                };
            },

            //1.
            initPatientTable: function() {
                var
                    self = this,
                    userFilter = Y.doccirrus.utils.getFilter(),
                    filterQuery = userFilter && userFilter.location && {'insuranceStatus.locationId': userFilter.location};

                self.patientTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'lablog-patientTable',
                        states: ['limit', 'usageShortcutsVisible'],
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.patient.getForPatientBrowser,
                        baseParams: {query: filterQuery},
                        limitList: [5, 10, 20, 30, 40, 50],
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: '',
                                checkMode: 'single',
                                allToggleVisible: false
                            },
                            {
                                forPropertyName: 'lastname',
                                label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                                width: '35%',
                                isSortable: true,
                                sortInitialIndex: 0,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    var data = meta.row;
                                    return data.lastname + (data.nameaffix ? ', ' + data.nameaffix : '') + (data.title ? ', ' + data.title : '');
                                }
                            },
                            {
                                forPropertyName: 'firstname',
                                label: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                                width: '35%',
                                isSortable: true,
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'dob',
                                label: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                                width: '142px',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    var data = meta.row;
                                    if( data.kbvDob ) {
                                        return data.kbvDob;
                                    }
                                    return moment.utc( data.dob ).local().format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                                }
                            },

                            {
                                forPropertyName: 'gender',
                                label: i18n( 'patient-schema.Gender_E.i18n' ),
                                title: i18n( 'patient-schema.Gender_E.i18n' ),
                                width: '90px',
                                renderer: function( meta ) {
                                    var gender = meta.value;

                                    return Y.doccirrus.schemas.patient.mapGenderKBV( gender );

                                },
                                isFilterable: true,
                                visible: false,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect',
                                    options: Y.Array.filter( Y.doccirrus.schemas.patient.types.Gender_E.list, function( item ) {
                                        return Boolean( item.val );
                                    } ).map( function( item ) {
                                        var gender = item.val;

                                        switch( gender ) {
                                            case 'MALE':
                                                return {val: gender, i18n: 'm'};
                                            case 'FEMALE':
                                                return {val: gender, i18n: 'w'};
                                            case 'UNDEFINED':
                                                return {val: gender, i18n: 'x'};
                                            case 'VARIOUS':
                                                return {val: gender, i18n: 'd'};
                                            default:
                                                return {val: gender, i18n: 'u'};
                                        }
                                    } ),
                                    optionsCaption: '',
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            },
                            {
                                forPropertyName: 'insuranceStatus.type',
                                label: i18n( 'InCaseMojit.patient_browserJS.placeholder.INSURANCE' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.placeholder.INSURANCE' ),
                                width: '136px',
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    var
                                        data = meta.row,
                                        insuranceStatus = data.insuranceStatus;

                                    if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                                        return insuranceStatus.map( function( entry ) {
                                            return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', entry.type, 'i18n', '' );
                                        } ).join( ', ' );
                                    }

                                    return '';
                                },
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.person.types.Insurance_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            }
                        ]
                    }
                } );
            },
            /**
             * Click event handler of a row. Will show the details associated to that row.
             * @param {FileTableRecord} $data
             * @param {jQuery.Event} $event
             */
            onRowClick: function( $data, $event ) {
                var
                    self = this,
                    $target = jQuery( $event.target );

                if( $target.is( 'a' ) || $target.parents( 'a' ).get( 0 ) ) {
                    return true;
                }
                $event.stopPropagation();

                self.detailsVisible( !self.detailsVisible() );
            }
        } );

        AssignLabLogModal.prototype.showDialog = function( data, callback ) {
            function onFail( error ) {
                if( typeof error === "string" ) {
                    // Should never go here. Keeping this as last resort
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: error || 'Undefined error',
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_SMALL
                        }
                    } );
                } else if( error && error.code === "115027" ) {
                    // NOTE: Should never happen as from the UI only the VALID activities are shown but still keeping this check
                    // Means the deviceLog entry cannot be assigned to activity because the activity cannot be changed in its current state
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display', 'info' );
                } else {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                }
            }

            function show() {

                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'LabLogMojit/views/assignLabLogDataDialog'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            bodyContent = Y.Node.create( template ),
                            assignLabLogModal = new AssignLabLogModal( {}, {
                                cancel: cancel,
                                save: save
                            } ),
                            modal = new Y.doccirrus.DCWindow( {
                                bodyContent: bodyContent,
                                title: i18n( 'LabLogMojit.tab_labLog.assignLabLogData.title' ),
                                icon: Y.doccirrus.DCWindow.ICON_LIST,
                                centered: true,
                                modal: true,
                                maximizable: true,
                                width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                                height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                                render: document.body,
                                buttons: {
                                    header: ['close', 'maximize']
                                }
                            } ),
                            mainRecord = data.l_data.records.length > 3 ? data.l_data.records[2] : data.l_data.records[1],
                            isValid;

                        modal.set( 'focusOn', [] );

                        assignLabLogModal.billingFlag( data.configuration ? data.configuration.pre.billingFlag : data.billingFlag );
                        assignLabLogModal.allowGkvBilling( data.configuration ? data.configuration.pre.gkvBillingFlag : data.allowGkvBilling );
                        assignLabLogModal.disallowGkvBilling( data.configuration ? data.configuration.pre.disallowGkvBilling : data.disallowGkvBilling );
                        assignLabLogModal.useDataFromLabrequestIfPresent( data.configuration ? data.configuration.pre.useDataFromLabrequestIfPresent : data.useDataFromLabrequestIfPresent );

                        isValid = moment( Y.doccirrus.schemas.lablog.getRecordLabReqReceived( mainRecord ) ).isValid();
                        assignLabLogModal.patientLabReqReceived = isValid ? moment( Y.doccirrus.schemas.lablog.getRecordLabReqReceived( mainRecord ) ).format( i18n( 'general.TIMESTAMP_FORMAT_LONG' ) ) : i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.none' );

                        isValid = moment( Y.doccirrus.schemas.lablog.getRecordReportDate( mainRecord ) ).isValid();
                        assignLabLogModal.patientReportDate = isValid ? moment( Y.doccirrus.schemas.lablog.getRecordReportDate( mainRecord ) ).format( i18n( 'general.TIMESTAMP_FORMAT_LONG' ) ) : i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.none' );
                        assignLabLogModal.patientFirstname = Y.doccirrus.schemas.lablog.getRecordPatientFirstName( mainRecord ) || i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.none' );
                        assignLabLogModal.patientLastname = Y.doccirrus.schemas.lablog.getRecordPatientLastName( mainRecord ) || i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.none' );

                        isValid = moment( Y.doccirrus.schemas.lablog.getRecordPatientDoB( mainRecord ) ).isValid();
                        assignLabLogModal.patientDob = isValid ? moment( Y.doccirrus.schemas.lablog.getRecordPatientDoB( mainRecord ) ).format( i18n( 'general.TIMESTAMP_FORMAT' ) ) : i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.none' );
                        assignLabLogModal.patientGender = Y.doccirrus.schemas.lablog.getRecordPatientGender( mainRecord ) || i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.none' );
                        assignLabLogModal.patientFindingKind = Y.doccirrus.schemas.lablog.stringMapFindingKind( mainRecord, data )[1] || i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.none' );
                        assignLabLogModal.patientBillingType = Y.doccirrus.schemas.lablog.stringMapBillingType( mainRecord, data )[1] || i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.none' );
                        assignLabLogModal.patientFeeSchedule = Y.doccirrus.schemas.lablog.stringMapFeeSchedule( mainRecord, data )[1] || i18n( 'LabLogMojit.tab_labLog.assignLabLogData.labels.none' );

                        ko.applyBindings( assignLabLogModal, bodyContent.getDOMNode() );

                        function cancel() {
                            modal.close();
                        }

                        function save() {
                            var
                                caseFolder = unwrap( assignLabLogModal.selectedCaseFolder ),
                                patientId = unwrap( assignLabLogModal.selectedPatientId ),
                                billingFlag = unwrap( assignLabLogModal.billingFlag ),
                                allowGkvBilling = unwrap( assignLabLogModal.allowGkvBilling ),
                                disallowGkvBilling = unwrap( assignLabLogModal.disallowGkvBilling ),
                                useDataFromLabrequestIfPresent = unwrap( assignLabLogModal.useDataFromLabrequestIfPresent );

                            if( data && data.index ) {
                                Y.doccirrus.jsonrpc.api.lab.assignOldLabLog( {
                                    data: {
                                        allowGkvBilling: allowGkvBilling,
                                        billingFlag: billingFlag,
                                        disallowGkvBilling: disallowGkvBilling,
                                        caseFolder: caseFolder,
                                        labLog: data,
                                        patientId: patientId
                                    }
                                } ).then( function() {
                                    modal.close();
                                    callback( {success: true} );
                                } ).fail( onFail );
                            } else {
                                Y.doccirrus.jsonrpc.api.lab.assignLabLog( {
                                    data: {
                                        allowGkvBilling: allowGkvBilling,
                                        billingFlag: billingFlag,
                                        disallowGkvBilling: disallowGkvBilling,
                                        useDataFromLabrequestIfPresent: useDataFromLabrequestIfPresent,
                                        caseFolder: caseFolder,
                                        labLog: data,
                                        patientId: patientId
                                    }
                                } ).then( function() {
                                    modal.close();
                                    callback( {success: true} );
                                } ).fail( onFail );
                            }
                        }

                    } ).catch( catchUnhandled );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).assignLabLogData = new AssignLabLogModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'promise',
            'CaseFolderCollection',
            'activitysettings-schema'
        ]
    }
);
