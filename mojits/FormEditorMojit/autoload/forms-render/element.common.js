    /**
 *	YUI module defining the basic element type (extended by renderers in this dir)
 *	Note that only single page forms are supported at present
 */

/*global YUI, $ */

/*eslint prefer-template:0, strict:0 */

YUI.add(
    /* YUI module name */
    'dcforms-element',

    /* Callback */

    function(Y, NAME) {
        'use strict';

        Y.log('Adding Y.dcforms.element', 'info', NAME);
        if (!Y.dcforms) { Y.dcforms = {}; }

        /**
         *	Object representing a single form element (Previous, unwrapped constructor)
         *	@param  page            Reference to dcforms-page object this is part of [object]
         *	@param  idx             Index of this element in parent.elements [int]
         */

        /*global, $ */

        function createPageElement(page, idx, serialized, creationCallback) {

            var element;

            /*----------------------------------------------------------------------------------------------
             *	Properties
             */

            element = {
                'UID': page.UID + idx,              //_ uniquely identifies this object

                //  most basic element properties

                'page': page,                       //_ parent [object]
                'domId': '',                        //_ Uniquely identifies this in dom [string]
                'idx': idx,                         //_ Index of this element in parent.elements [int]
                'mode': 'fill',                     //_ may be 'fill' , 'edit', 'shutdown', etc [string]
                'scaleBy': page.form.zoom,          //_ Proportion of original size [float]

                //  elements may be further divided to split across page boundaries (table cells, list entries, ect)

                'subElements': [],

                //  we need to work with images as dataUri for cross-domain reasons, previously used binary images
                //  NOTE: this is expected to be separated out to a new object

                'imgCache': null,
                'imgFixAspect': false,              //_ Replaces previous aspect mechanism with MediaMojit one

                //  common to all element types

                'elemId': '',                       //_ generic jade element#id, just a label [string]
                'elemType': '',                     //_ MORE TO BE ADDED HERE

                'options': [],                      //_ available values of dropdowns and radio sets [array]
                'properties': [],                   //_ array of raw strings [array]

                'font': '',                         //_ CSS font, may be reference to TTF font
                'bgColor': 'rgba(200,200,200,0)',   //_ anything accepted by both canvas and CSS property [string]
                'fgColor': '#444444',               //_ anything accepted by both canvas and CSS property [string]
                'borderColor': '#444444',           //_ anything accepted by both canvas and CSS property [string]

                'isBold': false,                    //_ override markdown to make element text bold
                'isItalic': false,                  //_ override markdown to make element text italic
                'isUnderline': false,               //_ override markdown to make element text underlined
                'align': 'left',                    //_ 'left'|'right'|'center' [bool]

                'editable': false,                  //_ true for everything except labels and checkboxes [bool]
                'fixedAspect': -1,                  //_ images may have a fixed aspect ratio [float]
                'printResolution': 1,               //_ images may optionally be rendered at higher DPI in PDF/print
                'readonly': false,                  //_ does not enter content-editable mode if true [bool]
                'tabIndex': 0,                      //_ implemented by rendering order [int]
                'snapToGrid': false,                //_ elements no longer snap to gid by default MOJ-2121 [bool]
                'isBFB': false,                     //_ some properties may only be shown if client has BFB cerification
                'isHiddenBFB': false,               //_ (runtime only) true if element is hidden because no BFB certification
                'clipOverflow': false,              //_ discard content which does not fit in element
                'scaleOverflow': false,             //_ change font size to fit text
                'noCopyOver': false,                //_ block copy of values between form documents

                'omitFromPDFIfEmpty': false,        //_ remove elements in print/pdf to cut down on whitespace
                'useMarkdownEditor': false,         //_ edit text in modal rather than inline

                'value': '',                        //_ current content of this element [string]
                'display': '',                      //_ selected value of dropdowns and radio sets [string]
                'defaultValue': {},                 //_ default values in current different user languages [object]
                'exportValue': '',                  //_ output for mapped data, more rigorously typed and without FEM markup
                'extra': '',                        //_ used for context specific additional settings such as barcode options
                'maxLen': 0,                        //_ maximum length of content

                'inheritFrom': '',                  //_ if one element is bound to the value of another

                //  used for dynamic sizing
                //  these objects should replace width, height etc for most interactions over time

                //  subElememts are just a box model
                'mm':  Y.dcforms.createSubElement(),

                //  displacement on abstract page as of last render
                'lastOffset': 0,

                //  refers to binding of parent form

                'reducedSchema': '',                //_ name of the reduced schema used to validate this element [string]
                'schemaMember': '',                 //_ schema component which applies to this element
                'schemaType': '',                   //_ type of this bound value
                'schemaMemberST': '',               //_ some schema members may have a subtype field [string]

                //  for binding to enum types

                'enumObj': {},                      //_ enum type from reducedschema [object]
                'enumLoaded': false,                //_ set to true when enum type is loaded [bool]

                //  for binding to child form / table

                'childSchemaObj': {},               //_ whole reduced schema object
                'childSchemaLoaded': false,         //_ set to true when child schema is loaded

                //  for export to reporting collection
                'useInReporting': false,
                'reportingType': 'String',
                'reportingLabel': {
                    'en': '(english)',
                    'de': '(german)'
                },

                //  for moving and resizing the element

                'dragmode': '',                     //_ may be 'move', 'resize' or empty string [string]
                'dragstart': { x: 0, y: 0 },        //_ x and y position at start of drag [object]

                //  object which manages and draws html content of element, binds element-specific DOM events, etc

                'renderer': {},
                'rendererLoaded': false,

                //  checking validity of form elements
                'validate': {
                    'notEmpty': false
                    //  FUTURE: allow name of validation function here (from schema, common validations, etc)
                },

                //  client-side translation of notices - deprecated in favor of translation with jadeLoader, but still used

                'il8nDict': Y.dcforms.il8nDict,     //_ translation dictionary set on creation of template [object]

                //  keeps track of changes to element values in other languages

                'translationDirty': {
                    'en': false,
                    'de': false,
                    'de_f': false,
                    'de_m': false
                },

                //  keep track of which rendering caches need to be redrawn
                isDirty: true,

                //  some elements do not respond to mouse events (background, header and footer)
                noSelect: false,

                //  when multiple elements are selected in edit mode, true if this element is selected
                inGroupSelection: false
            };

            /**
             *	Get own dom Id in current context
             *
             *  @param  postfix {String}    To name dependant elements
             */

            element.getDomId = function(postfix) {
                return element.domId + (postfix ? postfix: '');
            };

            /**
             *	Get own div from DOM with jQuery
             */

            element.jqSelf = function() {
                return $('#' + element.getDomId());
            };

            /**
             *  Initialize this element from serialized version of self
             *  @param  serialized  {Object}    Plain javascript object representing serialized element properties
             *  @param  callback    {Function}  Of the form fn(err)
             */

            element.unserialize = function(serialized, callback) {

                element.elemId = serialized.id;                     //  generic jade element#id, just a label [string]
                element.elemType = serialized.type;                 //  label, checkbox, text input, etc [string[

                element.mm.left = parseFloat(serialized.left || 0);                 //  relative to page, mm [float]
                element.mm.top = parseFloat(serialized.top || 0);                   //  relative to page, mm [float]
                element.mm.width = parseFloat(serialized.width || 10);              //  relative to page, mm [float]
                element.mm.height = parseFloat(serialized.height || 10);            //  relative to page, mm [float]
                element.mm.lineHeight = parseFloat(serialized.fontheight || 5);     //  relative to page, mm [float]
                element.mm.lineSpace = parseFloat(serialized.linespace || 1.0);     //  multiplier of line height [float]

                element.value = '';                                     //  current content of this element [string]
                element.fixedAspect = parseFloat(serialized.aspect);    //  constrain images to original aspect ratio [number]
                element.bgColor = serialized.bgColor;                   //  anything accepted by both canvas and CSS property
                element.fgColor = serialized.fgColor;                   //  anything accepted by both canvas and CSS property
                element.borderColor = serialized.borderColor;           //  anything accepted by both canvas and CSS property
                element.align = serialized.align;                       //  'left'|'right'|'center' [string]

                element.inheritFrom = serialized.inheritFrom || '';

                element.isBFB = serialized.hasOwnProperty('isBFB') && serialized.isBFB === true;

                element.isBold = serialized.hasOwnProperty('isBold') && serialized.isBold;
                element.isItalic = serialized.hasOwnProperty('isItalic') && serialized.isItalic;
                element.isUnderline = serialized.hasOwnProperty('isUnderline') && serialized.isUnderline;

                element.clipOverflow = serialized.hasOwnProperty('clipOverflow') && serialized.clipOverflow;
                element.scaleOverflow = serialized.hasOwnProperty('scaleOverflow') && serialized.scaleOverflow;

                //  removed for MOJ-1099 - dropdowns now get their default value from list type editor
                //    element.display = serialized.display;                      //  selected value of dropdowns and radio sets, images [string]

                if ((isNaN(element.fixedAspect)) || (0 === element.fixedAspect)) {
                    element.fixedAspect = -1;
                }

                if ((isNaN(element.mm.lineHeight)) || (0 === element.mm.lineHeight)) {
                    element.mm.lineHeight = 5;
                }

                // force (DEPRECATED, no longer used)
                element.fixedAspect = -1;

                if (element.mm.width > element.page.form.paper.width) {
                    element.mm.width = parseFloat(element.page.form.paper.width);
                }

                if (element.mm.height > element.page.form.paperHeight) {
                    element.mm.height = parseFloat(element.page.form.paper.height);
                }

                //  migrate to internationalized default values, and set the current value accordingly

                if ( serialized.defaultValue && ( 'object' === typeof serialized.defaultValue ) ) {
                    element.defaultValue = serialized.defaultValue;
                    if (!element.defaultValue.hasOwnProperty('en')) { element.defaultValue.en = 'default [en]'; }
                    if (!element.defaultValue.hasOwnProperty('de')) { element.defaultValue.de = 'default [de]'; } // TODO LAM-1857 Strix please check if this should be set for date elements

                    if (!element.defaultValue.hasOwnProperty('de_f')) { element.defaultValue.de_f = element.defaultValue.de; }
                    if (!element.defaultValue.hasOwnProperty('de_m')) { element.defaultValue.de_m = element.defaultValue.de; }

                    if ( element.defaultValue.de_f === 'default [de_f]' ) { element.defaultValue.de_f = element.defaultValue.de; }
                    if ( element.defaultValue.de_m === 'default [de_m]' ) { element.defaultValue.de_m = element.defaultValue.de; }
                } else {

                    //  form created before il8n
                    if (serialized.hasOwnProperty('value')) {
                        element.value = serialized.value;
                    }

                    element.defaultValue = {
                        'en': element.value,
                        'de': element.value,
                        'de_f': element.value,
                        'de_m': element.value
                    };
                }

                //  note which translations are clean and dirty, prefer clean translations for default value
                if (serialized.hasOwnProperty('translationDirty') && ('object' === typeof serialized.translationDirty)) {
                    element.translationDirty = serialized.translationDirty;
                    if (!element.translationDirty.hasOwnProperty('en')) { element.translationDirty.en = true; }
                    if (!element.translationDirty.hasOwnProperty('de')) { element.translationDirty.de = true; }
                    if (!element.translationDirty.hasOwnProperty('de_f')) { element.translationDirty.de_f = true; }
                    if (!element.translationDirty.hasOwnProperty('de_m')) { element.translationDirty.de_m = true; }
                }

                element.value = element.defaultValue[element.getBestLang()];

                element.font = serialized.hasOwnProperty('font') ? serialized.font : '';
                element.font = ('' === element.font) ? Y.dcforms.defaultFont : element.font;

                //  handle special cases here (schema / tables / etc)
                element.readonly = serialized.hasOwnProperty('readonly') ? (serialized.readonly === 'true') : false;
                element.schemaMember = serialized.hasOwnProperty('schemaMember') ? serialized.schemaMember : '';
                element.schemaMemberST = serialized.hasOwnProperty('schemaMemberST') ? serialized.schemaMemberST : '';
                element.schemaType = serialized.hasOwnProperty('schemaType') ? serialized.schemaType : '';
                element.extra = serialized.hasOwnProperty('extra') ? serialized.extra : '';
                element.maxLen = serialized.hasOwnProperty('maxLen') ? serialized.maxLen : 0;

                //  check for reporting options
                element.useInReporting = serialized.hasOwnProperty('useInReporting') ? serialized.useInReporting : false;
                element.reportingType = serialized.hasOwnProperty('reportingType') ? serialized.reportingType : 'String';
                element.reportingLabel = serialized.hasOwnProperty('reportingLabel') ? serialized.reportingLabel : { 'en': serialized.id, 'de': serialized.id };

                //  MOJ-6698 Hide some tables and textareas and recover their whitespace in PDF
                element.omitFromPDFIfEmpty = serialized.hasOwnProperty( 'omitFromPDFIfEmpty' ) ? serialized.omitFromPDFIfEmpty : false;

                element.useMarkdownEditor = serialized.hasOwnProperty( 'useMarkdownEditor' ) ? serialized.useMarkdownEditor : false;

                //  MOJ-11044 Option to prevent some fields from being copied between instances of the form
                element.noCopyOver = serialized.hasOwnProperty( 'noCopyOver' ) ? serialized.noCopyOver : false;

                if (serialized.hasOwnProperty('enumLoaded')) {
                    element.enumLoaded = ('true' === serialized.enumLoaded);
                }

                if (serialized.hasOwnProperty('enumObj')) {
                    element.enumObj = serialized.enumObj;
                }

                element.reducedSchema = element.page.form.reducedSchema;

                //  JSON serializes bool as string on some browsers
                if ("true" === element.enumLoaded) { element.enumLoaded = true; }

                //	set border
                switch(element.elemType) {
                    case 'label':	if ('' === element.bgColor) { element.bgColor = 'rgba(255,255,255, 0.5)'; }	break;
                    case 'input':	element.editable = true;                                                   break;
                }

                //  set validation options
                element.validate.notEmpty = false;

                if ( serialized.hasOwnProperty( 'validateNotEmpty' ) ) {
                    element.validate.notEmpty = serialized.validateNotEmpty || false;
                }

                //	inherit from parent if not specifically set

                //  This was previously disabled to allow transparency, changed due to behavior of colorpicker
                if ('' === element.bgColor) { element.bgColor = 'rgba(255,255,255,0)'; }
                if ('' === element.fgColor) { element.fgColor = 'rgba(0,0,0,1)'; }
                if ('' === element.borderColor) { element.borderColor = 'rgba(255,255,255,0)'; }

                //  default to a passable value if no font height available
                if (0 >= element.mm.lineHeight) { element.mm.lineHeight = 5; }

                //  set a unique id for element instance
                element.domId = 'div' + Math.floor(Math.random() * 99999999999) + element.elemId;

                //  load table properties if defined
                if (
                    ( 'table' === element.elemType ) ||
                    ( 'reporttable' === element.elemType ) ||
                    ( 'labdatatable' === element.elemType ) ||
                    ( 'meddatatable' === element.elemType ) ||
                    ( 'contacttable' === element.elemType )
                ) {
                    if (serialized.table) {
                        element.table = {
                            reducedSchema: serialized.table.reducedSchema,
                            cols: serialized.table.cols,
                            rowSpacing: serialized.table.rowSpacing
                        };
                    } else {
                        element.table = {
                            'reducedSchema': '',
                            'cols': [],
                            'rowSpacing': 0
                        };
                    }
                    if ( !element.table.rowSpacing ) {
                        element.table.rowSpacing = 0;
                    }
                }

                if ('image' === element.elemType) {
                    element.imgFixAspect = serialized.hasOwnProperty('imgFixAspect') ? serialized.imgFixAspect : false;
                    element.printResolution = serialized.hasOwnProperty( 'printResolution' ) ? parseInt( serialized.printResolution, 10 ) : 1;
                }

                if ('barcode' === element.elemType) {
                    element.display = serialized.hasOwnProperty('display') ? serialized.display : 'pdf417';
                }

                //  applied to edit mode only
                if (serialized.hasOwnProperty('snapToGrid')) {
                    element.snapToGrid = ((serialized.snapToGrid === 'true') || (serialized.snapToGrid === true));
                }

                //  this only initializes the renderer and subelements, does not draw to canvas

                function onRendererCreated(err) {
                    if (!err && !element.renderer) {
                        err = 'Renderer not created.';
                    }

                    if (err) {
                        Y.log('Could not create renderer for element: ' + element.elemType, 'warn', NAME);
                        callback(err);
                        return;
                    }

                    element.setValue(element.value, callback);
                }

                element.createRenderer(onRendererCreated);

            }; // end unserialize

            /**
             *  Return the current language setting for this form
             */

            element.getCurrentLang = function() {
                var
                    userLang = element.page.form.userLang,
                    gender = element.page.form.gender;

                if ( 'de' === userLang && 'n' !== gender ) {
                    return userLang + '_' + gender;
                }

                return userLang;
            };

            /**
             *  Try to determine the best available language for the default value, based on clean translations
             *
             *  TODO: move this to common form utils, may add additional languages in future
             *
             *  @returns {String} Language code of best available translation
             */

            element.getBestLang = function() {
                //  default translation will be 'de' if neither language has an approved translation
                //  see: MOJ-1172
                var
                    userLang = element.page.form.userLang,
                    gender = element.page.form.gender,
                    dirty = element.translationDirty,
                    best = 'de';

                function checkClear( value ){
                    return !value || value === 'false';
                }

                if ( 'en' === userLang ) {
                    if ( checkClear( dirty.en ) ) { return 'en'; }               //  requested en translation is available, use it
                    if ( checkClear( dirty.de ) ) { return 'de'; }               //  german translation is clean, use that
                    return 'en';                                    //  both are dirty, use en
                }

                if ( 'de' === userLang ) {
                    switch ( gender ) {
                        case 'n':
                            //  no genderization set
                            if ( checkClear( dirty.de ) ) { return 'de'; }       //  requested translation is available, use it
                            if ( checkClear( dirty.en ) ) { return 'en'; }       //  english translation is clean, use that
                            return 'de';                            //  both are dirty, use de

                        case 'f':
                            //  feminine genderization set
                            if ( checkClear( dirty.de_f ) ) { return 'de_f'; }   //  requested genderized translation available
                            if ( checkClear( dirty.de ) ) { return 'de'; }       //  fall back to generic german
                            if ( checkClear( dirty.en ) ) { return 'en'; }       //  or english if no german
                            return 'de';                            //  or generic german if no clean translations

                        case 'm':
                            //  masculine genderization set
                            if ( checkClear( dirty.de_m ) ) { return 'de_m'; }   //  requested genderized translation available
                            if ( checkClear( dirty.de ) ) { return 'de'; }       //  fall back to generic german
                            if ( checkClear( dirty.en ) ) { return 'en'; }       //  or english if no german
                            return 'de';                            //  or generic german if no clean translations
                    }
                }

                return best;
            };

            /**
             *  Associate this element with a property of a reduced schema
             *
             *  @param  schemaName      {string}    name of a reduced schema
             *  @param  schemaMember    {string}    schema member
             *  @param  schemaType      {string}    data type
             *  @param  callback        {function}  of the form fn(err), optional
             */

            element.setBinding = function(schemaName, schemaMember, schemaType, callback) {
                var
                    isEnum = (schemaName.indexOf('_E') > 0),
                    isChildSchema = (schemaName.indexOf('_T') > 0);

                element.reducedSchema = schemaName;
                element.schemaMember = schemaMember;
                element.schemaType = schemaType;

                element.enumObj = {};
                element.enumLoaded = false;
                element.isDirty = true;

                //  load complex type / enum

                element.enumLoaded = false;
                element.enumObj = {};

                if (true === isEnum && Y.dcforms.schema.hasOwnProperty(schemaName)) {
                    element.enumObj = Y.dcforms.reducedschema.loadSync(schemaName);
                    element.enumLoaded = true;
                    Y.log('Loaded enum ' + schemaName + ' for ' + element.elemId, 'info', NAME);
                    element.page.form.raise('elementSetEnum', element);
                    onBindingComplete();
                    return;
                }

                //  load complex type / child schema

                element.childSchemaLoaded = false;
                element.childSchemaObj = {};

                if (true === isChildSchema && Y.dcforms.schema.hasOwnProperty(schemaName)) {
                    element.childSchemaObj = Y.dcforms.reducedschema.loadSync(schemaName);
                    element.childSchemaLoaded = true;
                    Y.log('Loaded child schema ' + schemaName + ' for ' + element.elemId, 'info', NAME);
                    element.page.form.raise('elementSetChildSchema', element);
                    onBindingComplete();
                    return;
                }

                //  nothing to wait for
                if ( callback ) { return callback( null ); }

                function onBindingComplete() {
                    //  when bound to schema elements get a blue handle, dropdowns and radios change behavior
                    element.page.redrawDirty();
                    //  save changes
                    element.onDirty();
                    //  notifiy listeners (edit element panel)
                    element.page.form.raise('elementBindingSet', element);

                    //console.log('bound: ' + element.reducedSchema + ' / ' +  element.schemaMember + ' / ' + element.schemaType);

                    if ( callback ) { return callback( null ); }
                }

            };

            /**
             *  Convert to plain, minimal object to be stored in the database
             *  @returns {*}
             */

            element.serialize = function() {

                element.reducedSchema = element.page.form.reducedSchema;

                var
                    elementObj = {
                        'id': element.elemId,                      //  generic jade element#id, just a label [string]
                        'type': element.elemType,                  //  label, checkbox, text input, etc [string[
                        'left': element.mm.left,                   //  relative to page, mm [float]
                        'top': element.mm.top,                     //  relative to page, mm [float]
                        'width': element.mm.width,                 //  relative to page, mm [float]
                        'height': element.mm.height,               //  relative to page, mm [float]
                        'font': element.font,                      //  font face name
                        'fontheight': element.mm.lineHeight,       //  relative to page, mm [float]
                        'linespace': element.mm.lineSpace,         //  multiplier of fontheight [float]
                        'defaultValue': {},                        //  default values of this element in all languages [object]
                        'translationDirty': element.translationDirty,  //  helps when deciding which default value to use
                        'aspect': element.fixedAspect,             //  constrain images to original aspect ratio [number]
                        'display': element.display,                //  selected value of dropdowns and radio sets [string]
                        'bgColor': element.bgColor,                //  anything accepted by both canvas and CSS property
                        'fgColor': element.fgColor,                //  anything accepted by both canvas and CSS property
                        'borderColor': element.borderColor,        //  anything accepted by both canvas and CSS property
                        'clipOverflow': element.clipOverflow,      //  discard content which does not fit in element bounds
                        'scaleOverflow': element.scaleOverflow,    //  reduce font size to fit text into element bounds

                        'isBold': element.isBold,                  //  overrides markdown
                        'isItalic': element.isItalic,              //  overrides markdown
                        'isUnderline': element.isUnderline,        //  overrides markdown

                        'snapToGrid': element.snapToGrid,          //  grid size is a property of the form [bool]
                        'isBFB': element.isBFB,                    //  only displayed if BFB vertification is present
                        'align': element.align,                    //  'left'|'right'|'center' [bool]
                        'readonly': element.readonly.toString(),   //  cannot be changed while filling [string]
                        'reducedSchema': element.reducedSchema,    //  Name of bound schema [string]
                        'schemaMember': element.schemaMember,      //  Name of bound member [string]
                        'schemaType': element.schemaType,          //  Type of bound member [string]
                        'enumObj': element.enumObj,                //  Bound complex type [object]
                        'enumLoaded': element.enumLoaded,          //  Set to true if this uses an enum [bool]

                        'useInReporting': element.useInReporting,  //  If true, extract from values for reporting
                        'reportingType': element.reportingType,    //  Type to extract for reporting aggregations
                        'reportingLabel': element.reportingLabel,  //  Label for this field in reporting UI

                        //  form validation
                        'validateNotEmpty': element.validate.notEmpty
                    };

                if ( ( 'table' === element.elemType ) || ( 'meddatatable' === element.elemType ) ) {
                    elementObj.table = element.table;
                    elementObj.omitFromPDFIfEmpty = element.omitFromPDFIfEmpty;
                }

                if ( 'text' === element.getValueType() ) {
                    elementObj.omitFromPDFIfEmpty = element.omitFromPDFIfEmpty;
                }

                if ( element.useMarkdownEditor ) {
                    elementObj.useMarkdownEditor = element.useMarkdownEditor;
                }

                if ( ( 'reporttable' === element.elemType ) || ( 'labdatatable' === element.elemType ) ) {
                    elementObj.table = element.table;
                }

                if ('labdatatable' === element.elemType) {
                    elementObj.table = element.table;
                    elementObj.omitFromPDFIfEmpty = element.omitFromPDFIfEmpty || false;
                }

                if ('contacttable' === element.elemType) {
                    elementObj.table = element.table;
                    elementObj.omitFromPDFIfEmpty = element.omitFromPDFIfEmpty || false;
                }

                if ('image' === element.elemType) {
                    elementObj.imgFixAspect = element.imgFixAspect;
                    elementObj.printResolution = element.printResolution + '';
                }

                if ('' !== element.extra) {
                    elementObj.extra = element.extra;
                }

                if (0 !== element.maxLen) {
                    elementObj.maxLen = element.maxLen;
                }

                if ('' !== element.inheritFrom) {
                    elementObj.inheritFrom = element.inheritFrom;
                }

                if ( element.noCopyOver ) {
                    elementObj.noCopyOver = true;
                }

                //  some bindings may be to s subtype of a schema member's value
                if (element.schemaMemberST && '' !== element.schemaMemberST) {
                    elementObj.schemaMemberST = element.schemaMemberST;
                }

                elementObj.defaultValue.en = element.defaultValue.hasOwnProperty('en') ? element.defaultValue.en : '';
                elementObj.defaultValue.de = element.defaultValue.hasOwnProperty('de') ? element.defaultValue.de : '';
                elementObj.defaultValue.de_f = element.defaultValue.hasOwnProperty('de_f') ? element.defaultValue.de_f : '';
                elementObj.defaultValue.de_m = element.defaultValue.hasOwnProperty('de_m') ? element.defaultValue.de_m : '';

                elementObj.translationDirty.en = element.translationDirty.hasOwnProperty('en') ? element.translationDirty.en : true;
                elementObj.translationDirty.de = element.translationDirty.hasOwnProperty('de') ? element.translationDirty.de : false;
                elementObj.translationDirty.de_f = element.translationDirty.hasOwnProperty('de_f') ? element.translationDirty.de_f : true;
                elementObj.translationDirty.de_m = element.translationDirty.hasOwnProperty('de_m') ? element.translationDirty.de_m : true;

                //  validation / sanity checking here

                return elementObj;
            };

            /**
             *  Set the value of this element according to some object loaded on the parent form
             *
             *  @param  newValue    {string}    Format depends on element type
             *  @param  callback    {function}  Of the form fn(err)
             */

            element.map = function(newValue, callback) {

                if (element.value !== newValue) {
                    element.page.isDirty = true;
                }

                function dummyCallback(err) {
                    if (err) {
                        Y.log('Error in element mapping: ' + err, 'warn', NAME);
                    }
                }

                if (!callback) {
                    callback = dummyCallback;
                }

                switch(element.elemType) {

                    case 'dropdown':
                        //  special case
                        element.page.isDirty = true;
                        element.renderer.setSelected(newValue);
                        break;

                    case 'radiotrans':                                      //  fallthrough
                    case 'radio':
                        element.page.isDirty = true;
                        element.display = newValue + '';
                        break;

                    case 'chartmd':
                        //  TODO: chart data deserialization here
                        //console.log( '(****) mapping values into a chartmd: ', newValue );
                        break;
                }

                //console.log( '(****) mapping element: ', newValue )

                //  Renderer may need to change state based on new value
                if ((true === element.rendererLoaded) && (element.renderer.hasOwnProperty('map'))) {
                    element.renderer.map(newValue, callback);
                    return;
                }

                Y.log( 'Value not mapped on type: ' + element.elemType, 'debug', NAME );
                callback(null);

            };

            /**
             *  Get the value of this element in the format expected by schema
             */

            element.unmap = function() {

                var exportValue;

                switch(element.elemType) {

                    case 'textarea':    exportValue = element.value;               break;

                    case 'radiotrans':                                          //  fallthrough
                    case 'radio':       exportValue = element.display;             break;

                    case 'label':                                               //  fallthrough
                    case 'input':                                               //  fallthrough
                    case 'table':       exportValue = element.renderer.unmap();    break;

                    //case 'checkbox':                                          //  fallthrough
                    //case 'checkboxtrans':                                     //  fallthrough

                    default:
                        //  Renderer may need to change state based on new value
                        if ((true === element.rendererLoaded) && (element.renderer.hasOwnProperty('unmap'))) {
                            exportValue = element.renderer.unmap();
                        } else {
                            Y.log( 'Value not mapped on type: ' + element.elemType, 'warn', NAME );
                        }
                        break;
                }

                return exportValue;
            };

            /**
             *	Check element this element has initialized correctly
             *	@return String  empty string onsuccess, error message on failure
             */

            element.check = function() {
                var msg = '';
                if ('' === element.domId) { msg = msg + 'element does not have a domId<br/>'; }
                if ('' === element.elemType) { msg = msg + 'element does not have an element-type<br/>'; }
                if (-1 === element.mm.left) { msg = msg + 'element does not have a scaleleft property<br/>'; }
                if (-1 === element.mm.top) { msg = msg + 'element does not have a scaletop property<br/>'; }
                if (-1 === element.mm.width) { msg = msg + 'element does not have a scalewidth property<br/>'; }
                if (-1 === element.mm.height) { msg = msg + 'element does not have a scaleheight property<br/>'; }
                if (-1 === element.mm.lineHeight) { msg = msg + 'element does not have a font height<br/>'; }
                // more checks to be added here
                return msg;
            };

            element.countTabStops = function() {
                if (element.renderer.countTabStops) {
                    return element.renderer.countTabStops;
                }
                return element.canEdit() ? 1 : 0;
            };

            /**
             *  Cast and sanity check bounding box
             */

            element.checkBounds = function() {

                var
                    gridSize = element.page.form.gridSize,
                    dirty = false;

                function checkSingleBound(someNumber) {
                    if ('number' !== typeof someNumber) {
                        someNumber = parseFloat(someNumber);
                        dirty = true;
                    }

                    if (isNaN(someNumber)) {
                        someNumber = gridSize;
                        dirty = true;
                    }

                    if (someNumber < 0) {
                        someNumber = 0;
                        dirty = true;
                    }

                    return someNumber;
                }

                element.mm.left = checkSingleBound(element.mm.left);
                element.mm.top = checkSingleBound(element.mm.top);
                element.mm.width = checkSingleBound(element.mm.width);
                element.mm.height = checkSingleBound(element.mm.height);
                element.mm.lineHeight = checkSingleBound(element.mm.lineHeight);

                if ((true === dirty) && ('edit' === element.page.form.mode)) {
                    Y.log( 'Form element bounds invalid: ' + JSON.stringify( element.mm ), 'warn', NAME );
                    element.onDirty();
                }
            };

            /**
             *  Returns a string naming the general type of value this element accepts
             */

            element.getValueType = function() {

                //  if element is a basic value not maped to anything
                switch(element.elemType) {
                    case 'radio':           //  fallthrough
                    case 'radiotrans':      //  fallthrough
                    case 'dropdown':        return 'list';

                    case 'input':           //  fallthrough
                    case 'label':           //  fallthrough
                    case 'audio':           //  fallthrough
                    case 'textmatrix':      //  fallthrough
                    case 'textarea':        return 'text';

                    case 'hyperlink':       return 'hyperlink';

                    case 'date':            return 'date';

                    case 'checkbox':        //  fallthrough
                    case 'checkboxtrans':   //  fallthrough
                    case 'togglebox':       return 'boolean';

                    case 'barcode':         return 'barcode';

                    case 'reporttable':     return 'reporttable';
                    case 'labdatatable':    return 'labdatatable';
                    case 'contacttable':    return 'contacttable';
                    case 'meddatatable':    return 'table';
                    case 'table':           return 'table';
                    case 'image':           return 'image';
                    case 'subform':         return 'subform';
                    case 'chartmd':         return 'chartmd';

                }

                return 'unknown';
            };

            /**
             *	Render into the page
             *	Scaling at constant aspect for now, may make panels elastic on x and y in future
             *
             *  @param  voffset     {Number}    Vertical displacement due to content overflow of element above this one
             *  @param  callback    {function}  Of the form fn(err)
             */

            element.render = function(voffset, callback) {
                element.lastOffset = voffset;
                element.renderAbstract(voffset, callback);
            }; // end render

            /**
             *  Draw this element on abstract representation of form (elastic pages)
             *
             *  This is to find content dimensions and find points where elements split over pages.
             *
             *  @/param  voffset     {Number}    displacement from starting position
             *  @/param  callback    {Function}  of the form fn(err)
             */

            element.renderAbstract = function( /* voffset, callback */ ) {

                Y.log('DEPRECATED: ' + element.renderAbstract + ' please use cache and canvas layers', 'debug', NAME);
                console.log('stack trace follows', (new Error().stack));    //  eslint-disable-line no-console

            };


            /**
             *  Draw this element on a fixed size canvas set
             *
             *  Elements may be split between different canvasesses
             *
             *  @param  voffset     {Number}    displacement from top of page
             *  @param  callback    {Function}  of the form fn(err)
             */

            element.renderCanvasSet = function(voffset, callback) {
                if (!element.renderer) { return; }

                function onAbstractRendered(err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null);
                }

                element.renderer.renderAsbtract(voffset, onAbstractRendered);
            };

            /**
             *
             */

            element.updateBounds = function() {
                element.mm.contentHeight = element.getContentHeight();
                element.mm.bottom = element.mm.top + element.mm.contentHeight;
                element.mm.overflowHeight = element.mm.contentHeight - element.mm.height;

                if (element.mm.overflowHeight < 0 || isNaN( element.mm.overflowHeight ) ) {
                    element.mm.overflowHeight = 0;
                }

                if('subform' === element.elemType || 'subform' === element.elemType) {
                    element.mm.overflowHeight = 0;
                }

                //  allow images to overflow when editable, MOJ-7819
                if ( 'image' === element.elemType && true === element.readonly ) {
                    element.mm.overflowHeight = 0;
                }
            };

            /**
             *  Get the height of this element's content (in mm) === lowest point touched by subelement
             */

            element.getContentHeight = function() {
                if (element.renderer && element.renderer.getContentHeight) {
                    element.renderer.getContentHeight();
                }

                var i, subElem, maxHeight = 0;

                for (i = 0; i < element.subElements.length; i++) {
                    subElem = element.subElements[i];
                    if ((subElem.top + subElem.height) > maxHeight) {
                        //  noncontent subelements do not count towards content height
                        //  they are generally background or image elements which can be resized
                        if (!subElem.hasOwnProperty('noncontent')) {
                            maxHeight = (subElem.top + subElem.height);
                        }

                    }
                }

                //  content height must not exceed element bounds when clipped
                if (element.clipOverflow && maxHeight > element.mm.height) {
                    maxHeight = element.mm.height;
                }

                return maxHeight;
            };

            /**
             *  New approach is to use a persistent renderer object, and call its render method
             *
             *  @param  callback    {function}  Of the form fn(err), renderers may need to load assets from server
             */

            element.createRenderer = function(callback) {

                function onRendererCreated(err, newRenderer) {
                    if (err) {
                        Y.log('Could not create element renderer: ' + JSON.stringify(err), 'warn', NAME);
                        callback(err);
                        return;
                    }

                    element.renderer = newRenderer;
                    element.rendererLoaded = true;
                    //Y.log('Created element renderer: ' + element.elemType, 'debug', NAME);
                    callback(null);
                }

                switch(element.elemType) {

                    case 'input':
                    case 'label':
                    case 'textarea':
                        //  input and label renderers removed, with FEM options they were bot identical to
                        //  textarea, so have merged to single text renderer
                        Y.dcforms.elements.makeTextareaRenderer(element, onRendererCreated);        break;

                    case 'textmatrix':
                        Y.dcforms.elements.makeTextMatrixRenderer(element, onRendererCreated);      break;

                    case 'hyperlink':
                        Y.dcforms.elements.makeHyperlinkRenderer(element, onRendererCreated);       break;

                    case 'image':
                        Y.dcforms.elements.makeImageRenderer(element, onRendererCreated);           break;

                    case 'checkboxtrans':   //  deliberate fallthrough
                    case 'checkbox':
                        Y.dcforms.elements.makeCheckboxRenderer(element, onRendererCreated);        break;

                    case 'togglebox':
                        Y.dcforms.elements.makeToggleboxRenderer(element, onRendererCreated);       break;

                    case 'barcode':
                        Y.dcforms.elements.makeBarcodeRenderer(element, onRendererCreated);         break;

                    case 'date':
                        Y.dcforms.elements.makeDateRenderer(element, onRendererCreated);            break;

                    case 'audio':
                        Y.dcforms.elements.makeAudioRenderer(element, onRendererCreated);           break;

                    case 'video':
                        Y.dcforms.elements.makeVideoRenderer(element, onRendererCreated);           break;

                    case 'subform':
                        Y.dcforms.elements.makeSubformRenderer(element, onRendererCreated);         break;

                    case 'radio':
                    case 'radiotrans':
                        Y.dcforms.elements.makeRadioRenderer(element, onRendererCreated);           break;

                    case 'dropdown':
                        Y.dcforms.elements.makeDropdownRenderer(element, onRendererCreated);        break;

                    case 'reporttable':
                        Y.dcforms.elements.makeReportTableRenderer(element, onRendererCreated);     break;

                    case 'labdatatable':
                        Y.dcforms.elements.makeLabdataTableRenderer(element, onRendererCreated);    break;

                    case 'meddatatable':
                        Y.dcforms.elements.makeMeddataTableRenderer(element, onRendererCreated);    break;

                    case 'contacttable':
                        Y.dcforms.elements.makeContactTableRenderer(element, onRendererCreated);    break;

                    case 'table':
                        Y.dcforms.elements.makeTableRenderer(element, onRendererCreated);           break;

                    case 'chartmd':
                        Y.dcforms.elements.makeChartMDRenderer(element, onRendererCreated);         break;

                    case 'infotree':
                        Y.dcforms.elements.makeInfoTreeRenderer(element, onRendererCreated);         break;

                    default:
                        //  some legacy stuff still does not have renderers
                        return callback(null);

                }

            };

            /**
             *  Checks whether this element can currently be edited
             *
             *  element is independent of of the this.editable property, since form may be locked, in PDF mode, etc
             *
             *  @returns    {Boolean}   True if currently editable, false if not
             */

            element.canEdit = function() {
                var isEditable = true;

                if ('true' === element.readonly || true === element.readonly) {
                    isEditable = false;
                }

                if (element.page.form.isChildForm) {
                    isEditable = false;
                }

                switch(element.page.form.mode) {
                    case 'locked':
                    case 'lock':    isEditable = false;     break;
                    case 'pdf':     isEditable = false;     break;
                    case 'edit':    isEditable = true;      break;
                }

                return isEditable;
            };

            /**
             *  Opportunity to unlink any listeners and safely destroy any child objects
             */

            element.destroy = function() {
                if (element.rendererLoaded && element.renderer.destroy) {
                    element.renderer.destroy();
                }
            };

            /*----------------------------------------------------------------------------------------------
             *	SETTERS AND GETTERS
             */

            /**
             *  Simplified general API for external controls, allow raising of events when changing properties
             *  from editor or parent
             *
             *  TODO: add type and sanity checks to new values here, which can then be removed from binders
             *
             *  @param  propName    {String}
             *  @param  propValue   {String}
             */

            element.setProperty = function(propName, propValue) {
                //Y.log('Setting element property: ' + propName + ' -> ' + propValue, 'debug', NAME);
                element.isDirty = true;

                switch (propName) {
                    case 'left':
                    case 'top':
                    case 'width':
                    case 'height':
                        element.mm[propName] = parseFloat(propValue);
                        element.page.form.raise('layoutChanged', element.page.form);
                        element.page.redrawDirty();
                        break;

                    case 'lineHeight':
                    case 'lineSpace':
                        if ( parseFloat( propValue ) > Y.dcforms.MAX_FONT_SIZE ) {
                            propValue = Y.dcforms.MAX_FONT_SIZE;
                        }
                        element.mm[propName] = parseFloat(propValue);
                        element.page.form.raise('layoutChanged', element.page.form);
                        element.page.redrawDirty();
                        break;

                    case 'elemId':
                        //  TODO: sanity checks on elemId here
                    case 'align':
                    case 'snapToGrid':
                    case 'borderColor':
                    case 'fgColor':
                    case 'bgColor':
                    case 'schemaMemberST':
                    case 'inheritFrom':
                    case 'printResolution':
                        element[propName] = propValue;
                        element.page.form.raise('layoutChanged', element.page.form);
                        element.page.redrawDirty();
                        break;

                    case 'schemaMember':
                    case 'schemaType':
                        element.reducedSchema = element.page.form.reducedSchema;
                        element[propName] = propValue;
                        element.page.form.raise('layoutChanged', element.page.form);
                        element.page.redrawDirty();
                        break;

                    case 'font':
                        element.font = propValue;
                        element.mm.font = propValue;        //  should not be used
                        element.page.form.raise('layoutChanged', element.page.form);
                        element.renderer.update(function () {
                            element.page.redrawDirty();
                        });

                        break;

                    case 'isBold':
                        element.isBold = propValue;
                        if (element.renderer && element.renderer.update) { element.renderer.update(); }
                        break;

                    case 'isItalic':
                        element.isItalic = propValue;
                        if (element.renderer && element.renderer.update) { element.renderer.update(); }
                        break;

                    case 'isUnderline':
                        element.isUnderline = propValue;
                        if (element.renderer && element.renderer.update) { element.renderer.update(); }
                        break;

                    case 'tableRowSpacing':
                        if ( element.table ) {
                            element.table.rowSpacing = parseFloat( propValue );
                        }
                        if (element.renderer && element.renderer.update) { element.renderer.update(); }
                        break;

                    default:
                        Y.log('Unhandled property: ' + propName, 'warn', NAME);
                }

            };

            /**
             *  For symmetry and to simplify restructuring of box model
             *
             *  @param  propName    {String}
             */

            element.getProperty = function(propName) {
                switch(propName) {
                    case 'left':
                    case 'top':
                    case 'width':
                    case 'height':
                    case 'lineHeight':
                    case 'lineSpace':
                        return element.mm[propName];

                    case 'domId':
                    case 'elemId':
                    case 'align':
                    case 'snapToGrid':
                    case 'font':
                    case 'borderColor':
                    case 'fgColor':
                    case 'bgColor':

                    case 'schemaMember':
                    case 'schemaMemberST':
                    case 'inheritFrom':
                    case 'printResolution':

                    case 'isBold':
                    case 'isItalic':
                    case 'isUnderline':
                        return element[propName];

                    case 'canSelect':
                        if ('image' === element.elemType || 'subform' === element.elemType) {
                            return false;
                        }

                        //  cannot select hidden elements unless editing the form
                        if (element.isHiddenBFB && (false === (page.form.isInEditor && 'edit' === page.form.mode))) {
                            return false;
                        }

                        return !element.readonly;

                    case 'valueType':
                        return element.getValueType();

                    case 'tableRowSpacing':
                        if ( element.table && element.table.rowSpacing ) {
                            return element.table.rowSpacing;
                        }
                        return '';

                    default:
                        Y.log('Unknown property: ' + propName, 'warn', NAME);
                }
            };

            /**
             *  Set tab flow of the page
             */

            element.setTabIndex = function() {
                var jqMe = element.jqSelf();
                if (element.readonly) {
                    jqMe.attr('tabIndex', -1);
                    return;
                }
                jqMe.attr('tabIndex', element.tabIndex);
            };

            /**
             *  Replace magic strings within value
             *  TODO: this will be expanded for generalized mapper extensions, to embed mapped values in text
             */

            element.replaceMagic = function(txt) {

                if ('string' !== typeof txt) { return txt; }

                var date = new Date(),
                    d = date.getDate(),
                    m = date.getMonth() + 1,
                    y = date.getFullYear(),
                    dateStr = y + '-' + (m<=9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);

                return txt.replace(new RegExp('{{date}}', 'g'), dateStr);
            };

            /**
             *  Load an image by AJAX
             *  @param  mediaId {String}  Just an identifier in the database at this point, not a real file
             */

            element.setImage = function(mediaId) {
                Y.log('Deprecated, please use Y.dcforms.elements.setImage instead', 'warn', NAME);
                Y.dcforms.elements.setImage(mediaId);
            };

            /**
             *  Switch between filling or editing the form
             *
             *  @param  mode        {string}    A valid form mode name (fill|edit|pdf|lock|shutdown)
             *  @param  callback    {function}  Of the form fn(err)
             */

            element.setMode = function(mode, callback) {
                //Y.log('Setting mode on element from ' + element.mode + ' to ' + mode, 'debug', NAME);

                if ('removed' === element.mode) {
                    //  can never change to another mode once removed
                    callback(null);
                    return;
                }

                function onRendererModeSet() {
                    if (element.page.form.isInEditor) {
                        //  Using an element renderer object
                        //  update default values when moving from fill to edit mode
                        if ( 'edit' === element.mode ) {
                            element.value = element.defaultValue[ element.getCurrentLang() ];
                        } else {
                            element.value = element.defaultValue[ element.getBestLang() ];
                        }
                    }
                    element.mode = mode;
                    callback(null);
                }

                if (true === element.rendererLoaded && element.renderer.hasOwnProperty('setMode')) {
                    element.renderer.setMode(mode, onRendererModeSet);
                } else {
                    //  should not happen, but some element types still have basic renderers
                    onRendererModeSet(null);
                }

            };

            /**
             *  Simpler way for parent binders to set values in response to form events
             *
             *  @method setValue
             *  @param  newValue    {String}    New value, depending on element
             *  @param  callback    {Function}  Of the form fn(err)
             */

            element.setValue = function(newValue, callback) {
                //Y.log('Setting element value to ' + newValue, 'debug', NAME);

                if (newValue !== element.value) {
                    element.isDirty = true;
                }

                function onValueSet() {
                    element.updateBounds();
                    Y.dcforms.event.raise('formElementValueSet', evt);
                    //element.renderAbstract(element.lastOffset, callback);
                    callback(null);
                }

                if (!callback) {
                    callback = function() {
                        Y.log('Missing callback to element.setValue(), call stack follows:', 'warn', NAME );
                        console.log('stack trace follows', new Error() );   //  eslint-disable-line no-console
                    };
                }

                var evt = { 'source': element.UID, 'newValue': newValue, 'oldValue': element.unmap() };

                if ( element.renderer && element.renderer.setValue ) {
                    element.renderer.setValue(newValue, onValueSet);
                } else {
                    Y.log( 'Could not set element value, missing renderer: ' + element.elemType, 'warn', NAME );
                    onValueSet( null );
                }
            };

            /**
             *  For legacy reasons different elements return text serializations of strings, lists or tables
             */

            element.getValue = function() {
                if (!element.renderer || !element.renderer.getValue) {
                    Y.log('element renderer does not export value: ' + element.elemType, 'debug', NAME);
                    return element.value;
                }
                return element.renderer.getValue();
            };

            /**
             *  Set the default value of this element in a single language
             *
             *  @param  lang        {String}    Two letter language code (de|en)
             *  @param  newValue    {String}    New default value in element format
             */

            element.setDefaultValue = function(lang, newValue) {
                var
                    langGen = element.getCurrentLang();
                /*
                    evt = {
                        'source': element.UID,
                        'lang': lang,
                        'gender': element.page.form.gender,
                        'newValue': newValue,
                        'oldValue': element.defaultValue[lang]
                    };
                    */

                element.defaultValue[ langGen ] = newValue;
                element.isDirty = true;

                if (('edit' === element.page.form.mode) && (lang === element.page.form.userLang)) {

                    if (element.display && '' !== element.display) {
                        element.display = '';
                    }

                }

            };

            /**
             *  Note whether a translation is dirty or not
             *
             *  @param  lang    {String}    Language code (en|de)
             *  @param  isDirty {Bool}      True if the translation needs to be revised
             */

            element.setTranslationDirty = function(lang, isDirty) {

                if (false === element.translationDirty.hasOwnProperty[lang]) {
                    //  unknown language
                    return;
                }

                var evt = { 'source': element.UID, 'lang': lang, 'isDirty': isDirty };
                element.translationDirty[lang] = isDirty;
                Y.dcforms.event.raise('formTranslationDirty', evt);
                element.onEditForm();
            };


            /*----------------------------------------------------------------------------------------------
             *	EVENT HANDERS
             */

            /**
             *  Return an object describing pixel dimensions of this element
             *
             *  DEPRECATED, now handled by dedicated subelement box model
             *
             *  @return {Object}
             */

            element.toBox = function() {
                return element.mm.toScale(element.page.form.zoom);
            };

            /*
             *	Notify this element element its properties have been changed
             *  (called by edit_element_basic when something changes)
             */

            element.onEditForm = function() {

                // TODO valdation here

                function onElementRedrawn() {
                    element.page.onDirty();
                }

                element.render(onElementRedrawn);

            };

            /*
             *	Move on shift+key down
             *  @param  e   {Object}
             */

            element.onKeyDown = function(e) {

                var
                    form = element.page.form,
                    paper = form.paper;

                if (17 === e.which) {
                    form.ctrlKey = !form.ctrlKey;
                }

                if (('edit' === form.mode) && (true === e.shiftKey) && (form.gridSize > 0)) {
                    //element.raiseBinderEvent('onElementDefaultChanged', element);

                    //  handle keyboard move by Shift+Arrow
                    if (false === form.ctrlKey) {

                        switch (e.which) {
                            case 37:
                                //  move left
                                element.mm.left = (element.mm.left - form.gridSize);
                                if (element.mm.left < 0) {
                                    element.mm.left = 0;
                                }
                                break;

                            case 38:
                                //  move up
                                element.mm.top = (element.mm.top - form.gridSize);
                                if (element.mm.top < 0) { element.mm.top = 0; }
                                break;

                            case 39:
                                //  move right
                                element.mm.left = (element.mm.left + form.gridSize);
                                if ((element.mm.left + element.mm.width) > paper.width) {
                                    element.mm.left = (paper.width - element.mm.width);
                                }
                                break;

                            case 40:
                                //  move down
                                element.mm.top = (element.mm.top + form.gridSize);
                                if ((element.mm.top + element.mm.height) > paper.height) {
                                    element.mm.top = paper.height - element.mm.height;
                                }
                                break;

                            default:
                                // nothing to do
                                return;
                        }

                        e.preventDefault();

                        //element.onUpdateEditForm();
                        //element.render();
                        element.onDirty();
                    }

                    //  handle keyboard resize by Shift+Arrow
                    if (true === element.page.form.ctrlKey) {
                        //  TODO prevent resize below content bounds
                        switch (e.which) {
                            case 37:
                                //  reduce width
                                element.mm.width = (element.mm.width - element.page.form.gridSize);
                                if (element.mm.left < element.page.form.gridSize) { element.mm.left = element.page.form.gridSize; }
                                break;

                            case 38:
                                //  reduce height
                                element.mm.height = (element.mm.height - form.gridSize);
                                if (element.mm.height < form.gridSize) { element.mm.top = form.gridSize; }
                                break;

                            case 39:
                                //  increase width
                                element.mm.width = (element.mm.width + form.gridSize);
                                if ((element.mm.left + element.mm.width) > paper.width) {
                                    element.mm.width = (paper.width - element.mm.left);
                                }
                                break;

                            case 40:
                                //  increase height
                                element.mm.height = (element.mm.height + form.gridSize);
                                if ((element.mm.top + element.mm.height) > paper.height) {
                                    element.mm.height = (paper.height - element.mm.top);
                                }
                                break;

                            default:
                                // nothing to do
                                return;
                        }

                        e.preventDefault();

                        element.onUpdateEditForm();
                        element.render();
                        element.onDirty();
                    }

                }

            };

            /**
             *  Fired when something has changed in form structure, cue autosave
             */

            element.onDirty = function() {
                if ('edit' !== element.page.form.mode) { return; }

                //element.onUpdateEditForm();
                element.page.onDirty();
            };

            /**
             *  Raised when form value has changed
             */

            element.onValueChanged = function() {
                element.page.form.raise('elementValueChanged', element);
                //element.raiseBinderEvent('onElementValueChanged', element);
                //element.raiseBinderEvent('onFormValueChanged', element);
                if ('edit' === element.page.form.mode) {
                    element.onUpdateEditForm();
                }
            };

            /**
             *  Pass an event to parent binder
             *
             *  @param  eventName   {string}    Name of binder event
             *  @param  eventData   {object}    Event details or payload
             */

            element.raiseBinderEvent = function(eventName, eventData) {
                //Y.log('Raising binder event: ' + eventName, 'debug', NAME);
                element.page.raiseBinderEvent(eventName, eventData);
            };

            //  INITIALIZE AND CALL BACK

            function onFirstUnserialize(err) {
                creationCallback(err, element);
            }

            if (!creationCallback) {
                Y.log('No creation callback set when creating element.', 'warn', NAME);
                creationCallback = Y.dcforms.nullCallback;
            }

            if (serialized) {
                element.unserialize(serialized, Y.dcforms.checkSingleCB(onFirstUnserialize, 'unserialize element called back nultiple times (header?)'));
            } else {
                creationCallback(null, element);
            }

        }

        /*
         *  Extend YUI object with a method to instantiate these
         */

        Y.dcforms.element = {
            create: function (page, idx, serialized, callback) {
                return createPageElement(page, idx, serialized, callback);
            }
        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module configuration */
    {
        requires: [
            'dcforms-subelement',
            'dcforms-imagecache',
            'dcforms-element-audio',
            'dcforms-element-barcode',
            'dcforms-element-checkbox',
            'dcforms-element-togglebox',
            'dcforms-element-date',
            'dcforms-element-dropdown',
            'dcforms-element-image',
            'dcforms-element-radio',
            'dcforms-element-subform',
            'dcforms-element-table',
            'dcforms-element-reporttable',
            'dcforms-element-labdatatable',
            'dcforms-element-meddatatable',
            'dcforms-element-contacttable',
            'dcforms-element-textarea',
            'dcforms-element-textmatrix',
            'dcforms-element-hyperlink',
            'dcforms-element-video',
            'dcforms-element-chartmd',
            'dcforms-element-infotree'
        ]
    }
);
