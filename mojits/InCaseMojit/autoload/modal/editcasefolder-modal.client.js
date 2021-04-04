/*
 @author: do
 @date: 2015/03/31
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dceditcasefoldermodal', function( Y ) {

        var titles = {
                PUBLIC: 'GKV',
                PRIVATE: 'PKV',
                PUBLIC_A: 'GKV-Z',
                PRIVATE_A: 'PKV-Z',
                PRIVATE_CH: 'KVG',
                PRIVATE_CH_UVG: 'UVG',
                PRIVATE_CH_IVG: 'IVG',
                PRIVATE_CH_MVG: 'MVG',
                PRIVATE_CH_VVG: 'VVG',
                BG: 'BG',
                SELFPAYER: 'SZ'
            },
            i18n = Y.doccirrus.i18n,
            TITLE = i18n( 'InCaseMojit.editCasefolderModal_clientJS.title.EDIT_CASEFOLDER' );

        function CaseFolderModel( data ) {
            var self = this;
            self._modelName = 'CaseFolderModel';
            self.titleI18n = i18n( 'InCaseMojit.editCasefolderModal_clientJS.title.TITLE' );
            self.typeI18n = i18n( 'InCaseMojit.editCasefolderModal_clientJS.title.TYPE' );

            Y.doccirrus.uam.ViewModel.call( self );

            self._schemaName = 'casefolder';
            self._runBoilerplate( data );

            self._validatable( true );

            self._displayType = ko.computed( function() {
                var type = self.type();
                if( !type ) {
                    return '';
                }
                return titles[type] || '';
            } );

            self._error = ko.observable( false );
        }

        function showError( error ) {
            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
        }

        Y.namespace( 'doccirrus.modals' ).editCaseFolderModal = {
            /**
             * @method show
             * @for editCaseFolderModal
             * @param data
             * @returns {Y.EventTarget} 'cancel', 'edit' or 'delete'
             */
            show: function( data ) {
                var
                    eventTarget = new Y.EventTarget(),
                    model = new CaseFolderModel( data ),
                    modal,
                    node = Y.Node.create( '<div></div>' );

                eventTarget.publish( 'cancel', {preventable: false} );
                eventTarget.publish( 'edit', {preventable: false} );
                eventTarget.publish( 'delete', {preventable: false} );

                function saveCaseFolder() {
                    var data = model._serializeToJS(),
                        id;
                    data = JSON.parse( JSON.stringify( data ) );
                    id = data._id;
                    delete data._id;
                    data.fields_ = Object.keys( data );

                    Y.doccirrus.jsonrpc.api.casefolder.update( {
                        query: {
                            _id: id
                        },
                        data: data
                    } ).done( function() {
                        eventTarget.fire( 'edit' );
                    } ).fail( showError ).always( function() {
                        modal.close();
                    } );

                }

                function deleteCaseFolder() {
                    Y.doccirrus.jsonrpc.api.casefolder.delete( {
                        query: {
                            _id: data._id
                        }
                    } ).done( function() {
                        eventTarget.fire( 'delete' );
                    } ).fail( showError ).always( function() {
                        modal.close();
                    } );

                }

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'editcasefolder_modal',
                    'InCaseMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                                className: 'DCWindow-Create-CaseFolder',
                                id: 'DCWindow-editcasefolder',
                                bodyContent: node,
                                title: TITLE,
                                icon: Y.doccirrus.DCWindow.ICON_LIST,
                                centered: true,
                                modal: true,
                                dragable: true,
                                maximizable: true,
                                resizeable: true,
                                render: document.body,
                                buttons: {
                                    header: ['close', 'maximize'],
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                        Y.doccirrus.DCWindow.getButton( 'DELETE', {
                                            action: function() {
                                                deleteCaseFolder();
                                            }
                                        } ),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            action: function() {
                                                saveCaseFolder();
                                            }
                                        } )
                                    ]
                                },
                                after: {
                                    visibleChange: function( yEvent ) {
                                        // also captures cancel for e.g.: ESC
                                        if( !yEvent.newVal ) {
                                            setTimeout( function() { // delay for letting others fire first
                                                eventTarget.fire( 'cancel' );
                                                eventTarget.detachAll();

                                                model._dispose();
                                                ko.cleanNode( node.getDOMNode() );

                                            }, 10 );
                                        }
                                    }
                                }
                            }
                        );

                        ko.applyBindings( model, node.getDOMNode() );
                    }
                );

                return eventTarget;

            }
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);
