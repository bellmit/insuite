/*
 *  Binder for batch PDF testing page
 *
 *  This is to test rendering of activities directly to PDF in a downloadable zip archive
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */

/*global YUI, $, jQuery */

YUI.add('TestingMojitBinderSVGPathTest', function(Y, NAME) {
        /**
         * The TestingMojitBinderSVGPathTest module.
         *
         * @module TestingMojitBinderSVGPathTest
         */

        'use strict';

        Y.log('YUI.add TestingMojitBinderSVGPathTest with NAMEs ' + NAME, 'info');

        var
            jqCache,
            objSvg,
            widthPx,
            heightPx,
            paths = [],
            rects = [],
            images = [],
            tspans = [],
            ctx;

        function setViewBox() {
            var viewBox = objSvg.attrs.viewbox.split(' ');
            widthPx = viewBox[2];
            heightPx = viewBox[3];
            jqCache.cnvTrace[0].width = parseFloat(widthPx);
            jqCache.cnvTrace[0].height = parseFloat(heightPx);
            ctx = jqCache.cnvTrace[0].getContext('2d');
            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.rect(0, 0, widthPx, heightPx);
            ctx.fill();
        }//

        function extractPathsRecursive(obj, transforms, style, mask, pattern) {
            var i;

            if (obj.attrs.hasOwnProperty('transform')) {
                transforms.push(obj.attrs.transform);
            }

            if (obj.attrs.hasOwnProperty('style')) {
                style = style + obj.attrs.style;
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
                extractPathsRecursive(obj.children[i], transforms.slice(0), style, mask, pattern);
            }
        }

        function drawAllPaths() {
            var i;
            for (i = 0 ; i < paths.length; i++) {
                drawPath(paths[i]);
            }
        }

        function drawPath(path) {
            if (!path.attrs.hasOwnProperty('d')) {
                return;
            }

            var
                points = path.attrs.d.toLowerCase().split(' '),
                step,
                cursor = { 'x': 0, 'y': 0 },
                transformCursor,
                i;

            for (i = 0; i < points.length; i++) {
                if ('m' === points[i] || 'z' === points[i]) {

                    if ('m' === points[i]) {
                        //  set cursor properties here
                        Y.log('starting path ' + path.attrs.d, 'debug', NAME);
                        ctx.beginPath();
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 0.5;
                        ctx.fillStyle = 'rgba(255, 255, 255, 0)';
                    } else {
                        //  to add fill here
                        Y.log('ending path ' + path.attrs.d, 'debug', NAME);
                        ctx.fill();
                        ctx.stroke();
                    }

                } else {

                    step = strToPoint(points[i]);  //applyTransforms(points[i], path.transformSet);

                    if (1 === i) {

                        cursor = step;
                        transformCursor = applyTransforms(cursor, path.transformSet);
                        Y.log('Move to: ' + JSON.stringify(transformCursor), 'debug', NAME);
                        //ctx.strokeStyle = '#f00';
                        ctx.moveTo(transformCursor.x, transformCursor.y);

                        if (path.hasOwnProperty('style')) {
                            setPathOptions(path.style);
                        }

                    } else {

                        cursor.x = cursor.x + step.x;
                        cursor.y = cursor.y + step.y;

                        transformCursor = applyTransforms(cursor, path.transformSet);

                        Y.log('Line to: ' + JSON.stringify(transformCursor), 'debug', NAME);
                        //ctx.strokeStyle = '#0f0';
                        ctx.lineTo(transformCursor.x, transformCursor.y);
                        //ctx.stroke();
                        //ctx.beginPath();
                        //ctx.moveTo(transformCursor.x, transformCursor.y);

                        //if (2 === i) { ctx.strokeStyle = '#0f0'; }
                        //if (3 === i) { ctx.strokeStyle = '#00f'; }
                        //if (4 === i) { ctx.strokeStyle = '#f00'; }

                    }

                }
            }

        }

        function drawAllText() {
            var i;

            Y.log('Drawing all ' + tspans.length + ' text elements.', 'debug', NAME);

            /*
            for (i = 0; i < text.length; i++) {
                drawText(text[i]);
            }
            */
            ctx.fillStyle = '#000';
            ctx.strokeStyle = '#000';

            for (i = 0; i < tspans.length; i++) {
                drawTSpan(tspans[i]);
            }

            jqCache.divLog.html('<pre>' + JSON.stringify(tspans, 'undefined', 2) + '</pre>');
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

            ctx.font = getStyleFont(objSpan.style);

            //Y.log('TSPAN style: ' + JSON.stringify(objSpan.style), 'debug', NAME);
            //Y.log('Custom kerning: ' + objSpan.attrs.x, 'debug', NAME);

            var
                rotation = getRotation(objSpan.transformSet),
                position = {
                    'y': parseFloat(objSpan.attrs.y)
                },
                finalPosition,
                xKern  = objSpan.attrs.x.split(' '),
                char,
                i;

            Y.log('Span has ' + xKern.length + ' printable characters.', 'debug', NAME);
            Y.log('Text Rotation: ' + rotation, 'debug', NAME);

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
                    ctx.strokeStyle = '#ff0000';
                    ctx.fillStyle = '#ff0000';
                }

                ctx.fillText(char, finalPosition.x, finalPosition.y);
            }

            //Y.log('Drawing span: ' + JSON.stringify(objSpan), 'debug', NAME);
            //
        }

        function drawAllRects(callback) {
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
                position, size, desc;

            Y.log(JSON.stringify(rect, 'undefined', 2), 'debug', NAME);

            position = {
                x: (rect.attrs.x || 0),
                y: (rect.attrs.y || 0)
            };

            position = applyTransforms(position, rect.transformSet.slice(0));

            size = {
                x: rect.attrs.width || 0,
                y: rect.attrs.height || 0
            };

            desc = 'Original size: ' + size.x + 'x' + size.y + "\n";
            size = applyTransforms(size, rect.transformSet.slice(0));

            size.y = size.y - position.y;
            size.x = size.x - position.x;

            desc = desc + "\n" + JSON.stringify(rect.transformSet, 'undefined', 2) + "\n";
            desc = desc + 'Transform size: ' + size.x + 'x' + size.y + "\n";

            //alert(desc);

            Y.log('Rect position: ' + JSON.stringify(position) + ' size: ' + JSON.stringify(size), 'debug', NAME);

            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.strokeStyle = '#000000';
            //ctx.rect(position.x, position.y, size.x, size.y);
            //ctx.fill();
            //ctx.stroke();

            if (rect.attrs.hasOwnProperty('mask')) {
                if ('url' === rect.attrs.mask.substr(0, 3).toLowerCase()) {
                    drawPattern(rect.attrs.mask, position, size, callback);
                }
            } else {
                callback(null);
            }

        }

        function drawPattern(mask, position, size, callback) {
            var
                identifier = mask.replace('url(#', '').replace(')', ''),
                useImg = null,
                domImg = null,
                i;

            Y.log('Searching for image: ' + identifier, 'debug', NAME);

            for (i =0; i < images.length; i++) {
                if (images[i].attrs.hasOwnProperty('id') && images[i].attrs.id === identifier) {
                    useImg = images[i];
                }
                if (images[i].hasOwnProperty('mask') && images[i].mask === identifier) {
                    useImg = images[i];
                }
            }

            if (useImg) {
                Y.log('using image: ' + JSON.stringify(useImg, 'undefined', 2), 'debug', NAME);
            } else {
                return;
            }

            function makeOnLoad(copyPosition, copySize) {
                return function() {
                    Y.log('DOM image loaded from dataURI', 'debug', NAME);

                    var
                    //  aspect = domImg.width / domImg.height,
                        cnvI,
                        desc = '' +
                            'Image: ' + domImg.width + 'x' + domImg.height + "\n" +
                            'copySize: ' + copySize.x + 'x' + copySize.y + "\n" +
                            'position: ' + position.x + 'x' + position.y;

                    //alert(desc);
                    Y.log(desc, 'debug', NAME);

                    cnvI = invertImage(domImg);

                    ctx.drawImage(cnvI, 0, 0, domImg.width, domImg.height, copyPosition.x, copyPosition.y, copySize.x, copySize.y);
                    callback(null);
                };
            }

            Y.log('drawing image: ' + useImg.attrs.href, 'debug', NAME);

            domImg = document.createElement('img');
            domImg.onload = makeOnLoad(position, size);
            domImg.setAttribute('src', useImg.attrs.href);
        }

        function strToPoint(strPoint) {
            var parts = strPoint.split(',');
            return { 'x': parseFloat(parts[0]), 'y': parseFloat(parts[1])};
        }

        function applyTransforms(point, transforms) {
            var i, processed = false;

            for (i = 0; i < transforms.length; i++) {
                if ('matrix' === transforms[i].substr(0, 6)) {
                    point = applyMatrixTransform(point, transforms[i]);
                    processed = true;
                }
                if ('scale' === transforms[i].substr(0, 5)) {
                    point = applyScaleTransform(point, transforms[i]);
                    processed = true;
                }
                if ('translate' === transforms[i].substr(0, 9)) {
                    point = applyTranslateTransform(point, transforms[i]);
                    processed = true;
                }

                if (false === processed) {
                    Y.log('unhandled: ' + transforms[i], 'warn', NAME);
                }
            }

            return point;
        }

        function applyScaleTransform(point, strTransform) {
            var parts = strTransform.replace('scale(', '').replace(')', '').split(','),
                scaleX,
                scaleY,
                newPoint = {};

            scaleX = parseFloat(jQuery.trim(parts[0]));
            if (2 === parts.length) {
                scaleY = parseFloat(jQuery.trim(parts[1]));
            } else {
                //  if no Y factor is given then Y factor is same as X
                scaleY = scaleX;
            }
            Y.log('Scale: ' + scaleX + ',' + scaleY, 'debug', NAME);
            newPoint.x = point.x * scaleX;
            newPoint.y = point.y * scaleY;
            return newPoint;
        }

        function applyTranslateTransform(point, strTransform) {
            var parts = strTransform.replace('translate(', '').replace(')', '').split(','),
                translateX,
                translateY,
                rewrite,
                newPoint;

            translateX = parseFloat(jQuery.trim(parts[0]));
            if (2 === parts.length) {
                translateY = parseFloat(jQuery.trim(parts[1]));
            } else {
                //  if no Y factor is given then Y factor is same as X
                translateY = translateX;
            }

            rewrite = 'matrix(1,0,0,1,' + translateX + ',' + translateY + ')';

            newPoint = applyMatrixTransform(point, rewrite);

            return newPoint;
        }

        function applyMatrixTransform(point, strTransform) {

            var
                parts = strTransform.replace('matrix(', '').replace(')', '').split(','),
                matrix = [0,0,0,0,0,0],
                newPoint = {},
                i;

            for ( i = 0; i < parts.length ; i++) {
                matrix[i] = parseFloat(jQuery.trim(parts[i]));
            }
//
            //  https://developer.mozilla.org/en/docs/Web/SVG/Attribute/transform
            Y.log('Apply matrix: ' + JSON.stringify(matrix) + ' str: ' + strTransform, 'debug', NAME);
            newPoint.x = (matrix[0] * point.x) + (matrix[2] * point.y) + matrix[4];
            newPoint.y = (matrix[1] * point.x) + (matrix[3] * point.y) + matrix[5];

            Y.log('New point: ' + JSON.stringify(newPoint) + ' from ' + JSON.stringify(point), 'debug', NAME);

            return newPoint;
        }

        function getRotation(transforms) {
            var i, parts, rotation = 0;
            for (i = 0; i < transforms.length; i++) {
                //  if a matrix transformation

                if ('matrix' === transforms[i].substr(0, 6)) {
                    //  take the arc sin of second element, add to total rotation
                    parts = transforms[i].replace('scale(', '').replace(')', '').split(',');
                    rotation = rotation + Math.asin(parseFloat(parts[1]));
                }

            }

            return rotation;
        }

        function getStyleFont(style) {
            var
                fontMod = '',
                fontSize = '8px',
                fontName = 'Arial';

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

            return fontMod + fontSize + ' ' + fontName;

        }

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
                    style.fill = '#fff';
                }
            }

            return style;
        }

        function setPathOptions(style) {
            if (style.hasOwnProperty('fill')) {
                ctx.fillStyle = style.fill;
            }

        }

        /**
         *  Draw negative of a mask image on a new canvas
         *
         *  @param img
         *  @returns {HTMLElement}
         */

        function invertImage(img) {
            var
                cnvI = document.createElement('canvas'),
                ctxI,
                imgData,
                i;

            cnvI.width = img.width;
            cnvI.height = img.height;

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

        /**
         * Constructor for the TestingMojitBinderImageTest class.
         *
         * @class testingMojitBinderIndex
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {

                jqCache = {
                    txtOutput: $('#txtOutput'),
                    btnRunTest: $('#btnRunTest'),
                    cnvTrace: $('#cnvTrace'),
                    divLog: $('#divLog')
                };

                this.node = node;

                //  attach event handlers
                jqCache.btnRunTest.off('click').on('click', onTestBtnClicked);

                function onTestBtnClicked() {

                    function onSvgLoaded(err, data) {
                        if (err) {
                            jqCache.divLog.html('<pre>Could not load test svg</pre>');
                            return;
                        }
                        objSvg = data.data;
                        jqCache.txtOutput.val(JSON.stringify(objSvg, undefined, 2));
                        jqCache.btnRunTest.show();
                        setViewBox();
                        extractPathsRecursive(objSvg, [], '', '', '');
                        jqCache.divLog.html('<pre>' + JSON.stringify(paths, undefined, 2) + '</pre>');
                        drawAllRects(onDrawRects);
                    }

                    function onDrawRects() {
                        drawAllPaths();
                        drawAllText();
                    }

                    jqCache.btnRunTest.hide();
                    Y.doccirrus.comctl.privateGet('/1/media/:loadtestsvg', {}, onSvgLoaded);
                }

            }

        };

    },
    '0.0.1',
    {
        requires: [
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',

            'doccirrus',
            'event-mouseenter',
            'mojito-client',
            'JsonRpcReflection-doccirrus',
            'dcutils',
            'dcauth',

            'base',
            'router',
            'json',
            'model-sync-rest',
            'intl',
            'mojito-intl-addon',
            'dc-comctl',

            'parallel'

        ]
    }
);