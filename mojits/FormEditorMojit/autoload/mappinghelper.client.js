/**
 *  Utilities to create and map forms for activities created on the client
 *
 *  Moved here from ActivityDetailsViewModel to reduce bloat and to provide the same interface on client and server
 *
 *  Additional mapper initialization and utils may be moved here in future
 *
 *  @author: strix
 *  User: strix
 *  Date: 18.12.18
 *  (c) 2017, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */

'use strict';

YUI.add( 'dcforms-mappinghelper', function( Y, NAME ) {


        var unwrap = ko.unwrap;

        /**
         *  Used by FSM to relate activities to the mapper/reduced schema which should be used
         *
         *  @param      {String}    actType
         *  @returns    {String}    mapper name
         */

        function getMapperForActType( actType ) {

            switch(actType) {
                case 'INVOICE':         return 'Invoice_T';
                case 'PRESCRIPTION':    return 'Prescription_T';
                case 'DOCLETTER':       return 'DocLetter_T';
                case 'PUBRECEIPT':      return 'PubReceipt_T';
                case 'PATIENT':         return 'Patient_T';
            }

            return 'CaseFile_T';
        }


        /**
         *  The activity loaded on the server does not have available all of the context available on the client
         *  This method loads these additional linked objects:
         *
         *      currentPatient from patientId
         *      locationObj from locationId
         *      locations (all available to user)
         *      employeeObj from employeeId
         *      currentPractice (assumed only one per PRC)
         *
         *  TODO: document additional data loaded by this
         *  TODO: remove dependencies on populated activity from mappers, simplify caching
         *
         *  @param  {Object}    binder          Of ActivityDetailsViewModel - should have activity, patient, etc
         *  @param  {Object}    attachments     Of current activity, convenience
         *  @param  {Function}  callback        Of the form fn(err, fullActivity)
         */

        function createActivityMapperContext( binder, attachments, callback ) {

            var
                currentActivity = ko.unwrap( binder.currentActivity ),
                currentPatient = ko.unwrap( binder.currentPatient ),
                context;

            Y.dcforms.runInSeries(
                [
                    copyFromBinder,
                    loadLocations,
                    loadEmployee,
                    loadSchein,
                    loadCaseFolder,
                    loadPatientContacts,
                    loadCatalogUsage,
                    loadMarkersClient
                ],
                onAllDone
            );

            //  (1) Get basic configuration and context which was already loaded by inCaseMojit.js binder
            function copyFromBinder( itcb ) {

                context = {
                    'activity': currentActivity,
                    'patient': currentPatient,
                    'attachments': attachments,
                    'incaseconfiguration': binder.getInitialData( 'incaseconfiguration' ),
                    'practice': binder.getInitialData( 'currentPractice' ),
                    'pregnancy': {},

                    //  legacy but still in use for assigning ownership of temporary PDFs
                    'bindCollection': 'activity',
                    'bindId': unwrap( currentActivity._id ) || 'new'
                };

                //  (1.1) assumed activity instantitated, sanity checks on activity to be added here:

                //  (1.2) assumed patient instantitated, sanity checks on activity to be added here:
                //  sanity checks on patient here
                context.patient.additionalContacts = context.patient.additionalContacts || [];

                //  done with this step
                itcb( null );
            }

            //  (2) Get all locations from binder, and link location of current activity into context
            function loadLocations( itcb ) {
                var
                    locationId = ko.unwrap( currentActivity.locationId ),
                    i;

                context.locations = binder.getAllLocations();
                context.location = null;

                for (i = 0; i < context.locations.length; i++ ) {
                    if ( context.locations[i]._id + '' === locationId ) {
                        context.location = JSON.parse( JSON.stringify( context.locations[i] ) );
                    }
                }

                itcb( null );
            }

            //  (3) Load employee associated with current activity
            function loadEmployee( itcb ) {
                var
                    employeeId = unwrap( currentActivity.employeeId ),
                    employeeRequest = { 'query': { '_id': employeeId }, includeAll: true },
                    mirrorActivityId = unwrap( currentActivity.mirrorActivityId );

                if ( mirrorActivityId || !employeeId || !Y.doccirrus.comctlLib.isObjectId( employeeId ) ) {
                    Y.log( 'Activity has invalid employeeId: ' + employeeId, 'warn', NAME );
                    context.employee = {};
                    return itcb( null );
                }

                Y.doccirrus.jsonrpc.api.employee
                    .read( employeeRequest )
                    .then( onEmployeeLoaded )
                    .fail( itcb );

                function onEmployeeLoaded( result ) {
                    if ( !result || !result.data || !result.data[0] ) {
                        return itcb( new Error( 'Employee could not be loaded: ' + employeeId ) );
                    }
                    context.employee = result.data[0] || {};
                    itcb( null );
                }
            }

            //  (4) Load any schein associated with this activity, if one exists
            function loadSchein( itcb ) {
                //  if not an INVOICE activity then we can skip this step, MOJ-9048
                //  note that on the server we also load scheine for treatments for reporting (treatments have no forms so not needed here)

                var actType = unwrap( currentActivity.actType );

                if( 'INVOICE' !== actType && 'DOCLETTER' !== actType ) {
                    return itcb( null );
                }

                Y.doccirrus.jsonrpc.api.patient.lastSchein( {
                    query: {
                        caseFolderId: ko.unwrap( context.activity.caseFolderId ),
                        locationId: context.location._id,
                        patientId: ko.unwrap( currentPatient._id ),
                        timestamp: unwrap( currentActivity.timestamp )
                    }
                } )
                    .done( onScheinLoaded )
                    .fail( function(err){
                        Y.log( 'Problem while looking up schein for ' + actType + ': ' + JSON.stringify( err ), 'error', NAME );
                        return itcb( null );
                    } );

                function onScheinLoaded( response ) {
                    if ( !response || !response.data || !response.data[0] ) {
                        return itcb( null );
                    }

                    //  see setGroupTherapyDates
                    context.lastSchein = response.data[0];

                    //  look up referringDoctor / basecontact by LANR
                    if( 'DOCLETTER' === actType && response.data[0].scheinRemittor ) {
                        Y.doccirrus.jsonrpc.api.basecontact.read({
                            query: {
                                officialNo: response.data[0].scheinRemittor
                            }
                        } ).done( function(res){
                            context.referringDoctor = res && res.data && res.data[0];
                            return itcb( null );
                        } ).fail( function(err){
                            Y.log( 'Problem while looking up referringDoctor for ' + actType + ': ' + JSON.stringify( err ), 'error', NAME );
                            return itcb( null );
                        } );
                    } else {
                        return itcb( null );
                    }
                }
            }

            //  (5) Load casefolder (some casefolder types are excluded in reporting)
            function loadCaseFolder( itcb ) {
                var caseFolderId = unwrap( currentActivity.caseFolderId );

                Y.doccirrus.jsonrpc.api.casefolder
                    .read( { query: { _id: caseFolderId } } )
                    .done( onCaseFolderLoaded )
                    .fail( itcb );

                function onCaseFolderLoaded( response ) {
                    //  may not be a valid casefolder, allow this for now (race issues with 'all casefolders' view, etc)
                    if ( !response || !response.data || !response.data[0] ) { return itcb( null ); }
                    context.caseFolder = response.data[0];
                    itcb( null );
                }
            }

            //  (6) Load patient contacts (physician, family doctor, additional contacts)
            function loadPatientContacts( itcb ) {
                let
                    familyDoctor = unwrap( context.patient.familyDoctor ),
                    physicians = unwrap( context.patient.physicians ),
                    institution = unwrap( context.patient.institution ),
                    additionalContacts = unwrap( context.patient.additionalContacts ),
                    contactIds = [],
                    contactObj,
                    i;

                context.contacts = [];
                context.patient.additionalContactsObj = [];     //  deprecated
                context.patientAdditionalContacts = [];

                if ( familyDoctor && 'string' === typeof familyDoctor ) {
                    contactIds.push( familyDoctor );
                }

                if ( physicians && physicians.length ) {
                    for ( i = 0; i < physicians.length; i++ ) {
                        if ( 'string' === typeof physicians[i] ) {
                            contactIds.push( physicians[i] );
                        }
                    }
                }

                if ( institution && 'string' === typeof institution ) {
                    contactIds.push( institution );
                }

                if ( additionalContacts && additionalContacts.length ) {
                    for ( i = 0; i < additionalContacts.length; i++ ) {
                        if ( 'string' === typeof additionalContacts[i] ) {
                            contactIds.push( additionalContacts[i] );
                        }
                    }
                }

                //  if patient has no contacts set up then we can skip this step
                if ( 0 === contactIds.length ) { return itcb( null ); }

                Y.doccirrus.jsonrpc.api.basecontact
                    .getExpandedPhysicians( { query: { '_id': { $in: contactIds } } } )
                    .then( onContactsLoaded )
                    .fail( itcb );

                function onContactsLoaded( result ) {
                    if ( !result || !result.data || !result.data.length ) { return itcb( null ); }
                    //  mix results with those that were already in the cache

                    for ( i = 0; i < result.data.length; i++ ) {

                        contactObj = result.data[i];

                        if ( physicians && physicians.length && contactObj._id === physicians[0] ) {
                            context.patientPhysician = contactObj;
                            //  deprecated, add directory to context, do not monkey patch the patient
                            context.patient.physiciansObj = contactObj;
                        }

                        if ( institution && contactObj._id === institution ) {
                            context.patientInstutution = contactObj;
                            //  deprecated, add directory to context, do not monkey patch the patient
                            context.patient.institutionObj = contactObj;
                        }

                        if ( familyDoctor && contactObj._id === familyDoctor ) {
                            context.patientFamilyDoctor = contactObj;
                            //  deprecated, add directory to context, do not monkey patch the patient
                            context.patient.familyDoctorObj = contactObj;
                        }

                        //  deprecated, add directory to context, do not monkey patch the patient
                        if ( additionalContacts && ( -1 !== additionalContacts.indexOf( contactObj._id ) ) ) {
                            context.patient.additionalContactsObj.push( contactObj );
                        }

                        context.patientAdditionalContacts = context.patient.additionalContactsObj;
                    }

                    itcb( null );
                }
            }

            //  (7) Get catalog usages
            function loadCatalogUsage( itcb ) {
                var
                    code = unwrap( currentActivity.code ),
                    catalogShort = unwrap( currentActivity.catalogShort ),
                    locationId = unwrap( currentActivity.locationId ) && unwrap( currentActivity.locationId.toString() ),

                    catalogCodeQuery = {
                        'seq': code,
                        'catalogShort': catalogShort,
                        'locationId': locationId
                    };

                //  if no catalog usage then we can skip this step
                if ( !code && !catalogShort ) { return itcb( null ); }

                Y.doccirrus.jsonrpc.api.catalogusage
                    .read( { query: catalogCodeQuery } )
                    .done( onQueryCatalogUsage )
                    .fail( itcb );

                function onQueryCatalogUsage( result ) {

                    if ( result && result.data && result.data[0] ) {
                        context.catalogUsages = result.data[0];
                    }

                    return itcb( null );
                }
            }

            //  (8) Full marker records already be populated to the patient object on the client, EXTMOJ-1281
            function loadMarkersClient( itcb ) {
                context.patientMarkers = unwrap( currentPatient.markers ) || [];
                itcb( null );
            }


            //  (X) Finally
            function onAllDone( err ) {
                Y.log( 'Activity Mapper Context all done.' , 'debug', NAME );
                callback( err, context );
            }

        }

        //  add module

        Y.namespace( 'doccirrus.forms' ).mappinghelper = {
            'getMapperForActType': getMapperForActType,
            'createActivityMapperContext': createActivityMapperContext
        };

    },
    '0.0.1',
    {
        requires: [ 'comctlLib' ]
    }
);