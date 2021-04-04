/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'testDCWindow-binder-index', function( Y, NAME ) {
    'use strict';

    var
        testNs = Y.doccirrus.test,
        TestModule = testNs.getTestModule();

    Y.namespace( "mojito.binders" )[NAME] = {

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;

            console.warn( NAME, {
                arguments: arguments,
                this: this,
                Y: Y
            } );

        },

        bind: function( node ) {
            this.node = node;

            var
                applyBindings = {
                    runTests: function() {
                        //run the tests
                        TestModule.TestRunner.run();
                    },
                    clearTests: function() {
                        applyBindings.tests.removeAll();
                    },
                    tests: ko.observableArray(),
                    text: ko.observable( '' ),
                    showDefault: function() {
                        var
                            aDCWindow = new Y.doccirrus.DCWindow( {
                                title: 'headerContent',
                                bodyContent: 'bodyContent',
                                render: document.body,
                                width: 250
                            } );

                        console.warn( '[testDCWindow.js] applyBindings.showDefault :', aDCWindow );
                    },
                    showMaximizable: function() {
                        var
                            aDCWindow = new Y.doccirrus.DCWindow( {
                                title: 'headerContent',
                                bodyContent: 'bodyContent',
                                render: document.body,
                                width: 250,
                                visible: false,

                                centered: true,

                                maximizable: true,
                                buttons: {
                                    header: ['close', 'maximize']
                                }
                            } );

                        aDCWindow.show();

                        console.warn( '[testDCWindow.js] applyBindings.showDefault :', aDCWindow );
                    },
                    makeOnTopWindowEditable: function() {
                        var
                            aDCWindow = Y.doccirrus.DCWindow.manager.getInFront();
                        if( !aDCWindow ) {
                            return false;
                        }
                        ko.applyBindings( {
                            text: ko.computed( function() {
                                return applyBindings.text();
                            } )
                        }, aDCWindow.set( 'bodyContent', '<div data-bind="text: text"></div>' )
                            .get( 'bodyContent' ).item( 0 ).getDOMNode() );

                        console.warn( '[testDCWindow.js] applyBindings.makeOnTopWindowEditable :', {
                            "aDCWindow": aDCWindow
                        } );
                    },
                    showNoticeDefault: function() {
                        var
                            aDCWindowNotice = Y.doccirrus.DCWindow.notice( {
                                message: 'Hello World!'
                            } );

                        console.warn( '[testDCWindow.js] applyBindings.showNoticeDefault :', aDCWindowNotice );
                    },
                    showNoticeFullFeatured: function() {
                        var
                            aDCWindowNotice = Y.doccirrus.DCWindow.notice( {
                                icon: Y.doccirrus.DCWindow.ICON_SEARCH,
                                title: 'Search',
                                message: 'Not Found!',
                                forceDefaultAction: true,
                                window: {
                                    width: 'medium',
                                    //width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                    modal: false,
                                    dragable: true,
                                    resizeable: true,
                                    buttons: {
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                            Y.doccirrus.DCWindow.getButton( 'OK', { isDefault: true } )
                                        ]
                                    }
                                }
                            } );

                        console.warn( '[testDCWindow.js] applyBindings.showNoticeFullFeatured :', aDCWindowNotice );
                    }
                };

            console.warn( '[testDCWindow.js] applyBindings :', applyBindings );

            ko.applyBindings( applyBindings, node.getDOMNode() );

            testNs.utils.createSubscribeForArray( applyBindings.tests );

        }

    };
}, '0.0.1', {
    requires: [
        'DCWindow-tests'
    ]
} );