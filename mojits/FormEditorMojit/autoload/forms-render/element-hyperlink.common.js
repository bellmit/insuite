/*
 *  Copyright DocCirrus GmbH 2018
 *
 *  YUI module to render hyperlink elements and attach element-specific events, MOJ-9530
 *
 *  Similar to a label, but with different defaults, own editor panel, and holding a URL in element.extra
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-hyperlink',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms hyperlink type.', 'debug', NAME);


        /**
         *  Factory method for hyperlink element renderers
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err, newRenderer)
         */

        Y.dcforms.elements.makeHyperlinkRenderer = function(element, creationCallback) {

            //  PRIVATE MEMBERS

            var
                isInitialized = false,
                pubMethods;

            //  PUBLIC METHODS

            /**
             *  Set up private members, event handlers, etc
             */

            function initialize() {

                if (!element.hasOwnProperty('extra') || 'string' !== typeof element.extra) {
                    element.extra = Y.dcforms.HYPERLINK_DEFAULT;
                }

                isInitialized = true;
            }

            /**
             *  Recreate subelements from the current element properties
             */

            function generateSubElements() {
                var
                    useCursor = (element.canEdit() ? 'pointer' : 'auto'),
                    newSubElem,
                    textSubElems,
                    i;

                element.subElements = [];

                //  may be hidden where client does not have KBV certification
                if ( true === element.isHiddenBFB ) { return; }

                //  add a single subelement for the background and border
                newSubElem = Y.dcforms.createSubElement(
                    0, 0,
                    element.mm.width, element.mm.height,
                    element.mm.height,
                    '', null
                );

                newSubElem.bgColor = element.bgColor;
                newSubElem.borderColor = element.borderColor;
                newSubElem.noncontent = true;                           //  allow size reduction

                if ( element.extra && '' !== element.extra ) {
                    //  add to subElement for export in PDF
                    newSubElem.linkUrl = element.extra;
                }

                element.subElements.push(newSubElem);

                if ( !element.value ) {
                    element.value = '';
                }

                //  parse and wrap markdown/text
                if ( ''  !== element.value ) {
                    textSubElems = Y.dcforms.markdownToSubElements(
                        element.value,                                  //  markdown text
                        element.font,                                   //  typeface name
                        ( element.mm.lineHeight ),                      //  line height
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
                        newSubElem.fgColor = element.fgColor;       //  fix inclusion of foreground color
                        //newSubElem.bgColor = 'rgba(0,0,0,0.4)';   //  transparent: element above colord background
                        newSubElem.align = element.align || 'left';
                        newSubElem.cloneInputGroup = element.elemId + 'input';

                        if ( 'edit' !== element.page.form.mode ) {
                            newSubElem.cursor = 'pointer';
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
                        0, 0,                                       //  left, top
                        element.mm.width, element.mm.height,        //  width, height
                        ( element.mm.lineHeight ),                  //  line height
                        '', null                                    //  text, image
                    );

                    newSubElem.interactive = true;                  //  respond to mouse and keyboard events
                    newSubElem.cloneable = true;                    //  can split over multiple fixed pages
                    newSubElem.cloneInputGroup = element.elemId + 'input';
                    newSubElem.useCursor = useCursor;
                    newSubElem.hasHighlight = !element.readonly;    //  hint for touch devices
                    newSubElem.noncontent = true;                   //  allow size reduction
                    newSubElem.bindmark = true;                     //  show binding

                    if ( 'edit' !== element.page.form.mode ) {
                        newSubElem.cursor = 'pointer';
                    }

                    element.subElements.push( newSubElem );
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
                callback( null );
            }

            function setUrl( newValue, callback ) {
                newValue = Y.dcforms.stripHtml( newValue );
                newValue = newValue.replace(new RegExp('&nbsp;', 'g'), ' ');

                if (element.extra !== newValue) {
                    element.page.isDirty = true;
                }

                element.extra = newValue;

                if ('edit' === element.page.form.mode) {
                    element.defaultValue[element.page.form.userLang] = newValue;
                }

                if (element.page.form.valueEditor && element.page.form.selectedElement && element.page.form.selectedElement === element) {
                    element.page.form.valueEditor.setValue(newValue);
                    element.page.form.valueEditor.reposition();
                }

                generateSubElements();

                //  this element type is always synchronous
                callback( null );
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
                //Y.log('Setting input to mode: ' + newMode);
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

            function createValueEditor( selectedOn ){
                function onValueSet() {
                    element.page.form.raise( 'valueChanged', element );

                    //  update editor if value changes in underlying data
                    if ( element.page.form.valueEditor ) {
                        element.page.form.valueEditor.ignoreUpdates = false;
                    }
                }

                function onChange( newValue ) {
                    //  silence update events in editor to prevent feedback
                    if ( element.page.form.valueEditor ) {
                        element.page.form.valueEditor.ignoreUpdates = true;
                    }

                    setValue( newValue, onValueSet );
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
             *  Open URL when user clicks on the hyperlink
             */

            function handleClick() {

                //   in edit mode, select  and open edit UI
                if ( 'edit' === element.page.form.mode ) {
                    element.page.form.setSelected( 'fixed', element );
                    return;
                }

                //  in other modes, open a new tab at element.extra
                if ( !element.extra || '' === element.extra || 'string' !== typeof element.extra ) {
                    //  invalid URL
                    Y.log( 'Not opening link, invalid URL: ' + element.extra, 'debug', NAME );
                    return;
                }

                var newTab = window.open( element.extra, '_blank' );
                newTab.focus();
            }

            //  SET UP AND RETURN THE NEW RENDERER
            initialize();
            pubMethods = {
                'createValueEditor': createValueEditor,
                'handleClick': handleClick,
                'setMode': setMode,
                'destroy': destroy,
                'setValue': setValue,
                'getValue': getValue,
                'setUrl': setUrl,
                'update': update,
                'map': map,
                'unmap': unmap,
                'countTabStops': countTabStops
            };

            creationCallback( null, pubMethods );
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: ['dcforms-markdown-utils']
    }
);