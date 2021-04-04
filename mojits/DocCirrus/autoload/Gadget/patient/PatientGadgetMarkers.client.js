/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _ */
YUI.add( 'PatientGadgetMarkers', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetMarkers
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' ),
        i18n = Y.doccirrus.i18n;

    /**
     * @constructor
     * @class PatientGadgetMarkers
     * @extends PatientGadget
     */
    function PatientGadgetMarkers() {
        PatientGadgetMarkers.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetMarkers, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.refreshEvent = Y.doccirrus.communication.on( {
                event: "refreshMarkersGadget",
                handlerId: 'refreshMarkersGadget',
                done: function( message ) {
                    var
                        binder = self.get( 'binder' ),
                        currentPatient = peek( binder.currentPatient ),
                        data = message && message.data && message.data[0] && message.data[0] || {};

                    if( currentPatient && currentPatient._id && data.patient === peek( currentPatient._id ) && data.markers && data.markers.length ){
                        currentPatient.markers( data.markers );
                    }
                }
            } );

            self.initMarkers();
        },
        /** @private */
        destructor: function() {
        },
        // NOTE: This is the same as in "MirrorActivityPatientInfoViewModel" formerly known as ""ActivityPatientInfoViewModel""
        initMarkers: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                severityMap = binder.getInitialData( 'severityMap' ); // TODO: load or preload?

            self.markerI18n = i18n( 'PatientGadget.PatientGadgetMarkers.i18n' );

            self.markers = ko.computed( function() {
                var
                    markers = unwrap( currentPatient.markers );

                return markers.map( function( marker ) {

                    return Object.assign( marker, {
                        color: severityMap[marker.severity].color,
                        icon: marker.icon
                    } );
                } );
            } );

        },
        pickMarkers: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            Y.doccirrus.utils
                .selectMarkers( {
                    checkedMarkers: currentPatient.markers
                } )
                .on( {
                    select: function( facade, select ) {

                        if( select.addedIds.length > 0 ) {
                            Y.doccirrus.jsonrpc.api.patient.addMarkers( {
                                noBlocking: true,
                                patient: peek( currentPatient._id ),
                                marker: select.addedIds
                            } ).fail( function( error ) {
                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            } );
                        }
                        if( select.removedIds.length > 0 ) {
                            Y.doccirrus.jsonrpc.api.patient.removeMarkers( {
                                noBlocking: true,
                                patient: peek( currentPatient._id ),
                                marker: select.removedIds
                            } ).fail( function( error ) {
                                _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            } );
                        }

                        currentPatient.markers( select.data );
                    }
                } );

        }
    }, {
        NAME: 'PatientGadgetMarkers',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PatientGadgetMarkers );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'PatientGadget',

        'dcutils',
        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );
