/*jslint anon:true, nomen:true*/
/*global YUI*/

YUI.add( 'classnamemanager', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * Contains a singleton (ClassNameManager) that enables easy creation and caching of
     * prefixed class names.
     *
     * It is needed to overwrite yui defined class-names to adapt bootstrap class-names
     * @module classnamemanager
     */

    /**
     * A singleton class providing:
     *
     * <ul>
     *    <li>Easy creation of prefixed class names</li>
     *    <li>Caching of previously created class names for improved performance.</li>
     * </ul>
     *
     * @class ClassNameManager
     * @static
     */

    // String constants
    var CLASS_NAME_PREFIX = 'classNamePrefix',
        CLASS_NAME_DELIMITER = 'classNameDelimiter',
        CONFIG = Y.config;

    // Global config

    /**
     * Configuration property indicating the prefix for all CSS class names in this YUI instance.
     *
     * @property classNamePrefix
     * @type {String}
     * @default "yui"
     * @static
     */
    CONFIG[CLASS_NAME_PREFIX] = CONFIG[CLASS_NAME_PREFIX] || 'yui3';

    /**
     * Configuration property indicating the delimiter used to compose all CSS class names in
     * this YUI instance.
     *
     * @property classNameDelimiter
     * @type {String}
     * @default "-"
     * @static
     */
    CONFIG[CLASS_NAME_DELIMITER] = CONFIG[CLASS_NAME_DELIMITER] || '-';

    Y.ClassNameManager = (function() {

        var sPrefix = CONFIG[CLASS_NAME_PREFIX],
            sDelimiter = CONFIG[CLASS_NAME_DELIMITER];

        return {

            /**
             * Returns a class name prefixed with the the value of the
             * <code>Y.config.classNamePrefix</code> attribute + the provided strings.
             * Uses the <code>Y.config.classNameDelimiter</code> attribute to delimit the
             * provided strings. E.g. Y.ClassNameManager.getClassName('foo','bar'); // yui-foo-bar
             *
             * @method getClassName
             * @param {String}+ classnameSection one or more classname sections to be joined
             * @param {Boolean} skipPrefix If set to true, the classname will not be prefixed with the default Y.config.classNameDelimiter value.
             */
            getClassName: Y.cached( function() {

                var args = Y.Array( arguments ), getClassName;

                if( args[args.length - 1] !== true ) {
                    args.unshift( sPrefix );
                } else {
                    args.pop();
                }

                getClassName = args.join( sDelimiter );
                // console.warn("%c"+ getClassName, 'font-weight:bold;', 'ClassNameManager');
                switch (getClassName) {
                    case 'yui3-button': return 'btn btn-default';
                    case 'yui3-button-primary': return 'btn-primary';
                }
                return getClassName;
            } )

        };

    })();

}, '3.11.0', {
    "requires": ["yui-base"]/*,
    supersedes: ["classnamemanager"]*/
} );
