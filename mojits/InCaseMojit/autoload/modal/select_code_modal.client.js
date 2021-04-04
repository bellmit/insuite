/*global YUI, ko*/

'use strict';

YUI.add( 'selectcodemodal', function( Y /*, NAME*/ ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        unwrap = ko.unwrap,
        i18n = Y.doccirrus.i18n;

        /**
         * SelectCodeViewModel
         * @param config
         * @constructor
         */
        function SelectCodeViewModel( config ) {
            SelectCodeViewModel.superclass.constructor.call( this, config );
        }

        SelectCodeViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( SelectCodeViewModel, KoViewModel.getBase(), {
                initializer: function SelectCodeViewModel_initializer() {
                    var
                        self = this;
                    self.noDataI18n = i18n( 'PatientHeaderDashboard.PatientGadgetConfigurableTableBase.noData' );
                    self.showCodes = ko.observable( true );
                    self.selectedCode = ko.observable( null );
                    self.codes = ko.observableArray( self.initialConfig.codes );

                    self.addDisposable(ko.computed(function() {
                        var rooms = unwrap( self.codes );
                        if( rooms && rooms.length ) {
                            self.showCodes( true );
                        } else {
                            self.showCodes( false );
                        }
                    }));
                },
                destructor: function SelectCodeViewModel_destructor() {
                }
            },
            {
                NAME: 'SelectCodeViewModel'
            }
        );

        KoViewModel.registerConstructor( SelectCodeViewModel );


        function getTemplate( node, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'select_code_modal',
                'InCaseMojit',
                {},
                node,
                callback
            );
        }

        function show( codes, callback ) {
            var
                node = Y.Node.create( '<div></div>' );

            getTemplate( node, function() {
                var data = {
                        codes: codes
                    },
                    model = new SelectCodeViewModel( data ),
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
                                    var selected = unwrap( model.selectedCode );
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
                        isValid =  unwrap( model.selectedCode );
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

        Y.namespace( 'doccirrus.modals' ).selectCode = {
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
