/**
 * User:strix
 * Date: 29/05/2019
 * (c) 2019, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */
/*eslint prefer-template: 0 */

'use strict';

YUI.add( 'FormTableEditorViewModel', function( Y, NAME ) {
        /**
         * @module FormTableEditorViewModel
         */

        var
            i18n = Y.doccirrus.i18n;

        if ( !Y.dcforms ) { Y.dcforms = {}; }

        /**
         * @class FormTableEditorViewModel
         * @constructor
         */
        function FormTableEditorViewModel() {
            var self = this;

            function init() {
                //  observables
                self.element = ko.observable();
                self.schemaNames = Y.dcforms.reducedschema.listSync();
                self.schemaName = ko.observable( '' );
                self.cols = ko.observableArray();
                self.filters = ko.observableArray();
                self.isStriped = ko.observable( false );

                self.txtTitle = ko.observable( '' );
                self.selMember = ko.observable( '' );
                self.selFilterMember = ko.observable( '' );
                self.selFilterType = ko.observable( '' );
                self.txtAdditionalDataKey = ko.observable( '' );

                self.schemaMembers = ko.observableArray( [] );

                self.omitFromPDFIfEmpty = ko.observable( false );
                self.useMarkdownEditor = ko.observable( false );

                //  translations
                self.BTN_MORE_OPTIONS = i18n( 'FormEditorMojit.tableproperties_modal.button' );
                self.LBL_EE_OMITIFEMPTY = i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_OMITIFEMPTY' );
                self.LBL_EE_LARGETEXT = i18n( 'FormEditorMojit.el_properties_panel.LBL_EE_LARGETEXT' );
                self.LBL_PLACEHOLDER_TITLE = i18n( 'FormEditorMojit.el_properties_panel.LBL_PLACEHOLDER_TITLE' );
                self.LBL_PLACEHOLDER_KEY = i18n( 'FormEditorMojit.el_properties_panel.LBL_PLACEHOLDER_KEY' );

                //  subscriptions
                self.subscribeSchemaName = self.schemaName.subscribe( function( val ) {
                    self.onSchemaNameChanged( val );
                } );

                //  computed variables

                self.isAdditionalDataKeyVisible = ko.computed( function isAdditionalDataKeyVisible() {
                    return self.selMember() === "additionalData";
                } );

                //  serialize table definition to legacy format used by form editor, to be replaced in future
                self.serialized = ko.computed( function serializeToLegacy() {
                    var
                        txt = '**' + self.schemaName() + '\n',
                        cols = self.cols(),
                        filters = self.filters(),
                        i;

                    for ( i = 0; i < cols.length; i++ ) {
                        txt = txt +
                            '*|' + cols[i].member() +
                            '|' + cols[i].valueType() +
                            '|' + cols[i].title() +
                            '|' + cols[i].align() +
                            '|' + cols[i].fixWidth() + '\n';
                    }

                    for ( i = 0; i < filters.length; i++ ) {
                        txt = txt +
                            '*!' + filters[i].member() +
                            '|' + filters[i].op() +
                            '|' + filters[i].value() + '\n';
                    }

                    return txt;
                } );

                //  raised when user changes the table definition

                self.subscribeSerialized = self.serialized.subscribe( function onTableChanged( tableDef ) {
                    var element = self.element();

                    if ( !element ) { return; }

                    element.defaultValue[ element.getCurrentLang() ] = tableDef;
                    element.setValue( tableDef, Y.dcforms.nullCallback );
                    element.page.form.raise( 'valueChanged', element );
                    element.isDirty = true;
                    element.page.redrawDirty();
                } );

                //  raised when user changes options
                self.subscribeHideEmpty = self.omitFromPDFIfEmpty.subscribe( function( newVal ) {
                    var element = self.element();

                    if ( !element ) { return; }

                    element.omitFromPDFIfEmpty =  newVal;
                    element.page.form.raise( 'valueChanged', element );
                    element.isDirty = true;
                    element.page.redrawDirty();
                } );

                self.subscribeMarkdownEditor = self.useMarkdownEditor.subscribe( function( newVal ) {
                    var element = self.element();

                    if ( !element ) { return; }

                    element.useMarkdownEditor = newVal;
                    element.page.form.raise( 'valueChanged', element );
                    element.isDirty = true;
                    element.page.redrawDirty();
                } );

                self.subscribeStriped = self.isStriped.subscribe( function( newVal ) {
                    var element = self.element();

                    if ( !element ) { return; }

                    if ( newVal ) {
                        element.extra = 'STRIPES';
                    } else {
                        element.extra = '';
                    }
                    element.page.form.raise( 'valueChanged', element );
                    element.isDirty = true;
                    element.page.redrawDirty();
                } );
            }


            //  public methods

            self.destroy = function() {
                //  should not currently happen in form editor
                Y.log( 'Destroying FormTableEditorViewModel', 'info', NAME );
            };

            /**
             *  Called by parent when an element has been selected in the form
             *
             *  @param  {Object}    elem    A dcform table element
             */

            self.setElement = function( elem ) {

                self.element( elem );

                if ( !elem ) { return; }

                var
                    initialValue = elem.getValue(),
                    tableDef = Y.dcforms.stringToCols( initialValue ),
                    i;

                self.schemaName( tableDef.schema );
                self.schema = Y.dcforms.reducedschema.loadSync( tableDef.schema );
                self.schemaMembers( Y.dcforms.reducedschema.schemaToKoDropdown( self.schema ) );
                self.isStriped( -1 !== elem.extra.indexOf( 'STRIPES' ) );

                self.omitFromPDFIfEmpty( elem.omitFromPDFIfEmpty );
                self.useMarkdownEditor( elem.useMarkdownEditor );

                //  initialize some observables for table columns
                self.cols( [] );
                for( i = 0; i < tableDef.cols.length; i++ ) {
                    self.cols.push( self.initializeColumnDef( tableDef.cols[i] ) );
                }

                //  initialize some observables for filters
                self.filters( [] );
                for ( i = 0; i < tableDef.filters.length; i++ ) {
                    self.filters.push( self.initializeFilterDef( tableDef.filters[i] ) );
                }
            };

            /**
             *  Set observables and subscriptions used to sync with 'more properties window'
             *
             *  @param col
             */

            self.initializeColumnDef = function( plainCol ) {
                var
                    col = {
                        align: ko.observable( plainCol.align || 'left' ),
                        title: ko.observable( plainCol.title || '' ),
                        valueType: ko.observable( plainCol.valueType || 'String' ),
                        member: ko.observable( plainCol.member || '' ),
                        fixWidth: ko.observable( plainCol.fixWidth || -1 ),

                        toggleAlign: toggleAlign,
                        promoteItem: promoteItem,
                        deleteColumn: deleteColumn,

                        dispose: dispose
                    };

                col.subscript = ko.computed( function getSubscript() {
                    var
                        fixWidth = col.fixWidth(),
                        isAuto = ( fixWidth === -1 || fixWidth === '-1' ),
                        fixWidthStr = ( isAuto ? 'auto' : fixWidth );

                    return col.member() + ' / ' + col.valueType() + ' / ' + fixWidthStr;
                } );

                col.displayedMemberName = ko.pureComputed( {
                    read: function() {
                        var memberName = col.member();
                        if( memberName.indexOf( "additionalData_" ) === 0 ) {
                            memberName = "additionalData";
                        }
                        return memberName;
                    },
                    write: function( val ) {
                        var
                            oldMemberName = col.member(),
                            valueToSet;
                        if( val === "additionalData" ) {
                            valueToSet = "additionalData_" + oldMemberName.substring( 15 );
                        } else {
                            valueToSet = val;
                        }
                        col.member( valueToSet );
                    }
                } );

                col.displayedAdditionalDataKey = ko.pureComputed( {
                    read: function() {
                        var memberName = col.member();
                        if( memberName.indexOf( "additionalData_" ) === 0 ) {
                            return memberName.substring( 15 );
                        }
                        return "";
                    },
                    write: function( val ) {
                        var oldMemberName = col.member();
                        if( oldMemberName.indexOf( "additionalData_" ) === 0 ) {
                            col.member( "additionalData_" + val );
                        }
                    }
                });

                col.isAdditionalDataKeyEnabled = ko.computed( function() {
                    var memberName = col.member();
                    return memberName.indexOf( "additionalData" ) === 0;
                } );

                /**
                 *  Click handler for buttons to cycle through text alignment/justification options
                 */

                function toggleAlign() {
                    switch( col.align() ) {
                        case 'left':        col.align( 'center' );      break;
                        case 'center':      col.align( 'right' );       break;
                        case 'right':       col.align( 'justify' );     break;
                        case 'justify':     col.align( 'left' );        break;
                    }
                }

                /**
                 *  Click handler for button to move a column one step to the left/top
                 */

                function promoteItem() {
                    var
                        plainCols = self.cols(),
                        idx = plainCols.indexOf( col ),
                        demoted;

                    if ( 0 === idx ) {
                        //  already at top
                        return;
                    }

                    demoted = plainCols[ idx - 1 ];
                    plainCols[ idx - 1 ] = plainCols[ idx ];
                    plainCols[ idx ] = demoted;

                    self.cols( plainCols );

                    //  TODO: update the dcforms element with this change and render
                }

                function deleteColumn() {
                    var
                        plainCols = self.cols(),
                        newCols;

                    newCols = plainCols.filter( function notThisOne( item ) { return item !== col; } );
                    col.dispose();
                    self.cols( newCols );

                    //  TODO: update the dcforms element with this change and render
                }

                function dispose() {
                    col.subscript.dispose();
                    col.isAdditionalDataKeyEnabled.dispose();
                    col.displayedMemberName.dispose();
                    col.displayedAdditionalDataKey.dispose();
                }

                return col;
            };

            self.initializeFilterDef = function( plainFilter ) {
                var
                    filter = {
                        member: ko.observable( plainFilter.member || '' ),
                        op: ko.observable( plainFilter.op || 'EQ' ),
                        value: ko.observable( plainFilter.value || '' ),

                        disponse: dispose
                    };

                filter.displayedMemberName = ko.pureComputed( {
                    read: function() {
                        var memberName = filter.member();
                        if( memberName.indexOf( "additionalData_" ) === 0 ) {
                            memberName = "additionalData";
                        }
                        return memberName;
                    },
                    write: function( val ) {
                        var
                            oldMemberName = filter.member(),
                            valueToSet;
                        if( val === "additionalData" ) {
                            valueToSet = "additionalData_" + oldMemberName.substring( 15 );
                        } else {
                            valueToSet = val;
                        }
                        filter.member( valueToSet );
                    }
                } );

                filter.displayedAdditionalDataKey = ko.pureComputed( {
                    read: function() {
                        var memberName = filter.member();
                        if( memberName.indexOf( "additionalData_" ) === 0 ) {
                            return memberName.substring( 15 );
                        }
                        return "";
                    },
                    write: function( val ) {
                        var oldMemberName = filter.member();
                        if( oldMemberName.indexOf( "additionalData_" ) === 0 ) {
                            filter.member( "additionalData_" + val );
                        }
                    }
                });

                filter.isAdditionalDataKeyEnabled = ko.computed( function() {
                    var memberName = filter.member();
                    return memberName.indexOf( "additionalData" ) === 0;
                } );

                function dispose() {
                    filter.isAdditionalDataKeyEnabled.dispose();
                    filter.displayedMemberName.dispose();
                    filter.displayedAdditionalDataKey.dispose();
                }

                return filter;
            };

            /**
             *  Utility to expand schema dropdown value
             *  @param {string} memberName
             *  @return {*}
             */

            self.getSchemaMemberObj = function ( memberName ) {
                var schemaMemberArray = self.schemaMembers();
                return schemaMemberArray.find( function( item ) {
                    return item.id === memberName;
                } );
            };

            self.openTablePropertiesDialog = function() {
                var elem = self.element();

                //   nothing to do if not table element
                if ( !elem ) { return; }

                Y.doccirrus.modals.tableProperties.show( {
                    'element': elem,
                    'tablevm': self,
                    'onApplyProperties': onCloseModal,
                    'onCloseDialog': onCloseModal
                } );

                function onCloseModal( ) {
                    Y.log( 'Closed expanded table properties dialog.', 'info', NAME );
                }
            };

            //  EVENTS

            /**
             *  Raised when schema is selected / changed in the dropdown
             *  @param  {String}    newSchemaName
             */

            self.onSchemaNameChanged = function( newSchemaName ) {
                Y.log('Setting table row schema to: ' + newSchemaName, 'warn', NAME);
                self.schemaName( newSchemaName );

                self.schema = Y.dcforms.reducedschema.loadSync( newSchemaName );
                self.schemaMembers( Y.dcforms.reducedschema.schemaToKoDropdown( self.schema ) );

                self.cols( [] );
                self.filters( [] );
            };

            self.constructMemberName = function constructMemberName( member, additionalDataKey ) {
                return (member === "additionalData") ? member + "_" + additionalDataKey : member;
            };

            /**
             *  Raised when the user clicks the [+] button to add a new row
             */

            self.onAddRowClick = function() {
                var
                    memberName = self.selMember(),
                    memberObj = self.getSchemaMemberObj( memberName ),
                    valueType = ( memberObj && memberObj.type ) ? memberObj.type : '',
                    title = self.txtTitle(),
                    additionalDataKey = self.txtAdditionalDataKey(),

                    newCol,
                    plainCol = {
                        'member': self.constructMemberName( memberName, additionalDataKey ),
                        'valueType': valueType,
                        'title': title,
                        'align': 'left',
                        'fixWidth': -1
                    },

                    cols = self.cols(),
                    i;

                //  do not add empty columns

                if ( ('' === memberName) || ('' === valueType) || ('' === title) ) {
                    Y.log('Could not add column, invalid event', 'warn', NAME);
                    Y.log('member: ' + memberName + ' valueType: ' + valueType + ' title: ' + title, 'warn', NAME);
                    return;
                }

                //  prevent duplicates

                for ( i = 0; i < cols.length; i++ ) {
                    if ( cols[i].member() === memberName ) {
                        Y.log( 'This member is already bound to a column, not duplicating binding', 'info', NAME );
                        return;
                    }
                }

                newCol = self.initializeColumnDef( plainCol );

                self.cols.push( newCol );

                self.selMember( '' );
                self.txtTitle( '' );
                self.txtAdditionalDataKey( '' );
            };

            //  SETUP

            init();
        }

        Y.dcforms.FormTableEditorViewModel = FormTableEditorViewModel;

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'tableproperties-modal',
            'dcforms-table-utils'
        ]
    }
)
;