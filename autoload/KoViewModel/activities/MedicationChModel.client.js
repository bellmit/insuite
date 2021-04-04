/*jslint anon:true, nomen:true*/
/*global YUI, ko, _  */

'use strict';

YUI.add( 'MedicationChModel', function( Y/*, NAME */) {
        /**
         * @module MedicationChModel
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
         * @class MedicationChModel
         * @constructor
         * @extends CatalogBasedActivityModel
         */
        function MedicationChModel( config ) {
            MedicationChModel.superclass.constructor.call( this, config );
        }

        MedicationChModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( MedicationChModel, CatalogBasedActivityModel, {

                initializer: function MedicationChModel_initializer() {
                    var
                        self = this;

                    if( self.initFormBasedActivityAPI ) {
                        self.formLookupInProgress = self.addDisposable( ko.observable( false ) );
                        self.initFormBasedActivityAPI();
                    }
                    self.initMedicationChModel();
                },
                destructor: function MedicationChModel_destructor() {
                },
                initMedicationChModel: function MedicationChModel_initMedicationChModel() {
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
                NAME: 'MedicationChModel'
            }
        );
        Y.mix( MedicationChModel, mixin, false, Object.keys( mixin ), 4 );
        KoViewModel.registerConstructor( MedicationChModel );

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