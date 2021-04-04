/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render textarea elements and attach element-specific events
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-textarea',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms textarea types.', 'debug', NAME);


        /**
         *  Factory method for input element renderers - these make the actual DOM elements representing an element
         *
         *  Context specific to this instance is kept in the renderer, code common to all instances is linked in
         *  the closure to save memory.
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err, newRenderer)
         */

        Y.dcforms.elements.makeTextareaRenderer = function(element, creationCallback) {

            //  PRIVATE MEMBERS

            var
                textScale = 1,
                pubMethods;


            //  PUBLIC METHODS

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
                    bgSubElem,
                    textSubElems,
                    newSubElem,
                    contentHeight = element.mm.height,
                    hasOverflow = false,
                    i;

                //  Do not create any subelements if
                //  (*) this element is empty
                //  (*) we are on server and this is to be omitted from PDF

                if ( Y.dcforms.isOnServer && element.omitFromPDFIfEmpty && isEmpty() ) {
                    Y.log( 'Removing empty text element from pdf: ' + element.elemId, 'debug', NAME );
                    element.subElements = [];
                    return;
                }

                if (element.mm.height < element.mm.lineHeight) {
                    element.mm.height = element.mm.lineHeight;
                }

                element.subElements = [];

                //  add a single subelement for the background and border
                bgSubElem = Y.dcforms.createSubElement(
                    0, 0,
                    element.mm.width, element.mm.height,
                    element.mm.height,
                    '', null
                );

                bgSubElem.cloneInputGroup = element.elemId + 'input';
                bgSubElem.cursor = useCursor;
                bgSubElem.bgColor = element.bgColor;
                bgSubElem.borderColor = element.borderColor;
                bgSubElem.cloneable = true;                    //  can split over multiple fixed pages

                element.bgSubElem = bgSubElem;

                element.subElements.push( bgSubElem );

                if ( !element.value ) {
                    element.value = '';
                }

                //  parse and wrap markdown/text
                if ( ''  !== element.value ) {
                    textSubElems = Y.dcforms.markdownToSubElements(
                        element.value,                                  //  markdown text
                        element.font,                                   //  typeface name
                        ( element.mm.lineHeight * textScale ),          //  line height
                        parseFloat( element.mm.lineSpace ),             //  leading factor
                        0,                                              //  x offset (mm)
                        0,                                              //  y offset (mm)
                        element.align,                                  //  text alignment (left / right / center)
                        element.mm.width,                               //  wrapping width (mm)
                        element.isBold,                                 //  make bold
                        element.isItalic,                               //  make italic
                        element.isUnderline                             //  make underlined
                    );

                    for (i = 0; i < textSubElems.length; i++) {
                        newSubElem = textSubElems[i];
                        newSubElem.cursor = useCursor;

                        newSubElem.fgColor = newSubElem.overrideColor || element.fgColor;       //  fix inclusion of foreground color

                        //newSubElem.bgColor = 'rgba(0,0,0,0.4)';   //  transparent: element above colord background
                        newSubElem.align = element.align || 'left';
                        newSubElem.cloneInputGroup = element.elemId + 'input';

                        if ((newSubElem.top + newSubElem.height) > (element.mm.height + 1)) {
                            hasOverflow = true;
                            contentHeight = newSubElem.top + newSubElem.height;
                        }

                        if (element.clipOverflow) {
                            //  elements are given +1 mm to prevent slight rendering variations from dropping lines
                            if ((newSubElem.top + newSubElem.height) < (element.mm.height + 1)) {
                                element.subElements.push(newSubElem);
                            }
                        } else {
                            element.subElements.push(newSubElem);
                        }
                    }
                }

                //  add a single subelement for the interaction layer
                if ( element.canEdit() ) {
                    newSubElem = Y.dcforms.createSubElement(
                        0, 0,                                   //  left, top
                        element.mm.width, contentHeight,        //  width, height
                        ( element.mm.lineHeight * textScale ),  //  line height
                        '', null                                //  text, image
                    );

                    newSubElem.interactive = true;                  //  respond to mouse and keyboard events
                    newSubElem.cloneable = true;                    //  can split over multiple fixed pages
                    newSubElem.cloneInputGroup = element.elemId + 'input';
                    newSubElem.useCursor = useCursor;
                    newSubElem.hasHighlight = !element.readonly;    //  hint for touch devices
                    newSubElem.noncontent = true;                   //  allow size reduction
                    newSubElem.bindmark = true;                     //  show binding
                    newSubElem.hasError = !isValid();               //  show validation
                    element.subElements.push( newSubElem );
                }

                //  halve font size if text overflows and scaleOverflow is true
                if ( element.scaleOverflow && hasOverflow && textScale > 0.01 ) {
                    textScale = textScale / 2;
                    generateSubElements();
                } else {
                    //  stretch the background element to content size (color + border)
                    bgSubElem.height = contentHeight;
                    bgSubElem.cloneInputGroup = element.elemId + 'input';
                }
            }

            /**
             *  Force a mapped or set value to the maximum length for this element, if set
             *  @param txt
             */

            function enforceLength(txt) {
                if ( 'string' !== typeof txt ) {
                    txt = txt && txt.toString ? txt.toString() : txt + '';
                }

                txt = txt.replace(new RegExp('<br/>', 'g'), "\n");
                txt = txt.replace(new RegExp('{{br}}', 'g'), "\n");
                txt = txt.replace(new RegExp('{br}', 'g'), "\n");

                if ('edit' === element.page.form.mode) {
                    return txt;
                }

                if (!element.maxLen || '' === element.maxLen || 0 === element.maxLen) {
                    //  no limit
                    element.maxLen = 0;
                    return txt;
                }

                txt = txt.substr(0, element.maxLen);
                return txt;
            }

            /**
             *  Called when value of this element if changed
             */

            function setValue(newValue, callback) {
                newValue = Y.dcforms.stripHtml(newValue);

                newValue = enforceLength(newValue);

                if (element.value !== newValue) {
                    element.page.isDirty = true;
                }

                element.value = newValue;

                if ('edit' === element.page.form.mode) {
                    element.defaultValue[ element.getCurrentLang() ] = newValue;
                }

                textScale = 1;
                generateSubElements();
                if (element.page.form.valueEditor && element.page.form.selectedElement && element.page.form.selectedElement === element) {
                    element.page.form.valueEditor.setValue(newValue);
                    element.page.form.valueEditor.reposition();
                }

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
                if ( 'number' === typeof newValue ) {
                    newValue = newValue + '';
                }
                if ( 'string' !== typeof newValue ) {
                    newValue = JSON.stringify( newValue );
                }

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
                if ( Y.dcforms.isOnServer ) {
                    return;
                }
                var jqMe = element.jqSelf();
                jqMe.html();
            }

            //  EVENT HANDLERS

            /**
             *  Show the text edit flyover or open a modal for larger text inputs
             *  @param selectedOn
             */

            function createValueEditor( /* selectedOn */ ){
                function onValueSet() {
                    //Y.log('raising valueChanged event for FEM', 'debug', NAME);
                    element.page.form.raise('valueChanged', element);
                    element.page.redraw(Y.dcforms.LAYER_TEXT);
                }

                function onChange(newValue) {
                    //  do not trigger a render if content has not changed: arrow key events, etc
                    if ( newValue === element.value ) { return; }

                    if ( element.page.form.valueEditor ) {
                        //  prevent circular updates / event feedback
                        element.page.form.valueEditor.ignoreUpdates = true;
                    }

                    setValue( newValue, onValueSet );

                    window.setTimeout(function asyncTextValueChange() {
                        if ( !element.page.form.valueEditor ) { return false; }
                        element.page.form.valueEditor.ignoreUpdates = true;
                    }, 10);
                }

                if ( !element.useMarkdownEditor || element.page.form.isFromToolbox ) {
                    element.page.form.valueEditor = Y.dcforms.createMarkdownValueEditor('fixed', element, onChange);
                } else {

                    if ( 'edit' !== element.page.form.mode ) {
                        element.page.form.raise( 'requestMarkdownModal', element );
                    } else {
                        element.page.form.valueEditor = Y.dcforms.createMarkdownValueEditor('fixed', element, onChange);
                    }
                }
            }

            /**
             *  Called when element has been changed in edit mode
             */

            function update(callback) {
                textScale = 1;
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
             *  Simple form element validation, EXTMOJ-861
             */

            function isValid() {
                if ( !element.validate.notEmpty ) { return true; }
                if ( '' === element.value.trim() ) { return false; }
                return true;
            }

            /**
             *  Controls whether some elements are shown in PDF when empty
             */

            function isEmpty() {
                return '' === element.value.trim();
            }

            //  SET UP AND RETURN THE NEW RENDERER
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
                isValid: isValid,
                isEmpty: isEmpty
            };

            creationCallback( null, pubMethods );
        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'dcforms-markdown-utils', 'edittext-modal' ]
    }
);