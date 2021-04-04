/*global YUI, ko, async, $*/

'use strict';

YUI.add( 'addnewroommodal', function( Y, NAME ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap;

        /**
         * AddNewRoomViewModel
         * @param config
         * @constructor
         */
        function AddNewRoomViewModel( config ) {
            AddNewRoomViewModel.superclass.constructor.call( this, config );
        }

        AddNewRoomViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( AddNewRoomViewModel, KoViewModel.getBase(), {
            initializer: function AddNewRoomViewModel_initializer( config ) {
                var self = this;

                if( config.name ) {
                    self.name( i18n( config.name ) );
                }

                if( config.color ) {
                    self.color( config.color );
                }
                if( config.numberOfPatients ) {
                    self.numberOfPatients( config.numberOfPatients );
                }
                if( config.roomType ) {
                    self.roomType( config.roomType );
                }
                self.waitingRoomNameI18n = i18n( 'CalendarMojit.room_modal.waiting_room_name' );
                self.waitingRoomI18n = i18n( 'CalendarMojit.room_modal.waiting_room' );
                self.treatmentRoomNameI18n = i18n( 'CalendarMojit.room_modal.treatment_room_name' );
                self.treatmentRoomI18n = i18n( 'CalendarMojit.room_modal.treatment_room' );
                self.addNewRoomI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.ADDNEWROOM' );
                self.editRoomI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.EDIT_ROOM' );
                self.colorI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.COLOR' );
                self.numberOfPatientsI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.NUMBEROFPATIENTS' );
                self.roomTypeI18n = i18n( 'CalendarMojit.tab_graphic-waiting-list.label.ROOMTYPE' );
            },
            destructor: function AddNewRoomViewModel_destructor() {
            },
            attachAllMiniColors: function() {
            var
                MarkerPrioritiesNodeBinder = $( '#addNewRoom' ),
                elementsToAttach = $( '.input-color:not(.minicolors-input)', MarkerPrioritiesNodeBinder );

            if( !elementsToAttach.length ) {
                Y.log( 'No elements to attach color pickers to.', 'warn', NAME );
                return false;
            }

            async.eachSeries( elementsToAttach, attachColorPicker, onInitComplete );

            function attachColorPicker( toElem, itcb ) {
                if ( toElem && toElem.attachedColorPicker ) {
                    Y.log( 'Color picker handler already initialized, not repeating.', 'warn', NAME );
                    return itcb( null );
                }

                $( toElem ).minicolors(
                    'create',
                    {
                        theme: 'bootstrap',
                        opacity: true,
                        format: 'hex',
                        change: function( value ) {
                            var $data = ko.dataFor( toElem );
                            $data.color( value );
                        }
                    }
                );

                toElem.attachedColorPicker = true;
                itcb( null );
            }

            function onInitComplete( err) {
                if ( err ) {
                    Y.log( 'Problem creating color pickers: ' + JSON.stringify( err ), 'warn', NAME );
                }
            }

        }
        },
        {
            schemaName: 'room',
            NAME: 'AddNewRoomViewModel'
        });

        KoViewModel.registerConstructor( AddNewRoomViewModel );


        function getTemplate( node, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'add_new_room_modal',
                'CalendarMojit',
                {},
                node,
                callback
            );
        }

        function show( data, callback ) {
            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, function() {
                var model = new AddNewRoomViewModel( data ),
                    modal = new Y.doccirrus.DCWindow( { //eslint-disable-line
                    className: 'DCWindow-AddNewRoom',
                    bodyContent: node,
                    title: data && data.name ? model.editRoomI18n : model.addNewRoomI18n,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    resizeable: true,
                    dragable: true,
                    maximizable: true,
                    centered: true,
                    visible: true,
                    focusOn: [],
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function() {
                                    var
                                        self = this,
                                        numberOfPatients = unwrap( model.numberOfPatients ),
                                        resultData = {
                                            name: unwrap( model.name ),
                                            color: unwrap( model.color ),
                                            roomType: unwrap( model.roomType )
                                        };
                                    if( !data.isDeletable && resultData.name === model.waitingRoomNameI18n ) {
                                        resultData.name = 'CalendarMojit.room_modal.waiting_room_name';
                                    }
                                    if( !data.isDeletable && resultData.name === model.treatmentRoomNameI18n ) {
                                        resultData.name = 'CalendarMojit.room_modal.treatment_room_name';
                                    }
                                    if( !numberOfPatients ) {
                                        resultData.$unset = {
                                            numberOfPatients: ''
                                        };
                                    } else {
                                        resultData.numberOfPatients = numberOfPatients;
                                    }
                                    if( data._id ) {
                                        Y.doccirrus.jsonrpc.api.room.update( {
                                            query: { _id: data._id },
                                            fields: ['name', 'color', 'numberOfPatients', 'roomType'],
                                            data: resultData
                                        } )
                                            .then( function() {
                                                callback();
                                            });
                                    } else {
                                        Y.doccirrus.jsonrpc.api.room.create( {
                                            data: resultData
                                        } )
                                            .then( function() {
                                                callback();
                                            });
                                    }
                                    self.close();
                                }
                            } )
                        ]
                    },
                    after: {
                        visibleChange: function( event ) {
                            if( !event.newVal ) {
                                ko.cleanNode( node.getDOMNode() );
                                model.destroy();
                            }
                        }
                    }
                } );
                model.addDisposable( ko.computed( function() {
                    var isValid = unwrap( model.name ),
                        okButton = modal.getButton( 'OK' ).button;
                    if( isValid ) {
                        okButton.enable();
                    } else {
                        okButton.disable();
                    }
                } ) );
                ko.applyBindings( model, node.getDOMNode() );
                model.attachAllMiniColors();

            } );
        }

        Y.namespace( 'doccirrus.modals' ).addNewRoom = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'DCWindow',
            'room-schema'
        ]
    }
);
