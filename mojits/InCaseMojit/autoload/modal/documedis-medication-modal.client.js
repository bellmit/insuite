/**
 * User: pi
 * Date: 24/11/16  14:15
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, $*/
/*eslint prefer-template:0, strict:0 */
'use strict';

YUI.add( 'DocumedisMedicationModal', function( Y ) {
        var
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            KoViewModel = Y.doccirrus.KoViewModel,
            documedisMessagehandler,
            modal;

        function AddDocumedisModel( config ) {
            AddDocumedisModel.superclass.constructor.call( this, config );
        }

        Y.extend( AddDocumedisModel, KoViewModel.getDisposable(), {
            destructor: function() {
            },

            initializer: function AddDocumedisModel_initializer( config ) {
                var
                    self = this,
                    selectedDoctorAndLocation = Y.doccirrus.utils.localValueGet( 'incase-selected-doctor' ),
                    split = selectedDoctorAndLocation.split( '-' ),
                    employeeId = split && Array.isArray( split ) && split.length && split[0],
                    locationId = split && Array.isArray( split ) && split.length && split[1],
                    lastSchein = config.lastSchein,
                    currentPatient = config.currentPatient,
                    insuranceStatus = unwrap( currentPatient.insuranceStatus );
                self.documedis = ko.observable( null );
                self.patient = config.currentPatient;
                // take default
                self.employeeId = config.employeeId;
                self.locationId = config.locationId;
                self.caseFolder = config.caseFolder;
                self.callback = config.callback;
                self.cdsCheck = config.cdsCheck;
                self.showIframe = ko.observable( false );
                self.buttonCreateI18n = i18n( "general.button.START" );
                self.medicationData = null;
                self.activities = [];
                self.config = config;
                self.sendTypeOnly = ko.observable();

                // first priority is selected
                if( employeeId ) {
                    self.employeeId = employeeId;
                } else if( lastSchein && lastSchein.employeeId ) {
                    self.employeeId = lastSchein.employeeId;
                } else if( insuranceStatus && insuranceStatus[0] && unwrap( insuranceStatus[0].employeeId ) ) {
                    self.employeeId = unwrap( insuranceStatus[0].employeeId );
                }

                if( locationId ) {
                    self.locationId = locationId;
                } else if( lastSchein && lastSchein.locationId ) {
                    self.locationId = lastSchein.locationId;
                } else if( insuranceStatus && insuranceStatus[0] && unwrap( insuranceStatus[0].locationId ) ) {
                    self.locationId = unwrap( insuranceStatus[0].locationId );
                }

                var route = unwrap((config.binder || {}).route);

                self.accessType =  route.query.accessType || 'A';
                self.authLevel =  route.query.authLevel || 'COMP';
                self.sendTypeOnly(route.query.sendTypeOnly === 'true' || false);


                switch (config.employeeType) {
                    case "PHYSICIAN":
                        self.employeeType = "DoctMed";
                        break;
                    case "PRACTICENURSE":
                        self.employeeType = "Nurse";
                        break;
                    default:
                        self.employeeType = "HeaEmpl";
                }

                self.employeeType = route.query.employeeType ||  self.employeeType;

                self.initPostMessageListener();
            },
            onIframeLoaded: function onIframeLoaded_AddDocumedisModel() {
                var self = this,
                    config = self.config,
                    activities;

                if( self.config.medPlans.length || config.medications.length ) {
                    self.isEditing = !!config.medPlans.length;
                    if( config.medPlans.length ) {
                        self.medPlan = config.medPlans[0]; //it is possible to select only one medplan
                        self.activities = self.medPlan.activities;
                        if( config.medications ) {
                            activities = config.medications;
                        }
                    } else {
                        activities = config.medications;
                    }
                    self.pznCodes = activities.map( function( item ) {
                        return unwrap( item.phPZN );
                    });
                    Y.doccirrus.jsonrpc.api.activity
                        .convertMedicationsToMedplanChmed( {
                            data: {
                                medplan: self.getMedplanTemplate(),
                                activityIds: self.activities,
                                activities: activities
                            }
                        } ).done( function( result ) {
                        self.documedis( JSON.stringify( {
                            "medication": result.data.chmed,
                            "checks": [],
                            "medicationType": "MedicationPlan",
                            "tabs": ["medicationplan", "clinicaldecisionsupport"],
                            "targetOrigin": location.protocol + "//" + location.host
                        } ) );
                        setTimeout(function(  ) {
                            $( '#documedis-form' )[0].submit();
                        }, 1000);
                    } ).fail( function( error ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );

                } else {
                    self.loadChmedAndSubmit();
                }
            },
            initPostMessageListener: function initPostMessageListener_AddDocumedisModel() {
                var self = this;
                documedisMessagehandler = function( event ) {
                    if( !event.data || !event.data.data || event.data.data.indexOf( 'CHMED16A1' ) === -1 ) {
                        return;
                    }

                    Y.doccirrus.jsonrpc.api.activity.CHMEDtoMedications( {
                        data: {
                            chmed: event.data.data,
                            activityIds: self.isEditing ? self.activities : []
                        }
                    } ).done( function( result ) {
                        result = result.data || result;
                        if( (result.willBeCreated || []).length
                            || (result.shouldBeProcessedByUser || []).length
                            || result.missedMedicationsAttrs.length
                            || (result.activitiesToUpdate || []).length
                            || (result.activitiesToDelete || []).length
                        ) {
                            modal.close();

                            Y.doccirrus.modals.documedisArticles.show( {
                                employeeId: self.employeeId,
                                locationId: self.locationId,
                                patientId: unwrap( self.patient._id ),
                                patient: self.patient,
                                caseFolderId: self.caseFolder._id,
                                caseFolderType: self.caseFolder.type,
                                medPlan: self.medPlan,
                                medicationData: result,
                                medData: result.medData,
                                medPlanTemplate: result.documedisPlan,
                                callback: self.callback,
                                cdsCheck: self.cdsCheck,
                                pznCodes: self.pznCodes
                            } );
                        }
                    } ).fail( function( error ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
                };
                window.addEventListener( 'message', documedisMessagehandler );
            },
            getMedplanTemplate: function AddDocumedisModel_getMedplanTemplate() {
                var
                    self = this;
                return self.patient.getSwissMedplanTemplate( self.employeeId );
            },
            loadChmedAndSubmit: function AddDocumedisModel_loadChmedAndSubmit( medplan ) {
                var self = this,
                    documedisMedplan = medplan || self.getMedplanTemplate();
                Y.doccirrus.jsonrpc.api.InCaseMojit
                    .getCHMED( {data: {medplan: documedisMedplan}} )
                    .done( function( response ) {
                        self.documedis( JSON.stringify( {
                            "medication": response.data,
                            "checks": [],
                            "medicationType": "MedicationPlan",
                            "tabs": ["medicationplan", "clinicaldecisionsupport"],
                            "targetOrigin": location.protocol + "//" + location.host

                        } ) );
                        setTimeout(function(  ) {
                            $( '#documedis-form' )[0].submit();
                        }, 1000);

                    } );
            }
        } );

        function AddDocumedisIframe() {
        }

        AddDocumedisIframe.prototype.show = function( config ) {

            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'InCaseMojit/views/documedis_medication_modal'} )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    var
                        bodyContent = Y.Node.create( template );

                    var model = new AddDocumedisModel( config );
                    modal = new Y.doccirrus.DCWindow( {
                        id: 'addMedicationModal',
                        className: 'DCWindow-Appointment',
                        bodyContent: bodyContent,
                        title: i18n( 'InCaseMojit.addMedicationModal_clientJS.title.MODAL_TITLE' ),
                        width: '95%',
                        height: '90%',
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    isDefault: false,
                                    action: function() {
                                        this.close();
                                    }
                                } )
                            ]
                        },

                        after: {
                            destroy: function() {
                                ko.cleanNode( bodyContent.getDOMNode() );
                            }
                        }
                    } );

                    modal.after( 'visibleChange', function() {
                        window.removeEventListener( 'message', documedisMessagehandler );
                    } );

                    ko.applyBindings( model, bodyContent.getDOMNode() );

                } ).catch( catchUnhandled );
        };

        Y.namespace( 'doccirrus.modals' ).documedisMedication = new AddDocumedisIframe();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'KoButton',
            'DocumedisArticlesModal'
        ]
    }
);