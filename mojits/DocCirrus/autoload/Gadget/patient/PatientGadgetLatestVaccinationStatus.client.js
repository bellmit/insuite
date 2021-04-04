/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _ */

'use strict';

YUI.add( 'PatientGadgetLatestVaccinationStatus', function( Y/*, NAME*/ ) {

    /**
     * @module PatientGadgetLatestVaccinationStatus
     */
    var
        //unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadgetConfigurableTableBase = KoViewModel.getConstructor( 'PatientGadgetConfigurableTableBase' ),
        vaccinationStatusColors = {
            "0": '#d3d3d3',
            "1": '#d9534f',
            "2": '#f0ad4e',
            "3": '#5cb85c'
        };


    /**
     * @constructor
     * @class PatientGadgetLatestVaccinationStatus
     * @extends PatientGadgetConfigurableTableBase
     */
    function PatientGadgetLatestVaccinationStatus() {
        PatientGadgetLatestVaccinationStatus.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetLatestVaccinationStatus, PatientGadgetConfigurableTableBase, {
        /** @private */
        initializer: function() {
            var
                self = this;
            self.initPatientGadgetLatestVaccinationStatus();
        },
        /** @private */
        destructor: function() {
            var self = this;

            if( self.latestMedDataChangedListener ) {
                self.latestMedDataChangedListener.removeEventListener();
                self.latestMedDataChangedListener = null;
            }
        },
        updateVaccinationStatus: function( currentPatient ){
            var self = this;
            Y.doccirrus.jsonrpc.api.meddata.getLatestMeddataForPatient( { noBlocking: true, patientId: currentPatient._id() } )
                .then( function( result ) {
                    var vaccinationMedDataItem;
                    if( !result || !result.data ) {
                        return;
                    }
                    currentPatient.latestMedData( result.data );
                    vaccinationMedDataItem = (result.data || []).find( function( el ) {
                        return el.type === Y.doccirrus.schemas.v_meddata.medDataTypes.VACCINATION;
                    } );

                    if( vaccinationMedDataItem ) {
                        self.vaccinationStatus( vaccinationStatusColors[vaccinationMedDataItem.textValue || "0"] );
                        self.vaccinationMedDataURL( '/incase#/activity/' + vaccinationMedDataItem.activityId );
                    } else {
                        self.vaccinationStatus( null );
                        self.vaccinationMedDataURL( null );
                    }
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        },
        initPatientGadgetLatestVaccinationStatus: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder && peek( binder.currentPatient ) ),
                additionalInfo,
                url = peek( self.serverUrl ),
                port = peek( self.serverPort ),
                bsnr = peek( self.serverLocation ),
                firstname = peek( self.serverUserFirstName ),
                lastname = peek( self.serverUserLastName );

            self.vaccinationStatusI18n = i18n( 'PatientGadget.PatientGadgetLatestVaccinationStatus.i18n' );

            self.vaccinationStatus = ko.observable();
            self.vaccinationMedDataURL = ko.observable();
            self.additionalInfo = ko.observable();

            if( url && port && bsnr && firstname && lastname ) {

                Y.doccirrus.jsonrpc.api.meddata.checkVaccinationStatus( {
                    server: {
                        url: url,
                        port: port,
                        bsnr: bsnr,
                        firstname: firstname,
                        lastname: lastname
                    },
                    patient: {
                        patientId: currentPatient._id(),
                        firstname: currentPatient.firstname(),
                        lastname: currentPatient.lastname(),
                        patientNumber: currentPatient.patientNumber(),
                        gender: currentPatient.gender(),
                        dob: currentPatient.dob(),
                        activeCaseFolderId: currentPatient.activeCaseFolderId()
                    }
                } ).then( function( response ) {
                    if( response && response.data && response.data.patientData ) {
                        additionalInfo = [];
                        (Object.keys( response.data.patientData ) || []).sort().forEach( function( key ) {
                            additionalInfo.push( key + ': ' + response.data.patientData[key] );
                        } );
                        if( additionalInfo.length ) {
                            self.additionalInfo( additionalInfo.join( '\n' ) );
                        }
                    }

                    if( !response || !response.data || !response.data.changed ) {
                        self.updateVaccinationStatus( currentPatient );
                    }
                } ).fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
            } else {
                self.updateVaccinationStatus( currentPatient );
            }

            self.latestMedDataChangedListener = Y.doccirrus.communication.on( {
                event: 'activity.latestMedDataRefresh',
                done: function ( response ) {
                    if( !response || !response.data || !response.data[0] || ( currentPatient._id() !== response.data[0] ) ) {
                        return;
                    }

                    self.updateVaccinationStatus( currentPatient );
                }
            } );

        }
    }, {
        NAME: 'PatientGadgetLatestVaccinationStatus',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PatientGadgetLatestVaccinationStatus );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'GadgetLayouts',
        'GadgetUtils',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'dccommunication-client',
        'v_meddata-schema',
        'PatientGadgetConfigurableTableBase'
    ]
} );
