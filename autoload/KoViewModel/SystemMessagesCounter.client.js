/**
 * User: sebastian.lara
 * Date: 28/10/19  10:00
 * (c) 2019, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, $*/

'use strict';

// eslint-disable-next-line no-unused-vars
YUI.add( 'SystemMessagesCounter', function( Y, NAME ) {
        /**
         * @module SystemMessagesCounter
         */
        var
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @constructor
         * @class SystemMessagesCounter
         */
        function SystemMessagesCounter() {
            SystemMessagesCounter.superclass.constructor.apply( this, arguments );
        }

        Y.extend( SystemMessagesCounter, KoViewModel.getDisposable(), {
            /** @private */
            initializer: function() {
                this.messages =  ko.observableArray( [] );

                this.categoryExpanded = ko.observable(null);

                this.showDisplayComponent = ko.observable(true);

                // SUCCESS
                this.successMessages.counter = ko.observable(0);
                this.successMessages.enabled = ko.computed( function() {
                    return unwrap(this.successMessages.counter) > 0;
                }.bind(this));
                this.successMessages.visible = this.showDisplayComponent;


                // INFO
                this.infoMessages.counter = ko.observable(0);
                this.infoMessages.enabled = ko.computed( function() {
                    return unwrap(this.infoMessages.counter);
                }.bind(this));
                this.infoMessages.visible = this.showDisplayComponent;

                // WARNING
                this.warningMessages.counter = ko.observable(0);
                this.warningMessages.enabled = ko.computed( function() {
                    return unwrap(this.warningMessages.counter);
                }.bind(this));
                this.warningMessages.visible = this.showDisplayComponent;

                // DANGER
                this.dangerMessages.counter = ko.observable(0);
                this.dangerMessages.enabled = ko.computed( function() {
                    return unwrap(this.dangerMessages.counter);
                }.bind(this));
                this.dangerMessages.visible = this.showDisplayComponent;

                $( window ).on('system-messages:update', function (event, data) {
                    var
                        messagesCounter = data.messagesCounter;

                    this.successMessages.counter(messagesCounter.success);

                    this.infoMessages.counter(messagesCounter.info);

                    this.warningMessages.counter(messagesCounter.warning);

                    this.dangerMessages.counter(messagesCounter.danger);

                    this.showDisplayComponent(data.visible && data.totalCount > 0);
                }.bind(this));
            },
            showDisplayComponent: false,
            successMessages: {
                title: i18n('DCSystemMessages.information'),
                enabled: false,
                visible: false,
                counter: 0
            },
            infoMessages: {
                title: i18n('DCSystemMessages.ruleNotification'),
                enabled: false,
                visible: false,
                counter: 0
            },
            warningMessages: {
                title: i18n('DCSystemMessages.tasks'),
                enabled: false,
                visible: false,
                counter: 0
            },
            dangerMessages: {
                title: i18n('DCSystemMessages.warnings'),
                enabled: false,
                visible: false,
                counter: 0
            },
            categoryExpanded: null,
            allCategoriesKey: 'ALL',
            /** @protected */
            dispose: function() {
                // TODO: destroy listener
                SystemMessagesCounter.superclass.dispose.apply( this, arguments );
            },
            /**
             * handle click on success button by calling triggerExpandEvent with SUCCESS category
             */
            successBtnClick: function () {
                this.triggerExpandEvent('SUCCESS');
            },
            /**
             * handle click on success button by calling triggerExpandEvent with INFO category
             */
            infoBtnClick: function () {
                this.triggerExpandEvent('INFO');
            },
            /**
             * handle click on success button by calling triggerExpandEvent with WARNING category
             */
            warningBtnClick: function () {
                this.triggerExpandEvent('WARNING');
            },
            /**
             * handle click on success button by calling triggerExpandEvent with ERROR category
             */
            dangerBtnClick: function () {
                this.triggerExpandEvent('ERROR');
            },
            /**
             * handle click on expand button
             * triggers expand event with proper data to hide the footer component
             * and show the regular list
             */
            expandBtnClick: function () {
                $( window ).trigger('system-messages:expand', {
                    listFilter: this.allCategoriesKey,
                    systemMessagesCounterVisible: false,
                    toggleListVisible: true
                });
            },
            /***
             * trigger expand event to be listened in DCSystemMessages
             * @param categoryKey
             */
            triggerExpandEvent: function (categoryKey) {
                var
                    data;

                if (this.categoryExpanded === categoryKey) {
                    data = {
                        listFilter: this.allCategoriesKey,
                        systemMessagesCounterVisible: true,
                        toggleListVisible: false
                    };

                    this.categoryExpanded = null;
                } else {
                    data = {
                        listFilter: categoryKey,
                        systemMessagesCounterVisible: true,
                        toggleListVisible: true
                    };

                    this.categoryExpanded = categoryKey;
                }

                $( window ).trigger('system-messages:expand', data);
            }
        }, {
            NAME: 'SystemMessagesCounter'
        } );

        KoViewModel.registerConstructor( SystemMessagesCounter );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'dcutils',
            'KoViewModel'
        ]
    }
);
