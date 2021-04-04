/*
 @author: jm
 @date: 2014-10-13
 */

/**
 * Library for xDT data parsing
 */

/*global YUI */

/*eslint no-inner-declarations:0*/

//TODO check for correct order of records ?
//TODO conditions for m/k fields
//TODO Regeltabelle



YUI.add(
    'xdtparser',
    function( Y, NAME ) {
        //we are of type GDT-SD-11
        //SD: supporting serial and file interaction
        //11: supporting client and server position

        var debug = false,
            util = require( 'util' );
        var DECNAME = "xdtparser_decisions";

        dbg( "loading xdt stuff" );

        /**
         * parses xdt bytes into readable object
         * @class XdtParser
         */
        var XdtParser = {};
        XdtParser.name = NAME;

        /**
         * parses xdt bytes into readable object
         * @method parse
         * @param {Object} args
         * @param {Buffer} args.data buffer of xdt data, standard format (regular linebreaks, not serial com linebreaks and seperators)
         * @param {String} args.xdt specifies the xdt variant
         * @param {String} [args.encoding] specifies the encoding
         * @param {Boolean} args.softValidation - Soft Validation
         * @param {Number} [args.lineLimit] number of lines to parse
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        XdtParser.parse = function parse( args ) {
            Y.log( 'Entering Y.doccirrus.api.xdtParser.parse', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.xdtParser.parse' );
            }
            var {
                encoding = "ISO 8859-1",
                softValidation = true
            } = args;

            var tools = Y.doccirrus.api.xdtTools;
            var xdt;
            var validVersion = false;

            //split into async/sync

            var textCheckBuff = args.data.slice( 0, 7 );
            if( textCheckBuff.toString().match( /^[0-9]{7}/ ) ) {
                if( args.callback ) {
                    //unhinge
                    setTimeout( function() {
                        try {
                            _parse( args.callback );
                        } catch( e ) {
                            Y.log( 'xdt parse error: ' + e, 'warn', NAME );
                            args.callback( e );
                            return false;
                        }
                    }, 0 );
                } else {//if no callback is defined, call with return
                    try {
                        return _parse();
                    } catch( e ) {
                        Y.log( `xdt parse error: ${e}`, 'warn', NAME );
                        return false;
                    }
                }
            } else {
                if( args.callback ) {
                    args.callback( "invalid file" );
                } else {
                    return false;
                }
            }

            function findXdt( cb ) {
                if( !args.xdt || ("string" !== typeof args.xdt && "object" !== typeof args.xdt) ) {
                    if( cb ) {
                        cb( "NO XDT TYPE GIVEN." );
                    }
                    return;
                }

                if( "string" === typeof args.xdt ) {

                    if( !Y.doccirrus.api.xdtVersions[args.xdt] ) {
                        if( cb ) {
                            cb( `UNKNOWN XDT TYPE: ${args.xdt}. (types available: ${tools.getXdtTypes()})` );
                        }
                        return;
                    }

                    //find version

                    var testableVersions = [];
                    var xdtVersion = Y.doccirrus.api.xdtVersions[args.xdt];
                    for( var propertyName in xdtVersion ) {
                        if( xdtVersion.hasOwnProperty( propertyName ) ) {
                            dbg( `checking: ${propertyName}(ver: ${xdtVersion[propertyName].version}, accepts: ${xdtVersion[propertyName].acceptedVersions})` );
                            testableVersions.push( {
                                name: propertyName,
                                versionField: xdtVersion[propertyName].versionField,
                                acceptedVersions: xdtVersion[propertyName].acceptedVersions
                            } );
                        }
                    }

                    var tempXdtData = Y.doccirrus.api.bop.buff2char( args.data, encoding );
                    tempXdtData = tempXdtData.split( "[CR][LF]" );
                    for( var cj = 0; cj < tempXdtData.length; cj++ ) {
                        var tempEntry = tempXdtData[cj];
                        for( var ck = 0; ck < testableVersions.length; ck++ ) {
                            var tempVersion = testableVersions[ck];
                            var tempVerData = xdtVersion[tempVersion.name];

                            var typeInLine = tempEntry.substring( tempVerData.sizeLen, tempVerData.sizeLen + tempVerData.sizeFk );
                            dbg( `checking tempEntry: ${tempEntry}` );
                            dbg( `comparing: ${typeInLine} vs ${tempVersion.versionField}` );
                            if( typeInLine === tempVersion.versionField ) {
                                var thisVer = tempEntry.substring( tempVerData.sizeLen + tempVerData.sizeFk, tempEntry.length );
                                dbg( `version found: ${thisVer} (${tempEntry})` );
                                var thisIndex = tempVersion.acceptedVersions.indexOf( thisVer.toString() );
                                dbg( `checking if ${thisVer} is in ${tempVersion.acceptedVersions} -> ${thisIndex}` );
                                if( thisIndex > -1 ) {
                                    xdt = xdtVersion[tempVersion.name];
                                    validVersion = true;
                                    break;
                                }
                            }
                        }
                        if( validVersion ) {
                            break;
                        }
                    }
                }

                if( "object" === typeof args.xdt ) {
                    xdt = args.xdt;
                    validVersion = !!(
                        xdt.type &&
                        xdt.name &&
                        xdt.version &&
                        xdt.dateFormat &&
                        xdt.timeFormat &&
                        xdt.sizeLen &&
                        xdt.sizeRecLen &&
                        xdt.sizeSatz &&
                        xdt.sizeFk &&
                        xdt.recordType &&
                        xdt.saetze &&
                        xdt.fields
                    );
                }

                if( !validVersion ) {
                    if( cb ) {
                        Y.log( `NO MATCHING ${args.xdt}-VERSION AVAILABLE.`, 'warn', NAME );
                        cb( new Y.doccirrus.commonerrors.DCError( 19104 ) );
                    }
                    return;
                }
                return true;
            }

            /**
             * actual function
             * @method _parse
             * @param {Function} _callback
             */
            function _parse( _callback ) {
                function ddbg( msg ) {
                    Y.log( `\x1b[90mxdtParser decision debug: ${msg}\x1b[0m`, "debug", DECNAME );
                }

                //try {

                if( !findXdt( _callback ) ) {
                    return;
                }

                var err = [],
                    res = {
                        versionUsed: {
                            type: xdt.type,
                            name: xdt.name
                        },
                        records: [],
                        unknownRecords: {}
                    },
                    moment = require( 'moment' ),

                    recordTypeList = [],
                    fieldTypeList = [],
                    reqFields = [],
                    path = [],
                    curTreeData = null,
                    curEntry = null,
                    curRecordType = null,
                    j = 0;

                //checking if saetze and fields are in sync
                //var satzIDs = {};
                //
                //for (var key in xdt.saetze) {
                //    if (xdt.saetze.hasOwnProperty(key)) {
                //        checkChildren(xdt.saetze[key].fk);
                //    }
                //}
                //
                //function checkChildren(fk) {
                //    for (var key in fk) {
                //        if (fk.hasOwnProperty(key)) {
                //            satzIDs[key] = true;
                //            if (fk[key].children) {
                //                checkChildren(fk[key].children);
                //            }
                //        }
                //    }
                //}
                //
                //for (var key2 in xdt.fields) {
                //    if (xdt.fields.hasOwnProperty(key2)) {
                //        if (satzIDs[key2]) {
                //            delete satzIDs[key2];
                //        }
                //    }
                //}
                //
                //console.log("NOT OK: "+util.inspect(satzIDs));

                //create some lists for debug messages
                if( debug ) {
                    for( var attribute in xdt.saetze ) {
                        if( xdt.saetze.hasOwnProperty( attribute ) ) {
                            recordTypeList.push( attribute );
                        }
                    }
                    for( var field in xdt.fields ) {
                        if( xdt.fields.hasOwnProperty( field ) ) {
                            fieldTypeList.push( field );
                        }
                    }
                }

                var recordByteCount = 0;
                var recordEntryCount = 0;

                encoding = tools.getEncoding( args.data, xdt ) || encoding;

                var xdtData = tools.convertXdtBuffertoObjects( args.data, encoding, xdt );

                var xdtDataOri;
                if( xdtData && xdtData.match && xdtData.match( /\[CR]\[LF]/g ).length <= 200 ) {
                    xdtDataOri = xdtData;
                    tools.colorPrint( xdtData.replace( /\[CR]\[LF]/g, "[CR][LF]\n" ).replace( /\[CR]/g, "[CR]\n" ).replace( /\[LF]/g, "[LF]\n" ) );
                }

                //parse
                var maxLines = args.lineLimit ? Math.min( args.lineLimit, xdtData.length ) : xdtData.length;
                //var hurryLimit =  xdtData.length;
                //parse - if hurrying, just provide a sample from the first X lines of a block.
                //for(var j = 0; j < hurryLimit; j++) {

                function lastRecord() {
                    return res.records[res.records.length - 1];
                }

                function step() {
                    //progBar (j+1, hurryLimit, "converting....", 31);

                    curTreeData = null; //reset
                    curEntry = xdtData[j];
                    var fieldData = xdt.fields[curEntry.fieldType];
                    if( !fieldData ) {
                        err.push( {
                            line: j + 1,
                            reason: `unknown field ID: ${curEntry.fieldType} (${curEntry.content})`
                        } );
                        Y.log( j, 'debug', NAME );
                        Y.log( maxLines - 1, 'debug', NAME );
                        Y.log( j < maxLines - 1, 'debug', NAME );
                        Y.log( `unknown field: ${util.inspect( err )}`, 'warn', NAME );
                        res.unknownRecords[curEntry.fieldType] = curEntry.content;
                        if( j < maxLines - 1 ) {
                            j++;
                            return setTimeout( step, 0 );
                        } else {
                            return cb();
                        }
                    }
                    ddbg( `current entry (${j + 1}/${xdtData.length}) at ${path}` );
                    ddbg( `    required fields left: ${reqFields}` );
                    ddbg( `    content: ${util.inspect( curEntry )}` );
                    ddbg( `    field: [${curEntry.fieldType}] ${fieldData.attribute}` );
                    ddbg( `    description: ${tools.setf( tools.f.color.white )}${fieldData.desc}` );

                    //-----------------------------------------------------------------------------------------begin
                    if( 0 === j ) {
                        ddbg( `    checking for first field defining the record type (${xdt.recordType})...` );
                    }
                    if( 0 === j && curEntry.fieldType !== xdt.recordType ) {
                        ddbg( `${tools.setf( tools.f.color.red )}     -> failed${tools.setf( tools.f.reset.color )}` );
                        err.push( {
                            line: j + 1,
                            reason: `first line's field type is "${curEntry.fieldType}", but should be ${xdt.recordType} (${util.inspect( curEntry )})`
                        } );
                        _callback( err );
                        return;
                    }

                    //-------------------------------------------------------------------------------------------end
                    // if (xdtData.length-1 === j) {
                    //     ddbg("    checking for last field defining the number of record entries ("+xdt.recordEntries+")...");
                    //     if ((xdt.recordLength && curEntry.fieldType!==xdt.recordLength) && (xdt.recordEntries && curEntry.fieldType!==xdt.recordEntries)) {
                    //         ddbg(tools.setf(tools.f.color.red)+"     -> failed"+tools.setf(tools.f.reset.color));
                    //         err.push({line:j+1,reason:"last line's field type is \""+curEntry.fieldType+"\", but should be "+xdt.recordEntries + " ("+util.inspect(curEntry)+")"});
                    //     }
                    // }

                    //---------------------------------------------------------------------------------------regular

                    ddbg( "    checking line length..." );
                    var expectedLen = curEntry.len.length + curEntry.fieldType.length + curEntry.content.length + 2;
                    if( parseInt( curEntry.len, 10 ) !== expectedLen ) {
                        ddbg( `${tools.setf( tools.f.color.red )}     -> failed${tools.setf( tools.f.reset.color )}` );
                        err.push( {
                            line: j + 1,
                            reason: `given line's length is "${curEntry.len}"(->${parseInt( curEntry.len, 10 )}), but prefix says it should be ${expectedLen} (${util.inspect( curEntry )})`
                        } );
                    }

                    //get field data and add to res object
                    if( fieldData ) {
                        //check length limit
                        ddbg( "    checking content limit based on table..." );
                        if( fieldData.len && !tools.lenCheck( fieldData.len, curEntry.content.length ) ) {
                            ddbg( `${tools.setf( tools.f.color.red )}     -> failed${tools.setf( tools.f.reset.color )}` );
                            err.push( {
                                line: j + 1,
                                reason: `given content's length is ${curEntry.content.length}, but spec says it should be ${fieldData.len} (${util.inspect( curEntry )})`
                            } );
                        }

                        //special recordType case
                        ddbg( "    field Type?" );
                        if( curEntry.fieldType === xdt.recordType ) {
                            ddbg( `${tools.setf( tools.f.color.yellow )}     -> recordType` );
                            if( xdt.saetze[curEntry.content] ) {
                                curTreeData = xdt.saetze[curEntry.content].fk[`${Number(curEntry.fieldType) ? 'fk' : ''}${curEntry.fieldType}`];
                                if( res.records.length > 0 ) {
                                    //end last
                                    ddbg( "    check if record size is correct..." );
                                    if( lastRecord().recordSize && lastRecord().recordSize !== recordByteCount ) {
                                        ddbg( `${tools.setf( tools.f.color.red )}     -> failed record size check${tools.setf( tools.f.reset.color )}` );
                                        err.push( {
                                            line: j + 1,
                                            reason: `given record size is "${lastRecord().recordSize}", but should be ${recordByteCount} (${util.inspect( curEntry )})`
                                        } );
                                    }
                                    ddbg( "    check if record entry amount is correct..." );
                                    if( lastRecord().recordEntries && lastRecord().recordEntries !== recordEntryCount ) {
                                        ddbg( `${tools.setf( tools.f.color.red )}     -> failed entry amount check${tools.setf( tools.f.reset.color )}` );
                                        err.push( {
                                            line: j + 1,
                                            reason: `given number of record entries is "${curEntry.content}", but should be ${xdtData.length} (${util.inspect( curEntry )})`
                                        } );
                                    }
                                }

                                //start next
                                recordByteCount = 0;
                                recordEntryCount = 0;
                                res.records.push( {} );

                                curRecordType = curEntry.content;
                                lastRecord().recordType = curTreeData && curTreeData.children ? {head: curEntry.content} : curEntry.content;
                                reqFields = getRequiredFields( curEntry.content );
                                dbg( `reqFields: ${reqFields}` );
                                path = [];
                                removeFromList( xdt.recordType, reqFields );
                                maybeDescend();
                            } else {
                                ddbg( `${tools.setf( tools.f.color.red )}     -> failed to find record type${tools.setf( tools.f.reset.color )}` );
                                err.push( {
                                    line: j + 1,
                                    reason: `given record type is "${curEntry.attribute}", but should be part of ${recordTypeList} (${util.inspect( curEntry )})`
                                } );
                                _callback( err );
                                return;
                            }
                        }

                        //special recordEntries case
                        else if( curEntry.fieldType === xdt.recordEntries ) {
                            ddbg( `${tools.setf( tools.f.color.lightGreen )}     -> recordEntries` );
                            removeFromList( xdt.recordEntries, reqFields );
                        } else if( curEntry.fieldType === xdt.recordEnd ) {
                            ddbg( `${tools.setf( tools.f.color.lightGreen )}     -> recordEnd` );
                            removeFromList( xdt.recordEnd, reqFields );
                        }

                        //special objType case
                        else if( curEntry.fieldType === xdt.objType ) {
                            ddbg( `${tools.setf( tools.f.color.cyan )}     -> objType` );
                            removeFromList( xdt.objType, reqFields );
                            removeFromList( curEntry.content, reqFields );
                            findPathAndTreeData();
                            if( curTreeData && xdt.objects[curEntry.content] ) {
                                let curRec = getSubRecord( lastRecord(), path );
                                curRec[curEntry.content] = {};
                                path.push( curEntry.content );
                                ddbg( `going deeper, new path is ${path}` );
                            } else {
                                let oTids = getPathChildren( path, curRecordType, xdt );
                                let objErr = {
                                    line: j + 1,
                                    reason: `given object type is "${curEntry.content}", but should be part of set for ${curRecordType} (${Object.keys( oTids )})`
                                };
                                err.push( objErr );
                                if( !softValidation ) {
                                    return _callback( objErr );
                                }
                            }
                        }

                        //special objEntries case
                        else if( curEntry.fieldType === xdt.objEntries ) {
                            ddbg( `${tools.setf( tools.f.color.lightCyan )}     -> objEntries` );
                            for( let i = path.length - 1; i >= 0; i-- ) {
                                if( 0 === path[i].indexOf( "Obj_" ) ) {
                                    while( path.length > i ) {
                                        path.pop();
                                    }
                                    break;
                                }
                            }
                        }

                        //special objEntries case
                        else if( curEntry.fieldType === xdt.objEnd ) {
                            ddbg( `${tools.setf( tools.f.color.lightCyan )}     -> objEnd` );
                            for( let i = path.length - 1; i >= 0; i-- ) {
                                if( path[i] === curEntry.content ) {
                                    while( path.length > i ) {
                                        path.pop();
                                    }
                                    break;
                                }
                            }
                            removeFromList( xdt.objEnd, reqFields );
                        }

                        //default fieldType case
                        else {
                            ddbg( `${tools.setf( tools.f.color.white )}     -> default` );
                            removeFromList( curEntry.fieldType, reqFields );
                            var curVal = "ERROR";
                            var curValValid = true;
                            //type conversion
                            var dPos = tools.goToPathInRecord( path, lastRecord(), xdt );//eslint-disable-line

                            ddbg( "    content type?" );
                            if( fieldData.type === "number" || fieldData.type === "float" ) {
                                ddbg( `${tools.setf( tools.f.color.green )}     -> number` );
                                curVal = Number( curEntry.content );
                                if( isNaN( curVal ) ) {
                                    err.push( {
                                        line: j + 1,
                                        reason: `given field content ${curEntry.content} is not a number.`
                                    } );
                                }
                            } else if( fieldData.type === "date" ) {
                                ddbg( `${tools.setf( tools.f.color.cyan )}     -> date` );
                                if( curEntry.content.length === 8 ) {
                                    let germanDate;
                                    if( xdt.dateFormat === 'DDMMYYYY' ) {
                                        germanDate = `${curEntry.content[0]}${curEntry.content[1]}.${curEntry.content[2]}${curEntry.content[3]}.${curEntry.content.toString().slice( 4, 8 )}`;
                                    } else if( xdt.dateFormat === 'YYYYMMDD' ) {
                                        germanDate = `${curEntry.content[6]}${curEntry.content[7]}.${curEntry.content[4]}${curEntry.content[5]}.${curEntry.content.toString().slice( 0, 4 )}`;
                                    }
                                    let kbvDob;
                                    try {
                                        kbvDob = moment( new Y.doccirrus.KBVDateValidator( germanDate ).getDate(), 'DD.MM.YYYY' );
                                    } catch( e ) {
                                        err.push( {
                                            line: j + 1,
                                            reason: e.stack || e
                                        } );
                                    }
                                    curVal = kbvDob && kbvDob.toDate();
                                    curValValid = kbvDob && kbvDob.isValid();
                                } else {
                                    let momVal = moment( curEntry.content, xdt.dateFormat, true );
                                    curVal = momVal.toDate();
                                    curValValid = momVal.isValid();
                                }
                                if( !curValValid ) {
                                    err.push( {
                                        line: j + 1,
                                        reason: `given field content ${curEntry.content} is incompatible with format ${xdt.dateFormat}`
                                    } );
                                }
                            } else if( fieldData.type === "doubledate" ) {
                                ddbg( `${tools.setf( tools.f.color.cyan )}     -> doubledate` );
                                let momValA = moment( curEntry.content.substring( 0, xdt.dateFormat.length ), xdt.dateFormat, true );
                                let momValB = moment( curEntry.content.substring( xdt.dateFormat.length, curEntry.content.length ), xdt.dateFormat, true );
                                curVal = [
                                    momValA.toDate(),
                                    momValB.toDate()
                                ];
                                curValValid = momValA.isValid() && momValB.isValid();
                                if( !curValValid ) {
                                    err.push( {
                                        line: j + 1,
                                        reason: `given field content ${curEntry.content} is incompatible with format ${xdt.dateFormat}${xdt.dateFormat}`
                                    } );
                                }
                            } else if( fieldData.type === "time" ) {
                                ddbg( `${tools.setf( tools.f.color.lightCyan )}     -> time` );
                                ddbg( `checking if object already exists at ${fieldData.attribute.split( "." )[0]}` );

                                ddbg( `checking on path: ${path}` );

                                //ddbg("end position: "+util.inspect(dPos));
                                ddbg( `?: ${dPos[fieldData.attribute.split( "." )[0]]}` );
                                if( dPos[fieldData.attribute.split( "." )[0]] ) {
                                    //hacking date+time together
                                    ddbg( "already existing date, attaching..." );
                                    ddbg( `prev date: ${moment( dPos[fieldData.attribute.split( "." )[0]] ).format( xdt.dateFormat )}`, true );
                                    ddbg( `added date: ${curEntry.content}` );
                                    curVal = moment( moment( dPos[fieldData.attribute.split( "." )[0]] ).format( xdt.dateFormat ) + curEntry.content, xdt.dateFormat + xdt.timeFormat, true ).toDate();
                                } else {
                                    ddbg( "no already existing date, add as-is..." );
                                    let momVal = moment( curEntry.content, xdt.timeFormat, true );
                                    curVal = momVal.toDate();
                                    curValValid = momVal.isValid();
                                    if( !curValValid ) {
                                        err.push( {
                                            line: j + 1,
                                            reason: `given field content ${curEntry.content} is incompatible with format ${xdt.timeFormat}`
                                        } );
                                    }
                                }
                                ddbg( `result value: ${curVal}` );
                            } else if( fieldData.type === "longtime" ) {
                                ddbg( `${tools.setf( tools.f.color.lightCyan )}     -> longtime` );
                                if( dPos[fieldData.attribute.split( "." )[0]] ) {
                                    //hacking date+time together
                                    curVal = moment( moment( dPos[fieldData.attribute.split( "." )[0]] ).format( xdt.dateFormat ) + curEntry.content, xdt.dateFormat + xdt.longTimeFormat ).toDate();
                                } else {
                                    let momVal = moment( curEntry.content, xdt.longTimeFormat, true );
                                    curVal = momVal.toDate();
                                    curValValid = momVal.isValid();
                                    if( !curValValid ) {
                                        err.push( {
                                            line: j + 1,
                                            reason: `given field content ${curEntry.content} is incompatible with format ${xdt.longTimeFormat}`
                                        } );
                                    }
                                }
                            } else if( fieldData.type === "doubletime" ) {
                                ddbg( `${tools.setf( tools.f.color.lightCyan )}     -> doubletime` );
                                if( dPos[fieldData.attribute.split( "." )[0]] ) {
                                    //hacking date+time together
                                    curVal = [{}, {}];
                                    curVal[0] = moment( moment( dPos[fieldData.attribute.split( "." )[0]][0] ).format( xdt.dateFormat ) + curEntry.content.substring( 0, xdt.timeFormat.length ), xdt.dateFormat + xdt.timeFormat ).toDate();
                                    curVal[1] = moment( moment( dPos[fieldData.attribute.split( "." )[0]][1] ).format( xdt.dateFormat ) + curEntry.content.substring( xdt.timeFormat.length, curEntry.content.length ), xdt.dateFormat + xdt.timeFormat ).toDate();
                                } else {
                                    let momValA = moment( curEntry.content.substring( 0, xdt.timeFormat.length ), xdt.timeFormat, true );
                                    let momValB = moment( curEntry.content.substring( xdt.timeFormat.length, curEntry.content.length ), xdt.timeFormat, true );

                                    curVal = [
                                        momValA.toDate(),
                                        momValB.toDate()
                                    ];
                                    curValValid = momValA.isValid() && momValB.isValid();
                                    if( !curValValid ) {
                                        err.push( {
                                            line: j + 1,
                                            reason: `given field content ${curEntry.content} is incompatible with format ${xdt.timeFormat}${xdt.timeFormat}`
                                        } );
                                    }
                                }
                            } else if( fieldData.type === "encoding" ) {
                                ddbg( `${tools.setf( tools.f.color.yellow )}     -> encoding` );
                                if( parseFloat( curEntry.content ) && parseFloat( curEntry.content ) <= xdt.encodings.length ) {
                                    curVal = xdt.encodings[parseFloat( curEntry.content ) - 1];
                                } else {
                                    err.push( {
                                        line: j + 1,
                                        reason: `given encoding ID is "${curEntry.content}", but should be less than ${xdt.encodings.length} (${util.inspect( curEntry )})`
                                    } );
                                }
                            } else if( fieldData.type === "procedure" ) {
                                ddbg( `${tools.setf( tools.f.color.magenta )}     -> procedure` );
                                if( xdt.procedures[curEntry.content] ) {
                                    curVal = {
                                        value: curEntry.content,
                                        group: xdt.procedures[curEntry.content].group,
                                        desc: xdt.procedures[curEntry.content].desc
                                    };
                                } else {
                                    err.push( {
                                        line: j + 1,
                                        reason: `given procedure type is "${curEntry.content}", but is unknown to xdt version ${xdt.version} (${util.inspect( curEntry )})`
                                    } );
                                }
                            } else {
                                ddbg( `${tools.setf( tools.f.color.white )}     -> default` );
                                curVal = curEntry.content;
                            }

                            ddbg( `    currentValue: ${curVal}` );

                            //potentially create object

                            //switch upwards as needed
                            ddbg( "    path?" );
                            //go up as much as you need to fulfill parent/children relationship
                            ddbg( `     prepop  -> ${path}` );

                            findPathAndTreeData();

                            dbg( `current entry data based on path: ${util.inspect( curTreeData )}` );
                            if( curTreeData === undefined ) {
                                var msg = `spec-incompatbile field at line ${j + 1} (invalid inheritance): ${JSON.stringify( curEntry )}`;
                                Y.log( msg, 'warn', NAME );
                                if( !softValidation ) {
                                    _callback( msg );
                                    return;
                                }
                            }
                            if( curTreeData && curTreeData.children ) {
                                curVal = {head: curVal};
                            }

                            ddbg( `    inserting at ${path}` );
                            let curRec = getSubRecord( lastRecord(), path );

                            //add value to current path depending of if it can have multiple or only one value
                            if( curTreeData && "n" === curTreeData.amount ) {
                                ddbg( "    amount is n, arrays will be used..." );
                                if( !curRec[fieldData.attribute.split( "." )[0]] ) {
                                    curRec[fieldData.attribute.split( "." )[0]] = [];
                                }
                                curRec[fieldData.attribute.split( "." )[0]].push( curVal );
                            } else if( curTreeData && (curValValid || !curRec[fieldData.attribute.split( "." )[0]]) ) {
                                curRec[fieldData.attribute.split( "." )[0]] = curVal;
                            }

                            maybeDescend();
                        }
                    } else {
                        err.push( {
                            line: j + 1,
                            reason: `given field type is ${curEntry.fieldType}, but should be part of ${fieldTypeList} (${util.inspect( curEntry )})`
                        } );
                    }

                    recordByteCount += expectedLen;
                    recordEntryCount++;
                    ddbg( `record size in bytes is now ${recordByteCount} (+${expectedLen})` );
                    //ddbg("current object:\n"+ tools.setf(tools.f.reset.all) + util.inspect(res, {colors: true, depth:5}));

                    if( j === xdtData.length - 1 ) {
                        //end last
                        ddbg( "final checks..." );
                        ddbg( "check if record size is correct..." );
                        if( lastRecord().recordSize && lastRecord().recordSize !== recordByteCount ) {
                            ddbg( `${tools.setf( tools.f.color.red )} -> failed record size check${tools.setf( tools.f.reset.color )}` );
                            err.push( {
                                line: j + 1,
                                reason: `given record size is "${lastRecord().recordSize}", but should be ${recordByteCount} (original size: ${args.data.length})` + ` (${util.inspect( curEntry )})`
                            } );
                        }
                        ddbg( "check if record entry amount is correct..." );
                        if( lastRecord().recordEntries && lastRecord().recordEntries !== recordEntryCount ) {
                            ddbg( `${tools.setf( tools.f.color.red )} -> failed entry amount check${tools.setf( tools.f.reset.color )}` );
                            err.push( {
                                line: j + 1,
                                reason: `given number of record entries is "${curEntry.content}", but should be ${xdtData.length} (${util.inspect( curEntry )})`
                            } );
                        }
                    }
                    if( j < maxLines - 1 ) {
                        j++;
                        return setTimeout( step, 0 );
                    } else {
                        return cb();
                    }
                }

                function cb() {
                    if( reqFields.length > 0 ) {
                        err.push( {line: xdtData.length - 1, reason: `requied fields left: ${reqFields}`} );
                    }

                    //console.log("\nres:\n\n"+ tools.setf(tools.f.reset.all) + util.inspect(res, {colors: true, depth:10}));
                    let recordType = (res.records[0].recordType && res.records[0].recordType.head) || res.records[0].recordType;
                    Y.log( `done: [${recordType}] ${xdt.saetze[recordType].desc} (${xdtData.length} entries)\nerr:\n${util.inspect( err, {depth: 10} )}`, 'info', 'xdt parser result' );//TODO
                    if( err.length > 1 && xdtDataOri ) {
                        tools.colorPrint( xdtDataOri.replace( /\[CR]\[LF]/g, "[CR][LF]\n" ) );
                        //process.exit();
                    }
                    if( _callback ) {
                        if( err.length > 0 ) {
                            Y.log( util.inspect( err ), 'warn', NAME );
                        }
                        _callback( null, res );
                    }
                    return res;
                    //} catch(e) {
                    //    Y.log("xdt parsing failed:"+e, 'warn');
                    //}
                }

                function maybeDescend() {
                    //go deeper if object with children
                    if( curTreeData && curTreeData.children ) {
                        path.push( curEntry.fieldType );
                        if( "1" !== curTreeData.amount ) {
                            path.push( "0" );
                        }
                        ddbg( `going deeper, new path is ${path}` );
                    }
                }

                function findPathAndTreeData() {
                    //save path because we might need it in case of invalid inheritance
                    var oldPath = path.slice( 0 );

                    //see if we can find anything in the current level
                    curTreeData = getPathEntryData( path, curEntry, curRecordType, xdt );

                    //progressively check levels further up
                    while( !curTreeData ) {
                        path.pop();
                        curTreeData = getPathEntryData( path, curEntry, curRecordType, xdt );
                        if( 0 === path.length ) {
                            break;
                        }
                    }
                    if( !curTreeData ) {
                        err.push( {
                            line: j + 1,
                            reason: `invalid fieldType/inheritance for given satz(${curRecordType}): ${curEntry.fieldType} (${util.inspect( curEntry )})`
                        } );
                        //recover path in case of failure
                        path = oldPath;
                    }
                }

                //start
                step();
            }

            /**
             * small helper function
             * @method removeFromList
             * @param {String} a element to be removed if found
             * @param {Array} l list potentially containing a
             */
            function removeFromList( a, l ) {
                for( var i = 0; i < l.length; i++ ) {
                    var cur = l[i];
                    if( cur === a ) {
                        l.splice( i, 1 );
                    }
                }
            }

            /**
             * lists required fields for the given satzId
             * @method getRequiredFields
             * @param {String} satzId
             *
             * @return {Array}
             */
            function getRequiredFields( satzId ) {
                var ret = [];
                for( var field in xdt.saetze[satzId].fk ) {
                    if( xdt.saetze[satzId].fk.hasOwnProperty( field ) ) {
                        if( !xdt.saetze[satzId].fk[field].optional ) {
                            ret.push( field.replace( /^fk/g, '' ) );
                            if( field.substring( 0, 4 ) === "Obj_" ) {
                                dbg( `checking obj: ${field}` );
                                for( var objField in xdt.objects[field].fk ) {
                                    if( xdt.objects[field].fk.hasOwnProperty( objField ) ) {
                                        if( !xdt.objects[field].fk[objField].optional ) {
                                            ret.push( objField );
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                return ret;
            }

            function getSubRecord( rootRec, path ) {
                //unravel path
                var curRec = rootRec;
                for( var k = 0; k < path.length; k++ ) {
                    if( path[k] !== "0" && "Obj_" === path[k].substring( 0, 4 ) ) {
                        curRec = curRec[path[k]];
                    } else if( path[k] !== "0" && curRec[xdt.fields[path[k]].attribute.split( "." )[0]] ) {
                        curRec = curRec[xdt.fields[path[k]].attribute.split( "." )[0]];
                    } else if( curRec[curRec.length - 1] ) {
                        curRec = curRec[curRec.length - 1];
                    } else {
                        dbg( `can't get to path: missing element: ${path[k]}` );
                    }
                }
                return curRec;
            }

            function getPathChildren( path, recordType, xdt ) {
                var fkList = xdt.saetze[recordType].fk;
                for( var pi = 0; pi < path.length; pi++ ) {
                    dbg( `getPathChildren: stage ${path[pi]}` );
                    if( "0" !== path[pi] ) {
                        if( !path[pi].includes( 'Obj_' ) ) {
                            if( !fkList[`fk${path[pi]}`] && !fkList[`${path[pi]}`] ) {
                                return;
                            }
                            dbg( `getPathChildren: going down normally, baseList is ${util.inspect( fkList )}` );
                            fkList = ( fkList[`fk${path[pi]}`] && fkList[`fk${path[pi]}`].children ) || ( fkList[`${path[pi]}`] && fkList[`${path[pi]}`].children );
                        } else {
                            dbg( "getPathChildren: going down object" );
                            fkList = xdt.objects[path[pi]].fk;
                        }
                    }
                }
                return fkList;
            }

            function getPathEntryData( path, currentEntry, recordType, xdt ) {
                dbg( `validPath: checking path [${path}] with fieldType ${JSON.stringify( currentEntry )} and recordType ${recordType}` );
                let baseList = getPathChildren( path, recordType, xdt );

                dbg( `validPath: looking for ${currentEntry.fieldType} in set of ${baseList && Object.keys( baseList )}` );
                for( var entry in baseList ) {
                    if( baseList.hasOwnProperty( entry ) ) {
                        //dbg("comparing "+entry+" with "+fieldType);
                        if( entry.includes( currentEntry.fieldType ) ) {
                            dbg( `validPath: Success: ${JSON.stringify( baseList[entry] )}` );
                            return baseList[entry];
                        }
                        if( currentEntry.fieldType === xdt.objType && entry === currentEntry.content ) {
                            dbg( `validPath: Success [Obj]: ${JSON.stringify( baseList[entry] )}` );
                            return baseList[entry];
                        }
                    }
                }

                dbg( "validPath: Failure" );
            }

        };

        XdtParser.test = function test() {//
            //var fs = require('fs');
            //fs.readFile(process.cwd()+"/mojits/DeviceMojit/assets/Z01erpep.ldt", function (err, res) {
            //    if (err) {
            //        dbg("err: "+err);
            //    } else {
            //        dbg("res ("+Object.prototype.toString.call( res )+"):\n"+ util.inspect(res));
            //        var xdtData = Y.doccirrus.api.bop.buff2char(res, "ISO 8859-1");
            //
            //        var testdataHex2 = Y.doccirrus.api.bop.buff2hex(res);
            //        dbg("test 3:\n"+ testdataHex2.replace(/ 0d 0a /g,' 0d 0a\n'));
            //        
            //        dbg("parse: got data:\n\n");
            //        XdtParser.colorPrint(xdtData.replace(/\[CR]\[LF]/g,"[CR][LF]\n"));
            //    }
            //    process.exit();
            //});

            dbg( `test 1: ${Y.doccirrus.api.bop.char2hex( "testtest" )}` );
            var testdataHex = Y.doccirrus.api.bop.char2hex( Y.doccirrus.api.xdtTests.bdt.test1 );
            dbg( `test 2:\n${testdataHex.replace( / 0d 0a /g, ' 0d 0a\n' )}` );

            var testdataBytes = Y.doccirrus.api.bop.char2buff( Y.doccirrus.api.xdtTests.bdt.test1 );
            XdtParser.parse( {
                data: testdataBytes,
                xdt: "bdt",
                callback: function( err, res ) {
                    if( err ) {
                        Y.log( `err: ${err}`, 'warn' );
                    }
                    if( res ) {
                        dbg( "res ok." );
                        Y.doccirrus.api.xdtTools.prettyPrint( res );
                        process.exit();
                    }
                }
            } );
        };

        /*
        function progBar (i, max, text, newSkip) {//jshint ignore:line
            var skip = newSkip?newSkip:5031;

            if (i % skip===0 || i === max) {
                var ratio = i / max;
                var barsize = 50;
                var statText = "";
                statText += '\x1b[0G';
                statText += (text ? text : "") + '[';
                var curBar = Math.round(ratio * barsize);
                for (var j = 0; j < curBar; j++) {
                    statText += '#';
                }
                for (var k = 0; k < barsize - curBar; k++) {
                    statText += ' ';
                }
                statText += ']';
                statText += "(" + (ratio * 100).toFixed(2) + "%) ";
                statText += i + "/" + max + " entries";
                process.stdout.write(statText);
                if (i === max) {
                    Y.log("",'debug',NAME);
                }
            }
        }
           */

        /**
         * debug logging function, so that we don't need to delete debug logging messages in this module
         * @method dbg
         * @param {String} msg
         */
        function dbg( msg ) {
            Y.log( `\x1b[90mxdtParser debug: ${msg}\x1b[0m`, "debug", NAME );
        }

        Y.namespace( 'doccirrus.api' ).xdtParser = XdtParser;

    },
    '0.0.1', {
        requires: [
            'inport-schema'
        ]
    }
);
