/**
 * User: do
 * Date: 28/11/16  13:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

/*jslint anon:true, nomen:true*/
/*global YUI, ko*/

YUI.add( 'kbvlog-create-modal', function( Y/*, NAME */ ) {

        function createModelFromData( data ) {
            data.forEach( function( d ) {
                d.checked = ko.observable();
                d.displayLocName = d.superLocation ? Y.doccirrus.schemas.kbvlog.getSuperLocationName(d.slName, d.locname ) : d.locname;
            } );
            return data;
        }

        function show( data, callback ) {

            var node = Y.Node.create( '<div></div>' ),
                modal,
                model = createModelFromData( data );

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'kbvlog-create-modal',
                'InvoiceMojit',
                {},
                node,
                function() {

                    modal = Y.doccirrus.DCWindow.notice( {
                        title: 'Quartalsauswahl',
                        type: 'info',
                        window: {
                            width: 'medium',
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        action: function( e ) {
                                            modal.close( e );
                                            callback();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function( e ) {
                                            modal.close( e );
                                            var result = model.map( function( m ) {
                                                var qIdx = m.checked();
                                                if( 0 !== qIdx && !qIdx ) {
                                                    return;
                                                }
                                                m.checked = m.quarterList[qIdx];
                                                return m;
                                            } ).filter( Boolean );

                                            callback( result );
                                        }
                                    } )
                                ]
                            }
                        },
                        message: node
                    } );

                    ko.applyBindings( model, node.one( '#kbvlog-create-modal' ).getDOMNode() );
                }
            );

        }

        Y.namespace( 'doccirrus.modals' ).kbvLogCreateModal = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'JsonRpc'
        ]
    }
);
