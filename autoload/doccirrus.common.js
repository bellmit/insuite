/*global YUI */
YUI.add( 'doccirrus', function( Y ) {
    'use strict';

    /**
     * @module doccirrus
     */

    /**
     * ## Doc Cirrus global namespace
     * ------------------------------
     *
     * #### Code Description Formatting
     * - [syntax documentation](http://daringfireball.net/projects/markdown/syntax)
     * - [yuidoc](http://yui.github.io/yuidoc/syntax/index.html "yuidoc")
     *
     * #### First Point
     * Lorem ipsum dolor sit **amet**.
     *
     * 1. first
     * 2. second
     *
     * ###### Second Point
     * Lorem ipsum dolor sit amet. `inline code`
     *
     *      console.warn('some code');
     *
     * @class doccirrus
     * @main doccirrus
     * @static
     */
    Y.namespace( 'doccirrus' );

    /**
     * Centralized translation method
     *
     * @method i18n
     * @for doccirrus
     * @param {String} string dot-limited path for doccirrus translation
     * @return {string}
     */
    Y.doccirrus.i18n = Y.doccirrus.intl.createTranslator.call( this );

}, '3.16.0', {
    lang: [ 'en', 'de', 'de-CH' ],
    requires: [ 'i18n-factory' ]
} );
