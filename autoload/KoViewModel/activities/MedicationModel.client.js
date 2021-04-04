/**
 * User: pi
 * Date: 15/01/16  13:30
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, _  */

'use strict';

YUI.add( 'MedicationModel', function( Y/*, NAME */) {
        /**
         * @module MedicationModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            CatalogBasedActivityModel = KoViewModel.getConstructor( 'CatalogBasedActivityModel' ),
            unwrap = ko.unwrap,
            mixin = Y.doccirrus.api.activity.getFormBasedActivityAPI();


        function PhIngrModel( config ) {
            PhIngrModel.superclass.constructor.call( this, config );
        }

        Y.extend( PhIngrModel, KoViewModel.getBase(), {
            initializer: function() {
            },
            destructor: function () {
            }
        }, {
            schemaName: 'v_medication.phIngr',
            NAME: 'PhIngrModel'
        } );
        KoViewModel.registerConstructor( PhIngrModel );

        /**
         * @class MedicationModel
         * @constructor
         * @extends CatalogBasedActivityModel
         */
        function MedicationModel( config ) {
            MedicationModel.superclass.constructor.call( this, config );
        }

        MedicationModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( MedicationModel, CatalogBasedActivityModel, {

                initializer: function MedicationModel_initializer() {
                    var
                        self = this;

                    if( self.initFormBasedActivityAPI ) {
                        self.formLookupInProgress = self.addDisposable( ko.observable( false ) );
                        self.initFormBasedActivityAPI();
                    }
                    self.initMedicationModel();
                },
                destructor: function MedicationModel_destructor() {
                },
                initMedicationModel: function MedicationModel_initMedicationModel() {
                    var self = this,
                        catalogs = self.getCatalogs();

                    if (self.get('caseFolder') && self.get('caseFolder').type &&  Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[ self.get('caseFolder').type || 'ANY'] === "CH") {
                        self.set( 'data.catalogShort', (catalogs.find(function (c) { return c.country === "CH";}) || {}).short || "" );
                    } else {
                        self.set( 'data.catalogShort', (catalogs[0] || {}).short || "" );
                    }
                    self.isLastMedication = ko.observable( null );

                    self.setNotModified();

                    self.addDisposable( ko.computed( function() {
                        var
                            hasVat = unwrap( self.hasVat );
                        if( !hasVat ) {
                            self.vat( 0 );
                        }
                    } ).extend( { rateLimit: 0 } ) ); //should wait for "if"(view)

                    if( !self.isNew() ) {
                        self.getMedications();
                    }

                    self.addDisposable( ko.computed( function() {
                        var
                            isLastMedication = unwrap( self.isLastMedication ),
                            paths;

                        if( null !== isLastMedication && !isLastMedication ) {
                            self._isEditable( false );
                            paths = ['*'];

                            if( 'VALID' === self.status() ) {
                                paths = ['noLongerValid'];
                            }
                            self.getModuleViewModelReadOnly()._makeReadOnly( {
                                paths: paths
                            } );

                            self.setNotModified();
                        }
                    }));

                },
                getMedications: function() {
                    var
                        self = this;

                    Y.doccirrus.jsonrpc.api.activity.read( {
                        query: {
                            actType: 'MEDICATION',
                            code: self.code(),
                            patientId: self.patientId(),
                            status: {$nin: ['CANCELLED', 'PREPARED']},
                            phContinuousMed: self.phContinuousMed()
                        },
                        options: {
                            sort: {timestamp: -1},
                            itemsPerPage: 1
                        }
                    } ).done( function( result ) {
                        var
                            data = result && result.data && result.data[0] && result.data[0]._id;
                        self.isLastMedication( data && data === self._id() );
                    } ).fail( function( err ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                    } );
                },
                addPhIngr: function() {
                    var self = this;
                    self.phIngr.push( {} );
                },
                removePhIngr: function(data) {
                    var self = this;
                    self.phIngr.remove( data );
                }
            },
            {
                schemaName: 'v_medication',
                NAME: 'MedicationModel'
            }
        );
        Y.mix( MedicationModel, mixin, false, Object.keys( mixin ), 4 );
        KoViewModel.registerConstructor( MedicationModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedActivityModel',
            'v_medication-schema'
        ]
    }
)
;