/*global YUI, ko */

YUI.add( 'dclanguagechangemodal', function( Y ) {
        'use strict';

        var i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            CANCEL = i18n( 'general.button.CANCEL' ),
            CONFIRM = i18n( 'general.button.CONFIRM' );

        /**
         * default error notifier
         * @param {Object} response - error from jsrpc
         */
        function fail( response ) {
            var
                errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

            if( errors.length ) {
                Y.Array.invoke( errors, 'display' );
            }
        }

        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'language_modal',
                'InSuiteAdminMojit',
                data,
                node,
                callback
            );
        }

        function LanguageViewModel() {
            LanguageViewModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( LanguageViewModel, KoViewModel.getDisposable(), {
            initializer: function() {
                this.languageTextI18n = i18n( 'InSuiteAdminMojit.language_modal.TEXT' );

                this.wasSelected = undefined;
                this.currentlySelected = ko.observable();

                Y.doccirrus.jsonrpc.api.admin.getLanguage( {} ).done( function( result ) {
                    if( result && result.data ) {
                        this.wasSelected = result.data;
                        this.currentlySelected( this.wasSelected );
                    }
                }.bind( this ) ).fail( fail );
            }
        } );

        function show( data ) {

            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, data, function() {
                var modal,
                    languageVM = new LanguageViewModel();

                modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-LanguageChane',
                    bodyContent: node,
                    title:  i18n( 'InSuiteAdminMojit.language_modal.TITLE' ),
                    maximizable: true,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                    minHeight: 200,
                    minWidth: Y.doccirrus.DCWindow.SIZE_MEDIM,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                label: CANCEL
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                label: CONFIRM,
                                action: function() {
                                    this.close();
                                    var newSelected = languageVM.currentlySelected();
                                    if( languageVM.wasSelected !== newSelected ){
                                        Y.doccirrus.jsonrpc.api.admin.setLanguage( { set: newSelected } ).done( function() {
                                            setTimeout( function() {
                                                window.location.reload( true );
                                            }, 100 );
                                        } ).fail( fail );
                                    }
                                }
                            } )
                        ]
                    },
                    after: {
                        visibleChange: function() {
                            languageVM.dispose();
                        }
                    }
                } );

                languageVM.addDisposable( ko.computed( function() {
                    var
                        okBtn = modal.getButton( 'OK' ).button,
                        newSelected = languageVM.currentlySelected();
                    if( languageVM.wasSelected !== newSelected ){
                        okBtn.enable();
                    } else {
                        okBtn.disable();
                    }
                } ) );


                ko.applyBindings( languageVM, node.getDOMNode() );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).languageChange = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);
