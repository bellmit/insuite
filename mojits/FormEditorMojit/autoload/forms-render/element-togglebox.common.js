/*
 *  Copyright DocCirrus GmbH 2017
 *
 *  YUI module to render specialised element which toggles a text value, boolean type, similar to a checkbox
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*jshint latedef:false */

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-togglebox',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms togglebox type.', 'debug', NAME);

        /**
         *  Factory method for label element renderers - these make the actual DOM elements representing an element
         *
         *  Context specific to this instance is kept in the renderer, code common to all instances is linked in
         *  the closure to save memory.
         *
         *  @param  element             {object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {function}  Of the form fn(err)
         */

        Y.dcforms.elements.makeToggleboxRenderer = function(element, creationCallback) {

            //  PRIVATE MEMBERS

            var
                isChecked = false,
                label = 'X',
                pubMethods;

            //  PUBLIC METHODS

            /**
             *  Set up private members, event handlers, etc
             */

            function initialize() {
                isChecked = getCheckState( element.value );
                label = getLabel( element.value );

                //  'checked' is marked with a '*' in the serialized value
                //  deprecated
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
                //  check if locked, in PDF mode, or element is read-only
                if (false === element.canEdit()) {
                    Y.log('element.canEdit() in mode ' + element.page.form.mode + ': ' + JSON.stringify(element.canEdit()), 'debug', NAME );
                    return;
                }

                //  if not checked then toggle true
                isChecked = !isChecked;

                element.page.isDirty = true;
                element.display = isChecked ? 'true' : 'false';

                element.value = ( isChecked ? '*' : '' ) + label;
                if ('edit' === element.page.form.mode) {
                    element.defaultValue[element.page.form.userLang] = element.value;
                }

                //  if this checkbox is marked true then others in the same group must be marked false
                //  (has no effect if element.maxLen !== 0, MOJ-8710)
                if ( isChecked ) {
                    Y.dcforms.elements.checkboxUtils.unsetFromGroup( element, isChecked );
                }

                //  set/unset red border caused by invalid group
                Y.dcforms.elements.checkboxUtils.checkGroupValid( element, isChecked );

                generateSubElements();

                element.isDirty = true;
                //  redraw only text layer
                element.page.redraw( Y.dcforms.LAYER_TEXT );
                //element.page.redrawDirty();
                element.page.form.raise( 'valueChanged', element );

                //renderAbstract(element.lastOffset, Y.dcforms.nullCallback);
            }

            /**
             *  Set checkbox value
             *
             *  @param  newValue    {String}    Either '*', 'true' or TRUE to set, all other values clear
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function setValue( newValue, callback ) {
                //  accept boolean values from mappers
                if ( 'true' === newValue || true === newValue ) {
                    newValue = '*' + label;
                }

                if ( 'false' === newValue || false === newValue ) {
                    newValue = label;
                }

                if (element.value !== newValue) {
                    element.page.isDirty = true;
                }

                element.value = newValue;
                isChecked = getCheckState( newValue );
                label = getLabel( newValue );

                if ('edit' === element.page.form.mode) {
                    element.defaultValue[element.page.form.userLang] = newValue;
                }

                //  do not allow the width to be less than the line height (minimum size of sprite)
                if (element.mm.width < element.mm.lineHeight) {
                    element.mm.width = element.mm.lineHeight;
                }

                //  when marking a checkbox true, uncheck any others in the same group
                //  (has no effect if element.maxLen !== 0, MOJ-8710)
                if ( isChecked ) {
                  Y.dcforms.elements.checkboxUtils.unsetFromGroup( element, isChecked );
                }

                //  recreate elements
                generateSubElements();

                //  add or remove 'hasError' outline from other members of the group
                Y.dcforms.elements.checkboxUtils.checkGroupValid( element, isChecked );

                callback(null);
            }

            function getValue() {
                return element.value;
            }

            /**
             *  Paint this element onto the abstract canvas
             *
             *  @param  voffset     {Number}
             *  @param  callback    {Function}
             */

            function renderAbstract( voffset, callback ) {

                //  element may be hidden where client does not have KBV certification
                if ( true === element.isHiddenBFB ) {
                    element.subElements = [];
                    callback( null );
                    return;
                }

                if ( !element.subElements || 0 === element.subElements.length ) {
                    generateSubElements();
                }

                var
                    ctx = element.page.canvasElastic.getContext('2d'),
                    zoom = element.page.form.zoom,
                    drawBg,
                    subElem,
                    i;

                //  element may be hidden where client does not have KBV certification
                if ( true === element.isHiddenBFB ) {
                    callback(null);
                    return;
                }

                for ( i = 0; i < element.subElements.length; i++ ) {
                    subElem = element.subElements[i];
                    subElem.bgColor = element.bgColor;
                    subElem.fgColor = element.fgColor;
                    //subElem.height = element.mm.lineHeight;
                    drawBg = element.hasOwnProperty( 'noncontent' );
                    
                    subElem.renderToCanvas( ctx, zoom, element.mm.left, element.mm.top, voffset, drawBg, 'abstract' );
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
                    isInvalid = !isValid(),
                    txtLines = [],
                    bgSe,                       //  background
                    intSe,                      //  interaction
                    i;

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
                bgSe.cursor = 'pointer';
                bgSe.noncontent = true;
                bgSe.bgColor = element.bgColor;
                bgSe.borderColor = element.borderColor;

                element.subElements.push(bgSe);

                //  wrapped label text, if any
                if ( label && '' !== label && isChecked ) {

                    //  disambiguate * in boolean types
                    while ( -1 !== label.indexOf('[bold]') ) {
                        label = label.replace('[bold]', '**');
                    }

                    txtLines = Y.dcforms.markdownToSubElements(
                        label,                                          //  markdown text
                        element.font,                                   //  typeface name
                        element.mm.lineHeight,                          //  line height
                        parseFloat( element.mm.lineSpace ),             //  leading factor
                        0,                                              //  x offset (mm)
                        0,                                              //  y offset (mm)
                        element.align,                                  //  text alignment (left / right / center)
                        element.mm.width,                               //  wrapping width (mm)
                        element.isBold,                                 //  make bold
                        element.isItalic,                               //  make italic
                        element.isUnderline                             //  make underlined
                    );

                    for (i = 0; i < txtLines.length; i++) {
                        txtLines[i].fgColor = element.fgColor;
                        element.subElements.push( txtLines[i] );
                    }
                }

                //  interaction layer
                if ( element.canEdit() ) {
                    intSe = Y.dcforms.createSubElement(
                        0, 0,                                           //  left, top
                        element.mm.width, element.mm.height,            //  width, height
                        element.mm.lineHeight, '', null                 //  lineheight, text, image
                    );

                    intSe.hasError = isInvalid;
                    intSe.cursor = 'pointer';
                    intSe.hasHighlight = !element.readonly;             //  hint for touch devices
                    intSe.interactive = true;
                    intSe.noncontent = true;
                    intSe.bindmark = true;                              //  show binding
                    intSe.special = 'itse';

                    element.subElements.push( intSe );
                }

            }

            function getLabel( fromValue ) {
                var label = fromValue + '';

                if ( '*' === label.substr( 0, 1 ) ) {
                    label = label.substr( 1 );
                }

                return label;
            }

            function getCheckState( fromValue ) {
                var temp = fromValue || '';
                return ( '*' === temp.substring( 0, 1 ) );
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
             *  Toggle box has no mode-specific behavior
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

            function map(newValue, callback) {

                if ( true === newValue || 'true' === newValue || 'True' === newValue || 'TRUE' === newValue ) {
                    newValue = '*' + label;
                }

                if ( false === newValue || 'false' === newValue || 'False' === newValue  || 'FALSE' === newValue ) {
                    newValue = label;
                }

                element.page.isDirty = true;
                isChecked = getCheckState( newValue );
                label = getLabel( newValue );

                element.exportValue = isChecked;
                element.value = newValue;
                element.display = isChecked ? 'true' : 'false';
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
                //  in fll mode parent will also receive event, this check prevents double toggle
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
                    if ( element.subElements[i].special && 'bgse' === element.subElements[i].special ) {
                        element.subElements[i].hasError = isInvalid;
                    }
                }
            }

            /**
             *  Currently no value editor for these
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

            creationCallback( null, pubMethods );
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: [ 'dcforms-checkbox-groups' ]
    }
);