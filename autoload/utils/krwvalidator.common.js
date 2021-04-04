/*global YUI */
YUI.add( 'dckrwvalidator', function( Y, NAME ) {
        'use strict';

        var moment = Y.doccirrus.commonutils.getMoment(),
            today = moment(),
            startOfTime = convertDate( '1000-01-01' ),
            endOfTime = convertDate( '9999-12-31' );

        /*jshint latedef:false */
        function convertDate( date ) {
            return moment( date, 'YYYY-MM-DD' );
        }

        function KRWValidator() {

        }

        function KRWValidatorError( code, msg ) {
            this.code = code;
            this.message = msg;
        }

        function checkvalidityRange( range ) {
            var start, end;
            if( 'string' !== typeof range ) {
                return false;
            }
            range = range.split( '..' );
            start = range[0] ? convertDate( range[0] ) : startOfTime;
            if( 1 === range.length ) {
                // must be same day
                return start.isSame( today, 'day' );
            }
            end = range[1] ? convertDate( range[1] ) : endOfTime;
            return today.isAfter( start ) && today.isBefore( end );
        }

        function findOne( arr, fn, context ) {
            arr = arr.filter( fn, context );
            return arr && arr[0];
        }

        // exact match against string or regex
        function testValue( str, val ) {
            var match;
            if( 'string' !== typeof str || 'string' !== typeof val ) {
                Y.log( "testValue 1", 'info', NAME );
                return false;
            }
            match = str.match( val );
            Y.log( "testValue 2 " + ' ' + match + ' ' + str + ' ' + val );
            return null !== match && match[0] === str;
        }

        KRWValidator.parameters = {
            'ICD': {
                getParamContext: function( val, data ) {
                    if( Y.config.debug ) {
                        Y.log( 'ICD param context ' + Array.isArray( data.diagnosis ) + ' ' + val + ' ' + JSON.stringify( data ), 'info', NAME );
                    }
                    if( Array.isArray( data.diagnosis ) ) {
                        return findOne( data.diagnosis, function( diagnose ) {
                            return testValue( diagnose.ICD, val );
                        } );
                    }
                }
            },
            'GNR': {
                getParamContext: function( val, data ) {
                    if( Array.isArray( data.treatments ) ) {
                        return findOne( data.treatments, function( treatment ) {
                            return testValue( treatment.GNR, val );
                        } );
                    }
                }
            },
            'BAR': {
                getParamContext: function( val, data ) {
                    if( Array.isArray( data.BAR ) ) {
                        return findOne( data.BAR, function( bar ) {
                            return testValue( bar, val );
                        } );
                    }
                }
            },
            'DEFAULT': {
                getParamContext: function( val, data, param ) {
                    return testValue( val, data[param] ) && data[param];
                }
            }
        };

        KRWValidator.validate = function( krw, data, realtime, callback ) {

            var isRealtime = realtime || false,
                result = {
                    rulesTested: 0,
                    errors: [],
                    data: data,
                    krw: krw
                };

            function getParamContext( paramName, val, _data ) {
                var parameter;
                parameter = KRWValidator.parameters[paramName] || KRWValidator.parameters.DEFAULT;
                if( parameter && 'function' === typeof parameter.getParamContext ) {
                    Y.log( 'Found param context for ' + paramName, 'info', NAME );
                    return parameter.getParamContext( val, _data, paramName );
                }
            }

            function validateCondition( cond, _data ) {

                var
                    op = cond.operator || 'AND',
                    arrMethod = 'OR' === op ? 'some' : 'every',
                    existence = cond.existence,
                    values = cond.values;

                if( Y.config.debug ) {
                    Y.log( 'Validate Condition operator: ' + JSON.stringify( cond ) + ' ' + JSON.stringify( _data ), 'info', NAME );
                }

                return values[arrMethod]( function( value ) {

                    var ok, paramContext = getParamContext( cond.parameter, value.value, _data );

                    if( Y.config.debug ) {
                        Y.log( 'valdiate condition paramContext ' + JSON.stringify( paramContext ), 'info', NAME );
                    }

                    if( paramContext && Array.isArray( value.conditions ) && !validateConditions( value.conditions, paramContext ) ) {
                        ok = false;
                    } else {
                        ok = Boolean( paramContext );
                    }

                    Y.log( 'validation check is ' + ok + ' ' + arrMethod + ' ' + existence, 'info', NAME );

                    return existence ? ok : !ok;
                } );
            }

            function validateConditions( conds, _data ) {
                return conds.every( function( cond ) {
                    var isValidCond = validateCondition( cond, _data );
                    return isValidCond;
                } );
            }

            function validateRule( rule ) {

                var allConditionsValid, allValidationsValid;

                Y.log( 'Validate rule' + ' ' + rule.id, 'info', NAME );

                if( !checkvalidityRange( rule.validityRange ) ) {
                    Y.log( rule.id, rule.text, 'validityRange not valid', 'error', NAME );
                    return;
                }

                if( !Array.isArray( rule.conditions ) ) {
                    callback( new KRWValidatorError( '6004', 'Missing Conditions for rule ' + rule.id + ' - ' + rule.text ) );
                    return;
                }

                if( isRealtime && !rule.realtime ) {
                    Y.log( 'Skip non realtime rule', 'info', NAME );
                    return;
                }

                result.rulesTested++;

                Y.log( 'Validate conditions', 'info', NAME );

                // if conditions are not fulfilled do nothing
                allConditionsValid = validateConditions( rule.conditions, data );
                if( !allConditionsValid ) {
                    Y.log( 'Conditions not fulfilled', 'info', NAME );
                    return;
                }

                Y.log( 'Conditions fulfilled', 'info', NAME );

                if( Array.isArray( rule.validations ) && rule.validations.length ) {
                    Y.log( 'Validate validations' );
                    allValidationsValid = validateConditions( rule.validations, data );
                    if( !allValidationsValid ) {
                        Y.log( 'Validations failed', 'info', NAME );
                        return;
                    }
                    Y.log( 'Validations ok', 'info', NAME );
                } else {
                    Y.log( 'No validations found', 'info', NAME );
                }

                if( rule.error ) {
                    result.errors.push( rule.error );
                }
            }

            if( !krw || !data ) {
                Y.log( 'Wrong Paramters', 'info', NAME );
                callback( new KRWValidatorError( '6000', 'Wrong Paramters' ) );
                return;
            }
            if( !checkvalidityRange( krw.validityRange ) ) {
                Y.log( 'Outdated KRW', 'info', NAME );
                callback( new KRWValidatorError( '6001', 'KRW Outdated' ) );
                return;
            }

            krw.rules.forEach( validateRule );
            callback( null, result );
            return result;
        };

        Y.namespace( 'doccirrus' ).KRWValidator = KRWValidator;

    },
    '0.0.1', {requires: []}
);
