/**
 * User: jm
 * Date: 15/12/16  16:32
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, _ */
'use strict';

YUI.add( 'SurgeryModel', function( Y ) {
        /**
         * @module SurgeryModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class SurgeryModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function SurgeryModel( config ) {
            SurgeryModel.superclass.constructor.call( this, config );
        }

        SurgeryModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            updatingAfterSave: {
                value: false,
                lazyAdd: false
            }
        };

        Y.extend( SurgeryModel, KoViewModel.getConstructor( 'FormBasedActivityModel' ), {
                initializer: function SurgeryModel_initializer() {
                    var self = this;
                    self.initSurgeryModel();
                },
                destructor: function SurgeryModel_destructor() {
                },
                initSurgeryModel: function SurgeryModel_initSurgeryModel() {
                },
                updateLinkedTreatments: function SurgeryModel_updateLinkedTreatments( linkedTreatments ) {
                    var self = this;

                    var updatedLinkedTreatments = linkedTreatments.map( function( treatment, index ) {
                        if( self.linkedTreatments()[index] ) {
                            return _.assign( {}, self.linkedTreatments()[index].toJSON() || {}, _.omit(treatment, ["_id", "activityIds"]) );
                        } else {
                            return treatment;
                        }
                    } );

                    self.linkedTreatments( updatedLinkedTreatments );

                    if( self.get( "updatingAfterSave" ) ) {
                        self.setNotModified();
                        self.set( "updatingAfterSave", false );
                    }
                },
                addFk5035Entry: function TreatmentModel_addFk5035Entry( fk5035Entry ) {
                    this.fk5035Set.push( fk5035Entry );
                },
                removeFk5035EntryByOpsCode: function TreatmentModel_removeFk5035EntryByOpsCode( opsCode ) {
                    this.fk5035Set.remove(function(fk5035Entry) {
                        return ko.unwrap(fk5035Entry.fk5035) === opsCode;
                    });
                },
                addFk5036Set: function TreatmentModel_addFk5036Set() {
                    this.fk5036Set.push( {} );
                },
                removeFk5036Set: function TreatmentModel_removeFk5036Set( fk5036Entry ) {
                    this.fk5036Set.remove( fk5036Entry );
                }
            },
            {
                schemaName: 'v_surgery',
                NAME: 'SurgeryModel'
            }
        );

        KoViewModel.registerConstructor( SurgeryModel );

    },
    '0.0.1',
    {
        requires: [
            'KoViewModel',
            'v_surgery-schema'
        ]
    }
);