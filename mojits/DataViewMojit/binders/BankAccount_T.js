/*
 (c) Doc Cirrus Gmbh, 2013
 */

/**
 * Everything related to dynamic aspects of address entry
 */

/*global YUI, alert */

function _fn( Y, NAME ) {
    'use strict';

    var
        i;

    return {
        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node   NB: The node MUST have an   id   attribute.
         */
        registerNode: function( node ) {
            var
                divb,
                divc,
                sel;

            // event handlers and defaults inside the caccount field area
            //divb = $( '#' + node.get( 'id' ) + ' .caccount_bank' );
            divb = node.one('.caccount_bank');
            divb.hide();
            //divc = $( '#' + node.get( 'id' ) + ' .caccount_card' );
            divc = node.one('.caccount_card');
            divc.hide();
            sel = node.one( 'select[name="cardType"]');
            //$( '#' + node.get( 'id' ) + ' select[name="cardType"]' );
//            console.dir(divb);
//            console.dir(divc);
//            console.dir(sel);
            sel.on( 'change', function( e ) {
                var 
                    val = sel.get('value');
                Y.log( 'caccount select cardType changed to: ' + sel.get('value'), 'debug', NAME );
                switch( sel.get( 'value' ) ) {
                    case 'bitte wählen':
                        divb.hide();
                        divc.hide();
                        break;
                    case 'BANK':
                        divb.show();
                        divc.hide();
                        Y.doccirrus.utils.isNodeDCValid( divb );
                        break;
                    case 'EC':
                    case 'VISA':
                    case 'MASTER':
                    case 'AMEX':
                    case 'OTHERCC':
                        divb.hide();
                        divc.show();
                        Y.doccirrus.utils.isNodeDCValid( divc );
                        break;
                }
            } );

            divb.show();
            divc.hide();
        },
        deregisterNode: function( node ) {
            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            //node.destroy();
        }

    };
}