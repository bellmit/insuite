/**
 * User: do
 * Date: 17.10.18  11:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */

'use strict';

YUI.add( 'insuranceGroupModal', function( Y, NAME ) {
        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            InsuranceGroupBrowser = KoViewModel.getConstructor( 'InsuranceGroupBrowser' ),
            TITLE = i18n( 'IncaseAdminMojit.insuranceGroupModalJS.TITLE' );

        function showError( response ) {
            var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                window: {width: 'small'},
                message: errors.join( '<br>' )
            } );
        }

        function show( data ) {
            var
                aDCWindowResizeEvent,
                modal,
                model = new InsuranceGroupBrowser( data ),
                node = Y.Node.create( '<div></div>' );

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'insuranceGroup_modal',
                'IncaseAdminMojit',
                {},
                node,
                function() {
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-insuranceGroupModal',
                        bodyContent: node,
                        title: TITLE,
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        maximizable: true,
                        maximized: true,
                        resizeable: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CLOSE', {
                                    isDefault: true,
                                    action: function() {
                                        modal.close();
                                    }
                                } )
                            ]
                        },
                        after: {
                            render: function() {
                                var
                                    modalBody = this,
                                    minHeight = modalBody.get( 'minHeight' ),

                                    modalBodyResizeHandler = function() {

                                        var
                                            winHeight = Y.one( window ).get( 'winHeight' );
                                        if( !modalBody.resizeMaximized.get( 'maximized' ) ) {
                                            if( winHeight > minHeight ) {
                                                modalBody.set( 'height', window.innerHeight );
                                                modalBody.set( 'width', window.innerWidth );
                                            } else {
                                                modalBody.set( 'width', window.innerWidth );
                                                modalBody.set( 'height', window.innerHeight );
                                            }
                                            modalBody.set( 'centered', true );
                                        }
                                    };
                                aDCWindowResizeEvent = Y.one( window ).on( 'resize', modalBodyResizeHandler );
                                modalBodyResizeHandler();
                            },
                            destroy: function() {
                                if( aDCWindowResizeEvent ) {
                                    aDCWindowResizeEvent.detach();
                                }
                                if( model && model._dispose ) {
                                    model._dispose();
                                }
                                ko.cleanNode( node.getDOMNode() );
                            }
                        }
                    } );
                    modal.set( 'focusOn', [] );

                    ko.applyBindings( model, node.getDOMNode().querySelector( '#insuranceGroupModal' ) );
                }
            );

        }

        function setup() {
            Promise.resolve( Y.doccirrus.jsonrpc.api.insurancegroup.read() ).then().then( function( response ) {
                show( {
                    data: (response.data || []).map( function( data ) {
                        return {data: data};
                    } )
                } );
            } ).catch( function( response ) {
                Y.log( 'could not get insurance groups: ' + response, 'error', NAME );
                showError( response );
            } );

        }

        Y.namespace( 'doccirrus.modals' ).insuranceGroupModal = {show: setup};

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'InsuranceGroupBrowser'

        ]
    }
);
