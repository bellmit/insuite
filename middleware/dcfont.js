/*
 * Copyright (c) 2016 Doc-Cirrus GmbH All rights reserved.
 * @author Richard Strickland
 */

/**
 *  Middleware to give browser access to custom TTF fonts
 *
 *  Usage:
 *
 *      /fonts/fontName.ttf
 *
 */

"use strict";
var
    async = require( 'async' ),
    fs = require( 'fs' ),

    NAME = 'dcfont',
    YY;

/**
 *  Debug / development method to list font file tables (compatibility / sanity checks)
 *
 *  @param  fontFile    {String}    Location of a font on disk
 *  @param  res         {Object}    Express response object
 */

function printFontTables( fontFile, res ) {
    var
        fontTables,
        fontGlyphs,
        allOk = true,
        txt;

    txt = `Examining TTF font file: ${fontFile}\n\n`;

    async.series(
        [
            getFontTables,
            getGlyphs,
            getFontEmbedFlag,
            commentOnValidity
        ],
        onAllDone
    );

    //  1. First get the set of tables from the TTF
    function getFontTables( itcb ) {
        YY.doccirrus.media.fonts.listFontFeatures( fontFile, 'tables', onFontTablesListed );
        function onFontTablesListed( err, foundTables ) {
            if ( err ) { return itcb( err ); }
            var i;

            fontTables = foundTables;
            txt = txt + '[++] Font tables: \n';
            for ( i = 0; i < fontTables.length; i++ ) {
                txt = txt + '[ii] table: ' + foundTables[i] + '\n';
            }
            txt = txt + '\n';

            itcb( null );
        }
    }

    //  2. Get the list of glyphs, if we have a glyf table
    function getGlyphs( itcb ) {
        YY.doccirrus.media.fonts.listFontFeatures( fontFile, 'glyphs', onFontTablesListed );
        function onFontTablesListed( err, foundGlyphs ) {
            if ( err ) { return itcb( err ); }
            fontGlyphs = foundGlyphs;
            txt = txt + '[++] Font glyphs: \n[ii] ' + fontGlyphs.join( ', ' ) + '\n\n';
            itcb( null );
        }
    }

    //  3. Check whether this font allows embedding in PDF
    function getFontEmbedFlag( itcb ) {
        txt = txt + '[--] Embed flag:\n\n';

        //  if font has not OS/2 table then we don't need to worry about this
        if ( -1 === fontTables.indexOf( 'OS/2' ) ) {
            txt = txt + '[ii] This font does not have an OS/2 table, assume embed in PDF.\n\n';
            txt = txt + '[ii] Tables: ' + JSON.stringify( fontTables ) + '\n';
            return itcb( null );
        }

        YY.doccirrus.media.fonts.checkFontEmbedFlag( fontFile, onCheckFlag );

        function onCheckFlag( err, flagOk, rawTable ) {
            if ( err ) {
                YY.log( `Could not check font embed flag: ${JSON.stringify( err )}`, 'warn', NAME );
                return itcb( err );
            }

            var
                hexTable = rawTable.toString( 'hex' ),
                flagStr = hexTable.substr( 8, 2 );

            txt = txt + '[ii] OS/2 table: ' + hexTable + '\n';
            txt = txt + '[ii] OS/2 flag: ' + flagStr + '\n';


            if ( flagOk ) {
                txt = txt + '[ii] This font has an OS/2 table, PDF embedding is explicitly allowed.\n';
            } else {
                txt = txt + '[ii] This font does not allow PDF embedding, not compatible with our system.\n';
                allOk = false;
            }

            txt = txt + '\n';

            itcb( null );
        }
    }

    function commentOnValidity( itcb ) {

        var
            requireGlyphs = YY.doccirrus.media.fonts.getRequiredGlyphs(),
            i;

        if ( -1 === fontTables.indexOf('glyf') ) {
            txt = txt + '[!!] Font is missing glyf table, is not compatible with HPDF.js\n\n';
            allOk = false;
        } else {
            txt = txt + '[ii] Required table "glyf" is present.\n\n';
        }

        for (i = 0; i < requireGlyphs.length; i++ ) {
            if ( -1 === fontGlyphs.indexOf( requireGlyphs[i] ) ) {
                txt = txt + '[!!] Font is missing required glyph: ' + requireGlyphs[i] + '\n';
                allOk = false;
            } else {
                txt = txt + '[!!] Font has required glyph: ' + requireGlyphs[i] + '\n';
            }
        }

        txt = txt + '\n';

        if ( allOk ) {
            txt = txt + `Font ${fontFile} is compatible with our system.\n`;
        } else {
            txt = txt + `Font ${fontFile} is not compatible with our system.\n`;
        }

        itcb( null );
    }

    function onAllDone( err ) {

        if ( err ) {
            txt = `Could not parse TTF file: ${fontFile}\nErr: ${JSON.stringify( err )}`;
        }

        res.writeHead( 200, { 'Content-type': 'text/plain', 'Content-length': txt.length } );
        res.write( txt );
        res.end();
    }
}

/**
 *  List custom fonts as a CSS file (to be linked in templates)
 *  @param res
 */

