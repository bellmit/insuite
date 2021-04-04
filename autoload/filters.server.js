// Anti-XSS Filter
//This module is adapted from https://github.com/chriso/node-validator
//The license is available at  https://github.com/chriso/node-validator  (MIT)
//This module is adapted from the CodeIgniter framework
//The license is available at http://codeigniter.com/

/*
 *  NOTE: if filtering is breaking your mojit it can be disabled temporarily, search this file for KILLSWITCH
 */

/**
 *
 *  Filter library to sanitize user input. Used on client and server, includes a slow and fast cleaner.
 *
 *  Behavior of this component can be controlled by the following optional keys in application.json
 *
 *  {
 *      "security": {
 *          "xssfilter": (true|false),      //  defaults to true if not present
 *          "taintcheck": (true|false)      //  defaults to true if not present
 *      }
 *  }
 *
 */

/*jslint anon:true, nomen:true*/
/*global YUI*/

'use strict';

YUI.add( 'dcfilters', function( Y, NAME ) {
        var

        // settings from application.json
            filterEnabled = true,
            taintCheckEnabled = true,

            crypto = require( 'crypto' ),

            never_allowed_str = {
                'document.cookie': '',
                'document.write': '',
                '.parentNode': '',
                '.innerHTML': '',
                'window.location': '',
                '-moz-binding': '',
                '<!--': '&lt;!--',
                '-->': '--&gt;',
                '(<!\\[CDATA\\[)': '&lt;![CDATA['
            },

            never_allowed_regex = {
                'javascript\\s*:': '',
                'expression\\s*(\\(|&\\#40;)': '',
                'vbscript\\s*:': '',
                'Redirect\\s+302': ''
            },

            /*eslint-disable no-control-regex */
            non_displayables = [
                /%0[0-8bcef]/g,         // url encoded 00-08, 11, 12, 14, 15
                /%1[0-9a-f]/g,          // url encoded 16-31
                /[\x00-\x08]/g,         // 00-08
                /\x0b/g, /\x0c/g,       // 11,12
                /[\x0e-\x1f]/g          // 14-31
            ],

            compact_words = [
                'javascript',
                'expression',
                'vbscript',
                'script',
                'applet',
                'alert',
                'document',
                'write',
                'cookie',
                'window'
            ];

        function deReferenceObject( obj ){
            if( 'object' === typeof obj && null !== obj ){
                if( Array.isArray( obj ) ){
                    obj = [...obj];
                } else if ( obj.constructor === Object ){
                    obj = Object.assign({}, obj);
                }
            }
            return obj;
        }

        /**
         * Single method to clean objects, arrays and strings.
         * Note: ignores '_id' and 'id' named fields, as well as some internal
         * fields that are never written to the DB.
         *
         * @method clean
         * @param val {Mixed} the Value being tested. Clean wil recursively clean subelements.
         * @param is_image {Boolean} Is this an image that is being cleaned?
         * @return {*} the converted object or string
         */

        function _clean( val, is_image, processedValues ) {
            /*jshint loopfunc:true */

            //Recursively clean objects and arrays
            if( 'boolean' === typeof val ) {
                return val;
            }

            if( 'number' === typeof val ) {
                return val;
            }

            var
                i,                      //% loop counter [int]
                l,                      //% length of string [int]
                //hash,                   //% xss_hash, protect query string variables [string]
                naughty,                //% list of banned strings [string]
                original,
                spacified,              //%
                converted_string,
                event_handlers,         //% regex
                myOriginalStr = val;    //% saved for comparison at end [string]

            if( 'object' === typeof myOriginalStr ) {
                for( i in myOriginalStr ) {
                    if( myOriginalStr.hasOwnProperty ) {
                        if( myOriginalStr.hasOwnProperty( i )
                            ) {
                            if( ('_rest' !== i) &&
                                ('_id' !== i) &&
                                ('id' !== i) ) {
                                // not saved to db or not to be checked.
                                // _rest are rest params that are stripped
                                // _id is often an id object and is checked separately
                                // id  is the name of the ObjectId string that should
                                //     never be stripped. If other fields are named "id"
                                //     they will also not be checked. Small surface.  @rw Oct 13.

                                //  noisy, but useful in debugging
                                //Y.log('_clean-ing object index: ' + i + ' on ' + JSON.stringify(myOriginalStr), 'debug', NAME);
                                if(!processedValues){
                                    processedValues = [];
                                }
                                if( 'object' === typeof myOriginalStr[i] && null !== myOriginalStr[i] ){
                                    let alreadyWas = processedValues.some( el => el === myOriginalStr[i] ); // eslint-disable-line no-loop-func
                                    if( alreadyWas ) { //!Object.keys( cleanedKeys ).includes( keyPath )
                                        myOriginalStr[i] = ('object' === typeof myOriginalStr[i] && myOriginalStr[i].constructor === Object) ? null : myOriginalStr[i];
                                    } else {
                                        processedValues = [...processedValues, myOriginalStr[i]];
                                        let data = _clean( myOriginalStr[i], is_image, processedValues );
                                        myOriginalStr[i] = deReferenceObject( data );
                                    }
                                } else {
                                    myOriginalStr[i] = _clean( myOriginalStr[i], is_image, processedValues );
                                }
                            }
                        }
                    } else {
                        // just do it- some kind of stripped bare object
                        // NOTE:  in node.js 0.10.20 I have encountered objects without hasOwnProperty
                        //       not sure where it got stripped, perhaps in the latest  express (3.4.2)
                        //       in any case, necessitates more caution with this.
                        if( ('_rest' !== i) &&
                            ('_id' !== i) &&
                            ('id' !== i) ) {
                            // not saved to db or not to be checked.
                            // _rest are rest params that are stripped
                            // _id is often an id object and is checked separately
                            // id  is the name of the ObjectId string that should
                            //     never be stripped. If other fields are named "id"
                            //     they will also not be checked. Small surface.  @rw Oct 13.

                            //  noisy, but useful in debugging
                            //Y.log('_clean-ing object index: ' + i + ' on ' + JSON.stringify(myOriginalStr), 'debug', NAME);
                            if(!processedValues){
                                processedValues = [];
                            }
                            if( 'object' === typeof myOriginalStr[i] && null !== myOriginalStr[i] ){
                                let alreadyWas = processedValues.some( el => el === myOriginalStr[i] ); // eslint-disable-line no-loop-func
                                if( alreadyWas ) { //!Object.keys( cleanedKeys ).includes( keyPath )
                                    myOriginalStr[i] = ('object' === typeof myOriginalStr[i] && myOriginalStr[i].constructor === Object) ? null : myOriginalStr[i];
                                } else {
                                    processedValues = [...processedValues, myOriginalStr[i]];
                                    let data = _clean( myOriginalStr[i], is_image, processedValues );
                                    myOriginalStr[i] = deReferenceObject( data );
                                }
                            } else {
                                myOriginalStr[i] = _clean( myOriginalStr[i], is_image, processedValues );
                            }
                        }
                    }

                }
                return val;
            }

            //  The following only apply to strings
            if( 'string' !== (typeof val) ) {
                return val;
            }

            //Remove invisible characters
            converted_string = remove_invisible_characters( val );

            //Protect query string variables in URLs => 901119URL5918AMP18930PROTECT8198

//            do {
//                // ensure converted_string does not contain hash before inserting it
//                hash = xss_hash();
//            } while( converted_string.indexOf( hash ) >= 0 );
//            converted_string = converted_string.replace( /\&([a-z\_0-9]+)\=([a-z\_0-9]+)/ig, hash + '$1=$2' );

//            //Validate UTF16 two byte encoding (x00) - just as above, adds a semicolon if missing.
//            converted_string = converted_string.replace( /(&\#x?)([0-9A-F]+);?/ig, '$1$2;' );
//
//            //Un-protect query string variables
//            converted_string = converted_string.replace( new RegExp( hash, 'g' ), '&' );

            //Decode just in case stuff like this is submitted:
            //<a href="http://%77%77%77%2E%67%6F%6F%67%6C%65%2E%63%6F%6D">Google</a>
            try {
                converted_string = decodeURIComponent( converted_string );
            }
            catch( error ) {
                // converted_string was not actually URI-encoded
            }

            //Convert character entities to ASCII - this permits our tests below to work reliably.
            //We only convert entities that are within tags since these are the ones that will pose security problems.
            converted_string = converted_string.replace( /[a-z]+=([\'\"]).*?\1/gi, function( m, match ) {
                return m.replace( match, convert_attribute( match ) );
            } );

            //Remove invisible characters again
            converted_string = remove_invisible_characters( converted_string );

            //Convert tabs to spaces caused problems with barcodes see MOJ-4680
            //converted_string = converted_string.replace( '\t', ' ' );

            //Remove strings that are never allowed
            for( i in never_allowed_str ) {
                if( never_allowed_str.hasOwnProperty( i ) ) {
                    converted_string = converted_string.replace( new RegExp( i, "gi" ), never_allowed_str[i] );
                }
            }

            //Remove regex patterns that are never allowed
            for( i in never_allowed_regex ) {
                if( never_allowed_regex.hasOwnProperty( i ) ) {
                    converted_string = converted_string.replace( new RegExp( i, 'gi' ), never_allowed_regex[i] );
                }
            }

            function compactFn( m, compat, after ) {
                return compat.replace( /\s+/g, '' ) + after;
            }

            //Compact any exploded words like:  j a v a s c r i p t
            // We only want to do this when it is followed by a non-word character
            for( i = 0, l = compact_words.length; i < l; i++ ) {
                spacified = compact_words[i].split( '' ).join( '\\s*' ) + '\\s*';

                converted_string = converted_string.replace( new RegExp( '(' + spacified + ')(\\W)', 'ig' ), compactFn );
            }

            // Remove disallowed Javascript in links or img tags

            do {
                original = converted_string;

                if( converted_string.match( /<a/i ) ) {
                    converted_string = converted_string.replace( /<a\s+([^>]*?)(>|$)/gi, function( m, attributes ) {
                        attributes = filter_attributes( attributes.replace( '<', '' ).replace( '>', '' ) );
                        if( attributes.match( /href=.*?(alert\(|alert&\#40;|javascript\:|charset\=|window\.|document\.|\.cookie|<script|<xss|base64\s*,)/gi ) ) {
                            return m.replace( attributes, '' );
                        }
                        return m;
                    } );
                }

                if( converted_string.match( /<img/i ) ) {
                    converted_string = converted_string.replace( /<img\s+([^>]*?)(\s?\/?>|$)/gi, function( m, attributes ) {
                        attributes = filter_attributes( attributes.replace( '<', '' ).replace( '>', '' ) );
                        if( attributes.match( /src=.*?(alert\(|alert&\#40;|javascript\:|charset\=|window\.|document\.|\.cookie|<script|<xss|base64\s*,)/gi ) ) {
                            return m.replace( attributes, '' );
                        }
                        return m;
                    } );
                }

                if( converted_string.match( /script/i ) || converted_string.match( /xss/i ) ) {
                    converted_string = converted_string.replace( /<(\/*)(script|xss)(.*?)\>/gi, '' );
                }

            } while( original !== converted_string );

            //Remove JavaScript Event Handlers - Note: This code is a little blunt.  It removes the event
            //handler and anything up to the closing >, but it's unlikely to be a problem.
            event_handlers = ['[^a-z_\\-]on\\w*'];

            //Adobe Photoshop puts XML metadata into JFIF images, including namespacing,
            //so we have to allow this for images
            if( !is_image ) {
                event_handlers.push( 'xmlns' );
            }

            converted_string = converted_string.replace( new RegExp( "<([^><]+?)(" + event_handlers.join( '|' ) + ")(\\s*=\\s*[^><]*)([><]*)", 'i' ), '<$1$4' );

            //Sanitize naughty HTML elements
            //If a tag containing any of the words in the list
            //below is found, the tag gets converted to entities.
            //So this: <blink>
            //Becomes: &lt;blink&gt;

            naughty = 'alert|applet|audio|basefont|base|behavior|bgsound|blink|body|embed|expression|form|frameset|' +
                      'frame|head|html|ilayer|iframe|input|isindex|layer|link|meta|object|plaintext|style|script|textarea|' +
                      'title|video|xml|xss';

            converted_string = converted_string.replace( new RegExp( '<(/*\\s*)(' + naughty + ')([^><]*)([><]*)', 'gi' ), function( m, a, b, c, d ) {
                return '&lt;' + a + b + c + d.replace( '>', '&gt;' ).replace( '<', '&lt;' );
            } );

            //Sanitize naughty scripting elements Similar to above, only instead of looking for
            //tags it looks for PHP and JavaScript commands that are disallowed.  Rather than removing the
            //code, it simply converts the parenthesis to entities rendering the code un-executable.
            //For example:    eval('some code')
            //Becomes:        eval&#40;'some code'&#41;
            converted_string = converted_string.replace( /(alert|cmd|passthru|eval|exec|expression|system|fopen|fsockopen|file|file_get_contents|readfile|unlink)(\s*)\((.*?)\)/gi, '$1$2&#40;$3&#41;' );

            //This adds a bit of extra precaution in case something got through the above filters
            for( i in never_allowed_str ) {
                if( never_allowed_str.hasOwnProperty( i ) ) {
                    converted_string = converted_string.replace( new RegExp( i, "gi" ), never_allowed_str[i] );
                }
            }
            for( i in never_allowed_regex ) {
                if( never_allowed_regex.hasOwnProperty( i ) ) {
                    converted_string = converted_string.replace( new RegExp( i, 'gi' ), never_allowed_regex[i] );
                }
            }

            //Images are handled in a special way
            if( is_image && converted_string !== converted_string ) {
                throw new Error( 'Image may contain XSS' );
            }

            // Note in debug output when a string has been changed
            if( converted_string !== myOriginalStr ) {
                Y.log( 'Invalid input scrubbed.', 'warn', NAME );
                Y.log( 'Invalid input: ' + myOriginalStr + '  |  ' + converted_string, 'debug', NAME );
            }

            return converted_string;
        }

        function remove_invisible_characters( str ) {
            var
                i,
                l = non_displayables.length;

            if( str && 'string' === typeof str ) {
                for( i = 0; i < l; i++ ) {
                    str = str.replace( non_displayables[i], '' );
                }
            } else {
                if( undefined === str ) {
                    str = '';
                }
            }
            return str;
        }

         // MOJ-2881, taking out for now. this doesnt work with binary files and can go into an infinite loop.
//        function xss_hash() {
//            /*jshint bitwise:false */
//            var
//                str = '',
//                num = 10;
//
//            while( num-- ) {
//                str += String.fromCharCode( Math.random() * 25 | 97 );
//            }
//            return str;
//        }

        function convert_attribute( str ) {
            return str.replace( '>', '&gt;' ).replace( '<', '&lt;' ).replace( '\\', '\\\\' );
        }

        function filter_attributes( str ) {
            var comments = /\/\*.*?\*\//g;

            return str
                .replace( /\s*[a-z-]+\s*=\s*'[^']*'/gi, function( m ) {
                    return m.replace( comments, '' );
                } )
                .replace( /\s*[a-z-]+\s*=\s*"[^"]*"/gi, function( m ) {
                    return m.replace( comments, '' );
                } )
                .replace( /\s*[a-z-]+\s*=\s*[^\s]+/gi, function( m ) {
                    return m.replace( comments, '' );
                } );
        }

        /**
         *  Method to sanitize an object before storing it in the DB
         *  This will add the taint_ property which is later used by the database laybe to ensure the object is safe
         *  before storing it in the database.
         *
         *  @param   {Object}    obj    Object to be sanitized for XSS and other nasties
         *  @private
         */

        function _cleanAndAddTaint( obj ) {

            //if( Y.config.debug ) {
            //Y.log( JSON.stringify(obj), 'debug', NAME );
            //}

            //  Strings may sometimes be passed as data to model.put(), we can't taint them, but filter them anyway
            if( 'object' !== (typeof obj) ) {
                return _clean( obj, false, [] );
            }

            //  KILLSWITCH
            //  If there is a problem with filtering breaking something it can be disabled by commenting this line:

            if( true === filterEnabled ) {
                obj = _clean( obj, false, [] );
            }

            if( true === taintCheckEnabled ) {
                //  DB layer will check presence and content of this property before model.post() and model.put()
                obj.taint_ = createTaintValue( obj, 0 );

            } else {
                //  We don't do taint checking in production for performance reasons
                obj.skipcheck_ = true;

            }

            return obj;
        }

        /**
         *  Clean properties of an object from mongo CRM given the name of a DC schema
         *
         *  Note that this returns a plain JS object with fields defined in schema, not a mongoose object
         *
         *  @method cleanMongoObject
         *  @param obj {Object} The data object to be written.
         *  @param schema {Object} The schema object relevant to this MongoDB data
         *                  (i.e. will not check returned legacy data that is in the data
         *                  but not in the schema)
         *  @return {Object} obj with an additional taint field that is scrubbed out by the DBLayer.
         */

        function _cleanMongoObject( obj, schema ) {

            //  logging can get a bit much when working with files stored in database, so trimmed to 1kb
            Y.log( 'Entering _cleanMongoObject(obj, "' + schema.name + '")', 'debug', NAME );
            if( Y.config.debug ) {
                Y.log( JSON.stringify( obj).substring(0, 1024), 'debug', NAME );
            }

            if( false === filterEnabled ) {
                return obj;
            }

            var
                k,
                newObj = {};
            //  recursively filter all properties defined in schema and present in onj

            for( k in schema.schema ) {
                if( 'undefined' !== typeof obj[k] ) {
                    //Y.log( 'Cleaning property ' + k + ' of type ' + (typeof obj[k]), 'debug', NAME );

                    if( 'object' === typeof obj[k] ) {
                        if( Y.config.debug ) {
                            Y.log( 'Filtering object property ' + k + ': ' + JSON.stringify( obj[k]).substring(0,1024), 'debug', NAME );
                        }
                        newObj[k] = _clean( JSON.parse( JSON.stringify( obj[k] ) ), false, [] );
                    } else {
                        newObj[k] = _clean( obj[k], false, [] );
                    }
                }
            }

            //  add or skip taint value

            if( true === taintCheckEnabled ) {
                //  DB layer will check presence and content of this property before model.post() and model.put()
                newObj.taint_ = createTaintValue( newObj, 0 );

            } else {
                //  We might skip taint checking in production for performance reasons
                newObj.skipcheck_ = true;

            }

            return newObj;
        }

        /**
         *  This hashes all string values in the passed object unless named 'taint_'
         *  This value is to be checked by the database layer, it recursively hashes all nested objects
         *  Note that the order of properties matters, changing their order will change the hash
         *
         *  @param   {Object}  obj   A clean object
         *  @param   {number}  iter  Depth of recursion
         *  @return  {String}        md5 hash of all properties
         */

        function createTaintValue( obj, iter ) {
            var
                maxIter = 10,                                //% Max recursion [int]
                md5generator = crypto.createHash( 'md5' ),   //% Computes md5 hash [object]
                k,                                           //% Key for enumerating objects [string|int]

                //  some fields are not considered when calculating taint, because they are metadata for
                //  the db layer or processes
                notInTaint = [ 'taint_', 'fields_', 'ignoreReadOnly_', '_rest' ];

            if( !iter ) {
                iter = 0;
            }
            iter = iter + 1;

            if( iter >= maxIter ) {
                Y.log( 'Database object contains circular reference or is more than 10 nestings deep.', 'warn', NAME );
                return 'error';
            }

            if( 'object' !== (typeof obj) ) {
                return false;
            }

            for( k in obj ) {
                if ( -1 === notInTaint.indexOf( k ) ) {
                    //  This ignores numbers, etc on the assumption that they are safe if correct and will be
                    //  rejected by validation if incorrectly typed

                    // noisy but useful if there is a problem
                    //if( Y.config.debug ) {
                    //Y.log('hashing property ' + k + ': ' + JSON.stringify(k), 'debug', NAME);
                    //}

                    if( 'string' === (typeof obj[k]) ) {
                        md5generator.update( obj[k] );
                    }
                    if( 'object' === (typeof obj[k]) ) {
                        md5generator.update( createTaintValue( obj[k], 0 ) );
                    }

                }
            }

            return md5generator.digest( 'hex' );
        }

        /**
         *  Read the application.json file to check whether we are in production or development environment
         *  @private
         */

        function _readApplicationSettings() {
            var
                appconfig = {};


            function onJsonLoaded() {
                appconfig = require( 'dc-core' ).config.load( process.cwd() + '/application.json' );

                if( appconfig.hasOwnProperty( 'security' ) ) {
                    if( appconfig.security.hasOwnProperty( 'xssfilter' ) ) {
                        filterEnabled = appconfig.security.xssfilter;
                    }
                    if( appconfig.security.hasOwnProperty( 'taintcheck' ) ) {
                        taintCheckEnabled = appconfig.security.taintcheck;
                    }
                }

            }

            onJsonLoaded();
        }

        /**
         *  Check whether taint validation will be performed on this object
         *  @param  obj     {Object}    A plain object to be saved ot the database
         *  @return         {Boolean}   True if taint validation is to be skipped for this, else false
         */

        function _getSkipCheck( obj ) {
            if( 'object' !== typeof obj ) {
                return false;
            }

            if( 'undefined' === typeof obj.skipcheck_ ) {
                return false;
            }
            return true;
        }

        /**
         *  Flag whether or not taint checking is performed on an object
         *
         * @method setSkipCheck
         *  @param obj      {Object}    Plain javascript object to be saved to db
         *  @param value    {Boolean}   True if taint checking is to be skipped, false if not
         *  @return         {Boolean}   True if change was made, false if no chaange
         */

        function _setSkipCheck( obj, value ) {

            if( 'object' !== typeof obj ) {
                //  not possible to taint check this
                return false;
            }

            if( true === value ) {
                // turn taint checking off
                if( 'undefined' === typeof obj.skipcheck_ ) {
                    obj.skipcheck_ = true;
                    return true;
                }
            } else {
                // turn taint checking on
                if( 'undefined' === typeof obj.skipcheck_ ) {
                    delete obj.skipcheck_;
                    return true;
                }
            }

            //  no change
            return false;
        }

        /**
         *  Check if a filename contains invalid characters
         *
         * @method isLegalFileName
         *  @param  fileName    {String}    Basename only
         *  @return             {Boolean}   True if legal, false if not
         */

        function _isLegalFileName( fileName ) {
            var
                i,
                ok,
                currChar;

            for( i = 0; i < fileName.length; i++ ) {

                ok = false;             //  assume any other charachter is suspect

                currChar = fileName.charCodeAt( i );
                if( (47 <= currChar) && (currChar <= 57) ) {
                    ok = true;
                }      //  [0-9] and '/'
                if( (65 <= currChar) && (currChar <= 90) ) {
                    ok = true;
                }      //  [A-Z]
                if( (97 <= currChar) && (currChar <= 122) ) {
                    ok = true;
                }     //  [a-z]
                if( 45 === currChar ) {
                    ok = true;
                }                           //  -
                if( 46 === currChar ) {
                    ok = true;
                }                           //  .
                if( 95 === currChar ) {
                    ok = true;
                }                           //  _
                if( 32 === currChar ) {
                    ok = true;
                }                           //  _

                if( false === ok ) {
                    Y.log(
                        'Bad char ' + fileName[i] + ' (' + currChar + ') in file name ' + fileName,
                        'debug',
                        NAME
                    );
                    return false;
                }
            }

            return true;
        }
        /**
         *  Holds Filter Options to filter sensible data from identity.get calls which is not needed.
         *
         * @method noAuthenticaionProps
         *  @param  user    {obj}    user obj
         *  @return         {obj}    use the return in mongoDb calls for options fields{}
         */

        function noAuthenticaionProps(user) {
            if (Y.doccirrus.auth.isAdminUser(user)) {
                return {};
            } else {
                return {
                    _id: 1,
                    firstname: 1,
                    lastname: 1,
                    memberOf: 1,
                    specifiedBy: 1,
                    status: 1,
                    username: 1,
                    validFrom: 1,
                    validTo: 1,
                    locations: 1
                };
            }
        }


        /**
         * Function for filtering input.
         * Currently affinity common, so that the schemas can also be loaded without failure in client.
         *
         * It may be advisable to make wa separate client-side class, that is lighter weight for the
         * client side. FUTURE: That could be hooked in using the mojito affinity facade
         * (as in utils.client vs. utils.server)
         *
         * @class DCFilter
         * @constructor
         */

        function DCFilter() {

            //  read configuration from application.json
            _readApplicationSettings();

            //  add public methods
            this.clean = _clean;
            this.cleanDbObject = _cleanAndAddTaint;
            this.cleanMongoObject = _cleanMongoObject;
            this.getSkipCheck = _getSkipCheck;
            this.setSkipCheck = _setSkipCheck;
            this.isLegalFileName = _isLegalFileName;
            this.createTaintValue = createTaintValue;
            this.noAuthenticaionProps = noAuthenticaionProps;

        }

        /*
         *  Check config and instantiate
         */

        Y.namespace( 'doccirrus' ).filters = new DCFilter();

    },
    '0.0.1', {requires: []}
);
