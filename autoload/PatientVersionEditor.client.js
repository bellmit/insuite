/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PatientVersionEditor', function( Y/*, NAME*/ ) {
    'use strict';

    var
    // unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
    // ignoreDependencies = ko.ignoreDependencies,
        i18n = Y.doccirrus.i18n,

        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        KoViewModel = Y.doccirrus.KoViewModel,
        EditorModel = KoViewModel.getConstructor( 'EditorModel' ),
        PatientModel = KoViewModel.getConstructor( 'PatientModel' );

    /**
     * @constructor
     * @class PatientVersionEditor
     */
    function PatientVersionEditor() {
        PatientVersionEditor.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientVersionEditor, EditorModel, {
        bodyContent: null,
        /** @protected */
        initializer: function() {
            var
                self = this,
                currentPatients = peek( self.get( 'currentPatients' ) ),
                currentPatient,
                actualVersion = null,
                versionSelect = (currentPatients || []).map( function( version ) {
                    var text;
                    if( version.versionLatest ) {
                        actualVersion = version.versionId;
                        text = 'aktuell';
                    } else {
                        text = version.versionText;
                    }

                    return {
                        id: version.versionId,
                        text: text
                    };
                } );

            self.versionI18n = i18n( 'InCaseMojit.patientversion_modal.version.i18n' );
            self.persDataI18n = i18n('InCaseMojit.patientversion_modal.title.PERS_DATA');
            self.kbvDobI18n = i18n('InCaseMojit.patientversion_modal.placeholder.KBV_DOB');
            self.addressesI18n = i18n( 'person-schema.JuristicPerson_T.addresses' );
            self.titleComI18n = i18n( 'InCaseMojit.communication_item.title.TITLE_COM' );
            self.insuranceStatusI18n = i18n( 'patient-schema.Patient_T.insuranceStatus' );
            self.generalButtonDeleteI18n = i18n('general.button.DELETE');

            self.countryMode = ko.observable( [] );
            self.isSelectedVersionValid = ko.observable( true );
            self.currentVersion = ko.observable( currentPatients[0] && ( currentPatients[0].versionSchein || actualVersion || currentPatients[0].versionId ) );
            self.versionAutocomplete = {
                val: ko.computed( {
                    read: function() {
                        return self.currentVersion();
                    },
                    write: function( $event ) {
                        self.currentVersion( $event.val );
                    }
                } ),
                select2: {
                    dropdownAutoWidth: true,
                    data: versionSelect
                }
            };

            var selectedVersion = currentPatients.filter( function( patientVersion ) {
                return patientVersion.versionId === self.currentVersion();
            } );
            currentPatient = selectedVersion[0];

            self.currentVersion.subscribe( function( newValue ) {
                var selectedVersion = currentPatients.filter( function( patientVersion ) {
                        return patientVersion.versionId === newValue;
                    } ),
                    currentPatient = selectedVersion[0];
                self.initPatientVersionEditor( currentPatient );

                ko.cleanNode( self.bodyContent.getDOMNode() );
                ko.applyBindings( self, self.bodyContent.getDOMNode() );
            } );

            self.initPatientVersionEditor( currentPatient );
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            if( self.get( 'currentPatient' ) && self.get( 'currentPatient' ).destroy ) {
                self.get( 'currentPatient' ).destroy();
            }

            (self.get( 'currentPatients' ) || []).forEach( function( model ) {
                if( model.destroy ) {
                    model.destroy();
                }
            } );
        },
        /** @protected */
        initPatientVersionEditor: function( currentPatient ) {
            var
                self = this,
                countryMode = currentPatient && peek(currentPatient.countryMode) || [];
            self.set( 'currentPatient', currentPatient );

            if( self.currentPatientIsValidComputed ) {
                self.currentPatientIsValidComputed.dispose();
            }
            self.currentPatientIsValidComputed = ko.computed( function() {
                self.isSelectedVersionValid( currentPatient._isValid() );
            } );

            self.countryMode(countryMode);

            self.mixWhiteListFromDataModel( currentPatient );

            self.initEditAddresses();
            self.initEditCommunications();
            self.initEditPhysicianSelection();
            self.initEditInstitutionSelection();
            self.initEditSendPatientReceipt();

            self.initSubModels( currentPatient );
        }
    }, {
        NAME: 'PatientVersionEditor',
        ATTRS: {
            currentPatient: {
                value: null
            },
            currentPatients: {
                value: null
            },
            whiteList: {
                value: [
                    'talk',
                    'title',
                    'firstname',
                    'nameaffix',
                    'fk3120',
                    'lastname',
                    'gender',
                    'kbvDob',
                    'jobTitle',
                    'workingAt',
                    'isPensioner',
                    'sendPatientReceipt',
                    'careDegree',
                    'patientNo',
                    'treatmentNeeds'
                ],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'addresses',
                        editorName: 'AddressEditorModel'
                    },
                    {
                        propName: 'communications',
                        editorName: 'CommunicationEditorModel'
                    },
                    {
                        propName: 'insuranceStatus',
                        editorName: 'InsuranceStatusEditorModel'
                    }
                ],
                lazyAdd: false
            }
        }
    } );

    PatientModel.mixEditAddresses( PatientVersionEditor );
    PatientModel.mixEditCommunications( PatientVersionEditor );
    PatientModel.mixEditPhysicianSelection( PatientVersionEditor );
    PatientModel.mixEditInstitutionSelection( PatientVersionEditor );
    PatientModel.mixEditSendPatientReceipt( PatientVersionEditor );
    PatientModel.mixAddNewInsuranceStatus( PatientVersionEditor );

    /**
     * @method createPatientModelFromActivityId
     * @for PatientVersionEditor
     * @param {String|ko.observable} activityId
     * @returns {Promise}
     * @static
     */
    PatientVersionEditor.createPatientModelFromActivityId = function( activityId, scheinPatient, caseFolderType ) {
        activityId = peek( activityId );
        return Promise
            .resolve(
                Y.doccirrus.jsonrpc.api.kbv
                    .scheinRelatedPatientVersion( {scheinId: activityId, getAll: true, caseFolderType} )
                    .then( function( response ) {
                        return response.data;
                    } )
                    .fail( function( error ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } )
            )
            .then( function( patients ) {
                var patientModels;

                if(patients && !patients.length){
                    patients = [ scheinPatient ];
                }

                patientModels = patients.map( function( patient ) {
                    var patientModel = new PatientModel( {
                        data: patient
                    });
                    patientModel.versionTimestamp = patient.timestamp;
                    patientModel.versionId = patient._id.toString();
                    patientModel.versionLatest = patient.latestVersion;
                    patientModel.versionSchein = patient.versionSchein;
                    patientModel.versionText = patient.versionText;
                    return patientModel;
                } );

                return patientModels;
            } )
            .catch( catchUnhandled );
    };

    /**
     * @method createModelFromActivityId
     * @for PatientVersionEditor
     * @param {String|ko.observable} activityId
     * @returns {Promise}
     * @static
     */
    PatientVersionEditor.createModelFromActivityId = function( activityId, scheinPatient, caseFolderType ) {
        activityId = peek( activityId );
        return PatientVersionEditor
            .createPatientModelFromActivityId( activityId, scheinPatient, caseFolderType )
            .then( function( patientModels ) {
                if( patientModels.length ) {
                    return new PatientVersionEditor( {
                        currentPatients: patientModels
                    } );
                }
            } )
            .catch( catchUnhandled );
    };

    /**
     * @method showAsModal
     * @for PatientVersionEditor
     * @param {Object} parameters
     * @param {String|ko.observable} parameters.activityId
     * @param {Array|ko.observable} parameters.locations
     */
    PatientVersionEditor.showAsModal = function( parameters ) {
        var
            activityId = peek( parameters.activityId ),
            locations = peek( parameters.locations ),
            scheinPatient = peek( parameters.scheinPatient ),
            caseFolderType = peek( parameters.caseFolderType);
            scheinPatient.latestVersion = true;

        Promise
            .props( {
                template: Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'DocCirrus/views/PatientVersionEditor'} )
                    .then( function( response ) {
                        return response.data;
                    } ),
                patientVersionEditor: PatientVersionEditor
                    .createModelFromActivityId( activityId, scheinPatient, caseFolderType )
            } )
            .then( function( props ) {
                var
                    patientVersionEditor = props.patientVersionEditor,
                    bodyContent = Y.Node.create( props.template );

                if( !props.patientVersionEditor ) {
                    return;
                }

                patientVersionEditor.bodyContent = bodyContent;
                var
                    dialog = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-PatientVersion',
                        bodyContent: bodyContent,
                        title: 'Patientendaten',
                        icon: Y.doccirrus.DCWindow.ICON_INFO,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: 400,
                        minHeight: 400,
                        minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                        maximizable: true,
                        resizable: false,
                        focusOn: [], // easy way to solve the select2/YUI panel problem
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    label: 'Speichern',
                                    isDefault: true,
                                    action: function( e ) {
                                        var
                                            patient = patientVersionEditor.get( 'currentPatient' );

                                        var selectedVersionId = patientVersionEditor.currentVersion(),
                                            selectedVersion = patientVersionEditor.get( 'currentPatients' ).filter( function( patientVersion ) {
                                                return patientVersion.versionId === selectedVersionId;
                                            } );
                                        selectedVersion = selectedVersion && selectedVersion[0];
                                        if( selectedVersion.versionLatest ) {
                                            selectedVersionId = null;
                                        }
                                        if( selectedVersion.versionSchein !== selectedVersionId && ( selectedVersion.versionSchein || selectedVersionId) ) {
                                            Y.doccirrus.jsonrpc.api.activity.updateBatch( {
                                                query: {
                                                    activitiesId: [activityId]
                                                },
                                                data: {
                                                    patientVersionId: selectedVersionId
                                                },
                                                fields: ['patientVersionId']
                                            } ).done( function() {
                                            } ).fail( function( error ) {
                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                            } );
                                        }

                                        Y.doccirrus.kbvcommonutils
                                            .patientPreSaveValidation( patient, locations )
                                            .done( function() {
                                                var
                                                    data = patient.toJSON();

                                                delete data._id;

                                                Y.doccirrus.jsonrpc.api.patientversion
                                                    .update( {
                                                        query: {
                                                            _id: patient.get( 'data._originalId' ) || peek( patient._id )
                                                        },
                                                        data: data,
                                                        fields: Object.keys( data )
                                                    } )
                                                    .done( function() {
                                                        dialog.close( e );
                                                    } )
                                                    .fail( function( error ) {
                                                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                    } );
                                            } );
                                    }
                                } )
                            ]
                        },
                        after: {
                            visibleChange: function( yEvent ) {
                                // also captures cancel for e.g.: ESC
                                if( !yEvent.newVal ) {
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                    patientVersionEditor.destroy();
                                }
                            }
                        }
                    } );

                dialog.resizeMaximized.set( 'maximized', true );

                patientVersionEditor.addDisposable( ko.computed( function() {
                    var
                        isValid = patientVersionEditor.isSelectedVersionValid(),
                        OK = dialog.getButton( 'OK' ).button;

                    if( isValid ) {
                        OK.enable();
                    }
                    else {
                        OK.disable();
                    }

                } ) );

                ko.applyBindings( patientVersionEditor, patientVersionEditor.bodyContent.getDOMNode() );

            } )
            .catch( catchUnhandled );
    };

    KoViewModel.registerConstructor( PatientVersionEditor );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'EditorModel',
        'PatientModel',
        'PatientEditorMixin',
        'AddressEditorModel',
        'CommunicationEditorModel',
        'InsuranceStatusEditorModel',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'promise',
        'dcerrortable',
        'DCWindow'
    ]
} );
