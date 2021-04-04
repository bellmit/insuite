/**
 * User: pi
 * Date: 21/11/16  11:18
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/* global YUI, ko, jQuery, _ */
/* eslint-disable valid-jsdoc, prefer-rest-params */
'use strict';
YUI.add( 'KoEditableTable', function( Y, NAME ) {

    var
        i18n = Y.doccirrus.i18n,
        KoUI = Y.doccirrus.KoUI,
        ignoreDependencies = ko.ignoreDependencies,
        KoComponentManager = KoUI.KoComponentManager,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' ),
        Disposable = Y.doccirrus.KoViewModel.getDisposable(),
        KoTable = KoComponentManager.registeredComponent( 'KoTable' ),
        utilsMath = KoUI.utils.Math,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        CSS_KOTABLE_ROW_ISDRAGGABLE = 'KoTable-row-isDraggable',
        CSS_KOTABLE_ROW_ISDROPPABLE = 'KoTable-row-isDroppable',
        CSS_KOTABLE_PROXY_DROP_DISABLED = 'KoTable-drag-proxy-drop-disabled',
        CSS_KOTABLE_PROXY_DROP_ENABLED = 'KoTable-drag-proxy-drop-enabled';

    /**
     * @class KoEditableTableHeader
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoEditableTableHeader() {
        KoEditableTableHeader.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoEditableTableHeader,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoEditableTableHeader',
            init: function() {
                var self = this;
                KoEditableTableHeader.superclass.init.apply( self, arguments );
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableHeader' ) );
            }
        }
    } );

    /**
     * @property KoEditableTableHeader
     * @type {KoEditableTableHeader}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoEditableTableHeader );

    /**
     * @class KoEditableTableInputCell
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoEditableTableInputCell() {
        KoEditableTableInputCell.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoEditableTableInputCell,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoEditableTableInputCell',
            init: function() {
                var self = this;
                KoEditableTableInputCell.superclass.init.apply( self, arguments );
                self.initProps();
            },
            /**
             * @method initProps
             * Injects "valueProprs" as "value" properties.
             */
            initProps: function() {
                var
                    self = this;
                if( self.valueProps ) {
                    Object.keys( self.valueProps ).forEach( function( key ) {
                        self.value[ key ] = self.valueProps[ key ];
                    } );
                }
            },
            /**
             * if set, will be injected as "value" properties
             * @attribute valueProps
             * @for KoEditableTableInputCell
             * @type {Object}
             * @default null
             * @see initProps
             * @example
             // copy "validation" properties to show error.
             valueProps: {
                hasError: foo.hasError,
                validationMessages: foo.validationMessages
             }
             */
            valueProps: null,
            valueUpdate: null
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableInputCell' ) );
            },
            value: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            placeholder: function( key ) {
                var
                    self = this,
                    value = self.value;
                if( value && value.placeholder ) {
                    return value.placeholder;
                }
                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * In general disables the component from user interaction with it.
             * @attribute disabled
             * @type {Boolean}
             * @default false
             */
            disabled: function( key ) {
                var
                    self = this,
                    value = self.value;
                if( value && value.disabled ) {
                    return value.disabled;
                }
                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Set a typ for the input filed
             * @attribute type
             * @type {String}
             * @default text
             */
            type: function(key) {
                var
                    self = this,
                    typeInput = self.initialConfig.owner.type;

                if (typeInput){
                    return typeInput;
                }

                return self._handleLazyConfig( key, ko.observable( 'text' ) );
            }
        }
    } );

    /**
     * @property KoEditableTableInputCell
     * @type {KoEditableTableInputCell}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoEditableTableInputCell );

    /**
     * @class KoEditableTableTextareaCell
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoEditableTableTextareaCell() {
        KoEditableTableTextareaCell.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoEditableTableTextareaCell,
        extends: KoEditableTableInputCell,
        descriptors: {
            componentType: 'KoEditableTableTextareaCell'
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableTextareaCell' ) );
            }
        }
    } );

    /**
     * @property KoEditableTableTextareaCell
     * @type {KoEditableTableTextareaCell}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoEditableTableTextareaCell );

    /**
     * @class KoEditableTableCheckboxCell
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoEditableTableCheckboxCell() {
        KoEditableTableCheckboxCell.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoEditableTableCheckboxCell,
        extends: KoEditableTableInputCell,
        descriptors: {
            componentType: 'KoEditableTableCheckboxCell'
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableCheckboxCell' ) );
            }
        }
    } );

    /**
     * @property KoEditableTableCheckboxCell
     * @type {KoEditableTableCheckboxCell}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoEditableTableCheckboxCell );

    /**
     * @class KoEditableTableCellDrag
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoEditableTableCellDrag() {
        KoEditableTableCellDrag.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoEditableTableCellDrag,
        extends: KoEditableTableInputCell,
        descriptors: {
            componentType: 'KoEditableTableCellDrag'
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableCellDrag' ) );
            }
        }
    } );

    /**
     * @property KoEditableTableCellDrag
     * @type {KoEditableTableCellDrag}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoEditableTableCellDrag );

    /**
     * @class KoEditableTablePairInputCell
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoEditableTablePairInputCell() {
        KoEditableTablePairInputCell.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoEditableTablePairInputCell,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoEditableTablePairInputCell',
            init: function() {
                var self = this;
                KoEditableTablePairInputCell.superclass.init.apply( self, arguments );
            },
            valueUpdate: null
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTablePairInputCell' ) );
            },
            /**
             * @attribute value1
             * @for KoEditableTablePairInputCell
             * @type {ko.observable(Any)}
             * @default ''
             */
            value1: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * @attribute value2
             * @for KoEditableTablePairInputCell
             * @type {ko.observable(Any)}
             * @default ''
             */
            value2: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * @attribute value1Placeholder
             * @for KoEditableTablePairInputCell
             * @type {ko.observable(String)}
             * @default ''
             */
            value1Placeholder: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * @attribute value2Placeholder
             * @for KoEditableTablePairInputCell
             * @type {ko.observable(String)}
             * @default ''
             */
            value2Placeholder: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * @attribute value
             * @for KoEditableTablePairInputCell
             * @type {ko.computed(Object)}
             * @default { value1: '', value2: ''}
             */
            value: function() {
                var
                    self = this;

                return ko.computed( {
                    read: function() {
                        var
                            value1 = unwrap( self.value1 ),
                            value2 = unwrap( self.value2 );
                        return {
                            value1: value1,
                            value2: value2
                        };
                    },
                    write: function( value ) {
                        if( !value ) {
                            self.value1( null );
                            self.value2( null );
                        } else {
                            self.value1( value.value1 );
                            self.value2( value.value2 );
                        }
                    }
                } );
            }
        }
    } );

    /**
     * @class KoEditableTableColumnBase
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     * @param {Object} config.editorField a column editor configuration object
     * @param {*|Function} config.editorField.defaultValue a default value to use when forPropertyName is undefined in the rows data,
     *                              can be any value or a function which should return a value based on the rows data passed argument
     */
    function KoEditableTableColumnBase() {
        KoEditableTableColumnBase.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoEditableTableColumnBase,
        extends: KoComponent,
        static: {},
        descriptors: {
            /**
             * The width of a column (specified in colgroup tag)
             * @property width
             * @type {String}
             * @default 'auto'
             */
            width: 'auto',
            componentType: 'KoEditableTableColumnBase',
            /**
             * If set displays info icon with tooltip in header
             * @property headerTooltip
             * @type {String}
             */
            headerTooltip: null,
            /**
             * Retrieve value by property name from data entry. Can also be a dot-limited path syntax to retrieve from nested data.
             * @property forPropertyName
             * @type {String}
             */
            forPropertyName: null,
            init: function() {
                var self = this;
                KoEditableTableColumnBase.superclass.init.apply( self, arguments );
                self.getTemplateNameCell = Y.bind( self.getTemplateNameCell, self );
                self.doRender = Y.bind( self.doRender, self );
                self.initWidthComputed();
                self.initCss();
            },
            /**
             * Provides the cell template name
             * @protected
             * @method getTemplateNameCell
             * @param $context
             * @return {String}
             */
            getTemplateNameCell: function( /*$context*/ ) {
                var
                    self = this,
                    templateNameCell = unwrap( self.templateNameCell );
                return templateNameCell;
            },
            /**
             * Provides the cell template data
             * @method getTemplateDataCell
             * @param $context
             * @return {Object}
             */
            getTemplateDataCell: function( /*$context*/ ) {
                throw new Error( 'getTemplateDataCell should be overridden' );
            },
            /**
             * prevents disposing while removing from columns, e.g. sorting, moving
             * @property _preventDispose
             * @protected
             */
            _preventDispose: false,

            /**
             * Gets a value specified by this {{#crossLink "KoEditableTableColumnBase/forPropertyName:property"}}{{/crossLink}} on the given data
             * @method getValueFromData
             * @param {Object} data
             * @return {*|undefined}
             * @protected
             */
            getValueFromData: function( data ) {
                var
                    self = this,
                    propertyName = peek( self.forPropertyName );

                if( Y.Object.owns( data, propertyName ) ) {
                    return data[ propertyName ];
                } else {
                    return undefined;
                }
            },
            /**
             * Overwrite this method to provide your own on cell click handling.
             * If it returns false or $event.stopImmediatePropagation, $event.stopPropagation is called no event bubbling will occur.
             * If $event.preventDefault is called only the default action is prevented.
             * @method onCellClick
             * @param {Object} meta row meta Object
             * @param {Event} $event the raised event
             * @return {boolean}
             * @example
             {
                 forPropertyName: 'aPropertyName',
                 onCellClick: function( meta, event ) {
                     console.warn( 'onCellClick :', arguments, this );
                 }
             }
             */
            onCellClick: function( /*meta, $event*/ ) {
                // meant to override
                return true;
            },
            /**
             * Calls renderer to render content
             * @param {Object} meta
             * @returns {String}
             */
            doRender: function( meta ) {
                var
                    self = this,
                    data = meta.row;
                if( data === KoTable.CONST.EMPTY_ROW ) {
                    return '';
                }
                return self.renderer( meta );
            },
            interceptRenderOutput: function( output, meta ) {
                var
                    self = this,
                    data = meta.row;
                if( data !== KoTable.CONST.EMPTY_ROW && self.owner.interceptRenderOutput ) {
                    self.owner.interceptRenderOutput( meta, output );
                }
                return unwrap( output );
            },
            /** @protected */
            initWidthComputed: function() {
                var
                    self = this,
                    width = peek( self.width );

                self.widthComputed( width );
            },

            /** @protected */
            initCss: function() {
                var
                    self = this;

                self.addDisposable( ko.computed( function() {
                    var css = self.css();

                    css[ 'KoTableCell-editable' ] = unwrap( self.isEditable );

                    self.css.notifySubscribers( css );
                } ) );

            },
            /**
             * Meant to overwrite to supply individual class names per cell by checking the context argument
             * @param {Object} $context
             * @return {ko.observable}
             */
            getCss: function( $context ) {
                var
                    self = this,
                    css = unwrap( self.css ),
                    row = $context.$parent,
                    value = self.getValueFromData( row );
                if( value && value.hasError && unwrap( value.hasError ) ) {
                    css.danger = true;
                    css[ 'text-danger' ] = true;
                } else {
                    css.danger = false;
                    css[ 'text-danger' ] = false;
                }
                if( value && value.hasWarn && unwrap( value.hasWarn ) ) {
                    css.warning = true;
                    css[ 'text-warning' ] = true;
                } else {
                    css.warning = false;
                    css[ 'text-warning' ] = false;
                }

                if( value && (value.readOnly && unwrap( value.readOnly ) || value.disabled && unwrap( value.disabled )) ) {
                    css[ 'KoEditableTableCell-disabled' ] = true;
                } else {
                    css[ 'KoEditableTableCell-disabled' ] = false;
                }
                return css;
            },
            /**
             * If set to true, column will be determined as 'Utility' column.
             * cells of 'Utility' column does not have edit mode. Arrow navigation is turned off for 'Utility' column.
             * @property utilityColumn
             * @default false
             * @type {Boolean}
             */
            utilityColumn: false,
            /**
             * Returns utilityColumn value.
             * @method isUtilityColumn
             * @returns {Boolean}
             */
            isUtilityColumn: function() {
                var
                    self = this;
                return self.utilityColumn;
            },
            /**
             * If set to true, column will be marked as sorted.
             * @property sorted
             * @type {Boolean}
             * @default false
             */
            sorted: false,
            /**
             * Checks if column is marked as sorted
             * @method isInSorters
             * @return {Boolean}
             */
            isInSorters: function() {
                var
                    self = this;
                return self.sorted;
            },
            /**
             * Returns i18n for column field if ViewModel is set and field for forPropertyName exists.
             * @default ''
             * @method getI18nForPropertyName
             * @returns {string}
             */
            getI18nForPropertyName: function() {
                var
                    self = this,
                    schemaFullPath = (self.owner.ViewModel && self.owner.ViewModel.schemaName || '').split( '.' ),
                    schemaName = schemaFullPath[ 0 ],
                    schemaSubPath = schemaFullPath.slice( 1 ),
                    defaultValue = '',
                    forPropertyName = peek( self.forPropertyName ),
                    schema,
                    i;

                if( schemaName && Y.doccirrus.schemas[ schemaName ] ) {
                    schema = Y.doccirrus.schemas[ schemaName ].schema;
                    if( schemaFullPath[ 1 ] ) {
                        schema = schema[ schemaSubPath.shift() ];
                        for( i = 0; i < schemaSubPath.length; i++ ) {
                            if( schema && schema[ 0 ] ) {
                                schema = schema[ 0 ][ schemaSubPath[ i ] ]; // go next level
                            } else {
                                Y.log( 'KoEditableTable. getI18nForPropertyName. Can not get schema by path' + self.owner.ViewModel.schemaName, 'error', NAME );
                            }
                        }
                        schema = schema && schema[ 0 ];
                    }
                    defaultValue = schema[ forPropertyName ] && schema[ forPropertyName ].i18n;
                }
                return defaultValue;
            },
            /**
             * Overwrite this method to provide your own on cell component.
             * If return falsy value, default component will be used
             * Should return component description object
             * @method getComponentNameForCell
             * @param {Object} meta meta Object. Contains row model
             * @example
             // ...,
             getComponentNameForCell: function( meta ) {
                 console.warn( 'table getComponentNameForCell :', arguments, this );
                 return false;
             }
             // ...,
             getComponentNameForCell: function( meta ) {

                 var
                    row = meta.row,
                    component;

                if( 'foo' === row.bar() ){
                    component = {
                        componentType: 'KoEditableTableInputCell',
                        componentConfig: { ... }
                        };
                } else {
                    component = {
                        componentType: 'AnotherComponent',
                        componentConfig: { ... }
                        };
                }
                return component;
             }
             */
            getComponentNameForCell: function( /*meta*/ ) {
                return '';
            },
            /**
             * Should return component for active cell
             * @param meta
             * @returns {*}
             * @private
             */
            _getComponentForCell: function( /*meta */ ) {
                throw new Error( '_getComponentForCell should be overridden' );
            }
        },
        lazy: {

            /**
             * The label of a column
             * @attribute label
             * @type {String}
             * @default string from getI18nForPropertyName
             * @see getI18nForPropertyName
             */
            label: function( key ) {
                var
                    self = this,
                    defaultValue = self.getI18nForPropertyName();
                return self._handleLazyConfig( key, ko.observable( defaultValue ) );
            },
            /**
             * The title of a column
             * @attribute title
             * @type {String}
             * @default string from getI18nForPropertyName
             * @see getI18nForPropertyName
             */
            title: function( key ) {
                var
                    self = this,
                    defaultValue = self.getI18nForPropertyName();
                return self._handleLazyConfig( key, ko.observable( defaultValue ) );
            },
            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableBaseCell' ) );
            },
            /**
             * @property widthComputed
             * @return {String}
             * @protected
             */
            widthComputed: function() {
                return ko.observable( 'auto' );
            },
            templateName: function( key ) {
                var
                    self = this;
                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableColumnBase' ) );
            },
            /**
             * In general used for the components top most element class names.
             * - here for each cell
             * - [knockout "css" binding](http://knockoutjs.com/documentation/css-binding.html)
             * @attribute css
             * @type {Object}
             * @default {}
             * @for KoEditableTableColumnBase
             */
            css: function( key ) {
                var
                    self = this,
                    isUtility = self.isUtilityColumn(),
                    forPropertyNameClassName = 'KoTableCell-forPropertyName-' + self.forPropertyName,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) ),
                    defaults = {};

                // TODO: having isUtility = th & isData = td would be better
                defaults[ forPropertyNameClassName ] = true;
                defaults[ 'KoTableCell-isUtility' ] = isUtility;
                defaults[ 'KoTableCell-isData' ] = !isUtility;
                Y.mix( peek( observable ), defaults );

                return observable;
            },
            /**
             * @attribute handleColumnOnCellClick
             * @type {Boolean}
             * @default true
             */
            handleColumnOnCellClick: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * @attribute handleTableOnCellClick
             * @type {Boolean}
             * @default true
             */
            handleTableOnCellClick: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * @attribute handleTableOnRowClick
             * @type {Boolean}
             * @default true
             */
            handleTableOnRowClick: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * In general used for the components top most element visibility.
             * - [knockout "visible" binding](http://knockoutjs.com/documentation/visible-binding.html)
             *
             * - This attribute is stateful. See {{#crossLink "KoEditableTableColumnBase/states:property"}}{{/crossLink}} for a list of prototype specific stateful property implementations.
             * - Configuration setting will be ignored once the user saves visibility configuration for that column, to prevent this see {{#crossLink "KoTableColumn/visibleByUser:attribute"}}{{/crossLink}}
             * @attribute visible
             * @for KoEditableTableColumnBase
             * @type {Boolean}
             * @default true
             */
            visible: function( key ) {
                var
                    self = this;
                return self._handleLazyConfig( key, ko.observable( true ), {
                    stateful: true
                } );
            },
            /**
             * Persist these instance properties, when a {{#crossLink "KoConfigurable/stateId:property"}}{{/crossLink}} is given.
             * This is a configuration property.
             *
             * @attribute states
             * @for KoEditableTableColumnBase
             * @type {Array}
             * @default ['visible']
             */
            states: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, [ 'visible' ] );
            },
            /**
             * User is allowed to set {{#crossLink "KoEditableTableColumnBase/visible:attribute"}}{{/crossLink}} by configuration
             * @attribute visibleByUser
             * @for KoEditableTableColumnBase
             * @type {Boolean}
             * @default true
             */
            visibleByUser: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            }
        }
    } );

    /**
     * @property KoEditableTablePairInputCell
     * @type {KoEditableTablePairInputCell}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoEditableTablePairInputCell );

    /**
     * @class KoEditableTableColumn
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     * @param {Object} config.editorField a column editor configuration object
     * @param {*|Function} config.editorField.defaultValue a default value to use when forPropertyName is undefined in the rows data,
     *                              can be any value or a function which should return a value based on the rows data passed argument
     */
    function KoEditableTableColumn() {
        KoEditableTableColumn.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoEditableTableColumn,
        extends: KoEditableTableColumnBase,
        static: {},
        descriptors: {
            componentType: 'KoEditableTableColumn',
            /**
             * Retrieve value by property name from data entry. Can also be a dot-limited path syntax to retrieve from nested data.
             * @property forPropertyName
             * @type {String}
             */
            forPropertyName: null,
            init: function() {
                var self = this;
                KoEditableTableColumn.superclass.init.apply( self, arguments );
                self.initInputCell();
            },
            /**
             * Component which is used in a cell with edit mode.
             * !!! Same component is used for all cells in a column.
             * If not set, default one will be generated with inputField config
             * @property inputCell
             * @type {Object}
             */
            inputCell: null,
            /**
             * If it is configured a custom component will be used as inputCell.
             * @propery inputField
             * @type {Object}
             * @example
             // select2 input
             ...
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
             // button input
             ...
             inputField: {
                    componentType: 'KoButton',
                    componentConfig: {
                        name: 'delete',
                        title: 'delete',
                        icon: 'TRASH_O',
                        click: function(button, $event, $context) {
                            var
                                rowModel = $context.$parent.row;
                            aEditableTable.removeRow( rowModel );
                        }
                    }
                }
             // koSchemaValue component
             inputField: {
                    componentType: 'KoSchemaValue',
                    componentConfig: {
                        fieldType: 'ISODate',
                        showLabel: false,
                        useIsoDate: true
                    }
                },
             */
            inputField: null,
            // inputFields: null,
            initInputCell: function() {
                var
                    self = this,
                    inputField = self.inputField || {};
                if( !self.inputCell ) {
                    self.inputCell = KoComponentManager.createComponent( {
                        componentType: inputField.componentType || 'KoEditableTableInputCell',
                        componentConfig: Y.merge( inputField.componentConfig || {}, { owner: self } )
                    } );
                }
            },
            /**
             * Provides the cell template data
             * @protected
             * @method getTemplateDataCell
             * @param $context
             * @return {{row: (Object), col: (KoEditableTableColumn), value: (*), colIndex: (Number), active: (ko.observable)}}
             */
            getTemplateDataCell: function( $context ) {
                var
                    self = this,
                    value = self.getValueFromData( $context.$parent ),
                    data = {
                        row: $context.$parent,
                        rowIndex: $context.$parentContext.$index(),
                        col: $context.$data,
                        colIndex: $context.$index(),
                        value: value,
                        disabled: ko.computed( function() {
                            return value && (unwrap( value.disabled ) || unwrap( value.readOnly ));
                        } ),
                        active: ko.observable( self.isUtilityColumn() )
                    };

                if( $context.$parent === KoTable.CONST.EMPTY_ROW ) {
                    return ko.observable( data );
                }

                return data;
            },
            _getComponentForCell: function( meta ) {
                var
                    self = this,
                    value = meta.value,
                    componentDescription;
                return ignoreDependencies( function() {
                    if( self.getComponentForCell && 'function' === typeof self.getComponentForCell ) {
                        componentDescription = self.getComponentForCell( meta );
                    }

                    if( !componentDescription ) {
                        componentDescription = self.inputField || {};
                    }
                    componentDescription.componentType = componentDescription.componentType || 'KoEditableTableInputCell';
                    componentDescription.componentConfig = Y.merge( componentDescription.componentConfig || {}, {
                        owner: self,
                        valueProps: {
                            hasError: value && value.hasError,
                            validationMessages: value && value.validationMessages,
                            i18n: value && value.i18n,
                            readOnly: value && value.readOnly,
                            disabled: value && value.disabled,
                            placeholder: value && value.placeholder
                        }
                    } );
                    return KoComponentManager.createComponent( componentDescription );
                } );

            }
        },
        lazy: {

            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableCell' ) );
            },
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableColumn' ) );
            }
        }
    } );
    /**
     * @property KoEditableTableColumn
     * @type {KoEditableTableColumn}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoEditableTableColumn );

    /**
     * @class KoEditableTableCheckboxColumn
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     * @param {Object} config.editorField a column editor configuration object
     * @param {*|Function} config.editorField.defaultValue a default value to use when forPropertyName is undefined in the rows data,
     *                              can be any value or a function which should return a value based on the rows data passed argument
     */
    function KoEditableTableCheckboxColumn() {
        KoEditableTableCheckboxColumn.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoEditableTableCheckboxColumn,
        extends: KoEditableTableColumnBase,
        static: {},
        descriptors: {
            width: '26px',
            componentType: 'KoEditableTableCheckboxColumn',
            /**
             * Retrieve value by property name from data entry. Can also be a dot-limited path syntax to retrieve from nested data.
             * @property forPropertyName
             * @type {String}
             */
            forPropertyName: null,
            init: function() {
                KoEditableTableCheckboxColumn.superclass.init.apply( this, arguments );
                this.initSelectAllCheckbox();
            },
            /**
             * Computes checkbox disabled for template
             * @method isCheckBoxDisabled
             * @param {Object} meta
             * @protected
             */
            isCheckBoxDisabled: function( meta ) {
                var
                    self = this,
                    isRowDisabledByMeta = self.isRowDisabledByMeta( meta );

                if( isRowDisabledByMeta ) {
                    return true;
                }

                if( Y.Lang.isFunction( self.isCheckBoxDisabledHook ) ) {
                    return self.isCheckBoxDisabledHook( meta.row );
                }

                return false;
            },
            /**
             * Meant to overwrite - do additional check to compute if a checkbox should be disabled when a function is provided.
             *
             * function receives data and should return boolean
             * @property isCheckBoxDisabled
             * @type {null|Function}
             */
            isCheckBoxDisabledHook: null,
            /**
             * Provides the cell template data
             * @protected
             * @method getTemplateDataCell
             * @param $context
             * @return {{row: (Object), col: (KoEditableTableCheckboxColumn), value: (*), colIndex: (Number), active: (ko.observable)}}
             */
            getTemplateDataCell: function( $context ) {
                var
                    self = this,
                    value = self.getValueFromData( $context.$parent ),
                    data = {
                        row: $context.$parent,
                        rowIndex: $context.$parentContext.$index(),
                        col: $context.$data,
                        colIndex: $context.$index(),
                        value: value
                    },
                    cellComponent = this._getComponentForCell( data );

                if( $context.$parent === KoTable.CONST.EMPTY_ROW ) {
                    return ko.observable( data );
                }
                return cellComponent;
            },
            utilityColumn: true,
            /**
             * If set, label is replaced with selectAll checkbox.
             * This check box can either select all items or "unselect" them.
             * @type Boolean
             * @property selectAllCheckbox
             * @default false
             */
            selectAllCheckbox: false,
            _getComponentForCell: function( meta ) {
                var
                    self = this,
                    componentDescription;
                return ignoreDependencies( function() {
                    if( self.getComponentForCell && 'function' === typeof self.getComponentForCell ) {
                        componentDescription = self.getComponentForCell( meta );
                    }

                    if( !componentDescription ) {
                        componentDescription = { componentType: 'KoEditableTableCheckboxCell' };
                    }
                    componentDescription.componentType = componentDescription.componentType || 'KoEditableTableCheckboxCell';
                    componentDescription.componentConfig = _.assign( componentDescription.componentConfig || {}, {
                        owner: self
                    }, meta );
                    return KoComponentManager.createComponent( componentDescription );
                } );

            },
            /**
             * Initializes selectAll checkbox if selectAllCheckbox is true
             * @method initSelectAllCheckbox
             */
            initSelectAllCheckbox: function() {
                var
                    self = this;
                if( !self.selectAllCheckbox ) {
                    return;
                }
                self.addDisposable( ko.computed( function() {
                    var
                        selectAll = unwrap( self.selectAll );
                    if( undefined !== selectAll ) {
                        ignoreDependencies( function() {
                            var
                                prop = self.forPropertyName,
                                rows = peek( self.owner.rows );
                            rows.forEach( function( viewModel ) {
                                if( viewModel[ prop ] ) {
                                    if( ko.isObservable( viewModel[ prop ] ) ) {
                                        viewModel[ prop ]( selectAll );
                                    } else {
                                        viewModel[ prop ] = selectAll;
                                    }
                                }
                            } );
                        } );
                    }
                } ) );
            }
        },
        lazy: {

            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableCheckboxCell' ) );
            },
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableCheckboxColumn' ) );
            },
            selectAll: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            },
            label: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            }
        }
    } );
    /**
     * @property KoEditableTableCheckboxColumn
     * @type {KoEditableTableCheckboxColumn}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoEditableTableCheckboxColumn );

    /**
     * @class KoEditableTableColumnDrag
     * @constructor
     * @extends KoTableColumn
     * @param {Object} config a configuration object
     */
    function KoEditableTableColumnDrag() {
        KoEditableTableColumnDrag.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoEditableTableColumnDrag,
        extends: KoEditableTableColumnBase,
        descriptors: {
            componentType: 'KoEditableTableColumnDrag',
            /**
             * The width of a column (specified in colgroup tag)
             * @property width
             * @type {String}
             * @default '25px'
             * @for KoEditableTableColumnDrag
             */
            width: '25px',
            /**
             * @property utilityColumn
             * @type {Boolean}
             * @default true
             * @for KoEditableTableColumnDrag
             */
            utilityColumn: true,
            /**
             * @property notClickable
             * @type {Boolean}
             * @default true
             * @for KoEditableTableColumnDrag
             */
            notClickable: true,
            /**
             * @protected
             */
            init: function() {
                var
                    self = this;
                KoEditableTableColumnDrag.superclass.init.apply( self, arguments );

            },
            /**
             * Meant to overwrite to supply individual class names per cell by checking the context argument
             * @param {Object} $context
             * @return {ko.observable}
             */
            getCss: function() {
                var
                    self = this,
                    css = unwrap( self.css );
                css[ 'KoEditableTableCell-disabled' ] = true;
                return css;
            },
            /**
             * Provides the cell template data
             * @protected
             * @method getTemplateDataCell
             * @param $context
             * @return {{row: (Object), col: (KoEditableTableCheckboxColumn), value: (*), colIndex: (Number), active: (ko.observable)}}
             */
            getTemplateDataCell: function( $context ) {
                var
                    data = {
                        row: $context.$parent,
                        rowIndex: $context.$parentContext.$index(),
                        col: $context.$data,
                        colIndex: $context.$index()
                    },
                    cellComponent;

                cellComponent = this._getComponentForCell( data );
                if( $context.$parent === KoTable.CONST.EMPTY_ROW ) {
                    return ko.observable( data );
                }
                return cellComponent;
            },
            _getComponentForCell: function( meta ) {
                var
                    self = this,
                    componentDescription;
                return ignoreDependencies( function() {
                    if( self.getComponentForCell && 'function' === typeof self.getComponentForCell ) {
                        componentDescription = self.getComponentForCell( meta );
                    }

                    if( !componentDescription ) {
                        componentDescription = { componentType: 'KoEditableTableCellDrag' };
                    }
                    componentDescription.componentType = componentDescription.componentType || 'KoEditableTableCellDrag';
                    componentDescription.componentConfig = _.assign( componentDescription.componentConfig || {}, {
                        owner: self
                    }, meta );

                    return KoComponentManager.createComponent( componentDescription );
                } );

            }
        },
        lazy: {
            /**
             * @protected
             */
            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableCellDrag' ) );
            },
            /**
             * @protected
             */
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableColumnDrag' ) );
            },

            /**
             * Rows can only be dragged by this columns handle
             * @attribute onlyDragByHandle
             * @type {ko.observable(Boolean)}
             * @default false
             */
            onlyDragByHandle: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * @attribute handleColumnOnCellClick
             * @type {Boolean}
             * @default false
             * @for KoEditableTableColumnDrag
             */
            handleColumnOnCellClick: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * @attribute handleTableOnCellClick
             * @type {Boolean}
             * @default false
             * @for KoEditableTableColumnDrag
             */
            handleTableOnCellClick: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * @attribute handleTableOnRowClick
             * @type {Boolean}
             * @default false
             * @for KoEditableTableColumnDrag
             */
            handleTableOnRowClick: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * @attribute handleColumnOnCellContextMenu
             * @type {Boolean}
             * @default true
             * @for KoEditableTableColumnDrag
             */
            handleColumnOnCellContextMenu: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * @attribute handleTableOnCellContextMenu
             * @type {Boolean}
             * @default true
             * @for KoEditableTableColumnDrag
             */
            handleTableOnCellContextMenu: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * @attribute handleTableOnRowContextMenu
             * @type {Boolean}
             * @default true
             * @for KoEditableTableColumnDrag
             */
            handleTableOnRowContextMenu: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            }
        }
    } );
    /**
     * @property KoEditableTableColumnDrag
     * @type {KoEditableTableColumnDrag}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoEditableTableColumnDrag );

    /**
     * Helper for extracting a float from a percentage string.
     * If no percentage string is provided returns 0
     * @method percentageWidthToFloat
     * @param {String|observable} width
     * @return {Number}
     * @private
     */
    function percentageWidthToFloat( width ) {
        width = String( peek( width ) );
        var result;

        if( -1 === width.indexOf( '%' ) ) {
            result = 0;
        } else {
            result = parseFloat( width );
        }

        return result;
    }

    /**
     * Compute provided column widths by keeping the initial width ratio
     * @method computeColumnWidthsByInitialRatio
     * @param {Array} columns
     * @private
     */
    function computeColumnWidthsByInitialRatio( columns ) {
        var
            colsCompute = [],
            currentTotal = 0,
            colsComputeTotal,
            widthRatio = 0;

        columns.forEach( function( column ) {
            if( peek( column.visible ) && 0 !== percentageWidthToFloat( column.width ) ) {
                colsCompute.push( column );
            }
        } );

        colsComputeTotal = utilsMath.sum( colsCompute.map( function( column ) {
            return percentageWidthToFloat( column.width );
        } ) );
        widthRatio = colsComputeTotal / 100;

        colsCompute.forEach( function( column, index ) {
            var
                width = utilsMath.round( percentageWidthToFloat( column.width ) / widthRatio, -2 );

            if( colsCompute.length === index + 1 ) {
                width = utilsMath.round( 100 - currentTotal, -2 );
            }
            column.widthComputed( String( width ) + '%' );
            currentTotal += width;

        } );

    }

    /**
     * Used for grouping rows
     * @class RowsGroup
     * @param config
     * @constructor
     */
    function RowsGroup( config ) {
        RowsGroup.superclass.constructor.call( this, config );
    }

    Y.extend( RowsGroup, Disposable, {
        initializer: function() {
            this.initObservables();
        },
        initObservables: function() {
            var
                self = this,
                data = self.get( 'data' ),
                koEditableTable = self.get( 'koEditableTable' );
            this.activate = data.activate;
            this.defaultGroup = data.defaultGroup;
            this.isDroppable = true;
            this.remove = function() {
                koEditableTable.removeGroup( this );
            };
            this.name = ko.observable( data.groupName );
            this.rows = ko.observableArray();
            this.active = ko.observable();
            this.disabled = ko.computed( function() {
                var
                    rows = unwrap( self.rows );
                if( self.defaultGroup ) {
                    return true;
                }
                return rows.some( function( row ) {
                    var
                        value = data.groupByField && row[ data.groupByField ];

                    return value && (value.readOnly && unwrap( value.readOnly ) || value.disabled && unwrap( value.disabled ));
                } );
            } );

            this.displayName = ko.computed( {
                read: this.name,
                write: function( value ) {
                    var
                        thisGroup = this;
                    koEditableTable.changeGroupName( {
                        group: thisGroup,
                        oldName: peek( thisGroup.name ),
                        newName: value
                    } );
                    thisGroup.name( value );
                    peek( thisGroup.rows ).forEach( function( row ) {
                        koEditableTable.setRowGroup( row, thisGroup );
                    } );
                },
                owner: this
            } );

            this.displayName.hasError = ko.computed( function() {
                var
                    name = unwrap( self.name );
                return !name;
            } );

            this.displayName.i18n = i18n('KoUI.KoEditableTable.placeholder.groupName');

            this.getCss = this.getCss.bind( this );
            this.afterRender = this.afterRender.bind( this );
        },
        destructor: function() {

        },
        isValid: function() {
            return !unwrap( this.displayName.hasError );
        },
        getCss: function() {
            var
                css = {},
                disabled = unwrap( this.disabled ),
                isValid = this.isValid();
            if( !isValid ) {
                css.danger = true;
                css[ 'text-danger' ] = true;
            } else {
                css.danger = false;
                css[ 'text-danger' ] = false;
            }
            css[ 'KoEditableTableCell-disabled' ] = disabled;
            return css;
        },
        afterRender: function( element ) {
            this.element = element;
            if( this.activate ) {
                jQuery( element ).children( '.KoTableCell-isData' ).click();
                this.activate = false;
            }
        }
    }, {
        ATTRS: {
            koEditableTable: {
                value: {},
                lazyAdd: false
            },
            data: {
                value: {},
                lazyAdd: false
            }
        }
    } );

    function KoEditableTable() {
        KoEditableTable.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoEditableTable,
        extends: KoComponent,
        static: {
            /**
             * initializes arrow navigation for a table.
             * @method tableNavigation
             * @param {Object} el table element (DOM,jQuery)
             * @static
             */
            tableNavigation: function( el ) {
                var $table = jQuery( el );

                function activateCell( $cell ) {
                    // setTimeout because of KoSchemaValue does not work correctly without timeout
                    setTimeout( function() {
                        if( $cell.hasClass( 'KoTableCell-isData' ) ) {
                            $cell.click();
                        }
                        if( $cell.hasClass( 'KoTableCell-isUtility' ) ) {
                            $cell.find( 'button, input' ).first().focus();
                        }
                    }, 0 );
                    return false;

                }

                function moveRightOrLeft( direction, el, goToNextLine ) {
                    var $el = jQuery( el ),
                        $td = $el.closest( 'td' ),
                        $nextCell,
                        $nextTr,
                        $pairInput,
                        hiddenInput = $el.parents( '.KoField' ).find( 'input[type=hidden]' );
                    if( hiddenInput && 1 === hiddenInput.length && hiddenInput.data( 'select2' ) && hiddenInput.select2( 'opened' ) ) {
                        return true;
                    }
                    direction = 'right' === direction ? 'nextAll' : 'prevAll';
                    if( $el.is( '.hasPairInputs' ) ) {
                        $pairInput = $el[ direction ]( '.hasPairInputs' ).first();
                        if( $pairInput.length ) {
                            $pairInput.focus();
                            return false;
                        }
                    } else {
                        $el.blur();
                    }
                    $nextCell = $td[ direction ]( ':not(.KoEditableTableCell-disabled, :hidden)' ).first();
                    if( $nextCell.length ) {
                        return activateCell( $nextCell );
                    } else {
                        if( goToNextLine ) {
                            // jump to next/prev line
                            $nextTr = $td.closest( 'tr' )[ 'nextAll' === direction ? 'next' : 'prev' ]( 'tr:has(td:not(.KoEditableTableCell-disabled))' );
                            if( $nextTr.length ) {
                                if( 'nextAll' === direction ) {
                                    $nextCell = $nextTr.children().not( '.KoEditableTableCell-disabled, :hidden' ).first();
                                } else {
                                    $nextCell = $nextTr.children().not( '.KoEditableTableCell-disabled, :hidden' ).last();
                                }
                                return activateCell( $nextCell );
                            }
                        } else {
                            $nextTr = $td.closest( 'tr' );
                            if( $nextTr.length ) {
                                if( 'nextAll' === direction ) {
                                    $nextCell = $nextTr.children().not( '.KoEditableTableCell-disabled, :hidden' ).first();
                                } else {
                                    $nextCell = $nextTr.children().not( '.KoEditableTableCell-disabled, :hidden' ).last();
                                }
                                return activateCell( $nextCell );
                            }
                        }

                    }

                    return;
                }

                function moveDownOrUp( direction, el, ctrlKey ) {
                    var $el = jQuery( el ),
                        $td = $el.closest( 'td' ),
                        index = $td.index(),
                        $nextTr,
                        $nextCell,
                        $pairInput;
                    direction = 'down' === direction ? 'next' : 'prev';
                    if( $el.is( '.select2-focused' ) && !ctrlKey ) {
                        return true;
                    }
                    if( $el.is( '.hasPairInputs' ) ) {
                        $pairInput = $el[ direction ]( '.hasPairInputs' ).first();
                        if( $pairInput.length ) {
                            $pairInput.focus();
                            return false;
                        }
                    } else {
                        $el.blur();
                    }
                    $nextTr = $td.closest( 'tr' )[ direction + 'All' ]( 'tr:not(.KoEditableTableGroupHeader):has(td:eq(' + index + '):not(.KoEditableTableCell-disabled))' );

                    if( $nextTr.length ) {
                        $nextCell = $nextTr.children().eq( index ).first();
                        return activateCell( $nextCell );
                    } else {
                        if( 'next' === direction ) {
                            $nextTr = $td.closest( 'tbody' ).find( 'tr:not(.KoEditableTableGroupHeader):has(td:eq(' + index + '):not(.KoEditableTableCell-disabled)))' ).first();
                        } else {
                            $nextTr = $td.closest( 'tbody' ).find( 'tr:not(.KoEditableTableGroupHeader):has(td:eq(' + index + '):not(.KoEditableTableCell-disabled)))' ).last();
                        }
                        $nextCell = $nextTr.children().eq( index ).first();
                        return activateCell( $nextCell );
                    }
                }

                function deactivateCell( el ) {
                    var
                        $el = jQuery( el );
                    $el.blur();
                }

                $table.find( 'table:has(.KoTable-rows)' ).first().on( 'keydown', '.KoTable-rows :input', function( evt ) {
                    switch( evt.which ) {
                        case 9:
                            if( evt.shiftKey ) {
                                return moveRightOrLeft( 'left', this, true );
                            }
                            return moveRightOrLeft( 'right', this, true );
                        case 39:
                            if( ('text' !== this.type && 'textarea' !== this.type) || this.selectionStart === this.value.length ) {
                                return moveRightOrLeft( 'right', this );
                            }
                            break;
                        case 37:
                            if( ('text' !== this.type && 'textarea' !== this.type) || 0 === this.selectionStart ) {
                                return moveRightOrLeft( 'left', this );
                            }
                            break;
                        case 38:
                            if( 'textarea' !== this.type || 0 === this.selectionStart ) {
                                return moveDownOrUp( 'up', this, evt.ctrlKey || evt.metaKey );
                            }
                            break;
                        case 40:
                            if( 'textarea' !== this.type || this.selectionStart === this.value.length ) {
                                return moveDownOrUp( 'down', this, evt.ctrlKey || evt.metaKey );
                            }
                            break;
                        case 27:
                            deactivateCell( this );
                            return false;
                    }
                } );
            }
        },
        descriptors: {

            fieldType: '',
            valueSubscription: null,
            componentType: 'KoEditableTable',

            valueComputed: null,
            defaultGroupName: i18n( 'KoUI.KoEditableTable.text.defaultGroupName' ),
            groupCounter: 0,
            init: function() {
                var
                    self = this,
                    rightAligned = [],
                    leftAligned = [];
                KoEditableTable.superclass.init.apply( self, arguments );
                self.buildGroups( peek( self._convertedData ) );
                self.onBodyClick = Y.bind( self.onBodyClick, self );
                self.getTemplateNameRow = Y.bind( self.getTemplateNameRow, self );
                self.initColumns();
                self.initComputeColumnWidths();

                rightAligned.push( self.toolsAction );
                leftAligned.push( self.addRowAction );
                leftAligned.push( self.addGroupAction );
                self.footer.rightAligned.items( rightAligned );
                self.footer.leftAligned.items( leftAligned );

            },
            initComputeColumnWidths: function() {
                var
                    self = this,
                    columns = peek( self.columns ),
                    colsWidthAuto = columns.filter( filterColumnWidthAuto ),
                    sumWidthAuto, eachWidthAuto, checkSum;

                function filterColumnWidthAuto( column ) {
                    if( 'auto' === peek( column.width ) ) {
                        return true;
                    }
                    return false;
                }

                // compute the percentage value per each width:auto column
                // necessary for fixedTableLayout
                if( colsWidthAuto.length ) {

                    sumWidthAuto = utilsMath.sum( columns.map( function( column ) {
                        return percentageWidthToFloat( column.width );
                    } ) );

                    eachWidthAuto = utilsMath.round( (100 - sumWidthAuto) / colsWidthAuto.length, -2 );

                    if( 100 !== sumWidthAuto ) {
                        colsWidthAuto.forEach( function( column, index ) {

                            if( colsWidthAuto.length === index + 1 ) {
                                eachWidthAuto = utilsMath.round( 100 - sumWidthAuto, -2 );
                            }
                            column.width = String( eachWidthAuto ) + '%';
                            sumWidthAuto += eachWidthAuto;
                        } );
                    }

                }

                // computing columns needs a total of 100% when using auto or %
                // in case no width auto, do check total of 100%
                checkSum = utilsMath.sum( columns.map( function( column ) {
                    return percentageWidthToFloat( column.width );
                } ) );
                if( 99.75 > checkSum || 100.25 <= checkSum ) {
                    Y.log( 'Your columns percent width usages have to make up 100%', 'error', NAME );
                }

                // subscribe to computeColumnWidths dependencies
                self.addDisposable( ko.computed( function() {
                    unwrap( self.columns ).forEach( function( column ) {
                        unwrap( column.visible );
                    } );
                    computeColumnWidthsByInitialRatio( peek( self.columns ) );
                } ).extend( { rateLimit: 0 } ) );
            },
            /**
             * The columns configuration array
             * @property columns
             * @type {Array}
             * @example
             KoComponentManager.createComponent( {
                 componentType: 'KoEditableTable',
                 componentConfig: {
                     columns: [
                         {
                             forPropertyName: 'value',
                             label: 'value',
                             title: 'something more descriptive'
                         }
                     ]
                 }
             } )
             */
            columns: null,
            /**
             * @method initColumns
             * @protected
             */
            initColumns: function() {
                var
                    self = this,
                    columns = [].concat( unwrap( self.columns ) ),  // TODO: [MOJ-3842] KoUI: ko.extenders.makeKoComponent should apply owner & not clean the referenced configuration items
                    stateId = peek( self.stateId ),
                    everyColumnHasForPropertyName = Y.Array.every( columns, function( column ) {
                        return Boolean( peek( column.forPropertyName ) );
                    } );
                if( !everyColumnHasForPropertyName || Y.Array.dedupe( columns.map( function( column ) {
                        return column.forPropertyName;
                    } ) ).length !== columns.length ) {
                    Y.log( 'every column need a unique forPropertyName!', 'error', NAME );
                }

                Y.each( columns, function( column ) {
                    if( !column.owner ) {
                        column.owner = self; // TODO: see owner tasks
                    }
                    // set column stateId
                    if( !peek( column.stateId ) ) {
                        column.stateId = stateId + '-column-' + column.forPropertyName;
                    }
                } );
                self.columns = ko.observableArray( columns ).extend( { makeKoComponent: { componentType: 'KoEditableTableColumn' } } );
            },
            /**
             * @method getTemplateNameRow
             * @return {string}
             * @protected
             */
            getTemplateNameRow: function() {
                return unwrap( this.templateNameRow );
            },
            /**
             * @method getTemplateNameGroupRow
             * @return {string}
             * @protected
             */
            getTemplateNameGroupRow: function() {
                return unwrap( this.templateNameGroupRow );
            },
            /**
             * @method _getCssRow
             * @param $context
             * @return Object
             * @protected
             */
            _getCssRow: function( $context ) {
                var
                    self = this,
                    css = {};
                if( $context.$data !== KoTable.CONST.EMPTY_ROW ) {
                    self.getCssRow( $context, css );
                }
                if( peek( self.draggableRows ) ) {
                    if( $context.$data === KoTable.CONST.EMPTY_ROW ) {
                        css[ CSS_KOTABLE_ROW_ISDRAGGABLE ] = false;
                        css[ CSS_KOTABLE_ROW_ISDROPPABLE ] = false;
                    }
                    else {
                        css[ CSS_KOTABLE_ROW_ISDRAGGABLE ] = self._isRowDraggable( $context );
                        css[ CSS_KOTABLE_ROW_ISDROPPABLE ] = self._isRowDroppable( $context );
                    }
                }

                return css;
            },
            /**
             * @method getRowGroupName
             * @param {Object} row
             * @returns {string}
             */
            getRowGroupName: function( row ) {
                var
                    groupByField = this._getGroupByField(),
                    groupName = unwrap( this.showGroups ) && groupByField && peek( row[ groupByField ] ) || this.defaultGroupName;
                return groupName;
            },
            /**
             * Sets group name value to row group field.
             * default group sets default value for field (defined in schema) or undefined
             * @method setRowGroup
             * @param {Object} row
             * @param {Object} group
             */
            setRowGroup: function( row, group ) {
                var
                    groupByField = unwrap( this.showGroups ) && this._getGroupByField(),
                    defaultValue;
                if( groupByField && ko.isObservable( row[ groupByField ] ) ) {
                    if( group.defaultGroup ) {
                        defaultValue = row.get && row.get( 'defaults' ) && row.get( 'defaults' )[ groupByField ];
                        row[ groupByField ]( defaultValue );
                    } else {
                        row[ groupByField ]( peek( group.name ) );
                    }
                }
            },
            /**
             * @method buildGroups
             * @param {Object} data
             */
            buildGroups: function( data ) {
                var
                    self = this,
                    groupByField = self._getGroupByField();
                self.groupsMap = {};
                self.addGroup( {
                    groupName: this.defaultGroupName,
                    defaultGroup: true
                } );

                // add rows in a batch
                self.addRowsToGroup( data.map( function( model ) {
                    var groupName = unwrap( self.showGroups ) && groupByField && peek( model[groupByField] ) || self.defaultGroupName;
                    return { item: model, groupName: groupName };
                } ) );

                self._convertedData.subscribe( function( changes ) {
                    /**
                     * Here, speed issues may arise, when adding or removing plenty of rows.
                     * This happens, i.e. when saving the activity, which reloads the whole data set.
                     * With 90+ rows, the browser almost freezes when updating everything
                     * after each row. Therefore, we manually mutate the groups, once all changes have been applied.
                     */
                    var
                        groupsModified = {},
                        i, l, group, groupName, change,
                        groupMutationAnnounced, modifyParams;

                    for( i = 0, l = changes.length; i < l; i++ ) {
                        change = changes[i];
                        groupName = self.getRowGroupName( change.value );
                        groupMutationAnnounced = Object.prototype.hasOwnProperty.call( groupsModified, groupName );
                        modifyParams = {
                            item: change.value,
                            groupName: groupName,
                            manualMutation: true,
                            groupMutationAnnounced: groupMutationAnnounced
                        };

                        if( 'added' === change.status ) {
                            group = self.addRowToGroup( modifyParams );
                        } else {
                            group = self.removeRowFromGroup( modifyParams );
                        }

                        if( group && !groupMutationAnnounced ) {
                            groupsModified[groupName] = group;
                        }
                    }

                    // call all subscribers for the group once
                    Object.keys( groupsModified ).forEach( function forEachGroupModified( key ) {
                        groupsModified[key].rows.valueHasMutated();
                    } );

                }, null, 'arrayChange' );
            },
            /**
             * Gets group by name, if there is more than one group with same name
             *  uses row(if provided) to identify exact group, otherwise return first.
             * @method getGroupByName
             * @param {String} groupName
             * @param {Object} [row]
             * @returns {null|Object}
             */
            getGroupByName: function( groupName, row ) {
                var
                    groups = this.groupsMap[ groupName ];
                if( groups && groups.length ) {
                    if( 1 === groups.length || !row ) {
                        return groups[ 0 ];
                    } else {
                        return _.find( groups, function( group ) {
                            return -1 !== group.rows.indexOf( row );
                        } );
                    }
                }
                return null;
            },
            /**
             * Deregisters old group name and register new one
             * @method changeGroupName
             * @param {Object} params
             * @param {Object} params.group
             * @param {String} params.oldName
             * @param {String} params.newName
             */
            changeGroupName: function( params ) {
                var
                    group = params.group,
                    oldName = params.oldName,
                    newName = params.newName;
                this.groupsMap[ oldName ] = this.groupsMap[ oldName ].filter( function( _group ) {
                    return _group !== group;
                } );
                this._registerGroup( group, newName );
            },
            /**
             * This function adds a row to a group. Creates a group, if necessary.
             * If manualMutation is set to true, will call
             * group.rows.valueWillMutate(); before modifying the underlying array.
             * IT IS YOU RESPONSIBILITY THEN, TO CALL group.rows.valueHasMutated(); afterwards!!!
             * @method addRowToGroup
             * @param {Object} params
             * @param {Object} params.item
             * @param {String} params.groupName
             * @param {object|undefined} params.group
             * @param {boolean|undefined} params.manualMutation
             * @param {boolean|undefined} params.groupMutationAnnounced has a groupMutation already been announced? avoids announcing it multiple times
             * @returns {object} group
             */
            addRowToGroup: function( params ) {
                var
                    item = params.item,
                    groupName = params.groupName,
                    group = params.group || this.getGroupByName( groupName ),
                    currentGroupItems;

                if( !group ) {
                    group = this.addGroup( { groupName: groupName } );
                }
                this.setRowGroup( item, group );

                if( !!params.manualMutation ) {
                    currentGroupItems = peek( group.rows );
                    if( !params.groupMutationAnnounced ) {
                        group.rows.valueWillMutate();
                    }
                    currentGroupItems.push( item );
                    // DONT CALL valueHasMutated here!!!
                } else {
                    group.rows.push( item );
                }

                return group;
            },
            /**
             * Adds multiple rows to their respective groups in batches.
             * Calls valueWillMutate and valueHasMutated only once per group,
             * therefore saving a lot of updates.
             * @method addRowsToGroup
             * @param {{item: object, groupName: string}[]} items
             */
            addRowsToGroup: function( items ) {
                var
                    self = this,
                    groupsToModify = {},
                    groupDictionary = {};

                if( Array.isArray( items ) ) {

                    // sort all changes into changes for each group
                    items.forEach( function forEachAddRowsToGroupItem( params ) {
                        var
                            item = params.item,
                            groupName = params.groupName,
                            group = params.group || self.getGroupByName( groupName );
                        if( !group ) {
                            group = self.addGroup( { groupName: groupName } );
                        }
                        self.setRowGroup( item, group );
                        if( !Object.prototype.hasOwnProperty.call( groupsToModify, groupName ) ) {
                            groupsToModify[groupName] = [];
                            groupDictionary[groupName] = group;
                        }
                        groupsToModify[groupName].push( item );
                    } );

                    // modify each group with all changes in one batch
                    Object.keys( groupsToModify ).forEach( function forEachGroupToModify( groupName ) {
                        var
                            group = groupDictionary[groupName],
                            currentGroupItems = peek( group.rows );
                        // push all at once
                        group.rows.valueWillMutate();
                        currentGroupItems.push.apply( currentGroupItems, groupsToModify[groupName] );
                        group.rows.valueHasMutated();
                    } );
                }
            },
            /**
             * This function removes a row from its group.
             * if manualMutation is set to true, will call
             * group.rows.valueWillMutate(); before modifying the underlying array.
             * IT IS YOU RESPONSIBILITY THEN, TO CALL group.rows.valueHasMutated(); afterwards!!!
             * @method removeRowFromGroup
             * @param {Object} params
             * @param {Object} params.item
             * @param {String} params.groupName
             * @param {boolean|undefined} params.manualMutation
             * @param {boolean|undefined} params.groupMutationAnnounced has a groupMutation already been announced? avoids announcing it multiple times
             * @returns {object} group
             */
            removeRowFromGroup: function( params ) {
                var
                    group = this.getGroupByName( params.groupName, params.item ),
                    currentGroupItems;
                if( group ) {
                    if( !!params.manualMutation ) {
                        if( !params.groupMutationAnnounced ) {
                            group.rows.valueWillMutate();
                        }
                        currentGroupItems = peek( group.rows );
                        ko.utils.arrayRemoveItem( currentGroupItems, params.item );
                        // DONT CALL valueHasMutated here!!!
                    } else {
                        group.rows.remove( params.item );
                    }
                }
                return group;
            },
            /**
             * Removes multiple rows from their respective groups in batches.
             * Calls valueWillMutate and valueHasMutated only once per group,
             * therefore saving a lot of updates.
             * @method removeRowsFromGroup
             * @param {{item: object, groupName: string}[]} items
             */
            removeRowsFromGroup: function( items ) {
                var
                    self = this,
                    groupsToModify = {},
                    groupDictionary = {};

                if( Array.isArray( items ) ) {

                    // sort all changes into changes for each group
                    items.forEach( function forEachRemoveRowsFromGroupItem( params ) {
                        var
                            item = params.item,
                            groupName = params.groupName,
                            group = self.getGroupByName( groupName, item );
                        if( !Object.prototype.hasOwnProperty.call( groupsToModify, groupName ) ) {
                            groupsToModify[groupName] = [];
                            groupDictionary[groupName] = group;
                        }
                        groupsToModify[groupName].push( item );
                    } );

                    // modify each group with all changes in one batch
                    Object.keys( groupsToModify ).forEach( function forEachGroupToModify( groupName ) {
                        var
                            group = groupDictionary[groupName],
                            currentGroupItems = peek( group.rows );
                        // remove  all at once
                        group.rows.valueWillMutate();
                        groupsToModify[groupName].forEach( function forEachEntryToRemove( entry ) {
                            ko.utils.arrayRemoveItem( currentGroupItems, entry );
                        } );
                        group.rows.valueHasMutated();
                    } );

                }
            },
            /**
             * @method removeGroup
             * @param {Object} group
             */
            removeGroup: function( group ) {
                var
                    self = this,
                    rows = peek( group.rows ),
                    groups = peek( this.groups ),
                    groupIndex = groups.indexOf( group ),
                    targetGroup;
                if( 0 === groupIndex ) {
                    targetGroup = groups[ 1 ];
                } else {
                    targetGroup = groups[ groupIndex - 1 ];
                }
                rows.forEach( function( row ) {
                    self.addRowToGroup( { item: row, group: targetGroup } );
                } );
                this.groups.remove( group );
            },
            /**
             * @method addGroup
             * @param {String} groupName
             * @param {Boolean} [defaultGroup] if set, group is marked as default
             * @returns {RowsGroup}
             */
            addGroup: function( params ) {
                var

                    self = this,
                    activate = params.activate,
                    groupName = params.groupName,
                    defaultGroup = params.defaultGroup,
                    newGroup = new RowsGroup( {
                        data: {
                            id: self.groupCounter,
                            defaultGroup: defaultGroup,
                            groupName: groupName,
                            groupByField: self._getGroupByField(),
                            activate: activate
                        },
                        koEditableTable: self
                    } );

                self._registerGroup( newGroup );
                self.groupCounter++;
                self.groups.push( newGroup );
                return newGroup;
            },
            /**
             * @method _registerGroup
             * @param {Object} group
             * @param {String} groupName
             * @private
             */
            _registerGroup: function( group, groupName ) {
                var
                    _groupName = groupName || peek( group.name );
                this.groupsMap[ _groupName ] = this.groupsMap[ _groupName ] || [];
                this.groupsMap[ _groupName ].push( group );
            },
            /**
             * Checks whether item is group object or not
             * @method isGroup
             * @param {Object} item
             * @returns {boolean}
             */
            isGroup: function( item ) {
                return item instanceof RowsGroup;
            },
            /**
             * Overwrite this method to provide individual class names for each row.
             * Put class names in the css argument, by inspecting the $context argument
             * @method getCssRow
             * @param {Object} $context the context of the row
             * @param {Object} css class names to be applied to that property
             */
            getCssRow: function( /*$context, css*/ ) {
            },
            /** @private **/
            _getStyleRow: function( $context ) {
                var
                    self = this,
                    $data = $context.$data;
                return self.getStyleRow( $data );
            },
            /**
             * Overwrite this method to provide an individual style for each row.
             * The return value will be the content of the style-attribute for that row.
             * @method getStyleRow
             * @param {Object} rowData the data of the row
             * @return {string}
             */
            getStyleRow: function( /*rowData*/ ) {
                return '';
            },
            /**
             * Keeps active cell model
             * @property activeCell
             * @type {Object}
             */
            activeCell: null,
            /**
             * Deactivates prev cell model, and activates provided cell model.
             * Set provided cell model to activeCell
             * @method setActiveCell
             * @param {Object} cellModel
             */
            setActiveCell: function( cellModel ) {
                var
                    self = this;
                if( self.activeCell ) {
                    self.activeCell.active( false );
                }
                cellModel.active( true );
                self.activeCell = cellModel;

            },
            /**
             * handles cell click:
             *  Turns prev active cell to read mode
             *  Turns new active cell to edit mode
             *  Set focus to new active cell
             *  Listen inputCell component value changes and updates cell model value(view model prop)
             * @method handleOnCellClick
             * @param {Object} params
             * @param {Object} params.cellModel cell model
             * @param {Object} params.colModel column model
             * @param {Object} params.colTd td element (DOM, jQuery)
             */
            handleOnCellClick: function( params ) {
                var
                    self = this,
                    cellModel = params.cellModel,
                    colModel = params.colModel,
                    colTd = params.colTd,
                    modelRow = params.modelRow,
                    cellModelValue,
                    $input,
                    select2Input;

                if( peek( cellModel.disabled ) ) {
                    return;
                }

                if( colModel.isUtilityColumn() ) {
                    return true;
                }

                if( self.valueComputed && self.valueComputed.dispose ) {
                    self.valueComputed.dispose();
                }

                colModel.inputCell = colModel._getComponentForCell( {
                    row: modelRow,
                    value: cellModel.value
                } );

                /**
                 * Before setting the model's value to the input cell,
                 * try to call a possible cellModel.beforeEditorOpen hook,
                 * which may convert the model's value into a specific format.
                 * E.g. a number (1,000.23456) within the model may be converted into a localized format.
                 * => (1.000,23456). Use cellModel.beforeEditorWriteBack, to convert the value in the opposite direction.
                 */
                cellModelValue = peek( cellModel.value );
                if( Object.prototype.hasOwnProperty.call( colModel.inputCell, 'beforeEditorOpen' ) &&
                    typeof colModel.inputCell.beforeEditorOpen === "function" ) {
                    cellModelValue = colModel.inputCell.beforeEditorOpen( cellModelValue, cellModel );
                }

                // set the input cell's value with the initial model value and mark the cell/row as active
                colModel.inputCell.value( cellModelValue );
                self.activeRow( modelRow );
                self.setActiveCell( cellModel );

                self.valueComputed = ko.computed( function() {
                    var
                        value = colModel.inputCell.value();

                    /**
                     * Before setting the model's value from the input cell's value,
                     * try to call a possible cellModel.beforeEditorWriteBack hook,
                     * which may convert the input cell's value into a specific format.
                     * E.g. a string in localized format (1.000,23456) may be converted back into an actual number.
                     */
                    if( Object.prototype.hasOwnProperty.call( colModel.inputCell, 'beforeEditorWriteBack' ) &&
                        typeof colModel.inputCell.beforeEditorWriteBack === "function" ) {
                        value = colModel.inputCell.beforeEditorWriteBack( value, cellModel );
                    }

                    // set the model value with the input cell's value
                    try {
                        cellModel.value( value );
                    } catch (err ) {
                        Y.log( 'Could not set editable cell value: ' + JSON.stringify( err ), 'warn', NAME );
                    }
                } );

                $input = jQuery( colTd ).find( 'input, textarea' ).first();

                select2Input = jQuery( colTd ).find( 'input' ).last();
                select2Input = select2Input.data( 'select2' ) && select2Input;

                if( $input.length ) {
                    $input.focus();
                    if( select2Input ) {
                        select2Input.on( 'select2-blur', function() {
                            if( !select2Input.select2( 'isFocused' ) && !select2Input.select2( 'opened' ) ) {
                                // need delay to update value
                                setTimeout( function() {
                                    self.activeRow( null );
                                    cellModel.active( false );
                                }, 100);
                            }
                        } );

                    } else {
                        $input.on( 'focusout.editableTable', function() {
                            if( $input.is( '.hasPairInputs' ) ) {
                                $input.off( 'focusout.editableTable' );
                                self.checkSiblingsFocusout( $input, cellModel );
                            } else {
                                if( !$input.parent().find( '.hasFeedback-icon:hover' ).length ) {
                                    $input.off( 'focusout.editableTable' );
                                    // need delay to update value
                                    setTimeout( function() {
                                        self.activeRow( null );
                                        cellModel.active( false );
                                    }, 100);
                                }
                            }
                        } );
                    }
                }
            },
            checkSiblingsFocusout: function( $input, cellModel ) {
                var
                    self = this;
                /**
                 * Chrome has some issue here. For some reason onBodyClick gets tbody as $event.target instead of tr or td(resize cell issue).
                 */
                setTimeout( function() {
                    var
                        $input2;
                    $input2 = $input.siblings();
                    if( $input2.is( '.hasPairInputs:focus' ) ) {
                        $input2.one( 'focusout.editableTable', function() {
                            self.checkSiblingsFocusout( $input2, cellModel );
                        } );
                    } else {
                        if( !$input.parent().find( '.hasFeedback-icon:hover' ).length ) {
                            $input.off( 'focusout.editableTable' );
                            self.activeRow( null );
                            cellModel.active( false );
                        }
                    }
                }, 15 );

            },
            /**
             * @method onBodyClick
             * @protected
             */
            onBodyClick: function( table, $event ) {

                var self = this,
                    $target = jQuery( $event.target ),
                    isTd = $target.is( 'tr.KoTable-row > td' ),
                    isLink,
                    isButton = Boolean( $target.is( 'button' ) || $target.parents( 'button' ).get( 0 ) ),
                    colModel,
                    handleColumnOnCellClick,
                    handleTableOnCellClick,
                    handleTableOnRowClick,
                    modelRow,
                    cellModel,
                    colTd = (isTd ? $target : $target.parents( 'tr.KoTable-row > td' )).get( 0 ),
                    bubble, meta,
                    colTdJq = jQuery( colTd ),
                    isGroupHeader = $target.parents( 'tr.KoEditableTableGroupHeader' ).get( 0 ),
                    isTdContentEmpty = (colTd && colTdJq.hasClass( 'KoTableCell-isUtility' ) && colTdJq.is( ':empty' )),
                    isActive = Boolean( !isTd && !isButton && $target.parents( 'div.KoTableCell' ).get( 0 ) ); // not active does not have such parent

                if( isActive || !colTd || isTdContentEmpty ) {
                    return true;
                }
                isLink = Boolean( $target.is( 'a' ) || $target.parents( 'a' ).get( 0 ) );
                colModel = ko.dataFor( colTd );
                if( !colModel ) {
                    // no model defined = model got deleted => i.e. after removing a row through a click on delete button in row
                    return true;
                }
                if( isGroupHeader ) {
                    return self.handleOnGroupHeaderClick( {
                        groupModel: colModel,
                        target: $target,
                        columnTd: colTd
                    } );
                }
                if( colModel.notClickable ) {
                    return true;
                }
                cellModel = ko.dataFor( jQuery( colTd ).children( 'div.KoTableCell' )[ 0 ] );
                handleColumnOnCellClick = peek( colModel.handleColumnOnCellClick );
                handleTableOnCellClick = peek( colModel.handleTableOnCellClick );
                handleTableOnRowClick = peek( colModel.handleTableOnRowClick );
                modelRow = ko.dataFor( $target.parents( 'tr.KoTable-row' ).get( 0 ) );
                bubble = true;

                // TODO: self.onBodyClickAllowed
                if( modelRow && (modelRow !== KoTable.CONST.EMPTY_ROW) && handleColumnOnCellClick ) {
                    meta = {
                        row: modelRow,
                        col: colModel,
                        value: colModel.getValueFromData( modelRow ),
                        isLink: isLink,
                        isButton: isButton
                    };

                    // return false will break chain, on BodyClick bound to defaultPrevented
                    bubble = false !== colModel.onCellClick( meta, $event );
                    if( $event.isPropagationStopped() || $event.isImmediatePropagationStopped() ) {
                        bubble = false;
                    }
                    if( bubble && handleTableOnCellClick ) {
                        bubble = false !== self.onCellClick( meta, $event );
                        if( $event.isPropagationStopped() || $event.isImmediatePropagationStopped() ) {
                            bubble = false;
                        }
                        if( bubble && handleTableOnRowClick ) {
                            bubble = false !== self.onRowClick( meta, $event );
                            if( $event.isPropagationStopped() || $event.isImmediatePropagationStopped() ) {
                                bubble = false;
                            }
                        }
                    }
                }
                if( bubble || !$event.isDefaultPrevented() ) {
                    self.handleOnCellClick( {
                        cellModel: cellModel,
                        colModel: colModel,
                        colTd: colTd,
                        modelRow: modelRow
                    } );
                }

                return bubble || !$event.isDefaultPrevented();
            },
            /**
             * Special handler of group header click event
             * @param {Object} params
             */
            handleOnGroupHeaderClick: function( params ) {
                var
                    self = this,
                    groupModel = params.groupModel,
                    target = params.target,
                    columnTd = params.columnTd,
                    isKoTableCell = target && target.hasClass( 'KoTableCell' ) || target.children( 'div.KoTableCell' ).length,
                    $input,
                    isDisabled = groupModel && peek( groupModel.disabled );
                if( isKoTableCell && !isDisabled ) {
                    self.setActiveCell( groupModel );
                    $input = jQuery( columnTd ).find( 'input' ).first();
                    if( $input ) {
                        $input.focus();
                        $input.on( 'focusout.editableTable', function() {
                            $input.off( 'focusout.editableTable' );
                            groupModel.active( false );
                        } );
                    }
                }
            },
            /**
             * Overwrite this method to provide your own on row click handling.
             * @returns {boolean}
             */
            onRowClick: function( /*meta, $event*/ ) {
                return true;
            },
            /**
             * Overwrite this method to provide your own on cell click handling.
             * If it returns false or $event.stopImmediatePropagation, $event.stopPropagation is called no event bubbling will occur.
             * If $event.preventDefault is called only the default action is prevented.
             * @method onCellClick
             * @param {Object} meta row meta Object
             * @param {Event} $event the raised event
             * @return {boolean}
             * @example
             // … ,
             onCellClick: function( meta, event ) {
                 console.warn( 'table onCellClick :', arguments, this );
             }
             */
            onCellClick: function( /*meta, $event*/ ) {
                return true;
            },
            /**
             * if unset defaults to KoTableHeader default name
             * @property templateNameHeader
             * @type {KoTableHeader}
             * @default null
             * @protected
             */
            templateNameHeader: null,
            /**
             * constructor for row model
             * @property ViewModel
             * @type {Constructor}
             */
            ViewModel: null,
            interceptRenderOutput: null,
            /**
             * Removes all rows
             * @method removeAllRows
             */
            removeAllRows: function() {
                var
                    self = this,
                    rows = peek( self.rows ).slice();

                rows.forEach( function( row ) {
                    self.removeRow( row );
                } );
            },

            /**
             * Calls "destroy" method of row view model and removes row from rows array.
             * @method removeRow
             * @param {Object} row row view model
             */
            removeRow: function( row ) {
                var
                    self = this;

                if( self.convertDataArray ) {
                    self.addedRows.remove( row );
                }
                self._convertedData.remove( row );
                if( row.destroy ) {
                    row.destroy();
                }
            },
            /**
             * First looks for row. Then removes the found(first) row.
             * @method removeRowByCriteria
             * @param {Object} criteria
             * @see removeRow
             * @example
             *  aKoEditableTable.removeRowByCriteria({foo: 'bar'})
             */
            removeRowByCriteria: function( criteria ) {
                var
                    self = this,
                    rows = peek(self.rows),
                    row;
                row = _.find( rows, function( _row ) {
                    return Object.keys( criteria ).every( function( key ) {
                        return peek( _row[ key ] ) === criteria[ key ];
                    } );
                } );
                self.removeRow( row );
            },
            groupByField: null,
            _getGroupByField: function() {
                return this.groupByField;
            },
            /**
             * Takes data object and returns instance of ViewModel
             * Injects sharedViewModelData into viewModel as ATTRS.
             * @param data
             * @returns {Object} instance of ViewModel
             * @private
             */
            _getViewModelInstance: function( data ) {
                var
                    self = this,
                    viewModel;
                if( self.sharedViewModelData ) {
                    if( data instanceof self.ViewModel ) {
                        Object.keys( self.sharedViewModelData ).forEach( function( key ) {
                            if( data.set ) {
                                data.set( key, self.sharedViewModelData[ key ] );
                            } else {
                                data[ key ] = self.sharedViewModelData[ key ];
                            }

                        } );
                    } else {
                        _.assign( data || {}, self.sharedViewModelData );
                    }

                }
                if( data instanceof self.ViewModel ) {
                    viewModel = data;
                } else {
                    viewModel = new self.ViewModel( data );
                }
                return viewModel;
            },
            /**
             * Add new row to rows array. If data is plain object,
             *  it is passed to ViewModel constructor.
             * @method addRow
             * @param {Object} data plain/view model object
             */
            addRow: function( data ) {
                var
                    self = this,
                    viewModel = null;
                ignoreDependencies( function() {
                    viewModel = self._getViewModelInstance( data );
                    self._convertedData.push( viewModel );
                    if( self.convertDataArray ) {
                        self.addedRows.push( viewModel );
                    }
                } );

            },
            /**
             * Retrieves a configured {{#crossLink "KoEditableTableColumn"}}KoEditableTableColumn{{/crossLink}} by property name.
             * @method getColumnByPropertyName
             * @param {String} forPropertyName
             * @return {null|KoTableColumn}
             */
            getColumnByPropertyName: function( forPropertyName ) {
                var self = this;
                return Y.Array.find( peek( self.columns ), function( column ) {
                    return forPropertyName === column.forPropertyName;
                } );
            },
            /**
             * Displays the columns visibility configuration dialog
             * @method showVisibleColumnsConfiguration
             */
            showVisibleColumnsConfiguration: function() {
                var
                    self = this,
                    aDCWindow,
                    columns = peek( self.columns ),
                    isAllChecked = ko.observable( true ),
                    columnsFiltered = Y.Array.filter( columns, function( column ) {
                        if( column.isUtilityColumn() ) {
                            return false;
                        }

                        if( !peek( column.visibleByUser ) ) {
                            return false;
                        }
                        return true;
                    } ),
                    columnsMapped = columnsFiltered.map( function( column ) {
                        var
                            forPropertyName = peek( column.forPropertyName );

                        if ( !peek( column.visible ) ) {
                            isAllChecked( false );
                        }


                        return {
                            label: Y.doccirrus.utils.stripHTML.regExp( peek( column.label ) ),
                            forPropertyName: forPropertyName,
                            visible: ko.observable( peek( column.visible ) )
                        };
                    } );

                if( peek( self.visibleColumnsConfigurationDisabled ) ) {
                    Y.log( 'Not allowed configuring columns visibility', 'warn', NAME );
                    return;
                }

                aDCWindow = new Y.doccirrus.DCWindow( {
                    id: 'DCWindow-KoTable-showVisibleColumnsConfiguration',
                    bodyContent: '<div data-bind="template: { name: \'KoTableVisibleColumnsConfiguration\' }"></div>',
                    title: self.i18n( 'KoUI.KoTable.visibleColumnsConfiguration.window.title' ),
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    centered: true,
                    modal: true,
                    visible: false,
                    render: document.body,
                    buttons: {
                        header: [ 'close' ],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function( e ) {
                                    e.target.button.disable();
                                    this.close();
                                    Y.each( ko.toJS( columnsMapped ), function( column ) {
                                        self.getColumnByPropertyName( column.forPropertyName ).visible( peek( column.visible ) );
                                    } );
                                }
                            } )
                        ]
                    }
                } );

                ko.applyBindings( {
                    i18n: self.i18n,
                    columns: columnsMapped,
                    isAllChecked: isAllChecked,
                    visibleChangeHandler: function( model, event ) {
                        var
                            entry = ko.dataFor( event.target ),
                            entryFiltered = peek( entry.isFiltered ),
                            entryVisible = peek( entry.visible ),
                            i;

                        for(i = 0; i < columnsMapped.length; i++) {
                            if ( !peek( columnsMapped[i].visible ) ) {
                                isAllChecked( false );
                                break;
                            }
                            isAllChecked( true );
                        }

                        if( !entryVisible && entryFiltered ) {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'warn',
                                message: self.i18n( 'KoUI.KoTable.showVisibleColumnsConfiguration.invisibleFilterMessage' )
                            } );
                        }

                    },
                    selectAllChangeHandler: function() {
                        columnsMapped.forEach( function(i) {
                            i.visible( peek( isAllChecked ) );
                        });
                    }
                }, aDCWindow.get( 'bodyContent' ).getDOMNodes()[ 0 ] );

                aDCWindow.show();
            },
            /**
             * If set - used in the default add action as model constructor parameter.
             * @property defaultViewModelData
             * @type {Object}
             */
            defaultViewModelData: null,
            /**
             * If set - it is merged into every row model
             * @property sharedViewModelData
             * @type {Object}
             */
            sharedViewModelData: null,
            /**
             * Overwrite this method to provide your own on add button click handling.
             * If it returns false, the default add action is prevented.
             * @method onAddButtonClick
             * @return {boolean}
             * @example
             {
                 ..
                 columns: [...]
                 onAddButtonClick: function() {
                     console.warn( 'onCellClick' );
                 }
             }
             */
            onAddButtonClick: function() {
                // meant to override
                return true;
            },
            /**
             * Overwrite this method to provide your own logic when "add row button"(footer) should be disabled
             * function is called inside ko.computed.
             * @method isAddRowButtonDisabled
             * @returns {boolean}
             */
            isAddRowButtonDisabled: function() {
                return false;
            },
            /**
             * Overwrite this method to provide your own logic when "add group button"(footer) should be disabled
             * function is called inside ko.computed.
             * @method isAddGroupButtonDisabled
             * @returns {boolean}
             */
            isAddGroupButtonDisabled: function() {
                return false;
            },
            /**
             * Overwrite this method to provide your own logic when "add button"(footer) should be visible
             * function is called inside ko.computed.
             * @method isAddRowButtonVisible
             * @returns {boolean}
             */
            isAddRowButtonVisible: function() {
                return true;
            },
            /**
             * If set to false, table will use data array as it is, item of array won't be changed. Data should be an observable array which contains correct items.
             * By default data array converted into observableArray of ViewModel items
             * @property defaultViewModelData
             * @default true
             * @type {Boolean}
             */
            convertDataArray: true,
            /**
             * If a KoTableColumnDrag is configured, method will give you that column.
             * @method getComponentColumnDrag
             * @return {null|KoEditableTableColumnDrag}
             */
            getComponentColumnDrag: function() {
                var self = this;
                return _.find( peek( self.columns ), function( column ) {
                    return column instanceof KoEditableTableColumnDrag;
                } );
            },
            /**
             * @method _isRowDraggable
             * @param {Object} $context
             * @return {boolean}
             * @protected
             */
            _isRowDraggable: function( $context ) {
                var
                    self = this;

                if( $context.$data === KoTable.CONST.EMPTY_ROW || !peek( self.draggableRows ) ) {
                    return false;
                }

                return self.isRowDraggable( $context );
            },
            /**
             * Overwrite to check the context to decide if this row should be draggable
             * @method isRowDraggable
             * @param {Object} $context
             * @return {boolean}
             * @default draggableRows
             */
            isRowDraggable: function( /*$context*/ ) {
                var
                    self = this;

                return peek( self.draggableRows );
            },
            /**
             * @method _isRowDroppable
             * @param {Object} $context
             * @return {boolean}
             * @protected
             */
            _isRowDroppable: function( $context ) {
                var
                    self = this;

                if( $context.$data === KoTable.CONST.EMPTY_ROW || !peek( self.draggableRows ) ) {
                    return false;
                }

                return self.isRowDroppable( $context );
            },
            /**
             * Overwrite to check the context to decide if a row should be droppable on that row index
             * - Keep in mind that the rows are non observables, so it isn't possible to reevaluate them … such as data itself or context.index changed for updating class-names (TODO: MOJ-3935)
             * @method isRowDroppable
             * @param {Object} $context
             * @return {boolean}
             * @default draggableRows
             */
            isRowDroppable: function( /*$context*/ ) {
                var
                    self = this;

                return peek( self.draggableRows );
            },
            /**
             * @method _allowDragOnDrop
             * @protected
             */
            _allowDragOnDrop: function( $contextDrag, $contextDrop ) {
                var
                    self = this;

                if( !self.isRowDroppable( $contextDrop ) || $contextDrag.$data === KoTable.CONST.EMPTY_ROW || $contextDrop.$data === KoTable.CONST.EMPTY_ROW || !peek( self.draggableRows ) ) {
                    return false;
                }

                return self.allowDragOnDrop( $contextDrag, $contextDrop );
            },
            /**
             * Overwrite to check the drag and drop context to decide if a row is allowed to be dropped on that valid row index
             * @method allowDragOnDrop
             * @param {Object} $contextDrag
             * @param {Object} $contextDrop
             * @return {boolean}
             * @default draggableRows
             */
            allowDragOnDrop: function( /*$contextDrag, $contextDrop*/ ) {
                var
                    self = this;

                return peek( self.draggableRows );
            },
            /**
             * Overwrite to get the drag and drop row
             * @method onRowDragged
             * @param {Object} meta
             * @param {Object} meta.dragIndex
             * @param {Object} meta.dropIndex
             * @param {Object} meta.dragData
             * @param {Object} meta.dropData
             */
            onRowDragged: function() {
            },
            /**
             * Initializes the Y.DD.Delegate instance for dragging rows
             * @method initDraggableRows
             * @protected
             */
            initDraggableRows: function() {
                var
                    self = this,
                    element = peek( self.element ),
                    koTableDom = element.get( 0 ),
                    ddDelegateRows = self.ddDelegateRows = new Y.DD.Delegate( {
                        container: koTableDom,
                        nodes: '.KoTable-row',
                        target: true, // items should also be a drop target
                        dragConfig: {
                            groups: [ 'KoTable-ddDelegateRows-' + self.componentId ]
                        },
                        invalid: '.KoTable-row:not(.' + CSS_KOTABLE_ROW_ISDRAGGABLE + ')'
                    } ),
                    drag = ddDelegateRows.dd,
                    dragColumn = self.getComponentColumnDrag();

                if( dragColumn && peek( dragColumn.onlyDragByHandle ) ) {
                    drag.addHandle( '.KoTableCellDrag' );
                }

                // drag proxy
                drag.plug( Y.Plugin.DDProxy, {
                    moveOnEnd: false,
                    resizeFrame: false,
                    cloneNode: true
                } );

                // overwrite drag proxy clone to support table rows
                drag.proxy.clone = function() {
                    var
                        host = this.get( 'host' ),
                        node = host.get( 'node' ),
                        nodeClone = node.cloneNode( true ),
                        table = node.ancestor( '.KoEditableTable' ),
                        proxyCursorClone = table.one( '.KoTable-drag-proxy-cursor' ).cloneNode( true ),
                        hScroll = table.one( '.KoTable-hScroll' ),
                        gridClone = table.one( '.KoTable-grid' ).cloneNode( true ),
                        scrollAttrs = hScroll.getAttrs( [ 'clientWidth', 'scrollLeft', 'scrollWidth' ] ),
                        dragNode = Y.Node.create( '<div></div>' );

                    // clean table clone
                    gridClone.one( '.KoTableHeader' ).remove();
                    gridClone.one( '.KoTable-rows' ).empty();
                    gridClone.one( '.KoTable-rows' ).appendChild( nodeClone );
                    gridClone.all( '.table-striped' ).removeClass( 'table-striped' );
                    gridClone.removeAttribute( 'data-bind' );
                    gridClone.all( '[data-bind]' ).removeAttribute( 'data-bind' );
                    // ~ remove comments also?

                    // prototype behaviour
                    gridClone.all( 'input[type="radio"]' ).removeAttribute( 'name' );
                    delete gridClone._yuid;
                    gridClone.setAttribute( 'id', Y.guid() );

                    // wrap and handle table clone
                    gridClone = gridClone.wrap( '<div></div>' ).ancestor();
                    gridClone.setStyles( {
                        position: 'absolute',
                        overflow: 'hidden',
                        width: (scrollAttrs.scrollLeft + scrollAttrs.clientWidth) + 'px',
                        clip: 'rect( 0, ' + (scrollAttrs.scrollLeft + scrollAttrs.clientWidth) + 'px, auto, ' + scrollAttrs.scrollLeft + 'px )'
                    } );
                    dragNode.appendChild( gridClone );

                    // handle proxy cursor
                    proxyCursorClone.setStyle( 'left', scrollAttrs.scrollLeft + 'px' );
                    dragNode.appendChild( proxyCursorClone );

                    // handle drag node
                    dragNode.addClass( 'KoTable-drag-proxy' );
                    dragNode.setStyles( {
                        position: 'absolute',
                        height: node.get( 'offsetHeight' ) + 'px',
                        width: (scrollAttrs.scrollLeft + scrollAttrs.clientWidth) + 'px'
                    } );

                    table.appendChild( dragNode );
                    host.set( 'dragNode', dragNode );
                    return dragNode;
                };

                // drag constrained
                drag.plug( Y.Plugin.DDConstrained, {
                    constrain2node: koTableDom.querySelector( '.KoTable-rows' ),
                    stickY: true
                } );

                // drag scroll window
                drag.plug( Y.Plugin.DDWinScroll, {
                    horizontal: false
                } );

                drag.set( 'data', { allowDragOnDrop: null } );

                ddDelegateRows.on( {
                    'drag:start': function( yEvent ) {
                        var
                            node = yEvent.target.get( 'node' ),
                            dragNode = yEvent.target.get( 'dragNode' );

                        node.setStyle( 'opacity', 0.25 );
                        dragNode.setStyle( 'opacity', 0.65 );

                        drag.set( 'data.allowDragOnDrop', false );

                    },
                    'drag:enter': function( yEvent ) {
                        var
                            dropNode = yEvent.drop.get( 'node' ),
                            dragNode = yEvent.drag.get( 'node' ),
                            dragContext = ko.contextFor( dragNode.getDOMNode() ),
                            dropContext = ko.contextFor( dropNode.getDOMNode() );

                        drag.set( 'data.allowDragOnDrop', self._allowDragOnDrop( dragContext, dropContext ) );
                    },
                    'drag:end': function( yEvent ) {
                        var
                            node = yEvent.target.get( 'node' );

                        node.setStyle( 'opacity', 1 );

                        drag.set( 'data', { allowDragOnDrop: null } );

                    },
                    'drag:drophit': function( yEvent ) {
                        var
                            dropNode = yEvent.drop.get( 'node' ),
                            dragNode = yEvent.drag.get( 'node' ),
                            dragData = ko.dataFor( dragNode.getDOMNode() ),
                            dropData = ko.dataFor( dropNode.getDOMNode() ),
                            dragGroupName = self.getRowGroupName( dragData ),
                            dragGroup = self.getGroupByName( dragGroupName, dragData ),
                            dragGroupRows = dragGroup.rows,
                            dropGroupName,
                            dropGroup,
                            dropGroupRows,
                            dropIndex,
                            isDroppable;
                        if( self.isGroup( dropData ) ) {
                            dropGroup = dropData;
                            dropGroupRows = dropGroup.rows;
                            dropIndex = 0;
                            isDroppable = peek( dropGroup.isDroppable );
                        } else {
                            dropGroupName = self.getRowGroupName( dropData );
                            dropGroup = self.getGroupByName( dropGroupName, dropData );
                            dropGroupRows = dropGroup.rows;
                            dropIndex = peek( dropGroupRows ).indexOf( dropData );
                            isDroppable = dropNode.hasClass( CSS_KOTABLE_ROW_ISDROPPABLE );
                        }

                        if( isDroppable && drag.get( 'data.allowDragOnDrop' ) ) {
                            dragGroupRows.remove( dragData );
                            self.setRowGroup( dragData, dropGroup );
                            dropGroupRows.splice( dropIndex, 0, dragData );
                            self.onRowDragged( {
                                dropGroup: dropGroup,
                                dragData: dragData,
                                dropData: dropData
                            } );
                        } else {
                            yEvent.preventDefault();
                        }
                    },
                    'drag:drag': function() {
                        var
                            proxyNode = drag.get( 'dragNode' );

                        proxyNode.removeClass( CSS_KOTABLE_PROXY_DROP_ENABLED );
                        proxyNode.removeClass( CSS_KOTABLE_PROXY_DROP_DISABLED );
                        if( Y.DD.DDM.activeDrop && Y.DD.DDM.isOverTarget( Y.DD.DDM.activeDrop ) && drag.get( 'data.allowDragOnDrop' ) ) {
                            proxyNode.addClass( CSS_KOTABLE_PROXY_DROP_ENABLED );
                        }
                        else {
                            proxyNode.addClass( CSS_KOTABLE_PROXY_DROP_DISABLED );
                        }
                    }
                } );

                // constrain2node node have to be updated (in case .KoTable-rows element changed could be the case for no data and fillRowsToLimit)
                // drop targets of a delegate have to be synced after changes
                ddDelegateRows.rowsSyncTargetsSubscription = self.addDisposable( ko.computed( function() {
                    var
                        groups = unwrap( self.groups );
                    groups.forEach( function( group ) {
                        unwrap( group.rows );
                    } );

                    if( ko.computedContext.isInitial() ) {
                        return;
                    }
                    if( self.ddDelegateRows ) {
                        drag.con.set( 'constrain2node', koTableDom.querySelector( '.KoTable-rows' ) );
                        self.ddDelegateRows.syncTargets();
                    }
                } ).extend( { rateLimit: 0 } ) ); // rateLimit delay necessary because again fillRowsToLimit make problems without (seems then to subscribe before rows are rendered)

            },
            /**
             * Destroys the Y.DD.Delegate instance for dragging columns
             * @method destroyDraggableRows
             * @protected
             */
            destroyDraggableRows: function() {
                var
                    self = this;

                if( self.ddDelegateRows ) {
                    self.removeDisposable( self.ddDelegateRows.rowsSyncTargetsSubscription );
                    self.ddDelegateRows.destroy();
                    self.ddDelegateRows = null;
                }

            }

        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTable' ) );
            },
            draggableRows: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( true ) );

                self.addDisposable( ko.computed( function() {
                    var
                        rendered = unwrap( self.rendered ),
                        draggableRows = unwrap( observable );

                    ignoreDependencies( function() {

                        self.destroyDraggableRows();

                        if( rendered && draggableRows ) {

                            self.initDraggableRows();

                        }
                    } );

                } ) );

                return observable;
            },
            data: function( key ) {
                var
                    self = this,
                    observable;
                if( self.convertDataArray ) {
                    observable = self._handleLazyConfig( key, ko.observableArray() );
                } else {
                    observable = self.initialConfig.data;
                }

                return observable;
            },
            /**
             * Stores added rows, to keep them after table data is changed.
             * @attribute addedRows
             * @type {ko.observableArray}
             */
            addedRows: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observableArray() );

                return observable;
            },
            responsiveMinWidth: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '470px' ) );
            },
            /**
             * Computes table min-width of either responsive or not
             * @return {string}
             * @private
             */
            _computeTableMinWidth: function() {
                var
                    self = this,
                    responsiveMinWidth = self.responsiveMinWidth();

                return responsiveMinWidth;
            },
            /**
             * The min-width to use for the table when it is not {{#crossLink "KoTable/responsive:attribute"}}{{/crossLink}}
             * @attribute tableMinWidth
             * @type {String}
             * @default ''
             */
            tableMinWidth: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '470px' ) );
            },
            /**
             * The rows array representing the data for the current view
             * @property rows
             * @type {ko.computed}
             * @readOnly
             */
            rows: function() {
                var
                    self = this,
                    observable = ko.computed( {
                        read: function() {
                            var
                                groups = unwrap( self.groups ),
                                rows = [];
                            groups.forEach( function( item ) {
                                var
                                    groupRows = unwrap( item.rows );
                                rows = rows.concat( groupRows );
                            } );

                            return rows;
                        },
                        write: function() {
                            Y.log( 'rows write not allowed', 'error', NAME );
                        }
                    } ).extend( { rateLimit: 0 } );

                return observable;
            },
            /**
             * This array contains view models based on provided data
             * @protected
             * @property _convertedData
             * @type {Array}
             */
            _convertedData: function() {
                var
                    self = this,
                    data = self.data,
                    observable;
                if( !self.convertDataArray ) {
                    return data;
                }
                observable = ko.observableArray();
                self.addDisposable( ko.computed( function() {
                    var
                        _data = unwrap( data ) || [],
                        addedRows = peek( self.addedRows ) || [];
                    _data = _data.concat( addedRows );
                    ignoreDependencies( function() {
                        observable( _data.map( self._getViewModelInstance.bind( self ) ) );
                    } );
                } ) );

                return observable;
            },
            /**
             * This array contains data groups
             * @property groups
             * @type {Array}
             */
            groups: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observableArray() );
            },

            templateNameRow: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoEditableTableRow' ) );
            },
            templateNameGroupRow: function() {
                return 'KoEditableTableGroupRow';
            },
            header: function() {
                var
                    self = this,
                    aKoTableHeader = KoComponentManager.createComponent( {
                        componentType: 'KoEditableTableHeader',
                        owner: self
                    } );

                if( self.templateNameHeader ) {
                    aKoTableHeader.templateName( self.templateNameHeader );
                }

                return aKoTableHeader;
            },
            toolsDisabled: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Visible attribute for the action for giving the user some tools for the table
             * @attribute toolsVisible
             * @type {boolean}
             * @default true
             */
            toolsVisible: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            showGroups: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * The action for giving the user some tools for the table
             * @property toolsAction
             * @type {KoButtonDropDown}
             */
            toolsAction: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {
                        componentType: 'KoButtonDropDown',
                        name: 'KoTable-toolsAction',
                        title: self.i18n( 'KoUI.KoTable.toolsAction.title' ),
                        icon: 'GEAR',
                        size: 'SMALL',
                        disabled: false,
                        visible: true,
                        menu: {
                            dropup: true,
                            items: [
                                {
                                    name: 'KoTable-visibleColumnsConfigurationAction',
                                    icon: 'COLUMNS',
                                    text: self.i18n( 'KoUI.KoTable.visibleColumnsConfiguration.action.text' ),
                                    title: self.i18n( 'KoUI.KoTable.visibleColumnsConfiguration.action.title' ),
                                    disabled: self.visibleColumnsConfigurationDisabled,
                                    visible: self.visibleColumnsConfigurationVisible,
                                    click: Y.bind( self.showVisibleColumnsConfiguration, self )
                                }
                            ]
                        }
                    }
                );
            },
            /**
             * The action to add new row to the table
             * @property addRowAction
             * @type {KoButtonDropDown}
             */
            addRowAction: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        name: 'KoTable-addRowAction',
                        title: i18n( 'KoUI.KoEditableTable.text.newEntry' ),
                        size: 'SMALL',
                        text: i18n( 'KoUI.KoEditableTable.text.newEntry' ),
                        disabled: ko.computed( function() {
                            return self.isAddRowButtonDisabled();
                        } ),
                        visible: ko.computed( function() {
                            return self.isAddRowButtonVisible();
                        } ),
                        click: function() {
                            if( self.onAddButtonClick() ) {
                                if( self.defaultViewModelData ) {
                                    self.addRow( self.defaultViewModelData );
                                } else {
                                    self.addRow( {} );
                                }
                            }
                        }
                    }
                );
            },
            /**
             * The action to add new group to the table
             * @property addGroupAction
             * @type {KoButtonDropDown}
             */
            addGroupAction: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        name: 'KoTable-addGroupAction',
                        title: i18n( 'KoUI.KoEditableTable.text.newGroup' ),
                        text: i18n( 'KoUI.KoEditableTable.text.newGroup' ),
                        size: 'SMALL',
                        disabled: ko.computed( function() {
                            return self.isAddGroupButtonDisabled();
                        } ),
                        visible: ko.computed( function() {
                            return self.showGroups();
                        } ),
                        click: function() {
                            self.addGroup( {
                                activate: true
                            } );
                        }
                    }
                );
            },
            /**
             * Disabled attribute for the action for configuring visibility of columns
             * @attribute visibleColumnsConfigurationDisabled
             * @type {boolean}
             * @default false
             */
            visibleColumnsConfigurationDisabled: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Visible attribute for the action for configuring visibility of columns
             * @attribute visibleColumnsConfigurationVisible
             * @type {boolean}
             * @default true
             */
            visibleColumnsConfigurationVisible: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * @property footer
             * @type {KoToolbar}
             * @protected
             */
            footer: function() {
                return KoComponentManager.createComponent( { componentType: 'KoToolbar' } );
            },
            /**
             * Renders the table's footer bar
             * @attribute renderFooter
             * @type {boolean}
             * @default true
             */
            renderFooter: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            activeRow: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            }
        }
    } );

    KoComponentManager.registerComponent( KoEditableTable );

}, '0.0.1', {
    requires: [
        'oop',
        'KoUI',
        'KoUI-utils-Function',
        'KoComponentManager',
        'KoComponent'
    ]
} );

