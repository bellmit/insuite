/**
 * User: pi
 * Date: 11/12/15  11:50
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, _  */

'use strict';

YUI.add( 'ScheinModel', function( Y ) {
        /**
         * @module ScheinModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @abstract
         * @class ScheinModel
         * @constructor
         * @extends SimpleActivityModel
         */
        function ScheinModel( config ) {
            ScheinModel.superclass.constructor.call( this, config );
        }

        ScheinModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            openScheinBl: {
                value: null,
                lazyAdd: false
            },
            openBilledScheinBl: {
                value: null,
                lazyAdd: false
            },
            caseFolderBl: {
                value: null,
                lazyAdd: false
            }

        };

        Y.extend( ScheinModel, KoViewModel.getConstructor( 'SimpleActivityModel' ), {

                initializer: function ScheinModel_initializer() {
                    var
                        self = this;
                    self.initScheinModel();
                },
                destructor: function ScheinModel_destructor() {
                },
                initScheinModel: function ScheinModel_initScheinModel() {
                    var
                        self = this,
                        continuousIcdsObj = self.get('continuousIcdsObj'),
                        continuousMedicationsObj = self.get('continuousMedicationsObj') || [];
                    if( self.isNew() && continuousIcdsObj ) {
                        self.continuousIcds( continuousIcdsObj.map( function( item ) {
                            return item._id;
                        } ) );
                    }
                    if( self.isNew() && continuousMedicationsObj ) {
                        self.continuousMedications( continuousMedicationsObj.map( function( item ) {
                            return item._id;
                        } ) );
                    }
                },
                fixOldBlData: function( fk4235Set ) {
                    function sum( total, fk4244 ) {
                        total += (fk4244.fk4245) || 0;
                        return total;
                    }

                    fk4235Set.forEach( function( fk4235 ) {
                        if( !_.isFinite( fk4235.fk4252 ) ) {
                            fk4235.fk4252 = (fk4235.fk4244Set || []).reduce( sum, 0 );
                        }
                        if( !_.isFinite( fk4235.fk4255 ) ) {
                            fk4235.fk4255 = (fk4235.fk4256Set || []).reduce( sum, 0 );
                        }
                    } );
                },
                insertBL: function ScheinModel_insertBL( fk4235Set, parentId ) {
                    var
                        self = this;
                    self.fixOldBlData( fk4235Set );
                    if( 0 < fk4235Set.length ) {
                        self.fk4235Set.removeAll();
                        self.fk4234( true );
                        fk4235Set.forEach( function( fk4235 ) {
                            self.fk4235Set.push( fk4235 );
                        } );
                        if( parentId ) {
                            if( -1 === self.activities.indexOf( parentId ) ) {
                                self.activities.push( parentId );
                            }
                        }
                        self.updateReadOnly();
                    }
                },
                prefillBL: function ScheinModel_insertBL( fk4235Set ) {
                    var
                        self = this;
                    self.fixOldBlData( fk4235Set );
                    if( 0 < fk4235Set.length ) {
                        self.fk4235Set.removeAll();
                        self.fk4234( true );
                        fk4235Set.forEach( function( fk4235 ) {
                            fk4235.fk4244Set.forEach( function( item ) {
                                item.fk4246Offset = item.fk4246;
                                return item;
                            } );
                            delete fk4235._id;

                            self.fk4235Set.push( fk4235 );
                        } );
                        self.updateReadOnly();
                    }
                },
                makeActivityFromICD: function ScheinModel_makeActivityFromICD( config ) {
                    var
                        dataICD = config.dataICD,
                        patientId = config.patientId,
                        _id;
                    if( dataICD.seq ) {
                        _id = (new Y.doccirrus.mongo.ObjectId()).toString();
                        return {
                            _id: _id,
                            status: 'CREATED',
                            actType: 'DIAGNOSIS',
                            diagnosisCert: 'TENTATIVE',
                            diagnosisTreatmentRelevance: 'TREATMENT_RELEVANT',
                            // from here this is a copy of code
                            // from casefile_detail ==> could think of
                            // a helper function here
                            content: dataICD.title,
                            code: dataICD.seq,
                            comment: dataICD.infos,
                            u_extra: dataICD.u_extra,
                            actualUnit: dataICD.unit,
                            actualPrice: dataICD.value,
                            patientId: patientId
                        };
                    } else {
                        return dataICD;
                    }
                },
                addFk4235Set: function ScheinModel_addFk4235Set() {
                    var
                        self = this;
                    self.fk4235Set.push( {} );
                },
                removeFk4235Set: function ScheinModel_removeFk4235Set( obj ) {
                    var
                        self = this;
                    self.fk4235Set.remove( obj );
                },
                addContinuousIcds: function ScheinModel_addContinuousIcds( obj ){
                    var
                        self = this,
                        continuousIcdsObj = self.get( 'continuousIcdsObj' );
                    self.continuousIcds.push( obj._id );
                    continuousIcdsObj.push( obj );
                    self.set( 'continuousIcdsObj', continuousIcdsObj );
                },
                removeContinuousIcds: function ScheinModel_removeContinuousIcds( id ){
                    var
                        self = this,
                        continuousIcdsObj = self.get( 'continuousIcdsObj' );
                    self.continuousIcds.remove( id );
                    continuousIcdsObj = continuousIcdsObj.filter( function( item ){
                        return item._id !== id;
                    } );
                    self.set( 'continuousIcdsObj', continuousIcdsObj );
                },
                addContinuousMedications: function ScheinModel_addContinuousMedications( obj ){
                    var
                        self = this,
                        continuousMedicationsObj = self.get( 'continuousMedicationsObj' ) || [];
                    self.continuousMedications.push( obj._id );
                    continuousMedicationsObj.push( obj );
                    self.set( 'continuousMedicationsObj', continuousMedicationsObj );
                },
                removeContinuousMedications: function ScheinModel_removeContinuousMedications( id ){
                    var
                        self = this,
                        continuousMedicationsObj = self.get( 'continuousMedicationsObj' );
                    self.continuousMedications.remove( id );
                    continuousMedicationsObj = continuousMedicationsObj.filter( function( item ){
                        return item._id !== id;
                    } );
                    self.set( 'continuousMedicationsObj', continuousMedicationsObj );
                }
            },
            {
                schemaName: 'v_schein',
                NAME: 'ScheinModel'
            }
        );
        KoViewModel.registerConstructor( ScheinModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'dcmongo',
            'dc-comctl'
        ]
    }
)
;