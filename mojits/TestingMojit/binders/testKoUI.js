/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
'use strict';
/* eslint-disable */
YUI.add( 'testKoUI-binder-index', function( Y, NAME ) {
    var
        testNs = Y.doccirrus.test,
        TestModule = testNs.getTestModule(),
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        KoEditableTable = KoComponentManager.registeredComponent( 'KoEditableTable' );

    function TestViewModel( data ) {
        var
            self = this;
        self.checkbox = ko.observable( data.checkbox );

        self.lastname = ko.observable( data.lastname );
        self.lastname.hasError = ko.computed( function() {
            return !unwrap( self.lastname );
        } );
        self.firstname = ko.observable( data.firstname );
        self.multiSelect2 = ko.observableArray( data.multiSelect2 );
        self.firstname.validationMessages = ko.observableArray();
        self.firstname.hasError = ko.computed( function() {
            var
                msg = [],
                firstname = unwrap( self.firstname );
            self.firstname.validationMessages.removeAll();
            if( !firstname ) {
                msg.push( 'OMG there is an error!' );
            }
            self.firstname.validationMessages( msg );
            return !firstname;
        } );
        self.firstname.readOnly = ko.computed( function() {
            var
                lastname = unwrap( self.lastname );
            return 'bar1' === lastname || 'bar6' === lastname;
        } );

        self.group = ko.observable( data.group );
        self.group.disabled = ko.computed( function() {
            var
                firstname = unwrap( self.firstname );
            return 'disable group' === firstname;
        } );

        self.someFloat = ko.observable( data.someFloat );
        self.someFloat.placeholder = ko.computed( function() {
            var
                lastname = unwrap( self.lastname );
            if( !lastname ) {
                return 'set lastname!';
            } else {
                return 'someFloat';
            }

        } );

        ko.computed( function() {
            var
                someFloat = unwrap( self.someFloat );
            if( !ko.computedContext.isInitial() ) {
                console.warn( 'someFloat in editable ko table has been changed to: ', someFloat );
            }

        } );

        self.select2 = ko.observable( data.select2 );
        self.notes = ko.observable( data.notes );
        self.notes.placeholder = 'your notes';
        self.notes.hasWarn = ko.observable( false );
        self.notes.subscribe( function( newValue ) {
            self.notes.hasWarn( newValue && 20 < newValue.length );
        } );
        self.nested = ko.observable( data.nested );
        self.disabledField = ko.observable( data.disabledField );
        self.disabledField.disabled = ko.computed( function() {
            var
                firstname = unwrap( self.firstname );
            return Boolean( firstname );
        } );
        self.timestamp = ko.observable( data.timestamp );
        self.dob = ko.observable( data.dob );
        // self.virtual = ko.computed( function() {
        //     return unwrap( self.firstname ) + ' ' + unwrap( self.lastname );
        // } );
        self.virtual = ko.computed( {
            read: function() {
                var
                    value1 = unwrap( self.firstname ),
                    value2 = unwrap( self.lastname );
                return {
                    value1: value1,
                    value2: value2
                };
            },
            write: function( value ) {
                self.firstname( value.value1 );
                self.lastname( value.value2 );
            }
        } );
    }

    TestViewModel.prototype = {
        toJSON: function() {
            var
                self = this;
            return {
                firstname: peek( self.firstname ),
                lastname: peek( self.lastname ),
                someFloat: peek( self.someFloat ),
                nested: peek( self.nested ),
                timestamp: peek( self.timestamp ),
                dob: peek( self.dob )
            };
        },
        destroy: function() {
            console.warn( 'Method "destroy" of view model has been called' );
        }
    };

    Y.namespace( "mojito.binders" )[ NAME ] = {

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
                aKoButton = KoComponentManager.createComponent( {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'aKoButton',
                        text: 'KoButton',
                        title: 'KoButton',
                        icon: 'CHEVRON_RIGHT',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        click: function() {
                            console.warn( 'clicked a KoButton', arguments, this );
                        }
                    }
                } ),
                aKoPrintButton = KoComponentManager.createComponent( {
                    componentType: 'KoPrintButton',
                    componentConfig: {
                        name: 'aKoPrintButton',
                        formId: '',
                        formRole: 'startform',
                        text: 'KoPrintButton',
                        title: 'KoPrintButton',
                        icon: 'PRINT',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        click: function( printerName ) {
                            console.warn( 'clicked a KoPrintPrintButton, printerName: ', printerName, 'args: ', arguments, this );
                        }

                    }
                } ),
                aKoMenu = KoComponentManager.createComponent( {
                    componentType: 'KoMenu',
                    componentConfig: {
                        items: [
                            {
                                name: 'menu-foo',
                                text: 'foo',
                                title: 'foo',
                                icon: 'PLUS',
                                disabled: true,
                                click: function() {
                                    console.warn( 'clicked foo', arguments, this );
                                }
                            },
                            {
                                name: 'menu-bar',
                                text: 'bar',
                                title: 'bar',
                                icon: 'CHEVRON_RIGHT',
                                click: function() {
                                    console.warn( 'clicked bar', arguments, this );
                                }
                            },
                            {
                                separator: true
                            },
                            {
                                name: 'menu-baz',
                                text: 'baz',
                                title: 'baz',
                                click: function() {
                                    console.warn( 'clicked baz', arguments, this );
                                },
                                menu: {
                                    items: [
                                        {
                                            name: 'menu-baz-foo',
                                            text: 'baz menu foo',
                                            title: 'baz menu foo',
                                            icon: 'LIST_ALT',
                                            disabled: true,
                                            click: function() {
                                                console.warn( 'clicked baz menu foo', arguments, this );
                                            },
                                            menu: {
                                                items: [
                                                    {
                                                        name: 'menu-baz-foo-foo',
                                                        text: 'baz menu foo menu foo',
                                                        disabled: true,
                                                        click: function() {
                                                            console.warn( 'clicked baz menu foo menu foo', arguments, this );
                                                        }
                                                    },
                                                    {
                                                        name: 'menu-baz-foo-bar',
                                                        text: 'baz menu foo menu bar',
                                                        click: function() {
                                                            console.warn( 'clicked baz menu foo menu bar', arguments, this );
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            name: 'menu-baz-bar',
                                            text: 'baz menu bar',
                                            title: 'baz menu bar',
                                            icon: 'LIST_ALT',
                                            click: function() {
                                                console.warn( 'clicked baz menu bar', arguments, this );
                                            },
                                            menu: {
                                                items: [
                                                    {
                                                        name: 'menu-baz-bar-foo',
                                                        text: 'baz menu bar menu foo',
                                                        disabled: true,
                                                        click: function() {
                                                            console.warn( 'clicked baz menu bar menu foo', arguments, this );
                                                        }
                                                    },
                                                    {
                                                        name: 'menu-baz-bar-bar',
                                                        text: 'baz menu bar menu bar',
                                                        click: function() {
                                                            console.warn( 'clicked baz menu bar menu bar', arguments, this );
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            name: 'menu-baz-baz',
                                            text: 'baz menu baz',
                                            title: 'baz menu baz',
                                            icon: 'LIST_ALT',
                                            click: function() {
                                                console.warn( 'clicked baz menu baz', arguments, this );
                                            },
                                            menu: {
                                                items: [
                                                    {
                                                        name: 'menu-baz-baz-foo',
                                                        text: 'baz menu baz menu foo',
                                                        disabled: true,
                                                        click: function() {
                                                            console.warn( 'clicked baz menu baz menu foo', arguments, this );
                                                        }
                                                    },
                                                    {
                                                        name: 'menu-baz-baz-bar',
                                                        text: 'baz menu baz menu bar',
                                                        click: function() {
                                                            console.warn( 'clicked baz menu baz menu bar', arguments, this );
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                } ),
                aKoButtonDropDown = KoComponentManager.createComponent( {
                    componentType: 'KoButtonDropDown',
                    componentConfig: {
                        name: 'aKoButtonDropDown',
                        text: 'Tools',
                        title: 'KoButtonDropDown',
                        icon: 'GEAR',
                        option: 'PRIMARY',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        menu: {
                            items: [
                                {
                                    name: 'menu-foo',
                                    text: 'foo',
                                    title: 'foo',
                                    icon: 'PLUS',
                                    disabled: true,
                                    click: function() {
                                        console.warn( 'clicked foo', arguments, this );
                                    }
                                },
                                {
                                    name: 'menu-bar',
                                    text: 'bar',
                                    title: 'bar',
                                    icon: 'CHEVRON_RIGHT',
                                    click: function() {
                                        console.warn( 'clicked bar', arguments, this );
                                    }
                                },
                                {
                                    separator: true
                                },
                                {
                                    name: 'menu-baz',
                                    text: 'baz',
                                    title: 'baz',
                                    click: function() {
                                        console.warn( 'clicked baz', arguments, this );
                                    },
                                    menu: {
                                        items: [
                                            {
                                                name: 'menu-baz-foo',
                                                text: 'baz menu foo',
                                                title: 'baz menu foo',
                                                icon: 'LIST_ALT',
                                                disabled: true,
                                                click: function() {
                                                    console.warn( 'clicked baz menu foo', arguments, this );
                                                },
                                                menu: {
                                                    items: [
                                                        {
                                                            name: 'menu-baz-foo-foo',
                                                            text: 'baz menu foo menu foo',
                                                            disabled: true,
                                                            click: function() {
                                                                console.warn( 'clicked baz menu foo menu foo', arguments, this );
                                                            }
                                                        },
                                                        {
                                                            name: 'menu-baz-foo-bar',
                                                            text: 'baz menu foo menu bar',
                                                            click: function() {
                                                                console.warn( 'clicked baz menu foo menu bar', arguments, this );
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                name: 'menu-baz-bar',
                                                text: 'baz menu bar',
                                                title: 'baz menu bar',
                                                icon: 'LIST_ALT',
                                                click: function() {
                                                    console.warn( 'clicked baz menu bar', arguments, this );
                                                },
                                                menu: {
                                                    items: [
                                                        {
                                                            name: 'menu-baz-bar-foo',
                                                            text: 'baz menu bar menu foo',
                                                            disabled: true,
                                                            click: function() {
                                                                console.warn( 'clicked baz menu bar menu foo', arguments, this );
                                                            }
                                                        },
                                                        {
                                                            name: 'menu-baz-bar-bar',
                                                            text: 'baz menu bar menu bar',
                                                            click: function() {
                                                                console.warn( 'clicked baz menu bar menu bar', arguments, this );
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                name: 'menu-baz-baz',
                                                text: 'baz menu baz',
                                                title: 'baz menu baz',
                                                icon: 'LIST_ALT',
                                                click: function() {
                                                    console.warn( 'clicked baz menu baz', arguments, this );
                                                },
                                                menu: {
                                                    items: [
                                                        {
                                                            name: 'menu-baz-baz-foo',
                                                            text: 'baz menu baz menu foo',
                                                            disabled: true,
                                                            click: function() {
                                                                console.warn( 'clicked baz menu baz menu foo', arguments, this );
                                                            }
                                                        },
                                                        {
                                                            name: 'menu-baz-baz-bar',
                                                            text: 'baz menu baz menu bar',
                                                            click: function() {
                                                                console.warn( 'clicked baz menu baz menu bar', arguments, this );
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                } ),
                aKoTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'an-unique-id-describing-my-table', // @see: KoConfigurable.prototype.stateId
                        states: [ 'limit', 'usageConfigurationValue', 'usageShortcutsVisible' ], // @see: KoTable.prototype.statesAvailable || KoConfigurable.prototype.states
                        fillRowsToLimit: true,
                        limit: 5,
                        limitList: [ 1, 5, 15 ],
                        data: ko.observableArray( [
                            {
                                firstname: 'foo1',
                                lastname: 'bar',
                                someFloat: 3.1,
                                nested: [ { foo: 'bar1' } ],
                                timestamp: '2016-06-15T15:19:50.783Z',
                                dob: '1996-06-15T15:19:50.783Z'
                            },
                            {
                                firstname: 'foo2',
                                lastname: 'bar',
                                someFloat: 3.2,
                                nested: [ { foo: 'bar2' } ],
                                timestamp: '2016-04-20T10:45:32.358Z',
                                dob: '1996-04-20T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo3',
                                lastname: 'bar',
                                someFloat: 3.1,
                                nested: [ { foo: 'bar3' } ],
                                timestamp: '2016-02-18T10:45:32.358Z',
                                dob: '1996-02-18T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo4',
                                lastname: 'bar',
                                someFloat: 3.0,
                                nested: [ { foo: 'bar4' } ],
                                timestamp: '2016-01-15T10:45:32.358Z',
                                dob: '1996-01-15T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo1',
                                lastname: 'bar1',
                                someFloat: 0.2,
                                nested: [ { foo: 'bar5' } ],
                                timestamp: '2016-01-10T10:45:32.358Z',
                                dob: '1996-01-10T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo6',
                                lastname: 'bar6',
                                someFloat: (4 / 3),
                                nested: [ { foo: 'bar6' } ],
                                timestamp: '2015-10-11T10:45:32.358Z',
                                dob: '1995-10-11T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo7',
                                lastname: '1bar7',
                                someFloat: (5 / 3),
                                nested: [ { foo: 'bar7' } ],
                                timestamp: '2015-09-01T10:45:32.358Z',
                                dob: '1995-09-01T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo8',
                                lastname: '10bar8',
                                someFloat: (6 / 3),
                                nested: [ { foo: 'bar8' } ],
                                timestamp: '2015-08-16T10:45:32.358Z',
                                dob: '1995-08-16T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo9',
                                lastname: '2bar9',
                                someFloat: (7 / 3),
                                nested: [ { foo: 'bar9' } ],
                                timestamp: '2015-07-14T10:45:32.358Z',
                                dob: '1995-07-14T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo10',
                                lastname: 'bar10',
                                someFloat: (8 / 3),
                                nested: [ { foo: 'bar10' } ],
                                timestamp: '2015-05-10T10:45:32.358Z',
                                dob: '1995-05-10T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo2',
                                lastname: 'barig2',
                                someFloat: 0,
                                nested: [ { foo: 'bar11' } ],
                                timestamp: '2015-03-18T10:45:32.358Z',
                                dob: '1995-03-18T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo3',
                                lastname: 'bärig2',
                                someFloat: (1 / 3),
                                nested: [ { foo: 'bar12' } ],
                                timestamp: '2014-08-18T10:45:32.358Z',
                                dob: '1994-08-18T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo4',
                                lastname: 'barig4',
                                someFloat: (2 / 3),
                                nested: [ { foo: 'bar13' } ],
                                timestamp: '2014-06-12T10:45:32.358Z',
                                dob: '1994-06-12T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo5',
                                lastname: 'Bar5',
                                someFloat: (3 / 3),
                                nested: [ { foo: 'bar14' } ],
                                timestamp: '2014-03-10T10:45:32.358Z',
                                dob: '1994-03-10T10:45:32.358Z'
                            },
                            {
                                firstname: 'foo11',
                                lastname: 'bar11',
                                someFloat: (9 / 3),
                                nested: [ { foo: 'bar15' } ],
                                timestamp: '2014-02-01T10:45:32.358Z',
                                dob: '1994-02-01T10:45:32.358Z'
                            }
                        ] ),
                        columns: [
                            {
                                forPropertyName: 'firstname',
                                label: 'firstname',
                                title: 'FIRSTNAME',
                                isFilterable: true
                                /*,isSortable: true*/
                            },
                            {
                                forPropertyName: 'lastname',
                                label: 'lastname',
                                isFilterable: true,
                                isSortable: true,
                                queryFilterType: Y.doccirrus.DCQuery.REGEX_OPERATOR,
                                css: { warning: true, 'text-right': true, 'text-warning': true }
                            },
                            {
                                forPropertyName: 'virtual',
                                label: 'firstname lastname',
                                renderer: function( meta ) {
                                    return meta.row.firstname + ' ' + meta.row.lastname;
                                },
                                isSortable: true,
                                sortBy: function( aObject, bObject ) {
                                    var
                                        aString = aObject.firstname + ' ' + aObject.lastname,
                                        bString = bObject.firstname + ' ' + bObject.lastname;

                                    return KoUI.utils.String.comparators.natural( aString, bString );
                                },
                                isFilterable: true,
                                filterBy: function( row ) {
                                    var value = this.filterField.value();
                                    return (row.firstname + ' ' + row.lastname).toLowerCase().indexOf( value.toLowerCase() ) > -1;
                                }
                            },
                            {
                                forPropertyName: 'someFloat',
                                label: 'someFloat',
                                //width: '20%',
                                renderer: function( meta ) {
                                    return meta.value.toPrecision( 2 );
                                },
                                isSortable: true,
                                sortBy: 'number',
                                direction: 'DESC', // start with
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.GTE_OPERATOR
                            },
                            {
                                forPropertyName: 'nested.0.foo',
                                label: 'nested foo',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: [ { i18n: 'bar12', val: 'bar12' }, { i18n: 'bar13', val: 'bar13' } ],
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            },
                            {
                                forPropertyName: 'timestamp',
                                label: 'timestamp',
                                title: 'timestamp',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.QUARTER_YEAR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    placeholder: 'Qn YYYY',
                                    options: (function() {
                                        var
                                            quarterListLength = 8,
                                            quarterListResult = [],
                                            quarterListMom = moment(),
                                            quarterListQn = quarterListMom.get( 'quarter' ),
                                            quarterListYYYY = quarterListMom.get( 'year' ),
                                            quarterListN;

                                        for( var i = quarterListLength; i > 0; i-- ) {
                                            quarterListN = (i + quarterListQn) % 4 || 4;
                                            if( i !== quarterListLength && quarterListN === 4 ) {
                                                quarterListYYYY--;
                                            }
                                            quarterListResult.push( {
                                                text: 'Q' + quarterListN + ' ' + quarterListYYYY,
                                                value: 'Q' + quarterListN + ' ' + quarterListYYYY
                                            } );
                                        }

                                        quarterListResult.unshift( {
                                            text: 'aktuelles Quartal',
                                            value: Y.doccirrus.DCQuery.CURRENT_Q_VALUE
                                        } );

                                        return quarterListResult;
                                    })(),
                                    optionsText: 'text',
                                    optionsValue: 'value',
                                    allowValuesNotInOptions: true,
                                    // possibility to set own "Qn YYYY"
                                    provideOwnQueryResults: function( options, data ) {
                                        var
                                            term = options.term,
                                            results = [];

                                        if( data.every( function( item ) {
                                                return !options.matcher( term, item.text );
                                            } ) ) {
                                            results.push( term );
                                        }

                                        return results;
                                    }
                                },
                                renderer: function( meta ) {
                                    var
                                        data = meta.row,
                                        timestamp = data.timestamp,
                                        momTimestamp;

                                    if( timestamp ) {
                                        momTimestamp = moment( timestamp );
                                        return 'Q' + momTimestamp.quarter() + ' ' + momTimestamp.get( 'year' ) + ' (' + momTimestamp.format( 'DD.MM.' ) + ')';
                                    }

                                    return '';
                                }
                            },
                            {
                                forPropertyName: 'dob',
                                label: 'dob',
                                title: 'dob',
                                width: '142px',
                                isSortable: true,
                                isFilterable: true,
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    var data = meta.row;
                                    if( data.kbvDob ) {
                                        return data.kbvDob;
                                    }
                                    return moment.utc( data.dob ).local().format( 'DD.MM.YYYY' );
                                }
                            }
                        ],
                        draggableRows: true,
                        isRowDraggable: function( /*$context*/ ) {
                            //return $context.$data.firstname !== '11397' && $context.$data.firstname !== '18910';
                            return true;
                        },
                        isRowDroppable: function( /*$context*/ ) {
                            //return $context.$data.firstname !== '11397';
                            return true;
                        }
                    }
                } ),
                aKoTableRemote = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'an-unique-id-describing-my-other-table', // @see: KoConfigurable.prototype.stateId
                        states: [ 'limit', 'usageConfigurationValue', 'usageShortcutsVisible' ], // @see: KoTable.prototype.statesAvailable || KoConfigurable.prototype.states
                        fillRowsToLimit: true,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.patient.read,
                        sortersLimit: 2,
                        usageConfigurationDisabled: false,
                        exportCsvConfiguration: {
                            columns: [
                                {
                                    forPropertyName: 'talk',
                                    stripHtml: true
                                },
                                {
                                    forPropertyName: 'firstname',
                                    visible: false
                                },
                                {
                                    forPropertyName: 'lastname',
                                    label: 'lastname other label',
                                    renderer: function( meta, resultOrigRenderer ) {
                                        return 'customized: ' + resultOrigRenderer;
                                    }
                                },
                                {
                                    forPropertyName: 'dob',
                                    stripHtml: {
                                        stripFn: 'safeStrip',
                                        stripArgs: [ { keepLinks: true } ]
                                    }
                                }
                            ]
                        },
                        columns: [
                            {
                                componentType: 'KoTableColumnNumbering',
                                forPropertyName: 'KoTableColumnNumbering'
                            },
                            {
                                componentType: 'KoTableColumnDrag',
                                forPropertyName: 'KoTableColumnDrag',
                                onlyDragByHandle: true
                            },
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: ''
                            },
                            {
                                componentType: 'KoTableColumnRenderer',
                                forPropertyName: 'KoTableColumnRenderer',
                                width: '32px',
                                renderer: function( /*meta*/ ) {
                                    return '<span class="fa fa-ambulance"></span>';
                                },
                                onCellClick: function( /*meta, event*/ ) {
                                    console.warn( '[testKoUI.js] aKoTableRemote.KoTableColumnRenderer.onCellClick :', arguments, this );
                                }
                            },
                            {
                                forPropertyName: 'talk',
                                label: 'talk',
                                width: '10%',
                                isSortable: true,
                                isFilterable: true,
                                // filterPropertyName: 'differentPropertyNameToUseInQueryForFiltering', // in case of filtering an other property name in query
                                // ENUM EXAMPLE
                                renderer: function( meta ) {
                                    var talk = meta.value;
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Talk_E', talk, '-de', '' );

                                },
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect',
                                    options: Y.doccirrus.schemas.patient.types.Talk_E.list,
                                    optionsCaption: 'talk',
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            },
                            {
                                forPropertyName: 'insuranceStatus.0.type',
                                label: 'insur.',
                                width: '10%',
                                isSortable: true,
                                isFilterable: true,
                                // ENUM EXAMPLE WITH SUBTYPE
                                renderer: function( meta ) {
                                    var value = meta.value;
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', value, '-de', '' );
                                },
                                queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                filterField: {
                                    componentType: 'KoFieldSelect2',
                                    options: Y.doccirrus.schemas.person.types.Insurance_E.list,
                                    optionsText: 'i18n',
                                    optionsValue: 'val'
                                }
                            },
                            {
                                forPropertyName: 'firstname',
                                label: 'firstname',
                                width: '30%',
                                isSortable: true,
                                sortInitialIndex: 0,
                                isFilterable: true,
                                // IREGEX EXAMPLE
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR
                            },
                            {
                                forPropertyName: 'lastname',
                                label: 'lastname',
                                width: '30%',
                                visible: false, // this will be ignored once the user saves visibility configuration for that column
                                isSortable: true,
                                sortInitialIndex: 1,
                                isFilterable: true,
                                // REGEX EXAMPLE
                                queryFilterType: Y.doccirrus.DCQuery.REGEX_OPERATOR
                            },
                            {
                                forPropertyName: 'dob',
                                label: 'dob',
                                width: '20%',
                                visibleByUser: false, // this prevents the user from saving visibility configuration for that column
                                isSortable: true,
                                isFilterable: true,
                                // KBVDOB EXAMPLE FOR PATIENT DOB
                                // NB: must display kbvDob, but filter dob
                                queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                renderer: function( meta ) {
                                    var data = meta.row;
                                    if( data.kbvDob ) {
                                        return data.kbvDob;
                                    }
                                    return moment.utc( data.dob ).local().format( 'DD.MM.YYYY' );
                                }
                            }/*,
                             {
                             forPropertyName: 'virtual',
                             label: 'virtual',
                             width:'100px',
                             isEditable: true,
                             editorField: {
                             defaultValue: '1'
                             }
                             }*/
                        ],
                        draggableRows: true,
                        isRowDraggable: function( /*$context*/ ) {
                            //return $context.$data.firstname !== '11397' && $context.$data.firstname !== '18910';
                            return true;
                        },
                        isRowDroppable: function( /*$context*/ ) {
                            //return $context.$data.firstname !== '11397';
                            return true;
                        },
                        responsive: false,
                        tableMinWidth: '1500px',
                        onRowContextMenu: function( meta, $event ) {
                            if( !meta.isLink ) {
                                var
                                    contextMenu = new Y.doccirrus.DCContextMenu( {
                                        menu: [
                                            new Y.doccirrus.DCContextMenuItem( {
                                                text: 'just close',
                                                click: function() {
                                                    contextMenu.close();
                                                }
                                            } ),
                                            new Y.doccirrus.DCContextMenuItem( {
                                                text: 'console.warn me',
                                                click: function() {
                                                    console.warn( 'item2', arguments, this );
                                                }
                                            } )
                                        ]
                                    } );

                                contextMenu.showAt( $event.pageX, $event.pageY );
                                $event.preventDefault();

                                return false;
                            }
                        },
                        collapseRowsActionVisible: true,
                        showRowDependentCollapseRows: function( $context ) {
                            var
                                self = this,
                                model = $context.$data,
                                rows = ko.unwrap( self.rows ),
                                hideRows = [ 1, 2, 3, 6 ];

                            return hideRows.indexOf( rows.indexOf( model ) ) === -1;
                        },
                        showAdditionalDependentCollapseRows: function( $context ) {
                            var
                                self = this,
                                model = $context.$data,
                                rows = ko.unwrap( self.rows ),
                                showAtRows = [ 3, 6 ];

                            return showAtRows.indexOf( rows.indexOf( model ) ) > -1;
                        },
                        getCssRowAdditionalDependentCollapseRows: function( $context, css ) {
                            var
                                self = this,
                                model = $context.$data,
                                rows = ko.unwrap( self.rows );

                            if( rows.indexOf( model ) === 3 ) {
                                css.warning = true;
                                css[ 'text-warning' ] = true;
                            }

                            if( rows.indexOf( model ) === 6 ) {
                                css[ 'text-success' ] = true;
                            }

                        },
                        getStyleRowAdditionalDependentCollapseRows: function( $context ) {
                            var
                                self = this,
                                model = $context.$data,
                                rows = ko.unwrap( self.rows ),
                                style = '';

                            if( rows.indexOf( model ) === 3 ) {
                                style = "font-weight: bold;";
                            }

                            if( rows.indexOf( model ) === 6 ) {
                                style = "font-style: italic;";
                            }

                            return style;
                        },
                        renderAdditionalDependentCollapseRows: function( $context ) {
                            var
                                self = this,
                                model = $context.$data,
                                rows = ko.unwrap( self.rows ),
                                html = '<span>Here could be <a>your</a> advertising</span>';

                            if( rows.indexOf( model ) === 3 ) {
                                html += ' (2-4)';
                            }

                            if( rows.indexOf( model ) === 6 ) {
                                html += ' (7)';
                            }

                            return html;
                        },
                        onCollapseRowClick: function( model, event ) {
                            console.warn( '[testKoUI.js] onCollapseRowClick :', model, event );
                        },
                        onCollapseRowContextMenu: function( model, event ) {
                            console.warn( '[testKoUI.js] onCollapseRowContextMenu :', model, event );
                        }
                    }
                } ),
                aKoNav = KoComponentManager.createComponent( {
                    componentType: 'KoNav',
                    componentConfig: {
                        items: [
                            {
                                active: true,
                                text: 'active',
                                name: 'active',
                                click: function( me ) {
                                    me.active( true );
                                    console.warn( 'active', arguments );
                                }
                            },
                            {
                                text: 'default',
                                name: 'default'
                            },
                            {
                                text: 'click',
                                name: 'click',
                                click: function( item ) {
                                    item.active( true );
                                    console.warn( 'click', arguments );
                                }
                            },
                            {
                                text: 'href',
                                name: 'href',
                                href: '#/href'
                            },
                            {
                                text: 'both',
                                name: 'both',
                                click: function( item/*, $event*/ ) {
                                    item.owner.activateTab( item );

                                    console.warn( 'both', arguments );
                                    // $event.preventDefault(); // prevents default (won't execute href)
                                    // $event.stopImmediatePropagation(); // stops propagation immediately
                                    // return false; // won't execute href
                                    // return true; // equals return ; // will execute href
                                },
                                href: '#/both'
                            },
                            {
                                disabled: true,
                                text: 'disabled',
                                name: 'disabled',
                                click: function( me ) {
                                    me.active( true );
                                    console.warn( 'disabled', arguments );
                                }
                            },
                            {
                                text: 'href disabled',
                                name: 'href-disabled',
                                disabled: true,
                                href: '#/href-disabled'
                            },
                            {
                                text: 'both disabled',
                                name: 'both-disabled',
                                disabled: true, // won't execute click or href
                                click: function( me ) {
                                    me.active( true );
                                    console.warn( 'both disabled', arguments );
                                },
                                href: '#/both-disabled'
                            },
                            {
                                text: 'menu',
                                name: 'menu',
                                title: 'this tab has a title attribute',
                                badge: '0',
                                //disabled: true,
                                menu: {
                                    items: [
                                        {
                                            text: 'menu item 1',
                                            name: 'menu-item-1',
                                            //disabled: true,
                                            click: function( /*item, $event*/ ) {
                                                aKoNav.activateTab( 'menu' );
                                                console.warn( 'menu-item-1', arguments );
                                                // $event.preventDefault(); // prevents default (won't execute href)
                                                // $event.stopImmediatePropagation(); // stops propagation immediately
                                                // return false; // won't execute href
                                                // return true; // equals return ; // will execute href
                                            },
                                            href: '#/menu-item-1'
                                        },
                                        {
                                            text: 'menu item 2',
                                            name: 'menu-item-2',
                                            disabled: true,
                                            //click: function( /*item, $event*/ ) {
                                            //
                                            //    console.warn( 'menu-item-2', arguments );
                                            //    // $event.preventDefault(); // prevents default (won't execute href)
                                            //    // $event.stopImmediatePropagation(); // stops propagation immediately
                                            //    // return false; // won't execute href
                                            //    // return true; // equals return ; // will execute href
                                            //},
                                            href: '#/menu-item-2'
                                        },
                                        {
                                            text: 'menu item 3',
                                            name: 'menu-item-3',
                                            menu: {
                                                items: [
                                                    {
                                                        name: 'menu-item-3-sub-1',
                                                        text: 'menu item 3 sub 1',
                                                        title: 'menu item 3 sub 1',
                                                        icon: 'PLUS',
                                                        disabled: true,
                                                        click: function() {
                                                            console.warn( 'clicked menu-item-3-sub-1', arguments, this );
                                                        }
                                                    },
                                                    {
                                                        name: 'menu-item-3-sub-2',
                                                        text: 'menu item 3 sub 2',
                                                        title: 'menu item 3 sub 2',
                                                        icon: 'CHEVRON_RIGHT',
                                                        click: function() {
                                                            console.warn( 'clicked menu-item-3-sub-2', arguments, this );
                                                        }
                                                    },
                                                    {
                                                        name: 'menu-item-3-sub-3',
                                                        text: 'menu item 3 sub 3',
                                                        title: 'menu item 3 sub 3',
                                                        menu: {
                                                            items: [
                                                                {
                                                                    name: 'menu-item-3-sub-3-sub-1',
                                                                    text: 'menu item 3 sub 3 sub 1',
                                                                    title: 'menu item 3 sub 3 sub 1',
                                                                    icon: 'PLUS',
                                                                    disabled: true,
                                                                    click: function() {
                                                                        console.warn( 'clicked menu-item-3-sub-3-sub-1', arguments, this );
                                                                    }
                                                                },
                                                                {
                                                                    name: 'menu-item-3-sub-3-sub-2',
                                                                    text: 'menu item 3 sub 3 sub 2',
                                                                    title: 'menu item 3 sub 3 sub 2',
                                                                    icon: 'CHEVRON_RIGHT',
                                                                    click: function() {
                                                                        console.warn( 'clicked menu-item-3-sub-3-sub-2', arguments, this );
                                                                    }
                                                                }
                                                            ]
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                text: 'icon',
                                title: 'icon',
                                name: 'icon',
                                icon: 'PLUS',
                                click: function( me ) {
                                    me.active( true );
                                    console.warn( 'icon', arguments );
                                },
                                badge: 'badge',
                                badgeTitle: 'this badge is clickable',
                                onBadgeClick: function( me, event ) {
                                    console.warn( 'badge', arguments );
                                    event.stopPropagation();
                                }
                            }
                        ]
                    }
                } ),
                aKoExample = KoComponentManager.createComponent( {
                    componentType: 'KoExample',
                    componentConfig: {
                        stateId: 'the-KoExample-component-on-the-testKoUI-page'
                    }
                } ),
                aKoSchemaValueFormText = KoComponentManager.createComponent( {
                    componentType: 'KoSchemaValue',
                    componentConfig: {
                        fieldType: 'String'
                    }
                } ),
                aEditableTable = KoComponentManager.createComponent( {
                    componentType: 'KoEditableTable',
                    stateId: 'test-koui-KoEditableTable',
                    componentConfig: {
                        ViewModel: TestViewModel,
                        defaultViewModelData: {
                            firstname: 'foo',
                            lastname: 'bar'
                        },
                        sharedViewModelData: {
                            thisPropIsPassedToEveryInstanceOfViewModel: 'thisPropWillBePassedToEveryInstanceOfViewModel'
                        },
                        data: ko.observableArray( [
                            {
                                checkbox: true,
                                firstname: 'foo1',
                                lastname: 'bar1',
                                someFloat: 3.1,
                                notes: 'notes 1',
                                group: 'test A',
                                select2: 'TREATMENT',
                                timestamp: '2016-06-15T15:19:50.783Z',
                                disabledField: 'some value/text',
                                dob: '1996-06-15T15:19:50.783Z'
                            },
                            {
                                checkbox: false,
                                firstname: 'foo2',
                                lastname: 'bar',
                                someFloat: 3.2,
                                group: 'test B',
                                notes: 'notes 2',
                                select2: 'TREATMENT',
                                timestamp: '2016-04-20T10:45:32.358Z',
                                disabledField: 'some value/text',
                                dob: '1996-04-20T10:45:32.358Z'
                            },
                            {
                                checkbox: true,
                                firstname: 'disable group',
                                lastname: 'bar',
                                someFloat: 3.1,
                                notes: 'notes 3',
                                group: 'test C',
                                select2: 'TREATMENT',
                                timestamp: '2016-02-18T10:45:32.358Z',
                                disabledField: 'some value/text',
                                dob: '1996-02-18T10:45:32.358Z'
                            },
                            {
                                checkbox: true,
                                firstname: 'foo4',
                                lastname: 'bar',
                                someFloat: 3.0,
                                notes: 'notes 4',
                                select2: 'TREATMENT',
                                timestamp: '2016-01-15T10:45:32.358Z',
                                disabledField: 'some value/text',
                                dob: '1996-01-15T10:45:32.358Z'
                            },
                            {
                                checkbox: true,
                                firstname: 'foo1',
                                lastname: 'bar1',
                                someFloat: 0.2,
                                notes: 'notes 5',
                                select2: 'TREATMENT',
                                timestamp: '2016-01-10T10:45:32.358Z',
                                disabledField: 'some value/text',
                                dob: '1996-01-10T10:45:32.358Z'
                            },
                            {
                                checkbox: true,
                                firstname: 'foo6',
                                lastname: 'bar6',
                                someFloat: (4 / 3),
                                notes: 'notes 6',
                                select2: 'TREATMENT',
                                timestamp: '2015-10-11T10:45:32.358Z',
                                disabledField: 'some value/text',
                                dob: '1995-10-11T10:45:32.358Z'
                            },
                            {
                                checkbox: false,
                                firstname: 'foo7',
                                lastname: '1bar7',
                                someFloat: (5 / 3),
                                notes: 'notes 7',
                                select2: 'TREATMENT',
                                timestamp: '2015-09-01T10:45:32.358Z',
                                disabledField: 'some value/text',
                                dob: '1995-09-01T10:45:32.358Z'
                            },
                            {
                                checkbox: true,
                                firstname: 'foo8',
                                lastname: '10bar8',
                                someFloat: (6 / 3),
                                notes: 'notes 8',
                                select2: 'TREATMENT',
                                timestamp: '2015-08-16T10:45:32.358Z',
                                disabledField: 'some value/text',
                                dob: '1995-08-16T10:45:32.358Z'
                            },
                            {
                                checkbox: true,
                                firstname: 'foo9',
                                lastname: '2bar9',
                                someFloat: (7 / 3),
                                notes: 'notes 9',
                                select2: 'TREATMENT',
                                timestamp: '2015-07-14T10:45:32.358Z',
                                disabledField: 'some value/text',
                                dob: '1995-07-14T10:45:32.358Z'
                            },
                            {
                                checkbox: true,
                                firstname: 'foo10',
                                lastname: 'bar10',
                                someFloat: (8 / 3),
                                notes: 'notes 10',
                                select2: 'TREATMENT',
                                timestamp: '2015-05-10T10:45:32.358Z',
                                disabledField: 'some value/text',
                                dob: '1995-05-10T10:45:32.358Z'
                            },
                            {
                                checkbox: true,
                                firstname: 'foo2',
                                lastname: 'barig2',
                                someFloat: 0,
                                notes: 'notes 11',
                                select2: 'TREATMENT',
                                timestamp: '2015-03-18T10:45:32.358Z',
                                disabledField: 'some value/text',
                                dob: '1995-03-18T10:45:32.358Z',
                                multiSelect2: [ { _id: 'item2', name: 'item2' } ]
                            }
                        ] ),
                        columns: [
                            {
                                componentType: 'KoEditableTableColumnDrag'
                            },
                            {
                                componentType: 'KoEditableTableCheckboxColumn',
                                forPropertyName: 'checkbox',
                                // utilityColumn: true,
                                selectAllCheckbox: true,
                                // label: 'C',
                                title: 'checkbox'
                            },
                            {
                                forPropertyName: 'firstname',
                                label: 'firstname',
                                title: 'FIRSTNAME',
                                getComponentForCell: function( meta ) {
                                    var
                                        dataModel = meta.row;
                                    if( 'bar' === peek( dataModel.lastname ) ) { //does not matter "peek" or "unwrap"
                                        return {
                                            componentType: 'KoEditableTableTextareaCell',
                                            componentConfig: {
                                                css: {
                                                    vresize: true
                                                }
                                            }
                                        };
                                    }
                                }
                            },
                            {
                                forPropertyName: 'lastname',
                                label: 'lastname',
                                inputField: {
                                    componentType: 'KoSchemaValue',
                                    componentConfig: {
                                        fieldType: 'String',
                                        showLabel: false
                                    }
                                },
                                css: { warning: true, 'text-right': true, 'text-warning': true }
                            },
                            {
                                forPropertyName: 'virtual',
                                label: 'firstname lastname',
                                inputField: {
                                    componentType: 'KoEditableTablePairInputCell',
                                    componentConfig: {
                                        value1Placeholder: 'first name',
                                        value2Placeholder: 'last name'
                                    }
                                },
                                renderer: function( meta ) {
                                    var
                                        data = unwrap( meta.value ); //important! if "peek" won't be updated
                                    return data.value1 + ' ' + data.value2;
                                }
                            },
                            {
                                forPropertyName: 'someFloat',
                                label: 'someFloat',
                                inputField: {
                                    componentConfig: {
                                        valueUpdate: 'change'
                                    }
                                }
                            },
                            {
                                forPropertyName: 'notes',
                                label: 'notes',
                                inputField: {
                                    componentType: 'KoEditableTableTextareaCell',
                                    componentConfig: {
                                        css: {
                                            vresize: true
                                        }
                                    }

                                }
                            },
                            {
                                forPropertyName: 'someBtn',
                                title: 'someBtn',
                                utilityColumn: true,
                                width: '60px',
                                css: {
                                    'text-center': 1
                                },
                                inputField: {
                                    componentType: 'KoButton',
                                    componentConfig: {
                                        name: 'btnName',
                                        title: 'btnName',
                                        icon: 'PENCIL',
                                        click: function( /*button, $event, $context*/ ) {
                                            console.warn( 'btn can do something' );
                                        }
                                    }
                                }
                            },
                            {
                                forPropertyName: 'select2',
                                label: 'KoFieldSelect2',
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        options: Y.doccirrus.schemas.activity.types.Activity_E.list,
                                        optionsText: 'i18n',
                                        optionsValue: 'val',
                                        select2Config: {
                                            multiple: false
                                        }
                                    }

                                }
                            },
                            {
                                forPropertyName: 'timestamp',
                                label: 'timestamp',
                                title: 'timestamp',
                                inputField: {
                                    componentType: 'KoSchemaValue',
                                    componentConfig: {
                                        fieldType: 'ISODate',
                                        showLabel: false,
                                        useIsoDate: true
                                    }
                                },
                                renderer: function( meta ) {
                                    var
                                        value = unwrap( meta.value );
                                    return moment( value ).format( 'DD.MM.YYYY' );
                                }
                            },
                            {
                                forPropertyName: 'dob',
                                label: 'dob',
                                title: 'dob',
                                inputField: {
                                    componentType: 'KoSchemaValue',
                                    componentConfig: {
                                        fieldType: 'ISODate',
                                        showLabel: false,
                                        useIsoDate: true
                                    }
                                },
                                renderer: function( meta ) {
                                    var
                                        value = unwrap( meta.value );
                                    return moment( value ).format( 'DD.MM.YYYY' );
                                }
                            },
                            {
                                forPropertyName: 'disabledField',
                                label: 'disabledField'
                            },
                            {
                                forPropertyName: 'multiSelect2',
                                label: 'MultiSelect2',
                                title: 'MultiSelect2',
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        useSelect2Data: true,
                                        select2Read: function( value ) {
                                            if( !value ) {
                                                return value;
                                            } else {
                                                return value.map( function( entry ) {
                                                    return {
                                                        id: entry._id,
                                                        text: entry.name,
                                                        data: entry
                                                    };
                                                } );
                                            }
                                        },
                                        select2Write: function( $event, observable ) {
                                            if( $event.added ) {
                                                observable.push( $event.added.data );
                                            }
                                            if( $event.removed ) {
                                                observable.remove( function( item ) {
                                                    return item._id === $event.removed.id;
                                                } );
                                            }
                                        },
                                        select2Config: {
                                            query: undefined,
                                            initSelection: undefined,
                                            data: function() {
                                                return {
                                                    results: [
                                                        { _id: 'item1', name: 'item1' }, {
                                                            _id: 'item2',
                                                            name: 'item2'
                                                        }, { _id: 'item3', name: 'item3' } ].map( function( item ) {
                                                        return {
                                                            id: item._id,
                                                            text: item.name,
                                                            data: item
                                                        };
                                                    } )
                                                };
                                            },
                                            multiple: true
                                        }
                                    }
                                },
                                renderer: function( meta ) {
                                    var
                                        value = unwrap( meta.value );
                                    return value.map( function( entry ) {
                                        return entry.name;
                                    } ).join( ', ' );
                                }
                            },
                            {
                                forPropertyName: 'deleteButton',
                                utilityColumn: true,
                                width: '60px',
                                css: {
                                    'text-center': 1
                                },
                                inputField: {
                                    componentType: 'KoButton',
                                    componentConfig: {
                                        name: 'delete',
                                        title: Y.doccirrus.i18n( 'general.button.DELETE' ),
                                        icon: 'TRASH_O',
                                        click: function( button, $event, $context ) {
                                            var
                                                rowModel = $context.$parent.row;
                                            aEditableTable.removeRow( rowModel );
                                        }
                                    }
                                }
                            }
                        ],
                        groupByField: 'group',
                        showGroups: true,
                        onAddButtonClick: function() {
                            return true;
                        },
                        draggableRows: true,
                        allowDragOnDrop: function( /* contextDrag, contextDrop */ ) {
                            // console.warn( 'KoEditableTable', 'allowDragOnDrop contextDrag', contextDrag );
                            // console.warn( 'KoEditableTable', 'allowDragOnDrop contextDrop', contextDrop );
                            return true;
                        },
                        isRowDraggable: function( context ) { // updates on observable changes
                            // console.warn( 'KoEditableTable', 'isRowDraggable', context.$data.firstname() )
                            return 'foo1' !== context.$data.firstname();
                        },
                        isRowDroppable: function( /*context*/ ) { // updates on observable changes
                            // console.warn( 'KoEditableTable', 'isRowDroppable', context.$data.lastname() )
                            return true;
                        },
                        onRowDragged: function( /*meta*/ ) {
                            // console.warn( 'KoEditableTable', 'onRowDragged', meta );
                        }
                    }
                } ),
                uploaderViewModel = {
                    droppedFiles: ko.computed( {
                        read: function() {
                            return [];
                        },
                        write: function( value ) {
                            if( uploaderViewModel.fileUploader.uploadFiles ) {
                                uploaderViewModel.fileUploader.uploadFiles( value );
                            }
                        }
                    } ),
                    fileUploader: {
                        filesInProgress: ko.observableArray(),
                        fileTypes: [ 'jpg' ],
                        acceptFiles: 'image/*',
                        generateDataURL: true,
                        callbacks: {
                            onComplete: function( meta ) {
                                console.warn( 'fileUploader', 'onComplete', meta );
                            },
                            onProgress: function( meta ) {
                                console.warn( 'fileUploader', 'onProgress', meta );
                            },
                            onUpload: function( meta ) {
                                console.warn( 'fileUploader', 'onUpload', meta );
                            },
                            onError: function( meta ) {
                                console.warn( 'fileUploader', 'onError', meta );
                            }
                        }
                    }
                },
                aKoFileUploader = KoComponentManager.createComponent( {
                    componentType: 'KoFileUploader',
                    componentConfig: {
                        fileTypes: [ 'jpg' ],
                        callbacks: {
                            onComplete: function( meta ) {
                                console.warn( 'KoFileUploader', 'onComplete', meta );
                            },
                            onProgress: function( meta ) {
                                console.warn( 'KoFileUploader', 'onProgress', meta );
                            },
                            onUpload: function( meta ) {
                                console.warn( 'KoFileUploader', 'onUpload', meta );
                            },
                            onError: function( meta ) {
                                console.warn( 'KoFileUploader', 'onError', meta );
                            }
                        },
                        buttons: [
                            KoUI.KoComponentManager.createComponent( {
                                componentType: 'KoButton',
                                componentConfig: {
                                    name: 'button1',
                                    text: 'button1',
                                    click: function() {
                                        console.warn( 'button1', 'click', aKoFileUploader );
                                    }
                                }
                            } ),
                            KoUI.KoComponentManager.createComponent( {
                                componentType: 'KoButton',
                                componentConfig: {
                                    name: 'button2',
                                    text: 'button2',
                                    click: function() {
                                        console.warn( 'button2', 'click', aKoFileUploader );
                                    }
                                }
                            } )
                        ]
                    }
                } ),
                applyBindings = {
                    runTests: function() {
                        //run the tests
                        TestModule.appendSelector = '#test-ground';
                        TestModule.TestRunner.run();
                    },
                    clearTests: function() {
                        applyBindings.tests.removeAll();
                    },
                    tests: ko.observableArray(),
                    aKoExample: aKoExample,
                    aKoButton: aKoButton,
                    aKoPrintButton: aKoPrintButton,
                    aKoMenu: aKoMenu,
                    aKoButtonDropDown: aKoButtonDropDown,
                    aKoTable: aKoTable,
                    aKoTableRemote: aKoTableRemote,
                    aKoNav: aKoNav,
                    aKoSchemaValueFormText: aKoSchemaValueFormText,
                    aEditableTable: aEditableTable,
                    uploader: uploaderViewModel,
                    aKoFileUploader: aKoFileUploader,
                    // getCardTerminalsBtn: getCardTerminalsBtn,
                    // readCardBtn: readCardBtn,
                    // changePinBtn: changePinBtn,
                    // getPinStatusBtn: getPinStatusBtn,
                    // unblockPinBtn: unblockPinBtn,
                    // verifyPinBtn: verifyPinBtn,
                    // discoverTiEndpointsBtn: discoverTiEndpointsBtn
                };
            ko.computed( function() {
                var
                    activeRow = unwrap( aEditableTable.activeRow );
                console.warn( 'editable table activeRow', activeRow && peek( activeRow.firstname ) );
            } );
            aEditableTable.rendered.subscribe( function( val ) {
                if( true === val ) {
                    KoEditableTable.tableNavigation( document.querySelector( '#aKoEditableTable' ) );
                }
            } );

            console.warn( '[testKoUI.js] applyBindings :', applyBindings );

            ko.computed( function() {
                console.warn( '[testKoUI.js] aKoTableRemote.checked :', aKoTableRemote.getComponentColumnCheckbox().checked() );
            } ).extend( { rateLimit: 0 } );

            aKoTableRemote.events.on( 'KoTable:draggedRows', function( yEvent, data ) {
                console.warn( 'on KoTable:draggedRows', data );
            } );

            aKoTableRemote.events.on( 'KoTable:exportCsvStart', function( yEvent, data ) {
                console.warn( 'on KoTable:exportCsvStart', data );
            } );

            aKoTableRemote.events.on( 'KoTable:exportCsvEnd', function( yEvent, data ) {
                console.warn( 'on KoTable:exportCsvEnd', data );
            } );

            aKoExample.events.on( 'KoExample-templateChanged', function( yEvent, data ) {
                console.warn( 'on KoExample-templateChanged', data );
            } );

            ko.applyBindings( applyBindings, node.getDOMNode() );

            testNs.utils.createSubscribeForArray( applyBindings.tests );

        },

    };
}, '3.16.0', {
    requires: [
        'KoUI-tests',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',

        'dcutils-uam',

        'KoUI-all',
        'KoEditableTable',

        'DCContextMenu'
    ]
} );
/* eslint-enable */
