'use strict';

//testcode for biotronik connection

//leave ID empty to get list of available downloads as json
//enter ID to fetch xml and store as [id].xml

var id = "";



var util = require('util');
var http = require('http');//jshint ignore: line
var https = require('https');//jshint ignore: line
var fs = require('fs');
var pfx = fs.readFileSync("1904974991-cert.p12");
var host = "api.biotronik-homemonitoring.com";
var port = 443;
var auth = "1904974991:bGKavIPN";
var passphrase = "pf0goDkfoZzJWsNEmYM67u7f";

var options = {
    host: host,
    port: port,
    path: "/rest/api/exports/"+id,
    method: "GET",
    auth: auth,
    pfx: pfx,
    passphrase: passphrase
};
var chunks = "";

var req = https.request(options, function(res) {
    res.on("data", function(chunk) {
        chunks+=chunk;
    });
    res.on("end", function() {
        console.log(shadef(0.75)+"statusCode: "+getColoredCode(res.statusCode));
        console.log(shadef(0.75)+"headers: "+setf(f.reset.all)+inspect(res.headers));
        console.log(shadef(0.75)+"end."+setf(f.reset.all));
        if (res.statusCode === 200) {
            var response;
            response = chunks;
            console.log(shadef(0.75)+"response:"+setf(f.reset.all));
            try {
                response = JSON.parse(response);
                console.log(inspect(response));
            } catch (e) {
                console.log("not json...");
                console.log(response);
                if (id) {
                    fs.writeFileSync(id+".xml", response);
                }
            }
            
        }
    });
});
req.on("error", function(msg) {
    console.log(msg);
});
req.end();









// text decoration code----------------------------------------------------

var f = {//jshint ignore: line
    format: {
        bold     : 1,
        italic   : 3,
        underline: 4,
        inverse  : 7
    },
    color: {
        pal: function(num) {// 0 - 256
            return "38;5;"+num;
        },
        shade: function(num) {// 0 - 24
            return "38;5;"+(232+num);
        },
        shadef: function(num) {// 0-  24
            return "38;5;"+(232+24*num);
        },
        rgb: function(r,g,b) {// 0 - 5
            return "38;5;"+(16+r*36+g*6+b);
        },
        black       : 30,
        red         : 31,
        green       : 32,
        yellow      : 33,
        blue        : 34,
        magenta     : 35,
        cyan        : 36,
        lightGrey   : 37,
        grey        : 90,
        lightRed    : 91,
        lightGreen  : 92,
        lightYellow : 93,
        lightBlue   : 94,
        lightMagenta: 95,
        lightCyan   : 96,
        white       : 97
    },
    bg: {
        black       : 40,
        red         : 41,
        green       : 42,
        yellow      : 43,
        blue        : 44,
        magenta     : 45,
        cyan        : 46,
        lightGrey   : 47,
        grey        : 100,
        lightRed    : 101,
        lightGreen  : 102,
        lightYellow : 103,
        lightBlue   : 104,
        lightMagenta: 105,
        lightCyan   : 106,
        white       : 107
    },
    reset: {
        all       : 0,
        bold      : 21,
        dim       : 22,
        underlined: 24,
        blink     : 25,
        reverse   : 27,
        hidden    : 28,
        color     : 39,
        bg        : 49
    }
};

var setf = function setf(key) {//jshint ignore: line
    return "\x1b["+key+"m";
};

//shortcuts

var shadef = c=>setf(f.color.shadef(c));//jshint ignore: line

function getColoredCode(code) {
    var rgb = code.toString();
    var r = 1+Math.floor(parseInt(rgb[0])/2);
    var g = 1+Math.floor(parseInt(rgb[1])/2);
    var b = 1+Math.floor(parseInt(rgb[2])/2);
    return setf(f.color.rgb(r,g,b))+code+setf(f.reset.color)+" ("+(http.STATUS_CODES[code]||"unknown")+")";
}

function inspect(obj) {
    return util.inspect(obj, {depth:10, colors: true});
}
