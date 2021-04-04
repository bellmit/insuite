/*
 @author: jm
 @date: 2017-06-28
 
 this module mostly exists as an archive of serial parsers.
 In the future, these have to be translated to our transformer model as needed.
 */

/*global YUI */


//parsers are loaded by path
//if(activeParsers[parserName]) {
//    //Y.log("jm@dc parsing...");
//    activeParsers[parserName].parse(msg, this, function(dataObj) {
//        Y.doccirrus.communication.emitNamespaceEvent( {
//            nsp: "/",
//            event: "DeviceInputData",
//            msg: {data: dataObj}
//        } );
//        Y.doccirrus.communication.emitNamespaceEvent( {
//            nsp: "admin",
//            event: "DeviceInputData",
//            msg: {data: dataObj}
//        } );
//    });
//}



YUI.add( 'serialParsers', function( Y, NAME ) {
        //assumed encoding, might need to add other charsets later
        var ISO_8859_1 = [
            //_0    _1    _2    _3    _4    _5    _6    _7    _8    _9    _a    _b    _c    _d    _e    _f
            [ "NUL", "SOH", "STX", "ETX", "EOT", "ENQ", "ACK", "BEL", "BS ", "HT ", "LF ", "VT ", "FF ", "CR ", "SO ", "SI " ], // 0_
            [ "DLE", "DC1", "DC2", "DC3", "DC4", "NAK", "SYN", "ETB", "CAN", "EM ", "SUB", "ESC", "FS ", "GS ", "RS ", "US " ], // 1_
            [ "   ", " ! ", ' " ', " # ", " $ ", " % ", " & ", " ' ", " ( ", " ) ", " * ", " + ", " , ", " - ", " . ", " / " ], // 2_
            [ " 0 ", " 1 ", " 2 ", " 3 ", " 4 ", " 5 ", " 6 ", " 7 ", " 8 ", " 9 ", " : ", " ; ", " < ", " = ", " > ", " ? " ], // 3_
            [ " @ ", " A ", " B ", " C ", " D ", " E ", " F ", " G ", " H ", " I ", " J ", " K ", " L ", " M ", " N ", " O " ], // 4_
            [ " P ", " Q ", " R ", " S ", " T ", " U ", " V ", " W ", " X ", " Y ", " Z ", " [ ", " \\ ", " ] ", " ^ ", " _ " ],// 5_
            [ " ` ", " a ", " b ", " c ", " d ", " e ", " f ", " g ", " h ", " i ", " j ", " k ", " l ", " m ", " n ", " o " ], // 6_
            [ " p ", " q ", " r ", " s ", " t ", " u ", " v ", " w ", " x ", " y ", " z ", " { ", " | ", " } ", " ~ ", "DEL" ], // 7_

            [ "PAD", "HOP", "BPH", "NBH", "IND", "NEL", "SSA", "ESA", "HTS", "HTJ", "VTS", "PLD", "PLU", "RI ", "SS2", "SS3" ], // 8_
            [ "DCS", "PU1", "PU2", "STS", "CCH", "MW ", "SPA", "EPA", "SOS", "SGC", "SCI", "CSI", "ST ", "OSC", "PM ", "APC" ], // 9_
            [ "NBS", " ¡ ", " ¢ ", " £ ", " ¤ ", " ¥ ", " ¦ ", " § ", " ¨ ", " © ", " ª ", " « ", " ¬ ", "SHY", " ® ", " ¯ " ], // a_
            [ " ° ", " ± ", " ² ", " ³ ", " ´ ", " µ ", " ¶ ", " · ", " ¸ ", " ¹ ", " º ", " » ", " ¼ ", " ½ ", " ¾ ", " ¿ " ], // b_
            [ " À ", " Á ", " Â ", " Ã ", " Ä ", " Å ", " Æ ", " Ç ", " È ", " É ", " Ê ", " Ë ", " Ì ", " Í ", " Î ", " Ï " ], // c_
            [ " Ð ", " Ñ ", " Ò ", " Ó ", " Ô ", " Õ ", " Ö ", " × ", " Ø ", " Ù ", " Ú ", " Û ", " Ü ", " Ý ", " Þ ", " ß " ], // d_
            [ " à ", " á ", " â ", " ã ", " ä ", " å ", " æ ", " ç ", " è ", " é ", " ê ", " ë ", " ì ", " í ", " î ", " ï " ], // e_
            [ " ð ", " ñ ", " ò ", " ó ", " ô ", " õ ", " ö ", " ÷ ", " ø ", " ù ", " ú ", " û ", " ü ", " ý ", " þ ", " ÿ " ]  // f_
        ];

        //parser prototypes by name; need to write spec and official spec reference/etc. here - jm
        Y.namespace( 'doccirrus.api' ).serialParsers = {
            name: NAME,
            "none": {
                parse: function() {},
                write: function() {}
            },
            
            "Visutron PLUS": {
                buffer: "",
                lastByte: "",
                parse: function( { serialData: bytes, device }, callback ) {
                    var byteArray = bytes.split( " " );

                    var ioud = {
                        IN: "INSIDE",
                        OUT: "OUTSIDE",
                        UP: "ABOVE",
                        DOWN: "BELOW"
                    };

                    for( var i = 0; i < byteArray.length; i++ ) {
                        var char = ISO_8859_1[ parseInt( byteArray[ i ][ 0 ], 16 ) ][ parseInt( byteArray[ i ][ 1 ], 16 ) ];
                        if( char.trim().length <= 1 ) {
                            this.buffer += char === "   " ? " " : (char.trim());
                        }
                        if( "LF " === char && "0d" === this.lastByte ) {
                            this.buffer += "\n";
                        }
                        if( "STX" === char ) {
                            this.buffer = "";
                        }
                        if( "ETX" === char ) {
                            var refData = this.buffer.split( "\n" );
                            var refDataObj = {};
                            var lastSide = "";
                            for( var j = 0; j < refData.length; j++ ) {
                                if( "LM" === refData[ j ] ) {
                                    refDataObj.orType = "LM";
                                }
                                if( "AR" === refData[ j ] ) {
                                    refDataObj.orType = "AR";
                                }
                                if( "VI" === refData[ j ] ) {
                                    refDataObj.orType = "REF";
                                }
                                if( "L" === refData[ j ] || "R" === refData[ j ] ) {
                                    lastSide = refData[ j ];
                                }
                                if( refData[ j ].length >= 6 ) {
                                    var label = refData[ j ].substring( 0, 5 ).trim();

                                    if( "SPH_F" === label && lastSide ) {
                                        refDataObj[ "orFar" + lastSide ] = trimNum( refData[ j ].substring( 6, 13 ) );
                                    }
                                    if( "SPH_N" === label && lastSide ) {
                                        refDataObj[ "orNear" + lastSide ] = trimNum( refData[ j ].substring( 6, 13 ) );
                                    }
                                    if( "CYL" === label && lastSide ) {
                                        refDataObj[ "orCyl" + lastSide ] = trimNum( refData[ j ].substring( 6, 13 ) );
                                    }
                                    if( "AXIS" === label && lastSide ) {
                                        refDataObj[ "orAxs" + lastSide ] = trimNum( refData[ j ].substring( 6, 13 ) );
                                    }
                                    if( "PRISM" === label && lastSide ) {
                                        refDataObj[ "orPsm" + lastSide ] = trimNum( refData[ j ].substring( 6, 13 ) );
                                        if( refData[ j ].length > 13 ) {
                                            refDataObj[ "orBas" + lastSide ] = ioud[ refData[ j ].substring( 13 ).trim() ];
                                        }
                                    }
                                    if( "HSA" === label ) {
                                        refDataObj.orHSA = trimNum( refData[ j ].substring( 6, 13 ) );
                                    }
                                    if( "PD" === label ) {
                                        refDataObj.orPD = trimNum( refData[ j ].substring( 6, 13 ) );
                                    }
                                }
                            }
                            Y.doccirrus.api.sdManager.sendSerialData( {
                                device,
                                serialData: Buffer.from( [ 0x06 ] )
                            } );

                            callback( refDataObj );
                            this.buffer = "";
                        }
                        this.lastByte = byteArray[ i ];
                    }
                }
            },
            "Nikon Speedy-K": {
                vd: [ 0.0, 12.0, 13.5, 13.75, 15.0, 16.0 ],
                stringBuffer: "",
                checksumCounter: 0,
                checksumCount: function( val ) {
                    this.checksumCounter += parseInt( val, 16 );
                },
                checksumBytes: "",
                checkMode: false,
                messageType: "",
                lastSide: "",
                eot: false,
                resetValues: function() {
                    this.stringBuffer = "";
                    this.checksumCounter = 0;
                    this.checksumBytes = "";
                    this.checkMode = false;
                    this.messageType = "";
                    this.lastSide = "";
                    this.eot = false;
                },
                dataObj: {},
                parse: function( { serialData: bytes, device }, callback ) {
                    var byteArray = bytes.split( " " );
                    for( var i = 0; i < byteArray.length; i++ ) {
                        if( this.checkMode ) {
                            this.checksumBytes = byteArray[ i ] + this.checksumBytes;
                            if( this.checksumBytes.length === 4 ) {
                                var checkString = this.checksumCounter.toString( 16 );
                                while( checkString.length < 4 ) {
                                    checkString = "0" + checkString;
                                }
                                //Y.log("jm@dc comparing: "+checkString+" and "+this.checksumBytes);
                                if( checkString === this.checksumBytes ) {
                                    //Y.log("jm@dc: checksum ok");
                                    //Y.log("jm@dc: ------------------- text: "+this.stringBuffer);
                                    if( this.messageType === "heading_block" ) {
                                        var heading_block = {
                                            companyName: this.stringBuffer.substring( 0, 5 ).trim(),
                                            model: this.stringBuffer.substring( 5, 13 ).trim(),
                                            id: this.stringBuffer.substring( 13, 25 ).trim(),
                                            date: this.stringBuffer.substring( 25, 33 ).trim(),
                                            time: this.stringBuffer.substring( 33, 38 ).trim(),
                                            freeSpace: this.stringBuffer.substring( 38, 54 ).trim()
                                        };
                                        if( this.vd[ this.stringBuffer.substring( 53, 54 ) ] ) {
                                            heading_block.vd = this.vd[ this.stringBuffer.substring( 53, 54 ) ];
                                        }

                                        //Y.log("jm@dc: "+util.inspect(heading_block));
                                    }
                                    if( this.messageType === "data_block" ) {
                                        //Y.log( "jm@dc first char: " + this.stringBuffer[0] );

                                        if( this.stringBuffer[ 0 ] === '@' ) {
                                            //Y.log("jm@dc found type identifier");
                                            if( this.stringBuffer.substring( 1, this.stringBuffer.length ) === "LM" ) {
                                                this.dataObj.orType = "LM";
                                            }
                                            else {
                                                this.dataObj.orType = this.stringBuffer.substring( 1, this.stringBuffer.length );
                                            }
                                            //Y.log( "jm@dc data so far: " + util.inspect(this.dataObj) );

                                        } else if( this.stringBuffer[ 0 ] === 'O' ) {
                                            //Y.log("jm@dc found O data");
                                            this.lastSide = this.stringBuffer[ 1 ];
                                            this.dataObj[ "orSph" + this.lastSide ] = trimNum( this.stringBuffer.substring( 2, 8 ) );
                                            this.dataObj[ "orCyl" + this.lastSide ] = trimNum( this.stringBuffer.substring( 8, 14 ) );
                                            this.dataObj[ "orAxs" + this.lastSide ] = trimNum( this.stringBuffer.substring( 14, 17 ) );
                                            //Y.log( "jm@dc data so far: " + util.inspect(this.dataObj) );
                                        } else if( this.stringBuffer.substring( 0, 2 ) === "PD" ) {
                                            //Y.log("jm@dc found PD data");
                                            this.dataObj.orPD = trimNum( this.stringBuffer.substring( 2, 6 ) );
                                            //Y.log( "jm@dc data so far: " + util.inspect(this.dataObj) );
                                        } else if( this.stringBuffer[ 0 ] === 'C' ) {
                                            //Y.log("jm@dc found C data");
                                            this.lastSide = this.stringBuffer[ 1 ];
                                            this.dataObj[ "R1" + this.lastSide ] = trimNum( this.stringBuffer.substring( 2, 7 ) );
                                            this.dataObj[ "D1" + this.lastSide ] = trimNum( this.stringBuffer.substring( 7, 12 ) );
                                            this.dataObj[ "AX1" + this.lastSide ] = trimNum( this.stringBuffer.substring( 12, 15 ) );
                                            this.dataObj[ "R2" + this.lastSide ] = trimNum( this.stringBuffer.substring( 15, 20 ) );
                                            this.dataObj[ "D2" + this.lastSide ] = trimNum( this.stringBuffer.substring( 20, 25 ) );
                                            this.dataObj[ "AX2" + this.lastSide ] = trimNum( this.stringBuffer.substring( 25, 28 ) );
                                            this.dataObj[ "Rav" + this.lastSide ] = trimNum( this.stringBuffer.substring( 28, 33 ) );
                                            this.dataObj[ "CYL" + this.lastSide ] = trimNum( this.stringBuffer.substring( 33, 39 ) );
                                            //Y.log( "jm@dc data so far: " + util.inspect(this.dataObj) );
                                        } else if( this.stringBuffer[ 0 ] === 'P' ) {
                                            //Y.log("jm@dc found P data");
                                            this.lastSide = this.stringBuffer[ 1 ];
                                            this.dataObj[ "H" + this.lastSide ] = trimNum( this.stringBuffer.substring( 2, 7 ) );
                                            this.dataObj[ "V" + this.lastSide ] = trimNum( this.stringBuffer.substring( 7, 12 ) );
                                            this.dataObj[ "T" + this.lastSide ] = trimNum( this.stringBuffer.substring( 12, 17 ) );
                                            this.dataObj[ "N" + this.lastSide ] = trimNum( this.stringBuffer.substring( 17, 22 ) );
                                            this.dataObj[ "S" + this.lastSide ] = trimNum( this.stringBuffer.substring( 22, 27 ) );
                                            this.dataObj[ "I" + this.lastSide ] = trimNum( this.stringBuffer.substring( 27, 32 ) );
                                            this.dataObj[ "Eh" + this.lastSide ] = trimNum( this.stringBuffer.substring( 32, 37 ) );
                                            this.dataObj[ "Ev" + this.lastSide ] = trimNum( this.stringBuffer.substring( 37, 42 ) );
                                            this.dataObj[ "Eav" + this.lastSide ] = trimNum( this.stringBuffer.substring( 42, 47 ) );
                                            this.dataObj[ "dum" + this.lastSide ] = this.stringBuffer.substring( 47, 82 );
                                            //Y.log( "jm@dc data so far: " + util.inspect(this.dataObj) );
                                        }
                                    }
                                    if( this.eot ) {
                                        //Y.log("jm@dc: "+util.inspect(this.dataObj));
                                        callback( this.dataObj );
                                        this.dataObj = {};
                                    }
                                    Y.doccirrus.api.sdManager.sendSerialData( {
                                        device,
                                        serialData: Buffer.from( [ 0x06, 0x06, 0x00 ] )
                                    } );
                                }
                                //else {Y.log("jm@dc: checksum not ok");}
                                this.resetValues();
                            }
                        } else {
                            var char = ISO_8859_1[ parseInt( byteArray[ i ][ 0 ], 16 ) ][ parseInt( byteArray[ i ][ 1 ], 16 ) ];
                            if( char.trim().length <= 1 ) {
                                this.stringBuffer += char === "   " ? " " : (char.trim());
                            }

                            if( "ENQ" === char && byteArray.length === 3 ) {
                                //Y.log("jm@dc: ENQ");
                                this.checksumCount( byteArray[ i ] );
                                this.checkMode = true;
                            }
                            else if( "EOT" === char && byteArray.length === 3 ) {
                                //Y.log("jm@dc: EOT");
                                this.checksumCount( byteArray[ i ] );
                                this.checkMode = true;
                                this.eot = true;
                            }
                            else if( "SOH" === char ) {
                                //Y.log("jm@dc: start of heading");
                                this.messageType = "heading_block";
                            }
                            else if( "STX" === char ) {
                                //Y.log("jm@dc: start of data");
                                this.messageType = "data_block";
                            }
                            else if( "ETB" === char ) {
                                //Y.log("jm@dc: end of heading/data");
                                this.checksumCount( byteArray[ i ] );
                                this.checkMode = true;
                            }
                            else if( "ETX" === char ) {
                                //Y.log("jm@dc: end of last data");
                                this.checksumCount( byteArray[ i ] );
                                this.checkMode = true;
                            }
                            else {
                                this.checksumCount( byteArray[ i ] );
                            }
                        }
                        this.lastByte = byteArray[ i ];
                    }
                }
            },
            "Tomey TL-3000": {
                buffer: "",
                pd: 0,
                parse: function( { serialData: bytes, device }, callback ) {
                    var byteArray = bytes.split( " " );
                    var eot = false;
                    for( var i = 0; i < byteArray.length; i++ ) {
                        var char = ISO_8859_1[ parseInt( byteArray[ i ][ 0 ], 16 ) ][ parseInt( byteArray[ i ][ 1 ], 16 ) ];
                        if( char.trim().length <= 1 ) {
                            this.buffer += char === "   " ? " " : (char.trim());
                        }

                        if( "CR " === char ) {
                            if( eot ) {
                                Y.log( this.buffer, "debug", NAME );
                                var refData = this.buffer.split( "\n" );
                                var refDataObj = {};
                                var lastSide = "";
                                for( var j = 0; j < refData.length; j++ ) {
                                    if( 0 === j && refData[ 0 ].trim() ) {
                                        refDataObj.ID = refData[ 0 ].trim();
                                    }
                                    else if( "LM" === refData[ 0 ].substr( 0, 2 ) ) {
                                        refDataObj.orType = "LM";
                                    }
                                    else if( "L" === refData[ j ][ 0 ] ) {
                                        lastSide = refData[ j ][ 1 ];
                                        refDataObj[ "orSph" + lastSide ] = trimNum( refData[ j ].substring( 2, 8 ) );
                                        refDataObj[ "orCyl" + lastSide ] = trimNum( refData[ j ].substring( 8, 14 ) );
                                        refDataObj[ "orAxs" + lastSide ] = trimNum( refData[ j ].substring( 14, 17 ) );
                                    }
                                    else if( "A" === refData[ j ][ 0 ] ) {
                                        lastSide = refData[ j ][ 1 ];
                                        refDataObj[ "orAdd" + lastSide ] = trimNum( refData[ j ].substring( 2, 6 ) );
                                        refDataObj[ "orAdd2" + lastSide ] = trimNum( refData[ j ].substring( 6, 10 ) );
                                    }
                                    else if( "P" === refData[ j ][ 0 ] ) {
                                        lastSide = refData[ j ][ 1 ];
                                        refDataObj[ "orPsmH" + lastSide ] = trimNum( refData[ j ].substring( 2, 8 ) );
                                        refDataObj[ "orPsmV" + lastSide ] = trimNum( refData[ j ].substring( 6, 14 ) );
                                    }
                                    else if( "D" === refData[ j ][ 0 ] ) {
                                        lastSide = refData[ j ][ 1 ];
                                        if( refDataObj.orPD ) {
                                            refDataObj.orPD = (refDataObj.orPD + trimNum( refData[ j ].substring( 2, 6 ) )) / 2.0;
                                        }
                                        else {
                                            refDataObj.orPD = trimNum( refData[ j ].substring( 2, 6 ) );
                                        }
                                    }
                                }
                                Y.doccirrus.api.sdManager.sendSerialData( {
                                    device,
                                    serialData: Buffer.from( [ 0x06 ] )
                                } );
                                //Y.log("jm@dc:"+ util.inspect(refDataObj));
                                callback( refDataObj );
                                this.buffer = "";
                            } else {
                                this.buffer += "\n";
                            }
                        }
                        if( "EOT" === char ) {
                            eot = true;
                        }
                        if( "SOH" === char ) {
                            this.buffer = "";
                        }
                    }
                }
            },
            "Leica": {
                buffer: "",
                pd: 0,
                lastByte: "",
                mode: 0,
                parse: function( { serialData: bytes }, callback ) {
                    var byteArray = bytes.split( " " );
                    for( var i = 0; i < byteArray.length; i++ ) {
                        var char = ISO_8859_1[ parseInt( byteArray[ i ][ 0 ], 16 ) ][ parseInt( byteArray[ i ][ 1 ], 16 ) ];
                        if( char.trim().length <= 1 ) {
                            this.buffer += char === "   " ? " " : (char.trim());
                        }
                        if( "0a" === byteArray[ i ] && "0d" === this.lastByte ) {
                            if( 2 === this.mode ) {
                                //Y.log( "jm@dc end: \n" + this.buffer );
                                var refData = this.buffer.split( "\n" );
                                var refDataObj = { valR: [], valL: [], avgR: 0, avgL: 0 };
                                var dir = "";
                                for( var j = 0; j < refData.length; j++ ) {
                                    if( "Links" === refData[ j ].substr( 0, 5 ) ) {
                                        dir = "L";
                                        var valsL = refData[ j ].split( " " );
                                        for( var k = 1; k < valsL.length; k++ ) {
                                            if( valsL[ k ] ) {
                                                refDataObj.valL.push( valsL[ k ] );
                                            }
                                        }
                                    }
                                    else if( "Rechts" === refData[ j ].substr( 0, 6 ) ) {
                                        dir = "R";
                                        var valsR = refData[ j ].split( " " );
                                        for( var l = 1; l < valsR.length; l++ ) {
                                            if( valsR[ l ] ) {
                                                refDataObj.valR.push( valsR[ l ] );
                                            }
                                        }
                                    }
                                    else if( "Mittelw." === refData[ j ].substr( 0, 8 ) ) {
                                        refDataObj[ "avg" + dir ] = parseFloat( refData[ j ].substr( (refData[ j ].indexOf( '[' ) + 1), (refData[ j ].indexOf( ']' )) ) );
                                    }
                                }
                                //Y.log( "jm@dc end: \n" + util.inspect(refDataObj));
                                callback( refDataObj );
                                this.buffer = "";
                                this.mode = 0;
                            }
                            else {
                                this.buffer += "\n";
                            }
                        }
                        this.lastByte = byteArray[ i ];
                        if( this.buffer.substr( this.buffer.length - 8 ) === "Mittelw." ) {
                            this.mode++;
                        }
                    }
                }
            },
            "miniVIDAS": {
                buffer: Buffer.alloc( 0 ),
                pd: 0,
                lastByte: "",
                mode: 0,
                parse: function( { serialData: bytes, device }, callback ) {
                    let NAME = "serialParsers_miniVIDAS";

                    let ENQ = 0x05;
                    let ACK = 0x06;
                    let STX = 0x02;
                    let EOT = 0x04;
                    let RS = 0x1e;
                    let GS = 0x1d;
                    let pipe = 0x7c; // |

                    function parseBuff(buffer, callback) {
                        let tempString = "";
                        let result = [];
                        const EMPTY = "[Keine Angabe]";

                        buffer.forEach( byte => {
                            switch(byte) {
                                case STX:
                                case GS:
                                case RS:
                                    if ( tempString ) {
                                        if ("mtrsl" === tempString) {
                                            Y.log("\n- new Entry -", 'info', NAME);
                                            result.push({"Unbekanntes Feld": []});
                                            result[result.length - 1].Meldungstyp = tempString;
                                        } else {
                                            if ( !result[result.length-1] ) {
                                                result.push({"Unbekanntes Feld": []});
                                            }
                                            if (0 === tempString.indexOf("pi")) {
                                                result[result.length-1]["Patienten-ID"] = tempString.slice(2) || EMPTY;
                                            } else if (0 === tempString.indexOf("pn")) {
                                                result[result.length-1].Patientenname = tempString.slice(2) || EMPTY;
                                            } else if (0 === tempString.indexOf("si")) {
                                                result[result.length-1].Probenseparator = tempString.slice(2) || EMPTY;
                                            } else if (0 === tempString.indexOf("ci")) {
                                                result[result.length-1]["Proben-ID"] = tempString.slice(2) || EMPTY;
                                            } else if (0 === tempString.indexOf("rt")) {
                                                result[result.length-1]["Kurzname des Tests"] = tempString.slice(2) || EMPTY;
                                            } else if (0 === tempString.indexOf("rn")) {
                                                result[result.length-1]["Langer Testname"] = tempString.slice(2) || EMPTY;
                                            } else if (0 === tempString.indexOf("ql")) {
                                                result[result.length-1]["Qualitatives Ergebnis"] = tempString.slice(2) || EMPTY;
                                            } else if (0 === tempString.indexOf("qn")) {
                                                result[result.length-1]["Quantitatives Ergebnis"] = tempString.slice(2) || EMPTY;
                                            } else if (0 === tempString.indexOf("tt")) {
                                                result[result.length-1]["Uhrzeit Testende"] = tempString.slice(2) || EMPTY;
                                            } else if (0 === tempString.indexOf("td")) {
                                                result[result.length-1]["Datum Testende"] = tempString.slice(2) || EMPTY;
                                            } else if (0 === tempString.indexOf("qd")) {
                                                result[result.length-1]["Verdünnung"] = tempString.slice(2) || EMPTY;
                                            } else {
                                                result[result.length-1]["Unbekanntes Feld"].push( tempString );
                                            }
                                        }
                                        Y.log("blob: "+tempString, 'info', NAME);
                                        tempString = "";
                                    }
                                    break;
                                case pipe:
                                    break;
                                default: tempString+=String.fromCharCode( byte );
                            }
                        } );
                        Y.log("Result:");
                        Y.log(require('util').inspect(result, {depth: 10, colors: true}));
                        callback( null, result );
                    }
                    if ( 1 === bytes.length && ENQ === bytes[0] ) {
                        Y.doccirrus.api.sdManager.sendSerialData( {
                            device,
                            serialData: Buffer.from( [ ACK ] )
                        } );
                    } else if ( 1 === bytes.length && EOT === bytes[0] ) {
                        let tempBuff = Buffer.from( this.buffer );
                        this.buffer = Buffer.alloc( 0 );
                        setImmediate( parseBuff.bind( null, tempBuff, callback ));
                    } else {
                        this.buffer = Buffer.concat( [ this.buffer, bytes ] );
                    }
                    callback();
                }
            }
        };
        
        /**
         * trims all spaces out of strings like "  + 0 . 3 4  " so they can be parsed as float/int
         * @method trimNum
         * @param {String} num
         *
         * @return {String | Function}
         */
        function trimNum( num ) {
            var trimres = num.replace( / /g, '' );
            if( trimres !== "" ) {
                return parseFloat( trimres );
            } else {
                return "";
            }
        }

        /**
         * Prints message which is received from device server
         * @param {String} text message text
         * @param {Object} msg message object
         * @param {String} [type="debug"] debug type(debug, error and etc.)
         */
        function printBuffer( text, msg, type ) {//jshint ignore:line
            var
                data = msg && msg.data,
                path = msg && msg.path;
            
            try {
                var buf = new Buffer( data );
                type = type || 'debug';
                Y.log( text + ' path: ' + path + ', data: ' + buf.toString(), type, NAME );
            } catch(e) {
                Y.log('printBuffer failed; data: ', 'info', NAME);
                Y.log(data, 'info', NAME);
                Y.log('error:', 'info', NAME);
                Y.log(e, 'info', NAME);
            }
        }
    },
    '0.0.1', {
        requires: []
    }
);
