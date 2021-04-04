/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Utilities to convert SVG documents to PDF
 */

/*eslint no-multi-spaces:0, prefer-template:0 */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcmedia-svg',

    /* Module code */
    function(Y, NAME) {
        

        var
            fs = require( 'fs' ),
            path = require( 'path' ),
            libxmljs = require( 'libxmljs' ),
            async = require( 'async' );

        /**
         *  Temporary / development method for svgpathtest route
         *  @param callback
         */

        function loadTestSVG(callback) {

            function onFileRead(err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                data = data.replace(new RegExp('><', 'g'), ">\n<");
                Y.log('Loaded test SVG file, ' + data.length + 'bytes', 'debug', NAME);
                callback(null, data);
            }

            fs.readFile(path.resolve(__dirname, '../assets/test.svg'), 'UTF-8', onFileRead);
        }

        /**
         *  Convert an XML document string to a javascript object
         *
         *  @param  txtXml   {String}
         */

        function svgToObj(txtXml) {
            var
                xmlDoc = libxmljs.parseXml(txtXml),
                rootNode = xmlDoc.root(),
                plainObj; //,
            //    txtLog = '';
            function depthFirst(parentNode, path) {
                var
                    children = parentNode.childNodes(),
                    attrs = parentNode.attrs(),
                    asPlain = {
                        'path': path,
                        'name': parentNode.name(),
                        'attrs': {},
                        'children': [],
                        'text': ''
                    },
                    i;

                //Y.log('Node ' + path + ' has ' + attrs.length + ' attributes and ' + children.length + ' child nodes', 'debug', NAME);
                //txtLog = txtLog + 'Node ' + path + ' has ' + attrs.length + ' attributes and ' + children.length + ' child nodes' + "\n";

                for (i = 0; i < attrs.length; i++) {
                    //Y.log('Node: ' + path + ' attr[' + i + ']: ' + attrs[i].name() + ' --> ' + attrs[i].value(), 'debug', NAME);
                    //txtLog = txtLog + 'Node: ' + path + ' attr[' + i + ']: ' + attrs[i].name() + ' --> ' + attrs[i].value() + "\n";
                    asPlain.attrs[attrs[i].name().toLowerCase()] = attrs[i].value();
                }

                for (i = 0; i < children.length; i++) {
                    //Y.log('Node: ' + path + ' child ' + i + ': ' + children[i].name(), 'debug', NAME);
                    //txtLog = txtLog + 'Node: ' + path + ' child ' + i + ': ' + children[i].name() + "\n";
                    asPlain.children[i] = depthFirst(children[i], path + children[i].name() + '/');
                }

                if ('text' === asPlain.name || 'tspan' === asPlain.name) {
                    asPlain.text = parentNode.text();
                }

                return asPlain;
            }

            //Y.log('Parsing XML document: ' + JSON.stringify(txtXml), 'debug', NAME);

            plainObj = depthFirst(rootNode, '/');

            //Y.log('SVG parse log: ' + txtLog, 'debug', NAME);
            return plainObj;
        }

        /**
         *  Traverse an SVG document graph and draw it on an HPDF.js page
         *
         *  @param  objSvg      {Object}    As produced by svgToObj above
         *  @param  objPdf      {Object}    An HPDF.js document object
         *  @param  objPage     {Object}    An HPDF.js page object
         *  @param  widthPt     {Number}    Width of the page in PostScript points
         *  @param  heightPt    {Number}    Height of the page in PostScript points
         *  @param  utf8        {Number}    text encoding
         *  @param  callback    {Function}  Of the form fn(err)
         */

        function svgPathsToHpdf(objSvg, hpdf, pdfHandle, pageHandle, widthPt, heightPt, utf8, callback) {
            const
                pageH = hpdf.page_GetHeight( pageHandle ),
                pageW = hpdf.page_GetWidth( pageHandle );
            var
                globalFontAdjust,
                globalTransform = getViewBoxTransform( objSvg ),
                paths = [],
                rects = [],
                images = [],
                tspans = [];

            async.series( [ getTransformAndPaths, drawRectsPathsAndText ], onAllDone );

            //  Note toFixed does not work for this, wrong precision for node-gyp binding
            function round4( num ) {
                return Math.floor(num * 1000) / 1000;
            }

            function getTransformAndPaths( itcb ) {
                extractPathsRecursive( objSvg, globalTransform, '', '', '' );
                itcb( null );
            }

            function drawRectsPathsAndText( itcb ) {
                drawAllRects( onMasksCopied );

                function onMasksCopied(err) {
                    if ( err ) { return itcb( err ); }

                    drawAllPaths();
                    drawAllText();

                    itcb( null );
                }
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Problem updating converting SVG to HPDF paths on page: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                return callback( null );
            }

            /**
             *  Get the viewport for the SVG space
             *
             *  @param  {Object}    objSvg      XML document as object
             *  @return {*[]}
             */

            function getViewBoxTransform(objSvg) {
                var viewBox = objSvg.attrs.viewbox.split(' '),
                widthPx = viewBox[2],
                heightPx = viewBox[3],
                globalScale =  "scale(" +  (widthPt / widthPx) + "," + (heightPt / heightPx) + ")";

                globalFontAdjust = (heightPt / heightPx);

                Y.log('Global scaling set to: ' + (globalScale), 'debug', NAME);

                return [ globalScale ];
            }

            /**
             *  Recursively read the SVG ovject to collect items to draw, their styles, transforms, etc
             *
             *  @param  {Object}    obj             XML document as object, or part of one
             *  @param  {Object}    transforms      Array of transform operations (affine matrices, scaling operations, etc)
             *  @param  {Object}    style           Collected style operations as we pass up the tree
             *  @param  {Object}    mask
             *  @param  {Object}    pattern
             */

            function extractPathsRecursive(obj, transforms, style, mask, pattern) {
                var i;

                if (obj.attrs.hasOwnProperty('transform')) {
                    transforms.push(obj.attrs.transform);
                }

                if (obj.attrs.hasOwnProperty('style')) {
                    style = style + obj.attrs.style + ';';
                }

                obj.style = parseStyle(style);

                if (obj.name && 'mask' === obj.name && obj.attrs.hasOwnProperty('id')) {
                    mask = obj.attrs.id;
                }

                if (obj.name && 'pattern' === obj.name && obj.attrs.hasOwnProperty('id')) {
                    pattern = obj.attrs.id;
                }

                if (obj.name && 'path' === obj.name) {
                    obj.transformSet = transforms.slice(0).reverse();
                    paths.push(obj);
                }

                if (obj.name && ('clipPath' === obj.name || 'clippath' === obj.name)) {
                    style = style + 'isclippath:true;';
                    //  Y.log('note clipPath in style: ' + style, 'debug', NAME);
                }

                if (obj.name && 'rect' === obj.name) {
                    obj.transformSet = transforms.slice(0).reverse();
                    rects.push(obj);
                }

                /*
                if (obj.name && 'text' === obj.name) {
                    obj.transformSet = transforms.slice(0).reverse();
                    text.push(obj);
                }
                */

                if (obj.name && 'tspan' === obj.name) {
                    obj.transformSet = transforms.slice(0).reverse();
                    tspans.push(obj);
                }

                if (obj.name && 'image' === obj.name) {
                    obj.transformSet = transforms.slice(0).reverse();
                    obj.mask = mask + '';
                    obj.pattern = pattern + '';
                    images.push(obj);
                }

                for (i = 0; i < obj.children.length; i++) {
                    extractPathsRecursive(obj.children[i], transforms.slice(0), style, mask, pattern);
                }
            }

            /**
             *  Convert all SVG paths as HPDF.js drawing operations
             *
             *  SVG paths are defined by simple drawing language something like LOGO, for details see:
             *  https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
             *
             *  (stateful version)
             */

            function drawAllPaths() {
                var
                    //strokeStyle = '#000',
                    startCursor = { x: 0, y: 0 },
                    lastCursor = { x: 0, y: 0 },
                    cursor = { x: 0, y: 0 },
                    path,
                    i;

                for ( i = 0; i < paths.length; i++) {
                    path = paths[ i ];

                    if ( path.attrs.hasOwnProperty( 'd' ) && path.attrs.d ) {
                        path.style.pathIdx = i;

                        //  used for debugging style parser
                        //path.style.pathId = path.attrs.hasOwnProperty( 'id' ) ? path.attrs.id : 'noid';

                        processTokens( splitTokens ( path.attrs.d ), path.style );
                        //ctx.stroke();
                    }
                }

                //  Tidy whitespace in path.d attribute

                function splitTokens( pathStr ) {
                    var
                        specialChars = [ 'm', 'M', 'z', 'Z', 'h', 'H', 'v', 'V', 'l', 'L' ],
                        tokens,
                        j;

                    //  replace tabs and newlines with spaces
                    pathStr = pathStr.replace( new RegExp( "\t", 'g' ), ' ' );  //  eslint-disable-line no-control-regex
                    pathStr = pathStr.replace( new RegExp( "\n", 'g' ), ' ' );  //  eslint-disable-line no-control-regex
                    pathStr = pathStr.replace( new RegExp( "\r", 'g' ), ' ' );  //  eslint-disable-line no-control-regex

                    for ( j = 0; j < specialChars.length; j++ ) {
                        //  add space before special chars
                        pathStr = pathStr.replace( new RegExp( specialChars[j], 'g' ), specialChars[j] + ' ' );
                        //  remove double space after special chars
                        pathStr = pathStr.replace( new RegExp( specialChars[j] + '  ', 'g' ), specialChars[j] + ' ' );
                        pathStr = pathStr.replace( new RegExp( specialChars[j] + '  ', 'g' ), specialChars[j] + ' ' );
                    }

                    tokens = pathStr.split( ' ' );

                    tokens = tokens.filter( function tokenNotEmpty( token ) {
                        return ( '' !== token );
                    } );

                    return tokens;
                }

                //  Follow sequence of drawing operations defined in path.d attribute
                //  see: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths

                function processTokens( tokens, style ) {
                    var
                        drawOps = [],
                        pathOpts = getPathOptions( style || {} ),
                        absMode = true,
                        currToken, nextToken,
                        cnvSpace,
                        temp,
                        j;

                    for ( j = 0; j < tokens.length; j++ ) {

                        //  get the current and next token, if any
                        currToken = tokens[ j ];
                        nextToken = ( j < ( tokens.length - 1 ) ) ? tokens[ j + 1 ] : '';

                        //  store cursor start position (of next line segment)
                        lastCursor.x = cursor.x;
                        lastCursor.y = cursor.y;

                        switch( currToken ) {
                            case 'm':
                                absMode = false;
                                temp = strToPoint( nextToken );

                                cursor.x = 0;
                                cursor.y = 0;

                                cursor.x = cursor.x + temp.x;
                                cursor.y = cursor.y + temp.y;
                                startCursor.x = cursor.x;
                                startCursor.y = cursor.y;

                                cnvSpace = applyTransforms( cursor, path.transformSet, true );
                                drawOps.push( { 'op': 'moveTo', 'x': cnvSpace.x, 'y': cnvSpace.y } );

                                j = j + 1;          //  has one argument
                                break;

                            case 'M':
                                absMode = true;
                                cursor = strToPoint( nextToken );
                                startCursor.x = cursor.x;
                                startCursor.y = cursor.y;

                                cnvSpace = applyTransforms( cursor, path.transformSet, true );
                                drawOps.push( { 'op': 'moveTo', 'x': cnvSpace.x, 'y': cnvSpace.y } );

                                j = j + 1;          //  has one argument
                                break;

                            case 'v':
                                absMode = false;
                                //  vertical line on canvas, convert absolute to relative offset
                                temp = parseFloat( nextToken );        //  dY
                                cursor.y = cursor.y + temp;

                                cnvSpace = applyTransforms( cursor, path.transformSet, true );
                                drawOps.push( { 'op': 'lineTo', 'x': cnvSpace.x, 'y':  cnvSpace.y } );

                                j = j + 1;          //  has one argument
                                break;

                            case 'V':
                                absMode = true;
                                //  vertical line on canvas to absolute Y position
                                temp = parseFloat( nextToken );        //  abs Y

                                cursor.y = temp;

                                cnvSpace = applyTransforms( cursor, path.transformSet, true );
                                drawOps.push( { 'op': 'lineTo', 'x': cnvSpace.x, 'y': cnvSpace.y } );

                                j = j + 1;          //  has one argument
                                break;

                            case 'h':
                                absMode = false;
                                //  horizontal draw on canvas to relative X position
                                temp = parseFloat( nextToken );        //  dX
                                cursor.x = cursor.x + temp;

                                cnvSpace = applyTransforms( cursor, path.transformSet, true );
                                drawOps.push( { 'op': 'lineTo', 'x': cnvSpace.x, 'y': cnvSpace.y } );

                                j = j + 1;          //  has one argument
                                break;

                            case 'H':
                                absMode = true;
                                //  horizontal draw on canvas to absolute X position
                                temp = parseFloat( nextToken );        //  abs X
                                cursor.x = temp;

                                cnvSpace = applyTransforms( cursor, path.transformSet, true  );
                                drawOps.push( { 'op': 'lineTo', 'x': cnvSpace.x, 'y': cnvSpace.y } );

                                j = j + 1;          //  has one argument
                                break;

                            case 'l':
                                absMode = false;
                                //  lineTo on canvas to relative X,Y position
                                temp = strToPoint( nextToken );        //  dX,dY
                                cursor.x = cursor.x + temp.x;
                                cursor.y = cursor.y + temp.y;

                                cnvSpace = applyTransforms( cursor, path.transformSet, true );

                                //objPage.lineTo( cnvSpace.x, ( objPage.height() - cnvSpace.y ) );
                                //objPage.moveTo( cnvSpace.x, ( objPage.height() - cnvSpace.y ) );

                                drawOps.push( { 'op': 'lineTo', 'x': cnvSpace.x, 'y': cnvSpace.y } );

                                j = j + 1;          //  has one argument
                                break;

                            case 'L':
                                absMode = true;
                                //  lineTo on canvas to absolute X,Y position
                                temp = strToPoint( nextToken );        //  abs X,Y
                                cursor.x = temp.x;
                                cursor.y = temp.y;
                                cnvSpace = applyTransforms( cursor, path.transformSet, true );
                                //objPage.lineTo(cnvSpace.x, (objPage.height() - cnvSpace.y));
                                //objPage.moveTo(cnvSpace.x, (objPage.height() - cnvSpace.y));

                                drawOps.push( { 'op': 'lineTo', 'x': cnvSpace.x, 'y': cnvSpace.y } );

                                absMode = true;
                                j = j + 1;          //  has one argument
                                break;

                            case 'z':
                            case 'Z':
                                //  close the path
                                cnvSpace = applyTransforms( startCursor, path.transformSet, true );
                                drawOps.push( { 'op': 'lineTo', 'x': cnvSpace.x, 'y': cnvSpace.y } );

                                //  draw the path
                                if ( drawOps.length > 0 ) { traceOnCanvas( pathOpts, drawOps ); }
                                drawOps = [];
                                break;

                            default:
                                if ( -1 !== currToken.indexOf( ',' ) ) {

                                    //  assume continuation of l or L, implicit next point on line
                                    temp = strToPoint( currToken );

                                    if ( absMode ) {
                                        cursor.x = temp.x;              //  follows L or M
                                        cursor.y = temp.y;
                                    } else {
                                        cursor.x = cursor.x + temp.x;   //  follows l or m
                                        cursor.y = cursor.y + temp.y;
                                    }

                                    cnvSpace = applyTransforms( cursor, path.transformSet, true );
                                    //ctx.lineTo( cnvSpace.x, cnvSpace.y );
                                    //objPage.lineTo(cnvSpace.x, (objPage.height() - cnvSpace.y));
                                    //objPage.moveTo(cnvSpace.x, (objPage.height() - cnvSpace.y));

                                    drawOps.push( { 'op': 'lineTo', 'x': cnvSpace.x, 'y': cnvSpace.y } );

                                } else {
                                    Y.log( 'Unhandled SVG path token: ' + currToken + ' in ' + JSON.stringify( tokens ), 'warn', NAME );
                                }

                                break;

                        }
                    }

                    //  finalize any outstanding path (may be missing terminator)
                    if ( drawOps.length > 0 ) { traceOnCanvas( pathOpts, drawOps ); }
                }

                function traceOnCanvas( pathOpts, drawOps ) {
                    //  SVG clipping path, nothing to draw
                    if ( false === pathOpts.useFill && false === pathOpts.useStroke ) { return false; }
                    let i;

                    hpdf.page_SetLineWidth( pageHandle, pathOpts.strokeWidth );
                    hpdf.page_SetRGBStroke( pageHandle, pathOpts.strokeColor[0], pathOpts.strokeColor[1], pathOpts.strokeColor[2] );
                    hpdf.page_SetRGBFill( pageHandle, pathOpts.fillColor[0], pathOpts.fillColor[1], pathOpts.fillColor[2] );

                    for ( i = 0; i < drawOps.length; i++ ) {
                        switch( drawOps[i].op ) {
                            case 'moveTo':  hpdf.page_MoveTo( pageHandle, drawOps[i].x, drawOps[i].y );   break;
                            case 'lineTo':  hpdf.page_LineTo( pageHandle, drawOps[i].x, drawOps[i].y );   break;
                        }
                    }

                    if ( pathOpts.useFill && pathOpts.useStroke ) {
                        hpdf.page_FillStroke( pageHandle );
                        return;
                    }
                    if ( pathOpts.useFill ) {
                        hpdf.page_Fill( pageHandle );
                        return;
                    }
                    if ( pathOpts.useStroke ) {
                        hpdf.page_Stroke( pageHandle );
                    }
                }

            }

            function drawAllText() {
                var i, kerns;
                Y.log('Drawing all ' + tspans.length + ' text elements.', 'debug', NAME);
                for (i = 0; i < tspans.length; i++) {
                    kerns = tspans[i].attrs.x.split(' ');
                    if (kerns.length <= 1 && tspans[i].text.length > 1) {
                        drawTSpanNoKern(tspans[i]);
                    } else {
                        drawTSpan(tspans[i]);
                    }
                }
                //Y.log(JSON.stringify(tspans, 'undefined', 2), 'debug', NAME);
            }

            function drawTSpan(objSpan) {

                if ('' === objSpan.text || '\n' === objSpan.text || '\\n' === objSpan.text) {
                    return;
                }

                //Y.log('Drawing span: ' + JSON.stringify(objSpan), 'debug', NAME);
                if (!objSpan.attrs.hasOwnProperty('x') || !objSpan.attrs.hasOwnProperty('y')) {
                    Y.log('Span does not have position or kerning: ' + JSON.stringify(objSpan), 'debug', NAME);
                    return;
                }

                hpdf.page_BeginText( pageHandle );

                setStyleFont(objSpan.style, objSpan.transformSet);

                //Y.log('TSPAN style: ' + JSON.stringify(objSpan.style), 'debug', NAME);
                //Y.log('Custom kerning: ' + objSpan.attrs.x, 'debug', NAME);

                var
                    rotation = getRotation(objSpan.style, objSpan.transformSet),
                    position = {
                        'y': parseFloat(objSpan.attrs.y)
                    },
                    finalPosition,
                    angleDeg = 0,
                    angleRad,
                    xKern  = objSpan.attrs.x.split(' '),
                    char,
                    i;

                //Y.log('Drawing span: ' + JSON.stringify(objSpan), 'debug', NAME);
                //Y.log('Span has ' + xKern.length + ' printable characters.', 'debug', NAME);

                for (i = 0; i < xKern.length; i++) {
                    char = objSpan.text.substr(i, 1);
                    //Y.log('drawing char: ' + char, 'debug', NAME);
                    position.x = parseFloat(xKern[i]);
                    position.y = parseFloat(objSpan.attrs.y);
                    //Y.log('drawing char: ' + char + ' at local x position ' + JSON.stringify(position), 'debug', NAME);
                    //Y.log('applying transforms: ' + JSON.stringify(objSpan.transformSet), 'debug');
                    finalPosition = applyTransforms(position, objSpan.transformSet);

                    //Y.log('drawing char: ' + char + ' at global position ' + JSON.stringify(finalPosition), 'debug', NAME);

                    //  HPDF is left-handed?  Angle rotates clockwise in PDF, counterclockwise on canvas

                    angleRad = (angleDeg / 180) * 3.14159;
                    angleRad = (angleRad - rotation);

                    hpdf.page_SetTextMatrix(
                        pageHandle,
                        round4( Math.cos(angleRad) ),
                        round4( Math.sin(angleRad) ),
                        round4( -Math.sin(angleRad) ),
                        round4( Math.cos(angleRad) ),
                        round4( finalPosition.x ),
                        round4( pageH - finalPosition.y )
                    );

                    hpdf.page_ShowText( pageHandle, utf8, Y.doccirrus.media.hpdf.utf8ToPdfEncoding( char ) );
                }

                hpdf.page_EndText( pageHandle );
            }

            function drawTSpanNoKern(objSpan) {

                if ('' === objSpan.text || '\n' === objSpan.text || '\\n' === objSpan.text) {
                    return;
                }

                //Y.log('Drawing span: ' + JSON.stringify(objSpan), 'debug', NAME);
                if (!objSpan.attrs.hasOwnProperty('x') || !objSpan.attrs.hasOwnProperty('y')) {
                    Y.log('Span does not have position or kerning: ' + JSON.stringify(objSpan), 'debug', NAME);
                    return;
                }

                hpdf.page_BeginText( pageHandle );
                setStyleFont(objSpan.style, objSpan.transformSet);

                //Y.log('TSPAN style: ' + JSON.stringify(objSpan.style), 'debug', NAME);

                var
                    rotation = getRotation(objSpan.style, objSpan.transformSet),
                    position = {
                        'x': parseFloat(objSpan.attrs.x),
                        'y': parseFloat(objSpan.attrs.y)
                    },
                    adjustx = 0,
                    finalPosition,
                    angleDeg = 0,
                    angleRad;

                if (objSpan.style && objSpan.style.dcleft) {
                    adjustx = parseFloat(objSpan.style.dcleft);
                    position.x = position.x + adjustx;
                }

                //Y.log('Drawing span: ' + JSON.stringify(objSpan), 'debug', NAME);
                //Y.log('Span has ' + xKern.length + ' printable characters.', 'debug', NAME);

                //Y.log('drawing char: ' + char, 'debug', NAME);
                //Y.log('drawing char: ' + char + ' at local x position ' + JSON.stringify(position), 'debug', NAME);
                //Y.log('applying transforms: ' + JSON.stringify(objSpan.transformSet), 'debug');
                finalPosition = applyTransforms(position, objSpan.transformSet);

                //  HPDF is left-handed?  Angle rotates clockwise in PDF, counterclockwise on canvas

                angleRad = (angleDeg / 180) * 3.14159;
                angleRad = (angleRad - rotation);

                hpdf.page_SetTextMatrix(
                    pageHandle,
                    round4( Math.cos(angleRad) ),
                    round4( Math.sin(angleRad) ),
                    round4( -Math.sin(angleRad) ),
                    round4( Math.cos(angleRad) ),
                    round4( finalPosition.x ),
                    round4( (pageH - finalPosition.y) )
                );

                hpdf.page_ShowText( pageHandle, utf8, Y.doccirrus.media.hpdf.utf8ToPdfEncoding( objSpan.text ) );
                hpdf.page_EndText( pageHandle );
            }

            function drawAllRects(allRectsCallback) {
                Y.log('draw all ' + rects.length + ' rects', 'debug', NAME);
                var i, toRender = [];

                function renderNext() {
                    if (0 === toRender.length) {
                        allRectsCallback(null);
                        return;
                    }
                    var nextRect = toRender.pop();
                    drawRect(rects[nextRect], onRenderRect);
                }

                function onRenderRect() {
                    renderNext();
                }

                for (i = 0; i < rects.length; i++) {
                    toRender.push(i);
                }

                renderNext();
            }

            function drawRect(rect, rectCallback) {
                var
                    position, size /*, desc */;

                //Y.log(JSON.stringify(rect, 'undefined', 2), 'debug', NAME);

                position = {
                    x: (rect.attrs.x || 0),
                    y: (rect.attrs.y || 0)
                };

                position = applyTransforms(position, rect.transformSet.slice(0));

                size = {
                    x: (rect.attrs.width || 0),
                    y: (rect.attrs.height || 0)
                };

                //  test override for masks
                size = { x: 1, y: 1 };

                //desc = 'Original size: ' + size.x + 'x' + size.y + "\n";
                size = applyTransforms(size, rect.transformSet.slice(0));

                size.x = size.x - position.x;
                size.y = size.y - position.y;

                //desc = desc + "\n" + JSON.stringify(rect.transformSet, 'undefined', 2) + "\n";
                //desc = desc + 'Transform size: ' + size.x + 'x' + size.y + "\n";

                Y.log('Rect position: ' + JSON.stringify(position) + ' size: ' + JSON.stringify(size), 'debug', NAME);

                if (rect.attrs.hasOwnProperty('mask')) {
                    if ('url' === rect.attrs.mask.substr(0, 3).toLowerCase()) {
                        drawPattern(rect.attrs.mask, position, size, rectCallback);
                    }
                } else {
                    rectCallback(null);
                }

            }

            /**
             *  SVG patterns in BFB page packgrouns involve painting a shape using an image rather than a color
             *
             *  @param  {String}    mask                Literal image URL / dataURI
             *  @param  {Object}    position            Point with x, y
             *  @param  {Object}    size                Scaling factor x, y
             *  @param  {Function}  patternCallback     Of the form fn( err )
             */

            function drawPattern( mask, position, size, patternCallback ) {
                var

                    /*
                    badImage = 'data:image/png;base64,' +
                        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAAAAAA6mKC9AAAAAXNCSVQI5gpbm' +
                        'QAAAB5JREFUGJVj+P+fgYGBgYEBRjMxkAeQzSHHjEHiDgAkRg/5aXvO9AAAAABJRU5ErkJggg==',
                    */

                    virtMedia = {
                        'id': 'temp',
                        '_id': 'temp',
                        'transform': 'original',
                        'mime': 'APPLICATION_PNG',
                        'mimeType': 'application/png'
                    },

                    identifier = mask.replace('url(#', '').replace(')', ''),
                    domImg = null,
                    useImg = null,
                    pdfImg = null,
                    cnvI,
                    i,
                    desc;

                Y.log('Searching for image: ' + identifier, 'debug', NAME);

                async.series(
                    [
                        getMaskLiteral,
                        invertMaskLiteral,
                        saveMaskToDisk,
                        addToPDF
                    ],
                    onAllDone
                );

                function getMaskLiteral( itcb ) {
                    for (i = 0; i < images.length; i++) {
                        if ( images[i].attrs.hasOwnProperty( 'id' ) && images[i].attrs.id === identifier ) {
                            useImg = images[i];
                        }
                        if ( images[i].hasOwnProperty( 'mask' ) && images[i].mask === identifier ) {
                            useImg = images[i];
                        }
                    }


                    //  a particular pattern which is sometimes used to overlay tables causes problems in PDF
                    //  skipping for MOJ-4387

                    /*
                    if (useImg.attrs.href === badImage) {
                        Y.log('Skipping pattern in PDF MOJ-4387', 'debug', NAME);
                        patternCallback(null);
                        return;
                    }
                    */

                    itcb( null );
                }

                function invertMaskLiteral( itcb ) {
                    Y.log('using image: ' + JSON.stringify( useImg, 'undefined', 2 ), 'debug', NAME);
                    Y.log('drawing image: ' + useImg.attrs.href, 'debug', NAME);

                    domImg = Y.dcforms.createImageFromDataUrl(useImg.attrs.href);

                    desc = 'Drawing pattern:' +
                        'Image: ' + domImg.width + 'x' + domImg.height + "\n" +
                        'copySize: ' + size.x + 'x' + size.y + "\n" +
                        'position: ' + position.x + 'x' + position.y;

                    Y.log('DOM image loaded from dataURI', 'debug', NAME);
                    Y.log(desc, 'debug', NAME);

                    cnvI = invertImage( domImg );
                    Y.log('Image inverted on canvas', 'debug', NAME);
                    itcb( null );
                }

                function saveMaskToDisk( itcb ) {
                    var
                        maskBuffer = Y.doccirrus.media.dataUriToBuffer( cnvI.toDataURL( 'image/png' ) ),
                        tempDir = Y.doccirrus.media.getTempDir();

                    virtMedia._diskFile = Y.doccirrus.media.getTempFileName( virtMedia );
                    Y.doccirrus.media.writeFile( virtMedia._diskFile, tempDir, maskBuffer, itcb );
                }

                function addToPDF( itcb ) {
                    pdfImg = hpdf.loadPngImageFromFile( pdfHandle, virtMedia._diskFile );
                    //pdfImg = objPdf.loadJpegImage( pdfHandle, virtMedia._diskFile );
                    hpdf.page_DrawImage( pageHandle, pdfImg, position.x, ( pageH - ( position.y + size.y ) ), size.x, size.y );

                    Y.doccirrus.media.tempRemove( virtMedia._diskFile, onCleanTempFile );
                    itcb(null);
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Problem adding mask image: ' + JSON.stringify( err ), 'warn', NAME );
                        //  best effort - continue rendering the SVG despite error
                    }

                    var
                        pdfDesc = '' +
                           'Image: ' + domImg.width + 'x' + domImg.height + "\n" +
                           'copySize: ' + size.x + 'x' + size.y + "\n" +
                           'position: ' + position.x + 'x' + position.y + ' (pt)' + "\n" +
                           'page: ' + pageW + 'x' + pageH + "\n" +
                           'reposition: ' + (pageH - (position.y + size.y));

                    Y.log('PDF image placement: ' + pdfDesc, 'debug', NAME);
                    Y.log('Drawing PDF image: ' + virtMedia._diskFile, 'debug', NAME);

                    patternCallback( null );
                }

                function onCleanTempFile( ) {
                    Y.log('Clean up temp mask for PDF: ' + virtMedia._diskFile, 'debug', NAME);
                }

            }

            /**
             *  Convert a string representing a 2d point to a point object
             *
             *  @param {String}     strPoint
             *  @return {{x: number, y: number}}
             */

            function strToPoint(strPoint) {
                var parts = strPoint.split(',');
                return { 'x': parseFloat(parts[0]), 'y': parseFloat(parts[1])};
            }

            /**
             *  Apply a stack of transforms to a point in SVG subspace to get the same point in global/image space
             *
             *  @param  {Object}    point           Object with x, y
             *  @param  {Object}    transforms      Array of SVG transform definitions (strings)
             *  @param  {Boolean}   invertY         If true, swap Y axis for PDF space
             *  @return {*}
             */

            function applyTransforms( point, transforms, invertY ) {
                var i;

                for (i = 0; i < transforms.length; i++) {
                    if ('matrix' === transforms[i].substr(0, 6)) {
                        point = applyMatrixTransform(point, transforms[i]);
                    }
                    if ('scale' === transforms[i].substr(0, 5)) {
                        point = applyScaleTransform(point, transforms[i]);
                    }
                    if ('translate' === transforms[i].substr(0, 9)) {
                        point = applyTranslateTransform(point, transforms[i]);
                    }
                }

                if ( invertY ) {
                    point.y = ( pageH - point.y );
                }

                return point;
            }

            function applyScaleTransform(point, strTransform) {
                var parts = strTransform.replace('scale(', '').replace(')', '').split(','),
                    scaleX,
                    scaleY,
                    newPoint = {};

                scaleX = parseFloat(Y.doccirrus.commonutils.trim(parts[0]));
                if (2 === parts.length) {
                    scaleY = parseFloat(Y.doccirrus.commonutils.trim(parts[1]));
                } else {
                    //  if no Y factor is given then Y factor is same as X
                    scaleY = scaleX;
                }
                //Y.log('Scale: ' + scaleX + ',' + scaleY, 'debug', NAME);
                newPoint.x = point.x * scaleX;
                newPoint.y = point.y * scaleY;
                return newPoint;
            }

            function applyMatrixTransform(point, strTransform) {

                var
                    parts = strTransform.replace('matrix(', '').replace(')', '').split(','),
                    matrix = [0,0,0,0,0,0],
                    newPoint = {},
                    i;

                for ( i = 0; i < parts.length ; i++) {
                    matrix[i] = parseFloat(Y.doccirrus.commonutils.trim(parts[i]));
                }

                //  https://developer.mozilla.org/en/docs/Web/SVG/Attribute/transform
                //Y.log('Apply matrix: ' + JSON.stringify(matrix) + ' str: ' + strTransform, 'debug', NAME);
                newPoint.x = (matrix[0] * point.x) + (matrix[2] * point.y) + matrix[4];
                newPoint.y = (matrix[1] * point.x) + (matrix[3] * point.y) + matrix[5];

                //Y.log('New point: ' + JSON.stringify(newPoint) + ' from ' + JSON.stringify(point), 'debug', NAME);

                return newPoint;
            }

            function applyTranslateTransform(point, strTransform) {
                var parts = strTransform.replace('translate(', '').replace(')', '').split(','),
                    translateX,
                    translateY,
                    rewrite,
                    newPoint;

                translateX = parseFloat(Y.doccirrus.commonutils.trim(parts[0]));
                if (2 === parts.length) {
                    translateY = parseFloat(Y.doccirrus.commonutils.trim(parts[1]));
                } else {
                    //  if no Y factor is given then Y factor is same as X
                    translateY = translateX;
                }

                rewrite = 'matrix(1,0,0,1,' + translateX + ',' + translateY + ')';

                newPoint = applyMatrixTransform(point, rewrite);

                return newPoint;
            }

            /**
             *  Read the collected style attributes of an SVG entity and its patents into an object
             *  Similar to CSS styles in HTML entities
             *
             *  @param  {String}    txtStyle
             */

            function parseStyle(txtStyle) {
                var
                    phrases = txtStyle.split(';'),
                    parts,
                    style = {},
                    i;

                for (i = 0; i < phrases.length; i++) {
                    parts = phrases[i].split(':', 2);
                    if ( '' !== phrases[i].trim() && 2 === parts.length) {
                        style[Y.doccirrus.commonutils.trim(parts[0])] = Y.doccirrus.commonutils.trim(parts[1]);
                    }
                }

                if (style.hasOwnProperty('fill')) {
                    if (-1 !== style.fill.indexOf('url')) {
                        //  do not yet support patterns
                        style.fill = '#fff';
                    }
                }

                return style;
            }

            /**
             *  Apply style object of SVG path to set drawing options for HPDF path
             *
             *  @param  {Object}    style
             *  @param  {String}    style.fill          Fill color or 'none'
             *  @param  {String}    style.stroke        Stroke color or 'none'
             *  @param  {String}    style.isclippath    Should exist if this is a clipping path, not a drawing path
             *
             *  Returns pdf page options used by path tracing routine
             */

            function getPathOptions( style ) {
                let
                    ADJUST_APPROX_WIDTH = 0.2,
                    pathOpts = {
                        'fillColor': [ 0, 0, 0 ],
                        'strokeColor': [ 0, 0, 0 ],
                        'useFill': true,
                        'useStroke': true,
                        'strokeWidth': 0.25
                    };

                //  when debugging it helps to set paths to random colors to see how they are superimposed
                //pathOpts.fillColor = [ Math.random(), Math.random(), Math.random() ];
                //pathOpts.strokeColor = pathOpts.fillColor;

                if ( style.fill ) {
                    if (
                        '#ffffff' === style.fill.toLowerCase() ||
                        '#fff' === style.fill.toLowerCase() ||
                        'none' === style.fill.toLowerCase()
                    ) {
                        pathOpts.fillColor = [ 1, 1, 1 ];
                    }

                    if ( 'none' === style.fill.toLowerCase() ) {
                        pathOpts.useFill = false;
                        //pathOpts.fillColor = [ 1, 1, 1 ];
                    }
                }

                if ( style.stroke ) {
                    if (
                        '#ffffff' === style.stroke.toLowerCase() ||
                        '#fff' === style.stroke.toLowerCase() ||
                        'none' === style.stroke.toLowerCase()
                    ) {
                        pathOpts.strokeColor = [ 1, 1, 1 ];
                    }
                    if ( 'none' === style.stroke.toLowerCase() ) {
                        pathOpts.useStroke = false;
                    }
                }

                if ( style['stroke-width'] && 'none' !== style['stroke-width'] ) {
                    //  experimental value 0.2 for certification
                    pathOpts.strokeWidth = parseFloat( style['stroke-width'] ) * ADJUST_APPROX_WIDTH;
                }

                //  used to invert masks in SVG, handled in mask routines here
                if (
                    ( style.hasOwnProperty( 'isclippath' ) ) ||
                    ( style.hasOwnProperty( 'fill-rule' ) && 'evenodd' === style['fill-rule'].toLowerCase() )
                ) {
                    pathOpts.strokeColor = [ 1, 1, 1 ];
                    pathOpts.fillColor = [ 1, 1, 1 ];
                    pathOpts.useFill = false;
                    pathOpts.useStroke = false;
                }

                return pathOpts;
            }

            function setStyleFont(style, transforms) {
                var
                    pathOpts = getPathOptions( style || {} ),
                    objFont,
                    fontMod = '',
                    fontSize = '8px',
                    fontName = 'Helvetica',
                    parts,                                  //  transform matrix
                    b,                                      //  matrix term 2
                    d,                                      //  matrix term 4
                    scaleY,                                 //  only consider vertical scale for font
                    localScale = (globalFontAdjust * 1),    //  product of local affine matrix scaling
                    i;

                if (style.hasOwnProperty('font-size')) {
                    fontSize = style['font-size'] + '';
                }

                if (style.hasOwnProperty('font-family')) {
                    fontName = style['font-family'];
                }

                if (style.hasOwnProperty('font-weight')) {
                    if ('bold' === style['font-weight']) {
                        fontMod = '-Bold';
                    }
                }

                //  specical case for KBV cancer forms
                if ( 'thesansbold' === fontName.toLowerCase() ) {
                    fontName = 'Helvetica';
                    fontMod = '-Bold';
                }

                if (style.hasOwnProperty('font-style')) {
                    if ('italic' === style['font-style'] || 'oblique' === style['font-style']) {

                        if ('-Bold' === fontMod) {
                            fontMod = '-BoldOblique';
                        } else {
                            fontMod = '-Oblique';
                        }
                    }
                }

                if (
                    ('arial' === fontName.toLowerCase()) ||
                    ('arial-reg' === fontName.toLowerCase()) ||
                    ('sans' === fontName.toLowerCase()) ||

                    //  odd fonts which appear in KBV forms
                    ('a030' === fontName.toLowerCase()) ||
                    ('thesans' === fontName.toLowerCase() ) ||
                    ('helveticaneue' === fontName.toLowerCase() ) ||
                    ('thesanssemilight' === fontName.toLowerCase() ) ||
                    ('helveticaneuelt' === fontName.toLowerCase() ) ||
                    ('myriadpro' === fontName.toLowerCase() )
                ) {
                    fontName = 'Helvetica';
                }

                if ('Times' === fontName) {
                    fontMod = fontMod.replace('Oblique', 'Italic');
                }

                if ('ocra' === fontName.toLowerCase() ) {
                    fontName = 'Courier';
                }

                //  adjust font size by local scaling of all affine matrices of parent objects

                transforms = transforms || [];

                //Y.log('Applying transforms to font scale: ' + JSON.stringify(transforms),'debug', NAME);
                //Y.log('Global scale: ' + globalFontAdjust,'debug', NAME);

                for (i = 0; i < transforms.length; i++) {
                    if ('matrix' === transforms[i].substr(0, 6)) {
                        //  take the arc sin of second element, add to total rotation
                        parts = transforms[i].replace('matrix(', '').replace(')', '').split(',');

                        //Y.log('Matrix values: ' + JSON.stringify(parts), 'debug', NAME);

                        b = parts[1] || Math.sqrt(1/2);
                        d = parts[3] || Math.sqrt(1/2);

                        scaleY = Math.sqrt((b * b) + (d * d));

                        //Y.log('Local matrix scaling by: ' + scaleY, 'debug', NAME);
                        localScale = localScale * scaleY;
                    }
                }

                //Y.log('Local scale: ' + localScale,'debug', NAME);

                //Y.log('Using style: ' + JSON.stringify(style, 'undefined', 2), 'debug', NAME);
                //Y.log('Setting font: ' + fontName + fontMod, 'debug', NAME);

                objFont = hpdf.getFont( pdfHandle, fontName + fontMod, Y.doccirrus.media.fonts.PDF_ENCODING );

                hpdf.page_SetRGBStroke( pageHandle, pathOpts.strokeColor[0], pathOpts.strokeColor[1], pathOpts.strokeColor[2] );
                hpdf.page_SetRGBFill( pageHandle, pathOpts.fillColor[0], pathOpts.fillColor[1], pathOpts.fillColor[2] );

                fontSize = parseFloat(fontSize.replace('px', ''));
                fontSize = /* objPage.svgFontAdjust */ localScale * fontSize;

                //Y.log('font name: ' + fontName + fontMod + ' font size: ' + fontSize, 'debug', NAME);
                hpdf.page_SetFontAndSize( pageHandle, objFont, fontSize );
            }

            /**
             *  Extract the total rotation from a stack of transforms (considers only affine matrices)
             *
             *  @param  style       {Object}    Collected set of entity style keys
             *  @param  transforms  {Object}    Stack of nested transforms
             *  @returns            {Number}    Radians
             */

            function getRotation(style, transforms) {
                var
                    i, parts,
                    rotation = 0,
                    a, b, c, d, tx, ty,                 //  eslint-disable-line no-unused-vars
                    scaleX, scaleY, rad, sign,          //  eslint-disable-line no-unused-vars
                    halfPi = (Math.PI / 2), twoPi = (Math.PI * 2),
                    stepRotation;

                //Y.log('Extract total rotation from stacked ' + transforms.length + ' transforms ' + JSON.stringify(transforms), 'debug', NAME);

                for (i = 0; i < transforms.length; i++) {
                    //  if a matrix transformation

                    //Y.log('transform: ' + transforms.length + '', 'warn', NAME);

                    if ('matrix' === transforms[i].substr(0, 6)) {
                        //  take the arc sin of second element, add to total rotation
                        parts = transforms[i].replace('matrix(', '').replace(')', '').split(',');

                        //Y.log( 'Matrix coefficients: ' + JSON.stringify(parts), 'debug', NAME );

                        a = parseFloat(parts[0]);
                        b = parseFloat(parts[1]);
                        c = parseFloat(parts[2]);
                        d = parseFloat(parts[3]);
                        tx = parseFloat(parts[4] || 0); //eslint-disable-line no-unused-vars
                        ty = parseFloat(parts[5] || 0);

                        scaleX = Math.sqrt((a * a) + (c * c));
                        scaleY = Math.sqrt((b * b) + (d * d)); //eslint-disable-line no-unused-vars

                        //Y.log( 'Matrix scaling xy: ' + scaleX + ', ' + scaleY, 'debug', NAME );

                        sign = Math.atan((-1 * c) / a);
                        rad  = Math.acos(a / scaleX);

                        stepRotation = rad;

                        if (rad > halfPi && sign > 0) {
                            stepRotation = (twoPi - rad);
                        } else if (rad < halfPi && sign < 0) {
                            stepRotation = (twoPi - rad);
                        }

                        //  implicit rotation of text by translating across the axes
                        if (ty <= 0) {
                            stepRotation = stepRotation + Math.PI;
                        }

                        //Y.log('step Rotation: ' + stepRotation + ' radians (' + (360 * (stepRotation / twoPi)) + ' degrees)', 'debug', NAME);

                        rotation = rotation + stepRotation;
                    }

                }

                if (style['dc-rotate']) {
                    rotation = rotation + (parseFloat(style['dc-rotate']) * Math.PI);
                }

                //Y.log('Total rotation: ' + rotation + ' radians (' + (360 * (rotation / twoPi)) + ' degrees)', 'debug', NAME);

                return rotation;
            }

            /**
             *  Draw negative of a mask image on a new canvas
             *
             *  @param img
             *  @returns {HTMLElement}
             */

            function invertImage(img) {
                var
                    cnvI = Y.dcforms.makeCanvasObject( parseInt( img.width, 10 ), parseInt( img.height, 10 ) ),
                    ctxI,
                    imgData,
                    i;

                //cnvI.width = img.width;
                //cnvI.height = img.height;

                ctxI = cnvI.getContext('2d');
                ctxI.drawImage(img, 0, 0);

                imgData = ctxI.getImageData(0, 0, img.width, img.height);

                for (i = 0; i < imgData.data.length; i += 4) {
                    imgData.data[i] = 255 - imgData.data[i];
                    imgData.data[i + 1] = 255 - imgData.data[i + 1];
                    imgData.data[i + 2] = 255 - imgData.data[i + 2];
                }

                ctxI.putImageData(imgData, 0, 0);

                return cnvI;
            }

        }

        Y.namespace('doccirrus').svg = {
            'loadTestSvg': loadTestSVG,
            'svgToObj': svgToObj,
            'svgPathsToHpdf': svgPathsToHpdf
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: ['dccommonutils','dcforms-canvas-utils']
    }
);