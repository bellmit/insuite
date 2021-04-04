/**
 * User: rrrw
 * Date: 18.12.13  09:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
'use strict';

/*global YUI, _ */
YUI.add( 'dcquery', function( Y, NAME ) {

        var
            moment = Y.doccirrus.commonutils.getMoment(),
            ObjectAssign =  Y.doccirrus.commonutils.isClientSide() ? _.assign : Object.assign;
        /**
         * Query construction logic
         *
         * DC Query language is strongly modelled on the MongoDb language, but is adapted to transmission
         * via URL encoded type strings.  See constructor for example of DC Query Url.
         *
         * @class DCQuery
         */

        /**
         * Initialise a DC query builder and converter.
         *
         * For JSON RPC:
         *
         * Build RPC compatible Objects, and translate them to MongoDB queries.
         *
         * Client-side:
         * dcQuery.makeIregexOp( stringValue );
         *
         * Server-side:
         * dcQuery = new DCQuery( queryObject );
         * dcQuery.checkOperators();
         *
         *
         * Backward Compatibility:
         *
         * If the parameter is a string, it should look like the following:
         *
         *  a = new DCQuery('abc_gt,1,def,99,vellohello_lte,blub');
         *
         *  The result of the conversion will be:
         *
         *  { abc: { '$gt': '1' },
         *      def: '99',
         *      vellohello: { '$lte': 'blub' }
         *  }
         *
         *  FUTURE: you can go from a query object to a string.
         *
         * @param query string form of a mongoDb query, or object form
         * @constructor
         */
        function DCQuery( query ) {
            if( 'string' === typeof query ) {
                this.queryStr = query;
            } else {
                this.queryObj = query;
            }
        }

        /**
         * @const KBVDOB_OPERATOR
         * @type String
         */
        DCQuery.KBVDOB_OPERATOR = 'dckbvdob';
        /**
         * @const QUARTER_YEAR
         * @type String
         */
        DCQuery.QUARTER_YEAR = 'dcQuarterYear';
        /**
         * @const IREGEX_OPERATOR
         * @type String
         */
        DCQuery.IREGEX_OPERATOR = 'iregex';
        /**
         * @const NOT_IREGEX_OPERATOR
         * @type String
         */
        DCQuery.NOT_IREGEX_OPERATOR = 'notiregex';
        /**
         * @const REGEX_OPERATOR
         * @type String
         */
        DCQuery.REGEX_OPERATOR = 'regex';
        /**
         * @const IN_OPERATOR
         * @type String
         */
        DCQuery.IN_OPERATOR = 'in';
        /**
         * @const NIN_OPERATOR
         * @type String
         */
        DCQuery.NIN_OPERATOR = 'nin';
        /**
         * @const ENUM_OPERATOR
         * @type String
         */
        DCQuery.ENUM_OPERATOR = 'enum';
        /**
         * @const ENUM_ACTTYPE_OPERATOR
         * @type String
         */
        DCQuery.ENUM_ACTTYPE_OPERATOR = 'actTypeEnum';
        /**
         * @const GT_OPERATOR
         * @type String
         */
        DCQuery.GT_OPERATOR = 'gt';
        /**
         * @const LT_OPERATOR
         * @type String
         */
        DCQuery.LT_OPERATOR = 'lt';
        /**
         * @const EQ_OPERATOR
         * @type String
         */
        DCQuery.EQ_OPERATOR = 'eq';
        /**
         * @const EQ_OPERATOR_FOR_NUMBER
         * @type String
         */
        DCQuery.EQ_OPERATOR_FOR_NUMBER = 'eqNumber';
        /**
         * @const EQ_BOOL_OPERATOR
         * @type String
         */
        DCQuery.EQ_BOOL_OPERATOR = 'bool_eq';
        /**
         * @const EQDATE_OPERATOR
         * @type String
         */
        DCQuery.EQDATE_OPERATOR = 'eqDate';
        /**
         * @const GTE_OPERATOR
         * @type String
         */
        DCQuery.GTE_OPERATOR = 'gte';
        /**
         * @const LTE_OPERATOR
         * @type String
         */
        DCQuery.LTE_OPERATOR = 'lte';
        /**
         * @const VALID_OPERATORS
         * @type Array of operator strings
         */
        DCQuery.VALID_OPERATORS = [
            DCQuery.GT_OPERATOR, 'lt', 'ne',
            DCQuery.GTE_OPERATOR, 'lte',
            DCQuery.EQ_OPERATOR, 'like',
            DCQuery.REGEX_OPERATOR,
            DCQuery.IREGEX_OPERATOR,
            DCQuery.NOT_IREGEX_OPERATOR
        ];
        /**
         * @const MONGODB_OP_PREFIX
         * @type String
         */
        DCQuery.MONGODB_OP_PREFIX = '$';
        /**
         * @const OP_SEPARATOR
         * @type String
         */
        DCQuery.OP_SEPARATOR = '_';
        /**
         * @const ARRAY_SEPARATOR
         * @type String
         */
        DCQuery.ARRAY_SEPARATOR = '+';
        /**
         * @const CURRENT_Q_VALUE
         * @type String
         */
        DCQuery.CURRENT_Q_VALUE = 'CURRENT_Q';
        /**
         * @const DATE_GTE_OPERATOR
         * @type String
         */
        DCQuery.DATE_GTE_OPERATOR = 'dateGte';
        /**
         * @const DATE_LT_OPERATOR
         * @type String
         */
        DCQuery.DATE_LT_OPERATOR = 'dateLt';
        /**
         * @const DATE_RANGE_OPERATOR
         * @type String
         */
        DCQuery.DATE_RANGE_OPERATOR = 'dateRange';
        /**
         * @const DATE_RANGE_OPERATOR
         * @type String
         */
        DCQuery.DATE_RANGE_TIME_INSIGHT_OPERATOR = 'dateRangeTimeInsight';
        /**
         * @const IREGEX_ENUM_OPERATOR
         * @type String
         */
        DCQuery.IREGEX_ENUM_OPERATOR = 'iRegexEnum';
        /**
         * @const MONGO_IREGEX
         * @type String
         */
        DCQuery.MONGO_IREGEX = '$regex';
        /**
         * @const MONGO_REGEX_OPTIONS
         * @type String
         */
        DCQuery.MONGO_REGEX_OPTIONS = '$options';
        /**
         * @const CATALOG_EXTENSION_OPERATOR
         * @type String
         */
        DCQuery.CATALOG_EXTENSION_OPERATOR = 'catalogExtension';

        /**
         * Types which have a negative version, eg $in <--> $nin, EXTMOJ-2148
         * @const INVERTABLE_FILTER_TYPES
         * @type Array
         */

        DCQuery.INVERTABLE_FILTER_TYPES = [ DCQuery.IREGEX_OPERATOR, DCQuery.MONGO_IREGEX, DCQuery.ENUM_OPERATOR ];

        /**
         * Types which have additional versions for text search, EXTMOJ-1794
         * @const INVERTABLE_FILTER_TYPES
         * @type Array
         */

        DCQuery.TEXT_FILTER_TYPES = [ DCQuery.IREGEX_OPERATOR, DCQuery.MONGO_IREGEX ];

        /**
         * Given an array object creates a DC Query formatted string.
         * For use with e.g. $in operator.
         *
         * @param array
         * @returns {string}
         *
         */
        DCQuery.prototype.translateArrayToString = function( array ) {
            var
                retVal = '';
            if( Array.isArray( array ) ) {
                array.join( DCQuery.ARRAY_SEPARATOR );
            }
            return retVal;
        };
        /**
         * Translates a string value to potentially another kind of
         * object.
         *
         * For types that are defined in the schema and handled by mongoose, e.g. ObjectId,
         * Date, etc. there is no need to change from String. Certain search types expect
         * more complex objects. For now this includes only regex variations. For these
         * the correct mongodb val is generated.
         *
         * @method translateValForOp
         * @param operator {String}
         * @param value {String}
         * @return * String value or RegExp for value
         */
        DCQuery.prototype.translateValForOp = function( operator, value ) {
            var
                retVal = value;

            switch( operator ) {
                case DCQuery.REGEX_OPERATOR:
                    retVal = new RegExp( value );
                    retVal.toJSON = retVal.toString;
                    break;
                case DCQuery.IREGEX_OPERATOR:
                    retVal = new RegExp( value, 'i' );
                    retVal.toJSON = retVal.toString;
                    break;

                case DCQuery.NOT_IREGEX_OPERATOR:
                    if ( 'string' === typeof value ) {
                        retVal = new RegExp( value, 'i' );
                        retVal.toJSON = retVal.toString;
                    }
                    break;

                case DCQuery.NIN_OPERATOR:          //  deliberate fallthrough
                case DCQuery.IN_OPERATOR:
                    retVal = value.split( DCQuery.ARRAY_SEPARATOR );
            }
            return retVal;
        };

        /**
         *  Returns the mongoDb operator to use for this DC operator.
         *
         * @param operator {String} DC operator
         * @returns {*}
         */
        DCQuery.prototype.translateOp = function( operator ) {
            if( DCQuery.IREGEX_OPERATOR === operator ) {
                return DCQuery.REGEX_OPERATOR;
            }
            return operator;
        };
        /**
         * @method getQueryAsObj
         * @return the query string as an MongoDB query object.
         */
        DCQuery.prototype.getQueryAsObj = function() {
            var
                self = this,
                oquery = {},
                arrquery,
                i, j;

            // if we already have a truthy obj then return it
            if( this.queryObj ) {
                return this.queryObj;
            }

            arrquery = this.queryStr.split( ',' );

            function addParamsPair( key, val ) {
                var
                    tmp,
                    op;

                if( key.indexOf( '[]' ) > -1 ) {

                    var translateOp; //eslint-disable-line
                    var _keyToArray, //eslint-disable-line
                        _keyString,
                        _field,
                        _newQuery = {},
                        _valuesList,
                        keyPrefix = '';

                    _keyString = key.slice( 0, key.length - 2 );

                    if( 0 === _keyString.indexOf( '_' ) ) {
                        keyPrefix = '_';
                        _keyString = _keyString.substr( 1 );
                    }

                    _keyToArray = _keyString.split( '_' );

                    _keyToArray[0] = [keyPrefix, _keyToArray[0]].join( '' );

                    translateOp = DCQuery.MONGODB_OP_PREFIX + (_keyToArray[1] || DCQuery.IN_OPERATOR);
                    _field = _keyToArray[0];

                    _valuesList = val.split( '_' );

                    _newQuery[_field] = {};
                    _newQuery[_field][translateOp] = null;
                    _newQuery[_field][translateOp] = _valuesList;

                    oquery[_field] = _newQuery[_field];

                } else {
                    // parse the key string, don't use regex, this is faster
                    j = key.lastIndexOf( DCQuery.OP_SEPARATOR );
                    if( -1 !== j ) {
                        op = key.substring( j + 1 );
                        if( -1 !== DCQuery.VALID_OPERATORS.indexOf( op ) ) {
                            // in the valid list
                            tmp = {};
                            tmp[DCQuery.MONGODB_OP_PREFIX + self.translateOp( op )] = self.translateValForOp( op, val );
                            // set the new values of key and val
                            val = tmp;
                            key = key.substr( 0, j );
                        } else {
                            Y.log( 'strange field name with underscore: ' + key, 'warn', NAME );
                            // try use the non-standard key as a field name anyway.
                            // could also discard it:
                            // key = key.substr(0,j-1);
                        }
                    }

                    // $lt(e) and $gt(e) queries share one key so merge them
                    if( oquery[key] && typeof oquery[key] === 'object' ) {
                        ObjectAssign( oquery[key], val );
                    } else {
                        oquery[key] = val;
                    }
                }

            }

            // go through the query list and ignore the last odd parameter.
            // push pairs of parameters into the query object.
            for( i = 0; i < Math.floor( arrquery.length / 2 ); i++ ) {
                addParamsPair( arrquery[i * 2], decodeURIComponent( arrquery[(i * 2) + 1] ) );
            }
            //if( Y.config.debug ) {
            //Y.log( 'Translated ' + query + ' / ' + JSON.stringify( oquery ), 'info', NAME );
            //}

            return oquery;
        };

        /**
         * Mutates the DCQuery so that it:
         *
         * 1) can contain valid case insensitive regex operators
         * 2) TODO: is safe / prevents DB DOS/ Injection attacks
         *
         * Backward compatible, so if the query is being
         * transported as a string the check will not be
         * carried out (but it could be, with:
         * 1. getQueryAsObj() 2. checkOperators()).
         *
         */
        DCQuery.prototype.checkOperators = function( keepDateType ) {
            var
                o = this.queryObj,
                $or = [],
                matches,
                quarterRange,
                quarterListMom,
                date,
                dateStr,
                tmpDateStr,
                key,
                item;

            for( key in o ) {
                if( o.hasOwnProperty( key ) ) {
                    item = o[key];

                    // concept check implementation, just for iregex and date
                    if( item && item[DCQuery.IREGEX_OPERATOR] ) {
                        item.$regex = this.translateValForOp(DCQuery.IREGEX_OPERATOR, item[DCQuery.IREGEX_OPERATOR]);
                        delete item[DCQuery.IREGEX_OPERATOR];
                    } else if( item && item[DCQuery.NOT_IREGEX_OPERATOR] ) {
                        item.$not = this.translateValForOp(DCQuery.NOT_IREGEX_OPERATOR, item[DCQuery.NOT_IREGEX_OPERATOR]);
                        delete item[DCQuery.NOT_IREGEX_OPERATOR];
                    } else if( item && item[DCQuery.KBVDOB_OPERATOR] ) {
                        dateStr = item[DCQuery.KBVDOB_OPERATOR];
                        // KBVDOB operator
                        if( dateStr ) {

                            // match year
                            date = moment( dateStr, 'YYYY', true ); // be strict
                            if( date.isValid() ) {
                                // here we have to do more work...
                                item.$gte = date;
                                item.$lt = date.add( 1, 'y' );
                                delete item[DCQuery.KBVDOB_OPERATOR];
                            } else {

                                // match other dates
                                date = moment( dateStr, 'DD.MM.YYYY', true ); // be strict
                                if( date.isValid() ) {
                                    item.$gte = date;
                                    item.$lt = moment( date ).add( 1, 'd' );
                                    delete item[DCQuery.KBVDOB_OPERATOR];
                                } else {

                                    // match partial dates
                                    date = moment( dateStr, 'MM.YYYY', true ); // be strict
                                    if( date.isValid() ) {
                                        item.$gte = date;
                                        item.$lt = moment( date ).add( 1, 'M' );
                                        delete item[DCQuery.KBVDOB_OPERATOR];
                                    } else {
                                        if( 6 === dateStr.length && '.' === dateStr[5] ) {
                                            tmpDateStr = dateStr.substr( 0, 5 );
                                        }
                                        // match partial dates
                                        date = moment( tmpDateStr, 'DD.MM', true ); // be strict
                                        if( date.isValid() ) {
                                            item.$gte = date;
                                            item.$lt = moment( date ).add( 1, 'd' );
                                            delete item[DCQuery.KBVDOB_OPERATOR];
                                        } else {
                                            // no match, remove the date field
                                            delete o[key];
                                        }
                                    }
                                }
                            }
                            if( !keepDateType ) {
                                if( item.$gte ) {
                                    item.$gte = item.$gte.toJSON();
                                }
                                if( item.$lt ) {
                                    item.$lt = item.$lt.toJSON();
                                }
                            } else {
                                if( item.$gte ) {
                                    item.$gte = item.$gte.toDate();
                                }
                                if( item.$lt ) {
                                    item.$lt = item.$lt.toDate();
                                }
                            }
                        }
                    }
                    else
                    // QUARTER_YEAR operator: can be string or array of string in the format of "Qn YYYY"/CURRENT_Q_VALUE
                    // for array the "$or" operand have to be touched
                    if( item && item[DCQuery.QUARTER_YEAR] ) {
                        dateStr = item[DCQuery.QUARTER_YEAR];

                        switch( Y.Lang.type( dateStr ) ) {
                            case'string':
                                matches = dateStr.match( /^Q([1-4]) (\d{4})$/i );
                                if( matches ) {
                                    quarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( parseInt( matches[1], 10 ), matches[2] );
                                    item.$gte = quarterRange.start;
                                    item.$lt = quarterRange.end;
                                }
                                else if( DCQuery.CURRENT_Q_VALUE === dateStr ) {
                                    quarterListMom = quarterListMom || moment();
                                    quarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( quarterListMom.get( 'quarter' ), quarterListMom.get( 'year' ) );
                                    item.$gte = quarterRange.start;
                                    item.$lt = quarterRange.end;
                                }
                                else {
                                    item.$eq = 0;
                                }
                                break;
                            case'array':
                                /* jshint ignore:start */
                                dateStr.forEach( function( dateStr ) { //eslint-disable-line
                                    var orObj;

                                    if( !Y.Lang.isString( dateStr ) ) {
                                        return;
                                    }

                                    matches = dateStr.match( /^Q([1-4]) (\d{4})$/i );
                                    orObj = {};
                                    if( matches ) {
                                        quarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( parseInt( matches[1], 10 ), matches[2] );
                                        orObj[key] = {
                                            $gte: quarterRange.start,
                                            $lt: quarterRange.end
                                        };
                                    }
                                    else if( DCQuery.CURRENT_Q_VALUE === dateStr ) {
                                        quarterListMom = quarterListMom || moment();
                                        quarterRange = Y.doccirrus.commonutils.getDateRangeByQuarter( quarterListMom.get( 'quarter' ), quarterListMom.get( 'year' ) );
                                        orObj[key] = {
                                            $gte: quarterRange.start,
                                            $lt: quarterRange.end
                                        };
                                    }
                                    else {
                                        orObj[key] = {
                                            $eq: 0
                                        };
                                    }
                                    $or.push( orObj );
                                } );
                                /* jshint ignore:end */
                                delete o[key];
                                break;
                        }

                        delete item[DCQuery.QUARTER_YEAR];
                    }
                }
            }

            // fill the "$or" operand with collected "$or" entries
            if( $or.length ) {
                if( !o.$or ) {
                    o.$or = [];
                }
                o.$or.push.apply( o.$or, $or );
            }

        };

        /**
         * Make an IREGEX type query object out of a given value.
         * A static function on the DCQuery class object
         *
         * @param stringValue {String} the query the user typed
         * @return {Object} query object
         */
        DCQuery.makeIregexOp = function( stringValue ) {
            var result = {};
            result[DCQuery.IREGEX_OPERATOR] = Y.doccirrus.commonutils.$regexLikeUmlaut( stringValue, { onlyRegExp: true } );
            return result;
        };

        /**
         * Make an IREGEX type query object out of a given value, matches must begin with the stringValue
         * A static function on the DCQuery class object
         *
         * @param stringValue {String} the query the user typed
         * @return {Object} query object
         */
        DCQuery.makeIregexOpBegins = function( stringValue ) {
            var
                result = {};

            result[DCQuery.IREGEX_OPERATOR] = '^' + Y.doccirrus.commonutils.$regexLikeUmlaut( stringValue, { onlyRegExp: true } );
            return result;
        };

        /**
         * Make an IREGEX type query object out of a given value, matches must end in the stringValue
         * A static function on the DCQuery class object
         *
         * @param stringValue {String} the query the user typed
         * @return {Object} query object
         */
        DCQuery.makeIregexOpEnds = function( stringValue ) {
            var result = {};
            result[DCQuery.IREGEX_OPERATOR] = Y.doccirrus.commonutils.$regexLikeUmlaut( stringValue, { onlyRegExp: true } ) + '$';
            return result;
        };

        /**
         * Makes an IREGEX type query object out of a given value.
         * Can be passed to mongo query directly without changes.
         * Can be stringified.
         *
         * @param stringValue {String} the query the user typed
         * @return {Object} query object
         */
        DCQuery.makeMongoIregexOp = function( stringValue ) {
            var result = {};
            result[DCQuery.MONGO_IREGEX] = Y.doccirrus.commonutils.$regexLikeUmlaut( stringValue, { onlyRegExp: true } );
            result[DCQuery.MONGO_REGEX_OPTIONS] = 'i';
            return result;
        };

        /**
         * Make an KBVDOB type query object out of a given value.
         * A static function on the DCQuery class object
         *
         * @param stringValue {String} the query the user typed
         * @return {Object} query object
         */
        DCQuery.makeKBVDobOp = function( stringValue ) {
            var result = {};
            result[DCQuery.KBVDOB_OPERATOR] = stringValue;
            return result;
        };

        /**
         * Make an QUARTER_YEAR type query object out of a given value.
         * A static function on the DCQuery class object
         *
         * @param stringValue {String} the query the user typed
         * @return {Object} query object
         */
        DCQuery.makeQuarterYearOp = function( stringValue ) {
            var result = {};
            result[DCQuery.QUARTER_YEAR] = stringValue;
            return result;
        };

        /**
         * Make an REGEX type query object out of a given value.
         * Can use index, very fast, matches at the beginning of
         * a value.
         *
         * A static function on the DCQuery class object
         *
         * @param stringValue {String} the query the user typed
         * @return {Object} query object
         */
        DCQuery.makeRegexOp = function( stringValue ) {
            var result = {};
            result[DCQuery.MONGODB_OP_PREFIX + DCQuery.REGEX_OPERATOR] = '^' + Y.doccirrus.commonutils.$regexLikeUmlaut( stringValue, { onlyRegExp: true } );
            return result;
        };

        /**
         * Make an EQ type query object out of a given value.
         * Can use index, very fast, matches at the beginning of
         * a value.
         *
         * A static function on the DCQuery class object
         *
         * @param stringValue {String} the query the user typed
         * @return {Object} query object
         */
        DCQuery.makeEqOp = function( stringValue ) {
            var result = {};
            result[DCQuery.MONGODB_OP_PREFIX + DCQuery.EQ_OPERATOR] = stringValue;
            return result;
        };

        DCQuery.makeEqBoolOp = function( stringValue ) {
            var result = {};
            result[DCQuery.MONGODB_OP_PREFIX + DCQuery.EQ_OPERATOR] = 'true' === stringValue;
            return result;
        };

        DCQuery.makeEqDateOp = function( stringValue ) {
            var result = {},
                date = moment( stringValue );

            date.add( 1, 'd' );

            result[DCQuery.MONGODB_OP_PREFIX + DCQuery.DATE_GTE_OPERATOR] = stringValue;
            result[DCQuery.MONGODB_OP_PREFIX + DCQuery.DATE_LT_OPERATOR] = date.toISOString();

            return result;
        };

        DCQuery.makeDateRangeOp = function( value ) {

            var result = {},
                dateStart = value.date1,
                dateEnd = value.date2;

            result[DCQuery.MONGODB_OP_PREFIX + DCQuery.GTE_OPERATOR] = moment( dateStart ).startOf( 'day' ).toDate();
            result[DCQuery.MONGODB_OP_PREFIX + DCQuery.LTE_OPERATOR] = moment( dateEnd ).endOf( 'day' ).toDate();

            return result;
        };

        DCQuery.makeDateRangeTimeInsightOp = function( value ) {

            var result = {},
                dateStart = value.date1,
                dateEnd = value.date2;

            result[DCQuery.MONGODB_OP_PREFIX + DCQuery.DATE_GTE_OPERATOR] = moment(dateStart).toISOString();
            result[DCQuery.MONGODB_OP_PREFIX + DCQuery.DATE_LT_OPERATOR] = moment(dateEnd).toISOString();

            return result;
        };

        /**
         * Make an GreaterThan type query object out of a given value.
         * Expects a numeric value.
         *
         * A static function on the DCQuery class object
         *
         * @param numValue {Number} the query the user typed
         * @param optionalCode {String} Can optionally add one of the following
         *                             codes to vary the default gt operator:
         *                             lt, lte, gte, eq, ne.
         * @return {Object} query object
         */
        DCQuery.makeGtOrLtOp = function( numValue, optionalCode ) {
            var result = {},
                code = DCQuery.GT_OPERATOR;
            if( optionalCode && -1 < DCQuery.VALID_OPERATORS.indexOf( optionalCode ) ) {
                code = optionalCode;
            }
            result[DCQuery.MONGODB_OP_PREFIX + code] = numValue;
            return result;
        };

        /**
         * Make an ENUM type query object out of a given value (can also be an array).
         * Meant to be used with a multi-select, which returns the actual enum (lang
         * neutral) values.
         *
         * A static function on the DCQuery class object
         *
         * @param stringOrArrayValue {String|Array} an array of enums or a single enum (string)
         * @return {Object} query object
         */
        DCQuery.makeEnumOp = function( stringOrArrayValue ) {
            var result = {};
            if( !stringOrArrayValue ) {
                return;
            }
            // do some type juggling to ensure that we end up with an array.
            if( !Array.isArray( stringOrArrayValue ) ) {
                if( 'string' !== typeof stringOrArrayValue ) {
                    stringOrArrayValue = JSON.stringify( stringOrArrayValue );
                }
                stringOrArrayValue = [stringOrArrayValue];
            }
            // set the query = to the array.
            result[DCQuery.MONGODB_OP_PREFIX + DCQuery.IN_OPERATOR] = stringOrArrayValue;
            return result;
        };

        /**
         * Make an inverted ENUM type query object out of a given value (can also be an array).
         * Meant to be used with a multi-select, which returns the actual enum (lang
         * neutral) values.
         *
         * This is the inverse of makeEnumOp above for select-not queries, EXTMOJ-2148
         *
         * A static function on the DCQuery class object
         *
         * @param stringOrArrayValue {String|Array} an array of enums or a single enum (string)
         * @return {Object} query object
         */
        DCQuery.makeNotEnumOp = function( stringOrArrayValue ) {
            var result = {};
            if( !stringOrArrayValue ) {
                return;
            }
            // do some type juggling to ensure that we end up with an array.
            if( !Array.isArray( stringOrArrayValue ) ) {
                if( 'string' !== typeof stringOrArrayValue ) {
                    stringOrArrayValue = JSON.stringify( stringOrArrayValue );
                }
                stringOrArrayValue = [stringOrArrayValue];
            }
            // set the query = to the array.
            result[DCQuery.MONGODB_OP_PREFIX + DCQuery.NIN_OPERATOR] = stringOrArrayValue;
            return result;
        };

        /**
         *  Allow to search activities with related one together
         * @param {String|Array} actTypeValues  an array of enums or a single enum (string)
         * @return {Object} query object
         */
        DCQuery.makeActTypeEnumOp = function( actTypeValues ) {
            var
                result = DCQuery.makeEnumOp( actTypeValues ),
                foundActType_E,
                related = [];


            if( result && result.$in ) {
                result.$in.forEach( function( actType ) {
                    foundActType_E = Y.doccirrus.schemas.activity.types.Activity_E.list.find( function( actTypeSchema ) {
                        return actTypeSchema.val === actType;
                    } );
                    if( foundActType_E && foundActType_E.searchWith && foundActType_E.searchWith.length ) {
                        related = foundActType_E.searchWith;
                    }
                    result.$in = result.$in.concat( related );
                } );
            }
            return result;
        };

        /**
         *
         * Create regex or query from array
         * ['a', 'b', 'c'] -> {'$regex': 'a|b|c'}
         *
         * @param {String|Array} stringOrArrayValue an array of enums or a single enum (string)
         * @return {Object} query object
         */
        DCQuery.makeIregexEnumOp = function( stringOrArrayValue ) {
            var result = {};

            if( !stringOrArrayValue ) {
                return;
            }
            // do some type juggling to ensure that we end up with an array.
            if( !Array.isArray( stringOrArrayValue ) ) {
                if( 'string' !== typeof stringOrArrayValue ) {
                    stringOrArrayValue = JSON.stringify( stringOrArrayValue );
                }
                stringOrArrayValue = [DCQuery.makeIregexOp( stringOrArrayValue )];
            }

            result = {
                $regex: stringOrArrayValue.map( Y.doccirrus.commonutils.$regexEscape ).join( '|' ), $options: 'i'
            };

            return result;
        };

        /**
         * This query is used for catalog extensions:
         * - if the value is true, it looks for that value
         * - if the value is false, it looks for that value, a null value or an inexistant entry
         *
         * @param {String} value | 'true' or 'false'
         * @return {Object} Query object
         */
        DCQuery.makeCatalogExtensionOperator = function( value ) {
            return value === 'true' ? {$eq: true} : {$in: [null, false]};
        };

        Y.namespace( 'doccirrus' ).DCQuery = DCQuery;

    },
    '0.0.1', {
        requires: [
            'dccommonutils',
            'escape'
        ]
    }
);
