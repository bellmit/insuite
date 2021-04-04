/*global YUI, ko*/

'use strict';

YUI.add( 'selectroommodal', function( Y /*, NAME*/ ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        unwrap = ko.unwrap,
        i18n = Y.doccirrus.i18n;

        /**
         * SelectRoomViewModel
         * @param config
         * @constructor
         */
        function SelectRoomViewModel( config ) {
            SelectRoomViewModel.superclass.constructor.call( this, config );
        }

        SelectRoomViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( SelectRoomViewModel, KoViewModel.getBase(), {
                initializer: function SelectRoomViewModel_initializer() {
                    var self = this;
                    self.showWaitingRooms = self.initialConfig.showWaitingRooms;
                    self.showGeneralList = self.initialConfig.showGeneralList;
                    self.notShowId = self.initialConfig.notShowId;
                    self.noDataI18n = i18n( 'PatientHeaderDashboard.PatientGadgetConfigurableTableBase.noData' );
                    self.showRooms = ko.observable( true );
                    self.selectedRoom = ko.observable( null );
                    self.rooms = ko.observableArray( [] );
                    self.initLoadRooms();

                    self.addDisposable(ko.computed(function() {
                        var rooms = unwrap( self.rooms );
                        if( rooms && rooms.length ) {
                            self.showRooms( true );
                        } else {
                            self.showRooms( false );
                        }
                    }));
                },
                destructor: function SelectRoomViewModel_destructor() {
                },
                initLoadRooms: function SelectRoomViewModel_initCaseFolders() {
                    var self = this;
                    Y.doccirrus.jsonrpc.api.room.getRoomsWithCountedSchedules( {
                        'query': {
                            roomType: self.showWaitingRooms ? 'waiting' : 'treatment'
                        },
                        'options': {}
                    } ).then( function( res ) {
                        var
                            data = ( res && res.data ) || [];
                        if( self.notShowId ) {
                            data = data.filter( function( item ) {
                                return item._id !== self.notShowId;
                            });
                        }
                        if( self.showGeneralList ) {
                            data.unshift( { _id: 'wl', name: i18n( 'CalendarMojit.tab_graphic-waiting-list.label.WAITINGLIST' ) } );
                        }
                        data.forEach( function( item ) {
                            item.name = i18n( item.name );
                        });
                        self.rooms( data );
                    } );
                }
            },
            {
                NAME: 'SelectRoomViewModel'
            }
        );

        KoViewModel.registerConstructor( SelectRoomViewModel );


        function getTemplate( node, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'select_room_modal',
                'CalendarMojit',
                {},
                node,
                callback
            );
        }

        function show( showWaitingRooms, showGeneralList, notShowId, callback ) {
            var
                node = Y.Node.create( '<div></div>' );

            getTemplate( node, function() {
                var data = {
                        showWaitingRooms: showWaitingRooms,
                        showGeneralList: showGeneralList,
                        notShowId: notShowId
                    },
                    model = new SelectRoomViewModel( data ),
                    modal; //eslint-disable-line
                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-SelectRoom',
                    bodyContent: node,
                    title: i18n( 'CalendarMojit.selector_text.SELECT_TITLE' ),
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
                                label: i18n( 'general.button.SAVE' ),
                                name: 'APPLY',
                                value: 'APPLY',
                                isDefault: true,
                                action: function() {
                                    var selected = unwrap( model.selectedRoom );
                                    modal.close();
                                    if( selected ) {
                                        callback( { data: selected } );
                                    }
                                }
                            }
                        ]

                    }
                } );

                model.addDisposable( ko.computed( function() {
                    var
                        SAVE = modal.getButton( 'APPLY' ).button,
                        isValid =  unwrap( model.selectedRoom );
                    if( modal && SAVE ) {
                        if ( isValid ) {
                            SAVE.enable();
                        } else {
                            SAVE.disable();
                        }
                    }
                } ) );

                ko.applyBindings( model, node.getDOMNode() );
            } );
        }

        Y.namespace( 'doccirrus.modals' ).selectRoom = {
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
            'CaseFolderCollection'
        ]
    }
);
