/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'dcpatientandreceiptselect', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            KoViewModel = Y.doccirrus.KoViewModel,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            ActivityModel = KoViewModel.getConstructor( 'ActivityModel' );

        function PatientAndActivitySelectModel( config, actions ) {
            this.actions = actions;
            PatientAndActivitySelectModel.superclass.constructor.call( this, config );
        }

        Y.extend( PatientAndActivitySelectModel, KoViewModel.getDisposable(), {

            patientTable: null,
            activityTable: null,
            selectedPatientId: null,
            selectedActivityId: null,
            selectedActType: null,
            selectedActivityType: null,
            caseFolders: null,
            selected: null,
            caseFolderCollection: new (KoViewModel.getConstructor( 'CaseFolderCollection' )),
            destructor: function() {
            },

            initializer: function BinderViewModel_initializer() {
                var
                    self = this;

                self.selectPatientI18n = i18n( 'DeviceLogMojit.patientAndActivitySelectDlg.labels.selectPatient' );
                self.selectOrCreateActivityI18n = i18n( 'DeviceLogMojit.patientAndActivitySelectDlg.labels.selectOrCreateActivity' );
                self.newActivityI18n = i18n( 'DeviceLogMojit.patientAndActivitySelectDlg.labels.newActivity' );
                self.selectCaseFolderI18n = i18n( 'DeviceLogMojit.patientAndActivitySelectDlg.labels.selectCaseFolder' );
                self.saveButtonI18n = i18n( 'DCWindow.BUTTONS.SAVE' );
                self.cancelButtonI18n = i18n( 'DCWindow.BUTTONS.CANCEL' );
                self.initObservables();
                self.initActTypeList();
                self.initPatientTable();
                self.initActivityTable();
                self.initNewActivityTab();
                self.initSubscribe();

            },

            initObservables: function() {
                var
                    self = this;
                self.patientTable = null;
                self.activityTable = null;
                self.selectedPatientId = ko.observable( false );
                self.caseFolders = ko.observable( [] );
                self.selectedPatient = null;
                self.selectedActivityType = ko.observable( '' );
                self.selectedCaseFolder = ko.observable( null );
                self.actTypeList = ko.observableArray( [] );
            },

            initSubscribe: function() {
                var
                    self = this,
                    additionalTypes = Y.doccirrus.schemas.casefolder.additionalTypes;
                self.patientTable.getComponentColumnCheckbox().checked.subscribe( function( selectedPatient ) {
                    if( selectedPatient && selectedPatient.length ) {
                        self.selectedPatientId( selectedPatient[0]._id );
                        self.selectedPatient = selectedPatient[0];

                        self.caseFolderCollection.load( {patientId: selectedPatient[0]._id} )
                            .then( function( folders ) {
                                self.caseFolders( folders.filter( function( folder ) {
                                    return (!folder.imported && additionalTypes.QUOTATION !== folder.additionalType && additionalTypes.ERROR !== folder.additionalType);
                                } ) );
                            } );
                    } else {
                        self.selectedPatientId( false );
                    }
                } );

            },
            initActTypeList: function() {
                var
                    self = this;

                Y.doccirrus.jsonrpc.api.activitysettings
                    .read( {query: {_id: Y.doccirrus.schemas.activitysettings.getId()}} )
                    .then( function( response ) {
                        var settings = Y.Lang.isArray( response.data ) && response.data[0] && Y.Lang.isArray( response.data[0].settings ) && response.data[0].settings || [];

                        self.actTypeList( Y.doccirrus.utils.applySettingsToActivities( settings ).list.filter( function( act ) {
                            return act && act.availableIn.indexOf( 'mediabuch' ) > -1;
                        } ) );
                    } );
            },
            /**
             * Provides data for 'Neu' panel : list of caseFolders and activityLists based on 'selectedPatientId'.
             * Handle components state based on selected values : selectedPatientId, selectedFolder, selectedActivityType
             */
            initNewActivityTab: function() {
                var
                    self = this,
                    userLang = Y.doccirrus.comctl.getUserLang(),
                    lang = '-' + userLang,
                    actGroups = i18n( 'InCaseMojit.activity_model_clientJS.actGroups' ),
                    groupI18n = {
                        'CASEHISTORY': {'-de': actGroups.CASEHISTORY, '-en': actGroups.CASEHISTORY},
                        'ASSESSMENT': {'-de': actGroups.ASSESSMENT, '-en': actGroups.ASSESSMENT},
                        'THERAPY': {'-de': actGroups.THERAPY, '-en': actGroups.THERAPY},
                        'PROCESSES': {'-de': actGroups.PROCESSES, '-en': actGroups.PROCESSES},
                        'OPHTHALMOLOGY': {'-de': actGroups.OPHTHALMOLOGY, '-en': actGroups.OPHTHALMOLOGY}
                    },
                    selectedActivityBlockFolders = [];

                self.addNewButtonEnable = ko.observable( false );
                self.selectedFolder = ko.observable();
                self.selectedActivityItem = ko.observable( null );

                self._select2actType = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            return ko.unwrap( self.selectedActivityItem ) || null;
                        },
                        write: function( $event ) {
                            //  Prevent infinite loop on changing programatically
                            if( !$event.val ) {
                                return;
                            }

                            self.selectedActivityType( $event.val );
                            self.selectedActivityItem( $event.added );
                        }
                    } ) ),
                    placeholder: i18n( 'InCaseMojit.activity_model_clientJS.placeholder.SELECT_TYPE' ),
                    select2: {
                        allowClear: true,
                        query: (function( query ) {
                            var
                                groups = {},
                                data = [];
                            if( !ko.unwrap( self.selectedCaseFolder ) ) {
                                query.callback( {results: []} );
                            }
                            self.actTypeList().forEach( function( item ) {
                                var
                                    group = item.group,
                                    blockItemForCurrentCaseFolder = Array.isArray( item.blockForCaseFolderTypes ) && ko.unwrap( self.selectedCaseFolder ) && item.blockForCaseFolderTypes.indexOf( ko.unwrap( self.selectedCaseFolder ).type ) > -1;

                                if( !item.visible || blockItemForCurrentCaseFolder || (item.availableIn && item.availableIn.indexOf( 'mediabuch' ) === -1) ) {
                                    return;
                                }

                                if( !(group in groups) ) {
                                    groups[group] = {text: groupI18n[group][lang], children: []};
                                    data.push( groups[group] );
                                }

                                if( query.term && item[lang].indexOf( query.term ) === -1 ) {
                                    return;
                                }

                                groups[group].children.push( {
                                    id: item.val,
                                    text: item[lang],
                                    blockFolders: item.blockForCaseFolderTypes
                                } );
                            } );

                            //remove empty groups
                            data = data.filter( function( group ) {
                                return group.children.length;
                            } );

                            if( query ) {
                                query.callback( {results: data} );
                            } else {
                                query.callback( {results: []} );
                            }
                        })
                    }
                };

                self.addDisposable( ko.computed( function() {
                    if( Array.isArray( selectedActivityBlockFolders ) && selectedActivityBlockFolders.indexOf( (ko.unwrap( self.selectedFolder ) || {}).type ) > -1 ) {
                        self.selectedActivityType( null );
                        self.selectedActivityItem( null );
                    }
                    self.selectedCaseFolder( (ko.unwrap( self.selectedFolder ) || null) );
                } ) );

                self.addNewButtonEnable = ko.computed( function() {
                    return (ko.unwrap( self.selectedPatientId ) && ko.unwrap( self.selectedFolder ) && ko.unwrap( self.selectedFolder )._id);
                } );

                self.enableSelect2Component = ko.computed( function() {
                    return !(ko.unwrap( self.selectedPatientId ) && (ko.unwrap( self.caseFolders ) || {}).length);
                } );

                self.addDisposable( ko.computed( function() {
                    var patientId = ko.unwrap( self.selectedPatientId ) || -1;

                    if( patientId === -1 ) {
                        return;
                    }
                    self.selectedActivityType( null );
                    self.selectedActivityItem( null );
                    self.selectedCaseFolder = ko.observable( null );

                } ) );

                self.createNewActivity = function() {
                    self.actions.addAsNew();
                };
            },
            initActivityTable: function() {
                var
                    self = this,
                    activityTable,
                    typeList = [];

                self.addDisposable( ko.computed( function() {
                    typeList = ko.unwrap( self.actTypeList ).map( function( act ) {
                        return act.val;
                    } );
                } ) );

                function getCaseFileLight( request ) {
                    var {query: query} = request;

                    if( !query.actType ) {
                        query.actType = {'$in': typeList};
                    }
                    return Y.doccirrus.jsonrpc.api.activity.getCaseFileLight( request );
                }

                self.activityTable = activityTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'devicelog-activitiesTable',
                        states: ['limit', 'usageShortcutsVisible'],
                        striped: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: getCaseFileLight,
                        baseParams: {
                            query: ko.pureComputed( function() {
                                var
                                    patientId = ko.unwrap( self.selectedPatientId ) || -1;

                                return {
                                    patientId: patientId,
                                    status: 'VALID'
                                };
                            } )
                        },
                        limit: 10,
                        limitList: [10, 20, 30, 40, 50, 100],
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: '',
                                checkMode: 'single',
                                allToggleVisible: false
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
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: ko.computed( function() {
                                        return ko.unwrap( self.actTypeList );
                                    } ),
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
                                isFilterable: true
                            },
                            {
                                forPropertyName: 'code',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                                width: '110px',
                                isSortable: true,
                                isFilterable: true,
                                renderer: function( meta ) {
                                    var
                                        data = meta.row;

                                    return Y.doccirrus.schemas.activity.displayCode( data );
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
                                forPropertyName: 'editor.name',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                                width: '30%',
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
                                forPropertyName: 'price',
                                label: i18n( 'activity-schema.Price_T.price.i18n' ),
                                title: i18n( 'activity-schema.Price_T.price.i18n' ),
                                width: '90px',
                                isSortable: true,
                                visible: false,
                                renderer: function( meta ) {
                                    var
                                        price = meta.value;

                                    if( Y.Lang.isNumber( price ) ) {
                                        return Y.doccirrus.comctl.numberToLocalString( price );
                                    }

                                    return '';
                                }
                            },
                            {
                                forPropertyName: 'billingFactorValue',
                                label: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.billingFactorValue.label' ),
                                title: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.billingFactorValue.label' ),
                                width: '70px',
                                visible: false,
                                renderer: function( meta ) {
                                    var
                                        billingFactorValue = meta.value,
                                        data = meta.row;

                                    if( 'TREATMENT' === data.actType ) {
                                        return billingFactorValue;
                                    }

                                    return '';
                                }
                            },
                            {
                                forPropertyName: 'quarterColumn',
                                label: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.quarter.label' ),
                                title: i18n( 'InCaseMojit.casefile_browser.activitiesTable.column.quarter.label' ),
                                width: '100px',
                                visible: false,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.QUARTER_YEAR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    placeholder: 'Qn YYYY',
                                    // options: quarterColumnFilterList,
                                    optionsText: 'text',
                                    optionsValue: 'value',
                                    allowValuesNotInOptions: true,
                                    // possibility to set own "Qn YYYY"
                                    provideOwnQueryResults: function( options, data ) {
                                        var
                                            term = options.term,
                                            results = [];

                                        if( data.every( function( item ) {
                                            return !options.matcher( term, item.text );
                                        } ) ) {
                                            results.push( term );
                                        }

                                        return results;
                                    }
                                },
                                renderer: function( meta ) {
                                    var
                                        data = meta.row,
                                        timestamp = data.timestamp,
                                        momTimestamp;

                                    if( timestamp ) {
                                        momTimestamp = moment( timestamp );
                                        return 'Q' + momTimestamp.quarter() + ' ' + momTimestamp.get( 'year' );
                                    }

                                    return '';
                                }
                            },
                            {
                                forPropertyName: 'caseFolderTitle',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                                width: '30%',
                                isSortable: true,
                                isFilterable: true,
                                visible: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: self.caseFolders,
                                    optionsText: 'title',
                                    optionsValue: '_id'
                                }
                            }
                        ],
                        responsive: false,
                        tableMinWidth: ko.computed( function() {
                            var
                                initializedColumns = activityTable.columns.peek(),
                                visibleColumns = initializedColumns.filter( function( col ) {
                                    return ko.unwrap( col.visible );
                                } ),
                                tableMinWidth = 0;

                            // only "tableMinWidth" when those columns are visible
                            if( !Y.Array.find( visibleColumns, function( col ) {
                                if( col.forPropertyName === 'locationName' || col.forPropertyName === 'price' || col.forPropertyName === 'billingFactorValue' || col.forPropertyName === 'quarterColumn' ) {
                                    return true;
                                }
                                return false;
                            } ) ) {
                                activityTable.responsive( true );
                                return '';
                            } else {
                                activityTable.responsive( false );
                            }

                            visibleColumns.forEach( function( col ) {
                                var
                                    width = ko.utils.peekObservable( col.width ) || '';

                                if( width.indexOf( '%' ) > 0 ) {
                                    tableMinWidth += 200;
                                } else {
                                    tableMinWidth += parseInt( width, 10 );
                                }
                            } );

                            return tableMinWidth + 'px';
                        }, null, {deferEvaluation: true} ).extend( {rateLimit: 0} ),
                        selectMode: 'single',
                        draggableRows: false,
                        // getStyleRow: function getStyleRow( data ) {
                        //     var
                        //         result = '';
                        //
                        //     if( data.actType && actTypeColorMap[data.actType] ) {
                        //         result = 'background-color:' + actTypeColorMap[data.actType];
                        //     }
                        //
                        //     return result;
                        // },
                        getCssRow: function( $context, css ) {
                            var
                                ATTRIBUTES = Y.doccirrus.schemas.activity.ATTRIBUTES,
                                _attributes = $context.$data._attributes || [];

                            Y.each( ATTRIBUTES, function( value, key ) {
                                if( -1 < _attributes.indexOf( value ) ) {
                                    css['activity-attribute-' + key] = true;
                                }
                            } );
                        }
                    }
                } );
            },

            initPatientTable: function() {
                var
                    self = this,
                    userFilter = Y.doccirrus.utils.getFilter(),
                    filterQuery = userFilter && userFilter.location && {'insuranceStatus.locationId': userFilter.location};

                self.patientTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'devicelog-patientTable',
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
                                    return moment.utc( data.dob ).local().format( 'DD.MM.YYYY' );
                                }
                            },

                            {
                                forPropertyName: 'gender',
                                label: i18n( 'InCaseMojit.patient_browserJS.label.SEX' ),
                                title: i18n( 'InCaseMojit.patient_browserJS.label.SEX' ),
                                width: '60px',
                                renderer: function( meta ) {
                                    var gender = meta.value;

                                    switch( gender ) {
                                        case 'MALE':
                                            return 'm';
                                        case 'FEMALE':
                                            return 'w';
                                        case 'UNDEFINED':
                                            return 'x';
                                        case 'VARIOUS':
                                            return 'd';
                                        default:
                                            return 'u';
                                    }

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
                                    options: Y.doccirrus.schemaloader.filterEnumByCountryMode( Y.doccirrus.schemas.person.types.Insurance_E.list ),
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            }
                        ]
                    }
                } );
            }
        } );

        function PatientAndActivitySelectModal() {

        }

        PatientAndActivitySelectModal.prototype.showDialog = function( data, callback ) {

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
                    .renderFile( {path: 'BankLogMojit/views/patientAndReceiptSelectDialog'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            modal,
                            bodyContent = Y.Node.create( template );

                        function cancel() {
                            modal.close();
                        }

                        function addAsNew() {
                            var
                                caseFolderId = ko.unwrap( patAndActSelModel.selectedCaseFolder )._id,
                                patientId = ko.unwrap( patAndActSelModel.selectedPatientId );
                            if( caseFolderId ) {
                                Y.doccirrus.jsonrpc.api.banklog.claimBankLogEntry( {
                                    data: {
                                        patientId: patientId,
                                        caseFolderId: caseFolderId,
                                        bankLogId: data._id,
                                        amount: data.Amount
                                    }
                                } ).then( function() {
                                    callback( {success: true} );
                                } ).fail( onFail );

                                modal.close();
                            }
                        }

                        var
                            patAndActSelModel = new PatientAndActivitySelectModel( {}, {
                                cancel: cancel,
                                addAsNew: addAsNew
                            } );

                        modal = new Y.doccirrus.DCWindow( {
                            bodyContent: bodyContent,
                            title: i18n( 'DeviceLogMojit.patientAndActivitySelectDlg.title.text' ),
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
                        } );

                        modal.resizeMaximized.set( 'maximized', true );
                        modal.set( 'focusOn', [] );
                        ko.applyBindings( patAndActSelModel, bodyContent.getDOMNode() );
                    } ).catch( catchUnhandled );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).patientAndReceiptSelect = new PatientAndActivitySelectModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'ActivityModel',
            'promise',
            'CaseFolderCollection',
            'activitysettings-schema'
        ]
    }
);
