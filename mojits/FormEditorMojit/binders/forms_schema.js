/**
 *  jadeLoaded panel to view and set schema binding in form editor
 *
 *  @author: strix
 *
 *  Copyright (c) 2012 Doc Cirrus GmbH all rights reserved.
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*eslint-disable prefer-template */
/*exported _fn */
/*global $, ko */

function _fn(Y, NAME) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        template,
        formSchemaPropertiesVM;

    function FormSchemaPropertiesVM() {
        var
            self = this;

        //  PUBLIC METHODS

        /**
         *  Set up observables and event handlers
         */

        self.init = function _init() {
            //  licences  TODO: implement
            self.hasCardioLicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.CARDIO );
            self.hasDOQUVIDELicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DOQUVIDE );
            self.hasDQSLicense = Y.doccirrus.auth.hasSpecialModule( Y.doccirrus.schemas.settings.specialModuleKinds.DQS );
            self.hasSpecialLicense = ( self.hasCardioLicense || self.hasDOQUVIDELicense || self.hasDQSLicense );

            //  labels
            self.LBL_NO_EDITOR = i18n( 'FormEditorMojit.schema_panel.LBL_NO_EDITOR' );

            //  observables
            self.schemaName = ko.observable();
            self.schemaVersion = ko.observable();
            self.schemaMapper = ko.observable();
            self.allSchemaMembers = ko.observableArray();
            self.filterText = ko.observable( '' );
            self.valueEditor = ko.observable();
            self.lang = ko.observable( template ? template.userLang : 'de' );

            //  computeds
            self.hasSchema = ko.computed( function() {
                return self.schemaName && '' !== self.schemaName();
            } );

            self.hasNoSchema = ko.computed( function() {
                return !self.hasSchema();
            } );

            self.hasNoValueEditor = ko.computed( function() {
                return self.valueEditor() ? false : true;
            } );

            //  ko events
            self.updateFilterListener = self.filterText.subscribe( function( newVal ) {
                self.updateFilter( newVal );
            } );

            //  template events
            template.on('schemaSet', 'forms_schema', onSchemaSet );
            template.on('elementSelected', 'forms_schema', onElementSelected );
            template.on('pageSelected', 'forms_schema', onPageSelected );
        };

        /**
         *  Clean up
         */

        self.dispose = function() {
            var allSchemaMembers = self.allSchemaMembers(), i;

            //  Remove the 'isVisible' observables from the schema embers
            self.allSchemaMembers( [] );
            for ( i = 0; i < allSchemaMembers.length; i++ ) {
                delete allSchemaMembers[i].isVisible;
            }

            self.updateFilterListener.dispose();
        };

        /**
         *  Show/hide buttons according to text in filter box
         *
         *  @param  {String}    filterTxt
         */

        self.updateFilter = function _updateFilter( filterTxt ) {

            var
                allSchemaMembers = self.allSchemaMembers(),
                i, isHidden;

            filterTxt = $.trim(filterTxt);

            for (i = 0; i < allSchemaMembers.length; i++ ) {

                isHidden = true;

                if ( '' === filterTxt ) {

                    //  empty search, everything visible
                    isHidden = false;

                } else {

                    //  search in schemaName, en and de labels

                    if ( self.filterMatch( filterTxt, allSchemaMembers[i].memberName ) ) {
                        isHidden = false;
                    }

                    if ( self.filterMatch( filterTxt, allSchemaMembers[i].label.de ) ) {
                        isHidden = false;
                    }

                    if ( self.filterMatch( filterTxt, allSchemaMembers[i].label.en ) ) {
                        isHidden = false;
                    }
                }

                allSchemaMembers[i].isVisible( !isHidden );
            }
        };

        /**
         *  Simple filter on text with more than one clause
         *
         *  @param query
         *  @param text
         *  @return {boolean}
         */

        self.filterMatch = function _filterMatch( query, text ) {
            var
                parts = query.toLowerCase().split( ' ' ),
                matchText = text.replace( new RegExp(' ', 'g'), '' ).toLowerCase(),
                matchAll = true,
                i;

            if ( '' === text ) {
                return true;
            }

            for ( i = 0; i < parts.length; i++ ) {
                if ( '' !== parts[i] ) {
                    if ( -1 === matchText.indexOf( parts[i] ) ) {
                        matchAll = false;
                    }
                }
            }

            return matchAll;
        };

        /**
         *  Load a reduced schema into the panel
         *  @param schemaName
         */

        self.loadSchema = function _loadSchema( schemaName ) {
            var
                schema = Y.dcforms.reducedschema.loadSync( schemaName ),
                allSchemaMembers = [],
                k;

            self.schemaName( schemaName );

            if ( !schema ) {
                self.allSchemaMembers( [] );
                return;
            }

            self.schemaVersion( schema.version ? schema.version : 1 );
            self.schemaMapper( schema.mapper ? schema.mapper : '(none)' );

            for (k in schema) {
                if (schema.hasOwnProperty(k)) {
                    if ('version' !== k && 'mapper' !== k) {

                        schema[k].memberName = k;

                        schema[k].isVisible = ko.observable( true );
                        allSchemaMembers.push( schema[k] );

                        schema[k].label = schema[k].label ? schema[k].label : {};
                        schema[k].label.de = schema[k].label.de ? schema[k].label.de : 'TRANSLATEME';
                        schema[k].label.en = schema[k].label.en ? schema[k].label.en : 'TRANSLATEME';
                    }
                }
            }

            self.allSchemaMembers( allSchemaMembers );
            self.updateFilter( self.filterText() );
        };

        /**
         *  Translation of schema labels
         *  @param schemaMember
         *  @return {*}
         */

        self.getLabel = function( schemaMember ) {
            return 'de' === template.userLang ? schemaMember.label.de : schemaMember.label.en;
        };

        //  EVENT HANDLERS

        /**
         *  Raised by form template when schema is changed, eg from the form property panel
         *  @param newSchemaName
         */

        function onSchemaSet(newSchemaName) {
            self.loadSchema( newSchemaName );
        }

        /**
         *  When an element is selected in the form, check if it has a value editor we can inject into
         */

        function onElementSelected( /* element */) {
            self.valueEditor( template.valueEditor && template.valueEditor.inject ? template.valueEditor : null );
        }

        /**
         *  This event is raised after the user clicks awau from an element
         */

        function onPageSelected( /* page */ ) {
            self.valueEditor( template.valueEditor && template.valueEditor.inject ? template.valueEditor : null );
        }

        /**
         *  Raised by KO when a schema member is clicked
         */

        self.onButtonClick = function( schemaMember ) {
            if ( !template || !template.valueEditor || !template.valueEditor.inject ) { return; }
            template.valueEditor.inject( '{{' + self.schemaName() + '.' + schemaMember.memberName + '}}' );
        };

        return self;
    }

    return {

        /**
         * Default function to setup -- automatically used by Jade Loader
         *
         * @param node  NB: The node MUST have an   id   attribute.
         */

        registerNode: function( node ) {

            //  PRIVATE VARS

            var schemaName = 'InCase_T';

            //  INITIALIZATION

            /**
             *  Set up viewmodel
             */

            //  read any configuration passed by parent binder

            if (node.passToBinder) {
                if (node.passToBinder.hasOwnProperty('template')) {
                    template = node.passToBinder.template;
                    schemaName = template.reducedSchema;
                }
            }

            try {

                formSchemaPropertiesVM = new FormSchemaPropertiesVM();
                formSchemaPropertiesVM.init();

                if ( schemaName ) {
                    formSchemaPropertiesVM.loadSchema( schemaName );
                }

                ko.applyBindings( formSchemaPropertiesVM, document.querySelector( '#divSchemaAssignment' ) );

            } catch ( err ) {

                Y.log( 'Error initializing schema panel: ' + JSON.stringify( err ), 'error', NAME );

            }

        },

        deregisterNode: function( node ) {
            Y.log('deregister node for forms_schema.js - ' + node.getAttribute('id'), 'debug', NAME);

            if (template) {
                template.off('*', 'forms_schema');
            }

            if ( formSchemaPropertiesVM ) {
                formSchemaPropertiesVM.dispose();
            }

            // SHOULD call destroy() -- deletes all internals and event listeners in the node, w/o removing the node.
            // Beware that doing this screws up future use of this DOM node, which we might need
            //node.destroy();
        }
    };

}