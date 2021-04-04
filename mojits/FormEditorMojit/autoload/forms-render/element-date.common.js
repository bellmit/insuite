/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render a date element and launch datepicker on selection
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-date',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms date type.', 'debug', NAME);

        /**
         *  Factory method for date element renderers - these make the actual DOM elements representing an element
         *
         *  Context specific to this instance is kept in the renderer, code common to all instances is linked in
         *  the closure to save memory.
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err, newRenderer)
         */

        Y.dcforms.elements.makeDateRenderer = function(element, creationCallback) {

            //  PRIVATE MEMBERS

            var
                _moment = Y.dcforms.mapper.objUtils.getMoment(),
                isInitialized = false,
                pubMethods;


            //  PUBLIC METHODS

            /**
             *  Set up private members, event handlers, etc
             */

            function initialize() {
                //  no dependant objects at present
                if (!element.extra || '' === element.extra) {
                    element.extra = 'DD.MM.YYYY';
                }
                setValue('', Y.dcforms.nullCallback);
                isInitialized = true;
            }

            /**
             *  Refresh the display of this element in the DOM, but only if necessary
             *  @param  callback    {function}  Of the form fn(err)
             */

            function renderAbstract(voffset, callback) {
                if (false === isInitialized) {
                    initialize();
                }

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    callback(null);
                    return;
                }
                
                var
                    ctx = element.page.canvasElastic.getContext('2d'),
                    zoom = element.page.form.zoom,
                    subElem,
                    i;

                //  value not set
                if (0 === element.subElements.length) {
                    Y.log('rendering textarea before value has been set', 'warn', NAME);
                }

                //console.log('Rendering into: ', pxBox);

                for (i = 0; i < element.subElements.length; i++) {
                    subElem = element.subElements[i];
                    subElem.fgColor = element.fgColor;
                    subElem.width = element.mm.width;
                    subElem.font = element.font;
                    subElem.nocorrect = true;
                    subElem.renderToCanvas(ctx, zoom, element.mm.left, element.mm.top, voffset, true, 'abstract');
                }

                callback(null);
            }

            /**
             *  Date elements have a minimum of two subelements:
             *      - a boundary box for displaying outline and background color, and responding to clicks
             *      - a set of text elements showing a possibly wrapped date field
             */

            function generateSubElements() {

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    return;
                }

                var
                    useCursor = (element.canEdit() ? 'pointer' : 'auto'),
                    newSubElem,
                    i;

                element.subElements = [];

                //  add a single subelement for the background and border
                newSubElem = Y.dcforms.createSubElement(
                    0, 0,
                    element.mm.width, element.mm.height,
                    element.mm.lineHeight,
                    '', null
                );
                newSubElem.bgColor = element.bgColor;
                newSubElem.borderColor = element.borderColor;
                newSubElem.noncontent = true;
                element.subElements.push(newSubElem);

                if ( !element.display ) {
                    element.display = '';
                }

                //  wrapped date text, if any
                newSubElem = Y.dcforms.markdownToSubElements(
                    element.display || '',                              //  markdown text
                    element.font,                                       //  typeface name
                    element.mm.lineHeight,                              //  line height
                    parseFloat(element.mm.lineSpace),                   //  leading factor
                    0,                                                  //  x offset (mm)
                    0,                                                  //  y offset (mm)
                    element.align,                                      //  text alignment (left / right / center)
                    element.mm.width,                                   //  wrapping width (mm)
                    element.isBold,                                     //  make bold
                    element.isItalic,                                   //  make italic
                    element.isUnderline                                 //  make underlined
                );

                for (i = 0; i < newSubElem.length; i++) {
                    newSubElem[i].cursor = useCursor;
                    newSubElem[i].fgColor = element.fgColor;
                    element.subElements.push(newSubElem[i]);
                }

                //  add an element for the interaction layer
                if ( !Y.dcforms.isOnServer ) {
                    newSubElem = Y.dcforms.createSubElement(
                        0, 0,
                        element.mm.width, element.mm.height,
                        element.mm.lineHeight,
                        '', null
                    );
                    newSubElem.noncontent = true;
                    newSubElem.bindmark = true;                     //  show binding
                    newSubElem.hasHighlight = !element.readOnly;    //  hint for touch devices
                    newSubElem.cursor = useCursor;
                    newSubElem.hasError = !isValid();
                    newSubElem.interactive = true;
                    element.subElements.push(newSubElem);
                }

                //console.log('created subelements for date picker ', element.subElements);
            }

            /**
             *  Elements have a number of display modes (edit|fill|pdf|lock|...etc), behavior should match
             *  @param  newMode     {string}    Name of new mode
             *  @param  callback    {function}  Of the form fn(err)
             */

            function setMode( newMode, callback ) {
                callback( null );
            }

            /**
             *  Set a value according to schema binding, same as setValue in this element
             *
             *  @param  newValue    {string}
             *  @param  callback    {function}  Called immediately
             */

            function map(newValue, callback) {
                setValue(newValue, callback);
            }

            /**
             *  Get value for schema binding
             */

            function unmap() {
                return getValue();
            }

            /**
             *  Set value and update canvas representation of this element
             */

            function setValue(newValue, callback) {

                //  handle legacy date formats, convert to UTC
                //  (dates are now represented as full UTC dates, where before they were DD.MM.YY or DD.MM.YYYY strings)

                var newValueObj = parseDate( newValue || '' );

                if ( !newValueObj ) {
                    if ( element.extra && '' !== element.extra ) {
                        try {
                            newValueObj = _moment( newValue, element.extra );
                        } catch ( dateParseErr ) {
                            Y.log( 'Error parsing date ' + newValue + ' with format ' + element.extra, 'warn', NAME );
                            newValue = '';
                        }
                    } else {
                        Y.log( 'Unable to parse date without format: ' + newValue, 'warn', NAME );
                        newValue = '';
                    }
                }

                /*
                if (newValue === element.value && 0 !== element.subElements.length) {
                    callback(null);
                    return;
                }
                */

                if (element.value !== newValue) {
                    element.page.isDirty = true;
                }

                element.value = newValue;

                if ('' === newValue || !newValueObj ) {
                    element.display = '';
                } else {
                    element.display = _moment( newValueObj ).format(element.extra);
                }

                if (element.page.form.valueEditor && element.page.form.selectedElement && element.page.form.selectedElement === element) {
                    element.page.form.valueEditor.setValue( newValue );
                    element.page.form.valueEditor.reposition();
                }

                generateSubElements();
                callback(null);
            }

            /**
             *  Read a string in common DC date formats into a moment date
             *
             *  @param strDate  {String}
             *  @returns        {Object}
             */

            function parseDate( strDate ) {
                var objDate = null;

                if ( 'object' === typeof strDate ) {
                    return strDate;
                }

                if ( ( 'string' === typeof strDate ) && ( 6 === Y.dcforms.trim(strDate).length ) ) {
                    objDate = _moment( strDate, 'DDMMYY' ); //.toString();
                }

                if ( ( 'string' === typeof strDate ) && ( 8 === Y.dcforms.trim(strDate).length ) ) {
                    objDate = _moment( strDate, 'DD.MM.YY' ); //.toString();
                }

                if ( ( 'string' === typeof strDate ) && ( 10 === Y.dcforms.trim(strDate).length ) ) {
                    objDate = _moment( strDate, 'DD.MM.YYYY' ); //.toString();
                }

                if ( ( 'string' === typeof strDate ) && ( 33 === Y.dcforms.trim(strDate).length ) ) {
                    objDate = _moment( new Date( strDate ) ); //.toString();
                }

                if ( !objDate ) {
                    Y.log( 'Guessing format of date (' + strDate.length + '): ' + strDate, 'debug', NAME );
                    objDate = new Date( strDate );
                }

                return objDate;
            }

            function getValue() {
                return element.value;
            }

            /**
             *  Called before unlinking this renderer
             */

            function destroy() {
                var jqMe = element.jqSelf();
                jqMe.html('');
            }

            //  EVENT HANDLERS

            function handleKeyDown(e) {
                //TODO: pop value editor on space or enter keys
                //  parent object handles general key events
                element.onKeyDown(e);
            }

            function createValueEditor(selectedOn) {
                function onValueSet() {
                    element.page.form.raise('valueChanged', element);
                    element.isDirty = true;
                    element.page.redrawDirty();
                }

                function onChange(newValue) {
                    var newValueObj = parseDate( newValue );
                    if ( newValueObj && newValueObj.isValid && newValueObj.isValid() ) {
                        setValue( newValueObj.toString() , onValueSet);
                    }
                }

                if ('locked' === element.page.form.mode) {
                    return;
                }

                element.page.form.valueEditor = Y.dcforms.createDateValueEditor(selectedOn, element, onChange);
            }

            /**
             *  Reset all subelements contained with this element
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
             *  Simple form element validation, EXTMOJ-861
             */

            function isValid() {
                if ( !element.validate.notEmpty ) { return true; }
                if( !element.value || '' === element.value.trim() ||
                    !_moment( element.value ).isValid() ) {
                    return false;
                }
                return true;
            }

            //  SET UP AND RETURN THE NEW RENDERER

            initialize();

            pubMethods = {
                'renderAbstract': renderAbstract,
                'setMode': setMode,
                'setValue': setValue,
                'getValue': getValue,
                'destroy': destroy,
                'handleKeyDown': handleKeyDown,
                'update': update,
                'map': map,
                'unmap': unmap,
                'createValueEditor': createValueEditor,
                'countTabStops': countTabStops,
                'parseDate': parseDate
            };

            creationCallback( null, pubMethods );
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'dcformmap-util']
    }
);