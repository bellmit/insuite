/**
 * User: rw
 * Date: 08.11.13  08:04
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * A rule file (schema) is termed here as "rule"  it is an atomic unit of for a specific rule semantic.
 * The rule controller has two function with which it decides which rule to apply to specific data:
 *
 * dcrule.getRuleSetsForContext( currentContext ), returns an array of the correct rule sets to apply.
 *    currently only the country is looked at, but could also be subscriptions, etc. that take effect.
 *
 * dcrule.getRuleSetForData( dataObject )
 *     given a dataObject, check which of the rulesets apply to it.
 *     ruleSets are applied additively, with later rulesets overwriting previous information, if present at all.
 *     To delete, the ruleset needs to explicitly set the field to 'null' or to set a delete flag "__delete:true".
 *
 */




/*global YUI*/



YUI.add( 'dcrules', function( Y, NAME ) {

        var

            myRuleSets = [],
            myRules;

        /**
         * Constructor for the module class.
         *
         * @class DCRules
         * @private
         */
        function DCRules() {
        }

        /**
         *
         * Work in progress.
         *
         * This function is unnecessary if the rulesets available on the
         * PRC system are restricted to the ones available for the country
         * of the customer. So this function is dependent on decisions
         * surrounding the RPM system and especially variable configurations
         * per customer.  MOJ-1182, ENV-4
         *
         * TBD: REQUIREMENTS UNCLEAR, SO THIS IS CURRENTLY JUST A DUMMY.
         *
         * sets up the rules for a PRC context. Not functional in VPRC.
         *
         */
        DCRules.prototype.getRuleSetsForContext = function() {

            function evalCountryInfo( err, country ) {
                if( err ) {
                    Y.log( 'Error while accessing country info: ' + JSON.stringify( err ), 'error', NAME );
                    return;
                }
                if( 'Deutschland' === country ) {
                    // get ruleset for country
                    myRuleSets = [ 'kbv', 'goa', 'ego'];
                    Y.log( 'Using rulesets: ' + myRuleSets, 'info', NAME );
                }
            }

            Y.log( 'rule sets for context', 'debug', NAME );
            // VPRC or PRC?
            if( Y.doccirrus.auth.isVPRC() || Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isISD() || Y.doccirrus.auth.isDCPRC() ) {
                // THIS CODE only works for PRC... NOT VPRC.
                // get country
                Y.doccirrus.auth.getCountry( null, evalCountryInfo );
            }
        };

        DCRules.prototype.replaceKeysWithCode = function( data, ruleset, schemaName ) {

            function makeEntry( key, val ) {
                return { k: key, v: val };
            }

            // rw: I just noticed now that this duplicates / echoes code in the schemaloader...
            // should consider writing a general schema parser!!
            //
            function replKeys( obj, prefix ) {
                var
                    newKey,
                    result;
                if( Array.isArray( obj ) ) {
                    result = [];
                    obj.forEach( function( val ) {
                        result.push( replKeys( val, prefix ) );
                        if(-1<prefix.indexOf('addresses')){console.log(result);}
                    } );
                } else if( 'object' === typeof obj ) {
                    result = {};
                    Y.Object.each( obj, function( val, key ) {
                        var p;
                        if( prefix ) {
                            p = prefix + '.' + key;
                        } else {
                            p = key;
                        }
                        //console.log(p);
                        newKey = Y.doccirrus.ruleloader.getRuleForPath( ruleset, schemaName, p );
                        if( newKey ) {
                            result[key] = makeEntry( newKey.fieldCode || p, replKeys( val, p ) );
                            //console.log(result[key]);
                        } // else silently ignore this element, not mapped
                    } );
                } else {
                    result = obj;
                }
                return result;
            }

            return replKeys( data, '' );
        };

        /**
         * Given a ruleset and some data -- maps the fieldCodes into the data:
         *
         * A sample result is (this would typically be embedded somewhere else...):
         * [{"actType":{"k":"4","v":"MEDICATION"},"activities":{"k":"activities","v":["52df927d979e340000000032","52df9265979e340000000030"]},"catalogRef":{"k":"18","v":""},...
         *
         * Note: in the above example, activities is not mapped (retains its name through the replacement rules).
         *
         * @param {Object}  user             user from which to determine tenant
         * @param {Object}  data             e.g. [{"__v":1,"_id":"52e276ca60197e00000000e5","actType":"MEDICATION","activities":["52df927d979e340000000032","52df9265979e340000000030"],"catalogRef":"",...
         * @param {String}  schemaName       e.g. 'practice'
         * @returns {*} a structure which is based on the given data object.
         */
        DCRules.prototype.mapData = function( user, data, schemaName ) {
            var
                ruleset;
            Y.log( 'rule map for data', 'debug', NAME );
            // 1. only works for kbv
            ruleset = Y.doccirrus.ruleset.kbv;
            Y.log( 'Got ruleset ' + (ruleset ? ruleset.definition._name : ' None!'), 'warn', NAME );
            // 2. replace key with fieldCode.
            if( ruleset ) {
                return myRules.replaceKeysWithCode( data, ruleset.definition, schemaName );
            }
        };

        myRules = new DCRules();
        Y.doccirrus.auth.onReady(
            function() {
                setTimeout(
                    myRules.getRuleSetsForContext,
                    1000
                );
            }
        );

        Y.namespace( 'doccirrus' ).rules = myRules;
    },
    '0.0.1', {requires: ['dcauth', 'dcruleloader']}
);