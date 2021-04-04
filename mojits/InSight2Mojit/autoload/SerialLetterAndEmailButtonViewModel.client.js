/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, _ */
YUI.add('SerialLetterAndEmailButtonViewModel', function (Y/*, NAME*/) {
    'use strict';
    var
        i18n = Y.doccirrus.i18n,
        //peek = ko.utils.peekObservable,

        KoViewModel = Y.doccirrus.KoViewModel,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        api = Y.doccirrus.jsonrpc.api;
    /**
     * @constructor
     * @class SerialLetterAndEmailButtonViewModel
     */
    function SerialLetterAndEmailButtonViewModel() {
        SerialLetterAndEmailButtonViewModel.superclass.constructor.apply(this, arguments);
    }

    Y.extend(SerialLetterAndEmailButtonViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function (data) {
            var self = this;
            self.configData = data;
        },
        /** @protected */
        destructor: function () {
            var
                self = this;
            self.destroySerialLetterAndEmailButtonViewModel();
        },
        destroySerialLetterAndEmailButtonViewModel: function () {
        },
        /**
         * default error notifier
         */
        fail: function (response) {
            var
                errors = Y.doccirrus.errorTable.getErrorsFromResponse(response);

            if (errors.length) {
                Y.Array.invoke(errors, 'display');
            }

        },
        /**
         * Initialises the serial email button for whichever Table ViewModel it is bound to
         *
         * @param that {Object} "this" from particular Table ViewModel (alternative to binding method)
         */
        initSerialEmailButton: function (that) {
            var
                self = that || this;

            api.employee
                .getEmployeeForUsername({username: Y.doccirrus.auth.getUserId()})
                .done(function (response) {
                    self.currentEmployee = (response && response.data) ? response.data : null;
                })
                .fail(self.fail);

            api.location
                .read()
                .then(function (response) {
                    self.locations = Y.Lang.isArray(response.data) && response.data || [];
                })
                .fail(self.fail);
            /**
             * Returns the date range depending on how it is structured from the config it inherits
             * @returns {InSightReportingViewModel.dateSelectorData|{endDate: (function(): string), startDate: (function(): string)}|*|inSight2Containers_T.dateRange|{"-en", type, i18n, "-de"}|PredefinedTableViewModel.config.dateRange|PredefinedReportsViewModel.dateSelectorData|Object}
             */
            function getDateRange() {
                if (self.config.dateRange) {
                    return self.config.dateRange;
                } else if (self.config.dateSelectorData) {
                    return self.config.dateSelectorData;
                } else {
                    return {
                        startDate: function () {
                            return new Date('2012-01-01').toJSON();
                        },
                        endDate: function () {
                            return new Date().toJSON();
                        }
                    };
                }
            }

            self.serialEmailButton = KoComponentManager.createComponent({
                componentType: 'KoButton',
                componentConfig: {
                    name: 'serialEmailButton',
                    text: i18n('TaskMojit.SerialEMailModal.title.TASKS'),
                    title: i18n('TaskMojit.SerialEMailModal.title.TASKS'),
                    option: 'DEFAULT',
                    size: 'SMALL',
                    disabled: false,
                    visible: true,
                    click: function () {
                        let dateRange = getDateRange();
                        let dates = {
                                startDate: dateRange.startDate(),
                                endDate: dateRange.endDate()
                            },
                            query = {
                                patEmail: {
                                    "$exists": true,
                                    "$nin": [
                                        "",
                                        []
                                    ]
                                }
                            };
                        if (self.kotable && self.kotable.filterParams() && Object.keys(self.kotable.filterParams()).length > 0) {
                            query = _.merge(query, self.kotable.filterParams());
                        }
                        api.reporting.getData({
                            dates: dates,
                            insightConfigId: self.insightConfigId || self.config._id,
                            noTimeout: true,
                            sort: {patientName: 1},
                            query: query
                        })
                            .then(function (response) {
                                let ids = response.data.map(function (patient) {
                                    return patient.patientDbId;
                                });
                                Y.doccirrus.modals.serialEMailAssistantModal.show({
                                    origin: (self.config && self.config.origin) || '',
                                    selectedPatientsIds: ids,
                                    selectedPatients: self.kotable.data(),
                                    locations: self.locations,
                                    employee: self.currentEmployee
                                });
                            })
                            .fail(self.fail);
                    }
                }
            });
        },
        initSerialLetterButton: function (that) {
            var
                self = that || this;

            /**
             * Returns the date range depending on how it is structured from the config it inherits
             * @returns {InSightReportingViewModel.dateSelectorData|{endDate: (function(): string), startDate: (function(): string)}|*|inSight2Containers_T.dateRange|{"-en", type, i18n, "-de"}|PredefinedTableViewModel.config.dateRange|PredefinedReportsViewModel.dateSelectorData|Object}
             */
            function getDateRange() {
                if (self.config.dateRange) {
                    return self.config.dateRange;
                } else if (self.config.dateSelectorData) {
                    return self.config.dateSelectorData;
                } else {
                    return {
                        startDate: function () {
                            return new Date('2012-01-01').toJSON();
                        },
                        endDate: function () {
                            return new Date().toJSON();
                        }
                    };
                }
            }
            self.serialLetterButton = KoComponentManager.createComponent({
                componentType: 'KoButton',
                componentConfig: {
                    name: 'serialLetterButton',
                    text: i18n('TaskMojit.SerialLetterModal.title'),
                    title: i18n('TaskMojit.SerialLetterModal.title'),
                    option: 'DEFAULT',
                    size: 'SMALL',
                    disabled: false,
                    visible: true,
                    click: function () {
                        let dateRange = getDateRange();
                        let dates = {
                                startDate: dateRange.startDate(),
                                endDate: dateRange.endDate()
                            },
                            query = {};
                        if (self.kotable && self.kotable.filterParams() && Object.keys(self.kotable.filterParams()).length > 0) {
                            query = _.merge(query, self.kotable.filterParams());
                        }
                        api.reporting.getData({
                            dates: dates,
                            insightConfigId: self.insightConfigId || self.config._id,
                            noTimeout: true,
                            sort: {patientName: 1},
                            query: query
                        })
                            .then(function (response) {
                                let ids = response.data.map(function (patient) {
                                    return patient.patientDbId;
                                });
                                Y.doccirrus.modals.serialLetterAssistantModal.show({
                                    selectedPatientsIds: ids,
                                    locations: self.locations,
                                    employee: self.currentEmployee
                                });

                            })
                            .fail(self.fail);
                    }
                }
            });
        }
    }, {
        NAME: 'SerialLetterAndEmailButtonViewModel',
        ATTRS: {
            binder: {
                valueFn: function () {
                    return Y.doccirrus.utils.getMojitBinderByType('InSight2MojitBinderInsight2');
                }
            }
        }
    });

    KoViewModel.registerConstructor(SerialLetterAndEmailButtonViewModel);

}, '3.16.0', {
    requires: [
        'KoViewModel'
    ]
});