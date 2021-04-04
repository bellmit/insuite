/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PatientGadgetEditGadget', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetEditGadget
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        getObject = Y.doccirrus.commonutils.getObject,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' ),
        PatientHeaderDashboard = KoViewModel.getConstructor( 'PatientHeaderDashboard' ),

        DASHBOARD_DEFAULTS = PatientHeaderDashboard.DEFAULTS,

        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        GADGET_UTILS = GADGET.utils,

        GADGET_RESIZE_CLASS_NAME_VALID = 'PatientHeaderDashboard-resize-valid',
        GADGET_RESIZE_CLASS_NAME_INVALID = 'PatientHeaderDashboard-resize-invalid',
        i18n = Y.doccirrus.i18n;

    /**
     * @constructor
     * @class PatientGadgetEditGadget
     * @extends PatientGadget
     */
    function PatientGadgetEditGadget() {
        PatientGadgetEditGadget.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetEditGadget, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initPatientGadgetEditGadget();
        },
        /** @private */
        destructor: function() {
            var
                self = this;

            self._destroyResize();
        },
        /** @private */
        _initPatientGadgetEditGadget: function() {
            var
                self = this;

            self._initLabel();
            self._initGadgetResize();

            self.editable = self.isEditable();
            self.settingsI18n = i18n( 'PatientHeaderDashboard.PatientGadgetEditGadget.settings' );
        },
        /**
         * Label to show for this gadget
         * @property label
         * @type null|ko.observable
         */
        label: null,
        /** @private */
        _initLabel: function() {
            var
                self = this,
                dashboard = self.get( 'dashboard' ),
                gadgetModel = self.get( 'gadgetModel' ),
                availableGadgetNamesToAdd = dashboard.get( 'availableGadgetNamesToAdd' ),
                gadgetName = dashboard.getGadgetName( peek( gadgetModel.gadgetConst ) ),
                availableGadgetName = Y.Array.find( availableGadgetNamesToAdd, function( item ) {
                    return gadgetName === item.val;
                } );

            if( availableGadgetName ) {
                self.label = availableGadgetName.i18n;
            }

        },
        /** @private */
        _initGadgetResize: function() {
            var
                self = this;

            self._resizeElement = ko.observable( null );

            // compute dependencies on DOM manipulations
            self.addDisposable( ko.computed( function() {
                var
                    _resizeElement = unwrap( self._resizeElement );

                if( _resizeElement ) {
                    self._initResize( _resizeElement );
                }
                else {
                    self._destroyResize();
                }
            } ) ); // ensure DOM manipulated

        },
        /** @private */
        _destroyResize: function() {
            var
                self = this;

            if( self._resize ) {
                self._resize.destroy();
                self._resize = null;
            }
        },
        /** @protected */
        _resize: null,
        /** @protected */
        _gadgetResizeClassNameValid: GADGET_RESIZE_CLASS_NAME_VALID,
        /** @protected */
        _gadgetResizeClassNameInValid: GADGET_RESIZE_CLASS_NAME_INVALID,
        /** @private */
        _initResize: function( resizeElement ) {
            var
                self = this,
                gadgetModel = self.get( 'gadgetModel' ),
                dashboard = self.get( 'dashboard' ),
                colParts = DASHBOARD_DEFAULTS.LAYOUT_COLUMNS,
                colMargin = DASHBOARD_DEFAULTS.LAYOUT_COLUMN_MARGIN,
                rowHeights = DASHBOARD_DEFAULTS.LAYOUT_ROWS_OFFSET_HEIGHT,
                minHeight = DASHBOARD_DEFAULTS.LAYOUT_ROW_HEIGHT,
                maxHeight = DASHBOARD_DEFAULTS.LAYOUT_ROWS_OFFSET_HEIGHT[DASHBOARD_DEFAULTS.LAYOUT_ROWS],
                rowMargin = DASHBOARD_DEFAULTS.LAYOUT_ROW_MARGIN,
                rowHeight = DASHBOARD_DEFAULTS.LAYOUT_ROW_HEIGHT + rowMargin,
                tickY = rowHeight,
                resize = self._resize = new Y.Resize( {
                    node: resizeElement,
                    handles: 'r, br, b' // right, bottom-right, bottom
                } ),
                resizeConstrained = resize.plug( Y.Plugin.ResizeConstrained, {
                    minHeight: minHeight,
                    maxHeight: maxHeight,
                    // tickX & tickY here are only config properties - actually those attributes are inside "resize.delegate.dd.con"
                    tickY: tickY
                } ).con,
                resizeDragConstrained = resize.delegate.dd.con,

                rowOffsetWidthTmp,
                colWidthTmp;

            /**
             *
             * @param {EventFacade} yEvent
             * @returns {Boolean}
             */
            function isAllowedResizeEvent( yEvent ) {
                var
                    info = yEvent.info,
                    target = yEvent.target,
                    targetNode = target.get( 'node' ),
                    slotNode = targetNode.ancestor( '.Gadget-slot' ),
                    slotElement = slotNode.getDOMNode(),
                    slot = {
                        el: slotElement,
                        offsets: {},
                        model: ko.dataFor( slotElement )
                    },
                    offsets = slot.offsets,
                    gridStatus = unwrap( dashboard.gridStatus ),
                    itemOfGridStatus = gridStatus.map[peek( slot.model._id )],
                    predictedGridStatus,
                    allowedResize;

                offsets.x = slotElement.offsetLeft;
                offsets.left = offsets.x;
                offsets.y = slotElement.offsetTop;
                offsets.top = offsets.y;
                offsets.width = info.offsetWidth + colMargin;
                offsets.height = info.offsetHeight + rowMargin;
                offsets.bottom = offsets.top + offsets.height;
                offsets.right = offsets.left + offsets.width;

                slot.config = dashboard.makeSlotConfigFromOffsets( offsets, colWidthTmp, rowHeight );

                predictedGridStatus = dashboard.predictGridStatus( gridStatus.list.map( function( item ) {
                    return item === itemOfGridStatus ? slot : item;
                } ) );

                allowedResize = dashboard.isAllowedGridStatusPrediction( predictedGridStatus );

                return allowedResize;
            }

            resize.on( {
                'resize:start': function( /*yEvent*/ ) {
                    var
                        rowOffsetWidth = dashboard.getCurrentWidthForAllColumns(),
                        colWidth = dashboard.getCurrentWidthForOneColumn(),
                        colsLeft = DASHBOARD_DEFAULTS.LAYOUT_COLUMNS,
                        minWidth = colWidth,
                        maxWidth = ((colWidth + colMargin) * colsLeft) - colMargin,
                        tickX = colWidth + colMargin;

                    rowOffsetWidthTmp = rowOffsetWidth;
                    colWidthTmp = tickX;

                    // constrained width might have changed, those have to be computed before each resize
                    resizeConstrained.set( 'minWidth', minWidth );
                    resizeConstrained.set( 'maxWidth', maxWidth );
                    resizeDragConstrained.set( 'tickX', tickX );

                },
                'resize:resize': function( yEvent ) {
                    var
                        node = yEvent.target.get( 'node' );

                    if( isAllowedResizeEvent( yEvent ) ) {
                        node.replaceClass(
                            self._gadgetResizeClassNameInValid,
                            self._gadgetResizeClassNameValid
                        );
                    }
                    else {
                        node.replaceClass(
                            self._gadgetResizeClassNameValid,
                            self._gadgetResizeClassNameInValid
                        );
                    }
                },
                'resize:end': function( yEvent ) {
                    var
                        node = yEvent.target.get( 'node' );

                    node.removeClass( self._gadgetResizeClassNameValid );
                    node.removeClass( self._gadgetResizeClassNameInValid );
                }
            } );

            resize.after( {
                'resize:end': function( yEvent ) {
                    var
                        config = peek( gadgetModel.config ) || {},
                        info = yEvent.info,
                        offsetHeight = info.offsetHeight,
                        offsetWidth = info.offsetWidth,

                        // compute integer for rows and cols based on resize
                        rows = rowHeights.indexOf( offsetHeight ),
                        cols = Math.round( colParts / (rowOffsetWidthTmp / (offsetWidth + colMargin)) );

                    // remove height & width set by resize, because handled by updated class names
                    resizeElement.style.height = '';
                    resizeElement.style.width = '';

                    if( isAllowedResizeEvent( yEvent ) ) {

                        // update rows and cols in gadget model config
                        config[DASHBOARD_DEFAULTS.GADGET_ROW_PROP] = rows;
                        config[DASHBOARD_DEFAULTS.GADGET_COL_PROP] = cols;

                        gadgetModel.config( config );
                    }

                }
            } );

        },
        /**
         * Notify about the resize element bound to
         * @param gadgetElement
         * @protected
         */
        notifyBindResizeElement: function( gadgetElement ) {
            var
                self = this;

            self._resizeElement( Y.one( gadgetElement ).ancestor( '.Gadget' ).getDOMNode() );
        },
        isEditable: function() {
            var
                self = this,
                forGadgetConstructor = self.get( 'forGadgetConstructor' ),
                editable = forGadgetConstructor.prototype.editable;

            return editable;
        }
    }, {
        NAME: 'PatientGadgetEditGadget',
        ATTRS: {
            forGadgetName: {
                valueFn: function() {
                    var
                        self = this,
                        gadgetModel = self.get( 'gadgetModel' );

                    return GADGET_CONST.getGadgetNameByConst( peek( gadgetModel.gadgetConst ) );
                }
            },
            forGadgetConstructor: {
                valueFn: function() {
                    var
                        self = this,
                        forGadgetName = self.get( 'forGadgetName' );

                    return KoViewModel.getConstructor( forGadgetName );
                }
            },
            /**
             * Some sort of markup string
             * - can be a promise to fulfill with a string (returned by valueFn)
             * @for PatientGadgetEditGadget
             */
            editTemplate: {
                valueFn: function() {
                    var
                        self = this,
                        forGadgetConstructor = self.get( 'forGadgetConstructor' ),
                        sameInheritedFnOnConstructor = getObject( 'editTemplate.valueFn', GADGET_UTILS.getATTRSInherited( forGadgetConstructor ) );

                    if( sameInheritedFnOnConstructor ) {
                        return sameInheritedFnOnConstructor.apply( self, arguments );
                    }
                }
            },
            /**
             * Some sort of model
             * - can be a promise to fulfill with a model (returned by valueFn)
             * - specify "toJSON" to not let ko.toJS be used
             * - specify "destroy" to let your model be destroyed (dispose is being ignored when destroy is available)
             * - specify "dispose" to let your model be disposed
             * @for PatientGadgetEditGadget
             */
            editBindings: {
                getter: function() {
                    var
                        self = this,
                        forGadgetConstructor = self.get( 'forGadgetConstructor' ),
                        sameInheritedFnOnConstructor = getObject( 'editBindings.getter', GADGET_UTILS.getATTRSInherited( forGadgetConstructor ) );

                    if( sameInheritedFnOnConstructor ) {
                        return sameInheritedFnOnConstructor.apply( self, arguments );
                    }
                }
            },
            /**
             * A function to call when the dialog was created
             * @attribute editBindings
             * @type null|function
             * @param {Object} data
             * @param {*} data.bindings
             * @param {Y.Node} data.bodyContent
             * @param {DCWindow} data.dialog
             * @for PatientGadgetEditGadget
             */
            editOnBind: {
                valueFn: function() {
                    var
                        self = this,
                        forGadgetConstructor = self.get( 'forGadgetConstructor' ),
                        sameInheritedFnOnConstructor = getObject( 'editOnBind.value', GADGET_UTILS.getATTRSInherited( forGadgetConstructor ) );

                    if( sameInheritedFnOnConstructor ) {
                        return sameInheritedFnOnConstructor;
                    }
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
             * @for PatientGadgetEditGadget
             */
            editUnBind: {
                valueFn: function() {
                    var
                        self = this,
                        forGadgetConstructor = self.get( 'forGadgetConstructor' ),
                        sameInheritedFnOnConstructor = getObject( 'editUnBind.value', GADGET_UTILS.getATTRSInherited( forGadgetConstructor ) );

                    if( sameInheritedFnOnConstructor ) {
                        return sameInheritedFnOnConstructor;
                    }
                }
            }
        }
    } );

    KoViewModel.registerConstructor( PatientGadgetEditGadget );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'PatientGadget',
        'PatientHeaderDashboard',
        'resize',
        'GadgetConstants',
        'GadgetUtils',
        'dccommonutils'
    ]
} );
