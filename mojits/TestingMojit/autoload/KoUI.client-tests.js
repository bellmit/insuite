/*global YUI, ko, jQuery */
/*jshint latedef:false */
YUI.add( 'KoUI-tests', function( Y, NAME ) {
    
    var
        testNs = Y.doccirrus.test,
        TestModule = testNs.getTestModule(),
        suite = new TestModule.TestSuite( NAME ),
        A = TestModule.Assert,
        Namespace = null,
        localStorageKeys = [],
        isNodeVisible = testNs.utils.isNodeVisible,

        peek = ko.utils.peekObservable,
    //unwrap = ko.unwrap,
        componentCount;

    /**
     * KoUI namespace tests
     */
    suite.add( new TestModule.TestCase( {
        // the test case
        name: 'KoUI namespace tests',
        // stub
        setUp: function() {
            Namespace = Y.doccirrus.KoUI;
        },
        tearDown: function() {
            componentCount = Namespace.KoComponentManager.count;
            Namespace = null;
        },
        // tests
        'test KoUI Namespace': function() {
            A.isObject( Namespace );
        }
    } ) );

    /**
     * Standard component instantiation tests
     * @param {KoComponent} component
     * @param {Y.Node} node
     */
    function componentStandardSetup( component, node ) {
        var
            domNode = node.getDOMNode();

        A.areEqual( false, peek( component.rendered ), 'component is not rendered yet' );

        Y.one( TestModule.appendSelector ).append( node );

        ko.applyBindings( component, domNode );

        A.areEqual( true, ko.dataFor( domNode ) === component, 'ko.dataFor equals component' );
        A.areEqual( true, peek( component.rendered ), 'component is rendered' );
    }

    /**
     * Standard component dispose tests
     * @param {KoComponent} component
     * @param {Y.Node} node
     */
    function componentStandardTearDown( component, node ) {
        var
            domNode = node.getDOMNode();

        ko.cleanNode( domNode );
        node.remove( true );
        component.dispose();

        A.areEqual( componentCount, Namespace.KoComponentManager.count, 'KoComponentManager.count equals KoComponentManager.count' );
    }

    /**
     * KoUI KoComponent tests
     */
    suite.add( new TestModule.TestCase( {
        // the test case
        name: 'KoUI KoComponent tests',
        // stub
        setUp: function() {
            Namespace = Y.doccirrus.KoUI;
        },
        tearDown: function() {
            Namespace = null;
        },
        // tests
        'test KoComponent': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {}, 'KoComponent' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoComponent' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        }
    } ) );

    /**
     * KoUI KoExample tests
     */
    suite.add( new TestModule.TestCase( {
        // the test case
        name: 'KoUI KoExample tests',
        // stub
        setUp: function() {
            localStorageKeys = Object.keys( localStorage ); // keys snapshot
            Namespace = Y.doccirrus.KoUI;
        },
        tearDown: function() {
            var
                localStorageCurrentKeys = Object.keys( localStorage );

            localStorageCurrentKeys // remove added keys
                .filter( function( key ) {
                    return -1 === localStorageKeys.indexOf( key );
                } )
                .forEach( function( key ) {
                    localStorage.removeItem( key );
                } );

            localStorageKeys = [];
            Namespace = null;
        },
        // tests
        'test KoExample': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {}, 'KoExample' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoExample' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoExample lifeTime': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {}, 'KoExample' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoExample' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        A.areEqual( 0, peek( component.lifeTime ), 'initialising lifeTime with 0' );

                        self.wait( next, 2000 );
                    },
                    /**
                     * lifeTime check
                     */
                        function() {
                        stack.shift();
                        var lifeTime = peek( component.lifeTime );

                        A.isNumber( lifeTime, 'lifeTime isNumber' );
                        A.isTrue( (lifeTime > 0) && (lifeTime < 10), 'lifeTime is greater 0' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoExample stateful': function() {
            var
                self = this,
                stateId = 'the-test-KoExample-component-on-the-testKoUI-page',
                component = Namespace.KoComponentManager.createComponent( {
                    stateId: stateId
                }, 'KoExample' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoExample' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * stateId check
                     */
                        function() {
                        stack.shift();

                        A.areEqual( peek( component.componentType ) + '-' + stateId, component.generateStateId(), 'given stateId with the prefix of componentType + \'-\'  and component.generateStateId are equal' );

                        next();
                    },
                    /**
                     * stateful check
                     */
                        function() {
                        stack.shift();

                        A.isUndefined( component.getState( 'somethingStateful' ), 'state of "somethingStateful" is undefined' );
                        A.isFalse( peek( component.somethingStateful ), '"somethingStateful" is false' );
                        A.isArray( peek( component.statesAvailable ), '"statesAvailable" is array' );
                        A.isTrue( peek( component.statesAvailable ).indexOf( 'somethingStateful' ) > -1, '"somethingStateful" is inside of "statesAvailable"' );
                        A.isArray( peek( component.states ), '"states" is array' );
                        A.isTrue( peek( component.states ).indexOf( 'somethingStateful' ) > -1, '"somethingStateful" is inside of "states"' );

                        next();
                    },
                    /**
                     * click check
                     */
                        function() {
                        stack.shift();
                        var
                            $checkbox = jQuery( 'input[type=checkbox]', domNode ),
                            checkbox = $checkbox[0];

                        A.isFalse( checkbox.checked, 'DOM checkbox checked is false' );

                        $checkbox.trigger( jQuery.Event( 'click' ) );

                        A.isTrue( checkbox.checked, 'DOM checkbox checked is true' );
                        A.isTrue( peek( component.somethingStateful ), '"somethingStateful" is true' );
                        A.isTrue( component.getState( 'somethingStateful' ), 'state of "somethingStateful" is true' );

                        next();
                    },
                    /**
                     * tearDown for stateful check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * setup for stateful check
                     */
                        function() {
                        stack.shift();

                        // things have to be re-done
                        component = Namespace.KoComponentManager.createComponent( {
                            stateId: stateId
                        }, 'KoExample' );
                        node = Y.Node.create( '<div data-bind="template: template"></div>' );
                        domNode = node.getDOMNode();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoExample' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * stateful again check
                     */
                        function() {
                        stack.shift();
                        var
                            $checkbox = jQuery( 'input[type=checkbox]', domNode ),
                            checkbox = $checkbox[0];

                        A.isTrue( component.getState( 'somethingStateful' ), 'after re-create state of "somethingStateful" is true' );
                        A.isTrue( peek( component.somethingStateful ), 'after re-create "somethingStateful" is true' );
                        A.isTrue( peek( component.somethingStateful ), 'after re-create "somethingStateful" is true' );
                        A.isTrue( checkbox.checked, 'after re-create DOM checkbox checked is true' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoExample template and event': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {}, 'KoExample' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoExample' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * templateName check
                     */
                        function() {
                        stack.shift();

                        A.areEqual( 'KoExample', peek( component.templateName ), 'component templateName is "KoExample"' );
                        A.isNotNull( domNode.querySelector( '.KoExample' ), 'node has template "KoExample"' );

                        next();
                    },
                    /**
                     * first click check
                     */
                        function() {
                        stack.shift();
                        var
                            $icon = jQuery( '.fa-refresh', domNode ),
                            eventFired = false,
                            eventTarget = component.events.on( 'KoExample-templateChanged', function( yEvent, data ) {
                                eventFired = true;
                                A.areEqual( 'KoExample-different', data.templateNameNew, 'first: "templateChanged" event data "templateNameNew" is "KoExample-different"' );
                                A.areEqual( 'KoExample', data.templateNameOld, 'first: "templateChanged" event data "templateNameOld" is "KoExample"' );
                            } );

                        $icon.trigger( jQuery.Event( 'click' ) );

                        A.isTrue( eventFired, 'first: "templateChanged" event fired' );
                        A.areEqual( 'KoExample-different', peek( component.templateName ), 'first: after click component templateName is "KoExample-different"' );
                        A.isNull( domNode.querySelector( '.KoExample' ), 'first: node has not template "KoExample"' );
                        A.isNotNull( domNode.querySelector( '.KoExample-different' ), 'first: node has template "KoExample-different"' );

                        eventTarget.detach();

                        next();
                    },
                    /**
                     * "somethingStateful" icon check
                     */
                        function() {
                        stack.shift();

                        A.isFalse( peek( component.somethingStateful ), '"somethingStateful" is false' );
                        A.isNotNull( domNode.querySelector( '.fa-ban' ), '"somethingStateful" is false - template should have ban icon' );
                        component.somethingStateful( true );
                        A.isTrue( peek( component.somethingStateful ), '"somethingStateful" is true' );
                        A.isNotNull( domNode.querySelector( '.fa-check' ), '"somethingStateful" is true - template should have check icon' );

                        next();
                    },
                    /**
                     * second click check
                     */
                        function() {
                        stack.shift();
                        var
                            $icon = jQuery( '.fa-refresh', domNode ),
                            eventFired = false,
                            eventTarget = component.events.on( 'KoExample-templateChanged', function( yEvent, data ) {
                                eventFired = true;
                                A.areEqual( 'KoExample', data.templateNameNew, 'second: "templateChanged" event data "templateNameNew" is "KoExample"' );
                                A.areEqual( 'KoExample-different', data.templateNameOld, 'second: "templateChanged" event data "templateNameOld" is "KoExample-different"' );
                            } );

                        $icon.trigger( jQuery.Event( 'click' ) );

                        A.isTrue( eventFired, 'second: "templateChanged" event fired' );
                        A.areEqual( 'KoExample', peek( component.templateName ), 'second: after click component templateName is "KoExample"' );
                        A.isNull( domNode.querySelector( '.KoExample-different' ), 'second: node has not template "KoExample-different"' );
                        A.isNotNull( domNode.querySelector( '.KoExample' ), 'second: node has template "KoExample"' );

                        eventTarget.detach();

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        }
    } ) );

    /**
     * KoUI KoButton tests
     */
    suite.add( new TestModule.TestCase( {
        // the test case
        name: 'KoUI KoButton tests',
        // stub
        setUp: function() {
            Namespace = Y.doccirrus.KoUI;
        },
        tearDown: function() {
            Namespace = null;
        },
        // tests
        'test KoButton': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {}, 'KoButton' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoButton' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * template check
                     */
                        function() {
                        stack.shift();

                        A.isNotNull( domNode.querySelector( 'button[type=button]' ), 'button element of type button in template' );
                        A.isNotNull( domNode.querySelector( '.KoButton' ), '"KoButton" class name in template' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoButton text': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {
                    text: 'test'
                }, 'KoButton' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoButton' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * text check
                     */
                        function() {
                        stack.shift();
                        function getText() {
                            var
                                result = domNode.querySelector( '.KoButton-text' );

                            if( result ) {
                                result = result.innerHTML;
                            }

                            return result;
                        }

                        A.areEqual( 'test', getText(), 'text equals "test" @.KoButton-text' );
                        component.text( undefined );
                        A.areEqual( null, getText(), 'no text > no node @.KoButton-text' );
                        component.text( 'test button' );
                        A.areEqual( 'test button', getText(), 'text equals "test button" @.KoButton-text' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoButton name': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {
                    text: 'test',
                    name: 'test'
                }, 'KoButton' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoButton' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * name check
                     */
                        function() {
                        stack.shift();
                        var
                            nameEl = domNode.querySelector( '[name=test]' );

                        A.isNotNull( nameEl, 'an element with "test" as name was found' );
                        component.name( undefined );
                        A.areEqual( '', nameEl.getAttribute( 'name' ), 'element with "test" as name shouldn\'t have name anymore' );
                        component.name( 'test name' );
                        A.areEqual( 'test name', nameEl.getAttribute( 'name' ), 'element with "test" as name should now have name attribute set to "test name"' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoButton icon': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {
                    text: 'test',
                    icon: 'CHEVRON_RIGHT'
                }, 'KoButton' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoButton' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * icon check
                     */
                        function() {
                        stack.shift();
                        var
                            iconEl = domNode.querySelector( '.fa' );

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoIcon' ), component.icon, 'icon isInstanceOf "KoIcon"' );
                        A.isNotNull( iconEl, 'element with "fa" class name found' );
                        A.isTrue( iconEl.classList.contains( 'fa-chevron-right' ), 'icon "CHEVRON_RIGHT" adds class name "fa-chevron-right"' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoButton title': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {
                    title: 'test'
                }, 'KoButton' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoButton' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * title check
                     */
                        function() {
                        stack.shift();
                        var
                            titleEl = domNode.querySelector( '[title=test]' );

                        A.isNotNull( titleEl, 'an element with "test" as title was found' );
                        component.title( undefined );
                        A.isNull( titleEl.getAttribute( 'title' ), 'element with "test" as title shouldn\'t have title attribute anymore' );
                        component.title( 'test title' );
                        A.areEqual( 'test title', titleEl.getAttribute( 'title' ), 'element with "test" as title should now have title attribute set to "test title"' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoButton click': function() {
            var
                self = this,
                CLICKED = false,
                component = Namespace.KoComponentManager.createComponent( {
                    text: 'test',
                    title: 'test',
                    click: function() {
                        CLICKED = true;
                    }
                }, 'KoButton' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoButton' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * click check
                     */
                        function() {
                        stack.shift();

                        A.isFalse( CLICKED, 'button wasn\'t clicked yet' );
                        domNode.querySelector( 'button[type=button]' ).click(); // better to use native "click" here, because of see next check
                        A.isTrue( CLICKED, 'button was clicked' );

                        next();
                    },
                    /**
                     * disabled click check
                     */
                        function() {
                        stack.shift();

                        CLICKED = false;
                        component.disabled( true );
                        A.isFalse( CLICKED, 'button wasn\'t clicked yet' );
                        A.isTrue( peek( component.disabled ), 'button is disabled' );
                        domNode.querySelector( 'button[type=button]' ).click(); // native "click" has respect of "disabled", whereas jQuery.trigger doesn't
                        A.isFalse( CLICKED, 'button was clicked, but not handled' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoButton visible': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {
                    text: 'test',
                    visible: false
                }, 'KoButton' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoButton' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * visible check
                     */
                        function() {
                        stack.shift();
                        var
                            KoButtonNode = node.one( '.KoButton' );

                        A.isNotNull( KoButtonNode, '"KoButton" node is available' );
                        A.isFalse( isNodeVisible( KoButtonNode ), '"KoButton" node is not visible' );

                        component.visible( true );
                        A.isTrue( isNodeVisible( KoButtonNode ), '"KoButton" node is visible' );

                        component.visible( false );
                        A.isFalse( isNodeVisible( KoButtonNode ), '"KoButton" node is not visible' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoButton size': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {
                    text: 'test'
                }, 'KoButton' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoButton' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * size check
                     */
                        function() {
                        stack.shift();
                        var
                            btnEl = domNode.querySelector( '.btn' ),
                            size = 0;

                        A.isNotNull( btnEl, '".btn" class name in template' );
                        A.areEqual( 'DEFAULT', peek( component.size ), 'size equals "DEFAULT"' );
                        component.size( 'XSMALL' );
                        A.isTrue( size < (size = btnEl.clientHeight), '"XSMALL" larger than 0' );
                        component.size( 'SMALL' );
                        A.isTrue( size < (size = btnEl.clientHeight), '"SMALL" larger than "XSMALL"' );
                        component.size( 'DEFAULT' );
                        A.isTrue( size < (size = btnEl.clientHeight), '"DEFAULT" larger than "SMALL"' );
                        component.size( 'LARGE' );
                        A.isTrue( size < (size = btnEl.clientHeight), '"LARGE" larger than "DEFAULT"' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoButton option': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {
                    text: 'test'
                }, 'KoButton' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoButton' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * option check
                     */
                        function() {
                        stack.shift();
                        var
                            btnEl = domNode.querySelector( '.btn' );

                        A.isNotNull( btnEl, '".btn" class name in template' );
                        A.areEqual( 'DEFAULT', peek( component.option ), 'option equals "DEFAULT"' );
                        A.isTrue( btnEl.classList.contains( 'btn-default' ), 'option "DEFAULT" adds class name "btn-default"' );

                        component.option( 'PRIMARY' );
                        A.areEqual( 'PRIMARY', peek( component.option ), 'option equals "PRIMARY"' );
                        A.isFalse( btnEl.classList.contains( 'btn-default' ), 'option "PRIMARY" removes previous class name "btn-default"' );
                        A.isTrue( btnEl.classList.contains( 'btn-primary' ), 'option "PRIMARY" adds class name "btn-primary"' );

                        component.option( 'SUCCESS' );
                        A.areEqual( 'SUCCESS', peek( component.option ), 'option equals "SUCCESS"' );
                        A.isFalse( btnEl.classList.contains( 'btn-primary' ), 'option "SUCCESS" removes previous class name "btn-primary"' );
                        A.isTrue( btnEl.classList.contains( 'btn-success' ), 'option "SUCCESS" adds class name "btn-success"' );

                        component.option( 'INFO' );
                        A.areEqual( 'INFO', peek( component.option ), 'option equals "INFO"' );
                        A.isFalse( btnEl.classList.contains( 'btn-success' ), 'option "INFO" removes previous class name "btn-success"' );
                        A.isTrue( btnEl.classList.contains( 'btn-info' ), 'option "INFO" adds class name "btn-info"' );

                        component.option( 'DANGER' );
                        A.areEqual( 'DANGER', peek( component.option ), 'option equals "DANGER"' );
                        A.isFalse( btnEl.classList.contains( 'btn-info' ), 'option "DANGER" removes previous class name "btn-info"' );
                        A.isTrue( btnEl.classList.contains( 'btn-danger' ), 'option "DANGER" adds class name "btn-danger"' );

                        component.option( 'LINK' );
                        A.areEqual( 'LINK', peek( component.option ), 'option equals "LINK"' );
                        A.isFalse( btnEl.classList.contains( 'btn-danger' ), 'option "LINK" removes previous class name "btn-danger"' );
                        A.isTrue( btnEl.classList.contains( 'btn-link' ), 'option "LINK" adds class name "btn-link"' );

                        component.option( 'DEFAULT' );
                        A.areEqual( 'DEFAULT', peek( component.option ), 'option equals "DEFAULT"' );
                        A.isFalse( btnEl.classList.contains( 'btn-link' ), 'option "DEFAULT" removes previous class name "btn-link"' );
                        A.isTrue( btnEl.classList.contains( 'btn-default' ), 'option "DEFAULT" adds class name "btn-default"' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoButton css': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {
                    text: 'test',
                    css: {'test-css': true}
                }, 'KoButton' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoButton' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * css check
                     */
                        function() {
                        stack.shift();
                        var
                            el = peek( component.elements )[0];

                        A.isTrue( el.classList.contains( 'test-css' ), 'element has class name "test-css"' );

                        next();
                    },
                    /**
                     * css with option check
                     */
                        function() {
                        stack.shift();
                        var
                            el = peek( component.elements )[0];

                        component.option( 'PRIMARY' );
                        A.isTrue( el.classList.contains( 'btn-primary' ), 'option "PRIMARY" adds class name "btn-primary"' );
                        A.isTrue( el.classList.contains( 'test-css' ), 'element still has class name "test-css"' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        }
    } ) );

    /**
     * KoUI KoMenu tests
     */
    suite.add( new TestModule.TestCase( {
        // the test case
        name: 'KoUI KoMenu tests',
        // stub
        setUp: function() {
            Namespace = Y.doccirrus.KoUI;
        },
        tearDown: function() {
            Namespace = null;
        },
        // tests
        'test KoMenu': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {
                    items: [
                        {
                            text: 'foo'
                        },
                        {
                            text: 'bar'
                        },
                        {
                            text: 'baz'
                        }
                    ]
                }, 'KoMenu' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();
                        var
                            items = peek( component.items );

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoMenu' ), component, 'isInstanceOf' );
                        A.isTrue( Array.isArray( items ), '"KoMenu" items is array' );
                        A.isTrue( 3 === items.length, '"KoMenu" items length is 3' );
                        items.forEach( function( item, index ) {
                            A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoMenuItem' ), item, 'item ' + (index + 1) + ' isInstanceOf "KoMenuItem"' );
                        } );

                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * template check
                     */
                        function() {
                        stack.shift();
                        var
                            el = domNode.querySelector( '.KoMenu' ),
                            elItems;

                        A.isNotNull( el, '"KoMenu" class name in template' );
                        elItems = el.querySelectorAll( '.KoMenuItem' );
                        A.isTrue( 3 === elItems.length, '"KoMenuItem" element items length is 3' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoMenu name': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {
                    items: [
                        {
                            name: 'menu-foo',
                            text: 'foo'
                        },
                        {
                            name: 'menu-bar',
                            text: 'bar'
                        },
                        {
                            name: 'menu-baz',
                            text: 'baz'
                        }
                    ]
                }, 'KoMenu' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoMenu' ), component, 'isInstanceOf' );

                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * name check
                     */
                        function() {
                        stack.shift();
                        var
                            KoMenuItemConstructor = Namespace.KoComponentManager.registeredComponent( 'KoMenuItem' ),
                            el = domNode.querySelector( '.KoMenu' ),
                            itemFoo = component.getItemByName( 'menu-foo' ),
                            itemBar = component.getItemByName( 'menu-bar' ),
                            itemBaz = component.getItemByName( 'menu-baz' ),
                            itemNotThere = component.getItemByName( 'menu-notThere' );

                        A.isNull( itemNotThere, 'item by name "menu-notThere" not found' );
                        A.areSame( itemNotThere, component.getItemDeepByName( 'menu-notThere' ), 'getItemByName "menu-notThere" and getItemDeepByName are same' );

                        A.isNotNull( itemFoo, 'item by name "menu-foo" found' );
                        A.areSame( itemFoo, component.getItemDeepByName( 'menu-foo' ), 'getItemByName "menu-foo" and getItemDeepByName are same' );
                        A.isInstanceOf( KoMenuItemConstructor, itemFoo, 'item by name "menu-foo" isInstanceOf "KoMenuItem"' );
                        A.isNotNull( el && el.querySelector( '.KoMenuItem [name=menu-foo]' ), 'element with name "menu-foo" found' );
                        A.isNotNull( itemBar, 'item by name "menu-bar" found' );
                        A.areSame( itemBar, component.getItemDeepByName( 'menu-bar' ), 'getItemByName "menu-bar" and getItemDeepByName are same' );
                        A.isInstanceOf( KoMenuItemConstructor, itemBar, 'item by name "menu-bar" isInstanceOf "KoMenuItem"' );
                        A.isNotNull( el && el.querySelector( '.KoMenuItem [name=menu-bar]' ), 'element with name "menu-bar" found' );
                        A.isNotNull( itemBaz, 'item by name "menu-baz" found' );
                        A.areSame( itemBaz, component.getItemDeepByName( 'menu-baz' ), 'getItemByName "menu-baz" and getItemDeepByName are same' );
                        A.isInstanceOf( KoMenuItemConstructor, itemBaz, 'item by name "menu-baz" isInstanceOf "KoMenuItem"' );
                        A.isNotNull( el && el.querySelector( '.KoMenuItem [name=menu-baz]' ), 'element with name "menu-baz" found' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoMenu menu': function() {
            var
                self = this,
                component = Namespace.KoComponentManager.createComponent( {
                    items: [
                        {
                            name: 'menu-foo',
                            text: 'foo'
                        },
                        {
                            name: 'menu-bar',
                            text: 'bar',
                            menu: {
                                items: [
                                    {
                                        name: 'menu-bar-foo',
                                        text: 'bar foo'
                                    },
                                    {
                                        name: 'menu-bar-bar',
                                        text: 'bar bar'
                                    },
                                    {
                                        name: 'menu-bar-baz',
                                        text: 'bar baz'
                                    }
                                ]
                            }
                        },
                        {
                            name: 'menu-baz',
                            text: 'baz',
                            menu: {
                                items: [
                                    {
                                        name: 'menu-baz-foo',
                                        text: 'baz foo'
                                    },
                                    {
                                        name: 'menu-baz-bar',
                                        text: 'baz bar',
                                        menu: {
                                            items: [
                                                {
                                                    name: 'menu-baz-bar-foo',
                                                    text: 'baz bar foo'
                                                },
                                                {
                                                    name: 'menu-baz-bar-bar',
                                                    text: 'baz bar bar'
                                                },
                                                {
                                                    name: 'menu-baz-bar-baz',
                                                    text: 'baz bar baz'
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        name: 'menu-baz-baz',
                                        text: 'baz baz'
                                    }
                                ]
                            }
                        }
                    ]
                }, 'KoMenu' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoMenu' ), component, 'isInstanceOf' );

                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * menu check
                     */
                        function() {
                        stack.shift();
                        var
                            KoMenuConstructor = Namespace.KoComponentManager.registeredComponent( 'KoMenu' ),
                            itemFoo = component.getItemByName( 'menu-foo' ),
                            itemBar = component.getItemByName( 'menu-bar' ),
                            itemBaz = component.getItemByName( 'menu-baz' ),
                            itemBazBar = component.getItemDeepByName( 'menu-baz-bar' );

                        A.isNull( peek( itemFoo.menu ), 'item by name "menu-foo"\'s menu is null' );

                        A.isInstanceOf( KoMenuConstructor, peek( itemBar.menu ), 'item by name "menu-bar"\'s menu isInstanceOf "KoMenu"' );
                        A.isInstanceOf( KoMenuConstructor, peek( itemBaz.menu ), 'item by name "menu-baz"\'s menu isInstanceOf "KoMenu"' );
                        A.isInstanceOf( KoMenuConstructor, peek( itemBazBar.menu ), 'getItemDeepByName "menu-baz-bar"\'s menu isInstanceOf "KoMenu"' );

                        next();
                    },
                    /**
                     * name check
                     */
                        function() {
                        stack.shift();
                        var
                            KoMenuItemConstructor = Namespace.KoComponentManager.registeredComponent( 'KoMenuItem' ),
                            el = domNode.querySelector( '.KoMenu' ),
                            itemBarFoo = component.getItemDeepByName( 'menu-bar-foo' ),
                            itemBazFoo = component.getItemDeepByName( 'menu-baz-foo' ),
                            itemBazBarBar = component.getItemDeepByName( 'menu-baz-bar-bar' ),
                            itemNotThere = component.getItemDeepByName( 'menu-notThere' );

                        A.isNull( itemNotThere, 'item by name "menu-notThere" not found' );
                        A.isNull( component.getItemByName( 'menu-bar-foo' ), 'getItemByName "menu-bar-foo" not found' );

                        A.isNotNull( itemBarFoo, 'getItemDeepByName "menu-foo" found' );
                        A.isInstanceOf( KoMenuItemConstructor, itemBarFoo, 'item by name "menu-bar-foo" isInstanceOf "KoMenuItem"' );
                        A.isNotNull( el && el.querySelector( '.KoMenuItem [name=menu-bar-foo]' ), 'element with name "menu-bar-foo" found' );
                        A.isNotNull( itemBazFoo, 'getItemDeepByName "menu-baz-foo" found' );
                        A.isInstanceOf( KoMenuItemConstructor, itemBazFoo, 'item by name "menu-baz-foo" isInstanceOf "KoMenuItem"' );
                        A.isNotNull( el && el.querySelector( '.KoMenuItem [name=menu-baz-foo]' ), 'element with name "menu-baz-foo" found' );
                        A.isNotNull( itemBazBarBar, 'getItemDeepByName "menu-baz-bar-bar" found' );
                        A.isInstanceOf( KoMenuItemConstructor, itemBazBarBar, 'item by name "menu-baz-bar-bar" isInstanceOf "KoMenuItem"' );
                        A.isNotNull( el && el.querySelector( '.KoMenuItem [name=menu-baz-bar-bar]' ), 'element with name "menu-baz-bar-bar" found' );

                        next();
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        }
    } ) );

    /**
     * KoUI KoFieldSelect2 tests
     */
    suite.add( new TestModule.TestCase( {
        // the test case
        name: 'KoUI KoFieldSelect2 tests',
        // stub
        setUp: function() {
            Namespace = Y.doccirrus.KoUI;
        },
        tearDown: function() {
            Namespace = null;
        },
        // tests
        'test KoFieldSelect2 simple options single': function() {
            var
                self = this,
                PLACEHOLDER = 'placeholder',
                INITIAL_VALUE = 'green',
                FIRST_VALUE = 'red',
                LAST_VALUE = 'blue',
                component = Namespace.KoComponentManager.createComponent( {
                    name: 'KoTableUsageConfigurationEntryList',
                    options: [FIRST_VALUE, INITIAL_VALUE, LAST_VALUE],
                    value: INITIAL_VALUE,
                    placeholder: PLACEHOLDER,
                    size: 'SMALL',
                    visible: true,
                    disabled: false,
                    title: 'title',
                    select2Config: {
                        multiple: false,
                        width: 130
                    }
                }, 'KoFieldSelect2' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoFieldSelect2' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * specific check
                     */
                        function() {
                        stack.shift();

                        var
                        //focusser = jQuery( '.select2-focusser', domNode ),
                            choice = jQuery( '.select2-choice', domNode ),
                            chosen = jQuery( '.select2-chosen', domNode ),
                            choiceClose = jQuery( '.select2-search-choice-close', choice );

                        A.areEqual( true, choice.is( ':visible' ), 'choice is visible' );
                        A.areEqual( INITIAL_VALUE, choice.text().trim(), 'choice displays initial value' );
                        A.areEqual( true, choiceClose.is( ':visible' ), 'close choice is visible' );

                        /*
                         focusser.focus();
                         focusser.trigger( jQuery.Event( 'keydown', {which: 46} ) ); // DELETE
                         */
                        choiceClose.trigger( jQuery.Event( 'mousedown' ) );
                        choiceClose.trigger( jQuery.Event( 'click' ) );

                        A.areEqual( PLACEHOLDER, choice.text().trim(), 'choice displays placeholder' );
                        A.areEqual( '', peek( component.value ), 'value is an empty string' );

                        chosen.trigger( jQuery.Event( 'mousedown' ) );
                        jQuery( document.activeElement ).trigger( jQuery.Event( 'keydown', {which: 13} ) );

                        A.areEqual( choice.text().trim(), peek( component.value ), 'choice displays chosen value' );
                        A.areEqual( FIRST_VALUE, peek( component.value ), 'value is first value in list' );

                        self.wait( next, 100 );
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoFieldSelect2 simple options single updateOnOptionsChanged': function() {
            var
                self = this,
                PLACEHOLDER = 'placeholder',
                INITIAL_VALUE = 'green',
                FIRST_VALUE = 'red',
                LAST_VALUE = 'blue',
                component = Namespace.KoComponentManager.createComponent( {
                    name: 'KoTableUsageConfigurationEntryList',
                    options: [],
                    updateOnOptionsChanged: true,
                    value: INITIAL_VALUE,
                    placeholder: PLACEHOLDER,
                    size: 'SMALL',
                    visible: true,
                    disabled: false,
                    title: 'title',
                    select2Config: {
                        multiple: false,
                        width: 130
                    }
                }, 'KoFieldSelect2' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoFieldSelect2' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * specific check
                     */
                        function() {
                        stack.shift();

                        var
                        //focusser = jQuery( '.select2-focusser', domNode ),
                            choice = jQuery( '.select2-choice', domNode ),
                            chosen = jQuery( '.select2-chosen', domNode ),
                            choiceClose = jQuery( '.select2-search-choice-close', choice );

                        A.areEqual( true, choice.is( ':visible' ), 'choice is visible' );
                        A.areEqual( PLACEHOLDER, choice.text().trim(), 'choice displays initial placeholder' );
                        A.areEqual( false, choiceClose.is( ':visible' ), 'close choice is not visible' );
                        A.areEqual( INITIAL_VALUE, peek( component.value ), 'value is initial value' );

                        component.options( [FIRST_VALUE, INITIAL_VALUE, LAST_VALUE] );

                        A.areEqual( true, choice.is( ':visible' ), 'choice is visible' );
                        A.areEqual( INITIAL_VALUE, choice.text().trim(), 'choice displays initial value' );
                        A.areEqual( true, choiceClose.is( ':visible' ), 'close choice is visible' );
                        A.areEqual( INITIAL_VALUE, peek( component.value ), 'value is initial value' );

                        /*
                         focusser.focus();
                         focusser.trigger( jQuery.Event( 'keydown', {which: 46} ) ); // DELETE
                         */
                        choiceClose.trigger( jQuery.Event( 'mousedown' ) );
                        choiceClose.trigger( jQuery.Event( 'click' ) );

                        A.areEqual( PLACEHOLDER, choice.text().trim(), 'choice displays placeholder' );
                        A.areEqual( '', peek( component.value ), 'value is an empty string' );

                        chosen.trigger( jQuery.Event( 'mousedown' ) );
                        jQuery( document.activeElement ).trigger( jQuery.Event( 'keydown', {which: 13} ) );

                        A.areEqual( choice.text().trim(), peek( component.value ), 'choice displays chosen value' );
                        A.areEqual( FIRST_VALUE, peek( component.value ), 'value is first value in list' );

                        self.wait( next, 100 );
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoFieldSelect2 complex options single': function() {
            var
                self = this,
                PLACEHOLDER = 'placeholder',
                INITIAL_VALUE_VAL = 'green',
                INITIAL_VALUE_I18N = 'Grün',
                INITIAL_VALUE = {val: INITIAL_VALUE_VAL, i18n: INITIAL_VALUE_I18N},
                FIRST_VALUE_VAL = 'red',
                FIRST_VALUE_I18N = 'Rot',
                FIRST_VALUE = {val: FIRST_VALUE_VAL, i18n: FIRST_VALUE_I18N},
                LAST_VALUE_VAL = 'blue',
                LAST_VALUE_I18N = 'Blau',
                LAST_VALUE = {val: LAST_VALUE_VAL, i18n: LAST_VALUE_I18N},
                component = Namespace.KoComponentManager.createComponent( {
                    name: 'KoTableUsageConfigurationEntryList',
                    optionsText: 'i18n',
                    optionsValue: 'val',
                    options: [FIRST_VALUE, INITIAL_VALUE, LAST_VALUE],
                    value: INITIAL_VALUE_VAL,
                    placeholder: PLACEHOLDER,
                    size: 'SMALL',
                    visible: true,
                    disabled: false,
                    title: 'title',
                    select2Config: {
                        multiple: false,
                        width: 130
                    }
                }, 'KoFieldSelect2' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoFieldSelect2' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * specific check
                     */
                        function() {
                        stack.shift();

                        var
                        //focusser = jQuery( '.select2-focusser', domNode ),
                            choice = jQuery( '.select2-choice', domNode ),
                            chosen = jQuery( '.select2-chosen', domNode ),
                            choiceClose = jQuery( '.select2-search-choice-close', choice );

                        A.areEqual( true, choice.is( ':visible' ), 'choice is visible' );
                        A.areEqual( INITIAL_VALUE_I18N, choice.text().trim(), 'choice displays initial value' );
                        A.areEqual( true, choiceClose.is( ':visible' ), 'close choice is visible' );

                        /*
                         focusser.focus();
                         focusser.trigger( jQuery.Event( 'keydown', {which: 46} ) ); // DELETE
                         */
                        choiceClose.trigger( jQuery.Event( 'mousedown' ) );
                        choiceClose.trigger( jQuery.Event( 'click' ) );

                        A.areEqual( PLACEHOLDER, choice.text().trim(), 'choice displays placeholder' );
                        A.areEqual( '', peek( component.value ), 'value is an empty string' );

                        chosen.trigger( jQuery.Event( 'mousedown' ) );
                        jQuery( document.activeElement ).trigger( jQuery.Event( 'keydown', {which: 13} ) );

                        A.areEqual( choice.text().trim(), FIRST_VALUE_I18N, 'choice displays chosen value' );
                        A.areEqual( FIRST_VALUE_VAL, peek( component.value ), 'value is first value in list' );

                        self.wait( next, 100 );
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoFieldSelect2 simple options multiple': function() {
            var
                self = this,
                PLACEHOLDER = 'placeholder',
                INITIAL_VALUE = 'green',
                FIRST_VALUE = 'red',
                LAST_VALUE = 'blue',
                component = Namespace.KoComponentManager.createComponent( {
                    name: 'KoTableUsageConfigurationEntryList',
                    options: [FIRST_VALUE, INITIAL_VALUE, LAST_VALUE],
                    value: [INITIAL_VALUE],
                    placeholder: PLACEHOLDER,
                    size: 'SMALL',
                    visible: true,
                    disabled: false,
                    title: 'title',
                    select2Config: {
                        multiple: true,
                        width: 130
                    }
                }, 'KoFieldSelect2' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoFieldSelect2' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * specific check
                     */
                        function() {
                        stack.shift();

                        var
                            select2Element = jQuery( 'input[data-bind]', domNode ),
                            select2 = select2Element.data( 'select2' ),
                            chosen = jQuery( '.select2-search-choice', domNode ),
                            choiceClose = jQuery( '.select2-search-choice-close', chosen );

                        A.areEqual( true, chosen.is( ':visible' ), 'choices are visible' );
                        A.areEqual( INITIAL_VALUE, chosen.text().trim(), 'choices displays initial value' );
                        A.areEqual( true, choiceClose.is( ':visible' ), 'close choice is visible' );

                        choiceClose.first().trigger( jQuery.Event( 'mousedown' ) );
                        choiceClose.first().trigger( jQuery.Event( 'click' ) );

                        A.areEqual( true, Array.isArray( peek( component.value ) ) && 0 === peek( component.value ).length, 'value is an empty array' );

                        /*setTimeout( function() {
                         focusser.blur();
                         }, 0 );*/
                        select2.search.trigger( jQuery.Event( 'click' ) );
                        select2.dropdown.trigger( jQuery.Event( 'mouseup', {target: select2.results.find( '.select2-result' ).first()[0]} ) );

                        select2.search.trigger( jQuery.Event( 'click' ) );
                        select2.dropdown.trigger( jQuery.Event( 'mouseup', {target: select2.results.find( '.select2-result' ).last()[0]} ) );

                        A.areEqual( true, JSON.stringify( peek( component.value ) ) === JSON.stringify( jQuery( '.select2-search-choice', domNode ).toArray().map( function( el ) {
                            return jQuery( el ).text().trim();
                        } ) ), 'value is shown choices' );

                        A.areEqual( true, Array.isArray( peek( component.value ) ) && 2 === peek( component.value ).length && 0 === peek( component.value ).indexOf( FIRST_VALUE ) && 1 === peek( component.value ).indexOf( LAST_VALUE ), 'value is first and last list entries' );

                        self.wait( next, 100 );
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoFieldSelect2 simple options multiple updateOnOptionsChanged': function() {
            var
                self = this,
                PLACEHOLDER = 'placeholder',
                INITIAL_VALUE = 'green',
                FIRST_VALUE = 'red',
                LAST_VALUE = 'blue',
                component = Namespace.KoComponentManager.createComponent( {
                    name: 'KoTableUsageConfigurationEntryList',
                    options: [],
                    value: [INITIAL_VALUE],
                    updateOnOptionsChanged: true,
                    placeholder: PLACEHOLDER,
                    size: 'SMALL',
                    visible: true,
                    disabled: false,
                    title: 'title',
                    select2Config: {
                        multiple: true,
                        width: 130
                    }
                }, 'KoFieldSelect2' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoFieldSelect2' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * specific check
                     */
                        function() {
                        stack.shift();

                        var
                            select2Element = jQuery( 'input[data-bind]', domNode ),
                            select2 = select2Element.data( 'select2' ),
                            chosen = jQuery( '.select2-search-choice', domNode ),
                            choiceClose = jQuery( '.select2-search-choice-close', chosen );

                        A.areEqual( false, chosen.is( ':visible' ), 'choices are not visible' );
                        A.areEqual( '', chosen.text().trim(), 'choices displays an empty string' );
                        A.areEqual( false, choiceClose.is( ':visible' ), 'close choice is not visible' );

                        component.options( [FIRST_VALUE, INITIAL_VALUE, LAST_VALUE] );

                        chosen = jQuery( '.select2-search-choice', domNode );
                        choiceClose = jQuery( '.select2-search-choice-close', chosen );

                        A.areEqual( true, chosen.is( ':visible' ), 'choices are visible' );
                        A.areEqual( INITIAL_VALUE, chosen.text().trim(), 'choices displays initial value' );
                        A.areEqual( true, choiceClose.is( ':visible' ), 'close choice is visible' );

                        choiceClose.first().trigger( jQuery.Event( 'mousedown' ) );
                        choiceClose.first().trigger( jQuery.Event( 'click' ) );

                        A.areEqual( true, Array.isArray( peek( component.value ) ) && 0 === peek( component.value ).length, 'value is an empty array' );

                        /*setTimeout( function() {
                         focusser.blur();
                         }, 0 );*/
                        select2.search.trigger( jQuery.Event( 'click' ) );
                        select2.dropdown.trigger( jQuery.Event( 'mouseup', {target: select2.results.find( '.select2-result' ).first()[0]} ) );

                        select2.search.trigger( jQuery.Event( 'click' ) );
                        select2.dropdown.trigger( jQuery.Event( 'mouseup', {target: select2.results.find( '.select2-result' ).last()[0]} ) );

                        A.areEqual( true, JSON.stringify( peek( component.value ) ) === JSON.stringify( jQuery( '.select2-search-choice', domNode ).toArray().map( function( el ) {
                            return jQuery( el ).text().trim();
                        } ) ), 'value is shown choices' );

                        A.areEqual( true, Array.isArray( peek( component.value ) ) && 2 === peek( component.value ).length && 0 === peek( component.value ).indexOf( FIRST_VALUE ) && 1 === peek( component.value ).indexOf( LAST_VALUE ), 'value is first and last list entries' );

                        self.wait( next, 100 );
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoFieldSelect2 complex options multiple': function() {
            var
                self = this,
                PLACEHOLDER = 'placeholder',
                INITIAL_VALUE_VAL = 'green',
                INITIAL_VALUE_I18N = 'Grün',
                INITIAL_VALUE = {val: INITIAL_VALUE_VAL, i18n: INITIAL_VALUE_I18N},
                FIRST_VALUE_VAL = 'red',
                FIRST_VALUE_I18N = 'Rot',
                FIRST_VALUE = {val: FIRST_VALUE_VAL, i18n: FIRST_VALUE_I18N},
                LAST_VALUE_VAL = 'blue',
                LAST_VALUE_I18N = 'Blau',
                LAST_VALUE = {val: LAST_VALUE_VAL, i18n: LAST_VALUE_I18N},
                component = Namespace.KoComponentManager.createComponent( {
                    name: 'KoTableUsageConfigurationEntryList',
                    optionsText: 'i18n',
                    optionsValue: 'val',
                    options: [FIRST_VALUE, INITIAL_VALUE, LAST_VALUE],
                    value: [INITIAL_VALUE_VAL],
                    placeholder: PLACEHOLDER,
                    size: 'SMALL',
                    visible: true,
                    disabled: false,
                    title: 'title',
                    select2Config: {
                        multiple: true,
                        width: 130
                    }
                }, 'KoFieldSelect2' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoFieldSelect2' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * specific check
                     */
                        function() {
                        stack.shift();

                        var
                            select2Element = jQuery( 'input[data-bind]', domNode ),
                            select2 = select2Element.data( 'select2' ),
                            chosen = jQuery( '.select2-search-choice', domNode ),
                            choiceClose = jQuery( '.select2-search-choice-close', chosen );

                        A.areEqual( true, chosen.is( ':visible' ), 'choices are visible' );
                        A.areEqual( INITIAL_VALUE_I18N, chosen.text().trim(), 'choices displays initial value' );
                        A.areEqual( true, choiceClose.is( ':visible' ), 'close choice is visible' );

                        choiceClose.first().trigger( jQuery.Event( 'mousedown' ) );
                        choiceClose.first().trigger( jQuery.Event( 'click' ) );

                        A.areEqual( true, Array.isArray( peek( component.value ) ) && 0 === peek( component.value ).length, 'value is an empty array' );

                        /*setTimeout( function() {
                         focusser.blur();
                         }, 0 );*/
                        select2.search.trigger( jQuery.Event( 'click' ) );
                        select2.dropdown.trigger( jQuery.Event( 'mouseup', {target: select2.results.find( '.select2-result' ).first()[0]} ) );

                        select2.search.trigger( jQuery.Event( 'click' ) );
                        select2.dropdown.trigger( jQuery.Event( 'mouseup', {target: select2.results.find( '.select2-result' ).last()[0]} ) );

                        A.areEqual( true, Array.isArray( peek( component.value ) ) && JSON.stringify( peek( component.value ).map( function( val ) {
                            switch( val ) {
                                case FIRST_VALUE_VAL:
                                    return FIRST_VALUE_I18N;
                                case INITIAL_VALUE_VAL:
                                    return INITIAL_VALUE_I18N;
                                case LAST_VALUE_VAL:
                                    return LAST_VALUE_I18N;
                                default:
                                    return null;
                            }
                        } ) ) === JSON.stringify( jQuery( '.select2-search-choice', domNode ).toArray().map( function( el ) {
                            return jQuery( el ).text().trim();
                        } ) ), 'value is shown choices' );

                        A.areEqual( true, Array.isArray( peek( component.value ) ) && 2 === peek( component.value ).length && 0 === peek( component.value ).indexOf( FIRST_VALUE_VAL ) && 1 === peek( component.value ).indexOf( LAST_VALUE_VAL ), 'value is first and last list entries' );

                        self.wait( next, 100 );
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test KoFieldSelect2 complex options multiple updateOnOptionsChanged': function() {
            var
                self = this,
                PLACEHOLDER = 'placeholder',
                INITIAL_VALUE_VAL = 'green',
                INITIAL_VALUE_I18N = 'Grün',
                INITIAL_VALUE = {val: INITIAL_VALUE_VAL, i18n: INITIAL_VALUE_I18N},
                FIRST_VALUE_VAL = 'red',
                FIRST_VALUE_I18N = 'Rot',
                FIRST_VALUE = {val: FIRST_VALUE_VAL, i18n: FIRST_VALUE_I18N},
                LAST_VALUE_VAL = 'blue',
                LAST_VALUE_I18N = 'Blau',
                LAST_VALUE = {val: LAST_VALUE_VAL, i18n: LAST_VALUE_I18N},
                component = Namespace.KoComponentManager.createComponent( {
                    name: 'KoTableUsageConfigurationEntryList',
                    optionsText: 'i18n',
                    optionsValue: 'val',
                    options: [],
                    value: [INITIAL_VALUE_VAL],
                    updateOnOptionsChanged: true,
                    placeholder: PLACEHOLDER,
                    size: 'SMALL',
                    visible: true,
                    disabled: false,
                    title: 'title',
                    select2Config: {
                        multiple: true,
                        width: 130
                    }
                }, 'KoFieldSelect2' ),
                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),

                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoFieldSelect2' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * specific check
                     */
                        function() {
                        stack.shift();

                        var
                            select2Element = jQuery( 'input[data-bind]', domNode ),
                            select2 = select2Element.data( 'select2' ),
                            chosen = jQuery( '.select2-search-choice', domNode ),
                            choiceClose = jQuery( '.select2-search-choice-close', chosen );

                        A.areEqual( false, chosen.is( ':visible' ), 'choices are not visible' );
                        A.areEqual( '', chosen.text().trim(), 'choices displays an empty string' );
                        A.areEqual( false, choiceClose.is( ':visible' ), 'close choice is not visible' );

                        component.options( [FIRST_VALUE, INITIAL_VALUE, LAST_VALUE] );

                        chosen = jQuery( '.select2-search-choice', domNode );
                        choiceClose = jQuery( '.select2-search-choice-close', chosen );

                        A.areEqual( true, chosen.is( ':visible' ), 'choices are visible' );
                        A.areEqual( INITIAL_VALUE_I18N, chosen.text().trim(), 'choices displays initial value' );
                        A.areEqual( true, choiceClose.is( ':visible' ), 'close choice is visible' );

                        choiceClose.first().trigger( jQuery.Event( 'mousedown' ) );
                        choiceClose.first().trigger( jQuery.Event( 'click' ) );

                        A.areEqual( true, Array.isArray( peek( component.value ) ) && 0 === peek( component.value ).length, 'value is an empty array' );

                        /*setTimeout( function() {
                         focusser.blur();
                         }, 0 );*/
                        select2.search.trigger( jQuery.Event( 'click' ) );
                        select2.dropdown.trigger( jQuery.Event( 'mouseup', {target: select2.results.find( '.select2-result' ).first()[0]} ) );

                        select2.search.trigger( jQuery.Event( 'click' ) );
                        select2.dropdown.trigger( jQuery.Event( 'mouseup', {target: select2.results.find( '.select2-result' ).last()[0]} ) );

                        A.areEqual( true, Array.isArray( peek( component.value ) ) && JSON.stringify( peek( component.value ).map( function( val ) {
                            switch( val ) {
                                case FIRST_VALUE_VAL:
                                    return FIRST_VALUE_I18N;
                                case INITIAL_VALUE_VAL:
                                    return INITIAL_VALUE_I18N;
                                case LAST_VALUE_VAL:
                                    return LAST_VALUE_I18N;
                                default:
                                    return null;
                            }
                        } ) ) === JSON.stringify( jQuery( '.select2-search-choice', domNode ).toArray().map( function( el ) {
                            return jQuery( el ).text().trim();
                        } ) ), 'value is shown choices' );

                        A.areEqual( true, Array.isArray( peek( component.value ) ) && 2 === peek( component.value ).length && 0 === peek( component.value ).indexOf( FIRST_VALUE_VAL ) && 1 === peek( component.value ).indexOf( LAST_VALUE_VAL ), 'value is first and last list entries' );

                        self.wait( next, 100 );
                    },
                    /**
                     * tearDown check
                     */
                        function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];
            stack[0]();

        },
        'test koPrintButton': function() {
            var
                self = this,
                component = Namespace.componentManager.createComponent( {
                    name: 'KoPrintButton',
                    text: 'test koprint',
                    title: 'test koprint',
                    click: function() {
                        Y.log( 'Clicked test print button.', 'debug', NAME );
                    }
                }, 'KoPrintButton' ),

                node = Y.Node.create( '<div data-bind="template: template"></div>' ),
                domNode = node.getDOMNode(),
                next = function() {
                    if( stack[0] ) {
                        stack[0]();// next waiting
                    }
                },
                stack = [
                    /**
                     * setup check
                     */
                        function() {
                        stack.shift();

                        A.isInstanceOf( Namespace.KoComponentManager.registeredComponent( 'KoButton' ), component, 'isInstanceOf' );
                        componentStandardSetup( component, node );

                        self.wait( next, 100 );
                    },
                    /**
                     * option check
                     */
                        function() {
                        stack.shift();
                        var
                            btnEl = domNode.querySelector( '.btn' );

                        A.isNotNull( btnEl, '".btn" class name in template' );
                        A.areEqual( 'DEFAULT', peek( component.option ), 'option equals "DEFAULT"' );
                        A.isTrue( btnEl.classList.contains( 'btn-default' ), 'option "DEFAULT" adds class name "btn-default"' );

                        component.option( 'PRIMARY' );
                        A.areEqual( 'PRIMARY', peek( component.option ), 'option equals "PRIMARY"' );
                        A.isFalse( btnEl.classList.contains( 'btn-default' ), 'option "PRIMARY" removes previous class name "btn-default"' );
                        A.isTrue( btnEl.classList.contains( 'btn-primary' ), 'option "PRIMARY" adds class name "btn-primary"' );

                        component.option( 'SUCCESS' );
                        A.areEqual( 'SUCCESS', peek( component.option ), 'option equals "SUCCESS"' );
                        A.isFalse( btnEl.classList.contains( 'btn-primary' ), 'option "SUCCESS" removes previous class name "btn-primary"' );
                        A.isTrue( btnEl.classList.contains( 'btn-success' ), 'option "SUCCESS" adds class name "btn-success"' );

                        component.option( 'INFO' );
                        A.areEqual( 'INFO', peek( component.option ), 'option equals "INFO"' );
                        A.isFalse( btnEl.classList.contains( 'btn-success' ), 'option "INFO" removes previous class name "btn-success"' );
                        A.isTrue( btnEl.classList.contains( 'btn-info' ), 'option "INFO" adds class name "btn-info"' );

                        component.option( 'DANGER' );
                        A.areEqual( 'DANGER', peek( component.option ), 'option equals "DANGER"' );
                        A.isFalse( btnEl.classList.contains( 'btn-info' ), 'option "DANGER" removes previous class name "btn-info"' );
                        A.isTrue( btnEl.classList.contains( 'btn-danger' ), 'option "DANGER" adds class name "btn-danger"' );

                        component.option( 'LINK' );
                        A.areEqual( 'LINK', peek( component.option ), 'option equals "LINK"' );
                        A.isFalse( btnEl.classList.contains( 'btn-danger' ), 'option "LINK" removes previous class name "btn-danger"' );
                        A.isTrue( btnEl.classList.contains( 'btn-link' ), 'option "LINK" adds class name "btn-link"' );

                        component.option( 'DEFAULT' );
                        A.areEqual( 'DEFAULT', peek( component.option ), 'option equals "DEFAULT"' );
                        A.isFalse( btnEl.classList.contains( 'btn-link' ), 'option "DEFAULT" removes previous class name "btn-link"' );
                        A.isTrue( btnEl.classList.contains( 'btn-default' ), 'option "DEFAULT" adds class name "btn-default"' );

                        next();
                    },
                    /**
                     * tearDown check
                     */

                    function() {
                        stack.shift();

                        componentStandardTearDown( component, node );

                        self.wait( next, 100 );
                    }
                ];

            stack[0]();

        }
    } ) );

    TestModule.TestRunner.add( suite );

}, '0.0.1', {
    requires: [
        'node-event-simulate',

        'dc-client-test',
        'KoUI-all'
    ]
} );
