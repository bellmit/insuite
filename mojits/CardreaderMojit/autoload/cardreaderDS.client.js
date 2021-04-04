/**
 * User: do
 * Date: 01/02/18  15:26
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */
'use strict';
YUI.add( 'cardreaderDS', function( Y, NAME ) {

    /**
     * @modul cardreaderDS
     */

    /**
     * @property cardreaderDS
     * @for doccirrus
     * @type {doccirrus.cardreaderDS}
     */


    var
        // peek = ko.utils.peekObservable,
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        MODAL_TITLE = i18n( 'InvoiceMojit.cardreaderDS.title.MODAL_TITLE' );

    function getTemplate() {
        return Y.doccirrus.jsonrpc.api.jade
            .renderFile( {path: 'CardreaderMojit/views/cardreaderDS_history'} )
            .then( function( response ) {
                return response.data;
            } );
    }

    /**
     * @class doccirrus.cardreaderDS
     */

    /**
     * TODO
     *
     * @param args
     * @param args.dataSource
     * @param args.urlSuffix
     * @param args.callID
     * @param [args.batch=false]
     */
    Y.namespace( 'doccirrus.cardreaderDS' ).readCard = function( /*args*/ ) {

        // Y.doccirrus.jsonrpc.api.crmanagerDS();

    };

    Y.namespace( 'doccirrus.cardreaderDS' ).showHistory = function(ids, errors, typeOfRead) {
        Promise.resolve( getTemplate() ).then( function( template ) {
            var
                bodyContent = Y.Node.create( template ),
                modal,
                model = KoViewModel.createViewModel( {
                    NAME: 'CardReadHistoryModel',
                    config: {
                        data: {
                            ids: ids,
                            errors: errors,
                            typeOfRead: typeOfRead,
                            close: function() {
                                if( modal ) {
                                    modal.close();
                                }
                            }
                        }
                    }
                } ),
                aDCWindowResizeEvent;

            modal = new Y.doccirrus.DCWindow( {
                className: 'DCWindow-CardReadHistory',
                bodyContent: bodyContent,
                title: MODAL_TITLE,
                icon: Y.doccirrus.DCWindow.ICON_INFO,
                width: (window.innerWidth * 95) / 100,
                height: (window.innerHeight * 93) / 100,
                minHeight: 600,
                minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                centered: true,
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
                                        modalBody.set( 'height', (window.innerHeight * 93) / 100 );
                                        modalBody.set( 'width', (window.innerWidth * 95) / 100 );
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
                        ko.cleanNode( bodyContent.getDOMNode() );
                    }
                }

            } );

            ko.applyBindings( model, bodyContent.getDOMNode() );
        } ).catch( function( err ) {
            Y.log( 'could not create card read history modal ' + err, 'error', NAME );
        } );

    };

}, '0.0.1', {
    lang: ['en', 'de', 'de-ch'],
    requires: [
        'JsonRpcReflection-doccirrus',
        'JsonRpc',
        'i18n-factory',
        'DCWindow',
        'DCSystemMessages',
        'KoViewModel',
        'CardReadHistoryModel'
    ]
} );
