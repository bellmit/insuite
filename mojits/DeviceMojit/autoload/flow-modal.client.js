/**
 * User: pi
 * Date: 26/08/2015  16:10
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DCFlowModal', function( Y ) {

        function FlowModal() {

        }

        FlowModal.prototype.showModal = function( data, callback ) {

            function show() {
                var
                    modal,
                    node = Y.Node.create( '<div></div>' ),
                    i18n = Y.doccirrus.i18n,
                    TITLE = i18n('DeviceMojit.flow_modal_clientJS.title.MODAL_TITLE' ),
                    KoViewModel = Y.doccirrus.KoViewModel,
                    flowModel = new KoViewModel.createViewModel({NAME: 'FlowModel', config: {
                        data: data
                    }});
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'flow_modal',
                    'DeviceMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: [ 'close' ],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            callback( flowModel.toJSON() );
                                            this.close();
                                        }
                                    } )
                                ]
                            }
                        } );
                        modal.set( 'focusOn', [] );
                        flowModel.flowTypeI18n =  i18n( 'flow-schema.FlowType_E.i18n');
                        ko.applyBindings( flowModel, node.getDOMNode().querySelector( '#flowModel' ) );
                    }
                );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).flowModal = new FlowModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel'
        ]
    }
);
