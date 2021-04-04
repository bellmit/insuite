/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, jQuery */
YUI.add( 'jQueryUtils', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module jQuery-utils
     */
    var
        namespace = Y.namespace( 'doccirrus.jQueryUtils' );

    /**
     * helper function to remove class names that start with the same part
     * @param {jQuery|HTMLElement} $element the jQuery element to remove class names on
     * @param {String} classNamePartStartsWith part of the class names to remove starts with
     * @return {$element}
     */
    namespace.removeClassBeginsWith = function jQueryUtils_removeClassBeginsWith( $element, classNamePartStartsWith ) {
        if( !($element instanceof jQuery) ) {
            $element = jQuery( $element );
        }
        return $element.removeClass( Y.Array.filter( $element.attr( 'class' ).split( /\s+/ ), function( className ) {
            return 0 === className.indexOf( classNamePartStartsWith );
        } ).join( ' ' ) );
    };

}, '3.16.0', {
    requires: []
} );
