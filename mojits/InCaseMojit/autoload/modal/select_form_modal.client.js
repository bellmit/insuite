/*global YUI, ko*/

'use strict';

YUI.add( 'selectformmodal', function( Y, NAME ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        unwrap = ko.unwrap,
        i18n = Y.doccirrus.i18n,

        FormsTreeModel = KoViewModel.getConstructor( 'FormsTreeViewModel' );

        /**
         * SelectFormViewModel
         * @param config
         * @constructor
         */
        function SelectFormViewModel( config ) {
            SelectFormViewModel.superclass.constructor.apply( this, config );
        }

        SelectFormViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( SelectFormViewModel, KoViewModel.getBase(), {
                initializer: function SelectFormViewModel_initializer() {
                    var self = this;

                    self.formSearchPlaceholder = i18n('FormEditorMojit.forms_tree.SEARCH_PLACEHOLDER');

                    self.formsTreeUser = new FormsTreeModel({
                        showLockedForms: false,
                        showEmptyFolders: false,
                        isEditable: true,
                        onSelect: function( formListing ) { self.onFormTreeSelection( formListing ); }
                    });

                    self.formsTreeDefault = new FormsTreeModel({
                        showLockedForms: true,
                        showEmptyFolders: false,
                        onSelect: function( formListing ) { self.onFormTreeSelection( formListing ); }
                    });

                    self.formSearchText = ko.observable( '' );

                    self.formSearchListener = self.formSearchText.subscribe( function( query ) {
                        self.formsTreeUser.setTextFilter( query );
                        self.formsTreeDefault.setTextFilter( query );
                    } );

                    self.formSelected = ko.observable( null );
                },
                destructor: function SelectFormViewModel_destructor() {
                },

                //  EVENT HANDLERS

                onFormTreeSelection: function __onFormTreeSelection( formListing ) {
                    var self = this;
                    Y.log( 'Form selected: ' + JSON.stringify( formListing ), 'debug', NAME );
                    self.formSelected( formListing );
                }
            },
            {
                NAME: 'SelectFormViewModel'
            }
        );

        KoViewModel.registerConstructor( SelectFormViewModel );


        function getTemplate( node, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'select_form_modal',
                'InCaseMojit',
                {},
                node,
                callback
            );
        }

        function show( data ) {
            var
                node = Y.Node.create( '<div></div>' );

            getTemplate( node, function() {
                var model = new SelectFormViewModel(),
                    modal; //eslint-disable-line
                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-SelectForm',
                    bodyContent: node,
                    title: i18n( 'general.placeholder.CHOOSE_OPTION' ),
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    minHeight: Y.doccirrus.DCWindow.SIZE_SMALL,
                    minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                    resizeable: false,
                    centered: true,
                    focusOn: [],
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
                                    var selected = unwrap( model.formSelected );
                                    modal.close();
                                    if( selected ) {
                                        data.callback( { data: selected } );
                                    }
                                }
                            }
                        ]

                    }
                } );
                ko.applyBindings( model, node.getDOMNode() );
            } );
        }

        Y.namespace( 'doccirrus.modals' ).selectForm = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'DCWindow'
        ]
    }
);
