/**
 * User: do
 * Date: 28.07.20  08:59
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'KoTableSelect', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoTableSelect
     */

    Y.namespace( 'doccirrus.KoUI' );

    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' );

    /**
     * A table select implementation.__
     * @class KoTableSelect
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */

    function KoTableSelect( config ) {
        KoTableSelect.superclass.constructor.call( this, config );
    }

    makeClass( {
        constructor: KoTableSelect,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoTableSelect',
            init: function() {
                var self = this;
                KoTableSelect.superclass.init.apply( self, arguments );
                var SELECTION_TYPE = self.multi ? 'checkbox' : 'radio';

                self.displayPropertyName = self.displayPropertyName || 'i18n';
                self.editMode = ko.observable( false );
                self.checked = self.multi ? ko.observableArray() : ko.observable();
                self.selection = ko.observableArray();

                self.checked.subscribe( function( val ) {
                    if( !val ) {
                        val = [];
                    } else {
                        val = Array.isArray( val ) ? val : [val];
                    }
                    self.selection( val.map( function( v ) {
                        return peek( self.options ).find( function( option ) {
                            return option[self.optionsValue] === v;
                        } );
                    } ) );
                } );

                self.selection.subscribe( function( s ) {
                    self.val( self.multi ? s : s && s[0] );
                    if( !self.multi ) {
                        self.leaveEditMode();
                    }
                } );

                self.addDisposable( ko.computed( function() {
                    var val = self.val();
                    if( self.multi && !Array.isArray( val ) ) {
                        self.checked( [] );
                    } else {
                        self.checked( val );
                    }
                } ) );

                self.headers = ko.observableArray( [{title: ''}].concat( self.optionsColumns.map( function( optionColumn ) {
                    return {title: optionColumn.title};
                } ) ) );

                self.rows = ko.observableArray();

                self.addDisposable( ko.computed( function() {
                    var options = unwrap( self.options );
                    self.rows( [] );
                    options.forEach( function( option ) {
                        if( option.type === 'heading' ) {
                            self.rows.push( option );
                            return;
                        }

                        var row = [
                            {
                                type: SELECTION_TYPE,
                                name: self.optionsName,
                                checked: self.checked,
                                value: option[self.optionsValue]
                            }
                        ];

                        self.optionsColumns.forEach( function( optionColumn ) {
                            row.push( {type: 'text', value: option[optionColumn.propertyName]} );
                        } );

                        self.rows.push( row );
                    } );
                } ) );

                if( self.displayComponent !== false ) {
                    self.displayComponent = self.displayComponent || KoComponentManager.createComponent( {
                        value: self.addDisposable( ko.computed( function() {
                            var selection = unwrap( self.selection );
                            return selection.map( function( selectionEntry ) {
                                return selectionEntry[self.displayPropertyName];
                            } ).join( ', ' );
                        } ) )
                    }, 'KoDisplay' );
                }

                self.canEdit = ko.computed( function() {
                    return unwrap( self.options ).length > 0;
                } );

                self.addDisposable( ko.computed( function() {
                    if( !self.canEdit() ) {
                        self.leaveEditMode();
                    }
                } ) );

                // set initial value after init
                self.editMode( typeof self.initialConfig.editMode === 'boolean' ? self.initialConfig.editMode : true );
            },
            toggleEditModel: function() {
                var self = this;
                self.editMode( !self.editMode() );
            },
            leaveEditMode: function() {
                var self = this;
                if( unwrap( self.editMode ) ) {
                    self.toggleEditModel();
                }
            },
            enterEditMode: function() {
                var self = this;
                if( !unwrap( self.editMode ) ) {
                    self.toggleEditModel();
                }
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableSelect' ) );
            },
            val: function( key ) {
                var
                    self = this;
                return self._handleLazyConfig( key );
            },
            options: function( key ) {
                var
                    self = this;
                return self._handleLazyConfig( key );
            },
            optionsColumns: function( key ) {
                var
                    self = this;
                return self._handleLazyConfig( key );
            }
        }
    } );
    /**
     * @property KoTableSelect
     * @type {KoTableSelect}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableSelect );

}, '3.16.0', {
    requires: [
        'KoUI',
        'KoComponentManager',
        'KoDisplay'
    ]
} );


