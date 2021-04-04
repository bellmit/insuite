/* globals console */
/* eslint-disable no-console */
'use strict';

const
    dirPath = './../../../src/biotronik/',
    outFileName = 'biotronik-q32018.js',
    catalogName = 'DC-BIOTRONIK-D-1511269513238.json',
    moment = require('moment'),
    _ = require('lodash'),
    path = require('path'),
    fs = require('fs');


const
    start = moment('2000-01-01').startOf('day').toDate(),
    end = moment('2024-12-31').endOf('day').toDate(),
    releseDate1 = '2018-08-24',
    releseDate1_start = moment(releseDate1).startOf('day').toDate(),
    releseDate1_end = moment(releseDate1).add(-1, 'minutes').endOf('day').toDate(),

    sources = {
        0: {
            filename: "20160820_Anlage 5_BIOTRONIK_HMSC.csv"
        },
        1: {
            filename: "2018-06-BIOTRONIK_HMSC_Ereigniskatalog with Codes.csv"
        }
    };


let csv = require("csvtojson"),
    options =  {
        headers: ['seq', 'messages[0]',	'messages[1]', 'messages[2]', 'messages[3]', 'messages[4]', 'messages[5]']
    };

const
    getFromSource = async (sourceNum) => {
        return await csv( options )
            .fromFile( dirPath + sources[sourceNum].filename )
            .then( obj => {
                return obj.map( json => {

                    json.seq = json.seq.toString();
                    json.messages = [];
                    json.catalog = catalogName;
                    json.start = moment().year( 2000 ).quarter( 1 ).startOf( 'quarter' ).toDate();
                    json.end = moment().year( 2018 ).quarter( 2 ).endOf( 'quarter' ).toDate();
                    for( let i = 0; i < 6; i++ ) {
                        json.messages.push( json[`messages[${i}]`] );
                        delete json[`messages[${i}]`];
                    }
                    return json;
                } );

            } );
    };


(async () => {
    let
        result = [],
        processedSeq = [],
        stat = {
            changed: [],
            deleted: [],
            added: [],
            equal: []
        },

        s0 = await getFromSource(0) || [],
        s1 = await getFromSource(1) || [];

    s1.forEach( nw => {
        if(!nw.seq){
            console.error(`seq not found ${nw}`);
            return;
        }

        processedSeq.push(nw.seq);
        let old = s0.find( el => el.seq === nw.seq );
        if(old){
            if( _.isEqual(old.messages, nw.messages)){
                result.push(Object.assign(nw, {start: start, end: end}));
                stat.equal.push(nw.seq);
            } else {
                stat.changed.push(nw.seq);
                result.push(Object.assign(old, {start: start, end: releseDate1_end}));
                result.push(Object.assign(nw, {start: releseDate1_start, end: end}));
            }
        } else {
            stat.added.push(nw.seq);
            result.push(Object.assign(nw, {start: releseDate1_start, end: end}));
        }
    });

    let oldNotCompared = s0.filter( el => !processedSeq.includes(el.seq) );
    oldNotCompared.forEach( old => {
        stat.deleted.push(old.seq);
        result.push(Object.assign(old, {start: start, end: releseDate1_end}));
    } );
    let resultStr = JSON.stringify(result, null, 2);
    resultStr = resultStr.replace(/"start": (".*?")/gm, '"start": new Date($1)');
    resultStr = resultStr.replace(/"end": (".*?")/gm, '"end": new Date($1)');
    resultStr = 'module.exports = ' + resultStr;
    fs.writeFileSync( path.resolve(__dirname, dirPath + outFileName), resultStr, 'utf-8');
    console.log(JSON.stringify(stat, null, 2));

})();

