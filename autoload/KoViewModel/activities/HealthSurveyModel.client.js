/**
 * User: pi
 * Date: 03/12/15  16:35
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, moment, ko */

'use strict';

YUI.add( 'HealthSurveyModel', function( Y, NAME ) {
        /**
         * @module HealthSurveyModel
         */
        var
            KoViewModel = Y.doccirrus.KoViewModel,
            mixin = Y.doccirrus.api.activity.getFormBasedActivityAPI();
    
        /**
         * @class HealthSurveyModel
         * @constructor
         * @extends SimpleActivityModel
         */
        function HealthSurveyModel( config ) {
            HealthSurveyModel.superclass.constructor.call( this, config );
        }

        HealthSurveyModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( HealthSurveyModel, KoViewModel.getConstructor( 'SimpleActivityModel' ), {

                initializer: function HealthSurveyModel_initializer() {
                    var
                        self = this;

                    if( self.initFormBasedActivityAPI ) {
                        self.initFormBasedActivityAPI();
                    }
                    
                    self.initHealthSurveyModel();
                },
                destructor: function HealthSurveyModel_destructor() {
                },
                initHealthSurveyModel: function HealthSurveyModel_initHealthSurveyModel() {

                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentPatient = ko.unwrap( binder.currentPatient );

                    if ( currentPatient ) {
                        self.initFromPatient( currentPatient );
                        return;
                    }

                    //  In some cases currentPatient is loaded after the activity is created, such as when reloading
                    //  the casefile on the #/new/ route - that case we need to wait for it before initializing the
                    //  activity

                    self.listenForPatientLoad = binder.currentPatient.subscribe( function( newVal ) {
                        self.initFromPatient( newVal );
                    } );
                },

                /**
                 *  Set initial survey values from patient profile
                 *
                 *  @param  currentPatient  {Object}    KO patient model
                 */

                initFromPatient: function( currentPatient ) {
                    var
                        self = this,
                        age;

                    //  This should only be done once, when mapping
                    if ( self.ageGroup && self.ageGroup() && '' !== self.ageGroup() ) {
                        Y.log( 'HEALTHSURVEY already initialized, not repeating, ageGroup: ' + self.ageGroup(), 'debug', NAME );
                        return;
                    }

                    /*
                     ageGroup = [
                         'BFB30_age_lt35',                   //  01
                         'BFB30_age_35_39',                  //  02
                         'BFB30_age_40_44',                  //  03
                         'BFB30_age_45_49',                  //  04
                         'BFB30_age_50_54',                  //  05
                         'BFB30_age_55_59',                  //  06
                         'BFB30_age_60_64',                  //  07
                         'BFB30_age_65_69',                  //  08
                         'BFB30_age_70_74',                  //  09
                         'BFB30_age_75_79',                  //  10
                         'BFB30_age_gt80'                    //  11
                     ],
                     */

                    if ( currentPatient.dob ) {
                        age = currentPatient.dateOfDeath() ? moment( currentPatient.dateOfDeath() ).diff( currentPatient.dob(), 'years' ) :
                            moment().diff( currentPatient.dob(), 'years' );

                        if ( age >= 80 ) { self.ageGroup( '11' ); }
                        if ( age < 80 ) { self.ageGroup( '10' ); }
                        if ( age < 75 ) { self.ageGroup( '09' ); }
                        if ( age < 70 ) { self.ageGroup( '08' ); }
                        if ( age < 65 ) { self.ageGroup( '07' ); }
                        if ( age < 60 ) { self.ageGroup( '06' ); }
                        if ( age < 55 ) { self.ageGroup( '05' ); }
                        if ( age < 50 ) { self.ageGroup( '04' ); }
                        if ( age < 45 ) { self.ageGroup( '03' ); }
                        if ( age < 40 ) { self.ageGroup( '02' ); }
                        if ( age < 35 ) { self.ageGroup( '01' ); }
                    }

                    //  prefill survey options from patient record
                    switch( currentPatient.gender() ) {
                        case 'MALE':    self.surveySex( 'M' );      break;
                        case 'FEMALE':  self.surveySex( 'W' );      break;
                        default:        self.surveySex( 'X' );      break;
                    }
                },

                _writeBack: function( template, element ) {
                    var
                        self = this,

                        name = element.schemaMember,
                        val = element.unmap(),

                        insuranceType = [
                            'BFB30insurance_AOK',               //  1
                            'BFB30insurance_LKK',               //  2
                            'BFB30insurance_VDeK',              //  3
                            'BFB30insurance_BKK',               //  4
                            'BFB30insurance_BKnapp',            //  5
                            'BFB30insurance_IKK'                //  6
                        ],

                        ageGroup = [
                            'BFB30_age_lt35',                   //  01
                            'BFB30_age_35_39',                  //  02
                            'BFB30_age_40_44',                  //  03
                            'BFB30_age_45_49',                  //  04
                            'BFB30_age_50_54',                  //  05
                            'BFB30_age_55_59',                  //  06
                            'BFB30_age_60_64',                  //  07
                            'BFB30_age_65_69',                  //  08
                            'BFB30_age_70_74',                  //  09
                            'BFB30_age_75_79',                  //  10
                            'BFB30_age_gt80'                    //  11
                        ],

                        historyGroups = [
                            'hypertonia',
                            'coronalHeartDisease',
                            'otherArterialClosure',
                            'diabetesMellitus',
                            'hyperlipidemia',
                            'kidneyDiseases',
                            'lungDiseases'
                        ],

                        surveySex = [ 'BFB30_sex_female', 'BFB30_sex_male' ],
                        i, temp;

                    //  convert insurance type to enum value

                    if ( -1 !== insuranceType.indexOf( name ) ) {
                        if ( true === val ) {
                            self.insuranceType( ( insuranceType.indexOf( name ) + 1 ) + '' );
                        } else {
                            //  null value, no checkbox selected
                            self.insuranceType( '0' );
                        }
                    }

                    //  convert age group to enum value
                    if ( -1 !== ageGroup.indexOf( name ) ) {
                        if ( true === val ) {
                            var id = ageGroup.indexOf( name ) + 1 + '';
                            while( id.length < 2 ) {
                                id = '0' + id;
                            }
                            self.ageGroup( id );
                        } else {
                            //  null value, no checkbox selected
                            self.ageGroup( '00' );
                        }
                    }

                    //  convert sex to enum value
                    if ( -1 !== surveySex.indexOf( name ) ) {

                        if ( false === val ) {
                            self.surveySex( 'X' );
                        } else {
                            if ( 'BFB30_sex_female' === name ) { self.surveySex( 'W' ); }
                            if ( 'BFB30_sex_male' === name ) { self.surveySex( 'M' ); }
                        }
                    }

                    switch( name ) {
                        case 'BFB30_Wiederholung':                  self.repeatedExam( val );                   break;
                        case 'BFB30_nicotineAbuse':                 self.nicotineAbuse( val );                  break;
                        case 'BFB30_adipositas':                    self.adipositas( val );                     break;
                        case 'BFB30_chronicEmotionalStressFactor':  self.chronicEmotionalStressFactor( val );   break;
                        case 'BFB30_alcoholAbuse':                  self.alcoholAbuse( val );                   break;
                        case 'BFB30_sedentaryLifestyle':            self.sedentaryLifestyle( val );             break;
                    }

                    //  History groups have values
                    //
                    //      0   - no personal or family history of disease
                    //      1   - personal history
                    //      2   - family history
                    //      3   - personal and family history

                    for ( i = 0; i < historyGroups.length; i++ ) {
                        if ( 'BFB30_' + historyGroups[i] + '_eigen' === name   ) {
                            temp = self[ historyGroups[i] ];
                            //  use '0' by default
                            if ( !temp() || '' === temp() ) { temp( '0' ); }

                            if ( true === val ) {
                                //  checking box
                                if ( '0' === temp() ) { temp( '1' ); }          //  only personal history
                                if ( '2' === temp() ) { temp( '3' ); }          //  personal and family history
                            } else {
                                //  unchecking box
                                if ( '1' === temp() ) { temp( '0' ); }          //  only personal history
                                if ( '3' === temp() ) { temp( '2' ); }          //  only family history
                            }
                        }
                        if ( 'BFB30_' + historyGroups[i] + '_fam' === name   ) {
                            temp = self[ historyGroups[i] ];
                            //  use '0' by default
                            if ( !temp() || '' === temp() ) { temp( '0' ); }

                            if ( true === val ) {
                                //  checking box
                                if ( '0' === temp() ) { temp( '2' ); }          //  only family history
                                if ( '1' === temp() ) { temp( '3' ); }          //  personal and family history
                            } else {
                                //  unchecking box
                                if ( '2' === temp() ) { temp( '0' ); }          //  only family history
                                if ( '3' === temp() ) { temp( '1' ); }          //  only personal history
                            }
                        }
                    }

                    //  TODO: follow up on semantics of this
                    if ( !self.requestId() ) {
                        self.requestId( '' );
                        // activity.requestId(Y.doccirrus.utils.generateLabRequestId());
                    }

                    self.updateBarcode( template );
                },
                updateBarcode: function( template ) {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentPatient = ko.unwrap( binder.currentPatient ),
                        context = {
                            'activity': self,
                            'patient': currentPatient
                        },
                        bcVal = Y.dcforms.mapper.objUtils.getBarcode( "barcode30", template.unmap(), {context: context} ),
                        bcElem = template.getBoundElement( 'barcode30' );

                    Y.log( 'New barcode value: ' + bcVal, 'debug', NAME);

                    if ( !bcElem || !bcElem.renderer || !bcElem.renderer.setValue ) {
                        Y.log( 'No bound barcode element for barcode30 mapping.', 'warn', NAME );
                        return;
                    }

                    bcElem.renderer.setValue( bcVal, onBcUpdate );

                    /* MOJ-8390 - standard mapping is causing an interaction with KO events and form redraw, just
                     * set value instead
                     * template.map( { 'barcode30': bcVal }, true, onBcUpdate );
                     */

                    function onBcUpdate( err ) {
                        if ( err ) {
                            Y.log( 'Problem mapping barcode 30: ' + JSON.stringify( err ), 'warn', NAME );
                        }
                        Y.log( 'Updated barcode for BFB30: ' + bcVal, 'debug', NAME );
                    }
                }
            },
            {
                schemaName: 'v_healthsurvey',
                NAME: 'HealthSurveyModel'
            }
        );
    
        Y.mix( HealthSurveyModel, mixin, false, Object.keys( mixin ), 4 );
        KoViewModel.registerConstructor( HealthSurveyModel );
        

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'FormBasedActivityModel',
            'v_healthsurvey-schema'
        ]
    }
)
;