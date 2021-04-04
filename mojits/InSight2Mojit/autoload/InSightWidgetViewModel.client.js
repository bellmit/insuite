/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, d3, nv, $, jQuery */
YUI.add( 'InSightWidgetViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    /**
     * @constructor
     * @class InSightWidgetViewModel
     */
    function InSightWidgetViewModel() {
        InSightWidgetViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSightWidgetViewModel, KoViewModel.getDisposable(), {
        /**
         * Defines template name to look up
         * @property templateName
         * @type {String}
         */
        templateName: 'InSightWidgetViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initInSightWidgetViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        /** @protected */
        initInSightWidgetViewModel: function() {
            var
                self = this;

            self.initTemplate();

            // widget data
            self.subViewManager = self.initSubViewManager();

            // chart view data
            self.chartData = ko.observable();
            self.chartDataForTable = ko.observable();
            self.chartColsForTable = ko.observable();

            // listen for changes
            self.chartData.subscribe(function (newVal) {
                var newData = self.prepareDataForTable(newVal.data);
                self.chartDataForTable(newData.data);
                self.chartColsForTable(newData.columns);
            });

            // set init data
            self.chartData({
                chartConfig: {
                    type: 'line'
                },
                data: self.generateData()
            });

            // show chart
            self.initChartBinding();

            //init config view
            self.initConfigView();

        },

        initConfigView: function () {
            var self = this,
                regenBtt = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'regen',
                        text: 'Regenerate data',
                        title: 'regen',
                        icon: 'CHEVRON_RIGHT',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        click: function() {
                            self.chartData({
                                chartConfig: {
                                    type: 'bar'
                                },
                                data: self.generateData('bar')
                            });
                        }
                    }
                });

            self.regenBtt = regenBtt;
        },

        initSubViewManager: function () {
            var manager = {
                state: {
                    chart: ko.observable(true),
                    table: ko.observable(false),
                    config: ko.observable(false)
                },
                buttons: this.initSubViewButtons(),
                switchView: function(viewName) {
                    var self = this,
                        newValue = false;
                    for (var key in self.state) {
                        if (self.state.hasOwnProperty(key)) {
                            newValue = key === viewName;
                            self.state[key](newValue);
                        }
                    }
                }
            };

            return manager;
        },

        initSubViewButtons: function () {
            var self = this;

            var showChartBtt = KoComponentManager.createComponent({
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'show-chart',
                        text: 'Chart',
                        title: 'Show chart',
                        icon: 'CHEVRON_RIGHT',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        click: function() {
                            self.subViewManager.switchView('chart');
                        }
                    }
                }),
                showTableBtt = KoComponentManager.createComponent({
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'show-table',
                        text: 'Table',
                        title: 'Show table',
                        icon: 'CHEVRON_RIGHT',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        click: function() {
                            self.subViewManager.switchView('table');
                        }
                    }
                }),
                showConfigBtt = KoComponentManager.createComponent({
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'show-config',
                        text: 'Configuration',
                        title: 'Show configuration',
                        icon: 'CHEVRON_RIGHT',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        click: function() {
                            self.subViewManager.switchView('config');
                        }
                    }
                });

            return {
                chart: showChartBtt,
                table: showTableBtt,
                config: showConfigBtt
            };
        },

        // tmp todo: remove
        generateData: function (type) {
            var res = [],
                seriesAmountMax = type === 'bar' ? 1 : 4,
                itemsAmountMin = type === 'bar' ? 5 : 20,
                itemsAmountMax = type === 'bar' ? 10 : 40
                ;

            function getRandomInt(min, max) {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }

            function assignIndex(item) {
                if (type === 'bar') {
                    item.label = 'label'+getRandomInt(1000, 10000);
                } else {
                    item.date = getRandomInt(1447665064000, 1455271558000);
                }
                return item;
            }

            function sortByIndex(a, b) {
                if (type === 'bar') {
                    if (a < b) {
                        return -1;
                    }
                    if (a > b) {
                        return 1;
                    }
                    return 0;
                } else {
                    return a.date - b.date;
                }
            }

            for (var i = 0; i < getRandomInt(1, seriesAmountMax); i++) {
                var vals  = [];

                for (var j = 0; j < getRandomInt(itemsAmountMin, itemsAmountMax); j++) {
                    var newItem = {
                        value: getRandomInt(10, 50)
                    };
                    assignIndex(newItem);
                    vals.push(newItem);
                }

                vals.sort(sortByIndex);

                res.push({
                    values: vals,
                    key: 'Test'+getRandomInt(1000, 10000)
                });
            }

            return res;
        },

        prepareDataForTable: function (data) {
            var res = [],
                cols = {},
                seen = {},
                oneSerie;

            for (var k = 0; k < data.length; k++) {
                oneSerie = data[k];
                cols[oneSerie.key] = 0;
            }


            for (var i = 0; i < data.length; i++) {
                oneSerie = data[i];

                for (var j = 0; j < oneSerie.values.length; j++) {
                    var singleValue = oneSerie.values[j],
                        hasDate = !!singleValue.date,
                        valueIndex = hasDate ? moment(singleValue.date).format('YYYY-MM-DD') : singleValue.label,
                        previous = null;


                    if (seen.hasOwnProperty(valueIndex)) {
                        // get item
                        previous = seen[valueIndex];

                        //update item
                        previous[oneSerie.key] = singleValue.value;
                    } else {
                        // set item data
                        var item = jQuery.extend({}, cols);
                        item.hasDate = hasDate;
                        item.index = valueIndex;
                        item[oneSerie.key] = singleValue.value;

                        // save as seen
                        seen[item.index] = item;

                        // add to result array
                        res.push(item);
                    }
                }

            }

            res.sort(sortItems);

            var colsForTable = Object.keys(cols);
            colsForTable.unshift('index');

            return {
                columns: colsForTable,
                data: res
            };
        },

        initChartBinding: function () {
            var self = this;

            ko.bindingHandlers.inSightChart = {
                init: chartInit,
                update: chartUpdate
            };

            // ---

            function generateHash() {
                return Math.random().toString(36).substring(7);
            }

            function chartInit(element, valueAccessor, allBindings, viewModel, bindingContext) {
                var value = valueAccessor(),
                    valueUnwrapped = ko.unwrap(value),
                    chartElement = $(element).children('svg')[0],
                    chartId = 'chart_'+generateHash();


                $(element).attr('id', chartId);

                nv.addGraph(function() {
                    var chart = self.getNvInstance(valueUnwrapped.chartConfig.type);

                    d3.select(chartElement)
                        .datum(valueUnwrapped.data)
                        .call(chart);

                    nv.utils.windowResize(function() { chart.update(); });

                    bindingContext[chartId] = chart;
                    return chart;
                });
            }

            function chartUpdate(element, valueAccessor, allBindings, viewModel, bindingContext) {

                var value = valueAccessor(),
                    valueUnwrapped = ko.unwrap(value),
                    chartId = $(element).attr('id'),
                    chartElement = $(element).children('svg')[0],
                    currentNvInstance = bindingContext[chartId];

                if (currentNvInstance) {
                    d3.select(chartElement)
                        .datum(valueUnwrapped)
                        .call(currentNvInstance);
                }

            }

        },

        getNvInstance: function (type) {
            var chart = null;

            if (type === 'line') {
                chart = nv.models.lineChart()
                    .x(function(d) { return d.date; })
                    .y(function(d) { return d.value; })
                    .margin({
                        left: 30,
                        right: 30,
                        top: 30,
                        bottom: 30
                    })
                    .useInteractiveGuideline(true)
                    .showLegend(false)
                    .showYAxis(true)
                    .showXAxis(true)
                ;

                chart.xAxis
                    .tickFormat(function(d) {
                        return d3.time.format('%x')(new Date(d));
                    });
            } else if (type === 'bar') {
                chart = nv.models.discreteBarChart()
                    .x(function(d) { return d.label; })    //Specify the data accessors.
                    .y(function(d) { return d.value; })
                    .margin({
                        left: 30,
                        right: 30,
                        top: 30,
                        bottom: 30
                    })
                    .staggerLabels(true)
                    .showValues(false);
            }

            return chart;
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
        NAME: 'InSightWidgetViewModel',
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
            //collection: {
            //    value: null
            //}
        }
    } );

    KoViewModel.registerConstructor( InSightWidgetViewModel );

    // -- helper methods

    function sortItems(a,b){
        if (a.hasDate && b.hasDate) {
            return new Date(b.index) - new Date(a.index);
        } else {
            if (a.index < b.index ) {
                return -1;
            }
            if (a.index > b.index) {
                return 1;
            }
            return 0;
        }
    }

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel'
    ]
} );
