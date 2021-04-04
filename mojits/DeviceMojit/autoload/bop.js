/*
 @author: jm
 @date: 2014-10-13
 */

/**
 * Library for management of byte operations
 */

/*global YUI */



YUI.add( 'dcbop', function( Y, NAME ) {
        this.name = NAME;

        //copied from s2e
        //helpful string/hex string/bytestream conversion
        //proper strings are regular strings with special characters in [brackets]
        var Bop = function(){
            var self = this;
            
            var default_encoding = "ISO 8859-1";
            
            this.encodings = {
                "ISO 8859-1": [
                    //_0    _1    _2    _3    _4    _5    _6    _7    _8    _9    _a    _b    _c    _d    _e    _f
                    ["NUL","SOH","STX","ETX","EOT","ENQ","ACK","BEL","BS "," \t ","LF ","VT ","FF ","CR ","SO ","SI "], // 0_
                    ["DLE","DC1","DC2","DC3","DC4","NAK","SYN","ETB","CAN","EM ","SUB","ESC","FS ","GS ","RS ","US "], // 1_
                    ["   "," ! ",' " '," # "," $ "," % "," & "," ' "," ( "," ) "," * "," + "," , "," - "," . "," / "], // 2_
                    [" 0 "," 1 "," 2 "," 3 "," 4 "," 5 "," 6 "," 7 "," 8 "," 9 "," : "," ; "," < "," = "," > "," ? "], // 3_
                    [" @ "," A "," B "," C "," D "," E "," F "," G "," H "," I "," J "," K "," L "," M "," N "," O "], // 4_
                    [" P "," Q "," R "," S "," T "," U "," V "," W "," X "," Y "," Z "," [ "," \\ "," ] "," ^ "," _ "],// 5_
                    [" ` "," a "," b "," c "," d "," e "," f "," g "," h "," i "," j "," k "," l "," m "," n "," o "], // 6_
                    [" p "," q "," r "," s "," t "," u "," v "," w "," x "," y "," z "," { "," | "," } "," ~ ","DEL"], // 7_
    
                    ["PAD","HOP","BPH","NBH","IND","NEL","SSA","ESA","HTS","HTJ","VTS","PLD","PLU","RI ","SS2","SS3"], // 8_
                    ["DCS","PU1","PU2","STS","CCH","MW ","SPA","EPA","SOS","SGC","SCI","CSI","ST ","OSC","PM ","APC"], // 9_
                    ["NBS"," ¡ "," ¢ "," £ "," ¤ "," ¥ "," ¦ "," § "," ¨ "," © "," ª "," « "," ¬ ","SHY"," ® "," ¯ "], // a_
                    [" ° "," ± "," ² "," ³ "," ´ "," µ "," ¶ "," · "," ¸ "," ¹ "," º "," » "," ¼ "," ½ "," ¾ "," ¿ "], // b_
                    [" À "," Á "," Â "," Ã "," Ä "," Å "," Æ "," Ç "," È "," É "," Ê "," Ë "," Ì "," Í "," Î "," Ï "], // c_
                    [" Ð "," Ñ "," Ò "," Ó "," Ô "," Õ "," Ö "," × "," Ø "," Ù "," Ú "," Û "," Ü "," Ý "," Þ "," ß "], // d_
                    [" à "," á "," â "," ã "," ä "," å "," æ "," ç "," è "," é "," ê "," ë "," ì "," í "," î "," ï "], // e_
                    [" ð "," ñ "," ò "," ó "," ô "," õ "," ö "," ÷ "," ø "," ù "," ú "," û "," ü "," ý "," þ "," ÿ "]  // f_
                ],
                "ISO 8859-15": [
                    //_0    _1    _2    _3    _4    _5    _6    _7    _8    _9    _a    _b    _c    _d    _e    _f
                    ["NUL","SOH","STX","ETX","EOT","ENQ","ACK","BEL","BS "," \t ","LF ","VT ","FF ","CR ","SO ","SI "], // 0_
                    ["DLE","DC1","DC2","DC3","DC4","NAK","SYN","ETB","CAN","EM ","SUB","ESC","FS ","GS ","RS ","US "], // 1_
                    ["   "," ! ",' " '," # "," $ "," % "," & "," ' "," ( "," ) "," * "," + "," , "," - "," . "," / "], // 2_
                    [" 0 "," 1 "," 2 "," 3 "," 4 "," 5 "," 6 "," 7 "," 8 "," 9 "," : "," ; "," < "," = "," > "," ? "], // 3_
                    [" @ "," A "," B "," C "," D "," E "," F "," G "," H "," I "," J "," K "," L "," M "," N "," O "], // 4_
                    [" P "," Q "," R "," S "," T "," U "," V "," W "," X "," Y "," Z "," [ "," \\ "," ] "," ^ "," _ "],// 5_
                    [" ` "," a "," b "," c "," d "," e "," f "," g "," h "," i "," j "," k "," l "," m "," n "," o "], // 6_
                    [" p "," q "," r "," s "," t "," u "," v "," w "," x "," y "," z "," { "," | "," } "," ~ ","DEL"], // 7_
            
                    ["PAD","HOP","BPH","NBH","IND","NEL","SSA","ESA","HTS","HTJ","VTS","PLD","PLU","RI ","SS2","SS3"], // 8_
                    ["DCS","PU1","PU2","STS","CCH","MW ","SPA","EPA","SOS","SGC","SCI","CSI","ST ","OSC","PM ","APC"], // 9_
                    ["NBS"," ¡ "," ¢ "," £ "," € "," ¥ "," Š "," § "," š "," © "," ª "," « "," ¬ ","SHY"," ® "," ¯ "], // a_
                    [" ° "," ± "," ² "," ³ "," Ž "," µ "," ¶ "," · "," ž "," ¹ "," º "," » "," Œ "," œ "," Ÿ "," ¿ "], // b_
                    [" À "," Á "," Â "," Ã "," Ä "," Å "," Æ "," Ç "," È "," É "," Ê "," Ë "," Ì "," Í "," Î "," Ï "], // c_
                    [" Ð "," Ñ "," Ò "," Ó "," Ô "," Õ "," Ö "," × "," Ø "," Ù "," Ú "," Û "," Ü "," Ý "," Þ "," ß "], // d_
                    [" à "," á "," â "," ã "," ä "," å "," æ "," ç "," è "," é "," ê "," ë "," ì "," í "," î "," ï "], // e_
                    [" ð "," ñ "," ò "," ó "," ô "," õ "," ö "," ÷ "," ø "," ù "," ú "," û "," ü "," ý "," þ "," ÿ "]  // f_
                ],
                "Code page 437": [
                    //_0    _1    _2    _3    _4    _5    _6    _7    _8    _9    _a    _b    _c    _d    _e    _f
                    ["NUL","SOH","STX","ETX","EOT","ENQ","ACK","BEL","BS "," \t ","LF ","VT ","FF ","CR ","SO ","SI "], // 0_
                    ["DLE","DC1","DC2","DC3","DC4","NAK","SYN","ETB","CAN","EM ","SUB","ESC","FS ","GS ","RS ","US "], // 1_
                    ["   "," ! ",' " '," # "," $ "," % "," & "," ' "," ( "," ) "," * "," + "," , "," - "," . "," / "], // 2_
                    [" 0 "," 1 "," 2 "," 3 "," 4 "," 5 "," 6 "," 7 "," 8 "," 9 "," : "," ; "," < "," = "," > "," ? "], // 3_
                    [" @ "," A "," B "," C "," D "," E "," F "," G "," H "," I "," J "," K "," L "," M "," N "," O "], // 4_
                    [" P "," Q "," R "," S "," T "," U "," V "," W "," X "," Y "," Z "," [ "," \\ "," ] "," ^ "," _ "],// 5_
                    [" ` "," a "," b "," c "," d "," e "," f "," g "," h "," i "," j "," k "," l "," m "," n "," o "], // 6_
                    [" p "," q "," r "," s "," t "," u "," v "," w "," x "," y "," z "," { "," | "," } "," ~ "," ⌂ "], // 7_
            
                    [" Ç "," ü "," é "," â "," ä "," à "," å "," ç "," ê "," ë "," è "," ï "," î "," ì "," Ä "," Å "], // 8_
                    [" É "," æ "," Æ "," ô "," ö "," ò "," û "," ù "," ÿ "," Ö "," Ü "," ¢ "," £ "," ¥ "," ₧ "," ƒ "], // 9_
                    [" á "," í "," ó "," ú "," ñ "," Ñ "," ª "," º "," ¿ "," ⌐ "," ¬ "," ½ "," ¼ "," ¡ "," « "," » "], // a_
                    [" ░ "," ▒ "," ▓ "," │ "," ┤ "," ╡ "," ╢ "," ╖ "," ╕ "," ╣ "," ║ "," ╗ "," ╝ "," ╜ "," ╛ "," ┐ "], // b_
                    [" └ "," ┴ "," ┬ "," ├ "," ─ "," ┼ "," ╞ "," ╟ "," ╚ "," ╔ "," ╩ "," ╦ "," ╠ "," ═ "," ╬ "," ╧ "], // c_
                    [" ╨ "," ╤ "," ╥ "," ╙ "," ╘ "," ╒ "," ╓ "," ╫ "," ╪ "," ┘ "," ┌ "," █ "," ▄ "," ▌ "," ▐ "," ▀ "], // d_
                    [" α "," ß "," Γ "," π "," Σ "," σ "," µ "," τ "," Φ "," Θ "," Ω "," δ "," ∞ "," φ "," ε "," ∩ "], // e_
                    [" ≡ "," ± "," ≥ "," ≤ "," ⌠ "," ⌡ "," ÷ "," ≈ "," ° "," ∙ "," · "," √ "," ⁿ "," ² "," ■ ","NBS"]  // f_
                ],
                "ASCII (german)": [
                    //_0    _1    _2    _3    _4    _5    _6    _7    _8    _9    _a    _b    _c    _d    _e    _f
                    ["NUL","SOH","STX","ETX","EOT","ENQ","ACK","BEL","BS "," \t ","LF ","VT ","FF ","CR ","SO ","SI "], // 0_
                    ["DLE","DC1","DC2","DC3","DC4","NAK","SYN","ETB","CAN","EM ","SUB","ESC","FS ","GS ","RS ","US "], // 1_
                    ["   "," ! ",' " '," # "," $ "," % "," & "," ' "," ( "," ) "," * "," + "," , "," - "," . "," / "], // 2_
                    [" 0 "," 1 "," 2 "," 3 "," 4 "," 5 "," 6 "," 7 "," 8 "," 9 "," : "," ; "," < "," = "," > "," ? "], // 3_
                    [" § "," A "," B "," C "," D "," E "," F "," G "," H "," I "," J "," K "," L "," M "," N "," O "], // 4_
                    [" P "," Q "," R "," S "," T "," U "," V "," W "," X "," Y "," Z "," Ä "," Ö "," Ü "," ^ "," _ "], // 5_
                    [" ` "," a "," b "," c "," d "," e "," f "," g "," h "," i "," j "," k "," l "," m "," n "," o "], // 6_
                    [" p "," q "," r "," s "," t "," u "," v "," w "," x "," y "," z "," ä "," ö "," ü "," ß ","DEL"], // 7_
    
                    ["NUL","SOH","STX","ETX","EOT","ENQ","ACK","BEL","BS ","HT ","LF ","VT ","FF ","CR ","SO ","SI "], // 8_
                    ["DLE","DC1","DC2","DC3","DC4","NAK","SYN","ETB","CAN","EM ","SUB","ESC","FS ","GS ","RS ","US "], // 9_
                    ["   "," ! ",' " '," # "," $ "," % "," & "," ' "," ( "," ) "," * "," + "," , "," - "," . "," / "], // a_
                    [" 0 "," 1 "," 2 "," 3 "," 4 "," 5 "," 6 "," 7 "," 8 "," 9 "," : "," ; "," < "," = "," > "," ? "], // b_
                    [" § "," A "," B "," C "," D "," E "," F "," G "," H "," I "," J "," K "," L "," M "," N "," O "], // c_
                    [" P "," Q "," R "," S "," T "," U "," V "," W "," X "," Y "," Z "," Ä "," Ö "," Ü "," ^ "," _ "], // d_
                    [" ` "," a "," b "," c "," d "," e "," f "," g "," h "," i "," j "," k "," l "," m "," n "," o "], // e_
                    [" p "," q "," r "," s "," t "," u "," v "," w "," x "," y "," z "," ä "," ö "," ü "," ß ","DEL"]  // f_
                ],
                "Mac OS Roman": [
                    //_0    _1    _2    _3    _4    _5    _6    _7    _8    _9    _a    _b    _c    _d    _e    _f
                    ["NUL","SOH","STX","ETX","EOT","ENQ","ACK","BEL","BS "," \t ","LF ","VT ","FF ","CR ","SO ","SI "], // 0_
                    ["DLE","DC1","DC2","DC3","DC4","NAK","SYN","ETB","CAN","EM ","SUB","ESC","FS ","GS ","RS ","US "], // 1_
                    ["   "," ! ",' " '," # "," $ "," % "," & "," ' "," ( "," ) "," * "," + "," , "," - "," . "," / "], // 2_
                    [" 0 "," 1 "," 2 "," 3 "," 4 "," 5 "," 6 "," 7 "," 8 "," 9 "," : "," ; "," < "," = "," > "," ? "], // 3_
                    [" @ "," A "," B "," C "," D "," E "," F "," G "," H "," I "," J "," K "," L "," M "," N "," O "], // 4_
                    [" P "," Q "," R "," S "," T "," U "," V "," W "," X "," Y "," Z "," [ "," \\ "," ] "," ^ "," _ "],// 5_
                    [" ` "," a "," b "," c "," d "," e "," f "," g "," h "," i "," j "," k "," l "," m "," n "," o "], // 6_
                    [" p "," q "," r "," s "," t "," u "," v "," w "," x "," y "," z "," { "," | "," } "," ~ ","DEL"], // 7_
            
                    [" Ä "," Å "," Ç "," É "," Ñ "," Ö "," Ü "," á "," à "," â "," ä "," ã "," å "," ç "," é "," è "], // 8_
                    [" ê "," ë "," í "," ì "," î "," ï "," ñ "," ó "," ò "," ô "," ö "," õ "," ú "," ù "," û "," ü "], // 9_
                    [" † "," ° "," ¢ "," £ "," § "," • "," ¶ "," ß "," ® "," © "," ™ "," ´ "," ¨ "," ≠ "," Æ "," Ø "], // a_
                    [" ∞ "," ± "," ≤ "," ≥ "," ¥ "," µ "," ∂ "," ∑ "," ∏ "," π "," ∫ "," ª "," º "," Ω "," æ "," ø "], // b_
                    [" ¿ "," ¡ "," ¬ "," √ "," ƒ "," ≈ "," ∆ "," « "," » "," … ","NBS"," À "," Ã "," Õ "," Œ "," œ "], // c_
                    [" – "," — "," “ "," ” "," ‘ "," ’ "," ÷ "," ◊ "," ÿ "," Ÿ "," ⁄ "," € "," ‹ "," › "," ﬁ "," ﬂ "], // d_
                    [" ‡ "," · "," ‚ "," „ "," ‰ "," Â "," Ê "," Á "," Ë "," È "," Í "," Î "," Ï "," Ì "," Ó "," Ô "], // e_
                    ["APL"," Ò "," Ú "," Û "," Ù "," ı "," ˆ "," ˜ "," ¯ "," ˘ "," ˙ "," ˚ "," ¸ "," ˝ "," ˛ "," ˇ "]  // f_
                ]
            };
            
    
            /**
             * debug logging function, so that we don't need to delete debug logging messages in this module
             * @method dbg
             * @param {String} msg
             */
            function dbg(msg) {Y.log("bop debug: "+msg, "debug", NAME);}
            
            //transforms buffers into readable hex byte strings
            this.buff2hex = function(buff) {
                dbg("buff2hex");
                var str = "";
                for (var i = 0; i < buff.length; i++) {
                    str += (0===i?"":" ")+(16>buff[i]?"0":"")+buff[i].toString(16);
                }
                return str;
            };
       
            //transforms buffers into readable chars
            this.buff2char = function(buff, encoding, untrimmed) {
                dbg("buff2char");
                if (!encoding || !self.encodings[encoding]) { encoding = default_encoding; }
                var charStr = "";
                for (var i = 0; i < buff.length; i++) {
                    if (untrimmed) {
                        charStr += self.encodings[encoding][Math.floor(buff[i]/16)][buff[i]%16];
                    } else {
                        var curChar = self.encodings[encoding][Math.floor(buff[i]/16)][buff[i]%16];
                        if (curChar.trim().length>1) {  charStr += "["+curChar.trim()+"]";  }
                        else if (curChar === "   ") {  charStr += " ";  }
                        else if (curChar === " \t ") {  charStr += "\t";  }
                        else if (curChar === " [ ") {  charStr += "/[";  }
                        else {  charStr += curChar.trim();  }
                    }
                }
                return charStr;
            };
        
            //transforms char string to buffer
            this.char2buff = function(charStr, encoding, doReturnArray, noEscape) {
                dbg("char2buff");
                var directMode = false,
                    ignoreNext = false,
                    buffArray = [],
                    curBytes = "";
        
                for (var i = 0; i < charStr.length; i++) {
                    if (directMode) {
                        if ("]" === charStr[i] || " " === charStr[i]) {
                            if ("]" === charStr[i]) {
                                dbg(charStr[i]+" ("+i+")"+": directMode end");
                                directMode = false;
                            }
                            var hex = self.findHex(curBytes, true, encoding);
                            if (hex) {
                                buffArray.push(parseInt(hex,16));
                            } else {
                                buffArray.push(parseInt(curBytes,16));
                            }
                            curBytes = "";
                        }
                        else {
                            dbg(charStr[i]+" ("+i+")"+": directMode regular");
                            curBytes+=charStr[i];
                        }
                    } else {
                        if (!noEscape && "[" === charStr[i] && !ignoreNext) {
                            dbg(charStr[i]+" ("+i+")"+": directMode start");
                            directMode = true;
                        }
                        else if (!noEscape && "/" === charStr[i] && !ignoreNext) {
                            dbg(charStr[i]+" ("+i+")"+": ignoreNext");
                            ignoreNext = true;
                        }
                        else {
                            dbg(charStr[i]+" ("+i+")"+": regular");
                            buffArray.push(parseInt(self.findHex(charStr[i], false, encoding), 16));
                            ignoreNext = false;
                        }
                    }
                }
                return doReturnArray?buffArray:new Buffer(buffArray);
            };
        
            //transforms input string to hexstring
            this.char2hex = function(charStr, encoding) {
                dbg("char2hex");
                var hexStr = "",
                    directMode = false,
                    ignoreNext = false,
                    curBytes = "";
        
                for (var i = 0; i < charStr.length; i++) {
                    if (directMode) {
                        if ("]" === charStr[i] || " " === charStr[i]) {
                            if ("]" === charStr[i]) {
                                dbg(charStr[i]+" ("+i+")"+": directMode end");
                                directMode = false;
                            }
                            var hex = self.findHex(curBytes, true, encoding);
                            if (hex) {
                                hexStr += hex + " ";
                            } else {
                                hexStr += curBytes + " ";
                            }
                            curBytes = "";
                        }
                        else if ("[" === charStr[i]) {
                            dbg(charStr[i]+" ("+i+")"+": bad end of directMode");
                            directMode = false;
                            hexStr += "5b ";
                        }
                        else {
                            dbg(charStr[i]+" ("+i+")"+": directMode regular");
                            curBytes+=charStr[i];
                        }
                    } else {
                        if ("[" === charStr[i] && !ignoreNext) {
                            dbg(charStr[i]+" ("+i+")"+": directMode start");
                            directMode = true;
                        }
                        else if ("/" === charStr[i] && !ignoreNext) {
                            dbg(charStr[i]+" ("+i+")"+": ignoreNext");
                            ignoreNext = true;
                        }
                        else {
                            dbg(charStr[i]+" ("+i+")"+": regular");
                            hexStr += self.findHex(charStr[i], false, encoding)+" ";
                            ignoreNext = false;
                        }
                    }
                }
                return hexStr.trim();
            };
        
            //transforms strings of hex bytes separated by spaces into proper buffers
            this.hex2buff = function(hexStr, doReturnArray) {
                dbg("hex2buff");
                var strArray = hexStr.split(" "),
                    buffArray = [];
        
                strArray.forEach(function(hexByte) {
                    buffArray.push(parseInt(hexByte, 16));
                });
                return doReturnArray?buffArray:new Buffer(buffArray);
            };
        
            //transforms strings of hex bytes separated by spaces into readable chars
            this.hex2char = function(hexStr, encoding) {
                dbg("hex2char");
                var strArray = hexStr.split(" "),
                    charStr = "";
                strArray.forEach(function(hex) {
                    var curChar = self.findChar(hex, encoding);
                    if (curChar.trim().length>1) {  charStr += "["+curChar+"]";  }
                    else {  charStr += curChar;  }
                });
                return charStr;
            };
        
            //finds appropriate hex number
            this.findHex = function(char, untrimmed, encoding) {
                if (!encoding || !self.encodings[encoding]) { encoding = default_encoding; }
                if (char === " ") {  return "20";  }
                for (var y = 0; y < 16; y++) {
                    for (var x = 0; x < 16; x++) {
                        if(untrimmed && char.toLowerCase() === self.encodings[encoding][y][x].trim().toLowerCase()) {
                            return y.toString(16)+ x.toString(16);
                        }
                        else if(!untrimmed && char === self.encodings[encoding][y][x].trim()) {
                            return y.toString(16)+ x.toString(16);
                        }
                    }
                }
                return false;// print '?' for lack of anything
            };
        
            //finds appropriate char or hex string
            this.findChar = function(hex, encoding) {
                if (!encoding || !self.encodings[encoding]) { encoding = default_encoding; }
                if (hex.length === 2) {  return self.encodings[encoding][parseInt(hex[0], 16)][parseInt(hex[1], 16)];  }
                else {  return false;  }
            };
            
            this.buff2charHexLog = function(buff, enc) {
                //count lines
                var linesTotal = 1;
                for (var i = 0; i < buff.length; i++) {
                    if (buff[i] === 0x0A) {
                        linesTotal++;
                    }
                }
                
                //print log
                var byteLine = [];
                var lineNumber = 1;
                for (var j = 0; j < buff.length; j++) {
                    byteLine.push(buff[j]);
                    if (buff[j] === 0x0A) {
                        var lineNumberStr = lineNumber+"";
                        while (lineNumberStr.length < (linesTotal+"").length) {
                            lineNumberStr = " " + lineNumberStr;
                        }
                        console.log("---------");
                        console.log(lineNumberStr+"   "+Y.doccirrus.api.bop.buff2hex(byteLine));
                        console.log(lineNumberStr+"   "+Y.doccirrus.api.bop.buff2char(byteLine, enc, true));
                        byteLine = [];
                        lineNumber++;
                    }
                }
            };
        };

        Y.namespace( 'doccirrus.api' ).bop = new Bop();
    },
    '0.0.1', {requires: [
        'inport-schema'
    ]}
);
