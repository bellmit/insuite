/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'PatientHeaderDashboard', function( Y/*, NAME*/ ) {
    /**
     * @module PatientHeaderDashboard
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        // ignoreDependencies = ko.ignoreDependencies,

        getObject = Y.doccirrus.commonutils.getObject,
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        DashboardBase = KoViewModel.getConstructor( 'DashboardBase' ),
        PatientHeaderDashboardGadgetSelector = KoViewModel.getConstructor( 'PatientHeaderDashboardGadgetSelector' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        GADGET_LAYOUT_PATIENT = GADGET.layouts.patient,
        GADGET_UTILS = GADGET.utils,

        createObjectId = GADGET_UTILS.createObjectId,

        DEFAULTS = Object.freeze( (function() {
            var
                i,
                LAYOUT_COLUMNS = 12,
                LAYOUT_COLUMN_MARGIN = 20,
                LAYOUT_ROWS = 4,
                LAYOUT_ROW_MARGIN = 20,
                LAYOUT_ROW_HEIGHT = 85,
                LAYOUT_SLOTS = LAYOUT_COLUMNS * LAYOUT_ROWS,
                GADGET_COL_PROP = GADGET_LAYOUT_PATIENT.configFields.GADGET_COL_PROP,
                GADGET_COLS = 3,
                GADGET_ROW_PROP = GADGET_LAYOUT_PATIENT.configFields.GADGET_ROW_PROP,
                GADGET_ROWS = 1,
                LAYOUT_ROWS_OFFSET_HEIGHT = [
                    undefined,
                    LAYOUT_ROW_HEIGHT
                ];

            for( i = LAYOUT_ROWS_OFFSET_HEIGHT.length; i <= LAYOUT_ROWS; i++ ) {
                LAYOUT_ROWS_OFFSET_HEIGHT.push( i * (LAYOUT_ROW_HEIGHT + LAYOUT_ROW_MARGIN) - LAYOUT_ROW_MARGIN );
            }

            Object.freeze( LAYOUT_ROWS_OFFSET_HEIGHT );

            return {
                /** Slots offered by layout **/
                LAYOUT_SLOTS: LAYOUT_SLOTS,
                /** Columns offered by layout **/
                LAYOUT_COLUMNS: LAYOUT_COLUMNS,
                /** Margin of each column **/
                LAYOUT_COLUMN_MARGIN: LAYOUT_COLUMN_MARGIN,
                /** Rows offered by layout **/
                LAYOUT_ROWS: LAYOUT_ROWS,
                /** Margin of each row **/
                LAYOUT_ROW_MARGIN: LAYOUT_ROW_MARGIN,
                /** Height in px of a row **/
                LAYOUT_ROW_HEIGHT: LAYOUT_ROW_HEIGHT,
                /** Offset heights in px of rows (index represents that row) **/
                LAYOUT_ROWS_OFFSET_HEIGHT: LAYOUT_ROWS_OFFSET_HEIGHT,
                /** Property name of columns in gadget model config **/
                GADGET_COL_PROP: GADGET_COL_PROP,
                /** Default value for columns of a new gadget **/
                GADGET_COLS: GADGET_COLS,
                /** Property name of rows in gadget model config **/
                GADGET_ROW_PROP: GADGET_ROW_PROP,
                /** Default value for rows of a new gadget **/
                GADGET_ROWS: GADGET_ROWS
            };
        })() ),

        GADGET_DRAG_CLASS_NAME = 'PatientHeaderDashboard-drag',
        GADGET_PROXY_CLASS_NAME = 'PatientHeaderDashboard-proxy',
        GADGET_PROXY_CLASS_NAME_VALID = 'PatientHeaderDashboard-proxy-valid',
        GADGET_PROXY_CLASS_NAME_INVALID = 'PatientHeaderDashboard-proxy-invalid';

    /**
     * Shorthand function to create gadget items for "dashboardModelDefaultData"
     * @param {String} gadgetName
     * @param {Number} cols
     * @param {Number} rows
     * @returns {{_id: String, gadgetConst: Number, config: {}}}
     */
    function createDefaultDataConfigObject( gadgetName, cols, rows ) {
        var
            result = {
                '_id': createObjectId(),
                'gadgetConst': GADGET_CONST.getGadgetConstByName( gadgetName ),
                'config': {}
            };

        result.config[DEFAULTS.GADGET_COL_PROP] = cols;
        result.config[DEFAULTS.GADGET_ROW_PROP] = rows;

        return result;
    }

    /**
     * Creates a computed css style sheet for this module
     */
    function initStyleSheet() {
        var
            styleSheet = Y.StyleSheet( '', 'PatientHeaderDashboard-StyleSheet' ), // eslint-disable-line new-cap
            gridBorderImage = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AcGEAMYabxaCwAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAMSURBVAjXY7h79y4ABTICmBIu5dAAAAAASUVORK5CYII=")',
            gridBorders = [],
            colInPercent = 100 / DEFAULTS.LAYOUT_COLUMNS,
            i;

        styleSheet.disable();

        // for grid
        for( i = 1; i < DEFAULTS.LAYOUT_COLUMNS; i++ ) {
            gridBorders.push( gridBorderImage + ' repeat-y ' + (colInPercent * i).toFixed( 3 ) + '% 0' );
        }
        for( i = 1; i <= DEFAULTS.LAYOUT_ROWS; i++ ) {
            gridBorders.push( gridBorderImage + ' repeat-x 0 ' + (DEFAULTS.LAYOUT_ROWS_OFFSET_HEIGHT[i] + DEFAULTS.LAYOUT_ROW_MARGIN) + 'px' );
        }
        styleSheet.set( '.panel-body-with-PatientHeaderDashboard-inEditMode', {
            background: gridBorders.join( ', ' )
        } );

        // for gadgets
        for( i = 1; i <= DEFAULTS.LAYOUT_ROWS; i++ ) {
            styleSheet.set( '.Gadget-height-' + i, {
                height: DEFAULTS.LAYOUT_ROWS_OFFSET_HEIGHT[i] + 'px'
            } );
        }

        styleSheet.enable();
    }

    /**
     * @constructor
     * @class PatientHeaderDashboard
     * @extends DashboardBase
     */
    function PatientHeaderDashboard() {
        PatientHeaderDashboard.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientHeaderDashboard, DashboardBase, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initEditMode();
            self._initGridStatus();
            self.dragLabelI18n = i18n( 'DashboardBase.dragHereLabel' );

        },
        /** @private */
        destructor: function() {
        },
        /**
         * @protected
         * @for PatientHeaderDashboard
         */
        initCreateColumnsAndMoveGadgetsComputed: function() {
            // PatientHeaderDashboard.superclass.initCreateColumnsAndMoveGadgetsComputed.apply( this, arguments );
        },
        /**
         * Class name applied to element which is dragged via proxy
         * @for PatientHeaderDashboard
         */
        gadgetDragClassName: GADGET_DRAG_CLASS_NAME,
        /**
         * Class name applied to proxy element which is dragged
         * @for PatientHeaderDashboard
         */
        gadgetProxyClassName: GADGET_PROXY_CLASS_NAME,
        /**
         * Class name applied to proxy element when dropping is valid
         * @for PatientHeaderDashboard
         */
        gadgetProxyClassNameValid: GADGET_PROXY_CLASS_NAME_VALID,
        /**
         * Class name applied to proxy element when dropping is invalid
         * @for PatientHeaderDashboard
         */
        gadgetProxyClassNameInValid: GADGET_PROXY_CLASS_NAME_INVALID,
        /**
         * @for PatientHeaderDashboard
         */
        handlerAddGadgetDisabled: function() {
            var
                self = this,
                handlerAddGadgetDisabled = PatientHeaderDashboard.superclass.handlerAddGadgetDisabled.apply( this, arguments ),
                noSlotsLeftToPlace = self.getSlotsLeftToPlace() === 0;

            return handlerAddGadgetDisabled || noSlotsLeftToPlace;
        },
        /**
         * Method responsible to create an appropriate gadget selector instance for this dashboard.
         * @protected
         * @returns {KoViewModel}
         * @for PatientHeaderDashboard
         */
        createGadgetSelectorInstance: function() {
            var
                self = this;

            return new PatientHeaderDashboardGadgetSelector( {
                host: self
            } );
        },
        /**
         * @for PatientHeaderDashboard
         */
        isColumnDropTargetVisible: function( /*columnIndex*/ ) {
            var
                self = this,
                gadgetDragging = unwrap( self.gadgetDragging ),
                slotsLeftToPlace = self.getSlotsLeftToPlace();

            return gadgetDragging && slotsLeftToPlace > 0;
        },
        /**
         * Toggle gadget edit mode click handler
         */
        handlerToggleEditMode: function() {
            var
                self = this,
                inEditMode,
                gadgetSelector = peek( self.gadgetSelector ),
                handlerDisabled = self.handlerToggleEditModeDisabled();

            if( handlerDisabled ) {
                return;
            }

            inEditMode = self.toggleEditMode();

            if( inEditMode ) {

                if( !(self.handlerAddGadgetDisabled() || gadgetSelector) ) {
                    self.showGadgetSelector();
                }

            }
            else {
                self.unsetGadgetSelector();
            }
        },
        /**
         * Toggles "inEditMode"
         * @returns {Boolean} The toggled state for "inEditMode"
         */
        toggleEditMode: function() {
            var
                self = this,
                result = !peek( self.inEditMode );

            self.inEditMode( result );

            return result;
        },
        /**
         * Test if toggle gadget edit mode click handler should be disabled
         */
        handlerToggleEditModeDisabled: function() {
            var
                self = this,
                isNotLoaded = !unwrap( self.loaded ),
                isNotScreenWidth = 'xs' === unwrap( self.screenWidth );

            return isNotLoaded || isNotScreenWidth;
        },
        /**
         * Layout state is edit mode
         * @property inEditMode
         * @type null|ko.observable
         * @default false
         */
        inEditMode: null,
        /** @private */
        _initEditMode: function() {
            var
                self = this;

            self.inEditMode = ko.observable( false );

            self.screenWidth = Y.doccirrus.utils.getBootstrapScreenWidthComputed();

            self.addDisposable( ko.computed( function() {
                var
                    screenWidth = unwrap( self.screenWidth );

                if( 'xs' === screenWidth ) {
                    self.inEditMode( false );
                    self.unsetGadgetSelector();
                }
            } ) );

        },
        /**
         * Computes current grid status
         * @property gridStatus
         * @type null|ko.computed(null|{ info: Object, list: Array, matrix: Array, map: Object })
         */
        gridStatus: null,
        /** @private */
        _initGridStatus: function() {
            var
                self = this;

            self.dropTarget = ko.observable( null );

            self.gridStatus = ko.computed( function() {
                var
                    activeDashboardGadgets = unwrap( self.activeDashboardGadgets ),
                    _ddContainerElement = unwrap( self._ddContainerElement ),
                    inEditMode = unwrap( self.inEditMode ),
                    dropTarget = unwrap( self.dropTarget ),

                    rowElement, rowWidth,
                    slotWidth, slotHeight,
                    list, map, info,
                    matrix, matrixCols, matrixRows, matrixCurrentRow, highestUsedRowIndex = -1,
                    slotsLeftPerRow, slotsLeftPerRowCols, slotsLeftPerRowRows, slotsLeftPerRowStopIter,
                    prevSlot,
                    result = null;

                if( inEditMode && Array.isArray( activeDashboardGadgets ) && Array.isArray( activeDashboardGadgets[0] ) && dropTarget ) {

                    /** set up result **/
                    result = {
                        list: [],
                        map: {},
                        matrix: [],
                        info: {
                            usedSlots: 0,
                            unusedSlots: DEFAULTS.LAYOUT_ROWS * DEFAULTS.LAYOUT_COLUMNS,
                            highestUsedRowIndex: highestUsedRowIndex,
                            unusedRowsCount: DEFAULTS.LAYOUT_ROWS,
                            availableColsForNextItemOnDropTarget: 0
                        }
                    };
                    list = result.list;
                    map = result.map;
                    matrix = result.matrix;
                    info = result.info;

                    /** set up subscription **/
                    activeDashboardGadgets[0].forEach( function( gadgetModel ) {
                        unwrap( gadgetModel.config );
                    } );

                    /** set up matrix **/
                    for( matrixRows = 0; matrixRows < DEFAULTS.LAYOUT_ROWS; matrixRows++ ) {
                        matrixCurrentRow = [];
                        for( matrixCols = 0; matrixCols < DEFAULTS.LAYOUT_COLUMNS; matrixCols++ ) {
                            matrixCurrentRow.push( false );
                        }
                        matrix.push( matrixCurrentRow );
                    }

                    /** recalculate on change **/
                    rowElement = _ddContainerElement.querySelector( '.row' );
                    rowWidth = rowElement.offsetWidth;
                    slotWidth = Math.round( rowWidth / DEFAULTS.LAYOUT_COLUMNS );
                    slotHeight = DEFAULTS.LAYOUT_ROW_HEIGHT + DEFAULTS.LAYOUT_ROW_MARGIN;

                    /** update each items state **/
                    Y.Array( rowElement.querySelectorAll( '.Gadget-slot' ) ).forEach( function( el ) {
                        var
                            model = ko.dataFor( el ),
                            offsets = {
                                x: el.offsetLeft,
                                left: el.offsetLeft,
                                y: el.offsetTop,
                                top: el.offsetTop,
                                width: el.offsetWidth,
                                height: el.offsetHeight,
                                bottom: el.offsetTop + el.offsetHeight,
                                right: el.offsetLeft + el.offsetWidth
                            },
                            config = self.makeSlotConfigFromOffsets( offsets, slotWidth, slotHeight ),
                            slotData = {
                                el: el,
                                offsets: offsets,
                                model: model,
                                config: config
                            },

                            mX, mxLen = config.x + config.cols,
                            mY, myLen = config.y + config.rows,

                            myLenIndex = myLen - 1,

                            calcDropTargetCols = false, dropTargetOffsetRows, dropTargetOffsetCols;

                        /** build access references **/
                        if( model.isDrop ) {
                            result.dropTarget = slotData;
                        }
                        else {
                            map[peek( model._id )] = slotData;
                            list.push( slotData );
                            // assign slotData to used slots in matrix
                            for( mY = config.y; mY < myLen; mY++ ) {
                                for( mX = config.x; mX < mxLen; mX++ ) {
                                    matrix[mY][mX] = slotData;
                                    info.usedSlots++;
                                }
                            }

                            // build the highest used row index
                            if( myLenIndex > highestUsedRowIndex ) {
                                highestUsedRowIndex = myLenIndex;
                            }
                            info.highestUsedRowIndex = highestUsedRowIndex;
                        }

                        /**
                         * - drop target might be not visible and not computed into matrix (which actually should not be)
                         * - it is assumed that it is the last element
                         */
                        if( model.isDrop ) {
                            // visible whether or not … recalculate

                            if( prevSlot ) {
                                // calculate is needed when there is room for the drop target
                                // determined by room beside previous item
                                calcDropTargetCols = matrix[prevSlot.config.y].lastIndexOf( false ) === DEFAULTS.LAYOUT_COLUMNS - 1;

                                if( calcDropTargetCols ) {

                                    dropTargetOffsetRows = prevSlot.config.y;
                                    dropTargetOffsetCols = prevSlot.config.x + prevSlot.config.cols;

                                }
                                else {
                                    // no room beside previous item
                                    // maybe blocking item somewhere
                                    if( (prevSlot.config.y + prevSlot.config.rows - 1) < highestUsedRowIndex ) {
                                        // find next possible space
                                        for( dropTargetOffsetRows = prevSlot.config.y + prevSlot.config.rows; dropTargetOffsetRows <= highestUsedRowIndex; dropTargetOffsetRows++ ) {
                                            for( dropTargetOffsetCols = DEFAULTS.LAYOUT_COLUMNS; dropTargetOffsetCols > 0; dropTargetOffsetCols-- ) {
                                                if( matrix[dropTargetOffsetRows][dropTargetOffsetCols - 1] ) {
                                                    calcDropTargetCols = true;
                                                    break;
                                                }
                                            }
                                            if( calcDropTargetCols ) {
                                                break;
                                            }
                                        }
                                    }
                                }

                            }

                            // rebuild offsets & config for drop target
                            if( calcDropTargetCols ) {
                                offsets.x = Math.round( rowWidth / DEFAULTS.LAYOUT_COLUMNS * dropTargetOffsetCols );
                                offsets.left = offsets.x;
                                offsets.y = slotHeight * dropTargetOffsetRows;
                                offsets.top = offsets.y;
                                offsets.width = Math.round( rowWidth / DEFAULTS.LAYOUT_COLUMNS * (DEFAULTS.LAYOUT_COLUMNS - dropTargetOffsetCols) );
                                offsets.height = slotHeight;
                                offsets.bottom = offsets.top + offsets.height;
                                offsets.right = offsets.left + offsets.width;
                            }
                            else {
                                offsets.x = 0;
                                offsets.left = 0;
                                offsets.y = slotHeight * (highestUsedRowIndex + 1);
                                offsets.top = offsets.y;
                                offsets.width = rowWidth;
                                offsets.height = slotHeight;
                                offsets.bottom = offsets.top + offsets.height;
                                offsets.right = offsets.left + offsets.width;
                            }

                            Y.mix( config, self.makeSlotConfigFromOffsets( offsets, slotWidth, slotHeight ), true );

                        }

                        // cache last item
                        prevSlot = slotData;

                    } );

                    /** unused rows count info **/
                    if( info.highestUsedRowIndex > -1 ) {
                        info.unusedRowsCount = info.unusedRowsCount - (info.highestUsedRowIndex + 1);
                    }

                    /** calc available row slots **/
                    slotsLeftPerRow = [];
                    // build slotsLeftPerRow
                    for( slotsLeftPerRowRows = 0; slotsLeftPerRowRows < DEFAULTS.LAYOUT_ROWS; slotsLeftPerRowRows++ ) {
                        slotsLeftPerRow[slotsLeftPerRowRows] = 0;
                    }
                    // reverse increment available row slots until item found
                    for( slotsLeftPerRowRows = DEFAULTS.LAYOUT_ROWS - 1; slotsLeftPerRowRows >= 0; slotsLeftPerRowRows-- ) {
                        for( slotsLeftPerRowCols = DEFAULTS.LAYOUT_COLUMNS - 1; slotsLeftPerRowCols >= 0; slotsLeftPerRowCols-- ) {
                            if( false !== matrix[slotsLeftPerRowRows][slotsLeftPerRowCols] ) {
                                slotsLeftPerRowStopIter = true;
                                break;
                            }
                            slotsLeftPerRow[slotsLeftPerRowRows]++;
                        }
                        if( slotsLeftPerRowStopIter ) {
                            break;
                        }
                    }
                    // use dropTarget to determine, it already calculated that
                    if( Y.Lang.isValue( getObject( 'dropTarget.config.cols', result ) ) && result.dropTarget.config.y < DEFAULTS.LAYOUT_ROWS ) {
                        info.availableColsForNextItemOnDropTarget = result.dropTarget.config.cols;
                    }

                    /** un-/used slots info **/
                    info.unusedSlots = info.unusedSlots - info.usedSlots;

                }

                //console.warn( 'gridStatus', result )

                return result;
            } ).extend( {rateLimit: 0} );
        },
        /** @protected */
        makeSlotConfigFromOffsets: function( offsets, slotWidth, slotHeight ) {
            var
                config = {};

            config.cols = Math.round( offsets.width / slotWidth );
            config.rows = Math.round( offsets.height / slotHeight );
            config.x = Math.round( offsets.left / slotWidth );
            config.y = Math.round( offsets.top / slotHeight );

            return config;
        },
        /** @protected */
        notifyBindDropTarget: function( element ) {
            var
                self = this;

            self.dropTarget( element );
        },
        /** @protected */
        notifyDisposeDropTarget: function() {
            var
                self = this;

            self.dropTarget( null );
        },
        /**
         * Predicts the grid status to render by supplied array of config items,
         * either the config item by itself or an item that has a "config" property
         * @param {Object[]} items
         * @param {Object|Number} items[].config.cols|cols
         * @param {Object|Number} items[].config.rows|rows
         * @returns {{info: Object, list: Array, map: Object, matrix: Array}}
         */
        predictGridStatus: function( items ) {
            var
                info = {},
                list = [],
                map = {},
                matrix = [],
                result = {
                    info: info,
                    list: list,
                    map: map,
                    matrix: matrix
                };

            if( Array.isArray( items ) ) {
                items = items.map( function( config ) {
                    var
                        supplier = config,
                        cols,
                        rows;

                    if( Y.Object.owns( supplier, 'config' ) ) {
                        supplier = supplier.config;
                    }

                    cols = Y.Lang.isValue( supplier.cols ) ? supplier.cols : DEFAULTS.GADGET_COLS;
                    rows = Y.Lang.isValue( supplier.rows ) ? supplier.rows : DEFAULTS.GADGET_ROWS;

                    return {
                        cols: cols,
                        rows: rows,
                        reference: config
                    };
                } );
            }
            else {
                return result;
            }

            function newRow() {
                var row = [],
                    i;
                for( i = 0; i < DEFAULTS.LAYOUT_COLUMNS; i++ ) {
                    row.push( false );
                }
                return row;
            }

            function addToMatrix( config ) {
                var
                    lastItem = list[list.length - 1],
                    mY, mX, myLen, mxLen,
                    i;

                // first item
                if( !matrix.length ) {
                    matrix.push( newRow() );
                    config.x = 0;
                    config.y = 0;
                }

                // place behind last item
                if( lastItem ) {
                    mY = lastItem.y;
                    mX = lastItem.x;
                    mxLen = lastItem.x + lastItem.cols;
                    config.y = mY;
                    config.x = mxLen;
                    // check row break
                    while( (config.x + config.cols) > DEFAULTS.LAYOUT_COLUMNS ) {
                        config.x = 0;
                        config.y++;
                        if( !matrix[config.y] ) {
                            matrix[config.y] = newRow();
                        }
                        for( i = DEFAULTS.LAYOUT_COLUMNS; i > 0; i-- ) {
                            if( matrix[config.y][i - 1] ) {
                                config.x = i;
                                break;
                            }
                        }
                    }
                }

                // place current item
                myLen = config.y + config.rows;
                mxLen = config.x + config.cols;
                for( mY = config.y; mY < myLen; mY++ ) {
                    if( !matrix[mY] ) {
                        matrix[mY] = newRow();
                    }
                    for( mX = config.x; mX < mxLen; mX++ ) {
                        matrix[mY][mX] = config;
                    }
                }

                list.push( config );
            }

            items.forEach( addToMatrix );

            return result;
        },
        /**
         * Checks if the predicted grid status is allowed to use
         * @param {{info: Object, list: Array, map: Object, matrix: Array}} predictGridStatus
         * @returns {Boolean}
         */
        isAllowedGridStatusPrediction: function( predictGridStatus ) {
            if( Y.Lang.isObject( predictGridStatus ) && Array.isArray( predictGridStatus.matrix ) ) {
                if( predictGridStatus.matrix.length <= DEFAULTS.LAYOUT_ROWS ) {
                    return true;
                }
            }
            return false;
        },
        /**
         * @param {Object} parameters
         * @param {DD.Drag} parameters.drag
         * @param {DD.Drop} parameters.drop
         * @param {EventFacade} parameters._event
         * @returns {boolean}
         * @for PatientHeaderDashboard
         */
        isValidDragDropEvent: function( parameters ) {
            if( !PatientHeaderDashboard.superclass.isValidDragDropEvent.apply( this, arguments ) ) {
                return false;
            }
            var
                self = this,
                allowDragOnDrop,
                gridStatus = peek( self.gridStatus ),

                drag = parameters.drag,
                drop = parameters.drop,

                dragNode = drag.get( 'node' ),
                dragSlotNode = dragNode.ancestor( '.Gadget-slot' ),
                dragSlotElement = dragSlotNode.getDOMNode(),
                dragModel = ko.dataFor( dragSlotElement ),
                dragItemGridStatus = gridStatus.map[peek( dragModel._id )],
                dragItemGridStatusIndex = gridStatus.list.indexOf( dragItemGridStatus ),

                dropNode = drop.get( 'node' ),
                dropSlotNode = dropNode.ancestor( '.Gadget-slot' ),
                dropSlotElement = dropSlotNode.getDOMNode(),
                dropModel = ko.dataFor( dropSlotElement ),
                dropItemGridStatus = gridStatus.map[peek( dropModel._id )],
                dropItemGridStatusIndex = gridStatus.list.indexOf( dropItemGridStatus ),

                isDropTarget = Boolean( dropModel.isDrop ),
                configs = [].concat( gridStatus.list ),
                predictedGridStatus;

            /** check allowed grid status change **/
            if( isDropTarget ) {
                dropItemGridStatusIndex = gridStatus.list.length;
            }
            configs.splice( dragItemGridStatusIndex, 1 );
            configs.splice( dropItemGridStatusIndex, 0, dragItemGridStatus );

            predictedGridStatus = self.predictGridStatus( configs );
            allowDragOnDrop = self.isAllowedGridStatusPrediction( predictedGridStatus );

            return allowDragOnDrop;
        },
        /**
         * Get a gadget's configured columns by it's model (or default if not configured)
         * @param gadgetModel
         * @returns {Number}
         */
        getColsFromGadgetModel: function( gadgetModel ) {
            var
                config = unwrap( gadgetModel.config ),
                rows = getObject( DEFAULTS.GADGET_COL_PROP, config ) || DEFAULTS.GADGET_COLS;

            return rows;
        },
        /**
         * Get a gadget's configured rows by it's model (or default if not configured)
         * @param gadgetModel
         * @returns {Number}
         */
        getRowsFromGadgetModel: function( gadgetModel ) {
            var
                config = unwrap( gadgetModel.config ),
                rows = getObject( DEFAULTS.GADGET_ROW_PROP, config ) || DEFAULTS.GADGET_ROWS;

            return rows;
        },
        /**
         * Returns how much slots are left to place a gadget inside
         * @returns {Number}
         */
        // TODO: this just uses the slots when dropping on drop target, it does not take into account dropping on a gadget - e.g.:
        // oooooooooxxx
        // oooooooooooo
        // oooooooooooo
        // oooooooooooo
        // (o is placed, x is empty > x could be placed via drop on gadget)
        getSlotsLeftToPlace: function() {
            var
                self = this,
                gridStatus = unwrap( self.gridStatus ),
                availableColsForNextItemOnDropTarget;

            if( !gridStatus ) {
                return 0;
            }
            availableColsForNextItemOnDropTarget = gridStatus.info.availableColsForNextItemOnDropTarget;

            return availableColsForNextItemOnDropTarget;
        },
        /**
         * Gives the current total width of the columns container
         * @returns {Number}
         */
        getCurrentWidthForAllColumns: function() {
            var
                self = this,
                _ddContainerElement = unwrap( self._ddContainerElement ),
                rowElement = _ddContainerElement.querySelector( '.row' );

            return rowElement.offsetWidth;
        },
        /**
         * Gives the current width for one column of the container
         * @returns {Number}
         */
        getCurrentWidthForOneColumn: function() {
            var
                self = this;

            return (self.getCurrentWidthForAllColumns() / DEFAULTS.LAYOUT_COLUMNS) - DEFAULTS.LAYOUT_COLUMN_MARGIN;
        },
        /**
         * Displays a notice about how to use this layout's edit mode
         */
        showEditModeInfo: function() {
            Y.doccirrus.DCWindow.notice( {
                message: i18n( 'PatientHeaderDashboard.showEditModeInfoMessage' ),
                window: {
                    width: 'medium'
                }
            } );
        },
        /**
         * Returns bootstrap css class name to use for a gadget's width
         * @param gadgetModel
         * @returns {String}
         */
        getColClassName: function( gadgetModel ) {
            var
                self = this;

            return 'col-xs-' + self.getColsFromGadgetModel( gadgetModel );
        },
        /**
         * Returns css class name to use for a gadget's height
         * @param gadgetModel
         * @returns {String}
         */
        getRowClassName: function( gadgetModel ) {
            var
                self = this;

            return 'Gadget-height-' + self.getRowsFromGadgetModel( gadgetModel );
        },
        isDropTargetTextVisible: function() {
            var
                self = this,
                gridStatus = unwrap( self.gridStatus ),
                cols = DEFAULTS.LAYOUT_COLUMNS;

            if( gridStatus ) {
                cols = gridStatus.info.availableColsForNextItemOnDropTarget;
            }

            return cols > 1;
        },
        /**
         * Returns bootstrap css class name to use for a gadget's drop target
         * @returns {String}
         */
        getDropTargetClassName: function() {
            var
                self = this,
                gridStatus = unwrap( self.gridStatus ),
                cols = DEFAULTS.LAYOUT_COLUMNS;

            if( gridStatus ) {
                cols = gridStatus.info.availableColsForNextItemOnDropTarget;
            }

            return 'col-xs-' + cols;
        }
    }, {
        NAME: 'PatientHeaderDashboard',
        ATTRS: {
            /**
             * Available layout types as list
             * @attribute layoutList
             * @type Array
             * @for PatientHeaderDashboard
             */
            layoutList: {
                valueFn: function() {
                    return GADGET_LAYOUT_PATIENT.list;
                },
                validator: Array.isArray
            },
            /**
             * Default layout type from list
             * @attribute layoutDefaultValue
             * @type Number
             * @for PatientHeaderDashboard
             */
            layoutDefaultValue: {
                valueFn: function() {
                    return GADGET_LAYOUT_PATIENT.defaultType;
                },
                validator: Y.Lang.isNumber
            },
            /**
             * Available layout types
             * @attribute layoutTypes
             * @type Object
             * @for PatientHeaderDashboard
             */
            layoutTypes: {
                valueFn: function() {
                    return GADGET_LAYOUT_PATIENT.types;
                },
                validator: Y.Lang.isObject
            },
            dashboardModelDefaultData: {
                valueFn: function() {
                    var
                        self = this,
                        dashboardId = createObjectId();

                    return {
                        _id: createObjectId(),
                        'dashboards': [
                            {
                                '_id': dashboardId,
                                'collections': [
                                    {
                                        '_id': createObjectId(),
                                        'gadgets': [
                                            createDefaultDataConfigObject( 'PatientGadgetProfileImage', 2, 2 ),
                                            createDefaultDataConfigObject( 'PatientGadgetCommunications', 2, 2 ),
                                            createDefaultDataConfigObject( 'PatientGadgetInsuranceStatus', 2, 2 ),
                                            createDefaultDataConfigObject( 'PatientGadgetMarkers', 2, 2 ),
                                            createDefaultDataConfigObject( 'PatientGadgetCommentWithNextAppointmentAndTask', 4, 2 )
                                        ]
                                    }
                                ],
                                'layout': self.get( 'layoutDefaultValue' ),
                                'name': 'Doccirrus Standard'
                            }
                        ],
                        'activeDashboardId': dashboardId
                    };
                }
            },
            /**
             * Gadgets that are available for this layout to configure
             * @for PatientHeaderDashboard
             */
            availableGadgetNamesToAdd: {
                valueFn: function() {
                    let optionsList = [
                        {
                            val: 'PatientGadgetPatientNumber',
                            i18n: i18n( 'PatientGadget.PatientGadgetPatientNumber.i18n' )
                        },
                        {
                            val: 'PatientGadgetProcedure',
                            i18n: i18n( 'PatientGadget.PatientGadgetProcedure.i18n' )
                        },
                        {
                            val: 'PatientGadgetProfileImage',
                            i18n: i18n( 'PatientGadget.PatientGadgetProfileImage.i18n' )
                        },
                        {
                            val: 'PatientGadgetCommunications',
                            i18n: i18n( 'PatientGadget.PatientGadgetCommunications.i18n' )
                        },
                        {
                            val: 'PatientGadgetInsuranceStatus',
                            i18n: i18n( 'PatientGadget.PatientGadgetInsuranceStatus.i18n' )
                        },
                        {
                            val: 'PatientGadgetCrm',
                            i18n: i18n( 'PatientGadget.PatientGadgetCrm.i18n' )
                        },
                        {
                            val: 'PatientGadgetAttachedContentInfo',
                            i18n: i18n( 'PatientGadget.PatientGadgetAttachedContentInfo.i18n' )
                        },
                        {
                            val: 'PatientGadgetMarkers',
                            i18n: i18n( 'PatientGadget.PatientGadgetMarkers.i18n' )
                        },
                        {
                            val: 'PatientGadgetCommentWithNextAppointmentAndTask',
                            i18n: i18n( 'PatientGadget.PatientGadgetCommentWithNextAppointmentAndTask.i18n' )
                        },
                        {
                            val: 'PatientGadgetLastHistory',
                            i18n: i18n( 'PatientGadget.PatientGadgetLastHistory.i18n' )
                        },
                        {
                            val: 'PatientGadgetLastDLDiagnosis',
                            i18n: i18n( 'PatientGadget.PatientGadgetLastDLDiagnosis.i18n' )
                        },
                        {
                            val: 'PatientGadgetLastFinding',
                            i18n: i18n( 'PatientGadget.PatientGadgetLastFinding.i18n' )
                        },
                        {
                            val: 'PatientGadgetDiagnosisTypeContinuous',
                            i18n: i18n( 'PatientGadget.PatientGadgetDiagnosisTypeContinuous.i18n' )
                        },
                        {
                            val: 'PatientGadgetDiagnosis',
                            i18n: i18n( 'PatientGadget.PatientGadgetDiagnosis.i18n' )
                        },
                        {
                            val: 'PatientGadgetMedication',
                            i18n: i18n( 'PatientGadget.PatientGadgetMedication.i18n' )
                        },
                        {
                            val: 'PatientGadgetLastAppointments',
                            i18n: i18n( 'PatientGadget.PatientGadgetLastAppointments.i18n' )
                        },
                        {
                            val: 'PatientGadgetLastNoShowAppointments',
                            i18n: i18n( 'PatientGadget.PatientGadgetLastNoShowAppointments.i18n' )
                        },
                        {
                            val: 'PatientGadgetUpcomingAppointments',
                            i18n: i18n( 'PatientGadget.PatientGadgetUpcomingAppointments.i18n' )
                        },
                        {
                            val: 'PatientGadgetAlarmClock',
                            i18n: i18n( 'PatientGadget.PatientGadgetAlarmClock.i18n' )
                        },
                        {
                            val: 'PatientGadgetTreatments',
                            i18n: i18n( 'PatientGadget.PatientGadgetTreatments.i18n' )
                        },
                        {
                            val: 'PatientGadgetCaves',
                            i18n: i18n( 'PatientGadget.PatientGadgetCaves.i18n' )
                        },
                        {
                            val: 'PatientGadgetGestation',
                            i18n: i18n( 'PatientGadget.PatientGadgetGestation.i18n' )
                        },
                        {
                            val: 'PatientGadgetAddress',
                            i18n: i18n( 'PatientGadget.PatientGadgetAddress.i18n' )
                        },
                        {
                            val: 'PatientGadgetReference',
                            i18n: i18n( 'PatientGadget.PatientGadgetReference.i18n' )
                        },
                        {
                            val: 'PatientGadgetJobTitle',
                            i18n: i18n( 'PatientGadget.PatientGadgetJobTitle.i18n' )
                        },
                        {
                            val: 'PatientGadgetLatestMedicationPlan',
                            i18n: i18n( 'PatientGadget.PatientGadgetLatestMedicationPlan.i18n' )
                        },
                        {
                            val: 'PatientGadgetIFrame',
                            i18n: i18n( 'PatientGadget.PatientGadgetIFrame.i18n' )
                        },
                        {
                            val: 'PatientGadgetCompletedTasks',
                            i18n: i18n( 'PatientGadget.PatientGadgetCompletedTasks.i18n' )
                        },
                        {
                            val: 'PatientGadgetCurrentTasks',
                            i18n: i18n( 'PatientGadget.PatientGadgetCurrentTasks.i18n' )
                        },
                        {
                            val: 'PatientGadgetTherapy',
                            i18n: i18n( 'PatientGadget.PatientGadgetTherapy.i18n' )
                        },
                        {
                            val: 'PatientGadgetLatestVaccinationStatus',
                            i18n: i18n( 'PatientGadget.PatientGadgetLatestVaccinationStatus.i18n' )
                        },
                        {
                            val: 'PatientGadgetLatestMedData',
                            i18n: i18n( 'PatientGadget.PatientGadgetLatestMedData.i18n' )
                        },
                        {
                            val: 'PatientGadgetLatestLabData',
                            i18n: i18n( 'PatientGadget.PatientGadgetLatestLabData.i18n' )
                        },
                        {
                            val: 'PatientGadgetDoctorAddress',
                            i18n: i18n( 'PatientGadget.PatientGadgetDoctorAddress.i18n' )
                        },
                        {
                            val: 'PatientGadgetInvoices',
                            i18n: i18n( 'PatientGadget.PatientGadgetInvoices.i18n' )
                        },
                        {
                            val: 'PatientGadgetMedicationTypeContinuous',
                            i18n: i18n( 'PatientGadget.PatientGadgetMedicationTypeContinuous.i18n' )
                        }
                    ];

                    if( Y.doccirrus.auth.hasAdditionalService( Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOC ) ) {
                        optionsList.push(
                            {
                                val: 'PatientGadgetAmts',
                                i18n: i18n( 'PatientGadget.PatientGadgetAmts.i18n' )
                            }
                        );
                    }

                    return optionsList.sort( function( a, b ) {
                        if( a.i18n.toLocaleLowerCase() < b.i18n.toLocaleLowerCase() ) {
                            return -1;
                        }
                        if( a.i18n.toLocaleLowerCase() > b.i18n.toLocaleLowerCase() ) {
                            return 1;
                        }
                        return 0;
                    } );
                }
            }
        },
        /**
         * @static
         */
        DEFAULTS: DEFAULTS
    } );

    KoViewModel.registerConstructor( PatientHeaderDashboard );

    initStyleSheet();

}, '3.16.0', {
    requires: [
        'oop',
        'stylesheet',

        'doccirrus',
        'KoViewModel',
        'GadgetConstants',
        'GadgetLayouts',
        'GadgetUtils',
        'DashboardBase',
        'dccommonutils',
        'dcutils',
        'DCWindow',
        'PatientHeaderDashboardGadgetSelector'
    ]
} );
