/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render text matrix elements and attach element-specific events
 *
 *  This element type is intended to overlay a series of boxes which would previously have been used for printing
 *  handwriting.
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-textmatrix',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms textmatrix type.', 'debug', NAME);


        /**
         *  Factory method for input element renderers - these make the actual DOM elements representing an element
         *
         *  Context specific to this instance is kept in the renderer, code common to all instances is linked in
         *  the closure to save memory.
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err, newRenderer)
         */

        Y.dcforms.elements.makeTextMatrixRenderer = function(element, creationCallback) {

            var pubMethods;

            /**
             *  Set up private members, event handlers, etc
             */

            function initialize() {

                if (!element.hasOwnProperty('extra') || 'number' !== typeof element.extra) {
                    element.extra = 5;
                }
            }

            /**
             *  Recreate subelements from the current element properties
             */

            function generateSubElements() {

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    element.subElements = [];
                    return;
                }

                var
                    useCursor = (element.canEdit() ? 'pointer' : 'auto'),
                    newSubElem,
                    i;

                element.subElements = [];

                //  Do not create any subelements if this element is empty and we are on server and this is to be omitted from PDF

                if ( Y.dcforms.isOnServer && element.omitFromPDFIfEmpty && isEmpty() ) {
                    Y.log( 'Removing empty text element from pdf: ' + element.elemId, 'debug', NAME );
                    return;
                }

                //  add a single subelement for the background and border
                newSubElem = Y.dcforms.createSubElement(
                    0, 0,
                    element.mm.width, element.mm.height,
                    element.mm.height,
                    '', null
                );

                newSubElem.bgColor = element.bgColor;
                newSubElem.borderColor = element.borderColor;
                newSubElem.noncontent = true;                       //  allow size reduction
                element.subElements.push(newSubElem);

                if (!element.value ) {
                    element.value = '';
                }

                newSubElem = Y.dcforms.textToMatrixSubElements(
                    element.value,                              //  text to display
                    element.mm.width,                           //  width of matrix
                    element.extra,                              //  number of cells
                    element.font,                               //  typeface name
                    element.mm.lineHeight                       //  fontsize / height of cells
                );

                for (i = 0; i < newSubElem.length; i++) {
                    newSubElem[i].cursor = useCursor;
                    newSubElem[i].align = element.align || 'left';

                    newSubElem[i].isBold = element.isBold;
                    newSubElem[i].isItalic = element.isItalic;
                    newSubElem[i].isUnderline = element.isUnderline;

                    newSubElem[i].nocorrect = true;

                    element.subElements.push(newSubElem[i]);
                }


                //  add a single subelement for the interaction layer

                if ( !Y.dcforms.isOnServer && element.canEdit() ) {
                    newSubElem = Y.dcforms.createSubElement(
                        0, 0,
                        element.mm.width, element.mm.height,
                        element.mm.height,
                        '', null
                    );

                    newSubElem.cursor = useCursor;
                    newSubElem.noncontent = true;                       //  allow size reduction
                    newSubElem.bindmark = true;                         //  allow size reduction
                    newSubElem.hasHighlight = !element.readonly;        //  hint for touch devices
                    newSubElem.interactive = true;                      //  draw on interaction canvas and listen to mouse
                    element.subElements.push(newSubElem);
                }

                //  occasionally not set during redraw of text later in edit mode
                for ( i = 0; i < element.subElements.length; i++ ) {
                    element.subElements[i].element = element;
                }

            }

            /**
             *  Called when value of this element if changed
             */

            function setValue(newValue, callback) {
                newValue = Y.dcforms.stripHtml(newValue);
                newValue = newValue.replace(new RegExp('&nbsp;', 'g'), ' ');

                if (element.value !== newValue) {
                    element.page.isDirty = true;
                }

                element.value = newValue;

                if ('edit' === element.page.form.mode) {
                    element.defaultValue[element.page.form.userLang] = newValue;
                }

                if (element.page.form.valueEditor && element.page.form.selectedElement && element.page.form.selectedElement === element) {
                    element.page.form.valueEditor.setValue(newValue);
                    element.page.form.valueEditor.reposition();
                }

                generateSubElements();

                //  this element type is always synchronous
                callback(null);
            }

            /**
             *  Hook for sanitization and formatting
             *
             *  returns     {String}    Plain text
             */

            function getValue() {
                return element.value;
            }

            /**
             *  Elements have a number of display modes (edit|fill|pdf|lock|...etc), behavior should match
             *  @param  newMode     {string}    Name of new mode
             *  @param  callback    {function}  Of the form fn(err)
             */

            function setMode(newMode, callback) {
                if ('edit' === newMode) {
                    setValue(element.defaultValue[element.page.form.userLang], callback);
                    return;
                }

                if ( callback ) { return callback(null); }
            }

            /**
             *  Set a value according to schema binding
             *
             *  @param  newValue    {string}
             *  @param  callback    {function}  Called immediately
             */

            function map(newValue, callback) {
                element.value = newValue;
                setValue(newValue, callback);
            }

            /**
             *  Get value for schema binding
             */

            function unmap() {
                return element.value;
            }

            /**
             *  Called before unlinking this renderer
             */

            function destroy() {
                var jqMe = element.jqSelf();
                jqMe.html();
            }

            //  EVENT HANDLERS

            /**
             *  Show the text edit flyover
             *  @param selectedOn
             */

            function createValueEditor(selectedOn){
                function onValueSet() {
                    //Y.log('raising valueChanged event for FEM', 'debug', NAME);
                    element.page.form.raise('valueChanged', element);

                    //  update editor if value changes in underlying data
                    if ( element.page.form.valueEditor ) {
                        element.page.form.valueEditor.ignoreUpdates = false;
                    }
                }

                function onChange(newValue) {
                    //  silence update events in editor to prevent feedback
                    if ( element.page.form.valueEditor ) {
                        element.page.form.valueEditor.ignoreUpdates = true;
                    }

                    setValue(newValue, onValueSet);
                }

                element.page.form.valueEditor = Y.dcforms.createTextValueEditor(selectedOn, element, onChange);
            }

            /**
             *  Called when element has been changed in edit mode
             */

            function update(callback) {
                generateSubElements();
                if ( callback ) { return callback(null); }
            }

            /**
             *  Elements may have a variable number of tab stops
             *  @returns {number}
             */

            function countTabStops() {
                return element.canEdit() ? 1 : 0;
            }

            /**
             *  Controls whether some elements are shown in PDF when empty
             */

            function isEmpty() {
                return '' === element.value.trim();
            }

            //  SET UP AND RETURN THE NEW RENDERER
            initialize();
            pubMethods = {
                createValueEditor: createValueEditor,
                setMode: setMode,
                destroy: destroy,
                setValue: setValue,
                getValue: getValue,
                update: update,
                map: map,
                unmap: unmap,
                countTabStops: countTabStops,
                isEmpty: isEmpty
            };

            creationCallback( null, pubMethods );
        };

        Y.dcforms.textToMatrixSubElements = function(text, width, cols, font, lineHeight) {
            var
                subElements = [],
                nextSubElem,
                nextChar,
                numDivisions = ((parseInt(cols, 10) > 1) ? parseInt(cols, 10) : 1),
                colWidth = width / numDivisions,
                cursor = 0,
                i;

            for (i = 0; i < numDivisions; i++) {
                if (i < text.length) {
                    nextChar = text.substr(i, 1);
                    nextSubElem = Y.dcforms.createSubElement(
                        cursor,                                 //  left
                        (lineHeight / 2),                       //  top / MOJ 4264 adjustment
                        colWidth,                               //  width
                        lineHeight,                             //  height
                        lineHeight,                             //  lineHeight
                        nextChar,                               //  text
                        null                                    //  image
                    );

                    nextSubElem.font = font;
                    nextSubElem.align = 'center';

                    cursor = cursor + colWidth;
                    subElements.push(nextSubElem);
                }
            }

            return subElements;
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: ['dcforms-markdown-utils']
    }
);