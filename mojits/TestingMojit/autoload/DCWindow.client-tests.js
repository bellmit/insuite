/*global YUI */
YUI.add( 'DCWindow-tests', function( Y, NAME ) {
    
    var
        testNs = Y.doccirrus.test,
        TestModule = testNs.getTestModule(),
        suite = new TestModule.TestSuite( NAME ),
        A = TestModule.Assert,
        Namespace = null,
        isNodeVisible = testNs.utils.isNodeVisible;

    /**
     * DCWindow namespace tests
     */
    suite.add( new TestModule.TestCase( {
        // the test case
        name: 'DCWindow namespace tests',
        // stub
        setUp: function() {
            Namespace = Y.doccirrus.DCWindow;
        },
        tearDown: function() {
            Namespace = null;
        },
        // tests
        'test Namespace': function() {
            A.isObject( Namespace );
        },
        'test Namespace static': function() {
            A.areEqual( 'yui3-panel', Namespace.CSS_PREFIX );
            A.areEqual( 'glyphicon glyphicon-ban-circle', Namespace.ICON_ERROR );
            A.areEqual( 'glyphicon glyphicon-hand-right', Namespace.ICON_INFO );
            A.areEqual( 'glyphicon glyphicon-list', Namespace.ICON_LIST );
            A.areEqual( 'glyphicon glyphicon-search', Namespace.ICON_SEARCH );
            A.areEqual( 'glyphicon glyphicon-ok', Namespace.ICON_SUCCESS );
            A.areEqual( 'glyphicon glyphicon-bullhorn', Namespace.ICON_WARN );
            A.areEqual( 'DCWindow', Namespace.NAME );
            A.areEqual( 460, Namespace.SIZE_MEDIUM );
            A.areEqual( 320, Namespace.SIZE_SMALL );
            A.areEqual( 600, Namespace.SIZE_LARGE );
            A.areEqual( 900, Namespace.SIZE_XLARGE );
            A.isInstanceOf( Y.LazyModelList, Namespace.manager );
            A.isFunction( Namespace.getButton );
            A.isFunction( Namespace.notice );
        }
    } ) );
    /**
     * DCWindow function tests
     */
    suite.add( new TestModule.TestCase( {
        // the test case
        name: 'DCWindow function tests',
        // stub
        setUp: function() {
            Namespace = Y.doccirrus.DCWindow;
        },
        tearDown: function() {
            Namespace = null;
        },
        // tests
        'test Namespace Instantiation': function() {
            var
                win = new Namespace( {
                    title: 'headerContent',
                    bodyContent: 'bodyContent',
                    render: document.body,
                    width: 250
                } ),
                boundingBox = win.get( 'boundingBox' );

            A.isInstanceOf( Y.Panel, win );
            A.isInstanceOf( Namespace, win );

            A.areEqual( true, isNodeVisible( boundingBox ), 'visibility failed' );

            win.close();

            this.wait( function() {
                A.areEqual( false, isNodeVisible( boundingBox ), 'visibility failed' );
            }, 500 );
        },
        'test Maximizable': function() {
            var
                win = new Namespace( {
                    title: 'headerContent',
                    bodyContent: 'bodyContent',
                    render: document.body,
                    width: 250,

                    centered: true,

                    maximizable: true,
                    buttons: {
                        header: ['close', 'maximize']
                    }
                } ),
                rM = win.resizeMaximized,
                boundingBox = win.get( 'boundingBox' );

            rM.set( 'maximized', !rM.get( 'maximized' ) );
            A.areNotEqual( 250, parseInt( win.get( 'width' ) ), 'maximzed failed' );
            A.areEqual( true, isNodeVisible( boundingBox ), 'maximzed visibility failed' );

            this.wait( function() {
                rM.set( 'maximized', !rM.get( 'maximized' ) );
                A.areEqual( 250, parseInt( win.get( 'width' ) ), 'minimized failed' );
                A.areEqual( true, isNodeVisible( boundingBox ), 'minimized visibility failed' );

                win.close();
            }, 500 );

            this.wait( function() {
                A.areEqual( false, isNodeVisible( boundingBox ), 'visibility failed' );
            }, 1000 );

        }
    } ) );
    /**
     * DCWindow.notice function tests
     */
    suite.add( new TestModule.TestCase( {
        // the test case
        name: 'DCWindow.notice function tests',
        // stub
        setUp: function() {
            Namespace = Y.doccirrus.DCWindow;
        },
        tearDown: function() {
            Namespace = null;
        },
        // tests
        'test notice': function() {
            var
                self = this,
                win, boundingBox, maskNode,
                visibleFalseTest = function() {
                    A.areEqual( false, win.get( 'visible' ), 'notice visibleChange failed' );
                    A.areEqual( false, isNodeVisible( boundingBox ), 'notice visibility failed' );
                    A.areEqual( false, isNodeVisible( maskNode ), 'mask visibility failed' );
                };

            win = Namespace.notice( { message: 'foo' } );
            boundingBox = win.get( 'boundingBox' );
            maskNode = win.get( 'maskNode' );

            A.isInstanceOf( Y.Panel, win );
            A.isInstanceOf( Namespace, win );

            A.areEqual( true, isNodeVisible( boundingBox ), 'notice visibility failed' );
            A.areEqual( true, isNodeVisible( maskNode ), 'mask visibility failed' );

            win.close();

            self.wait( visibleFalseTest, 500 );
        },
        'test notice close': function() {
            var
                self = this,
                win, boundingBox, maskNode, closeNode,
                visibleFalseTest = function() {
                    A.areEqual( false, win.get( 'visible' ), 'notice visibleChange failed' );
                    A.areEqual( false, isNodeVisible( boundingBox ), 'notice visibility failed' );
                    A.areEqual( false, isNodeVisible( maskNode ), 'mask visibility failed' );

                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * window close
                     */
                        function() {
                        stack.shift();

                        win = Namespace.notice( { message: 'foo' } );
                        boundingBox = win.get( 'boundingBox' );
                        maskNode = win.get( 'maskNode' );

                        A.isInstanceOf( Y.Panel, win );
                        A.isInstanceOf( Namespace, win );

                        A.areEqual( true, isNodeVisible( boundingBox ), 'notice visibility failed' );
                        A.areEqual( true, isNodeVisible( maskNode ), 'mask visibility failed' );

                        win.close();

                        self.wait( visibleFalseTest, 500 );
                    },
                    /**
                     * window close header click
                     */
                        function() {
                        stack.shift();

                        win = Namespace.notice( { message: 'foo' } );
                        boundingBox = win.get( 'boundingBox' );
                        closeNode = boundingBox.one( '.close' );

                        A.areEqual( true, closeNode === win.getButton( 'close', 'header' ), 'close button mismatch' );
                        A.areEqual( true, isNodeVisible( closeNode ), 'notice visibility failed' );
                        closeNode.getDOMNode().click();

                        self.wait( visibleFalseTest, 500 );
                    },
                    /**
                     * window ok footer click
                     */
                        function() {
                        stack.shift();

                        win = Namespace.notice( { message: 'foo' } );
                        boundingBox = win.get( 'boundingBox' );
                        closeNode = win.get( 'defaultButton' );

                        A.areEqual( true, closeNode === win.getButton( 'OK', 'footer' ), 'ok button mismatch' );
                        A.areEqual( true, isNodeVisible( closeNode ), 'notice visibility failed' );
                        //defaultButton
                        closeNode.getDOMNode().click();

                        self.wait( visibleFalseTest, 500 );
                    }
                ];
            stack[0]();
        }
    } ) );

    TestModule.TestRunner.add( suite );

}, '0.0.1', {
    requires: [
        'dc-client-test',
        'DCWindow'
    ]
} );
