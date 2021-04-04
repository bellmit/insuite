/**
 * User: strix
 * Date: 06/02/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, moment, ko */

'use strict';

YUI.add( 'CheckupPlanModel', function( Y ) {

        /**
         * @module CheckupPlanModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityModel = KoViewModel.getConstructor( 'SimpleActivityModel' ),
            mixin = Y.doccirrus.api.activity.getFormBasedActivityAPI(),
            //peek = ko.utils.peekObservable,
            unwrap = ko.unwrap;

        /**
         * @class CheckupPlanItemModel
         * @constructor
         * @param {Object} config
         * @extends KoViewModel
         */

        function CheckupPlanItemModel( config ) {
            CheckupPlanItemModel.superclass.constructor.call( this, config );
        }

        CheckupPlanItemModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( CheckupPlanItemModel, KoViewModel.getBase(), {

                initializer: function CheckupPlanItemModel_initializer() {
                    var
                        self = this;
                    self.initCheckupPlanItemModel();
                },
                destructor: function CheckupPlanItemModel_destructor() {
                },
                initCheckupPlanItemModel: function CheckupPlanItemModel_initCheckupPlanItemModel() {
                }
            },
            {
                schemaName: 'v_checkupplan.examinations',
                NAME: 'CheckupPlanItemModel'
            }
        );
        KoViewModel.registerConstructor( CheckupPlanItemModel );

        /**
         * @class CheckupPlanModel
         * @constructor
         * @extends SimpleActivityModel
         */
        function CheckupPlanModel( config ) {
            CheckupPlanModel.superclass.constructor.call( this, config );
        }

        CheckupPlanModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( CheckupPlanModel, SimpleActivityModel, {

                //  date ranges from KBV:
                //  see: https://www.kvberlin.de/20praxis/70themen/vorsorge_frueherkennung/zeitplan_kinder.pdf

                //  additional checkups offered in private practice: U10, U11, J2
                //  see: https://www.tk.de/techniker/service/gesundheit-und-medizin/praevention-und-frueherkennung/frueherkennung-fuer-kinder-und-jugendliche/wann-sollten-kinder-und-jugendliche-zu-welcher-untersuchung-2010186

                _defaultEntries: [
                    { 'stage': 'U1', 'plannedFrom': 1, 'plannedTo': 1, 'toleranceFrom': 1, 'toleranceTo': 1, 'unit': 'days' },
                    { 'stage': 'U2', 'plannedFrom': 3, 'plannedTo': 10, 'toleranceFrom': 3, 'toleranceTo': 14, 'unit': 'days' },
                    { 'stage': 'U3', 'plannedFrom': 22, 'plannedTo': 35, 'toleranceFrom': 15, 'toleranceTo': 56, 'unit': 'days' },
                    { 'stage': 'U4', 'plannedFrom': 3, 'plannedTo': 5, 'toleranceFrom': 2, 'toleranceTo': 5, 'unit': 'months' },
                    { 'stage': 'U5', 'plannedFrom': 6, 'plannedTo': 8, 'toleranceFrom': 5, 'toleranceTo': 9, 'unit': 'months'  },
                    { 'stage': 'U6', 'plannedFrom': 10, 'plannedTo': 13, 'toleranceFrom': 9, 'toleranceTo': 15, 'unit': 'months' },
                    { 'stage': 'U7', 'plannedFrom': 21, 'plannedTo': 25, 'toleranceFrom': 20, 'toleranceTo': 28, 'unit': 'months' },
                    { 'stage': 'U7a', 'plannedFrom': 34, 'plannedTo': 37, 'toleranceFrom': 33, 'toleranceTo': 39, 'unit': 'months' },
                    { 'stage': 'U8', 'plannedFrom': 46, 'plannedTo': 49, 'toleranceFrom': 43, 'toleranceTo': 51, 'unit': 'months' },
                    { 'stage': 'U9', 'plannedFrom': 60, 'plannedTo': 65, 'toleranceFrom': 58, 'toleranceTo': 67, 'unit': 'months' },

                    { 'stage': 'U10', 'plannedFrom': 8, 'plannedTo': 9, 'toleranceFrom': 8, 'toleranceTo': 9, 'unit': 'years', 'plus364': true },
                    { 'stage': 'U11', 'plannedFrom': 10, 'plannedTo': 11, 'toleranceFrom': 10, 'toleranceTo': 11 , 'unit': 'years', 'plus364': true },

                    { 'stage': 'J1', 'plannedFrom': 13, 'plannedTo': 15, 'toleranceFrom': 13, 'toleranceTo': 15, 'unit': 'years', 'plus364': true },
                    { 'stage': 'J2', 'plannedFrom': 17, 'plannedTo': 18, 'toleranceFrom': 17, 'toleranceTo': 18, 'unit': 'years', 'plus364': true }
                ],

                listenForCurrentPatient: null,

                initializer: function CheckupPlanModel_initializer() {
                    var self = this;
                    if( self.initFormBasedActivityAPI ) { self.initFormBasedActivityAPI(); }

                    self.initCheckupPlanModel();
                },
                destructor: function CheckupPlanModel_destructor() { },
                initCheckupPlanModel: function CheckupPlanModel_initCheckupPlanModel() {
                    //var self = this;
                },

                /**
                 *  Add a default examination schedule for an infant, based on date of birth
                 *
                 *  @param  {String}    dateOfBirth     String, date or moment object
                 */

                createDefaultEntries: function( dateOfBirth ) {
                    var
                        self = this,
                        timestamp = moment( unwrap( self.timestamp ) ).startOf( 'day' ),
                        exams = unwrap( self.examinations || [] ),
                        knownEntries = {},
                        i, entry, exam, addExam;

                    //  read entries into object
                    for ( i = 0; i < exams.length; i++ ) {
                        if ( exams[i].completed && unwrap( exams[i].completed ) ) {
                            knownEntries[ unwrap( exams[i].stage ) ] = unwrap( exams[i].completed );
                        }
                    }

                    //  clear existing set of examinations
                    self.examinations( [] );

                    function getDobPlus( adjustBy, unit ) {
                        //  The day-of-life (lebenstag), month-of-life (lebenstag), etc are counted from one, so the
                        //  first day of life is when the patient is born, to calculate the second day-of-life we add
                        //  one day to the birth date, fourth day-of-life add three days, etc.
                        return moment( dateOfBirth ).startOf( 'day' ).add( adjustBy - 1, unit ).format();
                    }

                    function getDobPlus364( adjustBy, unit ) {
                        //  As above, with an extra 364 days
                        return moment( dateOfBirth ).startOf( 'day' ).add( adjustBy - 1, unit ).add( 1, 'year' ).subtract( 1, 'day' ).format();
                    }

                    for ( i = 0; i < self._defaultEntries.length; i++ ) {
                        entry = self._defaultEntries[i];
                        addExam = true;

                        exam = {
                            'stage': entry.stage,
                            'plannedFrom': getDobPlus( entry.plannedFrom, entry.unit ),
                            'plannedTo': getDobPlus( entry.plannedTo, entry.unit ),
                            'toleranceFrom': getDobPlus( entry.toleranceFrom, entry.unit ),
                            'toleranceTo': getDobPlus( entry.toleranceTo, entry.unit )
                        };

                        //  fix for adding half month to U4 tolerance, MOJ-10602
                        if ( 'U4' === entry.stage ) {
                            exam.toleranceTo = moment( exam.toleranceTo ).add( 2, 'weeks' ).format();
                        }

                        //  special logic for tolerance range on years, MOJ-12686, plannedTo and toleranceTo should be a
                        //  year minus a day, ie, until the day before the patient's next birthday
                        if ( entry.plus364 ) {
                            exam.plannedTo = getDobPlus364( entry.plannedTo, entry.unit );
                            exam.toleranceTo = getDobPlus364( entry.toleranceTo, entry.unit );
                        }

                        //  if this activity was created after the tolerance range, do not add it to the plan
                        if ( moment( timestamp ).isAfter( moment( exam.toleranceTo ) ) ) {
                            //  activity was created after stage / age range when thi exam can be performed
                            //  do not schedule it
                            addExam = false;
                        }

                        //  if we have a known checkup date then keep it (used when regenerating the schedule)
                        if ( knownEntries && knownEntries.hasOwnProperty( exam.stage) ) {
                            exam.completed = knownEntries[ exam.stage ];
                            addExam = true;
                        }

                        if ( addExam ) {
                            self.addCheckupPlanItem( exam );
                        }
                    }
                },

                addCheckupPlanItem: function( data ) {
                    var self = this;
                    self.examinations.push( data );
                },
                removeCheckupPlanItem: function( data ) {
                    var self = this;
                    self.examinations.remove( data );
                }
            },
            {
                schemaName: 'v_checkupplan',
                NAME: 'CheckupPlanModel'
            }
        );

        Y.mix( CheckupPlanModel, mixin, false, Object.keys( mixin ), 4 );

        KoViewModel.registerConstructor( CheckupPlanModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityModel',
            'v_simple_activity-schema',
            'v_checkupplan-schema',
            'activity-api'
        ]
    }
);