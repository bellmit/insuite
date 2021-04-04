/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'ApkInProgressViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        peek = ko.utils.peekObservable,
        I18N_PATIENT_LINK_TITLE = 'Zur Patienten Akte springen',

        InCaseMojitViewModel = KoViewModel.getConstructor( 'InCaseMojitViewModel' ),

        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    /**
     * @constructor
     * @class ApkInProgressViewModel
     * @extends InCaseMojitViewModel
     */
    function ApkInProgressViewModel() {
        ApkInProgressViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ApkInProgressViewModel, InCaseMojitViewModel, {
        templateName: 'ApkInProgressViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initApkInProgressViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        initApkInProgressViewModel: function() {
            var
                self = this,
                apkInProgressTable,
                locationsList = [],
                employeeList = [],
                insuranceTypeList = Y.doccirrus.schemaloader.filterEnumByCountryMode(Y.doccirrus.schemas.person.types.Insurance_E.list)
                    .map( function( insuranceEntry ) {
                       return {id: insuranceEntry.val, text: insuranceEntry.i18n};
                      } ),
                apkStateList = Y.doccirrus.schemas.activity.types.ApkState_E.list,
                selectedAPKEntry = ko.observable( null ),
                patientLink,
                dateSelector = KoComponentManager.createComponent( {
                    componentType: 'KoDateRangeSelector'
                } ),
                timestamp = {
                    '$lte': dateSelector.endDate(),
                    '$gte': dateSelector.startDate()
                },
                baseParams = {
                    period: ko.observable( timestamp ),
                    apkState: ko.observable( 'IN_PROGRESS' ),
                    locationFilter: ko.observableArray(),
                    insuranceTypeFilter: ko.observableArray(),
                    employeeFilter: ko.observableArray()
                };

            self.addDisposable( ko.computed( function() {
                timestamp.$lte = dateSelector.endDate();
                timestamp.$gte = dateSelector.startDate();
                baseParams.period(timestamp);
            } ) );

            Y.doccirrus.jsonrpc.api.location
                .read()
                .then( function( response ) {
                    return response && response.data || [];
                } )
                .done( function( locations ) {
                    locationsList.push.apply( locationsList, locations );
                } );

            Y.doccirrus.jsonrpc.api.employee
                .read( {
                    query: {
                        type: 'PHYSICIAN'
                    }
                } )
                .then( function( response ) {
                    return response && response.data || [];
                } )
                .done( function( employees ) {
                    locationsList.push.apply( employeeList, employees );
                } );

            apkInProgressTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-incase-table',
                    pdfTitle: i18n( 'InCaseMojit.patient_browserJS.apk.apkPdfTitle' ),
                    stateId: 'CaseFileMojit-CasefileNavigationBinderIndex-apkInProgressTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.patient.patientsWithApkInProgress,
                    baseParams: baseParams,
                    columns: [
                        {
                            forPropertyName: 'lastname',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                            width: '35%',
                            isSortable: true,
                            renderer: function( meta ) {
                                var data = meta.row;
                                return data.lastname + (data.nameaffix ? ', ' + data.nameaffix : '') + (data.title ? ', ' + data.title : '');
                            }
                        },
                        {
                            forPropertyName: 'firstname',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                            width: '35%',
                            isSortable: true
                        },
                        {
                            forPropertyName: 'dob',
                            label: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                            width: '142px',
                            isSortable: true,
                            renderer: function( meta ) {
                                var data = meta.row;
                                if( data.kbvDob ) {
                                    return data.kbvDob;
                                }
                                return moment.utc( data.dob ).local().format( 'DD.MM.YYYY' );
                            }
                        },
                        {
                            forPropertyName: 'communications.value',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' ),
                            width: '30%',
                            isSortable: true,
                            renderer: function( meta ) {
                                var
                                    value = meta.row.communications;

                                if( Array.isArray( value ) ) {
                                    value = value.map( function( communication ) {
                                        return communication.value;
                                    } );
                                    return value.join( ',<br>' );
                                }

                                return '';
                            }
                        },
                        {
                            forPropertyName: 'lastUpdate',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.LAST_UPDATE' ),
                            width: '30%',
                            isSortable: true,
                            sortInitialIndex: 0,
                            renderer: function( meta ) {
                                var
                                    data = meta.row;

                                return moment( data.lastUpdate ).format( 'DD.MM.YYYY HH:mm' );
                            }
                        }
                    ],
                    selectMode: 'none',
                    onRowClick: function( meta/*, $event*/ ) {
                        var currentAPKModel = peek( selectedAPKEntry ),
                            result = [];

                        if( currentAPKModel && ( meta.row._id === currentAPKModel._id ) ) {
                            selectedAPKEntry( null );
                        } else {
                            Y.doccirrus.jsonrpc.api.activity.getActivitiesGroupedByAPK( {
                                period:  timestamp,
                                patientId: meta.row._id,
                                apkState: peek( baseParams.apkState ),
                                locationFilter: peek( baseParams.locationFilter ),
                                insuranceTypeFilter: peek( baseParams.insuranceTypeFilter ),
                                employeeFilter: peek( baseParams.employeeFilter )
                            } )
                                .done( function( response ) {
                                    result = response && response.data && response.data[0] && response.data.map( function( item ) {
                                        return {
                                            timestamp: item._id.timestamp,
                                            caseFolderGroups: item.activitiesWithCaseFolder.map( function( caseFolder ){
                                                return {
                                                    caseFolder: caseFolder.title,
                                                    caseFolderId: caseFolder.caseFolderId,
                                                    actTypeGroups: caseFolder.activitiesWithTimestamp.map( function( group ){
                                                        return {
                                                            type: Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', group.actType, 'i18n', '' ),
                                                            activities: group.activities.map( function( activity ) {

                                                                // bugfix with [MOJ-11908]
                                                                let activityContent  = Y.doccirrus.utils.stripHTML.regExp( activity.content || '' ); // remove HTML tags, i.e. line breaks, etc.
                                                                // activityContent = activityContent.replace(/\w+::/, ''); // maybe later, remove the first tag (TAG::) within the content, as these should not be shown here

                                                                return {
                                                                    text: Y.Lang.sub( '<a href="{href}" class="activity-linkToCase" target="_blank">{text}</a>', {
                                                                        text: Y.Escape.html( activity.timestampAsDate + ' ' + ( activity.code || '' ) + ' ' + activityContent ),
                                                                        href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/activity/' + activity._id
                                                                    } ),
                                                                    item: activity
                                                                };
                                                            } )
                                                        };
                                                    } )
                                                };
                                            } ),
                                            onApkStateBtnClicked: onApkStateBtnClicked,
                                            apkStateBtn: ko.observable( peek( baseParams.apkState ) ),
                                            _apkStateBtnText: null,
                                            _apkStateBtnCss: null
                                        };
                                    });

                                    if( result && result.length ) {

                                        patientLink = ko.computed( function() {
                                            var
                                                patientString;

                                                patientString = Y.Escape.html( meta.row.lastname + ' ' + meta.row.firstname );
                                                return Y.Lang.sub( '<a href="{href}" class="patient-linkToCase" title="{title}" target="_blank">{text}</a>', {
                                                    title: I18N_PATIENT_LINK_TITLE,
                                                    text: patientString,
                                                    href: Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + meta.row._id + '/tab/casefile_browser'
                                                } );

                                        } );

                                        result.forEach( function( item ) {
                                            item._apkStateBtnCss = ko.computed( function() {
                                                var
                                                    state = ko.unwrap( item.apkStateBtn ),
                                                    cssclass = '';

                                                switch( state ) {
                                                    case 'IN_PROGRESS':
                                                        cssclass += 'btn-danger';
                                                        break;
                                                    case 'DOCUMENTED':
                                                        cssclass += 'btn-warning';
                                                        break;
                                                    case 'VALIDATED':
                                                        cssclass += 'btn-success';
                                                        break;
                                                }

                                                return cssclass;
                                            } );
                                            item._apkStateBtnText = ko.computed( function() {
                                                var
                                                    state = ko.unwrap( item.apkStateBtn ),
                                                    text = '';

                                                switch( state ) {
                                                    case 'IN_PROGRESS':
                                                        text = i18n( 'InCaseMojit.activity_model_clientJS.button.APK_IN_PROGRESS' );
                                                        break;
                                                    case 'DOCUMENTED':
                                                        text = i18n( 'InCaseMojit.activity_model_clientJS.button.APK_DOCUMENTED' );
                                                        break;
                                                    case 'VALIDATED':
                                                        text = i18n( 'InCaseMojit.activity_model_clientJS.button.APK_VALIDATED' );
                                                        break;
                                                }

                                                return text;
                                            } );
                                        });

                                        selectedAPKEntry( {
                                            _id: meta.row._id,
                                            patient: patientLink,
                                            states: ko.observableArray( result )
                                        } );
                                    } else {
                                        selectedAPKEntry( null );
                                    }
                                } )
                                .fail( function( error ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                } );
                        }
                        return false;
                    }
                }
            } );

            function onApkStateBtnClicked() {

                var
                    self = this,
                    state = ko.unwrap( self.apkStateBtn ),
                    canToggleAllStates = ['PHYSICIAN', 'CONTROLLER', 'ADMIN'].some( Y.doccirrus.auth.memberOf ),
                    states = ['IN_PROGRESS', 'DOCUMENTED', 'VALIDATED'], currentIndex,
                    result = [],
                    ignoreAPK = Y.doccirrus.schemas.activity.ignoreAPK;

                if( !state ) {
                    state = states[0];
                }

                currentIndex = states.indexOf( state );

                // this user is now allowed to change state back from "VALIDATED"
                if( !canToggleAllStates && currentIndex === states.length - 1 ) {
                    return;
                }

                // this user can only toggle first two states
                if( !canToggleAllStates ) {
                    states.pop();
                }

                //skip activities that are ignored in APK processing
                var ignoreAPK = Y.doccirrus.schemas.activity.ignoreAPK,
                    activitieToSetAPK = (self.caseFolderGroups[0].actTypeGroups[0].activities || []).filter(function( activity ){
                        return ignoreAPK.indexOf( activity.item.actType ) === -1;
                    }) ;
                if( activitieToSetAPK.length ){
                    activitieToSetAPK[0].item.apkState = states[currentIndex === states.length - 1 ? 0 : ++currentIndex];

                    Y.doccirrus.jsonrpc.api.activity.setAPKState( {
                        activity: activitieToSetAPK[0].item,
                        caseFolders: self.caseFolderGroups
                    } ).done( function() {
                        result = selectedAPKEntry().states().filter( function( item ) {
                            return item.timestamp !== self.timestamp;
                        } );
                        if( result && result.length ) {
                            selectedAPKEntry().states( result );
                        } else {
                            apkInProgressTable.reload();
                            selectedAPKEntry( null );
                        }
                    } ).fail( function( error ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
                }

            }

            self.apkInProgressTable = apkInProgressTable;
            self.selectedAPKEntry = selectedAPKEntry;
            self.apkStateList = apkStateList;
            self.apkState = baseParams.apkState;
            self.dateSelector = dateSelector;

            self.select2LocationConfig = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return [];
                    },
                    write: function( $event ) {
                        baseParams.locationFilter( $event.val );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'InCaseMojit.casefile_nav.tab_apkInProgress.locations.label' ),
                    multiple: true,
                    allowClear: true,
                    data: function() {

                        return {
                            results: locationsList
                                .map( function( location ) {
                                    return {id: location._id, text: location.locname};
                                } )
                        };
                    }
                }
            };

            self.select2EmployeeConfig = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return [];
                    },
                    write: function( $event ) {
                        baseParams.employeeFilter( $event.val );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'InCaseMojit.casefile_nav.tab_apkInProgress.employees.label' ),
                    multiple: true,
                    allowClear: true,
                    data: function() {

                        return {
                            results: employeeList
                                .map( function( employee ) {
                                    return {id: employee._id, text: employee.firstname + ' ' + employee.lastname};
                                } )
                        };
                    }
                }
            };

            self.select2InsuranceTypeConfig = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return [];
                    },
                    write: function( $event ) {
                        baseParams.insuranceTypeFilter( $event.val );
                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'InCaseMojit.casefile_nav.tab_apkInProgress.insuranceType.label' ),
                    multiple: true,
                    allowClear: true,
                    data: function() {

                        return {
                            results: insuranceTypeList
                        };
                    }
                }
            };

            self.addDisposable( ko.computed( function(){

                baseParams.apkState();
                baseParams.locationFilter();
                baseParams.insuranceTypeFilter();
                baseParams.employeeFilter();
                baseParams.period();

                self.selectedAPKEntry( null );
            } ) );

            self.apkInProgressHeadLineI18n = i18n( 'InCaseMojit.casefile_nav.tab_apkInProgress.headline' );
        }
    }, {
        NAME: 'ApkInProgressViewModel'
    } );

    KoViewModel.registerConstructor( ApkInProgressViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'InCaseMojitViewModel',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoUI-all',
        'person-schema',
        'activity-schema'
    ]
} );
