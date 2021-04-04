/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PatientHeaderDashboardGadgetSelector', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientHeaderDashboardGadgetSelector
     */
    var
        peek = ko.utils.peekObservable,

        KoViewModel = Y.doccirrus.KoViewModel,
        DashboardBaseGadgetSelector = KoViewModel.getConstructor( 'DashboardBaseGadgetSelector' ),

        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        TPL_PATH_PATIENT = GADGET_CONST.paths.TPL_PATIENT,

        SELECTOR_DRAG_CLASS_NAME = 'PatientHeaderDashboardGadgetSelector-drag',
        SELECTOR_PROXY_CLASS_NAME = 'PatientHeaderDashboardGadgetSelector-proxy',
        SELECTOR_PROXY_CLASS_NAME_VALID = 'PatientHeaderDashboardGadgetSelector-proxy-valid',
        SELECTOR_PROXY_CLASS_NAME_INVALID = 'PatientHeaderDashboardGadgetSelector-proxy-invalid',
        i18n = Y.doccirrus.i18n;

    /**
     * @constructor
     * @class PatientHeaderDashboardGadgetSelector
     * @extends DashboardBaseGadgetSelector
     */
    function PatientHeaderDashboardGadgetSelector() {
        PatientHeaderDashboardGadgetSelector.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientHeaderDashboardGadgetSelector, DashboardBaseGadgetSelector, {
        /** @private */
        initializer: function() {
        },
        /** @private */
        destructor: function() {
        },
        /**
         * Path of template to use in dialog
         * @protected
         * @for PatientHeaderDashboardGadgetSelector
         */
        gadgetSelectorTplPath: TPL_PATH_PATIENT + 'PatientHeaderDashboardGadgetSelector',
        /**
         * Class name applied to element which is dragged via proxy
         * @for PatientHeaderDashboardGadgetSelector
         */
        gadgetSelectorDragClassName: SELECTOR_DRAG_CLASS_NAME,
        /**
         * Class name applied to proxy element which is dragged
         * @for PatientHeaderDashboardGadgetSelector
         */
        gadgetSelectorProxyClassName: SELECTOR_PROXY_CLASS_NAME,
        /**
         * Class name applied to proxy element when dropping is valid
         * @for PatientHeaderDashboardGadgetSelector
         */
        gadgetSelectorProxyClassNameValid: SELECTOR_PROXY_CLASS_NAME_VALID,
        /**
         * Class name applied to proxy element when dropping is invalid
         * @for PatientHeaderDashboardGadgetSelector
         */
        gadgetSelectorProxyClassNameInValid: SELECTOR_PROXY_CLASS_NAME_INVALID,
        /**
         * Bindings to use in gadget selector.
         * @returns {Object}
         * @protected
         * @for PatientHeaderDashboardGadgetSelector
         */
        _createGadgetSelectorBindings: function() {
            var
                self = this,
                host = self.get( 'host' ),
                bindings = PatientHeaderDashboardGadgetSelector.superclass._createGadgetSelectorBindings.apply( this, arguments );

            bindings.infoTextI18n = i18n( 'PatientHeaderDashboard.PatientHeaderDashboardGadgetSelector.infoText' );

            bindings.gadgetsPlaceAble = ko.computed( function() {
                // TODO: @see getSlotsLeftToPlace
                return host.getSlotsLeftToPlace() !== 0;
            } );

            return bindings;
        },
        /**
         * Dispose bindings in gadget selector.
         * @param {Object} bindings
         * @protected
         * @for PatientHeaderDashboardGadgetSelector
         */
        _disposeGadgetSelectorBindings: function( bindings ) {
            var
                self = this;

            PatientHeaderDashboardGadgetSelector.superclass._disposeGadgetSelectorBindings.apply( self, arguments );

            bindings.gadgetsPlaceAble.dispose();
        },
        /**
         * Adjust cloned node of drag proxy inside gadget selector.
         * @param {Node} cloneNode
         * @protected
         * @for PatientHeaderDashboardGadgetSelector
         */
        _adjustGadgetSelectorDragProxyClone: function( cloneNode ) {
            var
                self = this,
                host = self.get( 'host' ),
                DASHBOARD_DEFAULTS = KoViewModel.getConstructor( 'PatientHeaderDashboard' ).DEFAULTS;

            PatientHeaderDashboardGadgetSelector.superclass._adjustGadgetSelectorDragProxyClone.apply( self, arguments );

            cloneNode.setStyle( 'width', host.getCurrentWidthForOneColumn() );
            cloneNode.setStyle( 'height', DASHBOARD_DEFAULTS.LAYOUT_ROW_HEIGHT );
        },
        /**
         * Default gadget model data to use when drop creates a new gadget.
         * @protected
         * @param {EventFacade} yEvent
         * @returns {Object}
         * @for PatientHeaderDashboardGadgetSelector
         */
        _createGadgetSelectorDropGadgetConfig: function( /*yEvent*/ ) {
            var
                self = this,
                gadgetConfig = PatientHeaderDashboardGadgetSelector.superclass._createGadgetSelectorDropGadgetConfig.apply( self, arguments );

            Y.mix( gadgetConfig, self.getChangesForGadgetConfigRespectingStatus(), true );

            return gadgetConfig;
        },
        /**
         * Returns Gadget data with only properties needed to fit for current grid status, e.g.: columns
         * @protected
         * @returns {{config:{}}}
         */
        getChangesForGadgetConfigRespectingStatus: function() {
            var
                self = this,
                host = self.get( 'host' ),
                gridStatus = peek( host.gridStatus ),
                DASHBOARD_DEFAULTS = KoViewModel.getConstructor( 'PatientHeaderDashboard' ).DEFAULTS,
                cols = gridStatus.info.availableColsForNextItemOnDropTarget, // TODO: @see getSlotsLeftToPlace
                gadgetConfig = {config: {}};

            // adjust columns of the gadget if less than default value
            if( cols > 0 && cols < DASHBOARD_DEFAULTS.GADGET_COLS ) {
                gadgetConfig.config[DASHBOARD_DEFAULTS.GADGET_COL_PROP] = cols;
            }

            return gadgetConfig;

        },
        /**
         * @param {Object} parameters
         * @param {DD.Drag} parameters.drag
         * @param {DD.Drop} parameters.drop
         * @param {EventFacade} parameters._event
         * @returns {boolean}
         * @for PatientHeaderDashboardGadgetSelector
         */
        isValidDragDropEvent: function( parameters ) {
            if( !PatientHeaderDashboardGadgetSelector.superclass.isValidDragDropEvent.apply( this, arguments ) ) {
                return false;
            }
            var
                self = this,
                DASHBOARD_DEFAULTS = KoViewModel.getConstructor( 'PatientHeaderDashboard' ).DEFAULTS,
                drop = parameters.drop,

                host = self.get( 'host' ),
                allowDragOnDrop,
                gridStatus = peek( host.gridStatus ),

                gadgetConfig = self.getChangesForGadgetConfigRespectingStatus(),

                dropNode = drop.get( 'node' ),
                dropSlotNode = dropNode.ancestor( '.Gadget-slot' ),
                dropSlotElement = dropSlotNode.getDOMNode(),
                dropModel = ko.dataFor( dropSlotElement ),
                dropItemGridStatus = gridStatus.map[peek( dropModel._id )],
                dropItemGridStatusIndex = gridStatus.list.indexOf( dropItemGridStatus ),
                isDropTarget = Boolean( dropModel.isDrop ),
                configs = [].concat( gridStatus.list ),
                statusConfig = {
                    cols: gadgetConfig.config[DASHBOARD_DEFAULTS.GADGET_COL_PROP],
                    rows: gadgetConfig.config[DASHBOARD_DEFAULTS.GADGET_ROW_PROP]
                },
                predictedGridStatus;

            /** check allowed grid status change **/
            if( isDropTarget ) {
                dropItemGridStatusIndex = gridStatus.list.length;
            }

            configs.splice( dropItemGridStatusIndex, 0, statusConfig );

            predictedGridStatus = host.predictGridStatus( configs );
            allowDragOnDrop = host.isAllowedGridStatusPrediction( predictedGridStatus );

            return allowDragOnDrop;
        }
    }, {
        NAME: 'PatientHeaderDashboardGadgetSelector'
    } );

    KoViewModel.registerConstructor( PatientHeaderDashboardGadgetSelector );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'GadgetConstants',
        'DashboardBaseGadgetSelector'
    ]
} );
