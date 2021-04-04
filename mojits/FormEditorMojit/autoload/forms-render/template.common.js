/**
 *	Form template definition, a collection of pages and metadata describing renderign and data binding
 *
 *	@param templateFile     location of form template relative to FormEditorMojit/assets/
 */

/*global YUI, $, setImmediate */
/*eslint prefer-template:0, strict:0 */

'use strict';

YUI.add(

    /* YUI module name */
    'dcforms-template',

    /* Callback */

    function (Y, NAME) {

        Y.log('Adding Y.dcforms.template', 'info', NAME);

        if (!Y.dcforms) {
            Y.dcforms = {};
        }

        //  page layer enum, used by canvasses, elements and subelements
        Y.dcforms.LAYER_ALL = 0;
        Y.dcforms.LAYER_BG = 1;
        Y.dcforms.LAYER_TEXT = 2;
        Y.dcforms.LAYER_INTERACTION = 3;

        Y.dcforms.TOUCH_RADIUS = 12;

        //  MOJ-6188 maximum length of reports, approx
        //  (note that this value expands to 200 pages when adding the default report header and footer)
        Y.dcforms.MAX_PAGES = 142.5;

        //  print messages time out after 5s
        Y.dcforms.PRINT_MSG_TIMEOUT = 5000;

        //  colors for element highlight
        Y.dcforms.COLOR_HIGHLIGHT = 'rgba(220,255,190,0.3)';
        Y.dcforms.COLOR_EDITOR = 'rgba(128, 128, 128, 0.25)';
        Y.dcforms.COLOR_BOUND = 'rgba(50, 50, 255, 0.15)';
        Y.dcforms.COLOR_UNBOUND =  'rgba(50, 50, 50, 0.15)';
        Y.dcforms.COLOR_LINKED = 'rgba(255, 69, 0, 0.15)';
        Y.dcforms.COLOR_BG_DEFAULT = 'rgba(255, 255, 255, 0)';
        Y.dcforms.COLOR_FG_DEFAULT = 'rgba(0, 0, 0, 0.8)';
        Y.dcforms.COLOR_INVALID = 'rgba(0,0,0,0)';                  //  transparent
        Y.dcforms.COLOR_BORDER_INVALID = '#a94442';                 //  same as bootstrap outline

        Y.dcforms.COLOR_WRONG = '#FFFF33';                          //  highlight color for incorrect text, transcription

        Y.dcforms.COLOR_HOVER = 'rgba(100, 100, 100, 0.15)';
        Y.dcforms.COLOR_BORDER_HOVER = 'rgba(0, 0, 0, 0.15)';

        Y.dcforms.COLOR_HEADER_HIGHLIGHT = 'rgba(0,0,255,0.25)';
        Y.dcforms.COLOR_FOOTER_HIGHLIGHT = 'rgba(0,0,255,0.25)';
        Y.dcforms.COLOR_GROUP_SELECT = 'rgba(0,255,0,0.25)';

        Y.dcforms.HYPERLINK_COLOR = 'rgba(50,50,255,1)';
        Y.dcforms.HYPERLINK_DEFAULT = 'https://www.doc-cirrus.com/';

        Y.dcforms.MAX_FONT_SIZE = 200;                              //  mm, see SUP-16063

        //  available on both client and server
        var _async = Y.dcforms._async;

        /**
         *  Constructor
         *
         *  @param  options                     {Object}
         *  @param  options.user                {Object}    needed when loading on the server
         *  @param  options.withPatientRegId    {String}    locates the PRC/VPRC to load the form from
         *  @param  options.canonicalId         {String}    database _id or master / editable template
         *  @param  options.formVersionId       {String}    database _id of a specific version of a form, or empty string
         *  @param  options.divId               {String}    Div to render this into
         *  @param  options.il8nDict            {Object}    Translation dictionary
         *  @param  options.doRender            {Boolean}   Render when loaded if true
         *  @param  options.isHidden            {Boolean}   Not drawn into DOM if true
         *  @param  options.isInEditor          {Boolean}   True if extra editing functionality should be enabled
         *  @param  options.userLang            {String}    'de'|'en'
         *  @param  options.gender              {String}    'm'|'f'|'n'
         *  @param  options.callback            {Function}  Of the form fn(err, template)
         *
         *  Note that a different scheme for passing around dictionaries may be implemented
         */

        //function createTemplate(user, withPatientRegId, canonicalId, formVersionId, divId, il8nDict, doRender, callback) {
        Y.dcforms.createTemplate = function( options ) {

            /*
             *	Properties
             */

            var
                DEFAULT_FOLDER = Y.doccirrus.schemas.formfolder.recoveryFolderId,
                template;

            template = {

                //  Passed options

                'user': options.user,                           //_ replaced with REST user on server

                'canonicalId': options.canonicalId || '',       //_ database _id of master / editable version of form
                'formVersionId': options.formVersionId || '',   //_ database _id of a specific version of this form, or ''
                'patientRegId': options.patientRegId || '',     //_ used when viewing forms through PUC proxy
                'domId': options.divId || 'divFormsCompose',    //_ when rendering for display / editing [string]
                'isChildForm': options.isChildForm || false,    //_ set to true if the current instance is embedded in another form [bool]

                'px': {                                         //_ width of viewport this form is rendered into
                    'width': options.width || 703,
                    'defaultWidth': options.width || 703        //_ used if container div is not yet available
                },

                //  Inherent properties

                'UID': Y.doccirrus.comctl.getRandId(),                   //  uniquely identifies this object

                //  Deprecated properties

                'formId': '',                   //_ LEGACY, DEPRECATED - historical user only, to be removed
                'instanceId': '',               //_ LEGACY, DEPRECATED - historical user only, to be removed

                'isOnServer': Y.dcforms.isOnServer,             // TRUE if form is being rendered on server
                'mapperName': options.mapperName || 'plain',    //_ name of mapper used to link this form to view models / database

                //  Loaded properties

                'name': {                       //_ name of this form in all interface languages
                    'en': 'untitled',
                    'de': 'untitled'
                },

                'shortName': '',

                'category': 'Test',             //_ corresponds to folder in display, DEPRECATED
                'formFolderId': DEFAULT_FOLDER, //_ folder this template belogs to
                'version': 1,                   //_ major compatibility version
                'revision': 0,                  //_ minor edit number
                'isOnDisk': false,              //_ set true if template saved to / loaded from disk

                'templateFile': '',             //_ DEPRECATED: name of current template file [string]
                'reducedSchema': '',            //_ name of schema used to validate this form [string]
                'schemaVersion': 1,             //_ increment on change [float]
                'actType': '',                  //_ activity type implied by use of this form (optional)

                'gridSize': 5,                  //_ element align [mm]
                'resolution': 11.811,           //_	dots per mm ~ 11.811 dpmm is 300 dpi [float]
                'orientation': 'portrait',      //_ 'portrait'|'landscape' [string]
                'isSubform': false,             //_ set to true if this form can be loaded as an element of other forms [bool]
                'isReadOnly': false,            //_ true if oen of the default forms [bool]
                'isFixed': true,                //_ elements do not move downward to accomodate overflow
                'isPdfAttached': false,         //_ display as concatenated PDFs in front end EXTMOJ-1985
                'isLetter': false,              //_ if true, UI for selecting a contact should be shown in casefile
                'utf8': false,                  //_ if true, use custom ttf fonts that substitute common one during pdf generation

                'defaultFor': '',               //_ role which this form is expected to have

                'paper': {                      //_ size of printed pages in mm (canonical)
                    'width': 210,
                    'height': 297
                },

                'pdf': {                        //_ additional PDF rendering options
                    'printerName': '',          //_ CUPS printer this form uses as default
                    'printBackground': true,
                    'printA4': false,
                    'rotate': 0,                //_ degrees (0|90|180|270) [int]
                    'scale': 1.0,               //_ applied to all elements, but not paper [float]
                    'offsetx': 0,               //_ jog horizontally in pdf (mm) [float]
                    'offsety': 0                //_ jog vertically in pdf (mm) [float]
                },

                'zoom': 1.0,                    //_ level of magnification at current rendered size [float]

                'isBFB': false,                 //_ true if this is a BFB (government regulated) form
                'bfbAlternative': '',           //_ optional, form to display if no BFB registration

                'useReporting': false,          //_ true if form content is to be extracted for use in inSight

                'pages': [],                    //_ set of page objects [array]
                'maxTabIndex': [],              //_ number of tab stops in all pages

                'mode': 'fill',                 //_ 'fill'|'edit' [string]
                'outstanding': 0,               //_ number of outstanding POSTS during a save or reset [int]

                //  DOM elements used to render in viewing or PDF rendering modes

                'renderDomId': 'divFormsRender',        //_ div to use for PDF rendering of pages [string]

                'hoverElement': null,           //_ reference to element under the mouse [object]
                'hoverSubElement': null,        //_ reference to subelement showing hover [object]
                'selectedElement': null,        //_ reference to current selected element [object]
                'selectionSubElement': null,    //_ reference to subelement showing current selection [object]
                'valueEditor': null,            //_ helper UI for selected element [object]
                'drag': { 'mode': '' },         //_ used when moving/resizing elements in edit mode
                'leftCol': true,                //_ display the left column [bool]
                'nextElemType': '',             //_ holds type of element while waiting for user to click it out [string]
                'renderPage': -1,               //_ page index, or -1 for all [int]
                'ctrlKey': false,               //_ set to true when ctrl key is pressed

                'lastHash': '',                 //_ prevent spurious saves to the server [string]
                'pdfWait': 0,                   //_ forces html2canvas to wait for images to loaded from server
                'autoSaveDelay': 0,             //_ don't spam the server
                'autoSaveMaxDelay': 2000,       //_ two seconds MOJ-3615
                'autoSaveDeferred': false,      //_ dont duplicate wait events

                'il8nDict': options.il8nDict || {},   //_ translation dictionary [object]

                // ownership of media and compiled PDFs
                'ownerCollection': 'forms',
                'ownerId': options.canonicalId || '',

                'mapData': {},                  //_ form field values to be used in loaded form

                'inheritanceMap': {},

                // current user language of page, may be overwritten by a stored user preference during load
                'userLang': options.userLang || Y.dcforms.getUserLang(),

                // grammatical gender defined in context ['m'|'f'|'n'] for letters, etc
                'gender': options.gender || 'n',

                // highlight editable elements on touch devices
                'highlightEditable': false,

                'backmappingFields': false,             //_ true if additional plaintext entries should be added in toDict()

                // load and render status
                'isHidden': options.isHidden || false,  //_ form may be abstract or hidden
                'isInDOM': false,                       //_ set to true when initialized in DOM
                'isInEditor': options.isInEditor || false,
                'isLoading': false,                     //_ set to true during form load
                'isLoaded': false,                      //_ set to true if loaded from server (and can be saved back)
                'isRendered': false,                    //_ set true after first render (UI should be updated)
                'inRender': false,                      //_ lets template know whan a window resize is its own fault
                'reRenderCount': 0,                     //_ handle redrawing on multiple concurrent re-render requests
                'isMapped': false,                      //_ true after map() operation
                'inMapOperations': 0,                   //_ number of map() operations currently ongoing

                //  for specilized barcode mapping
                'hasBarcode': false,

                //  keyboard status
                'kb': {
                    'ctrl': false,                      //_ set by form editor page
                    'shift': false                      //_ set by form editor page
                },

                'groupSelect': [],                      //_ selected elements
                'clipboard': [],                        //_ copied elements,
                'isFromToolbox': options.isFromToolbox || false
            };

            //  PRIVATE INITIALIZATION CODE

            template.event = Y.dcforms.createEventEmitter();

            //  PUBLIC METHODS

            /**
             *  Identify container DOM ID which holds this form
             *
             *  Note that PDF mode should no longer be necessary, may need it for server-side rendering in next version
             *
             *  @param  append  {String}    For elements named after the form's parent
             */

            template.getDomId = function(append) {
                append = append ? append : '';

                if ( !this.domId ) {
                    this.domId = 'divFormsCompose';
                }

                return this.domId + append;
            };

            /**
             *  Return a jQuery selection of this page /part's container div
             *
             *  @param  append  {String}    Add this to the domid when making the query
             */

            template.jqSelf = function (append) {
                return $( '#' + this.getDomId(append || ''));
            };

            /**
             *  Add canvasses to page (hidden or abstract templates may not be shown on the client)
             */

            template.addToDOM = function() {
                var html, i;

                if ( template.isHidden ) {
                    return false;
                }

                if (template.isOnServer ) {
                    template.domInitComplete = true;
                    return false;                           //  create rendering divs
                }

                var myInsertPoint = template.jqSelf();

                if ( template.isHidden ) {
                    Y.log( 'Template is hidden, not inserting into DOM', 'info', NAME );
                    return false;
                }

                if ( !myInsertPoint.get(0) ) {
                    Y.log('cannot insert form template, no such div: ' + template.getDomId( '' ), 'warn', NAME);
                    return false;
                }

                if ( !template.canonicalId || '' === template.canonicalId ) {
                    //Y.log('No form yet specified, will initialize on load.', 'info', NAME);
                    return;
                }

                /*
                if ( template.px.width !== myInsertPoint.width() ) {
                    template.resize( myInsertPoint.width() );
                }
                */

                html = '' +
                    //  should be hidden except in edit mode, shows form structure and default values (deprecated)
                    '<div id="' + template.getDomId('staging') + '" style="position: relative;"></div>' +
                    '<div id="' + template.getDomId('pages') + '" style="position: relative;"></div>' +
                    //  shows live form data split into  paper-sized sections
                    '<div id="' + template.getDomId('render') + '" style="position: relative;"></div>';

                myInsertPoint.html( html );

                template.jqSelf('staging').html('');

                for ( i = 0; i < template.pages.length; i++ ) {
                    template.pages[i].addToDOM();
                }

                template.isInDOM = true;
            };

            template.removeFromDOM = function() {
                //  no DOM on server
                if ( Y.dcforms.isOnServer ) { return; }
                if ( template.isChildForm ) { return; }

                var
                    templateContainer = template.jqSelf( '' ),
                    i;

                for ( i = 0; i < template.pages.length; i++ ) {
                    template.pages[i].removeFromDOM();
                }

                if ( templateContainer && templateContainer.length && templateContainer.get( 0 ) ) {
                    templateContainer.html( '' );
                }

                template.isInDOM = false;
            };

            template.hasCleanTranslation = function(userLang) {
                var
                    i,
                    j,
                    isClean = true;

                for (i = 0; i < this.pages.length; i++) {
                    for (j = 0; j < this.pages[i].elements.length; j++) {
                        if (false === this.pages[i].elements[j].translationDirty[userLang]) {
                            isClean = false;
                        }
                    }
                }

                return isClean;
            };

            /**
             *  Load form via REST API
             *
             *  TODO: tidy with async
             *
             *  @param  canonicalId     {String}    Database _id of current / master version of form
             *  @param  formVersionId   {String}    Database _id of a specific version of this form
             *  @param  loadCallback    {Function}  Of the form fn(err)
             */

            template.load = function (canonicalId, formVersionId, loadCallback) {
                var
                    serializedToJSON;

                //  abort if load is already in progress
                if ( template.isLoading ) { return loadCallback( 'Form load is already in progress' ); }

                //  clear the form
                template.canonicalId = canonicalId;         //  record currently loaded template
                template.formVersionId  = formVersionId;    //  record currently loaded template
                template.pages = [];                        //  unset any previous pages
                template.valueEditor = null;

                Y.dcforms.runInSeries(
                    [
                        setFlags,
                        createContainers,
                        getSerializedTemplate,
                        loadSerializedTemplate,
                        setInitialMode
                    ],
                    onAllDone
                );

                function setFlags( itcb ) {
                    template.isLoading = true;                  //  prevent multiple load operations stacking up
                    template.isLoaded = false;                  //  prevent autosave during load
                    template.isRendered = false;                //  do not attempt UI updates before first render completes
                    itcb( null );
                }

                //  if on client and form is visible, create container elements and append canvasses to the DOM
                function createContainers( itcb ) {
                    //  clear any previous container div on client
                    template.removeFromDOM();

                    Y.log( 'loading ' +( template.isChildForm ? 'subform' : 'form' ) + ': ' + canonicalId + ' -v- ' + formVersionId , 'info', NAME );
                    itcb( null );
                }

                function getSerializedTemplate( itcb ) {
                    if (template.isOnServer) {
                        Y.dcforms.loadForm(template.user, canonicalId, formVersionId, onRESTLoadComplete);
                    } else {
                        Y.dcforms.loadForm(template.patientRegId, canonicalId, formVersionId, onRESTLoadComplete);
                    }

                    //  called back by the utils library with a serialized form
                    function onRESTLoadComplete( err, rawJSON ) {

                        if ( err ) {
                            Y.log('Form load call failed, err: ' + err, 'warn', NAME);
                            Y.dcforms.setModal(Y.doccirrus.i18n('FormEditorMojit.generic.LBL_ERROR'), Y.doccirrus.i18n('FormEditorMojit.generic.LBL_ERROR_WHILE_LOADING_FORM'), true);
                            return itcb( err );
                        }

                        if ( '' === rawJSON ) {
                            Y.log( 'Form template was empty', 'warn', NAME );
                            Y.dcforms.setModal(Y.doccirrus.i18n('FormEditorMojit.generic.LBL_ERROR'), Y.doccirrus.i18n('FormEditorMojit.generic.LBL_FORM_TEMPLATE_EMPTY'), true);
                            return itcb( 'Form template was empty' );
                        }

                        serializedToJSON = rawJSON;

                        //  apply any saved user language preference
                        template.userLang = Y.dcforms.getUserLang(template.formId);
                        itcb( null );
                    }
                }

                function loadSerializedTemplate( itcb ) {
                    template.unserialize( serializedToJSON, onUnserialized );

                    //  called when all child objects created or loaded from server
                    function onUnserialized( err ) {

                        if ( err ) {
                            if ( false === template.isOnServer ) {
                                template.jqSelf('staging').html( Y.doccirrus.i18n('FormEditorMojit.generic.LBL_ERROR_WHILE_LOADING_FORM'));
                            }
                            Y.log( 'Form load call failed - ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }

                        template.canonicalId = canonicalId;
                        template.formVersionId = formVersionId;

                        //  DEPRECATED
                        Y.dcforms.setStatus(Y.doccirrus.i18n('FormEditorMojit.status_messages.LOADED'), false);

                        //Y.log('template loaded: ' + template.canonicalId + '/' + template.formVersionId, 'debug', NAME);
                        itcb( null );
                    }

                }

                function setInitialMode( itcb ) {
                    function onInitialModeSet(err) {

                        if (err) {
                            Y.log('Could not set initial mode of form', 'warn', NAME);
                            //  continue anyway
                        }

                        if (false === template.isOnServer) {
                            template.jqSelf('staging').hide();
                            //$(window).off('resize.forms').on('resize.forms', function () {
                            //    template.onResize();
                            //});
                        }
                        itcb( null );
                    }

                    //  forms may be locked from creation, leave locked if this is the case
                    if ('locked' === template.mode) {
                        onInitialModeSet();
                        return;
                    }

                    template.setMode( 'fill', onInitialModeSet );
                }

                function onAllDone( err ) {
                    //  clear the loading flag, whether successful or not
                    template.isLoading = false;

                    if ( err ) {
                        Y.log( 'Problem while loading form template: ' + JSON.stringify( err ), 'warn', NAME );
                        return loadCallback( err );
                    }

                    //  set only if load was successful
                    Y.log('Loaded ' + ( template.isChildForm ? 'subform' : 'form' ) + ' template: ' + template.canonicalId, 'info', NAME);

                    template.isLoaded = true;

                    template.raise('loaded', template);
                    template.raise('schemaSet', template.reducedSchema);

                    //  DEPRECATED - old format, inefficient, noisy
                    template.raiseBinderEvent('onLoaded', template.formVersionId);
                    template.raiseBinderEvent('onFormLoaded', template);

                    loadCallback(null);
                }

            };

            /**
             *  Check if this object is dirty (if any changes have not yet been saved to the server)
             *
             *  TODO: restore hierarchical hash check, more efficient
             *
             *  @returns    {Boolean}    True if dirty, False if not
             */

            template.isDirty = function () {
                var
                    serialized = JSON.stringify(template.serialize()),
                    myHash = Y.dcforms.fastHash(serialized);

                return (myHash !== template.lastHash);
            };


            /**
             *  Collect form template into a single object for saving back to the database
             *  @returns {*}
             */

            template.serialize = function () {
                var
                    templateObj = {
                        //  Form identitity
                        'name': template.name,
                        'instanceId': template.instanceId,
                        'reducedSchema': template.reducedSchema,
                        'formId': template.formId,
                        'category': template.category,                  //  DEPREACTED, replaced by formFolderId
                        'version': template.version,
                        'revision': template.revision,
                        'formFolderId': template.formFolderId,
                        'shortName': template.shortName,

                        //  DEPRECATED: artefact of previous serialization / import sceheme
                        'isOnDisk': template.isOnDisk,                  //  set true if form saved to / read from disk
                        'templateFile': template.templateFile,          //  name of current template file (DEPRECATED) [string]

                        //  Paper properties
                        'gridSize': template.gridSize,                  //  in mm
                        'width': template.paper.width,                  //	paper width, mm [float]
                        'height': template.paper.height,                //	paper height, mm [float]
                        'resolution': template.resolution,              //	dots per mm ~ 300dpi [float]
                        'orientation': template.orientation,            //  ('portrait'|'landscape')

                        //  Print preferences
                        'printerName': template.pdf.printerName,            //  default printer for this form, if any
                        'printBackground': template.pdf.printBackground,    //  may be printed over paper form, so no bg [bool]
                        'printA4': template.pdf.printA4,                    //  may be sent to dot matrix printer
                        'printScale': template.pdf.scale,
                        'printRotate': template.pdf.rotate,
                        'printOffsetX': template.pdf.offsetx,
                        'printOffsetY': template.pdf.offsety,

                        //  BFB Settings (MOJ-4169)
                        'isBFB': template.isBFB,                        //  true if this is a form regulated blank form
                        'bfbAlternative': template.bfbAlternative,      //  _id of form to display if no BFB registration

                        //  Reporting / inSight2
                        'useReporting': template.useReporting,          //  true if form content is to be extracted for reports

                        //  Role and relationship for embedding
                        'isReadOnly': template.isReadOnly,              //  determines whether editable by user [bool]
                        'isSubform': template.isSubform,                //  determines visibility in tree [bool]
                        'isFixed': template.isFixed,                    //  false if elements are displaced by content overflow
                        'isPdfAttached': template.isPdfAttached,        //  true if form is not displayed in inCase except as PDF, EXTMOJ-1985
                        'isLetter': template.isLetter,                  //  true if form is a letter and needs contacts, MOJ-11944
                        'utf8': template.utf8,                          //  true if form use utf8 fonts for pdf
                        'defaultFor': template.defaultFor,              //  any default role this form has
                        'actType': template.actType,                    //  activity type implied by use of this form, if any

                        //  Actual pages of form
                        'pages': []                                     //  set of page objects [array]
                    },
                    i;

                /*
                 if (('' === templateObj.category) && (templateObj.hasOwnProperty('templateFile'))) {
                 parts = templateObj.templateFile.split('/');
                 templateObj.category = parts[1];
                 }
                 */

                for (i in template.pages) {
                    if (template.pages.hasOwnProperty(i)) {
                        templateObj.pages.push(template.pages[i].serialize());
                    }
                }

                return templateObj;
            };

            /**
             *  Serialize this object to JSON, converting all primitive types to string
             *
             *  Necessary due to node bug causing stack exhaustion when parsing non-string values as at 2013-11-15
             *
             *  see:
             *    MDN reference for toJSON magic function:
             *    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
             */

            template.toJSON = function() {

                function primitiveToString(someValue) {
                    var
                        i,
                        k;

                    if ('object' === typeof someValue) {
                        if (Array.isArray(someValue)) {
                            for (i = 0; i < someValue.length; i++) {
                                someValue[i] = primitiveToString(someValue[i]);
                            }
                        } else {
                            for (k in someValue) {
                                if (someValue.hasOwnProperty(k)) {
                                    someValue[k] = primitiveToString(someValue[k]);
                                }
                            }
                        }
                    }

                    if (('number' === typeof someValue) || ('boolean' === typeof someValue)) {
                        return someValue.toString();
                    }

                    return someValue;
                }

                return primitiveToString(template.serialize());
            };

            /**
             *  Load JSON serialization of a template
             *
             *  @param  serialized  {object}    Plain javascript option
             *  @param  callback    {function}  Of the form fn(err)
             */

            template.unserialize = function (serialized, callback) {
                //Y.log('serialized form: ' + serialized, 'debug', NAME);

                if ((!serialized) || ('object' !== typeof serialized)) {
                    Y.dcforms.setModal('Warn', 'Template missing.', true);
                    callback('Serialized template not given');
                    return;
                }

                var jT = serialized.jsonTemplate;

                if (!jT) {
                    Y.log('Could not load template: ' + serialized, 'warn', NAME);
                }

                if (!jT.hasOwnProperty('name')) {
                    jT.name = {
                        'en': 'Untitled',
                        'de': 'Untitled'
                    };
                }

                template.isReadOnly = false;
                if (serialized.hasOwnProperty('isReadOnly')) {
                    template.isReadOnly = serialized.isReadOnly;
                }

                //  load properties of overall template

                template.name = jT.name;
                template.formId =  serialized.formId || jT.formId;
                template.category = jT.category;                        //  DEPRECATED
                template.formFolderId = serialized.hasOwnProperty( 'formFolderId' ) ? serialized.formFolderId : DEFAULT_FOLDER;
                template.templateFile = jT.templateFile;
                template.paper.width = parseFloat(jT.width);
                template.paper.height = parseFloat(jT.height);
                template.resolution = jT.resolution;
                template.orientation = jT.orientation;
                template.isSubform = ( jT.isSubform || false );
                template.isPdfAttached = ( jT.isPdfAttached || false );
                template.isLetter = ( jT.isLetter || false );
                template.utf8 = ( jT.utf8 || false );
                template.useReporting = ( jT.useReporting || false );
                template.actType = jT.actType || '';

                template.shortName = jT.shortName || '';

                if (jT.hasOwnProperty('isFixed')) {
                    template.isFixed = jT.isFixed;
                } else {
                    template.isFixed = true;
                }

                if (!Y.dcforms.isOnServer && template.px.width < 1) {
                    template.px.width = $('#' + template.divId).width();
                }

                if (template.px.width < 1) {
                    template.px.width = template.px.defaultWidth;
                }

                //  load print/pdf preferences
                template.pdf.printerName = (jT.printerName || '');  //  CUPS printer to use by default [string]
                template.pdf.scale = (jT.printScale || 1.0);        //  rescales all elements when making pdf [float]
                template.pdf.rotate = (jT.printRotate || 0);        //  rotates entore page in pdf (degrees) [int]
                template.pdf.offsetx = (jT.printOffsetX || 0);      //  jog horizontally (mm) [float]
                template.pdf.offsety = (jT.printOffsetY || 0);      //  jog vertically (mm) [float]
                //template.pdf.printA4 = (jT.printA4 || false);     //  print on a4 regardless of form paper size

                if (jT.hasOwnProperty('printA4')) {
                    template.pdf.printA4 = (('true' === jT.printA4) || (true === jT.printA4));
                } else {
                    template.pdf.printA4 = false;
                }

                if (jT.hasOwnProperty('printBackground')) {
                    template.pdf.printBackground = (('true' === jT.printBackground) || (true === jT.printBackground));
                } else {
                    template.pdf.printBackground = true;
                }

                //  BFB settings (MOJ-4169)
                template.isBFB = (jT.hasOwnProperty('isBFB') && jT.isBFB === true);
                template.bfbAlternative = (jT.bfbAlternative || '');

                //  zoom is current screen scaling, not pdf scaling
                template.zoom = template.px.width / template.paper.width;
                //Y.log('setting zoom ' + template.zoom + ' from px width ' + template.px.width + ' (' + template.paper.width + ')', 'debug', NAME);

                //  apply any saved user language preference
                template.userLang = Y.dcforms.getUserLang(template.formId);

                if (jT.hasOwnProperty('version')) {
                    template.version = parseInt(jT.version, 10);
                }

                if (jT.hasOwnProperty('revision')) {
                    template.revision = parseInt(jT.revision, 10);
                }

                if (jT.hasOwnProperty('defaultFor')) {
                    template.defaultFor = jT.defaultFor;
                }

                if (jT.hasOwnProperty('gridSize')) {
                    template.gridSize = parseFloat(jT.gridSize);
                } else {
                    template.gridSize = 5;
                }

                if (jT.hasOwnProperty('reducedSchema')) {
                    template.reducedSchema = jT.reducedSchema;
                }

                //  more sanity checks and initialization code can be added here

                if ('' === template.category) {
                    template.category = 'Test';
                }

                //  load all individual pages
                template.pages = [];
                template.unserializePages(jT.pages, callback);
            };

            /**
             *  Given a set of pages serialized to JSON, unpack them one at a time and add to template
             *
             *  @param  pagesJSON   {Object}    Array of serialized page objects
             *  @param  callback    {Function}  Of the form fn(err)
             */

            template.unserializePages = function(pagesJSON, callback) {
                var nextIdx = 0;

                _async.eachSeries(pagesJSON, onPageIterator, onAllPagesUnserialized);

                function onPageIterator(pageJSON, itcb) {
                    function onPageCreated(err, newPage) {
                        if (err) {
                            Y.log('Could not create page: ' + err, 'warn', NAME);
                            itcb(err);
                            return;
                        }

                        nextIdx = nextIdx + 1;
                        newPage.pageNo = nextIdx;
                        template.pages.push(newPage);
                        itcb(null);
                    }

                    Y.dcforms.page.create(template, 'page' + nextIdx, pageJSON, onPageCreated);
                }

                function onAllPagesUnserialized(err) {
                    template.disapproveUntranslatedValues();
                    callback(err);
                }
            };

            /**
             *  Save any dirty objects back to the server
             *
             *  @param  callback    {Function}  Of the form fn(err)
             */

            template.autosave = function (callback) {

                //Y.log('enter autosave', 'debug', NAME);

                function onFormSaved(err , msg) {
                    if (err) {
                        Y.log( 'Could not save: ' + JSON.stringify(err), 'error', NAME );
                        Y.dcforms.setStatus('err', false);
                        return callback( err );
                    }
                    Y.log( 'Autosave complete: ' + JSON.stringify(msg), 'info', NAME );
                    template.lastHash = myHash;

                    //  LEGACY:
                    Y.dcforms.setStatus('gespeichert', false);

                    window.setTimeout(function() {
                        Y.dcforms.setStatus('', false);
                    }, 1000);

                    //Y.log('completed autosave', 'debug', NAME);
                    template.raise('saved', template);
                    callback( null );
                }

                callback = callback ? callback : Y.dcforms.nullCallback;

                //  do not attempt to save before load or render, if not dirty, or if currently being unloaded
                //if (!template.isLoaded || !template.isRendered || false === template.isDirty() || 'shutdown' === template.mode) {
                if ('edit' !== template.mode) {
                    callback(null);
                    return;
                }

                var
                    timems = new Date().getTime(),
                    serialized,
                    myHash;

                //Y.log('Autosave at ' + template.autoSaveDelay + ' time is ' + timems, 'debug', NAME);
                //Y.log('Autosave delay is ' + (template.autoSaveDelay - timems) + ' deferred ' + (template.autoSaveDeferred ? 'TRUE' : 'FALSE'), 'debug', NAME);

                if (template.autoSaveDelay > timems) {
                    //  we're skipping this save

                    if (true === template.autoSaveDeferred) {
                        //  just silently ignore the events which are piling up as we get to the timer, we'll
                        //  get to them all at once then the save is done.
                        //Y.log('Deferring autosave of form until: ' + (template.autoSaveDelay - timems), 'debug', NAME);
                        callback(null);
                        return;
                    }

                    template.autoSaveDeferred = true;
                    window.setTimeout(function deferredAutoSave() {
                        template.autosave();
                        template.autoSaveDeferred = false;
                        Y.log('Processing deferred autosave of form in ' + (template.autoSaveDelay - timems) + ' ms', 'debug', NAME);
                    }, (template.autoSaveDelay - timems) );

                    callback(null);
                    return;
                }

                //  ten second lag (experimental) MOJ-3615
                template.autoSaveDelay = timems + template.autoSaveMaxDelay;
                template.autoSaveDeferred = false;

                //Y.log('Autosaving form: ' + template.instanceId + ' will not save again until: ' + template.autoSaveDelay, 'info', NAME);
                //console.log('serialization: ', template.serialize());

                //Y.dcforms.setStatus(Y.doccirrus.i18n('FormEditorMojit.status_messages.SAVING_CHANGES'), true);
                template.revision = parseInt(template.revision, 10) + 1;

                serialized = template.serialize();
                myHash = Y.dcforms.fastHash(serialized);

                if (template.lastHash === myHash) {
                    //  no change, not saving
                    callback(null);
                    return;
                }

                //Y.log('execute autosave', 'debug', NAME);
                Y.dcforms.saveForm(template.canonicalId, template.serialize(), onFormSaved);
            };

            /**
             *  Render this form as a series of canvas elements
             *  @param  callback    {Function}  Of the form fn(err)
             */

            template.render = function(callback) {
                Y.log('Rendering ' + (template.isChildForm ? 'subform' : 'form') + ': ' + template.px.width + 'px wide', 'debug', NAME);
                template.zoom = template.px.width / template.paper.width;

                var i;
                for (i = 0; i < template.pages.length; i++) {
                    template.pages[i].redraw( Y.dcforms.LAYER_ALL );
                }

                template.isRendered = true;

                if ( !template.isHidden && !template.isInDOM ) {
                    template.addToDOM();
                }

                if ( callback ) { return callback( null ); }
            };

            /**
             *  Export this form in serialization used by HPDF.js
             *
             *  @param  saveTo      {String}    Where to put generated PDF ('none'|'temp'|'zip'|'db')
             *  @param  zipId       {String}    Optional, a zip folder
             *  @param  preferName  {String}    Only used with zips
             *  @param  callback    {Function}  Of the form fn( err, pdfSerializedForm )
             */

            template.renderPdfServer = function(saveTo, zipId, preferName, callback) {
                Y.log('Rendering PDF directly', 'info', NAME);

                var
                    pdf = {
                        'paper': {
                            'width': template.paper.width,
                            'height': template.paper.height,
                            'name': Y.dcforms.getPaperSizeHPDF(template.paper.width, template.paper.height),
                            'orientation': template.orientation
                        },
                        'ownerCollection': template.ownerCollection || 'forms',
                        'ownerId': template.ownerId || template.instanceId,
                        'save': saveTo || 'temp',
                        'zipId': zipId || '',
                        'preferName': preferName || '',
                        'pages': [],
                        'utf8': template.utf8 || false
                    },

                //  newDocumentId,

                    fromMode = template.mode,
                    toRender = [],
                    scaleBy = 2.83464567,   //  mm -> points
                    i;

                Y.log('Rendering to canvas to get subelement positions...', 'debug', NAME);

                if (template.pdf.printA4) {
                    pdf.paper.width = 210;
                    pdf.paper.height = 297;
                    pdf.paper.name = 'a4';
                    pdf.paper.orientation = 'portrait';
                }

                //  conversion to PostScript points
                template.pdfZoom = scaleBy;

                Y.dcforms.runInSeries(
                    [
                        updateCertStatus,
                        setPdfMode,
                        updateCCInherited,
                        renderAfterUpdate,
                        selectPagesToRender,
                        applyPrintAdjustments,
                        resetFormMode,
                        redrawFormInOldMode
                    ],
                    onPdfRenderCompleted
                );

                //  (1) Load certification status, controls display of BFB pages and elements
                function updateCertStatus(itcb) {
                    if (!Y.dcforms.isOnServer) {
                        Y.dcforms.loadCertNumbers(itcb);
                    } else {
                        return itcb( null );
                    }
                }

                //  (2) Set PDF mode on form, changes page background display, visibility of CC pages, etc
                function setPdfMode(itcb) {
                    template.setMode('pdf', itcb);
                }

                //  (3) Update all elements which are linked to other elements from carbon copy pages
                function updateCCInherited(itcb) {
                    template.updateInheritedFields( itcb );
                }

                //  (4) (Re)draw the form with updated fields and visibility settings
                function renderAfterUpdate(itcb) {
                    template.render(itcb);
                }

                //  (5) Queue rendering of PDF pages according to client BFB status
                function selectPagesToRender(itcb) {
                    var isBFBTenant = Y.dcforms.clientHasBFB();

                    for (i = 0; i < template.pages.length; i++) {
                        if (template.isBFB && template.pages[i].isCarbonCopy && !isBFBTenant) {
                            Y.log('Not printing BFB carbon copy page: ' + template.pages[i].name, 'debug', NAME);
                        } else {
                            toRender.push(template.pages[i]);
                        }
                    }

                    _async.eachSeries( toRender, renderSinglePage, itcb );
                }

                function renderSinglePage( page, itcb ) {
                    page.renderPdfServer( pdf, scaleBy, onPageRendered );
                    function onPageRendered( err ) {
                        if ( err ) { return itcb( null ); }
                        if ( Y.dcforms.isOnServer ) {
                            //  break with setImmediate to prevent stack exhaustion when rendering large
                            //  reporting tables on server
                            setImmediate( function() { itcb( null ); } );
                        } else {
                            return itcb( null );
                        }
                    }
                }

                //  (6) Post document to server for conversion to PDF and note the result
                function applyPrintAdjustments(itcb) {
                    if ('none' === saveTo) {
                        itcb(null, pdf);
                        return;
                    }

                    pdf = template.applyPrintAdjustments(pdf, scaleBy);
                    itcb( null );
                }

                //  (6) Reset form mode
                function resetFormMode(itcb) {
                    template.setMode(fromMode, itcb);
                }

                //  (7) Rerender back to previous mode
                function redrawFormInOldMode(itcb) {
                    template.render(itcb);
                }

                //  Finally
                function onPdfRenderCompleted(err) {
                    if (err) {
                        Y.log('Could not render PDF document: ' + JSON.stringify(err), 'warn', NAME);
                        callback(err);
                        return;
                    }
                    callback(null, pdf /* newDocumentId */ );
                }

            };

            /**
             *  Make list of any TTF fonts required by this form
             */

            template.getCustomFonts = function() {
                var i, j, page, elem, customFonts = [];

                for (i = 0; i < template.pages.length; i++ ) {
                    page = template.pages[i];
                    for ( j = 0; j < page.elements.length; j++ ) {
                        elem = page.elements[j];
                        if ( elem.font && !Y.doccirrus.media.fonts.isType2( elem.font) ) {
                            if ( -1 === customFonts.indexOf( elem.font ) ) {
                                customFonts.push( elem.font );
                            }
                        }
                    }
                }

                return customFonts;
            };

            template.applyPrintAdjustments = function(pdf, scaleBy) {
                var
                    currPage,
                    currSe,
                    i, j;

                for (i = 0; i < pdf.pages.length; i++) {
                    currPage = pdf.pages[i];
                    for (j = 0; j < pdf.pages[i].subElements.length; j++) {
                        currSe = currPage.subElements[j];

                        //  scale first, then apply offset
                        if (template.pdf.scale !== 0 && template.pdf.scale !== 1) {
                            currSe.left = currSe.left * template.pdf.scale;
                            currSe.width = currSe.width * template.pdf.scale;
                            currSe.top = currSe.top * template.pdf.scale;
                            currSe.height = currSe.height * template.pdf.scale;
                            currSe.lineHeight = currSe.lineHeight * template.pdf.scale;
                        }

                        //  offset elements my fixed mm value (scaled to points)
                        currSe.left = currSe.left + (template.pdf.offsetx * scaleBy);
                        currSe.top = currSe.top + (template.pdf.offsety * scaleBy);
                    }
                }

                return pdf;
            };

            /**
             *  Map an object into this template
             *
             *  @param  mObj        {Object}    A plain JSON object from the database, matching reduced schema
             *  @param  rerender    {Boolean}   True if the form should be updated in the UI after mapping
             *  @param  callback    {Function}  Of the form fn(err)
             */

            template.map = function(mObj, rerender, callback) {

                //  skip this operation if nothing given
                if ( isEmptyObj( mObj ) ) {
                    return callback( null );
                }

                try {
                    mObj = JSON.parse( JSON.stringify( mObj ) );
                } catch ( parseErr ) {
                    Y.log( 'Attempted to map invalid object: ' + JSON.stringify( parseErr ), 'warn', NAME );
                    return callback( parseErr );
                }

                //console.log( '(****) template ' + template.name.de + '  mapping: ', mObj );
                //console.log( '(****) template: ', template );

                rerender = ( rerender || false );

                if (!callback || 'function' !== typeof callback) {
                    Y.log( 'Missing callback to template.map(), printing stack trace to show caller', 'warn', NAME );
                    console.log( new Error().stack );   //  eslint-disable-line no-console
                    callback = Y.dcforms.nullCallback;
                }

                //  extend mapped data with supplied keys/values
                //  TODO: check if anything changes, if not we can skip the remap

                var
                    fastHash = Y.doccirrus.comctl.fastHash,
                    hasChange = false,
                    k;

                for ( k in mObj ) {
                    if ( mObj.hasOwnProperty( k ) ) {

                        if ( template.mapData.hasOwnProperty( k ) ) {
                            switch( typeof mObj[k] ) {
                                case 'boolean':
                                case 'number':
                                case 'string':
                                    if ( mObj[k] !== template.mapData[k] ) {
                                        //  adding a simple value
                                        hasChange = true;
                                    }
                                    break;

                                case 'object':
                                    if ( fastHash( mObj[k] ) !== fastHash( template.mapData[k] ) ) {
                                        //  adding a complex value
                                        hasChange = true;
                                    }
                                    break;
                            }
                        } else {
                            //  adding a key
                            hasChange = true;
                        }

                        template.mapData[k] = mObj[k];
                    }
                }

                if ( !hasChange ) {
                    //console.log( '(*|*|*) no change to mapped values: ', template.mapData );
                    return callback( null );
                }

                //console.log( '(*|*|*) is change to mapped values: ', template.mapData );

                //  record map operation in progress
                template.inMapOperations = template.inMapOperations + 1;

                _async.eachSeries( template.pages, mapSinglePage, onAllDone );

                function mapSinglePage( page, itcb ) {
                    function onPageMapped(err) {
                        if ( err ) {
                            Y.log( 'Error mapping into page ' + page.name + ': ' + JSON.stringify( err ), 'warn', NAME );
                            return itcb( err );
                        }
                        itcb( null );
                    }
                    // disabled mapping expansion due to MOJ-9887, editor extension TBD
                    if( !page ){
                        return itcb( new Error( 'Page is not defined' ) );
                    }
                    page.map( mObj /*template.mapData */, onPageMapped );
                }

                function onAllDone( err ) {
                    //  record completion of map operation (parent may be waiting on this to save, make a PDF, etc)
                    template.inMapOperations = template.inMapOperations - 1;

                    if ( err ) {
                        Y.log( 'Problem while mapping form: ' + JSON.stringify( err ), 'warn', NAME );
                        return callback( err );
                    }

                    if (rerender && template.isRendered) {
                        return template.render( callback );
                    }

                    if ( Y.dcforms.isOnServer ) {
                        //  stack break to prevent async error on server
                        setImmediate( function() { callback( null ); } );
                    } else {
                        return callback( null );
                    }
                }

                function isEmptyObj( checkObj ) {
                    var k;
                    for ( k in checkObj ) {
                        if ( checkObj.hasOwnProperty( k ) ) {
                            return false;
                        }
                    }
                    return true;
                }

            };

            /**
             *  Return array of subtypes recognized by this form
             */

            template.getSubTypes = function() {
                var subTypes = [], i, j;

                for (i = 0; i < template.pages.length; i++) {
                    for (j = 0; j < template.pages[i].elements.length; j++) {
                        if ('' !== template.pages[i].elements[j].schemaMemberST) {
                            if (-1 === subTypes.indexOf(template.pages[i].elements[j].schemaMemberST)) {
                                subTypes.push(template.pages[i].elements[j].schemaMemberST);
                            }
                        }
                    }
                }

                return subTypes;
            };

            /**
             *  Return the values of bound elements as a javascript object
             *  @return     {Object}
             */

            template.unmap = function() {

                var i,
                    j,
                    schemaMember,
                    mObj = {};

                for (i = 0; i < template.pages.length; i++) {
                    for (j = 0; j < template.pages[i].elements.length; j++) {
                        schemaMember = template.pages[i].elements[j].schemaMember;
                        //Y.log('Element ' + template.pages[i].elements[j].elemId + ' ==> ' + schemaMember, 'debug', NAME);
                        if (''  !== schemaMember) {
                            mObj[schemaMember] = template.pages[i].elements[j].unmap();
                            //Y.log('Unmapping: ' + schemaMember + ' <== ' + mObj[schemaMember], 'debug', NAME);
                        }
                    }
                }


                return mObj;
            };

            /**
             *  Return keys and values of user-defined reporting fields in form
             */

            template.getReportingData = function() {
                var
                    _moment = Y.doccirrus.commonutils.getMoment(),
                    reportingObj = {},
                    page, elem,
                    i, j,
                    tempDate;

                for ( i = 0; i < template.pages.length; i++ ) {
                    page = template.pages[i];
                    for ( j = 0; j < page.elements.length; j++ ) {
                        elem = page.elements[j];

                        if ( elem.useInReporting ) {
                            reportingObj[ elem.elemId ] = elem.unmap();

                            //  cast for unmapping list type objects
                            if ( 'object' === typeof reportingObj[ elem.elemId ] && reportingObj[ elem.elemId ].value ) {
                                reportingObj[ elem.elemId ] = reportingObj[ elem.elemId ].value;
                            }

                            if ( 'Number' === elem.reportingType ) {
                                reportingObj[ elem.elemId ] = parseFloat( reportingObj[ elem.elemId ] );
                                if ( isNaN( reportingObj[ elem.elemId ] ) ) { reportingObj[ elem.elemId ] = 0; }
                            }

                            if ( 'Boolean' === elem.reportingType ) {
                                reportingObj[ elem.elemId ] = ( 'true' === reportingObj[ elem.elemId ] || true === reportingObj[ elem.elemId ] );
                            }

                            if ( 'Date' === elem.reportingType && elem.unmap() ) {

                                tempDate = _moment( new Date( elem.unmap() ) );

                                if ( tempDate.isValid() ) {
                                    reportingObj[ elem.elemId ] = tempDate.add( 4, 'hours' ).toISOString();
                                }
                            }

                        }

                    }
                }

                return reportingObj;
            };

            /**
             *  Cleanly unlink and destroy template and all child objects
             */

            template.destroy = function() {
                function onShutdownModeSet() {
                    var i;
                    for (i = 0; i < template.pages.length; i++) {
                        template.pages[i].destroy();
                    }
                }

                template.setSelected('fixed', null);

                if (template.valueEditor) {
                    template.valueEditor.destroy();
                    template.valueEditor = null;
                }

                //  last chance for clients or interested parties
                template.on('destroy', template);

                //  tell elements and pages to destroy their child objects
                template.setMode('shutdown', onShutdownModeSet);

                //  deregister all event handlers subscribed on this object
                template.off('*', '*');
            };

            /**
             *  Make a carbon copy of a page and add it to the end of the template
             *
             *  @param  idx         {Number}    Index of the page to copy
             *  @param  callback    {Function}  Of the form fn
             */

            template.copyPage = function(idx, callback) {

                if (!template.pages[idx]) {
                    return;
                }

                function onPageCreated(err, tempPage ) {
                    if (err) {
                        Y.log('Could not create page: ' + err, 'warn', NAME);
                        callback(err);
                        return;
                    }

                    newPage = tempPage;

                    template.pages.push( newPage );
                    newPage.pageNo = template.pages.length;
                    template.render( onRendered );

                }

                function onRendered(err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    template.autosave( onSaved );
                }

                function onSaved(err) {
                    callback( err, newPage );
                }

                var
                    serialized = template.pages[idx].serialize(),
                    newPage,
                    elem,
                    i;

                serialized.name = serialized.name + '-kopie-' + (template.pages.length + 1);
                serialized.isCarbonCopy = true;

                for (i = 0; i < serialized.elements.length; i++) {
                    elem = serialized.elements[i];
                    elem.inheritFrom = elem.id;
                    elem.id = elem.type + Y.doccirrus.comctl.getRandId();
                }

                Y.dcforms.page.create(template, serialized.name, serialized, onPageCreated);
            };

            /**
             *  Count number of fixed pages in form
             */

            template.getPageCount = function() {
                var i, count = 0;
                for ( i = 0; i < template.pages.length; i++ ) {
                    count = count + template.pages[i].canvasses.length;
                }
                return count;
            };

            /**
             *  Get the value of an element given its id
             *
             *  TODO: speed this lookup with an index
             *
             *  @param  elemId  {String}    Uniquely identifies each element
             */

            template.getValueById = function(elemId) {
                var i, j, page;

                for (i = 0; i < template.pages.length; i++) {
                    page = template.pages[i];

                    for (j = 0; j < page.elements.length; j++) {
                        if (page.elements[j].elemId === elemId) {

                            if (page.elements[j].renderer && 'subform' === page.elements[j].elemType) {
                                return page.elements[j].renderer.toDict64();
                            }

                            return page.elements[j].getValue();
                        }
                    }
                }

                return null;
            };

            /**
             *  Simple form element validation for EXTMOJ-861
             *  Return false if any element is invalid
             */

            template.isValid = function() {
                var
                    isValid = true,
                    i, j, page, elem;

                for ( i = 0; i < template.pages.length; i++ ) {
                    page = template.pages[i];
                    for ( j = 0; j < page.elements.length; j++ ) {
                        elem = page.elements[j];
                        if ( elem && elem.renderer && elem.renderer.isValid ) {
                            if ( !elem.renderer.isValid() ) {
                                isValid = false;
                            }
                        }
                    }
                }

                return isValid;
            };

            /**
             *  Fields may be linked to the value of other fields, used for carbon copy / BFD forms
             *
             *  TODO: build an inheritance index to make this more efficient for single updates
             */

            template.updateInheritedFields = function( callback ) {
                var i, j, page, toUpdate = [];

                for (i = 0; i < template.pages.length; i++) {
                    page = template.pages[i];
                    for (j = 0; j < page.elements.length; j++) {
                        if (page.elements[j].inheritFrom && page.elements[j].inheritFrom !== '') {

                            if ('subform' !== page.elements[j].elemType) {
                                toUpdate.push(page.elements[j]);
                            }

                        }
                    }
                }

                //  exit early if nothing to do
                if ( 0 === toUpdate.length ) {
                    return callback( null );
                }

                //  update field from top (copied pages always come after originals) MOJ-4901
                toUpdate.reverse();

                _async.eachSeries( toUpdate, updateNext, onAllUpdated );

                function updateNext( elem, itcb ) {

                    if (elem.schemaMember && '' !== elem.schemaMember) {
                        //  do not inherit values if the field is bound - the same field ondifferent pages may be
                        //  set to different values by the mapper, to redact information in some copies or to use
                        //  different barcodes
                        return itcb(null);
                    }

                    if (!elem.inheritFrom || '' === elem.inheritFrom) {
                        Y.log('skipping update of element from inheritance: ' + elem.elemId, 'debug', NAME);
                        return itcb(null);
                    }

                    if ('subform' === elem.elemType) {
                        //  subform with object serialization of state as base64 string
                        return elem.renderer.fromDict64( template.getValueById( elem.inheritFrom ), itcb );
                    }

                    //  basic element type with a string serialization
                    elem.setValue( template.getValueById( elem.inheritFrom ), itcb );
                }

                function onAllUpdated( err ) {
                    if ( err ) {
                        Y.log( 'Problem updating inherited fields: ' + JSON.stringify( err ), 'debug', NAME );
                        return callback( err );
                    }
                    callback( null );
                }

            };

            /**
             *  Get list of form elements (ie, from Jade IDs in panels) for submitting questionnaires
             */

            template.toDict = function () {
                var
                    i,                      //% iterate over pages [int]
                    j,                      //% iterate over elements [int]
                    k = '',                 //% element id [string]
                    pageDict = {},          //% set of elements on page as key/value pairs [object]
                    combined = {},          //% set of elements combined, return value [object]
                    hiddenBFB = [];

                //  this is to ensure that toDict always returns at least one key, hack for CaseFile
                combined.contentType = 'dc/form';
                combined.formName = template.name[ template.userLang ];

                //  this is to persist elements hidden for KBV reasons across context where forms/activities may be
                //  displayed (patient portal, after activioty transfer, etc)
                for (i = 0; i < template.pages.length; i++) {
                    for (j = 0; j < template.pages[i].elements.length; j++) {
                        if (template.pages[i].elements[j].isHiddenBFB) {
                            hiddenBFB.push(template.pages[i].elements[j].elemId);
                        }
                    }
                }

                if (hiddenBFB.length > 0) {
                    combined.hiddenBFB = hiddenBFB.join(',');
                }

                //  add elements as k/v dict with elementId for key and legacy string serialization of state for value
                for (i = 0; i < template.pages.length; i++) {
                    //Y.log('Serializing page: ' + i, 'debug', NAME);
                    pageDict = template.pages[i].toDict();
                    for (k in pageDict) {
                        if (pageDict.hasOwnProperty(k)) {
                            combined[k] = pageDict[k];
                        }
                    }

                }

                //Y.log('Combined all pages into dict... ', 'debug', NAME);
                return combined;
            };

            /**
             *  Set current values of all fields in this form
             *
             *  Like mapping, but applies to unbound elements, not linked to schema, used for unstructured
             *  questionnaires and forms users may come up with.  They are indexed by element ID
             *
             *  Note that callback is new, to wait for subform and image load
             *
             *  @param  dict        {Object}    Keys and values
             *  @param  callback    {Function}  Of the form fn( err }
             */

            template.fromDict = function( dict, callback ) {
                // if there are gender related fields do not pick formState data for them
                var key;
                for( key in dict ){
                    if( dict.hasOwnProperty( key ) && ( template.remapTranslationOnElements || [] ).indexOf( key ) !== -1 ){
                        delete dict[ key ];
                    }
                }

                //  skip this operation if no pages to unserialize into
                if ( 0 === template.pages.length ) { return callback( null ); }

                _async.eachSeries( template.pages, unserializePage, callback );

                function unserializePage( page, itcb ) {
                    page.fromDict( dict, itcb );
                }
            };

            /**
             *  Get flat listing of all elements and the schema members they are bound to
             */

            template.getAllBindings = function() {
                var
                    i,                      //% iterate over pages [int]
                    k = '',                 //% element id [string]
                    pageBindings = [],      //% set of elements on page mapeed to schema members they validate against [object]
                    combined = [];          //% set of elements combined, return value [object]

                for (i = 0; i < template.pages.length; i++) {

                    pageBindings = template.pages[i].getSchemaBindings();
                    for (k in pageBindings) {
                        if (pageBindings.hasOwnProperty(k)) {
                            combined[k] = pageBindings[k];
                        }
                    }

                }

                return combined;
            };

            /**
             *  Get flat listing of schema members referenced in this template and child forms
             *
             *  Used be generic form mappers to determine which mappers need to be run
             *  @return {{name: string, format: string, field?: string, fieldSequence?: string[]}[]}
             */
            template.getSchemaReferences = function() {
                var page, element, i , j, templateFields, results = [];

                for (i = 0; i < template.pages.length; i++ ) {
                    page = template.pages[i];
                    for ( j = 0; j < page.elements.length; j++ ) {
                        element = page.elements[j];

                        if( element.schemaMember ) {
                            // if schemaMember (reduced schema name) is set use this
                            results.push( {name: element.schemaMember, format: 'tbd'} );
                        } else if( element.defaultValue ) {
                            /**
                             * extract template values from defaultValue
                             * @type {{fieldName: string, field: string, fieldSequence: string[]}[]}
                             */
                            templateFields = template.extractTemplateFields( element.defaultValue[element.getBestLang()] );

                            if( templateFields && templateFields.length ) {
                                Array.prototype.push.apply( results, templateFields.map( function _forEachTemplateField( fieldConfig ) {
                                    return {
                                        name: fieldConfig.fieldName,
                                        field: fieldConfig.field,
                                        fieldSequence: fieldConfig.fieldSequence,
                                        format: 'tbd'
                                    };
                                } ) );
                            }
                        }

                        if ( 'subform' === element.elemType ) {
                            results = results.concat( element.renderer.getSchemaReferences() );
                        }

                    }

                    if ( page.headerElem && page.headerElem.renderer ) {
                        results = results.concat( page.headerElem.renderer.getSchemaReferences() );
                    }

                    if ( page.footerElem && page.footerElem.renderer ) {
                        results = results.concat( page.footerElem.renderer.getSchemaReferences() );
                    }


                    if ( page.headerOverflowElem && page.headerOverflowElem.renderer && page.headerOverflowElem !== page.headerElem ) {
                        results = results.concat( page.headerOverflowElem.renderer.getSchemaReferences() );
                    }

                    if ( page.footerOverflowElem && page.footerOverflowElem.renderer && page.footerOverflowElem !== page.footerElem ) {
                        results = results.concat( page.footerOverflowElem.renderer.getSchemaReferences() );
                    }
                }

                //  TODO: deduplicate results here

                return results;
            };

            /**
             *  Get set of template fields embedded in a text type element
             *
             *  Moved from genericmapper-util so that this can be run against subforms
             *  TODO: move to form utils?
             *
             *  @param  s   {String}    String which may contain {{Embedded_T.member}}
             *  @return {{field: string, fieldName: string, fieldSequence: string[]}[]}
             */

            template.extractTemplateFields = function( s ) {
                var
                    stack = [], results = [],
                    chr, nextChr,
                    i, l;

                if( 'string' !== typeof s ) {
                    return results;
                }

                for( i = 0, l = s.length; i < l; i++ ) {
                    chr = s[i];
                    nextChr = s[i + 1];

                    if( chr === '\n' ) {
                        continue;
                    }
                    if( '{' === chr && '{' === nextChr ) {
                        stack.push( true );
                        i++;
                        results.push( '' );
                        continue;
                    }
                    if( '}' === chr && '}' === nextChr ) {
                        stack.pop();
                        i++;
                        continue;
                    }
                    if( stack.length ) {
                        results[results.length - 1] += chr;
                        //continue;
                    }
                }
                return results.map( function _mapFields( field ) {
                    var split = field.split( '.' );
                    return {
                        field: field,
                        fieldName: (split.length > 0) ? split[1] : field,
                        fieldSequence: split
                    };
                } );
            };

            /*----------------------------------------------------------------------------------------------
             *  PAGE MANAGEMENT
             */

            /**
             *  Check whether this template has a page with the given name
             *  @param  pageName    {String}    Uniquely identifies page
             *  @return             {Boolean}   True if page with this name exists, false if not
             */

            template.hasPage = function(pageName) {
                var i;

                for (i = 0; i < template.pages.length; i++) {
                    if (template.pages[i].name === pageName) {
                        return true;
                    }
                }
                return false;
            };

            /**
             *  Add a new page to this template
             *  @param  pageName    {String}    Uniquely identifies this page, no longer as important as it was before
             *  @param  serialized  {Object}    A page object or {}
             *  @param  callback    {Function}  Of the form fn(err)
             */

            template.addPage = function(pageName, serialized, callback) {

                function onNewPageRendered(err) {
                    if (err) {
                        Y.log('Error rendering new page: ' + err, 'warn', NAME);
                    } else {
                        template.autosave();
                    }
                    callback(err);
                }

                function onNewPageModeSet(err) {

                    if (err) {
                        callback('Error setting mode on new page: ' + err);
                        return;
                    }

                    template.pages.push(myPage);

                    if (true === template.isRendered) {
                        myPage.addToDOM();
                        template.render( onNewPageRendered );
                    } else {
                        //  skip render of new page if the rest of the form has not completed first render
                        onNewPageRendered();
                    }
                }

                function onPageUnserialized(err) {

                    if (err) {
                        callback(err);
                        return;
                    }

                    myPage.setMode(template.mode, onNewPageModeSet);

                }

                function onPageCreated(err, newPage) {

                    if (err) {
                        Y.log('Error adding new page: ' + err, 'warn', NAME);
                        callback(err);
                        return;
                    }

                    myPage = newPage;
                    myPage.unserialize({ elements: [], bgColor: '#ffffff' }, onPageUnserialized);
                    myPage.pageNo = template.pages.length;
                }

                var myPage;
                Y.dcforms.page.create(template, pageName, serialized, onPageCreated);

            };

            /**
             *  Remove a page from this form template
             *  @param  pageName    {string}    The Jade/DOM #id the page to remove
             *  @param  callback    {function}  Of the form fn(err)
             */

            template.removePage = function(pageName, callback) {
                Y.log('Removing page: ' + pageName, 'info', NAME);

                var
                    i,
                    pageDomId,
                    found = false;

                for (i = (template.pages.length - 1); i >= 0; i--) {
                    if (template.pages[i].name === pageName) {
                        pageDomId = template.pages[i].getDomId();
                        template.pages.splice(i, 1);
                        found = true;
                        break;
                    }
                }

                if (false === found) {
                    Y.log('Could not remove page, unknown: ' + pageName, 'warn', NAME);
                }

                $('#' + pageDomId).html('');

                function onReRender(err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    template.autosave();
                    callback(null);
                }

                if ( template.isRendered ) {
                    template.render(callback);
                } else {
                    onReRender(null);
                }
            };

            /**
             *  For legacy forms where no translation has been entered, we will need to remove the approved
             *  status for some untranslated default values (generally where 'en' values are not set)
             *
             *  This should be run after the form has been unserialized, and before render
             */

            template.disapproveUntranslatedValues = function() {
                var i, j, elem, env, dev,
                    dataURI = 'dc_logo_150dpi_632x218_trans.png.dataurl',
                    radio1 = 'radio 1\n*radio 2',
                    radio2 = 'radio 1{newline}*radio 2',
                    radio3 = 'radio 1{newline}*radio 2{newline}',
                    dropdown1 = 'option 1\n*option 2',
                    dropdown2 = 'option 1{newline}*option 2',
                    dropdown3 = 'option 1{newline}*option 2{newline}';

                for (i = 0; i < template.pages.length; i++) {
                    for (j = 0; j < template.pages[i].elements.length; j++) {

                        elem = template.pages[i].elements[j];

                        if (!elem.hasOwnProperty('defaultValue') || 'object' !== typeof elem.defaultValue) {
                            elem.defaultValue = {
                                'en': '',
                                'de': ''
                            };
                        }

                        env = elem.defaultValue.en;
                        dev = elem.defaultValue.de;

                        switch(elem.elemType) {
                            case 'label':
                                if ('caption' === env) { elem.translationDirty.en = true; }
                                if ('caption' === dev) { elem.translationDirty.de = true; }
                                break;


                            case 'textarea':    //  deliberate fallthrough
                            case 'input':
                                if ('default' === env) { elem.translationDirty.en = true; }
                                if ('default' === dev) { elem.translationDirty.de = true; }
                                break;

                            case 'image':
                                if (dataURI === env) { elem.translationDirty.en = true; }
                                if (dataURI === dev) { elem.translationDirty.de = true; }
                                break;

                            case 'radiotrans':
                            case 'radio':
                                if (radio1 === env || radio2 === env || radio3 === env) {
                                    elem.translationDirty.en = true;
                                }
                                if (radio1 === dev || radio2 === dev || radio3 === dev) {
                                    elem.translationDirty.de = true;
                                }
                                break;

                            case 'dropdown':
                                if (dropdown1 === env || dropdown2 === env || dropdown3 === env) {
                                    elem.translationDirty.en = true;
                                }
                                if (dropdown1 === dev || dropdown2 === dev || dropdown3 === dev) {
                                    elem.translationDirty.de = true;
                                }
                                break;

                        }

                    }
                }
            };

            /**
             * ---------------------------------------------------------------------------------------------
             *  EVENT REGISTRATION AND MULTIPLEXING
             *
             *  These are shortcut methods to the form event emitter, see event-utils.yui.js
             */

            template.on = template.event.on;
            template.off = template.event.off;
            template.rid = template.event.raiseIfDifferent;

            /**
             *  Check for template events which this object should respond to
             *
             *  @param eventName
             *  @param eventData
             */

            template.raise = function(eventName, eventData) {
                switch (eventName) {

                    case 'mapcomplete':
                        template.isMapped = true;
                        break;

                    case 'layoutChanged':            //  deliberate fallthrough
                    case 'valueChanged':
                        if ( 'edit' === template.mode ) {
                            template.autosave( Y.dcforms.nullCallback );
                        }

                        break;

                }

                template.event.raise( eventName, eventData );
            };

            /**
             *  Resize the rendered form, should only be called in browser
             *
             *  @param  pxWidth     {Number}    New pixel width of form
             *  @param  callback    {Function}  Of the form fn(err)
             */

            template.resize = function( pxWidth, callback ) {
                /*
                if ('pdf' === template.mode) {
                    //  PDF rendering can resize the window, do not re-render in this case, as that messes
                    //  with the PDF render in progress
                    callback( null );
                    return;
                }
                */

                template.px.width = pxWidth;
                template.zoom = template.px.width / template.paper.width;

                Y.log( 'Resizing ' + (template.isChildForm ? 'subform' : 'all pages') + ', width: ' + pxWidth + ' zoom: ' + template.zoom, 'debug', NAME );

                _async.eachSeries( template.pages, onResizePage, onAllPagesResized );

                function onResizePage( page, itcb ) {
                    //Y.log( 'Resizing page ' + page.name, 'debug', NAME );
                    page.resize( itcb );
                }

                function onAllPagesResized( err ) {
                    if ( err ) {
                        Y.log('Error resizing form: ' + JSON.stringify(err), 'warn', NAME);
                        callback(err);
                        return;
                    }

                    template.raise( 'resize', null );

                    if ( template.valueEditor && template.valueEditor.reposition ) {
                        template.valueEditor.reposition();
                    }

                    if ( !template.isRendered ) {
                        return callback( null );
                    }

                    Y.log('Re-rendering form after window resize, mode is: ' + template.mode, 'debug', NAME);
                    template.render( callback );
                }
            };


            /*----------------------------------------------------------------------------------------------
             *  SELECT GROUPS OF ELEMENTS
             */

            template.updateGroupSelect = function __updateGroupSelect( pageObj ) {
                var i, j;

                template.groupSelect = [];

                //  set the group selection to elements on the given page
                for ( i = 0; i < pageObj.elements.length; i++ ) {
                    if ( pageObj.elements[i].inGroupSelection ) {
                        template.groupSelect.push( pageObj.elements[i] );
                    }
                }

                //  unset group selection flag on elements of all other pages
                for ( j = 0; j < template.pages.length; j++ ) {
                    if ( template.pages[j].name !== pageObj.name ) {
                        for ( i = 0; i < template.pages[j].elements.length; i++ ) {
                            template.pages[j].elements[i].inGroupSelection = false;
                        }
                        template.pages[j].redraw( Y.dcforms.LAYER_INTERACTION );
                    }
                }

                template.raise( 'selectElementGroup', template.groupSelect );
            };

            /*----------------------------------------------------------------------------------------------
             *  EVENT HANDLERS
             */

            /**
             *  Pass an event to parent binder
             *
             *  LEGACY, DEPRECATED
             *
             *  @param  eventName   {string}    Name of binder event
             *  @param  eventData   {object}    Event details or payload
             */

            template.raiseBinderEvent = function (eventName, eventData) {

                //Y.log('DEPRECATED: Superfluous event, please use template.raise', 'warn', NAME);
                template.raise(eventName, eventData);

                var temp;

                //  handle any events we need to mark locally
                switch(eventName) {

                    case 'onElementSelected':
                        //  background of selected element behaves differently in edit mode

                        if ('edit' === template.mode) {
                            if (null === template.selectedElement) {
                                template.selectedElement = eventData;
                                template.selectedElement.render();
                            }

                            if (template.selectedElement.domId !== eventData.domId) {
                                temp = template.selectedElement;
                                template.selectedElement = eventData;
                                temp.render();
                                template.selectedElement.render();
                            }
                        }

                        break;
                }

                // noisy but very useful in debugging
                //Y.log('Template raising binder event: ' + eventName, 'debug', NAME);
                if (template.onBinderEvent) {
                    template.onBinderEvent(eventName, eventData);
                }

            };



            /**
             *  This should be replaced by the binder with its own handler code for legacy events
             *
             *  @/param eventName
             *  @/param eventData
             */

            template.onBinderEvent = null;

            /*--------------------------------------------------------------------------------------
             *  GETTERS AND SETTERS
             */

            /**
             *  Set the selected editable form element
             *
             *  @param  selectedOn  {String}    ('elastic'|'fixed') canvas category where selected
             *  @param  elem        {Object}    dcform element object that has been selected
             *  @/param  selRow      {Number}    used for table cell selection
             *  @/param  selCol      {Number}    used for table cell selection
             */

            template.setSelected = function(selectedOn, elem /*, selRow, selCol */) {

                if ( 'locked' === template.mode || false === template.isRendered ) {
                    return;
                }

                if (template.valueEditor) {

                    if ( template.selectedElement ) {
                        template.raise( 'editorLostFocus', template.selectedElement );
                    }

                    template.valueEditor.destroy();
                    template.valueEditor = null;
                    template.drag = { 'mode': '', 'elem': elem };
                }

                //console.log('template.setSelected ' + selectedOn + ' elem ' + (elem ? elem.elemId : 'null'));

                template.selectedOn = selectedOn;
                template.selectedElement = elem;

                if (elem && elem.canEdit()) {

                    //Y.log( 'element selected: ' + elem.elemId + ' ' + elem.elemType, 'debug', NAME );

                    switch(elem.elemType) {
                        case 'label':
                        case 'textarea':
                        case 'textmatrix':
                        case 'barcode':
                        case 'dropdown':
                        case 'input':
                        case 'image':
                    //  case 'radio': // temporarily disabled until keyboard selection for individual radio elements
                        case 'date':
                            elem.renderer.createValueEditor(selectedOn);
                            break;

                        case 'hyperlink':
                            if ( 'edit' === template.mode ) {
                                elem.renderer.createValueEditor(selectedOn);
                            }
                            break;

                        case 'table':
                            break;
                    }

                }

                //Y.log('Raising elementSelected', 'debug', NAME);
                template.raise('elementSelected', elem);
                template.render(Y.dcforms.nullCallback);
            };

            /**
             *  When a form is loaded focus should be passed to first element
             *
             *  @param  selectedOn  {String}    ('fixed'|'canvas')
             */

            template.setFirstSelected = function(selectedOn) {
                if (0 === template.pages.length) { return; }
                if (0 === template.pages[0].elements.length) { return; }
                if (false === template.isRendered) { return; }
                if ('locked' === template.mode) { return; }
                if (!selectedOn) { selectedOn = 'fixed'; }
                var elem, i, j;

                for (i = 0; i < template.pages.length; i++) {
                    for (j = 0; j < template.pages[i].tabMap.length; j++) {
                        elem = template.pages[i].elements[template.pages[i].tabMap[j]];

                        if (true === elem.getProperty('canSelect')) {

                            //Y.log('Selected first editable element: ' + elem.elemId, 'debug', NAME);
                            template.setSelected(selectedOn, elem);
                            return;
                        }
                    }

                }

            };

            /**
             *  Given a binding name on the current schema, returns the element which handles that binding
             *
             *  @param  schemaBinding   {String}    Name of a schema binding / key in reduced schema
             */

            template.getBoundElement = function(schemaBinding) {
                var i, j, element;

                for (i = 0; i < template.pages.length; i++) {
                    for (j = 0; j < template.pages[i].elements.length; j++) {
                        element = template.pages[i].elements[j];
                        if (schemaBinding === element.schemaMember) {
                            return element;
                        }
                    }
                }

                return null;
            };

            /**
             *  Get all media objects used/referenced by the currently instantiated template
             *  images, audio, video, page backgrounds, headers, footers, subform images, etc
             */

            template.getReferencedMedia = function() {
                var i, j, page, elem, val, mediaIds = [];

                for ( i = 0; i < template.pages.length; i++ ) {
                    page = template.pages[i];
                    for ( j = 0; j < page.elements.length; j++ ) {
                        elem = page.elements[j];

                        switch( elem.elemType ) {
                            case 'image':               //  deliberate fallthrough
                            case 'audio':               //  deliberate fallthrough
                            case 'video':               //  deliberate fallthrough
                                val = elem.unmap();
                                if ( val && '' !== val ) { mediaIds.push( val ); }
                                break;

                            case 'subform':
                                if ( elem && elem.renderer && elem.renderer.getReferencedMedia ) {
                                    mediaIds = mediaIds.concat( elem.renderer.getReferencedMedia() );
                                }
                                break;
                        }
                    }

                    if ( page.headerElem && page.headerElem.renderer && page.headerElem.renderer.getReferencedMedia ) {
                        mediaIds = mediaIds.concat( page.headerElem.renderer.getReferencedMedia() );
                    }

                    if ( page.footerElem && page.footerElem.renderer && page.footerElem.renderer.getReferencedMedia ) {
                        mediaIds = mediaIds.concat( page.footerElem.renderer.getReferencedMedia() );
                    }

                    if ( page.bgElem && page.bgElem.value && '' !== page.bgElem.value ) {
                        mediaIds.push( page.bgElem.unmap() );
                    }
                }

                return mediaIds;
            };

            /**
             *  Change form name
             *
             *  @param  lang        {String}    Language of new name
             *  @param  newName     {String}    New display name of form
             */

            template.setName = function(lang, newName) {
                if ((true === template.name.hasOwnProperty(lang)) && (template.name[lang] === newName)) {
                    return;
                }

                template.name[lang] = newName;
                //  listened for by form trees, title of editor, subform edit controls, etc
                var evt = { 'UID': template.UID, 'formId': template.formId, 'lang': lang, 'name': newName };
                Y.dcforms.event.raise('onFormNameChanged', evt);
            };

            /**
             *  Change the category of this form
             *  @param  newCategory     {String}    Canonical id of category
             */

            template.setCategory = function (newCategory) {
                if (template.category === newCategory) {
                    return;
                }

                template.category = newCategory;
                var evt = { 'UID': template.UID, 'formId': template.formId, 'category': newCategory };
                Y.dcforms.event.raise('onFormCategoryChanged',  evt);
            };

            /**
             *  Change whether this is a subform
             *
             *  @param  newValue    {Boolean}    True if this is a subform, false if not
             */

            template.setIsSubform = function(newValue) {
                if (template.isSubform === newValue) {
                    return;
                }

                template.isSubform = newValue;
                //  listened for by form trees, subform element controls, etc
                var evt = { 'UID': template.UID, 'formId': template.formId, 'iSubform': newValue };
                Y.dcforms.event.raise('onFormNameChanged',  evt);
            };

            /**
             *  Set fill / edit mode
             *  @param  mode        {string}    A valid form mode name (fill|edit|pdf|lock)
             *  @param  callback    {function}  Of the form fn(err)
             */

            template.setMode = function (mode, callback) {

                if (!callback || 'function' !== typeof callback) {
                    Y.log('No callback passed to template.setMode', 'warn', NAME);
                    callback = Y.dcforms.nullCallback;
                }

                if (template.mode === mode) {
                    //  already done
                    callback(null);
                    return;
                }

                if (template.valueEditor) {
                    template.valueEditor.destroy();
                    template.valueEditor = null;
                }

                template.mode = mode;

                _async.each(template.pages, setModeOnSinglePage, onAllPageModesSet);

                function setModeOnSinglePage(page, itcb) {
                    page.isDirty = true;    // don't skip redraw
                    page.setMode( mode, onPageModeSet );
                    function onPageModeSet( err ) {
                        if ( err ) { return itcb( err ); }
                        if ( Y.dcforms.isOnServer ) {
                            //  break with setImmediate on server to prevent stack exhaustion with async
                            setImmediate( function() { itcb( null ); } );
                            return;
                        } else {
                            return itcb( null );
                        }
                    }
                }

                function onAllPageModesSet(err) {
                    template.raise('modeSet', mode);
                    callback(err);
                }

            };

            /**
             *  Used when creating elements - a special mode where mouse events prompt element creation
             *  @param  elemType    {String}    element to add on click
             */

            template.setNextElemType = function(elemType) {
                template.drag = {
                    'mode': 'addelement',
                    'nextElemType': elemType
                };

                template.nextElemType = elemType;
            };


            /**
             *  Set reduced schema for this form
             *
             *  Note: this will clear any existing bindings
             *  Note: reduced schemas are deprecated in favor of a universal mapping under development
             *
             *  @param  reducedSchemaName   {string}    One of those suppoered by recucedschema-yui
             *  @param  callback            {function}  Of the form fn(err)
             */

            template.setSchema = function(reducedSchemaName, callback) {

                Y.log('Setting schema to: ' + reducedSchemaName, 'info', NAME);

                var
                    find = '{{' + template.reducedSchema,
                    subst = '{{' + reducedSchemaName,
                    elem, i, j;

                template.reducedSchema = reducedSchemaName;

                for (i = 0; i < template.pages.length; i++) {
                    for (j = 0; j < template.pages[i].elements.length; j++) {

                        //  attempt to update the binding
                        elem = template.pages[i].elements[j];
                        elem.reducedSchema = template.reducedSchema;
                        //template.pages[i].elements[j].schemaMember = '';

                        //  replace embedded fields in text values
                        if (elem.defaultValue && elem.defaultValue.en) {
                            elem.defaultValue.en = elem.defaultValue.en.replace(new RegExp(find, 'g'), subst);
                        }

                        if (elem.defaultValue && elem.defaultValue.de) {
                            elem.defaultValue.de = elem.defaultValue.de.replace(new RegExp(find, 'g'), subst);
                        }

                        if (elem.value && '' !== elem.value && 'text' === elem.getValueType()) {
                            elem.value = elem.value.replace(new RegExp(find, 'g'), subst);
                            elem.setValue(elem.value, Y.dcforms.nullCallback);
                        }

                    }
                }

                function onReRender(err) {

                    if ( err ) {
                        Y.log( 'Could not re-render form: ' + err, 'warn', NAME );
                        return callback( err );
                    }

                    template.raise( 'schemaSet', reducedSchemaName );
                    template.autosave();
                    callback( err );
                }

                if (template.isRendered) {
                    template.render(onReRender);
                } else {
                    //  do not attempt to update UI of form has not yet rendered
                    onReRender(null);
                }
            };

            /**
             *  Set / change the display language for this form
             *
             *  NOTE: user language is currently hard-set to German
             *
             *  @param  userLang    {string}    ('en'|'de') for now
             *  @param  callback    {function}  Of the form fn(err)
             */

            template.setUserLang = function( userLang, callback ) {
                var
                    i, j,
                    page,
                    elementsToUpdate = [],
                    withGender;

                if ( ( 'en' !== userLang ) && ( 'de' !== userLang ) ) {
                    Y.log('Language not supported: ' + userLang, 'warn', NAME);
                    return callback( null );
                }

                Y.dcforms.setUserLang(userLang, template.formId);
                template.userLang = userLang;

                for (i = 0; i < template.pages.length; i++) {

                    page = template.pages[i];

                    for (j = 0; j < page.elements.length; j++) {
                        //  TODO: include background, header and footer elements here
                        elementsToUpdate.push( page.elements[j] );
                    }
                }

                // MOJ-8269 _async.eachSeries is introducing delays by setting and waiting for timers
                Y.dcforms.eachSeries( elementsToUpdate, setUserLangOnSingleElement, onAllDone );

                function setUserLangOnSingleElement( elem, itcb ) {
                    //  force reload of image elements
                    if (elem.imgCache && 'object' === typeof elem.imgCache) {
                        elem.imgCache.clear();
                    }

                    //  for re-parse of dropdown definition MOJ-1099
                    if ('dropdown' === elem.elemType) {
                        elem.display = '';
                    }

                    //  show unapproved translations in edit mode, best translation in all other modes
                    withGender = ( 'edit' === template.mode ) ?  elem.getCurrentLang() :  elem.getBestLang();
                    elem.value = elem.defaultValue[ withGender ];

                    if (elem.renderer) {
                        if ( elem.renderer.setValue ) {
                            return elem.renderer.setValue( elem.value, onSingleElemUpdate );
                        }
                        if ( elem.renderer.update ) {
                            return elem.renderer.update( onSingleElemUpdate );
                        }
                    }

                    //  should never happen
                    onSingleElemUpdate( 'Element is missing renderer: ' + JSON.stringify( elem ) );

                    function onSingleElemUpdate( err ) {
                        if ( err ) {
                            Y.log( 'Error updating element with new language or gender: ' + JSON.stringify( err ), 'warn', NAME );
                            //  continue despite error, best effort
                        }
                        itcb( null );
                    }
                }

                function onAllDone( err ) {
                    if ( err ) { return callback( err ); }

                    template.raise('changeUserLang', userLang);

                    //  DEPRECATED: please use template.on('changeUserLang', ...);
                    Y.dcforms.event.raise('formLangChanged', { 'source': template.UID, 'lang': userLang });
                    template.raiseBinderEvent('onChangeUserLang', userLang);

                    //  trigger a re-render if form is already displayed


                    if ( template.isRendered ) {
                        template.render( callback );
                    } else {
                        return callback( null );
                    }
                }

            };

            /**
             *  Elements may require a variable number of tab stops (depending on value and/or form mode)
             *
             *  All of these should be and should stay synchronous
             *
             *  @returns {number}
             */

            template.countTabStops = function() {
                var i, j, tabCount = 0;
                for (i = 0; i < template.pages.length; i++) {
                    for (j = 0; j < template.pages[i].elements.length; j++) {
                        tabCount = tabCount + template.pages[i].elements[j].countTabStops();
                    }
                }
                return tabCount;
            };

            /**
             *  Handle tab key
             *
             *  @param selectedOn
             *  @param elemId
             */

            template.tabNext = function(selectedOn, elemId) {
                //  temporarily disabled until edir position fixed

                template.setSelected(selectedOn, null);

                var i, j, page, elem, count = 0, useNext = false;

                for (j = 0; j < template.pages.length; j++) {

                    page = template.pages[j];
                    for (i = 0; i < page.tabMap.length; i++) {
                        elem = page.elements[page.tabMap[i]];
                        count = count + 1;
                        if (true === useNext && elem && elem.elemId) {
                            //alert('Set next selection: ' + elem.elemId);
                            if (elem.getProperty('canSelect')) {
                                template.setSelected(selectedOn, elem);
                                useNext = false;
                                return;
                            }
                        }
                        if (elem && elem.elemId && elem.elemId === elemId) {
                            //alert('set usenext from ' + elemId);
                            useNext = true;
                        }
                    }
                }

                //  wrap around to the beginning
                /*
                if (true === useNext) {
                    //alert('wrapping around');
                    if (count > 0) {
                        for (j = 0; j < template.pages.length; j++) {
                            page = template.pages[j];
                            page.setTabIndexes();
                            for (i = 0; i < page.tabMap.length; i++) {
                                elem = page.elements[page.tabMap[i]];
                                if (elem && elem.elemId) {
                                    template.setSelected(selectedOn, elem);
                                    return;
                                }
                            }
                        }
                    }
                }
                */
                Y.log('Wrapping tab select back to top of forn.', 'debug', NAME);
                template.setFirstSelected(selectedOn);
            };

            /*--------------------------------------------------------------------------------------
             *  CREATE FORM
             */

            /*
             *  initialize
             */

            options.callback = options.callback || Y.dcforms.nullCallback;

            function onInitialRender(err) {

                if (err) {
                    Y.log('Error rendering page after initial load: ' + template.name[template.userLang], 'warn', NAME );
                    //  continue anyway
                }

                options.callback(err, template);
            }

            function onFirstLoad(err) {

                if (err) {
                    Y.log('Error initializing form: ' + err, 'warn', NAME);
                    options.callback(err, template);
                    return;
                }

                if (options.doRender) {
                    template.render(onInitialRender);
                    return;
                }

                options.callback(null, template);
            }

            if (false === template.isOnServer) {
                //	prevent form from autosaving while DOM objects are being unloaded
                $(window).off('beforeunload.forms').on('beforeunload.forms', function () {
                    template.destroy();
                });
            }

            if ( !options.canonicalId || '' === options.canonicalId ) {
                Y.log( 'No canonical Id given when creating template, please call load() next', 'debug', NAME );
                return options.callback( null, template );
            } else {
                template.load( options.canonicalId, options.formVersionId, onFirstLoad );
            }

        };

        /*
         *	Placeholder for translation dictionary
         */

        if (!Y.dcforms.il8nDict) {
            Y.dcforms.il8nDict = {};
        }

        /**
		 *	Instantiate and return a form template
         *  DEPRECATED
		 */

		Y.dcforms.template = {
			create:	function(patientRegId, canonicalId, formVersionId, divId, il8nDict, doRender, callback) {
                if (il8nDict) {
                    Y.dcforms.il8nDict = il8nDict;
                }

                Y.log( 'DEPRECATED: please use Y.dcforms.createTemplate()', 'warn', NAME );

                Y.dcforms.createTemplate({
                    'patientRegId': patientRegId,
                    'canonicalId': canonicalId,
                    'formVersionId': formVersionId,
                    'divId': divId,
                    'il8nDict': il8nDict,
                    'doRender': doRender,
                    'callback': callback
                });
            },

            createOnServer:	function(user, patientRegId, canonicalId, formVersionId, divId, il8nDict, doRender, callback) {
                if (il8nDict) {
                    Y.dcforms.il8nDict = il8nDict;
                }

                Y.log( 'DEPRECATED: please use Y.dcforms.createTemplate()', 'warn', NAME );

                Y.dcforms.createTemplate({
                    'user': user,
                    'patientRegId': patientRegId,
                    'canonicalId': canonicalId,
                    'formVersionId': formVersionId,
                    'divId': divId,
                    'il8nDict': il8nDict,
                    'doRender': doRender,
                    'callback': callback
                });
            }

        }; // end YUI append object

	},

	/* Req YUI version */
	'0.0.1',

	/* YUI module config */
	{
		requires: [
            'dcforms-utils',
            'dcforms-page',
            'dcforms-reducedschema',
            'dcforms-canvas-utils',
            'dcforms-event-emitter',
            'dcforms-papersizes',
            'dcforms-roles',
            'dcforms-event-emitter',
            'dcforms-schema-all',
            'dcforms-packageutils',

            'formfolder-schema'
        ]
	}

);  // end YUI.add
