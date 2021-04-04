/*
 * Author: rw
 * Date: 20.02.14  09:34
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/


YUI.add( 'RuleSetMojit', function( Y, NAME ) {


        /**
         * The RuleSetMojit module.
         *
         * @module RuleSetMojit
         */

        /**
         * Constructor for the Controller class.
         *
         * @class Controller
         * @constructor
         */
        Y.namespace( 'mojito.controllers' )[NAME] = {

            /**
             * Method for all incoming calls.  Decides which ruleset to load
             * to the client.
             *
             * Note: all rulesets are available in the server and only the
             *    required ones are sent to the client.
             *
             * @param {Object}  ac The ActionContext
             */
            __call: function( ac ) {
                var meta = { 'view': {} };

                Y.log( 'Deciding ruleset for client use ...', 'info', NAME );

                // all we really want to do is inject our RuleSet so that
                // it can be used by the other binders.
                // ac.assets.addJs('/static/RuleSetMojit/assets/jadeloader.js');
                meta.view.name = 'kbv';
                ac.done(
                    {
                        status: 'ok',
                        data: {}
                    },
                    meta
                );

            }
        };

    },
    '0.0.1',
    {requires: ['mojito-intl-addon','dcrules','kbv-ruleset','goa-ruleset','ego-ruleset']}
);
