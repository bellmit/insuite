/**
 * User: dcdev
 * Date: 6/19/19  10:37 AM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, moment*/
/*eslint prefer-template:0, strict:0 */
'use strict';

YUI.add( 'DocumedisArticlesModal', function( Y ) {
        var
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            KoViewModel = Y.doccirrus.KoViewModel,
            titleI18n = i18n( 'InCaseMojit.DocumedisModals.labels.title' ),
            modal;

        function DocumedisArticlesModel( config ) {
            DocumedisArticlesModel.superclass.constructor.call( this, config );
        }

        Y.extend( DocumedisArticlesModel, KoViewModel.getDisposable(), {
            destructor: function() {
            },

            initializer: function DocumedisArticlesModel_initializer( config ) {
                var self = this,
                    manyMedicationsMissedI18n = i18n( 'InCaseMojit.DocumedisModals.text.manyMedicationsMissed' ),
                    medicationData = config.medicationData;

                self.mainHeaderI18n = i18n( 'InCaseMojit.DocumedisModals.labels.mainHeader' );
                self.canNotBeAddedI18n = i18n( 'InCaseMojit.DocumedisModals.labels.canNotBeAdded' );
                self.canBeAddedI18n = i18n( 'InCaseMojit.DocumedisModals.labels.canBeAdded' );
                self.needToBeChosenI18n = i18n( 'InCaseMojit.DocumedisModals.labels.needToBeChosen' );
                self.willBeUpdatedI18n = i18n( 'InCaseMojit.DocumedisModals.labels.willBeUpdated' );
                self.willBeDeletedI18n = i18n( 'InCaseMojit.DocumedisModals.labels.willBeDeleted' );
                self.allergiesI18n =  i18n( 'v_meddata-schema.medDataCategories.ALLERGIES' );
                self.biometricsI18n =  i18n( 'v_meddata-schema.medDataCategories.BIOMETRICS' );
                self.medDataI18n = i18n( 'activity-schema.Activity_T.medData.i18n' );

                self.radioBoxModel = ko.observableArray( [] );
                self.medPlan = config.medPlan || null;
                self.medData = config.medData;
                self.patient = config.patient;
                self.pznCodes = config.pznCodes;
                self.willBeCreated = medicationData.willBeCreated;
                self.activitiesToUpdate = medicationData.activitiesToUpdate;
                self.activitiesToDelete = medicationData.activitiesToDelete;
                self.initRadioboxGroups( medicationData.shouldBeProcessedByUser );
                self.textToShow = "";
                self.medPlanTemplate = config.medPlanTemplate || null;

                if( (medicationData.missedMedicationsAttrs || []).length ) {
                    self.textToShow = manyMedicationsMissedI18n + " " + medicationData.missedMedicationsAttrs.join( ', ' );
                }

                if( !self.willBeCreated.length && !self.activitiesToUpdate.length && !self.activitiesToDelete.length &&
                    !medicationData.shouldBeProcessedByUser.length ) {
                    modal.getButton( 'SAVE' ).set( 'disabled', true );
                }
                self.filterChangedMeddataList();

            },
            initRadioboxGroups: function DocumedisArticlesModel_initRadioboxGroups( shouldBeProcessedByUser ) {
                var self = this;

                self.radioBoxModel( shouldBeProcessedByUser.map( function( medicationGroup, index ) {
                    var isPreSelected = null;
                    medicationGroup = medicationGroup.map( function( medication ) {
                        return {
                            medication: medication,
                            title: medication.phDescription
                        };
                    } );
                    if( self.pznCodes && self.pznCodes.length ) {
                        isPreSelected = medicationGroup.filter( function( item ) {
                            return -1 !== self.pznCodes.indexOf( item.medication.phPZN );
                        });
                    }
                    return {
                        name: 'radio' + index.toString(),
                        isSelected: ko.observable( isPreSelected && isPreSelected[0] && isPreSelected[0].medication || medicationGroup[0].medication ),
                        medicationGroup: medicationGroup
                    };
                } ) );

                self.showGroups = !!self.radioBoxModel().length;
            },
            getMedications: function DocumedisArticlesModel_getMedications() {
                var
                    self = this, medications = [];
                unwrap( self.radioBoxModel ).forEach( function( group ) {
                    medications = medications.concat( unwrap( group.isSelected ) );
                } );

                return self.willBeCreated.concat( medications );
            },
            filterChangedMeddataList: function DocumedisArticlesModel_filterChangedMeddataList(  ) {
                var
                    self = this,
                    keyToCompare,
                    newMedDataValue,
                    latestValue;
                self.changedBiometrics = [];
                self.changedAllergies = [];
                self.changedMeddata = [];
                self.medData.forEach( function( medData ) {

                    if (medData) {
                        switch( medData.category ) {

                            case "BIOMETRICS":
                                keyToCompare = medData.hasOwnProperty( "textValue" ) ? "textValue" : "value";
                                newMedDataValue = medData[keyToCompare];
                                latestValue = self.patient.getLatestMedDataValue( medData.type, keyToCompare );

                                if( latestValue !== newMedDataValue ) {
                                    self.changedBiometrics.push( {
                                        type: Y.doccirrus.schemaloader.getEnumListTranslation( 'v_meddata', 'medDataType_E', medData.type, 'i18n', medData.type ),
                                        value: newMedDataValue || ""
                                    } );

                                    self.changedMeddata.push( medData );
                                }
                                break;

                            case "ALLERGIES":
                                keyToCompare = "boolValue";
                                newMedDataValue = medData[keyToCompare];
                                latestValue = self.patient.getLatestMedDataValue( medData.type, keyToCompare );
                                if( !latestValue ) {
                                    self.changedAllergies.push( {
                                        category: medData.category,
                                        type: medData.type
                                    } );

                                    medData.boolValue = true;
                                    delete medData.value;
                                    medData.textValue = '';
                                    self.changedMeddata.push( medData );
                                }
                                break;
                        }
                    }
                });
            }

        } );

        function DocumedisArticles() {
        }

        DocumedisArticles.prototype.show = function( config ) {

            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'InCaseMojit/views/documedis_articles_modal'} )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    var
                        bodyContent = Y.Node.create( template ), model;

                    modal = new Y.doccirrus.DCWindow( {
                        id: 'documedisAriclesModal',
                        className: 'DCWindow-Appointment',
                        bodyContent: bodyContent,
                        title: titleI18n,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    isDefault: true,
                                    action: function() {
                                        this.close();
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    isDefault: true,
                                    action: function() {
                                        modal.getButton( 'SAVE' ).set( 'disabled', true );
                                        if( !model.medPlan && config.cdsCheck ) {
                                            Y.doccirrus.jsonrpc.api.activity.createMedicationPlanFromDocumedis( {
                                                data: {
                                                    employeeId: config.employeeId,
                                                    locationId: config.locationId,
                                                    patientId: config.patientId,
                                                    caseFolderId: config.caseFolderId,
                                                    caseFolderType: config.caseFolderType,
                                                    timestamp: moment().toISOString(),
                                                    print: null,
                                                    printerName: '',
                                                    numCopies: 0,
                                                    taskData: null,
                                                    showDialog: false,
                                                    printActivities: [],
                                                    medData: model.changedMeddata,
                                                    catalogMedications: model.getMedications(),
                                                    medPlanTemplate: model.medPlanTemplate
                                                }
                                            } ).done( function() {
                                                modal.close();
                                            } ).fail( function( error ) {
                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                modal.getButton( 'SAVE' ).set( 'disabled', false );
                                            } );
                                        } else if( config.cdsCheck ) {
                                            Y.doccirrus.jsonrpc.api.activity.updateMedicationPlanFromDocumedis( {
                                                data: {
                                                    medPlan: model.medPlan,
                                                    catalogMedications: model.getMedications(),
                                                    locationId: config.locationId,
                                                    activitiesToUpdate: model.activitiesToUpdate,
                                                    activitiesToDelete: model.activitiesToDelete,
                                                    employeeId: config.employeeId,
                                                    patientId: config.patientId,
                                                    caseFolderId: config.caseFolderId,
                                                    caseFolderType: config.caseFolderType,
                                                    medPlanTemplate: model.medPlanTemplate,
                                                    medData: config.changedMeddata
                                                }
                                            } ).done( function() {
                                                modal.close();
                                            } ).fail( function( error ) {
                                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                                modal.getButton( 'SAVE' ).set( 'disabled', false );
                                            } );

                                        }

                                        if( config.callback ) {
                                            config.callback( {
                                                medications: model.getMedications().concat( model.activitiesToUpdate ),
                                                medData: model.changedMeddata
                                            } );
                                            modal.close();
                                        }
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

                    model = new DocumedisArticlesModel( config );

                    ko.applyBindings( model, bodyContent.getDOMNode() );

                } ).catch( catchUnhandled );
        };

        Y.namespace( 'doccirrus.modals' ).documedisArticles = new DocumedisArticles();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'doccirrus',
            'KoUI-all',
            'KoViewModel',
            'KoButton'
        ]
    }
);