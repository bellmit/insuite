/*
 @author: dm
 @date: 2017/06/20
 */
/*jshint noempty:false */

/*global YUI, ko */

'use strict';

YUI.add( 'activitycancelmodal', function( Y ) {
    var i18n = Y.doccirrus.i18n,
        CONFIRM = i18n( 'general.button.CONFIRM' ),
        Disposable = Y.doccirrus.KoViewModel.getDisposable();

    function SelectCancelModel( config ) {
        SelectCancelModel.superclass.constructor.call( this, config );
    }

    Y.extend( SelectCancelModel, Disposable, {
        initializer: function SelectFlowModel_initializer( ) {
            var
                self = this;

            self.cancelReason = ko.observable( '' );

            self.select2CancelReason = {
                val: ko.computed( {
                    read: function() {
                        return self.cancelReason();
                    },
                    write: function( $event ) {
                        self.cancelReason( $event.val );
                    }
                } ),
                select2: {
                    placeholder: '',
                    allowClear: true,
                    quietMillis: 700,
                    maximumInputLength: 50,
                    initSelection: function( element, callback ) {
                        var data = {id: element.val(), text: element.val()};
                        callback( data );
                    },
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.tag.read( {
                            query: {
                                type: Y.doccirrus.schemas.tag.tagTypes.CANCELREASON,
                                title: {
                                    $regex: query.term,
                                    $options: 'i'
                                }
                            },
                            options: {
                                itemsPerPage: 15,
                                sort: {title: 1}
                            },
                            fields: {title: 1}
                        } ).done( function( response ) {
                            query.callback( {
                                results: (response && response.data && response.data.map( function( item ) {
                                    return {id: item.title, text: item.title};
                                } )) || []
                            } );
                        } );
                    },
                    sortResults: function( data ) {
                        return data.sort( function( a, b ) {
                            return a.text.toLowerCase() < b.text.toLowerCase() ? -1 : a.text.toLowerCase() > b.text.toLowerCase() ? 1 : 0;
                        } );
                    },
                    createSearchChoice: function( term ) {
                        return {
                            id: term,
                            text: term
                        };
                    }
                }
            };
        }
    });




        function getTemplate( node, data, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'cancel_modal',
                'InCaseMojit',
                data,
                node,
                callback
            );
        }


        function show( data ) {
            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, data, function() {
                var cancelModel = new SelectCancelModel(),
                    model;

                model = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-ActivityCancel',
                    bodyContent: node,
                    title: data.message,
                    maximizable: false,
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: Y.doccirrus.DCWindow.SIZE_SMALL,
                    minHeight: 200,
                    minWidth: Y.doccirrus.DCWindow.SIZE_SMALL,
                    centered: true,
                    focusOn: [],
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                label: CONFIRM,
                                // disabled: true,
                                action: function() {
                                    data.callback( { data: cancelModel.cancelReason() || ''} );
                                    model.close();
                                }
                            })
                        ]
                    }
                } );

                ko.applyBindings( cancelModel , node.getDOMNode() );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).activityCancel = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dcpartnertable',
            'dccallermodal'
        ]
    }
);
