/**
 * User: rw
 * Date: 08.11.13  08:04
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * Common library dealing with Rules.
 *
 * dcrule.getRuleSetForData( dataObject )
 *     given a dataObject, check which of the rulesets apply to it.
 *     ruleSets are applied additively, with later rulesets overwriting previous information, if present at all.
 *     To delete, the ruleset needs to explicitly set the field to 'null' or to set a delete flag "__delete:true".
 *
 */




/*global YUI*/

'use strict';

YUI.add( 'dcruleloader', function( Y, NAME ) {

        var
            myRuleloader;

        /**
         * Adds additional functions to a ruleset
         *
         * @class RsWrapper
         * @param ruleset  the ruleset we are wrapping.
         * @constructor
         */
        function RsWrapper( ruleset ) {
            this.ruleset = ruleset;
            this.hasApplicableRule = false;
        }

        RsWrapper.prototype.init = function( schemaName ) {
            this.schema = schemaName;
        };

        /**
         *
         * @returns {Boolean}
         */
        RsWrapper.prototype.isValid = function() {
            return (this.ruleset &&
                    this.ruleset.definition &&
                    this.ruleset.definition.fields &&
                    this.ruleset.definition.fields[this.schema]);
        };

        RsWrapper.prototype.forSchemaPath = function( path ) {
            var
                temp,
                result = {};
            temp = myRuleloader.getRuleForPath( this.ruleset.definition, this.schema, path );
            if( temp ) {
                if( temp.default ) {
                    result.default = temp.default;
                    this.hasApplicableRule = true;
                }
                if( temp.validate ) {
                    result.validate = temp.validate;
                    this.hasApplicableRule = true;
                }
                if( temp.recommend ) {
                    result.recommend = temp.recommend;
                    this.hasApplicableRule = true;
                }
            }
            return result;
        };

        RsWrapper.prototype.getHasApplicableRule = function() {
            return this.hasApplicableRule;

        };

        /**
         * Constructor for the module class.
         *
         * @class DCRuleloader
         * @private
         */
        function DCRuleloader() {
        }

        DCRuleloader.prototype.indexRuleSet = function( ruleset, schemaName ) {
            if( ruleset.fields[schemaName] && !(ruleset.map && ruleset.map[schemaName]) ) {
                Y.log( 'got activity', 'debug', NAME );
                ruleset.map = {};
                ruleset.map[schemaName] = {};
                ruleset.fields[schemaName].forEach( function( val ) {
                    // makes a map for the ruleset
                    ruleset.map[schemaName][val.path] = val;
                } );
            }
            return ruleset.map[schemaName];
        };

        DCRuleloader.prototype.getRuleForPath = function( ruleset, schemaName, path ) {
            var
                idx;
            idx = Y.doccirrus.ruleloader.indexRuleSet( ruleset, schemaName );
            if( !idx ) {
                Y.log( 'Empty Ruleset!', 'warn', NAME );
                return;
            }

            function shiftPath( path, sep ) {
                var s;
                s = path.split( sep );
                if( 1 < s.length ) {
                    s.shift();
                    return s.join('.');
                }
            }

            // function to recursively scan if a path is dealing with complex
            // objects
            function getCurrentKey( key ) {
                var
                    literal = ('' === idx[key] ? key : idx[key] ),// empty string is shorthand for pass the key through.
                    derived;
                //console.log(key);
                if( !literal ) {
                    derived = shiftPath( key, '.' );
                    if( derived ) {
                        return getCurrentKey( derived );
                    }

                } else {
                    return literal;
                }
            }

            return getCurrentKey( path );

        };

        DCRuleloader.prototype.getRuleSetForData = function( data ) {
            Y.log( 'rule set for data ' + data, 'debug', NAME );
            var
                name = '',
                applies = '';
            myRuleloader.forEach( function( val, key ) {
                if( val.ruleset.appliesTo( data ) ) {
                    //use the first one
                    applies = applies || val;
                    name = name || key;
                }
            } );
            if( Y.config.debug ) {
                Y.log( 'data driven model:: ' + name + '  ' + JSON.stringify( applies.definition ), 'debug', NAME );
            }
            return Y.doccirrus.ruleset[name];
        };

        // forEach( callback (val, key) )
        // returns a DCRule array of rules in val and the key name
        DCRuleloader.prototype.forEach = function( callback ) {
            var rs,
                obj;
            for( rs in Y.doccirrus.ruleset ) {
                if( Y.doccirrus.ruleset.hasOwnProperty( rs ) ) {
                    obj = Y.doccirrus.ruleset[rs];
                    if( obj.name ) {
                        callback( new RsWrapper( obj ), rs );
                    }
                }
            }
        };

        myRuleloader = new DCRuleloader();

        Y.namespace( 'doccirrus' ).ruleloader = myRuleloader;
    },
    '0.0.1', {requires: []}
);