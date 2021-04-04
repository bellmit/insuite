/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment*/
YUI.add( 'DCMiniCalendarView', function( Y/*, NAME*/ ) {
    'use strict';

    /**
     * The DCMiniCalendarView module
     * @module DCMiniCalendarView
     */

    /**
     * @param {Object} parameters
     * @param {moment} parameters.moment moment to use as month
     * @constructor
     */
    function Month( parameters ) {
        var self = this,
            weeks = self.weeks = [],
            month = moment( parameters.moment ).date( 1 ) // start with first day in month
                .hour( 0 ).minute( 0 ).second( 0 ).millisecond( 0 ),
            firstDay = moment( month ).weekday( 0 ),
            lastDay = moment( month ).add( 1, 'month' ).subtract( 1, 'day' ).weekday( 6 );

        self.moment = month;

        while( firstDay.isBefore( lastDay ) || firstDay.isSame( lastDay ) ) {
            weeks.push( new Week( {
                moment: firstDay.weekday( 0 )
            } ) );
            firstDay.add( 1, 'week' );
        }

        // NOTE: [bug] moment('2016','YYYY').week(1).format('YYYY-MM-DD')
        // NOTE: [bug] moment('2016','YYYY').isoWeek(1).format('YYYY-MM-DD')

    }

    /** @protected */
    Month.prototype.constructor = Month;
    /**
     * @property moment
     * @type {null|moment}
     */
    Month.prototype.moment = null;
    /**
     * @property weeks
     * @type {null|Array[Week]}
     */
    Month.prototype.weeks = null;

    /**
     * @param {Object} parameters
     * @param {moment} parameters.moment moment to use as week
     * @constructor
     */
    function Week( parameters ) {
        var
            i,
            self = this,
            days = self.days = [],
            aMoment = moment( parameters.moment );

        self.moment = moment( aMoment );

        for( i = 0; i < 7; i++ ) {
            days.push( new Day( {
                moment: aMoment.weekday( i )
            } ) );
        }

    }

    /** @protected */
    Week.prototype.constructor = Week;
    /**
     * @property moment
     * @type {null|moment}
     */
    Week.prototype.moment = null;
    /**
     * @property days
     * @type {null|Array[Day]}
     */
    Week.prototype.days = null;

    /**
     * @param {Object} parameters
     * @param {moment} parameters.moment moment to use as day
     * @constructor
     */
    function Day( parameters ) {
        var
            self = this,
            aMoment = moment( parameters.moment );

        self.moment = moment( aMoment );

        self.weekend = (6 === aMoment.isoWeekday() || 7 === aMoment.isoWeekday());
    }

    /** @protected */
    Day.prototype.constructor = Day;
    /**
     * @property moment
     * @type {null|moment}
     */
    Day.prototype.moment = null;
    /**
     * @property weekend
     * @type {null|Boolean}
     */
    Day.prototype.weekend = null;

    /**
     * Binding model for a mini calendar view
     * @class DCMiniCalendarView
     * @param {Object} [parameters]
     * @param {Object} [parameters.moment] a "moment" instance - if omitted defaults to a current "moment"
     * @constructor
     */
    function DCMiniCalendarView( parameters ) {

        parameters = parameters || {};

        var
            self = this,
            momentLocale = moment.localeData();

        self._month = ko.observable();
        self.setMoment( parameters.moment );

        self.header = {
            label: ko.computed( function() {
                return ko.unwrap( self._month ).moment.format( 'MMMM YYYY' );
            } ),
            cols: [
                {
                    text: 'KW',
                    colCss: {
                        'DCMiniCalendarView-col-week': true
                    }
                }
            ].concat( momentLocale._weekdaysMin.map( function( e, i, a ) {
                return {
                    text: a[(i + momentLocale._week.dow) % 7],
                    colCss: {
                        'DCMiniCalendarView-col-day': true
                    }
                };
            } ) ),
            isodate: ko.computed( function() {
                return ko.unwrap( self._month ).moment.toISOString();
            } )
        };
        self.rows = {
            items: ko.computed( function() {
                var
                    _month = ko.unwrap( self._month ),
                    currentMonth = _month.moment.month(),
                    todayMoment = moment().hour( 0 ).minute( 0 ).second( 0 ).millisecond( 0 );

                return _month.weeks.map( function( week ) {
                    return [
                        {
                            colCss: {
                                'DCMiniCalendarView-cell-week': true
                            },
                            text: week.moment.format( 'ww' ),
                            buttonCss: {
                                'btn-default': true,
                                'DCMiniCalendarView-button-week': true
                            },
                            textCss: {
                                'text-info': true
                            },
                            data: week,
                            name: 'button-week',
                            isodate: week.moment.toISOString()
                        }].concat( week.days.map( function( day ) {

                        var
                            dayIsToday = day.moment.isSame( todayMoment );

                        return {
                            colCss: {
                                'DCMiniCalendarView-cell-day': true
                            },
                            text: day.moment.date(),
                            buttonCss: {
                                'btn-default': !dayIsToday,
                                'btn-primary': dayIsToday,
                                'DCMiniCalendarView-button-day': true
                            },
                            textCss: {
                                'text-muted': day.moment.month() !== currentMonth
                            },
                            data: day,
                            name: 'button-day',
                            isodate: day.moment.toISOString()
                        };
                    } ) );
                } );
            } )
        };
    }

    DCMiniCalendarView.currentFocusIndex = -1;

    /** @protected */
    DCMiniCalendarView.prototype.constructor = DCMiniCalendarView;
    /**
     * Sets a new "moment" to use
     * @method setMoment
     * @param aMoment
     */
    DCMiniCalendarView.prototype.setMoment = function( aMoment ) {
        var
            self = this;

        self._month( new Month( {
            moment: aMoment
        } ) );
    };
    /** @protected */
    DCMiniCalendarView.prototype._onClick = function( m, ev ) {
        var
            self = this,
            button = Y.Node( ev.target ).ancestor( 'button', true );

        if( !button ) {
            return;
        }

        if( button.hasClass( 'DCMiniCalendarView-button-month' ) ) {
            self.onMonthClick.apply( self, [moment( self._month.peek().moment ), ev] );
        }
        if( button.hasClass( 'DCMiniCalendarView-button-week' ) ) {
            self.onWeekClick.apply( self, [moment( ko.dataFor( button.getDOMNode() ).data.moment ), ev] );
        }
        if( button.hasClass( 'DCMiniCalendarView-button-day' ) ) {
            self.onDayClick.apply( self, [moment( ko.dataFor( button.getDOMNode() ).data.moment ), ev] );
            DCMiniCalendarView.highlightActiveDay( button );
        }
    };

    /**
     *  Build an array of all calendar days buttons on the page
     *  allowing next to iterate and focus on them in correct order.
     *
     *  @function fillButtons
     *  @memberOf DCMiniCalendarView
     *  @static
     */
    DCMiniCalendarView.fillButtons = function() {
        this.buttons = document.querySelectorAll( '.DCMiniCalendarView-button-day' );
        if( this.currentFocusIndex === -1 ) {
            this.buttons.forEach( function( btn, i ) {
                if( btn.classList.contains( 'btn-primary' ) ) {
                    this.currentFocusIndex = i;
                }
            }, this );
        }

        if( this.currentFocusIndex === -1 ) {
            this.currentFocusIndex = 0;
        }
    };

    /**
     * Highlights the button with .active class
     * @function highlightActiveDay
     * @param {Y.Node} target - Button to highlight
     * @static
     */
    DCMiniCalendarView.highlightActiveDay = function( target ) {
        this.buttons = document.querySelectorAll( '.DCMiniCalendarView-button-day' );
        if( this.buttons ) {
            this.buttons.forEach( function( btn ) {
                btn.classList.remove( 'active' );
                btn.classList.remove( 'selected-btn' );
            } );
            target.addClass( 'selected-btn' );
        }
    };

    /**
     *  @function fillButtons
     *  @memberOf DCMiniCalendarView
     *  @static
     */
    DCMiniCalendarView.focusNext = function() {

        if( this.currentFocusIndex === -1 ) {
            this.fillButtons();
        }

        if( this.currentFocusIndex + 1 < this.buttons.length ) {
            this.buttons[++this.currentFocusIndex].focus();
        }
    };

    /**
     *  @function fillButtons
     *  @memberOf DCMiniCalendarView
     *  @static
     */
    DCMiniCalendarView.focusDown = function() {

        if( this.currentFocusIndex === -1 ) {
            this.fillButtons();
        }

        if( this.currentFocusIndex + 7 < this.buttons.length ) {
            this.buttons[this.currentFocusIndex += 7].focus();
        }
    };

    /**
     *  @function fillButtons
     *  @memberOf DCMiniCalendarView
     *  @static
     */
    DCMiniCalendarView.focusUp = function() {

        if( this.currentFocusIndex === -1 ) {
            this.fillButtons();
        }

        if( this.currentFocusIndex - 7 >= 0 ) {
            this.buttons[this.currentFocusIndex -= 7].focus();
        }
    };

    /**
     *  @function fillButtons
     *  @memberOf DCMiniCalendarView
     *  @static
     */
    DCMiniCalendarView.focusPrev = function() {

        if( this.currentFocusIndex === -1 ) {
            this.fillButtons();
        }

        if( this.currentFocusIndex - 1 >= 0 ) {
            this.buttons[--this.currentFocusIndex].focus();
        }
    };

    /**
     * Set a "onMonthClick" to intercept month clicks
     * @method onMonthClick
     * @param moment The "moment" of the clicked month
     * @param event
     */
    DCMiniCalendarView.prototype.onMonthClick = function( /*mom*/ ) {
    };
    /**
     * Set a "onWeekClick" to intercept week clicks
     * @method onWeekClick
     * @param moment The "moment" of the clicked week
     * @param event
     */
    DCMiniCalendarView.prototype.onWeekClick = function( /*mom*/ ) {
    };
    /**
     * Set a "onDayClick" to intercept day clicks
     * @method onDayClick
     * @param moment The "moment" of the clicked day
     * @param event
     */
    DCMiniCalendarView.prototype.onDayClick = function( /*mom*/ ) {
    };

    /**
     * @property DCMiniCalendarView
     * @for doccirrus
     * @type {DCMiniCalendarView}
     */
    Y.doccirrus.DCMiniCalendarView = DCMiniCalendarView;

}, '0.0.1', {
    requires: [
        'doccirrus'
    ]
} );
