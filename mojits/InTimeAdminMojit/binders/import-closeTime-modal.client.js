/*global YUI, ko, moment*/

'use strict';

YUI.add( 'DcImportCloseTimeModal', function( Y ) {

        var
            i18n = Y.doccirrus.i18n,
            TITLE = i18n( 'InTimeAdminMojit.import-closeTime-modal.title.MODAL_TITLE' ),
            IMPORT = i18n( 'InTimeAdminMojit.import-closeTime-modal.buttons.IMPORT' ),
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            Disposable = Y.doccirrus.KoViewModel.getDisposable();

        function ImportCloseTimeModel() {
            ImportCloseTimeModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( ImportCloseTimeModel, Disposable, {
            initializer: function CreateReceiptModel_initializer() {
                var self = this;

                self.year = ko.observable();

                self.federalStates = ko.observable( Y.doccirrus.schemas.location.types.FederalState_E.list );
                self.federalState = ko.observable();

                self.yearDatepickerOptions = {
                    format: 'YYYY',
                    widgetPositioning: {
                        horizontal: 'right',
                        vertical: 'bottom'
                    }
                };

                self.federalStateTextI18n = i18n( 'InTimeAdminMojit.import-closeTime-modal.title.FEDERAL_STATE' );
                self.yearTitleI18n = i18n( 'InTimeAdminMojit.import-closeTime-modal.title.YEAR' );

                self.select2federalState = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var state = ko.unwrap( self.federalState );
                            return state;
                        },
                        write: function( $event ) {
                            self.federalState( $event.val );
                        }
                    }, self ) ),
                    select2: {
                        allowClear: true,
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        data: function() {
                            return {
                                results: self.federalStates().map( function( state ) {
                                    return {
                                        id: state.val,
                                        text: state.i18n
                                    };
                                } )
                            };
                        }
                    }
                };
                self._isValid = ko.computed( function() {
                    return self.year() && self.federalState();
                } );
                self.importData = function _createReceipt( _cb ) {

                    Y.doccirrus.jsonrpc.api.calendar.importCloseTime( {
                        data: {
                            year: moment( self.year() ).format( 'YYYY' ),
                            federalState: self.federalState()
                        }
                    } ).done( function() {
                        _cb();
                    } );
                };
            }
        } );

        function ImportCloseTimeModal() {
        }

        ImportCloseTimeModal.prototype.show = function() {
            return Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'InTimeAdminMojit/views/import-closeTime-modal'} )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    return new Promise( function( resolve ) {
                        var
                            bodyContent = Y.Node.create( template ),
                            modal,
                            saveBtn,
                            importCloseTimeModel;
                        importCloseTimeModel = new ImportCloseTimeModel();

                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-ImportCloseTime',
                            bodyContent: bodyContent,
                            title: TITLE,
                            maximizable: false,
                            icon: Y.doccirrus.DCWindow.ICON_INFO,
                            width: Y.doccirrus.DCWindow.SIZE_SMALL,
                            height: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            minHeight: 200,
                            minWidth: Y.doccirrus.DCWindow.SIZE_SMALL,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        label: IMPORT,
                                        action: function() {
                                            saveBtn.disable();
                                            importCloseTimeModel.importData( onComplete );
                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {
                                    if( importCloseTimeModel && importCloseTimeModel._dispose ) {
                                        importCloseTimeModel._dispose();
                                    }
                                    resolve();
                                }
                            }
                        } );

                        saveBtn = modal.getButton( 'SAVE' ).button;

                        function onComplete() {
                            modal.close();
                            importCloseTimeModel.dispose();
                        }

                        ko.computed( function() {
                            var
                                buttonSave = modal.getButton( 'SAVE' ).button,
                                _isValid = importCloseTimeModel._isValid(),
                                enable = false;

                            if( _isValid ) {
                                enable = true;
                            }

                            if( enable ) {
                                buttonSave.enable();
                            } else {
                                buttonSave.disable();
                            }
                        } );
                        ko.applyBindings( importCloseTimeModel, bodyContent.getDOMNode() );
                    } );
                } ).catch( catchUnhandled );
        };

        Y.namespace( 'doccirrus.modals' ).importCloseTimeModal = new ImportCloseTimeModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'KoViewModel'
        ]
    }
);