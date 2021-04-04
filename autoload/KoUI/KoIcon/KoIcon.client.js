/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'KoIcon', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoIcon
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        KoUI = Y.doccirrus.KoUI,
        makeClass = KoUI.utils.Object.makeClass,
        KoComponentManager = KoUI.KoComponentManager,
        KoComponent = KoComponentManager.registeredComponent( 'KoComponent' );

    /**
     * An icon component.
     * @class KoIcon
     * @constructor
     * @extends KoComponent
     * @param {Object} config a configuration object
     */
    function KoIcon() {
        KoIcon.superclass.constructor.apply( this, arguments );
    }

    makeClass( {
        constructor: KoIcon,
        extends: KoComponent,
        static: {
            /**
             * Constants for KoIcon.
             * @property CONST
             * @static
             * @final
             * @type {object}
             * @for KoIcon
             */
            CONST: {
                LIB: {
                    FONT_AWESOME: 'fa'
                },
                ICON: {
                    DEFAULT: '',
                    PLUS: 'fa-plus',
                    MINUS: 'fa-minus',
                    CHEVRON_LEFT: 'fa-chevron-left',
                    CHEVRON_RIGHT: 'fa-chevron-right',
                    CHEVRON_DOWN: 'fa-chevron-down',
                    CHEVRON_UP: 'fa-chevron-up',
                    CIRCLE_O: 'fa-circle-o',
                    TRASH_O: 'fa-trash-o',
                    COPY: 'fa-copy',
                    FILE_TEXT_O: 'fa-file-text-o',
                    GEAR: 'fa-gear',
                    OUTDENT: 'fa-outdent',
                    INDENT: 'fa-indent',
                    LIST_ALT: 'fa-list-alt',
                    DATABASE: 'fa-database',
                    COLUMNS: 'fa-columns',
                    LOCK: 'fa-lock',
                    PENCIL: 'fa-pencil',
                    PDF: 'fa-file-pdf-o',
                    CHECK: 'fa-check',
                    PRINT: 'fa-print',
                    SAVE: 'fa-floppy-o',
                    IMPEXP: 'fa-rocket',
                    TACHOMETER: 'fa-tachometer',
                    REFRESH: 'fa-refresh',
                    FILTER: 'fa-filter',
                    ADJUST: 'fa-adjust',
                    CERTIFICATE: 'fa-certificate',
                    DOWNLOAD: 'fa-download',

                    ASTERISK: 'fa-asterisk',
                    ANGLE_LEFT: 'fa-angle-left',
                    ANGLE_RIGHT: 'fa-angle-right',

                    EYE: 'fa-eye'
                }
            }
        },
        descriptors: {
            componentType: 'KoIcon',
            init: function() {
                var self = this;
                KoIcon.superclass.init.apply( self, arguments );
                self.addDisposable( ko.computed( self.hasIcon, self ) );
                self.addDisposable( ko.computed( function() {
                    var
                        LIB = KoIcon.CONST.LIB,
                        css = self.css.peek(),
                        lib = ko.unwrap( self.lib );

                    Y.each( LIB, function( value, key ) {
                        css[LIB[key]] = (lib === key);
                    } );
                    self.css.valueHasMutated();
                }, self ) );
                self.addDisposable( ko.computed( function() {
                    var
                        ICON = KoIcon.CONST.ICON,
                        css = self.css.peek(),
                        iconName = ko.unwrap( self.iconName );

                    Y.each( ICON, function( value, key ) {
                        css[ICON[key]] = (iconName === key);
                    } );
                    self.css.valueHasMutated();
                }, self ) );
            },
            /**
             * Check component has an icon.
             * @method hasIcon
             * @returns {boolean}
             */
            hasIcon: function() {
                return Boolean( ko.unwrap( this.iconName ) );
            }
        },
        lazy: {
            /**
             * Library to use for icons.
             * @attribute lib
             * @type {string}
             * @default 'FONT_AWESOME'
             */
            lib: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'FONT_AWESOME' ) );
            },
            /**
             * Icon name to use as icon. See {{#crossLink "KoIcon/CONST:property"}}{{/crossLink}}.
             * @attribute iconName
             * @type {string}
             * @default 'DEFAULT'
             */
            iconName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'DEFAULT' ) );
            },
            templateName: function( key ) {
                var
                    self = this;

                return self._handleLazyConfig( key, ko.observable( 'KoIcon' ) );
            }
        }
    } );
    /**
     * @property KoIcon
     * @type {KoIcon}
     * @for doccirrus.KoUI.KoComponentManager.componentTypes
     */
    KoComponentManager.registerComponent( KoIcon );

}, '3.16.0', {
    requires: [
        'oop',
        'KoUI',
        'KoComponentManager',
        'KoComponent'
    ]
} );
