/*global YUI, ko, Promise */

'use strict';

YUI.add( 'tableproperties-modal', function( Y, NAME ) {
    var
        i18n = Y.doccirrus.i18n,
        WINDOW_SIZE = Y.doccirrus.DCWindow.SIZE_LARGE + 200,
        WINDOW_HEIGHT = 200,

        KoViewModel = Y.doccirrus.KoViewModel,
        Disposable = KoViewModel.getDisposable();

    function TablePropertiesModel( config ) {
        TablePropertiesModel.superclass.constructor.call( this, config );
    }

    Y.extend( TablePropertiesModel, Disposable, {

        //  properties
        dcCols: null,                       //  passed by caller
        reducedSchema: null,                //  passed by caller

        cols: null,                         //  observable array of table columns
        filters: null,                      //  observable array of filters on table columns

        reducedSchemaMembers: null,         //  list of schema fields
        reducedSchemaLabels: null,          //  dict of schema fields and translated labels
        alignOptions: null,                 //  list of alignment options [ 'left', 'center', 'right', 'justify' ]
        alignLabels: null,                  //  dict of translations for alignment options
        striped: null,                      //  option to add a background color to every other row in table

        initializer: function( options ) {
            var self = this;
            self.element = options.element || null;
            self.tablevm = options.tablevm || null;

            self._initTranslations();
            self._initTableEditor( options );
            self._initReducedSchema( );
        },

        destructor: function() {
            var self = this;
            self.element = null;
            self.locations.dispose();
            self.hasFilters.dispose();
            self.locations = null;
        },

        _initTranslations: function() {
            self.columnsTitleI18n = i18n('FormEditorMojit.tableproperties_modal.columns.title');
            self.columnsMemberI18n = i18n('FormEditorMojit.tableproperties_modal.columns.member');
            self.columnsAdditionalDataKeyI18n = i18n('FormEditorMojit.tableproperties_modal.columns.additionalDataKey');
            self.columnsTypeI18n = i18n('FormEditorMojit.tableproperties_modal.columns.type');
            self.columnsAlignI18n = i18n('FormEditorMojit.tableproperties_modal.columns.align');
            self.columnsWidthI18n = i18n('FormEditorMojit.tableproperties_modal.columns.width');
            self.stripeI18n = i18n('FormEditorMojit.tableproperties_modal.stripe');

            self.LBL_COLUMNS = i18n('FormEditorMojit.tableproperties_modal.LBL_COLUMNS');
            self.LBL_FILTERS = i18n('FormEditorMojit.tableproperties_modal.LBL_FILTERS');
            self.LBL_OPTIONS = i18n('FormEditorMojit.tableproperties_modal.LBL_OPTIONS');
            self.BTN_ADD_FILTER = i18n('FormEditorMojit.tableproperties_modal.BTN_ADD_FILTER');

            self.LBL_FILTER_MEMBER = i18n('FormEditorMojit.tableproperties_modal.LBL_FILTER_MEMBER');
            self.LBL_FILTER_OP = i18n('FormEditorMojit.tableproperties_modal.LBL_FILTER_OP');
            self.LBL_FILTER_ADDITIONALDATAKEY = i18n('FormEditorMojit.tableproperties_modal.LBL_FILTER_ADDITIONALDATAKEY');
            self.LBL_FILTER_VALUE = i18n('FormEditorMojit.tableproperties_modal.LBL_FILTER_VALUE');
        },

        _initTableEditor: function() {
            var
                self = this,
                tablevm = self.tablevm || null;

            self.cols = ( tablevm && tablevm.cols ) ? tablevm.cols : null;
            self.filters = ( tablevm && tablevm.filters ) ? tablevm.filters : null ;

            //  additional property for striped tables
            if ( self.element && !self.element.extra ) { self.element.extra = ''; }
            self.isStriped = tablevm.isStriped;

            self.alignOptions = ko.observableArray( [ 'left', 'center', 'right', 'justify' ] );
            self.filterTypes = ko.observableArray( Y.dcforms.FILTER_TYPES );

            self.hasFilters = ko.computed( function() {
                return ( self.filters() && ( self.filters().length > 0 ) );
            } );
        },

        //  TODO: pass this from parent

        _initReducedSchema: function( ) {
            var
                self = this,
                reducedSchema = ( self.tablevm && self.tablevm.schema ) ? self.tablevm.schema : null,
                tempLabel,
                k;


            self.reducedSchemaMembers = ko.observableArray( [] );
            self.reducedSchemaLabels = {};

            if (!reducedSchema ) { return; }

            for( k in reducedSchema ) {
                if ( reducedSchema.hasOwnProperty( k ) ) {
                    if ( -1 === Y.dcforms.reducedschema.reservedWords.indexOf( k ) ) {
                        self.reducedSchemaMembers.push( k );

                        //  TODO: set user language here
                        tempLabel = 'FIXME IN JSON';
                        if ( reducedSchema[k] && reducedSchema[k].label && reducedSchema[k].label.de ) {
                            tempLabel = reducedSchema[k].label.de;
                        }

                        //  for legacy or corrupt table definitions
                        if ( reducedSchema[k] && reducedSchema[k].type ) {
                            self.setColType( k, reducedSchema[k].type );
                        }

                        self.reducedSchemaLabels[k] = tempLabel;
                    }
                }
            }

        },

        /**
         *  Called by data binding, translate schema member name
         *
         *  @param  item    {String}    name of a reduced schema member
         *  @return         {String}    translated label for reduced schema member
         */

        getSchemaLabel: function( item ) {
            var self = this;
            if ( !self.reducedSchemaLabels || !self.reducedSchemaLabels[item] ) { return 'MISSING TRANSLATION'; }
            return self.reducedSchemaLabels[item];
        },

        /**
         *  Called by data binding, translate filter type
         *
         *  @param item
         *  @return {*}
         */

        getOptionLabel: function( item ) {
            return i18n( 'FormEditorMojit.tableproperties_modal.op.' + item );
        },

        /**
         *
         *
         *  @param  item
         */

        getAlignLabel: function( item ) {
            //alert( 'item: ' + JSON.stringify( item ) );
            return i18n( 'FormEditorMojit.tableproperties_modal.align.' + item );
        },

        /**
         *  Set column data type
         *
         *  @param  schemaMember    {String}    Name of a reduced schema member
         *  @param  colType         {String}    Type of value this column takes
         */

        setColType: function( schemaMember, colType ) {
            var
                self = this,
                plainCols = self.cols(),
                i;

            for (i = 0; i < plainCols.length; i++ ) {
                if ( plainCols[i].member && schemaMember === plainCols[i].member ) {
                    plainCols[i].valueType = colType;
                }
            }
        },

        /**
         *  Called by data binding for delete button
         *  @param item
         */

        removeColumn: function( item ) {
            Y.log( 'Remove table column column: ' + JSON.stringify( item ), 'debug', NAME );
            var self = this;
            item.dispose();
            self.cols.remove( item );
        },

        /**
         *  Called by data binding to reorder table columns
         *  @param  item
         */

        promoteColumn: function( col ) {
            Y.log( 'Promote table column: ' + JSON.stringify( col ) );

            var
                self = this,
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
        },

        /**
         *  Add an empty filter
         */

        addFilter: function() {
            var self = this;
            self.tablevm.filters.push( self.tablevm.initializeFilterDef( {} ) );
        },

        /**
         *  Remove a filter from the table
         *
         *  @param  {Object}    toRemove    Filter object, member of the observable array self.filters()
         */

        removeFilter: function( toRemove ) {

            var self = this;

            var
                plainFilters = self.tablevm.filters(),
                newFilters;

            newFilters = plainFilters.filter( function( item ) { return item !== toRemove; } );
            self.tablevm.filters( newFilters );
        },

        /**
         * Serializes this Model to a javascript object.
         * @method toJSON
         * @returns {Object}
         */

        toJSON: function() {
            var
                self = this;

            if ( self.isStriped() ) {
                self.element.extra = 'STRIPES';
            } else {
                self.element.extra = '';
            }

            self.cols = self.tablevm.cols();
            return self.cols;
        }

    } );

    /**
     *  Provides a dialog for editing advanced table options
     *
     *  @method show
     *  @param  options                     {Object}
     *  @param  options.dcCols              {Object}    Expanded dcforms table definition DEPRECATED
     *  @param  options.cols                {Object}    KoObservableArray of column definitions
     *  @param  options.filters             {Object}    KoObservableArray of filter definitions
     *  @param  options.striped             {Object}    Boolean observable, color alternative rows
     *  @param  options.onApplyProperties   {Function}  Called when user confirms their changes
     *  @param  options.onCloseDialog       {Function}  Called when dialog is closed
     *
     *  @returns {Y.EventTarget}
     *  @for doccirrus.modals.filterInvoiceItems
     */

    function showTablePropertiesModal( options ) {
        if ( !options || !options.tablevm ) {
            Y.log( 'Cannot create modal, needs set of table definition to present to user.', 'warn', NAME );
            return;
        }

        Promise
            .props( {
                modules: Y.doccirrus.utils.requireYuiModule( [
                    'node',
                    'JsonRpcReflection-doccirrus',
                    'JsonRpc',
                    'DCWindow'
                ] ),
                template: Y.doccirrus.jsonrpc.api.jade
                    .renderFile( { path: 'FormEditorMojit/views/tableproperties-modal' } )
                    .then( function( response ) {
                        return response.data;
                    } )
            } )
            .then( function( props ) {
                var
                    template = props.template,
                    bindings = new TablePropertiesModel( options ),
                    bodyContent = Y.Node.create( template ),
                    dialog = new Y.doccirrus.DCWindow( {
                        id: 'DCWindow-TablePropertiesDialog',
                        className: 'DCWindow-TablePropertiesDialog',
                        bodyContent: bodyContent,
                        title: i18n( 'FormEditorMojit.tableproperties_modal.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_INFO,

                        width: WINDOW_SIZE,
                        minHeight: WINDOW_HEIGHT,
                        minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,

                        maximizable: true,
                        centered: true,
                        modal: true,

                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                {
                                    //  TRANSLATEME
                                    label: i18n( 'DCWindow.BUTTONS.OK' ),
                                    name: 'APPLYPROPERTIES',
                                    value: 'APPLYPROPERTIES',
                                    isDefault: true,
                                    action: onApplyProperties
                                }
                            ]
                        },
                        after: {
                            visibleChange: onVisibilityChange
                        }
                    } );

                //  necessary to re-center after table node is added (similar to processNextTick)
                window.setTimeout( function() { dialog.centered(); }, 1 );

                /**
                 *  Raised when the CHOOSELOCATIONS button is clicked
                 *  @param e
                 */

                function onApplyProperties( e ) {
                    dialog.close( e );
                }

                function onVisibilityChange( yEvent ) {
                    // also captures cancel for e.g.: ESC
                    if( !yEvent.newVal ) {
                        setTimeout( function() {
                            // delay for letting others fire first
                            if ( options.onCloseDialog ) {
                                options.onCloseDialog( bindings.toJSON() );
                            }

                            bindings.dispose();
                            ko.cleanNode( bodyContent.getDOMNode() );

                        }, 10 );
                    }
                }

                ko.applyBindings( bindings, bodyContent.getDOMNode() );
            } )
            .catch( function( err ) {
                Y.log( 'Could not initialize dialog: ' + JSON.stringify( err ), 'warn', NAME );
            } );
    }

    Y.namespace( 'doccirrus.modals' ).tableProperties = {
        show: showTablePropertiesModal
    };

}, '0.0.1', {
    requires: [
        'oop',
        'event-custom',
        'doccirrus',
        'dcutils',
        'KoViewModel',
        'DCWindow'
    ]
} );
