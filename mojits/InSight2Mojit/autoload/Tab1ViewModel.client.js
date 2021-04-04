/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'Tab1ViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        //i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,

        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,

        InSight2MojitViewModel = KoViewModel.getConstructor( 'InSight2MojitViewModel' ),
        InSightWidgetViewModel = KoViewModel.getConstructor( 'InSightWidgetViewModel' );

    /**
     * @constructor
     * @class Tab1ViewModel
     * @extends InSight2MojitViewModel
     */
    function Tab1ViewModel() {
        Tab1ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( Tab1ViewModel, InSight2MojitViewModel, {
        templateName: 'Tab1ViewModel',
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initTab1ViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        initTab1ViewModel: function() {
            var self = this;

            self.initWidgets();
        },


        initWidgets: function () {
            var self = this;

            self.widgetList = ko.observableArray();

            self.addDisposable(self.widgetList.subscribe(function(actions){
                //console.warn(actions);
                actions.forEach(function(action){
                    if ("deleted" === action.status){
                        action.value.destroy();
                    }
                });
            }, null, "arrayChange" ));


            self.addWidget();
            self.addWidget();
            self.addWidget();
            self.addWidget();

            self.widgetsByCols = ko.computed(function () {
                var list = self.widgetList();
                return self.splitForColumns(list, 3);
            });

            self.initAddWidgetBtt();

        },

        addWidget: function () {
            var instance = new InSightWidgetViewModel();
            this.widgetList.push(instance);
        },

        initAddWidgetBtt: function () {
            var self = this,
                btt = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'add-widget',
                        text: 'Add widget',
                        title: 'Add widget',
                        icon: 'CHEVRON_RIGHT',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        click: function() {
                            self.addWidget();
                        }
                    }
                });

            self.addWidgetBtt = btt;
        },

        splitForColumns: function (list, columnAmount) {
            var result = [];

            for (var i = 0; i < list.length; i++) {
                var widget = list[i],
                    columnIndex = i % columnAmount;

                if (!result[columnIndex]) {
                    result[columnIndex] = [];
                }

                result[columnIndex].push(widget);
            }

            return result;
        }

    }, {
        NAME: 'Tab1ViewModel',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( Tab1ViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'KoUI-all',
        'InSight2MojitViewModel',
        'InSightWidgetViewModel'
    ]
} );
