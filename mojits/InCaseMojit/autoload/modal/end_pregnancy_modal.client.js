/*
 @author: dm
 @date: 2017/06/20
 */
/*jshint noempty:false */

/*global YUI, ko */

'use strict';

YUI.add( 'endpregnancymodal', function( Y ) {
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
                        var
                            endPregnancyReasons = [
                                i18n( 'InCaseMojit.end_pregnancy_modal.reasons.LIVE_BIRTH' ),
                                i18n( 'InCaseMojit.end_pregnancy_modal.reasons.PREMATURE_BIRTH' ),
                                i18n( 'InCaseMojit.end_pregnancy_modal.reasons.STILLBIRTH' ),
                                i18n( 'InCaseMojit.end_pregnancy_modal.reasons.MISCARRIAGE' ),
                                i18n( 'InCaseMojit.end_pregnancy_modal.reasons.ECTOPIC' ),
                                i18n( 'InCaseMojit.end_pregnancy_modal.reasons.ABORTION' ),
                                i18n( 'InCaseMojit.end_pregnancy_modal.reasons.LATE_TERM_ABORTION' )
                            ],
                            results = [],
                            i;

                        for ( i = 0; i < endPregnancyReasons.length; i++ ) {
                            results.push( { 'id': endPregnancyReasons[i], 'text': endPregnancyReasons[i] } );
                        }

                        query.callback( { 'results': results } );

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
                var endPregnancyModel = new SelectCancelModel(),
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
                                    data.callback( { data: endPregnancyModel.cancelReason() || ''} );
                                    model.close();
                                }
                            })
                        ]
                    }
                } );

                ko.applyBindings( endPregnancyModel , node.getDOMNode() );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).endPregnancy = {
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
