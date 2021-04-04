/*
 *  Note that this si run only on the server.
 *
 *  Copyright DocCirrus GmbH 2013
 */

/*jshint latedef:false */
/*global YUI */

'use strict';

YUI.add(
    'dcforms-map-infotree',

    /* Module code */
    function( Y, NAME ) {

        /**
         *  Factory for mapper objects
         *
         *  Context should have:
         *
         *
         *
         *  @param  template    {Object}    Form template
         *  @param  context     {Object}    Set of objects from which mapped fields are draw
         */

        Y.namespace( 'dcforms.mapper' ).infotree = function( template, context ) {
            var
                bindCollection = context.bindCollection,
                bindId = context.bindId;


            map( onFormMapped );

            //  after mapping the form document should be updated
            function onFormMapped( err ) {
                if ( err ) {
                    Y.log( 'Could not map the form from current reporting preset: ' + err, 'warn', NAME );
                    //  continue despite error while mapping
                }
                template.render( onTemplateRendered );
            }

            //  called when form is displayed (client) or ready for export to PDF (server)
            function onTemplateRendered( err ) {
                if ( err ) {
                    Y.log( 'Problem with initial render of mapped form: ' + JSON.stringify( err ), 'warn', NAME );
                }
                //  we raise mapcomplete even if mapping failed so that listeners can continue with next task
                template.raise( 'mapperinitialized', { 'mapperName': 'infotree' } );
            }

            //  PUBLIC METHODS

            /**
             *  Fill a form with the contents of this passed object
             *
             *  @param  callback        {Function}  Optional, called when form mapped.
             */

            function map( callback ) {
                Y.log( 'Mapping into form: ' + bindCollection + '::' + bindId, 'debug', NAME );

                var formData = { MedicationInfoTree: context.nodes };
                template.map( formData, true, callback );
            }

            //  PUBLIC METHODS

            /**
             *  Returns the current contents of a form as a plain javascript object
             *
             *  @returns    {Object}    Returned object will match InSuite_T
             */

            function unmap() {
                return template.unmap();
            }

            //  EVENT HANDLING - update currentActivity in response to changes by user

            /**
             *  Template events are passed by the parent
             *
             *  @param  eventName   {String}
             *  @param  eventData   {Object}
             */

            function onTemplateEvent( eventName, eventData ) {

                Y.log( 'CaseFile mapper received event: ' + eventName, 'debug', NAME );

                switch( eventName ) {

                    case 'onElementValueSet':                                               //  fallthrough
                    case 'onElementValueChanged':
                        onElementValueChanged( eventData );
                        break;

                    case 'onSchemaSet':
                        Y.log( 'Schema has been set.', 'debug', NAME );
                        break;

                    case 'onSubformLoaded':

                        Y.log( 'Remapping report form to update subform', 'warn', NAME );
                        map( Y.dcforms.nullCallback );
                        break;

                    case 'beforeUnload':
                        onUnload( eventData );
                        break;
                }

            }

            /**
             *  Clear and knockout dependencies for a clean close
             *  @/param formUID
             */

            function onUnload( /* formUID */ ) {

                if (Y.dcforms.isOnServer) {
                    return;
                }

                //  dispose all form template events subscribed from this mapper ( shoud never run )
                template.off( '*', 'dcforms-map-infotree' );
            }

            /**
             *  Raised when the user changes the value of a form element
             *
             *  This includes all elements and types (checking a box, entering text in an input. etc)
             *
             *  @/param  element {Object}    The dcforms-element object which changed
             */

            function onElementValueChanged( /* element */ ) {
                Y.log( 'onElementValueChanged should only be raised on the client', 'warn', NAME );
            }

            //  RETURN MAPPER INTERFACE / API

            return {
                'map': map,
                'unmap': unmap,
                'handleEvent': onTemplateEvent,
                'destroy': onUnload
            };

        };
    },

    /* Min YUI version */
    '0.0.1',

    /* Module config */
    {
        requires: ['document-api', 'dcgenericformmappers', 'dcgenericmapper-util']
    }
);