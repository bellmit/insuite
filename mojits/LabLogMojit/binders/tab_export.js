/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, ko */
fun = function _fn( /*Y, NAME*/ ) {
    'use strict';
    /*var
     i18n = Y.doccirrus.i18n;*/

    return {

        registerNode: function( node ) {

            ko.applyBindings( {}, node.getDOMNode() );
        },

        deregisterNode: function( node ) {

            ko.cleanNode( node.getDOMNode() );

        }
    };
};
