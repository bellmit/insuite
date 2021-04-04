/*eslint prefer-template: 0, valid-jsdoc: 0 */
/*global YUI, ko, jQuery, $, moment, _ */
YUI.add( 'KoTable', function( Y, NAME ) {
    'use strict';
    /**
     * ##### KoTable configuration migration
     * When changing column configurations, between inSuite version changes a migration may get necessary under those circumstances:
     * - a "stateId" changes
     * - a column was added, removed
     * - a column "forPropertyName"-property was changed
     * - a column index was changed
     * - a column "isFilterable"-property was changed (e.g. column was filterable, but now isn't anymore)
     * - a column filter "value"-property was changed (e.g. using another Filter)
     * - a column filter possible value has changed (e.g. changed or removed list entries to pick from)
     * - a column "isSortable"-property was changed (e.g. column was sortable, but now isn't anymore)
     *
     * - see {{#crossLink "KoTable/userConfiguration:property"}}{{/crossLink}} for an example how the configuration is build
     *
     * @module KoTable
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,

        DCQuery = Y.doccirrus.DCQuery,
        getObject = Y.doccirrus.commonutils.getObject,
        setObject = Y.doccirrus.commonutils.setObject,
        exists = Y.doccirrus.commonutils.exists,

        api = Y.doccirrus.jsonrpc.api, //  eslint-disable-line no-unused-vars
        i18n = Y.doccirrus.i18n, //  eslint-disable-line no-unused-vars

        KoUI = Y.doccirrus.KoUI,
        utilsArray = KoUI.utils.Array,
        utilsObject = KoUI.utils.Object,
        utilsFunction = KoUI.utils.Function,
        utilsMath = KoUI.utils.Math,
        makeClass = utilsObject.makeClass,
        NOOP = utilsFunction.NOOP,
        FALSE = utilsFunction.FALSE,
        fastHash = utilsObject.fastHash,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' ),

        CSS_KOTABLE_ROW_ISDRAGGABLE = 'KoTable-row-isDraggable',
        CSS_KOTABLE_ROW_ISDROPPABLE = 'KoTable-row-isDroppable',
        CSS_KOTABLE_PROXY_DROP_DISABLED = 'KoTable-drag-proxy-drop-disabled',
        CSS_KOTABLE_PROXY_DROP_ENABLED = 'KoTable-drag-proxy-drop-enabled',

        FIXED_COLUMN_BACKGROUND_COLOR = '#f1f1f1',
        FIXED_COLUMN_ANIMATION = 'fadeMe 0.5s forwards',

        MAX_PDF_COLS = 100,
        MAX_PDF_ROWS = 50000;    // MOJ-11076, MOJ-12189

    function filterStaticConfigEntries( entry ) {
        return true !== entry.static;
    }

    /**
     * default error notifier
     */
    function fail( response ) { // eslint-disable-line no-unused-vars
        var
            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

        if( errors.length ) {
            Y.Array.invoke( errors, 'display' );
        }

    }

    /**
     * Helper to debounce KoTable proxy usages.
     * Cares about debounce, but also applies promise callbacks again to all requester
     * @param callback
     * @returns {Function}
     */
    function debounceProxy( callback ) {
        var
            timeout,
            allPromiseUsages = [];

        return function( params, aPromiseUsage ) {
            var
                context = this,
                later = function() {
                    var resultPromise;
                    timeout = null;
                    resultPromise = callback.call( context, params );
                    while( allPromiseUsages.length ) {
                        Y.each( allPromiseUsages.shift(), function( fn, key ) {
                            if( fn ) {
                                resultPromise[key]( fn );
                            }
                        } );// jshint ignore:line
                    }
                };

            allPromiseUsages.push( aPromiseUsage );

            clearTimeout( timeout );
            timeout = setTimeout( later, 0 );
        };
    }

    function ColumnToSorterMapper( item ) {
        return {
            sortBy: ko.isObservable( item.sortBy ) ? peek( item.sortBy ) : item.sortBy,
            direction: ko.isObservable( item.direction ) ? peek( item.direction ) : item.direction,
            forPropertyName: ko.isObservable() ? peek( item.forPropertyName ) : item.forPropertyName
        };
    }

    /**
     * Check for isn't a normal column
     * @param column
     * @return {boolean}
     * @private
     */
    // TODO: isUtilityColumn as property ?
    function isUtilityColumn( column ) {
        return ( column instanceof KoTableColumnRenderer || column instanceof KoTableColumnNumbering || column instanceof KoTableColumnCheckbox || column instanceof KoTableColumnLinked || column instanceof KoTableColumnDrag );
    }

    /**
     * Only used to preformat values in editable tables.
     *
     * @param {String} value
     * @param {KoTableColumn} column
     * @returns {string}
     */
    function applyInitialEditableRenderer( value, column ) {
        if( 'function' === typeof column.initialEditableValueRenderer ) {
            return column.initialEditableValueRenderer( value );
        }

        return value;
    }

    /**
     * KoTable usage configuration view model
     * @class UsageConfigurationViewModel
     * @constructor
     * @param {Object} parameters
     * @param {object} parameters.usageConfiguration
     * @param {number} parameters.shortcutIndex
     */
    function UsageConfigurationViewModel( parameters ) {
        var
            usageConfiguration = parameters.usageConfiguration,
            name = usageConfiguration.name,
            shortcutDescription = usageConfiguration.shortcutDescription,
            shortcutVisible = usageConfiguration.shortcutVisible,
            shortcutIndex = usageConfiguration.shortcutIndex;

        name = Y.Lang.isString( name ) ? name : '';
        shortcutDescription = Y.Lang.isString( shortcutDescription ) ? shortcutDescription : '';
        shortcutVisible = Y.Lang.isBoolean( shortcutVisible ) ? shortcutVisible : true;
        shortcutIndex = Y.Lang.isNumber( shortcutIndex ) ? shortcutIndex : parameters.shortcutIndex;

        this._reference = usageConfiguration;

        this.name = ko.observable( name );
        this.shortcutDescription = ko.observable( shortcutDescription );
        this.shortcutVisible = ko.observable( shortcutVisible );
        this.shortcutIndex = ko.observable( shortcutIndex );

    }

    /**
     * @for UsageConfigurationViewModel
     * @method create
     * @param {object} usageConfiguration
     * @param {number} shortcutIndex
     * @returns {UsageConfigurationViewModel}
     */
    UsageConfigurationViewModel.createFromUsageConfiguration = function( usageConfiguration, shortcutIndex ) {
        return new UsageConfigurationViewModel( {
            usageConfiguration: usageConfiguration,
            shortcutIndex: shortcutIndex
        } );
    };

    /**
     * KoTable usage shortcut view model
     * @class UsageShortcutViewModel
     * @constructor
     * @param {Object} parameters
     * @param {string} parameters.text
     * @param {string} parameters.title
     */
    function UsageShortcutViewModel( parameters ) {

        this.text = parameters.text;
        this.title = parameters.title;
        this.active = ko.observable( false );

    }

    /**
     * @for UsageShortcutViewModel
     * @method create
     * @param {object} usageConfiguration
     * @returns {UsageShortcutViewModel}
     */
    UsageShortcutViewModel.createFromUsageConfiguration = function( usageConfiguration ) {
        return new UsageShortcutViewModel( {
            text: usageConfiguration.name,
            title: usageConfiguration.shortcutDescription
        } );
    };

    /**
     * KoTable data modification
     * @class KoTableDataModification
     * @constructor
     * @param {Object} parameters
     * @param {KoTable} parameters.owner The {{#crossLink "KoTable"}}{{/crossLink}} which owns this modification
     * @param {Object} parameters.origin The unmodified data reference
     * @param {Object} parameters.state The modified data
     */
    function KoTableDataModification( parameters ) {
        /**
         * The {{#crossLink "KoTable"}}{{/crossLink}} which owns this modification
         * @property owner
         * @type {KoTable}
         * @protected
         */
        this.owner = parameters.owner;
        /**
         * The unmodified data reference (read-only)
         * @property origin
         * @type {Object}
         */
        this.origin = parameters.origin;
        /**
         * The modified data (read-only)
         * @property state
         * @type {Object}
         */
        this.state = parameters.state;
        /**
         * The changes lookup for {{#crossLink "KoTableDataModification/state:property"}}{{/crossLink}} (read-only)
         * @property changes
         * @type {Object}
         */
        this.changes = {};
    }

    /**
     * Destroys the modification and removes it from its owner
     * @method destroy
     * @param {String} forPropertyName
     * @param {*} value
     * @return {boolean} true if destroyed successfully
     */
    KoTableDataModification.prototype.destroy = function KoTableDataModification_destroy() {
        var
            self = this,
            owner = self.owner;

        if( !owner ) { // already destroyed
            return false;
        }

        owner.dataModifications.remove( self );

        self.changes = null;
        delete self.changes;
        self.state = null;
        delete self.state;
        self.origin = null;
        delete self.origin;
        self.owner = null;
        delete self.owner;

        return true;
    };

    /**
     * Updates the change for column and observable. If an update occurs that equals the original state, a revert is triggered.
     * @method update
     * @param {Object} parameters
     * @param {KoTableColumn} parameters.column
     * @param {ko.observable} parameters.observable
     * @return {boolean} false if a revert occurred
     */
    KoTableDataModification.prototype.update = function KoTableDataModification_update( parameters ) {
        var
            self = this,
            origin = self.origin,
            column = parameters.column,
            observable = parameters.observable,
            forPropertyName = column.forPropertyName,
            changes = self.changes,
            value = peek( observable );

        // case update occurs that equals the original state
        if( value === getObject( forPropertyName, false, origin ) ) {
            self.revert( forPropertyName );
            return false;
        }

        // update state
        setObject( forPropertyName, value, self.state );

        // register new change
        if( !Y.Object.owns( changes, forPropertyName ) ) {
            changes[forPropertyName] = {
                observable: observable,
                column: column
            };
        }

        // notify about current state
        self.owner.dataModifications.valueHasMutated();

        return true;
    };

    /**
     * Reverts the change on forPropertyName if it is a string, for an array of strings or if omitted all changes for this entry.
     * If there are no changes left the modification is removed from the owner {{#crossLink "KoTable"}}{{/crossLink}}
     * @method revert
     * @param {String|Array|undefined} forPropertyName
     * @constructor
     */
    KoTableDataModification.prototype.revert = function KoTableDataModification_revert( forPropertyName ) {
        var
            self = this,
            changes = self.changes,
            observable,
            column,
            originValue,
            isEditable = false,
            isEditableAndHaveDefault = false;

        // case Array
        var i;
        if( Y.Lang.isArray( forPropertyName ) ) {

            // call self each

            for( i = 0; i < forPropertyName.length; i++ ) {
                self.revert( forPropertyName[i] );
            }
        }
        // case String
        else if( forPropertyName && Y.Object.owns( changes, forPropertyName ) ) {

            originValue = getObject( forPropertyName, false, self.origin );
            observable = changes[forPropertyName].observable;
            column = changes[forPropertyName].column;
            isEditable = peek( column.isEditable );

            // revert the observable to reflect changes in UI if necessary
            if( isEditable && ko.isWriteableObservable( observable ) ) {

                // get the default value for virtual columns
                if( column.editorField && Y.Object.owns( column.editorField, 'defaultValue' ) && Y.Lang.isUndefined( originValue ) ) {
                    if( Y.Lang.isFunction( column.editorField.defaultValue ) ) {
                        originValue = column.editorField.defaultValue( self.origin );
                    }
                    else {
                        originValue = column.editorField.defaultValue;
                    }
                    isEditableAndHaveDefault = true;
                }

                observable( originValue );

            }

            // revert value modifications in state
            setObject( forPropertyName, originValue, self.state );
            // TODO: [MOJ-3711] in case of virtual and no defaultValue maybe delete property from state?

            // virtual columns with a default value are always considered modified
            if( !isEditable || !isEditableAndHaveDefault ) {
                delete changes[forPropertyName];
            }

            // notify about current state
            self.owner.dataModifications.valueHasMutated();

            // clean up if no changes left
            if( Y.Object.isEmpty( changes ) ) {
                self.destroy();
            }

        }
        // case undefined
        else {

            // call self each change
            Y.each( changes, function( value, key ) {
                self.revert( key );
            } );
        }

    };

    /**
     * @class KoTableHeader
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoTableHeader() {
        KoTableHeader.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTableHeader,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoTableHeader',
            init: function() {
                var self = this;
                KoTableHeader.superclass.init.apply( self, arguments );
            },
            filterIconTitle: i18n('KoUI.KoTableColumnTools.filterIconTitle'),
            /**
             * determines if a filter icon is allowed for the passed column
             * @param {KoTableColumn} column
             * @return {boolean}
             */
            hasColumnFilterIcon: function( column ) {
                var
                    self = this,
                    columns = peek( self.owner.columns ),
                    result = false,
                    visibleUtilityIndex = -1,
                    l = columns.length,
                    i;

                Y.Array.invoke( columns, 'visible' );

                // only check utility columns
                if( isUtilityColumn( column ) ) {

                    // get the first visible utility column index
                    for( i = 0; i < l; i++ ) {
                        if( isUtilityColumn( columns[i] ) && peek( columns[i].visible ) ) {
                            visibleUtilityIndex = i;
                            break;
                        }
                    }

                    // icon should be on first visible utility column
                    if( visibleUtilityIndex !== -1 && visibleUtilityIndex === columns.indexOf( column ) ) {
                        result = true;
                    }
                }

                return result;
            },
            onFilterIconClick: function() {
                var
                    self = this,
                    owner = self.owner;

                Y.Array.invoke( owner.filters().map( function( col ) {
                    return col.filterField;
                } ), 'reset' );
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableHeader' ) );
            },
            /**
             * a boolean computed determining if the row with filters is available
             * @property rowWithFiltersIsAvailable
             * @type {ko.computed|boolean}
             */
            rowWithFiltersIsAvailable: function() {
                var
                    self = this,
                    owner = self.owner;

                return self.addDisposable( ko.computed( function() {
                    var
                        haveColumnsAtLeastOneFilterable = unwrap( owner.haveColumnsAtLeastOneFilterable ),
                        usageShortcutsVisible = unwrap( owner.usageShortcutsVisible );

                    return haveColumnsAtLeastOneFilterable && !usageShortcutsVisible;
                } ) );
            }
        }
    } );
    /**
     * @property KoTableHeader
     * @type {KoTableHeader}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableHeader );

    /**
     * @class KoTableCell
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoTableCell() {
        KoTableCell.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTableCell,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoTableCell',
            init: function() {
                var self = this;
                KoTableCell.superclass.init.apply( self, arguments );
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableCell' ) );
            }
        }
    } );
    /**
     * @property KoTableCell
     * @type {KoTableCell}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableCell );

    /**
     * @class KoTableRow
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoTableRow() {
        KoTableRow.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTableRow,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoTableRow',
            init: function() {
                var self = this;
                KoTableRow.superclass.init.apply( self, arguments );
            },
            hasPreview: true
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableRow' ) );
            }
        }
    } );
    /**
     * @property KoTableRow
     * @type {KoTableRow}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableRow );

    /**
     * @class KoTableSummaryRow
     * @constructor
     * @extends KoTableRow
     * @param {Object} config a configuration object
     */
    function KoTableSummaryRow() {
        KoTableSummaryRow.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTableSummaryRow,
        extends: KoTableRow,
        descriptors: {
            componentType: 'KoTableSummaryRow',
            init: function() {

                var self = this;

                KoTableSummaryRow.superclass.init.apply( self, arguments );
            }
        },
        lazy: {
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableSummaryRow' ) );
            }
        }
    } );
    /**
     * @property KoTableSummaryRow
     * @type {KoTableSummaryRow}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableSummaryRow );

    /**
     * @class KoTableColumn
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     * @param {Object} config.editorField a column editor configuration object
     * @param {*|Function} config.editorField.defaultValue a default value to use when forPropertyName is undefined in the rows data,
     *                              can be any value or a function which should return a value based on the rows data passed argument
     */
    function KoTableColumn() {
        KoTableColumn.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTableColumn,
        extends: KoComponent,
        static: {
            /**
             * Constants for KoTableColumn.
             * @property CONST
             * @static
             * @final
             * @type {object}
             * @for KoTableColumn
             */
            CONST: {
                DIRECTION: {
                    ASC: 'ASC',
                    DESC: 'DESC'
                }
            }
        },
        descriptors: {
            /**
             * The width of a column (specified in colgroup tag)
             * @property width
             * @type {String}
             * @default 'auto'
             */
            width: 'auto',
            minWidth: '100px',
            componentType: 'KoTableColumn',
            /**
             * Retrieve value by property name from data entry. Can also be a dot-limited path syntax to retrieve from nested data.
             * @property forPropertyName
             * @type {String}
             */
            forPropertyName: null,
            /**
             * @property isUtility
             * @type {Boolean}
             * @default false
             */
            isUtility: false,
            /**
             * @property isExcludedInCsv
             * @type {Boolean}
             * @default false
             */
            isExcludedInCsv: false,
            /**
             * Reverse the filters to exclude rather than include items
             * @property isFilterInverted
             * @type {Boolean}
             * @default false
             */
            isFilterInverted: null,

            init: function() {
                var self = this;
                KoTableColumn.superclass.init.apply( self, arguments );
                self.getTemplateNameCell = Y.bind( self.getTemplateNameCell, self );
                self.doRender = Y.bind( self.doRender, self );
                self.clickLabelHandler = Y.bind( self.clickLabelHandler, self );
                self.rendererHeader = self.initialConfig.rendererHeader || false;
                self.doRenderHeader = Y.bind( self.doRenderHeader, self );
                self.initWidthComputed();
                self.initSort();
                self.initFilter();
                self.initFilterOptions();
                self.initEditable();
                self.initCss();
            },
            /**
             * Provides the cell template name
             * @protected
             * @method getTemplateNameCell
             * @param $context
             * @return {String}
             */
            getTemplateNameCell: function( $context ) {
                var
                    self = this,
                    templateNameCell = unwrap( self.templateNameCell );

                if( $context.$parent === KoTable.CONST.EMPTY_ROW ) {
                    return templateNameCell;
                }

                if( unwrap( self.isEditable ) ) { // subscribe
                    return unwrap( self.templateNameCellEditable ); // subscribe
                }

                return templateNameCell;
            },

            /**
             *
             * @param $context
             */
            getTemplateDataSummaryCell: function( $context ) {

                var
                    self = this,
                    value = unwrap( self.isNumeric ) && !unwrap( self.notVisibleAtSummaryRow ) ? self.getValueFromData( $context.$parent[0] ) : null,
                    data = {
                        isSummaryCell: true,
                        row: $context.$parent,
                        rowIndex: 0,
                        col: $context.$data,
                        colIndex: $context.$index,
                        value: value
                    };
                return data;
            },

            /**
             * Provides the cell template data
             * @protected
             * @method getTemplateDataCell
             * @param $context
             * @return {{row: (Object), col: (KoTableColumn), value: (*), colIndex: (Number)}}
             */
            getTemplateDataCell: function( $context ) {
                var
                    self = this,
                    value = self.getValueFromData( $context.$parent ),
                    buttonsConfig,
                    data = {
                        row: $context.$parent,
                        rowIndex: $context.$parentContext.$index(),
                        col: $context.$data,
                        colIndex: $context.$index(),
                        value: value
                    },
                    isEditableAndHaveDefault = false;

                if( $context.$parent === KoTable.CONST.EMPTY_ROW ) {
                    return data;
                }

                if( peek( self.isEditable ) ) {
                    // TODO: [MOJ-3711] check if rows subscribe is better … nope, currently not (maybe cause of rateLimit?)
                    // TODO: [MOJ-3711] any rows change will clear done changes ... maybe sometime below into initEditables
                    // get the default value for virtual columns
                    if( self.editorField && Y.Object.owns( self.editorField, 'defaultValue' ) && !value ) {
                        if( Y.Lang.isFunction( self.editorField.defaultValue ) ) {
                            value = self.editorField.defaultValue( data.row );
                        }
                        else {
                            value = self.editorField.defaultValue;
                        }
                        isEditableAndHaveDefault = true;
                    }

                    value = applyInitialEditableRenderer( value, self );

                    data.valueEditable = self._valueEditables[data.rowIndex];
                    data.valueEditable( value );
                    // HACK for MOJ-7787
                    if( self.editorField && self.editorField.buttonsConfig && $context.$parent && $context.$parent[self.editorField.buttonsConfig.propertyName] ) {
                        data.valueEditable.buttons = [];
                        buttonsConfig = self.editorField.buttonsConfig;
                        $context.$parent[buttonsConfig.propertyName].forEach( function( item ) {
                            data.valueEditable.buttons.push(
                                KoComponentManager.createComponent( {
                                    componentType: 'KoButton',
                                    componentConfig: {
                                        name: 'add-widget',
                                        text: item[buttonsConfig.textProperty],
                                        title: item[buttonsConfig.titleProperty || buttonsConfig.textProperty],
                                        option: buttonsConfig.option || 'DEFAULT',
                                        isActive: item.isActive,
                                        css: item.isActive ? buttonsConfig.activeCss : {},
                                        size: 'SMALL',
                                        disabled: false,
                                        visible: true,
                                        buttonData: item,
                                        click: buttonsConfig.click
                                    }
                                } ) );
                        } );
                    }

                    if( isEditableAndHaveDefault ) {
                        self.updateModified( {
                            observable: data.valueEditable,
                            origin: data.row
                        } );
                    }

                }

                return data;
            },
            /**
             * prevents disposing while removing from columns, e.g. sorting, moving
             * @property _preventDispose
             * @protected
             */
            _preventDispose: false,
            /**
             * initializes sort handling for that column
             * @method initSort
             * @protected
             */
            initSort: function() {
                var
                    self = this;

                self.showSortConfig = ko.computed( function() {
                    return self.isSortable() && !self.owner.showFilterConfig();
                } );

                self.sortAsc = Y.bind( self.sortAsc, self );
                self.sortDesc = Y.bind( self.sortDesc, self );

            },
            /**
             * initializes filter handling for that column
             * @method initFilter
             * @protected
             */
            initFilter: function() {
                var
                    self = this,
                    forPropertyName;

                if( peek( self.isFilterable ) ) {
                    forPropertyName = unwrap( self.forPropertyName );

                    // filterPropertyName defaults to forPropertyName if unset
                    if( !self.filterPropertyName ) {
                        self.filterPropertyName = forPropertyName;
                    }

                    // create the filterField component
                    if( null === self.filterField ) {
                        self.filterField = KoComponentManager.createComponent( { componentType: 'KoField' } );
                    } else {
                        self.filterField = KoComponentManager.createComponent( self.filterField );
                    }
                    self.filterField.size( 'SMALL' );
                    // generate a name if unset
                    if( !unwrap( self.filterField.name ) && forPropertyName ) {
                        self.filterField.name( forPropertyName.replace( /[^a-z0-9]/gi, '-' ) );
                    }
                    // further settings
                    if( !peek( self.filterField.placeholder ) ) {
                        self.filterField.placeholder( unwrap( self.label ) );
                    }

                }

                //  set states on filter field from localstorage
                if ( self.filterField && self.filterField.isFilterInverted ) {
                    self.filterField.isFilterInverted( self.getState( 'isFilterInverted' ) || false );
                }

                //  set states on filter field from localstorage
                if ( self.filterField && self.filterField.textSearchType ) {
                    self.filterField.textSearchType( self.getState( 'textSearchType' ) || 'all' );
                }

                //  subscribe to states on filterfield
                self.textSearchType = ko.computed( function() {
                    return self.filterField && self.filterField.textSearchType ? self.filterField.textSearchType() : 'all';
                } );

                self.isFilterInverted = ko.computed( function() {
                    return self.filterField && self.filterField.isFilterInverted ? self.filterField.isFilterInverted() : false;
                } );

                self.onFilterContextMenu = function() {
                    if ( self.filterOptionsMenu && self.filterOptionsMenu.isMenuOpen && self.hasMoreFilterOptions ) {

                        if ( !self.owner.showFilterConfig() ) {
                            self.showFilterConfig( !self.filterOptionsMenu.isMenuOpen() );
                        }

                        if ( self.filterOptionsMenu.isMenuOpen() ) {
                            self.filterOptionsMenu.closeMenu();
                        } else {
                            //  need to stop the event, since click is outside of dropdown it will otherwise close it
                            event.stopPropagation();

                            //  close any other column dropdowns which are open

                            self.owner.columns().forEach( function closeCol( col ) {
                                if (
                                    col !== self &&
                                    col.filterOptionsMenu &&
                                    col.filterOptionsMenu.isMenuOpen &&
                                    col.filterOptionsMenu.isMenuOpen()
                                ) {
                                    col.filterOptionsMenu.closeMenu();
                                }

                                //  hide filter config buttons for other columns if global config not enabled
                                if ( !self.owner.showFilterConfig() && col !== self && col.showFilterConfig() ) {
                                    col.showFilterConfig( false );
                                }

                            } );

                            self.filterOptionsMenu.openMenu();
                        }
                    }
                };

                self.canChangeTextSearch = ( -1 !== DCQuery.TEXT_FILTER_TYPES.indexOf( self.queryFilterType ) );
                self.canInvertFilter = ( -1 !== DCQuery.INVERTABLE_FILTER_TYPES.indexOf( self.queryFilterType ) );

                self.hasMoreFilterOptions = true;

                //  special case for labdata tables
                if ( self.isDynamicallyAdded ) {
                    self.hasMoreFilterOptions = false;
                }

                self.showFilterConfig = ko.observable( false );

                self.showAllFiltersSubscription = self.owner.showFilterConfig.subscribe( function( newVal ) {
                    self.showFilterConfig( newVal );
                } );
            },

            /**
             *  Create context menu for filters / table header
             */

            initFilterOptions: function() {
                var self = this;

                self.setTextSearchType = function( searchType, evt ) {
                    if ( !self.filterField ) { return; }
                    self.filterField.textSearchType( searchType );
                    self.setState( 'textSearchType', searchType );
                    self.safeCloseDropdown( evt );
                };

                /**
                 *  Menu should disappear if opened with right click
                 */

                self.safeCloseDropdown = function( evt ) {
                    //  prevent toggle of the sorters from parent element
                    if ( evt && evt.originalEvent && evt.originalEvent.stopPropagation ) { evt.originalEvent.stopPropagation(); }

                    //  close the dropdown menu
                    if ( self.filterOptionsMenu.isMenuOpen() ) {
                        self.filterOptionsMenu.closeMenu();
                    }
                    //  leave the button visible if opened from bottom menu
                    if ( self.owner.showFilterConfig() ) { return; }

                    //  hide the dropdown menu button if this was opened by right click
                    self.showFilterConfig( false );
                };

                self.setFilterTextAll = function( ctx, evt ) {
                    self.setTextSearchType( 'all', evt );
                };

                self.setFilterTextBegins = function( ctx, evt ) {
                    self.setTextSearchType( 'begins', evt );
                };

                self.setFilterTextEnds = function( ctx, evt ) {
                    self.setTextSearchType( 'ends', evt );
                };

                if ( !self.filterField ) {
                    //  Continue to show context menu if no filter field (table or column is not filterable)
                    self.filterField = {
                        isPlaceHolder: true
                    };
                    self.canInvertFilter = false;
                    self.canChangeTextSearch = false;
                }

                //  occasionally tables will use a custom column definition which does not support filters, add
                //  placeholder to prevent - EXTMOJ-2252

                if ( self.filterField && !self.filterField.isFilterInverted ) {
                    self.filterField.textSearchType =  ko.observable( 'all' );
                    self.filterField.isFilterInverted =  ko.observable( false );
                    self.filterField.iconPlaceholder = ko.observable( '' );
                }

                //  set limit on number of rows in parent table from right-click context menu
                function makeLimitSetter( limit ) {
                    return function( ctx, evt ) {
                        self.owner.limit( limit );
                        self.safeCloseDropdown( evt );
                    };
                }

                //  wrap the parent lcick handler to prevent the event from changing the sorters
                function wrapClickHandlerParent( clickHandler ) {
                    return function( ctx, evt ) {
                        self.safeCloseDropdown( evt );
                        clickHandler( ctx, evt );
                    };
                }

                self.limitMenuText = ko.computed( function() {
                    return self.i18n( 'KoUI.KoTable.filterConfiguration.limit' ) + ' (' + self.owner.limit() + ')';
                } );

                var
                    usePositionIndex = ( null === self.positionIndex() ) ? self.defaultPositionIndex : self.positionIndex(),

                    filterMenuItems = [
                        {
                            name: 'KoFilter_TEXT_ALL_' + self.forPropertyName,
                            //icon: 'ASTERISK',
                            text: self.i18n( 'KoUI.KoTable.filterConfiguration.options.TEXT_ALL' ),
                            title: self.i18n( 'KoUI.KoTable.filterConfiguration.options.TEXT_ALL' ),
                            disabled: ko.computed( function() { return 'all' === self.filterField.textSearchType(); } ),
                            visible: self.canChangeTextSearch,
                            click: self.setFilterTextAll
                        },
                        {
                            name: 'KoFilter_TEXT_BEGINS_' + self.forPropertyName,
                            icon: 'ANGLE_RIGHT',
                            text: self.i18n( 'KoUI.KoTable.filterConfiguration.options.TEXT_BEGINS' ),
                            title: self.i18n( 'KoUI.KoTable.filterConfiguration.options.TEXT_BEGINS' ),
                            disabled: ko.computed( function() { return 'begins' === self.filterField.textSearchType(); } ),
                            visible: self.canChangeTextSearch,
                            click: self.setFilterTextBegins
                        },
                        {
                            name: 'KoFilter_TEXT_ENDS_' + self.forPropertyName,
                            icon: 'ANGLE_LEFT',
                            text: self.i18n( 'KoUI.KoTable.filterConfiguration.options.TEXT_ENDS' ),
                            title: self.i18n( 'KoUI.KoTable.filterConfiguration.options.TEXT_ENDS' ),
                            disabled: ko.computed( function() { return 'ends' === self.filterField.textSearchType(); } ),
                            visible: self.canChangeTextSearch,
                            click: self.setFilterTextEnds
                        },
                        {
                            separator: true,
                            visible: self.canInvertFilter
                        },
                        {
                            name: 'KoFilter_INVERT_' + self.forPropertyName,
                            text: self.i18n( 'KoUI.KoTable.filterConfiguration.options.INVERT' ),
                            title: self.i18n( 'KoUI.KoTable.filterConfiguration.options.INVERT' ),
                            visible: self.canInvertFilter,
                            disabled: ko.computed( function() { return !self.filterField.isFilterInverted(); } ),
                            click: function relayToggleInvertFilter( ctx, evt ) { self.toggleInvertFilter( ctx, evt ); }
                        },
                        {
                            name: 'KoFilter_UNINVERT_' + self.forPropertyName,
                            text: self.i18n( 'KoUI.KoTable.filterConfiguration.options.UNINVERT' ),
                            title: self.i18n( 'KoUI.KoTable.filterConfiguration.options.UNINVERT' ),
                            visible: self.canInvertFilter,
                            disabled: ko.computed( function() { return self.filterField.isFilterInverted(); } ),
                            click: function relayToggleInvertFilter( ctx, evt ) { self.toggleInvertFilter( ctx, evt ); }
                        }
                    ],

                    limitSubmenu = {
                        name: 'KoFilter_LIMIT_SUBMENU',
                        icon: 'LIST_ALT',
                        text: self.limitMenuText,
                        title: self.limitMenuText,
                        visible: true,
                        menu: {
                            items: []
                        }
                    },

                    toolMenuItems = self.owner.getToolsActionItems(),
                    limitList = self.owner.limitList(),
                    i;

                //  add items for changing the number of rows

                if ( self.canInvertFilter ) {
                    filterMenuItems.push({
                        separator: true
                    });
                }

                for ( i = 0; i < limitList.length; i++ ) {
                    limitSubmenu.menu.items.push( {
                        name: 'KoFilter_SM_LIMIT_' + limitList[i],
                        text: limitList[i],
                        title: limitList[i],
                        visible: true,
                        click: makeLimitSetter( limitList[i] )
                    } );
                }

                filterMenuItems.push( limitSubmenu );

                //  add tool menu items: select table columns modal
                filterMenuItems.push( toolMenuItems[0] );
                toolMenuItems[0].click = wrapClickHandlerParent( toolMenuItems[0].click );

                filterMenuItems.push({
                    separator: true
                });

                //  add tool menu items: export CSV
                filterMenuItems.push( toolMenuItems[3] );
                toolMenuItems[3].click = wrapClickHandlerParent( toolMenuItems[3].click );

                //  add tool menu items: export PDF (ordinary tables)
                filterMenuItems.push( toolMenuItems[4] );
                toolMenuItems[4].click = wrapClickHandlerParent( toolMenuItems[4].click );

                //  add tool menu items: export PDF (reports)
                filterMenuItems.push( toolMenuItems[5] );
                toolMenuItems[5].click = wrapClickHandlerParent( toolMenuItems[5].click );

                //  add tool menu items: toggle config buttons
                filterMenuItems.push( toolMenuItems[1] );
                toolMenuItems[1].click = wrapClickHandlerParent( toolMenuItems[1].click );

                //  drate the dropdown button
                self.filterOptionsMenu = KoComponentManager.createComponent( {
                        componentType: 'KoButtonDropDown',
                        name: 'KoTable-columnFilterOptions_' + self.forPropertyName,
                        title: self.i18n( 'KoUI.KoTable.filterConfiguration.action.title' ),
                        icon: 'GEAR',
                        size: 'XSMALL',
                        disabled: false,
                        visible: true,
                        menu: {
                            items: filterMenuItems,
                            pullRight: ( usePositionIndex !== 0 )
                        }
                    }
                );
            },

            /**
             *  Toggle negative filtering on and off
             *
             *  @param  {Object}    ctx     VM to which the click event is bound, if called by click handler
             *  @param  {Object}    evt     If called from KO click handler
             */

            toggleInvertFilter: function( ctx, evt ) {
                var self = this;
                if ( !self.filterField ) { return; }
                if ( !self.canInvertFilter ) { return; }

                //  toggle the invert setting
                self.filterField.isFilterInverted( !self.filterField.isFilterInverted() );
                self.setState( 'isFilterInverted', self.filterField.isFilterInverted() );
                self.safeCloseDropdown( evt );
            },

            /**
             * The property name to use when fetching filtered data from server. If unset defaults to "forPropertyName".
             * @property filterPropertyName
             * @type {String}
             */
            filterPropertyName: null,
            /**
             * Column editor configuration to use with {{#crossLink "KoTableColumn/isEditable:attribute"}}{{/crossLink}}
             * @property editorField
             * @type {Object}
             */
            editorField: null,
            /** @protected */
            initEditable: function() {
                var
                    self = this;

                self.eventEditableChange = Y.bind( self.eventEditableChange, self );

                self.addDisposable( ko.computed( function() {
                    var
                        isEditable = unwrap( self.isEditable ),
                        rows = unwrap( self.owner.rows );

                    // rebuild observables
                    if( isEditable ) {
                        self._valueEditables = [];

                        rows.forEach( function( row ) {
                            if( row !== KoTable.CONST.EMPTY_ROW ) {
                                self._valueEditables.push( ko.observable() );
                            }
                        } );

                    }
                    else {
                        self._valueEditables = null;
                        delete self._valueEditables;
                    }

                } ) );

                self.addDisposable( ko.computed( function() {
                    var
                        isEditable = unwrap( self.isEditable ),
                        dataModifications = peek( self.owner.dataModifications );

                    // remove any modifications for this column if it is not editable anymore
                    if( !isEditable && dataModifications.length ) {
                        Y.Array.invoke( dataModifications, 'revert', self.forPropertyName );
                    }

                } ) );

            },
            /**
             * Gets a value specified by this {{#crossLink "KoTableColumn/forPropertyName:property"}}{{/crossLink}} on the given data
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
                    return data[propertyName];
                } else if( exists( propertyName, data ) ) {
                    return getObject( propertyName, data );
                } else {
                    return undefined;
                }
            },

            /**
             * Sets a value specified by this {{#crossLink "KoTableColumn/forPropertyName:property"}}{{/crossLink}} on the given data
             * @method setValueFromData
             * @param {*} value
             * @param {Object} data
             * @returns {*|undefined} The value if set successfully, otherwise undefined.
             * @protected
             */
            setValueFromData: function( value, data ) {
                var
                    self = this,
                    propertyName = peek( self.forPropertyName );

                return setObject( propertyName, value, data );
            },
            /**
             * @method isRowDisabledByMeta
             * @protected
             * @param meta
             * @return {boolean}
             */
            isRowDisabledByMeta: function( meta ) {
                return meta.row === KoTable.CONST.EMPTY_ROW;
            },
            /**
             * Sort this column by direction
             * @method sort
             * @param {String|observable} direction either 'ASC' or 'DESC'
             * @protected
             * @return {boolean} true if a sorting has occurred
             */
            sort: function( direction ) {
                var
                    self = this,
                    isSortable = peek( self.isSortable );

                if( !isSortable ) {
                    return false;
                }

                self.direction( peek( direction ) );
                self.addToSorters();

                return true;
            },
            /**
             * Sort this column ascending
             * @method sortAsc
             */
            sortAsc: function() {
                this.sort( KoTableColumn.CONST.DIRECTION.ASC );
            },
            /**
             * Sort this column descending
             * @method sortAsc
             */
            sortDesc: function() {
                this.sort( KoTableColumn.CONST.DIRECTION.DESC );
            },
            /**
             * Sort this column by the initial direction
             * @method sortReset
             */
            sortReset: function() {
                var
                    self = this,
                    direction = peek( self.initialConfig.direction ) || KoTableColumn.CONST.DIRECTION.ASC;

                self.sort( direction );
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
             * Overwrite this method to provide your own on cell context menu handling.
             * If it returns false or $event.stopImmediatePropagation, $event.stopPropagation is called no event bubbling will occur.
             * If $event.preventDefault is called only the default action is prevented.
             * @method onCellContextMenu
             * @param {Object} meta row meta Object
             * @param {Event} $event the raised event
             * @return {boolean}
             * @example
             {
                 forPropertyName: 'aPropertyName',
                 onCellContextMenu: function( meta, event ) {
                     console.warn( 'onCellContextMenu :', arguments, this );
                 }
             }
             */
            onCellContextMenu: function( /*meta, $event*/ ) {
                // meant to override
                return true;
            },
            /**
             * Specifies the initial sort order index of the column.
             *
             * A null value will take the index defined by the columns.
             *
             * A number value will priories the sort order above the columns order.
             *
             * **E.g.:**
             * - 0 - will set this column to be sorted by first
             * - 1 - will set another column to be sorted by second
             *
             * @property sortInitialIndex
             * @type {null|Number}
             * @default null
             * @example
             {
                 // …
                 sortersLimit: 3,
                 columns: [
                     { forPropertyName: 'salutation', isSortable: true }, // sort by third
                     { forPropertyName: 'firstname', isSortable: true, sortInitialIndex: 0 }, // sort by first
                     { forPropertyName: 'lastname', isSortable: true, sortInitialIndex: 1 }, // sort by second
                     { forPropertyName: 'birth', isSortable: true } // not sorted by, because of limit reached
                 ]
                 // …
             }
             */
            sortInitialIndex: null,
            /**
             * Provide custom sorting for this column (a comparator function or a predefined one by string [currently: 'natural'|'number'])
             * - only for not remote table
             * @property sortBy
             * @type {null|String|Function}
             * @see KoUI.utils.String.comparators
             * @see KoUI.utils.Number.comparators
             * @example
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
                 }
             }
             */
            sortBy: null,
            doRender: function( meta ) {
                var
                    self = this,
                    data = meta.row;
                if( data === KoTable.CONST.EMPTY_ROW ) {
                    return '';
                }
                return self.renderer( meta );
            },
            doRenderHeader: function( meta ) {
                var
                    self = this,
                    data = meta.row;
                if( data === KoTable.CONST.EMPTY_ROW ) {
                    return '';
                }
                return self.rendererHeader( meta );
            },
            interceptRenderOutput: function( output, meta ) {
                var
                    self = this,
                    data = meta.row;
                if( data !== KoTable.CONST.EMPTY_ROW && self.owner.interceptRenderOutput ) {
                    self.owner.interceptRenderOutput( meta, output );
                }
                return output;
            },
            /**
             * Provide custom filtering for this column (a function to use with Array.filter)
             * - only for not remote table
             * - ignores "queryFilterType" if given
             * @property filterBy
             * @type {null|Function}
             * @example
             {
                 forPropertyName: 'virtual',
                 label: 'firstname lastname',
                 renderer: function( meta ) {
                     return meta.row.firstname + ' ' + meta.row.lastname;
                 },
                 isFilterable: true,
                 filterBy: function( row ) {
                     var value = this.filterField.value();
                     return (row.firstname + ' ' + row.lastname).toLowerCase().indexOf( value.toLowerCase() ) > -1;
                 }
             }
             */
            filterBy: null,
            /**
             * @property queryFilterType
             * @type {String}
             * @default DCQuery.IREGEX_OPERATOR
             */
            queryFilterType: DCQuery.IREGEX_OPERATOR,
            /**
             * Depending on a the filtering properties, different query objects may be required.
             *
             * queryFilterType       Expected parameters
             * regex                 -
             * year                  -
             * enum                  -
             * iregex                -
             * gt                    -
             *
             * @method getQueryFilterObject
             * @param value The value to filter by
             * @return {Object}
             */
            getQueryFilterObject: function( value ) {
                var
                    result, i, to, idx, symbols,
                    self = this;

                switch( self.queryFilterType ) {
                    case DCQuery.ENUM_OPERATOR:
                        if ( self.isFilterInverted() ) {
                            result = DCQuery.makeNotEnumOp( value );
                        } else {
                            result = DCQuery.makeEnumOp( value );
                        }
                        break;
                    case DCQuery.ENUM_ACTTYPE_OPERATOR:
                        result = DCQuery.makeActTypeEnumOp( value );
                        break;
                    case DCQuery.KBVDOB_OPERATOR:
                        result = DCQuery.makeKBVDobOp( value );
                        break;
                    case DCQuery.QUARTER_YEAR:
                        result = DCQuery.makeQuarterYearOp( value );
                        break;
                    case DCQuery.GTE_OPERATOR:
                        result = DCQuery.makeGtOrLtOp( value, 'gte' );
                        break;
                    case DCQuery.GT_OPERATOR:
                        result = DCQuery.makeGtOrLtOp( value );
                        break;
                    case DCQuery.EQ_OPERATOR:
                        result = DCQuery.makeEqOp( value );
                        break;
                    case DCQuery.EQ_BOOL_OPERATOR:
                        result = DCQuery.makeEqBoolOp( value );
                        break;
                    case DCQuery.EQDATE_OPERATOR:
                        result = DCQuery.makeEqDateOp( value );
                        break;
                    case DCQuery.IREGEX_OPERATOR:
                        switch( self.textSearchType() ) {
                            case 'all':     result = DCQuery.makeIregexOp( value );  break;
                            case 'begins':  result = DCQuery.makeIregexOpBegins( value );  break;
                            case 'ends':    result = DCQuery.makeIregexOpEnds( value );  break;
                        }

                        if ( self.isFilterInverted() ) {
                            result = { 'notiregex': result.iregex };
                        }

                        break;
                    case DCQuery.MONGO_IREGEX:
                        result = DCQuery.makeMongoIregexOp( value );
                        break;
                    case DCQuery.DATE_RANGE_OPERATOR:
                        result = DCQuery.makeDateRangeOp( value );
                        break;
                    case 'eqNumber':
                        value = value.toString().replace( /,/g, '.' );
                        value = parseFloat( value );
                        result = DCQuery.makeEqOp( value );
                        break;
                    case 'numberAsString10':
                        value = value.toString();
                        idx = value.indexOf( '.' );
                        if( -1 === idx ) {
                            value += '00';
                        } else {
                            symbols = value.slice( idx + 1, value.length );
                            value = value.slice( 0, idx );
                            // 2 symbols after decimal allowed
                            switch( symbols.length ) {
                                case 0:
                                    value += '00';
                                    break;
                                case 1:
                                    value += symbols + '0';
                                    break;
                                default:
                                    value = symbols.slice( 0, 2 );
                                    break;
                            }
                        }
                        // add 0 to start, length must equal 10
                        if( 10 > value.length ) {
                            to = 10 - value.length;
                            for( i = 0; i < to; i++ ) {
                                value = '0' + value;
                            }
                        }
                        result = DCQuery.makeGtOrLtOp( value, 'gte' );
                        break;
                    case DCQuery.IREGEX_ENUM_OPERATOR:
                        result = DCQuery.makeIregexEnumOp( value );
                        break;
                    case DCQuery.DATE_RANGE_TIME_INSIGHT_OPERATOR:
                        result = DCQuery.makeDateRangeTimeInsightOp( value );
                        break;
                    case DCQuery.REGEX_OPERATOR:
                        result = DCQuery.makeRegexOp( value );
                        break;
                    case DCQuery.CATALOG_EXTENSION_OPERATOR:
                        result = DCQuery.makeCatalogExtensionOperator( value );
                        break;
                    default:
                        result = DCQuery.makeIregexOp( value );
                }

                return result;
            },
            /**
             * If column is configured filterable a custom KoField can be defined as filter input.
             *
             * Defaults to {{#crossLink "KoField"}}KoField{{/crossLink}}, see also: {{#crossLink "KoFieldSelect"}}KoFieldSelect{{/crossLink}}, {{#crossLink "KoFieldSelect2"}}KoFieldSelect2{{/crossLink}}
             * @property filterField
             * @type {null|KoField}
             * @default KoField
             * @example
             // … partial column config for having a list
             isFilterable: true,
             queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
             filterField: {
                 componentType: 'KoFieldSelect2',
                 options: Y.doccirrus.schemas.person.types.Insurance_E.list,
                 optionsText: 'i18n',
                 optionsValue: 'val'
             }
             * @example
             // … partial column config for filling a list and setting a value
             forPropertyName: 'myPropertyName',
             isFilterable: true,
             queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
             filterField: {
                 componentType: 'KoFieldSelect2',
                 optionsText: 'i18n',
                 optionsValue: 'val'
             }
             // … after instantiation:
             aKoTable.getColumnByPropertyName('myPropertyName' ).filterField.options( Y.doccirrus.schemas.person.types.Insurance_E.list );
             aKoTable.getColumnByPropertyName('myPropertyName' ).filterField.value( ['PUBLIC', 'PRIVATE'] );
             * @example
             // … partial column config for having a list and want user defined entries that are not in list
             isFilterable: true,
             queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
             filterField: {
                 componentType: 'KoFieldSelect2',
                 options: Y.doccirrus.schemas.person.types.Insurance_E.list,
                 optionsText: 'i18n',
                 optionsValue: 'val',
                 {{#crossLink "KoFieldSelect2/allowValuesNotInOptions:attribute"}}{{/crossLink}}: true
             }
             * @example
             // … partial column config for having only user defined entries that are not in list
             isFilterable: true,
             queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
             filterField: {
                 componentType: 'KoFieldSelect2',
                 {{#crossLink "KoFieldSelect2/allowValuesNotInOptions:attribute"}}{{/crossLink}}: true
             }
             */
            filterField: null,
            /**
             * Checks if this column is in the sorters of it's owner
             * @method isInSorters
             * @return {Boolean}
             */
            isInSorters: function() {
                var
                    self = this,
                    owner = self.owner;

                return owner.isColumnInSorters( self );
            },
            /**
             * Check if this column is the main sorted by column
             * @method isMainSortedBy
             * @param {KoTableColumn} column
             * @return {boolean}
             */
            isMainSortedBy: function() {
                var
                    self = this,
                    owner = self.owner;

                return owner.isColumnMainSortedBy( self );
            },
            /**
             * Check if this column is not the main sorted by column
             * @method isNotMainSortedBy
             * @param {KoTableColumn} column
             * @return {boolean}
             */
            isNotMainSortedBy: function() {
                var
                    self = this;

                return !self.isMainSortedBy();
            },
            /**
             * Get the prioritisation of this column in the sorters of it's owner
             * @method getPrioritisationInSorters
             * @return {null|Number}
             */
            getPrioritisationInSorters: function() {
                var
                    self = this,
                    owner = self.owner;

                return owner.getColumnPrioritisationInSorters( self );
            },
            /**
             * Add this column to the sorters of it's owner, if it isn't already.
             * @method addToSorters
             */
            addToSorters: function() {
                var
                    self = this,
                    owner = self.owner;

                return owner.addColumnToSorters( self );
            },
            /**
             * Remove this column from the sorters of it's owner, if it isn't already.
             * @method removeFromSorters
             */
            removeFromSorters: function() {
                var
                    self = this,
                    owner = self.owner;

                return owner.removeColumnFromSorters( self );
            },
            /**
             * @method sortDirectionActive
             * @param {String} direction
             * @return {Boolean}
             * @protected
             */
            sortDirectionActive: function( direction ) {
                var
                    self = this;

                if( self.isInSorters() ) {
                    return unwrap( self.direction ) === direction;
                } else {
                    return false;
                }

            },
            /**
             * @method sortDirectionEnabled
             * @param {String} direction
             * @return {Boolean}
             * @protected
             */
            sortDirectionEnabled: function( direction ) {
                var
                    self = this;

                return !self.sortDirectionActive( direction );
            },
            /**
             * Handles the sort cycle for this column, if the column {{#crossLink "KoTableColumn/isSortable:attribute"}}{{/crossLink}}.
             *
             * The cycle is as following:
             * - sort column ascending
             * - sort column descending
             * - stop column to be sorted by
             *
             * @method toggleSortCycle
             * @return {boolean} true if a cycling has occurred
             */
            toggleSortCycle: function() {
                var
                    self = this,
                    isSortable = peek( self.isSortable ),
                    direction = peek( self.direction );

                if( !isSortable ) {
                    return false;
                }

                if( self.isInSorters() ) {
                    switch( direction ) {
                        case KoTableColumn.CONST.DIRECTION.ASC:
                            self.sortDesc();
                            break;
                        case KoTableColumn.CONST.DIRECTION.DESC:
                            self.removeFromSorters();
                            break;
                    }
                } else {
                    self.sortAsc();
                }

                return true;
            },
            /**
             * Handles the header label click for this column.
             * @method clickLabelHandler
             * @param {KoTableColumn} model
             * @param {Event} event
             */
            clickLabelHandler: function( model, event ) {
                var
                    self = this;

                //  do not re-sort while extended menu is available
                if ( self.owner.showFilterConfig() ) {
                    if ( self.filterOptionsMenu && self.filterOptionsMenu.isMenuOpen ) {
                        if ( self.filterOptionsMenu.isMenuOpen() ) {
                            self.filterOptionsMenu.closeMenu();
                        } else {
                            //  need to stop the event, since click is outside of dropdown it will otherwise close it
                            event.stopPropagation();

                            //  close any other column dropdowns which are open
                            self.owner.columns().forEach( function closeCol( col ) {
                                if (
                                    col !== self &&
                                    col.filterOptionsMenu &&
                                    col.filterOptionsMenu.isMenuOpen &&
                                    col.filterOptionsMenu.isMenuOpen()
                                ) {
                                    col.filterOptionsMenu.closeMenu();
                                }
                            } );

                            self.filterOptionsMenu.openMenu();
                        }
                    }
                    return;
                }

                //  expanded filter options not shown, cycle through sort options
                self.toggleSortCycle();
            },
            /** @protected */
            initWidthComputed: function() {
                var
                    self = this,
                    width = peek( self.width );

                self.widthComputed( width );
            },
            /**
             * Event handler for {{#crossLink "KoTableColumn/isEditable:attribute"}}{{/crossLink}} change
             * @method eventEditableChange
             * @param {Object} meta
             * @param {Event} event
             * @return {boolean}
             * @protected
             */
            eventEditableChange: function( meta/*, event*/ ) {
                var
                    self = this,
                    origin = meta.row;

                self.updateModified( {
                    observable: meta.valueEditable,
                    origin: origin
                } );

                return true;
            },
            /**
             * Notifies {{#crossLink "KoTable"}}{{/crossLink}} about a modification
             * @method updateModified
             * @param {Object} parameters
             * @param {ko.observable} parameters.observable An observable which holds the value
             * @param {Object} parameters.origin The original row data Object
             */
            updateModified: function( parameters ) {
                var
                    self = this,
                    observable = parameters.observable,
                    origin = parameters.origin;

                self.owner.updateModified( {
                    column: self,
                    observable: observable,
                    origin: origin
                } );
            },
            /** @protected */
            initCss: function() {
                var
                    self = this;

                self.addDisposable( ko.computed( function() {
                    var css = self.css();

                    css['KoTableCell-editable'] = unwrap( self.isEditable );
                    css.KoTableFixedCell = unwrap( self.isFixed );

                    self.css.notifySubscribers( css );
                } ) );

            },
            /**
             * Meant to overwrite to supply individual class names per cell by checking the context argument
             * @param {Object} $context
             * @return {ko.observable}
             */
            getCss: function( /*$context*/ ) {
                var
                    self = this;

                return self.css;
            }
        },
        lazy: {
            /**
             * The label of a column
             * @attribute label
             * @type {String}
             * @default ''
             */
            label: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * The description of a column
             * @attribute label
             * @type {String}
             * @default ''
             */
            description: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableCell' ) );
            },
            /**
             * @attribute templateNameCellEditable
             * @type {String}
             * @default 'KoTableCellEditable'
             * @protected
             */
            templateNameCellEditable: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableCellEditable' ) );
            },
            /**
             * @attribute isFixed
             * @type {Boolean}
             * @default false
             */
            isFixed: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * @attribute computedStyles
             * @type {object}
             * @default {}
             */
            computedStyles: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( {} ) );
            },
            /**
             * @attribute isSortable
             * @type {Boolean}
             * @default false
             */
            isSortable: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            isNumeric: function( key ) {

                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },

            notVisibleAtSummaryRow: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Enable Filtering for this column
             * - When not "remote" table no support for "forPropertyName" at syntax of "foo.bar"
             *  where foo is an array and bar a property inside of an object inside that array (mongo style path syntax)
             * @attribute isFilterable
             * @type {Boolean}
             * @default false
             */
            isFilterable: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * @attribute isEditable
             * @type {Boolean}
             * @default false
             */
            isEditable: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Column is draggable
             * @attribute isDraggable
             * @type {Boolean}
             * @default true
             */
            isDraggable: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * Columns could be dropped on this column index
             * @attribute isDroppable
             * @type {Boolean}
             * @default true
             */
            isDroppable: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * @attribute direction
             * @type {String|'ASC'|'DESC'}
             * @default 'ASC'
             */
            direction: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( KoTableColumn.CONST.DIRECTION.ASC ) );
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

                return self._handleLazyConfig( key, ko.observable( 'KoTableColumn' ) );
            },
            /**
             * @property hasTools
             * @return {Boolean}
             * @protected
             */
            hasTools: function() {
                var
                    self = this;

                return ko.computed( function() {
                    var
                        hasTools = self.isSortable();
                    return hasTools;
                } );
            },
            /**
             * In general used for the components top most element visibility.
             * - [knockout "visible" binding](http://knockoutjs.com/documentation/visible-binding.html)
             *
             * - This attribute is stateful. See {{#crossLink "KoTableColumn/statesAvailable:property"}}{{/crossLink}} for a list of prototype specific stateful property implementations.
             * - Configuration setting will be ignored once the user saves visibility configuration for that column, to prevent this see {{#crossLink "KoTableColumn/visibleByUser:attribute"}}{{/crossLink}}
             * @attribute visible
             * @for KoTableColumn
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
             * User is allowed to set {{#crossLink "KoTableColumn/visible:attribute"}}{{/crossLink}} by configuration
             * @attribute visibleByUser
             * @for KoTableColumn
             * @type {Boolean}
             * @default true
             */
            visibleByUser: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * Stateful property to set the column index
             * @attribute positionIndex
             * @type {null|Number}
             * @default true
             */
            positionIndex: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( null ), {
                    stateful: true
                } );
            },
            /**
             * Persist these instance properties, when a {{#crossLink "KoConfigurable/stateId:property"}}{{/crossLink}} is given.
             * This is a configuration property.
             *
             * See {{#crossLink "KoTableColumn/statesAvailable:property"}}{{/crossLink}} for a list of prototype specific stateful property implementations.
             * @attribute states
             * @for KoTableColumn
             * @type {Array}
             * @default ['visible', 'positionIndex']
             */
            states: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ['visible', 'positionIndex'] );
            },
            /**
             * Array of properties which are considered stateful. This property will hold a list of component specific stateful property implementations.
             * @property statesAvailable
             * @for KoTableColumn
             * @type {Array}
             * @default ['visible', 'positionIndex']
             */
            statesAvailable: function() {
                return ['visible', 'positionIndex', 'isFilterInverted', 'textSearchType'];
            },
            /**
             * In general used for the components top most element class names.
             * - here for each cell
             * - [knockout "css" binding](http://knockoutjs.com/documentation/css-binding.html)
             * @attribute css
             * @type {Object}
             * @default {}
             * @for KoTableColumn
             */
            css: function( key ) {
                var
                    self = this,
                    isUtility = peek( self.isUtility ),
                    forPropertyNameClassName = 'KoTableCell-forPropertyName-' + self.forPropertyName,
                    observable = self._handleLazyConfig( key, ko.observable( {} ) ),
                    defaults = {};

                // TODO: having isUtility = th & isData = td would be better
                defaults[forPropertyNameClassName] = true;
                defaults['KoTableCell-isUtility'] = isUtility;
                defaults['KoTableCell-isData'] = !isUtility;

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
             * @attribute handleColumnOnCellContextMenu
             * @type {Boolean}
             * @default true
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
             */
            handleTableOnRowContextMenu: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            }
        }
    } );
    /**
     * @property KoTableColumn
     * @type {KoTableColumn}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableColumn );

    /**
     * @class KoTableColumnRenderer
     * @constructor
     * @extends KoTableColumn
     * @param {Object} config a configuration object
     */
    function KoTableColumnRenderer() {
        KoTableColumnRenderer.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTableColumnRenderer,
        extends: KoTableColumn,
        descriptors: {
            componentType: 'KoTableColumnRenderer',
            /**
             * @property isUtility
             * @type {Boolean}
             * @default true
             * @for KoTableColumnRenderer
             */
            isUtility: true,
            /**
             * @property isExcludedInCsv
             * @type {Boolean}
             * @default true
             * @for KoTableColumnRenderer
             */
            isExcludedInCsv: true,
            /**
             * @protected
             */
            init: function() {
                var
                    self = this;

                KoTableColumnRenderer.superclass.init.apply( self, arguments );

            },
            /**
             * Overwrite this method to provide your own custom rendering.
             * @method renderer
             * @param {Object} meta row meta Object
             * @return {string}
             */
            renderer: function( /*meta*/ ) {
                return '';
            }
        },
        lazy: {
            /**
             * The label of a column
             * @attribute label
             * @type {String}
             * @default ''
             * @for KoTableColumnRenderer
             */
            label: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * Title for label of a column
             * @attribute title
             * @type {String|undefined}
             * @for KoTableColumnRenderer
             */
            title: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable() );
            },
            /**
             * @protected
             */
            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableCellRenderer' ) );
            },
            /**
             * Class isn't sortable!
             * @attribute isSortable
             * @for KoTableColumnRenderer
             * @private
             */
            /**
             * Class isn't sortable!
             * @property isSortable
             * @for KoTableColumnRenderer
             */
            isSortable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't filterable!
             * @attribute isFilterable
             * @for KoTableColumnRenderer
             * @private
             */
            /**
             * Class isn't filterable!
             * @property isFilterable
             * @for KoTableColumnRenderer
             */
            isFilterable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't editable!
             * @attribute isEditable
             * @for KoTableColumnRenderer
             * @private
             */
            /**
             * Class isn't editable!
             * @property isEditable
             * @for KoTableColumnRenderer
             */
            isEditable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't draggable!
             * @attribute isDraggable
             * @for KoTableColumnRenderer
             * @private
             */
            /**
             * Class isn't draggable!
             * @property isDraggable
             * @for KoTableColumnRenderer
             */
            isDraggable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't droppable!
             * @attribute isDroppable
             * @for KoTableColumnRenderer
             * @private
             */
            /**
             * Class isn't droppable!
             * @property isDroppable
             * @for KoTableColumnRenderer
             */
            isDroppable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * @protected
             */
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableColumnRenderer' ) );
            },
            /**
             * @attribute handleColumnOnCellClick
             * @type {Boolean}
             * @default true
             * @for KoTableColumnRenderer
             */
            handleColumnOnCellClick: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * @attribute handleTableOnCellClick
             * @type {Boolean}
             * @default false
             * @for KoTableColumnRenderer
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
             * @for KoTableColumnRenderer
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
             * @for KoTableColumnRenderer
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
             * @for KoTableColumnRenderer
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
             * @for KoTableColumnRenderer
             */
            handleTableOnRowContextMenu: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            }
        }
    } );
    /**
     * @property KoTableColumnRenderer
     * @type {KoTableColumnRenderer}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableColumnRenderer );

    /**
     * @class KoTableColumnNumbering
     * @constructor
     * @extends KoTableColumn
     * @param {Object} config a configuration object
     */
    function KoTableColumnNumbering() {
        KoTableColumnNumbering.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTableColumnNumbering,
        extends: KoTableColumn,
        descriptors: {
            componentType: 'KoTableColumnNumbering',
            /**
             * The width of a column (specified in colgroup tag)
             * @property width
             * @type {String}
             * @default '33px'
             * @for KoTableColumnNumbering
             */
            width: '33px',
            /**
             * @property isUtility
             * @type {Boolean}
             * @default true
             * @for KoTableColumnNumbering
             */
            isUtility: true,
            /**
             * @property isExcludedInCsv
             * @type {Boolean}
             * @default false
             * @for KoTableColumnNumbering
             */
            isExcludedInCsv: false,
            /**
             * @protected
             */
            init: function() {
                var
                    self = this;

                KoTableColumnNumbering.superclass.init.apply( self, arguments );

            },
            renderer: function( meta ) {
                var
                    self = this,
                    rowIndex = meta.rowIndex,
                    owner = self.owner,
                    paging = peek( owner.paging ),
                    page = peek( paging.page ),
                    limit = peek( owner.limit ),
                    rowNumber = rowIndex + 1,
                    result = page * limit - limit + rowNumber;

                return result;
            }
        },
        lazy: {
            /**
             * The label of a column
             * @attribute label
             * @type {String}
             * @default 'KoUI.KoTableColumnNumbering.label'
             * @for KoTableColumnNumbering
             */
            label: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( self.i18n( 'KoUI.KoTableColumnNumbering.label' ) ) );
            },
            /**
             * Title for label of a column
             * @attribute title
             * @type {String|undefined}
             * @default 'KoUI.KoTableColumnNumbering.title'
             * @for KoTableColumnNumbering
             */
            title: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( self.i18n( 'KoUI.KoTableColumnNumbering.title' ) ) );
            },
            /**
             * @protected
             */
            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableCellNumbering' ) );
            },
            /**
             * Class isn't sortable!
             * @property isSortable
             * @for KoTableColumnNumbering
             */
            isSortable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't filterable!
             * @attribute isFilterable
             * @for KoTableColumnNumbering
             * @private
             */
            /**
             * Class isn't filterable!
             * @property isFilterable
             * @for KoTableColumnNumbering
             */
            isFilterable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't editable!
             * @attribute isEditable
             * @for KoTableColumnNumbering
             * @private
             */
            /**
             * Class isn't editable!
             * @property isEditable
             * @for KoTableColumnNumbering
             */
            isEditable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't draggable!
             * @attribute isDraggable
             * @for KoTableColumnNumbering
             * @private
             */
            /**
             * Class isn't draggable!
             * @property isDraggable
             * @for KoTableColumnNumbering
             */
            isDraggable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't droppable!
             * @attribute isDroppable
             * @for KoTableColumnNumbering
             * @private
             */
            /**
             * Class isn't droppable!
             * @property isDroppable
             * @for KoTableColumnNumbering
             */
            isDroppable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * @protected
             */
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableColumnNumbering' ) );
            },
            /**
             * @attribute handleColumnOnCellClick
             * @type {Boolean}
             * @default false
             * @for KoTableColumnNumbering
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
             * @for KoTableColumnNumbering
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
             * @for KoTableColumnNumbering
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
             * @for KoTableColumnNumbering
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
             * @for KoTableColumnNumbering
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
             * @for KoTableColumnNumbering
             */
            handleTableOnRowContextMenu: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            }
        }
    } );
    /**
     * @property KoTableColumnNumbering
     * @type {KoTableColumnNumbering}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableColumnNumbering );

    /**
     * @class KoTableColumnCheckbox
     * @constructor
     * @extends KoTableColumn
     * @param {Object} config a configuration object
     */
    function KoTableColumnCheckbox() {
        KoTableColumnCheckbox.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTableColumnCheckbox,
        extends: KoTableColumn,
        descriptors: {
            componentType: 'KoTableColumnCheckbox',
            /**
             * The width of a column (specified in colgroup tag)
             * @property width
             * @type {String}
             * @default '32px'
             */
            width: '32px',
            /**
             * @property _checkedIdentifiers
             * @type Object
             * @default {}
             * @protected
             */
            _checkedIdentifiers: null,
            /**
             * @property isUtility
             * @type {Boolean}
             * @default true
             * @for KoTableColumnCheckbox
             */
            isUtility: true,
            /**
             * @property isExcludedInCsv
             * @type {Boolean}
             * @default true
             * @for KoTableColumnCheckbox
             */
            isExcludedInCsv: true,
            init: function() {
                var self = this;
                KoTableColumnCheckbox.superclass.init.apply( self, arguments );

                self.checkRow = Y.bind( self.checkRow, self );
                self._checkedIdentifiers = {};

                self.initOwnerDataSubscribe();
                self.initAutoUncheck();
            },
            /**
             * The property name in the model to use with property based checking.
             * @property propertyToCheckBy
             * @type {String}
             * @default '_id'
             */
            propertyToCheckBy: '_id',
            /**
             * Initializes auto-unchecking via {{#crossLink "KoTableColumnCheckbox/uncheckAll:method"}}{{/crossLink}} under the circumstances defined by
             * - {{#crossLink "KoTableColumnCheckbox/uncheckOnFilterChange:attribute"}}{{/crossLink}}
             * - {{#crossLink "KoTableColumnCheckbox/uncheckOnReload:attribute"}}{{/crossLink}}
             * - {{#crossLink "KoTableColumnCheckbox/uncheckOnPaging:attribute"}}{{/crossLink}}
             * @method initAutoUncheck
             * @protected
             */
            initAutoUncheck: function() {
                var
                    self = this,
                    owner = self.owner;

                self.addDisposable( ko.computed( function() {
                    var
                        lastParamChanges = unwrap( owner.lastParamChanges ),
                        shouldUncheck = false;

                    if( ko.computedContext.isInitial() ) {
                        return;
                    }

                    if( peek( self.uncheckOnFilterChange ) && lastParamChanges.indexOf( KoTable.CONST.PARAM_CHANGE.FILTER ) > -1 ) {
                        shouldUncheck = true;
                    }
                    if( peek( self.uncheckOnPaging ) && lastParamChanges.indexOf( KoTable.CONST.PARAM_CHANGE.PAGING ) > -1 ) {
                        shouldUncheck = true;
                    }
                    if( peek( self.uncheckOnReload ) && !lastParamChanges.length ) {
                        shouldUncheck = true;
                    }

                    if( shouldUncheck ) {
                        self.uncheckAll();
                    }

                } ).extend( {
                    rateLimit: 0
                } ) );

            },
            /**
             * Test if provided row model is checked.
             * @method isChecked
             * @param {Object} model
             * @return {boolean}
             */
            isChecked: function( model ) {
                var
                    self = this,
                    checked = unwrap( self.checked );

                return (checked.indexOf( model ) > -1 || Boolean( self._checkedIdentifiers[self.getIdentifierOfModel( model )] ));
            },
            /**
             * Checks if a property value is checked.
             * @method isCheckedProperty
             * @param {*} propertyValue
             * @return {boolean}
             */
            isCheckedProperty: function( propertyValue ) {
                var
                    self = this,
                    data = peek( self.owner.data ),
                    propertyName = self.propertyToCheckBy,
                    model;

                model = Y.Array.find( data, function( item ) {
                    return propertyValue === item[propertyName];
                } );

                return Boolean( model );
            },
            /**
             * Template method to test if a row is checked.
             * @method isChecked
             * @param {Object} meta
             * @return {boolean}
             */
            isRowChecked: function( meta ) {
                var
                    self = this,
                    model = meta.row;

                return self.isChecked( model );
            },
            /**
             * Initializes handling of owner table data change dependencies
             * @protected
             */
            initOwnerDataSubscribe: function() {
                var
                    self = this,
                    owner = self.owner;

                self.addDisposable( ko.computed( function() {
                    var
                        data = owner.data();

                    ko.ignoreDependencies( function() {
                        if( peek( self.updateCheckedFromCurrentData ) ) {
                            self.updateCheckedFrom( data );
                        }
                    } );

                } ) );
            },
            /**
             * Update the checked models with the provided data
             * @param {Array} data
             */
            updateCheckedFrom: function( data ) {
                var
                    self = this,
                    checked = peek( self.checked ),
                    spliced = false,
                    identifier,
                    referencedModel,
                    checkedIndex;

                Y.each( data, function( item ) {
                    if( self.isChecked( item ) ) {

                        identifier = self.getIdentifierOfModel( item );
                        referencedModel = self._checkedIdentifiers[identifier];
                        checkedIndex = checked.indexOf( referencedModel );

                        checked.splice( checkedIndex, 1, item );
                        self._checkedIdentifiers[identifier] = item;
                        spliced = true;
                    }
                } );

                if( spliced ) {
                    self.checked.valueHasMutated();
                }

            },
            /**
             * Template method for toggle check of a row.
             * @method checkRow
             * @param {Object} meta
             * @param {jQuery.Event} $event
             * @return {boolean}
             * @protected
             */
            checkRow: function( meta/*, $event*/ ) {
                var model = meta.row;
                if( model === KoTable.CONST.EMPTY_ROW ) {
                    return true;
                }
                var self = this,
                    isRowChecked = self.isRowChecked( meta ),
                    checkMode = unwrap( self.checkMode ),
                    identifier = self.getIdentifierOfModel( model );

                switch( checkMode ) { // TODO: improve …
                    case 'single':
                        self._checkedIdentifiers = {};
                        peek( self.checked ).splice( 0 ); // shouldn't notify
                        if( isRowChecked ) {
                            self.checked.valueHasMutated();  // notify
                        }
                        break;
                    case 'multi':
                        if( isRowChecked ) {
                            delete self._checkedIdentifiers[identifier];
                            self.checked.remove( function( item ) {
                                return identifier === self.getIdentifierOfModel( item );
                            } );
                        }
                        break;
                }
                if( !isRowChecked ) {
                    self._checkedIdentifiers[identifier] = model;
                    self.checked.push( model );
                }
                return true;
            },
            /**
             * Checks a row model.
             * @method check
             * @param {Object} model
             */
            check: function( model ) {
                var self = this;
                if( model === KoTable.CONST.EMPTY_ROW ) {
                    return;
                }
                if( !self.isChecked( model ) ) {

                    if( peek( self.checkMode ) === 'single' ) {
                        self.uncheckAll();
                    }

                    self._checkedIdentifiers[self.getIdentifierOfModel( model )] = model;
                    self.checked.push( model );
                }
            },
            /**
             * Computes an identifier from the provided model
             * @param {Object} model
             * @return {String}
             */
            getIdentifierOfModel: function( model ) {
                var
                    self = this,
                    identifyModelBy = ko.unwrap( self.identifyModelBy );

                if( Y.Lang.isFunction( identifyModelBy ) ) {
                    return String( identifyModelBy.call( self, model ) );
                }
                else {
                    switch( identifyModelBy ) {
                        case 'property':
                            return String( model[self.propertyToCheckBy] );
                        case 'hash':// jshint ignore:line
                        default :
                            return String( fastHash( model ) );
                    }
                }

            },
            /**
             * Checks a property value.
             * @method checkByProperty
             * @param {*} propertyValue
             */
            checkByProperty: function( propertyValue ) {
                var
                    self = this,
                    data = peek( self.owner.data ),
                    propertyName = self.propertyToCheckBy,
                    model;

                model = Y.Array.find( data, function( item ) {
                    return propertyValue === item[propertyName];
                } );

                if( model ) {
                    self.check( model );
                } else {
                    Y.log( 'tried to "checkByProperty" on a not existent entry', 'warn', NAME );
                }

            },
            /**
             * Checks an array of row models.
             * @method checkItems
             * @param {Array} items
             */
            checkItems: function( items ) {
                items = peek( items ) || [];
                var
                    self = this;

                items.forEach( self.check, self );
            },
            /**
             * Checks an array of property values.
             * @method checkItemsByProperty
             * @param {Array} items
             */
            checkItemsByProperty: function( items ) {
                items = peek( items ) || [];
                var
                    self = this;

                items.forEach( self.checkByProperty, self );
            },
            /**
             * Unchecks a row model.
             * @method uncheck
             * @param {Object} model
             */
            uncheck: function( model ) {
                var self = this;
                if( model === KoTable.CONST.EMPTY_ROW ) {
                    return;
                }
                var identifier = self.getIdentifierOfModel( model );
                delete self._checkedIdentifiers[identifier];
                self.checked.remove( function( item ) {
                    return identifier === self.getIdentifierOfModel( item );
                } );
            },
            /**
             * Unchecks a property value.
             * @method uncheckByProperty
             * @param {*} propertyValue
             */
            uncheckByProperty: function( propertyValue ) {
                var
                    self = this,
                    data = peek( self.checked ),
                    propertyName = self.propertyToCheckBy,
                    model;

                model = Y.Array.find( data, function( item ) {
                    return propertyValue === item[propertyName];
                } );

                if( model ) {
                    self.uncheck( model );
                }

            },
            /**
             * Clears the selection list. If items are provided unchecks these items
             * @method uncheckAll
             * @param {Array} [items] unchecks all if omitted
             */
            uncheckAll: function( items ) {
                var
                    self = this;

                if( items ) {
                    // in case we receive a reference
                    [].concat( items ).forEach( self.uncheck, self );
                } else {
                    self._checkedIdentifiers = {};
                    self.checked.removeAll();
                }
            },
            /**
             * Clears the selection list. If items are provided unchecks these items
             * @method uncheckAllByProperty
             * @param {Array} [items] unchecks all if omitted
             */
            uncheckAllByProperty: function( items ) {
                var
                    self = this;

                if( items ) {
                    // in case we receive a reference
                    [].concat( items ).forEach( self.uncheckByProperty, self );
                } else {
                    self.uncheckAll();
                }
            },
            /**
             * Handles the header label click for this column.
             * @method clickLabelHandler
             * @for KoTableColumnCheckbox
             * @param {KoTableColumn} model
             * @param {Event} event
             */
            clickLabelHandler: function() {
            }
        },
        lazy: {
            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableCellField' ) );
            },
            /**
             * Class isn't sortable!
             * @attribute isSortable
             * @for KoTableColumnCheckbox
             * @private
             */
            /**
             * Class isn't sortable!
             * @property isSortable
             * @for KoTableColumnCheckbox
             */
            isSortable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't filterable!
             * @attribute isFilterable
             * @for KoTableColumnCheckbox
             * @private
             */
            /**
             * Class isn't filterable!
             * @property isFilterable
             * @for KoTableColumnCheckbox
             */
            isFilterable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't editable!
             * @attribute isEditable
             * @for KoTableColumnCheckbox
             * @private
             */
            /**
             * Class isn't editable!
             * @property isEditable
             * @for KoTableColumnCheckbox
             */
            isEditable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't draggable!
             * @attribute isDraggable
             * @for KoTableColumnCheckbox
             * @private
             */
            /**
             * Class isn't draggable!
             * @property isDraggable
             * @for KoTableColumnCheckbox
             */
            isDraggable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't droppable!
             * @attribute isDroppable
             * @for KoTableColumnCheckbox
             * @private
             */
            /**
             * Class isn't droppable!
             * @property isDroppable
             * @for KoTableColumnCheckbox
             */
            isDroppable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Determines if the all toggled checkbox is checked.
             * - If it is checked at least one row is checked, unchecking will uncheck every row in the current view.
             * - If it is unchecked, checking will check every row in the current view.
             * @property allToggled
             * @type {Boolean}
             * @default false
             */
            allToggled: function() {
                var
                    self = this;

                return ko.computed( {
                    read: function() {
                        self.checked(); // subscribe to reflect changes
                        var
                            modelsAvailable,
                            modelsChecked;

                        modelsAvailable = Y.Array.filter( unwrap( self.owner.rows ), function( model ) {
                            return model !== KoTable.CONST.EMPTY_ROW;
                        } );

                        // nothing to do … exiting
                        if( !modelsAvailable.length ) {
                            return;
                        }

                        modelsChecked = Y.Array.filter( unwrap( self.owner.rows ), function( model ) {
                            return self.isChecked( model );
                        } );

                        // at least one model checked returns true
                        return Boolean( modelsChecked.length );

                    },
                    write: function( toggleValue ) {
                        var
                            modelsAvailable = Y.Array.filter( unwrap( self.owner.rows ), function( model ) {
                                return model !== KoTable.CONST.EMPTY_ROW;
                            } );

                        // handle current view models
                        if( toggleValue ) {
                            self.checkItems( modelsAvailable );
                        } else {
                            self.uncheckAll( modelsAvailable );
                        }
                    }
                }, self ).extend( { rateLimit: 0 } );
            },
            /**
             * Configure the toggle all checkbox in the header to be visible to the user.
             * @attribute allToggleVisible
             * @type {Boolean}
             * @default true
             */
            allToggleVisible: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * The mode in which checking is allowed. 'multi' or 'single'
             * @attribute checkMode
             * @type {String}
             * @default 'multi'
             */
            checkMode: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'multi' ) );
            },
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableColumnCheckbox' ) );
            },
            /**
             * List of observable checked row models
             * @attribute checked
             * @type {Array}
             * @readOnly
             */
            checked: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observableArray() );
            },
            /**
             * List of observable checked properties
             * @property checkedProperties
             * @type {Array}
             * @readOnly
             */
            checkedProperties: function() {
                var
                    self = this,
                    checked = self.checked;

                return ko.computed( function() {
                    return unwrap( checked ).map( function( item ) {
                        var
                            propertyName = self.propertyToCheckBy;

                        if( Y.Object.owns( item, propertyName ) ) {
                            return item[peek( propertyName )];
                        } else {
                            return item;
                        }
                    } );
                } );
            },
            /**
             * Observable List of {{#crossLink "KoTableColumnCheckbox/checked:attribute"}}{{/crossLink}} modifications.
             * See also {{#crossLink "KoTableColumn/isEditable:attribute"}}{{/crossLink}}, {{#crossLink "KoTable/dataModifications:property"}}KoTable.dataModifications{{/crossLink}}
             * @property checkedModifications
             * @type {Array}
             * @readOnly
             */
            checkedModifications: function() {
                var
                    self = this;

                return ko.computed( function() {
                    var
                        checked = self.checked(),
                        modifications = self.owner.dataModifications();

                    return Y.Array.filter( modifications, function( entry ) {
                        var
                            found = Y.Array.find( checked, function( item ) {
                                return entry.origin === item;
                            } );
                        return Boolean( found );
                    } );
                } ).extend( { rateLimit: 0 } );
            },
            /**
             * If set, a column filter change will do an {{#crossLink "KoTableColumnCheckbox/uncheckAll:method"}}{{/crossLink}}
             * @attribute uncheckOnFilterChange
             * @type {Boolean}
             * @default true
             */
            uncheckOnFilterChange: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * If set, a reload will do an {{#crossLink "KoTableColumnCheckbox/uncheckAll:method"}}{{/crossLink}}
             * @attribute uncheckOnReload
             * @type {Boolean}
             * @default true
             */
            uncheckOnReload: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * If set, a paging will do an {{#crossLink "KoTableColumnCheckbox/uncheckAll:method"}}{{/crossLink}}
             * @attribute uncheckOnPaging
             * @type {Boolean}
             * @default false
             */
            uncheckOnPaging: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Choose how to identify a model by either 'hash', 'property' or a function
             *
             * - when set to 'hash' a hash will be build from the data
             * - when set to 'property' the value of the property defined by {{#crossLink "KoTableColumnCheckbox/propertyToCheckBy:property"}}{{/crossLink}} will be used
             * - when set with a function, the function receives the model and should return an unique identifier string
             *
             * @attribute identifyModelBy
             * @type {String}
             * @default 'hash'
             */
            identifyModelBy: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'hash' ) );
            },
            /**
             * Update checked models with newest data when available
             * @attribute updateCheckedFromCurrentData
             * @type {Boolean}
             * @default false
             */
            updateCheckedFromCurrentData: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * @attribute handleColumnOnCellClick
             * @type {Boolean}
             * @default false
             * @for KoTableColumnCheckbox
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
             * @for KoTableColumnCheckbox
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
             * @for KoTableColumnCheckbox
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
             * @for KoTableColumnCheckbox
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
             * @for KoTableColumnCheckbox
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
             * @for KoTableColumnCheckbox
             */
            handleTableOnRowContextMenu: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            }
        }
    } );
    /**
     * @property KoTableColumnCheckbox
     * @type {KoTableColumnCheckbox}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableColumnCheckbox );
    /**
     * @class KoTableColumnCheckbox
     * @constructor
     * @extends KoTableColumn
     * @param {Object} config a configuration object
     */
    function KoTablePicturePreviewColumn() {
        KoTablePicturePreviewColumn.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTablePicturePreviewColumn,
        extends: KoTableColumn,
        descriptors: {
            componentType: 'KoTablePicturePreviewColumn',
            /**
             * The width of a column (specified in colgroup tag)
             * @property width
             * @type {String}
             * @default '32px'
             */
            width: 'auto',
            minWidth: '100px',
            /**
             * @property isUtility
             * @type {Boolean}
             * @default true
             * @for KoTablePicturePreviewColumn
             */
            isUtility: true,
            /**
             * @property isExcludedInCsv
             * @type {Boolean}
             * @default true
             * @for KoTablePicturePreviewColumn
             */
            isExcludedInCsv: true,
            init: function() {
                var self = this;
                KoTableColumn.superclass.init.apply( self, arguments );
                self.onFilterContextMenu = NOOP;
                self.pictureViewers = {};
            },
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
                    };

                if( $context.$parent === KoTable.CONST.EMPTY_ROW ) {
                    return data;
                }

                self.pictureViewers[data.row[self.propertyToCheckBy]] = data.pictureViewer = self.pictureViewers[data.row[self.propertyToCheckBy]] || KoComponentManager.createComponent( {
                    componentType: 'KoPictureViewer',
                    componentConfig: {
                        name: 'documentsearch-modal-KoPictureViewer',
                        borderRadius: '5px',
                        containerClass: 'col-xs-12 dc-carousel-picture-viewer-container',
                        controlSizeClass: 'dc-carousel-control-sm',
                        sourceComparator: self.sourceComparator,
                        onSourceChange: self.onSourceChange
                    }
                } );
                if( typeof self.propertyToSource === 'function' ) {
                    data.pictureViewer.setSource( self.propertyToSource( data ) );
                }
                return data;
            },
            getPictureViewerById: function( id ) {
                var
                    self = this;
                return self.pictureViewers[id];
            },
            /**
             * The property name in the model to use with property based checking.
             * @property propertyToCheckBy
             * @type {String}
             * @default '_id'
             */
            propertyToCheckBy: '_id'
        },
        lazy: {
            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTablePicturePreviewCell' ) );
            },
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTablePicturePreviewColumn' ) );
            },
            /**
             * Class isn't sortable!
             * @attribute isSortable
             * @for KoTablePicturePreviewColumn
             * @private
             */
            /**
             * Class isn't sortable!
             * @property isSortable
             * @for KoTablePicturePreviewColumn
             */
            isSortable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't filterable!
             * @attribute isFilterable
             * @for KoTablePicturePreviewColumn
             * @private
             */
            /**
             * Class isn't filterable!
             * @property isFilterable
             * @for KoTablePicturePreviewColumn
             */
            isFilterable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't editable!
             * @attribute isEditable
             * @for KoTablePicturePreviewColumn
             * @private
             */
            /**
             * Class isn't editable!
             * @property isEditable
             * @for KoTablePicturePreviewColumn
             */
            isEditable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't draggable!
             * @attribute isDraggable
             * @for KoTablePicturePreviewColumn
             * @private
             */
            /**
             * Class isn't draggable!
             * @property isDraggable
             * @for KoTablePicturePreviewColumn
             */
            isDraggable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't droppable!
             * @attribute isDroppable
             * @for KoTablePicturePreviewColumn
             * @private
             */
            /**
             * Class isn't droppable!
             * @property isDroppable
             * @for KoTablePicturePreviewColumn
             */
            isDroppable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            }
        }
    } );
    /**
     * @property KoTablePicturePreviewColumn
     * @type {KoTablePicturePreviewColumn}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTablePicturePreviewColumn );

    function KoTablePreviewColumn() {
        KoTablePreviewColumn.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTablePreviewColumn,
        extends: KoTableColumn,
        descriptors: {
            componentType: 'KoTablePreviewColumn',

            init: function() {
                var self = this;
                KoTablePreviewColumn.superclass.init.apply( self, arguments );
                self.iconTitle = ko.observable("");
                self.isTitleLoaded = false;
                self.cash = new WeakMap();
            },
            /**
             * Cash loaded title
             */
            cashTitle: false,
            count:  function( meta ) {
                var self = this;
                return self.iconCount ? self.iconCount( meta ) : "";
            },
            iconClass: "",
            /**
             * Invoke promise to get data for title
             * @returns {Function}
             */
            initTitle: function( ) {
                var self = this;
                return function( data ) {
                    if( self.cashTitle && self.cash.get( data ) ) {
                        self.iconTitle(  self.cash.get( data ) );
                    } else {
                        self.iconTitle( "" );
                        self.getIconTitlePromise( data ).done( function( result ) {
                            if( self.cashTitle ) {
                                self.cash.set( data, result );
                            }
                            self.iconTitle( result );
                        } );
                    }
                };
            },
            /**
             * returns true/false to show/hide icon
             * @param meta
             * @returns {*}
             */
            displayIcon: function( meta ) {
                var self = this;
                return self.hasIcon ? self.hasIcon( meta ) : false;
            },
            /**
             * Action on icon clik
             * @param meta
             * @returns {*}
             */
            iconClick: function( ) {
                var self = this;
                return self.onIconClick || function( /*data, $event */ ) {

                };
            }


        },
        lazy: {
            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTablePreviewCell' ) );
            },
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTablePreviewColumn' ) );
            }
        }
    } );
    /**
     * @property KoTablePreviewColumn
     * @type {KoTablePreviewColumn}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTablePreviewColumn );

    /**
     * @class KoTableColumnLinked
     * @constructor
     * @extends KoTableColumn
     * @param {Object} config a configuration object
     */
    function KoTableColumnLinked() {
        KoTableColumnLinked.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTableColumnLinked,
        extends: KoTableColumn,
        descriptors: {
            componentType: 'KoTableColumnLinked',
            /**
             * The width of a column (specified in colgroup tag)
             * @property width
             * @type {String}
             * @default '32px'
             */
            width: '32px',
            /**
             * The property name in the model to use with with toggleLinkOfRow.
             * @property propertyOfLink
             * @type {String}
             * @default '_id'
             */
            propertyOfLink: '_id',
            /**
             * @property isUtility
             * @type {Boolean}
             * @default true
             * @for KoTableColumnLinked
             */
            isUtility: true,
            /**
             * @property isExcludedInCsv
             * @type {Boolean}
             * @default true
             * @for KoTableColumnLinked
             */
            isExcludedInCsv: true,
            /**
             * @protected
             */
            init: function() {
                var self = this;
                KoTableColumnLinked.superclass.init.apply( self, arguments );

                self.toggleLinkOfRow = Y.bind( self.toggleLinkOfRow, self );
                self.isCheckBoxDisabled = Y.bind( self.isCheckBoxDisabled, self );
                self.prodCheckboxes = ko.observable( '' );
            },
            /**
             * Test if a link is linked.
             * @method isLinked
             * @param {*} link
             * @return {boolean}
             */
            isLinked: function( link ) {
                var self = this,
                    linked = unwrap( self.linked );

                return linked.indexOf( link ) > -1;
            },

            // an observable which can be changed to trigger re-evaluation of checkbox toggle states
            prodCheckboxes: null,

            /**
             * Test if a row is linked.
             * @method isRowLinked
             * @param {Object} meta
             * @return {boolean}
             */
            isRowLinked: function( meta ) {
                var
                    self = this,
                    prod = self.prodCheckboxes(),
                    model = meta.row ? meta.row : meta;

                if( !model || !model[self.propertyOfLink] ) {
                    Y.log( 'Not able to check if row is linked, prod is: ' + prod, 'warn', NAME );
                    return false;
                }

                return self.isLinked( model[self.propertyOfLink] );
            },
            /**
             * Template method for linking a row.
             * @method toggleLinkOfRow
             * @param {Object} meta
             * @param {jQuery.Event} $event
             * @return {boolean}
             */
            toggleLinkOfRow: function( meta/*, $event*/ ) {
                var
                    self = this,
                    model = meta.row,
                    isRowLinked, link;

                if( model === KoTable.CONST.EMPTY_ROW ) {
                    return true;
                }

                link = model[self.propertyOfLink];

                var temp;
                if( Y.Lang.isFunction( self.toggleLinkOfRowHook ) ) {
                    temp = self.toggleLinkOfRowHook( link, model );
                    return temp;
                }

                isRowLinked = self.isLinked( link );

                if( isRowLinked ) {
                    self.removeLink( link );
                } else {
                    self.addLink( link );
                }
                return true;
            },
            /**
             * Adds a link to the linked items.
             * @method addLink
             * @param {*} link
             */
            addLink: function( link ) {
                var
                    self = this;

                if( !self.isLinked( link ) ) {
                    self.linked.push( link );
                }
            },
            /**
             * Adds an array of links.
             * @method addLinks
             * @param {Array} items
             */
            addLinks: function( items ) {
                items = peek( items ) || [];
                var
                    self = this;

                items.forEach( self.addLink, self );
            },
            /**
             * Removes a link from the linked items.
             * @method removeLink
             * @param link
             */
            removeLink: function( link ) {
                var
                    self = this;

                self.linked.remove( link );
            },
            /**
             * Removes some links from the linked items or all links if omitted
             * @method removeLinks
             * @param {Array|ko.observableArray} [items] if omitted removes all links
             */
            removeLinks: function( items ) {
                var
                    self = this;

                if( items ) {
                    // in case we receive a reference
                    [].concat( peek( items ) ).forEach( self.removeLink, self );
                } else {
                    self.linked.removeAll();
                }
            },
            /**
             * Handles the header label click for this column.
             * @method clickLabelHandler
             * @for KoTableColumnLinked
             * @param {KoTableColumn} model
             * @param {Event} event
             */
            clickLabelHandler: function() {
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
             * Meant to overwrite - do additional computing to determine how toggling a checkbox is handled - when a function is provided.
             *
             * function receives link and data and should return boolean to prevent event handling (true = default, false = prevent).
             * It also has to take care of adding or removing the link.
             * @property isCheckBoxDisabled
             * @type {null|Function}
             */
            toggleLinkOfRowHook: null,
            /**
             * Provided by caller, handle linking of multiple rows
             */
            toggleSelectAllHook: null,
            toggleDeselectAllHook: null,
            /**
             * Provided by caller, handle PDF export for insight reports
             */
            pdfExportHook: null,
            /**
             * Provided by caller, handle PDF save as Ext. Dokument for labdata tables
             */
            pdfSaveHook: null
        },
        lazy: {
            /**
             * The linked items
             * @attribute linked
             * @type {ko.observableArray}
             */
            linked: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observableArray() );
            },
            /**
             * @protected
             */
            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableCellLinked' ) );
            },
            /**
             * Class isn't sortable!
             * @attribute isSortable
             * @for KoTableColumnLinked
             * @private
             */
            /**
             * Class isn't sortable!
             * @property isSortable
             * @for KoTableColumnLinked
             */
            isSortable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't filterable!
             * @attribute isFilterable
             * @for KoTableColumnLinked
             * @private
             */
            /**
             * Class isn't filterable!
             * @property isFilterable
             * @for KoTableColumnLinked
             */
            isFilterable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't editable!
             * @attribute isEditable
             * @for KoTableColumnLinked
             * @private
             */
            /**
             * Class isn't editable!
             * @property isEditable
             * @for KoTableColumnLinked
             */
            isEditable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't draggable!
             * @attribute isDraggable
             * @for KoTableColumnLinked
             * @private
             */
            /**
             * Class isn't draggable!
             * @property isDraggable
             * @for KoTableColumnLinked
             */
            isDraggable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't droppable!
             * @attribute isDroppable
             * @for KoTableColumnLinked
             * @private
             */
            /**
             * Class isn't droppable!
             * @property isDroppable
             * @for KoTableColumnLinked
             */
            isDroppable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Determines if the all toggled checkbox is checked.
             * - If it is checked at least one row is checked, unchecking will uncheck every row in the current view.
             * - If it is unchecked, checking will check every row in the current view.
             * @property allToggled
             * @type {Boolean}
             * @default false
             */
            allLinked: function() {
                var
                    self = this;

                return ko.computed( {
                    read: function() {
                        self.linked(); // subscribe to reflect changes ----
                        var
                            modelsAvailable,
                            modelsChecked;

                        modelsAvailable = Y.Array.filter( unwrap( self.owner.rows ), function( model ) {
                            return model !== KoTable.CONST.EMPTY_ROW;
                        } );

                        // nothing to do … exiting
                        if( !modelsAvailable.length ) {
                            return;
                        }

                        modelsChecked = Y.Array.filter( unwrap( self.owner.rows ), function( model ) {
                            //return self.isLinked( model );
                            return self.isLinked( model ) || self.isRowLinked( model );
                        } );

                        // at least one model checked returns true
                        return Boolean( modelsChecked.length );

                    },
                    write: function( toggleValue ) {

                        var
                            modelsAvailable = Y.Array.filter( unwrap( self.owner.rows ), function( model ) {
                                return model !== KoTable.CONST.EMPTY_ROW;
                            } );

                        // handle current view models
                        if( toggleValue ) {
                            if( self.toggleSelectAllHook ) {
                                self.toggleSelectAllHook( modelsAvailable );
                            }
                        } else {
                            if( self.toggleDeselectAllHook ) {
                                self.toggleDeselectAllHook( modelsAvailable );
                            }
                        }
                    }
                }, self ).extend( { rateLimit: 0 } );
            },
            /**
             * Configure the toggle all checkbox in the header to be visible to the user.
             * @attribute allToggleVisible
             * @type {Boolean}
             * @param key {String}
             * @default true
             */
            allToggleVisible: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * @protected
             */
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableColumnLinked' ) );
            },
            /**
             * @attribute handleColumnOnCellClick
             * @type {Boolean}
             * @default false
             * @for KoTableColumnLinked
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
             * @for KoTableColumnLinked
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
             * @for KoTableColumnLinked
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
             * @for KoTableColumnLinked
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
             * @for KoTableColumnLinked
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
             * @for KoTableColumnLinked
             */
            handleTableOnRowContextMenu: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            }
        }
    } );
    /**
     * @property KoTableColumnLinked
     * @type {KoTableColumnLinked}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableColumnLinked );

    /**
     * @class KoTableColumnDrag
     * @constructor
     * @extends KoTableColumn
     * @param {Object} config a configuration object
     */
    function KoTableColumnDrag() {
        KoTableColumnDrag.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTableColumnDrag,
        extends: KoTableColumn,
        descriptors: {
            componentType: 'KoTableColumnDrag',
            /**
             * The width of a column (specified in colgroup tag)
             * @property width
             * @type {String}
             * @default '25px'
             * @for KoTableColumnDrag
             */
            width: '25px',
            /**
             * @property isUtility
             * @type {Boolean}
             * @default true
             * @for KoTableColumnDrag
             */
            isUtility: true,
            /**
             * @property isExcludedInCsv
             * @type {Boolean}
             * @default true
             * @for KoTableColumnDrag
             */
            isExcludedInCsv: true,
            /**
             * @protected
             */
            init: function() {
                var
                    self = this;

                KoTableColumnDrag.superclass.init.apply( self, arguments );

            }
        },
        lazy: {
            /**
             * @protected
             */
            templateNameCell: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableCellDrag' ) );
            },
            /**
             * Class isn't sortable!
             * @attribute isSortable
             * @for KoTableColumnDrag
             * @private
             */
            /**
             * Class isn't sortable!
             * @property isSortable
             * @for KoTableColumnDrag
             */
            isSortable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't filterable!
             * @attribute isFilterable
             * @for KoTableColumnDrag
             * @private
             */
            /**
             * Class isn't filterable!
             * @property isFilterable
             * @for KoTableColumnDrag
             */
            isFilterable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't editable!
             * @attribute isEditable
             * @for KoTableColumnDrag
             * @private
             */
            /**
             * Class isn't editable!
             * @property isEditable
             * @for KoTableColumnDrag
             */
            isEditable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't draggable!
             * @attribute isDraggable
             * @for KoTableColumnDrag
             * @private
             */
            /**
             * Class isn't draggable!
             * @property isDraggable
             * @for KoTableColumnDrag
             */
            isDraggable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * Class isn't droppable!
             * @attribute isDroppable
             * @for KoTableColumnDrag
             * @private
             */
            /**
             * Class isn't droppable!
             * @property isDroppable
             * @for KoTableColumnDrag
             */
            isDroppable: function() {
                return ko.computed( {
                    read: FALSE,
                    write: NOOP
                } );
            },
            /**
             * @protected
             */
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableColumnDrag' ) );
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
             * @for KoTableColumnDrag
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
             * @for KoTableColumnDrag
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
             * @for KoTableColumnDrag
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
             * @for KoTableColumnDrag
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
             * @for KoTableColumnDrag
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
             * @for KoTableColumnDrag
             */
            handleTableOnRowContextMenu: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            }
        }
    } );
    /**
     * @property KoTableColumnDrag
     * @type {KoTableColumnDrag}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableColumnDrag );

    /**
     * @class KoTableUsageConfiguration
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoTableUsageConfiguration() {
        KoTableUsageConfiguration.superclass.constructor.apply( this, arguments );
    }

    // TODO: [MOJ-2841] disable actions while pending
    makeClass( {
        constructor: KoTableUsageConfiguration,
        extends: KoComponent,
        descriptors: {
            componentType: 'KoTableUsageConfiguration',
            /**
             * @protected
             */
            init: function() {
                var
                    self = this;

                KoTableUsageConfiguration.superclass.init.apply( self, arguments );

                self.addDisposable( ko.computed( self._usageValuesComputed, self ).extend( { rateLimit: 0 } ) );

            },
            /**
             * Computed for setting the usage values based on entries configuration.
             * @method _usageValuesComputed
             * @protected
             */
            _usageValuesComputed: function() {
                var
                    self = this,
                    owner = self.owner,
                    data = unwrap( owner.usageConfigurationData ),
                    value = unwrap( owner.usageConfigurationValue ),
                    usage = Y.Array.find( data, function( option ) {
                        return value === option.name;
                    } );

                ignoreDependencies( function() { // ignore subscriptions inside (clearSorters uses methods that unwrap)

                    owner.resetColumnsPositionIndex(); // reset the positionIndex for any case
                    owner.resetFilters(); // reset the filters for any case

                    // handle selection
                    if( usage ) {

                        // handle filters
                        if( 'filters' in usage ) {

                            // set columns filter value
                            usage.filters.forEach( function( filterCfg ) {
                                var
                                    column = owner.getColumnByPropertyName( filterCfg.forPropertyName );

                                if( column && peek( column.isFilterable ) && column.filterField ) {
                                    column.filterField.value( filterCfg.value );
                                }

                                if ( column && filterCfg.textSearchType && column.filterField && column.filterField.textSearchType ) {
                                    column.filterField.textSearchType( filterCfg.textSearchType );
                                }

                                if ( column && peek( column.canInvertFilter ) && column.filterField && column.filterField.isFilterInverted ) {
                                    column.filterField.isFilterInverted( filterCfg.isFilterInverted || false );
                                }

                            } );

                        }

                        // handle sorters
                        if( 'sorters' in usage ) {

                            owner.clearSorters(); // additionally clear the sorters as they wil be filled by the config

                            // set column directions
                            usage.sorters.forEach( function( config ) {
                                var
                                    column = owner.getColumnByPropertyName( config.forPropertyName );

                                if( column && peek( column.isSortable ) ) {
                                    column.direction( config.direction );
                                }

                            } );

                            // apply the sorting state to sorters (reverse the order, because the last added gets first)
                            [].concat( usage.sorters ).reverse().forEach( function( config ) {
                                var
                                    column = owner.getColumnByPropertyName( config.forPropertyName );

                                if( column && peek( column.isSortable ) ) {
                                    column.addToSorters();
                                }

                            } );

                        }

                        // handle positionIndex
                        if( 'columnPosition' in usage ) {

                            if( usage.columnPosition.length ) {
                                owner._userHasDraggedColumnAtLeastOnce( true );
                            }

                            // set each column positionIndex
                            usage.columnPosition.forEach( function( config ) {
                                var
                                    column = owner.getColumnByPropertyName( config.forPropertyName );

                                if( column ) {
                                    column.positionIndex( config.positionIndex );
                                }

                            } );

                            // prevent disposing while moving
                            owner._disposeColumnsDisabled();
                            // sort them
                            owner.columns( owner.positionIndexSorted() );
                            // enable disposing again
                            owner._disposeColumnsEnabled();
                            // update each positionIndex
                            owner.positionIndexUpdate();
                        }

                    }
                    // handle unset selection
                    else {

                        owner.resetSorters();

                    }

                } );

            },
            /** @protected */
            addEntryHandler: function() {
                var
                    self = this;

                self.showUsageConfig( {
                    addNewEntry: true
                } );
            },
            /**
             * Returns an usage configuration object for the current table state
             * @returns {{filters: *, sorters: *, columnPosition: *}}
             * @protected
             */
            getCurrentUsageForSaving: function() {
                var
                    self = this,
                    owner = self.owner,
                    columns = peek( owner.columns ),
                    filterColumns = Y.Array.filter( columns, function( column ) {
                        return peek( column.isFilterable );
                    } ),
                    // filter config values
                    filters = filterColumns.map( function( column ) {
                        var
                            value = peek( column.filterField.value ),
                            columnConfig = {
                                forPropertyName: peek( column.forPropertyName ),
                                value: Y.Lang.isUndefined( value ) ? '' : value
                            };

                        if ( peek ( column.canInvertFilter ) && peek( column.isFilterInverted ) ) {
                            columnConfig.isFilterInverted = true;
                        }

                        if ( peek( column.canChangeTextSearch ) ) {
                            columnConfig.textSearchType = peek( column.textSearchType );
                        }

                        return columnConfig;

                    } ),
                    // sorter config values
                    sorters = peek( owner.sorters ).map( function( column ) {
                        var
                            forPropertyName = peek( column.forPropertyName ),
                            direction = peek( column.direction );

                        return {
                            forPropertyName: forPropertyName,
                            direction: direction
                        };
                    } ),
                    // columnPosition config values
                    columnPosition;

                // need to update positionIndex, because may be prevented until now
                owner._userHasDraggedColumnAtLeastOnce( true );
                // update each positionIndex
                owner.positionIndexUpdate();
                // build columnPosition config values
                columnPosition = peek( owner.columns ).map( function( column ) {
                    var
                        forPropertyName = peek( column.forPropertyName ),
                        positionIndex = peek( column.positionIndex );

                    return {
                        forPropertyName: forPropertyName,
                        positionIndex: positionIndex
                    };
                } );

                return {
                    filters: filters,
                    sorters: sorters,
                    columnPosition: columnPosition // these have to be added and can't be ignored when unset, because they have to may reset others
                };
            },
            /** @protected */
            usageShortcutsVisibleSwitcherClickHandler: function() {
                var
                    self = this;

                self.owner.usageShortcutsVisibleSwitcherClickHandler.apply( self.owner, arguments );
            },
            /**
             * @method showUsageConfig
             * @param {object} [parameters]
             * @param {boolean} [parameters.addNewEntry=false]
             */
            showUsageConfig: function( parameters ) {

                parameters = parameters || {};

                var
                    self = this,
                    addNewEntry = parameters.addNewEntry || false,
                    owner = self.owner,
                    usageConfigurationEntries = [].concat( peek( owner.usageShortcutsData ) ).filter( filterStaticConfigEntries ),
                    usageConfigurationItems,
                    bodyContentNode,
                    applyBindings,
                    aDCWindow,
                    saveDisableComputed,
                    ddDelegate, drag;

                usageConfigurationEntries.sort( function( a, b ) {
                    return a.shortcutIndex > b.shortcutIndex;
                } );

                usageConfigurationItems = ko.observableArray( usageConfigurationEntries.map( function( entry, index ) {
                    return UsageConfigurationViewModel.createFromUsageConfiguration( entry, index );
                } ) );

                if( addNewEntry ) {
                    usageConfigurationItems.push( UsageConfigurationViewModel.createFromUsageConfiguration( self.getCurrentUsageForSaving(), peek( usageConfigurationItems ).length ) );
                }

                aDCWindow = new Y.doccirrus.DCWindow( {
                    id: 'DCWindow-KoTableUsageConfigurationDialog',
                    bodyContent: '<div data-bind="template: { name: \'KoTableUsageConfigurationDialog\' }"></div>',
                    title: self.i18n( 'KoUI.KoTableUsageConfiguration.showUsageConfig.window.title' ),
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
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                isDefault: true,
                                action: function( e ) {
                                    e.target.button.disable();
                                    this.close();
                                    var
                                        usageConfigurationItemsJS = ko.toJS( usageConfigurationItems ),
                                        entryName,
                                        usage = [];

                                    Y.each( usageConfigurationItemsJS, function( usageConfigurationItemJS, index ) {
                                        var
                                            item = usageConfigurationItemJS._reference,
                                            prevName = item.name;

                                        usage.push( item );

                                        item.name = usageConfigurationItemJS.name;
                                        item.shortcutDescription = usageConfigurationItemJS.shortcutDescription;
                                        item.shortcutIndex = index;
                                        item.shortcutVisible = usageConfigurationItemJS.shortcutVisible;

                                        if( !prevName ) {
                                            entryName = usageConfigurationItemJS.name;
                                        }
                                    } );

                                    owner.saveUserConfiguration( usage, 'usage' ).done( function() {
                                        if( addNewEntry && entryName ) {
                                            self.entryList.value( entryName );
                                        }
                                    } );

                                }
                            } )
                        ]
                    },
                    after: {
                        visibleChange: function( yEvent ) {
                            if( !yEvent.newVal ) {
                                ddDelegate.destroy();
                                saveDisableComputed.dispose();
                                ko.cleanNode( bodyContentNode );
                            }
                        }
                    }
                } );

                bodyContentNode = aDCWindow.get( 'bodyContent' ).getDOMNodes()[0];

                applyBindings = {
                    i18n: self.i18n,
                    usageConfigurationItems: usageConfigurationItems,
                    remove: function( entry ) {
                        usageConfigurationItems.remove( entry );
                    },
                    visible: ko.observable( false ),
                    hasFocus: function( entry ) {
                        if( unwrap( applyBindings.visible ) && !peek( entry.name ) ) {
                            return true;
                        }
                        return false;
                    },
                    hasErrorName: function( value ) {
                        var
                            items = unwrap( usageConfigurationItems ),
                            name = unwrap( value ),
                            itemsWithName = items.filter( function( item ) {
                                return name === unwrap( item.name );
                            } );

                        return itemsWithName.length > 1 || !name;
                    }
                };

                saveDisableComputed = ko.computed( function() {
                    var
                        saveButton = aDCWindow.getButton( 'SAVE' ),
                        items = unwrap( usageConfigurationItems ),
                        names = items.map( function( item ) {
                            return unwrap( item.name );
                        } ),
                        noNameDupes = Y.Array.dedupe( names ).length === items.length,
                        noNameEmpty = names.every( function( name ) {
                            return Boolean( name );
                        } );

                    saveButton.button.disable();

                    if( noNameDupes && noNameEmpty ) {
                        saveButton.button.enable();
                    }

                } );

                ko.applyBindings( applyBindings, bodyContentNode );

                ddDelegate = new Y.DD.Delegate( {
                    container: bodyContentNode,
                    nodes: 'tr',
                    target: true, // items should also be a drop target
                    dragConfig: {}
                } );
                drag = ddDelegate.dd;

                drag.addHandle( '.KoTableUsageConfigurationDialog-dragHandle' );

                // drag constrained
                drag.plug( Y.Plugin.DDConstrained, {
                    constrain2node: bodyContentNode.querySelector( '.KoTableUsageConfigurationDialog' ),
                    stickY: true
                } );

                drag.plug( Y.Plugin.DDNodeScroll, {
                    horizontal: false,
                    buffer: 50,
                    node: bodyContentNode.parentNode
                } );

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
                        dialog = node.ancestor( '.KoTableUsageConfigurationDialog' ),
                        gridClone = dialog.one( 'table.table' ).cloneNode( true ),
                        dialogAttrs = dialog.getAttrs( ['clientWidth'] ),
                        colWidths = dialog.all( 'table.table thead th' ).getComputedStyle( 'width' ),
                        dragNode = Y.Node.create( '<div></div>' );

                    // sync column widths
                    nodeClone.all( 'td' ).getDOMNodes().forEach( function( element, index ) {
                        element.style.width = colWidths[index];
                    } );

                    // clean table clone
                    gridClone.one( 'thead' ).remove();
                    gridClone.one( 'tbody' ).empty();
                    gridClone.one( 'tbody' ).appendChild( nodeClone );
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
                        width: dialogAttrs.clientWidth + 'px'
                    } );
                    dragNode.appendChild( gridClone );

                    // handle drag node
                    //dragNode.addClass( 'KoTable-drag-proxy' );
                    dragNode.setStyles( {
                        position: 'absolute',
                        height: node.get( 'offsetHeight' ) + 'px',
                        width: dialogAttrs.clientWidth + 'px'
                    } );

                    dialog.appendChild( dragNode );
                    host.set( 'dragNode', dragNode );
                    return dragNode;
                };

                ddDelegate.on( {
                    'drag:start': function( yEvent ) {
                        var
                            node = yEvent.target.get( 'node' ),
                            dragNode = yEvent.target.get( 'dragNode' );

                        // ensure all values applied when a field still has focus
                        Y.Array.invoke( bodyContentNode.querySelectorAll( 'input' ), 'blur' );

                        node.setStyle( 'opacity', 0.25 );
                        dragNode.setStyle( 'opacity', 0.65 );

                    },
                    'drag:end': function( yEvent ) {
                        var
                            node = yEvent.target.get( 'node' );

                        node.setStyle( 'opacity', 1 );

                        drag.con.set( 'constrain2node', bodyContentNode.querySelector( '.KoTableUsageConfigurationDialog' ) );
                        ddDelegate.syncTargets();

                    },
                    'drag:drophit': function( yEvent ) {
                        var
                            dropNode = yEvent.drop.get( 'node' ),
                            dragNode = yEvent.drag.get( 'node' ),
                            dragData = ko.dataFor( dragNode.getDOMNode() ),
                            dropData = ko.dataFor( dropNode.getDOMNode() ),
                            data = peek( usageConfigurationItems ),
                            //dragIndex = data.indexOf( dragData ),
                            dropIndex = data.indexOf( dropData );

                        usageConfigurationItems.remove( dragData );
                        usageConfigurationItems.splice( dropIndex, 0, dragData );

                    }
                } );

                aDCWindow.show();

                applyBindings.visible( true );

            },
            entryEditHandler: function() {
                var
                    self = this;

                self.showUsageConfig();
            }
        },
        lazy: {
            /** @protected */
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableUsageConfiguration' ) );
            },
            /**
             * Computes sorted options for {{#crossLink "KoTableUsageConfiguration/entryList:property"}}{{/crossLink}}.
             * Entries are based on owner {{#crossLink "KoTable/usageConfigurationData:property"}}{{/crossLink}}
             * @property entryListOptions
             * @protected
             */
            entryListOptions: function() {
                var
                    self = this;

                return ko.computed( function() {
                    var
                        usageConfigurationData = unwrap( self.owner.usageConfigurationData ),
                        entryList = [].concat( usageConfigurationData );

                    entryList.sort( function( a, b ) {
                        return a.name.toLowerCase() > b.name.toLowerCase();
                    } );

                    return entryList;

                }, self );
            },
            /**
             * @property entryList
             * @type {KoFieldSelect2}
             */
            entryList: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {
                    name: 'KoTableUsageConfigurationEntryList',
                    optionsText: 'name',
                    optionsValue: 'name',
                    options: self.entryListOptions,
                    placeholder: self.i18n( 'KoUI.KoTableUsageConfiguration.KoTableUsageConfigurationEntryList.placeholder' ),
                    size: 'SMALL',
                    visible: true,
                    disabled: ko.computed( function() {
                        return KoTable.CONST.userConfigurationPending.NONE !== unwrap( self.owner.userConfigurationPending );
                    } ),
                    title: ko.computed( function() {

                        var value = unwrap( self.entryList.value );

                        if( !value ) {

                            return self.i18n( 'KoUI.KoTableUsageConfiguration.KoTableUsageConfigurationEntryList.title' );
                        }
                        else {

                            return Y.Lang.sub( self.i18n( 'KoUI.KoTableUsageConfiguration.KoTableUsageConfigurationEntryList.titleValue' ), { name: Y.Escape.html( value ) } );
                        }

                    }, self, { deferEvaluation: true } ),
                    value: self.owner.usageConfigurationValue,
                    updateOnOptionsChanged: true,
                    select2Config: {
                        multiple: false,
                        width: 130
                    }
                }, 'KoFieldSelect2' );
            },
            /**
             * @property entryAdd
             * @type {KoButton}
             */
            entryAdd: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {
                    name: 'KoTableUsageConfigurationEntryAdd',
                    icon: 'PLUS',
                    title: self.i18n( 'KoUI.KoTableUsageConfiguration.KoTableUsageConfigurationEntryAdd.title' ),
                    size: 'SMALL',
                    click: Y.bind( self.addEntryHandler, self ),
                    disabled: ko.computed( function() {
                        return KoTable.CONST.userConfigurationPending.NONE !== unwrap( self.owner.userConfigurationPending );
                    } )
                }, 'KoButton' );
            },
            /**
             * @property entryEdit
             * @type {KoButton}
             */
            entryEdit: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {
                    name: 'KoTableUsageConfigurationEntryEdit',
                    icon: 'PENCIL',
                    title: self.i18n( 'KoUI.KoTableUsageConfiguration.KoTableUsageConfigurationEntryEdit.title' ),
                    size: 'SMALL',
                    click: Y.bind( self.entryEditHandler, self ),
                    disabled: ko.computed( function() {
                        var
                            pendingState = unwrap( self.owner.userConfigurationPending ),
                            usageConfigurationData = unwrap( self.owner.usageConfigurationData );

                        if( KoTable.CONST.userConfigurationPending.NONE !== pendingState ) {
                            return true;
                        }

                        if( !usageConfigurationData.length ) {
                            return true;
                        }

                        return false;
                    } )
                }, 'KoButton' );
            }
        }
    } );
    /**
     * @property KoTableUsageConfiguration
     * @type {KoTableUsageConfiguration}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTableUsageConfiguration );

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
     * Compute provided column widths by spreading hidden column widths to the visible columns
     * @method computeColumnWidthsBySpreadHidden
     * @param {Array} columns
     * @private
     */
    function computeColumnWidthsBySpreadHidden( columns ) {
        var
            colsCompute = [],
            colsHidden = [],
            currentTotal = 0,
            hiddenWidthTotal = 0,
            eachAdd = 0;

        columns.forEach( function( column ) {
            if( !peek( column.visible ) ) {
                colsHidden.push( column );
            } else if( 0 !== percentageWidthToFloat( column.width ) ) {
                colsCompute.push( column );
            }
        } );

        hiddenWidthTotal = utilsMath.sum( colsHidden.map( function( column ) {
            return percentageWidthToFloat( column.width );
        } ) );

        eachAdd = utilsMath.round( hiddenWidthTotal / colsCompute.length, -2 );

        colsCompute.forEach( function( column, index ) {
            var
                width = percentageWidthToFloat( column.width ) + eachAdd;

            if( colsCompute.length === index + 1 ) {
                width = utilsMath.round( 100 - currentTotal, -2 );
            }
            column.widthComputed( String( width ) + '%' );
            currentTotal += width;
        } );

    }

    /**
     * Compute provided column widths by keeping the initial width ratio
     * @method computeColumnWidthsByInitialRatio
     * @param {Array} columns
     * @param {Boolean} scrollable
     * @private
     */
    function computeColumnWidthsByInitialRatio( columns, scrollable ) {
        var
            colsCompute = [],
            colsHidden = [],
            currentTotal = 0,
            colsComputeTotal = 0,
            widthRatio = 0;

        columns.forEach( function( column ) {
            if( !peek( column.visible ) ) {
                colsHidden.push( column );
            } else if( 0 !== percentageWidthToFloat( column.width ) ) {
                colsCompute.push( column );
            }
        } );

        if (scrollable) {
            colsCompute.forEach( function( column ) {
                column.widthComputed( column.minWidth );
            });
        } else {
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
    }

    /**
     * Configures handling of a specific column.
     * @class ExportCsvConfigurationColumnObject
     */
    /**
     * This property is mandatory and is needed to identify and handle that column.
     * @for ExportCsvConfigurationColumnObject
     * @property forPropertyName
     * @type {String}
     */
    /**
     * Explicitly don't handle this column in the CSV export.
     * This option can only consume 'false' as a value - setting to 'true' won't have an effect.
     * @for ExportCsvConfigurationColumnObject
     * @property visible
     * @type {Boolean}
     */
    /**
     * Explicitly use this label as column header.
     * @for ExportCsvConfigurationColumnObject
     * @property label
     * @type {String}
     */
    /**
     * Explicitly use this renderer to generate the data field.
     * @for ExportCsvConfigurationColumnObject
     * @method renderer
     * @param {Object} meta meta as provided to the original renderer
     * @param {String|*} resultOrigRenderer the rendering result from the original renderer
     * @return {String|*}
     */

    /**
     * Configures the CSV export.
     * @class ExportCsvConfigurationObject
     */
    /**
     * Configure how to handle handle some columns specifically.
     * @for ExportCsvConfigurationObject
     * @property columns
     * @type {ExportCsvConfigurationColumnObject[]}
     * @default []
     */

    /**
     * __Provides a reusable data table component interface.__
     *
     * - Wraps most of [bootstrap Tables](http://getbootstrap.com/css/#tables)
     * like
     * [Striped rows](http://getbootstrap.com/css/#tables-striped)({{#crossLink "KoTable/striped:attribute"}}striped{{/crossLink}}),
     * [Bordered table](http://getbootstrap.com/css/#tables-bordered)({{#crossLink "KoTable/bordered:attribute"}}bordered{{/crossLink}}),
     * [Condensed table](http://getbootstrap.com/css/#tables-condensed)({{#crossLink "KoTable/condensed:attribute"}}condensed{{/crossLink}}),
     * [Responsive tables](http://getbootstrap.com/css/#tables-responsive)({{#crossLink "KoTable/responsive:attribute"}}responsive{{/crossLink}}).
     * - Can work with {{#crossLink "KoTable/remote:attribute"}}local or remote{{/crossLink}} {{#crossLink "KoTable/data:attribute"}}{{/crossLink}}.
     * - Provides paging, sorting and filtering of {{#crossLink "KoTable/remote:attribute"}}local or remote{{/crossLink}} {{#crossLink "KoTable/data:attribute"}}{{/crossLink}}.
     * - Can persist states in various ways:
     *   - Via localStorage for [states](/classes/KoTable.html#attr_states) - check {{#crossLink "KoTable/statesAvailable:property"}}{{/crossLink}}
     *   - Via DB for KoTable configuration - check {{#crossLink "KoTable/userConfiguration:property"}}{{/crossLink}}
     *
     * ##### KoTable configuration migration
     * When changing column configurations, between inSuite version changes, a migration may get necessary under those circumstances:
     * - a "stateId" changes
     * - a column was added, removed
     * - a column "forPropertyName"-property was changed
     * - a column index was changed
     * - a column "isFilterable"-property was changed (e.g. column was filterable, but now isn't anymore)
     * - a column filter "value"-property was changed (e.g. using another Filter)
     * - a column filter possible value has changed (e.g. changed or removed list entries to pick from)
     * - a column "isSortable"-property was changed (e.g. column was sortable, but now isn't anymore)
     *
     * - see {{#crossLink "KoTable/userConfiguration:property"}}{{/crossLink}} for an example how the configuration is build
     *
     * __Click handling__
     *
     * KoTable supports several ways to handle clicks:
     * - a cell on column level: {{#crossLink "KoTableColumn/onCellClick:method"}}{{/crossLink}}, {{#crossLink "KoTableColumn/onCellContextMenu:method"}}{{/crossLink}}
     * - a cell on table level: {{#crossLink "KoTable/onCellClick:method"}}{{/crossLink}}, {{#crossLink "KoTable/onCellContextMenu:method"}}{{/crossLink}}
     * - a row on table level: {{#crossLink "KoTable/onRowClick:method"}}{{/crossLink}}, {{#crossLink "KoTable/onRowContextMenu:method"}}{{/crossLink}}
     *
     * _Be aware that events will bubble through these possibilities if not stopped._
     * - for a cell click this is: event occured at cell level - calls columns "onCellClick", after that calls tables "onCellClick", after that calls tables "onRowClick" and finally tries to select a row.
     * - for a cell contextmenu this is: event occured at cell level - calls columns "onCellContextMenu", after that calls tables "onCellContextMenu" and after that calls tables "onRowContextMenu".
     *
     * _To stop bubbling up this hierarchy your function can stop that by either returning false or stop the event propagation._
     *
     * @class KoTable
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoTable() {
        KoTable.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoTable,
        extends: KoComponent,
        static: {
            /**
             * Constants for KoTable.
             * @property CONST
             * @static
             * @final
             * @type {object}
             * @for KoTable
             */
            CONST: {
                EMPTY_ROW: {},
                ABORTED: new Error( 'Request Aborted' ),
                CLASS: {
                    ROW_IS_DRAGGABLE: CSS_KOTABLE_ROW_ISDRAGGABLE,
                    ROW_IS_DROPPABLE: CSS_KOTABLE_ROW_ISDROPPABLE
                },
                userConfigurationPending: {
                    NONE: {},
                    READ: {},
                    SAVE: {}
                },
                REMOTE_PARAM: {
                    QUERY: 'query',
                    SORT: 'sort',
                    PAGE: 'page',
                    LIMIT: 'itemsPerPage',
                    COLLATION: 'collation'
                },
                PARAM_CHANGE: {
                    SORTER: 'SORTER',
                    FILTER: 'FILTER',
                    PAGING: 'PAGING',
                    LIMIT: 'LIMIT'
                },
                COUNT_LIMIT: 2001,//As per MOJ-7373
                proxyYUIDataTableLoadingDone: function proxyYUIDataTableLoadingDone( response ) {
                    var self = this;
                    self.loading( false );
                    var
                        data = response.data.Results;
                    self.totalItems( response.data.count );
                    self.data( data );
                }
            }
        },
        descriptors: {
            componentType: 'KoTable',
            /**
             * The base params when requesting data from server via {{#crossLink "KoTable/proxy:property"}}{{/crossLink}}.
             * The value can be a plain object and/or a complex structure of observables. Changes to the observables then will automatically do a request on the proxy with these changes.
             *
             * Be aware not to interfere with properties defined by table for paging, sorting and filtering.
             *
             * - paging is handled by the properties "page" and "itemsPerPage"
             * - sorting is handled by the "sort" property, which will be an object with columns forPropertyName currently sorted by
             * - filtering is handled by the "query" property, which will be an object with columns forPropertyName currently filtered by
             *
             * __It is possible to have own "sort" and "query" properties inside "baseParams", but the defined content properties shouldn't collide with forPropertyName of columns__
             *
             * @property baseParams
             * @type {null|Object|ko.observable}
             * @example
             // … ,
             remote: true,
             proxy: Y.doccirrus.jsonrpc.api.patient.read,
             baseParams: {
                 sort: {__v: 1},
                 query: {__v: ko.observable( 0 )},
                 serviceSpecialTreatment: ko.computed( function() {
                     return true;
                 } )
             }
             */
            baseParams: null,
            /**
             * The columns configuration array
             * @property columns
             * @type {Array}
             * @example
             KoComponentManager.createComponent( {
                 componentType: 'KoTable',
                 componentConfig: {
                     columns: [
                         {
                             forPropertyName: 'value',
                             label: 'value',
                             title: 'something more descriptive',
                             isSortable: true,
                             isFilterable: true
                         }
                     ]
                 }
             } )
             */
            columns: null,
            /**
             * The selected row data items
             * @property selected
             * @type {Array}
             */
            selected: null,
            /**
             * Limits the amount of sorters. A limit of zero will include all possible sorters.
             * @property sortersLimit
             * @type Number
             * @default 1
             */
            sortersLimit: 1,
            /**
             * if unset defaults to KoTableHeader default name
             * @property templateNameHeader
             * @type {KoTableHeader}
             * @default null
             * @protected
             */
            templateNameHeader: null,
            /**
             * Defines the property name to use with {{#crossLink "KoTable/dataMap:attribute"}}{{/crossLink}}
             * @property dataMapPropertyName
             * @type {String}
             * @default '_id'
             */
            dataMapPropertyName: '_id',
            /**
             * Filename of CSV export
             * @property csvFilename
             * @type {String}
             * @default csv-export
             */
            csvFilename: 'csv-export',
            /**
             * The event  configuration array, array item struct
             * @property eventsToSubscribe
             * @type {Array}
             * @param array[index].event : required, event name;
             * @param array[index].handlerId: required, event hanlder Id
             * @param array[index].done: not required, default action: reload()
             * @example
             KoComponentManager.createComponent( {
                 componentType: 'KoTable',
                 componentConfig: {
                         eventsToSubscribe: [{
                            event: 'stockOrdersAction',
                            handlerId: 'cartTableHandlerId',
                            done: function() { noop() }
                        },{
                            event: 'someEvent',
                            handlerId: 'someEventId'
                        }],
                 }
             } )
             */
            eventsToSubscribe: null,
            /**
             * Display extra row for more filter options
             * @property showFilterConfig
             */
            showFilterConfig: null,
            /**
             * @method init
             * @protected
             * @for KoTable
             */
            init: function() {
                var
                    self = this;

                KoTable.superclass.init.apply( self, arguments );

                if( jQuery.ajax === this.proxy ) {
                    Y.log( '$.ajax as proxy is not supported', 'error', NAME );
                }

                var
                    leftAligned = [],
                    rightAligned = [];

                self.filterIconTitleI18n = i18n('KoUI.KoTableColumnTools.filterIconTitle');

                self.getTemplateNameRow = Y.bind( self.getTemplateNameRow, self );
                self.getTemplateNameSummaryRow = Y.bind( self.getTemplateNameSummaryRow, self );
                self.onBodyClick = Y.bind( self.onBodyClick, self );
                self.onBodyContextMenu = Y.bind( self.onBodyContextMenu, self );
                self.selectRow = Y.bind( self.selectRow, self );
                self.usageShortcutsClickHandler = Y.bind( self.usageShortcutsClickHandler, self );

                self.callProxyDebounced = debounceProxy( self._callProxy );

                //  TODO: store in lcoalStorage / profile
                self.showFilterConfig = ko.observable( false );

                self.fixedTableLayout = ko.observable( true );

                self.rowsRendered = ko.observable( {
                    headerRows: {},
                    rows: {}
                } );

                self.initColumns();
                self.initSelecting();
                self.initRemote();
                self._initScrollToTopOfTableWhenPaging();
                self.subscribeEvents();
                self.addEventListeners();

                var checkBoxColumn = self.getComponentColumnCheckbox();

                leftAligned.push( self.paging );
                if( checkBoxColumn ) {
                    self.counterChecked = KoComponentManager.createComponent( {
                        title: self.i18n( 'KoUI.KoTable.checked' ),
                        icon: 'OUTDENT',
                        count: ko.computed( function() {
                            var checked = unwrap( checkBoxColumn.checked );
                            return checked.length;
                        } )
                    }, 'KoCounter' );
                    leftAligned.push( self.counterChecked );
                }

                self.counterSelected = KoComponentManager.createComponent( {
                    title: self.i18n( 'KoUI.KoTable.selected' ),
                    icon: 'INDENT',
                    count: ko.computed( function() {
                        var selected = unwrap( self.selected );
                        return selected.length;
                    } ),
                    visible: ko.computed( function() {
                        return 'none' !== unwrap( self.selectMode );
                    } )
                }, 'KoCounter' );
                leftAligned.push( self.counterSelected );

                if( peek( self.usageConfigurationVisible ) ) {

                    leftAligned.push( KoComponentManager.createComponent( {}, 'KoToolbarSeparator' ) );
                    leftAligned.push( self.usageConfiguration );

                }

                rightAligned.push( self.toolsAction );

                self.selectLimit = KoComponentManager.createComponent( {
                    name: 'KoTable-selectLimit',
                    title: self.i18n( 'KoUI.KoTable.limit' ),
                    icon: 'LIST_ALT',
                    options: self.limitList,
                    size: 'SMALL',
                    value: self.limit,
                    valueType: 'number'
                }, 'KoFieldSelect' );
                rightAligned.push( self.selectLimit );

                self.counterTotal = KoComponentManager.createComponent( {
                    title: self.i18n( 'KoUI.KoTable.total' ),
                    icon: 'DATABASE',
                    count: ko.computed(function() {
                        var totalRecordsCount = self.totalItems();

                        if(!self.ignoreCountLimit && totalRecordsCount === KoTable.CONST.COUNT_LIMIT) {
                            return ( totalRecordsCount - 1 )+"+";
                        } else {
                            return totalRecordsCount;
                        }
                    })
                }, 'KoCounter' );
                rightAligned.push( self.counterTotal );

                self.footer.leftAligned.items( leftAligned );
                self.footer.rightAligned.items( rightAligned );

                /**
                 * Everytime the cell styles have to be re-computed
                 * waits for 300 miliseconds
                 * and combine multiple changes into a single update
                 */
                self.addDisposable( ko.computed( function () {
                    var
                        columns = peek( self.columns ),
                        rowsRendered = peek( self.rowsRendered );

                    unwrap( self.shouldComputeCellStyles );

                    /**
                     * Re-compute all columns computedStyles observable
                     * When updated it will notify all of its cells using
                     * this same observable
                     */
                    columns.forEach(function (column) {
                        var
                            styleObj = {
                                background: '',
                                width: '',
                                height: '',
                                left: '',
                                animation: ''
                            },
                            widthComputed = peek( column.widthComputed ),
                            ownerTable = self,
                            isFixed = peek( column.isFixed ),
                            isVisible = peek( column.visible );

                        unwrap( ownerTable.shouldComputeCellStyles );

                        if ( isFixed && isVisible) { // For fixed and visible columns
                            styleObj.width = widthComputed;
                            styleObj.background = FIXED_COLUMN_BACKGROUND_COLOR;

                        } else if ( isVisible && peek( ownerTable.haveColumnsAtLeastOneFixed ) ) { // For regular columns that are visible and if the table has at least one fixed column
                            styleObj.minWidth = widthComputed;
                        }

                        column.computedStyles( styleObj );
                    });

                    function getNewFixedCellStyles (currentRowLeftAccumulator, rowOuterHeight) {
                        return {
                            left: currentRowLeftAccumulator + 'px', // needed as fixed columns are position: absolute, and need to place the cell after the previous fixed cell
                            height: rowOuterHeight + 'px', // needed as fixed columns are position: absolute, So the height of the fixed cell is the same as the parent row
                            animation: FIXED_COLUMN_ANIMATION // Animation will change opacity from 0 to 1 so the use does not see the UI moving oddly but just appearing
                        };
                    }

                    /**
                     * For each fixed and visible cells of the header rows
                     */
                    _.forEach(rowsRendered.headerRows, function ($row) {
                        var
                            $fixedCells = $row.find('.KoTableFixedCell'),
                            currentRowLeftAccumulator = 0;

                        $fixedCells.each(function (index, element) {
                           var $fixedCell = $( element );

                           if ( $fixedCell.is(':visible') ) {
                               $fixedCell.css(getNewFixedCellStyles(currentRowLeftAccumulator, $row.outerHeight() ) );

                               currentRowLeftAccumulator =  ( currentRowLeftAccumulator += parseInt( $fixedCell.outerWidth(), 10 ) );
                           }
                        });
                    });

                    /**
                     * For each fixed and visible cells of the regular rows
                     */
                    _.forEach(rowsRendered.rows, function ($row) {
                        var
                            $fixedCells = $row.find('.KoTableFixedCell'),
                            currentRowLeftAccumulator = 0;

                        $fixedCells.each(function (index, element) {
                            var $fixedCell = $( element );

                            if ( $fixedCell.is(':visible') ) {
                                $fixedCell.css(getNewFixedCellStyles(currentRowLeftAccumulator, $row.outerHeight() ) );

                                currentRowLeftAccumulator =  ( currentRowLeftAccumulator += parseInt( $fixedCell.outerWidth(), 10 ) );
                            }
                        });
                    });

                } ).extend( { rateLimit: { timeout: 300, method: "notifyWhenChangesStop" } } )  );
            },
            /**
             * clean all active multi filters click handler
             * @method onMultiFilterIconClick
             */
            onMultiFilterIconClick: function() {
                var
                    self = this;
                ( self.usageShortcuts() || [] ).forEach( function( item ) {
                    if( item && item.active() ) {
                        item.active( false );
                    }
                });
                self.multiFiltersConfiguration( [] );
                self.usageConfigurationValue( undefined );
            },
            /**
             * Add DOM listeners
             * @method addEventListeners
             */
            addEventListeners: function () {
                $( window ).off('resize.' + this.stateId ).on('resize.' + this.stateId, _.debounce(function () {
                    var
                        currentForceCounter;

                    // When there are columns fixed it should re compute their styles if the window is resized
                    if ( this.haveColumnsAtLeastOneFixed && this.haveColumnsAtLeastOneFixed() ) {
                        currentForceCounter = this.forceComputedStylesUpdate();
                        this.forceComputedStylesUpdate( currentForceCounter + 1 );
                    }

                }.bind(this), 100));
            },
            /**
             * Everytime a row is rendered it will include its jQuery element to the rendered rows list
             * Which will then be used to get its height and assign it to all of its fixed cells
             * @method rowRendered
             * @param $element
             */
            rowRendered: function ( $element ) {
                var
                    table = this,
                    $row = $( $element ),
                    rowIndex = $row.index(),
                    isHeaderRow = $row.hasClass('KoTableHeader-row'),
                    rowType = isHeaderRow ? 'headerRows' : 'rows',
                    rowsRendered = peek( table.rowsRendered );

                rowsRendered[rowType][rowIndex] = $row;

                table.rowsRendered( rowsRendered );
            },
            toggleFixNonDynamicColumns: function(fixColumns) {
                var columns = peek( this.columns );

                columns.forEach(function (column) {
                    if ( !column.forPropertyName.startsWith('_dynamic_') ) {
                        column.isFixed(fixColumns);
                    }
                });
            },
            /**
             * publishes events
             * @method initEvents
             * @for KoTable
             * @protected
             */
            initEvents: function() {
                var
                    self = this;

                KoTable.superclass.initEvents.apply( self, arguments );

                /**
                 * @event KoTable:draggedColumns
                 * @type {CustomEvent}
                 * @param {EventFacade} event An Event Facade object
                 * @param {Object} data provided data
                 * @param {Object} data.dragData dragged data
                 * @param {Object} data.dropData dropped on data
                 * @param {Object} data.dragIndex dragged from index
                 * @param {Object} data.dropIndex dropped to index
                 */
                self.events.publish( 'KoTable:draggedRows', {
                    preventable: false
                } );

                /**
                 * @event KoTable:exportCsvStart
                 * @type {CustomEvent}
                 * @param {EventFacade} event An Event Facade object
                 * @param {Object} data provided data
                 */
                self.events.publish( 'KoTable:exportCsvStart', {
                    preventable: false
                } );

                /**
                 * @event KoTable:exportCsvEnd
                 * @type {CustomEvent}
                 * @param {EventFacade} event An Event Facade object
                 * @param {Object} data provided data
                 */
                self.events.publish( 'KoTable:exportCsvEnd', {
                    preventable: false
                } );

            },
            /**
             * disposes any internal subscriptions
             * @method disposeSubscriptions
             * @for KoTable
             */
            disposeSubscriptions: function KoTable_disposeSubscriptions() {
                var
                    self = this,
                    $element = peek( self.element );

                if( $element ) {
                    $element.off( 'mousemove.KoTable' );
                    $element.off( 'scroll.KoTable' );
                    $element.off( 'mouseenter.KoTable' );
                    $element.off( 'mouseleave.KoTable' );
                }

                Y.Array.invoke( peek( self.columns ), 'disposeSubscriptions' );

                KoTable.superclass.disposeSubscriptions.apply( self, arguments );

            },
            /**
             * Component destructor.
             * @method dispose
             * @for KoTable
             */
            dispose: function() {
                var
                    self = this,
                    ABORTED = KoTable.CONST.ABORTED,
                    loading = peek( self.loading );

                if( loading ) {
                    loading.reject( ABORTED );
                }
                self.destroyDraggableRows();
                self.destroyDraggableColumns();
                self.unsubscribeEvents();
                // clean positions on destroy
                self.currentRowPosition( {} );

                Y.Array.invoke( peek( self.columns ), 'dispose' );

                $( window ).off('resize.' + this.stateId );

                $(document).off("keyup." + this.stateId );

                self.element().off();

                KoTable.superclass.dispose.apply( self, arguments );
            },
            /**
             * If set the table will use the fixed table layout
             * @property fixedTableLayout
             * @type {Boolean}
             * @default true
             */
            fixedTableLayout: true,
            /**
             * Setting for how columns width will be computed.
             * - widthRatio: The columns will keep the initial width ratio
             * - spreadHidden: The hidden columns width will be spread to the visible columns
             * @property computeColumnWidthsBy
             * @type {String}
             * @default 'widthRatio'
             */
            computeColumnWidthsBy: 'widthRatio',
            /**
             * @method _afterRender
             * @protected
             */
            _afterRender: function( /*elements, model*/ ) {
                var self = this;
                KoTable.superclass._afterRender.apply( self, arguments );
                self.initRowPopover();
                self.initRowHover();
            },
            /**
             * Holds the Y.DD.Delegate instance for dragging columns
             * @property ddDelegateColumns
             * @type {null|Y.DD.Delegate}
             */
            ddDelegateColumns: null,
            /**
             * Initializes the Y.DD.Delegate instance for dragging columns
             * @method initDraggableColumns
             * @protected
             */
            initDraggableColumns: function() {
                var
                    self = this,
                    element = peek( self.element ),
                    koTableDom = element.get( 0 ),
                    ddDelegateColumns = self.ddDelegateColumns = new Y.DD.Delegate( {
                        container: koTableDom,
                        nodes: '.KoTableHeader-row-label .KoTableColumn-isDraggable',
                        target: true, // items should also be a drop target
                        dragConfig: {
                            groups: ['KoTable-ddDelegateColumns-' + self.componentId]
                        }
                    } ),
                    drag = ddDelegateColumns.dd;

                // drag proxy
                drag.plug( Y.Plugin.DDProxy, {
                    moveOnEnd: false,
                    cloneNode: true
                } );

                // drag constrained
                drag.plug( Y.Plugin.DDConstrained, {
                    constrain2node: koTableDom.querySelector( '.KoTableHeader-row-label' ),
                    stickX: true
                } );

                // drag scroll hScroll
                drag.plug( Y.Plugin.DDNodeScroll, {
                    node: koTableDom.querySelector( '.KoTable-hScroll' ),
                    vertical: false
                } );

                // drag scroll window
                drag.plug( Y.Plugin.DDWinScroll, {
                    vertical: false
                } );

                ddDelegateColumns.on( {
                    'drag:start': function( yEvent ) {
                        var
                            node = yEvent.target.get( 'node' ),
                            dragNode = yEvent.target.get( 'dragNode' );

                        node.setStyle( 'opacity', 0.25 );
                        dragNode.setStyle( 'opacity', 0.65 );

                    },
                    'drag:end': function( yEvent ) {
                        var
                            node = yEvent.target.get( 'node' );

                        node.setStyle( 'opacity', 1 );
                    },
                    'drag:drophit': function( yEvent ) {
                        var
                            dragColumn = ko.dataFor( yEvent.drag.get( 'node' ).getDOMNode() ),
                            dropColumn = ko.dataFor( yEvent.drop.get( 'node' ).getDOMNode() ),
                            dropIndex = peek( self.columns ).indexOf( dropColumn ),
                            isDroppable = peek( dropColumn && dropColumn.isDroppable );

                        if( isDroppable ) {

                            // prevent destroying of moved column while moving
                            dragColumn._preventDispose = true;
                            self.columns.remove( dragColumn );
                            self.columns.splice( dropIndex, 0, dragColumn );
                            dragColumn._preventDispose = false;

                            self._userHasDraggedColumnAtLeastOnce( true );
                            self.positionIndexUpdate();

                        }
                        else {
                            yEvent.preventDefault();
                        }

                    }
                } );

                // drop targets of a delegate have to be synced after changes
                ddDelegateColumns.columnsSyncTargetsSubscription = self.addDisposable( self.columns.subscribe( function() {
                    if( self.ddDelegateColumns ) {
                        self.ddDelegateColumns.syncTargets();
                    }
                } ) );

            },
            /**
             * Destroys the Y.DD.Delegate instance for dragging columns
             * @method destroyDraggableColumns
             * @protected
             */
            destroyDraggableColumns: function() {
                var
                    self = this;

                if( self.ddDelegateColumns ) {
                    self.removeDisposable( self.ddDelegateColumns.columnsSyncTargetsSubscription );
                    self.ddDelegateColumns.destroy();
                    self.ddDelegateColumns = null;
                }

            },
            /**
             * Destroys communicattion event subscriptions
             * @method unsubscribeEvents
             * @protected
             */
            unsubscribeEvents: function() {
              var
                  self = this,
                  eventsToUnSubscribe = unwrap(self.eventsToSubscribe);

                (eventsToUnSubscribe || []).forEach(function( event ) {
                    Y.doccirrus.communication.off(event.event, event.handlerId);
                } );
            },
            /**
             * Holds the Y.DD.Delegate instance for dragging rows
             * @property ddDelegateRows
             * @type {null|Y.DD.Delegate}
             */
            ddDelegateRows: null,
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
                            groups: ['KoTable-ddDelegateRows-' + self.componentId]
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
                        table = node.ancestor( '.KoTable' ),
                        proxyCursorClone = table.one( '.KoTable-drag-proxy-cursor' ).cloneNode( true ),
                        hScroll = table.one( '.KoTable-hScroll' ),
                        gridClone = table.one( '.KoTable-grid' ).cloneNode( true ),
                        scrollAttrs = hScroll.getAttrs( ['clientWidth', 'scrollLeft', 'scrollWidth'] ),
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
                            data = peek( self.data ),
                            dragIndex = data.indexOf( dragData ),
                            dropIndex = data.indexOf( dropData ),
                            isDroppable = dropNode.hasClass( CSS_KOTABLE_ROW_ISDROPPABLE );

                        if( isDroppable && drag.get( 'data.allowDragOnDrop' ) ) {

                            self.data.remove( dragData );
                            self.data.splice( dropIndex, 0, dragData );

                            self.events.fire( 'KoTable:draggedRows', {}, {
                                dragIndex: dragIndex,
                                dropIndex: dropIndex,
                                dragData: dragData,
                                dropData: dropData
                            } );

                        }
                        else {
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
                    unwrap( self.rows );
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
             * - Keep in mind that the rows are non observables, so it isn't possible to reevaluate them … such as data itself or context.index changed for updating class-names (TODO: MOJ-3935)
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
             * Retrieves a configured {{#crossLink "KoTableColumn"}}KoTableColumn{{/crossLink}} by property name.
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
             * If a KoTableColumnCheckbox is configured, method will give you that column.
             * @method getComponentColumnCheckbox
             * @return {null|KoTableColumnCheckbox}
             */
            getComponentColumnCheckbox: function() {
                var self = this;
                return Y.Array.find( peek( self.columns ), function( column ) {
                    return column instanceof KoTableColumnCheckbox;
                } );
            },
            /**
             * If a KoTableColumnLinked is configured, method will give you that column.
             * @method getComponentColumnLinked
             * @return {null|KoTableColumnLinked}
             */
            getComponentColumnLinked: function() {
                var self = this;
                return Y.Array.find( peek( self.columns ), function( column ) {
                    return column instanceof KoTableColumnLinked;
                } );
            },
            /**
             * If a KoTableColumnDrag is configured, method will give you that column.
             * @method getComponentColumnDrag
             * @return {null|KoTableColumnDrag}
             */
            getComponentColumnDrag: function() {
                var self = this;
                return Y.Array.find( peek( self.columns ), function( column ) {
                    return column instanceof KoTableColumnDrag;
                } );
            },
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
                    } ),
                    everyColumnHasStateId = Y.Array.every( columns, function( column ) {
                        return Boolean( peek( column.stateId ) );
                    } ),
                    positionIndexSorted,
                    idx = 0;

                if( !everyColumnHasForPropertyName || Y.Array.dedupe( columns.map( function( column ) {
                        return column.forPropertyName;
                    } ) ).length !== columns.length ) {
                    Y.log( 'every column need a unique forPropertyName!', 'error', NAME );
                }

                // stateId necessary for column stateId generation
                if( !everyColumnHasStateId && Y.Lang.isUndefined( stateId ) ) {
                    Y.log( 'table stateId is undefined!', 'error', NAME );
                }

                Y.each( columns, function( column ) {
                    if( !column.owner ) {
                        column.owner = self; // TODO: see owner tasks
                    }
                    // set column stateId
                    if( !peek( column.stateId ) ) {
                        column.stateId = stateId + '-column-' + column.forPropertyName;
                    }
                    // set default position index
                    column.defaultPositionIndex = idx;
                    idx = idx + 1;
                } );

                self.columns = ko.observableArray( columns ).extend( { makeKoComponent: { componentType: 'KoTableColumn' } } );

                // sort columns by persisted positionIndex
                positionIndexSorted = self.positionIndexSorted();
                // set initial state for reset later
                self.positionIndexColumnsInitialState( positionIndexSorted );
                // prevent disposing while moving
                self._disposeColumnsDisabled();
                // apply sorted columns
                self.columns( positionIndexSorted );
                // enable disposing again
                self._disposeColumnsEnabled();
                // update each positionIndex
                self.positionIndexUpdate();

                self.initComputeColumnWidths();

            },
            /**
             * Prevent disposing columns while interacting with them, e.g. sorting, removing
             * @method _disposeColumnsDisabled
             * @protected
             */
            _disposeColumnsDisabled: function() {
                var
                    self = this,
                    columns = peek( self.columns );

                Y.each( columns, function( column ) {
                    column._preventDispose = true;
                } );
            },
            /**
             * Enable disposing columns again after interacting with them, e.g. sorting, removing
             * @method _disposeColumnsDisabled
             * @protected
             */
            _disposeColumnsEnabled: function() {
                var
                    self = this,
                    columns = peek( self.columns );

                Y.each( columns, function( column ) {
                    column._preventDispose = false;
                } );
            },
            /**
             * Creates an Array of columns sorted by positionIndex or initial index if is null
             * @method positionIndexSorted
             * @return {Array}
             * @protected
             */
            positionIndexSorted: function() {
                var
                    self = this,
                    columns = peek( self.columns ),
                    positionIndexSorted = Y.Array.filter( columns, function( column ) {
                        return null !== peek( column.positionIndex );
                    } );

                // sort them
                positionIndexSorted.sort( function( a, b ) {
                    return peek( a.positionIndex ) - peek( b.positionIndex );
                } );

                // add unknown columns at their defined index
                columns.forEach( function( column, index ) {
                    if( null === peek( column.positionIndex ) ) {
                        positionIndexSorted.splice( index, 0, column );
                    }
                } );

                return positionIndexSorted;
            },
            /**
             * Updates each column positionIndex with the current columns index (if allowed to)
             * @method positionIndexUpdate
             */
            positionIndexUpdate: function() {
                var
                    self = this,
                    menuCss;

                if( !peek( self._userHasDraggedColumnAtLeastOnce ) ) { // no updates
                    return;
                }

                Y.each( peek( self.columns ), function( column, index ) {
                    column.positionIndex( index );

                    //  set which way the context menu opens (to the left for col 0, otherwise to the right), EXTMOJ-1794
                    if ( column.filterOptionsMenu && column.filterOptionsMenu.menu ) {
                        menuCss = column.filterOptionsMenu.menu.css() || {};
                        if ( 0 === index ) {
                            menuCss['pull-left'] = true;
                            menuCss['pull-right'] = false;
                        } else {
                            menuCss['pull-left'] = false;
                            menuCss['pull-right'] = true;
                        }
                        column.filterOptionsMenu.menu.css( menuCss );
                    }

                } );

            },
            /**
             * Initializes computed width handling of columns
             * @method initComputeColumnWidths
             * @protected
             */
            initComputeColumnWidths: function() {

                function filterColumnWidthAuto( column ) {
                    if( 'auto' === peek( column.width ) ) {
                        return true;
                    }
                    return false;
                }

                var
                    self = this,
                    columns = peek( self.columns ),
                    colsWidthAuto = Y.Array.filter( columns, filterColumnWidthAuto ),
                    sumWidthAuto, eachWidthAuto, checkSum;

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
                if( checkSum < 99.75 || checkSum >= 100.25 ) {
                    Y.log( 'Your columns percent width usages have to make up 100%', 'error', NAME );
                }

                // subscribe to computeColumnWidths dependencies
                self.addDisposable( ko.computed( function() {
                    unwrap( self.columns ).forEach( function( column ) {
                        unwrap( column.visible );
                    } );

                    unwrap( self._filteredData );

                    self.computeColumnWidths();
                } ).extend( { rateLimit: 0 } ) );
            },
            /**
             * Recompute columns width - based on {{#crossLink "KoTable/computeColumnWidthsBy:property"}}{{/crossLink}} and column is {{#crossLink "KoTableColumn/visible:attribute"}}{{/crossLink}}
             * @method computeColumnWidths
             * @protected
             */
            computeColumnWidths: function() {
                var
                    self = this,
                    columns = peek( self.columns ),
                    scrollable = peek( self.scrollable );

                switch( self.computeColumnWidthsBy ) {
                    case 'spreadHidden':
                        return computeColumnWidthsBySpreadHidden( columns );
                    default:
                        return computeColumnWidthsByInitialRatio( columns, scrollable );
                }

            },
            /**
             * @method initRowHover
             * @protected
             */
            initRowHover: function() {
                var self = this,
                    $element,
                    $rows,
                    $data,
                    $masked,
                    $loading,
                    $page,
                    currentRow,
                    currentChild,
                    moveWithKeyboard = unwrap( self.moveWithKeyboard ),
                    selectWithNavigate = unwrap( self.selectWithNavigate ),
                    selectOnHover = unwrap( self.selectOnHover ),
                    cellForClick = unwrap( self.cellForClick ),
                    filteredData,
                    lastParams;
                /** @private */

                function initMovableData() {
                    var currentPosition,
                        localPosition = unwrap( self.currentRowPosition );
                    if( moveWithKeyboard ) {
                        $(document).off("keyup." + self.stateId )
                                    .on("keyup." + self.stateId, function( e ) {
                            var originator = e.keyCode || e.which;

                            if( $( e.target ).is( "body" ) || $('#documentsearch_modal').is(':visible') ) {
                                if( typeof self.onKeyUp === 'function' ) {
                                    self.onKeyUp( {keyCode: originator, currentRow: currentRow} );
                                }
                                switch( originator ) {
                                    case 13:
                                        // enter
                                        if( currentRow[0].children[cellForClick] ) {
                                            currentRow[0].children[cellForClick].click();
                                        }
                                        break;
                                    case 34:
                                        // page down
                                        if (self.paging) {
                                            localPosition["page-" + unwrap( self.paging.page )] = currentChild;
                                            self.currentRowPosition( localPosition );
                                            $element.find( ".KoTable-bottom button[name='KoPaging-doPrevPage']" ).trigger( "click" );
                                        }
                                        break;
                                    case 38:
                                        // top arrow
                                        if( currentRow && currentRow.prev( 'tr' ).length ) {
                                            currentRow.removeClass( 'KoTable-isSelected-row' );
                                            currentRow = currentRow.prev( 'tr' );
                                            currentRow.addClass( 'KoTable-isSelected-row' );
                                            currentChild--;

                                            if ( selectWithNavigate && currentRow[0].children[cellForClick] ) {
                                                currentRow[0].children[cellForClick].click();
                                            }
                                        }
                                        break;
                                    case 33:
                                        // page up
                                        if (self.paging) {
                                            localPosition["page-" + unwrap( self.paging.page )] = currentChild;
                                            self.currentRowPosition( localPosition );
                                            $element.find( ".KoTable-bottom button[name='KoPaging-doNextPage']" ).trigger( "click" );
                                        }
                                        break;
                                    case 40:
                                        // bottom arrow
                                        if( currentRow && currentRow.next( 'tr' ).length ) {
                                            currentRow.removeClass( 'KoTable-isSelected-row' );
                                            currentRow = currentRow.next( 'tr' );
                                            currentRow.addClass( 'KoTable-isSelected-row' );
                                            currentChild++;

                                            if ( selectWithNavigate && currentRow[0].children[cellForClick] ) {
                                                currentRow[0].children[cellForClick].click();
                                            }
                                        }
                                        break;
                                }

                                $element.find( '.KoTable-rows .KoTable-row' ).css("pointer-events", "none");
                            }
                        });
                        currentPosition = localPosition["page-" + unwrap( self.paging.page )] || 0;
                        currentRow = jQuery( $element ).find( '.KoTable-rows' )[0].children[currentPosition];
                        currentRow = jQuery( currentRow );
                        if( !currentRow ) {
                            currentRow = jQuery( $element ).find( '.KoTable-rows' )[0].children[0];
                        }

                        currentChild = currentPosition;

                        if ( selectWithNavigate && currentRow[0].children[cellForClick] ) {
                           setTimeout(function () {
                               currentRow[0].children[cellForClick].click();
                           }, 0);
                        }

                        currentRow.addClass( 'KoTable-isSelected-row' );
                    }
                }

                function onMouseMove() {
                    if( moveWithKeyboard ) {
                        $element.find( '.KoTable-rows .KoTable-row' ).css("pointer-events", "all");
                    }
                }

                function onRowMouseMove ( $event ) {
                    var
                        $row = $( $event.currentTarget );

                    if( moveWithKeyboard && selectOnHover && currentRow && ( $row.index() !== currentRow.index() ) ) {
                        $($event.target).closest('td').trigger('click');
                    }
                }

                function onMouseClick( $event ) {
                    if( moveWithKeyboard ) {
                        if ( currentRow ) {
                            currentRow.removeClass( 'KoTable-isSelected-row' );
                        }

                        currentRow = jQuery( $event.currentTarget );
                        currentRow.addClass( 'KoTable-isSelected-row' );
                        currentChild = currentRow.index();
                    }
                }

                function onCaseFolderChange() {
                    if( moveWithKeyboard && typeof self.currentRowPosition === "function") {
                        self.currentRowPosition( {} );
                    }
                }

                self.addDisposable( ko.computed( function() {
                    filteredData = unwrap( self._filteredData );
                    lastParams = unwrap( self._lastParams );
                    $element = unwrap( self.element );
                    $rows = unwrap( self.rows );
                    $data = unwrap( self.data );
                    $masked = unwrap( self.masked );
                    $page = unwrap( self.paging.page );
                    $loading = unwrap( self.loading );
                    if( $element && $page && $data.length && $rows.length && !$masked
                        && !$loading && self.rendered() && filteredData.length && lastParams ) {
                        initMovableData();
                    }
                } ).extend( { rateLimit: { timeout: 500, method: "notifyWhenChangesStop" } } ) );

                self.addDisposable( ko.computed( function() {
                    $element = self.element();
                    if( $element ) {
                        $element.off('click.KoTable').on( 'click.KoTable', '.KoTable-rows > .KoTable-row', onMouseClick );
                        $element.off('mousemove.KoTable', '.KoTable-rows > .KoTable-row').on( 'mousemove.KoTable', '.KoTable-rows > .KoTable-row', onRowMouseMove );
                        $element.on( 'mousemove.KoTable', onMouseMove );
                        // reset position on casefolder change
                        $( document ).on( 'click.activityCaseFoldersViewModeldiv', 'ul > li.KoNavItem', onCaseFolderChange );
                    }
                } ) );

                self.addDisposable( ko.computed( function() {
                    unwrap( self.sorters );
                    unwrap( self.filters );
                    self.currentRowPosition( {} );
                } ) );
            },
            /**
             * @method initRowPopover
             * @protected
             */
            // TODO: remove open popovers on row refresh / on table dispose
            initRowPopover: function() {
                // TODO: simple popOver for now (improved should work with ko observables and not destroying every time)
                // TODO: move out function creation
                var self = this,
                    rowPopover,
                    $element,
                    onRowPopover = self.onRowPopover,
                    userConfig = {
                        stylePopover: '',
                        styleTitle: '',
                        styleContent: '',
                        title: '',
                        content: ''
                    };

                /** @private */
                function createPopoverMarkup( data ) {
                    data = Y.mix( {
                        stylePopover: '',
                        styleTitle: '',
                        styleContent: '',
                        class: ''
                    }, data, true );

                    return Y.Lang.sub( [
                        '<div class="popover KoTable-popover {class}" role="tooltip" style="{stylePopover}">',
                        '<div class="arrow"></div>',
                        '<h3 class="popover-title" style="{styleTitle}"></h3>',
                        '<div class="popover-content" style="{styleContent}"></div>',
                        '</div>'
                    ].join( '' ), data );
                }

                /** @private */
                function updatePopoverPosition( $event ) {
                    var $popover = $element.data( 'bs.popover' );
                    if( $popover ) {
                        $popover.$tip.offset( { left: $event.pageX - ($popover.$tip.width() / 2) } );
                    }
                }

                /** @private */
                function onMouseEnter( $event ) {
                    var data = ko.dataFor( $event.currentTarget );
                    if( data === KoTable.CONST.EMPTY_ROW ) {
                        return true;
                    }
                    var $row = jQuery( $event.currentTarget ),
                        $popover = $element.data( 'bs.popover' );
                    if( !$popover ) {
                        $element.popover( {
                            animation: false,
                            html: true,
                            placement: 'auto bottom',
                            trigger: 'manual',
                            title: function() {
                                return userConfig.title;
                            },
                            content: function() {
                                return userConfig.content;
                            },
                            container: 'body'
                        } );
                        $popover = $element.data( 'bs.popover' );
                    }
                    $popover.$element = $row;

                    if( false === onRowPopover( userConfig, data ) ) {
                        $element.popover( 'hide' );
                    }
                    else {
                        $popover.options.template = createPopoverMarkup( userConfig );
                        $element.popover( 'show' );
                        updatePopoverPosition( $event );
                    }

                }

                /** @private */
                function onMouseLeave( $event ) {
                    var data = ko.dataFor( $event.currentTarget );
                    if( data === KoTable.CONST.EMPTY_ROW ) {
                        return true;
                    }
                    $element.popover( 'destroy' );
                    $element.data( 'bs.popover', null );
                }

                self.addDisposable( ko.computed( function() {
                    rowPopover = self.rowPopover();
                    $element = self.element();

                    if( $element ) {
                        if( rowPopover ) {
                            $element.on( 'mousemove.KoTable', '.KoTable-rows', updatePopoverPosition );
                            $element.on( 'scroll.KoTable', '.KoTable-scroll', updatePopoverPosition ); // TODO: check again
                            $element.on( 'mouseenter.KoTable', '.KoTable-rows > .KoTable-row', onMouseEnter );
                            $element.on( 'mouseleave.KoTable', '.KoTable-rows > .KoTable-row', onMouseLeave );
                        } else {
                            $element.off( 'mousemove.KoTable', '.KoTable-rows', updatePopoverPosition );
                            $element.off( 'scroll.KoTable', '.KoTable-scroll', updatePopoverPosition ); // TODO: check again
                            $element.off( 'mouseenter.KoTable', '.KoTable-rows > .KoTable-row', onMouseEnter );
                            $element.off( 'mouseleave.KoTable', '.KoTable-rows > .KoTable-row', onMouseLeave );
                        }
                    }
                } ) );
            },
            /** @private */
            _initScrollToTopOfTableWhenPaging: function() {
                var
                    self = this,
                    rowsSubscription;

                self.addDisposable( ko.computed( function() {
                    unwrap( self.paging.page );
                    var
                        remote = unwrap( self.remote ),
                        scrollToTopOfTableWhenPaging = unwrap( self.scrollToTopOfTableWhenPaging ),
                        lastParamChanges = unwrap( self.lastParamChanges ),
                        exportingCsv = self._exportCsv;

                    if( ko.computedContext.isInitial() || !scrollToTopOfTableWhenPaging ) {
                        return;
                    }

                    if( remote ) {
                        if( rowsSubscription ) {
                            self.removeDisposable( rowsSubscription );
                        }
                        if( lastParamChanges.indexOf( KoTable.CONST.PARAM_CHANGE.PAGING ) > -1 ) {
                            rowsSubscription = self.rows.subscribe( function() {
                                self.removeDisposable( rowsSubscription );
                                if( !exportingCsv ) {
                                    peek( self.elements )[0].scrollIntoView();
                                }
                            } );
                            self.addDisposable( rowsSubscription );
                        }
                    }
                    else {
                        if( !exportingCsv ) {
                            peek( self.elements )[0].scrollIntoView();
                        }
                    }

                } ).extend( {
                    rateLimit: 0
                } ) );

            },
            /**
             * A callback which will be available for each row, to dispatch the rows information to make up the content of the bootstrap popup.
             * This function is meant to be overwritten with your own implementation and can be activated with the configuration option "rowPopover"
             * @method onRowPopover
             * @param {Object} config
             * @param {String} config.stylePopover the style-attribute-content for the outer-most popover element
             * @param {String} config.styleTitle the style-attribute-content for the title element
             * @param {String} config.styleContent the style-attribute-content for the content element
             * @param {String} config.title the title of the popover
             * @param {String} config.content the content of the popover
             * @param {Object} data the information this row received
             * @see http://getbootstrap.com/javascript/#popovers
             * @return {void|false} return false to not show for that row
             */
            onRowPopover: function( config/*, data*/ ) {
                // have a look at config for further configurations
                // you should also care about previously set options
                config.title = 'some Title';
                config.content = 'some Content';
                return; // when returning false the popover won't show for that row
            },
            /**
             * @method initRemote
             * @protected
             */
            initRemote: function() {
                var
                    self = this;
                self.addDisposable( ko.computed( function() {
                    unwrap( self.remote );
                    var
                        options,
                        isInitial = ko.computedContext.isInitial(),
                        rendered = unwrap( self.rendered ),
                        autoLoad = unwrap( self.autoLoad ),
                        userConfigurationPending = ([
                                                        KoTable.CONST.userConfigurationPending.READ,
                                                        KoTable.CONST.userConfigurationPending.SAVE
                                                    ].indexOf( unwrap( self.userConfigurationPending ) ) > -1),
                        page = unwrap( self.paging.page ),
                        limit = unwrap( self.limit ),
                        filterParams = unwrap( self.filterParams ),
                        filters = peek( self.filters ),
                        sorters = unwrap( self.sorters ),
                        params = ko.toJS( self.baseParams ) || {},
                        query = params[KoTable.CONST.REMOTE_PARAM.QUERY] || {},
                        sort = unwrap( params[KoTable.CONST.REMOTE_PARAM.SORT] ) || {},
                        sortersToStore,
                        data = unwrap( self.usageConfigurationData ) || [],
                        filtersApplied = unwrap( self.multiFiltersConfiguration ) || [];

                    if( filtersApplied && 1 < filtersApplied.length ) {
                        filterParams = {};
                        data.forEach( function( dataItem ) {
                            var
                                usage = -1 !== filtersApplied.indexOf( dataItem.name );
                            if( usage ) {
                                ( dataItem && dataItem.filters || [] ).forEach( function( filter ) {
                                    var
                                        column,
                                        columnQuery,
                                        filterValue = filter.value,
                                        queryObj = {},
                                        forPropertyName,
                                        isValid = (
                                            (_.isString( filterValue ) && filterValue) ||
                                            (_.isArray( filterValue ) && filterValue.length) ||
                                            (_.isNumber( filterValue )) ||
                                            ( _.isBoolean( filterValue ) || (_.isObject( filterValue ) && filterValue.date1 && filterValue.date2) )
                                        );

                                    if( isValid ) {
                                        // if is valid then set to or query for multi search
                                        column = self.getColumnByPropertyName( filter.forPropertyName );
                                        columnQuery = column.getQueryFilterObject( filterValue );
                                        forPropertyName = filter.forPropertyName;
                                        queryObj[forPropertyName] = columnQuery;

                                        if( !filterParams[filter.forPropertyName] ) {
                                            filterParams[filter.forPropertyName] = {};
                                        }

                                        if( !filterParams[filter.forPropertyName].$or ) {
                                            filterParams[filter.forPropertyName] = { $or: [] };
                                        }

                                        filterParams[filter.forPropertyName].$or.push( queryObj );
                                    }
                                });
                            }
                        });
                    }

                    // kombine $or to $and to get or for different fields at same time
                    _.keys( filterParams ).forEach( function( key ) {
                        if( filterParams[key] && filterParams[key].$or && 1 < filterParams[key].$or.length ) {
                            if( !filterParams.$and ) {
                                filterParams.$and = [];
                            }

                            filterParams.$and.push( filterParams[key] );
                            // remove from query bcs added to and array
                            delete filterParams[key];
                        } else if( filterParams[key] && filterParams[key].$or && 1 === filterParams[key].$or.length ) {
                            // if only one $or item then $or not needed. change to classic query
                            filterParams[key] = filterParams[key].$or[0][key];
                        }
                    });

                    if( (peek( self.states) || []).indexOf( 'sort' ) !== -1 ) {
                        sortersToStore = (sorters || []).map( function( column ) {
                            var
                                forPropertyName = peek( column.forPropertyName ),
                                direction = peek( column.direction );

                            return {
                                forPropertyName: forPropertyName,
                                direction: direction
                            };
                        } );
                        self.setState( 'sorters', sortersToStore );
                    }

                    if( isInitial || userConfigurationPending ) {
                        return;
                    }

                    // make up sorting:
                    // clean the property names from sort, because no own property for sorters
                    sorters.forEach( function( column ) {
                        delete sort[column.forPropertyName];
                    } );
                    params[KoTable.CONST.REMOTE_PARAM.SORT] = sort;
                    sorters.forEach( function( column ) {
                        params[KoTable.CONST.REMOTE_PARAM.SORT][column.forPropertyName] = utilsArray.getDirection( unwrap( column.direction ) );

                        //Check if collation is present on just one of the column as it should be same if its present on other columns
                        if(column.collation && !params[KoTable.CONST.REMOTE_PARAM.COLLATION]) {
                            params[KoTable.CONST.REMOTE_PARAM.COLLATION] = column.collation;
                        }
                    } );

                    // make up filtering:
                    // clean the property names from query, because no own property for filters
                    filters.forEach( function( column ) {
                        delete query[column.filterPropertyName];
                    } );
                    // merge with query
                    query = Y.merge( query, filterParams );

                    // attach params:
                    params[KoTable.CONST.REMOTE_PARAM.QUERY] = query;
                    params[KoTable.CONST.REMOTE_PARAM.PAGE] = page;
                    params[KoTable.CONST.REMOTE_PARAM.LIMIT] = limit;

                    // make options
                    options = { params: params };

                    if( autoLoad && rendered ) {
                        self.loadData( options );
                    }

                }, self ).extend( { rateLimit: 0 } ) );

            },
            /**
             * @method subscribeEvents
             * @protected
             */
            subscribeEvents: function() {
                var
                    self = this,
                    eventsToSubscribe = unwrap(self.eventsToSubscribe);

                (eventsToSubscribe || []).forEach(function( event ) {
                    Y.doccirrus.communication.on( {
                        event: event.event,
                        done: (event.done || function( ) {
                            if (!peek( self.loading )) {
                                self.reload();
                            }
                        }),
                        handlerId: event.handlerId
                        });
                } );
            },
            /**
             * In case configured {{#crossLink "KoTable/remote:attribute"}}{{/crossLink}} a JsonRPC method that is aware on how to treat paging, sorting and filtering if needed and returns meta.totalItems and data (see {{#crossLink "KoTable/proxyLoadingDone:method"}}{{/crossLink}}).
             * @property proxy
             */
            proxy: null,
            /**
             * Method which when the proxy finishes loading should extract and set the appropriate properties for 'totalItems' and 'data'
             * @method proxyLoadingDone
             * @protected
             */
            proxyLoadingDone: function proxyLoadingDone( response ) {
                var
                    self = this,
                    meta = response.meta,
                    data = response.data;

                self.totalItems( meta.totalItems );
                self.extraMeta( meta.extra );
                self.data( data );
            },
            /**
             * Method which when the proxy fails loading parameters could be used to present some feedback
             * @method proxyLoadingFail
             * @protected
             */
            proxyLoadingFail: function proxyLoadingFail() {
            },
            /**
             * Checks provided params against {{#crossLink "KoTable/_lastParams:property"}} to determine which parts have changed
             * @see KoTable.CONST.PARAM_CHANGE for a list of possible values
             * @param {Object} params
             * @return {Array}
             * @protected
             */
            _getParamChanges: function( params ) {
                var
                    self = this,
                    changes = [],
                    monitors = [
                        KoTable.CONST.REMOTE_PARAM.SORT,
                        KoTable.CONST.REMOTE_PARAM.QUERY,
                        KoTable.CONST.REMOTE_PARAM.PAGE,
                        KoTable.CONST.REMOTE_PARAM.LIMIT
                    ],
                    lastParams = peek( self._lastParams ),
                    paramsKeys = Object.keys( params ),
                    lastParamsKeys = Object.keys( lastParams ),
                    allKeys = Y.Array.dedupe( [].concat( paramsKeys, lastParamsKeys ) ),
                    filterKeys = peek( self.filters ).map( function( column ) {
                        return column.forPropertyName;
                    } );

                allKeys.forEach( function( key ) {

                    if( monitors.indexOf( key ) === -1 ) {
                        return;
                    }

                    if( JSON.stringify( params[key] ) !== JSON.stringify( lastParams[key] ) ) {
                        switch( key ) {
                            case KoTable.CONST.REMOTE_PARAM.SORT:
                                changes.push( KoTable.CONST.PARAM_CHANGE.SORTER );
                                break;
                            case KoTable.CONST.REMOTE_PARAM.QUERY:
                                filterKeys.forEach( function( filterKey ) {
                                    if( JSON.stringify( getObject( [key, filterKey], false, params ) ) !== JSON.stringify( getObject( [key, filterKey], false, lastParams ) ) ) {
                                        changes.push( KoTable.CONST.PARAM_CHANGE.FILTER );
                                    }
                                } );
                                break;
                            case KoTable.CONST.REMOTE_PARAM.PAGE:
                                changes.push( KoTable.CONST.PARAM_CHANGE.PAGING );
                                break;
                            case KoTable.CONST.REMOTE_PARAM.LIMIT:
                                changes.push( KoTable.CONST.PARAM_CHANGE.LIMIT );
                                break;
                        }
                    }

                } );

                changes = Y.Array.dedupe( changes );

                return changes;
            },
            /**
             * @method loadData
             * @param {Object} [options]
             * @param {Object} [options.params]
             * @param {Function} [options.done]
             * @param {Function} [options.fail]
             * @param {Function} [options.always]
             * @protected
             */
            loadData: function( options ) {

                options = options || {};

                options.params = options.params || {};
                options.done = options.done || null;
                options.fail = options.fail || null;
                options.always = options.always || null;

                var
                    self = this,
                    ABORTED = KoTable.CONST.ABORTED,
                    loading = peek( self.loading );

                if( loading ) {
                    loading.reject( ABORTED );
                }

                // don't consider initial state as changes
                if( !Y.Object.isEmpty( peek( self._lastParams ) ) ) {
                    self.lastParamChanges( self._getParamChanges( options.params ) );
                }

                self._lastParams( options.params );

                // for local exit here, we needed param changes for things like "initAutoUncheck"
                if( !unwrap( self.remote ) ) {
                    return;
                }

                // MOJ-11879
                if( self.ignoreCountLimit) {
                    options.params.ignoreCountLimit = true;
                }

                self.masked( true );
                self.callProxyDebounced( options.params, {
                    done: options.done,
                    fail: options.fail,
                    always: options.always
                } );

            },
            /** @private */
            _callProxy: function( params ) {
                var
                    self = this,
                    ABORTED = KoTable.CONST.ABORTED,
                    loading;

                loading = self.proxy( params );
                self.loading( loading );

                loading
                    .always( function() {
                        if( self.loading ) {
                            self.loading( false );
                        }
                        if( self.masked ) {
                            self.masked( false );
                        }
                    } )
                    .done( self.proxyLoadingDone.bind( self ) )
                    .fail( function loadingFail( error ) {
                        if( ABORTED !== error ) {
                            Y.log( 'KoTable failed to load and bind data from the proxy:', 'error', NAME );
                            Y.log( error, 'error', NAME );
                        }
                    } )
                    .fail( self.proxyLoadingFail.bind( self ) );

                return loading;
            },
            /** @private */
            _exportCsv: false,
            /**
             * Reloads the proxy with the previous state if options omitted.
             *
             * - You can pass options.params, which will get merged into the previous params.
             *
             * Be careful using params which the table observables take care of, e.g.: page, limit, sorters, filters …
             *
             * Also won't provided params update the {{#crossLink "KoTable/baseParams:property"}}{{/crossLink}}, but they will get written into the last params used, which
             * then the reload will take again.
             *
             * - You can pass options.done, which is used as "done" to {{#crossLinkModule "JsonRpc"}}{{/crossLinkModule}}.
             * - You can pass options.fail, which is used as "fail" to {{#crossLinkModule "JsonRpc"}}{{/crossLinkModule}}.
             * - You can pass options.always, which is used as "always" to {{#crossLinkModule "JsonRpc"}}{{/crossLinkModule}}.
             *
             * @method reload
             * @param {Object} [options]
             * @param {Object} [options.params]
             * @param {Function} [options.done]
             * @param {Function} [options.fail]
             * @param {Function} [options.always]
             */
            reload: function( options ) {
                options = options || {};
                var
                    self = this,
                    remote = peek( self.remote ),
                    _lastParams = peek( self._lastParams ),
                    params = Y.merge( {}, _lastParams, options.params );

                if( self._exportCsv ) {
                    return;
                }

                if( remote ) {
                    if( self._lastParams ) {
                        self.loadData( {
                            params: params,
                            done: options.done || null,
                            fail: options.fail || null,
                            always: options.always || null
                        } );
                    }
                }
                // for local just re-notify
                else {
                    self._filteredData.valueHasMutated(); // notify subscribers
                    self.templateNameRow.valueHasMutated(); // re-render rows
                }
            },
            /**
             * Notify subscribers and rerender rows (used when reload from server is unnecessary)
             * @method rerender
             */
            rerender: function() {
                var self = this;
                if( self._filteredData && self._filteredData.valueHasMutated ) {
                    self._filteredData.valueHasMutated();
                }
                if( self.templateNameRow && self.templateNameRow.valueHasMutated ) {
                    self.templateNameRow.valueHasMutated();
                }
            },
            /**
             * Checks if passed column is in the sorters of this table.
             * @method isColumnInSorters
             * @param {KoTableColumn} column
             * @return {boolean}
             */
            isColumnInSorters: function( column ) {
                var
                    self = this,
                    sorters = unwrap( self.sorters );

                return ( -1 !== sorters.indexOf( column ) );
            },
            /**
             * Check if the passed column is the main sorted by column
             * @method isColumnMainSortedBy
             * @param {KoTableColumn} column
             * @return {boolean}
             */
            isColumnMainSortedBy: function( column ) {
                var
                    self = this,
                    sorters = unwrap( self.sorters );

                return Boolean( 0 === sorters.indexOf( column ) );
            },
            /**
             * Check if the passed column is not the main sorted by column
             * @method isColumnNotMainSortedBy
             * @param {KoTableColumn} column
             * @return {boolean}
             */
            isColumnNotMainSortedBy: function( column ) {
                var
                    self = this;

                return !self.isColumnMainSortedBy( column );
            },
            /**
             * Get the prioritisation of the passed column in the sorters
             * @method getColumnPrioritisationInSorters
             * @param {KoTableColumn} column
             * @return {null|Number}
             */
            getColumnPrioritisationInSorters: function( column ) {
                var
                    self = this,
                    sorters = unwrap( self.sorters ),
                    sortersIndexOf = sorters.indexOf( column );

                if( -1 !== sortersIndexOf ) {
                    return sortersIndexOf + 1;
                } else {
                    return null;
                }
            },
            /**
             * Add the passed column to the sorters of this table, if it isn't already.
             * @method addColumnToSorters
             * @param {KoTableColumn} column
             * @protected
             */
            addColumnToSorters: function( column ) {
                var
                    self = this,
                    isSortable = peek( column.isSortable ),
                    sorters = peek( self.sorters ),
                    sortersLimit = peek( self.sortersLimit ),
                    sortersSelfIndex, sorterIndex;

                if( !isSortable ) {
                    return;
                }

                sortersSelfIndex = sorters.indexOf( column );

                // get not present column into sorters
                if( -1 === sortersSelfIndex ) {
                    sorters.push( column );
                    sortersSelfIndex = sorters.length - 1;
                }

                // last activated sorter have to be moved to index 0 to make the sort object ordered
                sorters.unshift( sorters.splice( sortersSelfIndex, 1 )[0] ); // silently

                // clean sorters in regards to sortersLimit
                if( 0 !== sortersLimit ) {
                    for( sorterIndex = sorters.length - 1; sorterIndex > -1; sorterIndex-- ) {
                        if( sorterIndex >= sortersLimit ) {
                            sorters.splice( sorterIndex, 1 );
                        }
                    }
                }

                // subscribers should now receive the correct sort order of sorters
                self.sorters.valueHasMutated(); // notify
            },
            /**
             * Remove the passed column from the sorters of this table, if it isn't already.
             * @method removeColumnFromSorters
             * @param {KoTableColumn} column
             */
            removeColumnFromSorters: function( column ) {
                var
                    self = this;

                if( self.isColumnInSorters( column ) ) {
                    self.sorters.remove( column );
                }
            },
            /**
             * @method initSelecting
             * @protected
             */
            initSelecting: function() {
                var
                    self = this;
                self.selected = ko.isObservable( self.selected ) ? self.selected : ko.observableArray( self.selected );
                self.selectedHashs = {};
            },
            /**
             * Remove all selections
             * @method unSelect
             */
            unSelect: function() {
                var self = this;
                self.selectedHashs = {};
                self.selected.removeAll();
            },
            /**
             * @method onBodyClick
             * @protected
             */
            onBodyClick: function( table, $event ) {
                var self = this,
                    $target = jQuery( $event.target ),
                    isTd = $target.is( 'tr.KoTable-row > td' ),
                    isTdCollapseRows = $target.is( 'tr.KoTable-row-collapse > td' ) || Boolean( $target.parentsUntil( '.KoTable-rows', 'tr.KoTable-row-collapse ' ).length ),
                    isLink,
                    tdNode,
                    colModel,
                    handleColumnOnCellClick,
                    handleTableOnCellClick,
                    handleTableOnRowClick,
                    modelRow,
                    bubble, meta;

                if( isTdCollapseRows ) {
                    self.onCollapseRowClick( ko.dataFor( $target.parents( 'tr.KoTable-row-collapse' ).get( 0 ) ), $event );
                    return;
                }

                isLink = Boolean( $target.is( 'a' ) || $target.parents( 'a' ).get( 0 ) );

                //  cause not clear, tdNode is sometimes undefined, may be related to double clicking while the table
                //  is being disposed due to navigation from the first click, MOJ-13762
                tdNode = ( isTd ? $target : $target.parents( 'tr.KoTable-row > td' ) ).get( 0 );
                if ( !tdNode ) { return; }

                colModel = ko.dataFor( tdNode );
                handleColumnOnCellClick = peek( colModel.handleColumnOnCellClick );
                handleTableOnCellClick = peek( colModel.handleTableOnCellClick );
                handleTableOnRowClick = peek( colModel.handleTableOnRowClick );
                modelRow = ko.dataFor( $target.parents( 'tr.KoTable-row' ).get( 0 ) );
                bubble = true;

                // TODO: self.onBodyClickAllowed
                if( modelRow && ( modelRow !== KoTable.CONST.EMPTY_ROW ) && handleColumnOnCellClick ) {
                    meta = {
                        row: modelRow,
                        col: colModel,
                        value: colModel.getValueFromData( modelRow ),
                        isLink: isLink
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
                            if( bubble ) {
                                self.selectRow( meta, $event );
                            }
                        }
                    }
                }

                return bubble || !$event.isDefaultPrevented();
            },
            /**
             * Overwrite this method to provide your own on additional row dependent on "collapseRows" click handling.
             * @method onCollapseRowClick
             * @param {object} model row data object
             * @param {event} event the raised event
             */
            onCollapseRowClick: function( /*model, event*/ ) {
            },
            /**
             * Overwrite this method to provide your own on additional row dependent on "collapseRows" context menu handling.
             * @method onCollapseRowContextMenu
             * @param {object} model row data object
             * @param {event} event the raised event
             */
            onCollapseRowContextMenu: function( /*model, event*/ ) {
            },
            /** @private **/
            _showRowDependentCollapseRows: function( $context ) {
                var
                    self = this,
                    collapseRows = unwrap( self.collapseRows ),
                    mixedMode = unwrap( self.collapseMixedMode );

                if( collapseRows || mixedMode ) {
                    return self.showRowDependentCollapseRows( $context );
                }

                return true;
            },
            /** @private **/
            _showAdditionalDependentCollapseRows: function( $context ) {
                var
                    self = this,
                    collapseRows = unwrap( self.collapseRows ),
                    mixedMode = unwrap( self.collapseMixedMode );

                if( collapseRows || mixedMode ) {
                    return self.showAdditionalDependentCollapseRows( $context );
                }

                return false;
            },
            /** @private **/
            _getCollapseRowsActionIconName: function() {
                var
                    self = this,
                    collapsed = unwrap( self.collapseRows );

                return collapsed ? 'CHEVRON_UP' : 'CHEVRON_DOWN';
            },
            /**
             * @private
             * @return String
             */

            _getCollapseRowsActionText: function() {
                var
                    self = this,
                    collapsed = unwrap( self.collapseRows );

                return collapsed ? self.i18n( 'KoUI.KoTable.collapseRows.actionCollapsed.text' ) : self.i18n( 'KoUI.KoTable.collapseRows.actionExpanded.text' );
            },
            /**
             * @private
             * @return String
             */
            _getCollapseRowsActionTitle: function() {
                var
                    self = this,
                    collapsed = unwrap( self.collapseRows );

                return collapsed ? self.i18n( 'KoUI.KoTable.collapseRows.actionCollapsed.title' ) : self.i18n( 'KoUI.KoTable.collapseRows.actionExpanded.title' );
            },
            /** @private **/
            _getCssRowAdditionalDependentCollapseRows: function( $context ) {
                var
                    self = this,
                    css = {};

                self.getCssRowAdditionalDependentCollapseRows( $context, css );

                return css;

            },
            /** @private **/
            _getStyleRowAdditionalDependentCollapseRows: function( $context ) {
                var
                    self = this,
                    style = self.getStyleRowAdditionalDependentCollapseRows( $context );

                return style;
            },
            /**
             * Overwrite this method to provide individual class names for additional row dependent on "collapseRows".
             * Put class names in the css argument, by inspecting the $context argument
             * @method getCssRowAdditionalDependentCollapseRows
             * @param {object} $context the context of the row
             * @param {object} css class names to be applied to that property
             */
            getCssRowAdditionalDependentCollapseRows: function( /*$context, css*/ ) {
            },
            /**
             * Overwrite this method to provide an individual style for additional row dependent on "collapseRows".
             * The return value will be the content of the style-attribute for that row.
             * @method getStyleRowAdditionalDependentCollapseRows
             * @param {object} $context the $context of the row
             * @return {string}
             */
            getStyleRowAdditionalDependentCollapseRows: function( /*$context*/ ) {
                return '';
            },
            /**
             * Overwrite this method to provide individual rendering for additional row dependent on "collapseRows".
             * @method renderAdditionalDependentCollapseRows
             * @param {object} $context the $context of the row
             * @return {string}
             */
            renderAdditionalDependentCollapseRows: function( /*$context*/ ) {
                return '';
            },
            /**
             * Overwrite this method to handle display of an original row dependent on "collapseRows".
             * @method showRowDependentCollapseRows
             * @param {object} $context the $context of the row
             * @return {boolean}
             */
            showRowDependentCollapseRows: function( /*$context*/ ) {
                return true;
            },
            /**
             * Overwrite this method to handle display of an additional row dependent on "collapseRows".
             * @method showAdditionalDependentCollapseRows
             * @param {object} $context the $context of the row
             * @return {boolean}
             */
            showAdditionalDependentCollapseRows: function( /*$context*/ ) {
                return false;
            },
            /** @private **/
            _toggleCollapseRows: function( menuItem ) {
                var
                    self = this,
                    icon = menuItem.icon,
                    collapsed = peek( self.collapseRows ),
                    toggled = !collapsed;

                self.collapseRows( toggled );
                icon.iconName( self._getCollapseRowsActionIconName() );
                menuItem.text( self._getCollapseRowsActionText() );
                menuItem.title( self._getCollapseRowsActionTitle() );
            },
            /**
             * Overwrite this method to provide your own on row click handling.
             * If it returns false or $event.stopImmediatePropagation, $event.stopPropagation is called no event bubbling will occur.
             * If $event.preventDefault is called only the default action is prevented.
             * @method onRowClick
             * @param {Object} meta row meta Object
             * @param {Event} $event the raised event
             * @return {boolean}
             * @example
             // … ,
             onRowClick: function( meta, event ) {
                 console.warn( 'table onRowClick :', arguments, this );
             }
             */
            onRowClick: function( /*meta, $event*/ ) {
                // meant to override
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
                // meant to override
                return true;
            },
            /**
             * @method selectRow
             * @param {Object} meta
             * @param {Event} event
             * @return {boolean}
             */
            selectRow: function( meta/*, $event*/ ) {
                // TODO: improve …
                var
                    self = this,
                    model = meta.row,
                    selectMode = unwrap( self.selectMode ),
                    isSelected,
                    hash;

                if( model === KoTable.CONST.EMPTY_ROW ) {
                    return true;
                }

                if( 'none' === selectMode ) {
                    if( peek( self.selected ).length ) {
                        self.selectedHashs = {};
                        self.selected.removeAll();
                    }
                    return true;
                }

                /*
                 if( $event instanceof jQuery.Event ) {
                 // do some ctrl + click stuff
                 }
                 */

                isSelected = self.isSelected( model );
                hash = String( fastHash( model ) );

                switch( selectMode ) {
                    case 'single':
                        self.selectedHashs = {};
                        peek( self.selected ).splice( 0 ); // shouldn't notify
                        if( isSelected ) {
                            self.selected.valueHasMutated();  // notify
                        }
                        break;
                    case 'multi':
                        if( isSelected ) {
                            delete self.selectedHashs[hash];
                            // TODO: create some sort of hash Object which is filled on every data operation, better than this …
                            self.selected.remove( function( item ) {
                                return hash === String( fastHash( item ) );
                            } );
                        }
                        break;
                }
                if( !isSelected ) {
                    self.selectedHashs[hash] = model;
                    self.selected.push( model );
                }
                return true;
            },
            /**
             * @method isSelected
             * @param {Object} model
             * @return {boolean}
             */
            isSelected: function( model ) {
                var self = this,
                    selected = unwrap( self.selected );

                return (selected.indexOf( model ) > -1 || Boolean( self.selectedHashs[String( fastHash( model ) )] ));
            },
            /**
             * @method onBodyContextMenu
             * @protected
             */
            onBodyContextMenu: function( table, $event ) {
                var
                    self = this,
                    $target = jQuery( $event.target ),
                    isTd = $target.is( 'tr.KoTable-row > td' ),
                    isTdCollapseRows = $target.is( 'tr.KoTable-row-collapse > td' ) || Boolean( $target.parentsUntil( '.KoTable-rows', 'tr.KoTable-row-collapse ' ).length ),
                    isLink,
                    colModel,
                    handleColumnOnCellContextMenu,
                    handleTableOnCellContextMenu,
                    handleTableOnRowContextMenu,
                    modelRow,
                    bubble, meta;

                if( isTdCollapseRows ) {
                    self.onCollapseRowContextMenu( ko.dataFor( $target.parents( 'tr.KoTable-row-collapse' ).get( 0 ) ), $event );
                    return;
                }

                isLink = Boolean( $target.is( 'a' ) || $target.parents( 'a' ).get( 0 ) );
                colModel = ko.dataFor( ( isTd ? $target : $target.parents( 'tr.KoTable-row > td' ) ).get( 0 ) );
                handleColumnOnCellContextMenu = peek( colModel.handleColumnOnCellContextMenu );
                handleTableOnCellContextMenu = peek( colModel.handleTableOnCellContextMenu );
                handleTableOnRowContextMenu = peek( colModel.handleTableOnRowContextMenu );
                modelRow = ko.dataFor( $target.parents( 'tr.KoTable-row' ).get( 0 ) );
                bubble = true;

                if( modelRow && ( modelRow !== KoTable.CONST.EMPTY_ROW ) && handleColumnOnCellContextMenu ) {
                    meta = {
                        row: modelRow,
                        col: colModel,
                        value: colModel.getValueFromData( modelRow ),
                        isLink: isLink
                    };
                    // return false will break chain, on BodyClick bound to defaultPrevented
                    bubble = false !== colModel.onCellContextMenu( meta, $event );
                    if( $event.isPropagationStopped() || $event.isImmediatePropagationStopped() ) {
                        bubble = false;
                    }
                    if( bubble && handleTableOnCellContextMenu ) {
                        bubble = false !== self.onCellContextMenu( meta, $event );
                        if( $event.isPropagationStopped() || $event.isImmediatePropagationStopped() ) {
                            bubble = false;
                        }
                        if( bubble && handleTableOnRowContextMenu ) {
                            bubble = false !== self.onRowContextMenu( meta, $event );
                            if( $event.isPropagationStopped() || $event.isImmediatePropagationStopped() ) {
                                bubble = false;
                            }
                        }
                    }
                }

                return bubble || !$event.isDefaultPrevented();
            },
            /**
             * Overwrite this method to provide your own on row context menu handling.
             * If it returns false or $event.stopImmediatePropagation, $event.stopPropagation is called no event bubbling will occur.
             * If $event.preventDefault is called only the default action is prevented.
             * @method onRowContextMenu
             * @param {Object} meta row meta Object
             * @param {Event} $event the raised event
             * @return {boolean}
             * @example
             // … ,
             onRowContextMenu: function( meta, event ) {
                 console.warn( 'table onRowContextMenu :', arguments, this );
             }
             */
            onRowContextMenu: function( /*meta, $event*/ ) {
                // meant to override
                return true;
            },
            /**
             * Overwrite this method to provide your own on cell context menu handling.
             * If it returns false or $event.stopImmediatePropagation, $event.stopPropagation is called no event bubbling will occur.
             * If $event.preventDefault is called only the default action is prevented.
             * @method onCellContextMenu
             * @param {Object} meta row meta Object
             * @param {Event} $event the raised event
             * @return {boolean}
             * @example
             // … ,
             onCellContextMenu: function( meta, event ) {
                 console.warn( 'table onCellContextMenu :', arguments, this );
             }
             */
            onCellContextMenu: function( /*meta, $event*/ ) {
                // meant to override
                return true;
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
                    css = {
                        'KoTable-row-selected': self.isSelected( $context.$data )
                    };

                if( $context.$data !== KoTable.CONST.EMPTY_ROW ) {
                    self.getCssRow( $context, css );
                }

                if( peek( self.draggableRows ) ) {
                    if( $context.$data === KoTable.CONST.EMPTY_ROW ) {
                        css[CSS_KOTABLE_ROW_ISDRAGGABLE] = false;
                        css[CSS_KOTABLE_ROW_ISDROPPABLE] = false;
                    }
                    else {
                        css[CSS_KOTABLE_ROW_ISDRAGGABLE] = self._isRowDraggable( $context );
                        css[CSS_KOTABLE_ROW_ISDROPPABLE] = self._isRowDroppable( $context );
                    }
                }

                return css;

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
             * @method getTemplateNameRow
             * @return {string}
             * @protected
             */
            getTemplateNameRow: function() {
                return unwrap( this.templateNameRow );
            },

            getTemplateNameSummaryRow: function() {
                return unwrap( this.templateNameSummaryRow );
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
                        if( isUtilityColumn( column ) ) {
                            return false;
                        }
                        if( !peek( column.visibleByUser ) ) {
                            return false;
                        }
                        return true;
                    } ),
                    filterParams = peek( self.filterParams ),
                    columnsMapped = columnsFiltered.map( function( column ) {
                        var
                            forPropertyName = peek( column.forPropertyName );

                        if ( !peek( column.visible ) ) {
                            isAllChecked( false );
                        }

                        return {
                            label: peek( column.description ) || peek( column.label ),
                            forPropertyName: forPropertyName,
                            visible: ko.observable( peek( column.visible ) ),
                            isFiltered: Y.Object.owns( filterParams, forPropertyName )
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
                        header: ['close'],
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
                            entryVisible = peek( entry.visible );

                        var i;
                        for( i = 0; i < columnsMapped.length; i++) {
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
                }, aDCWindow.get( 'bodyContent' ).getDOMNodes()[0] );

                aDCWindow.show();

            },
            /**
             * Clears all {{#crossLink "KoTable/dataModifications:property"}}{{/crossLink}}
             * @method clearModified
             */
            clearModified: function() {
                var
                    self = this,
                    dataModifications = peek( self.dataModifications );

                Y.Array.invoke( dataModifications, 'destroy' );
            },
            /**
             * Creates or updates {{#crossLink "KoTable/dataModifications:property"}}{{/crossLink}}
             * @method updateModified
             * @param {Object} parameters
             * @param {String} parameters.forPropertyName The {{#crossLink "KoTableColumn/forPropertyName:property"}}{{/crossLink}} which is used to update the given data
             * @param {ko.observable} parameters.observable An observable which holds the value
             * @param {Object} parameters.origin The original row data Object
             */
            updateModified: function( parameters ) {
                var
                    self = this,
                    column = parameters.column,
                    observable = parameters.observable,
                    origin = parameters.origin,
                    dataModifications = peek( self.dataModifications ),
                    dataModification = Y.Array.find( dataModifications, function( item ) {
                        return origin === item.origin;
                    } );

                if( !dataModification ) {
                    dataModification = new KoTableDataModification( {
                        owner: self,
                        state: Y.clone( origin, true ),
                        origin: origin
                    } );
                    dataModification.update( {
                        column: column,
                        observable: observable
                    } );
                    self.dataModifications.push( dataModification );
                } else {
                    dataModification.update( {
                        column: column,
                        observable: observable
                    } );
                }

            },
            /**
             * Saves the user configuration to the server.
             * @param {*|Object} value
             * @param {String} [key] if omitted value is supposed to be the whole configuration else it is a part of the configuration
             * @return {jQuery.Deferred}
             */
            saveUserConfiguration: function( value, key ) {
                var
                    self = this,
                    userConfiguration = Y.clone( peek( self.userConfiguration ), true ),
                    config = userConfiguration.config = userConfiguration.config || {};

                self.userConfigurationPending( KoTable.CONST.userConfigurationPending.SAVE );

                if( Y.Lang.isString( key ) ) {
                    config[key] = value;
                }
                else {
                    Y.merge( config, value );
                }

                return Y.doccirrus.jsonrpc.api.kotableconfiguration
                    .saveUserConfiguration( {
                        userId: Y.doccirrus.auth.getUserId(),
                        stateId: peek( self.stateId ),
                        config: config
                    } )
                    /*.done( function( /!*response*!/ ) {

                     } )*/
                    .always( function() {
                        self.userConfiguration( userConfiguration );
                        self.userConfigurationPending( KoTable.CONST.userConfigurationPending.NONE );
                    } );

            },
            /**
             * Reset any columns filter value
             * @method resetFilters
             */
            resetFilters: function() {
                var
                    self = this,
                    columns = peek( self.columns );

                columns.forEach( function( column ) {

                    if( peek( column.isFilterable ) && column.filterField ) {
                        column.filterField.reset();
                    }

                } );

            },
            /**
             * Clear any columns sorter and reset the direction
             * @method clearSorters
             */
            clearSorters: function() {
                var
                    self = this,
                    columns = peek( self.columns );

                columns.forEach( function( column ) {

                    if( peek( column.isSortable ) ) {
                        column.sortReset();
                        column.removeFromSorters();
                    }

                } );

            },
            /**
             * Reset any columns sorter
             * @method resetSorters
             */
            resetSorters: function() {
                var
                    self = this,
                    sortersInitialState = peek( self.sortersInitialState );

                self.clearSorters();

                // apply the sorting state to sorters (reverse the order, because the last added gets first)
                [].concat( sortersInitialState ).reverse().forEach( function( column ) {
                    column.addToSorters();
                } );

            },
            /**
             * Reset each column positionIndex to the one initialized with
             * @method resetColumnsPositionIndex
             * @protected
             */
            resetColumnsPositionIndex: function() {
                var
                    self = this,
                    positionIndexColumnsInitialState = peek( self.positionIndexColumnsInitialState );

                // prevent disposing while moving
                self._disposeColumnsDisabled();
                // apply sorted columns
                self.columns( positionIndexColumnsInitialState );
                // enable disposing again
                self._disposeColumnsEnabled();
                // update each positionIndex
                self.positionIndexUpdate();
            },
            interceptRenderOutput: null,
            showExportCSVStart: function() {
                var
                    self = this,
                    CRLF = "\r\n",
                    LF = "\n",
                    CR = "\r",
                    TAB = "\t",
                    exportCsvConfiguration = peek( self.exportCsvConfiguration ),
                    exportCsvConfigurationColumnsMap = {},
                    paging = self.paging,
                    initialPage = peek( paging.page ),
                    pages = peek( paging.pages ),
                    columns = Y.Array.filter( peek( self.columns ), function( column ) {
                        if( column.isExcludedInCsv ) {
                            return false;
                        }
                        return true;
                    } ),
                    applyBindings = {
                        i18n: self.i18n,
                        fromPage: ko.observable( String( peek( paging.page ) ) ),
                        toPage: ko.observable( String( pages ) ),
                        lineSeparator: ko.observable( LF ),
                        lineSeparators: ko.observableArray( [
                            {
                                label: KoUI.i18n( 'KoUI.KoTable.showExportCSVStart.lineSeparators.LF.label' ),
                                value: LF
                            },
                            {
                                label: KoUI.i18n( 'KoUI.KoTable.showExportCSVStart.lineSeparators.CRLF.label' ),
                                value: CRLF
                            },
                            {
                                label: KoUI.i18n( 'KoUI.KoTable.showExportCSVStart.lineSeparators.CR.label' ),
                                value: CR
                            }
                        ] ),
                        dataSeparator: ko.observable( ',' ),
                        dataSeparators: ko.observableArray( [
                            {
                                label: KoUI.i18n( 'KoUI.KoTable.showExportCSVStart.dataSeparators.TAB.label' ),
                                value: TAB
                            }
                        ] ),
                        textSeparator: ko.observable( '"' )
                    },
                    bodyContent = Y.Node.create( '<div data-bind="template: { name: \'KoTableExportCsvStart\' }"></div>' ),
                    runCsvExportPending = false,
                    aDCWindow;

                self.events.fire( 'KoTable:exportCsvStart', {}, {} );

                exportCsvConfiguration.columns.forEach( function( config ) {
                    exportCsvConfigurationColumnsMap[config.forPropertyName] = config;
                } );

                columns = Y.Array.filter( columns, function( column ) {
                    if( column.forPropertyName in exportCsvConfigurationColumnsMap && false === exportCsvConfigurationColumnsMap[column.forPropertyName].visible ) {
                        return false;
                    }
                    return true;
                } );

                self._exportCsv = true;

                function runCsvExport() {

                    var
                        fromPage = peek( applyBindings.fromPage ),
                        toPage = peek( applyBindings.toPage ),
                        DATA_SEPARATOR = peek( applyBindings.dataSeparator ),
                        LINE_SEPARATOR = peek( applyBindings.lineSeparator ),
                        TEXT_SEPARATOR = peek( applyBindings.textSeparator ),
                        TEXT_REGEXP = new RegExp( TEXT_SEPARATOR, 'g' ),
                        INVALID_VALUE = [undefined, null, NaN],
                        columnsToCsv = Y.Array.filter( columns, function( column ) {
                            return peek( column.visible );
                        } ),
                        columnNames = columnsToCsv.map( function( column ) {
                            return column.forPropertyName;
                        } ),
                        columnLabels = columnsToCsv.map( function( column ) {
                            if( column.forPropertyName in exportCsvConfigurationColumnsMap && exportCsvConfigurationColumnsMap[column.forPropertyName].label ) {
                                return exportCsvConfigurationColumnsMap[column.forPropertyName].label;
                            }
                            else {
                                return peek( column.title ) || peek( column.label );
                            }
                        } ),
                        csvColumns = [],
                        csvData = [],
                        nextRow = [],
                        csvLines = [],
                        csv = '',
                        confirmNoticeAborted = false,
                        rowsSubscribe = null,
                        confirmNotice,
                        confirmCloseType = 'cancel';

                    confirmNotice = new Y.doccirrus.DCWindow( {
                        manager: Y.doccirrus.DCWindowManager.noticeDCWindowManager,
                        bodyContent: KoUI.i18n( 'KoUI.KoMask.text' ),
                        title: KoUI.i18n( 'KoUI.KoTable.showExportCSVStart.confirmNotice.title.pending' ),
                        icon: Y.doccirrus.DCWindow.ICON_INFO,
                        width: Y.doccirrus.DCWindow.SIZE_SMALL,
                        modal: true,
                        visible: true,
                        centered: true,
                        alignOn: [],
                        dragable: false,
                        maximizable: false,
                        resizeable: false,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                {
                                    label: KoUI.i18n( 'KoUI.KoTable.showExportCSVStart.confirmNotice.buttons.CANCEL.label' ),
                                    name: 'COPY',
                                    action: function( e ) {
                                        e.target.button.disable();
                                        var
                                            textarea = Y.Node.create( '<textarea name="exportCsv-copy" class="form-control" style="height: 200px; min-height: 3em; resize: vertical;"></textarea>' );

                                        confirmNotice.getButton( 'COPY' ).hide();

                                        textarea.set( 'value', csv );
                                        confirmNotice.set( 'bodyContent', textarea );

                                        confirmNotice.centered();

                                    }
                                },
                                {
                                    label: KoUI.i18n( 'KoUI.KoTable.showExportCSVStart.confirmNotice.buttons.DOWNLOAD.label' ),
                                    name: 'DOWNLOAD',
                                    action: function( e ) {
                                        e.target.button.disable();
                                        confirmCloseType = 'download';
                                        this.hide( e );
                                    }
                                }
                            ]
                        },
                        after: {
                            visibleChange: function( yEvent ) {
                                var
                                    csvFilename = (peek( self.csvFilename ) || self.constructor.prototype.csvFilename) + '.csv',
                                    isFileSaverSupported = false,
                                    tabWindow, tabDocument;

                                if( !yEvent.newVal ) {

                                    switch( confirmCloseType ) {
                                        case 'download':
                                            try {
                                                isFileSaverSupported = !!(new Blob());
                                            } catch( err ) {
                                                Y.log( 'Error closing CSV modal: ' + JSON.stringify( err ), 'warn', NAME );
                                            }
                                            if( isFileSaverSupported ) {
                                                Y.doccirrus.utils.saveAs( new Blob( [csv], { type: 'text/plain;charset=utf-8' } ), csvFilename );
                                            }
                                            else {
                                                tabWindow = window.open( '' );
                                                tabDocument = tabWindow.document;
                                                tabDocument.open( 'text/plain', 'replace' );
                                                tabDocument.charset = "utf-8";
                                                tabDocument.write( csv );
                                                tabDocument.close();
                                            }
                                            return;
                                        case 'cancel': //jshint ignore:line
                                        default:
                                            confirmNoticeAborted = true;
                                            return;
                                    }

                                }
                            }
                        },
                        render: document.body
                    } );

                    confirmNotice.getButton( 'COPY' ).hide();
                    confirmNotice.getButton( 'DOWNLOAD' ).hide();

                    self.interceptRenderOutput = function( meta, output ) {
                        var
                            column = meta.col,
                            forPropertyName = column.forPropertyName,
                            columnIndex = columnNames.indexOf( forPropertyName ),
                            csvRowIdx = 0,
                            exportCsvConfigurationColumn;

                        if( meta.isSummaryCell ) { return; }

                        if( -1 !== columnIndex ) {

                            if( csvColumns.length < columnNames.length ) {
                                csvColumns[columnIndex] = columnLabels[columnIndex];
                            }

                            if( forPropertyName in exportCsvConfigurationColumnsMap ) {
                                exportCsvConfigurationColumn = exportCsvConfigurationColumnsMap[forPropertyName];
                                if( exportCsvConfigurationColumn.renderer ) {
                                    output = exportCsvConfigurationColumn.renderer.apply( column, arguments );
                                }

                                //  DEPRECATED - allow custom HTML stripping or other overloaded preprocessing
                                if( exportCsvConfigurationColumn.stripHtml ) {
                                    if( true === exportCsvConfigurationColumn.stripHtml ) {
                                        output = Y.doccirrus.utils.stripHTML.regExp( output );
                                    }
                                    else {
                                        if( exportCsvConfigurationColumn.stripHtml.stripArgs ) {
                                            output = Y.doccirrus.utils.stripHTML[exportCsvConfigurationColumn.stripHtml.stripFn]
                                                .apply( undefined, [output].concat( exportCsvConfigurationColumn.stripHtml.stripArgs ) );
                                        }
                                        else {
                                            output = Y.doccirrus.utils.stripHTML[exportCsvConfigurationColumn.stripHtml.stripFn]
                                                .call( undefined, output );
                                        }
                                    }
                                }
                            }

                            if ( typeof output === 'undefined' ) {
                                output = "";
                            }

                            //  strip any remaining HTML from all cells
                            output = Y.doccirrus.utils.stripHTML.regExp( output );

                            //  strip newlines from all cells, replace with escaped newline in configured format
                            switch( LINE_SEPARATOR ) {
                                case '\r\n':
                                    output = output.replace( new RegExp( '\r\n', 'g' ), '\\r\\n' ); //  eslint-disable-line no-control-regex
                                    output = output.replace( new RegExp( '\n', 'g' ), '\\r\\n' );   //  eslint-disable-line no-control-regex
                                    output = output.replace( new RegExp( '\r', 'g' ), '\\r\\n' );   //  eslint-disable-line no-control-regex
                                    break;

                                case '\n':
                                    output = output.replace( new RegExp( '\r\n', 'g' ), '\\n' );    //  eslint-disable-line no-control-regex
                                    output = output.replace( new RegExp( '\n', 'g' ), '\\n' );      //  eslint-disable-line no-control-regex
                                    output = output.replace( new RegExp( '\r', 'g' ), '\\n' );      //  eslint-disable-line no-control-regex
                                    break;

                                case '\r':
                                    output = output.replace( new RegExp( '\r\n', 'g' ), '\\r' );    //  eslint-disable-line no-control-regex
                                    output = output.replace( new RegExp( '\n', 'g' ), '\\r' );      //  eslint-disable-line no-control-regex
                                    output = output.replace( new RegExp( '\r', 'g' ), '\\r' );      //  eslint-disable-line no-control-regex
                                    break;

                            }

                            //  prevent cell from being overwritten by tooltip value, may not match cell contents for
                            //  some column types, MOJ-11384

                            if ( !nextRow[ columnIndex ] ) {
                                nextRow[ columnIndex ] = output;
                            }

                            if( nextRow.length === columnNames.length) {
                                // rows might not be rendered in order in their collection - so ensure correct index
                                csvRowIdx = peek( paging.page ) * peek( self.limit ) - peek( self.limit ) + meta.rowIndex;

                                if ( !csvData[ csvRowIdx ] ) {
                                    csvData[ csvRowIdx ] = nextRow;
                                }

                                nextRow = [];
                            }

                        }

                    }; // end interceptRenderoutput

                    rowsSubscribe = self.rows.subscribe( function() {
                        var
                            hasNextPage = paging.hasNextPage();

                        if( !confirmNoticeAborted && ((hasNextPage && !toPage) || (toPage && hasNextPage && peek( paging.page ) < toPage)) ) {
                            paging.doNextPage();
                        }
                        else {
                            rowsSubscribe.dispose();
                            self.interceptRenderOutput = null;

                            [csvColumns].concat( csvData ).forEach( function( data ) {

                                csvLines.push( data.map( function( output ) {

                                    if( -1 !== INVALID_VALUE.indexOf( output ) ) {
                                        output = '';
                                    }

                                    output = String( output );

                                    if( -1 !== output.indexOf( TEXT_SEPARATOR ) ) {
                                        output = output.replace( TEXT_REGEXP, TEXT_SEPARATOR + TEXT_SEPARATOR );
                                    }

                                    if(
                                        -1 !== output.indexOf( DATA_SEPARATOR ) ||
                                        -1 !== output.indexOf( LINE_SEPARATOR ) ||
                                        -1 !== output.indexOf( TEXT_SEPARATOR )
                                    ) {
                                        output = TEXT_SEPARATOR + output + TEXT_SEPARATOR;
                                    }

                                    return output;

                                } ).join( DATA_SEPARATOR ) );

                            } );

                            csv = csvLines.join( LINE_SEPARATOR );

                            csvColumns = [];
                            csvData = [];
                            nextRow = [];
                            csvLines = [];

                            if( !confirmNoticeAborted ) {
                                confirmNotice.getButton( 'COPY' ).show();
                                confirmNotice.getButton( 'DOWNLOAD' ).show();
                                confirmNotice.set( 'width', Y.doccirrus.DCWindow.SIZE_MEDIUM );
                                confirmNotice.set( 'title', KoUI.i18n( 'KoUI.KoTable.showExportCSVStart.confirmNotice.title.done' ) );
                                confirmNotice.set( 'bodyContent', KoUI.i18n( 'KoUI.KoTable.showExportCSVStart.confirmNotice.bodyContent.done' ) );
                                confirmNotice.centered();
                            }

                            self._exportCsv = false;
                            self.events.fire( 'KoTable:exportCsvEnd', {}, {} );

                            if( initialPage !== peek( paging.page ) ) {
                                paging.page( initialPage );
                            }

                        }
                    } );

                    if( fromPage ) {
                        fromPage = parseInt( fromPage, 10 );
                    }
                    else {
                        fromPage = 1;
                    }
                    if( toPage ) {
                        toPage = parseInt( toPage, 10 );
                    }
                    if( fromPage === peek( paging.page ) ) {
                        self.reload();
                    }
                    else {
                        paging.page( fromPage );
                    }

                    self._exportCsv = true;

                }

                aDCWindow = new Y.doccirrus.DCWindow( {
                    id: 'DCWindow-KoTable-showExportCSVStart',
                    bodyContent: bodyContent,
                    title: KoUI.i18n( 'KoUI.KoTable.showExportCSVStart.title' ),
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
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function( e ) {
                                    e.target.button.disable();

                                    runCsvExportPending = true;

                                    this.close();

                                    runCsvExport();
                                }
                            } )
                        ]
                    },
                    after: {
                        visibleChange: function( yEvent ) {
                            if( !yEvent.newVal ) {
                                ko.cleanNode( bodyContent.getDOMNode() );

                                self._exportCsv = false;

                                if( !runCsvExportPending ) {
                                    self.events.fire( 'KoTable:exportCsvEnd', {}, {} );
                                }
                            }
                        }
                    }
                } );

                applyBindings.dataSeparatorText = ko.computed( {
                    read: function() {
                        var
                            dataSeparator = applyBindings.dataSeparator();

                        if( TAB === dataSeparator ) {
                            return '';
                        }
                        else {
                            return dataSeparator;
                        }
                    },
                    write: function( value ) {
                        if( TAB === value ) {
                            applyBindings.dataSeparator( '' );
                        }
                        else {
                            applyBindings.dataSeparator( value );
                        }
                    }
                }, self, { disposeWhenNodeIsRemoved: true } );

                applyBindings.fromPageError = ko.computed( function() {
                    var
                        fromPage = unwrap( applyBindings.fromPage );

                    if( !fromPage || (/^\d+$/).test( fromPage ) && '0' !== fromPage ) {
                        return false;
                    }

                    return true;
                }, self, { disposeWhenNodeIsRemoved: true } );

                applyBindings.toPageError = ko.computed( function() {
                    var
                        toPage = unwrap( applyBindings.toPage );

                    if( !toPage || (/^\d+$/).test( toPage ) && '0' !== toPage ) {
                        return false;
                    }

                    return true;
                }, self, { disposeWhenNodeIsRemoved: true } );

                ko.computed( function() {
                    var
                        buttonAssume = aDCWindow.getButton( 'OK' ).button,
                        fromPageError = unwrap( applyBindings.fromPageError ),
                        toPageError = unwrap( applyBindings.toPageError ),
                        enable = false;

                    if( !(fromPageError || toPageError) ) {
                        enable = true;
                    }

                    if( enable ) {
                        buttonAssume.enable();
                    } else {
                        buttonAssume.disable();
                    }
                }, self, { disposeWhenNodeIsRemoved: true } );

                ko.applyBindings( applyBindings, bodyContent.getDOMNode() );

                aDCWindow.show();
            },

            showExportPdfReportStart: function() {
                var self = this;
                if( self.pdfExportHook ) {
                    //  PDF generation process may be defined by component which created this table
                    self.pdfExportHook();
                    return;
                }
            },

            showExportPdfDataStart: function() {
                var self = this;

                Y.log( 'Starting generation of PDF from table contents', 'info', NAME );
                if( self.pdfExportHook ) {
                    //  PDF generation process may be defined by component which created this table
                    self.pdfExportHook();
                    return;
                }
                Y.doccirrus.modals.printKoTable.show( { 'kotable': self } );
            },

            /**
             * @method helper method to check if there are any patient emails
             * @param {Array} data list of patients to be displayed as rows in the table
             * @returns {boolean}
             */
            dataHasPatientEmail: function( data ) {
                var extraMeta = peek( this.extraMeta );
                if( extraMeta && extraMeta.countEmail ){
                    return Boolean( extraMeta.countEmail );
                }
                data = data || this.data();
                return ( data || [] ).some( function(el){
                    return el && ( ( typeof el.patEmail === 'string' ? [ el.patEmail ] : el.patEmail ) || []).some( Boolean );
                } );
            },
            /**
             * Computes table min-width of either responsive or not
             * @return {string}
             * @private
             */
            _computeTableMinWidth: function() {
                var
                    self = this,
                    responsive = self.responsive(),
                    responsiveMinWidth = self.responsiveMinWidth(),
                    tableMinWidth = self.tableMinWidth(),
                    minWidth = '';

                if( responsive ) {
                    minWidth = responsiveMinWidth;
                }
                else if( tableMinWidth ) {
                    minWidth = tableMinWidth;
                }

                return minWidth;
            },
            /**
             * Click handler of a usage shortcut
             * @param usageShortcut
             */
            usageShortcutsClickHandler: function( usageShortcut ) {
                var
                    self = this,
                    shortcutValue = peek( usageShortcut.text ),
                    shortcutActive = peek( usageShortcut.active );

                if( shortcutActive ) {
                    usageShortcut.active( false );
                    self.multiFiltersConfiguration.remove( shortcutValue );
                    if( !unwrap( self.multiFiltersConfiguration ).length ) {
                        self.usageConfigurationValue( undefined );
                    } else {
                        self.usageConfigurationValue( unwrap( self.multiFiltersConfiguration )[0] );
                    }
                } else {
                    usageShortcut.active( true );
                    self.multiFiltersConfiguration.push( shortcutValue );
                    if( !unwrap( self.multiFiltersConfiguration ).length ) {
                        self.usageConfigurationValue( shortcutValue );
                    } else {
                        self.usageConfigurationValue( unwrap( self.multiFiltersConfiguration )[0] );
                    }
                }
            },
            /**
             * Click Handler for the filter shortcut control "switcher".
             * Currently toggles the visibility of the filter shortcut buttons
             */
            usageShortcutsVisibleSwitcherClickHandler: function() {
                var
                    self = this,
                    usageShortcutsVisible = peek( self.usageShortcutsVisible ),
                    activeShortcutCount = ( self.usageShortcuts() || [] ).filter( function( item ) {
                        return item.active();
                    });

                self.usageShortcutsVisible( !usageShortcutsVisible );
                if( 1 === activeShortcutCount.length ) {
                    self.usageConfigurationValue( activeShortcutCount[0].text );
                } else {
                    ( self.usageShortcuts() || [] ).forEach( function( item ) {
                        if( item && item.active() ) {
                            item.active( false );
                        }
                    });
                    self.multiFiltersConfiguration( [] );
                    self.usageConfigurationValue( undefined );
                }
                // set state of permafilter needed for save without property
                self.setState( 'usageShortcutsVisible', !usageShortcutsVisible );
            },

            /**
             *  Also used for context and filter menu in the top
             *
             *  @return {*[]}       Array of menu item definitions
             */

            getToolsActionItems: function() {

                var
                    self = this;

                /**
                 * Disabled attribute for the action for exporting Jasper reports to PDF
                 * @attribute exportPdfDisabled
                 * @type {boolean}
                 * @default false
                 */

                self.exportPdfReportDisabled = ko.computed( function() {
                    if( !self.totalItems || self.totalItems() === 0 ) {
                        return true;
                    }
                    //  consistency - disable CSV when PDF export is disabled
                    if( self.totalItems() >= MAX_PDF_ROWS || unwrap( self.columns ).length >= MAX_PDF_COLS ) {
                        return true;
                    }

                    if( self.initialConfig && self.initialConfig.useReportingAPI ) {
                        return false;
                    }
                    return true;
                } );

                /**
                 * Visible attribute for the action for creating PDFs with the reporting API
                 * @attribute exportPdfVisible
                 * @type {boolean}
                 * @default true
                 */

                self.exportPdfReportVisible = ko.computed( function() {
                    if( self.initialConfig && self.initialConfig.useReportingAPI ) {
                        return true;
                    }
                    return false;
                } );

                /**
                 * Visible attribute for the action for creating PDFs from the table's current proxy and settings
                 * (present unless this is a report table)
                 * @attribute exportPdfVisible
                 * @type {boolean}
                 * @default true
                 */

                self.exportPdfDataVisible = ko.computed( function() {
                    if( self.initialConfig && self.initialConfig.noPdfExport ) {
                        return false;
                    }

                    return !self.exportPdfReportVisible();
                } );

                /**
                 * Disable PDF generation from table if there are more than 2k rows
                 * @attribute exportPdfVisible
                 * @type {boolean}
                 * @default true
                 */

                self.exportPdfDataDisabled = ko.computed( function() {
                    if( !self.totalItems || self.totalItems() === 0 || !self.columns || unwrap( self.columns ).length === 0 ) {
                        return true;
                    }
                    return (self.totalItems() >= MAX_PDF_ROWS || unwrap( self.columns ).length >= MAX_PDF_COLS);
                } );

                /**
                 * Disabled attribute for the action for exporting to csv
                 * @attribute exportCsvDisabled
                 * @type {boolean}
                 * @default false
                 */

                self.exportCsvDisabled = ko.computed( function() {
                    if( !self.totalItems || self.totalItems() === 0 || !self.columns || unwrap( self.columns ).length === 0 ) {
                        return true;
                    }
                    //  consistency - disable CSV when PDF export is disabled
                    // MOJ-13442 CSV export is still enabled if the columns exceed the MAX_PDF_COLS
                    return self.totalItems() >= MAX_PDF_ROWS;
                } );

                /**
                 * Visible attribute for the action for exporting to csv
                 * @attribute exportCsvVisible
                 * @type {boolean}
                 * @default true
                 */

                self.exportCsvVisible = function( key ) {
                    return self._handleLazyConfig( key, ko.observable( true ) );
                };

                self.exportPdfTooltip = ko.computed( function() {
                    if( self.exportPdfDataDisabled() ) {
                        return self.i18n( 'KoUI.KoTable.exportPdfAction.tooMuch' );
                    }
                    return self.i18n( 'KoUI.KoTable.exportPdfAction.title' );
                } );

                self.exportCsvTooltip = ko.computed( function() {
                    if( self.exportPdfDataDisabled() ) {
                        return self.i18n( 'KoUI.KoTable.exportCsvAction.tooMuch' );
                    }
                    return self.i18n( 'KoUI.KoTable.exportCsvAction.title' );
                } );

                self.toggleFilterConfigOptions = function() {
                    self.showFilterConfig( !self.showFilterConfig() );
                };

                self.filterConfigMenuLabel = ko.computed( function() {
                    var
                        filterConfigOn = self.i18n( 'KoUI.KoTable.filterConfiguration.options.FILTER_ON' ),
                        filterConfigOff = self.i18n( 'KoUI.KoTable.filterConfiguration.options.FILTER_OFF' );

                    return self.showFilterConfig() ? filterConfigOff : filterConfigOn;
                } );

                return [
                    {
                        name: 'KoTable-visibleColumnsConfigurationAction',
                        icon: 'COLUMNS',
                        text: self.i18n( 'KoUI.KoTable.visibleColumnsConfiguration.action.text' ),
                        title: self.i18n( 'KoUI.KoTable.visibleColumnsConfiguration.action.title' ),
                        disabled: self.visibleColumnsConfigurationDisabled,
                        visible: self.visibleColumnsConfigurationVisible,
                        click: Y.bind( self.showVisibleColumnsConfiguration, self )
                    },
                    {
                        name: 'KoTable-filterConfigurationAction',
                        icon: 'FILTER',
                        text: self.filterConfigMenuLabel,
                        title: self.filterConfigMenuLabel,
                        disabled: self.visibleColumnsConfigurationDisabled,
                        visible: self.visibleColumnsConfigurationVisible,
                        click: Y.bind( self.toggleFilterConfigOptions, self )
                    },
                    {
                        name: 'KoTable-collapseRows',
                        icon: self._getCollapseRowsActionIconName(),
                        text: self._getCollapseRowsActionText(),
                        title: self._getCollapseRowsActionTitle(),
                        disabled: self.collapseRowsActionDisabled,
                        visible: self.collapseRowsActionVisible,
                        click: Y.bind( self._toggleCollapseRows, self )
                    },
                    {
                        name: 'KoTable-exportCsvAction',
                        icon: 'COPY',
                        text: self.i18n( 'KoUI.KoTable.exportCsvAction.text' ),
                        title: self.exportCsvTooltip,
                        disabled: self.exportCsvDisabled,
                        visible: self.exportCsvVisible,
                        click: Y.bind( self.showExportCSVStart, self )
                    },
                    {
                        //  report PDFs only
                        name: 'KoTable-exportPdfAction',
                        icon: 'PDF',
                        text: self.i18n( 'KoUI.KoTable.exportPdfAction.text' ),
                        title: self.exportPdfTooltip,
                        disabled: self.exportPdfReportDisabled,
                        visible: self.exportPdfReportVisible,     //  show report PDF entry, not generic PDF export
                        click: Y.bind( self.showExportPdfReportStart, self )
                    },
                    {
                        //  development / debugging information
                        name: 'KoTable-exportPdfGeneric',
                        icon: 'PDF',
                        text: self.i18n( 'KoUI.KoTable.exportPdfAction.text' ),
                        title: self.exportPdfTooltip,
                        disabled: self.exportPdfDataDisabled,
                        visible: self.exportPdfDataVisible,  //  hide when report PDF menu entry is shown
                        click: Y.bind( self.showExportPdfDataStart, self )
                    }
                ];
            }
        },
        lazy: {
            /**
             * @protected
             */
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTable' ) );
            },
            /**
             * ###### The userConfiguration object:
             *
             * - **usage** (Array): The persisted configuration for that tables given {{#crossLink "KoConfigurable/stateId:property"}}{{/crossLink}} and current user using it.
             *      - **\*** (Object):
             *          - **columnPosition** (Array of Objects): _Property may be available._ Every column should have an index.
             *              - **forPropertyName** (String): The column associated under this name.
             *              - **positionIndex** (Integer): The index the associated column should receive.
             *          - **sorters** (Array of Objects): _Property may be available._ Only columns that are sorted.
             *              - **forPropertyName** (String): The column associated under this name.
             *              - **direction** (String): The direction the associated column should receive, either "ASC" or "DESC".
             *          - **filters** (Array of Objects): _Property may be available._ Every column that have a filter.
             *              - **forPropertyName** (String): The column associated under this name.
             *              - **value** (*): The value the associated column filter should receive, can be any the filter works with.
             * @property userConfiguration
             * @type {Object}
             * @example
             {
                "usage" : [ // the user usage settings
                    {
                        "name" : "my first filter name", // a name the user have chosen for these settings
                        "shortcutVisible" : true, // the shortcut for this entry is visible
                        "shortcutIndex" : 0, // the shortcut index for this entry is 0
                        "shortcutDescription" : "my first filter description", // the shortcut title for this entry
                        "columnPosition" : [
                            {
                                "positionIndex" : 0,
                                "forPropertyName" : "myFirstColumn"
                            },
                            {
                                "positionIndex" : 1,
                                "forPropertyName" : "mySecondColumn"
                            },
                            {
                                "positionIndex" : 2,
                                "forPropertyName" : "myThirdColumn"
                            }
                        ],
                        "sorters" : [
                            {
                                "direction" : "DESC",
                                "forPropertyName" : "mySecondColumn"
                            }
                        ],
                        "filters" : [
                            {
                                "value" : "",
                                "forPropertyName" : "myFirstColumn"
                            },
                            {
                                "value" : "",
                                "forPropertyName" : "mySecondColumn"
                            },
                            {
                                "value" : [],
                                "forPropertyName" : "myThirdColumn"
                            }
                        ]
                    },
                    {
                        "name" : "my second filter name", // a name the user have chosen for these settings
                        "shortcutVisible" : false, // the shortcut for this entry is not visible
                        "shortcutIndex" : 1, // the shortcut index for this entry is 1
                        "shortcutDescription" : "my second filter description", // the shortcut title for this entry
                        "columnPosition" : [
                            {
                                "positionIndex" : 1,
                                "forPropertyName" : "myFirstColumn"
                            },
                            {
                                "positionIndex" : 2,
                                "forPropertyName" : "mySecondColumn"
                            },
                            {
                                "positionIndex" : 0,
                                "forPropertyName" : "myThirdColumn"
                            }
                        ],
                        "sorters" : [
                            {
                                "direction" : "ASC",
                                "forPropertyName" : "mySecondColumn"
                            }
                        ],
                        "filters" : [
                            {
                                "value" : "foo",
                                "forPropertyName" : "myFirstColumn"
                            },
                            {
                                "value" : "",
                                "forPropertyName" : "mySecondColumn"
                            },
                            {
                                "value" : ["bar"],
                                "forPropertyName" : "myThirdColumn"
                            }
                        ]
                    }
                ]
            }
             */
            userConfiguration: function() {
                var
                    self = this,
                    stateId = peek( self.stateId ),
                    userConfiguration = ko.observable( {} );

                if( peek( self.usageConfigurationVisible ) ) {

                    self.userConfigurationPending( KoTable.CONST.userConfigurationPending.READ );

                    Y.doccirrus.jsonrpc.api.kotableconfiguration.read( {
                        query: {
                            userId: Y.doccirrus.auth.getUserId(),
                            stateId: stateId
                        }
                    } ).done( function( response ) {
                        var
                            data = response.data && response.data[0] || null;

                        if( data ) {
                            userConfiguration( data );
                        }

                    } ).always( function() {
                        //  timing issue, table may have been disposed while waiting for the server, MOJ-10413
                        if ( !self.userConfigurationPending ) { return; }
                        self.userConfigurationPending( KoTable.CONST.userConfigurationPending.NONE );
                    } );

                }

                return userConfiguration;
            },
            /**
             * Plain usage configuration data
             * @type {array}
             */
            usageConfigurationData: function() {
                var
                    self = this;

                return ko.computed( function() {
                    var
                        userConfiguration = unwrap( self.userConfiguration ),
                        data = getObject( 'config.usage', userConfiguration ) || [];

                    if( Array.isArray( self.staticConfig ) ) {
                        Array.prototype.unshift.apply( data, self.staticConfig.map( function( entry ) {
                            entry.static = true;
                            return entry;
                        } ) );
                    }

                    return data;
                } );
            },
            /**
             * Sorted usage configuration shortcut data
             * @type {array}
             */
            usageShortcutsData: function() {
                var
                    self = this;

                return ko.computed( function() {
                    var
                        usageConfigurationData = unwrap( self.usageConfigurationData ),
                        entryList = [].concat( usageConfigurationData );

                    entryList.sort( function( a, b ) {
                        return a.name.toLowerCase() > b.name.toLowerCase();
                    } );

                    return entryList;

                } );
            },
            /**
             * Sorted usage configuration shortcut data
             * @type {array}
             */
            usageShortcuts: function() {
                var
                    self = this,
                    usageShortcuts = ko.computed( function() {
                        var
                            usageShortcutsData = unwrap( self.usageShortcutsData ),
                            shortcuts = usageShortcutsData.filter( function( usageConfiguration ) {
                                return usageConfiguration.shortcutVisible;
                            } );

                        shortcuts.sort( function( a, b ) {
                            return a.shortcutIndex - b.shortcutIndex;
                        } );

                        shortcuts = shortcuts.map( function( usageConfiguration ) {
                            return UsageShortcutViewModel.createFromUsageConfiguration( usageConfiguration );
                        } );

                        return shortcuts;

                    } );

                return usageShortcuts;
            },
            /**
             * @property userConfigurationPending
             * @type {KoTable.CONST.userConfigurationPending}
             * @default KoTable.CONST.userConfigurationPending.NONE
             */
            userConfigurationPending: function() {
                return ko.observable( KoTable.CONST.userConfigurationPending.NONE );
            },
            /**
             * The data array from which the rows are made up.
             * @attribute data
             * @type {Array}
             */
            data: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observableArray() );

                return observable;
            },
            /**
             * Activates {{#crossLink "KoTable/dataMap:attribute"}}{{/crossLink}}
             * @attribute dataMapNeeded
             * @type {Boolean}
             * @default false
             */
            dataMapNeeded: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * A computed map of the data mapped by {{#crossLink "KoTable/dataMapPropertyName:property"}}{{/crossLink}}
             * - ensure activation by {{#crossLink "KoTable/dataMapNeeded:attribute"}}{{/crossLink}}
             * @attribute dataMap
             * @type {Object|null}
             */
            dataMap: function() {
                var
                    self = this,
                    observable = ko.computed( {
                        read: function() {
                            if( !unwrap( self.dataMapNeeded ) ) {
                                return null;
                            }
                            var
                                data = unwrap( self.data ),
                                map = {};

                            data.forEach( function( item, index ) {
                                if( self.dataMapPropertyName && self.dataMapPropertyName in item ) {
                                    map[item[self.dataMapPropertyName]] = item;
                                }
                                else {
                                    map[index] = item;
                                }
                            } );

                            return map;
                        },
                        write: function() {
                            Y.log( 'dataMap write not allowed', 'error', NAME );
                        }
                    } );

                return observable;
            },
            /**
             * Filtered data is needed for some use-cases where data can't be directly connected to rows.
             * E.g. it is necessary for local data when sorting and filtering.
             * @protected
             * @property _filteredData
             * @type {Array}
             */
            _filteredData: function() {
                var
                    self = this,
                    data = self.data,
                    observable = ko.observableArray();

                self.addDisposable( ko.computed( function() {
                    observable( unwrap( data ) );
                } ) );

                self.addDisposable( ko.computed( function() {
                    var
                        remote = unwrap( self.remote ),
                        filterParams, filteredData;

                    if( !remote ) {

                        filteredData = unwrap( data );
                        filterParams = unwrap( self.filterParams );

                        ignoreDependencies( function() {
                            var
                                dcQuery;

                            if( !Y.Object.isEmpty( filterParams ) ) {

                                dcQuery = new Y.doccirrus.DCQuery( Y.clone( filterParams, true ) );
                                dcQuery.checkOperators();
                                dcQuery = dcQuery.getQueryAsObj();

                                Y.each( filterParams, function( obj, forPropertyName ) {
                                    var
                                        column = self.getColumnByPropertyName( forPropertyName ),
                                        queryFilterType = column.queryFilterType,
                                        $orMapped,
                                        regEx;

                                    if( Y.Lang.isFunction( column.filterBy ) ) {

                                        filteredData = Y.Array.filter( filteredData, column.filterBy, column );
                                    }
                                    else {

                                        switch( queryFilterType ) {
                                            case DCQuery.ENUM_OPERATOR:
                                                // provides $in Array

                                                filteredData = Y.Array.filter( filteredData, function( item ) {
                                                    var
                                                        value = getObject( forPropertyName, item );

                                                    if( !value ) {
                                                        return false;
                                                    }

                                                    return dcQuery[forPropertyName].$in.some( function( $in ) {
                                                        return value === $in;
                                                    } );
                                                } );
                                                break;

                                            case DCQuery.KBVDOB_OPERATOR:
                                                // provides $gte String and $lt String or nothing if invalid

                                                filteredData = Y.Array.filter( filteredData, function( item ) {
                                                    var
                                                        value = getObject( forPropertyName, item ),
                                                        query = dcQuery[forPropertyName];

                                                    if( !(value && query) ) {
                                                        return false;
                                                    }

                                                    return moment( value ) >= moment( query.$gte ) && moment( value ) < moment( query.$lt );
                                                } );
                                                break;

                                            case DCQuery.QUARTER_YEAR:
                                                // provides $or Array with $gte Date and $lt Date

                                                $orMapped = Y.Array.filter( dcQuery.$or, function( $or ) {
                                                    return Boolean( $or[forPropertyName] );
                                                } ).map( function( $or ) {
                                                    return $or[forPropertyName];
                                                } );

                                                filteredData = Y.Array.filter( filteredData, function( item ) {
                                                    var
                                                        value = getObject( forPropertyName, item );

                                                    if( !value ) {
                                                        return false;
                                                    }

                                                    return $orMapped.some( function( range ) {
                                                        return moment( value ) >= moment( range.$gte ) && moment( value ) < moment( range.$lt );
                                                    } );
                                                } );
                                                break;

                                            case DCQuery.GTE_OPERATOR:
                                                // provides $gte String

                                                filteredData = Y.Array.filter( filteredData, function( item ) {
                                                    var
                                                        value = getObject( forPropertyName, item ),
                                                        query = dcQuery[forPropertyName];

                                                    if( !(Y.Lang.isValue( value ) && query) ) {
                                                        return false;
                                                    }

                                                    return value >= query.$gte;
                                                } );
                                                break;

                                            case DCQuery.GT_OPERATOR:
                                                // provides $gt String

                                                filteredData = Y.Array.filter( filteredData, function( item ) {
                                                    var
                                                        value = getObject( forPropertyName, item ),
                                                        query = dcQuery[forPropertyName];

                                                    if( !(Y.Lang.isValue( value ) && query) ) {
                                                        return false;
                                                    }

                                                    return value > query.$gt;
                                                } );
                                                break;

                                            case DCQuery.EQ_OPERATOR:
                                                // provides $eq String

                                                filteredData = Y.Array.filter( filteredData, function( item ) {
                                                    var
                                                        value = getObject( forPropertyName, item ),
                                                        query = dcQuery[forPropertyName];

                                                    if( !(Y.Lang.isValue( value ) && query) ) {
                                                        return false;
                                                    }

                                                    return value == query.$eq;//eslint-disable-line
                                                } );
                                                break;

                                            case DCQuery.EQ_BOOL_OPERATOR:
                                                // provides $eq Bool

                                                filteredData = Y.Array.filter( filteredData, function( item ) {
                                                    var
                                                        value = getObject( forPropertyName, item ),
                                                        query = dcQuery[forPropertyName];

                                                    if( 'undefined' === typeof value ) {
                                                        value = false;
                                                    }

                                                    if( !query ) {
                                                        return false;
                                                    }

                                                    return value == query.$eq;//eslint-disable-line
                                                } );
                                                break;

                                            case DCQuery.IREGEX_OPERATOR:
                                                // provides $regex RegExp

                                                filteredData = Y.Array.filter( filteredData, function( item ) {
                                                    return Boolean( dcQuery[forPropertyName].$regex.exec( getObject( forPropertyName, item ) ) );
                                                } );
                                                break;

                                            case 'eqNumber':
                                                // provides $eq Number

                                                filteredData = Y.Array.filter( filteredData, function( item ) {
                                                    var
                                                        value = getObject( forPropertyName, item ),
                                                        query = dcQuery[forPropertyName];

                                                    if( !(Y.Lang.isValue( value ) && query) ) {
                                                        return false;
                                                    }

                                                    return value === query.$eq;
                                                } );
                                                break;

                                            case DCQuery.REGEX_OPERATOR:
                                                // provides $regex String

                                                regEx = new RegExp( dcQuery[forPropertyName].$regex );
                                                filteredData = Y.Array.filter( filteredData, function( item ) {
                                                    return Boolean( regEx.exec( getObject( forPropertyName, item ) ) );
                                                } );
                                                break;

                                        }

                                    }

                                } );

                            }

                            observable( filteredData );

                        } );

                        self.totalItems( filteredData.length );
                    }
                } ).extend( { rateLimit: 0 } ) );

                return observable;
            },
            /**
             * The rows array representing the data for the current view
             * @property rows
             * @type {Array}
             * @readOnly
             */
            rows: function() {
                var
                    self = this,
                    observable = ko.computed( {
                        read: function() {
                            var
                                remote = unwrap( self.remote ),
                                isShowSummary = unwrap( self.summaryRow ),
                                fillRowsToLimit = unwrap( self.fillRowsToLimit ),
                                data = unwrap( self._filteredData ),
                                page = remote ? peek( self.paging.page ) : unwrap( self.paging.page ),// page notifies always - not remote doesn't change data, so a subscribe is needed
                                limit = unwrap( self.limit ),
                                totalItems = unwrap( self.totalItems ),
                                index, rows;

                            index = limit * (page - 1);
                            if( remote ) {
                                if( isShowSummary && 10000 > totalItems ) {
                                    self.summaryDataRow( data.splice( data.length - 1, data.length ) );
                                }
                                rows = data.slice( 0, limit );
                            } else {
                                rows = data.slice( index, index + limit );
                            }
                            // generate empty rows
                            while( fillRowsToLimit && rows.length < limit ) {
                                rows.push( KoTable.CONST.EMPTY_ROW );
                            }
                            return rows;
                        },
                        write: function() {
                            Y.log( 'rows write not allowed', 'error', NAME );
                        }
                    } ).extend( { rateLimit: 0 } );

                return observable;
            },
            /**
             * Array of properties which are considered stateful. This property will hold a list of component specific stateful property implementations.
             * @property statesAvailable
             * @for KoTable
             * @type {Array}
             * @default ['limit', 'usageConfigurationValue', 'usageShortcutsVisible', 'collapseRows', 'sort']
             */
            statesAvailable: function() {
                return ['limit', 'usageConfigurationValue', 'usageShortcutsVisible', 'collapseRows', 'sort'];
            },
            /**
             * @property header
             * @type {KoTableHeader}
             * @protected
             */
            header: function() {
                var
                    self = this,
                    aKoTableHeader = KoComponentManager.createComponent( {
                        componentType: 'KoTableHeader',
                        owner: self
                    } );

                if( self.templateNameHeader ) {
                    aKoTableHeader.templateName( self.templateNameHeader );
                }

                return aKoTableHeader;
            },
            /**
             * @property paging
             * @type {KoPaging}
             */
            paging: function() {
                var
                    self = this,
                    lastPages = 0,
                    computedPages = ko.computed( function() {
                        var
                            isInitial = ko.computedContext.isInitial(),
                            limit = unwrap( self.limit ),
                            totalItems = unwrap( self.totalItems ),
                            pages = Math.ceil( totalItems / limit );

                        if( !isInitial && lastPages !== pages ) {
                            // pages changed, not necessary to stay on current page
                            self.paging.page( 1 );
                        }
                        lastPages = pages;

                        return pages;
                    }, self );

                return KoComponentManager.createComponent( {
                    pages: computedPages
                }, 'KoPaging' );
            },
            /**
             * Scroll to top of table when paging
             * @attribute scrollToTopOfTableWhenPaging
             * @type {Boolean}
             * @default true
             */
            scrollToTopOfTableWhenPaging: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * @attribute maskedText
             * @type {String}
             * @default 'Please wait …'
             */
            maskedText: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( KoUI.i18n( 'KoUI.KoMask.text' ) ) );
            },
            /**
             * @attribute height
             * @type {Number}
             * @default 350
             */
            height: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 350 ) );
            },
            /**
             * The sorters array made up of the configured columns to be sortable
             * @property sorters
             * @type ko.observableArray
             * @protected
             */
            sorters: function() {
                var self = this,
                    columns = unwrap( self.columns ),
                    sortersTmp,
                    sortersLimit = self.sortersLimit,
                    observable = ko.observableArray(),
                    sortInitialIndexes,
                    localSorters;

                if( (peek( self.states) || []).indexOf( 'sort' ) !== -1 ){
                    localSorters = self.getState( 'sorters' );
                }

                if( localSorters && localSorters.length ){
                    sortersTmp = localSorters.map( function( config ){
                        var column = self.getColumnByPropertyName( config.forPropertyName );
                        if( column && peek( column.isSortable ) ) {
                            column.direction( config.direction );
                            if( column.initialConfig ){
                                column.initialConfig.direction = config.direction;
                            }
                        }
                        return column;
                    });
                } else {
                    // filter columns for sortable
                    sortersTmp = Y.Array.filter( columns, function( column ) {
                        return unwrap( column.isSortable );
                    } );

                    // initial order (stable) of sorters

                    sortInitialIndexes = Y.Array.filter( sortersTmp, function( column ) {
                        return Y.Lang.isValue( column.sortInitialIndex );
                    } );

                    sortInitialIndexes.sort( function( a, b ) {
                        return a.sortInitialIndex - b.sortInitialIndex;
                    } );

                    sortInitialIndexes.forEach( function( column ) {
                        sortersTmp.splice( sortersTmp.indexOf( column ), 1 );
                    } );

                    sortersTmp.unshift.apply( sortersTmp, sortInitialIndexes );
                }

                // clean sorters in regards to sortersLimit
                if( 0 !== sortersLimit ) {
                    sortersTmp = Y.Array.filter( sortersTmp, function( column, index ) {
                        return index < sortersLimit;
                    } );
                }

                self.sortersInitialState( sortersTmp );
                observable.push.apply( observable, sortersTmp );

                self.addDisposable( ko.computed( function() {
                    var data, sorters;
                    if( !unwrap( self.remote ) ) {
                        data = unwrap( self._filteredData );
                        sorters = unwrap( observable );

                        utilsArray.sort( {
                            sorters: sorters.map( ColumnToSorterMapper ),
                            array: data
                        } );

                        self._filteredData( data );
                    }
                } ) );

                return observable;

            },
            /**
             * Holds the initial {{#crossLink "KoTable/sorters:property"}}{{/crossLink}} state
             * @property sortersInitialState
             * @type {ko.observableArray(Array)}
             */
            sortersInitialState: function() {
                return ko.observableArray();
            },
            /**
             * The filters array made up of the configured columns to be filterable
             * @property filters
             * @type ko.observableArray
             * @protected
             */
            filters: function() {
                var
                    self = this,
                    columns = unwrap( self.columns ),
                    observable = ko.observableArray(),
                    lastHash;

                columns.forEach( function( column ) {
                    if( peek( column.isFilterable ) ) {
                        observable.push( column );
                    }
                } );

                self.addDisposable( ko.computed( function() {
                    var
                        filterParams = {},
                        filters = unwrap( observable ),
                        filtersHash,
                        filterValue,
                        isValid,
                        isVisible;

                    // collect the filter properties
                    filters.forEach( function( column ) {
                        filterValue = unwrap( column.filterField.value );
                        isVisible = unwrap( column.visible );
                        isValid = (
                            (Y.Lang.isString( filterValue ) && filterValue) ||
                            (Y.Lang.isArray( filterValue ) && filterValue.length) ||
                            (Y.Lang.isNumber( filterValue )) ||
                            ( Y.Lang.isBoolean( filterValue ) || (Y.Lang.isObject( filterValue ) && filterValue.date1 && filterValue.date2) )
                        );

                        if( isValid && isVisible ) {
                            filterParams[column.filterPropertyName] = column.getQueryFilterObject( filterValue );
                        }
                    } );
                    filtersHash = String( fastHash( filterParams ) );
                    if( lastHash === filtersHash ) {
                        // no further processing, current is identically to last hash
                        return;
                    }
                    lastHash = filtersHash;
                    // update
                    self.filterParams( filterParams );
                    // filters changed, not necessary to stay on current page
                    self.paging.page( 1 );
                } ) );

                return observable;
            },
            /**
             * Holds the initial columns {{#crossLink "KoTableColumn/positionIndex:attribute"}}{{/crossLink}} sorting state
             * @property positionIndexColumnsInitialState
             * @type {ko.observableArray(Array)}
             */
            positionIndexColumnsInitialState: function() {
                return ko.observableArray();
            },
            /**
             * flag indicating that the user must have dragged a column at least once
             * - necessary to prevent localStorage pollution with positionIndex on instantiation by reset
             * @property _userHasDraggedColumnAtLeastOnce
             * @type {ko.observable(Boolean)}
             * @default false
             * @protected
             */
            _userHasDraggedColumnAtLeastOnce: function( key ) {
                var
                    self = this,
                    observable = ko.observable( false ),
                    stateValue = self.getState( key );

                if( !Y.Lang.isUndefined( stateValue ) ) {
                    observable( stateValue );
                }

                self.addDisposable( observable.subscribe( function( value ) {
                    self.setState( key, value );
                } ) );

                return observable;
            },
            /**
             * Configure rows to be draggable
             * @attribute draggableRows
             * @type {ko.observable(Boolean)}
             * @default false
             */
            draggableRows: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( false ) );

                self.addDisposable( ko.computed( function() {
                    unwrap( self.collapseRows );
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
            /**
             * Configure table paddingLeft
             * The padding left will be the width of all the fixed columns
             * This is needed to shrink the viewport of the table
             * so the fixed columns (in the left) doesn't cover space
             * from the content shown
             * @attribute computedPaddingLeft
             * @type {ko.observable(String)}
             */
            computedPaddingLeft: function() {
                var
                    self = this;

                return ko.computed( function() {
                    var
                        paddingLeftValue = 0;

                    paddingLeftValue = unwrap( self.columns ).reduce(function(acc, column) {
                        if ( unwrap( column.isFixed ) && unwrap( column.visible ) ) {
                            acc += parseInt( column.widthComputed(), 10 );
                        }

                        return acc;
                    }, paddingLeftValue);

                    return paddingLeftValue + 'px';
                } ).extend( { rateLimit: 300 } );
            },
            /**
             * Configure columns to be draggable
             * @attribute draggableColumns
             * @type {ko.observable(Boolean)}
             * @default true
             */
            draggableColumns: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( true ) );

                self.addDisposable( ko.computed( function() {
                    var
                        rendered = unwrap( self.rendered ),
                        draggableColumns = unwrap( observable );

                    ignoreDependencies( function() {

                        self.destroyDraggableColumns();

                        if( rendered && draggableColumns ) {

                            self.initDraggableColumns();

                        }
                    } );

                } ) );

                return observable;
            },
            /**
             * Will enable [popovers](http://getbootstrap.com/javascript/#popovers) for this table rows.
             * You can overwrite the example output by providing your own "onRowPopover" implementation
             * @attribute rowPopover
             * @type {Boolean}
             * @default false
             * @see onRowPopover
             * @example
             // … ,
             rowPopover: true,
             onRowPopover: function( config, data ) {
                // have a look at config for further configurations
                // you should also care about previously set options
                config.title = 'Info for lastname: ' + data.lastname;
                config.content = 'lastnames firstname is: ' + data.firstname;
                return; // when returning false the popover won't show for that row
            }
             */
            rowPopover: function( key ) {
                var
                    self = this,
                    observable = self._handleLazyConfig( key, ko.observable( false ) );

                if( Y.UA.touchEnabled ) {
                    observable( false );
                }

                return observable;
            },
            /**
             * @attribute remote
             * @type {Boolean}
             * @default false
             */
            remote: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Automatically let the proxy request data if this table is applied to a DOM element
             * @attribute autoLoad
             * @type {Boolean}
             * @default true
             */
            autoLoad: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * @property _lastParams
             * @protected
             */
            _lastParams: function() {
                return ko.observable( {} );
            },
            /**
             * The observable filter params Object
             * @property filterParams
             * @type Object
             * @default {}
             */
            filterParams: function() {
                return ko.observable( {} );
            },
            /**
             * @attribute fillRowsToLimit
             * @type {Boolean}
             * @default false
             */
            fillRowsToLimit: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Set if the response contains the additional summary row.
             * Summary row should be the last record in the response
             * @attribute isSummaryRow
             * @type {Boolean}
             * @param {Boolean} key option
             * @returns {Observable}
             */
            summaryRow: function( key ) {
                var
                    self = this;
                return self._handleLazyConfig( key, ko.observable( false ) );
            },

            /**
             *  Controlling the state of summary row
             */
            hideSummaryRow: function( key ) {
                var
                    self = this;
                return self._handleLazyConfig( key, ko.observable( false ) );
            },

            /**
             * See [Responsive tables](http://getbootstrap.com/css/#tables-responsive).
             * @attribute responsive
             * @type {Boolean}
             * @default true
             */
            responsive: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * The min-width to use for the table when it is {{#crossLink "KoTable/responsive:attribute"}}{{/crossLink}}
             * @attribute responsiveMinWidth
             * @type {String}
             * @default '470px'
             */
            responsiveMinWidth: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( '470px' ) );
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

                return self._handleLazyConfig( key, ko.observable( '' ) );
            },
            /**
             * see [Bordered table](http://getbootstrap.com/css/#tables-bordered).
             * @attribute bordered
             * @type {Boolean}
             * @default true
             */
            bordered: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * See [Condensed table](http://getbootstrap.com/css/#tables-condensed).
             * @attribute condensed
             * @type {Boolean}
             * @default false
             */
            condensed: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * See [Striped rows](http://getbootstrap.com/css/#tables-striped).
             * @attribute striped
             * @type {Boolean}
             * @default true
             */
            striped: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( true ) );
            },
            /**
             * @attribute currentRowPosition
             * @type {object}
             * @default {}
             */
            currentRowPosition: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( {} ) );
            },
            /**
             * @attribute moveWithKeyboard
             * @type {Boolean}
             * @default false
             */
            moveWithKeyboard: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * @attribute selectWithNavigate
             * @type {Boolean}
             * @default false
             */
            selectWithNavigate: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * @attribute selectWithNavigate
             * @type {Boolean}
             * @default false
             */
            selectOnHover: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * @attribute cellForClick
             * @type {Number}
             * @default 1
             */
            cellForClick: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 0 ) );
            },
            /**
             * @attribute templateNameRow
             * @type {String}
             * @default 'KoTableRow'
             * @protected
             */
            templateNameRow: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableRow' ) );
            },

            templateNameSummaryRow: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoTableSummaryRow' ) );
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
            /**
             * @attribute limit
             * @type {Number}
             * @default 10
             */
            limit: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 10 ), {
                    stateful: true
                } );
            },

            summaryDataRow: function( key ) {
                var
                    self = this;
                return self._handleLazyConfig( key, ko.observable() );
            },
            /**
             * @attribute limitList
             * @type {Array}
             * @default [5, 10, 20, 50]
             */
            limitList: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observableArray( [5, 10, 20, 50] ) );
            },
            /**
             * @property totalItems
             * @type {Number}
             * @default 0
             */
            totalItems: function() {
                return ko.observable( 0 );
            },
            /**
             * @property extraMeta
             * @type {Object}
             * @default emptyObject
             */
            extraMeta: function() {
                return ko.observable( {} );
            },
            /**
             * @property loading
             * @type {Boolean}
             * @default false
             */
            loading: function() {
                return ko.observable( false );
            },
            /**
             * single, multi, none
             * @attribute selectMode
             * @type {String}
             * @default 'single'
             */
            selectMode: function( key ) {
                var
                    self = this;
                return self._handleLazyConfig( key, ko.observable( 'single' ) );
            },
            /**
             * Not really implemented.
             * @attribute scrollable
             * @type {Boolean}
             * @default false
             * @private
             */
            scrollable: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            forceComputedStylesUpdate: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 0 ) );
            },
            shouldComputeCellStyles: function() {
                var
                    self = this;

                return ko.computed( function() {
                    unwrap( self.columns ).forEach( function( column ) {
                        unwrap( column.visible );
                        unwrap( column.isFixed );
                    } );

                    unwrap( self._filteredData );

                    unwrap( self.rowsRendered );

                    unwrap( self.forceComputedStylesUpdate );
                } ).extend( { notify: 'always', rateLimit: { timeout: 100, method: "notifyWhenChangesStop" } } );
            },
            /**
             * An observable boolean computing if columns have at least one fixed
             * @property haveColumnsAtLeastOneFixed
             * @type {boolean}
             * @readOnly
             */
            haveColumnsAtLeastOneFixed: function() {
                var
                    self = this;

                return ko.computed( function() {

                    return Y.Array.some( unwrap( self.columns ), function( column ) {
                        return unwrap( column.isFixed );
                    } );
                } );
            },
            /**
             * An observable boolean computing if columns have at least one sortable
             * @property haveColumnsAtLeastOneSortable
             * @type {boolean}
             * @readOnly
             */
            haveColumnsAtLeastOneSortable: function() {
                var
                    self = this;

                return ko.computed( function() {

                    return Y.Array.some( unwrap( self.columns ), function( column ) {
                        return unwrap( column.isSortable );
                    } );
                } );
            },
            /**
             * An observable boolean computing if columns have at least one filter
             * @property haveColumnsAtLeastOneFilterable
             * @type {boolean}
             * @readOnly
             */
            haveColumnsAtLeastOneFilterable: function() {
                var
                    self = this;

                return ko.computed( function() {

                    return Y.Array.some( unwrap( self.columns ), function( column ) {
                        return unwrap( column.isFilterable );
                    } );
                } );
            },
            /**
             * An observable boolean computing if columns have at least one editor
             * @property haveColumnsAtLeastOneEditable
             * @type {boolean}
             * @readOnly
             */
            haveColumnsAtLeastOneEditable: function() {
                var
                    self = this;

                return ko.computed( function() {

                    return Y.Array.some( unwrap( self.columns ), function( column ) {
                        return unwrap( column.isEditable );
                    } );
                } );
            },
            /**
             * Disabled attribute for the action for giving the user some tools for the table
             * @attribute toolsDisabled
             * @type {boolean}
             * @default false
             */
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

            /**
             * The action for giving the user some tools for the table
             * @property toolsAction
             * @type {KoButtonDropDown}
             */
            toolsAction: function() {
                var
                    self = this,
                    toolMenuItems = self.getToolsActionItems();

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
                            items: toolMenuItems
                        }
                    }
                );
            },

            /**
             * Configuration attribute for the action for exporting to csv.
             * Might consume customized renderer or other column specific things.
             * @attribute exportCsvConfiguration
             * @type {exportCsvConfigurationObject}
             * @default {columns:Object[]}
             * @example
             exportCsvConfiguration: {
                   columns: [
                       {
                           forPropertyName: 'talk',
                           stripHtml: true // simple strip html using the fastest strip html technique
                       },
                       {
                           forPropertyName: 'firstname',
                           visible: false // don't show this column in the csv export
                       },
                       {
                           forPropertyName: 'lastname',
                           label: 'lastname other label', // use an other label for that column
                           renderer: function( meta, resultOrigRenderer ) { // receive the original renderer's output and modify it
                               return 'customized: ' + resultOrigRenderer;
                           }
                       },
                       {
                           forPropertyName: 'dob',
                           stripHtml: { // configure customized strip html technique
                               stripFn: 'safeStrip', // lookup this function inside Y.doccirrus.utils.stripHTML
                               stripArgs: [{keepLinks: true}] // and use these additional arguments
                           }
                       }
                   ]
                   // NOTE: A column can have a renderer and stripHtml - in this case first the renderer is used and stripHtml receives his output.
                },
             */
            exportCsvConfiguration: function( key ) {
                var
                    self = this,
                    defaults = {
                        columns: []
                    },
                    configuration = self._handleLazyConfig( key, ko.observable( {} ) ),
                    content = peek( configuration );

                Y.mix( content, Y.aggregate( defaults, peek( configuration ), true ), true );

                return configuration;
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
             * Value of collapsing mode.
             * @attribute collapseRows
             * @type {boolean}
             * @default false
             */
            collapseRows: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ), {
                    stateful: true
                } );
            },
            /**
             * Disabled attribute for the action of collapsing rows.
             * @attribute collapseRowsActionDisabled
             * @type {boolean}
             * @default false
             */
            collapseRowsActionDisabled: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Visible attribute for the action of collapsing rows.
             * @attribute collapseRowsActionVisible
             * @type {boolean}
             * @default false
             */
            collapseRowsActionVisible: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },

            /**
             * Possibility to use renderAdditionalDependentCollapseRows in normal view (not compact)
             * This allows by default show collapsed and not collapsed rows together
             * @param key
             * @returns {Boolean}
             */
            collapseMixedMode: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },

            /**
             * An observableArray of {{#crossLink "KoTableDataModification"}}{{/crossLink}} entries.
             * To work with see:
             * - {{#crossLink "KoTable/clearModified:method"}}{{/crossLink}}
             * - {{#crossLink "KoTable/updateModified:method"}}KoTable.updateModified{{/crossLink}}
             * - {{#crossLink "KoTableColumn/updateModified:method"}}KoTableColumn.updateModified{{/crossLink}}
             * - {{#crossLink "KoTableDataModification/update:method"}}KoTableDataModification.update{{/crossLink}}
             * - {{#crossLink "KoTableDataModification/revert:method"}}KoTableDataModification.revert{{/crossLink}}
             * - {{#crossLink "KoTableDataModification/destroy:method"}}KoTableDataModification.destroy{{/crossLink}}
             * @property dataModifications
             * @type {Array}
             * @default []
             * @readOnly
             */
            dataModifications: function() {
                var
                    self = this;

                // when data changes modifications will be cleared
                self.addDisposable( self.data.subscribe( function() {
                    self.clearModified();
                } ) );

                return ko.observableArray().extend( { rateLimit: 0 } );
            },
            /**
             * Disabled attribute for {{#crossLink "KoTable/usageConfiguration:property"}}{{/crossLink}}
             * @attribute usageConfigurationDisabled
             * @type {boolean}
             * @default false
             */
            usageConfigurationDisabled: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ) );
            },
            /**
             * Computes visibility for {{#crossLink "KoTable/usageConfiguration:property"}}{{/crossLink}}
             * @property usageConfigurationVisible
             * @type {ko.computed}
             */
            usageConfigurationVisible: function() {
                var
                    self = this;

                return ko.computed( function() {
                    var
                        usageConfigurationDisabled = unwrap( self.usageConfigurationDisabled ),
                        haveColumnsAtLeastOneFilterable = unwrap( self.haveColumnsAtLeastOneFilterable ),
                        haveColumnsAtLeastOneSortable = unwrap( self.haveColumnsAtLeastOneSortable );

                    return !usageConfigurationDisabled && (haveColumnsAtLeastOneFilterable || haveColumnsAtLeastOneSortable);
                } );
            },
            /**
             * Component to manage the persist-able usage configuration of this KoTable, such as saving and restoring filter values and sorting states
             * @property usageConfiguration
             * @type {KoTableUsageConfiguration}
             */
            usageConfiguration: function() {
                var
                    self = this;

                return KoComponentManager.createComponent( {
                    name: 'KoTableUsageConfiguration',
                    owner: self,
                    visible: ko.computed( function() {
                        return unwrap( self.usageConfigurationVisible );
                    } )
                }, 'KoTableUsageConfiguration' );
            },
            /**
             * @attribute usageConfigurationValue
             * @type {undefined|String}
             * @default undefined
             */
            usageConfigurationValue: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable(), {
                    stateful: true
                } );
            },
            /**
             * keeps permafilters applied.
             * @property multiFiltersConfiguration
             * @type {ko.observableArray(Array)}
             */
            multiFiltersConfiguration: function() {
                return ko.observableArray();
            },
            /**
             * An observable array computing which params have changed in regards to the last ones
             * @property lastParamChanges
             * @type {ko.observableArray(Array)}
             * @readOnly
             */
            lastParamChanges: function() {
                return ko.observableArray();
            },
            /**
             * Computes visibility of the filter shortcut buttons row
             * @property computedVisibilityOfUsageShortcutsRow
             * @type {boolean}
             * @readOnly
             */
            computedVisibilityOfUsageShortcutsRow: function() {
                var
                    self = this;

                return ko.computed( function() {
                    var
                        usageConfigurationDisabled = unwrap( self.usageConfigurationDisabled ),
                        userConfigurationPending = unwrap( self.userConfigurationPending );

                    if( usageConfigurationDisabled ) {
                        return false;
                    }

                    if( userConfigurationPending === KoTable.CONST.userConfigurationPending.READ ) {
                        return false;
                    }

                    return true;
                } );
            },
            /**
             * Visible attribute for the filter shortcut buttons
             * @attribute usageShortcutsVisible
             * @type {boolean}
             * @default false
             * @protected
             */
            usageShortcutsVisible: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( false ), {
                    stateful: true
                } );
            }
        }
    } );
    /**
     * @property KoTable
     * @type {KoTable}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoTable );

}, '3.16.0', {
    requires: [
        'oop',
        'dd-delegate', 'dd-drop', 'dd-proxy', 'dd-constrain', 'dd-scroll',

        'dcquery',
        'dccommonutils',
        'dcutils',
        'dcutils-saveAs',
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'DCWindow',

        'KoUI',
        'KoUI-utils-Array',
        'KoUI-utils-Object',
        'KoUI-utils-Function',
        'KoUI-utils-Math',
        'KoComponentManager',
        'KoComponent',
        'KoField',
        'KoButton',
        'KoCounter',
        'KoPaging',
        'KoToolbar',

        'printkotable-modal'
    ]
} );
