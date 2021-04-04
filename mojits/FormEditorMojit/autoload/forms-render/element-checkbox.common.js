/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render checkbox elements and attach element-specific events
 *
 *  MOJ-7769 - add checkbox grouping to allow one checkbox to unset another in the group
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*jshint latedef:false */

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-checkbox',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms checkbox type.', 'debug', NAME);

        /**
         *  Factory method for checkbox element renderers - these make the actual DOM elements representing an element
         *
         *  Context specific to this instance is kept in the renderer, code common to all instances is linked in
         *  the closure to save memory.
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err)
         */

        Y.dcforms.elements.makeCheckboxRenderer = function(element, creationCallback) {

            //  PRIVATE MEMBERS

            var
            //  transparent = ('checkboxtrans' === element.elemType),

                spriteSizes = ['[3mm]', '[4mm]', '[5mm]', '[7mm]'],

                strLabel = '',
                spriteSize = '',
                isChecked = false,
            //  isRendered = false,
            //  bgSe,                   //  will hold background element
            //  cbSe,                   //  will hold checkbox subelements (as opposed to label subelements)
                pubMethods;


            //  PUBLIC METHODS

            /**
             *  Set up private members, event handlers, etc
             */

            function initialize() {

                isChecked = getCheckState(element.value); // ('*' === newValue.substring(0, 1));
                strLabel = getLabel(element.value);
                spriteSize = getSpriteSize(element.value);

                //  'checked' is marked with a '*' in the serialized value
                //  deprecated

                element.value = element.value + '';

                if (-1 !== element.value.indexOf('*')) {
                    element.display = 'true';
                } else {
                    element.display = 'false';
                }

            }

            /**
             *  Refresh the display of this element in the DOM, but only if necessary
             *  @param  callback    {function}  Of the form fn(err)
             */

            function render(callback) {
                callback('REMOVED: dcforms-element-checkbox.render() please use specific renderer');
            }

            function toggleCheckValue() {
                var i;

                //  check if locked, in PDF mode, or element is read-only
                if (false === element.canEdit()) {
                    Y.log('element.canEdit() locked in mode ' + element.page.form.mode + ': ' + JSON.stringify(element.canEdit()), 'debug', NAME );
                    return;
                }

                element.page.isDirty = true;
                isChecked = !(isChecked);
                element.display = isChecked ? 'true' : 'false';

                element.value = spriteSize +  (isChecked ? '*' : '') + strLabel;
                if ('edit' === element.page.form.mode) {
                    element.defaultValue[element.page.form.userLang] = element.value;
                }

                for (i = 0; i < element.subElements.length; i++) {
                    if (element.subElements[i].hasOwnProperty('special') && element.subElements[i].special === 'cbse') {

                        element.subElements[i].img = Y.dcforms.assets[getSpriteName()];
                        element.subElements[i].imgId = ':' + getSpriteName() + '.png';            //  for PDF renderer

                        //  force re-render
                        element.subElements[i].hash = '';
                    }
                }

                //  if this checkbox is marked true then others in the same group must be marked false
                //  (has no effect if element.maxLen !== 0, MOJ-8710)
                if ( isChecked ) {
                    Y.dcforms.elements.checkboxUtils.unsetFromGroup( element, isChecked );
                }

                //  set/unset red border caused by invalid group
                Y.dcforms.elements.checkboxUtils.checkGroupValid( element, isChecked );

                element.isDirty = true;
                //  redraw only text layer
                element.page.redraw( Y.dcforms.LAYER_TEXT );
                //element.page.redrawDirty();
                element.page.form.raise('valueChanged', element);
            }

            /**
             *  Set checkbox value
             *
             *  @param  newValue    {String}    In legacy string format *caption
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function setValue(newValue, callback) {


                if ( null === newValue || 'undefined' === typeof newValue ) {
                    Y.log( 'Invalid value set for checkbox ' + element.elemId + ': ' + JSON.stringify(newValue), 'warn', NAME );
                    return callback( null );
                }

                while(-1 !== newValue.indexOf('**')) {
                    newValue = newValue.replace('***', '*[bold]');
                    newValue = newValue.replace('**', '[bold]');
                }

                if (element.value !== newValue) {
                    element.page.isDirty = true;
                }
                element.value = newValue;

                if ('edit' === element.page.form.mode) {
                    element.defaultValue[element.page.form.userLang] = newValue;
                }

                isChecked = getCheckState(newValue); // ('*' === newValue.substring(0, 1));
                strLabel = getLabel(newValue);
                spriteSize = getSpriteSize(newValue);

                //  do not allow the width to be less than the line height (minimum size of sprite)
                if (element.mm.width < element.mm.lineHeight) {
                    element.mm.width = element.mm.lineHeight;
                }

                //  when marking a checkbox true, uncheck any others in the same group
                //  (has no effect if element.maxLen !== 0, MOJ-8710)
                if ( isChecked ) {
                    Y.dcforms.elements.checkboxUtils.unsetFromGroup( element, isChecked );
                }

                //  add or remove 'hasError' outline from other members of the group
                Y.dcforms.elements.checkboxUtils.checkGroupValid( element, isChecked );

                //  recreate elements
                generateSubElements(/*element.lastOffset*/);

                callback(null);
            }

            function getValue() {
                return element.value;
            }

            function getLabel(fromValue) {
                var label = fromValue + '', i;
                for (i = 0; i < spriteSizes.length; i++) {
                    if (-1 !== label.indexOf(spriteSizes[i])) {
                        label = label.replace(spriteSizes[i], '');
                    }
                    if (-1 !== label.indexOf(spriteSizes[i])) {
                        label = label.replace(spriteSizes[i], '');
                    }
                }

                if ('*' === label.substr(0, 1)) {
                    label = label.substr(1);
                }

                return label;
            }

            function getCheckState(fromValue) {
                var temp = fromValue, i;
                if (!temp) {
                    temp = '';
                }
                for (i = 0; i < spriteSizes.length; i++) {
                    temp = temp.replace(spriteSizes[i], '');
                }
                return ('*' === temp.substring(0, 1));
            }

            function getSpriteSize(fromValue) {
                var spriteSize = '', i;
                if (!fromValue) {
                    fromValue = '';
                }
                for (i = 0; i < spriteSizes.length; i++) {
                    if (-1 !== fromValue.indexOf(spriteSizes[i])) {
                        spriteSize = spriteSizes[i];
                    }
                }
                return spriteSize;
            }

            /**
             *  Paint this element onto the abstract canvas
             *
             *  @param  voffset     {Number}
             *  @param  callback    {Function}
             */

            function renderAbstract(voffset, callback) {

                //  element may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    element.subElements = [];
                    callback(null);
                    return;
                }

                if (!element.subElements || 0 === element.subElements.length) {
                    generateSubElements();
                }

                var
                    ctx = element.page.canvasElastic.getContext('2d'),
                    zoom = element.page.form.zoom,
                    drawBg,
                    subElem,
                    i;

                //  element may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    callback(null);
                    return;
                }

                for (i = 0; i < element.subElements.length; i++) {
                    subElem = element.subElements[i];
                    subElem.bgColor = element.bgColor;
                    subElem.fgColor = element.fgColor;
                    //subElem.height = element.mm.lineHeight;
                    drawBg = element.hasOwnProperty('noncontent');

                    /*
                    if (subElem.special && subElem.special === 'cbse') {
                        subElem.left = 0;
                        //subElem.width = element.mm.lineHeight;
                    } else {
                        subElem.left = element.mm.lineHeight;
                        subElem.width = (element.mm.width - element.mm.lineHeight);
                    }
                    */

                    subElem.renderToCanvas(ctx, zoom, element.mm.left, element.mm.top, voffset, drawBg, 'abstract');
                }

                callback(null);
            }

            /**
             *  Set of sub elements for checkbox and label
             */

            function generateSubElements() {
                //  element may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    element.subElements = [];
                    return;
                }

                var
                    assetId = getSpriteName(),
                    label = getLabel(element.value),
                    isInvalid = !isValid(),
                //  zoom = element.page.form.zoom,
                    spritemm = (element.mm.lineHeight * 1.0),
                    spacer = element.mm.lineHeight * 0.3,
                    txtLines = [],
                    bgSe,
                    cbSe,
                    intSe,
                    i;

                //  size of checkbox image may be from hard-coded enum
                switch(spriteSize) {
                    case '[3mm]':   spritemm = 3.0; break;
                    case '[4mm]':   spritemm = 4.0; break;
                    case '[5mm]':   spritemm = 5.0; break;
                    case '[7mm]':   spritemm = 7.0; break;

                }

                //alert(element.value + ' --> ' + label + ' (' + spritemm + ') ' + spriteSize + ' asset:' + assetId);

                element.subElements = [];

                //  background and outline
                bgSe = Y.dcforms.createSubElement(
                    0, 0,
                    element.mm.width, element.mm.height,
                    element.mm.height,
                    '', null
                );
                bgSe.special = 'bgse';
                bgSe.bgColor = element.bgColor;
                bgSe.noncontent = true;
                element.subElements.push(bgSe);

                //  wrapped label text, if any
                if (label && '' !== label) {

                    while (-1 !== label.indexOf('[bold]')) {
                        label = label.replace('[bold]', '**');
                    }

                    txtLines = Y.dcforms.markdownToSubElements(
                        label,                                          //  markdown text
                        element.font,                                   //  typeface name
                        element.mm.lineHeight,                          //  line height
                        parseFloat(element.mm.lineSpace),               //  leading factor
                        (spritemm + spacer),                            //  x offset (mm)
                        (-1 * spacer) + (element.mm.lineHeight * 0.5),  //  y offset (mm)
                        element.align,                                  //  text alignment (left / right / center)
                        element.mm.width - (spritemm + spacer),         //  wrapping width (mm)
                        element.isBold,                                 //  make bold
                        element.isItalic,                               //  make italic
                        element.isUnderline                             //  make underlined
                    );

                    for (i = 0; i < txtLines.length; i++) {
                        if (element.mm.width < (spritemm + spacer)) {
                            txtLines[i].nocorrect = true;
                        }

                        txtLines[i].fgColor = txtLines[i].overrideColor || element.fgColor;

                        element.subElements.push(txtLines[i]);
                    }
                }

                //  checkbox image
                cbSe = Y.dcforms.createSubElement(
                    0,
                    parseInt(element.mm.lineHeight / 3, 10),        //  slight offset from top to match label
                    spritemm,      //  square
                    spritemm,
                    spritemm,       //element.mm.lineHeight,
                    '',
                    Y.dcforms.assets[assetId]
                );

                cbSe.cbsize = spritemm;
                cbSe.imgId = ':' + assetId + '.png';
                cbSe.special = 'cbse';
                cbSe.fgColor = element.fgColor;
                element.subElements.push(cbSe);

                //  interaction layer
                if ( element.canEdit() ) {
                    intSe = Y.dcforms.createSubElement(
                        0, 0,                                           //  left, top
                        element.mm.width, element.mm.height,            //  width, height
                        element.mm.lineHeight, '', null                 //  lineheight, text, image
                    );

                    if ( 'edit' !== element.page.form.mode ) {
                        intSe.cursor = 'pointer';
                    }

                    intSe.hasError = isInvalid;
                    intSe.hasHighlight = !element.readonly;             //  hint for touch devices
                    intSe.interactive = true;
                    intSe.noncontent = true;
                    intSe.bindmark = true;                              //  show binding
                    intSe.special = 'itse';

                    element.subElements.push( intSe );
                }

            }

            /**
             *  Index into client-side assets and name of image on server
             */

            function getSpriteName() {
                if ('' !== spriteSize) {

                    if ('[4mm]' === spriteSize && isChecked) {
                        return 'checkboxtruesolid';
                    }

                    return isChecked ? 'checkboxcross' : 'checkboxfalsetrans';
                }

                if ('checkboxtrans' === element.elemType) {
                    return isChecked ? 'checkboxtruetrans' : 'checkboxfalsetrans';
                } else {
                    return isChecked ? 'checkboxtrue' : 'checkboxfalse';
                }
            }

            /**
             *  Listen for mousedown events on this element
             *  @/param localized   {Object} Document click event localized to canvas
             */

            function handleClick( /* localized */ ) {
                toggleCheckValue();
                if ( element.page.form.selectedElement !== element ) {
                    element.page.form.setSelected( 'fixed', element );
                }
            }

            /**
             *  Elements have a number of display modes (edit|fill|pdf|lock|...etc), behavior should match
             *  @param  newMode     {string}    Mode name
             *  @param  callback    {function}  Of the form fn(err)
             */

            function setMode( newMode, callback ) {
                generateSubElements();
                callback( null );
            }

            /**
             *  Receive value from mapper
             *
             *  @param  newValue    {mixed}     Accept boolean or string 'true'|'false'
             *  @param  callback    {function}  Called immediately
             */

            function map( newValue, callback ) {

                if (true === newValue || 'true' === newValue || 'True' === newValue || 'TRUE' === newValue) {
                    newValue = true;
                } else {
                    newValue = false;
                }

                element.page.isDirty = true;

                element.exportValue = ('true' === newValue || true === newValue);
                element.value = spriteSize + (newValue ? '*' : '') + getLabel(element.value);
                isChecked = element.exportValue;
                element.display = isChecked ? 'true' : 'false';

                if ( 'edit' === element.page.form.mode ) {
                    element.defaultValue[ element.page.form.userLang ] = element.value;
                }

                generateSubElements();
                callback();
            }

            /**
             *  Return state of this checkbox to mapper
             */

            function unmap() {
                return (isChecked === true || isChecked === 'true');
            }

            /**
             *  Called before unlinking this renderer
             */

            function destroy() {
                var jqMe = element.jqSelf();
                jqMe.html();
            }

            //  EVENT HANDLERS

            function handleKeyDown(e) {
                var code = e.keyCode || e.which;

                if (13 === code || 32 === code) {
                    element.page.isDirty = true;
                    onImgClick();
                }

                //  parent object handles general key events
                element.onKeyDown(e);
            }

            function onImgClick() {
                //  in fill mode parent will also receive event, this check prevents double toggle
                if ('edit' === element.page.form.mode) {
                    toggleCheckValue();
                }
            }

            /**
             *  Check if any other checkbox in the group is set
             */

            function groupIsChecked() {
                return Y.dcforms.elements.checkboxUtils.groupIsChecked( element, isChecked );

            }

            /**
             *  Add/remove 'invalid' border on checkbox, called when this or a group member changes state
             */

            function setInvalid( isInvalid ) {
                var i;
                for ( i = 0; i < element.subElements.length; i ++ ) {
                    if ( element.subElements[i].special && 'itse' === element.subElements[i].special ) {
                        element.subElements[i].hasError = isInvalid;
                    }
                }
            }

            /**
             *  Show the text edit flyover
             *  @param selectedOn
             */

            function createValueEditor(selectedOn){
                function onValueSet() {
                    element.page.isDirty = true;
                    element.page.form.raise('valueChanged', element);
                }

                function onChange(newValue) {
                    setValue(newValue, onValueSet);
                }

                element.page.form.valueEditor = Y.dcforms.createNonTextValueEditor(selectedOn, element, onChange);
            }

            /**
             *  Raised by user action in the editor, such as resizing an element
             */

            function update(callback) {
                generateSubElements();
                if ( callback ) { return callback( null ); }
            }

            /**
             *  Elements may have a variable number of tab stops
             *  @returns {number}
             */

            function countTabStops() {
                return element.canEdit() ? 1 : 0;
            }

            /**
             *  Checkboxes can be invalid if they are part of a group and have 'notEmpty' validation
             *  In this case one of the group must be selected
             */

            function isValid() {
                if ( !element.validate.notEmpty ) { return true; }
                if ( !element.extra || '' === element.extra.trim() ) { return true; }
                if ( !groupIsChecked() ) { return false; }
                return true;
            }

            //  SET UP AND RETURN THE NEW RENDERER

            initialize();

            pubMethods = {
                'map': map,
                'unmap': unmap,
                'setValue': setValue,
                'getValue': getValue,
                'render': render,
                'renderAbstract': renderAbstract,
                'handleClick': handleClick,
                'handleKeyDown': handleKeyDown,
                'createValueEditor': createValueEditor,
                'setMode': setMode,
                'destroy': destroy,
                'update': update,
                'isValid': isValid,
                'setInvalid': setInvalid,
                'countTabStops': countTabStops
            };

            creationCallback(null, pubMethods);
        };

        //  some small images

        if (!Y.dcforms.assets) { Y.dcforms.assets = {}; }

        Y.dcforms.assets.checkboxtrue = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIeCAYAAADNpLcRAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/w' +
            'D/oL2nkwAAAAlwSFlzAAEQkAABEJABiazSuAAAAAd0SU1FB94FEw8gEZrE45MAACAASURBVHja7N13nFTVwf/xz5nZXepiQ42oxJ' +
            'IflhjKnjtLUWOPMTG2FGNUbI+9YcGCoAjYUTGxd401T9REjVEfNbYg7N6zC9hbJEZFUVRYZdndmXt+f9whIYrSttw7832/XryevH' +
            'woM997d853zj33XIO0G2vtd4ABwGZAf6APUL2MX1VKTkTKVCvQtIxfC4B3gdeBN5xzHyq29mEUwQoP8j2KA/xmSwz2i/93HyUkIt' +
            'KhFgBvFAvB60v+b+dcs+JRAWjPAb8bMAzYsfhrKFCpZEREEqUNmA48Vfw1zTnXolhUAFZkwK8AAmCH4oC/NdBDyYiIpEoz8PdiGf' +
            'gbEDrn8opFBeCrg34PYE9gv+LAX61URERKSlOxCNwN/FmXC8q4AFhrDfBDYCTwC3T9XkSkXCwA/gjcDjzrnPMqAOUx8G8GHAgcAH' +
            'xXPwciImXtn8AdwO+dc6+rAJTeoN8NOAg4DKjV+S4iIktRB9wE3FYOCwhLugBYa3sCRwCjgX46t0VEZDl8AFwCXO+cW6gCkK6Bvx' +
            'o4BjgZWEfnsoiIrIS5wGXA1c65JhWAZA/8awAnACcCa+jcFRGRdvAZcAXwW+fcZyoAyfvGfyZwHLqFT0REOkYTcCVwQSnMCKS+AF' +
            'hrfw1ciq7xi4hI5/gAOMU5d48KQNcM/JsXm9hOOhdFRKQLPAkc55x7TQWgcwb+nsBY4BT0JD0REelarcSz0JPSdsdAqgqAtXYv4o' +
            'UY/XXOiYhIgrwLnOic+5MKQPsO/OsQb86wu84xERFJsIeBw5xzc1UAVn3w3x64C1hP55WIiKTAHOA3zrmnVQBWbuDPAOOAs4GMzi' +
            'cREUmRCJgATHTORSoAyz/4fwe4E9hR55CIiKTYU8D+zrkPk/bCEvfN2lq7MzBDg7+IiJSAHYEZxbFNMwDfMPBngfHAGDTlLyIipS' +
            'UCzgfGO+cKKgD/Gfy7AXcDe+scERGREvYAsF8SHjfc5QXAWtsHeBDYTueFiIiUgWeAPZxzC8q2AFhr1wUeBQbrfBARkTIyA/ixc+' +
            '6jsisA1tpNgMeBTXUeiIhIGXob+JFz7h9d8Y93yWI7a+1gYKoGfxERKWObAlOLY2LpFwBr7XbE1z/W1bEXEZEyty7wTHFs7FSdeg' +
            'mg+AYfBbrrmIuIiPzbIuI1Ac+UXAEoTnE8A/TRcRYREfmaBcB2zrkZJVMAigv+pqJpfxERkW/zETCiMxYGdvgagOKtfo9r8BcREV' +
            'mmdYHHi2NnegtAcZOfR9FqfxERkeW1KfBocQxNXwEobu/7INrkR0REZEUNBh4sjqXpKQDFB/vcjbb3FRERWVnbAXcXx9TUzACMRw' +
            '/2ERERWVV7F8fUdtfudwEUn3n8GHqkr4iISHuIgF2dc08ktgBYa79D/IADrfgXERFpPx8Bg51zH7bXX9hu39KttRngTg3+IiIi7W' +
            '5d4M7iWNsuKtrxxY0DdtQx+poFwBvAP4v/+6u/WhWRiJSpKuLdYb/667vAALRz7FftWBxrz22Pv6xdLgFYa7cHnqS8r/t7YBbwNP' +
            'Ay8DrwRntO14iIlJPiZeUBwGbA94HtgYF04aPsEyACdnLOPd3lBcBauw7xdf/1yvBAvFUsPk8BTznnPtGPrIhIh5aCvsVvwjsCOw' +
            'HfK8MY5hCvB5jb1QXgIWD3Mgr+I+Au4PbOemCDiIh84xg0GBgJ/IbyWoP2sHPuZ11WAKy1ewEPlEHQrcX3eTvwuHMurx87EZFEFY' +
            'EK4EfFMrA38fqCUre3c+5PnV4ArLU9gVeB/iUc7kLgemCyc+59/YiJiKSiDKwPnAocAfQs4bf6LrCFc27hyvzhld5esF+/fudSul' +
            'P/84FLgV875x6YM2dOk36kRETSYc6cOU1z5sx5rF+/ftcDbcAgoHsJvtXVgMycOXOe7LQZAGvt5sBMSm+KJQ9MASY65xbox0hEpC' +
            'RmBPoQ3z43iva9/T0JWoFBzrnXOqsAPEG8+rKUPAcc45x7ST8uIiIlWQS2Aq4Gti2xt/akc27nFf1DmZUI8NclNvh/DBwCbKfBX0' +
            'SkdBU/47crfuZ/XEJvbafi2NxxMwDW2mrgNaBfiYT2V2Ck7t8XESm72YC+xHd27VYib+kDYHPn3HKvWVvRGYAzS2Twzxffy081+I' +
            'uIlOVswCfAT4tjQSnc2t2v+F7afwbAWrsG8X721SkP6T1gP+fc8/oREBERa+02wN3ABil/K03Ad51zn7X3DMAJJTD4Pw8M0eAvIi' +
            'JLzAY8DwwpjhFpVl0cq9tvBqB47f+fwBopDuYhYF/nXLNOdxERWcpY1wO4F/hZit/GZ8VZgGWuBVjeGYBjUj743wrso8FfRES+ZS' +
            'agGdinOGak1RrFMXvVZwCKW/6+A6yT0jAmA6c557xObxERWY5xzwAXE28nnEZzgY2XtUXwMrcC7tev37HAz9M6+DvnRs+ZM0dntI' +
            'iILJc5c+YwZ86c/+vXr19vYEQK30Iv4JM5c+ZM+7bflFlGC+oGjE7pMbwVOE2nsoiIrKTTSO/lgNHFMXzlCgBwEOm87/8h4HBN+4' +
            'uIyMoqjiGHF8eUtOlXHMNXugAclsI3/Tzxav+8Tl8REVnFEpAH9iWdtwh+6xj+jYsArbWbEW/7mybvEd/nr939RESk3RS3Dm4kfZ' +
            'sFbe6ce31FZwAOTNmbzBPv8KfBX0RE2nsm4BNgP9K3bfA3juWZb2g6BjggZW9ynHb4ExGRDiwBzwPjUvayDyiO6cs9A/BD4Lspeo' +
            'N/BS7S6SkiIh3souKYkxbfLY7py10ARqbozX1M/EhfrfgXEZGOngXwxTHy4xS97JHLVQCKeyH/IkVv7DRd9xcRkU4sAZ+Qrn1mfl' +
            'Ec25c5A7An0Cclb+o54DadjiIi0sluK45BadCnOLYvswDsl5I3lAeO0dS/iIh0wSyAJ37oTlruCtjvWwuAtbYC2CElb2aKc+4lnY' +
            'YiItJFJeAlYEpKXu4OxTH+G2cAAqA6BW9kPjBRp5+IiHSxicUxKemqi2P8NxaAtHz7v9I5t0DnnYiIdPEswALgyrTMAnxbAdgxBW' +
            '9gIemZchERkdI3pTg2Jd2OSy0AxccGbp2CN3C9bvsTEZEEzQJ8Alyfgpe69ZKPCF5yBmAY0CPhL74VmKzTTUREEmZycYxKsh7Fsf' +
            '5rBSAN0/8POOfe13kmIiIJmwV4H3ggBS91x7QWgNt1momIiMaodioAxS0Chyb8RX8EPK7zS0REEurx4liVZEMXbwu8eAZgM6Ay4S' +
            '/6LudcXueXiIgkUXGMuivhL7OyOOb/VwFIOk3/i4iIxqpV918FYEDCX+xbzrkZOq9ERCThswAzgLcS/jIHpGkG4EmdViIikhJJH7' +
            'NSdQngKZ1PIiKSEkkfs1JzCcCrAIiISMoKQJIfVT8AwFhrvwPMSfALnemcG6zzSURE0sJaOwMYlOCXuF6G5C8AfFqnkoiIpEzSx6' +
            '4BGZJ//f9lnUciIpIySR+7NssA/RP+Il/XeSQiIimT9LGrfwbok/AX+YbOIxERSZmkj119MkB1gl/gAufchzqPREQkTYpj14IEv8' +
            'TqpBcAffsXERHNApRhAfinzh8REUmpJI9hiS8AC3T+iIhISukSgAqAiIioAKgAqACIiIgKgAqACoCIiKgAqACoAIiIiApApxSAqg' +
            'S/wFadPyIiklJJHsOqMjo+IiIi5UcFQERERAVAREREVABERESkJFUoAlkV1toezrlmgCAINgKy3vsFwGfOubwSEmn3n7nuURR1q6' +
            'qqWpjP5zcCNgfagHe997MbGhoWKiVRAZAOEQRBtfd+KNAPqLHWDgGqvfefEt/2sggoWGs/BuqAV4B3M5nM/Pr6eq8ERVZq4N8UGA' +
            'Zsmslkds3n898H5gN5oBvQ3RjT3Vr7BTANeKr48/eac+5zJSgqALJCcrmcqa+v91tuuWW2Z8+eG3jvT/TeDwK2ANYr/jYPmKX88Y' +
            'XAXsRPxHo+iqI/Aq8pVZHlM3To0MpCobCm9/5iYGDx2373JX7Lakv5Y72APYFdgQ+BZ621NznnnlWisiRjrU3yN7JDnHO36jB1rZ' +
            'qamu8ZY/YAzgDWWIXi2AbcD9zgnHtSyYp8syAINvLe7wGMLw70q7JmqwV4Frg+m83eX1dXFynhjmetPRi4RTMAktYPoT299+cAQ9' +
            'rhr6sE9gECa+3N3vsbGhoaPlbKIl8bOHb23p8B7NROf2W34t/1nUKh0GfIkCEPNDY2fqaky5vuApBvGvj7WGuP8d5f106D/5IlYF' +
            'PgDGPM8UEQrKu0Rf5r8D8auLodB/8lP+9/AFyTyWROqq2trVTaKgAi/yWXy63lvT8TuAhYl/gaf3urBsZ572+y1vZV6iJgrT0PmA' +
            'D8vw78Z6qAcYVC4c/W2g2VugqACACDBw/uEUXRFGAU0Lv4n00H/pM/BZ6w1v5A6UsZl+4qa+1RwGigswrxbsCN1trNdARUAETfPr' +
            'pns9lriK/Td+/Ef3oQcK21dmsdBSk3w4cP7x5F0b7ANcSXyDrTDsDFQRBsoSOhAiBlqra2tjtwDnAQ0LMLXsIwYHwQBHbjjTc2Oi' +
            'JSJqW7R2tr6/8AV3TRS6gE9vDejwmCYBM6drZPVAAkaYIgWLNQKIwhvs2vK8/Fnb33E9Zaay19G5FycRz/ub22Kx3gvf9tLpfro0' +
            'OiAiBlIpfL9fXenwqclpCX9BPv/S3FbYVFSvnb/2nAGGD9hLykn0ZR9Ji1Vj97KgBSBh9AJoqic4Hjie8TTopa7/3fgiCo0VGSUr' +
            'PDDjtkihvEjANWT9jLGwrcEQSB1ZFSAZDSdj3xNf/eCXxtG3nvb7bW/liHSUpFEATdmpqadide8Nc7oS9zmPf+/OIzPkQFQErJ0K' +
            'FDu1trxwL/Q7xveFINAsZZa7etqanRuSqpVlNTk/Xe/9p7fyOde5fNisoCPwLGBUGwpY6cCoCUiNra2up8Pn80MDElL3kEcIExRp' +
            'cDJNWMMYcDZwNrp+Ql7+29vyyXy62no6cCICmXy+XWKBQKJwLnpeylb028YclgHUVJI2vtocXSvUnKXvquURQ9Ya3dREdRBUBSLI' +
            'qiM4CTgR4pfPmDgL8GQaDNgiRtg/8vgcvovB3+2tuWwP3W2m10NFUAJJ0fQlOAY+n6+41Xxbre+9uttfvoiErSDR06tNJauwtwFf' +
            'HjfNNsIDBJu3WqAEi6Bv4qa+1o4CiSveBveRjiKdSzrLW7DRo0KKsjLEmVz+d/BtxEfM3fl8DP3nbAuUEQ6FKcCoAkXS6X6wUcAF' +
            'xMsu7zX1U1wMWVlZXDdZQlocV7JDAJ2HCJAbQU7OS9v1wPEFIBkGR/APWOougI4Hcl+ha3Ku4YuIOOtiRBdXW1Kf7s7QmcD5Tqlt' +
            'bbAw/qAUIqAJJAu+++uyF+nO/pdM2DfTrL97z391prd9dRl67W1NTkrbU7AzcD/Ur87Q7w3j9srd1RR14FQBJkzpw5ZxPv7b9uGb' +
            'zdtYEbrLW/0ZGXrjJ8+PCstfaHxLtrrkl5PFVvE+D84kJHSaEKRVA6RowYYVpaWk4gfrpY9zJ6698hXhjYlslkHqivr8/rbJDO1N' +
            'raujPxrX4bl9lbHwpMCILg86ampvD111/3Ohs0AyCdLAiCni0tLb8mXvDXvQwj2BK4OIqi7YMg0DPNpTN/9n4BXFg8B8vRMO/9Nd' +
            'XV1dqtUwVAOtvAgQOrvPe/Aa4Dqso4io2AO733e+qskM5grd3Be38+UO63xtniepxhOitUAKQTVVZWHgecA1QrDdYBbrbWHqIopI' +
            'O/+Q8B7gW+pzQA2BS4z1q7q6JQAZCOtfiWo+OBs4ANFMm/rQFMttYeOXDgQG0WJO2qtrY2EwRBznt/J/EiVF1y+o9+wMXFWyFFBU' +
            'A6iLfWHkZ8zX8NxfE1awKnVVZWjhw4cGA3xSHtJYqirb33V1C69/mvqoHAeGvtNtZaFXAVAGlPw4YN6xYEwT7ApcQL/vQNZOk2Ac' +
            '6rrKzcdZttttEdL7LKrLW7ee8vBrQL5bcbTLwNstYEqABIe/n+97+faWtr28d7fy3pf8BIZ1gPuKe5uflXikJWRRAEw4l3+NOgtn' +
            'wGAHcHQbCbolABkHbQvXv3I4sfQmsrjeXWA7iu+FAkkRWWy+U29t7fRfxYall+G3rvb7XW7qEoVABk5Sxe8HcQMJb4djdZMb2BMd' +
            'ba02pqarorDlmBb/6bR1H0p+LPnS63rbh1gEustdspChUAWXE+CIIc8XPF11McK211YJQx5ghrbQ/FIcsx+Afe+ynEC9tk5Q0Axu' +
            'opgioAsuIfQv29978DeukbyCpbj3gW5ZcjRoyoUhzyLT93W3vvLwB0X3v72BkYr7tyVABk+T+Evuu9P414z23ts90+1gZua2lp2V' +
            '9RyNJYawPv/UXATkqjXe1dWVl5smJQAZDl4L3fB1g8UOnbf/u60Vo7UTHIknK53HeIb2HbWj9z7a4bsHsQBLoUoAIgy/ggWgvYj/' +
            'jatXTM+X+CtfaCIAh6Kg4JgmD9KIoeRNf8O+w7DTDCe//jIAi0SZAKgHyTKIr2B36gJDpUH+AI7/2J1lrtq1DGrLU/8N7/FsgpjQ' +
            '6zeEblRLSPiQqAfOO3/z7A3pTno30725rAaOBga60WBpaRDTbYwBS/+f8AmADso1Q6xYbee+2poAIgS+O9H4D2Gu9MawBTgGN22m' +
            'kn/VyUiffee89ba7co3uqnB9h07kzAQYpBBUCWXgCGA+sqiU53+eeff36xYigPQRD0Ba4BtkcL/jpTFuivy24qALJ0OyuCLnOUtf' +
            'aampqaakVRunK53OrF7X2302dhl+hjjBmgGFQA5Os2VwRdphewvzHmjCAI9MyFEmStHRBF0ZXALkqjSz/j8opBBUCWsPXWW1cQ3y' +
            '8rXacaGOW9P8Zaq2NRAtZaa63Fz9TYFBjHf/bXkC4q2t57FQAVAFlSS0vL+mrGidATGA+MHTZsmO4OSLl58+b5mpqaDYEriPfXkK' +
            '61CPiuYlABkCV479cFFiqJxBjb1tY2ZejQobolM8VqamrWNMZcSby3vzahSUAnM8aoWKsAyFcsAD5XDIlyWD6fvyEIgjUVRfrkcr' +
            'lexcF/D6BCiSTjc85736wYVABkCc6519AuWUlTBfzcez/eWruB4kiPIAg2jKLocjTtnzQtwDzFoAIgX9cMRIohUXoAxwKjampqei' +
            'mOVAz+G3jvzwQOVxqJ81Emk3lXMagAyBJqa2urgAd1fBL7M3OKMeayXC6nNQEJVlNTs5r3/lIN/onkgYZevXrNVRQqALKEurq6Vm' +
            'PM80oi0Y6Iougma21fRZE81trexpjr0DX/pPoUmPH0009rllMFQL5Wj73/CJiqJBJtP+C6IAjWVxTJMWzYsB7AecC+6GFaSfWqMc' +
            'YpBhUAWQrn3OvALCWRaAb4qfd+UhAEmyiOrhcEwdptbW0TgBOURqI9EIbh24pBBUC+aXQx5mbgAyWRaN2Ag733o4cMGbKW4ug61t' +
            'rveO9PA0YpjUR73hjzkGJQAZBvEYZhPXC/kkiFozKZzHW5XK6Houh8I0aMqAQmEd+loWv+yXZDNpudrRhUAGTZswCXAf9SEqnw8y' +
            'iKHrDWbqgoOk8QBJmWlpYbiNdkqIAlVyvwSFNT053Tp09vUxwqALLsWYB3gNHo2QBpsStwrbV2M0XR8XK5XA/v/XjgIOJnN0hy1R' +
            'ljjn3jjTcKikIFQJaTc+5eYKySSI1dgPOstXqkc8d+818tiqITiZ/sJ8k2HTg/DMPZikIFQFa8BFwE/FZJpEIl8HPgTGttf8XRIY' +
            'P/Wt77UcRPa5Rke80Yc4Zz7q+KQgVAVlIURecCl6HLAWkxErjeWqvnOrSjXC5nitv7jiK+C0OS6z3gSOA5RaECIKugsbHxU2AKcC' +
            'vwpRJJhV2B/wuCYFNF0W5F+LfFQWV1pZFYnni3v8Odc8+GYajr/ioAsqqcc//y3p8C/FlppOdLq/f+FmttTlGsvBEjRlRZa88sDv' +
            '69lUiivW2MOcI596iiUAGQdtTQ0LCgoqLiMLQmIE2GAxOstYOJdxCUFVBbW9urpaXlIOB84jUWklyvA+eGYXifolABkA4wffr0RR' +
            'UVFaOJNz/RAzWSrwL4MXBOEAS6RXAF1NTUVBcKhSOBK5RG4s0BTmlqarpTUagASMeWgNZCoXBxsQRoTUA67OW9v9paqwcILSdjzC' +
            'jgdLTJT9LNM8Ycks1mH3/jjTe84lABkA42Y8aMJuBq4DqgSYmkwg7AU9onYNmstecCpwLrKI1E+xw4MQzDx+rq6rTLnwqAdBbn3E' +
            'fZbHYMcC/xdpuSfAOAu621OyiKr/vVr35lrLUnEu+C2UeJJNoHwGjnnKb9VQCkK9TV1bU45w4HLlEaqTEIGG+t3XrDDTfUwsCiYc' +
            'OG9Xj77bf3BSajaf+k+wcwwTl3o6JQAZAu1rNnz/HEG6TovtvkM8APgUnrrrvuoHIPo6ampkdNTU3ftra2/YEb0FP9km4BMAa4WV' +
            'GoAEgCPPfcc/l8Pn8DcAbxRhySfNt7768JgmDLsm5DxuxXfPrlmeg+/6RrBkYaY/7knNM1fxUASYqZM2cujKLoZuB3xItzJPmGee' +
            '8fsdbWlOObt9YeQHw3y4HAJjodEq0JONU59+cwDFsUhwqAJExjY+OnxpjzgBvRLYJp0R/4g7V2tzIa+E0QBNsDlwLr6RRIvHnAec' +
            '65qxWFCoAkWBiGbc650cBFSiMVDLAp8cLAHwVBUNILAwcNGpQBhnrv/xfd5pcG7wMXVFVVXawoVAAkJZxzE4GDAF2rS4da4ELvfW' +
            '0pv8mKioqfEj/Yqq8OeeI1AxOMMde88MIL2uRHBUDSpPgt61jirTol+YYAN1trty7FNxcEwR7AeEDbIqfD4VVVVbeFYbhQUagASM' +
            'o0NDQ0e+/vIr7W+rESSYUtgXuttTuX0puy1u7mvf8dUKNDnHgLgdHNzc33vPDCC1rwpwIgKS4BX2YymSuAy9G2wWmxPnCbtXafEh' +
            'n8hwHXEi94lGT7HLjaOTf5lVde0b4iKgCSdvX19Xnn3AXA2cTX9ST5+hEvDNw7l8ul8md2jz32MEEQDARu1+CfCvOAKRtvvPFpik' +
            'IFQEqMc24KMJJ4ik+S7wfABVEUbbvlllum7uf2gw8+2M57/3vg/wFaRJZsLcCFxpgr/vjHP+pYqQBIKcpmsw8BhwDvKo1U2Ay4s0' +
            'ePHruk6UVba3f23k8EBhb/k557kGynGWOuCsNQm4ipAEipqqura8lkMg8AFwDvKZFUWB+43Vq7X5Jf5BZbbGEAgiDIAVcB2+jQJV' +
            '4eOLuqquqaMAx1eVAFQEpdfX19W69eva4j3oZ1gRJJhXWA31prD/rhD3+YyG/Tr776qrfWbuW9v5d42l+SbQFwk3Nu4gsvvKD9Qs' +
            'qEnrYlPPvssx64zlrbQnyb4JpKJfH6AmO//PLLaKuttrrnpZdeSsyHdi6XM977Ad77G4GNdagS70vg5j59+pyqKDQDIGXKOXcrcD' +
            'DwkdJIhe8B53br1m2X4cOHJ6bMe++D4uA/FC34S7o24FJjzAV/+9vfdKufCoCUs0WLFj1GvDDwbaWRChsDd7e1tf0kCS/GWrut9/' +
            '4C/nPNXwv+ku3CbDY7OQzDuYpCBUDK3Msvv9yaz+cfJ96m9U0lkgp9vPe/t9Ye28WD/wDiTaZ20iFJhUuNMRPr6uq0KViZ0hoA+Z' +
            'qZM2cWgDustQXiFdxrKJXklwBggrW2sqKi4srp06fnO/MfD4JgQ+/9w8RPM5Rk+xK4z3s/zjmnBX+aARD5Oufc3cCBaE1AWqwJnJ' +
            'rP5w8fPHhwj04c/Dfx3t9MvNpfnynJ1grcE0XRcQ0NDbrVTwVA5FtLwF+MMfuhywFpsT4wJpvN7j148OCqjv7HrLXf995fBuys6F' +
            'Phd8aYcY2NjZr2FxUAWbb58+c/AxwJvKQ0UmED4NZsNrt3B3/zt8CFwJ6KPBWuNMZcFIahHgkuKgCyfN58882oe/fuTxM/QGiWEk' +
            'mFSuAua+2ZHTT49/feXwLspqhT4daKiopTwjDUo8Dl37QIUJbL3//+dw88YK31wNXAekolFQX/dGtt90KhcN6MGTNa22nw7+O9f4' +
            'j4AUW6zS/ZWoCHvPcnTZ8+vVVxiGYAZKU55/5kjNkH+EBppMJqwDHZbPbEmpqaPu0w+K/vvb+T+ME+GvyTLQL+7L0/vqGhQQ/2ER' +
            'UAWXVhGE4D9gAalEYq9AVGG2MOsNZWrsLgv6n3fgKwuyJNheuNMac1NDR82Lt3b5U1UQGQdpsJcMaY44BpSiMV1gZ+CxwybNiwFf' +
            '65t9Zu4b0/DzhUUabC7caYC8Iw/CfAF198oS2ZRQVA2s8nn3wyDRgH1KE939MgC1zX1tZ29gp+8+9HvNp/H0WYCo9UVFQcFYbhu4' +
            'pCVACkQ8yePds7554gvjvgLSWSGqdYa6/I5XLdl/Uba2trK733dxBf8qlUdImWBx4zxoycPn26NvkRFQDpeM65x4oLA99RGqnQGx' +
            'gZRdEYa23fb/pNuVxu9UKhcC+wgyJLPA88ChwfhuE8xSEqANJpwjB8CdgFeF5ppMLqwCjg8IEDB3Zb4r8bAGtt/yiKzgH2VlSpcL' +
            'cx5lTn3JvrrLOOFvyJCoB0+kzA28AJwGNKIxWqgUmVlZWjhw0btnhPEG+t3RAYWywIknz3AueGYfg6wNy5c7UeR1QApEtKQCNwLv' +
            'AsUFAiqfgMmNjW1nYRQBAEqwEXEz8ESpLvhUwmc4xz7g1FISoAkoQS8AJwFjBDaaTGcdba6733twG/ALorkkSLiO++2bu+vv5TxS' +
            'EqAJKkEvA8sD/wotJIhSpgJPGDfbRFePL9zRhzpHNOj+oWFQBJZAl4PZPJ7AQ8qTRSoZsiSIWHjTFnhGGoGTZRAZDkqq+v/xg4Fv' +
            'ij0hBpl8F/TBiGoaIQFQBJxUyAMWYS8d0BeSUislJmGmOOC8NQl9VEBUDSIwzDmcDpwN+VhsgK8cDrxpg9Fu/tL6ICIGmbA6bDBQ' +
            'AAIABJREFUCZhpjDkEeEZpiCy3acaYg7W3v6gASNpnAt7JZDJ7Ag8rDZFleqZ4zV9P3RQVAEm/+vr6+d77o4HblIbIN3rWGHNqGI' +
            'ZPKwpRAZCS0dDQ8J4x5kLgPqBViYj8l1eMMccZY5yiEBUAKTlhGL5mjDkVeEppiADxgr/3jTG/DsPwxfr6eu3rLyoAUrIlYHZxYe' +
            'CflIYILxpj9tetfqICICUvCAIThuGH2Wz2QOD3SkTKuQ8DY8Mw1F0yogIgZTED4AHq6uq+8N6fBFxLPA0qUm7f/E92zj2kKEQFQM' +
            'pOQ0PDPGAycDuwSIlImXjbGHN4VVWVNskSFQApX865t40xo4G/aiZASpwH5gL/E4bh9KlTp0aKRFQApKyFYfixMWYkcKvSkBL2D2' +
            'PMoc65pxWFqACI/KcEfJHJZI4DLlcaUoJeBMaEYfgXRSEqACJfUV9fv9B7P554XUCLEpGUW3xJ65/Aac65PygSUQEQ+QYNDQ0LgC' +
            'nADUCzEpEUM8CHxpiDstnsE4pDVABElsE59z4wFrhfMwGS4m//84wxx4Rh+ExdXV1ekYgKgMjylYD5FRUVBwI3Kg1JoQ+AUWEYPp' +
            'DNZo3iEBUAkRUwffp0b4w5BRijNCRFXgfGOefuACgUCrq9VVQARFZUGIYtURT9DhgHNCkRSbhPgLGVlZW3KwpRARBZRY2NjV8Qbx' +
            'l8pUqAJNiXwAE9evT487Rp0wqKQ5KmQhFIGjnnPsnlcudHUVQNHAr0VCqSIJ8Do5xzjykK0QyASDurr6//wjl3PHCN0pAE+RiY4J' +
            'y7TVGICoBIx84GnAocqyQkAd4FJjnntIOlqACIdAbv/a3ASUCb0pAu8jlwrvf+ekUhKgAinaShoWEhcBtwKfCZEpEucEQmk7mjoa' +
            'FBj7IWFQCRzuSc+8x7fwFwC6Cd1qSzfAkc3bNnz/vq6+tbFYekhe4CkFKbCVgAnGKt7QYcQ7z/ukhH+Qy4yjl3raIQzQCIJGM24D' +
            'jgZCUhHWgucJlzbpyiEBUAkQSprKy8DjgYPUBI2l8TcEEmk7lCUYgKgEjCTJs2rblQKPwvMAn4SIlIOxqdyWSuq6+v106UogIgkk' +
            'QzZsxY6L2/BLgK0AItWVURcEomk7mpvr6+WXFImmkRoJS8hoaGFmCitbZQnA3QwkBZGfOBW5xzlykK0QyASIo4584nvjNAawJkRS' +
            '0AbnDOnaQoRAVAJIXa2tpuBn6DniIoy68ZuBg4X1GICoBISs2aNavVe/8wMBZ4T4nIcphkjPmdc047TIoKgEiaNTQ0tDrnfgtcQb' +
            'yLm8g3mdi7d++LwjBcoChEBUCkRDjnJgPHKQlZii+AawuFwqRnnnmmoDhEBUCk9ErArcRrAuYpDSlqBu42xpw0Y8YM3ToqKgAipS' +
            'qKonuAkcAcpaHTAZiSyWTGhGGop/qJCoBIKWtsbPRRFD0OnAXMViJl7VJjzOX19fWfKApRARApjxKQd87dAlwGfKxEytK11dXVZ4' +
            'ZhqOMvKgAi5cY59zvgUCVRVlqAOzKZzClPP/20FvyJCoBIGZeAh4Fd0AOEykEb8EdgVH19/ULFISoAIioBTwAHAq8qjZJ2rTHmNO' +
            'fcvP79++sZEaICICKQzWafAsYAbyqNknSNMeaSMAw/AHj33Xe9IhEVABGhrq6u4Jz7E3AR8E8lUlLuq6ysPCkMw38pClEBEJGlcs' +
            '7dBBxMvEGMpFseeBg4ZNq0aXoqpKgAiMgyS8DTxpihwAdKI/WD/3HOOT0NUlQAFIHI8gnD8EVgX2C60kilW40xpzrndDlHRAVAZM' +
            'W0tLS8AJwBvKg0UqUA/DEMw7cVhYgKgMgKe+mllwrGmFeA95VG6j7rplhrd1EUIioAIissCILu3vurgO2VRqoYYHPgHGvtTopDRA' +
            'VAZLnlcrkq7/1NwC+A7koklbYGrgyCYHNFISoAIrI83/z7RVF0EfAbpZF6m3vvH7HWjlAUogIgIl+z8cYbm+Lgv473/hRglFIpCR' +
            '7YGLjfWvsTxSEqACLyX9555x1fU1Ozuvf+QuBYJVIyFu/5vw5wrbV2T0UiKgAi8m+5XK7KGDMZ2A/opkRKsghsCJxtrd0zl8vpYU' +
            'CiAiBS7nbccUdTvOZ/GFrwV+pqgCne+xprrUqAqACIlCtrbd/58+dPQNf8y8lG3vsngG0VhagAiJTn4L8GcDzxbn9SXlYnXhh4iK' +
            'IQFQCRMjJw4MBKYAJwClChRMrSWsCF1toDq6urdTlAVABEyuCbf7aysvIS4CCglxIpa+sAYwYMGPDrrbbaqlJxiAqASInaZpttDH' +
            'AacCJQrUSEeNvgi7t3775d//799TkpKgAiJfjNv7q5uflk4HylIV+xgff+8bXXXnsHRSEqACIlJAiCauBoYLzSkG9ggD9ba09WFK' +
            'ICIFIivPdnEq/276005Fv0As601p6kKEQFQCTlrLUXAEcBaygNWQ59gZOstYcMGTKkh+KQUqBbnaSsjBw50rz88stHEi/6UwGWFb' +
            'EhcF4mk2kG7lEcohkAkZSoqanp/vLLLx8EXKNzX1bSesDd1tq9FIWoAIikQBAEPY0xhwKXKg1pBw9Ya89UDKICIJJw3vvjgLHAmk' +
            'pD2smp1trzFIOoAIgklLV2LDCaePpWpL2sCRxprT3GWqsNpCR1tAhQStY222yTaW5uHgmcjm71k46xFjAJ8MRrS0Q0AyDSlYYPH1' +
            '65aNGi3YEbNfhLB1sDuNpae5SiEBUAkS5UU1NT1dra+mvv/Q1AVolIJ7nGWjteMYgKgEgXMcYcQry97zpKQzrZSdbaK621urwqKg' +
            'AinclaewxwLrCJ0pAu0AcYCZxsrdUdJ6ICINJJg/++wARgXaUhXai6eB4euu666+ozVhJL01SSettvv31FU1PTtsD1xW9gIl2tG3' +
            'DJBhtssNpHH300TnGIZgBE2tkWW2yRaWpq2h24ozj4e6UiCTLWWjt5+PDhVYpCVABE2lHPnj33I74Pu1/xPxmlIglzbGtr6zW5XE' +
            '63o4oKgEh7sNb+Ejgf+L7SkATrDuwXRdHJuVxOj58WFQCRVRz8fwJcSfyIVpGk6wGcFUXRIT/4wQ+6Kw5JAi0ClFQZOnRotlAo1H' +
            'rvr0P3+Uu6VAGTq6qq1gLOUhyiGQCRFZDP57f33t8ObIAW/En6GGCMtfZ3Q4cO7aE4RAVAZDlYa/cGLga+t8SHqUgaHZ3P5yfX1N' +
            'SspShEBUBkKXr16mUAgiDYCbgQqFEqUgKywAHGmDNramp0KUtUAES+6ssvv/TW2uHFaf/vKREpIX2Ak40xR9bW1moDK+l0WgQoib' +
            'XttttmmpubB3vvb+I/9/mLlBIDTCgUCn2BExWHaAZABFi4cGGt9/56YAulISXuBGvt3UEQ9FIUogIgZc1auytwKWCVhpSJX3nvr6' +
            '2pqdHeFqICIOUpCIKhxDv8jVAaUmafx/sYY86y1q6vOEQFQMpt8N/Me38PMERpSBnqCRwJjAqCYG3FISoAUvKGDRtmrLVbeO/vBj' +
            'ZC9/hLeTvVez9p66231lMERQVASls+nx8I/Fbf/EX+7YhFixY9GASBbhEUFQApTUEQbO29nwzsrDRE/svO3vs7rbUDFIWoAEipDf' +
            '5DvPfnAzspDZGvyQI/AsZZazdRHKICIKUy+H+nuMPftuiav8g3qQL2B8bmcrn1FIeoAEjaB/8NvPd/ArbS4C+yTAY4JIqiydZaPU' +
            'BIVAAknYqr/acAQ5WGyAr5DXC/tXZdRSEqAJK2wX8QcB7wc6UhslJGAH+w1m6lKEQFQNIy+G9J/EjfvZSGyEqrALYGJqgEiAqAJF' +
            '4QBGsA1xGvaNY1f5FVkwX2Bibkcjk9O0BUACSxg//q3vv7gW10ziXeQuCfwHxFkQp7R1F0bRAE/RWFqABIolhrN/XeXwFsrzRS4Q' +
            '/AQcBNQLPiSIWfeO//YK39f4pCVACkS62//vqm+M1/U2AsMFKppMK1wATn3DPGmAuAewGvWFIhB9xjra1RFKICIF3m/fff99bajb' +
            'z3F2vwT42/GmPOcs69AxCG4SfOuUOKMwGSjs/yIcAF1lrdXisqANJFX0VyuWriB/v8TOdY4nng+Uwm8/MwDD/96v/TOXc4cLZiSg' +
            'VDvMh2YnH2TUQFQDp18O8WRdFtxcG/UokkWh54FDiwvr7+2673XwWcBXypyFJhF+/9nUEQ6AFCogIgncNau0EURVcQ354kyfcQcI' +
            'Zzbva3/Sbn3KfE6wOuBhYotlQYWlwYmFMUogIgHWKdddZZvOBvfWA0cKRSSYU7jTFnOudmLc9vLpaASWhNQJoMAm621m6jKEQFQN' +
            'rd3LlzfU1Nzdre+4uAY5RIKjxljDkzDMPXV+QPOecWOOdOBi4GCooxFbYCLgiCYDu0AZeoAEh7CoKgtzFmCrAP8RalklweeMUY88' +
            'swDP+1sn+Jc+504AziNQSSfNt47ycGQfD9XC6nEiAqALLqamtrs977ycRPKOuhRBItAp4zxuy1tNX+K/yXRdF1wMloTUBabOu9/6' +
            'P3fktFISoAsqrf/PsWCoUL0TX/tHjCGHN6GIZvtsdf1tjY2ATcAlwKfKx4U2Ez7/2D1tqdFYWoAMhKyeVya3vvTy5+A5Tk+ytwWh' +
            'iG09rzL3XOfZHNZs8nvk0wUsypsAlwlbV2d0UhumYrK6SmpqZHFEUTgINVIFPh78aYUWEYvtERf3ldXV0eONda2wRcpM+UVBgATL' +
            'TWRsaYR8MwVHnTDIDItxs8eHCVMeYK4ACguxJJNE/8VL+RHTX4f2U24DLgWPQUwdT8OAPjgaFbbbWVFgaqAIh8s9122y2TzWbHAY' +
            'cDvZVI4s0Efuac+8d6663XKR/wbW1ttxNfFtKagHTIee//0K1btyGKQgVAZKlqa2t7z5079wziJ/tJ8j1rjDnFOfciwJw5czrliX' +
            '6zZs1aBNwNXAh8oMOQChsAj1tr91IUKgAi/8Vau2ahUDgRGKc0Em3xIF8HnBmG4VNd8SKcc83FywFTgEU6LKmwFnC5tfZARaECIL' +
            'Kk04HT0DX/pDPADGPMYfl8/oWufjHOuUuAI9BmQWmxEXCWtfYXgwYN0kO8VABE3/7tFcUP8T5KI/Hf/j8ADgvD8KWZM2f6JLwo59' +
            'zviTeJ+lCHKBU2A8ZXVFTspChUAKRMDR8+PGutHU28t//qSiTx/gHs65xr+N73vpeoFd35fP5+4CTiOxIk+b4P3BIEwfaKQgVAyk' +
            'xtbW331tbWw4gf+KJ7upOvDjjBOfc8wFtvveWT9OJmzpxZAB4AzlMJSI3veO8fDYJgX0WhAiBlIpfLVRcKhSOBy5RGoi0e5F8Fxj' +
            'rnHknyi3XOtTjnbgAmA5/q8KVCN+/9FGvtcYpCBUDKQBRFxwNjgF5KI9EMMNsYc2Dv3r2fTMuLds5daYw5FN0dkJqZAOAUa+1Bgw' +
            'YN0iJgFQApVdbaicApwDpKI/Hf/j8EDg7D0D3zzDOp2sY1DMM/Az8F3tWhTIWNiBcG/kxRqABIiRkwYEC2OM03ClhTiSTeHOAY59' +
            'wzaX0Dc+fO/RtwHPCyDmdqSsDV1tpfKAoVACkRI0aMqKqurt4b+B3a3jcNZgEnOeceSPOb+Ne//uXb2toeBSYCb/KfNQ2SXH2Be6' +
            'y1hyoKFQBJuSAIure0tOwP3KQ0Em3x4DgbOMc594eSaDKzZrU55+4FJgHv6TCnQpZ4x8DTFIUKgKR5VPH+cOActMlP0hlgvjFmZK' +
            '9evR4qtTfnnLsdOArdHZAWfYATrLXHDR48WIuFVQAkbay1JxE/2Oe7SiPx5gH7de/e/flnn322UIpvsHgb4y7A2zrcqbA+cE42m/' +
            '3lVlttlVUc6aWNXspv8D8EOBvt8JcGc4GznHN/LfU32tbW1lhZWbl4A6paHfrE6wtc0a1bt27AdYpDMwCSYLlcrspa+2PgSg3+qf' +
            'BWcfC/sRze7KxZs/yCBQueAyYAL6GFgWnQh/jugFMUhQqAJPdbfzaKot2B3wM9lUjivVccCG8ppzf95ptvRs65vxBvRvWWToPUjC' +
            'HnW2vH53I5PUVQBUASaCRwAfG0nSTXl0ABODqKonucc4VyDME595Ax5gjiOx8k+aqAo6IoOjUIgmrFoQIgXc8Uv/0fCJwLDFAkid' +
            'YCTDLG7LP22ms/0tjY2FbOYYRh+LQx5sfAKzo1UmFdYIz3fn9rrbYNTgktAixd3lr7c+BytMNfGr75X+Wcu3D11Vc3YRjq+jfgvX' +
            '/TGHOg9/4yYDslkni9iTcVWw24SHGoAEgXGDp0aEWhUNjGe38VsJYSSbR5wLWFQmE8wOeff67Bv8g5FwENQRCc672/EMhRnNmSRI' +
            '8p51tr1ygUCmfNmDGjoEiSS5cASlA+n9/Re38b8bScBpTkagMme+8nz5gxI684li4Mw78RP6jqVaWRmnHl1Gw2e1FNTY02GlMBkM' +
            '4SBMGvgEuB/sX/pG9MyXVSRUXFlQ0NDZ8rimXOBjxvjBkJNCqNVMgChxpjTrfWrqE4VACk4wf/3b33E4GtlEai5Ylv87tp+vTpXy' +
            'iO5Z4JcMaYXwBTlUYqrAGcDBwWBIFmAhJIawBKhLV2B+/9TcDaSiPRFgJ3OefOURQr7vPPP39ntdVWOxS4AthViSRed+AS73018b' +
            'NHRAVA2ksul8t472u99zcC6yiRRGsCbq2srNTOaSvprbfe8sDrQRCM995XAT8knm6WZDvbWrv+aqutdsRTTz0VKY5k0CWAlIuiaL' +
            'j3/jpgE6WRaHniW6TOmzZtWpviWDVhGE4zxowCXlQaqXHw/Pnzr7PWrqsoVABkFVlrdwemAAOVRuJNymazlzjnPlIU7VYCZhXXBD' +
            'ynNFIhC+wHjFEJUAGQVRv8dwQmAoHSSLxLKyoqLqmrq9Nq//YvAW8DBwAPKY1U6AUcBRwfBIE2KFMBkBUVBMGWwK3AIKWRaM3AvY' +
            'VC4czp06cvVBwdwzn3LnACcJ/SSIUq4Czv/RlDhw7VA4RUAGQFBv9+3vtbgQ3RPf5J1gL8byaTOWTGjBm65t/xJWA2MAl4kPiBSp' +
            'J8o/P5/N3W2ipFoQIgy2Ct7ee9P4t4S1RJrgi4DhhbX1/frDg6rQTMMMaMBuqKx0CSb0/grpqamv6KQgVAvkFtbW0P4H+AI5RG4l' +
            '0FnO+c+5ei6FxhGL5hjPkZ8KTSSIUKYHdjzDnW2g0VhwqALEWhUNiZeAWt9m5Ithuy2ewYrfbv0hIwL5PJ7A/cpjRSoRswEhg1ZM' +
            'iQ3opDBUC+7nB0r3+StQJ/9t6Prqur0/a+Xay+vv7jTCYzhnixrNYEpGMm4ORMJnPANttso3FJBUAAtt12W2Ot/T6wG/HqWUmeAv' +
            'AIcFhDQ8N8xZGYEvABcD7wB+InL0ryXdPc3PxjxaACIEBzc3M1sAea+k+yWzKZzEnOuXmKIlmcc28CY4En0MLAtLgxl8v1VQwqAG' +
            'XPe78+MExJJNbvjTGT6uvrZyuKxJaAf1RWVu4D/EVppELfKIr04CAVAAG2BDZXDIl0f0VFxXFhGP5TUSTbtGnTFlVUVOxL/DwGSb' +
            'ZK4EfW2uGKQgWg3FlgPcWQKHngMeDo6dOnL1Ac6TB9+vTmTCZzHnA5WhOQdAOA7RSDCkC5Ww3ooRgSwwNPAUc75+YqjnSpr6//CL' +
            'iM+O6ARUok0XbJ5XJ6xLkKQHkKgqC6+D+1ADA57jXGnOice6dXr17aijmFnHPvAecC9xcLnSTTtt771RSDCkC56g10VwyJcT8wIQ' +
            'zD1wC+/PJLDR7pLQHvG2MOAe5RGollvPd7KAYVgPI8+41pJX58pnS9Z40xRzrnXlUUpSEMw1bn3G+Ai5VGIlWgO6BUAMpVfX39vO' +
            'IsgHQdD7xgjNkvDMNPFEfpyWazFwHnED/BUZJFx0QFoKx9ilYsd6XngKPCMPxAUZSmurq6T7331wDXALqrI2GzALlcbn3FoAJQdq' +
            'y1WaCR+L5Y6Xx/AU52zs1ac801teCvhDU0NHzsvZ8I3KE0EmWDKIq0g6MKQPlxzhWAF5REl3gEONs55wA+/fRTLfgr/RLwaWVl5Y' +
            'nAb5VGInig++qrr64na6oAlCdjzOcqAZ1uljHmGOdcg6IoL9OmTcs7504kXhOg0tfFH3/AoieffFIzACoA5al4y9krSqLTvGqM+Z' +
            'm29y3zr57eXw6cCjQrjS71niJQASh3j6HFSZ2hDjg8DMN3FUV5a2hoaDLG3AxMJl6IK130HUgRqACU+7eRvxQHJ+k4zwKnO+f+ri' +
            'gEIAzDz6MoOh+4ET1KuCssIr4LR1QAyvrbyELgIrR3eUd52hhzhnPuaUUhS2psbFzUq1evM4GzlUan+0cmk9HGWyoAAkwD/qAY2t' +
            '3rwAn9+/efpihkaZ599tnIOXceMAr4Uol0ilZgen19vS59qgCIc+4LY8z5wPTif9IK5VX3AbCXc+7F+++/X3nKt49Ira3XAqcAny' +
            'mNDveuvvCoAEiRtdaEYfg6cCLwBvEtMrLyXjTGHOCce01RyHKdMC++2ALcCVwI6N70jvVIt27dnlAMKgASzwD44v+dDhxf/PYqK2' +
            'bxt3xnjBkbhuHfFIms4M/hF865i4Gr0S2CHeV14N6pU6fmFYUKgHxFFEVPAycBbymNFWIAB4wOw/BBxSGrUAQmACcriQ4xyRjTqB' +
            'hUAGQpGhsbW51zfyC+M+B9JbLc/mGMOb5bt27PKApphxJwLXAg2iegvRSAm4C7wjDU7IoKgCzjA+hG4kVJXyiNb+WLH9IHhGH4wt' +
            'SpU3VPt7SL5ubmu4jvDlARX/Wf0TpgtHNOP58qALKcJeBeYF+0JuDbvFNc8KdnKki7euWVV6Ioiu4DJqFta1fF48aY45xzusNCBU' +
            'BWsAQ8Yow5GHhTaXzNy8DZYRj+VVFIR2hsbFxYvBxwBTBPiazU4D82DEM9fEsFQFZGS0vL08SLkvTgoP94EzjDOXenopBOKOKTiR' +
            'fnavX68nvOGHN0GIba818FQFbWiy++2Oacexi4gPjugHLf2OY94JiePXs+qrNDOrEE/B74GTBXaSxTI3BYGIb/UBQqANI+H0B3GG' +
            'NOAeaXaQSe+MmJRzvnnnjuuef0bUw61ezZsx8DjiTesEu+4TsLcJhzTpctVQCkPRXvcf8J8K8yfPsfAUc45x6uqKjQbonS6ebNm+' +
            'e9948AE4B3lMjXPAsc6ZzTvf4qANJBMwEvAPsRT7OVizeBccU7I8jn89rfX7pEQ0NDa3HtyQXo7oAlPQOM1R05KgDSwZqbm6cZY0' +
            '4r8RKweJCfUxz8b9SRlwQV8RuIF+fOVxq8SHxp7jlFoQIgHeyVV14phGH4BDAReKlE36YhfjrbEd26dXtAR10SWAL+F/hxsaSWq9' +
            'eMMfs6517VGaECIJ37AfQAcDqluVnQF8CJzrmHp06d2qqjLUm0YMGCOuAAYEY5Dv7AUWEYavBXAZAuKgGPGGN2Bf5ZQm/rM+D04q' +
            '1XIon15ptvRoVC4RngXMprr4564ATn3DM9e/bUolwVAOkqYRi+RHyP8tQSeDvvAuc6567WkZU0mDFjRsE59yfgbKAc7n2faowZ45' +
            'z7P4CFCxdqUa4KgHSl+fPnvwScAfw9xW/jc2BiW1vbNTqikjbOufuA4yntuwPeAU745JNPntQRVwGQhHjrrbd8cRXuuUAa995uA4' +
            '6orKy8Y9asWbrmL2ktAY8YY3YH3i7Bt/cBsEdlZWXD7Nmz9a1fBUAS+AH0f8Bo4PUUveyFwIl9+/a9b9q0aYt0FCXNjDEvEj/Jc1' +
            'oJva03iXf4e2natGka/FUAJMEl4CljzF4pKQFNwEXOuWsee+wxPS9cUq++vj5yzjngHKAUHobzEnCmc07P31ABkDQIw/A1Y8xuxD' +
            't0JdVHwMXOuQk6YlKCRfxx4tt00/zsgAZgTHF9g6gASFp88skns4HTgP9L6Df/i4EpOlJSwiXgKWPMIaTzFsF3gVPy+fwjOpIqAJ' +
            'Iys2fP9s65OuKpyDogSVPsJxljrnPOfaEjJaUsDMOpwC9J1+LcBcaYXzjnnp45c2ZBR1EFQNL7LeQF4tuTkvDsgDxwcmVl5R1hGH' +
            '6poyPl4L333nvVGHMA8HQKXu6/gAPDMKzXkVMBkNIoAXXAb4ozAV3lC+Aq59zl06ZNa9FRkXLx0Ucf+eKWueNI5rqcxSv73wDOcc' +
            '49qKOmAiClVQLeyGQye9E1awI+B651zo3SkZAy/hl8nnhdTtIe4mWI9/Yf65y7RUdKBUBKUGtr64fGmJOAP3fiP7sQuDyTyZyvIy' +
            'AqAa6OeJ+AJN0i+B5wKvAnHSEVAClRM2fO9GEYvmyMObc4E9DRG++0EN8KNaW+vv4zHQERcM69Yoz5Ncm4Q6eZeJOfvzjn2nR0VA' +
            'CkxIVh2AjsD9zRgf9ME7BXRUXF1c65BUpd5L9+Bt82xhwFPNyFL2MecGBxzwJRAZAy+hbysXPu8GIRaM9dAxcCDtjBOffo9OnTtc' +
            'OfyNJLwD+Ib9N9hM6/Tfcd4gV/2uRHBUDKlff+f4F9gPHAjOIAvrL+Doyrqqraprgdqoh8exFvAMYQrwno6HvuF6/2fxeY4Jy7Sk' +
            'eg9FQoAlleDQ0NbcAruVzugiiKngf2BoYDmwM9l/it0VLKZRPxvf1/Lf56wTn3tlIVWaESMDMIgj289zcDP+nAf8pQ3Nu/srLyMS' +
            'VfugWgFahK6Our0iFKnvr6+lbgSeBJa20W2BgYClhgI2C14nn1NvE9/d0Bl8lkHs7n8/nGxsYmpSiycsIw/CiXy/0yiqITiPcL6N' +
            'kB/8xUY8wobfJT0mNYa0Xxm9laCX2BfXT+JP4bSQF4q/jrzsX/3Vrb2xhTFYbhp0pJpN1L+MLBgwdflc1mPwT+BxgM9GqHv3ohcB' +
            '9wThiG7yjpkh7DmjLFAqDwpL2LwRca/EU6zowZM5qMMXcQbxh0B/FK/ZU1D3gU+Jkx5jDn3DtbbrmlUcqlXQAqVABERNIpDMM8MB' +
            'WYaq2dSLwuYATwA6A/0Bvo8ZU/1kq8RqcxoZUrAAALJ0lEQVQCeL7456cDjzjn/r3fxyuvvOKVsAqAwhMRSTjn3PtBENzuvX/0/7' +
            'd3/6F2l3UAx9/n3utko82EqfNrKJWoodTokQqduqaoQZpCkJqpUPiHSY4yjUBSRIJpkhL7Q/EPp/kDxB+kUKKbGguVfXKZlXekMa' +
            'N9nQnSXTnd1tYf38e1H3fb3d05936fc94vOLDBuec8z/N9Dp/P9/k+P4Bjgc8DhwHDOdjPyK9NwJ87nc6Kbdu2/Sci1tp6JgA2ni' +
            'SVPSLwIc0pfX8HVgCklEaA2Z1Oh1WrVrnLpjGsmATgGPuPJB3QyMAWwMBvDNstAWj7JMDj7D+SpEK1OYa1fxVASmmefUiSVJIcu1' +
            'q/DLDth684CiBJ8u6/u8aGaPZ6brPj7UeSpMK0PXa9NUR3T3frhRPtR5KkwrQ9do0OAWtaXsiF9iNJUmHaHrvWdABSSv+ivZMVtg' +
            'GHR8S79idJUtullOYC79CcqthGYxFxyEdHtrZ5FKADLLJLSZIKsajFwX97zP8oARgtoDElSSolAWiz0ZISgDPtT5KkQrQ9Zu2UAL' +
            'R9IuCxKaX59ilJUpvlWHVsy4tZ1CMAgMvsWpIkY1V3RwBGgc0tL/Al+VQrSZLaePc/AlzS8mJu3ikBiIiNwEstL/QRwNl2MUlSS5' +
            '2dY1WbvZRj/vYRAIDlBTSujwEkScaoydse60tLAC5MKR1lH5MktUmOTReWmgC8CGxsecFnANfa1SRJLXNtjlFttjHH+p0TgIj4EF' +
            'hZQCNfmbdZlCSpDXf/c4ErCyjqyhzrdxsB2GlooMVmAYvtcpKkllicY1Pb7RTjd00AVhTS2FenlObY5yRJ03z3Pwe4upDirthbAr' +
            'AK2FBAJQ4BbrDrSZKm2Q05JrXdhhzjx08AImJLQaMAi1NKJ9n3JEnTdPd/EuU8kl6RY/weRwAAHiykMiPA0pRSx24oSZri4N8Blu' +
            'ZYVILdYvt4CcATwFghFToNuNyuKEmaYpfnGFSCsRzb954A5C0CHynoIixxWaAkaQrv/ucCSwoq8iMfbf+7rxEAgGUFVewwYJmPAi' +
            'RJUxD8OzlGHlZQsceN6XtKAF4A1hZUua8A19s1JUk9dn2OOaVYm2P6xBKAiNgG3F/YRbk5pbTAvilJ6tHd/wLg5sKKfX+O6RMeAQ' +
            'C4r7BKjgAPOh9AktSD4D+XZib9SGFF32Ms32MCEBGjwMuFVfQTwGMppZl2V0lSl4L/TOCxHGNK8nKO5fuXAGT3FHitFgAPp5RG7L' +
            'aSpAMM/iPAwzm2lGavMXxfCcC9wLoCK30ecLcrAyRJBxD8O8DdOaaUZl2O4ZNLAPKxgbcWeu2uoKx1mpKkdlmSY0mJbt3x6N/x7P' +
            'MOOaU0C/gbcHihjXAbcN2eZkFKkjTOnf8S4NpCq/AO8MmIeH9vbxre16fUdb25qqph4KxCG+IU4Jiqqp6q63qrXVuStJfgP0Lz7P' +
            'yqgqtxc0Q8t683DU3ww5YC7xXcGFcAj7o6QJK0l+A/E3iUcof9ybF66UTeOKEEICI2AHcUfm3PA552nwBJ0jjBfy7wNGVO+NvRHT' +
            'lmdycByO4ENhTeMAuAV9wxUJK0Q/BfALxCmUv9drQhx+oJGZ7oG+u6/qCqqtmUc/zhnswBLquqanNVVSvrurb3S9JgBv5OVVU/ol' +
            'ku9/E+qNLtEfHURN88tJ8f/lPK3BdgVyO5Lk/5SECSBjL4zwWeyrGgHzaOW5frMmGdSTTaRTT7IfeLfwLXAfe6VFCS+v+uH7icZp' +
            'nfYX1UtYsj4qGeJgC5AZ8BzuyzfvFb4KqIeM2fiCT1ZfA/iWaG/Gl9VrVnI2K/l+pPNgE4AfgDMKPPGnEL8HOaNZRj/lwkqS8C/x' +
            'zgBmAx/THcv6NNwOci4vX9/cPhyXxbXdfvVlU1qw+zqCGajYOuqqrqY1VVvVrX9fv+fCSpyMA/t6qqH9M8tl7E/s97K8GSiHh4Mn' +
            '/YOYCGnQX8BTi6j/vP+8BdwG0R8Q9/TpJUROA/imYb3yuBWX1c1beAz+xry9+uJwC5kS+gOSO5323K9VwGPB0RW/yJSVKrgv4IcD' +
            'ZwGXAh/feIejwXRsTjk/3jThca/VfAVweon60HHgCWRcRqf3aSNK2Bf34O+pcARwxQ1Z+MiAPatbAbCcDhwGrgyAHse38FngWWA8' +
            'sj4l1/jpLU04A/l+Z5/iKa1WjHDmAz1MD8iHhnWhOAfEEW5kA4NMD9chvwKvAc8CdgFFgTEW/7k5WkScWWecBxwPHAicBC4LPdil' +
            '2F2gqcOZHT/qYkAcgX6ifAjXbZ3YwBa4C1+d+7vjbZRJIG1Aya7dl3fR2TA/8cm2g3N0bETd34oG6uh7wZOJ1mWEb/Nwc4Ob8kSZ' +
            'qs5TnWdkVXh1HycM1qBmsihiRJvbae5rl/1x4rd/WZfS7YpTTPKCRJ0oHbClza7Tllw90uZV3Xb1ZVdRDN4wBJknRgbomIe7r9ob' +
            '2atX8jg7FBkCRJvfQYPZpg37OlFCmlg4HfAGd4/SRJ2m/PA+dExIdFJQA5CZiTKzDf6yhJ0oStBs7o5cm0Pd9MIaV0BLAS+LTXU5' +
            'KkfXoDODUi1vfyS6ZkN6WU0qeA3+HyQEmS9mY9cEpEvNnrL5qSrXtzRc6l2flOkiTtbgw4dyqC/5QlADkJWA2cD3zgNZYkaScfAO' +
            'dP5SmzU3p4T0Q870iAJEnj3vk/P5VfOi0nKuXzm3+NcwIkSYNtfQ7+q6f6i6ftSMU8MfBpXB0gSRpMbwBnT9Uz/10NTVetc4VPpV' +
            'nrKEnSIFlNs9TvzekqwNB01j6vcTyDZrMgSZIGwfM0m/ysn85CDE13K+Rdjs7BswMkSf3vMZrtfad9MvxwG1qjruv/VlX1SE5IFj' +
            'CNcxMkSeqBrcAtwHcjYnMbCtS6QJtSOgu4H1cISJL6w3rg0oh4pk2FauWddkppHvBLYJH9RpJUsOXANyPi7bYVbLiNrVXX9b+rqr' +
            'of2Aacjo8EJEll2QrcBHwnIja0sYCtD6wppYXAA8CR9idJUgFq4JKIeK7NhRxqeyvmBpwPPGmfkiS13JPA/LYH/yJGAHYZDbgAuA' +
            'M42j4mSWqRt4BrIuLxUgo8XFLr1nX9elVVd9GMXHyxtPJLkvrOJmAJ8I2I+GNJBS92cl1K6QTgF8CZ9j9J0jR4Frg6Il4vsfDFz6' +
            '5PKV0E/Ayo7IuSpCmwDvhBRDxUciWKH0Kv6/q1qqruzv+dDxxs35Qk9cAG4Hbgooj4femV6av19SmlQ4HvAdcAh9pXJUld8B7NBP' +
            'Q7I+K9fqlUX26wk1KaDVwFfB843L4rSZqEd/Id/9K2buZjArDnRGAWcCXwQ5wjIEmamHXArcBdEfF+v1ZyILbYTSkdDFwOfBv4gn' +
            '1bkjSOl4F7gHsj4sN+r+zA7bGfUjoe+BZwKXCM/V2SBtpamhNo74uI0UGq+MAespNS6tAcNHQZ8HVgjr8DSRoIY8AjwDLghYjYNo' +
            'iN4Cl7TTIwE/gacDHwZWC2rSJJfWUDsAJ4EHgiIjYOeoOYAOyeDIwAJ+dEYBFwKjDTlpGkomwEVgLLc+BfFRFbbBYTgP1JCA4Gvp' +
            'STgUU0ZxAcZMtIUqtsBl7KAX858OIgTOQzAZjahGAmcHx+HbfLv51HIEm9NQasAUbza/u/HdY3AZjO5GDeDknB0TkhmL2P1wxbTt' +
            'KA2kTzbH5vrzGao3ZHgTUR8bbNJkmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJE' +
            'mSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJEmSJElSW/wPnfnROg5fDewAAAAASUVORK5CYII='
        );

        Y.dcforms.assets.checkboxfalse = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIeCAYAAADNpLcRAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/w' +
            'D/oL2nkwAAAAlwSFlzAAEQkAABEJABiazSuAAAAAd0SU1FB94FEw8FMUlZE7wAABmGSURBVHja7d19rGV1fe/xzzkM0JnbGUsy8r' +
            'BtIK1mhkZTp/mZagQdHAza1CdaE4Ei9MaWPyhRUoXeNpd78XJ7myIaNIY/MCYFETQhxQdMcSoDKBg1/q6jxZSZqA2kshmYhHjmBn' +
            'SYztw/9oIOwzycObPPOeu39+uVnGRI5mGttX+b73uvvfbaM2FsSimnJlmXZH2S05OsSbL6CD8nOHLAlNqdZNcRfuaSPJZkW5Lttd' +
            'YnHLbxmHEIjnrIr+wG/Pr9hv3zv17jCAEsqrkk27sg2Lb/r2utzzo8AmCcA//EJG9Isqn7eX2S4x0ZgF55Lsl3k2zpfr5Ta/2Vwy' +
            'IAjmbgr0jyuiRv6Qb+WUlWOjIATXk2yUNdDNyX5Pu11j0OiwA4cOivTPLuJBd2g3+1owIwUXZ1IXBHki97u2CKA6CUMpPkzUkuSf' +
            'LeeP8eYFrMJbkzya1Jvllr3ScApmPwr0/y/iQXJznD8wBgqj2a5LYkn6u1bhMAkzf0T0xyaZIPJPl96x2Ag/heks8muWUaLiCc6A' +
            'AopaxKclmSq5IMrG0A5uHxJB9LcnOt9RkB0NbgX53k8iR/meRkaxmABXgyySeS3FRr3SUA+j34T0rywSQfSnKStQvAGDyd5JNJPl' +
            'VrfVoA9O8V/18nuSI+wgfA4tiV5NNJ/m4Szgg0HwCllAuSfDze4wdgaTye5MO11i8IgOUZ/Gd2JXautQjAMrg3yRW11kcEwNIM/l' +
            'VJ/nuSD8c36QGwvHZndBb6f7f2iYGmAqCU8p6MLsQ43ZoDoEceS/KhWuuXBMB4B//JGd2c4R3WGAA9dneSD9RanxQAxz78z0lye5' +
            'LTrCsAGjBMclGt9X4BsLDBP5vkmiT/I8ms9QRAQ/Ym+V9Jrqu17hUA8x/+pyb5fJJN1hAADduS5E9qrU/0bcN698q6lPLWJFsNfw' +
            'AmwKYkW7vZ5gzAIQb/cUmuTfI3ccofgMmyN8n/SXJtrfU/BMB/Dv8Tk9yR5HxrBIAJdleSC/vwdcPLHgCllDVJvpJko3UBwBR4IM' +
            'm7aq1zUxsApZRTktyTZIP1AMAU2Zrk7bXWHVMXAKWU306yOckrrQMAptBPk5xXa/3Zcvzjy3KxXSllQ5JvG/4ATLFXJvl2NxMnPw' +
            'BKKRszev/jFI89AFPulCQPdLNxSS3pWwDdDt6T5Nc85gDwgl9mdE3AAxMXAN0pjgeSrPE4A8BLzCXZWGvdOjEB0F3w9+047Q8Ah7' +
            'MjyRuX4sLARb8GoPuo32bDHwCO6JQkm7vZ2W4AdDf5uSeu9geA+Xplknu6GdpeAHS39/1K3OQHAI7WhiRf6WZpOwHQfbHPHXF7Xw' +
            'BYqI1J7uhmajNnAK6NL/YBgGN1fjdTx27snwLovvP46/GVvgAwDnuTvK3W+o3eBkAp5dSMvuDAFf8AMD47kmyotT4xrr9wbK/SSy' +
            'mzST5v+APA2J2S5PPdrB2LFWPcuGuSbPIYvcRcku1JHu1+feDPbocImFInZHR32AN/zkiyLu4ce6BN3az96Dj+srG8BVBKOSfJvZ' +
            'nu9/33JflRkvuT/DjJtiTbx3m6BmCadG8rr0uyPsmrk5yT5HezjF9l3wN7k5xba71/2QOglHJyRu/7nzaFD8RPuvDZkmRLrXWnpy' +
            'zAokbB2u6V8KYk5yZ51RQehmFG1wM8udwB8NUk75iiA78jye1Jbl2qL2wA4JAzaEOSS5JclOm6Bu3uWus7ly0ASinvSXLXFBzo3d' +
            '1+3ppkc611j6cdQK9CYEWS87oYOD+j6wsm3fm11i8teQCUUlYl+dckp0/wwX0myc1Jbqi1/txTDKCJGHhFko8kuSzJqgne1ceS/E' +
            '6t9ZmF/OEF315wMBh8NJN76v8XST6e5IJa613D4XCXpxRAG4bD4a7hcPj1wWBwc5Lnkrw2ya9N4K6+LMnscDi8d8nOAJRSzkzyw0' +
            'zeKZY9SW5Mcl2tdc7TCGAizgisyejjc1dmvB9/74PdSV5ba31kqQLgGxldfTlJvpXk8lrrw54uABMZAq9JclOSN03Yrt1ba33r0f' +
            '6h2QUcwAsmbPg/leS/Jtlo+ANMru7/8Ru7/+c/NUG7dm43mxfvDEApZXWSR5IMJuSg/VOSS3x+H2DqzgaszeiTXX8wIbv0eJIza6' +
            '3zvmbtaM8A/PWEDP893b78oeEPMJVnA3Ym+cNuFkzCR7sH3b6M/wxAKeWkjO5nv7rxg/TvSS6stT7oKQBAKeXsJHck+c3Gd2VXkj' +
            'NqrU+P+wzABydg+D+Y5PcMfwD2OxvwYJLf62ZEy1Z3s3p8ZwC69/4fTXJSwwfmq0neV2t91nIH4CCzbmWSLyZ5Z8O78XR3FuCI1w' +
            'LM9wzA5Y0P/39I8keGPwCHORPwbJI/6mZGq07qZvaxnwHobvn7b0lObvRg3JDk6lrrPssbgHnMvZkk12d0O+EWPZnkt450i+Aj3g' +
            'p4MBj8RZI/bnX411qvGg6HVjQA8zIcDjMcDv95MBj8epI3NrgL/yXJzuFw+J3D/abZI1TQiUmuavQx/IckV1vKACzQ1Wn37YCruh' +
            'm+sABIcmna/Nz/V5P8udP+ACxUN0P+vJsprRl0M3zBAfCBBnf6wYyu9t9j+QJwjBGwJ8n70uZHBA87ww95EWApZX1Gt/1tyb9n9D' +
            'l/d/cDYGy6Wwf/IO3dLOjMWuu2oz0D8P7GdnJPRnf4M/wBGPeZgJ1JLkx7tw0+5CyfPUTpzCS5uLGdvMYd/gBYxAh4MMk1jW32xd' +
            '1Mn/cZgDcnOaOhHfynJH9veQKwyP6+mzmtOKOb6fMOgEsa2rmnMvpKX1f8A7DYZwH2dTPyqYY2+5J5BUB3L+T3NrRjV3vfH4AljI' +
            'Cdaes+M+/tZvsRzwC8O8maRnbqW0lusRwBWGK3dDOoBWu62X7EALiwkR3ak+Ryp/4BWIazAPsy+tKdVj4VcOFhA6CUsiLJWxrZmR' +
            'trrQ9bhgAsUwQ8nOTGRjb3Ld2MP+QZgNclWd3AjvwiyXWWHwDL7LpuJvXd6m7GHzIAWnn1/+la65x1B8AynwWYS/LpVs4CHC4ANj' +
            'WwA8+knVMuAEy+G7vZ1HebDhoA3dcGntXADtzsY38A9OgswM4kNzewqWft/xXB+58BeEOSlT3f+N1JbrDcAOiZG7oZ1Wcru1n/kg' +
            'Bo4fT/XbXWn1tnAPTsLMDPk9zVwKZuajUAbrXMADCjxhQA3S0CX9/zjd6RZLP1BUBPbe5mVZ+9/vnbAj9/BmB9kuN7vtG311r3WF' +
            '8A9FE3o27v+WYe3838FwVA3zn9D4BZdexeFADrer6xP6m1brWuAOj5WYCtSX7S881c19IZgHstKwAa0feZ1dRbAFusJwAa0feZ1c' +
            'xbAPsEAACNBUCfv6p+XZLMlFJOTTLs8Yb+sNa6wXoCoBWllK1JXtvjTTxtNv2/APB+SwmAxvR9dq2bTf/f//+xdQRAY/o+u9bPJj' +
            'm95xu5zToCoDF9n12nzyZZ0/ON3G4dAdCYvs+uNbNJVvd4A+dqrU9YRwC0pJtdcz3exNV9DwCv/gFwFmAKA+BR6weARvV5hvU+AO' +
            'asHwAa5S0AAQCAABAAAgAAASAABAAAAkAACAAABMCSBMAJPd7A3dYPAI3q8ww7YdbjAwDTRwAAgAAAAAQAACAAAAABAAAIAABAAA' +
            'AAAgAAEAAAgAAAAAQAACAAAAABAAAIAABAAAAAAgAAEAAAgAAAAAEAAAgAAEAAAAACAAAQAACAAAAABAAAIAAAAAEAAAgAAEAAAA' +
            'ACAAAQAACAAAAABAAAIAAAAAEAAAIAABAAAIAAAAAEAAAgAAAAAQAACAAAQAAAAAIAABAAAIAAAAAEAAAgAAAAAQAACAAAQAAAAA' +
            'IAAAQAACAAAAABAAAIAABAAAAAAgAAEAAAgAAAAAQAACAAAAABAAAIAABAAAAAAgAAEAAAgAAAAAQAAAgAAEAAAAACAAAQAACAAA' +
            'AABAAAIAAAAAEAAAgAAEAAAAACAAAQAACAAAAABAAAIAAAAAEAAAgAAEAAAIAAAAAEAAAgAAAAAQAACAAAQAAAAAIAABAAAIAAAA' +
            'AEAAAgAAAAAQAACAAAQAAAAAIAABAAAIAAAAABAAAIAABAAAAAAgAAEAAAgAAAAAQAACAAAAABAAAIAABAAAAAAgAAEAAAgAAAAA' +
            'QAACAAAAABAAACAAAQAACAAAAABAAAIAAAAAEAAAgAAEAAAAACAAAQAACAAAAABAAAIAAAAAEAAAgAAEAAAAACAAAEAAAgAAAAAQ' +
            'AACAAAQAAAAAIAABAAAIAAAAAEAAAgAAAAAQAACAAAQAAAAAIAABAAAIAAAAAEAAAIAABAAAAAAgAAEAAAgAAAAAQAACAAAAABAA' +
            'AIAABAAAAAAgAAEAAAgAAAAAQAACAAAAABAAAIAABAAACAAAAABAAAIAAAAAEAAAgAAEAAAAACAAAQAACAAAAABAAAIAAAAAEAAA' +
            'gAAEAAAAACAAAQAACAAAAAAQAACAAAQAAAAAIAABAAAIAAAAAEAAAgAAAAAQAACAAAQAAAAAIAABAAAIAAAAAEAAAgAAAAAQAAAg' +
            'AAEAAAgAAAAAQAACAAAAABAAAIAABAAAAAAgAAEAAAgAAAAAQAACAAAAABAAAIAABAAAAAAgAABAAAIAAAAAEAAAgAAEAAAAACAA' +
            'AQAACAAAAABAAAIAAAAAEAAAgAAEAAAAACAAAQAACAAAAABAAACAAAQAAAAAIAABAAAIAAAAAEAAAgAAAAAQAACAAAQAAAAAIAAB' +
            'AAAIAAAAAEAAAgAAAAAQAACAAAQAAAgAAAAAQAACAAAAABAAAIAABAAAAAAgAAEAAAgAAAAAQAACAAAAABAAAIAABAAAAAAgAAEA' +
            'AAgAAAAAEAAAgAAEAAAAACAAAQAACAAAAABAAAIAAAAAEAAAgAAEAAAAACAAAQAACAAAAABAAAIAAAAAEAAAIAABAAAIAAAAAEAA' +
            'AgAAAAAQAACAAAQAAAAAIAABAAAIAAAAAEAAAgAAAAAQAACAAAQAAAAAIAAAQAACAAAAABAAAIAABAAAAAAgAAEAAAgAAAAPoSAL' +
            't7vH0neIgAaFSfZ9ju2SS7eryBa6wfABrV5xm2SwAAgABw8ABAADh4ACAAHDwAEABL4QzrB4BG9XmG9T4A1lk/ADSqzzOs/28BlF' +
            'JOtYYAaEk3u3r/FsCcggKAqZpdc7NJHuv5Rq63jgBoTN9n12OzSbb1fCNfbR0B0Ji+z65ts0m293wjz7GOAGhM32fX9pkkKaX8Iv' +
            '29WGFfkpNrrTutJwD6rpSyNsmTSWZ6uolztdaXPf91wH0+CzCTZJMlBUAjNvV4+L8w858PgG0NHEwAaCUA+mxbSwFwrvUEQCP6Pr' +
            'NeFAB9vxDwVaWUDdYUAH3WzapX9Xwzm3oLIEkusbQAMKvGewZgW5Lner7BF5VSVlhbAPT01f+KJBf1fDOfe1EA1FqfTfLdnm/0KU' +
            'nOs8QA6KnzulnVZ9/tZv4LZwCSZEsDB9fbAACYUQv3wqxvLQDOL6W8whoDoE+62XR+qwHwnSTP9nzDT0jyEUsNgJ75SDej+uzZbt' +
            'a/OABqrb9K8lADB/my7jaLANCHV/9rk1zWwKY+1M36l5wBeNGpgR5bleRKSw6Anriym01996IZf2AA3NfIwb6ilLLGmgNgmV/9r0' +
            'lyRSObe9/hAuD7SXY1sBMvS3KNpQfAMrumm0l9t6ub8QcPgFrrnobOAlxZSnmNtQfAMr36f03aeUv6vm7GH/IMQJLc0cjOrEhyUy' +
            'llxjIEYImH/0ySm7pZ1IKXzPaDBcCXk8w1skNvSnKppQjAEru0m0EtmOtm++EDoLtF4J0NPQjX+1ggAEv46n9tkusb2uQ7n7/975' +
            'HOACTJrQ3t2MuT3OqtAACWYPjPdDPy5Q1t9kFn+qEC4JtJHm1o5/4gyV9ZmgAssr/qZk4rHu1m+vwCoNa6L8ltjT0o15VSzrY2AV' +
            'ikV/9nJ7musc2+rZvp8z4DkCSfa2wnVyS5w/UAACzC8F+b0ZX0Kxrb9EPO8kMGQK11W5LvNbajv5nkrlLKSssVgDEN/5VJ7upmTE' +
            'u+183yowuAzmcbfKzOTvLFUsoKyxaAYxz+K5J8sZstrTnsDD9SANyS5PEGd/qdST7jkwEAHMPwn0nymW6mtObxboYvLAC6rw38WK' +
            'OP3Z+mrc9pAtAv13ezpEUf2/+rfw/miK+QSymrkvxbkpMbPQg3JLn6UFdBAsBBXvlfn+Qjje7Ck0l+q9b6zOF+03FH+luGw+Fzg8' +
            'HguCRvbfRAvDHJGYPB4GvD4XCvpQ3AYYb/iozeO7+84d24rtZ6/5F+0+w8/7Kbkjzd8MH40yT/6NMBABxm+K9M8o9p97R/ull903' +
            'x+47wCoNa6K8knG39s35lks/sEAHCQ4b82yea0ecHf/j7ZzezxBEDnU0l2NX5gzk7yA3cMBGC/4X92kh+kzY/67W9XN6vn5bj5/s' +
            'bhcPjLwWCwOu18/eGhrElyyWAweG4wGDw0HA6tfoDpHPwzg8Hgv2X0cbnfmIBd+kSt9Wvz/c2zR/mX/13avC/AgVZ0+/I1bwkATO' +
            'XwX5vka90smIQbxz3e7cu8zSzgoF2Q0f2QJ8VTSa5OcouPCgJM/qv+JJdm9DG/l0/Qrl1Ya/3CogZAdwC/keTcCVsX30pyea31YU' +
            '8RgIkc/q/J6Ar5N03Yrt1baz3qj+ovNADOTPLDJCdM2EHck+TGjD5DOefpAjARg39NkmuSXJnJON2/v91JXltrfeRo/+BxC/nXhs' +
            'PhzsFgsGoCK2o2oxsHXT4YDH59MBj8aDgcPuPpA9Dk4F87GAz+JqO3rTfl6K97a8H1tdYvLuQPzhzDgV2V5F+TnD7B6+eZJDcnua' +
            'HW+nNPJ4AmBv8rMrqN72VJVk3wrj6W5HeOdMvfsQdAd5Dfk9F3JE+63d1+3ppkc611j6cYQK+G/ook5yW5JMn5mby3qA/m/Frrlx' +
            'b6h2fGcNC/muQdU7TOdiS5PcmttdatnnYAyzr4N3RD/6Ikp0zRrt9daz2muxaOIwBOTrI1yWlTuPZ+kuTeJFuSbKm17vR0BFjUgb' +
            '82o/fzN2X0abRXTeFhGCbZUGt9clkDoHtAzukG4ewUr8t9SX6U5P4kP06yLcn2WusTnrIAC5otpyZZl2R9klcnOSfJ745rdjVqb5' +
            'Jz5/Ntf0sSAN0D9T+TXGvJvsRcku1JHu1+feDPbocImFInZHR79gN/zugG/xqH6CWurbV+dBx/0Tg/D3ldkjdndFqG/7Qmyeu6Hw' +
            'BYqC3drB2LsZ5G6U7XbM10XYgBAIttR0bv+4/tbeWxvmffbdjFGb1HAQAcu71JLh73NWXHjXsrh8PhzwaDwfEZvR0AABybv621fn' +
            'bcf+liXbV/babjBkEAsJjuyiJdYL9oH6UopZyY5OtJNnr8AOCoPZDkbbXWXzUVAF0ErOl2YIPHEQDmbWuSjYv5zbSLfjOFUsopSR' +
            '5K8kqPJwAc0U+TnFVr3bGY/8iS3E2plPLbSb4dHw8EgMPZkeSNtdafLfY/tCS37u125O0Z3fkOAHipuSRvX4rhv2QB0EXA1iTvSv' +
            'JLjzEAvMgvk7xrKb9ldkm/vKfW+oAzAQBw0Ff+DyzlP7os36jUfX/zPXFNAADTbUc3/Lcu9T+8bF+p2F0YuDk+HQDAdPppkvOW6j' +
            '3/A80u1153O3xWRp91BIBpsjWjj/r9bLk2YHY59777jOPGjG4WBADT4IGMbvKzYzk3Yna5j0J3l6O3xXcHADD57sro9r7LfjH8cX' +
            '04GsPh8D8Gg8GdXZCcnWW8NgEAFsHeJH+b5C9qrc/1YYN6N2hLKW9Nclt8QgCAybAjycW11m/0aaN6+Uq7lHJqks8n2WTdANCwLU' +
            'n+pNb6RN827Lg+Hq3hcPj/BoPBbUn2JXlzvCUAQFv2Jvlokj+rte7q4wb2frCWUs5JcnuS06wnABowTHJRrfX+Pm/kbN+PYncANy' +
            'S525oCoOfuTrKh78O/iTMAB5wNeE+STyY53RoDoEceS/KhWuuXWtng41o6usPh8JHBYHBzRmcuXt/a9gMwcXYnuT7J+2qt/9LShj' +
            'd7cV0p5cwkn05yrvUHwDK4N8kVtdZHWtz45q+uL6VckOTjSQbWIgBL4PEkH661fqHlnWj+FPpwOHx4MBh8pvvPDUlOtDYBWAS7kn' +
            'wiyQW11v/b+s5M1OfrSyknJflgkg8lOclaBWAMns7oAvRP1VqfnpSdmsgb7JRSVie5PMlfJjnZ2gVgAZ7sXvHf1Neb+QiAQ4fAqi' +
            'SXJbkqrhEAYH4eT/KxJDfXWp+Z1J2cilvsllJOTHJpkg8k+X1rG4CD+F6Szya5pdb6q0nf2am7x34pZX2S9ye5OMkZ1jvAVHs0o2' +
            '+g/Vytdds07fjUfslOKWUmoy8auiTJe5Os8TwAmApzSe5McmuSb9Za903jQfAte6MYWJnk3UkuTPKWJKsdFYCJsivJfUnuSPLlWu' +
            'uz035ABMBLY2BFktd1IbApyVlJVjoyAE15NslDSbZ0g//7tdY9DosAOJogODHJG7oY2JTRdxAc78gA9MpzSb7bDfwtSb4zDRfyCY' +
            'ClDYKVSdZ3P+sO+LXrCAAW11yS7Um2dT8v/NppfQGwnHFw6n5RcHoXBKuP8HOCIwdMqd0ZvTd/uJ+5jL5qd1uS7bXWJxw2AAAAAA' +
            'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADoi/8P12ZfQ5SdW5AAAAAASUVORK' +
            '5CYII='
        );

        Y.dcforms.assets.checkboxfalsetrans = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAABmJLR0QA/w' +
            'D/AP+gvaeTAAAACXBIWXMAAA3XAAAN1wFCKJt4AAAAB3RJTUUH3QQGCgkgVaRCGgAAAF9JREFUKM9jYB' +
            'iegB+Nb4/GZyTGkM9YxJgYGBj+E9J4mYGB4SGRlsDBFShGNuTKMIiKKzj8h00NAwMDwyd8kleICLxjyC' +
            'FITEhCNTPC1MRhs+0yEQkoGlvyw+dvbC4DAIADGlaXlcTzAAAAAElFTkSuQmCC'
        );

        Y.dcforms.assets.checkboxtruesolid = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/w' +
            'D/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wYYDCoNLZHHewAAABl0RVh0Q29tbW' +
            'VudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAACrSURBVHja7dwxEQAwDAMxp/w5uyh6zaCHEJ3XTJJGaz' +
            'pOAERAgAgIEAEBIiBABERAgAgIEAEBIiBABERAgAgIEAEBIiBABERAgAgIEAEBIiBABERAgAgIEAEBIi' +
            'BABERAgAgIEAEBotdN6ymphQgIEAEBIiBABASIgAgIEAEBIiBABASIgAgIEAEBIiBABASIgAgIEAEBIi' +
            'BABASIgAgIEAEBIiBABASIvnYB7TIEwxC4tYkAAAAASUVORK5CYII='
        );

        Y.dcforms.assets.checkboxtruetrans = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAD8GlDQ1BJQ0' +
            'MgUHJvZmlsZQAAOMuNVd1v21QUP4lvXKQWP6Cxjg4Vi69VU1u5GxqtxgZJk6XpQhq5zdgqpMl1bhpT1z' +
            'a2021Vn/YCbwz4A4CyBx6QeEIaDMT2su0BtElTQRXVJKQ9dNpAaJP2gqpwrq9Tu13GuJGvfznndz7v0T' +
            'VAx1ea45hJGWDe8l01n5GPn5iWO1YhCc9BJ/RAp6Z7TrpcLgIuxoVH1sNfIcHeNwfa6/9zdVappwMknk' +
            'JsVz19HvFpgJSpO64PIN5G+fAp30Hc8TziHS4miFhheJbjLMMzHB8POFPqKGKWi6TXtSriJcT9MzH5bA' +
            'zzHIK1I08t6hq6zHpRdu2aYdJYuk9Q/881bzZa8Xrx6fLmJo/iu4/VXnfH1BB/rmu5ScQvI77m+Bkmfx' +
            'XxvcZcJY14L0DymZp7pML5yTcW61PvIN6JuGr4halQvmjNlCa4bXJ5zj6qhpxrujeKPYMXEd+q00KR5y' +
            'NAlWZzrF+Ie+uNsdC/MO4tTOZafhbroyXuR3Df08bLiHsQf+ja6gTPWVimZl7l/oUrjl8OcxDWLbNU5D' +
            '6JRL2gxkDu16fGuC054OMhclsyXTOOFEL+kmMGs4i5kfNuQ62EnBuam8tzP+Q+tSqhz9SuqpZlvR1EfB' +
            'iOJTSgYMMM7jpYsAEyqJCHDL4dcFFTAwNMlFDUUpQYiadhDmXteeWAw3HEmA2s15k1RmnP4RHuhBybdB' +
            'OF7MfnICmSQ2SYjIBM3iRvkcMki9IRcnDTthyLz2Ld2fTzPjTQK+Mdg8y5nkZfFO+se9LQr3/09xZr+5' +
            'GcaSufeAfAww60mAPx+q8u/bAr8rFCLrx7s+vqEkw8qb+p26n11Aruq6m1iJH6PbWGv1VIY25mkNE8Pk' +
            'aQhxfLIF7DZXx80HD/A3l2jLclYs061xNpWCfoB6WHJTjbH0mV35Q/lRXlC+W8cndbl9t2SfhU+Fb4Uf' +
            'hO+F74GWThknBZ+Em4InwjXIyd1ePnY/Psg3pb1TJNu15TMKWMtFt6ScpKL0ivSMXIn9QtDUlj0h7U7N' +
            '48t3i8eC0GnMC91dX2sTivgloDTgUVeEGHLTizbf5Da9JLhkhh29QOs1luMcScmBXTIIt7xRFxSBxnuJ' +
            'WfuAd1I7jntkyd/pgKaIwVr3MgmDo2q8x6IdB5QH162mcX7ajtnHGN2bov71OU1+U0fqqoXLD0wX5ZM0' +
            '05UHmySz3qLtDqILDvIL+iH6jB9y2x83ok898GOPQX3lk3Itl0A+BrD6D7tUjWh3fis58BXDigN9yF8M' +
            '5PJH4B8Gr79/F/XRm8m241mw/wvur4BGDj42bzn+Vmc+NL9L8GcMn8F1kAcXi1s/XUAAAABmJLR0QA/w' +
            'D/AP+gvaeTAAAACXBIWXMAABcSAAAXEgFnn9JSAAAAB3RJTUUH3QQGChw34cIhyQAAAORJREFUKM+N07' +
            '9KgzEUhvGf6CAKDkovQEQoWFEHxU1BQah6BUJdvEwHF1EoOIjgondQKKWj1s8lgTQmtQcOIefJy5uTP4' +
            'umo4stfPgbl9jEZ4E5RhPyINQWwniUsMNcuJfAmDszWCcK20nxJ2SDAa4wLLAJtqGFl1D8TmDqNMl4Hx' +
            'vRfQ3vicOs8Q2red+tANKFTTZ/xbpKdMKir0wc5+2acAnP/zg/Jtc3Ff05e35KRSt4yLZXO+3I77EM+5' +
            'V7HuEO4wJrsBvdzwuv6CSwswI7zXu+TuBF4VNE1q2deA83FXabs19zun+W8UBXUwAAAABJRU5ErkJggg' +
            '=='
        );

        Y.dcforms.assets.checkboxcross = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWX' +
            'MAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wMQAy8cPF7zbgAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAiUSU' +
            'RBVHja7d1Lk5RXGcDxf3Myk5Ag5AIMMMMQ5KJoeVm6VReurNIK0coFNGi+QCy/hIssknJhwcSYTQyJSbxU6daNblQ0MSSuYggww8' +
            'yQTAADDNDt4n1OcurQPX3Oc97Lme73VPUKuunqXz/X7n4B6PW5dYEV4BXga0CH9qScDnAI+BnwLnBzwOveY40/6ALLwAngSy1KEs' +
            'YXgaeB/w7BWBOkB9wCzgHPCMqG9vWNxviCg3FjyOs9FKQnomcE5cstihrjZsBrHQTSD6VNX+EY70ZgdENBXJRnga+0kRJUM2Iwes' +
            'AVgI+VKG36Ki9NdYH/AX82wLeA7cAdAaloA7AJmAbuAc4CSzb3tRgcAn4EPATMACbgfj0Jir8DvzDANWAXsA2YUKIsthh8HvixYE' +
            'zLGzwG4zjwByMp6DIwlYByboxRLMYxwditxPgdcMkA1yXfXQF2JKKMW/rqAJ+TNHVYMIwWA+fOq4JyGdipQJkZw/RlMY4BD5eBgf' +
            'cALsoOKfShKPeMWaS4kfGwvCFj09QJ4PcuBn1EV4H3ElE2OTWlN+KRcRiYVWL81sdgQIjZSLmkRJkRlLMjiOJjxBTwq4PS1DAQN1' +
            'IuSU3RRMpnRgylXwGPxZgbFBnDQFyUK4npaxRQXIyHItNUMMYwEL+mTI0pip0ztJHxD6dmfDTsTiFtmpu+xi1S3KFPi3E8FCMUZF' +
            'xRUoa+q8Ap4LkYjBgQH2VKbqOK0gEOKOcMi3ECeJ3iuwlUATIuKD5GSs1Yif3HjeIJW5QVp9BPjsjw2AEOOmlqVonxekyaSgWB4s' +
            'P6M06kaFA2C8qFTFAsht1NzSrS1FxszSgLxKK8l4CyS4bHHFDcNHVYiaGqGWWCpKJsyiR9+TWj9jRVJoiL8pHTEoegdIC7nd1XEy' +
            'ipNeNUmRhlgbg1JRZlg6DY3df5GlHKqBmlYpQJUlahr6um+Bi70RXwUjHKBnFRVhSRUhdK6pxRWgGvA8TOKdr0VTVKB9ifUMDdyF' +
            'ipInRNRSlBW1M6Fc4pFsOmqT1KjNeqwqgSJKWmdLxCXwZKB9jnREYsxj/rwKgaJKUlLnOitxjHgO8pMY5XmabqBPHTV2qkxLbEqR' +
            'iV14wmQPpN9FOKSNkSiVJGZJyoE6NOED99xaC4kbJZhseFISi2gD8hGA8GYiAY/2oCo24QN319WPHweEAwvh+B0fMwXqsbowkQi/' +
            'K+oKS0xIMiZZ+DsSciMq4JxlxTGE2B9IuUHQkoNlLcmhGD0RMM29q+Ks+LcQLx1yza7sttifcq05SNjOeaxmgaxE1f2o+Dd0n31Q' +
            'G+LUPfXgXGHPCbpjFyOncD3wX+JF1Yl7Df5t2SNviURNsNwn/T9zHwV+BJ4L6W4PazEfgO8MdIlC7Fjyu7kRh/kVXK/Tm9CCaj53' +
            'LTKfTbI+eUDYT/dj6rmpEzSL/uKxQl9FzNGSNHED9SykLxC/irwAc55u0cQVyUlcj0NQjjOvCGREbW3VSuIBbFTvTbKH44dKficV' +
            'bXC0buIO6cMgF8VdrTTmR0rAjEL4GLubea6+FaJVPAZ2VWiT0dSXW75TFyfwNm/wT3Aj+kWKFPK5/vBMWu7F5gXm69FiT+PCgYj8' +
            'i7e0L5OHb3ZdcsWaOYjDF+ADwqGHckPp6LsplibZ8liskcY29CZAxCsVvieYZ/8jj2IBYjNU2FRkp2KDmB7PHSVCjGKsXPtnuEXY' +
            'TNjZQtuaGYzDAeofjULxTjGvAmxYb4MrBVhsdORKTc66B0WxAdhl2HvCkT+JysWrZLi6tFabzQNw0y67S2MZFxHfi3TN+vUHyE+z' +
            '7FwtDuvmJRsmiJTQaR8agiTVmMlykuhw6f7r4+SIiUxlHMOsKwaeotwXiJ23dTdkucirLQVE0xDWJo09TzwEkGLwpvUVyYQJu+pq' +
            'Wm2OGxO8ogs4lpymIsD/n7/uo+JlI2OoW+dhRTM8YR4DEFxlsOxlLg/SzKRUWkuCgX6kQxNWIcFYz9kTXjtAKjbJR5im9J9kYBxI' +
            '2M/cTVjNNSwDUY9Om+tilR7qsrUkzNGCGrDbxu6mXSrwVcVqRUXlNMzZERgnHNwUiJjEEoywkoW6pGqQpkRlkzVhNrRgjKWS9SJi' +
            'NR7pf0db4KFFMDxmTg/arG6Je+tvLpt1lCUXY6NaV0lLJBdsuc8Xgkhq0Zv5IJvOrrx7vpyxb6u3JoicsE2eNExr5IjNOC8Wvqu5' +
            'i/X1O0w2OpkVIWiDuB71dgPF8zhr9muZgw0ZdaU0xJaeqosw7RYLxEc//NhYuyVYlS2pxiSogMTQH3MS7Q7HG7rwcEJbSm3OVFyr' +
            'wg1w6SMoG/DbwgaappDBfljJe+tCjq9GUS0pTFODACGG76Ouelr1gUm77OaVA0IDOCoWlt33a6qQXyPDf71BQtSnRNMcrI0GC4re' +
            '0F8j62JV5SouyU9BW9ZjE1RUZOBTy2+1pWoLjd10JMTTGRGI9RXDwydFG4XjHWaok1kRJc6E1gmnpcbgeJW6GvZwwfZSlhTgles5' +
            'hAjCPSTU1GYOTcTWlRFolfSLot8eKwSDGBNeOAomaMCobfEi85KJqasibKIJBpJ03FYriRscBoHb/Qx6D4LXFfFDME4+AIzhlNo0' +
            'w76eu24dH0SVMpGC+MOEZZKLb7WvJRTEmR8Y5gvDgGGP1a4tiF5EYP5bw83icg0zJjHElIUy+OUAHXtsSx3Zc/p9wyUmiOKDHcyB' +
            'g3jDImehdlEThvKC7gdZTi/+yL+ULCO2McGVWgPADMG+DnwKHIyPjPGBXw2DllEf2WeAsUV1frBd7sJY6eEtX23H7uBL5J8Y3Liw' +
            'IVernCBQi/NN51wfiJaLZn8JlwUJYjUG6gwGgjI+xMeiihb/xgjDZN6VFORkRKUM1oIyMN5RsUH0GEoKyJ8QbwUxkc25OOcjKg0P' +
            'et9leAv7VpqnSUrzvrpb4Xff4/S8TFfCJlskIAAAAASUVORK5CYII='
        );

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'dcforms-checkbox-groups' ]
    }
);