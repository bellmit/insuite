/*
 @author: jm
 @date: 2015-04-30
 */

"use strict";

//config

//  steps:

let pcl2pdf = true;
let pdf2svg = true;
let svgArialFix = true;

//  search parameter:

let fileSuffix = ".pcl";
//var fileSuffix = "test001.pcl"; //this works too


//command line args
let pclFlag = false;
let pdfFlag = false;
let noFixFlag = false;

process.argv.forEach(arg => {
    console.log(arg);
    if (arg === "-pcl") {
        pclFlag = true;
    }
    if (arg === "-pdf") {
        pdfFlag = true;
    }
    if (arg === "-noFix") {
        noFixFlag = true;
    }
});

if ( pclFlag && pdfFlag ) {
    console.log("please specify either -pcl or -pdf for the conversion process");
    process.exit();
}

if ( !pclFlag && !pdfFlag ) {
    console.log();
    console.log("please run with the appropriate arguments:");
    console.log();
    console.log("-pcl: convert from pcl to svg (cannot be used together with -pdf)");
    console.log("-pdf: convert from pdf to svg (cannot be used together with -pcl)");
    console.log("-noFix: disables fixes for Arial font names/etc. in svg output");
    console.log();
    process.exit();
}

if (pclFlag) {
    pcl2pdf = true;
    pdf2svg = true;
    fileSuffix = ".pcl";
}
if (pdfFlag) {
    pcl2pdf = false;
    pdf2svg = true;
    fileSuffix = ".pdf";
}
if (noFixFlag) {
    svgArialFix = false;
}



//code

var fs = require('fs');
var child_process = require('child_process');
var os = require('os');

function suffix(str, end) {
    //console.log("check: "+str.indexOf(end, str.length - end.length));
    return str.indexOf(end, str.length - end.length) !== -1;
}

function searchRec(dir, term, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
        if (err) {  return done(err);  }
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) {  return done(null, results);  }
            file = dir + '/' + file;
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    searchRec(file, term, function(err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    if (suffix(file, term)) { results.push(file.replace(/\/\//,"/")); }
                    next();
                }
            });
        })();
    });
}

function preReqCheck() {
    console.log("checking prerequisites...");

    if(os.platform()!=='darwin') {
        console.warn("OS/Environment needs to be OS X");
        return false;
    } else {  console.log("found OS X");  }

    if(process.version.split(".")[0]<4) {
        console.warn("This needs at least node v4.2.1 (or a rewrite for async file IO for a batchprocessing program)");
        return false;
    } else {  console.log("found node " + process.version);  }

    try {
        fs.lstatSync('/Applications/Inkscape.app');
        console.log("found Inkscape");
    } catch(ex) {
        console.warn("Inkscape 1.0 needs to be installed in /Applications/");
        return false;
    }

    console.log("ready.");
    console.log();
    console.log();
    return true;
}

if (preReqCheck()) {
    searchRec("./", fileSuffix, function(err, res) {
        if (err) {  console.log(err);  }
        else {
            for (var i = 0; i < res.length; i++) {
                var curPathBase = res[i].substr(0, res[i].length-4);

                var percent = ((i+1) / (res.length))*100;

                var bar = "";

                for (var j = 0; j < Math.round(percent); j++) {
                    bar += "O";
                }
                while (bar.length < 100) {  bar+="-";  }

                console.log("["+bar+ "]" + " "  + Math.round(percent * 10) / 10 + "% (" + ((i+1) + "/" + (res.length)) + ")\n"+curPathBase+".pcl");

                if (pcl2pdf) {
                    console.log("converting pcl to pdf;");
                    child_process.execSync('./pcl6 -dNOPAUSE -sDEVICE=pdfwrite -sOutputFile="' + curPathBase + ".pdf" + '" "' + curPathBase + ".pcl" + '"');
                }
                if (pdf2svg) {
                    console.log("converting pdf to svg;");
                    var absPath = process.cwd() + (curPathBase[0]==="."?curPathBase.substr(1):curPathBase);
                    child_process.execSync('/Applications/Inkscape.app/Contents/MacOS/inkscape "'+ absPath +'.pdf" --export-plain-svg --export-filename="'+ absPath +'.svg"');
                }
                if (svgArialFix) {
                    console.log("fixing svg;");
                    var tempSVG = fs.readFileSync(curPathBase+".svg", 'utf8');
                    tempSVG = tempSVG.replace(/-inkscape-font-specification:A030-Bol;/g, "-inkscape-font-specification:Arial; font-weight:bold;");
                    tempSVG = tempSVG.replace(/-inkscape-font-specification:A030-Ita;/g, "-inkscape-font-specification:Arial; font-style:italic;");
                    tempSVG = tempSVG.replace(/-inkscape-font-specification:A030-BolIta;/g, "-inkscape-font-specification:Arial; font-weight:bold; font-style:italic;");
                    tempSVG = tempSVG.replace(/-inkscape-font-specification:A030;/g, "-inkscape-font-specification:Arial;");
                    if (tempSVG.indexOf("font-size:0.") !== -1) {
                        console.warn("WARNING! file most likely contains a bitmap font!");
                    }
                    fs.writeFileSync(curPathBase+".svg", tempSVG);
                }
                console.log();
            }
        }
    });
} else {
    console.warn("\nprocess canceled.");
}
