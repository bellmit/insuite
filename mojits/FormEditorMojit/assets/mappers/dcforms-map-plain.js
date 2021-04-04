/*
 *  Copyright DocCirrus GmbH 2013
 *
 *  Default mapper for plain objects - basic JS objects which are loaded and saved via REST, and which do not
 *  need to consider a viewmodel, or translate between a database schema and reduced schema.
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*jshint latedef:false */
/*global YUI, $ */

YUI.add(
    /* YUI module name */
    'dcforms-map-plain',

    /* Module code */
    function(Y, NAME) {
        'use strict';

        /**
         *  Extend YUI object with a method to instantiate these
         */

        if (!Y.dcforms) { Y.dcforms = {}; }
        if (!Y.dcforms.mapper) { Y.dcforms.mapper = {}; }

        /**
         *  Factory for mapper objects
         *
         *  @param  bindCollection      {String}    Type of mapped object
         *  @param  bindId              {String}    Database _id of mapped object
         *  @param  bindObj             {Object}    Optional, copy of the object if already loaded
         *  @param  template            {Object}    Form template
         */

        Y.dcforms.mapper.plain = function(bindCollection, bindId, bindObj, template) {

            //  PRIVATE MEMBERS

            var
                myCollection = bindCollection,      //  Type of currently mapped object [string]
                myId = bindId,                      //  Database _id of currently mapped object[string]
                myObj = bindObj,                    //  set by load or map method [object]

                formMode = 'fill',                  //  will usually be 'fill', may be 'shutdown' as page closed
                selectedElement = '';               //  identifies selected dcforms-element object


            //  LOAD MAPPED OBJECT VIA REST IF NOT PASSED TO CONSTRUCTOR

            if (('undefined' === typeof bindObj) || (false === bindObj.hasOwnProperty('_id'))) {
                Y.log('Data object not passed to mapper, attempting to load via REST');
                loadMappedObject(bindCollection, bindId, onMappedObjectLoaded);
            }

            //  PUBLIC METHODS

            /**
             *  Fill a form the the contents of this passed object
             *
             *  @param  objCollection   {String}    Type of object we are mapping in
             *  @param  objId           {String}    Database _id of mapped object
             *  @param  mObj            {Object}
             */

            function map(objCollection, objId, mObj) {

                function onMapComplete(err) {
                    if (err) {
                        Y.log('Error mapping plain object: ' + err, 'warn', NAME);
                    }
                }

                myCollection = objCollection;
                myId = objId;
                myObj = mObj;
                template.map(mObj, true, onMapComplete);
            }

            /**
             *  Returns the current contents of a form as a plain javascript object
             *
             *  @returns {Object}
             */

            function unmap() {
                return template.unmap();
            }


            /**
             *  Load object to be mapped into form via REST interface
             *
             *  @param  collection   {String}       Collection/schema name recognized by REST API
             *  @param  id           {String}       Database _id of the object we want
             *  @param  callback     {Function}     Of the form fn(err, mapObject)
             */

            function loadMappedObject(collection, id, callback) {

                if ((undefined === collection) || (undefined === id) || ('' === collection) || ('' === id)) {
                    Y.log('Mapped object not specified, not attempting load.', 'info', 'NAME');
                    return;
                }

                Y.log('Loading mapped object: ' + myCollection + '::' + myId, 'info', NAME);

                if (!callback) {
                    callback = function() {
                        Y.log('Missing callback on loadMappedObject', 'warn', NAME);
                    };
                }

                if (('' === collection) || ('' === id)) {
                    Y.doccirrus.comctl.setModal('Error', 'No object given to map', true);
                    return;
                }

                var privateUrl = Y.doccirrus.infras.getPrivateURL( '/r/' + collection + '/?query=_id,' + id);

                function onSuccess(data) {
                    if ('string' === typeof data) { data = JSON.parse(data); }

                    if (0 === data.length) {
                        onFailure('Mapped object not found or not available.');
                        return;
                    }
                    callback(null, data[0]);
                }

                function onFailure(errmsg) {
                    Y.doccirrus.comctl.setModal('Warn', 'Could not load mapped object: ' + errmsg, 'warn', NAME);
                    Y.log('ERROR loading mapped record: ' + errmsg, 'warn', NAME);
                    callback(errmsg);
                }

                $.ajax({
                    type: 'GET',
                    xhrFields: { withCredentials: true },
                    url: privateUrl,
                    success: onSuccess,
                    error: onFailure
                });
            }

            //  EVENT HANDLING - update object in db in response to changes by user

            /**
             *  Object loaded from server, map it into the form
             *
             *  @param  err     {String}    Error message describing any problems leading up to this
             *  @param  mObj    {Object}    Object to be mapped into form
             */

            function onMappedObjectLoaded(err, mObj) {

                function onMapRenderComplete(err) {
                    if (err) {
                        Y.log('Could not map loaded object: ' + err, 'warn', NAME);
                    }
                }

                if (err) {
                    Y.log('Could not map object to template: ' + err, 'warn', NAME);
                    return;
                }

                //  parent binder and other listeners may need to know when object has
                //  been loaded, raise event through template

                template.raiseBinderEvent('onMappedObjectLoaded', myObj);

                myObj = mObj;
                template.map(myObj);
                template.render(onMapRenderComplete);
            }

            /**
             *  Template events are passed by the parent
             *
             *  @param  eventName   {String}
             *  @param  eventData   {Object}
             */

            function onTemplateEvent(eventName, eventData) {

                switch(eventName){

                    case 'onElementSelected':       onElementSelected(eventData);           break;

                    case 'onElementValueSet':                                               //  fallthrough
                    case 'onElementValueChanged':   onElementValueChanged(eventData);       break;
                    case 'onModeSet':               onModeSet(eventData.toString());        break;

                    case 'onSchemaSet':
                        Y.log('Schema has been set.');
                        break;

                    // silence some noisy events in log
                    case 'onFormValueChanged':                                              //  fallthrough
                    case 'onMappedObjectStored':                                            return;

                    default:
                        Y.log('Unhandled template event: ' + eventName, 'warn', NAME);
                        break;
                }

            }

            /**
             *  Raised when the user changes the value of a form element
             *
             *  This includes all elements and types (checking a box, entering text in an input. etc)
             *
             *  TODO: implement a timer / change queue to manage submission back to server, we don't need
             *  to make an HTTP POST for every click and keystroke - wait 2 to 5 seconds and indicate in UI.
             *
             *  @param  element {Object}    The dcforms-element object which changed
             */

            function onElementValueChanged(element) {

                if ('' === element.schemaMember) {
                    //  not bound to anything
                    Y.log('Form element is not bound to mapped object  ' + element.domId, 'debug', NAME);
                    return;
                }

                if (!element.hasOwnProperty('exportValue')) {
                    //  no export value from this type of element
                    Y.log('Element does not have an export value ' + element.domId, 'debug', NAME);
                    return;
                }

                if (!myObj.hasOwnProperty(element.schemaMember)) {
                    //  form does not match schema
                    Y.log('Form does not match schema, unknown property: ' + element.schemaMember, 'debug', NAME);
                    return;
                }

                Y.log('Updating mapped object from element ' + element.schemaMember, 'debug', NAME);

                if (formMode !== 'fill') {
                    //  odd things can happen during PDF rendering or as dom node is unloaded
                    //   - 'pdf' currently rendering a PDF, changes to values are for rendering purposes, not to be saved
                    //   - 'shutdown' template has detected windows close or other unload event, changes to values are spurious
                    Y.log('Ignoring change since in form mode: ' + formMode, 'debug', NAME);
                    return;
                }

                Y.log('Update: ' + element.schemaMember + ' := ' + element.value);

                var
                    propName = element.schemaMember,
                    params = {};

                //  Enforce bool and number types

                if (('Boolean' === element.schemaType) || ('Bool' === element.schemaType)) {
                    // false, 'false' and 0 are false, everything else is true
                    element.exportValue = !!element.exportValue;
                }

                if (('Number' === element.schemaType) || ('Float' === element.schemaType)) {
                    element.exportValue = parseFloat(element.exportValue);
                    if (isNaN(element.exportValue)) {
                        return;
                    }
                }

                if (('Integer' === element.schemaType) || ('Int' === element.schemaType)) {
                    element.exportValue = parseInt(element.exportValue, 10);
                    if (isNaN(element.exportValue)) {
                        return;
                    }
                }

                if (
                    ('String' === element.schemaType) ||
                        ('Integer' === element.schemaType) ||
                        ('Boolean' === element.schemaType) ||
                        ('Number' === element.schemaType)
                    ) {

                    //  don't try to change if value is the same
                    if (myObj[propName] === element.exportValue) {
                        return;
                    }

                }

                //  Update local and server copies of mapped object

                myObj[propName] = element.exportValue;
                params[propName] = element.exportValue;

                if (('' === myCollection) || ('' === myId)) {
                    Y.doccirrus.comctl.setModal('Error', 'No object given to map', true);
                    return;
                }

                Y.dcforms.setStatus('Saving', true);

                var privateUrl = Y.doccirrus.infras.getPrivateURL( '/r/' + myCollection + '/put?query=_id,' + myObj._id + '&fields_=' + propName);

                function onSuccess(data) {
                    if (0 === data.length) {
                        onFailure('Mapped object not found or not available.');
                        return;
                    }
                    Y.log('Updated: ' + element.schemaMember + ' := ' + element.exportValue);
                    Y.dcforms.setStatus('', false);

                    //  parent binder and other listeners interested in this template may need to know when object has
                    //  been saved, raise event through template

                    template.raiseBinderEvent('onMappedObjectStored', myObj);

                }

                function onFailure(errmsg) {
                    Y.doccirrus.comctl.setModal('Warn', 'Could not update mapped object: <pre>' + JSON.stringify(errmsg) + '</pre>');
                    Y.log('ERROR while updating mapped record: ' + errmsg, 'warn', NAME);
                    //callback(errmsg);
                    Y.dcforms.setStatus('', false);
                }

                $.ajax({
                    type: 'PUT',
                    xhrFields: { withCredentials: true },
                    url: privateUrl,
                    data: params,
                    success: onSuccess,
                    error: onFailure
                });

            }

            /**
             *  Raised when the user selects / clicks on an element
             *  @param currElement
             */

            function onElementSelected(currElement) {

                if ((template.instanceId + '::' + currElement.domId) === selectedElement) {
                    //  ignore repeated selection
                    return;
                }

                selectedElement = template.instanceId + '::' + currElement.domId;
            }

            /**
             *  Show or hide controls according to mode
             *
             *  Note that this view should only see 'fill' and 'pdf' modes, and require no action at present
             *
             *  @param  mode    {String}    Name of a template mode
             */

            function onModeSet(mode) {
                formMode = mode;
            }

            //  RETURN MAPPER INTERFACE  / API

            return {
                'map': map,
                'unmap': unmap,
                'handleEvent': onTemplateEvent
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