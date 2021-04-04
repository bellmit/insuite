/*
 *  Note that this si run only on the server.
 *
 *  Copyright DocCirrus GmbH 2013
 */

/*jshint latedef:false */
/*global YUI */

'use strict';

YUI.add(
    'dcforms-map-instockorder',

    /* Module code */
    function( Y, NAME ) {

        var
            //  moment = Y.doccirrus.commonutils.getMoment(),
            originalFormData;

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

        Y.namespace( 'dcforms.mapper' ).instock = function( template, context ) {
            var
                bindCollection = context.bindCollection,
                bindId = context.bindId;

            if( false === Y.dcforms.isOnServer ) {
                //  nothing further to do
                template.raise( 'mapcomplete', {} );
                return;
            }

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
                template.raise( 'mapperinitialized', { 'mapperName': 'instock' } );
            }

            //  PUBLIC METHODS

            /**
             *  Fill a form with the contents of this passed object
             *
             *  @param  callback        {Function}  Optional, called when form mapped.
             */

            function map( callback ) {
                Y.log( 'Mapping into form: ' + bindCollection + '::' + bindId, 'debug', NAME );

                /**
                 *  Called when all> sub-tasks and linked data has been loaded and mapped
                 */

                function onFormDataComplete( err, formData ) {
                    function onMapComplete( err ) {

                        if( err ) {
                            Y.log( 'Error mapping values into form: ' + err, 'warn', NAME );
                            callback( err );
                            return;
                        }

                        //  parent binder and other listeners may need to know when object has
                        //  been loaded, raise event through template

                        template.raise( 'mapcomplete', formData );

                        if (callback && ('function' === typeof callback)) {
                            return callback( null, formData );
                        }
                    }

                    if( err ) {
                        Y.log( 'could not get formData from template ' + err, 'error', NAME );
                        return;
                    }

                    var
                        prop;

                    if ( context.order ) {
                        for( prop in context.order  ) {
                            if (context.order.hasOwnProperty(prop)) {
                                formData[prop] = context.order[prop];
                            }
                        }
                    }

                    //  map values into form
                    originalFormData = JSON.parse( JSON.stringify( formData ) );
                    template.map( originalFormData, true, onMapComplete );
                }

                if( !callback ) {
                    callback = function( err ) {
                        if( err ) {
                            Y.doccirrus.comctl.setModal( 'Could not map form', err, true );
                            Y.log( 'Error while mapping form: ' + err, 'warn', name );
                        }
                    };
                }

                Y.dcforms.mapper.genericUtils.getFormDataByTemplate( template, context, onFormDataComplete );
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
                template.off( '*', 'dcforms-map-instock' );
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