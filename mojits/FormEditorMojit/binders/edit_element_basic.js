/*
 * Copyright (c) 2012 Doc Cirrus GmbH
 * all rights reserved.
 */

/*eslint prefer-template:0, strict:0 */
/*exported _fn */
/*global $, ko */

'use strict';

function _fn(Y, NAME) {

    var
        i18n = Y.doccirrus.i18n,

        TABLE_TYPES = [ 'table', 'reporttable', 'labdatatable', 'meddatatable', 'contacttable' ],

        template,
        element,                                //  reference to last selected dcforms-element object
        valueType = 'unknown',                  //  type of value this element takes

        eventHandlers = {
            'elementSelected': onElementSelected,
            'valueChanged': onValueChanged,
            'elementBound': onValueChanged,
            //'elementMove': onElementMove,
            //'elementResize': onElementResize,
            'changeUserLang': onChangeUserLang,
            //'elementBindingSet': onElementBindingSet,
            'useReportingChange': checkReportingStatus
        },

        dataBinding = {                         //	binding of edit form to properties of dcforms-element
            'hdnDomId': 'domId',				//  please see ../../views/forms.jade.html for reference
            'txtElemId': 'elemId',
            'txtBgColor': 'bgColor',
            'txtFgColor': 'fgColor',
            'txtBorderColor': 'borderColor',
            'selAlign': 'align',
            'selFont': 'font',
            'txtScaleWidth': 'width',
            'txtScaleHeight': 'height',
            'txtScaleLeft': 'left',
            'txtScaleTop': 'top',
            'txtScaleFont': 'lineHeight',
            'txtLineSpace': 'lineSpace',
            'txtBindSubType': 'schemaMemberST'
        },

        numberElements = {
            'txtScaleWidth': '10',
            'txtScaleHeight': '10',
            'txtScaleLeft': '10',
            'txtScaleTop': '10',
            'txtScaleFont': '10',
            'txtLineSpace': '1.0'
        },

        //  elements are grouped according to the kind of value they accept
        //  elements may change type to elements in the same group

        elementTypes = {
            'text': [ 'label', 'input', 'textarea', 'audio', 'textmatrix', 'hyperlink' ],
            'date': [ 'date' ],
            'barcode': [ 'barcode' ],
            'boolean': [ 'checkbox', 'checkboxtrans', 'togglebox' ],
            'image': [ 'image' ],
            'list': [ 'radio', 'radiotrans', 'dropdown' ],
            'table': [ 'table', 'meddatatable' ],
            'subform': [ 'subform' ],
            'reporttable': [ 'reporttable' ],
            'labdatatable': [ 'labdatatable' ],
            'contacttable': [ 'contacttable' ],
            'chartmd': [ 'chartmd' ]
        },


        //  KO model will be initialized with these properties / translations in interface language

        jadeTranslations = {
            'lblDomIdI18n': 'FormEditorMojit.panel_properties.LBL_DOM_ID',
            'lblElementTypeI18n': 'FormEditorMojit.el_properties_panel.LBL_ELEMENT_TYPE',
            'optLabelI18n': 'FormEditorMojit.new_el_form.add_option.OPT_LABEL',

            //  element types dropdown
            /*
            'optInputI18n': 'FormEditorMojit.new_el_form.add_option.OPT_INPUT',
            'optTextAreaI18n': 'FormEditorMojit.new_el_form.add_option.OPT_TEXTAREA',
            'optTextMatrixI18n': 'FormEditorMojit.new_el_form.add_option.OPT_TEXTMATRIX',
            'optHyperlinkI18n': 'FormEditorMojit.new_el_form.add_option.OPT_HYPERLINK',
            'optCheckboxI18n': 'FormEditorMojit.new_el_form.add_option.OPT_CHECKBOX',
            'optCheckboxTransI18n': 'FormEditorMojit.new_el_form.add_option.OPT_CHECKBOXTRANS',
            'optToggleBoxI18n': 'FormEditorMojit.new_el_form.add_option.OPT_TOGGLEBOX',
            'optDropdownI18n': 'FormEditorMojit.new_el_form.add_option.OPT_DROPDOWN',
            'optRadioI18n': 'FormEditorMojit.new_el_form.add_option.OPT_RADIO',
            'optRadioTransI18n': 'FormEditorMojit.new_el_form.add_option.OPT_RADIOTRANS',
            'optTableI18n': 'FormEditorMojit.new_el_form.add_option.OPT_TABLE',
            'optReportTableI18n': 'FormEditorMojit.new_el_form.add_option.OPT_REPORTTABLE',
            'optLabdataTableI18n': 'FormEditorMojit.new_el_form.add_option.OPT_LABDATATABLE',
            'optImageI18n': 'FormEditorMojit.new_el_form.add_option.OPT_IMAGE',
            'optAudioI18n': 'FormEditorMojit.new_el_form.add_option.OPT_AUDIO',
            'optBarcodeI18n': 'FormEditorMojit.new_el_form.add_option.OPT_BARCODE',
            'optDateI18n': 'FormEditorMojit.new_el_form.add_option.OPT_DATE',
            'optSubformI18n': 'FormEditorMojit.new_el_form.add_option.OPT_SUBFORM',
            'optChartmdI18n': 'FormEditorMojit.new_el_form.add_option.OPT_CHARTMD',
            */

            //  color pickers
            'lblEEColorsI18n': 'FormEditorMojit.el_properties_panel.color.LBL_EE_COLORS',
            'lblForegroundColorI18n': 'FormEditorMojit.panel_properties.LBL_FOREGROUND_COLOR',
            'lblBackgroundColorI18n': 'FormEditorMojit.panel_properties.LBL_BACKGROUND_COLOR',
            'lblBorderColorI18n': 'FormEditorMojit.el_properties_panel.color.LBL_BORDER_COLOR'
        },

        editElementBasicVM = null,              //  eslint-disable-line no-unused-vars

        //userLang = template ? template.userLang : Y.dcforms.getUserLang(),     //  user's language, may be overridden by template

        //  older jQuery code to be replaced with KO viewmodels
        textEditor,                             //  widget for editing text type elements (label, input, textarea)
        dateEditor,                             //  widget for editing date type elements (date)
        booleanEditor,                          //  widget for editing bool type elements (checkbox, togglebox)
        listEditor,                             //  widget for editing list type elements (radio, dopdown)
        barcodeEditor,                          //  widget for editing barcode elements
        //tableEditor,                          //  widget for editing table definitions
        reportTableEditor,                      //  widget for editing report table definitions
        labdataTableEditor,                     //  widget for editing labdata tables
        subformEditor,                          //  widget for editing subform embeds
        hyperlinkEditor,                        //  widget for editing hyperlink elements

        //  specialized types edited with KO viewmodel bound
        specializedTypeEditor,

        jq = {};                                //  cached jQuery selectors


    /**
     *  KO ViewModel to bind form element object and events into panel
     *  @constructor
     */

    function EditElementBasicVM() {
        var
            self = this;

        /**
         *  Set up the editor model
         */

        function init() {

            self.koFormSubs = [
                'elemId',
                //'elemType',
                //'valueType',
                'bgColor',
                'fgColor',
                'borderColor',
                'align',
                'font',
                'width',
                'height',
                'left',
                'top',
                'lineHeight',
                'lineSpace',
                'schemaMember',
                'schemaMemberST',
                'inheritFrom',
                'isBold',
                'isItalic',
                'isUnderline',
                'tableRowSpacing'
            ];

            self.blockUpdates = true;
            self.formElement = ko.observable( null );
            self.reducedSchema = ko.observable( template.reducedSchema );

            self.elemType = ko.observable( '' );
            self.valueType = ko.observable( '' );
            self.formMode = ko.observable( '...' );

            self.schemaMember = ko.observable( '' );
            self.schemaType = ko.observable( '' );

            initTranslations();

            initElementSubscriptions();
            initElementComputeds();
            initFormEvents();
            initJadeTranslations();
            initElemTypeDropDown();
            initSchemaMembers();
            initButtons();
            initSelectElementDropdown();
            initSubEditors();

            self.blockUpdates = false;
        }

        /**
         *  Couple form events to KO observables
         */

        function initFormEvents() {
            var
                koEventHandlers = {
                    'elementSelected': 'onElementSelected',
                    'valueChanged': 'onValueChanged',
                    'elementBound': 'onValueChanged',
                    'elementMove': 'onElementMove',
                    'elementResize': 'onElementResize',
                    'changeUserLang': 'onChangeUserLang',
                    'elementBindingSet': 'onElementBindingSet',
                    'useReportingChange': 'onCheckReportingStatus',
                    'modeSet': 'onFormModeSet'
                },
                k;

            Y.log('Registering events for edit_element_basic', 'debug', NAME);

            for (k in koEventHandlers) {
                if (koEventHandlers.hasOwnProperty(k)) {
                    //Y.log('Register event ' + k + ' to ' + 'edit_element_basic', 'debug', NAME);
                    template.on(k, 'edit_element_basic_ko', makeEventHandler( koEventHandlers[k] ) );
                }
            }

            function makeEventHandler( fnName ) {
                return function( evt ) {
                    self[ fnName ]( evt );
                };
            }
        }

        /**
         *  Get panel UI strings in current interface language
         */

        function initTranslations() {
            self.labelEEPositionI18n = i18n('FormEditorMojit.el_properties_panel.position.LBL_EE_POSITION');
            self.lblFontFaceI18n = i18n('FormEditorMojit.el_properties_panel.font.LBL_FONT_FACE');
            self.lblWidthMMI18n = i18n('FormEditorMojit.panel_properties.LBL_WIDTH_MM');
            self.lblAlignI18n = i18n('FormEditorMojit.el_properties_panel.align.LBL_ALIGN');
            self.optLeftI18n = i18n('FormEditorMojit.el_properties_panel.align.OPT_LEFT');
            self.optCenterI18n = i18n('FormEditorMojit.el_properties_panel.align.OPT_CENTER');
            self.optRightI18n = i18n('FormEditorMojit.el_properties_panel.align.OPT_RIGHT');
            self.optJustifyI18n = i18n('FormEditorMojit.el_properties_panel.align.OPT_JUSTIFY');
            self.heightMMI18n = i18n('FormEditorMojit.panel_properties.LBL_HEIGHT_MM');
            self.fontHeightMMI18n = i18n('FormEditorMojit.panel_properties.LBL_FONT_HEIGHT_MM');
            self.lblLeftMMI18n = i18n('FormEditorMojit.el_properties_panel.position.LBL_LEFT_MM');
            self.lblFontSpaceI18n = i18n('FormEditorMojit.el_properties_panel.font.LBL_FONT_SPACE');
            self.lblTopMMI18n = i18n('FormEditorMojit.el_properties_panel.position.LBL_TOP_MM');
            self.lblRowspaceI18n = i18n('FormEditorMojit.el_properties_panel.position.LBL_ROWSPACE_MM');
            self.lblEEReportingI18n = i18n('FormEditorMojit.el_properties_panel.reporting.LBL_EE_REPORTING');
            self.lblEERepotingTypeI18n = i18n('FormEditorMojit.el_properties_panel.reporting.LBL_EE_REPORTINGTYPE');
            self.lblStringI18n = i18n('FormEditorMojit.el_properties_panel.reporting.LBL_STRING');
            self.lblNumbersI18n = i18n('FormEditorMojit.el_properties_panel.reporting.LBL_NUMBER');
            self.lblBooleanI18n = i18n('FormEditorMojit.el_properties_panel.reporting.LBL_BOOLEAN');
            self.lblDateI18n = i18n('FormEditorMojit.el_properties_panel.reporting.LBL_DATE');
            self.lblImageI18n = i18n('FormEditorMojit.el_properties_panel.reporting.LBL_IMAGE');
            self.lblEEDescriptionDEI18n = i18n('FormEditorMojit.el_properties_panel.reporting.LBL_EE_DESCRIPTION_DE');
            self.lblEEDescriptionENI18n = i18n('FormEditorMojit.el_properties_panel.reporting.LBL_EE_DESCRIPTION_EN');
            self.lblEEValueI18n = i18n('FormEditorMojit.el_properties_panel.LBL_EE_VALUE');
            //self.btnAttachImageI18n = i18n('FormEditorMojit.el_properties_panel.BTN_ATTACH_IMAGE');
            //self.imageClickI18n = i18n('FormEditorMojit.el_properties_panel.LBL_EE_IMAGE_CLICK');
            //self.optEEChooseImageI18n = i18n('FormEditorMojit.el_properties_panel.OPT_EE_CHOOSE_IMAGE');
            //self.optEditImageI18n = i18n('FormEditorMojit.el_properties_panel.OPT_EE_EDIT_IMAGE');
            self.btnUpdateElementI18n = i18n('FormEditorMojit.el_properties_panel.BTN_UPDATE_ELEMENT');
            self.lblEEGridAlignI18n = i18n('FormEditorMojit.el_properties_panel.LBL_EE_GRID_ALIGN');
            self.lblEEReadonlyI18n = i18n('FormEditorMojit.el_properties_panel.LBL_EE_READONLY');
            self.lblEEBffI18n = i18n('FormEditorMojit.el_properties_panel.LBL_EE_BFB');
            self.lblEEClipI18n = i18n('FormEditorMojit.el_properties_panel.LBL_EE_CLIP');
            self.lblEENotemptyI18n = i18n('FormEditorMojit.el_properties_panel.LBL_EE_NOTEMPTY');
            self.lblEEReportingI18n = i18n('FormEditorMojit.el_properties_panel.LBL_EE_REPORTING');

            self.lblEENoCopyOverI18n = i18n('FormEditorMojit.el_properties_panel.LBL_EE_NO_COPY_OVER');

            self.lblEEIslinkedI18n = i18n('FormEditorMojit.el_properties_panel.LBL_EE_ISLINKED');
            //self.btnChooseImageI18n = i18n('FormEditorMojit.ctrl.BTN_CHOOSE_IMAGE');
            self.btnEEUnlinkI18n = i18n('FormEditorMojit.el_properties_panel.BTN_EE_UNLINK');
            self.buttonRemoveElementI18n = i18n('FormEditorMojit.el_properties_panel.BTN_REMOVE_ELEMENT');

            //  temporary
            self.btnEELinkI18n = 'Link';
        }

        /**
         *  Subscribe to UI elements, to update form element properties on change
         */

        function initElementSubscriptions() {
            var
                propName,
                i;

            for ( i = 0; i < self.koFormSubs.length; i++ ) {
                propName = self.koFormSubs[ i ];
                self[ propName ] = ko.observable( '' );
                makeKoSubscription( propName );
            }

            function makeKoSubscription( propName ) {
                var
                    koVal = self[ propName ],
                    koSubKey = 'listen' + propName;

                self[ koSubKey ] = koVal.subscribe( function( newValue ) {
                    var elem = self.formElement();
                    if ( !elem || self.blockUpdates ) { return; }
                    elem.setProperty( propName, newValue );

                    //  handle any special cases
                    self.onSetBoundProperty( propName, newValue);
                } );
            }

            self.hiddenDomId = ko.observable( function(){
                let tempElem = self.formElement();
                if ( !tempElem || !tempElem.domId ) { return ''; }
                return tempElem.domId;
            } );
        }

        /**
         *  Additional subscriptions / computeds to show/hide elements
         */

        function initElementComputeds() {

            self.hasEditableElement = ko.computed( function() {
                if ( self.formElement() && 'edit' === self.formMode() ) { return true; }
                return false;
            } );

            self.noElementSelected = ko.computed( function() {
                if ( !self.formElement() ) { return true; }
            } );

            //  additional subscriptions
            self.showPanel = ko.computed( function() {
                return self.formElement() ? true : false ;
            } );

            self.hasReducedSchema = ko.computed( function() {
                var tempElem = self.formElement();
                if ( !tempElem || !tempElem.reducedSchema || !tempElem.page.form.reducedSchema ) { return false; }
                return true;
            } );

            self.showSelectMemberBox = ko.computed( function() {
                //  hide the 'select schema member' dropdown if no schema, no element, or is image
                return (
                    ( self.elemId() && '' !== self.elemId() ) &&
                    ( 'image' !== self.elemType() ) &&
                    ( self.reducedSchema() && '' !== self.reducedSchema() )
                );
            } );

            self.hasSchemaSubType = ko.computed( function() {
                var
                    tempElement = self.formElement(),
                    memberName = self.schemaMember();

                if ( !tempElement || !memberName ) { return false; }
                if ( 'selectedActsTable' === memberName || 'selectedActsString' === memberName) { return true; }
                return false;
            } );

            self.isLinked = ko.computed( function() {
                var inheritFrom = self.inheritFrom();
                return ( inheritFrom && '' !== inheritFrom );
            } );

            self.isLinkable = ko.computed( function() {
                return !self.isLinked();
            } );

            self.isTableType = ko.computed( function() {
                var elemType = self.elemType();
                return ( -1 !== TABLE_TYPES.indexOf( elemType ) );
            } );

        }

        function initSubEditors() {
            //  show sub-editors
            self.showTextEditor = ko.computed( function() {
                return -1 !== elementTypes.text.indexOf( self.elemType() );
            } );

            self.textEditorVM = new Y.dcforms.FormTextEditorViewModel();

            self.showTableEditor = ko.computed( function() {
                return 'table' === self.elemType() || 'meddatatable' === self.elemType();
            } );
            self.tableEditorVM = new Y.dcforms.FormTableEditorViewModel();
        }

        /**
         *  Initialize UI buttons
         */

        function initButtons() {
            //  remove button is always visible
            self.btnRemoveElementVisible = ko.observable( true );
        }

        /**
         *  Add new translations, replaces Jade translations
         */

        function initJadeTranslations() {
            var k;
            for ( k in jadeTranslations ) {
                if ( jadeTranslations.hasOwnProperty( k ) ) {
                    self[k] = i18n( jadeTranslations[k] );
                }
            }
        }

        function initElemTypeDropDown() {
            self.compatibleTypes = ko.computed( function() {
                var
                    elemType = self.elemType(),
                    valueType = self.valueType(),
                    compatibleSet = elementTypes.hasOwnProperty( valueType ) ? elementTypes[ valueType ] : [],
                    selOpts = [],
                    foundType,
                    dictKey,
                    i;

                //  invalid elements are not compatible with others
                if ( !elemType ) { return selOpts; }

                for (i = 0; i < compatibleSet.length; i++) {
                    foundType = compatibleSet[i];
                    dictKey = 'FormEditorMojit.new_el_form.add_option.OPT_' + foundType.toUpperCase();
                    selOpts.push( { 'elemType': foundType, 'label': i18n( dictKey ) } );
                }

                return selOpts;
            } );

            self.listenElemType = self.elemType.subscribe( function( newValue ) {
                //  when element type is changed in dropdown we me need to re-initialize the form element to
                //  the new type with new properties and renderer
                if ( newValue ) { self.onElemTypeChanged( newValue ); }
            } );
        }

        /**
         *  Defines a computed which will load the current reduced schema and return its members formatted for dropdown
         */

        function initSchemaMembers() {

            var
                //  assume invariant
                MODULE_DOQUVIDE = Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE,
                MODULE_DQS = Y.doccirrus.schemas.settings.specialModuleKinds.DQS,
                SERVICE_INSPECTORAPO = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORAPO,
                SERVICE_INSPECTORDOC = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOC,
                SERVICE_INSPECTORDOCSOLUI = Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORDOCSOLUI,
                AUTH_DOQUVIDE = Y.doccirrus.auth.hasSpecialModule( MODULE_DOQUVIDE ),
                AUTH_DQS = Y.doccirrus.auth.hasSpecialModule( MODULE_DQS ),
                AUTH_AMTS = Y.doccirrus.auth.hasAdditionalService( SERVICE_INSPECTORAPO ) || Y.doccirrus.auth.hasAdditionalService( SERVICE_INSPECTORDOC ) || Y.doccirrus.auth.hasAdditionalService( SERVICE_INSPECTORDOCSOLUI );

            self.allReducedSchemaMembers = ko.computed( function() {

                var

                    reducedSchemaName = self.reducedSchema(),
                    selOpts = [ { 'memberName': '', 'memberType': '', 'memberTrans': '' } ],

                    userLang = Y.dcforms.getUserLang(),
                    m2Lang = Y.dcforms.reducedschema.getM2Lang( userLang ),
                    schema = Y.dcforms.reducedschema.loadSync( reducedSchemaName ),
                    k;

                //Y.log('Raw schema: ' + JSON.stringify(schema, undefined, 2), 'debug', NAME);

                if( !schema ) {
                    Y.log( 'Could not load schema ' + reducedSchemaName + ' from static set.', 'warn', NAME );
                    return selOpts;
                }

                for( k in schema ) {
                    if( schema.hasOwnProperty( k ) && ('object' === typeof schema[k]) ) {
                        if( schema[k].hasOwnProperty( 'cardioXML' ) && !( AUTH_DOQUVIDE || AUTH_DQS ) ) {
                            continue;
                        }

                        if( k.indexOf( 'AMTS' ) === 0 && !AUTH_AMTS ) {
                            continue;
                        }

                        if( -1 === Y.dcforms.reducedschema.reservedWords.indexOf( k ) ) {

                            if( !schema[k].hasOwnProperty( 'label' ) || ('undefined' === typeof (schema[k])) ) {
                                Y.log( 'Missing translations in schema for ' + k + ': ' + JSON.stringify( schema[k] ), 'warn', NAME );
                                schema[k].label = {};
                            }

                            if( !schema[k].label.hasOwnProperty( userLang ) ) {
                                Y.log( 'Missing translation for ' + userLang + ': ' + JSON.stringify( schema[k] ), 'warn', NAME );
                                schema[k].label[userLang] = 'FIXME: MISSING';
                            }

                            if( schema[k].hasOwnProperty( m2Lang ) ) {
                                schema[k].label[userLang] = schema[k][m2Lang];
                            }

                            selOpts.push( {
                                'memberName': k,
                                'memberType': schema[k].type,
                                'memberTrans': schema[k].label[userLang] + ' (' + schema[k].type + ')'
                            } );
                        }
                    }
                }

                function sortOptionsAlphabetically( a, b ) {
                    var
                        aLower = a.memberTrans.toLowerCase(),
                        bLower = b.memberTrans.toLowerCase();

                    if( aLower < bLower ) {
                        return -1;
                    }
                    if( aLower > bLower ) {
                        return 1;
                    }
                    return 0;
                }

                selOpts.sort( sortOptionsAlphabetically );

                return selOpts;
            } );

            self.filterReducedSchemaMembers = ko.computed( function() {
                var
                    valueType = self.valueType(),
                    matchType,
                    allOpts = self.allReducedSchemaMembers(),
                    filteredOpts = [],
                    i;


                for ( i = 0; i < allOpts.length; i++ ) {

                    matchType = allOpts[i].type || '';
                    matchType = matchType.toLowerCase();

                    switch( valueType ) {
                        case 'list':
                        case 'text':
                            if ( 'string' === matchType ) {
                                filteredOpts.push( allOpts[i] );
                            }
                            break;

                        case 'boolean':
                            if ( 'boolean' === matchType ) {
                                filteredOpts.push( allOpts[i] );
                            }
                            break;
                    }

                }

                return filteredOpts;
            } );

        }

        /**
         *  Set up form element dropdown, used to pick an element by id if none selected
         */

        function initSelectElementDropdown() {
            self.allAvailableElements = ko.observableArray();
            self.allElementsDropdown = ko.observable( '' );
            self.updateAvailableElements();

            self.subscribeDropdownChange = self.allElementsDropdown.subscribe( function( newVal ) {
                self.onElementDropdownChange( newVal );
            } );
        }

        /**
         *  Called when element or element type changes
         */

        function updateSubEditor() {
            var
                elemType = self.elemType(),
                isText = ( -1 !== elementTypes.text.indexOf( elemType ) ),
                isTable = elemType === 'table' || elemType === 'meddatatable';

            self.tableEditorVM.setElement( isTable ? self.formElement() : null );
            self.textEditorVM.setElement( isText ? self.formElement() : null );
        }

        //  PANEL ACTIONS

        self.hidePanel = function __hidePanel() {
            updateElementSelect();
            //jq.divNoElementSelected.show();
            //jq.divElementEditControls.hide();
        };

        /**
         *  Update the complete list of elements, shown when no element(s) yet selected on page
         *
         *  TODO: subscribe to element creation and deletion
         */

        self.updateAvailableElements = function __updateAvailableElements() {
            var
                MAX_DD_OPTION_LENGTH = 20,

                dropdownItems = [],
                elem,
                label,
                i, j;

            //  default value is empty
            dropdownItems.push( { 'elemId': '', 'label': '' } );

            if ( template ) {
                for (i = 0; i < template.pages.length; i++) {
                    for (j = 0; j < template.pages[i].elements.length; j++) {
                        elem = template.pages[i].elements[j];

                        label = elem.defaultValue[ elem.getBestLang() ];

                        if ( 'string' !== typeof label ) {
                            label = label + '';
                        }

                        if ( label.length > MAX_DD_OPTION_LENGTH ) {
                            label = label.substr( 0, MAX_DD_OPTION_LENGTH ) + '...';
                        }

                        dropdownItems.push({
                            elemId: elem.elemId,
                            label: elem.elemId + ' // ' + label
                        });
                    }
                }
            }

            self.allAvailableElements( dropdownItems );
        };


        /**
         *  When element properties have changed (text style, size, position, etc)
         */

        self.redrawElementAndSave = function __redrawElementAndSave() {
            element.page.form.render( onAfterElementRerender );
            function onAfterElementRerender() {
                element.page.form.autosave( Y.dcforms.nullCallback );
            }
        };

        //  FORM EVENT HANDLERS

        /**
         *  Raised by form template
         *  @param  {Object}    elem
         */

        self.onElementSelected = function __onElementSelected( elem ) {
            var
                propName,
                koVal,
                elemVal,
                i;

            if ( !template || 'edit' !== template.mode ) {
                return;
            }

            //  stop ko subscription from feeding back while we change values
            self.blockUpdates = true;

            if ( !elem || '' === elem ) {
                Y.log( 'Element delselected: ' + ( element ? element.elemId : '' ), 'debug', NAME );
                self.elemId( '' );
                self.elemType( '' );
                self.valueType( '' );
                element = null;
                self.formElement( null );
                return;
            }

            element = elem;

            self.formElement( elem );
            self.valueType( elem.getValueType() );
            self.elemType( elem.elemType );

            for ( i = 0; i < self.koFormSubs.length; i++ ) {

                propName = self.koFormSubs[i];
                koVal = self[ propName ];
                elemVal = element.getProperty( propName );
                koVal( elemVal );
            }

            updateSubEditor();

            //  re-enable KO subscription in UI
            self.blockUpdates = false;
        };

        self.onElemTypeChanged = function __onElemTypeChanged( newValue ) {
            function onUnSerialize() {
                if (elem.renderer.update) {
                    elem.renderer.update(Y.dcforms.nullCallback);
                }

                //  element recreated with new unique id
                initPanel();

                elem.isDirty = true;
                elem.page.redrawDirty();
                template.autosave();
            }

            var elem = self.formElement();

            if ( !elem || elem.elemType === newValue ) { return; }
            elem.elemType = newValue;

            //  recreate the element (with a new renderer)
            elem.unserialize( elem.serialize(), onUnSerialize );
        };

        self.onFormModeSet = function __onFormModeSet( newMode ) {
            self.formMode( newMode );
        };

        /**
         *  Handle special cases and checks when setting property values, called by templated KO binding
         *
         *  @param  {String}    propName
         *  @param  {*}         newValue
         */

        self.onSetBoundProperty = function __onSetBoundProperty( propName, newValue ) {
            switch ( propName ) {
                case 'schemaMember':
                    self.onSchemaMemberChanged( newValue );
                    break;
            }
        };

        /**
         *  When te reduced schema member is changed in the dropdown, then we should also update the element type and
         *  call method to bind it.
         *
         *  @param newValue
         */

        self.onSchemaMemberChanged = function __onSchemaMemberChanged( newValue ) {
            let
                allMembers = self.allReducedSchemaMembers(),
                tempElem = self.formElement(),
                newMember, i;

            for ( i = 0; i < allMembers.length; i++ ) {
                if ( allMembers[i].memberName === newValue ) {
                    newMember = allMembers[i];
                }
            }

            //  if nothing to set then assume schema binding has been cleared
            if ( !newMember ) {
                tempElem.schemaMember = '';
                tempElem.setProperty( 'schemaMember', '' );
                tempElem.setProperty( 'schemaType', tempElem.getValueType() );
                return onBindingSet();
            }

            //  if properties are already set correctly then do not repeat
            if ( ( element.schemaMember === newMember.memberName ) && ( element.schemaType === newMember.memberType ) ) {
                return;
            }

            Y.log( 'Changing selected binding to: ' + newMember.memberName + '/' + newMember.memberType, 'info', NAME);
            tempElem.setBinding( tempElem.page.form.reducedSchema, newMember.memberName, newMember.memberType, onBindingSet );

            function onBindingSet(err) {

                if (err) {
                    Y.log('Could not set binding: ' + err, 'warn');
                    //  continue in any case
                }

                element.isDirty = true;
                element.page.redrawDirty();
            }

        };

        /**
         *  Raised when a form element is bound to a reduced schema member
         *  @param  {Object}    eventData
         *  @param  {String}    eventData.elemId
         */

        self.onElementBindingSet = function __onElementBindingSet(eventData) {
            var tempElem = self.formElement();
            if ( !tempElem || eventData.elemId !== tempElem.elemId ) { return; }

            self.schemaMember( tempElem.schemaMember );
            self.schemaType( tempElem.schemaType );
        };

        /**
         *  Raised by the form when an element value changes
         */

        self.onValueChanged = function __onValueChanged( changedElement ) {
            var currentElement = self.formElement();

            if ( !currentElement || !currentElement.elemType || currentElement.elemId !== changedElement.elemId ) {
                return;
            }

            switch( currentElement.getValueType() ) {
                case 'text':
                    self.textEditorVM.currentLanguageValue( currentElement.getValue() );
                    break;
            }
        };

        self.onElementMove = function __onElementMove() {
            console.log( 'KO onElementMove' );                          //  eslint-disable-line no-console

            var tempElem = self.formElement();

            if ( !tempElem || tempElem.elemId !== template.drag.elem.elemId) { return; }

            self.left( element.mm.left );
            self.top( element.mm.top );
        };

        self.onElementResize = function __onElementResize() {
            console.log( 'KO onElementResize' );                        //  eslint-disable-line no-console

            var tempElem = self.formElement();

            if ( !tempElem || tempElem.elemId !== template.drag.elem.elemId ) { return; }

            self.height(element.mm.height);
            self.width(element.mm.width);
        };

        self.onChangeUserLang = function __onChangeUserLang() {
            console.log( 'KO onChangeUserLang' );                       //  eslint-disable-line no-console
        };

        //  TODO: rename
        self.checkReportingStatus = function __checkReportingStatus() {
            console.log( 'KO checkReportingStatus' );                   //  eslint-disable-line no-console
        };

        /**
         *  Run when remove button clicked, cause dcforms-page to remove this element
         */

        self.onRemoveButtonClicked = function __onRemoveButtonClicked() {

            //  relocate from onRemoveForm
            if (template.valueEditor) {
                template.valueEditor.destroy();
            }
            element.page.removeElement(element.elemId);
            self.formElement( null );
        };

        self.onLinkButtonClicked = function __onLinkButtonClicked() {
            var
                elem = self.formElement();

            Y.doccirrus.DCWindow.prompt( {
                'title': 'DOM-ID',
                'defaultValue': elem.inheritFrom,
                'callback': onElementIdGiven
            } );

            function onElementIdGiven( evt ) {
                var
                    template = element.page.form,
                    userInput = evt.data ? evt.data : '',
                    found = false,

                    //  TODO: TRANSLATEME
                    failMsg = 'link not created, element not found: ' + userInput,
                    confirmMsg = 'link created',
                    clearMsg = 'link cleared',

                    i, j;

                //  no value given, nothing to do
                if ( '' === userInput ) {
                    if ( elem.inheritFrom ) {
                        Y.doccirrus.DCWindow.notice( { 'title': 'Confirm', 'message': clearMsg } );
                    }
                    elem.inheritFrom = '';
                    return;
                }

                for ( i = 0; i < template.pages.length; i++ ) {
                    for ( j = 0; j < template.pages[i].elements.length; j++ ) {
                        if ( template.pages[i].elements[j].elemId === userInput ) {
                            found = true;
                        }
                    }
                }

                if ( true === found ) {
                    self.inheritFrom( userInput );
                    elem.page.form.autosave();
                    Y.doccirrus.DCWindow.notice( { 'title': 'Confirm', 'message': confirmMsg } );
                } else {
                    Y.doccirrus.DCWindow.notice( { 'title': 'Failed', 'message': failMsg } );
                }

            }
        };

        /**
         *  Raised by KO binding when user selects an element from the dropdown of all elements
         *  @param selectedElemId
         */

        self.onElementDropdownChange = function __onElementDropdownChange( selectedElemId ) {
            if ( '' === selectedElemId ) { return; }

            var i, j, elem = null;
            for ( i = 0; i < template.pages.length; i++ ) {
                for ( j = 0; j < template.pages[i].elements.length; j++ ) {
                    if ( selectedElemId === template.pages[i].elements[j].elemId ) {
                        elem = template.pages[i].elements[j];
                    }
                }
            }

            //  select the chosen element
            if ( elem ) { template.raise( 'elementSelected', elem ); }

            //  reset the dropdown
            setTimeout( function() { self.allElementsDropdown( '' ); }, 100 );
        };

        self.onUnlinkButtonClicked = function() {
            var elem = self.formElement();
            self.inheritFrom( '' );
            elem.page.form.autosave( Y.dcforms.nullCallback );
        };

        //  jade template events

        /**
         *  Events to toggle global text style
         */

        self.onToggleBold = function __onToggleBold() {
            element.setProperty('isBold', !element.isBold);
            self.isBold( element.isBold );
            self.redrawElementAndSave();
        };


        self.onToggleItalic = function __onToggleItalic() {
            element.setProperty('isItalic', !element.isItalic);
            self.isItalic( element.isItalic );
            self.redrawElementAndSave();
        };


        self.onToggleUnderline = function __onToggleUnderline() {
            element.setProperty('isUnderline', !element.isUnderline);
            self.isUnderline( element.isUnderline );
            self.redrawElementAndSave();
        };

        /**
         *  Run when user presses button to clear schema binding
         */

        self.onClearElementBinding = function __onClearSchemaBindingClick() {
            self.onSchemaMemberChanged( '' );
        };

        //  initialize
        init();
    }



    /**
     *  Cache Query selectors for controls
     *
     *  Commented out as element are bound to KO
     */

    function initJqueryCache() {
        jq = {                                          //%  pre-cached cached DOM queries [object]

            divNoElementSelected: $('#divNoElementSelected'),
            divElementEditControls: $('#divElementEditControls'),

            //btnRemoveElement: $('#btnRemoveElement'),
            btnUpdateElement: $('#btnUpdateElement'),
            btnUnlinkElement: $('#btnUnlinkElement'),
            spanIsLinked: $('#spanIsLinked'),
            //divImgLoader: $('#divImgLoader'),
            taDefault: $('#taDefault'),
            divValueEditor: $('#divValueEditor'),
            divElementTip: $('#divElementTip'),
            elemImageFile: $('#elemImageFile'),
            divFormsOptions: $('#divFormsOptions'),
            spanSchemaBinding: $('#spanSchemaBinding'),
            selElemType: $('#selElemType'),
            selActType: $('#selActType'),

            aToggleColors: $('#aToggleColors'),
            iToggleColors: $('#iToggleColors'),
            tblColors: $('#tblColors'),

            txtRowSpacing: $('#txtRowSpacing'),

            aTogglePosition: $('#aTogglePosition'),
            iTogglePosition: $('#iTogglePosition'),
            tblPosition: $('#tblPosition'),

            //  reporting/insight2 related elements
            divReportingPanel: $('#divReportingPanel'),
            aToggleReporting: $('#aToggleReporting'),
            iToggleReporting: $('#iToggleReporting'),
            tblReporting: $('#tblReporting'),
            selReportingDataType: $('#selReportingDataType'),
            txtReportingDescDE: $('#txtReportingDescDE'),
            txtReportingDescEN: $('#txtReportingDescEN'),
            trReportingDescDE: $('#trReportingDescDE'),
            trReportingDescEN: $('#trReportingDescEN'),

            //divImageSelection: $('#divImageSelection'),
            //spanImageSelection: $('#spanImageSelection'),
            btnChooseElemImage: $('#btnChooseElemImage'),
            selImageEditMode: $('#selImageEditMode'),

            //trSchemaBinding: $('#trSchemaBinding'),
            //trSchemaSubtype: $('#trSchemaSubtype'),
            //trTableCell: $('#trTableCell'),
            txtBindSubType: $('#txtBindSubType'),
            selElementBinding: $('#selElementBinding'),
            //btnClearBinding: $('#btnClearBinding'),

            txtBgColor: $('#txtBgColor'),
            txtFgColor: $('#txtFgColor'),
            txtBorderColor: $('#txtBorderColor'),

            txtElemId: $('#txtElemId'),

            selFont: $('#selFont'),

            chkReadOnly: $('#chkReadOnly'),
            chkElemBFB: $('#chkElemBFB'),
            chkAlignGrid: $('#chkAlignGrid'),
            chkClipOverflow: $('#chkClipOverflow'),
            chkNotEmpty: $('#chkNotEmpty'),

            divCbReporting: $('#divCbReporting'),
            chkUseInReporting: $('#chkUseInReporting'),
            chkNoCopyOver: $('#chkNoCopyOver')
        };
    }



    /**
     *  Configure this form to loaded element type and (re)bind events
     */

    function initPanel() {
        var
            jqTemp,
            k;

        /*
         *  Initialize helper widgets if necessary
         */

        //userLang = template.userLang;
        valueType = element ? element.getValueType() : 'none';

        /*
         *  Initialize controls
         */

        jq.divFormsOptions.show();
        jq.taDefault.hide();
        //jq.divImgLoader.hide();
        //jq.divImageSelection.hide();
        jq.btnChooseElemImage.hide();

        //  attach event listeners (first removing any previous listener)
        jq.btnUpdateElement.off('click.forms').on('click.forms', updateElement);
        //jq.btnRemoveElement.off('click.forms').on('click.forms', removeElement);
        //jq.btnUnlinkElement.off('click.forms').on('click.forms', onUnlinkClick);

        jq.chkReadOnly.off('click.forms').on('click.forms', function() {
            updateElement('chkReadOnly');
        });

        jq.chkClipOverflow.off('click.forms').on('click.forms', function(){
            updateElement('chkClipOverflow');
        });

        jq.chkElemBFB.off('click.forms').on('click.forms', function(){
            updateElement('chkElemBFB');
        });

        jq.chkAlignGrid.on('click.forms', function(){ updateElement('chkAlignGrid'); });

        jq.chkNotEmpty.off('click.forms').on('click.forms', function(){
            updateElement('chkNotEmpty');
        });

        jq.chkUseInReporting.off('click.forms').on('click.forms', function(){
            updateElement('chkUseInReporting');
        });

        jq.chkNoCopyOver.off('click.forms').on('click.forms', function(){
            updateElement('chkNoCopyOver');
        });

        //  reporting properties
        jq.selReportingDataType.off('change.forms').on('change.forms', function(){
            updateElement('selReportingDataType');
        });

        jq.txtReportingDescDE.off('change.forms').on('change.forms', function(){
            updateElement('txtReportingDescDE');
        });

        jq.txtReportingDescEN.off('change.forms').on('change.forms', function(){
            updateElement('txtReportingDescEN');
        });

        jq.txtRowSpacing.off('change.forms').on('change.forms', function(){
            updateElement('txtRowSpacing');
        });

        //  add event listener for toggling sub-pannels
        jq.aToggleColors.off('click.forms').on('click.forms', onToggleColors);
        jq.aTogglePosition.off('click.forms').on('click.forms', onTogglePosition);
        jq.aToggleReporting.off('click.forms').on('click.forms', onToggleReporting);

        Y.doccirrus.media.fonts.addToSelect( jq.selFont, '' );

        //  attach event handlers to input elements
        function makeUpdateFn(domId) {
            return function() { updateElement(domId); };
        }

        for (k in dataBinding) {
            if (dataBinding.hasOwnProperty(k)) {
                //	reset any existing handler
                jqTemp = $('#' + k);
                jqTemp.off('keyup.forms').on('keyup.forms', makeUpdateFn(k));
                jqTemp.off('change.forms').on('change.forms', makeUpdateFn(k));
            }
        }

        checkReportingStatus();
        updateTypeSelection();
        initValueEditor();

        /*
         *  Note data binding to schema, if any
         */

        updateSchemaBinding();
    }




    //  show or hide reporting/inSight options
    function checkReportingStatus() {
        var userLang = template.userLang;

        if ( !template || !element ) { return; }
        if ( template.useReporting ) {
            jq.divCbReporting.show();

            if ( element.useInReporting ) {
                jq.divReportingPanel.show();
            } else {
                jq.divReportingPanel.hide();
            }

        } else {
            jq.divReportingPanel.hide();
            jq.divCbReporting.hide();
        }

        switch( userLang ) {
            case 'en':
                jq.trReportingDescDE.hide();
                jq.trReportingDescEN.show();
                break;
            default:
                jq.trReportingDescDE.show();
                jq.trReportingDescEN.hide();
        }

    }

    /**
     *  Register this panel to receive events from the form template
     */

    function registerEventHandlers() {
        var k;
        Y.log('Registering events for edit_element_basic', 'debug', NAME);
        for (k in eventHandlers) {
            if (eventHandlers.hasOwnProperty(k)) {
                //Y.log('Register event ' + k + ' to ' + 'edit_element_basic', 'debug', NAME);
                template.on(k, 'edit_element_basic', eventHandlers[k]);
            }
        }
    }

    /**
     *  Deregister this panel from the template
     */

    function deregisterEventHandlers() {
        if (!template) { return; }
        template.off('*', 'edit_element_basic');
    }

    /**
     *  (Re)Initialize and render component to edit values of the type used by this element
     *
     *  TODO: manage this with KO
     *
     *  Assumes that valueType is already set
     */

    function initValueEditor() {

        if (!element) {
            jq.divValueEditor.hide();
            return;
        }

        //  check if already initialized for this element
        //  TODO: move all this logic to KO viewmodel above
        if ( specializedTypeEditor && specializedTypeEditor.element.elemId === element.elemId ) {
            return;
        }

        var displayValue = makeDisplayValue(element.getValue());

        valueType = element.getValueType();

        //  Dispose any open value type editor for any different element
        if ( specializedTypeEditor ) {
            specializedTypeEditor.dispose();
            specializedTypeEditor = null;
        }

        //  Table specific properties
        /*
        if ( 'reporttable' === valueType ) {
            jq.txtRowSpacing.val( element.table.rowSpacing );             //  TODO: fix
            jq.trTableCell.show();
        } else {
            jq.trTableCell.hide();
        }
        */

        //  Set the tooltip and load any additional controls
        switch(valueType) {
            case 'list':
                listEditor = Y.dcforms.elements.listEditor('divValueEditor', displayValue, onListChanged);
                listEditor.render();
                jq.divValueEditor.show();
                break;

            case 'boolean':
                booleanEditor = Y.dcforms.elements.booleanEditor('divValueEditor', displayValue, element, onBooleanChanged);
                booleanEditor.render();
                jq.divValueEditor.show();
                break;

            case 'barcode':
                barcodeEditor = Y.dcforms.elements.barcodeEditor(
                    'divValueEditor',
                    {
                        'code': displayValue,
                        'type': element.display,
                        'options': element.extra
                    },
                    onBarcodeChanged
                );
                barcodeEditor.render();
                jq.divValueEditor.show();
                break;

            case 'audio':
                jq.divValueEditor.show();
                break;

            case 'date':
                dateEditor = Y.dcforms.elements.dateEditor('divValueEditor', displayValue, onDateChanged);
                dateEditor.setFormat(element.extra);
                dateEditor.render();
                jq.divValueEditor.show();
                break;

            case 'hyperlink':
                hyperlinkEditor = Y.dcforms.elements.hyperlinkEditor('divValueEditor', displayValue, element, onHyperlinkChanged);
                hyperlinkEditor.render();
                jq.divValueEditor.show();
                break;

            case 'image':
                specializedTypeEditor = Y.dcforms.elements.imageEditor('divValueEditor', element );
                specializedTypeEditor.render( function() { jq.divValueEditor.show(); } );

                //  no point in binding images to a schema?
                //jq.trSchemaBinding.hide();
                break;

            case 'table':
            case 'meddatatable':
                //  show empty value editor - KO model will make the new editor visible
                jq.divValueEditor.html( '' );
                jq.divValueEditor.show();
                break;

            case 'reporttable':
                reportTableEditor = Y.dcforms.elements.reportTableEditor(
                    'divValueEditor',
                    {
                        'preset': displayValue,
                        'extra': element.extra || ''
                    },
                    onReportTableChanged
                );
                reportTableEditor.render();
                jq.divValueEditor.show();
                break;

            case 'contacttable':
            case 'labdatatable':
                labdataTableEditor = Y.dcforms.elements.labdataTableEditor( 'divValueEditor', { extra: element.extra }, element, onLabdataTableChanged );
                labdataTableEditor.render();
                jq.divValueEditor.show();
                break;

            case 'subform':
                subformEditor = Y.dcforms.elements.subformEditor('divValueEditor', displayValue, onSubformChanged);
                subformEditor.render();
                jq.divValueEditor.show();
                break;

            case 'chartmd':
                subformEditor = Y.dcforms.elements.chartMdEditor('divValueEditor', element, onChartMDChanged);
                subformEditor.render();
                jq.divValueEditor.show();
                break;
        }

        //  If element is bound, show the binding
        if (('' !== element.schemaMember) && ('image' !== valueType) && ('table' !== valueType)) {
            jq.divValueEditor.append('<br/>bound: ' + element.schemaMember);
        }
    }

    /**
     *  Fill this form with values from dcforms-element object
     */

    function updatePanelFromElement() {
        if (!element || 'edit' !== template.mode) { return; }
        //Y.log('Setting formvalues from dcforms-element');

        var k,
            jqMap;

        valueType = element.getValueType();

        for (k in dataBinding) {
            if (dataBinding.hasOwnProperty(k)) {
                //Y.log('Setting: k => ' + dataBinding[k], 'debug', 'edit_element_basic');
                if ('' !== dataBinding[k]) {
                    jqMap = $('#' + k);
                    jqMap.val(element.getProperty(dataBinding[k]));
                }
            }
        }

        //  re-initialize this if element type is changed
        //editElementBasicVM.valueType( valueType )
        //editElementBasicVM.elemType( element.elemType );

        //  show unlink button if this element inherits its value from another
        if ('' === element.inheritFrom) {
            jq.btnUnlinkElement.hide();
            jq.spanIsLinked.hide();
        } else {
            jq.btnUnlinkElement.show();
            jq.spanIsLinked.show();
        }

        jq.chkReadOnly.prop('checked', (element.readonly === true || element.readonly === 'true'));
        jq.chkElemBFB.prop('checked', (element.isBFB === true || element.isBFB === 'true'));
        jq.chkAlignGrid.prop('checked', element.snapToGrid);
        jq.chkClipOverflow.prop('checked', element.clipOverflow);
        jq.chkNotEmpty.prop('checked', element.validate.notEmpty);
        jq.chkNoCopyOver.prop('checked', element.noCopyOver);
        jq.chkUseInReporting.prop('checked', element.useInReporting);

        updateSchemaBinding();
        updateReportingPanel();

        updateMinicolors( jq.txtFgColor, element.fgColor );
        updateMinicolors( jq.txtBgColor, element.bgColor );
        updateMinicolors( jq.txtBorderColor, element.borderColor );

        if (('text' === valueType) && (textEditor)) {
            //Y.log('new default value ' + userLang + ': ' + element.defaultValue[userLang]);
            textEditor.setValue(makeDisplayValue(element.getValue()));
        }

        if (('list' === valueType) && (listEditor)) {
            listEditor.setDefault(element.display);
        }

        if (('boolean' === valueType) && (booleanEditor)) {
            booleanEditor.setValue(makeDisplayValue(element.getValue()));
        }

        if (('barcode' === valueType) && (barcodeEditor)) {
            barcodeEditor.setValue(makeDisplayValue(element.getValue()));
        }

        if (('hyperlink' === valueType) && (hyperlinkEditor)) {
            hyperlinkEditor.setValue(makeDisplayValue(element.getValue()));
        }

        if (('reporttable' === valueType) && (reportTableEditor)) {
            reportTableEditor.setValue(makeDisplayValue(element.getValue()));
            jq.txtRowSpacing.val( element.table.rowSpacing );
        }

        if ( 'table' === valueType ) {
            jq.txtRowSpacing.val( element.table.rowSpacing );
        }
    }

    /**
     *  Update dc-element object when this form changes
     *
     *  @param  key     {String}    DOM ID of a form element, key to dataBinding
     */

    function updateElement(key) {
        //  relocated from element.onEditForm

        if (!element) {
            //Y.log('Cannot update element, no element selected.', 'warn', NAME);
            return;
        }

        var
            dirty = false,
            validationTemp,
            k = '';                             //  for iterating over binding [string]

        //  check that current selected element is the same which last filled the form
        if ($('#hdnDomId').val() !== element.domId) {
            Y.log('Element properties form bound to wrong element: ' + $('#hdnDomId').val() + ' !== ' + element.domId, 'warn', NAME);
            return;
        }

        //  update all properties if no single property given
        if (!key || ('' === key)) {
            for (k in dataBinding) {
                if (dataBinding.hasOwnProperty(k)) {
                    updateElement(k);
                }
            }
            return;
        }

        //  font height cannot be greater than element height
        if ('txtScaleHeight' === key) {
            validationTemp = parseFloat($('#' + key).val());
            if (element.mm.lineHeight > validationTemp) {
                element.mm.lineHeight = validationTemp;
                $('#txtScaleFont').val(validationTemp);
            }
        }

        //  update a single property
        if (dataBinding.hasOwnProperty(key)) {


            validationTemp = $('#' + key).val();

            if (numberElements.hasOwnProperty(key)) {
                //  number element, sanity check it
                validationTemp = parseFloat(validationTemp);
                if (isNaN(validationTemp) || (validationTemp < 0)) {
                    //  don't update this is invalid
                    return;
                }
            }

            dirty = (element.getProperty(dataBinding[key]) !== validationTemp);
            element.setProperty(dataBinding[key], validationTemp);
            //element[dataBinding[key]] = validationTemp;
        }

        switch( key ) {
            case 'chkReadOnly':
                element.readonly = jq.chkReadOnly.prop('checked');
                if ('true' === element.readonly) { element.readonly = true; }
                dirty = true;
                break;

            case 'chkElemBFB':
                element.isBFB = jq.chkElemBFB.prop('checked');
                if ('true' === element.isBFB) { element.isBFB = true; }
                dirty = true;
                break;

            case 'chkAlignGrid':
                element.snapToGrid = jq.chkAlignGrid.prop('checked');
                if ('true' === element.snapToGrid) { element.snapToGrid = true; }
                dirty = true;
                break;

            case 'chkClipOverflow':
                element.clipOverflow = jq.chkClipOverflow.prop('checked');
                if ('true' === element.clipOverflow) { element.clipOverflow = true; }
                dirty = true;
                break;

            case 'chkNotEmpty':
                element.validate.notEmpty = jq.chkNotEmpty.prop('checked');
                if ('true' === element.validate.notEmpty) { element.validate.notEmpty = true; }
                dirty = true;
                break;

            case 'chkUseInReporting':
                element.useInReporting = jq.chkUseInReporting.prop('checked');
                checkReportingStatus();
                dirty = true;
                break;

            case 'chkNoCopyOver':
                element.noCopyOver = jq.chkNoCopyOver.prop('checked');
                if ( 'true' === element.noCopyOver ) { element.noCopyOver = true; }
                dirty = true;
                break;

            case 'txtScaleFont':
                //  changing font size may have caused implicit resize of element
                $('#txtScaleHeight').val(element.mm.height);
                break;

            case 'selReportingDataType':
                element.reportingType = jq.selReportingDataType.val();
                dirty = true;
                break;

            case 'txtReportingDescDE':
                element.reportingLabel.de = jq.txtReportingDescDE.val();
                dirty = true;
                break;

            case 'txtReportingDescEN':
                element.reportingLabel.en = jq.txtReportingDescEN.val();
                dirty = true;
                break;

            //case 'txtRowSpacing':
            //    element.table.rowSpacing = parseFloat( jq.txtRowSpacing.val() );
            //    dirty = true;
            //    break;
        }

        if (true === dirty) {
            if (element.renderer.update) {
                element.renderer.update(Y.dcforms.nullCallback);
            }
            element.isDirty = true;
            element.page.redrawDirty();
            element.page.form.autosave();
        }

        if (template) {
            //element.onEditForm();
            Y.log('Updating element from properties pane.', 'debug', NAME);
            template.render(Y.dcforms.nullCallback);

            if (template.valueEditor) {
                template.valueEditor.reposition();
            }
        }
    }

    /**
     *  Make editable plaintext from a default value
     */

    function makeDisplayValue(txt) {
        if (!txt) { txt = ''; }
        if ('string' !== typeof txt) { txt = txt.toString(); }
        txt = txt.replace(new RegExp('<br>', 'g'), "\n");
        txt = txt.replace(new RegExp('<br/>', 'g'), "\n");
        txt = txt.replace(new RegExp('{{newline}}', 'g'), "\n");
        txt = txt.replace(new RegExp('/<(?:.|\n)*?>/', 'gm'), '');          //  eslint-disable-line no-control-regex
        return txt;
    }

    /**
     *  Show / update the schema select elements
     */

    function updateSchemaBinding() {

        if (!element) {
            //  no element yet selected, no schema to show
            return;
        }

    }

    /**
     *  Cause a minicol event to update and be updated by a text input
     *  MOJ-8938 rewrite to minicolor v2.2.6, standardize with other color pickers across mojits

     *  @param  jqCacheTxt  {object}    jQuery selector for a text input element
     *  @param  key         {string}    Field to update on element
     */

    function linkMinicolor(jqCacheTxt, key ) {

        jqCacheTxt.minicolors(
            'create',
            {
                'opacity': true,
                'theme': 'bootstrap',
                'swatchPosition': 'left',
                'format': 'rgb',
                'change': function onChangeMC() {
                    updateElement(key);
                }
            }
        );
    }

    /**
     *  Update a minicol from linked text box
     *
     *  @param  jqCacheTxt  {Object}    jQuery selector for a text input element
     *  @param  newValue    {String}    Should be valid rgba color
     */

    function updateMinicolors( jqCacheTxt, newValue ) {
        Y.log('NOT Updating minicol from text input: ' + newValue, 'debug', NAME);
        if ( !newValue ) { return false; }
        jqCacheTxt.minicolors( 'value', newValue );
    }

    /**
     *  Sets which members of the 'element type' dropdown are visible - elements may only change type to those in
     *  the same group.
     */

    function updateTypeSelection() {
        var k, i, jqOpt;

        for (k in elementTypes) {
            if (elementTypes.hasOwnProperty(k)) {

                for (i = 0; i < elementTypes[k].length; i++) {
                    jqOpt = $('#optElement' + elementTypes[k][i]);

                    if (k === valueType) {
                        jqOpt.show();
                    } else {
                        jqOpt.hide();
                    }

                }

            }
        }
    }

    /**
     *  Set values in reporting panel from element
     */

    function updateReportingPanel() {
        jq.selReportingDataType.val( element.reportingType );
        jq.txtReportingDescDE.val( element.reportingLabel.de );
        jq.txtReportingDescEN.val( element.reportingLabel.en );
    }

    /**
     *  Used to declutter large panels of controls
     *
     *  @param  icon    {Object}    jQuery reference to plus/minus fa icon showing toggle state
     *  @param  panel   {Object}   jQuery reference to Dom ID of the panel element to show or hide
     */

    function toggleSubPanel(icon, panel) {
        if(panel.css('display') === 'none') {
            icon.removeClass('fa-plus');
            icon.addClass('fa-minus');
            panel.show();
        } else {
            icon.removeClass('fa-minus');
            icon.addClass('fa-plus');
            panel.hide();
        }
    }

    /**
     *  Make a list of elements in the current template
     */

    function updateElementSelect() {
        var
            newSelect,
            newOpt,
            tempElem,
            i, j;

        jq.divNoElementSelected.html('');

        if (!template) {
            //  no form loaded, just clear the div
            return;
        }

        newSelect = $('<select id="selChooseUnselectedElement" class="form-control">');
        newSelect.append('<option value=""></option>');

        /*
        var temp = '', px;

        temp = temp +
            'form: ' + template.paper.width + 'x' + template.paper.height + "\n" +
            'page 0:' + template.pages[0].canvasElastic.width + 'x' + template.pages[0].canvasElastic.height +  "\n" +
            'content height: ' + template.pages[0].getAbstractHeight() + 'mm' + "\n\n";
        */

        for (i = 0 ; i < template.pages.length; i++) {
            for (j = 0; j < template.pages[i].elements.length; j++) {
                tempElem = template.pages[i].elements[j];
                newOpt = $('<option value="' + tempElem.elemId + '"></option>');
                newOpt.html(tempElem.elemId + ' (' + tempElem.elemType + ')');
                newSelect.append(newOpt);

                /*
                px = tempElem.mm.toScale(template.zoom);

                temp = temp + tempElem.elemId + "\n" +
                    ' (mm) ' + tempElem.mm.left + ',' + tempElem.mm.top + ' ' +
                    tempElem.mm.width + 'x' + tempElem.mm.height + ' ' + "\n" +
                    ' (px) ' + px.left + ',' + px.top + ' ' +
                    px.width + 'x' + px.height + "\n";
                */
            }
        }


        jq.divNoElementSelected.append(newSelect);
        //jq.divNoElementSelected.append('<pre>' + temp + '</pre>');
        //console.log(temp);

        newSelect.off('change').on('change', function() {
            for (i = 0 ; i < template.pages.length; i++) {
                for (j = 0; j < template.pages[i].elements.length; j++) {
                    tempElem = template.pages[i].elements[j];
                    if (tempElem.elemId === newSelect.val()) {
                        onElementSelected(tempElem);
                    }
                }
            }

        });

    }

    //  EVENT HANDLERS

    function onTogglePosition() {
        template.render(Y.dcforms.nullCallback);
        toggleSubPanel(jq.iTogglePosition, jq.tblPosition);
    }

    function onToggleColors() {
        toggleSubPanel(jq.iToggleColors, jq.tblColors);
    }

    function onToggleReporting() {
        toggleSubPanel(jq.iToggleReporting, jq.tblReporting);
    }

    /**
     *  Called by template when user selects an element
     *
     *  @param elem {Object}    A dcforms-element object
     */

    function onElementSelected(elem) {
        if ('edit' !== template.mode) {
            return;
        }

        if (!elem || '' === elem) {
            Y.log('Element deselected: ' + (element ? element.elemId : ''), 'debug', NAME);
            element = null;
            return;
        }

        element = elem;

        $( '#hdnDomId' ).val( element.domId );
        updatePanelFromElement();
        initValueEditor();
        updateTypeSelection();
        checkReportingStatus();
        updateReportingPanel();

        jq.selElemType.val(element.elemType);
        jq.selElemType.change(onElemTypeChanged);

    }

    //  stubs, may need custom handler in future

    function onValueChanged() {
        Y.log('received valueChanged event from element', 'debug', NAME);
        updatePanelFromElement();
    }

    /**
     *  Raised when a user changes the value of a hyperlink element
     */

    function onHyperlinkChanged( txtValue, toUrl ) {
        element.extra = toUrl;

        element.setValue( txtValue, Y.dcforms.nullCallback );

        if (
            ( element.page.form.valueEditor ) &&
            ( element.page.form.selectedElement ) &&
            ( element.page.form.selectedElement .elemId === element.elemId )
        ) {
            element.page.form.valueEditor.setValue( txtValue );
        }

        element.isDirty = true;
        element.page.form.raise( 'valueChanged', element );
        element.page.redrawDirty();
    }

    /**
     *  Raised when a user edits a complex value for lists (add, remove, reposition a list item)
     */

    function onListChanged(txtList) {
        element.defaultValue[element.getCurrentLang()] = txtList;
        element.display = listEditor.getSelectedValue();
        element.setValue(txtList, Y.dcforms.nullCallback);
        element.isDirty = true;
        element.page.redrawDirty();

        if (element.page.form.valueEditor) {
            element.page.form.valueEditor.destroy();
            element.page.form.valueEditor = null;
        }
    }

    /**
     *  Raised when a user updates a date element definition
     */

    function onDateChanged(defaultValue, dateFormat) {
        element.defaultValue[element.getCurrentLang()] = defaultValue;
        element.extra = dateFormat;
        element.setValue(defaultValue, Y.dcforms.nullCallback);
        //element.page.form.raise('valueChanged', element);
        element.isDirty = true;
        element.page.redrawDirty();
    }

    /**
     *  Raised when a user changes the value of a checkbox
     *  @param  txtCheckbox {String}    Checkbox value and label in legacy format
     *  @param  spriteSize  {String}    New property as of MOJ-3489 to display fixed-size checkbox graphics
     */

    function onBooleanChanged(txtCheckbox) {
        //Y.log('Set checkbox default value (' + userLang + ') from booleditor: ' + txtCheckbox);
        element.defaultValue[element.getCurrentLang()] = txtCheckbox;
        element.display = booleanEditor.isChecked();
        element.setValue(txtCheckbox, Y.dcforms.nullCallback);
        element.page.form.raise('valueChanged', element);
        element.isDirty = true;
        element.page.redrawDirty();
    }

    /**
     *  Raised when a user changes the value of a checkbox
     *  @param  txtValue    {String}    Checkbox value and label in legacy format
     *  @param  txtType     {String}    New property as of MOJ-3489 to display fixed-size checkbox graphics
     */

    function onBarcodeChanged(txtValue, txtType, txtOpts, resetSize) {
        //Y.log('Set checkbox default value (' + userLang + ') from booleditor: ' + txtCheckbox);

        if (resetSize) {
            $('#txtScaleWidth').val('30.988');
            updateElement('txtScaleWidth');
            //element.setProperty('width', 30.988);
        }

        element.defaultValue[element.getCurrentLang()] = txtValue;
        element.display = txtType;
        element.extra = txtOpts;
        element.setValue(txtValue, Y.dcforms.nullCallback);

        element.page.form.raise('valueChanged', element);
        element.isDirty = true;
        element.page.redrawDirty();
    }

    /**
     *  Raised when a user changes the configuration of an insight2 report table
     *  @param  presetid    {String}    Checkbox value and label in legacy format
     *  @param  extra       {String}    New property as of MOJ-3489 to display fixed-size checkbox graphics
     */

    function onReportTableChanged( presetId, extra ) {
        Y.log('Set reporttable default value (' + element.getCurrentLang() + ') from reporttableeditor: ' + presetId + ' extra: ' + extra, 'debug', NAME );

        element.extra = extra;
        element.defaultValue[element.getCurrentLang()] = presetId;
        element.setValue( presetId, Y.dcforms.nullCallback );

        element.page.form.raise( 'valueChanged', element );
        element.isDirty = true;
        element.page.redrawDirty();
    }

    /**
     *  Raised when a user changes the configuration of a labdata table, stub for now
     */

    function onLabdataTableChanged() {
        element.renderer.update( function() {
            element.isDirty = true;
            element.page.form.raise( 'valueChanged', element );
            element.page.form.render( Y.dcforms.nullCallback );
        } );
    }

    /**
     *  Raised when an embedded subform link has been modified
     */

    function onSubformChanged(newSubform) {
        if( Y.config.debug ) {
            Y.log('Subform link changed: ' + JSON.stringify(newSubform, undefined, 2), 'info', NAME);
        }

        function onSubformLoaded() {
            element.isDirty = true;
            element.page.redrawDirty();
            element.page.form.autosave();
            element.page.form.render( Y.dcforms.nullCallback );

            //  suspect, TODO: see if this can be removed
            window.setTimeout(function() {
                element.isDirty = true;
                element.page.redrawDirty();
            }, 1000);
        }

        element.defaultValue[element.getCurrentLang()] = newSubform;
        element.setValue( newSubform, onSubformLoaded );
    }

    /**
     *  Raised when a user changes the value of a chart type element
     *  Note that these update the element renderer directly, rather than through this callback
     */

    function onChartMDChanged( /*txtValue, maxLen */ ) {
        element.isDirty = true;
        element.page.form.raise( 'valueChanged', element );
        element.page.redrawDirty();
    }

    /**
     *  Element type changed from dropdown
     *  Only compatible data types should be selected
     */

    function onElemTypeChanged() {


    }

    /**
     *  Language changed from switcher on debug menu
     */

    function onChangeUserLang() {
        //userLang = template.userLang;
        if (element && element.renderer && element.renderer.update) {
            element.renderer.update(Y.dcforms.nullCallback);
        }

        initPanel();
    }

    /**
     *  Event handler, called when user selects a form in the tree at left
     *  @param instanceId
     */

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            initJqueryCache();

            /*
             *  recover any dcforms-element reference which was passed to this
             */

            if (('undefined' !== node.passToBinder) && ('undefined' !== node.passToBinder.template)) {
                template = node.passToBinder.template;
            } else {
                jq.divNoElementSelected.html('');
            }

            //  remove any existing handlers registered to this control
            deregisterEventHandlers();
            //  create new event handlers
            registerEventHandlers();

            /*
             *  load values from them element
             */

            initPanel();

            /*
             *  Add color pickers
             */

            linkMinicolor( jq.txtFgColor, 'fgColor' );
            linkMinicolor( jq.txtBgColor, 'bgColor' );
            linkMinicolor( jq.txtBorderColor, 'borderColor' );

            editElementBasicVM = new EditElementBasicVM();

            ko.applyBindings( editElementBasicVM, document.querySelector( '#divFormElementEditor' ) );
        },

        deregisterNode: function( node ) {
            Y.log('deregister node for forms_editor.js - ' + node.getAttribute('id'), 'debug', NAME);

            /*
             *  De-register update event on the element
             */

            deregisterEventHandlers();

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screws up future use of this DOM node, which we might need
            //node.destroy();
        }
    };

}
