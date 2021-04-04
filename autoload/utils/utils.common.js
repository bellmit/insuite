/**
 * User: rrrw
 * Date: 12.02.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, YUI_config, moment, ko, async, _, math, MathJax, require */

'use strict';

YUI.add( 'dccommonutils', function( Y, NAME ) {

/**
 * This is a library of useful DC methods that are available throughout mojito.
 *
 * I.e. for the browser and server.
 *
 * Uses the YUI namespace.
 * @module dccommonutils
 * @requires dcerrortable, dccommonerrors
 */

        /**
         * namespace `doccirrus.commonutils`
         * @class doccirrus.commonutils
         */
        /**
         * @property commonutils
         * @for doccirrus
         * @type {doccirrus.commonutils}
         */

        /**
         * check environment
         * @return {boolean}
         */
        function isClientSide() {
            return Boolean( Y.config.win );
        }

        /**
         * Returns the moment function depending on environment
         * @return moment
         */
        function getMoment() {
            return isClientSide() ? moment : require( 'moment' );
        }

        function getAsync() {
            return isClientSide() ? async : require( 'async' );
        }

        function getLodash() {
            return isClientSide() ? ( 'undefined' === typeof _ ? {} : _ ) : require( 'lodash' );
        }

        /**
         * Returns the mathjs lib depending on environment
         * @return math
         */
        function getMathJs() {
            return isClientSide() ? math : require( 'mathjs' );
        }

        /**
         * Returns the MathJax lib depending on environment
         * @return MathJax
         */
        function getMathJax() {
            return isClientSide() ? MathJax : require( 'mathjax' );
        }

        var
            // client and server side momentjs-library resolution
            mom = getMoment(),
            ldsh = getLodash(),
            // this is the singleton Utils Object for the application
            // at the moment offers static functions
            myUtils,
            ObjectAssign =  isClientSide() ? _.assign : Object.assign;
        function syncEmpty( first, second){
            if('undefined' === typeof first) {
                if( Array.isArray( second ) ) {
                    first = [];
                } else if( 'object' === typeof second && second !== null) {
                    first = {};
                }
            }
            return [first, second];
        }

        function isDiffValueExist( value ) {
            return (true === value || false === value) ||
                   value !== '' &&
                   typeof value !== 'undefined' &&
                   value !== null &&
                   Object.keys( value ).length !== 0 && !Array.isArray( value ) ||
                   (Array.isArray( value ) && value.length !== 0);
        }

        function getTranslation(schema, path){
            var pathArray = path.split('.'),
                curSchema = schema,
                type,
                subSchemaObj,
                translatedPath = pathArray.map(function(el){
                    if(/^[0-9]+$/.test(el)){
                        return el.toString();
                    }
                    subSchemaObj = curSchema && curSchema.type || curSchema[0] && curSchema[0].type || {};
                    if( pathArray[0] === 'insuranceStatus' && (subSchemaObj.enum || []).includes(el)){
                        type = (subSchemaObj.list || []).find( function(insuranceType){ return insuranceType.val === el; });
                        if( type ){
                            return type.i18n || el;
                        }
                    }
                    curSchema = curSchema[el] || curSchema[0] && curSchema[0][el] || curSchema;
                    return curSchema.i18n || el;
                });
            return translatedPath.join('.');
        }

        function processDiff(area, rows, schema, path, wasOrg, isOrg){
            var synced = syncEmpty(wasOrg, isOrg), i, keys;
            wasOrg = synced[0];
            isOrg = synced[1];
            synced = syncEmpty(isOrg, wasOrg);
            isOrg = synced[0];
            wasOrg = synced[1];

            var was = ( "undefined" !== typeof wasOrg ) ? JSON.parse(JSON.stringify(wasOrg)) : wasOrg,
                is =  ( "undefined" !== typeof isOrg ) ? JSON.parse(JSON.stringify(isOrg)) : isOrg;

            if( Array.isArray(was) || Array.isArray(is) ){
                for(i = 0; i <= Math.max(was.length, is.length); i++ ){
                    rows = processDiff(area, rows, schema, path + '.' + i.toString(), was[i], is[i]);
                }
            } else if(('object' === typeof was && was !== null) || ('object' === typeof is && is !== null) ){
                keys = ldsh.uniq( (Object.keys(was) || []).concat(Object.keys(is) || []) );
                keys.forEach( function(key){
                    if( key === '_v' || key === '_id' ) {
                        return;
                    }
                    rows = processDiff(area, rows, schema, path+'.'+key, was[key], is[key]);
                } );
            } else {
                if( was !== is && ( isDiffValueExist( was ) || isDiffValueExist( is ) ) ){
                    rows.push({
                        area: area,
                        type: (!was) ? 'added' : (!is) ? 'deleted' : 'changed',
                        pathOrg: path,
                        path: getTranslation(schema, path),
                        diff: {
                            oldValue: was,
                            newValue: is
                        }
                    } );
                }
            }
            return rows;
        }

        /**
         * Convert array of insuranceStatus into object where keys are insurance type.
         * NOTE: suppose that exist only one insurance per type
         *
         * @method processInsuranceStatus
         * @public
         *
         * @param {Array} insurances
         * @param {Boolean} ekgData - depending on it return either whole insurance object without _id and cardSwipe or
         *                            just object that contain cardSwipe
         * @param {String} keep     - modificator that point to keep fields that are otherwise omited
         *                              none                default: omit cardSwipe, locationId, employeeId
         *                              all                 cardSwipe, locationId, employeeId
         *                              location&employee   locationId, employeeId
         * @returns {Object}        - object with insurance data
         */
        function processInsuranceStatus(insurances, egkData, keep){
            var obj = {},
                whatToKeep = keep || 'none',
                omitArr = ['cardSwipe', '_id'];

            //rename path with index for better comparison
            (insurances || []).forEach( function( el ){
                if( !obj[el.type] ){
                    if( whatToKeep === 'all' ){
                        obj[el.type] = el;
                    } else if( egkData === true ){
                        if( el.cardSwipe ){
                            obj[el.type] = { cardSwipe: el.cardSwipe };
                        }
                    } else {
                        if( whatToKeep !== 'location&employee' ){
                            omitArr = [].concat(omitArr, ['employeeId', 'locationId']);
                        }
                        obj[el.type] = ldsh.omit( el, omitArr );
                    }
                } else {
                    Y.log( 'comparePatients: multiply type found in ' + JSON.stringify(insurances), 'warn', NAME );
                }
            });
            return obj;
        }

        function comparePatients(patientWas, patientIs, propertiesToCheck){
            var data = {},
                toCheck = propertiesToCheck || { //default fieldse for transferring patients
                        baseData: [
                            'firstname', 'lastname', 'kbvDob', 'partnerIds', 'talk', 'title', 'nameaffix', 'fk3120',
                            'gender', 'dateOfDeath', 'jobTitle', 'workingAt', 'isPensioner', 'sendPatientReceipt',
                            'patientSince', 'dob_DD', 'dob_MM', 'communications', 'addresses',
                            'physicians', 'familyDoctor', 'institution', 'pseudonym', 'treatmentNeeds'
                        ],
                        careData: ['partnerIds'],
                        accountData: ['accounts'],
                        additionalData: [
                            'crmCatalogShort', 'crmTreatments', 'crmTags', 'crmAppointmentMonth', 'crmAppointmentRangeEnd',
                            'crmAppointmentRangeStart', 'crmAppointmentYear', 'crmComment', 'crmReminder'
                        ],
                        insuranceData: ['insuranceStatus'],
                        egkData: ['insuranceStatus']
                    };

            Object.keys(toCheck).forEach( function(area){
                (toCheck[area]).forEach( function(prop){
                    var schema = Y.doccirrus.schemas.patient && Y.doccirrus.schemas.patient.schema,
                        type = schema && schema[prop] && schema[prop].type && 'function' === typeof schema[prop].type.toLowerCase && schema[prop].type.toLowerCase(),
                        is = (( type && 'date' === type && patientWas[prop] ) ? mom(patientWas[prop]).toISOString() : patientWas[prop]),
                        nw = (( type && 'date' === type && patientIs[prop] ) ? mom(patientIs[prop]).toISOString() : patientIs[prop]),
                        keys;

                    if( 'partnerIds' === prop ){
                        is = (is || []).filter( function(el){
                            return ( 'baseData' === area ) ? el.extra : !el.extra;
                        }).sort();
                        nw = (nw || []).filter( function(el){
                            return ( 'baseData' === area ) ? el.extra : !el.extra;
                        }).sort();
                    }

                    if( 'insuranceStatus' === prop && 'insuranceData' === area ){
                        is = processInsuranceStatus( is, false );
                        nw = processInsuranceStatus( nw, false );

                        //if in resulted insurance insurance type will be deleted then skip this difference
                        keys = ldsh.uniq( Object.keys(is).concat(Object.keys(nw)) || []);
                        keys.forEach( function( key ){
                            if( is[key] && !nw[key] ){
                                delete is[key];
                            }
                        } );
                    }

                    if( 'insuranceStatus' === prop && 'egkData' === area ){
                        is = processInsuranceStatus( is, true );
                        nw = processInsuranceStatus( nw, true );
                    }

                    if( !(ldsh.isEqual(is, nw)) ){
                        data[area] = true;
                        if(!data.rows){ data.rows = []; }
                        data.rows = processDiff( area, data.rows, Y.doccirrus.schemas.patient && Y.doccirrus.schemas.patient.schema, prop, is, nw ); // jshint ignore:line
                    }
                });
            } );
            return data;
        }

        /**
         * Constructor for the module class.
         *
         * @class DCUtils
         * @private
         * @static
         */
        function DCCommonUtils() {
            // purely static object at the moment, nothing in the instances.
            this.insuranceTypeScheinTypeMapping = {
                PUBLIC: 'SCHEIN',
                PRIVATE: 'PKVSCHEIN',
                PUBLIC_A: 'SCHEIN',
                PRIVATE_A: 'PKVSCHEIN',
                PRIVATE_CH: 'PKVSCHEIN',
                PRIVATE_CH_MVG: 'PKVSCHEIN',
                PRIVATE_CH_IVG: 'PKVSCHEIN',
                PRIVATE_CH_UVG: 'PKVSCHEIN',
                PRIVATE_CH_VVG: 'PKVSCHEIN',
                BG: 'BGSCHEIN',
                SELFPAYER: 'PKVSCHEIN'
            };
        }

        /** @private */
        DCCommonUtils.prototype.init = function() {
            Y.log( 'Initializing common utils ', 'info', NAME );
        };


        /**
         * Static function returning the moment function depending on whether running on server
         * or client environment.
         *
         * @return moment
         */
        DCCommonUtils.prototype.getMoment = function() {
            return getMoment();
        };
        /**
         * Static function returning the moment function depending on whether running on server
         * or client environment.
         *
         * @return lodash
         */
        DCCommonUtils.prototype.getLodash = function() {
            return isClientSide() ? _ : require( 'lodash' );
        };

        /**
         * Static function returning the math lib depending on whether running on server
         * or client environment.
         *
         * @return math
         */
        DCCommonUtils.prototype.getMathJs = function() {
            return getMathJs();
        };

        /**
         * Static function returning the MathJax lib depending on whether running on server
         * or client environment.
         *
         * @return MathJax
         */
        DCCommonUtils.prototype.getMathJax = function() {
            return getMathJax();
        };

        /**
         * Static function returning the async object depending on whether running on server
         * or client environment.
         *
         * @return async
         */
        DCCommonUtils.prototype.getAsync = function() {
            return getAsync();
        };

        /**
         * check environment
         * @method isClientSide
         * @for doccirrus.commonutils
         * @return {boolean}
         */
        DCCommonUtils.prototype.isClientSide = isClientSide;

        /**
         * Get a property of an object via dot-delimited name string, and optionally create the property and any
         * ancestor properties that do not already exist. If dot-delimited syntax is not appropriate have a look at "Y.Object.getValue"
         * @method getObject
         * @for doccirrus.commonutils
         * @author Inspired by jQuery getObject - "Cowboy" Ben Alman.
         * @param {String|Array} parts Dot-delimited string representing a property name, for example: 'document', 'location.href', 'window.open' or 'foo.bar.baz'.
         * @param {Boolean} [create] Create final and intermediate properties if they don't exist. Defaults to false.
         * @param {Object} [obj] Optional context in which to evaluate name. Defaults to Y.config.global if omitted.
         * @returns {Y.config.global|*} An object reference or value on success, otherwise undefined.
         */
        DCCommonUtils.prototype.getObject = function( parts, create, obj ) {
            if( typeof parts === 'string' ) {
                parts = parts.split( '.' );
            }
            if( typeof create !== 'boolean' ) {
                obj = create;
                create = undefined;
            }

            //  Note that parts can be null in some circumstances due to timing issues with KoTable
            if ( null === parts ) {
                return null;
            }

            obj = obj || Y.config.global;
            var p;
            while( obj && parts.length ) {
                p = parts.shift();
                if( obj[p] === undefined && create ) {
                    obj[p] = {};
                }
                obj = obj[p];
            }
            return obj;
        };

        /**
         * Set a property of an object via dot-delimited name string, creating any ancestor properties that do not already exist.
         * @method setObject
         * @for doccirrus.commonutils
         * @author Inspired by jQuery getObject - "Cowboy" Ben Alman.
         * @param {String} name Dot-delimited string representing a property name, for example: 'document', 'location.href', 'window.open' or 'foo.bar.baz'.
         * @param {*} value Any valid JavaScript expression.
         * @param {Object} [context] Optional context in which to evaluate name. Defaults to Y.config.global if omitted.
         * @returns {*|undefined} The value if set successfully, otherwise undefined.
         */
        DCCommonUtils.prototype.setObject = function( name, value, context ) {
            var parts = name.split( '.' ),
                prop = parts.pop(),
                obj = Y.doccirrus.commonutils.getObject( parts, true, context );

            // Only return the value if it is set successfully.
            return obj && typeof obj === 'object' && prop ? ( obj[prop] = value ) : undefined; //eslint-disable-line no-return-assign
        };

        /**
         * Using dot-delimited name string, return whether a property of an object exists.
         * @method exists
         * @for doccirrus.commonutils
         * @author Inspired by jQuery getObject - "Cowboy" Ben Alman.
         * @param {String} name Dot-delimited string representing a property name, for example: 'document', 'location.href', 'window.open' or 'foo.bar.baz'.
         * @param {Object} [context] Optional context in which to evaluate name. Defaults to Y.config.global if omitted.
         * @returns {Boolean} Whether or not the property exists.
         */
        DCCommonUtils.prototype.exists = function( name, context ) {
            return Y.doccirrus.commonutils.getObject( name, context ) !== undefined;
        };

        /**
         * given a specName returns path or undefined
         * - in case of server-side the actionContext have to be provided
         * @method getUrl
         * @for doccirrus.utils
         * @param {String} specName
         * @param {String} [actionContext]
         * @returns {String|undefined}
         * @example
         * <pre>Y.doccirrus.utils.getUrl('inCaseMojit')</pre>
         */
        DCCommonUtils.prototype.getUrl = function dccommonutils_getUrl( specName, actionContext ) {
            var
                routes;

            if( isClientSide() ) {
                routes = Y.doccirrus.commonutils.getObject( 'config.doccirrus.Env.routes', Y ) || {};
            }
            else {
                routes = actionContext.params &&
                         actionContext.params.params &&
                    actionContext.params.params.route &&
                    actionContext.params.params.route.publicRoutes;
            }
            return routes[specName];
        };

        /**
         * This is a slightly modified 'Y.rbind' method, which if passed null for 'c' uses the original context
         *
         * Returns a function that will execute the supplied function in the
         * supplied object's context, optionally adding any additional
         * supplied parameters to the end of the arguments the function
         * is executed with.
         *
         * @method rbind
         * @param {Function|String} f the function to bind, or a function name
         * to execute on the context object.
         * @param {object} c the execution context. if this value is 'null' the original context is used
         * @param {any} args* 0..n arguments to append to the end of
         * arguments collection supplied to the function.
         * @return {function} the wrapped function.
         */
        DCCommonUtils.prototype.rbind = function( f, c ) {
            var xargs = arguments.length > 2 ? Y.Array( arguments, 2, true ) : null;
            return function() {
                c = Y.Lang.isNull( c ) ? this : c;
                var fn = Y.Lang.isString( f ) ? c[f] : f,
                    args = (xargs) ?
                        Y.Array( arguments, 0, true ).concat( xargs ) : arguments;
                return fn.apply( c || fn, args );
            };
        };

        /**
         * If available uses "ko.unwrap" else emulates it
         * @method unwrap
         * @for doccirrus.commonutils
         * @return {function}
         */
        DCCommonUtils.prototype.unwrap = function( observable ) {
            if( Y.doccirrus.commonutils.exists( 'ko.unwrap' ) ) {
                return ko.unwrap( observable );
            } else {
                return observable;
            }
        };

        /**
         * If available uses "ko.utils.peekObservable" else emulates it
         * @method peek
         * @for doccirrus.commonutils
         * @return {function}
         */
        DCCommonUtils.prototype.peek = function( observable ) {
            if( Y.doccirrus.commonutils.exists( 'ko.utils.peekObservable' ) ) {
                return ko.utils.peekObservable( observable );
            } else {
                return observable;
            }
        };

        /**
         * Returns an new array of objects filtered by the specified criteria objects.
         *
         * @method filterByCriteria
         * @param arr
         * @param criteria
         * @param options
         *      - pass: every (default, valid object must equal every key & value specified in criteria) ||
         *              some (valid object must equal one criteria to be valid)
         * @returns {*}
         */
        DCCommonUtils.prototype.filterByCriteria = function( arr, criteria, options ) {
            var pass = ( options && options.pass ) ? options.pass : 'every',
                blacklist = ( options && options.blacklist ) ? options.blacklist : [],
                necessaryList = ( options && options.necessaryList ) ? options.necessaryList : [],
                keys = Y.Object.keys,
                filteredKeys;
            if( !Y.Lang.isArray( arr ) || 'object' !== typeof criteria ) {
                return arr;
            }

            filteredKeys = Y.Array.reject( keys( criteria ), function( c ) {
                return Y.Array.find( blacklist.concat( necessaryList ), function( b ) {
                    return b === c;
                } );
            } );

            arr = arr.filter( function( item ) {
                return necessaryList.every( function( key ) {
                    return criteria[key] === undefined || criteria[key] === item[key];
                } );
            } );

            if( 0 === filteredKeys.length ) {
                return arr;
            }

            return Y.Array.filter( arr, function( obj ) {
                return Y.Array[pass]( filteredKeys, function( c ) {
                    if( Array.isArray( criteria[c] ) ) {
                        return -1 !== criteria[c].indexOf( obj[c] );
                    }
                    return obj[c] === criteria[c];
                } );
            } );

        };

        /**
         * unifies an array of durations
         * @method unifyDurations
         * @for doccirrus.commonutils
         * @param {Array} durations
         * @param {Object} [config]
         * @param {String} [config.propertyStart='start'] property which is used as start of duration
         * @param {String} [config.propertyEnd='end'] property which is used as end of duration
         * @param {Function} [config.mapDurationToMoment] a function which should return a moment for the provided duration value
         * @param {Function} [config.mapMomentToResult] a function which receives a moment and should return the wanted value for results
         * @return {Array} unified durations
         */
        DCCommonUtils.prototype.unifyDurations = function( durations, config ) {
            config = Y.merge( {
                propertyStart: 'start',
                propertyEnd: 'end',
                mapDurationToMoment: function( value ) {
                    return mom( value );
                },
                mapMomentToResult: function( value ) {
                    return value.toDate();
                }

            }, config );
            var
                result = [],
                propertyStart = config.propertyStart,
                propertyEnd = config.propertyEnd,
                mapDurationToMoment = config.mapDurationToMoment,
                mapMomentToResult = config.mapMomentToResult,
                ranges = durations.map( function( obj ) {
                    return {start: mapDurationToMoment( obj[propertyStart] ), end: mapDurationToMoment( obj[propertyEnd] ) };
                } ),
                current,
                i,
                union = function( firstRange, secondRange ) {
                    return {
                        start: moment.min(firstRange.start, secondRange.start),
                        end: moment.max(firstRange.end, secondRange.end)
                    };
                };
            ranges.sort( function( a, b ) {
                return a.start > b.start;
            } );

            while( ranges.length ) {
                current = ranges.pop();
                for( i = ranges.length - 1; i >= 0; i-- ) {
                    if(current.end.isAfter(ranges[i].start) && current.start.isBefore( ranges[i].end ) ) {
                        current = union(current, ranges[i]);
                        ranges.splice( i, 1 );
                    }
                }

                result.push( current );
            }
            result.sort( function( a, b ) {
                return a.start > b.start;
            } );

            result = result.map( function( item ) {
                var resultItem = {};
                resultItem[propertyStart] = mapMomentToResult( item.start );
                resultItem[propertyEnd] = mapMomentToResult( item.end );
                return resultItem;
            } );

            return result;
        };

        /**
         * Given a date, return the date that is 1 ms before the next quarter.
         * @method getEndOfQuarter
         * @param timestamp
         * @returns {*}
         */
        DCCommonUtils.prototype.getEndOfQuarter = function( timestamp ) {
            var
                m,
                t = mom( timestamp );
            m = t.month();
            t.month( (Math.floor( m / 3 ) + 1) * 3 ).date( 1 ).hours( 0 ).minutes( 0 ).seconds( 0 ).milliseconds( 0 );
            t.subtract( 1, 'ms' );
            return t.toDate();
        };

        /**
         * Given a quarter and year (YYYY), return the first and the last date of that quarter
         * @method getDateRangeByQuarter
         * @param timestamp
         * @returns {Object}
         */
        DCCommonUtils.prototype.getDateRangeByQuarter = function( quarter, year ) {
            if( 1 > quarter || 4 < quarter ) {
                return;
            }
            if( 1 !== quarter ) {
                quarter = (quarter + quarter) + (quarter - 2);
            }
            var start = mom( quarter + '.' + year, 'M.YYYY' ).toDate(),
                end = this.getEndOfQuarter( start ),
                result = {
                    start: start,
                    end: end
                };
            return result;
        };

        /**
         * returns end of provided quarter and year as date
         * @method endOfNextQ
         * @param {Number} quarter
         * @param {Number} year
         * @return {moment}
         */
        DCCommonUtils.prototype.endOfNextQ = function( quarter, year ) {
            var m;
            if( 1 > quarter || 4 < quarter) {
                return;
            }
            if(quarter === 4){
                quarter = 1;
                year++;
            } else {
                quarter++;
            }
            m = quarter * 3;

            return mom( m + '.' + year, 'M.YYYY').endOf('month');
        };

        /**
         * replace non-ASCII characters with their html encoded equivalent
         * @method toHTMLEscaped
         * @param {string} text unescaped text
         * @returns {string}
         */
        DCCommonUtils.prototype.toHTMLEscaped = function( text ) {
            var escaped = text.replace( /[\u00A0-\u2666]/g, function( c ) {
                return '&#' + c.charCodeAt( 0 ) + ';';
            } );

            return escaped;
        };

        /**
         * get a RegExp object from wildcard expression
         * @method wildcardToRegExp
         * @param exp a valid wildcard expression
         * @returns {RegExp}
         */
        DCCommonUtils.prototype.wildcardToRegExp = function( exp ) {
            var regExp = new RegExp( ('^' + exp + '$').replace( /\./g, '\\.' ).replace( /\*/g, '.*?' ) );
            return regExp;
        };

        /**
         * @method checkCardValidityDate
         * @param validityDate
         * @param options
         * @returns {*|null}
         */
        DCCommonUtils.prototype.checkCardValidityDate = function( starts, ends, options ) {

            var defaults = {
                    type: 'KBV',
                    date: undefined
                },
                date;

            function getMomentObj( val ) {
                return mom.isMoment( val ) ? val : mom( val );
            }

            options = options || {};
            options = Y.merge( {}, defaults, options );
            date = mom( options.date );

            starts = starts && getMomentObj( starts );
            ends = ends && getMomentObj( ends );

            switch( options.type ) {
                case 'KBV':
                    if( starts && date.isBefore( starts, 'month' ) ) {
                        return new Y.doccirrus.commonerrors.DCError( '3003' );
                    }
                    if( ends && date.isAfter( ends, 'month' ) ) {
                        return new Y.doccirrus.commonerrors.DCError( '3002' );
                    }
                    break;
                default:
                    throw new Error( 'Type ' + options.type + ' Not Implemented' );
            }
            return null;
        };

        /**
         * function to escape RegExp characters in a string to use in a new RegExp()
         * @method $regexEscape
         * @param {String} string
         * @returns {String}
         */
        DCCommonUtils.prototype.$regexEscape = function $regexEscape( string ) {
            return string.replace( /[-\/\\^$*+?.()|[\]{}]/g, '\\$&' );
        };

        /**
         * function to convert phone number to homogenised format
         * @method homogenisePhoneNumber
         * @param {String} phonenumber
         * @returns {String}
         */
        DCCommonUtils.prototype.homogenisePhoneNumber = function( phonenumber ) {
            if( !phonenumber ) {
                return;
            }

            var
                code = '49';
            // this is is a basic fix for the problem, it does not resolve multi country
            // support, which could simply be done by reversing the sequence of chars in
            // the index, matching without the country code in the voipindex. Then the code
            // variable would be completely removed from this function.
            if( DCCommonUtils.prototype.doesCountryModeIncludeSwitzerland() ) {
                code = '41';
            }

            if( '+' === phonenumber[0] ) {
                phonenumber = phonenumber.replace( /([^0-9]+)/gi, '' );
                return phonenumber;
            }

            phonenumber = phonenumber.replace( /([^0-9]+)/gi, '' );

            if( '0' === phonenumber[0] ) {
                if( '0' === phonenumber[1] ) {
                    phonenumber = phonenumber.slice( 2 );
                } else {
                    phonenumber = phonenumber.slice( 1 );
                    phonenumber = code + phonenumber;
                }
                return phonenumber;
            }

            if( phonenumber.indexOf( code ) === 0 ) {
                return phonenumber;
            } else {
                phonenumber = code + phonenumber;
                return phonenumber;
            }
        };

        var
            /**
             * @type {string[]}
             * @private
             * @see DCCommonUtils.prototype.$regexLikeUmlaut
             */
            $regexLikeUmlautVariants = [
                '([äâáà]|ae)',
                '([ÄÂÁÀ]|AE|Ae)',
                '([öôóò]|oe)',
                '([ÖÔÓÒ]|OE|Oe)',
                '([üûúù]|ue)',
                '([ÜÛÚÙ]|UE|Ue)',
                '([ß]|ss)',
                '([ç]|c)'
            ],
            /**
             * @type {RegExp}
             * @private
             * @see DCCommonUtils.prototype.$regexLikeUmlaut
             */
            $regexLikeUmlautRegExp = new RegExp( $regexLikeUmlautVariants.join( '|' ), 'g' ),
            /**
             * @returns {string}
             * @private
             * @see DCCommonUtils.prototype.$regexLikeUmlaut
             */
            $regexLikeUmlautReplacer = function $regexLikeUmlautReplacer( /*match, a, A, o, O, u, U, s, offset, string*/ ) {
                return $regexLikeUmlautVariants[Array.prototype.slice.call( arguments, 1, -2 ).indexOf( arguments[0] )];
            };
        /**
         * converts a string into a mongoDB $regex object and replaces Umlaut characters with their matching equivalents
         * @method $regexLikeUmlaut
         * @param {String} string
         * @param {Object} [config]
         *      @param {Object} [config.merge] Object which will get merged into
         *      @param {Boolean} [config.onlyRegExp] set to true will return only the String to use in a new RegExp()
         * @returns {Object|String} either a mongoDB $regex object or a String to use in a new RegExp() determined by config.onlyRegExp
         */
        DCCommonUtils.prototype.$regexLikeUmlaut = function $regexLikeUmlaut( string, config ) {
            config = config || {};
            var
                replaced,
                $regex;
            if( !config.noRegexEscape ) {
                string = Y.doccirrus.commonutils.$regexEscape( string );
            }
            replaced = string.replace( $regexLikeUmlautRegExp, $regexLikeUmlautReplacer );
            $regex = { $regex: replaced };
            if( config.merge ) {
                $regex = Y.merge( $regex, config.merge );
            }
            if( config.onlyRegExp ) {
                $regex = replaced;
            }

            return $regex;
        };

        /**
         * Builds an address string from insurance catalog entry.
         * Address is separated in two parts:
         * Part 1 contains street and houseno.
         * Part 2 contains zip and city
         * @param {object} catalogEntry
         * @param {number}part - 1 or 2
         * @returns {string}
         */
        DCCommonUtils.prototype.buildInsuranceAddressPart = function ( catalogEntry, part ) {
            // make this util function work on server and client (maybe observables)
            function unwrap( attr ) {
                if('function' === typeof attr){
                    return attr();
                } else {
                    return attr;
                }
            }

            var address, street, zip, city,
                addresses = unwrap(catalogEntry && catalogEntry.addresses),
                str = '';
            address = addresses && addresses[0];

            if( address ) {
                if( 1 === part){
                    street = unwrap(address.street);
                    str += street;
                } else if(2 === part){
                    zip = unwrap(address.zip);
                    city = unwrap(address.city);
                    str += (zip ? (zip + (city ? ' ' : '')) : '');
                    str += (city ? city : '');
                }
            }
            return str;
        };

        /**
         * Given a mongo ObjectId, get the associated date.
         *
         * @param objectId {String|ObjectId} can be a string or a mongoose ObjectId
         * @returns {Object} Date object or null, if invalid input was given
         */
        DCCommonUtils.prototype.dateFromObjectId = function( objectId ) {
            var
                invalid = false,
                oid = objectId;

            if( 'string' !== typeof objectId ) {
                if( objectId.toString ) {
                    oid = objectId.toString();
                } else {
                    // not a valid object Id
                    invalid = true;
                }
            }

            if( 24 !== oid.length ) {
                invalid = true;
            }

            if( !invalid ) {
                return new Date( parseInt( oid.substring( 0, 8 ), 16 ) * 1000 );
            }
            return null;

        };

        DCCommonUtils.prototype.isObjectId = function( idStr ) {
            return /^[0-9a-fA-F]{24}$/.test( idStr );
        };

        DCCommonUtils.prototype.mapInsuranceTypeToScheinType = function( insuranceType ) {
            return this.insuranceTypeScheinTypeMapping[insuranceType];
        };

        DCCommonUtils.prototype.unwrap = function( attr ) {
            if( 'function' === typeof attr ) {
                return attr();
            } else {
                return attr;
            }
        };

        DCCommonUtils.prototype.mapScheinTypeToInsuranceType = function( scheinType ) {
            var i,
                mapping = this.this.insuranceTypeScheinTypeMapping;
            for( i in mapping ) {
                if( mapping[i] === scheinType ) {
                    return i;
                }
            }
        };

        /**
         *  Remove leading and trailing whitespace
         */

        DCCommonUtils.prototype.trim = function(txt) {
            return txt.replace(/^\s+|\s+$/gm,'');
        };

        DCCommonUtils.prototype.getCodeComparator = function() {
            function parseCode( code ) {
                var re = /(0*)(\d*)(\w*)/,
                    zeros,
                    number,
                    word,
                    onlyZeros = false,
                    m = re.exec( code );

                if( m ) {

                    if( m[1] && !m[2] ) {
                        onlyZeros = true;
                    }

                    zeros = onlyZeros ? m[1].slice( null, m[1].length - 1 ) : m[1];
                    number = onlyZeros ? '0' : m[2];
                    word = m[3];
                    return {
                        zeros: zeros,
                        number: number,
                        word: word
                    };
                }
            }

            return function( a, b ) {
                var A = parseCode( a ),
                    B = parseCode( b );
                if( !A ) {
                    return 1;
                }
                if( !B ) {
                    return -1;
                }
                if( A.zeros && B.zeros ) {
                    if( A.zeros !== B.zeros ) {
                        return A.zeros.length - B.zeros.length;
                    }
                }
                if( !A.zeros && B.zeros ) {
                    return 1;
                }
                if( !B.zeros && A.zeros ) {
                    return -1;
                }
                if( A.number && B.number && A.number !== B.number ) {
                    return +A.number - (+B.number);
                } else if( A.number && !B.number ) {
                    return -1;
                } else if( B.number && !A.number ) {
                    return 1;
                }
                return B.word === A.word ? 0 : (B.word < A.word);
            };
        };

        /**
         *  Dummy callback passed when we do not need to wait for the result of an async operation
         *
         *  Replaces Y.dcrorms.nullCallback
         *  @param  err
         */

        DCCommonUtils.prototype.nullCallback = function( err ) {
            if ( err ) {
                Y.log( 'Error on callback: ' + JSON.stringify( err ), 'warn', NAME);
                //console.log( 'Stack trace follows: ', new Error().stack );
            }
        };


        /**
         * Sorts prescription drop down menu according to recommended presciption forms.
         * If no recommendations passed, the menu will be sorted as default.
         *
         * @method sortPrescMenu
         * @param [recommendations]
         *
         */
        DCCommonUtils.prototype.mapPrescRecommendations = function( data, type ) {

            var result = {
                    advices: [],
                    warnings: []
                },
                mappings = {
                    PUBLIC: 'Verwenden Sie ein Kassenrezept (Muster 16) für dieses Präparat.',
                    PRIVATE: 'Verwenden Sie ein Privat-Rezept für dieses Präparat.',
                    SELFPAYER: 'Verwenden Sie ein Privat-Rezept für dieses Präparat.',
                    BG: 'Verwenden Sie ein Privat-Rezept für dieses Präparat.',
                    OTC: 'Verwendung eines Privat-Rezeptes oder Grünen Rezeptes bei der Verordnung von OTC-Präparaten für Kinder über 12 Jahre ohne Entwicklungsstörungen und Erwachsene.',
                    NEGATIVE: 'Verwendung eines Privat-Rezeptes oder Grünen Rezeptes bei Verordnung von Negativlisten-Präparaten',
                    LIFESTYLE: 'Verwendung eines Privat-Rezeptes bei der Verordnung von Life-Style- Präparaten',
                    BTM: 'Verwendung eines BTM-Rezeptes bei Betäubungsmitteln',
                    NEGATIVEBTM: 'Das BtM-Rezept darf für das Verschreiben anderer Arzneimittel nur dann verwendet werden, wenn dies neben einem Betäubungsmittel erfolgt.',
                    TERATOGEN: 'Verwendung eines T-Rezeptes bei teratogenen Arzneimitteln',
                    NOTPRESCRIBABLEMED: 'Verwendung eines Privatrezeptes bei nicht verordnungsfähigen Medizinprodukten',
                    AMR3: 'Das Präparat unterliegt einem Verordnungsausschluss nach Anlage III der AM-RL.',
                    OTX: 'Es handelt sich um ein OTC-Ausnahmepräparat (OTX-Präparat).',
                    PH_ONLY_NOT_OTX: 'Es handelt sich um ein apothekenpflichtiges Arzneimitteln, dass nicht als OTX-Arzneimittel gekennzeichnet ist.',
                    CONDLIFESTYLE: 'Es handelt sich um ein bedingtes Life-Style-Präparat.',
                    PRESCRIBABLEMED: 'Es handelt sich um ein verordnungsfähiges Medizinprodukt.',
                    NO_THERAPY_APPROPRIATE_PACKAGE_SIZE: 'Das Medikament hat das Kennzeichen „Keine therapiegerechte Packungsgröße“ und unterliegt somit einem Verordnungsausschluss.'
                };

            function getName( el ) {
                return el.name;
            }

            function mapRecommendationType( type ) {
                return mappings[type];
            }

            function iterateMedicationResults( medication ) {
                var _advices = [],
                    _warnings = [];

                function iterateRecommendations( recommendation ) {
                    if( !recommendation.advice && -1 !== (recommendation.prescriptions && recommendation.prescriptions.indexOf( type )) ) {
                        return;
                    }
                    if( recommendation.advice ) {
                        _advices.push( mapRecommendationType( recommendation.name ) );
                    } else {
                        _warnings.push( mapRecommendationType( recommendation.name ) );
                    }
                }

                medication.recommendations.forEach( iterateRecommendations );
                if( _advices.length ) {
                    result.advices.push( {
                        name: medication.name,
                        list: _advices
                    } );
                }
                if( _warnings.length ) {
                    result.warnings.push( {
                        name: medication.name,
                        list: _warnings
                    } );
                }
            }

            data.results.forEach( iterateMedicationResults );

            result.id = 'presc-recom-id-' + result.advices.map( getName ) + '-' + result.warnings.map( getName );

            return result;
        };

        DCCommonUtils.prototype.argChecker = function( args/*, argNames..., options*/ ) {
            var i, argName,
                argNamesLen,
                err,
                missingArgs = [],
                options = {
                    throws: false
                };

            if( 'object' !== typeof args ) {
                throw Error( 'args is not an object' );
            }

            argNamesLen = arguments.length;

            if( 'object' === typeof arguments[argNamesLen - 1] ) {
                ObjectAssign( options, arguments[argNamesLen - 1] );
                argNamesLen--;
            }

            if( 1 >= argNamesLen ) {
                return;
            }

            for( i = 1; i < argNamesLen; i++ ) {
                argName = arguments[i];
                if( !args[argName] ) {
                    missingArgs.push( argName );
                }
            }
            if( 0 !== missingArgs.length ) {
                err = new Y.doccirrus.commonerrors.DCError( 400, {message: ('insufficient arguments: ' + missingArgs.join( ', ' ))} );
                if( true === options.throws ) {
                    throw err;
                } else {
                    return err;
                }
            }
        };

        DCCommonUtils.prototype.argCheckerThrows = function() {
            var args = Array.prototype.slice.call( arguments );
            if( 'object' === typeof args[args.length - 1] && args[args.length - 1] !== args[0] ) {
                ObjectAssign( args[args.length - 1], {throws: true} );
            } else {
                args.push( {throws: true} );
            }
            return myUtils.argChecker.apply( myUtils, args );
        };

        /**
         * Replaces control characters in passed string
         * @param {string} stringToReplace
         * @returns {string}
         */
        DCCommonUtils.prototype.replaceControlChars = function( stringToReplace ) {
            return stringToReplace && stringToReplace.replace( /\n/g, " ").replace(/\r/g, "").replace(/\v/g, "")
                    .replace(/\f/g, "").replace(/\t/g, " ").replace(/\b/g, "") || "";
        };

        DCCommonUtils.prototype.getRandomIntBetweenRange = function (min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min)) + min;
        };

        DCCommonUtils.prototype.processInsuranceStatus = processInsuranceStatus;
        DCCommonUtils.prototype.comparePatients = comparePatients;

        /**
         * This method retrieves the countryMode array for the practice and can be used both server and client side.
         *
         * @method getCountryModeFromConfigs
         * @returns {Array} Practice countryMode
         */
        DCCommonUtils.prototype.getCountryModeFromConfigs = function() {
            var config = isClientSide() ? YUI_config : Y.config;
            var countryMode = config && config.doccirrus && config.doccirrus.Env && config.doccirrus.Env.countryMode;

            if( !Array.isArray( countryMode ) || !countryMode.length ) {
                Y.log( 'No country mode is configured in DC environment, defaulting to Germany.', 'warn', NAME );
                countryMode = ['D'];
            }

            return countryMode;
        };
        /**
         * This method checks if the countryMode is available.
         *
         * @method isCountryModeCheckAvailable
         * @returns {Boolean}
         */
        DCCommonUtils.prototype.isCountryModeCheckAvailable = function() {
            var config = isClientSide() ? YUI_config : Y.config;
            var countryMode = config && config.doccirrus && config.doccirrus.Env && config.doccirrus.Env.countryMode;

            if( !Array.isArray( countryMode ) || !countryMode.length ) {
                return false;
            }

            return true;
        };
        /**
         * This method waits until the countryMode is available.
         *
         * @method waitUntilCountryModeCheckAvailable
         */
        DCCommonUtils.prototype.waitUntilCountryModeCheckAvailable = function( callback ) {
            var retries = 0,
                maxRetries = 1000,
                err;

            function check() {
                if( myUtils.isCountryModeCheckAvailable() ) {
                    Y.log( 'country code available after ' + retries + ' retries!', 'info', NAME );
                    callback();
                    return;
                }
                if( retries >= maxRetries ) {
                    err = 'could not get country code check not available after ' + (retries * maxRetries) + 's';
                    callback( new Error( err ) );
                    return;
                }
                retries++;
                setTimeout( check, 1000 );
            }

            check();
        };
        /**
         * This method returns true if the country mode includes 'CH' and can be used both server and client side.
         *
         * @method doesCountryModeIncludeSwitzerland
         * @returns {Boolean} Indicates whether the country mode includes Switzerland
         */
        DCCommonUtils.prototype.doesCountryModeIncludeSwitzerland = function() {
            return DCCommonUtils.prototype.getCountryModeFromConfigs().indexOf( "CH" ) > -1;
        };
        /**
         * This method returns true if the country mode includes 'D' and can be used both server and client side.
         *
         * @method doesCountryModeIncludeGermany
         * @returns {Boolean} Indicates whether the country mode includes Germany
         */
        DCCommonUtils.prototype.doesCountryModeIncludeGermany = function() {
            return DCCommonUtils.prototype.getCountryModeFromConfigs().indexOf( "D" ) > -1;
        };

        /**
         * This method wraps a constructor for it to support country extensions.
         *
         * @method supportCountryExtensions
         * @param {Constructor} Constructor
         * @returns {Constructor} Wrapped constructor
         */
        DCCommonUtils.prototype.supportCountryExtensions = function( Constructor ) {
            var CountryConstructor;
            var countryMode = DCCommonUtils.prototype.getCountryModeFromConfigs();
            var countryConstructors = [];

            // 1. Search for country constructors
            countryMode.forEach( function( countryCode ) {
                // Country constructors are registered on Y.doccirrus.countryextensions
                CountryConstructor = Y.doccirrus.countryextensions[Constructor.name + '_' + countryCode];
                if( CountryConstructor ) {
                    countryConstructors.push( CountryConstructor );
                }
            } );

            // 2. Mix in prototype properties
            countryConstructors.forEach( function( CountryConstructor ) {
                ObjectAssign( Constructor.prototype, CountryConstructor.prototype );
            } );

            // 3. Set up construct trap to call all country constructors on initialization
            return new Proxy( Constructor, {
                construct: function( Constructor, args, newTarget ) {
                    var instance = Reflect.construct( Constructor, args, newTarget );
                    countryConstructors.forEach( function( CountryConstructor ) {
                        CountryConstructor.apply( instance, args );
                    } );

                    instance.countryModeIncludesSwitzerland = DCCommonUtils.prototype.doesCountryModeIncludeSwitzerland();
                    instance.countryModeIncludesGermany = DCCommonUtils.prototype.doesCountryModeIncludeGermany();

                    return instance;
                }
            } );
        };

        /**
         * This method converts baseSystemLevel to doctorsAmount.
         *
         * @method baseSystemLevelToDoctorsAmount
         * @param {String} level
         * @returns {String} amount
         */
        DCCommonUtils.prototype.baseSystemLevelToDoctorsAmount = function( level ) {
            var amount = '1';
            switch( level ) {
                case Y.doccirrus.schemas.settings.baseSystemLevels.ENTRY:
                    amount = '1';
                    break;
                case Y.doccirrus.schemas.settings.baseSystemLevels.SMALL:
                    amount = '3';
                    break;
                case Y.doccirrus.schemas.settings.baseSystemLevels.MEDIUM:
                    amount = '6';
                    break;
                case Y.doccirrus.schemas.settings.baseSystemLevels.LARGE:
                    amount = '10';
                    break;
                case Y.doccirrus.schemas.settings.baseSystemLevels.ENTERPRISE:
                    amount = '0';
                    break;
            }

            return amount;
        };

        DCCommonUtils.prototype.isDateBeforeQ12020 = function( timestamp ) {
            var localMoment = getMoment();
            return timestamp && localMoment( timestamp ).isBefore( localMoment( '1/2020', 'Q/YYYY' ) );
        };

        /**
         * Flattens an array on a single level
         * @param {Array} array
         * @returns {Array|*}
         */
        DCCommonUtils.prototype.flattenArray = function( array ) {
            if( Array.isArray( array ) ) {
                return array.reduce( function ( acc, val ) {
                    return acc.concat( val );
                }, [] );
            }
            return array;
        };

        /**
         * Sorts array of objects by the specified key
         * and can sort in reverse
         * Can also accept the key to be a second child
         * by providing "childOf" as the first key
         * @param {Object} args
         * @param {Array} args.array
         * @param {String} args.keyName
         * @param {String} args.childOf
         * @param {Boolean} args.reversed
         * @returns {Array}
         */
        DCCommonUtils.prototype.sortArrayOfObjectsByKey = function( args ) {
            var
                array = args.array || [],
                keyName = args.keyName || '',
                childOf = args.childOf,
                reversed = args.reversed;

            return array.sort( function sortByKey( a, b ) {
                var
                    valueA = childOf && a[childOf][keyName] || a[keyName],
                    valueB = childOf && b[childOf][keyName] || b[keyName];
                if( reversed ) {
                    return ((valueA < valueB) ? 1 : ((valueA > valueB) ? -1 : 0));
                } else {
                    return ((valueA < valueB) ? -1 : ((valueA > valueB) ? 1 : 0));
                }
            } );
        };

        /**
         * Converts a regular expression written as a string e.g. "/mk/gi"
         * to a JS RegExp object with the same flags
         *
         * @param {String} mongoRegExp
         * @returns {RegExp}
         */
        DCCommonUtils.prototype.convertMongoRegExpToJsRegExp = function( mongoRegExp ) {
            var
                regExpParts = mongoRegExp.match(/(\/?)(.+)\1([a-z]*)/i),
                flags = regExpParts.pop(),
                stringRegExp = regExpParts.pop();

            return new RegExp( stringRegExp, flags );
        };

        /**
         * This method determines if the page is on frameView mode (contains flag frameView as query param),
         * which will be used for the pages displayed in modals
         *
         * @returns {Boolean}
         */
        DCCommonUtils.prototype.isFrameView = function() {
            var config = isClientSide() ? YUI_config : Y.config;

            return _.get(config, 'doccirrus.Env.frameView', false);
        };

        /**
         * Checks if the object passed is empty
         *
         * @param {Object} obj
         * @returns {boolean}
         */
        DCCommonUtils.prototype.isObjectEmpty = function( obj ) {
            return obj.constructor === Object && Object.keys( obj ).length === 0;
        };

        DCCommonUtils.prototype.isArrayOfNumbers = function( list ) {
            var i, item;
            if( !Array.isArray(list) ) {
                return false;
            }
            for ( i = 0; i < list.length; i++ ) {
                item = list[i];
                if( typeof item !== 'number' ) {
                    return false;
                }
            }
            return true;
        };

        /**
         * Hard convert moment to UTC.  If you create a moment from a String
         * convertHourArrayToMoment, it then always carries UTC and non-UTC
         * info with it, meaning that to convert to UTC "Hard" you need to
         * actually reparse the string.
         *
         * This helper function encapsulates that process.
         *
         * @param moment
         * @returns {*}
         */
        DCCommonUtils.prototype.convertMomentToUTCHard = function( moment ) {
            if( moment && moment.toDate() ) {
                return mom( moment.toDate() );
            }
        };

        /**
         * useDay MAY NOT BE UTC...
         *  Returns a UTC date
         *
         * @method convertHourArrayToMoment
         * @param hArray hour array e.g. [9]  or  [23,59]
         * @param useDay  a moment representing the currrent day.
         * @returns {*}  a new moment based on useDay with the time set as in hArray
         */
        DCCommonUtils.prototype.convertHourArrayToMoment = function( hArray, useDay ) {
            var
                temp,
                result;
            // preserves the moment
            // provide a practice wide timezone TODO: MOJ-752

            if( !hArray || !Array.isArray( hArray ) ) {
                return result;
            }
            if( !hArray[0] ) {
                hArray[0] = 0;
            }
            if( !hArray[1] ) {
                hArray[1] = 0;
            }
            // we load the hours and minutes into a temp object
            temp = mom( useDay ).hours( hArray[0] ).minutes( hArray[1] );
            // then we move these time zone ok numbers to the result, by losing timezone info and resetting it.
            // this should fit what we expect
            result = this.convertMomentToUTCHard( temp );
            return result;
        };

        /**
         * Check if two events intersects by comparing their start/end values
         *
         * @param {Object} t1 - Date object which represents a start of first event
         * @param {Object} t2 - Date object which represents an end of first event
         * @param {Object} s1 - Date object which represents a start of second event
         * @param {Object} s2 - Date object which represents an end of second event
         * @returns {boolean}
         */
        DCCommonUtils.prototype.hasClash = function( t1, t2, s1, s2 ) {
            return !((t1 < s1 && t2 <= s1) || (t1 >= s2 && t2 > s2));
        };


        DCCommonUtils.prototype.countDecimals = function( number ) {
            var parts;
            if( Math.floor( number.valueOf() ) === number.valueOf() ) {
                return 0;
            }
            parts = number.toString().split( '.' );
            return parts[1] && parts[1].length || 0;
        };

        /**
         *  Apply sorters to cached table rows
         *
         *  @method sortProxyData
         *  @param  {Object}    tableList  KoTable
         *  @param  {Object}    filteredData    Array of populated schedule objects
         *  @param  {Object}    params          Query passed to proxy
         *  @return {*}
         */

        DCCommonUtils.prototype.sortProxyData = function( tableList, filteredData, params ) {
            var
                sortOps = [];

            if( !params.sort ) {
                return filteredData;
            }

            Y.each( params.sort, queueSingleParam );

            //  lowest priority sorters first
            sortOps.reverse();

            sortOps.forEach( sortSingleParam );

            function queueSingleParam( direction, forPropertyName ) {
                sortOps.push( {'forPropertyName': forPropertyName, 'direction': direction} );
            }

            function sortSingleParam( sortOp ) {
                var column = tableList.getColumnByPropertyName( sortOp.forPropertyName );

                if( 'function' === typeof column.sortBy ) {
                    filteredData.sort( column.sortBy );
                } else {
                    filteredData.sort( makeSorter( sortOp.forPropertyName ) );
                }

                if( -1 === sortOp.direction ) {
                    filteredData.reverse();
                }
            }

            function makeSorter( forPropertyName ) {
                return function( rowA, rowB ) {
                    var
                        valueA = Y.doccirrus.commonutils.getObject( forPropertyName, rowA ),
                        valueB = Y.doccirrus.commonutils.getObject( forPropertyName, rowB );

                    if( valueA > valueB ) {
                        return 1;
                    }
                    if( valueB > valueA ) {
                        return -1;
                    }
                    return 0;
                };
            }

            return filteredData;
        };

        /**
         * Helper function to add an arbitrary object to a dictionary object indexed by a list of categories.
         * @param {object} dictionary
         * @param {string[]|string} categories
         * @param {string} key if defined, will add the object as well unter the given key within the array object.
         * @param {any} value
         * @returns {{CATEGORY: {key: value}}} dictionary object with key value store
         */
        DCCommonUtils.prototype.addToCategoryDictionaryObject = function( dictionary, categories, key, value ) {
            if( typeof categories === "string" ) {
                categories = [categories];
            }
            if( categories && Array.isArray( categories ) ) {
                categories.forEach( function forEachCategory( category ) {
                    // initialize a new dictionary object, if no object has been found under the given category
                    if( !Object.prototype.hasOwnProperty.call( dictionary, category ) ) {
                        dictionary[category] = {};
                    }

                    // if no object is given, the function just creates the category dictionary
                    // (can be used for initialization purposes)
                    if( typeof value !== "undefined" ) {
                        // additionally add the object by the given key (if a key is given)
                        // to allow to search by that key (much faster, as keys are hashed)
                        if( typeof key === "string" ) {
                            dictionary[category][key] = value;
                        }
                    }
                } );
            }

            return dictionary;
        };

        /**
         * Helper function to return a pure string array from a variety of string/number inputs.
         * May be used, e.g. to populate a mongoDB ["String"] field.
         * @param {string|number|(string|number)[]} v
         * @returns {string[]}
         */
        DCCommonUtils.prototype.getAlphaNumericStringArray = function getAlphaNumericStringArray( v ) {
            if( !Array.isArray( v ) ) {
                v = [v];
            }
            return v.reduce( function reduceToAlphaNumericValues( result, text ) {
                // ensure we only add strings and numbers
                switch( typeof text ) {
                    case "number":
                        text = String( text );
                    // deliberate fall-through
                    case "string":
                        result.push( text );
                }
                // ensure we only add strings and numbers
                return result;
            }, [] );
        };

        /**
         * Helper function to return an array of select2 compatible option-objects {id: string, text: string}.
         * If just a simple value array is given, will use the value for key and value.
         * @param {string|number|(string|number)[]|{id: (string|number), text: (string|number)}[]|function(): string|number|(string|number)[]|{id: (string|number), text: (string|number)}[]} v
         * @returns {{id: (string|number), text: (string|number)}[]}
         */
        DCCommonUtils.prototype.getSelect2OptionsArray = function getSelect2OptionsArray( v ) {
            if( typeof v === "function" ) {
                v = v();
            }
            if( !Array.isArray( v ) ) {
                v = [v];
            }
            return v.reduce( function reduceToSelect2Objects( result, singleValueOrSelect2Object ) {
                // ensure we only add strings and numbers
                switch( typeof singleValueOrSelect2Object ) {
                    case "object":
                        if(
                            singleValueOrSelect2Object !== null &&
                            Object.prototype.hasOwnProperty.call( singleValueOrSelect2Object, 'id' ) &&
                            Object.prototype.hasOwnProperty.call( singleValueOrSelect2Object, 'text' ) &&
                            (typeof singleValueOrSelect2Object.id === "string" || typeof singleValueOrSelect2Object.id === "number") &&
                            (typeof singleValueOrSelect2Object.text === "string" || typeof singleValueOrSelect2Object.text === "number")
                        ) {
                            result.push( singleValueOrSelect2Object );
                        }
                        break;
                    case "number":
                    case "string":
                        result.push( {
                            id: singleValueOrSelect2Object,
                            text: singleValueOrSelect2Object
                        } );
                }
                return result;
            }, [] );
        };

        /**
         * Filters the input array by comparison with the comparisonArray.
         * The filtered array will only contain elements, which are not present in both arrays.
         * If the array element is an object, it uses the given comparisonKeys.
         * If the array element is no object, a direct comparison is performed.
         * @param {any[]} arrayToFilter
         * @param {any[]} arrayToCompare
         * @param {string[]} keysForObjectComparison if the array contains objects, uses this list of keys to compare the objects
         * @returns {any[]}
         */
        DCCommonUtils.prototype.getDifferenceBetweenArray = function filterArrayForChanges( arrayToFilter, arrayToCompare, keysForObjectComparison ) {
            return arrayToFilter.filter( function filterEachArrayToFilterItem( arrayToFilterItem ) {

                if( keysForObjectComparison && Array.isArray( keysForObjectComparison ) && typeof arrayToFilterItem === "object" && arrayToFilterItem !== null ) {
                    return arrayToCompare.every( function checkEveryArrayToCompareElementForMatch( arrayToCompareItem ) {
                        var flag = false;

                        // fail, if only one element matches (flag switches to true, element gets filtered)
                        keysForObjectComparison.forEach( function forEachObjectKeyToCompare( key ) {
                            var
                                differenceFound = false,
                                comp = arrayToCompareItem[key],
                                tag = arrayToFilterItem[key],
                                keyInCompNotPresentInTag,
                                keyInTagNotPresentInComp,
                                keyWithDifferentContent,
                                keysInComp,
                                keysInTag;

                            if( Array.isArray( tag ) && Array.isArray( comp ) ) {
                                if( !differenceFound ) {
                                    keyInCompNotPresentInTag = comp.find( function findNonMatchingArrayValue( value ) {
                                        return tag.indexOf( value ) === -1;
                                    } );
                                    differenceFound = (typeof keyInCompNotPresentInTag !== "undefined");
                                }
                                if( !differenceFound ) {
                                    keyInTagNotPresentInComp = tag.find( function findNonMatchingArrayValue( value ) {
                                        return comp.indexOf( value ) === -1;
                                    } );
                                    differenceFound = (typeof keyInTagNotPresentInComp !== "undefined");
                                }
                            } else if( typeof tag === "object" && typeof comp === "object" ) {
                                // compare objects:
                                keysInComp = Object.keys( comp );
                                keysInTag = Object.keys( tag );

                                // first, compare if the keys of comp and tag are different
                                if( !differenceFound ) {
                                    keyInCompNotPresentInTag = keysInComp.find( function findNonMatchingKey( keyInComp ) {
                                        return keysInTag.indexOf( keyInComp ) === -1;
                                    } );
                                    differenceFound = (typeof keyInCompNotPresentInTag !== "undefined");
                                }
                                if( !differenceFound ) {
                                    keyInTagNotPresentInComp = keysInTag.find( function findNonMatchingKey( keyInTag ) {
                                        return keysInComp.indexOf( keyInTag ) === -1;
                                    } );
                                    differenceFound = (typeof keyInTagNotPresentInComp !== "undefined");
                                }
                                // if still no difference has been found, compare the values
                                if( !differenceFound ) {
                                    // we can omit the check whether comp has different keys than tag, since be compared that before
                                    keyWithDifferentContent = keysInTag.find( function findNonMatchingValue( keyInTag ) {
                                        return comp[keyInTag] !== tag[keyInTag];
                                    } );
                                    differenceFound = (typeof keyWithDifferentContent !== "undefined");
                                }

                            } else {
                                // compare everything else
                                differenceFound = (comp !== tag);
                            }

                            flag = flag || differenceFound;
                        } );

                        return flag;
                    } );
                }

                return arrayToCompare.indexOf( arrayToFilterItem ) === -1;
            } );
        };

        DCCommonUtils.prototype.chunkArray = function chunkArray( array, size = 10 ) {
            const chunked_arr = [];
            for( let i = 0; i < array.length; i++ ) {
                const last = chunked_arr[chunked_arr.length - 1];
                if( !last || last.length === size ) {
                    chunked_arr.push( [array[i]] );
                } else {
                    last.push( array[i] );
                }
            }
            return chunked_arr;
        };

        DCCommonUtils.prototype.delay = function delay( milliseconds, resolveValue = true ) {
            return new Promise( resolve => {
                setTimeout( () => {
                    resolve( resolveValue );
                }, milliseconds );
            } );
        };

        DCCommonUtils.prototype.fastHash = function(txt) {
            var
                hash = 0,       //% 32 bit integer [int]
                i;              //% char pos [int]

            if( 'object' === typeof txt ) {
                txt = JSON.stringify( txt );
            }

            if( 0 === txt.length ) {
                return hash;
            }

            for( i = 0; i < txt.length; i++ ) {
                hash = (((hash << 5) - hash) + txt.charCodeAt( i ));        //  jshint ignore:line
                hash = hash & hash;                                         //  jshint ignore:line
            }

            return hash;
        };

        /**
         * This method is a thin wrapper to format promise result, as in, if a promise is passed then it will
         * return an array with first element representing error and second element representing result i.e. [error, result];
         *
         * Though a multipurpose method, it is meant to be used with async/await for better error handling like a callback with error first pattern
         *
         * @param {Promise<T>} prom
         * @return {Promise<[(Error|null), T]>} which if successful resolves to [null, result] or if error resolves to [err];
         */
        DCCommonUtils.prototype.formatPromiseResult = function formatPromiseResult( prom ) {
            return prom
                .then( ( result ) => {
                    return [null, result];
                } )
                .catch( ( err ) => {
                    return [err];
                } );
        };

        /**
         * Wrap a promise around a call to an API which accepts a callback in an args/options object
         *
         * @param   {Function}  fn      A function which accepts an args object with a callback
         * @return  {Function}          The same function, but returning a promise
         */
        DCCommonUtils.prototype.promisifyArgsCallback = function promisifyArgsCallback( fn ) {
            return function promiseWrapper( args ) {
                return new Promise( function( resolve, reject ) {
                    args.callback = function( err, result ) {
                        if( err ) {
                            return reject( err );
                        }
                        resolve( result );
                    };
                    fn( args );
                } );
            };
        };

        /**
         * Default callback function, simply resolving or rejecting a promise.
         * May be used in async functions that usually expect a args.callback to be called.
         * If calling these functions within other functions without promisifyArgsCallback,
         * the function itself may provide a default values if no callback is set.
         * E.g. within a function that has arg.callback as expected input:
         *      const {
         *          callback = promisifiedCallback
         *      } = args;
         *
         * @param   {Function}  err     Error, in case the process returned an error.
         * @param   {Function}  result  Result, if the function did not experience any error.
         * @return  {Promise}           Resolved with result, or rejected with err, if err is given.
         */
        DCCommonUtils.prototype.promisifiedCallback = function promisifiedCallback( err, result ) {
            return new Promise( function( resolve, reject ) {
                if( err ) {
                    return reject( err );
                }
                return resolve( result );
            } );
        };

        myUtils = new DCCommonUtils();
        myUtils.init();

        Y.namespace( 'doccirrus' ).commonutils = myUtils;

    },
    '0.0.1', {requires: [
        'oop',
        'array-extras',
        'dccommonerrors',
        'countryextensions'
    ]}
);
