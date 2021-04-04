/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  YUI module to load and render subform elements onto canvas
 */

//  exception for unused vars in this file, used when debugging subforms
/*eslint no-unused-vars:0 */

/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-element-subform',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.elements) { Y.dcforms.elements = {}; }

        Y.log('Adding renderer for dcforms subform type.', 'debug', NAME);

        /**
         *  Factory method for subform element renderers - these make the actual DOM elements representing an element
         *
         *  Context specific to this instance is kept in the renderer, code common to all instances is linked in
         *  the closure to save memory.
         *
         *  @param  element             {Object}    A dcforms-element object to be rendered into a page
         *  @param  creationCallback    {Function}  Of the form fn(err, newRenderer)
         */

        Y.dcforms.elements.makeSubformRenderer = function(element, creationCallback) {
            //  PRIVATE MEMBERS

            //  prevent creation of tiny subforms (can happen if mouse events are dropped)
            if (element.mm.width < 40) {
                element.mm.width = 40;
            }

            if (element.mm.height < 30) {
                element.mm.height = 30;
            }

            var
                _async = Y.dcforms._async,
                subFormId = '',                         //_ canonical / database _id of a formtemplate object
                subFormVersionId = '',                  //_ not currently used

                subTemplate,
                subTemplateLoaded = false,              //_ set to true when subtemplate is loaded (not rendered)
                lastMode = 'init',                      //_ keep track of mode changes for PDF rendering
                isInitialized = false,                  //_ set to true when DOM stuff is bound

                mappedBeforeRender = false,             //_ set to true if this was mapped before template loaded or rendered
                unserializedBeforeRender = false,       //_ set to true if this was unserialized before template was loaded or rendered
                isRendered = false,                     //_ set to true after first render

                subElemBg,                              //_ element background

                mappedData,                             //_ in case of mapping before form load is complete
                serializedData,                         //_ in case of unserializing before form load is complete
                initializeMode = '',                    //_ mode to use for subform if set before load is complete
                pubMethods;

            //  PRIVATE METHODS

            function initialize() {
                //  subelement to capture clicks in editor
                subElemBg = Y.dcforms.createSubElement(
                    0,                                          //  relative to element (parent)
                    0,                                          //  relative to element (parent)
                    element.mm.width,
                    element.mm.height,
                    '',
                    null
                );

                subElemBg.bindmark = true;                     //  show binding
                subElemBg.noncontent = true;                   //  allow size reduction
                subElemBg.element = element;

                //  used in debugging
                //subElemBg.bgColor = element.bgColor;
                //subElemBg.borderColor = element.borderColor;

                subElemBg.interactive = ( 'edit' === element.page.form.mode );

                element.subElements = [];
                element.subElements[0] = subElemBg;
                isInitialized = true;
            }

            //  PUBLIC METHODS

            function setValue( newValue, callback ) {
                generateSubElements();

                //  don't reload the subform needlessly
                if ( element.value === newValue && subTemplateLoaded ) {
                    Y.log( 'Skipping reload of subform, already set to: ' + element.value, 'debug', NAME );
                    return callback( null );
                }

                element.value = newValue;
                isRendered = false;

                loadSubTemplate( onSubTemplateLoaded );

                function onSubTemplateLoaded(err) {
                    if (err) {
                        Y.log( 'Error loading subform template: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback(err);
                    }

                    //  update parent element aspect ratio to match subform paper dimensions
                    if (subTemplate && subTemplate.paper && subTemplate.isLoaded) {
                        element.mm.height = (element.mm.width / (subTemplate.paper.width / subTemplate.paper.height));
                        Y.log( 'Finished loading subform template: ' + subTemplate.canonicalId + ' from element value: ' + element.value, 'debug', NAME );
                    } else {
                        Y.log( 'Subform template couls not be loaded from element value: ' + element.value, 'warn', NAME );
                    }

                    //  copy subform structure into this element
                    callback( null );
                }
            }

            /**
             *  Look up and load the subtemplate from server
             *
             *  This subtemplate will be this element's value, or personalienfeld by default
             *
             *  TODO: tidy with async
             *
             *  @param subTemplateCallback {function}  Of the form fn(err)
             */

            function loadSubTemplate(subTemplateCallback) {

                /*
                 *  The subform will be bound to the Personalienfeld role by default, due to legacy forms
                 */

                if (subTemplate && element.value === subTemplate.canonicalId) {
                    Y.log('Subtemplate already loaded, not repeating load operation: ' + element.value, 'debug', NAME);
                    return subTemplateCallback(null);
                }

                var
                    configKey = 'casefile-personalienfeld',
                    pxWidth = parseInt(element.mm.width * element.page.form.zoom, 10),
                    formOptions = {
                        'canonicalId': '',                                  //  not yet specifying a form
                        'formVersionId': '',                                //  not yet specifying a form version

                        'isChildForm': true,                                //  child forms do not add themselves to the dom
                        'divId': '',                                        //  (not used for child forms)

                        'width': pxWidth,                                   //  pixel width of embedded form
                        'isHidden': true,                                   //  do not display subform directly in DOM
                        'il8nDict': Y.dcforms.il8nDict,                     //  legacy, to be replaced
                        'doRender': false                                   //  we'll render after load
                    };

                if (Y.dcforms.isOnServer) {
                    //  for direct db access
                    formOptions.user = element.page.form.user;
                } else {
                    //  used to make requests through the puc proxy
                    formOptions.patientRegId = element.page.form.patientRegId;
                }

                if (!element.value || '' === element.value || 'Personalienfeld' === element.value) {
                    // show the Personalienfeld by default, legacy forms could only use this subform
                    element.value = configKey;
                    if ('edit' === element.page.form.mode) {
                        element.defaultValue[element.getCurrentLang()] = configKey;
                    }
                }

                //  EXTMOJ-1063: handle case of kiosk mode, when subform lookup must be in packaged data
                if (Y.dcforms.usePackage) {
                    //  when in kiosk mode, subform must be sent in packaged data if it is to be loaded
                    onFormIdFound( null, element.value );
                } else {
                    //  in most cases we can look up subforms from the form list
                    lookupSubform(element.page.form.patientRegId, element.value, onFormIdFound);
                }

                /**
                 *  Look this subforms canonical form if element bound by role
                 *
                 *  @param  patientRegId    {String}    Allows communication through the PUC proxy
                 *  @param  identifier      {String}    Configuration key holding default form ID, form role or form name
                 *  @param  callback        {Function}  Of the form fn(err, formMeta)
                 */

                function lookupSubform(patientRegId, identifier, callback) {
                    //  On server we need to pass the rest user, on client we may need patientRegId for PUC proxy
                    var
                        defaultValClean = element.defaultValue[ element.page.form.userLang ] || configKey,
                        firstArg = ( Y.dcforms.isOnServer ? element.page.form.user : patientRegId );

                    //  strip out any unmapped embeds, fall back to default value
                    identifier = element.page.cleanUnmappedEmbeds( identifier );
                    defaultValClean = element.page.cleanUnmappedEmbeds( defaultValClean );

                    Y.dcforms.findFormId( firstArg, identifier, onConfigLookup );

                    function onConfigLookup( err, subformCanonicalId ) {
                        if ( err || '' === subformCanonicalId ) {

                            //  if subform was not found, retry with the default value for this subform
                            //  with any custom mapping removed (default for a category of subforms)
                            if ( 'missing-subform' !== identifier && defaultValClean !== identifier ) {
                                Y.log( 'Could not find subform ' + identifier + ', trying ' + defaultValClean, 'debug', NAME );
                                identifier = defaultValClean;
                                element.value = identifier;
                                return Y.dcforms.findFormId( firstArg, identifier, onConfigLookup );
                            }

                            //  if subform was not found, retry with the form role for missing subforms
                            if ( 'missing-subform' !== identifier ) {
                                Y.log( 'Could not find subform ' + identifier + ', trying form role for missing subforms', 'debug', NAME );
                                identifier = 'missing-subform';
                                element.value = identifier;
                                return Y.dcforms.findFormId( firstArg, identifier, onConfigLookup );
                            }

                            Y.log('Could not load config key "' + identifier + '": ' + JSON.stringify(err), 'warn', NAME);
                            subTemplateCallback( err );
                            return;
                        }

                        //Y.log('Mapped config key: ' + configKey + ' ==> ' + subformCanonical, 'debug', NAME);
                        callback( null, subformCanonicalId );
                    }
                }

                /**
                 *  Called when and if we have a subform canonical Id
                 *
                 *  @param  err                 {string}
                 *  @param  subFormCanonicalId  {string}    Database _id of a formtemplate
                 */

                function onFormIdFound(err, subFormCanonicalId) {

                    subFormId = subFormCanonicalId;
                    //element.defaultValue.en = subFormId;
                    //element.defaultValue.de = subFormId;
                    //element.value = subFormId;

                    if (err) {
                        Y.doccirrus.comctl.setModal('Unknown subform.', subFormCanonicalId);
                        Y.log('Could not find form instance: ' + err, 'warn', NAME);
                        return subTemplateCallback( err );
                    }

                    //  If we have an existing form template then reload it
                    if ( subTemplate ) {
                        Y.log( 'Re-using existing subtemplate, previous id: ' + subTemplate.canonicalId + ' new id: ' + subFormId, 'debug', NAME );
                        return onSubformCreated( null, subTemplate );
                    }

                    //Y.log('Instantiating subform: ' + subFormCanonicalId, 'debug', NAME);
                    //  TODO: allow binding to specific subform versions
                    //formOptions.canonicalId = subFormId;
                    //formOptions.formVersionId = subFormVersionId;

                    formOptions.callback = onSubformCreated;
                    Y.dcforms.createTemplate( formOptions );

                }

                function onSubformCreated(err, newTemplate) {
                    if (err) {
                        Y.log('Could not load subform: ' + err, 'warn', NAME);
                        return;
                    }

                    subTemplate = newTemplate;
                    subTemplate.onBinderEvent = onSubformEvent;     //  DEPRECATED legacy event passer
                    //Y.log('Loading subform: ' + subFormId + ' -v- ' + subFormVersionId, 'debug', NAME);

                    subTemplate.load( subFormId, subFormVersionId, onSubFormLoaded );
                }

                function onSubFormLoaded(err) {
                    if (err) {
                        Y.log('Could not load subform: ' + JSON.stringify(err), 'warn', NAME);
                        subTemplateCallback(err);
                        return;
                    }

                    subTemplate.ownerCollection = 'subform';
                    subTemplate.ownerId = 'subform';
                    subTemplate.patientRegId = element.page.form.patientRegId || '';

                    //  inherit BFB state from parent form
                    //  controls whether background can print, MOJ-4169
                    subTemplate.isBFB = element.page.form.isBFB;

                    subTemplateLoaded = true;
                    element.isDirty = true;

                    //  will reset subelement size and render
                    update(onSubTemplateRendered);
                }

                function onSubTemplateRendered(err) {
                    if (Y.dcforms.isOnServer) {
                        Y.log('subtemplate px width: ' + subTemplate.px.width, 'debug', NAME);
                        Y.log('subtemplate paper width: ' + subTemplate.paper.width, 'debug', NAME);
                        Y.log('subtemplate zoom: ' + subTemplate.zoom, 'debug', NAME);
                    }

                    subTemplateCallback(err);
                }
            }

            /**
             *  Elements have a number of display modes (edit|fill|pdf|lock|...etc), behavior should match
             *
             *  @param  newMode     {string}    Name of a form mode (fill|edit|pdf|lock|shutdown)
             *  @param  callback    {function}  Of the form fn(err)
             */

            function setMode(newMode, callback) {

                if ( subElemBg ) {
                    subElemBg.interactive = ( 'edit' === newMode );
                }

                if (false === subTemplateLoaded) {
                    Y.log('Attempting to set mode before subtemplate loaded.', 'warn', NAME);
                    //  set this mode when subform is loaded
                    initializeMode = newMode;
                    return callback( null );
                }

                if ('edit' === element.page.form.mode) {
                    newMode = 'lock';
                }

                Y.log('Setting subform to mode: ' + newMode, 'debug', NAME);

                function onSubformModeSet() {
                    lastMode = newMode;

                    subTemplate.render(Y.dcforms.nullCallback);
                    isRendered = true;
                    callback(null);
                }

                subTemplate.setMode(newMode, onSubformModeSet);
            }

            function getBoundElement(schemaMember) {
                if (!subTemplateLoaded) {
                    return null;
                }

                return subTemplate.getBoundElement(schemaMember);
            }

            /**
             *  Called before unlinking this renderer
             *  Remove all child objects and event handlers
             */

            function destroy() {
                var jqMe = element.jqSelf();
                subTemplate.destroy();
                jqMe.html('');
            }

            /**
             *  Map a plain object into this subform
             *
             *  @param  data        {object}    Must match reduced schema of subform
             *  @param  callback    {function}  Of the form fn(err)
             */

            function map( data, callback ) {
                element.isDirty = true;

                function onSubformMapped(err) {
                    if (err) {
                        Y.log( 'Could not map subform: ' + JSON.stringify(err), 'warn', NAME );
                        callback(err);
                        return;
                    }

                    element.isDirty = true;
                    element.page.isDirty = true;

                    //  render operation will refresh dirty elements / subelements
                    subTemplate.render(callback);
                }

                mappedData = data;

                if ( false === isRendered ) {
                    mappedBeforeRender = true;
                }

                if ( false === subTemplateLoaded && !Y.dcforms.isOnServer ) {
                    Y.log('Attempting to map data before subtemplate loaded, deferring', 'warn', NAME);
                    callback( null );
                    return;
                }

                if ( !subTemplate ) {
                    //  template not yet loaded, or is being reloaded due to a previous map() operation
                    Y.log('Attempting to map data before subtemplate created, deferring', 'warn', NAME);
                    return callback( null );
                }

                subTemplate.map( data, true, onSubformMapped );
            }

            /**
             *  Return bound subform data as a plain object
             */

            function unmap() {
                if (false === subTemplateLoaded) {
                    Y.log('Attempting to unmap data before subtemplate loaded.', 'warn', NAME);
                    return {};
                }

                return subTemplate.unmap();
            }

            /**
             *  Returns a base64 encoded serialization of the current state of this form (including unmapped elements)
             */

            function toDict64() {

                if (false === subTemplateLoaded) {
                    Y.log('Attempting to serialize subtemplate dict before subtemplate loaded.', 'warn', NAME);
                    return '';
                }

                return Y.doccirrus.comctl.UTF8ToB64(JSON.stringify(subTemplate.toDict()));
            }

            /**
             *  Returns a serialization of the current state of this form as a plain Javascript object
             */

            function toDict() {
                //  initialize with serialized data, in case toDict called before template is loaded
                var stDict = serializedData || {};

                if ( false === subTemplateLoaded ) {
                    Y.log('Attempting to serialize subtemplate dict before subtemplate loaded.', 'warn', NAME);
                    return stDict;
                }

                stDict = subTemplate.toDict();

                //  default to element value
                stDict.__value__ = element.value;

                if ( subTemplate && subTemplate.canonialId ) {
                    //  use exact canonical ID if available
                    stDict.__value__ = subTemplate.canonialId;
                }

                return stDict;
            }

            /**
             *  Loads a base64 encoded serialization of the current state of this form (including unmapped elements)
             *  @param  dict64      {String}    See above
             *  @return             {Boolean}   True on success, false on failure
             */

            function fromDict64( dict64, callback ) {
                element.page.isDirty = true;

                var dictObj;

                try {
                    dictObj = JSON.parse(Y.doccirrus.comctl.B64ToUTF8(dict64));

                    if (false === isRendered) {
                        if( Y.config.debug ) {
                            Y.log('Attempting to set subtemplate dict before subtemplate rendered: ' + JSON.stringify(dictObj), 'warn', NAME);
                        }
                        serializedData = dictObj;
                        unserializedBeforeRender = true;
                        fromDict( dictObj, callback );
                        return false;
                    } else {
                        fromDict( dictObj, callback );
                    }

                } catch ( parseErr ) {
                    Y.log('Could not unserialize form dict: ' + parseErr, 'warn', NAME);
                    return callback( parseErr );
                }

                //  should never happen
                callback( 'Could not expand base64 encoded subform data' );
            }

            /**
             *  Directly set form values
             *  @param  dict    {Object}    Keys and values
             */

            function fromDict( dict, callback ) {
                callback = callback ? callback : Y.dcforms.nullCallback;

                //  if no subform yet loaded, wait until we have one
                if ( !subTemplate ) {
                    Y.log( 'Unserialized before subtemplate ' + element.elemId + '/' + element.value + ' was loaded, keeping data.', 'warn', NAME );
                    serializedData = dict;
                    unserializedBeforeRender = true;
                    return callback( null );
                }

                Y.dcforms.runInSeries( [ changeFormFromDict, setStoredValues, rerenderSubform ], onAllDone );

                function changeFormFromDict( itcb ) {
                    //  skip this step if subform unspecified or already loaded
                    if ( !dict.__value__ || dict.__value__ === element.value ) { return itcb( null ); }

                    setValue(  dict.__value__, itcb );
                }

                function setStoredValues( itcb ) {
                    generateSubElements();
                    element.page.isDirty = true;
                    subTemplate.fromDict( dict, itcb );
                }

                function rerenderSubform( itcb ) {
                    subTemplate.render( itcb );
                }

                function onAllDone( err ) {
                    if ( err ) {
                        Y.log( 'Problem unserializing subform from dict: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    }

                    isRendered = true;
                    element.isDirty = true;

                    callback( null );
                }
            }

            /**
             *  Raised when element properties change, eg, size, bg color, etc
             *  @param callback
             */

            function update( callback ) {
                if (!callback) {
                    Y.log('Missing callback to update(): ' + (new Error().stack), 'debug', NAME);
                    callback = Y.dcforms.nullCallback;
                }

                var pxWidth = parseInt( element.mm.width * element.page.form.zoom, 10 );

                if (pxWidth < 10) { pxWidth = 10; }   //  never make it too small to resize

                subElemBg.width = element.mm.width;
                subElemBg.height = element.mm.height;

                if ( !subTemplate ) {
                    Y.log( 'Attempted to update subtemplate before it was loaded, stack trace follows: ', 'warn', NAME );
                    console.log( new Error().stack );   // eslint-disable-line no-console
                    return callback( null );
                }

                Y.dcforms.runInSeries( [ doResize, reUnserializeForm, reMapForm, reSetMode, reRenderForm, copySubElements ], onAllDone );

                function doResize( itcb ) {
                    //  skip this step if subform pixel size is correct
                    if ( pxWidth === subTemplate.pxWidth ) { return itcb( null ); }
                    subTemplate.resize( pxWidth, itcb );
                }

                function copySubElements( itcb ) {
                    var
                        aspect = subTemplate.paper.width / subTemplate.paper.height,
                        idealHeight = parseInt(element.mm.width / aspect, 10);

                    if (element.mm.height !== idealHeight) {
                        element.mm.height = idealHeight;
                        subElemBg.height = idealHeight;
                    }

                    generateSubElements();
                    itcb( null );
                }

                function reUnserializeForm( itcb ) {
                    if ( !serializedData ) { return itcb( null ); }
                    subTemplate.fromDict( serializedData, itcb );
                }

                function reMapForm( itcb ) {
                    if ( !mappedData ) { return itcb( null ); }
                    subTemplate.map( mappedData, false, itcb );
                }

                function reSetMode( itcb ) {
                    if ( '' === initializeMode ) { return itcb( null ); }
                    subTemplate.setMode( initializeMode, itcb );
                }

                function reRenderForm( itcb ) {
                    subTemplate.render( itcb );
                }

                function onAllDone( err ) {
                    if ( err ) { return callback( err ); }
                    element.isDirty = isRendered;
                    callback( null );
                }

            }

            function generateSubElements(){
                return true;
            }

            /**
             *  Return a flat array of the child form's elements
             *  @returns {Array}
             */

            function getSubElements() {
                var
                    subElements = [],
                    elem,
                    i, j;

                subElements.push( subElemBg );

                //  check that there is a valid child form to add
                if (!subTemplate || !subTemplate.pages || !subTemplate.pages[0]) {
                    return subElements;
                }

                //  check if there is a background image to add, and that it should be present in this context
                addSingleSubElem( getPdfBgSubElement() );

                for (i = 0; i < subTemplate.pages[0].elements.length; i++) {
                    elem = subTemplate.pages[0].elements[i];
                    for (j = 0; j < elem.subElements.length; j++) {
                        addSingleSubElem( elem.subElements[j] );
                    }
                }

                function addSingleSubElem( subelem ) {
                    if ( !subelem ) { return; }
                    subelem.element = element;
                    subelem.subformScale = (subTemplate.zoom / element.page.form.zoom);
                    subelem.subformLeft = subElemBg.fixedLeft;
                    subelem.subformTop = subElemBg.fixedTop;
                    subelem.fixedPage = subElemBg.pageTop;
                    subElements.push(subelem);
                }

                return subElements;
            }

            /**
             *  Get the subtemplate page packground image in PDF mode if settings allow
             */

            function getPdfBgSubElement() {
                var bgSubElem = null;

                //  check if there is a background image to add
                if (subTemplate.pages[0].bgElem && subTemplate.pages[0].bgElem.subElements[1]) {
                    bgSubElem = subTemplate.pages[0].bgElem.subElements[1];
                }

                //  but do not include it if in PDF mode and the subform print properties disallow it
                if ('pdf' === element.page.form.mode && false === subTemplate.pdf.printBackground) {
                    bgSubElem = null;
                }

                return bgSubElem;
            }

            //  EVENT HANDLERS

            function onSubformEvent(eventName, eventData) {
                //Y.log('Subform event: ' + eventName, 'debug', NAME);

                switch(eventName) {
                    case 'onFormLoaded':
                        subTemplateLoaded = true;
                        element.page.form.raiseBinderEvent('onSubformLoaded', subTemplate);
                        break;
                }

                element.page.form.raiseBinderEvent('sf' + eventName, eventData);
            }

            /**
             *  Gte the set of referenced schema members in the child form for generic form mappers
             */

            function getSchemaReferences() {
                if ( !subTemplateLoaded || !subTemplate ) { return []; }
                return subTemplate.getSchemaReferences();
            }

            /**
             *  EXTMOJ-1043 make a list of all referenced media in a form for transfer to dispatcher
             */
            function getReferencedMedia() {
                if ( !subTemplateLoaded || !subTemplate || !subTemplate.getReferencedMedia ) { return []; }
                return subTemplate.getReferencedMedia();
            }


            /*
            function onKeyDown(e) {
                //  parent object handles general key events
                element.onKeyDown(e);
            }
            */

            //  SET UP AND RETURN THE NEW RENDERER

            initialize();

            function onSubformLoaded(err) {
                creationCallback(err, pubMethods);
            }

            loadSubTemplate(onSubformLoaded);

            pubMethods = {
            //  'renderAbstract': renderAbstract,
            //  'render': render,
                'setValue': setValue,
                'update': update,
                'setMode': setMode,
                'destroy': destroy,
                'map': map,
                'unmap': unmap,
                'toDict64': toDict64,
                'toDict': toDict,
                'fromDict64': fromDict64 ,
                'fromDict': fromDict,
                'getBoundElement': getBoundElement,
                'getSubElements': getSubElements,
                'getPdfBgSubElement': getPdfBgSubElement,
                'generateSubElements': generateSubElements,
                'getSchemaReferences': getSchemaReferences,
                'getReferencedMedia': getReferencedMedia
            };

        };

    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: []
    }
);