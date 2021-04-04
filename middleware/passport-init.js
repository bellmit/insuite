/**
 * User: rrrw
 * Date: 28.12.12  11:29
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
"use strict";

var
    passport = require( 'passport' );

passport._dc = 'DocCirrus';

console.log( '**Initializing passport**' );

module.exports = passport.initialize();

