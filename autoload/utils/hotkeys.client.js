/**
 * User: Lukasz
 * A simple plugin for handling keyboard shortcuts.
 */


/*global YUI, $ */
YUI.add( 'dchotkeyshandler', function( Y, NAME ) {
        'use strict';

        var
            i18n = Y.doccirrus.i18n,
            ARROWLEFT = i18n( 'hotkeys_clientJS.key.ARROWLEFT' ),
            ARROWRIGHT = i18n( 'hotkeys_clientJS.key.ARROWRIGHT' ),
            ARROWDOWN = i18n( 'hotkeys_clientJS.key.ARROWDOWN' ),
            ARROWUP = i18n( 'hotkeys_clientJS.key.ARROWUP' ),
            SPACE = i18n( 'hotkeys_clientJS.key.SPACE' ),

            shortCutHtmlTemplate = '<tr><td> <b> %description% </b> </td><td> %shortCut% </td></tr>',
            //chartable for mapping of key IDs to actual key names and letters
            charTable = {
                "37": 'arrowLeft',
                "38": 'arrowUp',
                "39": 'arrowRight',
                "40": 'arrowDown',
                "32": 'space'
            },
            i;

        //generating char table. This is necessary currently because too many OS/browser combinations turn up odd keys
        for( i = 0; i < 26; i++ ) {
            charTable[(i + 65) + ""] = String.fromCharCode( i + 65 );
            charTable[(i + 97) + ""] = String.fromCharCode( i + 97 );
        }

        //Add numbers into char table
        for( i = 0; i < 10; i++ ) {
            charTable[(i + 48) + ''] = String.fromCharCode( i + 48 );
        }

        function _template( template, data ) {
            return template.replace( /%(\w*)%/g,
                function( m, key ) {
                    return data.hasOwnProperty( key ) ? data[key] : "";
                } );
        }

        Y.log( 'Initializing hot keys handler', 'info', NAME );

        /**
         * Provides a global handler for keyboard shortcuts
         *
         * @module utils
         * @class HotKeysHandler
         * @constructor
         */
        function HotKeysHandler() {
            this.hotKeyGroups = {};
            this.bypass = false;

            $( 'body' ).on( 'keydown', Y.bind( this.checkForRegisteredKeyCombination, this ) );
        }

        /**
         * checks given jQuery.Event if it is matching any registered shortCuts,
         * if so it calls the required callback and prevents the browser default handling
         * @method checkForRegisteredKeyCombination
         * @param {jQuery.Event} $event
         */
        HotKeysHandler.prototype.checkForRegisteredKeyCombination = function( $event ) {
            var
                found = false;
            if( this.bypass ) {
                return;
            }
            Y.each( this.hotKeyGroups, function( hotKeyGroup ) {
                Y.each( hotKeyGroup.shortCutHandlers, function( shortCutHandler, keyCombination ) {
                    // check for matching shortCut on $event
                    if( Y.Array.every( keyCombination.split( '+' ), function( key ) {
                            key = key.trim().toLowerCase();
                            if($event.altKey && $event.ctrlKey) {
                                return false; // This is AltGraph key, we need to neglect this key as it mingles with "cntrl+<key>"
                            } else {
                                return (charTable[$event.which] && key === charTable[$event.which].toLowerCase()) || $event[key + 'Key'];
                            }
                        } ) ) {
                        found = shortCutHandler;
                        return false;
                    }
                } );
                if( found ) {
                    return false;
                }
            } );

            if( found ) {
                if( !found.callbackFn.call( found, $event ) ) {
                    $event.preventDefault();
                    $event.stopImmediatePropagation();
                }
            }
        };

        /**
         * AddGroup registers a group of HotKeys. One group can be using on one or many subpages.
         * @method addGroup
         * @param groupName
         */
        HotKeysHandler.prototype.addGroup = function( groupName ) {
            var hotKeyGroup = new HotKeysGroup();

            if( this.getGroupByName( groupName ) ) {
                return this.getGroupByName( groupName );
            }

            this.hotKeyGroups[groupName] = hotKeyGroup;

            return hotKeyGroup;
        };

        /**
         * addSingleGroup registers a group of HotKeys. This group CAN NOT be used on one or many subpages.
         * @method addSingleGroup
         * @param groupName
         */
        HotKeysHandler.prototype.addSingleGroup = function( groupName ) {
            var hotKeyGroup = new HotKeysGroup();

            this.hotKeyGroups[groupName] = hotKeyGroup;

            return hotKeyGroup;
        };

        /**
         * Returns a group with passed name [object HotKeysGroup] or false if not founded
         * @method addGroup
         * @param groupName
         */
        HotKeysHandler.prototype.getGroupByName = function( groupName ) {
            if( this.hotKeyGroups[groupName] ) {
                return this.hotKeyGroups[groupName];
            } else {
                return false;
            }
        };

        /**
         * Returns all hotKeyGroups as html
         * @method toHtml
         * @param   {Object}    activeState
         * @returns {String}
         */
        HotKeysHandler.prototype.toHtml = function( activeState ) {
            var outputArray = [],
                _key;

            for( _key in this.hotKeyGroups ) {

                if( this.hotKeyGroups.hasOwnProperty( _key ) ) {
                    if( Array.isArray( activeState ) ) {
                        if( -1 !== activeState.indexOf( _key ) || 'global' === _key ) {
                            outputArray = outputArray.concat( this.hotKeyGroups[_key].toHtml( true ) );
                        }
                    } else {
                        if( activeState === _key || 'global' === _key ) {
                            outputArray = outputArray.concat( this.hotKeyGroups[_key].toHtml( true ) );
                        }
                    }
                }
            }

            outputArray.sort( Y.ArraySort.naturalCompare );

            return outputArray.join( '' );
        };

        /**
         * Manages shortcuts within a group
         * @class HotKeysGroup
         * @constructor
         */
        function HotKeysGroup() {
            this.shortCutHandlers = {};
        }

        /**
         * removes any shortCutHandler registered with 'on'
         */
        HotKeysGroup.prototype.reset = function() {
            this.shortCutHandlers = {};
        };

        HotKeysGroup.prototype.toHtml = function( doNotJoin ) {
            var outputArray = [],
                _key,
                joinResult = !doNotJoin;

            for( _key in this.shortCutHandlers ) {
                if( this.shortCutHandlers.hasOwnProperty( _key ) ) {
                    outputArray.push( this.shortCutHandlers[_key].toHtml() );
                }
            }

            return joinResult ? outputArray.join( '' ) : outputArray;
        };

        /**
         * currently supported combinations are:
         * - only key (e.g.: 'a')
         * - special and key (e.g.: 'alt+a')
         * where combination symbol have to be '+' and special my be of 'alt', 'ctrl', 'meta' or 'shift'
         * @param {String} keyCombination
         * @param {String} description
         * @param {Function} callbackFn
         * @return {HotKeysGroup}
         */
        HotKeysGroup.prototype.on = function( keyCombination, description, callbackFn ) {
            var
                shortCutObj;

            if( keyCombination ) {
                shortCutObj = new ShortCutHandler( keyCombination, description, callbackFn );
                shortCutObj._parent = this;
                this.shortCutHandlers[keyCombination] = shortCutObj;
            } else {
                throw new Error( "No key combination specified" );
            }

            return this;
        };

        /**
         * removes a shortCutHandler by registered keyCombination
         * @param {String} keyCombination
         * @return {HotKeysGroup}
         */
        HotKeysGroup.prototype.un = function( keyCombination ) {

            if( keyCombination ) {
                if( this.shortCutHandlers[keyCombination] ) {
                    this.shortCutHandlers[keyCombination] = null;
                    delete this.shortCutHandlers[keyCombination];
                }
            } else {
                throw new Error( "No key combination specified" );
            }

            return this;
        };

        function ShortCutHandler( keyCombination, description, callbackFn ) {
            this.keyCombination = keyCombination;
            this.callbackFn = callbackFn;
            this.description = description;

            this.template = shortCutHtmlTemplate;
        }

        ShortCutHandler.prototype.toHtml = function() {
            var
                translated = [];
            this.keyCombination.split( '+' ).forEach( function( key ) {
                switch( key ) {
                    case 'arrowLeft':
                        key = ARROWLEFT;
                        break;
                    case 'arrowUp':
                        key = ARROWUP;
                        break;
                    case 'arrowRight':
                        key = ARROWRIGHT;
                        break;
                    case 'arrowDown':
                        key = ARROWDOWN;
                        break;
                    case 'space':
                        key = SPACE;
                        break;
                }
                translated.push( key );
            } );

            return _template( this.template, {
                shortCut: translated.join( '+' ),
                description: this.description
            } );
        };

        Y.namespace( 'doccirrus' ).HotKeysHandler = new HotKeysHandler();

    },
    '0.0.1', {
        requires: [
            'oop'
        ]
    }
);