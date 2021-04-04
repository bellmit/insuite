/*
 *  Copyright DocCirrus GmbH 2014
 *
 *  Mapper for sets of calendar events belonging to a patient, corresponds to EVents_T.reduced.json
 */

/*jslint anon:true, sloppy:true, nomen:true*/

/*jshint latedef:false */
/*global YUI */

YUI.add(
    /* YUI module name */
    'dcforms-map-patient',

    /* Module code */
    function( Y, NAME ) {
        'use strict';

        /**
         *  Factory for mapper objects
         *
         *  @param  template    {Object}    Form template
         *  @param  context     {Object}    Set of viewmodels providing values for patient (scheuling) forms
         */

        Y.namespace( 'dcforms.mapper' ).patient = function( template, context ) {

            //  PRIVATE MEMBERS

            var
                currentPatient = context.patient,

                _moment = Y.dcforms.mapper.objUtils.getMoment(),
                _k = Y.dcforms.mapper.koUtils.getKo(),

                myObj = {},                         //  created from viewModel [object]
                formMode = 'fill';                  //  will usually be 'fill', may be 'shutdown' as page closed

            //
            loadMappedObject( );

            //  PUBLIC METHODS

            /**
             *  Fill a form from the contents of this passed object
             *
             *  @param  objCollection   {String}    Type of object we are mapping in
             *  @param  objId           {String}    Database _id of mapped object
             *  @param  mObj            {Object}
             */

            function map( objCollection, objId, mObj ) {

                //  callback after mapping
                function onMapComplete(err) {
                    if (err) {
                        Y.log('Error mapping patient object: ' + err, 'warn', NAME);
                    }
                    Y.dcforms.setStatus('', false );
                }

                myObj = mObj;
                template.map( mObj, true, onMapComplete );
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
             *  Make plain javacript object for mapped table
             */

            function loadMappedObject() {
                var
                    events = _k.unwrap( context.events ),
                    personData = {
                        title: _k.unwrap( currentPatient.title ),
                        nameaffix: _k.unwrap( currentPatient.nameaffix ),
                        fk3120: _k.unwrap( currentPatient.fk3120 ),
                        lastname: _k.unwrap( currentPatient.lastname ),
                        firstname: _k.unwrap( currentPatient.firstname )
                    },
                    fullName = Y.doccirrus.schemas.person.personDisplay( personData ),
                    currentAddress;

                //Y.log( 'Loading viewModel: ' + JSON.stringify( viewModel, undefined, 2 ), 'debug', NAME );

                /*
                if (!events || (0 === events.length)) {
                    //  TESTING ONLY: TODO REMOVE
                    events = [
                        { '_id': '1234abc', 'start': '09:00', 'duration': 30, 'locname': 'Sesame St' },
                        { '_id': '1234def', 'start': '11:00', 'duration': 30, 'locname': 'Sesame St' },
                        { '_id': '1234ghi', 'start': '13:00', 'duration': 30, 'locname': 'Sesame St' }
                    ];
                } else {
                    alert(JSON.stringify(events));
                }
                */

                //  basic record
                if( events && events.length && 0 < events.length ) {

                    //  Properties of this object should match the Person_T.reduced schema

                    myObj = {
                        'activityId': '',
                        'fullname': fullName,
                        'firstname': _k.unwrap( currentPatient.firstname ),
                        'lastname': _k.unwrap( currentPatient.lastname ),
                        'dob': _moment.utc( _k.unwrap( currentPatient.dob ) ).local().format( 'DD.MM.YYYY' ),
                        'workingAt': _k.unwrap( currentPatient.workingAt ) || '',
                        'date': _moment.utc( Date.now() ).local().format( 'DD.MM.YYYY' ),
                        'events': getEventsTable()
                    };

                    currentAddress = _k.unwrap( currentPatient.addresses );
                    if( Array.isArray( currentAddress ) && currentAddress[0] ) {
                        currentAddress = currentAddress[0];
                        myObj.address = _k.unwrap( currentAddress.street ) + ' ' + _k.unwrap( currentAddress.houseno ) +
                                        "\n" + _k.unwrap( currentAddress.zip ) + ' ' + _k.unwrap( currentAddress.city );
                    }

                    Y.log( 'Number of rows in patient, filtered: ' + myObj.events.length, 'debug', NAME );

                    onMappedObjectLoaded( null, myObj );

                } else {
                    // notify user
                    //alert( 'Patient hat keine Termine / Patient has no events in their schedule' );
                    Y.doccirrus.comctl.setModal( 'Terminliste', 'keine Kalendereinträge', true );
                }
            }

            function getEventsTable() {

                var
                    mArray = [],
                    selectedRows = context.events(),
                    currentRow,
                    i;

                //  add events
                for( i = 0; i < selectedRows.length; i++ ) {

                    currentRow = selectedRows[i];

                    //  Must match Event_T.reduced.json
                    mArray.push( {
                        '_id': currentRow._id,
                        'start': _moment.utc( currentRow.start ).local().format( 'DD.MM.YYYY, HH:mm' ),
                        'title': currentRow.title,
                        'calendarName': currentRow.calendar.name,
                        'duration': currentRow.duration + '',
                        'locname': currentRow.calendar.locationId.locname,
                        'locaddress': _k.unwrap( currentRow.calendar.locationId.street ) + ' ' + _k.unwrap( currentRow.calendar.locationId.houseno ),
                        'day': _moment.utc( currentRow.start ).local().format( 'dd' ),
                        'dateOnly': _moment.utc( currentRow.start ).local().format( 'DD.MM.YYYY' ),
                        'timeOnly': _moment.utc( currentRow.start ).local().format( 'HH:mm' ),

                        'userDescr': _k.unwrap( currentRow.userDescr ),                 //  Bezeichnung
                        'details': _k.unwrap( currentRow.details )                      //  Details
                    } );

                }

                if( Y.config.debug ) {
                    Y.log( 'Mapping EVENT activities to ' + JSON.stringify( mArray ), 'debug', NAME );
                }

                return mArray;
            }

            //  EVENT HANDLING - update object in db in response to changes by user

            /**
             *  Object loaded from server, map it into the form
             *
             *  @param  err     {String}    Error message describing any problems leading up to this
             *  @param  mObj    {Object}    Object to be mapped into form
             */

            function onMappedObjectLoaded( err, mObj ) {

                function onMapRenderComplete(err) {
                    if (err) {
                        Y.log('Could not map loaded object: ' + err, 'warn', NAME);
                        //  continue in any case
                    }
                }

                function onMapComplete(err) {
                    if (err) {
                        Y.log('Could not map loaded object: ' + err, 'warn', NAME);
                        //  continue in any case
                    }
                    template.render(onMapRenderComplete);
                    // set to false if error and 'after' sync mapping
                    Y.dcforms.setStatus('', false );
                }

                if( err ) {
                    Y.log( 'Could not map object to template: ' + err, 'warn', NAME );
                    return;
                }

                //  parent binder and other listeners may need to know when object has
                //  been loaded, raise patient through template

                template.raiseBinderEvent( 'onMappedObjectLoaded', myObj );

                myObj = mObj;
                template.map( myObj, true, onMapComplete );
            }

            /**
             *  Template events are passed by the parent
             *
             *  @param  eventName   {String}
             *  @param  eventData   {Object}
             */

            function onTemplateEvent( eventName, eventData ) {

                Y.log( 'patient mapper received patient: ' + eventName, 'debug', NAME );

                switch( eventName ) {

                    case 'onElementValueSet':                                               //  fallthrough
                    case 'onElementValueChanged':
                        onElementValueChanged( eventData );
                        break;
                    case 'onModeSet':
                        onModeSet( eventData );
                        break;

                    case 'onSchemaSet':
                        Y.log( 'Schema has been set.', 'debug', NAME );
                        break;

                    case 'onTableValueChanged':
                        onTableValueChanged( eventData );
                        break;


                    // silence some noisy events in log
                    case 'onPageSelected':                                                  //  fallthrough
                    case 'onMappedObjectStored':
                        return;

                    default:
                        Y.log( 'Unhandled template patient: ' + eventName, 'warn', NAME );
                        break;
                }

            }

            /**
             *  Raised when the user changes the value of a form element
             *
             *  This includes all elements and types (checking a box, entering text in an input. etc)
             *
             *  @param  element {Object}    The dcforms-element object which changed
             */

            function onElementValueChanged( element ) {

                Y.log( 'CHANGED! ' + element.schemaMember, 'debug', NAME );

                switch( element.schemaMember ) {

                    default:
                        //  not bound to anything, or not relevant to patient
                        Y.log( 'Form element is not bound to mapped object, or not handled ' + element.domId, 'debug', NAME );
                        break;
                }

            }

            function onTableValueChanged( detail ) {

                if( Y.config.debug ) {
                    Y.log( 'Table format not enforced: ' + JSON.stringify( detail ), 'debug', NAME );
                }

            }

            /**
             *  Prevent changes cased by PDF rendering or other mode changes from being saved
             *
             *  Note that this view should only see 'fill' and 'pdf' modes, and require no action at present
             *
             *  @param  mode    {String}    Name of a template mode
             */

            function onModeSet( mode ) {
                formMode = mode;
                Y.log( 'Set form mode: ' + formMode, 'debug', NAME );
            }

            //  no subscriptions to destroy at present, may change in future

            function onUnload() {
                Y.log('destroying patient mapper', 'debug', NAME);
            }

            //  RETURN MAPPER INTERFACE  / API

            return {
                'map': map,
                'unmap': unmap,
                'destroy': onUnload,
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