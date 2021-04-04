/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, moment, ko */
YUI.add( 'KoDateRangeSelector', function( Y, NAME ) {
    'use strict';
    /**
     * @module KoDateRangeSelector
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        //peek = ko.utils.peekObservable,
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' );

    /**
     * __A dateSelector implementation.__
     * @class KoDateRangeSelector
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     * @example
     // markup: <div data-bind="template: aKoDateRangeSelector.template"></div>
     ko.applyBindings( {
         aKoDateRangeSelector: KoComponentManager.createComponent( {
             componentType: 'KoDateRangeSelector'} )
     }, node.getDOMNode() );
     */
    function KoDateRangeSelector() {
        KoDateRangeSelector.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoDateRangeSelector,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoDateRangeSelector',
            i18n: KoUI.i18n,
            init: function() {
                var self = this,
                    now = new Date(),
                    nowIso = now.toISOString();
                self.dateTimeFormat = 'DD.MM.YYYY';
                self.periodButtons = self.initPeriodButtons();
                self.periodList = self.getPeriodList();
                self.startDate = ko.observable(nowIso);
                self.endDate = ko.observable(nowIso);
                self.switchMode = ko.observable( self.initialConfig.switchMode || 'custom' );
                self.restrictMinYears = ko.observable( self.initialConfig.restrictMinYears );
                self.dateSelectorOptionsStart = {
                    format: ko.observable(self.dateTimeFormat),
                    sideBySide: true,
                    widgetPositioning: {
                        horizontal: 'left',
                        vertical: 'bottom'
                    },
                    extraFormats: ['YYYY-MM-DDTHH:mm:ss.SSS[Z]']
                };
                self.dateSelectorInitStart = function(picker) {
                    self.dateSelectorStart = picker;
                    var maxDate = self.startDate(),
                        restrictMinYears = self.restrictMinYears();
                    self.setMaxDate(maxDate);

                    if( restrictMinYears && 0 < restrictMinYears ) {
                        self.dateSelectorStart.minDate( moment().startOf( 'year' ).subtract( restrictMinYears, 'years' ) );
                    }
                };
                self.dateSelectorOptionsEnd = {
                    format: ko.observable(self.dateTimeFormat),
                    sideBySide: true,
                    widgetPositioning: {
                        horizontal: 'left',
                        vertical: 'bottom'
                    },
                    extraFormats: ['YYYY-MM-DDTHH:mm:ss.SSS[Z]']
                };
                self.dateSelectorInitEnd = function(picker) {
                    self.dateSelectorEnd = picker;
                    var minDate = self.endDate();
                    self.setMinDate(minDate);
                };

                self.dateSelect();

                self.addDisposable(ko.computed(function() {
                    var
                        start = ko.unwrap( self.startDate ),
                        end = ko.unwrap( self.endDate );
                    self.setMinDate( start );
                    self.setMaxDate( end );
                }));

                self.switchModeChange();

                KoDateRangeSelector.superclass.init.apply( self, arguments );
            },
            initPeriodButtons: function () {
                var self = this;

                var periodNextBtt = KoComponentManager.createComponent({
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'period-next',
                            text: '',
                            title: self.i18n('InSight2Mojit.timeSelector.period.NEXT_PERIOD'),
                            option: 'PRIMARY',
                            size: 'SMALL',
                            icon: 'CHEVRON_RIGHT',
                            disabled: false,
                            visible: true,
                            click: function() {
                                self.changePeriod('next');
                            }
                        }
                    }),
                    periodPrevBtt = KoComponentManager.createComponent({
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'period-prev',
                            text: '',
                            title: self.i18n('InSight2Mojit.timeSelector.period.PREVIOUS_PERIOD'),
                            option: 'PRIMARY',
                            size: 'SMALL',
                            icon: 'CHEVRON_LEFT',
                            disabled: false,
                            visible: true,
                            click: function() {
                                self.changePeriod('prev');
                            }
                        }
                    }),
                    periodTodayBtt = KoComponentManager.createComponent({
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'period-today',
                            text: '',
                            title: self.i18n('InSight2Mojit.timeSelector.period.TODAY'),
                            option: 'PRIMARY',
                            size: 'SMALL',
                            icon: 'CIRCLE_O',
                            disabled: false,
                            visible: true,
                            click: function() {
                                self.setDatesByPeriod();
                            }
                        }
                    });

                return {
                    nextBtt: periodNextBtt,
                    prevBtt: periodPrevBtt,
                    todayBtt: periodTodayBtt
                };
            },
            getPeriodList: function() {
                var self = this;
                return [
                    {
                        name: 'period-custom',
                        value: 'custom',
                        label: self.i18n('InSight2Mojit.timeSelector.period.CUSTOM')
                    },
                    {
                        name: 'period-day',
                        value: 'day',
                        label: self.i18n('InSight2Mojit.timeSelector.period.DAY')
                    },
                    {
                        name: 'period-week',
                        value: 'week',
                        label: self.i18n('InSight2Mojit.timeSelector.period.WEEK')
                    },
                    {
                        name: 'period-month',
                        value: 'month',
                        label: self.i18n('InSight2Mojit.timeSelector.period.MONTH')
                    },
                    {
                        name: 'period-quarter',
                        value: 'quarter',
                        label: self.i18n('InSight2Mojit.timeSelector.period.QUARTER')
                    },
                    {
                        name: 'period-year',
                        value: 'year',
                        label: self.i18n('InSight2Mojit.timeSelector.period.YEAR')
                    }
                ];
            },
            switchModeChange: function() {
                var self = this;

                if (self.switchMode() !== 'custom') {
                    self.setDatesByPeriod();
                }
            },
            changePeriod: function (direction) {

                var self = this,
                    switchMode = self.switchMode(),
                    start = moment(self.startDate()),
                    end = moment(self.endDate()),
                    newStartIso = null,
                    newEndIso = null,
                    diffDays;

                // custom mode
                if (switchMode === 'custom') {
                    diffDays = end.diff(start, 'days');
                    if( 0 === diffDays ) {
                        diffDays = 1;
                    }
                    if (direction === 'next') {
                        newStartIso = start.add(diffDays, 'days').toISOString();
                        newEndIso = end.add(diffDays, 'days').toISOString();
                    } else if (direction === 'prev') {
                        newEndIso = end.subtract(diffDays, 'days').toISOString();
                        newStartIso = start.subtract(diffDays, 'days').toISOString();
                    } else {
                        Y.log('ERR wrong direction for changePeriod method', 'warn', NAME );
                    }
                    self.setBothDates(newStartIso, newEndIso);

                } else {
                    if (direction === 'next') {
                        newStartIso = start.add(1, switchMode + 's').toISOString();
                        newEndIso = end.add(1, 'ms').add(1, switchMode + 's').subtract(1, 'ms').toISOString();
                    } else if (direction === 'prev') {
                        newStartIso = start.subtract(1, switchMode + 's').toISOString();
                        newEndIso = end.add(1, 'ms').subtract(1, switchMode + 's').subtract(1, 'ms').toISOString();
                    } else {
                        Y.log('ERR wrong direction for changePeriod method', 'warn', NAME );
                    }

                    self.setBothDates(newStartIso, newEndIso);
                }
            },
            setMaxDate: function(val) {
                var self = this,
                    newVal,
                    minDate;
                if (self.dateSelectorStart && self.dateSelectorStart.maxDate) {
                    newVal = val ? moment(val) : false;
                    minDate = self.dateSelectorStart.minDate();

                    if( minDate && moment( newVal ).isBefore( moment( minDate ).toDate() ) ) {
                        newVal = self.dateSelectorStart.minDate();
                    }
                    self.dateSelectorStart.maxDate(newVal);
                }
            },
            setMinDate: function(val) {
                var self = this,
                    newVal;
                if (self.dateSelectorEnd && self.dateSelectorEnd.minDate) {
                    newVal = val ? moment(val) : false;
                    self.dateSelectorEnd.minDate(newVal);
                }
            },
            setDatesByPeriod: function () {
                var self = this,
                    switchMode = self.switchMode(),
                    start, end, startIso, endIso;

                if (switchMode !== 'custom') {
                    start = moment().startOf(switchMode);
                    end = moment().startOf(switchMode).add(1, switchMode+'s').subtract(1, 'ms');
                    startIso = start.toISOString();
                    endIso = end.toISOString();

                    self.setBothDates(startIso, endIso);
                }
            },
            setBothDates: function (start, end) {
                var self = this;

                self.startDate(start);
                self.endDate(end);

                self.setMinDate(start);
                self.setMaxDate(end);
            },
            dateSelect: function() {
                return this.startDate();
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoDateRangeSelector' ) );
            }
        }
    } );
    /**
     * @property KoDateRangeSelector
     * @type {KoDateRangeSelector}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoDateRangeSelector );

}, '3.16.0', {
    requires: [
        'oop',
        'KoUI',
        'KoUI-utils-Function',
        'KoComponentManager',
        'KoComponent'
    ]
} );
