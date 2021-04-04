/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render radio elements and attach element-specific events
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-radio',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms radio and radiotrans types.', 'debug', NAME);

        /**
         *  Render a radio element into onto canvas or PDF
         *
         *  @param  element             {object}    A dcforms-element
         *  @param  creationCallback    {Function}  Of the form fn(err)
         */

        Y.dcforms.elements.makeRadioRenderer = function(element, creationCallback) {

            var
                items = [],
                transparent = (element.elemType === 'radiotrans'),
                pubMethods;

            function initialize() {
                //  CONSIDER: load enums here?
            }

            /**
             *  This should only apply to radio groups not bound to an enum type
             *
             *  @param  newValue    {String}    Legacy list serialization
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function setValue(newValue, callback) {
                var i;

                if (element.value !== newValue) {
                    element.page.isDirty = true;
                }

                element.value = newValue;
                transparent = (element.elemType === 'radiotrans');

                //  Parse values to format used by this element

                if (true === element.enumLoaded) {
                    //  radio items defined by reducedSchema
                    items = enumToItems(element, transparent);
                } else {
                    //  radio items defined by user
                    items = valueToItems(element, transparent);
                }

                for (i = 0; i < items.length; i++) {
                    if (true === items[i].selected) {
                        element.display = items[i].value.replace('*', '');
                    }
                }

                //  prevent overly narrow render
                if (element.mm.width < element.mm.lineHeight) {
                    element.mm.width = element.mm.lineHeight;
                }
                generateSubElements();
                //element.page.form.raise('valueChanged', element);
                callback(null);
            }

            /**
             *  Current value of radio elements
             *
             *  @returns    {String}    Full legacy serialization
             */

            function getValue() {
                return element.value;
            }

            /**
             *  Should now be synchronous and avoid canvas tainting complication of cross-domain assets/images
             *
             *  @param voffset
             *  @param callback
             */

            function renderAbstract(voffset, callback) {
                var
                    zoom = element.page.form.zoom,
                    ctx = element.page.canvasElastic.getContext('2d'),
                    drawBg,
                    i;

                //if (!element.subElements || 0 === element.subElements.length) {
                    generateSubElements();
                //}

                for (i = 0; i < element.subElements.length; i++) {
                    drawBg = element.subElements[i].hasOwnProperty('noncontent');
                    element.subElements[i].renderToCanvas(ctx, zoom, element.mm.left, element.mm.top, voffset, drawBg, 'abstract');
                }

                callback(null);
            }

            /**
             *  Lay out radio images and labels
             */

            function generateSubElements() {

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    return;
                }

                var
                //  zoom = element.page.form.zoom,
                    isInvalid = !isValid(),
                    newElements = [],
                    interactionElements = [],
                    tempButton,
                    tempOutline,
                    unescapeLabel,
                    i, j, cy;

                element.subElements = [];

                for (i = 0; i < items.length; i++) {
                    cy = element.getContentHeight();
                    newElements = [];

                    unescapeLabel = items[i].label;
                    while (-1 !== unescapeLabel.indexOf('[bold]')) {
                        unescapeLabel = unescapeLabel.replace('[bold]', '**');
                    }

                    //  label
                    newElements = Y.dcforms.markdownToSubElements(
                        unescapeLabel,                                      //  markdown text
                        element.font,                                       //  typeface name
                        element.mm.lineHeight,                              //  line height
                        parseFloat(element.mm.lineSpace),                   //  leading factor
                        (element.mm.lineHeight  * 1.2),                     //  x offset (mm)
                        cy,                                                 //  y offset (mm)
                        element.align,                                      //  text alignment (left / right / center)
                        element.mm.width - (element.mm.lineHeight * 1.2),   //  wrapping width (mm)
                        element.isBold,                                     //  make bold
                        element.isItalic,                                   //  make italic
                        element.isUnderline                                 //  make underlined
                    );

                    //  radio option graphic
                    tempButton = Y.dcforms.createSubElement(
                        0,
                        cy,     //  + (element.mm.lineHeight * (1 / 16))
                        element.mm.lineHeight,      //  square
                        element.mm.lineHeight,
                        element.mm.lineHeight,
                        '',
                        Y.dcforms.assets[items[i].image]
                    );

                    //  point PDF renderer to this asset
                    tempButton.imgId = ':' + items[i].image + '.png';
                    tempButton.cursor = 'pointer';
                    tempButton.isButton = true;

                    //  add image
                    newElements.push(tempButton);

                    for (j = 0; j < newElements.length; j++) {
                        newElements[j].option = items[i];
                        newElements[j].fgColor = element.fgColor;

                        if ((element.mm.lineHeight  * 1.2) >= element.mm.width) {
                            newElements[j].nocorrect = true;
                        }

                        element.subElements.push(newElements[j]);
                    }

                    //  in fill mode, add interaction elements for each option (tab stops, mouse events)
                    if ( 'fill' === element.page.form.mode && element.canEdit() ) {

                        tempOutline = Y.dcforms.createSubElement(
                            0, cy,                                              //  left, top
                            element.mm.width, element.mm.lineHeight,            //  width, height
                            element.mm.lineHeight,
                            '',
                            null
                        );

                        for (j = 0; j < newElements.length; j++) {
                            if ( ( newElements[j].top + newElements[j].height ) > ( tempOutline.top + tempOutline.height ) ) {
                                tempOutline.height = ( ( newElements[j].top + newElements[j].height ) - tempOutline.top );
                            }
                        }

                        tempOutline.option = items[i];
                        tempOutline.interactive = true;
                        tempOutline.hasError = isInvalid;

                        interactionElements.push( tempOutline );
                    }
                }

                if (element.getContentHeight() > element.mm.height) {
                    element.mm.height = element.getContentHeight();
                }

                //  add a subelement for the element background and border
                tempOutline = Y.dcforms.createSubElement(
                    0,
                    0,
                    element.mm.width,
                    element.mm.height,
                    element.mm.height,
                    '',
                    ''
                );

                tempOutline.bgColor = element.bgColor;
                tempOutline.borderColor = element.borderColor;
                tempOutline.noncontent = true;

                element.subElements.unshift(tempOutline);

                //  add a subelement for interaction in edit mode
                if ( 'edit' === element.page.form.mode ) {
                    tempOutline = Y.dcforms.createSubElement(
                        0,
                        0,
                        element.mm.width,
                        element.mm.height,
                        element.mm.height,
                        '',
                        ''
                    );

                    tempOutline.noncontent = true;
                    tempOutline.bindmark = true;                     //  show binding
                    tempOutline.hasError = isInvalid;
                    tempOutline.hasHighlight = !element.readonly;        //  hint for touch devices
                    tempOutline.interactive = true;
                    interactionElements.push(tempOutline);
                }

                for ( i = 0; i < interactionElements.length; i++ ) {
                    element.subElements.push( interactionElements[i] );
                }
            }

            function update(callback) {
                generateSubElements();
                if ( callback ) { return callback(null); }
            }

            /**
             *  Returns the lowest point of the lowest subelement relative to element (mm)
             */

            function getContentHeight() {
                var i, subElem, curr, max = 0;
                if (!element.subElements) { return max; }
                for (i = 0; i < element.subElements.length; i++) {
                    subElem = element.subElements[i];
                    curr = subElem.top + subElem.height;
                    if (curr > max) { max = curr; }
                }
                return max;
            }

            /**
             *  In response to keyboard events for space, enter
             */

            function incrementValue() {
                var selIdx = -1, i;

                //console.log('Incrementing radio value, ' + items.length + ' options');

                for (i = 0; i < items.length; i++) {
                    if (true === items[i].selected) {
                        selIdx = i;
                    }
                }

                selIdx = selIdx + 1;

                if (selIdx === items.length) {

                    selIdx = 0;
                }
                element.page.isDirty = true;
                //console.log('new selection: ' + selIdx);
                selectItem(selIdx);
                generateSubElements();
            }

            function selectItem(idx) {
                var
                    transparent = (element.elemType === 'radiotrans'),
                    i;

                for (i = 0; i < items.length; i++) {
                    items[i].selected = (i === idx);

                    if (true === transparent) {
                        items[i].image = items[i].selected ? 'radiotruetrans' : 'radiofalsetrans';
                    } else {
                        items[i].image = items[i].selected ? 'radiotrue' : 'radiofalse';
                    }
                }
                element.page.isDirty = true;
                generateSubElements();
            }

            /**
             *  Called by the page when one of out subelements is under a mousedown
             *  @param  localized   {Object}    Mouse click localized to canvas
             */

            function handleClick(localized) {

                //  may be hidden where client does not have KBV certification
                if ( true === element.isHiddenBFB ) {
                    return;
                }

                if ( 'edit' === element.page.form.mode ) {
                    element.page.form.setSelected( 'fixed', element );
                    return;
                }

                var i;

                if ( localized.subElem && localized.subElem.option ) {
                    element.display = localized.subElem.option;
                    for (i = 0; i < items.length; i++) {
                        if (items[i].value === localized.subElem.option.value) {
                            items[i].selected = true;
                            items[i].image = transparent ? 'radiotruetrans' : 'radiotrue';
                        } else {
                            items[i].selected = false;
                            items[i].image = transparent ? 'radiofalsetrans' : 'radiofalse';
                        }
                    }

                    element.value = itemsToValue(items);
                    if ('edit' === element.page.form.mode) {
                        element.defaultValue[element.page.form.userLang] = element.value;
                    }

                    generateSubElements(element.lastOffset);
                    element.isDirty = true;
                    element.page.form.raise( 'valueChanged', element );

                }

                if ( element.page.form.selectedElement !== element ) {
                    element.page.form.setSelected( 'fixed', element );
                }

            }

            /**
             *  Add a flyover layer to the forms which captures keyboard events for this area
             *
             *  @param  selectedOn  {String}    Context of this selection (filling or editing the form)
             */

            function createValueEditor(selectedOn) {
                /*
                function onValueSet() {
                    //Y.log('raising valueChanged event for FEM', 'debug', NAME);
                    element.page.form.raise('valueChanged', element);
                }
                */

                function onChange(newValue) {
                    Y.log('new value set by keyboard event: ' + newValue, 'debug', NAME);
                    //setValue(newValue, onValueSet);
                    element.page.isDirty = true;
                }

                element.page.form.valueEditor = Y.dcforms.createRadioValueEditor(selectedOn, element, onChange);

            }

            function destroy() {
                items = [];
            }

            function map(newValue, callback) {
                if (element.display !== newValue) {
                    element.page.isDirty = true;
                }

                element.display = newValue;
                callback(null);
            }

            function unmap() {
                return element.display;
            }

            /**
             *  Get the unserialized value of this radio box as javascript object
             */

            function getItems() {
                return items;
            }

            /**
             *  This element type no longer has any special mode sensitive behaviour
             *
             *  @param  newMode     {String}    Mode name
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function setMode(newMode, callback) {
                if ('shutdown' === newMode) {
                    destroy();
                }
                //  different interaction elements in edit and fill mode
                generateSubElements();
                callback(null);
            }


            /**
             *  Elements may have a variable number of tab stops
             *
             *  For radio boxes each option may be tabbed to
             *
             *  @returns {number}
             */

            function countTabStops() {

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    return 0;
                }

                return (element.canEdit() && items && items.length) ? items.length : 0;
            }

            /**
             *  Simple form element validation, EXTMOJ-861
             */

            function isValid() {
                if ( !element.validate.notEmpty ) { return true; }
                if ( element.display.trim && '' === element.display.trim() ) { return false; }
                return true;
            }

            //  SET UP AND RETURN THE NEW RENDERER
            initialize();
            pubMethods = {
                'renderAbstract': renderAbstract,
                'setMode': setMode,
                'destroy': destroy,
                'setValue': setValue,
                'getValue': getValue,
                'getItems': getItems,
                'update': update,
                'incrementValue': incrementValue,
                'getContentHeight': getContentHeight,
                'handleClick': handleClick,
                'createValueEditor': createValueEditor,
                'isValid': isValid,
                'map': map,
                'unmap': unmap,
                'countTabStops': countTabStops
            };

            creationCallback( null, pubMethods );
        };


        //  PRIVATE METHODS

        /**
         *  Parse element value to array of radio items
         *
         *  @param  element     {object}    a dcforms-element object
         *  @param  transparent {bool}      determines sprite set to use
         *  @return             {Array}     Array of radio items
         */

        function enumToItems(element, transparent) {

            //  bindings get messed up occasionally in development

            if (
                ('' === element.schemaType) ||
                    (!element.enumObj) ||
                    (!element.enumObj[element.schemaType]) ||
                    (!element.enumObj[element.schemaType].enum) ||
                    (!element.enumObj[element.schemaType].translate)
                ) {
                Y.log('Invalid reduced schema: ' + element.schemaType, 'warn', NAME);
                return [];
            }

            var
                userLang = Y.dcforms.getUserLang(element.page.form.formId),
                myEnum = element.enumObj[element.schemaType].enum,
                myTranslate = element.enumObj[element.schemaType].translate,

                i,
                currImg,
                selected,
                items = [];

            for (i = 0; i < myEnum.length; i++) {
                selected = false;

                if ((i === 0) && ('' === element.display)) { element.display = myEnum[i]; }
                if (element.display === myEnum[i]) { selected = true; }

                if (true === transparent) {
                    currImg = selected ? 'radiotruetrans' : 'radiofalsetrans';
                } else {
                    currImg = selected ? 'radiotrue' : 'radiofalse';
                }

                items.push({
                    'index': i,
                    'domId': element.domId + 'radio' + i,
                    'value': myEnum[i],
                    'label': myTranslate[myEnum[i]][userLang],
                    'image': currImg,
                    'selected': selected
                });

            }

            return items;
        }

        /**
         *  Parse element value to array of radio items
         *
         *  @param  element     {Object}    a dcforms-element object
         *  @param  transparent {Bool}      determines sprite set to use
         *  @return             {Array}     Array of radio items
         */

        function valueToItems(element, transparent) {
            var
                i,
                dirtyval = element.value || '',
                lines,
                currImg,
                currLine,
                selected,
                items = [];

            if ('edit' === element.page.form.mode) {
                //  in edit mode we're changing the default value, not the current value
                dirtyval = element.defaultValue[ element.getCurrentLang() ] || '';
            }

            if ('object' === typeof dirtyval) {
                //  can happen with direct serialization
                return dirtyval;
            }

            dirtyval = dirtyval.replace(new RegExp('<br>', 'g'), '\n');
            //dirtyval = dirtyval.replace(new RegExp('<br/>', 'g'), '\n');
            dirtyval = dirtyval.replace(new RegExp('{newline}', 'g'), '\n');
            lines =  dirtyval.split("\n");

            for (i = 0; i < lines.length; i++) {
                selected = false;
                currLine = Y.dcforms.trim(lines[i]);

                if ('' !== currLine) {

                    while (-1 !== currLine.indexOf('**')) {
                        currLine = currLine.replace('***', '*[bold]');
                        currLine = currLine.replace('**', '[bold]');
                    }

                    if (0 === currLine.indexOf('*')) {
                        selected = true;
                        currLine = currLine.substr(1);
                        element.display = currLine;
                    }

                    if (true === transparent) {
                        currImg = selected ? 'radiotruetrans' : 'radiofalsetrans';
                    } else {
                        currImg = selected ? 'radiotrue' : 'radiofalse';
                    }

                    items.push({
                        'index': i,
                        'domId': element.domId + 'radio' + i,
                        'value': currLine,
                        'label': currLine,
                        'image': currImg,
                        'selected': (selected || false)
                    });
                }
            }

            return items;
        }

        /**
         *  Serialize redio group state to string
         *  @param items
         */

        function itemsToValue(items) {
            var txt = '', i;
            for (i = 0; i < items.length; i++) {
                if (items[i] && items[i].hasOwnProperty('value')) {
                    txt = txt + (items[i].selected ? '*' : '') + items[i].value + "\n";
                }
            }
            return txt;
        }

        if (!Y.dcforms.assets) {Y.dcforms.assets = {}; }

        Y.dcforms.assets.radiofalse = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJMAAACsCAYAAAB/yZ5tAAAAAXNSR0IArs' +
            '4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAN1wAADdcBQiibeAAAAAd0SU1FB90DFhYTACniSZ' +
            'IAAAw4SURBVHja7Z1biJXXFcd/xzEzatQZo6MddRwvdBJHwUQipBCkdqLRUFKlptRLoE4mBPvSgsL4UI' +
            'ppFRooM/UuQulbWijFByHEkBobkAhTERoNqQ9expiWGcZ4r5qY04dvi8cz37nutfd3OesP+2Hw+H17rf' +
            'U761tnf/sCKpVKpVKpVCqVSqVSqVQqlUqlUqlUKpXKhzI1bPsY4ClgOtAKzDZtFjADmAo0AuOBUcC3wC' +
            '3gOjAIXAEGgIumXQa+BK4CdxWm9GoS0A68AKwAXvFwz/eAD4CTwDngK81dyVQT8BJwAMjGqB0w/WrSEM' +
            'VbrcBm4HzMACrUzpv+tmro4qFm4C1gOCEAFWrDxo5mDalf1QEvAscSDlChdszYV6ehdqcnga6UAlSodR' +
            'm7VUJqBHpqDKL81mP8oLLIRFtrHKL8tlUzVeU10UYFp2jbqDVVaS1JwS8zn78Alygy4XXRIQWkqnZI66' +
            'lHWq5AiLTltQzROM1GTrLUuKgCGtWL3g7gbMQwDwJngM8JXm0MELz1HwKuEcwQuEcwW2AU0EAwg6DJjF' +
            'RPJ5hhMBd4BlhIMNMgDloAfFYLGWldRN/aU0Af8BrQ5si2NnP9PnO/KLPUurT/5O/z7NDDwBsE85Oi0A' +
            'xz/8MRAdWXxiGECcAJTw48DrwZw184jaZfxz0DdcL4PxVqAW56cNp+YHFCfLLY9NcXUDdNHBKteY6ddA' +
            'fYAUxLqH+mmf7f8QTVvKSCNN+xY94BJqcke0829vgAar6C9Ki9SzCfO41qN/YpUI4fbeeA1TUyoLva2F' +
            'vTj7wWR4bvBkZLdzabzYo3QY02drsEKrZF+QTgtrCxQ8DaOMPjAa61xg8uYLodx2GDOgfjSB8SLIpMHE' +
            'AOwJpt/OFqHCpWA5u7hA3clxaAhMHa5wioXXEBaYOwYdvSDJEAVNscAbUhapA6hA3qrhWILKHqdgRUR1' +
            'QgjRU2ZH0tQmQB1XpHQI2NAqaDRDhdIo0gVQGUi+k8B32D1CnY+U0KkRVUmxwA1elzPEmq01sUJBGgtj' +
            'gAysv4016hzvYqRKJQ9QrDtNc1SIuEOnpEQXIC1BFhoBZVAkemws9ewH7+9ADB4sHBckDyoUxGZl2Fj/' +
            '6W6OtUoJ9goYOELgFzDFjib7IlaF8VdUbypYj6v0o4O4nP1KgX6tjOFLzNjwVYJbRTGKh6SV9I7IvUH0' +
            'OnJxqqEuoXhKlLyv4GoQ4ti5GjUwNVES0Tzk4NpWwaVYbdPxHw3X7gIx/FayaTESuoXRfSEv0s4rePjN' +
            '+lVJKDUtbUAd9YduIWwRLqIZcgJQEgl1+mAvY3Eyx9Hy/UzdHAg2oz0/cFOrBDQXJvQwE/Dhn/S8mKh9' +
            'OWz9kB17VD2uTIFwNCddPpamumNuBZS9/0ukrtSamNfNpVxJ+9Qt17lioHrbdbUjxIkbnFmo3cZakCte' +
            '+gUHbaXqkddQI3fduToxSo8nz0tuAwQUULEBYL3LBVQYoVUK2CMC2upGb6maX9fyU4f02sTkpjfeTS9h' +
            'A/XzZxkVDZfEg84lZrVopldlqN50ddO/arcBWk+AIltTq4vZzH3MuWNh+O02BerT/uHManLE4+tST2Vc' +
            'e/SjRD2fnxVaHM9OkI2PP+HgP8z8LOBwT7UN+XKLw1K1U8OFmOH+sJdqqT2F9gLDmHW+c/5uZaXvzvYS' +
            'Dp4y1Wj7v7Jk4SmlusZrI92OVjyeEAlbNM9rHQpZcUg8m2+P5Es1IistMnQt14uVjNdA+7+b6NwA3hZ7' +
            'xKoHbK8+lE4LpAF+6TMwMzNzM1WIL0bwUpvtkpLw43TLxsVV8IJtttkM9qeBMlqXhNDoPJ9nyRc1orJa' +
            'p2OifUhRlhMNmu1L2goU2UpOLVFgbTHMuLXtYhgUQV7JeFLjsnDCbbAcv/argSJal4zQ2DyXazg2Gtlx' +
            'JVNw0L3X5WGEwzLS96Q8OaKEnFa2YYTM2WF72j8UmUpOLVHAaT7cmRX2t8EiWpeDWGwTRG/auqQmPCYL' +
            'LVE+rXREk8Xrkw3bW81jiNT6IkFa/QyXG2b5EnanwSJal4XQ+DacjyopM1PomSVLyGwmD6wvKi39H4JE' +
            'pS8foiDKYBy4u2anwSJal4DYTBdN7yonM0PomSVLzOh8FkOyWhXeOTKEnF60IYTJcsL7pA45MoScXrUh' +
            'hMVywv+rQODyRqWOBpoWtdCYNJYkrC89X+R51IV72q8N3zgrcfDoPpHvarcb+noU2EpOJ033AzAiaAv1' +
            'lefGnuHzrhLV7KicdSoUs+xks+TEctL96J8KEtKnHVI3ds6tFiMPVbXrwOWKl1U6zrpZXI7IAygpd8mM' +
            '4L3OCHGuJYSzI+JXmx3exrKOzbo5t8uclKVfhUahvCEZt9hU2OO2Rp4xQcnJ6oEtFqEx8JHSoHpqMCN1' +
            'rvuQ7QWslDXEpxkilQRH8jcLNZ5Kwa1d1QooPJ+LIV+5khuRpxXFhYZnoA7BG4Wbdmp1hlpW7BLuyhyL' +
            'lz+ZI47uKxg3h0t91oCm/jR8mDeAoed1FsvEjipr+0cYICJQISJg6S5/VWPE61XeCmA7YwKVAiX8YBQZ' +
            'C2V9P3NqGb9yhQkYLUI5yVqt7H67TAzW+Ssx5dYfIKU7PxvxRIp21s6BTqxD7NTpFkpX3CWcnqBXGdYE' +
            'eWKVBeQVomDFJVhXe+XhfqSL8ETHpGb9n+6RcG6XUJmxoEO7RTgfIC0k4HWalByrYuwU6tkgIqjVAJ+G' +
            'KVA5C6yul7uS/A6smZ62upAYIDXAalXpuk5T2erS8ymcwU4BT2+5OGPZ1Krg8od3+m+8AaoY7NAv4oCU' +
            'IaMpQASAB/cgDSGoSOfcvPYhcFU2ev5OMuqY89QZt7HTzeLlbw9KpYi4Q7u8UFUEmAStjOLQ5Aypp4O9' +
            'Ve4Q5vcgVUHKFyYNsmRyDt9eGPCQ46vs4lUHGAypE9P3UEUtbE2Ys6HXR+vWugfIPluP/rHILU6fvLdt' +
            'CBEd2+gHIBl8e+djsE6WAUmXusI2O2RQFUEprRNocgZU1cI1GHI4P2KVBeZgHkt46oa8sNjgz7EJhd61' +
            'AZtRp/uARpQ1x+8e5yZOAQsLZWgTL6MXKrcAu1XXEaPqkDTjg0djfBOq2agCrHp7sdQ5Q1casjZpoA3H' +
            'Zo9Dnylp2nGKQfGXtdg3Tb53hSpWrx4IB3ydspNkUQzTP2ZT21lri/dprnyRHvkHdkQ4IhmmTsyXps85' +
            'LyMny+J4fcAXYA05IGlVGz6f8dzyDNT9rsivmeHbSfkGXLMQQI4DnT32wELXEg+X7k5bbjwJuEHBMbMU' +
            'ATTb+ORwRRoh5txYrymxE57zDwBjDD17u0PE039z8cIUAPF8K2kBJNcDwOVU47BfQBr2GxxLmE2sz1+8' +
            'z9sjFoJ3z9/Pc5E78O+D15O6NEqEHgDPA5wUafA8CXZrT5GnCLYBHFtwRz5RuA8UCTKZynE8y3ngs8Ay' +
            'wEpsbsS/wHYCsV7KWUNK2LyTc27W2d78BGtUaoAziLypUWAJ/VksHjCHZs1Swi1w5R46e4L1cIRNpyTc' +
            'iBGjVLWWWjRkVopJYQnF+mkJRuw8ZfqhJDCBsVlqJtIzGcgxRnPWnGSBSeR22r8YvKop7qqXGIemqyLm' +
            'oB/uEuU3XVGERdNZuJRgF/IXhHccZtTfUicCylAB0z9mlNtBQ46R6oh2oG3krBL8BhY0ezVjV5agc+8A' +
            'fUQ7UCmwle2iYBoPOmv61KTBkp48/+gXqoJuAl4EDMADpg+tWUxpg7fdFbD/yGxw+FXRiNnZNMwnwBWA' +
            'G84uGe75kEfZJg2dJXaU8gGR836AJ+waMNNBfGw/YxwFME85JaCZaizyaYozSDYG5SI8EcplEE85puAd' +
            'cJ5kJdIZgDddG0ywTzoa4Cd/XZ5FArgH9G99hTpSEz5eo5gvXOk6J/7KmSDhPm2bGHYPaWAqUwWasB+G' +
            '1IFaxQKUxV33izaRkFSmGS0EqCU2MaNEspTBJaRLDb1JSQf1OoFKaqCvO9FN5UUaFSmCrSOOB3wA+KfE' +
            'ahUpgqLsx/XsZnFSyFqSytAX4NPFHm5xWs6DUqrh07THDCzNUyPttP3u6pKs1MYZpJsJN6oY2FBggOXb' +
            'mmsYxcsZ8aegM4AnyXvB3mCTYd6gb+o3FUmMrV18D7BPOjHu4z+IBgWsu/NIaqarXFAPQrdYVKQroXj0' +
            'qlUqlUKpVKpap5/R/d0BjM4jlybgAAAABJRU5ErkJggg=='
        );

        Y.dcforms.assets.radiotrue = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJMAAACsCAYAAAB/yZ5tAAAAAXNSR0IArs' +
            '4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAN1wAADdcBQiibeAAAAAd0SU1FB90DFhYSB66d7X' +
            'AAAA2LSURBVHja7Z17jFXFHcc/hyv7gmUX7SIry0t2twU0pBiIEqKNCBItCf7J6w83ND4o9Q9IiAlpSB' +
            '+IxISgNigmlhAbG1NigilRY0hpomi0GAWk5e3Kii4CroiF5TH9Y2brstzde885M3POuff3Teafvefu/O' +
            'Y3nzszZx6/AZFIJBKJRCKRSCQSiUQikUgkEolEIpFI5ENBGZe9CrgRuAUYDYwzaQwwChgB1AFDgUHAVe' +
            'B7oAvoBDqAduC4SV8AXwJngAsCU+lqONAK3AnMAR7wkOcO4G3gfeAgcFbarmyqHrgP2ASoFKVNxq56qa' +
            'J0azTwGHA0ZQD1l44ae0dL1aVDDcAjwOmMANRfOm3K0SBV6lc5YCawM+MA9Zd2mvLlpKrdaQjQVqIA9Z' +
            'faTLlFllQHrCoziPqmVcYPohgt0coyh6hvWiktVfgx0WIBZ8C0WMZUhTWtBN7MfL4BThNk8o+LNgsgkd' +
            'JmGU/9qNkChJU0u5whqpHWyEkrVZNUhSa10DsJ2C+NsjNNBj7znemgBAq6QEByrv3GzyX9yr9BuiKvaU' +
            'MpTiHUAu9K5SaS3jX+L4kxUyN6c9hQ6X0S0/fozYEnswzTBOCw1GVq1AwcyeIAfKKAlDodNvWSqZZpYh' +
            'KvpqJQUzMHsgBTlro2BXyHPlVyDDhk0hH0yZNO8/ll4AZgGPrUyhhTzhaTxqNPuQwjO4c0rHd5tgveaC' +
            'omrbpkHPhP4HWl1JvWf51BMBd4CLjbADc4xf64xfWgPM7r//kUvhp3AW8A85RS+E7APJN/Vwp9c97XtE' +
            'EY5VI2j9SN3ks9JwmABgBrjrGrO2XzUKma2NyYEsd8A6xPE0ADgLXe2JsGv21MC0iLUuCMDmB5FiDKA9' +
            'VyY3/SPlyUhlfMJB1wBliRRYjyQLXClCdJf05K6m2uGvghIYivAH9WSv2q1CaAgiB4CXg4wXFMDfBf35' +
            'm+kNCv51NgRCm0RgO0UiNMOZPw7wu+QZqVQCEvA2tLGaI8UK015fbt61m+urlaMyvsUx3AvUqpg+W27h' +
            'EEQauZThjlOethwLkwX4iy0PuU50LtUko1lSNIAEqpg0qpJmCX56yd1/MU3/13OXVrRXR7vsepU1x1c4' +
            'FZDB3r4wcJPKmUetpTV1Jp1hUnoHc8TEQv4I5Dh7mpN2OX74FT6LCDh9Ar7wfMet9JpdRFD7auMq2Gjw' +
            'Xlz9GL2Mr2P57v6ddwBWhz/AuvBqYDa9C7A2zZ3m7+53Sg2qH9bcZPPupjvm2QKjyCtNBRBVSat5TtHr' +
            'uJ7SbPSgflWegRqAqbMPmKi7TUgdObgHUpWK5YBzRZLttST7a32QKp0pPBqy07ugXYRvq2fWwDWiyWc7' +
            'UnuyttwLTEg6FbLDp3JLCV9B9B2gqMtFTmLR7sXRIXpJwHI3dbcmgOWEb2zrUtA3IWyr/bg62x1gtdL5' +
            't0WgKp2fJbme/UDjRb8ENnGpdZevSxQ8OuAjMsOHBRhiG6bk9RTF/MMH51Zd/HUUEam+bZbfRpkedLCK' +
            'Se9DxwQ4pnySNNWq9xaNDxmCANobRjF7wLDInhn+MObVuTtoH3jBiOqs/4+CjMOKo+RneXmoH4VIeG7I' +
            'gB0jDgqzIAqSd9BQyL6KsdDu2aGgamZx0ZcTHmcsj+MgKpJ+2PuhwDXHRk07Np6OJejgHTa2UIUk96La' +
            'LPXk66q2t1lPmFmCc3yj1o14qIvrvgyJ7WYnZa3u9ob8zfIu7fuRN4BtEzxhde/F6E7i9mc9xe4DbLGV' +
            '9VSuUigDTEbEgT/aihSqnzIf14BfuxuPYBtw/UMlU5AAngg4jf+4OwY8UnHziw4zbDS79ydUL3wQh9fd' +
            'KnhdOcJoX05YOu7BioZXJxscu3Sqm/R/jeVmmE7PjG+P9bB3ZMGwgmF4PvdyIOuu8QZvrVHREG4+84sG' +
            'NAXlxMcs2M0MXtka6sYNoT0qczXUxC9/c2V2nmJGzqB6XUkJCtUivwH2l8itJPwxxODYLgPPYv6qnqga' +
            'p3N3eTg8LujfCdXwsjzny114ENN+UbM7k4yx4qAGkQBBXo4Fei4rTc+MxJfRSpUflgcnFS9y8hn58qfI' +
            'TWVIf1UYzG5oNpvOVMLimlDoX8zgJhI7SK9pmpj0uW8x+fD6ZbLWdyKsJ3fiNsOPfZKcv535oPpjGWMz' +
            'kWcrw0XLiIppC+O2Y5+zH5YGqynEnYeErNgkVkNTusl0JqygdTg+VM/h3y+duFici63WG9FFJDPpjqEm' +
            '6ZpggTkTXFYb0UUl0+mKosZ3I85POThYnImuywXgqpKh9MthX2tqBbhYn4b1QO6qVo9YbJ9rpcV8jnbx' +
            'YmIutmh/VSSBfywWQ7k+6ozaUoelfjoF6KhrM3TLYnsyqiEi6K3jo4qJdCOpUPphOuRvlF6mthIrK+dl' +
            'gvhXQiH0ztljNpDPn8UWEiso46rJdCas8Hk+3KHBfy+f3CRGTtd1gvRYPcGybbazatIZ//RJiIrE8c1k' +
            'shHcsH0+eWM/lZyOf3ChORtddhvRTS5/lg6ki4ZTosTETWYYf1Ukgd+WA6bTmTUJvtlFJnhYloCuk725' +
            'sgT+eD6SJ2J7Si7EJ4VtBw7jObu0O66XXcqe/a3DaLGQ0OgqAl5HdeFTZCq2ifmfoYbDHva3jpC9Nblg' +
            'sa9nrzPcJGaO1xWB+F9NZAMH1oObO5Ifv+buA54aNoPWd85qQ+itA1vPSNz1SF3WvI5USvWyV9oreafn' +
            'YNYD7YZzGzmiAIZoZsnQ4SIxJ+GenjkCDNtAzSPvosMOfbHLfZcqGfiPCdx4UV6z56wnL+RXFiO0Dq2Y' +
            'iBPT9CIp30lz6K4M+zOA6Qmk8uQjdL5LjSixxXdIxS20Hl34vYOm0QcK5LGyL48T08BJXv7zrzqcC/LP' +
            'avEm3XntIQbfeOfPNb/WVgezvIoCAIXgn7JeO0u4Sf/+uuCCC9gv1TSKH5WIPcUCA3FFi4IgzcXF4od6' +
            'dk/+6UyHG8bF+rKrc6ZftWp1iTyS4ufJb75rJ731ysC59dXRcmN2Fm8ybMXNyR+xIHRskdvdm7o3eJjd' +
            'fASkcOk9vDs3V7eKWteYU2B8ZdjdPd9XLeohICaVFMX8wwfrVtV5vNSaoKR87rjAuTcWJzxsdR7UCzBT' +
            '90OrLPdnwC5jsydLcloHLAsgyCtAzIWSj/bkf2zXcxlR84GtgpYIsNoIxTR6Kv0Eo7RFuBkZbKvMWRjc' +
            'cHWL+NrSkOnbvaFlDGwS3o0xNpg2gb0GKxnKsd2uo8zqjLN6ilNoEyzm4C1qUAonVAk+WyLXX8VulctQ' +
            '4LcAVYaBuoXssxs4DtHgHabvKsdFCehcZfrmyv9bUVYpZjoNpcANWrIqqB6WYF3OZbYLv5n9OBaof2tz' +
            'kGaVbUQXVUvQA84ghWBTyplHraxy8jCIJKdBCsCcBEk1rQsYwazBLOZbNR75QZmB4CDph0BDiplLrowd' +
            'ZVwFMOB8YvAo/6hqka+MGx715USj2KqAcklz/gHtUQ8exkXLon4T7i2y6l1C8EpOAfwD2Os5kMfBb1y3' +
            'G3c34GLHZcwHuCIDhhTvqWI0StQRCc8ADS4jgg2dRGD29Gl4G1LgfmaUvAWlNu177dmKYfUA5/W0I+BU' +
            'aUOEQjTDl9bXfJpa1FrgXOe3LAZeClEgXpJU+tkTL1VZvWLr7R86zyGSKe2kghRCtMeXz6r5GUa0ICSx' +
            'UdwPKMQrTc2O/bZxOy8hIyMaH1r2+A9RmBaL2xNwk/TczaW21SQCl04M6dwJyUATTH2NWdoG8yB1KSXV' +
            '7f1AW8AcxLCKB5Jv+uFPhiAhlXI3COdOwl6jZraS8Ccx3BM9f8/wMJt0C90zkfg+3AE1C1wJvoDe9pkg' +
            'K+A75E3wFyyKQj6B0Anebzy+jTMMPMHNAY8ytvMWk8cIv5PEhZGd8zgJ8rpZWBHBJvyXsspzROSNrUAq' +
            'lkL2mB93XEhIDysdugnBVr9T+LqkFHbJVWxF7ajN3wzJnTbIHASpotDbJWnbRSsVqjOkHoek1D318mkB' +
            'ROp42/RAWmEBYLLAOmxaX+ym9bQ4CVAs41aaXxiyjGeGpVmUO0qizHRY3ALnctVVuZQdRWti3RIOCv6L' +
            'uj9rnLJgfMRG/lKEWAdpryyZjobuB990D1qAF9KDHrb4CnTTkaEF2rVuBtf0D1aDTwGHA0IwAdNfaOFm' +
            'KKaDJe9Q9Uj+qB+4BNKQNok7GrvhTr3OlCbwXwO+CXvf52WzLlHG4azDvRW2cf8JDnDtNAvw8cRF8eWN' +
            'IKfGTQhr7Tc1CyQPVVFXAjelPbaHTEk3HojW+j0Jvg6oChxvSr6CgoXehNcx3oDXTHTfoCvcnuDH3urh' +
            'VZ1hz0PakJdXuiUmiZeuvn6CsUhyff7YmyDhOm73gOvXtLgBKYYqsS+H2eUbBAJTBFzvgxkwIBSmCyob' +
            'nAH7n+lheBSmCKpCnoaFM/yfOZQCUwRRqYP48+toJAJTDFVQ06jP+9AzwjUAlMoQfmjxfxrIAlMBWlh4' +
            'DfAoOLfF7ASl6D0mrY68DD6IWuQvoQHVVCJC3TgGoC/kT/gYXa0TfSfCt1mbhSvzX0O3SkrJ6LTHrrHP' +
            'qOrJNSjwJTsbqEDu5UAUw1f7uC3tbyqdShKKpWGIBWiytENiSxeEQikUgkEolEIlHZ63+l2iNS9hIZQw' +
            'AAAABJRU5ErkJggg=='
        );

        Y.dcforms.assets.radiofalsetrans = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJMAAACsCAYAAAB/yZ5tAAAAAXNSR0IAr' +
            's4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAAN1wAADdcBQiibeAAAAAd0SU1FB90EFgonFsEAi' +
            'TAAAAQMSURBVHja7d0/r7RDGMfx3xz/Ep0EiUQhEQokwktQiIhG+3RCQ6PQioJItP6+BTqFRnRqKuENa' +
            'HQi6ISjeLaQJx72OXvv7lzXfL7JFmd3k7Pzm+9cM3Pv3NkEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
            'AAAAAAswli58ZeXl9sHOgaZyHOkgBeSaxCIWGQqItBKYg0SkYpMxSXqKNUgEamWl6mjSNWFGiQi1ZIyr' +
            'SRSRaEGiUi1jExEqiPUINJ2nXSKzzuzUGNFkU7VIcdqw6xCjVVEOncHbN2mGYUa3UWaLfQt2zdb24aga' +
            '7d1pnYO4dZv9yxtHgLtIdUM7R9EItRWXFTvgFbngYq3ZVQdid2PwF41m3PmMohEqGWnuaXu9nAEpWcJr' +
            '1ahzpHVIBKh7Oaw9jSnKvWuTtNXJiLVyWIYVf0r1KlytGZCf5lUpXrZnEQmNwXUW7i3qUyqUs2MrJlQZ' +
            'zc3685jxSns2NmqTOgpk6pUOzOVCTVkcklgrUsEKhP6yWS9VD87lQlkAplAJoBMIBPIBDIBZAKZQCaAT' +
            'CATyAQynRkH6epnpzKhhkwOvM2FW52gMlk3rZeZyoTtptEZR4+11va5niJTlQm9ZbJ2qpnRSWQybfW+J' +
            'DD9NKc61cvGmgm1dnOHjChTZJ2d8UW38Ii0SGU6JBA/xOOHeGDNpDqpSkVkIlTPTcvFCuFacDevTIeG5' +
            'dfD58tlVB993aSqPMAuVg5fW5pVpq1CrF6hOlTo0W1UVpOq00Aa3YKtIlXHwTO6hjyrVJ0HzOg8amcKv' +
            'vsgmVamY+9sTtURx2rDrFP41AuLU22Vt+qcU3zemdeC0299nGeqs6kosY8mVI1LHqUuyqwoVaXrZuUuG' +
            '68kVLULsGW/g+gsVdWvhkp/odVRqMrfMbY4v9FBqg5HaVodBqooVafzWC2PK1aQquNJ0fan82cSq/tR4' +
            '6Vu9TiHWCvdTbP0bbIdTycAAAAAAAAAAABgHR5I8rUYcCgXST5L8v3ugfX6fzP+SvJJkt93fxMKB/Nok' +
            'q9UKGzFfUk+JdRSHPUk151J3k7ywj+ee0LmOMTWl5N8p0phK55N8i2hTHNb8VSSD5LcY9oj0xbcn+TDJ' +
            'I8TikxbcFeSd5I8f8PzpCLTlf/xq7vHIBSZtuC5JO/uqpUqRaaDeTLJ+0nu/ZfXSEWmKy3MP0ry2E1eJ' +
            'xWZbom7k7yX5Jn/eA+pyHTLC/PX9ngvsci0Fy8meSvJHXu+n1jnZ9ofL/w8yUtJft7jvd8kuV1fqkz/x' +
            '4NJPk7y8E1e/zHJtSS/6Muzc9vsH/DXJF8keSTJQze89luSV5L8pB/JtC9/JPky189HPb177s8kr+f60' +
            'RbgSryxE+hNUWALfhABAAAAgNX5GxsbWXPQ/kWwAAAAAElFTkSuQmCC'
        );

        Y.dcforms.assets.radiotruetrans = Y.dcforms.createImageFromDataUrl('' +
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJMAAACsCAYAAAB/yZ5tAAAAAXNSR0IArs' +
            '4c6QAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAN1wAADdcBQiibeAAAAAd0SU1FB90EFgooCyWe+S' +
            'YAAAemSURBVHja7d1LqFV1FMfx77pa9iIMMruhUPkoX4nWICMIHEhEDQoKeg2SBhVCg6IaRIMeoI0qr9' +
            'HIQVpBgQ2CiAZBEBX0kLKSvBrRDSyCkB6Ula0G52/d9F4997rPOWv99+8HZ+C9B8/ea3/O+v/PvmfvPy' +
            'iKoiiKoiiKoiiKoiiKoiiKoiiK0o9YW3fc3XtXVDNhEhwETJji4WkjLhMgwRKm5IBqhGUCJFitw9QmRF' +
            'lRmRAJVfWYhCgfKhMioaoSkyDlBmVCJFTVYBKkekCZEAlVakyCVCcoEySBSodJiOpHZYIkUGkwCVJ7QJ' +
            'kgCVR4TILUPlAmSAIVFpMgtReUCZJAhcMkSAJlgqQ0BWpIZVTCDHPqSupOjWASJIFqBJMgCZTmTEqsOZ' +
            'O6krpTI5gESaA0zCmxhjl1JXWnRjDVDMnMZgHDwAJgSXksAs4H5gCzgb+AX4AfgK+BUWB3eewD9rv7wT' +
            'aDaiUmMzsVWAFcA6wH5jf0X48BW4HXgV3u/pswVQipdJ8rgXuB6/r0sq8BTwPvZO9a3YCqHpOZzQM2AA' +
            '8OeFM2ASPu/m1rMWWFZGaLgI3ADcE2bQfwkLuP1gaqOkxmdi7wJHB78E3dBjzg7t+1AlMmSGY2A7gLGE' +
            'n2ht8APOfuh7KDqgKTmS0E3mrwU1m/Mwasdfe9mTGlPwNuZrfSOeczP/FuzAdGy76kzVDWrmRmM81sBN' +
            'hOPdluZiNmNjPqBh7LhWXEZGanA28CV1Bn3gXWufuvmYY6SwhpNvBp8mGt23nUJe5+IAuoVJjM7ExgDz' +
            'CXduR7YLG7/5QBU5oJePlzyHstgkTZ1/fKvuebgAce4rYBS2lflpZ9Dz8RT9GZzOw+4EbamxtLDWIfp+' +
            'idycwuL8ObAmvc/f2o86bQmMopgF9k6H85I8opgyMxDQWfLz0uO3FrcqQXC9yVlgKfy86EWebuX0TrTp' +
            'En4M/LTK7ahMRUJt2XysykubTUKO6nuSjDnJl9DKySmWNmp7uvjjTMWUBIi4EvZaWrXOTue6KAijjMbZ' +
            'CRnLUK1ZnM7GTgoIxMKbPc/Q91pqOzWjby1iwapptlI2/Nog1zujPGNOLuNuDjFqszmdlZYpG7dpGGuY' +
            'Vikbt2kTCtkInctYuEaaVM5K5dJEzLZCJ37SJhulAmctcuEqa5MpG7dpEwnSITuWsXCdPvMpG7dpEwfS' +
            '8TuWsXCdNXMpG7dpEw6eKB5LWLhOkTmchdu0iYdslE7tpFwrRXJnLXTt9nqiDhvs/U1Nr2J5hnRCNXzS' +
            'Jf0fuSbOStWaiLMHV1yrQy0KtTwnamUpTN8tF1Ng/6MqewnalI1xW93WfgV/RO2pkiTMJLcXbKyXGzMx' +
            'KkiBPww7lHVvLVKOxtCM3sQ3RbncnykbtfFuAYpcGkO8dNnhB3jjvuMBfk5CWlWE/JzVF5KiKkCTtTsO' +
            '6ku+0enRB320233EUp2hr5+Tdroq70NCmmKENdAfU+cL8ccX+UG8pPaYmwSEPduB14mfYuefGKu98U6F' +
            'hMDVM0UGVlo49p32I8XwCr3f1gZEipMJUd0XpzgTGlWvC5FPViOqtE1p4x4OKICxdOC1Okifg4UAeAJX' +
            'TWsa017wJLoi2pejwPKZeiLx+PrwK2VAhpC3BV5FMA05ozRZ07HfFuuZV6lqO/zd1fCFrn+jGVHV0IvE' +
            'XeFcXHgLXuvjdwjU9szhR57nQE9r3ABeRc3WADcEF2SGnnTJOAOuTuW4BhAi6QPEG2AcPuvsXdD9VwDG' +
            'yKByzPjpktAjYCNwTbtB3AQ+4+mqSOvcGUDVQpxrwylDw44E3ZBIy4+7eJate7zpQR07jCzAKuBO4Fru' +
            'vTy74GPA28E+XPIaEwZQY1rkin0rl39jXA+gY/BY4BW4HXgV3u/lviGvV2zlQTqAm61jCwgM7Z9SXAIu' +
            'B8YA4wG/iLzhf1fgC+BkaB3eWxD9ifsfs0+eldmJTBYxIoQWoUk0AJUqOYBEqQDmdIZVQaA9nUf6Tu1O' +
            '6u1CgmgWo3pMYxCVR7IfUEk0C1E1LPMAlU+yD1FJNAtQtSzzEJVHsg9QWTQLUDUt8wCVT9kPqKSajqRT' +
            'QwTAJVJ6SBYRKo+iANFJNQ1YMoDCaBqgNSGExClRtRSEwClRdSSExClQ9ReExClQfR4TT+td1h4O2GCx' +
            'i9iP1AlKEG1rTMF4Hl5d/L1amq7kQ97Ux/A8/y3/oUn/XwXVprt8q8fz3Z4sXACHBeDztUTR2rljdGz/' +
            'ZiDp010lf0EVQmWDV21p7u0cnAo8C14362fAA7GWTt4frneP14gfV0boo0NEBQ/QTW9k+fPc864MMyKf' +
            '9M5VBnOtGsKvOoswY87CkVYAI4B9gMLBMoYWois4DH6NwDEKESpiZe+O7yMIESpiZyNfBE6VbqUsJ0wl' +
            'lJ5/7GZ0/wO6ESpmlNzEeYfM1UoRKmKeU0OutTrD3Gc4RKmKY8Mb+ni+cKljB1leuBR4CTuny+YA0+YW' +
            '+Q+ipwB/BjF8/9AJipY6nOdLzMo7No7YJJfv8NcAtwQMdy4JkRfQN/orM00uGFTMbnZ+BOYL+OozB1mz' +
            '+BN+h8P2p1+dkhOl9r+VTHUJlu7iuAHlYplCbyuUqgKIqiKIqiKErb8w8i+aLzVEklBgAAAABJRU5Erk' +
            'Jggg=='
        );
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ ]
    }
);