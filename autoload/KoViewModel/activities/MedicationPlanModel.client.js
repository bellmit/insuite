/**
 * User: pi
 * Date: 15/01/16  13:30
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'MedicationPlanModel', function( Y/*, NAME */ ) {
        /**
         * @module MedicationPlanModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            SimpleActivityModel = KoViewModel.getConstructor( 'SimpleActivityModel' );

        /**
         * @class MedicationPlanModel
         * @constructor
         * @extends SimpleActivityModel
         */
        function MedicationPlanModel( config ) {
            MedicationPlanModel.superclass.constructor.call( this, config );
        }

        MedicationPlanModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            defaultMappings: {
                value: null,
                lazyAdd: false
            }
        };

        Y.extend( MedicationPlanModel, SimpleActivityModel, {

                initializer: function MedicationPlanModel_initializer() {
                    var
                        self = this;
                    self.initMedicationPlanModel();
                },
                destructor: function MedicationPlanModel_destructor() {
                },
                initMedicationPlanModel: function MedicationPlanModel_initMedicationPlanModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' );

                    self._locationList = binder.getInitialData( 'location' );
                    self.areMedicationsValid = ko.observable( true );
                    self.medicationsChanged = ko.observable( false );
                    self._initComputeStatus();
                },
                isModified: function() {
                    var
                        self = this,
                        original = MedicationPlanModel.superclass.isModified.apply( self, arguments );
                    return original || unwrap( self.medicationsChanged );
                },
                setNotModified: function() {
                    var
                        self = this;
                    MedicationPlanModel.superclass.setNotModified.apply( self, arguments );
                    if( self.medicationsChanged ) {
                        self.medicationsChanged( false );
                    }
                },
                /**
                 * @override
                 */
                initComputeStatus: function() {

                },
                _initComputeStatus: function() {
                    var
                        self = this;
                    self.addDisposable( ko.computed( function() {
                        var
                            isModified = self.isModified(),
                            status = unwrap( self.status ),
                            medicationsChanged = unwrap( self.medicationsChanged );
                        /**
                         * When model is considered modified, status is set to 'CREATED'.
                         * If not modified initial status is reapplied.
                         */
                        if( isModified || medicationsChanged ) {
                            if( !('CREATED' === status || 'INVALID' === status) ) {
                                self.status( 'CREATED' );
                            }
                        }
                        else {
                            self.status( self.get( 'data.status' ) );
                        }

                    } ).extend( { rateLimit: 0 } ) );
                }
            },
            {
                schemaName: 'v_simple_activity',
                NAME: 'MedicationPlanModel'
            }
        );
        KoViewModel.registerConstructor( MedicationPlanModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'v_simple_activity-schema'
        ]
    }
);