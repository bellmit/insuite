/*
 *  Binder for test form load without REST calls
 *
 *  In this test all form dependencies should be packaged and sent along with the page
 */

/*jslint anon:true, sloppy:true, nomen:true, latedef:false */
/*global YUI, $ */

'use strict';

YUI.add('TestingMojitBinderFormIsolationTest', function(Y, NAME) {
        /**
         * The TestingMojitBinderFormIsolationTest module.
         *
         * @module TestingMojitBinderFormIsolationTest
         */


        Y.log('YUI.add TestingMojitBinderFormIsolationTest with NAMEs ' + NAME, 'info');


        /**
         * Constructor for the TestingMojitBinderFormIsolationTest class.
         *
         * @class testingMojitBinderIndex
         * @constructor
         */

        Y.namespace('mojito.binders')[NAME] = {

            //  Form properties

            canonicalId: '',
            versionId: '',
            template: null,

            //  Cached jQuery references
            jq: null,

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function(mojitProxy) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *	The binder method, invoked to allow the mojit to attach DOM event
             *	handlers.
             *
             *	@param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function(node) {
                var self = this;

                self.jq = {
                    btnLoadForm: $( '#btnLoadForm' ),
                    txtFormId: $( '#txtFormId' ),
                    divFormData: $( '#divFormData' ),
                    divNoFormSpecified: $( '#divNoFormSpecified' )
                };

                this.node = node;

                //  attach event handlers
                self.jq.btnLoadForm.on( 'click' , function __onBtnLoadForm() {
                    self.requestFormFromServer( self.jq.txtFormId.val() );
                } );

                //  check for data in hidden div
                self.loadFormData();

                //  check if we have a form
                if ( !self.canonicalId || '' === self.canonicalId ) {

                    //  no form show the form to request one
                    self.jq.divNoFormSpecified.show();

                } else {

                    //  we have data from hidden div, load it into a form
                    self.loadForm();

                }
            },

            /**
             *  Reload page at URL of requested form
             *  @param  formId  {String}    Database _id of a formtemplate object
             */

            requestFormFromServer: function( formId ) {
                Y.log( 'Requesting form: ' + formId, 'debug', NAME );
                window.location = '/formisolationtest?formId=' + formId;
            },

            /**
             *  Load form data from hidden div
             */

            loadFormData: function() {
                var
                    self = this,
                    jsonData = self.jq.divFormData.html().trim(),
                    objData;

                if ( !jsonData || '' === jsonData ) {
                    Y.log( 'Missing form data in page template, cannot render packed form.', 'warn', NAME );
                    return;
                }

                //console.log( 'loading form data: ', jsonData );
                objData = JSON.parse( jsonData );

                //console.log( 'template: ', objData.template );

                Y.dcforms.package = objData;
                Y.dcforms.usePackage = true;

                self.canonicalId = objData.formId;
                self.versionId = objData.formVersionId;

                self.jq.txtFormId.val( objData.formId );
            },

            /**
             *  Create a form template object and display it in a page
             */

            loadForm: function() {
                var self = this;
                Y.log( 'load form: ' + self.canonicalId + '-v-' + self.versionId, 'debug', NAME );

                Y.dcforms.template.create(
                    '',                             //  patient reg on metaprac, not used
                    self.canonicalId,               //  form to load
                    self.versionId,                 //  form version to load
                    'divFormRender',                //  div to render into
                    {},                             //  legacy translations
                    true,                           //  draw the form immediately
                    onFormReady                     //  callback
                );

                function onFormReady( err, template ) {
                    if ( err ) {
                        Y.log( 'Could not instantiate form: ' + JSON.stringify( err ), 'warn', NAME );
                        //  TODO: pop a modal here
                        return;
                    }
                    self.template = template;
                    self.template.highlightEditable = true;
                    //  render again (bug with headers)
                    template.render( Y.dcforms.nullCallback );
                }

            }

        };

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib',

            'dcforms-template',
            'dcforms-packageutils',

            'JsonRpcReflection-doccirrus',
            'dcutils'
        ]
    }
);
