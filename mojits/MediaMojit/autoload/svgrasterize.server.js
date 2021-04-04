/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Utilities to convert SVG documents to PDF
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcmedia-svg-rasterize',

    /* Module code */
    function(Y, NAME) {
        

        var
            async = require( 'async' ),
            JPEG_QUALITY = 1;

        /**
         *  Plot the given SVG media object on canvas and return a JPEG media object
         *
         *  @param  media       {Object}        Media object with raw base64 SVG
         *  @param  xmlSvg      {String}        Raw SVG from GridFS
         *  @param  widthPx     {Number}        Not used at present
         *  @param  heightPx    {Number}        Not used at present
         *  @param  toMime      {String}        Cache file format ( IMAGE_JPEG || IMAGE_PNG )
         *  @param  callback    {Function}      Of the form fn(err, newMediaObject)
         */

        function svgToJpeg(media, xmlSvg, widthPx, heightPx, toMime, callback) {
            if ('IMAGE_SVG' !== media.mime) {
                callback(new Error('Not an SVG image'));
                return;
            }

            var
                objSvg = Y.doccirrus.svg.svgToObj(xmlSvg),

                //transformName = widthPx + 'x' + heightPx,
                oversample = 2,

                //  will set width and height
                initialTransform = getViewBoxTransform(objSvg),

                widthSvg,           //  We draw larger than the requested size
                heightSvg,          //  to anti-alias on reduction
                aspectSvg,

                cnv = Y.dcforms.makeCanvasObject( parseInt( widthSvg, 10), parseInt( heightSvg, 10) ),
                ctx = cnv.getContext('2d'),

                paths = [],
                rects = [],
                images = [],
                tspans = [];

            //  start the canvas with a white background ( transparent PNGs cause issues on conversion )
            //if ( 'IMAGE_PNG' !== toMime ) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect( 0, 0, cnv.width, cnv.height );
            //}

            /**
             *  Transform to scale SVG canvas units to match the size of the requested image
             */

            function getViewBoxTransform() {

                //  oversample is to double the size of everything for anti-aliasing

                var
                    viewBox = objSvg.attrs.viewbox.split(' '),
                    globalScale =  'scale(' + oversample + ',' + oversample + ')';

                widthSvg = parseFloat(viewBox[2]) * oversample;
                heightSvg = parseFloat(viewBox[3]) * oversample;

                aspectSvg = ( widthSvg / heightSvg );
                Y.log('Global scaling set to: ' + (globalScale), 'debug', NAME);

                return [ globalScale ];
            }

            /**
             *  Walk the tree to extract entities to draw, keeping track to transforms and style at each level
             *
             *  @param obj          {Object}    Current entitiy
             *  @param transforms   {Object}    Array of affine transforms to apply
             *  @param style        {String}    Parsed style attribute of this entity
             *  @param mask         {String}    DOCUMENTME
             *  @param pattern      {String}    DOCUMENTME
             */

            function extractEntitiesRecursive(obj, transforms, style, mask, pattern) {
                var i;

                if (obj.attrs.hasOwnProperty('transform')) {
                    Y.log('Noting ' + obj.name + ' transform: ' + obj.attrs.transform, 'debug', NAME);
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

                if (obj.name && 'mask' === obj.name && obj.attrs.hasOwnProperty('id')) {
                    mask = obj.attrs.id;
                }

                if (obj.name && 'path' === obj.name) {
                    obj.transformSet = transforms.slice(0).reverse();
                    paths.push(obj);
                }

                if (obj.name && ('clipPath' === obj.name || 'clippath' === obj.name)) {
                    style = style + 'isclippath:true;';
                    Y.log('note clipPath in style: ' + style, 'debug', NAME);
                }

                if (obj.name && 'rect' === obj.name) {
                    obj.transformSet = transforms.slice(0).reverse();
                    rects.push(obj);
                }

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
                    extractEntitiesRecursive(obj.children[i], transforms.slice(0), style, mask, pattern);
                }
            }

            //  stateful version
            function drawAllPaths() {
                var
                    strokeStyle = '#000',
                    startCursor = { x: 0, y: 0 },
                    lastCursor = { x: 0, y: 0 },
                    cursor = { x: 0, y: 0 },
                    inPath = false,
                    path,
                    i;

                for ( i = 0; i < paths.length; i++) {
                    path = paths[ i ];

                    if ( path.attrs.hasOwnProperty( 'd' ) && path.attrs.d ) {
                        processTokens( splitTokens ( path.attrs.d ) );
                        ctx.stroke();
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

                function processTokens( tokens ) {
                    var
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
                                //  if we are already in a path, close it
                                if ( true === inPath ) {
                                    ctx.fill();
                                    ctx.stroke();
                                }

                                absMode = false;
                                temp = strToPoint( nextToken );

                                cursor.x = 0;
                                cursor.y = 0;

                                cursor.x = cursor.x + temp.x;
                                cursor.y = cursor.y + temp.y;
                                startCursor.x = cursor.x;
                                startCursor.y = cursor.y;

                                //  start path on the canvas
                                ctx.beginPath();
                                ctx.strokeStyle = strokeStyle;
                                ctx.lineWidth = 0.1;

                                //  set fill style
                                ctx.fillStyle = 'rgba(255, 255, 255, 0)';
                                if ( path.hasOwnProperty( 'style' ) ) {
                                    setPathOptions( path.style );
                                }

                                cnvSpace = applyTransforms( cursor, path.transformSet );
                                ctx.moveTo( cnvSpace.x, cnvSpace.y );

                                inPath = true;      //  in path mode
                                j = j + 1;          //  has one argument
                                break;

                            case 'M':
                                absMode = true;
                                cursor = strToPoint( nextToken );
                                startCursor.x = cursor.x;
                                startCursor.y = cursor.y;
                                inPath = true;

                                //  start path on the canvas
                                ctx.beginPath();
                                ctx.strokeStyle = strokeStyle;
                                ctx.lineWidth = 0.1;

                                //  set fill style
                                ctx.fillStyle = 'rgba(255, 255, 255, 0)';
                                if ( path.hasOwnProperty( 'style' ) ) {
                                    setPathOptions( path.style );
                                }

                                cnvSpace = applyTransforms( cursor, path.transformSet );
                                ctx.moveTo( cnvSpace.x, cnvSpace.y );

                                inPath = true;      //  in path mode
                                j = j + 1;          //  has one argument
                                break;

                            case 'v':
                                //  vertical line on canvas, convert absolute to relative offset
                                temp = parseFloat( nextToken );        //  dY
                                cursor.y = cursor.y + temp;

                                cnvSpace = applyTransforms( cursor, path.transformSet );
                                ctx.lineTo( cnvSpace.x, cnvSpace.y );

                                j = j + 1;          //  has one argument
                                break;

                            case 'V':
                                //  vertical line on canvas to absolute Y position
                                temp = parseFloat( nextToken );        //  abs Y

                                cursor.y = temp;

                                cnvSpace = applyTransforms( cursor, path.transformSet );
                                ctx.lineTo( cnvSpace.x, cnvSpace.y );

                                j = j + 1;          //  has one argument
                                break;

                            case 'h':
                                //  horizontal draw on canvas to relative X position
                                temp = parseFloat( nextToken );        //  dX
                                cursor.x = cursor.x + temp;

                                cnvSpace = applyTransforms( cursor, path.transformSet );
                                ctx.lineTo( cnvSpace.x, cnvSpace.y );

                                j = j + 1;          //  has one argument
                                break;

                            case 'H':
                                //  horizontal draw on canvas to absolute X position
                                temp = parseFloat( nextToken );        //  abs X

                                cursor.x = temp;

                                cnvSpace = applyTransforms( cursor, path.transformSet );
                                ctx.lineTo( cnvSpace.x, cnvSpace.y );

                                j = j + 1;          //  has one argument
                                break;

                            case 'l':
                                //  lineTo on canvas to relative X,Y position
                                temp = strToPoint( nextToken );        //  dX,dY
                                cursor.x = cursor.x + temp.x;
                                cursor.y = cursor.y + temp.y;

                                cnvSpace = applyTransforms( cursor, path.transformSet );
                                ctx.lineTo( cnvSpace.x, cnvSpace.y );

                                absMode = false;
                                j = j + 1;          //  has one argument
                                break;

                            case 'L':
                                //  lineTo on canvas to absolute X,Y position
                                cursor = strToPoint( nextToken );        //  dX,dY
                                cnvSpace = applyTransforms( cursor, path.transformSet );
                                ctx.lineTo( cnvSpace.x, cnvSpace.y );

                                absMode  = true;
                                j = j + 1;          //  has one argument
                                break;

                            case 'z':
                            case 'Z':
                                //  close the path
                                cnvSpace = applyTransforms( startCursor, path.transformSet );
                                ctx.lineTo( cnvSpace.x, cnvSpace.y );

                                //  draw the path
                                ctx.stroke();
                                ctx.fill();
                                inPath = false;
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

                                    cnvSpace = applyTransforms( cursor, path.transformSet );
                                    ctx.lineTo( cnvSpace.x, cnvSpace.y );

                                } else {
                                    if ( path && path.attr && path.attr.d ) {
                                        Y.log( 'Unhandled SVG path token: ' + currToken + ' in ' + path.attr.d, 'warn', NAME );
                                    }
                                }

                                break;

                        }
                    }
                }

            }

            /**
             *  Render all text sections onto page, respecting custom kerning
             */

            function drawAllText() {
                var i, kerns;

                Y.log('Drawing all ' + tspans.length + ' text elements.', 'debug', NAME);

                ctx.fillStyle = '#000';
                ctx.strokeStyle = '#000';

                for ( i = 0; i < tspans.length; i++ ) {
                    kerns = tspans[i].attrs.x.split(' ');
                    if ( kerns.length <= 1 && tspans[i].text.length > 1 ) {
                        drawTSpanNoKern( tspans[i] );
                    } else {
                        drawTSpan( tspans[i] );
                    }

                }
            }

            /**
             *  Render a single text span onto canvas, assume custom kerning
             */

            function drawTSpan( objSpan ) {

                if ('' === objSpan.text || '\n' === objSpan.text || '\\n' === objSpan.text) {
                    return;
                }

                //Y.log('Drawing span: ' + JSON.stringify(objSpan), 'debug', NAME);

                if (!objSpan.attrs.hasOwnProperty('x') || !objSpan.attrs.hasOwnProperty('y')) {
                    Y.log('Span does not have position or kerning: ' + JSON.stringify(objSpan), 'debug', NAME);
                    return;
                }

                ctx.font = getStyleFont(objSpan.style, objSpan.transformSet);

                //Y.log('TSPAN style: ' + JSON.stringify(objSpan.style), 'debug', NAME);
                //Y.log('Custom kerning: ' + objSpan.attrs.x, 'debug', NAME);

                var
                    rotation = getRotation(objSpan.style, objSpan.transformSet),
                    position = {
                        'y': parseFloat(objSpan.attrs.y)
                    },
                    finalPosition,
                    xKern  = objSpan.attrs.x.split(' '),
                    char,
                    i;

                if ( objSpan.style.hasOwnProperty( 'stroke' ) ) {
                    if ( 'none' !== objSpan.style.stroke ) {
                        ctx.strokeStyle = objSpan.style.stroke;
                    }
                }

                if ( objSpan.style.hasOwnProperty( 'fill' ) ) {
                    if ( 'none' !== objSpan.style.fill ) {
                        ctx.fillStyle = objSpan.style.fill;
                    }
                }

                //Y.log('Span has ' + xKern.length + ' printable characters.', 'debug', NAME);
                //Y.log('Text Rotation: ' + rotation, 'debug', NAME);

                for (i = 0; i < xKern.length; i++) {
                    char = objSpan.text.substr(i, 1);

                    //Y.log('drawing char: ' + char, 'debug', NAME);
                    position.x = parseFloat(xKern[i]);
                    position.y = parseFloat(objSpan.attrs.y);
                    //Y.log('drawing char: ' + char + ' at local x position ' + JSON.stringify(position), 'debug', NAME);
                    //Y.log('applying transforms: ' + JSON.stringify(objSpan.transformSet), 'debug');
                    finalPosition = applyTransforms(position, objSpan.transformSet);
                    //Y.log('drawing char: ' + char + ' at global position ' + JSON.stringify(finalPosition), 'debug', NAME);

                    if (0 !== rotation) {
                        //ctx.save();  <-- save and restore do not seem to work on current node canvas
                        //Y.log('Translating by ' + finalPosition.x + ',' + finalPosition.y + ' pixels.', 'debug', NAME);
                        ctx.translate(parseInt(finalPosition.x, 10), parseInt(finalPosition.y, 10));
                        //Y.log('Rotating by ' + rotation + ' radians.', 'debug', NAME);
                        ctx.rotate(rotation);

                        //ctx.strokeStyle = '#ff0000';
                        //ctx.fillStyle = '#ff0000';
                        ctx.fillText(char, 0, 0);

                        //ctx.restore();
                        ctx.rotate(-1 * rotation);
                        ctx.translate(-1 * parseInt(finalPosition.x, 10), -1 * parseInt(finalPosition.y, 10));

                    } else {
                        ctx.fillText(char, parseInt(finalPosition.x, 10), parseInt(finalPosition.y, 10));
                    }

                }

            }

            /**
             *  Render a test span onto page, no kerning, use Canvas to space characters
             *  @param objSpan
             */

            function drawTSpanNoKern(objSpan) {

                var
                //  rotation = getRotation(objSpan.style, objSpan.transformSet),
                    position = {
                        'x': parseFloat( objSpan.attrs.x ),
                        'y': parseFloat( objSpan.attrs.y )
                    },
                    adjustx,
                    finalPosition;


                if ( objSpan.style && objSpan.style.dcleft ) {
                    adjustx = parseFloat( objSpan.style.dcleft );
                    position.x = position.x + adjustx;
                }

                ctx.font = getStyleFont(objSpan.style, objSpan.transformSet);

                finalPosition = applyTransforms(position, objSpan.transformSet);
                ctx.fillText(objSpan.text, parseInt(finalPosition.x, 10), parseInt(finalPosition.y, 10));
            }

            /**
             *  Draw all Rect entities onto canbas (set of bordered rectangles)
             *  @param callback
             */

            function drawAllRects( callback ) {
                Y.log('draw all ' + rects.length + ' rects', 'debug', NAME);
                var i, toRender = [];

                function renderNext() {

                    if (0 === toRender.length) {
                        callback(null);
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

            function drawRect(rect, callback) {
                var
                    position, size /*, desc */;

                Y.log(JSON.stringify(rect, 'undefined', 2), 'debug', NAME);

                position = {
                    x: (rect.attrs.x || 0),
                    y: (rect.attrs.y || 0)
                };

                position = applyTransforms(position, rect.transformSet.slice(0));

                /*
                size = {
                    x: rect.attrs.width || 0,
                    y: rect.attrs.height || 0
                };
                */

                //  test override for masks
                size = { x: 1, y: 1 };

                //desc = 'Original size: ' + size.x + 'x' + size.y + "\n";
                size = applyTransforms(size, rect.transformSet.slice(0));

                size.y = size.y - position.y;
                size.x = size.x - position.x;

                //desc = desc + "\n" + JSON.stringify(rect.transformSet, 'undefined', 2) + "\n";
                //desc = desc + 'Transform position: ' + position.x + 'x' + position.y + "\n";
                //desc = desc + 'Transform size: ' + size.x + 'x' + size.y + "\n";

                Y.log('Rect position: ' + JSON.stringify(position) + ' size: ' + JSON.stringify(size), 'debug', NAME);

                ctx.beginPath();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.strokeStyle = '#000000';

                if ( !rect.attrs.hasOwnProperty( 'mask' ) ) {
                    //  no mask to draw, skip this
                    return callback( null );
                }

                if ( 'url' !== rect.attrs.mask.substr(0, 3).toLowerCase() ) {
                    //  no url pattern to draw
                    return callback( null );
                }

                return drawPattern( rect.attrs.mask, position, size, callback );
            }

            /*
            function findImage(styleUrl) {
                var
                    identifier = styleUrl('url(#', '').replace(')', ''),
                    useImg,
                    i;

                for (i = 0; i < images.length; i++) {
                    if (images[i].attrs.hasOwnProperty('id') && images[i].attrs.id === identifier) {
                        useImg = images[i];
                    }
                    if (images[i].hasOwnProperty('mask') && images[i].mask === identifier) {
                        useImg = images[i];
                    }
                    if (images[i].hasOwnProperty('pattern') && images[i].pattern === identifier) {
                        useImg = images[i];
                    }
                }

                return useImg;
            }
            */

            function drawPattern(mask, position, size, callback) {
                var
                    identifier = mask.replace('url(#', '').replace(')', ''),
                    useImg = null,
                    domImg,
                    cnvI,
                    desc,
                    i;

                Y.log('Searching for image: ' + identifier, 'debug', NAME);

                for (i = 0; i < images.length; i++) {
                    if (images[i].attrs.hasOwnProperty('id') && images[i].attrs.id === identifier) {
                        useImg = images[i];
                    }
                    if (images[i].hasOwnProperty('mask') && images[i].mask === identifier) {
                        useImg = images[i];
                    }
                }

                if (!useImg) {
                    Y.log('Not drawing image, mask not found: ' + mask, 'warn', NAME);
                    callback(null);
                    return;
                }

                if ( size.y < 0 ) {
                    return callback(null);
                }

                Y.log('drawing image: ' + useImg.attrs.href, 'debug', NAME);

                domImg = Y.dcforms.createImageFromDataUrl(useImg.attrs.href);
                Y.log('DOM image loaded from dataURI', 'info', NAME);

                desc = '' +
                    'Image: ' + domImg.width + 'x' + domImg.height + "\n" +
                    'copySize: ' + size.x + 'x' + size.y + "\n" +
                    'position: ' + position.x + 'x' + position.y;

                Y.log(desc, 'debug', NAME);

                cnvI = invertImage(domImg);

                ctx.drawImage(
                    cnvI,
                    0, 0,
                    parseInt(domImg.width, 10), parseInt(domImg.height, 10),
                    parseInt(position.x, 10), parseInt(position.y, 10),
                    parseInt(size.x, 10), parseInt(size.y, 10)
                );

                callback(null);
            }

            function strToPoint(strPoint) {
                var parts = strPoint.split(',');
                return { 'x': parseFloat(parts[0]), 'y': parseFloat(parts[1])};
            }

            /**
             *  Translate a point by a set of affine transforms
             *
             *  @param  point           {Object}    { x, y }
             *  @param  transforms      {Object}    Array of affine trasforms
             *  @returns                {Object}    New point
             */

            function applyTransforms(point, transforms) {
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

                return point;
            }

            /**
             *  Apply an SVG scale transform to a point
             *
             *  @param  point           {Object}    { x, y }
             *  @param  strTransform    {String}    Single transform from SVG entitiy
             *  @returns                {Object}    New point
             */

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

            /**
             *  Transform a point by an SVG affine matrix
             *
             *  @param  point           {Object}    { x, y }
             *  @param  strTransform    {String}    Affine transform from entity attrib
             *  @returns                {Object}    { y, y }
             */

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

            /**
             *  Translate a point
             *
             *  @param  point           {Object}    { x, y }
             *  @param  strTransform    {String}    Transform from entity attrib
             *  @returns                {Object}    { y, y }
             */

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
             *  Extract rotation in radians from a stack of affine transformation matrices
             *
             *  credit: http://math.stackexchange.com/questions/13150/extracting-rotation-scale-values-from-2d-transformation-matrix
             *
             *  @param  style       {Object}    Collected set of entity style keys
             *  @param  transforms  {Object}    Stack of nested transforms
             *  @returns            {Number}    Radians
             */

            function getRotation(style, transforms) {
                var
                    i, parts,
                    rotation = 0,
                    a, b, c, d, tx, ty,                                     //  eslint-disable-line no-unused-vars
                    scaleX, scaleY, rad, sign,                              //  eslint-disable-line no-unused-vars
                    halfPi = (Math.PI / 2), twoPi = (Math.PI * 2),
                    stepRotation;

                //Y.log('Extract total rotation from stacked ' + transforms.length + ' transforms ' + JSON.stringify(transforms), 'debug', NAME);

                for (i = 0; i < transforms.length; i++) {
                    //  if a matrix transformation

                    //Y.log('transform: ' + transforms.length + '', 'warn', NAME);

                    if ('matrix' === transforms[i].substr(0, 6)) {
                        //  take the arc sin of second element, add to total rotation
                        parts = transforms[i].replace('matrix(', '').replace(')', '').split(',');

                        //Y.log('Matrix coefficients: ' + JSON.stringify( parts ), 'debug', NAME);

                        a = parseFloat(parts[0]);
                        b = parseFloat(parts[1]);
                        c = parseFloat(parts[2]);
                        d = parseFloat(parts[3]);
                        tx = parseFloat(parts[4] || 0);         // eslint-disable-line no-unused-vars
                        ty = parseFloat(parts[5] || 0);

                        scaleX = Math.sqrt((a * a) + (c * c));
                        scaleY = Math.sqrt((b * b) + (d * d));  // eslint-disable-line no-unused-vars

                        //Y.log('Matrix scaling xy: ' + scaleX + ', ' + scaleY, 'debug', NAME);

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

                        //Y.log('step Rotation: ' + stepRotation + ' radians (' + (360 * (stepRotation / twoPi) ) + ' degrees)', 'debug', NAME);
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
             *  Interpret stroke line width from stack of affine transformation matrices and element styles (px)
             *
             *  @param  style       {Object}    Collected set of entity style keys
             *  @param  transforms  {Object}    Stack of nested transforms
             *  @returns            {Number}    Radians
             */

            /*
            function getLineWidth(style, transforms) {
                var
                    i, parts,
                    width = 1,
                    a, b, c, d,
                    scaleX, scaleY;

                //Y.log('Extract total rotation from stacked ' + transforms.length + ' transforms ' + JSON.stringify(transforms), 'debug', NAME);

                for (i = 0; i < transforms.length; i++) {
                    //  if a matrix transformation
                    //Y.log('transform: ' + transforms.length + '', 'warn', NAME);

                    if ('matrix' === transforms[i].substr(0, 6)) {
                        //  take the arc sin of second element, add to total rotation
                        parts = transforms[i].replace('matrix(', '').replace(')', '').split(',');

                        //Y.log('Matrix values: ' + JSON.stringify(parts), 'debug', NAME);

                        a = parseFloat(parts[0]);
                        b = parseFloat(parts[1]);
                        c = parseFloat(parts[2]);
                        d = parseFloat(parts[3]);

                        scaleX = Math.sqrt((a * a) + (c * c));

                        width = width * scaleX;
                        //Y.log('Matrix scaling xy: ' + scaleX + ', ' + scaleY, 'debug', NAME);
                    }

                }

                Y.log('Interpreted stroke width: ' + width, 'debug', NAME);

                return width;
            }
            */

            function getStyleFont(style, transforms) {
                var
                    fontMod = '',
                    fontSize = '8px',
                    fontName = 'Arial',
                    parts,                  //  transform matrix
                    b,                      //  matrix term 2
                    d,                      //  matrix term 4
                    scaleY,                 //  only consider vertical scale for font
                    localScale = 1,         //  product of local affine matrix scaling
                    i;

                if (style.hasOwnProperty('font-size')) {
                    fontSize = style['font-size'];
                }

                if (style.hasOwnProperty('font-family')) {
                    fontName = style['font-family'];
                }

                if (style.hasOwnProperty('font-weight')) {
                    if ('bold' === style['font-weight']) {
                        fontMod = 'bold ';
                    }
                }

                if (style.hasOwnProperty('font-style')) {
                    if ('italic' === style['font-style'] || 'oblique' === style['font-style']) {

                        if ('bold ' === fontMod) {
                            fontMod = 'bold italic ';
                        } else {
                            fontMod = 'italic ';
                        }

                    }
                }

                if (
                    ('arial' === fontName.toLowerCase()) ||
                    ('arial-reg' === fontName.toLowerCase()) ||
                    ('sans' === fontName.toLowerCase())
                ) {
                    fontName = 'Helvetica';
                }

                //  adjust font size by local scaling of all affine matrices of parent objects

                transforms = transforms || [];

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

                fontSize = fontSize.replace('px', '');

                return fontMod + (parseInt(fontSize, 10) * localScale * oversample) + 'px ' + fontName;
            }

            /**
             *  Parse SVG style attrib
             *
             *  @param  txtStyle    {String}
             *  @returns            {Object}
             */

            function parseStyle(txtStyle) {
                var
                    phrases = txtStyle.split(';'),
                    parts,
                    style = {},
                    i;

                for (i = 0; i < phrases.length; i++) {
                    parts = phrases[i].split(':', 2);
                    if (2 === parts.length) {
                        style[parts[0]] = parts[1];
                    }
                }

                if (style.hasOwnProperty('fill')) {
                    if (-1 !== style.fill.indexOf('url')) {
                        //  do not yet support patterns
                        style.fill = 'rgba(255, 255, 255, 1)';
                    }
                }

                return style;
            }

            function setPathOptions(style) {
                //  just roughly, to show outline in form
                var ADJUST_APPROX_WIDTH = 0.2;
                ctx.strokeStyle = '#000000';

                /* - set paths to random colors when debugging, helps show broke paths
                function getRandColor() {
                    let
                        red = Math.floor( Math.random() * 255 ),
                        green = Math.floor( Math.random() * 255 ),
                        blue = Math.floor( Math.random() * 255 );
                    return 'rgba(' + red + ', ' + green + ', ' + blue + ',1)';
                }
                ctx.strokeStyle = getRandColor();
                */

                if ( style.hasOwnProperty( 'stroke' ) && 'none' !== style.stroke ) {
                    ctx.strokeStyle = style.stroke.toUpperCase();
                    //ctx.strokeStyle = getRandColor();
                }

                if ( style.hasOwnProperty( 'fill' ) ) {
                    if (
                        '#ffffff' === style.fill.toLowerCase() ||
                        '#fff' === style.fill.toLowerCase()
                    ) {
                        //Y.log('Set RGBFill #FFFFFF', 'debug', NAME);
                        ctx.fillStyle = 'rgba(255,255,255)';
                    } else {
                        //Y.log('Set RGBFill #000000', 'debug', NAME);
                        ctx.fillStyle = '#000000';
                    }

                    if ( 'none' === style.fill.toLowerCase() ) {
                        ctx.fillStyle = 'rgba(255,255,255,0)';
                    } else {
                        ctx.fillStyle = style.fill.toUpperCase();
                        //ctx.fillStyle = getRandColor();
                    }

                } else {
                    //Y.log('Set RGBFill #FFFFFF (no fill style specified)', 'debug', NAME);
                    ctx.fillStyle = 'rgba(255,255,255,0)';

                    if ( style.hasOwnProperty( 'isclippath' ) ) {
                        ctx.strokeStyle = 'rgba(255,255,255,0)';
                    }
                }

                if ( style.hasOwnProperty( 'stroke-width' ) ) {
                    ctx.lineWidth = parseFloat( style['stroke-width'] * ADJUST_APPROX_WIDTH );
                }

                //  used to invert masks in SVG, handled in mask routines here
                if ( style.hasOwnProperty( 'fill-rule' ) && 'evenodd' === style['fill-rule'].toLowerCase() ) {
                    ctx.fillStyle = 'rgba(255,255,255,0)';
                }

            }

            /**
             *  MOJ-4603 Measure content size of SVG
             *  @param  initialTransform    {String}    Page scaling transform according to SVG
             */

            /* temporarily removed due to open questions about SVG margings
            function getContentSize(svgTransform) {

                if (!paths || 0 === paths.length) {
                    return false;
                }

                var
                    size = {
                        'minX': 100000,
                        'minY': 100000,
                        'maxX': 0,
                        'maxY': 0,
                        'left': 0,
                        'top': 0,
                        'width': 0,
                        'height': 0
                    },
                    points,             //  set of all points ina path
                    localVector,        //  vector in local transform space
                    localCursor,        //  point in local transform space
                    globalCursor,       //  point in global space
                    rectPos,
                    rectSize,
                    i, j;

                Y.log('checking bounds from: ' + paths.length + ' paths', 'debug', NAME);

                for (i = 0; i < paths.length; i++) {
                    points = paths[i].attrs.d.toLowerCase().split(' ');

                    Y.log('path ' + paths[i].attrs.d + ' transform: ' + paths[i].transformSet);
                    localCursor = null;

                    for (j = 0; j < points.length; j++) {

                        if (-1 !== points[j].indexOf(',')) {

                            localVector = strToPoint(points[j]);

                            if (!localCursor) {
                                localCursor = localVector;
                            } else {
                                localCursor.x = localCursor.x + localVector.x;
                                localCursor.y = localCursor.y + localVector.y;
                            }

                            globalCursor = applyTransforms(localCursor, paths[i].transformSet);

                            Y.log('checking point local: ' + JSON.stringify(localCursor) + ' global: ' + JSON.stringify(globalCursor), 'debug', NAME);

                            if (globalCursor.x > size.maxX) { size.maxX = globalCursor.x; }
                            if (globalCursor.y > size.maxY) { size.maxY = globalCursor.y; }
                            if (globalCursor.x < size.minX) { size.minX = globalCursor.x; }
                            if (globalCursor.y < size.minY) { size.minY = globalCursor.y; }
                        }
                    }
                }

                for (i = 0; i < rects.length; i++) {

                    Y.log('Measuring rect: ' + JSON.stringify(rects[i], 'undefined', 2), 'debug', NAME);

                    rectPos = {
                        x: (rects[i].attrs.x || 0),
                        y: (rects[i].attrs.y || 0)
                    };

                    rectPos = applyTransforms(rectPos, rects[i].transformSet.slice(0));

                    rectSize = {
                        x: rects[i].attrs.width || 0,
                        y: rects[i].attrs.height || 0
                    };

                    //  test override for masks
                    rectSize = { x: 1, y: 1 };

                    Y.log('Rect original size: ' + rectSize.x + 'x' + rectSize.y + "\n", 'debug', NAME);
                    rectSize = applyTransforms(size, rects[i].transformSet.slice(0));
                    Y.log('Rect transformsize size: ' + rectSize.x + 'x' + rectSize.y + "\n", 'debug', NAME);

                    rectSize.y = rectSize.y - rectPos.y;
                    rectSize.x = rectSize.x - rectPos.x;

                    if (rectPos.x < size.minX) { size.minX = rectPos.x; }
                    if (rectPos.y < size.minY) { size.minY = rectPos.y; }
                    if (rectPos.x > size.maxX) { size.maxX = rectPos.x; }
                    if (rectPos.y > size.maxY) { size.maxY = rectPos.y; }

                    if ((rectPos.x + rectSize.x) < size.minX) { size.minX = (rectPos.x + rectSize.x); }
                    if ((rectPos.y + rectSize.y) < size.minY) { size.minY = (rectPos.y + rectSize.y); }
                    if ((rectPos.x + rectSize.x) > size.maxX) { size.maxX = (rectPos.x + rectSize.x); }
                    if ((rectPos.y + rectSize.y) > size.maxY) { size.maxY = (rectPos.y + rectSize.y); }

                }

                //  set content boundaries
                size.left = size.minX;
                size.top = size.minY;
                size.width = size.maxX - size.minX;
                size.height = size.maxY - size.minY;

                //  expand content boundaries to match aspect ratio
                size.aspect = size.width / size.height;
                size.sourceAspect = widthPx / heightPx;

                //  re-add margins to match aspect ratio
                if (size.sourceAspect > size.aspect) {
                    //  we need to pad the left and right, edges, height stays the same, width increases

                    //  save for debug
                    size.contentWidth = size.width;
                    size.contentLeft = size.left;

                    size.width = size.height * size.sourceAspect;
                    size.hMargin = ((size.width - size.contentWidth) / 2);
                    size.left = size.left - size.hMargin;
                } else {
                    //  we need to pad the top and bottom, width stays the same

                    //  save for debug
                    size.contentHeight = size.height;
                    size.contentTop = size.top;

                    size.height = size.width / size.sourceAspect;
                    size.vMargin = ((size.height - size.contentHeight) / 2);
                    size.top = size.top - size.vMargin;
                }

                size.left = parseInt(size.left, 10);
                size.top = parseInt(size.top, 10);
                size.width = parseInt(size.width, 10);
                size.height = parseInt(size.height, 10);

                Y.log('SVG reduced dimensions after ' + JSON.stringify(svgTransform) + ' : ' + JSON.stringify(size, undefined, 2));

                return size;
            }
            */

            /**
             *  Draw negative of a mask image on a new canvas
             *
             *  @param img
             *  @returns {HTMLElement}
             */

            function invertImage(img) {
                var
                    cnvI = Y.dcforms.makeCanvasObject(img.width, img.height),
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

            function onDrawRects() {
                drawAllPaths();
                drawAllText();
                downsampleToRequestedSize();
            }

            function downsampleToRequestedSize() {
                var
                    toHeightPx = heightPx,
                    cnvScale,
                    ctxScale;

                if ( -1 === widthPx ) { widthPx = parseInt( widthSvg, 10 ); }
                if ( -1 === heightPx ) { toHeightPx = parseInt( ( widthPx / aspectSvg ), 10 ); }

                cnvScale = Y.dcforms.makeCanvasObject( parseInt( widthPx, 10 ), parseInt( toHeightPx, 10 ) );
                ctxScale = cnvScale.getContext( '2d' );

                Y.log( 'Scaling render from ' + cnv.width + 'x' + cnv.height + ' to ' + cnvScale.width + 'x' + cnvScale.height, 'debug', NAME );

                // cannot use transparent background when converting to JPEG or GIF
                //if ('IMAGE_PNG' !== toMime ) {
                ctxScale.fillStyle = '#FFFFFF';
                ctxScale.fillRect( 0, 0, cnvScale.width, cnvScale.height );
                //}

                ctxScale.drawImage(
                    cnv,                                    //  source
                    0, 0, cnv.width, cnv.height,            //  source clipping start ( left, top )
                    0, 0, cnvScale.width, cnvScale.height   //  dest clipping
                );

                serializeToDataURI( cnvScale );
            }

            function serializeToDataURI( cnvScale ) {
                if ( 'IMAGE_JPEG' === toMime || 'image/jpeg' === toMime ) {
                    cnvScale.toDataURL( 'image/jpeg', JPEG_QUALITY, onDataUriReady );
                    return;
                }

                if ( 'IMAGE_PNG' === toMime || 'image/png' === toMime ) {
                    cnvScale.toDataURL( 'image/png', onDataUriReady );
                    return;
                }

                callback( Y.doccirrus.errors.rest( '500', 'Unsupported format for SVG rasterize, please use IMAGE_PNG or IMAGE_JPEG' ) );
            }

            function onDataUriReady( err, dataUri) {
                if ( err ) { return callback( err ); }

                var
                //  legacy format, rasterized SVG are not stored in GridFS
                    newMedia = {
                        '_id': (media._id || 'temp'),
                        '_transformOf': media._id || null,
                        'transform': widthPx + 'x' + heightPx,
                        'mime': toMime,
                        'source': dataUri,
                        'widthPx': widthPx,
                        'heightPx': heightPx,
                        '_fixAspect': true,
                        '_tempFiles': []
                    };

                //Y.log('Serializing to ' + toMime + ': ' + cnvCrop.width + 'x' + cnvCrop.height + ' (req: ' + widthPx + 'x' + heightPx + ')', 'debug', NAME);
                callback( null, newMedia );
            }

            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.rect(0, 0, widthPx, heightPx);
            ctx.fill();

            extractEntitiesRecursive(objSvg, initialTransform, '', '', '');
            //contentSize = getContentSize(initialTransform);

            //  paths may be in front of behind masks so are drawn twice MOJ-4912
            drawAllPaths();
            drawAllRects(onDrawRects);
        }

        /**
         *  Convert an SVG to JPEG and add this transform to the media cache
         * 
         *  @param  user            {Object}        REST user or equivalent
         *  @param  mediaObj        {Object}        As described in media-schema.common.js
         *  @param  mediaObj._id    {String}        Name of SVG file in GridFS
         *  @param  opts.widthPx    {Number}        Pixels
         *  @param  opts.heightPx   {Number}        Pixels
         *  @param  opts.mime       {String}        ( 'IMAGE_PNG' || 'IMAGE_JPEG' )
         *  @param  opts            {Object}        Transform options given by dcmedia middleware
         *  @param  callback        {Function}      Of the form fn( err, cacheFileName )
         */
        
        function svgToJpegCache( user, mediaObj, opts, callback ) {

            //  NOTE: jpeg streaming should be possible, but currently must be done as a separate step
            //  due to a bug in node canvas jpegStream (returns valid but blank dataUri)

            if ( 'IMAGE_JPG' !== opts.mime && 'IMAGE_JPEG' !== opts.mime && 'IMAGE_PNG' !== opts.mime && 'IMAGE_GIF' !== opts.mime ) {
                return callback( Y.doccirrus.errors.rest( 500, 'Can not convert SVG to ' + opts.mime, true ) );
            }

            var
                rasterImageObj,
                xmlSvg,
                svgBuffer;
            
            async.series( [ loadRawSvg, rasterizeSvg, saveToTemp, convertImage, addToCache ], onAllDone );

            //  1. Get the SVG file from GridFS
            function loadRawSvg( itcb ) {
                function onSvgBufferReady( err, svgBuffer ) {
                    if ( err ) { return itcb( err ); }
                    xmlSvg = svgBuffer.toString();
                    itcb( null );
                }
                Y.doccirrus.media.gridfs.exportBuffer( user, mediaObj._id + '', false, onSvgBufferReady );
            }

            //  2. Parse the SVG and draw onto a canvas ( reduced set of entities supported, BFB forms)
            function rasterizeSvg( itcb ) {

                //  Rasterized SVG is returned in legacy format as a dataURI in source
                //  We will need to decode this an save it to cache
                function onJpegCreated( err, legacyMediaObj ) {
                    if ( err ) { return itcb( err ); }

                    rasterImageObj = legacyMediaObj;
              
                    svgBuffer = Y.doccirrus.media.dataUriToBuffer( legacyMediaObj.source );
                    itcb( null );
                }

                //  Note: hard to PNG due to bug in jpegStream
                svgToJpeg( mediaObj, xmlSvg, opts.widthPx, opts.heightPx, 'IMAGE_PNG', onJpegCreated );
            }

            //  3. Write to temp directory
            function saveToTemp( itcb ) {
                var tempDir = Y.doccirrus.media.getTempDir();
                rasterImageObj._diskFile = Y.doccirrus.media.getTempFileName( rasterImageObj );
                rasterImageObj._tempFiles = rasterImageObj._tempFiles ? rasterImageObj._tempFiles : [];
                rasterImageObj._tempFiles.push( rasterImageObj._diskFile );
                Y.doccirrus.media.writeFile( rasterImageObj._diskFile, tempDir, svgBuffer, itcb );
            }

            //  4. Shift format
            function convertImage( itcb ) {
                //  default is PNG, no conversion necessary
                if ( 'IMAGE_PNG' === opts.mime ) { return itcb( null ); }

                function onImageTranscoded( err, newMediaObj ) {
                    if ( err ) { return itcb( err ); }
                    rasterImageObj = newMediaObj;
                    itcb( null );
                }

                Y.doccirrus.media.images.transcode( rasterImageObj, opts.mime, onImageTranscoded );
            }

            //  5. Move to the media cache
            function addToCache( itcb ) {
                Y.doccirrus.media.cacheStore( rasterImageObj, itcb );
            }

            //  Finally
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not rasterize SVG image: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                Y.log( 'Added raster image to cache with key: ' + rasterImageObj._cacheFile, 'debug', NAME );

                Y.doccirrus.media.cleanTempFiles( rasterImageObj );
                callback( null, rasterImageObj._cacheFile );
            }
            
        }

        function svgToJpegDataUri( user, media, width, height, callback ) {
            var
                rawXml,
                dataUri;

            async.series( [ loadSvgXml, rasterizeToFile ], onAllDone );

            function loadSvgXml( itcb ) {
                function onLoadBuffer( err, buf ) {
                    if ( err ) { return itcb( err ); }
                    rawXml = buf.toString() + '';
                    itcb( null );
                }
                Y.doccirrus.media.gridfs.exportBuffer( user, media._id, false, onLoadBuffer );
            }

            function rasterizeToFile( itcb ) {
                function onSvgRaster( err, newMedia ) {
                    if ( err ) { return itcb( err ); }
                    dataUri = newMedia.source;
                    Y.log( 'Created JPEG dataUri from JPEG: ' + dataUri.length + ' bytes', 'debug', NAME );
                    itcb( null );
                }
                Y.doccirrus.media.svgraster.svgToJpeg( media, rawXml, width, height, 'IMAGE_JPEG', onSvgRaster );
            }

            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not render SVG to DataURI: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }
                Y.log( 'Rasterized SVG image to JPEG dataUri: ' + media._id, 'debug', NAME );
                callback( null, dataUri );
            }
        }

        Y.namespace('doccirrus.media').svgraster = {
            'svgToJpeg': svgToJpeg,
            'svgToJpegDataUri': svgToJpegDataUri,
            'svgToJpegCache': svgToJpegCache
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: ['dccommonutils', 'dcmedia-svg', 'dcforms-utils', 'dcforms-canvas-utils']
    }
);