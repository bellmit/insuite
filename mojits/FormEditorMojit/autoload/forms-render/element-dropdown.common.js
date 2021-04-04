/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to render table elements and attach element-specific events
 */

/*eslint no-control-regex:0, prefer-template:0, strict:0 */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-dropdown',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms dropdown element type.', 'debug', NAME);

        /**
         *  Create a renderer for dropdown type elements
         *
         *  @param  element             {Object}    A dcforms-element
         *  @param  creationCallback    {Function}  Of the form fn(err)
         */

        Y.dcforms.elements.makeDropdownRenderer = function(element, creationCallback) {

            var
                items,
            //  displayValue = '',          //  corresponds to selected value
                defaultValue = '',
                pubMethods;

            //  EXTMOJ-986 record initial default value of element, used when comparing notEmpty
            function initialize() {
                var
                    defaultItems = valueToItems( element ),
                    i;

                for ( i = 0; i < defaultItems.length; i++ ) {
                    if ( defaultItems[i].selected ) {
                        defaultValue = defaultItems[i].value;
                    }
                }

            }

            /**
             *  Change the current value of this dropdown
             *
             *  @param  newValue    {String}    Serialized version of selectable list
             *  @param  callback    {Function}  Of the form fn(err)
             */

            function setValue( newValue, callback ) {

                //  some legacy mappers add HTML line breaks
                newValue = newValue.replace( new RegExp( '<br/>', 'g' ), '{{br}}' );

                //  may be hidden where client does not have KBV certification
                if (true === element.isHiddenBFB) {
                    callback(null);
                    return;
                }

                var
                    initialSelectedIndex = getSelectedIndex(),
                    userLang = element.getBestLang();

                if (element.value !== newValue) {
                    element.page.isDirty = true;
                }

                element.value = newValue;

                if (true === element.enumLoaded) {
                    items = enumToItems(element);

                    if (
                        element.enumObj &&
                        element.enumObj.hasOwnProperty(element.schemaType) &&
                        element.enumObj[element.schemaType].hasOwnProperty('translate') &&
                        element.enumObj[element.schemaType].translate.hasOwnProperty(element.display) &&
                        element.enumObj[element.schemaType].translate[element.display].hasOwnProperty(userLang)
                    ) {
                        element.display = element.enumObj[element.schemaType].translate[element.display][userLang];
                    }

                } else {
                    items = valueToItems(element);
                    if ( -1 === initialSelectedIndex ) {
                        //  select first item if none yet chosen
                        initialSelectedIndex = 0;
                    }

                    if (  items[ initialSelectedIndex ] ) {
                        setSelected( items[ initialSelectedIndex ].value );
                    }
                }

                generateSubelements();

                //  if this element is currently selected then the editor overlay must be updated
                if (
                    element.page.form.selectedElement &&
                    element === element.page.form.selectedElement &&
                    element.page.form.valueEditor
                ) {
                    Y.log( 'Updating open editor with new value: ' + newValue, 'debug', NAME );
                    element.page.form.valueEditor.updateItems();
                }

                callback(null);
            }

            function getValue() {
                return element.value;
            }

            //  hacky solution to setValue issue MOJ-8109 - on server fromDict can call back after setValue but before
            //  setSelected completes, leading to invalid value in element, which is stored in formDoc, leading to
            //  further problems creating PDF and re-opening activity.

            function setValueAndSelected( newValue, newSelection, callback ) {
                setValue( newValue, onValueSet );
                function onValueSet( err ) {
                    if ( err ) { return callback( err ); }
                    setSelected( newSelection );
                    callback( null );
                }
            }

            /**
             *  List type elements map the selected value in the list
             *  @returns    {String}
             */

            function map(newValue, callback) {
                var i;
                if ( Array.isArray( newValue ) ) {
                    //  replace newlines inside singe options with break markdown,
                    //  prevent addresses from splitting into multiple entries, MOJ-11407
                    for ( i = 0; i < newValue.length; i++ ) {
                        if ( 'string' === typeof newValue[i] ) {
                            newValue[i] = newValue[i].replace( new RegExp( "\n", 'g' ), '{{br}}' );     //  eslint-disable-line no-control-regex
                        }
                    }
                    return setValue( newValue.join( '\n' ), callback );
                }
                setSelected(newValue);
                callback(null);
            }

            /**
             *  List type elements map the selected value in the list
             *  @returns    {String}
             */

            function unmap() {
                return element.display;
            }

            function setMode(newMode, callback) {
                //  mode has no effect on this element
                callback(null);
            }

            function destroy() {
                items = [];
            }

            /**
             *  Open the dropdown
             *
             *  @param  selectedOn  {String}    Context in which this selection was made
             */

            function createValueEditor( selectedOn ) {

                function onChange(newValue, clearEditor) {
                    setSelected( addInlineBreaks( newValue ) );
                    if (true === clearEditor) {
                        element.page.form.valueEditor.destroy();
                    }
                    element.isDirty = true;
                    element.page.redrawDirty();
                    element.page.form.raise('valueChanged', element);
                }

                if ( 'fill' !== element.page.form.mode ) { return; }

                element.page.form.valueEditor = Y.dcforms.createDropdownValueEditor( selectedOn, element, onChange );
            }

            /**
             *  Return the option set for this dropdown (used to edit forms)
             */

            function getItems() {
                return items;
            }

            /**
             *  Set the selected option
             */

            function setSelected( newValue ) {
                var
                    i, found = false;

                element.page.isDirty = true;

                if ( 'string' !== typeof newValue ) {  newValue = newValue + ''; }

                for (i = 0; i < items.length; i++) {
                    if (items[i].value === newValue) {
                        element.display = newValue;
                    //    displayValue = newValue;
                        items[i].selected = true;
                        found = true;
                    } else {
                        items[i].selected = false;
                    }
                }
                //  disallow user values in edit mode (edit default values, not current value)
                if (false === found  && 'edit' === element.page.form.mode) {
                    generateSubelements();
                    return;
                }

                //  if not one of the existing options then the user may have types in their own value
                if (false === found) {
                    for (i = 0; i < items.length; i++) {
                        if (items[i].user) {
                            items[i].value = newValue;
                            items[i].selected = true;
                            element.display = newValue;
                            found = true;
                        }
                    }
                }

                //  if not found and no existing user value then add this as new user value
                if (false === found) {
                    items.push({
                        'index': items.length,
                        'domId': element.domId + 'opt' + i,
                        'value': newValue,
                        'label': newValue,
                        'user': true,
                        'selected': true
                    });
                    element.value = itemsToValue(items, element.display);
                    element.display = newValue;
                }

                //  may be hidden where client does not have KBV certification
                if ( true === element.isHiddenBFB ) {
                    return;
                }

                if (
                    element.page.form.valueEditor &&
                    element.page.form.selectedElement &&
                    element.page.form.selectedElement === element
                ) {
                    element.page.form.valueEditor.setValue(newValue);
                }

                generateSubelements();
            }

            function getSelectedIndex() {
                var i;
                if ( !items ) { return -1; }
                for ( i = 0; i < items.length; i++ ) {
                    if ( items[i].selected ) { return i; }
                }
                return -1;
            }

            function generateSubelements() {
                var
                    useCursor = (element.canEdit() ? 'pointer' : 'auto'),
                    displayValue,
                    bgSubelem,
                    intSubelem,
                    textSe,
                    i;

                //  MOJ-8104 due to a bug in a previous version, element.display could be set to []
                if ( !element.display || !element.display.replace ) { element.display = ''; }

                displayValue = element.display
                    .replace('*', '')
                    .replace( new RegExp( '<br/>', 'g' ), '\n' )
                    .replace( new RegExp( '{{br}}', 'g' ), '\n' )
                    .replace( new RegExp( '{br}', 'g' ), '\n' );

                element.subElements = [];

                //  add a single subelement for the background and border
                bgSubelem = Y.dcforms.createSubElement(
                    0, 0,
                    element.mm.width, element.mm.height,
                    element.mm.height,
                    '', null
                );

                bgSubelem.cursor = useCursor;
                bgSubelem.bgColor = element.bgColor;
                bgSubelem.borderColor = element.borderColor;
                bgSubelem.noncontent = true;                    //  allow size reduction

                element.subElements.push(bgSubelem);

                textSe = Y.dcforms.markdownToSubElements(
                    displayValue,                               //  markdown text
                    element.font,                               //  typeface name
                    element.mm.lineHeight,                      //  line height
                    parseFloat(element.mm.lineSpace),           //  leading factor
                    0,                                          //  x offset (mm)
                    0,                                          //  y offset (mm)
                    element.align,                              //  text alignment (left / right / center)
                    element.mm.width,                           //  wrapping width (mm)
                    element.isBold,                             //  make bold
                    element.isItalic,                           //  make italic
                    element.isUnderline                         //  make underlined
                );

                for (i = 0; i < textSe.length; i++) {
                    textSe[i].cursor = useCursor;
                    textSe[i].fgColor = element.fgColor;
                    element.subElements.push(textSe[i]);
                }

                //  add a single subelement for the interaction layer
                if ( !Y.dcforms.isOnServer ) {
                    intSubelem = Y.dcforms.createSubElement(
                        0, 0,
                        element.mm.width, element.mm.height,
                        element.mm.height,
                        '', null
                    );
                    intSubelem.hasHighlight = !element.readonly;     //  hint for touch devices
                    intSubelem.hasError = !isValid();
                    intSubelem.bindmark = true;                      //  show binding
                    intSubelem.interactive = true;
                    intSubelem.noncontent = true;                    //  allow size reduction

                    element.subElements.push(intSubelem);
                }
            }

            /**
             *  Raised when element properties change (font, bg color, size, etc)
             *  @param callback
             */

            function update(callback) {
                setSelected( element.display );
                if ( callback ) { return callback(null); }
            }

            /**
             *  Open or update value editor on click
             */

            function handleClick(localized) {
                Y.log('clicked dropdown: ' + localized.x + ', ' + localized.y, 'debug', NAME);
                element.page.form.setSelected( 'fixed', element );
            }

            function addInlineBreaks( txt ) {
                txt = txt.replace( new RegExp( '\r\n', 'g' ), '{{br}}' );
                txt = txt.replace( new RegExp( '\n', 'g' ), '{{br}}' );
                txt = txt.replace( new RegExp( '\r', 'g' ), '{{br}}' );
                txt = txt.replace( new RegExp( '<br>', 'g' ), '{{br}}' );
                txt = txt.replace( new RegExp( '<br/>', 'g' ), '{{br}}' );

                return txt;
            }

            function removeInlineBreaks( txt ) {
                //txt = txt.replace( new RegExp( '{{br}}', 'g' ), '<br/>' );
                txt = txt.replace( new RegExp( '{{br}}', 'g' ), '\n' );
                return txt;
            }

            function toDict() {
                return itemsToValue( items, element.display );
            }

            /**
             *  Simple form element validation, EXTMOJ-861
             */

            function isValid() {
                if ( !element.validate.notEmpty ) { return true; }
                if ( '' === element.display.trim() ) { return false; }
                if ( element.display.trim() === defaultValue.trim() ) { return false; }
                return true;
            }

            //  SET UP AND RETURN THE NEW RENDERER
            initialize();
            pubMethods = {
                'setMode': setMode,
                'update': update,
                'destroy': destroy,
                'setValue': setValue,
                'setSelected': setSelected,
                'setValueAndSelected': setValueAndSelected,
                'getValue': getValue,
                'handleClick': handleClick,
                'createValueEditor': createValueEditor,
                'getItems': getItems,
                'addInlineBreaks': addInlineBreaks,
                'removeInlineBreaks': removeInlineBreaks,
                'toDict': toDict,
                'isValid': isValid,
                'map': map,
                'unmap': unmap
            };

            creationCallback( null, pubMethods );
        };


        //  PRIVATE FUNCTIONS

        /**
         *  Parse element value to array of radio items
         *
         *  @param  element     {object}    a dcforms-element object
         *  @return             {Array}     Array of radio items
         */

        function enumToItems(element) {

            //  bindings get messed up occasionally in development

            if (
                ('' === element.schemaType) ||
                (!element.enumObj) ||
                (!element.enumObj[element.schemaType]) ||
                (!element.enumObj[element.schemaType].enum) ||
                (!element.enumObj[element.schemaType].translate)
            ) {
                return [];
            }

            var
                userLang = Y.dcforms.getUserLang(element.page.form.formId),
                myEnum = element.enumObj[element.schemaType].enum,
                myTranslate = element.enumObj[element.schemaType].translate,

                i,
                selected,
                items = [];

            for (i = 0; i < myEnum.length; i++) {
                selected = false;

                if ((i === 0) && ('' === element.display)) { element.display = myEnum[i]; }
                if (element.display === myEnum[i]) { selected = true; }

                items.push({
                    'index': i,
                    'domId': element.domId + 'radio' + i,
                    'value': myEnum[i],
                    'label': myTranslate[myEnum[i]][userLang],
                    'selected': selected
                });

            }

            return items;
        }

        /**
         *  Parse element value to array of dropdown items
         *
         *  @param  element     {Object}    a dcforms-element object
         *  @return             {Array}     Array of radio items
         */

        function valueToItems(element) {
            var
                i,
                dirtyval = element.value,
                lines,
                currLine,
                selected,
                isUserValue,
                items = [];

            //  in edit mode we're changing the default value, not the current value of this item
            if ('edit' === element.page.form.mode) {
                dirtyval = element.defaultValue[ element.getCurrentLang() ];

                //  hack to force element value for MOJ-1056
                element.value = dirtyval;
            }

            dirtyval = dirtyval.replace(new RegExp('<br/>', 'g'), '{newline}');
            dirtyval = dirtyval.replace(new RegExp('{newline}', 'g'), '\n');
            lines = dirtyval.split("\n");

            for (i = 0; i < lines.length; i++) {
                selected = false;
                isUserValue = true;
                currLine = Y.dcforms.trim(lines[i]);

                if ('' !== currLine) {
                    if ((-1 === currLine.indexOf('*user*'))) { isUserValue = false; }
                    if ((-1 !== currLine.indexOf('*')) && ('' === element.display)) { element.display = currLine; }
                    if (element.display === currLine) { selected = true; }

                    currLine = currLine.replace('*user*', '');
                    currLine = currLine.replace('*', '');

                    items.push({
                        'index': i,
                        'domId': element.domId + 'opt' + i,
                        'value': currLine,
                        'label': currLine,
                        'user': isUserValue,
                        'selected': selected
                    });

                }
            }

            return items;
        }

        /**
         *  Serialize itemlist items to string
         *  @param items
         *  @param displayValue
         *  @returns {*}
         */

        function itemsToValue(items, displayValue) {
            var i, strItems = '', found = false;

            for (i = 0; i < items.length; i++) {
                if (items[i].value === displayValue) {
                    items[i].selected = true;
                    found = true;
                } else {
                    items[i].selected = false;
                }
                strItems = strItems + (items[i].selected ? '*' : '') + items[i].value + "\n";
            }

            if ( false === found && displayValue) {
                strItems = strItems + '*' + displayValue + "\n";
            }

            return strItems;
        }

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);