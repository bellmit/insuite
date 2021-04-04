/**
 * User: pi
 * Date: 15/12/15  11:50
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, _, ko */

'use strict';

YUI.add( 'BGScheinModel', function( Y ) {
        /**
         * @module BGScheinModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable;

        /**
         * @abstract
         * @class BGScheinModel
         * @constructor
         * @extends ScheinModel
         */
        function BGScheinModel( config ) {
            BGScheinModel.superclass.constructor.call( this, config );
        }

        BGScheinModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( BGScheinModel, KoViewModel.getConstructor( 'ScheinModel' ), {

                initializer: function BGScheinModel_initializer() {
                    var
                        self = this;
                    self.initBGScheinModel();
                },
                destructor: function BGScheinModel_destructor() {
                },
                initBGScheinModel: function BGScheinModel_initBGScheinModel() {
                    var self = this,
                        lastSchein = self.get( 'lastSchein' );
                    if( self.isNew() && lastSchein ) {
                        self.assignOldBgSchein( lastSchein );
                    }
                },
                assignOldBgSchein: function BGScheinModel_assignOldBgSchein( bgSchein ) {
                    var self = this,
                        defaults,
                        bgScheinFieldsToCopy = ['userContent', 'comment', 'explanations', 'scheinSettledDate', 'scheinRemittor', 'scheinEstablishment', 'scheinSpecialisation', 'scheinOrder', 'scheinDiagnosis', 'treatmentType', 'includesBSK', 'isChiefPhysician', 'debtCollection', 'orderAccounting', 'agencyCost', 'scheinFinding', 'scheinClinicID', 'scheinNotes', 'scheinClinicalTreatmentFrom', 'scheinClinicalTreatmentTo', 'scheinNextTherapist', 'fk4219', 'continuousIcds', 'createContinuousDiagnosisOnSave', 'assignedBgScheinRef', 'dayOfAccident', 'timeOfAccident', 'workingHoursStart', 'workingHoursEnd', 'dayOfArrival', 'timeOfArrival', 'dayOfFristTreat', 'fristTreatPhysician', 'accidentCompany', 'accidentCompanyStreet', 'accidentCompanyHouseno', 'accidentCompanyPLZ', 'accidentCompanyCity'],
                        mixedSchema = _.pick( self._getBoilerplateDefinition( self.get( 'schemaName' ) ), bgScheinFieldsToCopy ),
                        newData,
                        employeeId = peek( self.employeeId ); // needs to be re-assigned gets lost otherwise

                    function getEmptyValue( schemaEntry ) {
                        if( Array.isArray( schemaEntry.type ) ) {
                            return [];
                        } else if( schemaEntry.type === 'String' ) {
                            return '';
                        } else if( schemaEntry.type === 'Boolean' ) {
                            return false;
                        } else {
                            return null;
                        }
                    }

                    if( bgSchein ) {
                        defaults = {};
                        Object.keys( mixedSchema ).forEach( function( key ) {
                            defaults[key] = mixedSchema[key].default || getEmptyValue( mixedSchema[key] );
                        } );

                        newData = Object.assign(
                            self.get( 'data' ),
                            defaults,
                            _.pick( bgSchein, bgScheinFieldsToCopy ),
                            {employeeId: employeeId, assignedBgScheinRef: bgSchein._id}
                        );
                    } else {
                        newData = self.get( 'data' );
                        Object.keys( mixedSchema ).forEach( function( key ) {
                            if( newData[key] ) {
                                newData[key] = mixedSchema[key].default || getEmptyValue( mixedSchema[key] );
                            }
                        } );
                        Object.assign(
                            newData,
                            {employeeId: employeeId, assignedBgScheinRef: null}
                        );
                    }

                    self.set( 'data', newData );
                }
            },
            {
                schemaName: 'v_bg_schein',
                NAME: 'BGScheinModel'
            }
        );
        KoViewModel.registerConstructor( BGScheinModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ScheinModel',
            'v_bg_schein-schema'
        ]
    }
)
;