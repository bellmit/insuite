/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _ */
YUI.add( 'PatientGadgetConfigurableTableBase', function( Y, NAME ) {
    'use strict';
    /**
     * @module PatientGadgetConfigurableTableBase
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        getObject = Y.doccirrus.commonutils.getObject,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' ),
        i18n = Y.doccirrus.i18n,
        defaultActTypes = ['invoice', 'receipt', 'creditNote', 'warning1', 'warning2', 'reminder'],

        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        GADGET_UTILS = GADGET.utils,
        TPL_PATH_PATIENT = GADGET_CONST.paths.TPL_PATIENT;

    function TableHeader( config ) {
        var
            self = this;

        self.label = ko.observable( config.label );
    }

    function ItemProperty( value, data, column ) {
        var
            self = this;

        self.sourceData = ko.observable( value );
        if( Y.Lang.isFunction( column.converter ) ) {
            value = column.converter( value, data );
        }
        self.title = ko.observable( value );

        if( Y.Lang.isFunction( column.renderer ) ) {
            value = column.renderer( value, data );
        }
        self.html = ko.observable( value );
    }

    function Item( data, owner ) {
        var
            self = this;

        owner.columns.peek().forEach( function( column ) {
            self[column.key.peek()] = ko.observable( new ItemProperty( getObject( column.key.peek(), data ), data, column ) );
        } );
        self.id = ko.observable( data._id );

    }

    function Column( config ) {
        var
            self = this;

        self.tableHeader = ko.observable( new TableHeader( {
            label: config.label
        } ) );
        self.key = ko.observable( config.key );

        if( config.converter ) {
            self.converter = config.converter;
        }
        if( config.renderer ) {
            self.renderer = config.renderer;
        }
    }

    /**
     * Default value converter. Should not return markup.
     * @param {String} value Received value determined by column key
     * @param {Object} data
     * @returns {*}
     */
    Column.prototype.converter = function( value/*, data*/ ) {
        return value;
    };
    /**
     * Default value renderer. May return markup.
     * @param {String} value Received value from converter determined by column key
     * @param {Object} data
     * @returns {*}
     */
    Column.prototype.renderer = function( value/*, data*/ ) {
        return value;
    };

    function GadgetTable( /*config*/ ) {
        var
            self = this;

        self.noDataI18n = i18n( 'PatientHeaderDashboard.PatientGadgetConfigurableTableBase.noData' );

        self.columns = ko.observableArray().extend( { rateLimit: 0 } );
        self.items = ko.observableArray().extend( { rateLimit: 0 } );
        self.columnHeaderVisible = ko.observable( true );
    }

    GadgetTable.TableHeader = TableHeader;
    GadgetTable.ItemProperty = ItemProperty;
    GadgetTable.Item = Item;
    GadgetTable.Column = Column;

    /**
     * Add supplied column
     * @param {Object} column
     */
    GadgetTable.prototype.addColumn = function( column ) {
        this.columns.push( new Column( column ) );
    };
    /**
     * Add supplied columns
     * @param {Array} columns
     */
    GadgetTable.prototype.addColumns = function( columns ) {
        columns.forEach( this.addColumn, this );
    };
    /**
     * Clear all columns
     */
    GadgetTable.prototype.clearColumns = function() {
        this.columns.removeAll();
    };
    /**
     * Clear all columns and add the supplied ones
     * @param {Array} columns
     */
    GadgetTable.prototype.setColumns = function( columns ) {
        this.clearColumns();
        this.addColumns( columns );
    };

    /**
     *
     * @param {boolean} columnHeaderVisible hide or show table header
     */
    GadgetTable.prototype.setColumnHeaderVisible = function( columnHeaderVisible ) {
        this.columnHeaderVisible( columnHeaderVisible );
    };
    /**
     * Add supplied item
     * @param {Object} item
     */
    GadgetTable.prototype.addItem = function( item ) {
        this.items.push( new Item( item, this ) );
    };
    /**
     * Add supplied items
     * @param {Array} items
     */
    GadgetTable.prototype.addItems = function( items ) {
        items.forEach( this.addItem, this );
    };
    /**
     * Clear all items
     */
    GadgetTable.prototype.clearItems = function() {
        this.items.removeAll();
    };
    /**
     * Clear all items and add the supplied ones
     * @param {Array} items
     */
    GadgetTable.prototype.setItems = function( items ) {
        this.clearItems();
        this.addItems( items );
    };

    GadgetTable.prototype.onRowClick = function( /*meta, $event*/ ) {
        // meant to override
        return true;
    };

    /**
     * @constructor
     * @class PatientGadgetConfigurableTableBase
     * @extends PatientGadget
     */
    function PatientGadgetConfigurableTableBase() {
        PatientGadgetConfigurableTableBase.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetConfigurableTableBase, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initPatientGadgetConfigurableTableBase();
        },
        /** @private */
        destructor: function() {
        },
        /**
         * If this Gadget is editable
         * @property editable
         * @type {Boolean}
         * @default true
         * @for PatientGadgetConfigurableTableBase
         */
        editable: true,
        /**
         * Default limit of entries to load for the table
         * @property defaultLoadLimit
         * @type {Number}
         * @default 7
         */
        defaultLoadLimit: 30,
        /**
         * The used limit of entries to load for the table
         * @property loadLimit
         * @type {Number}
         * @default 7
         */
        loadLimit: 7,
        /**
         * @property showOnlyPrescribed
         * @type {ko.observable|Boolean}
         * @default false
         */
        showOnlyPrescribed: false,
        /**
         * @property filterResult
         * @type {ko.observable|String}
         * @default false
         */
        defaultFilterResult: [],
        /**
         * @property showPathologicalOnly
         * @type {ko.observable|Boolean}
         * @default false
         */
        defaultShowPathologicalOnly: false,
        /**
         * @property showNotes
         * @type {ko.observable|Boolean}
         * @default false
         */
        defaultShowNotes: false,
        /**
         * @property showHighLow
         * @type {ko.observable|Boolean}
         * @default false
         */
        defaultShowHighLow: false,
        /**
         * @property showOnlyOverdue
         * @type {ko.observable|Boolean}
         * @default false
         */
        showOnlyOverdue: false,
        /**
         * @property showOnlyContinuousMed
         * @type {ko.observable|Boolean}
         * @default false
         */
        showOnlyContinuousMed: false,
        /**
         * @property serverUrl
         * @type {ko.observable|String}
         * @default ''
         */
        serverUrl: '',
        /**
         * @property serverPort
         * @type {ko.observable|String}
         * @default ''
         */
        serverPort: '',
        /**
         * @property serverLocation
         * @type {ko.observable|String}
         * @default ''
         */
        serverLocation: '',
        /**
         * @property serverUserFirstName
         * @type {ko.observable|String}
         * @default ''
         */
        serverUserFirstName: '',
        /**
         * @property serverUserLastName
         * @type {ko.observable|String}
         * @default ''
         */
        serverUserLastName: '',
        /**
         * @property onlyLastDLDiagnosis
         * @type {ko.observable|Boolean}
         * @default false
         */
        onlyLastDLDiagnosis: false,
        /** @private */
        _initPatientGadgetConfigurableTableBase: function() {
            var
                self = this,
                selfPrototype = self.constructor.prototype;

            self.table = self._createTable();
            self.showOnlyPrescribed = ko.observable( selfPrototype.showOnlyPrescribed );
            self.showOnlyOverdue = ko.observable( selfPrototype.showOnlyOverdue );

            self.showPathologicalOnly = ko.observable( selfPrototype.defaultShowPathologicalOnly );
            self.showNotes = ko.observable( selfPrototype.defaultShowNotes );
            self.showHighLow = ko.observable( selfPrototype.defaultShowHighLow );
            self.showOnlyContinuousMed = ko.observable( selfPrototype.showOnlyContinuousMed );
            self.serverUrl = ko.observable( selfPrototype.serverUrl );
            self.serverPort = ko.observable( selfPrototype.serverPort );
            self.serverLocation = ko.observable( selfPrototype.serverLocation );
            self.serverUserFirstName = ko.observable( selfPrototype.serverUserFirstName );
            self.serverUserLastName = ko.observable( selfPrototype.serverUserLastName );
            self.onlyLastDLDiagnosis = ko.observable( selfPrototype.onlyLastDLDiagnosis );

            defaultActTypes.forEach( function( type ) {
                self[type] = ko.observable( selfPrototype[type] );
            });

            self._createTableColumns();
            self._initLoadLimit();
            self._initShowOnlyPrescribed();
            self._initShowOnlyPrescribed();
            self._initShowOnlyContinuousMed();
            self._initShowOnlyOverdue();
            self._initShowActivities();
            self._initVaccinationData();

            if ( this.name === 'PatientGadgetLatestLabData' || this.name === 'PatientGadgetLatestMedData' ) {
                self._initFilterResult();
            }

            if ( this.name === 'PatientGadgetLatestLabData' ) {
                self._initLatestLabDataFlags();
            }

            if( this.name === 'PatientGadgetLastDLDiagnosis') {
                self._initOnlyLastDLDiagnosis();
            }

        },
        /** @protected */
        _createTable: function() {
            return new GadgetTable();
        },
        /** @protected */
        _getTableColumns: function() {
            var
                self = this,
                constructorName = self.constructor.name,
                availableConfigurableTableColumns = self.get( 'availableConfigurableTableColumns' ),
                defaultConfigurableTableColumns = self.get( 'defaultConfigurableTableColumns' ),
                model = self.get( 'gadgetModel' ),
                config = getObject( 'configurableTable.columns', unwrap( model.config ) ) || defaultConfigurableTableColumns,
                columnsMap = {},
                columns = [];

            availableConfigurableTableColumns.forEach( function( item ) {
                if( -1 < config.indexOf( item.val ) ) {
                    columnsMap[item.val] = item;
                }
            } );

            config.forEach( function( key ) {
                var
                    columnsMapValue = columnsMap[key],
                    propName = GADGET_LAYOUT_PATIENT.getConfigurableTablePropNameForByConst( constructorName, key );

                if( columnsMapValue && propName ) {
                    columns.push( {
                        key: propName,
                        label: columnsMapValue.i18n,
                        converter: columnsMapValue.converter,
                        renderer: columnsMapValue.renderer
                    } );
                }
            } );

            return columns;

        },
        /** @private */
        _createTableColumns: function() {
            var
                self = this,
                columns = self._getTableColumns();

            self.table.setColumns( columns );

        },
        /** @private */
        _initLoadLimit: function() {
            var
                self = this,
                model = self.get( 'gadgetModel' ),
                modelConfig = unwrap( model.config ),
                limit = getObject( 'configurableTable.limit', modelConfig ) || self.constructor.prototype.defaultLoadLimit;

            self.loadLimit = limit;
        },
        _initFilterResult: function() {
            var
                self = this,
                model = self.get( 'gadgetModel' ),
                modelConfig = unwrap( model.config ),
                filterResult = getObject( 'configurableTable.filterResult', modelConfig ) || self.constructor.prototype.defaultFilterResult;

            if (typeof filterResult === 'string') {
                filterResult = _.map(filterResult.split(','), _.trim);
            }

            self.filterResult = filterResult;
        },
        _initLatestLabDataFlags: function() {
            var
                self = this,
                model = self.get( 'gadgetModel' ),
                modelConfig = unwrap( model.config ),
                showPathologicalOnly = getObject( 'showPathologicalOnly', modelConfig ) || self.constructor.prototype.defaultShowPathologicalOnly,
                showNotes = getObject( 'showNotes', modelConfig ) || self.constructor.prototype.defaultShowNotes,
                showHighLow = getObject( 'showHighLow', modelConfig ) || self.constructor.prototype.defaultShowHighLow,
                valueColumnTableHeader,
                latestLabDataTable = self.table && peek(self.table.columns);

            if (latestLabDataTable && latestLabDataTable.length > 0) {
                latestLabDataTable.forEach( function (item) {
                    if (peek(item.key) === 'labTestResultVal') {
                        valueColumnTableHeader = item.tableHeader;
                    }
                });
            }


            self.showPathologicalOnly( showPathologicalOnly );
            self.showNotes( showNotes );
            self.showHighLow( showHighLow );

            if ( valueColumnTableHeader ) {
                valueColumnTableHeader( Object.assign({}, peek(valueColumnTableHeader), {
                    showNotes: showNotes,
                    showHighLow: showHighLow
                }));
            }
        },
        _initShowOnlyPrescribed: function() {
            var
                self = this,
                selfPrototype = self.constructor.prototype,
                model = self.get( 'gadgetModel' ),
                modelConfig = unwrap( model.config ),
                showOnlyPrescribed = getObject( 'showOnlyPrescribed', modelConfig ) || selfPrototype.showOnlyPrescribed;

            self.showOnlyPrescribed( showOnlyPrescribed );
        },
        _initShowOnlyContinuousMed: function() {
            var
                self = this,
                selfPrototype = self.constructor.prototype,
                model = self.get( 'gadgetModel' ),
                modelConfig = unwrap( model.config ),
                showOnlyContinuousMed = getObject( 'showOnlyContinuousMed', modelConfig) || selfPrototype.showOnlyContinuousMed;

            self.showOnlyContinuousMed( showOnlyContinuousMed );
        },
        _initShowActivities: function() {
            var
                self = this,
                selfPrototype = self.constructor.prototype,
                model = self.get( 'gadgetModel' ),
                modelConfig = unwrap( model.config );

            defaultActTypes.forEach( function(type) {
                self[type] = getObject( type, modelConfig ) || selfPrototype[type];
            } );
        },
        _initShowOnlyOverdue: function() {
            var
                self = this,
                selfPrototype = self.constructor.prototype,
                model = self.get( 'gadgetModel' ),
                modelConfig = unwrap( model.config ),
                showOnlyOverdue = getObject( 'showOnlyOverdue', modelConfig ) || selfPrototype.showOnlyOverdue;

            self.showOnlyOverdue( showOnlyOverdue );
        },
        _initVaccinationData: function() {
            var
                self = this,
                //selfPrototype = self.constructor.prototype,
                model = self.get( 'gadgetModel' ),
                modelConfig = unwrap( model.config ),
                serverUrl = getObject( 'serverUrl', modelConfig ),
                serverPort = getObject( 'serverPort', modelConfig ),
                serverLocation = getObject( 'serverLocation', modelConfig ),
                serverUserFirstName = getObject( 'serverUserFirstName', modelConfig ),
                serverUserLastName = getObject( 'serverUserLastName', modelConfig );

            self.serverUrl( serverUrl );
            self.serverPort( serverPort );
            self.serverLocation( serverLocation );
            self.serverUserFirstName( serverUserFirstName );
            self.serverUserLastName( serverUserLastName );
        },
        _initOnlyLastDLDiagnosis: function() {
            var
                self = this,
                selfPrototype = self.constructor.prototype,
                model = self.get( 'gadgetModel' ),
                modelConfig = unwrap( model.config ),
                onlyLastDLDiagnosis = getObject( 'onlyLastDLDiagnosis', modelConfig ) || selfPrototype.onlyLastDLDiagnosis;

            self.onlyLastDLDiagnosis( onlyLastDLDiagnosis );
        }
    }, {
        NAME: 'PatientGadgetConfigurableTableBase',
        ATTRS: {
            /**
             * Some sort of markup string
             * - can be a promise to fulfill with a string (returned by valueFn)
             *
             * NOTE: this one is actually used in the context of PatientGadgetEditGadget
             *
             * @for PatientGadgetConfigurableTableBase
             */
            editTemplate: {
                valueFn: function() {
                    return Y.doccirrus.jsonrpc.api.jade
                        .renderFile( {noBlocking: true, path: TPL_PATH_PATIENT + 'PatientGadgetConfigurableTableBaseConfigDialog' } )
                        .then( function( response ) {
                            return response.data;
                        } );
                }
            },
            /**
             * Some sort of model
             * - can be a promise to fulfill with a model (returned by valueFn)
             * - specify "toJSON" to not let ko.toJS be used
             * - specify "destroy" to let your model be destroyed (dispose is being ignored when destroy is available)
             * - specify "dispose" to let your model be disposed
             *
             * NOTE: this one is actually used in the context of PatientGadgetEditGadget
             *
             * @for PatientGadgetConfigurableTableBase
             */
            editBindings: {
                getter: function() {
                    var
                        self = this,
                        model = self.get( 'gadgetModel' ),
                        modelConfig = unwrap( model.config ),
                        forGadgetConstructor = self.get( 'forGadgetConstructor' ),
                        attrs = GADGET_UTILS.getATTRSInherited( forGadgetConstructor ),
                        availableConfigurableTableColumns = [].concat( getObject( 'availableConfigurableTableColumns.value', attrs ) || [] ),
                        availableConfigurableTableColumnsIndexMap = availableConfigurableTableColumns.reduce( function( previousValue, currentValue ) {
                            previousValue[currentValue.val] = currentValue;
                            return previousValue;
                        }, {} ),
                        configColumns = [].concat( getObject( 'configurableTable.columns', modelConfig ) || getObject( 'defaultConfigurableTableColumns.value', attrs ) || [] ),
                        chosenColumns = availableConfigurableTableColumns.filter( function( item ) {
                            return -1 < configColumns.indexOf( item.val ) && availableConfigurableTableColumnsIndexMap.hasOwnProperty( item.val );
                        } ),
                        columns = [],
                        invisibleColumns = [],

                        limit = getObject( 'configurableTable.limit', modelConfig ) || forGadgetConstructor.prototype.defaultLoadLimit,
                        filterResult = getObject( 'configurableTable.filterResult', modelConfig ) || forGadgetConstructor.prototype.defaultFilterResult,
                        showOnlyPrescribed = getObject( 'showOnlyPrescribed', modelConfig ) || forGadgetConstructor.prototype.showOnlyPrescribed,
                        showOnlyOverdue = getObject( 'showOnlyOverdue', modelConfig ) || forGadgetConstructor.prototype.showOnlyOverdue,
                        showPathologicalOnly = getObject( 'showPathologicalOnly', modelConfig ) || forGadgetConstructor.prototype.defaultShowPathologicalOnly,
                        showNotes = getObject( 'showNotes', modelConfig ) || forGadgetConstructor.prototype.defaultShowNotes,
                        showHighLow = getObject( 'showHighLow', modelConfig ) || forGadgetConstructor.prototype.defaultShowHighLow,
                        showOnlyContinuousMed = getObject( 'showOnlyContinuousMed', modelConfig) || forGadgetConstructor.prototype.showOnlyContinuousMed,

                        serverUrl = getObject( 'serverUrl', modelConfig ),
                        serverPort = getObject( 'serverPort', modelConfig ),
                        serverLocation = getObject( 'serverLocation', modelConfig ),
                        serverUserFirstName = getObject( 'serverUserFirstName', modelConfig ),
                        serverUserLastName = getObject( 'serverUserLastName', modelConfig ),

                        onlyLastDLDiagnosis = getObject( 'onlyLastDLDiagnosis', modelConfig ),

                        allMedDataTypes = {},

                        bindings = {};

                    /** handle columns **/
                    configColumns.forEach( function( val ) {
                        if( availableConfigurableTableColumnsIndexMap.hasOwnProperty( val ) ) {
                            columns.push( availableConfigurableTableColumnsIndexMap[val] );
                        }
                    } );

                    availableConfigurableTableColumns.forEach( function( item ) {
                        if( -1 === configColumns.indexOf( item.val ) ) {
                            invisibleColumns.push( item );
                        }
                    } );

                    invisibleColumns.sort( function( a, b ) {
                        return a.i18n.toLocaleLowerCase() > b.i18n.toLocaleLowerCase();
                    } );

                    columns = columns.concat( invisibleColumns );

                    bindings.columns = ko.observableArray( columns );
                    bindings.chosenColumns = ko.observableArray( chosenColumns );

                    /** handle load limit **/
                    bindings.limit = ko.observable( limit );
                    bindings.isMedication = ko.observable( Y.doccirrus.gadget.constants.gadgetNames.PatientGadgetMedication === unwrap( model.gadgetConst ) );
                    bindings.isInvoice = ko.observable( Y.doccirrus.gadget.constants.gadgetNames.PatientGadgetInvoices === unwrap( model.gadgetConst ) );
                    bindings.showOnlyPrescribed = ko.observable( showOnlyPrescribed );
                    bindings.showOnlyOverdue = ko.observable( showOnlyOverdue );
                    bindings.isLatestLabdata = ko.observable( Y.doccirrus.gadget.constants.gadgetNames.PatientGadgetLatestLabData === unwrap( model.gadgetConst ) );
                    bindings.isLatestMeddata = ko.observable( Y.doccirrus.gadget.constants.gadgetNames.PatientGadgetLatestMedData === unwrap( model.gadgetConst ) );
                    bindings.isLastDLDiagnosis = ko.observable( Y.doccirrus.gadget.constants.gadgetNames.PatientGadgetLastDLDiagnosis === unwrap( model.gadgetConst ) );
                    bindings.showPathologicalOnly = ko.observable( showPathologicalOnly );
                    bindings.showNotes = ko.observable( showNotes );
                    bindings.showHighLow = ko.observable( showHighLow );
                    bindings.showOnlyContinuousMed = ko.observable( showOnlyContinuousMed );

                    bindings.isLatestVaccination = ko.observable( Y.doccirrus.gadget.constants.gadgetNames.PatientGadgetLatestVaccinationStatus === unwrap( model.gadgetConst ) );
                    bindings.serverUrl = ko.observable( serverUrl );
                    bindings.serverPort = ko.observable( serverPort );
                    bindings.serverLocation = ko.observable( serverLocation );
                    bindings.serverUserFirstName = ko.observable( serverUserFirstName );
                    bindings.serverUserLastName = ko.observable( serverUserLastName );
                    bindings.onlyLastDLDiagnosis = ko.observable( onlyLastDLDiagnosis );

                    /**
                     * Returns the type of gadget to use in getFilterResults
                     * @returns {string}
                     */
                    function labelFilterResultType() {
                        return ko.unwrap(bindings.isLatestMeddata) ? 'medData'
                            : ko.unwrap(bindings.isLatestLabdata) ? 'labTest' : 'labTest';
                    }

                    /**
                     * Filters a list by term using RegExp
                     * @param {Array} list
                     * @param {String} [key]
                     * @param {String} term
                     * @returns {Array}
                     */
                    function filterByRegex( args ) {
                        var
                            { list: list, key: key, term: term } = args,
                            regex = new RegExp( term, 'i' );
                        return list.filter( function( element ) {
                            if( typeof element === 'object' && key ) {
                                element = element[key];
                            }
                            return (typeof element === "string") ? element.match( regex ) : false;
                        } );
                    }

                    /**
                     * Returns callback functions for filtered filter results
                     * @param {String} gadgetType
                     * @returns {{select2: Object, data: Object}}
                     */
                    function getFilterResults( gadgetType ) {
                        var
                            data,
                            placeholderText,
                            select2,
                            select2QueryCallback;

                        switch( gadgetType ) {

                            case 'labTest':
                                select2QueryCallback = function( query ) {
                                    Promise.all( [
                                        Y.doccirrus.jsonrpc.api.tag.read( {
                                            noBlocking: true,
                                            query: {
                                                type: Y.doccirrus.schemas.tag.tagTypes.LABDATA,
                                                title: {
                                                    $regex: query.term,
                                                    $options: 'i'
                                                }
                                            }
                                        } ),
                                        Y.doccirrus.jsonrpc.api.labtest.read( {
                                            noBlocking: true,
                                            query: {
                                                head: {
                                                    $regex: query.term,
                                                    $options: 'i'
                                                }
                                            },
                                            data: {
                                                overrideOptions: true
                                            },
                                            options: {
                                                fields: {
                                                    head: 1
                                                }
                                            }
                                        } )
                                    ] )
                                        .then( function( response ) {
                                            var
                                                toSelect2Object,
                                                data = [].concat( response[0].data || [] ).concat( response[1].data || [] );

                                            toSelect2Object = _.chain( data )
                                                .map( function( item ) {
                                                    if( item && (item.title || item.head) ) {
                                                        return {
                                                            id: item.title || item.head,
                                                            text: item.title || item.head
                                                        };
                                                    }
                                                } )
                                                .uniq( function( item ) {
                                                    return item.id;
                                                } )
                                                .value();

                                            query.callback( {results: toSelect2Object} );
                                        } )
                                        .catch( function( error ) {
                                            Y.log( 'select2 LABDATA type filter failed: ' + JSON.stringify( error ), 'warn', NAME );
                                            query.callback( {results: []} );
                                        } );
                                };
                                break;

                            case 'medData':
                                select2QueryCallback = function( query ) {
                                    var
                                        toSelect2Object,
                                        entries;

                                    if ( allMedDataTypes ) {
                                        entries = _.map( allMedDataTypes, function( value, key ) {
                                            return { id: key, text: value };
                                        } );

                                        toSelect2Object = filterByRegex( {
                                            list: entries,
                                            key: 'text',
                                            term: query.term
                                        } );

                                        query.callback( { results: toSelect2Object } );
                                    } else {
                                        query.callback( { results: [] } );
                                    }

                                };
                                break;

                            default:
                                break;
                        }

                        data = self.addDisposable( ko.computed( {
                            read: function() {
                                return unwrap( bindings.filterResult ).map( function( item ) {
                                    var
                                        text = item;

                                    // If medData it should set the text from the i18n available from the allMedDataTypes fetched
                                    if (gadgetType === 'medData') {
                                        text = allMedDataTypes[item] || item;
                                    }

                                    return {
                                        id: item,
                                        text: text
                                    };
                                } );
                            },
                            write: function( $event ) {
                                bindings.filterResult( $event.val );
                            }
                        } ) );

                        placeholderText = i18n( 'PatientHeaderDashboard.PatientGadgetConfigurableTableBaseConfigDialog.labelFilterResultPlaceholder.' + gadgetType );

                        select2 = {
                            placeholder: placeholderText,
                            allowClear: true,
                            multiple: true,
                            query: select2QueryCallback
                        };

                        return {
                            data: data,
                            select2: select2
                        };
                    }

                    if (unwrap(bindings.isLatestLabdata) || unwrap(bindings.isLatestMeddata)) {
                        if (typeof filterResult === 'string') {
                            filterResult = _.map(filterResult.split(','), _.trim);
                        }

                        if ( unwrap(bindings.isLatestMeddata) ) {
                            // Set an empty array to start, so the select2 config doesn't crash until the stored filterResults are converted to objects with proper i18n
                            bindings.filterResult = ko.observableArray( [] );

                            // Fetch allMedDataTypes to be used in the select2, and after that is ready then set the initial filterResult, which is the one stored in the DB
                            Y.doccirrus.jsonrpc.api.meddata.getAllMeddataTypes ( {} )
                                .done( function( response ) {
                                    allMedDataTypes = response.data;

                                    bindings.filterResult( filterResult );
                                } )
                                .fail( function( error ) {
                                    Y.log( 'MEDDATA type search failed: ' + JSON.stringify( error ), 'warn', NAME );
                                } );
                        } else {
                            bindings.filterResult = ko.observableArray( filterResult );
                        }
                        bindings.select2filterResult = getFilterResults(labelFilterResultType());
                    }

                    defaultActTypes.forEach(function( type ) {
                        bindings[type] = ko.observable( getObject( type, modelConfig ) || forGadgetConstructor.prototype[type] );
                    });

                    /** handle toJSON **/
                    bindings.toJSON = function() {
                        var
                            chosenColumnsJs = ko.toJS( bindings.chosenColumns ).map( function( item ) {
                                return item.val;
                            } ),
                            columnsSorted = [],

                            resultLimit = Number( unwrap( bindings.limit ) ),
                            showOnlyPrescribed = peek( bindings.showOnlyPrescribed ),
                            showOnlyContinuousMed = peek(bindings.showOnlyContinuousMed),
                            showOnlyOverdue = peek( bindings.showOnlyOverdue ),
                            result = {
                                configurableTable: {}
                            };

                        if( unwrap( bindings.isMedication ) ) {
                            result.showOnlyPrescribed = showOnlyPrescribed;
                            result.showOnlyContinuousMed = showOnlyContinuousMed;
                        }

                        if( unwrap( bindings.isInvoice ) ) {
                            result.showOnlyOverdue = showOnlyOverdue;
                            defaultActTypes.forEach( function( type ) {
                                result[type] = peek( bindings[type] );
                            });
                        }
                        /** handle columns **/
                        columns.forEach( function( config ) {
                            if( -1 < chosenColumnsJs.indexOf( config.val ) && availableConfigurableTableColumnsIndexMap.hasOwnProperty( config.val ) ) {
                                columnsSorted.push( config.val );
                            }
                        } );

                        result.configurableTable.columns = columnsSorted;

                        /** handle load limit **/
                        if( Y.Lang.isNumber( resultLimit ) ) {
                            result.configurableTable.limit = resultLimit;
                        }

                        if( unwrap( bindings.isLatestLabdata ) ) {
                            result.configurableTable.filterResult = unwrap(bindings.filterResult);
                            result.showPathologicalOnly = peek( bindings.showPathologicalOnly );
                            result.showNotes = peek( bindings.showNotes );
                            result.showHighLow = peek( bindings.showHighLow );
                        }

                        if( unwrap( bindings.isLatestMeddata ) ) {
                            result.configurableTable.filterResult = unwrap(bindings.filterResult);
                        }

                        if( unwrap( bindings.isLatestVaccination ) ){
                            result.serverUrl = peek( bindings.serverUrl );
                            result.serverPort = peek( bindings.serverPort );
                            result.serverLocation = peek( bindings.serverLocation );
                            result.serverUserFirstName = peek( bindings.serverUserFirstName );
                            result.serverUserLastName = peek( bindings.serverUserLastName );
                        }

                        if( unwrap( bindings.isLastDLDiagnosis ) ) {
                            result.onlyLastDLDiagnosis = peek( bindings.onlyLastDLDiagnosis );
                        }

                        return result;
                    };

                    defaultActTypes.forEach(function( type ) {
                       bindings[type + 'I18n'] =  i18n( 'activity-schema.Activity_E.' + type.toUpperCase() );
                    });

                    bindings.showOnlyPrescribedI18n = i18n( 'PatientGadget.PatientGadgetMedication.showOnlyPrescribed' );
                    bindings.showPathologicalOnlyI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_SHOW_PATHOLOGICAL_ONLY' );
                    bindings.showNotesI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_SHOW_NOTES' );
                    bindings.showHighLowI18n = i18n( 'InCaseMojit.LabdataTableEditorModel.TOOLTIP_SHOW_HIGH_LOW' );
                    bindings.showOnlyOverdueI18n = i18n( 'PatientGadget.PatientGadgetInvoices.showOnlyOverdue' );
                    bindings.labelLimitI18n = i18n( 'PatientHeaderDashboard.PatientGadgetConfigurableTableBaseConfigDialog.labelLimit' );
                    bindings.labelCollumnsI18n = i18n( 'PatientHeaderDashboard.PatientGadgetConfigurableTableBaseConfigDialog.labelColumns' );
                    bindings.labelVisibilityI18n = i18n( 'PatientHeaderDashboard.PatientGadgetConfigurableTableBaseConfigDialog.labelVisibility' );
                    bindings.labelDescriptionI18n = i18n( 'PatientHeaderDashboard.PatientGadgetConfigurableTableBaseConfigDialog.labelDescription' );
                    bindings.labelMedDataFilterResultI18n = i18n( 'PatientHeaderDashboard.PatientGadgetConfigurableTableBaseConfigDialog.labelFilterResult.medData' );
                    bindings.labelLabtestFilterResultI18n = i18n( 'PatientHeaderDashboard.PatientGadgetConfigurableTableBaseConfigDialog.labelFilterResult.labTest' );
                    bindings.showOnlyContinuousMedI18n = i18n( 'PatientGadget.PatientGadgetMedication.showOnlyContinuousMed' );
                    bindings.serverI18n = i18n( 'PatientGadget.PatientGadgetLatestVaccinationStatus.server' );
                    bindings.serverUrlI18n = i18n( 'PatientGadget.PatientGadgetLatestVaccinationStatus.serverUrl' );
                    bindings.serverPortI18n = i18n( 'PatientGadget.PatientGadgetLatestVaccinationStatus.serverPort' );
                    bindings.serverLocationI18n = i18n( 'PatientGadget.PatientGadgetLatestVaccinationStatus.serverLocation' );
                    bindings.serverUserI18n = i18n( 'PatientGadget.PatientGadgetLatestVaccinationStatus.serverUser' );
                    bindings.serverUserFirstNameI18n = i18n( 'PatientGadget.PatientGadgetLatestVaccinationStatus.serverUserFirstName' );
                    bindings.serverUserLastNameI18n = i18n( 'PatientGadget.PatientGadgetLatestVaccinationStatus.serverUserLastName' );
                    bindings.onlyLastDLDiagnosisI18n = i18n( 'PatientGadget.PatientGadgetLastDLDiagnosis.onlyLastDLDiagnosis' );


                    return bindings;
                }
            },
            /**
             * A function to call when the dialog was created
             * @attribute editOnBind
             * @type null|function
             * @param {Object} data
             * @param {*} data.bindings
             * @param {Y.Node} data.bodyContent
             * @param {DCWindow} data.dialog
             *
             * NOTE: this one is actually used in the context of PatientGadgetEditGadget
             *
             * @for PatientGadgetConfigurableTableBase
             */
            editOnBind: {
                value: function( data ) {
                    var
                        ddDelegate,
                        dialog = data.dialog,
                        bodyContentNode = data.bodyContent.getDOMNode(),
                        configColumns = data.bindings.columns,
                        drag;

                    ddDelegate = dialog.ddDelegate = new Y.DD.Delegate( {
                        container: bodyContentNode,
                        nodes: 'tr',
                        target: true, // items should also be a drop target
                        dragConfig: {}
                    } );
                    drag = ddDelegate.dd;

                    drag.addHandle( '.PatientGadgetConfigurableTableBaseConfigDialog-dragHandle' );

                    // drag constrained
                    drag.plug( Y.Plugin.DDConstrained, {
                        constrain2node: bodyContentNode.querySelector( '.PatientGadgetConfigurableTableBaseConfigDialog' ),
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
                            dialog = node.ancestor( '.PatientGadgetConfigurableTableBaseConfigDialog' ),
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

                            drag.con.set( 'constrain2node', bodyContentNode.querySelector( '.PatientGadgetConfigurableTableBaseConfigDialog' ) );
                            ddDelegate.syncTargets();

                        },
                        'drag:drophit': function( yEvent ) {
                            var
                                dropNode = yEvent.drop.get( 'node' ),
                                dragNode = yEvent.drag.get( 'node' ),
                                dragData = ko.dataFor( dragNode.getDOMNode() ),
                                dropData = ko.dataFor( dropNode.getDOMNode() ),
                                data = peek( configColumns ),
                                //dragIndex = data.indexOf( dragData ),
                                dropIndex = data.indexOf( dropData );

                            configColumns.remove( dragData );
                            configColumns.splice( dropIndex, 0, dragData );

                        }
                    } );
                }
            },
            /**
             * A function to call when the dialog is about to destroy
             * @attribute editUnBind
             * @type null|function
             * @param {Object} data
             * @param {*} data.bindings
             * @param {Y.Node} data.bodyContent
             * @param {DCWindow} data.dialog
             *
             * NOTE: this one is actually used in the context of PatientGadgetEditGadget
             *
             * @for PatientGadgetConfigurableTableBase
             */
            editUnBind: {
                value: function( data ) {
                    var
                        dialog = data.dialog;

                    if( dialog.ddDelegate ) {
                        dialog.ddDelegate.destroy();
                        delete dialog.ddDelegate;
                    }
                }
            },
            availableConfigurableTableColumns: {
                value: []
            },
            defaultConfigurableTableColumns: {
                value: []
            }
        },
        GadgetTable: GadgetTable
    } );

    KoViewModel.registerConstructor( PatientGadgetConfigurableTableBase );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'GadgetConstants',
        'GadgetLayouts',
        'GadgetUtils',
        'PatientGadget',
        'dccommonutils'
    ]
} );
