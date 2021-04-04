/**
 * User: pi
 * Date: 11/09/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DCSelectFlowModal', function( Y ) {
        var
            i18n = Y.doccirrus.i18n,
            EXPORT_BTN = i18n( 'InCaseMojit.selectflow_modal_clientJS.button.EXPORT' ),
            MODAL_TITLE = i18n( 'InCaseMojit.selectflow_modal_clientJS.title.MODAL' ),
            Disposable = Y.doccirrus.KoViewModel.getDisposable();

        function SelectFlowModel( config ) {
            SelectFlowModel.superclass.constructor.call( this, config );
        }

        Y.extend( SelectFlowModel, Disposable, {
            initializer: function SelectFlowModel_initializer( config ) {
                var
                    self = this;

                self.titleRegionI18n = i18n( 'InCaseMojit.selectflow_modal.title.REGION' );
                self.titleSideI18n = i18n( 'InCaseMojit.selectflow_modal.title.SIDE' );
                self.titleMethodI18n = i18n( 'InCaseMojit.selectflow_modal.title.METHOD' );

                self.initSelectFlow( config );
                self.initSelectMethod( config );
                self.initSelectSide( config );
                self.initSelectRegion( config );

            },
            /**
             * Initializes select2 flow
             * @param {Object} config
             * @method initSelectFlow
             */
            initSelectFlow: function SelectFlowModel_initSelectFlow( config ) {
                var
                    self = this,
                    flows = config.flows;

                //sort flows for ease of use
                flows.sort( function( a, b ) {
                    if( a.title && b.title ) {
                        if( a.title < b.title ) {
                            return -1;
                        } else if( a.title > b.title ) {
                            return 1;
                        }
                        else {
                            return 0;
                        }
                    } else {
                        return 0;
                    }
                } );
                self.flowTypes = Y.doccirrus.schemas.flow.flowTypes;
                self.flowId = ko.observable();
                self.flowType = ko.observable();
                self.select2Flow = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                flowId = ko.unwrap( self.flowId );
                            return flowId;
                        },
                        write: function( $event ) {
                            self.flowId( $event.val );
                            self.flowType( $event.added && $event.added.flowType );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        allowClear: true,
                        data: flows.map( function( flow ) {
                            return {
                                id: flow._id,
                                text: (flow.title || '') + ' (' + Y.doccirrus.schemaloader.getEnumListTranslation( 'flow', 'FlowType_E', flow.flowType, 'i18n', '' ) + ')',
                                flowType: flow.flowType
                            };
                        } )
                    }
                };
            },
            /**
             * Initializes select2 region
             * @method initSelectRegion
             */
            initSelectRegion: function SelectFlowModel_initSelectRegion() {
                var
                    self = this;
                self.availableRegions = [];
                Y.each( Y.doccirrus.schemas.flow.regions, function( value, key ) {
                    self.availableRegions.push( {
                        id: key,
                        text: value
                    } );
                } );
                self.region = ko.observable();
                self.select2Region = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                region = ko.unwrap( self.region );
                            return region;
                        },
                        write: function( $event ) {
                            self.region( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        allowClear: true,
                        data: self.availableRegions
                    }
                };
            },
            /**
             * Initializes select2 side
             * @method initSelectSide
             */
            initSelectSide: function SelectFlowModel_initSelectSide() {
                var
                    self = this;
                self.availableSides = [];
                Y.each( Y.doccirrus.schemas.flow.sides, function( value, key ) {
                    self.availableSides.push( {
                        id: key,
                        text: value
                    } );
                } );
                self.side = ko.observable();
                self.select2Side = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                side = ko.unwrap( self.side );
                            return side;
                        },
                        write: function( $event ) {
                            self.side( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        allowClear: true,
                        data: self.availableSides
                    }
                };
            },
            /**
             * Initializes select2 method
             * @method initSelectMethod
             */
            initSelectMethod: function SelectFlowModel_initSelectMethod() {
                var
                    self = this;
                self.availableMethods = [];
                Y.each( Y.doccirrus.schemas.flow.methods, function( value, key ) {
                    self.availableMethods.push( {
                        id: key,
                        text: value
                    } );
                } );

                self.method = ko.observable();
                self.select2Method = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                method = ko.unwrap( self.method );
                            return method;
                        },
                        write: function( $event ) {
                            self.method( $event.val );
                        }
                    } ) ),
                    select2: {
                        width: '100%',
                        allowClear: true,
                        data: self.availableMethods
                    }
                };
            },
            /**
             * Gets selected flow
             * @returns {String}
             * @method getSelectedFlow
             */
            getSelectedFlow: function SelectFlowModel_getSelectedFlow() {
                var
                    self = this,
                    region = ko.utils.peekObservable( self.region ),
                    side = ko.utils.peekObservable( self.side ),
                    method = ko.utils.peekObservable( self.method ),
                    result = {
                        _id: ko.utils.peekObservable( self.flowId )
                    };

                    if (region || side || method) {
                        result.extraData = {
                            patient: {
                                deviceOrder: region + '-' + side + '-' + method
                            }
                        };
                    }
                return result;
            }
        } );

        function SelectFlowModal() {

        }

        SelectFlowModal.prototype.showDialog = function( flows, callback ) {

            function show() {
                var
                    modal,
                    node = Y.Node.create( '<div></div>' ),
                    selectFlowModel = new SelectFlowModel( {flows: flows} );
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'selectflow_modal',
                    'InCaseMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: MODAL_TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    {
                                        name: 'Export',
                                        label: EXPORT_BTN,
                                        action: function() {
                                            callback( selectFlowModel.getSelectedFlow() );
                                            this.close();
                                        }
                                    }
                                ]
                            }
                        } );
                        selectFlowModel.addDisposable( ko.computed( function() {
                            var
                                flowId = selectFlowModel.flowId(),
                                okBtn = modal.getButton( 'Export' ).button;
                            if( flowId ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }
                        } ) );
                        modal.set( 'focusOn', [] );
                        ko.applyBindings( selectFlowModel, node.getDOMNode().querySelector( '#selectFlowModel' ) );
                    }
                );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).selectFlowModal = new SelectFlowModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'flow-schema',
            'dcschemaloader',
            'KoViewModel',
            'DCWindow'
        ]
    }
);
