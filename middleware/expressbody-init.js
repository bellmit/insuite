/**
 * User: rrrw
 * Date: 28.12.12  11:29
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global console, require, process, module */

"use strict";

console.log( '**Initializing express body parser**' );

var

    //  this value is used if none specified in application.json
    defaultPostSize = 157286400,

    express = require( 'express'),
    config = require( 'dc-core' ).config.load( process.cwd() + '/application.json' );
    config = config && config[0];
/**
 *  Load HTTP server settings from application.json
 *  @return     {Object}    Express / Connect settings object
 */

function getBodyParserOptions( Y ) {

    var defaultSettings = { 'limit': defaultPostSize, uploadDir: Y.doccirrus.auth.getTmpDir() };

    //  the current version of configLoader uses require and is synchronous
    //  if this fails then something bad is happening

    if (!config) {
        console.log('WARNING: config loader is not ready / not synchronous');
        return defaultSettings;
    }

    if (!config.hasOwnProperty('express')) {
        console.log('WARN: express config options not present in application.json');
        return defaultSettings;
    }

    if (!config.express.hasOwnProperty('bodyParser')) {
        console.log('WARN: express.bodyParser options not present in application.json');
        return defaultSettings;
    }

    config.express.bodyParser.uploadDir = defaultSettings.uploadDir;
    console.log('express body parser options: ' + JSON.stringify(config.express.bodyParser));

    return config.express.bodyParser;
}

module.exports = function( Y ) {
    var opts = getBodyParserOptions( Y );
    console.log('Loaded application bodyParser options: ' + JSON.stringify(opts));
    return express.bodyParser( opts );
};

