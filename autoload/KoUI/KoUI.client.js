/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'KoUI', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * List of {{#crossLink "doccirrus.KoUI.KoComponentManager.componentTypes"}}components{{/crossLink}}
     * @module KoUI
     */

    /**
     * @property KoUI
     * @for doccirrus
     * @type {doccirrus.KoUI}
     */
    /**
     * __Namespace of {{#crossLinkModule "KoUI"}}{{/crossLinkModule}} Module in {{#crossLink "doccirrus"}}{{/crossLink}}__
     *
     * Purpose is to wrap [bootstrap](http://getbootstrap.com/) markup into a reusable component interface.
     *
     * @class doccirrus.KoUI
     * @static
     */
    Y.namespace( 'doccirrus.KoUI' );

    Y.doccirrus.KoUI.version = '0.1.0';
    Y.doccirrus.KoUI.i18n = Y.doccirrus.i18n;

}, '3.16.0', {
    lang: ['en', 'de', 'de-ch'],
    requires: [
        'doccirrus',

        'KoUI-utils-Polyfill',
        'KoUI-utils-Object',

        'KoComponentManager',

        'ko-template',
        'KoUI-extenders'
    ]
} );
