/*
 @author: jm
 @date: 2015-08-12
 */

/**
 * Tools library for xDT data manipulation
 */

/*global YUI */

//TODO check for correct order of records ?
//TODO conditions for m/k fields
//TODO Regeltabelle

YUI.add( 'xdttools', function( Y, NAME ) {
        const
            moment = require( 'moment' ),
            util = require( 'util' );
            // {formatPromiseResult} = require( 'dc-core' ).utils;

        /**
         * parses xdt bytes into readable object
         * @class XdtTools
         */
        let XdtTools = {};
        XdtTools.name = NAME;

        /**
         * searches for field ID of given attribute
         * @method getFieldIdByAttribute
         * @param {String} attribute
         * @param {Object} xdt the xdt version to use
         *
         * @return {String | false}
         */
        XdtTools.getFieldIdByAttribute = function getFieldIdByAttribute( attribute, xdt ) {
            for( let field in xdt.fields ) {
                if( xdt.fields.hasOwnProperty( field ) ) {
                    if( attribute === xdt.fields[field].attribute || `${attribute}.date` === xdt.fields[field].attribute ) {
                        return field;
                    }
                }
            }
            if( xdt.objects[attribute] ) {
                return attribute;
            }
            return false;
        };

        /**
         * searches for entire info entry of given attribute
         * @method getInfoByAttribute
         * @param {String} attribute
         * @param {Object} xdt the xdt version to use. xdt objects can get this data from Y.doccirrus.api.xdtVersions[xdtObj.versionUsed.type][xdtObj.versionUsed.name]
         *
         * @return {String | false}
         */
        XdtTools.getInfoByAttribute = function getInfoByAttribute( attribute, xdt ) {
            for( let field in xdt.fields ) {
                if( xdt.fields.hasOwnProperty( field ) ) {
                    if( attribute === xdt.fields[field].attribute || `${attribute}.date` === xdt.fields[field].attribute ) {
                        return xdt.fields[field];
                    }
                }
            }
            if( xdt.objects[attribute] ) {
                return {attribute: attribute, desc: attribute.substring( 4, attribute.length )};
            }
            return false;
        };

        /**
         * searches for entire info entry of given attribute
         * @method getInfoByAttribute
         * @param {String} key
         * @param {Object} xdt the xdt version to use. xdt objects can get this data from Y.doccirrus.api.xdtVersions[xdtObj.versionUsed.type][xdtObj.versionUsed.name]
         *
         * @return {String | false}
         */
        XdtTools.getInfoByKey = function getInfoByKey( key, xdt ) {
            for( let field in xdt.fields ) {
                if( xdt.fields.hasOwnProperty( field ) ) {
                    if( field === key ) {
                        return xdt.fields[field];
                    }
                }
            }
            if( xdt.objects[key] ) {
                return {attribute: key, desc: key.substring( 4, key.length )};
            }
            return false;
        };

        /**
         * prints the given raw xdt string with highlighting and line numbers
         * @method colorPrint
         * @param {String} xdtString
         */
        XdtTools.colorPrint = function colorPrint( xdtString ) {
            const xdtLines = xdtString.split( '\n' );

            for( let i = 0; i < xdtLines.length; i++ ) {
                const xdtLine = xdtLines[i];
                if( xdtLine ) {
                    Y.log(
                        `${XdtTools.setf( XdtTools.f.color.grey ) +
                           XdtTools.pad( `${i + 1}`, xdtLines.length.toString().length, " " )}  ${XdtTools.setf( XdtTools.f.color.green )}${xdtLine.substring( 0, 3 )}${XdtTools.setf( XdtTools.f.color.cyan )}${xdtLine.substring( 3, 7 )}${XdtTools.setf( XdtTools.f.reset.color )}${xdtLine.substring( 7, xdtLine.length ).replace( /\[CR]\[LF]/g,
                            `${XdtTools.setf( XdtTools.f.color.grey )}[CR][LF]${XdtTools.setf( XdtTools.f.reset.color )}`
                        )}`,
                        "debug", NAME );
                }
            }
        };

        /**
         * prints given xdt object as readable list with indentation
         * @method prettyPrint
         * @param {Object} xdtObj the xdt object to use
         */
        XdtTools.prettyPrint = function prettyPrint( xdtObj ) {
            Y.log( `\n${XdtTools.prettyText( xdtObj )}\n\n`, "debug", NAME );
        };

        /**
         * prints given xdt object as readable list with indentation
         * @method prettyText
         * @param {Object} xdtObj the xdt object to use
         * @param {Boolean} [useHtml] use html tags
         * @param {Boolean} [reverse] print lines in reverse
         * @param {Boolean} [noEndBreak] don't add the break after each block
         *
         * @return {String}
         */
        XdtTools.prettyText = function prettyText( xdtObj, useHtml, reverse, noEndBreak ) {
            const
                htmlK = "<span style='color: grey;'>",
                htmlKE = "</span>",
                htmlV = "<span style='color: black;'>",
                htmlVE = "</span>",
                taggedPrint = false;

            function tdbg( msg ) {
                if( taggedPrint ) {
                    print( (useHtml ? "<span style='color: darkred;'>" : "\x1b[90mxdtParser print debug: ") + msg + (useHtml ? "</span>" : "\x1b[0m") );
                } else {
                    Y.log( msg, 'debug', NAME );
                }
            }

            let outputStr = "";

            function print( text ) {
                if( reverse ) {
                    outputStr = (text ? text : "") + (useHtml ? "<br>" : "\n") + outputStr;
                } else {
                    outputStr += (text ? text : "") + (useHtml ? "<br>" : "\n");
                }
            }

            //Y.log("\n\n-------------------------------------------------------------------------------prettyprinted xdt\n");
            //Y.log("version used: "+ util.inspect(xdtObj.versionUsed)+"\n");
            let xdt;
            if( Y.doccirrus.api.xdtVersions[xdtObj.versionUsed.type][xdtObj.versionUsed.name] ) {
                xdt = Y.doccirrus.api.xdtVersions[xdtObj.versionUsed.type][xdtObj.versionUsed.name];
            } else {
                Y.log( "prettyText failed due to lack of spec.", 'warn' );
                try {
                    return JSON.stringify( xdtObj, null, "    " ).replace( /[{}"]/g, "" ).replace( /,\n {4}|,\n|\n {4}/g, "\n" );
                } catch( e ) {
                    Y.log( "failed backup stringifier for missing xdt version:" );
                    Y.log( e );
                    return "";
                }
            }

            function printLine( prop, propInfo, hideName ) {
                if( propInfo.mapper && xdt.stringMappers[propInfo.mapper] ) {
                    const val = xdt.stringMappers[propInfo.mapper]( prop, propInfo );
                    tdbg( `[STRINGMAPPER] (${util.inspect( val )})` );

                    if( useHtml ) {
                        if( val[0] && val[0].replace ) {
                            val[0] = val[0].replace( / /g, "&nbsp;" );
                        }
                        if( val[1] && val[1].replace ) {
                            val[1] = val[1].replace( / /g, "&nbsp;" );
                        }
                    }

                    if( val[1] ) {
                        return `${(useHtml ? htmlK : "") + val[0]}: ${useHtml ? htmlKE : ""}${useHtml ? htmlV : ""}${val[1]}${useHtml ? htmlVE : ""}`;
                    } else {
                        return (useHtml ? htmlV : "") + val[0] + (useHtml ? htmlVE : "");
                    }
                } else {
                    //if (debug) {return (hideName?"":propInfo.desc+": ")+util.inspect(prop);}
                    //else {return (hideName?"":propInfo.desc+": ")+prop;}
                    if( useHtml ) {
                        return (hideName ? "" : `${htmlK + propInfo.desc}: ${htmlKE}`) + htmlV + (prop && prop.replace ? prop.replace( / /g, "&nbsp;" ) : prop) + htmlVE;
                    } else {
                        return (hideName ? "" : `${propInfo.desc}: `) + prop;
                    }
                }
            }

            function getIndent( level ) {
                let indent = "";
                for( let ii = 0; ii < level; ii++ ) {
                    indent += useHtml ? "&nbsp;&nbsp;&nbsp;&nbsp;" : "    ";
                }
                return indent;
            }

            function defaultHandler( prop, propInfo, level, hideName ) {
                tdbg( `[DEFAULT] (${level})` );
                tdbg( `[PROP] (${util.inspect( prop )})` );
                tdbg( `[PROPINFO] (${util.inspect( propInfo )})` );
                print( getIndent( level ) + printLine( prop, propInfo, hideName ) );
            }

            function arrayHandler( prop, propInfo, level ) {
                tdbg( "[ARRAY]" );
                for( let i = reverse ? prop.length - 1 : 0; reverse ? i >= 0 : i < prop.length; reverse ? i-- : i++ ) {
                    const subProp = prop[i];
                    //nonstandard check
                    if( '[object Object]' === Object.prototype.toString.call( subProp ) && subProp.head ) {
                        objectHandler( subProp, propInfo, level );
                    } else if( propInfo.mapper && xdt.stringMappers[propInfo.mapper] ) {
                        tdbg( "[MAPPED]" );
                        print( getIndent( level ) + printLine( subProp, propInfo, true ) );
                    } else {
                        defaultHandler( subProp, propInfo, level, true );
                    }
                }
            }

            function objectHandler( prop, propInfo, level ) {
                const indent = getIndent( level );
                tdbg( "[OBJECT]" );
                if( prop.head ) {
                    let children = Object.keys( prop ).length - 1;
                    tdbg( "[HEAD]" );
                    if( propInfo.mapper && xdt.stringMappers[propInfo.mapper] ) {
                        const val = xdt.stringMappers[propInfo.mapper]( prop, propInfo );

                        if( val[2] && reverse ) {
                            for( let subPropR in prop ) {
                                if( prop.hasOwnProperty( subPropR ) && "head" !== subPropR ) {
                                    let subPropInfoR = XdtTools.getInfoByAttribute( subPropR, xdt );
                                    standardCheck( prop[subPropR], subPropInfoR, level + 1 );
                                }
                            }
                        }

                        if( useHtml ) {
                            if( val[0] && val[0].replace ) {
                                val[0] = val[0].replace( / /g, "&nbsp;" );
                            }
                            if( val[1] && val[1].replace ) {
                                val[1] = val[1].replace( / /g, "&nbsp;" );
                            }
                        }
                        if( val[1] || "" === val[1] ) {
                            print( `${indent + (useHtml ? htmlK : "") + val[0]}: ${useHtml ? htmlKE : ""}${useHtml ? htmlV : ""}${val[1]}${useHtml ? htmlVE : ""}` );
                        } else if( val[0] ) {
                            print( indent + (useHtml ? htmlK : "") + val[0] + (useHtml ? htmlKE : "") );
                        }

                        if( !reverse && val[2] ) {
                            for( let subProp in prop ) {
                                if( prop.hasOwnProperty( subProp ) && "head" !== subProp ) {
                                    let subPropInfo = XdtTools.getInfoByAttribute( subProp, xdt );
                                    standardCheck( prop[subProp], subPropInfo, level + 1 );
                                }
                            }
                        }
                    } else {
                        if( reverse ) {
                            for( let subPropR in prop ) {
                                if( prop.hasOwnProperty( subPropR ) && "head" !== subPropR ) {
                                    let subPropInfoR = XdtTools.getInfoByAttribute( subPropR, xdt );
                                    standardCheck( prop[subPropR], subPropInfoR, level + 2 );
                                }
                            }
                            print( getIndent( level ) + (useHtml ? htmlK : "") + prop.head + (children ? ":" : "") + (useHtml ? htmlKE : "") );
                            // print(getIndent(level)+(useHtml?htmlK:"")+propInfo.desc+":"+(useHtml?htmlKE:""));
                        }
                        if( !reverse ) {
                            // print(getIndent(level)+(useHtml?htmlK:"")+propInfo.desc+":"+(useHtml?htmlKE:""));
                            print( getIndent( level ) + (useHtml ? htmlK : "") + prop.head + (children ? ":" : "") + (useHtml ? htmlKE : "") );
                            for( const subProp in prop ) {
                                if( prop.hasOwnProperty( subProp ) && "head" !== subProp ) {
                                    const subPropInfo = XdtTools.getInfoByAttribute( subProp, xdt );
                                    standardCheck( prop[subProp], subPropInfo, level + 1 );
                                }
                            }
                        }
                    }
                } else if( xdt.objects[propInfo.attribute] ) {
                    tdbg( "[HEADLESS]" );
                    let val = xdt.objects[propInfo.attribute] && xdt.objects[propInfo.attribute].desc;
                    let hideObj = xdt.objectStyle && xdt.objectStyle.startsWith( 'ldt3' );
                    if( !reverse && !hideObj ) {
                        print( `${(useHtml ? htmlK : "") + indent + (val || propInfo.attribute)}:${useHtml ? htmlKE : ""}` );
                    }
                    for( const objPropName in prop ) {
                        if( prop.hasOwnProperty( objPropName ) ) {
                            const objProp = prop[objPropName];
                            const objPropInfo = XdtTools.getInfoByAttribute( objPropName, xdt );
                            standardCheck( objProp, objPropInfo, level + (hideObj ? 0 : 1) );
                        }
                    }
                } else {
                    defaultHandler( prop, propInfo, level );
                }
            }

            function standardCheck( prop, propInfo, level ) {
                const indent = getIndent( level );
                tdbg( `[STANDARD CHECK] (${propInfo.attribute})` );
                if( '[object Array]' === Object.prototype.toString.call( prop ) ) {
                    let val = propInfo.desc;
                    let hideObj = xdt.objectStyle && xdt.objectStyle.startsWith( 'ldt3' ) && xdt.objects[propInfo.attribute];
                    if( xdt.objects[propInfo.attribute] ) {
                        val = xdt.objects[propInfo.attribute] && xdt.objects[propInfo.attribute].desc;
                    }
                    if( !reverse && !hideObj ) {
                        print( `${indent + (useHtml ? htmlK : "") + val}:${useHtml ? htmlKE : ""}` );
                    }
                    arrayHandler( prop, propInfo, level + (hideObj ? 0 : 1) );
                    if( reverse && !hideObj ) {
                        print( `${indent + (useHtml ? htmlK : "") + val}:${useHtml ? htmlKE : ""}` );
                    }
                } else if( '[object Object]' === Object.prototype.toString.call( prop ) ) {
                    objectHandler( prop, propInfo, level );
                } else {
                    defaultHandler( prop, propInfo, level );
                }
            }

            for( let i = 0; i < xdtObj.records.length; i++ ) {
                const record = xdtObj.records[i];
                if( !noEndBreak ) {
                    print();
                }
                for( const propName in record ) {
                    if( record.hasOwnProperty( propName ) ) {
                        const prop = record[propName];
                        const propInfo = XdtTools.getInfoByAttribute( propName, xdt );
                        standardCheck( prop, propInfo, 0 );
                    }
                }
            }
            return (useHtml ? "<code style='padding: 0; background: none; font-family: monospace,monospace;'>" : "") + outputStr + (useHtml ? "</code>" : "");
        };

        XdtTools.f = {
            format: {
                bold: 1,
                italic: 3,
                underline: 4,
                inverse: 7
            },
            color: {
                black: 30,
                red: 31,
                green: 32,
                yellow: 33,
                blue: 34,
                magenta: 35,
                cyan: 36,
                lightGrey: 37,
                grey: 90,
                lightRed: 91,
                lightGreen: 92,
                lightYellow: 93,
                lightBlue: 94,
                lightMagenta: 95,
                lightCyan: 96,
                white: 97
            },
            bg: {
                black: 40,
                red: 41,
                green: 42,
                yellow: 43,
                blue: 44,
                magenta: 45,
                cyan: 46,
                lightGrey: 47,
                grey: 100,
                lightRed: 101,
                lightGreen: 102,
                lightYellow: 103,
                lightBlue: 104,
                lightMagenta: 105,
                lightCyan: 106,
                white: 107
            },
            reset: {
                all: 0,
                bold: 21,
                dim: 22,
                underlined: 24,
                blink: 25,
                reverse: 27,
                hidden: 28,
                color: 39,
                bg: 49
            }
        };
        /**
         * pads a string with the given fill string
         * @method pad
         * @param {String} str
         * @param {Number} len
         * @param {String} fill
         * @param {Boolean} [addLast]
         *
         * @return {String}
         */
        XdtTools.pad = function pad( str, len, fill, addLast ) {
            str = str.toString();
            while( str.length < len ) {
                str = addLast ? str + fill : fill + str;
            }
            return addLast ? str.substr( 0, len ) : str.substr( -1 * len );
        };

        XdtTools.trim = function trim( str, len, trimLast ) {
            str = str.toString();
            if( str.length > len ) {
                return trimLast ? str.substr( 0, len ) : str.substr( -1 * len );
            } else {
                return str;
            }
        };

        XdtTools.setf = function setf( key ) {
            return `\x1b[${key}m`;
        };

        /**
         * adds the line length to the beginning
         * @method addLength
         * @param {Array} arr
         * @param {String} encoding
         *
         * @return {Function}
         */
        XdtTools.addLength = function addLength( arr, encoding ) {
            const bop = Y.doccirrus.api.bop;

            let len = (arr.length + 3).toString();
            while( len.length < 3 ) {
                len = `0${len}`;
            }
            return bop.char2buff( len, encoding, true ).concat( arr );
        };

        /**
         * adds linebreaks
         * @method addCRLF
         * @param {Array} arr
         * @param {String} encoding
         *
         * @return {Function}
         */
        XdtTools.addCRLF = function addCRLF( arr, encoding ) {
            return arr.concat( Y.doccirrus.api.bop.char2buff( "[CR][LF]", encoding, true ) );
        };

        /**
         * creates line
         * @method createLine
         * @param {String} attribute
         * @param {String} value
         * @param {Object} xdt
         * @param {String} encoding
         *
         * @return {Function | false}
         */
        XdtTools.createLine = function createLine( attribute, value, xdt, encoding ) {
            const attrFieldId = XdtTools.getFieldIdByAttribute( attribute, xdt );
            dbg( `line: ${attrFieldId} ${value}` );
            if( !attrFieldId ) {
                return false;
            }
            //return line as int array with newline and length
            return XdtTools.addLength( XdtTools.addCRLF( Y.doccirrus.api.bop.char2buff( attrFieldId + value, encoding, true, true ), encoding ), encoding );
        };

        /**
         * creates line
         * @method createLineByKey
         * @param {String} key
         * @param {String} value
         * @param {Object} xdt
         * @param {String} encoding
         *
         * @return {Function | false}
         */
        XdtTools.createLineByKey = function createLineByKey( key, value, xdt, encoding ) {
            if( !key ) {
                return false;
            }
            //return line as int array with newline and length
            return XdtTools.addLength( XdtTools.addCRLF( Y.doccirrus.api.bop.char2buff( key + value, encoding, true, true ), encoding ), encoding );
        };

        /**
         * creates line and trims content as needed
         * @method addLineTrimmed
         * @param {String} attribute
         * @param {String} val
         * @param {String} gdt
         * @param {Object} trimFront
         * @param {String} encoding
         *
         * @return {Function}
         */
        XdtTools.addLineTrimmed = function addLineTrimmed( attribute, val, gdt, trimFront, encoding ) {
            let len;
            if( gdt.fields[attribute] ) {
                len = gdt.fields[attribute].len;
            } else {
                len = XdtTools.getInfoByAttribute( attribute, gdt ).len;
            }
            return XdtTools.createLine( attribute, len ? XdtTools.trim( val, len, trimFront ) : val, gdt, encoding );
        };

        /**
         * gets the set code based on the attribute
         * @method getSetId
         * @param {String} attribute
         * @param {Object} xdt
         *
         * @return {Number}
         */
        XdtTools.getSetId = function getSetId( attribute, xdt ) {
            for( const satz in xdt.saetze ) {
                if( xdt.saetze.hasOwnProperty( satz ) ) {
                    if( attribute === xdt.saetze[satz].attribute ) {
                        return satz;
                    }
                }
            }
        };

        /**
         *  Make a simple hash of buffer to prevent double-saving (unnecessary PUTs in response to events like mouse clicks)
         *
         *  credit: http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
         *  credit: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
         *
         *  @param {Buffer} buff    Some buffer to hash
         *
         *  @return {String}
         *
         */
        XdtTools.fastHash = function fastHash( buff ) {
            let hash = 0, i;

            if( 0 === buff.length ) {
                return hash;
            }

            /*jshint bitwise:false*/
            for( i = 0; i < buff.length; i++ ) {
                hash = (((hash << 5) - hash) + buff[i]);
                hash = hash & hash;
            }

            return hash;
        };

        /**
         * checks the validity of a certain value length with the given length(s) statement.
         * accepts: N (single number), <=N (less-than-N), N-N (range), X,X (array of the aforementioned)
         * @method getSetId
         * @param {String} lens
         * @param {Number} valLen
         *
         *  @return {Boolean}
         */
        XdtTools.lenCheck = function lenCheck( lens, valLen ) {
            dbg( `lenCheck...: ${lens} :: ${valLen}` );
            lens = lens.split( "," );
            for( let i = 0; i < lens.length; i++ ) {
                const rLen = lens[i].split( "-" );
                if(
                    (
                        rLen.length > 1 &&
                        parseInt( rLen[0], 10 ) <= valLen &&
                        parseInt( rLen[1], 10 ) >= valLen
                    ) || (
                        "<=" === lens[i].substr( 0, 2 ) &&
                        valLen <= parseInt( lens[i].substr( 2 ), 10 )
                    ) || (
                        parseInt( lens[i], 10 ) === valLen
                    )
                ) {
                    dbg( "success" );
                    return true;
                }
            }
            dbg( "failure" );
            return false;
        };

        /**
         * searches for the smallest acceptable length based on lenCheck's syntax
         * @method minLen
         * @param {String} lens
         *
         * @return {Number}
         */
        XdtTools.minLen = function minLen( lens ) {
            if( !lens ) {
                return 0;
            }
            let min = -1;
            lens = lens.split( "," );
            for( let i = 0; i < lens.length; i++ ) {
                const rLen = lens[i].split( "-" );
                if( rLen.length > 1 && (parseInt( rLen[0], 10 ) < min || -1 === min) ) {
                    min = parseInt( rLen[0], 10 );
                } else if( "<=" === lens[i].substr( 0, 2 ) ) {
                    min = 0;
                    break;
                } else if( parseInt( lens[i], 10 ) < min || -1 === min ) {
                    min = parseInt( lens[i], 10 );
                }
            }
            return min;
        };

        /**
         * searches for the largest acceptable length if any, based on lenCheck's syntax
         * @method maxLen
         * @param {String} lens
         *
         *  @return {Number}
         */
        XdtTools.maxLen = function maxLen( lens ) {
            if( !lens ) {
                return false;
            }
            var max = -1;
            lens = lens.split( "," );
            for( let i = 0; i < lens.length; i++ ) {
                const rLen = lens[i].split( "-" );
                if( rLen.length > 1 && (parseInt( rLen[1], 10 ) > max || -1 === max) ) {
                    max = parseInt( rLen[1], 10 );
                } else if( "<=" === lens[i].substr( 0, 2 ) && (parseInt( lens[i].substr( 2 ), 10 ) > max || -1 === max) ) {
                    max = parseInt( lens[i].substr( 2 ), 10 );
                } else if( parseInt( lens[i], 10 ) > max || -1 === max ) {
                    max = parseInt( lens[i], 10 );
                }
            }
            return max;
        };

        /**
         * @method metaRecordBuilder
         * @param {String} recordType must be one of the saetze entry attributes
         * @param {Array} entries list of objects of lines to be added, minus the record type and length (which are added automatically)
         * @param {String} entries.key line attribute - the xdt attribute to be used
         * @param {String} entries.val line attribute - the the value to use
         * @param {Boolean} [entries.optional] line attribute - if val will be checked if it exists or not
         * @param {Boolean} [entries.padStart] line attribute - if the padding and trimming should be done at the beginning instead of the end of the string
         * @param {String} [entries.pad] line attribute - the character(s) used for padding
         * @param {Object} xdt xDT version to use
         * @param {String} encoding valid encoding string name based on BOP encodings
         * @param {Function} [ignoreLen] ignore length restrictions
         * @param {Function} [callback]
         *
         * @return {Function}
         */
        XdtTools.metaRecordBuilder = function metaRecordBuilder( recordType, entries, xdt, encoding, ignoreLen, callback ) {
            dbg( `cb: ${callback}` );

            //split into async/sync
            if( callback ) { //unhinge
                setTimeout( function() {
                    _metaRecordBuilder( callback );
                }, 0 );
            } else {
                return _metaRecordBuilder();
            }

            function _metaRecordBuilder( cb ) {
                dbg( "metaRecordBuilder..." );
                //entries before length entry
                //8000: recordType
                const headArray = XdtTools.createLine( "recordType", XdtTools.getSetId( recordType, xdt ), xdt, encoding );

                //entries after length entry
                let bodyArray = [];

                // run through actual input array.....
                for( let i = 0; i < entries.length; i++ ) {
                    const entry = entries[i];
                    const key = entry.key;
                    let val = entry.val;
                    dbg( `key: ${key}` );
                    dbg( `val: ${val}` );
                    const info = XdtTools.getInfoByAttribute( key, xdt );

                    if( val ) {
                        //convert types as needed
                        if( "date" === info.type ) {
                            val = val ? moment( val ).format( xdt.dateFormat ) : "";
                        } else if( "doubledate" === info.type ) {
                            val = moment( val[0] ).format( xdt.dateFormat ) + moment( val[1] ).format( xdt.dateFormat );
                        } else if( "time" === info.type ) {
                            val = moment( val ).format( xdt.timeFormat );
                        } else if( "longtime" === info.type ) {
                            val = moment( val ).format( xdt.longTimeFormat );
                        }

                        //pad/trim

                        if( !ignoreLen ) {
                            dbg( `min: ${XdtTools.minLen( info.len )}` );
                            dbg( `max: ${XdtTools.minLen( info.len )}` );

                            if( val.toString().length < XdtTools.minLen( info.len ) ) {
                                dbg( `padding '${val}' to...` );
                                val = XdtTools.pad( val, XdtTools.minLen( info.len ), entry.pad || " ", !entry.padStart );
                                dbg( `'${val}' (${!entry.padStart})` );
                            }
                            if( XdtTools.maxLen( info.len ) && val.toString().length > XdtTools.maxLen( info.len ) ) {
                                dbg( `trimming '${val}' to...` );
                                val = XdtTools.trim( val, XdtTools.maxLen( info.len ), !entry.padStart );
                                dbg( `'${val}' (${!entry.padStart})` );
                            }
                        }

                        const line = XdtTools.createLine( key, val, xdt, encoding );

                        if( line ) {
                            bodyArray = bodyArray.concat( line );
                        } else {
                            dbg( `invalid attribute for given xdt spec: ${key}` );
                            if( cb ) {
                                return cb( `invalid attribute for given xdt spec: ${key}` );
                            }
                            return;
                        }
                    } else {
                        if( !entry.optional ) {
                            Y.log( 'No entry content, but entry not optional.', 'warn', NAME );
                        }
                        // no return, just keep going.
                    }

                }

                //8100
                //redundant because this standard requires length values to include themselves AND everything before AND after the length value
                const lenFieldlen = XdtTools.getInfoByAttribute( "recordSize", xdt ).len;
                const emptyLengthLine = XdtTools.createLine( "recordSize", XdtTools.pad( "", lenFieldlen, "0" ), xdt, encoding );
                const fileLen = headArray.length + emptyLengthLine.length + bodyArray.length;
                const buffArray = headArray.concat( XdtTools.createLine( "recordSize", XdtTools.pad( fileLen, lenFieldlen, "0" ), xdt, encoding ) ).concat( bodyArray );
                const res = Buffer.from( buffArray );

                if( cb ) {
                    return cb( null, res );
                }
                return res;
            }
        };

        /**
         * @method metaRecordBuilderLDT3
         * @param {Object} args - arguments
         * @param {String} args.recordType must be one of the saetze entry attributes
         * @param {Array} args.entries list of objects of lines to be added, minus the record type and length (which are added automatically)
         * @param {String} args.entries.key line attribute - the xdt attribute to be used
         * @param {String} args.entries.val line attribute - the the value to use
         * @param {Boolean} [args.entries.optional] line attribute - if val will be checked if it exists or not
         * @param {Boolean} [args.entries.padStart] line attribute - if the padding and trimming should be done at the beginning instead of the end of the string
         * @param {String} [args.entries.pad] line attribute - the character(s) used for padding
         * @param {Object} args.xdt xDT version to use
         * @param {String} args.encoding valid encoding string name based on BOP encodings
         * @param {Function} [args.ignoreLen] ignore length restrictions
         * @returns {Buffer}
         */
        XdtTools.metaRecordBuilderLDT3 = async function metaRecordBuilderLDT3( args ) {
            const {
                recordType,
                entries,
                xdt,
                encoding,
                ignoreLen
            } = args;

            dbg( "metaRecordBuilderLDT3..." );
            //entries before length entry
            //8000: recordType
            const headArray = XdtTools.createLine( "recordType", XdtTools.getSetId( recordType, xdt ), xdt, encoding );
            const endArray = XdtTools.createLine( "recordEnd", XdtTools.getSetId( recordType, xdt ), xdt, encoding );

            //entries after length entry
            let bodyArray = [];

            // run through actual input array.....
            for( let i = 0; i < entries.length; i++ ) {
                const entry = entries[i];
                const key = entry.key;
                let val = entry.val;
                dbg( `key: ${key}` );
                dbg( `val: ${val}` );
                const info = XdtTools.getInfoByKey( key, xdt );

                if( val ) {
                    //convert types as needed
                    if( "date" === info.type ) {
                        val = val ? moment( val ).format( xdt.dateFormat ) : "";
                    } else if( "doubledate" === info.type ) {
                        val = moment( val[0] ).format( xdt.dateFormat ) + moment( val[1] ).format( xdt.dateFormat );
                    } else if( "time" === info.type ) {
                        val = moment( val ).format( xdt.timeFormat );
                    } else if( "longtime" === info.type ) {
                        val = moment( val ).format( xdt.longTimeFormat );
                    }

                    //pad/trim

                    if( !ignoreLen ) {
                        dbg( `min: ${XdtTools.minLen( info.len )}` );
                        dbg( `max: ${XdtTools.minLen( info.len )}` );

                        if( val.toString().length < XdtTools.minLen( info.len ) ) {
                            dbg( `padding '${val}' to...` );
                            val = XdtTools.pad( val, XdtTools.minLen( info.len ), entry.pad || " ", !entry.padStart );
                            dbg( `'${val}' (${!entry.padStart})` );
                        }
                        if( XdtTools.maxLen( info.len ) && val.toString().length > XdtTools.maxLen( info.len ) ) {
                            dbg( `trimming '${val}' to...` );
                            val = XdtTools.trim( val, XdtTools.maxLen( info.len ), !entry.padStart );
                            dbg( `'${val}' (${!entry.padStart})` );
                        }
                    }

                    const line = XdtTools.createLineByKey( key, val, xdt, encoding );

                    if( line ) {
                        bodyArray = bodyArray.concat( line );
                    } else {
                        dbg( `invalid attribute for given xdt spec: ${key}` );
                    }
                } else {
                    if( !entry.optional ) {
                        Y.log( 'No entry content, but entry not optional.', 'warn', NAME );
                    }
                    // no return, just keep going.
                }

            }
            return Buffer.from( headArray.concat( [...bodyArray, ...endArray] ) );
        };

        /**
         * @method metaRecordBuilderVersion3
         * @param {Object} args -
         * @param {String} args.key -
         * @param {Object|Array} args.entries list of objects of lines to be added, minus the record type and length (which are added automatically)
         * @param {Object} args.xDT xDT version to use
         * @param {String} args.encoding valid encoding string name based on BOP encodings
         * @param {Function} [args.ignoreLen] ignore length restrictions
         * @param {Function} [args.callback]
         * @param {Object} [args.xDTObject]
         * @returns {Array}
         */
        // XdtTools.metaRecordBuilderVersion3 = async function metaRecordBuilderVersion3( args ) {
        //     const
        //         {
        //             xDT,
        //             encoding,
        //             xDTObject
        //         } = args;
        //
        //     let
        //         {
        //             key,
        //             entries
        //         } = args;
        //
        //     if( !key || !xDT || !entries || !encoding ) {
        //         return;
        //     }
        //     key = key.replace( /^fk/g, '' );
        //
        //     let
        //         typeOfField = '',
        //         fieldsInOrder = [],
        //         childrenInOrder = [],
        //         err,
        //         line,
        //         satz,
        //         object,
        //         result = [],
        //         tmp = [],
        //         tmpLine = [],
        //         child,
        //         newEntries = [],
        //         hasChildren = false;
        //     if( Object.getOwnPropertyNames( xDT.saetze ).includes( key ) ) {
        //         typeOfField = 'satz';
        //     } else if( Object.getOwnPropertyNames( xDT.objects ).includes( key ) ) {
        //         typeOfField = 'object';
        //     } else if( Object.getOwnPropertyNames( xDT.fields ).includes( key ) ) {
        //         typeOfField = 'field';
        //     }
        //
        //     switch( typeOfField ) {
        //         case 'satz':
        //             //for each entry of satz call this function
        //             fieldsInOrder = Object.getOwnPropertyNames( xDT.saetze[key].fk );
        //             for( let i = 0; i < fieldsInOrder.length; i++ ) {
        //                 child = fieldsInOrder[i].replace( /^fk/g, '' );
        //
        //                 switch( child ) {
        //                     case xDT.recordType:
        //                     case xDT.recordEnd:
        //                         childrenInOrder = (xDT.saetze[key].fk[fieldsInOrder[i]].children && Object.getOwnPropertyNames( xDT.saetze[key].fk[fieldsInOrder[i]].children )) || [];
        //                         for( let j = 0; j < childrenInOrder.length; j++ ) {
        //                             [err, satz] = await formatPromiseResult(
        //                                 Y.doccirrus.api.xdtTools.metaRecordBuilderVersion3( {
        //                                     key: childrenInOrder[j],
        //                                     entries: entries,
        //                                     xDT: xDT,
        //                                     encoding: encoding,
        //                                     xDTObject: xDT.saetze[key].fk[fieldsInOrder[i]].children[childrenInOrder[j]]
        //                                 } )
        //                             );
        //                             if( err ) {
        //                                 throw err;
        //                             }
        //                             if( satz && satz.length ) {
        //                                 tmp = tmp.concat( satz );
        //                             }
        //                         }
        //                         break;
        //                     default:
        //                         [err, satz] = await formatPromiseResult(
        //                             Y.doccirrus.api.xdtTools.metaRecordBuilderVersion3( {
        //                                 key: child,
        //                                 entries: entries,
        //                                 xDT: xDT,
        //                                 encoding: encoding,
        //                                 xDTObject: xDT.saetze[key].fk[fieldsInOrder[i]]
        //                             } )
        //                         );
        //
        //                         if( err ) {
        //                             throw err;
        //                         }
        //                         if( satz && satz.length ) {
        //                             tmp = tmp.concat( satz );
        //                         }
        //                         break;
        //                 }
        //             }
        //
        //             if( tmp && tmp.length ) {
        //                 //beginning satz
        //                 line = XdtTools.createLineByKey( xDT.recordType, key, xDT, encoding );
        //                 if( !line ) {
        //                     throw `could not create beginning line of Satz ${key}`;
        //                 }
        //                 result = result.concat( line, tmp );
        //                 //ending satz
        //                 line = XdtTools.createLineByKey( xDT.recordEnd, key, xDT, encoding );
        //                 if( !line ) {
        //                     throw `could not create ending line of Satz ${key}`;
        //                 }
        //                 result = result.concat( line );
        //             }
        //             break;
        //         case 'object':
        //             //TODO: fix
        //
        //             if( Array.isArray( entries ) ) {
        //                 // eslint-disable-next-line no-loop-func
        //                 newEntries = entries.filter( entry => entry.key === key || entry.key === child ) || [];
        //             } else if( entries && entries.entries && Array.isArray( entries.entries ) ) {
        //                 // eslint-disable-next-line no-loop-func
        //                 newEntries = entries.entries.filter( entry => entry.key === key || entry.key === child ) || [];
        //             }
        //
        //             for( let j = (isNaN( xDTObject.amount ) ? newEntries.length : xDTObject.amount) - (newEntries.length || 1); j < ((newEntries && newEntries.length) || 1); j++ ) {
        //                 //for each entry of object call this function
        //                 [err, object] = await formatPromiseResult(
        //                     buildObject( {
        //                         key: key,
        //                         entries: entries
        //                     } )
        //                 );
        //
        //                 if( err ) {
        //                     throw err;
        //                 }
        //                 if( object && object.length ) {
        //                     //beginning object
        //                     line = XdtTools.createLineByKey( xDT.objType, key, xDT, encoding );
        //                     if( !line ) {
        //                         throw `could not create beginning line of Object ${key}`;
        //                     }
        //                     result = result.concat( line, object );
        //                     //ending object
        //                     line = XdtTools.createLineByKey( xDT.objEnd, key, xDT, encoding );
        //                     if( !line ) {
        //                         throw `could not create ending line of Object ${key}`;
        //                     }
        //                     result = result.concat( line );
        //                 }
        //             }
        //             break;
        //         case 'field':
        //             //TODO: fix
        //             if( Array.isArray( entries ) ) {
        //                 // eslint-disable-next-line no-loop-func
        //                 newEntries = entries.filter( entry => entry.key === key || entry.key === child );
        //             } else if( entries && entries.entries && Array.isArray( entries.entries ) ) {
        //                 // eslint-disable-next-line no-loop-func
        //                 newEntries = entries.entries.filter( entry => entry.key === key || entry.key === child );
        //             }
        //             for( let j = (isNaN( xDTObject.amount ) ? newEntries.length : xDTObject.amount) - (newEntries.length || 1); j < ((newEntries && newEntries.length) || 1); j++ ) {
        //                 //for each entry of fields call this function
        //                 [err, line] = await formatPromiseResult(
        //                     buildLine( {
        //                         key: key,
        //                         entries: entries
        //                     } )
        //                 );
        //
        //                 if( err ) {
        //                     throw err;
        //                 }
        //                 if( line && line.length ) {
        //                     result = result.concat( line );
        //                 }
        //             }
        //
        //             break;
        //         default:
        //             //not in xDT spec
        //             break;
        //     }
        //     return result;
        //
        //     async function buildObject( args ) {
        //         let
        //             {
        //                 key,
        //                 entries
        //             } = args,
        //             result = [];
        //
        //         fieldsInOrder = Object.getOwnPropertyNames( xDT.objects[key].fk );
        //         for( let i = 0; i < fieldsInOrder.length; i++ ) {
        //             if( Array.isArray( entries ) ) {
        //                 newEntries = entries.find( entry => entry.key === key );
        //             } else if( entries && entries.entries && Array.isArray( entries.entries ) ) {
        //                 newEntries = entries.entries.find( entry => entry.key === key );
        //             }
        //
        //             //insert line
        //             [err, line] = await formatPromiseResult(
        //                 Y.doccirrus.api.xdtTools.metaRecordBuilderVersion3( {
        //                     key: fieldsInOrder[i],
        //                     // entries: (entries.find( entry => entry.key === child ) || {}).entries || [],
        //                     entries: newEntries,
        //                     xDT: xDT,
        //                     encoding: encoding,
        //                     xDTObject: xDT.objects[key].fk[fieldsInOrder[i]]
        //                 } )
        //             );
        //
        //             if( err ) {
        //                 throw err;
        //             }
        //
        //             if( line && line.length ) {
        //                 result = result.concat( line );
        //             }
        //         }
        //         return result;
        //     }
        //
        //     async function buildLine( args ) {
        //         let
        //             {
        //                 key,
        //                 entries
        //             } = args,
        //             result = [];
        //
        //         [err, line] = await formatPromiseResult(
        //             constructLine( {
        //                 key: key,
        //                 xDTObject: xDTObject
        //             } )
        //         );
        //
        //         if( err ) {
        //             throw err;
        //         }
        //         if( line && line.length ) {
        //             tmp = tmp.concat( line );
        //         }
        //
        //         if( line && line.length && xDTObject && xDTObject.children ) {
        //             fieldsInOrder = Object.getOwnPropertyNames( xDTObject.children );
        //             hasChildren = !!fieldsInOrder.length;
        //             for( let i = 0; i < fieldsInOrder.length; i++ ) {
        //                 child = fieldsInOrder[i].replace( /^fk/g, '' );
        //                 if( Array.isArray( entries ) ) {
        //                     // eslint-disable-next-line no-loop-func
        //                     newEntries = entries.find( entry => entry.key === key || entry.key === child );
        //                 } else if( entries && entries.entries && Array.isArray( entries.entries ) ) {
        //                     // eslint-disable-next-line no-loop-func
        //                     newEntries = entries.entries.find( entry => entry.key === key || entry.key === child );
        //                 }
        //
        //                 [err, line] = await formatPromiseResult(
        //                     Y.doccirrus.api.xdtTools.metaRecordBuilderVersion3( {
        //                         key: child,
        //                         entries: newEntries,
        //                         xDT: xDT,
        //                         encoding: encoding,
        //                         xDTObject: xDTObject.children[fieldsInOrder[i]]
        //                     } )
        //                 );
        //
        //                 if( err ) {
        //                     throw err;
        //                 }
        //                 if( line && line.length ) {
        //                     tmpLine = tmpLine.concat( line );
        //                 }
        //             }
        //         }
        //         if( tmp && tmp.length ) {
        //             if( hasChildren && tmpLine && tmpLine.length ) {
        //                 result = result.concat( tmp, tmpLine );
        //             } else if( !hasChildren ) {
        //                 result = result.concat( tmp );
        //             }
        //         }
        //         return result;
        //     }
        //
        //     /**
        //      * @method constructLine
        //      * @param {Object} args - args
        //      * @param {String} args.key - xDT key of a field
        //      * @param {Object} args.xDTObject - info object inside an xDT Object
        //      * @returns {Array}
        //      */
        //     async function constructLine( args ) {
        //         let {
        //             key,
        //             xDTObject
        //         } = args;
        //
        //         if( !key || !xDTObject ) {
        //             return;
        //         }
        //         key = key.replace( /^fk/g, '' );
        //
        //         let
        //             entry,
        //             info = XdtTools.getInfoByKey( key, xDT );
        //
        //         if( key && Array.isArray( entries ) ) {
        //             entry = entries.find( entry => entry && entry.key === key );
        //         }
        //         if( entries && entries.key && entries.key === key ) {
        //             entry = entries;
        //         }
        //         if( entries && entries.entries && Array.isArray( entries.entries ) ) {
        //             entry = entries.entries.find( entry => entry && entry.key === key );
        //         }
        //
        //         let val = entry && entry.val;
        //
        //         if( !info || !info.type ) {
        //             dbg( `field ${key}:${xDT.fields[key].attribute} does not exist in spec ${xDT.version}` );
        //             throw `field ${key}:${xDT.fields[key].attribute} does not exist in spec ${xDT.version}`;
        //         }
        //
        //         switch( val && info.type ) {
        //             case 'date':
        //                 val = moment( new Date( val ) ).format( xDT.dateFormat );
        //                 break;
        //             case 'doubledate':
        //                 val = moment( new Date( val[0] ) ).format( xDT.dateFormat ) + moment( new Date( val[1] ) ).format( xDT.dateFormat );
        //                 break;
        //             case 'time':
        //                 val = moment( new Date( val ) ).format( xDT.timeFormat );
        //                 break;
        //             case 'longtime':
        //                 val = moment( new Date( val ) ).format( xDT.longTimeFormat );
        //                 break;
        //         }
        //
        //         //pad/trim
        //         dbg( `min: ${XdtTools.minLen( info.len )}` );
        //         dbg( `max: ${XdtTools.minLen( info.len )}` );
        //
        //         // if( val.toString().length < XdtTools.minLen( info.len ) ) {
        //         //     dbg( `padding '${val}' to...` );
        //         //     val = XdtTools.pad( val, XdtTools.minLen( info.len ), entry.pad || " ", !entry.padStart );
        //         //     dbg( `'${val}' (${!entry.padStart})` );
        //         // }
        //         // if( XdtTools.maxLen( info.len ) && val.toString().length > XdtTools.maxLen( info.len ) ) {
        //         //     dbg( `trimming '${val}' to...` );
        //         //     val = XdtTools.trim( val, XdtTools.maxLen( info.len ), !entry.padStart );
        //         //     dbg( `'${val}' (${!entry.padStart})` );
        //         // }
        //
        //         // if( !val && xDTObject ) {
        //         //     if( xDTObject.optional ) {
        //         //         dbg( `value for field ${key}:${xDT.fields[key].attribute} was not provided, but is optional. continue` );
        //         //         return;
        //         //     } else {
        //         //         dbg( `value for field ${key}:${xDT.fields[key].attribute} was not provided, but is NOT optional. break` );
        //         //         throw `value for field ${key}:${xDT.fields[key].attribute} was not provided, but is NOT optional.`;
        //         //     }
        //         // }
        //
        //         if( !val && info.attribute && info.attribute.includes( 'obj_' ) && info.attribute.includes( 'Attribute' ) ) {
        //             val = info.desc;
        //         }
        //
        //         const line = key && val && XdtTools.createLineByKey( key, val, xDT, encoding );
        //
        //         if( line ) {
        //             return line;
        //         } else if( xDTObject && xDTObject.optional ) {
        //             dbg( `field ${key}:${xDT.fields[key].attribute} was not provided, but is optional. continue` );
        //         } else {
        //             if( xDTObject && !xDTObject.optional ) {
        //                 dbg( `field ${key}:${xDT.fields[key].attribute} was not provided, and is NOT optional. break` );
        //                 // throw `field ${key}:${xDT.fields[key].attribute} was not provided, and is NOT optional.`;
        //             } else {
        //                 dbg( `invalid attribute for given xDT spec: ${key}` );
        //                 // throw `invalid attribute for given xdt spec: ${key}`;
        //             }
        //         }
        //     }
        // };

        /**
         * @method getEncoding
         * @param {String} encString one of the BOP encodings
         * @param {Object} xdt valid xdt object
         *
         * @return {String | false}
         */
        XdtTools.getEncodingId = function getEncoding( encString, xdt ) {
            //9206: encoding
            for( let i = 0; i < xdt.encodings.length; i++ ) {
                if( xdt.encodings[i] === encString || (typeof xdt.encodings[i] === 'string' && typeof encString === 'string' && xdt.encodings[i].includes( encString )) ) {
                    return (i + 1).toString();
                }
            }
            return false;
        };

        /**
         * @method goToPathInRecord
         * @param {Array} path path description
         * @param {Object} record an xdt record
         * @param {Object} xdt valid xdt object
         *
         * @return {Array}
         */
        XdtTools.goToPathInRecord = function goToPathInRecord( path, record, xdt ) {
            let curPos = record;
            for( let dk = 0; dk < path.length; dk++ ) {
                if( path[dk] !== "0" && "Obj_" === path[dk].substring( 0, 4 ) ) {
                    curPos = curPos[path[dk]];
                } else if( path[dk] !== "0" && curPos[xdt.fields[path[dk]].attribute.split( "." )[0]] ) {
                    curPos = curPos[xdt.fields[path[dk]].attribute.split( "." )[0]];
                } else if( curPos[curPos.length - 1] ) {
                    curPos = curPos[curPos.length - 1];
                }
            }

            return curPos;
        };

        /**
         * trims a mongodb ID down to a limited number of characters, based on prioritising timestamp and then counter
         * @method trimObjectId
         * @param {String} id the ObjectId to use
         * @param {Number} len the length limit
         *
         * @return {String}
         */
        XdtTools.trimObjectId = function( id, len ) {
            id = id.toString();
            if( 8 >= len ) {
                return id.substring( 8 - len, 8 );
            } else if( 24 > len ) {
                return id.substring( 0, 8 ) + id.substr( -1 * (len - 8) );
            } else {
                return id;
            }
        };

        /**
         * returns a list of all xdt types available
         * @method getXdtTypes
         *
         * @return {Array}
         */
        XdtTools.getXdtTypes = function() {
            let types = [];
            for( const type in Y.doccirrus.api.xdtVersions ) {
                if( Y.doccirrus.api.xdtVersions.hasOwnProperty( type ) ) {
                    types.push( type );
                }
            }
            return types;
        };

        /**
         * returns a list of all xdt types and versions available
         * @method getXdtVersions
         * @param {String} [xdtType] the type to filter for. dismisses all other types
         *
         * @return {Array}
         */
        XdtTools.getXdtVersions = function( xdtType ) {
            let versions = [];
            for( const type in Y.doccirrus.api.xdtVersions ) {
                if( Y.doccirrus.api.xdtVersions.hasOwnProperty( type ) ) {
                    if( !xdtType || xdtType === type ) {
                        for( const version in Y.doccirrus.api.xdtVersions[type] ) {
                            if( Y.doccirrus.api.xdtVersions[type].hasOwnProperty( version ) ) {
                                versions.push( `${type}.${version}` );
                            }
                        }
                    }
                }
            }
            return versions;
        };

        /**
         * returns a list of all xdt types and versions available
         * @method getXdtFromPath
         * @param {String} oriPath path to pick the XDT type and version from. should be "[type].[version]"
         *
         *  @return {String}
         */
        XdtTools.getXdtFromPath = function( oriPath ) {
            const path = oriPath.split( "." );
            return Y.doccirrus.api.xdtVersions[path[0]][path[1]];
        };

        /**
         * returns a list of all xdt types and versions available
         * @method getXdtVersions
         * @param {Buffer} buff buffer of file/stream data
         * @param {String} enc encoding to be used
         * @param {Object} xdt xdt version to get line part lengths from
         *
         * @return {String}
         */
        XdtTools.convertXdtBuffertoObjects = function( buff, enc, xdt ) {
            let xdtData = Y.doccirrus.api.bop.buff2char( buff, enc );

            // Y.doccirrus.api.bop.buff2charHexLog(buff, enc);

            dbg( `parse: got data:${buff.length} bytes` );

            xdtData = xdtData.split( /\[CR]\[LF]|\[CR]|\[LF]/g );
            //remove empty last line(s)
            while( xdtData[xdtData.length - 1] === "" ) {
                xdtData.pop();
            }

            //split line into their components
            for( let i = 0; i < xdtData.length; i++ ) {
                xdtData[i] = {
                    len: xdtData[i].substring( 0, xdt.sizeLen ),
                    fieldType: xdtData[i].substring( xdt.sizeLen, xdt.sizeLen + xdt.sizeFk ),
                    content: xdtData[i].substring( xdt.sizeLen + xdt.sizeFk, xdtData[i].length )
                };
            }
            return xdtData;
        };

        XdtTools.getEncoding = function( data, xdt ) {
            const encodingField = xdt.encodingField;
            if( encodingField ) {
                const rawXdtString = data.toString().split( "\r\n" );
                for( let i = 0; i < rawXdtString.length; i++ ) {
                    if( rawXdtString[i].substring( xdt.sizeLen, xdt.sizeLen + xdt.sizeFk ) === encodingField ) {
                        return xdt.encodings[rawXdtString[i].substring( xdt.sizeLen + xdt.sizeFk, rawXdtString[i].length ) - 1];
                    }
                }
            }
        };

        /**
         * debug logging function, so that we don't need to delete debug logging messages in this module
         * @method dbg
         * @param {String} msg
         */
        function dbg( msg ) {
            Y.log( `\x1b[90mxdtTools debug: ${msg}\x1b[0m`, "debug", NAME );
        }

        Y.namespace( 'doccirrus.api' ).xdtTools = XdtTools;

    },
    '0.0.1', {
        requires: [
            'inport-schema',
            'gdt_v_21',
            'gdt_v_30',
            'gdt_v_dicomPACS',
            'bdt_v_10',
            'ldt_v_20',
            'ldt_v_20_old',
            'xbdt_v_29'
        ]
    }
);
