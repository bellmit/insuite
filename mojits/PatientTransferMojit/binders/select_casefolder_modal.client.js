/*global YUI, ko*/

'use strict';

YUI.add( 'selectcasefoldermodal', function( Y /*, NAME*/ ) {
    var
        KoViewModel = Y.doccirrus.KoViewModel,
        caseFolderCollection = KoViewModel.getConstructor( 'CaseFolderCollection' ),
        additionalTypes = Y.doccirrus.schemas.casefolder.additionalTypes,
        unwrap = ko.unwrap,
        i18n = Y.doccirrus.i18n;

        /**
         * SelectCasefolderViewModel
         * @param config
         * @constructor
         */
        function SelectCasefolderViewModel( config ) {
            SelectCasefolderViewModel.superclass.constructor.call( this, config );
        }

        SelectCasefolderViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( SelectCasefolderViewModel, KoViewModel.getBase(), {
                initializer: function SelectCasefolderViewModel_initializer() {
                    var self = this;
                    self.patientId = self.initialConfig.patientId;
                    self.caseFolderType = self.initialConfig.caseFolderType;
                    self.selectFolderI18n = i18n('InCaseMojit.change_activity_modal_clientJS.text.SELECT');
                    self.noDataI18n = i18n( 'PatientHeaderDashboard.PatientGadgetConfigurableTableBase.noData' );
                    self.showCaseFolders = ko.observable( true );
                    self.selectedCaseFolder = ko.observable( null );
                    self.caseFoldersCollection = new caseFolderCollection();
                    self.caseFolders = ko.observableArray( [] );
                    self.initCaseFolders();

                    self.addDisposable(ko.computed(function() {
                        var caseFolders = unwrap( self.caseFolders );
                        if( caseFolders && caseFolders.length ) {
                            self.showCaseFolders( true );
                        } else {
                            self.showCaseFolders( false );
                        }
                    }));
                },
                destructor: function SelectCasefolderViewModel_destructor() {
                },
                initCaseFolders: function SelectCasefolderViewModel_initCaseFolders() {
                    var self = this;
                    self.caseFoldersCollection.load( {patientId: self.patientId} )
                        .then( function( folders ) {
                            self.caseFolders( folders.filter( function( folder ) {
                                return (!folder.imported && additionalTypes.QUOTATION !== folder.additionalType && additionalTypes.ERROR !== folder.additionalType && folder.type && ( self.caseFolderType ? folder.type === self.caseFolderType: true ));
                            } ) );
                        } );
                }
            },
            {
                NAME: 'SelectCasefolderViewModel'
            }
        );

        KoViewModel.registerConstructor( SelectCasefolderViewModel );


        function getTemplate( node, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'select_casefolder_modal',
                'PatientTransferMojit',
                {},
                node,
                callback
            );
        }

        function show( patientId, caseFolderType, callback ) {
            var
                node = Y.Node.create( '<div></div>' );

            getTemplate( node, function() {
                var data = {
                        patientId: patientId,
                        caseFolderType: caseFolderType
                    },
                    model = new SelectCasefolderViewModel( data ),
                    modal; //eslint-disable-line
                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-SelectCaseFolder',
                    bodyContent: node,
                    title: i18n( 'general.placeholder.CHOOSE_OPTION' ),
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
                                    var selected = unwrap( model.selectedCaseFolder );
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
                        isValid =  unwrap( model.selectedCaseFolder );
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

        Y.namespace( 'doccirrus.modals' ).selectCaseFolder = {
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