function printFontCss( req, res ) {
    var
        ttfFonts = YY.doccirrus.media.fonts.ttf,
        errMsg;

    if ( !req || !req.user || !req.user.tenantId ) {
        YY.log( 'User requested font list without a passing a user / tenantId.', 'warn', NAME );
        errMsg = '/* Not logged in, not displaying fonts */';
        res.writeHead( 401, { 'Content-type': 'text/css', 'Content-length': errMsg.length } );
        res.write( errMsg );
        res.end();
        return;
    }

    if ( 0 === ttfFonts.length ) {
        YY.doccirrus.media.fonts.reloadFontList( req.user, onRefresh );
    } else {
        onRefresh( null );
    }

    function onRefresh( err ) {
        var css = '', fontUrl, i;
        css = css + '/* Custom TTF fonts uploaded by user */\n';

        if ( err ) {
            YY.log( `Could not load TTF font list: ${JSON.stringify( err )}`, 'warn', NAME );
            css = css + '/** err: ' + JSON.stringify( err ) + ' */\n';
        }

        for ( i = 0; i < ttfFonts.length; i++ ) {
            fontUrl = '/fonts/' + ttfFonts[i].name + '.ttf';
            css = css +
                '@font-face {\n' +
                '    font-family: "' + ttfFonts[i].name + '";\n' +
                '    src: url("' + fontUrl + '") format("truetype");\n' +
                '}\n';
        }

        res.writeHead( 200, { 'Content-type': 'text/css', 'Content-length': css.length } );
        res.write( css );
        res.end();
    }


}

/**
 *  Middleware components must either respond to the request or call next() to pass to next component
 *
 *  @param  req     {Object}    Express request
 *  @param  res     {Object}    Express response
 *  @param  next    {Function}  Pass control to next component
 */

function handle( req, res, next ) {

    YY.log( `dcfonts middleware caught route: ${req.url}`, 'debug', NAME );

    //  should not happen, app.get should not route here
    if ( '/fonts/' !== req.url.substr( 0, 7 ) ) {
        YY.log( 'Not a dcfont route, passing to next handler', 'debug', NAME );
        next();
        return;
    }

    var
        ttfFonts = YY.doccirrus.media.fonts.ttf,
        fontDir = YY.doccirrus.media.getFontDir(),
        fontName = req.url.replace( '/fonts/', '' ).replace( '.ttf', '' ).split( '?' )[0],
        fontFile = fontDir + fontName + '.ttf',
        fileSize = 0;

    //  if debug information has been requested
    if ( req.query && req.query.tables ) {
        return printFontTables( fontFile, res );
    }

    //  if css file has been requested
    if ( 'ttf.css' === fontName ) {
        return printFontCss( req, res );
    }

    async.series( [ ensureLoaded, checkExists, statSize ], onAllDone );

    //  1. Check if the requested font exists
    function ensureLoaded( itcb ) {
        //  ensure that fonts have been written to disk
        if ( 0 !== YY.doccirrus.media.fonts.ttf.length ) { return itcb( null ); }
        YY.log( 'Fonts may not have been loaded, checking GridFS', 'debug', NAME );

        if ( !req.user || !req.user.tenantId ) {
            YY.log( 'Cannot load fonts, missing tenantId', 'debug', NAME );
            return itcb( null );
        }

        YY.doccirrus.media.fonts.reloadFontList( req.user, itcb );
    }

    //  2. Check if the requested font exists
    function checkExists( itcb ) {
        var
            found = false,
            i;

        //  may have been reloaded
        ttfFonts = YY.doccirrus.media.fonts.ttf;

        YY.log( `Checking for existence of custom TTF font: ${fontName}` );
        YY.log( `Current set: ${JSON.stringify( ttfFonts, undefined, 2 )}`, 'debug', NAME );

        for ( i = 0; i < ttfFonts.length; i++ ) {
            if ( ttfFonts[i].name === fontName ) {
                found = true;
            }
        }

        if ( true === found ) {
            return itcb( null );
        }

        //  not found
        YY.log( `Custom TTF font not found: ${fontFile}`, 'warn', NAME );
        itcb( YY.doccirrus.errors.rest( 404, 'Custom font not found.', true ) );
    }

    //  3. Get the content length
    function statSize( itcb ) {
        function onStat( err, stats ) {
            if ( err ) { return itcb( err ); }
            fileSize = stats.size;
            itcb( null );
        }

        fs.stat( fontFile, onStat );
    }

    function onAllDone( err ) {
        if ( err ) {
            res.writeHead( 404, { 'Content-type': 'text/plain' } );
            res.write( `Could not load font ${JSON.stringify( err )}` );
            res.end();
            return;
        }

        var
            readStream = fs.createReadStream( fontFile ),
            addHeaders = {
                'Content-Type': 'font/ttf',
                'Content-Length': fileSize
            };

        YY.log( `Piping file to client: ${fontFile} (size: ${fileSize} )`, 'debug', NAME );

        res.writeHead( 200, addHeaders );
        readStream.pipe( res );
    }
}

/*
 *  see server.js
 */

module.exports = function( _Y ) {
    YY = _Y;
    return handle;
};