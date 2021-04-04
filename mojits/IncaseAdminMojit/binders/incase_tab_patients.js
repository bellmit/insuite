/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko, jQuery, moment*/

'use strict';

/*exported fun */
fun = function _fn( Y ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
    // var KoUI = Y.doccirrus.KoUI;
    // var KoComponentManager = KoUI.KoComponentManager;
    // var i18n = Y.doccirrus.i18n;
        I18N_PLACEHOLDER_PLEASE_CHOOSE = i18n( 'RepetitionKoViewModel_clientJS.placeholder.PLEASE_SELECT' ),
        PATIENT_MUST_BE_SELECTED = i18n( 'IncaseAdminMojit.incase_tab_patients.selectPatientError' ),
        PATIENT_MUST_BE_DIFFERENT = i18n( 'IncaseAdminMojit.incase_tab_patients.selectPatientError' ),
        MERGE_SUCCESS = i18n( 'IncaseAdminMojit.incase_tab_patients.mergeSuccess' ),
        MERGE_FAILURE = i18n( 'IncaseAdminMojit.incase_tab_patients.mergeFailure' ),
        patientPathBase = "/incase#/patient/";


        /**
     * @constructor
     * @class TabPatientsViewModel
     */
    function TabPatientsViewModel() {
        TabPatientsViewModel.superclass.constructor.apply( this, arguments );
    }

    function buildSelect2ItemFromPatient( patient ) {
        return { id: patient._id, text: buildPatientLabelFromPatient( patient ) };
    }

    function buildPatientLabelFromPatient( patient ) {
        return Y.doccirrus.schemas.person.personDisplay( patient ) + ' [' + patient.kbvDob + ']';
    }

    /**
     * Temporary workaround to convert JSON to CSV string
     * @param listOfObjects
     * @returns {string}
     */
    function json2csv( listOfObjects ) {
        const csvList = [];
        csvList.push( Object.keys( listOfObjects[0] ).join( ';' ) );
        listOfObjects.forEach( function ( obj ) { csvList.push( Object.values( obj ).join( ';' ) ); } );
        return csvList.join( '\n' );
    }

    function PatientAutocomplete( writeFn ) {
        var self = this;
        this.data = ko.computed( {
            read: function() {},
            write: writeFn
        } );
        this.select2 = {
            width: '100%',
            allowClear: true,
            placeholder: I18N_PLACEHOLDER_PLEASE_CHOOSE,
            minimumInputLength: 1,
            query: function( query ) {
                // abort pending requests
                if( self.pending ) {
                    self.pending.abort();
                }
                // build pending request
                var pending = self.pending = jQuery.ajax( {
                    type: 'GET',
                    xhrFields: { withCredentials: true },
                    url: Y.doccirrus.infras.getPrivateURL( '/r/calendar/?' ) + Y.QueryString.stringify( {
                        action: 'getPatients',
                        qe: Y.doccirrus.commonutils.$regexLikeUmlaut( query.term, { onlyRegExp: true } )
                    } )
                } );
                // handle select2 query.callback
                pending.done( function( data ) {
                    data = data || [];
                    query.callback( { results: data.map( buildSelect2ItemFromPatient ) } );
                } );
                // complete pending request
                pending.always( function() {
                    delete self.pending;
                } );
            }
        };
        // bind further select2 functionality to this model
        this.init = function() {
            // var $select2 = jQuery( element ).data( 'select2' ),
            //     $eventElement = $select2.opts.element;
        };
    }

    var mergeModel = {

        /** @protected */
        initializer: function() {
             var self = this;
            self.tabPatientsHeaderI18n = i18n( 'IncaseAdminMojit.incase_tab_patients.header' );
            self.tabPatientsWarningI18n = i18n( 'IncaseAdminMojit.incase_tab_patients.warning' );
            self.tabPatientsPrimaryI18n = i18n( 'IncaseAdminMojit.incase_tab_patients.primaryPatient' );
            self.tabPatientsShowI18n = i18n( 'IncaseAdminMojit.incase_tab_patients.show' );
            self.tabPatientsSecondaryI18n = i18n( 'IncaseAdminMojit.incase_tab_patients.secondaryPatient' );
            self.tabPatientsImportantHeaderI18n = i18n( 'IncaseAdminMojit.incase_tab_patients.importantNotice_header' );
            self.tabPatientsImportantBody1I18n = i18n( 'IncaseAdminMojit.incase_tab_patients.importantNotice_body_1' );
            self.tabPatientsImportantBody2I18n = i18n( 'IncaseAdminMojit.incase_tab_patients.importantNotice_body_2' );
            self.tabPatientsImportantBody3I18n = i18n( 'IncaseAdminMojit.incase_tab_patients.importantNotice_body_3' );
            self.tabPatientsImportantBulletHeadI18n = i18n( 'IncaseAdminMojit.incase_tab_patients.importantNotice_bullet_head' );
            self.tabPatientsImportantBullet1I18n = i18n( 'IncaseAdminMojit.incase_tab_patients.importantNotice_bullet_1' );
            self.tabPatientsImportantBullet2I18n = i18n( 'IncaseAdminMojit.incase_tab_patients.importantNotice_bullet_2' );
            self.tabPatientsImportantBullet3I18n = i18n( 'IncaseAdminMojit.incase_tab_patients.importantNotice_bullet_3' );
            self.tabPatientsImportantBullet4I18n = i18n( 'IncaseAdminMojit.incase_tab_patients.importantNotice_bullet_4' );
            self.deleteOldDataI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_delete_old_data.TITLE' );
            self.sayHowManyPatientsToDeleteTextI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_delete_old_data.SAY_HOW_MANY_TO_DELETE' );
            self.limitWarningI18n = i18n( 'IncaseAdminMojit.incase_tab_configuration_delete_old_data.LIMIT_WARNING' );
            self.isSupportUser = Y.doccirrus.auth.memberOf( 'SUPPORT');
            self.patientsToDelete = ko.observableArray();
            self.patientsToDeleteDisplay = ko.observableArray();
            self.numberOfPatientsToDelete = ko.observable( 0 );
            self.getOldPatientsListFailed = ko.observable( false );
            self.getOldPatientsListFailureMessage = ko.observable();
            self.isGetOldPatientsListLoading = ko.observable( true );
            self.loadOldPatientsList();
        },

        destructor: function() {
        },
        patient1ErrorMsg: ko.observable( [ PATIENT_MUST_BE_SELECTED ] ),
        patient2ErrorMsg: ko.observable( [ PATIENT_MUST_BE_SELECTED ] ),
        patient1: "",
        patient2: "",
        patient1Link: ko.observable( null ),
        patient2Link: ko.observable( null ),
        patient1Autocomplete: new PatientAutocomplete( function(e) {
            mergeModel.patient1 = e.val;
            if (e.val) {
                mergeModel.patient1Link( patientPathBase + e.val );
            } else {
                mergeModel.patient1Link( null );
            }
            checkForErrors();
        } ),
        patient2Autocomplete: new PatientAutocomplete( function(e) {
            mergeModel.patient2 = e.val;
            if (e.val) {
                mergeModel.patient2Link( patientPathBase + e.val );
            } else {
                mergeModel.patient2Link( null );
            }
            checkForErrors();
        } ),
        startMerge: function() {
            if ( mergeModel.patient1 && mergeModel.patient2 ) {
                Y.doccirrus.jsonrpc.api.patient.mergePatients({
                    patient1: mergeModel.patient1,
                    patient2: mergeModel.patient2
                } ).done( function() {
                    mergeModel.patient2Autocomplete.data( "val", null );
                    Y.doccirrus.DCWindow.notice( { message: MERGE_SUCCESS } );
                } ).fail( function( err ) {
                    if ( err.data || err.code || err.message ) {
                        if ( err.data ) {
                            if ( "object" === typeof err.data ) {
                                try {
                                    err = JSON.stringify( err.data );
                                } catch (e) {
                                    err = "failed to parse error: " + e.message;
                                }
                            } else {
                                err = err.data;
                            }
                        } else {
                            err = ( err.code && Y.doccirrus.errorTable.getMessage( err ) ) || err.message;
                        }
                    } else {
                        err = "<pre class='pre-scrollable'><code style='font-family: monospace'>" + JSON.stringify( err ) + "</code></pre>";
                    }
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: MERGE_FAILURE + ":<br><br>" + err
                    } );
                } );
            }
        },
        downloadOldPatientDataCSV: function downloadOldPatientDataCSV() {
            var
                self = this,
                csvFilename = 'patient-GDPR-outdated-' + moment().format( 'YYYY-MM-DD-HH-mm' ) + '.csv',
                csv = json2csv( peek( self.patientsToDelete ) );

            Y.doccirrus.utils.saveAs( new Blob( [csv], {type: 'text/plain;charset=utf-8'} ), csvFilename );
        },

        deleteOldPatientData: function deleteOldPatientData() {
            var self = this;
            /**
             * Handles making the request to the backend for deleting the patients
             * @private
             */
            function _deleteOldPatientData() {
                self.isGetOldPatientsListLoading( true );

                Y.doccirrus.jsonrpc.api.incaseconfiguration.deleteOldPatientsInBatches( {
                    noBlocking: true,
                    data: {
                        patientIdList: peek( self.patientsToDelete ).map( ( patientObj ) => patientObj._id )
                    }
                } )
                    .done( function( response ) {
                        var
                            warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response );

                        if( warnings.length ) {
                            Y.Array.invoke( warnings, 'display' );
                        }

                        self.loadOldPatientsList();
                    } )
                    .fail( function( response ) {
                        var
                            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                        if( errors.length ) {
                            Y.Array.invoke( errors, 'display' );
                        }

                        self.loadOldPatientsList();
                    } )
                    .always( function() {
                        self.isGetOldPatientsListLoading( false );
                    } );
            }

            Y.doccirrus.DCWindow.notice( {
                type: 'info',
                window: {
                    title: i18n( 'IncaseAdminMojit.incase_tab_configuration_delete_old_data.TITLE' ),
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                action: function() {
                                    this.close();
                                }
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                label: i18n( 'IncaseAdminMojit.incase_tab_configuration_delete_old_data.DELETE' ),
                                action: function() {
                                    this.close();
                                    _deleteOldPatientData();
                                }
                            } )
                        ]
                    }
                },
                icon: Y.doccirrus.DCWindow.ICON_WARN,
                message: i18n( 'IncaseAdminMojit.incase_tab_configuration_delete_old_data.DELETE_MODAL_MESSAGE' )
            } );
        },
        loadOldPatientsList: function loadOldPatientsList() {
            var self = this;
            self.isGetOldPatientsListLoading( true );

            Y.doccirrus.jsonrpc.api.incaseconfiguration.getOldPatientList( {
                noBlocking: true
            } )
                .done( function( response ) {
                    var
                        warnings = Y.doccirrus.errorTable.getWarningsFromResponse( response ),
                        patientsToDelete;

                    if( warnings.length ) {
                        /* add warning where the old patient list is */
                        self.getOldPatientsListFailed( true );
                        self.getOldPatientsListFailureMessage( warnings[0].content || warnings[0].message );
                        return;
                    }

                    if( response.data && response.data.length ) {
                        patientsToDelete = response.data.map( function( patientData ) {
                            patientData.url = window.location.origin + '/incase#/patient/' + patientData._id + '/tab/casefile_browser';
                            return patientData;
                        } );

                        self.patientsToDelete( patientsToDelete );
                        self.patientsToDeleteDisplay( patientsToDelete.slice( 0, 2001 ) );
                        self.numberOfPatientsToDelete( peek( self.patientsToDelete ).length );
                        return;
                    }

                    /* if response is empty */
                    self.patientsToDelete( [] );
                    self.patientsToDeleteDisplay( [] );
                    self.numberOfPatientsToDelete( 0 );
                } )
                .fail( function( response ) {
                    var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                    if( errors.length ) {
                        /* add warning where the old patient list is */
                        self.getOldPatientsListFailed( true );
                        self.getOldPatientsListFailureMessage( errors[0].content || errors[0].message );
                    }

                    self.patientsToDelete( [] );
                    self.patientsToDeleteDisplay( [] );
                    self.numberOfPatientsToDelete( 0 );
                } )
                .always( function() {
                    self.isGetOldPatientsListLoading( false );
                } );
        }
    };

    function checkForErrors() {
        if ( mergeModel.patient1 && mergeModel.patient2 && mergeModel.patient1 === mergeModel.patient2 ) {
            mergeModel.patient1ErrorMsg([PATIENT_MUST_BE_DIFFERENT]);
            mergeModel.patient2ErrorMsg([PATIENT_MUST_BE_DIFFERENT]);
        } else {
            if ( mergeModel.patient1 ) {
                mergeModel.patient1ErrorMsg( null );
            } else {
                mergeModel.patient1ErrorMsg( [ PATIENT_MUST_BE_SELECTED ] );
            }
            if ( mergeModel.patient2 ) {
                mergeModel.patient2ErrorMsg( null );
            } else {
                mergeModel.patient2ErrorMsg( [ PATIENT_MUST_BE_SELECTED ] );
            }
        }
    }

    Y.extend( TabPatientsViewModel, KoViewModel.getDisposable(), mergeModel, {
        NAME: 'TabPatientsViewModel',
        ATTRS: {}
    } );

    return {

        registerNode: function( node ) {
            ko.applyBindings( new TabPatientsViewModel(), node.getDOMNode() );
        },

        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};
