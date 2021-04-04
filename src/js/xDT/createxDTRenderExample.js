"use strict";

//usage: node src/xDT/createxDTRenderExample.js gdt gdt21 studyData

let moment = require('moment');

if (process.argv.length < 5) {
    console.log("please run with the following arguments:");
    console.log("node src/xDT/createxDTRenderExample.js [xDT type] [xDT version attribute name] [satz attribute name]");
    console.log();
    console.log("e.g.: node src/xDT/createxDTRenderExample.js gdt gdt21 studyData");
    process.exit(0);
}

let xDTType = process.argv[2];
let xDTVersion = process.argv[3];
let xDTMessageType = process.argv[4];

let data = {};

let lorem = [
    "Lorem ipsum dolor sit amet consectetur adipiscing elit",
    "sed do eiusmod tempor incididunt ut labore et dolore magna",
    "aliqua Ut enim ad minim veniam quis nostrud exercitation",
    "ullamco laboris nisi ut aliquip ex ea commodo consequat",
    "Duis aute irure dolor in reprehenderit in voluptate velit",
    "esse cillum dolore eu fugiat nulla pariatur Excepteur sint",
    "occaecat cupidatat non proident sunt in culpa qui officia",
    "deserunt mollit anim id est laborum",
    ""
];

global.YUI = { //fake YUI enough to get the data
    add: (name, functionContent) => {
        functionContent(
            {
                // log: (msg) => console.log("xDT internal log:", msg),
                log: () => {}, //muted
                namespace: namespace => {
                    if (namespace === "doccirrus.api.xdtVersions") {
                        setTimeout(createExample, 10);
                        return data;
                    } else {
                        return {}; //don't care
                    }
                }
            }, "");
    }
};

require("../../mojits/DeviceMojit/models/xdtVersions_"+xDTType+".server.js");

function random(limit) {
    return Math.floor(Math.random()*limit);
}

function createExample() {
    let xdt = data[xDTType][xDTVersion];
    let freeCatCovered = false;
    
    function randomLorem(fk) {
        switch(xdt.fields[fk].type) {
            case "encoding": return xdt.encodings[random(xdt.encodings.length)];
            case "number": return random(1000);
            case "float": return Math.round(Math.random()*100000)/100;
            case "time": return moment(new Date(Date.now() - random(2400000000000))).format("HH:mm:ss");
            case "date": return moment(new Date(Date.now() - random(2400000000000))).format("YYYY-MM-DD");
            default :
                var line = lorem[random(lorem.length-1)];
                return line.substr(0, 5+random(line.length));
        }
    }
    
    function getDesc(fk) {
        return ""+xdt.fields[fk].desc+"";
    }

    function printFields(root, indentLen) {
        Object.keys(root).forEach(fk => {
            if (xdt.fields[fk].attribute !== "freeCat" || !freeCatCovered) {
                if (root[fk].amount === "n") {
                    let times = 2+random(2);
                    console.log(getIndent(indentLen) + getDesc(fk) + ":");
                    for (var i = 0; i < times; i++) {
                        console.log(getIndent(indentLen+1) + randomLorem(fk) + (root[fk].children?":":""));
                        if (root[fk].children) { printFields(root[fk].children, indentLen+2); }
                    }
                } else {
                    console.log(getIndent(indentLen) + getDesc(fk) + ":  "+randomLorem(fk));
                    if (root[fk].children) { printFields(root[fk].children, indentLen+1); }
                }
                if (xdt.fields[fk].attribute === "freeCat") {
                    freeCatCovered = true;
                }
            }
        });
    }

    function getIndent(len) {
        let ret = "";
        for (var i = 0; i < len; i++) { ret+="    "; }
        return ret+(ret.length>0?"":"");
    }

    Object.keys(xdt.saetze).forEach(satz => {
        if (xdt.saetze[satz].attribute === xDTMessageType) {
            printFields(xdt.saetze[satz].fk, 0);
        }
    });
}
