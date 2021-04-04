/*jslint anon:true, nomen:true*/
/*global YUI, ko, _ */

YUI.add( 'dcanonymizemodal', function( Y ) {
        'use strict';
        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable,
            dafaultFieldsList = ['title','firstname','lastname','nameaffix','middlename','fk3120','localPracticeId','gender','dob','talk','careDegree',
                'addresses','insuranceStatus','accessPRC','lang','jobTitle','isPensioner','images','patientPortal','patientSince','patientNo','nextAppointment',
                'familyDoctor','edmpTypes','edmpCaseNo','edmpParticipationChronicHeartFailure','cardioHeartFailure','cardioCryptogenicStroke','cardioCHD',
                'latestMedData','dataTransmissionToPVSApproved', 'treatmentNeeds'];

        function getTranslation( field ){
            var
                schemaPatient = Y.doccirrus.schemas.patient && Y.doccirrus.schemas.patient.schema || {};
            if( 'dob' === field ){
                return i18n( 'InCaseMojit.patient_browserJS.label.AGE' );
            } else if( 'addresses' === field ){
                return i18n( 'person-schema.Address_T.zip_long' );
            } else if( 'partner_extra' === field ){
                return i18n( 'patient-schema.Patient_T.partner_extra' );
            } else if( schemaPatient[field] && (schemaPatient[field].i18n || schemaPatient['-de'] )){
                return schemaPatient[field].i18n || schemaPatient[field]['-de'];
            }
            return field;
        }

        function AnonymizeModalModel( config ) {
            AnonymizeModalModel.superclass.constructor.call( this, config );
        }

        Y.extend( AnonymizeModalModel, KoViewModel.getDisposable(), {
            destructor: function() {

            },

            initializer: function( config ) {
                var
                    self = this;

                    self.fieldsTextI18n = i18n( 'UserMgmtMojit.partner_anonymize.fields_text' );
                    self.selectAllI18n = i18n( 'UserMgmtMojit.partner_anonymize.toggler' );
                    self.pseudonymI18n = i18n( 'partner-schema.Partner_T.pseudonym.i18n' );

                    self.anonymizeConfiguration = ko.observableArray( [] );
                    self.pseudonymsOptions = ko.observableArray([]);
                    self.selectedPseudonym = ko.observable();
                    self.initAnonymizeConfiguration( config );
                    self.initPseudonymsOptions( config );
                    self.checkedAll = ko.observable( true );
                    self.addDisposable(ko.computed(function() {
                        var checked = ko.unwrap( self.anonymizeConfiguration ).every(function( item ) {
                            return true === ko.unwrap( item.selectedField );
                        });
                        self.checkedAll( checked );
                    }));
            },
            initPseudonymsOptions: function( config ) {
                var self = this,
                    pseudonymData = config.pseudonym && config.pseudonym[0] || {pseudonymType: 'patientData', pseudonymIdentifier: 'PatientID'};
                Y.doccirrus.jsonrpc.api.partner.getPseudonym()
                    .done( function( response ) {
                        if( response && response.data ){
                            self.pseudonymsOptions(response.data);
                            if( !(response.data|| []).find( function( el ){ return el.pseudonymType === pseudonymData.pseudonymType && el.pseudonymIdentifier === pseudonymData.pseudonymIdentifier; } ) ){
                                self.pseudonymsOptions.push( pseudonymData );
                            }
                            self.selectedPseudonym( pseudonymData.pseudonymIdentifier );
                        }
                    } )
                    .fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
            },
            initAnonymizeConfiguration: function( config ) {
                var
                    self= this,
                    configData = config.anonymizeKeepFields || [];
                self.readOnly = config.readOnly;

                configData = dafaultFieldsList.map( function( field ){
                    var keeped = -1 !== configData.indexOf( field );
                    return { selectedField: ko.observable( keeped ), fieldName: field };
                });


                configData = configData.map( function( el ){
                    el.fieldNameTranslated = getTranslation( el.fieldName );
                    return el;
                });
                self.anonymizeConfiguration( configData );

                self.selectAllHandler = function() {
                    var self = this,
                        i,
                        settings = ko.unwrap(self.anonymizeConfiguration),
                        checkedAll = peek( self.checkedAll );
                    for(i = 0; i < settings.length; i++) {
                        settings[i].selectedField( checkedAll );
                    }
                };
            }

        } );

        function AnonymizeModal() {
        }

        AnonymizeModal.prototype.showDialog = function( config, callback ) {

            function show() {
                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'UserMgmtMojit/views/anonymize-modal'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            anonymizeModalModel,
                            modal,
                            bodyContent = Y.Node.create( template );


                        anonymizeModalModel = new AnonymizeModalModel( config ) ;

                        modal = new Y.doccirrus.DCWindow( {
                            bodyContent: bodyContent,
                            title:  i18n('UserMgmtMojit.partner_anonymize.title'),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            maximizable: true,
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        action: function() {
                                            callback( {
                                                anonymizeKeepFields: config.anonymizeKeepFields,
                                                pseudonym: config.pseudonym
                                            } );
                                            this.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            var
                                                selectedFields = peek( anonymizeModalModel.anonymizeConfiguration ).filter( function( el ){
                                                    return peek( el.selectedField );
                                                } ).map( function( el ){
                                                    return el.fieldName;
                                                } ),
                                                selectedPseudonym = peek( anonymizeModalModel.selectedPseudonym );
                                            selectedPseudonym = peek( anonymizeModalModel.pseudonymsOptions ).filter( function( option ){
                                                return option.pseudonymIdentifier === selectedPseudonym;
                                            } );
                                            callback({
                                                anonymizeKeepFields: selectedFields,
                                                pseudonym: selectedPseudonym
                                            });
                                            this.close();
                                        }
                                    } )
                                ]
                            }
                        } );

                        modal.set( 'focusOn', [] );

                        modal.after( 'visibleChange', function(  ) {
                            anonymizeModalModel.destroy();
                            modal = null;
                        } );

                        ko.applyBindings( anonymizeModalModel, bodyContent.getDOMNode() );
                    } ).catch( catchUnhandled );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).anonymizeModal = new AnonymizeModal();

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'oop',
            'KoViewModel',
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'KoUI-all',
            'dcutils',
            'dc-comctl'
        ]
    }
);
