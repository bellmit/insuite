/**
 * User: abhijit.baldawa
 * Date: 08.11.17  15:46
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'DcAssignToActivity' , function( Y ) {
    var
        i18n = Y.doccirrus.i18n,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' );

    function showConfirmBox( type, message, method ) {
        Y.doccirrus.DCWindow.notice( {
            type: type,
            message: message,
            window: {
                width: 'medium',
                buttons: {
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'YES', {
                            action: function() {
                                this.close();
                                method( true );
                            }
                        } ),
                        Y.doccirrus.DCWindow.getButton( 'NO', {
                            isDefault: true,
                            action: function() {
                                this.close();
                                method( false );
                            }
                        } )
                    ]
                }
            }
        } );
    }

    function PatientAndActivitySelectModel( config ) {
        PatientAndActivitySelectModel.superclass.constructor.call( this, config );
    }

    Y.extend( PatientAndActivitySelectModel, KoViewModel.getDisposable(), {
        patientTable: null,
        activityTable: null,
        selectedPatientId: null,
        selectedActivityId: null,

        destructor: function() {
        },

        initializer: function BinderViewModel_initializer() {
            var
                self = this;

            self.initObservables();
            self.initPatientTable();
            self.initActivityTable();
            self.initSubscribe();
        },

        initObservables: function() {
            var
                self = this;
            self.patientTable = null;
            self.activityTable = null;
            self.selectedPatientId = ko.observable( false );
            self.selectedActivityId = ko.observable( false );
        },

        initSubscribe: function() {
            var
                self = this;

            self.patientTable.getComponentColumnCheckbox().checked.subscribe( function( selectedPatient ) {
                if( selectedPatient && selectedPatient.length ) {
                    self.selectedPatientId( selectedPatient[0]._id );
                } else {
                    self.selectedPatientId( false );
                }
            } );

            self.activityTable.getComponentColumnCheckbox().checked.subscribe( function( selectedActivity ) {
                if( selectedActivity && selectedActivity.length ) {
                    self.selectedActivityId( selectedActivity[0]._id );
                } else {
                    self.selectedActivityId( false );
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
                    stateId: 'inpacslog-patientTable',
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
                                options: Y.doccirrus.schemas.person.types.Insurance_E.list,
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            }
                        }
                    ]
                }
            } );
        },

        initActivityTable: function() {
            var
                self = this,
                activityTable;

            self.activityTable = activityTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'inpacslog-activitiesTable',
                    states: ['limit', 'usageShortcutsVisible'],
                    striped: false,
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.activity.getCaseFileLight,
                    baseParams: {
                        query: ko.pureComputed( function() {
                            var
                                patientId = ko.unwrap( self.selectedPatientId ) || -1;

                            return {
                                patientId: patientId,
                                status: 'VALID',
                                actType: 'FINDING',
                                studyId: {$exists: false},
                                g_extra: {$exists: false}
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
                            forPropertyName: 'subType',
                            label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                            title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                            isSortable: true,
                            isFilterable: true,
                            width: '100px',
                            renderer: function( meta ) {
                                var data = meta.row;

                                if( data.subType ) {
                                    return data.subType;
                                } else {
                                    return '';
                                }
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
                        }
                        else {
                            activityTable.responsive( false );
                        }

                        visibleColumns.forEach( function( col ) {
                            var
                                width = ko.utils.peekObservable( col.width ) || '';

                            if( width.indexOf( '%' ) > 0 ) {
                                tableMinWidth += 200;
                            }
                            else {
                                tableMinWidth += parseInt( width, 10 );
                            }
                        } );

                        return tableMinWidth + 'px';
                    }, null, {deferEvaluation: true} ).extend( {rateLimit: 0} ),
                    selectMode: 'single',
                    draggableRows: false,
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
        }
    } );

    function PatientAndActivitySelectModal() {
    }

    PatientAndActivitySelectModal.prototype.showDialog = function( data, callback ) {

        function onFail( error ) {
            if(error && typeof error === "string") {
                error = {message:error};
            } else if( typeof error === "object" && !error.message ) {
                if( error.data ) {
                    error.message = error.data;
                }
            }

            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                message: error && error.message || 'Undefined error',
                window: {
                    width: Y.doccirrus.DCWindow.SIZE_SMALL
                }
            } );
        }

        function show() {

            Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( { path: 'InPacsLogMojit/views/assignToActivityDialog' } )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    var
                        modal,
                        bodyContent = Y.Node.create( template ),
                        patAndActSelModel = new PatientAndActivitySelectModel(),
                        loadingMaskNode = bodyContent.getDOMNode();

                    modal = new Y.doccirrus.DCWindow( {
                        bodyContent: bodyContent,
                        title: i18n( 'InpacsLogMojit.assignToActivityDialog.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        centered: true,
                        modal: true,
                        maximizable: true,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function() {
                                        modal.close();
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    isDefault: true,
                                    action: function( e ) {
                                        var
                                            componentColumnCheckbox = patAndActSelModel.activityTable.getComponentColumnCheckbox(),
                                            checked = componentColumnCheckbox.checked();

                                        if( checked && checked.length ) {
                                            showConfirmBox("warn", i18n( 'InpacsLogMojit.assignToActivityDialog.overrideDicomMessage' ), function( modifyDicom ) {
                                                Y.doccirrus.utils.showLoadingMask(loadingMaskNode);

                                                //Make a websocket call in case very large set of DICOM files which can take some time
                                                Y.doccirrus.communication.apiCall( {
                                                    method: 'inpacslog.assignInpacsEntryToActivity',
                                                    data: {
                                                        patientId: ko.unwrap( patAndActSelModel.selectedPatientId ),
                                                        activityId: checked[0]._id,
                                                        inpacsLogEntry: data,
                                                        modifyDicom: modifyDicom
                                                    }
                                                }, function( err ) {
                                                    if( err ) {
                                                        Y.doccirrus.utils.hideLoadingMask(loadingMaskNode);
                                                        onFail( err );
                                                    } else {
                                                        modal.close( e );
                                                        callback( {success: true} );
                                                    }
                                                } );
                                            });
                                        }
                                    }
                                } )
                            ]
                        }
                    } );

                    if( loadingMaskNode.parentNode && loadingMaskNode.parentNode.parentNode ) { //To disable the entire popup
                        loadingMaskNode = loadingMaskNode.parentNode.parentNode;
                    }

                    ko.computed( function onTagsChanged() {
                        var patId = ko.unwrap( patAndActSelModel.selectedPatientId ),
                            actId = ko.unwrap( patAndActSelModel.selectedActivityId );

                        if( patId && actId ) {
                            modal.getButton( 'SAVE' ).button.enable();
                        } else {
                            modal.getButton( 'SAVE' ).button.disable();
                        }
                    } );

                    modal.resizeMaximized.set( 'maximized', true );
                    modal.set( 'focusOn', [] );
                    patAndActSelModel.selectPatientI18n = i18n( 'InpacsLogMojit.assignToActivityDialog.patient.selectPatient' );
                    patAndActSelModel.selectActivityI18n = i18n( 'InpacsLogMojit.assignToActivityDialog.activity.selectActivity' );
                    ko.applyBindings( patAndActSelModel, bodyContent.getDOMNode() );
                } ).catch( catchUnhandled );
        }

        show();
    };

    Y.namespace( 'doccirrus.modals' ).assignToActivitySelectModal = new PatientAndActivitySelectModal();

}, '0.0.1', {
    requires: [
        'oop',
        'DCWindow',
        'ActivityModel',
        'promise'
    ]
});