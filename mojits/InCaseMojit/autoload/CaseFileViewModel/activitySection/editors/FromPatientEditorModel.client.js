/**
 * User: pi
 * Date: 11/12/15  10:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'FromPatientEditorModel', function( Y ) {
        /**
         * @module FromPatientEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            BREAKFAST = i18n( 'general.text.BREAKFAST' ),
            LUNCH = i18n( 'general.text.LUNCH' ),
            DINNER = i18n( 'general.text.DINNER' ),
            TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),
            CALORIES = i18n( 'general.text.CALORIES' ),
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' );

        /**
         * @class FromPatientEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function FromPatientEditorModel( config ) {
            FromPatientEditorModel.superclass.constructor.call( this, config );
        }

        FromPatientEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'userContent',
                    'd_extra',
                    'subType'
                ],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( FromPatientEditorModel, ActivityEditorModel, {
                /**
                 * Enables "caretPosition" for "userContent"
                 * @protected
                 * @property useUserContentCaretPosition
                 * @type {Boolean}
                 * @default true
                 */
                useUserContentCaretPosition: true,
                initializer: function FromPatientEditorModel_initializer() {
                    var
                        self = this;
                    self.initFromPatientEditorModel();
                },
                destructor: function FromPatientEditorModel_destructor() {
                },
                initFromPatientEditorModel: function FromPatientEditorModel_initFromPatientEditorModel() {
                    var self = this;
                    self.mealI18n = i18n( 'PatPortalMojit.jawboneAPI.title.MEAL' );
                    self.getCaloriesSumI18n = i18n( 'InCaseMojit.casefile_detail.title.GET_CALORIES_SUM' );
                    self.caloriesI18n = i18n( 'general.text.CALORIES' );
                    self.moveI18n = i18n( 'PatPortalMojit.jawboneAPI.title.MOVE' );
                    self.activeI18n = i18n( 'InCaseMojit.casefile_detail.title.ACTIVE' );
                    self.inactiveI18n = i18n( 'InCaseMojit.casefile_detail.title.INACTIVE' );
                    self.burnedCaloriesSumI18n = i18n( 'InCaseMojit.casefile_detail.title.BURNED_CALORIES_SUM' );
                    self.workoutI18n = i18n( 'PatPortalMojit.jawboneAPI.title.WORKOUT' );
                    self.stepsI18n = i18n( 'InCaseMojit.casefile_detail.title.STEPS' );
                    self.sleepI18n = i18n( 'PatPortalMojit.jawboneAPI.title.SLEEP' );
                    self.deepSleepI18n = i18n( 'InCaseMojit.casefile_detail.title.DEEP_SLEEP' );
                    self.lightSleepI18n = i18n( 'InCaseMojit.casefile_detail.title.LIGHT_SLEEP' );
                    self.awakeTimeI18n = i18n( 'InCaseMojit.casefile_detail.title.AWAKE_TIME' );
                    self.awakeTimesI18n = i18n( 'InCaseMojit.casefile_detail.title.AWAKE_TIMES' );
                    self.heartRateI18n = i18n( 'PatPortalMojit.jawboneAPI.title.HEART_RATE' );
                    self.weightI18n = i18n( 'PatPortalMojit.jawboneAPI.title.WEIGHT' );
                    self.kilogramI18n = i18n( 'general.text.KILOGRAM' );
                },
                secondsToHours: function( seconds ) {
                    var duration = moment.duration( seconds, 's' );
                    return duration.hours() + ':' + duration.minutes();
                },
                unixDateToHumanTime: function( unixTime, format ) {
                    return Y.doccirrus.comctl.unixDateToHumanTime( unixTime, format );
                },
                unixDateToHumanDate: function( unixTime, long ) {
                    return Y.doccirrus.comctl.unixDateToHumanDate( unixTime, long );
                },
                countMealCalories: function( meals ) {
                    var result = 0;
                    meals.forEach( function( meal ) {
                        result += meal.details.calories || 0;
                    } );
                    return result;
                },
                round: function( num ) {
                    return Math.round( num );
                },
                countMoveCalories: function( move ) {
                    var result = 0;
                    result += (move.details.calories || 0) + (move.details.bmr || 0);
                    return Math.round( result );
                },
                countWorkoutCalories: function( workout ) {
                    var result = 0;
                    result += (workout.details.calories || 0) + (workout.details.bmr || 0);
                    return Math.round( result );
                },
                getWorkoutTitle: function( workout ) {
                    // can also use sub_type and mapp value if another translation is needed.
                    return workout.title;
                },
                roundWeight: function( num ) {
                    return Math.floor( num * 10 ) / 10;
                },
                getStepsCalories: function() {
                    var
                        self = this,
                        result,
                        d_extra = ko.utils.peekObservable( self.d_extra );
                    result = (d_extra.move && d_extra.move.details.calories) || 0;
                    if( d_extra.workout && d_extra.workout.items ) {
                        d_extra.workout.items.forEach( function( workout ) {
                            result -= self._countWorkoutCalories( workout );
                        } );
                    }
                    return Math.round( result );
                },
                displayMealCalories: function( meal ) {
                    return (meal.details.calories || 0) + ' ' + CALORIES;
                },
                displayMeal: function( meal ) {
                    var result,
                        subType = {
                            1: BREAKFAST,
                            2: LUNCH,
                            3: DINNER
                        };
                    result = moment.unix( meal.time_completed ).format( TIME_FORMAT ) +
                             ' ' + ( subType[meal.sub_type] ? subType[meal.sub_type] + ': ' : '') +
                             meal.title;
                    return result;
                }

            }, {
                NAME: 'FromPatientEditorModel'
            }
        );

        KoViewModel.registerConstructor( FromPatientEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'dc-comctl'
        ]
    }
);
