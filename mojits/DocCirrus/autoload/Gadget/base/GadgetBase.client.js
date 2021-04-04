/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'GadgetBase', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module GadgetBase
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,

        GADGET = Y.doccirrus.gadget,
        GADGET_UTILS = GADGET.utils,
        requireYuiModule = GADGET_UTILS.requireYuiModule;

    /**
     * @constructor
     * @class GadgetBase
     */
    function GadgetBase() {
        GadgetBase.superclass.constructor.apply( this, arguments );
    }

    Y.extend( GadgetBase, KoViewModel.getDisposable(), {
        /** @private */
        initializer: function() {
            var
                self = this;

            self._initMaximize();
        },
        /** @private */
        destructor: function() {
        },
        /** @protected */
        dispose: function() {
            var
                self = this;

            if( !self._destroyOnDispose ) {
                self._destroyOnDispose = true;
                self.destroy();
            }
            else {
                delete self._destroyOnDispose;
                GadgetBase.superclass.dispose.apply( this, arguments );
            }
        },
        /**
         * Default string to show when there is no data available
         * @property noDataToShowText
         * @default 'GadgetBase.noDataToShowText'
         */
        noDataToShowText: i18n( 'GadgetBase.noDataToShowText' ),
        /**
         * Default string to show when loading data
         * @property loadingDataText
         * @default 'GadgetBase.loadingDataText'
         */
        loadingDataText: i18n( 'GadgetBase.loadingDataText' ),
        /**
         * Click handler to remove this gadget from dashboard
         * @protected
         */
        handlerRemoveFromGadgetCollection: function() {
            var
                self = this,
                gadgetModel = self.get( 'gadgetModel' ),
                dashboard = self.get( 'dashboard' );

            dashboard.removeGadget( peek( gadgetModel._id ) );

        },
        /**
         * If this Gadget is displayed maximized
         * @property maximizeIcon
         * @type {null|ko.computed}
         */
        maximized: null,
        /**
         * Computed icon class from maximized
         * @property maximizeIcon
         * @type {null|ko.computed}
         */
        maximizeIcon: null,
        /** @private */
        _initMaximize: function() {
            var
                self = this,
                gadgetModel = self.get( 'gadgetModel' ),
                dashboard = self.get( 'dashboard' );

            self.maximized = ko.computed( function() {
                var
                    activeDashboardMaximized = unwrap( dashboard.activeDashboardMaximized );

                return activeDashboardMaximized === peek( gadgetModel._id );
            } );

            self.maximizeIcon = ko.computed( function() {
                return unwrap( self.maximized ) ? 'fa-search-minus' : 'fa-search-plus';
            } );
        },
        /**
         * Click handler to maximize this gadget in dashboard
         * @protected
         */
        handlerMaximize: function() {
            var
                self = this,
                gadgetModel = self.get( 'gadgetModel' ),
                dashboard = self.get( 'dashboard' ),
                currentMaximized = peek( self.maximized );

            if( currentMaximized ) {
                dashboard.unsetGadgetMaximized();
            }
            else {
                dashboard.setGadgetMaximized( peek( gadgetModel._id ) );
            }
        },
        /**
         * If this Gadget is editable
         * @property editable
         * @type {Boolean}
         * @default false
         */
        editable: false,
        /**
         * Shows dialog to edit this gadget
         * @returns {Y.EventTarget}
         */
        showEditGadget: function() {
            var
                self = this,
                eventTarget = new Y.EventTarget();

            eventTarget.publish( 'cancel', {preventable: false} );
            eventTarget.publish( 'save', {preventable: false} );

            Promise
                .props( {
                    dcWindow: requireYuiModule( ['DCWindow'] ),
                    bindings: self.get( 'editBindings' ),
                    template: self.get( 'editTemplate' )
                } )
                .then( function( props ) {
                    var
                        bindings = props.bindings,
                        template = props.template,
                        editOnBind = self.get( 'editOnBind' ),
                        editUnBind = self.get( 'editUnBind' ),
                        bodyContent = Y.Node.create( template ),
                        title = self && self.label === i18n( 'PatientGadget.PatientGadgetLatestVaccinationStatus.i18n' ) ?
                            self.label :
                            i18n( 'GadgetBase.editGadgetTitle' ),
                        dialog = new Y.doccirrus.DCWindow(
                            Y.merge(
                                self.get( 'defaultEditDialogConfig' ),
                                {
                                    bodyContent: bodyContent,
                                    title: title,
                                    buttons: {
                                        header: ['close', 'maximize'],
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                            Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                                isDefault: true,
                                                action: function( e ) {
                                                    dialog.close( e );
                                                    var data, model;

                                                    if( bindings ) {
                                                        if( Y.Lang.isFunction( bindings.toJSON ) ) {
                                                            data = bindings.toJSON();
                                                        }
                                                        else {
                                                            data = ko.toJS( bindings );
                                                        }
                                                    }

                                                    if( data ) {
                                                        model = self.get( 'gadgetModel' );

                                                        model.config( Y.merge( peek( model.config ), data ) );
                                                    }

                                                    eventTarget.fire( 'save', {}, {} );
                                                    eventTarget.detachAll();
                                                }
                                            } )
                                        ]
                                    },
                                    after: {
                                        visibleChange: function( yEvent ) {
                                            // also captures cancel for e.g.: ESC
                                            if( !yEvent.newVal ) {
                                                setTimeout( function() { // delay for letting others fire first

                                                    if( Y.Lang.isFunction( editUnBind ) ) {
                                                        editUnBind( {
                                                            bindings: bindings,
                                                            bodyContent: bodyContent,
                                                            dialog: dialog
                                                        } );
                                                    }

                                                    eventTarget.fire( 'cancel' );
                                                    eventTarget.detachAll();

                                                    if( bindings ) {
                                                        if( Y.Lang.isFunction( bindings.destroy ) ) {
                                                            bindings.destroy();
                                                        }
                                                        else if( Y.Lang.isFunction( bindings.dispose ) ) {
                                                            bindings.dispose();
                                                        }
                                                    }
                                                    ko.cleanNode( bodyContent.getDOMNode() );

                                                }, 10 );
                                            }
                                        }
                                    }
                                }
                            )
                        );
                        dialog.set( 'focusOn', [] );

                    ko.applyBindings( bindings, bodyContent.getDOMNode() );

                    if( Y.Lang.isFunction( editOnBind ) ) {
                        editOnBind( {
                            bindings: bindings,
                            bodyContent: bodyContent,
                            dialog: dialog
                        } );
                    }
                } );

            return eventTarget;
        },
        /**
         * Click handler to edit this gadget
         * @protected
         */
        handlerEditGadget: function() {
            var
                self = this;

            self.showEditGadget();
        }
    }, {
        NAME: 'GadgetBase',
        ATTRS: {
            /**
             * The "$context" provided by knockout
             *
             * @protected
             * @attribute $context
             * @type null|Object
             */
            $context: {value: null},
            /**
             * The "$data" provided by knockout
             *
             * @protected
             * @attribute $data
             * @type null|Object
             */
            $data: {
                readOnly: true,
                getter: function() {

                    return this.get( '$context.$data' ) || null;
                }
            },
            /**
             * The "$component" provided by knockout
             *
             * @protected
             * @attribute $component
             * @type null|Object
             */
            $component: {
                readOnly: true,
                getter: function() {

                    return this.get( '$context.$component' ) || null;
                }
            },
            /**
             * Property "params" of component binding config
             *
             * @protected
             * @attribute componentParams
             * @type Object
             */
            componentParams: {
                readOnly: true,
                getter: function() {

                    return this.get( '$data' );
                }
            },
            /**
             * Dashboard of gadgets
             * @attribute dashboard
             * @type DashboardBase
             */
            dashboard: {
                readOnly: true,
                getter: function() {

                    return this.get( '$component' );
                }
            },
            /**
             * Model associated with this gadget
             * @attribute gadgetModel
             * @type KoViewModel
             */
            gadgetModel: {
                readOnly: true,
                valueFn: function() {

                    return this.get( 'componentParams' );
                }
            },
            /**
             * Defaults of edit dialog config
             * @attribute defaultEditDialogConfig
             * @type Object
             */
            defaultEditDialogConfig: {
                getter: function() {
                    return {
                        className: 'DCWindow-GadgetEdit',
                        title: i18n( 'GadgetBase.editGadgetTitle' ),
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        height: 400,
                        minHeight: 400,
                        minWidth: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        centered: true,
                        modal: true,
                        render: document.body
                    };
                }
            },
            /**
             * Some sort of markup string
             * - can be a promise to fulfill with a string (returned by valueFn)
             * @attribute editTemplate
             * @type String|Promise
             */
            editTemplate: {
                value: '<div></div>'
            },
            /**
             * Some sort of model
             * - can be a promise to fulfill with a model (returned by valueFn)
             * - specify "toJSON" to not let ko.toJS be used
             * - specify "destroy" to let your model be destroyed (dispose is being ignored when destroy is available)
             * - specify "dispose" to let your model be disposed
             * @attribute editBindings
             * @type Object|Promise|*
             */
            editBindings: {
                value: null
            },
            /**
             * A function to call when the dialog was created
             * @attribute editOnBind
             * @type null|function
             * @param {Object} data
             * @param {*} data.bindings
             * @param {Y.Node} data.bodyContent
             * @param {DCWindow} data.dialog
             */
            editOnBind: {
                value: null
            },
            /**
             * A function to call when the dialog is about to destroy
             * @attribute editUnBind
             * @type null|function
             * @param {Object} data
             * @param {*} data.bindings
             * @param {Y.Node} data.bodyContent
             * @param {DCWindow} data.dialog
             */
            editUnBind: {
                value: null
            }
        }
    } );

    KoViewModel.registerConstructor( GadgetBase );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'GadgetUtils'
    ]
} );
