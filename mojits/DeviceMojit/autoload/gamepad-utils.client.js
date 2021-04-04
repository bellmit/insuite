/**
 *  Set up listener for gamepad connection
 *
 *  When connection of a gamepad is detected, fire YUI events on foot pedal presses.  The device we expect is:
 *
 *      device: Philips Speech Processing Footcontol USB (Vendor: 0911 Product: 1844)
 *
 *      BUTTON_0:   left pedal
 *      BUTTON_1:   right pedal
 *      BUTTON_2:   middle pedal
 *
 *  Note that the HTML5 GamePad API requires button state to be repeatedly checked on a timer once connection is
 *  detected.  API is slightly different between Firefox and Chrome.
 *
 *  @author: strix
 *  @date: 2019/02/11
 */


/*eslint prefer-template: 0 */
/*global YUI */

'use strict';

YUI.add( 'gamepad-utils', function( Y, NAME ) {


    /**
     * @event gamepadButtonPress
     * @description Fires when a button state changes in any gamepad exposed in the browser windows
     *
     * @type Event.Custom
     */

    Y.publish( 'gamepadButtonPress', { preventable: false } );


    var
        CHECK_INTERVAL = 100,

        gamepads,

        buttonStates = { },

        //  TODO: use setInterval
        //loopCounter = 0,
        stateString = '',
        lastStateString = '';

    Y.log( 'Adding gamepad listener and YUI event emitter.', 'debug', NAME );


    function init() {
        if ( Y.doccirrus.gamepadUtils.initialized ) { return false; }

        //  note any gamepads already connected in this browser tab
        gamepads = getGamepadsPrefix();

        //  subscribe to global connection / disconnection events
        window.addEventListener( 'gamepadconnected', onGamepadConnected );
        window.addEventListener( 'gamepaddisconnected', onGamepadDisconnected );

        Y.doccirrus.gamepadUtils.initialized = true;

        //  need to start busy loop immediately on Chrome
        busyLoop();
    }

    /**
     *  Window event fired when a new gamepad is revealed to the browser tab (typically on button press, rather than connection of a new device)
     *  @param evt
     */

    function onGamepadConnected( evt ) {
        var
            gp = evt.gamepad,
            buttons = gp.buttons.length,
            axes = gp.axes.length;

        Y.log( 'Gamepad connected at index ' + gp.idx + ': ' + gp.id + ' (' + buttons + ' buttons, ' + axes + ' axes)', 'info', NAME );
        gamepads = getGamepadsPrefix();
        busyLoop();
    }

    /**
     *  Window event fired when a gamepad is disconnected (uncommon)
     *  @param evt
     */

    function onGamepadDisconnected( evt ) {
        gamepads = getGamepadsPrefix();
        Y.log( 'Gamepad disconnected from index ' + evt.gamepad.index + ' ' + evt.gamepad.id, 'info', NAME );
    }

    /**
     *  Gamepad state must be continually checked while connected
     *
     *  TODO: tidy this with setInterval
     */

    function busyLoop() {
        var
            i, j, btn, btnKey,
            isWebkitStyleAPI = false,
            hasGamePad = false;

        //loopCounter++;

        if ( 0 === gamepads.length ) {
            stateString = 'no controllers';
        } else {
            stateString = 'controllers: ' + gamepads.length + '<br/><br/>';

            //  Chrome instantiates an array of four null gamepads, which need to be repeatedly queried
            for ( i = 0; i < gamepads.length; i++ ) {
                if ( !gamepads[i] ) {
                    isWebkitStyleAPI = true;
                    break;
                }
            }

            //  only if webkit
            if ( isWebkitStyleAPI ) {
                gamepads = navigator.getGamepads();
            }

            for ( i = 0; i < gamepads.length; i++ ) {
                if ( gamepads[i] ) {

                    hasGamePad = true;
                    stateString += '<b>[' + i + '] ' + ( gamepads[i].id ? gamepads[i].id : 'NO DEVICE ID' ) + '</b><br/>';

                    for ( j = 0; j < gamepads[i].buttons.length; j++ ) {
                        btn = gamepads[i].buttons[j];

                        stateString = stateString + 'button ' + j + ' pressed: ' + btn.pressed + ' touched: ' + btn.touched + ' value: ' + btn.value + '<br/>';

                        btnKey = i + '_' + j;

                        if ( !buttonStates.hasOwnProperty( btnKey ) ) {
                            buttonStates[ btnKey ] = btn.value;
                        }

                        if ( buttonStates[ btnKey ] !== btn.value ) {

                            Y.fire( 'gamepadButtonPress', {
                                button: btn,
                                gamepadIdx: i,
                                buttonIdx: j,
                                value: btn.value
                            } );

                            buttonStates[ btnKey ] = btn.value;
                        }

                    }

                } else {
                    stateString += '<b>[' + i + '] empty slot</b><br/>';
                }
            }

        }

        if ( stateString !== lastStateString ) {
            //console.log( '(' + loopCounter + ') state changed: ' + stateString );
            lastStateString = stateString;
        }

        if ( !hasGamePad ) {
            Y.log( 'All gamepads disconnected, stopping busy check of button state.', 'debug', NAME );
            return;
        }

        window.setTimeout( function() { busyLoop(); }, CHECK_INTERVAL );
    }

    function getGamepadsPrefix() {
        return navigator.getGamepads ? navigator.getGamepads() : ( navigator.webkitGetGamepads ? navigator.webkitGetGamepads : [] );
    }

    /*
     *  Export module
     */

    Y.namespace( 'doccirrus' ).gamepadUtils = {
        initialized: false,

        LEFT_PEDAL: 0,
        RIGHT_PEDAL: 1,
        MIDDLE_PEDAL: 2,

        getGamepadsPrefix: getGamepadsPrefix
    };


    //  initialize only once, global singleton
    init();

}, '0.0.1', { requires: [ ] } );