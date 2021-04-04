/*
 *  Example of a bound embedded form
 *
 *  To use bound form, please note the required YUI modules, then embed the form as in loadBoundDocument(...)
 *
 *  'bindCollection' refers to an actual model in the tenant's database, the name should be a schema available
 *  through the restcontroller.  Modify the loadDocuments method to print something sensible if you change the
 *  collection.
 *
 *  'currentId' is the database _id of the currently mapped object
 *
 *  'templateFile' refers to the name of the file in which the default, 'factory condition' version of the form is
 *  shipped - all users may have their own copy, which they might have modified.  The form which is loaded will be
 *  the user's current version.  If the user does not have a version of this form the FEM will attempt to create one
 *  from the default template.
 *
 *  Not shown in this example:
 *
 *  (*) Template events: events such as loading a template, navigating pages, etc can be listened for if you need to
 *      know what the user or embedded form are doing.
 */

/*global YUI, $ */

YUI.add( 'TestingMojitFormsTableBindingTest', function( Y, NAME ) {

        'use strict';

        Y.log( 'YUI.add TestingMojitFormsTableBindingTest with NAMEs ' + NAME, 'info' );

        /**
         *  Private members
         */

        var
            myNode,                                         //  make available to private methods
            templatePatient = 'BindPatient.form',           //  name of a FEM form
            exampleParentType = 'getpatientstest',          //  route to load objects
            currentPatientIdx = -1,                         //  index of selected patient
            maxPatients = 20,                               //  limit number of patients shown in this example
            myPatients = [];                                //  set of calendars for nav

        /**
         *  Load the set of patients from the TestingMojit, render as a list to the left of the form div
         *
         *  NOTE: other REST routes for getting patient data were not working for me at time of writing hence the routes
         *  on TestingMojit:
         *
         *    http://insuite.dev.dc/r/getpatientstest
         *
         *  @method loadPatients
         */

        function loadPatients() {

            function onFailure( errmsg ) {
                Y.log( 'ERROR loading patients: ' + errmsg, 'warn', NAME );
            }

            function onSuccess( data ) {

                if( 'string' === typeof data ) {
                    data = JSON.parse( data );
                }

                myPatients = data;

                Y.log( 'Received patient data set: ' + JSON.stringify( data, undefined, 2 ) + ' items', 'debug', NAME );

                var
                    i,
                    html = ''; //'<h2>Patients</h2>';

                if( 0 === data.length ) {
                    html = html + '<i>No patients database.  This example works with the test dataset in /var/data/patient-create.js</i>';
                }

                for( i = 0; ((i < data.length) && (i < maxPatients)); i++ ) {

                    html = html +
                           '<button class="btn btn-large" style="width:100%;" id="btnLoadPatient' + i + '">' +
                           data[i].firstname + ' ' + data[i].lastname + '<br/>' +
                           '<small>' + data[i].jobTitle + '</small>' +
                           '</button>' +
                           '<div style="height: 3px;"></div>';
                }

                $( '#divPatientList' ).html( html );

                for( i = 0; i < data.length; i++ ) {
                    bindLoadButton( i, data[i]._id );
                }
            }

            function doLoad( id ) {
                currentPatientIdx = id;
                Y.log( 'Loading patient: ' + id, 'info', NAME );
                Y.doccirrus.formloader.addFormToDiv( {
                    id: id,
                    divId: '#divFormsEmbedX',
                    templateFile: templatePatient,
                    model: exampleParentType,
                    'onFormEvent': onFormEvent
                }, onFormLoaded );
            }

            function bindLoadButton( idx, recordId ) {
                $( '#divFormsEmbed' ).html( '<div id="divFormsEmbedX"></div>' );

                if( -1 === currentPatientIdx ) {
                    currentPatientIdx = idx;
                    doLoad( recordId );
                }

                $( '#btnLoadPatient' + idx ).off( 'click.testbind' ).on( 'click.testbind', function() {
                    doLoad( recordId );
                } );
            }

            $.ajax( {
                type: 'GET',
                xhrFields: { withCredentials: true },
                url: Y.doccirrus.infras.getPrivateURL( '/r/' + exampleParentType + '/all' ),
                success: onSuccess,
                error: onFailure
            } );
        }

        /**
         *  Allows this binder to listen for events emitted by embedded form, and access the template and other objects
         *
         *  For example, you could tap 'onLoaded' to get a reference to the template for your own 'Render PDF' link, or
         *  listen to 'onSchemaSet' to check that the schema specified in the user's copy of the form matches what is
         *  expected by this binder.  One might update the menu at left as fields are changed in the form.
         *
         *  @param eventName
         *  @//param eventData
         */

        function onFormEvent( eventName /* , eventData */ ) {
            Y.log( 'Ignoring form event: ' + eventName );
        }

        /**
         *  Callback for form loader
         *
         *  @param err
         */

        function onFormLoaded(err) {
            if (err) {
                Y.doccirrus.comctl.setModal('Warning', 'Problem loading form: ' + err);
            }
            Y.log('jadeLoader reports that form is loaded');
        }

        /**
         * Constructor for the TestingMojitFormsTableBindingTest class.
         *
         * @class TestingMojitFormsTableBindingTest
         * @constructor
         */

        Y.namespace( 'mojito.binders' )[NAME] = {

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */

            init: function( mojitProxy ) {
                this.mojitProxy = mojitProxy;
            },

            /**
             *    The binder method, invoked to allow the mojit to attach DOM event
             *    handlers.
             *
             *    @param node {Node} The DOM node to which this mojit is attached.
             */

            bind: function( node ) {
                Y.log( 'Binding test form' );
                this.node = node;
                myNode = node;


                Y.log('Canary to test changes - no il8n in TestingMojit binder - moved to formloader.client.js', 'debug', NAME);

                //  Load the set of documents to make a crude nav

                loadPatients();
            }


        };

    },
    '0.0.1',
    {
        requires: [
            'dcformloader',
            'event-mouseenter',
            'mojito-client',
            'mojito-rest-lib'
        ]
    }
);
