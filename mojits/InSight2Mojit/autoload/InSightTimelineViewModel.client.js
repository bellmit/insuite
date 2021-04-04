/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, d3, nv, $ */
/*eslint-disable no-inner-declarations */
YUI.add( 'InSightTimelineViewModel', function(Y, NAME) {
    'use strict';

    var KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n;

    /**
     * @constructor
     * @class InSightTimelineViewModel
     */
    function InSightTimelineViewModel() {
        InSightTimelineViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSightTimelineViewModel, KoViewModel.getDisposable(), {
        /**
         * Defines template name to look up
         * @property templateName
         * @type {String}
         */
        templateName: 'InSightTimelineViewModel',
        /** @protected */
        initializer: function(config) {
            var self = this;
            self.initInSightTimelineViewModel(config);
            self.initTemplate();
            self.timeSelectorStartI18n = i18n('InSight2Mojit.timeSelector.customMode.START');
            self.timeSelectorEndI18n = i18n('InSight2Mojit.timeSelector.customMode.END');
            self.applyChangesI18n = i18n('InSight2Mojit.timeSelector.applyChanges');
        },
        /** @protected */
        destructor: function() {
        },
        /** @protected */
        initInSightTimelineViewModel: function(config) {
            var self = this;

            self.config = config;

            self.dateTimeFormat = 'DD.MM.YYYY';

            self.periodButtons = self.initPeriodButtons();
            self.dateSelectorHelperData = self.initDateSelectorHelperData();

            self.apiName = config.apiName || 'reporting';
            self.method = config.method || 'aggregate';
            self.totalCountBack = config.totalCountBack;
            self.partnersBack = config.partnersBack;
            self.useCache = config.useCache || ko.observable( false );
            self.patient = config.patient || ko.observable( false );
            self.selectedPartners = config.selectedPartners || ko.observableArray( [] );

            self.timelineElements = {
                chart: null,
                chartData: null,
                brush: null,
                brushData: {}
            };

            self.dateSelectorStart = null;
            self.dateSelectorInitStart = function(picker) {
                self.dateSelectorStart = picker;
                var maxDate = self.dateSelectorHelperData.pickerEndDate();
                self.setMaxDate(maxDate);
            };
            self.dateSelectorOptionsStart = {
                format: ko.observable(self.dateTimeFormat),
                sideBySide: true,
                widgetPositioning: {
                    horizontal: 'left',
                    vertical: 'bottom'
                },
                extraFormats: ['YYYY-MM-DDTHH:mm:ss.SSS[Z]'],
                minDate: '1970-01-01',
                maxDate: '2100-01-01'
            };

            self.dateSelectorEnd = null;
            self.dateSelectorInitEnd = function(picker) {
                self.dateSelectorEnd = picker;
                var minDate = self.dateSelectorHelperData.pickerStartDate();
                self.setMinDate(minDate);
            };
            self.dateSelectorOptionsEnd = {
                format: ko.observable(self.dateTimeFormat),
                sideBySide: true,
                widgetPositioning: {
                    horizontal: 'left',
                    vertical: 'bottom'
                },
                extraFormats: ['YYYY-MM-DDTHH:mm:ss.SSS[Z]'],
                minDate: '1970-01-01',
                maxDate: '2100-01-01'
            };

            self.setMinDate = function(val) {
                if (self.dateSelectorEnd && self.dateSelectorEnd.minDate) {
                    var newVal = val ? moment(val) : false;
                    self.dateSelectorEnd.minDate(newVal);
                }
            };
            self.setMaxDate = function(val) {
                if (self.dateSelectorStart && self.dateSelectorStart.maxDate) {
                    var newVal = val ? moment(val) : false;
                    self.dateSelectorStart.maxDate(newVal);
                }
            };

            self.dateManager = self.initDateManager();
            self.timelineData = ko.observableArray();

            self.periodList = self.getPeriodList();

            if (self.config.restored) {
                //self.dateManager.setSwitchMode(self.config.switchMode);
                self.setBothDates(self.config.startDate(), self.config.endDate());
                self.updateTimelineChart();
            } else {
                self.dateManager.setDatesByPeriod();
            }

            self.setSubscriptions();

            self.initTimelineBinding();

            self.datesNotChanged = ko.observable( true );
        },

        setSubscriptions: function() {
            var self = this;

            self.dateSelectorHelperData.pickerStartDate.subscribe(function (newVal) {
                if (newVal) {
                    var tlStart = moment(self.dateSelectorHelperData.tlStartDate()),
                        pickerStart = moment(newVal),
                        diff = tlStart.diff(pickerStart);

                    self.setMinDate(newVal);

                    if (diff !== 0) {
                        self.dateSelectorHelperData.tlStartDate(newVal);
                    }
                }

                self.datesNotChanged( self.config.actualData && self.config.actualData.startDate() === ko.unwrap( self.config.startDate ) && self.config.actualData.endDate() === ko.unwrap( self.config.endDate ) );
            });

            self.useCache.subscribe(function (){
                self.updateTimelineChart();
                self.externalOnDateChange();
            });
            self.patient.subscribe(function (){ return self.updateTimelineChart(); });
            self.selectedPartners.subscribe(function (){
                self.updateTimelineChart();
                self.externalOnDateChange();
            });
            self.dateSelectorHelperData.pickerEndDate.subscribe(function (newVal) {
                if (newVal) {
                    var tlEnd = moment( self.dateSelectorHelperData.tlEndDate() ),
                        pickerEnd = moment( newVal ),
                        diff = tlEnd.diff( pickerEnd );

                    self.setMaxDate(newVal);

                    if( diff !== 0 ) {
                        var newDate = moment( newVal );
                        newDate.endOf( 'day' );
                        self.dateSelectorHelperData.tlEndDate( newDate.toISOString() );
                    }
                }

                self.datesNotChanged( self.config.actualData && self.config.actualData.startDate() === ko.unwrap( self.config.startDate ) && self.config.actualData.endDate() === ko.unwrap( self.config.endDate ) );
            });

            self.dateSelectorHelperData.tlStartDate.subscribe(function (newVal) {
                if (newVal) {
                    var start = moment(self.config.startDate() ),
                        tlStart = moment(newVal);

                    if (start.diff(tlStart) !== 0) {
                        self.config.switchMode('custom');
                        self.config.startDate(newVal);
                        self.updateTimelineChart();
                        self.externalOnDateChange();
                    }

                }
            });
            self.dateSelectorHelperData.tlEndDate.subscribe(function (newVal) {
                if (newVal) {
                    var end = moment(self.config.endDate() ),
                        tlEnd = moment(newVal);

                    if (end.diff(tlEnd) !== 0) {
                        self.config.switchMode('custom');
                        self.config.endDate(newVal);
                        self.updateTimelineChart();
                        self.externalOnDateChange();
                    }

                }
            });
        },

        getPeriodList: function() {
            return [
                {
                    name: 'period-custom',
                    value: 'custom',
                    label: i18n('InSight2Mojit.timeSelector.period.CUSTOM')
                },
                {
                    name: 'period-day',
                    value: 'day',
                    label: i18n('InSight2Mojit.timeSelector.period.DAY')
                },
                {
                    name: 'period-week',
                    value: 'week',
                    label: i18n('InSight2Mojit.timeSelector.period.WEEK')
                },
                {
                    name: 'period-month',
                    value: 'month',
                    label: i18n('InSight2Mojit.timeSelector.period.MONTH')
                },
                {
                    name: 'period-quarter',
                    value: 'quarter',
                    label: i18n('InSight2Mojit.timeSelector.period.QUARTER')
                },
                {
                    name: 'period-year',
                    value: 'year',
                    label: i18n('InSight2Mojit.timeSelector.period.YEAR')
                }
            ];
        },

        switchModeChange: function() {
            var self = this;

            if (this.config.switchMode() !== 'custom') {
                self.dateManager.setDatesByPeriod();
            }
        },

        setBothDates: function (start, end) {
            var helperData = this.dateSelectorHelperData,
                data = this.config;

            this.setMaxDate(false);
            this.setMinDate(false);

            // do NOT change order
            data.startDate(start);
            data.endDate(end);
            helperData.tlStartDate(start);
            helperData.tlEndDate(end);
            helperData.pickerStartDate(start);
            helperData.pickerEndDate(end);

            this.setMinDate(start);
            this.setMaxDate(end);
        },

        externalOnDateChange: function(  ) {
            if (this.config.onDateChange && typeof this.config.onDateChange === 'function') {
                this.config.onDateChange({
                    startDate: this.config.startDate(),
                    endDate: this.config.endDate(),
                    switchMode: this.config.switchMode()
                });
            }
        },

        initTimelineBinding: function () {
            var self = this;

            ko.bindingHandlers.inSightTimeline = {
                init: tlInit
            };

            // ---

            function tlInit(element) {

                self.fetchDataForTimeline().then(function (response) {
                    var finalData = self.prepareDataForTimeline(response.data),
                        timelineElement = $(element).children('svg')[0];

                    self.timelineData(response.data);
                    self.initTimelineChart(timelineElement, finalData);
                });

            }

        },

        updateBrushPosition: function (start, end) {
            this.timelineElements.brush.extent([new Date(start), new Date(end)]);
            this.timelineElements.brush(d3.select(".brush").transition());
        },
        updateBrushX: function (start, end) {
            this.timelineElements.brushData.domainStart = start;
            this.timelineElements.brushData.domainEnd = end;

            var timelineWrapper = $('#timelineChart'),
                brushXScale = d3.time.scale.utc()
                    .domain([start, end])
                    .range([0, timelineWrapper.width()-60]);

            var selectBrush = d3.select(".brush");

            if (selectBrush.empty()) {
                this.createBrush({
                    minDate: start,
                    maxDate: end
                });
            } else {
                this.timelineElements.brush.x(brushXScale);
                this.timelineElements.brush.extent([start, end]);
                this.timelineElements.brush(d3.select(".brush").transition());
            }

        },
        updateTimelineChart: function () {
            var self = this;

            if (self.timelineElements.chart && self.timelineElements.chartData) {
                self.fetchDataForTimeline().then(function (response) {
                    self.timelineData(response.data);
                    self.updateTimelineChartBars();
                });
            }
        },
        updateTimelineChartBars: function () {
            var self = this,
                unwrappedData = ko.unwrap(self.timelineData),
                finalData = self.prepareDataForTimeline(unwrappedData);

            self.timelineElements.chartData
                .datum([{
                    key: 'test',
                    values: finalData.result
                }])
                .transition()
                .duration(500)
                .call(self.timelineElements.chart);

            self.updateBrushX(finalData.minDate, finalData.maxDate);
        },
        getTicks: function ( startDate, endDate, count ) {
            var switchMode = this.config.switchMode(),
                minDate = new Date( startDate ),
                maxDate = new Date( endDate ),
                ticks = [],
                step,
                len;

            if( switchMode === 'quarter' ) {
                ticks = d3.time.monday.range( minDate, maxDate, 1 );
            } else if( switchMode === 'year' ) {
                ticks = d3.time.month.range( minDate, maxDate, 1 );
            } else {
                ticks = d3.time.day.range( minDate, maxDate, 1 );
            }
            //for $bucket boundaries at least 2 values in ascending order is required
            if( !ticks.length ){
                ticks = [minDate, maxDate];
            } else if( ticks.length === 1){
                //special case fo1 1 day
                ticks.push( moment(ticks[0]).add( 1, 'day' ).toDate() );
            } else if( ticks.length > count ){
                step = Math.ceil( (ticks.length - 2)/count ) || 1;
                len = ticks.length;
                ticks = ticks.filter( function(el, ind) {
                    return ( ind === 0 || ind === len || ind%step === 0 );
                } );
            }
            return ticks.map( function( dt ){
                var datePartOnly = dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2);
                return moment.utc( datePartOnly ).toISOString();
            });
        },
        fetchDataForTimeline: function () {
            var self = this;

            self.dateManager.busy = true;

            //  manually disable timeline plot (resource issues)
            //self.dateManager.busy = false;
            //return Promise.resolve( { data: [] } );

            return Y.doccirrus.jsonrpc.api[self.apiName][self.method]({
                noBlocking: true,
                dates: {
                    startDate: self.dateSelectorHelperData.tlStartDate(),
                    endDate: self.dateSelectorHelperData.tlEndDate()
                },
                patientId: ko.unwrap(self.patient),
                useCache: self.useCache(),
                selectedPartners: self.selectedPartners(),
                orgDisplayFields: [ '_id' ],
                pipeline: [
                    {$bucket: {
                            groupBy: '$dateNormal',
                            boundaries: self.getTicks( self.dateSelectorHelperData.tlStartDate(), self.dateSelectorHelperData.tlEndDate(), 50 ),
                            output: {"count":{"$sum":1}},
                            default: 0
                        }}
                ]
            }).then(function (res) {

                self.dateManager.busy = false;
                var total = 0;

                if(!res || !res.data){
                    return res;
                }

                var
                    ticks = res.data.filter( function(el){ return !el.countsByPartner; }),
                    counts = res.data.find( function(el){ return el.countsByPartner; } );

                if( self.totalCountBack && typeof self.totalCountBack === 'function' ){
                    (ticks || []).forEach( function(tick){
                        total += tick.count;
                    });
                    self.totalCountBack( total );
                }
                if( self.partnersBack && typeof self.partnersBack === 'function' ){
                    self.partnersBack( counts && counts.countsByPartner || []);
                }
                return res;
            }, function (err) {
                Y.log('Timeline - error during data aggregation. ' + JSON.stringify(err), 'error', NAME);
            });
        },
        initDateManager: function () {
            var self = this;
            return {
                busy: false,
                switchableModes: [
                    'day',
                    'week',
                    'month',
                    'quarter',
                    'year'
                ],
                //switchMode: ko.observable('month'),
                setSwitchMode: function (mode) {
                    self.config.switchMode(mode);
                },
                setDatesByPeriod: function () {
                    var switchMode = self.config.switchMode();

                    if (switchMode !== 'custom') {
                        var start = moment().startOf(switchMode),
                            end = moment().startOf(switchMode).add(1, switchMode+'s').subtract(1, 'ms'),
                            startIso = start.toISOString(),
                            endIso = end.toISOString();

                        self.setBothDates(startIso, endIso);
                        self.externalOnDateChange();
                        self.updateTimelineChart();
                    }
                },
                changePeriod: function (direction) {

                    if (self.dateManager.busy) {
                        return false;
                    }

                    var switchMode = self.config.switchMode(),
                        start = moment(self.config.startDate()),
                        end = moment(self.config.endDate()),
                        startTl = moment(self.dateSelectorHelperData.tlStartDate()),
                        endTl = moment(self.dateSelectorHelperData.tlEndDate()),
                        differentDates = !(start.diff(startTl) === 0 && end.diff(endTl) === 0),
                        newStartIso = null,
                        newEndIso = null;

                    // custom mode
                    if (switchMode === 'custom' || differentDates) {

                        end.add(1, 'ms');
                        var diffDays = end.diff(start, 'days');

                        if (direction === 'next') {
                            newStartIso = end.toISOString();
                            newEndIso = end.add(diffDays, 'days').subtract(1, 'ms').toISOString();
                        } else if (direction === 'prev') {
                            newEndIso = start.subtract(1, 'ms').toISOString();
                            newStartIso = start.subtract(diffDays, 'days').add(1, 'ms').toISOString();
                        } else {
                            Y.log('ERR wrong direction for changePeriod method', 'warn', NAME );
                        }

                        if (differentDates) {
                            self.config.startDate(newStartIso);
                            self.config.endDate(newEndIso);
                            self.updateBrushPosition(newStartIso, newEndIso);
                        } else {
                            self.setBothDates(newStartIso, newEndIso);
                            self.externalOnDateChange();
                            self.updateTimelineChart();
                        }

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
                        self.externalOnDateChange();
                        self.updateTimelineChart();
                    }
                }
            };
        },
        initDateSelectorHelperData: function () {
            var now = new Date(),
                nowIso = now.toISOString();

            return {
                pickerStartDate: ko.observable(nowIso),
                pickerEndDate: ko.observable(nowIso),
                tlStartDate: ko.observable(nowIso),
                tlEndDate: ko.observable(nowIso)
                //rangeDisplayStart: ko.computed(function () {
                //    return moment(self.config.startDate()).format(self.dateTimeFormat);
                //}),
                //rangeDisplayEnd: ko.computed(function () {
                //    return moment(self.config.endDate()).format(self.dateTimeFormat);
                //})
            };
        },
        initTimelineChart: function (element, finalData) {
            var self = this;

            self.timelineElements.svg = element;

            nv.addGraph(function() {
                var chart = self.timelineElements.chart = nv.models.discreteBarChart()
                    .x(function(d) { return d.date; })
                    .y(function(d) { return d.count; })
                    .color(['#aec7e8'])
                    .showYAxis(false)
                    .height(70)
                    .margin({
                        left: 30,
                        right: 30,
                        top: 10,
                        bottom: 0
                    })
                    ;

                chart.xAxis.tickFormat(function (d) {
                    return d3.time.format('%d.%m.%y')(new Date(d));
                });
                chart.xAxis.rotateLabels(-45);

                self.timelineElements.chartData = d3.select(element)
                    .datum([{
                        key: 'test',
                        values: finalData.result
                    }])
                    .call(chart);

                self.createBrush(finalData);

                nv.utils.windowResize(function() {
                    self.chartResize();
                });

                return chart;
            });
        },
        chartResize: function() {
            var self = this;

            if (self.timelineElements.chart) {
                self.timelineElements.chart.update();
            }

            if (self.timelineElements.brush) {
                var ext = self.timelineElements.brush.extent(),
                    brushData = self.timelineElements.brushData;

                self.updateBrushX(brushData.domainStart, brushData.domainEnd);
                self.updateBrushPosition(ext[0], ext[1]);
            }
        },
        createBrush: function(data) {
            var self = this;

            self.timelineElements.brushData.domainStart = data.minDate;
            self.timelineElements.brushData.domainEnd = data.maxDate;

            var timelineWrapper = $('#timelineChart'),
                brushXScale = d3.time.scale.utc()
                    .domain([data.minDate, data.maxDate])
                    .range([0, timelineWrapper.width()-60]);

            var brushC = d3.select(self.timelineElements.svg).select('g'),
                brushObj = self.timelineElements.brush = d3.svg.brush()
                    .x(brushXScale)
                    .on('brushend', self.onBrushEnd.bind(self))
                    .extent([data.minDate, data.maxDate]);

            var brushSelect = brushC.empty() ? brushC.append('g') : brushC.select('g');

            brushSelect.attr("class", "brush")
                .call(brushObj)
                .selectAll('rect')
                .attr('height', 60);

            brushSelect.selectAll('.resize').append("path")
                .attr("d", function( d ) {
                    var tr = d === 'e',
                        br = d === 'e',
                        tl = d === 'w',
                        bl = d === 'w',
                        x = d === 'e' ? 0 : -7;

                    return rounded_rect(x, 15, 7, 35, 6, tl, tr, bl, br);
                })
                .attr('class', function( d ) {
                    return 'drag-rect drag-rect-'+d;
                })
                .style('fill-opacity', '1')
                .style('fill', '#ADACAC');


            brushSelect.selectAll('.resize').append('line')
                .attr('x1', function( d ) {
                    return d === 'e' ? 3 : -3;
                })
                .attr('x2', function( d ) {
                    return d === 'e' ? 3 : -3;
                })
                .attr('y1', 25)
                .attr('y2', 40)
                .style('stroke', 'rgb(214, 214, 214)');
        },
        onBrushEnd: function () {
            if (!d3.event.sourceEvent) {return;} // Only transition after input.

            var te = this.timelineElements,
                brushExtent = te.brush.extent();

            var closestDates = this.findClosestDates(brushExtent);

            te.brush.extent([closestDates[0], closestDates[1]]);
            te.brush(d3.select(".brush").transition());

            var startDate = new Date(closestDates[0]).toISOString(),
                endDate = new Date(closestDates[1]).toISOString();

            this.config.startDate(startDate);
            this.config.endDate(endDate);

            // clean dates in datepickers
            // prevent error when custom date selected
            this.config.switchMode('custom');
            this.dateSelectorHelperData.pickerStartDate(startDate);
            this.dateSelectorHelperData.pickerEndDate(endDate);
        },

        findClosestDates: function(extent) {

            var startDate = null,
                endDate = null,
                switchMode = this.config.switchMode(),

                extStart = extent[0],
                extEnd = extent[1],

                limitStart, limitEnd;

            if (switchMode === 'custom') {
                limitStart = moment(this.dateSelectorHelperData.tlEndDate()).endOf('day');
                limitEnd = moment(this.dateSelectorHelperData.tlStartDate()).endOf('day');
            } else {
                limitStart = moment(extStart).endOf(switchMode);
                limitEnd = moment(extEnd).startOf(switchMode).endOf('day');
            }

            var selectedStart = moment(extStart),
                leftStart = moment(extStart).startOf('day'),
                rightStart = moment(extStart).startOf('day').add(1, 'days'),

                selectedEnd = moment(extEnd),
                leftEnd = moment(extEnd).endOf('day').subtract(1, 'days'),
                rightEnd = moment(extEnd).endOf('day');

            if (limitStart.diff(rightStart) <= 0) {
                startDate = leftStart;
            } else {
                var leftStartDiff = Math.abs(selectedStart.diff(leftStart)),
                    rightStartDiff = Math.abs(selectedStart.diff(rightStart));

                startDate = leftStartDiff < rightStartDiff ? leftStart : rightStart;
            }

            if (limitEnd.diff(leftEnd) > 0) {
                endDate = rightEnd;
            } else {
                var leftEndDiff = Math.abs(selectedEnd.diff(leftEnd)),
                    rightEndDiff = Math.abs(selectedEnd.diff(rightEnd));

                endDate = leftEndDiff < rightEndDiff ? leftEnd : rightEnd;
            }

            // if empty add 1 day to end
            if (startDate.diff(endDate) === 1) {
                endDate.add(1, 'days');
            }

            startDate = startDate.toDate();
            endDate = endDate.toDate();

            return [startDate, endDate];
        },

        prepareDataForTimeline: function (data) {
            var switchMode = this.config.switchMode(),
                minDate = new Date(this.config.startDate()),
                maxDate = new Date(this.config.endDate()),
                ticks = [],
                res = [];

            //console.log('prepareDataForTimeline switchMode', switchMode);

            if (switchMode === 'quarter') {
                ticks = d3.time.monday.range(minDate, maxDate, 1);
            } else if (switchMode === 'year') {
                ticks = d3.time.month.range(minDate, maxDate, 1);
            } else {
                ticks = d3.time.day.range(minDate, maxDate, 1);
            }

            ticks.forEach(function (tickDate) {
                var entry = {
                    date: tickDate,
                    count: 0
                };

                var matchItem = data.find(function (item) {
                    var itemDate;

                    if( item._id ) {
                        itemDate = moment( item._id, 'YYYY-MM-DD' );

                        itemDate.set( {hour: 0, minute: 0, second: 0, millisecond: 0} );

                        if( moment( tickDate ).diff( itemDate ) === 0 ) {
                            return item;
                        }
                    }

                    //console.log('check', moment(tickDate).toISOString(), itemDate.toISOString());

                });

                if (matchItem) {
                    entry.count = matchItem.count;
                }

                res.push(entry);
            });

            return {
                minDate: minDate,
                maxDate: maxDate,
                result: res
            };
        },

        initPeriodButtons: function () {
            var self = this;

            var periodNextBtt = KoComponentManager.createComponent({
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'period-next',
                        text: '',
                        title: i18n('InSight2Mojit.timeSelector.period.NEXT_PERIOD'),
                        option: 'PRIMARY',
                        size: 'SMALL',
                        icon: 'CHEVRON_RIGHT',
                        disabled: false,
                        visible: true,
                        click: function() {
                            self.dateManager.changePeriod('next');
                        }
                    }
                }),
                periodPrevBtt = KoComponentManager.createComponent({
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'period-prev',
                        text: '',
                        title: i18n('InSight2Mojit.timeSelector.period.PREVIOUS_PERIOD'),
                        option: 'PRIMARY',
                        size: 'SMALL',
                        icon: 'CHEVRON_LEFT',
                        disabled: false,
                        visible: true,
                        click: function() {
                            self.dateManager.changePeriod('prev');
                        }
                    }
                }),
                periodTodayBtt = KoComponentManager.createComponent({
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'period-today',
                        text: '',
                        title: i18n('InSight2Mojit.timeSelector.period.TODAY'),
                        option: 'PRIMARY',
                        size: 'SMALL',
                        icon: 'CIRCLE_O',
                        disabled: false,
                        visible: true,
                        click: function() {
                            self.dateManager.setDatesByPeriod();
                        }
                    }
                });

            return {
                nextBtt: periodNextBtt,
                prevBtt: periodPrevBtt,
                todayBtt: periodTodayBtt
            };
        },

        hasActualData: function() {
            return Boolean( this.config.actualData );
        },

        applyChanges: function() {
            var config = this.config;
            if( config.actualData ){
                config.actualData.startDate( config.startDate() );
                config.actualData.endDate( config.endDate() );
                this.datesNotChanged( true );
            }
        },

        /**
         * Defines template object
         * @property template
         * @type {Object}
         */
        template: null,
        /** @protected */
        initTemplate: function(){
            var
                self = this;

            self.template = {
                name: self.get( 'templateName' ),
                data: self
            };
        }
    }, {
        NAME: 'InSightTimelineViewModel',
        ATTRS: {
            /**
             * Defines template name to look up
             * @attribute templateName
             * @type {String}
             * @default prototype.templateName
             */
            templateName: {
                valueFn: function() {
                    return this.templateName;
                }
            },
            /**
             * DCBinder
             * @attribute binder
             * @type {doccirrus.DCBinder}
             * @default InCaseMojitBinder
             */
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InSight2Mojit' );
                }
            }
        }
    });

    function rounded_rect(x, y, w, h, r, tl, tr, bl, br) {
        var retval;
        retval  = "M" + (x + r) + "," + y;
        retval += "h" + (w - 2*r);
        if (tr) { retval += "a" + r + "," + r + " 0 0 1 " + r + "," + r; }
        else { retval += "h" + r; retval += "v" + r; }
        retval += "v" + (h - 2*r);
        if (br) { retval += "a" + r + "," + r + " 0 0 1 " + -r + "," + r; }
        else { retval += "v" + r; retval += "h" + -r; }
        retval += "h" + (2*r - w);
        if (bl) { retval += "a" + r + "," + r + " 0 0 1 " + -r + "," + -r; }
        else { retval += "h" + -r; retval += "v" + -r; }
        retval += "v" + (2*r - h);
        if (tl) { retval += "a" + r + "," + r + " 0 0 1 " + r + "," + -r; }
        else { retval += "v" + -r; retval += "h" + r; }
        retval += "z";
        return retval;
    }

    KoViewModel.registerConstructor( InSightTimelineViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'dc-comctl',
        'KoUI-all'
    ]
} );
