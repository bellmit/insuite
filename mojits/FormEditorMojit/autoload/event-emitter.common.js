/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  Form event emitter, moved and refactored from utils-yui.js
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-event-emitter',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }

        /*
         *	Event handling ---------------------------------------------------------------------------------------------
         */

        Y.dcforms.event = {};

        Y.dcforms.createEventEmitter = function() {
            var
                ee = {},
                eventHandlers = {};         //  cached set of event handlers

            /**
             *  Register to be alerted on dcforms events
             *
             *  @param  eventName   {string}    eg: onFormLoaded
             *  @param  label       {string}    Used when unregistering
             *  @param  handler     {function}  Event handler function, called when event is raised
             */

            ee.on = function(eventName, label, handler) {

                //Y.log('register event ' + eventName + ' to: ' + label, 'debug', NAME);

                //  create handler group
                if (!eventHandlers.hasOwnProperty(eventName)) {
                    eventHandlers[eventName] = {};
                }

                eventHandlers[eventName][label] = handler;
                return label;
            };

            /**
             *  Unregister, remove an event listener
             *
             *  Unregister with the event name and label given at creation, or '*' for all events under label
             *
             *  @param  label       {string}    As used when adding the listener
             *  @param  eventName   {string}    eg: onFormLoaded
             */

            ee.off = function(eventName, label) {

                if ((!eventHandlers.hasOwnProperty(eventName)) && ('*' !== eventName)) {
                    //  nothing to do
                    return;
                }

                var k;

                //  delete any events handlers with this label

                if ('*' === eventName) {
                    for (k in eventHandlers) {
                        if (eventHandlers.hasOwnProperty(k)) {
                            Y.dcforms.event.off(k, label);
                        }
                    }
                    return;
                }

                //  attempt to delete a single, named event hander under the given label

                for (k in eventHandlers[eventName]) {
                    if (eventHandlers[eventName].hasOwnProperty(k)) {
                        if (k === label || '*' === label) {

                            //Y.log('unregister event ' + eventName + ' for: ' + label, 'debug', NAME );
                            delete eventHandlers[eventName][k];

                            if ('*' !== label) {
                                return;
                            }

                        }
                    }
                }

            };

            /**
             *  Raise an event with anything listening for it
             *
             *  @param eventName    {String}    Name of event, eg, 'onFormLoad' (before) 'onFormLoaded' (after)
             *  @param eventData    {Object}    Properties will depend on context
             */

            ee.raise = function(eventName, eventData) {

                //Y.log('Checking for listeners: ' + eventName, 'debug', NAME);

                //  check that there is at least one listener
                if (!eventHandlers.hasOwnProperty(eventName)) {
                    //Y.log('No listeners for ' + eventName, 'debug', NAME);
                    return;
                }

                var
                    cbFn,
                    label;

                for (label in eventHandlers[eventName]) {
                    if (eventHandlers[eventName].hasOwnProperty(label)) {

                        //Y.log('raise event ' + eventName + ' to: ' + label, 'debug', NAME);

                        cbFn = eventHandlers[eventName][label];

                        if ('function' === typeof cbFn) {
                            cbFn(eventData);
                        } else {
                            if( Y.config.debug ) {
                                Y.log('Event handler for ' + label + ' not a function: ' + JSON.stringify(cbFn, undefined, 2), 'warn', NAME);
                            }
                        }
                    }
                }

            };

            /**
             *  Raise an event is a simple value has changed, return new / current value
             *
             *  This is mostly to simplify and tidy code which would otherwise have a lot of if statements
             *
             *  @param  oldValue    {Mixed}    Previous value of some property
             *  @param  newValue    {Mixed}    Current value of the same property
             */

            ee.raiseIfDifferent = function(oldValue, newValue, eventName, eventData) {

                if ('object' === typeof oldValue) {
                    oldValue = JSON.stringify(oldValue);
                }

                if ('object' === typeof newValue) {
                    newValue = JSON.stringify(newValue);
                }

                if (oldValue !== newValue) {
                    Y.dcforms.event.raise(eventName, eventData);
                }

                return newValue;
            };


            /**
             *  Print information about registered events to the console, for debugging
             */

            ee.logStats = function() {
                var k, j, count;

                for (k in eventHandlers) {
                    if (eventHandlers.hasOwnProperty(k)) {

                        count = 0;

                        for (j in eventHandlers[k]) {
                            if (eventHandlers[k].hasOwnProperty(j)) {
                                Y.log('Listener for ' + k + ' has label ' + j, 'debug', NAME);
                                count = count + 1;
                            }
                        }

                        Y.log('Event registered: ' + k + ' to ' + count + ' listeners', 'debug', NAME);

                    }
                }
            };


            //  alias, save on typing
            ee.rid = function(oldValue, newValue, eventName, eventData) {
                Y.dcforms.event.raiseIfDifferent(oldValue, newValue, eventName, eventData);
            };

            return ee;
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);