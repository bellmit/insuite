/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'WithoutCardReadViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,

        InCaseMojitViewModel = KoViewModel.getConstructor( 'InCaseMojitViewModel' );

    /**
     * @constructor
     * @class WithoutCardReadViewModel
     * @extends InCaseMojitViewModel
     */
    function WithoutCardReadViewModel() {
        WithoutCardReadViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( WithoutCardReadViewModel, InCaseMojitViewModel, {
        templateName: 'WithoutCardReadViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initWithoutCardReadViewModel();

        },
        /** @protected */
        destructor: function() {
            var self = this;

            if( self.myPatientListener ) {
                self.myPatientListener.removeEventListener();
                self.myPatientListener = null;
            }
        },
        myPatientListener: null,
        withoutCardReadTable: null,
        select2LocationConfig: null,
        initWithoutCardReadViewModel: function() {
            var
                self = this,
                locationsList = [],
                baseParams = {
                    locationFilter: ko.observableArray()
                },
                withoutCardReadTable;

            Y.doccirrus.jsonrpc.api.location
                .read()
                .then( function( response ) {
                    return response && response.data || [];
                } )
                .done( function( locations ) {
                    locationsList.push.apply( locationsList, locations );
                } );

            withoutCardReadTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    formRole: 'casefile-ko-incase-table',
                    pdfTitle: i18n( 'InCaseMojit.cardreaderJS.pdfTitle' ),
                    stateId: 'CaseFileMojit-CasefileNavigationBinderIndex-withoutCardReadTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.patient.patientsWithoutCardSwipe,
                    baseParams: baseParams,
                    columns: [
                        {
                            forPropertyName: 'lastname',
                            label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                            width: '35%',
                            isSortable: true,
                            sortInitialIndex: 0,
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
                            forPropertyName: 'nextAppointment',
                            isSortable: true,
                            label: i18n( 'InCaseMojit.patient_browserJS.label.APPOINTMENT' ),
                            title: i18n( 'InCaseMojit.patient_browserJS.label.APPOINTMENT' ),
                            width: '126px',
                            renderer: function( meta ) {
                                var
                                    value = meta.value;

                                if( value ) {
                                    return moment( value ).format( 'DD.MM.YYYY HH:mm' );
                                }
                                return '';
                            }
                        }
                    ],
                    selectMode: 'none',
                    onRowClick: function( meta/*, $event*/ ) {
                        var url = '#/patient/' + meta.row._id + '/tab/casefile_browser';
                        window.open( url, '_blank' );
                        return false;
                    }
                }
            } );

            self.withoutCardReadTable = withoutCardReadTable;

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
                    placeholder: i18n( 'InCaseMojit.casefile_nav.tab_withoutCardRead.locations.label' ),
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

            self.myPatientListener = Y.doccirrus.communication.on( {
                event: 'patient.cardRead',
                done: function( response ) {
                    var updatedPatientId = response && response.data && response.data[0] ? response.data[0] : null,
                        patientInTable = updatedPatientId && self.withoutCardReadTable.data() && self.withoutCardReadTable.data().some( function( item ) {
                                return updatedPatientId === item._id;
                            } );

                    if( patientInTable ) {
                        self.withoutCardReadTable.reload();
                    }
                }
            } );

            self.withoutCardReadHeadlineI18n = i18n( 'InCaseMojit.casefile_nav.tab_withoutCardRead.headline' );
        }
    }, {
        NAME: 'WithoutCardReadViewModel'
    } );

    KoViewModel.registerConstructor( WithoutCardReadViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'InCaseMojitViewModel',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'KoUI-all'
    ]
} );
