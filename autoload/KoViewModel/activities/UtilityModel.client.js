/**
 * User: pi
 * Date: 18/01/16  13:40
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'UtilityModel', function( Y ) {
        /**
         * @module UtilityModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            CatalogBasedActivityModel = KoViewModel.getConstructor( 'CatalogBasedActivityModel' ),
            mixin = Y.doccirrus.api.activity.getFormBasedActivityAPI();

        /**
         * @class UtilityModel
         * @constructor
         * @extends CatalogBasedActivityModel
         */
        function UtilityModel( config ) {
            UtilityModel.superclass.constructor.call( this, config );
        }

        UtilityModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( UtilityModel, CatalogBasedActivityModel, {

                initializer: function UtilityModel_initializer() {
                    var
                        self = this;
                    if( self.initFormBasedActivityAPI ) {
                        self.initFormBasedActivityAPI();
                    }

                    self.initUtilityModel();
                },
                destructor: function UtilityModel_destructor() {
                },

                initUtilityModel: function UtilityModel_initUtilityModel() {
                    var
                        self = this;
                    self.addDisposable( ko.computed( function() {
                        var
                            u_extra = unwrap( self.u_extra ),
                            computedInitial = ko.computedContext.isInitial();
                        if( !computedInitial ) {
                            if( !u_extra ) {
                                return;
                            }

                            if( !ko.computedContext.isInitial() ) {
                                self.utTherapyGoals( u_extra.therapyGoal || '' );
                                self.comment( (u_extra.info || '') + ' ' + (u_extra.therapyGoal || '') );
                            }

                            if( 'LOGO' === self.catalogShort() ) {
                                self.setLogoInfo( u_extra );
                            }
                        }

                    } ) );
                    self.addDisposable( ko.computed( function() {
                        var
                            utRemedy1Name = unwrap( self.utRemedy1Name ),
                            utRemedy2Name = unwrap( self.utRemedy2Name ),
                            prescriptionType = 'FIRST' === unwrap( self.utPrescriptionType ) ? 'E' : 'F',
                            presc = self.findPrescriptionType( prescriptionType ),
                            computedInitial = ko.computedContext.isInitial();
                        if( !computedInitial ) {
                            if( presc && utRemedy1Name ) {
                                self.utRemedy1Seasons( presc.amount );
                            }
                            if( presc && utRemedy2Name ) {
                                self.utRemedy2Seasons( presc.amount );
                            }
                        }
                    } ) );

                },
                resetRemedyFields: function( number ) {
                    var
                        self = this,
                        attrPrefix = self.getRemedyPrefix( number );
                    self[ attrPrefix + 'Explanation' ]( '' );
                    self[ attrPrefix + 'Seasons' ]( null );
                    self[ attrPrefix + 'PerWeek' ]( null );
                    self[ attrPrefix + 'Item' ]( null );
                    self[ attrPrefix + 'ItemPrice' ]( null );
                },
                getRemedyPrefix: function( number ) {
                    var attrPrefix = 'utRemedy';
                    if( 1 === number ) {
                        attrPrefix += 1;
                    } else {
                        attrPrefix += 2;
                    }
                    return attrPrefix;
                },
                resetForm: function() {
                    var
                        self = this;
                    self.u_extra( {} );
                    self.utDiagnosisName( '' );
                    self.utRemedy1Name( '' );
                    self.resetRemedyFields( 1 );
                    self.utRemedy2Name( '' );
                    self.resetRemedyFields( 2 );
                    self.utVocalTherapy( false );
                    self.utSpeakTherapy( false );
                    self.utSpeechTherapy( false );
                    self.utPrescriptionType( '' );
                    self.utNoNormalCase( false );
                    self.utHomeVisit( false );
                    self.utTherapyReport( false );
                    self.utGroupTherapy( false );
                    self.utDurationOfSeason( null );
                    self.utLatestStartOfTreatment( null );
                    self.utMedicalJustification( '' );
                    self.utTherapyGoals( '' );

                    self.code( '' );
                    self.userContent( '' );
                },
                changedRemedy: function( number, val ) {
                    var
                        self = this,
                        presc,
                        prescType = self.utPrescriptionType(),
                        attrPrefix = self.getRemedyPrefix( number );

                    self.resetRemedyFields( number );
                    if( val ) {
                        presc = self.findPrescriptionType( 'FF' );
                        if( presc ) {
                            self[ attrPrefix + 'PerWeek' ]( presc.amount );
                        }
                        if( 'FIRST' === prescType ) {
                            presc = self.findPrescriptionType( 'E' );
                            if( presc ) {
                                self[ attrPrefix + 'Seasons' ]( presc.amount );
                            }
                        } else if( 'FOLLOWING' === prescType ) {
                            presc = self.findPrescriptionType( 'F' );
                            if( presc ) {
                                self[ attrPrefix + 'Seasons' ]( presc.amount );
                            }
                        }
                    }
                },
                setLogoInfo: function( u_extra ) {
                    var
                        self = this,
                        duration = null;
                    if( !u_extra.remedies || !u_extra.remedies.length ) {
                        return;
                    }

                    u_extra.remedies.forEach( function( remedy ) {
                        if( 0 === remedy.short.indexOf( 'ST' ) ) {
                            self.utVocalTherapy( true );
                            if( !duration && remedy.duration ) {
                                duration = remedy.duration;
                            }
                        } else if( 0 === remedy.short.indexOf( 'SPA' ) ) {
                            self.utSpeechTherapy( true );
                        } else if( 0 === remedy.short.indexOf( 'SPR' ) ) {
                            self.utSpeakTherapy( true );
                        }
                    } );

                    self.utDurationOfSeason( duration );

                    self.changedRemedy( 1, true );
                },
                findPrescriptionType: function( type ) {
                    var
                        self = this,
                        u_extra = peek( self.u_extra ),
                        prescriptions = u_extra && u_extra.prescriptions,
                        found = null;
                    if( prescriptions && prescriptions.length ) {
                        prescriptions.some( function( presc ) {
                            if( presc.type === type ) {
                                found = presc;
                                return true;
                            }
                        } );
                    }
                    return found;
                }
            },
            {
                schemaName: 'v_utility',
                NAME: 'UtilityModel'
            }
        );

        Y.mix( UtilityModel, mixin, false, Object.keys( mixin ), 4 );

        KoViewModel.registerConstructor( UtilityModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedActivityModel',
            'v_utility-schema',
            'activity-api'
        ]
    }
);